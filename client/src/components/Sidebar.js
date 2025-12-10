// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to home page after logout
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link';

  const getProfileLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link';

  return (
    <nav className="main-nav">
      <header className="nav-header">
        <div className="nav-brand">
          <span className="brand-dot" />
          <NavLink to="/" className="brand-text">SOX •<br></br>Think Harder</NavLink>
        </div>
      </header>

      {/* Main navigation links */}
      <div className="nav-links">
        <NavLink to="/dashboard" className={getNavLinkClass} end>
          Home
        </NavLink>
        <NavLink to="/play" className={getNavLinkClass}>
          New Game
        </NavLink>
        <NavLink to="/social" className={getNavLinkClass}>
          Social
        </NavLink>
        <NavLink to="/watch" className={getNavLinkClass}>
          Watch
        </NavLink>
        <NavLink to="/news" className={getNavLinkClass}>
          News
        </NavLink>
      </div>

      {/* Footer with user-specific links */}
      <footer className="nav-footer">
        {isAuthenticated && user ? (
          <>
            <NavLink
              to={`/profile/${user.username}`}
              className={getProfileLinkClass}
            >
              Profile
            </NavLink>
            <button onClick={handleLogout} className="nav-link">
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={getNavLinkClass}>
              Log In
            </NavLink>
            <NavLink to="/register" className={getNavLinkClass}>
              Sign Up
            </NavLink>
          </>
        )}
      </footer>
    </nav>
  );
};

export default Sidebar;
