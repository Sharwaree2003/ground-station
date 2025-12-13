import React, { useState, useEffect } from 'react';
import { Terminal, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CommandCenter = () => {
  const [commands, setCommands] = useState([]);
  const [selectedCommand, setSelectedCommand] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedCommands = [
    { id: 'SET_MODE_SAFE', label: 'Enter Safe Mode', description: 'Switch satellite to safe mode' },
    { id: 'SET_MODE_NOMINAL', label: 'Enter Nominal Mode', description: 'Resume normal operations' },
    { id: 'ENABLE_HIGH_RATE_TELEMETRY', label: 'High Rate Telemetry', description: 'Increase telemetry frequency' },
    { id: 'DISABLE_HIGH_RATE_TELEMETRY', label: 'Normal Telemetry', description: 'Return to normal frequency' },
    { id: 'RESET_PAYLOAD', label: 'Reset Payload', description: 'Restart payload subsystem' },
    { id: 'REBOOT_SYSTEM', label: 'Reboot System', description: 'Full system reboot' },
    { id: 'UPDATE_ATTITUDE', label: 'Update Attitude', description: 'Adjust satellite orientation' },
    { id: 'DEPLOY_SOLAR_PANELS', label: 'Deploy Solar Panels', description: 'Deploy solar panel arrays' },
  ];

  useEffect(() => {
    fetchCommands();
    const interval = setInterval(fetchCommands, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchCommands = async () => {
    try {
      const response = await fetch(`${API}/commands?limit=20`);
      const data = await response.json();
      setCommandHistory(data);
    } catch (error) {
      console.error('Error fetching commands:', error);
    }
  };

  const sendCommand = async (commandText) => {
    if (!commandText.trim()) {
      toast.error('Please select or enter a command');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandText,
          target: 'SAT-01',
          executed_by: 'Operator'
        })
      });

      if (response.ok) {
        toast.success('Command sent successfully');
        setSelectedCommand('');
        setCustomCommand('');
        fetchCommands();
      } else {
        toast.error('Failed to send command');
      }
    } catch (error) {
      console.error('Error sending command:', error);
      toast.error('Error sending command');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'executing':
        return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'executing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <div className="space-y-6" data-testid="command-center">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Terminal className="w-8 h-8 text-green-400" />
          <span>Command Center</span>
        </h2>
        <p className="text-slate-400 mt-1">Send commands to satellite systems</p>
      </div>

      {/* Command Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predefined Commands */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <span>Predefined Commands</span>
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {predefinedCommands.map(cmd => (
              <button
                key={cmd.id}
                onClick={() => setSelectedCommand(cmd.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedCommand === cmd.id
                    ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
                data-testid={`predefined-cmd-${cmd.id}`}
              >
                <div className="font-medium text-white mb-1">{cmd.label}</div>
                <div className="text-xs text-slate-400">{cmd.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => sendCommand(selectedCommand)}
            disabled={!selectedCommand || isSubmitting}
            className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2 transition-colors font-medium"
            data-testid="send-predefined-cmd-btn"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Sending...' : 'Send Selected Command'}</span>
          </button>
        </div>

        {/* Custom Command */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            <span>Custom Command</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Command String</label>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendCommand(customCommand)}
                placeholder="Enter custom command..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="custom-command-input"
              />
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-400">
                  <strong className="text-yellow-400">Warning:</strong> Custom commands should follow
                  the satellite command protocol. Incorrect commands may be rejected or cause unexpected behavior.
                </div>
              </div>
            </div>
            <button
              onClick={() => sendCommand(customCommand)}
              disabled={!customCommand.trim() || isSubmitting}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-2 transition-colors font-medium"
              data-testid="send-custom-cmd-btn"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending...' : 'Send Custom Command'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Command History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Command History</h3>
        <div className="space-y-3">
          {commandHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No commands sent yet. Send your first command above.
            </div>
          ) : (
            commandHistory.map((cmd, idx) => (
              <div
                key={cmd.id}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                data-testid={`command-history-item-${idx}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(cmd.status)}
                      <code className="text-white font-mono text-sm">{cmd.command}</code>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <span>Target: {cmd.target}</span>
                      <span>•</span>
                      <span>By: {cmd.executed_by}</span>
                      <span>•</span>
                      <span>{new Date(cmd.timestamp).toLocaleString()}</span>
                      {cmd.execution_time && (
                        <>
                          <span>•</span>
                          <span>Exec: {cmd.execution_time.toFixed(2)}s</span>
                        </>
                      )}
                    </div>
                    {cmd.response && (
                      <div className="mt-2 text-xs text-slate-300 bg-slate-900/50 px-3 py-2 rounded">
                        {cmd.response}
                      </div>
                    )}
                  </div>
                  <span
                    className={`ml-4 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(cmd.status)}`}
                  >
                    {cmd.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Command Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-white mb-1">{commandHistory.length}</div>
          <div className="text-sm text-slate-400">Total Commands</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-green-400 mb-1">
            {commandHistory.filter(c => c.status === 'completed').length}
          </div>
          <div className="text-sm text-slate-400">Successful</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-red-400 mb-1">
            {commandHistory.filter(c => c.status === 'failed').length}
          </div>
          <div className="text-sm text-slate-400">Failed</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {commandHistory.filter(c => c.status === 'pending' || c.status === 'executing').length}
          </div>
          <div className="text-sm text-slate-400">Pending</div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;