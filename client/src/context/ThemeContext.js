import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { DEFAULT_PREFERENCES, DEFAULT_THEME, THEME_BY_ID } from '../themes/themeCatalog';

export const ThemeContext = createContext(null);

function readJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

function themeVariables(theme, preferences = {}) {
  const highContrast = Boolean(preferences.highContrast);
  return {
    '--bg': theme.tokens.bg,
    '--void': theme.tokens.bg,
    '--bg-app': theme.tokens.bg,
    '--surface': theme.tokens.panel,
    '--card': theme.tokens.card,
    '--text': theme.tokens.text,
    '--text-1': theme.tokens.text,
    '--text-2': highContrast ? theme.tokens.text : theme.tokens.muted,
    '--text-3': highContrast ? theme.tokens.text : theme.tokens.muted,
    '--silver': highContrast ? theme.tokens.text : theme.tokens.muted,
    '--accent': theme.tokens.accent,
    '--accent-d': theme.tokens.accent,
    '--sulfur': theme.tokens.accent,
    '--crimson': theme.tokens.secondary,
    '--red': theme.tokens.secondary,
    '--border': highContrast ? theme.tokens.text : theme.tokens.line,
    '--border-s': highContrast ? theme.tokens.text : theme.tokens.line,
    '--color-background': theme.tokens.bg,
    '--color-surface': theme.tokens.panel,
    '--color-primary': theme.tokens.accent,
    '--color-secondary': theme.tokens.secondary,
    '--color-text-primary': theme.tokens.text,
    '--color-text-secondary': highContrast ? theme.tokens.text : theme.tokens.muted,
    '--color-border': highContrast ? theme.tokens.text : theme.tokens.line,
    '--color-x': theme.tokens.x,
    '--color-o': theme.tokens.o,
    '--font-heading': theme.heading,
    '--font-display': theme.heading,
    '--font-body': theme.body,
    '--font-main': theme.body,
    '--font-mono': theme.mono,
    '--radius-card': theme.style === 'brutal' || theme.style === 'mac' || theme.style === 'draft' ? '0px' : '4px',
    '--radius-button': theme.style === 'brutal' || theme.style === 'mac' ? '0px' : '3px',
    '--shadow-card': theme.style === 'brutal' ? '5px 5px 0 #111' : 'none'
  };
}

function setThemeOnDocument(theme, themeId, preferences) {
  if (!theme) return;
  const root = document.documentElement;
  root.dataset.theme = theme.style === 'custom' ? 'custom' : themeId;
  root.dataset.themeStyle = theme.style || 'custom';
  Object.entries(themeVariables(theme, preferences)).forEach(([key, value]) => root.style.setProperty(key, value));
}

export function ThemeProvider({ children }) {
  const { token, user } = useContext(AuthContext);
  const [activeThemeId, setActiveThemeId] = useState(() => {
    const id = localStorage.getItem('site-theme') || DEFAULT_THEME;
    return THEME_BY_ID[id] || id.startsWith('custom-') ? id : DEFAULT_THEME;
  });
  const [previewThemeId, setPreviewThemeId] = useState(null);
  const [preferences, setPreferences] = useState(() => readJson('site-preferences', DEFAULT_PREFERENCES));
  const [customThemes, setCustomThemes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('site-custom-themes') || '[]');
    } catch {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const allThemes = useMemo(() => [
    ...Object.values(THEME_BY_ID),
    ...customThemes
  ], [customThemes]);
  const activeTheme = allThemes.find(theme => theme.id === activeThemeId) || THEME_BY_ID[DEFAULT_THEME];
  const displayedThemeId = previewThemeId || activeThemeId;
  const displayedTheme = allThemes.find(theme => theme.id === displayedThemeId) || activeTheme;

  useEffect(() => {
    setThemeOnDocument(displayedTheme, displayedThemeId === 'custom' ? 'custom' : displayedThemeId, preferences);
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'full';
    document.documentElement.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
    document.documentElement.dataset.density = preferences.density;
    document.documentElement.dataset.largerText = preferences.largerText ? 'true' : 'false';
    document.documentElement.dataset.backgroundAnimation = preferences.backgroundAnimations ? 'enabled' : 'disabled';
    document.documentElement.dataset.victoryAnimation = preferences.victoryAnimation ? 'enabled' : 'disabled';
  }, [displayedTheme, displayedThemeId, preferences]);

  useEffect(() => {
    if (!token) return;
    const savedTheme = user?.themePreference;
    if (user?.preferences && typeof user.preferences === 'object') {
      const next = { ...DEFAULT_PREFERENCES, ...user.preferences };
      const savedCustomThemes = Array.isArray(next.customThemes) ? next.customThemes : [];
      setCustomThemes(savedCustomThemes);
      if (THEME_BY_ID[savedTheme] || savedCustomThemes.some(theme => theme.id === savedTheme)) {
        setActiveThemeId(savedTheme);
        localStorage.setItem('site-theme', savedTheme);
      }
      setPreferences(next);
      localStorage.setItem('site-preferences', JSON.stringify(next));
      localStorage.setItem('site-custom-themes', JSON.stringify(savedCustomThemes));
    } else if (THEME_BY_ID[savedTheme]) {
      setActiveThemeId(savedTheme);
      localStorage.setItem('site-theme', savedTheme);
    }
  }, [token, user?.preferences, user?.themePreference]);

  const saveQueue = useRef(Promise.resolve());
  const pendingSaves = useRef(0);
  const persistAccountSettings = useCallback(async (themePreference, nextPreferences) => {
    if (!token) return;
    const save = saveQueue.current.catch(() => {}).then(async () => {
      setSaving(true);
      setSaveError('');
      try {
        await axios.put('/api/users/preferences', {
          themePreference,
          preferences: nextPreferences
        }, { headers: { 'x-auth-token': token } });
      } catch (error) {
        const message = error.response?.data?.msg || error.message || 'Unable to save account preferences.';
        setSaveError(message);
        throw new Error(message);
      } finally {
        pendingSaves.current -= 1;
        if (pendingSaves.current === 0) setSaving(false);
      }
    });
    pendingSaves.current += 1;
    saveQueue.current = save;
    return save;
  }, [token]);

  const beginPreview = useCallback(id => {
    if (!allThemes.some(theme => theme.id === id)) return;
    setSaveError('');
    setPreviewThemeId(id);
  }, [allThemes]);

  const cancelPreview = useCallback(() => setPreviewThemeId(null), []);

  const applyTheme = useCallback(async id => {
    const selected = allThemes.find(theme => theme.id === id);
    if (!selected) throw new Error('That theme is not available.');
    const nextId = selected.id;
    const previousId = activeThemeId;
    setActiveThemeId(nextId);
    setPreviewThemeId(null);
    localStorage.setItem('site-theme', nextId);
    try {
      await persistAccountSettings(nextId, preferences);
    } catch (error) {
      setActiveThemeId(previousId);
      localStorage.setItem('site-theme', previousId);
      throw error;
    }
  }, [activeThemeId, allThemes, persistAccountSettings, preferences]);

  const updatePreference = useCallback((key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    localStorage.setItem('site-preferences', JSON.stringify(next));
    persistAccountSettings(activeThemeId, next).catch(error => {
      setSaveError(error.message);
    });
  }, [activeThemeId, persistAccountSettings, preferences]);

  const saveCustomThemes = useCallback((nextThemes, previewId, themeOverride) => {
    const next = { ...preferences, customThemes: nextThemes };
    setCustomThemes(nextThemes);
    setPreferences(next);
    if (previewId) setPreviewThemeId(previewId);
    localStorage.setItem('site-custom-themes', JSON.stringify(nextThemes));
    localStorage.setItem('site-preferences', JSON.stringify(next));
    persistAccountSettings(themeOverride || activeThemeId, next).catch(error => setSaveError(error.message));
  }, [activeThemeId, persistAccountSettings, preferences]);

  const resetAppearance = useCallback(async () => {
    const previousTheme = activeThemeId;
    const next = {
      ...preferences,
      density: DEFAULT_PREFERENCES.density,
      reducedMotion: DEFAULT_PREFERENCES.reducedMotion,
      highContrast: DEFAULT_PREFERENCES.highContrast,
      largerText: DEFAULT_PREFERENCES.largerText,
      backgroundAnimations: DEFAULT_PREFERENCES.backgroundAnimations
    };
    setPreferences(next);
    localStorage.setItem('site-preferences', JSON.stringify(next));
    setActiveThemeId(DEFAULT_THEME);
    setPreviewThemeId(null);
    localStorage.setItem('site-theme', DEFAULT_THEME);
    try {
      await persistAccountSettings(DEFAULT_THEME, next);
    } catch (error) {
      setPreferences(preferences);
      setActiveThemeId(previousTheme);
      localStorage.setItem('site-preferences', JSON.stringify(preferences));
      localStorage.setItem('site-theme', previousTheme);
      throw error;
    }
  }, [activeThemeId, persistAccountSettings, preferences]);

  const value = useMemo(() => ({
    theme: activeThemeId,
    activeTheme,
    previewTheme: previewThemeId,
    previewing: Boolean(previewThemeId),
    themes: allThemes,
    customThemes,
    preferences,
    saving,
    saveError,
    clearSaveError: () => setSaveError(''),
    beginPreview,
    cancelPreview,
    applyTheme,
    updatePreference,
    setCustomThemes: saveCustomThemes,
    resetAppearance,
  }), [
    activeTheme,
    activeThemeId,
    allThemes,
    applyTheme,
    beginPreview,
    cancelPreview,
    customThemes,
    preferences,
    previewThemeId,
    resetAppearance,
    saveCustomThemes,
    saveError,
    saving,
    updatePreference
  ]);

  useEffect(() => {
    localStorage.setItem('site-custom-themes', JSON.stringify(customThemes));
  }, [customThemes]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {previewThemeId && (
        <div className="theme-preview-banner" role="status">
          <span>Previewing {displayedTheme.name}</span>
          {saveError && <span className="theme-preview-banner__error">{saveError}</span>}
          <button type="button" onClick={cancelPreview}>Cancel preview</button>
          <button type="button" onClick={async () => {
            try {
              await applyTheme(previewThemeId);
            } catch (error) {
              setSaveError(error.message);
            }
          }} disabled={saving}>
            {saving ? 'Saving…' : 'Apply theme'}
          </button>
        </div>
      )}
    </ThemeContext.Provider>
  );
}

export { themeVariables };
