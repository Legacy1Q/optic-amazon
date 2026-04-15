import { useState, useEffect } from 'react';
import { fetchOpticData } from '../services/api';
import OpticGrid from './OpticGrid';
import { OpticSlot } from '../types';
import '../styles/OpticBoardPanel.css';

interface Props {
  azId: string | null;
  siteId: string | null;
  brickId: string | null;
}

const OpticBoardPanel: React.FC<Props> = ({ azId, siteId, brickId }) => {
  const [slots, setSlots] = useState<OpticSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Construct device name from props
  const deviceName = azId && siteId && brickId
    ? `${azId}-${siteId}-es-e1-${brickId}`
    : null;

  useEffect(() => {
    if (!deviceName) {
      setSlots([]);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching optic data for:', deviceName);
        const data = await fetchOpticData(deviceName);
        console.log('Received optic data:', data);
        setSlots(data);
      } catch (err) {
        console.error('Error loading optic data:', err);
        setError('Failed to load optic data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [deviceName]);

  if (!deviceName) {
    return (
      <div className="optic-board-panel">
        <div className="optic-board-empty">
          ⬆️ Enter a device name to view optic data above ⬆️
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="optic-board-panel">
        <div className="optic-board-loading">
          Loading optic data for {deviceName}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="optic-board-panel">
        <div className="optic-board-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="optic-board-panel">
      <OpticGrid slots={slots} deviceName={deviceName} />
    </div>
  );
};

export default OpticBoardPanel;
