const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {Server}=require('socket.io');
const {io:client}=require('socket.io-client');
const GameManager=require('./GameManager');
const User=require('../models/User');
function receive(socket,event,predicate=()=>true){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{socket.off(event,handler);reject(Error('Timed out waiting for '+event));},5000);
 const handler=data=>{if(!predicate(data))return;clearTimeout(timer);socket.off(event,handler);resolve(data)};
 socket.on(event,handler);
});}
test('real Socket.IO clients reconnect, rejoin and continue a private game',async t=>{
 t.mock.method(User,'findById',id=>({select:async()=>({_id:id,id,username:id,elo:1200})}));
 const server=http.createServer(),io=new Server(server);
 const manager=new GameManager(io,{saveGameResult:async()=> 'saved',updateEloAndStats:async()=>null});
 io.use((socket,next)=>{socket.userId=socket.handshake.auth.userId;next()});
 io.on('connection',socket=>{
  socket.on('joinGame',id=>manager.joinGame(socket,id));
  socket.on('makeMove',data=>manager.makeMove(socket,data));
  socket.on('disconnect',()=>manager.handleDisconnect(socket));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const x=client(url,{auth:{userId:'x'},transports:['websocket'],reconnectionDelay:10});
 const o=client(url,{auth:{userId:'o'},transports:['websocket'],reconnectionDelay:10});
 t.after(async()=>{x.close();o.close();for(const timer of manager.timers.values())clearInterval(timer);await new Promise(resolve=>io.close(resolve));});
 await Promise.all([receive(x,'connect'),receive(o,'connect')]);
 const game=await manager.createPrivateGame(io.sockets.sockets.get(x.id),'5+0');
 const started=receive(x,'updateGame',g=>!g.waitingForOpponent);o.emit('joinGame',game.id);await started;
 const first=receive(o,'updateGame',g=>g.moves.length===1);x.emit('makeMove',{gameId:game.id,boardIndex:4,cellIndex:4});await first;
 const old=o.id;
 o.on('connect',()=>o.emit('joinGame',game.id));
 const reconnect=receive(o,'updateGame',g=>g.players[1]!==old);
 io.sockets.sockets.get(old).conn.close();
 const restored=await reconnect;assert.equal(restored.moves.length,1);assert.equal(restored.playerToMove,o.id);
 const reply=receive(x,'updateGame',g=>g.moves.length===2);o.emit('makeMove',{gameId:game.id,boardIndex:4,cellIndex:0});
 const updated=await reply;assert.equal(updated.allBoards[4][0],'O');assert.equal(updated.playerToMove,x.id);
});
