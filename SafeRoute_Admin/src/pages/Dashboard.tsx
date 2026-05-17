import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  Zap, 
  TrendingUp,
  Map as MapIcon,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';

const Dashboard: React.FC = () => {
  const { alerts, setFocusedLocation } = useStore();

  const stats = [
    { label: 'Total Users', value: '12,840', change: '+12%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Alerts', value: alerts.length.toString(), change: alerts.length > 0 ? 'Urgent' : 'None', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Avg Safety Score', value: '94.2%', change: '+0.4%', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'API Latency', value: '24ms', change: '-2ms', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">Mission Control Overview</h2>
        <p className="text-zinc-500 font-medium">Real-time command center for city safety operations.</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="group relative rounded-3xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className={cn("p-3 rounded-2xl border border-white/5", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{stat.label}</span>
                <span className="text-2xl font-bold text-white tracking-tight">{stat.value}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-2 relative z-10">
              <div className="flex items-center text-[10px] font-bold text-green-500 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                <TrendingUp size={10} className="mr-1" />
                {stat.change}
              </div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">vs last 24h</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-3xl bg-zinc-950 border border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-white">System Performance</h3>
            </div>
            <select className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2">
            {[40, 65, 45, 90, 55, 80, 45, 70, 85, 30, 55, 95].map((h, i) => (
              <div key={i} className="flex-1 group relative">
                <div 
                  className="w-full bg-zinc-900 rounded-t-lg group-hover:bg-primary/40 transition-all duration-500" 
                  style={{ height: `${h}%` }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-white text-zinc-950 text-[10px] font-bold px-2 py-1 rounded-md mb-2 shadow-xl">
                    {h}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-3xl bg-zinc-950 border border-zinc-800 p-8 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Active SOS Alerts
            </h3>
            <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[10px] font-bold uppercase animate-pulse">
              Live
            </span>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-zinc-600">
                <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No Active Alerts</p>
                <p className="text-[10px] mt-1">System monitoring is active</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div 
                  key={`${alert.userId}-${alert.timestamp}`} 
                  className="group p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-all cursor-pointer"
                  onClick={() => setFocusedLocation(alert.location)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{alert.userId}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapIcon className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                      </span>
                    </div>
                    <button 
                      className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tighter"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle resolution if needed
                      }}
                    >
                      Respond
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">District Status</h4>
            <div className="space-y-3">
              {[
                { area: 'Downtown Core', status: 'High Traffic', risk: 'Low', color: 'bg-green-500' },
                { area: 'East Harbor', status: 'Active Alert', risk: 'High', color: 'bg-red-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                    <span className="text-xs font-medium text-zinc-300">{item.area}</span>
                  </div>
                  <span className={cn("text-[10px] font-bold", item.risk === 'High' ? 'text-red-500' : 'text-zinc-500')}>
                    {item.risk} Risk
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
