import React from 'react';
import MapView from '../components/MapView';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Navigation, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';


const LiveMap: React.FC = () => {
  const { alerts, resolveAlert, setFocusedLocation } = useStore();
  const { simulateAlert } = useWebSocket();

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
      {/* Main Map View */}
      <div className="flex-1 relative group">
        <MapView />
        
        {/* Map Overlay Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <button 
            onClick={simulateAlert}
            className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl flex items-center space-x-2"
          >
            <ShieldAlert size={16} />
            <span>Simulate SOS</span>
          </button>
        </div>
      </div>

      {/* Activity Feed Sidebar */}
      <div className="w-96 bg-zinc-950/40 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">Activity Feed</h3>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold border border-red-500/20 animate-pulse">
              {alerts.length} LIVE
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium italic">Real-time emergency broadcast log</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center">
                <Navigation className="text-zinc-500 rotate-45" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-400">All Quiet in the City</p>
                <p className="text-xs text-zinc-600">Waiting for incoming signals...</p>
              </div>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={`${alert.userId}-${alert.timestamp}`}
                className="group relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-primary/40 transition-all hover:bg-zinc-900 cursor-pointer"
                onClick={() => setFocusedLocation(alert.location)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-500/20 p-2 rounded-xl border border-red-500/30">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ID: {alert.userId.slice(0, 8)}</p>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">SOS Triggered</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center text-[10px] text-zinc-500 font-mono">
                      <Clock size={10} className="mr-1" />
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-4 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 font-mono">
                  <MapPin size={12} className="text-primary" />
                  <span>{alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedLocation(alert.location);
                    }}
                    className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 text-[10px] font-bold py-2 rounded-xl transition-all flex items-center justify-center space-x-1"
                  >
                    <span>GO TO MARKER</span>
                    <ChevronRight size={12} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveAlert(alert.userId, alert.timestamp);
                    }}
                    className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 text-[10px] font-bold rounded-xl transition-all"
                  >
                    RESOLVE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800/60 bg-zinc-900/20">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>Satellite Feed: Stable</span>
            <span className="flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              Live Sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
