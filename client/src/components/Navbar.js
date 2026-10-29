import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass-nav-container">
      <div className="glass-nav-inner">
        <div className="nav-logo">
          <Link to={isAuthenticated ? "/dashboard" : "/"}>SOX</Link>
        </div>

        <nav className="nav-links-group">
          {isAuthenticated && user ? (
            <>
              <Link to="/play" className={isActive('/play') ? 'active' : ''}>PLAY</Link>
              <Link to={`/profile/${user.username}`} className={isActive(`/profile/${user.username}`) ? 'active' : ''}>PROFILE</Link>
              <button onClick={handleLogout} className="nav-btn-logout">LOGOUT</button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login') ? 'active' : ''}>LOGIN</Link>
              <Link to="/register" className="nav-cta-btn">INITIALIZE</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;