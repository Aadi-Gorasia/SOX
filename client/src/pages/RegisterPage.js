import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import InteractiveBG from '../components/InteractiveBG';
import './AuthPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/users/register`, formData);
      setIsVerifying(true);
    } catch (err) {
      alert('ENROLLMENT_ERROR: ' + (err.response?.data?.msg || 'UPLINK_FAILED'));
    }
  };

  if (isVerifying) {
    return (
      <div className="auth-root crimson-minimal">
        <InteractiveBG />
        <div className="auth-wrap text-center">
          <h1 className="Archivo text-crimson tracking-widest">VERIFICATION_SENT</h1>
          <p className="hp-mono text-titanium mt-4 mb-8">SECURE_LINK_FORWARDED_TO: <br/>{formData.email}</p>
          <button className="btn-crimson-outline hp-mono" onClick={() => navigate('/login')}>RETURN_TO_ACCESS</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root crimson-minimal">
      <InteractiveBG />
      <div className="auth-wrap">
        <header className="auth-v-header">
          <h1 className="Archivo tracking-extreme">ENROLL</h1>
          <p className="hp-mono text-crimson">INITIALIZE_NEW_IDENTITY</p>
        </header>

        <form className="auth-clean-form" onSubmit={onSubmit}>
          <div className="clean-input-group">
            <label className="hp-mono">ALIAS</label>
            <input type="text" name="username" placeholder="OPERATIVE_NAME" onChange={(e) => setFormData({...formData, username: e.target.value})} required />
          </div>
          <div className="clean-input-group">
            <label className="hp-mono">UPLINK_EMAIL</label>
            <input type="email" name="email" placeholder="EMAIL_ADDRESS" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="clean-input-group">
            <label className="hp-mono">SECURE_KEY</label>
            <input type="password" name="password" placeholder="6+ CHARACTERS" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>
          <button type="submit" className="btn-crimson-solid Archivo">INITIALIZE_ACCOUNT</button>
        </form>

        <div className="auth-divider"><span className="hp-mono">SOCIAL_UPLINK</span></div>

        <div className="social-grid">
          <button className="social-node" onClick={() => navigate('/auth/google')}>GOOGLE</button>
          <button className="social-node" onClick={() => navigate('/auth/apple')}>APPLE</button>
        </div>

        <footer className="auth-nav-footer hp-mono">
          VALID_ID_EXISTS? <Link to="/login" className="text-crimson">[ ACCESS_TERMINAL ]</Link>
        </footer>
      </div>
    </div>
  );
};

export default RegisterPage;