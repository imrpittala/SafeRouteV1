import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,

  AreaChart,
  Area
} from 'recharts';
import { 
  Activity, 
  Cpu, 
  Database, 
  Server, 
  Clock,
  RefreshCcw,
  Zap
} from 'lucide-react';
import axios from 'axios';
import { cn } from '../utils/cn';

const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

const SystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [sosTrends, setSosTrends] = useState<any[]>([]);
  const [latencyData, setLatencyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [healthRes, trendsRes, latencyRes] = await Promise.all([
        axios.get(`${API_URL}/system/health`),
        axios.get(`${API_URL}/analytics/sos-trends`),
        axios.get(`${API_URL}/analytics/response-times`)
      ]);
      setHealthData(healthRes.data);
      setSosTrends(trendsRes.data);
      setLatencyData(latencyRes.data);
    } catch (err) {
      console.error('Failed to fetch health analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: 'CPU Load', value: healthData?.cpu_usage ? `${healthData.cpu_usage}%` : '0%', icon: Cpu, color: 'text-blue-500' },
    { label: 'Memory', value: healthData?.memory_usage ? `${healthData.memory_usage} MB` : '0 MB', icon: Database, color: 'text-indigo-500' },
    { label: 'Worker Nodes', value: healthData?.active_workers || '0', icon: Server, color: 'text-purple-500' },
    { label: 'System Uptime', value: healthData?.uptime_seconds ? `${Math.floor(healthData.uptime_seconds / 3600)}h ${Math.floor((healthData.uptime_seconds % 3600) / 60)}m` : '0h 0m', icon: Clock, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white">System Health & Analytics</h2>
          <p className="text-zinc-500 font-medium">Monitoring the core infrastructure and AI routing engine.</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:border-primary transition-all group"
        >
          <RefreshCcw className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl shadow-xl flex items-center space-x-4">
            <div className={cn("p-4 rounded-2xl bg-zinc-900 border border-white/5")}>
              <m.icon className={cn("w-6 h-6", m.color)} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{m.label}</p>
              <p className="text-xl font-bold text-white">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SOS Trends Chart */}
        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center space-x-3 mb-8">
            <Activity className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">SOS Incident Trends</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sosTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#ef4444' }}
                />
                <Bar dataKey="alerts" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* API Latency Chart */}
        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center space-x-3 mb-8">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">AI Worker Latency (ms)</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#eab308' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#eab308" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
