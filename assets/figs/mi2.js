/* Core Micro L2 figures: the budget set, contour sets and monotonicity, convexity and quasiconcavity, the gaps that
   rule out a utility for lexicographic preferences, the MRS of homothetic and quasilinear preferences, and the
   consumer's choice. Drawn with the helpers of /assets/notes.js (window.NF); colours come from /assets/figs/mi2.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg, press=NF.press,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function snap(v,s){ return Math.round(v/s)*s; }
  function tolOf(){ var m=1, i; for(i=0;i<arguments.length;i++) if(isFinite(arguments[i])) m=Math.max(m,Math.abs(arguments[i])); return 1e-9*m; }
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
    if(len<10){ setLine(v.l,x0,y0,x0,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len; bx=x1-ux*8; by=y1-uy*8;
    setLine(v.l,x0,y0,bx+ux*1.5,by+uy*1.5);
    v.h.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  function hideVec(v){ setLine(v.l,0,0,0,0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); }
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

  /* the goods plane [0,X] x [0,Y], equal units on both axes, centred, a grid line every st units */
  function goods(svg,W,X,Y,st,top){
    top=top||26;
    var side=Math.min(W-58,330), u=side/Math.max(X,Y), w=X*u, h=Y*u, x0=Math.round((W-w)/2)+8, y0=top+h, g=S('g',null,svg), i, v, t, H=y0+30;
    function sx(v){ return x0+v*u; }
    function sy(v){ return y0-v*u; }
    sx.inv=function(p){ return (p-x0)/u; };
    sy.inv=function(p){ return (y0-p)/u; };
    for(i=0;i*st<=X+1e-9;i++){ v=i*st; line(g,C(sx(v)),top,C(sx(v)),y0,v?'nf-grid':'nf-ax'); text(g,sx(v),y0+16,tl(v),null,'middle'); }
    for(i=0;i*st<=Y+1e-9;i++){ v=i*st; line(g,x0,C(sy(v)),x0+w,C(sy(v)),v?'nf-grid':'nf-ax'); if(v) text(g,x0-6,sy(v)+4,tl(v),null,'end'); }
    t=vlab(g,'x','1','nf-title'); t.setAttribute('text-anchor','start'); moveTo(t,x0+w+6,y0+4);
    t=vlab(g,'x','2','nf-title'); moveTo(t,x0,top-11);
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    return {sx:sx, sy:sy, x0:x0, y0:y0, top:top, w:w, h:h, H:H, u:u, X:X, Y:Y, gc:clip(svg,x0,top,w,h)};
  }
  /* polylines in goods units as one path in pixels */
  function pathOf(F,lines){
    var d='', i;
    for(i=0;i<lines.length;i++) if(lines[i].length>1) d+=poly(lines[i].map(function(p){ return [F.sx(p[0]),F.sy(p[1])]; }));
    return d;
  }
  /* the upper contour set {x : f(x) >= c} inside the plane, as one path: rows about 1.6 px apart, joined by
     trapezoids where the rows agree, so slanted edges stay smooth */
  function upperPath(F,f,c){
    var X=F.X, Y=F.Y, nr=Math.max(40,Math.round(F.h/1.6)), ns=Math.max(90,Math.round(F.w/2.5)), dy=Y/nr, tol=tolOf(c), d='', j, A, B, M, k;
    function ok(x,y){ return f(x,y)>=c-tol; }
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

  /* ---------- utility families: u, the level curve u = c as polylines, and the MRS u1/u2 ---------- */
  function logSpace(a,b,n){ var r=[], i; for(i=0;i<=n;i++) r.push(a*Math.pow(b/a,i/n)); return r; }
  function fLinear(a,b){
    return {u:function(x,y){ return a*x+b*y; }, mrs:function(){ return a/b; }, grad:function(){ return [a,b]; },
      curve:function(c){ return c<0?[]:[[[c/a,0],[0,c/b]]]; }};
  }
  function fMin(a,b){
    return {u:function(x,y){ return Math.min(a*x,b*y); },
      curve:function(c,X,Y){ return c<0?[]:[[[c/a,2*Y+2],[c/a,c/b],[2*X+2,c/b]]]; }};
  }
  function fBliss(cx,cy){
    return {u:function(x,y){ return -((x-cx)*(x-cx)+(y-cy)*(y-cy)); },
      curve:function(c){ var r=Math.sqrt(Math.max(0,-c)), p=[], i; if(r<1e-9) return []; for(i=0;i<=180;i++) p.push([cx+r*Math.cos(i*Math.PI/90),cy+r*Math.sin(i*Math.PI/90)]); return [p]; }};
  }
  /* every bundle with lo <= x1 + x2 <= hi is equally good: a thick indifference curve */
  function fThick(lo,hi){
    return {lo:lo, hi:hi, u:function(x,y){ var s=x+y; return s<lo?s:s>hi?s-(hi-lo):lo; },
      curve:function(c){ var s=c<lo?c:c>lo?c+(hi-lo):null; return s===null?[]:[[[s,0],[0,s]]]; }};
  }
  function fSqrt(){
    return {u:function(x,y){ return Math.sqrt(x)+Math.sqrt(y); },
      curve:function(c){ var p=[], i, s; if(c<=0) return []; for(i=0;i<=160;i++){ s=c*i/160; p.push([s*s,(c-s)*(c-s)]); } return [p]; }};
  }
  function fSq(){
    return {u:function(x,y){ return x*x+y*y; }, mrs:function(x,y){ return y>0?x/y:Infinity; }, grad:function(x,y){ return [2*x,2*y]; },
      curve:function(c){ var r=Math.sqrt(Math.max(0,c)), p=[], i; if(r<1e-9) return []; for(i=0;i<=120;i++) p.push([r*Math.cos(i*Math.PI/240),r*Math.sin(i*Math.PI/240)]); return [p]; }};
  }
  /* x1^a x2^b; for a = b = 1/2 this is the square root of x1 x2 */
  function fCobb(a,b){
    return {u:function(x,y){ return Math.pow(x,a)*Math.pow(y,b); }, mrs:function(x,y){ return x>0?a*y/(b*x):Infinity; },
      grad:function(x,y){ return [a*Math.pow(x,a-1)*Math.pow(y,b),b*Math.pow(x,a)*Math.pow(y,b-1)]; },
      curve:function(c,X,Y){
        if(c<=0) return [];
        var xs=logSpace(Math.pow(c/Math.pow(1.4*Y,b),1/a),1.4*X,240);
        return [xs.map(function(x){ return [x,Math.pow(c/Math.pow(x,a),1/b)]; })];
      }};
  }
  /* x1 + v(x2): kind 'sqrt' is v = k sqrt(x2), kind 'log' is v = k ln x2 */
  function fQuasi(kind,k){
    var v=kind==='log'?function(y){ return k*Math.log(y); }:function(y){ return k*Math.sqrt(y); },
        vp=kind==='log'?function(y){ return k/y; }:function(y){ return k/(2*Math.sqrt(y)); };
    return {u:function(x,y){ return x+v(y); }, mrs:function(x,y){ return 1/vp(y); }, grad:function(x,y){ return [1,vp(y)]; },
      curve:function(c,X,Y){
        var ys, top, lo;
        if(kind==='log'){ lo=Math.exp((c-1.4*X)/k); top=Math.min(1.4*Y,Math.exp(c/k)); if(top<=lo) return []; ys=logSpace(lo,top,240); }
        else { if(c<0) return []; top=Math.min(1.4*Y,(c/k)*(c/k)); ys=[]; for(var i=0;i<=200;i++) ys.push(top*i*i/40000); }
        return [ys.map(function(y){ return [c-v(y),y]; })];
      }};
  }

  /* ---------- 1. The budget set ---------- */
  NF.register('mi2-budget',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var X0=[4,1.5], X=X0.slice(), st={p1:1,p2:2,w:8}, M=12, W=520, F, el={}, hs=[], api;
    var r1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        r2=range(fig,'p2',2,function(v){ st.p2=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); });
    if(r1) st.p1=r1.v();
    if(r2) st.p2=r2.v();
    if(rw) st.w=rw.v();
    function put(x,y){ X=[clamp(snap(x,0.25),0,M),clamp(snap(y,0.25),0,M)]; }
    /* moves the sliders as a person would; each move redraws */
    function setP(o){
      if('p1' in o){ if(r1) r1.set(o.p1); else st.p1=+o.p1; }
      if('p2' in o){ if(r2) r2.set(o.p2); else st.p2=+o.p2; }
      if('w' in o){ if(rw) rw.set(o.w); else st.w=+o.w; }
    }
    onClick(fig,'.nfig-reset',function(){ X=X0.slice(); setP({p1:1,p2:2,w:8}); update(); });
    onClick(fig,'.mi2-dbl',function(){ setP({p1:st.p1*2,p2:st.p2*2,w:st.w*2}); });
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,2);
      el.set=S('path',{'class':'mi2-set'},F.gc);
      el.ref=line(F.gc,0,0,0,0,'mi2-ref');
      el.line=line(F.gc,0,0,0,0,'mi2-bline');
      el.lab=vlab(svg,'x','','mi2-cp nf-halo');
      hs=[handle(svg,'mi2-kp','Bundle x, arrow keys move it',function(dx,dy){ put(X[0]+dx*0.25,X[1]+dy*0.25); update(); })];
      update();
    }
    function state(){
      var i1=st.w/st.p1, i2=st.w/st.p2, cost=st.p1*X[0]+st.p2*X[1];
      return {p1:st.p1, p2:st.p2, w:st.w, i1:i1, i2:i2, sl:-st.p1/st.p2, ratio:st.p1/st.p2, x1:X[0], x2:X[1], cost:cost,
        aff:cost<=st.w+tolOf(st.w), start:Math.abs(i1-8)<1e-9 && Math.abs(i2-4)<1e-9};
    }
    function update(){
      if(!F) return;
      var s=state(), px=F.sx(X[0]), py=F.sy(X[1]), t;
      el.set.setAttribute('d',poly([[F.sx(0),F.sy(0)],[F.sx(s.i1),F.sy(0)],[F.sx(0),F.sy(s.i2)]])+'Z');
      setLine(el.line,F.sx(s.i1),F.sy(0),F.sx(0),F.sy(s.i2));
      setLine(el.ref,F.sx(8),F.sy(0),F.sx(0),F.sy(4));
      place(hs[0],px,py,'x = ('+tl(X[0])+', '+tl(X[1])+')');
      moveTo(el.lab,px+(X[0]>M-1.2?-14:13),py-10);
      if(api) api.changed();
      if(!out) return;
      t='p = '+pair(s.p1,s.p2,2)+'   w = '+fmt(s.w,1)+'   w/p₁ = '+fmt(s.i1,2)+'   w/p₂ = '+fmt(s.i2,2)+'   slope '+MINUS+'p₁/p₂ = '+fmt(s.sl,2)+
        '\nx = '+pair(X[0],X[1],2)+'   p·x = '+fmt(s.cost,2)+(s.aff?' ≤ w: affordable':'');
      out.textContent=t;
      if(!s.aff) warn(out,' > w: not affordable');
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])]]; },
      function(i,x,y){ put(F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read prices, wealth, the intercepts and the bundle's cost, and can move the sliders and the bundle */
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

  /* ---------- 2. Contour sets and monotonicity ---------- */
  NF.register('mi2-prefs',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var FAM={min:fMin(1,1), sum:fLinear(1,1), bliss:fBliss(4,4), thick:fThick(3,5)}, M=8, X=[2,5], W=520, F, el={}, hs=[], api, i;
    var LEV={min:[1,2,3,4,5,6,7], sum:[], bliss:[-1,-4,-9,-16,-25], thick:[1,2,4,5,6,7,8,9,10,11,12,13]};
    for(i=1;i<=15;i++) LEV.sum.push(i);
    var VERD={min:'min{x₁, x₂}: weakly monotone but not strongly; locally nonsatiated everywhere',
      sum:'x₁ + x₂: strongly monotone, so weakly monotone and locally nonsatiated',
      bliss:'bliss point (4, 4): not monotone; locally nonsatiated everywhere except at (4, 4)',
      thick:'thick: every bundle with 3 ≤ x₁ + x₂ ≤ 5 is equally good, so local nonsatiation fails inside the band'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; draw(); });
    if(!FAM[fam]) fam='min';
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
      if(fam==='bliss'){ S('circle',{cx:R(F.sx(4)),cy:R(F.sy(4)),r:2.5,'class':'mi2-bliss'},F.gc); }
      el.a1=vec(svg,'mi2-same'); el.a2=vec(svg,'mi2-same');
      el.lab=vlab(svg,'x','','mi2-cp nf-halo');
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
    function state(){
      var f=FAM[fam], s=X[0]+X[1];
      return {fam:fam, x1:X[0], x2:X[1], u:f.u(X[0],X[1]), e1:step(1,0), diag:step(1,1), lns:lns(), band:fam==='thick' && s>=3-1e-9 && s<=5+1e-9};
    }
    function cls(v){ return v==='better'?'mi2-good':v==='worse'?'mi2-bad':'mi2-same'; }
    function update(){
      if(!F) return;
      var f=FAM[fam], s=state(), px=F.sx(X[0]), py=F.sy(X[1]), L=0.8*F.u, t, word;
      el.up.setAttribute('d',upperPath(F,f.u,s.u));
      if(s.band){ el.band.setAttribute('d',poly([[F.sx(3),F.sy(0)],[F.sx(5),F.sy(0)],[F.sx(0),F.sy(5)],[F.sx(0),F.sy(3)]])+'Z'); el.ic.setAttribute('d',''); }
      else { el.band.setAttribute('d',''); el.ic.setAttribute('d',pathOf(F,f.curve(s.u,M,M))); }
      setVec(el.a1,px,py,px+L,py,cls(s.e1));
      setVec(el.a2,px,py,px+L*0.7071,py-L*0.7071,cls(s.diag));
      place(hs[0],px,py,'x = ('+tl(X[0])+', '+tl(X[1])+')');
      moveTo(el.lab,px-12,py+(X[1]<0.6?-10:17));
      if(api) api.changed();
      if(!out) return;
      word=function(v){ return v==='better'?'better':v==='worse'?'worse':'no better'; };
      t='x = '+pair(X[0],X[1],2)+'   u(x) = '+fmt(s.u,2)+
        '\na little more good 1: '+word(s.e1)+'   a little more of both: '+word(s.diag)+'   a better bundle nearby: '+(s.lns?'yes':'no');
      out.textContent=t+'\n';
      if(!s.lns) warn(out,'no bundle close to x is better: local nonsatiation fails here\n');
      out.appendChild(document.createTextNode(VERD[fam]));
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])]]; },
      function(i,x,y){ put(F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read the family, the bundle, the two small steps and local nonsatiation, and can set them */
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
        if('x1' in o || 'x2' in o){ put('x1' in o?+o.x1:X[0],'x2' in o?+o.x2:X[1]); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Convexity: is the mixture at least as good? ---------- */
  NF.register('mi2-convex',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var FAM={sqrt:fSqrt(), min:fMin(1,1), sq:fSq()}, M=10, Y0=[8,2], Z0=[2,6], P=[Y0.slice(),Z0.slice()], lam=0.5, W=520, F, el={}, hs=[], api;
    var NAME={sqrt:'√x₁ + √x₂', min:'min{x₁, x₂}', sq:'x₁² + x₂²'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; draw(); });
    if(!FAM[fam]) fam='sqrt';
    var rep=seg(fig,'data-rep',function(v){ if(v===rep) return; rep=v; update(); });
    if(rep!=='u4') rep='u';
    var rl=range(fig,'lam',2,function(v){ lam=v; update(); });
    if(rl) lam=rl.v();
    function put(i,x,y){ P[i]=[clamp(snap(x,0.5),0,M),clamp(snap(y,0.5),0,M)]; }
    function base(x,y){ return FAM[fam].u(x,y); }
    /* the representation in use: u, or u to the fourth power (the same preferences, since u >= 0) */
    function val(x,y){ var v=base(x,y); return rep==='u4'?v*v*v*v:v; }
    function mix(){ return [lam*P[0][0]+(1-lam)*P[1][0],lam*P[0][1]+(1-lam)*P[1][1]]; }
    function draw(){
      var i;
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,2);
      el.up=S('path',{'class':'mi2-up'},F.gc);
      el.ic=[S('path',{'class':'mi2-ic'},F.gc),S('path',{'class':'mi2-ic mi2-ic2'},F.gc)];
      el.chord=line(F.gc,0,0,0,0,'mi2-chord');
      el.m=S('circle',{r:5,'class':'mi2-mix'},svg);
      el.lab=[vlab(svg,'y','','mi2-cb nf-halo'),vlab(svg,'z','','mi2-cg nf-halo'),vlab(svg,'m','','mi2-cp nf-halo')];
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,i?'mi2-kg':'mi2-kb','Bundle '+(i?'z':'y')+', arrow keys move it',keyer(i)));
      update();
    }
    function keyer(i){ return function(dx,dy){ put(i,P[i][0]+dx*0.5,P[i][1]+dy*0.5); update(); }; }
    function state(){
      var m=mix(), uy=val(P[0][0],P[0][1]), uz=val(P[1][0],P[1][1]), um=val(m[0],m[1]), mn=Math.min(uy,uz), avg=lam*uy+(1-lam)*uz, t=tolOf(uy,uz,um);
      return {fam:fam, rep:rep, lam:lam, y1:P[0][0], y2:P[0][1], z1:P[1][0], z2:P[1][1], m1:m[0], m2:m[1], uy:uy, uz:uz, um:um, mn:mn, avg:avg,
        qc:um>=mn-t, concave:um>=avg-t, better:um>mn+t, same:Math.abs(um-mn)<=t, worse:um<mn-t, tie:Math.abs(uy-uz)<=t,
        gap:Math.hypot(P[0][0]-P[1][0],P[0][1]-P[1][1])};
    }
    function update(){
      if(!F) return;
      var f=FAM[fam], s=state(), m=[s.m1,s.m2], by=base(P[0][0],P[0][1]), bz=base(P[1][0],P[1][1]), i, T, t;
      el.up.setAttribute('d',upperPath(F,f.u,Math.min(by,bz)));
      el.ic[0].setAttribute('d',pathOf(F,f.curve(by,M,M)));
      el.ic[1].setAttribute('d',Math.abs(by-bz)<tolOf(by,bz)?'':pathOf(F,f.curve(bz,M,M)));
      setLine(el.chord,F.sx(P[0][0]),F.sy(P[0][1]),F.sx(P[1][0]),F.sy(P[1][1]));
      at(el.m,F.sx(m[0]),F.sy(m[1]));
      for(i=0;i<2;i++){
        T=[F.sx(P[i][0]),F.sy(P[i][1])];
        place(hs[i],T[0],T[1],(i?'z':'y')+' = ('+tl(P[i][0])+', '+tl(P[i][1])+')');
        moveTo(el.lab[i],T[0]+(P[i][0]>M-1?-13:13),T[1]-10);
      }
      moveTo(el.lab[2],F.sx(m[0])-12,F.sy(m[1])+(m[1]<0.8?-9:17));
      if(api) api.changed();
      if(!out) return;
      var U=rep==='u4'?'u⁴':'u', d=rep==='u4'?1:2;
      t=U+'(y) = '+fmt(s.uy,d)+'   '+U+'(z) = '+fmt(s.uz,d)+'   '+U+'(m) = '+fmt(s.um,d)+' at λ = '+fmt(lam,2)+'\n';
      out.textContent=t;
      if(s.worse) warn(out,'m is worse than both y and z: the quasiconcavity test fails, so '+NAME[fam]+' is not convex');
      else out.appendChild(document.createTextNode((s.better?'m is strictly better than the worse of y and z':'m is exactly as good as the worse of y and z')+': the quasiconcavity test passes'));
      out.appendChild(document.createTextNode('\n'+U+'(m) '+(s.concave?'≥':'<')+' λ'+U+'(y) + (1 '+MINUS+' λ)'+U+'(z) = '+fmt(s.avg,d)+': the concavity test '+(s.concave?'passes':'fails')));
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return P.map(function(p){ return [F.sx(p[0]),F.sy(p[1])]; }); },
      function(i,x,y){ put(i,F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read both bundles, the mixture, the two tests and the representation, and can set all of them */
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
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

  /* ---------- 4. Lexicographic preferences: one utility interval per slice ---------- */
  /* the fraction with the smallest denominator strictly inside (lo, hi) */
  function simplest(lo,hi){
    for(var q=1;q<=5000;q++){ var p=Math.floor(lo*q+1e-12)+1; if(p/q<hi-1e-12) return [p,q]; }
    return [Math.round((lo+hi)/2*5000),5000];
  }
  NF.register('mi2-lex',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var k=4, W=520, H=330, L={}, el={}, api;
    var rk=range(fig,'k',0,function(v){ k=Math.round(v); update(); });
    if(rk) k=Math.round(rk.v());
    var nstr=seg(fig,'data-n',function(v){ if(v===nstr) return; nstr=v; draw(); });
    function n(){ var v=parseInt(nstr,10); return v>1?v:11; }
    function draw(){
      var g, pw, ph, x0, t, i;
      W=measure(svg);
      pw=Math.min(W-56,470); ph=Math.max(110,Math.round(pw*0.4)); x0=Math.round((W-pw)/2)+6;
      L={x0:x0, pw:pw, top:16, ph:ph}; L.bot=L.top+ph; L.axis=L.bot+104; H=L.axis+30;
      frame(svg,W,H);
      g=S('g',null,svg);
      /* top: the unit square of bundles */
      S('rect',{x:x0,y:L.top,width:pw,height:ph,'class':'mi2-frame'},g);
      for(i=0;i<=2;i++){ t=x0+pw*i/2; line(g,C(t),L.bot,C(t),L.bot+4,'nf-ax'); text(g,t,L.bot+16,['0','0.5','1'][i],null,'middle'); }
      text(g,x0-6,L.bot+4,'0',null,'end'); text(g,x0-6,L.top+8,'1',null,'end');
      t=vlab(g,'x','1','nf-title'); t.setAttribute('text-anchor','start'); moveTo(t,x0+pw+6,L.bot+4);
      t=vlab(g,'x','2','nf-title'); t.setAttribute('text-anchor','end'); moveTo(t,x0-6,L.top+ph/2+4);
      el.gc=clip(svg,x0,L.top,pw,ph);
      el.lexup=S('path',{'class':'mi2-lexup'},el.gc);
      el.wedge=S('path',{'class':'mi2-wedge'},el.gc);
      el.slices=S('path',{'class':'mi2-slice'},el.gc);
      el.mid=line(el.gc,0,0,0,0,'mi2-midslice');
      el.kline=line(el.gc,0,0,0,0,'mi2-kline');
      el.P=S('circle',{r:4,'class':'mi2-pt'},svg);
      el.Q=S('circle',{r:4,'class':'mi2-pt'},svg);
      el.Pl=text(svg,0,0,'(0.5, 0)','nf-lab nf-halo','start');
      el.Ql=text(svg,0,0,'','nf-lab nf-halo','end');
      /* bottom: the utility axis with the interval each slice fills */
      el.ag=S('g',null,svg);
      line(svg,x0,C(L.axis),x0+pw,C(L.axis),'nf-ax');
      text(svg,x0,L.axis-50,'below: the interval of utility I(a) each slice fills','nf-title','start');
      t=text(svg,x0+pw+6,L.axis+4,'u','nf-title mi2-it','start');
      el.bars=S('g',null,svg);
      update();
    }
    function state(){
      var N=n(), d=1/(N-1), ik=1/k, ok=d>ik+1e-12, q=simplest(0.5,0.5+ik), a, i, seen={}, distinct=0, r;
      for(i=0;i<N;i++){ a=i*d; r=simplest(a,a+ik); if(!seen[r[0]+'/'+r[1]]){ seen[r[0]+'/'+r[1]]=1; distinct++; } }
      return {n:N, k:k, d:d, ik:ik, ok:ok, clash:ok?0:N-1, lo:0.5, hi:0.5+ik, q:q[0]+'/'+q[1], qv:q[0]/q[1], distinct:distinct};
    }
    function update(){
      if(!L.pw) return;
      var s=state(), N=s.n, x0=L.x0, pw=L.pw, sx=function(v){ return x0+v*pw; }, sy=function(v){ return L.bot-v*L.ph; },
          d='', i, a, U=1+s.ik, bx=function(v){ return x0+v/U*pw; }, b, r, row, qa=0.5-s.d, tick, tv, t, uq, up;
      el.lexup.setAttribute('d',poly([[sx(0.5),sy(0)],[sx(1),sy(0)],[sx(1),sy(1)],[sx(0.5),sy(1)]])+'Z');
      el.wedge.setAttribute('d',poly([[sx(0.5),sy(0)],[sx(0.5),sy(1)],[sx(0.5-s.ik),sy(1)]])+'Z');
      for(i=0;i<N;i++){ a=i*s.d; d+='M'+R(sx(a))+','+R(sy(0))+'V'+R(sy(1)); }
      el.slices.setAttribute('d',d);
      el.slices.setAttribute('class',s.ok?'mi2-slice':'mi2-slice mi2-clash');
      setLine(el.mid,sx(0.5),sy(0),sx(0.5),sy(1));
      setLine(el.kline,sx(0.5),sy(0),sx(0.5-s.ik),sy(1));
      at(el.P,sx(0.5),sy(0)); at(el.Q,sx(qa),sy(1));
      el.Q.setAttribute('class',s.ok?'mi2-pt':'mi2-pt mi2-ptbad');
      moveTo(el.Pl,sx(0.5)+7,sy(0)-6);
      el.Ql.textContent='('+fmt(qa,2)+', 1)'; moveTo(el.Ql,sx(qa)-7,sy(1)+14);
      /* axis ticks at 0, 0.5, 1 and the top end */
      while(el.ag.firstChild) el.ag.removeChild(el.ag.firstChild);
      tick=[0,0.5,1];
      for(i=0;i<tick.length;i++){ tv=tick[i]; line(el.ag,C(bx(tv)),L.axis,C(bx(tv)),L.axis+4,'nf-ax'); text(el.ag,bx(tv),L.axis+16,tl(tv),null,'middle'); }
      if(bx(U)-bx(1)>34){ line(el.ag,C(bx(U)),L.axis,C(bx(U)),L.axis+4,'nf-ax'); text(el.ag,bx(U),L.axis+16,fmt(U,2),null,'middle'); }
      while(el.bars.firstChild) el.bars.removeChild(el.bars.firstChild);
      for(i=0;i<N;i++){
        a=i*s.d; row=i%2; b=L.axis-34+row*14;
        S('rect',{x:R(bx(a)),y:b,width:R(Math.max(1.2,bx(a+s.ik)-bx(a))),height:7,'class':s.ok?'mi2-bar':'mi2-bar mi2-clash'},el.bars);
        if(N<=21){ r=simplest(a,a+s.ik); S('circle',{cx:R(bx(r[0]/r[1])),cy:b+3.5,r:1.8,'class':'mi2-q'},el.bars); }
      }
      if(api) api.changed();
      if(!out) return;
      uq=qa+s.ik; up=0.5;
      t='u(x) = x₁ + x₂/k with k = '+k+': the slice x₁ = a fills I(a) = (a, a + '+fmt(s.ik,3)+'); the '+N+' slices are '+fmt(s.d,2)+' apart\n';
      out.textContent=t;
      if(s.ok) out.appendChild(document.createTextNode('no overlap: on these '+N+' slices u ranks every pair as lexicographic does; I(0.5) holds the rational '+s.q));
      else warn(out,'overlap: u('+fmt(qa,2)+', 1) = '+fmt(uq,3)+(Math.abs(uq-up)<1e-12?' = ':' > ')+'u(0.5, 0) = 0.500, yet lexicographic ranks (0.5, 0) strictly above ('+fmt(qa,2)+', 1)');
    }
    /* the Try it steps read k, the number of slices, the spacing against 1/k and the interval of the slice at 0.5 */
    api=NF.api({
      get:state,
      set:function(o){
        if('n' in o) press(fig,'data-n',String(o.n));
        if('k' in o && rk) rk.set(o.k);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. The MRS along rays and along good 1: homothetic against quasilinear ---------- */
  NF.register('mi2-mrs',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var FAM={cd:fCobb(0.5,0.5), ql:fQuasi('sqrt',2), sub:fLinear(1,2)}, M=10, X=[2,4], al=1.5, tt=2, W=520, F, el={}, hs=[], api;
    var NAME={cd:'√(x₁x₂), Cobb Douglas', ql:'x₁ + 2√x₂, quasilinear in good 1', sub:'x₁ + 2x₂, perfect substitutes'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; update(); });
    if(!FAM[fam]) fam='cd';
    var ra=range(fig,'al',2,function(v){ al=v; update(); }), rt=range(fig,'t',2,function(v){ tt=v; update(); });
    if(ra) al=ra.v();
    if(rt) tt=rt.v();
    function put(x,y){ X=[clamp(snap(x,0.25),0.25,M),clamp(snap(y,0.25),0.25,M)]; }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,2);
      el.ray=line(F.gc,0,0,0,0,'mi2-guide');
      el.hor=line(F.gc,0,0,0,0,'mi2-guide');
      el.ic=[S('path',{'class':'mi2-icm'},F.gc),S('path',{'class':'mi2-icm mi2-icp'},F.gc),S('path',{'class':'mi2-icm mi2-icg'},F.gc)];
      el.tan=[line(svg,0,0,0,0,'mi2-tan'),line(svg,0,0,0,0,'mi2-tan mi2-tanp'),line(svg,0,0,0,0,'mi2-tan mi2-tang')];
      el.pa=S('circle',{r:4.5,'class':'mi2-dotp'},svg);
      el.pt=S('circle',{r:4.5,'class':'mi2-dotg'},svg);
      el.lab=[vlab(svg,'x','','mi2-cb nf-halo'),vlab(svg,'αx','','mi2-cp nf-halo'),vlab(svg,'x + te','1','mi2-cg nf-halo')];
      hs=[handle(svg,'mi2-kb','Bundle x, arrow keys move it',function(dx,dy){ put(X[0]+dx*0.25,X[1]+dy*0.25); update(); })];
      update();
    }
    function inside(p){ return p[0]>=0.05 && p[1]>=0.05 && p[0]<=M+1e-9 && p[1]<=M+1e-9; }
    function state(){
      var f=FAM[fam], A=[al*X[0],al*X[1]], T=[X[0]+tt,X[1]], o={fam:fam, x1:X[0], x2:X[1], al:al, t:tt, m0:f.mrs(X[0],X[1]), ax1:A[0], ax2:A[1], sx1:T[0]};
      o.ma=f.mrs(A[0],A[1]);
      o.mt=T[0]>0?f.mrs(T[0],T[1]):'none';
      return o;
    }
    /* a short piece of the tangent line through p with slope -m, half length r px */
    function tangent(e,p,m,r){
      var dx=1, dy=-m, n=Math.hypot(dx,dy), cx=F.sx(p[0]), cy=F.sy(p[1]);
      dx/=n; dy/=n;
      setLine(e,cx-dx*r,cy+dy*r,cx+dx*r,cy-dy*r);
    }
    function update(){
      if(!F) return;
      var f=FAM[fam], s=state(), pts=[X,[s.ax1,s.ax2],[s.sx1,X[1]]], ms=[s.m0,s.ma,s.mt], i, ok, r=Math.min(26,F.u*1.1), far, t;
      far=M*2/Math.max(X[0],X[1]);
      setLine(el.ray,F.sx(0),F.sy(0),F.sx(X[0]*far),F.sy(X[1]*far));
      setLine(el.hor,F.sx(0),F.sy(X[1]),F.sx(M),F.sy(X[1]));
      for(i=0;i<3;i++){
        ok=inside(pts[i]) && typeof ms[i]==='number';
        el.ic[i].setAttribute('d',ok?pathOf(F,f.curve(f.u(pts[i][0],pts[i][1]),M,M)):'');
        if(ok) tangent(el.tan[i],pts[i],ms[i],r); else setLine(el.tan[i],0,0,0,0);
        el.tan[i].setAttribute('visibility',ok?'visible':'hidden');
        el.lab[i].setAttribute('visibility',ok?'visible':'hidden');
        if(i===1){ el.pa.setAttribute('r',ok?4.5:0); if(ok) at(el.pa,F.sx(pts[1][0]),F.sy(pts[1][1])); }
        if(i===2){ el.pt.setAttribute('r',ok?4.5:0); if(ok) at(el.pt,F.sx(pts[2][0]),F.sy(pts[2][1])); }
        if(i===2) el.lab[2].setAttribute('text-anchor','end');
        if(ok) moveTo(el.lab[i],F.sx(pts[i][0])+(i===2?-8:(pts[i][0]>M-1.5?-16:16)),F.sy(pts[i][1])+(i===2?18:-9));
      }
      place(hs[0],F.sx(X[0]),F.sy(X[1]),'x = ('+tl(X[0])+', '+tl(X[1])+')');
      if(api) api.changed();
      if(!out) return;
      t=NAME[fam]+'\nx = '+pair(X[0],X[1],2)+': MRS = u₁/u₂ = '+fmt(s.m0,2)+
        '\nαx = '+pair(s.ax1,s.ax2,2)+': MRS = '+fmt(s.ma,2)+(inside(pts[1])?'':' (off the plot)')+
        '   x + te₁ = '+pair(s.sx1,X[1],2)+': '+(typeof s.mt==='number'?'MRS = '+fmt(s.mt,2)+(inside(pts[2])?'':' (off the plot)'):'outside the consumption set');
      out.textContent=t;
    }
    dragger(svg,function(){ return [W,F.H]; },function(){ return [[F.sx(X[0]),F.sy(X[1])]]; },
      function(i,x,y){ put(F.sx.inv(x),F.sy.inv(y)); update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read the MRS at x, at alpha x and at x + t e1, and can set the family, x, alpha and t */
    api=NF.api({
      get:state,
      set:function(o){
        if('fam' in o) press(fig,'data-fam',o.fam);
        if('x1' in o || 'x2' in o) put('x1' in o?+o.x1:X[0],'x2' in o?+o.x2:X[1]);
        if('al' in o && ra) ra.set(o.al);
        if('t' in o && rt) rt.set(o.t);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. The consumer's choice ---------- */
  NF.register('mi2-choice',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var M=12, st={p1:1,p2:1,w:9}, W=520, F, el={}, api;
    var FAM={cd:fCobb(1,2), sub:fLinear(1,2), min:fMin(1,1), sq:fSq(), ql:fQuasi('log',4)};
    var NAME={cd:'x₁x₂²', sub:'x₁ + 2x₂', min:'min{x₁, x₂}', sq:'x₁² + x₂²', ql:'x₁ + 4 ln x₂'};
    var fam=seg(fig,'data-fam',function(v){ if(!FAM[v]||v===fam) return; fam=v; update(); });
    if(!FAM[fam]) fam='cd';
    var r1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        r2=range(fig,'p2',2,function(v){ st.p2=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); });
    if(r1) st.p1=r1.v();
    if(r2) st.p2=r2.v();
    if(rw) st.w=rw.v();
    /* the best bundles in B(p, w), from each family's own first order or corner conditions */
    function solve(){
      var p1=st.p1, p2=st.p2, w=st.w, A=[w/p1,0], B=[0,w/p2], o={kind:'one', corner:false};
      if(fam==='cd'){ o.x=[w/(3*p1),2*w/(3*p2)]; }
      else if(fam==='sub'){
        if(Math.abs(p2-2*p1)<1e-9){ o.kind='many'; o.x=[A[0]/2,B[1]/2]; o.seg=[A,B]; }
        else { o.x=p2>2*p1?A:B; o.corner=true; }
      }
      else if(fam==='min'){ o.x=[w/(p1+p2),w/(p1+p2)]; }
      else if(fam==='sq'){
        o.tan=[w*p1/(p1*p1+p2*p2),w*p2/(p1*p1+p2*p2)];
        if(Math.abs(p1-p2)<1e-9){ o.kind='two'; o.x=A; o.alt=B; }
        else o.x=p1<p2?A:B;
        o.corner=true;
      }
      else {
        if(w>4*p1+1e-9) o.x=[w/p1-4,4*p1/p2];
        else { o.x=B; o.corner=true; }
      }
      return o;
    }
    function state(){
      var f=FAM[fam], o=solve(), x=o.x, s={fam:fam, p1:st.p1, p2:st.p2, w:st.w, ratio:st.p1/st.p2, x1:x[0], x2:x[1], u:f.u(x[0],x[1]),
        nsol:o.kind, corner:o.corner}, g;
      if(f.grad && fam!=='min'){ g=f.grad(x[0],x[1]); s.b1=g[0]/st.p1; s.b2=g[1]/st.p2; }
      if(f.mrs) s.mrs=f.mrs(x[0],x[1]);
      /* utility at the tangency, the point of the budget line where MRS = p1/p2, or none when there is no such point */
      if(o.tan){ s.t1=o.tan[0]; s.t2=o.tan[1]; s.ut=f.u(o.tan[0],o.tan[1]); }
      else s.ut=(fam==='cd' || fam==='ql' && !o.corner || o.kind==='many')?s.u:'none';
      return s;
    }
    function draw(){
      W=measure(svg); frame(svg,W,300);
      F=goods(svg,W,M,M,2);
      el.set=S('path',{'class':'mi2-set'},F.gc);
      el.icf=S('path',{'class':'mi2-icf'},F.gc);
      el.tanc=S('path',{'class':'mi2-tanc'},F.gc);
      el.line=line(F.gc,0,0,0,0,'mi2-bline');
      el.ic=S('path',{'class':'mi2-ic'},F.gc);
      el.segm=line(F.gc,0,0,0,0,'mi2-optseg');
      el.tp=S('circle',{r:0,'class':'mi2-tanpt'},svg);
      el.o1=S('circle',{r:5.5,'class':'mi2-opt'},svg);
      el.o2=S('circle',{r:0,'class':'mi2-opt'},svg);
      el.lab=text(svg,0,0,'x*','mi2-cp nf-halo mi2-it','start');
      update();
    }
    function update(){
      if(!F) return;
      var f=FAM[fam], o=solve(), s=state(), x=o.x, i1=st.w/st.p1, i2=st.w/st.p2, d='', lv, t, lx, ly;
      el.set.setAttribute('d',poly([[F.sx(0),F.sy(0)],[F.sx(i1),F.sy(0)],[F.sx(0),F.sy(i2)]])+'Z');
      setLine(el.line,F.sx(i1),F.sy(0),F.sx(0),F.sy(i2));
      lv=[f.u(0.55*x[0],0.55*x[1]),f.u(1.45*x[0],1.45*x[1])];
      if(fam==='sub' || fam==='sq' || fam==='ql' || x[0]>0 && x[1]>0) lv.forEach(function(c){ d+=pathOf(F,f.curve(c,M,M)); });
      el.icf.setAttribute('d',d);
      el.ic.setAttribute('d',pathOf(F,f.curve(s.u,M,M)));
      el.tanc.setAttribute('d',o.tan?pathOf(F,f.curve(s.ut,M,M)):'');
      if(o.seg) setLine(el.segm,F.sx(o.seg[0][0]),F.sy(o.seg[0][1]),F.sx(o.seg[1][0]),F.sy(o.seg[1][1])); else setLine(el.segm,0,0,0,0);
      el.segm.setAttribute('visibility',o.seg?'visible':'hidden');
      at(el.o1,F.sx(x[0]),F.sy(x[1]));
      if(o.alt){ el.o2.setAttribute('r',5.5); at(el.o2,F.sx(o.alt[0]),F.sy(o.alt[1])); } else el.o2.setAttribute('r',0);
      if(o.tan){ el.tp.setAttribute('r',4.5); at(el.tp,F.sx(o.tan[0]),F.sy(o.tan[1])); } else el.tp.setAttribute('r',0);
      lx=F.sx(x[0])+(x[0]>M-1.6?-26:9); ly=F.sy(x[1])+(x[1]<0.8?-9:(x[1]>M-0.8?16:-9));
      moveTo(el.lab,lx,ly);
      if(api) api.changed();
      if(!out) return;
      t=NAME[fam]+' at p = '+pair(st.p1,st.p2,2)+', w = '+fmt(st.w,1)+'\n';
      out.textContent=t;
      if(o.kind==='many'){ out.appendChild(document.createTextNode('every bundle on the budget line is optimal (u = '+fmt(s.u,2)+'): u₁/p₁ = '+fmt(s.b1,2)+' = u₂/p₂ = '+fmt(s.b2,2)+'. A convex set of solutions, not one')); return; }
      if(o.kind==='two'){ out.appendChild(document.createTextNode('x* = '+pair(x[0],x[1],2)+' and '+pair(o.alt[0],o.alt[1],2)+', u = '+fmt(s.u,2)+'\n')); warn(out,'the tangency '+pair(s.t1,s.t2,2)+' has MRS = p₁/p₂ but u = '+fmt(s.ut,2)+': the worst point on the line'); return; }
      t='x* = '+pair(x[0],x[1],2)+', u = '+fmt(s.u,2)+'\n';
      if(fam==='cd') t+='tangency: MRS = x₂/(2x₁) = '+fmt(s.mrs,2)+' = p₁/p₂; budget shares 1/3 and 2/3';
      else if(fam==='sub') t+='corner: per pound, good 1 gives u₁/p₁ = '+fmt(s.b1,2)+' and good 2 gives u₂/p₂ = '+fmt(s.b2,2);
      else if(fam==='min') t+='the kink: no MRS there, and x₁ = x₂ = w/(p₁ + p₂)';
      else if(fam==='sq') t+='corner: all on the cheaper good; the tangency '+pair(s.t1,s.t2,2)+' gives only u = '+fmt(s.ut,2);
      else t+=o.corner?'corner: w ≤ 4p₁, so every pound goes to good 2 (MRS = x₂/4 = '+fmt(s.mrs,2)+' < p₁/p₂ = '+fmt(s.ratio,2)+')':'tangency: MRS = x₂/4 = '+fmt(s.mrs,2)+' = p₁/p₂, so x₂ = 4p₁/p₂ whatever w is';
      out.appendChild(document.createTextNode(t));
    }
    /* the Try it steps read the optimum, how many there are, corners and the marginal utility per pound, and can set
       the family, prices and wealth */
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
