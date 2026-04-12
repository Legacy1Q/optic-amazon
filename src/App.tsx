
import { useEffect, useState } from 'react';
import './styles/App.css';
import { HarmonyPapiUser } from '@amzn/harmony-types';
import NavigationContainer from './components/NavigationContainer';
import Header from './components/Header';
import { Cluster, NavigationState } from './types';

function App() {
  const [user, setUser] = useState<HarmonyPapiUser>();
  const [navState, setNavState] = useState<NavigationState>({
    selectedCluster: null,  // IAD, CMH, PDX
    selectedAZ: null,       // IAD7, IAD12, CMH3, etc.
    selectedSite: null,     // 222, 109, 314, etc.
    selectedBrick: null,    // B24, B29, B30, etc.
  });

  useEffect(() => {
    const getUser = async () => {
      const user = await window.harmony.user.lookup();
      setUser(user);
    };

    getUser();
  }, []);

  // Handler for Cluster selection (IAD, CMH, PDX)
  const handleClusterSelect = (cluster: Cluster) => {
    setNavState({
      selectedCluster: cluster,
      selectedAZ: null,
      selectedSite: null,
      selectedBrick: null,
    });
  };

  // Handler for Availability Zone selection (IAD7, CMH3, etc.)
  const handleAZSelect = (azId: string) => {
    setNavState(prev => ({
      ...prev,
      selectedAZ: azId,
      selectedSite: null,
      selectedBrick: null,
    }));
  };

  // Handler for Site selection (222, 109, etc.)
  const handleSiteSelect = (siteId: string) => {
    setNavState(prev => ({
      ...prev,
      selectedSite: siteId,
      selectedBrick: null,
    }));
  };

  // Handler for Brick selection (B24, B29, etc.)
  const handleBrickSelect = (brickId: string) => {
    setNavState(prev => ({
      ...prev,
      selectedBrick: brickId,
    }));
  };

  return (
    <div className="app">
      <Header 
        navState={navState} 
        userName={user?.firstName || 'User'} 
      />
      <NavigationContainer
        navState={navState}
        onClusterSelect={handleClusterSelect}
        onAZSelect={handleAZSelect}
        onSiteSelect={handleSiteSelect}
        onBrickSelect={handleBrickSelect}
      />
    </div>
  );
}

export default App;

