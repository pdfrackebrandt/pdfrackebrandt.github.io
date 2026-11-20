/* Core Macroeconomics L12 figures: Diamond Dybvig liquidity insurance, the bank run game under a deposit contract,
   suspension of convertibility and deposit insurance, the ex ante deposit decision under a run probability, and
   Kareken Wallace risk taking under deposit insurance.
   Every curve is computed in the browser from the model in the note. Drawn with the helpers of /assets/notes.js
   (window.NF); colours come from CSS variables in /assets/figs/ma12.css, so dark mode follows.

   Diamond Dybvig. T = 0, 1, 2; one unit invested pays 1 if liquidated at T = 1 and R at T = 2. A share t is impatient,
   utility u(c1); the rest are patient, utility rho u(c1 + c2). CRRA u(c) = c^(1 - gamma) / (1 - gamma) (log at gamma = 1).
     resources        (1 - t) c2 = R (1 - t c1)
     optimum          u'(c1) = rho R u'(c2)  =>  c2/c1 = (rho R)^(1/gamma),  c1* = R / (t R + (1 - t)(rho R)^(1/gamma))
     deposit contract r1 = c1*; a fraction f withdraws early:
                      r2(f) = R (1 - f r1) / (1 - f) while f < 1/r1, else 0 (the bank is empty at T = 1)
                      an early withdrawer gets r1, or r1 with probability 1/(f r1) once f > 1/r1 (expected 1/f)
     tipping point    r2(f) = c1*  <=>  fhat = (R - c1*) / (c1* (R - 1))
     suspension       the bank stops paying at T = 1 after a fraction t: waiting pays c2*, trying early pays
                      c1* with probability t/f and c2* otherwise
     insurance        withdrawals taxed at tau = 1 - 1/c1* once f > t: early pays 1, waiting pays R (1 - f)/(1 - f) = R
     ex ante          (1 - pi) W* + pi [t + rho (1 - t)] [u(c1*)/c1* + (1 - 1/c1*) u(floor)]  against  t u(1) + (1 - t) rho u(R)
   Kareken Wallace. Wealth 1; safe return R; risky theta + eps or theta - eps with probability 1/2; share mu risky;
   utility -(c - cbar)^2. c_L = R + mu (theta - R - eps), c_H = R + mu (theta - R + eps).
     no insurance     mu = (cbar - R)(theta - R) / (eps^2 + (theta - R)^2)
     insurance        c_L = R whatever mu: mu' = min{1, (cbar - R) / (theta + eps - R)} */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- the model ---------- */
  function u(c,g){ return Math.abs(g-1)<1e-9 ? Math.log(c) : Math.pow(c,1-g)/(1-g); }
  function up(c,g){ return Math.pow(c,-g); }
  /* inverse of u; NaN where v is outside the range of u */
  function uinv(v,g){ return Math.abs(g-1)<1e-9 ? Math.exp(v) : Math.pow((1-g)*v,1/(1-g)); }
  function dd(t,Rr,rho,g){
    var k=Math.pow(rho*Rr,1/g), c1=Rr/(t*Rr+(1-t)*k), c2=k*c1;
    return {k:k, c1:c1, c2:c2, fh:(Rr-c1)/(c1*(Rr-1)), fe:1/c1, Ws:t*u(c1,g)+(1-t)*rho*u(c2,g), Wa:t*u(1,g)+(1-t)*rho*u(Rr,g)};
  }

  /* ---------- shared drawing ---------- */
  /* one plot box: grid, ticks, tick labels and axis names; sx and sy map data to the svg, gc is clipped to the box */
  function box(svg,b,xd,yd,o){
    var g=S('g',null,svg), sx=lin(xd[0],xd[1],b.x,b.x+b.w), sy=lin(yd[0],yd[1],b.y+b.h,b.y), i, v, f;
    for(i=0;i<o.xt.length;i++){
      v=o.xt[i]; f=C(sx(v));
      line(g,f,b.y,f,b.y+b.h,'nf-grid');
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
    if(o.yl) text(g,b.x-(o.ylx||36),b.y-11,o.yl,'nf-title');
    if(o.title) text(g,b.x+b.w,b.y-11,o.title,'nf-lab','end');
    return {sx:sx, sy:sy, b:b, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  function curve(P,pts){ return poly(pts.map(function(p){ return [P.sx(p[0]),P.sy(p[1])]; })); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  /* two plot boxes, side by side when the figure is wide, otherwise one above the other */
  function two(W,ph){
    var L=48, Rm=12, T=30, B=42, gap=18, pw;
    if(W>=600){ pw=Math.floor((W-2*L-Rm-gap)/2); return {b1:{x:L,y:T,w:pw,h:ph}, b2:{x:2*L+pw+gap,y:T,w:pw,h:ph}, H:T+ph+B}; }
    pw=W-L-Rm;
    return {b1:{x:L,y:T,w:pw,h:ph}, b2:{x:L,y:2*T+ph+B,w:pw,h:ph}, H:2*(T+ph+B)};
  }
  /* nice tick values covering [lo, hi] with about n steps */
  function ticks(lo,hi,n){
    var raw=(hi-lo)/n, p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), m=raw/p, s=(m<1.5?1:m<3?2:m<7?5:10)*p, out=[], v;
    for(v=Math.ceil(lo/s-1e-9)*s; v<=hi+s*1e-9; v+=s) out.push(+v.toFixed(10));
    return out;
  }
  function niceUp(v,s){ return Math.ceil(v/s-1e-9)*s; }
  function niceDown(v,s){ return Math.floor(v/s+1e-9)*s; }
  /* a draggable knob with a focus ring; arrow keys call onKey(+1 or -1, shift held) */
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
    h.setAttribute('aria-valuenow',+now.toFixed(3));
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
  function near2(a,b,r){ return Math.hypot(a[0]-b[0],a[1]-b[1])<(r||24); }
  function onClick(fig,sel,cb){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',cb); return b; }
  function pct(v,d){ return (v>0 && parseFloat(v.toFixed(d))!==0?'+':'')+fmt(v,d)+'%'; }
  /* a chevron pointing left (d = -1) or right (d = +1) at x, y */
  function chev(x,y,d){ return 'M'+R(x-3*d)+','+R(y-4)+'L'+R(x+3*d)+','+R(y)+'L'+R(x-3*d)+','+R(y+4); }

  /* ---------- 1. The planner's optimum against autarky ---------- */
  NF.register('ma12-optimum',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var P0={t:0.25, R:1.5, rho:0.95, gamma:2}, t=P0.t, Rr=P0.R, rho=P0.rho, g=P0.gamma, c1=1, stick=false,
        W=520, H=340, P, el={}, api, XL=0.6, XH=2, YL=0.6, YH=2;
    var rs={t:range(fig,'t',2,function(v){ t=v; follow(); }), R:range(fig,'R',2,function(v){ Rr=v; follow(); }),
            rho:range(fig,'rho',2,function(v){ rho=v; follow(); }), gamma:range(fig,'gamma',2,function(v){ g=v; follow(); })};
    if(rs.t) t=rs.t.v();
    if(rs.R) Rr=rs.R.v();
    if(rs.rho) rho=rs.rho.v();
    if(rs.gamma) g=rs.gamma.v();
    function c2of(c){ return Rr*(1-t*c)/(1-t); }
    function lim(v){ return clamp(v,XL,Math.min(XH,1/t-1e-6)); }
    /* the point snaps onto the optimum when it comes close, so the tangency can be found by hand */
    function setC1(v){ var o=dd(t,Rr,rho,g); v=lim(v); if(Math.abs(v-o.c1)<0.012) v=o.c1; c1=v; stick=Math.abs(c1-o.c1)<1e-12; update(); }
    function follow(){ var o=dd(t,Rr,rho,g); if(stick) c1=o.c1; c1=lim(c1); draw(); if(api) api.changed(); }
    function state(){
      var o=dd(t,Rr,rho,g), c2=c2of(c1), V=t*u(c1,g)+(1-t)*rho*u(c2,g), m=t+(1-t)*rho;
      return {o:o, c2:c2, V:V, ce:uinv(V/m,g), ces:uinv(o.Ws/m,g), cea:uinv(o.Wa/m,g), m1:up(c1,g), m2:rho*Rr*up(c2,g)};
    }
    /* indifference curve t u(x) + (1 - t) rho u(y) = V, as y of x */
    function ic(V){
      var pts=[], i, x, y;
      for(i=0;i<=240;i++){
        x=XL+(XH-XL)*i/240; y=uinv((V-t*u(x,g))/((1-t)*rho),g);
        if(isFinite(y) && y>0) pts.push([x,Math.min(y,YH+1)]);
      }
      return pts;
    }
    function draw(){
      var b;
      W=measure(svg); H=W>=480?340:320; frame(svg,W,H);
      YH=Math.max(2,Math.ceil((Rr+0.3)*5-1e-9)/5);
      b={x:44,y:30,w:W-44-16,h:H-30-44};
      P=box(svg,b,[XL,XH],[YL,YH],{xt:ticks(XL,XH,W>=480?7:4).filter(function(v){ return v>=XL-1e-9; }),yt:ticks(YL,YH,6),
        xl:'impatient consumption c₁',yl:'patient consumption c₂'});
      el.diag=line(P.gc,P.sx(XL),P.sy(XL),P.sx(XH),P.sy(XH),'ma12-diag');
      el.res=S('path',{'class':'ma12-res'},P.gc);
      el.ic0=S('path',{'class':'ma12-ic0'},P.gc);
      el.ic=S('path',{'class':'ma12-ic'},P.gc);
      el.g1=line(P.gc,0,0,0,0,'ma12-g1');
      el.g2=line(P.gc,0,0,0,0,'ma12-g2');
      el.aut=S('circle',{r:4.5,'class':'ma12-aut'},P.gc);
      el.opt=S('circle',{r:4.5,'class':'ma12-opt'},P.gc);
      el.tdiag=text(svg,0,0,'c₂ = c₁','nf-lab nf-halo','end');
      el.tres=text(svg,0,0,'resources','nf-lab nf-halo','end');
      el.taut=text(svg,0,0,'autarky (1, R)','nf-lab nf-halo');
      el.t1=text(svg,0,0,'c₁*','nf-lab nf-halo ma12-te','middle');
      el.t2=text(svg,0,0,'c₂*','nf-lab nf-halo ma12-tw');
      el.tic=text(svg,0,0,'','nf-lab nf-halo ma12-tic');
      el.k=knob(svg,'ma12-kres','Allocation c1 on the resource line, arrow keys move it',function(d,big){ setC1(c1+d*(big?0.05:0.01)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var s=state(), o=s.o, x1=Math.min(XH,1/t), yt, xr, warn;
      el.res.setAttribute('d',curve(P,[[XL,c2of(XL)],[x1,c2of(x1)]]));
      el.ic.setAttribute('d',curve(P,ic(o.Ws)));
      el.ic0.setAttribute('d',stick?'':curve(P,ic(s.V)));
      setLine(el.g1,P.sx(o.c1),P.sy(o.c2),P.sx(o.c1),P.sy(YL));
      setLine(el.g2,P.sx(XL),P.sy(o.c2),P.sx(o.c1),P.sy(o.c2));
      at(el.aut,P.sx(1),P.sy(Rr)); at(el.opt,P.sx(o.c1),P.sy(o.c2));
      moveTo(el.t1,P.sx(o.c1),P.sy(YL)-6);
      moveTo(el.t2,P.sx(XL)+5,P.sy(o.c2)-6);
      moveTo(el.taut,P.sx(1)+8,P.sy(Rr)-8);
      moveTo(el.tdiag,P.sx(XH)-4,P.sy(XH)+14);
      /* the resource label sits below the line, ending at a point well away from the optimum and from autarky */
      xr=[o.c1+0.45,o.c1+0.3,o.c1-0.3,XL+0.35].filter(function(x){ var y=c2of(x); return x>=XL+0.3 && x<=XH-0.02 && y>=YL+0.12 && y<=YH-0.05 && Math.abs(x-1)>0.12; })[0];
      if(xr===undefined) xr=XH-0.02;
      yt=c2of(xr);
      moveTo(el.tres,P.sx(xr)-4,P.sy(yt)+15);
      el.tic.textContent='indifference';
      moveTo(el.tic,P.sx(XL)+6,P.sy(Math.min(YH-0.06,o.c2+0.32)));
      place(el.k,P.sx(c1),P.sy(s.c2),c1,'c1 = '+c1.toFixed(3)+', c2 = '+s.c2.toFixed(3));
      if(!out) return;
      warn=o.c2<o.c1-1e-9 ? '   ρR < 1: c₂* < c₁*, patients would withdraw early' : (o.c1<1 ? '   c₁* < 1: the bank promises less than liquidation pays' : '');
      out.textContent='chosen c₁ = '+c1.toFixed(3)+', c₂ = '+s.c2.toFixed(3)+(Math.abs(c1-1)<1e-9?': autarky':'')+
        (stick?': the optimum':'   u′(c₁) = '+s.m1.toFixed(3)+' against ρR u′(c₂) = '+s.m2.toFixed(3)+(s.m1>s.m2?': give the impatient more':': give the patient more'))+
        '\noptimum c₁* = '+o.c1.toFixed(3)+', c₂* = '+o.c2.toFixed(3)+', c₂*/c₁* = (ρR)^(1/γ) = '+o.k.toFixed(3)+'   worth '+pct(100*(s.ces/s.cea-1),2)+' of consumption over autarky'+warn;
    }
    onClick(fig,'.nfig-reset',function(){ var k; for(k in P0) if(rs[k]) rs[k].set(P0[k]); c1=1; stick=false; draw(); if(api) api.changed(); });
    onClick(fig,'.ma12-go',function(){ setC1(dd(t,Rr,rho,g).c1); });
    dragIn(svg,function(){ return [W,H]; },function(){ return P && P.b; },
      function(p){ return P && near2(p,[P.sx(c1),P.sy(c2of(c1))]); },
      function(p){ setC1(P.sx.inv(p[0])); },
      function(){ try{ el.k.focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    api=NF.api({
      get:function(){ var s=state(), o=s.o; return {c1:c1, c2:s.c2, c1s:o.c1, c2s:o.c2, gap:Math.abs(c1-o.c1), ratio:o.k, t:t, r:Rr, rho:rho, gamma:g,
        gain:100*(s.ces/s.cea-1), m1:s.m1, m2:s.m2, ic:o.c2>=o.c1?1:0}; },
      set:function(st){
        if('t' in st && rs.t) rs.t.set(+st.t);
        if('r' in st && rs.R) rs.R.set(+st.r);
        if('rho' in st && rs.rho) rs.rho.set(+st.rho);
        if('gamma' in st && rs.gamma) rs.gamma.set(+st.gamma);
        if('c1' in st){ c1=lim(+st.c1); stick=false; }
        if('opt' in st && +st.opt===1){ c1=dd(t,Rr,rho,g).c1; stick=true; }
        draw();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The bank run game: payoffs to a patient depositor against the fraction f withdrawing early ---------- */
  NF.register('ma12-run',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var RHO=0.95, t=0.25, Rr=1.5, g=2, f=0.25, mode='bank', W=520, H=330, P, el={}, api, YH=2;
    var rt=range(fig,'t',2,function(v){ t=v; f=Math.max(f,t); draw(); if(api) api.changed(); });
    var rr=range(fig,'R',2,function(v){ Rr=v; draw(); if(api) api.changed(); });
    var rg=range(fig,'gamma',2,function(v){ g=v; draw(); if(api) api.changed(); });
    if(rt) t=rt.v();
    if(rr) Rr=rr.v();
    if(rg) g=rg.v();
    f=Math.max(f,t);
    var m0=seg(fig,'data-mode',function(v){ mode=v; draw(); if(api) api.changed(); });
    if(m0) mode=m0;
    function model(){ return dd(t,Rr,RHO,g); }
    /* what a patient depositor expects from waiting and from withdrawing early when a fraction ff withdraws early */
    function pay(ff,o){
      if(mode==='suspend') return {wait:o.c2, early:(t/ff)*o.c1+(1-t/ff)*o.c2};
      if(mode==='insure') return ff<=t+1e-9 ? {wait:o.c2, early:o.c1} : {wait:Rr, early:1};
      return {wait:ff>=o.fe-1e-12 ? 0 : Rr*(1-ff*o.c1)/(1-ff), early:ff<=o.fe ? o.c1 : 1/ff};
    }
    function setF(v){ f=clamp(Math.round(v*1000)/1000,t,1); update(); }
    function state(){
      var o=model(), p=pay(f,o);
      return {o:o, wait:p.wait, early:p.early, best:p.wait>=p.early-1e-12?'wait':'withdraw', eqs:mode==='bank'?2:1};
    }
    function draw(){
      var b, o=model();
      W=measure(svg); H=W>=480?330:310; frame(svg,W,H);
      YH=Math.ceil((Math.max(Rr,o.c2)+0.2)*2-1e-9)/2;
      b={x:44,y:30,w:W-44-16,h:H-30-44};
      P=box(svg,b,[0,1],[0,YH],{xt:[0,0.2,0.4,0.6,0.8,1],yt:ticks(0,YH,W>=480?5:4),xl:'fraction withdrawing early f',yl:'payoff to a patient depositor'});
      el.shade=S('rect',{'class':'ma12-imp'},P.gc);
      el.tt=text(svg,0,0,'t','nf-lab nf-halo ma12-it','middle');
      el.fh=line(P.gc,0,0,0,0,'ma12-fh');
      el.tfh=text(svg,0,0,'f̂','nf-lab nf-halo ma12-tf','middle');
      el.cur=line(P.gc,0,0,0,0,'nf-guide');
      el.early=S('path',{'class':'ma12-early'},P.gc);
      el.wait=S('path',{'class':'ma12-wait'},P.gc);
      el.ow=S('circle',{r:3.5,'class':'ma12-owait'},P.gc);
      el.oe=S('circle',{r:3.5,'class':'ma12-oearly'},P.gc);
      el.dw=S('circle',{r:4.5,'class':'ma12-dwait'},P.gc);
      el.de=S('circle',{r:4.5,'class':'ma12-dearly'},P.gc);
      el.pe=S('circle',{r:4.5,'class':'ma12-dearly'},P.gc);
      el.track=S('g',null,svg);
      el.tw=text(svg,0,0,'wait','nf-lab nf-halo ma12-tw','end');
      el.te=text(svg,0,0,'withdraw early','nf-lab nf-halo ma12-te','end');
      el.k=knob(svg,'ma12-kwait','Fraction f withdrawing early, arrow keys move it',function(d,big){ setF(f+d*(big?0.05:0.01)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var s=state(), o=s.o, wp=[], ep=[], i, x, n=160, top, xs, xe, d, sp, k, gT, fh=o.fh, ytw;
      setLine(el.cur,P.sx(f),P.sy(0),P.sx(f),P.sy(YH));
      el.shade.setAttribute('x',R(P.sx(0))); el.shade.setAttribute('y',R(P.sy(YH)));
      el.shade.setAttribute('width',R(P.sx(t)-P.sx(0))); el.shade.setAttribute('height',R(P.sy(0)-P.sy(YH)));
      moveTo(el.tt,P.sx(t),P.sy(0)-6);
      /* the two payoff curves over f in [t, 1] */
      if(mode==='bank'){
        for(i=0;i<=n;i++){ x=t+(Math.min(1,o.fe)-t)*i/n; wp.push([x,pay(x,o).wait]); }
        wp.push([Math.min(1,o.fe),0],[1,0]);
        ep.push([t,o.c1],[Math.min(1,o.fe),o.c1]);
        for(i=1;i<=60;i++){ x=o.fe+(1-o.fe)*i/60; ep.push([x,1/x]); }
      } else if(mode==='suspend'){
        wp=[[t,o.c2],[1,o.c2]];
        for(i=0;i<=n;i++){ x=t+(1-t)*i/n; ep.push([x,pay(x,o).early]); }
      } else {
        wp=[[t,Rr],[1,Rr]]; ep=[[t,1],[1,1]];
      }
      el.wait.setAttribute('d',curve(P,wp));
      el.early.setAttribute('d',curve(P,ep));
      /* under insurance the lines start just right of t: at f = t itself no tax is levied */
      if(mode==='insure'){ at(el.ow,P.sx(t),P.sy(Rr)); at(el.oe,P.sx(t),P.sy(1)); el.ow.setAttribute('r',3.5); el.oe.setAttribute('r',3.5); }
      else { el.ow.setAttribute('r',0); el.oe.setAttribute('r',0); }
      /* the good equilibrium payoffs at f = t, and the run at f = 1 */
      at(el.dw,P.sx(t),P.sy(o.c2)); at(el.de,P.sx(t),P.sy(o.c1));
      if(mode==='bank'){ at(el.pe,P.sx(1),P.sy(1)); el.pe.setAttribute('r',4.5); } else el.pe.setAttribute('r',0);
      if(mode==='bank' && fh<1){ setLine(el.fh,P.sx(fh),P.sy(0),P.sx(fh),P.sy(YH)); moveTo(el.tfh,P.sx(fh)+9,P.sy(0)-6); el.tfh.textContent='f̂'; }
      else { setLine(el.fh,0,0,0,0); el.tfh.textContent=''; }
      /* curve labels at the right end, where the curves are apart: wait above green, withdraw below red */
      ytw=mode==='bank'?0:(mode==='insure'?Rr:o.c2);
      moveTo(el.tw,P.sx(1)-6,P.sy(ytw)-8);
      moveTo(el.te,P.sx(1)-(mode==='bank'?10:6),P.sy(pay(1,o).early)+17);
      /* best response strip along the top: chevrons point where the patients push f; dots are equilibria */
      gT=el.track; while(gT.firstChild) gT.removeChild(gT.firstChild);
      top=P.b.y+11;
      line(gT,P.sx(t),top,P.sx(1),top,'ma12-trk');
      sp=W>=480?26:20;
      function run(a,b2,dir){
        xs=P.sx(a); xe=P.sx(b2); if(xe-xs<14) return;
        k=Math.max(1,Math.floor((xe-xs-8)/sp));
        for(i=0;i<k;i++){ d=xs+(xe-xs)*(i+0.5)/k; S('path',{d:chev(d,top,dir),'class':dir<0?'ma12-chl':'ma12-chr'},gT); }
      }
      if(mode==='bank' && fh<1){ run(t,fh,-1); run(fh,1,1); S('circle',{cx:R(P.sx(fh)),cy:R(top),r:3.5,'class':'ma12-unst'},gT); S('circle',{cx:R(P.sx(1)),cy:R(top),r:4,'class':'ma12-eqd'},gT); }
      else run(t,1,-1);
      S('circle',{cx:R(P.sx(t)),cy:R(top),r:4,'class':'ma12-eqd'},gT);
      text(gT,P.sx(t)+6,top+15,'good: f = t','nf-lab nf-halo');
      if(mode==='bank' && fh<1) text(gT,P.sx(1)-6,top+15,'run: f = 1','nf-lab nf-halo','end');
      place(el.k,P.sx(f),P.sy(s.wait),f,'f = '+f.toFixed(2)+', waiting pays '+s.wait.toFixed(3)+', withdrawing pays '+s.early.toFixed(3));
      if(!out) return;
      var wl=mode==='bank'?'r₂(f)':(mode==='suspend'?'c₂*':(f<=t+1e-9?'c₂*':'R')),
          el2=mode==='bank'?(f<=o.fe?'c₁*':'c₁* with probability 1/(f c₁*), expected'):(mode==='suspend'?(f<=t+1e-9?'c₁*':'c₁* with probability t/f, else c₂*; expected'):(f<=t+1e-9?'c₁*':'(1 − τ)c₁* = 1')),
          tail=mode==='bank'?('tipping point f̂ = '+fh.toFixed(3)+'   the bank is empty at T = 1 once f ≥ 1/c₁* = '+o.fe.toFixed(3)+'   equilibria: f = t and f = 1'):
            (mode==='suspend'?'payments stop after a fraction t = '+t.toFixed(2)+': waiting always pays c₂*   one equilibrium: f = t':
            'tax τ = 1 − 1/c₁* = '+(1-1/o.c1).toFixed(3)+' once f > t, never levied   one equilibrium: f = t');
      out.textContent='f = '+f.toFixed(2)+'   wait: '+wl+' = '+s.wait.toFixed(3)+'   withdraw: '+el2+' = '+s.early.toFixed(3)+'   best response: '+s.best+
        '\nc₁* = '+o.c1.toFixed(3)+', c₂* = '+o.c2.toFixed(3)+'   '+tail;
    }
    dragIn(svg,function(){ return [W,H]; },function(){ return P && P.b; },
      function(p){ if(!P) return false; return near2(p,[P.sx(f),P.sy(state().wait)]); },
      function(p){ setF(P.sx.inv(p[0])); },
      function(){ try{ el.k.focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    api=NF.api({
      get:function(){ var s=state(), o=s.o; return {mode:mode, f:f, t:t, r:Rr, gamma:g, c1:o.c1, c2:o.c2, fhat:o.fh, fe:o.fe, wait:s.wait, early:s.early, best:s.best, eqs:s.eqs}; },
      set:function(st){
        if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
        if('t' in st && rt) rt.set(+st.t);
        if('r' in st && rr) rr.set(+st.r);
        if('gamma' in st && rg) rg.set(+st.gamma);
        if('f' in st) f=clamp(+st.f,t,1);
        draw();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Ex ante: is depositing worth it when a run happens with probability pi? ---------- */
  NF.register('ma12-exante',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var T=0.25, RR=1.5, RHO=0.95, fl=0.2, g=2, PX=0.05, W=520, H=290, P, el={};
    var rf=range(fig,'floor',2,function(v){ fl=v; draw(); });
    var rg=range(fig,'gamma',2,function(v){ g=v; draw(); });
    if(rf) fl=rf.v();
    if(rg) g=rg.v();
    function state(){
      var o=dd(T,RR,RHO,g), m=T+(1-T)*RHO, Wr=m*(u(o.c1,g)/o.c1+(1-1/o.c1)*u(fl,g)), cea=uinv(o.Wa/m,g);
      return {o:o, m:m, Wr:Wr, cea:cea, pb:(o.Ws-o.Wa)/(o.Ws-Wr), g0:100*(uinv(o.Ws/m,g)/cea-1),
        gain:function(p){ return 100*(uinv(((1-p)*o.Ws+p*Wr)/m,g)/cea-1); }};
    }
    function draw(){
      var b, s=state(), st, yt, i, p, pts=[], yb, xb;
      W=measure(svg); H=W>=480?290:270; frame(svg,W,H);
      st=s.g0>2.5?1:0.5; yt=niceUp(1.35*s.g0,st);
      b={x:44,y:30,w:W-44-16,h:H-30-44};
      P=box(svg,b,[0,100*PX],[-yt,yt],{xt:[0,1,2,3,4,5],yt:ticks(-yt,yt,4),zero:true,xf:function(v){ return tl(v)+'%'; },yf:function(v){ return tl(v)+'%'; },
        xl:'probability of a run π',yl:'gain over autarky, % of consumption'});
      for(i=0;i<=300;i++){ p=PX*Math.pow(i/300,1.5); pts.push([100*p,Math.max(-3*yt,s.gain(p))]); }
      el.fill=S('path',{'class':'ma12-gainarea','d':curve(P,[[0,0]].concat(pts.filter(function(q){ return q[1]>=0; })).concat([[100*Math.min(s.pb,PX),0]]))+'Z'},P.gc);
      el.line=S('path',{'class':'ma12-dep','d':curve(P,pts)},P.gc);
      xb=P.sx(Math.min(100*s.pb,100*PX));
      if(s.pb<=PX){
        line(P.gc,xb,P.sy(yt),xb,P.sy(-yt),'ma12-pb');
        S('circle',{cx:R(xb),cy:R(P.sy(0)),r:4,'class':'ma12-eqd'},P.gc);
      }
      yb=P.sy(-yt)-8;
      /* the threshold label sits right of its line, or left of it near the right edge */
      if(s.pb<=PX) text(svg,xb>P.b.x+P.b.w-110?xb-6:xb+6,P.sy(yt)+14,'threshold '+fmt(100*s.pb,2)+'%','nf-lab nf-halo',xb>P.b.x+P.b.w-110?'end':null);
      else text(svg,P.sx(100*PX)-4,yb,'threshold '+fmt(100*s.pb,2)+'% →','nf-lab nf-halo','end');
      text(svg,P.sx(100*PX)-4,P.sy(0)-7,'autarky','nf-lab nf-halo','end');
      /* the line's label, right of the line where it is 60% of the way down to the bottom */
      for(i=0;i<pts.length && pts[i][1]>-0.6*yt;i++);
      if(i<pts.length) text(svg,Math.min(P.sx(pts[i][0])+10,P.b.x+P.b.w-4),P.sy(-0.6*yt)+4,'deposit contract','nf-lab nf-halo ma12-tdep',P.sx(pts[i][0])+10>P.b.x+P.b.w-110?'end':null);
      else text(svg,P.sx(50*PX),P.sy(s.gain(PX/2))-9,'deposit contract','nf-lab nf-halo ma12-tdep','middle');
      if(!out) return;
      out.textContent='floor = '+fl.toFixed(2)+'   expected utility: optimum '+fmt(s.o.Ws,4)+', autarky '+fmt(s.o.Wa,4)+', run '+fmt(s.Wr,4)+'   run probability threshold '+fmt(100*s.pb,2)+'%'+
        '\nwith no run risk the bank is worth '+pct(s.g0,2)+' of consumption; at the threshold the gain is gone. As the floor goes to 0, u(floor) → −∞ and the threshold → 0';
    }
    draw();
    watch(svg,draw);
  });

  /* ---------- 4. Kareken Wallace: the risky share with and without deposit insurance ---------- */
  NF.register('ma12-kw',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var RS=1.02, TH=1.06, eps=0.08, cb=1.16, mu=0.2, ins=0, W=520, H=290, P1, P2, el={}, api;
    var rc=range(fig,'cbar',2,function(v){ cb=v; draw(); if(api) api.changed(); });
    var re=range(fig,'eps',3,function(v){ eps=v; draw(); if(api) api.changed(); });
    if(rc) cb=rc.v();
    if(re) eps=re.v();
    var i0=seg(fig,'data-ins',function(v){ ins=+v; paint(); if(api) api.changed(); });
    if(i0!==null) ins=+i0;
    function cL(m){ return RS+m*(TH-RS-eps); }
    function cH(m){ return RS+m*(TH-RS+eps); }
    function Vn(m){ var a=cL(m)-cb, b=cH(m)-cb; return -0.5*a*a-0.5*b*b; }
    function Vi(m){ var a=RS-cb, b=cH(m)-cb; return -0.5*a*a-0.5*b*b; }
    function raw(){ var a=TH-RS; return (cb-RS)*a/(eps*eps+a*a); }
    function mun(){ return clamp(raw(),0,1); }
    function mui(){ return clamp((cb-RS)/(TH+eps-RS),0,1); }
    function V(m){ return ins?Vi(m):Vn(m); }
    function best(){ return ins?mui():mun(); }
    /* the point snaps onto the regime's optimum when it comes close */
    function setMu(v){ v=clamp(v,0,1); if(Math.abs(v-best())<0.012) v=best(); mu=Math.round(v*1e6)/1e6; update(); }
    function draw(){
      var L, lo=Infinity, hi=-Infinity, i, m, v, sy, ylo, yhi, clo, chi;
      W=measure(svg); L=two(W,W>=600?200:180); H=L.H; frame(svg,W,H);
      for(i=0;i<=100;i++){ m=i/100; v=100*Vn(m); lo=Math.min(lo,v); hi=Math.max(hi,v); v=100*Vi(m); lo=Math.min(lo,v); hi=Math.max(hi,v); }
      sy=ticks(lo,hi,4); sy=sy.length>1?sy[1]-sy[0]:0.5; ylo=niceDown(lo-0.04*(hi-lo),sy); yhi=niceUp(hi+0.12*(hi-lo),sy);
      P1=box(svg,L.b1,[0,1],[ylo,yhi],{xt:[0,0.25,0.5,0.75,1],yt:ticks(ylo,yhi,4),xl:'risky share μ',yl:'E u × 100',ylx:40,title:'household objective'});
      clo=niceDown(Math.min(TH-eps,RS)-0.01,0.05); chi=niceUp(Math.max(cb,TH+eps)+0.01,0.05);
      P2=box(svg,L.b2,[0,1],[clo,chi],{xt:[0,0.25,0.5,0.75,1],yt:ticks(clo,chi,4),xl:'risky share μ',yl:'consumption',ylx:40,title:'consumption by state'});
      el.vn=S('path',{'class':'ma12-nins'},P1.gc);
      el.vi=S('path',{'class':'ma12-ins'},P1.gc);
      el.cur1=line(P1.gc,0,0,0,0,'nf-guide');
      el.on=S('circle',{r:4,'class':'ma12-dnins'},P1.gc);
      el.oi=S('circle',{r:4,'class':'ma12-dins'},P1.gc);
      el.tn=text(svg,0,0,'no insurance','nf-lab nf-halo ma12-tt','middle');
      el.ti=text(svg,0,0,'insured','nf-lab nf-halo ma12-to','middle');
      el.bl=line(P2.gc,0,0,0,0,'ma12-bliss');
      el.ch=S('path',{'class':'ma12-ch'},P2.gc);
      el.cln=S('path',{'class':'ma12-nins'},P2.gc);
      el.cli=S('path',{'class':'ma12-ins'},P2.gc);
      el.cur2=line(P2.gc,0,0,0,0,'nf-guide');
      el.bail=line(P2.gc,0,0,0,0,'ma12-bail');
      el.dh=S('circle',{r:4,'class':'ma12-dch'},P2.gc);
      el.dl=S('circle',{r:4,'class':'ma12-dnins'},P2.gc);
      el.tbl=text(svg,0,0,'bliss c̄','nf-lab nf-halo');
      el.tch=text(svg,0,0,'good state','nf-lab nf-halo','end');
      el.tcl=text(svg,0,0,'bad state','nf-lab nf-halo ma12-tt','end');
      el.tci=text(svg,0,0,'bad state, insured: R','nf-lab nf-halo ma12-to','end');
      el.k=knob(svg,'ma12-knins','Risky share mu on the objective of the chosen regime, arrow keys move it',function(d,big){ setMu(mu+d*(big?0.05:0.01)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var pn=[], pi2=[], i, m, mn=mun(), mi=mui();
      for(i=0;i<=120;i++){ m=i/120; pn.push([m,100*Vn(m)]); pi2.push([m,100*Vi(m)]); }
      el.vn.setAttribute('d',curve(P1,pn)); el.vi.setAttribute('d',curve(P1,pi2));
      el.vn.setAttribute('class','ma12-nins'+(ins?' ma12-dim':'')); el.vi.setAttribute('class','ma12-ins'+(ins?'':' ma12-dim'));
      at(el.on,P1.sx(mn),P1.sy(100*Vn(mn))); at(el.oi,P1.sx(mi),P1.sy(100*Vi(mi)));
      setLine(el.cur1,P1.sx(mu),P1.b.y,P1.sx(mu),P1.b.y+P1.b.h);
      moveTo(el.tn,clamp(P1.sx(mn),P1.b.x+42,P1.b.x+P1.b.w-42),P1.sy(100*Vn(mn))+18);
      moveTo(el.ti,clamp(P1.sx(mi),P1.b.x+28,P1.b.x+P1.b.w-28),P1.sy(100*Vi(mi))-12);
      /* consumption by state */
      setLine(el.bl,P2.sx(0),P2.sy(cb),P2.sx(1),P2.sy(cb));
      el.ch.setAttribute('d',curve(P2,[[0,RS],[1,cH(1)]]));
      el.cln.setAttribute('d',curve(P2,[[0,RS],[1,cL(1)]]));
      el.cli.setAttribute('d',curve(P2,[[0,RS],[1,RS]]));
      el.cln.setAttribute('class','ma12-nins'+(ins?' ma12-dim':'')); el.cli.setAttribute('class','ma12-ins'+(ins?'':' ma12-dim'));
      setLine(el.cur2,P2.sx(mu),P2.b.y,P2.sx(mu),P2.b.y+P2.b.h);
      if(ins && mu>0) setLine(el.bail,P2.sx(mu),P2.sy(cL(mu)),P2.sx(mu),P2.sy(RS)); else setLine(el.bail,0,0,0,0);
      at(el.dh,P2.sx(mu),P2.sy(cH(mu))); at(el.dl,P2.sx(mu),P2.sy(ins?RS:cL(mu)));
      el.dl.setAttribute('class',ins?'ma12-dins':'ma12-dnins');
      moveTo(el.tbl,P2.sx(0)+5,P2.sy(cb)+(cb>TH+eps-0.012&&cb<TH+eps+0.03?14:-6));
      moveTo(el.tch,P2.sx(0.62)-6,P2.sy(cH(0.62))-6);
      moveTo(el.tcl,P2.sx(1)-4,P2.sy(cL(1))+14);
      moveTo(el.tci,P2.sx(1)-4,P2.sy(RS)-7);
      place(el.k,P1.sx(mu),P1.sy(100*V(mu)),mu,'mu = '+mu.toFixed(2)+(ins?', insured':', no insurance'));
      el.k.lastChild.setAttribute('class','nf-knob '+(ins?'ma12-kins':'ma12-knins'));
      if(!out) return;
      var cl=ins?RS:cL(mu);
      out.textContent='μ = '+mu.toFixed(2)+(ins?', insured':', no insurance')+'   c_L = '+cl.toFixed(3)+(ins&&mu>0?' (portfolio '+cL(mu).toFixed(3)+', insurer adds '+(RS-cL(mu)).toFixed(3)+')':'')+', c_H = '+cH(mu).toFixed(3)+'   E u × 100 = '+fmt(100*V(mu),2)+
        '\nbest μ without insurance '+mn.toFixed(3)+(raw()>1?' (formula gives '+raw().toFixed(2)+' > 1: c̄ − R is not small)':'')+', with insurance μ′ = '+mi.toFixed(3)+'   expected bailout at μ′: ½μ′(ε − (θ − R)) = '+(0.5*mi*(eps-TH+RS)).toFixed(3);
    }
    dragIn(svg,function(){ return [W,H]; },function(){ return P1 && P1.b; },
      function(p){ return P1 && near2(p,[P1.sx(mu),P1.sy(100*V(mu))]); },
      function(p){ setMu(P1.sx.inv(p[0])); },
      function(){ try{ el.k.focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    api=NF.api({
      get:function(){ var mb=best(); return {ins:ins, mu:mu, mun:mun(), mui:mui(), gap:Math.abs(mu-mb), cbar:cb, eps:eps, bail:0.5*mui()*(eps-TH+RS), cl:ins?RS:cL(mu), ch:cH(mu)}; },
      set:function(st){
        if('ins' in st) NF.press(fig,'data-ins',String(st.ins));
        if('cbar' in st && rc) rc.set(+st.cbar);
        if('eps' in st && re) re.set(+st.eps);
        if('mu' in st) mu=clamp(+st.mu,0,1);
        draw();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
