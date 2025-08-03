// client/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import PrivateRoute from './routing/PrivateRoute';

// Import all necessary components and pages
import Navbar from './components/Navbar';
import MainAppLayout from './layouts/MainAppLayout';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import PlayPage from './pages/PlayPage';

// --- APP ROUTER ---
const AppRouter = () => (
  <Router>
    <Navbar />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<PrivateRoute><MainAppLayout><DashboardPage /></MainAppLayout></PrivateRoute>} />
      <Route path="/profile/:username" element={<PrivateRoute><MainAppLayout><ProfilePage /></MainAppLayout></PrivateRoute>} />
      <Route path="/play" element={
        <PrivateRoute>
          <GameProvider>
            <PlayPage />
          </GameProvider>
        </PrivateRoute>
      } />
    </Routes>
  </Router>
);

// --- MAIN APP & LOADER ---
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="global-loader">
        <div className="loader-spinner"></div>
      </div>
    );
  }
  return (
    <SocketProvider>
      <AppRouter />
    </SocketProvider>
  );
};

export default App;