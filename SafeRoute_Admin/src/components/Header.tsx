import React from 'react';
import { Search, Bell, Shield, Wifi, Terminal } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';

const Header: React.FC = () => {
  const { systemStatus, alerts } = useStore();
  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <header className="h-20 border-b border-zinc-800/60 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-8 z-20 shrink-0">
      {/* Search Bar */}
      <div className="relative w-96 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Search for incidents, workers, or logs..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-inner"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500 font-bold bg-zinc-800">
          ⌘K
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center space-x-8">
        {/* System Health Pulse */}
        <div className="flex items-center space-x-6 px-6 py-2 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl">
          <div className="flex items-center space-x-2">
            <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]", getStatusColor())} />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Network Status: Online</span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-zinc-300">12 ms</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all group">
            <Terminal className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border-2 border-zinc-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button className="relative p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all group">
            <Bell className="w-5 h-5" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-zinc-950">
                {activeAlertsCount}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-zinc-800 mx-2" />

          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] transform hover:-translate-y-0.5 active:translate-y-0">
            <Shield className="w-4 h-4" />
            <span>Secure Mode</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
