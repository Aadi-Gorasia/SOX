import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const result = await login(formData);
      if (!result.success) setError(result.message || 'Unable to sign in. Please try again.');
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  };

  const handleSocialAuth = (provider) => {
    window.location.href = `${API_BASE}/api/auth/${provider}`;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let landingPage = user?.preferences?.landingPage;
    if (!landingPage) {
      try {
        landingPage = JSON.parse(localStorage.getItem('site-preferences') || '{}').landingPage;
      } catch {
        landingPage = 'dashboard';
      }
    }
    const destinations = { dashboard: '/dashboard', play: '/play', history: '/games/history' };
    navigate(destinations[landingPage] || '/dashboard', { replace: true });
  }, [isAuthenticated, navigate, user]);

  return (
    <div className="auth-root">
      <InteractiveBG />
      
      <div className="auth-wrap">
        

        <header className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Your games, your progress, your next move.</p>
        </header>

        <form onSubmit={onSubmit}>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="auth-input-group">
            <label htmlFor="auth-email">Email Address</label>
            <input 
              type="email" name="email" id="auth-email" autoComplete="email" placeholder="name@example.com"
              onChange={(e) => setFormData({...formData, email: e.target.value})} required 
            />
          </div>
          <div className="auth-input-group">
            <label htmlFor="auth-password">Password</label>
            <input 
              type="password" name="password" id="auth-password" autoComplete="current-password" placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})} required 
            />
          </div>
          
          <button type="submit" disabled={busy} className="auth-btn-primary">{busy ? 'Please wait…' : 'Sign in'}</button>
        </form>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <div className="social-grid">
          <button className="social-btn" onClick={() => handleSocialAuth('google')}>Google</button>
          <button className="social-btn" onClick={() => handleSocialAuth('facebook')}>Facebook</button>
        </div>

        <footer className="auth-footer">
          Don't have an account? 
          <Link to="/register">Create one</Link>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
