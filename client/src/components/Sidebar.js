// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Helper to determine if a link's path is active
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="sidebar"> {/* Use a simple class name */}
      <div className="sidebar-logo">
        <Link to={isAuthenticated ? "/dashboard" : "/"}>SOX</Link>
      </div>
      <nav className="sidebar-nav">
        <Link to="/play" className={isActive('/play') ? 'active' : ''}>Play</Link>
        <Link to="/puzzles" className={isActive('/puzzles') ? 'active' : ''}>Puzzles</Link>
        <Link to="/learn" className={isActive('/learn') ? 'active' : ''}>Learn</Link>
        <Link to="/watch" className={isActive('/watch') ? 'active' : ''}>Watch</Link>
      </nav>
      <div className="sidebar-footer">
        {isAuthenticated && user ? (
          <>
            <Link 
              to={`/profile/${user.username}`} 
              className={`sidebar-button ${isActive(`/profile`) ? 'active-button' : ''}`}
            >
              Profile
            </Link>
            <button onClick={handleLogout} className="sidebar-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/register" className="sidebar-button primary">Sign Up</Link>
            <Link to="/login" className="sidebar-button">Log In</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;