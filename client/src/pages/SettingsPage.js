import React, { useContext, useState } from 'react';
import axios from 'axios';
import {
  Accessibility,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  LockKeyhole,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Volume2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import './SettingsPage.css';

const SECTIONS = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'gameplay', label: 'Gameplay', icon: Gamepad2 },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & account', icon: LockKeyhole },
  { id: 'about', label: 'About', icon: CircleHelp }
];

function PreferenceToggle({ label, description, checked, onChange }) {
  return (
    <label className="settings-toggle">
      <span className="settings-toggle__copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} />
      <span className="settings-toggle__switch" aria-hidden="true" />
    </label>
  );
}

function SelectPreference({ label, value, options, onChange, description }) {
  return (
    <label className="settings-select">
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function SettingsPage() {
  const { user, token, logout } = useContext(AuthContext);
  const {
    theme,
    themes,
    preferences,
    saving,
    saveError,
    clearSaveError,
    applyTheme,
    updatePreference,
    resetAppearance
  } = useContext(ThemeContext);
  const [activeSection, setActiveSection] = useState('appearance');
  const [status, setStatus] = useState('');

  const savePreference = (key, value) => {
    clearSaveError();
    setStatus('');
    updatePreference(key, value);
  };

  const chooseTheme = async id => {
    setStatus('');
    try {
      await applyTheme(id);
      setStatus(`The ${id} theme is now active.`);
    } catch (error) {
      setStatus(`Theme applied on this device, but account sync failed: ${error.message}`);
    }
  };

  const resetTheme = async () => {
    setStatus('');
    try {
      await resetAppearance();
      setStatus('Appearance reset to the Light theme.');
    } catch (error) {
      setStatus(`Appearance reset on this device, but account sync failed: ${error.message}`);
    }
  };

  const saveIdentity = async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = { username: formData.get('username') };
    const password = formData.get('password');
    if (password) body.password = password;
    try {
      await axios.put('/api/users/update-identity', body, {
        headers: { 'x-auth-token': token }
      });
      setStatus('Account details saved.');
    } catch (error) {
      setStatus(error.response?.data?.msg || 'Unable to save account details.');
    }
  };

  const renderThemes = () => (
    <section className="settings-section settings-theme-section">
      <header className="settings-section__heading">
        <span className="settings-kicker">TWO THEMES</span>
        <h2>Choose your board.</h2>
        <p>One consistent interface, in Light or Dark. Select a theme to apply it immediately.</p>
      </header>
      <div className="settings-theme-gallery">
        {themes.map(item => {
          const isActive = theme === item.id;
          const ThemeIcon = item.id === 'dark' ? Moon : Sun;
          const previewStyles = {
            '--preview-bg': item.tokens.bg,
            '--preview-surface': item.tokens.panel,
            '--preview-card': item.tokens.card,
            '--preview-text': item.tokens.text,
            '--preview-muted': item.tokens.muted,
            '--preview-accent': item.tokens.accent,
            '--preview-line': item.tokens.line,
            '--preview-x': item.tokens.x,
            '--preview-o': item.tokens.o
          };
          return (
            <article
              className={`settings-theme-card settings-theme-card--${item.id} ${isActive ? 'is-current' : ''}`}
              style={previewStyles}
              key={item.id}
            >
              <div
                className="settings-theme-card__preview"
                aria-hidden="true"
              >
                <div className="settings-theme-preview__top">
                  <span className="settings-theme-preview__logo">SOX</span>
                  <span className="settings-theme-preview__tag">GAME REVIEW</span>
                </div>
                <div className="settings-theme-preview__content">
                  <div className="settings-theme-preview__board">
                    {['X', '', 'O', '', 'X', '', 'O', '', ''].map((mark, index) => (
                      <span className={mark ? `mark-${mark.toLowerCase()}` : ''} key={index}>{mark}</span>
                    ))}
                  </div>
                  <div className="settings-theme-preview__panel">
                    <i />
                    <i />
                    <b>YOUR MOVE</b>
                    <span />
                  </div>
                </div>
              </div>
              <div className="settings-theme-card__details">
                <div className="settings-theme-card__title">
                  <span className="settings-theme-card__icon"><ThemeIcon size={17} /></span>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`settings-button ${isActive ? 'settings-button--current' : ''}`}
                  onClick={() => chooseTheme(item.id)}
                  disabled={isActive || saving}
                  aria-pressed={isActive}
                >
                  {isActive ? <><Check size={15} /> Current theme</> : `Use ${item.name}`}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <button className="settings-button settings-button--quiet" type="button" onClick={resetTheme} disabled={saving}>
        <RotateCcw size={14} /> Reset appearance
      </button>
    </section>
  );

  const renderPanel = () => {
    switch (activeSection) {
      case 'general':
        return (
          <SettingsSection title="General" description="Set defaults that shape your next session.">
            <SelectPreference label="Default landing page" value={preferences.landingPage} onChange={value => savePreference('landingPage', value)} options={[{ value: 'dashboard', label: 'Dashboard' }, { value: 'play', label: 'Play' }, { value: 'history', label: 'Match history' }]} />
            <SelectPreference label="Interface density" value={preferences.density} onChange={value => savePreference('density', value)} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
            <PreferenceToggle label="Reduce motion" description="Reduce movement and transitions across the interface." checked={preferences.reducedMotion} onChange={value => savePreference('reducedMotion', value)} />
            <PreferenceToggle label="Background animation" description="Show the interactive background pattern." checked={preferences.backgroundAnimations} onChange={value => savePreference('backgroundAnimations', value)} />
            <p className="settings-note">Language: English. Additional translations are not currently available.</p>
          </SettingsSection>
        );
      case 'appearance':
        return renderThemes();
      case 'gameplay':
        return (
          <SettingsSection title="Gameplay" description="Choose board feedback and how new matches begin.">
            <SelectPreference label="Preferred game mode" description="Marks this choice on the Play page; both modes remain available." value={preferences.defaultGameMode} onChange={value => savePreference('defaultGameMode', value)} options={[{ value: 'online', label: 'Ranked matchmaking' }, { value: 'private', label: 'Play a friend' }]} />
            <PreferenceToggle label="Victory animation" checked={preferences.victoryAnimation} onChange={value => savePreference('victoryAnimation', value)} />
            <p className="settings-note">Move highlighting and confirmation controls are not available in the current board interface.</p>
          </SettingsSection>
        );
      case 'audio':
        return (
          <SettingsSection title="Audio" description="Audio options will appear when the game includes audio playback.">
            <p className="settings-note">The current application has no sound effects or background music.</p>
          </SettingsSection>
        );
      case 'accessibility':
        return (
          <SettingsSection title="Accessibility" description="Improve contrast, readability and motion comfort.">
            <PreferenceToggle label="High contrast" checked={preferences.highContrast} onChange={value => savePreference('highContrast', value)} />
            <PreferenceToggle label="Larger text" checked={preferences.largerText} onChange={value => savePreference('largerText', value)} />
            <PreferenceToggle label="Reduced motion" checked={preferences.reducedMotion} onChange={value => savePreference('reducedMotion', value)} />
          </SettingsSection>
        );
      case 'notifications':
        return (
          <SettingsSection title="Notifications" description="Notification controls will be available when delivery is supported.">
            <p className="settings-note">The current application does not send browser push or configurable in-app notifications.</p>
          </SettingsSection>
        );
      case 'privacy':
        return (
          <>
            <SettingsSection title="Privacy" description="The current application does not expose profile or online-status privacy controls.">
              <p className="settings-note">Public profiles and match history are currently visible to visitors.</p>
            </SettingsSection>
            <SettingsSection title="Account" description="Manage your account identity and sign-in.">
              <form className="settings-identity-form" onSubmit={saveIdentity}>
                <label className="settings-field"><span>Username</span><input name="username" defaultValue={user?.username || ''} minLength="3" required /></label>
                <label className="settings-field"><span>New password</span><input name="password" type="password" minLength="6" placeholder="Leave blank to keep current" /></label>
                <p className="settings-note">Member since {user?.date ? new Date(user.date).toLocaleDateString() : '—'}</p>
                <button className="settings-button" type="submit">Save account</button>
              </form>
              <button className="settings-button settings-button--danger" type="button" onClick={logout}>Sign out</button>
            </SettingsSection>
          </>
        );
      case 'about':
        return (
          <SettingsSection title="About SOX" description="A strategy game built around one board that sends you to another.">
            <div className="settings-about-row"><span>Application version</span><strong>{process.env.REACT_APP_VERSION || '1.0.0'}</strong></div>
            <div className="settings-about-row"><span>Current theme</span><strong>{themes.find(item => item.id === theme)?.name || 'Light'}</strong></div>
            <div className="settings-about-row"><span>Changelog</span><strong>Theme settings update</strong></div>
          </SettingsSection>
        );
      default:
        return null;
    }
  };

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <span className="settings-kicker">SOX / PREFERENCES</span>
        <h1>Settings</h1>
        <p>Make the game comfortable to see and play.</p>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button type="button" className={activeSection === id ? 'is-active' : ''} key={id} onClick={() => setActiveSection(id)}>
              <Icon size={16} /><span>{label}</span>{activeSection === id && <ChevronRight size={14} />}
            </button>
          ))}
          <div className="settings-nav__account">{user?.username || 'Guest account'}<span>{saving ? 'Saving…' : 'Settings sync automatically'}</span></div>
        </nav>
        <div className={`settings-content settings-content--${activeSection}`}>
          {renderPanel()}
          {(saveError || status) && <p className={`settings-feedback ${saveError && !status ? 'is-error' : ''}`} role="status">{status || saveError}</p>}
        </div>
      </div>
    </main>
  );
}

function SettingsSection({ title, description, children }) {
  return (
    <section className="settings-section">
      <header className="settings-section__heading">
        <span className="settings-kicker">PREFERENCES</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

export default SettingsPage;
