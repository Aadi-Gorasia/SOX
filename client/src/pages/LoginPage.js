import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);
    if (!result.success) alert('AUTH_FAILURE: ' + result.message);
  };

  const handleSocialAuth = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/${provider}`;
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-root crimson-minimal">
      <InteractiveBG />
      
      <div className="auth-wrap">
        <header className="auth-v-header">
          <h1 className="Archivo tracking-extreme">ACCESS</h1>
          <p className="hp-mono text-crimson">REQUIRED_FOR_UPLINK</p>
        </header>

        <form className="auth-clean-form" onSubmit={onSubmit}>
          <div className="clean-input-group">
            <label className="hp-mono">UPLINK_EMAIL</label>
            <input 
              type="email" name="email" placeholder="ENTER_EMAIL" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} required 
            />
          </div>
          <div className="clean-input-group">
            <label className="hp-mono">ACCESS_KEY</label>
            <input 
              type="password" name="password" placeholder="ENTER_PASSWORD" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} required 
            />
          </div>
          
          <button type="submit" className="btn-crimson-solid Archivo">AUTHORIZE_SESSION</button>
        </form>

        <div className="auth-divider">
          <span className="hp-mono">OR_CONNECT_VIA</span>
        </div>

        <div className="social-grid">
          <button className="social-node" onClick={() => handleSocialAuth('google')}>GOOGLE</button>
          <button className="social-node" onClick={() => handleSocialAuth('apple')}>APPLE</button>
          <button className="social-node" onClick={() => handleSocialAuth('facebook')}>FACEBOOK</button>
        </div>

        <footer className="auth-nav-footer hp-mono">
          NO_IDENTITY? <Link to="/register" className="text-crimson">[ ENROLL_OPERATIVE ]</Link>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;