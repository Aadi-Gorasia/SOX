import React,{useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {AuthContext} from '../context/AuthContext';
import EngineBoard,{AdvantageBar} from '../components/EngineBoard';
import {formatMove,grades,replay,scoreLabel} from '../utils/engineView';
import './EngineExperience.css';
const API=process.env.REACT_APP_API_URL||'';
export default function ReviewPage(){
 const {gameId}=useParams(),{token,user}=useContext(AuthContext);
 const [tab,setTab]=useState('moves');
 const [game,setGame]=useState(null),[annotations,setAnnotations]=useState([]),[summary,setSummary]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[current,setCurrent]=useState(0),[after,setAfter]=useState(true),[filter,setFilter]=useState('all'),[coachSide,setCoachSide]=useState(null),[playing,setPlaying]=useState(false);const controller=useRef(null);
 const load=useCallback(async()=>{controller.current?.abort();const c=new AbortController();controller.current=c;setLoading(true);setError('');setAnnotations([]);setSummary(null);setCurrent(0);setPlaying(false);setCoachSide(null);
  const get=async path=>{const r=await fetch(`${API}/api/games/${gameId}${path}`,{headers:{'x-auth-token':token},signal:c.signal});const d=await r.json();if(!r.ok)throw new Error(d.msg||'Could not analyze this game');return d};
  try{const g=await get('');setGame(g);const result=await get('/review');setAnnotations(result.annotations||[]);setSummary(result.reviewSummary||null)}catch(e){if(e.name!=='AbortError')setError(e.message)}finally{if(!c.signal.aborted)setLoading(false)}
 },[gameId,token]);
 useEffect(()=>{load();return()=>controller.current?.abort()},[load]);
 useEffect(()=>{const handler=e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setPlaying(false);setCurrent(n=>Math.max(0,Math.min(annotations.length-1,n+(e.key==='ArrowRight'?1:-1))))}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[annotations.length]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setCurrent(n=>{if(n>=annotations.length-1){setPlaying(false);return n}return n+1}),1400);return()=>clearInterval(timer)},[playing,annotations.length]);
 const selected=annotations[current];
 const state=useMemo(()=>replay((game?.moves||[]).slice(0,selected?current+(after?1:0):0)),[game,current,after,selected]);
 const yourSide=game?.gameType==='computer'?game.bot.humanSide:(game?.players?.findIndex(p=>String(p._id||p)===String(user?._id||user?.id))===1?'O':'X');
 const side=coachSide||yourSide,report=summary?.coaching?.[side],quality=grades[selected?.quality]||grades.unrated;
 const score=selected?(after?selected.positionEvaluationAfter:selected.positionEvaluation):null;
 const nameFor=s=>game?.gameType==='computer'?(s===game.bot.humanSide?user?.username||'You':game.bot.name):(game?.players?.[s==='X'?0:1]?.username||s);
 const jump=i=>{setCurrent(i);setPlaying(false)};
 const rows=annotations.map((a,i)=>({a,i})).filter(({a})=>filter==='all'||(filter==='mine'?(a.side===0?'X':'O')===yourSide:['mistake','blunder','miss','inaccuracy'].includes(a.quality)));
 return <main className="eng-page review-studio">
  <header className="eng-top"><Link to="/games/history">← Your games</Link><h1>Game review</h1><Link to="/play/computer">Play computer</Link></header>
  <div className="review-matchline"><span>{game?`${nameFor('X')} vs ${nameFor('O')}`:'Loading game…'}</span><span>{game?.gameType==='computer'?'Computer · Unrated':'Completed match'} · {game?.moves?.length||0} moves</span></div>
  {error&&<div className="eng-error" role="alert">{error} <button onClick={load}>Retry analysis</button></div>}
  {loading?<div className="review-loading" role="status"><span className="eng-pulse"/><h2>Analyzing your game</h2><p>Comparing each move with the alternatives.<br/>A full game can take about a minute.</p></div>:annotations.length>0?<div className="review-workspace">
   <section className="review-board-column">
    <div className="review-position-head"><span>MOVE {current+1} / {annotations.length}</span><b>{scoreLabel(score)}</b></div>
    <div className="review-board-and-bar"><AdvantageBar score={score}/><EngineBoard state={state} playedMove={selected?.idx} bestMove={!after?selected?.bestMove:null}/></div>
    <div className="review-transport"><div className="review-board-switch"><button onClick={()=>setAfter(false)} aria-pressed={!after}>Before · show engine choice</button><button onClick={()=>setAfter(true)} aria-pressed={after}>After move</button></div>
    <div className="review-controls"><button onClick={()=>jump(0)} disabled={current===0} aria-label="First move">⏮</button><button onClick={()=>jump(current-1)} disabled={current===0} aria-label="Previous move">←</button><button onClick={()=>{if(current===annotations.length-1)setCurrent(0);setPlaying(!playing)}} aria-label={playing?'Pause replay':'Play replay'}>{playing?'Pause':'Play'}</button><button onClick={()=>jump(current+1)} disabled={current===annotations.length-1} aria-label="Next move">→</button><button onClick={()=>jump(annotations.length-1)} disabled={current===annotations.length-1} aria-label="Last move">⏭</button></div></div>

   </section>
   <aside className="review-analysis">
    <div className="review-summary-grid">{['X','O'].map(s=>{const stats=summary?.sideSummaries?.[s];return <button key={s} className={`review-scorecard ${side===s?'selected':''}`} onClick={()=>setCoachSide(s)} aria-pressed={side===s}><span className={`eng-mark eng-mark--${s.toLowerCase()}`}>{s}</span><div><strong>{nameFor(s)}{s===yourSide&&<small>YOU</small>}</strong><span>{stats?.movesReviewed||0} analyzed</span></div><b>{stats?.accuracy??'—'}<small>%</small></b></button>})}</div>
    <p className="review-scope">Move-quality index · based on this search, not player Elo.</p>
    <div className="review-graph"><div className="review-graph-bars" aria-label="Choose a move on the evaluation timeline">{annotations.map((a,i)=>{const value=a.positionEvaluationAfter;return <button key={i} onClick={()=>jump(i)} className={i===current?'selected':''} aria-label={`Move ${i+1}: ${scoreLabel(value)}`} title={`Move ${i+1}: ${scoreLabel(value)}`}><span style={{height:`${value==null?2:Math.max(3,Math.min(48,Math.abs(value)/30))}%`,[value>=0?'bottom':'top']:'50%',background:value>=0?'var(--color-x)':'var(--color-o)'}}/></button>})}</div><span>X above · O below <span>← → to step through moves</span></span></div>
    <section className={`review-decision grade-${selected?.quality}`}><div><span className="grade-icon">{quality[1]}</span><span><b>{quality[0]}</b><small>{formatMove(selected?.idx)} · {selected?.side===0?'X':'O'}</small></span><span className="review-depth">{selected?.solved?'Proven outcome':`Depth ${selected?.searchDepth??0}`}</span></div><p>{selected?.explanation}</p>{selected?.principalVariation?.length>1&&<details><summary>Best continuation</summary><ol className="review-pv">{selected.principalVariation.map((move,i)=><li key={i}><span>{i%2===0?(selected.side===0?'X':'O'):(selected.side===0?'O':'X')}</span> {formatMove(move)}</li>)}</ol></details>}</section>
    <div className="review-tabs" role="tablist" aria-label="Review panels"><button id="moves-tab" role="tab" aria-selected={tab==='moves'} aria-controls="review-moves" onClick={()=>setTab('moves')}>Moves</button><button id="coach-tab" role="tab" aria-selected={tab==='coach'} aria-controls="review-coach" onClick={()=>setTab('coach')}>Coach · {nameFor(side)}</button></div>
    <section id="review-moves" role="tabpanel" aria-labelledby="moves-tab" hidden={tab!=='moves'} className="review-move-column"><div className="review-panel-head"><span>{rows.length} moves</span><select aria-label="Filter moves" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All moves</option><option value="mine">My moves</option><option value="critical">Needs attention</option></select></div><div className="review-move-scroll">{rows.map(({a,i})=>{const g=grades[a.quality]||grades.unrated;return <button key={i} onClick={()=>jump(i)} className={`review-move ${current===i?'selected':''}`} aria-current={current===i?'step':undefined}><span>{i+1}. {a.side===0?'X':'O'}</span><strong>{formatMove(a.idx)}</strong><span className={`grade-pill grade-${a.quality}`}>{g[1]} {g[0]}</span></button>})}{!rows.length&&<p className="eng-muted">No moves match this filter.</p>}</div><details className="review-grade-legend"><summary>Move grades</summary><div>{Object.entries(grades).filter(([key])=>key!=='unrated').map(([key,g])=><span key={key} className={`grade-${key}`}><b>{g[1]}</b> {g[0]}</span>)}</div></details></section>
    <section id="review-coach" role="tabpanel" aria-labelledby="coach-tab" hidden={tab!=='coach'} className="review-coach"><h2>SOX coach</h2><p className="eng-muted">{report?.movesAnalyzed||0} of {report?.totalMoves||0} moves analyzed for {nameFor(side)}.</p><h3>{report?.headline||'Review the turning points.'}</h3>{report?.tips?.map((tip,i)=><article key={i}><h4>{tip.title}</h4><p>{tip.text}</p><div>{tip.moves.map(n=><button key={n} onClick={()=>jump(n-1)}>Move {n} ↗</button>)}</div></article>)}<Link className="eng-secondary" to="/play/computer">Play another game</Link></section>
   </aside>
  </div>:!error&&<p className="eng-muted">There are no recorded moves to review.</p>}
 </main>;
}
