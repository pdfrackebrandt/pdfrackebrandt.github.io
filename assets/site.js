/* rackebrandt.pe site script: figures, tabs, paper index. No third party code. */
(function(){
  'use strict';
  function invNorm(p){
    var a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
    var b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
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
    var numEl=el('sc-num'), nameEl=el('sc-name'), capEl=el('sc-cap'), pb=el('pause');
    var reduce=!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var W=0, H=0, C={}, paused=false, onScreen=true, raf=0;
    var AZ=-0.70, EL=0.42, XR=1.5, TH0=-0.6, TH1=1.2, ZS=(2*XR)/(TH1-TH0), OM=3.0, BASE=-0.35;
    var x=0, y=0, th=BASE, target=BASE, rate=0, tt=0, label='', labelT=-99, evi=0, hold=0, cur=0;
    // trail: fixed ring buffer, so drawing cost stays flat however long the figure runs
    var MAXP=1200, PX=new Float64Array(MAXP), PY=new Float64Array(MAXP), PZ=new Float64Array(MAXP), p0=0, pn=0;
    function push(a,b,c){ var i; if(pn<MAXP){ i=(p0+pn)%MAXP; pn++; } else { i=p0; p0=(p0+1)%MAXP; } PX[i]=a; PY[i]=b; PZ[i]=c; }
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
        ev:[[4.19, function(){ target=-0.45; rate=2.2; x-=1.3; flag('crisis ↓'); }]] }
    ];
    function css(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
    function tokens(){
      C.bg=css('--canvas-bg')||'#FFFFFF'; C.rule=css('--canvas-line')||'#D2D8DE';
      C.faint=css('--faint')||'#939CA6'; C.muted=css('--muted')||'#616B76';
      C.sig=css('--signal')||'#8C2F39'; C.blue=css('--fig-blue')||'#22557E'; bgOk=false;
    }
    var ca=1, sa=0, se=0, ce=1;
    function angles(){ ca=Math.cos(AZ); sa=Math.sin(AZ); se=Math.sin(EL); ce=Math.cos(EL); }
    function proj(a,b,c){ return [a*ca+b*sa, (-a*sa+b*ca)*se+(c*ZS)*ce]; }
    var sc=1, ox=0, oy=0, mid=[0,0], dpr=1;
    // axes and plane only change on resize, drag or theme: paint them once to an offscreen layer
    var bg=document.createElement('canvas'), bctx=bg.getContext('2d'), bgOk=false;
    function to2(a,b,c){ var q=proj(a,b,c); return [ox+q[0]*sc, oy-q[1]*sc]; }
    function fit(){
      angles(); bgOk=false;
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
      dpr=Math.min(window.devicePixelRatio||1,2);
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
    // older points fade: drawn as 16 bands of one path each, at most ~600 vertices a frame
    function vtx(k, first){
      var j=(p0+k)%MAXP, a=PX[j], b=PY[j];
      var sx=ox+(a*ca+b*sa)*sc, sy=oy-((-a*sa+b*ca)*se+PZ[j]*ZS*ce)*sc;
      if(first) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
    }
    function trail(){
      var n=pn;
      if(n>1){
        ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=C.blue; ctx.lineWidth=1.7;
        var stepn=Math.max(1,Math.ceil(n/600)), BANDS=16, per=Math.max(1,Math.ceil((n-1)/BANDS));
        for(var s0=0; s0<n-1; s0+=per){
          var e0=Math.min(n-1,s0+per);
          ctx.globalAlpha=0.30+0.70*(e0/n); ctx.beginPath(); vtx(s0,true);
          for(var k=s0+stepn;k<e0;k+=stepn) vtx(k,false);
          vtx(e0,false); ctx.stroke();
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
    function paintBg(){
      bg.width=cv.width; bg.height=cv.height;
      var main=ctx; ctx=bctx;
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H); axes(); plane();
      ctx=main; bgOk=true;
    }
    function draw(){
      if(!W) return;
      if(!bgOk) paintBg();
      ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(bg,0,0);
      ctx.setTransform(dpr,0,0,dpr,0,0); trail();
    }
    function step(){
      var dt=0.006, s=SC[cur];
      for(var i=0;i<4;i++){
        var r2=x*x+y*y, dx=th*x-OM*y-r2*x, dy=OM*x+th*y-r2*y;
        x+=dt*dx; y+=dt*dy;
        th+=dt*rate*(target-th); th=Math.max(TH0+0.02,Math.min(TH1-0.02,th)); tt+=dt;
        while(evi<s.ev.length && tt>=s.ev[evi][0]){ s.ev[evi][1](); evi++; }
      }
      push(x,y,th);
    }
    function start(k){
      cur=(k+SC.length)%SC.length;
      var s=SC[cur];
      tt=0; evi=0; hold=0; p0=0; pn=0; label=''; labelT=-99;
      s.init(); push(x,y,th);
      numEl.textContent=(cur+1)+' / '+SC.length; nameEl.textContent=s.name; capEl.textContent=s.cap;
      if(reduce){ var lim=Math.ceil(s.end/0.024); for(var i=0;i<lim;i++) step(); }
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
    el('sc-prev').addEventListener('click',function(){ go(cur-1); });
    el('sc-next').addEventListener('click',function(){ go(cur+1); });
    el('replay').addEventListener('click',function(){ start(cur); });
    pb.addEventListener('click',function(){
      paused=!paused; var l=paused?'Play':'Pause'; pb.setAttribute('aria-label',l); pb.title=l; pb.setAttribute('aria-pressed',String(paused)); wake();
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
    document.addEventListener('themechange',function(){ tokens(); draw(); });
    tokens();
    if(window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize',resize);
    if(window.IntersectionObserver) new IntersectionObserver(function(es){ onScreen=es[0].isIntersecting; wake(); }).observe(cv);
    resize();
    start(0);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ bgOk=false; draw(); });
  }

  // email: the address is decoded only inside the click handler, so neither the HTML,
  // the rendered page nor a link preview ever carries it (stored shifted by one character code)
  var MAIL='qfesp/gfsoboef{sbdlfcsboeuAnfsupo/py/bd/vl';
  function initEmail(root){
    Array.prototype.forEach.call((root||document).querySelectorAll('.js-email'), function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var addr=MAIL.replace(/./g, function(c){ return String.fromCharCode(c.charCodeAt(0)-1); });
        var subj=a.getAttribute('data-subject');
        window.location.href='mailto:'+addr+(subj?'?subject='+encodeURIComponent(subj):'');
      });
    });
  }

  // Research / Tools tabs: plain anchors without JS, real tabs with it
  function initTabs(){
    var bar=document.querySelector('.tabs'); if(!bar) return;
    var wrap=document.querySelector('.tabbar')||bar;
    var tabs=Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
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
      // a locked panel takes the cursor straight to its password field
      var field=panelOf(t).querySelector('.locked:not(.is-open) input');
      if(field && opts.push) setTimeout(function(){ field.focus({preventScroll:true}); }, 60);
      if(opts.push){ history.replaceState(null,'','#'+t.getAttribute('aria-controls')); routeCourses(); }
      if(opts.scroll && wrap.classList.contains('stuck') && sentinel){
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
      var id=(location.hash||'').slice(1).split('/')[0], hit=null;
      tabs.forEach(function(t){ if(t.getAttribute('aria-controls')===id) hit=t; });
      if(!hit && initial!==true) return;
      select(hit||tabs[0]);
      if(hit) window.scrollTo(0, sentinel ? sentinel.getBoundingClientRect().top+window.pageYOffset : 0);
    }
    window.addEventListener('hashchange', function(){ fromHash(false); });
    fromHash(true);
    if(sentinel && window.IntersectionObserver){
      new IntersectionObserver(function(es){ wrap.classList.toggle('stuck', !es[0].isIntersecting); }).observe(sentinel);
    }
  }

  // All papers: topic filters (shown once the list is long) narrow the list and the selected cards; long lists start collapsed
  function initIndex(){
    var box=document.querySelector('.index'); if(!box) return;
    var cards=Array.prototype.slice.call(document.querySelectorAll('.papers > .paper[data-topic]'));
    var selHead=document.querySelector('.selected-head');
    var limit=parseInt(box.getAttribute('data-limit'),10)||10;
    var chips=Array.prototype.slice.call(box.querySelectorAll('.filter'));
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
      var anyCard=false;
      cards.forEach(function(c){ var m=!topic || c.getAttribute('data-topic')===topic; c.hidden=!m; if(m) anyCard=true; });
      if(selHead) selHead.hidden=!anyCard;
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

  // List or Visual: one switch on the right of the tab row, remembered on this device, shown only on Research
  function initViews(){
    var panel=document.getElementById('research'), box=document.querySelector('.views'); if(!panel || !box) return;
    var btns=Array.prototype.slice.call(box.querySelectorAll('.view'));
    function set(v, save){
      panel.setAttribute('data-view', v);
      btns.forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-view')===v ? 'true' : 'false'); });
      if(save){ try{ localStorage.setItem('research-view', v); }catch(e){} }
    }
    var saved=null; try{ saved=localStorage.getItem('research-view'); }catch(e){}
    if(saved==='list' || saved==='visual') set(saved, false);
    btns.forEach(function(b){ b.addEventListener('click', function(){ set(b.getAttribute('data-view'), true); }); });
    function sync(){ box.hidden=panel.hidden; }
    sync();
    if(window.MutationObserver) new MutationObserver(sync).observe(panel, {attributes:true, attributeFilter:['hidden']});
  }

  // copy a citation
  function initCopy(root){
    Array.prototype.forEach.call((root||document).querySelectorAll('[data-copy]'), function(b){
      b.addEventListener('click',function(){
        var src=document.getElementById(b.getAttribute('data-copy')); if(!src || !navigator.clipboard) return;
        navigator.clipboard.writeText(src.textContent).then(function(){ var t=b.textContent; b.textContent='Copied'; setTimeout(function(){ b.textContent=t; },1400); });
      });
    });
  }

  // the Cite link at the top opens the citation at the bottom
  function initCite(){
    var d=document.getElementById('cite'); if(!d) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#cite"]'), function(a){ a.addEventListener('click', function(){ d.open=true; }); });
  }

  // lecture notes: the contents column marks the section being read
  // notes by course: the course cards, and each course's lectures shown in place when the hash names the course
  // (#notes/core-macroeconomics on the home page, #core-macroeconomics on /notes/), so back and forward work
  var courseRoots=[];
  function routeCourses(){
    var m=(location.hash||'').match(/^#(?:notes\/)?([a-z0-9-]+)$/), slug=m ? m[1] : '';
    courseRoots.forEach(function(root){
      var grid=root.querySelector('.course-grid'), views=root.querySelectorAll('.course-view'), shown=null;
      Array.prototype.forEach.call(views, function(v){
        var on=v.getAttribute('data-course-view')===slug;
        if(on && v.hidden){ shown=v; v.classList.remove('is-entering'); void v.offsetWidth; v.classList.add('is-entering'); }
        v.hidden=!on;
        if(on && !shown) shown=v;
      });
      grid.hidden=!!shown;
      if(shown && root.getBoundingClientRect().top<0){
        var top=document.querySelector('.tabs-sentinel'), y=(top||root).getBoundingClientRect().top+window.pageYOffset-8;
        window.scrollTo({top:Math.max(0,y), behavior:'auto'});
      }
    });
  }
  function initCourses(scope){
    Array.prototype.forEach.call((scope||document).querySelectorAll('[data-courses]'), function(root){
      if(courseRoots.indexOf(root)<0) courseRoots.push(root);
    });
    routeCourses();
  }
  window.addEventListener('hashchange', routeCourses);

  // the element a #fragment names; a malformed escape (#%E0) names nothing instead of throwing
  function byHash(h){ try{ return document.getElementById(decodeURIComponent(h.slice(1))); }catch(e){ return null; } }
  // a link to a place inside a folded section opens that section first
  function openTo(el){ for(var d=el && el.closest('details.nsec'); d; d=d.parentElement && d.parentElement.closest('details.nsec')) d.open=true; }
  function initFold(){
    document.addEventListener('click', function(e){
      var a=e.target.closest && e.target.closest('a[href^="#"]'); if(!a) return;
      var t=byHash(a.getAttribute('href')); if(t) openTo(t);
    });
    window.addEventListener('hashchange', function(){ if(location.hash.length>1) openTo(byHash(location.hash)); });
  }
  function initToc(){
    var nav=document.querySelector('.toc-wide'); if(!nav) return;
    var links=Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var heads=links.map(function(a){ return byHash(a.getAttribute('href')); });
    var queued=false;
    function update(){
      queued=false;
      var cur=-1;
      heads.forEach(function(h,i){ if(h && h.getBoundingClientRect().top<=140) cur=i; });
      if(cur<0) cur=0;
      links.forEach(function(a,i){ if(i===cur) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
    }
    window.addEventListener('scroll', function(){ if(!queued){ queued=true; requestAnimationFrame(update); } }, {passive:true});
    update();
  }

  // private notes: the content ships encrypted (AES-GCM, key from the password by PBKDF2) and opens here
  function initLocks(){
    var locks=Array.prototype.slice.call(document.querySelectorAll('[data-lock]'));
    if(!locks.length) return;
    var KEY='notes-pass', keys={};
    var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function bytes(b64){ var s=atob(b64), u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
    function keyFor(pass, salt, iter){
      var id=salt+'|'+iter+'|'+pass;
      if(!keys[id]) keys[id]=crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']).then(function(base){
        return crypto.subtle.deriveKey({name:'PBKDF2', salt:bytes(salt), iterations:iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['decrypt']);
      });
      return keys[id];
    }
    function open(lock, pass){
      var s=lock.querySelector('.sealed');
      return keyFor(pass, s.getAttribute('data-salt'), +s.getAttribute('data-iter')).then(function(k){
        return crypto.subtle.decrypt({name:'AES-GCM', iv:bytes(s.getAttribute('data-iv'))}, k, bytes(s.textContent.trim()));
      }).then(function(buf){ return new TextDecoder().decode(buf); });
    }
    function remember(pass){ try{ sessionStorage.setItem(KEY, pass); }catch(e){} }
    function recall(){ try{ return sessionStorage.getItem(KEY); }catch(e){ return null; } }
    function forget(){ try{ sessionStorage.removeItem(KEY); }catch(e){} }
    function tabCount(lock){
      var mark=document.querySelector('.tab-lock[data-locked]'); if(!mark || !lock.closest('#notes')) return;
      var n=lock.querySelectorAll('.unsealed .course-card').length || lock.querySelectorAll('.unsealed .note-card').length;
      mark.removeAttribute('data-locked'); mark.classList.add('is-counted'); mark.textContent=n ? String(n) : '';
    }
    function reveal(lock, html, animate){
      var out=lock.querySelector('.unsealed');
      // parsed in a template, so a script element in the note stays inert; the figures' scripts load with the page
      var tpl=document.createElement('template'); tpl.innerHTML=html;
      out.appendChild(tpl.content);
      lock.classList.add(animate && !reduce ? 'is-opening' : 'is-open');
      if(animate && !reduce) setTimeout(function(){ lock.classList.remove('is-opening'); lock.classList.add('is-open'); }, 900);
      lock.querySelector('.sealed').remove();
      if(window.initNoteFigures) window.initNoteFigures(out);
      // a paper page opens here too: its links, Cite box and figure start once they exist
      if(out.querySelector('.paper-page:not(.note-page)')){ initEmail(out); initCopy(out); initCite(); initHurdle(); initRegime(); }
      initCourses(out);
      Array.prototype.forEach.call(out.querySelectorAll('.rikuy-dl'), function(btn){ download(btn); });
      Array.prototype.forEach.call(out.querySelectorAll('.rikuy-edit'), editInRikuy);
      initToc();
      tabCount(lock);
      if(location.hash && location.hash.length>1){ var tgt=byHash(location.hash); if(tgt && out.contains(tgt)){ openTo(tgt); tgt.scrollIntoView(); } }
    }
    // Download for Rikuy: the note's LaTeX project, sealed like the note, opened here and saved as a zip
    function download(btn, before, after){
      btn.addEventListener('click', function(){
        var pass=recall(), label=btn.textContent; if(!pass || btn.disabled) return;
        if(before) before();
        btn.disabled=true; btn.textContent='Preparing…';
        fetch(btn.getAttribute('data-rikuy'), {cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(function(box){
          return keyFor(pass, box.salt, box.iter).then(function(k){ return crypto.subtle.decrypt({name:'AES-GCM', iv:bytes(box.iv)}, k, bytes(box.ct)); }).then(function(buf){
            var url=URL.createObjectURL(new Blob([bytes(new TextDecoder().decode(buf))], {type:'application/zip'}));
            var a=document.createElement('a'); a.href=url; a.download=box.name || 'notes.zip'; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
            btn.textContent='Downloaded';
            if(after) after();
          });
        }).catch(function(){ btn.textContent='Download failed, try again'; }).then(function(){
          setTimeout(function(){ btn.disabled=false; btn.textContent=label; }, 2200);
        });
      });
    }
    // Edit in Rikuy: Rikuy opens in a new tab (inside the click, so no popup blocker stops it), the zip downloads,
    // and a line says to drop it there. Rikuy runs in a frame on claude.ai that cannot be handed a file, so the drop is his.
    function editInRikuy(btn){
      var help=btn.closest('header') && btn.closest('header').querySelector('.rikuy-help');
      download(btn, function(){ window.open(btn.getAttribute('data-open'), '_blank', 'noopener'); }, function(){ if(help) help.hidden=false; });
    }
    function wire(lock){
      var form=lock.querySelector('.lock-form'), input=form.querySelector('input'), msg=lock.querySelector('.lock-msg'), busy=false;
      input.addEventListener('input', function(){ lock.classList.remove('is-wrong'); msg.textContent=''; });
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var pass=input.value; if(busy || !pass) return;
        busy=true; lock.classList.add('is-busy'); lock.classList.remove('is-wrong');
        open(lock, pass).then(function(html){
          remember(pass);
          locks.forEach(function(other){ if(other!==lock && !other.classList.contains('is-open')) open(other, pass).then(function(h){ reveal(other, h, false); }, function(){}); });
          reveal(lock, html, true);
        }, function(){
          void lock.offsetWidth;   // restart the shake
          lock.classList.add('is-wrong'); msg.textContent='Not quite. Try again.';
          input.select();
        }).then(function(){ busy=false; lock.classList.remove('is-busy'); });
      });
    }
    var saved=recall();
    locks.forEach(function(lock){
      wire(lock);
      if(saved) open(lock, saved).then(function(html){ reveal(lock, html, false); }, function(){ forget(); });
    });
  }

  // light and dark: one button flips the theme the reader sees. A choice equal to the system's is forgotten, so the
  // page follows the system again; theme.js applies a kept choice in the head before the first paint.
  var MOON='<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8z"/></svg>';
  var SUN='<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6 7 17M17 7l1.6-1.6"/></svg>';
  function initTheme(){
    var wrap=document.querySelector('.wrap'); if(!wrap) return;
    var root=document.documentElement, mq=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)'), ft=0;
    var reduce=!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function sys(){ return mq && mq.matches ? 'dark' : 'light'; }
    function cur(){ var t=root.getAttribute('data-theme'); return t==='light'||t==='dark' ? t : sys(); }
    var b=document.createElement('button');
    b.type='button'; b.className='theme-btn'; b.innerHTML=MOON+SUN;
    function show(){
      var dark=cur()==='dark', l=dark?'Switch to light':'Switch to dark';
      b.classList.toggle('is-dark',dark); b.setAttribute('aria-label',l); b.title=l;
    }
    b.addEventListener('click',function(){
      var next=cur()==='dark'?'light':'dark';
      if(!reduce){ root.classList.add('theme-fade'); clearTimeout(ft); ft=setTimeout(function(){ root.classList.remove('theme-fade'); },450); }
      if(next===sys()){ root.removeAttribute('data-theme'); try{ localStorage.removeItem('theme'); }catch(e){} }
      else{ root.setAttribute('data-theme',next); try{ localStorage.setItem('theme',next); }catch(e){} }
      show(); document.dispatchEvent(new Event('themechange'));
    });
    if(mq && mq.addEventListener) mq.addEventListener('change',show);
    show(); wrap.insertBefore(b, wrap.firstChild);
  }

  // the tool mark's "Click to open" shows once, as a short message the first time it comes into view, then never again
  function initToolHint(){
    var h=document.querySelector('.tool-hint');
    if(!h || !window.IntersectionObserver) return;
    try{ if(localStorage.getItem('tool-hint-seen')) return; }catch(e){}
    var io=new IntersectionObserver(function(es){
      if(!es[0].isIntersecting) return;
      io.disconnect();
      setTimeout(function(){ h.classList.add('show'); try{ localStorage.setItem('tool-hint-seen','1'); }catch(e){} }, 500);
    },{threshold:0.6});
    io.observe(h.parentNode);
  }

  function boot(){ initTheme(); initToolHint(); initEmail(); initTabs(); initViews(); initIndex(); initCopy(); initCite(); initFold(); initToc(); initLocks(); initHurdle(); initRegime(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
