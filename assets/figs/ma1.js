/* Core Macroeconomics L1 figures: Lucas's welfare cost of cycles, the HP filter on simulated GDP, the HP filter
   in the frequency domain, the two period consumption choice, and the endowment economy in an Edgeworth box.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma1.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, measure=NF.measure, frame=NF.frame, watch=NF.watch, mulberry32=NF.mulberry32,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  /* arrow from (x0,y0) to (x1,y1); the head stops gap px short of the tip */
  function setVec(v,x0,y0,x1,y1,gap){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by, tx, ty;
    gap=gap||0;
    if(len<gap+8){ hideVec(v); return false; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len; hl=Math.min(9,(len-gap)*0.45);
    tx=x1-ux*gap; ty=y1-uy*gap; bx=tx-ux*hl; by=ty-uy*hl;
    setLine(v.l,x0,y0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',poly([[tx,ty],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
    return true;
  }
  function hideVec(v){ setLine(v.l,0,0,0,0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); return b; }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function pct(v,d){ return fmt(v*100,d)+'%'; }
  /* thousands with commas, as on the slides (8,700) */
  function money(v){ var s=Math.round(Math.abs(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); return (v<0 && Math.round(Math.abs(v))>0?MINUS:'')+'£'+s; }
  function big(v){ return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
  /* a slider whose value label is written by show(v), not by the default fixed decimals */
  function rng(fig,k,show,cb){
    var r=NF.range(fig,k,2,function(v){ lab(v); cb(v); });
    function lab(v){ var e=r && r.wrap.querySelector('.nfig-val'); if(e) e.textContent=show(v); }
    if(r) lab(r.v());
    return r;
  }
  function handle(svg,knob,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+knob},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, dx=0, dy=0;
      if(k==='ArrowRight') dx=1; else if(k==='ArrowLeft') dx=-1;
      else if(k==='ArrowUp') dy=1; else if(k==='ArrowDown') dy=-1;
      else return;
      e.preventDefault(); onKey(dx,dy,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+now.toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag the point nearest the pointer; pts() gives svg positions, move(i,x,y) takes the new one */
  function dragger(svg,size,pts,move,focus){
    var cur=-1, off=[0,0];
    function near(p){
      var P=pts(), best=-1, bd=26, i, d;
      for(i=0;i<P.length;i++){ if(!P[i]) continue; d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
      return best;
    }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), i=near(p), P;
      if(i<0) return;
      P=pts(); cur=i; off=[P[i][0]-p[0],P[i][1]-p[1]];
      e.preventDefault(); capture(svg,e);
      if(focus) focus(i);
      svg.classList.add('is-drag');
    });
    svg.addEventListener('pointermove',function(e){
      if(cur<0) return;
      var s=size(), p=local(svg,e,s[0],s[1]);
      move(cur,p[0]+off[0],p[1]+off[1]);
    });
    function stop(){ cur=-1; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(near(local(svg,e.touches[0],s[0],s[1]))>=0) e.preventDefault();
    },{passive:false});
  }
  /* a label with subscripts: parts are strings, and [string] for a subscript */
  function sublab(g,x,y,parts,cls,anchor){
    var t=S('text',{x:R(x),y:R(y),'class':cls||'nf-lab'},g), i, sp, down=false;
    if(anchor) t.setAttribute('text-anchor',anchor);
    for(i=0;i<parts.length;i++){
      sp=S('tspan',null,t);
      if(typeof parts[i]==='string'){ sp.textContent=parts[i]; if(down){ sp.setAttribute('dy','-3'); down=false; } }
      else { sp.textContent=parts[i][0]; sp.setAttribute('class','nf-sub'); sp.setAttribute('dy',down?'0':'3'); down=true; }
    }
    return t;
  }
  function copy(o){ var r={}, k; for(k in o) r[k]=o[k]; return r; }
  /* CRRA utility, log at sigma = 1, its inverse, and marginal utility */
  function isLog(s){ return Math.abs(s-1)<1e-9; }
  function U(c,s){ return isLog(s)?Math.log(c):Math.pow(c,1-s)/(1-s); }
  function Uinv(v,s){ if(isLog(s)) return Math.exp(v); var a=(1-s)*v; return a>0?Math.pow(a,1/(1-s)):NaN; }
  function MU(c,s){ return Math.pow(c,-s); }
  /* an indifference curve u(x) + beta u(y) = level, as points (x, y) for x in (0, xmax], dropping points off the chart */
  function icurve(level,s,b,xmax,ymax){
    var p=[], i, x, y, n=420;
    for(i=1;i<=n;i++){
      x=xmax*Math.pow(i/n,1.6);
      y=Uinv((level-U(x,s))/b,s);
      if(isFinite(y) && y>=0 && y<ymax*3) p.push([x,y]);
    }
    return p;
  }

  /* ---------- 1. Lucas: the welfare cost of cycles against the value of growth ---------- */
  NF.register('ma1-lucas',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var P={sigma:2,f:0.02,beta:0.97,g:0.015,gp:0.025}, W=520, H=286, el={}, st={}, api;
    function pc1(v){ return fmt(v*100,v*100<10?2:1)+'%'; }
    var rs={
      sigma:rng(fig,'sigma',function(v){ return fmt(v,1); },function(v){ P.sigma=v; update(); }),
      f:rng(fig,'f',function(v){ return fmt(v*100,1)+'%'; },function(v){ P.f=v; update(); }),
      beta:rng(fig,'beta',function(v){ return fmt(v,2); },function(v){ P.beta=v; update(); }),
      g:rng(fig,'g',pc1,function(v){ P.g=v; update(); }),
      gp:rng(fig,'gp',pc1,function(v){ P.gp=v; update(); })
    }, k;
    for(k in rs) if(rs[k]) P[k]=rs[k].v();
    function calc(){
      var s=P.sigma, f=P.f, b=P.beta, g=P.g, gp=P.gp, lg=isLog(s), o={sigma:s, f:f, beta:b, g:g, gp:gp};
      o.qa=lg?b:b*Math.pow(1+g,1-s); o.qc=lg?b:b*Math.pow(1+gp,1-s);
      o.conva=o.qa<1; o.convc=o.qc<1; o.conv=o.conva && o.convc;
      o.lb=lg?Math.sqrt(1-f*f):Math.pow(0.5*(Math.pow(1+f,1-s)+Math.pow(1-f,1-s)),1/(1-s));
      o.cb=1-o.lb; o.cbp=100*o.cb; o.approx=100*s*f*f/2; o.pb=50000*o.cb;
      if(o.conv){
        o.lc=lg?Math.exp(b*Math.log((1+g)/(1+gp))/(1-b)):Math.pow((1-o.qc)/(1-o.qa),1/(1-s));
        o.cc=1-o.lc; o.ccp=100*o.cc; o.pc=50000*o.cc;
        o.cross=(o.lc<1 && gp>g)?Math.log(1/o.lc)/Math.log((1+gp)/(1+g)):-1;
        o.ratio=o.cb>1e-12?o.cc/o.cb:-1;
      } else { o.lc='undefined'; o.cc='undefined'; o.ccp='undefined'; o.pc='undefined'; o.cross=-1; o.ratio=-1; }
      return o;
    }
    function draw(){
      W=measure(svg); frame(svg,W,H);
      var g=S('g',null,svg);
      el.top=30; el.bot=168; el.mL=40; el.mR=16;
      text(g,el.mL-6,14,'u(c)','nf-title','end');
      el.ax=line(g,el.mL,C(el.bot),W-el.mR,C(el.bot),'nf-ax');
      text(g,W-el.mR,el.bot-6,'c / trend','nf-title','end');
      el.title=text(g,el.mL+6,14,'a 50:50 gamble on ±f around trend consumption','nf-lab');
      el.gc=clip(svg,el.mL,el.top-10,W-el.mR-el.mL,el.bot-el.top+12);
      el.drop=line(el.gc,0,0,0,0,'nf-guide');
      el.curve=S('path',{'class':'nf-line'},el.gc);
      el.chord=line(el.gc,0,0,0,0,'ma1-chord');
      el.gap=line(el.gc,0,0,0,0,'ma1-gap');
      el.p1=S('circle',{r:4,'class':'nf-dot'},el.gc);
      el.p2=S('circle',{r:4,'class':'nf-dot'},el.gc);
      el.m=S('circle',{r:4,'class':'nf-open'},el.gc);
      el.ce=S('circle',{r:4,'class':'ma1-cedot'},el.gc);
      el.glg=S('g',null,el.gc);
      el.ml=text(el.gc,0,0,'E u','nf-lab nf-halo');
      el.ticks=S('g',null,svg);
      /* bars: pounds a year out of 50,000 */
      el.by=212;
      text(g,4,el.by-14,'what a household on £50,000 gives up a year','nf-title');
      text(g,4,el.by+10,'no cycles','nf-lab');
      text(g,4,el.by+42,'faster growth','nf-lab');
      el.xb=W<420?96:108;
      S('rect',{x:el.xb,y:el.by,width:R(W-el.mR-70-el.xb),height:12,'class':'nf-track'},svg);
      S('rect',{x:el.xb,y:el.by+32,width:R(W-el.mR-70-el.xb),height:12,'class':'nf-track'},svg);
      el.bb=S('rect',{x:el.xb,y:el.by,width:0,height:12,'class':'ma1-barb'},svg);
      el.bc=S('rect',{x:el.xb,y:el.by+32,width:0,height:12,'class':'ma1-barc'},svg);
      el.vb=text(svg,0,el.by+10,'','nf-lab');
      el.vc=text(svg,0,el.by+42,'','nf-lab');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      st=calc();
      var s=P.sigma, f=P.f, fe=Math.max(f,0.005), lo=1-1.7*fe, hi=1+1.7*fe, ulo=U(lo,s), uhi=U(hi,s), pad=(uhi-ulo)*0.1,
          xs=NF.lin(lo,hi,el.mL+8,W-el.mR-8), ys=NF.lin(ulo-pad,uhi+pad,el.bot,el.top), p=[], i, c, eu, x1, x2, xm, xc, y, d, t, wmax, vmax, wb, wc, gpx;
      for(i=0;i<=160;i++){ c=lo+(hi-lo)*i/160; p.push([xs(c),ys(U(c,s))]); }
      el.curve.setAttribute('d',poly(p));
      eu=0.5*(U(1-f,s)+U(1+f,s));
      x1=xs(1-f); x2=xs(1+f); xm=xs(1); xc=xs(st.lb); y=ys(eu);
      setLine(el.chord,x1,ys(U(1-f,s)),x2,ys(U(1+f,s)));
      at(el.p1,x1,ys(U(1-f,s))); at(el.p2,x2,ys(U(1+f,s)));
      at(el.m,xm,y); at(el.ce,xc,y);
      setLine(el.gap,xc,y,xm,y);
      setLine(el.drop,xc,y,xc,el.bot);
      gpx=xm-xc;
      /* the label carries the number, since a cost of 0.04% is only a few pixels wide */
      while(el.glg.firstChild) el.glg.removeChild(el.glg.firstChild);
      sublab(el.glg,Math.min((xc+xm)/2,W-el.mR-70),y-12,['1 '+MINUS+' λ',['B'],' = '+fmt(st.cbp,st.cbp<1?3:2)+'%'],'ma1-red nf-halo','middle');
      moveTo(el.ml,xm+8,y+14);
      while(el.ticks.firstChild) el.ticks.removeChild(el.ticks.firstChild);
      d=[[1,'1']];
      if(f>0){ d.push([1-f,tl(1-f)],[1+f,tl(1+f)]); }
      for(i=0;i<d.length;i++){ line(el.ticks,C(xs(d[i][0])),el.bot,C(xs(d[i][0])),el.bot+4,'nf-ax'); text(el.ticks,xs(d[i][0]),el.bot+16,d[i][1],null,'middle'); }
      if(Math.abs(xc-xm)>30 && Math.abs(xc-x1)>30) sublab(el.ticks,xc,el.bot+16,['λ',['B']],'ma1-red','middle');
      /* bars on one scale; the cycle bar is honest even when it is a hairline */
      wmax=W-el.mR-70-el.xb;
      vmax=Math.max(1,Math.abs(st.pb),st.conv?Math.abs(st.pc):0);
      wb=wmax*Math.max(0,st.pb)/vmax;
      el.bb.setAttribute('width',R(Math.max(wb,st.pb>0.5?1.5:0)));
      el.vb.textContent=money(st.pb); moveTo(el.vb,el.xb+Math.max(wb,1.5)+6,el.by+10);
      if(st.conv){
        wc=wmax*Math.abs(st.pc)/vmax;
        el.bc.setAttribute('width',R(wc)); el.bc.setAttribute('class',st.pc>=0?'ma1-barc':'ma1-barc ma1-neg');
        el.vc.textContent=money(st.pc)+(st.pc<0?', so A is better':''); el.vc.setAttribute('class','nf-lab');
        moveTo(el.vc,el.xb+wc+6,el.by+42);
      } else {
        el.bc.setAttribute('width',0); el.vc.textContent='not defined: W is infinite'; el.vc.setAttribute('class','ma1-red'); moveTo(el.vc,el.xb+6,el.by+42);
      }
      if(!out) return;
      out.textContent='1 '+MINUS+' λB = '+fmt(st.cbp,3)+'%  (σf²/2 = '+fmt(st.approx,3)+'%)   ';
      if(st.conv){
        out.appendChild(document.createTextNode('1 '+MINUS+' λC = '+fmt(st.ccp,2)+'%\n'+
          (st.ratio>=1?'growth is worth '+(st.ratio>=10?big(st.ratio):fmt(st.ratio,1))+' times the cycles':st.ratio>0?'here the cycles cost more than faster growth is worth':'')+(st.cross>0?';  C overtakes A after '+fmt(st.cross,1)+' years':'')));
      } else {
        out.appendChild(document.createTextNode('\n'));
        warn(out,(st.conva?'β(1 + g′)^(1 '+MINUS+' σ) = '+fmt(st.qc,4)+' ≥ 1: the sum for C diverges, so λC is not defined':
          'β(1 + g)^(1 '+MINUS+' σ) = '+fmt(st.qa,4)+' ≥ 1: lifetime utility is infinite, so neither λ is defined'));
      }
    }
    /* the Try it steps read the parameters, both compensations (cb, cc as shares; cbp, ccp in percent), pounds, the
       convergence checks qa, qc and when C overtakes A; set moves the sliders */
    api=NF.api({
      get:function(){ return copy(st); },
      set:function(o){ var q; for(q in rs) if(q in o && rs[q]) rs[q].set(+o[q]); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The HP filter (and Hamilton's) on simulated log GDP ---------- */
  NF.register('ma1-hp',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var T=200, SEED=20261108, seed=SEED, LAMS=[0,1,6.25,25,100,400,1600,6400,25600,129600,1000000,Infinity],
        lamk=6, cut=T, data='tc', flt='hp', X={}, W=520, H=330, el={}, st={}, api, lmoves=0;
    function lamText(k){ var v=LAMS[k]; return v===Infinity?'∞':v>=10000?big(v):tl(v); }
    var rl=rng(fig,'lam',function(v){ return lamText(Math.round(v)); },function(v){ lamk=Math.round(v); lmoves++; update(); });
    var rc=rng(fig,'cut',function(v){ return 'year '+tl(v/4); },function(v){ cut=Math.round(v); update(); });
    if(rl) lamk=Math.round(rl.v());
    if(rc) cut=Math.round(rc.v());
    data=NF.seg(fig,'data-data',function(v){ if(v===data) return; data=v; draw(); }) || 'tc';
    flt=NF.seg(fig,'data-flt',function(v){ if(v===flt) return; flt=v; lock(); update(); }) || 'hp';
    onClick(fig,'.nfig-new',function(){ seed++; gen(); draw(); });
    function lock(){ if(!rl) return; var off=flt!=='hp'; rl.el.disabled=off; rl.wrap.setAttribute('class',off?'nfig-range is-off':'nfig-range'); }
    /* the model: log GDP (in percent) = trend + cycle. Trend growth is 0.5 a quarter plus a persistent AR(1)
       wobble; the cycle is an AR(2) with complex roots (modulus 0.9, period 20 quarters). The random walk has
       drift 0.5 and shocks of standard deviation 0.9. */
    function gen(){
      var rnd=mulberry32(seed), r=0.9, p1=2*r*Math.cos(2*Math.PI/20), p2=-r*r, c1=0, c2=0, i, m=0.5, E=[], Hh=[], Wn=[], cc, y=0;
      function z(){ var u1=1-rnd(), u2=rnd(); return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); }
      for(i=0;i<60;i++){ cc=p1*c1+p2*c2+0.3*z(); c2=c1; c1=cc; }
      for(i=0;i<T;i++) E.push(z());
      for(i=0;i<T;i++) Hh.push(z());
      for(i=0;i<T;i++) Wn.push(z());
      X.tc=new Float64Array(T); X.tau=new Float64Array(T); X.cyc=new Float64Array(T); X.rw=new Float64Array(T);
      for(i=0;i<T;i++){
        cc=p1*c1+p2*c2+0.3*E[i]; c2=c1; c1=cc; X.cyc[i]=cc;
        X.tau[i]=i?X.tau[i-1]+m:0;
        m=0.5+0.98*(m-0.5)+0.03*Hh[i];
        X.tc[i]=X.tau[i]+cc;
      }
      for(i=0;i<T;i++){ y+=0.5+0.9*Wn[i]; X.rw[i]=y; }
      for(i=T-1;i>=0;i--) X.rw[i]-=X.rw[0];
    }
    /* HP trend: solve (I + lam K'K) tau = x, K the second difference matrix, by banded Cholesky */
    function hp(x,n,lam){
      var tau=new Float64Array(n), i, d, o1, l0=new Float64Array(n), l1=new Float64Array(n), l2=new Float64Array(n), y=new Float64Array(n), sx=0, st2=0, stt=0, sxt=0, b1;
      if(lam===0){ for(i=0;i<n;i++) tau[i]=x[i]; return tau; }
      if(lam===Infinity || n<4){
        for(i=0;i<n;i++){ sx+=x[i]; st2+=i; stt+=i*i; sxt+=i*x[i]; }
        b1=(n*sxt-st2*sx)/(n*stt-st2*st2);
        for(i=0;i<n;i++) tau[i]=(sx-b1*st2)/n+b1*i;
        return tau;
      }
      function diag(i){ return 1+lam*((i===0||i===n-1)?1:(i===1||i===n-2)?5:6); }
      function off1(i){ return lam*((i===0||i===n-2)?-2:-4); }
      for(i=0;i<n;i++){
        d=diag(i)-(i>0?l1[i-1]*l1[i-1]:0)-(i>1?l2[i-2]*l2[i-2]:0);
        l0[i]=Math.sqrt(d);
        if(i<n-1){ o1=off1(i)-(i>0?l2[i-1]*l1[i-1]:0); l1[i]=o1/l0[i]; }
        if(i<n-2) l2[i]=lam/l0[i];
      }
      for(i=0;i<n;i++) y[i]=(x[i]-(i>0?l1[i-1]*y[i-1]:0)-(i>1?l2[i-2]*y[i-2]:0))/l0[i];
      for(i=n-1;i>=0;i--) tau[i]=(y[i]-(i<n-1?l1[i]*tau[i+1]:0)-(i<n-2?l2[i]*tau[i+2]:0))/l0[i];
      return tau;
    }
    /* Hamilton (2018): regress x(t+8) on a constant and x(t), ..., x(t-3); the fitted value is the trend at t+8.
       Same span, better conditioned: x(t+8) - x(t) on 1, x(t), and three first differences. */
    function ham(x,n){
      var tau=new Float64Array(n), i, j, k, rows=[], ys=[], A=[], bv=[0,0,0,0,0], mean=0, t, r, piv, tmp, f;
      for(i=0;i<n;i++){ tau[i]=NaN; mean+=x[i]/n; }
      for(t=3;t+8<n;t++){ rows.push([1,x[t]-mean,x[t]-x[t-1],x[t-1]-x[t-2],x[t-2]-x[t-3]]); ys.push(x[t+8]-x[t]); }
      if(rows.length<10) return tau;
      for(j=0;j<5;j++){ A.push([0,0,0,0,0,0]); }
      for(r=0;r<rows.length;r++) for(j=0;j<5;j++){ for(k=0;k<5;k++) A[j][k]+=rows[r][j]*rows[r][k]; A[j][5]+=rows[r][j]*ys[r]; }
      for(j=0;j<5;j++){
        piv=j; for(k=j+1;k<5;k++) if(Math.abs(A[k][j])>Math.abs(A[piv][j])) piv=k;
        tmp=A[j]; A[j]=A[piv]; A[piv]=tmp;
        for(k=j+1;k<5;k++){ f=A[k][j]/A[j][j]; for(i=j;i<6;i++) A[k][i]-=f*A[j][i]; }
      }
      for(j=4;j>=0;j--){ f=A[j][5]; for(k=j+1;k<5;k++) f-=A[j][k]*bv[k]; bv[j]=f/A[j][j]; }
      for(r=0;r<rows.length;r++){ f=ys[r]; for(j=0;j<5;j++) f-=rows[r][j]*bv[j]; tau[r+3+8]=x[r+3+8]-f; }
      return tau;
    }
    function trend(x,n){ return flt==='ham'?ham(x,n):hp(x,n,LAMS[lamk]); }
    function stats(){
      var x=X[data], n=cut, tr=trend(x,n), full=cut<T?trend(x,T):tr, i, a=[], b=[], ma=0, mb=0, saa=0, sbb=0, sab=0, m;
      st={data:data, flt:flt, lamk:lamk, laminf:lamk===LAMS.length-1, lam:lamk===LAMS.length-1?-1:LAMS[lamk], cut:cut, year:cut/4, sample:seed-SEED, lmoves:lmoves};
      X.tr=tr; X.full=full;
      for(i=0;i<n;i++) if(!isNaN(tr[i])){ a.push(x[i]-tr[i]); b.push(data==='tc'?X.cyc[i]:0); }
      m=a.length;
      for(i=0;i<m;i++){ ma+=a[i]/m; mb+=b[i]/m; }
      for(i=0;i<m;i++){ saa+=(a[i]-ma)*(a[i]-ma); sbb+=(b[i]-mb)*(b[i]-mb); sab+=(a[i]-ma)*(b[i]-mb); }
      st.sdc=Math.sqrt(saa/m); st.sdt=Math.sqrt(sbb/m);
      st.corr=(data==='tc' && saa>1e-12)?sab/Math.sqrt(saa*sbb):'none';
      st.rt=x[n-1]-tr[n-1]; st.fin=x[n-1]-full[n-1]; st.rev=st.fin-st.rt; st.tru=data==='tc'?X.cyc[n-1]:0;
    }
    function draw(){
      var g, items, rows, i, v;
      W=measure(svg); frame(svg,W,H);
      items=[['line','ma1-data','log GDP, estimated cycle'],['line','ma1-trend','estimated trend']];
      if(data==='tc') items.push(['line','ma1-true','true trend and cycle']);
      items.push(['line','ma1-later','full sample estimate'],['line','ma1-rev','revision']);
      rows=key(S('g',null,svg),items,8,12,W-6);
      el.mL=40; el.mR=12;
      el.tA=rows*16+20; el.bA=el.tA+104; el.tB=el.bA+30; el.bB=el.tB+104; H=el.bB+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      el.xs=NF.lin(0,T-1,el.mL,W-el.mR);
      g=S('g',null,svg);
      for(v=0;v<=50;v+=10){ i=C(el.xs(Math.min(T-1,v*4))); line(g,i,el.tA,i,el.bA,'nf-grid'); line(g,i,el.tB,i,el.bB,'nf-grid'); if(v<50) text(g,el.xs(v*4),el.bB+16,String(v),null,'middle'); }
      el.yA=S('g',null,svg); el.yB=S('g',null,svg);
      text(g,el.mL+6,el.tA+12,'log GDP × 100','nf-title nf-halo');
      text(g,el.mL+6,el.tB+12,'cycle, %','nf-title nf-halo');
      text(g,W-el.mR,el.bB+16,'years','nf-title nf-halo','end');
      el.gA=clip(svg,el.mL,el.tA,W-el.mR-el.mL,el.bA-el.tA);
      el.gB=clip(svg,el.mL,el.tB,W-el.mR-el.mL,el.bB-el.tB);
      el.cutA=line(el.gA,0,0,0,0,'nf-guide'); el.cutB=line(el.gB,0,0,0,0,'nf-guide');
      el.trueA=S('path',{'class':'ma1-true'},el.gA);
      el.fut=S('path',{'class':'ma1-data ma1-future'},el.gA);
      el.dat=S('path',{'class':'ma1-data'},el.gA);
      el.trA=S('path',{'class':'ma1-trend'},el.gA);
      el.zero=line(el.gB,0,0,0,0,'nf-ax');
      el.trueB=S('path',{'class':'ma1-true'},el.gB);
      el.later=S('path',{'class':'ma1-later'},el.gB);
      el.cyc=S('path',{'class':'ma1-trend ma1-cyc'},el.gB);
      el.rev=line(el.gB,0,0,0,0,'ma1-rev');
      el.d1=S('circle',{r:3.5,'class':'ma1-rdot'},el.gB);
      el.d2=S('circle',{r:3.5,'class':'ma1-ldot'},el.gB);
      update();
    }
    function nice(lo,hi){ var span=hi-lo, step=span>150?50:span>60?25:span>30?10:5, a=Math.ceil(lo/step)*step, t=[], v; for(v=a;v<=hi+1e-9;v+=step) t.push(v); return t; }
    function update(){ stats(); paint(); if(api) api.changed(); }
    function paint(){
      var x=X[data], xs=el.xs, i, lo=Infinity, hi=-Infinity, ya, yb, tA, m=0, p, q, s, mags=[2,3,4,6,8,12,16,24,32], yv;
      for(i=0;i<T;i++){ lo=Math.min(lo,x[i]); hi=Math.max(hi,x[i]); }
      tA=nice(lo,hi);
      ya=NF.lin(lo-(hi-lo)*0.04,hi+(hi-lo)*0.04,el.bA,el.tA+16);
      for(i=0;i<cut;i++) if(!isNaN(X.tr[i])) m=Math.max(m,Math.abs(x[i]-X.tr[i]),data==='tc'?Math.abs(X.cyc[i]):0);
      if(cut<T) for(i=0;i<T;i++) if(!isNaN(X.full[i])) m=Math.max(m,Math.abs(x[i]-X.full[i]));
      for(i=0;i<mags.length && mags[i]<m*1.05;i++);
      m=mags[Math.min(i,mags.length-1)];
      yb=NF.lin(-m,m,el.bB,el.tB+16);
      while(el.yA.firstChild) el.yA.removeChild(el.yA.firstChild);
      while(el.yB.firstChild) el.yB.removeChild(el.yB.firstChild);
      for(i=0;i<tA.length;i++){ yv=C(ya(tA[i])); line(el.yA,el.mL,yv,W-el.mR,yv,'nf-grid'); text(el.yA,el.mL-6,ya(tA[i])+4,tl(tA[i]),null,'end'); }
      [-m,0,m].forEach(function(v){ var yy=C(yb(v)); if(v) line(el.yB,el.mL,yy,W-el.mR,yy,'nf-grid'); text(el.yB,el.mL-6,yb(v)+4,tl(v),null,'end'); });
      setLine(el.zero,el.mL,C(yb(0)),W-el.mR,C(yb(0)));
      function path(f,a,b,sc){ var pts=[], j, v2, d=''; for(j=a;j<b;j++){ v2=f(j); if(isNaN(v2)){ if(pts.length>1) d+=poly(pts); pts=[]; continue; } pts.push([xs(j),sc(v2)]); } if(pts.length>1) d+=poly(pts); return d; }
      el.dat.setAttribute('d',path(function(j){ return x[j]; },0,cut,ya));
      el.fut.setAttribute('d',cut<T?path(function(j){ return x[j]; },cut-1,T,ya):'');
      el.trA.setAttribute('d',path(function(j){ return X.tr[j]; },0,cut,ya));
      el.trueA.setAttribute('d',data==='tc'?path(function(j){ return X.tau[j]; },0,T,ya):'');
      el.trueB.setAttribute('d',data==='tc'?path(function(j){ return X.cyc[j]; },0,T,yb):'');
      el.cyc.setAttribute('d',path(function(j){ return x[j]-X.tr[j]; },0,cut,yb));
      if(cut<T){
        el.later.setAttribute('d',path(function(j){ return x[j]-X.full[j]; },0,T,yb));
        p=xs(cut-1);
        setLine(el.cutA,p,el.tA,p,el.bA); setLine(el.cutB,p,el.tB,p,el.bB);
        if(!isNaN(st.rt) && !isNaN(st.fin)){
          setLine(el.rev,p,yb(st.rt),p,yb(st.fin)); at(el.d1,p,yb(st.rt)); at(el.d2,p,yb(st.fin));
          el.d1.setAttribute('r',3.5); el.d2.setAttribute('r',3.5);
        }
      } else {
        el.later.setAttribute('d',''); setLine(el.cutA,0,0,0,0); setLine(el.cutB,0,0,0,0); setLine(el.rev,0,0,0,0);
        el.d1.setAttribute('r',0); el.d2.setAttribute('r',0);
      }
      if(!out) return;
      q=flt==='ham'?'Hamilton, h = 8:':(st.laminf?'HP, λ = ∞:':'HP, λ = '+lamText(lamk)+':');
      if(flt==='hp' && lamk===0) s=q+' the trend is the data, so the cycle is 0';
      else s=q+' sd of the cycle '+fmt(st.sdc,2)+'%'+(data==='tc'?' (true '+fmt(st.sdt,2)+'%), correlation with the true cycle '+fmt(st.corr,2):', from a random walk, which has no cycle');
      if(cut<T) s+='\nat year '+tl(cut/4)+': cycle '+fmt(st.rt,2)+'% in real time, '+fmt(st.fin,2)+'% once the sample runs to year 50 (revision '+(st.rev>=0?'+':'')+fmt(st.rev,2)+')';
      out.textContent=s;
    }
    /* the Try it steps read the data and filter, the lambda index (lamk, 11 is infinity), the cycle's sd and its
       correlation with the true cycle, and at the end of a cut sample the real time and full sample cycles */
    api=NF.api({
      get:function(){ return copy(st); },
      set:function(o){
        if('sample' in o && seed!==SEED+(+o.sample)){ seed=SEED+(+o.sample); gen(); draw(); }
        if('data' in o) NF.press(fig,'data-data',String(o.data));
        if('flt' in o) NF.press(fig,'data-flt',String(o.flt));
        if('lamk' in o && rl) rl.set(+o.lamk);
        if('cut' in o && rc) rc.set(+o.cut);
      }
    });
    gen(); lock(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. The HP filter in the frequency domain ---------- */
  NF.register('ma1-gain',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var f=4, lam=1600, W=520, H=270, el={}, st={}, api, moves=0, PLO=0.5, PHI=50, SNAP=[1,6.25,25,100,400,1600,6400,14400,25600,129600];
    var NAME={1:'years',4:'quarters',12:'months'};
    var rl=NF.range(fig,'lam',2,function(v){ lam=snap(Math.pow(10,v)); moves++; label(); update(); });
    function snap(v){ var i; for(i=0;i<SNAP.length;i++) if(Math.abs(Math.log(v/SNAP[i])/Math.LN10)<0.006) return SNAP[i]; var d=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)-2); return Math.max(1,Math.round(v/d)*d); }
    function label(){ var e=rl && rl.wrap.querySelector('.nfig-val'); if(e) e.textContent=lam>=10000?big(lam):tl(lam); }
    /* set the slider to show lam without moving lam to the slider's grid */
    function showLam(){ if(!rl) return; var lo=parseFloat(rl.el.min), hi=parseFloat(rl.el.max), v=clamp(Math.log(lam)/Math.LN10,lo,hi); rl.el.value=String(v); rl.el.style.setProperty('--p',((v-lo)/(hi-lo)*100).toFixed(1)+'%'); label(); }
    if(rl){ lam=snap(Math.pow(10,rl.v())); label(); }
    f=+(NF.seg(fig,'data-fq',function(v){ f=+v; update(); }) || 4);
    onClick(fig,'.ma1-ru',function(){ lam=1600*Math.pow(f/4,4); moves++; showLam(); update(); });
    function gain(w,l){ var x=1-Math.cos(w), a=4*l*x*x; return a/(1+a); }
    /* power of the HP cycle of a random walk, up to a constant: gain squared over 2(1 - cos w) */
    function rwpow(w,l){ var x=1-Math.cos(w), a=4*l*x*x; return 8*l*l*x*x*x/((1+a)*(1+a)); }
    function halfObs(l){ var x=1/(2*Math.sqrt(l)); return x>=2?NaN:2*Math.PI/Math.acos(1-x); }
    function peakObs(l){ var x=Math.sqrt(3/(4*l)); return x>=2?2:2*Math.PI/Math.acos(1-x); }
    function draw(){
      var g, items, rows, t=[0.5,1,2,4,8,16,32], i, xs;
      W=measure(svg); frame(svg,W,H);
      items=[['line','ma1-gainl','share kept in the cycle'],['line','ma1-ref','quarterly, λ = 1600'],['line','ma1-spur','HP cycle of a random walk (scaled)'],['rect','ma1-band ma1-sw','6 to 32 quarters']];
      rows=key(S('g',null,svg),items,8,12,W-6);
      el.mL=36; el.mR=14; el.top=rows*16+22; el.bot=el.top+176; H=el.bot+34;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      el.xs=xs=function(P){ return el.mL+Math.log(P/PLO)/Math.log(PHI/PLO)*(W-el.mR-el.mL); };
      el.ys=NF.lin(0,1.08,el.bot,el.top);
      g=S('g',null,svg);
      el.band=S('rect',{y:el.top,height:el.bot-el.top,'class':'ma1-band'},g);
      el.nyq=S('rect',{y:el.top,height:el.bot-el.top,'class':'ma1-nyq'},g);
      for(i=0;i<t.length;i++){ line(g,C(xs(t[i])),el.top,C(xs(t[i])),el.bot,'nf-grid'); text(g,xs(t[i]),el.bot+16,tl(t[i]),null,'middle'); }
      NF.yGrid(g,el.ys,[0,0.5,1],el.mL,W-el.mR);
      text(g,W-el.mR,el.bot+30,'length of the cycle, years (log scale)','nf-title','end');
      text(g,el.mL-6,el.top-8,'G','nf-title','end');
      el.gc=clip(svg,el.mL,el.top-4,W-el.mR-el.mL,el.bot-el.top+4);
      el.ref=S('path',{'class':'ma1-ref'},el.gc);
      el.spur=S('path',{'class':'ma1-spur'},el.gc);
      el.curve=S('path',{'class':'ma1-gainl'},el.gc);
      el.h1=line(el.gc,0,0,0,0,'ma1-half'); el.h2=line(el.gc,0,0,0,0,'ma1-half');
      el.hd=S('circle',{r:3.5,'class':'ma1-rdot'},el.gc);
      el.pk=line(el.gc,0,0,0,0,'ma1-pkline');
      el.pd=S('circle',{r:3.5,'class':'ma1-pdot'},el.gc);
      el.hl=text(svg,0,0,'','ma1-red nf-halo','middle');
      el.pl=text(svg,0,0,'','ma1-purple nf-halo','middle');
      update();
    }
    function curve(fn,fq,l,norm){
      var p=[], i, P, lo=Math.max(PLO,2/fq), n=260, v;
      for(i=0;i<=n;i++){ P=lo*Math.pow(PHI/lo,i/n); v=fn(2*Math.PI/(P*fq),l)/norm; p.push([el.xs(P),el.ys(v)]); }
      return poly(p);
    }
    function update(){ calc(); paint(); if(api) api.changed(); }
    function calc(){
      var h=halfObs(lam), pk=peakObs(lam);
      st={f:f, lam:lam, moves:moves, ru:Math.abs(lam-1600*Math.pow(f/4,4))<1e-6*lam, half:h, halfy:h/f, peak:pk, peaky:pk/f,
        keep8:gain(2*Math.PI/(8*f),lam)};
    }
    function paint(){
      var xs=el.xs, ys=el.ys, pmax=rwpow(2*Math.PI/st.peak,lam), x, y, lo=Math.max(PLO,2/f);
      el.band.setAttribute('x',R(xs(1.5))); el.band.setAttribute('width',R(xs(8)-xs(1.5)));
      el.nyq.setAttribute('x',R(el.mL)); el.nyq.setAttribute('width',R(Math.max(0,xs(lo)-el.mL)));
      el.ref.setAttribute('d',(f===4 && lam===1600)?'':curve(gain,4,1600,1));
      el.curve.setAttribute('d',curve(gain,f,lam,1));
      el.spur.setAttribute('d',curve(rwpow,f,lam,pmax));
      if(isFinite(st.halfy) && st.halfy>=lo && st.halfy<=PHI){
        x=xs(st.halfy); y=ys(0.5);
        setLine(el.h1,el.mL,y,x,y); setLine(el.h2,x,y,x,el.bot); at(el.hd,x,y); el.hd.setAttribute('r',3.5);
        moveTo(el.hl,clamp(x+8,el.mL+4,W-el.mR-110),y+16); el.hl.setAttribute('text-anchor','start'); el.hl.textContent='half at '+fmt(st.halfy,1)+' yrs';
      } else { setLine(el.h1,0,0,0,0); setLine(el.h2,0,0,0,0); el.hd.setAttribute('r',0); el.hl.textContent=''; }
      if(st.peaky>=lo && st.peaky<=PHI){
        x=xs(st.peaky); y=ys(1);
        setLine(el.pk,x,y,x,el.bot); at(el.pd,x,y); el.pd.setAttribute('r',3.5);
        moveTo(el.pl,clamp(x,el.mL+40,W-el.mR-40),y-7); el.pl.textContent='peak '+fmt(st.peaky,1)+' yrs';
      } else { setLine(el.pk,0,0,0,0); el.pd.setAttribute('r',0); el.pl.textContent=''; }
      if(!out) return;
      out.textContent='λ = '+(lam>=10000?big(lam):tl(lam))+', '+f+' observation'+(f>1?'s':'')+' a year:  half of a cycle is kept at '+fmt(st.half,1)+' '+NAME[f]+(f>1?' ('+fmt(st.halfy,2)+' years)':'')+';  an 8 year cycle keeps '+fmt(st.keep8,2)+
        '\nthe HP cycle of a random walk peaks at '+fmt(st.peak,1)+' '+NAME[f]+(f>1?' ('+fmt(st.peaky,2)+' years)':'')+(st.ru?';  this is the Ravn Uhlig λ for this frequency':'');
    }
    /* the Try it steps read the frequency f, lam, whether lam is the Ravn Uhlig value (ru), the half gain period and
       the random walk peak (in observations and in years), and the share of an 8 year cycle kept; set takes f and lam */
    api=NF.api({
      get:function(){ return copy(st); },
      set:function(o){
        if('f' in o) NF.press(fig,'data-fq',String(o.f));
        if('lam' in o){ lam=+o.lam; moves++; showLam(); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Two period consumption choice: MRS = MRT ---------- */
  NF.register('ma1-euler',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var P={r:0.05,beta:0.95,sigma:2}, E=[45,75], MAX=130, W=520, H=360, Q, el={}, hs=[], st={}, api;
    var rs={
      r:rng(fig,'r',function(v){ return pct(v,1); },function(v){ P.r=v; update(); }),
      beta:rng(fig,'beta',function(v){ return fmt(v,2); },function(v){ P.beta=v; update(); }),
      sigma:rng(fig,'sigma',function(v){ return fmt(v,2); },function(v){ P.sigma=v; update(); })
    }, k;
    for(k in rs) if(rs[k]) P[k]=rs[k].v();
    function moveE(x,y){ var a=clamp(Math.round(x),0,120), b=clamp(Math.round(y),0,120); if(a+b===0) a=1; E=[a,b]; update(); }
    function calc(){
      var s=P.sigma, b=P.beta, Rr=1+P.r, w=E[0]+E[1]/Rr, m=1/(1+Math.pow(b,1/s)*Math.pow(Rr,1/s-1)), ct=m*w, gr=Math.pow(b*Rr,1/s), o;
      o={r:P.r, R:Rr, rgross:Rr, beta:b, sigma:s, yt:E[0], yt1:E[1], w:w, ct:ct, ct1:gr*ct, growth:gr, s:E[0]-ct};
      /* at E on an axis the curve through E is vertical (no fruit today) or flat (none tomorrow) */
      o.mrse=(E[0]>0 && E[1]>0)?MU(E[0],s)/(b*MU(E[1],s)):(E[1]===0?0:Infinity);
      o.mrso=MU(ct,s)/(b*MU(gr*ct,s));
      o.euler=MU(ct,s)-b*Rr*MU(gr*ct,s);
      o.role=o.s>0.005?'saver':o.s<-0.005?'borrower':'neither';
      return o;
    }
    function draw(){
      var items=[['line','ma1-budget','budget line, slope −R'],['line','ma1-ic','indifference curves'],['line','ma1-mrs','slope of the curve at E'],['line','ma1-ray','Euler ray']], rows, g, v, side, x0, top;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),items,8,12,W-6);
      top=rows*16+22; side=Math.min(W-64,320); x0=Math.round((W-side)/2)+12;
      Q={x0:x0, top:top, side:side};
      Q.sx=function(v){ return x0+v/MAX*side; }; Q.sy=function(v){ return top+(MAX-v)/MAX*side; };
      Q.sx.inv=function(p){ return (p-x0)/side*MAX; }; Q.sy.inv=function(p){ return MAX-(p-top)/side*MAX; };
      H=top+side+30; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      g=S('g',null,svg);
      for(v=0;v<=MAX;v+=20){ line(g,C(Q.sx(v)),top,C(Q.sx(v)),top+side,v?'nf-grid':'nf-ax'); line(g,x0,C(Q.sy(v)),x0+side,C(Q.sy(v)),v?'nf-grid':'nf-ax'); text(g,Q.sx(v),top+side+15,String(v),null,'middle'); text(g,x0-6,Q.sy(v)+4,String(v),null,'end'); }
      sublab(g,x0+side+8,top+side+15,['c',['t']],'nf-title ma1-it');
      sublab(g,x0-6,top-8,['c',['t+1']],'nf-title ma1-it','end');
      el.gc=clip(svg,x0,top,side,side);
      el.ray=line(el.gc,0,0,0,0,'ma1-ray');
      el.icE=S('path',{'class':'ma1-ic ma1-icE'},el.gc);
      el.icO=S('path',{'class':'ma1-ic'},el.gc);
      el.bud=line(el.gc,0,0,0,0,'ma1-budget');
      el.mrs=line(el.gc,0,0,0,0,'ma1-mrs');
      el.arr=vec(el.gc,'ma1-arrow','ma1-arrowh');
      el.o=S('circle',{r:5,'class':'ma1-odot'},el.gc);
      el.ol=text(el.gc,0,0,'O','nf-lab nf-halo');
      el.el=text(svg,0,0,'E','nf-lab nf-halo');
      hs=[handle(svg,'ma1-kn','Endowment E, arrow keys move it',function(dx,dy,bg){ var s=bg?5:1; moveE(E[0]+dx*s,E[1]+dy*s); })];
      update();
    }
    function update(){ st=calc(); paint(); if(api) api.changed(); }
    function paint(){
      var sx=Q.sx, sy=Q.sy, s=P.sigma, b=P.beta, Rr=st.R, lv, pts, ex, ey, m, d, px, py;
      setLine(el.bud,sx(st.w),sy(0),sx(0),sy(Rr*st.w));
      setLine(el.ray,sx(0),sy(0),sx(MAX*2),sy(MAX*2*st.growth));
      lv=U(st.ct,s)+b*U(st.ct1,s);
      pts=icurve(lv,s,b,MAX*1.2,MAX);
      el.icO.setAttribute('d',poly(pts.map(function(p){ return [sx(p[0]),sy(Math.min(p[1],MAX*1.5))]; })));
      if(E[0]>0 && E[1]>0 && isFinite(st.mrse)){
        lv=U(E[0],s)+b*U(E[1],s);
        pts=icurve(lv,s,b,MAX*1.2,MAX);
        el.icE.setAttribute('d',poly(pts.map(function(p){ return [sx(p[0]),sy(Math.min(p[1],MAX*1.5))]; })));
        /* the tangent at E has slope -MRS; drawn 22 units long either side */
        m=st.mrse; d=22/Math.sqrt(1+m*m);
        setLine(el.mrs,sx(E[0]-d),sy(E[1]+m*d),sx(E[0]+d),sy(E[1]-m*d));
      } else { el.icE.setAttribute('d',''); setLine(el.mrs,0,0,0,0); }
      ex=sx(E[0]); ey=sy(E[1]); px=sx(st.ct); py=sy(st.ct1);
      if(!setVec(el.arr,ex,ey,px,py,7)) hideVec(el.arr);
      at(el.o,px,py); moveTo(el.ol,px,py+19); el.ol.setAttribute('text-anchor','middle');
      place(hs[0],ex,ey,E[0],'E = ('+E[0]+', '+E[1]+')');
      moveTo(el.el,ex-(E[0]<12?-10:18),ey+(E[1]>110?18:-9));
      if(!out) return;
      out.textContent='R = '+fmt(Rr,3)+'   at E = ('+E[0]+', '+E[1]+'): MRS = '+(isFinite(st.mrse)?fmt(st.mrse,3):'∞')+(st.mrse<Rr-1e-9?' < R, so save':st.mrse>Rr+1e-9?' > R, so borrow':' = R, so stay put')+
        '\noptimum O = ('+fmt(st.ct,2)+', '+fmt(st.ct1,2)+'), saving '+fmt(st.s,2)+', growth (βR)^(1/σ) = '+fmt(st.growth,4);
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[Q.sx(E[0]),Q.sy(E[1])]]; },
      function(i,x,y){ moveE(Q.sx.inv(x),Q.sy.inv(y)); },function(){ try{ hs[0].focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    /* the Try it steps read r, R (as rgross), beta, sigma, the endowment (yt, yt1), the optimum (ct, ct1), saving s, the MRS at E
       and at O, consumption growth and the role (saver, borrower); set moves the sliders and E */
    api=NF.api({
      get:function(){ var o=copy(st); if(!isFinite(o.mrse)) o.mrse='∞'; return o; },
      set:function(o){
        var q;
        for(q in rs) if(q in o && rs[q]) rs[q].set(+o[q]);
        if('yt' in o || 'yt1' in o) moveE('yt' in o?+o.yt:E[0],'yt1' in o?+o.yt1:E[1]);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. The endowment economy as an Edgeworth box ---------- */
  var boxN=0;
  NF.register('ma1-ge',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var P={R:1.05,g:0.1,s:0.7,beta:0.95,sigma:1}, YT=100, W=520, H=380, el={}, st={}, B, api;
    var rs={
      R:rng(fig,'R',function(v){ return fmt(v,3); },function(v){ P.R=v; update(); }),
      g:rng(fig,'g',function(v){ return pct(v,0); },function(v){ P.g=v; update(); }),
      s:rng(fig,'s',function(v){ return fmt(v,2); },function(v){ P.s=v; update(); }),
      beta:rng(fig,'beta',function(v){ return fmt(v,2); },function(v){ P.beta=v; update(); })
    }, k;
    for(k in rs) if(rs[k]) P[k]=rs[k].v();
    P.sigma=+(NF.seg(fig,'data-sg',function(v){ P.sigma=+v; update(); }) || 1);
    onClick(fig,'.ma1-clear',function(){ if(rs.R) rs.R.set(st.rstar); });
    function calc(){
      var s=P.sigma, b=P.beta, Rr=P.R, Y1=YT*(1+P.g), m=1/(1+Math.pow(b,1/s)*Math.pow(Rr,1/s-1)), gr=Math.pow(b*Rr,1/s),
          e1=[P.s*YT,(1-P.s)*Y1], e2=[(1-P.s)*YT,P.s*Y1], w1=e1[0]+e1[1]/Rr, w2=e2[0]+e2[1]/Rr, o;
      o={R:Rr, rate:Rr, r:Rr-1, g:P.g, s:P.s, beta:b, sigma:s, yt:YT, yt1:Y1, e1t:e1[0], e1t1:e1[1]};
      o.c1t=m*w1; o.c1t1=gr*o.c1t; o.c2t=m*w2; o.c2t1=gr*o.c2t;
      o.s1=e1[0]-o.c1t; o.s2=e2[0]-o.c2t; o.stot=o.s1+o.s2;
      o.rstar=Math.pow(1+P.g,s)/b; o.rsp=100*(o.rstar-1); o.delta=100*(1/b-1); o.approx=100*(1/b-1+s*P.g);
      o.clear=Math.abs(Rr-o.rstar)<=0.0005+1e-9;
      o.lender=o.s1>0.005?'1':o.s2>0.005?'2':'none';
      return o;
    }
    function draw(){
      var items=[['line','ma1-budget','price line through E, slope −R'],['line','ma1-diag','diagonal: equal growth'],['line','ma1-gap','excess demand']], rows, g, top, x0, u, defs, cp;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),items,8,12,W-6);
      top=rows*16+28; u=Math.min((W-90)/112,300/132);
      x0=Math.round((W-112*u)/2)+12;
      B={u:u, x0:x0, top:top, sx:function(v){ return x0+(v+6)*u; }, sy:function(v){ return top+(126-v)*u; }};
      H=top+132*u+34; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      g=S('g',null,svg);
      el.box=S('rect',{'class':'ma1-box'},g);
      el.l1=text(g,0,0,'household 1','nf-lab');
      el.l2=text(g,0,0,'household 2','nf-lab','end');
      el.t1=S('g',null,svg);
      /* everything inside is clipped to the box, whose height follows g */
      defs=S('defs',null,svg); cp=S('clipPath',{id:'ma1boxclip'+(++boxN)},defs);
      el.cr=S('rect',null,cp);
      el.gc=S('g',{'clip-path':'url(#ma1boxclip'+boxN+')'},svg);
      el.diag=line(el.gc,0,0,0,0,'ma1-diag');
      el.ic1=S('path',{'class':'ma1-ic1'},el.gc);
      el.ic2=S('path',{'class':'ma1-ic2'},el.gc);
      el.bud=line(el.gc,0,0,0,0,'ma1-budget');
      el.gap=line(el.gc,0,0,0,0,'ma1-gap');
      el.top=S('g',null,svg);
      el.o1=S('circle',{r:5,'class':'ma1-o1'},el.top);
      el.o2=S('circle',{r:5,'class':'ma1-o2'},el.top);
      el.ring=S('circle',{r:0,'class':'ma1-ring'},el.top);
      el.e=S('circle',{r:5,'class':'ma1-edot'},el.top);
      el.el=text(el.top,0,0,'E','nf-lab nf-halo');
      el.ol1=text(el.top,0,0,'1','ma1-c1 nf-halo','end');
      el.ol2=text(el.top,0,0,'2','ma1-c2 nf-halo');
      update();
    }
    function update(){ st=calc(); paint(); if(api) api.changed(); }
    function paint(){
      var sx=B.sx, sy=B.sy, Y1=st.yt1, s=P.sigma, b=P.beta, e=[st.e1t,st.e1t1], p, q, xa, xb, lv, pts, dx, dy, dl;
      el.box.setAttribute('x',R(sx(0))); el.box.setAttribute('y',R(sy(Y1))); el.box.setAttribute('width',R(sx(YT)-sx(0))); el.box.setAttribute('height',R(sy(0)-sy(Y1)));
      el.cr.setAttribute('x',R(sx(0))); el.cr.setAttribute('y',R(sy(Y1))); el.cr.setAttribute('width',R(sx(YT)-sx(0))); el.cr.setAttribute('height',R(sy(0)-sy(Y1)));
      moveTo(el.l1,sx(0),sy(0)+30); moveTo(el.l2,sx(YT),sy(Y1)-8);
      while(el.t1.firstChild) el.t1.removeChild(el.t1.firstChild);
      [0,50,100].forEach(function(v){ line(el.t1,C(sx(v)),sy(0),C(sx(v)),sy(0)+4,'nf-ax'); text(el.t1,sx(v),sy(0)+16,String(v),null,'middle'); });
      [0,50].concat([Math.round(Y1)]).forEach(function(v){ line(el.t1,sx(0)-4,C(sy(v)),sx(0),C(sy(v)),'nf-ax'); text(el.t1,sx(0)-7,sy(v)+4,String(v),null,'end'); });
      text(el.t1,sx(YT),sy(0)+30,'fruit today','nf-title','end');
      text(el.t1,sx(0)-7,sy(Y1)-8,'fruit tomorrow','nf-title','start');
      setLine(el.diag,sx(0),sy(0),sx(YT),sy(Y1));
      /* the price line through E, cut at the box */
      xa=Math.max(0,e[0]-(Y1-e[1])/st.R); xb=Math.min(YT,e[0]+e[1]/st.R);
      setLine(el.bud,sx(xa),sy(e[1]+st.R*(e[0]-xa)),sx(xb),sy(e[1]-st.R*(xb-e[0])));
      /* household 1 from the bottom left corner, household 2 from the top right */
      lv=U(st.c1t,s)+b*U(st.c1t1,s);
      pts=icurve(lv,s,b,YT*1.05,Y1);
      el.ic1.setAttribute('d',poly(pts.map(function(p2){ return [sx(p2[0]),sy(Math.min(p2[1],Y1*1.4))]; })));
      lv=U(st.c2t,s)+b*U(st.c2t1,s);
      pts=icurve(lv,s,b,YT*1.05,Y1);
      el.ic2.setAttribute('d',poly(pts.map(function(p2){ return [sx(YT-p2[0]),sy(Y1-Math.min(p2[1],Y1*1.4))]; })));
      p=[sx(st.c1t),sy(st.c1t1)]; q=[sx(YT-st.c2t),sy(Y1-st.c2t1)];
      at(el.o1,p[0],p[1]); at(el.o2,q[0],q[1]);
      setLine(el.gap,p[0],p[1],q[0],q[1]);
      el.ring.setAttribute('r',st.clear?9:0); at(el.ring,p[0],p[1]);
      at(el.e,sx(e[0]),sy(e[1]));
      moveTo(el.el,sx(e[0])+(e[0]>YT*0.85?-16:9),sy(e[1])+(e[1]<12?-9:16));
      /* the two labels sit on either side of the segment from 1 to 2, so they never cover each other */
      dx=q[0]-p[0]; dy=q[1]-p[1]; dl=Math.hypot(dx,dy);
      if(dl<1){ dx=1; dy=0; dl=1; }
      moveTo(el.ol1,p[0]-dx/dl*11-3,p[1]-dy/dl*11+4); moveTo(el.ol2,q[0]+dx/dl*11+3,q[1]+dy/dl*11+4);
      if(!out) return;
      out.textContent='R = '+fmt(st.R,3)+':  household 1 saves '+fmt(st.s1,2)+', household 2 saves '+fmt(st.s2,2)+', total '+fmt(st.stot,2)+
        (st.clear?', so the market clears':st.stot<0?', more borrowing than lending, so R must rise':', more lending than borrowing, so R must fall')+
        '\nR* = (1 + g)^σ/β = '+fmt(st.rstar,3)+'   r* = '+fmt(st.rsp,1)+'%   δ + σg = '+fmt(st.approx,1)+'%';
    }
    /* the Try it steps read R (as rate), the totals, the split s, beta and sigma, each household's choice and saving (s1, s2,
       stot), the market clearing R* (rstar, and rsp in percent), delta + sigma g in percent (approx), and clear */
    api=NF.api({
      get:function(){ return copy(st); },
      set:function(o){
        var q;
        if('sigma' in o) NF.press(fig,'data-sg',String(o.sigma));
        ['g','s','beta'].forEach(function(q2){ if(q2 in o && rs[q2]) rs[q2].set(+o[q2]); });
        if('rate' in o && rs.R) rs.R.set(+o.rate);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
