# Automated Ground Station Management System using Linux & Ansible

## M.Tech Project - Space Technology & DevOps Integration

### 🚀 Project Overview

This is a comprehensive **Ground Station Management System** that automates satellite ground station operations using **Linux**, **Ansible**, and modern DevOps practices. The system simulates a complete ground station infrastructure with real-time telemetry monitoring, command execution, automated configuration management, and self-healing capabilities.

**Key Innovation**: Mission-aware automation that adapts ground station behavior based on satellite mission phases (Launch, Nominal Operations, Safe Mode).

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Features](#features)
4. [Ground Station Servers](#ground-station-servers)
5. [Mission Phases](#mission-phases)
6. [Installation & Setup](#installation--setup)
7. [Usage Guide](#usage-guide)
8. [API Documentation](#api-documentation)
9. [Testing](#testing)
10. [Project Structure](#project-structure)
11. [M.Tech Contribution](#mtech-contribution)

---

## 🏗️ System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ground Station Control System                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   React UI   │────│  FastAPI     │────│   MongoDB    │      │
│  │  Dashboard   │    │   Backend    │    │   Database   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                                   │
│         │                    │                                   │
│         └────────────────────┼───────────────────────┐          │
│                              │                       │          │
│                              ▼                       ▼          │
│                    ┌──────────────────┐   ┌──────────────────┐ │
│                    │  Ansible Engine  │   │  WebSocket Hub   │ │
│                    │  (Simulated)     │   │  Real-time Data  │ │
│                    └──────────────────┘   └──────────────────┘ │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
         ┌─────────────────────────────────────────┐
         │     Simulated Ground Station Servers    │
         ├─────────────────────────────────────────┤
         │  • Telemetry Server (192.168.56.11)    │
         │  • Command Server (192.168.56.12)      │
         │  • Database Server (192.168.56.13)     │
         │  • Monitoring Server (192.168.56.14)   │
         └─────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  Satellite      │
                    │  (SAT-01)       │
                    │  [Simulated]    │
                    └─────────────────┘
```

### Data Flow

```
1. Satellite → Telemetry Server → Database → Real-time Dashboard
2. Operator → Command Center → Command Server → Satellite
3. Ansible Controller → Target Servers → Automated Configuration
4. Monitoring System → Alert Generation → Self-Healing Actions
```

---

## 💻 Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: MongoDB (Motor async driver)
- **Real-time**: WebSockets
- **Automation**: Simulated Ansible playbooks
- **Background Tasks**: asyncio

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast)
- **Routing**: React Router DOM

### DevOps & Infrastructure
- **Process Manager**: Supervisor
- **Web Server**: Nginx
- **Environment**: Kubernetes (containerized)
- **Hot Reload**: Development mode enabled

---

## ✨ Features

### 1. **Real-time Telemetry Monitoring**
- Live satellite telemetry data streaming via WebSocket
- **Metrics tracked**:
  - Battery Voltage (V)
  - Temperature (°C)
  - Solar Panel Current (A)
  - Signal Strength (dBm)
  - Attitude (Roll, Pitch, Yaw)
  - Packet Count
- Historical data visualization with interactive charts
- CSV export functionality

### 2. **Command Center**
- **Predefined Commands**:
  - Enter Safe Mode / Nominal Mode
  - High Rate Telemetry Toggle
  - Reset Payload
  - System Reboot
  - Update Attitude
  - Deploy Solar Panels
- Custom command execution
- Real-time command status tracking
- Command history with execution logs
- Success/failure statistics

### 3. **Ansible Automation**
- **Available Playbooks**:
  - Setup Telemetry Server
  - Setup Command Server
  - Setup Database Server
  - Setup Monitoring Server
  - Security Hardening
  - System Update
  - Backup Configuration
  - Health Check
- Multi-server targeting
- Real-time playbook execution progress
- Task-by-task output logging
- Execution history

### 4. **Mission-Aware Automation**
Three mission phases with automatic behavior changes:

#### **Launch Phase**
- Telemetry frequency: 2 seconds (high-rate)
- Auto-actions: Enhanced monitoring, high-rate telemetry
- Description: Launch phase - High frequency monitoring

#### **Nominal Operations**
- Telemetry frequency: 5 seconds (normal)
- Auto-actions: Monitor health, log data
- Description: Normal operations

#### **Safe Mode**
- Telemetry frequency: 1 second (critical)
- Auto-actions: Emergency telemetry, alert operators, disable payload
- Description: Safe mode - Critical systems only

### 5. **Self-Healing System**
- Automatic detection of high resource usage (CPU > 85%, Memory > 80%)
- Automated service restart for degraded servers
- Alert generation for all healing actions
- Status restoration to normal levels
- Real-time broadcast of healing events

### 6. **Monitoring & Alerts**
- **Alert Severities**: Critical, Warning, Info
- Real-time server health metrics
- Auto-resolved alerts tracking
- Alert acknowledgment system
- Filter by severity and acknowledgment status
- Server uptime tracking

### 7. **Dashboard**
- System overview with key statistics
- Live server status cards
- Real-time telemetry graphs
- Mission phase indicator
- Recent alerts feed
- System health score (Excellent, Good, Warning, Critical)

---

## 🖥️ Ground Station Servers

### Server Configuration

| Server Type | IP Address | Purpose | Key Services |
|------------|------------|---------|--------------|
| **Telemetry Server** | 192.168.56.11 | Receives satellite telemetry | Data parser, Logger |
| **Command Server** | 192.168.56.12 | Sends commands to satellite | Command processor, ACK handler |
| **Database Server** | 192.168.56.13 | Stores mission data | MongoDB, Backup service |
| **Monitoring Server** | 192.168.56.14 | System health monitoring | Prometheus, Grafana simulation |

### Server Metrics Tracked
- **CPU Usage** (%)
- **Memory Usage** (%)
- **Disk Usage** (%)
- **Uptime** (seconds)
- **Status** (online, warning, offline)
- **Last Health Check** (timestamp)

---

## 🎯 Mission Phases

The system implements **mission-aware automation** that changes ground station behavior based on the current satellite mission phase.

### Phase Transitions

```
┌─────────┐       ┌─────────┐       ┌───────────┐
│ LAUNCH  │ ────> │ NOMINAL │ ────> │ SAFE MODE │
└─────────┘       └─────────┘       └───────────┘
     ▲                                      │
     └──────────────────────────────────────┘
```

### Automation Behavior by Phase

| Aspect | Launch | Nominal | Safe Mode |
|--------|--------|---------|-----------|
| **Telemetry Frequency** | 2s (High) | 5s (Normal) | 1s (Critical) |
| **Data Priority** | All systems | Standard metrics | Critical only |
| **Alert Threshold** | Aggressive | Normal | Conservative |
| **Auto Actions** | High-rate monitoring | Standard logging | Emergency protocols |

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB
- Yarn package manager

### Backend Setup

```bash
cd /app/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Run the backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd /app/frontend

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your backend URL

# Run the frontend
yarn start
```

### Using Supervisor (Production)

```bash
# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

---

## 📖 Usage Guide

### 1. **Accessing the System**

Open your browser and navigate to:
```
https://ansible-space-hub.preview.emergentagent.com
```

### 2. **Dashboard Navigation**

The system has 5 main sections:

#### **Dashboard**
- View system overview
- Monitor live telemetry
- Check server health
- See recent alerts

#### **Telemetry**
- Detailed telemetry analysis
- Historical data charts
- Export telemetry data to CSV
- Satellite attitude visualization

#### **Commands**
- Send predefined commands
- Execute custom commands
- View command history
- Track execution status

#### **Ansible**
- Select and execute playbooks
- Choose target servers
- Monitor execution progress
- Change mission phases
- View automation history

#### **Monitoring**
- View all system alerts
- Filter by severity
- Acknowledge alerts
- Monitor server health metrics
- Track self-healing actions

### 3. **Common Workflows**

#### **Changing Mission Phase**
1. Go to **Ansible** tab
2. Click on desired mission phase button
3. System automatically adjusts telemetry frequency and monitoring

#### **Sending a Command**
1. Go to **Commands** tab
2. Select a predefined command or enter custom command
3. Click "Send Command"
4. Monitor execution status in real-time

#### **Running Ansible Playbook**
1. Go to **Ansible** tab
2. Select a playbook from the list
3. Choose one or more target servers
4. Click "Execute Playbook"
5. Watch real-time progress

#### **Managing Alerts**
1. Go to **Monitoring** tab
2. View all active alerts
3. Click "Acknowledge" to mark as resolved
4. Filter by severity for prioritization

---

## 📡 API Documentation

### Base URL
```
https://ansible-space-hub.preview.emergentagent.com/api
```

### Core Endpoints

#### **System**
```http
GET  /api/                          # API health check
POST /api/system/initialize         # Initialize ground station
GET  /api/dashboard/stats           # Dashboard statistics
```

#### **Servers**
```http
GET    /api/servers                 # List all servers
POST   /api/servers                 # Create new server
DELETE /api/servers/{id}            # Delete server
```

#### **Telemetry**
```http
GET /api/telemetry?limit=100        # Get telemetry data
GET /api/telemetry/latest           # Get latest telemetry
```

#### **Commands**
```http
GET  /api/commands?limit=50         # Get command history
POST /api/commands                  # Send command
```

**Request Body**:
```json
{
  "command": "SET_MODE_SAFE",
  "target": "SAT-01",
  "executed_by": "Operator"
}
```

#### **Mission Phases**
```http
GET  /api/mission/current           # Get current mission phase
POST /api/mission/phases            # Change mission phase
```

**Request Body**:
```json
{
  "phase": "safe_mode",
  "description": "Safe mode operations",
  "telemetry_frequency": 1,
  "auto_actions": ["emergency_telemetry", "alert_operators"]
}
```

#### **Ansible**
```http
GET  /api/ansible/playbooks?limit=20  # Get playbook history
POST /api/ansible/playbooks           # Execute playbook
```

**Request Body**:
```json
{
  "playbook_name": "setup_telemetry",
  "target_servers": ["server-id-1", "server-id-2"]
}
```

#### **Alerts**
```http
GET   /api/alerts?limit=50&acknowledged=false  # Get alerts
PATCH /api/alerts/{id}/acknowledge             # Acknowledge alert
```

#### **WebSocket**
```
wss://ansible-space-hub.preview.emergentagent.com/ws
```

**Message Types**:
- `telemetry`: Real-time telemetry data
- `alert`: New system alert
- `command_result`: Command execution result
- `ansible_progress`: Playbook execution progress
- `ansible_complete`: Playbook completed
- `mission_change`: Mission phase changed
- `healing`: Self-healing action

---

## 🧪 Testing

### Manual Testing

#### **Test Telemetry System**
```bash
# Check telemetry is being generated
curl https://ansible-space-hub.preview.emergentagent.com/api/telemetry/latest

# Should return latest telemetry data
```

#### **Test Command Execution**
```bash
curl -X POST https://ansible-space-hub.preview.emergentagent.com/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "command": "SET_MODE_SAFE",
    "target": "SAT-01",
    "executed_by": "Test"
  }'
```

#### **Test Playbook Execution**
```bash
curl -X POST https://ansible-space-hub.preview.emergentagent.com/api/ansible/playbooks \
  -H "Content-Type: application/json" \
  -d '{
    "playbook_name": "health_check",
    "target_servers": ["server-id"]
  }'
```

### Automated Testing

Use the built-in testing agent:
```bash
# Run comprehensive tests
python -m pytest tests/

# Test specific component
python -m pytest tests/test_telemetry.py
```

---

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py                 # Main FastAPI application
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.js               # Main React component
│   │   ├── App.css              # Global styles
│   │   ├── index.js             # Entry point
│   │   └── components/
│   │       ├── Dashboard.js      # Dashboard view
│   │       ├── TelemetryView.js  # Telemetry analysis
│   │       ├── CommandCenter.js  # Command execution
│   │       ├── AnsibleAutomation.js  # Ansible management
│   │       └── MonitoringAlerts.js   # Alerts & monitoring
│   ├── public/                  # Static assets
│   ├── package.json             # Node dependencies
│   ├── tailwind.config.js       # Tailwind configuration
│   └── .env                     # Environment variables
│
├── tests/                       # Test files
│   ├── test_telemetry.py
│   ├── test_commands.py
│   └── test_ansible.py
│
└── README.md                    # This file
```

---

## 🎓 M.Tech Contribution

### Novel Aspects

1. **Mission-Aware Automation**
   - Unique approach to adapt ground station behavior based on mission phase
   - Not commonly implemented in academic projects

2. **Self-Healing Infrastructure**
   - Automatic detection and resolution of system issues
   - Applies SRE (Site Reliability Engineering) principles to space systems

3. **Real-time Integration**
   - WebSocket-based live data streaming
   - Instant propagation of system state changes

4. **Space-DevOps Hybrid**
   - Combines space mission operations with modern DevOps practices
   - Bridges gap between traditional ground stations and cloud-native approaches

### Industry Relevance

- **ISRO**: Ground station automation for satellite missions
- **Private Space Companies**: Scalable ground station management
- **Research Labs**: Automated mission control systems
- **Defense**: Secure, automated satellite operations

### Publications Potential

This project can lead to research papers on:
1. "Mission-Aware Automation in Satellite Ground Stations"
2. "Self-Healing Systems for Space Operations"
3. "DevOps Practices in Space Mission Control"

### Viva Questions & Answers

**Q1: Why Ansible for ground station automation?**
**A:** Ansible is agentless, uses SSH, provides idempotent operations, and has excellent infrastructure-as-code capabilities. Perfect for managing multiple ground station servers with consistent configurations.

**Q2: How does mission-aware automation improve operations?**
**A:** It automatically adjusts telemetry frequency, monitoring intensity, and resource allocation based on mission criticality. During launch, we get high-frequency data; during nominal operations, we optimize resource usage.

**Q3: What happens during self-healing?**
**A:** The system monitors server metrics every 10 seconds. When CPU > 85% or Memory > 80%, it automatically restarts affected services, logs the action, generates alerts, and broadcasts the healing event.

**Q4: Why simulate servers instead of using real ones?**
**A:** For M.Tech demonstration, simulation provides: (1) Portability - runs on any machine, (2) Safety - no risk to real infrastructure, (3) Repeatability - consistent behavior for testing, (4) Scalability - easy to add more servers.

**Q5: How is this different from existing ground station systems?**
**A:** Traditional systems are: (1) Manually configured, (2) Static - don't adapt to mission phases, (3) No self-healing, (4) Vendor-locked. Our system is fully automated, adaptive, self-healing, and open-source.

---

## 🔧 Troubleshooting

### Common Issues

#### **Backend not starting**
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Common fixes:
# 1. Check MongoDB is running
sudo systemctl status mongod

# 2. Check port 8001 is not in use
lsof -i :8001

# 3. Reinstall dependencies
pip install -r requirements.txt
```

#### **Frontend not loading**
```bash
# Check logs
tail -f /var/log/supervisor/frontend.err.log

# Common fixes:
# 1. Check backend URL in .env
cat /app/frontend/.env

# 2. Reinstall dependencies
cd /app/frontend && yarn install

# 3. Clear cache
rm -rf node_modules/.cache
```

#### **WebSocket not connecting**
```bash
# Check CORS settings in backend/.env
# Ensure frontend URL is in CORS_ORIGINS

# Check WebSocket endpoint
wscat -c wss://ansible-space-hub.preview.emergentagent.com/ws
```

---

## 📝 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=ground_station_db
CORS_ORIGINS=*
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://ansible-space-hub.preview.emergentagent.com
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## 🤝 Contributing

This is an M.Tech project for educational purposes. However, contributions for improvement are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

This project is created for M.Tech academic purposes.

---

## 👨‍🎓 Author

**M.Tech Project**
**Course**: Space Technology & DevOps
**Topic**: Automated Ground Station Management using Linux & Ansible

---

## 📞 Support

For questions or issues:
- Check the troubleshooting section
- Review the API documentation
- Consult the usage guide

---

## 🙏 Acknowledgments

- Space Technology course instructors
- DevOps community for best practices
- Open-source contributors (FastAPI, React, MongoDB)
- ISRO and private space companies for inspiration

---

## 🎯 Future Enhancements

1. **AI-based Anomaly Detection**
   - ML models to predict failures
   - Intelligent alert prioritization

2. **Kubernetes-based Deployment**
   - Container orchestration
   - Auto-scaling capabilities

3. **Multi-Satellite Support**
   - Handle multiple satellites simultaneously
   - Priority-based resource allocation

4. **Enhanced Security**
   - Role-based access control
   - Encrypted command channels
   - Audit logging

5. **Real Hardware Integration**
   - Connect to actual ground station equipment
   - SDR (Software Defined Radio) integration
   - Antenna tracking systems

---

**Last Updated**: December 2025
**Version**: 1.0.0
**Status**: ✅ Fully Functional and Ready for Demo
