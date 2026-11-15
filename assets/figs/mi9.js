/* Core Micro L9 figures: a small open economy with Cobb Douglas technology, the Edgeworth box with its contract curve,
   the First Welfare Theorem with and without local nonsatiation, the two failures of the Second Welfare Theorem,
   existence (excess demand on the simplex, three equilibria, the Brouwer map) and gross substitutes.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi9.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;
  var clipN=0;

  /* ---------- shared ---------- */
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); return g; }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function good(out,s){ var sp=document.createElement('span'); sp.className='mi9-okt'; sp.textContent=s; out.appendChild(sp); }
  /* a slider that only matters in some views is dimmed and disabled in the others */
  function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
  function niceStep(span,n){
    var raw=span/n, p=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/p;
    return p*(f<1.5?1:f<2.25?2:f<3.5?2.5:f<7.5?5:10);
  }
  function ticks(lo,hi,n){ var s=niceStep(hi-lo,n), t=[], v; for(v=Math.ceil(lo/s-1e-9)*s;v<=hi+1e-9;v+=s) t.push(Math.round(v/s)*s); return {t:t, s:s}; }
  function dec(step){ return step>=1?0:step>=0.1?1:step>=0.01?2:3; }
  /* the smallest of 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 times a power of ten that is at least v */
  function niceUp(v){
    var p=Math.pow(10,Math.floor(Math.log10(v))), f=v/p, c=[1,1.5,2,2.5,3,4,5,6,8,10], i;
    for(i=0;i<c.length;i++) if(f<=c[i]+1e-9) return c[i]*p;
    return 10*p;
  }
  function scale(d0,d1,r0,r1){ var f=lin(d0,d1,r0,r1); f.r0=r0; f.r1=r1; f.d0=d0; f.d1=d1; return f; }
  function logScale(d0,d1,r0,r1){
    var a=Math.log(d0), b=Math.log(d1);
    function f(v){ return r0+(Math.log(v)-a)/(b-a)*(r1-r0); }
    f.inv=function(p){ return Math.exp(a+(p-r0)/(r1-r0)*(b-a)); };
    f.r0=r0; f.r1=r1; f.d0=d0; f.d1=d1;
    return f;
  }
  /* frame of a plot: grid, axes and tick labels; xs and ys map data to svg units */
  function axes(g,xs,ys,xt,yt,xd,yd,xl){
    var x0=xs.r0, x1=xs.r1, y0=ys.r0, y1=ys.r1, i, v;
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,x0,C(ys(v)),x1,C(ys(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,x0-7,ys(v)+4,fmt(v,yd),null,'end'); }
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(xs(v)),y0,C(xs(v)),y1,'nf-grid'); text(g,xs(v),y0+17,xl?xl[i]:fmt(v,xd),null,'middle'); }
    line(g,x0,C(y0),x1,C(y0),'nf-ax');
    line(g,C(x0),y1,C(x0),y0,'nf-ax');
  }
  function path(g,pts,cls){ return S('path',{d:poly(pts),'class':cls},g); }
  function lab(g,x,y,s,cls,anchor){ return text(g,x,y,s,(cls?cls+' ':'')+'nf-halo',anchor); }
  /* text with a subscript, for O_a and O_b */
  function subt(g,x,y,base,sub,cls,anchor){
    var e=text(g,x,y,base,cls,anchor), ts=S('tspan',{'class':'nf-sub',dy:'3'},e);
    ts.textContent=sub;
    return e;
  }
  function dot(g,x,y,r,cls){ return S('circle',{cx:R(x),cy:R(y),r:r,'class':cls},g); }
  function square(g,x,y,cls){ return S('rect',{x:R(x-4.5),y:R(y-4.5),width:9,height:9,'class':cls},g); }
  function arrow(g,x1,y1,x2,y2,cls,hcls){
    var dx=x2-x1, dy=y2-y1, d=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(d<3) return;
    ux=dx/d; uy=dy/d; hl=Math.min(8,d*0.6); bx=x2-ux*hl; by=y2-uy*hl;
    line(g,x1,y1,bx,by,cls);
    S('path',{d:poly([[x2,y2],[bx-uy*4.2,by+ux*4.2],[bx+uy*4.2,by-ux*4.2]])+'Z','class':hcls},g);
  }
  /* a focusable round handle, moved by dragging or the arrow keys; onKey gets (dx, dy, big) */
  function handle(svg,knob,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+knob},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, dx=0, dy=0;
      if(k==='ArrowRight') dx=1; else if(k==='ArrowLeft') dx=-1; else if(k==='ArrowUp') dy=1; else if(k==='ArrowDown') dy=-1; else return;
      e.preventDefault(); onKey(dx,dy,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+(+now).toFixed(3));
    h.setAttribute('aria-valuetext',txt);
  }
  function showH(h,on){ h.classList.toggle('nf-hide',!on); }
  /* drag whichever handle is nearest the pointer; pts() gives svg positions (null for a hidden one), move(i,x,y) takes
     the new one; any(p), when given, names the handle a press away from every handle grabs (or -1 for none) */
  function dragger(svg,size,pts,move,focus,any){
    var cur=-1, off=[0,0];
    function near(p){
      var P=pts(), best=-1, bd=26, i, d;
      for(i=0;i<P.length;i++){ if(!P[i]) continue; d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
      return best;
    }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), i=near(p), P, jump=false;
      if(i<0 && any){ i=any(p); jump=true; }
      if(i<0) return;
      P=pts(); cur=i; off=jump||!P[i]?[0,0]:[P[i][0]-p[0],P[i][1]-p[1]];
      e.preventDefault(); capture(svg,e);
      if(focus) focus(i);
      svg.classList.add('is-drag');
      if(jump) move(cur,p[0],p[1]);
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
  function focusOf(list){ return function(i){ try{ list()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} }; }
  function api(get,set){ return NF.api({get:function(){ var o={}, k, c=get(); for(k in c) o[k]=c[k]; return o; }, set:set}); }
  function rel(a,b){ var d=a-b, tol=1e-9*Math.max(1,Math.abs(a),Math.abs(b)); return d>tol?1:d<-tol?-1:0; }
  var WORD={'1':'better','0':'indifferent','-1':'worse'};

  /* an equal unit plot of w by h data units, centred; top is where it starts */
  function boxGeom(W,w,h,top,maxU){
    var mL=36, mR=30, u=Math.min((W-mL-mR)/w,maxU), x0=Math.round(mL+((W-mL-mR)-w*u)/2), G={u:u, x0:x0, y0:top, w:w, h:h};
    G.X=function(v){ return x0+v*u; }; G.Y=function(v){ return top+(h-v)*u; };
    G.X.inv=function(p){ return (p-x0)/u; }; G.Y.inv=function(p){ return h-(p-top)/u; };
    G.x1=x0+w*u; G.y1=top+h*u;
    return G;
  }
  /* grid, tick labels and the outline of a bw by bh box with origins O_a and O_b */
  function boxAxes(g,G,bw,bh,xt,yt,xname,yname){
    var i;
    for(i=0;i<xt.length;i++){ if(xt[i]>0 && xt[i]<G.w) line(g,C(G.X(xt[i])),G.y0,C(G.X(xt[i])),G.y1,'nf-grid'); text(g,G.X(xt[i]),G.y1+16,tl(xt[i]),null,'middle'); }
    for(i=0;i<yt.length;i++){ if(yt[i]>0 && yt[i]<G.h) line(g,G.x0,C(G.Y(yt[i])),G.x1,C(G.Y(yt[i])),'nf-grid'); text(g,G.x0-7,G.Y(yt[i])+4,tl(yt[i]),null,'end'); }
    S('rect',{x:R(G.X(0)),y:R(G.Y(bh)),width:R(G.X(bw)-G.X(0)),height:R(G.Y(0)-G.Y(bh)),'class':'mi9-boxl'},g);
    subt(g,G.X(0)-6,G.Y(0)+29,'O','a','nf-title mi9-it','end');
    subt(g,G.X(bw)+5,G.Y(bh)-6,'O','b','nf-title mi9-it','start');
    text(g,G.x1,G.y1+31,xname,'nf-title mi9-it','end');
    text(g,G.x0-7,G.y0-8,yname,'nf-title mi9-it','end');
  }

  /* ---------- 1. A small open economy with Cobb Douglas technology ---------- */
  /* F_j = k z1^b z2^(1-b), b = 2/3 for good 1 and 1/3 for good 2, both with k = 3 / 2^(2/3); p = (t, 1) */
  var KCD=3/Math.pow(2,2/3);
  function soe(t,D1,D2){
    var t3=t*t*t, lo=D2/(2*t3), hi=2*D2/t3, q1, q2, d1, d2, reg, m;
    if(D1<=lo){ q1=0; q2=KCD*Math.pow(D1,1/3)*Math.pow(D2,2/3); d1=q2/(3*D1); d2=2*q2/(3*D2); reg=2; }
    else if(D1>=hi){ q1=KCD*Math.pow(D1,2/3)*Math.pow(D2,1/3); q2=0; d1=2*t*q1/(3*D1); d2=t*q1/(3*D2); reg=1; }
    else { q1=2*t*D1-D2/(t*t); q2=2*D2/t-t*t*D1; d1=t*t; d2=1/t; reg=0; }
    m=d1*D1+d2*D2;
    return {q1:q1, q2:q2, d1:d1, d2:d2, m:m, x1:m/(2*t), x2:m/2, reg:reg, lo:lo, hi:hi};
  }
  /* the frontier: every input price ratio w = d1/d2 at which full employment is possible gives one efficient point */
  function ppf(D1,D2,n){
    var a=Math.log(D2/(2*D1)), b=Math.log(2*D2/D1), pts=[], i, w, k1, k2, K1;
    for(i=0;i<=n;i++){
      w=Math.exp(a+(b-a)*i/n); k1=2/w; k2=1/(2*w);
      K1=clamp((D1-k2*D2)/(k1-k2),0,D2);
      pts.push([KCD*Math.pow(k1,2/3)*K1, KCD*Math.pow(k2,1/3)*(D2-K1)]);
    }
    return pts;
  }
  NF.register('mi9-soe',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var t=1, D1=3, D2=2, view, W=520, H=330, F={}, el={}, hs=[], xs=null, A, cur={};
    var rp=range(fig,'p1',2,function(v){ t=v; update(); }),
        r1=range(fig,'d1',1,function(v){ D1=v; update(); }),
        r2=range(fig,'d2',1,function(v){ D2=v; update(); });
    if(rp) t=rp.v();
    if(r1) D1=r1.v();
    if(r2) D2=r2.v();
    view=seg(fig,'data-view',function(v){ view=v; draw(); }) || 'trade';
    function draw(){
      var rows, items;
      W=measure(svg); H=W<440?310:330; frame(svg,W,H);
      items=view==='trade'?[['line','mi9-ppf','frontier'],['line','mi9-pl','world price line'],['line','mi9-ic','indifference curve'],['rect','mi9-tri','trade']]:
        view==='prices'?[['line','mi9-c1','d₁'],['line','mi9-c2','d₂'],['line','mi9-dot1','p₁'],['line','mi9-dot2','p₂ = 1'],['rect','mi9-band','one good only']]:
        [['line','mi9-c1','q₁'],['line','mi9-c2','q₂'],['rect','mi9-band','one good only']];
      el.key=S('g',null,svg);
      rows=key(el.key,items,46,13,W-10);
      F={top:13+rows*16+14, bot:H-40, x0:46, x1:W-16};
      el.bg=S('g',null,svg);
      el.band=S('g',null,svg);
      el.gc=clip(svg,F.x0,F.top-2,F.x1-F.x0,F.bot-F.top+2);
      el.fg=S('g',null,svg);
      hs=[];
      if(view==='prices') hs=[handle(svg,'mi9-kp','World price p1, arrow keys move it',function(dx,dy,big){ if(rp) rp.set(t+(dx||dy)*(big?0.1:0.01)); })];
      if(view==='outputs') hs=[handle(svg,'mi9-kp','Endowment D1, arrow keys move it',function(dx,dy,big){ if(r1) r1.set(D1+(dx||dy)*(big?0.5:0.1)); })];
      update();
    }
    function update(){
      var st=soe(t,D1,D2);
      clear(el.bg); clear(el.band); clear(el.gc); clear(el.fg);
      if(view==='trade') paintTrade(st); else if(view==='prices') paintPrices(st); else paintOutputs(st);
      readout(st);
      if(A) A.changed();
    }
    function paintTrade(st){
      var f1=KCD*Math.pow(D1,2/3)*Math.pow(D2,1/3), f2=KCD*Math.pow(D1,1/3)*Math.pow(D2,2/3),
          M=niceUp(1.12*Math.max(f1,f2)), tk=ticks(0,M,W<440?4:6), ys, pts=[], i, x, c, lo, ex, im, qx, qy, xx, xy;
      xs=scale(0,M,F.x0,F.x1); ys=scale(0,M,F.bot,F.top);
      axes(el.bg,xs,ys,tk.t,tk.t,dec(tk.s),dec(tk.s));
      text(el.bg,F.x1,F.bot+32,'good 1','nf-title','end');
      text(el.bg,F.x0-7,F.top-8,'good 2','nf-title','end');
      path(el.gc,ppf(D1,D2,160).map(function(p){ return [xs(p[0]),ys(p[1])]; }),'mi9-ppf');
      line(el.gc,xs(0),ys(st.m),xs(st.m/t),ys(0),'mi9-pl');
      c=st.x1*st.x2; lo=c/(1.3*M);
      for(i=0;i<=160;i++){ x=lo*Math.pow(1.3*M/lo,i/160); pts.push([xs(x),ys(c/x)]); }
      path(el.gc,pts,'mi9-ic');
      qx=xs(st.q1); qy=ys(st.q2); xx=xs(st.x1); xy=ys(st.x2);
      S('path',{d:poly([[qx,qy],[xx,qy],[xx,xy]])+'Z','class':'mi9-tri'},el.gc);
      ex=st.q1-st.x1; im=st.x2-st.q2;
      if(Math.abs(qx-xx)>46) lab(el.fg,(qx+xx)/2,qy+(im>0?15:-7),(ex>0?'export ':'import ')+fmt(Math.abs(ex),2),'mi9-tl','middle');
      if(Math.abs(qy-xy)>22) lab(el.fg,xx+(ex>0?-6:6),(qy+xy)/2+4,(im>0?'import ':'export ')+fmt(Math.abs(im),2),'mi9-tl',ex>0?'end':'start');
      dot(el.fg,qx,qy,4.5,'mi9-dk');
      dot(el.fg,xx,xy,4.5,'mi9-dr');
      lab(el.fg,qx+8,qy+(im>0?-6:14),'q','mi9-it mi9-tk');
      lab(el.fg,xx+8,xy-7,'x','mi9-it mi9-tr');
    }
    function paintPrices(st){
      var n=160, i, p, s, A1=[], A2=[], lo=1e9, hi=0, ys, tL=Math.cbrt(D2/(2*D1)), tH=Math.cbrt(2*D2/D1),
          cand=[0.1,0.15,0.2,0.25,0.3,0.4,0.5,0.6,0.8,1,1.25,1.5,2,2.5,3,4,5,6,8,10], yt=[], xt=[0.6,0.8,1,1.2,1.4,1.6], v, k, a, b;
      xs=logScale(0.6,1.6,F.x0,F.x1);
      for(i=0;i<=n;i++){ p=0.6*Math.pow(1.6/0.6,i/n); s=soe(p,D1,D2); A1.push(p,s.d1); A2.push(p,s.d2); lo=Math.min(lo,s.d1,s.d2,p,1); hi=Math.max(hi,s.d1,s.d2,p,1); }
      ys=logScale(lo/1.1,hi*1.1,F.bot,F.top);
      for(i=0;i<cand.length;i++) if(cand[i]>=lo/1.1 && cand[i]<=hi*1.1) yt.push(cand[i]);
      for(k=1;yt.length>(W<440?5:7);k++) yt=yt.filter(function(_,j){ return j%2===0 || yt[j]===1; });
      a=xs(Math.max(0.6,Math.min(tL,1.6))); b=xs(Math.min(1.6,Math.max(tH,0.6)));
      if(a>F.x0+0.5) S('rect',{x:R(F.x0),y:R(F.top),width:R(a-F.x0),height:R(F.bot-F.top),'class':'mi9-band'},el.band);
      if(b<F.x1-0.5) S('rect',{x:R(b),y:R(F.top),width:R(F.x1-b),height:R(F.bot-F.top),'class':'mi9-band'},el.band);
      for(i=0;i<yt.length;i++){ v=yt[i]; line(el.bg,F.x0,C(ys(v)),F.x1,C(ys(v)),'nf-grid'); text(el.bg,F.x0-7,ys(v)+4,tl(v),null,'end'); }
      for(i=0;i<xt.length;i++){ v=xt[i]; line(el.bg,C(xs(v)),F.top,C(xs(v)),F.bot,'nf-grid'); text(el.bg,xs(v),F.bot+17,tl(v),null,'middle'); }
      line(el.bg,F.x0,C(F.bot),F.x1,C(F.bot),'nf-ax'); line(el.bg,C(F.x0),F.top,C(F.x0),F.bot,'nf-ax');
      text(el.bg,F.x1,F.bot+32,'p₁ (log scale), p₂ = 1','nf-title','end');
      text(el.bg,F.x0-7,F.top-8,'price (log scale)','nf-title','start');
      function pp(arr){ var q=[], j; for(j=0;j<arr.length;j+=2) q.push([xs(arr[j]),ys(arr[j+1])]); return q; }
      line(el.gc,F.x0,ys(1),F.x1,ys(1),'mi9-dot2');
      line(el.gc,xs(0.6),ys(0.6),xs(1.6),ys(1.6),'mi9-dot1');
      path(el.gc,pp(A1),'mi9-c1'); path(el.gc,pp(A2),'mi9-c2');
      line(el.fg,xs(t),F.top,xs(t),F.bot,'nf-guide');
      dot(el.fg,xs(t),ys(t),3.5,'mi9-dk');
      dot(el.fg,xs(t),ys(st.d1),4.5,'mi9-d1'); dot(el.fg,xs(t),ys(st.d2),4.5,'mi9-d2');
      if(tL>0.66) lab(el.fg,(F.x0+a)/2,F.top+14,'only 2','mi9-tm','middle');
      if(tH<1.52) lab(el.fg,(b+F.x1)/2,F.top+14,'only 1','mi9-tm','middle');
      place(hs[0],xs(t),F.bot,t,'p1 = '+fmt(t,2));
    }
    function paintOutputs(st){
      var n=240, i, d, s, A1=[[0,0]], A2=[[0,0]], mx=0, ys, yk, a, b, top;
      xs=scale(0,6,F.x0,F.x1);
      for(i=1;i<=n;i++){ d=6*i/n; s=soe(t,d,D2); A1.push([d,s.q1]); A2.push([d,s.q2]); mx=Math.max(mx,s.q1,s.q2); }
      yk=ticks(0,niceUp(mx*1.08),5); top=yk.t[yk.t.length-1]; ys=scale(0,top,F.bot,F.top);
      a=xs(Math.min(6,st.lo)); b=xs(Math.min(6,st.hi));
      S('rect',{x:R(F.x0),y:R(F.top),width:R(a-F.x0),height:R(F.bot-F.top),'class':'mi9-band'},el.band);
      if(b<F.x1-0.5) S('rect',{x:R(b),y:R(F.top),width:R(F.x1-b),height:R(F.bot-F.top),'class':'mi9-band'},el.band);
      axes(el.bg,xs,ys,[0,1,2,3,4,5,6],yk.t,0,dec(yk.s));
      text(el.bg,F.x1,F.bot+32,'D₁ (D₂ = '+fmt(D2,1)+', p₁ = '+fmt(t,2)+')','nf-title','end');
      text(el.bg,F.x0-7,F.top-8,'output','nf-title','start');
      if(a-F.x0>58) lab(el.fg,(F.x0+a)/2,F.top+14,'only good 2','mi9-tm','middle');
      if(F.x1-b>58) lab(el.fg,(b+F.x1)/2,F.top+14,'only good 1','mi9-tm','middle');
      path(el.gc,A1.map(function(p){ return [xs(p[0]),ys(p[1])]; }),'mi9-c1');
      path(el.gc,A2.map(function(p){ return [xs(p[0]),ys(p[1])]; }),'mi9-c2');
      line(el.fg,xs(D1),F.top,xs(D1),F.bot,'nf-guide');
      dot(el.fg,xs(D1),ys(st.q1),4.5,'mi9-d1'); dot(el.fg,xs(D1),ys(st.q2),4.5,'mi9-d2');
      place(hs[0],xs(D1),F.bot,D1,'D1 = '+fmt(D1,1));
    }
    function readout(st){
      var s, ex=st.q1-st.x1, tL=Math.cbrt(D2/(2*D1)), tH=Math.cbrt(2*D2/D1);
      cur={view:view, p1:t, D1:D1, D2:D2, d1:st.d1, d2:st.d2, q1:st.q1, q2:st.q2, x1:st.x1, x2:st.x2, m:st.m, both:st.reg===0};
      if(!out) return;
      s='p = ('+fmt(t,2)+', 1)   d = ('+fmt(st.d1,2)+', '+fmt(st.d2,2)+')   '+(st.reg===0?'both goods produced':'only good '+st.reg+' produced')+
        '\nq = ('+fmt(st.q1,2)+', '+fmt(st.q2,2)+')   x = ('+fmt(st.x1,2)+', '+fmt(st.x2,2)+')   m = d·D = '+fmt(st.m,2)+'\n';
      if(view==='trade') s+=(Math.abs(ex)<0.005?'no trade: x = q':ex>0?'exports '+fmt(ex,2)+' of good 1, imports '+fmt(ex*t,2)+' of good 2':
        'imports '+fmt(-ex,2)+' of good 1, exports '+fmt(-ex*t,2)+' of good 2')+'; p·(x '+MINUS+' q) = 0';
      else if(view==='prices') s+=(st.reg===0?'inside the cone: d₁ = p₁², d₂ = p₁⁻¹, log slopes 2 and '+MINUS+'1':
        'outside the cone: d₁ and d₂ move one for one with p₁')+'; cone '+fmt(tL,2)+' < p₁ < '+fmt(tH,2);
      else s+=(st.reg===0?'∂q₁/∂D₁ = 2p₁ = '+fmt(2*t,2)+', ∂q₂/∂D₁ = '+MINUS+'p₁² = '+fmt(-t*t,2)+'; q̂₁ = '+fmt(2*t*D1/st.q1,2)+' D̂₁':
        'one good only: the Rybczynski lines do not apply')+'; cone '+fmt(st.lo,2)+' < D₁ < '+fmt(st.hi,2);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return hs.length&&xs?[[view==='prices'?xs(t):xs(D1),F.bot]]:[]; },
      function(i,x){ if(!xs) return; if(view==='prices'){ if(rp) rp.set(xs.inv(clamp(x,F.x0,F.x1))); } else if(view==='outputs'){ if(r1) r1.set(xs.inv(clamp(x,F.x0,F.x1))); } },
      focusOf(function(){ return hs; }),function(p){ return hs.length && p[1]>F.top-6 && p[1]<F.bot+24 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('view' in st) NF.press(fig,'data-view',String(st.view));
      if('p1' in st && rp) rp.set(+st.p1);
      if('D1' in st && r1) r1.set(+st.D1);
      if('D2' in st && r2) r2.set(+st.D2);
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- the box economy: u^a = ln x1 + 3 ln x2, u^b = ln x1 + ln x2, total (8, 6) ---------- */
  var BX=8, BY=6;
  function uA(x1,x2){ return x1*x2*x2*x2; }          /* an increasing transformation of ln x1 + 3 ln x2 */
  function uB(x1,x2){ return (BX-x1)*(BY-x2); }       /* b's utility, written in a's coordinates */
  function cc(x1){ return 9*x1/(x1+4); }
  /* the Walrasian equilibrium for a's endowment w, with p2 = 1 */
  function walras(w1,w2){ var p=(12-w2)/(16+w1), m=p*w1+w2; return {p:p, m:m, x1:m/(4*p), x2:0.75*m}; }
  function icA(G,c){
    var pts=[], lo=Math.max(c/Math.pow(BY+0.6,3),1e-4), i, x;
    for(i=0;i<=150;i++){ x=lo*Math.pow(BX/lo,i/150); pts.push([G.X(x),G.Y(Math.pow(c/x,1/3))]); }
    return pts;
  }
  function icB(G,c){
    var pts=[], lo=Math.max(c/(BY+0.6),1e-4), i, s;
    for(i=0;i<=150;i++){ s=BX*Math.pow(lo/BX,i/150); pts.push([G.X(BX-s),G.Y(BY-c/s)]); }
    return pts;
  }
  function ccPts(G){ var pts=[], i, x; for(i=0;i<=120;i++){ x=BX*i/120; pts.push([G.X(x),G.Y(cc(x))]); } return pts; }
  /* the line p x1 + x2 = m across the box */
  function budget(g,G,p,m,cls){ return line(g,G.X(-1),G.Y(m+p),G.X(BX+1),G.Y(m-p*(BX+1)),cls); }
  function boxStart(svg,W,items){
    var g=S('g',null,svg), rows=key(g,items,12,13,W-8), G=boxGeom(W,BX,BY,13+rows*16+22,52);
    return G;
  }

  /* ---------- 2. Contract curve, equilibrium, and supporting F with transfers ---------- */
  NF.register('mi9-box',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, w=[4,2], T=5, W=520, H=360, G, el={}, hs=[], A, cur={};
    mode=seg(fig,'data-mode',function(v){ mode=v; draw(); }) || 'market';
    function putW(a,b){ w=[clamp(Math.round(a*10)/10,0.2,7.8),clamp(Math.round(b*10)/10,0.2,5.8)]; }
    function putT(v){ T=clamp(Math.round(v*20)/20,0.4,7.6); }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      G=boxStart(svg,W,mode==='market'?[['line','mi9-ua','a'],['line','mi9-ub','b'],['line','mi9-cc','contract curve'],['line','mi9-pl mi9-dash','budget line']]:
        [['line','mi9-ua','a'],['line','mi9-ub','b'],['line','mi9-cc','contract curve'],['line','mi9-pl','price line through F'],['line','mi9-pl mi9-dash','through ω']]);
      H=Math.round(G.y1+40); svg.setAttribute('viewBox','0 0 '+W+' '+H);
      el.bg=S('g',null,svg);
      boxAxes(el.bg,G,BX,BY,[0,2,4,6,8],[0,2,4,6],'x₁ᵃ','x₂ᵃ');
      el.gc=clip(svg,G.x0,G.y0,G.x1-G.x0,G.y1-G.y0);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'mi9-kw','Endowment of a, arrow keys move it',function(dx,dy,big){ putW(w[0]+dx*(big?0.5:0.1),w[1]+dy*(big?0.5:0.1)); update(); }),
          handle(svg,'mi9-kf','Target F on the contract curve, arrow keys move it along the curve',function(dx,dy,big){ putT(T+(dx||dy)*(big?0.5:0.05)); update(); })];
      update();
    }
    function update(){
      clear(el.gc); clear(el.fg);
      if(mode==='market') paintMarket(); else paintSupport();
      if(A) A.changed();
    }
    function paintMarket(){
      var e=walras(w[0],w[1]), fy=cc(T), s, ea=rel(uA(e.x1,e.x2),uA(T,fy)), eb=rel(uB(e.x1,e.x2),uB(T,fy));
      path(el.gc,icA(G,uA(w[0],w[1])),'mi9-ua mi9-thin');
      path(el.gc,icB(G,uB(w[0],w[1])),'mi9-ub mi9-thin');
      path(el.gc,ccPts(G),'mi9-cc');
      budget(el.gc,G,e.p,e.m,'mi9-pl mi9-dash');
      path(el.gc,icA(G,uA(e.x1,e.x2)),'mi9-ua');
      path(el.gc,icB(G,uB(e.x1,e.x2)),'mi9-ub');
      dot(el.fg,G.X(T),G.Y(fy),4,'mi9-dr');
      lab(el.fg,G.X(T)-8,G.Y(fy)-7,'F','mi9-it mi9-tr','end');
      dot(el.fg,G.X(e.x1),G.Y(e.x2),5,'mi9-dk');
      lab(el.fg,G.X(e.x1)-9,G.Y(e.x2)-8,'E','mi9-it mi9-tk','end');
      lab(el.fg,G.X(w[0])+9,G.Y(w[1])+15,'ω','mi9-it mi9-tk','start');
      place(hs[0],G.X(w[0]),G.Y(w[1]),w[0],'omega a = ('+fmt(w[0],1)+', '+fmt(w[1],1)+')');
      showH(hs[0],true); showH(hs[1],false);
      cur={mode:mode, w1:w[0], w2:w[1], p1:e.p, xa1:e.x1, xa2:e.x2, onCurve:Math.abs(cc(e.x1)-e.x2)<1e-9};
      if(!out) return;
      s='ωᵃ = ('+fmt(w[0],1)+', '+fmt(w[1],1)+'), ωᵇ = ('+fmt(BX-w[0],1)+', '+fmt(BY-w[1],1)+')   p₁/p₂ = '+fmt(e.p,3)+
        '\nE: xᵃ = ('+fmt(e.x1,2)+', '+fmt(e.x2,2)+'), xᵇ = ('+fmt(BX-e.x1,2)+', '+fmt(BY-e.x2,2)+'), on the contract curve'+
        '\nE against F = ('+fmt(T,2)+', '+fmt(fy,2)+'): '+(ea===0&&eb===0?'E = F':'a finds E '+WORD[ea]+', b finds E '+WORD[eb]+
        (ea*eb<0?': neither ranks the other':''));
      out.textContent=s;
    }
    function paintSupport(){
      var fx=T, fy=cc(T), p=fy/(3*fx), mS=p*fx+fy, mW=p*w[0]+w[1], Ta=mS-mW, s1=Ta/p, n2=w[1]+Ta, n1=w[0]+s1,
          ok2=n2>=-1e-9 && n2<=BY+1e-9, ok1=n1>=-1e-9 && n1<=BX+1e-9, ox=G.X(w[0]), oy=G.Y(w[1]), ex, ey, s, tx;
      path(el.gc,icA(G,uA(fx,fy)),'mi9-ua');
      path(el.gc,icB(G,uB(fx,fy)),'mi9-ub');
      path(el.gc,ccPts(G),'mi9-cc');
      budget(el.gc,G,p,mS,'mi9-pl');
      budget(el.gc,G,p,mW,'mi9-pl mi9-dash');
      if(Math.abs(Ta)>0.02){
        ey=G.Y(clamp(n2,-0.3,BY+0.3));
        arrow(el.fg,ox,oy,ox,ey,ok2?'mi9-ok':'mi9-bad',ok2?'mi9-okh':'mi9-badh');
        ex=G.X(clamp(n1,-0.3,BX+0.3));
        arrow(el.fg,ox,oy,ex,oy,ok1?'mi9-ok':'mi9-bad',ok1?'mi9-okh':'mi9-badh');
        tx=ox<(G.x0+G.x1)/2?ox+7:ox-7;
        if(Math.abs(ey-oy)>26) lab(el.fg,tx,(oy+ey)/2+4,'good 2: t = '+fmt(Ta,2),ok2?'mi9-tg':'mi9-tr',tx>ox?'start':'end');
        if(Math.abs(ex-ox)>40) lab(el.fg,(ox+ex)/2,oy+(n2>w[1]?16:-8),'good 1: s = '+fmt(s1,2),ok1?'mi9-tg':'mi9-tr','middle');
      }
      lab(el.fg,ox+9,oy+(Ta>0?15:-9),'ω','mi9-it mi9-tk','start');
      lab(el.fg,G.X(fx)+9,G.Y(fy)-8,'F','mi9-it mi9-tr','start');
      place(hs[0],ox,oy,w[0],'omega a = ('+fmt(w[0],1)+', '+fmt(w[1],1)+')');
      place(hs[1],G.X(fx),G.Y(fy),fx,'F = ('+fmt(fx,2)+', '+fmt(fy,2)+')');
      showH(hs[0],true); showH(hs[1],true);
      cur={mode:mode, w1:w[0], w2:w[1], F1:fx, F2:fy, p1:p, Ta:Ta, t:Ta, s:s1, ok2:ok2, ok1:ok1};
      if(!out) return;
      s='F = ('+fmt(fx,2)+', '+fmt(fy,2)+'): p₁/p₂ = MRS = '+fmt(p,3)+'   T_a = m_a* '+MINUS+' m_a = '+fmt(mS,2)+' '+MINUS+' '+fmt(mW,2)+' = '+fmt(Ta,2)+' = '+MINUS+'T_b';
      out.textContent=s;
      if(Math.abs(Ta)<=0.02){ out.appendChild(document.createTextNode('\nω is already on the price line through F: no transfer needed')); return; }
      out.appendChild(document.createTextNode('\ngood 2 only: t = '+fmt(Ta,2)+', so ω₂ᵃ = '+fmt(n2,2)+' and ω₂ᵇ = '+fmt(BY-n2,2)+': '));
      (ok2?good:warn)(out,ok2?'feasible':'infeasible');
      out.appendChild(document.createTextNode('\ngood 1 only: s = '+fmt(s1,2)+', so ω₁ᵃ = '+fmt(n1,2)+' and ω₁ᵇ = '+fmt(BX-n1,2)+': '));
      (ok1?good:warn)(out,ok1?'feasible':'infeasible');
    }
    function nearCurve(px,py){
      var best=T, bd=1e18, i, x, d;
      for(i=0;i<=300;i++){ x=0.4+7.2*i/300; d=Math.pow(G.X(x)-px,2)+Math.pow(G.Y(cc(x))-py,2); if(d<bd){ bd=d; best=x; } }
      return best;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[G.X(w[0]),G.Y(w[1])],mode==='support'?[G.X(T),G.Y(cc(T))]:null]; },
      function(i,x,y){ if(i===0) putW(G.X.inv(x),G.Y.inv(y)); else putT(nearCurve(x,y)); update(); },focusOf(function(){ return hs; }));
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('w1' in st || 'w2' in st) putW('w1' in st?+st.w1:w[0],'w2' in st?+st.w2:w[1]);
      if('F1' in st) putT(+st.F1);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 3. First Welfare Theorem: separation, and failure without LNS ---------- */
  NF.register('mi9-fwt',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, w=[4,2], X=[5,2.5], W=520, H=360, G, el={}, hs=[], A, cur={};
    mode=seg(fig,'data-mode',function(v){ mode=v; X=v==='lns'?[5,2.5]:[3,2]; draw(); }) || 'lns';
    if(mode!=='lns') X=[3,2];
    function putW(a,b){ w=[clamp(Math.round(a*10)/10,0.2,7.8),clamp(Math.round(b*10)/10,0.2,5.8)]; }
    function putX(a,b){ X=[clamp(Math.round(a*10)/10,0.1,7.9),clamp(Math.round(b*10)/10,0.1,5.9)]; }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      G=boxStart(svg,W,mode==='lns'?[['rect','mi9-fa','better for a than E'],['rect','mi9-fb','better for b than E'],['line','mi9-pl','price line']]:
        [['rect','mi9-fs','uᵃ = 4, a satiated'],['rect','mi9-fb','better for b than E'],['line','mi9-pl mi9-dash','price line']]);
      H=Math.round(G.y1+40); svg.setAttribute('viewBox','0 0 '+W+' '+H);
      el.bg=S('g',null,svg);
      boxAxes(el.bg,G,BX,BY,[0,2,4,6,8],[0,2,4,6],'x₁ᵃ','x₂ᵃ');
      el.gc=clip(svg,G.x0,G.y0,G.x1-G.x0,G.y1-G.y0);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'mi9-kw','Endowment of a, arrow keys move it',function(dx,dy,big){ putW(w[0]+dx*(big?0.5:0.1),w[1]+dy*(big?0.5:0.1)); update(); }),
          handle(svg,'mi9-kx','Test allocation for a, arrow keys move it',function(dx,dy,big){ putX(X[0]+dx*(big?0.5:0.1),X[1]+dy*(big?0.5:0.1)); update(); })];
      update();
    }
    function update(){
      clear(el.gc); clear(el.fg);
      if(mode==='lns') paintLns(); else paintNo();
      place(hs[1],G.X(X[0]),G.Y(X[1]),X[0],'test allocation ('+fmt(X[0],1)+', '+fmt(X[1],1)+')');
      if(A) A.changed();
    }
    function region(pts,top){
      var a=pts[0], b=pts[pts.length-1];
      return poly(pts.concat([[b[0],top],[a[0],top]]))+'Z';
    }
    function paintLns(){
      var e=walras(w[0],w[1]), cA=uA(e.x1,e.x2), cB=uB(e.x1,e.x2), PA=icA(G,cA), PB=icB(G,cB), ra, rb, v, s;
      S('path',{d:region(PA,G.Y(BY+1)),'class':'mi9-fa'},el.gc);
      S('path',{d:region(PB,G.Y(-1)),'class':'mi9-fb'},el.gc);
      path(el.gc,PA,'mi9-ua'); path(el.gc,PB,'mi9-ub');
      budget(el.gc,G,e.p,e.m,'mi9-pl');
      if(uA(7.85,5.75)>cA) lab(el.fg,G.X(7.85),G.Y(5.75)+4,'better for a','mi9-ta','end');
      if(uB(0.15,0.3)>cB) lab(el.fg,G.X(0.15),G.Y(0.3)+4,'better for b','mi9-tb','start');
      dot(el.fg,G.X(e.x1),G.Y(e.x2),5,'mi9-dk');
      lab(el.fg,G.X(e.x1)+8,G.Y(e.x2)-9,'E','mi9-it mi9-tk','start');
      lab(el.fg,G.X(w[0])+9,G.Y(w[1])+15,'ω','mi9-it mi9-tk','start');
      lab(el.fg,G.X(X[0])+9,G.Y(X[1])-9,'xᵃ','mi9-it mi9-tk','start');
      place(hs[0],G.X(w[0]),G.Y(w[1]),w[0],'omega a = ('+fmt(w[0],1)+', '+fmt(w[1],1)+')');
      showH(hs[0],true);
      ra=rel(uA(X[0],X[1]),cA); rb=rel(uB(X[0],X[1]),cB); v=e.p*X[0]+X[1]-e.m;
      cur={mode:mode, w1:w[0], w2:w[1], x1:X[0], x2:X[1], p1:e.p, a:ra, b:rb, gap:v, improve:ra>=0&&rb>=0&&(ra+rb)>0};
      if(!out) return;
      s='E = ('+fmt(e.x1,2)+', '+fmt(e.x2,2)+') at p₁/p₂ = '+fmt(e.p,3)+', m_a = p·ωᵃ = '+fmt(e.m,2)+
        '\nxᵃ = ('+fmt(X[0],1)+', '+fmt(X[1],1)+'): '+WORD[ra]+' for a, '+WORD[rb]+' for b than E'+
        '\np·xᵃ '+MINUS+' m_a = '+fmt(v,2)+(Math.abs(v)<1e-9?': on the price line, so neither gains':v>0?' > 0: xᵇ costs less than m_b, so b is worse off':' < 0: xᵃ costs less than m_a, so a is worse off');
      out.textContent=s;
    }
    function paintNo(){
      var cB=16, PB=icB(G,cB), ua=Math.min(X[0]+X[1],4), ub=uB(X[0],X[1]), ra=rel(ua,4), rb=rel(ub,cB), imp=ra>=0&&rb>=0&&(ra+rb)>0, s;
      S('path',{d:poly([[G.X(4),G.Y(0)],[G.X(BX),G.Y(0)],[G.X(BX),G.Y(BY)],[G.X(0),G.Y(BY)],[G.X(0),G.Y(4)]])+'Z','class':'mi9-fs'},el.gc);
      S('path',{d:region(PB,G.Y(-1)),'class':'mi9-fb'},el.gc);
      line(el.gc,G.X(0),G.Y(4),G.X(4),G.Y(0),'mi9-ua');
      path(el.gc,PB,'mi9-ub');
      budget(el.gc,G,1,6,'mi9-pl mi9-dash');
      lab(el.fg,G.X(7.85),G.Y(5.5)+4,'uᵃ = min{x₁ᵃ + x₂ᵃ, 4}','mi9-ta','end');
      if(imp) arrow(el.fg,G.X(4),G.Y(2),G.X(X[0]),G.Y(X[1]),'mi9-ok','mi9-okh');
      dot(el.fg,G.X(4),G.Y(2),5,'mi9-dr');
      lab(el.fg,G.X(4)+8,G.Y(2)-9,'E = ω','mi9-it mi9-tr','start');
      lab(el.fg,G.X(X[0])-9,G.Y(X[1])+15,'xᵃ','mi9-it '+(imp?'mi9-tg':'mi9-tk'),'end');
      showH(hs[0],false);
      cur={mode:mode, x1:X[0], x2:X[1], ua:ua, ub:ub, a:ra, b:rb, improve:imp};
      if(!out) return;
      s='E = ω: at p = (1, 1) b demands (4, 4) = ωᵇ and a is satiated at ωᵃ = (4, 2)'+
        '\nxᵃ = ('+fmt(X[0],1)+', '+fmt(X[1],1)+'): uᵃ = '+fmt(ua,2)+' (E: 4), uᵇ = '+fmt(ub,2)+' (E: 16)\n';
      out.textContent=s;
      if(imp) warn(out,'Pareto improvement on the equilibrium: the theorem fails without LNS');
      else out.appendChild(document.createTextNode('not a Pareto improvement; try xᵃ = (3, 2)'));
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [mode==='lns'?[G.X(w[0]),G.Y(w[1])]:null,[G.X(X[0]),G.Y(X[1])]]; },
      function(i,x,y){ if(i===0) putW(G.X.inv(x),G.Y.inv(y)); else putX(G.X.inv(x),G.Y.inv(y)); update(); },focusOf(function(){ return hs; }));
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('w1' in st || 'w2' in st) putW('w1' in st?+st.w1:w[0],'w2' in st?+st.w2:w[1]);
      if('x1' in st || 'x2' in st) putX('x1' in st?+st.x1:X[0],'x2' in st?+st.x2:X[1]);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 4. Second Welfare Theorem failures: nonconvex preferences, increasing returns ---------- */
  NF.register('mi9-swt',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, t=4, pr=1, wp=4/3, L=2/3, W=520, H=360, G, F, el={}, hs=[], xs, ys, A, cur={};
    var rpr=range(fig,'pr',2,function(v){ pr=v; update(); }), rwp=range(fig,'wp',2,function(v){ wp=Math.abs(v-4/3)<0.006?4/3:v; update(); });
    if(rpr) pr=rpr.v();
    if(rwp){ wp=rwp.v(); if(Math.abs(wp-4/3)<0.006) wp=4/3; }
    mode=seg(fig,'data-mode',function(v){ mode=v; locks(); draw(); }) || 'ncv';
    function locks(){ lock(rpr,mode!=='ncv'); lock(rwp,mode!=='irs'); }
    locks();
    function putT(v){ t=clamp(Math.round(v*20)/20,1.5,5.5); }
    function putL(v){ L=clamp(v,0.04,0.98); if(Math.abs(L-2/3)<0.012) L=2/3; }
    /* is the diagonal point (t, t) Pareto efficient in the 6 by 6 box? Look for a box point on a's indifference circle
       that b strictly prefers */
    function efficient(tt){
      var r=tt*Math.SQRT2, c=(6-tt)*(6-tt), i, th, x, y, best=0;
      for(i=0;i<=2400;i++){ th=Math.PI/2*i/2400; x=r*Math.cos(th); y=r*Math.sin(th); if(x<=6 && y<=6) best=Math.max(best,(6-x)*(6-y)); }
      return best<=c*(1+1e-7);
    }
    function draw(){
      var rows, items;
      W=measure(svg); frame(svg,W,300);
      items=mode==='ncv'?[['line','mi9-ua','a: (x₁ᵃ)² + (x₂ᵃ)²'],['line','mi9-ub','b: x₁ᵇx₂ᵇ'],['line','mi9-pl mi9-dash','budget line'],['rect','mi9-both','better for both']]:
        [['line','mi9-ppf','x = L²'],['line','mi9-ic','ln x + ln(1 '+MINUS+' L) through the target'],['line','mi9-pl mi9-dash','isoprofit'],['line','mi9-hb','household budget']];
      el.key=S('g',null,svg);
      rows=key(el.key,items,12,13,W-8);
      el.bg=S('g',null,svg);
      if(mode==='ncv'){
        G=boxGeom(W,9,9,13+rows*16+22,34);
        H=Math.round(G.y1+40);
        boxAxes(el.bg,G,6,6,[0,2,4,6,8],[0,2,4,6,8],'x₁ᵃ','x₂ᵃ');
        el.gc=clip(svg,G.x0,G.y0,G.x1-G.x0,G.y1-G.y0);
        el.gb=clip(svg,G.X(0),G.Y(6),G.X(6)-G.X(0),G.Y(0)-G.Y(6));
      } else {
        el.gb=null;
        H=W<440?300:320;
        F={top:13+rows*16+18, bot:H-40, x0:46, x1:W-16};
        xs=scale(0,1,F.x0,F.x1); ys=scale(0,1.15,F.bot,F.top);
        axes(el.bg,xs,ys,[0,0.2,0.4,0.6,0.8,1],[0,0.2,0.4,0.6,0.8,1],1,1);
        text(el.bg,F.x1,F.bot+32,'labour L','nf-title','end');
        text(el.bg,F.x0-7,F.top-8,'output x','nf-title','start');
        el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      }
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'mi9-kx',mode==='ncv'?'Target on the diagonal, arrow keys move it':'Production plan on the technology, arrow keys move it',
        function(dx,dy,big){ if(mode==='ncv') putT(t+(dx||dy)*(big?0.5:0.05)); else putL(L+(dx||dy)*(big?0.1:0.01)); update(); })];
      update();
    }
    function update(){
      clear(el.gc); clear(el.fg); if(el.gb) clear(el.gb);
      if(mode==='ncv') paintNcv(); else paintIrs();
      if(A) A.changed();
    }
    function paintNcv(){
      var r=t*Math.SQRT2, cB=(6-t)*(6-t), m=(pr+1)*t, i, th, pts=[], pb=[], s, ok=efficient(t), id, cp, gg, xb, yb, dem=[], cx, k;
      /* where both are better: outside a's circle and below b's hyperbola, inside the box */
      id='mi9c'+(++clipN);
      for(i=0;i<=150;i++){ s=6*Math.pow(Math.max(cB/6.2,1e-4)/6,i/150); pb.push([G.X(6-s),G.Y(6-cB/s)]); }
      cp=S('clipPath',{id:id},S('defs',null,el.gb));
      S('path',{d:poly(pb.concat([[G.X(6),G.Y(-0.5)],[G.X(0),G.Y(-0.5)]]))+'Z'},cp);
      gg=S('g',{'clip-path':'url(#'+id+')'},el.gb);
      S('path',{d:'M'+R(G.X(0))+','+R(G.Y(0))+'H'+R(G.X(6))+'V'+R(G.Y(6))+'H'+R(G.X(0))+'Z'+
        'M'+R(G.X(r))+','+R(G.Y(0))+'A'+R(r*G.u)+','+R(r*G.u)+' 0 0 0 '+R(G.X(0))+','+R(G.Y(r))+'L'+R(G.X(0))+','+R(G.Y(0))+'Z','class':'mi9-both','fill-rule':'evenodd'},gg);
      for(i=0;i<=120;i++){ th=Math.PI/2*i/120; pts.push([G.X(r*Math.cos(th)),G.Y(r*Math.sin(th))]); }
      path(el.gb,pts,'mi9-ua');
      path(el.gb,pb,'mi9-ub');
      line(el.gc,G.X(0),G.Y(m),G.X(m/pr),G.Y(0),'mi9-pl mi9-dash');
      /* a's demand on that line: a corner, since u^a is convex along it */
      if(pr<1+1e-9) dem.push([m/pr,0]);
      if(pr>1-1e-9) dem.push([0,m]);
      for(k=0;k<dem.length;k++){
        cx=[Math.min(dem[k][0],8.75),Math.min(dem[k][1],8.75)];
        square(el.fg,G.X(cx[0]),G.Y(cx[1]),'mi9-sq');
      }
      lab(el.fg,G.X(Math.min(dem[0][0],8.75))-(dem[0][0]>0?6:-9),G.Y(Math.min(dem[0][1],8.75))-(dem[0][0]>0?10:-4),"a's demand",'mi9-tr',dem[0][0]>0?'end':'start');
      xb=(6-t)*(pr+1)/(2*pr); yb=(6-t)*(pr+1)/2;
      dot(el.fg,G.X(6-xb),G.Y(6-yb),4.5,'mi9-db');
      lab(el.fg,G.X(t)+10,G.Y(t)-8,'target ('+tl(t)+', '+tl(t)+')','mi9-tk','start');
      place(hs[0],G.X(t),G.Y(t),t,'target ('+fmt(t,2)+', '+fmt(t,2)+')');
      cur={mode:mode, t:t, pr:pr, efficient:ok, demand:dem.map(function(d){ return d[0]; })};
      if(!out) return;
      s='target ('+fmt(t,2)+', '+fmt(t,2)+'): ';
      out.textContent=s;
      if(ok) out.appendChild(document.createTextNode('efficient, no box point is better for both'));
      else warn(out,'not efficient: the red set is better for both');
      out.appendChild(document.createTextNode('\np₁/p₂ = '+fmt(pr,2)+', m_a = '+fmt(m,2)+': a demands '+
        dem.map(function(d){ return '('+fmt(d[0],2)+', '+fmt(d[1],2)+')'; }).join(' or ')+', uᵃ = '+fmt(m*m/Math.min(pr*pr,1),1)+' > '+fmt(2*t*t,1)+
        '\nb demands ('+fmt(xb,2)+', '+fmt(yb,2)+') in its own coordinates: a never chooses the target'));
    }
    function paintIrs(){
      var pts=[], i, l, pL=L*L-wp*L, p1=1-wp, firm, pis, H0, Ls, xd, s, hl;
      for(i=0;i<=100;i++){ l=i/100; pts.push([xs(l),ys(l*l)]); }
      S('path',{d:poly(pts.concat([[xs(1),ys(0)]]))+'Z','class':'mi9-prod'},el.gc);
      path(el.gc,pts,'mi9-ppf');
      pts=[]; for(i=0;i<=120;i++){ l=0.99*i/120; pts.push([xs(l),ys((4/27)/(1-l))]); }
      path(el.gc,pts,'mi9-ic');
      line(el.gc,xs(-0.1),ys(pL-wp*0.1),xs(1.1),ys(pL+wp*1.1),'mi9-pl mi9-dash');
      /* the firm compares the two ends: profit L^2 - (w/p)L is convex in L */
      firm=p1>1e-9?1:p1<-1e-9?0:-1; pis=Math.max(0,p1);
      H0=Math.min(1,(wp+pis)/(2*wp)); Ls=1-H0; xd=pis+wp*Ls;
      line(el.gc,xs(-0.1),ys(pis-wp*0.1),xs(1.1),ys(pis+wp*1.1),'mi9-hb');
      square(el.fg,xs(0),ys(0),firm===1?'mi9-sqo':'mi9-sq');
      square(el.fg,xs(1),ys(1),firm===0?'mi9-sqo':'mi9-sq');
      lab(el.fg,xs(0)+9,ys(0)-8,'π = 0','mi9-tr','start');
      lab(el.fg,xs(1)-9,ys(1)+4,'π = '+fmt(p1,2),'mi9-tr','end');
      dot(el.fg,xs(2/3),ys(4/9),4,'mi9-dk');
      hl=Math.abs(L-2/3)>0.05;
      if(hl) lab(el.fg,xs(2/3)-8,ys(4/9)+16,'efficient','mi9-tk','end');
      dot(el.fg,xs(Ls),ys(xd),4.5,'mi9-db');
      lab(el.fg,xs(Ls)-8,ys(xd)-9,'household','mi9-tb','end');
      place(hs[0],xs(L),ys(L*L),L,'plan L = '+fmt(L,2));
      cur={mode:mode, wp:wp, L:L, profit:pL, p0:0, p1:p1, firm:firm, supply:Ls};
      if(!out) return;
      s='w/p = '+fmt(wp,2)+': π at L = '+fmt(L,2)+' is '+fmt(pL,3)+'; π(0) = 0, π(1) = '+fmt(p1,3)+': the firm picks '+
        (firm<0?'L = 0 or L = 1':'L = '+firm)+
        '\nhousehold (π = '+fmt(pis,2)+'): supplies L = '+fmt(Ls,2)+', wants x = '+fmt(xd,2)+'; the firm hires '+(firm<0?'0 or 1':firm)+'\n';
      out.textContent=s;
      warn(out,'labour market does not clear: no equilibrium');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [mode==='ncv'?[G.X(t),G.Y(t)]:[xs(L),ys(L*L)]]; },
      function(i,x,y){ if(mode==='ncv') putT((G.X.inv(x)+G.Y.inv(y))/2); else putL(xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('pr' in st && rpr) rpr.set(+st.pr);
      if('wp' in st && rwp) rwp.set(+st.wp);
      if('t' in st) putT(+st.t);
      if('L' in st) putL(+st.L);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- the three equilibrium economy: u1 = x1 - x2^-8 / 8, u2 = -x1^-8 / 8 + x2, endowments (2, r) and (r, 2) ---------- */
  var R0=Math.pow(2,8/9)-Math.pow(2,1/9), R79=7/9;
  function z3(q,r){ return r/q-Math.pow(q,-8/9)+Math.pow(q,-1/9)-r; }               /* q = p1/p2 */
  function dz3(q,r){ return -r/(q*q)+(8/9)*Math.pow(q,-17/9)-(1/9)*Math.pow(q,-10/9); }
  function cross3(q,r){ return (r-(8/9)*Math.pow(q,1/9)+(1/9)*Math.pow(q,8/9))/q; }  /* dz1/dp2 at p2 = 1 */
  function roots3(r){
    var out=[1], n=1600, lo=Math.log(0.02), hi=Math.log(50), i, j, a, b, fa, fb, m, fm;
    for(i=0;i<n;i++){
      a=lo+(hi-lo)*i/n; b=lo+(hi-lo)*(i+1)/n;
      if(Math.abs(a)<0.002 || Math.abs(b)<0.002 || (a<0 && b>0)) continue;
      fa=z3(Math.exp(a),r); fb=z3(Math.exp(b),r);
      if(fa*fb<0){ for(j=0;j<60;j++){ m=(a+b)/2; fm=z3(Math.exp(m),r); if(fa*fm<=0){ b=m; fb=fm; } else { a=m; fa=fm; } } out.push(Math.exp((a+b)/2)); }
    }
    return out.sort(function(x,y){ return x-y; });
  }
  function rSnap(v){ return Math.abs(v-R0)<1e-4?R0:v; }
  var QT=[0.25,0.5,1,2,4], QL=['¼','½','1','2','4'];
  function sgnTxt(v){ return Math.abs(v)<1e-12?'0':v>0?'+':MINUS; }

  /* ---------- 5. Existence: the box economy on the simplex, the Brouwer map, and three equilibria ---------- */
  NF.register('mi9-exist',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, p1=0.2, q=1.4, r=R0, W=520, H=420, P1, P2, F, el={}, hs=[], xs, ys1, ys2, A, cur={};
    var rr=range(fig,'r',4,function(v){ r=rSnap(v); update(); });
    if(rr) r=rSnap(rr.v());
    mode=seg(fig,'data-mode',function(v){ mode=v; lock(rr,mode!=='three'); draw(); }) || 'box';
    lock(rr,mode!=='three');
    function zb(p){ return [5/(2*p)-7.5,(7.5*p-2.5)/(1-p)]; }
    function gb(p){ var z=zb(p), a1=Math.max(0,z[0]), a2=Math.max(0,z[1]); return (p+a1)/(1+a1+a2); }
    function putP(v){ p1=clamp(Math.round(v*1000)/1000,0.03,0.97); if(Math.abs(p1-1/3)<0.004) p1=1/3; }
    function putQ(v){ q=clamp(v,0.26,3.9); q=Math.round(q*100)/100; if(Math.abs(q-0.5)<0.006) q=0.5; }
    function draw(){
      W=measure(svg);
      el={};
      if(mode==='box'){
        H=W<440?400:420; frame(svg,W,H);
        F={x0:46, x1:W-16};
        P1={top:22, bot:Math.round(H*0.48)}; P2={top:P1.bot+44, bot:H-40};
        xs=scale(0,1,F.x0,F.x1); ys1=scale(-10,40,P1.bot,P1.top); ys2=scale(0,1,P2.bot,P2.top);
        el.bg=S('g',null,svg);
        axes(el.bg,scale(0,1,F.x0,F.x1),scale(-10,40,P1.bot,P1.top),[0,0.2,0.4,0.6,0.8,1],[-10,0,10,20,30,40],1,0);
        axes(el.bg,scale(0,1,F.x0,F.x1),scale(0,1,P2.bot,P2.top),[0,0.2,0.4,0.6,0.8,1],[0,0.5,1],1,1);
        line(el.bg,F.x0,C(ys1(0)),F.x1,C(ys1(0)),'mi9-zero');
        text(el.bg,F.x0-7,P1.top-9,'excess demand z','nf-title','start');
        text(el.bg,F.x0-7,P2.top-9,'Brouwer map g₁(p)','nf-title','start');
        text(el.bg,F.x1,P2.bot+32,'p₁ on Δ, p₂ = 1 '+MINUS+' p₁','nf-title','end');
        el.g1=clip(svg,F.x0,P1.top,F.x1-F.x0,P1.bot-P1.top);
        el.g2=clip(svg,F.x0,P2.top,F.x1-F.x0,P2.bot-P2.top);
        paintBoxStatic();
      } else {
        H=W<440?300:320; frame(svg,W,H);
        F={top:30, bot:H-42, x0:52, x1:W-16};
        xs=logScale(0.25,4,F.x0,F.x1);
        el.bg=S('g',null,svg);
        el.g1=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      }
      el.fg=S('g',null,svg);
      hs=[handle(svg,'mi9-kp',mode==='box'?'Price p1 on the simplex, arrow keys move it':'Price ratio p1 over p2, arrow keys move it',function(dx,dy,big){
        if(mode==='box') putP(p1+(dx||dy)*(big?0.05:0.01)); else putQ(q*Math.exp((dx||dy)*(big?0.2:0.03))); update(); })];
      update();
    }
    function paintBoxStatic(){
      var a=[], b=[], g=[], i, p, z;
      for(i=0;i<=300;i++){ p=0.01+0.98*i/300; z=zb(p); a.push([xs(p),ys1(Math.min(z[0],80))]); b.push([xs(p),ys1(Math.min(z[1],80))]); g.push([xs(p),ys2(gb(p))]); }
      path(el.g1,a,'mi9-c1'); path(el.g1,b,'mi9-c2');
      lab(el.g1,xs(0.085),ys1(28),'z₁','mi9-t1','start');
      lab(el.g1,xs(0.86),ys1(30),'z₂','mi9-t2','end');
      line(el.g2,xs(0),ys2(0),xs(1),ys2(1),'mi9-diag');
      path(el.g2,g,'mi9-g');
      dot(el.g1,xs(1/3),ys1(0),4.5,'mi9-dr');
      dot(el.g2,xs(1/3),ys2(1/3),4.5,'mi9-dr');
      lab(el.g1,xs(1/3)+8,ys1(0)-8,'p₁* = ⅓','mi9-tr','start');
      lab(el.g2,xs(1/3)+8,ys2(1/3)-6,'fixed point p*','mi9-tr','start');
      lab(el.g2,xs(0.97),ys2(0.97)+16,'45°','nf-lab','end');
    }
    function update(){
      clear(el.fg);
      if(mode==='box') paintBox(); else paintThree();
      if(A) A.changed();
    }
    function paintBox(){
      var z=zb(p1), g1=gb(p1), a1=Math.max(0,z[0]), a2=Math.max(0,z[1]), s, at3=Math.abs(p1-1/3)<1e-9;
      line(el.fg,xs(p1),P1.top,xs(p1),P1.bot,'nf-guide');
      line(el.fg,xs(p1),P2.top,xs(p1),P2.bot,'nf-guide');
      if(z[0]<40) dot(el.fg,xs(p1),ys1(z[0]),4,'mi9-d1');
      if(z[1]<40) dot(el.fg,xs(p1),ys1(z[1]),4,'mi9-d2');
      if(Math.abs(ys2(g1)-ys2(p1))>10) arrow(el.fg,xs(p1),ys2(p1),xs(p1),ys2(g1),'mi9-garr','mi9-garrh');
      dot(el.fg,xs(p1),ys2(p1),3,'mi9-dk');
      dot(el.fg,xs(p1),ys2(g1),4.5,'mi9-dg');
      place(hs[0],xs(p1),P2.bot,p1,'p1 = '+fmt(p1,3));
      cur={mode:mode, p1:p1, z1:z[0], z2:z[1], walras:p1*z[0]+(1-p1)*z[1], g1:g1};
      if(!out) return;
      s='p = ('+fmt(p1,3)+', '+fmt(1-p1,3)+'): z = ('+fmt(z[0],2)+', '+fmt(z[1],2)+'), p·z = '+fmt(p1*z[0]+(1-p1)*z[1],3)+
        '\na = ('+fmt(a1,2)+', '+fmt(a2,2)+'), g(p) = ('+fmt(g1,3)+', '+fmt(1-g1,3)+'): '+
        (at3?'z = 0 and g(p) = p, the equilibrium p* = (⅓, ⅔)':a1>0?'good 1 over demanded, so g raises p₁':'good 2 over demanded, so g lowers p₁');
      out.textContent=s;
    }
    function paintThree(){
      var ext=0, i, x, v, pts=[], A0, yt=[], st, rs, zq=z3(q,r), sl=dz3(q,r), s, j, k, yl, inW;
      clear(el.bg); clear(el.g1);
      for(i=0;i<=400;i++){ x=Math.exp(Math.log(0.3)+(Math.log(3.4)-Math.log(0.3))*i/400); v=z3(x,r); if(dz3(x,r)*dz3(x*1.004,r)<=0) ext=Math.max(ext,Math.abs(v)); }
      A0=Math.max(1.5e-3,niceUp(1.6*ext));
      ys1=scale(-A0,A0,F.bot,F.top);
      st=niceStep(2*A0*1e3,4);
      for(v=-Math.floor(A0*1e3/st)*st;v<=A0*1e3+1e-9;v+=st) yt.push(Math.round(v/st)*st);
      for(i=0;i<yt.length;i++){ line(el.bg,F.x0,C(ys1(yt[i]/1e3)),F.x1,C(ys1(yt[i]/1e3)),Math.abs(yt[i])<1e-9?'mi9-zero':'nf-grid'); text(el.bg,F.x0-7,ys1(yt[i]/1e3)+4,fmt(yt[i],st<1?1:0),null,'end'); }
      for(i=0;i<QT.length;i++){ line(el.bg,C(xs(QT[i])),F.top,C(xs(QT[i])),F.bot,'nf-grid'); text(el.bg,xs(QT[i]),F.bot+17,QL[i],null,'middle'); }
      line(el.bg,F.x0,C(F.bot),F.x1,C(F.bot),'nf-ax'); line(el.bg,C(F.x0),F.top,C(F.x0),F.bot,'nf-ax');
      text(el.bg,F.x0-7,F.top-10,'z₁ × 10³','nf-title','start');
      text(el.bg,F.x1,F.bot+32,'p₁/p₂ (log scale)','nf-title','end');
      for(i=0;i<=400;i++){ x=0.25*Math.pow(16,i/400); pts.push([xs(x),clamp(ys1(z3(x,r)),F.top-400,F.bot+400)]); }
      path(el.g1,pts,'mi9-c1');
      rs=roots3(r);
      for(j=0;j<rs.length;j++){
        inW=rs[j]>=0.25 && rs[j]<=4;
        if(!inW) continue;
        dot(el.fg,xs(rs[j]),ys1(0),4.5,'mi9-dr');
        k=dz3(rs[j],r);
        lab(el.fg,xs(rs[j])+9,ys1(0)-8,sgnTxt(k),'mi9-tr mi9-sgn','start');
      }
      line(el.fg,xs(q),F.top,xs(q),F.bot,'nf-guide');
      yl=ys1(zq);
      if(yl>F.top-2 && yl<F.bot+2) dot(el.fg,xs(q),yl,4,'mi9-d1');
      place(hs[0],xs(q),F.bot,q,'p1 over p2 = '+fmt(q,2));
      cur={mode:mode, r:r, q:q, z1:zq, slope:sl, n:rs.length, roots:rs.slice()};
      if(!out) return;
      s='r = '+fmt(r,4)+': '+(rs.length===1?'one equilibrium':rs.length+' equilibria')+' at p₁/p₂ = '+rs.map(function(v){ return fmt(v,3); }).join(', ')+
        ' (slopes '+rs.map(function(v){ return sgnTxt(dz3(v,r)); }).join(', ')+')'+
        '\nat p₁/p₂ = '+fmt(q,2)+': z₁ = '+fmt(zq*1e3,2)+' × 10⁻³, sloping '+(sl>0?'up':'down')+
        '\n'+(Math.abs(r-R79)<1e-4?'r = 7/9: z₁ is flat at 1, the economy is not regular':r<R79?'r < 7/9: z₁ slopes up at 1, so the boundary forces two more crossings':
          'r > 7/9: z₁ slopes down at 1, one crossing');
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [mode==='box'?[xs(p1),P2.bot]:[xs(q),F.bot]]; },
      function(i,x){ x=clamp(x,F.x0,F.x1); if(mode==='box') putP(xs.inv(x)); else putQ(xs.inv(x)); update(); },
      focusOf(function(){ return hs; }),function(p){ return p[0]>=F.x0-4 && p[0]<=F.x1+4 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('r' in st && rr) rr.set(+st.r);
      if('p1' in st) putP(+st.p1);
      if('q' in st) putQ(+st.q);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 6. Gross substitutes: the uniqueness proof, and where the cross effect turns negative ---------- */
  NF.register('mi9-gs',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, PS=[1,2], pp=[2,1.5], q=0.9, r=R0, W=520, H=320, F, el={}, hs=[], xs, ys, A, cur={};
    var rr=range(fig,'r',4,function(v){ r=rSnap(v); update(); });
    if(rr) r=rSnap(rr.v());
    mode=seg(fig,'data-mode',function(v){ mode=v; lock(rr,mode!=='cross'); draw(); }) || 'proof';
    lock(rr,mode!=='cross');
    function putP(a,b){ pp=[clamp(Math.round(a*20)/20,0.15,2.5),clamp(Math.round(b*20)/20,0.15,5)]; }
    function putQ(v){ q=clamp(Math.round(v*100)/100,0.26,3.9); }
    /* box economy: z1 = 2.5 p2/p1 - 5, z2 = 5 p1/p2 - 2.5; equilibrium ray through (1, 2) */
    function zbox(p){ return [2.5*p[1]/p[0]-5,5*p[0]/p[1]-2.5]; }
    function draw(){
      var rows;
      W=measure(svg); H=W<440?300:320; frame(svg,W,H);
      el.key=S('g',null,svg);
      rows=mode==='proof'?key(el.key,[['line','mi9-ray','equilibria tp*'],['rect','mi9-rect','prices ≤ p̃ = m p*'],['line','mi9-arr','path from p̃ to p′']],46,13,W-10):
        key(el.key,[['line','mi9-c1','three equilibrium economy'],['rect','mi9-neg','∂z₁/∂p₂ < 0: GS fails']],52,13,W-10);
      F={top:13+rows*16+16, bot:H-42, x0:mode==='proof'?46:52, x1:W-16};
      el.bg=S('g',null,svg);
      if(mode==='proof'){
        xs=scale(0,2.6,F.x0,F.x1); ys=scale(0,5.2,F.bot,F.top);
        axes(el.bg,xs,ys,[0,0.5,1,1.5,2,2.5],[0,1,2,3,4,5],1,0);
        text(el.bg,F.x1,F.bot+32,'p₁','nf-title mi9-it','end');
        text(el.bg,F.x0-7,F.top-8,'p₂','nf-title mi9-it','end');
      } else xs=logScale(0.25,4,F.x0,F.x1);
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.fg=S('g',null,svg);
      hs=[handle(svg,mode==='proof'?'mi9-kf':'mi9-kp',mode==='proof'?'Price vector p prime, arrow keys move it':'Price ratio p1 over p2, arrow keys move it',function(dx,dy,big){
        if(mode==='proof') putP(pp[0]+dx*(big?0.25:0.05),pp[1]+dy*(big?0.25:0.05)); else putQ(q*Math.exp((dx||dy)*(big?0.2:0.03))); update(); })];
      update();
    }
    function update(){
      clear(el.gc); clear(el.fg);
      if(mode==='proof') paintProof(); else paintCross();
      if(A) A.changed();
    }
    function paintProof(){
      var r1=pp[0]/PS[0], r2=pp[1]/PS[1], m=Math.max(r1,r2), k=r1>=r2?1:2, pt=[m*PS[0],m*PS[1]], prop=Math.abs(r1-r2)<1e-9, z=zbox(pp), zk=z[k-1], s;
      S('rect',{x:R(xs(0)),y:R(ys(pt[1])),width:R(xs(pt[0])-xs(0)),height:R(ys(0)-ys(pt[1])),'class':'mi9-rect'},el.gc);
      line(el.gc,xs(0),ys(0),xs(2.6),ys(5.2),'mi9-ray');
      if(!prop) arrow(el.fg,xs(pt[0]),ys(pt[1]),xs(pp[0]),ys(pp[1]),'mi9-arr','mi9-arrh');
      dot(el.fg,xs(PS[0]),ys(PS[1]),4.5,'mi9-dgr');
      lab(el.fg,xs(PS[0])+9,ys(PS[1])+14,'p*','mi9-it mi9-tg','start');
      dot(el.fg,xs(pt[0]),ys(pt[1]),4.5,'mi9-dk');
      lab(el.fg,xs(pt[0])+(pt[0]<0.6?9:-9),ys(pt[1])-8,'p̃ = m p*','mi9-it mi9-tk',pt[0]<0.6?'start':'end');
      lab(el.fg,xs(pp[0])+(pp[0]>2.1?-11:11),ys(pp[1])+(k===1?14:-9),'p′','mi9-it mi9-tr',pp[0]>2.1?'end':'start');
      place(hs[0],xs(pp[0]),ys(pp[1]),pp[0],'p prime = ('+fmt(pp[0],2)+', '+fmt(pp[1],2)+')');
      cur={mode:mode, p1:pp[0], p2:pp[1], m:m, k:k, zk:zk, proportional:prop};
      if(!out) return;
      s='p′ = ('+fmt(pp[0],2)+', '+fmt(pp[1],2)+'): p′₁/p*₁ = '+fmt(r1,2)+', p′₂/p*₂ = '+fmt(r2,2)+', so m = '+fmt(m,2)+(prop?'':' and k = '+k);
      if(prop){ out.textContent=s+'\np′ is on the ray: p′ = m p*, the same equilibrium'; return; }
      s+='\np̃ = m p* = ('+fmt(pt[0],2)+', '+fmt(pt[1],2)+') clears every market; lower p'+(k===1?'₂':'₁')+' to '+fmt(pp[2-k],2)+', holding p'+(k===1?'₁':'₂')+
        '\nbox economy: z'+(k===1?'₁':'₂')+'(p′) = '+fmt(zk,2)+' < 0, so p′ is not an equilibrium';
      out.textContent=s;
    }
    function paintCross(){
      var lo=1e9, i, x, v, pts=[], neg=[], A0, yt=[], st, cq=cross3(q,r), s, rs, j, yl, mn=r-R79;
      for(i=0;i<=400;i++){ x=0.25*Math.pow(16,i/400); v=cross3(x,r); lo=Math.min(lo,v); }
      A0=Math.max(3e-3,niceUp(1.4*Math.max(0,-lo)));
      ys=scale(-A0,2*A0,F.bot,F.top);
      clear(el.bg);
      st=niceStep(3*A0*1e3,5);
      for(v=-Math.floor(A0*1e3/st)*st;v<=2*A0*1e3+1e-9;v+=st) yt.push(Math.round(v/st)*st);
      for(i=0;i<yt.length;i++){ line(el.bg,F.x0,C(ys(yt[i]/1e3)),F.x1,C(ys(yt[i]/1e3)),Math.abs(yt[i])<1e-9?'mi9-zero':'nf-grid'); text(el.bg,F.x0-7,ys(yt[i]/1e3)+4,fmt(yt[i],st<1?1:0),null,'end'); }
      for(i=0;i<QT.length;i++){ line(el.bg,C(xs(QT[i])),F.top,C(xs(QT[i])),F.bot,'nf-grid'); text(el.bg,xs(QT[i]),F.bot+17,QL[i],null,'middle'); }
      line(el.bg,F.x0,C(F.bot),F.x1,C(F.bot),'nf-ax'); line(el.bg,C(F.x0),F.top,C(F.x0),F.bot,'nf-ax');
      text(el.bg,F.x0-7,F.top-10,'∂z₁/∂p₂ × 10³ (p₂ = 1)','nf-title','start');
      text(el.bg,F.x1,F.bot+32,'p₁/p₂ (log scale)','nf-title','end');
      for(i=0;i<=400;i++){ x=0.25*Math.pow(16,i/400); v=cross3(x,r); pts.push([xs(x),clamp(ys(v),F.top-400,F.bot+400)]); neg.push([xs(x),ys(Math.min(0,v))]); }
      neg.push([xs(4),ys(0)],[xs(0.25),ys(0)]);
      S('path',{d:poly(neg)+'Z','class':'mi9-neg'},el.gc);
      path(el.gc,pts,'mi9-c1');
      rs=roots3(r);
      for(j=0;j<rs.length;j++) if(rs[j]>=0.25 && rs[j]<=4) dot(el.fg,xs(rs[j]),ys(0),3.5,'mi9-dr');
      if(mn<0) lab(el.fg,xs(1),ys(mn)+(ys(0)-ys(mn)>40?-12:18),'GS fails','mi9-tr','middle');
      line(el.fg,xs(q),F.top,xs(q),F.bot,'nf-guide');
      yl=ys(cq);
      if(yl>F.top-2 && yl<F.bot+2) dot(el.fg,xs(q),yl,4,'mi9-d1');
      place(hs[0],xs(q),F.bot,q,'p1 over p2 = '+fmt(q,2));
      cur={mode:mode, r:r, q:q, cross:cq, min:mn, gs:mn>0};
      if(!out) return;
      s='r = '+fmt(r,4)+', at p₁/p₂ = '+fmt(q,2)+': ∂z₁/∂p₂ = '+fmt(cq*1e3,2)+' × 10⁻³'+(cq<0?' < 0, gross substitutes fail here':' > 0')+
        '\nsmallest at p₁/p₂ = 1, where it is r '+MINUS+' 7/9 = '+fmt(mn,4)+(mn<0?': GS fails, '+rs.length+' equilibria':': GS holds everywhere, one equilibrium')+
        '\nbox economy at p₁ = '+fmt(q,2)+': ∂z₁/∂p₂ = 5/(2p₁) = '+fmt(5/(2*q),2)+' > 0';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [mode==='proof'?[xs(pp[0]),ys(pp[1])]:[xs(q),F.bot]]; },
      function(i,x,y){ if(mode==='proof') putP(xs.inv(x),ys.inv(y)); else putQ(xs.inv(clamp(x,F.x0,F.x1))); update(); },
      focusOf(function(){ return hs; }),function(p){ return mode==='cross' && p[0]>=F.x0-4 && p[0]<=F.x1+4 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('r' in st && rr) rr.set(+st.r);
      if('p1' in st || 'p2' in st) putP('p1' in st?+st.p1:pp[0],'p2' in st?+st.p2:pp[1]);
      if('q' in st) putQ(+st.q);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });
})();
