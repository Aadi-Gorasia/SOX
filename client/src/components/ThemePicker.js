import React,{useContext,useRef,useState} from 'react';
import {ThemeContext} from '../context/ThemeContext';
import {BOARDS,BOARD_BY_ID,PIECES,BACKGROUNDS,PRESETS,THEME_BY_ID} from '../themes/themeCatalog';
import EngineBoard from './EngineBoard';
import GameMark from './GameMark';
import './ThemePicker.css';
const preview={boards:Array.from({length:9},(_,i)=>i===4?['X',null,'O',null,'X',null,'O',null,null]:i===0?['O',null,null,null,'X',null,null,null,null]:Array(9).fill(null)),winners:Array(9).fill(null),activeBoard:4,turn:'X',gameWinner:null};
function MiniBoard({board,pieces}){return <span className="theme-mini-board" data-pieces={pieces} style={{'--board-x':'#203b52','--board-o':'#71341d',background:board.frame}} aria-hidden="true">{['X','','O','','X','','O','',''].map((mark,i)=><span key={i} style={{backgroundColor:i%2?board.dark:board.light,backgroundImage:board.texture||'none'}}>{mark&&<GameMark value={mark}/>}</span>)}</span>}
export default function ThemePicker(){
 const {theme,preferences,applyTheme,applyPreset,updatePreference,resetAppearance,saving,saveError,retrySave}=useContext(ThemeContext);
 const [section,setSection]=useState('Presets');
 const perform=fn=>Promise.resolve(fn()).catch(()=>{});
 return <section className="theme-picker" aria-label="Theme customisation">
  <header className="theme-picker-heading"><div><h2>Themes</h2><p>Choose a set, or mix your own board, marks and background.</p></div><span role="status" className="theme-save-status">{saving?'Saving…':saveError?'Saved locally':'Changes apply everywhere'}</span></header>
  <div className="theme-picker-layout"><aside className="theme-live-preview"><EngineBoard state={preview}/><div className="theme-preview-caption"><strong>{BOARD_BY_ID[preferences.boardTheme].name} board</strong><span>{PIECES.find(item=>item.id===preferences.pieceSet)?.name} marks · {theme==='system'?'System':THEME_BY_ID[theme]?.name} interface</span></div><p>Live games, computer games, puzzles and reviews use these same choices.</p></aside>
   <div className="theme-options"><fieldset className="theme-interface"><legend>Interface</legend>{['light','dark','system'].map(id=><button key={id} type="button" aria-pressed={theme===id} onClick={()=>perform(()=>applyTheme(id))}>{id==='system'?'Use device setting':id==='light'?'Light':'Dark'}</button>)}</fieldset>
   <div className="theme-category" aria-label="Customise">{['Presets','Board','Marks','Background'].map(id=><button key={id} type="button" aria-pressed={section===id} onClick={()=>setSection(id)}>{id}</button>)}</div>
   <div className="theme-choice-grid" role="group" aria-label={`${section} choices`}>
    {section==='Presets'&&PRESETS.map(item=><button type="button" className="theme-choice" key={item.id} onClick={()=>perform(()=>applyPreset(item.id))} aria-label={`Use ${item.name} preset`} aria-pressed={theme===item.theme&&preferences.boardTheme===item.boardTheme&&preferences.pieceSet===item.pieceSet&&preferences.backgroundTheme===item.backgroundTheme}><MiniBoard board={BOARD_BY_ID[item.boardTheme]} pieces={item.pieceSet}/><span>{item.name}</span></button>)}
    {section==='Board'&&BOARDS.map(item=><button type="button" className="theme-choice" key={item.id} onClick={()=>updatePreference('boardTheme',item.id)} aria-label={`${item.name} board`} aria-pressed={preferences.boardTheme===item.id}><MiniBoard board={item} pieces={preferences.pieceSet}/><span>{item.name}</span></button>)}
    {section==='Marks'&&PIECES.map(item=><button type="button" className="theme-choice" key={item.id} onClick={()=>updatePreference('pieceSet',item.id)} aria-label={`${item.name} marks`} aria-pressed={preferences.pieceSet===item.id}><span className="theme-piece-preview" data-pieces={item.id}><GameMark value="X"/><GameMark value="O"/></span><span>{item.name}</span></button>)}
    {section==='Background'&&BACKGROUNDS.map(item=><button type="button" className="theme-choice" key={item.id} onClick={()=>updatePreference('backgroundTheme',item.id)} aria-label={`${item.name} background`} aria-pressed={preferences.backgroundTheme===item.id}><span className="theme-background-preview" style={{backgroundImage:item.image}}/><span>{item.name}</span></button>)}
   </div>
   <button type="button" className="theme-reset" onClick={()=>perform(resetAppearance)}>Reset appearance</button>
   {saveError&&<p className="theme-save-error" role="alert">{saveError} <button type="button" onClick={()=>perform(retrySave)}>Retry sync</button></p>}
   </div>
  </div>
 </section>;
}
export function ThemeSwitcher(){
 const dialog=useRef(null);
 return <><button type="button" className="theme-quick-button" onClick={()=>dialog.current.showModal()} aria-label="Open themes">◐ <span>Themes</span></button><dialog className="theme-dialog" ref={dialog} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.current.close()}}}><button type="button" className="theme-dialog-close" onClick={()=>dialog.current.close()} aria-label="Close themes">×</button><ThemePicker/></dialog></>;
}
