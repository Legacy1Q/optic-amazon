import React, { useEffect, useState } from 'react';
import { Cluster, Brick } from '../types';
import { fetchBricksForSite } from '../services/api';
import '../styles/BrickPanel.css';

interface Props {
  cluster: Cluster | null;
  azId: string | null;
  siteId: string | null;
  selectedBrick: string | null;
  onSelect: (brickId: string) => void;
}

const BrickPanel: React.FC<Props> = ({
  cluster,
  azId,
  siteId,
  selectedBrick,
  onSelect
}) => {
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cluster || !azId || !siteId) {
      setBricks([]);
      return;
    }

    const loadBricks = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBricksForSite(cluster, azId, siteId);
        setBricks(data);
      } catch (err) {
        console.error('Failed to load bricks:', err);
        setError('Failed to load bricks');
      } finally {
        setLoading(false);
      }
    };

    loadBricks();
  }, [cluster, azId, siteId]);

  // Calculate deployment statistics
  const getDeploymentStats = (brick: Brick) => {
    if (!brick.deployedOptics || !brick.totalOptics) {
      return null;
    }
    const percentage = Math.round((brick.deployedOptics / brick.totalOptics) * 100);
    return { deployed: brick.deployedOptics, total: brick.totalOptics, percentage };
  };

  const getStatusClass = (percentage: number) => {
    if (percentage >= 90) return 'status-good';
    if (percentage >= 70) return 'status-warning';
    return 'status-critical';
  };

  if (!cluster || !azId || !siteId) {
    return (
      <div className="nav-panel brick-panel disabled">
        <div className="panel-header">Bricks</div>
        <div className="panel-placeholder">
          <span className="placeholder-icon">📦</span>
          <span>Select a site</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nav-panel brick-panel">
      <div className="panel-header">
        <span>Bricks</span>
        {bricks.length > 0 && (
          <span className="brick-count">{bricks.length}</span>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading bricks...</span>
        </div>
      ) : error ? (
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      ) : bricks.length === 0 ? (
        <div className="empty-container">
          <span className="empty-icon">📭</span>
          <span>No bricks found</span>
        </div>
      ) : (
        <div className="nav-items">
          {bricks.map(brick => {
            const stats = getDeploymentStats(brick);
            return (
              <div
                key={brick.id}
                className={`brick-item ${selectedBrick === brick.id ? 'active' : ''}`}
                onClick={() => onSelect(brick.id)}
              >
                <div className="brick-item-header">
                  <span className="brick-name">{brick.name}</span>
                  {stats && (
                    <span className={`brick-percentage ${getStatusClass(stats.percentage)}`}>
                      {stats.percentage}%
                    </span>
                  )}
                </div>

                {stats && (
                  <div className="brick-stats">
                    <div className="stats-bar">
                      <div
                        className={`stats-fill ${getStatusClass(stats.percentage)}`}
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                    <span className="stats-text">
                      {stats.deployed}/{stats.total} optics
                    </span>
                  </div>
                )}

                <div className="brick-device-name">
                  {brick.hostName}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrickPanel;
