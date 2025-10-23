// client/src/components/Navbar.js
import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css'; // This will now point to the new CSS

const Navbar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    // The main container now has a simpler, more direct class name
    <header className="dashboard-header">
      <div className="header-logo">
        <Link to={isAuthenticated ? "/dashboard" : "/"}>SOX</Link>
      </div>

      <nav className="header-nav">
        {isAuthenticated && user ? (
          <>
            <Link to="/play" className={isActive('/play') ? 'active' : ''}>Play</Link>
            <Link to={`/profile/${user.username}`} className={isActive('/profile') ? 'active' : ''}>Profile</Link>
            <button onClick={handleLogout} className="nav-logout-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className={isActive('/login') ? 'active' : ''}>Log In</Link>
            <Link to="/register" className={isActive('/register') ? 'active' : ''}>Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Navbar;