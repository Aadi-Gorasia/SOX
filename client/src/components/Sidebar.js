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

  // The 'end' prop on NavLink ensures it's only active for the exact path match
  // The function in 'className' is a feature of NavLink to apply classes conditionally
  const getNavLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';

  const getProfileLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';


  return (
    <nav className="main-nav">
      <header className="nav-header">
        <div className="hamburger-icon">
          <div />
          <div />
          <div />
        </div>
      </header>

      {/* Main navigation links */}
      <div className="nav-links">
        <NavLink to="/dashboard" className={getNavLinkClass} end>Home</NavLink>
        <NavLink to="/play" className={getNavLinkClass}>New Game</NavLink>
        <NavLink to="/social" className={getNavLinkClass}>Social</NavLink>
        <NavLink to="/watch" className={getNavLinkClass}>Watch</NavLink>
        <NavLink to="/news" className={getNavLinkClass}>News</NavLink>
        <button className="nav-link more-button">...</button>
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
            <button onClick={handleLogout} className="nav-link">Logout</button>
          </>
        ) : (
          <>
            {/* You can add login/signup links here if needed for logged-out users */}
            <NavLink to="/login" className={getNavLinkClass}>Log In</NavLink>
            <NavLink to="/register" className={getNavLinkClass}>Sign Up</NavLink>
          </>
        )}
      </footer>
    </nav>
  );
};

export default Sidebar;