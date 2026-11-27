// Reproducible strength smoke test, not a calibration against human Elo.
// Run: node server/engine/botBenchmark.js [opening-pairs=2]
const {performance}=require('node:perf_hooks');
const engine=require('./index');
const {settings,selectMove}=require('../services/botService');
let seed=92831;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
const pairs=Number(process.argv[2]||2);
if(!Number.isInteger(pairs)||pairs<1||pairs>20)throw Error('Choose 1–20 opening pairs');
const summary=[];
for(const weaker of [500,1300]){
 const score={weaker,stronger:2600,wins:0,draws:0,losses:0,moves:0,totalMs:0,maxMs:0};
 for(let pair=0;pair<pairs;pair++){
  const opening=engine.emptyState();
  for(let i=0;i<6;i++){const legal=engine.legalMoves(opening);engine.makeMove(opening,legal[Math.floor(random()*legal.length)]);}
  for(const strongSide of ['X','O']){
   const state=engine.cloneState(opening);
   while(!state.gameWinner){
    const rating=state.turn===strongSide?2600:weaker,start=performance.now();
    const analysis=engine.searchPosition(state,{...settings(rating),bestOnly:rating>=2500});
    const move=selectMove(analysis,rating,random),elapsed=performance.now()-start;
    if(!engine.legalMoves(state).includes(move))throw Error('Illegal bot move');
    engine.makeMove(state,move);score.moves++;score.totalMs+=elapsed;score.maxMs=Math.max(score.maxMs,elapsed);
   }
   if(state.gameWinner==='D')score.draws++;else if(state.gameWinner===strongSide)score.wins++;else score.losses++;
   console.log(JSON.stringify({weaker,pair,strongSide,winner:state.gameWinner}));
  }
 }
 summary.push({...score,averageMs:Math.round(score.totalMs/score.moves),maxMs:Math.round(score.maxMs)});
}
console.log(JSON.stringify({note:'Seeded local self-play, paired colours; not human Elo calibration',summary},null,2));
