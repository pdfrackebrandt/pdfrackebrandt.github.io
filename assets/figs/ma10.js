/* Core Macroeconomics L10 figures: Mankiw's (1986) credit market with adverse selection.
   The model, as in the note. A project costs 1 and pays theta = thetabar/p with probability p, p ~ U[0, 1], so every
   project has expected output thetabar. A banker with net worth N borrows 1 - N at the gross loan rate r and repays only
   on success (limited liability), so it invests iff thetabar - p r (1 - N) >= R N, that is p <= pbar(r) =
   (thetabar - R N)/(r (1 - N)). Borrowers succeed on average with Pi(r) = pbar/2. A mutual fund breaks even when
   r Pi(r) = R; with pbar < 1 its revenue r Pi(r) = (thetabar - R N)/(2 (1 - N)) does not depend on r, so R = thetabar/(2 - N).
   General equilibrium with CRRA utility: x = (beta R)^(1/gamma), c1 = (y + eN) thetabar/(x + thetabar), c2 = x c1,
   investment e pbar = c2/thetabar, r = 2R/pbar. The planner has the same formulas with R replaced by thetabar.
   Parameters as in the note: thetabar = 1.5, beta = 0.95, y = e = 1 (gamma = 2 unless a slider moves it).
   Every number on screen comes from these closed forms.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma10.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, key=NF.key,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- the model ---------- */
  var TH=1.5, BE=0.95, Y=1, E=1, G0=2;
  function depR(N){ return TH/(2-N); }
  function pbarRaw(r,dep,N){ return (TH-dep*N)/(r*(1-N)); }
  /* the allocation when households earn ret on saving: ret = R is the market, ret = thetabar the planner */
  function alloc(N,g,ret){
    var x=Math.pow(BE*ret,1/g), w=Y+E*N, c1=w*TH/(x+TH), c2=x*c1;
    return {x:x, c1:c1, c2:c2, inv:c2/TH, pb:c2/(TH*E), d:Y-c1};
  }
  function market(N,g){ var dep=depR(N), a=alloc(N,g,dep); a.dep=dep; a.r=2*dep/a.pb; return a; }
  function planner(N,g){ return alloc(N,g,TH); }
  function isLog(g){ return Math.abs(g-1)<1e-9; }
  function util(c1,c2,g){ return isLog(g) ? Math.log(c1)+BE*Math.log(c2) : (Math.pow(c1,1-g)+BE*Math.pow(c2,1-g))/(1-g); }
  /* share of first best consumption, in both periods, the household would give up to be as well off as in the market */
  function cev(a,q,g){
    var ua=util(a.c1,a.c2,g), uq=util(q.c1,q.c2,g);
    return isLog(g) ? 1-Math.exp((ua-uq)/(1+BE)) : 1-Math.pow(ua/uq,1/(1-g));
  }
  /* the indifference curve u(c1) + beta u(c2) = u0 as points (c1, c2) */
  function icPts(u0,g,lo,hi,cap){
    var pts=[], i, c1, c2, z;
    for(i=0;i<=220;i++){
      c1=lo+(hi-lo)*i/220;
      if(isLog(g)) c2=Math.exp((u0-Math.log(c1))/BE);
      else { z=(u0*(1-g)-Math.pow(c1,1-g))/BE; if(!(z>0)) continue; c2=Math.pow(z,1/(1-g)); }
      if(!isFinite(c2) || c2>cap) continue;
      pts.push([c1,c2]);
    }
    return pts;
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
      line(g,b.x,f,b.x+b.w,f,'nf-grid');
      text(g,b.x-6,sy(v)+4,(o.yf||tl)(v),null,'end');
    }
    line(g,b.x,C(b.y+b.h),b.x+b.w,C(b.y+b.h),'nf-ax');
    line(g,C(b.x),b.y,C(b.x),b.y+b.h,'nf-ax');
    if(o.xl) text(g,b.x+b.w,b.y+b.h+31,o.xl,'nf-title','end');
    if(o.yl) text(g,Math.max(4,b.x-36),b.y-11,o.yl,'nf-title');
    if(o.title) text(g,b.x+b.w,b.y-11,o.title,'nf-lab','end');
    return {sx:sx, sy:sy, b:b, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  function curve(P,pts){ return poly(pts.map(function(q){ return [P.sx(q[0]),P.sy(q[1])]; })); }
  function moveTo(e,x,y,anchor){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); if(anchor) e.setAttribute('text-anchor',anchor); }
  function show(e,on){ if(on) e.removeAttribute('visibility'); else e.setAttribute('visibility','hidden'); }
  function marginL(W){ return W<420?38:44; }
  /* a legend across the top; returns the y where the plot (with its axis name above it) may start */
  function head(svg,W,items){ var rows=key(S('g',null,svg),items,marginL(W),13,W-10); return 13+(rows-1)*16+12; }
  /* two plot boxes, side by side when the figure is wide, otherwise one above the other */
  function two(W,y0,ph){
    var L=marginL(W), Rm=12, B=40, gap=22, pw;
    if(W>=600){ pw=Math.floor((W-2*L-Rm-gap)/2); return {b1:{x:L,y:y0,w:pw,h:ph}, b2:{x:2*L+pw+gap,y:y0,w:pw,h:ph}, H:y0+ph+B}; }
    pw=W-L-Rm;
    return {b1:{x:L,y:y0,w:pw,h:ph}, b2:{x:L,y:y0+ph+B+26,w:pw,h:ph}, H:y0+2*ph+2*B+26};
  }
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
    h.setAttribute('aria-valuenow',+now.toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function add(out,s){ out.appendChild(document.createTextNode(s)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function plain(o){ var r={}, k; for(k in o) if(Object.prototype.hasOwnProperty.call(o,k) && typeof o[k]!=='object') r[k]=o[k]; return r; }

  /* ---------- 1. Who borrows: the cutoff pbar ---------- */
  NF.register('ma10-cutoff',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var D={r:3, n:0.5, p:0.2}, r=D.r, N=D.n, p=D.p, W=520, H=330, P=null, el={}, api=null, drag=false;
    var rr=range(fig,'r',2,function(v){ r=v; update(); });
    var rn=range(fig,'n',2,function(v){ N=v; update(); });
    if(rr) r=rr.v();
    if(rn) N=rn.v();
    function setP(v){ p=clamp(Math.round(v*100)/100,0.01,0.99); update(); }
    onClick(fig,'.nfig-reset',function(){ p=D.p; if(rn) rn.set(D.n); else N=D.n; if(rr) rr.set(D.r); else { r=D.r; update(); } });
    onClick(fig,'.ma10-toeq',function(){ var v=market(N,G0).r; if(rr) rr.set(Math.round(v*100)/100); else { r=v; update(); } });
    function state(){
      var dep=depR(N), raw=pbarRaw(r,dep,N), pb=Math.min(1,raw), v=TH-p*r*(1-N);
      return {r:r, n:N, p:p, dep:dep, raw:raw, pbar:pb, avg:pb/2, rev:r*pb/2, out:dep*N, theta:TH/p, owe:r*(1-N),
              v:Math.max(0,v), vraw:v, rep:Math.min(TH,p*r*(1-N)), borrow:v>=dep*N-1e-12?1:0, req:market(N,G0).r};
    }
    function draw(){
      var top, b, g, mL;
      W=measure(svg); mL=marginL(W); frame(svg,W,100);
      top=head(svg,W,[['line','ma10-pay','invest: θ̄ − p r(1 − N)'],['line','ma10-dep','deposit: RN'],['line','ma10-rep','expected repayment'],['rect','ma10-bandk','borrowers']]);
      b={x:mL,y:top+26,w:W-mL-14,h:Math.round(clamp(W*0.44,190,250))};
      H=b.y+b.h+40; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,b,[0,1],[0,1.75],{xt:[0,0.2,0.4,0.6,0.8,1],yt:[0,0.5,1,1.5],yf:function(v){ return v===1.5?'θ̄':tl(v); },
        xl:'success probability p',yl:'expected payoff'});
      g=P.gc;
      el.band=S('rect',{'class':'ma10-band'},g);
      line(g,b.x,C(P.sy(TH)),b.x+b.w,C(P.sy(TH)),'ma10-ref');
      el.dep=line(g,0,0,0,0,'ma10-dep');
      el.pay=S('path',{'class':'ma10-pay'},g);
      el.cut=line(g,0,0,0,0,'ma10-cut');
      el.rep=line(g,0,0,0,0,'ma10-rep');
      el.x=S('circle',{r:4,'class':'ma10-dcut'},g);
      el.tri=S('path',{'class':'ma10-avg'},g);
      el.tcut=text(svg,0,0,'','nf-lab nf-halo ma10-tcut');
      el.tavg=text(svg,0,0,'Π','nf-lab nf-halo ma10-tcut','middle');
      el.tdep=text(svg,0,0,'RN','nf-lab nf-halo','end');
      el.trep=text(svg,0,0,'','nf-lab nf-halo ma10-trep');
      el.k=knob(svg,'ma10-knob','A banker with success probability p; arrow keys move it',function(d,big){ setP(p+d*(big?0.1:0.01)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      if(!P) return;
      var s=state(), sx=P.sx, sy=P.sy, b=P.b, p0=Math.min(1,TH/(r*(1-N))), xc=sx(s.pbar), xk=sx(p), yk=sy(s.v), yt=sy(TH), mid;
      el.pay.setAttribute('d',poly([[sx(0),sy(TH)],[sx(p0),sy(TH-p0*r*(1-N))]].concat(p0<1?[[sx(1),sy(0)]]:[])));
      setLine(el.dep,b.x,sy(s.out),b.x+b.w,sy(s.out));
      moveTo(el.tdep,b.x+b.w-4,sy(s.out)-6);
      el.band.setAttribute('x',R(b.x)); el.band.setAttribute('y',R(b.y));
      el.band.setAttribute('width',R(Math.max(0,xc-b.x))); el.band.setAttribute('height',R(b.h));
      show(el.cut,s.raw<=1); show(el.x,s.raw<=1);
      setLine(el.cut,xc,b.y,xc,b.y+b.h); at(el.x,xc,sy(s.out));
      el.tcut.textContent=s.raw<=1?'p̄ = '+fmt(s.pbar,2):'p̄ ≥ 1: all borrow';
      if(xc>b.x+b.w-84) moveTo(el.tcut,xc-6,b.y+14,'end'); else moveTo(el.tcut,xc+6,b.y+14,'start');
      el.tri.setAttribute('d','M'+R(sx(s.avg)-5)+','+R(b.y+b.h)+'L'+R(sx(s.avg)+5)+','+R(b.y+b.h)+'L'+R(sx(s.avg))+','+R(b.y+b.h-8)+'Z');
      moveTo(el.tavg,sx(s.avg),b.y+b.h-12);
      /* the probe: its payoff on the blue line, and the orange bar up to thetabar, what it repays in expectation */
      setLine(el.rep,xk,yk,xk,yt);
      show(el.rep,yk-yt>2);
      mid=(yk+yt)/2+4;
      el.trep.textContent=yk-yt>16?'p r(1 − N) = '+fmt(s.rep,2):'';
      if(p>0.55) moveTo(el.trep,xk-9,mid,'end'); else moveTo(el.trep,xk+9,mid,'start');
      place(el.k,xk,yk,p,'p = '+fmt(p,2)+', expected payoff '+fmt(s.v,2)+(s.borrow?', borrows':', deposits'));
      if(!out) return;
      out.textContent='R = θ̄/(2 − N) = '+fmt(s.dep,3)+'   ';
      if(s.raw<=1) add(out,'p̄ = (θ̄ − RN)/(r(1 − N)) = '+fmt(s.pbar,3)+'   Π = p̄/2 = '+fmt(s.avg,3)+'   revenue rΠ = '+fmt(s.rev,3));
      else if(s.rev<s.dep-5e-4) warn(out,'p̄ ≥ 1: every banker borrows, Π = 0.5 and rΠ = r/2 = '+fmt(s.rev,3)+' < R, so the fund loses money');
      else add(out,'p̄ = 1: every banker borrows, Π = 0.5 and rΠ = r/2 = '+fmt(s.rev,3)+' = R');
      add(out,'\nbanker at p = '+fmt(p,2)+': θ = θ̄/p = '+fmt(s.theta,2)+', owes r(1 − N) = '+fmt(s.owe,2)+' on success, ');
      if(s.vraw>=0) add(out,'expects θ̄ − p r(1 − N) = '+fmt(s.v,2)+(s.borrow?' ≥ ':' < ')+'RN = '+fmt(s.out,2)+(s.borrow?': borrows':': deposits'));
      else add(out,'θ < r(1 − N), so limited liability leaves it 0 < RN = '+fmt(s.out,2)+': deposits');
      add(out,'\nequilibrium loan rate at this N: r = '+fmt(s.req,2)+' (β = 0.95, γ = 2, y = e = 1)');
    }
    svg.addEventListener('pointerdown',function(e){
      if(!P) return;
      var q=local(svg,e,W,H), b=P.b;
      if(q[0]<b.x-8 || q[0]>b.x+b.w+8 || q[1]<b.y-8 || q[1]>b.y+b.h+8) return;
      drag=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      try{ el.k.focus({preventScroll:true}); }catch(err){}
      setP(P.sx.inv(q[0]));
    });
    svg.addEventListener('pointermove',function(e){ if(!drag) return; var q=local(svg,e,W,H); setP(P.sx.inv(q[0])); });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1 || !P) return;
      var q=local(svg,e.touches[0],W,H);
      if(Math.hypot(q[0]-P.sx(p),q[1]-P.sy(state().v))<26) e.preventDefault();
    },{passive:false});
    /* Try it: reads r, n, p, the cutoff pbar (at most 1), the borrowers' average avg, revenue rev, the probe's payoff v,
       borrow (1 or 0) and the equilibrium loan rate req; sets r, n and p */
    api=NF.api({
      get:function(){ return plain(state()); },
      set:function(o){
        if('p' in o) p=clamp(Math.round(+o.p*100)/100,0.01,0.99);
        if('n' in o){ if(rn) rn.set(+o.n); else N=+o.n; }
        if('r' in o){ if(rr) rr.set(+o.r); else r=+o.r; }
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The mutual fund: revenue flat in r, zero profit pins R ---------- */
  NF.register('ma10-revenue',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var D={r:3, dep:0.8, n:0.5}, r=D.r, dep=D.dep, N=D.n, W=520, H=300, P1=null, P2=null, el={}, api=null;
    var rr=range(fig,'r',2,function(v){ r=v; update(); });
    var rd=range(fig,'dep',2,function(v){ dep=v; update(); });
    var rn=range(fig,'n',2,function(v){ N=v; update(); });
    if(rr) r=rr.v();
    if(rd) dep=rd.v();
    if(rn) N=rn.v();
    onClick(fig,'.nfig-reset',function(){
      if(rn) rn.set(D.n); else N=D.n;
      if(rd) rd.set(D.dep); else dep=D.dep;
      if(rr) rr.set(D.r); else { r=D.r; update(); }
    });
    function revAt(rv){ return rv*Math.min(1,pbarRaw(rv,dep,N))/2; }
    function flatAt(d){ return (TH-d*N)/(2*(1-N)); }
    function state(){
      var raw=pbarRaw(r,dep,N), pb=Math.min(1,raw), rev=r*pb/2;
      return {r:r, dep:dep, n:N, raw:raw, pbar:pb, avg:pb/2, rev:rev, profit:rev-dep, flat:flatAt(dep), rone:(TH-dep*N)/(1-N), rstar:depR(N)};
    }
    function draw(){
      var L;
      W=measure(svg); frame(svg,W,100);
      L=two(W,26,W>=600?200:186); H=L.H; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P1=box(svg,L.b1,[1,6],[0,1.6],{xt:[1,2,3,4,5,6],yt:[0,0.4,0.8,1.2,1.6],xl:'loan rate r',yl:'per unit lent',title:'at the deposit rate R'});
      P2=box(svg,L.b2,[0.5,1.6],[0,1.6],{xt:[0.6,0.8,1,1.2,1.4,1.6],yt:[0,0.4,0.8,1.2,1.6],xl:'deposit rate R',yl:'per unit lent',title:'zero profit'});
      el.fix=S('path',{'class':'ma10-fix'},P1.gc);
      el.cost=line(P1.gc,0,0,0,0,'ma10-cost');
      el.avg=S('path',{'class':'ma10-pi'},P1.gc);
      el.rev=S('path',{'class':'ma10-rev'},P1.gc);
      el.g1=line(P1.gc,0,0,0,0,'ma10-guide');
      el.d1=S('circle',{r:4.5,'class':'ma10-drev'},P1.gc);
      el.d2=S('circle',{r:4,'class':'ma10-dcut'},P1.gc);
      el.tcost=text(svg,0,0,'cost R','nf-lab nf-halo','end');
      el.trev=text(svg,0,0,'rΠ(r)','nf-lab nf-halo ma10-trev','end');
      el.tavg=text(svg,0,0,'Π(r)','nf-lab nf-halo ma10-tcut','end');
      el.tfix=text(svg,0,0,'pool fixed','nf-lab nf-halo ma10-tfix','end');
      el.cost2=line(P2.gc,0,0,0,0,'ma10-cost');
      el.flat=line(P2.gc,0,0,0,0,'ma10-rev');
      el.g2=line(P2.gc,0,0,0,0,'ma10-guide');
      el.gap=line(P2.gc,0,0,0,0,'ma10-gap');
      el.d3=S('circle',{r:4,'class':'ma10-drev'},P2.gc);
      el.d4=S('circle',{r:4,'class':'ma10-dcost'},P2.gc);
      el.sline=line(P2.gc,0,0,0,0,'ma10-sline');
      el.star=S('circle',{r:5,'class':'ma10-dstar'},P2.gc);
      el.tstar=text(svg,0,0,'','nf-lab nf-halo ma10-tstar');
      el.tflat=text(svg,0,0,'rΠ when p̄ < 1','nf-lab nf-halo ma10-trev','end');
      el.tcost2=text(svg,0,0,'cost R','nf-lab nf-halo','end');
      el.tgap=text(svg,0,0,'','nf-lab nf-halo');
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      if(!P1) return;
      var s=state(), a=[], c=[], rs=[], i, rv, b1=P1.b, b2=P2.b, x, y1, y2, rs2, ye, re, rst=s.rstar;
      for(i=0;i<=200;i++) rs.push(1+5*i/200);
      if(s.rone>1 && s.rone<6) rs.push(s.rone);
      rs.sort(function(u,v){ return u-v; });
      for(i=0;i<rs.length;i++){ rv=rs[i]; a.push([rv,Math.min(1,pbarRaw(rv,dep,N))/2]); c.push([rv,revAt(rv)]); }
      el.avg.setAttribute('d',curve(P1,a));
      el.rev.setAttribute('d',curve(P1,c));
      /* what revenue would be if the pool stayed as it is at the chosen r: r times today's average */
      re=Math.min(6,1.62/Math.max(s.avg,1e-6));
      el.fix.setAttribute('d',curve(P1,[[1,s.avg],[re,re*s.avg]]));
      ye=Math.min(1.5,6*s.avg); rs2=ye/s.avg;
      moveTo(el.tfix,P1.sx(rs2)-6,P1.sy(ye)-4);
      setLine(el.cost,b1.x,P1.sy(dep),b1.x+b1.w,P1.sy(dep));
      moveTo(el.tcost,b1.x+b1.w-4,P1.sy(dep)+15);
      x=P1.sx(r);
      setLine(el.g1,x,b1.y,x,b1.y+b1.h);
      at(el.d1,x,P1.sy(s.rev)); at(el.d2,x,P1.sy(s.avg));
      /* the revenue label sits at the right end, or where the curve leaves the top of the box */
      if(revAt(6)<=1.5){ moveTo(el.trev,b1.x+b1.w-4,P1.sy(revAt(6))-6,'end'); show(el.tfix,rs2>r+0.9); }
      else {
        var lo=1, hi=6, k, mm;
        for(k=0;k<50;k++){ mm=(lo+hi)/2; if(revAt(mm)<1.5) lo=mm; else hi=mm; }
        moveTo(el.trev,P1.sx(lo)+7,b1.y+14,'start');
        show(el.tfix,rs2>r+0.9 && Math.abs(P1.sx(rs2)-P1.sx(lo))>70);
      }
      moveTo(el.tavg,b1.x+b1.w-4,P1.sy(Math.min(1,pbarRaw(6,dep,N))/2)-6);
      /* zero profit in R: the flat revenue (thetabar - R N)/(2(1 - N)) against the cost R */
      setLine(el.cost2,P2.sx(0.5),P2.sy(0.5),P2.sx(1.6),P2.sy(1.6));
      setLine(el.flat,P2.sx(0.5),P2.sy(flatAt(0.5)),P2.sx(1.6),P2.sy(flatAt(1.6)));
      at(el.star,P2.sx(rst),P2.sy(rst));
      setLine(el.sline,P2.sx(rst),P2.sy(rst),P2.sx(rst),b2.y+b2.h);
      el.tstar.textContent='R* = θ̄/(2 − N) = '+fmt(rst,2);
      if(P2.sx(rst)>b2.x+b2.w-130) moveTo(el.tstar,P2.sx(rst)-6,b2.y+b2.h-8,'end'); else moveTo(el.tstar,P2.sx(rst)+6,b2.y+b2.h-8,'start');
      moveTo(el.tflat,b2.x+b2.w-4,P2.sy(flatAt(1.6))+16);
      moveTo(el.tcost2,P2.sx(1.53)-8,P2.sy(1.53)+4);
      x=P2.sx(dep); y1=P2.sy(s.flat); y2=P2.sy(dep);
      setLine(el.g2,x,b2.y,x,b2.y+b2.h);
      setLine(el.gap,x,y1,x,y2);
      at(el.d3,x,y1); at(el.d4,x,y2);
      el.tgap.textContent=Math.abs(y1-y2)<14?'':(s.flat>dep?'profit':'loss');
      /* the label goes on the side away from R*, where the two lines are apart, and stays inside the box */
      y1=clamp((Math.max(y1,b2.y)+Math.max(y2,b2.y))/2+4,b2.y+14,b2.y+b2.h-6);
      if(dep<rst && x-b2.x>52) moveTo(el.tgap,x-7,y1,'end'); else moveTo(el.tgap,x+7,y1,'start');
      if(!out) return;
      out.textContent='at r = '+fmt(r,2)+': p̄ = '+fmt(s.pbar,3)+', Π = '+fmt(s.avg,3)+', revenue rΠ = '+fmt(s.rev,3)+', cost R = '+fmt(dep,2)+': profit '+fmt(s.profit,3)+' per unit lent';
      if(s.raw<1) add(out,'\np̄ < 1, so rΠ = (θ̄ − RN)/(2(1 − N)) = '+fmt(s.flat,3)+' for every r ≥ r₁ = '+fmt(s.rone,2));
      else add(out,'\nr ≤ r₁ = '+fmt(s.rone,2)+': every banker borrows, Π = 0.5 and rΠ = r/2 rises with r');
      add(out,'\nzero profit with p̄ < 1: R* = θ̄/(2 − N) = '+fmt(rst,3));
      if(Math.abs(s.flat-dep)<0.005) add(out,', which is where you are');
      else if(s.flat>dep) add(out,'; at R = '+fmt(dep,2)+' revenue beats cost, so funds bid for deposits and R rises');
      else warn(out,'; at R = '+fmt(dep,2)+' cost beats revenue at every r, so R must fall');
    }
    /* Try it: reads r, dep (R), n, pbar, avg, rev, profit, flat (revenue when pbar < 1), rone and rstar; sets r, dep and n */
    api=NF.api({
      get:function(){ return state(); },
      set:function(o){
        if('n' in o){ if(rn) rn.set(+o.n); else N=+o.n; }
        if('dep' in o){ if(rd) rd.set(+o.dep); else dep=+o.dep; }
        if('r' in o){ if(rr) rr.set(+o.r); else r=+o.r; }
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. The wedge: saving at R while society earns thetabar ---------- */
  NF.register('ma10-ge',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* a fixed window that holds both allocations for every N in [0, 1] and gamma in [1, 5] */
    var D={n:0.5, g:2}, N=D.n, g=D.g, W=520, H=360, P=null, el={}, api=null, XD=[0.4,1.3], YD=[0.4,1.6];
    var rn=range(fig,'n',2,function(v){ N=v; update(); });
    var rg=range(fig,'gamma',1,function(v){ g=v; update(); });
    if(rn) N=rn.v();
    if(rg) g=rg.v();
    onClick(fig,'.nfig-reset',function(){ if(rg) rg.set(D.g); else g=D.g; if(rn) rn.set(D.n); else { N=D.n; update(); } });
    function state(){
      var a=market(N,g), q=planner(N,g);
      return {n:N, gamma:g, dep:a.dep, c1:a.c1, c2:a.c2, c1s:q.c1, c2s:q.c2, inv:a.inv, invs:q.inv, d:a.d,
              short:100*(1-a.inv/q.inv), loss:100*cev(a,q,g), ua:util(a.c1,a.c2,g), uq:util(q.c1,q.c2,g)};
    }
    function draw(){
      var top, b, gc;
      W=measure(svg); frame(svg,W,100);
      top=head(svg,W,[['line','ma10-res','resources: c₂ = θ̄(y + eN − c₁)'],['line','ma10-plan','first best, MRS = θ̄'],['line','ma10-as','market, MRS = R'],['line','ma10-bud','what households see: slope −R']]);
      b={x:marginL(W),y:top+26,w:W-marginL(W)-14,h:Math.round(clamp(W*0.56,220,300))};
      H=b.y+b.h+40; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,b,XD,YD,{xt:[0.4,0.6,0.8,1,1.2],yt:[0.4,0.6,0.8,1,1.2,1.4,1.6],xl:'consumption today c₁',yl:'consumption tomorrow c₂'});
      gc=P.gc;
      el.res=S('path',{'class':'ma10-res'},gc);
      el.icq=S('path',{'class':'ma10-plan ma10-ic'},gc);
      el.ica=S('path',{'class':'ma10-as ma10-ic'},gc);
      el.bud=S('path',{'class':'ma10-bud'},gc);
      el.gq=S('path',{'class':'ma10-gplan'},gc);
      el.ga=S('path',{'class':'ma10-gas'},gc);
      el.dq=S('circle',{r:5,'class':'ma10-dplan'},gc);
      el.da=S('circle',{r:5,'class':'ma10-das'},gc);
      el.tq=text(svg,0,0,'first best','nf-lab nf-halo ma10-tplan');
      el.ta=text(svg,0,0,'market','nf-lab nf-halo ma10-tas');
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      if(!P) return;
      var a=market(N,g), q=planner(N,g), s=state(), w=Y+E*N, sx=P.sx, sy=P.sy, lo=XD[0]-0.02, hi=XD[1]+0.02;
      el.res.setAttribute('d',curve(P,[[0,TH*w],[w,0]]));
      el.icq.setAttribute('d',curve(P,icPts(s.uq,g,lo,hi,YD[1]*1.5)));
      el.ica.setAttribute('d',curve(P,icPts(s.ua,g,lo,hi,YD[1]*1.5)));
      el.bud.setAttribute('d',curve(P,[[a.c1-0.45,a.c2+0.45*a.dep],[a.c1+0.45,a.c2-0.45*a.dep]]));
      el.gq.setAttribute('d','M'+R(sx(q.c1))+','+R(sy(YD[0]))+'V'+R(sy(q.c2))+'H'+R(sx(XD[0])));
      el.ga.setAttribute('d','M'+R(sx(a.c1))+','+R(sy(YD[0]))+'V'+R(sy(a.c2))+'H'+R(sx(XD[0])));
      at(el.dq,sx(q.c1),sy(q.c2)); at(el.da,sx(a.c1),sy(a.c2));
      /* first best label up and right, in the empty region above both indifference curves; market down and left */
      moveTo(el.tq,sx(q.c1)+9,sy(q.c2)-9,'start');
      moveTo(el.ta,sx(a.c1)-9,sy(a.c2)+17,'end');
      if(!out) return;
      out.textContent='R = θ̄/(2 − N) = '+fmt(s.dep,3)+(N>1-1e-9?' = θ̄: market and first best coincide':' < θ̄ = 1.5')+'   c₁ = '+fmt(s.c1,3)+' vs c₁* = '+fmt(s.c1s,3)+'   c₂ = '+fmt(s.c2,3)+' vs c₂* = '+fmt(s.c2s,3)+
        '\ninvestment ep̄ = '+fmt(s.inv,3)+' vs ep* = '+fmt(s.invs,3)+', '+fmt(s.short,1)+'% short   welfare loss: '+fmt(s.loss,2)+'% of first best consumption in both periods';
      if(s.d<0) add(out,'\ndeposits d = '+fmt(s.d,3)+' < 0: bankers hold more than the projects need, so workers borrow the rest from the fund');
      else add(out,'\ndeposits d = y − c₁ = '+fmt(s.d,3)+'   both points lie on the same resource line: only the slope households face differs');
    }
    api=NF.api({
      get:function(){ return state(); },
      set:function(o){
        if('gamma' in o){ if(rg) rg.set(+o.gamma); else g=+o.gamma; }
        if('n' in o){ if(rn) rn.set(+o.n); else N=+o.n; }
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Net worth: the deposit return and investment against N ---------- */
  NF.register('ma10-networth',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var D={n:0.5, g:2}, N=D.n, g=D.g, W=520, H=300, P1=null, P2=null, el={}, api=null, drag=0;
    var rn=range(fig,'n',2,function(v){ N=v; update(); });
    var rg=range(fig,'gamma',1,function(v){ g=v; update(); });
    if(rn) N=rn.v();
    if(rg) g=rg.v();
    onClick(fig,'.nfig-reset',function(){ if(rg) rg.set(D.g); else g=D.g; if(rn) rn.set(D.n); else { N=D.n; update(); } });
    function setN(v){ v=clamp(Math.round(v*100)/100,0,1); if(rn) rn.set(v); else { N=v; update(); } }
    function state(){
      var a=market(N,g), q=planner(N,g), self=N>1-1e-9;
      return {n:N, gamma:g, dep:a.dep, wedge:TH-a.dep, inv:a.inv, invs:q.inv, short:100*(1-a.inv/q.inv), pbar:a.pb,
              r:self?0:a.r, spread:self?0:a.r/a.dep, d:a.d, self:self?1:0};
    }
    function draw(){
      var top, L;
      W=measure(svg); frame(svg,W,100);
      top=head(svg,W,[['line','ma10-as','market'],['line','ma10-plan','first best'],['rect','ma10-wedgek','wedge θ̄ − R']]);
      L=two(W,top+26,W>=600?190:176); H=L.H; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P1=box(svg,L.b1,[0,1],[0,1.6],{xt:[0,0.25,0.5,0.75,1],yt:[0,0.4,0.8,1.2,1.6],xl:'banker net worth N',yl:'return on saving'});
      P2=box(svg,L.b2,[0,1],[0,1],{xt:[0,0.25,0.5,0.75,1],yt:[0,0.25,0.5,0.75,1],xl:'banker net worth N',yl:'investment'});
      el.wedge=S('path',{'class':'ma10-wedge'},P1.gc);
      el.th=line(P1.gc,0,0,0,0,'ma10-plan ma10-dash');
      el.R=S('path',{'class':'ma10-as'},P1.gc);
      el.g1=line(P1.gc,0,0,0,0,'ma10-guide');
      el.d1=S('circle',{r:4.5,'class':'ma10-das'},P1.gc);
      el.d1q=S('circle',{r:4,'class':'ma10-dplan'},P1.gc);
      el.invs=S('path',{'class':'ma10-plan ma10-dash'},P2.gc);
      el.inv=S('path',{'class':'ma10-as'},P2.gc);
      el.g2=line(P2.gc,0,0,0,0,'ma10-guide');
      el.d2=S('circle',{r:4.5,'class':'ma10-das'},P2.gc);
      el.d2q=S('circle',{r:4,'class':'ma10-dplan'},P2.gc);
      el.tth=text(svg,0,0,'θ̄','nf-lab nf-halo ma10-tplan');
      el.tR=text(svg,0,0,'R = θ̄/(2 − N)','nf-lab nf-halo ma10-tas');
      el.tinvs=text(svg,0,0,'ep*','nf-lab nf-halo ma10-tplan');
      el.tinv=text(svg,0,0,'ep̄','nf-lab nf-halo ma10-tas');
      el.k=knob(svg,'ma10-knob','Banker net worth N; arrow keys move it',function(d,big){ setN(N+d*(big?0.1:0.01)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      if(!P1) return;
      var s=state(), rp=[], ip=[], qp=[], i, n, a, q, x1, x2;
      for(i=0;i<=120;i++){ n=i/120; a=market(n,g); q=planner(n,g); rp.push([n,a.dep]); ip.push([n,a.inv]); qp.push([n,q.inv]); }
      el.R.setAttribute('d',curve(P1,rp));
      el.wedge.setAttribute('d',curve(P1,rp.concat([[1,TH],[0,TH]]))+'Z');
      setLine(el.th,P1.sx(0),P1.sy(TH),P1.sx(1),P1.sy(TH));
      el.inv.setAttribute('d',curve(P2,ip));
      el.invs.setAttribute('d',curve(P2,qp));
      x1=P1.sx(N); x2=P2.sx(N);
      setLine(el.g1,x1,P1.b.y,x1,P1.b.y+P1.b.h); setLine(el.g2,x2,P2.b.y,x2,P2.b.y+P2.b.h);
      at(el.d1,x1,P1.sy(s.dep)); at(el.d1q,x1,P1.sy(TH));
      at(el.d2,x2,P2.sy(s.inv)); at(el.d2q,x2,P2.sy(s.invs));
      moveTo(el.tth,P1.b.x+5,P1.sy(TH)-7);
      moveTo(el.tR,P1.b.x+5,P1.sy(rp[0][1])+16);
      moveTo(el.tinvs,P2.b.x+5,P2.sy(qp[0][1])-14);
      moveTo(el.tinv,P2.b.x+5,P2.sy(ip[0][1])+16);
      place(el.k,x1,P1.sy(s.dep),N,'N = '+fmt(N,2)+', R = '+fmt(s.dep,3));
      if(!out) return;
      out.textContent='N = '+fmt(N,2)+': R = θ̄/(2 − N) = '+fmt(s.dep,3)+' vs θ̄ = 1.5, wedge θ̄ − R = '+fmt(s.wedge,3)+
        '\ninvestment ep̄ = '+fmt(s.inv,3)+' vs ep* = '+fmt(s.invs,3)+', '+fmt(s.short,1)+'% short';
      if(s.self) add(out,'\nN = 1: bankers fund their projects themselves, nobody borrows, R = θ̄ and the market is efficient');
      else add(out,'\nloan rate r = 2R/p̄ = '+fmt(s.r,2)+', spread r/R = 2/p̄ = '+fmt(s.spread,2)+' (pure default compensation: the fund earns R)');
    }
    /* drag the blue point along R(N), or click either panel, to choose N */
    function inBox(q,b){ return q[0]>=b.x-8 && q[0]<=b.x+b.w+8 && q[1]>=b.y-8 && q[1]<=b.y+b.h+8; }
    svg.addEventListener('pointerdown',function(e){
      if(!P1) return;
      var q=local(svg,e,W,H), P=inBox(q,P1.b)?P1:inBox(q,P2.b)?P2:null;
      if(!P) return;
      drag=P===P1?1:2; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      try{ el.k.focus({preventScroll:true}); }catch(err){}
      setN(P.sx.inv(q[0]));
    });
    svg.addEventListener('pointermove',function(e){ if(!drag) return; var q=local(svg,e,W,H); setN((drag===1?P1:P2).sx.inv(q[0])); });
    function stop(){ drag=0; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1 || !P1) return;
      var q=local(svg,e.touches[0],W,H);
      if(Math.hypot(q[0]-P1.sx(N),q[1]-P1.sy(depR(N)))<26) e.preventDefault();
    },{passive:false});
    /* Try it: reads n, gamma, dep (R), wedge, inv, invs, short (% shortfall), pbar, r, spread and self; sets n and gamma */
    api=NF.api({
      get:function(){ return state(); },
      set:function(o){
        if('gamma' in o){ if(rg) rg.set(+o.gamma); else g=+o.gamma; }
        if('n' in o){ if(rn) rn.set(+o.n); else N=+o.n; }
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
