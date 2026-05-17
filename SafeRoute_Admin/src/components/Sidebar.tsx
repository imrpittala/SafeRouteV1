import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Activity, 
  Settings, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';

const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isSidebarOpen, toggleSidebar } = useStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-300 ease-in-out relative z-30 shadow-2xl",
        isSidebarOpen ? "w-64" : "w-20"
      )}
    >
      {/* Branding */}
      <div className={cn(
        "p-6 border-b border-zinc-800/60 flex items-center space-x-3 overflow-hidden transition-all duration-300",
        !isSidebarOpen && "justify-center px-2"
      )}>
        <div className="bg-primary p-2 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] shrink-0">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        {isSidebarOpen && (
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white tracking-tight">SafeRoute</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Mission Control</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-3 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center group transition-all duration-200 rounded-xl px-3 py-3",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0px_0px_15px_rgba(59,130,246,0.05)]" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 shrink-0 transition-transform duration-300",
                isActive ? "scale-110" : "group-hover:scale-110",
                !isSidebarOpen && "mx-auto"
              )} />
              {isSidebarOpen && (
                <span className="ml-3 font-semibold text-sm tracking-wide">{item.label}</span>
              )}
              {isActive && isSidebarOpen && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-zinc-400 hover:text-white transition-colors shadow-lg z-50"
      >
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Bottom Profile */}
      <div className={cn(
        "p-4 border-t border-zinc-800/60 transition-all duration-300",
        !isSidebarOpen && "flex justify-center"
      )}>
        <div className={cn(
          "flex items-center space-x-3 p-2 rounded-2xl bg-zinc-900/40 border border-zinc-800/50",
          !isSidebarOpen && "p-1"
        )}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0">
            AD
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate uppercase tracking-tighter">Admin User</p>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] text-zinc-500 font-medium">Online</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
