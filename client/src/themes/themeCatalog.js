export const DEFAULT_THEME = 'international-typographic';

export const THEMES = [
  {
    id: 'international-typographic',
    name: 'International Typographic',
    philosophy: 'Order, clarity, precision.',
    description: 'A strict editorial grid, primary signals and confident grotesk typography.',
    colors: ['#f3f0e8', '#ffffff', '#111111', '#df3028'],
    tokens: { bg: '#f3f0e8', panel: '#ffffff', card: '#ffffff', text: '#111111', muted: '#5e5e5e', accent: '#df3028', secondary: '#1749a3', line: '#b8b5ae', x: '#1749a3', o: '#df3028' },
    heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'swiss'
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    philosophy: 'Form follows function.',
    description: 'Primary geometry and flat surfaces turn play into a compositional exercise.',
    colors: ['#f0eadc', '#fffdf5', '#191919', '#d52e2e'],
    tokens: { bg: '#f0eadc', panel: '#fffdf5', card: '#fffdf5', text: '#191919', muted: '#605b54', accent: '#d52e2e', secondary: '#2455a4', line: '#24211e', x: '#2455a4', o: '#d52e2e' },
    heading: '"Archivo", Arial, sans-serif', body: 'Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'bauhaus'
  },
  {
    id: 'japanese-editorial',
    name: 'Japanese Editorial',
    philosophy: 'Restraint and negative space.',
    description: 'Warm paper, ink-black type, fine rules and one deliberate vermilion accent.',
    colors: ['#eee9df', '#f7f4ed', '#24231f', '#b84936'],
    tokens: { bg: '#eee9df', panel: '#f7f4ed', card: '#f7f4ed', text: '#24231f', muted: '#777167', accent: '#b84936', secondary: '#59685d', line: '#cbc4b7', x: '#24231f', o: '#b84936' },
    heading: 'Georgia, "Times New Roman", serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'editorial'
  },
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    philosophy: 'Structure without apology.',
    description: 'Heavy outlines, hard shadows and direct, high-contrast interaction.',
    colors: ['#f4f0e4', '#fffdf5', '#111111', '#ed5537'],
    tokens: { bg: '#f4f0e4', panel: '#fffdf5', card: '#fffdf5', text: '#111111', muted: '#48453f', accent: '#ed5537', secondary: '#e5c52d', line: '#111111', x: '#111111', o: '#ed5537' },
    heading: '"Archivo", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'brutal'
  },
  {
    id: 'macintosh-classic',
    name: 'Macintosh Classic',
    philosophy: 'A familiar desktop, reimagined.',
    description: 'Compact controls, monochrome marks and raised window chrome.',
    colors: ['#b8b8b8', '#e5e5e5', '#171717', '#282828'],
    tokens: { bg: '#b8b8b8', panel: '#e5e5e5', card: '#dedede', text: '#171717', muted: '#555555', accent: '#161616', secondary: '#777777', line: '#444444', x: '#111111', o: '#555555' },
    heading: 'Geneva, "Lucida Grande", Arial, sans-serif', body: 'Geneva, "Lucida Grande", Arial, sans-serif', mono: '"Courier New", monospace', style: 'mac'
  },
  {
    id: 'transit-system',
    name: 'Transit Information',
    philosophy: 'Find the next move at a glance.',
    description: 'Route markers, numbered hierarchy and fast-read status colour.',
    colors: ['#e9edf0', '#ffffff', '#14202a', '#bb292e'],
    tokens: { bg: '#e9edf0', panel: '#ffffff', card: '#f7f9fa', text: '#14202a', muted: '#52616b', accent: '#bb292e', secondary: '#176a47', line: '#bdc8ce', x: '#14202a', o: '#bb292e' },
    heading: '"DM Sans", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'transit'
  },
  {
    id: 'mid-century',
    name: 'Mid-Century Modern',
    philosophy: 'Warm geometry, carefully balanced.',
    description: 'Earthy surfaces and clean shapes with an understated postwar optimism.',
    colors: ['#e9dfcf', '#f5eee2', '#34372f', '#b05236'],
    tokens: { bg: '#e9dfcf', panel: '#f5eee2', card: '#f5eee2', text: '#34372f', muted: '#756d5f', accent: '#b05236', secondary: '#607a70', line: '#c9bba8', x: '#607a70', o: '#b05236' },
    heading: '"Archivo", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'midcentury'
  },
  {
    id: 'editorial-luxury',
    name: 'Editorial Luxury',
    philosophy: 'Elegance through restraint.',
    description: 'Ivory, charcoal and high-contrast serif headlines with ample breathing room.',
    colors: ['#e9e4dc', '#f5f2ec', '#24211e', '#796444'],
    tokens: { bg: '#e9e4dc', panel: '#f5f2ec', card: '#f5f2ec', text: '#24211e', muted: '#777168', accent: '#796444', secondary: '#5f685d', line: '#d1c9bd', x: '#24211e', o: '#796444' },
    heading: 'Georgia, "Times New Roman", serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'luxury'
  },
  {
    id: 'technical-drafting',
    name: 'Technical Drafting',
    philosophy: 'Every line has a purpose.',
    description: 'Measured coordinates and blueprint rules make the board a working drawing.',
    colors: ['#102d3a', '#173b4a', '#edf5ef', '#e4b85d'],
    tokens: { bg: '#102d3a', panel: '#173b4a', card: '#153544', text: '#edf5ef', muted: '#a6bdc2', accent: '#e4b85d', secondary: '#83c7bc', line: '#54737a', x: '#edf5ef', o: '#e4b85d' },
    heading: '"IBM Plex Mono", monospace', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'draft'
  },
  {
    id: 'arcade-hardware',
    name: 'Arcade Hardware',
    philosophy: 'A cabinet built for one more round.',
    description: 'Physical control panels, score displays and warm phosphor accents.',
    colors: ['#24201b', '#302a23', '#f2e8d0', '#e6b342'],
    tokens: { bg: '#24201b', panel: '#302a23', card: '#393127', text: '#f2e8d0', muted: '#b6a98e', accent: '#e6b342', secondary: '#b94f39', line: '#5e5140', x: '#f2e8d0', o: '#e6b342' },
    heading: '"Archivo", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'arcade'
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian Functionalism',
    philosophy: 'Calm, useful, honest.',
    description: 'Soft mineral neutrals, functional hierarchy and quiet tactile surfaces.',
    colors: ['#e8e8e2', '#f4f4ef', '#2a302e', '#657e6c'],
    tokens: { bg: '#e8e8e2', panel: '#f4f4ef', card: '#f4f4ef', text: '#2a302e', muted: '#717772', accent: '#657e6c', secondary: '#a66b50', line: '#d1d2cb', x: '#2a302e', o: '#657e6c' },
    heading: '"DM Sans", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'scandi'
  },
  {
    id: 'constructivism',
    name: 'Constructivism',
    philosophy: 'Geometry in motion.',
    description: 'A disciplined red, black and paper palette with directional composition.',
    colors: ['#e9e2d5', '#f5f0e7', '#201d1b', '#c9362b'],
    tokens: { bg: '#e9e2d5', panel: '#f5f0e7', card: '#f5f0e7', text: '#201d1b', muted: '#6f6860', accent: '#c9362b', secondary: '#252321', line: '#bdb3a3', x: '#252321', o: '#c9362b' },
    heading: '"Archivo", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'construct'
  },
  {
    id: 'archival-academia',
    name: 'Archival Academia',
    philosophy: 'A record worth keeping.',
    description: 'Book-paper warmth, scholarly serif hierarchy and discreet footnote details.',
    colors: ['#e8dfce', '#f3ebdc', '#302922', '#773f3d'],
    tokens: { bg: '#e8dfce', panel: '#f3ebdc', card: '#f3ebdc', text: '#302922', muted: '#74695c', accent: '#773f3d', secondary: '#55634e', line: '#c9bca8', x: '#302922', o: '#773f3d' },
    heading: 'Georgia, "Times New Roman", serif', body: 'Georgia, "Times New Roman", serif', mono: '"Courier New", monospace', style: 'archive'
  },
  {
    id: 'y2k-industrial',
    name: 'Y2K Industrial',
    philosophy: 'Early digital optimism, made tangible.',
    description: 'Cool alloy, milky polymer and layered interface details—without the gradient cliché.',
    colors: ['#c5cbd0', '#e5e9eb', '#222b31', '#477b83'],
    tokens: { bg: '#c5cbd0', panel: '#e5e9eb', card: '#d8dfe2', text: '#222b31', muted: '#59666d', accent: '#477b83', secondary: '#a65b3d', line: '#aab4b9', x: '#222b31', o: '#477b83' },
    heading: '"DM Sans", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'y2k'
  },
  {
    id: 'experimental-swiss',
    name: 'Experimental Swiss',
    philosophy: 'Tension, precisely controlled.',
    description: 'Oversized numerals, asymmetric alignment and a single electric-green signal.',
    colors: ['#e9e9e4', '#f7f7f2', '#151515', '#667b20'],
    tokens: { bg: '#e9e9e4', panel: '#f7f7f2', card: '#f7f7f2', text: '#151515', muted: '#66675f', accent: '#667b20', secondary: '#b53b31', line: '#c8c8c1', x: '#151515', o: '#667b20' },
    heading: '"Archivo", Arial, sans-serif', body: '"DM Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace', style: 'experimental'
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
  largerText: false,
  customThemes: []
};
