/* Core Micro L4 figures: the Slutsky decomposition, CV, consumer surplus and EV as areas, price indices against the
   true cost of living, and when individual demands add up. Every number is computed from the stated model.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi4.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  /* a horizontal or slanted arrow; too short to carry a head, it hides */
  function setVec(v,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(len<2.5){ setLine(v.l,x0,y0,x0,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return false; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len; hl=Math.min(8,len*0.6);
    bx=x1-ux*hl; by=y1-uy*hl;
    setLine(v.l,x0,y0,bx+ux*1.5,by+uy*1.5);
    v.h.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
    return true;
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  /* signed number: a plus for positives, the Unicode minus for negatives */
  function sg(v,d){ var s=fmt(v,d); return (v>0 && parseFloat(Math.abs(v).toFixed(d))!==0?'+':'')+s; }
  function ticks(lo,hi,step){ var a=[], v; for(v=Math.ceil(lo/step-1e-9)*step; v<=hi+1e-9; v+=step) a.push(Math.round(v*1000)/1000); return a; }
  /* grid, axis lines, tick labels and axis names for the box [L, Rr] x [T, B] */
  function axes(g,xs,ys,xt,yt,L,Rr,T,B,xname,yname,W){
    var i, v;
    for(i=0;i<xt.length;i++){ v=xt[i]; if(Math.abs(xs(v)-L)>1) line(g,C(xs(v)),T,C(xs(v)),B,'nf-grid'); text(g,xs(v),B+15,tl(v),null,'middle'); }
    for(i=0;i<yt.length;i++){ v=yt[i]; if(Math.abs(ys(v)-B)>1) line(g,L,C(ys(v)),Rr,C(ys(v)),'nf-grid'); text(g,L-6,ys(v)+4,tl(v),null,'end'); }
    line(g,L,C(B),Rr,C(B),'nf-ax'); line(g,C(L),T,C(L),B,'nf-ax');
    if(xname) text(g,W-3,B+15,xname,'nf-title mi4-it','end');
    if(yname) text(g,L-6,T-7,yname,'nf-title mi4-it','end');
  }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  /* a polyline from points [x, y] in model units, dropping points that are not finite */
  function pathOf(pts,xs,ys,ylo,yhi){
    var d='', run=false, i, q;
    for(i=0;i<pts.length;i++){
      q=pts[i];
      if(!isFinite(q[0]) || !isFinite(q[1])){ run=false; continue; }
      d+=(run?'L':'M')+R(xs(q[0]))+','+R(ys(clamp(q[1],ylo,yhi)));
      run=true;
    }
    return d;
  }
  /* Simpson's rule */
  function simpson(f,a,b,n){
    var h=(b-a)/n, s=f(a)+f(b), i;
    for(i=1;i<n;i++) s+=(i%2?4:2)*f(a+i*h);
    return s*h/3;
  }

  /* ---------- the three consumers of the first two figures ----------
     Wealth w = 10, the price of good 2 is 1, and good 1's price moves from 2 to p.
     cd: u = sqrt(x1 x2). ql: u = 4 ln x1 + x2 (interior since w > 4). gif: u = ln(x1 - 1) - 2.5 ln(9.5 - x2)
     (Haagsma 2012): good 1 is a staple with subsistence need 1, good 2 a better food with satiation 9.5. */
  var WL=10, P0=2, PB=1;
  var M={
    cd:{xmax:10.5, qmax:8,
      x:function(p,w){ return [w/(2*p), w/(2*PB)]; },
      v:function(p,w){ return w/(2*Math.sqrt(p*PB)); },
      h:function(p,u){ return [u*Math.sqrt(PB/p), u*Math.sqrt(p/PB)]; },
      ic:function(u,x1){ return u*u/x1; },
      ok:function(x){ return x[0]>0 && x[1]>=-1e-9; },
      lo:function(u,ymax){ return u*u/(ymax*1.3); }},
    ql:{xmax:10.5, qmax:8,
      x:function(p,w){ return [4*PB/p, w/PB-4]; },
      v:function(p,w){ return 4*Math.log(4*PB/p)+w/PB-4; },
      h:function(p,u){ var a=4*PB/p; return [a, u-4*Math.log(a)]; },
      ic:function(u,x1){ return u-4*Math.log(x1); },
      ok:function(x){ return x[0]>0 && x[1]>=-1e-9; },
      lo:function(u,ymax){ return Math.exp((u-ymax*1.3)/4); }},
    gif:{xmax:4, qmax:3.5,
      x:function(p,w){ var a=(5*p+19*PB-2*w)/(3*p); return [a,(w-p*a)/PB]; },
      v:function(p,w){ var a=(5*p+19*PB-2*w)/(3*p), b=(w-p*a)/PB; return Math.log(a-1)-2.5*Math.log(9.5-b); },
      h:function(p,u){ var A=Math.exp((u+2.5*Math.log(2.5*p/PB))/(-1.5)); return [1+A, 9.5-2.5*p*A/PB]; },
      ic:function(u,x1){ return x1<=1?NaN:9.5-Math.pow((x1-1)*Math.exp(-u),0.4); },
      /* outside x1 > 1 and 0 <= x2 < 9.5 the formulas are not the consumer's choice */
      ok:function(x){ return x[0]>1 && x[1]>=-1e-9 && x[1]<9.5; },
      lo:function(){ return 1+1e-7; }}
  };
  function ex(m,p,u){ var h=m.h(p,u); return p*h[0]+PB*h[1]; }
  function icPts(m,u,xmax,ymax){
    var lo=m.lo(u,ymax), pts=[], i, t, x1;
    for(i=0;i<=320;i++){ t=i/320; x1=lo+(xmax*1.02-lo)*t*t; pts.push([x1,m.ic(u,x1)]); }
    return pts;
  }

  /* ---------- 1. Slutsky decomposition in the goods plane ---------- */
  NF.register('mi4-slutsky',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='cd', p=1, W=520, H=360, el={}, xs, ys, L=34, Rr, T, B, YM=12.5, api;
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rp) p=rp.v();
    pre=seg(fig,'data-pre',function(v){ if(!M[v]||v===pre) return; pre=v; draw(); });
    if(!M[pre]) pre='cd';
    function state(){
      var m=M[pre], xA=m.x(P0,WL), u0=m.v(P0,WL), xC=m.x(p,WL), u1=m.v(p,WL), hB=m.h(p,u0), ea=ex(m,p,u0), dp=p-P0, sed, ied, d=1e-5;
      if(Math.abs(dp)>1e-9){ sed=(hB[0]-xA[0])/dp; ied=(xC[0]-hB[0])/dp; }
      else { sed=(m.h(P0+d,u0)[0]-m.h(P0-d,u0)[0])/(2*d); ied=(m.x(P0+d,WL)[0]-m.x(P0-d,WL)[0])/(2*d)-sed; }
      return {m:m, xA:xA, xB:hB, xC:xC, u0:u0, u1:u1, ea:ea, se:hB[0]-xA[0], ie:xC[0]-hB[0], tot:xC[0]-xA[0], cv:WL-ea, sed:sed, ied:ied};
    }
    function draw(){
      var m=M[pre], g, gc, rows, PH;
      W=measure(svg); frame(svg,W,400);
      rows=key(S('g',null,svg),[['line','mi4-bud0','old budget'],['line','mi4-bud1','new budget'],['line','mi4-comp','compensated: new prices, old utility']],L,12,W-6);
      T=rows*16+18; Rr=W-26; PH=Math.round(clamp((W-60)*0.5,190,260)); B=T+PH; H=B+72;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0,m.xmax,L,Rr); ys=lin(0,YM,B,T);
      g=S('g',null,svg);
      axes(g,xs,ys,ticks(0,m.xmax,m.xmax>6?2:1),ticks(0,12,2),L,Rr,T,B,'x₁','x₂',W);
      gc=clip(svg,L,T,Rr-L,B-T);
      if(pre==='gif'){ line(gc,C(xs(1)),T,C(xs(1)),B,'mi4-lim'); line(gc,L,C(ys(9.5)),Rr,C(ys(9.5)),'mi4-lim'); }
      el.ic0=S('path',{'class':'mi4-ic'},gc); el.ic1=S('path',{'class':'mi4-ic mi4-ic1'},gc);
      el.b0=line(gc,0,0,0,0,'mi4-bud0'); el.b1=line(gc,0,0,0,0,'mi4-bud1'); el.bc=line(gc,0,0,0,0,'mi4-comp');
      el.gA=line(gc,0,0,0,0,'mi4-guide'); el.gB=line(gc,0,0,0,0,'mi4-guide'); el.gC=line(gc,0,0,0,0,'mi4-guide');
      el.cv=line(svg,0,0,0,0,'mi4-cvb');
      el.cvl=text(svg,0,0,'CV','mi4-tcv nf-halo');
      el.pA=S('circle',{r:4.5,'class':'mi4-pa'},svg); el.pB=S('circle',{r:4.5,'class':'mi4-pb'},svg); el.pC=S('circle',{r:4.5,'class':'mi4-pc'},svg);
      el.lA=text(svg,0,0,'A','nf-lab nf-halo'); el.lB=text(svg,0,0,'B','mi4-tse nf-halo'); el.lC=text(svg,0,0,'C','nf-lab nf-halo');
      el.u0=text(svg,0,0,'u⁰','nf-lab nf-halo mi4-it'); el.u1=text(svg,0,0,'u¹','nf-lab nf-halo mi4-it');
      /* the decomposition along the x1 axis: SE from A to B on one rail, IE from B to C on the next */
      el.r1=B+36; el.r2=B+58;
      text(svg,L-6,el.r1+4,'SE','mi4-tse','end'); text(svg,L-6,el.r2+4,'IE','mi4-tie','end');
      el.t=[]; for(var i=0;i<4;i++) el.t.push(line(svg,0,0,0,0,'mi4-tick'));
      el.se=vec(svg,'mi4-se','mi4-seh'); el.ie=vec(svg,'mi4-ie','mi4-ieh');
      el.sev=text(svg,0,0,'','mi4-tse nf-halo'); el.iev=text(svg,0,0,'','mi4-tie nf-halo');
      update();
    }
    function lab(e,x,y,dx,dy){ moveTo(e,x+dx,y+dy); }
    function icLabel(e,pts){
      /* at the last point of the curve inside the box */
      var i, q, X, Y;
      for(i=pts.length-1;i>=0;i--){ q=pts[i]; if(isFinite(q[1]) && q[0]<=M[pre].xmax && q[1]>=0.4 && q[1]<=YM){ X=xs(q[0]); Y=ys(q[1]); break; } }
      if(X===undefined){ e.textContent=''; return; }
      e.setAttribute('text-anchor',X>Rr-24?'end':'start');
      moveTo(e,X>Rr-24?X-4:X+4,Y-6);
    }
    function update(){
      var st=state(), m=st.m, P0x, q0=icPts(m,st.u0,m.xmax,YM), q1=icPts(m,st.u1,m.xmax,YM), xa=xs(st.xA[0]), xb=xs(st.xB[0]), xc=xs(st.xC[0]), y0, y1, s;
      el.ic0.setAttribute('d',pathOf(q0,xs,ys,-1,YM*1.5));
      el.ic1.setAttribute('d',Math.abs(st.u1-st.u0)<1e-9?'':pathOf(q1,xs,ys,-1,YM*1.5));
      el.u0.textContent='u⁰'; el.u1.textContent=Math.abs(st.u1-st.u0)<1e-9?'':'u¹';
      icLabel(el.u0,q0); if(el.u1.textContent) icLabel(el.u1,q1);
      /* two labels at the right edge too close to read: push them apart vertically */
      if(el.u1.textContent){
        var y0l=+el.u0.getAttribute('y'), y1l=+el.u1.getAttribute('y'), x0l=+el.u0.getAttribute('x'), x1l=+el.u1.getAttribute('x');
        if(Math.abs(y0l-y1l)<13 && Math.abs(x0l-x1l)<30){ var up=y0l<y1l?el.u0:el.u1, dn=up===el.u0?el.u1:el.u0, mid=(y0l+y1l)/2; up.setAttribute('y',R(mid-7)); dn.setAttribute('y',R(mid+7)); }
      }
      setLine(el.b0,xs(0),ys(WL/PB),xs(WL/P0),ys(0));
      setLine(el.b1,xs(0),ys(WL/PB),xs(WL/p),ys(0));
      setLine(el.bc,xs(0),ys(st.ea/PB),xs(st.ea/p),ys(0));
      setLine(el.gA,xa,ys(st.xA[1]),xa,B); setLine(el.gB,xb,ys(st.xB[1]),xb,B); setLine(el.gC,xc,ys(st.xC[1]),xc,B);
      at(el.pA,xa,ys(st.xA[1])); at(el.pB,xb,ys(st.xB[1])); at(el.pC,xc,ys(st.xC[1]));
      /* A and C are labelled on the sides facing away from each other, B above or below by where it sits */
      var dir=xc>=xa?1:-1, ya=ys(st.xA[1]), yb=ys(st.xB[1]), yc=ys(st.xC[1]);
      el.lA.setAttribute('text-anchor',dir>0?'end':'start'); lab(el.lA,xa,ya,-dir*8,-6);
      el.lC.setAttribute('text-anchor',dir>0?'start':'end'); lab(el.lC,xc,yc,dir*8,-6);
      el.lB.setAttribute('text-anchor','middle'); lab(el.lB,xb,yb,0,yb>=ya?17:-9);
      el.lB.textContent=Math.abs(p-P0)<1e-9?'':'B'; el.lC.textContent=Math.abs(p-P0)<1e-9?'':'C';
      /* CV on the x2 axis: with the price of good 2 at 1, a budget line meets that axis at its wealth */
      y0=ys(WL/PB); y1=ys(clamp(st.ea/PB,0,YM));
      if(Math.abs(y1-y0)>3){ setLine(el.cv,L+3,y0,L+3,y1); moveTo(el.cvl,L+9,(y0+y1)/2+4); el.cvl.textContent='CV'; }
      else { setLine(el.cv,0,0,0,0); el.cvl.textContent=''; }
      /* rails */
      setLine(el.t[0],xa,el.r1-5,xa,el.r1+5); setLine(el.t[1],xb,el.r1-5,xb,el.r1+5);
      setLine(el.t[2],xb,el.r2-5,xb,el.r2+5); setLine(el.t[3],xc,el.r2-5,xc,el.r2+5);
      setVec(el.se,xa,el.r1,xb,el.r1); setVec(el.ie,xb,el.r2,xc,el.r2);
      el.sev.textContent=sg(st.se,2); el.iev.textContent=sg(st.ie,2);
      placeVal(el.sev,xa,xb,el.r1); placeVal(el.iev,xb,xc,el.r2);
      if(api) api.changed();
      if(!out) return;
      s='p₁: 2 → '+fmt(p,2)+'   x₁ at A '+fmt(st.xA[0],2)+', B '+fmt(st.xB[0],2)+', C '+fmt(st.xC[0],2)+
        '\nSE = '+sg(st.se,2)+'   IE = '+sg(st.ie,2)+'   total = '+sg(st.tot,2)+
        '\ne(p¹, u⁰) = '+fmt(st.ea,2)+', so CV = w '+MINUS+' e(p¹, u⁰) = '+fmt(st.cv,2);
      if(Math.abs(p-P0)>1e-9 && st.tot*(p-P0)>0) s+='\nx₁ moves with its own price: a Giffen good';
      out.textContent=s;
    }
    /* the value sits beyond the arrow's head, or before its tail when the head is near the edge */
    function placeVal(e,x0,x1,y){
      var right=x1>=x0, w=38;
      if(right){ if(x1+w+6<Rr+24){ e.setAttribute('text-anchor','start'); moveTo(e,x1+6,y+4); } else { e.setAttribute('text-anchor','end'); moveTo(e,Math.min(x0,x1)-6,y+4); } }
      else { if(x1-w-6>L){ e.setAttribute('text-anchor','end'); moveTo(e,x1-6,y+4); } else { e.setAttribute('text-anchor','start'); moveTo(e,Math.max(x0,x1)+6,y+4); } }
    }
    /* the Try it steps read the bundles, the two effects and the compensation, and can pick a consumer and a price */
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, p:p, xa:st.xA[0], xb:st.xB[0], xc:st.xC[0], se:st.se, ie:st.ie, tot:st.tot, ea:st.ea, cv:st.cv, sed:st.sed, ied:st.ied, tod:st.sed+st.ied}; },
      set:function(st){ if('pre' in st) NF.press(fig,'data-pre',String(st.pre)); if('p' in st && rp) rp.set(+st.p); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. CV, consumer surplus and EV as areas ---------- */
  NF.register('mi4-welfare',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='cd', p=1, W=520, H=320, el={}, xs, ys, L=34, Rr, T, B, YM=4, api;
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rp) p=rp.v();
    pre=seg(fig,'data-pre',function(v){ if(!M[v]||v===pre) return; pre=v; draw(); });
    if(!M[pre]) pre='cd';
    function state(){
      var m=M[pre], u0=m.v(P0,WL), u1=m.v(p,WL), cv=WL-ex(m,p,u0), evv=ex(m,P0,u1)-WL,
          cs=Math.abs(p-P0)<1e-12?0:simpson(function(q){ return m.x(q,WL)[0]; },p,P0,200), rank;
      if(Math.abs(evv-cv)<1e-9) rank='none';
      else if(cv<cs && cs<evv) rank='normal';
      else if(evv<cs && cs<cv) rank='inferior';
      else rank='mixed';
      return {m:m, u0:u0, u1:u1, cv:cv, ev:evv, cs:cs, rank:rank};
    }
    function draw(){
      var m=M[pre], g, rows, PH;
      W=measure(svg); frame(svg,W,400);
      rows=key(S('g',null,svg),[['line','mi4-h0','h₁(p, u⁰)'],['line','mi4-mx','x₁(p, w)'],['line','mi4-h1','h₁(p, u¹)']],L,12,W-6);
      T=rows*16+18; Rr=W-58; PH=Math.round(clamp((W-60)*0.48,180,240)); B=T+PH; H=B+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0,m.qmax,L,Rr); ys=lin(0,YM,B,T);
      g=S('g',null,svg);
      axes(g,xs,ys,ticks(0,m.qmax,m.qmax>5?2:1),ticks(0,YM,1),L,Rr,T,B,'x₁','p₁',W);
      el.gc=clip(svg,L,T,Rr-L,B-T);
      el.f=[S('path',{'class':'mi4-f'},el.gc),S('path',{'class':'mi4-f'},el.gc),S('path',{'class':'mi4-f'},el.gc)];
      el.h0=S('path',{'class':'mi4-h0'},el.gc); el.mx=S('path',{'class':'mi4-mx'},el.gc); el.h1=S('path',{'class':'mi4-h1'},el.gc);
      el.pl0=line(svg,L,0,Rr,0,'mi4-pl'); el.pl1=line(svg,L,0,Rr,0,'mi4-pl');
      el.t0=text(svg,Rr+6,0,'p⁰ = 2','nf-lab'); el.t1=text(svg,Rr+6,0,'','nf-lab');
      el.d0=S('circle',{r:4,'class':'mi4-dmx'},svg); el.d1=S('circle',{r:4,'class':'mi4-dmx'},svg);
      update();
    }
    function curve(f){
      var pts=[], i, q, x, m=M[pre];
      /* a curve ends where its bundle leaves the consumption set (a Hicksian bundle would need negative x2) */
      for(i=0;i<=300;i++){ q=0.05+(YM*1.05-0.05)*i/300; x=f(q); pts.push(m.ok(x)?[x[0],q]:[NaN,NaN]); }
      return pts;
    }
    function pathXP(pts){
      var d='', run=false, i;
      for(i=0;i<pts.length;i++){
        if(!isFinite(pts[i][0])){ run=false; continue; }
        d+=(run?'L':'M')+R(xs(Math.min(pts[i][0],M[pre].qmax*1.3)))+','+R(ys(pts[i][1]));
        run=true;
      }
      return d;
    }
    var CLS={cv:'mi4-f mi4-fcv', cs:'mi4-f mi4-fcs', ev:'mi4-f mi4-fev'};
    function update(){
      var st=state(), m=st.m, lo=Math.min(p,P0), hi=Math.max(p,P0), mid=(lo+hi)/2, fx, order, i, k, pts, a, b, q, n=60, s, txt;
      el.h0.setAttribute('d',pathXP(curve(function(q){ return m.h(q,st.u0); })));
      el.mx.setAttribute('d',pathXP(curve(function(q){ var x=m.x(q,WL); return [x[0],x[1]]; })));
      el.h1.setAttribute('d',Math.abs(st.u1-st.u0)<1e-12?'':pathXP(curve(function(q){ return m.h(q,st.u1); })));
      /* the three areas left of the curves between the two prices, the smallest first, each extra sliver in its colour */
      fx={cv:function(q){ return m.h(q,st.u0)[0]; }, cs:function(q){ return m.x(q,WL)[0]; }, ev:function(q){ return m.h(q,st.u1)[0]; }};
      order=['cv','cs','ev'].sort(function(u,v){ return fx[u](mid)-fx[v](mid); });
      for(k=0;k<3;k++){
        if(hi-lo<1e-9){ el.f[k].setAttribute('d',''); continue; }
        a=[]; b=[];
        for(i=0;i<=n;i++){ q=lo+(hi-lo)*i/n; a.push([xs(k?fx[order[k-1]](q):0),ys(q)]); b.push([xs(fx[order[k]](q)),ys(q)]); }
        el.f[k].setAttribute('d',poly(a.concat(b.reverse()))+'Z');
        el.f[k].setAttribute('class',CLS[order[k]]);
      }
      setLine(el.pl0,L,C(ys(P0)),Rr,C(ys(P0))); moveTo(el.t0,Rr+6,ys(P0)+4);
      setLine(el.pl1,L,C(ys(p)),Rr,C(ys(p))); moveTo(el.t1,Rr+6,ys(p)+(p<P0?13:-5));
      el.t1.textContent=Math.abs(p-P0)<1e-9?'':'p¹ = '+fmt(p,2);
      moveTo(el.t0,Rr+6,ys(P0)+(Math.abs(p-P0)<1e-9?4:(p<P0?-5:13)));
      at(el.d0,xs(m.x(P0,WL)[0]),ys(P0)); at(el.d1,xs(m.x(p,WL)[0]),ys(p));
      if(api) api.changed();
      if(!out) return;
      s='CV = '+fmt(st.cv,2)+'   ΔCS = '+fmt(st.cs,2)+'   EV = '+fmt(st.ev,2);
      if(Math.abs(p-P0)<1e-9) txt='no price change, so all three are 0';
      else if(st.rank==='none') txt='CV = ΔCS = EV: good 1 has no income effect';
      else if(st.rank==='normal') txt='CV < ΔCS < EV: good 1 is normal';
      else if(st.rank==='inferior') txt='EV < ΔCS < CV: good 1 is inferior';
      else txt='';
      out.textContent=s+(txt?'\n'+txt:'')+(Math.abs(p-P0)>1e-9?(p>P0?'; a price rise, so all three are negative':'; a price fall, so all three are positive'):'');
    }
    /* the Try it steps read the three measures and their order, and can pick a consumer and a new price */
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, p:p, cv:st.cv, cs:st.cs, ev:st.ev, rank:st.rank, gap:st.ev-st.cv}; },
      set:function(st){ if('pre' in st) NF.press(fig,'data-pre',String(st.pre)); if('p' in st && rp) rp.set(+st.p); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Price indices against the true cost of living ----------
     CES utility over x - g with weight 1/2 on each good and elasticity of substitution sigma. g = (0, 0) is homothetic;
     g = (2, 0) adds a subsistence need of 2 units of good 1. Prices move from (2, 1) to (p, 1); wealth is 10. */
  function cesCost(p1,p2,s){
    if(s<1e-9) return p1+p2;
    if(Math.abs(s-1)<1e-9) return 2*Math.sqrt(p1*p2);
    return Math.pow(Math.pow(0.5,s)*Math.pow(p1,1-s)+Math.pow(0.5,s)*Math.pow(p2,1-s),1/(1-s));
  }
  function cesGrad(p1,p2,s){ var c=cesCost(p1,p2,s); return [Math.pow(0.5,s)*Math.pow(p1,-s)*Math.pow(c,s), Math.pow(0.5,s)*Math.pow(p2,-s)*Math.pow(c,s)]; }
  function cesIC(u,s,zx,zy){
    /* points (z1, z2) with CES(z) = u inside [0, zx] x [0, zy] */
    var pts=[], i, t, z1, rho, lo, hi;
    if(s<1e-9) return [[u,zy*1.5],[u,u],[zx*1.5,u]];
    if(Math.abs(s-1)<1e-9){ lo=u*u/(zy*1.5); for(i=0;i<=300;i++){ t=i/300; z1=lo+(zx*1.05-lo)*t*t; pts.push([z1,u*u/z1]); } return pts; }
    rho=(s-1)/s;
    if(rho<0){ lo=u*Math.pow(0.5,-1/rho); hi=zx*1.05; }
    else { lo=0; hi=u*Math.pow(0.5,-1/rho); }
    for(i=0;i<=300;i++){
      t=i/300; z1=rho<0?lo+(hi-lo)*Math.pow(t,4)+1e-9*(hi-lo):lo+(hi-lo)*t;
      var r=(Math.pow(u,rho)-0.5*Math.pow(z1,rho))/0.5;
      pts.push([z1, r>0?Math.pow(r,1/rho):(rho>0?0:NaN)]);
    }
    return pts;
  }
  NF.register('mi4-index',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='hom', view='las', sig=1, p=3, W=520, H=340, el={}, xs, ys, L=34, Rr, T, B, XM=10.5, YM=14.5, api;
    var G={hom:[0,0], sub:[2,0]};
    var rs=range(fig,'sigma',2,function(v){ sig=v; update(); });
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rs) sig=rs.v();
    if(rp) p=rp.v();
    pre=seg(fig,'data-pre',function(v){ if(!G[v]||v===pre) return; pre=v; draw(); });
    view=seg(fig,'data-view',function(v){ if(v===view) return; view=v; update(); });
    if(!G[pre]) pre='hom';
    function model(){
      var g=G[pre];
      function e(p1,u){ return p1*g[0]+PB*g[1]+u*cesCost(p1,PB,sig); }
      function h(p1,u){ var d=cesGrad(p1,PB,sig); return [g[0]+u*d[0], g[1]+u*d[1]]; }
      function v(p1,w){ return (w-p1*g[0]-PB*g[1])/cesCost(p1,PB,sig); }
      return {g:g, e:e, h:h, v:v, x:function(p1,w){ return h(p1,v(p1,w)); }};
    }
    function state(){
      var m=model(), x0=m.x(P0,WL), u0=m.v(P0,WL), x1=m.x(p,WL), u1=m.v(p,WL), c0=p*x0[0]+PB*x0[1], e1=m.e(p,u0), c1=P0*x1[0]+PB*x1[1], e0=m.e(P0,u1);
      return {m:m, x0:x0, x1:x1, u0:u0, u1:u1, c0:c0, e1:e1, c1:c1, e0:e0, las:c0/WL, pl:e1/WL, pas:WL/c1, pp:WL/e0, h1:m.h(p,u0), h0:m.h(P0,u1)};
    }
    function draw(){
      var g, gc, rows, PH;
      W=measure(svg); frame(svg,W,400);
      rows=key(S('g',null,svg),[['line','mi4-bud1','budget'],['line','mi4-las','other prices, old bundle'],['line','mi4-col','other prices, same utility']],L,12,W-6);
      T=rows*16+18; Rr=W-26; PH=Math.round(clamp((W-60)*0.5,190,260)); B=T+PH; H=B+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0,XM,L,Rr); ys=lin(0,YM,B,T);
      g=S('g',null,svg);
      axes(g,xs,ys,ticks(0,XM,2),ticks(0,14,2),L,Rr,T,B,'x₁','x₂',W);
      gc=clip(svg,L,T,Rr-L,B-T);
      el.sub=S('path',{'class':'mi4-lim'},gc);
      el.ic=S('path',{'class':'mi4-ic'},gc);
      el.bud=line(gc,0,0,0,0,'mi4-bud1'); el.las=line(gc,0,0,0,0,'mi4-las'); el.col=line(gc,0,0,0,0,'mi4-col');
      el.gap=line(svg,0,0,0,0,'mi4-gapb');
      el.px=S('circle',{r:4.5,'class':'mi4-pc'},svg); el.ph=S('circle',{r:4.5,'class':'mi4-pb'},svg);
      el.lx=text(svg,0,0,'','nf-lab nf-halo mi4-it'); el.lh=text(svg,0,0,'','mi4-tse nf-halo mi4-it'); el.lu=text(svg,0,0,'','nf-lab nf-halo mi4-it');
      update();
    }
    function update(){
      var st=state(), m=st.m, las=view==='las', pr=las?p:P0, bp=las?P0:p, xb=las?st.x0:st.x1, u=las?st.u0:st.u1, hb=las?st.h1:st.h0,
          cost=las?st.c0:st.c1, eu=las?st.e1:st.e0, pts, s, i, q, X, Y, top;
      pts=cesIC(u,sig,XM*1.2,YM*1.2).map(function(z){ return [z[0]+m.g[0], z[1]+m.g[1]]; });
      el.ic.setAttribute('d',pathOf(pts,xs,ys,-1,YM*1.5));
      el.sub.setAttribute('d',m.g[0]>0?'M'+R(xs(m.g[0]))+','+R(T)+'V'+R(B):'');
      setLine(el.bud,xs(0),ys(WL/PB),xs(WL/bp),ys(0));
      setLine(el.las,xs(0),ys(cost/PB),xs(cost/pr),ys(0));
      setLine(el.col,xs(0),ys(eu/PB),xs(eu/pr),ys(0));
      /* the gap between the two parallel lines on the x2 axis is the substitution bias in money */
      if(Math.abs(ys(cost)-ys(eu))>2.5) setLine(el.gap,L+3,ys(Math.min(cost,YM)),L+3,ys(Math.min(eu,YM))); else setLine(el.gap,0,0,0,0);
      at(el.px,xs(xb[0]),ys(xb[1])); at(el.ph,xs(hb[0]),ys(hb[1]));
      /* the chosen bundle is labelled below left, in the empty corner under every line through it;
         the purple dot is named in the caption, since every side of it is crowded */
      el.lx.textContent=las?'x⁰':'x¹'; el.lx.setAttribute('text-anchor','end'); moveTo(el.lx,xs(xb[0])-9,ys(xb[1])+15);
      el.lh.textContent='';
      el.lu.textContent=las?'u⁰':'u¹';
      X=undefined;
      for(i=pts.length-1;i>=0;i--){ q=pts[i]; if(isFinite(q[1]) && q[0]<=XM && q[1]>=0.5 && q[1]<=YM){ X=xs(q[0]); Y=ys(q[1]); break; } }
      if(X!==undefined){ el.lu.setAttribute('text-anchor',X>Rr-24?'end':'start'); moveTo(el.lu,X>Rr-24?X-4:X+4,Y-6); } else el.lu.textContent='';
      if(api) api.changed();
      if(!out) return;
      if(las) s='Laspeyres index p¹·x⁰ / p⁰·x⁰ = '+fmt(st.c0,2)+' / 10 = '+fmt(st.las,3)+'\n  ≥ true index at u⁰: e(p¹, u⁰) / e(p⁰, u⁰) = '+fmt(st.e1,2)+' / 10 = '+fmt(st.pl,3);
      else s='Paasche index p¹·x¹ / p⁰·x¹ = 10 / '+fmt(st.c1,2)+' = '+fmt(st.pas,3)+'\n  ≤ true index at u¹: e(p¹, u¹) / e(p⁰, u¹) = 10 / '+fmt(st.e0,2)+' = '+fmt(st.pp,3);
      s+=pre==='hom'?'\nhomothetic: the true index is '+fmt(st.pl,3)+' at every utility level':'\nnot homothetic: the true index is '+fmt(st.pl,3)+' at u⁰ but '+fmt(st.pp,3)+' at u¹';
      out.textContent=s;
    }
    /* the Try it steps read the four indices and the bias, and can pick the model, the view, sigma and the new price */
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, view:view, sigma:sig, p:p, las:st.las, pl:st.pl, pas:st.pas, pp:st.pp, bias:st.c0-st.e1, cost:st.c0, e1:st.e1, c1:st.c1, e0:st.e0}; },
      set:function(st){
        if('pre' in st) NF.press(fig,'data-pre',String(st.pre));
        if('view' in st) NF.press(fig,'data-view',String(st.view));
        if('sigma' in st && rs) rs.set(+st.sigma);
        if('p' in st && rp) rp.set(+st.p);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Aggregation: Engel curves and the wealth split ----------
     Prices (2, 1); total wealth 20, w1 to consumer 1 and the rest to consumer 2.
     gor: Stone Geary with weight 1/2 and subsistence (2, 0) and (0, 4): x1 = 1 + w/4 and (w - 4)/4, the same slope.
     cd: Cobb Douglas with weights 0.8 and 0.2 on good 1: x1 = 0.4 w and 0.1 w.
     ql: both have u = 8 ln x1 + x2: x1 = w/2 up to w = 8, then 4. */
  var WT=20;
  var E={
    gor:{a:function(w){ return w<4-1e-9?NaN:1+w/4; }, b:function(w){ return w<4-1e-9?NaN:(w-4)/4; },
         sa:function(){ return 0.25; }, sb:function(){ return 0.25; }, lo:4},
    cd:{a:function(w){ return 0.4*w; }, b:function(w){ return 0.1*w; }, sa:function(){ return 0.4; }, sb:function(){ return 0.1; }, lo:0},
    ql:{a:function(w){ return Math.min(w/2,4); }, b:function(w){ return Math.min(w/2,4); },
        /* slope to the right for the one who gains, to the left for the one who loses */
        sa:function(w){ return w<8-1e-9?0.5:0; }, sb:function(w){ return w<=8+1e-9?0.5:0; }, lo:0}
  };
  NF.register('mi4-gorman',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='gor', w1=10, W=520, H=380, el={}, xs, ya, yb, L=34, Rr, T1, B1, T2, B2, YM=9, api;
    var rw=range(fig,'w1',1,function(v){ w1=v; update(); });
    if(rw) w1=rw.v();
    pre=seg(fig,'data-pre',function(v){ if(!E[v]||v===pre) return; pre=v; draw(); });
    if(!E[pre]) pre='gor';
    function state(){
      var m=E[pre], w2=WT-w1, a=m.a(w1), b=m.b(w2), sa=m.sa(w1), sb=m.sb(w2);
      return {m:m, w2:w2, a:a, b:b, agg:a+b, sa:sa, sb:sb, dx:sa-sb};
    }
    function draw(){
      var m=E[pre], g, rows, PH, i, pts, w;
      W=measure(svg); frame(svg,W,500);
      rows=key(S('g',null,svg),[['line','mi4-ea','consumer 1'],['line','mi4-eb','consumer 2'],['line','mi4-agg','aggregate X₁']],L,12,W-6);
      T1=rows*16+18; Rr=W-26; PH=Math.round(clamp((W-60)*0.3,120,150)); B1=T1+PH; T2=B1+40; B2=T2+PH; H=B2+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0,WT,L,Rr); ya=lin(0,YM,B1,T1); yb=lin(0,YM,B2,T2);
      g=S('g',null,svg);
      axes(g,xs,ya,ticks(0,WT,4),ticks(0,8,2),L,Rr,T1,B1,'w','x₁',W);
      axes(g,xs,yb,ticks(0,WT,4),ticks(0,8,2),L,Rr,T2,B2,'w₁','X₁',W);
      el.ga=clip(svg,L,T1-2,Rr-L,B1-T1+2); el.gb=clip(svg,L,T2-2,Rr-L,B2-T2+2);
      for(var k=0;k<2;k++){
        pts=[];
        for(i=0;i<=400;i++){ w=WT*i/400; pts.push([w,(k?m.b:m.a)(w)]); }
        /* identical consumers would hide one curve under the other, so the second is dashed */
        S('path',{d:pathOf(pts,xs,ya,-1,YM*1.2),'class':k?(pre==='ql'?'mi4-eb mi4-ebd':'mi4-eb'):'mi4-ea'},el.ga);
      }
      pts=[];
      for(i=0;i<=240;i++){ w=4+12*i/240; pts.push([w,m.a(w)+m.b(WT-w)]); }
      S('path',{d:pathOf(pts,xs,yb,-1,YM*1.2),'class':'mi4-agg'},el.gb);
      el.va=line(svg,0,0,0,0,'mi4-guide'); el.vb=line(svg,0,0,0,0,'mi4-guide'); el.vc=line(svg,0,0,0,0,'mi4-guide');
      el.da=S('circle',{r:4.5,'class':'mi4-dea'},svg); el.db=S('circle',{r:4.5,'class':'mi4-deb'},svg); el.dc=S('circle',{r:4.5,'class':'mi4-dagg'},svg);
      el.ta=text(svg,0,0,'','mi4-tea nf-halo'); el.tb=text(svg,0,0,'','mi4-teb nf-halo');
      update();
    }
    function update(){
      var st=state(), s;
      setLine(el.va,xs(w1),ya(st.a),xs(w1),B1); setLine(el.vb,xs(st.w2),ya(st.b),xs(st.w2),B1);
      setLine(el.vc,xs(w1),T2,xs(w1),B2);
      at(el.da,xs(w1),ya(st.a)); at(el.db,xs(st.w2),ya(st.b)); at(el.dc,xs(w1),yb(st.agg));
      el.ta.textContent='w₁'; el.tb.textContent='w₂';
      el.ta.setAttribute('text-anchor','middle'); el.tb.setAttribute('text-anchor','middle');
      moveTo(el.ta,xs(w1),ya(st.a)-9); moveTo(el.tb,xs(st.w2),ya(st.b)-9);
      if(Math.abs(xs(w1)-xs(st.w2))<14 && Math.abs(ya(st.a)-ya(st.b))<14){ moveTo(el.ta,xs(w1)-10,ya(st.a)-9); moveTo(el.tb,xs(st.w2)+10,ya(st.b)-9); }
      if(api) api.changed();
      if(!out) return;
      s='w₁ = '+fmt(w1,1)+', w₂ = '+fmt(st.w2,1)+':   X₁ = '+fmt(st.a,2)+' + '+fmt(st.b,2)+' = '+fmt(st.agg,2)+
        '\nEngel slopes '+fmt(st.sa,2)+' and '+fmt(st.sb,2)+': one unit of wealth moved from consumer 2 to consumer 1 changes X₁ by '+fmt(st.dx,2);
      out.textContent=s;
    }
    /* the Try it steps read the two demands, the aggregate and the Engel slopes, and can pick the pair and the split */
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, w1:w1, w2:st.w2, xa:st.a, xb:st.b, agg:st.agg, sa:st.sa, sb:st.sb, dx:st.dx}; },
      set:function(st){ if('pre' in st) NF.press(fig,'data-pre',String(st.pre)); if('w1' in st && rw) rw.set(+st.w1); }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
