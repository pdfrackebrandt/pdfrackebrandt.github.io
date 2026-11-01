/* L3 figures: projection onto a line, rank and the reach of Ac = b, volume in three dimensions,
   quadratic forms and definiteness, the least squares bowl.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/l3.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, mulberry32=NF.mulberry32,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  /* arrow from (x0,y0) to (x1,y1); the head stops gap px short of the tip so a handle there stays visible */
  function setVec(v,x0,y0,x1,y1,gap){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by, tx, ty;
    gap=gap||0;
    if(len<gap+8){ setLine(v.l,x0,y0,x0,y0); v.h.setAttribute('d',''); return false; }
    ux=dx/len; uy=dy/len; hl=Math.min(10,(len-gap)*0.45);
    tx=x1-ux*gap; ty=y1-uy*gap; bx=tx-ux*hl; by=ty-uy*hl;
    setLine(v.l,x0,y0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',poly([[tx,ty],[bx-uy*4.5,by+ux*4.5],[bx+uy*4.5,by-ux*4.5]])+'Z');
    return true;
  }
  function hideVec(v){ setLine(v.l,0,0,0,0); v.h.setAttribute('d',''); }
  /* italic vector name with an optional subscript, as in the det figure */
  function vlab(g,name,sub,cls){
    var t=S('text',{'class':'nf-vlab '+cls,'text-anchor':'middle'},g), s;
    t.appendChild(document.createTextNode(name));
    if(sub){ s=S('tspan',{dy:'3','class':'nf-sub'},t); s.textContent=sub; }
    return t;
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
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
  /* drag whichever point is nearest the pointer; pts() gives svg positions, move(i,x,y) the new one */
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
    /* a touch that starts on a point drags it instead of scrolling the page */
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(near(local(svg,e.touches[0],s[0],s[1]))>=0) e.preventDefault();
    },{passive:false});
  }
  function focusOf(list){ return function(i){ try{ list()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} }; }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  /* the det figure's plane: integer grid, axes, halo tick labels, origin in the middle, YR units up and down */
  function plane(svg,W,H,YR,pad){
    var u=(H-2*pad)/(2*YR), ox=W/2, oy=H/2, xr=(W/2-pad)/u, L=Math.floor(xr), g=S('g',null,svg), v;
    for(v=-L;v<=L;v++) if(v) line(g,C(ox+v*u),pad,C(ox+v*u),H-pad,'nf-grid');
    for(v=-YR;v<=YR;v++) if(v) line(g,ox-xr*u,C(oy-v*u),ox+xr*u,C(oy-v*u),'nf-grid');
    line(g,ox-xr*u,C(oy),ox+xr*u,C(oy),'nf-ax');
    line(g,C(ox),pad,C(ox),H-pad,'nf-ax');
    for(v=-L;v<=L;v++) if(v) text(g,ox+v*u,oy+15,tl(v),'nf-halo','middle');
    for(v=-YR;v<=YR;v++) if(v) text(g,ox-6,oy-v*u+4,tl(v),'nf-halo','end');
    return {u:u, ox:ox, oy:oy, xr:xr, rw:Math.hypot(xr,YR)+1,
      px:function(x){ return ox+x*u; }, py:function(y){ return oy-y*u; },
      gc:clip(svg,ox-xr*u,pad,2*xr*u,H-2*pad)};
  }
  /* a 2 by 2 matrix drawn top left; cls gives each column its colour */
  function matbox(svg,name,cw,cls){
    var mg=S('g',{'aria-hidden':'true'},svg), lb=46, rb=lb+16+2*cw, c1=lb+8+cw/2, c2=c1+cw;
    S('rect',{x:4,y:4,width:rb+10,height:52,rx:3,'class':'nf-mbg'},mg);
    text(mg,12,34,name+' =','nf-lab');
    S('path',{d:'M'+lb+',13h-4v34h4M'+rb+',13h4v34h-4','class':'nf-brk'},mg);
    return [[text(mg,c1,26,'',cls[0],'middle'),text(mg,c2,26,'',cls[1],'middle')],
            [text(mg,c1,43,'',cls[0],'middle'),text(mg,c2,43,'',cls[1],'middle')]];
  }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }

  /* eigenvalues of the symmetric [[a,b],[b,c]], largest first, and the angle of the first eigenvector */
  function eig2(a,b,c){
    var m=(a+c)/2, d=Math.hypot((a-c)/2,b);
    return {l1:m+d, l2:m-d, al:d>0?0.5*Math.atan2(2*b,a-c):0};
  }
  /* the level set l1 z1^2 + l2 z2^2 = k, where z are coordinates along the eigenvectors (angle al),
     as polylines in x coordinates around the centre c; r bounds the lines and hyperbola branches */
  function conic(l1,l2,al,k,c,r){
    var ca=Math.cos(al), sa=Math.sin(al), out=[], i, s, p, q1, q2, m, sm, a1, a2;
    function X(z1,z2){ return [c[0]+z1*ca-z2*sa, c[1]+z1*sa+z2*ca]; }
    function sg(v){ return v>0?1:v<0?-1:0; }
    var s1=sg(l1), s2=sg(l2), sk=Math.abs(k)<1e-12?0:sg(k);
    if(sk===0){
      if(s1*s2<0){
        m=Math.sqrt(-l1/l2);
        for(i=-1;i<=1;i+=2){ q1=r/Math.sqrt(1+m*m); out.push([X(-q1,-i*m*q1),X(q1,i*m*q1)]); }
      } else if(s1===0 && s2!==0) out.push([X(-r,0),X(r,0)]);
      else if(s2===0 && s1!==0) out.push([X(0,-r),X(0,r)]);
      return out;
    }
    if(s1!==0 && s2!==0){
      if(s1===sk && s2===sk){
        a1=Math.sqrt(k/l1); a2=Math.sqrt(k/l2); p=[];
        for(i=0;i<=720;i++){ s=i/720*2*Math.PI; p.push(X(a1*Math.cos(s),a2*Math.sin(s))); }
        out.push(p);
      } else if(s1!==s2){
        /* hyperbola: the eigenvalue with the sign of k carries the cosh */
        if(s1===sk){ a1=Math.sqrt(k/l1); a2=Math.sqrt(-k/l2); }
        else { a1=Math.sqrt(k/l2); a2=Math.sqrt(-k/l1); }
        sm=Math.min(12,Math.log(2*r/Math.min(a1,a2)+2)+0.5);
        for(m=-1;m<=1;m+=2){
          p=[];
          for(i=0;i<=300;i++){
            s=-sm+2*sm*i/300; q1=m*a1*Math.cosh(s); q2=a2*Math.sinh(s);
            p.push(s1===sk?X(q1,q2):X(q2,q1));
          }
          out.push(p);
        }
      }
      return out;
    }
    if(s1!==0 && s1===sk){ a1=Math.sqrt(k/l1); out.push([X(-a1,-r),X(-a1,r)],[X(a1,-r),X(a1,r)]); }
    else if(s2!==0 && s2===sk){ a2=Math.sqrt(k/l2); out.push([X(-r,-a2),X(r,-a2)],[X(-r,a2),X(r,a2)]); }
    return out;
  }
  function pathOf(lines,sx,sy){
    var d='', i;
    for(i=0;i<lines.length;i++) d+=poly(lines[i].map(function(p){ return [sx(p[0]),sy(p[1])]; }));
    return d;
  }
  /* a square plot of [lo, hi]^2 under an optional key; returns the scales and a clipped group */
  function square(svg,W,items,lo,hi,names){
    var rows=items?key(S('g',null,svg),items,10,13,W-6):0, top=items?rows*16+24:18, side=Math.min(W-70,300),
        x0=Math.round((W-side)/2)+10, g=S('g',null,svg), sx, sy, v, H;
    sx=function(v){ return x0+(v-lo)/(hi-lo)*side; };
    sy=function(v){ return top+(hi-v)/(hi-lo)*side; };
    sx.inv=function(p){ return lo+(p-x0)/side*(hi-lo); };
    sy.inv=function(p){ return hi-(p-top)/side*(hi-lo); };
    for(v=Math.ceil(lo);v<=hi;v++){
      line(g,C(sx(v)),top,C(sx(v)),top+side,v===0?'nf-ax':'nf-grid');
      line(g,x0,C(sy(v)),x0+side,C(sy(v)),v===0?'nf-ax':'nf-grid');
      text(g,sx(v),top+side+15,tl(v),null,'middle');
      text(g,x0-6,sy(v)+4,tl(v),null,'end');
    }
    S('rect',{x:x0,y:top,width:side,height:side,'class':'l3-frame'},g);
    text(g,x0+side+10,top+side+15,names[0],'nf-title l3-it');
    text(g,x0-6,top-9,names[1],'nf-title l3-it','end');
    H=top+side+24;
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    return {sx:sx, sy:sy, x0:x0, top:top, side:side, H:H, gc:clip(svg,x0,top,side,side)};
  }

  /* ---------- 1. Projection onto a line ---------- */
  NF.register('l3-proj',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var X0=[3,1], Y0=[1,2.5], V=[X0.slice(),Y0.slice()], YR=3, H=300, pad=12, W=520, F, el={}, hs=[];
    function lim(){ return Math.floor(F.xr*10)/10; }
    function put(i,x,y){ V[i]=[clamp(Math.round(x*10)/10,-lim(),lim()),clamp(Math.round(y*10)/10,-YR,YR)]; }
    onClick(fig,'.nfig-reset',function(){ V=[X0.slice(),Y0.slice()]; update(); });
    onClick(fig,'.l3-iota',function(){ V[0]=[1,1]; update(); });
    onClick(fig,'.l3-again',function(){ var q=proj(); if(q){ V[1]=[q.p[0],q.p[1]]; update(); } });
    function proj(){
      var x=V[0], y=V[1], xx=x[0]*x[0]+x[1]*x[1], xy, c;
      if(xx<1e-12) return null;
      xy=x[0]*y[0]+x[1]*y[1]; c=xy/xx;
      return {xx:xx, xy:xy, c:c, p:[c*x[0],c*x[1]], e:[y[0]-c*x[0],y[1]-c*x[1]]};
    }
    function draw(){
      var i;
      W=measure(svg); frame(svg,W,H);
      F=plane(svg,W,H,YR,pad);
      for(i=0;i<2;i++) V[i]=[clamp(V[i][0],-lim(),lim()),clamp(V[i][1],-YR,YR)];
      el.span=line(F.gc,0,0,0,0,'l3-span');
      el.pv=line(F.gc,0,0,0,0,'l3-pvec');
      el.res=line(F.gc,0,0,0,0,'l3-res');
      el.rt=S('path',{'class':'l3-rt'},F.gc);
      el.pdot=S('circle',{r:4.5,'class':'l3-pdot'},F.gc);
      el.pl=text(svg,0,0,'Py','nf-lab nf-halo l3-it','middle');
      el.ml=text(svg,0,0,'My','l3-rlab nf-halo l3-it','middle');
      el.v=[vec(svg,'nf-vec nf-v1','nf-head nf-v1'),vec(svg,'nf-vec nf-v2','nf-head nf-v2')];
      el.lab=[vlab(svg,'x','','nf-c1'),vlab(svg,'y','','nf-c2')];
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,'nf-v'+(i+1),'Tip of '+(i?'y':'x')+', arrow keys move it',keyer(i)));
      el.m=matbox(svg,'P',34,['nf-lab','nf-lab']);
      update();
    }
    function keyer(i){ return function(dx,dy,big){ var s=big?0.5:0.1; put(i,V[i][0]+dx*s,V[i][1]+dy*s); update(); }; }
    function update(){
      var x=V[0], y=V[1], q=proj(), o=[F.px(0),F.py(0)], i, T, d, ux, uy, P, Y, ex, ey, el2, ax, ay, sz, s, n;
      for(i=0;i<2;i++){
        T=[F.px(V[i][0]),F.py(V[i][1])];
        place(hs[i],T[0],T[1],V[i][0],(i?'y':'x')+' = ('+tl(V[i][0])+', '+tl(V[i][1])+')');
        d=Math.hypot(T[0]-o[0],T[1]-o[1]);
        if(setVec(el.v[i],o[0],o[1],T[0],T[1],7)) moveTo(el.lab[i],T[0]+(T[0]-o[0])/d*21,T[1]+(T[1]-o[1])/d*21+4);
        else moveTo(el.lab[i],T[0]+12,T[1]-10);
      }
      if(!q){
        setLine(el.span,0,0,0,0); setLine(el.pv,0,0,0,0); setLine(el.res,0,0,0,0);
        el.rt.setAttribute('d',''); el.pdot.setAttribute('r',0); el.pl.textContent=''; el.ml.textContent='';
        for(i=0;i<4;i++) el.m[i>>1][i&1].textContent='';
        if(out){ out.textContent=''; warn(out,'x = 0: there is no line to project onto'); }
        return;
      }
      n=Math.sqrt(q.xx); ux=x[0]/n; uy=x[1]/n;
      setLine(el.span,F.px(-40*ux),F.py(-40*uy),F.px(40*ux),F.py(40*uy));
      P=[F.px(q.p[0]),F.py(q.p[1])]; Y=[F.px(y[0]),F.py(y[1])];
      setLine(el.pv,o[0],o[1],P[0],P[1]);
      setLine(el.res,P[0],P[1],Y[0],Y[1]);
      el.pdot.setAttribute('r',4.5); at(el.pdot,P[0],P[1]);
      ex=Y[0]-P[0]; ey=Y[1]-P[1]; el2=Math.hypot(ex,ey);
      /* the right angle mark sits on the side of Py that faces the origin */
      ax=ux; ay=-uy;
      if(Math.hypot(P[0]-o[0],P[1]-o[1])>14 && (o[0]-P[0])*ax+(o[1]-P[1])*ay<0){ ax=-ax; ay=-ay; }
      if(el2>16){
        sz=8; ex/=el2; ey/=el2;
        el.rt.setAttribute('d',poly([[P[0]+ax*sz,P[1]+ay*sz],[P[0]+ax*sz+ex*sz,P[1]+ay*sz+ey*sz],[P[0]+ex*sz,P[1]+ey*sz]]));
        moveTo(el.pl,P[0]-ex*15,P[1]-ey*15+4);
        moveTo(el.ml,(P[0]+Y[0])/2-ax*14,(P[1]+Y[1])/2-ay*14+4);
        el.ml.textContent='My';
      } else {
        el.rt.setAttribute('d','');
        moveTo(el.pl,P[0]-uy*16,P[1]-ux*16+4);
        el.ml.textContent='';
      }
      el.pl.textContent='Py';
      el.m[0][0].textContent=fmt(x[0]*x[0]/q.xx,2); el.m[0][1].textContent=fmt(x[0]*x[1]/q.xx,2);
      el.m[1][0].textContent=fmt(x[0]*x[1]/q.xx,2); el.m[1][1].textContent=fmt(x[1]*x[1]/q.xx,2);
      if(!out) return;
      s='x′y = '+fmt(q.xy,2)+'   x′x = '+fmt(q.xx,2)+'   ĉ = x′y/x′x = '+fmt(q.c,2)+
        '\nPy = '+pair(q.p[0],q.p[1],2)+'   My = '+pair(q.e[0],q.e[1],2)+'   x′My = '+fmt(x[0]*q.e[0]+x[1]*q.e[1],2);
      if(Math.hypot(q.e[0],q.e[1])<1e-9) s+=', y is already on the line, so PPy = Py';
      if(x[0]===x[1]) s+='\nx ∝ ι: Py = ȳι with ȳ = '+fmt((y[0]+y[1])/2,2)+', and My = y '+MINUS+' ȳι is y demeaned';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return V.map(function(v){ return [F.px(v[0]),F.py(v[1])]; }); },
      function(i,x,y){ put(i,(x-F.ox)/F.u,(F.oy-y)/F.u); update(); },focusOf(function(){ return hs; }));
    draw();
    watch(svg,draw);
  });

  /* ---------- 2. Rank: which b can Ac = b reach ---------- */
  NF.register('l3-span',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var A0=[[2,0.5],[-0.5,1.5]], B0=[2,2.5], V=[A0[0].slice(),A0[1].slice(),B0.slice()], YR=3, H=300, pad=12, W=520, F, el={}, hs=[];
    function lim(st){ return Math.floor(F.xr/st)*st; }
    function put(i,x,y){ var st=i<2?0.5:0.25; V[i]=[clamp(Math.round(x/st)*st,-lim(st),lim(st)),clamp(Math.round(y/st)*st,-YR,YR)]; }
    onClick(fig,'.nfig-reset',function(){ V=[A0[0].slice(),A0[1].slice(),B0.slice()]; update(); });
    onClick(fig,'.l3-flat',function(){ V[0]=[2,1]; V[1]=[-1,-0.5]; update(); });
    var NAMES=['a1','a2','b'];
    function draw(){
      var i;
      W=measure(svg); frame(svg,W,H);
      F=plane(svg,W,H,YR,pad);
      for(i=0;i<3;i++) put(i,V[i][0],V[i][1]);
      el.lat=S('g',null,F.gc);
      el.band=line(F.gc,0,0,0,0,'l3-colsp');
      el.miss=line(F.gc,0,0,0,0,'l3-miss');
      el.mdot=S('circle',{r:0,'class':'l3-mdot'},F.gc);
      el.p1=line(F.gc,0,0,0,0,'l3-path1');
      el.p2=line(F.gc,0,0,0,0,'l3-path2');
      el.v=[vec(svg,'nf-vec nf-v1','nf-head nf-v1'),vec(svg,'nf-vec nf-v2','nf-head nf-v2')];
      el.lab=[vlab(svg,'a','1','nf-c1'),vlab(svg,'a','2','nf-c2'),vlab(svg,'b','','l3-cb')];
      hs=[];
      for(i=0;i<3;i++) hs.push(handle(svg,i<2?'nf-v'+(i+1):'l3-kb',(i<2?'Tip of column a'+(i+1):'Target b')+', arrow keys move it',keyer(i)));
      el.m=matbox(svg,'A',30,['nf-c1','nf-c2']);
      update();
    }
    function keyer(i){ return function(dx,dy){ var s=i<2?0.5:0.25; put(i,V[i][0]+dx*s,V[i][1]+dy*s); update(); }; }
    function lines(g,a,b,rw){
      /* lines through k a, parallel to b, for every whole k that can reach the window */
      var nb=Math.hypot(b[0],b[1]), na=Math.hypot(a[0],a[1]), det=Math.abs(a[0]*b[1]-a[1]*b[0]), gap=det/nb, K=Math.min(40,Math.ceil(rw/gap)), k, p, L, ux=b[0]/nb, uy=b[1]/nb;
      for(k=-K;k<=K;k++){
        p=[k*a[0],k*a[1]]; L=rw+Math.abs(k)*na;
        line(g,F.px(p[0]-L*ux),F.py(p[1]-L*uy),F.px(p[0]+L*ux),F.py(p[1]+L*uy),k?'l3-lat':'l3-lat l3-lat0');
      }
    }
    function update(){
      var a=V[0][0], c=V[0][1], b=V[1][0], d=V[1][1], B=V[2], det=a*d-b*c, o=[F.px(0),F.py(0)], i, T, dd, rank, dir, on, s, k, c1, c2, m, msg, w=false, nd, ux, uy;
      for(i=0;i<3;i++){
        T=[F.px(V[i][0]),F.py(V[i][1])];
        place(hs[i],T[0],T[1],V[i][0],NAMES[i]+' = ('+tl(V[i][0])+', '+tl(V[i][1])+')');
        if(i===2){ moveTo(el.lab[2],T[0]+13,T[1]-11); continue; }
        dd=Math.hypot(T[0]-o[0],T[1]-o[1]);
        if(setVec(el.v[i],o[0],o[1],T[0],T[1],7)) moveTo(el.lab[i],T[0]+(T[0]-o[0])/dd*21,T[1]+(T[1]-o[1])/dd*21+4);
        else moveTo(el.lab[i],T[0]+12,T[1]-10);
      }
      while(el.lat.firstChild) el.lat.removeChild(el.lat.firstChild);
      setLine(el.band,0,0,0,0); setLine(el.miss,0,0,0,0); el.mdot.setAttribute('r',0);
      setLine(el.p1,0,0,0,0); setLine(el.p2,0,0,0,0);
      rank=det!==0?2:(a||c||b||d)?1:0;
      if(rank===2){
        lines(el.lat,V[0],V[1],F.rw); lines(el.lat,V[1],V[0],F.rw);
        c1=(d*B[0]-b*B[1])/det; c2=(a*B[1]-c*B[0])/det;
        setLine(el.p1,o[0],o[1],F.px(c1*a),F.py(c1*c));
        setLine(el.p2,F.px(c1*a),F.py(c1*c),F.px(B[0]),F.py(B[1]));
        msg='det A = '+fmt(det,2)+', rank 2: c = A⁻¹b = '+pair(c1,c2,2)+', the only solution';
      } else if(rank===1){
        dir=(a||c)?V[0]:V[1]; nd=Math.hypot(dir[0],dir[1]); ux=dir[0]/nd; uy=dir[1]/nd;
        setLine(el.band,F.px(-F.rw*ux),F.py(-F.rw*uy),F.px(F.rw*ux),F.py(F.rw*uy));
        on=Math.abs(dir[0]*B[1]-dir[1]*B[0])<1e-9;
        s=(dir[0]*B[0]+dir[1]*B[1])/(nd*nd);
        if(on){
          setLine(dir===V[0]?el.p1:el.p2,o[0],o[1],F.px(B[0]),F.py(B[1]));
          if(dir===V[0]){ k=(a*b+c*d)/(nd*nd); msg='det A = 0, rank 1: b lies on the line, so c = ('+fmt(s,2)+', 0) + t('+fmt(k,2)+', '+MINUS+'1) solves Ac = b for every t'; }
          else msg='det A = 0, rank 1: b lies on the line, so c = (0, '+fmt(s,2)+') + t(1, 0) solves Ac = b for every t';
        } else {
          m=[s*dir[0],s*dir[1]];
          setLine(el.miss,F.px(m[0]),F.py(m[1]),F.px(B[0]),F.py(B[1]));
          el.mdot.setAttribute('r',4); at(el.mdot,F.px(m[0]),F.py(m[1]));
          msg='det A = 0, rank 1: b is off the line the columns span, so Ac = b has no solution; the dot is the closest point they reach';
          w=true;
        }
      } else {
        msg='A = 0, rank 0: Ac = 0 for every c, so only b = 0 can be reached';
        w=!(B[0]===0 && B[1]===0);
      }
      el.m[0][0].textContent=tl(a); el.m[0][1].textContent=tl(b); el.m[1][0].textContent=tl(c); el.m[1][1].textContent=tl(d);
      if(!out) return;
      out.textContent='';
      if(w) warn(out,msg); else out.textContent=msg;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return V.map(function(v){ return [F.px(v[0]),F.py(v[1])]; }); },
      function(i,x,y){ put(i,(x-F.ox)/F.u,(F.oy-y)/F.u); update(); },focusOf(function(){ return hs; }));
    draw();
    watch(svg,draw);
  });

  /* ---------- 3. Volume of the box spanned by three vectors ---------- */
  NF.register('l3-vol',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var t=0.6, AZ0=-0.55, EL0=0.58, ELO=0.08, EHI=1.05, az=AZ0, elv=EL0, H=320, W=520, u=60, ox=260, oy=160, g=null, drag=null, c=Math.SQRT1_2;
    var rt=range(fig,'t',2,function(v){ t=v; update(); });
    if(rt) t=rt.v();
    onClick(fig,'.l3-flat',function(){ if(rt){ rt.el.value='0'; rt.el.dispatchEvent(new Event('input')); } else { t=0; update(); } });
    onClick(fig,'.l3-view',function(){ az=AZ0; elv=EL0; update(); });
    function add(p,q){ return [p[0]+q[0],p[1]+q[1],p[2]+q[2]]; }
    /* turn the scene 45 degrees about the first axis so the plane of V2 = (1, 0, 0) and V3 = (0, 1, 1) lies flat:
       V3 goes to (0, 1.41, 0), and the height above the floor is the component along (0, -1, 1)/1.41 */
    function flat(p){ return [p[0],c*(p[1]+p[2]),c*(p[2]-p[1])]; }
    function prj(q){
      var x=q[0]-1, y=q[1]-1.6, z=q[2]-0.2, ca=Math.cos(az), sa=Math.sin(az), xr=x*ca-y*sa, yr=x*sa+y*ca, ce=Math.cos(elv), se=Math.sin(elv);
      return [ox+u*xr, oy-u*(yr*se+z*ce), -yr*ce+z*se];
    }
    function det3(a,b,d){ return a[0]*(b[1]*d[2]-b[2]*d[1])-b[0]*(a[1]*d[2]-a[2]*d[1])+d[0]*(a[1]*b[2]-a[2]*b[1]); }
    function draw(){
      /* shorter on a phone, where the width and not the height sets the scale */
      W=measure(svg); H=clamp(Math.round(W*0.62),240,320); frame(svg,W,H);
      u=Math.min(W/5,H/3.4); ox=W/2; oy=H/2-14;
      g=S('g',null,svg);
      update();
    }
    function arrow(gg,P,Q,cls,name,sub,lc){
      var v=vec(gg,'nf-vec '+cls,'nf-head '+cls), d, lab;
      setVec(v,P[0],P[1],Q[0],Q[1],0);
      d=Math.hypot(Q[0]-P[0],Q[1]-P[1])||1;
      lab=vlab(gg,name,sub,lc+' nf-halo');
      moveTo(lab,Q[0]+(Q[0]-P[0])/d*16,Q[1]+(Q[1]-P[1])/d*16+4);
    }
    function update(){
      var V1=[1,1,1+t], V2=[1,0,0], V3=[0,1,1], det=det3(V1,V2,V3), h=t*c, i, f, P, Q, s,
          F1=flat(V1), F2=flat(V2), F3=flat(V3), O=[0,0,0], F12=add(F1,F2), F13=add(F1,F3), F23=add(F2,F3), F123=add(F12,F3), faces, eg, fl;
      while(g.firstChild) g.removeChild(g.firstChild);
      g.setAttribute('class',det<-1e-9?'l3-neg':'');
      /* the floor, then the box, back faces first, then the drop from the tip of V1 to the floor */
      fl=[[-0.3,-0.3],[2.3,-0.3],[2.3,3.3],[-0.3,3.3]].map(function(q){ return prj([q[0],q[1],0]); });
      S('path',{d:poly(fl)+'Z','class':'l3-plane'},g);
      text(g,fl[1][0]+4,fl[1][1]+14,'plane of V₂ and V₃','nf-lab nf-halo l3-small',fl[1][0]>ox?'end':'start');
      faces=[[O,F2,F23,F3],[F1,F12,F123,F13],[O,F1,F12,F2],[F3,F13,F123,F23],[O,F1,F13,F3],[F2,F12,F123,F23]].map(function(F){
        var p=F.map(prj); return {p:p, z:(p[0][2]+p[1][2]+p[2][2]+p[3][2])/4};
      });
      faces.sort(function(x,y){ return x.z-y.z; });
      for(i=0;i<faces.length;i++) S('path',{d:poly(faces[i].p)+'Z','class':'l3-face'},g);
      eg=S('g',null,g);
      [[F1,F12],[F1,F13],[F2,F12],[F2,F23],[F3,F13],[F3,F23],[F12,F123],[F13,F123],[F23,F123]].forEach(function(E){
        var p=prj(E[0]), q=prj(E[1]); line(eg,p[0],p[1],q[0],q[1],'l3-edge');
      });
      P=prj(F1); Q=prj([F1[0],F1[1],0]);
      if(Math.abs(h)>1e-9){
        line(g,P[0],P[1],Q[0],Q[1],'l3-drop');
        S('circle',{cx:R(Q[0]),cy:R(Q[1]),r:2.5,'class':'l3-foot'},g);
      }
      P=prj(O);
      arrow(g,P,prj(F2),'nf-v2','V','2','nf-c2');
      arrow(g,P,prj(F3),'nf-v2','V','3','nf-c2');
      arrow(g,P,prj(F1),'nf-v1','V','1','nf-c1');
      if(!out) return;
      out.textContent='t = '+fmt(t,2)+'   det [V₁ V₂ V₃] = '+fmt(det,2)+'   rank '+(Math.abs(det)<1e-9?2:3)+
        '\nbase area √2, height '+fmt(h,2)+', volume √2 × '+Math.abs(h).toFixed(2)+' = '+Math.abs(det).toFixed(2);
      if(Math.abs(det)<1e-9) warn(out,': V₁ = V₂ + V₃ lies in the plane, so the box is flat');
      else if(det<0) out.appendChild(document.createTextNode(', and det < 0: V₁ is below the plane, so the orientation flips'));
    }
    svg.addEventListener('pointerdown',function(e){
      drag={x:e.clientX, y:e.clientY, az:az, el:elv};
      capture(svg,e); svg.classList.add('is-drag');
    });
    svg.addEventListener('pointermove',function(e){
      if(!drag) return;
      az=drag.az+(e.clientX-drag.x)*0.01;
      elv=clamp(drag.el+(e.clientY-drag.y)*0.01,ELO,EHI);
      update();
    });
    function stop(){ drag=null; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('keydown',function(e){
      var k=e.key;
      if(k==='ArrowLeft') az-=0.15; else if(k==='ArrowRight') az+=0.15;
      else if(k==='ArrowUp') elv=clamp(elv+0.1,ELO,EHI); else if(k==='ArrowDown') elv=clamp(elv-0.1,ELO,EHI);
      else return;
      e.preventDefault(); update();
    });
    draw();
    watch(svg,draw);
  });

  /* ---------- 4. Quadratic forms and definiteness ---------- */
  NF.register('l3-quad',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var EX={pd:[2,0.8,1], psd:[1,1,1], ind:[1,2.5,4], nd:[-2,0.5,-1]}, A=[2,0.8,1], Pr=[1.2,-0.6], W=520, H=360, Q, el={}, hs=[], hold=false;
    var rs={a:range(fig,'a',1,function(v){ A[0]=v; changed(); }), b:range(fig,'b',1,function(v){ A[1]=v; changed(); }), c:range(fig,'c',1,function(v){ A[2]=v; changed(); })};
    if(rs.a) A=[rs.a.v(),rs.b.v(),rs.c.v()];
    var opts=fig.querySelectorAll('.nfig-opt[data-ex]'), i;
    for(i=0;i<opts.length;i++) opts[i].addEventListener('click',function(){ var v=EX[this.getAttribute('data-ex')]; if(v) set(v); });
    function setR(k,v){ var r=rs[k]; if(!r) return; r.el.value=String(v); r.el.dispatchEvent(new Event('input')); }
    function set(v){ hold=true; setR('a',v[0]); setR('b',v[1]); setR('c',v[2]); hold=false; A=v.slice(); changed(); }
    function ints(){ return [Math.round(A[0]*10),Math.round(A[1]*10),Math.round(A[2]*10)]; }
    function changed(){
      if(hold) return;
      var n=ints(), j, v;
      for(j=0;j<opts.length;j++){ v=EX[opts[j].getAttribute('data-ex')]; opts[j].setAttribute('aria-pressed',v && Math.round(v[0]*10)===n[0] && Math.round(v[1]*10)===n[1] && Math.round(v[2]*10)===n[2]?'true':'false'); }
      update();
    }
    function q(x){ return A[0]*x[0]*x[0]+2*A[1]*x[0]*x[1]+A[2]*x[1]*x[1]; }
    function draw(){
      var items=[['rect','l3-p8 l3-sw','x′Ax > 0'],['rect','l3-n8 l3-sw','x′Ax < 0'],['line','l3-zero','x′Ax = 0'],['line','l3-plev','level through the probe'],['line','l3-grad','gradient 2Ax']];
      W=measure(svg); frame(svg,W,H);
      Q=square(svg,W,items,-2,2,['x₁','x₂']); H=Q.H;
      el.bands=S('g',{'shape-rendering':'crispEdges'},Q.gc);
      el.lev=S('path',{'class':'l3-lev'},Q.gc);
      el.zero=S('path',{'class':'l3-zero'},Q.gc);
      el.plev=S('path',{'class':'l3-plev'},Q.gc);
      el.eig=[vec(Q.gc,'l3-eig','l3-eigh'),vec(Q.gc,'l3-eig','l3-eigh')];
      el.el=[text(Q.gc,0,0,'','nf-lab nf-halo','middle'),text(Q.gc,0,0,'','nf-lab nf-halo','middle')];
      el.grad=vec(svg,'l3-grad','l3-gradh');
      hs=[handle(svg,'l3-kp','Probe point x, arrow keys move it',function(dx,dy,big){ var s=big?0.5:0.1; movePr(Pr[0]+dx*s,Pr[1]+dy*s); })];
      update();
    }
    function movePr(x,y){ Pr=[clamp(Math.round(x*100)/100,-2,2),clamp(Math.round(y*100)/100,-2,2)]; update(); }
    function update(){
      var n=ints(), d100=n[0]*n[2]-n[1]*n[1], e=eig2(A[0],A[1],A[2]), l1=e.l1, l2=e.l2, sx=Q.sx, sy=Q.sy, cells=Math.round(Q.side/5),
          cw=Q.side/cells, j, k, m, x1, x2, v, cls, run, r0, xa, ya, lv=[], zl, pk, g1, g2, gn, P, ca, sa, dirs, tip, s, test, kind;
      if(d100===0){ if(Math.abs(l1)<Math.abs(l2)) l1=0; else l2=0; }
      /* shading: one rect per run of equal band along each row */
      while(el.bands.firstChild) el.bands.removeChild(el.bands.firstChild);
      for(j=0;j<cells;j++){
        x2=2-(j+0.5)*4/cells; run=null; r0=0;
        for(k=0;k<=cells;k++){
          if(k<cells){ x1=-2+(k+0.5)*4/cells; v=q([x1,x2]); cls=(v>=0?'l3-p':'l3-n')+Math.min(8,Math.floor(2*Math.sqrt(Math.abs(v)))); }
          else cls=null;
          if(cls!==run){
            if(run){ xa=Math.round(Q.x0+r0*cw); ya=Math.round(Q.top+j*cw); S('rect',{x:xa,y:ya,width:Math.round(Q.x0+k*cw)-xa,height:Math.round(Q.top+(j+1)*cw)-ya,'class':run},el.bands); }
            run=cls; r0=k;
          }
        }
      }
      /* levels 0.25 m^2, so a bowl with eigenvalue 1 has rings half a unit apart; the bands change at the same levels */
      for(m=1;m<=16;m++){ lv=lv.concat(conic(l1,l2,e.al,0.25*m*m,[0,0],3),conic(l1,l2,e.al,-0.25*m*m,[0,0],3)); }
      el.lev.setAttribute('d',pathOf(lv,sx,sy));
      zl=conic(l1,l2,e.al,0,[0,0],3);
      el.zero.setAttribute('d',pathOf(zl,sx,sy));
      pk=q(Pr);
      el.plev.setAttribute('d',pathOf(conic(l1,l2,e.al,Math.abs(pk)<1e-9?0:pk,[0,0],3),sx,sy));
      /* eigenvectors with their eigenvalues */
      ca=Math.cos(e.al); sa=Math.sin(e.al); dirs=[[ca,sa,l1],[-sa,ca,l2]];
      for(j=0;j<2;j++){
        tip=[1.25*dirs[j][0],1.25*dirs[j][1]];
        setVec(el.eig[j],sx(0),sy(0),sx(tip[0]),sy(tip[1]),0);
        moveTo(el.el[j],clamp(sx(1.62*dirs[j][0]),Q.x0+30,Q.x0+Q.side-30),clamp(sy(1.62*dirs[j][1])+4,Q.top+14,Q.top+Q.side-6));
        el.el[j].textContent='λ = '+fmt(dirs[j][2],2);
      }
      P=[sx(Pr[0]),sy(Pr[1])];
      g1=2*(A[0]*Pr[0]+A[1]*Pr[1]); g2=2*(A[1]*Pr[0]+A[2]*Pr[1]); gn=Math.hypot(g1,g2);
      if(gn>1e-9) setVec(el.grad,P[0],P[1],P[0]+g1/gn*40,P[1]-g2/gn*40,0); else hideVec(el.grad);
      place(hs[0],P[0],P[1],Pr[0],'x = '+pair(Pr[0],Pr[1],2)+', x′Ax = '+fmt(pk,2));
      if(d100>0){ kind=n[0]>0?'positive definite':'negative definite'; test='a = '+fmt(A[0],1)+(n[0]>0?' > 0':' < 0')+' and det A = '+fmt(d100/100,2)+' > 0: '+kind; }
      else if(d100<0) test='det A = ac '+MINUS+' b² = '+fmt(d100/100,2)+' < 0: indefinite';
      else if(n[0]===0 && n[2]===0) test='A = 0: x′Ax = 0 for every x';
      else if(n[0]>=0 && n[2]>=0) test='det A = 0, a = '+fmt(A[0],1)+' ≥ 0, c = '+fmt(A[2],1)+' ≥ 0: positive semidefinite, singular';
      else test='det A = 0, a = '+fmt(A[0],1)+' ≤ 0, c = '+fmt(A[2],1)+' ≤ 0: negative semidefinite, singular';
      if(!out) return;
      s='λ = '+fmt(l1,2)+' and '+fmt(l2,2)+'   '+test+'\nat x = '+pair(Pr[0],Pr[1],2)+': x′Ax = '+fmt(pk,2)+'   2Ax = '+pair(g1,g2,2);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[Q.sx(Pr[0]),Q.sy(Pr[1])]]; },
      function(i,x,y){ movePr(Q.sx.inv(x),Q.sy.inv(y)); },focusOf(function(){ return hs; }));
    draw();
    watch(svg,draw);
  });

  /* ---------- 5. The least squares objective over two slopes ---------- */
  NF.register('l3-ols',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=50, seed=20261101, Z1=[], Z2=[], U=[], rho=0.6, Pb=[2.2,0.2], W=520, H=360, Q, el={}, hs=[], st={};
    var rr=range(fig,'rho',2,function(v){ rho=v; stats(); update(); });
    if(rr) rho=rr.v();
    onClick(fig,'.nfig-new',function(){ seed++; gen(); stats(); update(); });
    function gen(){
      var rnd=mulberry32(seed), i;
      function z(){ var u1=1-rnd(), u2=rnd(); return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); }
      for(i=0;i<N;i++){ Z1[i]=z(); Z2[i]=z(); U[i]=z(); }
    }
    function stats(){
      var i, x1, x2, y, k=Math.sqrt(Math.max(0,1-rho*rho)), s11=0, s12=0, s22=0, r1=0, r2=0, det;
      for(i=0;i<N;i++){ x1=Z1[i]; x2=rho*Z1[i]+k*Z2[i]; y=x1+x2+U[i]; s11+=x1*x1; s12+=x1*x2; s22+=x2*x2; r1+=x1*y; r2+=x2*y; }
      det=s11*s22-s12*s12;
      st={s11:s11, s12:s12, s22:s22, r1:r1, r2:r2, det:det, rank:det>1e-9*s11*s22?2:1};
      if(st.rank===2) st.b=[(s22*r1-s12*r2)/det,(s11*r2-s12*r1)/det];
      else { st.det=0; st.sum=r1/s11; st.b=[st.sum/2,st.sum/2]; }
      st.e=eig2(s11,s12,s22);
      if(st.rank===1) st.e.l2=0;
    }
    function draw(){
      var items=[['line','l3-lev','level sets of S(b)'],['line','l3-minline','minimisers when ρ = 1'],['line','l3-grad','gradient at the probe']];
      W=measure(svg); frame(svg,W,H);
      Q=square(svg,W,items,-1,3,['b₁','b₂']); H=Q.H;
      el.lev=S('path',{'class':'l3-lev'},Q.gc);
      el.min=line(Q.gc,0,0,0,0,'l3-minline');
      el.beta=S('path',{'class':'l3-beta'},Q.gc);
      el.bl=text(Q.gc,0,0,'β','nf-lab nf-halo l3-it');
      el.bh=S('circle',{r:5,'class':'l3-bhat'},Q.gc);
      el.bhl=text(Q.gc,0,0,'b̂','l3-cbh nf-halo l3-it');
      el.grad=vec(svg,'l3-grad','l3-gradh');
      hs=[handle(svg,'l3-kp','Probe point b, arrow keys move it',function(dx,dy,big){ var s=big?0.25:0.05; movePb(Pb[0]+dx*s,Pb[1]+dy*s,2); })];
      update();
    }
    /* drop the probe onto the minimiser, or onto the line of minimisers, once it comes within snap px
       (9 when dragging; 2 for the keys, less than one key step, so a key press can always leave it) */
    function movePb(x,y,snap){
      var b=st.b, t, px=Q.side/4;
      x=clamp(x,-1,3); y=clamp(y,-1,3);
      if(snap){
        if(st.rank===2 && Math.hypot(x-b[0],y-b[1])*px<snap){ x=b[0]; y=b[1]; }
        else if(st.rank===1 && Math.abs(x+y-st.sum)/Math.SQRT2*px<snap){ t=(x+y-st.sum)/2; x-=t; y-=t; }
      }
      Pb=[x,y]; update();
    }
    function update(){
      var sx=Q.sx, sy=Q.sy, b=st.b, lv=[], m, r, P, g1, g2, gn, s, cx, cy, L, zero;
      r=3+Math.hypot(b[0]-1,b[1]-1);
      for(m=1;m<=16;m++) lv=lv.concat(conic(st.e.l1,st.e.l2,st.e.al,0.04*N*m*m,b,r));
      el.lev.setAttribute('d',pathOf(lv,sx,sy));
      cx=sx(1); cy=sy(1);
      el.beta.setAttribute('d','M'+R(cx-5)+','+R(cy-5)+'L'+R(cx+5)+','+R(cy+5)+'M'+R(cx-5)+','+R(cy+5)+'L'+R(cx+5)+','+R(cy-5));
      moveTo(el.bl,cx+7,cy+15);
      if(st.rank===2){
        setLine(el.min,0,0,0,0);
        el.bh.setAttribute('r',5); at(el.bh,sx(b[0]),sy(b[1]));
        moveTo(el.bhl,sx(b[0])+8,sy(b[1])-8); el.bhl.textContent='b̂';
      } else {
        L=st.sum;
        setLine(el.min,sx(L+2),sy(-2),sx(L-4),sy(4));
        el.bh.setAttribute('r',0); el.bhl.textContent='';
      }
      P=[sx(Pb[0]),sy(Pb[1])];
      g1=2*(st.s11*Pb[0]+st.s12*Pb[1]-st.r1); g2=2*(st.s12*Pb[0]+st.s22*Pb[1]-st.r2); gn=Math.hypot(g1,g2);
      zero=gn<1e-6;
      if(zero){ g1=0; g2=0; hideVec(el.grad); } else setVec(el.grad,P[0],P[1],P[0]+g1/gn*40,P[1]-g2/gn*40,0);
      place(hs[0],P[0],P[1],Pb[0],'b = '+pair(Pb[0],Pb[1],2));
      if(!out) return;
      s='ρ = '+fmt(rho,2)+'   X′X = ['+fmt(st.s11,1)+'  '+fmt(st.s12,1)+'; '+fmt(st.s12,1)+'  '+fmt(st.s22,1)+']   det X′X = ';
      out.textContent='';
      if(st.rank===2) out.appendChild(document.createTextNode(s+fmt(st.det,0)+'   b̂ = '+pair(b[0],b[1],2)));
      else { out.appendChild(document.createTextNode(s+'0')); warn(out,': X has rank 1, and every b with b₁ + b₂ = '+fmt(st.sum,2)+' minimises S'); }
      out.appendChild(document.createTextNode('\nat the probe b = '+pair(Pb[0],Pb[1],2)+': ∂S/∂b = 2(X′Xb '+MINUS+' X′y) = '+pair(g1,g2,1)+
        (zero?', zero: the normal equations X′Xb = X′y hold':'')));
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[Q.sx(Pb[0]),Q.sy(Pb[1])]]; },
      function(i,x,y){ movePb(Q.sx.inv(x),Q.sy.inv(y),9); },focusOf(function(){ return hs; }));
    gen(); stats(); draw();
    watch(svg,draw);
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
