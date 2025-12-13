from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import random
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Ground Station Management API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class ServerModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # telemetry, command, database, monitoring
    ip_address: str
    status: str = "online"  # online, offline, warning
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    uptime: int = 0  # seconds
    last_health_check: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServerCreate(BaseModel):
    name: str
    type: str
    ip_address: str

class TelemetryData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    satellite_id: str = "SAT-01"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    battery_voltage: float
    temperature: float
    solar_panel_current: float
    attitude_roll: float
    attitude_pitch: float
    attitude_yaw: float
    signal_strength: float
    packet_count: int
    mission_phase: str

class CommandLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    command: str
    target: str = "SAT-01"
    status: str = "pending"  # pending, executing, completed, failed
    executed_by: str = "operator"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    response: Optional[str] = None
    execution_time: Optional[float] = None

class CommandCreate(BaseModel):
    command: str
    target: str = "SAT-01"
    executed_by: str = "operator"

class MissionPhase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phase: str  # launch, nominal, safe_mode
    description: str
    telemetry_frequency: int  # seconds
    auto_actions: List[str] = []
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class MissionPhaseCreate(BaseModel):
    phase: str
    description: str
    telemetry_frequency: int = 5
    auto_actions: List[str] = []

class AnsiblePlaybook(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    playbook_name: str
    target_servers: List[str]
    status: str = "pending"  # pending, running, completed, failed
    tasks_completed: int = 0
    tasks_total: int = 0
    output: List[str] = []
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class AnsiblePlaybookCreate(BaseModel):
    playbook_name: str
    target_servers: List[str]

class SystemAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    severity: str  # info, warning, critical
    source: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged: bool = False
    auto_resolved: bool = False

class DashboardStats(BaseModel):
    total_servers: int
    online_servers: int
    total_telemetry_packets: int
    total_commands: int
    active_alerts: int
    current_mission_phase: str
    system_health: str

# ============= WEBSOCKET MANAGER =============

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# ============= BACKGROUND TASKS =============

class BackgroundTasks:
    def __init__(self):
        self.telemetry_running = False
        self.monitoring_running = False
        self.self_healing_running = False

    async def generate_telemetry(self):
        """Generate simulated telemetry data"""
        self.telemetry_running = True
        logger.info("Telemetry generation started")
        
        while self.telemetry_running:
            try:
                # Get current mission phase
                mission = await db.mission_phases.find_one({"is_active": True})
                frequency = mission.get("telemetry_frequency", 5) if mission else 5
                phase = mission.get("phase", "nominal") if mission else "nominal"
                
                # Generate telemetry data
                telemetry = TelemetryData(
                    battery_voltage=random.uniform(26.0, 30.0),
                    temperature=random.uniform(35.0, 50.0),
                    solar_panel_current=random.uniform(1.5, 3.5),
                    attitude_roll=random.uniform(-10.0, 10.0),
                    attitude_pitch=random.uniform(-10.0, 10.0),
                    attitude_yaw=random.uniform(-10.0, 10.0),
                    signal_strength=random.uniform(80.0, 100.0),
                    packet_count=random.randint(1000, 9999),
                    mission_phase=phase
                )
                
                doc = telemetry.model_dump()
                doc['timestamp'] = doc['timestamp'].isoformat()
                await db.telemetry_data.insert_one(doc)
                
                # Broadcast via WebSocket
                await manager.broadcast({
                    "type": "telemetry",
                    "data": json.loads(telemetry.model_dump_json(mode='json'))
                })
                
                await asyncio.sleep(frequency)
                
            except Exception as e:
                logger.error(f"Telemetry generation error: {e}")
                await asyncio.sleep(5)

    async def monitor_servers(self):
        """Monitor server health and generate metrics"""
        self.monitoring_running = True
        logger.info("Server monitoring started")
        
        while self.monitoring_running:
            try:
                servers = await db.servers.find({}).to_list(100)
                
                for server in servers:
                    # Update server metrics
                    cpu = random.uniform(20.0, 90.0)
                    memory = random.uniform(30.0, 85.0)
                    disk = random.uniform(40.0, 75.0)
                    
                    # Determine status
                    status = "online"
                    if cpu > 85 or memory > 80:
                        status = "warning"
                    
                    update_data = {
                        "cpu_usage": cpu,
                        "memory_usage": memory,
                        "disk_usage": disk,
                        "status": status,
                        "uptime": server.get("uptime", 0) + 10,
                        "last_health_check": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.servers.update_one(
                        {"id": server["id"]},
                        {"$set": update_data}
                    )
                    
                    # Generate alert if needed
                    if status == "warning":
                        alert = SystemAlert(
                            severity="warning",
                            source=server["name"],
                            message=f"High resource usage detected: CPU {cpu:.1f}%, Memory {memory:.1f}%"
                        )
                        alert_doc = alert.model_dump()
                        alert_doc['timestamp'] = alert_doc['timestamp'].isoformat()
                        await db.system_alerts.insert_one(alert_doc)
                        
                        # Broadcast alert
                        await manager.broadcast({
                            "type": "alert",
                            "data": json.loads(alert.model_dump_json(mode='json'))
                        })
                
                await asyncio.sleep(10)
                
            except Exception as e:
                logger.error(f"Server monitoring error: {e}")
                await asyncio.sleep(10)

    async def self_healing(self):
        """Self-healing automation"""
        self.self_healing_running = True
        logger.info("Self-healing automation started")
        
        while self.self_healing_running:
            try:
                # Check for servers with high resource usage
                servers = await db.servers.find({"status": "warning"}).to_list(100)
                
                for server in servers:
                    if server["cpu_usage"] > 85 or server["memory_usage"] > 80:
                        # Simulate healing action
                        logger.info(f"Self-healing: Restarting services on {server['name']}")
                        
                        # Create alert
                        alert = SystemAlert(
                            severity="info",
                            source="Self-Healing System",
                            message=f"Auto-restart initiated for {server['name']} due to high resource usage",
                            auto_resolved=True
                        )
                        alert_doc = alert.model_dump()
                        alert_doc['timestamp'] = alert_doc['timestamp'].isoformat()
                        await db.system_alerts.insert_one(alert_doc)
                        
                        # Simulate service restart (reduce metrics)
                        await db.servers.update_one(
                            {"id": server["id"]},
                            {"$set": {
                                "cpu_usage": random.uniform(20.0, 40.0),
                                "memory_usage": random.uniform(30.0, 50.0),
                                "status": "online"
                            }}
                        )
                        
                        # Broadcast healing action
                        await manager.broadcast({
                            "type": "healing",
                            "data": {
                                "server": server["name"],
                                "action": "service_restart",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }
                        })
                
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Self-healing error: {e}")
                await asyncio.sleep(30)

background_tasks = BackgroundTasks()

# ============= API ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Ground Station Management API", "version": "1.0.0"}

# Server Management
@api_router.get("/servers", response_model=List[ServerModel])
async def get_servers():
    servers = await db.servers.find({}, {"_id": 0}).to_list(100)
    for server in servers:
        if isinstance(server.get('last_health_check'), str):
            server['last_health_check'] = datetime.fromisoformat(server['last_health_check'])
        if isinstance(server.get('created_at'), str):
            server['created_at'] = datetime.fromisoformat(server['created_at'])
    return servers

@api_router.post("/servers", response_model=ServerModel)
async def create_server(server_input: ServerCreate):
    server = ServerModel(**server_input.model_dump())
    doc = server.model_dump()
    doc['last_health_check'] = doc['last_health_check'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.servers.insert_one(doc)
    return server

@api_router.delete("/servers/{server_id}")
async def delete_server(server_id: str):
    result = await db.servers.delete_one({"id": server_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"message": "Server deleted successfully"}

# Telemetry
@api_router.get("/telemetry", response_model=List[TelemetryData])
async def get_telemetry(limit: int = 100):
    telemetry = await db.telemetry_data.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for data in telemetry:
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
    return telemetry

@api_router.get("/telemetry/latest")
async def get_latest_telemetry():
    telemetry = await db.telemetry_data.find_one({}, {"_id": 0}, sort=[("timestamp", -1)])
    if telemetry and isinstance(telemetry.get('timestamp'), str):
        telemetry['timestamp'] = datetime.fromisoformat(telemetry['timestamp'])
    return telemetry or {}

# Commands
@api_router.get("/commands", response_model=List[CommandLog])
async def get_commands(limit: int = 50):
    commands = await db.command_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for cmd in commands:
        if isinstance(cmd.get('timestamp'), str):
            cmd['timestamp'] = datetime.fromisoformat(cmd['timestamp'])
    return commands

@api_router.post("/commands", response_model=CommandLog)
async def create_command(command_input: CommandCreate):
    command = CommandLog(**command_input.model_dump())
    doc = command.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.command_logs.insert_one(doc)
    
    # Simulate command execution
    asyncio.create_task(execute_command(command.id))
    
    return command

async def execute_command(command_id: str):
    """Simulate command execution"""
    await asyncio.sleep(2)
    
    execution_time = random.uniform(0.5, 3.0)
    status = "completed" if random.random() > 0.1 else "failed"
    response = f"Command executed successfully in {execution_time:.2f}s" if status == "completed" else "Command execution failed"
    
    await db.command_logs.update_one(
        {"id": command_id},
        {"$set": {
            "status": status,
            "response": response,
            "execution_time": execution_time
        }}
    )
    
    # Broadcast command result
    await manager.broadcast({
        "type": "command_result",
        "data": {
            "command_id": command_id,
            "status": status,
            "response": response
        }
    })

# Mission Phases
@api_router.get("/mission/current")
async def get_current_mission():
    mission = await db.mission_phases.find_one({"is_active": True}, {"_id": 0})
    if mission and isinstance(mission.get('started_at'), str):
        mission['started_at'] = datetime.fromisoformat(mission['started_at'])
    return mission or {"phase": "nominal", "description": "No active mission phase"}

@api_router.post("/mission/phases", response_model=MissionPhase)
async def create_mission_phase(mission_input: MissionPhaseCreate):
    # Deactivate current mission
    await db.mission_phases.update_many(
        {"is_active": True},
        {"$set": {"is_active": False}}
    )
    
    mission = MissionPhase(**mission_input.model_dump())
    doc = mission.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    await db.mission_phases.insert_one(doc)
    
    # Broadcast mission change
    await manager.broadcast({
        "type": "mission_change",
        "data": json.loads(mission.model_dump_json(mode='json'))
    })
    
    return mission

# Ansible Playbooks
@api_router.get("/ansible/playbooks", response_model=List[AnsiblePlaybook])
async def get_playbooks(limit: int = 20):
    playbooks = await db.ansible_playbooks.find({}, {"_id": 0}).sort("started_at", -1).limit(limit).to_list(limit)
    for pb in playbooks:
        if isinstance(pb.get('started_at'), str):
            pb['started_at'] = datetime.fromisoformat(pb['started_at'])
        if pb.get('completed_at') and isinstance(pb.get('completed_at'), str):
            pb['completed_at'] = datetime.fromisoformat(pb['completed_at'])
    return playbooks

@api_router.post("/ansible/playbooks", response_model=AnsiblePlaybook)
async def execute_playbook(playbook_input: AnsiblePlaybookCreate):
    playbook = AnsiblePlaybook(**playbook_input.model_dump())
    
    # Set tasks based on playbook type
    tasks_map = {
        "setup_telemetry": 5,
        "setup_command": 4,
        "setup_database": 6,
        "setup_monitoring": 5,
        "security_hardening": 7,
        "system_update": 8,
        "backup": 4,
        "health_check": 3
    }
    playbook.tasks_total = tasks_map.get(playbook.playbook_name, 5)
    
    doc = playbook.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    if doc.get('completed_at'):
        doc['completed_at'] = doc['completed_at'].isoformat()
    await db.ansible_playbooks.insert_one(doc)
    
    # Simulate playbook execution
    asyncio.create_task(run_playbook(playbook.id, playbook.tasks_total))
    
    return playbook

async def run_playbook(playbook_id: str, tasks_total: int):
    """Simulate Ansible playbook execution"""
    await db.ansible_playbooks.update_one(
        {"id": playbook_id},
        {"$set": {"status": "running"}}
    )
    
    task_names = [
        "Gathering Facts",
        "Installing packages",
        "Configuring services",
        "Setting up firewall",
        "Creating users",
        "Copying configuration files",
        "Restarting services",
        "Validating setup"
    ]
    
    for i in range(tasks_total):
        await asyncio.sleep(random.uniform(1, 3))
        
        task_name = task_names[i % len(task_names)]
        output = f"[{i+1}/{tasks_total}] {task_name}... OK"
        
        await db.ansible_playbooks.update_one(
            {"id": playbook_id},
            {
                "$set": {"tasks_completed": i + 1},
                "$push": {"output": output}
            }
        )
        
        # Broadcast progress
        await manager.broadcast({
            "type": "ansible_progress",
            "data": {
                "playbook_id": playbook_id,
                "tasks_completed": i + 1,
                "tasks_total": tasks_total,
                "output": output
            }
        })
    
    # Complete playbook
    await db.ansible_playbooks.update_one(
        {"id": playbook_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await manager.broadcast({
        "type": "ansible_complete",
        "data": {"playbook_id": playbook_id}
    })

# System Alerts
@api_router.get("/alerts", response_model=List[SystemAlert])
async def get_alerts(limit: int = 50, acknowledged: Optional[bool] = None):
    query = {}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    
    alerts = await db.system_alerts.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for alert in alerts:
        if isinstance(alert.get('timestamp'), str):
            alert['timestamp'] = datetime.fromisoformat(alert['timestamp'])
    return alerts

@api_router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    result = await db.system_alerts.update_one(
        {"id": alert_id},
        {"$set": {"acknowledged": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}

# Dashboard Stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_servers = await db.servers.count_documents({})
    online_servers = await db.servers.count_documents({"status": "online"})
    total_telemetry = await db.telemetry_data.count_documents({})
    total_commands = await db.command_logs.count_documents({})
    active_alerts = await db.system_alerts.count_documents({"acknowledged": False})
    
    current_mission = await db.mission_phases.find_one({"is_active": True})
    mission_phase = current_mission.get("phase", "nominal") if current_mission else "nominal"
    
    # Calculate system health
    if online_servers == total_servers and active_alerts == 0:
        system_health = "excellent"
    elif online_servers >= total_servers * 0.8 and active_alerts < 5:
        system_health = "good"
    elif online_servers >= total_servers * 0.5:
        system_health = "warning"
    else:
        system_health = "critical"
    
    return DashboardStats(
        total_servers=total_servers,
        online_servers=online_servers,
        total_telemetry_packets=total_telemetry,
        total_commands=total_commands,
        active_alerts=active_alerts,
        current_mission_phase=mission_phase,
        system_health=system_health
    )

# Initialize System
@api_router.post("/system/initialize")
async def initialize_system():
    """Initialize the ground station with default servers"""
    # Clear existing data
    await db.servers.delete_many({})
    await db.telemetry_data.delete_many({})
    await db.command_logs.delete_many({})
    await db.system_alerts.delete_many({})
    await db.ansible_playbooks.delete_many({})
    
    # Create default servers
    servers = [
        ServerModel(
            name="Telemetry Server",
            type="telemetry",
            ip_address="192.168.56.11",
            cpu_usage=25.5,
            memory_usage=42.3,
            disk_usage=55.8
        ),
        ServerModel(
            name="Command Server",
            type="command",
            ip_address="192.168.56.12",
            cpu_usage=18.2,
            memory_usage=38.7,
            disk_usage=48.2
        ),
        ServerModel(
            name="Database Server",
            type="database",
            ip_address="192.168.56.13",
            cpu_usage=45.8,
            memory_usage=68.5,
            disk_usage=72.3
        ),
        ServerModel(
            name="Monitoring Server",
            type="monitoring",
            ip_address="192.168.56.14",
            cpu_usage=32.1,
            memory_usage=51.2,
            disk_usage=45.6
        )
    ]
    
    for server in servers:
        doc = server.model_dump()
        doc['last_health_check'] = doc['last_health_check'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.servers.insert_one(doc)
    
    # Create default mission phase
    mission = MissionPhase(
        phase="nominal",
        description="Normal operations",
        telemetry_frequency=5,
        auto_actions=["monitor_health", "log_data"]
    )
    doc = mission.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    await db.mission_phases.insert_one(doc)
    
    return {"message": "System initialized successfully", "servers_created": len(servers)}

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include the router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting background tasks...")
    asyncio.create_task(background_tasks.generate_telemetry())
    asyncio.create_task(background_tasks.monitor_servers())
    asyncio.create_task(background_tasks.self_healing())

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    background_tasks.telemetry_running = False
    background_tasks.monitoring_running = False
    background_tasks.self_healing_running = False
    client.close()
