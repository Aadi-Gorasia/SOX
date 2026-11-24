function location(move) {
  const names=['top-left','top-middle','top-right','middle-left','centre','middle-right','bottom-left','bottom-middle','bottom-right'];
  return Number.isInteger(move)&&move>=0 ? `${String.fromCharCode(65+(Math.floor(move/9)%3))}${Math.floor(move/27)+1}, ${names[move%9]}` : 'the suggested square';
}
function explainAnalysis({played,best,quality,regret,moveNumber,side,depth}) {
  if(!played||quality==='unrated')return 'The search did not finish enough analysis to grade this move reliably.';
  const actor=side===0||side==='X'?'X':'O',opponent=actor==='X'?'O':'X';
  const lead=`${actor} played ${location(played.move)}.`;
  if(played.winsGame)return `${lead} It completes a macro line and wins the game immediately.`;
  if(best?.winsGame&&!played.winsGame)return `${lead} ${actor} had an immediate win at ${location(best.move)}; that move completes the third sector in your macro line.`;
  if(quality==='brilliant')return `${lead} ${actor} allows an immediate sector capture, yet the search proves a winning continuation. None of the other searched choices preserves that forced win. That is why this earns Brilliant.`;
  if(quality==='great')return `${lead} This is the only searched move that ${best.score>=99000?'keeps a forced win while the alternatives are forced losses':'is not shown to lose while the alternatives are forced losses'}. This distinction comes from the searched replies.`;
  const destination=played.givesFreeChoice?`${opponent} can now choose any unfinished sector.`:`${opponent} must reply in sector ${String.fromCharCode(65+(played.destination%3))}${Math.floor(played.destination/3)+1}.`;
  const tactic=played.allowsMacroWin?' That gives them an immediate macro-game win.':played.blocksMacroThreat?' This removes an immediate threat to a macro-winning sector.':played.capturesSector?' This secures the sector.':played.allowsSectorCapture?' They can capture a sector on their next move.':'';
  const comparison=regret>5?` At depth ${depth}, ${location(best.move)} evaluates ${Math.round(regret)} engine points better.`:' This matches the strongest score found at the completed search depth.';
  return `${lead} ${destination}${tactic}${comparison}`;
}
function coachReport(annotations,side) {
  const own=annotations.filter(a=>a.side===side),rated=own.filter(a=>a.analysisComplete);
  const routing=rated.filter(a=>a.allowsMacroWin&&a.regret>5);
  const missed=rated.filter(a=>a.quality==='miss');
  const choices=rated.filter(a=>a.givesFreeChoice&&a.regret>130);
  const strong=rated.filter(a=>a.wasOptimal);
  const tips=[];
  const add=(title,text,items)=>tips.push({title,text,moves:items.slice(0,3).map(a=>a.moveNumber)});
  if(routing.length)add('Check the destination before committing',`On ${routing.length} of your moves, the destination let your opponent win the macro game immediately. Check both the small-board threat and its place in the big-board line.`,routing);
  if(missed.length)add('Take the whole-board win',`You missed ${missed.length} immediate macro win${missed.length===1?'':'s'}. Before choosing a local tactic, scan sectors that complete two owned sectors in a row.`,missed);
  if(choices.length)add('Make free choice a deliberate trade',`${choices.length} costly move${choices.length===1?'':'s'} sent your opponent to a closed sector, giving them free choice. Compare that freedom with what your move actually gains.`,choices);
  if(strong.length)add('Keep this part of your game',`${strong.length} of your ${rated.length} analyzed moves were among the engine’s top choices. Revisit these decisions and the boards you sent your opponent to.`,strong);
  const costly=[...rated].sort((a,b)=>(b.regret||0)-(a.regret||0)).filter(a=>a.regret>5);
  if(!tips.length&&costly.length)add('Compare the continuation, not just the square',`Your largest searched loss was on move ${costly[0].moveNumber}. Replay the recommended line and compare which sector the opponent receives.`,costly.slice(0,1));
  if(!tips.length)add('A clean start',rated.length?'No specific tactical pattern was established in the completed search. Explore the best lines rather than treating a quiet game as error-free.':'There is not enough completed analysis yet to give reliable coaching.',[]);
  return {source:'SOX engine coach',side:side===0?'X':'O',movesAnalyzed:rated.length,totalMoves:own.length,
    headline:routing.length?'Your biggest opportunity is safer routing.':missed.length?'Finish the macro wins you create.':strong.length>=rated.length*.7&&rated.length?'Your decisions were consistently close to the engine.':'Look one reply beyond your own threat.',
    tips:tips.slice(0,4),turningPoints:costly.slice(0,3).map(a=>({moveNumber:a.moveNumber,regret:a.regret,quality:a.quality}))};
}
module.exports={explainAnalysis,coachReport};
