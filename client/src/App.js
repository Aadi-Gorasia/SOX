// client/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Outlet } from 'react-router-dom';
import './App.css';

// --- Context Providers ---
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';

// --- Components & Layouts ---
import Navbar from './components/Navbar'; // Import Navbar
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

// NEW LAYOUT: For all pages that should have a Navbar
const MainLayout = () => (
  <>
    <Navbar />
    <Outlet /> {/* This will render the child route component */}
  </>
);

const AppContent = () => {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <Routes>
      {/* --- Routes with the Main (Navbar) Layout --- */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* --- Private Routes also using the Main (Navbar) Layout --- */}
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
      </Route>

      {/* --- Game Route with its own special layout --- */}
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
        <Router>
          {/* This is the correct structure for a global background and app content */}
          <div className="holographic-background"><div></div></div>
          <div className="App"> {/* Add App class for styling */}
            <AppContent />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;