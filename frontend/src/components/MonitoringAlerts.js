import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle, TrendingUp, Activity, Shield } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const MonitoringAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [servers, setServers] = useState([]);
  const [filter, setFilter] = useState('all'); // all, critical, warning, info
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    fetchData();
    
    // Setup WebSocket
    const websocket = new WebSocket(`${WS_URL}/ws`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      websocket.send('ping');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'alert') {
        setAlerts(prev => [data.data, ...prev]);
        toast.error(data.data.message, { duration: 5000 });
      } else if (data.type === 'healing') {
        toast.success(`Self-healing: ${data.data.action} on ${data.data.server}`);
      }
    };
    
    setWs(websocket);
    
    const interval = setInterval(fetchData, 10000);
    
    return () => {
      if (websocket) websocket.close();
      clearInterval(interval);
    };
  }, [showAcknowledged]);

  const fetchData = async () => {
    try {
      const [alertsRes, serversRes] = await Promise.all([
        fetch(`${API}/alerts?limit=50&acknowledged=${showAcknowledged}`),
        fetch(`${API}/servers`)
      ]);
      
      const alertsData = await alertsRes.json();
      const serversData = await serversRes.json();
      
      setAlerts(alertsData);
      setServers(serversData);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`${API}/alerts/${alertId}/acknowledge`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        toast.success('Alert acknowledged');
        fetchData();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    autoResolved: alerts.filter(a => a.auto_resolved).length
  };

  return (
    <div className="space-y-6" data-testid="monitoring-alerts">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Bell className="w-8 h-8 text-orange-400" />
          <span>Monitoring & Alerts</span>
        </h2>
        <p className="text-slate-400 mt-1">System health monitoring and alert management</p>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <Bell className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{alertStats.total}</div>
          <div className="text-sm text-slate-400">Total Alerts</div>
        </div>
        <div className="bg-slate-900 border border-red-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400 mb-1">{alertStats.critical}</div>
          <div className="text-sm text-slate-400">Critical</div>
        </div>
        <div className="bg-slate-900 border border-yellow-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-1">{alertStats.warning}</div>
          <div className="text-sm text-slate-400">Warning</div>
        </div>
        <div className="bg-slate-900 border border-blue-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-1">{alertStats.info}</div>
          <div className="text-sm text-slate-400">Info</div>
        </div>
        <div className="bg-slate-900 border border-green-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-400 mb-1">{alertStats.autoResolved}</div>
          <div className="text-sm text-slate-400">Auto-Resolved</div>
        </div>
      </div>

      {/* Server Health */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <span>Server Health Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {servers.map(server => (
            <div
              key={server.id}
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
              data-testid={`server-health-${server.type}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    server.status === 'online' ? 'bg-green-500' :
                    server.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  } animate-pulse`}></div>
                  <span className="font-medium text-white text-sm">{server.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>CPU</span>
                    <span>{server.cpu_usage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        server.cpu_usage > 80 ? 'bg-red-500' :
                        server.cpu_usage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${server.cpu_usage}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Memory</span>
                    <span>{server.memory_usage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        server.memory_usage > 80 ? 'bg-red-500' :
                        server.memory_usage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${server.memory_usage}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Disk</span>
                    <span>{server.disk_usage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        server.disk_usage > 80 ? 'bg-red-500' :
                        server.disk_usage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${server.disk_usage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Uptime: {Math.floor(server.uptime / 60)}m
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">System Alerts</h3>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              <span>Show Acknowledged</span>
            </label>
            <div className="flex space-x-1 bg-slate-800 rounded-lg p-1">
              {['all', 'critical', 'warning', 'info'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  data-testid={`filter-${f}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">All Clear!</h4>
              <p className="text-slate-400">No active alerts at this time. System is operating normally.</p>
            </div>
          ) : (
            filteredAlerts.map((alert, idx) => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border-l-4 ${getSeverityColor(alert.severity)}`}
                data-testid={`alert-item-${idx}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">{alert.source}</span>
                        {alert.auto_resolved && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            AUTO-RESOLVED
                          </span>
                        )}
                      </div>
                      <p className="text-white mb-2">{alert.message}</p>
                      <div className="text-xs text-slate-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="ml-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      data-testid={`acknowledge-alert-${idx}`}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringAlerts;