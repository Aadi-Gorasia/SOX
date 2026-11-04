export const DEFAULT_THEME = 'light';

export const THEMES = [
  {
    id: 'light',
    name: 'Light',
    description: 'Warm paper, clear surfaces, and quiet green accents.',
    tokens: {
      bg: '#f4f5f1',
      panel: '#ffffff',
      card: '#f8f9f6',
      text: '#202722',
      muted: '#66716a',
      accent: '#287653',
      secondary: '#bd5d4d',
      line: '#d9dfda',
      x: '#315b83',
      o: '#bd5d4d'
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Deep charcoal surfaces with soft, readable contrast.',
    tokens: {
      bg: '#141916',
      panel: '#1b221e',
      card: '#222b26',
      text: '#edf2ee',
      muted: '#a3b0a7',
      accent: '#a3d8ad',
      secondary: '#f08c78',
      line: '#39453d',
      x: '#9dc4ef',
      o: '#f08c78'
    }
  }
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map(theme => [theme.id, theme]));

export const DEFAULT_PREFERENCES = {
  landingPage: 'dashboard',
  defaultGameMode: 'online',
  density: 'comfortable',
  reducedMotion: false,
  backgroundAnimations: true,
  victoryAnimation: true,
  highContrast: false,
  largerText: false
};
