import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { DEFAULT_PREFERENCES, DEFAULT_THEME, THEME_BY_ID, THEMES, BOARD_BY_ID, BACKGROUNDS, PRESETS, normalizePreferences } from '../themes/themeCatalog';

export const ThemeContext = createContext(null);

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('site-preferences') || '{}');
    return normalizePreferences(saved);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function readTheme() {
  let savedTheme;try{savedTheme=localStorage.getItem('site-theme')}catch{}
  if (THEME_BY_ID[savedTheme] || savedTheme==='system') return savedTheme;
  return DEFAULT_THEME;
}

function applyThemeToDocument(theme, preferences) {
  const root = document.documentElement;
  const { tokens } = theme;
  const board=BOARD_BY_ID[preferences.boardTheme]||BOARD_BY_ID.green;
  const background=BACKGROUNDS.find(item=>item.id===preferences.backgroundTheme)||BACKGROUNDS[0];
  const secondaryText = preferences.highContrast ? tokens.text : tokens.muted;
  const border = preferences.highContrast ? tokens.text : tokens.line;
  const variables = {
    '--board-light':board.light,
    '--board-dark':board.dark,
    '--board-frame':board.frame,
    '--board-highlight':board.highlight,
    '--board-texture':board.texture||'none',
    '--board-x':'#203b52',
    '--board-o':'#71341d',
    '--app-background-image':background.image,
    '--on-primary':theme.id==='dark'?'#20251b':'#ffffff',
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
    '--blood': `color-mix(in srgb, ${tokens.secondary} 10%, ${tokens.bg})`,
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
    '--color-card': tokens.card,
    '--color-primary': tokens.accent,
    '--color-secondary': tokens.secondary,
    '--color-text-primary': tokens.text,
    '--color-text-secondary': secondaryText,
    '--color-border': border,
    '--color-x': tokens.x,
    '--color-o': tokens.o,
    '--color-success': tokens.success,
    '--color-warning': tokens.warning,
    '--color-danger': tokens.danger,
    '--color-info': tokens.info,
    '--color-grade-purple': tokens.gradePurple,
    '--color-grade-green': tokens.gradeGreen,
    '--color-grade-blue': tokens.gradeBlue,
    '--color-grade-amber': tokens.gradeAmber,
    '--color-grade-red': tokens.gradeRed,
    '--color-grade-neutral': tokens.gradeNeutral,
    '--shadow-card': theme.id === 'dark'
      ? '0 12px 30px rgba(0, 0, 0, .22)'
      : '0 8px 24px rgba(37, 45, 41, .07)',
    '--success': tokens.success,
    '--warning': tokens.warning,
    '--danger': tokens.danger,
    '--info': tokens.info
  };
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset.theme = theme.id;
  root.dataset.board = preferences.boardTheme;
  root.dataset.pieces = preferences.pieceSet;
  root.dataset.background = preferences.backgroundTheme;
  root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'full';
  root.dataset.density = preferences.density;
  root.dataset.largerText = preferences.largerText ? 'true' : 'false';
  root.style.colorScheme = theme.id;
  const browserColour=document.querySelector('meta[name="theme-color"]');
  if(browserColour)browserColour.content=tokens.bg;
}

const API=process.env.REACT_APP_API_URL||'';
const pendingKey='site-appearance-pending';
function readPending(){try{return JSON.parse(localStorage.getItem(pendingKey)||'null')}catch{return null}}
function writePending(value){try{localStorage.setItem(pendingKey,JSON.stringify(value))}catch{}}

function storeAppearance(theme,preferences){
 try{localStorage.setItem('site-theme',theme);localStorage.setItem('site-preferences',JSON.stringify(preferences))}catch{/* Storage can be blocked; the in-memory choice still works. */}
}
export function ThemeProvider({children}){
 const {token,user}=useContext(AuthContext);
 const [theme,setTheme]=useState(readTheme);
 const [preferences,setPreferences]=useState(readPreferences);
 const [systemDark,setSystemDark]=useState(()=>window.matchMedia('(prefers-color-scheme: dark)').matches);
 const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
 const current=useRef({theme,preferences});
 const queue=useRef(Promise.resolve()),pending=useRef(0),hydrated=useRef(null),editVersion=useRef(0);
 const auth=useRef(token);auth.current=token;
 const resolvedTheme=theme==='system'?(systemDark?'dark':'light'):theme;
 useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: dark)');const change=e=>setSystemDark(e.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[]);
 useLayoutEffect(()=>{applyThemeToDocument(THEME_BY_ID[resolvedTheme]||THEME_BY_ID.dark,preferences)},[resolvedTheme,preferences]);
 const applyLocal=useCallback((nextTheme,nextPreferences)=>{
  current.current={theme:nextTheme,preferences:nextPreferences};setTheme(nextTheme);setPreferences(nextPreferences);storeAppearance(nextTheme,nextPreferences);
 },[]);
 // Hydrate once per signed-in account, never on an unrelated user/profile update.
 useEffect(()=>{
  if(!token||!user){hydrated.current=null;return}
  const identity=`${token}:${user._id||user.id||user.username}`;
  if(hydrated.current===identity)return;
  hydrated.current=identity;
  const saved=readPending(),owner=String(user._id||user.id||user.username);
  const unsynced=saved?.owner===owner?saved:null;
  const requested=unsynced?.theme||user.themePreference;
  const nextTheme=THEME_BY_ID[requested]||requested==='system'?requested:readTheme();
  const nextPreferences=normalizePreferences(unsynced?.preferences||{...readPreferences(),...(user.preferences||{})});
  setSaveError(unsynced?'Saved on this device. Account sync is pending; retry when connected.':'');

  applyLocal(nextTheme,nextPreferences);
 },[token,user,applyLocal]);
 useEffect(()=>{const receive=e=>{if(e.key==='site-theme'||e.key==='site-preferences'){const nextTheme=readTheme(),nextPreferences=readPreferences();current.current={theme:nextTheme,preferences:nextPreferences};setTheme(nextTheme);setPreferences(nextPreferences)}};window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive)},[]);
 const persist=useCallback((nextTheme,nextPreferences)=>{
  const version=++editVersion.current,session=token;
  if(!session)return Promise.resolve();
  const owner=String(user?._id||user?.id||user?.username||'');
  const snapshot={owner,theme:nextTheme,preferences:nextPreferences};
  writePending(snapshot);
  pending.current++;setSaving(true);
  const task=queue.current.catch(()=>{}).then(async()=>{
   if(auth.current!==session){pending.current--;if(pending.current===0)setSaving(false);return;}
   try{
    const response=await axios.put(`${API}/api/users/preferences`,{themePreference:nextTheme,preferences:nextPreferences},{headers:{'x-auth-token':session}});
    if(response.data?.themePreference!==nextTheme||Object.entries(nextPreferences).some(([key,value])=>response.data?.preferences?.[key]!==value))throw new Error('The server did not confirm your settings.');
    if(version===editVersion.current&&auth.current===session){
     setSaveError('');
     if(JSON.stringify(readPending())===JSON.stringify(snapshot)){try{localStorage.removeItem(pendingKey)}catch{}}
    }
   }catch(error){
    if(auth.current===session&&version===editVersion.current)setSaveError('Saved on this device. Account sync failed; retry when connected.');
    throw error;
   }finally{pending.current--;if(pending.current===0)setSaving(false)}
  });
  // A queued task skipped after sign-out must also release its pending count.
  queue.current=task;return task;
 },[token,user]);
 const changeAppearance=useCallback((nextTheme,patch={})=>{
  if(!THEME_BY_ID[nextTheme]&&nextTheme!=='system')return Promise.reject(new Error('Choose an available interface.'));
  const next=normalizePreferences({...current.current.preferences,...patch});
  applyLocal(nextTheme,next);setSaveError('');return persist(nextTheme,next);
 },[applyLocal,persist]);
 const applyTheme=useCallback(id=>changeAppearance(id),[changeAppearance]);
 const updatePreference=useCallback((key,value)=>{
  if(!Object.prototype.hasOwnProperty.call(DEFAULT_PREFERENCES,key))return;
  changeAppearance(current.current.theme,{[key]:value}).catch(()=>{});
 },[changeAppearance]);
 const applyPreset=useCallback(id=>{
  const preset=PRESETS.find(item=>item.id===id);if(!preset)return Promise.reject(new Error('Choose an available preset.'));
  return changeAppearance(preset.theme,{boardTheme:preset.boardTheme,pieceSet:preset.pieceSet,backgroundTheme:preset.backgroundTheme});
 },[changeAppearance]);
 const resetAppearance=useCallback(()=>changeAppearance(DEFAULT_THEME,Object.fromEntries(['boardTheme','pieceSet','backgroundTheme','density','reducedMotion','highContrast','largerText','backgroundAnimations'].map(key=>[key,DEFAULT_PREFERENCES[key]]))),[changeAppearance]);
 const retrySave=useCallback(()=>persist(current.current.theme,current.current.preferences),[persist]);
 const clearSaveError=useCallback(()=>setSaveError(''),[]);
 const value=useMemo(()=>({theme,resolvedTheme,themes:THEMES,preferences,saving,saveError,clearSaveError,applyTheme,applyPreset,updatePreference,resetAppearance,retrySave}),[theme,resolvedTheme,preferences,saving,saveError,clearSaveError,applyTheme,applyPreset,updatePreference,resetAppearance,retrySave]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
