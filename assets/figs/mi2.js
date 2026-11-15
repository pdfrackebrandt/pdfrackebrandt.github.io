/* Core Micro L2 figures: the budget set, monotonicity and convex upper contour sets, quasiconcavity against
   concavity, continuity against lexicographic preferences, Debreu's diagonal construction, the MRS along a curve,
   homothetic against quasilinear maps with their expansion paths, CES, and the consumer's optimum.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from /assets/figs/mi2.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg, press=NF.press,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;
  var SUP='⁰¹²³⁴⁵⁶⁷⁸⁹';

  /* ---------- shared ---------- */
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function add(out,s){ out.appendChild(document.createTextNode(s)); }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function snap(v,s){ return Math.round(v/s)*s; }
  function tolOf(){ var m=1, i; for(i=0;i<arguments.length;i++) if(isFinite(arguments[i])) m=Math.max(m,Math.abs(arguments[i])); return 1e-9*m; }
  function sup(n){ return String(n).split('').map(function(c){ return SUP.charAt(+c); }).join(''); }
  function show(e,on){ e.setAttribute('visibility',on?'visible':'hidden'); }
  /* subscripts in svg text: name with a lowered small index */
  function vlab(g,name,sub,cls){
    var t=S('text',{'class':'mi2-vlab '+(cls||''),'text-anchor':'middle'},g), s;
    t.appendChild(document.createTextNode(name));
    if(sub){ s=S('tspan',{dy:'3','class':'nf-sub'},t); s.textContent=sub; }
    return t;
  }
  /* arrow from (x0,y0) to (x1,y1) with a filled head */
  function vec(g,cls){ return {l:line(g,0,0,0,0,'mi2-arr '+cls), h:S('path',{'class':'mi2-arrh '+cls},g)}; }
  function setVec(v,x0,y0,x1,y1,cls){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, bx, by;
    if(cls){ v.l.setAttribute('class','mi2-arr '+cls); v.h.setAttribute('class','mi2-arrh '+cls); }
    if(len<10){ setLine(v.l,x0,y0,x0,y0); show(v.l,false); v.h.setAttribute('d',''); return; }
    show(v.l,true);
    ux=dx/len; uy=dy/len; bx=x1-ux*8; by=y1-uy*8;
    setLine(v.l,x0,y0,bx+ux*1.5,by+uy*1.5);
    v.h.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
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
      e.preventDefault(); onKey(dx,dy);
    });
    return h;
  }
  function place(h,x,y,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever point is nearest the pointer; pts() gives svg positions, move(i,x,y) the new one */
  function dragger(svg,size,pts,move,focus){
    var cur=-1, off=[0,0];
    function nearest(p){
      var P=pts(), best=-1, bd=26, i, d;
      for(i=0;i<P.length;i++){ if(!P[i]) continue; d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
      return best;
    }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), i=nearest(p), P;
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
    /* a touch that starts on a point drags it instead of scrolling the page */
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(nearest(local(svg,e.touches[0],s[0],s[1]))>=0) e.preventDefault();
    },{passive:false});
  }
  function focusOf(list){ return function(i){ try{ list()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} }; }

  /* ---------- plots ---------- */
  function steps(X,st){ var t=[], i; for(i=0;i*st<=X+1e-9;i++) t.push(+(i*st).toFixed(10)); return t; }
  function nice(v){ var e=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)), f=v/e; return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e; }
  function axisName(g,n){ return typeof n==='string'?text(g,0,0,n,'nf-title','middle'):vlab(g,n[0],n[1],'nf-title'); }
  /* a plot: data ranges xr, yr onto the pixel box b = {x, y, w, h}, grid lines at xt and yt with their labels, and
     axis names nx (right of the x axis) and ny (above the y axis), each a string or a [name, subscript] pair */
  function axes(svg,b,xr,yr,xt,yt,nx,ny,o){
    o=o||{};
    var g=S('g',null,svg), i, v, t, xl=o.xlab||tl, yl=o.ylab||tl;
    function sx(v){ return b.x+(v-xr[0])/(xr[1]-xr[0])*b.w; }
    function sy(v){ return b.y+b.h-(v-yr[0])/(yr[1]-yr[0])*b.h; }
    sx.inv=function(p){ return xr[0]+(p-b.x)/b.w*(xr[1]-xr[0]); };
    sy.inv=function(p){ return yr[0]+(b.y+b.h-p)/b.h*(yr[1]-yr[0]); };
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(sx(v)),b.y,C(sx(v)),b.y+b.h,'nf-grid'); text(g,sx(v),b.y+b.h+15,xl(v),null,'middle'); }
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,b.x,C(sy(v)),b.x+b.w,C(sy(v)),'nf-grid'); if(v!==yr[0] || o.y0) text(g,b.x-6,sy(v)+4,yl(v),null,'end'); }
    line(g,b.x,C(b.y+b.h),b.x+b.w,C(b.y+b.h),'nf-ax');
    line(g,C(b.x),b.y,C(b.x),b.y+b.h,'nf-ax');
    if(nx && o.below){ t=axisName(g,nx); moveTo(t,b.x+b.w/2,b.y+b.h+30); }
    else if(nx){ t=axisName(g,nx); t.setAttribute('text-anchor','start'); moveTo(t,b.x+b.w+6,b.y+b.h+4); }
    if(ny){ t=axisName(g,ny); moveTo(t,b.x,b.y-11); }
    return {sx:sx, sy:sy, b:b, X:xr[1], Y:yr[1], w:b.w, h:b.h, x0:b.x, top:b.y, y0:b.y+b.h, u:b.w/(xr[1]-xr[0]), g:g, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  /* the goods plane [0,X] x [0,Y], equal units on both axes, centred, a grid line every st units */
  function goods(svg,W,X,Y,st,top){
    top=top||26;
    var side=Math.min(W-58,330), u=side/Math.max(X,Y), w=X*u, h=Y*u, x0=Math.round((W-w)/2)+8, F;
    F=axes(svg,{x:x0,y:top,w:w,h:h},[0,X],[0,Y],steps(X,st),steps(Y,st),['x','1'],['x','2']);
    F.H=top+h+30;
    svg.setAttribute('viewBox','0 0 '+W+' '+F.H);
    return F;
  }
  /* two plot boxes: side by side when there is room, else one above the other; [b1, b2, height] */
  function twoBoxes(W,ratio){
    var s, x0, b1, b2;
    if(W>=560){
      s=Math.min(270,Math.floor((W-126)/2));
      b1={x:36,y:30,w:s,h:s}; b2={x:36+s+60,y:30,w:W-(36+s+60)-30,h:s};
      return [b1,b2,30+s+38];
    }
    s=Math.min(W-58,330); x0=Math.round((W-s)/2)+8;
    b1={x:x0,y:30,w:s,h:s}; b2={x:x0,y:30+s+60,w:s,h:Math.round(s*(ratio||0.62))};
    return [b1,b2,b2.y+b2.h+38];
  }
  /* polylines in goods units as one path in pixels */
  function pathOf(F,lines){
    var d='', i;
    for(i=0;i<lines.length;i++) if(lines[i].length>1) d+=poly(lines[i].map(function(p){ return [F.sx(p[0]),F.sy(p[1])]; }));
    return d;
  }
  function polyPath(F,P){ return P.length>2?poly(P.map(function(q){ return [F.sx(q[0]),F.sy(q[1])]; }))+'Z':''; }
  /* the set {x : ok(x)} inside the plane [0,X] x [0,Y], as one path: rows about 1.6 px apart, joined by trapezoids
     where the rows agree, so slanted edges stay smooth */
  function regionPath(F,ok){
    var X=F.X, Y=F.Y, nr=Math.max(40,Math.round(F.h/1.6)), ns=Math.max(90,Math.round(F.w/2.5)), dy=Y/nr, d='', j, A, B, M, k;
    function edge(a,b,y,va){ for(var q=0;q<24;q++){ var m=(a+b)/2; if(ok(m,y)===va) a=m; else b=m; } return (a+b)/2; }
    function runs(y){
      var res=[], i, x, xp=0, prev=ok(0,y), start=prev?0:null, cur, xe;
      for(i=1;i<=ns;i++){
        x=X*i/ns; cur=ok(x,y);
        if(cur!==prev){ xe=edge(xp,x,y,prev); if(cur) start=xe; else { res.push([start,xe]); start=null; } prev=cur; }
        xp=x;
      }
      if(prev) res.push([start,X]);
      return res;
    }
    function quad(a0,a1,y0,b0,b1,y1){ d+=poly([[F.sx(a0),F.sy(y0)],[F.sx(a1),F.sy(y0)],[F.sx(b1),F.sy(y1)],[F.sx(b0),F.sy(y1)]])+'Z'; }
    A=runs(0);
    for(j=0;j<nr;j++){
      B=runs((j+1)*dy);
      if(A.length===B.length) for(k=0;k<A.length;k++) quad(A[k][0],A[k][1],j*dy,B[k][0],B[k][1],(j+1)*dy);
      else { M=runs((j+0.5)*dy); for(k=0;k<M.length;k++) quad(M[k][0],M[k][1],j*dy,M[k][0],M[k][1],(j+1)*dy); }
      A=B;
    }
    return d;
  }
  function upperPath(F,f,c){ var t=tolOf(c); return regionPath(F,function(x,y){ return f(x,y)>=c-t; }); }
  function lowerPath(F,f,c){ var t=tolOf(c); return regionPath(F,function(x,y){ return f(x,y)<=c+t; }); }
  /* keep the part of a polygon with a x + b y + c >= 0 (Sutherland Hodgman, one edge) */
  function cut(P,a,b,c){
    var out=[], i, p, q, fp, fq, t;
    for(i=0;i<P.length;i++){
      p=P[i]; q=P[(i+1)%P.length]; fp=a*p[0]+b*p[1]+c; fq=a*q[0]+b*q[1]+c;
      if(fp>=0) out.push(p);
      if((fp>=0)!==(fq>=0)){ t=fp/(fp-fq); out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]); }
    }
    return out;
  }
  /* area and centroid of a polygon in pixels */
  function centroid(F,P){
    var a=0, cx=0, cy=0, i, p, q, k;
    for(i=0;i<P.length;i++){
      p=[F.sx(P[i][0]),F.sy(P[i][1])]; q=[F.sx(P[(i+1)%P.length][0]),F.sy(P[(i+1)%P.length][1])];
      k=p[0]*q[1]-q[0]*p[1]; a+=k; cx+=(p[0]+q[0])*k; cy+=(p[1]+q[1])*k;
    }
    if(Math.abs(a)<1e-9) return {area:0, x:0, y:0};
    return {area:Math.abs(a/2), x:cx/(3*a), y:cy/(3*a)};
  }
  /* a short piece of the line through p (goods units) with slope -m, half length r px */
  function tangent(F,e,p,m,r){
    var dx=1, dy=m*F.u/F.u, n, cx=F.sx(p[0]), cy=F.sy(p[1]);
    if(!isFinite(m)){ setLine(e,cx,cy-r,cx,cy+r); return; }
    n=Math.hypot(dx,dy); dx/=n; dy/=n;
    setLine(e,cx-dx*r,cy-dy*r,cx+dx*r,cy+dy*r);
  }

  /* ---------- utility families: u, the level curve u = c as polylines, and the MRS u1/u2 ---------- */
  function logSpace(a,b,n){ var r=[], i; for(i=0;i<=n;i++) r.push(a*Math.pow(b/a,i/n)); return r; }
  function fLinear(a,b){
    return {u:function(x,y){ return a*x+b*y; }, mrs:function(){ return a/b; },
      curve:function(c){ return c<0?[]:[[[c/a,0],[0,c/b]]]; }};
  }
  function fMin(a,b){
    return {u:function(x,y){ return Math.min(a*x,b*y); },
      curve:function(c,X,Y){ return c<0?[]:[[[c/a,2*Y+2],[c/a,c/b],[2*X+2,c/b]]]; }};
  }
  function fBliss(cx,cy){
    return {u:function(x,y){ return -((x-cx)*(x-cx)+(y-cy)*(y-cy)); }, o:[cx,cy],
      curve:function(c){ var r=Math.sqrt(Math.max(0,-c)), p=[], i; if(r<1e-9) return []; for(i=0;i<=360;i++) p.push([cx+r*Math.cos(i*Math.PI/180),cy+r*Math.sin(i*Math.PI/180)]); return [p]; }};
  }
  /* every bundle with lo <= x1 + x2 <= hi is equally good: a thick indifference curve */
  function fThick(lo,hi){
    return {lo:lo, hi:hi, u:function(x,y){ var s=x+y; return s<lo?s:s>hi?s-(hi-lo):lo; },
      curve:function(c){ var s=c<lo?c:c>lo?c+(hi-lo):null; return s===null?[]:[[[s,0],[0,s]]]; }};
  }
  function fSqrt(){
    return {u:function(x,y){ return Math.sqrt(x)+Math.sqrt(y); },
      curve:function(c){ var p=[], i, s; if(c<=0) return []; for(i=0;i<=400;i++){ s=c*i/400; p.push([s*s,(c-s)*(c-s)]); } return [p]; }};
  }
  function fSq(){
    return {u:function(x,y){ return x*x+y*y; }, mrs:function(x,y){ return y>0?x/y:Infinity; },
      curve:function(c){ var r=Math.sqrt(Math.max(0,c)), p=[], i; if(r<1e-9) return []; for(i=0;i<=240;i++) p.push([r*Math.cos(i*Math.PI/480),r*Math.sin(i*Math.PI/480)]); return [p]; }};
  }
  /* x1^a x2^b; for a = b = 1/2 this is the square root of x1 x2 */
  function fCobb(a,b){
    return {u:function(x,y){ return Math.pow(x,a)*Math.pow(y,b); }, mrs:function(x,y){ return x>0?a*y/(b*x):Infinity; },
      curve:function(c,X,Y){
        if(c<=0) return [];
        var xs=logSpace(Math.pow(c/Math.pow(1.4*Y,b),1/a),1.4*X,240);
        return [xs.map(function(x){ return [x,Math.pow(c/Math.pow(x,a),1/b)]; })];
      }};
  }
  /* x1 + k sqrt(x2), quasilinear in good 1 */
  function fQuasi(k){
    function v(y){ return k*Math.sqrt(y); }
    return {u:function(x,y){ return x+v(y); }, mrs:function(x,y){ return 2*Math.sqrt(y)/k; },
      curve:function(c,X,Y){
        if(c<0) return [];
        var top=Math.min(1.4*Y,(c/k)*(c/k)), ys=[], i;
        for(i=0;i<=200;i++) ys.push(top*i*i/40000);
        return [ys.map(function(y){ return [c-v(y),y]; })];
      }};
  }
  /* the clipped pieces of a polyline inside [0,X] x [0,Y] (Liang Barsky on each segment) */
  function clipSeg(a,b,X,Y){
    var t0=0, t1=1, dx=b[0]-a[0], dy=b[1]-a[1], p=[-dx,dx,-dy,dy], q=[a[0],X-a[0],a[1],Y-a[1]], i, r;
    for(i=0;i<4;i++){
      if(p[i]===0){ if(q[i]<0) return null; }
      else { r=q[i]/p[i]; if(p[i]<0){ if(r>t1) return null; if(r>t0) t0=r; } else { if(r<t0) return null; if(r<t1) t1=r; } }
    }
    return [[a[0]+t0*dx,a[1]+t0*dy],[a[0]+t1*dx,a[1]+t1*dy],t0,t1];
  }
  function clipRuns(P,X,Y){
    var runs=[], cur=null, i, c;
    for(i=0;i+1<P.length;i++){
      c=clipSeg(P[i],P[i+1],X,Y);
      if(!c){ if(cur){ runs.push(cur); cur=null; } continue; }
      if(cur && c[2]===0) cur.push(c[1]); else { if(cur) runs.push(cur); cur=[c[0],c[1]]; }
      if(c[3]<1){ runs.push(cur); cur=null; }
    }
    if(cur) runs.push(cur);
    return runs;
  }
  /* the point at arc length s0 + dist along a polyline, where s0 is the arc length at the point nearest x */
  function walk(P,x,dist,closed){
    var cum=[0], i, L, bd=Infinity, s0=0, s, dx, dy, l2, t, q, dd, seg;
    for(i=1;i<P.length;i++) cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
    L=cum[cum.length-1];
    for(i=0;i+1<P.length;i++){
      dx=P[i+1][0]-P[i][0]; dy=P[i+1][1]-P[i][1]; l2=dx*dx+dy*dy;
      t=l2?clamp(((x[0]-P[i][0])*dx+(x[1]-P[i][1])*dy)/l2,0,1):0;
      q=[P[i][0]+t*dx,P[i][1]+t*dy]; dd=Math.hypot(q[0]-x[0],q[1]-x[1]);
      if(dd<bd){ bd=dd; s0=cum[i]+t*Math.sqrt(l2); }
    }
    s=s0+dist;
    s=closed?((s%L)+L)%L:clamp(s,0,L);
    for(i=0;i+2<P.length && cum[i+1]<s;i++);
    seg=cum[i+1]-cum[i]; t=seg>0?(s-cum[i])/seg:0;
    return [P[i][0]+t*(P[i+1][0]-P[i][0]),P[i][1]+t*(P[i+1][1]-P[i][1])];
  }
  /* put z exactly on the level set u = c, along the line from o through z (bisection) */
  function onLevel(f,o,z,c){
    function g(t){ return f.u(o[0]+t*(z[0]-o[0]),o[1]+t*(z[1]-o[1]))-c; }
    var a=0.8, b=1.25, ga=g(a), gb=g(b), m, gm, k;
    if(!(ga*gb<0)) return z;
    for(k=0;k<60;k++){ m=(a+b)/2; gm=g(m); if(gm*ga>0){ a=m; ga=gm; } else b=m; }
    m=(a+b)/2;
    return [o[0]+m*(z[0]-o[0]),o[1]+m*(z[1]-o[1])];
  }

  /* ---------- 1. The budget set ---------- */
  NF.register('mi2-budget',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var REF={p1:2,p2:1,w:8}, X0=[4,2], X=X0.slice(), st={p1:2,p2:1,w:12,k:1}, M=12, W=520, F, el={}, hs=[], api;
    var r1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        r2=range(fig,'p2',2,function(v){ st.p2=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); }),
        rk=range(fig,'k',2,function(v){ st.k=v; update(); });
    if(r1) st.p1=r1.v();
    if(r2) st.p2=r2.v();
    if(rw) st.w=rw.v();
    if(rk) st.k=rk.v();
    function put(x,y){ X=[clamp(snap(x,0.25),0,M),clamp(snap(y,0.25),0,M)]; }
    /* moves the sliders as a person would; each move redraws */
    function setP(o){
      if('p1' in o){ if(r1) r1.set(o.p1); else st.p1=+o.p1; }
      if('p2' in o){ if(r2) r2.set(o.p2); else st.p2=+o.p2; }
      if('w' in o){ if(rw) rw.set(o.w); else st.w=+o.w; }
      if('k' in o){ if(rk) rk.set(o.k); else st.k=+o.k; }
    }
    onClick(fig,'.nfig-reset',function(){ X=X0.slice(); setP({p1:2,p2:1,w:12,k:1}); update(); });
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,2);
      el.both=S('path',{'class':'mi2-set'},F.gc);
      el.gain=S('path',{'class':'mi2-gain'},F.gc);
      el.lost=S('path',{'class':'mi2-lost'},F.gc);
      el.ref=line(F.gc,0,0,0,0,'mi2-ref');
      el.line=line(F.gc,0,0,0,0,'mi2-bline');
      el.tg=text(svg,0,0,'gained','mi2-tgain nf-halo','middle');
      el.tlo=text(svg,0,0,'lost','mi2-tlost nf-halo','middle');
      el.lab=vlab(svg,'x','','mi2-cp nf-halo');
      hs=[handle(svg,'mi2-kp','Bundle x, arrow keys move it',function(dx,dy){ put(X[0]+dx*0.25,X[1]+dy*0.25); update(); })];
      update();
    }
    /* the set B(kp, kw) is drawn; it equals B(p, w) for every k > 0 */
    function state(){
      var P1=st.k*st.p1, P2=st.k*st.p2, Wk=st.k*st.w, i1=Wk/P1, i2=Wk/P2, cost=st.p1*X[0]+st.p2*X[1],
          a1=REF.w/REF.p1, a2=REF.w/REF.p2, e=1e-9, rel;
      if(Math.abs(i1-a1)<e && Math.abs(i2-a2)<e) rel='same';
      else if(i1>=a1-e && i2>=a2-e) rel='bigger';
      else if(i1<=a1+e && i2<=a2+e) rel='smaller';
      else rel='neither';
      return {p1:st.p1, p2:st.p2, w:st.w, k:st.k, kp1:P1, kp2:P2, kw:Wk, i1:i1, i2:i2, ratio:st.p1/st.p2, x1:X[0], x2:X[1], cost:cost,
        aff:cost<=st.w+tolOf(st.w), rel:rel};
    }
    function label(e,P){
      var Q=cut(cut(P,-1,0,M),0,-1,M), c=centroid(F,Q);
      if(c.area<500){ show(e,false); return; }
      show(e,true); moveTo(e,c.x,c.y+4);
    }
    function update(){
      if(!F) return;
      var s=state(), N=[[0,0],[s.i1,0],[0,s.i2]], O=[[0,0],[REF.w/REF.p1,0],[0,REF.w/REF.p2]], px=F.sx(X[0]), py=F.sy(X[1]), G, Lo, t;
      el.both.setAttribute('d',polyPath(F,cut(N,-REF.p1,-REF.p2,REF.w)));
      G=cut(N,REF.p1,REF.p2,-REF.w); Lo=cut(O,s.p1,s.p2,-s.w);
      el.gain.setAttribute('d',polyPath(F,G));
      el.lost.setAttribute('d',polyPath(F,Lo));
      label(el.tg,G); label(el.tlo,Lo);
      setLine(el.line,F.sx(s.i1),F.sy(0),F.sx(0),F.sy(s.i2));
      setLine(el.ref,F.sx(REF.w/REF.p1),F.sy(0),F.sx(0),F.sy(REF.w/REF.p2));
      place(hs[0],px,py,'x = ('+tl(X[0])+', '+tl(X[1])+')');
      moveTo(el.lab,px+(X[0]>M-1.2?-14:13),py-10);
      if(api) api.changed();
      if(!out) return;
      t='p = '+pair(s.p1,s.p2,2)+'   w = '+fmt(s.w,1)+(Math.abs(s.k-1)>1e-9?'   k = '+fmt(s.k,2)+': kp = '+pair(s.kp1,s.kp2,2)+', kw = '+fmt(s.kw,1):'')+
        '\nw/p₁ = '+fmt(s.i1,2)+'   w/p₂ = '+fmt(s.i2,2)+'   slope '+MINUS+'p₁/p₂ = '+fmt(-s.ratio,2)+
        '\nagainst the dashed budget p = (2, 1), w = 8: '+
        (s.rel==='same'?'the same set':s.rel==='bigger'?'B(p, w) contains it, gains only':s.rel==='smaller'?'B(p, w) lies inside it, losses only':'neither set contains the other')+
        '\nx = '+pair(X[0],X[1],2)+'   p·x = '+fmt(s.cost,2);
      out.textContent=t;
      if(s.aff) add(out,' ≤ w: affordable'); else warn(out,' > w: not affordable');
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])]]; },
      function(i,x,y){ put(F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){
        if('x1' in o || 'x2' in o){ put('x1' in o?+o.x1:X[0],'x2' in o?+o.x2:X[1]); update(); }
        setP(o);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Monotonicity and convex upper contour sets ---------- */
  NF.register('mi2-prefs',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var FAM={min:fMin(1,1), sum:fLinear(1,1), bliss:fBliss(4,4), sq:fSq(), sqrt:fSqrt(), thick:fThick(3,5)}, M=8, X0=[2,2], X=X0.slice(), dd=3,
        W=520, F, el={}, hs=[], api, i;
    var LEV={min:[1,2,3,4,5,6,7], sum:[], bliss:[-1,-4,-9,-16,-25], sq:[], sqrt:[], thick:[1,2,4,5,6,7,8,9,10,11,12,13]};
    for(i=1;i<=15;i++) LEV.sum.push(i);
    for(i=1;i<=11;i++) LEV.sq.push(i*i);
    for(i=1;i<=11;i++) LEV.sqrt.push(i/2);
    var VERD={min:'min{x₁, x₂}: weakly monotone, not strongly; convex, not strictly',
      sum:'x₁ + x₂: strongly monotone; convex, not strictly',
      bliss:'bliss point (4, 4): not monotone; LNS except at (4, 4); strictly convex',
      sq:'x₁² + x₂²: strongly monotone; not convex',
      sqrt:'√x₁ + √x₂: strongly monotone; strictly convex',
      thick:'thick band 3 ≤ x₁ + x₂ ≤ 5: not even weakly monotone, and LNS fails inside the band; convex'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; draw(); });
    if(!FAM[fam]) fam='min';
    var rd=range(fig,'d',2,function(v){ dd=v; update(); });
    if(rd) dd=rd.v();
    function put(x,y){ X=[clamp(snap(x,0.25),0,M),clamp(snap(y,0.25),0,M)]; }
    function draw(){
      var f=FAM[fam], k, d='';
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,1);
      el.up=S('path',{'class':'mi2-up'},F.gc);
      if(fam==='thick') S('path',{d:pathOf(F,[[[3,0],[0,3]],[[5,0],[0,5]]]),'class':'mi2-icf'},F.gc);
      for(k=0;k<LEV[fam].length;k++) d+=pathOf(F,f.curve(LEV[fam][k],M,M));
      S('path',{d:d,'class':'mi2-icf'},F.gc);
      el.band=S('path',{'class':'mi2-band'},F.gc);
      el.ic=S('path',{'class':'mi2-ic'},F.gc);
      if(fam==='bliss') S('circle',{cx:R(F.sx(4)),cy:R(F.sy(4)),r:2.5,'class':'mi2-bliss'},F.gc);
      el.chord=line(F.gc,0,0,0,0,'mi2-chord');
      el.z=S('circle',{r:4.5,'class':'mi2-zpt'},svg);
      el.m=S('circle',{r:5,'class':'mi2-mix'},svg);
      el.a1=vec(svg,'mi2-same'); el.a2=vec(svg,'mi2-same');
      el.lab=[vlab(svg,'x','','mi2-cp nf-halo'),vlab(svg,'z','','mi2-cg nf-halo'),vlab(svg,'m','','mi2-co nf-halo')];
      hs=[handle(svg,'mi2-kp','Bundle x, arrow keys move it',function(dx,dy){ put(X[0]+dx*0.25,X[1]+dy*0.25); update(); })];
      update();
    }
    /* the comparison with a small step from x, and whether any nearby bundle is better */
    function step(dx,dy){
      var f=FAM[fam], h=1e-4, a=f.u(X[0],X[1]), b=f.u(X[0]+h*dx,X[1]+h*dy), t=1e-12*Math.max(1,Math.abs(a));
      return b>a+t?'better':b<a-t?'worse':'same';
    }
    function lns(){
      var f=FAM[fam], a=f.u(X[0],X[1]), h=1e-4, k, x, y;
      for(k=0;k<16;k++){
        x=X[0]+h*Math.cos(k*Math.PI/8); y=X[1]+h*Math.sin(k*Math.PI/8);
        if(x<0||y<0) continue;
        if(f.u(x,y)>a+1e-12*Math.max(1,Math.abs(a))) return true;
      }
      return false;
    }
    /* the indifference curve through x, inside the plane */
    function curveX(){
      var f=FAM[fam], c=f.u(X[0],X[1]), s;
      if(fam==='thick' && c===f.lo){ s=X[0]+X[1]; return [[[s,0],[0,s]]]; }
      return f.curve(c,M,M);
    }
    /* z: the bundle at arc length dd from x along I(x); m: the midpoint of x and z */
    function zOf(){
      var f=FAM[fam], L=curveX(), runs=[], best=null, bd=Infinity, i, j, r, d2, P, closed, z;
      for(i=0;i<L.length;i++) runs=runs.concat(clipRuns(L[i],M,M));
      for(i=0;i<runs.length;i++){ r=runs[i]; for(j=0;j<r.length;j++){ d2=Math.hypot(r[j][0]-X[0],r[j][1]-X[1]); if(d2<bd){ bd=d2; best=r; } } }
      if(!best || Math.abs(dd)<1e-9) return X.slice();
      P=best; closed=P.length>3 && Math.hypot(P[0][0]-P[P.length-1][0],P[0][1]-P[P.length-1][1])<1e-6;
      z=walk(P,X,dd,closed);
      if(fam==='bliss') z=onLevel(f,f.o,z,f.u(X[0],X[1]));
      else if(fam==='sq' || fam==='sqrt') z=onLevel(f,[0,0],z,f.u(X[0],X[1]));
      return z;
    }
    function state(){
      var f=FAM[fam], s=X[0]+X[1], z=zOf(), m=[(X[0]+z[0])/2,(X[1]+z[1])/2], ux=f.u(X[0],X[1]), um=f.u(m[0],m[1]), t=1e-7*Math.max(1,Math.abs(ux));
      return {fam:fam, x1:X[0], x2:X[1], u:ux, e1:step(1,0), diag:step(1,1), lns:lns(), band:fam==='thick' && s>=3-1e-9 && s<=5+1e-9,
        d:dd, z1:z[0], z2:z[1], m1:m[0], m2:m[1], um:um, mid:Math.hypot(z[0]-X[0],z[1]-X[1])<1e-6?'none':um>ux+t?'better':um<ux-t?'worse':'same'};
    }
    function cls(v){ return v==='better'?'mi2-good':v==='worse'?'mi2-bad':'mi2-same'; }
    function update(){
      if(!F) return;
      var f=FAM[fam], s=state(), px=F.sx(X[0]), py=F.sy(X[1]), L=0.8*F.u, zx=F.sx(s.z1), zy=F.sy(s.z2), mx=F.sx(s.m1), my=F.sy(s.m2), t, word, has=s.mid!=='none';
      el.up.setAttribute('d',upperPath(F,f.u,s.u));
      if(s.band){ el.band.setAttribute('d',poly([[F.sx(3),F.sy(0)],[F.sx(5),F.sy(0)],[F.sx(0),F.sy(5)],[F.sx(0),F.sy(3)]])+'Z'); }
      else el.band.setAttribute('d','');
      el.ic.setAttribute('d',pathOf(F,curveX()));
      setLine(el.chord,px,py,zx,zy); show(el.chord,has);
      at(el.z,zx,zy); show(el.z,has); show(el.lab[1],has);
      at(el.m,mx,my); show(el.m,has); show(el.lab[2],has);
      el.m.setAttribute('class','mi2-mix'+(s.mid==='worse'?' mi2-mixbad':''));
      setVec(el.a1,px,py,px+L,py,cls(s.e1));
      setVec(el.a2,px,py,px+L*0.7071,py-L*0.7071,cls(s.diag));
      place(hs[0],px,py,'x = ('+tl(X[0])+', '+tl(X[1])+')');
      moveTo(el.lab[0],px-12,py+(X[1]<0.6?-10:17));
      moveTo(el.lab[1],zx+(s.z1>M-0.8?-11:11),zy+(s.z2<0.6?-8:16));
      moveTo(el.lab[2],mx+(s.m1>M-0.8?-12:12),my-8);
      if(api) api.changed();
      if(!out) return;
      word=function(v){ return v==='better'?'better':v==='worse'?'worse':'no better'; };
      t='x = '+pair(X[0],X[1],2)+'   u(x) = '+fmt(s.u,2)+
        '\na little more good 1: '+word(s.e1)+'   a little more of both: '+word(s.diag)+'   a better bundle nearby: '+(s.lns?'yes':'no')+'\n';
      out.textContent=t;
      if(!s.lns) warn(out,'no bundle close to x is better: local nonsatiation fails here\n');
      if(!has) add(out,fam==='bliss' && s.u===0?'x is the bliss point: I(x) is the point itself\n':'move z along I(x) to test convexity\n');
      else {
        add(out,'z = '+pair(s.z1,s.z2,2)+' on I(x), midpoint m = '+pair(s.m1,s.m2,2)+': ');
        if(s.mid==='worse') warn(out,'m ≺ x, so m is outside U(x): not convex\n');
        else add(out,(s.mid==='better'?'m ≻ x':'m ∼ x')+', so m ∈ U(x)\n');
      }
      add(out,VERD[fam]);
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])]]; },
      function(i,x,y){ put(F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
        if('x1' in o || 'x2' in o) put('x1' in o?+o.x1:X[0],'x2' in o?+o.x2:X[1]);
        if('d' in o && rd) rd.set(o.d);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Quasiconcavity is ordinal, concavity is not ---------- */
  NF.register('mi2-ordinal',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var f=fCobb(0.5,0.5), M=4, P0=[[1,1],[3,3]], P=[P0[0].slice(),P0[1].slice()], lam=0.5, W=520, H=400, F, G=null, el={}, hs=[], api, bx2;
    var rep=seg(fig,'data-rep',function(v){ if(v===rep) return; rep=v; update(); });
    if(rep!=='v') rep='u';
    var rl=range(fig,'lam',2,function(v){ lam=v; update(); });
    if(rl) lam=rl.v();
    onClick(fig,'.nfig-reset',function(){ P=[P0[0].slice(),P0[1].slice()]; if(rl) rl.set(0.5); else { lam=0.5; update(); } });
    function put(i,x,y){ P[i]=[clamp(snap(x,0.1),0,M),clamp(snap(y,0.1),0,M)]; }
    function val(x,y){ var v=f.u(x,y); return rep==='v'?v*v*v*v:v; }
    function mixAt(l){ return [l*P[0][0]+(1-l)*P[1][0],l*P[0][1]+(1-l)*P[1][1]]; }
    function draw(){
      var B=twoBoxes(measure(svg),0.62), i, c, y, t;
      W=measure(svg); H=B[2]; frame(svg,W,H);
      F=axes(svg,B[0],[0,M],[0,M],steps(M,1),steps(M,1),['x','1'],['x','2']);
      bx2=B[1];
      el.up=S('path',{'class':'mi2-up'},F.gc);
      for(c=1;c<=3;c++){
        S('path',{d:pathOf(F,f.curve(c,M,M)),'class':'mi2-icf mi2-icf2'},F.gc);
        y=c*c/3.9;
        t=text(svg,F.sx(3.92),F.sy(y)+13,'u = '+c+', v = '+(c*c*c*c),'mi2-clab nf-halo','end');
      }
      line(F.gc,F.sx(0),F.sy(0),F.sx(M),F.sy(M),'mi2-guide');
      el.ic=[S('path',{'class':'mi2-ic'},F.gc),S('path',{'class':'mi2-ic mi2-ic2'},F.gc)];
      el.chord=line(F.gc,0,0,0,0,'mi2-chord');
      el.m=S('circle',{r:5,'class':'mi2-mix'},svg);
      el.lab=[vlab(svg,'y','','mi2-cb nf-halo'),vlab(svg,'z','','mi2-cg nf-halo'),vlab(svg,'m','','mi2-co nf-halo')];
      el.rg=S('g',null,svg);
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,i?'mi2-kg':'mi2-kb','Bundle '+(i?'z':'y')+', arrow keys move it',keyer(i)));
      update();
    }
    function keyer(i){ return function(dx,dy){ put(i,P[i][0]+dx*0.1,P[i][1]+dy*0.1); update(); }; }
    function state(){
      var m=mixAt(lam), uy=val(P[0][0],P[0][1]), uz=val(P[1][0],P[1][1]), um=val(m[0],m[1]), mn=Math.min(uy,uz), avg=lam*uy+(1-lam)*uz,
          t=1e-9*Math.max(1,uy,uz), worst=0, k, l, h;
      for(k=0;k<=100;k++){ l=k/100; h=val(mixAt(l)[0],mixAt(l)[1])-(l*uy+(1-l)*uz); if(h<worst) worst=h; }
      return {rep:rep, lam:lam, y1:P[0][0], y2:P[0][1], z1:P[1][0], z2:P[1][1], m1:m[0], m2:m[1], uy:uy, uz:uz, um:um, mn:mn, avg:avg,
        qc:um>=mn-t, concave:um>=avg-t, chordok:worst>=-1e-7*Math.max(1,uy,uz)};
    }
    /* the section plot: the representation along the chord from z (left) to y (right) */
    function section(s){
      var g=el.rg, b=bx2, n=120, k, l, q, hs2=[], ch=[], top=0, Y, gp, fail=[], d='', U=rep==='v'?'v':'u', yt;
      while(g.firstChild) g.removeChild(g.firstChild);
      for(k=0;k<=n;k++){ l=k/n; q=mixAt(l); hs2.push(val(q[0],q[1])); ch.push(l*s.uy+(1-l)*s.uz); top=Math.max(top,hs2[k],ch[k]); }
      Y=nice(Math.max(top*1.08,1e-6));
      yt=steps(Y,nice(Y/4));
      G=axes(g,b,[0,1],[0,Y],[0,0.25,0.5,0.75,1],yt,'λ',U+'(λy + (1 '+MINUS+' λ)z)',{});
      gp=S('g',null,g);
      /* red where the representation dips below its chord: concavity fails there */
      for(k=0;k<=n;k++){
        if(hs2[k]<ch[k]-1e-9*Math.max(1,top)){ fail.push(k); }
        else if(fail.length){ d+=failPath(fail,hs2,ch,n); fail=[]; }
      }
      if(fail.length) d+=failPath(fail,hs2,ch,n);
      S('path',{d:d,'class':'mi2-fail'},gp);
      line(gp,G.sx(0),G.sy(s.mn),G.sx(1),G.sy(s.mn),'mi2-minl');
      line(gp,G.sx(0),G.sy(s.uz),G.sx(1),G.sy(s.uy),'mi2-chordv');
      S('path',{d:poly(hs2.map(function(v,k2){ return [G.sx(k2/n),G.sy(v)]; })),'class':'mi2-hline'+(rep==='v'?' mi2-hlinev':'')},gp);
      line(gp,C(G.sx(s.lam)),b.y,C(G.sx(s.lam)),b.y+b.h,'mi2-guide');
      S('circle',{cx:R(G.sx(s.lam)),cy:R(G.sy(s.avg)),r:3.5,'class':'mi2-avgpt'},gp);
      S('circle',{cx:R(G.sx(s.lam)),cy:R(G.sy(s.um)),r:5,'class':'mi2-mix'},gp);
      text(gp,G.sx(0),b.y+b.h+29,'z','mi2-cg mi2-it','middle');
      text(gp,G.sx(1),b.y+b.h+29,'y','mi2-cb mi2-it','middle');
    }
    function failPath(idx,hs2,ch,n){
      var up=[], dn=[], i;
      if(idx.length<2) return '';
      for(i=0;i<idx.length;i++){ up.push([G.sx(idx[i]/n),G.sy(ch[idx[i]])]); dn.push([G.sx(idx[i]/n),G.sy(hs2[idx[i]])]); }
      return poly(up.concat(dn.reverse()))+'Z';
    }
    function update(){
      if(!F) return;
      var s=state(), by=f.u(P[0][0],P[0][1]), bz=f.u(P[1][0],P[1][1]), i, T, t, U=rep==='v'?'v':'u', d=rep==='v'?1:2;
      el.up.setAttribute('d',upperPath(F,f.u,Math.min(by,bz)));
      el.ic[0].setAttribute('d',pathOf(F,f.curve(by,M,M)));
      el.ic[1].setAttribute('d',Math.abs(by-bz)<tolOf(by,bz)?'':pathOf(F,f.curve(bz,M,M)));
      setLine(el.chord,F.sx(P[0][0]),F.sy(P[0][1]),F.sx(P[1][0]),F.sy(P[1][1]));
      at(el.m,F.sx(s.m1),F.sy(s.m2));
      for(i=0;i<2;i++){
        T=[F.sx(P[i][0]),F.sy(P[i][1])];
        place(hs[i],T[0],T[1],(i?'z':'y')+' = ('+tl(P[i][0])+', '+tl(P[i][1])+')');
        moveTo(el.lab[i],T[0]+(P[i][0]>M-0.5?-13:13),T[1]+(P[i][1]>M-0.4?17:-10));
      }
      moveTo(el.lab[2],F.sx(s.m1)-12,F.sy(s.m2)+(s.m2<0.3?-9:17));
      section(s);
      if(api) api.changed();
      if(!out) return;
      t=U+'(y) = '+fmt(s.uy,d)+'   '+U+'(z) = '+fmt(s.uz,d)+'   m = '+pair(s.m1,s.m2,2)+', '+U+'(m) = '+fmt(s.um,d)+' at λ = '+fmt(lam,2)+
        '\nquasiconcave: '+U+'(m) '+(s.qc?'≥':'<')+' min{'+U+'(y), '+U+'(z)} = '+fmt(s.mn,d)+(s.qc?', passes':', fails')+
        '\nconcave: '+U+'(m) '+(s.concave?'≥':'<')+' λ'+U+'(y) + (1 '+MINUS+' λ)'+U+'(z) = '+fmt(s.avg,d);
      out.textContent=t;
      if(s.concave) add(out,', passes'); else warn(out,', fails');
      if(s.concave && !s.chordok) warn(out,'; it fails elsewhere on this chord (red)');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return P.map(function(p){ return [F.sx(p[0]),F.sy(p[1])]; }); },
      function(i,x,y){ put(i,F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){
        if('rep' in o) press(fig,'data-rep',o.rep);
        if('y1' in o || 'y2' in o) put(0,'y1' in o?+o.y1:P[0][0],'y2' in o?+o.y2:P[0][1]);
        if('z1' in o || 'z2' in o) put(1,'z1' in o?+o.z1:P[1][0],'z2' in o?+o.z2:P[1][1]);
        if('lam' in o && rl) rl.set(o.lam);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Continuity: closed contour sets, and the lexicographic gap ---------- */
  NF.register('mi2-contour',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var M=4, N=8, W=520, F, el={}, hs=[], api, cd=fCobb(0.5,0.5);
    var DEF={cont:{x:[1.6,1.6],b:[3.2,0.8]}, lex:{x:[1,0.5],b:[1,0]}};
    var mode=seg(fig,'data-mode',function(v){ if(!DEF[v]||v===mode) return; mode=v; X=DEF[v].x.slice(); B=DEF[v].b.slice(); draw(); });
    if(!DEF[mode]) mode='lex';
    var X=DEF[mode].x.slice(), B=DEF[mode].b.slice();
    var rn=range(fig,'n',0,function(v){ N=Math.round(v); update(); });
    if(rn) N=Math.round(rn.v());
    function put(i,x,y){ var p=[clamp(snap(x,0.1),0,M),clamp(snap(y,0.1),0,M)]; if(i) B=p; else X=p; }
    /* y at least as good as x */
    function geq(y,x){
      if(mode==='cont') return y[0]*y[1]>=x[0]*x[1]-1e-9;
      return y[0]>x[0]+1e-9 || (Math.abs(y[0]-x[0])<=1e-9 && y[1]>=x[1]-1e-9);
    }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,1);
      el.lo=S('path',{'class':'mi2-lo'},F.gc);
      el.up=S('path',{'class':'mi2-up mi2-up2'},F.gc);
      el.ic=S('path',{'class':'mi2-ic mi2-icg'},F.gc);
      el.open=line(F.gc,0,0,0,0,'mi2-open');
      el.rayL=line(F.gc,0,0,0,0,'mi2-rayL');
      el.rayU=line(F.gc,0,0,0,0,'mi2-rayU');
      el.tU=text(svg,0,0,'U(x)','mi2-tU nf-halo','middle');
      el.tL=text(svg,0,0,'L(x)','mi2-tL nf-halo','middle');
      el.seq=S('g',null,svg);
      el.lim=S('circle',{r:9,'class':'mi2-limring'},svg);
      el.lab=[vlab(svg,'x','','mi2-cp nf-halo'),vlab(svg,'b','','mi2-co nf-halo')];
      el.blab=text(svg,0,0,'','nf-lab nf-halo','start');
      hs=[handle(svg,'mi2-kp','Bundle x, arrow keys move it',keyer(0)),handle(svg,'mi2-ko','Limit point b of the sequence, arrow keys move it',keyer(1))];
      update();
    }
    function keyer(i){ return function(dx,dy){ var p=i?B:X; put(i,p[0]+dx*0.1,p[1]+dy*0.1); update(); }; }
    function seqPts(){ var a=[], n; for(n=1;n<=N;n++) a.push([B[0]+1/n,B[1]]); return a; }
    function state(){
      var Y=seqPts(), k, inU=0;
      for(k=0;k<Y.length;k++) if(geq(Y[k],X)) inU++;
      return {mode:mode, x1:X[0], x2:X[1], b1:B[0], b2:B[1], n:N, inU:inU, all:inU===N, limU:geq(B,X), limI:geq(B,X) && geq(X,B)};
    }
    function update(){
      if(!F) return;
      var s=state(), Y=seqPts(), a=X[0], b=X[1], k, c, cls, t, px=F.sx(X[0]), py=F.sy(X[1]), qx=F.sx(B[0]), qy=F.sy(B[1]), last;
      if(mode==='cont'){
        c=cd.u(a,b);
        el.lo.setAttribute('d',lowerPath(F,cd.u,c));
        el.up.setAttribute('d',upperPath(F,cd.u,c));
        el.ic.setAttribute('d',pathOf(F,cd.curve(c,M,M)));
        setLine(el.open,0,0,0,0); setLine(el.rayL,0,0,0,0); setLine(el.rayU,0,0,0,0);
        moveTo(el.tU,F.sx(Math.min(3.2,M-0.7)),F.sy(3.4)); moveTo(el.tL,F.sx(0.45),F.sy(0.25));
        show(el.tU,c<2.9); show(el.tL,c>0.45);
      } else {
        el.lo.setAttribute('d',polyPath(F,[[0,0],[a,0],[a,M],[0,M]]));
        el.up.setAttribute('d',polyPath(F,[[a,0],[M,0],[M,M],[a,M]]));
        el.ic.setAttribute('d','');
        /* the line x1 = a: below x it belongs to L(x) only, from x up to U(x) only */
        setLine(el.rayL,F.sx(a),F.sy(0),F.sx(a),F.sy(b));
        setLine(el.rayU,F.sx(a),F.sy(b),F.sx(a),F.sy(M));
        setLine(el.open,0,0,0,0);
        moveTo(el.tU,F.sx((a+M)/2),F.sy(3.4)); moveTo(el.tL,F.sx(a/2),F.sy(3.4));
        show(el.tU,M-a>0.7); show(el.tL,a>0.7);
      }
      while(el.seq.firstChild) el.seq.removeChild(el.seq.firstChild);
      for(k=0;k<Y.length;k++){
        if(Y[k][0]>M+1e-9) continue;
        cls=geq(Y[k],X)?'mi2-in':'mi2-out';
        S('circle',{cx:R(F.sx(Y[k][0])),cy:R(F.sy(Y[k][1])),r:k<3?3.5:2.6,'class':cls},el.seq);
      }
      at(el.lim,qx,qy);
      el.lim.setAttribute('class','mi2-limring'+(s.limU?'':' mi2-limbad'));
      place(hs[0],px,py,'x = ('+tl(X[0])+', '+tl(X[1])+')');
      place(hs[1],qx,qy,'b = ('+tl(B[0])+', '+tl(B[1])+')');
      moveTo(el.lab[0],px-13,py-9);
      moveTo(el.lab[1],qx-13,qy+(B[1]<0.4?-11:17));
      el.blab.textContent=s.limU?'b ∈ U(x)':'b ∉ U(x)';
      el.blab.setAttribute('class','nf-halo '+(s.limU?'nf-lab':'mi2-cr'));
      last=qx+14+70>F.x0+F.w;
      el.blab.setAttribute('text-anchor',last?'end':'start');
      moveTo(el.blab,qx+(last?-16:14),qy+(B[1]<0.4?-12:-12));
      if(api) api.changed();
      if(!out) return;
      t=(mode==='cont'?'continuous, u = √(x₁x₂)':'lexicographic')+': x = '+pair(X[0],X[1],2)+', b = '+pair(B[0],B[1],2)+
        '\nyⁿ = (b₁ + 1/n, b₂) for n = 1 to '+N+': '+(s.all?'all in U(x)':s.inU===0?'none in U(x)':s.inU+' of '+N+' in U(x)')+'\n';
      out.textContent=t;
      if(s.all && !s.limU) warn(out,'the limit b is not in U(x): x ≻ b, so U(x) is not closed and (C2) fails');
      else if(s.all) add(out,'the limit b '+(s.limI?'∼ x':'≻ x')+' is in U(x), as (C2) requires');
      else add(out,'the yⁿ are not all in U(x), so (C2) says nothing about b; move b');
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])],[F.sx(B[0]),F.sy(B[1])]]; },
      function(i,x,y){ put(i,F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){
        if('mode' in o) press(fig,'data-mode',o.mode);
        if('x1' in o || 'x2' in o) put(0,'x1' in o?+o.x1:X[0],'x2' in o?+o.x2:X[1]);
        if('b1' in o || 'b2' in o) put(1,'b1' in o?+o.b1:B[0],'b2' in o?+o.b2:B[1]);
        if('n' in o && rn) rn.set(o.n);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Debreu's construction: label each bundle by the diagonal ---------- */
  NF.register('mi2-debreu',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var FAM={cd:fCobb(0.3,0.7), sub:fLinear(1,2), min:fMin(1,2)}, M=5, P0=[[4,1],[0.9,1.7]], P=[P0[0].slice(),P0[1].slice()], T=2, W=520, F, el={}, hs=[], api;
    var NAME={cd:'Cobb Douglas x₁⁰·³x₂⁰·⁷', sub:'x₁ + 2x₂', min:'min{x₁, 2x₂}'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; update(); });
    if(!FAM[fam]) fam='cd';
    var rt=range(fig,'t',2,function(v){ T=v; update(); });
    if(rt) T=rt.v();
    function put(i,x,y){ P[i]=[clamp(snap(x,0.05),0,M),clamp(snap(y,0.05),0,M)]; }
    /* t(x): the point te of the diagonal with te ~ x; u(te) is t, 3t and t for the three families */
    function tOf(x){ return fam==='cd'?Math.pow(x[0],0.3)*Math.pow(x[1],0.7):fam==='sub'?(x[0]+2*x[1])/3:Math.min(x[0],2*x[1]); }
    function uOf(x){ return FAM[fam].u(x[0],x[1]); }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,1);
      el.ic=[S('path',{'class':'mi2-ic mi2-icr'},F.gc),S('path',{'class':'mi2-ic mi2-icp'},F.gc)];
      line(F.gc,F.sx(0),F.sy(0),F.sx(M),F.sy(M),'mi2-diag');
      el.B=line(F.gc,0,0,0,0,'mi2-segB');
      el.A=line(F.gc,0,0,0,0,'mi2-segA');
      el.me=line(svg,0,0,0,0,'mi2-metick');
      el.mel=text(svg,0,0,'Me','mi2-it nf-lab nf-halo','start');
      el.tA=text(svg,0,0,'A','mi2-tA nf-halo','start');
      el.tB=text(svg,0,0,'B','mi2-tB nf-halo','start');
      el.sq=[S('rect',{width:9,height:9,'class':'mi2-sqr'},svg),S('rect',{width:9,height:9,'class':'mi2-sqp'},svg)];
      el.tp=S('circle',{r:4.5,'class':'mi2-tdot'},svg);
      el.lab=[vlab(svg,'x','','mi2-cr nf-halo'),vlab(svg,'y','','mi2-cp nf-halo')];
      hs=[handle(svg,'mi2-kr','Bundle x, arrow keys move it',keyer(0)),handle(svg,'mi2-kp','Bundle y, arrow keys move it',keyer(1))];
      update();
    }
    function keyer(i){ return function(dx,dy){ put(i,P[i][0]+dx*0.05,P[i][1]+dy*0.05); update(); }; }
    function state(){
      var tx=tOf(P[0]), ty=tOf(P[1]), Mx=Math.max(P[0][0],P[0][1]), ut=uOf([T,T]), ux=uOf(P[0]), e=1e-9*Math.max(1,ux);
      return {fam:fam, x1:P[0][0], x2:P[0][1], y1:P[1][0], y2:P[1][1], tx:tx, ty:ty, M:Mx, t:T,
        inA:T<=Mx+1e-9 && ut>=ux-e, inB:T<=Mx+1e-9 && ut<=ux+e, cmp:tx>ty+1e-9?'x':ty>tx+1e-9?'y':'tie'};
    }
    function update(){
      if(!F) return;
      var f=FAM[fam], s=state(), i, T2, t, q;
      el.ic[0].setAttribute('d',pathOf(F,f.curve(uOf(P[0]),M,M)));
      el.ic[1].setAttribute('d',pathOf(F,f.curve(uOf(P[1]),M,M)));
      setLine(el.B,F.sx(0),F.sy(0),F.sx(s.tx),F.sy(s.tx));
      setLine(el.A,F.sx(s.tx),F.sy(s.tx),F.sx(Math.max(s.tx,s.M)),F.sy(Math.max(s.tx,s.M)));
      q=[F.sx(s.M),F.sy(s.M)];
      setLine(el.me,q[0]-6,q[1]-6,q[0]+6,q[1]+6);
      moveTo(el.mel,q[0]+9,q[1]+12);
      moveTo(el.tA,F.sx((s.tx+s.M)/2)-14,F.sy((s.tx+s.M)/2)-4); show(el.tA,(s.M-s.tx)*F.u>36);
      moveTo(el.tB,F.sx(s.tx/2)+8,F.sy(s.tx/2)+12); show(el.tB,s.tx*F.u>36);
      for(i=0;i<2;i++){ T2=i?s.ty:s.tx; el.sq[i].setAttribute('x',R(F.sx(T2)-4.5)); el.sq[i].setAttribute('y',R(F.sy(T2)-4.5)); }
      at(el.tp,F.sx(Math.min(s.t,M)),F.sy(Math.min(s.t,M)));
      el.tp.setAttribute('class','mi2-tdot'+(s.inA&&s.inB?' mi2-tboth':s.inA?' mi2-tinA':s.inB?' mi2-tinB':''));
      for(i=0;i<2;i++){
        place(hs[i],F.sx(P[i][0]),F.sy(P[i][1]),(i?'y':'x')+' = ('+tl(P[i][0])+', '+tl(P[i][1])+')');
        moveTo(el.lab[i],F.sx(P[i][0])+(P[i][0]>M-0.5?-13:13),F.sy(P[i][1])-10);
      }
      if(api) api.changed();
      if(!out) return;
      t=NAME[fam]+': x = '+pair(s.x1,s.x2,2)+' ∼ t(x)e with t(x) = '+fmt(s.tx,2)+', M = '+fmt(s.M,2)+
        '\ny = '+pair(s.y1,s.y2,2)+': t(y) = '+fmt(s.ty,2)+', so '+(s.cmp==='x'?'x ≻ y':s.cmp==='y'?'y ≻ x':'x ∼ y')+
        '\nA = ['+fmt(s.tx,2)+', '+fmt(s.M,2)+'] and B = [0, '+fmt(s.tx,2)+'] are closed and meet only at t(x)'+
        '\nte at t = '+fmt(s.t,2)+': ';
      out.textContent=t;
      if(s.t>s.M+1e-9) add(out,'outside [0, M]');
      else add(out,s.inA&&s.inB?'te ∼ x, in A and in B':s.inA?'te ≻ x, in A only':'x ≻ te, in B only');
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return P.map(function(p){ return [F.sx(p[0]),F.sy(p[1])]; }); },
      function(i,x,y){ put(i,F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
        if('x1' in o || 'x2' in o) put(0,'x1' in o?+o.x1:P[0][0],'x2' in o?+o.x2:P[0][1]);
        if('y1' in o || 'y2' in o) put(1,'y1' in o?+o.y1:P[1][0],'y2' in o?+o.y2:P[1][1]);
        if('t' in o && rt) rt.set(o.t);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. The MRS along an indifference curve ---------- */
  NF.register('mi2-mrs',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var CV={
      cd:{name:'x₁x₂ = 4', lo:2/3, hi:6, x2:function(a){ return 4/a; }, mrs:function(a){ return 4/(a*a); }, f:'x₂/x₁', kind:'convex',
        trend:'the MRS falls as x₁ rises: diminishing MRS, a convex curve'},
      lin:{name:'x₁ + x₂ = 4', lo:0, hi:4, x2:function(a){ return 4-a; }, mrs:function(){ return 1; }, f:'1', kind:'linear',
        trend:'the MRS is constant: a straight line, convex but not strictly'},
      sq:{name:'x₁² + x₂² = 16', lo:0, hi:3.95, x2:function(a){ return Math.sqrt(16-a*a); }, mrs:function(a){ return a/Math.sqrt(16-a*a); }, f:'x₁/x₂', kind:'concave',
        trend:'the MRS rises as x₁ rises: a concave curve, so the preference is not convex'}};
    var ORDER=['cd','lin','sq'], M=6, x1=2, W=520, H=400, F, G, el={}, hs=[], api;
    var fam=seg(fig,'data-fam',function(v){ if(!CV[v]||v===fam) return; fam=v; x1=clamp(x1,CV[v].lo,CV[v].hi); draw(); });
    if(!CV[fam]) fam='cd';
    function setX(v){ var c=CV[fam]; x1=clamp(Math.round(v*20)/20,Math.ceil(c.lo*20)/20,c.hi); }
    function sample(c,a,b,n,fn){ var p=[], i, x; for(i=0;i<=n;i++){ x=a+(b-a)*i/n; p.push([x,fn(x)]); } return p; }
    function draw(){
      var B=twoBoxes(measure(svg),0.62), k, c, p;
      W=measure(svg); H=B[2]; frame(svg,W,H);
      F=axes(svg,B[0],[0,M],[0,M],steps(M,1),steps(M,1),['x','1'],['x','2']);
      G=axes(svg,B[1],[0,M],[0,M],steps(M,1),steps(M,1),['x','1'],'MRS');
      c=CV[fam];
      S('path',{d:pathOf(F,[sample(c,Math.max(c.lo,0.01),fam==='sq'?4:c.hi,300,c.x2)]),'class':'mi2-ic mi2-c-'+fam},F.gc);
      el.tan=line(F.gc,0,0,0,0,'mi2-tan');
      el.tri=S('path',{'class':'mi2-tri'},F.gc);
      el.t1=text(svg,0,0,'1','nf-lab nf-halo','middle');
      el.tm=text(svg,0,0,'MRS','nf-lab nf-halo','start');
      /* right: the MRS along each curve against x1; the chosen curve is drawn strong */
      for(k=0;k<ORDER.length;k++){
        c=CV[ORDER[k]];
        p=sample(c,Math.max(c.lo,ORDER[k]==='cd'?2/3:0),c.hi,300,c.mrs);
        S('path',{d:pathOf(G,[p]),'class':'mi2-mcurve mi2-c-'+ORDER[k]+(ORDER[k]===fam?'':' mi2-dim')},G.gc);
      }
      el.lk=[text(svg,G.sx(1.05),G.sy(5.4),'convex','mi2-tc-cd nf-halo','start'),text(svg,G.sx(4.3),G.sy(1)+4,'linear','mi2-tc-lin nf-halo','start'),
        text(svg,G.sx(3.6),G.sy(5.4),'concave','mi2-tc-sq nf-halo','end')];
      el.mg=line(G.gc,0,0,0,0,'mi2-guide');
      el.md=S('circle',{r:5,'class':'mi2-mdot'},svg);
      el.pt=null;
      hs=[handle(svg,'mi2-ko','Bundle x on the curve, left and right arrow keys move it',function(dx,dy){ setX(x1+0.05*(dx||dy)); update(); })];
      update();
    }
    function state(){ var c=CV[fam], x2=c.x2(x1), m=c.mrs(x1); return {fam:fam, x1:x1, x2:x2, mrs:m, kind:c.kind}; }
    function update(){
      if(!F) return;
      var c=CV[fam], s=state(), px=F.sx(x1), py=F.sy(s.x2), r=Math.min(70,F.u*1.6), a, b, t;
      tangent(F,el.tan,[x1,s.x2],s.mrs,r);
      /* one more unit of good 1 along the tangent costs MRS units of good 2 */
      a=[F.sx(x1+1),F.sy(s.x2)]; b=[F.sx(x1+1),F.sy(s.x2-s.mrs)];
      el.tri.setAttribute('d',poly([[px,py],a,b]));
      moveTo(el.t1,(px+a[0])/2,py-5);
      moveTo(el.tm,a[0]+4,(a[1]+b[1])/2+4);
      show(el.t1,x1+1<=M); show(el.tm,x1+1<=M && s.mrs*F.u>14);
      setLine(el.mg,G.sx(x1),G.sy(0),G.sx(x1),G.sy(M));
      at(el.md,G.sx(x1),G.sy(Math.min(s.mrs,M)));
      show(el.md,s.mrs<=M);
      place(hs[0],px,py,'x = ('+fmt(x1,2)+', '+fmt(s.x2,2)+')');
      hs[0].setAttribute('aria-valuenow',+x1.toFixed(2));
      if(api) api.changed();
      if(!out) return;
      t=c.name+' at x = '+pair(x1,s.x2,2)+': MRS = u₁/u₂ = '+(c.f==='1'?'':c.f+' = ')+fmt(s.mrs,2)+', slope '+fmt(-s.mrs,2)+
        '\none more unit of good 1 is worth '+fmt(s.mrs,2)+' units of good 2 at the margin\n'+c.trend;
      out.textContent=t;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[F.sx(x1),F.sy(CV[fam].x2(x1))]]; },
      function(i,x,y){ setX(F.sx.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){ if('fam' in o) press(fig,'data-fam',o.fam); if('x1' in o) setX(+o.x1); update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. Homothetic against quasilinear: the MRS along rays and lines, and expansion paths ---------- */
  NF.register('mi2-homql',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var FAM={cd:fCobb(0.5,0.5), ql:fQuasi(3), sub:fLinear(1,2)}, M=8, X0=[2,4], X=X0.slice(), st={w:6,p2:1}, W=520, H=400, F, G, el={}, hs=[], api;
    var NAME={cd:'√(x₁x₂), homothetic', ql:'x₁ + 3√x₂, quasilinear in good 1', sub:'x₁ + 2x₂, homothetic and quasilinear'};
    var ALS=[0.5,1.5,2], TS=[-1.5,1.5,3];
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; draw(); });
    if(!FAM[fam]) fam='cd';
    var rw=range(fig,'w',2,function(v){ st.w=v; update(); }), rp=range(fig,'p2',2,function(v){ st.p2=v; update(); });
    if(rw) st.w=rw.v();
    if(rp) st.p2=rp.v();
    function put(x,y){ X=[clamp(snap(x,0.25),0.25,M),clamp(snap(y,0.25),0.25,M)]; }
    function draw(){
      var B=twoBoxes(measure(svg),1), f=FAM[fam], k, d='', lev;
      W=measure(svg); H=B[2]; frame(svg,W,H);
      F=axes(svg,B[0],[0,M],[0,M],steps(M,2),steps(M,2),['x','1'],['x','2']);
      G=axes(svg,B[1],[0,M],[0,M],steps(M,2),steps(M,2),['x','1'],['x','2']);
      lev=fam==='cd'?[1,2,3,4,5,6]:fam==='ql'?[2,4,6,8,10,12]:[2,4,6,8,10,12,14,16,18,20,22];
      for(k=0;k<lev.length;k++) d+=pathOf(F,f.curve(lev[k],M,M));
      S('path',{d:d,'class':'mi2-icf'},F.gc);
      el.ray=line(F.gc,0,0,0,0,'mi2-guide');
      el.hor=line(F.gc,0,0,0,0,'mi2-guide');
      el.ic=S('path',{'class':'mi2-ic'},F.gc);
      el.tx=line(F.gc,0,0,0,0,'mi2-tick mi2-tickx');
      el.ta=ALS.map(function(){ return line(F.gc,0,0,0,0,'mi2-tick mi2-tickp'); });
      el.tt=TS.map(function(){ return line(F.gc,0,0,0,0,'mi2-tick mi2-tickg'); });
      el.lab=vlab(svg,'x','','mi2-cb nf-halo');
      /* right: budget lines at p = (1, p2) and the path of x*(p, w) as w grows, for each family */
      el.bl=line(G.gc,0,0,0,0,'mi2-bline');
      el.band=line(G.gc,0,0,0,0,'mi2-optseg');
      el.paths={cd:S('path',{'class':'mi2-path mi2-pcd'},G.gc),ql:S('path',{'class':'mi2-path mi2-pql'},G.gc),sub:S('path',{'class':'mi2-path mi2-psub'},G.gc)};
      el.pl={cd:text(svg,0,0,'Cobb Douglas','mi2-tpcd nf-halo','start'),ql:text(svg,0,0,'quasilinear','mi2-tpql nf-halo','start'),sub:text(svg,0,0,'substitutes','mi2-tpsub nf-halo','start')};
      el.opt=S('circle',{r:5,'class':'mi2-opt'},svg);
      hs=[handle(svg,'mi2-kb','Bundle x, arrow keys move it',function(dx,dy){ put(X[0]+dx*0.25,X[1]+dy*0.25); update(); })];
      update();
    }
    function inside(p){ return p[0]>0.15 && p[1]>0.15 && p[0]<M-0.05 && p[1]<M-0.05; }
    /* demand at p = (1, p2), wealth w: interior, corner, or (for substitutes at p2 = 2) every point of the line */
    function demand(fm,w,p2){
      var x2s;
      if(fm==='cd') return {x:[w/2,w/(2*p2)], kind:'tan'};
      if(fm==='ql'){ x2s=2.25/(p2*p2); return w>p2*x2s?{x:[w-p2*x2s,x2s], kind:'tan', x2s:x2s}:{x:[0,w/p2], kind:'corner', x2s:x2s}; }
      if(Math.abs(p2-2)<1e-9) return {x:[w/2,w/4], kind:'many'};
      return p2<2?{x:[0,w/p2], kind:'corner'}:{x:[w,0], kind:'corner'};
    }
    function pathPts(fm,p2){
      var big=4*M, x2s;
      if(fm==='cd') return [[0,0],[big,big/p2]];
      if(fm==='ql'){ x2s=2.25/(p2*p2); return [[0,0],[0,x2s],[big,x2s]]; }
      if(Math.abs(p2-2)<1e-9) return [];
      return p2<2?[[0,0],[0,big]]:[[0,0],[big,0]];
    }
    function state(){
      var f=FAM[fam], m0=f.mrs(X[0],X[1]), ra=[], rt=[], i, p, D=demand(fam,st.w,st.p2), e=1e-9*Math.max(1,m0);
      for(i=0;i<ALS.length;i++){ p=[ALS[i]*X[0],ALS[i]*X[1]]; if(inside(p)) ra.push(f.mrs(p[0],p[1])); }
      for(i=0;i<TS.length;i++){ p=[X[0]+TS[i],X[1]]; if(inside(p)) rt.push(f.mrs(p[0],p[1])); }
      function same(a){ for(var k=0;k<a.length;k++) if(Math.abs(a[k]-m0)>e) return false; return true; }
      function span(a){ var lo=m0, hi=m0, k; for(k=0;k<a.length;k++){ lo=Math.min(lo,a[k]); hi=Math.max(hi,a[k]); } return [lo,hi]; }
      return {fam:fam, x1:X[0], x2:X[1], mrs:m0, rayeq:same(ra), horeq:same(rt), rs:span(ra), hs:span(rt), w:st.w, p2:st.p2,
        d1:D.x[0], d2:D.x[1], kind:D.kind, x2s:D.x2s};
    }
    function update(){
      if(!F) return;
      var f=FAM[fam], s=state(), far=M*2/Math.max(X[0],X[1]), r=Math.min(18,F.u*0.75), i, p, k, P, lp, t, q, fm;
      setLine(el.ray,F.sx(0),F.sy(0),F.sx(X[0]*far),F.sy(X[1]*far));
      setLine(el.hor,F.sx(0),F.sy(X[1]),F.sx(M),F.sy(X[1]));
      el.ic.setAttribute('d',pathOf(F,f.curve(f.u(X[0],X[1]),M,M)));
      tangent(F,el.tx,X,s.mrs,r);
      for(i=0;i<ALS.length;i++){ p=[ALS[i]*X[0],ALS[i]*X[1]]; if(inside(p)){ tangent(F,el.ta[i],p,f.mrs(p[0],p[1]),r); show(el.ta[i],true); } else show(el.ta[i],false); }
      for(i=0;i<TS.length;i++){ p=[X[0]+TS[i],X[1]]; if(inside(p)){ tangent(F,el.tt[i],p,f.mrs(p[0],p[1]),r); show(el.tt[i],true); } else show(el.tt[i],false); }
      place(hs[0],F.sx(X[0]),F.sy(X[1]),'x = ('+tl(X[0])+', '+tl(X[1])+')');
      moveTo(el.lab,F.sx(X[0])+(X[0]>M-1?-14:14),F.sy(X[1])+(X[1]>M-1?18:-10));
      /* right panel */
      setLine(el.bl,G.sx(st.w),G.sy(0),G.sx(0),G.sy(st.w/st.p2));
      setLine(el.band,G.sx(st.w),G.sy(0),G.sx(0),G.sy(st.w/st.p2)); show(el.band,s.kind==='many');
      for(k in el.paths){
        P=pathPts(k,st.p2);
        el.paths[k].setAttribute('d',pathOf(G,[P]));
        el.paths[k].setAttribute('class','mi2-path mi2-p'+k+(k===fam?' mi2-pon':''));
      }
      /* path labels: Cobb Douglas along its ray, quasilinear above its flat part, substitutes by its axis */
      q=Math.min(M*0.78,M*0.78*st.p2); lp={cd:[q*0.98,q/st.p2], ql:[M*0.55,Math.min(2.25/(st.p2*st.p2),M-0.6)], sub:st.p2<2?[0.15,M*0.92]:[M*0.62,0.25]};
      for(fm in el.pl){
        moveTo(el.pl[fm],G.sx(lp[fm][0])+(fm==='cd'?-74:4),G.sy(lp[fm][1])+(fm==='cd'?-6:fm==='ql'?-7:fm==='sub'&&st.p2<2?4:-6));
        show(el.pl[fm],fm!=='sub' || Math.abs(st.p2-2)>1e-9);
        el.pl[fm].setAttribute('class','mi2-tp'+fm+' nf-halo'+(fm===fam?' mi2-tpon':''));
      }
      at(el.opt,G.sx(s.d1),G.sy(s.d2)); show(el.opt,s.kind!=='many' && s.d1<=M && s.d2<=M);
      if(api) api.changed();
      if(!out) return;
      t=NAME[fam]+': MRS at x = '+pair(X[0],X[1],2)+' is '+fmt(s.mrs,2)+
        '\nalong the ray through x: '+(s.rayeq?'the same MRS at every αx shown':'MRS from '+fmt(s.rs[0],2)+' to '+fmt(s.rs[1],2))+
        '\nalong the line x + te₁: '+(s.horeq?'the same MRS at every point shown':'MRS from '+fmt(s.hs[0],2)+' to '+fmt(s.hs[1],2))+
        '\np = (1, '+fmt(st.p2,2)+'), w = '+fmt(st.w,2)+': ';
      out.textContent=t;
      if(s.kind==='many') add(out,'u₁/p₁ = u₂/p₂, so every bundle on the budget line is optimal');
      else {
        add(out,'x* = '+pair(s.d1,s.d2,2)+'; ');
        if(fam==='cd') add(out,'the path is a ray, x₂/x₁ = p₁/p₂ at every w');
        else if(fam==='ql') add(out,s.kind==='corner'?'w < p₂x₂* = '+fmt(st.p2*s.x2s,2)+', so a corner on good 2':'x₂* = '+fmt(s.x2s,2)+' at every w ≥ '+fmt(st.p2*s.x2s,2)+'; extra wealth buys good 1');
        else add(out,st.p2<2?'all on good 2, u₂/p₂ > u₁/p₁: the path is the x₂ axis':'all on good 1, u₁/p₁ > u₂/p₂: the path is the x₁ axis');
      }
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])]]; },
      function(i,x,y){ put(F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
        if('x1' in o || 'x2' in o) put('x1' in o?+o.x1:X[0],'x2' in o?+o.x2:X[1]);
        if('w' in o && rw) rw.set(o.w);
        if('p2' in o && rp) rp.set(o.p2);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 8. CES: unit curves and budget shares ---------- */
  NF.register('mi2-ces',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var th=0.5, lg=0.3, W=520, H=400, F, G, el={}, api, REFS=[1,0.5,0,-1,-4];
    var rth=range(fig,'th',2,function(v){ th=v; update(); });
    var rlg=range(fig,'lg',3,function(v){ lg=v; ratioLabel(); update(); });
    if(rth) th=rth.v();
    if(rlg) lg=rlg.v();
    function rho(){ return Math.pow(10,lg); }
    function ratioLabel(){
      if(!rlg) return;
      var v=rlg.wrap.querySelector('.nfig-val');
      if(v) v.textContent=fmt(rho(),2);
      rlg.el.setAttribute('aria-valuetext','p₁/p₂ = '+fmt(rho(),2));
    }
    ratioLabel();
    function isZero(t){ return Math.abs(t)<1e-9; }
    function sig(t){ return t>=1-1e-9?Infinity:1/(1-t); }
    /* u with beta1 = beta2 = 1/2, homogeneous of degree one */
    function U(t,a,b){ return isZero(t)?Math.sqrt(a*b):Math.pow(0.5*Math.pow(a,t)+0.5*Math.pow(b,t),1/t); }
    /* the unit curve u = 1: the ray with x1/x2 = k meets it at (k, 1)/u(k, 1) */
    function unit(t){
      var p=[], i, k, s, e;
      if(t>1e-9){ e=Math.pow(2,1/t); p.push([e,0]); }
      for(i=0;i<=320;i++){ k=Math.exp(9-18*i/320); s=U(t,k,1); p.push([k/s,1/s]); }
      if(t>1e-9) p.push([0,e]);
      return p;
    }
    function share(s,r){ return s===Infinity?(r<1?1:r>1?0:0.5):1/(1+Math.pow(r,s-1)); }
    function draw(){
      var B=twoBoxes(measure(svg),0.62), k, p, lx=function(v){ return v===-1?'0.1':v===0?'1':'10'; };
      W=measure(svg); H=B[2]; frame(svg,W,H);
      F=axes(svg,B[0],[0,3],[0,3],[0,1,2,3],[0,1,2,3],['x','1'],['x','2']);
      G=axes(svg,B[1],[-1,1],[0,1],[-1,0,1],[0,0.25,0.5,0.75,1],'p₁/p₂ (log scale)','share of good 1',{xlab:lx, below:true});
      for(k=0;k<REFS.length;k++) S('path',{d:pathOf(F,[unit(REFS[k])]),'class':'mi2-curf'},F.gc);
      S('path',{d:pathOf(F,[[[1,3.5],[1,1],[3.5,1]]]),'class':'mi2-leon'},F.gc);
      el.pl=line(F.gc,0,0,0,0,'mi2-pline');
      el.cur=S('path',{'class':'mi2-cur'},F.gc);
      el.band=line(F.gc,0,0,0,0,'mi2-optseg');
      S('circle',{cx:R(F.sx(1)),cy:R(F.sy(1)),r:3.5,'class':'mi2-one'},svg);
      el.opt=S('circle',{r:5,'class':'mi2-opt'},svg);
      el.ttl=text(svg,F.sx(2.95),F.sy(2.75),'','nf-lab nf-halo','end');
      /* right: budget share against p1/p2 on a log scale, references sigma = 0, 0.5, 1, 2 and infinity */
      [0,0.5,1,2,Infinity].forEach(function(s){
        if(s===Infinity) p=[[-1,1],[0,1],[0,0],[1,0]];
        else { p=[]; for(k=0;k<=120;k++) p.push([-1+2*k/120,share(s,Math.pow(10,-1+2*k/120))]); }
        S('path',{d:pathOf(G,[p]),'class':'mi2-curf'},G.gc);
      });
      el.lab0=[text(svg,G.sx(1)-3,G.sy(share(0,10))+13,'σ = 0','nf-lab nf-halo','end'),text(svg,G.sx(1)-3,G.sy(share(2,10))-5,'σ = 2','nf-lab nf-halo','end')];
      el.sh=S('path',{'class':'mi2-cur'},G.gc);
      el.sg=line(G.gc,0,0,0,0,'mi2-guide');
      el.sd=S('circle',{r:5,'class':'mi2-opt'},svg);
      update();
    }
    function state(){
      var s=sig(th), r=rho(), k, sc, x, kind='one';
      if(s===Infinity){ if(Math.abs(lg)<1e-9){ kind='many'; x=[1,1]; } else x=r<1?[2,0]:[0,2]; }
      else { k=Math.pow(r,-s); sc=U(th,k,1); x=[k/sc,1/sc]; }
      return {th:th, sigma:s, rho:r, x1:x[0], x2:x[1], ratio:x[1]>0?x[0]/x[1]:Infinity, share:kind==='many'?NaN:r*x[0]/(r*x[0]+x[1]), kind:kind};
    }
    function update(){
      if(!F) return;
      var s=state(), e=s.rho*s.x1+s.x2, p=[], k, v, t;
      el.cur.setAttribute('d',pathOf(F,[unit(th)]));
      setLine(el.pl,F.sx(e/s.rho),F.sy(0),F.sx(0),F.sy(e));
      setLine(el.band,F.sx(2),F.sy(0),F.sx(0),F.sy(2)); show(el.band,s.kind==='many');
      at(el.opt,F.sx(s.x1),F.sy(s.x2)); show(el.opt,s.kind!=='many');
      el.ttl.textContent='θ = '+fmt(th,2)+', σ = '+(s.sigma===Infinity?'∞':fmt(s.sigma,2));
      if(s.sigma===Infinity) p=[[-1,1],[0,1],[0,0],[1,0]];
      else for(k=0;k<=160;k++){ v=-1+2*k/160; p.push([v,share(s.sigma,Math.pow(10,v))]); }
      el.sh.setAttribute('d',pathOf(G,[p]));
      setLine(el.sg,G.sx(lg),G.sy(0),G.sx(lg),G.sy(1));
      at(el.sd,G.sx(lg),G.sy(s.kind==='many'?0.5:s.share));
      el.sd.setAttribute('class','mi2-opt'+(s.kind==='many'?' mi2-hollow':''));
      if(api) api.changed();
      if(!out) return;
      t='θ = '+fmt(th,2)+'   σ = 1/(1 '+MINUS+' θ) = '+(s.sigma===Infinity?'∞':fmt(s.sigma,2))+
        (isZero(th)?': Cobb Douglas':th>=1-1e-9?': perfect substitutes':'')+'\np₁/p₂ = '+fmt(s.rho,2)+': ';
      if(s.kind==='many') t+='any split of the budget is optimal';
      else if(s.sigma===Infinity) t+='all on the cheaper good, share of good 1 = '+fmt(s.share,2);
      else t+='x₁/x₂ = (p₂/p₁)^σ = '+fmt(s.ratio,2)+', share of good 1 = '+fmt(s.share,2);
      t+='\n'+(isZero(th)?'σ = 1: shares stay at one half whatever the prices':th>=1-1e-9?'σ = ∞: the whole budget jumps to the cheaper good at p₁ = p₂':th>0?'σ > 1: the share of good 1 falls as p₁ rises':'σ < 1: the share of good 1 rises with p₁');
      out.textContent=t;
    }
    api=NF.api({
      get:state,
      set:function(o){ if('th' in o && rth) rth.set(o.th); if('lg' in o && rlg) rlg.set(o.lg); update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 9. The consumer's problem: unique, a convex set, or apart ---------- */
  NF.register('mi2-optimum',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var M=12, st={p1:1,p2:1,w:8}, W=520, F, el={}, api;
    var FAM={cd:fCobb(0.5,0.5), lin:fLinear(1,1), sq:fSq()};
    var NAME={cd:'√(x₁x₂), strictly convex', lin:'x₁ + x₂, convex but not strictly', sq:'x₁² + x₂², not convex'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; update(); });
    if(!FAM[fam]) fam='cd';
    var r1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        r2=range(fig,'p2',2,function(v){ st.p2=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); });
    if(r1) st.p1=r1.v();
    if(r2) st.p2=r2.v();
    if(rw) st.w=rw.v();
    /* the best bundles in B(p, w) */
    function solve(){
      var p1=st.p1, p2=st.p2, w=st.w, A=[w/p1,0], B=[0,w/p2], eq=Math.abs(p1-p2)<1e-9, o={kind:'one'};
      if(fam==='cd') o.x=[w/(2*p1),w/(2*p2)];
      else if(fam==='lin'){ if(eq){ o.kind='many'; o.x=[A[0]/2,B[1]/2]; o.seg=[A,B]; } else o.x=p1<p2?A:B; }
      else {
        o.tan=[w*p1/(p1*p1+p2*p2),w*p2/(p1*p1+p2*p2)];
        if(eq){ o.kind='two'; o.x=A; o.alt=B; o.mid=[A[0]/2,B[1]/2]; } else o.x=p1<p2?A:B;
      }
      return o;
    }
    function state(){
      var f=FAM[fam], o=solve(), x=o.x, s={fam:fam, p1:st.p1, p2:st.p2, w:st.w, ratio:st.p1/st.p2, x1:x[0], x2:x[1], u:f.u(x[0],x[1]), nsol:o.kind};
      if(fam==='cd') s.mrs=x[1]/x[0];
      if(o.tan){ s.t1=o.tan[0]; s.t2=o.tan[1]; s.ut=f.u(o.tan[0],o.tan[1]); }
      if(o.mid) s.umid=f.u(o.mid[0],o.mid[1]);
      return s;
    }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,2);
      el.set=S('path',{'class':'mi2-set'},F.gc);
      el.icf=S('path',{'class':'mi2-icf mi2-icfd'},F.gc);
      el.tanc=S('path',{'class':'mi2-tanc'},F.gc);
      el.line=line(F.gc,0,0,0,0,'mi2-bline');
      el.ic=S('path',{'class':'mi2-ic mi2-icg'},F.gc);
      el.segm=line(F.gc,0,0,0,0,'mi2-optseg');
      el.tp=S('circle',{r:4.5,'class':'mi2-tanpt'},svg);
      el.mid=S('circle',{r:5,'class':'mi2-midpt'},svg);
      el.midl=text(svg,0,0,'','mi2-co nf-halo','start');
      el.o1=S('circle',{r:5.5,'class':'mi2-opt'},svg);
      el.o2=S('circle',{r:5.5,'class':'mi2-opt'},svg);
      el.lab=text(svg,0,0,'x*','mi2-cp nf-halo mi2-it','start');
      update();
    }
    function update(){
      if(!F) return;
      var f=FAM[fam], o=solve(), s=state(), x=o.x, i1=st.w/st.p1, i2=st.w/st.p2, d='', lv, t, lx, ly;
      el.set.setAttribute('d',poly([[F.sx(0),F.sy(0)],[F.sx(i1),F.sy(0)],[F.sx(0),F.sy(i2)]])+'Z');
      setLine(el.line,F.sx(i1),F.sy(0),F.sx(0),F.sy(i2));
      lv=fam==='cd'?[0.55*s.u,1.45*s.u]:fam==='lin'?[s.u-2,s.u-4,s.u+2,s.u+4]:[s.u*0.5,s.u*0.75,s.u*1.5];
      lv.forEach(function(c){ if(c>0) d+=pathOf(F,f.curve(c,M,M)); });
      el.icf.setAttribute('d',d);
      el.ic.setAttribute('d',pathOf(F,f.curve(s.u,M,M)));
      el.tanc.setAttribute('d',o.tan?pathOf(F,f.curve(s.ut,M,M)):'');
      if(o.seg) setLine(el.segm,F.sx(o.seg[0][0]),F.sy(o.seg[0][1]),F.sx(o.seg[1][0]),F.sy(o.seg[1][1]));
      show(el.segm,!!o.seg);
      at(el.o1,F.sx(x[0]),F.sy(x[1])); show(el.o1,o.kind!=='many');
      if(o.alt){ at(el.o2,F.sx(o.alt[0]),F.sy(o.alt[1])); show(el.o2,true); } else show(el.o2,false);
      if(o.tan && !o.mid){ at(el.tp,F.sx(o.tan[0]),F.sy(o.tan[1])); show(el.tp,true); } else show(el.tp,false);
      if(o.mid){
        at(el.mid,F.sx(o.mid[0]),F.sy(o.mid[1])); show(el.mid,true);
        el.midl.textContent='u = '+tl(Math.round(s.umid*100)/100)+' < '+tl(Math.round(s.u*100)/100);
        moveTo(el.midl,F.sx(o.mid[0])+9,F.sy(o.mid[1])-9); show(el.midl,true);
      } else { show(el.mid,false); show(el.midl,false); }
      lx=F.sx(x[0])+(x[0]>M-1.6?-26:9); ly=F.sy(x[1])+(x[1]<0.8?-9:(x[1]>M-0.8?16:-9));
      if(o.kind==='many'){ lx=F.sx(x[0])+8; ly=F.sy(x[1])-10; }
      moveTo(el.lab,lx,ly);
      if(api) api.changed();
      if(!out) return;
      t=NAME[fam]+' at p = '+pair(st.p1,st.p2,2)+', w = '+fmt(st.w,1)+'\n';
      out.textContent=t;
      if(o.kind==='many'){ add(out,'MRS = 1 = p₁/p₂: every bundle on the budget line is optimal (u = '+fmt(s.u,2)+'), a convex set of solutions'); return; }
      if(o.kind==='two'){
        add(out,'x* = '+pair(x[0],x[1],2)+' and '+pair(o.alt[0],o.alt[1],2)+', u = '+fmt(s.u,2)+'\n');
        warn(out,'their midpoint '+pair(o.mid[0],o.mid[1],2)+' has u = '+fmt(s.umid,2)+': the solution set is not convex');
        return;
      }
      t='x* = '+pair(x[0],x[1],2)+', u = '+fmt(s.u,2)+'\n';
      if(fam==='cd') t+='unique tangency: MRS = x₂/x₁ = '+fmt(s.mrs,2)+' = p₁/p₂; p·x* = w';
      else if(fam==='lin') t+='a corner: MRS = 1 '+(st.p1<st.p2?'>':'<')+' p₁/p₂ = '+fmt(s.ratio,2)+', so all on good '+(st.p1<st.p2?'1':'2');
      else t+='a corner on the cheaper good; the tangency '+pair(s.t1,s.t2,2)+' has MRS = p₁/p₂ but u = '+fmt(s.ut,2)+', the worst point on the line';
      add(out,t);
    }
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
        if('p1' in o && r1) r1.set(o.p1);
        if('p2' in o && r2) r2.set(o.p2);
        if('w' in o && rw) rw.set(o.w);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
