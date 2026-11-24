// Usage: node server/engine/benchmark.js /path/to/baseline/server/engine
const path = require('node:path');
if (!process.argv[2]) throw new Error('Pass the baseline engine directory');
const engine=require('./index');const old=require(path.resolve(process.argv[2], 'search.js'));
let seed=92831;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
let wins=0,draws=0,losses=0;let newDepth=0,oldDepth=0,newMs=0,oldMs=0,newN=0,oldN=0;
for(let pair=0;pair<6;pair++){
 const opening=[];let start=engine.emptyState();for(let i=0;i<8;i++){const legal=engine.legalMoves(start);const move=legal[Math.floor(rand()*legal.length)];opening.push(move);engine.makeMove(start,move)}
 for(const newSide of ['X','O']){
  const state=engine.cloneState(start);let plies=0;
  while(!state.gameWinner&&plies<81){const isNew=state.turn===newSide;const t=performance.now();const result=isNew?engine.searchPosition(state,{nodeLimit:5000,maxDepth:16,timeLimitMs:2000,bestOnly:true}):old.searchPosition(state,{nodeLimit:5000,maxDepth:16});const ms=performance.now()-t;if(isNew){newDepth+=result.depth;newMs+=ms;newN++}else{oldDepth+=result.depth;oldMs+=ms;oldN++}if(!engine.legalMoves(state).includes(result.bestMove))throw Error('illegal move');engine.makeMove(state,result.bestMove);plies++}
  if(state.gameWinner==='D')draws++;else if(state.gameWinner===newSide)wins++;else losses++;
  console.log(JSON.stringify({pair,newSide,winner:state.gameWinner,plies,wins,draws,losses}));
 }
}
console.log(JSON.stringify({wins,draws,losses,newAverageDepth:newDepth/newN,oldAverageDepth:oldDepth/oldN,newAverageMs:newMs/newN,oldAverageMs:oldMs/oldN}));
