// GIOGAMES website mode (no Node server). PAIRING: the OVERLAY page is the hub. Before it shows anything it shows a join code;
// you type that code into the control deck, and when they connect (peer-to-peer, WebRTC via PeerJS) the overlay goes on to the starting-soon screen.
(()=>{
const Q=new URLSearchParams(location.search),LOCAL=/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
if(!(Q.has('room')||(location.protocol==='https:'&&!LOCAL)))return;           // local Node mode: do nothing
const ls=(k,v)=>{try{return v===undefined?localStorage.getItem(k):v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
const clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12),gen=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s};
const overlayPage=/overlay/.test(location.pathname),embedded=Q.has('embed')&&parent!==window,isHost=overlayPage&&!embedded;
let room=embedded?'EMBED':clean(Q.get('room'))||(isHost?clean(ls('gio-home'))||gen():clean(ls('gio-last')));
if(isHost)ls('gio-home',room);                                             // the overlay's code is permanent on its device (use ?room=MYCODE once to choose your own)
const base=location.origin+location.pathname.replace(/[^/]*$/,'');
const G=window.__gio={web:true,status:'',get room(){return room},get overlayUrl(){return base+'overlay.html?room='+room},get controlUrl(){return base+'?room='+room}};
const status=t=>{G.status=t;window.__gioStatus&&window.__gioStatus(t)};
const ready=new Promise(r=>window.__gioReady=r);let hub=null;
const listeners=new Set(),rid=()=>Math.random().toString(36).slice(2);
class ES{constructor(u){this.o=/[?&]o=1/.test(u);this.h={};this.l={id:rid(),o:this.o,fire:(ev,d)=>this.fire(ev,d)};ready.then(()=>hub.listen(this.l))}
 addEventListener(ev,f){(this.h[ev]=this.h[ev]||[]).push(f)}
 fire(ev,d){if(ev==='_err'){this.onerror&&this.onerror();return}if(ev==='')this.onmessage&&this.onmessage({data:d});else(this.h[ev]||[]).forEach(f=>f({data:d}))}
 close(){hub&&hub.unlisten(this.l)}}
window.EventSource=ES;
const rf=window.fetch.bind(window);
window.fetch=(u,o)=>{const m=/^\/api\/([a-z]+)/.exec(String(u));if(!m)return rf(u,o);
 let b={};try{b=o&&o.body?JSON.parse(o.body):{}}catch(e){}
 return ready.then(()=>hub.call(m[1],b)).then(ok=>({ok,status:ok?200:404}))};
if(embedded){const t=setInterval(()=>{if(parent.__gioHub){clearInterval(t);hub=parent.__gioHub;window.__gioReady()}},50);return}   // preview iframe inside the controller shares the controller's connection
const ownTurn=Array.isArray(window.GIO_TURN)&&window.GIO_TURN.length;
const ICE={config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}].concat(ownTurn?window.GIO_TURN:
 [{urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}])}};
if(Q.has('relay'))ICE.config.iceTransportPolicy='relay';   // TEST: add &relay=1 to force every byte through the relay - if it still connects, it will work from anywhere
const pathOf=c=>new Promise(r=>{try{c.peerConnection.getStats().then(st=>{let sel=null,pair=null;st.forEach(x=>{if(x.type==='transport'&&x.selectedCandidatePairId)sel=x.selectedCandidatePairId});
 st.forEach(x=>{if(x.type==='candidate-pair'&&(x.id===sel||x.selected||x.nominated&&x.state==='succeeded'))pair=pair||x});
 const l=pair&&st.get(pair.localCandidateId),rm=pair&&st.get(pair.remoteCandidateId),t=[l&&l.candidateType,rm&&rm.candidateType];
 r(!pair?'':t.includes('relay')?'via relay (works across different networks)':'direct (same network or open path)')}).catch(()=>r(''))}catch(e){r('')}});
const ID=c=>'giogames-'+c;
const load=()=>new Promise((ok,no)=>{if(window.Peer)return ok();const s=document.createElement('script');s.src='peerjs.min.js';
 s.onload=ok;s.onerror=()=>{const c=document.createElement('script');c.src='https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';c.onload=ok;c.onerror=no;document.head.appendChild(c)};document.head.appendChild(s)});
const mount=d=>{const add=()=>document.body.appendChild(d);document.body?add():addEventListener('DOMContentLoaded',add)};
// ---- the code screen the overlay shows first
function hostGate(code){const d=document.createElement('div');
 d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#05070c;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;text-align:center;transition:opacity .6s';
 d.innerHTML='<div style="font:800 2vw system-ui;letter-spacing:.3em;color:#19c3ff">GIOGAMES FOOTBALL</div><div style="font:600 2.4vw system-ui;margin:2.5vw 0 1vw;opacity:.85">Enter this code in the control deck</div><div style="font:900 13vw/1 system-ui;letter-spacing:.12em;color:#ffd400;text-shadow:0 0 3vw rgba(255,212,0,.45)">'+code+'</div><div class="st" style="font:600 1.6vw system-ui;margin-top:3vw;opacity:.7">Starting...</div>';
 mount(d);return{status:t=>{const e=d.querySelector('.st');if(e)e.textContent=t},hide:()=>{d.style.opacity=0;setTimeout(()=>d.remove(),700)}}}
// ---- the code box the control deck shows until it is connected
function clientGate(onGo){const d=document.createElement('div');
 d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#06080d;color:#eef3ff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;font-family:system-ui,sans-serif;text-align:center';
 d.innerHTML='<div style="font:800 14px system-ui;letter-spacing:.3em;color:#19c3ff">GIOGAMES CONTROL DECK</div><div style="font:700 20px system-ui">Enter the code shown on your overlay screen</div><input class="in" maxlength="12" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" style="width:min(320px,80vw);font:900 34px system-ui;letter-spacing:.2em;text-align:center;text-transform:uppercase;padding:12px;border-radius:14px;border:2px solid #19c3ff;background:#0d121c;color:#ffd400"><button class="go" style="font:800 18px system-ui;padding:14px 28px;border-radius:14px;border:0;background:#19c3ff;color:#00212e">Connect</button><div class="ms" style="font:600 14px system-ui;opacity:.85;max-width:80vw"></div>';
 const inp=d.querySelector('.in'),go=()=>{const v=clean(inp.value);if(v)onGo(v)};
 d.querySelector('.go').addEventListener('click',go);inp.addEventListener('keydown',e=>{if(e.key==='Enter')go()});
 mount(d);return{msg:t=>{const e=d.querySelector('.ms');if(e)e.textContent=t},fill:v=>{inp.value=v},hide:()=>d.remove()}}
// ---- HOST (overlay page): runs core.js, shows the code, waits for a control deck
function startHub(){
 const conns=new Set(),pending=new Set();let paired=false,tries=0;const gate=hostGate(room);
 const env={emit:(ev,d)=>{const s=JSON.stringify(d);listeners.forEach(l=>{if(l.o&&!paired)return;l.fire(ev,s)});conns.forEach(c=>c.open&&c.send({t:'ev',ev,d:s}))},
  save:j=>ls('gio-state',j),load:()=>ls('gio-state')||'{}',
  ov:()=>[...listeners].filter(l=>l.o).length+[...conns].filter(c=>c.ovl).length};
 const core=createCore(env);
 const pair=()=>{if(paired)return;paired=true;gate.hide();status('Control deck connected');pending.forEach(l=>l.fire('',JSON.stringify(core.snap())));pending.clear()};
 hub={call:async(n,b)=>core.call(n,b),listen:l=>{listeners.add(l);if(l.o&&!paired)pending.add(l);else l.fire('',JSON.stringify(core.snap()))},unlisten:l=>{listeners.delete(l);pending.delete(l)}};
 window.__gioHub=hub;window.__gioReady();gate.status('Contacting the free PeerJS broker...');
 let cp=null,downAt=Date.now();
 const mk=()=>{const p=cp=new Peer(ID(room),ICE);downAt=Date.now();
 p.on('open',()=>{if(cp===p){downAt=0;gate.status('Waiting for the control deck to connect...')}});
 p.on('connection',c=>{c.ks={};c.last=Date.now();
  c.on('data',m=>{c.last=Date.now();
   if(m.t==='ping')c.send({t:'pong'});
   else if(m.t==='sub'){c.ks[m.k]=!!m.o;c.ovl=Object.values(c.ks).some(Boolean);conns.add(c);c.send({t:'ev',ev:'',d:JSON.stringify(core.snap())});if(!m.o){pair();setTimeout(()=>pathOf(c).then(t=>t&&status('Control deck connected - '+t)),1500)}}
   else if(m.t==='unsub'){delete c.ks[m.k];c.ovl=Object.values(c.ks).some(Boolean)}
   else if(m.t==='api')c.send({t:'res',id:m.id,ok:core.call(m.n,m.b)})});
  c.on('close',()=>{conns.delete(c);core.overlayGone()});c.on('error',()=>conns.delete(c))});
 p.on('disconnected',()=>{if(cp===p){downAt=downAt||Date.now();try{p.reconnect()}catch(e){}}});
 p.on('error',e=>{if(cp!==p)return;try{p.destroy()}catch(x){}
  if(e.type==='unavailable-id'){const m=++tries>4?'This code is already open on another overlay page. Close it, or open this overlay with ?room=NEWCODE.':'Code still reserved by an earlier session, retrying...';gate.status(m);status(m)}
  else gate.status('Connection problem ('+e.type+'). Retrying...');
  setTimeout(()=>{if(cp===p)mk()},3500)})};
 mk();
 // watchdog: drop control decks that went silent (their internet died), and rebuild our own broker link if it stays down
 setInterval(()=>{const now=Date.now();let gone=false;conns.forEach(c=>{if(now-c.last>10000){try{c.close()}catch(e){}conns.delete(c);gone=true}});if(gone)core.overlayGone();
  if(cp&&(cp.disconnected||cp.destroyed||!cp.open)&&downAt&&now-downAt>12000){downAt=now;const o=cp;cp=null;try{o.destroy()}catch(e){}status('Rebuilding connection...');mk()}},3000);
 if(typeof addEventListener==='function')addEventListener('online',()=>{if(cp&&cp.disconnected)try{cp.reconnect()}catch(e){}downAt=Date.now()-9000});
}
// ---- CLIENT (control deck): asks for the code, connects, then the deck works as normal
function startClient(){
 const pend={};let code=room,p=null,c=null,live=false,ever=false,n=0,cur=0,t=0,lastPong=0,downSince=Date.now();
 const gate=clientGate(v=>{code=v;ever=false;rebuild(0)});
 const send=m=>{try{if(c&&c.open)c.send(m)}catch(e){}};
 hub={call:(n2,b)=>new Promise(r=>{if(!c||!c.open||!live)return r(false);const id=++n;pend[id]=r;send({t:'api',id,n:n2,b})}),
  listen:l=>{listeners.add(l);send({t:'sub',k:l.id,o:l.o})},unlisten:l=>{listeners.delete(l);send({t:'unsub',k:l.id})}};
 window.__gioHub=hub;
 // tear everything down and start fresh (handles wifi <-> mobile-data switches, sleeping phones, dead connections)
 function rebuild(delay,why){clearTimeout(t);cur++;try{c&&c.close()}catch(e){}try{p&&p.destroy()}catch(e){}c=null;p=null;
  if(live){live=false;listeners.forEach(l=>l.fire('_err'))}
  Object.keys(pend).forEach(k=>{pend[k](false);delete pend[k]});
  if(why){status(why);if(!ever)gate.msg(why)}downSince=Date.now();t=setTimeout(newPeer,delay)}
 function newPeer(){const pp=p=new Peer(undefined,ICE);
  pp.on('open',()=>{if(p===pp)connect()});
  pp.on('disconnected',()=>{if(p===pp)try{pp.reconnect()}catch(e){}});
  pp.on('error',e=>{if(p!==pp)return;
   if(e.type==='peer-unavailable'){const m=ever?'Overlay not reachable yet - retrying...':'No overlay is showing the code '+code+' yet. Check the code on the overlay screen (open the overlay page first).';status(m);gate.msg(m);clearTimeout(t);t=setTimeout(connect,3000)}
   else rebuild(3000,'Connection problem ('+e.type+'). Retrying...')})}
 function connect(){clearTimeout(t);if(!p||!p.open)return;const my=++cur;gate.fill(code);if(!ever)gate.msg('Connecting to the overlay showing '+code+'...');
  const cc=c=p.connect(ID(code),{reliable:true});
  const slow=setTimeout(()=>{if(cur===my&&!cc.open&&!ever)gate.msg('Still trying... if it never connects, the overlay page may not be open, or this network blocks direct connections.')},8000);
  cc.on('open',()=>{if(cur!==my)return;clearTimeout(slow);room=code;ls('gio-last',code);ever=live=true;lastPong=Date.now();gate.hide();status('Connected to the overlay showing '+code);
   listeners.forEach(l=>cc.send({t:'sub',k:l.id,o:l.o}));window.__gioReady();setTimeout(()=>pathOf(cc).then(x=>x&&live&&status('Connected to the overlay showing '+code+' - '+x)),1500)});
  cc.on('data',m=>{if(cur!==my)return;lastPong=Date.now();if(m.t==='ev')listeners.forEach(l=>l.fire(m.ev,m.d));else if(m.t==='res'&&pend[m.id]){pend[m.id](m.ok);delete pend[m.id]}});
  cc.on('close',()=>{if(cur===my)rebuild(1500,'Disconnected - reconnecting...')});
  cc.on('error',()=>{})}
 // watchdog: ping the overlay; no answer for 8 s = connection is dead (e.g. internet dropped) -> rebuild. Also rebuild if stuck connecting.
 setInterval(()=>{const now=Date.now();
  if(live&&c&&c.open){send({t:'ping'});if(now-lastPong>8000)rebuild(500,'Connection lost - reconnecting...')}
  else if(now-downSince>15000&&(ever||!(p&&p.open))){rebuild(500,'Still not connected - rebuilding...')}},2500);
 if(typeof addEventListener==='function'){addEventListener('online',()=>{if(ever)rebuild(300,'Back online - reconnecting...')});addEventListener('offline',()=>status('No internet - will reconnect when it is back'))}
 if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&ever&&(!live||Date.now()-lastPong>6000))rebuild(300,'Reconnecting...')});
 gate.fill(code);if(code)gate.msg('Connecting to the overlay showing '+code+'...');
 newPeer();
}
load().then(()=>{isHost?startHub():startClient()}).catch(()=>{status('Could not load PeerJS (blocked?). Put peerjs.min.js next to index.html.')});
})();
