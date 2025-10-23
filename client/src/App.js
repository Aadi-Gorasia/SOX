// client/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';

// --- Context Providers ---
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';

// --- Routing & Layouts ---
import PrivateRoute from './routing/PrivateRoute';
import DefaultLayout from './layouts/DefaultLayout'; // New
import GameLayout from './layouts/GameLayout';       // New

// --- Pages ---
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import PlayPage from './pages/PlayPage';
import GamePage from './pages/GamePage';

const AppContent = () => {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div className="spinner"></div>; // Using your existing spinner class
  }

  return (
    <Routes>
      {/* --- Public Routes (No Layout) --- */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* --- Routes with the Default (Navbar) Layout --- */}
      <Route
        element={
          <PrivateRoute>
            <GameProvider> {/* GameProvider needed for /play */}
              <DefaultLayout />
            </GameProvider>
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/play" element={<PlayPage />} />
        {/* Add any other non-game pages here */}
      </Route>

      {/* --- Routes with the Game (Sidebar) Layout --- */}
      <Route
        element={
          <PrivateRoute>
            <GameProvider> {/* GameProvider needed for /game/:gameId */}
              <GameLayout />
            </GameProvider>
          </PrivateRoute>
        }
      >
        <Route path="/game/:gameId" element={<GamePage />} />
      </Route>

    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="holographic-background"></div>
          <div className="animated-blobs"><div></div><div></div></div>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;