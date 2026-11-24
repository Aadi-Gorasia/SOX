const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyState, legalMoves, makeMove, unmakeMove, cloneState, searchPosition } = require('./index');
const { WIN_SCORE } = require('./constants');
const { evaluateState } = require('./evaluation');
const { SearchPool } = require('./asyncSearch');

// Independent, unpruned minimax oracle: no TT, move ordering, extensions or PVS.
function oracle(state, depth, ply = 0) {
  if (state.gameWinner) return state.gameWinner === 'D' ? 0 : state.gameWinner === state.turn ? WIN_SCORE-ply : -WIN_SCORE+ply;
  if (!depth) return (state.turn === 'X' ? 1 : -1) * evaluateState(state);
  const moves = legalMoves(state);
  if (!moves.length) return 0;
  return Math.max(...moves.map(move => {
    const undo = makeMove(state, move);
    const score = -oracle(state, depth-1, ply+1);
    unmakeMove(state, undo); return score;
  }));
}
let seed = 1234567;
function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed / 2**32; }
function positions(count, late = false) {
  const found = [];
  for (let game = 0; game < 2000 && found.length < count; game++) {
    const state = emptyState();
    for (let ply = 0; !state.gameWinner; ply++) {
      const empties = state.boards.reduce((sum,b,i) => sum+(state.winners[i]?0:b.filter(m=>!m).length),0);
      if ((late ? empties <= 7 : ply === 20+game%20) && legalMoves(state).length > 1) { found.push(cloneState(state)); break; }
      const moves = legalMoves(state); if (!moves.length) break;
      makeMove(state, moves[Math.floor(random()*moves.length)]);
    }
  }
  assert.equal(found.length,count); return found;
}

test('PVS and transposition bounds match unpruned minimax for every root move', () => {
  for (const state of positions(12)) {
    const expected = new Map(legalMoves(state).map(move => {
      const undo = makeMove(state,move); const score = -oracle(state,2,1); unmakeMove(state,undo); return [move,score];
    }));
    for (const tableLimit of [0,10000]) {
      const result = searchPosition(state,{maxDepth:3,nodeLimit:500000,timeLimitMs:10000,tacticalDepth:0,tableLimit});
      // A proven mate may finish before depth 3. Those are checked by the endgame oracle below.
      if (result.depth !== 3) { assert.ok(result.solved); continue; }
      for (const candidate of result.moveScores) assert.equal(candidate.score,expected.get(candidate.move));
    }
  }
});

test('small legal endgames agree with exhaustive terminal search', () => {
  for (const state of positions(16,true)) {
    const optimal = oracle(state,81);
    const result = searchPosition(state,{maxDepth:81,nodeLimit:500000,timeLimitMs:10000});
    assert.equal(result.score || 0,optimal || 0); assert.equal(result.solved,true);
    const undo = makeMove(state,result.bestMove);
    assert.equal(-oracle(state,81,1) || 0,optimal || 0); unmakeMove(state,undo);
    assert.ok(result.principalVariation.every(move => {
      if (!legalMoves(state).includes(move)) return false; makeMove(state,move); return true;
    }));
  }
});

test('sending the opponent to a macro-winning sector loses; routing away survives', () => {
  const state = emptyState(); state.turn='X'; state.activeBoard=4;
  state.winners[0]='O'; state.winners[1]='O'; state.boards[2][0]='O';state.boards[2][1]='O';
  const result=searchPosition(state,{maxDepth:2,nodeLimit:50000,timeLimitMs:3000,tacticalDepth:0});
  const trap=result.moveScores.find(x=>x.move===38); // sector 4, cell 2 sends O to sector 2.
  assert.equal(trap.score,-WIN_SCORE+2);
  assert.notEqual(result.bestMove,38);
  assert.ok(result.score>trap.score);
});

test('budget exhaustion returns a legal labelled fallback and leaves input unchanged', () => {
  const state=emptyState(),before=JSON.stringify(state);
  const result=searchPosition(state,{nodeLimit:1,maxDepth:81,timeLimitMs:100});
  assert.equal(JSON.stringify(state),before); assert.ok(legalMoves(state).includes(result.bestMove));
  assert.equal(result.depth,0);assert.equal(result.scoreType,'static-fallback');assert.equal(result.solved,false);
  assert.ok(result.nodes<=1); assert.equal(result.moveScores.length,81);
});

test('search returns only completed iterations on interruption', () => {
  const state=emptyState(); makeMove(state,40);
  const result=searchPosition(state,{nodeLimit:100,maxDepth:81,tacticalDepth:0});
  const expected=searchPosition(state,{nodeLimit:100000,maxDepth:result.depth,tacticalDepth:0});
  assert.ok(result.depth>0);assert.deepEqual(result.moveScores,expected.moveScores);
});

test('closed sectors route to free choice, and terminal scores retain the winner', () => {
  const state=emptyState();state.winners[4]='D';const undo=makeMove(state,4);
  assert.equal(state.activeBoard,null);unmakeMove(state,undo);
  state.gameWinner='X';state.turn='O';assert.equal(searchPosition(state).score,-WIN_SCORE);
});

test('workers keep the event loop responsive, enforce queue limits and shut down', async () => {
  const pool=new SearchPool({size:1,queueLimit:1});let ticks=0;
  const timer=setInterval(()=>ticks++,5);
  try {
    const first=pool.search(emptyState(),{nodeLimit:10000,timeLimitMs:1000});
    const second=pool.search(emptyState(),{nodeLimit:20});
    await assert.rejects(pool.search(emptyState()),/busy/);
    const results=await Promise.all([first,second]);assert.ok(ticks>0);assert.ok(results.every(r=>r.bestMove>=0));
  } finally {clearInterval(timer);await pool.close();}
  await assert.rejects(pool.search(emptyState()),/closed/);
});

test('focused hint search picks the same minimax score as all-move analysis', () => {
  for(const state of positions(8)) {
    const options={maxDepth:3,nodeLimit:500000,timeLimitMs:10000,tacticalDepth:0};
    const full=searchPosition(state,options),focused=searchPosition(state,{...options,bestOnly:true});
    assert.equal(focused.score,full.score);
    assert.equal(full.moveScores.find(m=>m.move===focused.bestMove).score,full.score);
    assert.equal(focused.moveScores[0].scoreBound,'exact');
  }
});

test('root symmetry removes equivalent work without changing any move score', () => {
  const state=emptyState();makeMove(state,40);
  const options={maxDepth:4,nodeLimit:500000,timeLimitMs:10000,tacticalDepth:0};
  const reduced=searchPosition(state,options),full=searchPosition(state,{...options,symmetry:false});
  assert.deepEqual(reduced.moveScores,full.moveScores);assert.equal(reduced.rootSymmetries,8);
  assert.ok(reduced.nodes<full.nodes);
});

test('rotated positions preserve routing and minimax value', () => {
  const {TRANSFORMS}=require('./symmetry');
  for(const state of positions(4)) {
    const options={maxDepth:3,nodeLimit:500000,timeLimitMs:10000,tacticalDepth:0};
    const original=searchPosition(state,options);
    for(const map of TRANSFORMS) {
      const rotated=emptyState();rotated.turn=state.turn;
      rotated.activeBoard=state.activeBoard===null?null:map[state.activeBoard];
      for(let sector=0;sector<9;sector++) {
        rotated.winners[map[sector]]=state.winners[sector];
        for(let cell=0;cell<9;cell++)rotated.boards[map[sector]][map[cell]]=state.boards[sector][cell];
      }
      const result=searchPosition(rotated,options);assert.equal(result.score,original.score);
      const transformedBest=map[Math.floor(original.bestMove/9)]*9+map[original.bestMove%9];
      assert.equal(result.moveScores.find(m=>m.move===transformedBest).score,result.score);
    }
  }
});

test('blocked macro lines are a proven draw even with legal moves remaining', () => {
  const state=emptyState();state.winners=['X','O','X','X','O','O','O','X',null];state.activeBoard=8;
  const result=searchPosition(state);assert.equal(result.solved,true);assert.equal(result.score,0);
  assert.equal(result.scoreType,'proven-draw');assert.equal(result.moveScores.length,9);
});
