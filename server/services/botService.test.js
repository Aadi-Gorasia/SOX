const test=require('node:test'),assert=require('node:assert/strict');
const {BOTS,settings,selectMove,botMove,gameResult}=require('./botService');
const {deriveState,legalMoves,emptyState}=require('../engine');
const {coachReport,explainAnalysis}=require('./coachService');
test('bot strength scales search and reduces deliberate mistakes across the full slider',()=>{
 let previous=settings(400);
 for(let rating=450;rating<=2600;rating+=50){const next=settings(rating);assert.ok(next.nodeLimit>previous.nodeLimit);assert.ok(next.timeLimitMs>=previous.timeLimitMs);assert.ok(next.temperature<=previous.temperature);assert.ok(next.explore<=previous.explore);previous=next;}
 assert.equal(BOTS.length,6);for(const rating of [399,2601,NaN,1000.5])assert.throws(()=>settings(rating));
});
test('strongest bot picks the searched best; weaker bots can make varied legal choices',()=>{
 const analysis={bestMove:40,score:100,moveScores:[{move:40,score:100},{move:0,score:0},{move:80,score:-300}]};
 assert.equal(selectMove(analysis,2600,()=>.99),40);
 const values=[0,.99];assert.equal(selectMove(analysis,400,()=>values.shift()),80);
 for(const rating of [400,900,1300,1700,2100,2600])assert.ok([40,0,80].includes(selectMove(analysis,rating,()=>.5)));
});
test('bot returns legal forced-board replies and rejects corrupt positions',async()=>{
 for(const rating of [500,1300,2600]){const moves=[40,39,27,0,1];assert.ok(legalMoves(deriveState(moves)).includes(await botMove(moves,rating)));}
 await assert.rejects(botMove([0,0],900),/Invalid/);
});
test('computer outcomes are recorded without changing player ratings',()=>{
 const state=emptyState();state.gameWinner='O';assert.deepEqual({...gameResult(state,'X','owner'),endDate:null},{status:'COMPLETED',winner:null,botResult:'loss',endDate:null});
 assert.equal(gameResult(state,'O','owner').winner,'owner');state.gameWinner='D';assert.equal(gameResult(state,'X','owner').status,'DRAW');
});
test('personal coaching uses only the selected player’s moves and cites real examples',()=>{
 const report=coachReport([{side:0,moveNumber:1,analysisComplete:true,allowsMacroWin:true,regret:1000,quality:'blunder'},{side:1,moveNumber:2,analysisComplete:true,quality:'miss',regret:99999},{side:0,moveNumber:3,analysisComplete:true,wasOptimal:true,regret:0,quality:'best'}],0);
 assert.equal(report.movesAnalyzed,2);assert.deepEqual(report.tips[0].moves,[1]);assert.ok(!report.tips.some(t=>t.moves.includes(2)));
 assert.match(explainAnalysis({played:{move:40,givesFreeChoice:false,destination:4,allowsMacroWin:true},best:{move:41},quality:'blunder',regret:1000,depth:5}),/immediate macro-game win/);
});
