/* Core Macroeconomics L8 figures: moral hazard in financial intermediaries (Gertler Karadi, Gertler Kiyotaki).
   The two period model of the note, with its numbers: y = 1, beta = 0.96, CRRA gamma = 0.5, Rk = 1.1, theta = 0.3.
     banker:         period 2 assets Rk (N + d); repays R d, or defaults and runs with theta Rk (N + d)
     no default:     (N + d) Rk - R d >= theta Rk (N + d)  <=>  d <= dbar(R) = (1 - theta) Rk N / (R - (1 - theta) Rk)
     households:     c2 = Rk (N + d) (bank profit comes home), Euler  Rk (N + d) = (beta R)^(1/gamma) (y - d),
                     so deposits at rate R are  d_s(R) = ((beta R)^(1/gamma) y - Rk N) / ((beta R)^(1/gamma) + Rk)
     first best:     d* = d_s(Rk)
     threshold:      the condition binds iff N < Nbar = theta (beta Rk)^(1/gamma) y / ((1 - theta)(beta Rk)^(1/gamma) + Rk)
     binding:        R solves dbar(R) = d_s(R) on ((1 - theta) Rk, Rk), by bisection (dbar falls in R, d_s rises)
     multiplier:     lambda = (Rk - R) / (R - (1 - theta) Rk), so Rk - R = lambda / (1 + lambda) theta Rk
   Every curve and number below comes from these equations. Drawn with the helpers of /assets/notes.js (window.NF);
   colours come from CSS variables in /assets/figs/ma8.css, so dark mode follows. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- the model ---------- */
  var Y=1, BETA=0.96, GAM=0.5, RK=1.1, TH=0.3, BIG=99;
  function A(r){ return Math.pow(BETA*r,1/GAM); }
  function dstar(n){ return (A(RK)*Y-RK*n)/(A(RK)+RK); }
  function dsup(r,n){ var a=A(r); return (a*Y-RK*n)/(a+RK); }
  function rsup(d,n){ return Math.pow(RK*(n+d)/(Y-d),GAM)/BETA; }
  function floorR(th){ return (1-th)*RK; }
  function dbar(r,n,th){ var f=floorR(th); return r<=f+1e-12?Infinity:f*n/(r-f); }
  function rcap(d,n,th){ return floorR(th)*(n+d)/d; }
  function nbar(th){ var a=A(RK); return th*a*Y/((1-th)*a+RK); }
  function lam(r,th){ var f=floorR(th); return r>=RK?0:r<=f?Infinity:(RK-r)/(r-f); }
  function u(c){ return Math.pow(c,1-GAM)/(1-GAM); }
  function eq(n,th){
    var ds=dstar(n), f=floorR(th), lo, hi, m, i, o;
    if(th<=0 || ds<=(1-th)*n/th) o={r:RK, d:ds, lam:0, binding:false};
    else if(n<=0) o={r:f, d:dsup(f,0), lam:Infinity, binding:true};
    else {
      lo=f; hi=RK;
      for(i=0;i<90;i++){ m=(lo+hi)/2; if(dbar(m,n,th)>dsup(m,n)) lo=m; else hi=m; }
      m=(lo+hi)/2;
      o={r:m, d:dsup(m,n), lam:lam(m,th), binding:true};
    }
    o.dstar=ds; o.spread=RK-o.r; o.nbar=nbar(th); o.c1=Y-o.d; o.c2=RK*(n+o.d);
    o.room=(n+o.d)*RK-o.r*o.d-th*RK*(n+o.d);
    /* welfare loss: the equal percentage rise in c1 and c2 that makes the equilibrium as good as first best */
    o.loss=100*(Math.pow((u(Y-ds)+BETA*u(RK*(n+ds)))/(u(o.c1)+BETA*u(o.c2)),1/(1-GAM))-1);
    return o;
  }

  /* ---------- drawing helpers ---------- */
  function niceStep(span,k){ var raw=span/k, mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), q=raw/mag; return (q<1.5?1:q<2.25?2:q<3.5?2.5:q<7.5?5:10)*mag; }
  function ticks(lo,hi,k){ var st=niceStep(hi-lo,k), o=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9*st;v+=st) o.push(Math.round(v/st)*st); return o; }
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
    if(o.yl) text(g,b.x-(o.yx||36),b.y-10,o.yl,'nf-title');
    return {sx:sx, sy:sy, b:b, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  function curve(P,pts){ return poly(pts.map(function(p){ return [P.sx(p[0]),P.sy(p[1])]; })); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function show(e,on){ if(on) e.removeAttribute('visibility'); else e.setAttribute('visibility','hidden'); }
  /* a rectangle between two svg heights */
  function bar(e,x,ya,w,yb){ e.setAttribute('x',R(x)); e.setAttribute('y',R(Math.min(ya,yb))); e.setAttribute('width',R(w)); e.setAttribute('height',R(Math.abs(yb-ya))); }
  /* a square bracket from ya to yb at x, its arms pointing back by dir */
  function bracket(e,x,ya,yb,dir){ e.setAttribute('d','M'+R(x-dir*5)+','+R(ya)+'H'+R(x)+'V'+R(yb)+'H'+R(x-dir*5)); }
  /* an arrow: a stroked shaft and a filled head */
  function arrow(g,cls){ return {l:line(g,0,0,0,0,cls), h:S('path',{'class':cls+'h'},g)}; }
  function setArrow(A,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(L<4){ A.l.setAttribute('visibility','hidden'); A.h.setAttribute('d',''); return; }
    A.l.removeAttribute('visibility');
    ux=dx/L; uy=dy/L; hl=Math.min(8,L*0.5); bx=x1-ux*hl; by=y1-uy*hl;
    setLine(A.l,x0,y0,bx+ux,by+uy);
    A.h.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  function hideArrow(A){ A.l.setAttribute('visibility','hidden'); A.h.setAttribute('d',''); }
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
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function legendTop(svg,W,mL,items){ var rows=key(S('g',null,svg),items,mL,13,W-10); return 13+(rows-1)*16; }
  function big(v){ return isFinite(v)?v:BIG; }
  function getter(cur){ return function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; }; }

  /* ---------- 1. The period 2 pie: repay or default ---------- */
  NF.register('ma8-split',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var D0={n:0.05,d:0.4,r:1}, n=D0.n, d=D0.d, r=D0.r, th=TH, W=520, H=380, P, B, el={}, api, cur={};
    var rs={n:range(fig,'N',2,function(v){ n=v; paint(); }), d:range(fig,'d',2,function(v){ d=v; paint(); }), r:range(fig,'R',2,function(v){ r=v; paint(); })};
    if(rs.n){ n=rs.n.v(); d=rs.d.v(); r=rs.r.v(); }
    onClick(fig,'.nfig-reset',function(){ api.set({n:D0.n, d:D0.d, r:D0.r}); });
    function draw(){
      var mL, top, ph, w, bw, g;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?40:46;
      top=legendTop(svg,W,mL,[['rect','ma8-dep','to depositors'],['rect','ma8-keep','banker keeps if he repays'],['rect','ma8-run','banker runs with'],
        ['rect','ma8-own','his own funds, seized'],['line','ma8-seize','what depositors can seize']])+42;
      ph=Math.round(clamp(W*0.5,210,270));
      H=top+ph+46; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,{x:mL,y:top,w:W-mL-12,h:ph},[0,1],[0,1],{xt:[],yt:[0,0.2,0.4,0.6,0.8,1],yl:'period 2 goods'});
      w=P.b.w; bw=clamp(w*0.24,62,118);
      B={w:bw, x1:mL+w*0.27-bw/2, x2:mL+w*0.73-bw/2};
      g=S('g',null,svg);
      el.rd=S('rect',{'class':'ma8-dep'},g); el.pi=S('rect',{'class':'ma8-keep'},g);
      el.dd=S('rect',{'class':'ma8-dep'},g); el.dn=S('rect',{'class':'ma8-own'},g); el.run=S('rect',{'class':'ma8-run'},g);
      el.sz=line(g,0,0,0,0,'ma8-seize');
      el.brk=S('path',{'class':'ma8-brk'},g);
      el.tbrk=text(g,0,0,'RᵏN','nf-lab nf-halo ma8-town');
      el.trd=text(g,0,0,'Rd','nf-lab nf-halo','middle');
      el.tpi=text(g,0,0,'π','nf-lab nf-halo ma8-it','middle');
      el.tdd=text(g,0,0,'(1−θ)Rᵏd','nf-lab nf-halo','middle');
      el.tdn=text(g,0,0,'(1−θ)RᵏN','nf-lab nf-halo ma8-town','middle');
      el.trun=text(g,0,0,'θRᵏ(N+d)','nf-lab nf-halo ma8-tdef','middle');
      el.tc2=text(g,0,0,'','nf-lab nf-halo','middle');
      text(g,B.x1+bw/2,top+ph+16,'repay','nf-title','middle');
      text(g,B.x2+bw/2,top+ph+16,'default','nf-title','middle');
      el.v1=text(g,B.x1+bw/2,top+ph+31,'','nf-title','middle');
      el.v2=text(g,B.x2+bw/2,top+ph+31,'','nf-title','middle');
      paint();
    }
    function label(t,x,ya,yb){ var on=Math.abs(yb-ya)>=14; show(t,on); if(on) moveTo(t,x,(ya+yb)/2+4); }
    function paint(){
      var sy=P.sy, as=RK*(n+d), rd=r*d, pi=as-rd, run=th*as, seize=(1-th)*as, own=(1-th)*RK*n, gain=(r-floorR(th))*d,
          db=dbar(r,n,th), ok=pi>=run-1e-12, c1=B.x1+B.w/2, c2=B.x2+B.w/2, s;
      bar(el.rd,B.x1,sy(0),B.w,sy(rd)); bar(el.pi,B.x1,sy(rd),B.w,sy(as));
      bar(el.dd,B.x2,sy(0),B.w,sy((1-th)*RK*d)); bar(el.dn,B.x2,sy((1-th)*RK*d),B.w,sy(seize)); bar(el.run,B.x2,sy(seize),B.w,sy(as));
      setLine(el.sz,B.x1-8,sy(seize),B.x2+B.w+8,sy(seize));
      bracket(el.brk,B.x1+B.w+6,sy(RK*d),sy(as),1);
      show(el.brk,RK*n>0.004); show(el.tbrk,sy(RK*d)-sy(as)>=10);
      moveTo(el.tbrk,B.x1+B.w+10,(sy(RK*d)+sy(as))/2+4);
      label(el.trd,c1,sy(0),sy(rd)); label(el.tpi,c1,sy(rd),sy(as));
      label(el.tdd,c2,sy(0),sy((1-th)*RK*d)); label(el.tdn,c2,sy((1-th)*RK*d),sy(seize)); label(el.trun,c2,sy(seize),sy(as));
      el.tc2.textContent='c₂ = '+fmt(as,3); moveTo(el.tc2,c1,sy(as)-7);
      el.v1.textContent='banker '+fmt(pi,3); el.v2.textContent='banker '+fmt(run,3);
      el.v1.setAttribute('class',ok?'nf-lab ma8-pick':'nf-title'); el.v2.setAttribute('class',ok?'nf-title':'nf-lab ma8-pick ma8-tdef');
      cur={n:n, d:d, r:r, theta:th, assets:as, c2:as, rd:rd, pi:pi, run:run, seize:seize, own:own, gain:gain, gap:pi-run, ok:ok?1:0, dbar:big(db)};
      if(api) api.changed();
      if(!out) return;
      s='assets Rᵏ(N + d) = '+fmt(as,3)+' = c₂ whatever R is: R only splits it\nrepay: banker keeps π = '+fmt(pi,3)+'   default: he runs with θRᵏ(N + d) = '+fmt(run,3)+
        '\ndefault costs (1 '+MINUS+' θ)RᵏN = '+fmt(own,3)+' of own funds and gains [R '+MINUS+' (1 '+MINUS+' θ)Rᵏ]d = '+fmt(gain,3)+' on deposits';
      out.textContent=s;
      if(ok) out.appendChild(document.createTextNode('\nso he repays: Rd = '+fmt(rd,3)+' ≤ '+fmt(seize,3)+(isFinite(db)?'; at this R he could take up to d̄ = '+fmt(db,3):'; at this R no amount of deposits tempts him')));
      else warn(out,'\nso he defaults: Rd = '+fmt(rd,3)+' > '+fmt(seize,3)+', and depositors would not lend him '+fmt(d,2));
    }
    api=NF.api({
      get:function(){ return getter(cur)(); },
      set:function(st){ if('n' in st && rs.n) rs.n.set(+st.n); if('d' in st && rs.d) rs.d.set(+st.d); if('r' in st && rs.r) rs.r.set(+st.r); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The banker's problem at a given R: the corner, slack or binding, and lambda ---------- */
  NF.register('ma8-banker',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read'), tog=fig.querySelector('.ma8-tog');
    if(!svg) return;
    var D0={n:0.1,r:0.97}, n=D0.n, r=D0.r, th=TH, EPS=0.05, relax=false, W=520, H=340, P, el={}, api, cur={}, X=[0,1], YD=[0,0.5];
    var rs={n:range(fig,'N',2,function(v){ n=v; paint(); }), r:range(fig,'R',2,function(v){ r=v; paint(); })};
    if(rs.n){ n=rs.n.v(); r=rs.r.v(); }
    function setRelax(v){ relax=!!v; if(tog) tog.setAttribute('aria-pressed',relax?'true':'false'); }
    if(tog) tog.addEventListener('click',function(){ setRelax(!relax); paint(); });
    onClick(fig,'.nfig-reset',function(){ api.set({n:D0.n, r:D0.r, relax:0}); });
    function draw(){
      var mL, top, ph, g;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?40:46;
      top=legendTop(svg,W,mL,[['line','ma8-rep','repay: RᵏN + (Rᵏ − R)d'],['line','ma8-def','default: θRᵏ(N + d)'],['rect','ma8-band','depositors accept']])+36;
      ph=Math.round(clamp(W*0.5,200,260));
      H=top+ph+40; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,{x:mL,y:top,w:W-mL-12,h:ph},X,YD,{xt:[0,0.2,0.4,0.6,0.8,1],yt:[0,0.1,0.2,0.3,0.4,0.5],xl:'deposits d',yl:'banker’s period 2 payoff'});
      g=P.gc;
      el.band=S('rect',{'class':'ma8-band'},g);
      el.guide=line(g,0,0,0,0,'ma8-guide');
      el.guide2=line(g,0,0,0,0,'ma8-guide');
      el.defx=line(g,0,0,0,0,'ma8-def ma8-relax');
      el.def=line(g,0,0,0,0,'ma8-def');
      el.rep=line(g,0,0,0,0,'ma8-rep');
      el.opt=line(g,0,0,0,0,'ma8-opt');
      el.gain=S('path',{'class':'ma8-lamb'},g);
      el.arr=arrow(g,'ma8-arr');
      el.c2=S('circle',{r:4.5,'class':'ma8-openl'},g);
      el.c1=S('circle',{r:5,'class':'ma8-eq'},g);
      el.tdb=text(svg,0,0,'d̄','nf-lab nf-halo ma8-tdef ma8-it','middle');
      el.tgain=text(svg,0,0,'λε','nf-lab nf-halo ma8-tlam ma8-it');
      el.tnote=text(svg,0,0,'','nf-lab nf-halo','end');
      paint();
    }
    function paint(){
      var sx=P.sx, sy=P.sy, b=P.b, f=floorR(th), db=dbar(r,n,th), L=lam(r,th), x1=X[1], regime, dbe=null, gain=0, mvn, s, e, top;
      function rep(x){ return RK*n+(RK-r)*x; }
      function dfl(x){ return th*RK*(n+x); }
      if(r>RK+1e-9) regime='zero';
      else if(Math.abs(r-RK)<1e-9) regime='slack';
      else if(!isFinite(db)) regime='none';
      else regime='binding';
      setLine(el.rep,sx(0),sy(rep(0)),sx(x1),sy(rep(x1)));
      setLine(el.def,sx(0),sy(dfl(0)),sx(x1),sy(dfl(x1)));
      e=Math.min(isFinite(db)?db:x1*2,x1);
      bar(el.band,sx(0),b.y,sx(e)-sx(0),b.y+b.h);
      show(el.guide,isFinite(db) && db<=x1); show(el.tdb,isFinite(db) && db<=x1);
      if(isFinite(db)){ setLine(el.guide,C(sx(Math.min(db,x1))),b.y,C(sx(Math.min(db,x1))),b.y+b.h); moveTo(el.tdb,sx(Math.min(db,x1)),b.y-4); }
      /* the banker's choice */
      show(el.c1,regime==='binding' ? db<=x1 : regime==='zero');
      if(regime==='binding') at(el.c1,sx(db),sy(rep(db)));
      if(regime==='zero') at(el.c1,sx(0),sy(rep(0)));
      show(el.opt,regime==='slack'); if(regime==='slack') setLine(el.opt,sx(0),sy(rep(0)),sx(Math.min(db,x1)),sy(rep(Math.min(db,x1))));
      if(regime==='none' || (regime==='binding' && db>x1)) setArrow(el.arr,b.x+b.w-44,sy(rep(x1*0.93))-10,b.x+b.w-8,sy(rep(x1*0.99))-10); else hideArrow(el.arr);
      /* relaxing the condition by EPS: the default line drops by EPS, the corner moves by EPS / (R - (1 - theta) Rk) */
      show(el.defx,relax && regime!=='none' && regime!=='zero');
      setLine(el.defx,sx(0),sy(dfl(0)-EPS),sx(x1),sy(dfl(x1)-EPS));
      if(relax && (regime==='binding' || regime==='slack')){ dbe=db+EPS/(r-f); gain=(RK-r)*(dbe-db); }
      show(el.c2,dbe!==null && dbe<=x1); show(el.guide2,dbe!==null && dbe<=x1);
      if(dbe!==null){ at(el.c2,sx(dbe),sy(rep(dbe))); setLine(el.guide2,C(sx(dbe)),b.y,C(sx(dbe)),b.y+b.h); }
      show(el.gain,regime==='binding' && dbe!==null && dbe<=x1); show(el.tgain,regime==='binding' && dbe!==null && dbe<=x1);
      if(regime==='binding' && dbe!==null){ bracket(el.gain,sx(dbe)+9,sy(rep(db)),sy(rep(dbe)),1); moveTo(el.tgain,sx(dbe)+13,(sy(rep(db))+sy(rep(dbe)))/2+4); }
      top=regime==='zero'?'takes no deposits':regime==='slack'?'any d up to d̄ is optimal':regime==='none'?'no cap: wants unlimited d':'';
      el.tnote.textContent=top; moveTo(el.tnote,b.x+b.w-6,b.y+14);
      mvn=isFinite(L)?RK*(1+L*(1-th)):Infinity;
      cur={n:n, r:r, theta:th, dbar:big(db), lam:big(L), binding:regime==='binding'?1:0, slack:regime==='slack'?1:0, regime:regime, relax:relax?1:0,
        dbe:dbe===null?0:dbe, gain:gain, mvn:big(mvn), share:isFinite(L)?L/(1+L):1};
      if(api) api.changed();
      if(!out) return;
      s='each deposit adds Rᵏ '+MINUS+' R = '+fmt(RK-r,3)+' to repaying and θRᵏ = '+fmt(th*RK,3)+' to defaulting';
      if(regime==='binding') s+='\ncap d̄ = (1 '+MINUS+' θ)RᵏN/(R '+MINUS+' (1 '+MINUS+' θ)Rᵏ) = '+fmt(db,3)+': he wants more, stops at the corner, the condition binds'+
        '\nλ = (Rᵏ '+MINUS+' R)/(R '+MINUS+' (1 '+MINUS+' θ)Rᵏ) = '+fmt(L,3)+', λ/(1 + λ) = '+fmt(L/(1+L),3)+'   a unit of N is worth Rᵏ(1 + λ(1 '+MINUS+' θ)) = '+fmt(mvn,3);
      else if(regime==='slack') s+='\nR = Rᵏ: a deposit earns nothing at the margin, so any d up to d̄ = '+fmt(db,3)+' is optimal\nλ = 0: the condition can hold with room to spare; a unit of N is worth just Rᵏ = '+fmt(RK,3);
      else if(regime==='zero') s+='\nR > Rᵏ: each deposit loses '+fmt(r-RK,3)+', so he takes none\nλ = 0: at d = 0 the condition is slack';
      else s+='\nR ≤ (1 '+MINUS+' θ)Rᵏ = '+fmt(f,3)+': default never pays, there is no cap\nprofit has no maximum, so this R cannot be an equilibrium';
      if(relax && regime==='binding') s+='\nrelaxed by ε = 0.05: d̄ moves to '+fmt(dbe,3)+' and profit rises by '+fmt(gain,4)+' = λε';
      else if(relax && regime==='slack') s+='\nrelaxed by ε = 0.05: d̄ moves to '+fmt(dbe,3)+' but profit does not change: λ = 0';
      out.textContent=s;
    }
    api=NF.api({
      get:function(){ return getter(cur)(); },
      set:function(st){
        if('relax' in st) setRelax(+st.relax===1);
        if('n' in st && rs.n) rs.n.set(+st.n);
        if('r' in st && rs.r) rs.r.set(+st.r);
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. The deposit market: supply, the kinked bank demand, and a trial rate ---------- */
  NF.register('ma8-market',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read'), tog=fig.querySelector('.ma8-tog');
    if(!svg) return;
    var D0={n:0.1,th:0.3}, n=D0.n, th=D0.th, trial=false, rt=1, W=520, H=360, P, el={}, api, cur={}, X=[0,0.6], YD=[0.4,1.3], E, hs, drag=false;
    var rs={n:range(fig,'N',2,function(v){ n=v; paint(); }), th:range(fig,'theta',2,function(v){ th=v; paint(); })};
    if(rs.n){ n=rs.n.v(); th=rs.th.v(); }
    function setTrial(v){ trial=!!v; if(tog) tog.setAttribute('aria-pressed',trial?'true':'false'); }
    function setRt(v){ rt=clamp(Math.round(v*100)/100,0.41,1.29); paint(); }
    if(tog) tog.addEventListener('click',function(){ setTrial(!trial); paint(); if(trial && hs){ try{ hs.focus({preventScroll:true}); }catch(err){} } });
    onClick(fig,'.nfig-reset',function(){ api.set({n:D0.n, theta:D0.th, trial:0, rt:1}); });
    function draw(){
      var mL, top, ph, g;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?40:46;
      top=legendTop(svg,W,mL,[['line','ma8-sup','households supply'],['line','ma8-dem','bankers demand'],['line','ma8-cap','no default cap d̄(R)'],['rect','ma8-capreg','promise not credible']])+36;
      ph=Math.round(clamp(W*0.6,230,300));
      H=top+ph+40; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,{x:mL,y:top,w:W-mL-12,h:ph},X,YD,{xt:[0,0.1,0.2,0.3,0.4,0.5,0.6],yt:[0.4,0.6,0.8,1,1.2],xl:'deposits d',yl:'deposit rate R'});
      g=P.gc;
      el.reg=S('path',{'class':'ma8-capreg'},g);
      el.floor=line(g,0,0,0,0,'ma8-floor');
      el.rk=line(g,0,0,0,0,'ma8-rk');
      el.cap=S('path',{'class':'ma8-cap'},g);
      el.sup=S('path',{'class':'ma8-sup'},g);
      el.dem=S('path',{'class':'ma8-dem'},g);
      el.gx=line(g,0,0,0,0,'ma8-guide'); el.gy=line(g,0,0,0,0,'ma8-guide');
      el.spr=S('path',{'class':'ma8-spr'},g);
      el.ds=S('circle',{r:4.5,'class':'ma8-open'},g);
      el.eq=S('circle',{r:5,'class':'ma8-eq'},g);
      el.tl=line(g,0,0,0,0,'ma8-trial');
      el.dseg=line(g,0,0,0,0,'ma8-dseg');
      el.da=arrow(g,'ma8-darr');
      el.ps=S('circle',{r:4.5,'class':'ma8-psup'},g);
      el.pd=S('circle',{r:4.5,'class':'ma8-pdem'},g);
      el.ra=arrow(g,'ma8-arr');
      el.trk=text(svg,0,0,'Rᵏ','nf-lab nf-halo','end');
      el.tfl=text(svg,0,0,'(1 − θ)Rᵏ','nf-lab nf-halo','end');
      el.tsup=text(svg,0,0,'supply','nf-lab nf-halo ma8-tsup','end');
      el.tcap=text(svg,0,0,'d̄(R)','nf-lab nf-halo ma8-tdef');
      el.tspr=text(svg,0,0,'spread','nf-lab nf-halo ma8-tspr','end');
      el.tds=text(svg,0,0,'d*','nf-lab nf-halo ma8-tsup ma8-it');
      hs=knob(svg,'ma8-knob','Trial deposit rate R, arrow keys move it',function(dir,bigstep){ if(!trial){ setTrial(true); } setRt(rt+dir*(bigstep?0.05:0.01)); });
      paint();
    }
    function capPts(){
      var f=floorR(th), lo, pts=[], i, d;
      if(n<=0) return [[1e-6,f],[X[1],f]];
      lo=f*n/(YD[1]+0.05-f);
      for(i=0;i<=160;i++){ d=lo+(X[1]-lo)*Math.pow(i/160,1.6); pts.push([d,rcap(d,n,th)]); }
      return pts;
    }
    function paint(){
      var sx=P.sx, sy=P.sy, b=P.b, f=floorR(th), pts=[], i, d, dk, cp, dem, sup, xs, s, dm, x, yr, eqd;
      E=eq(n,th);
      dk=th>0?(1-th)*n/th:Infinity;
      /* supply */
      for(i=0;i<=160;i++){ d=X[1]*i/160; pts.push([d,rsup(d,n)]); }
      el.sup.setAttribute('d',curve(P,pts));
      x=null; for(i=pts.length-1;i>0;i--){ if(pts[i][1]<=YD[1]-0.03){ x=pts[i]; break; } }
      show(el.tsup,!!x); if(x) moveTo(el.tsup,sx(x[0])-6,sy(x[1])+2);
      /* the cap and the region above it */
      cp=th>0?capPts():[];
      el.cap.setAttribute('d',th>0?curve(P,cp):'');
      el.reg.setAttribute('d',th>0?curve(P,cp.concat([[X[1],YD[1]+0.1],[cp[0][0],YD[1]+0.1]]))+'Z':'');
      x=null; for(i=0;i<cp.length;i++){ if(cp[i][1]<=YD[1]-0.06){ x=cp[i]; break; } }
      show(el.tcap,!!x && th>0); if(x) moveTo(el.tcap,sx(x[0])+6,sy(x[1])+4);
      setLine(el.floor,b.x,sy(f),b.x+b.w,sy(f)); show(el.floor,th>0);
      show(el.tfl,th>0 && f>YD[0]+0.03); moveTo(el.tfl,b.x+b.w-4,sy(f)+(sy(f)-sy(YD[0])>18?14:-5));
      setLine(el.rk,b.x,sy(RK),b.x+b.w,sy(RK)); moveTo(el.trk,b.x+b.w-4,sy(RK)-5);
      /* bank demand: flat at Rk up to dk, then down the cap */
      if(th<=0 || dk>=X[1]) dem=[[0,RK],[X[1],RK]];
      else if(n<=0) dem=[[0,RK],[0,f],[X[1],f]];
      else { dem=[[0,RK],[dk,RK]]; for(i=1;i<=140;i++){ d=dk+(X[1]-dk)*Math.pow(i/140,1.5); dem.push([d,rcap(d,n,th)]); } }
      el.dem.setAttribute('d',curve(P,dem));
      /* equilibrium, first best, spread */
      eqd=Math.min(E.d,X[1]);
      at(el.eq,sx(eqd),sy(E.r));
      setLine(el.gx,sx(eqd),sy(E.r),sx(eqd),b.y+b.h); setLine(el.gy,b.x,sy(E.r),sx(eqd),sy(E.r));
      show(el.ds,E.binding); show(el.tds,E.binding); at(el.ds,sx(E.dstar),sy(RK)); moveTo(el.tds,sx(E.dstar)+8,sy(RK)+15);
      show(el.spr,E.binding && sy(E.r)-sy(RK)>3); bracket(el.spr,sx(eqd)-8,sy(RK),sy(E.r),-1);
      show(el.tspr,E.binding && sy(E.r)-sy(RK)>20); moveTo(el.tspr,sx(eqd)-14,sy(RK)+14);
      /* trial rate */
      sup=Math.max(dsup(rt,n),0);
      if(rt>RK+1e-9) dm=0; else if(Math.abs(rt-RK)<1e-9) dm=Math.min(dk,BIG); else if(rt<=f+1e-12 || th<=0) dm=Infinity; else dm=dbar(rt,n,th);
      xs=Math.abs(rt-E.r)<0.0051?0:rt>E.r?-1:1;
      [el.tl,el.ps,el.pd,el.dseg,hs].forEach(function(q){ show(q,trial); });
      if(!trial){ hideArrow(el.da); hideArrow(el.ra); }
      else {
        yr=sy(rt);
        setLine(el.tl,b.x,yr,b.x+b.w,yr);
        at(el.ps,sx(Math.min(sup,X[1])),yr);
        show(el.dseg,Math.abs(rt-RK)<1e-9); setLine(el.dseg,sx(0),yr,sx(Math.min(dm,X[1])),yr);
        show(el.pd,isFinite(dm) && dm<=X[1]); at(el.pd,sx(Math.min(dm,X[1])),yr);
        if(!isFinite(dm) || dm>X[1]) setArrow(el.da,b.x+b.w-80,yr,b.x+b.w-28,yr); else hideArrow(el.da);
        if(xs===0) hideArrow(el.ra); else setArrow(el.ra,b.x+b.w-60,yr,b.x+b.w-60,yr-xs*24);
        hs.setAttribute('transform','translate('+R(b.x+b.w-12)+','+R(yr)+')');
        hs.setAttribute('aria-valuenow',rt.toFixed(2)); hs.setAttribute('aria-valuetext','R = '+rt.toFixed(2));
      }
      cur={n:n, theta:th, r:E.r, d:E.d, dstar:E.dstar, spread:E.spread, lam:big(E.lam), binding:E.binding?1:0, nbar:E.nbar,
        trial:trial?1:0, rt:rt, sup:sup, dem:big(dm), xs:xs};
      if(api) api.changed();
      if(!out) return;
      if(th<=0) s='θ = 0: the banker cannot steal, the cap never binds';
      else s='N = '+fmt(n,2)+(E.binding?' < ':' ≥ ')+'N̄ = '+fmt(E.nbar,3)+': the no default condition '+(E.binding?'binds':'is slack');
      if(E.binding) s+='\nR = '+fmt(E.r,3)+', spread Rᵏ '+MINUS+' R = '+fmt(E.spread,3)+', d = '+fmt(E.d,3)+' against first best d* = '+fmt(E.dstar,3)+', λ = '+(isFinite(E.lam)?fmt(E.lam,2):'∞');
      else s+='\nR = Rᵏ = '+fmt(RK,3)+', no spread, d = d* = '+fmt(E.dstar,3)+(th>0?'; bankers could credibly take up to '+fmt(dk,3):'');
      if(trial){
        s+='\ntrial R = '+fmt(rt,2)+': ';
        if(rt>RK+1e-9) s+='each deposit loses '+fmt(rt-RK,2)+', bankers take none; households offer '+fmt(sup,3);
        else if(Math.abs(rt-RK)<1e-9) s+='bankers take any amount'+(isFinite(dk)?' up to '+fmt(dk,3):'')+'; households offer '+fmt(sup,3);
        else if(!isFinite(dm)) s+='each deposit earns '+fmt(RK-rt,2)+' and no promise tempts default, so bankers want unlimited deposits; households offer '+fmt(sup,3);
        else s+='each deposit earns '+fmt(RK-rt,2)+', bankers want unlimited deposits but can credibly take only '+fmt(dm,3)+'; households offer '+fmt(sup,3);
        s+=xs===0?': the market clears':xs>0?': excess demand, R is bid up':': excess supply, R falls';
      }
      out.textContent=s;
    }
    function fromPointer(e){ var q=local(svg,e,W,H); return P.sy.inv(q[1]); }
    function inBox(e){ var q=local(svg,e,W,H), b=P.b; return q[0]>=b.x-8 && q[0]<=b.x+b.w+8 && q[1]>=b.y-8 && q[1]<=b.y+b.h+8; }
    svg.addEventListener('pointerdown',function(e){
      if(!inBox(e)) return;
      drag=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      if(!trial) setTrial(true);
      try{ hs.focus({preventScroll:true}); }catch(err){}
      setRt(fromPointer(e));
    });
    svg.addEventListener('pointermove',function(e){ if(drag) setRt(fromPointer(e)); });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1 || !trial) return;
      var q=local(svg,e.touches[0],W,H);
      if(Math.abs(q[1]-P.sy(rt))<26) e.preventDefault();
    },{passive:false});
    api=NF.api({
      get:function(){ return getter(cur)(); },
      set:function(st){
        if('trial' in st) setTrial(+st.trial===1);
        if('rt' in st) rt=clamp(Math.round(+st.rt*100)/100,0.41,1.29);
        if('n' in st && rs.n) rs.n.set(+st.n);
        if('theta' in st && rs.th) rs.th.set(+st.theta);
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Equilibrium against net worth: R and the spread, d against d*, lambda ---------- */
  NF.register('ma8-networth',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var D0={n:0.1,th:0.3}, n=D0.n, th=D0.th, W=520, H=560, Ps=[], el={}, api, cur={}, X=[0,0.3], grid=[], drag=false, rs;
    rs={n:range(fig,'N',3,function(v){ n=v; paint(); }), th:range(fig,'theta',2,function(v){ th=v; draw(); })};
    if(rs.n){ n=rs.n.v(); th=rs.th.v(); }
    onClick(fig,'.nfig-reset',function(){ api.set({n:D0.n, theta:D0.th}); });
    function solve(){ var i, m; grid=[]; for(i=0;i<=240;i++){ m=X[1]*i/240; grid.push([m,eq(m,th)]); } }
    function draw(){
      var mL, top, ph, ph3, w, wide, b1, b2, b3, dmin=Infinity, dmax=0, i, g, yr, yd, pts, nb, P1, P2, P3, xt=[0,0.1,0.2,0.3];
      W=measure(svg); frame(svg,W,100);
      mL=W<420?40:46;
      solve();
      top=legendTop(svg,W,mL,[['line','ma8-r','equilibrium R, d'],['line','ma8-rk','Rᵏ'],['rect','ma8-sprarea','spread'],['line','ma8-dstar','first best d*'],['line','ma8-lam','λ']])+34;
      wide=W>=560; ph=wide?180:150; ph3=wide?120:110;
      if(wide){ w=Math.floor((W-2*mL-12-16)/2); b1={x:mL,y:top,w:w,h:ph}; b2={x:2*mL+w+16,y:top,w:w,h:ph}; b3={x:mL,y:top+ph+64,w:W-mL-12,h:ph3}; }
      else { w=W-mL-12; b1={x:mL,y:top,w:w,h:ph}; b2={x:mL,y:top+ph+64,w:w,h:ph}; b3={x:mL,y:top+2*(ph+64),w:w,h:ph3}; }
      H=b3.y+b3.h+40; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      for(i=0;i<grid.length;i++){ dmin=Math.min(dmin,grid[i][1].d,grid[i][1].dstar); dmax=Math.max(dmax,grid[i][1].d,grid[i][1].dstar); }
      yr=[Math.floor((floorR(th)-0.02)*10)/10,1.15]; if(yr[0]>1) yr[0]=1;
      yd=[Math.floor(dmin*20)/20,Math.ceil(dmax*20+0.2)/20];
      P1=box(svg,b1,X,yr,{xt:xt,yt:ticks(yr[0],yr[1],4).filter(function(v){ return v<=1.15+1e-9; }),xl:'net worth N',yl:'deposit rate R'});
      P2=box(svg,b2,X,yd,{xt:xt,yt:ticks(yd[0],yd[1],4),xl:'net worth N',yl:'deposits d'});
      P3=box(svg,b3,X,[0,3],{xt:xt,yt:[0,1,2,3],xl:'net worth N',yl:'multiplier λ'});
      Ps=[P1,P2,P3];
      nb=grid[0][1].nbar;
      /* rate panel */
      pts=grid.filter(function(q){ return q[1].binding; }).map(function(q){ return [q[0],q[1].r]; });
      if(pts.length) S('path',{d:curve(P1,pts.concat([[pts[pts.length-1][0],RK],[0,RK]]))+'Z','class':'ma8-sprarea'},P1.gc);
      line(P1.gc,P1.sx(0),C(P1.sy(RK)),P1.sx(X[1]),C(P1.sy(RK)),'ma8-rk');
      S('path',{d:curve(P1,grid.map(function(q){ return [q[0],q[1].r]; })),'class':'ma8-r'},P1.gc);
      text(svg,b1.x+b1.w-4,P1.sy(RK)-6,'Rᵏ','nf-lab nf-halo','end');
      /* deposits panel */
      S('path',{d:curve(P2,grid.map(function(q){ return [q[0],q[1].dstar]; })),'class':'ma8-dstar'},P2.gc);
      S('path',{d:curve(P2,grid.map(function(q){ return [q[0],q[1].d]; })),'class':'ma8-r'},P2.gc);
      /* multiplier panel */
      pts=grid.filter(function(q){ return isFinite(q[1].lam); }).map(function(q){ return [q[0],Math.min(q[1].lam,4)]; });
      S('path',{d:curve(P3,pts),'class':'ma8-lam'},P3.gc);
      if(th>0){
        for(i=0;i<grid.length && !(grid[i][1].lam<=2.4);i++){}
        if(i<grid.length) text(svg,Math.min(P3.sx(grid[i][0])+10,b3.x+b3.w-110),b3.y+14,'λ → ∞ as N → 0','nf-lab nf-halo ma8-tlam');
      }
      /* threshold and cursor */
      for(i=0;i<3;i++){
        g=Ps[i];
        if(nb<X[1]){ line(g.gc,C(g.sx(nb)),g.b.y,C(g.sx(nb)),g.b.y+g.b.h,'ma8-nbar'); }
      }
      if(nb<X[1]){
        text(svg,P1.sx(nb)+4,b1.y+b1.h-6,'N̄','nf-lab nf-halo ma8-it');
        if(P3.sx(X[1])-P3.sx(nb)>110) text(svg,P3.sx(nb)+8,P3.sy(1.5)+4,'slack: λ = 0','nf-lab nf-halo');
        if(P3.sx(nb)-b3.x>150) text(svg,P3.sx(nb)-8,P3.sy(1.5)+4,'binding: λ > 0','nf-lab nf-halo','end');
      }
      el.cur=[]; el.dot=[];
      for(i=0;i<3;i++){ el.cur.push(line(Ps[i].gc,0,0,0,0,'ma8-cursor')); }
      el.dot.push(S('circle',{r:4.5,'class':'ma8-eq'},P1.gc));
      el.dot.push(S('circle',{r:4.5,'class':'ma8-open'},P2.gc));
      el.dot.push(S('circle',{r:4.5,'class':'ma8-eq'},P2.gc));
      el.dot.push(S('circle',{r:4.5,'class':'ma8-eqlam'},P3.gc));
      paint();
    }
    function paint(){
      var E=eq(n,th), i, P, lev=n>0?(n+E.d)/n:Infinity, mvn=isFinite(E.lam)?RK*(1+E.lam*(1-th)):Infinity, s;
      for(i=0;i<3;i++){ P=Ps[i]; setLine(el.cur[i],C(P.sx(n)),P.b.y,C(P.sx(n)),P.b.y+P.b.h); }
      at(el.dot[0],Ps[0].sx(n),Ps[0].sy(E.r));
      at(el.dot[1],Ps[1].sx(n),Ps[1].sy(E.dstar));
      at(el.dot[2],Ps[1].sx(n),Ps[1].sy(E.d));
      show(el.dot[3],isFinite(E.lam) && E.lam<=3.2); if(isFinite(E.lam)) at(el.dot[3],Ps[2].sx(n),Ps[2].sy(Math.min(E.lam,3.2)));
      cur={n:n, theta:th, r:E.r, d:E.d, dstar:E.dstar, spread:E.spread, lam:big(E.lam), binding:E.binding?1:0, nbar:E.nbar, loss:E.loss, lev:big(lev), mvn:big(mvn), room:E.room};
      if(api) api.changed();
      if(!out) return;
      if(th<=0) s='θ = 0: no moral hazard, every N gives the first best';
      else s='N = '+fmt(n,3)+(E.binding?' < ':' ≥ ')+'N̄ = '+fmt(E.nbar,3)+': '+(E.binding?'binding':'slack');
      if(E.binding && n>0) s+='\nR = '+fmt(E.r,3)+', spread '+fmt(E.spread,3)+' = Rᵏ[θ '+MINUS+' (1 '+MINUS+' θ)N/d], d = '+fmt(E.d,3)+' (first best '+fmt(E.dstar,3)+'), leverage (N + d)/N = '+fmt(lev,2)+
        '\nλ = '+fmt(E.lam,2)+': a unit of N is worth Rᵏ(1 + λ(1 '+MINUS+' θ)) = '+fmt(mvn,2)+' to the banker; welfare loss '+fmt(E.loss,2)+'% of consumption';
      else if(E.binding) s+='\nR = (1 '+MINUS+' θ)Rᵏ = '+fmt(E.r,3)+', spread θRᵏ = '+fmt(E.spread,3)+', d = '+fmt(E.d,3)+' (first best '+fmt(E.dstar,3)+'), λ infinite\nwelfare loss '+fmt(E.loss,2)+'% of consumption';
      else s+='\nR = Rᵏ = '+fmt(RK,3)+', no spread, d = d* = '+fmt(E.d,3)+', λ = 0\nroom in the condition: repaying beats defaulting by '+fmt(E.room,3);
      out.textContent=s;
    }
    function setN(v){ v=clamp(Math.round(v/0.005)*0.005,X[0],X[1]); if(rs.n) rs.n.set(v); else { n=v; paint(); } }
    function pick(e){
      var q=local(svg,e,W,H), i, b;
      for(i=0;i<Ps.length;i++){ b=Ps[i].b; if(q[0]>=b.x-8 && q[0]<=b.x+b.w+8 && q[1]>=b.y-8 && q[1]<=b.y+b.h+8) return Ps[i].sx.inv(q[0]); }
      return null;
    }
    svg.addEventListener('pointerdown',function(e){
      var v=pick(e);
      if(v===null) return;
      drag=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag'); setN(v);
    });
    svg.addEventListener('pointermove',function(e){ if(!drag) return; var q=local(svg,e,W,H), P=Ps[0], i, b; for(i=0;i<Ps.length;i++){ b=Ps[i].b; if(q[0]>=b.x-30 && q[0]<=b.x+b.w+30 && q[1]>=b.y-30 && q[1]<=b.y+b.h+40){ P=Ps[i]; break; } } setN(P.sx.inv(q[0])); });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    api=NF.api({
      get:function(){ return getter(cur)(); },
      set:function(st){
        if('theta' in st && rs.th) rs.th.set(+st.theta);
        if('n' in st) setN(+st.n);
        paint();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
