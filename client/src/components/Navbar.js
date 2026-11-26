import React, { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return <header className="glass-nav-container">
    <div className="glass-nav-inner">
      <div className="nav-logo"><Link aria-label="SOX home" to={isAuthenticated ? '/dashboard' : '/'}>SOX<span className="nav-wordmark-caption">Ultimate tic-tac-toe</span></Link></div>
      <button className="nav-menu-toggle" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
      <nav id="primary-navigation" aria-label="Main navigation" className={`nav-links-group ${open ? 'is-open' : ''}`}>
        {isAuthenticated && user ? <>
          <NavLink to="/play">Play</NavLink>
          <NavLink to="/puzzles">Puzzles</NavLink>
          <NavLink to="/games/history">Games</NavLink>
          <NavLink to={`/profile/${encodeURIComponent(user.username)}`}>Profile</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          <button onClick={() => { logout(); navigate('/'); }} className="nav-btn-logout">Sign out</button>
        </> : <>
          <a href="/#rules">How to play</a>
          <NavLink to="/login">Sign in</NavLink>
          <Link to="/register" className="nav-cta-btn">Create account</Link>
        </>}
      </nav>
    </div>
  </header>;
}
