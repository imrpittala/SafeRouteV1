import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import MapView from './components/MapView';
import AnalyticsCards from './components/AnalyticsCards';
import TuningPanel from './components/TuningPanel';
import { AlertCircle, X } from 'lucide-react';

export interface SOSAlert {
  userId: string;
  location: { lat: number; lng: number };
  timestamp: string;
  type: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [lambda, setLambda] = useState(2500); // 0 = fast, 5000 = safe
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);

  useEffect(() => {
    // Establish WebSocket connection to backend
    const ws = new WebSocket('ws://localhost:8000/ws/admin');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SOS') {
          // Prepend new alert to the state array
          setAlerts((prevAlerts) => [data, ...prevAlerts]);
        }
      } catch (err) {
        console.error('Failed to parse incoming WebSocket message', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    return () => {
      // Cleanup on unmount
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  const dismissAlert = (index: number) => {
    setAlerts((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="relative w-full h-full flex flex-row p-6">

        {/* Global Alert Overlay - Prominent Flashing Notification */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center space-y-4 w-full max-w-2xl px-4 pointer-events-none">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.userId}-${alert.timestamp}-${index}`}
              className="pointer-events-auto w-full bg-red-600 animate-pulse text-white rounded-xl shadow-2xl p-4 flex items-center justify-between border-2 border-red-400"
            >
              <div className="flex items-center space-x-4">
                <AlertCircle className="w-8 h-8 text-red-200" />
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider">Critical SOS Alert Received!</h3>
                  <p className="text-sm text-red-100">
                    User: <span className="font-mono font-bold text-white">{alert.userId}</span> •
                    Location: <span className="font-mono">{alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}</span>
                  </p>
                  <p className="text-xs text-red-200 mt-1">Time: {new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => dismissAlert(index)}
                className="p-2 hover:bg-red-700 rounded-full transition-colors"
                title="Dismiss Alert"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>

        {/* Main Map Area (Visible on Map or Tuning tab usually) */}
        {(activeTab === 'map' || activeTab === 'tuning') && (
          <div className="flex-1 rounded-3xl overflow-hidden relative shadow-2xl border border-zinc-800 bg-zinc-900 group">
            <MapView lambda={lambda} />

            {/* Map Overlay content */}
            <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-10">
              <div className="pointer-events-auto">
                <AnalyticsCards />
              </div>
            </div>
          </div>
        )}

        {/* Algorithm Tuning View */}
        {activeTab === 'tuning' && (
          <div className="ml-6 transition-all duration-500 transform translate-x-0 opacity-100 rounded-3xl overflow-hidden">
            <TuningPanel lambda={lambda} setLambda={setLambda} />
          </div>
        )}

        {/* Generic mock view for Incident Reports */}
        {activeTab === 'reports' && (
          <div className="flex-1 bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-zinc-800 p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Incident Reports Database</h2>

            {/* Show alerts inside the reports tab as well for persistence */}
            <div className="h-full flex flex-col items-center justify-start text-zinc-500 overflow-y-auto">
              {alerts.length > 0 ? (
                <div className="w-full space-y-4 max-w-4xl mt-4">
                  {alerts.map((alert, index) => (
                    <div key={index} className="w-full bg-red-900/20 border border-red-500/50 p-6 rounded-xl text-left flex justify-between items-center shadow-lg">
                      <div>
                        <div className="flex items-center space-x-2 text-red-400 font-bold mb-2">
                          <AlertCircle className="w-5 h-5" />
                          <span>SOS ALERT TRIGGERED</span>
                        </div>
                        <p className="text-white font-medium">User ID: <span className="font-mono text-zinc-400">{alert.userId}</span></p>
                        <p className="text-zinc-300">Coordinates: <span className="font-mono">{alert.location.lat}, {alert.location.lng}</span></p>
                        <p className="text-zinc-500 text-sm mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => dismissAlert(index)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg transition-colors border border-zinc-600 font-medium"
                      >
                        Resolve Incident
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p>No active incidents.</p>
                  <p className="text-sm mt-2">Historical tabular report data would render here.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default App;
