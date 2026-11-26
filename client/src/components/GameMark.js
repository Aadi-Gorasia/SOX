import React from 'react';
// One mark renderer for live games, puzzles, computer games, reviews and previews.
export default function GameMark({value}){
 if(value!=='X'&&value!=='O')return null;
 return <span className={`game-mark game-mark--${value.toLowerCase()}`} aria-hidden="true"><svg viewBox="0 0 64 64" className="game-mark__lines" focusable="false">{value==='X'?<path d="M15 15 49 49 M49 15 15 49"/>:<circle cx="32" cy="32" r="22"/>}</svg><span className="game-mark__serif">{value}</span></span>;
}
