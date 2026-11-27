const test = require('node:test');
const assert = require('node:assert/strict');
const GameManager = require('./GameManager');
const User = require('../models/User');
const engine = require('../engine');
function harness() {
  let now = 1000, saves = [], ratings = [];
  const events = [];
  const manager = new GameManager({to: room => ({emit: (event, data) => events.push({room,event,data})})}, {
    now: () => now,
    saveGameResult: async data => { saves.push(data); return '000000000000000000000099'; },
    updateEloAndStats: async (...args) => { ratings.push(args); return null; }
  });
  manager.startGameTimer = () => {};
  return {manager,events,saves,ratings,advance: ms => now += ms};
}
function players(t) {
  t.mock.method(User, 'findById', id => ({select: async () => ({_id:String(id),id:String(id),username:String(id),elo:1200})}));
  return ['x','o'].map(userId => ({id:'socket-'+userId,userId,join(){},emit(){}}));
}
test('clock charges time between ticks and rejects moves after flag fall', async t => {
  const h=harness(), sockets=players(t);
  const game=await h.manager.createGame(sockets,'1+2','X','O');
  h.advance(450);
  await h.manager.makeMove(sockets[0],{gameId:game.id,boardIndex:4,cellIndex:4});
  assert.equal(game.playerTimes[0],61550);
  h.advance(60001);
  await h.manager.makeMove(sockets[1],{gameId:game.id,boardIndex:4,cellIndex:0});
  assert.equal(game.moves.length,1);assert.equal(game.gameWinner,'X');assert.equal(game.playerTimes[1],0);
});
test('private waiting time is free, results are unrated and reconnect exposes saved review ID', async t => {
  const h=harness(), [host,guest]=players(t);
  const game=await h.manager.createPrivateGame(host,'1+0','X');
  h.advance(180000);await h.manager.joinGame(guest,game.id);
  h.advance(500);h.manager.settleClock(game);assert.equal(game.playerTimes[0],59500);
  await h.manager.endGame(game.id,{winner:'O',reason:'resignation'});
  assert.equal(h.ratings.length,0);assert.equal(h.saves.length,1);assert.equal(h.saves[0].rated,false);
  assert.equal(game.savedGameId,'000000000000000000000099');
  const received=[];await h.manager.joinGame({...host,id:'new-socket',emit:(event,data)=>received.push({event,data})},game.id);
  assert.equal(received.find(e=>e.event==='gameEnded').data.savedGameId,game.savedGameId);
  await h.manager.endGame(game.id,{winner:'X',reason:'resignation'});assert.equal(h.saves.length,1);
});
test('reconnecting replaces the socket, preserves the position, and rejects the old socket', async t => {
  const h=harness(), sockets=players(t);const game=await h.manager.createGame(sockets,'5+0','X','O');
  const fresh={...sockets[0],id:'fresh-x'};await h.manager.joinGame(fresh,game.id);
  await h.manager.makeMove(sockets[0],{gameId:game.id,boardIndex:0,cellIndex:0});assert.equal(game.moves.length,0);
  await h.manager.makeMove(fresh,{gameId:game.id,boardIndex:0,cellIndex:0});assert.equal(game.moves.length,1);
  assert.equal(game.playerToMove,sockets[1].id);
});
test('100 simultaneous games keep players, clocks and legal states isolated', async t => {
  players(t);const h=harness();let seed=431;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
  const matches=await Promise.all(Array.from({length:100},(_,i)=>{
    const sockets=[0,1].map(n=>({id:`s-${i}-${n}`,userId:`u-${i}-${n}`,join(){},emit(){}}));
    return h.manager.createGame(sockets,'5+1','X','O').then(game=>({game,sockets,state:engine.emptyState()}));
  }));
  assert.equal(h.manager.activeUserGames.size,200);assert.equal(h.manager.pendingUserGames.size,0);
  for(let ply=0;ply<81;ply++) for(const {game,sockets,state} of matches) {
    if(state.gameWinner) continue;
    const legal=engine.legalMoves(state),idx=legal[Math.floor(random()*legal.length)];
    await h.manager.makeMove(sockets[state.turn==='X'?0:1],{gameId:game.id,boardIndex:Math.floor(idx/9),cellIndex:idx%9});
    engine.makeMove(state,idx);
    assert.deepEqual(game.allBoards,state.boards);assert.deepEqual(game.boardWinners,state.winners);
    assert.equal(game.gameWinner,state.gameWinner);
    if(!game.gameWinner) assert.equal(game.activeBoard,state.activeBoard);
  }
  assert.equal(h.saves.length,100);assert.equal(h.manager.activeUserGames.size,0);
});
test('simultaneous requests cannot give one player two active games', async t => {
  const h=harness(),sockets=players(t);
  const results=await Promise.allSettled([h.manager.createGame(sockets,'5+0','X','O'),h.manager.createPrivateGame(sockets[0],'5+0')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(h.manager.games.size,1);assert.equal(h.manager.pendingUserGames.size,0);
});
