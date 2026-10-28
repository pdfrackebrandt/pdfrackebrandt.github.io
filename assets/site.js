/* rackebrandt.pe site script: figures, tabs, paper index. No third party code. */
(function(){
  'use strict';
  function invNorm(p){
    var a=[-39.69683028665376,220.9460984351125,-275.9285104469687,138.3577509074756,-30.66479806614716,2.506628277459239];
    var b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.2806807164995];
    var c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
    var d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
    var plow=0.02425, phigh=1-plow, q, r;
    if(p<plow){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if(p>phigh){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q=p-0.5; r=q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  function hurdle(N){
    N=Math.max(N,1.2);
    var g=0.5772156649, s=0.0918;
    return s*((1-g)*invNorm(1-1/N)+g*invNorm(1-1/(N*Math.E)));
  }
  function xOf(N){ return 44+(Math.log(N)/Math.LN10)/5*250; }
  function yOf(h){ return 168-h/0.56*144; }
  function fmtN(N){
    if(N>=100000) return Math.round(N/1000)+'k';
    if(N>=10000) return (N/1000).toFixed(N%1000?1:0)+'k';
    return Math.round(N).toLocaleString('en-US');
  }
  function initHurdle(){
    var svg=document.getElementById('hurdle');
    if(!svg) return;
    var cur=document.getElementById('hurdle-cursor');
    var hair=document.getElementById('hurdle-hair');
    var dot=document.getElementById('hurdle-dot');
    var read=document.getElementById('hurdle-read');
    function show(N, label){
      N=Math.min(1e5, Math.max(2, N));
      var h=hurdle(N), x=xOf(N), y=yOf(h);
      cur.setAttribute('visibility','visible');
      hair.setAttribute('x1', x); hair.setAttribute('x2', x);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      var tag=label? label+' \u00b7 ':'';
      read.textContent=tag+'N = '+fmtN(N)+'   hurdle = '+h.toFixed(2);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-jump]'), function(btn){
      btn.addEventListener('click', function(){
        var N=+btn.getAttribute('data-jump');
        var names={2:'cluster',1400:'effective',2825:'nominal'};
        show(N, names[N]||'');
      });
    });
  }
  function initRegime(){
    var cv=document.getElementById('field'); if(!cv || !cv.getContext) return;
    var ctx=cv.getContext('2d'), frame=document.getElementById('frame');
    function el(id){ return document.getElementById(id); }
    var numEl=el('sc-num'), nameEl=el('sc-name'), capEl=el('sc-cap'), freeEl=el('sc-free'), pb=el('pause');
    var reduce=!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var W=0, H=0, C={}, paused=false, onScreen=true, raf=0;
    var AZ=-0.70, EL=0.42, XR=1.5, TH0=-0.6, TH1=1.2, ZS=(2*XR)/(TH1-TH0), OM=3.0, BASE=-0.35;
    var x=0, y=0, th=BASE, target=BASE, rate=0, tt=0, pts=[], label='', labelT=-99, evi=0, hold=0, lastEv=0, nextEv=9, cur=0;
    function flag(s){ label=s; labelT=tt; }
    var SC=[
      { name:'A shock fades', end:11,
        cap:'Below the threshold, a shock sets off swings that shrink each round. A new regime is safest at first and most at risk a few years later.',
        init:function(){ x=1.25; y=0; th=-0.3; target=-0.3; rate=0; flag('shock'); }, ev:[] },
      { name:'An autocracy falls behind', end:15,
        cap:'A young autocracy falls behind its neighbours. The pool of young people grows, lifts it past the threshold, and the swings stop fading. The regime starts to open.',
        init:function(){ x=-0.75; y=0.15; th=BASE; target=BASE; rate=0; },
        ev:[[2.4, function(){ target=0.85; rate=1.1; flag('falls behind ↑'); }]] },
      { name:'A crisis hits a democracy', end:13,
        cap:'A crisis erodes institutions. The young democracy is knocked toward closed rule and drops below the threshold, so the loop shuts.',
        init:function(){ x=0.92; y=0; th=0.85; target=0.85; rate=0; },
        ev:[[4.19, function(){ target=-0.45; rate=2.2; x-=1.3; flag('crisis ↓'); }]] },
      { name:'Your turn', end:Infinity, free:true,
        cap:'Shock it, let it fall behind, or hit it with a crisis. Left alone, its economy catches up and it sinks back below the threshold.',
        init:function(){ x=1.0; y=0; th=BASE; target=BASE; rate=0.08; lastEv=0; nextEv=9; }, ev:[] }
    ];
    function css(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
    function tokens(){
      C.bg=css('--canvas-bg')||'#FFFFFF'; C.rule=css('--canvas-line')||'#D2D8DE';
      C.faint=css('--faint')||'#939CA6'; C.muted=css('--muted')||'#616B76';
      C.sig=css('--signal')||'#8C2F39'; C.blue=css('--fig-blue')||'#22557E';
    }
    function proj(a,b,c){
      var ca=Math.cos(AZ), sa=Math.sin(AZ), se=Math.sin(EL), ce=Math.cos(EL);
      return [a*ca+b*sa, (-a*sa+b*ca)*se+(c*ZS)*ce];
    }
    var sc=1, ox=0, oy=0, mid=[0,0];
    function to2(a,b,c){ var q=proj(a,b,c); return [ox+q[0]*sc, oy-q[1]*sc]; }
    function fit(){
      var xs=[], ys=[], i, j, k;
      for(i=0;i<2;i++) for(j=0;j<2;j++) for(k=0;k<2;k++){ var q=proj(i?XR:-XR, j?XR:-XR, k?TH1:TH0); xs.push(q[0]); ys.push(q[1]); }
      var x0=Math.min.apply(null,xs), x1=Math.max.apply(null,xs), y0=Math.min.apply(null,ys), y1=Math.max.apply(null,ys);
      var padX=Math.max(64,Math.min(120,W*0.30)), padY=Math.max(40,Math.min(64,H*0.17));
      sc=Math.min((W-padX)/(x1-x0),(H-padY)/(y1-y0));
      ox=W/2-((x0+x1)/2)*sc; oy=H/2+((y0+y1)/2)*sc-H*0.02;
      mid=[W/2,H/2];
    }
    function out(p,px){ var dx=p[0]-mid[0], dy=p[1]-mid[1], d=Math.hypot(dx,dy)||1; return [p[0]+dx/d*px, p[1]+dy/d*px]; }
    function resize(){
      var r=cv.getBoundingClientRect(); if(r.width<2) return;
      var dpr=Math.min(window.devicePixelRatio||1,2);
      W=Math.round(r.width); H=Math.round(r.height);
      cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0); fit(); draw();
    }
    function seg(a,b,col,w,dash){
      ctx.beginPath(); ctx.setLineDash(dash||[]); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]);
      ctx.strokeStyle=col; ctx.lineWidth=w||1; ctx.stroke(); ctx.setLineDash([]);
    }
    function txt(s,p,col,al){
      ctx.fillStyle=col; ctx.font=(W<420?'10px':'11px')+' Inter, system-ui, Helvetica, Arial, sans-serif';
      ctx.textAlign=al||'center'; ctx.textBaseline='middle'; ctx.fillText(s,p[0],p[1]);
    }
    function axes(){
      var c=[to2(-XR,-XR,TH0),to2(XR,-XR,TH0),to2(XR,XR,TH0),to2(-XR,XR,TH0)];
      for(var i=0;i<4;i++) seg(c[i],c[(i+1)%4],C.rule,1);
      var fy=to2(0,-XR,TH0)[1]>to2(0,XR,TH0)[1]?-XR:XR;
      txt('closed',out(to2(-XR*0.72,fy,TH0),17),C.muted);
      txt('open',out(to2(XR*0.72,fy,TH0),17),C.muted);
      var fx=to2(-XR,0,TH0)[1]>to2(XR,0,TH0)[1]?-XR:XR;
      txt('mobilization',out(to2(fx,0,TH0),19),C.muted);
      var corners=[[-XR,-XR],[XR,-XR],[XR,XR],[-XR,XR]], li=0, best=Infinity;
      corners.forEach(function(cc,k){ var q=to2(cc[0],cc[1],TH0); if(q[0]<best){ best=q[0]; li=k; } });
      var cc=corners[li], b0=to2(cc[0],cc[1],TH0), tp=to2(cc[0],cc[1],TH1);
      seg(b0,tp,C.rule,1);
      seg(tp,[tp[0]-3.5,tp[1]+6],C.rule,1); seg(tp,[tp[0]+3.5,tp[1]+6],C.rule,1);
      txt('young people',[tp[0],tp[1]-11],C.muted,'center');
    }
    function plane(){
      var q=[to2(-XR,-XR,0),to2(XR,-XR,0),to2(XR,XR,0),to2(-XR,XR,0)];
      ctx.beginPath(); ctx.setLineDash([3,4]); ctx.moveTo(q[0][0],q[0][1]);
      for(var i=1;i<4;i++) ctx.lineTo(q[i][0],q[i][1]);
      ctx.closePath(); ctx.strokeStyle=C.faint; ctx.globalAlpha=0.6; ctx.lineWidth=1; ctx.stroke();
      ctx.globalAlpha=1; ctx.setLineDash([]);
      var em=[[0,-XR],[XR,0],[0,XR],[-XR,0]].map(function(m){ return to2(m[0],m[1],0); }), bi=-1;
      em.forEach(function(q,k){ if(q[0]>mid[0] && (bi<0 || q[1]>em[bi][1])) bi=k; });
      if(bi>=0) txt('threshold',out(em[bi],18),C.faint);
    }
    function trail(){
      var n=pts.length;
      if(n>1){
        ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=C.blue; ctx.lineWidth=1.7;
        var stepn=Math.max(1,Math.floor(n/900));
        for(var i=stepn;i<n;i+=stepn){
          var a=to2(pts[i-stepn][0],pts[i-stepn][1],pts[i-stepn][2]), b=to2(pts[i][0],pts[i][1],pts[i][2]);
          ctx.globalAlpha=0.30+0.70*(i/n); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
        }
        ctx.globalAlpha=1;
      }
      var h=to2(x,y,th);
      ctx.beginPath(); ctx.arc(h[0],h[1],3.9,0,6.2832); ctx.fillStyle=C.sig; ctx.fill();
      var age=tt-labelT;
      if(label && age>=0 && age<2.6){
        ctx.globalAlpha=Math.max(0,1-age/2.6);
        txt(label,[h[0]+9,h[1]-13],C.sig,'left');
        ctx.globalAlpha=1;
      }
    }
    function draw(){
      if(!W) return;
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
      axes(); plane(); trail();
    }
    function kick(){ var a=Math.random()*6.2832; x+=0.6*Math.cos(a); y+=0.6*Math.sin(a); lastEv=tt; flag('shock'); }
    function step(){
      var dt=0.006, s=SC[cur];
      for(var i=0;i<4;i++){
        var r2=x*x+y*y, dx=th*x-OM*y-r2*x, dy=OM*x+th*y-r2*y;
        x+=dt*dx; y+=dt*dy;
        if(s.free){ x+=(Math.random()-0.5)*0.004; y+=(Math.random()-0.5)*0.004; }
        th+=dt*rate*(target-th); th=Math.max(TH0+0.02,Math.min(TH1-0.02,th)); tt+=dt;
        while(evi<s.ev.length && tt>=s.ev[evi][0]){ s.ev[evi][1](); evi++; }
      }
      if(s.free && tt>nextEv){
        if(tt-lastEv>8){ if(Math.random()<0.6){ th=Math.min(TH1-0.05,th+0.6); lastEv=tt; flag('falls behind ↑'); } else kick(); }
        nextEv=tt+10+Math.random()*8;
      }
      pts.push([x,y,th]); if(pts.length>3000) pts.shift();
    }
    function start(k){
      cur=(k+SC.length)%SC.length;
      var s=SC[cur];
      tt=0; evi=0; hold=0; pts=[]; label=''; labelT=-99;
      s.init(); pts.push([x,y,th]);
      numEl.textContent=(cur+1)+' / '+SC.length; nameEl.textContent=s.name; capEl.textContent=s.cap;
      freeEl.style.display=s.free?'flex':'none';
      if(reduce){ var lim=s.free?300:Math.ceil(s.end/0.024); for(var i=0;i<lim;i++) step(); }
      draw(); wake();
    }
    // fixed 60 steps per second whatever the screen's refresh rate; one loop only
    var lastT=0, acc=0, FRAME=1000/60;
    function tick(now){
      raf=0;
      if(paused || !onScreen || reduce){ lastT=0; return; }
      if(!lastT) lastT=now;
      acc+=Math.min(100, now-lastT); lastT=now;
      var n=0;
      while(acc>=FRAME && n<6){
        acc-=FRAME; n++;
        if(tt<SC[cur].end) step(); else if(++hold>80) start(cur);
      }
      if(n>=6) acc=0;
      if(n) draw();
      if(!raf) raf=requestAnimationFrame(tick);
    }
    function wake(){ if(!raf && !paused && onScreen && !reduce){ lastT=0; acc=0; raf=requestAnimationFrame(tick); } }
    function go(k){ cv.style.opacity='0'; setTimeout(function(){ start(k); cv.style.opacity='1'; },170); }
    function after(){ if(reduce){ for(var i=0;i<300;i++) step(); draw(); } }
    el('sc-prev').addEventListener('click',function(){ go(cur-1); });
    el('sc-next').addEventListener('click',function(){ go(cur+1); });
    el('replay').addEventListener('click',function(){ start(cur); });
    el('shock').addEventListener('click',function(){ kick(); after(); });
    el('fallbehind').addEventListener('click',function(){ th=Math.min(TH1-0.05,th+0.6); lastEv=tt; flag('falls behind ↑'); after(); });
    el('crisis').addEventListener('click',function(){ th=Math.max(TH0+0.05,th-0.5); x-=0.5; lastEv=tt; flag('crisis ↓'); after(); });
    pb.addEventListener('click',function(){
      paused=!paused; pb.textContent=paused?'Play':'Pause'; pb.setAttribute('aria-pressed',String(paused)); wake();
    });
    if(reduce){ pb.style.display='none'; }
    var drag=false, lx=0, ly=0;
    cv.addEventListener('pointerdown',function(e){ drag=true; lx=e.clientX; ly=e.clientY; cv.classList.add('dragging'); frame.classList.add('touched'); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove',function(e){
      if(!drag) return;
      AZ-=(e.clientX-lx)*0.008; EL=Math.max(0.08,Math.min(1.3,EL+(e.clientY-ly)*0.005));
      lx=e.clientX; ly=e.clientY; fit(); if(paused || reduce || !raf) draw();
    });
    function end(){ drag=false; cv.classList.remove('dragging'); }
    cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end);
    var mq=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if(mq && mq.addEventListener) mq.addEventListener('change',function(){ tokens(); draw(); });
    tokens();
    if(window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize',resize);
    if(window.IntersectionObserver) new IntersectionObserver(function(es){ onScreen=es[0].isIntersecting; wake(); }).observe(cv);
    resize();
    start(0);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); });
  }

  // email: assembled at runtime so address harvesters reading the HTML get nothing
  function initEmail(){
    var u='pedro.fernandezrackebrandt', d='merton.ox.ac.uk';
    var addr=u+'@'+d;
    Array.prototype.forEach.call(document.querySelectorAll('.js-email'), function(a){
      a.setAttribute('href','mailto:'+addr);
      if(a.hasAttribute('data-show')) a.textContent=addr;
    });
  }

  // Research / Tools tabs: plain anchors without JS, real tabs with it
  function initTabs(){
    var bar=document.querySelector('.tabs'); if(!bar) return;
    var tabs=Array.prototype.slice.call(bar.querySelectorAll('[role="tab"]'));
    var sentinel=document.querySelector('.tabs-sentinel');
    var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function panelOf(t){ return document.getElementById(t.getAttribute('aria-controls')); }
    function select(t, opts){
      opts=opts||{};
      tabs.forEach(function(x){
        var on=(x===t);
        x.setAttribute('aria-selected', on?'true':'false');
        x.tabIndex=on?0:-1;
        panelOf(x).hidden=!on;
      });
      if(opts.focus) t.focus();
      if(opts.push) history.replaceState(null,'','#'+t.getAttribute('aria-controls'));
      if(opts.scroll && bar.classList.contains('stuck') && sentinel){
        window.scrollTo({top: sentinel.getBoundingClientRect().top+window.pageYOffset, behavior: reduce?'auto':'smooth'});
      }
    }
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(e){ e.preventDefault(); select(t,{push:true,scroll:true}); });
      t.addEventListener('keydown',function(e){
        var k=e.key, j=-1;
        if(k==='ArrowRight') j=(i+1)%tabs.length; else if(k==='ArrowLeft') j=(i-1+tabs.length)%tabs.length;
        else if(k==='Home') j=0; else if(k==='End') j=tabs.length-1;
        if(j>=0){ e.preventDefault(); select(tabs[j],{focus:true,push:true}); }
      });
    });
    function fromHash(initial){
      var id=(location.hash||'').slice(1), hit=null;
      tabs.forEach(function(t){ if(t.getAttribute('aria-controls')===id) hit=t; });
      if(!hit && initial!==true) return;
      select(hit||tabs[0]);
      if(hit) window.scrollTo(0, sentinel ? sentinel.getBoundingClientRect().top+window.pageYOffset : 0);
    }
    window.addEventListener('hashchange', function(){ fromHash(false); });
    fromHash(true);
    if(sentinel && window.IntersectionObserver){
      new IntersectionObserver(function(es){ bar.classList.toggle('stuck', !es[0].isIntersecting); }).observe(sentinel);
    }
  }

  // All papers: topic chips and a collapsed long list
  function initIndex(){
    var box=document.querySelector('.index'); if(!box) return;
    var limit=parseInt(box.getAttribute('data-limit'),10)||10;
    var chips=Array.prototype.slice.call(box.querySelectorAll('.chip'));
    var rows=Array.prototype.slice.call(box.querySelectorAll('.row'));
    var groups=Array.prototype.slice.call(box.querySelectorAll('.year-group'));
    var more=box.querySelector('.show-all');
    var topic='', expanded=false;
    function apply(){
      var n=0;
      rows.forEach(function(r){
        var match=!topic || r.getAttribute('data-topic')===topic;
        var show=match && (topic!=='' || expanded || n<limit);
        if(match) n++;
        r.hidden=!show;
      });
      groups.forEach(function(g){ g.hidden=!g.querySelector('.row:not([hidden])'); });
      if(more){ more.hidden=(topic!=='' || expanded || rows.length<=limit); more.textContent='Show all '+rows.length; }
    }
    chips.forEach(function(c){
      c.addEventListener('click',function(){
        topic=c.getAttribute('data-topic')||'';
        chips.forEach(function(x){ x.setAttribute('aria-pressed', x===c?'true':'false'); });
        apply();
      });
    });
    if(more) more.addEventListener('click',function(){ expanded=true; apply(); });
    apply();
  }

  // copy a citation
  function initCopy(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function(b){
      b.addEventListener('click',function(){
        var src=document.getElementById(b.getAttribute('data-copy')); if(!src || !navigator.clipboard) return;
        navigator.clipboard.writeText(src.textContent).then(function(){ var t=b.textContent; b.textContent='Copied'; setTimeout(function(){ b.textContent=t; },1400); });
      });
    });
  }

  function boot(){ initEmail(); initTabs(); initIndex(); initCopy(); initHurdle(); initRegime(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
