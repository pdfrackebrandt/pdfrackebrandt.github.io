/* L2 figures: modes of convergence, the edf, the square root n scaling, bias against variance, interval coverage.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/l2.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, yGrid=NF.yGrid, seg=NF.seg,
      range=NF.range, Phi=NF.Phi, invPhi=NF.invPhi, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, local=NF.local,
      capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function lgamma(x){
    var c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,
      12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7], a, t, i;
    if(x<0.5) return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x)))-lgamma(1-x);
    x-=1; a=c[0]; t=x+7.5;
    for(i=1;i<9;i++) a+=c[i]/(x+i);
    return 0.9189385332046727+(x+0.5)*Math.log(t)-t+Math.log(a);
  }
  /* chi squared density with k degrees of freedom */
  function chi2(x,k){
    if(x<=0) return k<2?Infinity:(k===2?0.5:0);
    return Math.exp((k/2-1)*Math.log(x)-x/2-(k/2)*Math.LN2-lgamma(k/2));
  }
  function unit(u){ return u<1e-12?1e-12:(u>1-1e-12?1-1e-12:u); }
  /* a slider that steps through a list of values; the label shows the value, not the index */
  function steps(fig,k,vals,cb){
    var inp=fig.querySelector('input[data-k="'+k+'"]'), val, hi=vals.length-1;
    if(!inp) return null;
    val=inp.parentNode.querySelector('.nfig-val');
    inp.min='0'; inp.max=String(hi); inp.step='1';
    function show(i,t){
      inp.value=String(i);
      inp.style.setProperty('--p',(i/hi*100).toFixed(1)+'%');
      t=t||String(vals[i]);
      if(val) val.textContent=t;
      inp.setAttribute('aria-valuetext',k+' = '+t);
    }
    inp.addEventListener('input',function(){ var i=Math.round(+inp.value); show(i); cb(vals[i],i); });
    show(clamp(Math.round(+inp.value),0,hi));
    return {el:inp, i:function(){ return Math.round(+inp.value); }, show:show};
  }
  /* short numbers for readouts: 0.01, 0.0001, 1000 */
  function num(v){
    if(v>=100) return String(Math.round(v));
    if(v>=1) return String(Math.round(v*100)/100);
    return String(Number(v.toPrecision(2)));
  }
  function logTicks(nmax){ var t=[], v; for(v=1;v<=nmax;v*=10) t.push(v); return t; }
  /* the largest of 1, 2, 5 times a power of ten that does not exceed x */
  function nice(x){ var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p; return (m>=5?5:m>=2?2:1)*p; }

  /* ---------- 1. Modes of convergence: a raster of sample paths ---------- */
  NF.register('l2-modes',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var K=30, N=10000, seed=20261030, T={spike:[],spike2:[],tall:[]}, cur=100, drag=false;
    var NV=[1,2,3,4,5,6,8,10,13,16,20,25,32,40,50,63,79,100,126,158,200,251,316,398,501,631,794,1000];
    var EX={
      spike:{p:'1/n', pv:function(n){ return 1/n; }, tail:function(){ return '1'; }, m:'1/n', mv:function(n){ return 1/n; }, v:['yes','no','yes']},
      spike2:{p:'1/n²', pv:function(n){ return 1/(n*n); }, tail:function(n){ return n<2?'1':'1/n = '+num(1/n); }, m:'1/n²', mv:function(n){ return 1/(n*n); }, v:['yes','yes','yes']},
      tall:{p:'1/n', pv:function(n){ return 1/n; }, tail:function(n){ return n<2?'1':'1/n = '+num(1/n); }, m:'n', mv:function(n){ return n; }, v:['yes','yes','no']}
    };
    var mL=36, mR=28, top=30, rowH=7, bot=0, H=0, W=520, xs, el={};
    var ex=seg(fig,'data-ex',function(v){ if(!EX[v]||v===ex) return; ex=v; marks(); update(); });
    if(!EX[ex]) ex='spike';
    var rs=steps(fig,'n',NV,function(v){ cur=v; update(); });
    if(rs) cur=NV[rs.i()];
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed+=2*K+1; sample(); marks(); update(); });
    /* the same uniforms drive both spike sequences, so the 1/n² marks are a subset of the 1/n marks */
    function sample(){
      var k, m, u, a, b, rnd, U;
      for(k=0;k<K;k++){
        rnd=mulberry32(seed+k); a=[]; b=[];
        for(m=1;m<=N;m++){ u=rnd(); if(u<1/m){ a.push(m); if(u<1/(m*m)) b.push(m); } }
        T.spike[k]=a; T.spike2[k]=b;
        U=unit(mulberry32(seed+K+k)());
        T.tall[k]=Math.min(N,Math.ceil(1/U)-1);   /* n U < 1 exactly for n = 1, ..., ceil(1/U) − 1 */
      }
    }
    function draw(){
      var g, i, t=logTicks(N), x, rows;
      W=measure(svg);
      frame(svg,W,300);
      rows=key(S('g',null,svg),[['rect','l2-mk-early','miss before the cursor'],['rect','l2-mk-late','miss at or after it']],mL+6,11,W-mR);
      top=rows>1?50:36; bot=top+K*rowH; H=bot+28;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=function(n){ return mL+Math.log(n)/Math.log(N)*(W-mL-mR); };
      xs.inv=function(x){ return Math.exp((x-mL)/(W-mL-mR)*Math.log(N)); };
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        x=C(xs(t[i]));
        line(g,x,top-4,x,bot,'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax');
        text(g,xs(t[i]),bot+17,tl(t[i]),null,'middle');
      }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,mL-7,top+6,'1',null,'end');
      text(g,mL-7,bot-1,String(K),null,'end');
      text(g,mL-7,top+(bot-top)/2+4,'path','nf-title','end');
      text(g,W-1,bot+17,'n','nf-title','end');
      el.g=clip(svg,mL-2,top-2,W-mR-mL+4,bot-top+4);
      el.cur=line(svg,0,0,0,0,'l2-cursor');
      el.curLab=text(svg,0,top-9,'','nf-lab','middle');
      marks(); update();
    }
    function marks(){
      var k, j, y, h=rowH-2, list, r;
      while(el.g.firstChild) el.g.removeChild(el.g.firstChild);
      el.m=[]; el.bars=[];
      for(k=0;k<K;k++){
        y=top+k*rowH+1;
        if(ex==='tall'){
          el.bars.push([S('rect',{y:R(y),height:h,'class':'l2-mk-early'},el.g),S('rect',{y:R(y),height:h,'class':'l2-mk-late'},el.g),T.tall[k]]);
        } else {
          list=T[ex][k];
          for(j=0;j<list.length;j++){
            r=S('rect',{x:R(xs(list[j])-0.9),y:R(y),width:1.8,height:h,'class':'l2-mk-early'},el.g);
            el.m.push([r,list[j],k]);
          }
        }
      }
    }
    function update(){
      var x=xs(cur), late={}, nl=0, i, b, e, d=EX[ex], x0=xs(1)-0.9, s1, s2, k;
      setLine(el.cur,x,top-4,x,bot);
      el.curLab.setAttribute('x',R(clamp(x,mL+18,W-mR-18)));
      el.curLab.textContent='n = '+cur;
      for(i=0;i<el.m.length;i++){
        e=el.m[i];
        e[0].setAttribute('class',e[1]>=cur?'l2-mk-late':'l2-mk-early');
        if(e[1]>=cur) late[e[2]]=1;
      }
      for(i=0;i<el.bars.length;i++){
        b=el.bars[i];
        if(cur>1){ e=Math.min(b[2],cur-1); b[0].setAttribute('x',R(x0)); b[0].setAttribute('width',R(xs(e)+0.9-x0)); }
        else b[0].setAttribute('width',0);
        if(b[2]>=cur){ b[1].setAttribute('x',R(xs(cur)-0.9)); b[1].setAttribute('width',R(xs(b[2])-xs(cur)+1.8)); late[i]=1; }
        else b[1].setAttribute('width',0);
      }
      for(k in late) if(Object.prototype.hasOwnProperty.call(late,k)) nl++;
      if(!out) return;
      s1='at n = '+cur+':  P(miss at n) = '+d.p+' = '+num(d.pv(cur))+'   P(a miss at some m ≥ n) = '+d.tail(cur)+'   E(X²) = '+d.m+' = '+num(d.mv(cur));
      s2='in probability '+d.v[0]+', almost surely '+d.v[1]+', in mean square '+d.v[2]+';  '+nl+' of '+K+' rows miss at or after n (up to n = '+N+')';
      out.textContent=s1+'\n'+s2;
    }
    function fromPointer(e){
      var p=local(svg,e,W,H), n=Math.round(clamp(xs.inv(p[0]),1,1000)), i, best=0;
      for(i=0;i<NV.length;i++) if(Math.abs(Math.log(NV[i]/n))<Math.abs(Math.log(NV[best]/n))) best=i;
      cur=n; if(rs) rs.show(best,String(n)); update();
    }
    svg.addEventListener('pointerdown',function(e){ drag=true; capture(svg,e); fromPointer(e); });
    svg.addEventListener('pointermove',function(e){ if(drag) fromPointer(e); });
    function stop(){ drag=false; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    sample(); draw();
    watch(svg,draw);
  });

  /* ---------- 2. The empirical distribution function ---------- */
  NF.register('l2-edf',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var NV=[5,10,20,30,50,75,100,150,200,300,500,750,1000], NMAX=1000, seed=20261030, U=new Float64Array(NMAX), X=[], n=50, a=1, D=0, drag=false;
    var P={
      norm:{lo:-3.5,hi:3.5,t:[-3,-2,-1,0,1,2,3],a0:0.5,step:0.1,F:Phi,Q:invPhi},
      expo:{lo:-0.5,hi:5,t:[0,1,2,3,4,5],a0:1,step:0.1,F:function(x){ return x<0?0:1-Math.exp(-x); },Q:function(u){ return -Math.log(1-u); }},
      cauchy:{lo:-8,hi:8,t:[-8,-4,0,4,8],a0:1,step:0.25,F:function(x){ return 0.5+Math.atan(x)/Math.PI; },Q:function(u){ return Math.tan(Math.PI*(u-0.5)); }}
    };
    var H=272, mL=36, mR=28, top=44, bot=236, W=520, xs, ys, el={};
    var pop=seg(fig,'data-dist',function(v){ if(!P[v]||v===pop) return; pop=v; a=P[v].a0; draw(); });
    if(!P[pop]) pop='expo';
    a=P[pop].a0;
    var rs=steps(fig,'n',NV,function(v){ n=v; resample(); paint(); guide(); });
    if(rs) n=NV[rs.i()];
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; fill(); resample(); paint(); guide(); });
    /* one stream of uniforms, pushed through each inverse cdf: switching populations keeps the same ranks */
    function fill(){ var r=mulberry32(seed), i; for(i=0;i<NMAX;i++) U[i]=unit(r()); }
    function resample(){
      var d=P[pop], s=Array.prototype.slice.call(U,0,n).sort(function(p,q){ return p-q; });
      X=s.map(function(u){ return d.Q(u); });
    }
    function below(x){ var lo=0, hi=X.length, m; while(lo<hi){ m=(lo+hi)>>1; if(X[m]<=x) lo=m+1; else hi=m; } return lo; }
    function draw(){
      var d=P[pop], g, i, x, rows, p=[];
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','nf-line','edf'],['line','nf-ref','true F'],['line','l2-gap','largest gap'],['rect','l2-bar nf-sw','F(a) ± 2 sd of the edf']],mL+6,11,W-mR);
      top=rows>1?(rows>2?58:44):30;
      xs=lin(d.lo,d.hi,mL,W-mR); ys=lin(0,1,bot,top);
      g=S('g',null,svg);
      for(i=0;i<d.t.length;i++){
        x=C(xs(d.t[i]));
        line(g,x,top,x,bot,d.t[i]===0?'nf-zero':'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax');
        text(g,xs(d.t[i]),bot+17,tl(d.t[i]),null,'middle');
      }
      yGrid(g,ys,[0,0.5,1],mL,W-mR);
      text(g,W-3,bot+17,'x','nf-title','end');
      for(i=0;i<=320;i++){ x=d.lo+(d.hi-d.lo)*i/320; p.push([xs(x),ys(d.F(x))]); }
      S('path',{d:poly(p),'class':'nf-ref'},svg);
      el.band=S('rect',{width:10,'class':'l2-bar'},svg);
      el.guide=line(svg,0,0,0,0,'nf-guide');
      el.edf=S('path',{'class':'nf-line nf-flat'},svg);
      el.gap=line(svg,0,0,0,0,'l2-gap');
      el.dT=S('circle',{r:4,'class':'l2-truept'},svg);
      el.dE=S('circle',{r:4.5,'class':'nf-dot'},svg);
      svg.setAttribute('aria-valuemin',d.lo); svg.setAttribute('aria-valuemax',d.hi);
      resample(); paint(); guide();
    }
    function paint(){
      var d=P[pop], pts=[], i=0, y, x, F, up, dn, loc=0, y1=0, y2=0, xc;
      while(i<n && X[i]<d.lo) i++;
      y=i/n; pts.push([xs(d.lo),ys(y)]);
      for(;i<n && X[i]<=d.hi;i++){ x=xs(X[i]); pts.push([x,ys(y)]); y=(i+1)/n; pts.push([x,ys(y)]); }
      pts.push([xs(d.hi),ys(y)]);
      el.edf.setAttribute('d',poly(pts));
      /* the largest vertical gap sits at a data point, just before or just after its jump */
      D=0;
      for(i=0;i<n;i++){
        F=d.F(X[i]); up=(i+1)/n-F; dn=F-i/n;
        if(up>D){ D=up; loc=i; y1=F; y2=(i+1)/n; }
        if(dn>D){ D=dn; loc=i; y1=F; y2=i/n; }
      }
      xc=xs(clamp(X[loc],d.lo,d.hi));
      setLine(el.gap,xc,ys(y1),xc,ys(y2));
    }
    function guide(){
      var d=P[pop], px=xs(a), F=d.F(a), Fh=below(a)/n, sd=Math.sqrt(F*(1-F)/n), lo=Math.max(0,F-2*sd), hi=Math.min(1,F+2*sd), s;
      setLine(el.guide,px,top,px,bot);
      el.band.setAttribute('x',R(px-5)); el.band.setAttribute('y',R(ys(hi))); el.band.setAttribute('height',R(Math.max(1,ys(lo)-ys(hi))));
      at(el.dT,px,ys(F)); at(el.dE,px,ys(Fh));
      s='n = '+n+'   at a = '+fmt(a,2)+' the edf is '+Fh.toFixed(2)+', F(a) = '+F.toFixed(2)+' ± '+(2*sd).toFixed(2)+'   largest gap '+D.toFixed(3);
      if(out) out.textContent=s;
      svg.setAttribute('aria-valuenow',+a.toFixed(2));
      svg.setAttribute('aria-valuetext',s.replace(/ {3}/g,', '));
    }
    function fromPointer(e){
      var d=P[pop], p=local(svg,e,W,H);
      a=Math.round(clamp(xs.inv(p[0]),d.lo,d.hi)*100)/100; guide();
    }
    svg.addEventListener('pointerdown',function(e){ drag=true; capture(svg,e); fromPointer(e); });
    svg.addEventListener('pointermove',function(e){ if(drag || e.pointerType==='mouse') fromPointer(e); });
    function stop(){ drag=false; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('keydown',function(e){
      var d=P[pop], s=d.step, x=a, k=e.key;
      if(k==='ArrowRight'||k==='ArrowUp') x+=s;
      else if(k==='ArrowLeft'||k==='ArrowDown') x-=s;
      else if(k==='PageUp') x+=5*s;
      else if(k==='PageDown') x-=5*s;
      else if(k==='Home') x=d.lo;
      else if(k==='End') x=d.hi;
      else return;
      e.preventDefault();
      a=+clamp(Math.round(x/s)*s,d.lo,d.hi).toFixed(6); guide();
    });
    fill(); draw();
    watch(svg,draw);
  });

  /* ---------- 3. Why the square root of n ---------- */
  NF.register('l2-rootn',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var K=5, NMAX=10000, seed=20261030, P=[], A=0.25, Z90=1.6448536269514722, Z50=0.6744897501960817;
    var H=276, mL=36, mR=28, top=30, bot=246, W=520, xs, ys;
    var ra=range(fig,'a',2,function(v){ A=Math.round(v*100)/100; draw(); });
    if(ra) A=Math.round(ra.v()*100)/100;
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed+=K; sample(); draw(); });
    /* running sums of N(0, 1) draws: the sample mean of the first n is S[n − 1]/n */
    function sample(){
      var k, i, s, r, arr;
      for(k=0;k<K;k++){
        r=mulberry32(seed+k); arr=new Float64Array(NMAX); s=0;
        for(i=0;i<NMAX;i++){ s+=invPhi(unit(r())); arr[i]=s; }
        P[k]=arr;
      }
    }
    function draw(){
      var g, gp, i, k, x, t=logTicks(NMAX), L=Math.log(NMAX), ns=[1], last, u90=[], d90=[], u50=[], d50=[], e=A-0.5, w, pts, lo=Infinity, hi=-Infinity, v, rows, s1, s2, Y, st, yt;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['rect','nf-band nf-sw','90% band'],['rect','l2-band50 nf-sw','50% band'],['line','nf-path','five paths']],mL+6,11,W-mR);
      top=rows>1?44:30;
      xs=function(n){ return mL+Math.log(n)/L*(W-mL-mR); };
      /* above a = 0.5 the axis stretches with the 90% band, so the paths stay in view as they fan out */
      Y=e>0?Math.max(4,1.15*Z90*Math.pow(NMAX,e)):4;
      st=nice(Y/2.2); yt=[];
      for(v=st;v<=Y+1e-9;v+=st){ yt.push(v); yt.unshift(-v); }
      ys=lin(-Y,Y,bot,top);
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        x=C(xs(t[i]));
        line(g,x,top,x,bot,'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax');
        text(g,xs(t[i]),bot+17,tl(t[i]),null,'middle');
      }
      yGrid(g,ys,yt,mL,W-mR);
      text(g,mL-7,ys(0)+4,'0',null,'end');
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,W-1,bot+17,'n','nf-title','end');
      last=xs(1);
      for(i=2;i<NMAX;i++){ x=xs(i); if(x-last>=0.75){ ns.push(i); last=x; } }
      ns.push(NMAX);
      gp=clip(svg,mL,top,W-mR-mL,bot-top);
      for(i=0;i<ns.length;i++){
        w=Math.pow(ns[i],e); x=xs(ns[i]);
        u90.push([x,ys(clamp(Z90*w,-1.3*Y,1.3*Y))]); d90.push([x,ys(clamp(-Z90*w,-1.3*Y,1.3*Y))]);
        u50.push([x,ys(clamp(Z50*w,-1.3*Y,1.3*Y))]); d50.push([x,ys(clamp(-Z50*w,-1.3*Y,1.3*Y))]);
      }
      S('path',{d:poly(u90.concat(d90.reverse()))+'Z','class':'nf-band'},gp);
      S('path',{d:poly(u50.concat(d50.reverse()))+'Z','class':'l2-band50'},gp);
      line(gp,mL,C(ys(0)),W-mR,C(ys(0)),'nf-mean0');
      for(k=0;k<K;k++){
        pts=[];
        for(i=0;i<ns.length;i++){ v=Math.pow(ns[i],A-1)*P[k][ns[i]-1]; pts.push([xs(ns[i]),clamp(ys(v),top-60,bot+60)]); }
        S('path',{d:poly(pts),'class':'nf-path'},gp);
        v=Math.pow(NMAX,A-1)*P[k][NMAX-1]; lo=Math.min(lo,v); hi=Math.max(hi,v);
      }
      if(!out) return;
      w=Z90*Math.pow(NMAX,e);
      if(Math.abs(e)<1e-9){
        s1='power a = 0.50   band ±'+Z90.toFixed(2)+' at every n, the N(0, 1) quantiles   paths end between '+fmt(lo,2)+' and '+fmt(hi,2);
        s2='√n(X̄ − µ) converges in distribution, not in probability: X̄ − µ = Op(n^(−1/2))';
      } else if(e<0){
        s1='power a = '+A.toFixed(2)+'   90% band at n = '+NMAX+': ±'+w.toFixed(2)+', shrinking like n^('+fmt(e,2)+')   paths end between '+fmt(lo,2)+' and '+fmt(hi,2);
        s2=A<0.005?'X̄ − µ → 0 in probability, the LLN: X̄ − µ = op(1), and its spread is gone':'n^a(X̄ − µ) → 0 in probability: X̄ − µ = op(n^('+fmt(-A,2)+'))';
      } else {
        s1='power a = '+A.toFixed(2)+'   90% band at n = '+NMAX+': ±'+w.toFixed(2)+', growing like n^('+e.toFixed(2)+')';
        s2='no limit: the magnification outruns the shrinking error'+(Y>4?' (the vertical axis now runs to ±'+tl(Math.round(Y*10)/10)+')':'');
      }
      out.textContent=s1+'\n'+s2;
    }
    sample(); draw();
    watch(svg,draw);
  });

  /* ---------- 4. Bias against variance: two sample variances ---------- */
  NF.register('l2-mse',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var n=5, XMAX=3.5, YMAX=2.3;
    var H=300, mL=36, mR=28, top=30, bot=190, W=520, xs, ys, el={}, bx, by=[0,0];
    var rn=range(fig,'n',0,function(v){ n=Math.round(v); update(); });
    if(rn) n=Math.round(rn.v());
    function draw(){
      var g, i, t=[0,0.5,1,1.5,2,2.5,3,3.5], rows;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','l2-s1','divide by n − 1'],['line','l2-s2','divide by n'],['line','nf-mean0','true σ² = 1']],mL+6,11,W-mR);
      top=rows>1?44:30;
      xs=lin(0,XMAX,mL,W-mR); ys=lin(0,YMAX,bot,top);
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        if(W-mL-mR<360 && t[i]%1) continue;
        line(g,C(xs(t[i])),top,C(xs(t[i])),bot,'nf-grid'); line(g,C(xs(t[i])),bot,C(xs(t[i])),bot+4,'nf-ax');
        text(g,xs(t[i]),bot+17,tl(t[i]),null,'middle');
      }
      yGrid(g,ys,[0,1,2],mL,W-mR);
      text(g,W-3,bot+17,'s²','nf-title','end');
      g=clip(svg,mL,top,W-mR-mL,bot-top);
      el.f1=S('path',{'class':'l2-s1f'},g); el.f2=S('path',{'class':'l2-s2f'},g);
      el.c1=S('path',{'class':'l2-s1'},g); el.c2=S('path',{'class':'l2-s2'},g);
      line(g,C(xs(1)),top,C(xs(1)),bot,'nf-mean0');
      el.m1=line(g,0,0,0,0,'l2-s1 l2-dash'); el.m2=line(g,0,0,0,0,'l2-s2 l2-dash');
      /* the MSE panel: variance light, squared bias solid */
      text(svg,mL,bot+44,'MSE = variance (faint) + bias² (solid)','nf-title');
      bx=mL+48; by=[bot+54,bot+76];
      text(svg,bx-8,by[0]+10,'n − 1',null,'end'); text(svg,bx-8,by[1]+10,'n',null,'end');
      el.bars=[];
      for(i=0;i<2;i++){
        el.bars.push([S('rect',{x:bx,y:by[i],height:13,'class':'l2-bv'+(i+1)},svg),S('rect',{y:by[i],height:13,'class':'l2-bb'+(i+1)},svg),text(svg,0,by[i]+10,'','nf-lab')]);
      }
      H=by[1]+24; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      update();
    }
    function curve(c){
      var p=[], a=[[xs(0),ys(0)]], i, x, f, k=n-1;
      for(i=1;i<=360;i++){ x=XMAX*i/360; f=Math.min(chi2(x/c,k)/c,YMAX*1.04); p.push([xs(x),ys(f)]); }
      if(k<2) p.unshift([xs(0),ys(YMAX*1.04)]); else p.unshift([xs(0),ys(Math.min(chi2(0,k)/c,YMAX*1.04))]);
      return [poly(p),poly(a.concat(p,[[xs(XMAX),ys(0)]]))+'Z'];
    }
    function update(){
      var c1=1/(n-1), c2=1/n, k=n-1, p1=curve(c1), p2=curve(c2), e2=(n-1)/n, v1=2/(n-1), v2=2*(n-1)/(n*n), b2=1/(n*n), m1=v1, m2=v2+b2, sc, i, M=[[v1,0,m1],[v2,b2,m2]], w0, w1;
      el.c1.setAttribute('d',p1[0]); el.f1.setAttribute('d',p1[1]);
      el.c2.setAttribute('d',p2[0]); el.f2.setAttribute('d',p2[1]);
      setLine(el.m1,xs(1),ys(0),xs(1),ys(Math.min(chi2(1/c1,k)/c1,YMAX)));
      setLine(el.m2,xs(e2),ys(0),xs(e2),ys(Math.min(chi2(e2/c2,k)/c2,YMAX)));
      sc=(W-mR-bx-78)/Math.max(m1,m2);
      for(i=0;i<2;i++){
        w0=M[i][0]*sc; w1=M[i][1]*sc;
        el.bars[i][0].setAttribute('width',R(w0));
        el.bars[i][1].setAttribute('x',R(bx+w0)); el.bars[i][1].setAttribute('width',R(w1));
        el.bars[i][2].setAttribute('x',R(bx+w0+w1+6)); el.bars[i][2].textContent='MSE '+M[i][2].toFixed(3);
      }
      if(out) out.textContent='n = '+n+'\ndivide by n − 1:  bias 0, variance '+v1.toFixed(3)+', MSE '+m1.toFixed(3)+
        '\ndivide by n:  bias '+fmt(-1/n,3)+', variance '+v2.toFixed(3)+', MSE '+m2.toFixed(3);
    }
    draw();
    watch(svg,draw);
  });

  /* ---------- 5. Confidence interval coverage ---------- */
  NF.register('l2-coverage',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var ROWS=50, NMAX=200, REPS=10000, NV=[5,10,15,20,30,50,75,100,150,200], LEV=[0.90,0.95,0.99], SL=Math.sqrt(Math.LN2);
    var CRIT=LEV.map(function(l){ return invPhi(1-(1-l)/2); });
    var POP={
      norm:function(u){ return 1+invPhi(u); },
      expo:function(u){ return -Math.log(1-u); },
      logn:function(u){ return Math.exp(SL*invPhi(u)-SL*SL/2); }   /* mean 1, sd 1, skewness 4 */
    };
    var seed=20261030, U=new Float64Array(ROWS*NMAX), LR={}, n=10, ni=1;
    var H=300, mL=36, mR=28, top=30, rowH=4.2, bot=0, W=520, xs, el={};
    var pop=seg(fig,'data-pop',function(v){ if(!POP[v]||v===pop) return; pop=v; update(); });
    if(!POP[pop]) pop='expo';
    var sig=seg(fig,'data-sig',function(v){ sig=v; update(); });
    var lev=+seg(fig,'data-lev',function(v){ lev=+v; update(); });
    if(!(lev>=0 && lev<3)) lev=1;
    var rs=steps(fig,'n',NV,function(v,i){ n=v; ni=i; update(); });
    if(rs){ ni=rs.i(); n=NV[ni]; }
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; fill(); update(); });
    function fill(){ var r=mulberry32(seed), i; for(i=0;i<U.length;i++) U[i]=unit(r()); }
    /* the long run: REPS samples of NMAX draws, checked at every n on the slider, for both σ modes and all levels */
    function longRun(p){
      if(LR[p]) return LR[p];
      var f=POP[p], r=mulberry32(97531), J=NV.length, cov=new Float64Array(J*6), low=new Float64Array(J*6), high=new Float64Array(J*6), sumS=new Float64Array(J),
          rep, i, j, x, s, ss, m, sd, q, md, L, c, ix;
      for(rep=0;rep<REPS;rep++){
        s=0; ss=0; j=0;
        for(i=1;i<=NMAX;i++){
          x=f(unit(r())); s+=x; ss+=x*x;
          if(i===NV[j]){
            m=s/i; sd=Math.sqrt(Math.max(0,(ss-i*m*m)/(i-1))); sumS[j]+=sd; q=Math.sqrt(i);
            for(md=0;md<2;md++) for(L=0;L<3;L++){
              c=CRIT[L]*(md?sd:1)/q; ix=j*6+md*3+L;
              if(m+c<1) low[ix]++; else if(m-c>1) high[ix]++; else cov[ix]++;
            }
            j++;
          }
        }
      }
      LR[p]={cov:cov,low:low,high:high,sumS:sumS};
      return LR[p];
    }
    function draw(){
      var g, i, t=[0,0.5,1,1.5,2], x, rows;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','l2-ci','covers µ'],['line','l2-ci l2-miss','misses µ'],['line','l2-mu','µ = 1']],mL+6,11,W-mR);
      top=rows>1?50:36; bot=top+ROWS*rowH; H=bot+26;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(-0.5,2.5,mL,W-mR);
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        if(W-mL-mR<360 && t[i]%1) continue;
        x=C(xs(t[i]));
        line(g,x,top-4,x,bot,'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax');
        text(g,xs(t[i]),bot+17,tl(t[i]),null,'middle');
      }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,W-3,bot+17,'x̄','nf-title','end');
      el.g=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      line(el.g,C(xs(1)),top-4,C(xs(1)),bot,'l2-mu');
      el.ci=[]; el.dot=[];
      for(i=0;i<ROWS;i++){
        el.ci.push(line(el.g,0,0,0,0,'l2-ci'));
        el.dot.push(S('circle',{r:1.9,'class':'l2-cdot'},el.g));
      }
      update();
    }
    function update(){
      var f=POP[pop], c=CRIT[lev], q=Math.sqrt(n), k, i, s, ss, x, m, sd, se, lo, hi, y, miss, hit=0, lr=longRun(pop), md=sig==='known'?0:1, ix=ni*6+md*3+lev,
          cv=lr.cov[ix]/REPS, nl=lr.low[ix], nh=lr.high[ix], wid, sp;
      for(k=0;k<ROWS;k++){
        s=0; ss=0;
        for(i=0;i<n;i++){ x=f(U[k*NMAX+i]); s+=x; ss+=x*x; }
        m=s/n; sd=Math.sqrt(Math.max(0,(ss-n*m*m)/(n-1)));
        se=(md?sd:1)/q; lo=m-c*se; hi=m+c*se; miss=hi<1 || lo>1; y=top+(k+0.5)*rowH;
        setLine(el.ci[k],xs(lo),y,xs(hi),y); at(el.dot[k],xs(m),y);
        el.ci[k].setAttribute('class',miss?'l2-ci l2-miss':'l2-ci');
        el.dot[k].setAttribute('class',miss?'l2-cdot l2-miss':'l2-cdot');
        if(!miss) hit++;
      }
      if(!out) return;
      wid=2*c*(md?lr.sumS[ni]/REPS:1)/q;
      sp=nl+nh>0?Math.round(100*nl/(nl+nh)):0;
      out.textContent=hit+' of these '+ROWS+' intervals cover µ = 1\nlong run: '+(100*cv).toFixed(1)+'% of '+REPS.toLocaleString('en-GB')+' samples cover (nominal '+Math.round(LEV[lev]*100)+
        '%), mean width '+wid.toFixed(2)+'\n'+(nl+nh>0?'of the misses, '+sp+'% lie entirely below µ and '+(100-sp)+'% entirely above':'no interval missed');
    }
    fill(); draw();
    watch(svg,draw);
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
