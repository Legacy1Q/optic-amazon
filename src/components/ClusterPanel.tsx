import React from 'react';
import { Cluster } from '../types';
import NavItem from './NavItem';
import '../styles/ClusterPanel.css';

interface Props {
  selectedCluster: Cluster | null;
  onSelect: (cluster: Cluster) => void;
}

const CLUSTERS: Cluster[] = ['IAD'];

const ClusterPanel: React.FC<Props> = ({ selectedCluster, onSelect }) => {
  return (
    <div className="nav-panel cluster-panel">
      <div className="panel-header">Clusters</div>
      <div className="nav-items">
        {CLUSTERS.map(cluster => (
          <NavItem
            key={cluster}
            label={cluster}
            isActive={selectedCluster === cluster}
            onClick={() => onSelect(cluster)}
          />
        ))}
      </div>
    </div>
  );
};

export default ClusterPanel;
