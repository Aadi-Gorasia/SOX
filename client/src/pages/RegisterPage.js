// client/src/pages/RegisterPage.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import './AuthPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const { username, email, password } = formData;
  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      // We need to get the token back from the register route
      const res = await axios.post('http://localhost:5000/api/users/register', formData);
      // Immediately log in using the same credentials (or token)
      // Since our register now returns a token, we can use a different login flow
      if (res.data.token) {
        await login({ email, password }); // This triggers the context update
      }
    } catch (err) {
      alert('Error: ' + (err.response ? err.response.data.msg : 'Cannot connect to server'));
    }
  };
      
  useEffect(() => {
    if (isAuthenticated) { navigate('/dashboard'); }
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Create Your Account</h2>
        <div className="form-group"><label>Username</label><input type="text" name="username" value={username} onChange={onChange} required /></div>
        <div className="form-group"><label>Email</label><input type="email" name="email" value={email} onChange={onChange} required /></div>
        <div className="form-group"><label>Password</label><input type="password" name="password" value={password} onChange={onChange} minLength="6" required /></div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
};
export default RegisterPage;