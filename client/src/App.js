// client/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Outlet } from 'react-router-dom';
import './App.css';

// --- Context Providers ---
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { ThemeProvider } from './context/ThemeContext'; // <--- 1. IMPORT THEME PROVIDER

// --- Components & Layouts ---
import Navbar from './components/Navbar';
import PrivateRoute from './routing/PrivateRoute';
import GameLayout from './layouts/GameLayout';

// --- Pages ---
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import PlayPage from './pages/PlayPage';
import GamePage from './pages/GamePage';
import SettingsPage from './pages/SettingsPage'; // <--- 2. IMPORT SETTINGS PAGE

const MainLayout = () => (
  <>
    <Navbar />
    <Outlet />
  </>
);

const AppContent = () => {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Private Routes (Main Layout) */}
      <Route
        element={
          <PrivateRoute>
            <GameProvider>
              <MainLayout />
            </GameProvider>
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/play" element={<PlayPage />} />
        
        {/* 3. ADD SETTINGS ROUTE HERE */}
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Game Route (Special Layout) */}
      <Route
        element={
          <PrivateRoute>
            <GameProvider>
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
        {/* 4. WRAP EVERYTHING WITH THEME PROVIDER */}
        <ThemeProvider>
          <Router>
            {/* 
               We update the background div to use CSS Variables 
               so it changes color based on the selected theme.
            */}
            <div className="app-background"></div>
            
            <div className="App">
              <AppContent />
            </div>
          </Router>
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;