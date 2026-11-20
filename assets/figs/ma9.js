/* Core Macroeconomics L9 figures: moral hazard and effort.
   The model. A banker with net worth N takes deposits d and buys N + d securities. Effort e costs e²/2 and makes the
   securities good with probability p(e) = a + be; good ones pay Rᵍ per unit, bad ones Rᵇ. The fund is paid R_g^d d if
   good and R_b^d d if bad and must break even: p R_g^d + (1 − p) R_b^d = R. The banker ends with nᵍ = Rᵍ(N + d) − R_g^d d
   or nᵇ = Rᵇ(N + d) − R_b^d d, and with effort hidden it picks e = λb(nᵍ − nᵇ) (IC).
   Normal times, N ≥ N̄ = (R − Rᵇ)d/Rᵇ: the fund gets R in both states and e = eᶠᴮ = λb(Rᵍ − Rᵇ)(N + d).
   Abnormal times, N < N̄: the bad state cash constraint binds, R_b^d = Rᵇ(N + d)/d, zero profit gives the spread
   R_g^d − R_b^d = B/(p d) with B = Rd − Rᵇ(N + d), and IC times p(e) is the quadratic
   b e² + (a − λb²A) e − λb(aA − B) = 0, A = (Rᵍ − Rᵇ)(N + d), whose one positive root is effort (closed form).
   The multipliers come from the first order conditions: spread = νp/(λ(λ + ν)b²d), so ν = λD/(p − D) with
   D = λb²d·spread, then η = νp/(λb) and μ = λ + ν. Net worth is worth λ(pRᵍ + (1 − p)Rᵇ) + νRᵇ + ηλb(Rᵍ − Rᵇ)
   (envelope theorem), and the welfare loss is ½(eᶠᴮ − e)².
   Parameters: λ = 1, a = 0.55, b = 0.5, Rᵍ = 1.5, Rᵇ = 0.8, R = 1.1, d = 1, with d and R held fixed.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma9.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, press=NF.press, MINUS=NF.MINUS;

  /* ---------- the model ---------- */
  var P0={lam:1, a:0.55, b:0.5, Rg:1.5, Rb:0.8, R:1.1, d:1};
  function par(o){ var m={}, k; for(k in P0) m[k]=P0[k]; if(o) for(k in o) m[k]=o[k]; return m; }
  /* the optimal contract and effort at net worth N */
  function solve(m,N){
    var A=(m.Rg-m.Rb)*(N+m.d), B=m.R*m.d-m.Rb*(N+m.d), o={n:N, A:A, efb:m.lam*m.b*A, nbar:(m.R-m.Rb)*m.d/m.Rb}, qb, qc, disc, D;
    if(B<=1e-12){
      o.e=o.efb; o.rbd=m.R; o.rgd=m.R; o.spread=0; o.nu=0; o.eta=0; o.binds=0; o.B=0;
    } else {
      o.B=B;
      qb=m.a-m.lam*m.b*m.b*A; qc=-m.lam*m.b*(m.a*A-B); disc=qb*qb-4*m.b*qc;
      o.e=Math.max(0,(-qb+Math.sqrt(Math.max(disc,0)))/(2*m.b));
      o.p=m.a+m.b*o.e;
      o.rbd=m.Rb*(N+m.d)/m.d; o.spread=B/(o.p*m.d); o.rgd=o.rbd+o.spread;
      D=m.lam*m.b*m.b*m.d*o.spread;
      o.nu=o.p>D?m.lam*D/(o.p-D):Infinity; o.eta=o.nu*o.p/(m.lam*m.b); o.binds=1;
    }
    o.p=m.a+m.b*o.e;
    o.stake=A-o.spread*m.d;
    o.ng=m.Rg*(N+m.d)-o.rgd*m.d; o.nb=m.Rb*(N+m.d)-o.rbd*m.d;
    o.mu=m.lam+o.nu;
    o.er=o.p*m.Rg+(1-o.p)*m.Rb;
    o.direct=m.lam*o.er;
    o.pnu=o.nu*m.Rb; o.peta=o.eta*m.lam*m.b*(m.Rg-m.Rb); o.prem=o.pnu+o.peta;
    o.loss=0.5*(o.efb-o.e)*(o.efb-o.e);
    return o;
  }

  /* ---------- drawing helpers ---------- */
  /* a plot box with grid, ticks, tick labels and axis names; sx, sy map data to the svg; gc is clipped to the box */
  function box(svg,b,xd,yd,o){
    var g=S('g',null,svg), sx=lin(xd[0],xd[1],b.x,b.x+b.w), sy=lin(yd[0],yd[1],b.y+b.h,b.y), i, v, f;
    for(i=0;i<o.xt.length;i++){
      v=o.xt[i]; f=C(sx(v));
      line(g,f,b.y,f,b.y+b.h,'nf-grid');
      line(g,f,b.y+b.h,f,b.y+b.h+4,'nf-ax');
      if(!o.noxl) text(g,sx(v),b.y+b.h+16,tl(v),null,'middle');
    }
    for(i=0;i<o.yt.length;i++){
      v=o.yt[i]; f=C(sy(v));
      line(g,b.x,f,b.x+b.w,f,'nf-grid');
      text(g,b.x-6,sy(v)+4,tl(v),null,'end');
    }
    line(g,b.x,C(b.y+b.h),b.x+b.w,C(b.y+b.h),'nf-ax');
    line(g,C(b.x),b.y,C(b.x),b.y+b.h,'nf-ax');
    if(o.xl) text(g,b.x+b.w,b.y+b.h+(o.noxl?16:31),o.xl,'nf-title','end');
    if(o.yl) text(g,b.x+6,b.y+12,o.yl,'nf-title nf-halo');
    return {sx:sx, sy:sy, b:b, gc:clip(svg,b.x,b.y-2,b.w,b.h+4)};
  }
  function ticks(lo,hi,st){ var out=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9*st;v+=st) out.push(Math.round(v/st)*st); return out; }
  function curve(P,pts){ var a=[], i; for(i=0;i<pts.length;i++) if(isFinite(pts[i][1])) a.push([P.sx(pts[i][0]),P.sy(pts[i][1])]); return poly(a); }
  function rect(g,x,y0,y1,w,cls){ var lo=Math.min(y0,y1), hi=Math.max(y0,y1); return S('rect',{x:R(x),y:R(lo),width:R(w),height:R(Math.max(0,hi-lo)),'class':cls},g); }
  function dot(g,x,y,cls,r){ return S('circle',{cx:R(x),cy:R(y),r:r||4.5,'class':cls},g); }
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  /* labels stacked at x that keep at least gap px apart, kept inside [top, bot]: items {y, s, cls} */
  function stack(g,x,items,gap,top,bot,anchor){
    var i, its=items.slice().sort(function(p,q){ return p.y-q.y; });
    for(i=1;i<its.length;i++) if(its[i].y<its[i-1].y+gap) its[i].y=its[i-1].y+gap;
    if(its.length && its[its.length-1].y>bot){ its[its.length-1].y=bot; for(i=its.length-2;i>=0;i--) if(its[i].y>its[i+1].y-gap) its[i].y=its[i+1].y-gap; }
    for(i=0;i<its.length;i++) text(g,x,Math.max(its[i].y,top),its[i].s,'nf-lab nf-halo '+(its[i].cls||''),anchor);
  }
  /* a draggable knob with a focus ring; arrow keys call onKey(+1 or -1, big) */
  function knob(svg,cls,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label,'aria-valuemin':'0','aria-valuemax':'1'},svg);
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
    h.setAttribute('aria-valuenow',+now.toFixed(3));
    h.setAttribute('aria-valuetext',txt);
  }
  /* press or drag anywhere over the boxes to move N; boxes() lists the plot boxes, toN(x) maps svg x to N */
  function dragN(svg,size,boxes,toN,focus){
    var on=false;
    function inside(p){ var bs=boxes(), i, b; for(i=0;i<bs.length;i++){ b=bs[i]; if(p[0]>=b.x-10 && p[0]<=b.x+b.w+10 && p[1]>=b.y-10 && p[1]<=b.y+b.h+10) return true; } return false; }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]);
      if(!inside(p)) return;
      on=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      if(focus) focus();
      toN(p[0]);
    });
    svg.addEventListener('pointermove',function(e){ if(!on) return; var s=size(); toN(local(svg,e,s[0],s[1])[0]); });
    function stop(){ on=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){ if(e.touches.length!==1) return; var s=size(); if(inside(local(svg,e.touches[0],s[0],s[1]))) e.preventDefault(); },{passive:false});
  }
  function snap(v,st,lo,hi){ return clamp(Math.round(v/st)*st,lo,hi); }

  /* ---------- 1. The bad state cash constraint, one contract at a given p ---------- */
  NF.register('ma9-cash',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var m=par(), N=0.1, p=0.8, mode='fixed', W=520, H=300, L, cur={}, api, g;
    var rn=range(fig,'n',3,function(v){ N=v; paint(); }), rp=range(fig,'p',2,function(v){ p=v; paint(); });
    if(rn) N=rn.v();
    if(rp) p=rp.v();
    var c0=seg(fig,'data-mode',function(v){ mode=v; paint(); });
    if(c0) mode=c0;
    function calc(){
      var d=m.d, o={n:N, p:p, mode:mode, cashg:m.Rg*(N+d), cashb:m.Rb*(N+d), promise:m.R*d, nbar:(m.R-m.Rb)*d/m.Rb};
      o.short=Math.max(0,o.promise-o.cashb); o.slack=Math.max(0,o.cashb-o.promise); o.binds=o.short>1e-12?1:0;
      if(mode==='fixed' || !o.binds){ o.rgd=m.R; o.rbd=m.R; }
      else { o.rbd=o.cashb/d; o.rgd=(m.R-(1-p)*o.rbd)/p; }
      o.spread=o.rgd-o.rbd; o.cut=o.spread*d;
      o.ng=o.cashg-o.rgd*d; o.nb=o.cashb-o.rbd*d; o.stake=o.ng-o.nb; o.stakefb=(m.Rg-m.Rb)*(N+d);
      o.e=m.lam*m.b*o.stake; o.feasible=o.nb>=-1e-12?1:0;
      o.fund=p*o.rgd+(1-p)*o.rbd;
      return o;
    }
    function draw(){
      var rows, mL, mR=6, top, ph;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?34:42;
      rows=key(S('g',null,svg),[['rect','ma9-fund','paid to the fund'],['rect','ma9-cut','fund’s cut of the upside'],['rect','ma9-keep','banker keeps'],['rect','ma9-short','shortfall']],mL,13,W-mR);
      top=13+(rows-1)*16+18; ph=Math.round(clamp(W*0.42,190,250));
      H=top+ph+42;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      L={x:mL, y:top, w:W-mL-mR, h:ph};
      var sy=lin(0,2.4,top+ph,top), gg=S('g',null,svg), yt=ticks(0,2.4,0.5), i, slot=L.w/3, names=[['good','prob p'],['bad','prob 1 − p'],['stake','nᵍ − nᵇ']];
      for(i=0;i<yt.length;i++){ line(gg,mL,C(sy(yt[i])),mL+L.w,C(sy(yt[i])),'nf-grid'); text(gg,mL-6,sy(yt[i])+4,tl(yt[i]),null,'end'); }
      line(gg,mL,C(top+ph),mL+L.w,C(top+ph),'nf-ax'); line(gg,C(mL),top,C(mL),top+ph,'nf-ax');
      L.bw=Math.round(clamp(slot*0.34,28,64)); L.cx=[]; L.sy=sy;
      for(i=0;i<3;i++){
        L.cx.push(mL+slot*(i+0.5)-(slot<130?12:16));
        text(gg,L.cx[i],top+ph+16,names[i][0],'nf-lab','middle');
        text(gg,L.cx[i],top+ph+30,names[i][1],null,'middle');
      }
      L.sep=line(gg,C(mL+2*slot),top,C(mL+2*slot),top+ph,'nf-grid');
      g=S('g',null,svg);
      paint();
    }
    function paint(){
      var o=calc(), sy=L.sy, bw=L.bw, x, lab, xl, i, Rd=o.promise, s;
      clear(g);
      /* good state */
      x=L.cx[0]-bw/2; lab=[];
      rect(g,x,sy(0),sy(o.rbd*m.d),bw,'ma9-fund');
      if(o.cut>1e-9) rect(g,x,sy(o.rbd*m.d),sy(o.rgd*m.d),bw,'ma9-cut');
      if(o.ng>1e-9) rect(g,x,sy(o.rgd*m.d),sy(o.cashg),bw,'ma9-keep');
      rect(g,x,sy(0),sy(o.cashg),bw,'ma9-cash');
      lab.push({y:sy(o.rgd*m.d/2)+4, s:fmt(o.rgd*m.d,3)});
      if(o.ng>1e-9) lab.push({y:sy(o.rgd*m.d+o.ng/2)+4, s:fmt(o.ng,3), cls:'ma9-tkeep'});
      text(g,L.cx[0],sy(o.cashg)-6,'cash '+fmt(o.cashg,2),'nf-lab nf-halo','middle');
      stack(g,x+bw+5,lab,12,L.y+10,L.y+L.h-2);
      /* bad state */
      x=L.cx[1]-bw/2; lab=[];
      rect(g,x,sy(0),sy(Math.min(o.rbd*m.d,o.cashb)),bw,'ma9-fund');
      if(o.nb<-1e-9) rect(g,x,sy(o.cashb),sy(o.rbd*m.d),bw,'ma9-short');
      if(o.nb>1e-9) rect(g,x,sy(o.rbd*m.d),sy(o.cashb),bw,'ma9-keep');
      rect(g,x,sy(0),sy(o.cashb),bw,'ma9-cash');
      lab.push({y:sy(Math.min(o.rbd*m.d,o.cashb)/2)+4, s:fmt(Math.min(o.rbd*m.d,o.cashb),3)});
      if(o.nb<-1e-9) lab.push({y:sy((o.cashb+Rd)/2)+4, s:MINUS+fmt(-o.nb,3), cls:'ma9-tshort'});
      if(o.nb>1e-9) lab.push({y:sy(o.rbd*m.d+o.nb/2)+4, s:fmt(o.nb,3), cls:'ma9-tkeep'});
      stack(g,x+bw+5,lab,12,L.y+10,L.y+L.h-2);
      text(g,L.cx[1],sy(Math.max(o.cashb,o.rbd*m.d))-6,'cash '+fmt(o.cashb,2),'nf-lab nf-halo','middle');
      /* the promise Rd across both states */
      line(g,L.x+2,C(sy(Rd)),L.cx[1]+bw/2+4,C(sy(Rd)),'ma9-rd');
      text(g,L.x+4,sy(Rd)-4,'Rd','nf-lab nf-halo ma9-it');
      /* the stake: red what the banker gets from success, purple the fund's cut, orange the part that needs cash the bank lacks */
      x=L.cx[2]-bw/2; lab=[];
      rect(g,x,sy(0),sy(o.stakefb),bw,'ma9-full');
      if(o.feasible){
        rect(g,x,sy(0),sy(o.stake),bw,'ma9-keep');
        if(o.cut>1e-9){ rect(g,x,sy(o.stake),sy(o.stakefb),bw,'ma9-cut'); lab.push({y:sy((o.stake+o.stakefb)/2)+4, s:fmt(o.cut,3), cls:'ma9-tcut'}); }
        lab.push({y:sy(o.stake/2)+4, s:fmt(o.stake,3), cls:'ma9-tkeep'});
      } else {
        rect(g,x,sy(0),sy(o.ng),bw,'ma9-keep');
        rect(g,x,sy(o.ng),sy(o.stake),bw,'ma9-short');
        lab.push({y:sy(o.ng/2)+4, s:fmt(o.ng,3), cls:'ma9-tkeep'});
        lab.push({y:sy((o.ng+o.stake)/2)+4, s:fmt(-o.nb,3), cls:'ma9-tshort'});
      }
      stack(g,x+bw+5,lab,12,L.y+10,L.y+L.h-2);
      text(g,L.cx[2],sy(o.stakefb)-6,'full '+fmt(o.stakefb,2),'nf-lab nf-halo','middle');
      cur=o;
      if(api) api.changed();
      if(!out) return;
      s='bad state: cash Rᵇ(N + d) = '+fmt(o.cashb,3)+' against Rd = '+fmt(Rd,3)+': '+
        (o.binds?'short '+fmt(o.short,3)+', so the cash constraint binds':fmt(o.slack,3)+' to spare, so the cash constraint is slack');
      out.textContent=s+'\n';
      if(!o.feasible) warn(out,'promise R in both states: the banker would keep '+MINUS+fmt(-o.nb,3)+' in the bad state, which limited liability rules out');
      else if(o.binds) out.appendChild(document.createTextNode('fund gets '+fmt(o.rbd,3)+' if bad, '+fmt(o.rgd,3)+' if good: '+fmt(p,2)+' × '+fmt(o.rgd,3)+' + '+fmt(1-p,2)+' × '+fmt(o.rbd,3)+' = '+fmt(o.fund,3)+' = R'));
      else out.appendChild(document.createTextNode('fund gets R = '+fmt(m.R,3)+' in both states; the banker is the residual claimant'));
      out.appendChild(document.createTextNode('\nstake nᵍ − nᵇ = '+fmt(o.ng,3)+' − '+(o.nb<-1e-9?'('+MINUS+fmt(-o.nb,3)+')':fmt(o.nb,3))+' = '+fmt(o.stake,3)+
        (o.cut>1e-9?' (full upside '+fmt(o.stakefb,3)+')':'')+', so e = λb × stake = '+fmt(o.e,3)));
    }
    /* Try it: mode, n, p, the cash, shortfall, payments, payoffs, stake and the effort it buys */
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('mode' in st) press(fig,'data-mode',String(st.mode));
        if('n' in st){ if(rn) rn.set(+st.n); else { N=+st.n; paint(); } }
        if('p' in st){ if(rp) rp.set(+st.p); else { p=+st.p; paint(); } }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The banker's effort choice: marginal benefit against marginal cost ---------- */
  NF.register('ma9-choice',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var m=par(), N=0.1, W=520, H=320, P, cur={}, api, g;
    var rn=range(fig,'n',3,function(v){ N=v; paint(); });
    if(rn) N=rn.v();
    function draw(){
      var rows, mL, mR=8, top, ph;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?34:42;
      rows=key(S('g',null,svg),[['line','ma9-mc','marginal cost e'],['line','ma9-mb','banker’s gain λb(nᵍ − nᵇ)'],['line','ma9-fb','banker and fund λb(Rᵍ − Rᵇ)(N + d)'],['rect','ma9-loss','welfare loss']],mL,13,W-mR);
      top=13+(rows-1)*16+16; ph=Math.round(clamp(W*0.5,200,290));
      H=top+ph+40;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,{x:mL,y:top,w:W-mL-mR,h:ph},[0,0.8],[0,0.8],{xt:ticks(0,0.8,W<420?0.2:0.1),yt:ticks(0,0.8,0.2),xl:'effort e',yl:'marginal benefit, cost'});
      line(P.gc,P.sx(0),P.sy(0),P.sx(0.8),P.sy(0.8),'ma9-mc');
      g=S('g',null,svg);
      paint();
    }
    function paint(){
      var o=solve(m,N), sx=P.sx, sy=P.sy, gc, b=P.b, xb, s;
      clear(g); gc=S('g',null,g);
      if(o.binds) S('path',{d:poly([[sx(o.e),sy(o.e)],[sx(o.e),sy(o.efb)],[sx(o.efb),sy(o.efb)]])+'Z','class':'ma9-loss'},gc);
      line(gc,b.x,sy(o.efb),b.x+b.w,sy(o.efb),'ma9-fb');
      line(gc,b.x,sy(o.e),b.x+b.w,sy(o.e),'ma9-mb');
      line(gc,sx(o.e),sy(o.e),sx(o.e),b.y+b.h,'ma9-drop');
      if(o.binds) line(gc,sx(o.efb),sy(o.efb),sx(o.efb),b.y+b.h,'ma9-drop');
      /* the fund's cut, λb × spread × d, as a bracket at the right */
      if(o.binds && sy(o.e)-sy(o.efb)>6){
        xb=b.x+b.w-14;
        S('path',{d:'M'+R(xb-5)+','+R(sy(o.efb))+'H'+R(xb)+'V'+R(sy(o.e))+'H'+R(xb-5),'class':'ma9-brk'},gc);
        text(g,xb-8,(sy(o.efb)+sy(o.e))/2+4,'fund’s cut '+fmt(m.lam*m.b*o.spread*m.d,3),'nf-lab nf-halo ma9-tcut','end');
      }
      if(o.binds) dot(gc,sx(o.efb),sy(o.efb),'ma9-dfb');
      dot(gc,sx(o.e),sy(o.e),'ma9-de');
      text(g,sx(o.e)+(o.binds?-4:4),b.y+b.h-6,'e = '+fmt(o.e,3),'nf-lab nf-halo ma9-tkeep',o.binds?'end':'start');
      if(o.binds) text(g,sx(o.efb)+4,b.y+b.h-6,'eᶠᴮ = '+fmt(o.efb,3),'nf-lab nf-halo ma9-tfb');
      cur={n:N, e:o.e, efb:o.efb, stake:o.stake, stakefb:o.A, cut:m.lam*m.b*o.spread*m.d, spread:o.spread, loss:o.loss, binds:o.binds, p:o.p, nbar:o.nbar};
      if(api) api.changed();
      if(!out) return;
      s='N = '+fmt(N,3)+': stake = '+fmt(o.A,3)+(o.binds?' − '+fmt(o.spread*m.d,3)+' = '+fmt(o.stake,3):' (no spread: N ≥ N̄ = '+fmt(o.nbar,3)+')')+
        ', so e = λb × stake = '+fmt(o.e,3)+(o.binds?' against eᶠᴮ = '+fmt(o.efb,3):' = eᶠᴮ')+
        '\nwelfare loss ½(eᶠᴮ − e)² = '+fmt(o.loss,3);
      out.textContent=s;
    }
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){ if('n' in st){ if(rn) rn.set(+st.n); else { N=+st.n; paint(); } } }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Effort and the spread against net worth ---------- */
  NF.register('ma9-effort',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var D0={d:1, rb:0.8}, m=par(), N=0.1, W=520, H=440, P1, P2, el={}, cur={}, api, pts;
    var rd=range(fig,'d',2,function(v){ m.d=v; solveAll(); paint(); }), rr=range(fig,'rb',2,function(v){ m.Rb=v; solveAll(); paint(); });
    if(rd) m.d=rd.v();
    if(rr) m.Rb=rr.v();
    var rb0=fig.querySelector('.nfig-reset');
    if(rb0) rb0.addEventListener('click',function(){ N=0.1; if(rd) rd.set(D0.d); if(rr) rr.set(D0.rb); });
    function solveAll(){ var i; pts=[]; for(i=0;i<=200;i++) pts.push(solve(m,i/200)); }
    function draw(){
      var rows, mL, mR=8, top, ph, gap=46;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?34:42;
      rows=key(S('g',null,svg),[['line','ma9-e','effort e, hidden'],['line','ma9-fb','first best eᶠᴮ'],['line','ma9-sp','spread, good minus bad repayment'],['rect','ma9-abn','cash constraint binds']],mL,13,W-mR);
      top=13+(rows-1)*16+16; ph=Math.round(clamp(W*0.36,150,210));
      H=top+ph+gap+Math.round(ph*0.8)+38;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P1=box(svg,{x:mL,y:top,w:W-mL-mR,h:ph},[0,1],[0,0.9],{xt:ticks(0,1,0.2),yt:ticks(0,0.9,0.2),noxl:true,yl:'effort'});
      P2=box(svg,{x:mL,y:top+ph+gap,w:W-mL-mR,h:Math.round(ph*0.8)},[0,1],[0,0.7],{xt:ticks(0,1,0.2),yt:ticks(0,0.7,0.2),xl:'net worth N',yl:'spread'});
      el.abn1=S('rect',{'class':'ma9-abn'},P1.gc); el.abn2=S('rect',{'class':'ma9-abn'},P2.gc);
      el.fb=S('path',{'class':'ma9-fb'},P1.gc); el.e=S('path',{'class':'ma9-e'},P1.gc); el.sp=S('path',{'class':'ma9-sp'},P2.gc);
      el.nb1=line(P1.gc,0,0,0,0,'ma9-nbar'); el.nb2=line(P2.gc,0,0,0,0,'ma9-nbar');
      el.c1=line(P1.gc,0,0,0,0,'ma9-cursor'); el.c2=line(P2.gc,0,0,0,0,'ma9-cursor');
      el.dfb=dot(P1.gc,0,0,'ma9-dfb',4); el.dsp=dot(P2.gc,0,0,'ma9-dsp');
      el.tg=S('g',null,svg);
      el.k=knob(svg,'ma9-knob','Net worth N on the effort curve, arrow keys move it',function(dd,big){ setN(N+dd*(big?0.05:0.005)); });
      paint();
    }
    function setN(v){ N=snap(v,0.005,0,1); paint(); }
    function paint(){
      var o=solve(m,N), sx=P1.sx, xn=sx(o.nbar), x=sx(N), b1=P1.b, b2=P2.b, s;
      el.abn1.setAttribute('x',R(b1.x)); el.abn1.setAttribute('y',R(b1.y)); el.abn1.setAttribute('width',R(Math.max(0,Math.min(xn,b1.x+b1.w)-b1.x))); el.abn1.setAttribute('height',R(b1.h));
      el.abn2.setAttribute('x',R(b2.x)); el.abn2.setAttribute('y',R(b2.y)); el.abn2.setAttribute('width',R(Math.max(0,Math.min(xn,b2.x+b2.w)-b2.x))); el.abn2.setAttribute('height',R(b2.h));
      el.fb.setAttribute('d',curve(P1,pts.map(function(q){ return [q.n,q.efb]; })));
      el.e.setAttribute('d',curve(P1,pts.map(function(q){ return [q.n,q.e]; })));
      el.sp.setAttribute('d',curve(P2,pts.map(function(q){ return [q.n,q.spread]; })));
      setLine(el.nb1,xn,b1.y,xn,b1.y+b1.h); setLine(el.nb2,xn,b2.y,xn,b2.y+b2.h);
      setLine(el.c1,x,b1.y,x,b1.y+b1.h); setLine(el.c2,x,b2.y,x,b2.y+b2.h);
      at(el.dfb,x,P1.sy(o.efb)); el.dfb.setAttribute('visibility',o.binds?'visible':'hidden');
      at(el.dsp,x,P2.sy(o.spread));
      place(el.k,x,P1.sy(o.e),N,'N = '+fmt(N,3)+', effort '+fmt(o.e,3)+', spread '+fmt(o.spread,3));
      clear(el.tg);
      if(xn<b1.x+b1.w-30) text(el.tg,xn+5,b2.y+13,'N̄ = '+fmt(o.nbar,3),'nf-lab nf-halo ma9-tnbar');
      else text(el.tg,xn-5,b2.y+13,'N̄ = '+fmt(o.nbar,3),'nf-lab nf-halo ma9-tnbar','end');
      if(xn-b1.x>72) text(el.tg,(b1.x+xn)/2,b1.y+28,'abnormal','nf-lab nf-halo ma9-tshort','middle');
      if(b1.x+b1.w-xn>60) text(el.tg,(xn+b1.x+b1.w)/2,b1.y+28,'normal','nf-lab nf-halo','middle');
      cur={n:N, d:m.d, rb:m.Rb, nbar:o.nbar, e:o.e, efb:o.efb, gap:o.efb-o.e, p:o.p, rgd:o.rgd, rbd:o.rbd, spread:o.spread, stake:o.stake, binds:o.binds};
      if(api) api.changed();
      if(!out) return;
      s='N̄ = (R − Rᵇ)d/Rᵇ = '+fmt(o.nbar,3)+'   N = '+fmt(N,3)+': '+(o.binds?'abnormal times, the bad state cash constraint binds':'normal times, the cash constraint is slack')+
        '\n'+(o.binds?'fund gets '+fmt(o.rbd,3)+' if bad, '+fmt(o.rgd,3)+' if good: spread '+fmt(o.spread,3):'fund gets R = '+fmt(m.R,3)+' in both states: no spread')+
        '   p = '+fmt(o.p,3)+'   e = '+fmt(o.e,3)+(o.binds?' < eᶠᴮ = '+fmt(o.efb,3):' = eᶠᴮ');
      out.textContent=s;
    }
    var size=function(){ return [W,H]; };
    dragN(svg,size,function(){ return P1?[P1.b,P2.b]:[]; },function(x){ setN(P1.sx.inv(x)); },function(){ try{ el.k.focus({preventScroll:true}); }catch(err){} });
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('d' in st){ if(rd) rd.set(+st.d); else { m.d=+st.d; solveAll(); } }
        if('rb' in st){ if(rr) rr.set(+st.rb); else { m.Rb=+st.rb; solveAll(); } }
        if('n' in st) N=snap(+st.n,0.005,0,1);
        paint();
      }
    });
    solveAll(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Shadow values: what bad state cash and net worth are worth ---------- */
  NF.register('ma9-shadow',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var m=par(), N=0, W=520, H=320, P, P2, el={}, cur={}, api, pts=[], i;
    for(i=0;i<=200;i++) pts.push(solve(m,i/200));
    /* the area between two curves of the grid, lo(q) to hi(q) */
    function band(P,lo,hi){
      var a=[], i;
      for(i=0;i<pts.length;i++) a.push([P.sx(pts[i].n),P.sy(hi(pts[i]))]);
      for(i=pts.length-1;i>=0;i--) a.push([P.sx(pts[i].n),P.sy(lo(pts[i]))]);
      return poly(a)+'Z';
    }
    function draw(){
      var rows, mL, mR=8, top, ph, gap=46, xn, b, b2, nb=pts[0].nbar;
      W=measure(svg); frame(svg,W,100);
      mL=W<420?34:42;
      rows=key(S('g',null,svg),[['line','ma9-nu','ν, bad state cash'],['line','ma9-eta','η, incentive constraint'],['rect','ma9-anu','νRᵇ, more bad state cash'],['rect','ma9-aeta','ηλb(Rᵍ − Rᵇ), a bigger stake']],mL,13,W-mR);
      top=13+(rows-1)*16+16; ph=Math.round(clamp(W*0.32,140,190));
      H=top+2*ph+gap+38;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      P=box(svg,{x:mL,y:top,w:W-mL-mR,h:ph},[0,1],[0,0.35],{xt:ticks(0,1,0.2),yt:ticks(0,0.35,0.1),noxl:true,yl:'multipliers'});
      P2=box(svg,{x:mL,y:top+ph+gap,w:W-mL-mR,h:ph},[0,1],[0,0.35],{xt:ticks(0,1,0.2),yt:ticks(0,0.35,0.1),xl:'net worth N',yl:'extra value of N'});
      xn=P.sx(nb); b=P.b; b2=P2.b;
      S('rect',{x:R(b.x),y:R(b.y),width:R(xn-b.x),height:R(b.h),'class':'ma9-abn'},P.gc);
      S('rect',{x:R(b2.x),y:R(b2.y),width:R(xn-b2.x),height:R(b2.h),'class':'ma9-abn'},P2.gc);
      line(P.gc,xn,b.y,xn,b.y+b.h,'ma9-nbar'); line(P2.gc,xn,b2.y,xn,b2.y+b2.h,'ma9-nbar');
      text(svg,xn+5,b.y+28,'N̄ = '+fmt(nb,3),'nf-lab nf-halo ma9-tnbar');
      S('path',{d:curve(P,pts.map(function(q){ return [q.n,q.eta]; })),'class':'ma9-eta'},P.gc);
      S('path',{d:curve(P,pts.map(function(q){ return [q.n,q.nu]; })),'class':'ma9-nu'},P.gc);
      /* the two channels, stacked: more bad state cash below, a bigger stake on top */
      S('path',{d:band(P2,function(){ return 0; },function(q){ return q.pnu; }),'class':'ma9-anu'},P2.gc);
      S('path',{d:band(P2,function(q){ return q.pnu; },function(q){ return q.prem; }),'class':'ma9-aeta'},P2.gc);
      S('path',{d:curve(P2,pts.map(function(q){ return [q.n,q.prem]; })),'class':'ma9-prem'},P2.gc);
      el.c=line(P.gc,0,0,0,0,'ma9-cursor'); el.c2=line(P2.gc,0,0,0,0,'ma9-cursor');
      el.de=dot(P.gc,0,0,'ma9-deta',4); el.dp=dot(P2.gc,0,0,'ma9-dprem',4);
      el.k=knob(svg,'ma9-knu','Net worth N on the ν curve, arrow keys move it',function(dd,big){ setN(N+dd*(big?0.05:0.005)); });
      paint();
    }
    function setN(v){ N=snap(v,0.005,0,1); paint(); }
    function paint(){
      var o=solve(m,N), x=P.sx(N), b=P.b, b2=P2.b, s;
      setLine(el.c,x,b.y,x,b.y+b.h); setLine(el.c2,x,b2.y,x,b2.y+b2.h);
      at(el.dp,x,P2.sy(o.prem)); at(el.de,x,P.sy(o.eta));
      place(el.k,x,P.sy(o.nu),N,'N = '+fmt(N,3)+', ν = '+fmt(o.nu,3)+', η = '+fmt(o.eta,3));
      cur={n:N, nu:o.nu, eta:o.eta, mu:o.mu, prem:o.prem, pnu:o.pnu, peta:o.peta, direct:o.direct, loss:o.loss, binds:o.binds, nbar:o.nbar, e:o.e, spread:o.spread};
      if(api) api.changed();
      if(!out) return;
      s='N = '+fmt(N,3)+': ν = '+fmt(o.nu,3)+', η = '+fmt(o.eta,3)+', μ = λ + ν = '+fmt(o.mu,3)+
        '\na unit of N is worth λ(pRᵍ + (1 − p)Rᵇ) = '+fmt(o.direct,3)+' directly'+
        (o.binds?', plus νRᵇ + ηλb(Rᵍ − Rᵇ) = '+fmt(o.pnu,3)+' + '+fmt(o.peta,3)+' = '+fmt(o.prem,3):', and nothing more: the constraints are slack')+
        '\nwelfare loss ½(eᶠᴮ − e)² = '+fmt(o.loss,3);
      out.textContent=s;
    }
    dragN(svg,function(){ return [W,H]; },function(){ return P?[P.b,P2.b]:[]; },function(x){ setN(P.sx.inv(x)); },function(){ try{ el.k.focus({preventScroll:true}); }catch(err){} });
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){ if('n' in st) setN(+st.n); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
