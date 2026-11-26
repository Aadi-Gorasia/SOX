const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),express=require('express'),jwt=require('jsonwebtoken');
const User=require('../models/User'),router=require('../routes/users');
test('appearance choices validate and round-trip without losing gameplay preferences',async t=>{
 const previous=User.findById,secret=process.env.JWT_SECRET;process.env.JWT_SECRET='appearance-test-only';
 const user=new User({_id:'000000000000000000000001',username:'Tester',email:'test@example.invalid',preferences:{landingPage:'play',victoryAnimation:false}});
 user.save=async()=>user;User.findById=async()=>user;
 const app=express();app.use(express.json());app.use('/api/users',router);const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{User.findById=previous;if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;await new Promise(r=>server.close(r))});
 const call=async(body,auth=true)=>fetch(`http://127.0.0.1:${server.address().port}/api/users/preferences`,{method:'PUT',headers:{'Content-Type':'application/json',...(auth?{'x-auth-token':jwt.sign({user:{id:user.id}},process.env.JWT_SECRET)}:{})},body:JSON.stringify(body)});
 assert.equal((await call({},false)).status,401);
 for(const board of ['green','brown','blue','walnut','slate','purple','rose','contrast']){
  const r=await call({themePreference:'system',preferences:{boardTheme:board,pieceSet:'serif',backgroundTheme:'linen'}});assert.equal(r.status,200);const d=await r.json();assert.equal(d.preferences.boardTheme,board);assert.equal(d.preferences.pieceSet,'serif');assert.equal(d.preferences.backgroundTheme,'linen');assert.equal(d.preferences.landingPage,'play');assert.equal(d.preferences.victoryAnimation,false);
 }
 for(const preferences of [{boardTheme:'missing'},{pieceSet:'url(x)'},{backgroundTheme:'https://bad.invalid'},{highContrast:'true'}])assert.equal((await call({themePreference:'light',preferences})).status,400);
 assert.equal((await call({themePreference:'invalid',preferences:{}})).status,400);
 const r=await call({themePreference:'dark',preferences:{pieceSet:'bold',unsafe:'ignored'}});assert.equal(r.status,200);assert.equal((await r.json()).preferences.unsafe,undefined);
 assert.equal(user.toObject().preferences.pieceSet,'bold');assert.equal(user.toObject().themePreference,'dark');
});
