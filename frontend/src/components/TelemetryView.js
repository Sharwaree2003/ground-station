import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Radio, TrendingUp, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TelemetryView = () => {
  const [telemetryData, setTelemetryData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('battery_voltage');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchTelemetry();
    
    if (autoRefresh) {
      const interval = setInterval(fetchTelemetry, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchTelemetry = async () => {
    try {
      const response = await fetch(`${API}/telemetry?limit=50`);
      const data = await response.json();
      setTelemetryData(data.reverse());
    } catch (error) {
      console.error('Error fetching telemetry:', error);
    }
  };

  const metrics = [
    { key: 'battery_voltage', label: 'Battery Voltage', unit: 'V', color: '#3b82f6' },
    { key: 'temperature', label: 'Temperature', unit: '°C', color: '#ef4444' },
    { key: 'solar_panel_current', label: 'Solar Current', unit: 'A', color: '#10b981' },
    { key: 'signal_strength', label: 'Signal Strength', unit: 'dBm', color: '#8b5cf6' },
  ];

  const currentMetric = metrics.find(m => m.key === selectedMetric);
  const latestData = telemetryData[telemetryData.length - 1] || {};

  const exportData = () => {
    const csv = [
      ['Timestamp', 'Battery Voltage', 'Temperature', 'Solar Current', 'Signal Strength', 'Roll', 'Pitch', 'Yaw'],
      ...telemetryData.map(d => [
        new Date(d.timestamp).toISOString(),
        d.battery_voltage,
        d.temperature,
        d.solar_panel_current,
        d.signal_strength,
        d.attitude_roll,
        d.attitude_pitch,
        d.attitude_yaw
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6" data-testid="telemetry-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Radio className="w-8 h-8 text-purple-400" />
            <span>Telemetry Data Analysis</span>
          </h2>
          <p className="text-slate-400 mt-1">Real-time satellite telemetry monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            data-testid="export-telemetry-btn"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <div
            key={metric.key}
            className={`bg-slate-900 border rounded-xl p-5 cursor-pointer transition-all ${
              selectedMetric === metric.key
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
            onClick={() => setSelectedMetric(metric.key)}
            data-testid={`metric-card-${metric.key}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{metric.label}</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {latestData[metric.key]?.toFixed(2) || '---'}
            </div>
            <div className="text-xs text-slate-500">{metric.unit}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            {currentMetric?.label} Over Time
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">Live Data</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={telemetryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timestamp"
              stroke="#64748b"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#cbd5e1' }}
              labelFormatter={(value) => new Date(value).toLocaleString()}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={currentMetric?.color}
              strokeWidth={2}
              dot={false}
              name={`${currentMetric?.label} (${currentMetric?.unit})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Attitude Data */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Satellite Attitude</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {latestData.attitude_roll?.toFixed(2)}°
            </div>
            <div className="text-sm text-slate-400">Roll</div>
            <div className="mt-4 bg-slate-800 rounded-lg p-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${50 + (latestData.attitude_roll || 0) * 2.5}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              {latestData.attitude_pitch?.toFixed(2)}°
            </div>
            <div className="text-sm text-slate-400">Pitch</div>
            <div className="mt-4 bg-slate-800 rounded-lg p-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${50 + (latestData.attitude_pitch || 0) * 2.5}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {latestData.attitude_yaw?.toFixed(2)}°
            </div>
            <div className="text-sm text-slate-400">Yaw</div>
            <div className="mt-4 bg-slate-800 rounded-lg p-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${50 + (latestData.attitude_yaw || 0) * 2.5}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Telemetry Packets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left py-3 px-4">Timestamp</th>
                <th className="text-left py-3 px-4">Battery (V)</th>
                <th className="text-left py-3 px-4">Temp (°C)</th>
                <th className="text-left py-3 px-4">Solar (A)</th>
                <th className="text-left py-3 px-4">Signal (dBm)</th>
                <th className="text-left py-3 px-4">Mission Phase</th>
              </tr>
            </thead>
            <tbody>
              {telemetryData.slice(-10).reverse().map((data, idx) => (
                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 text-slate-300">
                  <td className="py-3 px-4">{new Date(data.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4">{data.battery_voltage?.toFixed(2)}</td>
                  <td className="py-3 px-4">{data.temperature?.toFixed(1)}</td>
                  <td className="py-3 px-4">{data.solar_panel_current?.toFixed(2)}</td>
                  <td className="py-3 px-4">{data.signal_strength?.toFixed(1)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                      {data.mission_phase}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TelemetryView;