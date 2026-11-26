export const DEFAULT_THEME = 'dark';

export const THEMES = [
  {
    id: 'light',
    name: 'Light',
    description: 'A light interface for daytime play.',
    tokens: {
      bg: '#eeece8',
      panel: '#ffffff',
      card: '#f7f6f3',
      text: '#302e2b',
      muted: '#66625e',
      accent: '#507d31',
      secondary: '#a94f43',
      line: '#d6d2cb',
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
    description: 'A quiet charcoal interface.',
    tokens: {
      bg: '#262421',
      panel: '#302e2b',
      card: '#3b3935',
      text: '#f0eeeb',
      muted: '#bab6b0',
      accent: '#a8c775',
      secondary: '#f08e7b',
      line: '#514d47',
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
  boardTheme: 'green',
  pieceSet: 'classic',
  backgroundTheme: 'plain',
  landingPage: 'dashboard',
  defaultGameMode: 'online',
  density: 'comfortable',
  reducedMotion: false,
  backgroundAnimations: true,
  victoryAnimation: true,
  highContrast: false,
  largerText: false
};

// Board choices are independent of the interface, and shared by every renderer.
export const BOARDS = [
  {id:'green',name:'Green',light:'#eeeed2',dark:'#a3b981',frame:'#526345',highlight:'#f1d96d'},
  {id:'brown',name:'Brown',light:'#f0d9b5',dark:'#bfa17b',frame:'#6c533c',highlight:'#f3d76b'},
  {id:'blue',name:'Blue',light:'#dee6ed',dark:'#91b0c8',frame:'#47647b',highlight:'#f3d76b'},
  {id:'walnut',name:'Walnut',light:'#e8c99b',dark:'#bc976b',frame:'#62462e',highlight:'#eedd79',texture:'repeating-linear-gradient(5deg,transparent 0 5px,#50331a10 6px,transparent 8px)'},
  {id:'slate',name:'Slate',light:'#d2d6dc',dark:'#a0a9b5',frame:'#48505e',highlight:'#e1cc84'},
  {id:'purple',name:'Purple',light:'#e8dfee',dark:'#b7a4c5',frame:'#665275',highlight:'#e8d67d'},
  {id:'rose',name:'Rose',light:'#f0dfda',dark:'#ceaaa5',frame:'#815b58',highlight:'#edce80'},
  {id:'contrast',name:'Contrast',light:'#fff',dark:'#c6c6c6',frame:'#202020',highlight:'#efcf54'}
];
export const BOARD_BY_ID=Object.fromEntries(BOARDS.map(board=>[board.id,board]));
export const PIECES=[{id:'classic',name:'Classic'},{id:'bold',name:'Bold'},{id:'sharp',name:'Sharp'},{id:'serif',name:'Serif'}];
export const BACKGROUNDS=[
 {id:'plain',name:'Plain',image:'none'},
 {id:'linen',name:'Linen',image:'repeating-linear-gradient(0deg,transparent 0 3px,color-mix(in srgb,var(--color-text-primary) 4%,transparent) 4px),repeating-linear-gradient(90deg,transparent 0 3px,color-mix(in srgb,var(--color-text-primary) 3%,transparent) 4px)'},
 {id:'wood',name:'Wood',image:'repeating-linear-gradient(5deg,transparent 0 16px,color-mix(in srgb,var(--color-text-primary) 4%,transparent) 18px,transparent 22px)'},
 {id:'grid',name:'Grid',image:'linear-gradient(color-mix(in srgb,var(--color-text-primary) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--color-text-primary) 5%,transparent) 1px,transparent 1px)'}
];
export const PRESETS=[
 {id:'club',name:'Club',theme:'dark',boardTheme:'green',pieceSet:'classic',backgroundTheme:'plain'},
 {id:'wood',name:'Wood',theme:'dark',boardTheme:'walnut',pieceSet:'serif',backgroundTheme:'wood'},
 {id:'ocean',name:'Ocean',theme:'light',boardTheme:'blue',pieceSet:'classic',backgroundTheme:'plain'},
 {id:'midnight',name:'Midnight',theme:'dark',boardTheme:'slate',pieceSet:'bold',backgroundTheme:'grid'},
 {id:'rose',name:'Rose',theme:'light',boardTheme:'rose',pieceSet:'serif',backgroundTheme:'linen'},
 {id:'tournament',name:'Tournament',theme:'light',boardTheme:'contrast',pieceSet:'sharp',backgroundTheme:'plain'}
];
export function normalizePreferences(value={}){
 const next={...DEFAULT_PREFERENCES};
 if(!value||typeof value!=='object'||Array.isArray(value))return next;
 for(const key of Object.keys(next))if(typeof value[key]===typeof next[key])next[key]=value[key];
 if(!BOARD_BY_ID[next.boardTheme])next.boardTheme=DEFAULT_PREFERENCES.boardTheme;
 if(!PIECES.some(item=>item.id===next.pieceSet))next.pieceSet=DEFAULT_PREFERENCES.pieceSet;
 if(!BACKGROUNDS.some(item=>item.id===next.backgroundTheme))next.backgroundTheme=DEFAULT_PREFERENCES.backgroundTheme;
 return next;
}
