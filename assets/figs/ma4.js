/* Macro L4 figures: the AK knife edge, convergence against constant returns, the returns to physical and human
   capital, Romer against Jones, and automation in research. Every curve is computed from the model in the browser:
   closed forms where the model has them, and a saddle path integrated backwards from the steady state (RK4) where not.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma4.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, seg=NF.seg, range=NF.range,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  /* the largest of 1, 2, 5 times a power of ten that does not exceed x */
  function nice(x){ var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p; return (m>=5?5:m>=2?2:1)*p; }
  function ticks(lo,hi,n){
    var st=nice((hi-lo)/n), t=[], v;
    for(v=Math.ceil(lo/st-1e-9);v*st<=hi+1e-9;v++) t.push(+(v*st).toFixed(10));
    return t;
  }
  function scale(d0,d1,r0,r1,lg){
    var a=lg?Math.log(d0):d0, b=lg?Math.log(d1):d1, f=lin(a,b,r0,r1);
    function s(v){ return f(lg?Math.log(v):v); }
    s.inv=function(p){ var q=f.inv(p); return lg?Math.exp(q):q; };
    return s;
  }
  /* a plot box: grid, tick labels and axis names; returns the scales and a clipped group for the data.
     o: x0 x1 y0 y1 in px (y0 on top), xd yd domains, xt yt ticks, xlog ylog, xf yf label formats, xn yn names */
  function box(svg,o){
    var g=S('g',null,svg), xs=scale(o.xd[0],o.xd[1],o.x0,o.x1,o.xlog), ys=scale(o.yd[0],o.yd[1],o.y1,o.y0,o.ylog), i, v, x, y;
    for(i=0;i<o.xt.length;i++){
      v=o.xt[i]; x=C(xs(v));
      line(g,x,o.y0,x,o.y1,'nf-grid');
      if(!o.noxl) text(g,xs(v),o.y1+15,(o.xf||tl)(v),null,'middle');
    }
    for(i=0;i<o.yt.length;i++){
      v=o.yt[i]; y=C(ys(v));
      line(g,o.x0,y,o.x1,y,(v===0 && !o.ylog)?'nf-ax':'nf-grid');
      text(g,o.x0-6,ys(v)+4,(o.yf||tl)(v),null,'end');
    }
    line(g,o.x0,C(o.y1),o.x1,C(o.y1),'nf-ax');
    if(o.yn) text(g,o.x0,o.y0-8,o.yn,'nf-title');
    if(o.xn && !o.noxl) text(g,o.x1+(o.xnd||22),o.y1+15,o.xn,'nf-title','end');
    return {xs:xs, ys:ys, g:g, gc:clip(svg,o.x0,o.y0-1,o.x1-o.x0,o.y1-o.y0+2), o:o};
  }
  /* a polyline from points [x, y] in model units, cut where y is not finite */
  function pathOf(P,xs,ys){
    var d='', pen=false, i, x, y;
    for(i=0;i<P.length;i++){
      x=P[i][0]; y=P[i][1];
      if(!isFinite(y)){ pen=false; continue; }
      d+=(pen?'L':'M')+R(xs(x))+','+R(ys(y)); pen=true;
    }
    return d;
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function pc(v,d){ return fmt(v*100,d)+'%'; }
  /* a figure that is dragged along its x axis, as the CDF figure of notes.js: pointer, touch and keys */
  function xdrag(svg,toX,keyStep){
    var on=false;
    function go(e){ var r=svg.getBoundingClientRect(), W=svg.viewBox.baseVal.width||r.width; toX((e.clientX-r.left)*W/(r.width||W),false); }
    svg.addEventListener('pointerdown',function(e){ on=true; capture(svg,e); go(e); });
    svg.addEventListener('pointermove',function(e){ if(on) go(e); });
    function stop(){ on=false; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('keydown',function(e){
      var k=e.key, d=0;
      if(k==='ArrowRight'||k==='ArrowUp') d=1; else if(k==='ArrowLeft'||k==='ArrowDown') d=-1;
      else if(k==='PageUp') d=5; else if(k==='PageDown') d=-5;
      else return;
      e.preventDefault(); keyStep(d);
    });
  }

  /* ---------- 1. The AK knife edge: only c0/k0 = rho grows in balance ---------- */
  NF.register('ma4-ak',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var A=0.12, rho=0.04, x0=0.05, DL=0.05, TM=80, W=520, H=344, P1, P2, el={}, api;
    var rx=range(fig,'x0',3,function(v){ x0=v; update(); });
    var ra=range(fig,'a',2,function(v){ A=v; update(); });
    var rr=range(fig,'rho',3,function(v){ rho=v; update(); });
    if(rx) x0=rx.v();
    if(ra) A=ra.v();
    if(rr) rho=rr.v();
    onClick(fig,'.ma4-bgp',function(){ if(rx) rx.set(rho); else { x0=rho; update(); } });
    /* x = c/k obeys dx/dt = x(x - rho), so x(t) = rho/(1 - b e^(rho t)) with b = 1 - rho/x0, and consumption grows at
       A - delta - rho whatever x0 is. Capital: ln(k_t/k_0) = (A - delta - rho)t + ln((1 - b e^(rho t))/(1 - b)). */
    function sol(){
      var s={g:A-DL-rho, b:1-rho/x0, bgp:Math.abs(x0-rho)<5e-7, ts:-1, tc:0};
      if(s.bgp){ s.b=0; s.cas='bgp'; }
      else if(s.b>0){ s.cas='crash'; s.ts=Math.log(1/s.b)/rho; }
      else { s.cas='hoard'; s.tc=1-x0/rho; }
      return s;
    }
    function lnk(t,s){ var q=1-s.b*Math.exp(rho*t); return q>0?s.g*t+Math.log(q/(1-s.b)):-Infinity; }
    function xk(t,s){ var q=1-s.b*Math.exp(rho*t); return q>0?rho/q:Infinity; }
    function draw(){
      var mL=40, mR=26, x1;
      W=measure(svg); H=W<420?352:344; frame(svg,W,H); x1=W-mR;
      el.key=S('g',null,svg);
      var rows=key(el.key,[['line','ma4-k','capital kₜ/k₀'],['line','ma4-c','consumption cₜ/c₀'],['line','ma4-x','cₜ/kₜ']],mL,12,x1);
      var top=rows>1?58:42;
      P1=box(svg,{x0:mL,x1:x1,y0:top,y1:top+136,xd:[0,TM],yd:[0.05,50],ylog:true,xt:ticks(0,TM,4),yt:[0.1,1,10],noxl:true,yn:'index, 1 at t = 0 (log scale)'});
      P2=box(svg,{x0:mL,x1:x1,y0:top+172,y1:H-24,xd:[0,TM],yd:[0,0.12],xt:ticks(0,TM,4),yt:[0,0.04,0.08,0.12],xn:'t',yn:'cₜ/kₜ',xnd:20});
      el.k=S('path',{'class':'ma4-k'},P1.gc);
      el.c=S('path',{'class':'ma4-c'},P1.gc);
      el.end=S('circle',{r:0,'class':'ma4-crash'},svg);
      el.endl=text(svg,0,0,'','ma4-warn nf-halo','end');
      el.rho=line(P2.gc,0,0,0,0,'ma4-guide');
      el.rhol=text(svg,0,0,'ρ','nf-lab nf-halo','start');
      el.x=S('path',{'class':'ma4-x'},P2.gc);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var s=sol(), Pk=[], Pc=[], Px=[], i, t, tend=s.ts>0?Math.min(TM,s.ts):TM, n=320, y, ln, msg;
      for(i=0;i<=n;i++){
        t=tend*i/n; if(s.ts>0 && i===n && s.ts<=TM) t=s.ts*(1-1e-9);
        ln=lnk(t,s); Pk.push([t,Math.exp(Math.max(-30,Math.min(30,ln)))]);
        Px.push([t,Math.min(5,xk(t,s))]);
      }
      if(s.ts>0 && s.ts<=TM){ Pk.push([s.ts,1e-9]); Px.push([s.ts,5]); }
      for(i=0;i<=40;i++){ t=TM*i/40; Pc.push([t,Math.exp(Math.max(-30,Math.min(30,s.g*t)))]); }
      el.k.setAttribute('d',pathOf(Pk,P1.xs,P1.ys));
      el.c.setAttribute('d',pathOf(Pc,P1.xs,P1.ys));
      el.x.setAttribute('d',pathOf(Px,P2.xs,P2.ys));
      y=P2.ys(rho); setLine(el.rho,P2.o.x0,y,P2.o.x1,y);
      moveTo(el.rhol,P2.o.x1+4,y+4);
      if(s.ts>0 && s.ts<=TM){
        el.end.setAttribute('r',4); at(el.end,P1.xs(s.ts),P1.o.y1);
        el.endl.textContent='k = 0 at t = '+s.ts.toFixed(1);
        /* left of the dot and just above the axis, clear of the capital line that falls into it */
        moveTo(el.endl,Math.max(P1.xs(s.ts)-10,P1.o.x0+120),P1.o.y1-6);
      } else { el.end.setAttribute('r',0); el.endl.textContent=''; }
      if(!out) return;
      out.textContent='ċ/c = A '+MINUS+' δ '+MINUS+' ρ = '+pc(s.g,1)+'   k̇/k at t = 0: A '+MINUS+' δ '+MINUS+' c₀/k₀ = '+pc(A-DL-x0,1)+'\n';
      if(s.cas==='bgp') out.appendChild(document.createTextNode('c₀/k₀ = ρ: c and k grow together at '+pc(s.g,1)+', and e^('+MINUS+'(A'+MINUS+'δ)t)·kₜ → 0, so the transversality condition holds'));
      else if(s.cas==='crash') warn(out,'c₀/k₀ > ρ: c keeps growing at '+pc(s.g,1)+' but capital runs out at t = '+s.ts.toFixed(1)+': infeasible');
      else warn(out,'c₀/k₀ < ρ: cₜ/kₜ falls to 0 and e^('+MINUS+'(A'+MINUS+'δ)t)·kₜ → 1 '+MINUS+' (c₀/k₀)/ρ = '+s.tc.toFixed(2)+', not 0: the transversality condition fails');
    }
    /* the Try it steps read the three controls, the two growth rates (percent), the crash time and the limit of the
       transversality term; set moves the sliders, rho before x0 so that x0=rho lands on the new rho */
    api=NF.api({
      get:function(){ var s=sol(); return {x0:x0, a:A, rho:rho, g:s.g*100, gk:(A-DL-x0)*100, bgp:s.bgp, ts:s.ts, tc:s.tc, cas:s.cas}; },
      set:function(st){
        if('a' in st && ra) ra.set(+st.a);
        if('rho' in st && rr) rr.set(+st.rho);
        if('x0' in st && rx) rx.set(+st.x0);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Diminishing against constant returns: convergence ---------- */
  NF.register('ma4-conv',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var A=0.12, DL=0.05, RHO=0.04, KP=0.25, KR=1, TM=100, al=0.3, W=520, H=372, P1, P2, el={}, cur={}, api;
    var cache={};
    var rs=range(fig,'alpha',2,function(v){ al=v; update(); });
    if(rs) al=rs.v();
    /* f(k) = (A/alpha) k^alpha, so f'(1) = A for every alpha and alpha = 1 is the AK model y = Ak. Log utility. */
    function f(k,a){ return A/a*Math.pow(k,a); }
    function fp(k,a){ return A*Math.pow(k,a-1); }
    /* the saddle path below k*, from the steady state backwards, with u = ln(s* - s) and s = ln k as the running
       variable so that the steps are fine near k*; it carries c and the time t (0 at the start, falling backwards) */
    function saddle(a){
      var key=a.toFixed(2);
      if(cache[key]) return cache[key];
      var ks=Math.pow(A/(DL+RHO),1/(1-a)), cs=f(ks,a)-DL*ks, fpp=A*(a-1)*Math.pow(ks,a-2),
          ls=(RHO-Math.sqrt(RHO*RHO-4*cs*fpp))/2, sl=RHO-ls, ss=Math.log(ks),
          u0=Math.log(1e-7), u1=Math.log(ss-Math.log(0.15)), N=700, h=(u1-u0)/N, i, u, c, t, k1, k2, k3, k4, S0=[], C0=[], T0=[];
      function F(u,c){
        var d=Math.exp(u), s=ss-d, k=Math.exp(s), kd=f(k,a)-c-DL*k;
        return [-d*k*c*(fp(k,a)-DL-RHO)/kd, -d*k/kd];
      }
      u=u0; c=cs-sl*(ks-Math.exp(ss-1e-7)); t=0;
      S0.push(ss-1e-7); C0.push(c); T0.push(0);
      for(i=0;i<N;i++){
        k1=F(u,c); k2=F(u+h/2,c+h/2*k1[0]); k3=F(u+h/2,c+h/2*k2[0]); k4=F(u+h,c+h*k3[0]);
        c+=h/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]); t+=h/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]); u+=h;
        S0.push(ss-Math.exp(u)); C0.push(c); T0.push(t);
      }
      cache[key]={ks:ks, cs:cs, ls:ls, s:S0, c:C0, t:T0};
      return cache[key];
    }
    /* interpolate column y at s (the s column falls with the index) */
    function at_s(P,col,s){
      var a=0, b=P.s.length-1, m, w;
      if(s>=P.s[0]) return P[col][0];
      while(b-a>1){ m=(a+b)>>1; if(P.s[m]>s) a=m; else b=m; }
      w=(P.s[a]-s)/(P.s[a]-P.s[b]);
      return P[col][a]+(P[col][b]-P[col][a])*w;
    }
    /* s where the clock reads T (t rises towards the steady state, so it falls with the index) */
    function s_at(P,T){
      var a=0, b=P.t.length-1, m, w;
      if(T>=P.t[0]) return Math.log(P.ks);
      while(b-a>1){ m=(a+b)>>1; if(P.t[m]>T) a=m; else b=m; }
      w=(P.t[a]-T)/(P.t[a]-P.t[b]);
      return P.s[a]+(P.s[b]-P.s[a])*w;
    }
    /* ln y over [0, TM] for an economy that starts at k0, and its output growth at t = 0 */
    function path(k0){
      var a=al, n=200, L=[], i, t, s, P, s0, T0, c0;
      if(a>0.999){
        for(i=0;i<=n;i++){ t=TM*i/n; L.push([t,Math.log(A)+Math.log(k0)+(A-DL-RHO)*t]); }
        return {L:L, g:A-DL-RHO, c0:RHO*k0};
      }
      P=saddle(a); s0=Math.log(k0); T0=at_s(P,'t',s0); c0=at_s(P,'c',s0);
      for(i=0;i<=n;i++){ t=TM*i/n; s=s_at(P,T0+t); L.push([t,Math.log(A/a)+a*s]); }
      return {L:L, g:a*(f(k0,a)-c0-DL*k0)/k0, c0:c0};
    }
    function draw(){
      var mL=40, mR=26, x1;
      W=measure(svg); frame(svg,W,H); x1=W-mR;
      el.key=S('g',null,svg);
      var rows=key(el.key,[['line','ma4-rich','rich, k₀ = 1'],['line','ma4-poor','poor, k₀ = 0.25'],['rect','ma4-kstar','steady state k*']],mL,12,x1);
      var top=rows>1?58:42;
      P1=box(svg,{x0:mL,x1:x1,y0:top,y1:top+118,xd:[0.1,1000],yd:[-0.05,0.25],xlog:true,xt:[0.1,1,10,100,1000],yt:[0,0.1,0.2],
        yf:function(v){ return tl(v*100); },xn:'k',yn:'ċ/c = f′(k) '+MINUS+' δ '+MINUS+' ρ, % a year',xnd:18});
      el.top=top;
      el.gc=S('path',{'class':'ma4-curve'},P1.gc);
      el.ks=S('circle',{r:0,'class':'ma4-kstar'},P1.gc);
      el.ksl=text(svg,0,0,'k*','ma4-kl nf-halo','middle');
      el.pr=S('circle',{r:4.5,'class':'ma4-dr'},P1.gc);
      el.pp=S('circle',{r:4.5,'class':'ma4-dp'},P1.gc);
      el.y0=top+158; el.y1=H-24;
      el.p2=S('g',null,svg);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var a=al, G=[], i, k, rich=path(KR), poor=path(KP), lo, hi, t, P, gap=[], ks=a<0.999?saddle(a).ks:Infinity;
      for(i=0;i<=240;i++){ k=Math.pow(10,-1+4*i/240); G.push([k,fp(k,a)-DL-RHO]); }
      el.gc.setAttribute('d',pathOf(G,P1.xs,P1.ys));
      at(el.pr,P1.xs(KR),P1.ys(clamp(fp(KR,a)-DL-RHO,-0.06,0.26)));
      at(el.pp,P1.xs(KP),P1.ys(clamp(fp(KP,a)-DL-RHO,-0.06,0.26)));
      if(ks<1000){ el.ks.setAttribute('r',4.5); at(el.ks,P1.xs(ks),P1.ys(0)); el.ksl.textContent='k*'; moveTo(el.ksl,P1.xs(ks),P1.ys(0)+17); }
      else { el.ks.setAttribute('r',0); el.ksl.textContent=''; }
      /* the time panel is redrawn: its scale follows the paths */
      while(el.p2.firstChild) el.p2.removeChild(el.p2.firstChild);
      lo=Math.min(rich.L[0][1],poor.L[0][1]); hi=Math.max(rich.L[200][1],poor.L[200][1]);
      t=nice((hi-lo)/3); lo=Math.floor(lo/t)*t; hi=Math.ceil(hi/t)*t;
      P2=box(el.p2,{x0:P1.o.x0,x1:P1.o.x1,y0:el.y0,y1:el.y1,xd:[0,TM],yd:[lo,hi],xt:ticks(0,TM,4),yt:ticks(lo,hi,3),xn:'t',yn:'ln y',xnd:20});
      S('path',{d:pathOf(rich.L,P2.xs,P2.ys),'class':'ma4-rich'},P2.gc);
      S('path',{d:pathOf(poor.L,P2.xs,P2.ys),'class':'ma4-poor'},P2.gc);
      /* the paths hold 201 points over [0, 100], so t = 0, 50 and 100 sit at 0, 100 and 200 */
      for(i=0;i<=200;i+=100) gap.push(rich.L[i][1]-poor.L[i][1]);
      cur={alpha:a, kstar:ks<Infinity?ks:'∞', gr:rich.g*100, gp:poor.g*100, gap0:gap[0], gap50:gap[1], gap100:gap[2], ak:a>0.999};
      if(!out) return;
      if(a>0.999) out.textContent='α = 1, the AK model: no steady state, both grow at A '+MINUS+' δ '+MINUS+' ρ = '+pc(A-DL-RHO,1)+' for ever\nln(y_rich/y_poor) stays at ln 4 = '+gap[0].toFixed(2);
      else out.textContent='α = '+a.toFixed(2)+'   k* = '+(ks<100?ks.toFixed(2):ks.toFixed(0))+'   output growth at t = 0: poor '+pc(poor.g,1)+', rich '+pc(rich.g,1)+
        '\nln(y_rich/y_poor) = '+gap[0].toFixed(2)+' at t = 0, '+gap[1].toFixed(2)+' at t = 50, '+gap[2].toFixed(2)+' at t = 100';
    }
    /* the Try it steps read alpha, k*, the two output growth rates at t = 0 (percent) and the income gap at t = 0, 50, 100 */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){ if('alpha' in st && rs) rs.set(+st.alpha); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Returns to physical and human capital ---------- */
  NF.register('ma4-hk',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var A=0.2, DL=0.05, RHO=0.03, al=0.3, B=0.2, xp=1, W=520, H=318, P, el={}, cur={}, api;
    var XL=0.2, XH=20, YH=0.3;
    var ra=range(fig,'alpha',2,function(v){ al=v; update(); });
    var rb=range(fig,'b',2,function(v){ B=v; update(); });
    if(ra) al=ra.v();
    if(rb) B=rb.v();
    var mode=seg(fig,'data-sec',function(v){ if(v===mode) return; mode=v; lock(); update(); });
    if(mode!=='one' && mode!=='two') mode='one';
    function lock(){
      if(!rb) return;
      var off=mode==='one';
      rb.el.disabled=off;
      rb.wrap.setAttribute('class',off?'nfig-range is-off':'nfig-range');
    }
    function bb(){ return mode==='one'?A:B; }
    /* in goods: rK = alpha A x^(1 - alpha), rH = (1 - alpha) A x^(-alpha)/p with p = A/B the price of human capital
       (p = 1 in one sector), so rH = (1 - alpha) B x^(-alpha); x = H/K */
    function rK(x){ return al*A*Math.pow(x,1-al); }
    function rH(x){ return (1-al)*bb()*Math.pow(x,-al); }
    function draw(){
      var mL=40, mR=30, x1;
      W=measure(svg); frame(svg,W,H); x1=W-mR;
      el.key=S('g',null,svg);
      var rows=key(el.key,[['line','ma4-rk','return on K'],['line','ma4-rh','return on H'],['line','ma4-guide','δ + ρ'],['line','ma4-slide','slides’ (1 '+MINUS+' α)/α']],mL,12,x1);
      var top=rows>1?(rows>2?72:58):42;
      H=top+232; frame(svg,W,H);
      el.key=S('g',null,svg);
      key(el.key,[['line','ma4-rk','return on K'],['line','ma4-rh','return on H'],['line','ma4-guide','δ + ρ'],['line','ma4-slide','slides’ (1 '+MINUS+' α)/α']],mL,12,x1);
      P=box(svg,{x0:mL,x1:x1,y0:top,y1:H-24,xd:[XL,XH],yd:[0,YH],xlog:true,xt:[0.2,0.5,1,2,5,10,20],yt:[0,0.1,0.2,0.3],xn:'H/K',yn:'return, goods per unit a year',xnd:28});
      el.dr=line(P.gc,0,0,0,0,'ma4-guide');
      el.sl=line(P.gc,0,0,0,0,'ma4-slide');
      el.k=S('path',{'class':'ma4-rk'},P.gc);
      el.h=S('path',{'class':'ma4-rh'},P.gc);
      el.pv=line(P.gc,0,0,0,0,'ma4-probe');
      el.pk=S('circle',{r:4,'class':'ma4-dk'},P.gc);
      el.ph=S('circle',{r:4,'class':'ma4-dh'},P.gc);
      el.drop=line(P.gc,0,0,0,0,'ma4-drop');
      el.st=S('circle',{r:5.5,'class':'ma4-star'},P.gc);
      el.stl=text(svg,0,0,'','ma4-kl nf-halo','middle');
      svg.setAttribute('aria-valuemin',XL); svg.setAttribute('aria-valuemax',XH);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var Pk=[], Ph=[], i, x, b=bb(), xs=(1-al)/al*b/A, r=rK(xs), at_=A*Math.pow(xs,1-al), g=r-DL-RHO, sl=(1-al)/al, yk, yh, inv, s;
      for(i=0;i<=200;i++){ x=XL*Math.pow(XH/XL,i/200); Pk.push([x,rK(x)]); Ph.push([x,rH(x)]); }
      el.k.setAttribute('d',pathOf(Pk,P.xs,P.ys));
      el.h.setAttribute('d',pathOf(Ph,P.xs,P.ys));
      setLine(el.dr,P.o.x0,P.ys(DL+RHO),P.o.x1,P.ys(DL+RHO));
      if(mode==='two' && Math.abs(xs-sl)>1e-9) setLine(el.sl,P.xs(sl),P.o.y0,P.xs(sl),P.o.y1); else setLine(el.sl,0,0,0,0);
      at(el.st,P.xs(xs),P.ys(r));
      el.stl.textContent='(H/K)* = '+xs.toFixed(2);
      /* a drop from the dot to the axis, named just above the axis where neither curve runs */
      setLine(el.drop,P.xs(xs),P.ys(r)+6,P.xs(xs),Math.max(P.ys(r)+6,P.o.y1-20));
      moveTo(el.stl,clamp(P.xs(xs),P.o.x0+44,P.o.x1-44),P.o.y1-7);
      yk=rK(xp); yh=rH(xp);
      setLine(el.pv,P.xs(xp),P.o.y0,P.xs(xp),P.o.y1);
      at(el.pk,P.xs(xp),P.ys(Math.min(yk,YH+0.02))); at(el.ph,P.xs(xp),P.ys(Math.min(yh,YH+0.02)));
      inv=Math.abs(yk-yh)<5e-4?'both':(yh>yk?'h':'k');
      cur={mode:mode, alpha:al, b:b, hk:xs, slide:sl, r:r, at:at_, g:g*100, x:xp, rk:yk, rh:yh, invest:inv};
      svg.setAttribute('aria-valuenow',+xp.toFixed(2));
      svg.setAttribute('aria-valuetext','H/K = '+xp.toFixed(2)+', return on K '+yk.toFixed(3)+', return on H '+yh.toFixed(3));
      if(!out) return;
      s=(mode==='one'?'(H/K)* = (1 '+MINUS+' α)/α = ':'(H/K)* = ((1 '+MINUS+' α)/α)(B/A) = ')+xs.toFixed(2)+'   r = '+r.toFixed(3)+
        '   output '+(mode==='one'?'Y':'Y + p(Ḣ + δH)')+' = '+at_.toFixed(3)+'K   growth r '+MINUS+' δ '+MINUS+' ρ = '+pc(g,2)+
        '\nat H/K = '+xp.toFixed(2)+': return on K '+yk.toFixed(3)+(inv==='both'?' = ':inv==='h'?' < ':' > ')+'return on H '+yh.toFixed(3)+
        (inv==='both'?': indifferent':inv==='h'?': add human capital':': add physical capital');
      out.textContent=s;
      if(mode==='two' && Math.abs(xs-sl)>1e-9) warn(out,'\nthe slides’ (1 '+MINUS+' α)/α = '+sl.toFixed(2)+' holds only when B = A');
    }
    function setX(v){ xp=clamp(Math.round(v*100)/100,XL,XH); update(); }
    xdrag(svg,function(px){ setX(P.xs.inv(px)); },function(d){ setX(xp*Math.pow(1.02,d)); });
    /* the Try it steps read the mode, alpha, B, the crossing, the common return, output per unit of K, growth (percent)
       and the probe; set takes mode, alpha, b and the probe x */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('mode' in st) NF.press(fig,'data-sec',String(st.mode));
        if('alpha' in st && ra) ra.set(+st.alpha);
        if('b' in st && rb) rb.set(+st.b);
        if('x' in st) setX(+st.x);
      }
    });
    lock();
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Romer against Jones: raise the research share at t = 0 ---------- */
  NF.register('ma4-jones',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var be=1, n=0.01, s0=0.02, s1=0.04, G0=0.02, TM=200, W=520, H=372, P1, el={}, cur={}, api;
    var rbe=range(fig,'beta',2,function(v){ be=v; update(); });
    var rn=range(fig,'n',1,function(v){ n=v/100; update(); });
    var rs=range(fig,'s1',1,function(v){ s1=v/100; update(); });
    if(rbe) be=rbe.v();
    if(rn) n=rn.v()/100;
    if(rs) s1=rs.v()/100;
    /* g_A = R A^(-beta) with R = s L0 e^(nt) and A0 = 1, so g_A(0) = s L0: the economy without the change starts at
       G0 = 2%, and with the change at (s1/s0) G0. dg/dt = g(n - beta g) has a closed form in each case. */
    function g_at(t,gi){
      if(be<1e-9) return gi*Math.exp(n*t);
      if(n<1e-12) return gi/(1+be*gi*t);
      var gs=n/be; return gs/(1+(gs/gi-1)*Math.exp(-n*t));
    }
    /* ln A_t: from A^beta = R/g_A when beta > 0, by integrating g_A when beta = 0 */
    function lnA(t,gi){
      if(be<1e-9) return n<1e-12?gi*t:gi*(Math.exp(n*t)-1)/n;
      return (Math.log(gi)+n*t-Math.log(g_at(t,gi)))/be;
    }
    function gap(t,m){ return lnA(t,m*G0)-lnA(t,G0)+Math.log((1-s1)/(1-s0)); }
    function draw(){
      var mL=44, mR=26, x1;
      W=measure(svg); frame(svg,W,H); x1=W-mR;
      el.key=S('g',null,svg);
      var rows=key(el.key,[['line','ma4-base','research share stays at 2%'],['line','ma4-pol','share changed at t = 0'],['line','ma4-lr','long run growth'],['line','ma4-gain','long run income gain']],mL,12,x1);
      var top=rows>2?74:rows>1?58:42;
      /* the legend wraps on a phone; the figure grows with it so the two panels keep their height */
      el.top=top; H=top+330; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P1=box(svg,{x0:mL,x1:x1,y0:top,y1:top+124,xd:[0,TM],yd:[0,0.08],xt:ticks(0,TM,4),yt:[0,0.02,0.04,0.06,0.08],noxl:true,
        yf:function(v){ return tl(v*100); },yn:'growth of y per person, % a year'});
      el.lr=line(P1.gc,0,0,0,0,'ma4-lr');
      el.b=S('path',{'class':'ma4-base'},P1.gc);
      el.p=S('path',{'class':'ma4-pol'},P1.gc);
      el.y0=top+160; el.y1=H-24; el.x0=mL; el.x1=x1;
      el.p2=S('g',null,svg);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var m=s1/s0, Pb=[], Pp=[], Pg=[], i, t, v, lo, hi, st, P2, lr, lrg, tov=-1, a, b, mid, k, g100, gs=be>1e-9?n/be:Infinity, ex=be<1e-9 && n>1e-12;
      for(i=0;i<=400;i++){
        t=TM*i/400;
        Pb.push([t,g_at(t,G0)]); Pp.push([t,g_at(t,m*G0)]);
        v=Math.exp(gap(t,m))-1; Pg.push([t,v]);
      }
      el.b.setAttribute('d',pathOf(Pb,P1.xs,P1.ys));
      el.p.setAttribute('d',pathOf(Pp,P1.xs,P1.ys));
      if(be>1e-9 && n>1e-12) setLine(el.lr,P1.o.x0,P1.ys(gs),P1.o.x1,P1.ys(gs)); else if(be>1e-9) setLine(el.lr,P1.o.x0,P1.ys(0),P1.o.x1,P1.ys(0)); else setLine(el.lr,0,0,0,0);
      /* long run income gain, from A* proportional to R^(1/beta): (s1/s0)^(1/beta) (1 - s1)/(1 - s0) */
      lrg=be>1e-9?Math.pow(m,1/be)*(1-s1)/(1-s0)-1:Infinity;
      /* the income panel: its scale follows the path, capped so that an explosion stays readable */
      while(el.p2.firstChild) el.p2.removeChild(el.p2.firstChild);
      lo=0; hi=0;
      for(i=0;i<Pg.length;i++){ lo=Math.min(lo,Pg[i][1]); hi=Math.max(hi,Pg[i][1]); }
      if(isFinite(lrg)){ lo=Math.min(lo,lrg); hi=Math.max(hi,lrg); }
      hi=Math.min(hi,4); lo=Math.max(lo,-0.5);
      if(hi-lo<0.05) hi=lo+0.05;
      st=nice((hi-lo)/3); lo=Math.floor(lo/st-1e-9)*st; hi=Math.ceil(hi/st-1e-9)*st;
      P2=box(el.p2,{x0:el.x0,x1:el.x1,y0:el.y0,y1:el.y1,xd:[0,TM],yd:[lo,hi],xt:ticks(0,TM,4),yt:ticks(lo,hi,3),xn:'t',
        yf:function(v){ return tl(Math.round(v*100)); },yn:'income with the change against without, % difference',xnd:20});
      if(isFinite(lrg)) line(P2.gc,el.x0,P2.ys(lrg),el.x1,P2.ys(lrg),'ma4-gain');
      S('path',{d:pathOf(Pg,P2.xs,P2.ys),'class':'ma4-pol'},P2.gc);
      /* the date at which income with the change first catches up: the gap starts negative when s1 > s0 */
      if(gap(0,m)<0){
        for(i=1;i<=4000;i++){ t=TM*5*i/4000; if(gap(t,m)>=0){ a=TM*5*(i-1)/4000; b=t; for(k=0;k<60;k++){ mid=(a+b)/2; if(gap(mid,m)>=0) b=mid; else a=mid; } tov=b; break; } }
      }
      g100=Math.exp(gap(100,m))-1;
      cur={beta:be, n:n*100, s1:s1*100, m:m, gstar:be>1e-9?gs*100:'∞', gimp:m*G0*100, gb0:G0*100, gp100:g_at(100,m*G0)*100, gb100:g_at(100,G0)*100,
        gain0:(Math.exp(gap(0,m))-1)*100, gain100:g100*100, lrgain:isFinite(lrg)?lrg*100:'∞', tover:tov, explode:ex};
      if(!out) return;
      out.textContent=(be<1e-9?'β = 0, Romer: g_A = s̄L, which grows with L at rate n = '+pc(n,1)+(ex?', so growth explodes':', so growth is constant'):
        'β = '+be.toFixed(2)+', n = '+pc(n,1)+': long run growth γn = n/β = '+pc(gs,2))+
        '   growth at t = 100: '+pc(g_at(100,G0),2)+(Math.abs(m-1)>1e-9?' without the change, '+pc(g_at(100,m*G0),2)+' with it':'')+
        (Math.abs(m-1)<1e-9?'\nresearch share stays at 2%: the two economies coincide':
        '\nresearch share 2% → '+pc(s1,1)+': growth '+pc(G0,1)+' → '+pc(m*G0,1)+' on impact; income '+pc(Math.exp(gap(0,m))-1,1)+' on impact, '+pc(g100,0)+' at t = 100'+
        (isFinite(lrg)?', '+pc(lrg,0)+' in the long run':', and the lead grows without bound')+(tov>0?'; it catches up at t = '+tov.toFixed(1):''));
    }
    /* the Try it steps read beta, n and s1 (percent), the long run growth gstar (percent), growth on impact and at t = 100,
       the income gain on impact, at t = 100 and in the long run (percent), the catch up date and whether growth explodes */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('beta' in st && rbe) rbe.set(+st.beta);
        if('n' in st && rn) rn.set(+st.n);
        if('s1' in st && rs) rs.set(+st.s1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Automation in research: g_A = n/(beta - alpha) ---------- */
  NF.register('ma4-ai',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var be=3, n=0.01, al=0, W=520, H=318, P, el={}, cur={}, api, YH=0.04;
    var rbe=range(fig,'beta',2,function(v){ be=v; update(); });
    var rn=range(fig,'n',1,function(v){ n=v/100; update(); });
    var ral=range(fig,'alpha',2,function(v){ al=v; update(); });
    if(rbe) be=rbe.v();
    if(rn) n=rn.v()/100;
    if(ral) al=ral.v();
    function gA(a,b){ return a<b-1e-9?n/(b-a):Infinity; }
    function curve(b){ var P=[], i, a; for(i=0;i<=400;i++){ a=i/400; P.push([a,a<b-1e-9?Math.min(n/(b-a),1):NaN]); } return P; }
    function draw(){
      var mL=40, mR=26, x1, top;
      W=measure(svg); frame(svg,W,H); x1=W-mR;
      el.key=S('g',null,svg);
      var rows=key(el.key,[['line','ma4-ref','β = 3, 1.5 and 1, as on slide 46'],['line','ma4-pol','your β'],['rect','ma4-boom ma4-sw','α ≥ β: no balanced path']],mL,12,x1);
      top=rows>1?58:42;
      P=box(svg,{x0:mL,x1:x1,y0:top,y1:H-24,xd:[0,1],yd:[0,YH],xt:[0,0.2,0.4,0.6,0.8,1],yt:[0,0.01,0.02,0.03,0.04],
        yf:function(v){ return tl(v*100); },xn:'α',yn:'long run growth of ideas g_A = n/(β '+MINUS+' α), %',xnd:16});
      el.boom=S('rect',{'class':'ma4-boom',y:P.o.y0,height:P.o.y1-P.o.y0},P.gc);
      el.refs=S('g',null,P.gc);
      el.lab=S('g',null,svg);
      el.c=S('path',{'class':'ma4-pol'},P.gc);
      el.v=line(P.gc,0,0,0,0,'ma4-probe ma4-pa');
      el.d=S('circle',{r:5,'class':'ma4-da'},P.gc);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var refs=[3,1.5,1], i, b, g=gA(al,be), x0=P.xs(Math.min(1,be)), s;
      while(el.refs.firstChild) el.refs.removeChild(el.refs.firstChild);
      while(el.lab.firstChild) el.lab.removeChild(el.lab.firstChild);
      for(i=0;i<refs.length;i++){
        b=refs[i];
        S('path',{d:pathOf(curve(b),P.xs,P.ys),'class':'ma4-ref'},el.refs);
        /* the name sits inside the plot, above the right end of its curve */
        if(b>1 && n/(b-1)<YH*0.92) text(el.lab,P.o.x1-4,P.ys(n/(b-1))-7,'β = '+tl(b),'nf-lab nf-halo ma4-small','end');
      }
      el.c.setAttribute('d',pathOf(curve(be),P.xs,P.ys));
      if(be<1){ el.boom.setAttribute('x',R(x0)); el.boom.setAttribute('width',R(P.o.x1-x0)); } else { el.boom.setAttribute('width',0); }
      setLine(el.v,P.xs(al),P.o.y0,P.xs(al),P.o.y1);
      if(isFinite(g)){ el.d.setAttribute('r',5); at(el.d,P.xs(al),P.ys(Math.min(g,YH+0.002))); } else el.d.setAttribute('r',0);
      cur={beta:be, n:n*100, alpha:al, g:isFinite(g)?g*100:'∞', g0:gA(0,be)*100, explode:!isFinite(g), gain:isFinite(g)?(g-gA(0,be))*100:'∞'};
      if(!out) return;
      s='β = '+be.toFixed(2)+'   n = '+pc(n,1)+'   α = '+al.toFixed(2)+'   no automation: n/β = '+pc(gA(0,be),2);
      out.textContent=s+'\n';
      if(isFinite(g)) out.appendChild(document.createTextNode('g_A = n/(β '+MINUS+' α) = '+pc(g,2)+(g>YH?', off the top of the chart':'')));
      else warn(out,'α ≥ β: automation outruns the fall in research productivity, there is no balanced growth path and growth explodes');
    }
    /* the Try it steps read beta, n (percent), alpha, g (percent, or ∞ past the singularity), g at alpha = 0 and the gain */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('beta' in st && rbe) rbe.set(+st.beta);
        if('n' in st && rn) rn.set(+st.n);
        if('alpha' in st && ral) ral.set(+st.alpha);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
