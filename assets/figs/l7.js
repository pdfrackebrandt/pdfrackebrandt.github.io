/* L7 figures: the large sample distribution of the OLS slope, and conventional against robust standard errors.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/l7.css.
   Both figures share one design: y = β₁ + β₂x + u with β₁ = 1, β₂ = 0.5, x ~ Exponential(1) and E[u²] = 1. For the slope,
   [Σx⁻¹ΩΣx⁻¹]₂₂ = E[(x − 1)²u²] ÷ Var(x)², which is σ² ÷ Var(x) = 1 when u is independent of x. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, seg=NF.seg,
      range=NF.range, phi=NF.phi, Phi=NF.Phi, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  var B1=1, B2=0.5, REPS=4000, Z975=1.959963984540054, TWO_PI=6.283185307179586;
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

  /* ---------- 1. Consistency and asymptotic normality of the slope ---------- */
  NF.register('l7-limit',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var NS=[5,10,20,50,100,200,500,1000,2000], ERR={skew:1,heavy:2,normal:3}, VIEW={raw:1,scaled:1}, SDLIM=1, SEED=20261111;
    var ni=2, n=20, news=0, moves=0, api=null, ST={}, SIMS={};
    var H=280, mL=36, mR=28, top=30, bot=232, W=520, xs, ys, el={};
    var err=seg(fig,'data-err',function(v){ if(!ERR[v]||v===err) return; err=v; moves++; update(); });
    if(!ERR[err]) err='skew';
    var view=seg(fig,'data-view',function(v){ if(!VIEW[v]||v===view) return; view=v; moves++; draw(); });
    if(!VIEW[view]) view='scaled';
    var rs=steps(fig,'n',NS,function(v,i){ n=v; ni=i; moves++; update(); });
    if(rs){ ni=rs.i(); n=NS[ni]; }
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ news++; SIMS={}; update(); });

    /* One simulation per error law: REPS samples that grow from one N on the slider to the next. Each sample keeps the sums
       of d = x − 1, d², u and du, so the slope error β̂₂ − β₂ = (Σdu − ΣdΣu/N) ÷ (Σd² − (Σd)²/N) costs nothing at each stop.
       The draws run stop by stop, sample by sample, so the result does not depend on how the work is sliced. */
    function sim(e){
      if(SIMS[e]) return SIMS[e];
      var rnd=mulberry32(SEED+7919*ERR[e]+104729*news), k=0, r=0, spare=0, has=false,
          sd=new Float64Array(REPS), sdd=new Float64Array(REPS), su=new Float64Array(REPS), sdu=new Float64Array(REPS), res=[];
      function z(){
        if(has){ has=false; return spare; }
        var a=Math.sqrt(-2*Math.log(1-rnd())), t=TWO_PI*rnd();
        spare=a*Math.sin(t); has=true;
        return a*Math.cos(t);
      }
      /* errors with mean 0 and variance 1: a centred Exponential(1); t with 3 degrees of freedom over √3; N(0, 1) */
      function draw1(){
        var a, b;
        if(e==='skew') return -Math.log(1-rnd())-1;
        if(e==='normal') return z();
        a=z(); b=z();
        return a/Math.sqrt(-2*Math.log(1-rnd())+b*b);          /* Z ÷ √(χ²₃/3) ÷ √3 */
      }
      function finish(){
        var N=NS[k], b=new Float64Array(REPS), i, m=0, v=0, q, srt, D=0, F, rt=Math.sqrt(N);
        for(i=0;i<REPS;i++){ b[i]=(sdu[i]-sd[i]*su[i]/N)/(sdd[i]-sd[i]*sd[i]/N); m+=b[i]; }
        m/=REPS;
        for(i=0;i<REPS;i++){ q=b[i]-m; v+=q*q; }
        v=Math.sqrt(v/(REPS-1));
        srt=Float64Array.from(b); srt.sort();
        /* Kolmogorov distance between the simulated cdf of √N(β̂₂ − β₂) and the limit cdf Φ(z ÷ limit sd) */
        for(i=0;i<REPS;i++){ F=Phi(rt*srt[i]/SDLIM); D=Math.max(D,(i+1)/REPS-F,F-i/REPS); }
        res[k]={b:b, mean:m, sd:v, dist:D};
      }
      /* advance by about budget observations; returns true while work is left */
      function step(budget){
        var n0, n1, i, d, u, a, b, c, g;
        while(k<NS.length && budget>0){
          n0=k?NS[k-1]:0; n1=NS[k];
          for(;r<REPS && budget>0;r++){
            a=sd[r]; b=sdd[r]; c=su[r]; g=sdu[r];
            for(i=n0;i<n1;i++){ d=-Math.log(1-rnd())-1; u=draw1(); a+=d; b+=d*d; c+=u; g+=d*u; }
            sd[r]=a; sdd[r]=b; su[r]=c; sdu[r]=g; budget-=n1-n0;
          }
          if(r>=REPS){ finish(); k++; r=0; }
        }
        return k<NS.length;
      }
      SIMS[e]={step:step, at:function(j){ while(!res[j]) step(Infinity); return res[j]; }, left:function(){ return k<NS.length; }};
      return SIMS[e];
    }
    /* background: finish the error law on show, then the other two */
    var kick=warmer(fig,function(){
      var e, s=sim(err);
      if(s.left()){ s.step(150000); return true; }
      for(e in ERR) if(sim(e).left()){ sim(e).step(150000); return true; }
      return false;
    });

    function draw(){
      var g, t, i, rows, items, raw=view==='raw';
      W=measure(svg); frame(svg,W,H);
      items=raw?[['rect','nf-hist nf-sw','4000 slopes β̂₂'],['line','nf-ref','N(β₂, avar(β̂₂))'],['line','l7-true','β₂ = 0.5']]
               :[['rect','nf-hist nf-sw','4000 draws of √N(β̂₂ − β₂)'],['line','nf-ref','limit N(0, 1)']];
      rows=key(S('g',null,svg),items,mL+30,11,W-4);
      top=rows>1?46:30; bot=top+202; H=bot+46;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=raw?lin(B2-1,B2+1,mL,W-mR):lin(-4,4,mL,W-mR);
      t=raw?[-0.5,0,0.5,1,1.5]:((W-mL-mR)>=360?[-4,-3,-2,-1,0,1,2,3,4]:[-4,-2,0,2,4]);
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        line(g,C(xs(t[i])),top,C(xs(t[i])),bot,'nf-grid'); line(g,C(xs(t[i])),bot,C(xs(t[i])),bot+4,'nf-ax');
        text(g,xs(t[i]),bot+17,tl(t[i]),null,'middle');
      }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,(mL+W-mR)/2,bot+35,raw?'β̂₂':'√N(β̂₂ − β₂)','nf-title','middle');
      text(g,mL-7,top-12,'density','nf-title','start').setAttribute('x',R(4));
      el.yg=S('g',null,svg);
      el.clip=clip(svg,mL,top-6,W-mR-mL,bot-top+6);
      el.area=S('path',{'class':'nf-hist'},el.clip);
      el.edge=S('path',{'class':'nf-histline'},el.clip);
      el.ref=S('path',{'class':'nf-ref'},el.clip);
      if(raw) line(el.clip,C(xs(B2)),top-6,C(xs(B2)),bot,'l7-true');
      update();
    }
    function update(){
      var res=sim(err).at(ni), raw=view==='raw', rt=Math.sqrt(n), se=SDLIM/rt, lo, hi, bw, nbins, c, i, b, v, ymax, yt, d, tp=[], edge='', run=null, y0, p=[], x,
          sc=raw?1:rt, off=raw?B2:0, s=raw?se:SDLIM, m=raw?B2:0;
      if(!el.area){ return; }
      if(raw){ lo=B2-1; hi=B2+1; bw=clamp(nice125(se/3),0.005,0.1); ymax=niceUp(1.3*0.3989422804/se); }
      else { lo=-4; hi=4; bw=0.2; ymax=0.6; }
      nbins=Math.round((hi-lo)/bw); c=new Float64Array(nbins);
      for(i=0;i<REPS;i++){ v=off+sc*res.b[i]; b=Math.floor((v-lo)/bw); if(b>=0 && b<nbins) c[b]++; }
      ys=lin(0,ymax,bot,top); y0=ys(0);
      while(el.yg.firstChild) el.yg.removeChild(el.yg.firstChild);
      yt=raw?[ymax/2,ymax]:[0.2,0.4,0.6];
      for(i=0;i<yt.length;i++){ line(el.yg,mL,C(ys(yt[i])),W-mR,C(ys(yt[i])),'nf-grid'); text(el.yg,mL-7,ys(yt[i])+4,tl(yt[i]),null,'end'); }
      text(el.yg,mL-7,y0+4,'0',null,'end');
      /* step outline of the density histogram; the edge skips empty bins so it never runs along the axis */
      for(b=0;b<nbins;b++){
        d=Math.min(c[b]/(REPS*bw),ymax*1.05);
        tp.push([xs(lo+b*bw),ys(d)],[xs(lo+(b+1)*bw),ys(d)]);
        if(c[b]>0){ if(!run) run=[[xs(lo+b*bw),y0]]; run.push([xs(lo+b*bw),ys(d)],[xs(lo+(b+1)*bw),ys(d)]); }
        if(run && (c[b]===0 || b===nbins-1)){ run.push([run[run.length-1][0],y0]); edge+=poly(run); run=null; }
      }
      el.area.setAttribute('d',poly([[xs(lo),y0]].concat(tp,[[xs(hi),y0]]))+'Z');
      el.edge.setAttribute('d',edge);
      /* the normal curve: N(β₂, avar(β̂₂)) with avar(β̂₂) = 1 ÷ N, or its √N scaling N(0, 1) */
      for(i=0;i<=320;i++){ x=Math.max(lo,m-5*s)+(Math.min(hi,m+5*s)-Math.max(lo,m-5*s))*i/320; p.push([xs(x),ys(phi((x-m)/s)/s)]); }
      el.ref.setAttribute('d',poly(p));
      ST={mean:rd(B2+res.mean,3), sd:rd(res.sd,3), sdscaled:rd(rt*res.sd,3), dist:rd(res.dist,3)};
      if(out) out.textContent='N = '+n+'   mean of β̂₂ '+fmt(ST.mean,3)+'   sd of β̂₂ '+ST.sd.toFixed(3)+
        '\nsd of √N(β̂₂ − β₂) '+ST.sdscaled.toFixed(3)+'   limit sd '+SDLIM.toFixed(3)+
        '\nsup distance to the limit cdf '+ST.dist.toFixed(3);
      kick();
      if(api) api.changed();
    }
    /* get: n (sample size N), err (skew, heavy, normal), view (raw, scaled), mean (Monte Carlo mean of β̂₂), sd (Monte Carlo sd
       of β̂₂), sdscaled (sd of √N(β̂₂ − β₂)), sdlimit (the limit sd, 1), dist (sup distance between the simulated cdf of
       √N(β̂₂ − β₂) and the limit cdf), news (New draws presses), moves (slider and button changes). Numbers are rounded as the
       readout shows them. set: n (snaps to the nearest stop), err, view, news. */
    api=NF.api({
      get:function(){ return {n:n, err:err, view:view, mean:ST.mean, sd:ST.sd, sdscaled:ST.sdscaled, sdlimit:SDLIM, dist:ST.dist, news:news, moves:moves}; },
      set:function(st){
        var i;
        if('err' in st && ERR[st.err]) NF.press(fig,'data-err',st.err);
        if('view' in st && VIEW[st.view]) NF.press(fig,'data-view',st.view);
        if('n' in st){ i=nearest(NS,+st.n); if(i!==ni){ ni=i; n=NS[i]; moves++; if(rs) rs.show(i); update(); } }
        if('news' in st && nb) while(news<+st.news) nb.click();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Conventional against robust standard errors under heteroskedasticity ---------- */
  NF.register('l7-robust',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var NS=[20,50,100,200,500,1000,2000], NMAX=2000, NSUM=21, SEED=20261113, XMAX=6, YLO=-4, YHI=9, BARMAX=3.2, REJMAX=60;
    var ni=3, n=200, het=0.5, news=0, moves=0, api=null, ST={}, SIM=null, CACHE={}, SX=new Float64Array(NMAX), SZ1=new Float64Array(NMAX), SZ2=new Float64Array(NMAX);
    var H=250, mL=36, W=520, el={}, xs, ys, G={};
    var rh=range(fig,'het',2,function(v){ het=Math.round(v*100)/100; moves++; update(); });
    if(rh) het=Math.round(rh.v()*100)/100;
    var rs=steps(fig,'n',NS,function(v,i){ n=v; ni=i; moves++; update(); });
    if(rs){ ni=rs.i(); n=NS[ni]; }
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ news++; sample(); update(); });
    /* Var(u | x) = σ²h(x) with σ² = 1 and h(x) = 1 − λ + λx²/2. E[x²] = 2, so E[h(x)] = 1 and E[u²] = 1 at every strength λ.
       The error is drawn as u = √(1 − λ)·z₁ + √(λ/2)·x·z₂ with z₁, z₂ independent N(0, 1): given x it is N(0, h(x)). */
    function sample(){
      var r=mulberry32(SEED+31*news), i, a, t;
      for(i=0;i<NMAX;i++){ SX[i]=-Math.log(1-r()); a=Math.sqrt(-2*Math.log(1-r())); t=TWO_PI*r(); SZ1[i]=a*Math.cos(t); SZ2[i]=a*Math.sin(t); }
    }
    /* One simulation serves every strength. REPS samples grow from one N on the slider to the next. With d = x − 1 and w = x·z₂
       each sample keeps 21 sums: Σdᵖ (p = 1..4), Σdᵖz₁ and Σdᵖw (p = 0..3), Σdᵖz₁², Σdᵖw² and Σdᵖz₁w (p = 0..2). Because u is
       linear in (z₁, w), these give Σdᵖu and Σdᵖu² at any λ, hence β̂₂, σ̂² = N⁻¹Σû² and the HC0 middle term Σ(xᵢ − x̄)²ûᵢ²,
       since ûᵢ = uᵢ − a − b·dᵢ with b = β̂₂ − β₂ and a = ū − b·d̄. */
    function sim(){
      if(SIM) return SIM;
      var rnd=mulberry32(SEED+1), k=0, r=0, A=new Float64Array(NSUM*REPS), SN=[];
      function step(budget){
        var n0, n1, i, j, o, x, d, dd, ddd, g, t, z, w, zz, ww, zw, a=new Float64Array(NSUM);
        while(k<NS.length && budget>0){
          n0=k?NS[k-1]:0; n1=NS[k];
          for(;r<REPS && budget>0;r++){
            o=r*NSUM;
            for(j=0;j<NSUM;j++) a[j]=A[o+j];
            for(i=n0;i<n1;i++){
              x=-Math.log(1-rnd()); g=Math.sqrt(-2*Math.log(1-rnd())); t=TWO_PI*rnd(); z=g*Math.cos(t); w=x*g*Math.sin(t);
              d=x-1; dd=d*d; ddd=dd*d; zz=z*z; ww=w*w; zw=z*w;
              a[0]+=d; a[1]+=dd; a[2]+=ddd; a[3]+=dd*dd;
              a[4]+=z; a[5]+=d*z; a[6]+=dd*z; a[7]+=ddd*z;
              a[8]+=w; a[9]+=d*w; a[10]+=dd*w; a[11]+=ddd*w;
              a[12]+=zz; a[13]+=d*zz; a[14]+=dd*zz;
              a[15]+=ww; a[16]+=d*ww; a[17]+=dd*ww;
              a[18]+=zw; a[19]+=d*zw; a[20]+=dd*zw;
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
    /* the Monte Carlo summary at strength lam and stop k */
    function stats(lam,k){
      var id=Math.round(lam*100)+'|'+k;
      if(CACHE[id]) return CACHE[id];
      var a=sim().at(k), N=NS[k], c1=Math.sqrt(1-lam), c2=Math.sqrt(lam/2), q1=1-lam, q2=lam/2, q3=2*c1*c2, i, o, m, sxx, b, a0, T0, T1, T2, meat, sec, ser,
          tb=0, tb2=0, tc=0, tr=0, rc=0, rr=0, d1, d2, d3, d4, u1, du, d2u, d3u, u2, du2, d2u2;
      for(i=0;i<REPS;i++){
        o=i*NSUM;
        d1=a[o]; d2=a[o+1]; d3=a[o+2]; d4=a[o+3];
        u1=c1*a[o+4]+c2*a[o+8]; du=c1*a[o+5]+c2*a[o+9]; d2u=c1*a[o+6]+c2*a[o+10]; d3u=c1*a[o+7]+c2*a[o+11];
        u2=q1*a[o+12]+q2*a[o+15]+q3*a[o+18]; du2=q1*a[o+13]+q2*a[o+16]+q3*a[o+19]; d2u2=q1*a[o+14]+q2*a[o+17]+q3*a[o+20];
        m=d1/N; sxx=d2-N*m*m; b=(du-m*u1)/sxx; a0=u1/N-b*m;
        T0=u2+a0*a0*N+b*b*d2-2*a0*u1-2*b*du+2*a0*b*d1;
        T1=du2+a0*a0*d1+b*b*d3-2*a0*du-2*b*d2u+2*a0*b*d2;
        T2=d2u2+a0*a0*d2+b*b*d4-2*a0*d2u-2*b*d3u+2*a0*b*d3;
        meat=T2-2*m*T1+m*m*T0;
        sec=Math.sqrt(T0/N/sxx); ser=Math.sqrt(Math.max(meat,0))/sxx;
        tb+=b; tb2+=b*b; tc+=sec; tr+=ser;
        if(Math.abs(b)>Z975*sec) rc++;
        if(Math.abs(b)>Z975*ser) rr++;
      }
      CACHE[id]={sd:Math.sqrt((tb2-tb*tb/REPS)/(REPS-1)), seconv:tc/REPS, serob:tr/REPS, rejconv:100*rc/REPS, rejrob:100*rr/REPS};
      return CACHE[id];
    }
    var kick=warmer(fig,function(){ var s=sim(); return s.left() && s.step(100000); });

    function draw(){
      var g, i, rows, side, pr, bx0, bx1, by, t, lw=86, vw=46;
      W=measure(svg); side=W>=480;
      frame(svg,W,H);
      pr=side?Math.round(W*0.5):W-8;
      rows=key(S('g',null,svg),[['line','nf-ols','OLS fit'],['line','l7-true','β₁ + β₂x'],['rect','l7-fan nf-sw','±1.96 sd(u | x)']],mL+6,11,side?W-8:pr);
      G.top=rows>1?46:30; G.bot=G.top+(side?190:170);
      xs=lin(0,XMAX,mL,pr); ys=lin(YLO,YHI,G.bot,G.top);
      g=S('g',null,svg);
      t=[0,2,4,6];
      for(i=0;i<t.length;i++){ line(g,C(xs(t[i])),G.top,C(xs(t[i])),G.bot,'nf-grid'); line(g,C(xs(t[i])),G.bot,C(xs(t[i])),G.bot+4,'nf-ax'); text(g,xs(t[i]),G.bot+17,tl(t[i]),null,'middle'); }
      t=[-4,0,4,8];
      for(i=0;i<t.length;i++){ line(g,mL,C(ys(t[i])),pr,C(ys(t[i])),'nf-grid'); text(g,mL-7,ys(t[i])+4,tl(t[i]),null,'end'); }
      line(g,mL,C(G.bot),pr,C(G.bot),'nf-ax');
      text(g,(mL+pr)/2,G.bot+33,'x','nf-title','middle');
      text(g,4,G.top-8,'y','nf-title','start');
      el.clip=clip(svg,mL,G.top,pr-mL,G.bot-G.top);
      el.fan=S('path',{'class':'l7-fan'},el.clip);
      el.pts=S('path',{'class':'l7-pts'},el.clip);
      el.tru=line(el.clip,xs(0),ys(B1),xs(XMAX),ys(B1+B2*XMAX),'l7-true');
      el.fit=line(el.clip,0,0,0,0,'nf-ols');
      /* the bars: beside the scatter on a wide figure, below it on a phone */
      bx0=side?pr+26:8; bx1=W-4; by=side?G.top+8:G.bot+58;
      G.bx=bx0+lw; G.bw=bx1-vw-G.bx;
      g=S('g',null,svg);
      text(g,bx0,by,'√N × sd and mean se of β̂₂','nf-title','start');
      el.bar=[]; el.val=[];
      [['true sd','l7-bsd'],['conventional','l7-bconv'],['robust','l7-brob']].forEach(function(it,j){
        var y=by+12+j*20;
        text(g,bx0,y+10,it[0],'nf-lab','start');
        S('rect',{x:R(G.bx),y:R(y),width:R(G.bw),height:12,'class':'nf-track'},g);
        el.bar.push(S('rect',{x:R(G.bx),y:R(y),width:0,height:12,'class':it[1]},g));
        el.val.push(text(g,G.bx,y+10,'','nf-lab','start'));
      });
      by+=98;
      text(g,bx0,by,'5% t test rejects the true H₀','nf-title','start');
      [['conventional','l7-bconv'],['robust','l7-brob']].forEach(function(it,j){
        var y=by+12+j*20;
        text(g,bx0,y+10,it[0],'nf-lab','start');
        S('rect',{x:R(G.bx),y:R(y),width:R(G.bw),height:12,'class':'nf-track'},g);
        el.bar.push(S('rect',{x:R(G.bx),y:R(y),width:0,height:12,'class':it[1]},g));
        el.val.push(text(g,G.bx,y+10,'','nf-lab','start'));
      });
      i=G.bx+G.bw*5/REJMAX;
      line(g,C(i),by+7,C(i),by+49,'l7-five');
      text(g,i,by+61,'5%',null,'middle');
      H=Math.max(G.bot+40,by+68);
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      update();
    }
    function update(){
      var lam=het, c1=Math.sqrt(1-lam), c2=Math.sqrt(lam/2), res=stats(lam,ni), rt=Math.sqrt(n), i, x, y, d='', p=[], q=[], s,
          sx=0, sy=0, sxx=0, sxy=0, m, my, b, a, e, ssr=0, meat=0, sec, ser, v, w, lim=Math.sqrt(1+6*lam);
      if(!el.pts) return;
      /* this sample: the first N of 2000 seeded draws, the same x, z₁ and z₂ at every strength */
      for(i=0;i<n;i++){ x=SX[i]; y=B1+B2*x+c1*SZ1[i]+c2*x*SZ2[i]; sx+=x; sy+=y; sxx+=x*x; sxy+=x*y; if(x<=XMAX && y>=YLO-0.5 && y<=YHI+0.5) d+='M'+R(xs(x))+','+R(ys(y))+'h0'; }
      m=sx/n; my=sy/n; sxx-=n*m*m; b=(sxy-n*m*my)/sxx; a=my-b*m;
      for(i=0;i<n;i++){ x=SX[i]; e=B1+B2*x+c1*SZ1[i]+c2*x*SZ2[i]-a-b*x; ssr+=e*e; meat+=(x-m)*(x-m)*e*e; }
      sec=Math.sqrt(ssr/n/sxx); ser=Math.sqrt(meat)/sxx;
      el.pts.setAttribute('d',d);
      setLine(el.fit,xs(0),ys(a),xs(XMAX),ys(a+b*XMAX));
      for(i=0;i<=60;i++){ x=XMAX*i/60; s=Z975*Math.sqrt(1-lam+lam*x*x/2); p.push([xs(x),ys(clamp(B1+B2*x+s,YLO-2,YHI+2))]); q.push([xs(x),ys(clamp(B1+B2*x-s,YLO-2,YHI+2))]); }
      el.fan.setAttribute('d',poly(p.concat(q.reverse()))+'Z');
      v=[rt*res.sd,rt*res.seconv,rt*res.serob];
      for(i=0;i<3;i++){
        w=G.bw*clamp(v[i]/BARMAX,0,1);
        el.bar[i].setAttribute('width',R(w)); el.val[i].setAttribute('x',R(G.bx+w+5)); el.val[i].textContent=v[i].toFixed(2);
      }
      v=[res.rejconv,res.rejrob];
      for(i=0;i<2;i++){
        w=G.bw*clamp(v[i]/REJMAX,0,1);
        el.bar[3+i].setAttribute('width',R(w)); el.val[3+i].setAttribute('x',R(G.bx+w+5)); el.val[3+i].textContent=v[i].toFixed(1)+'%';
      }
      ST={sd:rd(res.sd,4), seconv:rd(res.seconv,4), serob:rd(res.serob,4), rejconv:rd(res.rejconv,1), rejrob:rd(res.rejrob,1), ratio:rd(res.seconv/res.sd,2),
        limconv:1, limrob:rd(lim,3), b:rd(b,3), bconv:rd(sec,3), brob:rd(ser,3)};
      if(out) out.textContent='N = '+n+'   λ = '+lam.toFixed(2)+'   sd of β̂₂ '+ST.sd.toFixed(4)+
        '\nmean se: conventional '+ST.seconv.toFixed(4)+', robust '+ST.serob.toFixed(4)+
        '\n5% t test of the true H₀ rejects: conventional '+ST.rejconv.toFixed(1)+'%, robust '+ST.rejrob.toFixed(1)+'%'+
        '\nlimits of √N × se: conventional 1.000, robust √(1 + 6λ) = '+lim.toFixed(3)+
        '\nthis sample: β̂₂ = '+fmt(b,3)+', se '+sec.toFixed(3)+' conventional, '+ser.toFixed(3)+' robust';
      kick();
      if(api) api.changed();
    }
    /* get: n (sample size N), het (strength λ), sd (Monte Carlo sd of β̂₂), seconv (mean conventional se), serob (mean robust
       HC0 se), rejconv and rejrob (percent of samples in which the 5% asymptotic t test of the true H₀ rejects), ratio (seconv ÷ sd),
       limconv and limrob (limits of √N × se: 1 and √(1 + 6λ), the latter also the limit of √N × sd), b bconv brob (this
       sample's β̂₂ and its two standard errors), news (New sample presses), moves (slider changes). Numbers are rounded as the
       readout shows them. set: n (snaps to the nearest stop), het (0 to 1 in steps of 0.05), news. */
    api=NF.api({
      get:function(){ return {n:n, het:het, sd:ST.sd, seconv:ST.seconv, serob:ST.serob, rejconv:ST.rejconv, rejrob:ST.rejrob, ratio:ST.ratio,
        limconv:ST.limconv, limrob:ST.limrob, b:ST.b, bconv:ST.bconv, brob:ST.brob, news:news, moves:moves}; },
      set:function(st){
        var i;
        if('het' in st && rh && Math.abs(+st.het-het)>1e-9) rh.set(+st.het);
        if('n' in st){ i=nearest(NS,+st.n); if(i!==ni){ ni=i; n=NS[i]; moves++; if(rs) rs.show(i); update(); } }
        if('news' in st && nb) while(news<+st.news) nb.click();
      }
    });
    sample(); draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
