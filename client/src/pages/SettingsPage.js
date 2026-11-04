import React, { useContext, useRef, useState } from 'react';
import axios from 'axios';
import {
  Accessibility,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  LockKeyhole,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Volume2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext, themeVariables } from '../context/ThemeContext';
import { DEFAULT_THEME } from '../themes/themeCatalog';
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

function MiniThemePreview({ theme }) {
  return (
    <div className={`settings-theme-preview settings-theme-preview--${theme.style}`} style={themeVariables(theme)}>
      <div className="settings-theme-preview__nav"><b>SOX</b><span>REVIEW</span></div>
      <div className="settings-theme-preview__body">
        <div className="settings-theme-preview__board">
          {['X', '', 'O', 'O', 'X', '', '', '', 'X'].map((mark, index) => (
            <span className={mark ? `mark-${mark.toLowerCase()}` : ''} key={index}>{mark}</span>
          ))}
        </div>
        <div className="settings-theme-preview__detail">
          <strong>POSITION 04</strong>
          <div className="settings-theme-preview__line" />
          <span>Next move</span>
          <button type="button" tabIndex={-1}>Review</button>
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <label className={`settings-toggle ${disabled ? 'is-disabled' : ''}`}>
      <span className="settings-toggle__copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} disabled={disabled} />
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
    customThemes,
    preferences,
    previewTheme,
    saving,
    saveError,
    clearSaveError,
    beginPreview,
    cancelPreview,
    applyTheme,
    updatePreference,
    resetAppearance,
    setCustomThemes
  } = useContext(ThemeContext);
  const [activeSection, setActiveSection] = useState('appearance');
  const [status, setStatus] = useState('');
  const [customName, setCustomName] = useState('My board');
  const [customColors, setCustomColors] = useState({
    bg: '#141414',
    panel: '#202020',
    text: '#f5f5f5',
    accent: '#c8fb57',
    secondary: '#ff8177',
    line: '#484848',
    x: '#f5f5f5',
    o: '#c8fb57'
  });
  const importRef = useRef(null);

  const savePreference = (key, value) => {
    clearSaveError();
    setStatus('');
    updatePreference(key, value);
  };

  const updateCustomColor = (key, value) => {
    setCustomColors(current => ({ ...current, [key]: value }));
  };

  const createCustomTheme = () => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = {
      id,
      name: customName.trim() || 'My board',
      philosophy: 'A personal game identity.',
      description: 'Built with your own colors and typography.',
      colors: [customColors.bg, customColors.panel, customColors.text, customColors.accent],
      tokens: { ...customColors, card: customColors.panel, muted: customColors.text, secondary: customColors.secondary },
      heading: 'Arial, Helvetica, sans-serif',
      body: 'Arial, Helvetica, sans-serif',
      mono: '"Courier New", monospace',
      style: 'custom'
    };
    setCustomThemes([...customThemes, next], id);
    setStatus('Custom theme created. Apply it from the preview bar to make it permanent.');
  };

  const duplicateTheme = selectedTheme => {
    const copy = {
      ...selectedTheme,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${selectedTheme.name} copy`,
      philosophy: 'A personal variation.',
      tokens: { ...selectedTheme.tokens },
      colors: [...selectedTheme.colors],
      style: 'custom'
    };
    setCustomThemes([...customThemes, copy], copy.id);
  };

  const renameCustomTheme = (id, name) => {
    setCustomThemes(customThemes.map(item => item.id === id ? { ...item, name } : item));
  };

  const deleteCustomTheme = async id => {
    const nextThemes = customThemes.filter(item => item.id !== id);
    const nextTheme = theme === id ? DEFAULT_THEME : theme;
    try {
      if (theme === id) await applyTheme(DEFAULT_THEME);
      if (previewTheme === id) cancelPreview();
      setCustomThemes(nextThemes, null, nextTheme);
      setStatus('Custom theme deleted.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const exportCustomTheme = selectedTheme => {
    const blob = new Blob([JSON.stringify(selectedTheme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTheme.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCustomTheme = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const colorKeys = ['bg', 'panel', 'text', 'accent', 'secondary', 'line', 'x', 'o'];
      if (typeof imported.name !== 'string' || !imported.tokens ||
          colorKeys.some(key => !/^#[0-9a-f]{6}$/i.test(imported.tokens[key] || ''))) {
        throw new Error('Theme file must include a name and valid theme colors.');
      }
      const themeColors = colorKeys.map(key => imported.tokens[key]);
      const next = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: imported.name.slice(0, 40),
        philosophy: 'Imported personal theme.',
        description: 'A theme imported from a SOX configuration file.',
        colors: themeColors,
        tokens: { ...imported.tokens, card: imported.tokens.panel, muted: imported.tokens.text },
        heading: 'Arial, Helvetica, sans-serif',
        body: 'Arial, Helvetica, sans-serif',
        mono: '"Courier New", monospace',
        style: 'custom'
      };
      setCustomThemes([...customThemes, next], next.id);
      setStatus('Theme imported. Preview it, then apply to use it.');
    } catch (error) {
      setStatus(error.message || 'Unable to import that theme file.');
    } finally {
      event.target.value = '';
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
    <>
      <div className="settings-theme-heading">
        <div>
          <span className="settings-kicker">15 EDITORIAL SYSTEMS</span>
          <h2>Choose how the game feels.</h2>
          <p>Each system changes type, surfaces, controls and board character—not just its palette.</p>
        </div>
        <button className="settings-button settings-button--quiet" type="button" onClick={() => resetAppearance().then(() => setStatus('Appearance reset to the default theme.')).catch(error => setStatus(error.message))}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <div className="settings-theme-gallery">
        {themes.map(item => (
          <article className={`settings-theme-card ${theme === item.id ? 'is-current' : ''} ${previewTheme === item.id ? 'is-previewing' : ''}`} key={item.id}>
            <button type="button" className="settings-theme-card__select" onClick={() => beginPreview(item.id)} aria-label={`Preview ${item.name}`}>
              <MiniThemePreview theme={item} />
              <span className="settings-theme-card__meta">
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.philosophy}</small>
                </span>
                {theme === item.id && <span className="settings-theme-card__active"><Check size={13} /> Active</span>}
                {previewTheme === item.id && <span className="settings-theme-card__active">Preview</span>}
              </span>
            </button>
            <div className="settings-theme-card__footer">
              <span className="settings-theme-swatches" aria-label="Theme palette">
                {item.colors.map((color, index) => <i key={`${item.id}-${index}`} style={{ backgroundColor: color }} />)}
              </span>
              <button type="button" onClick={() => duplicateTheme(item)} aria-label={`Duplicate ${item.name}`}>Duplicate</button>
            </div>
          </article>
        ))}
      </div>

      <section className="settings-custom-builder">
        <div className="settings-custom-builder__heading">
          <span className="settings-kicker">MAKE IT YOURS</span>
          <h3>Custom theme builder</h3>
          <p>Save a personal color system. Presets remain unchanged.</p>
        </div>
        <div className="settings-custom-builder__controls">
          <label className="settings-field">
            <span>Theme name</span>
            <input maxLength="40" value={customName} onChange={event => setCustomName(event.target.value)} />
          </label>
          {[
            ['bg', 'Background'],
            ['panel', 'Surface'],
            ['text', 'Text'],
            ['accent', 'Accent'],
            ['secondary', 'Secondary'],
            ['line', 'Grid / border'],
            ['x', 'X mark'],
            ['o', 'O mark']
          ].map(([key, label]) => (
            <label className="settings-color-field" key={key}>
              <input type="color" value={customColors[key]} onChange={event => updateCustomColor(key, event.target.value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="settings-custom-builder__actions">
          <div className="settings-custom-mini" style={{ backgroundColor: customColors.bg, color: customColors.text, borderColor: customColors.line }}>
            <span style={{ borderColor: customColors.line, color: customColors.x }}>X</span>
            <span style={{ borderColor: customColors.line, color: customColors.o }}>O</span>
            <b style={{ color: customColors.accent }}>SOX · NEXT MOVE</b>
          </div>
          <button className="settings-button" type="button" onClick={createCustomTheme}>Create & preview</button>
        </div>
        <div className="settings-custom-list">
          {customThemes.map(item => (
            <div className="settings-custom-row" key={item.id}>
              <input
                aria-label="Custom theme name"
                defaultValue={item.name}
                maxLength="40"
                onBlur={event => {
                  const name = event.target.value.trim();
                  if (name) renameCustomTheme(item.id, name);
                  else event.target.value = item.name;
                }}
              />
              <button type="button" onClick={() => beginPreview(item.id)}>Preview</button>
              <button type="button" onClick={() => exportCustomTheme(item)}>Export</button>
              <button type="button" onClick={() => deleteCustomTheme(item.id)}>Delete</button>
            </div>
          ))}
          <button className="settings-button settings-button--quiet" type="button" onClick={() => importRef.current?.click()}>Import theme file</button>
          <input ref={importRef} className="settings-visually-hidden" type="file" accept="application/json,.json" onChange={importCustomTheme} />
        </div>
      </section>
    </>
  );

  const renderPanel = () => {
    switch (activeSection) {
      case 'general':
        return (
          <SettingsSection title="General" description="Set the defaults that shape your next session.">
            <SelectPreference label="Default landing page" value={preferences.landingPage} onChange={value => savePreference('landingPage', value)} options={[{ value: 'dashboard', label: 'Dashboard' }, { value: 'play', label: 'Play' }, { value: 'history', label: 'Match history' }]} />
            <SelectPreference label="Interface density" value={preferences.density} onChange={value => savePreference('density', value)} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
            <PreferenceToggle label="Reduce motion" description="Use reduced motion throughout the interface." checked={preferences.reducedMotion} onChange={value => savePreference('reducedMotion', value)} />
            <PreferenceToggle label="Background animation" description="Allow animated background details where supported." checked={preferences.backgroundAnimations} onChange={value => savePreference('backgroundAnimations', value)} />
            <p className="settings-note">Language: English. Additional translations are not currently available.</p>
          </SettingsSection>
        );
      case 'appearance':
        return <SettingsSection className="settings-appearance" title="Appearance" description="A visual system changes the board, navigation, typography and controls together.">{renderThemes()}</SettingsSection>;
      case 'gameplay':
        return (
          <SettingsSection title="Gameplay" description="Choose board feedback and how new matches begin.">
            <SelectPreference label="Preferred game mode" description="Highlights this option on the Play page; you can still choose either mode." value={preferences.defaultGameMode} onChange={value => savePreference('defaultGameMode', value)} options={[{ value: 'online', label: 'Ranked matchmaking' }, { value: 'private', label: 'Play a friend' }]} />
            <PreferenceToggle label="Victory animation" checked={preferences.victoryAnimation} onChange={value => savePreference('victoryAnimation', value)} />
            <p className="settings-note">Move highlighting and confirmation controls are not available in the current board interface.</p>
          </SettingsSection>
        );
      case 'audio':
        return (
          <SettingsSection title="Audio" description="Audio options will appear when the game includes audio playback.">
            <p className="settings-note">The current application has no sound effects or background music, so there are no audio controls to configure yet.</p>
          </SettingsSection>
        );
      case 'accessibility':
        return (
          <SettingsSection title="Accessibility" description="Improve contrast, readability and keyboard access.">
            <PreferenceToggle label="High contrast" checked={preferences.highContrast} onChange={value => savePreference('highContrast', value)} />
            <PreferenceToggle label="Larger text" checked={preferences.largerText} onChange={value => savePreference('largerText', value)} />
            <PreferenceToggle label="Reduced motion" checked={preferences.reducedMotion} onChange={value => savePreference('reducedMotion', value)} />
            <p className="settings-note">Board cells and controls retain their native keyboard and screen-reader behavior.</p>
          </SettingsSection>
        );
      case 'notifications':
        return (
          <SettingsSection title="Notifications" description="Notification controls will be available when notification delivery is supported.">
            <p className="settings-note">The current application does not send browser push or configurable in-app notifications.</p>
          </SettingsSection>
        );
      case 'privacy':
        return (
          <>
            <SettingsSection title="Privacy" description="The current application does not expose profile or online-status privacy controls.">
              <p className="settings-note">Public profiles and match history are currently visible to visitors. Do not share information you want to keep private.</p>
            </SettingsSection>
            <SettingsSection title="Account" description="Identity and sign-in controls.">
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
            <div className="settings-about-row"><span>Current theme</span><strong>{themes.find(item => item.id === theme)?.name || 'Custom theme'}</strong></div>
            <div className="settings-about-row"><span>Changelog</span><strong>Settings and theme system update</strong></div>
            <div className="settings-about-row"><span>Credits</span><strong>SOX project contributors</strong></div>
            <p className="settings-note">Privacy and legal documents are not published in the current application.</p>
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
        <p>Shape the way you see and play the board.</p>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button type="button" className={activeSection === id ? 'is-active' : ''} key={id} onClick={() => setActiveSection(id)}>
              <Icon size={16} /><span>{label}</span>{activeSection === id && <ChevronRight size={14} />}
            </button>
          ))}
          <div className="settings-nav__account">{user?.username || 'Guest account'}<span>{saving ? 'Saving…' : 'Preferences sync automatically'}</span></div>
        </nav>
        <div className={`settings-content settings-content--${activeSection}`}>
          {renderPanel()}
          {(saveError || status) && <p className={`settings-feedback ${saveError ? 'is-error' : ''}`} role="status">{saveError || status}</p>}
        </div>
      </div>
    </main>
  );
}

function SettingsSection({ title, description, children, className = '' }) {
  return (
    <section className={`settings-section ${className}`}>
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
