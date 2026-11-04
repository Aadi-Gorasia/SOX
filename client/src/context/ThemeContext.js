import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { DEFAULT_PREFERENCES, DEFAULT_THEME, THEME_BY_ID, THEMES } from '../themes/themeCatalog';

export const ThemeContext = createContext(null);

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('site-preferences') || '{}');
    return { ...DEFAULT_PREFERENCES, ...saved };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function readTheme() {
  const savedTheme = localStorage.getItem('site-theme');
  if (THEME_BY_ID[savedTheme]) return savedTheme;
  return DEFAULT_THEME;
}

function applyThemeToDocument(theme, preferences) {
  const root = document.documentElement;
  const { tokens } = theme;
  const secondaryText = preferences.highContrast ? tokens.text : tokens.muted;
  const border = preferences.highContrast ? tokens.text : tokens.line;
  const variables = {
    '--bg': tokens.bg,
    '--void': tokens.bg,
    '--bg-app': tokens.bg,
    '--primary': tokens.bg,
    '--carbon': tokens.card,
    '--steel': tokens.text,
    '--titanium': tokens.text,
    '--silver': secondaryText,
    '--crimson': tokens.secondary,
    '--sulfur': tokens.accent,
    '--accent-soft': `color-mix(in srgb, ${tokens.accent} 14%, transparent)`,
    '--panel-bg': tokens.panel,
    '--surface': tokens.panel,
    '--card': tokens.card,
    '--text': tokens.text,
    '--text-1': tokens.text,
    '--text-2': secondaryText,
    '--text-3': secondaryText,
    '--accent': tokens.accent,
    '--accent-d': tokens.accent,
    '--red': tokens.secondary,
    '--border': border,
    '--border-s': border,
    '--font-heading': 'Inter, "Segoe UI", Arial, sans-serif',
    '--font-display': 'Inter, "Segoe UI", Arial, sans-serif',
    '--font-body': 'Inter, "Segoe UI", Arial, sans-serif',
    '--font-main': 'Inter, "Segoe UI", Arial, sans-serif',
    '--font-mono': '"SFMono-Regular", Consolas, monospace',
    '--mono': '"SFMono-Regular", Consolas, monospace',
    '--sans': 'Inter, "Segoe UI", Arial, sans-serif',
    '--display': 'Inter, "Segoe UI", Arial, sans-serif',
    '--color-background': tokens.bg,
    '--color-surface': tokens.panel,
    '--color-primary': tokens.accent,
    '--color-secondary': tokens.secondary,
    '--color-text-primary': tokens.text,
    '--color-text-secondary': secondaryText,
    '--color-border': border,
    '--color-x': tokens.x,
    '--color-o': tokens.o
  };
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset.theme = theme.id;
  root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'full';
  root.dataset.density = preferences.density;
  root.dataset.largerText = preferences.largerText ? 'true' : 'false';
  root.style.colorScheme = theme.id;
}

export function ThemeProvider({ children }) {
  const { token, user } = useContext(AuthContext);
  const [theme, setTheme] = useState(readTheme);
  const [preferences, setPreferences] = useState(readPreferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveQueue = useRef(Promise.resolve());
  const pendingSaves = useRef(0);
  const migrationAttempts = useRef(new Set());
  const currentTheme = THEME_BY_ID[theme] || THEME_BY_ID[DEFAULT_THEME];

  useEffect(() => {
    applyThemeToDocument(currentTheme, preferences);
  }, [currentTheme, preferences]);

  useEffect(() => {
    if (!token || !user) return;
    const savedTheme = THEME_BY_ID[user.themePreference] ? user.themePreference : DEFAULT_THEME;
    const savedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...Object.fromEntries(
        Object.keys(DEFAULT_PREFERENCES)
          .filter(key => key in (user.preferences || {}))
          .map(key => [key, user.preferences[key]])
      )
    };
    setTheme(savedTheme);
    setPreferences(savedPreferences);
    localStorage.setItem('site-theme', savedTheme);
    localStorage.setItem('site-preferences', JSON.stringify(savedPreferences));
  }, [token, user]);

  const persistAccountSettings = useCallback((nextTheme, nextPreferences) => {
    if (!token) return Promise.resolve();
    pendingSaves.current += 1;
    const save = saveQueue.current.catch(() => {}).then(async () => {
      setSaving(true);
      try {
        await axios.put('/api/users/preferences', {
          themePreference: nextTheme,
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
    saveQueue.current = save;
    return save;
  }, [token]);

  useEffect(() => {
    if (!token || !user || THEME_BY_ID[user.themePreference]) return;
    const userId = user._id || user.id || user.username;
    const migrationKey = `${token}:${userId}`;
    if (migrationAttempts.current.has(migrationKey)) return;
    migrationAttempts.current.add(migrationKey);
    const savedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...Object.fromEntries(
        Object.keys(DEFAULT_PREFERENCES)
          .filter(key => key in (user.preferences || {}))
          .map(key => [key, user.preferences[key]])
      )
    };
    persistAccountSettings(DEFAULT_THEME, savedPreferences).catch(() => {});
  }, [persistAccountSettings, token, user]);

  const applyTheme = useCallback(async id => {
    if (!THEME_BY_ID[id]) throw new Error('Choose one of the available themes.');
    setSaveError('');
    setTheme(id);
    localStorage.setItem('site-theme', id);
    await persistAccountSettings(id, preferences);
  }, [persistAccountSettings, preferences]);

  const updatePreference = useCallback((key, value) => {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_PREFERENCES, key)) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    localStorage.setItem('site-preferences', JSON.stringify(next));
    setSaveError('');
    persistAccountSettings(theme, next).catch(() => {});
  }, [persistAccountSettings, preferences, theme]);

  const resetAppearance = useCallback(async () => {
    const nextPreferences = {
      ...preferences,
      density: DEFAULT_PREFERENCES.density,
      reducedMotion: DEFAULT_PREFERENCES.reducedMotion,
      highContrast: DEFAULT_PREFERENCES.highContrast,
      largerText: DEFAULT_PREFERENCES.largerText,
      backgroundAnimations: DEFAULT_PREFERENCES.backgroundAnimations
    };
    setPreferences(nextPreferences);
    setTheme(DEFAULT_THEME);
    localStorage.setItem('site-theme', DEFAULT_THEME);
    localStorage.setItem('site-preferences', JSON.stringify(nextPreferences));
    setSaveError('');
    await persistAccountSettings(DEFAULT_THEME, nextPreferences);
  }, [persistAccountSettings, preferences]);

  const clearSaveError = useCallback(() => setSaveError(''), []);
  const value = useMemo(() => ({
    theme,
    themes: THEMES,
    preferences,
    saving,
    saveError,
    clearSaveError,
    applyTheme,
    updatePreference,
    resetAppearance
  }), [applyTheme, clearSaveError, preferences, resetAppearance, saveError, saving, theme, updatePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
