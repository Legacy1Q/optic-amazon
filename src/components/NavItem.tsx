import React from 'react';
import '../styles/NavItem.css';

interface Props {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}

const NavItem: React.FC<Props> = ({ label, isActive, onClick, badge }) => {
  return (
    <div
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="nav-item-label">{label}</span>
      {badge && <span className="nav-item-badge">{badge}</span>}
    </div>
  );
};

export default NavItem;