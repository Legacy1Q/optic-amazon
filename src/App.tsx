import { useEffect, useState } from 'react';
import './styles/App.css';
import { HarmonyPapiUser } from '@amzn/harmony-types';
import Header from './components/Header';
import OpticBoardPanel from './components/OpticBoardPanel';

function App() {
  const [user, setUser] = useState<HarmonyPapiUser>();
  const [selectedBrick, setSelectedBrick] = useState<{
    azId: string;
    siteId: string;
    brickId: string;
  } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const user = await window.harmony.user.lookup();
      setUser(user);
    };

    getUser();
  }, []);

  const handleSearch = (deviceName: string) => {
    // Parse device name: cluster-site-fabric-roleId-brick
    // Example: [MAC_ADDRESS]
    const parts = deviceName.split('-');

    if (parts.length === 5) {
      const [azId, siteId, , , brickId] = parts;
      setSelectedBrick({ azId, siteId, brickId });
    }
  };

  const handleReset = () => {
    setSelectedBrick(null);
  };

  return (
    <div className="app">
      <Header
        userName={user?.firstName || 'User'}
        onSearch={handleSearch}
        onReset={handleReset}
      />
      <OpticBoardPanel
        azId={selectedBrick?.azId || null}
        siteId={selectedBrick?.siteId || null}
        brickId={selectedBrick?.brickId || null}
      />
    </div>
  );
}

export default App;
