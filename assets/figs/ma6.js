/* Core Macroeconomics L6 figures: employment lotteries, the Solow condition, the Shapiro Stiglitz no shirking
   condition, the search and matching equilibrium, and unemployment dynamics after a shock.
   Every curve is computed in the browser from the model in the note. Drawn with the helpers of /assets/notes.js
   (window.NF); colours come from CSS variables in /assets/figs/ma6.css, so dark mode follows. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS, reduce=NF.reduce;

  /* ---------- shared ---------- */
  /* one plot box: grid, ticks, tick labels and axis names; sx and sy map data to the svg, gc is clipped to the box */
  function box(svg,b,xd,yd,o){
    var g=S('g',null,svg), sx=lin(xd[0],xd[1],b.x,b.x+b.w), sy=lin(yd[0],yd[1],b.y+b.h,b.y), i, v, f;
    for(i=0;i<o.xt.length;i++){
      v=o.xt[i]; f=C(sx(v));
      line(g,f,b.y,f,b.y+b.h,v===0&&o.zero?'nf-ax':'nf-grid');
      line(g,f,b.y+b.h,f,b.y+b.h+4,'nf-ax');
      text(g,sx(v),b.y+b.h+16,(o.xf||tl)(v),null,'middle');
    }
    for(i=0;i<o.yt.length;i++){
      v=o.yt[i]; f=C(sy(v));
      line(g,b.x,f,b.x+b.w,f,v===0&&o.zero?'nf-ax':'nf-grid');
      text(g,b.x-6,sy(v)+4,(o.yf||tl)(v),null,'end');
    }
    line(g,b.x,C(b.y+b.h),b.x+b.w,C(b.y+b.h),'nf-ax');
    line(g,C(b.x),b.y,C(b.x),b.y+b.h,'nf-ax');
    if(o.xl) text(g,b.x+b.w,b.y+b.h+31,o.xl,'nf-title','end');
    if(o.yl) text(g,b.x-36,b.y-11,o.yl,'nf-title');
    if(o.title) text(g,b.x+b.w,b.y-11,o.title,'nf-lab','end');
    return {sx:sx, sy:sy, b:b, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  function curve(P,pts){ return poly(pts.map(function(p){ return [P.sx(p[0]),P.sy(p[1])]; })); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  /* two plot boxes, side by side when the figure is wide, otherwise one above the other */
  function two(W,ph){
    var L=44, Rm=12, T=30, B=40, gap=18, pw;
    if(W>=600){ pw=Math.floor((W-2*L-Rm-gap)/2); return {b1:{x:L,y:T,w:pw,h:ph}, b2:{x:2*L+pw+gap,y:T,w:pw,h:ph}, H:T+ph+B}; }
    pw=W-L-Rm;
    return {b1:{x:L,y:T,w:pw,h:ph}, b2:{x:L,y:2*T+ph+B,w:pw,h:ph}, H:2*(T+ph+B)};
  }
  /* a draggable knob with a focus ring; arrow keys call onKey(+1 or -1) */
  function knob(svg,cls,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+cls},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, d=0;
      if(k==='ArrowRight'||k==='ArrowUp') d=1; else if(k==='ArrowLeft'||k==='ArrowDown') d=-1; else return;
      e.preventDefault(); onKey(d,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+now.toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag a knob that lives in one box: near(p) says whether a press starts on it, move(p) follows the pointer;
     a click elsewhere in the box also moves it there */
  function dragIn(svg,size,boxOf,near,move,focus){
    var on=false;
    function inside(p){ var b=boxOf(); return b && p[0]>=b.x-8 && p[0]<=b.x+b.w+8 && p[1]>=b.y-8 && p[1]<=b.y+b.h+8; }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]);
      if(!near(p)) return;
      on=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      if(focus) focus();
    });
    svg.addEventListener('pointermove',function(e){ if(!on) return; var s=size(); move(local(svg,e,s[0],s[1])); });
    function stop(){ on=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('click',function(e){ var s=size(), p=local(svg,e,s[0],s[1]); if(inside(p) && !near(p)) move(p); });
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(near(local(svg,e.touches[0],s[0],s[1]))) e.preventDefault();
    },{passive:false});
  }
  function sg(v,d){ var s=fmt(v,d); return (v>0 && parseFloat(v.toFixed(d))!==0?'+':'')+s; }
  function bisect(F,lo,hi,n){ var i, m; for(i=0;i<(n||100);i++){ m=(lo+hi)/2; if(F(m)>0) lo=m; else hi=m; } return (lo+hi)/2; }
  function pick(list,v){ for(var i=0;i<list.length;i++) if(list[i][0]>=v) return list[i]; return list[list.length-1]; }
  function near2(a,b,r){ return Math.hypot(a[0]-b[0],a[1]-b[1])<(r||24); }

  /* ---------- 1. Employment lotteries ---------- */
  NF.register('ma6-lottery',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var AL=2, TH=1/3, hbar=0.5, pi=0.6, tfp=0, hd=3, W=520, H=270, P1, P2, el={}, api;
    var rh=range(fig,'hbar',2,function(v){ hbar=v; update(); });
    var rp=range(fig,'pi',2,function(v){ pi=v; update(); });
    var rt=range(fig,'tfp',1,function(v){ tfp=v; update(); });
    if(rh) hbar=rh.v();
    if(rp) pi=rp.v();
    if(rt) tfp=rt.v();
    var cur=seg(fig,'data-hd',function(v){ hd=+v; update(); });
    if(cur) hd=+cur;
    function setPi(v){ v=clamp(Math.round(v*100)/100,0,1); if(rp) rp.set(v); else { pi=v; update(); } }
    /* divisible labour, Frisch supply with the marginal utility of wealth held fixed and demand from Cobb Douglas,
       in log deviations x = h hat: TFP - theta x = log(1 - h0) - log(1 - h0 e^x) */
    function divEq(a){
      var h0=1/hd;
      return bisect(function(x){ return (a-TH*x)-(Math.log(1-h0)-Math.log(1-h0*Math.exp(x))); },-3,-Math.log(h0)-1e-12,120);
    }
    function state(){
      var a=tfp/100, x=divEq(a), B=-AL*Math.log(1-hbar)/hbar, h=pi*hbar, h0=1/hd, dw=a-TH*x;
      return {h:h, B:B, eu:-B*h, ev:AL*Math.log(1-h), dh:100*x, dw:100*dw, lh:100*a/TH, h0:h0, eps:(1-h0)/h0,
              ratio:Math.abs(dw)>1e-9?x/dw:(1-h0)/h0};
    }
    function draw(){
      var L, kg, kx, ky;
      W=measure(svg); L=two(W,W>=600?200:184); H=L.H; frame(svg,W,H);
      P1=box(svg,L.b1,[0,0.8],[-3.4,0.2],{xt:[0,0.2,0.4,0.6,0.8],yt:[0,-1,-2,-3],zero:true,xl:'hours of one worker',yl:'utility of leisure',title:'one worker'});
      P2=box(svg,L.b2,[-35,35],[-12,12],{xt:[-30,-15,0,15,30],yt:[-10,-5,0,5,10],zero:true,xl:'hours ĥ, %',yl:'wage ŵ, %',title:'labour market'});
      el.curve=S('path',{'class':'ma6-div'},P1.gc);
      el.chord=S('path',{'class':'ma6-lot'},P1.gc);
      el.gap=line(P1.gc,0,0,0,0,'ma6-gap');
      el.e0=S('circle',{r:4,'class':'ma6-dlot'},P1.gc);
      el.e1=S('circle',{r:4,'class':'ma6-dlot'},P1.gc);
      el.hb=text(svg,0,0,'h̄','nf-lab nf-halo ma6-it','middle');
      /* key, bottom left of the left box, below the chord, where both lines stay clear */
      kg=S('g',null,svg); kx=P1.b.x+10; ky=P1.b.y+P1.b.h-26;
      line(kg,kx,ky-3.5,kx+14,ky-3.5,'ma6-div'); text(kg,kx+20,ky,'hours divisible, α log(1 − h)','nf-lab');
      line(kg,kx,ky+12.5,kx+14,ky+12.5,'ma6-lot'); text(kg,kx+20,ky+16,'lottery, −Bh','nf-lab');
      el.k=knob(svg,'ma6-klot','Lottery odds π on the chord, arrow keys move it',function(d,big){ setPi(pi+d*(big?0.1:0.01)); });
      el.d0=S('path',{'class':'ma6-ref'},P2.gc);
      el.dem=S('path',{'class':'ma6-dem'},P2.gc);
      el.sd=S('path',{'class':'ma6-div'},P2.gc);
      el.sl=line(P2.gc,0,0,0,0,'ma6-lot');
      el.o=S('circle',{r:4,'class':'ma6-open'},P2.gc);
      el.pd=S('circle',{r:4.5,'class':'ma6-ddiv'},P2.gc);
      el.pl=S('circle',{r:4.5,'class':'ma6-dlot'},P2.gc);
      el.t1=text(svg,0,0,'demand','nf-lab nf-halo ma6-tdem');
      el.t2=text(svg,0,0,'divisible','nf-lab nf-halo ma6-tdiv','end');
      el.t3=text(svg,0,0,'lottery','nf-lab nf-halo ma6-tlot','end');
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var s=state(), i, pts=[], x, h0=s.h0, xm, vb=AL*Math.log(1-hbar), xs9;
      for(i=0;i<=160;i++){ x=0.8*i/160; pts.push([x,AL*Math.log(1-x)]); }
      el.curve.setAttribute('d',curve(P1,pts));
      el.chord.setAttribute('d',curve(P1,[[0,0],[hbar,vb]]));
      at(el.e0,P1.sx(0),P1.sy(0)); at(el.e1,P1.sx(hbar),P1.sy(vb));
      moveTo(el.hb,P1.sx(hbar),P1.sy(vb)+18);
      setLine(el.gap,P1.sx(s.h),P1.sy(s.eu),P1.sx(s.h),P1.sy(s.ev));
      place(el.k,P1.sx(s.h),P1.sy(s.eu),pi,'π = '+pi.toFixed(2)+', h = '+s.h.toFixed(2));
      /* labour market in log deviations from the steady state */
      el.d0.setAttribute('d',Math.abs(tfp)>1e-9?curve(P2,[[-35,35*TH],[35,-35*TH]]):'');
      el.dem.setAttribute('d',curve(P2,[[-35,tfp+35*TH],[35,tfp-35*TH]]));
      pts=[]; xm=Math.min(35,100*(-Math.log(h0))-0.01);
      for(i=0;i<=200;i++){ x=-35+(xm+35)*i/200; pts.push([x,100*(Math.log(1-h0)-Math.log(1-h0*Math.exp(x/100)))]); }
      el.sd.setAttribute('d',curve(P2,pts));
      setLine(el.sl,P2.sx(-35),P2.sy(0),P2.sx(35),P2.sy(0));
      at(el.o,P2.sx(0),P2.sy(0));
      at(el.pd,P2.sx(s.dh),P2.sy(s.dw));
      at(el.pl,P2.sx(clamp(s.lh,-36,36)),P2.sy(0));
      moveTo(el.t1,P2.sx(-33),P2.sy(tfp+33*TH)-7);
      xs9=100*Math.log((1-(1-h0)*Math.exp(-0.09))/h0);
      moveTo(el.t2,P2.sx(xs9)-6,P2.sy(9)+4);
      moveTo(el.t3,P2.sx(34),P2.sy(0)-7);
      if(!out) return;
      out.textContent='π = '+pi.toFixed(2)+', h = πh̄ = '+s.h.toFixed(2)+'   lottery: −Bh = '+fmt(s.eu,2)+'   everyone working h: α log(1 − h) = '+fmt(s.ev,2)+'   B = '+s.B.toFixed(2)+
        '\nÂ = '+sg(tfp,1)+'%, ε = '+s.eps.toFixed(2)+'   divisible: ĥ = '+sg(s.dh,2)+'%, ŵ = '+sg(s.dw,2)+'%, ĥ/ŵ = '+s.ratio.toFixed(2)+'   lottery: ĥ = '+sg(s.lh,2)+'%, ŵ = 0';
    }
    dragIn(svg,function(){ return [W,H]; },function(){ return P1 && P1.b; },
      function(p){ if(!P1) return false; var s=state(); return near2(p,[P1.sx(s.h),P1.sy(s.eu)]); },
      function(p){ setPi(P1.sx.inv(p[0])/hbar); },
      function(){ try{ el.k.focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    /* the Try it steps read the chord, the two economies' responses and the elasticity, and set the four controls */
    api=NF.api({
      get:function(){ var s=state(); return {pi:pi, hbar:hbar, h:s.h, B:s.B, eu:s.eu, ev:s.ev, tfp:tfp, hd:hd, h0:s.h0, eps:s.eps, dh:s.dh, dw:s.dw, lh:s.lh, lw:0, ratio:s.ratio}; },
      set:function(st){
        if('hd' in st) NF.press(fig,'data-hd',String(st.hd));
        if('hbar' in st){ if(rh) rh.set(+st.hbar); else hbar=+st.hbar; }
        if('pi' in st) setPi(+st.pi);
        if('tfp' in st){ if(rt) rt.set(+st.tfp); else tfp=+st.tfp; }
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The Solow condition ---------- */
  NF.register('ma6-solow',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var x=1, be=0.5, A=1, w=3, shown=false, W=520, H=290, P, el={}, api, WM=4.5, EM=2;
    var rx=range(fig,'x',2,function(v){ x=v; snap(); update(); });
    var rb=range(fig,'beta',2,function(v){ be=v; snap(); update(); });
    var ra=range(fig,'A',2,function(v){ A=v; update(); });
    if(rx) x=rx.v();
    if(rb) be=rb.v();
    if(ra) A=ra.v();
    var sb=fig.querySelector('.ma6-show');
    if(sb) sb.addEventListener('click',function(){ shown=!shown; sb.setAttribute('aria-pressed',shown?'true':'false'); update(); });
    function eff(v){ return v>x?Math.pow((v-x)/x,be):0; }
    function ws(){ return x/(1-be); }
    function es(){ return Math.pow(be/(1-be),be); }
    /* the knob snaps onto the cheapest wage when it comes close, so the tangency can be found by hand */
    function snap(){ if(Math.abs(w-ws())<0.04) w=ws(); }
    function setW(v){ w=clamp(Math.round(v*100)/100,0,WM); snap(); update(); }
    function state(){
      var e=eff(w), wst=ws(), est=es();
      return {e:e, cost:e>0?w/e:0, el:w>x?be*w/(w-x):0, ws:wst, es:est, L:100*Math.pow(A*Math.sqrt(est)/wst/0.5,2), tangent:Math.abs(w-wst)<1e-9};
    }
    function draw(){
      var b, kg, kx, ky;
      W=measure(svg); H=W>=480?290:270; frame(svg,W,H);
      b={x:44,y:30,w:W-44-16,h:H-30-42};
      P=box(svg,b,[0,WM],[0,EM],{xt:[0,1,2,3,4],yt:[0,0.5,1,1.5,2],xl:'wage w',yl:'effort e(w)'});
      el.tan=line(P.gc,0,0,0,0,'ma6-tan');
      el.ray=line(P.gc,0,0,0,0,'ma6-ray');
      el.cur=S('path',{'class':'ma6-eff'},P.gc);
      el.flat=line(P.gc,0,0,0,0,'ma6-eff');
      el.gw=line(P.gc,0,0,0,0,'ma6-guide');
      el.xm=line(svg,0,0,0,0,'ma6-xmark');
      el.xl=text(svg,0,0,'x','nf-lab nf-halo ma6-it','middle');
      el.star=S('circle',{r:4.5,'class':'ma6-dstar'},P.gc);
      el.sl=text(svg,0,0,'','nf-lab nf-halo ma6-tstar');
      kg=S('g',null,svg); kx=b.x+12; ky=b.y+14;
      line(kg,kx,ky-3.5,kx+14,ky-3.5,'ma6-ray'); text(kg,kx+20,ky,'slope e/w: effort per unit of pay','nf-lab');
      el.k=knob(svg,'ma6-kray','Wage w on the effort curve, arrow keys move it',function(d,big){ setW(w+d*(big?0.25:0.05)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var s=state(), pts=[], i, v, e=s.e, sl, xe, ts, show=shown||s.tangent;
      for(i=0;i<=240;i++){ v=x+(WM-x)*Math.pow(i/240,1.6); pts.push([v,eff(v)]); }
      el.cur.setAttribute('d',curve(P,pts));
      setLine(el.flat,P.sx(0),P.sy(0),P.sx(x),P.sy(0));
      setLine(el.xm,P.sx(x),P.sy(0)-5,P.sx(x),P.sy(0)+5);
      moveTo(el.xl,P.sx(x),P.sy(0)-9);
      if(w>0 && e>0){ sl=e/w; xe=Math.min(WM,EM/sl); setLine(el.ray,P.sx(0),P.sy(0),P.sx(xe),P.sy(sl*xe)); }
      else setLine(el.ray,P.sx(0),P.sy(0),P.sx(WM),P.sy(0));
      setLine(el.gw,P.sx(w),P.sy(0),P.sx(w),P.sy(e));
      if(show){
        ts=s.es/s.ws; xe=Math.min(WM,EM/ts);
        setLine(el.tan,P.sx(0),P.sy(0),P.sx(xe),P.sy(ts*xe));
        el.star.setAttribute('r',4.5); at(el.star,P.sx(s.ws),P.sy(s.es));
        el.sl.textContent='w* = '+s.ws.toFixed(2);
        moveTo(el.sl,P.sx(s.ws)+9,P.sy(s.es)+16);
      } else { setLine(el.tan,0,0,0,0); el.star.setAttribute('r',0); el.sl.textContent=''; }
      place(el.k,P.sx(w),P.sy(e),w,'w = '+w.toFixed(2)+', e(w) = '+e.toFixed(2));
      if(!out) return;
      out.textContent='w = '+w.toFixed(2)+'   e(w) = '+e.toFixed(2)+(e>0?'   cost per unit of effort w/e = '+s.cost.toFixed(2)+'   elasticity w e′/e = '+s.el.toFixed(2):'   at or below x: no effort')+
        '\n'+(show?'cheapest wage w* = x/(1 − β) = '+s.ws.toFixed(2)+', e* = '+s.es.toFixed(2)+'   ':'')+'employment index '+s.L.toFixed(1)+' at the cheapest wage, A = '+A.toFixed(2);
      if(s.tangent){ var sp=document.createElement('span'); sp.className='ma6-ok'; sp.textContent='   tangent: the elasticity is 1'; out.appendChild(sp); }
    }
    dragIn(svg,function(){ return [W,H]; },function(){ return P && P.b; },
      function(p){ return P && near2(p,[P.sx(w),P.sy(eff(w))]); },
      function(p){ setW(P.sx.inv(p[0])); },
      function(){ try{ el.k.focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    api=NF.api({
      get:function(){ var s=state(); return {w:w, e:s.e, cost:s.cost, el:s.el, slope:w>0?s.e/w:0, ws:s.ws, es:s.es, x:x, beta:be, a:A, emp:s.L, tangent:s.tangent, shown:shown}; },
      set:function(st){
        if('x' in st){ if(rx) rx.set(+st.x); else x=+st.x; }
        if('beta' in st){ if(rb) rb.set(+st.beta); else be=+st.beta; }
        if('a' in st){ if(ra) ra.set(+st.a); else A=+st.a; }
        if('shown' in st){ shown=String(st.shown)==='true'; if(sb) sb.setAttribute('aria-pressed',shown?'true':'false'); }
        if('w' in st) w=clamp(+st.w,0,WM);
        snap(); paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Shapiro Stiglitz: the no shirking condition against labour demand ---------- */
  NF.register('ma6-nsc',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* N = 1, so L is the employment rate; effort cost e, discount rate r, separation rate b; demand w = A L^(-1/2) */
    var E=0.3, RR=0.05, BB=0.03, PHI=0.5, A=1, q=1, y=0.6, W=520, H=300, P, el={}, api, TOP=1.5, BOT=0.5;
    var ra=range(fig,'A',2,function(v){ A=v; update(); });
    var rq=range(fig,'q',1,function(v){ q=v; update(); });
    var ry=range(fig,'y',2,function(v){ y=v; update(); });
    if(ra) A=ra.v();
    if(rq) q=rq.v();
    if(ry) y=ry.v();
    function nsc(L){ return y+E+(E/q)*(RR+BB/(1-L)); }
    function dem(L){ return A*Math.pow(L,-PHI); }
    function state(){
      var L=bisect(function(L){ return dem(L)-nsc(L); },1e-9,1-1e-13,110), w=nsc(L), s0=y+E, Lc, wc, eN;
      if(A>=s0){ Lc=1; wc=A; } else { Lc=Math.pow(A/s0,1/PHI); wc=s0; }
      eN=(E/q)*BB*L/((1-L)*(1-L))/w;
      return {L:L, u:100*(1-L), w:w, Lc:Lc, wc:wc, rent:E/q, af:BB*L/(1-L), elw:eN/(PHI+eN), ell:1/(PHI+eN), n0:nsc(0)};
    }
    function draw(){
      var b;
      W=measure(svg); H=W>=480?300:280; frame(svg,W,H);
      b={x:44,y:30,w:W-44-16,h:H-30-42};
      P=box(svg,b,[0,1.1],[BOT,TOP],{xt:[0,0.2,0.4,0.6,0.8,1],yt:[0.6,0.8,1,1.2,1.4],xf:function(v){ return v===1?'N = 1':tl(v); },xl:'employment L',yl:'real wage w'});
      el.reg=S('path',{'class':'ma6-region'},P.gc);
      el.comp=S('path',{'class':'ma6-comp'},P.gc);
      el.dem=S('path',{'class':'ma6-dem'},P.gc);
      el.nsc=S('path',{'class':'ma6-nsc'},P.gc);
      el.gx=line(P.gc,0,0,0,0,'ma6-guide');
      el.gy=line(P.gc,0,0,0,0,'ma6-guide');
      el.ub=S('path',{'class':'ma6-ubr'},P.gc);
      el.ul=text(svg,0,0,'u','nf-lab nf-halo ma6-it','middle');
      el.oc=S('circle',{r:4.5,'class':'ma6-open'},P.gc);
      el.eq=S('circle',{r:5,'class':'ma6-deq'},P.gc);
      el.tr=text(svg,0,0,'no shirking region','nf-lab nf-halo ma6-tnsc');
      el.tn=text(svg,0,0,'NSC','nf-lab nf-halo ma6-tnsc','end');
      el.td=text(svg,0,0,'labour demand','nf-lab nf-halo ma6-tdem');
      el.ts=text(svg,0,0,'y + e','nf-lab nf-halo');
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var s=state(), pts=[], i, L, Lm, top=TOP+0.1, s0=y+E, Ld, k;
      /* NSC up to where it leaves the top of the plot: 1 - L = b / ((top - y - e) q / e - r) */
      Lm=1-BB/((top-s0)*q/E-RR);
      for(i=0;i<=220;i++){ k=i/220; L=Lm*(1-Math.pow(1-k,2.2)); pts.push([L,nsc(L)]); }
      el.nsc.setAttribute('d',curve(P,pts));
      el.reg.setAttribute('d',curve(P,pts.concat([[Lm,top],[0,top]]))+'Z');
      el.comp.setAttribute('d',curve(P,[[0,s0],[1,s0],[1,top]]));
      pts=[]; Ld=Math.pow(A/top,1/PHI);
      for(i=0;i<=160;i++){ L=Ld+(1.1-Ld)*i/160; pts.push([L,dem(L)]); }
      el.dem.setAttribute('d',curve(P,pts));
      setLine(el.gx,P.sx(s.L),P.sy(s.w),P.sx(s.L),P.sy(BOT));
      setLine(el.gy,P.sx(0),P.sy(s.w),P.sx(s.L),P.sy(s.w));
      at(el.eq,P.sx(s.L),P.sy(s.w));
      at(el.oc,P.sx(s.Lc),P.sy(s.wc));
      i=P.sy(BOT)-12;
      el.ub.setAttribute('d','M'+R(P.sx(s.L))+','+R(i-4)+'v8M'+R(P.sx(s.L))+','+R(i)+'H'+R(P.sx(1))+'M'+R(P.sx(1))+','+R(i-4)+'v8');
      moveTo(el.ul,(P.sx(s.L)+P.sx(1))/2,i-6);
      el.ul.textContent=P.sx(1)-P.sx(s.L)>14?'u':'';
      moveTo(el.tr,P.sx(0.03),P.sy(TOP-0.07));
      moveTo(el.tn,P.sx(1-BB/((TOP-0.06-s0)*q/E-RR))-6,P.sy(TOP-0.06)+4);
      moveTo(el.td,P.sx(Math.pow(A/(TOP-0.06),1/PHI))+7,P.sy(TOP-0.06)+4);
      moveTo(el.ts,P.sx(0.03),P.sy(s0)+(s0<s.n0-0.05?-6:15));
      if(!out) return;
      out.textContent='L* = '+s.L.toFixed(3)+'   u* = '+s.u.toFixed(1)+'%   w* = '+s.w.toFixed(3)+'   competitive: L = '+s.Lc.toFixed(3)+', w = '+s.wc.toFixed(3)+
        '\nemployed minus unemployed value e/q = '+s.rent.toFixed(2)+'   job finding rate a = bL/(N − L) = '+s.af.toFixed(2)+'   elasticity of w* to A: '+s.elw.toFixed(2);
    }
    api=NF.api({
      get:function(){ var s=state(); return {a:A, q:q, y:y, emp:s.L, u:s.u, w:s.w, wc:s.wc, lc:s.Lc, rent:s.rent, af:s.af, elw:s.elw, ell:s.ell}; },
      set:function(st){
        if('a' in st){ if(ra) ra.set(+st.a); else A=+st.a; }
        if('q' in st){ if(rq) rq.set(+st.q); else q=+st.q; }
        if('y' in st){ if(ry) ry.set(+st.y); else y=+st.y; }
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- search and matching: shared model ---------- */
  /* monthly rates: r discount rate, xi matching elasticity (m = u^xi v^(1-xi), as on slide 25), c vacancy cost per
     unit of productivity; the baseline is a = 1, z = 0.7, beta = 0.5, lambda = 0.034 */
  var DM={r:0.004, xi:0.5, c:1, a:1, z:0.7, be:0.5, lam:0.034};
  function dmp(a,z,be,lam){
    var r=DM.r, xi=DM.xi, c=DM.c, t, w, p, u;
    /* (1 - beta)(1 - z/a) = c((r + lambda)/q(theta) + beta theta), with 1/q(theta) = theta^xi */
    function G(th){ return (1-be)*(1-z/a)-c*((r+lam)*Math.pow(th,xi)+be*th); }
    if(G(0)<=0) return {th:0, w:z, p:0, q:0, u:1, v:0, lam:lam};
    t=bisect(G,0,500,200);
    w=be*(a+t*a*c)+(1-be)*z; p=Math.pow(t,1-xi); u=lam/(lam+p);
    return {th:t, w:w, p:p, q:Math.pow(t,-xi), u:u, v:t*u, lam:lam};
  }
  function bcPts(lam){
    var pts=[], i, t, u;
    for(i=0;i<=260;i++){ t=Math.pow(10,-5+9*i/260); u=lam/(lam+Math.pow(t,1-DM.xi)); pts.push([u,t*u]); }
    return pts;
  }
  function pctTick(v){ return tl(Math.round(v*1000)/10); }

  /* ---------- 4. Search and matching: wage curve, job creation, Beveridge curve ---------- */
  NF.register('ma6-dmp',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var a=DM.a, z=DM.z, be=DM.be, lam=DM.lam, W=520, H=270, P1, P2, el={}, api, ax=null;
    var rs={a:range(fig,'a',2,function(v){ a=v; update(); }), z:range(fig,'z',2,function(v){ z=v; update(); }),
            be:range(fig,'beta',2,function(v){ be=v; update(); }), lam:range(fig,'lam',3,function(v){ lam=v; update(); })};
    if(rs.a) a=rs.a.v();
    if(rs.z) z=rs.z.v();
    if(rs.be) be=rs.be.v();
    if(rs.lam) lam=rs.lam.v();
    var rb=fig.querySelector('.nfig-reset');
    if(rb) rb.addEventListener('click',function(){ api.set({a:DM.a, z:DM.z, beta:DM.be, lam:DM.lam}); });
    var B0=dmp(DM.a,DM.z,DM.be,DM.lam);
    function base(){ return Math.abs(a-DM.a)<1e-9 && Math.abs(z-DM.z)<1e-9 && Math.abs(be-DM.be)<1e-9 && Math.abs(lam-DM.lam)<1e-9; }
    function axes(s){
      var t=pick([[0.6,[0,0.2,0.4,0.6]],[1.2,[0,0.4,0.8,1.2]],[2.4,[0,0.8,1.6,2.4]],[4.8,[0,1.6,3.2,4.8]]],1.2*Math.max(s.th,B0.th)),
          u=pick([[0.1,[0,0.05,0.1]],[0.15,[0,0.05,0.1,0.15]],[0.2,[0,0.05,0.1,0.15,0.2]],[0.3,[0,0.1,0.2,0.3]],[0.4,[0,0.1,0.2,0.3,0.4]]],1.35*Math.max(s.u,B0.u)),
          v=pick([[0.03,[0,0.01,0.02,0.03]],[0.05,[0,0.01,0.02,0.03,0.04,0.05]],[0.08,[0,0.02,0.04,0.06,0.08]],[0.12,[0,0.04,0.08,0.12]]],1.5*Math.max(s.v,B0.v));
      return {t:t, u:u, v:v, key:t[0]+'/'+u[0]+'/'+v[0]};
    }
    function draw(){
      var L, s=dmp(a,z,be,lam);
      ax=axes(s);
      W=measure(svg); L=two(W,W>=600?200:184); H=L.H; frame(svg,W,H);
      P1=box(svg,L.b1,[0,ax.t[0]],[0.7,1.3],{xt:ax.t[1],yt:[0.7,0.8,0.9,1,1.1,1.2,1.3],xl:'tightness θ = v/u',yl:'wage w',title:'Figure 1: θ and w'});
      P2=box(svg,L.b2,[0,ax.u[0]],[0,ax.v[0]],{xt:ax.u[1],yt:ax.v[1],xf:pctTick,yf:pctTick,xl:'unemployment u, %',yl:'vacancies v, %',title:'Figure 2: u and v'});
      el.wc0=S('path',{'class':'ma6-ref'},P1.gc);
      el.jc0=S('path',{'class':'ma6-ref'},P1.gc);
      el.wc=S('path',{'class':'ma6-wc'},P1.gc);
      el.jc=S('path',{'class':'ma6-jc'},P1.gc);
      el.g1=S('path',{'class':'ma6-guide'},P1.gc);
      el.o1=S('circle',{r:4,'class':'ma6-open'},P1.gc);
      el.e1=S('circle',{r:5,'class':'ma6-deq'},P1.gc);
      el.bc0=S('path',{'class':'ma6-ref'},P2.gc);
      el.ry0=line(P2.gc,0,0,0,0,'ma6-ref');
      el.bc=S('path',{'class':'ma6-bc'},P2.gc);
      el.ry=line(P2.gc,0,0,0,0,'ma6-jc');
      el.g2=S('path',{'class':'ma6-guide'},P2.gc);
      el.o2=S('circle',{r:4,'class':'ma6-open'},P2.gc);
      el.e2=S('circle',{r:5,'class':'ma6-deq'},P2.gc);
      el.twc=text(svg,0,0,'WC','nf-lab nf-halo ma6-twc','end');
      el.tjc=text(svg,0,0,'JC','nf-lab nf-halo ma6-tjc','end');
      el.tbc=text(svg,0,0,'BC','nf-lab nf-halo ma6-tbc','end');
      el.try=text(svg,0,0,'JC','nf-lab nf-halo ma6-tjc','end');
      paint(s);
    }
    function update(){
      var s=dmp(a,z,be,lam);
      if(!ax || axes(s).key!==ax.key) draw(); else paint(s);
      if(api) api.changed();
    }
    function wcf(th,p){ return p.be*(p.a+th*p.a*DM.c)+(1-p.be)*p.z; }
    function jcf(th,p){ return p.a*(1-(DM.r+p.lam)*DM.c*Math.pow(th,DM.xi)); }
    function paint(s){
      var p={a:a,z:z,be:be,lam:lam}, p0={a:DM.a,z:DM.z,be:DM.be,lam:DM.lam}, T=ax.t[0], U=ax.u[0], V=ax.v[0], b0=base(), i, th, pj=[], pj0=[], tw, xl;
      el.wc.setAttribute('d',curve(P1,[[0,wcf(0,p)],[T,wcf(T,p)]]));
      for(i=0;i<=160;i++){ th=T*i/160; pj.push([th,jcf(th,p)]); pj0.push([th,jcf(th,p0)]); }
      el.jc.setAttribute('d',curve(P1,pj));
      el.wc0.setAttribute('d',b0?'':curve(P1,[[0,wcf(0,p0)],[T,wcf(T,p0)]]));
      el.jc0.setAttribute('d',b0?'':curve(P1,pj0));
      el.g1.setAttribute('d',curve(P1,[[s.th,0.7],[s.th,s.w],[0,s.w]]));
      at(el.e1,P1.sx(s.th),P1.sy(s.w));
      if(b0) el.o1.setAttribute('r',0); else { el.o1.setAttribute('r',4); at(el.o1,P1.sx(B0.th),P1.sy(B0.w)); }
      el.bc.setAttribute('d',curve(P2,bcPts(lam)));
      el.bc0.setAttribute('d',Math.abs(lam-DM.lam)<1e-9?'':curve(P2,bcPts(DM.lam)));
      setLine(el.ry,P2.sx(0),P2.sy(0),P2.sx(U),P2.sy(s.th*U));
      if(b0) setLine(el.ry0,0,0,0,0); else setLine(el.ry0,P2.sx(0),P2.sy(0),P2.sx(U),P2.sy(B0.th*U));
      el.g2.setAttribute('d',curve(P2,[[s.u,0],[s.u,s.v],[0,s.v]]));
      at(el.e2,P2.sx(s.u),P2.sy(s.v));
      if(b0) el.o2.setAttribute('r',0); else { el.o2.setAttribute('r',4); at(el.o2,P2.sx(B0.u),P2.sy(B0.v)); }
      /* labels where each curve leaves its box */
      tw=wcf(T,p); xl=tw>1.27?(1.27-wcf(0,p))/(be*a*DM.c):T;
      moveTo(el.twc,P1.sx(Math.min(T,xl))-4,P1.sy(Math.min(1.27,tw))-7);
      moveTo(el.tjc,P1.sx(T)-4,P1.sy(jcf(T,p))+(jcf(T,p)>wcf(T,p)?-7:15));
      moveTo(el.tbc,P2.sx(U)-4,P2.sy(lam*lam*(1-U)*(1-U)/U)-7);
      /* the ray's label sits on its upper side, low enough to stay clear of the box title */
      xl=Math.min(U*0.97,0.85*V/s.th);
      moveTo(el.try,P2.sx(xl)-6,P2.sy(s.th*xl)-6);
      if(!out) return;
      out.textContent='θ* = '+s.th.toFixed(3)+'   w* = '+s.w.toFixed(3)+'   u* = '+(100*s.u).toFixed(2)+'%   v* = '+(100*s.v).toFixed(2)+'%'+
        '\njob finding θq(θ) = '+s.p.toFixed(2)+' a month, '+(s.p>0?(1/s.p).toFixed(2):'∞')+' months to find a job   vacancy filling q(θ) = '+s.q.toFixed(2)+' a month'+
        (b0?'':'\nagainst the dashed baseline: θ '+sg(100*(s.th/B0.th-1),1)+'%, w '+sg(100*(s.w/B0.w-1),1)+'%, u '+sg(100*(s.u-B0.u),2)+' points, v '+sg(100*(s.v-B0.v),2)+' points');
    }
    api=NF.api({
      get:function(){
        var s=dmp(a,z,be,lam);
        return {a:a, z:z, beta:be, lam:lam, th:s.th, w:s.w, u:100*s.u, v:100*s.v, p:s.p, qv:s.q, dur:s.p>0?1/s.p:0,
                dth:100*(s.th/B0.th-1), dw:100*(s.w/B0.w-1), du:100*(s.u-B0.u), dv:100*(s.v-B0.v)};
      },
      set:function(st){
        if('a' in st && rs.a) rs.a.set(+st.a);
        if('z' in st && rs.z) rs.z.set(+st.z);
        if('beta' in st && rs.be) rs.be.set(+st.beta);
        if('lam' in st && rs.lam) rs.lam.set(+st.lam);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Unemployment dynamics after a permanent shock ---------- */
  NF.register('ma6-path',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var SH={prod:{a:1.1, lam:DM.lam, ylo:-15, yhi:30, yt:[-10,0,10,20,30]}, sep:{a:1, lam:1.5*DM.lam, ylo:-20, yhi:60, yt:[-20,0,20,40,60]}};
    var shock='prod', t=0, TM=8, W=520, H=270, P1, P2, el={}, api, raf=0, plays=0;
    var B0=dmp(DM.a,DM.z,DM.be,DM.lam);
    var rt=range(fig,'t',1,function(v){ stopPlay(); t=v; update(); });
    if(rt) t=rt.v();
    var c0=seg(fig,'data-shock',function(v){ if(!SH[v]||v===shock) return; shock=v; draw(); if(api) api.changed(); });
    if(SH[c0]) shock=c0;
    var pb=fig.querySelector('.ma6-play');
    if(pb) pb.addEventListener('click',play);
    function after(){ var s=SH[shock]; return dmp(s.a,DM.z,DM.be,s.lam); }
    function path(tt,B1){
      var k=B1.lam+B1.p, u=tt<0?B0.u:B1.u+(B0.u-B1.u)*Math.exp(-k*tt), v=tt<0?B0.v:B1.th*u;
      return {u:u, v:v, k:k};
    }
    function stopPlay(){ if(raf){ cancelAnimationFrame(raf); raf=0; if(pb) pb.textContent='Play'; } }
    function play(){
      stopPlay();
      var start=t>=TM-1e-9?0:t, t0=0;
      plays++;
      if(reduce){ setT(TM); return; }
      if(pb) pb.textContent='Playing';
      function step(ts){
        if(!t0) t0=ts;
        var v=Math.min(TM,start+(ts-t0)/1000*2.4);
        t=Math.round(v*10)/10; if(rt){ rt.el.value=String(t); syncVal(); }
        update();
        if(v<TM) raf=requestAnimationFrame(step); else { raf=0; if(pb) pb.textContent='Play'; }
      }
      raf=requestAnimationFrame(step);
    }
    /* keep the slider's label and filled track in step while the animation runs */
    function syncVal(){
      var inp=rt.el, lo=parseFloat(inp.min), hi=parseFloat(inp.max), val=rt.wrap.querySelector('.nfig-val');
      inp.style.setProperty('--p',((t-lo)/(hi-lo)*100).toFixed(1)+'%');
      if(val) val.textContent=fmt(t,1);
    }
    function setT(v){ if(rt) rt.set(v); else { t=v; update(); } }
    function draw(){
      var L, sh=SH[shock];
      W=measure(svg); L=two(W,W>=600?200:184); H=L.H; frame(svg,W,H);
      P1=box(svg,L.b1,[0,0.12],[0,0.03],{xt:[0,0.04,0.08,0.12],yt:[0,0.01,0.02,0.03],xf:pctTick,yf:pctTick,xl:'unemployment u, %',yl:'vacancies v, %',title:'path in the u, v plane'});
      P2=box(svg,L.b2,[-1,TM],[sh.ylo,sh.yhi],{xt:[0,2,4,6,8],yt:sh.yt,zero:true,xl:'months after the shock',yl:'% from old steady state',title:'time paths'});
      el.bc0=S('path',{'class':'ma6-ref'},P1.gc);
      el.bc=S('path',{'class':'ma6-bc'},P1.gc);
      el.r0=line(P1.gc,0,0,0,0,'ma6-ref');
      el.r1=line(P1.gc,0,0,0,0,'ma6-jc');
      el.tr=S('path',{'class':'ma6-trail'},P1.gc);
      el.o=S('circle',{r:4,'class':'ma6-open'},P1.gc);
      el.n=S('circle',{r:4,'class':'ma6-ring'},P1.gc);
      el.d=S('circle',{r:5,'class':'ma6-deq'},P1.gc);
      el.uf=S('path',{'class':'ma6-fu ma6-future'},P2.gc);
      el.vf=S('path',{'class':'ma6-fv ma6-future'},P2.gc);
      el.up=S('path',{'class':'ma6-fu'},P2.gc);
      el.vp=S('path',{'class':'ma6-fv'},P2.gc);
      el.cur=line(P2.gc,0,0,0,0,'ma6-cursor');
      el.tu=text(svg,0,0,'u','nf-lab nf-halo ma6-tu','end');
      el.tv=text(svg,0,0,'v','nf-lab nf-halo ma6-tv','end');
      el.tb=text(svg,0,0,'BC','nf-lab nf-halo ma6-tbc','end');
      el.tj=text(svg,0,0,'JC after','nf-lab nf-halo ma6-tjc','end');
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var B1=after(), sh=SH[shock], c=path(t,B1), i, tt, pu=[], pv=[], fu=[], fv=[], tr=[], uq, xl, U=0.12, V=0.03;
      el.bc.setAttribute('d',curve(P1,bcPts(B1.lam)));
      el.bc0.setAttribute('d',Math.abs(B1.lam-DM.lam)<1e-12?'':curve(P1,bcPts(DM.lam)));
      setLine(el.r0,P1.sx(0),P1.sy(0),P1.sx(U),P1.sy(B0.th*U));
      setLine(el.r1,P1.sx(0),P1.sy(0),P1.sx(U),P1.sy(B1.th*U));
      /* the trail: a jump in v at the old u, then a slide along the new job creation ray */
      tr.push([B0.u,B0.v],[B0.u,B1.th*B0.u]);
      for(i=1;i<=80;i++){ tt=t*i/80; tr.push([path(tt,B1).u,path(tt,B1).v]); }
      el.tr.setAttribute('d',curve(P1,tr));
      at(el.o,P1.sx(B0.u),P1.sy(B0.v)); at(el.n,P1.sx(B1.u),P1.sy(B1.v)); at(el.d,P1.sx(c.u),P1.sy(c.v));
      moveTo(el.tb,P1.sx(U)-4,P1.sy(B1.lam*B1.lam*(1-U)*(1-U)/U)-7);
      xl=Math.min(U*0.97,0.85*V/B1.th);
      moveTo(el.tj,P1.sx(xl)-6,P1.sy(B1.th*xl)-6);
      /* time paths as percent deviations from the old steady state: flat before the shock, then v jumps at t = 0
         while u, a stock, starts to move only through the flows */
      fu=[[-1,0],[0,0]]; fv=[[-1,0],[0,0]]; pu=fu.slice(); pv=fv.slice();
      for(i=0;i<=160;i++){
        tt=TM*i/160; uq=path(tt,B1);
        fu.push([tt,100*(uq.u/B0.u-1)]); fv.push([tt,100*(uq.v/B0.v-1)]);
        if(tt<t){ pu.push(fu[fu.length-1]); pv.push(fv[fv.length-1]); }
      }
      pu.push([t,100*(c.u/B0.u-1)]); pv.push([t,100*(c.v/B0.v-1)]);
      el.uf.setAttribute('d',curve(P2,fu)); el.vf.setAttribute('d',curve(P2,fv));
      el.up.setAttribute('d',curve(P2,pu)); el.vp.setAttribute('d',curve(P2,pv));
      setLine(el.cur,P2.sx(t),P2.sy(sh.yhi),P2.sx(t),P2.sy(sh.ylo));
      moveTo(el.tu,P2.sx(TM)-4,P2.sy(100*(B1.u/B0.u-1))+(B1.u<B0.u?15:-7));
      moveTo(el.tv,P2.sx(TM)-4,P2.sy(100*(B1.v/B0.v-1))+(B1.u<B0.u?-7:15));
      if(!out) return;
      out.textContent='t = '+t.toFixed(1)+' months   u = '+(100*c.u).toFixed(2)+'%   v = '+(100*c.v).toFixed(2)+'%   θ = '+B1.th.toFixed(3)+' from t = 0 on (was '+B0.th.toFixed(3)+')'+
        '\nspeed λ + θq(θ) = '+c.k.toFixed(3)+' a month: half the gap to the new u = '+(100*B1.u).toFixed(2)+'% closes in ln 2/'+c.k.toFixed(3)+' = '+(Math.LN2/c.k).toFixed(2)+' months';
    }
    api=NF.api({
      get:function(){
        var B1=after(), c=path(t,B1);
        return {shock:shock, t:t, u:100*c.u, v:100*c.v, th:B1.th, th0:B0.th, k:c.k, half:Math.LN2/c.k, u0:100*B0.u, u1:100*B1.u,
                v0:100*B0.v, v1:100*B1.v, vimp:100*B1.th*B0.u, du:100*(c.u/B0.u-1), dv:100*(c.v/B0.v-1), plays:plays};
      },
      set:function(st){
        if('shock' in st) NF.press(fig,'data-shock',String(st.shock));
        if('t' in st) setT(+st.t);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
