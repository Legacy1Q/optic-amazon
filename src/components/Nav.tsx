// src/components/Nav/Nav.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Nav.css';

const Nav: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      // Already on home — refresh the page
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Parse AZ for display: "7/55AZ" → white "7/55" + orange "AZ"
  const parseAZ = (az: string) => {
    const match = az.match(/^([\d/]+)([A-Z]+)$/);
    if (match) return { prefix: match[1], suffix: match[2] };
    return { prefix: az, suffix: '' };
  };

  const azParsed = user ? parseAZ(user.az) : null;

  return (
    <nav className="optic-nav">
      {/* LEFT: Amazon Logo — always navigates home */}
      <div className="nav-left">
        <button className="nav-logo-btn" onClick={handleLogoClick}>
          <span className="nav-logo-text">amazon</span>
          <svg className="nav-logo-smile" viewBox="0 0 100 20">
            <path
              d="M5 5 Q50 22 95 5"
              stroke="#FF9900"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* CENTER: AZ Title */}
      <div className="nav-center">
        {azParsed ? (
          <span className="nav-title">
            <span className="nav-title-white">{azParsed.prefix}</span>
            <span className="nav-title-orange">{azParsed.suffix}</span>
          </span>
        ) : (
          <span className="nav-title">
            <span className="nav-title-white">optic-</span>
            <span className="nav-title-orange">amazon</span>
          </span>
        )}
      </div>

      {/* RIGHT: User Menu */}
      <div className="nav-right" ref={dropdownRef}>
        {user ? (
          <>
            <button
              className={`nav-user-menu ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <div className="nav-avatar">
                <span className="nav-avatar-initials">
                  {getInitials(user.name)}
                </span>
              </div>
              <span className="nav-username">{user.alias}</span>
              <svg
                className="nav-caret"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header">
                  <div className="nav-dropdown-avatar">
                    {getInitials(user.name)}
                  </div>
                  <div className="nav-dropdown-info">
                    <span className="nav-dropdown-name">{user.name}</span>
                    <span className="nav-dropdown-alias">{user.alias}</span>
                    <span className="nav-dropdown-az">{user.az}</span>
                  </div>
                </div>

                <div className="nav-dropdown-divider" />

                <ul className="nav-dropdown-list">
                  <li>
                    <button
                      className="nav-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/');
                      }}
                    >
                      <HomeIcon />
                      Home
                    </button>
                  </li>
                  <li>
                    <button
                      className="nav-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <SettingsIcon />
                      Settings
                    </button>
                  </li>
                  <li>
                    <button
                      className="nav-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <ActivityIcon />
                      Activity Log
                    </button>
                  </li>
                </ul>

                <div className="nav-dropdown-divider" />

                <ul className="nav-dropdown-list">
                  <li>
                    <button
                      className="nav-dropdown-item nav-dropdown-signout"
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                        navigate('/');
                      }}
                    >
                      <SignOutIcon />
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="nav-right-placeholder" />
        )}
      </div>
    </nav>
  );
};

/*  ── Inline SVG Icons ─────────────────────────────────────── */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default Nav;
