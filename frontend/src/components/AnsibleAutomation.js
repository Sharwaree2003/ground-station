import React, { useState, useEffect } from 'react';
import { Settings, Play, CheckCircle, Clock, XCircle, Server } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const AnsibleAutomation = () => {
  const [playbooks, setPlaybooks] = useState([]);
  const [servers, setServers] = useState([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState('');
  const [selectedServers, setSelectedServers] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [missionPhase, setMissionPhase] = useState('nominal');
  const [ws, setWs] = useState(null);

  const availablePlaybooks = [
    { id: 'setup_telemetry', name: 'Setup Telemetry Server', description: 'Install and configure telemetry services', tasks: 5 },
    { id: 'setup_command', name: 'Setup Command Server', description: 'Install command processing system', tasks: 4 },
    { id: 'setup_database', name: 'Setup Database Server', description: 'Configure PostgreSQL database', tasks: 6 },
    { id: 'setup_monitoring', name: 'Setup Monitoring Server', description: 'Install Prometheus & Grafana', tasks: 5 },
    { id: 'security_hardening', name: 'Security Hardening', description: 'Apply security configurations', tasks: 7 },
    { id: 'system_update', name: 'System Update', description: 'Update all packages and system', tasks: 8 },
    { id: 'backup', name: 'Backup Configuration', description: 'Backup all server configurations', tasks: 4 },
    { id: 'health_check', name: 'Health Check', description: 'Verify all services are running', tasks: 3 },
  ];

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
      
      if (data.type === 'ansible_progress' || data.type === 'ansible_complete') {
        fetchPlaybooks();
      }
    };
    
    setWs(websocket);
    
    return () => {
      if (websocket) websocket.close();
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchPlaybooks(), fetchServers(), fetchMissionPhase()]);
  };

  const fetchPlaybooks = async () => {
    try {
      const response = await fetch(`${API}/ansible/playbooks?limit=10`);
      const data = await response.json();
      setPlaybooks(data);
    } catch (error) {
      console.error('Error fetching playbooks:', error);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await fetch(`${API}/servers`);
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchMissionPhase = async () => {
    try {
      const response = await fetch(`${API}/mission/current`);
      const data = await response.json();
      setMissionPhase(data.phase || 'nominal');
    } catch (error) {
      console.error('Error fetching mission phase:', error);
    }
  };

  const executePlaybook = async () => {
    if (!selectedPlaybook) {
      toast.error('Please select a playbook');
      return;
    }
    if (selectedServers.length === 0) {
      toast.error('Please select at least one server');
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch(`${API}/ansible/playbooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook_name: selectedPlaybook,
          target_servers: selectedServers
        })
      });

      if (response.ok) {
        toast.success('Playbook execution started');
        setSelectedPlaybook('');
        setSelectedServers([]);
        fetchPlaybooks();
      } else {
        toast.error('Failed to execute playbook');
      }
    } catch (error) {
      console.error('Error executing playbook:', error);
      toast.error('Error executing playbook');
    } finally {
      setIsExecuting(false);
    }
  };

  const changeMissionPhase = async (newPhase) => {
    try {
      const phaseConfig = {
        launch: { description: 'Launch phase - High frequency monitoring', telemetry_frequency: 2, auto_actions: ['high_rate_telemetry', 'enhanced_monitoring'] },
        nominal: { description: 'Normal operations', telemetry_frequency: 5, auto_actions: ['monitor_health', 'log_data'] },
        safe_mode: { description: 'Safe mode - Critical systems only', telemetry_frequency: 1, auto_actions: ['emergency_telemetry', 'alert_operators', 'disable_payload'] }
      };

      const config = phaseConfig[newPhase];
      const response = await fetch(`${API}/mission/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: newPhase,
          ...config
        })
      });

      if (response.ok) {
        toast.success(`Mission phase changed to ${newPhase.toUpperCase()}`);
        setMissionPhase(newPhase);
      } else {
        toast.error('Failed to change mission phase');
      }
    } catch (error) {
      console.error('Error changing mission phase:', error);
      toast.error('Error changing mission phase');
    }
  };

  const toggleServer = (serverId) => {
    setSelectedServers(prev =>
      prev.includes(serverId)
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'running':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <div className="space-y-6" data-testid="ansible-automation">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Settings className="w-8 h-8 text-orange-400" />
          <span>Ansible Automation</span>
        </h2>
        <p className="text-slate-400 mt-1">Automated ground station configuration and management</p>
      </div>

      {/* Mission Phase Control */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Mission-Aware Automation</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-purple-200 mb-2">Current Mission Phase</div>
            <div className="text-2xl font-bold text-white uppercase">{missionPhase}</div>
          </div>
          <div className="flex space-x-2">
            {['launch', 'nominal', 'safe_mode'].map(phase => (
              <button
                key={phase}
                onClick={() => changeMissionPhase(phase)}
                disabled={missionPhase === phase}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  missionPhase === phase
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                } disabled:cursor-not-allowed`}
                data-testid={`mission-phase-${phase}`}
              >
                {phase.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Playbook Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Select Playbook */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Playbook</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availablePlaybooks.map(playbook => (
              <button
                key={playbook.id}
                onClick={() => setSelectedPlaybook(playbook.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedPlaybook === playbook.id
                    ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/30'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
                data-testid={`playbook-${playbook.id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{playbook.name}</span>
                  <span className="text-xs text-slate-400">{playbook.tasks} tasks</span>
                </div>
                <div className="text-xs text-slate-400">{playbook.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Select Servers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Target Servers</h3>
          <div className="space-y-2 mb-6">
            {servers.map(server => (
              <button
                key={server.id}
                onClick={() => toggleServer(server.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedServers.includes(server.id)
                    ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
                data-testid={`server-select-${server.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Server className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">{server.name}</div>
                      <div className="text-xs text-slate-400">{server.ip_address}</div>
                    </div>
                  </div>
                  {selectedServers.includes(server.id) && (
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={executePlaybook}
            disabled={!selectedPlaybook || selectedServers.length === 0 || isExecuting}
            className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2 transition-colors font-medium"
            data-testid="execute-playbook-btn"
          >
            <Play className="w-4 h-4" />
            <span>{isExecuting ? 'Executing...' : 'Execute Playbook'}</span>
          </button>
        </div>
      </div>

      {/* Playbook History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Execution History</h3>
        <div className="space-y-3">
          {playbooks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No playbooks executed yet. Select a playbook and servers to get started.
            </div>
          ) : (
            playbooks.map((playbook, idx) => (
              <div
                key={playbook.id}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                data-testid={`playbook-history-${idx}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(playbook.status)}
                    <div>
                      <div className="font-medium text-white">{playbook.playbook_name.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Targets: {playbook.target_servers.join(', ')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(playbook.status)}`}>
                    {playbook.status.toUpperCase()}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>{playbook.tasks_completed} / {playbook.tasks_total} tasks</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        playbook.status === 'completed' ? 'bg-green-500' :
                        playbook.status === 'failed' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(playbook.tasks_completed / playbook.tasks_total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Output Log */}
                {playbook.output && playbook.output.length > 0 && (
                  <div className="bg-slate-900/50 rounded p-3 font-mono text-xs">
                    {playbook.output.slice(-3).map((line, i) => (
                      <div key={i} className="text-green-400 mb-1">{line}</div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-slate-500 mt-2">
                  Started: {new Date(playbook.started_at).toLocaleString()}
                  {playbook.completed_at && ` | Completed: ${new Date(playbook.completed_at).toLocaleString()}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnsibleAutomation;