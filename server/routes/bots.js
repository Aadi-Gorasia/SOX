const express=require('express');
const router=express.Router();
const auth=require('../middleware/auth');
const Game=require('../models/Game');
const {deriveState,legalMoves}=require('../engine');
const {BOTS,settings,botMove,gameResult}=require('../services/botService');
router.use(auth);
router.get('/catalog',(req,res)=>res.json({bots:BOTS,minRating:400,maxRating:2600,ratingsAreEstimates:true}));
const ownerQuery=req=>({_id:req.params.id,gameType:'computer',botOwner:req.user.id});
const validId=id=>/^[a-f\d]{24}$/i.test(id);
function payload(game){return {game,state:deriveState(game.moves.map(m=>m.idx))};}
function failure(res,error){console.error('[Computer game]',error.message);return res.status(503).json({msg:'The computer is temporarily busy. Your position is saved; please retry.'});}
router.post('/',async(req,res)=>{
  const {rating=1300,side='X',botId}=req.body||{};
  try{settings(rating);}catch(e){return res.status(400).json({msg:e.message});}
  if(!['X','O','random'].includes(side))return res.status(400).json({msg:'Choose X, O, or random'});
  try{
    const active=await Game.findOne({botOwner:req.user.id,gameType:'computer',status:'ONGOING'});
    if(active)return res.json(payload(active));
    const humanSide=side==='random'?(Math.random()<.5?'X':'O'):side;
    const preset=BOTS.find(b=>b.id===botId&&b.rating===rating);
    const moves=[];if(humanSide==='O')moves.push({idx:await botMove([],rating),side:0});
    const game=await Game.create({players:[req.user.id],botOwner:req.user.id,gameType:'computer',
      bot:{name:preset?.name||'Custom bot',rating,humanSide},moves,status:'ONGOING',timeControl:'Untimed'});
    res.status(201).json(payload(game));
  }catch(e){
    if(e.code===11000){const game=await Game.findOne({botOwner:req.user.id,gameType:'computer',status:'ONGOING'});if(game)return res.json(payload(game));}
    failure(res,e);
  }
});
router.get('/:id',async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({msg:'Invalid game ID'});
  try{const game=await Game.findOne(ownerQuery(req));if(!game)return res.status(404).json({msg:'Game not found'});res.json(payload(game));}catch(e){failure(res,e);}
});
router.post('/:id/move',async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({msg:'Invalid game ID'});
  const {move,expectedPly}=req.body||{};
  if(!Number.isInteger(move)||move<0||move>80||!Number.isInteger(expectedPly)||expectedPly<0||expectedPly>80)return res.status(400).json({msg:'Invalid move'});
  try{
    const game=await Game.findOne(ownerQuery(req));if(!game)return res.status(404).json({msg:'Game not found'});
    if(game.status!=='ONGOING'||game.moves.length!==expectedPly)return res.status(409).json({msg:'The position changed. Reloading your game.'});
    const sequence=game.moves.map(m=>m.idx);let state=deriveState(sequence);
    if(!state||state.turn!==game.bot.humanSide||!legalMoves(state).includes(move))return res.status(400).json({msg:'Play in a highlighted, unfinished sector'});
    sequence.push(move);state=deriveState(sequence);
    if(!state.gameWinner){sequence.push(await botMove(sequence,game.bot.rating));state=deriveState(sequence);}
    const updated=await Game.findOneAndUpdate({...ownerQuery(req),status:'ONGOING',moves:{$size:expectedPly}},
      {$set:{moves:sequence.map((idx,i)=>({idx,side:i%2})),...gameResult(state,game.bot.humanSide,req.user.id)}},{new:true,runValidators:true});
    if(!updated)return res.status(409).json({msg:'The position changed. Reloading your game.'});
    res.json(payload(updated));
  }catch(e){failure(res,e);}
});
router.post('/:id/resign',async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({msg:'Invalid game ID'});
  try{const game=await Game.findOneAndUpdate({...ownerQuery(req),status:'ONGOING'},{$set:{status:'COMPLETED',botResult:'loss',winner:null,endDate:new Date()}},{new:true});
    if(!game)return res.status(409).json({msg:'This game has already ended'});res.json(payload(game));
  }catch(e){failure(res,e);}
});
module.exports=router;
