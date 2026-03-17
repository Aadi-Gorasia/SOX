import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import './SettingsPage.css';

const SettingsPage = () => {
  const [formData, setFormData] = useState({ username: user.username, password: '' });
  const [activeTheme, setActiveTheme] = useState(document.documentElement.getAttribute('data-theme'));

  const handleUpdateIdentity = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/users/update-identity', formData);
      alert("Identity Updated.");
    } catch (err) { alert(err.response.data.msg); }
  };

  const changeTheme = (themeName) => {
    setActiveTheme(themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
  };

  return (
    <div className="settings-tonal-container theme-fade-in">
      <div className="settings-sidebar">
        <h2>Identity</h2>
        <p>Managed since {new Date(user.date).getFullYear()}</p>
      </div>

      <div className="settings-main-flow">
        {/* Security Section */}
        <section className="settings-section">
          <label className="tonal-label">ACCOUNT SECURITY</label>
          <form onSubmit={handleUpdateIdentity} className="tonal-form">
            <div className="input-group">
              <input 
                type="text" 
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Username" 
              />
              <span className="cooldown-hint">Last changed: {user.lastUsernameChange ? new Date(user.lastUsernameChange).toLocaleDateString() : 'Never'}</span>
            </div>
            <input 
              type="password" 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="New Password (Optional)" 
            />
            <button type="submit" className="tonal-btn">Save Identity</button>
          </form>
        </section>

        {/* Global Aesthetics Section */}
        <section className="settings-section">
          <label className="tonal-label">GLOBAL AESTHETICS</label>
          <div className="theme-grid-tonal">
            <div 
              className={`theme-card ${activeTheme === 'imperial-nocturne' ? 'selected' : ''}`}
              onClick={() => changeTheme('imperial-nocturne')}
            >
              <div className="theme-preview nocturne"></div>
              <span>Imperial Nocturne</span>
            </div>
            <div 
              className={`theme-card ${activeTheme === 'celestial-marble' ? 'selected' : ''}`}
              onClick={() => changeTheme('celestial-marble')}
            >
              <div className="theme-preview marble"></div>
              <span>Celestial Marble</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;