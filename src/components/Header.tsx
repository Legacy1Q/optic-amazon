import React, { useState } from 'react';
import '../styles/Header.css';

interface Props {
  userName: string;
  onSearch: (deviceName: string) => void;
  onReset?: () => void;
}

const Header: React.FC<Props> = ({ userName, onSearch, onReset }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const deviceName = searchQuery.trim();
    
    if (!deviceName) {
      setSearchError('Please enter a device name');
      return;
    }

    // Validate brick name format: cluster-site-fabric-roleId-brick
    // Example: [MAC_ADDRESS]
    const brickPattern = /^([a-z]+\d+)-(\d+)-([a-z]+)-([a-z0-9]+)-([a-z0-9]+)$/i;
    
    if (!brickPattern.test(deviceName)) {
      setSearchError('Invalid format. Use: cluster-site-fabric-role-brick (e.g., [MAC_ADDRESS])');
      return;
    }

    // Clear error and trigger search
    setSearchError('');
    onSearch(deviceName);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSearchError('');
    if (onReset) {
      onReset();
    } else {
      window.location.reload(); // Fallback to reload if no reset handler provided
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-title">
          <span 
          className="title-icon"
          onClick={handleReset}
          style={{cursor: 'pointer'}}
          title='Reset / Refresh'
          >
            <img src="../images/aws_logo_1.png" alt="AWS Logo" />
          </span>
          <h1>Brick Tracker</h1>
        </div>
      </div>

      <div className="header-right">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-wrapper">
            <input
              type="text"
              className={`search-input ${searchError ? 'error' : ''}`}
              placeholder="[BRICK_NAME]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchError) setSearchError('');
              }}
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </div>
          {searchError && (
            <div className="search-error">{searchError}</div>
          )}
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

