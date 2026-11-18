/* L10 figures: OLS against 2SLS under endogeneity, and what a weak instrument does.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/l10.css.
   Design: yᵢ = β₁ + β₂xᵢ + uᵢ with β₁ = 1, β₂ = 0.5, first stage xᵢ = δ + θzᵢ + rᵢ with δ = 0, and z, u, r standard normal,
   Corr(u, r) = ρ, z independent of (u, r). So σ² = σ_z² = σ_r² = 1, Cov(x, u) = ρ and Var(x) = θ² + 1. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch,
      range=NF.range, phi=NF.phi, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip;

  /* ---------- shared ---------- */
  var B2=0.5, REPS=4000, Z975=1.959963984540054, TWO_PI=6.283185307179586;
  /* a slider that steps through a list of values; the label shows the value, not the index */
  function steps(fig,k,vals,cb){
    var inp=fig.querySelector('input[data-k="'+k+'"]'), val, hi=vals.length-1;
    if(!inp) return null;
    val=inp.parentNode.querySelector('.nfig-val');
    inp.min='0'; inp.max=String(hi); inp.step='1';
    function show(i){
      inp.value=String(i);
      inp.style.setProperty('--p',(i/hi*100).toFixed(1)+'%');
      if(val) val.textContent=String(vals[i]);
      inp.setAttribute('aria-valuetext','N = '+vals[i]);
    }
    inp.addEventListener('input',function(){ var i=Math.round(+inp.value); show(i); cb(vals[i],i); });
    show(clamp(Math.round(+inp.value),0,hi));
    return {el:inp, i:function(){ return Math.round(+inp.value); }, show:show};
  }
  function nearest(vals,v){ var i, b=0; for(i=1;i<vals.length;i++) if(Math.abs(vals[i]-v)<Math.abs(vals[b]-v)) b=i; return b; }
  function rd(v,d){ var p=Math.pow(10,d); return Math.round(v*p)/p; }
  /* the smallest of these steps times a power of ten that reaches x */
  function niceUp(x){ var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p, s=[1,1.5,2,3,4,5,6,8,10], i; for(i=0;i<s.length;i++) if(m<=s[i]+1e-9) return s[i]*p; return 10*p; }
  function nice125(x){ var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p; return (m>=5?5:m>=2?2:1)*p; }
  /* quantile of a sorted array, linear interpolation between order statistics */
  function quant(s,p){ var h=(s.length-1)*p, i=Math.floor(h); return i+1<s.length?s[i]+(h-i)*(s[i+1]-s[i]):s[i]; }
  /* background work in short slices, started once the figure is near the screen; next() returns false when nothing is left */
  function warmer(fig,next){
    var t=0, seen=false;
    function tick(){ t=0; if(next()) t=setTimeout(tick,16); }
    function kick(){ if(seen && !t) t=setTimeout(tick,60); }
    if(window.IntersectionObserver){
      new IntersectionObserver(function(en){ for(var i=0;i<en.length;i++) if(en[i].isIntersecting){ seen=true; kick(); } },{rootMargin:'300px'}).observe(fig);
    } else { seen=true; }
    return kick;
  }

  /* ---------- 1. Sampling distributions of the OLS and the 2SLS slope ---------- */
  NF.register('l10-iv',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var NS=[20,50,100,200,500,1000,2000], NSUM=9, SEED=20261118, XLO=-0.75, XHI=1.75, PH=92;
    var ni=3, n=200, rho=0.6, th=0.5, news=0, moves=0, api=null, ST={}, SIM=null, CACHE={};
    var H=330, mL=36, mR=12, W=520, xs, el={}, G={};
    var rr=range(fig,'rho',2,function(v){ rho=rd(v,2); moves++; update(); });
    if(rr) rho=rd(rr.v(),2);
    var rp=range(fig,'pi',2,function(v){ th=rd(v,2); moves++; update(); });
    if(rp) th=rd(rp.v(),2);
    var rs=steps(fig,'n',NS,function(v,i){ n=v; ni=i; moves++; update(); });
    if(rs){ ni=rs.i(); n=NS[ni]; }
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ news++; SIM=null; CACHE={}; update(); });

    /* One simulation serves every ρ and θ. REPS samples grow from one N on the slider to the next. Each observation draws
       independent standard normals z, r, e, and the error is u = ρr + √(1 − ρ²)e. Each sample keeps nine sums: Σz, Σr, Σe, Σz²,
       Σr², Σe², Σzr, Σze, Σre. Because x = θz + r and u are linear in (z, r, e), these give every centred sum of squares and
       cross products of (z, x, u) at any ρ and θ. The draws run stop by stop, sample by sample, so slicing does not matter. */
    function sim(){
      if(SIM) return SIM;
      var rnd=mulberry32(SEED+104729*news), k=0, r=0, A=new Float64Array(NSUM*REPS), SN=[];
      function step(budget){
        var n0, n1, i, j, o, g, t, z, v, e, a=new Float64Array(NSUM);
        while(k<NS.length && budget>0){
          n0=k?NS[k-1]:0; n1=NS[k];
          for(;r<REPS && budget>0;r++){
            o=r*NSUM;
            for(j=0;j<NSUM;j++) a[j]=A[o+j];
            for(i=n0;i<n1;i++){
              g=Math.sqrt(-2*Math.log(1-rnd())); t=TWO_PI*rnd(); z=g*Math.cos(t); v=g*Math.sin(t);
              g=Math.sqrt(-2*Math.log(1-rnd())); t=TWO_PI*rnd(); e=g*Math.cos(t);
              a[0]+=z; a[1]+=v; a[2]+=e; a[3]+=z*z; a[4]+=v*v; a[5]+=e*e; a[6]+=z*v; a[7]+=z*e; a[8]+=v*e;
            }
            for(j=0;j<NSUM;j++) A[o+j]=a[j];
            budget-=n1-n0;
          }
          if(r>=REPS){ SN[k]=Float64Array.from(A); k++; r=0; }
        }
        return k<NS.length;
      }
      SIM={step:step, at:function(j){ while(!SN[j]) step(Infinity); return SN[j]; }, left:function(){ return k<NS.length; }};
      return SIM;
    }
    /* the Monte Carlo summary at endogeneity p, first stage coefficient q and stop k.
       OLS: β̂₂ − β₂ = S_xu ÷ S_xx. 2SLS with one instrument: β̂₂ − β₂ = S_zu ÷ S_zx (S are centred sums).
       Its standard error is √(σ̂²S_zz) ÷ |S_zx| with σ̂² = N⁻¹Σûᵢ², ûᵢ the residual at the 2SLS estimate.
       First stage F = θ̂²S_zz ÷ s_r² with s_r² the first stage residual variance on N − 2 degrees of freedom. */
    function stats(p,q,k){
      var id=Math.round(p*100)+'|'+Math.round(q*100)+'|'+k;
      if(CACHE[id]) return CACHE[id];
      var a=sim().at(k), N=NS[k], c=Math.sqrt(1-p*p), i, o, mz, mv, me, zz, vv, ee, zv, ze, ve, zu, zx, xx, xu, uu, bo, bi, s2, se, cov=0, offn=0,
          ols=new Float64Array(REPS), iv=new Float64Array(REPS), F=new Float64Array(REPS), so=0, so2=0, si=0, si2=0, sO, sI, sF;
      for(i=0;i<REPS;i++){
        o=i*NSUM; mz=a[o]/N; mv=a[o+1]/N; me=a[o+2]/N;
        zz=a[o+3]-N*mz*mz; vv=a[o+4]-N*mv*mv; ee=a[o+5]-N*me*me; zv=a[o+6]-N*mz*mv; ze=a[o+7]-N*mz*me; ve=a[o+8]-N*mv*me;
        zu=p*zv+c*ze; zx=q*zz+zv; xx=q*q*zz+2*q*zv+vv; xu=q*zu+p*vv+c*ve; uu=p*p*vv+2*p*c*ve+c*c*ee;
        bo=xu/xx; bi=zu/zx;
        s2=Math.max(uu-2*bi*xu+bi*bi*xx,0)/N; se=Math.sqrt(s2*zz)/Math.abs(zx);
        if(Math.abs(bi)<=Z975*se) cov++;
        if(B2+bi<XLO || B2+bi>XHI) offn++;
        ols[i]=bo; iv[i]=bi; F[i]=(zx*zx/zz)/((xx-zx*zx/zz)/(N-2));
        so+=bo; so2+=bo*bo; si+=bi; si2+=bi*bi;
      }
      sO=Float64Array.from(ols); sO.sort(); sI=Float64Array.from(iv); sI.sort(); sF=F; sF.sort();
      CACHE[id]={ols:ols, iv:iv, medols:quant(sO,0.5), sdols:Math.sqrt((so2-so*so/REPS)/(REPS-1)),
        mediv:quant(sI,0.5), iqriv:quant(sI,0.75)-quant(sI,0.25), sdiv:Math.sqrt((si2-si*si/REPS)/(REPS-1)),
        fstat:quant(sF,0.5), cover:100*cov/REPS, off:100*offn/REPS};
      return CACHE[id];
    }
    var kick=warmer(fig,function(){ var s=sim(); return s.left() && s.step(120000); });

    function panel(g,top,title){
      var bot=top+PH, i, t=[-0.5,0,0.5,1,1.5];
      for(i=0;i<t.length;i++) line(g,C(xs(t[i])),top,C(xs(t[i])),bot,'nf-grid');
      line(g,mL,C(top),W-mR,C(top),'nf-grid');
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,mL,top-7,title,'nf-title','start');
      text(g,mL-7,bot+4,'0',null,'end');
      return text(g,mL-7,top+4,'',null,'end');
    }
    function draw(){
      var g, i, rows, t=[-0.5,0,0.5,1,1.5];
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['rect','l10-ols nf-sw','OLS'],['rect','nf-hist nf-sw','2SLS'],['line','l10-true','β₂ = 0.5'],['line','l10-plim','plim of OLS'],['line','nf-ref','2SLS limit N(β₂, avar)']],mL,11,W-4);
      G.t1=16*rows+24; G.b1=G.t1+PH; G.t2=G.b1+30; G.b2=G.t2+PH; H=G.b2+42;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(XLO,XHI,mL,W-mR);
      g=S('g',null,svg);
      el.y1=panel(g,G.t1,'density of the OLS slope');
      el.y2=panel(g,G.t2,'density of the 2SLS slope');
      for(i=0;i<t.length;i++){ line(g,C(xs(t[i])),G.b2,C(xs(t[i])),G.b2+4,'nf-ax'); text(g,xs(t[i]),G.b2+17,tl(t[i]),null,'middle'); }
      text(g,(mL+W-mR)/2,G.b2+35,'slope estimate','nf-title','middle');
      el.c1=clip(svg,mL,G.t1,W-mR-mL,PH);
      el.c2=clip(svg,mL,G.t2,W-mR-mL,PH);
      el.a1=S('path',{'class':'l10-ols'},el.c1); el.e1=S('path',{'class':'l10-olsline'},el.c1);
      el.a2=S('path',{'class':'nf-hist'},el.c2); el.e2=S('path',{'class':'nf-histline'},el.c2);
      el.ref=S('path',{'class':'nf-ref'},el.c2);
      g=S('g',null,svg);
      line(g,C(xs(B2)),G.t1,C(xs(B2)),G.b1,'l10-true'); line(g,C(xs(B2)),G.t2,C(xs(B2)),G.b2,'l10-true');
      el.p1=line(g,0,G.t1,0,G.b1,'l10-plim'); el.p2=line(g,0,G.t2,0,G.b2,'l10-plim');
      el.m1=line(g,0,0,0,0,'l10-medols'); el.m2=line(g,0,0,0,0,'l10-mediv');
      update();
    }
    /* density histogram of B2 + b on the fixed axis; returns the tallest bar */
    function hist(b,bw){
      var nb=Math.round((XHI-XLO)/bw), c=new Float64Array(nb), i, j, mx=0;
      for(i=0;i<REPS;i++){ j=Math.floor((B2+b[i]-XLO)/bw); if(j>=0 && j<nb) c[j]++; }
      for(j=0;j<nb;j++){ c[j]/=REPS*bw; if(c[j]>mx) mx=c[j]; }
      return {c:c, bw:bw, max:mx};
    }
    /* step outline of a histogram; the edge skips empty bins so it never runs along the axis */
    function steps2(h,ys,area,edge){
      var b, d, tp=[], e='', run=null, y0=ys(0), nb=h.c.length, x0, x1;
      for(b=0;b<nb;b++){
        d=ys(h.c[b]); x0=xs(XLO+b*h.bw); x1=xs(XLO+(b+1)*h.bw);
        tp.push([x0,d],[x1,d]);
        if(h.c[b]>0){ if(!run) run=[[x0,y0]]; run.push([x0,d],[x1,d]); }
        if(run && (h.c[b]===0 || b===nb-1)){ run.push([run[run.length-1][0],y0]); e+=poly(run); run=null; }
      }
      area.setAttribute('d',poly([[xs(XLO),y0]].concat(tp,[[xs(XHI),y0]]))+'Z');
      edge.setAttribute('d',e);
    }
    /* three decimals below 100, whole numbers above; bigr is the same rounding as a number */
    function big(v){ return v<100?v.toFixed(3):v<1e5?String(Math.round(v)):'above 100000'; }
    function bigr(v){ return v<100?rd(v,3):Math.round(v); }
    function update(){
      var res=stats(rho,th,ni), rt=Math.sqrt(n), vx=th*th+1, plim=B2+rho/vx, asd=th>0?1/(th*rt):Infinity,
          aols=Math.sqrt((1-rho*rho/vx)/vx)/rt, h1, h2, y1, y2, m1, m2, i, x, p=[], lo, hi, pk;
      if(!el.a1) return;
      /* OLS */
      h1=hist(res.ols,clamp(nice125(aols/2.5),0.005,0.1));
      m1=niceUp(1.12*Math.max(h1.max,0.3989422804/aols));
      y1=lin(0,m1,G.b1,G.t1); steps2(h1,y1,el.a1,el.e1);
      /* 2SLS: the bin width follows the interquartile range, since the sd need not exist */
      h2=hist(res.iv,clamp(nice125(res.iqriv/1.349/2.5),0.005,0.1));
      pk=th>0?0.3989422804/asd:0;
      m2=niceUp(1.12*Math.max(h2.max,Math.min(pk,3*h2.max)));
      y2=lin(0,m2,G.b2,G.t2); steps2(h2,y2,el.a2,el.e2);
      if(th>0){
        lo=Math.max(XLO,B2-5*asd); hi=Math.min(XHI,B2+5*asd);
        for(i=0;i<=320;i++){ x=lo+(hi-lo)*i/320; p.push([xs(x),y2(phi((x-B2)/asd)/asd)]); }
        el.ref.setAttribute('d',poly(p));
      } else el.ref.setAttribute('d','');
      el.y1.textContent=tl(m1); el.y2.textContent=tl(m2);
      x=C(xs(plim)); setLine(el.p1,x,G.t1,x,G.b1); setLine(el.p2,x,G.t2,x,G.b2);
      x=xs(clamp(B2+res.medols,XLO,XHI)); setLine(el.m1,x,G.b1+2,x,G.b1+8);
      x=xs(clamp(B2+res.mediv,XLO,XHI)); setLine(el.m2,x,G.b2+2,x,G.b2+8);
      ST={r2:rd(th*th/vx,3), conc:rd(n*th*th,1), fstat:rd(res.fstat,1), plimols:rd(plim,3), medols:rd(B2+res.medols,3), sdols:rd(res.sdols,3),
          mediv:rd(B2+res.mediv,3), iqriv:bigr(res.iqriv), niqriv:bigr(res.iqriv/1.349), sdiv:bigr(res.sdiv), asdiv:th>0?bigr(asd):'∞',
          cover:rd(res.cover,1), off:rd(res.off,1)};
      if(out) out.textContent='ρ = '+rho.toFixed(2)+'   θ = '+th.toFixed(2)+'   N = '+n+
        '\nfirst stage R² '+ST.r2.toFixed(3)+'   Nθ² '+ST.conc.toFixed(1)+'   median F '+ST.fstat.toFixed(1)+
        '\nOLS    plim '+fmt(ST.plimols,3)+'   median '+fmt(ST.medols,3)+'   sd '+ST.sdols.toFixed(3)+
        '\n2SLS   median '+fmt(ST.mediv,3)+'   IQR '+big(res.iqriv)+'   sd '+big(res.sdiv)+
        '\n2SLS   asymptotic sd '+(th>0?big(asd):'∞')+'   IQR ÷ 1.349 '+big(res.iqriv/1.349)+
        '\n95% interval covers β₂ in '+ST.cover.toFixed(1)+'%   off the axis '+ST.off.toFixed(1)+'%';
      kick();
      if(api) api.changed();
    }
    /* get: rho (ρ = Corr(u, r)), pi and theta (the first stage coefficient θ, the same number under both names), n (sample
       size N), r2 (population first stage R² = θ² ÷ (θ² + 1)), conc (concentration parameter Nθ²σ_z² ÷ σ_r² = Nθ²), fstat
       (Monte Carlo median of the first stage F), plimols (β₂ + Cov(x, u) ÷ Var(x) = 0.5 + ρ ÷ (θ² + 1)), medols and sdols
       (Monte Carlo median and sd of the OLS slope), mediv, iqriv and sdiv (median, interquartile range and sd of the 2SLS
       slope), niqriv (IQR ÷ 1.349, the sd of a normal with that IQR), asdiv (asymptotic sd σ ÷ (θσ_z√N) = 1 ÷ (θ√N), the
       string ∞ at θ = 0), cover (percent of samples whose 95% interval β̂₂ ± 1.96 se covers β₂), off (percent of 2SLS slopes
       outside the plotted axis), news (New draws presses), moves (slider changes). Numbers are rounded as the readout shows
       them. set: rho, pi (or theta), n (snaps to the nearest stop), news. */
    api=NF.api({
      get:function(){ return {rho:rho, pi:th, theta:th, n:n, r2:ST.r2, conc:ST.conc, fstat:ST.fstat, plimols:ST.plimols, medols:ST.medols, sdols:ST.sdols,
        mediv:ST.mediv, iqriv:ST.iqriv, niqriv:ST.niqriv, sdiv:ST.sdiv, asdiv:ST.asdiv, cover:ST.cover, off:ST.off, news:news, moves:moves}; },
      set:function(st){
        var i, v;
        if('rho' in st && rr && isFinite(+st.rho) && rd(clamp(+st.rho,0,0.9),2)!==rho) rr.set(+st.rho);
        v='pi' in st?st.pi:st.theta;
        if(('pi' in st || 'theta' in st) && rp && isFinite(+v) && rd(clamp(+v,0,1),2)!==th) rp.set(+v);
        if('n' in st && isFinite(+st.n)){ i=nearest(NS,+st.n); if(i!==ni){ ni=i; n=NS[i]; moves++; if(rs) rs.show(i); update(); } }
        if('news' in st && nb) while(news<+st.news) nb.click();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();

/* L10 figure: two stage least squares on one sample, stage by stage.
   Registers with NF (assets/notes.js) and reuses its helpers. No third party code. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, line=NF.line, setLine=NF.setLine, at=NF.at,
      fmt=NF.fmt, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, yGrid=NF.yGrid, xGrid=NF.xGrid,
      seg=NF.seg, range=NF.range, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip;

  function gauss(rnd){ var a=1-rnd(), b=rnd(); return Math.sqrt(-2*Math.log(a))*Math.cos(6.283185307179586*b); }
  function dot(a,b){ var s=0, i; for(i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
  /* a readout line: _{2SLS} is a subscript, and a hatted Greek letter gets its hat from CSS,
     since the site font sets a combining circumflex beside a Greek letter instead of above it */
  function say(out,s){
    var re=/_\{([^}]*)\}|([βθγσ])̂/g, last=0, m, e;
    while(out.firstChild) out.removeChild(out.firstChild);
    while((m=re.exec(s))){
      if(m.index>last) out.appendChild(document.createTextNode(s.slice(last,m.index)));
      if(m[1]){ e=document.createElement('sub'); e.textContent=m[1]; }
      else { e=document.createElement('span'); e.className='l10-shat'; e.textContent=m[2]; }
      out.appendChild(e);
      last=re.lastIndex;
    }
    if(last<s.length) out.appendChild(document.createTextNode(s.slice(last)));
  }
  var SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
  /* a tiny gap such as 2.2 × 10⁻¹⁶ */
  function sci(d){
    d=Math.abs(d);
    if(d===0) return '0';
    var e=Math.floor(Math.log(d)/Math.LN10), m=d/Math.pow(10,e);
    if(m>=9.95){ m/=10; e++; }
    return m.toFixed(1)+' × 10'+String(e).split('').map(function(c){ return SUP[c]; }).join('');
  }
  function r2d(v){ return Math.round(v*100)/100; }
  function r3d(v){ return Math.round(v*1000)/1000; }

  /* ---------- 2SLS in four regressions on one sample ---------- */
  NF.register('l10-stages',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* y_i = x_i β + u_i, x_i = z_i θ + r_i, no intercepts as in the lecture's scalar case. N = 80, β = 1.
       z_i, r_i, e_i are independent N(0, 1) draws (in that order for each i) and u_i = ρ r_i + √(1 − ρ²) e_i,
       so Var(u) = Var(r) = 1, Corr(u, r) = E[x u] = ρ and E[z u] = 0. */
    var N=80, BETA=1, SEED=20261204, seed=SEED, sample=0, moves=0, rho=0.6, theta=0.8, api=null, raf=0, cur=null, i;
    var Z=new Float64Array(N), RR=new Float64Array(N), EE=new Float64Array(N);
    var V={z:Z, x:new Float64Array(N), y:new Float64Array(N), xh:new Float64Array(N)};
    /* horizontal and vertical variable of each regression */
    var MODES={yx:['x','y'], fs:['z','x'], rf:['z','y'], ss:['xh','y']};
    var NAME={x:'x', y:'y', z:'z', xh:'x̂'};
    var F={}, XR=4.5, YR=null, W=520, H=300, mL=36, mR=14, top=34, bot=272, xs, ys, E={};
    var rr=range(fig,'rho',2,function(v){ rho=v; moves++; refresh(); });
    var rt=range(fig,'pi',2,function(v){ theta=v; moves++; refresh(); });
    if(rr) rho=rr.v();
    if(rt) theta=rt.v();
    var mode=seg(fig,'data-mode',function(v){ if(!MODES[v]||v===mode) return; mode=v; moves++; show(true); });
    if(!MODES[mode]) mode='yx';
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; sample++; moves++; draws(); fit(); scales(); draw(); });

    function draws(){
      var rnd=mulberry32(seed);
      for(i=0;i<N;i++){ Z[i]=gauss(rnd); RR[i]=gauss(rnd); EE[i]=gauss(rnd); }
    }
    /* every number by its formula, regressions through the origin */
    function fit(){
      var s=Math.sqrt(1-rho*rho), zz, th, ga, b, sr=0, sw=0, xx, d;
      for(i=0;i<N;i++){ V.x[i]=theta*Z[i]+RR[i]; V.y[i]=BETA*V.x[i]+rho*RR[i]+s*EE[i]; }
      zz=dot(Z,Z);
      th=dot(Z,V.x)/zz;                         /* first stage  θ̂ = (Z′Z)⁻¹Z′X */
      ga=dot(Z,V.y)/zz;                         /* reduced form γ̂ = (Z′Z)⁻¹Z′y */
      for(i=0;i<N;i++) V.xh[i]=Z[i]*th;         /* X̂ = Zθ̂ */
      xx=dot(V.xh,V.xh);
      b=dot(V.xh,V.y)/xx;                       /* second stage β̂2SLS = (X̂′X̂)⁻¹X̂′y */
      for(i=0;i<N;i++){ d=V.y[i]-V.x[i]*b; sr+=d*d; d=V.y[i]-V.xh[i]*b; sw+=d*d; }
      F={ols:dot(V.x,V.y)/dot(V.x,V.x), th:th, ga:ga, ratio:ga/th, b:b, iv:dot(Z,V.y)/dot(Z,V.x),
         s2r:sr/N, s2w:sw/N, ser:Math.sqrt(sr/N/xx), sew:Math.sqrt(sw/N/xx)};
      /* fitted slope and population slope of each panel */
      F.fitb={yx:F.ols, fs:th, rf:ga, ss:b};
      F.popb={yx:BETA, fs:theta, rf:theta*BETA, ss:BETA};
    }
    /* one horizontal and one vertical scale for all four panels, so switching panels moves the points and not the axes */
    function scales(){
      var lo=Infinity, hi=-Infinity, r=0, sp, st, k, ST=[0.5,1,2,4,5,10], y, x;
      for(i=0;i<N;i++){
        lo=Math.min(lo,V.y[i],V.x[i]); hi=Math.max(hi,V.y[i],V.x[i]);
        r=Math.max(r,Math.abs(V.x[i]),Math.abs(Z[i]),Math.abs(V.xh[i]));
      }
      sp=hi-lo;
      for(k=0;k<ST.length;k++){ st=ST[k]; if(sp/st<=6) break; }
      y=[Math.floor(lo/st)*st,Math.ceil(hi/st)*st,st];
      /* a half integer keeps the last tick clear of the axis name */
      x=Math.max(2.5,Math.ceil(r-0.5)+0.5);
      if(YR && y[0]===YR[0] && y[1]===YR[1] && y[2]===YR[2] && x===XR) return false;
      YR=y; XR=x;
      return true;
    }
    function refresh(){
      fit();
      if(scales()) draw(); else show(false);
    }
    function draw(){
      var g, rows, ph, t=[], v, step, xt=[];
      W=measure(svg);
      cancelAnimationFrame(raf); cur=null;
      frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','l10-sfit','fitted line of this panel'],['line','l10-sref','population line']],mL+6,11,W-mR);
      top=rows>1?50:34;
      ph=clamp(Math.round((W-mL-mR)*0.5),200,236);
      H=top+ph+30; bot=top+ph;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(-XR,XR,mL,W-mR); ys=lin(YR[0],YR[1],bot,top);
      g=S('g',null,svg);
      step=(W-mL-mR)/(2*XR)>=30?1:2;
      for(v=-Math.floor(XR/step)*step;v<=XR;v+=step) xt.push(v);
      xGrid(g,xs,xt,top,bot,bot+17);
      for(v=0;v<xt.length;v++) line(g,C(xs(xt[v])),bot,C(xs(xt[v])),bot+4,'nf-ax');
      for(v=YR[0];v<=YR[1]+1e-9;v+=YR[2]) t.push(Math.round(v*100)/100);
      yGrid(g,ys,t,mL,W-mR);
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      E.yt=S('text',{'class':'nf-title',x:R(mL-7),y:R(top-12),'text-anchor':'end'},g);
      E.xt=S('text',{'class':'nf-title',x:R(W-3),y:R(bot+17),'text-anchor':'end'},g);
      E.gc=clip(svg,mL-4,top-4,W-mR-mL+8,bot-top+8);
      /* first stage residuals r̂ = x − x̂, drawn only on the first stage panel */
      E.res=S('g',{'class':'l10-sres'},E.gc);
      E.rs=[];
      for(i=0;i<N;i++) E.rs.push(line(E.res,0,0,0,0,'l10-sseg'));
      E.pts=[];
      for(i=0;i<N;i++) E.pts.push(S('circle',{r:W>=420?3.2:2.8,'class':'l10-spt'},E.gc));
      E.ref=line(E.gc,0,0,0,0,'l10-sref');
      E.fit=line(E.gc,0,0,0,0,'l10-sfit');
      show(false);
    }
    function ends(b){
      b=clamp(b,-1e4,1e4);
      return [xs(-XR),ys(-b*XR),xs(XR),ys(b*XR)];
    }
    function apply(st){
      for(i=0;i<N;i++) at(E.pts[i],st.P[i][0],st.P[i][1]);
      setLine(E.fit,st.f[0],st.f[1],st.f[2],st.f[3]);
      setLine(E.ref,st.r[0],st.r[1],st.r[2],st.r[3]);
      cur=st;
    }
    function residuals(on){
      if(on) for(i=0;i<N;i++) setLine(E.rs[i],xs(Z[i]),ys(V.xh[i]),xs(Z[i]),ys(V.x[i]));
      E.res.setAttribute('class',on?'l10-sres l10-son':'l10-sres');
    }
    function show(animate){
      var m=MODES[mode], h=V[m[0]], v=V[m[1]], st={P:[]};
      for(i=0;i<N;i++) st.P.push([xs(h[i]),ys(v[i])]);
      st.f=ends(F.fitb[mode]); st.r=ends(F.popb[mode]);
      E.yt.textContent=NAME[m[1]]; E.xt.textContent=NAME[m[0]];
      readout();
      if(api) api.changed();
      cancelAnimationFrame(raf);
      if(!animate || NF.reduce || !cur){ apply(st); residuals(mode==='fs'); return; }
      residuals(false);
      var from=cur, t0=0;
      function mix(a,b,e){ var r=[], k; for(k=0;k<a.length;k++) r.push(a[k]+(b[k]-a[k])*e); return r; }
      function step(ts){
        if(!t0) t0=ts;
        var k=Math.min(1,(ts-t0)/420), e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2, M={P:[]}, j;
        for(j=0;j<N;j++) M.P.push(mix(from.P[j],st.P[j],e));
        M.f=mix(from.f,st.f,e); M.r=mix(from.r,st.r,e);
        apply(M);
        if(k<1) raf=requestAnimationFrame(step);
        else residuals(mode==='fs');
      }
      raf=requestAnimationFrame(step);
    }
    function readout(){
      var s='OLS y on x  β̂ = '+fmt(F.ols,3)+'   first stage θ̂ = '+fmt(F.th,3)+'   reduced form γ̂ = '+fmt(F.ga,3)+'\n';
      s+='γ̂/θ̂ = '+fmt(F.ratio,3)+'   second stage β̂_{2SLS} = '+fmt(F.b,3)+', gap '+sci(F.b-F.ratio)+'   true β = '+BETA+'\n';
      s+='σ̂² = '+fmt(F.s2r,2)+' from y − xβ̂_{2SLS} (se '+fmt(F.ser,3)+')   not '+fmt(F.s2w,2)+' from y − x̂β̂_{2SLS} (se '+fmt(F.sew,3)+')   true σ² = 1';
      if(out) say(out,s);
    }
    /* Try it.
       get: mode (yx, fs, rf, ss), rho, pi (the first stage coefficient θ; theta is the same number), beta (fixed at 1),
            bols (slope of y on x), pihat (θ̂, slope of x on z; thetahat is the same number), gammahat (γ̂, slope of y on z),
            ratio (γ̂/θ̂), b2sls (slope of y on x̂), biv ((Z′X)⁻¹Z′y), gap (b2sls minus ratio, unrounded),
            match (b2sls equals ratio to 1e-9), bias (bols minus beta), plim (β + ρ/(θ² + 1), where OLS converges),
            s2right (mean squared y − x β̂2SLS), s2wrong (mean squared y − x̂ β̂2SLS), seright and sewrong (the standard
            errors √(σ̂²/X̂′X̂) built on each), sample (New sample presses), moves (button, slider and New sample changes);
            rounded as the readout shows them: slopes and standard errors to 3 decimals, s2right and s2wrong to 2.
       set: mode, rho, pi (or theta), sample (presses New sample until the count reaches it) */
    api=NF.api({
      get:function(){
        return {mode:mode, rho:rho, pi:theta, theta:theta, beta:BETA, bols:r3d(F.ols), pihat:r3d(F.th), thetahat:r3d(F.th), gammahat:r3d(F.ga),
          ratio:r3d(F.ratio), b2sls:r3d(F.b), biv:r3d(F.iv), gap:F.b-F.ratio, match:Math.abs(F.b-F.ratio)<1e-9*Math.max(1,Math.abs(F.ratio)),
          bias:r3d(F.ols-BETA), plim:r3d(BETA+rho/(theta*theta+1)), s2right:r2d(F.s2r), s2wrong:r2d(F.s2w), seright:r3d(F.ser), sewrong:r3d(F.sew),
          sample:sample, moves:moves};
      },
      set:function(st){
        var k=0;
        if('mode' in st && MODES[st.mode]) NF.press(fig,'data-mode',String(st.mode));
        if('rho' in st && rr) rr.set(st.rho);
        if('pi' in st && rt) rt.set(st.pi);
        if('theta' in st && rt) rt.set(st.theta);
        if('sample' in st && nb) while(sample<+st.sample && k++<20) nb.click();
      }
    });
    draws(); fit(); scales(); draw();
    watch(svg,function(){ draw(); });
    return api;
  });

  /* notes.js may have booted before this file loaded; start any L10 figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
