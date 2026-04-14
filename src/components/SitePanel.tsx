import React, { useEffect, useState } from 'react';
import { Cluster, Site } from '../types';
import NavItem from './NavItem';
import { fetchSitesForAZ } from '../services/api';
import '../styles/SitesPanel.css';

interface Props {
  cluster: Cluster | null;
  azId: string | null;
  selectedSite: string | null;
  onSelect: (siteId: string) => void;
}

const SitePanel: React.FC<Props> = ({
  cluster,
  azId,
  selectedSite,
  onSelect
}) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cluster || !azId) {
      setSites([]);
      return;
    }

    const loadSites = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSitesForAZ(cluster, azId);
        setSites(data);
      } catch (err) {
        console.error('Failed to load sites:', err);
        setError('Failed to load sites');
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, [cluster, azId]);

  if (!cluster || !azId) {
    return (
      <div className="nav-panel site-panel disabled">
        <div className="panel-header">Sites</div>
        <div className="panel-placeholder">
          <span className="placeholder-icon">🏢</span>
          <span>Select an availability zone</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nav-panel site-panel">
      <div className="panel-header">
        <span>Sites</span>
        {sites.length > 0 && (
          <span className="site-count">{sites.length}</span>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading sites...</span>
        </div>
      ) : error ? (
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      ) : sites.length === 0 ? (
        <div className="empty-container">
          <span className="empty-icon">📭</span>
          <span>No sites found</span>
        </div>
      ) : (
        <div className="nav-items">
          {sites.map(site => (
            <NavItem
              key={site.id}
              label={site.name}
              isActive={selectedSite === site.id}
              onClick={() => onSelect(site.id)}
              badge={site.brickCount ? `${site.brickCount} bricks` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );

};

export default SitePanel;