import React, { useEffect, useState } from 'react';
import { Cluster, OpticSlot } from '../types';
import OpticGrid from './OpticGrid';
import { fetchOpticData } from '../services/api';
import '../styles/OpticBoardPanel.css';

interface Props {
  cluster: Cluster | null;
  azId: string | null;
  siteId: string | null;
  brickId: string | null;
}

const OpticBoardPanel: React.FC<Props> = ({ cluster, azId, siteId, brickId }) => {
  const [opticSlots, setOpticSlots] = useState<OpticSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');

  useEffect(() => {
    if (!cluster || !azId || !siteId || !brickId) {
      setOpticSlots([]);
      return;
    }

    const loadOpticData = async () => {
      setLoading(true);
      try {
        // Build device name: {az_lower}-{site}-es-e1-{brick_lower}
        // Example: [MAC_ADDRESS]
        const name = `${azId.toLowerCase()}-${siteId}-es-e1-${brickId.toLowerCase()}`;
        setDeviceName(name);

        // Fetch optic data from NSM/Mobility APIs
        const data = await fetchOpticData(name);
        setOpticSlots(data);
      } catch (error) {
        console.error('Failed to load optic data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOpticData();
  }, [cluster, azId, siteId, brickId]);

  if (!brickId) {
    return (
      <div className="nav-panel optic-board-panel main-panel disabled">
        <div className="panel-header">Optic Board</div>
        <div className="panel-placeholder">
          <span className="placeholder-icon">🔌</span>
          <span>Select a brick to view optics</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nav-panel optic-board-panel main-panel">
      <div className="panel-header">
        <span>{deviceName}</span>
        <span className="device-type-badge brick">BRICK</span>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading optic data...</span>
        </div>
      ) : (
        <OpticGrid slots={opticSlots} deviceName={deviceName} />
      )}
    </div>
  );
};

export default OpticBoardPanel;