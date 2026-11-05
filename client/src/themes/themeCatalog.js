export const DEFAULT_THEME = 'light';

export const THEMES = [
  {
    id: 'light',
    name: 'Light',
    description: 'Warm mineral surfaces with a deep evergreen accent.',
    tokens: {
      bg: '#f2f0e9',
      panel: '#fffdf8',
      card: '#f8f6ef',
      text: '#252d29',
      muted: '#59665f',
      accent: '#216b56',
      secondary: '#a94f43',
      line: '#d7d9d0',
      x: '#385d82',
      o: '#a94f43',
      success: '#24704d',
      warning: '#80590f',
      danger: '#a33f36',
      info: '#365f85',
      gradePurple: '#7041a6',
      gradeGreen: '#256843',
      gradeBlue: '#315b83',
      gradeAmber: '#79520d',
      gradeRed: '#a53d36',
      gradeNeutral: '#56605a'
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Layered forest-charcoal surfaces with a soft jade accent.',
    tokens: {
      bg: '#161c19',
      panel: '#202823',
      card: '#29332d',
      text: '#edf1eb',
      muted: '#adb9af',
      accent: '#a4d5ad',
      secondary: '#f08e7b',
      line: '#3d4a42',
      x: '#a9c7eb',
      o: '#f08e7b',
      success: '#7fc99a',
      warning: '#e8c17b',
      danger: '#f19a8e',
      info: '#9dc5eb',
      gradePurple: '#d4aeef',
      gradeGreen: '#7fc99a',
      gradeBlue: '#9dc5eb',
      gradeAmber: '#e8c17b',
      gradeRed: '#f19a8e',
      gradeNeutral: '#bac4bc'
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
