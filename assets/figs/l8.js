/* L8 figures: the delta method against the exact distribution, and OLS against GLS under heteroskedasticity.
   Each registers with NF (assets/notes.js) and reuses its helpers. No third party code. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, seg=NF.seg, range=NF.range,
      phi=NF.phi, Phi=NF.Phi, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function gauss(rnd){ var a=1-rnd(), b=rnd(); return Math.sqrt(-2*Math.log(a))*Math.cos(6.283185307179586*b); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function r2(v){ return Math.round(v*100)/100; }
  function r3(v){ return Math.round(v*1000)/1000; }
  function f2(v){ return NF.fmt(v,2); }
  function f3(v){ return NF.fmt(v,3); }
  /* a slider over a list of stops: the label shows the stop, the input holds its index */
  function steps(fig,k,vals,label,name,cb){
    var inp=fig.querySelector('input[data-k="'+k+'"]'), val, hi=vals.length-1;
    if(!inp) return null;
    val=inp.parentNode.querySelector('.nfig-val');
    inp.min='0'; inp.max=String(hi); inp.step='1';
    function show(i){
      var s=label(vals[i]);
      inp.value=String(i);
      inp.style.setProperty('--p',(i/hi*100).toFixed(1)+'%');
      if(val) val.textContent=s;
      inp.setAttribute('aria-valuetext',name+' = '+s);
    }
    inp.addEventListener('input',function(){ var i=clamp(Math.round(+inp.value),0,hi); show(i); cb(vals[i],i); });
    show(clamp(Math.round(+inp.value),0,hi));
    return {el:inp, i:function(){ return clamp(Math.round(+inp.value),0,hi); }, set:function(i){ i=clamp(i,0,hi); show(i); cb(vals[i],i); }};
  }
  /* a round tick step near v */
  function nice(v){
    var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)), m=v/p;
    return (m<1.5?1:m<3.5?2:m<7.5?5:10)*p;
  }

  /* ---------- 1. The delta method: √N(g(θ̂) − g(θ)) exactly, against N(0, g′(θ)²σ²) ---------- */
  NF.register('l8-delta',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var SIG=1, NS=[5,10,25,50,100,250,500,1000], XL=-1, XH=3, SQ2PI=2.5066282746310002;
    var G={
      sq:{f:function(x){ return x*x; }, d:function(x){ return 2*x; }, ylo:-0.6, yhi:6.6, yt:[0,2,4,6]},
      exp:{f:function(x){ return Math.exp(x); }, d:function(x){ return Math.exp(x); }, ylo:-0.8, yhi:9, yt:[0,2,4,6,8]},
      inv:{f:function(x){ return 1/x; }, d:function(x){ return -1/(x*x); }, ylo:-8, yhi:8, yt:[-8,-4,0,4,8]}
    };
    var theta=1, N=25, moves=0, api=null, st={}, E={};
    var W=520, H=420, mL=36, mR=28, top=30, bot=200, top2=262, bot2=382, xs, ys;
    var g=seg(fig,'data-g',function(v){ if(!G[v] || v===g) return; g=v; moves++; draw(); });
    if(!G[g]) g='sq';
    var rth=range(fig,'theta',2,function(v){ theta=r2(v); moves++; update(); });
    if(rth) theta=r2(rth.v());
    var rn=steps(fig,'n',NS,String,'N',function(v){ N=v; moves++; update(); });
    if(rn) N=NS[rn.i()];

    /* θ̂ ~ N(θ, σ²/N) exactly, so T = √N(g(θ̂) − g(θ)) has a closed form density and CDF by change of variables */
    function model(){
      var rt=Math.sqrt(N), th=theta, G0, gp, sdl, sde, dens, cdf, dist=null, hw, j, t, d, t0;
      if(g==='inv' && th===0) return {ok:false};
      G0=G[g].f(th); gp=G[g].d(th); sdl=Math.abs(gp)*SIG;
      function z(x){ return rt*(x-th)/SIG; }
      if(g==='sq'){
        dens=function(t){ var y=th*th+t/rt, r; if(y<=0) return 0; r=Math.sqrt(y); return (phi(z(r))+phi(z(-r)))/(2*r*SIG); };
        cdf=function(t){ var y=th*th+t/rt, r; if(y<=0) return 0; r=Math.sqrt(y); return Phi(z(r))-Phi(z(-r)); };
        sde=Math.sqrt(4*th*th*SIG*SIG+2*Math.pow(SIG,4)/N);
        t0=-rt*th*th;
      } else if(g==='exp'){
        dens=function(t){ var y=G0+t/rt; if(y<=0) return 0; return phi(z(Math.log(y)))/(y*SIG); };
        cdf=function(t){ var y=G0+t/rt; if(y<=0) return 0; return Phi(z(Math.log(y))); };
        d=SIG*SIG/N;
        sde=rt*G0*Math.sqrt(Math.exp(d)*(Math.exp(d)-1));
        t0=-rt*G0;
      } else {
        dens=function(t){ var y=G0+t/rt; if(y===0) return 0; return phi(z(1/y))/(y*y*SIG); };
        cdf=function(t){ var y=G0+t/rt, p0=Phi(z(0)); if(y===0) return p0; return y>0?p0+1-Phi(z(1/y)):p0-Phi(z(1/y)); };
        sde=Infinity;
        t0=-rt*G0;
      }
      /* Kolmogorov distance to the limit: both CDFs are continuous, and beyond ±8 limit sd the gap only shrinks */
      if(sdl>0){
        hw=8*sdl; dist=0;
        for(j=0;j<=6000;j++){ t=-hw+2*hw*j/6000; d=Math.abs(cdf(t)-Phi(t/sdl)); if(d>dist) dist=d; }
        if(t0>-hw && t0<hw){ d=Math.abs(cdf(t0)-Phi(t0/sdl)); if(d>dist) dist=d; }
      }
      return {ok:true, g0:G0, gp:gp, sdl:sdl, sde:sde, dens:dens, cdf:cdf, dist:dist, t0:t0, p0:Phi(z(0))};
    }
    /* where an interval [a, b] of θ̂ lands under g, as a list of intervals of g */
    function image(a,b){
      var f=G[g].f;
      if(g==='sq') return [[a<0 && b>0?0:Math.min(a*a,b*b),Math.max(a*a,b*b)]];
      if(g==='exp') return [[f(a),f(b)]];
      if(a<0 && b>0) return [[G[g].ylo-2,1/a],[1/b,G[g].yhi+2]];
      if(a===0) return [[1/b,G[g].yhi+2]];
      if(b===0) return [[G[g].ylo-2,1/a]];
      return [[1/b,1/a]];
    }
    function curve(){
      var o=G[g], p=[], q=[], j, x, m;
      if(g!=='inv'){ for(j=0;j<=200;j++){ x=XL+(XH-XL)*j/200; p.push([xs(x),ys(Math.min(o.f(x),o.yhi+3))]); } return poly(p); }
      m=1/(o.yhi+3);
      for(j=0;j<=140;j++){ x=m*Math.pow(XH/m,j/140); p.push([xs(x),ys(1/x)]); }
      for(j=0;j<=100;j++){ x=-m*Math.pow(-XL/m,j/100); q.push([xs(x),ys(1/x)]); }
      return poly(p)+poly(q);
    }
    function draw(){
      var o=G[g], a, j, x, y, rows, rows2, gc;
      W=measure(svg); frame(svg,W,H);
      a=S('g',null,svg);
      rows=key(a,[['line','nf-line','g(θ)'],['line','l8-tan','tangent at θ'],['rect','l8-dth l8-sw','density of θ̂, height rescaled']],mL,11,W-mR);
      top=rows*16+12; bot=top+172;
      xs=lin(XL,XH,mL,W-mR); ys=lin(o.ylo,o.yhi,bot,top);
      for(j=XL;j<=XH;j++){ x=C(xs(j)); line(a,x,top,x,bot,j===0?'nf-zero':'nf-grid'); line(a,x,bot,x,bot+4,'nf-ax'); text(a,xs(j),bot+17,tl(j),null,'middle'); }
      for(j=0;j<o.yt.length;j++){ y=C(ys(o.yt[j])); line(a,mL,y,W-mR,y,o.yt[j]===0?'nf-ax':'nf-grid'); text(a,mL-7,ys(o.yt[j])+4,tl(o.yt[j]),null,'end'); }
      line(a,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(a,W-3,bot+17,'θ̂','nf-title','end');
      gc=clip(svg,mL,top,W-mR-mL,bot-top);
      E.band=S('rect',{'class':'l8-band',y:R(top),height:R(bot-top)},gc);
      E.dth=S('path',{'class':'l8-dth'},gc);
      E.dthl=S('path',{'class':'l8-dthl'},gc);
      S('path',{'class':'nf-line',d:curve()},gc);
      E.tan=line(gc,0,0,0,0,'l8-tan');
      E.drop=line(gc,0,0,0,0,'nf-guide');
      E.dot=S('circle',{r:4,'class':'nf-dot'},gc);
      /* in the right margin: where the band lands under g (blue) and under the tangent (red) */
      gc=clip(svg,W-mR,top,mR,bot-top);
      E.bg=[line(gc,0,0,0,0,'l8-barg'),line(gc,0,0,0,0,'l8-barg')];
      E.bt=line(gc,0,0,0,0,'l8-bart');
      /* lower panel */
      a=S('g',null,svg);
      rows2=key(a,[['rect','l8-ex l8-sw2','exact density of √N(g(θ̂) − g(θ))'],['line','l8-lim','limit N(0, g′(θ)²σ²)']],mL,bot+46,W-mR);
      top2=bot+46+rows2*16-2; bot2=top2+122; H=bot2+26;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      line(a,mL,C(bot2),W-mR,C(bot2),'nf-ax');
      E.ticks=S('g',null,svg);
      gc=clip(svg,mL,top2,W-mR-mL,bot2-top2);
      E.ex=S('path',{'class':'l8-ex'},gc);
      E.exl=S('path',{'class':'l8-exl'},gc);
      E.lim=S('path',{'class':'l8-lim'},gc);
      E.spike=line(gc,0,0,0,0,'l8-lim l8-spike');
      E.msg=text(svg,0,0,'','nf-lab nf-halo','middle');
      update();
    }
    function update(){
      var o=G[g], m=model(), sd=SIG/Math.sqrt(N), p=[], q=[], j, x, v, lo, hi, im, hw, sc, ymax, x2, y2, stp, t, cap, s, gs, ds, es;
      /* upper panel: where θ̂ lands */
      lo=theta-1.96*sd; hi=theta+1.96*sd;
      E.band.setAttribute('x',R(xs(lo))); E.band.setAttribute('width',R(xs(hi)-xs(lo)));
      for(j=0;j<=80;j++){ v=-4+8*j/80; p.push([xs(theta+v*sd),bot-30*Math.exp(-0.5*v*v)]); }
      E.dthl.setAttribute('d',poly(p));
      E.dth.setAttribute('d',poly([[xs(theta-4*sd),bot]].concat(p,[[xs(theta+4*sd),bot]]))+'Z');
      im=image(lo,hi);
      for(j=0;j<2;j++){
        if(im[j]) setLine(E.bg[j],W-mR+7,ys(clamp(im[j][0],o.ylo-3,o.yhi+3)),W-mR+7,ys(clamp(im[j][1],o.ylo-3,o.yhi+3)));
        E.bg[j].setAttribute('class',im[j]?'l8-barg':'nf-hide');
      }
      if(m.ok){
        setLine(E.tan,xs(XL),ys(clamp(m.g0+m.gp*(XL-theta),-400,400)),xs(XH),ys(clamp(m.g0+m.gp*(XH-theta),-400,400)));
        if(Math.abs(m.gp)>60){ x=380/Math.abs(m.gp); setLine(E.tan,xs(theta-x),ys(m.g0-m.gp*x),xs(theta+x),ys(m.g0+m.gp*x)); }
        setLine(E.drop,xs(theta),bot,xs(theta),ys(clamp(m.g0,o.ylo-3,o.yhi+3)));
        v=1.96*m.sdl*sd;
        setLine(E.bt,W-mR+14,ys(clamp(m.g0-v,o.ylo-3,o.yhi+3)),W-mR+14,ys(clamp(m.g0+v,o.ylo-3,o.yhi+3)));
        at(E.dot,xs(theta),ys(clamp(m.g0,o.ylo-3,o.yhi+3)));
      }
      E.tan.setAttribute('class',m.ok?'l8-tan':'nf-hide');
      E.drop.setAttribute('class',m.ok?'nf-guide':'nf-hide');
      E.bt.setAttribute('class',m.ok && m.sdl>0?'l8-bart':'nf-hide');
      E.dot.setAttribute('class',m.ok?'nf-dot':'nf-hide');

      /* lower panel: T = √N(g(θ̂) − g(θ)) on a window set by θ and g only, so more N shows as convergence */
      while(E.ticks.firstChild) E.ticks.removeChild(E.ticks.firstChild);
      sc=m.ok?Math.max(m.sdl,0.4):0.4; hw=4*sc;
      ymax=Math.max(1.7/(SQ2PI*0.4),m.ok && m.sdl>0?1.15/(SQ2PI*m.sdl):0);
      if(m.ok && m.sdl>=0.4) ymax=1.7/(SQ2PI*m.sdl);
      x2=lin(-hw,hw,mL,W-mR); y2=lin(0,ymax,bot2,top2); cap=ymax*1.2;
      stp=nice(hw/2);
      for(t=-Math.floor(hw/stp)*stp;t<=hw+1e-9;t+=stp){
        x=C(x2(t));
        line(E.ticks,x,top2,x,bot2,Math.abs(t)<1e-9?'nf-zero':'nf-grid'); line(E.ticks,x,bot2,x,bot2+4,'nf-ax');
        text(E.ticks,x2(t),bot2+17,tl(Math.abs(t)<1e-9?0:t),null,'middle');
      }
      p=[]; q=[];
      if(m.ok){
        for(j=0;j<=400;j++){
          t=-hw+2*hw*j/400;
          /* the density of θ̂² starts at its lower end t0 with a 1/√ spike: begin the curve exactly there and sample the spike finely */
          if(g==='sq' && j>0 && m.t0>t-2*hw/400 && m.t0<=t){
            p.push([x2(m.t0),y2(0)]);
            for(v=0.01;v<1;v*=1.8) if(m.t0+v*2*hw/400<t) p.push([x2(m.t0+v*2*hw/400),y2(Math.min(m.dens(m.t0+v*2*hw/400),cap))]);
          }
          p.push([x2(t),y2(Math.min(m.dens(t),cap))]);
        }
        if(m.sdl>0) for(j=0;j<=300;j++){ t=-hw+2*hw*j/300; q.push([x2(t),y2(Math.min(phi(t/m.sdl)/m.sdl,cap))]); }
      }
      E.exl.setAttribute('d',p.length?poly(p):'');
      E.ex.setAttribute('d',p.length?poly([[x2(-hw),y2(0)]].concat(p,[[x2(hw),y2(0)]]))+'Z':'');
      E.lim.setAttribute('d',q.length?poly(q):'');
      if(m.ok && m.sdl===0) setLine(E.spike,x2(0),bot2,x2(0),top2+4); else setLine(E.spike,0,0,0,0);
      E.spike.setAttribute('class',m.ok && m.sdl===0?'l8-lim l8-spike':'nf-hide');
      if(!m.ok){ E.msg.textContent='1/θ is not defined at θ = 0'; E.msg.setAttribute('x',R((mL+W-mR)/2)); E.msg.setAttribute('y',R((top2+bot2)/2)); }
      else if(m.sdl===0){ E.msg.textContent='limit: all mass at 0'; E.msg.setAttribute('x',R(x2(-hw/2))); E.msg.setAttribute('y',R(top2+16)); }
      else E.msg.textContent='';

      gs=m.ok?r2(m.gp):'none'; ds=m.ok && m.dist!==null?r3(m.dist):'none';
      es=!m.ok?'none':isFinite(m.sde)?r3(m.sde):'inf';
      st={g:g, theta:theta, n:N, gprime:gs, sdlimit:m.ok?r3(m.sdl):'none', sdexact:es, dist:ds,
        fail:!m.ok || m.sdl===0, p0:m.ok?r3(m.p0):'none', moves:moves};
      if(api) api.changed();
      if(!out) return;
      if(!m.ok){
        out.textContent='g(θ) = 1/θ   θ = 0   N = '+N+'\n';
        warn(out,'g is not defined at θ = 0, so there is no g′(θ) and no delta method limit.\nθ̂ changes sign half the time and 1/θ̂ jumps between the two branches.');
        return;
      }
      s='g′(θ) = '+f2(m.gp)+'   limit sd |g′(θ)|σ = '+f3(m.sdl)+'   exact sd '+(isFinite(m.sde)?'= '+f3(m.sde):'does not exist');
      if(m.dist!==null) s+='\nlargest gap between the exact and the limit CDF = '+f3(m.dist);
      out.textContent=s;
      if(m.sdl===0) warn(out,'\ng′(θ) = 0: the limit N(0, 0) is a point at 0 and gives no standard error.\nHere N(g(θ̂) − g(θ)) = σ²χ²₁ exactly: the right rate is N, not √N.');
      else if(g==='inv' && m.p0>=0.0005) warn(out,'\n1/θ̂ has no variance at any N. θ̂ < 0 with probability '+f3(m.p0)+', and then 1/θ̂ lands on the other branch.');
      else if(g==='inv') out.appendChild(document.createTextNode('\n1/θ̂ has no variance at any N, yet its distribution settles on the limit.'));
      else if(m.dist>=0.02) out.appendChild(document.createTextNode('\ng still bends inside the shaded band where θ̂ lands, so the exact density is skewed.'));
      else out.appendChild(document.createTextNode('\ng is nearly its tangent inside the shaded band, so the limit is a good guide.'));
    }
    /* Try it. get: g (sq, exp or inv), theta, n, gprime (g′(θ), to 0.01), sdlimit (|g′(θ)|σ with σ = 1, to 0.001),
       sdexact (the exact sd of √N(g(θ̂) − g(θ)), to 0.001; inf for 1/θ, which has no variance),
       dist (the largest gap between the exact and the limit CDF, to 0.001; none when g′(θ) = 0, where the limit is a point),
       fail (true when g′(θ) = 0 or g is not defined at θ), p0 (P(θ̂ < 0), to 0.001), moves (slider and button changes).
       At g = inv and θ = 0 the keys gprime, sdlimit, sdexact, dist and p0 read none. Numbers are rounded as the readout shows them.
       set: g, theta, n (moved as a person would; n snaps to the nearest stop 5, 10, 25, 50, 100, 250, 500, 1000). */
    api=NF.api({
      get:function(){ var o={}, q; for(q in st) o[q]=st[q]; return o; },
      set:function(o){
        var j, b=0, v;
        if('g' in o && G[o.g]) NF.press(fig,'data-g',String(o.g));
        if('theta' in o && rth) rth.set(+o.theta);
        if('n' in o && rn){ v=+o.n; for(j=1;j<NS.length;j++) if(Math.abs(NS[j]-v)<Math.abs(NS[b]-v)) b=j; if(b!==rn.i()) rn.set(b); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. OLS against GLS when sd(u | x) grows with x ---------- */
  NF.register('l8-gls',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=40, B1=1, B2=0.5, SEED=20261111, seed=SEED, X=[], Z=new Float64Array(N), het=1, fg=false, moves=0, api=null, st={}, E={}, i, rnd;
    var W=520, H=330, mL=36, mR=16, top=30, bot=290, XLO=0, XHI=10.5, YLO=-3, YHI=14, xs, ys;
    /* the regressor is drawn once and kept: every readout is conditional on this X. It is right skewed (many small x, few large),
       so the noisy observations are also the high leverage ones */
    rnd=mulberry32(20261108);
    for(i=0;i<N;i++){ het=rnd(); X.push(Math.round((0.5+9.5*het*het)*100)/100); }
    het=1;
    function gen(){ var r=mulberry32(seed), k; for(k=0;k<N;k++) Z[k]=gauss(r); }
    var rh=range(fig,'het',1,function(v){ het=Math.round(v*10)/10; moves++; update(); });
    if(rh) het=Math.round(rh.v()*10)/10;
    var f0=seg(fig,'data-fg',function(v){ var b=v==='1'; if(b===fg) return; fg=b; moves++; draw(); });
    fg=f0==='1';
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; moves++; gen(); update(); });

    /* Var(uᵢ | X) = σᵢ² = xᵢ^(2δ) / mean of x^(2δ): the average variance is 1 at every δ */
    function variances(){
      var v=[], m=0, k;
      for(k=0;k<N;k++){ v.push(Math.pow(X[k],2*het)); m+=v[k]; }
      m/=N;
      for(k=0;k<N;k++) v[k]/=m;
      return {v:v, m:m};
    }
    /* weighted least squares with weights w when the true variances are v: the slope is Σaᵢyᵢ, and
       Var(slope | X) = Σaᵢ²vᵢ is the [2,2] entry of (X′WX)⁻¹X′WΩᵤWX(X′WX)⁻¹. w = 1 is OLS, w = 1/v is GLS. */
    function wls(w,v,y){
      var s0=0, s1=0, s2=0, k, D, a, b2=0, var2=0, sy=0;
      for(k=0;k<N;k++){ s0+=w[k]; s1+=w[k]*X[k]; s2+=w[k]*X[k]*X[k]; }
      D=s0*s2-s1*s1;
      for(k=0;k<N;k++){ a=w[k]*(s0*X[k]-s1)/D; b2+=a*y[k]; var2+=a*a*v[k]; sy+=w[k]*y[k]; }
      return {b2:b2, b1:(sy-b2*s1)/s0, sd:Math.sqrt(var2)};
    }
    function draw(){
      var g, rows, j, x, y, gc, items;
      W=measure(svg); frame(svg,W,H);
      g=S('g',null,svg);
      items=[['line','l8-true','true line'],['line','l8-ols','OLS'],['line','l8-gls','GLS'],['rect','l8-fan l8-sw3','true line ± 1.96 σᵢ']];
      if(fg) items.splice(3,0,['line','l8-fg','weights 1/xᵢ²']);
      rows=key(g,items,mL,11,W-mR);
      top=rows*16+12; bot=top+262; H=bot+40;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(XLO,XHI,mL,W-mR); ys=lin(YLO,YHI,bot,top);
      for(j=0;j<=10;j+=2){ x=C(xs(j)); line(g,x,top,x,bot,'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax'); text(g,xs(j),bot+17,tl(j),null,'middle'); }
      for(j=0;j<=12;j+=4){ y=C(ys(j)); line(g,mL,y,W-mR,y,j===0?'nf-ax':'nf-grid'); text(g,mL-7,ys(j)+4,tl(j),null,'end'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,W-3,bot+17,'x','nf-title','end');
      text(g,mL-7,top+2,'y','nf-title','end');
      gc=clip(svg,mL,top,W-mR-mL,bot-top);
      E.fan=S('path',{'class':'l8-fan'},gc);
      E.pts=[];
      for(j=0;j<N;j++) E.pts.push(S('circle',{'class':'l8-pt'},gc));
      E.tr=line(gc,xs(XLO),ys(B1+B2*XLO),xs(XHI),ys(B1+B2*XHI),'l8-true');
      E.fg=line(gc,0,0,0,0,'l8-fg');
      E.ols=line(gc,0,0,0,0,'l8-ols');
      E.gls=line(gc,0,0,0,0,'l8-gls');
      update();
    }
    function update(){
      var V=variances(), v=V.v, y=[], one=[], wg=[], wf=[], k, o, gl, fl, wmax=0, p=[], q=[], x, s, xb=0, sxx=0, es2=0, conv, ratio, word, a, b;
      for(k=0;k<N;k++){ y.push(B1+B2*X[k]+Math.sqrt(v[k])*Z[k]); one.push(1); wg.push(1/v[k]); wf.push(1/(X[k]*X[k])); if(wg[k]>wmax) wmax=wg[k]; xb+=X[k]; }
      xb/=N;
      for(k=0;k<N;k++) sxx+=(X[k]-xb)*(X[k]-xb);
      /* E[s² | X] = Σ(1 − hᵢᵢ)σᵢ²/(N − 2): what the homoskedastic formula s²(X′X)⁻¹ reports on average */
      for(k=0;k<N;k++) es2+=(1-1/N-(X[k]-xb)*(X[k]-xb)/sxx)*v[k];
      es2/=N-2; conv=Math.sqrt(es2/sxx);
      o=wls(one,v,y); gl=wls(wg,v,y); fl=wls(wf,v,y);
      ratio=o.sd/gl.sd;
      for(k=0;k<=60;k++){ x=0.5+9.5*k/60; s=1.96*Math.pow(x,het)/Math.sqrt(V.m); p.push([xs(x),ys(B1+B2*x+s)]); q.unshift([xs(x),ys(B1+B2*x-s)]); }
      E.fan.setAttribute('d',poly(p.concat(q))+'Z');
      for(k=0;k<N;k++){
        at(E.pts[k],xs(X[k]),ys(y[k]));
        E.pts[k].setAttribute('r',R(1.8+3.4*Math.sqrt(wg[k]/wmax)));
      }
      setLine(E.ols,xs(XLO),ys(o.b1+o.b2*XLO),xs(XHI),ys(o.b1+o.b2*XHI));
      setLine(E.gls,xs(XLO),ys(gl.b1+gl.b2*XLO),xs(XHI),ys(gl.b1+gl.b2*XHI));
      if(fg) setLine(E.fg,xs(XLO),ys(fl.b1+fl.b2*XLO),xs(XHI),ys(fl.b1+fl.b2*XHI));
      E.fg.setAttribute('class',fg?'l8-fg':'nf-hide');
      st={het:het, sample:seed-SEED, fgls:fg?1:0, bols:r3(o.b2), bgls:r3(gl.b2), bf:r3(fl.b2), sdols:r3(o.sd), sdgls:r3(gl.sd), sdf:r3(fl.sd),
        ratio:r2(ratio), ratiof:r2(fl.sd/gl.sd), sdconv:r3(conv), moves:moves};
      if(api) api.changed();
      if(!out) return;
      out.textContent='this sample: β̂₂ OLS = '+f3(o.b2)+'   GLS = '+f3(gl.b2)+'   true β₂ = 0.5'+
        '\nsd(β̂₂ | X): OLS = '+f3(o.sd)+'   GLS = '+f3(gl.sd)+'   ratio = '+f2(ratio);
      a=r3(conv); b=r3(o.sd);
      word=a<b?', too small':a>b?', too large':', which is right';
      s='\nthe homoskedastic formula s²(X′X)⁻¹ reports about '+f3(conv)+' for OLS'+word;
      if(a<b) warn(out,s); else out.appendChild(document.createTextNode(s));
      if(fg){
        s='\nweights 1/xᵢ²: β̂₂ = '+f3(fl.b2)+'   sd = '+f3(fl.sd)+(het===1?', the GLS weights at δ = 1':r3(fl.sd)>r3(o.sd)?', worse than OLS':', between GLS and OLS');
        if(r3(fl.sd)>r3(o.sd)) warn(out,s); else out.appendChild(document.createTextNode(s));
      }
    }
    /* Try it. get: het (δ in sd(uᵢ | xᵢ) ∝ xᵢ^δ), sample (New sample presses, 0 for the first draws), fgls (1 when the 1/xᵢ² weights show),
       bols bgls bf (this sample's slope under OLS, GLS and the 1/xᵢ² weights, to 0.001),
       sdols sdgls sdf (the exact sd of each slope given X, to 0.001: root of the [2,2] entry of the sandwich
       (X′X)⁻¹X′ΩᵤX(X′X)⁻¹, of (X′Ωᵤ⁻¹X)⁻¹, and of the sandwich with W = diag{1/xᵢ²}),
       ratio (sdols/sdgls, to 0.01), ratiof (sdf/sdgls, to 0.01), sdconv (root of E[s² | X][(X′X)⁻¹]₂₂, to 0.001),
       moves (slider, button and New sample changes). set: het, sample, fgls (0 or 1). */
    api=NF.api({
      get:function(){ var o={}, q; for(q in st) o[q]=st[q]; return o; },
      set:function(o){
        var s2;
        if('fgls' in o) NF.press(fig,'data-fg',+o.fgls?'1':'0');
        if('sample' in o){ s2=SEED+Math.max(0,Math.round(+o.sample)||0); if(s2!==seed){ seed=s2; moves++; gen(); update(); } }
        if('het' in o && rh) rh.set(+o.het);
      }
    });
    gen(); draw();
    watch(svg,draw);
    return api;
  });

  /* notes.js may have booted before this file loaded; start any L8 figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();

/* L8 figure: cluster robust inference (appended to assets/figs/l8.js). Registers with NF from assets/notes.js. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, lin=NF.lin, measure=NF.measure,
      frame=NF.frame, watch=NF.watch, seg=NF.seg, range=NF.range, mulberry32=NF.mulberry32, clip=NF.clip, tl=NF.tl;

  /* standard normal draws from a uniform stream, Box Muller, both of each pair used */
  function normals(seed){
    var r=mulberry32(seed), spare=0, has=false;
    return function(){
      var u, v, m;
      if(has){ has=false; return spare; }
      u=1-r(); v=r(); m=Math.sqrt(-2*Math.log(u));
      spare=m*Math.sin(6.283185307179586*v); has=true;
      return m*Math.cos(6.283185307179586*v);
    };
  }

  /* ---------- Cluster robust inference ----------
     y_ig = β1 + β2 x_ig + u_ig for i = 1..N_g, g = 1..G, with N_g = 20 in every cluster, β1 = 1, β2 = 0.5.
     u_ig = c_g + e_ig, c_g ~ N(0, ρu), e_ig ~ N(0, 1 − ρu): Var(u_ig) = 1 and Corr(u_ig, u_jg) = ρu inside a cluster, 0 across clusters.
     x_ig = √λ z_g + √(1 − λ) w_ig with z, w standard normal: λ is the share of Var(x) that sits at cluster level.
     X stays fixed; the errors are drawn 2000 times. With x̃ = x − x̄ and Sxx = Σ x̃²:
       exact Var(β̂2 | X) = [(1 − ρu) Sxx + ρu Σ_g (Σ_i x̃_ig)²] / Sxx²        (row 2 of (X′X)⁻¹ X′ΩX (X′X)⁻¹)
       conventional  σ̂² / Sxx with σ̂² = Σ û² / N
       White         Σ x̃² û² / Sxx²
       cluster       Σ_g (Σ_i x̃_ig û_ig)² / Sxx²                             ((X′X)⁻¹ (Σ_g X_g′ û_g û_g′ X_g) (X′X)⁻¹, no correction)
     and each t test rejects H0: β2 = 0.5 when |β̂2 − 0.5| / se > 1.96. */
  NF.register('l8-cluster',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var GMAX=50, NG=20, REPS=2000, B1=1, B2=0.5, ZC=1.959963984540054, SEED=20261111, MCSEED=8231, MARK=4;
    var GS={5:1,10:1,20:1,50:1};
    var seed=SEED, moves=0, api=null, ST={}, cache={}, el={}, W=520, H=300;
    var Z=new Float64Array(GMAX), Wd=new Float64Array(GMAX*NG), Cs=new Float64Array(GMAX), Es=new Float64Array(GMAX*NG);
    var X=new Float64Array(GMAX*NG), U=new Float64Array(GMAX*NG);
    var SHAPE=['M-3,0a3,3 0 1,0 6,0a3,3 0 1,0 -6,0','M-2.7,-2.7h5.4v5.4h-5.4z','M0,-3.6L3.4,2.4L-3.4,2.4z','M0,-3.8L3.8,0L0,3.8L-3.8,0z'];
    var BIG=['M-5,0a5,5 0 1,0 10,0a5,5 0 1,0 -10,0','M-4.5,-4.5h9v9h-9z','M0,-6L5.6,4L-5.6,4z','M0,-6.2L6.2,0L0,6.2L-6.2,0z'];
    var G=+seg(fig,'data-g',function(v){ if(!GS[v] || +v===G) return; G=+v; moves++; draw(); });
    if(!GS[G]) G=20;
    var rr=range(fig,'rho',2,function(v){ rho=Math.round(v*20)/20; moves++; update(); });
    var rl=range(fig,'xshare',1,function(v){ lam=Math.round(v*10)/10; moves++; update(); });
    var rho=rr?Math.round(rr.v()*20)/20:0.5, lam=rl?Math.round(rl.v()*10)/10:0.5;
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; moves++; gen(); update(); });

    /* the fixed draws behind one sample: z_g and w_ig for x, then the standard normal c_g and e_ig of the plotted errors.
       The first G clusters are used, so samples are nested in G and move smoothly with ρu and λ. */
    function gen(){
      var r=normals(seed), i;
      for(i=0;i<GMAX;i++) Z[i]=r();
      for(i=0;i<GMAX*NG;i++) Wd[i]=r();
      for(i=0;i<GMAX;i++) Cs[i]=r();
      for(i=0;i<GMAX*NG;i++) Es[i]=r();
      cache={};
    }
    /* centred regressor for the current G and λ; returns Sxx */
    function design(){
      var N=G*NG, a=Math.sqrt(lam), b=Math.sqrt(1-lam), i, g, m=0, sxx=0;
      for(g=0;g<G;g++) for(i=0;i<NG;i++){ X[g*NG+i]=a*Z[g]+b*Wd[g*NG+i]; m+=X[g*NG+i]; }
      m/=N;
      for(i=0;i<N;i++) sxx+=(X[i]-m)*(X[i]-m);
      return {mean:m, sxx:sxx};
    }
    /* the three standard errors of β̂2 from errors u (length N), given the centred design; returns [β̂2 − β2, conv, White, cluster] */
    function fit(u,xm,sxx,res){
      var N=G*NG, i, g, k, su=0, sxu=0, d, e, xt, s2=0, sw=0, sc=0, sg;
      for(i=0;i<N;i++){ su+=u[i]; sxu+=(X[i]-xm)*u[i]; }
      su/=N; d=sxu/sxx;
      for(g=0;g<G;g++){
        sg=0;
        for(k=0;k<NG;k++){ i=g*NG+k; xt=X[i]-xm; e=u[i]-su-d*xt; s2+=e*e; sw+=xt*xt*e*e; sg+=xt*e; }
        sc+=sg*sg;
      }
      res[0]=d; res[1]=Math.sqrt(s2/N/sxx); res[2]=Math.sqrt(sw)/sxx; res[3]=Math.sqrt(sc)/sxx; res[4]=su;
      return res;
    }
    /* the Monte Carlo errors: standard normal c_g and e_ig for every replication, drawn once from one seeded stream, cluster by
       cluster, and reused at every setting (so the numbers move smoothly with ρ and λ and a setting costs one pass of sums) */
    var PC=new Float32Array(GMAX*REPS), PE=new Float32Array(GMAX*REPS*NG), pooled=0, pr=normals(MCSEED);
    function pool(){
      var rep, i, o;
      for(;pooled<G;pooled++) for(rep=0;rep<REPS;rep++){
        o=pooled*REPS+rep; PC[o]=pr();
        for(i=0;i<NG;i++) PE[o*NG+i]=pr();
      }
    }
    /* seeded Monte Carlo over the errors with X fixed, cached per setting */
    function mc(ds){
      var k=G+'|'+rho.toFixed(2)+'|'+lam.toFixed(1);
      if(cache[k]) return cache[k];
      var N=G*NG, a=Math.sqrt(rho), b=Math.sqrt(1-rho), u=new Float64Array(N), res=[0,0,0,0,0],
          rep, g, i, c, j, t, o, sum=[0,0,0,0], rej=[0,0,0,0], sd2=0, mean=0, cs, scl=0;
      pool();
      for(g=0;g<G;g++){ cs=0; for(i=0;i<NG;i++) cs+=X[g*NG+i]-ds.mean; scl+=cs*cs; }
      for(rep=0;rep<REPS;rep++){
        for(g=0;g<G;g++){ o=g*REPS+rep; c=a*PC[o]; o*=NG; for(i=0;i<NG;i++) u[g*NG+i]=c+b*PE[o+i]; }
        fit(u,ds.mean,ds.sxx,res);
        mean+=res[0]; sd2+=res[0]*res[0];
        for(j=1;j<4;j++){ sum[j]+=res[j]; t=Math.abs(res[0])/res[j]; if(t>ZC) rej[j]++; }
      }
      mean/=REPS;
      cache[k]={sd:Math.sqrt(((1-rho)*ds.sxx+rho*scl)/(ds.sxx*ds.sxx)), sdmc:Math.sqrt((sd2-REPS*mean*mean)/(REPS-1)),
        se:[0,sum[1]/REPS,sum[2]/REPS,sum[3]/REPS], rej:[0,rej[1]/REPS,rej[2]/REPS,rej[3]/REPS]};
      return cache[k];
    }

    var ROWS=[['true sd','l8-b0'],['conventional','l8-b1'],['White','l8-b1'],['cluster','l8-b1']];
    function draw(){
      var wide, g, i, h, k, sx0, sx1, st, sb, bx, by, lab, ticks, y, x, N=G*NG, rowH=21;
      W=measure(svg); wide=W>=500;
      st=26; sb=st+(wide?236:clamp(Math.round(W*0.62),190,236));
      sx0=30; sx1=wide?Math.round(W*0.53):W-8;
      if(wide){ bx=sx1+22; by=st-12; H=sb+26; }
      else { bx=6; by=sb+38; H=by+rowH*7+70; }
      frame(svg,W,H);
      el.xs=lin(-3.6,3.6,sx0,sx1); el.ys=lin(-3.5,5.5,sb,st);
      g=S('g',null,svg);
      ticks=[-2,0,2,4];
      for(i=0;i<ticks.length;i++){ y=C(el.ys(ticks[i])); line(g,sx0,y,sx1,y,'nf-grid'); text(g,sx0-6,el.ys(ticks[i])+4,tl(ticks[i]),null,'end'); }
      ticks=[-2,0,2];
      for(i=0;i<ticks.length;i++){ x=C(el.xs(ticks[i])); line(g,x,sb,x,sb+4,'nf-ax'); text(g,el.xs(ticks[i]),sb+17,tl(ticks[i]),null,'middle'); }
      line(g,sx0,C(sb),sx1,C(sb),'nf-ax'); line(g,C(sx0),st,C(sx0),sb,'nf-ax');
      text(g,sx1,sb+17,'x','nf-title','end'); text(g,sx0-6,st-11,'y','nf-title','end');
      el.cap=text(g,sx0+2,st-11,'','nf-lab');
      el.b2=text(g,sx1,st-11,'','l8-tb','end');
      el.short=sx1-sx0<300;
      el.g=clip(svg,sx0,st,sx1-sx0,sb-st);
      el.o=[]; el.m=[]; el.mean=[];
      for(i=MARK*NG;i<N;i++) el.o.push(S('circle',{r:1.5,'class':'l8-o'},el.g));
      el.fit=line(el.g,0,0,0,0,'l8-fit');
      for(h=0;h<MARK;h++) for(k=0;k<NG;k++) el.m.push(S('path',{d:SHAPE[h],'class':'l8-c l8-c'+h},el.g));
      for(h=0;h<MARK;h++) el.mean.push(S('path',{d:BIG[h],'class':'l8-mean l8-c'+h},el.g));
      /* bars: the true sd against the three average standard errors, then the three rejection rates */
      g=S('g',null,svg);
      lab=84; el.bx0=bx+lab; el.bx1=W-8-44;
      text(g,bx,by+10,'sd and average se of β̂₂','nf-title');
      el.bar=[]; el.val=[];
      for(i=0;i<4;i++){
        y=by+20+i*rowH;
        text(g,bx,y+12,ROWS[i][0],'nf-lab');
        el.bar.push(S('rect',{x:R(el.bx0),y:R(y+2),height:13,width:0,'class':ROWS[i][1]},g));
        el.val.push(text(g,0,y+12,'','nf-lab'));
      }
      el.sdg=line(g,0,by+20,0,by+20+4*rowH,'l8-guide');
      y=by+20+4*rowH+30;
      text(g,bx,y-10,'5% t test: rejections of a true H₀','nf-title');
      el.rb=[]; el.rx=[]; el.rv=[];
      el.rs=lin(0,0.85,el.bx0,el.bx1);
      for(i=1;i<4;i++){
        k=y+(i-1)*rowH;
        text(g,bx,k+12,ROWS[i][0],'nf-lab');
        el.rb.push(S('rect',{x:R(el.bx0),y:R(k+2),height:13,width:0,'class':'l8-b1'},g));
        el.rx.push(S('rect',{x:R(el.rs(0.05)),y:R(k+2),height:13,width:0,'class':'l8-bx'},g));
        el.rv.push(text(g,0,k+12,'','nf-lab'));
      }
      line(g,C(el.bx0),by+18,C(el.bx0),by+22+4*rowH,'nf-ax'); line(g,C(el.bx0),y-2,C(el.bx0),y+3*rowH+2,'nf-ax');
      x=C(el.rs(0.05));
      line(g,x,y-2,x,y+3*rowH+4,'l8-guide');
      text(g,el.rs(0.05),y+3*rowH+16,'5%','nf-title','middle');
      update();
    }
    function update(){
      var ds=design(), N=G*NG, a=Math.sqrt(rho), b=Math.sqrt(1-rho), i, g, h, k, res=[0,0,0,0,0], r, mx, my, b1, b2, yv, top, w, v, n=0, j;
      for(g=0;g<G;g++) for(i=0;i<NG;i++) U[g*NG+i]=a*Cs[g]+b*Es[g*NG+i];
      fit(U,ds.mean,ds.sxx,res);
      b2=B2+res[0]; b1=B1+res[4]-res[0]*ds.mean;       /* ȳ − β̂2 x̄ with ȳ = β1 + β2 x̄ + ū */
      r=mc(ds);
      for(h=0;h<MARK;h++){
        mx=0; my=0;
        for(k=0;k<NG;k++){
          i=h*NG+k; yv=B1+B2*X[i]+U[i]; mx+=X[i]; my+=yv;
          el.m[i].setAttribute('transform','translate('+R(el.xs(X[i]))+','+R(el.ys(yv))+')');
        }
        el.mean[h].setAttribute('transform','translate('+R(el.xs(mx/NG))+','+R(el.ys(my/NG))+')');
      }
      for(i=MARK*NG;i<N;i++,n++){ el.o[n].setAttribute('cx',R(el.xs(X[i]))); el.o[n].setAttribute('cy',R(el.ys(B1+B2*X[i]+U[i]))); }
      setLine(el.fit,el.xs(-3.6),el.ys(b1-3.6*b2),el.xs(3.6),el.ys(b1+3.6*b2));
      el.cap.textContent=el.short?MARK+' of '+G+' clusters marked':'one sample, '+MARK+' of '+G+' clusters marked';
      el.b2.textContent='β̂₂ = '+b2.toFixed(3);
      /* bars share one scale: the longest of the four fills the track */
      v=[r.sd,r.se[1],r.se[2],r.se[3]]; top=Math.max(v[0],v[1],v[2],v[3]);
      i=C(el.bx0+(el.bx1-el.bx0)*v[0]/top);
      el.sdg.setAttribute('x1',i); el.sdg.setAttribute('x2',i);
      for(j=0;j<4;j++){
        w=(el.bx1-el.bx0)*v[j]/top; g=v[j].toFixed(3);
        el.bar[j].setAttribute('width',R(w));
        el.val[j].textContent=g;
        /* a number that would sit on the dashed true sd line moves to its right */
        h=el.bx0+w+5;
        if(h<i+4 && h+NF.tw(el.val[j],g)>i-4) h=i+6;
        el.val[j].setAttribute('x',R(h));
      }
      for(j=1;j<4;j++){
        w=el.rs(Math.min(r.rej[j],0.85))-el.bx0;
        el.rb[j-1].setAttribute('width',R(Math.min(w,el.rs(0.05)-el.bx0)));
        el.rx[j-1].setAttribute('width',R(Math.max(0,w-(el.rs(0.05)-el.bx0))));
        el.rv[j-1].setAttribute('x',R(Math.max(el.bx0+w,el.rs(0.05))+5)); el.rv[j-1].textContent=(100*r.rej[j]).toFixed(1)+'%';
      }
      ST={rho:rho, g:G, xshare:lam, n:N, sd:+r.sd.toFixed(3), sdmc:+r.sdmc.toFixed(3), seconv:+r.se[1].toFixed(3), serob:+r.se[2].toFixed(3), seclu:+r.se[3].toFixed(3),
        rejconv:+(100*r.rej[1]).toFixed(1), rejrob:+(100*r.rej[2]).toFixed(1), rejclu:+(100*r.rej[3]).toFixed(1), b2:+b2.toFixed(3),
        ratio:+(r.se[1]/r.sd).toFixed(2), sample:seed-SEED, moves:moves};
      if(out) out.textContent='G = '+G+' clusters of '+NG+', N = '+N+'   ρ = '+rho.toFixed(2)+'   exact sd(β̂₂ | X) = '+r.sd.toFixed(3)+
        '\naverage se over '+REPS+' samples: conventional '+r.se[1].toFixed(3)+', White '+r.se[2].toFixed(3)+', cluster robust '+r.se[3].toFixed(3)+
        '\n5% t test of the true H₀: β₂ = 0.5 rejects in '+(100*r.rej[1]).toFixed(1)+'%, '+(100*r.rej[2]).toFixed(1)+'% and '+(100*r.rej[3]).toFixed(1)+'% of them';
      if(api) api.changed();
    }
    /* Try it. get: rho (ρu), g (clusters G), xshare (λ, share of Var(x) at cluster level), n (N = 20 G),
       sd (exact sd(β̂2 | X), to 0.001), sdmc (sd of β̂2 over the 2000 samples), seconv serob seclu (average conventional, White and
       cluster robust standard errors, to 0.001), rejconv rejrob rejclu (rejection rates of the 5% t test of the true H0 in percent, to 0.1),
       ratio (seconv / sd, to 0.01), b2 (β̂2 of the plotted sample), sample (New sample presses, 0 for the first draw),
       moves (slider, button and New sample changes). set: rho, g, xshare, sample */
    api=NF.api({
      get:function(){ var o={}, q; for(q in ST) o[q]=ST[q]; o.moves=moves; return o; },
      set:function(o){
        var s2;
        if('sample' in o){ s2=SEED+Math.max(0,Math.round(+o.sample)||0); if(s2!==seed){ seed=s2; gen(); update(); } }
        if('g' in o && GS[o.g]) NF.press(fig,'data-g',String(o.g));
        if('rho' in o && rr) rr.set(+o.rho);
        if('xshare' in o && rl) rl.set(+o.xshare);
      }
    });
    gen(); draw();
    watch(svg,draw);
    return api;
  });

  /* notes.js may have booted before this file loaded; start any figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
