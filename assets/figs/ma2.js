/* Core Macroeconomics L2 figures: the life cycle of one generation, the OLG law of motion and its staircase,
   multiple steady states under CES production, the golden rule and dynamic inefficiency, and pensions.
   Every curve is computed from the model in the browser. Drawn with the helpers of /assets/notes.js (window.NF);
   colours come from CSS variables in /assets/figs/ma2.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      press=NF.press, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  /* root of f on [lo, hi] by halving; f(lo) and f(hi) must differ in sign */
  function bisect(f,lo,hi,n){
    var flo=f(lo), m, fm, i;
    for(i=0;i<(n||70);i++){ m=0.5*(lo+hi); fm=f(m); if((fm>0)===(flo>0)){ lo=m; flo=fm; } else hi=m; }
    return 0.5*(lo+hi);
  }
  /* the smallest round number at or above v, for an axis end */
  function niceMax(v){
    var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)), m=v/p, c=[1,1.2,1.5,2,2.5,3,4,5,6,8,10], i;
    for(i=0;i<c.length;i++) if(c[i]>=m-1e-9) return c[i]*p;
    return 10*p;
  }
  function ticks(X,n){
    var raw=X/(n||4), p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), m=raw/p, s=(m<=1?1:m<=2?2:m<=5?5:10)*p, t=[], v;
    for(v=0;v<=X*(1+1e-9);v+=s) t.push(Math.round(v/s)*s);
    return t;
  }
  /* a label with an optional subscript, as in the L3 figures */
  function lab(g,x,y,base,sub,cls,anchor){
    var t=S('text',{x:R(x),y:R(y)},g), s;
    if(cls) t.setAttribute('class',cls);
    if(anchor) t.setAttribute('text-anchor',anchor);
    t.appendChild(document.createTextNode(base));
    if(sub){ s=S('tspan',{dy:'3','class':'nf-sub'},t); s.textContent=sub; }
    return t;
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  /* capital stocks span three orders of magnitude across the sliders, so they print with three significant digits */
  function fk(v){ return v>=1?v.toFixed(2):v<=0?'0':v.toPrecision(3); }
  function pct(v,d){ return (v>0&&parseFloat(v.toFixed(d))!==0?'+':'')+fmt(v,d)+'%'; }
  /* a plot box: grid, ticks and axes; returns the scales and a group clipped to the box */
  function panel(svg,P,xr,yr,xt,yt){
    var g=S('g',null,svg), xs=lin(xr[0],xr[1],P.x,P.x+P.w), ys=lin(yr[0],yr[1],P.y+P.h,P.y), i, v;
    for(i=0;i<xt.length;i++){
      v=xt[i]; line(g,C(xs(v)),P.y,C(xs(v)),P.y+P.h,'nf-grid'); line(g,C(xs(v)),P.y+P.h,C(xs(v)),P.y+P.h+4,'nf-ax');
      text(g,xs(v),P.y+P.h+16,tl(v),null,'middle');
    }
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,P.x,C(ys(v)),P.x+P.w,C(ys(v)),v===0?'nf-ax':'nf-grid'); text(g,P.x-6,ys(v)+4,tl(v),null,'end'); }
    line(g,P.x,C(P.y+P.h),P.x+P.w,C(P.y+P.h),'nf-ax');
    line(g,C(P.x),P.y,C(P.x),P.y+P.h,'nf-ax');
    return {xs:xs, ys:ys, g:g, gc:clip(svg,P.x,P.y-2,P.w+2,P.h+4), P:P};
  }
  /* the law of motion (k_t across, k_t+1 up, equal scales) beside the time path (generations across, k_t up);
     stacked on a phone */
  function lomLayout(W){
    var mL=46, mR=18, top=26, gap=56, side;
    if(W>=500){
      side=Math.min(270,W-mL-gap-mR-150);
      return {A:{x:mL,y:top,w:side,h:side}, B:{x:mL+side+gap,y:top,w:W-mR-mL-side-gap,h:side}, H:top+side+28};
    }
    side=Math.min(W-mL-mR,270);
    return {A:{x:mL,y:top,w:side,h:side}, B:{x:mL,y:top+side+58,w:W-mL-mR,h:120}, H:top+side+58+120+28};
  }
  function lomAxes(svg,L,X,T){
    var t=ticks(X), tt=[], i, a, b;
    for(i=0;i<=T;i+=(L.B.w<230?2:1)) tt.push(i);
    a=panel(svg,L.A,[0,X],[0,X],t,t);
    b=panel(svg,L.B,[0,T],[0,X],tt,t);
    line(a.gc,a.xs(0),a.ys(0),a.xs(X),a.ys(X),'ma2-45');
    text(a.g,a.xs(0.97*X),a.ys(0.97*X)+15,'45°','nf-lab','end');
    lab(svg,L.A.x+2,L.A.y-10,'k','t+1','nf-title');
    lab(svg,L.A.x+L.A.w+5,L.A.y+L.A.h+4,'k','t','nf-title');
    lab(svg,L.B.x+2,L.B.y-10,'k','t','nf-title');
    text(svg,L.B.x+L.B.w+5,L.B.y+L.B.h+4,'t','nf-title');
    return {a:a, b:b};
  }
  /* the cobweb: up from k_0 to the curve, across to the 45 degree line, up again */
  function stair(a,path){
    var p=[[a.xs(path[0]),a.ys(0)]], i;
    for(i=0;i+1<path.length;i++){ p.push([a.xs(path[i]),a.ys(path[i+1])],[a.xs(path[i+1]),a.ys(path[i+1])]); }
    return poly(p);
  }
  function curve(a,g,X,n){
    var p=[], i, k, v;
    for(i=0;i<=n;i++){ k=X*i/n; v=g(k); if(isFinite(v)) p.push([a.xs(k),a.ys(Math.min(v,3*X))]); }
    return poly(p);
  }
  /* a draggable point on the k_t axis; keys move it by one step, page keys by five */
  function knob(svg,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob ma2-kb'},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, d=0;
      if(k==='ArrowRight'||k==='ArrowUp') d=1; else if(k==='ArrowLeft'||k==='ArrowDown') d=-1;
      else if(k==='PageUp') d=5; else if(k==='PageDown') d=-5; else return;
      e.preventDefault(); onKey(d);
    });
    return h;
  }
  /* press anywhere over the law of motion to move k_0 there, then drag; only a touch that starts on the knob
     stops the page from scrolling */
  function axisDrag(svg,size,box,where,move,focus){
    var on=false;
    function inside(p){ var A=box(); return p[0]>=A.x-12 && p[0]<=A.x+A.w+12 && p[1]>=A.y-6 && p[1]<=A.y+A.h+22; }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]);
      if(!inside(p)) return;
      on=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag'); if(focus) focus();
      move(p[0]);
    });
    svg.addEventListener('pointermove',function(e){ if(!on) return; var s=size(); move(local(svg,e,s[0],s[1])[0]); });
    function stop(){ on=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size(), p=local(svg,e.touches[0],s[0],s[1]), q=where();
      if(q && Math.hypot(p[0]-q[0],p[1]-q[1])<26) e.preventDefault();
    },{passive:false});
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+now.toPrecision(3));
    h.setAttribute('aria-valuetext',txt);
  }

  /* ---------- 1. One generation's life cycle (slides 20 to 22) ---------- */
  NF.register('ma2-life',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* ages 20 to 79: wages rise and then fall until retirement at 65, nothing after; sigma = 2 */
    var AGE0=20, RET=65, N=60, SIG=2, Y=[], i, r=0.03, rho=0.03, W=520, H=360, el={}, api, st={};
    for(i=0;i<N;i++) Y.push(i<RET-AGE0?Math.exp(0.05*i-0.0011*i*i):0);
    var mode=seg(fig,'data-mode',function(v){ if(v===mode) return; mode=v; update(); });
    if(mode!=='limit') mode='borrow';
    var rr=range(fig,'r',3,function(v){ r=v; update(); }), rp=range(fig,'rho',3,function(v){ rho=v; update(); });
    if(rr) r=rr.v();
    if(rp) rho=rp.v();
    /* free borrowing and lending at r: consumption grows at the Euler rate and its present value equals that of income */
    function free(){
      var Rg=1+r, g=Math.pow((1+r)/(1+rho),1/SIG), pv=0, an=0, c=[], x=[0], j;
      for(j=0;j<N;j++){ pv+=Y[j]/Math.pow(Rg,j); an+=Math.pow(g/Rg,j); }
      for(j=0;j<N;j++){ c.push(pv/an*Math.pow(g,j)); x.push(Rg*x[j]+Y[j]-c[j]); }
      x[N]=0;
      return {c:c, x:x};
    }
    /* no borrowing: endogenous grid points, backwards from the last age, where everything is eaten; cash on hand m
       below the first grid point means the limit binds and c = m */
    function interp(xs,ys,v){
      var lo=0, hi=xs.length-1, mid;
      if(v<=xs[0]) return ys[0];
      if(v>=xs[hi]) return ys[hi]+(v-xs[hi])*(ys[hi]-ys[hi-1])/(xs[hi]-xs[hi-1]);
      while(hi-lo>1){ mid=(lo+hi)>>1; if(xs[mid]>v) hi=mid; else lo=mid; }
      return ys[lo]+(v-xs[lo])*(ys[hi]-ys[lo])/(xs[hi]-xs[lo]);
    }
    function limited(){
      var Rg=1+r, be=1/(1+rho), K=400, sg=[], pol=new Array(N), j, q, mN, cN, m, c, f=Math.pow(be*Rg,-1/SIG), x=[0], cc=[], mm;
      for(q=0;q<K;q++) sg.push(80*Math.pow(q/(K-1),2));
      pol[N-1]={m:[0,1e4], c:[0,1e4]};
      for(j=N-2;j>=0;j--){
        mN=pol[j+1].m; cN=pol[j+1].c; m=[0]; c=[0];
        for(q=0;q<K;q++){ var c1=interp(mN,cN,Rg*sg[q]+Y[j+1]), c0=c1*f; c.push(c0); m.push(c0+sg[q]); }
        pol[j]={m:m, c:c};
      }
      for(j=0;j<N;j++){ mm=Rg*x[j]+Y[j]; cc.push(Math.min(interp(pol[j].m,pol[j].c,mm),mm)); x.push(mm-cc[j]); }
      x[N]=Math.max(0,x[N]);
      return {c:cc, x:x};
    }
    function stats(sol){
      var c=sol.c, x=sol.x, j, cpk=-1, apk=0, dmin=0, adebt=0, xpk=-1, axpk=0, apos=0, bind=0;
      for(j=0;j<N;j++) if(c[j]>cpk+1e-9){ cpk=c[j]; apk=AGE0+j; }
      for(j=0;j<=N;j++){ if(x[j]<dmin){ dmin=x[j]; adebt=AGE0+j; } if(x[j]>xpk){ xpk=x[j]; axpk=AGE0+j; } }
      for(j=N-1;j>=1;j--){ if(x[j]>1e-9) apos=AGE0+j; else break; }
      for(j=1;j<N;j++) if(x[j]<1e-9 && j<RET-AGE0) bind=AGE0+j-1;
      return {cpk:cpk, apk:apk, debt:-dmin, adebt:adebt, xpk:xpk, axpk:axpk, apos:apos, bind:bind,
        hump:apk>AGE0 && apk<AGE0+N-1 && c[0]<cpk-1e-6 && c[N-1]<cpk-1e-6};
    }
    function layout(){
      var mL=44, mR=20, top=26, h1=W<500?150:160, h2=W<500?118:124;
      return {A:{x:mL,y:top,w:W-mL-mR,h:h1}, B:{x:mL,y:top+h1+52,w:W-mL-mR,h:h2}, H:top+h1+52+h2+28};
    }
    function update(){
      var sol=mode==='limit'?limited():free(), s=stats(sol), L, a, b, j, cmax=0, xmin=0, xmax=0, yt, xt=[], ylo, yhi, pc=[], pi=[], px=[], gpos, gneg, xr, rows, k0, z0;
      W=measure(svg); L=layout(); H=L.H; frame(svg,W,H);
      for(j=0;j<N;j++){ cmax=Math.max(cmax,sol.c[j],Y[j]); }
      for(j=0;j<=N;j++){ xmin=Math.min(xmin,sol.x[j]); xmax=Math.max(xmax,sol.x[j]); }
      for(j=20;j<=80;j+=W<420?20:10) xt.push(j);
      yt=ticks(niceMax(cmax*1.08),3);
      a=panel(svg,L.A,[20,80],[0,yt[yt.length-1]],xt,yt);
      /* assets: ticks from the upper end's step, extended below zero far enough to hold the deepest debt */
      yhi=niceMax(Math.max(xmax,1)*1.05); xr=ticks(yhi,4); k0=xr[1]; ylo=0;
      if(xmin<-1e-9){ z0=Math.ceil(-xmin*1.1/k0); for(j=1;j<=z0;j++) xr.unshift(-j*k0); ylo=-z0*k0; }
      b=panel(svg,L.B,[20,80],[ylo,yhi],xt,xr);
      line(a.g,C(a.xs(RET)),L.A.y,C(a.xs(RET)),L.A.y+L.A.h,'ma2-ret');
      line(b.g,C(b.xs(RET)),L.B.y,C(b.xs(RET)),L.B.y+L.B.h,'ma2-ret');
      text(a.g,a.xs(RET)+4,L.A.y+12,'retire','nf-lab');
      for(j=0;j<N;j++){ pi.push([a.xs(AGE0+j),a.ys(Y[j])]); pc.push([a.xs(AGE0+j),a.ys(sol.c[j])]); }
      /* income drops to zero at 65: a vertical step, not a slope */
      pi.splice(RET-AGE0,0,[a.xs(RET),a.ys(Y[RET-AGE0-1])]);
      S('path',{d:poly(pi),'class':'ma2-inc'},a.gc);
      S('path',{d:poly(pc),'class':'nf-line'},a.gc);
      rows=NF.key(S('g',null,svg),[['line','ma2-inc','income y'],['line','nf-line','consumption c']],L.A.x+8,L.A.y-10,W-6);
      for(j=0;j<=N;j++) px.push([b.xs(AGE0+j),b.ys(sol.x[j])]);
      /* the area between the asset path and zero: blue above, red (debt) below */
      gpos=clip(svg,L.B.x,L.B.y,L.B.w,Math.max(0,b.ys(0)-L.B.y));
      gneg=clip(svg,L.B.x,b.ys(0),L.B.w,Math.max(0,L.B.y+L.B.h-b.ys(0)));
      S('path',{d:poly(px)+'L'+R(b.xs(80))+','+R(b.ys(0))+'L'+R(b.xs(20))+','+R(b.ys(0))+'Z','class':'nf-area'},gpos);
      S('path',{d:poly(px)+'L'+R(b.xs(80))+','+R(b.ys(0))+'L'+R(b.xs(20))+','+R(b.ys(0))+'Z','class':'ma2-debt'},gneg);
      S('path',{d:poly(px),'class':'ma2-assets'},b.gc);
      text(svg,L.B.x+2,L.B.y-10,'assets at the start of each age','nf-title');
      text(svg,L.B.x+L.B.w+4,L.B.y+L.B.h+4,'age','nf-title');
      if(s.debt>1e-6) text(b.gc,b.xs(s.adebt)+8,b.ys(-s.debt)+13,'debt','ma2-dlab nf-halo');
      var g=Math.pow((1+r)/(1+rho),1/SIG);
      st={mode:mode, r:r, rho:rho, gr:g, gpct:100*(g-1), c20:sol.c[0], c79:sol.c[N-1], cpk:s.cpk, apk:s.apk, hump:s.hump,
        debt:s.debt, adebt:s.adebt, apos:s.apos, xpk:s.xpk, axpk:s.axpk, bind:mode==='limit'?s.bind:0};
      if(out){
        if(mode==='borrow') out.textContent='Euler: c grows '+pct(100*(g-1),2)+' a year; c is '+sol.c[0].toFixed(2)+' at 20 and '+sol.c[N-1].toFixed(2)+' at 79\n'+
          (s.debt>1e-6?'debt peaks at '+s.debt.toFixed(2)+' (age '+s.adebt+'); assets positive from age '+s.apos:'no debt at any age')+'; assets peak at '+s.xpk.toFixed(1)+' at '+s.axpk;
        else out.textContent=(s.bind>=AGE0?'the limit binds until age '+s.bind+' (c = y), then':'the limit never binds:')+' c grows '+pct(100*(g-1),2)+' a year\n'+
          'c peaks at '+s.cpk.toFixed(2)+' (age '+s.apk+'); assets peak at '+s.xpk.toFixed(1)+' at '+s.axpk;
      }
      if(api) api.changed();
    }
    /* the Try it steps read the mode, r and rho, the Euler growth factor and the profile's landmarks */
    api=NF.api({
      get:function(){ return st; },
      set:function(o){
        if('mode' in o) press(fig,'data-mode',String(o.mode));
        if('r' in o && rr) rr.set(+o.r);
        if('rho' in o && rp) rp.set(+o.rho);
      }
    });
    update();
    watch(svg,update);
    return api;
  });

  /* ---------- 2. The law of motion, log utility or CRRA, Cobb Douglas (slides 31, 32 and 35) ---------- */
  NF.register('ma2-motion',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var al=0.3, be=0.5, sg=1, q=0.25, T=8, W=520, H=400, L, X=0.25, ax, el={}, kb, api, st={}, path=[];
    var ra=range(fig,'alpha',2,function(v){ al=v; update(); }),
        rb=range(fig,'beta',2,function(v){ be=v; update(); }),
        rs=range(fig,'sigma',1,function(v){ sg=v; update(); });
    if(ra) al=ra.v();
    if(rb) be=rb.v();
    if(rs) sg=rs.v();
    onClick(fig,'.ma2-half',function(){ q=0.5; update(); });
    onClick(fig,'.ma2-twice',function(){ q=2; update(); });
    /* CRRA saving: the young save w/(1 + beta^(-1/sigma) R^((sigma-1)/sigma)), and R = alpha k'^(alpha-1) is
       tomorrow's return, so k' solves k' + c k'^p = (1 - alpha) k^alpha with c and p below; log utility is sigma = 1 */
    function cp(){ var e=(sg-1)/sg; return {e:e, c:Math.pow(be,-1/sg)*Math.pow(al,e), p:1+(al-1)*e}; }
    function g(k){
      var w=(1-al)*Math.pow(k,al), z;
      if(k<=0) return 0;
      if(Math.abs(sg-1)<1e-9) return be/(1+be)*w;
      z=cp();
      return bisect(function(k1){ return k1+z.c*Math.pow(k1,z.p)-w; },0,w,60);
    }
    function steady(){
      if(Math.abs(sg-1)<1e-9) return Math.pow(be*(1-al)/(1+be),1/(1-al));
      var z=cp();
      /* in steady state 1 + c (k^(alpha-1))^e... = (1 - alpha) k^(alpha-1), with the left side written through cp() */
      return Math.exp(bisect(function(lk){ var k=Math.exp(lk); return (1-al)*Math.pow(k,al-1)-1-z.c*Math.pow(k,z.p-1); },Math.log(1e-9),Math.log(50),90));
    }
    function slopeAt(k){ var z=cp(); return al*(1-al)*Math.pow(k,al-1)/(1+z.c*z.p*Math.pow(k,z.p-1)); }
    function k0(){ return q*st.ks; }
    function setQ(v){ q=clamp(v,0.02*X/st.ks,X/st.ks); }
    function update(){
      var ks=steady(), m=slopeAt(ks), i, d;
      st.ks=ks; X=niceMax(2.1*ks); setQ(q);
      path=[k0()];
      for(i=0;i<T;i++) path.push(g(path[i]));
      draw(m);
    }
    function draw(m){
      var ks=st.ks, a, b, p=[], i, mono=true, t0, t1, kx, d;
      W=measure(svg); L=lomLayout(W); H=L.H; frame(svg,W,H);
      ax=lomAxes(svg,L,X,T); a=ax.a; b=ax.b;
      S('path',{d:curve(a,g,X,90),'class':'nf-line'},a.gc);
      t0=ks-0.3*X; t1=ks+0.3*X;
      line(a.gc,a.xs(t0),a.ys(ks+m*(t0-ks)),a.xs(t1),a.ys(ks+m*(t1-ks)),'ma2-tan');
      S('path',{d:stair(a,path),'class':'ma2-stair'},a.gc);
      line(a.g,C(a.xs(ks)),a.ys(ks),C(a.xs(ks)),a.ys(0),'nf-guide');
      S('circle',{cx:R(a.xs(ks)),cy:R(a.ys(ks)),r:4.5,'class':'nf-dot'},a.gc);
      text(svg,a.xs(ks)+5,a.ys(0)-6,'k*','nf-lab nf-halo');
      text(svg,a.xs(0.97*X),a.ys(Math.min(g(0.97*X),0.97*X))-8,'g(k)','nf-c1 nf-halo','end');
      /* the time path underneath, on the same vertical scale */
      line(b.gc,b.xs(0),C(b.ys(ks)),b.xs(T),C(b.ys(ks)),'nf-mean0');
      for(i=0;i<path.length;i++) p.push([b.xs(i),b.ys(path[i])]);
      S('path',{d:poly(p),'class':'ma2-path'},b.gc);
      for(i=0;i<path.length;i++) S('circle',{cx:R(p[i][0]),cy:R(p[i][1]),r:3.2,'class':'ma2-pt'},b.gc);
      text(svg,b.xs(T)-2,b.ys(ks)-6,'k*','nf-lab nf-halo','end');
      kb=knob(svg,'Starting capital k0, arrow keys move it',function(dd){ setQ(q+dd*0.05); update(); focusKnob(); });
      kx=a.xs(path[0]);
      place(kb,kx,a.ys(0),path[0],'k0 = '+fk(path[0])+', '+q.toFixed(2)+' times k*');
      lab(svg,kx,a.ys(0)-13,'k','0','nf-lab nf-halo ma2-k0','middle');
      for(i=1;i<path.length;i++) if((path[i]-path[i-1])*(path[1]-path[0])<-1e-15) mono=false;
      d=function(j){ return path[j]/ks; };
      st={alpha:al, beta:be, sigma:sg, ks:ks, rs:al*Math.pow(ks,al-1), slope:m, k0:path[0], q:path[0]/ks,
        k1:path[1], k2:path[2], k3:path[3], r1:d(1), r2:d(2), r3:d(3), mono:mono, x:X};
      if(out){
        out.textContent='k* = '+fk(ks)+'   R* = f′(k*) = '+st.rs.toFixed(2)+'   slope g′(k*) = '+m.toFixed(2)+'\n'+
          'k0 = '+fk(path[0])+' → '+fk(path[1])+' → '+fk(path[2])+' → '+fk(path[3])+'   (k/k* = '+d(0).toFixed(2)+', '+d(1).toFixed(2)+', '+d(2).toFixed(2)+', '+d(3).toFixed(2)+')';
      }
      if(api) api.changed();
    }
    function focusKnob(){ try{ kb.focus({preventScroll:true,focusVisible:true}); }catch(err){} }
    axisDrag(svg,function(){ return [W,H]; },function(){ return L.A; },function(){ return [ax.a.xs(path[0]),ax.a.ys(0)]; },
      function(px){ var k=ax.a.xs.inv(px); setQ(clamp(k,0,X)/st.ks); update(); }, null);
    /* the Try it steps read the parameters, k*, the slope at k*, and the first steps of the path (also as shares of k*) */
    api=NF.api({
      get:function(){ return st; },
      set:function(o){
        if('alpha' in o && ra) ra.set(+o.alpha);
        if('beta' in o && rb) rb.set(+o.beta);
        if('sigma' in o && rs) rs.set(+o.sigma);
        if('q' in o){ setQ(+o.q); update(); }
      }
    });
    update();
    watch(svg,update);
    return api;
  });

  /* ---------- 3. Multiple steady states: CES production, log utility (slides 33 to 35) ---------- */
  NF.register('ma2-multi',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* capital weight a = 1/3 and beta = 1, so the young save half the wage */
    var a=1/3, sv=0.5, ps=0.5, A=3, k0=0.2, T=8, X=1.6, W=520, H=400, L, ax, kb, api, st={}, path=[], ss=[];
    var rp=range(fig,'psi',2,function(v){ ps=v; update(); }), ra=range(fig,'tfp',2,function(v){ A=v; update(); });
    if(rp) ps=rp.v();
    if(ra) A=ra.v();
    function wage(k){
      if(k<=0) return ps>1+1e-9?A*Math.pow(1-a,ps/(ps-1)):0;
      if(Math.abs(ps-1)<1e-9) return A*(1-a)*Math.pow(k,a);
      var rho=(ps-1)/ps;
      return A*(1-a)*Math.pow(a*Math.pow(k,rho)+1-a,(1-rho)/rho);
    }
    function g(k){ return sv*wage(k); }
    function slope(k){ var h=Math.max(1e-7,k*1e-5); return (g(k+h)-g(Math.max(0,k-h)))/(k+h-Math.max(0,k-h)); }
    /* every crossing of the 45 degree line on (0, 4]: sign changes on a fine log grid, then halving */
    function steadies(){
      var out=[], n=3000, lo=1e-7, hi=4, i, k1, k2, f1, f2;
      k1=lo; f1=g(k1)-k1;
      for(i=1;i<=n;i++){
        k2=lo*Math.pow(hi/lo,i/n); f2=g(k2)-k2;
        if((f1>0)!==(f2>0)) out.push(bisect(function(k){ return g(k)-k; },k1,k2,80));
        k1=k2; f1=f2;
      }
      return out;
    }
    function dest(k){ var i; for(i=0;i<600;i++){ k=g(k); if(k<1e-9) return 0; } return k; }
    function update(){
      var i;
      ss=steadies();
      /* room for the highest steady state, with the low ones still large enough to follow the staircase */
      X=ss.length?Math.max(1.2,niceMax(1.2*ss[ss.length-1])):1.2;
      k0=clamp(k0,0.01,X);
      path=[k0];
      for(i=0;i<T;i++) path.push(g(path[i]));
      draw();
    }
    function draw(){
      var a2, b, p=[], i, k, sl, end=dest(k0), zero=g(0)<1e-12, kx, desc=[], kl, kh;
      W=measure(svg); L=lomLayout(W); H=L.H; frame(svg,W,H);
      ax=lomAxes(svg,L,X,T); a2=ax.a; b=ax.b;
      S('path',{d:curve(a2,g,X,160),'class':'nf-line'},a2.gc);
      S('path',{d:stair(a2,path),'class':'ma2-stair'},a2.gc);
      if(zero) desc.push(ps<1-1e-9?'0 stable':'0 unstable');
      for(i=0;i<ss.length;i++){
        k=ss[i]; sl=slope(k);
        S('circle',{cx:R(a2.xs(k)),cy:R(a2.ys(k)),r:4.5,'class':sl<1?'nf-dot':'ma2-un'},a2.gc);
        line(b.gc,b.xs(0),C(b.ys(k)),b.xs(T),C(b.ys(k)),sl<1?'nf-mean0':'ma2-unl');
        desc.push(fk(k)+(sl<1?' stable':' unstable')+' (g′ = '+sl.toFixed(2)+')');
      }
      if(zero) S('circle',{cx:R(a2.xs(0)),cy:R(a2.ys(0)),r:4.5,'class':ps<1-1e-9?'nf-dot':'ma2-un'},a2.gc);
      for(i=0;i<path.length;i++) p.push([b.xs(i),b.ys(Math.min(path[i],1.2*X))]);
      S('path',{d:poly(p),'class':'ma2-path'},b.gc);
      for(i=0;i<path.length;i++) S('circle',{cx:R(p[i][0]),cy:R(p[i][1]),r:3.2,'class':'ma2-pt'},b.gc);
      /* the curve ends just under the 45 degree line, so its name goes below it, clear of the 45 degree label */
      text(svg,a2.xs(0.97*X),a2.ys(Math.min(g(0.97*X),0.97*X))+18,'g(k)','nf-c1 nf-halo','end');
      kb=knob(svg,'Starting capital k0, arrow keys move it',function(dd){ k0=clamp(Math.round((k0+dd*0.01)*100)/100,0.01,X); update(); try{ kb.focus({preventScroll:true}); }catch(err){} });
      kx=a2.xs(k0);
      place(kb,kx,a2.ys(0),k0,'k0 = '+k0.toFixed(2));
      lab(svg,kx,a2.ys(0)-13,'k','0','nf-lab nf-halo ma2-k0','middle');
      kl=ss.length?ss[0]:0; kh=ss.length?ss[ss.length-1]:0;
      st={psi:ps, tfp:A, nss:ss.length, kl:kl, kh:kh, sl:ss.length?slope(kl):0, sh:ss.length?slope(kh):0, k0:k0, dest:end,
        collapse:end<1e-6, zero:zero};
      if(out){
        out.textContent='steady states: '+(desc.length?desc.join(', '):'none')+'\n';
        out.appendChild(document.createTextNode('from k0 = '+k0.toFixed(2)+' capital '+(end<1e-6?'':(end>k0?'climbs to ':'falls to ')+fk(end))));
        if(end<1e-6) warn(out,'collapses to zero');
      }
      if(api) api.changed();
    }
    axisDrag(svg,function(){ return [W,H]; },function(){ return L.A; },function(){ return [ax.a.xs(k0),ax.a.ys(0)]; },
      function(px){ k0=clamp(Math.round(ax.a.xs.inv(px)*100)/100,0.01,X); update(); }, null);
    /* the Try it steps read psi, A, the number of positive steady states, the lowest and highest with their slopes,
       k0 and where it ends */
    api=NF.api({
      get:function(){ return st; },
      set:function(o){
        if('psi' in o && rp) rp.set(+o.psi);
        if('tfp' in o && ra) ra.set(+o.tfp);
        if('k0' in o){ k0=clamp(+o.k0,0.01,X); update(); }
      }
    });
    update();
    watch(svg,update);
    return api;
  });

  /* ---------- 4. The golden rule and dynamic inefficiency (slides 36 to 39) ---------- */
  NF.register('ma2-golden',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var al=0.3, be=0.5, W=520, H=360, api, st={}, TT=5;
    var ra=range(fig,'alpha',2,function(v){ al=v; update(); }), rb=range(fig,'beta',2,function(v){ be=v; update(); });
    if(ra) al=ra.v();
    if(rb) be=rb.v();
    function f(k){ return Math.pow(k,al); }
    function layout(){
      var mL=46, mR=22, top=26, gap=58, wa;
      if(W>=500){ wa=Math.round((W-mL-mR-gap)*0.58); return {A:{x:mL,y:top,w:wa,h:210}, B:{x:mL+wa+gap,y:top,w:W-mR-mL-wa-gap,h:210}, H:top+210+30}; }
      return {A:{x:mL,y:top,w:W-mL-mR,h:190}, B:{x:mL,y:top+190+58,w:W-mL-mR,h:118}, H:top+190+58+118+30};
    }
    function update(){
      var s=be*(1-al)/(1+be), ks=Math.pow(s,1/(1-al)), kg=Math.pow(al,1/(1-al)), fK=al*Math.pow(ks,al-1),
          cs=f(ks)-ks, cg=f(kg)-kg, c0=f(ks)-kg, d0=c0-cs, dl=cg-cs, L, a, b, X, Y, p=[], i, k, yt, m, bw, v, x, gr;
      gr=Math.abs(fK-1)<1e-9;
      W=measure(svg); L=layout(); H=L.H; frame(svg,W,H);
      X=niceMax(1.5*Math.max(ks,kg)); Y=niceMax(1.18*cg);
      a=panel(svg,L.A,[0,X],[0,Y],ticks(X,W<420?3:4),ticks(Y,3));
      /* right of the golden rule capital is too high: shade it */
      S('rect',{x:R(a.xs(kg)),y:L.A.y,width:R(Math.max(0,a.xs(X)-a.xs(kg))),height:L.A.h,'class':'ma2-ineff'},a.gc);
      text(a.gc,a.xs(X)-4,L.A.y+L.A.h-8,'too much capital','ma2-ilab','end');
      for(i=0;i<=160;i++){ k=X*i/160; p.push([a.xs(k),a.ys(f(k)-k)]); }
      S('path',{d:poly(p),'class':'nf-line'},a.gc);
      line(a.g,C(a.xs(kg)),L.A.y,C(a.xs(kg)),L.A.y+L.A.h,'ma2-gr');
      line(a.g,C(a.xs(ks)),a.ys(cs),C(a.xs(ks)),L.A.y+L.A.h,'nf-guide');
      S('circle',{cx:R(a.xs(kg)),cy:R(a.ys(cg)),r:4,'class':'ma2-grdot'},a.gc);
      S('circle',{cx:R(a.xs(ks)),cy:R(a.ys(cs)),r:4.5,'class':'nf-dot'},a.gc);
      lab(svg,a.xs(kg)+(ks<kg?5:-5),L.A.y+12,'K','GR','ma2-grlab nf-halo',ks<kg?'start':'end');
      text(svg,a.xs(ks)+(ks<kg?-5:5),a.ys(cs)-9,'K*','nf-lab nf-halo',ks<kg?'end':'start');
      text(svg,L.A.x+2,L.A.y-10,'steady state C = f(K) − K','nf-title');
      text(svg,L.A.x+L.A.w+5,L.A.y+L.A.h+4,'K','nf-title');
      /* the planner moves K from K* to K_GR at t = 0: C_0 = f(K*) - K_GR, then f(K_GR) - K_GR forever */
      m=niceMax(Math.max(Math.abs(d0),Math.abs(dl),0.005)*1.12);
      yt=[-m,0,m];
      b=panel(svg,L.B,[-0.5,TT+0.5],[-m,m],[],yt);
      bw=Math.min(26,L.B.w/(TT+1)*0.56);
      for(i=0;i<=TT;i++){
        v=i?dl:d0; x=b.xs(i);
        S('rect',{x:R(x-bw/2),y:R(Math.min(b.ys(v),b.ys(0))),width:R(bw),height:R(Math.max(1,Math.abs(b.ys(v)-b.ys(0)))),'class':i?'ma2-bar':'ma2-bar0'},b.gc);
        text(b.g,x,L.B.y+L.B.h+16,String(i),null,'middle');
      }
      lab(svg,L.B.x+2,L.B.y-10,'C − C* when K moves to K','GR','nf-title');
      text(svg,L.B.x+L.B.w+5,L.B.y+L.B.h+4,'t','nf-title');
      st={alpha:al, beta:be, ks:ks, kgr:kg, fk:fK, cs:cs, cgr:cg, c0:c0, d0:d0, dl:dl, ineff:fK<1-1e-9, gr:gr,
        pareto:d0>=-1e-12 && dl>=-1e-12, thr:be/(1+2*be)};
      if(out){
        out.textContent='K* = '+fk(ks)+'   K_GR = '+fk(kg)+'   f_K(K*) = '+fK.toFixed(2)+
          (gr?' = 1: the golden rule':fK>1?' > 1: too little capital, dynamically efficient':' < 1: too much capital, dynamically inefficient')+'\n'+
          'move to K_GR: C_0 = '+c0.toFixed(3)+' ('+(d0>=0?'+':'')+fmt(d0,3)+'), every later C = '+cg.toFixed(3)+' ('+(dl>=0?'+':'')+fmt(dl,3)+')';
      }
      if(api) api.changed();
    }
    /* the Try it steps read alpha, beta, K*, K_GR, f_K(K*), the consumption gains at t = 0 and later, and flags */
    api=NF.api({
      get:function(){ return st; },
      set:function(o){ if('alpha' in o && ra) ra.set(+o.alpha); if('beta' in o && rb) rb.set(+o.beta); }
    });
    update();
    watch(svg,update);
    return api;
  });

  /* ---------- 5. Pensions: fully funded against pay as you go (slides 41 to 52) ---------- */
  NF.register('ma2-pension',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* delta = 0, f(k) = k^alpha, log utility, n = 0; private saving cannot be negative */
    var al=0.3, be=0.5, d=0.05, T=8, X=0.2, W=520, H=400, api, st={};
    var sv=be/(1+be), k0s=Math.pow(sv*(1-al),1/(1-al));
    var sys=seg(fig,'data-sys',function(v){ if(v===sys) return; sys=v; update(); });
    if(sys!=='ff' && sys!=='payg') sys='none';
    var rd=range(fig,'d',3,function(v){ d=v; update(); });
    if(rd) d=rd.v();
    function wage(k){ return (1-al)*Math.pow(k,al); }
    /* tomorrow's capital, or -1 where the young cannot even pay d */
    function g(k){
      var w=wage(k), rhs;
      if(sys==='none') return sv*w;
      if(w<d) return -1;
      if(sys==='ff') return Math.max(sv*w,d);
      /* PAYG: (1 + beta) k' + d/(1 + r') = beta (w - d), with r' = alpha k'^(alpha - 1) tomorrow's return */
      rhs=be*(w-d);
      if(rhs<=0) return 0;
      return bisect(function(k1){ return (1+be)*k1+d/(1+al*Math.pow(k1,al-1))-rhs; },0,rhs/(1+be),70);
    }
    function steady(){
      var k, kp, i;
      if(sys==='none') return k0s;
      if(sys==='ff') return Math.max(k0s,d);
      /* the high crossing lies below k0s: walk down until g(k) > k, then halve */
      if(d<=0) return k0s;
      kp=k0s;
      for(i=1;i<=400;i++){
        k=k0s*Math.pow(1e-4,i/400);
        if(g(k)<0) return 0;
        if(g(k)>k) return bisect(function(x){ return g(x)-x; },k,kp,70);
        kp=k;
      }
      return 0;
    }
    function util(c1,c2){ return Math.log(c1)+be*Math.log(c2); }
    function welfare(ks){
      var w=wage(ks), r=al*Math.pow(ks,al-1), w0=wage(k0s), r0=al*Math.pow(k0s,al-1), U0=util(w0-k0s,(1+r0)*k0s), sp, U;
      if(sys==='none') return {s:k0s, lam:0};
      if(sys==='ff'){ sp=Math.max(sv*w-d,0); U=util(w-sp-d,(1+r)*(sp+d)); }
      else { sp=ks; U=util(w-sp-d,(1+r)*sp+d); }
      return {s:sp, lam:100*(Math.exp((U-U0)/(1+be))-1)};
    }
    function lomCurve(a){
      var p=[], segs='', i, k, v;
      for(i=0;i<=200;i++){
        k=X*i/200; v=k>0?g(k):-1;
        if(v<0 && k>0){ if(p.length>1) segs+=poly(p); p=[]; continue; }
        p.push([a.xs(k),a.ys(Math.max(0,v))]);
      }
      if(p.length>1) segs+=poly(p);
      return segs;
    }
    function update(){
      var ks=steady(), ok=ks>1e-9, L, ax, a, b, p=[], i, path=[k0s], wf, base=[], rsys=sys, kk, chg;
      for(i=0;i<T;i++){ kk=g(path[i]); if(kk<0){ break; } path.push(kk); }
      W=measure(svg); L=lomLayout(W); H=L.H; frame(svg,W,H);
      ax=lomAxes(svg,L,X,T); a=ax.a; b=ax.b;
      /* the no pension law of motion stays as a faint reference */
      for(i=0;i<=120;i++){ kk=X*i/120; base.push([a.xs(kk),a.ys(sv*wage(kk))]); }
      if(sys!=='none') S('path',{d:poly(base),'class':'ma2-base'},a.gc);
      S('path',{d:lomCurve(a),'class':'nf-line'},a.gc);
      S('circle',{cx:R(a.xs(k0s)),cy:R(a.ys(k0s)),r:4,'class':'ma2-old'},a.gc);
      if(ok) S('circle',{cx:R(a.xs(ks)),cy:R(a.ys(ks)),r:4.5,'class':sys==='none'?'nf-dot':'ma2-new'},a.gc);
      line(b.gc,b.xs(0),C(b.ys(k0s)),b.xs(T),C(b.ys(k0s)),'nf-mean0');
      /* the two labels sit on the sides of their lines that face away from each other */
      text(svg,b.xs(T)-2,b.ys(k0s)+(ok && ks>k0s+1e-9?14:-6),'no pension k*','nf-lab nf-halo','end');
      if(ok && Math.abs(ks-k0s)>1e-9){
        line(b.gc,b.xs(0),C(b.ys(ks)),b.xs(T),C(b.ys(ks)),'ma2-newl');
        text(svg,b.xs(T)-2,b.ys(ks)+(ks<k0s?14:-6),'new k*','ma2-nlab nf-halo','end');
      }
      for(i=0;i<path.length;i++) p.push([b.xs(i),b.ys(path[i])]);
      S('path',{d:poly(p),'class':'ma2-path'},b.gc);
      for(i=0;i<path.length;i++) S('circle',{cx:R(p[i][0]),cy:R(p[i][1]),r:3.2,'class':'ma2-pt'},b.gc);
      text(svg,a.xs(0.97*X),a.ys(Math.max(0,Math.min(g(0.97*X),0.97*X)))-8,'g(k)','nf-c1 nf-halo','end');
      wf=ok?welfare(ks):{s:0, lam:NaN};
      chg=ok?100*(ks/k0s-1):-100;
      st={sys:sys, d:d, k0s:k0s, ks:ks, chg:chg, s:wf.s, lam:wf.lam, ok:ok, k1:path.length>1?path[1]:0,
        forced:sys==='ff' && d>k0s+1e-12, neutral:sys!=='payg' && Math.abs(chg)<1e-9, rs:ok?al*Math.pow(ks,al-1):0, first:sys==='payg'?d:0};
      if(out){
        out.textContent='no pension: k* = '+fk(k0s)+', private saving '+fk(k0s)+'\n';
        if(sys==='none'){ out.appendChild(document.createTextNode('pick a pension system to compare')); }
        else if(!ok){ warn(out,'d = '+d.toFixed(3)+' is too large: no steady state, capital runs down until the young cannot pay d'); }
        else {
          out.appendChild(document.createTextNode((sys==='ff'?'fully funded':'pay as you go')+', d = '+d.toFixed(3)+': k* = '+fk(ks)+' ('+pct(chg,1)+'), private saving '+fk(wf.s)+
            (st.forced?' (forced: households want to save less)':'')+'\n'+
            'steady state generations: '+pct(wf.lam,1)+' of consumption'+(sys==='payg'?'; first old: +'+d.toFixed(3)+' for nothing; r* = '+st.rs.toFixed(2)+' against a pension return of 0':'')));
        }
      }
      if(api) api.changed();
    }
    /* the Try it steps read the system, d, both steady states, the change in percent, private saving, the welfare
       change in percent of consumption, and flags for a forced fund and for neutrality */
    api=NF.api({
      get:function(){ return st; },
      set:function(o){ if('sys' in o) press(fig,'data-sys',String(o.sys)); if('d' in o && rd) rd.set(+o.d); }
    });
    update();
    watch(svg,update);
    return api;
  });
})();
