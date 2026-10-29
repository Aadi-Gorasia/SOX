import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);
    if (!result.success) alert('Sign in failed: ' + result.message);
  };

  const handleSocialAuth = (provider) => {
    window.location.href = `${API_BASE}/api/auth/${provider}`;
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-root">
      <InteractiveBG />
      
      <div className="auth-wrap">
        

        <header className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to access your arena dashboard</p>
        </header>

        <form onSubmit={onSubmit}>
          <div className="auth-input-group">
            <label>Email Address</label>
            <input 
              type="email" name="email" placeholder="name@example.com" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} required 
            />
          </div>
          <div className="auth-input-group">
            <label>Password</label>
            <input 
              type="password" name="password" placeholder="••••••••" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} required 
            />
          </div>
          
          <button type="submit" className="auth-btn-primary">Sign in</button>
        </form>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <div className="social-grid">
          <button className="social-btn" onClick={() => handleSocialAuth('google')}>Google</button>
          <button className="social-btn" onClick={() => handleSocialAuth('apple')}>Apple</button>
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
