// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './components/Home';
import BrickTracking from './components/BrickTracking';
import BinTracking from './components/BinTracking';
import DeploymentTracking from './components/DeploymentTracking';
import TicketTracking from './components/TicketTracking';
import './styles/App.css';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppLayout = () => {
  return (
    <div className="app-shell">
      <Nav />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/brick-tracking"
            element={
              <ProtectedRoute>
                <BrickTracking />
              </ProtectedRoute>
            }
          />
          {/* Future routes */}
          <Route path="/bin-tracking"        
            element=
              {<ProtectedRoute>
                <BinTracking />
              </ProtectedRoute>} />
          <Route path="/deployment-tracking" 
            element=
              {<ProtectedRoute>
                  <DeploymentTracking />
                </ProtectedRoute>} />
          <Route path="/ticket-tracking"     
            element=
              {<ProtectedRoute>
                <TicketTracking />
              </ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
