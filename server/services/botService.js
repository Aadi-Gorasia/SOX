const { randomInt } = require('node:crypto');
const { deriveState, legalMoves } = require('../engine');
const { getBestMove } = require('./engineService');
const BOTS = [
  { id:'pip', name:'Pip', rating:500, style:'Learning the ropes. Leaves room to experiment.' },
  { id:'milo', name:'Milo', rating:900, style:'Finds simple threats. Sometimes loses the bigger picture.' },
  { id:'iris', name:'Iris', rating:1300, style:'Steady sector play with occasional tactical misses.' },
  { id:'atlas', name:'Atlas', rating:1700, style:'Looks ahead and makes you work for each sector.' },
  { id:'nova', name:'Nova', rating:2100, style:'Sharp routing and patient tactical pressure.' },
  { id:'zenith', name:'Zenith', rating:2600, style:'The strongest SOX search. No deliberate mistakes.' }
];
function settings(rating) {
  if(!Number.isInteger(rating)||rating<400||rating>2600) throw new Error('Choose a rating from 400 to 2600');
  const strength=(rating-400)/2200;
  return {nodeLimit:Math.round(2000+198000*strength**2),maxDepth:Math.round(2+14*strength),
    timeLimitMs:Math.round(150+1350*strength),temperature:Math.round(400*(1-strength)**2),
    explore:0.3*(1-strength)**2};
}
function selectMove(analysis,rating,rng=()=>randomInt(1000000)/1000000) {
  const config=settings(rating),scores=analysis.moveScores || [];
  if(!scores.length) return -1;
  if(rating>=2500) return analysis.bestMove;
  if(rng()<config.explore) return scores[Math.min(scores.length-1,Math.floor(rng()*scores.length))].move;
  const weights=scores.map(m=>Math.exp(Math.max(-30,(m.score-analysis.score)/Math.max(1,config.temperature))));
  let pick=rng()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<scores.length;i++){pick-=weights[i];if(pick<=0)return scores[i].move;}
  return scores[0].move;
}
async function botMove(sequence,rating) {
  const state=deriveState(sequence);if(!state)throw new Error('Invalid move history');
  const config=settings(rating);
  const analysis=await getBestMove(sequence,rating,{...config,bestOnly:rating>=2500});
  const move=selectMove(analysis,rating);
  if(!legalMoves(state).includes(move))throw new Error('No legal computer move');
  return move;
}
function gameResult(state,humanSide,owner) {
  if(!state.gameWinner) return {status:'ONGOING',winner:null};
  return {status:state.gameWinner==='D'?'DRAW':'COMPLETED',
    winner:state.gameWinner===humanSide?owner:null,
    botResult:state.gameWinner==='D'?'draw':state.gameWinner===humanSide?'win':'loss',endDate:new Date()};
}
module.exports={BOTS,settings,selectMove,botMove,gameResult};
