import React, { useState } from 'react';
import { NavigationState } from '../types';
import '../styles/Header.css';

interface Props {
  navState: NavigationState;
  userName: string;
}

const Header: React.FC<Props> = ({ navState, userName }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const getBreadcrumbs = () => {
    const crumbs: { label: string; active: boolean }[] = [];

    // Cluster (IAD, CMH, PDX)
    if (navState.selectedCluster) {
      crumbs.push({
        label: navState.selectedCluster,
        active: !navState.selectedAZ,
      });
    }

    // Availability Zone (IAD7, CMH3, etc.)
    if (navState.selectedAZ) {
      crumbs.push({
        label: navState.selectedAZ,
        active: !navState.selectedSite,
      });
    }

    // Site (222, 109, etc.)
    if (navState.selectedSite) {
      crumbs.push({
        label: navState.selectedSite,
        active: !navState.selectedBrick,
      });
    }

    // Brick (B24, B29, etc.)
    if (navState.selectedBrick) {
      crumbs.push({
        label: navState.selectedBrick,
        active: true,
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-title">
          <span className="title-icon">⚡</span>
          <h1>Brick Tracker</h1>
          <span className="title-subtitle">Amazon Harmony</span>
        </div>

        {breadcrumbs.length > 0 && (
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-home">🏠</span>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <span className="breadcrumb-separator">›</span>
                <span
                  className={`breadcrumb-item ${
                    crumb.active ? 'active' : ''
                  }`}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      <div className="header-right">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="Search bricks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
            🔍
          </button>
        </form>

        <div className="user-info">
          <span className="user-greeting">Hello, {userName}</span>
          <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;