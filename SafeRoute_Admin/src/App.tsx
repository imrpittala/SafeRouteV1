
import Layout from './components/Layout';
import { useStore } from './store/useStore';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import SystemHealth from './pages/SystemHealth';
import Settings from './pages/Settings';

import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { activeTab } = useStore();
  
  // Initialize WebSocket connection
  useWebSocket();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'map': return <LiveMap />;
      case 'health': return <SystemHealth />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
}

export default App;
