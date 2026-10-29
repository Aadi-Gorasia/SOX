import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const[isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/users/register`, formData);
      setIsVerifying(true);
    } catch (err) {
      alert('Registration error: ' + (err.response?.data?.msg || 'Failed to create account'));
    }
  };

  const handleSocialAuth = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/${provider}`;
  };

  if (isVerifying) {
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
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle" style={{ lineHeight: '1.6' }}>
              We've sent a secure verification link to <br/>
              <strong className="text-accent">{formData.email}</strong>
            </p>
          </header>

          <button className="auth-btn-outline" onClick={() => navigate('/login')}>
            Return to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root">
        <br />
        <br />
      <InteractiveBG />
      
      <div className="auth-wrap">
        

        <header className="auth-header">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join the arena and start climbing the ranks</p>
        </header>

        <form onSubmit={onSubmit}>
          <div className="auth-input-group">
            <label>Username</label>
            <input 
              type="text" name="username" placeholder="Choose an alias" 
              onChange={(e) => setFormData({...formData, username: e.target.value})} required 
            />
          </div>
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
              type="password" name="password" placeholder="Min. 6 characters" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} required 
            />
          </div>
          <button type="submit" className="auth-btn-primary">Create account</button>
        </form>

        <div className="auth-divider">
          <span>Or sign up with</span>
        </div>

        <div className="social-grid">
          <button className="social-btn" onClick={() => handleSocialAuth('google')}>Google</button>
          <button className="social-btn" onClick={() => handleSocialAuth('apple')}>Apple</button>
          <button className="social-btn" onClick={() => handleSocialAuth('facebook')}>Facebook</button>
        </div>

        <footer className="auth-footer">
          Already have an account? 
          <Link to="/login">Sign in</Link>
        </footer>
      </div>
    </div>
  );
};

export default RegisterPage;