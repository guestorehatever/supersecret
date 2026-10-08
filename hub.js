// GIOGAMES website mode: no Node server needed. The CONTROLLER page is the hub (runs core.js in the browser);
// other pages (overlay on another device, a second controller) connect to it peer-to-peer (WebRTC via PeerJS) using a room code.
(()=>{
const Q=new URLSearchParams(location.search),LOCAL=/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
if(!(Q.has('room')||(location.protocol==='https:'&&!LOCAL)))return;           // local Node mode: do nothing
const ls=(k,v)=>{try{return v===undefined?localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){}};
const overlayPage=/overlay/.test(location.pathname),embedded=Q.has('embed')&&parent!==window;
let room=(Q.get('room')||ls('gio-room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
if(!room){room=Math.random().toString(36).slice(2,8).toUpperCase();}
ls('gio-room',room);if(!Q.has('room')&&!embedded){Q.set('room',room);history.replaceState(null,'','?'+Q)}
const base=location.origin+location.pathname.replace(/[^/]*$/,'');
window.__gio={room,web:true,overlayUrl:base+'overlay.html?room='+room,controlUrl:base+'?room='+room+'&join=1'};
const ready=new Promise(r=>window.__gioReady=r);let hub=null;             // hub = {call(name,body), listen(l)}
const listeners=new Set();                                                 // pages' EventSource shims
class ES{constructor(u){this.o=/[?&]o=1/.test(u);this.h={};this.l={fire:(ev,d)=>this.fire(ev,d),o:this.o};listeners.add(this.l);ready.then(()=>hub.listen(this.l))}
 addEventListener(ev,f){(this.h[ev]=this.h[ev]||[]).push(f)}
 fire(ev,d){if(ev==='_err'){this.onerror&&this.onerror();return}if(ev==='')this.onmessage&&this.onmessage({data:d});else(this.h[ev]||[]).forEach(f=>f({data:d}))}
 close(){listeners.delete(this.l);hub&&hub.unlisten&&hub.unlisten(this.l)}}
window.EventSource=ES;
const rf=window.fetch.bind(window);
window.fetch=(u,o)=>{const m=/^\/api\/([a-z]+)/.exec(String(u));if(!m)return rf(u,o);
 let b={};try{b=o&&o.body?JSON.parse(o.body):{}}catch(e){}
 return ready.then(()=>hub.call(m[1],b)).then(ok=>({ok,status:ok?200:404}))};
// ---- embedded overlay (iframe inside the controller): talk to the parent's hub directly
if(embedded){const t=setInterval(()=>{if(parent.__gioHub){clearInterval(t);hub=parent.__gioHub;window.__gioReady()}},50);return}
// ---- PeerJS
const load=()=>new Promise((ok,no)=>{if(window.Peer)return ok();const s=document.createElement('script');s.src='peerjs.min.js';
 s.onload=ok;s.onerror=()=>{s.remove();const c=document.createElement('script');c.src='https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';c.onload=ok;c.onerror=no;document.head.appendChild(c)};document.head.appendChild(s)});
const ID='giogames-'+room;
function startHub(){
 const conns=new Set(),env={emit:(ev,d)=>{const s=JSON.stringify(d);listeners.forEach(l=>l.fire(ev,s));conns.forEach(c=>c.open&&c.send({t:'ev',ev,d:s}))},
  save:j=>ls('gio-state',j),load:()=>ls('gio-state')||'{}',ov:()=>[...listeners].filter(l=>l.o).length+[...conns].filter(c=>c.ovl).length};
 const core=createCore(env);
 hub={call:async(n,b)=>core.call(n,b),listen:l=>{l.fire('',JSON.stringify(core.snap()))},unlisten:l=>{listeners.delete(l);core.overlayGone()}};
 window.__gioHub=hub;window.__gioReady();
 const p=new Peer(ID);p.on('connection',c=>{c.on('data',m=>{
  if(m.t==='sub'){c.ovl=!!m.o;conns.add(c);c.send({t:'ev',ev:'',d:JSON.stringify(core.snap())})}
  else if(m.t==='api')c.send({t:'res',id:m.id,ok:core.call(m.n,m.b)})});
  c.on('close',()=>{conns.delete(c);core.overlayGone()})});
 p.on('error',e=>{if(e.type==='unavailable-id')startClient(); else setTimeout(()=>{},0)});
}
function startClient(){
 const p=new Peer(),pend={};let c=null,n=0;
 const connect=()=>{c=p.connect(ID,{reliable:true});
  c.on('open',()=>{c.send({t:'sub',o:overlayPage});window.__gioReady()});
  c.on('data',m=>{if(m.t==='ev')listeners.forEach(l=>l.fire(m.ev,m.d));else if(m.t==='res'&&pend[m.id]){pend[m.id](m.ok);delete pend[m.id]}});
  c.on('close',()=>{listeners.forEach(l=>l.fire('_err'));setTimeout(connect,2500)})};
 hub={call:(n2,b)=>new Promise(r=>{if(!c||!c.open)return r(false);const id=++n;pend[id]=r;c.send({t:'api',id,n:n2,b})}),listen:l=>{if(c&&c.open)c.send({t:'sub',o:l.o})}};
 p.on('open',connect);p.on('error',e=>{if(e.type==='peer-unavailable'){listeners.forEach(l=>l.fire('_err'));setTimeout(connect,3000)}});
}
load().then(()=>{(overlayPage||Q.has('join'))?startClient():startHub()}).catch(()=>listeners.forEach(l=>l.fire('_err')));
})();
