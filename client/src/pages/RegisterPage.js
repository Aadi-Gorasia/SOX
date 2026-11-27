import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const[isCreated, setIsCreated] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await axios.post(`${API_BASE}/api/users/register`, formData);
      setIsCreated(true);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to create your account. Please try again.');
    } finally { setBusy(false); }
  };

  const handleSocialAuth = (provider) => {
    const returnTo = location.state?.from;
    if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\')) sessionStorage.setItem('sox-auth-return', returnTo);
    window.location.href = `${API_BASE}/api/auth/${provider}`;
  };

  if (isCreated) {
    return (
      <div className="auth-root">
        <InteractiveBG />
        <div className="auth-wrap" style={{ textAlign: 'center' }}>

          <div className="auth-brand">
            <div className="auth-logo-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`auth-logo-cell ${i === 4 ? 'auth-logo-cell--accent' : ''}`} />
              ))}
            </div>
          </div>

          <header className="auth-header" style={{ marginBottom: '1.5rem' }}>
            <h1 className="auth-title">Your account is ready</h1>
            <p className="auth-subtitle" style={{ lineHeight: '1.6' }}>
              Sign in to start playing as <br/>
              <strong className="text-accent">{formData.username}</strong>
            </p>
          </header>

          <button className="auth-btn-outline" onClick={() => navigate('/login', { state: location.state })}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root">
      <InteractiveBG />

      <div className="auth-wrap">


        <header className="auth-header">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Play people, challenge a bot, and learn from every game.</p>
        </header>

        <form onSubmit={onSubmit}>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="auth-input-group">
            <label htmlFor="auth-username">Username</label>
            <input
              type="text" name="username" id="auth-username" autoComplete="username" placeholder="Choose an alias"
              onChange={(e) => setFormData({...formData, username: e.target.value})} required
            />
          </div>
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
              type="password" name="password" id="auth-password" autoComplete="new-password" minLength={6} placeholder="Min. 6 characters"
              onChange={(e) => setFormData({...formData, password: e.target.value})} required
            />
          </div>
          <button type="submit" disabled={busy} className="auth-btn-primary">{busy ? 'Please wait…' : 'Create account'}</button>
        </form>

        <div className="auth-divider">
          <span>Or sign up with</span>
        </div>

        <div className="social-grid">
          <button className="social-btn" onClick={() => handleSocialAuth('google')}>Google</button>
          <button className="social-btn" onClick={() => handleSocialAuth('facebook')}>Facebook</button>
        </div>

        <footer className="auth-footer">
          Already have an account?
          <Link to="/login" state={location.state}>Sign in</Link>
        </footer>
      </div>
    </div>
  );
};

export default RegisterPage;
