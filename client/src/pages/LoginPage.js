// client/src/pages/LoginPage.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './AuthPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { email, password } = formData;
  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await login({ email, password });
    if (!result.success) { alert('Error: ' + result.message); }
  };

  useEffect(() => {
    if (isAuthenticated) { navigate('/dashboard'); }
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Welcome Back</h2>
        <div className="form-group"><label>Email</label><input type="email" name="email" value={email} onChange={onChange} required /></div>
        <div className="form-group"><label>Password</label><input type="password" name="password" value={password} onChange={onChange} required /></div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};
export default LoginPage;