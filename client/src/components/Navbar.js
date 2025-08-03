// client/src/components/Navbar.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  return (
    <nav className="global-nav">
      <div className="nav-logo">
        <Link to={isAuthenticated ? "/dashboard" : "/"}>SOX</Link>
      </div>
      <div className="nav-links">
        {isAuthenticated && user ? (
          <>
            <Link to="/play">Play</Link>
            <Link to={`/profile/${user.username}`}>Profile</Link>
            <button onClick={logout} className="nav-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Log In</Link>
            <Link to="/register" className="nav-button primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;