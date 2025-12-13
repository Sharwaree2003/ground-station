import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Server, Radio, Terminal, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [servers, setServers] = useState([]);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Setup WebSocket
    const websocket = new WebSocket(`${WS_URL}/ws`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      websocket.send('ping');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'telemetry') {
        setLatestTelemetry(data.data);
        setTelemetryHistory(prev => [...prev.slice(-19), data.data]);
      } else if (data.type === 'alert') {
        setAlerts(prev => [data.data, ...prev]);
      } else if (data.type === 'mission_change') {
        fetchDashboardData();
      }
    };
    
    setWs(websocket);
    
    const interval = setInterval(fetchDashboardData, 10000);
    
    return () => {
      if (websocket) websocket.close();
      clearInterval(interval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, serversRes, telemetryRes, alertsRes] = await Promise.all([
        fetch(`${API}/dashboard/stats`),
        fetch(`${API}/servers`),
        fetch(`${API}/telemetry?limit=20`),
        fetch(`${API}/alerts?limit=5&acknowledged=false`)
      ]);
      
      const statsData = await statsRes.json();
      const serversData = await serversRes.json();
      const telemetryData = await telemetryRes.json();
      const alertsData = await alertsRes.json();
      
      setStats(statsData);
      setServers(serversData);
      setTelemetryHistory(telemetryData.reverse());
      setAlerts(alertsData);
      
      if (telemetryData.length > 0) {
        setLatestTelemetry(telemetryData[telemetryData.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6" data-testid="stat-servers">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getHealthColor(stats.system_health)} bg-current/10`}>
              {stats.system_health.toUpperCase()}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{stats.online_servers}/{stats.total_servers}</h3>
          <p className="text-sm text-slate-400">Servers Online</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6" data-testid="stat-telemetry">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Radio className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{stats.total_telemetry_packets.toLocaleString()}</h3>
          <p className="text-sm text-slate-400">Telemetry Packets</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6" data-testid="stat-commands">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Terminal className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{stats.total_commands}</h3>
          <p className="text-sm text-slate-400">Commands Executed</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6" data-testid="stat-alerts">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{stats.active_alerts}</h3>
          <p className="text-sm text-slate-400">Active Alerts</p>
        </div>
      </div>

      {/* Mission Phase */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Current Mission Phase</h3>
              <p className="text-sm text-blue-200">Active automation and monitoring</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white uppercase">{stats.current_mission_phase}</div>
            <div className="text-xs text-blue-200 mt-1">Mission Status</div>
          </div>
        </div>
      </div>

      {/* Servers and Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servers Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-400" />
            <span>Ground Station Servers</span>
          </h3>
          <div className="space-y-3">
            {servers.map(server => (
              <div key={server.id} className="bg-slate-800/50 rounded-lg p-4" data-testid={`server-${server.type}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)} animate-pulse`}></div>
                    <div>
                      <h4 className="font-medium text-white">{server.name}</h4>
                      <p className="text-xs text-slate-400">{server.ip_address}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">{server.type}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400 mb-1">CPU</div>
                    <div className="font-semibold text-white">{server.cpu_usage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Memory</div>
                    <div className="font-semibold text-white">{server.memory_usage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Disk</div>
                    <div className="font-semibold text-white">{server.disk_usage.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <span>Live Telemetry Data</span>
            <div className="flex-1"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </h3>
          {latestTelemetry ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Battery Voltage</div>
                  <div className="text-lg font-semibold text-white">{latestTelemetry.battery_voltage?.toFixed(2)} V</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Temperature</div>
                  <div className="text-lg font-semibold text-white">{latestTelemetry.temperature?.toFixed(1)} °C</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Solar Current</div>
                  <div className="text-lg font-semibold text-white">{latestTelemetry.solar_panel_current?.toFixed(2)} A</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Signal Strength</div>
                  <div className="text-lg font-semibold text-white">{latestTelemetry.signal_strength?.toFixed(1)} dBm</div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-2">Attitude (Roll / Pitch / Yaw)</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-semibold text-white">{latestTelemetry.attitude_roll?.toFixed(2)}°</div>
                    <div className="text-xs text-slate-500">Roll</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{latestTelemetry.attitude_pitch?.toFixed(2)}°</div>
                    <div className="text-xs text-slate-500">Pitch</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{latestTelemetry.attitude_yaw?.toFixed(2)}°</div>
                    <div className="text-xs text-slate-500">Yaw</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">Waiting for telemetry data...</div>
          )}
        </div>
      </div>

      {/* Telemetry Chart */}
      {telemetryHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Battery Voltage Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={telemetryHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={[25, 31]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Legend />
              <Line type="monotone" dataKey="battery_voltage" stroke="#3b82f6" strokeWidth={2} dot={false} name="Voltage (V)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <span>Recent Alerts</span>
          </h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="bg-slate-800/50 border-l-4 border-orange-500 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">{alert.source}</span>
                    </div>
                    <p className="text-sm text-white">{alert.message}</p>
                  </div>
                  <span className="text-xs text-slate-500 ml-4">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;