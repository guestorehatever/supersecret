// Camera mode + native Picture-in-Picture (controller side).
// Live view in the page = camera <video> + the real overlay (iframe) on top. PiP = a second <video> fed by a canvas (camera + scoreboard drawn on it),
// because iOS can only float a real <video> element, never a web page.
window.GioCam=(()=>{
 let stream=null,facing='environment',src=null,pipv=null,cv=null,g=null,timer=0,getS=()=>null,onChange=()=>{};
 const W=1280,H=720,Q=['','1ST','2ND','3RD','4TH','OT'];
 const fmt=ms=>{const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
 function plate(x,y,w,h,t,right){g.fillStyle=t.color;g.fillRect(x,y,w,h);g.fillStyle=t.tc;g.textBaseline='middle';
  g.font='800 26px system-ui,sans-serif';g.textAlign=right?'right':'left';g.fillText((t.name||'').toUpperCase().slice(0,16),right?x+w-16:x+16,y+h/2-2);
  g.font='900 40px system-ui,sans-serif';g.textAlign=right?'left':'right';g.fillText(t.score,right?x+16:x+w-16,y+h/2+2)}
 function board(){const d=getS(),S=d&&d.S;if(!S||!S.sb)return;
  const pw=300,mw=190,h=64,x0=(W-(pw*2+mw))/2,y=H-60-h;
  plate(x0,y,pw,h,S.away,false);plate(x0+pw+mw,y,pw,h,S.home,true);
  g.fillStyle=S.ui.qtrBg;g.fillRect(x0+pw,y,mw,h);g.fillStyle='#fff';g.textAlign='center';
  const ms=S.clock.running?Math.max(0,S.clock.ms-(performance.now()-d.at)):S.clock.ms;
  g.font='800 18px system-ui,sans-serif';g.fillText(Q[S.qtr]||'',x0+pw+mw/2,y+18);g.font='900 34px system-ui,sans-serif';g.fillText(fmt(ms),x0+pw+mw/2,y+43);
  const fl=S.flag&&S.flag.banner,dd=S.down?(Q[S.down]+' & '+S.dist):'';
  if(fl||dd){g.fillStyle=fl?'#ffd400':S.ui.ddBg;g.fillRect(x0+pw,y+h,mw,30);g.fillStyle=fl?'#111':'#fff';g.font='800 20px system-ui,sans-serif';g.fillText(fl?'FLAG':dd,x0+pw+mw/2,y+h+16)}}
 function frame(){if(!src||!src.videoWidth)return;const r=Math.max(W/src.videoWidth,H/src.videoHeight),w=src.videoWidth*r,h=src.videoHeight*r;
  g.drawImage(src,(W-w)/2,(H-h)/2,w,h);board()}
 async function start(opts){if(stream)return;
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  src=document.createElement('video');src.muted=true;src.playsInline=true;src.setAttribute('playsinline','');src.autoplay=true;src.srcObject=stream;
  Object.assign(src.style,{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'});
  cv=document.createElement('canvas');cv.width=W;cv.height=H;g=cv.getContext('2d');
  pipv=document.createElement('video');pipv.muted=true;pipv.playsInline=true;pipv.setAttribute('playsinline','');pipv.autoplay=true;
  Object.assign(pipv.style,{position:'fixed',left:0,top:0,width:'2px',height:'2px',opacity:.01,pointerEvents:'none'});
  const out=cv.captureStream(30);stream.getAudioTracks().forEach(t=>out.addTrack(t));pipv.srcObject=out;document.body.append(pipv);
  pipv.addEventListener('enterpictureinpicture',onChange);pipv.addEventListener('leavepictureinpicture',onChange);
  pipv.addEventListener('webkitpresentationmodechanged',onChange);
  await src.play().catch(()=>{});pipv.play().catch(()=>{});timer=setInterval(frame,33);onChange()}
 function stop(){clearInterval(timer);if(pipv){try{document.pictureInPictureElement===pipv&&document.exitPictureInPicture()}catch(e){}pipv.remove()}
  if(stream)stream.getTracks().forEach(t=>t.stop());stream=src=pipv=null;onChange()}
 const pipOn=()=>!!pipv&&(document.pictureInPictureElement===pipv||pipv.webkitPresentationMode==='picture-in-picture');
 // must run straight from a tap (no awaits before it)
 function pip(){if(!pipv)return Promise.reject(new Error('Turn camera mode on first'));
  if(pipOn()){return document.exitPictureInPicture?document.exitPictureInPicture():(pipv.webkitSetPresentationMode('inline'),Promise.resolve())}
  if(pipv.requestPictureInPicture)return pipv.requestPictureInPicture().catch(e=>{if(pipv.webkitSetPresentationMode){pipv.webkitSetPresentationMode('picture-in-picture');return}throw e});
  if(pipv.webkitSetPresentationMode){pipv.webkitSetPresentationMode('picture-in-picture');return Promise.resolve()}
  return Promise.reject(new Error("This browser can't do Picture-in-Picture"))}
 return{start,stop,pip,pipOn,get stream(){return stream},get on(){return!!stream},get src(){return src},
  supported:()=>!!(document.pictureInPictureEnabled||document.createElement('video').webkitSetPresentationMode),
  flip:async()=>{facing=facing==='user'?'environment':'user';if(stream){stop();await start()}},
  init:o=>{getS=o.getS;onChange=o.onChange||onChange}}})();
