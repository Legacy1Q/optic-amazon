import React from 'react';
import { NavigationState, Cluster } from '../types';
import ClusterPanel from './ClusterPanel';  // ← Make sure file exists!
import AZPanel from './AZPanel';            // ← Make sure file exists!
import SitePanel from './SitePanel';
import BrickPanel from './BrickPanel';
import OpticBoardPanel from './OpticBoardPanel';
import '../styles/NavigationContainer.css';

interface Props {
  navState: NavigationState;
  onClusterSelect: (cluster: Cluster) => void;
  onAZSelect: (azId: string) => void;
  onSiteSelect: (siteId: string) => void;
  onBrickSelect: (brickId: string) => void;
}

const NavigationContainer: React.FC<Props> = ({
  navState,
  onClusterSelect,
  onAZSelect,
  onSiteSelect,
  onBrickSelect,
}) => {
  return (
    <div className="navigation-container">
      {/* Panel 1: Clusters (IAD, CMH, PDX) */}
      <ClusterPanel
        selectedCluster={navState.selectedCluster}
        onSelect={onClusterSelect}
      />

      {/* Panel 2: Availability Zones (IAD7, IAD12, CMH3, etc.) */}
      <AZPanel
        cluster={navState.selectedCluster}
        selectedAZ={navState.selectedAZ}
        onSelect={onAZSelect}
      />

      {/* Panel 3: Sites (222, 109, 314, etc.) */}
      <SitePanel
        cluster={navState.selectedCluster}
        azId={navState.selectedAZ}
        selectedSite={navState.selectedSite}
        onSelect={onSiteSelect}
      />

      {/* Panel 4: Bricks (B24, B29, B30, etc.) */}
      <BrickPanel
        cluster={navState.selectedCluster}
        azId={navState.selectedAZ}
        siteId={navState.selectedSite}
        selectedBrick={navState.selectedBrick}
        onSelect={onBrickSelect}
      />

      {/* Panel 5: Optic Board (256-port grid) */}
      <OpticBoardPanel
        cluster={navState.selectedCluster}
        azId={navState.selectedAZ}
        siteId={navState.selectedSite}
        brickId={navState.selectedBrick}
      />
    </div>
  );
};

export default NavigationContainer;