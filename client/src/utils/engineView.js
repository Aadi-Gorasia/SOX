const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function winner(cells){for(const [a,b,c] of lines)if(cells[a]&&cells[a]!=='D'&&cells[a]===cells[b]&&cells[a]===cells[c])return cells[a];return cells.every(Boolean)?'D':null;}
export function replay(moves=[]){const boards=Array.from({length:9},()=>Array(9).fill(null)),winners=Array(9).fill(null);let activeBoard=null,turn='X',gameWinner=null;
 for(const move of moves){const idx=typeof move==='number'?move:move.idx;const macro=Math.floor(idx/9),cell=idx%9;boards[macro][cell]=turn;winners[macro]=winner(boards[macro]);gameWinner=winner(winners);activeBoard=winners[cell]?null:cell;turn=turn==='X'?'O':'X';}
 return {boards,winners,activeBoard,turn,gameWinner};}
export function formatMove(idx){if(!Number.isInteger(idx)||idx<0)return '—';const sector=Math.floor(idx/9);return `${String.fromCharCode(65+sector%3)}${Math.floor(sector/3)+1} · ${['↖','↑','↗','←','centre','→','↙','↓','↘'][idx%9]}`;}
export const grades={brilliant:['Brilliant','!!'],great:['Great','!'],textbook:['Textbook','✓'],best:['Best','★'],excellent:['Excellent','✓'],good:['Good','+'],fine:['Okay','·'],inaccuracy:['Inaccuracy','?!'],mistake:['Mistake','?'],blunder:['Blunder','??'],miss:['Missed win','×'],unrated:['Not rated','—']};
export function scoreLabel(score){if(score==null||!Number.isFinite(score))return 'Not evaluated';if(Math.abs(score)>=99000)return `${score>0?'X':'O'} forced win`;if(Math.abs(score)<35)return 'Balanced';return `${score>0?'X':'O'} +${(Math.abs(score)/100).toFixed(1)}`;}
