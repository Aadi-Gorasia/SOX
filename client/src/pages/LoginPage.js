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
    if (!result.success) alert('AUTH_ERROR: ' + result.message);
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-root crimson-theme">
      <InteractiveBG />
      
      <div className="auth-wrap">
        <header className="auth-v-header">
          <h1 className="Archivo tracking-widest">ACCESS</h1>
          <p className="hp-mono text-crimson">REQUIRED_FOR_UPLINK</p>
        </header>

        <form className="auth-clean-form" onSubmit={onSubmit}>
          <div className="clean-input-group">
            <input 
              type="email" name="email" placeholder="EMAIL_ADDRESS" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} required 
            />
          </div>
          <div className="clean-input-group">
            <input 
              type="password" name="password" placeholder="PASSWORD" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} required 
            />
          </div>
          
          <button type="submit" className="btn-crimson-solid Archivo">AUTHORIZE_SESSION</button>
        </form>

        <div className="auth-divider">
          <span>OR_CONNECT_VIA</span>
        </div>

        <div className="social-grid">
          <button className="social-btn"><i className="fab fa-google"></i> GOOGLE</button>
          <button className="social-btn"><i className="fab fa-apple"></i> APPLE</button>
          <button className="social-btn"><i className="fab fa-facebook"></i> FACEBOOK</button>
        </div>

        <footer className="auth-nav-footer hp-mono">
          UNREGISTERED? <Link to="/register" className="text-crimson">CREATE_IDENTITY</Link>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;