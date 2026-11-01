/* Macro L5 figures: the Taylor approximation, the saddle path of the log linear RBC model, prior times likelihood,
   impulse responses to a technology shock and HP filtered moments against the data. Everything is computed here
   from the lecture's model (Ireland 2003), solved by undetermined coefficients in the browser.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma5.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, mulberry32=NF.mulberry32, invPhi=NF.invPhi;

  /* ---------- the model ---------- */
  /* the lecture's calibration (slides 34 to 37); chi is the inverse Frisch elasticity, 0 in the lecture (linear disutility) */
  var BENCH={beta:0.99, eta:1.0042, theta:0.33, delta:0.025, rho:0.95, chi:0};
  function par(o){ var p={}, k; for(k in BENCH) p[k]=BENCH[k]; for(k in o) if(o[k]!==undefined) p[k]=o[k]; return p; }
  /* Solve the log linear model (24) to (29), with (28) generalised to c + chi h = y - h, by undetermined coefficients:
     c = ck k + ca a and k' = kk k + ka a. The k coefficients solve a quadratic; its stable root has |kk| < 1. */
  function solve(P){
    var be=P.beta, et=P.eta, th=P.theta, de=P.delta, rho=P.rho, chi=P.chi;
    var kap=et/be-1+de, lam=et-1+de, om=be*kap/et;
    var p=(th-1)/(th+chi), q=th*(1+chi)/(th+chi), r=(1+chi)/(th+chi);
    var m=(kap*(p-1)+th*lam)/(et*th), n=(1-de)/et+kap*q/(et*th);
    var a2=(1-om*p)*m, a1=(1-om*p)*n-om*(q-1)*m-1, a0=-om*(q-1)*n, roots, d, i, best=0, kk, ck, ck2;
    if(Math.abs(a2)<1e-14) roots=[-a0/a1];
    else { d=Math.sqrt(Math.max(a1*a1-4*a2*a0,0)); roots=[(-a1+d)/(2*a2),(-a1-d)/(2*a2)]; }
    for(i=1;i<roots.length;i++) if(Math.abs(m*roots[i]+n)<Math.abs(m*roots[best]+n)) best=i;
    ck=roots[best]; ck2=roots.length>1?roots[1-best]:NaN; kk=m*ck+n;
    var Ak=(1-om*p)*ck-om*(q-1), s=kap*r/(et*th);
    var ca=(Ak*s-rho*om*r)/(1-rho-Ak*m+rho*om*p), ka=m*ca+s;
    var hk=(th-ck)/(th+chi), ha=(1-ca)/(th+chi), yk=ck+(1+chi)*hk, ya=ca+(1+chi)*ha;
    var iy=th*lam/kap, cy=1-iy;
    return {ck:ck, ca:ca, kk:kk, ka:ka, hk:hk, ha:ha, yk:yk, ya:ya,
      ik:(yk-cy*ck)/iy, ia:(ya-cy*ca)/iy, ck2:ck2, kk2:m*ck2+n, cy:cy, iy:iy, kap:kap, lam:lam, om:om,
      /* E[k', c'] = K [k, c] when a = 0 (Ireland's K) */
      K11:n, K12:m, K21:om*(q-1)*n/(1-om*p), K22:(1+om*(q-1)*m)/(1-om*p)};
  }
  /* responses to a one percent innovation in quarter 1, from k = 0 (slide 41); k is capital at the start of the quarter */
  function irf(s,rho,T){
    var k=0, a=1, t, c, h, y, o={y:[],c:[],i:[],h:[],k:[],a:[],w:[],r:[]};
    for(t=0;t<T;t++){
      c=s.ck*k+s.ca*a; h=s.hk*k+s.ha*a; y=s.yk*k+s.ya*a;
      o.y.push(y); o.c.push(c); o.i.push(s.ik*k+s.ia*a); o.h.push(h); o.k.push(k); o.a.push(a); o.w.push(y-h); o.r.push(y-k);
      k=s.kk*k+s.ka*a; a*=rho;
    }
    return o;
  }
  /* Population moments of HP filtered (lambda 1600) series: the state (k, a) is a VAR(1), so its spectral density is exact,
     and the filter multiplies it by the squared gain; integrating gives the covariances at lags 0 and 1. */
  function hpMoments(s,rho,sig){
    var N=400, dw=Math.PI/N, j, w, cw, sw, g, x, d2r, d2i, m2r, m2i, d1r, d1i, nr, ni, m1r, m1i, f=sig*sig/(2*Math.PI),
        G0=[[0,0],[0,0]], G1=[[0,0],[0,0]], mr, mi, a, b, Fr, Fi;
    for(j=0;j<N;j++){
      w=(j+0.5)*dw; cw=Math.cos(w); sw=Math.sin(w);
      x=4*1600*(1-cw)*(1-cw); g=x/(1+x); g*=g;
      /* z = e^(-iw); m2 = 1/(1 - rho z), m1 = ka z m2/(1 - kk z) */
      d2r=1-rho*cw; d2i=rho*sw; a=d2r*d2r+d2i*d2i; m2r=d2r/a; m2i=-d2i/a;
      nr=s.ka*(cw*m2r+sw*m2i); ni=s.ka*(cw*m2i-sw*m2r);
      d1r=1-s.kk*cw; d1i=s.kk*sw; b=d1r*d1r+d1i*d1i;
      m1r=(nr*d1r+ni*d1i)/b; m1i=(ni*d1r-nr*d1i)/b;
      mr=[m1r,m2r]; mi=[m1i,m2i];
      for(a=0;a<2;a++) for(b=0;b<2;b++){
        Fr=f*(mr[a]*mr[b]+mi[a]*mi[b]); Fi=f*(mi[a]*mr[b]-mr[a]*mi[b]);
        G0[a][b]+=2*Fr*g*dw;
        G1[a][b]+=2*(Fr*cw-Fi*sw)*g*dw;
      }
    }
    var L={y:[s.yk,s.ya], c:[s.ck,s.ca], i:[s.ik,s.ia], h:[s.hk,s.ha], yh:[s.yk-s.hk,s.ya-s.ha], w:[s.yk-s.hk,s.ya-s.ha], a:[0,1]};
    function q(A,u,v){ return u[0]*(A[0][0]*v[0]+A[0][1]*v[1])+u[1]*(A[1][0]*v[0]+A[1][1]*v[1]); }
    var o={sd:{}, cy:{}}, k, sy=Math.sqrt(q(G0,L.y,L.y));
    for(k in L){ o.sd[k]=Math.sqrt(q(G0,L[k],L[k])); o.cy[k]=q(G0,L[k],L.y)/(o.sd[k]*sy); }
    o.ac=q(G1,L.y,L.y)/q(G0,L.y,L.y);
    return o;
  }

  /* ---------- shared drawing ---------- */
  function nice(lo,hi,n){
    var span=hi-lo, step, err, a, b, t=[], v;
    if(!(span>1e-12)){ lo-=1; hi+=1; span=2; }
    step=Math.pow(10,Math.floor(Math.log(span/n)/Math.LN10)); err=span/n/step;
    if(err>=7.5) step*=10; else if(err>=3.5) step*=5; else if(err>=1.5) step*=2;
    a=Math.floor(lo/step+1e-9)*step; b=Math.ceil(hi/step-1e-9)*step;
    for(v=a;v<=b+step*1e-6;v+=step) t.push(Math.round(v/step)*step);
    return {lo:a, hi:b, ticks:t};
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  /* an italic symbol with a hat (combining circumflex) and an optional subscript */
  function hat(g,x,y,ch,cls,anchor){ return text(g,x,y,ch+'̂',cls,anchor); }
  function path(g,cls){ return S('path',{'class':cls},g); }
  function pts(xs,ys,X,Y){ var a=[], i; for(i=0;i<X.length;i++) a.push([xs(X[i]),ys(Y[i])]); return a; }

  /* ---------- 1. Taylor approximation of x squared (slide 19) ---------- */
  NF.register('ma5-taylor',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var H=286, mL=40, mR=16, top=30, bot=256, W=520, xs0=1, x=1.5, mode='lev', el={}, api;
    var rs=range(fig,'xs',2,function(v){ xs0=v; update(); });
    var rx=range(fig,'x',2,function(v){ x=v; update(); });
    if(rs) xs0=rs.v();
    if(rx) x=rx.v();
    mode=seg(fig,'data-mode',function(v){ if(v===mode) return; mode=v; draw(); });
    if(mode!=='dev') mode='lev';
    var sx, sy;
    function draw(){
      var g, rows;
      W=measure(svg); frame(svg,W,H);
      g=S('g',null,svg);
      if(mode==='lev'){
        rows=key(S('g',null,svg),[['line','ma5-f','f(x) = x²'],['line','ma5-tan','first order, at x*'],['line','ma5-err','error']],mL,13,W-mR);
        top=rows>1?44:30;
        sx=lin(0,3,mL,W-mR); sy=lin(-1,9,bot,top);
        NF.xGrid(g,sx,[0,1,2,3],top,bot,bot+16);
        NF.yGrid(g,sy,[0,2,4,6,8],mL,W-mR);
        text(g,W-3,bot+16,'x','nf-title','end');
      } else {
        rows=key(S('g',null,svg),[['line','ma5-pct','percent: (f − f*)/f*'],['line','ma5-log','log: ln(f/f*)'],['line','ma5-tan','first order, 2 × deviation'],['line','ma5-err','error']],mL,13,W-mR);
        top=rows>1?(rows>2?58:44):30;
        sx=lin(-1,1.2,mL,W-mR); sy=lin(-2.2,3.6,bot,top);
        NF.xGrid(g,sx,[-1,-0.5,0,0.5,1],top,bot,bot+16);
        NF.yGrid(g,sy,[-2,-1,0,1,2,3],mL,W-mR);
        text(g,W-3,bot+16,'x̃, x̂','nf-title ma5-it','end');
      }
      var gc=clip(svg,mL,top,W-mL-mR,bot-top);
      el.c1=path(gc,mode==='lev'?'ma5-f':'ma5-pct');
      el.c2=path(gc,'ma5-log');
      el.tan=line(gc,0,0,0,0,'ma5-tan');
      el.err=line(gc,0,0,0,0,'ma5-err');
      el.d0=S('circle',{r:4,'class':'ma5-tdot'},gc);
      el.d1=S('circle',{r:4.5,'class':mode==='lev'?'ma5-fdot':'ma5-pdot'},gc);
      el.d2=S('circle',{r:4,'class':'ma5-odot'},gc);
      el.d3=S('circle',{r:4,'class':'ma5-ldot'},gc);
      el.xl=text(svg,0,0,'x*','nf-lab ma5-it','middle');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var i, v, a=[], b=[], f=x*x, f0=xs0*xs0, tan=f0+2*xs0*(x-xs0), u=(x-xs0)/xs0, lg=Math.log(x/xs0), s;
      if(mode==='lev'){
        for(i=0;i<=240;i++){ v=3*i/240; a.push([sx(v),sy(v*v)]); }
        el.c1.setAttribute('d',poly(a)); el.c2.setAttribute('d','');
        setLine(el.tan,sx(0),sy(f0-2*xs0*xs0),sx(3),sy(f0+2*xs0*(3-xs0)));
        setLine(el.err,sx(x),sy(tan),sx(x),sy(f));
        at(el.d0,sx(xs0),sy(f0)); at(el.d1,sx(x),sy(f)); at(el.d2,sx(x),sy(tan));
        el.d0.setAttribute('r',4); el.d3.setAttribute('r',0);
        moveTo(el.xl,sx(xs0),bot-6);
        s='f(x) = '+fmt(f,2)+'   first order '+fmt(f0,2)+' + '+fmt(2*xs0,2)+' × ('+fmt(x,2)+' − '+fmt(xs0,2)+') = '+fmt(tan,2)+
          '\nerror f(x) − first order = '+fmt(f-tan,4)+' = (x − x*)²';
      } else {
        for(i=0;i<=240;i++){ v=-1+2.2*i/240; a.push([sx(v),sy(2*v+v*v)]); b.push([sx(v),sy(2*v)]); }
        el.c1.setAttribute('d',poly(a)); el.c2.setAttribute('d',poly(b));
        setLine(el.tan,sx(-1),sy(-2),sx(1.2),sy(2.4));
        setLine(el.err,sx(u),sy(2*u),sx(u),sy(2*u+u*u));
        el.d0.setAttribute('r',0); el.d3.setAttribute('r',4);
        at(el.d1,sx(u),sy(2*u+u*u)); at(el.d2,sx(u),sy(2*u)); at(el.d3,sx(lg),sy(2*lg));
        moveTo(el.xl,sx(0),bot-6);
        s='percent: x̃ = '+fmt(u,3)+'   f̃ = '+fmt(2*u+u*u,3)+'   first order 2x̃ = '+fmt(2*u,3)+'   error x̃² = '+fmt(u*u,3)+
          '\nlog: x̂ = '+fmt(lg,3)+'   f̂ = '+fmt(2*lg,3)+' = 2x̂ exactly, no error';
      }
      if(out) out.textContent=s;
    }
    /* the Try it steps read the expansion point, the probe, both approximations and both deviations */
    api=NF.api({
      get:function(){ var f=x*x, f0=xs0*xs0, u=(x-xs0)/xs0, lg=Math.log(x/xs0);
        return {xs:xs0, x:x, mode:mode, f:f, lin:f0+2*xs0*(x-xs0), err:(x-xs0)*(x-xs0), xpct:u, fpct:2*u+u*u, lin2:2*u, err2:u*u, xlog:lg, flog:2*lg}; },
      set:function(st){
        if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
        if('xs' in st && rs) rs.set(+st.xs);
        if('x' in st && rx) rx.set(+st.x);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The saddle path: which c0 keeps capital bounded ---------- */
  NF.register('ma5-saddle',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var M=solve(BENCH), S1=M.ck, S2=M.ck2, K0=-10, C0=-2, k0=K0, c0=C0, TT=40, NQ=80;
    var W=520, H=420, mL=40, mR=30, pt=34, pb=232, tt=290, tb=394, sx, sy, tx, ty, el={}, drag=false, api;
    function put(k,c){
      k=clamp(Math.round(k*2)/2,-15,15); c=clamp(Math.round(c*20)/20,-10,10);
      /* within less than one step of the saddle path counts as on it, so dragging can find it and the arrow keys can leave it */
      if(Math.abs(c-S1*k)<0.04) c=S1*k;
      k0=k; c0=c;
    }
    onClick(fig,'.nfig-reset',function(){ k0=K0; c0=C0; update(); });
    onClick(fig,'.ma5-onpath',function(){ c0=S1*k0; update(); });
    onClick(fig,'.ma5-other',function(){ c0=(isFinite(S2)?S2:0)*k0; update(); });
    function simulate(){
      var k=k0, c=c0, P=[[k,c]], t, kn;
      for(t=1;t<=NQ;t++){ kn=M.K11*k+M.K12*c; c=M.K21*k+M.K22*c; k=kn; P.push([k,c]); if(Math.abs(k)>1e4) break; }
      return P;
    }
    function draw(){
      var g, g2, gc, rows, v;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','ma5-sp','saddle path, stable root'],['line','ma5-un','other root'],['line','ma5-gap','gap from the path']],mL,13,W-mR);
      pt=rows>1?48:34;
      sx=lin(-15,15,mL,W-mR); sy=lin(-10,10,pb,pt);
      g=S('g',null,svg);
      for(v=-15;v<=15;v+=5){ line(g,C(sx(v)),pt,C(sx(v)),pb,v===0?'nf-ax':'nf-grid'); text(g,sx(v),pb+15,tl(v),null,'middle'); }
      NF.yGrid(g,sy,[-10,-5,0,5,10],mL,W-mR);
      text(g,mL-7,pt-8,'ĉ₀','nf-title ma5-it','end');
      text(g,W-3,pb+15,'k̂₀','nf-title ma5-it','end');
      gc=clip(svg,mL,pt,W-mL-mR,pb-pt);
      el.un=line(gc,sx(-15),sy(-15*(isFinite(S2)?S2:0)),sx(15),sy(15*(isFinite(S2)?S2:0)),'ma5-un');
      el.sp=line(gc,sx(-15),sy(-15*S1),sx(15),sy(15*S1),'ma5-sp');
      el.path=path(gc,'ma5-path');
      el.dots=S('g',null,gc);
      el.gap=line(gc,0,0,0,0,'ma5-gap');
      el.h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point',
        'aria-label':'Start of the economy, capital k0 across and consumption c0 up; arrow keys move it'},svg);
      S('circle',{r:18,'class':'nf-hit'},el.h); S('circle',{r:11,'class':'nf-ring'},el.h); S('circle',{r:5.5,'class':'nf-knob ma5-kh'},el.h);
      el.h.addEventListener('keydown',function(e){
        var k=e.key, big=e.shiftKey;
        if(k==='ArrowRight') put(k0+(big?2.5:0.5),c0); else if(k==='ArrowLeft') put(k0-(big?2.5:0.5),c0);
        else if(k==='ArrowUp') put(k0,c0+(big?0.5:0.05)); else if(k==='ArrowDown') put(k0,c0-(big?0.5:0.05));
        else return;
        e.preventDefault(); update();
      });
      /* time paths underneath */
      tt=pb+44; tb=H-24;
      tx=lin(0,TT,mL,W-mR); ty=lin(-15,15,tb,tt);
      g2=S('g',null,svg);
      for(v=0;v<=TT;v+=10){ line(g2,C(tx(v)),tt,C(tx(v)),tb,'nf-grid'); text(g2,tx(v),tb+15,tl(v),null,'middle'); }
      NF.yGrid(g2,ty,[-15,0,15],mL,W-mR);
      text(g2,W-3,tb+28,'quarter','nf-title','end');
      key(S('g',null,svg),[['line','ma5-tk','k̂ₜ'],['line','ma5-tc','ĉₜ']],mL,tt-10,W-mR);
      gc=clip(svg,mL,tt,W-mL-mR,tb-tt);
      el.tk=path(gc,'ma5-tk'); el.tc=path(gc,'ma5-tc');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var P=simulate(), A=[], i, d, gap=c0-S1*k0, on=Math.abs(gap)<1e-9, K=[], Cc=[], s, half;
      for(i=0;i<P.length;i++) A.push([sx(clamp(P[i][0],-200,200)),sy(clamp(P[i][1],-200,200))]);
      el.path.setAttribute('d',poly(A));
      while(el.dots.firstChild) el.dots.removeChild(el.dots.firstChild);
      for(i=1;i<Math.min(P.length,41);i++){ if(Math.abs(P[i][0])>16 || Math.abs(P[i][1])>11) break; d=S('circle',{r:2.2,'class':'ma5-pdot2'},el.dots); at(d,A[i][0],A[i][1]); }
      setLine(el.gap,sx(k0),sy(S1*k0),sx(k0),sy(c0));
      el.h.setAttribute('transform','translate('+R(sx(k0))+','+R(sy(c0))+')');
      el.h.setAttribute('aria-valuetext','k0 = '+fmt(k0,1)+', c0 = '+fmt(c0,2));
      for(i=0;i<=TT && i<P.length;i++){ K.push([tx(i),ty(clamp(P[i][0],-40,40))]); Cc.push([tx(i),ty(clamp(P[i][1],-40,40))]); }
      el.tk.setAttribute('d',poly(K)); el.tc.setAttribute('d',poly(Cc));
      if(!out) return;
      s='k̂₀ = '+fmt(k0,1)+'   ĉ₀ = '+fmt(c0,2)+'   saddle path needs ĉ₀ = '+fmt(S1,3)+' × k̂₀ = '+fmt(S1*k0,2);
      out.textContent=s+'\n';
      if(on){
        half=Math.log(0.5)/Math.log(M.K22);
        out.appendChild(document.createTextNode('on the saddle path: k̂ and ĉ shrink by the factor '+fmt(M.K22,3)+' a quarter (half life '+fmt(half,1)+' quarters)'));
      } else if(Math.abs(c0-(isFinite(S2)?S2:0)*k0)<1e-9 && k0!==0){
        warn(out,'other root ĉ = '+fmt(S2,2)+' × k̂: the gap grows by the factor '+fmt(M.K11,3)+' a quarter, so k̂ explodes');
      } else {
        warn(out,'gap '+fmt(gap,2)+' grows by the factor '+fmt(M.K11,3)+' a quarter: '+(gap>0?'consumption too high, capital runs down':'consumption too low, capital piles up without end'));
      }
    }
    function fromPointer(e){ var p=local(svg,e,W,H); put(sx.inv(p[0]),sy.inv(p[1])); update(); }
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H), near=Math.hypot(p[0]-sx(k0),p[1]-sy(c0))<30, inside=p[1]>=pt && p[1]<=pb && p[0]>=mL && p[0]<=W-mR;
      /* a mouse may click anywhere in the plane to place the start; a finger must grab the point, so the page still scrolls */
      if(!(near || (inside && e.pointerType==='mouse'))) return;
      drag=true; e.preventDefault(); capture(svg,e);
      try{ el.h.focus({preventScroll:true,focusVisible:false}); }catch(err){}
      svg.classList.add('is-drag'); fromPointer(e);
    });
    svg.addEventListener('pointermove',function(e){ if(drag) fromPointer(e); });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var p=local(svg,e.touches[0],W,H);
      if(Math.hypot(p[0]-sx(k0),p[1]-sy(c0))<30) e.preventDefault();
    },{passive:false});
    /* the Try it steps read the start, the gap from the saddle path and where capital goes, and can place the start */
    api=NF.api({
      get:function(){
        var P=simulate(), gap=c0-S1*k0, on=Math.abs(gap)<1e-9, other=Math.abs(c0-(isFinite(S2)?S2:0)*k0)<1e-9 && k0!==0;
        return {k0:k0, c0:c0, s1:S1, s2:S2, gap:gap, onpath:on, other:other, k11:M.K11, k22:M.K22, k12:M.K12,
          div:on?'none':(gap>0?'down':'up'), k1:P[1][0], c1:P[1][1], k20:P[20]?P[20][0]:NaN, c20:P[20]?P[20][1]:NaN};
      },
      set:function(st){
        var k='k0' in st?+st.k0:k0, c='c0' in st?+st.c0:c0;
        if(st.path==='saddle') c=S1*k; else if(st.path==='other') c=(isFinite(S2)?S2:0)*k;
        put(k,c);
        if(st.path==='saddle') c0=S1*k0;
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Bayesian estimation: prior times likelihood (slides 38 to 40) ---------- */
  NF.register('ma5-bayes',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* data simulated from a stated model: T quarterly readings of the labour share, N(0.62, 0.05 squared) */
    var MU0=0.67, TRUE=0.62, SD=0.05, NMAX=200, Z=[], i, rnd=mulberry32(20261026), tau=0.03, T=10, el={}, api;
    for(i=0;i<NMAX;i++) Z.push(invPhi(Math.min(1-1e-12,Math.max(1e-12,rnd()))));
    var rt=range(fig,'tau',3,function(v){ tau=v; update(); });
    var rn=range(fig,'t',0,function(v){ T=Math.round(v); update(); });
    if(rt) tau=rt.v();
    if(rn) T=Math.round(rn.v());
    var W=520, H=262, mL=16, mR=16, top=30, bot=226, sx, sy;
    function stats(){
      var sum=0, j, xbar, v=SD*SD/T, pp=1/(tau*tau), lp=1/v, w;
      for(j=0;j<T;j++) sum+=Z[j];
      xbar=TRUE+SD*sum/T; w=lp/(lp+pp);
      return {xbar:xbar, lsd:Math.sqrt(v), w:w, ahat:w*xbar+(1-w)*MU0, psd:Math.sqrt(1/(lp+pp))};
    }
    function dens(x,m,s){ var z=(x-m)/s; return Math.exp(-0.5*z*z)/(s*2.5066282746310002); }
    function draw(){
      var g, rows;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','ma5-prior','prior f(α)'],['line','ma5-lik','likelihood f(y | α)'],['line','ma5-post','posterior f(α | y)']],mL,13,W-mR);
      top=rows>1?(rows>2?58:44):30;
      sx=lin(0.5,0.8,mL,W-mR);
      g=S('g',null,svg);
      NF.xGrid(g,sx,[0.5,0.55,0.6,0.65,0.7,0.75,0.8],top,bot,bot+16);
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,W-mR,bot+32,'labour share α','nf-title','end');
      var gc=clip(svg,mL,top-2,W-mL-mR,bot-top+2);
      el.fp=path(gc,'ma5-priorf'); el.fl=path(gc,'ma5-likf'); el.fq=path(gc,'ma5-postf');
      el.p=path(gc,'ma5-prior'); el.l=path(gc,'ma5-lik'); el.q=path(gc,'ma5-post');
      el.mp=line(gc,0,0,0,0,'ma5-mprior'); el.ml=line(gc,0,0,0,0,'ma5-mlik'); el.mq=line(gc,0,0,0,0,'ma5-mpost');
      el.lab=text(svg,0,0,'α̂','nf-lab ma5-it ma5-ahat','middle');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var st=stats(), peak=Math.max(dens(0,0,tau),dens(0,0,st.lsd),dens(0,0,st.psd)), j, x, P=[], L=[], Q=[], base, s;
      sy=lin(0,peak*1.08,bot,top);
      for(j=0;j<=300;j++){ x=0.5+0.3*j/300; P.push([sx(x),sy(dens(x,MU0,tau))]); L.push([sx(x),sy(dens(x,st.xbar,st.lsd))]); Q.push([sx(x),sy(dens(x,st.ahat,st.psd))]); }
      base='L'+R(sx(0.8))+','+R(sy(0))+'L'+R(sx(0.5))+','+R(sy(0))+'Z';
      el.fp.setAttribute('d',poly(P)+base); el.fl.setAttribute('d',poly(L)+base); el.fq.setAttribute('d',poly(Q)+base);
      el.p.setAttribute('d',poly(P)); el.l.setAttribute('d',poly(L)); el.q.setAttribute('d',poly(Q));
      setLine(el.mp,sx(MU0),sy(0),sx(MU0),sy(dens(0,0,tau)));
      setLine(el.ml,sx(st.xbar),sy(0),sx(st.xbar),sy(dens(0,0,st.lsd)));
      setLine(el.mq,sx(st.ahat),sy(0),sx(st.ahat),sy(dens(0,0,st.psd)));
      moveTo(el.lab,clamp(sx(st.ahat),mL+8,W-mR-8),bot+30);
      if(!out) return;
      s='prior '+fmt(MU0,3)+' ± '+fmt(tau,3)+'   data x̄ = '+fmt(st.xbar,3)+' ± '+fmt(st.lsd,4)+' (T = '+T+')'+
        '\nposterior mode α̂ = '+fmt(st.ahat,3)+' ± '+fmt(st.psd,4)+'   weight on the data w = '+fmt(st.w,2);
      out.textContent=s;
      if(st.w<0.15) warn(out,'\nthe prior is so tight that the data barely move α̂: calibration in disguise');
    }
    /* the Try it steps read the prior width, the sample size, the data mean, the weight and the posterior */
    api=NF.api({
      get:function(){ var st=stats(); return {tau:tau, t:T, mu0:MU0, xbar:st.xbar, lsd:st.lsd, w:st.w, wp:1-st.w, ahat:st.ahat, psd:st.psd}; },
      set:function(st){ if('tau' in st && rt) rt.set(+st.tau); if('t' in st && rn) rn.set(+st.t); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Impulse responses to a technology shock (slides 41 and 44) ---------- */
  var PANELS=[['y','output','y'],['c','consumption','c'],['i','investment','i'],['h','hours','h'],
              ['k','capital, start of quarter','k'],['a','technology','a'],['w','real wage','w'],['r','return on capital','r']];
  NF.register('ma5-irf',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var T=40, rho=BENCH.rho, chi=BENCH.chi, delta=BENCH.delta, B=irf(solve(BENCH),BENCH.rho,T), sol, I, el={}, api, W=520, H=440;
    var rr=range(fig,'rho',2,function(v){ rho=v; update(); });
    var rc=range(fig,'chi',1,function(v){ chi=v; update(); });
    var rd=range(fig,'delta',3,function(v){ delta=v; update(); });
    if(rr) rho=rr.v();
    if(rc) chi=rc.v();
    if(rd) delta=rd.v();
    onClick(fig,'.ma5-bench',function(){ if(rr) rr.set(BENCH.rho); if(rc) rc.set(BENCH.chi); if(rd) rd.set(BENCH.delta); });
    function compute(){ sol=solve(par({rho:rho, chi:chi, delta:delta})); I=irf(sol,rho,T); }
    function isBench(){ return Math.abs(rho-BENCH.rho)<1e-9 && Math.abs(chi-BENCH.chi)<1e-9 && Math.abs(delta-BENCH.delta)<1e-9; }
    var box=[];
    function draw(){
      var cols=2, gx=W<440?14:22, pw, ph, i, b, x0, y0, g;
      W=measure(svg); gx=W<440?14:22;
      /* 12px on the right so the last tick label of the right column stays inside */
      pw=(W-8-12-gx*(cols-1)-2*28)/cols; ph=W<440?58:64;
      H=4*(ph+40)+10; frame(svg,W,H);
      box=[]; el.cur=[]; el.ben=[]; el.g=[];
      for(i=0;i<PANELS.length;i++){
        x0=4+28+(i%cols)*(pw+gx+28); y0=22+Math.floor(i/cols)*(ph+40);
        b={x0:x0, x1:x0+pw, y0:y0, y1:y0+ph};
        box.push(b);
        g=S('g',null,svg); el.g.push(g);
        var t=text(svg,x0,y0-8,'','nf-lab');
        var nm=S('tspan',{'class':'ma5-it'+(PANELS[i][0]==='a'?' ma5-ca':'')},t); nm.textContent=PANELS[i][2]+'̂';
        var rest=S('tspan',null,t); rest.textContent='  '+PANELS[i][1];
        el.ben.push(path(svg,'ma5-bline'));
        el.cur.push(path(svg,PANELS[i][0]==='a'?'ma5-cura':'ma5-cur'));
      }
      update();
    }
    function axes(i,lo,hi){
      var b=box[i], g=el.g[i], l0=Math.min(lo,0), h0=Math.max(hi,0), sp=Math.max(h0-l0,1e-6), n=nice(l0,h0,2),
          d0=l0-0.06*sp, d1=h0+0.06*sp, ys=lin(d0,d1,b.y1,b.y0), xs=lin(1,T,b.x0,b.x1), j, v;
      while(g.firstChild) g.removeChild(g.firstChild);
      for(j=10;j<=T;j+=10){ line(g,C(xs(j)),b.y0,C(xs(j)),b.y1,'nf-grid'); }
      for(j=0;j<n.ticks.length;j++){ v=n.ticks[j]; if(v<d0-1e-9 || v>d1+1e-9) continue; line(g,b.x0,C(ys(v)),b.x1,C(ys(v)),v===0?'nf-ax':'nf-grid'); text(g,b.x0-5,ys(v)+4,tl(v),null,'end'); }
      if(i>=PANELS.length-2) for(j=10;j<=T;j+=10) text(g,xs(j),b.y1+14,String(j),null,'middle');
      return {xs:xs, ys:ys};
    }
    function update(){ compute(); paint(); if(api) api.changed(); }
    function paint(){
      var i, k, X=[], lo, hi, ax, bench=isBench(), cp=0, s, half=-1, yp=0;
      for(k=1;k<=T;k++) X.push(k);
      for(i=0;i<PANELS.length;i++){
        k=PANELS[i][0];
        lo=Math.min.apply(null,I[k]); hi=Math.max.apply(null,I[k]);
        if(!bench){ lo=Math.min(lo,Math.min.apply(null,B[k])); hi=Math.max(hi,Math.max.apply(null,B[k])); }
        ax=axes(i,lo,hi);
        el.cur[i].setAttribute('d',poly(pts(ax.xs,ax.ys,X,I[k])));
        el.ben[i].setAttribute('d',bench?'':poly(pts(ax.xs,ax.ys,X,B[k])));
      }
      for(k=1;k<T;k++){ if(I.c[k]>I.c[cp]) cp=k; if(I.y[k]>I.y[yp]) yp=k; }
      for(k=0;k<T;k++) if(I.y[k]<0.5*I.y[0]){ half=k+1; break; }
      if(!out) return;
      s='quarter 1: ŷ '+fmt(I.y[0],2)+'   ĉ '+fmt(I.c[0],2)+'   î '+fmt(I.i[0],2)+'   ĥ '+fmt(I.h[0],2)+'   ŵ '+fmt(I.w[0],2)+
        '\nĉ peaks at '+fmt(I.c[cp],2)+' in quarter '+(cp+1)+(half>0?';   ŷ is below half its first response from quarter '+half:'');
      if(yp>0) s+='\nŷ rises to '+fmt(I.y[yp],2)+' in quarter '+(yp+1)+': a hump, '+fmt(100*(I.y[yp]/I.y[0]-1),1)+' percent above quarter 1';
      out.textContent=s;
    }
    /* the Try it steps read the sliders, the first responses, the policy coefficients, the peak of c and any hump in y */
    api=NF.api({
      get:function(){
        var cp=0, yp=0, k, half=-1;
        for(k=1;k<T;k++){ if(I.c[k]>I.c[cp]) cp=k; if(I.y[k]>I.y[yp]) yp=k; }
        for(k=0;k<T;k++) if(I.y[k]<0.5*I.y[0]){ half=k+1; break; }
        return {rho:rho, chi:chi, delta:delta, bench:isBench(), y1:I.y[0], c1:I.c[0], i1:I.i[0], h1:I.h[0], w1:I.w[0], r1:I.r[0],
          k2:I.k[1], y2:I.y[1], c2:I.c[1], h40:I.h[T-1], cpk:I.c[cp], cpt:cp+1, ypk:I.y[yp], ypt:yp+1, hump:yp>0, yrise:100*(I.y[yp]/I.y[0]-1), yhalf:half,
          yk:sol.yk, ya:sol.ya, ck:sol.ck, ca:sol.ca, kk:sol.kk, ka:sol.ka, cy:sol.cy, iy:sol.iy};
      },
      set:function(st){
        if('rho' in st && rr) rr.set(+st.rho);
        if('chi' in st && rc) rc.set(+st.chi);
        if('delta' in st && rd) rd.set(+st.delta);
      }
    });
    compute();
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Simulated moments against the data (slides 3 and 45) ---------- */
  /* King and Rebelo (1999), Table 1, as on slide 3: relative standard deviation and correlation with output */
  var ROWS=[['C','c',0.74,0.88],['I','i',2.93,0.80],['N','h',0.99,0.88],['Y/N','yh',0.56,0.55],['w','w',0.38,0.12],['A','a',0.54,0.78]];
  NF.register('ma5-moments',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var rho=BENCH.rho, chi=BENCH.chi, sig=0.07, mo, el={}, api, W=520, H=230, RH=22;
    var rr=range(fig,'rho',2,function(v){ rho=v; update(); });
    var rc=range(fig,'chi',1,function(v){ chi=v; update(); });
    var rs=range(fig,'sig',4,function(v){ sig=v; update(); });
    if(rr) rho=rr.v();
    if(rc) chi=rc.v();
    if(rs) sig=rs.v();
    function compute(){ mo=hpMoments(solve(par({rho:rho, chi:chi})),rho,sig); }
    var P=[];
    function draw(){
      var wide, rows, i, j, p, g, lab=34, top, pw;
      W=measure(svg); wide=W>=500;
      rows=1; top=0;
      P=[{name:'sd relative to output', lo:0, hi:4, t:[0,1,2,3,4], k:'sd'},{name:'correlation with output', lo:0, hi:1, t:[0,0.5,1], k:'cy'}];
      pw=wide?(W-lab-8-2*34-lab)/2:W-lab-8-34;
      for(p=0;p<2;p++){
        P[p].x0=wide?lab+p*(pw+34+lab):lab; P[p].x1=P[p].x0+pw;
        P[p].y0=wide?44:44+p*(6*RH+64); P[p].y1=P[p].y0+6*RH;
      }
      H=(wide?P[0].y1:P[1].y1)+30; frame(svg,W,H);
      key(S('g',null,svg),[['rect','ma5-bar','model'],['line','ma5-data','data (slide 3)']],lab,13,W-8);
      el.bar=[[],[]]; el.dat=[[],[]]; el.val=[[],[]];
      for(p=0;p<2;p++){
        g=S('g',null,svg);
        P[p].xs=lin(P[p].lo,P[p].hi,P[p].x0,P[p].x1);
        text(g,P[p].x0,P[p].y0-10,P[p].name,'nf-title');
        for(j=0;j<P[p].t.length;j++){ line(g,C(P[p].xs(P[p].t[j])),P[p].y0,C(P[p].xs(P[p].t[j])),P[p].y1,P[p].t[j]===0?'nf-ax':'nf-grid'); text(g,P[p].xs(P[p].t[j]),P[p].y1+14,tl(P[p].t[j]),null,'middle'); }
        for(i=0;i<ROWS.length;i++){
          var yc=P[p].y0+(i+0.5)*RH;
          text(g,P[p].x0-6,yc+4,ROWS[i][0],'nf-lab','end');
          el.bar[p].push(S('rect',{x:R(P[p].xs(0)),y:R(yc-6),height:12,width:0,'class':ROWS[i][1]==='w'?'ma5-bar ma5-barw':'ma5-bar'},svg));
          el.dat[p].push(line(svg,0,yc-9,0,yc+9,'ma5-data'));
          el.val[p].push(text(svg,0,yc+4,'','nf-lab ma5-small'));
        }
      }
      update();
    }
    function update(){ compute(); paint(); if(api) api.changed(); }
    function paint(){
      var p, i, v, d, x, s, sy=mo.sd.y;
      for(p=0;p<2;p++) for(i=0;i<ROWS.length;i++){
        v=p===0?mo.sd[ROWS[i][1]]/sy:mo.cy[ROWS[i][1]]; d=ROWS[i][2+p];
        x=P[p].xs(clamp(v,P[p].lo,P[p].hi));
        el.bar[p][i].setAttribute('width',R(Math.max(0,x-P[p].xs(0))));
        x=P[p].xs(d); setLine(el.dat[p][i],x,+el.dat[p][i].getAttribute('y1'),x,+el.dat[p][i].getAttribute('y2'));
        el.val[p][i].textContent=fmt(v,2);
        el.val[p][i].setAttribute('x',R(P[p].x1+6));
      }
      if(!out) return;
      s='sd(Y): model '+fmt(100*sy,2)+' percent, data 1.81   autocorrelation of Y: model '+fmt(mo.ac,2)+', data 0.84';
      out.textContent=s;
      if(100*sy>4) warn(out,'\nσ = '+fmt(sig,4)+' makes output '+fmt(100*sy/1.81,1)+' times as volatile as in the data');
    }
    /* the Try it steps read the sliders, sd and autocorrelation of output, every relative sd (r..) and correlation (c..) */
    api=NF.api({
      get:function(){
        var o={rho:rho, chi:chi, sig:sig, sdy:100*mo.sd.y, acy:mo.ac}, i, k;
        for(i=0;i<ROWS.length;i++){ k=ROWS[i][1]; o['r'+k]=mo.sd[k]/mo.sd.y; o['c'+k]=mo.cy[k]; }
        return o;
      },
      set:function(st){
        if('rho' in st && rr) rr.set(+st.rho);
        if('chi' in st && rc) rc.set(+st.chi);
        if('sig' in st && rs) rs.set(+st.sig);
      }
    });
    compute();
    draw();
    watch(svg,draw);
    return api;
  });

  /* exposed for checks in a console: the solver and the moments */
  NF.ma5={solve:solve, irf:irf, hpMoments:hpMoments, BENCH:BENCH};
})();
