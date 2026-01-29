import React, { useContext, useState } from 'react';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import './SettingsPage.css';

const THEME_PRESETS = [
  { id: 'arcade', name: 'Arcade Classic', color: '#7b2cbf' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', color: '#fcee0a' },
  { id: 'glass', name: 'Frost Glass', color: '#a2d2ff' },
  { id: 'wood', name: 'Royal Oak', color: '#8d6e63' },
  { id: 'vaporwave', name: 'Vaporwave', color: '#ff71ce' },
  { id: 'midnight', name: 'Midnight Ops', color: '#111' },
  { id: 'terminal', name: 'Hacker Terminal', color: '#0f0' },
  { id: 'paper', name: 'Sketchbook', color: '#f5f5f5' },
  { id: 'sunset', name: 'Miami Sunset', color: '#ff9f43' },
  { id: 'ocean', name: 'Deep Blue', color: '#0984e3' },
  { id: 'forest', name: 'Elven Forest', color: '#00b894' },
  { id: 'concrete', name: 'Brutalism', color: '#636e72' },
  { id: 'candy', name: 'Cotton Candy', color: '#fd79a8' },
  { id: 'blueprint', name: 'Architect', color: '#0984e3' },
  { id: 'royal', name: 'Imperial Gold', color: '#fdcb6e' },
];

const SettingsPage = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  
  const [activeTab, setActiveTab] = useState('visuals');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [status, setStatus] = useState({ type: '', msg: '' });

  const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/users/update-profile', { username: formData.username });
      setStatus({ type: 'success', msg: 'Identity Re-written Successfully.' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Update Failed.' });
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return setStatus({ type: 'error', msg: 'Passwords do not match.' });
    }
    try {
      await axios.put('/api/users/change-password', { 
        oldPass: formData.currentPassword, 
        newPass: formData.newPassword 
      });
      setStatus({ type: 'success', msg: 'Security Credentials Updated.' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Incorrect Current Password.' });
    }
  };

  const deleteAccount = async () => {
    if (window.confirm("WARNING: THIS ACTION IS IRREVERSIBLE. DELETE ACCOUNT?")) {
      try {
        await axios.delete('/api/users/delete-account');
        logout();
      } catch (err) {
        setStatus({ type: 'error', msg: 'Deletion Failed.' });
      }
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-layout">
        
        {/* SIDEBAR TABS */}
        <aside className="settings-sidebar">
          <h2 className="settings-title">SYSTEM CONFIG</h2>
          <nav className="settings-nav">
            <button 
              className={activeTab === 'visuals' ? 'active' : ''} 
              onClick={() => setActiveTab('visuals')}
            >
              VISUAL_INTERFACE
            </button>
            <button 
              className={activeTab === 'account' ? 'active' : ''} 
              onClick={() => setActiveTab('account')}
            >
              USER_IDENTITY
            </button>
            <button 
              className={activeTab === 'security' ? 'active' : ''} 
              onClick={() => setActiveTab('security')}
            >
              SECURITY_PROTOCOLS
            </button>
            <button 
              className={`danger-tab ${activeTab === 'danger' ? 'active' : ''}`} 
              onClick={() => setActiveTab('danger')}
            >
              ZONE_ZERO
            </button>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="settings-content">
          {status.msg && (
            <div className={`status-banner ${status.type}`}>
              {status.msg}
            </div>
          )}

          {/* TAB: VISUALS */}
          {activeTab === 'visuals' && (
            <div className="tab-pane fade-in">
              <div className="pane-header">
                <h3>GLOBAL_THEME_SELECT</h3>
                <p>Select a neural interface skin. Changes apply system-wide.</p>
              </div>
              <div className="theme-grid">
                {THEME_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-card ${theme === t.id ? 'selected' : ''}`}
                    onClick={() => setTheme(t.id)}
                    style={{ '--preview-color': t.color }}
                  >
                    <div className="theme-preview"></div>
                    <div className="theme-name">{t.name}</div>
                    {theme === t.id && <div className="active-dot"></div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="tab-pane fade-in">
              <div className="pane-header">
                <h3>IDENTITY_MANAGEMENT</h3>
                <p>Update public facing credentials.</p>
              </div>
              <form onSubmit={updateProfile} className="cyber-form">
                <div className="form-group">
                  <label>CODENAME (USERNAME)</label>
                  <input 
                    type="text" 
                    name="username" 
                    value={formData.username} 
                    onChange={handleInput} 
                  />
                </div>
                <div className="form-group">
                  <label>USER_ID (READ ONLY)</label>
                  <input type="text" value={user._id} disabled className="disabled-input" />
                </div>
                <button type="submit" className="action-btn">OVERWRITE DATA</button>
              </form>
            </div>
          )}

          {/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <div className="tab-pane fade-in">
              <div className="pane-header">
                <h3>ENCRYPTION_KEYS</h3>
                <p>Rotate access tokens periodically.</p>
              </div>
              <form onSubmit={updatePassword} className="cyber-form">
                <div className="form-group">
                  <label>CURRENT_KEY</label>
                  <input type="password" name="currentPassword" onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>NEW_KEY</label>
                  <input type="password" name="newPassword" onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>CONFIRM_NEW_KEY</label>
                  <input type="password" name="confirmPassword" onChange={handleInput} />
                </div>
                <button type="submit" className="action-btn">UPDATE CREDENTIALS</button>
              </form>
            </div>
          )}

          {/* TAB: DANGER */}
          {activeTab === 'danger' && (
            <div className="tab-pane fade-in">
              <div className="pane-header danger">
                <h3>DANGER ZONE</h3>
                <p>Irreversible actions.</p>
              </div>
              <div className="danger-box">
                <div className="danger-info">
                  <h4>TERMINATE ACCOUNT</h4>
                  <p>This will wipe all ELO history, match logs, and profile data from the server mainframe.</p>
                </div>
                <button onClick={deleteAccount} className="delete-btn">
                  INITIATE DELETE
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;