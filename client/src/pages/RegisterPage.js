import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      // Your backend should handle sending the verification email here
      await axios.post(`${process.env.REACT_APP_API_URL}/api/users/register`, formData);
      setIsVerifying(true);
    } catch (err) {
      alert('REGISTRATION_FAILED: ' + (err.response?.data?.msg || 'SERVER_ERROR'));
    }
  };

  if (isVerifying) {
    return (
      <div className="auth-root crimson-theme">
        <InteractiveBG />
        <div className="auth-wrap text-center">
          <h1 className="Archivo text-crimson text-4xl mb-4">VERIFICATION_SENT</h1>
          <p className="hp-mono text-titanium mb-8">WE HAVE SENT A SECURE LINK TO: <br/>{formData.email}</p>
          <button className="btn-crimson-outline hp-mono" onClick={() => navigate('/login')}>RETURN_TO_LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root crimson-theme">
      <InteractiveBG />
      <div className="auth-wrap">
        <header className="auth-v-header">
          <h1 className="Archivo tracking-widest">ENROLL</h1>
          <p className="hp-mono text-crimson">NEW_OPERATIVE_ENROLLMENT</p>
        </header>

        <form className="auth-clean-form" onSubmit={onSubmit}>
          <div className="clean-input-group">
            <input type="text" name="username" placeholder="OPERATIVE_ALIAS" onChange={(e) => setFormData({...formData, username: e.target.value})} required />
          </div>
          <div className="clean-input-group">
            <input type="email" name="email" placeholder="EMAIL_ADDRESS" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="clean-input-group">
            <input type="password" name="password" placeholder="SECURE_PASSWORD" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>
          <button type="submit" className="btn-crimson-solid Archivo">INITIALIZE_ACCOUNT</button>
        </form>

        <div className="auth-divider"><span>SOCIAL_ENROLLMENT</span></div>

        <div className="social-grid">
          <button className="social-btn">GOOGLE</button>
          <button className="social-btn">APPLE</button>
        </div>

        <footer className="auth-nav-footer hp-mono">
          EXISTING_ID? <Link to="/login" className="text-crimson">LOGIN_HERE</Link>
        </footer>
      </div>
    </div>
  );
};

export default RegisterPage;