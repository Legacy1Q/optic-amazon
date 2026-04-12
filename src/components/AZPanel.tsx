import React, { useEffect, useState } from 'react';
import { Cluster, AvailabilityZone } from '../types';
import NavItem from './NavItem';
import { fetchAZsForCluster } from '../services/api';
import '../styles/AZPanel.css';

interface Props {
  cluster: Cluster | null;
  selectedAZ: string | null;
  onSelect: (azId: string) => void;
}

const AZPanel: React.FC<Props> = ({ cluster, selectedAZ, onSelect }) => {
  const [azs, setAZs] = useState<AvailabilityZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cluster) {
      setAZs([]);
      return;
    }

    const loadAZs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAZsForCluster(cluster);
        setAZs(data);
      } catch (err) {
        console.error('Failed to load availability zones:', err);
        setError('Failed to load availability zones');
      } finally {
        setLoading(false);
      }
    };

    loadAZs();
  }, [cluster]);

  if (!cluster) {
    return (
      <div className="nav-panel az-panel disabled">
        <div className="panel-header">AZ</div>
        <div className="panel-placeholder">
          <span className="placeholder-icon">🔷</span>
          <span>Select a cluster</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nav-panel az-panel">
      <div className="panel-header">
        <span>AZ</span>
        {azs.length > 0 && (
          <span className="az-count">{azs.length}</span>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading availability zones...</span>
        </div>
      ) : error ? (
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      ) : azs.length === 0 ? (
        <div className="empty-container">
          <span className="empty-icon">📭</span>
          <span>No availability zones found</span>
        </div>
      ) : (
        <div className="nav-items">
          {azs.map(az => (
            <NavItem
              key={az.id}
              label={az.name}
              isActive={selectedAZ === az.id}
              onClick={() => onSelect(az.id)}
              badge={az.siteCount ? `${az.siteCount} sites` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AZPanel;
