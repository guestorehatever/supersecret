// GIOGAMES shared game logic - runs in server.js (local mode) AND in the browser (website mode, see hub.js)
function createCore(env){
const clamp0=0;
const team=o=>({name:'',rec:'0-0',color:'#fcfb63',tc:'#111111',logo:'',score:0,to:3,td:{style:'hawks',color:'#1747d6',logo:''},...o});
const defaults=()=>({v:2,fv:6,winLive:false,winEnding:false,winTeam:'',winPick:'auto',stadium:'',tagSecs:6,tagHold:false,tagLive:false,breakLive:false,breakEnding:false,startLive:false,startEnding:false,sb:true,cam:false,bug:false,showClock:false,sbBottom:3,sbScale:1,bugScale:1,qtr:0,down:0,dist:10,spot:'',poss:'',tdp:'',flag:{team:'',pen:'',banner:false},clock:{ms:720000,running:false},
 ui:{scoreBg:'#ececec',qtrBg:'#101d24',ddBg:'#181a25'},
 away:team({name:'Farmington Knights',rec:'2-0',color:'#fcfb63',tc:'#111111',td:{style:'helmet',color:'#ffb000',logo:''}}),
 home:team({name:'Hillsboro Hawks',rec:'1-1',color:'#458df9',tc:'#ffffff',td:{style:'hawks',color:'#1747d6',logo:''}})});
let S=defaults(),clockAt=0;
const clients=new Set(),overlays=new Set();
try{const j=JSON.parse(env.load());
 if(j.v===2){const mt=(d,x)=>({...d,...(x||{}),td:{...d.td,...((x&&x.td)||{})}});
  S={...S,...j,home:mt(S.home,j.home),away:mt(S.away,j.away),ui:{...S.ui,...j.ui},tdp:'',tagLive:false,breakLive:false,breakEnding:false,startLive:false,startEnding:false,winLive:false,winEnding:false,winTeam:'',fv:6,flag:{team:'',pen:'',banner:false},clock:{ms:(j.clock&&j.clock.ms)??S.clock.ms,running:false}}}}catch(e){}
const rem=()=>S.clock.running?Math.max(0,S.clock.ms-(Date.now()-clockAt)):S.clock.ms;
const snap=()=>({...S,clock:{ms:rem(),running:S.clock.running}});
const send=(ev,d)=>env.emit(ev,d);
const push=()=>{send('',snap());try{env.save(JSON.stringify(snap()))}catch(e){}};
setInterval(()=>{if(S.clock.running&&rem()<=0){S.clock={ms:0,running:false};push()}},250);
const patch=(src,dst)=>{for(const k in src){if(k==='clock'||k==='tdp'||k==='tagLive'||k==='breakLive'||k==='breakEnding'||k==='startLive'||k==='startEnding'||k==='winLive'||k==='winEnding'||k==='winTeam'||k==='flag'||k==='v'||k==='fv'||!(k in dst))continue;
 if(src[k]&&typeof src[k]==='object'&&dst[k]&&typeof dst[k]==='object')patch(src[k],dst[k]);else if(typeof src[k]===typeof dst[k])dst[k]=src[k]}};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// touchdown = overlay slides the board down, plays the animation, slides the board back up, THEN the +6 is added
let tdId=0,pend=null,tagTok=0;
const tdPayload=t=>({style:t.td.style,color:t.td.color,logo:t.td.style==='custom'?(t.td.logo||t.logo):''});
const applyPend=()=>{if(!pend)return;clearTimeout(pend.timer);const t=S[pend.team];if(t)t.score+=6;pend=null;S.tdp='';push()};
const API={
 state:b=>patch(b,S),
 score:b=>{const t=S[b.team];if(t)t.score=Math.max(0,t.score+(+b.delta||0))},
 to:b=>{const t=S[b.team];if(t)t.to=clamp(t.to+(+b.delta||0),0,3)},
 touchdown:b=>{const t=S[b.team];if(!t||pend)return;
  if(!env.ov()||S.breakLive||S.startLive||S.winLive){t.score+=6;return}   // no overlay, or an ad break / starting-soon screen is on: just add the points
  const id=++tdId;pend={id,team:b.team,timer:setTimeout(applyPend,22000)};S.tdp=b.team;send('trigger',{id,team:b.team,...tdPayload(t)})},
 tddone:b=>{if(pend&&+b.id===pend.id)applyPend()},
 tdnow:()=>applyPend(),
 trigger:b=>{const t=S[b.team];if(t)send('trigger',{id:0,team:b.team,...tdPayload(t)})},
 // FLAG: one button throws it (3D flag + yellow FLAG banner). Then pick the team (black plate) and the penalty (tab on that team's side).
 flag:()=>{S.flag={team:'',pen:'',banner:true};send('flag',{})},
 flaganim:()=>{send('flag',{})},
 flagteam:b=>{if(b.team==='home'||b.team==='away')S.flag.team=b.team;else{S.flag.team='';S.flag.pen=''}},
 flagpen:b=>{if(S.flag.team)S.flag.pen=String(b.pen||'').slice(0,60)},
 // CHANNEL TAG: stadium name is kept in state; this just fires the animation (the overlay hides the board, plays it, brings the board back)
 // secs = how long it stays up (5-300); hold = stay up until you press STOP (tagstop). tagLive tells the controller it is on air.
 tag:b=>{if(typeof b.stadium==='string')S.stadium=b.stadium.slice(0,60);
  if(b.secs!=null)S.tagSecs=clamp(Math.round(+b.secs)||6,5,300);
  if(S.tagLive||pend||S.breakLive||S.startLive||S.winLive)return;
  const secs=clamp(Math.round(+S.tagSecs)||6,5,300),hold=!!S.tagHold,tok=++tagTok;
  send('tag',{stadium:S.stadium,secs,hold});
  if(env.ov()){S.tagLive=true;if(!hold)setTimeout(()=>{if(tagTok===tok&&S.tagLive){S.tagLive=false;push()}},secs*1000+1500)}},
 tagstop:()=>{if(!S.tagLive)return;S.tagLive=false;tagTok++;send('tagstop',{})},
 // AD BREAK: board + bug leave, screen fades to black, full-screen logo / WE'LL BE RIGHT BACK / compact scores. breakoff fades it back out; the overlay confirms with breakdone.
 breakon:()=>{if(S.breakLive||S.startLive||S.winLive||pend||!env.ov())return;
  if(S.tagLive){S.tagLive=false;tagTok++;send('tagstop',{})}
  S.breakLive=true;S.breakEnding=false;send('break',{})},
 breakoff:()=>{if(!S.breakLive||S.breakEnding)return;S.breakEnding=true;send('breakend',{})},
 breakdone:()=>{S.breakLive=false;S.breakEnding=false},
 // STARTING SOON: the overlay shows it every time it loads (it tells us with startsoon, so the controller knows). startoff = DISABLE: the overlay plays
 // public/starting.mov, fades to transparent and brings the board + bug back, then confirms with startdone. starton = ENABLE it again.
 startsoon:()=>{if(!env.ov())return;S.startLive=true;S.startEnding=false},
 starton:()=>{if(S.startLive||S.breakLive||S.winLive||pend||!env.ov())return;
  if(S.tagLive){S.tagLive=false;tagTok++;send('tagstop',{})}
  S.startLive=true;S.startEnding=false;send('start',{})},
 startoff:()=>{if(!S.startLive||S.startEnding)return;S.startEnding=true;send('startend',{})},
 startdone:()=>{S.startLive=false;S.startEnding=false},
 // SHOW WINNER: board + bug leave, the winner's 3D touchdown logo + "TEAM WINS!" play, then the final score - and it stays up until winoff.
 // winPick: 'auto' (higher score; a tie needs a manual pick) | 'home' | 'away'. The overlay confirms the exit with windone.
 winon:()=>{if(S.winLive||pend||S.breakLive||S.startLive||!env.ov())return;
  const k=(S.winPick==='home'||S.winPick==='away')?S.winPick:(S.home.score===S.away.score?'':(S.home.score>S.away.score?'home':'away'));
  if(!k)return;
  if(S.tagLive){S.tagLive=false;tagTok++;send('tagstop',{})}
  S.winLive=true;S.winEnding=false;S.winTeam=k;const t=S[k];
  send('win',{team:k,...tdPayload(t),name:t.name,away:{name:S.away.name,score:S.away.score},home:{name:S.home.name,score:S.home.score}})},
 winoff:()=>{if(!S.winLive||S.winEnding)return;S.winEnding=true;send('winend',{})},
 windone:()=>{S.winLive=false;S.winEnding=false;S.winTeam=''},
 flagclear:()=>{S.flag={team:'',pen:'',banner:false}},
 clock:b=>{const r=rem();
  if(b.action==='start'&&r>0){S.clock={ms:r,running:true};clockAt=Date.now()}
  else if(b.action==='stop')S.clock={ms:r,running:false};
  else if(b.action==='set')S.clock={ms:clamp(+b.ms||0,0,5999000),running:false};
  else if(b.action==='nudge'){S.clock.ms=clamp(r+(+b.ms||0),0,5999000);clockAt=Date.now()}},
 reset:()=>{const d=defaults();for(const k of['home','away']){S[k].score=0;S[k].to=3}Object.assign(S,{qtr:d.qtr,down:d.down,dist:d.dist,spot:'',poss:'',flag:{team:'',pen:'',banner:false},clock:d.clock})}
};
const overlayGone=()=>{if(!env.ov()&&(S.tagLive||S.breakLive||S.startLive||S.winLive)){S.winLive=false;S.winEnding=false;S.winTeam='';S.tagLive=false;S.breakLive=false;S.breakEnding=false;S.startLive=false;S.startEnding=false;push()}};
return{API,snap,push,overlayGone,call:(n,b)=>{const f=API[n];if(!f)return false;f(b||{});push();return true}};
}
if(typeof module!=='undefined')module.exports=createCore;else window.createCore=createCore;
