// src/pages/Home/Home.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from '../components/LoginModal';
import '../styles/Home.css';

interface DashboardCard {
  id: string;
  title: string;
  emoji: string;
  path: string;
  description: string;
}

const CARDS: DashboardCard[] = [
  {
    id: 'brick',
    title: 'Brick Tracking',
    emoji: '🧱',
    path: '/brick-tracking',
    description: 'Track optics installed in network bricks',
  },
  {
    id: 'bin',
    title: 'Bin Tracking',
    emoji: '📦',
    path: '/bin-tracking',
    description: 'Monitor optic inventory in bins',
  },
  {
    id: 'deployment',
    title: 'Deployment Tracking',
    emoji: '✅',
    path: '/deployment-tracking',
    description: 'Track optic deployments by user',
  },
  {
    id: 'ticket',
    title: 'Ticket Tracking',
    emoji: '🎫',
    path: '/ticket-tracking',
    description: 'Monitor SIM tickets for optics',
  },
];

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const handleCardClick = (path: string) => {
    if (!isAuthenticated) {
      setPendingPath(path);
      setShowLogin(true);
      return;
    }
    navigate(path);
  };

  const handleLoginClose = () => {
    setShowLogin(false);
    if (pendingPath && isAuthenticated) {
      navigate(pendingPath);
      setPendingPath(null);
    }
  };

  return (
    <div className="home-page">
      {/* Login Modal */}
      {showLogin && <LoginModal onClose={handleLoginClose} />}

      {/* Cards Grid */}
      <main className="home-main">
        <div className="home-cards">
          {CARDS.map((card) => (
            <button
              key={card.id}
              className="home-card"
              onClick={() => handleCardClick(card.path)}
            >
              <div className="home-card-emoji">{card.emoji}</div>
              <div className="home-card-body">
                <h3 className="home-card-title">{card.title}</h3>
                <span className="home-card-arrow">›</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;
