/* Core Micro L5 figures (decision making under risk): the probability simplex, compound lotteries, four rational
   preferences that are not expected utility, continuity along a mixture, the slope of expected utility lines,
   independence, monotonicity in probabilities, the vNM construction, the Jehle and Reny example, cardinal utility,
   and matching pennies.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi5.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, local=NF.local, capture=NF.capture, MINUS=NF.MINUS, R3=Math.sqrt(3);

  /* ---------- shared ---------- */
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function mixP(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; }
  function triple(p,d){ return '('+fmt(p[0],d)+', '+fmt(p[1],d)+', '+fmt(p[2],d)+')'; }
  function sgn(v){ return v>1e-9?1:v<-1e-9?-1:0; }
  function eu(w,p){ return w[0]*p[0]+w[1]*p[1]+w[2]*p[2]; }
  function money(v){ return (v<0?MINUS:'')+'£'+Math.abs(v); }
  function rel(s){ return s>0?'≻':s<0?'≺':'∼'; }
  function toggle(fig,sel,cb){
    var b=fig.querySelector(sel);
    function set(v){ if(b) b.setAttribute('aria-pressed',v?'true':'false'); }
    if(b) b.addEventListener('click',function(){ var v=b.getAttribute('aria-pressed')!=='true'; set(v); cb(v); });
    return {set:set, on:function(){ return !!b && b.getAttribute('aria-pressed')==='true'; }};
  }

  /* The simplex as an equilateral triangle with vertex 1 bottom left, 2 bottom right and 3 on top.
     With the altitude h pixels tall, the height of a point above the side opposite vertex n is p_n times h. */
  function Tri(x0,yb,h){
    var s=2*h/R3, T={x0:x0, yb:yb, h:h, s:s};
    T.V=[[x0,yb],[x0+s,yb],[x0+s/2,yb-h]];
    T.xy=function(p){ return [x0+(p[1]+p[2]/2)*s, yb-p[2]*h]; };
    T.bary=function(x,y){ var p3=(yb-y)/h, p2=(x-x0)/s-p3/2; return [1-p2-p3,p2,p3]; };
    return T;
  }
  /* The same simplex in the (p1, p3) plane: a right triangle with the sure middle prize at the origin,
     the worst prize at (1, 0) and the best at (0, 1). Its side is w pixels. */
  function RTri(x0,y0,w){
    var T={x0:x0, y0:y0, w:w};
    T.V=[[x0+w,y0],[x0,y0],[x0,y0-w]];
    T.xy=function(p){ return [x0+p[0]*w, y0-p[2]*w]; };
    T.bary=function(x,y){ var p1=(x-x0)/w, p3=(y0-y)/w; return [p1,1-p1-p3,p3]; };
    return T;
  }
  /* nearest point of the grid with step 1/n inside the simplex, kept as whole counts that sum to n,
     so a lottery set to (0.6, 0.4, 0) is exactly that and goals can test it */
  function snap(p,n){
    var q=[Math.max(0,p[0]),Math.max(0,p[1]),Math.max(0,p[2])], t=q[0]+q[1]+q[2], k2, k3;
    if(!(t>0)) q=[1,0,0]; else q=[q[0]/t,q[1]/t,q[2]/t];
    k3=clamp(Math.round(q[2]*n),0,n); k2=clamp(Math.round(q[1]*n),0,n-k3);
    return [n-k2-k3,k2,k3];
  }
  function probs(k,n){ return [k[0]/n,k[1]/n,k[2]/n]; }
  function copyK(A){ return A.map(function(k){ return k.slice(); }); }
  /* counts from a state object: two of the three probabilities fix the third */
  function fromSet(st,names,k,n){
    var v=[], have=0, s=0, miss=[], i, rest, a, b;
    for(i=0;i<3;i++){ if(names[i] in st){ v[i]=+st[names[i]]; have++; s+=v[i]; } else miss.push(i); }
    if(!have) return k;
    if(have===2) v[miss[0]]=1-s;
    else if(have===1){
      a=k[miss[0]]; b=k[miss[1]]; rest=1-s;
      v[miss[0]]=a+b>0?rest*a/(a+b):rest/2; v[miss[1]]=rest-v[miss[0]];
    }
    return snap(v,n);
  }
  /* arrow keys walk the grid: right and left trade p1 for p2, up and down trade p3 for the larger of the other two */
  function nudge(k,dx,dy){
    var c=k.slice();
    if(dx>0 && c[0]>0){ c[0]--; c[1]++; }
    else if(dx<0 && c[1]>0){ c[1]--; c[0]++; }
    else if(dy>0){ if(c[0]>0 && (c[0]>=c[1] || c[1]===0)){ c[0]--; c[2]++; } else if(c[1]>0){ c[1]--; c[2]++; } }
    else if(dy<0 && c[2]>0){ c[2]--; if(c[0]<=c[1]) c[0]++; else c[1]++; }
    return c;
  }
  /* in the (p1, p3) plane the arrows move p1 and p3 directly */
  function nudgeR(k,dx,dy){
    var c=k.slice();
    if(dx>0 && c[1]>0){ c[1]--; c[0]++; } else if(dx>0 && c[2]>0){ c[2]--; c[0]++; }
    else if(dx<0 && c[0]>0){ c[0]--; c[1]++; }
    else if(dy>0 && c[1]>0){ c[1]--; c[2]++; } else if(dy>0 && c[0]>0){ c[0]--; c[2]++; }
    else if(dy<0 && c[2]>0){ c[2]--; c[1]++; }
    return c;
  }
  function foot(X,a,b){
    var dx=b[0]-a[0], dy=b[1]-a[1], t=((X[0]-a[0])*dx+(X[1]-a[1])*dy)/(dx*dx+dy*dy);
    return [a[0]+t*dx, a[1]+t*dy];
  }
  /* outline, a faint grid of tenths (the lines p_n = 0.1, 0.2, ...) and the vertex labels */
  function triBase(svg,T,names,grid){
    var g=S('g',null,svg), m, j, l, k, P, Q;
    if(grid) for(m=0;m<3;m++){
      j=(m+1)%3; l=(m+2)%3;
      for(k=1;k<10;k++){ P=mixP(T.V[j],T.V[m],k/10); Q=mixP(T.V[l],T.V[m],k/10); line(g,P[0],P[1],Q[0],Q[1],'nf-grid'); }
    }
    S('path',{d:poly(T.V)+'Z','class':'mi5-tri'},g);
    text(g,T.V[0][0]-6,T.V[0][1]+18,names[0],'nf-lab','middle');
    text(g,T.V[1][0]+6,T.V[1][1]+18,names[1],'nf-lab','middle');
    text(g,T.V[2][0],T.V[2][1]-10,names[2],'nf-lab','middle');
    return g;
  }
  /* axes of the (p1, p3) triangle, ticks at quarters, and the outline */
  function rtBase(svg,T,xl,yl){
    var g=S('g',null,svg), i, v, t;
    for(i=0;i<=4;i++){
      v=i/4;
      line(g,C(T.x0+v*T.w),T.y0,C(T.x0+v*T.w),T.y0+4,'nf-ax'); text(g,T.x0+v*T.w,T.y0+17,tl(v),null,'middle');
      line(g,T.x0-4,C(T.y0-v*T.w),T.x0,C(T.y0-v*T.w),'nf-ax'); text(g,T.x0-7,T.y0-v*T.w+4,tl(v),null,'end');
    }
    S('path',{d:poly(T.V)+'Z','class':'mi5-tri'},g);
    text(g,T.x0+T.w/2,T.y0+34,xl,'nf-title','middle');
    t=text(g,0,0,yl,'nf-title','middle');
    t.setAttribute('transform','translate('+R(T.x0-38)+','+R(T.y0-T.w/2)+') rotate(-90)');
    return g;
  }
  /* the part of the line w1 p1 + w2 p2 + w3 p3 = c inside the triangle, or null */
  function level(T,w,c){
    var pts=[], i, j, a, b, e=1e-12;
    for(i=0;i<3;i++){
      j=(i+1)%3; a=w[i]-c; b=w[j]-c;
      if(Math.abs(a)<e && Math.abs(b)<e) return [T.V[i],T.V[j]];
      if(Math.abs(a)<e) pts.push(T.V[i]);
      else if(a*b<0 && Math.abs(b)>=e) pts.push(mixP(T.V[i],T.V[j],a/(a-b)));
    }
    return pts.length>=2?[pts[0],pts[1]]:null;
  }
  function segTo(e,P){ if(P) setLine(e,P[0][0],P[0][1],P[1][0],P[1][1]); else setLine(e,0,0,0,0); }
  /* the direction in which U = w . p rises fastest on screen, as an arrow of length len from P */
  function gradEnd(T,w,P,len){
    var u0=eu(w,T.bary(P[0],P[1])), a=eu(w,T.bary(P[0]+1,P[1]))-u0, b=eu(w,T.bary(P[0],P[1]+1))-u0, n=Math.hypot(a,b)||1;
    return [P[0]+a/n*len, P[1]+b/n*len, a/n, b/n];
  }
  function arrowHead(e,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, bx=x1-ux*8, by=y1-uy*8;
    e.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  function arrow(g,x0,y0,x1,y1,cls,hcls){
    var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, a=line(g,x0,y0,x1-dx/L*6,y1-dy/L*6,cls), h=S('path',{'class':hcls},g);
    arrowHead(h,x0,y0,x1,y1);
    return [a,h];
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
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+now.toFixed(3));
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
  /* tick values at a round step for the range lo..hi, about n of them */
  function nice(lo,hi,n){
    var span=hi-lo, step=Math.pow(10,Math.floor(Math.log(span/n)/Math.LN10)), err=span/n/step, t=[], v;
    if(err>=7.5) step*=10; else if(err>=3.5) step*=5; else if(err>=1.5) step*=2;
    for(v=Math.ceil(lo/step-1e-9)*step;v<=hi+1e-9;v+=step) t.push(Math.round(v/step)*step);
    return t;
  }
  /* labels sit on the side of a point away from the middle of the triangle; at a vertex they go sideways */
  function awayLab(T,X,d){
    var cx=(T.V[0][0]+T.V[1][0]+T.V[2][0])/3, cy=(T.V[0][1]+T.V[1][1]+T.V[2][1])/3, dx=X[0]-cx, dy=X[1]-cy, n=Math.hypot(dx,dy)||1;
    dx/=n; dy/=n;
    if(Math.hypot(X[0]-T.V[0][0],X[1]-T.V[0][1])<10){ dx=-0.7; dy=-0.7; }
    else if(Math.hypot(X[0]-T.V[1][0],X[1]-T.V[1][1])<10){ dx=0.7; dy=-0.7; }
    else if(Math.hypot(X[0]-T.V[2][0],X[1]-T.V[2][1])<10){ dx=1; dy=0; }
    return [X[0]+dx*d, X[1]+dy*d+4];
  }

  /* ---------- 1. The simplex: distances to the sides are the probabilities ---------- */
  NF.register('mi5-simplex',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, K0=[10,5,5], K=K0.slice(), areas=false, W=520, H=300, T, el={}, hs=[], api;
    var NAMES=['p₁','p₂','p₃'], OPP=[[1,2],[0,2],[0,1]], SUB=['₁','₂','₃'];
    var ab=fig.querySelector('.mi5-areas');
    function setAreas(v){ areas=!!v; if(ab) ab.setAttribute('aria-pressed',areas?'true':'false'); }
    if(ab) ab.addEventListener('click',function(){ setAreas(!areas); update(); });
    onClick(fig,'.nfig-reset',function(){ K=K0.slice(); setAreas(false); update(); });
    function draw(){
      var h, i;
      W=measure(svg); h=Math.round(Math.min(250,(W-90)*R3/2)); H=h+60;
      frame(svg,W,H);
      T=Tri(W/2-h/R3,h+30,h);
      el.area=[];
      for(i=0;i<3;i++) el.area.push(S('path',{'class':'mi5-area mi5-c'+(i+1)},svg));
      triBase(svg,T,['z₁','z₂','z₃'],true);
      el.drop=[]; el.rt=[]; el.dl=[];
      for(i=0;i<3;i++){
        el.drop.push(line(svg,0,0,0,0,'mi5-drop mi5-s'+(i+1)));
        el.rt.push(S('path',{'class':'mi5-rt mi5-s'+(i+1)},svg));
      }
      for(i=0;i<3;i++) el.dl.push(text(svg,0,0,NAMES[i],'mi5-dl mi5-f'+(i+1),'middle'));
      el.lab=text(svg,0,0,'L','nf-vlab nf-halo mi5-ink','middle');
      hs=[handle(svg,'mi5-k0','Lottery L, arrow keys move it',function(dx,dy){ K=nudge(K,dx,dy); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var p=probs(K,N), X=T.xy(p), i, a, b, F, M, ox, oy, len, ux, uy, d, sz=6, s, zeros=0, z=-1, nz=-1;
      place(hs[0],X[0],X[1],p[2],'L = '+triple(p,2));
      for(i=0;i<3;i++){
        a=T.V[OPP[i][0]]; b=T.V[OPP[i][1]];
        F=foot(X,a,b); M=mixP(a,b,0.5);
        ox=M[0]-T.V[i][0]; oy=M[1]-T.V[i][1]; len=Math.hypot(ox,oy); ox/=len; oy/=len;
        setLine(el.drop[i],X[0],X[1],F[0],F[1]);
        moveTo(el.dl[i],F[0]+ox*14,F[1]+oy*14+4);
        d=Math.hypot(X[0]-F[0],X[1]-F[1]);
        if(d>12){
          ux=b[0]-a[0]; uy=b[1]-a[1]; s=Math.hypot(ux,uy); ux/=s; uy/=s;
          el.rt[i].setAttribute('d',poly([[F[0]+ux*sz,F[1]+uy*sz],[F[0]+ux*sz-ox*sz,F[1]+uy*sz-oy*sz],[F[0]-ox*sz,F[1]-oy*sz]]));
        } else el.rt[i].setAttribute('d','');
        el.area[i].setAttribute('d',areas?poly([X,a,b])+'Z':'');
        if(K[i]===0){ zeros++; z=i; } else nz=i;
      }
      moveTo(el.lab,X[0],X[1]-15);
      if(!out) return;
      s='L = '+triple(p,2)+'   distances '+fmt(p[0],2)+' + '+fmt(p[1],2)+' + '+fmt(p[2],2)+' = 1.00';
      if(zeros===0) s+='\ninside: every prize can happen';
      else if(zeros===1) s+='\non the side opposite L'+SUB[z]+': z'+SUB[z]+' cannot happen';
      else s+='\nthe vertex L'+SUB[nz]+', the degenerate lottery: z'+SUB[nz]+' for sure';
      if(areas) s+='\nshaded areas: '+fmt(p[0],2)+', '+fmt(p[1],2)+' and '+fmt(p[2],2)+' of the triangle';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(K,N))]; },
      function(i,x,y){ K=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var p=probs(K,N); return {p1:p[0], p2:p[1], p3:p[2], sum:p[0]+p[1]+p[2], zeros:(K[0]===0)+(K[1]===0)+(K[2]===0), areas:areas}; },
      set:function(st){
        if('areas' in st) setAreas(st.areas===true || st.areas==='true');
        K=fromSet(st,['p1','p2','p3'],K,N); update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Compound lotteries and their reduced lottery ---------- */
  NF.register('mi5-compound',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* a grid of fortieths holds the example's lotteries (3/8 = 15/40) exactly */
    var N=40, A0=[[24,8,8],[4,12,24]], A=copyK(A0), al=0.3, ex='free', hold=false, W=520, H=300, T, el={}, hs=[], api, wide;
    var G4=[0.5,0.5,0], G5=[0.5,0,0.5];
    /* any move by hand leaves the example, so its ghost lotteries go */
    var ra=range(fig,'a',2,function(v){ al=v; if(!hold) ex='free'; update(); });
    if(ra) al=ra.v();
    function setA(v){ hold=true; if(ra) ra.set(v); hold=false; al=v; }
    function preset(){ A=[[40,0,0],[10,15,15]]; setA(1/3); ex='ex'; update(); }
    function reset(){ A=copyK(A0); setA(0.3); ex='free'; update(); }
    onClick(fig,'.mi5-ex',preset);
    onClick(fig,'.nfig-reset',reset);
    function aTxt(v){ return Math.abs(v-1/3)<1e-12?'⅓':Math.abs(v-2/3)<1e-12?'⅔':fmt(v,2); }
    function red(){ var p=probs(A[0],N), q=probs(A[1],N); return [al*p[0]+(1-al)*q[0], al*p[1]+(1-al)*q[1], al*p[2]+(1-al)*q[2]]; }
    function draw(){
      var h, i, tx, ty, g;
      W=measure(svg); wide=W>=560;
      if(wide){ h=Math.round(Math.min(230,(W*0.5-70)*R3/2)); H=h+62; T=Tri(46,h+30,h); tx=Math.round(W*0.5)+14; ty=Math.round(H/2-58); }
      else { h=Math.round(Math.min(230,(W-90)*R3/2)); H=h+62+134; T=Tri(W/2-h/R3,h+30,h); tx=16; ty=h+66; }
      frame(svg,W,H);
      triBase(svg,T,['z₁','z₂','z₃'],true);
      el.ghost=line(svg,0,0,0,0,'mi5-ghost');
      el.gd=[S('circle',{r:0,'class':'mi5-gdot'},svg),S('circle',{r:0,'class':'mi5-gdot'},svg)];
      el.gl=[text(svg,0,0,'','nf-lab nf-halo','middle'),text(svg,0,0,'','nf-lab nf-halo','middle')];
      el.seg=line(svg,0,0,0,0,'mi5-seg');
      el.w1=text(svg,0,0,'','mi5-small nf-halo','middle');
      el.w2=text(svg,0,0,'','mi5-small nf-halo','middle');
      el.red=S('circle',{r:5,'class':'mi5-red'},svg);
      el.rl=text(svg,0,0,'reduced','mi5-redt nf-halo','start');
      el.lab=[text(svg,0,0,'L₁','nf-vlab nf-halo nf-c1','middle'),text(svg,0,0,'L₂','nf-vlab nf-halo nf-c2','middle')];
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,'nf-v'+(i+1),'Lottery L'+(i+1)+', arrow keys move it',keyer(i)));
      /* the two stage tree: first the coin with weights alpha and 1 minus alpha, then the simple lottery */
      g=S('g',null,svg);
      el.tree={root:[tx+4,ty+44], l1:[tx+64,ty+16], l2:[tx+64,ty+72]};
      S('path',{d:poly([el.tree.l1,el.tree.root,el.tree.l2]),'class':'mi5-br'},g);
      S('circle',{cx:el.tree.root[0],cy:el.tree.root[1],r:3.5,'class':'mi5-node'},g);
      el.ta=text(g,tx+20,ty+20,'','nf-lab','middle');
      el.tb=text(g,tx+20,ty+80,'','nf-lab','middle');
      el.t1=text(g,tx+72,ty+20,'','mi5-tt nf-c1','start');
      el.t2=text(g,tx+72,ty+76,'','mi5-tt nf-c2','start');
      el.tr=text(g,tx,ty+108,'','mi5-redt','start');
      el.tg=text(g,tx,ty+124,'','nf-lab','start');
      update();
    }
    function keyer(i){ return function(dx,dy){ A[i]=nudge(A[i],dx,dy); ex='free'; update(); }; }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var p=[probs(A[0],N),probs(A[1],N)], X=[T.xy(p[0]),T.xy(p[1])], r=red(), Rp=T.xy(r), i, s, len, nx, ny, m1, m2, P4, P5;
      for(i=0;i<2;i++){
        place(hs[i],X[i][0],X[i][1],p[i][2],'L'+(i+1)+' = '+triple(p[i],3));
        moveTo(el.lab[i],X[i][0]+(i?13:-13),X[i][1]-11);
      }
      setLine(el.seg,X[0][0],X[0][1],X[1][0],X[1][1]);
      at(el.red,Rp[0],Rp[1]);
      len=Math.hypot(X[1][0]-X[0][0],X[1][1]-X[0][1]);
      /* the reduced point splits the segment (1 - alpha) : alpha, counted from L1 */
      if(len>70){
        nx=-(X[1][1]-X[0][1])/len; ny=(X[1][0]-X[0][0])/len; if(ny>0){ nx=-nx; ny=-ny; }
        m1=mixP(X[0],Rp,0.5); m2=mixP(Rp,X[1],0.5);
        moveTo(el.w1,m1[0]+nx*11,m1[1]+ny*11+4); el.w1.textContent='1 '+MINUS+' α';
        moveTo(el.w2,m2[0]+nx*11,m2[1]+ny*11+4); el.w2.textContent='α';
        moveTo(el.rl,Rp[0]-nx*9+6,Rp[1]-ny*9+12);
      } else { el.w1.textContent=''; el.w2.textContent=''; moveTo(el.rl,Rp[0]+8,Rp[1]+14); }
      if(ex==='ex'){
        P4=T.xy(G4); P5=T.xy(G5);
        setLine(el.ghost,P4[0],P4[1],P5[0],P5[1]);
        el.gd[0].setAttribute('r',4); at(el.gd[0],P4[0],P4[1]); el.gd[1].setAttribute('r',4); at(el.gd[1],P5[0],P5[1]);
        moveTo(el.gl[0],P4[0],P4[1]+17); el.gl[0].textContent='L₄';
        moveTo(el.gl[1],P5[0]-14,P5[1]+4); el.gl[1].textContent='L₅';
      } else {
        setLine(el.ghost,0,0,0,0); el.gd[0].setAttribute('r',0); el.gd[1].setAttribute('r',0);
        el.gl[0].textContent=''; el.gl[1].textContent='';
      }
      el.ta.textContent='α = '+aTxt(al);
      el.tb.textContent='1 '+MINUS+' α';
      el.t1.textContent='L₁ = '+triple(p[0],3);
      el.t2.textContent='L₂ = '+triple(p[1],3);
      el.tr.textContent='reduced: '+triple(r,3);
      el.tg.textContent=ex==='ex'?'½ L₄ + ½ L₅ = (0.500, 0.250, 0.250)':'';
      if(!out) return;
      s=aTxt(al)+' × '+triple(p[0],3)+' + '+aTxt(1-al)+' × '+triple(p[1],3)+'\n= '+triple(r,3);
      if(ex==='ex') s+='\nanother tree, ½ L₄ + ½ L₅ with L₄ = (½, ½, 0) and L₅ = (½, 0, ½), reduces to the same point';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(A[0],N)),T.xy(probs(A[1],N))]; },
      function(i,x,y){ A[i]=snap(T.bary(x,y),N); ex='free'; update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){
        var p=probs(A[0],N), q=probs(A[1],N), r=red();
        return {a:al, p11:p[0], p12:p[1], p13:p[2], p21:q[0], p22:q[1], p23:q[2], r1:r[0], r2:r[1], r3:r[2], ex:ex};
      },
      set:function(st){
        if('ex' in st){ if(st.ex==='ex') preset(); else reset(); }
        A[0]=fromSet(st,['p11','p12','p13'],A[0],N);
        A[1]=fromSet(st,['p21','p22','p23'],A[1],N);
        if('a' in st) setA(+st.a);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Four rational preferences over lotteries that are not expected utility ---------- */
  NF.register('mi5-examples',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, P0=[[20,0,0],[0,20,0]], P=copyK(P0), W=520, H=300, T, el={}, hs=[], api;
    var PREF={ml:'most likely', ss:'small supports', wc:'worst case', lex:'lexicographic'}, UW=['u₁','u₂','u₃'];
    var pref=seg(fig,'data-pref',function(v){ if(!PREF[v]) return; pref=v; draw(); if(api) api.changed(); });
    if(!PREF[pref]) pref='ml';
    onClick(fig,'.nfig-reset',function(){ P=copyK(P0); update(); });
    /* the utility of a lottery with probabilities p; worst case ranks z1 best and z3 worst, valued 1, 0.5, 0 */
    function val(p){
      var e=1e-9;
      if(pref==='ml') return Math.max(p[0],p[1],p[2]);
      if(pref==='ss') return -((p[0]>e)+(p[1]>e)+(p[2]>e));
      if(pref==='wc') return p[2]>e?0:p[1]>e?0.5:1;
      return null;
    }
    function cmp(a,b){
      var i;
      if(pref==='lex'){ for(i=0;i<3;i++) if(Math.abs(a[i]-b[i])>1e-9) return a[i]>b[i]?1:-1; return 0; }
      return sgn(val(a)-val(b));
    }
    function vTxt(v){ if(pref==='wc') return v===1?UW[0]:v===0.5?UW[1]:UW[2]; if(pref==='ss') return fmt(v,0); return fmt(v,2); }
    /* the set max_n p_n = c: for each n, the segment p_n = c with the other two at most c */
    function mlSet(c){
      var out2=[], n, a, b, lo, hi, p, q;
      for(n=0;n<3;n++){
        a=(n+1)%3; b=(n+2)%3; lo=Math.max(0,1-2*c); hi=Math.min(c,1-c);
        if(lo>hi+1e-12) continue;
        p=[]; p[n]=c; p[a]=lo; p[b]=1-c-lo; q=[]; q[n]=c; q[a]=hi; q[b]=1-c-hi;
        out2.push([T.xy(p),T.xy(q)]);
      }
      return out2;
    }
    function draw(){
      var h, g, c, n, i, P1, P2, Q, cx, cy, top;
      W=measure(svg); h=Math.round(Math.min(250,(W-90)*R3/2)); top=pref==='wc'?40:30; H=h+top+(pref==='wc'?48:34);
      frame(svg,W,H);
      T=Tri(W/2-h/R3,h+top,h);
      g=S('g',null,svg);
      cx=T.x0+T.s/2; cy=T.yb-T.h/3;
      if(pref==='ml'){
        for(c=4;c<=9;c++){
          Q=mlSet(c/10);
          for(n=0;n<Q.length;n++) line(g,Q[n][0][0],Q[n][0][1],Q[n][1][0],Q[n][1][1],'mi5-lev');
        }
        text(g,cx,cy+4,'⅓','nf-lab','middle');
      } else if(pref==='ss'){
        S('path',{d:poly(T.V)+'Z','class':'mi5-reg'},g);
        for(i=0;i<3;i++){ P1=T.V[i]; P2=T.V[(i+1)%3]; line(g,P1[0],P1[1],P2[0],P2[1],'mi5-redge'); }
        for(i=0;i<3;i++) S('circle',{cx:R(T.V[i][0]),cy:R(T.V[i][1]),r:6,'class':'mi5-rvert'},g);
        text(g,cx,cy-4,'interior','nf-lab','middle'); text(g,cx,cy+11,'U = '+MINUS+'3','nf-lab','middle');
        P1=mixP(T.V[1],T.V[2],0.5); text(g,P1[0]+14,P1[1],'edges U = '+MINUS+'2','mi5-redt2 nf-halo','start');
        text(g,T.V[2][0]+12,T.V[2][1]+4,'vertices U = '+MINUS+'1','mi5-bluet nf-halo','start');
      } else if(pref==='wc'){
        S('path',{d:poly(T.V)+'Z','class':'mi5-reg'},g);
        line(g,T.V[0][0],T.V[0][1],T.V[1][0],T.V[1][1],'mi5-redge');
        S('circle',{cx:R(T.V[0][0]),cy:R(T.V[0][1]),r:6,'class':'mi5-rvert'},g);
        text(g,cx,cy+4,'p₃ > 0: U = u₃','nf-lab','middle');
        text(g,cx,T.yb+34,'p₃ = 0 < p₂: U = u₂','mi5-redt2','middle');
        text(g,T.V[0][0]-10,T.V[0][1]-12,'U = u₁','mi5-bluet nf-halo','end');
      } else {
        /* lexicographic: lines of equal p1 run parallel to the side opposite z1 */
        for(c=1;c<10;c++){ P1=mixP(T.V[1],T.V[0],c/10); P2=mixP(T.V[2],T.V[0],c/10); line(g,P1[0],P1[1],P2[0],P2[1],'mi5-lexl'); }
        el.lx=line(g,0,0,0,0,'mi5-lexon');
        el.a1=arrow(g,0,0,1,1,'mi5-ar1','mi5-ar1h');
        el.a2=arrow(g,0,0,1,1,'mi5-ar2','mi5-ar2h');
        el.t1=text(g,0,0,'p₁ ↑ wins','mi5-redt2 nf-halo','end');
        el.t2=text(g,0,0,'tie in p₁: p₂ ↑ wins','mi5-bluet nf-halo','start');
      }
      triBase(svg,T,pref==='wc'?['z₁ best','z₂','z₃ worst']:['z₁','z₂','z₃'],false);
      el.set=[S('path',{'class':'mi5-set1'},svg),S('path',{'class':'mi5-set2'},svg)];
      el.setd=[S('g',null,svg),S('g',null,svg)];
      el.chord=line(svg,0,0,0,0,'mi5-chord');
      el.m=S('circle',{r:5,'class':'mi5-mdot'},svg);
      el.ml=text(svg,0,0,'M','mi5-mt nf-halo','middle');
      el.lab=[text(svg,0,0,'L','nf-vlab nf-halo nf-c1','middle'),text(svg,0,0,'L′','nf-vlab nf-halo nf-c2','middle')];
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,'nf-v'+(i+1),'Lottery '+(i?'L′':'L')+', arrow keys move it',keyer(i)));
      update();
    }
    function keyer(i){ return function(dx,dy){ P[i]=nudge(P[i],dx,dy); update(); }; }
    function update(){ paint(); if(api) api.changed(); }
    function st(){
      var L=probs(P[0],N), L1=probs(P[1],N), M=[(L[0]+L1[0])/2,(L[1]+L1[1])/2,(L[2]+L1[2])/2];
      var o={L:L, L1:L1, M:M, s:cmp(L,L1), sm:cmp(M,L), sm1:cmp(M,L1)};
      /* what independence asks of the midpoint: M ~ L when L ~ L', and L > M > L' when L > L' */
      if(o.s===0) o.ok=o.sm===0;
      else o.ok=(o.s>0?(o.sm<0 && o.sm1>0):(o.sm>0 && o.sm1<0));
      return o;
    }
    function paint(){
      var o=st(), X=[T.xy(o.L),T.xy(o.L1)], Y=T.xy(o.M), i, j, s, Q, d, g, A, B, E, gx, gy, v;
      for(i=0;i<2;i++){
        place(hs[i],X[i][0],X[i][1],o[i?'L1':'L'][2],(i?'L′':'L')+' = '+triple(o[i?'L1':'L'],2));
        A=awayLab(T,X[i],17); moveTo(el.lab[i],A[0],A[1]);
      }
      setLine(el.chord,X[0][0],X[0][1],X[1][0],X[1][1]);
      at(el.m,Y[0],Y[1]);
      d=Math.hypot(X[1][0]-X[0][0],X[1][1]-X[0][1])||1;
      moveTo(el.ml,Y[0]-(X[1][1]-X[0][1])/d*13,Y[1]+(X[1][0]-X[0][0])/d*13+4);
      if(Y[1]+(X[1][0]-X[0][0])/d*13>T.yb-2) moveTo(el.ml,Y[0]+(X[1][1]-X[0][1])/d*13,Y[1]-(X[1][0]-X[0][0])/d*13+4);
      /* the indifference set of each of L and L' */
      for(i=0;i<2;i++){
        g=el.setd[i]; while(g.firstChild) g.removeChild(g.firstChild);
        s='';
        if(pref==='ml'){
          v=val(o[i?'L1':'L']); Q=mlSet(v);
          for(j=0;j<Q.length;j++){
            if(Math.hypot(Q[j][0][0]-Q[j][1][0],Q[j][0][1]-Q[j][1][1])<1) S('circle',{cx:R(Q[j][0][0]),cy:R(Q[j][0][1]),r:3.5,'class':'mi5-setd'+(i+1)},g);
            else s+=poly(Q[j]);
          }
        }
        el.set[i].setAttribute('d',s);
      }
      if(pref==='lex'){
        A=mixP(T.V[1],T.V[0],o.L[0]); B=mixP(T.V[2],T.V[0],o.L[0]);
        setLine(el.lx,A[0],A[1],B[0],B[1]);
        /* p1 up points straight at z1, across the lines of equal p1; along such a line p2 up points from the z3 side to the z2 side */
        /* the arrows start from a fixed point inside, so they never run off the triangle when L sits on a side */
        Q=T.xy([0.4,0.3,0.3]);
        E=T.xy([0,0.5,0.5]); gx=T.V[0][0]-E[0]; gy=T.V[0][1]-E[1]; d=Math.hypot(gx,gy)||1; gx/=d; gy/=d;
        setLine(el.a1[0],Q[0],Q[1],Q[0]+gx*34,Q[1]+gy*34); arrowHead(el.a1[1],Q[0],Q[1],Q[0]+gx*40,Q[1]+gy*40);
        moveTo(el.t1,Q[0]+gx*40-4,Q[1]+gy*40-8);
        gx=T.V[1][0]-T.V[2][0]; gy=T.V[1][1]-T.V[2][1]; d=Math.hypot(gx,gy)||1; gx/=d; gy/=d;
        setLine(el.a2[0],Q[0],Q[1],Q[0]+gx*34,Q[1]+gy*34); arrowHead(el.a2[1],Q[0],Q[1],Q[0]+gx*40,Q[1]+gy*40);
        moveTo(el.t2,Q[0]+gx*40+8,Q[1]+gy*40+8);
      }
      if(!out) return;
      if(pref==='lex'){
        for(i=0;i<3 && Math.abs(o.L[i]-o.L1[i])<1e-9;i++);
        s='no utility: compare p₁, then p₂, then p₃\nL '+rel(o.s)+' L′'+(i<3?', decided by p'+['₁','₂','₃'][i]+': '+fmt(o.L[i],2)+' against '+fmt(o.L1[i],2):', the same lottery')+
          '\nM = ½L + ½L′ = '+triple(o.M,2)+':   L '+rel(-o.sm)+' M '+rel(o.sm1)+' L′;   each indifference set is a single point';
      } else {
        s='U(L) = '+vTxt(val(o.L))+'   U(L′) = '+vTxt(val(o.L1))+'   so L '+rel(o.s)+' L′'+
          '\nM = ½L + ½L′ = '+triple(o.M,2)+':   U(M) = '+vTxt(val(o.M))+',   L '+rel(-o.sm)+' M '+rel(o.sm1)+' L′';
      }
      out.textContent=s;
      if(o.ok) out.appendChild(document.createTextNode('\nas independence requires'+(pref==='lex'?'; continuity fails instead':'')));
      else warn(out,o.s===0?'\nindependence needs M ∼ L: the indifference set is not a straight line, so no EU':'\nindependence needs M strictly between L and L′, so no EU');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return P.map(function(k){ return T.xy(probs(k,N)); }); },
      function(i,x,y){ P[i]=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){
        var o=st();
        return {pref:pref, l1:o.L[0], l2:o.L[1], l3:o.L[2], m1:o.L1[0], m2:o.L1[1], m3:o.L1[2], rel:o.s, ok:o.ok};
      },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        P[0]=fromSet(s,['l1','l2','l3'],P[0],N);
        P[1]=fromSet(s,['m1','m2','m3'],P[1],N);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Continuity along a mixture ---------- */
  NF.register('mi5-cont',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var CASE={ss:'small supports', wc:'worst case', eu:'death, expected utility', sf:'death, survival first'};
    var al=0.5, d=-100, W=520, H=300, el={}, api, xs, ys, m;
    var ra=range(fig,'a',3,function(v){ al=v; update(); });
    if(ra) al=ra.v();
    var rd=range(fig,'d',0,function(v){ d=v; draw(); });
    if(rd) d=rd.v();
    var cs=seg(fig,'data-case',function(v){ if(!CASE[v]) return; cs=v; draw(); });
    if(!CASE[cs]) cs='ss';
    onClick(fig,'.nfig-reset',function(){ if(rd) rd.set(-100); if(ra) ra.set(0.5); });
    /* U along alpha L + (1 - alpha) L'', the value of L', the curve as segments, open and filled dots, and the two sets */
    function model(){
      var s;
      if(cs==='ss') return {f:function(a){ return a<=0 || a>=1 ? -1 : -2; }, ul:-2, segs:[[0,-2,1,-2]], open:[[0,-2],[1,-2]], dots:[[0,-1],[1,-1]],
        up:[[0,1,true,true]], dn:[[0,1,false,false]]};
      if(cs==='wc') return {f:function(a){ return a>=1 ? 1 : 0; }, ul:0.5, segs:[[0,0,1,0]], open:[[1,0]], dots:[[1,1],[0,0]],
        up:[[1,1,true,true]], dn:[[0,1,true,false]]};
      if(cs==='eu'){ s=-d/(1-d); return {f:function(a){ return a+(1-a)*d; }, ul:0, segs:[[0,d,1,1]], open:[], dots:[], star:s,
        up:[[s,1,true,true]], dn:[[0,s,true,true]]}; }
      return {f:function(a){ return a>=1 ? 1 : a-1; }, ul:0, segs:[[0,-1,1,0]], open:[[1,0]], dots:[[1,1]],
        up:[[1,1,true,true]], dn:[[0,1,true,false]]};
    }
    function closed(I){ for(var i=0;i<I.length;i++) if(!I[i][2] || !I[i][3]) return false; return true; }
    function setTxt(I,dec){
      var s=[], i, a, b;
      for(i=0;i<I.length;i++){
        a=I[i][0]; b=I[i][1];
        s.push(Math.abs(a-b)<1e-12?'{'+fmt(a,0)+'}':(I[i][2]?'[':'(')+(a===0||a===1?fmt(a,0):fmt(a,dec))+', '+fmt(b,0)+(I[i][3]?']':')'));
      }
      return s.join(' ∪ ');
    }
    function bar(g,I,y,cls){
      var i, a, b;
      for(i=0;i<I.length;i++){
        a=xs(I[i][0]); b=xs(I[i][1]);
        if(b-a>0.5) line(g,a,y,b,y,cls);
        S('circle',{cx:R(a),cy:R(y),r:4.5,'class':I[i][2]?'mi5-bdot '+cls+'d':'mi5-bopen '+cls+'o'},g);
        if(b-a>0.5) S('circle',{cx:R(b),cy:R(y),r:4.5,'class':I[i][3]?'mi5-bdot '+cls+'d':'mi5-bopen '+cls+'o'},g);
      }
    }
    function draw(){
      var g, lo, hi, pad, ticks, i, v, px0=54, px1, py0=22, py1=170, yb1, yb2, sq;
      W=measure(svg); px1=W-18; yb1=py1+58; yb2=yb1+38; H=yb2+14;
      frame(svg,W,H);
      if(rd) rd.wrap.classList.toggle('is-off',cs!=='eu');
      if(rd) rd.el.disabled=cs!=='eu';
      m=model();
      lo=Math.min(m.ul,m.segs[0][1],m.segs[0][3]); hi=Math.max(m.ul,m.segs[0][1],m.segs[0][3]);
      for(i=0;i<m.dots.length;i++){ lo=Math.min(lo,m.dots[i][1]); hi=Math.max(hi,m.dots[i][1]); }
      pad=(hi-lo)*0.12; lo-=pad; hi+=pad;
      xs=lin(0,1,px0,px1); ys=lin(lo,hi,py1,py0);
      g=S('g',null,svg);
      ticks=nice(lo,hi,4);
      for(i=0;i<ticks.length;i++){ v=ticks[i]; line(g,px0,C(ys(v)),px1,C(ys(v)),'nf-grid'); text(g,px0-7,ys(v)+4,tl(v),null,'end'); }
      line(g,px0,C(py1),px1,C(py1),'nf-ax');
      for(i=0;i<=4;i++){ v=i/4; line(g,C(xs(v)),py1,C(xs(v)),py1+4,'nf-ax'); text(g,xs(v),py1+17,tl(v),null,'middle'); }
      text(g,px1,py1+32,cs==='eu'||cs==='sf'?'α, the chance of £10 (else death)':'α','nf-title','end');
      text(g,px0-7,py0-9,cs==='sf'?'rank along the mixture, £0 at 0':'U(αL + (1 '+MINUS+' α)L″)','nf-title','start');
      line(g,px0,ys(m.ul),px1,ys(m.ul),'mi5-lp');
      text(g,px0+6,ys(m.ul)-6,cs==='ss'?'U(L′) = '+MINUS+'2':cs==='wc'?'U(L′) = u₂':'£0 = L′','mi5-lpt nf-halo','start');
      if(m.star!==undefined){
        line(g,C(xs(m.star)),py0,C(xs(m.star)),py1,'mi5-star');
        text(g,xs(m.star)-6,ys(lo+(hi-lo)*0.45),'α* = '+fmt(m.star,3),'mi5-start nf-halo','end');
      }
      for(i=0;i<m.segs.length;i++) line(g,xs(m.segs[i][0]),ys(m.segs[i][1]),xs(m.segs[i][2]),ys(m.segs[i][3]),'mi5-curve');
      for(i=0;i<m.open.length;i++) S('circle',{cx:R(xs(m.open[i][0])),cy:R(ys(m.open[i][1])),r:4.5,'class':'mi5-copen'},g);
      for(i=0;i<m.dots.length;i++) S('circle',{cx:R(xs(m.dots[i][0])),cy:R(ys(m.dots[i][1])),r:4.5,'class':'mi5-cdot'},g);
      el.pv=line(svg,0,0,0,0,'mi5-probe');
      el.pd=S('circle',{r:5,'class':'mi5-pdot'},svg);
      /* the two sets on the alpha axis, closed ends filled, open ends hollow */
      g=S('g',null,svg);
      sq=cs==='eu'||cs==='sf'?'£0':'L′';
      text(g,px0,yb1-10,'{α : mix ≿ '+sq+'} = '+setTxt(m.up,3)+(closed(m.up)?', closed':', not closed'),closed(m.up)?'mi5-upt':'mi5-upt mi5-bad','start');
      bar(g,m.up,yb1,'mi5-up');
      text(g,px0,yb2-10,'{α : '+sq+' ≿ mix} = '+setTxt(m.dn,3)+(closed(m.dn)?', closed':', not closed'),closed(m.dn)?'mi5-dnt':'mi5-dnt mi5-bad','start');
      bar(g,m.dn,yb2,'mi5-dn');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var u=m.f(al), s, r=sgn(u-m.ul), ok=closed(m.up) && closed(m.dn);
      setLine(el.pv,C(xs(al)),ys(u),C(xs(al)),ys(m.ul));
      at(el.pd,xs(al),ys(u));
      if(!out) return;
      if(cs==='ss') s='U = '+MINUS+'|supp|;   L = L₁,  L″ = L₂,  L′ = (½, ½, 0)\nα = '+fmt(al,3)+':   mix = '+triple([al,1-al,0],2)+',   U = '+fmt(u,0)+',   so mix '+rel(r)+' L′';
      else if(cs==='wc') s='worst case with u₁ = 1 > u₂ = 0.5 > u₃ = 0;   L = L₁,  L″ = L₃,  L′ = L₂\nα = '+fmt(al,3)+':   mix = '+triple([al,0,1-al],2)+',   U = '+fmt(u,1)+',   so mix '+rel(r)+' L′';
      else if(cs==='eu') s='EU with u(£10) = 1,  u(£0) = 0,  u(death) = '+fmt(d,0)+'\nα = '+fmt(al,3)+':   U = α + (1 '+MINUS+' α)u(death) = '+fmt(u,2)+',   so mix '+rel(r)+' £0';
      else s='survival first: the smaller chance of death wins, then more money\nα = '+fmt(al,3)+':   death with '+fmt(1-al,3)+(al>=1?', none: £10 for sure ≻ £0':' > 0, so £0 ≻ mix');
      out.textContent=s;
      if(ok) out.appendChild(document.createTextNode('\nboth sets closed'+(m.star!==undefined?':   at α* = '+fmt(m.star,3)+' a death risk of '+fmt(1-m.star,4)+' is worth £10':'')));
      else warn(out,'\na set is not closed: continuity fails'+(cs==='sf'?', no α < 1 compensates the death risk':''));
    }
    api=NF.api({
      get:function(){ var mm=model(); return {cs:cs, a:al, d:d, u:mm.f(al), star:mm.star===undefined?-1:mm.star, ok:closed(mm.up) && closed(mm.dn)}; },
      set:function(s){
        if('cs' in s) NF.press(fig,'data-case',String(s.cs));
        if('d' in s && rd) rd.set(+s.d);
        if('a' in s && ra) ra.set(+s.a);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. The slope of expected utility lines in the (p1, p3) triangle ---------- */
  NF.register('mi5-slopes',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, K0=[6,8,6], K=K0.slice(), u2=0.8, W=520, H=300, T, el={}, hs=[], api;
    var ru=range(fig,'u',2,function(v){ u2=v; update(); });
    if(ru) u2=ru.v();
    var ev=toggle(fig,'.mi5-evb',function(){ update(); });
    onClick(fig,'.nfig-reset',function(){ K=K0.slice(); ev.set(true); if(ru) ru.set(0.8); });
    function draw(){
      var w, c;
      W=measure(svg); w=Math.round(Math.min(260,W-110)); H=w+60;
      frame(svg,W,H);
      T=RTri(58,w+14,w);
      rtBase(svg,T,'p₁, the chance of the worst prize','p₃, the chance of the best prize');
      el.ev=[]; el.lev=[];
      for(c=1;c<10;c++) el.ev.push(line(svg,0,0,0,0,'mi5-ev'));
      for(c=1;c<10;c++) el.lev.push(line(svg,0,0,0,0,'mi5-gl'));
      el.lv=line(svg,0,0,0,0,'mi5-plev');
      el.ar=arrow(svg,0,0,1,1,'mi5-arr','mi5-arrh');
      el.art=text(svg,0,0,'U ↑','nf-lab nf-halo','start');
      el.att=[text(svg,T.x0+T.w*0.5,T.y0-T.w*0.86,'','mi5-flagt','start'),text(svg,T.x0+T.w*0.5,T.y0-T.w*0.86+15,'','mi5-flagt','start'),text(svg,T.x0+T.w*0.5,T.y0-T.w*0.86+30,'','nf-lab','start')];
      el.lab=text(svg,0,0,'L','nf-vlab nf-halo mi5-ink','start');
      hs=[handle(svg,'mi5-k0','Lottery L, arrow keys move p1 and p3',function(dx,dy){ K=nudgeR(K,dx,dy); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function att(){ return u2>0.5+1e-9?'risk averse':u2<0.5-1e-9?'risk loving':'risk neutral'; }
    function paint(){
      var wv=[0,u2,1], p=probs(K,N), X=T.xy(p), c, on=ev.on(), A, E, sl=u2/(1-u2), s;
      for(c=1;c<10;c++){ segTo(el.lev[c-1],level(T,wv,c/10)); segTo(el.ev[c-1],on?level(T,[0,5,10],c):null); }
      segTo(el.lv,level(T,wv,eu(wv,p)));
      A=T.xy([0.62,0.28,0.1]); E=gradEnd(T,wv,A,36);
      setLine(el.ar[0],A[0],A[1],E[0]-E[2]*6,E[1]-E[3]*6); arrowHead(el.ar[1],A[0],A[1],E[0],E[1]); moveTo(el.art,E[0]+5,E[1]-2);
      el.att[0].textContent='money (0, 5, 10):';
      el.att[1].textContent=att();
      el.att[2].textContent='slope '+fmt(sl,2);
      place(hs[0],X[0],X[1],p[2],'L = '+triple(p,2));
      moveTo(el.lab,X[0]+10,X[1]-10);
      if(!out) return;
      s='u = (0, '+fmt(u2,2)+', 1):   slope (u₂ '+MINUS+' u₁) ÷ (u₃ '+MINUS+' u₂) = '+fmt(u2,2)+' ÷ '+fmt(1-u2,2)+' = '+fmt(sl,2)+
        '\nmoney (0, 5, 10): u₂ '+(u2>0.5+1e-9?'>':u2<0.5-1e-9?'<':'=')+' 0.5, '+att()+(on?', lines '+(sl>1+1e-9?'steeper than':sl<1-1e-9?'flatter than':'on')+' the dashed expected value lines (slope 1)':'')+
        '\nL = '+triple(p,2)+':   U(L) = '+fmt(eu(wv,p),3)+',   expected prize £'+fmt(5*p[1]+10*p[2],2);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(K,N))]; },
      function(i,x,y){ K=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var p=probs(K,N); return {u2:u2, slope:u2/(1-u2), ev:ev.on(), p1:p[0], p2:p[1], p3:p[2], eu:eu([0,u2,1],p)}; },
      set:function(s){
        if('ev' in s) ev.set(s.ev===true || s.ev==='true');
        K=fromSet(s,['p1','p2','p3'],K,N);
        if('u2' in s && ru) ru.set(+s.u2); else update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. Independence: mix two lotteries with a common third ---------- */
  NF.register('mi5-indep',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, U=[0,0.6,1], P0=[[10,0,10],[6,10,4],[18,2,0]], P=copyK(P0), al=0.5, W=520, H=300, T, el={}, hs=[], api;
    var NAMES=['L','L′','L″'], PREF={eu:'expected utility', ml:'most likely', wc:'worst case'};
    var ra=range(fig,'a',2,function(v){ al=v; update(); });
    if(ra) al=ra.v();
    var pref=seg(fig,'data-pref',function(v){ if(!PREF[v]) return; pref=v; draw(); if(api) api.changed(); });
    if(!PREF[pref]) pref='eu';
    onClick(fig,'.nfig-reset',function(){ P=copyK(P0); if(ra) ra.set(0.5); update(); });
    function val(p){
      if(pref==='ml') return Math.max(p[0],p[1],p[2]);
      if(pref==='wc') return p[0]>1e-12?U[0]:p[1]>1e-12?U[1]:U[2];
      return eu(U,p);
    }
    function state(){
      var L=probs(P[0],N), L1=probs(P[1],N), L2=probs(P[2],N), M=[], M1=[], i, o;
      for(i=0;i<3;i++){ M[i]=al*L[i]+(1-al)*L2[i]; M1[i]=al*L1[i]+(1-al)*L2[i]; }
      o={L:L, L1:L1, L2:L2, M:M, M1:M1, ul:val(L), ulp:val(L1), um:val(M), ump:val(M1)};
      o.s1=sgn(o.ul-o.ulp); o.s2=sgn(o.um-o.ump);
      o.viol=o.s1===o.s2?'none':o.s1*o.s2===-1?'flip':'tie';
      return o;
    }
    function draw(){
      var h, g, i, c, n, a, b, lo, hi, p, q, A, E, rows=0;
      W=measure(svg); h=Math.round(Math.min(250,(W-90)*R3/2));
      frame(svg,W,h+60);
      if(pref==='wc') rows=key(S('g',null,svg),[['rect','mi5-wc mi5-sw','U = 0, any chance of −£2'],['line','mi5-wcedge','U = 0.6'],['rect','mi5-wctop','U = 1']],8,13,W-8);
      else if(pref==='ml') rows=key(S('g',null,svg),[['line','mi5-lev','largest probability = 0.4, 0.5, …, 0.9']],8,13,W-8);
      else rows=key(S('g',null,svg),[['line','mi5-lev','indifference lines, U = 0.1, …, 0.9']],8,13,W-8);
      H=h+60+rows*16; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      T=Tri(W/2-h/R3,h+30+rows*16,h);
      triBase(svg,T,['−£2','£4','£10'],false);
      g=S('g',null,svg);
      if(pref==='eu'){
        for(c=1;c<10;c++) segTo(line(g,0,0,0,0,'mi5-lev'),level(T,U,c/10));
        A=T.xy([0.08,0.62,0.3]); E=gradEnd(T,U,A,34);
        arrow(g,A[0],A[1],E[0],E[1],'mi5-arr','mi5-arrh');
        text(g,E[0]+6,E[1]+4,'better','nf-lab nf-halo','start');
      } else if(pref==='ml'){
        for(c=4;c<=9;c++) for(n=0;n<3;n++){
          a=(n+1)%3; b=(n+2)%3; lo=Math.max(0,1-2*c/10); hi=Math.min(c/10,1-c/10);
          if(lo>hi+1e-12) continue;
          p=[]; p[n]=c/10; p[a]=lo; p[b]=1-c/10-lo; q=[]; q[n]=c/10; q[a]=hi; q[b]=1-c/10-hi;
          A=T.xy(p); E=T.xy(q); line(g,A[0],A[1],E[0],E[1],'mi5-lev');
        }
      } else {
        S('path',{d:poly(T.V)+'Z','class':'mi5-wc'},g);
        line(g,T.V[1][0],T.V[1][1],T.V[2][0],T.V[2][1],'mi5-wcedge');
        S('circle',{cx:R(T.V[2][0]),cy:R(T.V[2][1]),r:5,'class':'mi5-wctop'},g);
      }
      el.ray=[line(svg,0,0,0,0,'mi5-ray'),line(svg,0,0,0,0,'mi5-ray')];
      el.ch=line(svg,0,0,0,0,'mi5-chord');
      el.chm=line(svg,0,0,0,0,'mi5-chordm');
      el.m=[S('circle',{r:5,'class':'mi5-mdot'},svg),S('circle',{r:5,'class':'mi5-mdot'},svg)];
      el.ml=[text(svg,0,0,'M','mi5-mt nf-halo','middle'),text(svg,0,0,'M′','mi5-mt nf-halo','middle')];
      el.lab=[text(svg,0,0,'L','nf-vlab nf-halo nf-c1','middle'),text(svg,0,0,'L′','nf-vlab nf-halo nf-c2','middle'),text(svg,0,0,'L″','nf-vlab nf-halo mi5-ink','middle')];
      hs=[];
      for(i=0;i<3;i++) hs.push(handle(svg,i<2?'nf-v'+(i+1):'mi5-k0','Lottery '+NAMES[i]+', arrow keys move it',keyer(i)));
      update();
    }
    function keyer(i){ return function(dx,dy){ P[i]=nudge(P[i],dx,dy); update(); }; }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var o=state(), X=[T.xy(o.L),T.xy(o.L1),T.xy(o.L2)], Y=[T.xy(o.M),T.xy(o.M1)], i, s, dx, dy, d, A;
      for(i=0;i<3;i++){
        place(hs[i],X[i][0],X[i][1],o[['L','L1','L2'][i]][2],NAMES[i]+' = '+triple(o[['L','L1','L2'][i]],2));
        A=awayLab(T,X[i],17); moveTo(el.lab[i],A[0],A[1]);
      }
      for(i=0;i<2;i++){
        setLine(el.ray[i],X[2][0],X[2][1],X[i][0],X[i][1]);
        at(el.m[i],Y[i][0],Y[i][1]);
        dx=Y[i][0]-X[2][0]; dy=Y[i][1]-X[2][1]; d=Math.hypot(dx,dy)||1;
        moveTo(el.ml[i],Y[i][0]+(i?1:-1)*dy/d*13,Y[i][1]-(i?1:-1)*dx/d*13+4);
      }
      setLine(el.ch,X[0][0],X[0][1],X[1][0],X[1][1]);
      setLine(el.chm,Y[0][0],Y[0][1],Y[1][0],Y[1][1]);
      if(!out) return;
      s=PREF[pref]+':   U(L) = '+fmt(o.ul,3)+'   U(L′) = '+fmt(o.ulp,3)+'   so L '+rel(o.s1)+' L′'+
        '\nmixed with L″ at α = '+fmt(al,2)+':   U(M) = '+fmt(o.um,3)+'   U(M′) = '+fmt(o.ump,3)+'   so M '+rel(o.s2)+' M′';
      out.textContent=s;
      if(o.viol==='none') out.appendChild(document.createTextNode(', the same order'));
      else warn(out,o.viol==='flip'?', the order flips: independence fails':', one comparison is a tie and the other is not: independence fails');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return P.map(function(k){ return T.xy(probs(k,N)); }); },
      function(i,x,y){ P[i]=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){
        var o=state();
        return {pref:pref, a:al, l1:o.L[0], l2:o.L[1], l3:o.L[2], m1:o.L1[0], m2:o.L1[1], m3:o.L1[2], n1:o.L2[0], n2:o.L2[1], n3:o.L2[2],
          ul:o.ul, ulp:o.ulp, um:o.um, ump:o.ump, viol:o.viol, dm:o.um-o.ump, adl:al*(o.ul-o.ulp)};
      },
      set:function(st){
        if('pref' in st) NF.press(fig,'data-pref',String(st.pref));
        P[0]=fromSet(st,['l1','l2','l3'],P[0],N);
        P[1]=fromSet(st,['m1','m2','m3'],P[1],N);
        P[2]=fromSet(st,['n1','n2','n3'],P[2],N);
        if('a' in st && ra) ra.set(+st.a);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. Monotonicity in probabilities: pL + (1 - p)L' along the segment from L' to L ---------- */
  NF.register('mi5-mono',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, U=[0,0.6,1], P0=[[2,8,10],[16,4,0]], P=copyK(P0), pp=0.6, W=520, H=300, T, el={}, hs=[], api, xs, ys, wide;
    var rp=range(fig,'p',2,function(v){ pp=v; update(); });
    if(rp) pp=rp.v();
    onClick(fig,'.nfig-reset',function(){ P=copyK(P0); if(rp) rp.set(0.6); });
    function draw(){
      var h, g, c, i, cx0, cx1, cy0, cy1;
      W=measure(svg); wide=W>=560;
      if(wide){ h=Math.round(Math.min(230,(W*0.54-80)*R3/2)); T=Tri(58,h+30,h); cx0=Math.round(W*0.6)+24; cx1=W-18; cy0=36; cy1=h+14; H=h+64; }
      else { h=Math.round(Math.min(230,(W-110)*R3/2)); T=Tri(W/2-h/R3,h+30,h); cx0=48; cx1=W-24; cy0=h+90; cy1=h+214; H=h+252; }
      frame(svg,W,H);
      g=S('g',null,svg);
      for(c=1;c<10;c++) segTo(line(g,0,0,0,0,'mi5-lev'),level(T,U,c/10));
      triBase(svg,T,['z₁, u = 0','z₂, u = 0.6','z₃, u = 1'],false);
      el.seg=line(svg,0,0,0,0,'mi5-mseg');
      el.q=[];
      for(i=0;i<=5;i++) el.q.push(S('circle',{r:4,'class':'mi5-q mi5-q'+i},svg));
      el.x=S('circle',{r:5.5,'class':'mi5-red'},svg);
      el.lab=[text(svg,0,0,'L','nf-vlab nf-halo nf-c1','middle'),text(svg,0,0,'L′','nf-vlab nf-halo nf-c2','middle')];
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,'nf-v'+(i+1),'Lottery '+(i?'L′':'L')+', arrow keys move it',keyer(i)));
      /* U of the mixture against p: a straight line from U(L') to U(L) */
      g=S('g',null,svg);
      xs=lin(0,1,cx0,cx1); ys=lin(0,1,cy1,cy0);
      for(i=0;i<=4;i++){ line(g,C(xs(i/4)),cy1,C(xs(i/4)),cy1+4,'nf-ax'); text(g,xs(i/4),cy1+17,tl(i/4),null,'middle'); }
      for(i=0;i<=2;i++){ line(g,cx0,C(ys(i/2)),cx1,C(ys(i/2)),i?'nf-grid':'nf-ax'); text(g,cx0-7,ys(i/2)+4,tl(i/2),null,'end'); }
      text(g,cx1,cy1+32,'p','nf-title','end');
      text(g,cx0-7,cy0-14,'U(pL + (1 '+MINUS+' p)L′)','nf-title','start');
      el.cl=line(g,0,0,0,0,'mi5-cline');
      el.cq=[];
      for(i=0;i<=5;i++) el.cq.push(S('circle',{r:3.5,'class':'mi5-q mi5-q'+i},g));
      el.cv=line(g,0,0,0,0,'mi5-probe');
      el.cx=S('circle',{r:5,'class':'mi5-red'},g);
      el.ct=text(g,0,0,'','mi5-redt nf-halo','start');
      el.e0=text(g,cx0+4,0,'U(L′)','nf-c2 nf-halo','start');
      el.e1=text(g,cx1-4,0,'U(L)','nf-c1 nf-halo','end');
      update();
    }
    function keyer(i){ return function(dx,dy){ P[i]=nudge(P[i],dx,dy); update(); }; }
    function update(){ paint(); if(api) api.changed(); }
    function mix(a,b,t){ return [t*a[0]+(1-t)*b[0], t*a[1]+(1-t)*b[1], t*a[2]+(1-t)*b[2]]; }
    function paint(){
      var L=probs(P[0],N), L1=probs(P[1],N), X=[T.xy(L),T.xy(L1)], ul=eu(U,L), ul1=eu(U,L1), Q, i, A, s, u=pp*ul+(1-pp)*ul1, r=sgn(ul-ul1);
      for(i=0;i<2;i++){ place(hs[i],X[i][0],X[i][1],(i?L1:L)[2],(i?'L′':'L')+' = '+triple(i?L1:L,2)); A=awayLab(T,X[i],17); moveTo(el.lab[i],A[0],A[1]); }
      setLine(el.seg,X[1][0],X[1][1],X[0][0],X[0][1]);
      for(i=0;i<=5;i++){ Q=T.xy(mix(L,L1,i/5)); at(el.q[i],Q[0],Q[1]); at(el.cq[i],xs(i/5),ys(i/5*ul+(1-i/5)*ul1)); }
      Q=T.xy(mix(L,L1,pp)); at(el.x,Q[0],Q[1]);
      setLine(el.cl,xs(0),ys(ul1),xs(1),ys(ul));
      setLine(el.cv,C(xs(pp)),ys(0),C(xs(pp)),ys(u));
      at(el.cx,xs(pp),ys(u));
      moveTo(el.ct,xs(pp)+(pp>0.7?-8:8),ys(u)+(ul>=ul1?16:-9)); el.ct.setAttribute('text-anchor',pp>0.7?'end':'start'); el.ct.textContent=fmt(u,3);
      moveTo(el.e0,xs(0)+4,ys(ul1)+(ul1>ul?-9:16)); moveTo(el.e1,xs(1)-4,ys(ul)+(ul>=ul1?-9:16));
      if(!out) return;
      s='U(L) = '+fmt(ul,3)+'   U(L′) = '+fmt(ul1,3)+'   so L '+rel(r)+' L′'+
        '\np = '+fmt(pp,2)+':   U(pL + (1 '+MINUS+' p)L′) = '+fmt(pp,2)+' × '+fmt(ul,3)+' + '+fmt(1-pp,2)+' × '+fmt(ul1,3)+' = '+fmt(u,3)+
        '\n'+(r>0?'rising in p: a larger chance of the better lottery is better':r<0?'falling in p: here L′ is the better lottery':'flat: L ∼ L′, so every mixture is indifferent to both');
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return P.map(function(k){ return T.xy(probs(k,N)); }); },
      function(i,x,y){ P[i]=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var L=probs(P[0],N), L1=probs(P[1],N); return {p:pp, ul:eu(U,L), ulp:eu(U,L1), u:pp*eu(U,L)+(1-pp)*eu(U,L1)}; },
      set:function(s){ if('p' in s && rp) rp.set(+s.p); else update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 8. The vNM construction: U(L) is the chance of the best prize that matches L ---------- */
  NF.register('mi5-vnm',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, P0=[[6,12,2],[4,6,10]], P=copyK(P0), al=0.5, u2=0.6, W=520, H=300, T, el={}, hs=[], api, xs, sy, wide;
    var BEST='L̄', WORST='L̲';
    var ra=range(fig,'a',2,function(v){ al=v; update(); });
    if(ra) al=ra.v();
    var ru=range(fig,'u',2,function(v){ u2=v; update(); });
    if(ru) u2=ru.v();
    onClick(fig,'.nfig-reset',function(){ P=copyK(P0); if(ra) ra.set(0.5); if(ru) ru.set(0.6); });
    function draw(){
      var h, g, c, i, sx0, sx1;
      W=measure(svg); wide=W>=560;
      if(wide){ h=Math.round(Math.min(240,(W*0.56-110)*R3/2)); T=Tri(92,h+30,h); H=h+62; sx0=Math.round(W*0.6)+8; sx1=W-22; sy=Math.round(H*0.5)+56; }
      else { h=Math.round(Math.min(230,(W-120)*R3/2)); T=Tri(W/2-h/R3+30,h+30,h); H=h+204; sx0=26; sx1=W-26; sy=h+180; }
      frame(svg,W,H);
      el.lev=[];
      g=S('g',null,svg);
      for(c=1;c<10;c++) el.lev.push(line(g,0,0,0,0,'mi5-lev'));
      triBase(svg,T,[WORST+' = z₁','z₂',BEST+' = z₃'],false);
      line(svg,T.V[0][0],T.V[0][1],T.V[2][0],T.V[2][1],'mi5-edge');
      el.eq=[]; el.sq=[]; el.st=[];
      for(i=0;i<3;i++){
        el.eq.push(line(svg,0,0,0,0,'mi5-eqv mi5-eqv'+i));
        el.sq.push(S('rect',{width:8,height:8,'class':'mi5-sq mi5-sq'+i},svg));
        el.st.push(text(svg,0,0,'','mi5-sqt'+i+' nf-halo','end'));
      }
      el.x=S('circle',{r:5.5,'class':'mi5-red'},svg);
      el.xl=text(svg,0,0,'αL + (1 '+MINUS+' α)L′','mi5-redt nf-halo','start');
      el.lab=[text(svg,0,0,'L','nf-vlab nf-halo nf-c1','middle'),text(svg,0,0,'L′','nf-vlab nf-halo nf-c2','middle')];
      hs=[];
      for(i=0;i<2;i++) hs.push(handle(svg,'nf-v'+(i+1),'Lottery '+(i?'L′':'L')+', arrow keys move it',keyer(i)));
      /* Step 1 for L on [0, 1]: A, the p whose gamble is at least as good as L, and B, those at most as good */
      g=S('g',null,svg);
      xs=lin(0,1,sx0,sx1);
      text(g,sx0,sy-106,'Step 1 for L:  A ∩ B = {p*}','nf-title','start');
      line(g,sx0,C(sy),sx1,C(sy),'nf-ax');
      line(g,C(sx0),sy,C(sx0),sy+4,'nf-ax'); line(g,C(sx1),sy,C(sx1),sy+4,'nf-ax');
      el.t0=text(g,sx0,sy+17,'0',null,'middle'); el.t1=text(g,sx1,sy+17,'1',null,'middle');
      el.at=text(g,sx0,sy-86,'A = {p : p'+BEST+' + (1 '+MINUS+' p)'+WORST+' ≿ L}','mi5-at','start');
      el.ab=line(g,0,0,0,0,'mi5-abar');
      el.bt=text(g,sx0,sy-70,'B = {p : L ≿ p'+BEST+' + (1 '+MINUS+' p)'+WORST+'}','mi5-bt','start');
      el.bb=line(g,0,0,0,0,'mi5-bbar');
      el.ps=line(g,0,0,0,0,'mi5-pstar');
      el.pt=text(g,0,sy+17,'','mi5-redt nf-halo','middle');
      update();
    }
    function keyer(i){ return function(dx,dy){ P[i]=nudge(P[i],dx,dy); update(); }; }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var w=[0,u2,1], L=probs(P[0],N), L1=probs(P[1],N), Xm=[al*L[0]+(1-al)*L1[0],al*L[1]+(1-al)*L1[1],al*L[2]+(1-al)*L1[2]],
          pts=[L,L1,Xm], Us=[], X, E, i, c, A, s, ps, xp;
      for(c=1;c<10;c++) segTo(el.lev[c-1],level(T,w,c/10));
      for(i=0;i<3;i++){
        Us[i]=eu(w,pts[i]); X=T.xy(pts[i]); E=T.xy([1-Us[i],0,Us[i]]);
        setLine(el.eq[i],X[0],X[1],E[0],E[1]);
        el.sq[i].setAttribute('x',R(E[0]-4)); el.sq[i].setAttribute('y',R(E[1]-4));
        moveTo(el.st[i],E[0]-9,E[1]+4); el.st[i].textContent='U = '+fmt(Us[i],2);
        if(i<2){ place(hs[i],X[0],X[1],pts[i][2],(i?'L′':'L')+' = '+triple(pts[i],2)); A=awayLab(T,X,17); moveTo(el.lab[i],A[0],A[1]); }
        else { at(el.x,X[0],X[1]); moveTo(el.xl,X[0]+(X[0]>T.x0+T.s*0.5?-9:9),X[1]+15); el.xl.setAttribute('text-anchor',X[0]>T.x0+T.s*0.5?'end':'start'); }
      }
      ps=Us[0]; xp=xs(ps);
      setLine(el.ab,xp,sy-44,xs(1),sy-44);
      setLine(el.bb,xs(0),sy-24,xp,sy-24);
      setLine(el.ps,C(xp),sy-54,C(xp),sy+4);
      moveTo(el.pt,clamp(xp,xs(0)+34,xs(1)-34),sy+17); el.pt.textContent='p* = U(L) = '+fmt(ps,2);
      el.t0.textContent=xp-xs(0)<70?'':'0'; el.t1.textContent=xs(1)-xp<70?'':'1';
      if(!out) return;
      s='U('+WORST+') = 0,  U(z₂) = '+fmt(u2,2)+',  U('+BEST+') = 1'+
        '\nL ∼ '+fmt(Us[0],3)+' '+BEST+' + '+fmt(1-Us[0],3)+' '+WORST+'   and   L′ ∼ '+fmt(Us[1],3)+' '+BEST+' + '+fmt(1-Us[1],3)+' '+WORST+
        '\nα = '+fmt(al,2)+':   αL + (1 '+MINUS+' α)L′ ∼ '+fmt(Us[2],3)+' '+BEST+' + '+fmt(1-Us[2],3)+' '+WORST+',   and '+fmt(al,2)+' × '+fmt(Us[0],3)+' + '+fmt(1-al,2)+' × '+fmt(Us[1],3)+' = '+fmt(al*Us[0]+(1-al)*Us[1],3);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return P.map(function(k){ return T.xy(probs(k,N)); }); },
      function(i,x,y){ P[i]=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var w=[0,u2,1], L=probs(P[0],N), L1=probs(P[1],N); return {a:al, u2:u2, ul:eu(w,L), ulp:eu(w,L1), um:al*eu(w,L)+(1-al)*eu(w,L1)}; },
      set:function(s){ if('u2' in s && ru) ru.set(+s.u2); if('a' in s && ra) ra.set(+s.a); update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 9. The Jehle and Reny example: three numbers rank every lottery on -2, 4 and 10 pounds ---------- */
  NF.register('mi5-eu',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, LA=[0,0.2,0.8], LB=[0.07,0.03,0.9], Q0=[6,8,6], Q=Q0.slice(), u4=0.6, W=520, H=300, T, T0, el={}, hs=[], api, ZF=4;
    var ru=range(fig,'u',2,function(v){ u4=v; update(); });
    if(ru) u4=ru.v();
    var zm=toggle(fig,'.mi5-zoom',function(){ draw(); if(api) api.changed(); });
    onClick(fig,'.nfig-reset',function(){ Q=Q0.slice(); zm.set(false); if(ru) ru.set(0.6); draw(); });
    function draw(){
      var h, g, c, z=zm.on(), top, H0;
      W=measure(svg); h=Math.round(Math.min(250,(W-120)*R3/2)); H=h+64; H0=h;
      frame(svg,W,H);
      T0=Tri(Math.max(76,W/2-h/R3+14),h+30,h);
      top=T0.V[2];
      /* zoomed, the triangle is ZF times larger with its top vertex, £10 for sure, in the same place */
      T=z?Tri(top[0]-ZF*h/R3,top[1]+ZF*h,ZF*h):T0;
      g=NF.clip(svg,0,0,W,H0+36);
      el.lev=[];
      for(c=1;c<(z?50:10);c++) el.lev.push(line(g,0,0,0,0,'mi5-lev'));
      S('path',{d:poly(T.V)+'Z','class':'mi5-tri'},g);
      el.u4=line(g,0,0,0,0,'mi5-u4');
      el.u4t=text(g,0,0,'','mi5-u4t nf-halo','start');
      el.la=line(g,0,0,0,0,'mi5-la'); el.lb=line(g,0,0,0,0,'mi5-lb');
      el.plev=line(g,0,0,0,0,'mi5-plev');
      el.cal=S('circle',{r:5,'class':'mi5-cal'},g);
      el.calt=text(g,0,0,'','mi5-calt nf-halo','end');
      el.pa=S('circle',{r:4.5,'class':'mi5-pa'},g); el.pb=S('circle',{r:4.5,'class':'mi5-pb'},g);
      el.ta=text(g,0,0,'L₁','nf-vlab nf-halo mi5-lat','start'); el.tb=text(g,0,0,'L₂','nf-vlab nf-halo mi5-lbt','end');
      el.lab=text(g,0,0,'L','nf-vlab nf-halo mi5-ink','middle');
      el.v2=null;
      if(z){ text(svg,top[0],top[1]-10,'£10','nf-lab','middle'); text(svg,8,14,'zoom ×'+ZF+' near £10','nf-title','start'); }
      else {
        text(svg,T.V[0][0]-6,T.V[0][1]+18,MINUS+'£2, u = 0','nf-lab','middle');
        el.v2=text(svg,T.V[1][0]+6,T.V[1][1]+18,'','nf-lab','middle');
        text(svg,T.V[2][0],T.V[2][1]-10,'£10, u = 1','nf-lab','middle');
      }
      hs=[handle(g,'mi5-k0','Lottery L, arrow keys move it',function(dx,dy){ Q=nudge(Q,dx,dy); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function st(){
      var v=[0,u4,1], q=probs(Q,N), e1=eu(v,LA), e2=eu(v,LB);
      return {v:v, q:q, uq:eu(v,q), e1:e1, e2:e2, pref:sgn(e1-e2)>0?'l1':sgn(e1-e2)<0?'l2':'tie'};
    }
    function paint(){
      var o=st(), c, X=T.xy(o.q), Cp=T.xy([1-o.uq,0,o.uq]), s, Pa=T.xy(LA), Pb=T.xy(LB), z=zm.on(), P4=level(T,o.v,u4), mean=12*u4-2, prem=mean-4;
      for(c=0;c<el.lev.length;c++) segTo(el.lev[c],level(T,o.v,(c+1)/(z?50:10)));
      segTo(el.u4,P4);
      if(P4 && !z){ moveTo(el.u4t,(P4[0][0]+P4[1][0])/2+6,(P4[0][1]+P4[1][1])/2-8); el.u4t.textContent='U = '+fmt(u4,2); } else el.u4t.textContent='';
      if(el.v2 && !z) el.v2.textContent='£4, u = '+fmt(u4,2);
      segTo(el.la,level(T,o.v,o.e1));
      segTo(el.lb,level(T,o.v,o.e2));
      segTo(el.plev,level(T,o.v,o.uq));
      at(el.cal,Cp[0],Cp[1]); moveTo(el.calt,Cp[0]-9,Cp[1]+4); el.calt.textContent='p = '+fmt(o.uq,2);
      at(el.pa,Pa[0],Pa[1]); at(el.pb,Pb[0],Pb[1]);
      moveTo(el.ta,Pa[0]+9,Pa[1]+4); moveTo(el.tb,Pb[0]-8,Pb[1]+(z?16:4));
      place(hs[0],X[0],X[1],o.q[2],'L = '+triple(o.q,2));
      moveTo(el.lab,X[0]+12,X[1]-11);
      if(!out) return;
      s='u('+money(-2)+') = 0,  u(£4) = '+fmt(u4,2)+',  u(£10) = 1:   £4 ∼ '+fmt(u4,2)+' × £10 + '+fmt(1-u4,2)+' × ('+money(-2)+'), mean £'+fmt(mean,2)+
        (prem>1e-9?', risk averse, premium £'+fmt(prem,2):prem<-1e-9?', risk loving':', risk neutral')+
        '\nU(L₁) = 0.2 × '+fmt(u4,2)+' + 0.8 = '+fmt(o.e1,3)+'   U(L₂) = 0.03 × '+fmt(u4,2)+' + 0.9 = '+fmt(o.e2,3)+'   so L₁ '+rel(sgn(o.e1-o.e2))+' L₂ (they swap at u(£4) = 0.588)'+
        '\nL = '+triple(o.q,2)+':   U(L) = '+fmt(o.uq,3)+',   L ∼ '+fmt(o.uq,3)+' × £10 + '+fmt(1-o.uq,3)+' × ('+money(-2)+')';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(Q,N))]; },
      function(i,x,y){ Q=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){
        var o=st();
        return {u4:u4, zoom:zm.on(), e1:o.e1, e2:o.e2, diff:o.e1-o.e2, pref:o.pref, q1:o.q[0], q2:o.q[1], q3:o.q[2], eu:o.uq};
      },
      set:function(s){
        if('zoom' in s){ zm.set(s.zoom===true || s.zoom==='true'); draw(); }
        Q=fromSet(s,['q1','q2','q3'],Q,N);
        if('u4' in s && ru) ru.set(+s.u4); else update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 10. Cardinal utility: only affine transforms of u keep the indifference map ---------- */
  NF.register('mi5-affine',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, UB=[0,1,4], B0=[15,0,5], B=B0.slice(), A=[0,1,0], W=520, H=300, T, el={}, hs=[], api;
    var TF={id:'u', aff:'3 + 2u', sqrt:'√u', sq:'u²'};
    var tf=seg(fig,'data-tf',function(v){ if(!TF[v]) return; tf=v; update(); });
    if(!TF[tf]) tf='id';
    onClick(fig,'.nfig-reset',function(){ B=B0.slice(); NF.press(fig,'data-tf','id'); update(); });
    function f(x){ if(tf==='aff') return 3+2*x; if(tf==='sqrt') return Math.sqrt(x); if(tf==='sq') return x*x; return x; }
    function v(){ return [f(UB[0]),f(UB[1]),f(UB[2])]; }
    function draw(){
      var w, c;
      W=measure(svg); w=Math.round(Math.min(260,W-110)); H=w+60;
      frame(svg,W,H);
      T=RTri(58,w+14,w);
      rtBase(svg,T,'p₁, the chance of z₁ (u = 0)','p₃, the chance of z₃ (u = 4)');
      el.lev=[];
      for(c=1;c<10;c++) el.lev.push(line(svg,0,0,0,0,'mi5-gl'));
      el.ghost=line(svg,0,0,0,0,'mi5-ughost');
      el.la=line(svg,0,0,0,0,'mi5-alin');
      el.lb=line(svg,0,0,0,0,'mi5-blin');
      el.pa=S('circle',{r:5.5,'class':'mi5-adot'},svg);
      el.ta=text(svg,T.x0+8,T.y0-8,'A','nf-vlab nf-halo mi5-aat','start');
      el.tb=text(svg,0,0,'B','nf-vlab nf-halo mi5-redt','start');
      el.k=[text(svg,T.x0+T.w*0.5,T.y0-T.w*0.86,'','nf-lab','start'),text(svg,T.x0+T.w*0.5,T.y0-T.w*0.86+15,'','nf-lab','start'),text(svg,T.x0+T.w*0.5,T.y0-T.w*0.86+30,'','mi5-flagt','start')];
      hs=[handle(svg,'mi5-kb','Lottery B, arrow keys move p1 and p3',function(dx,dy){ B=nudgeR(B,dx,dy); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var vv=v(), b=probs(B,N), X=T.xy(b), Pa=T.xy(A), c, va=eu(vv,A), vb=eu(vv,b), sl=(vv[1]-vv[0])/(vv[2]-vv[1]), s, r=sgn(va-vb), aff=tf==='id'||tf==='aff';
      for(c=1;c<10;c++) segTo(el.lev[c-1],level(T,vv,vv[0]+(vv[2]-vv[0])*c/10));
      segTo(el.ghost,tf==='id'?null:level(T,UB,1));
      segTo(el.la,level(T,vv,va));
      segTo(el.lb,level(T,vv,vb));
      at(el.pa,Pa[0],Pa[1]);
      place(hs[0],X[0],X[1],b[2],'B = '+triple(b,2));
      moveTo(el.tb,X[0]+9,X[1]-9);
      el.k[0].textContent='v = '+TF[tf]+' = ('+fmt(vv[0],2)+', '+fmt(vv[1],2)+', '+fmt(vv[2],2)+')';
      el.k[1].textContent='slope '+fmt(sl,3)+(tf==='id'?'':', under u 0.333');
      el.k[2].textContent='A '+rel(r)+' B';
      if(!out) return;
      s='v = '+TF[tf]+':   v = ('+fmt(vv[0],2)+', '+fmt(vv[1],2)+', '+fmt(vv[2],2)+'),   slope (v₂ '+MINUS+' v₁) ÷ (v₃ '+MINUS+' v₂) = '+fmt(sl,3)+
        '\nA = (0, 1, 0):  V(A) = '+fmt(va,3)+'   B = '+triple(b,2)+':  V(B) = '+fmt(vb,3)+'   so A '+rel(r)+' B';
      out.textContent=s;
      if(aff) out.appendChild(document.createTextNode('\n'+(tf==='id'?'the base utility; the dotted line marks it when another v is shown':'affine: the same slope, so every ranking is the same as under u')));
      else warn(out,'\nnot affine: the slope changes, so some rankings flip');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(B,N))]; },
      function(i,x,y){ B=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var vv=v(), b=probs(B,N); return {tf:tf, b1:b[0], b2:b[1], b3:b[2], va:eu(vv,A), vb:eu(vv,b), slope:(vv[1]-vv[0])/(vv[2]-vv[1])}; },
      set:function(s){ if('tf' in s) NF.press(fig,'data-tf',String(s.tf)); B=fromSet(s,['b1','b2','b3'],B,N); update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 11. Matching pennies: which transformations keep the mixed equilibrium ---------- */
  NF.register('mi5-pennies',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var hh=2, W=520, H=300, el={}, api, px0, px1, py0, py1, xs, ys, wide;
    var TF={id:'t', aff:'3 + 2t', exp:'eᵗ', cube:'t³'};
    var ra=range(fig,'h',2,function(v){ hh=v; update(); });
    if(ra) hh=ra.v();
    var tf=seg(fig,'data-tf',function(v){ if(!TF[v]) return; tf=v; update(); });
    if(!TF[tf]) tf='id';
    function f(x){ if(tf==='aff') return 3+2*x; if(tf==='exp') return Math.exp(x); if(tf==='cube') return x*x*x; return x; }
    function qstar(){ return (f(1)-f(-1))/(f(hh)+f(1)-2*f(-1)); }
    function draw(){
      var g, mx, my, cw=92, lw=62, rh=26, i, j, x, y;
      W=measure(svg); wide=W>=560;
      if(wide){ mx=4; my=46; px0=lw+2*cw+64; px1=W-58; py0=24; py1=232; H=262; }
      else { mx=Math.max(2,Math.round((W-lw-2*cw)/2)); my=14; px0=46; px1=W-58; py0=136; py1=330; H=360; }
      frame(svg,W,H);
      /* the payoff matrix: A's payoff first, B's second, the cell that h changes shaded */
      g=S('g',null,svg);
      text(g,mx+lw+cw/2,my+12,'B: Heads','nf-title','middle');
      text(g,mx+lw+cw*1.5,my+12,'B: Tails','nf-title','middle');
      el.cell=[];
      for(i=0;i<2;i++){
        y=my+20+i*rh;
        text(g,mx+lw-8,y+rh/2+4,i?'A: Tails':'A: Heads','nf-title','end');
        for(j=0;j<2;j++){
          x=mx+lw+j*cw;
          S('rect',{x:x,y:y,width:cw,height:rh,'class':i===0&&j===0?'mi5-cell mi5-hot':'mi5-cell'},g);
          el.cell.push(S('text',{x:R(x+cw/2),y:R(y+rh/2+4),'text-anchor':'middle'},g));
        }
      }
      el.cap=text(g,mx+lw+cw,my+20+2*rh+16,'','nf-lab','middle');
      /* expected utility of Heads and Tails for A against B's probability q of Heads */
      el.plot=S('g',null,svg);
      update();
    }
    function cellText(t,va,vb){
      while(t.firstChild) t.removeChild(t.firstChild);
      var s1=S('tspan',{'class':'mi5-ppa'},t), s2;
      t.insertBefore(document.createTextNode('('),s1);
      s1.textContent=fmt(va,2);
      t.appendChild(document.createTextNode(', '));
      s2=S('tspan',{'class':'mi5-ppb'},t); s2.textContent=fmt(vb,2);
      t.appendChild(document.createTextNode(')'));
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var g=el.plot, lo, hi, pad, ticks, i, v, q=qstar(), yq, ya, yb, s, fa=f(hh), fm=f(-1), fp=f(1);
      cellText(el.cell[0],fa,fm); cellText(el.cell[1],fm,fp); cellText(el.cell[2],fm,fp); cellText(el.cell[3],fp,fm);
      el.cap.textContent='payoffs f(t) with f(t) = '+TF[tf]+', h = '+fmt(hh,2);
      while(g.firstChild) g.removeChild(g.firstChild);
      lo=Math.min(fm,fp,fa); hi=Math.max(fm,fp,fa); pad=(hi-lo)*0.08; lo-=pad; hi+=pad;
      ticks=nice(lo,hi,4);
      xs=lin(0,1,px0,px1); ys=lin(lo,hi,py1,py0);
      for(i=0;i<ticks.length;i++){ v=ticks[i]; line(g,px0,C(ys(v)),px1,C(ys(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,px0-7,ys(v)+4,tl(v),null,'end'); }
      for(i=0;i<=4;i++){ v=i/4; line(g,C(xs(v)),py1,C(xs(v)),py1+4,'nf-ax'); text(g,xs(v),py1+17,tl(v),null,'middle'); }
      line(g,px0,C(py1),px1,C(py1),'nf-ax');
      text(g,px1+14,py1+17,'q','nf-title','start');
      text(g,px0-7,py0-10,'A’s expected payoff','nf-title','start');
      line(g,xs(0),ys(fm),xs(1),ys(fa),'mi5-lh');
      line(g,xs(0),ys(fp),xs(1),ys(fm),'mi5-lt');
      ya=ys(fa); yb=ys(fm);
      text(g,px1+5,ya+4,'Heads','mi5-fh','start');
      text(g,px1+5,yb+4,'Tails','mi5-ft','start');
      yq=ys(q*fa+(1-q)*fm);
      line(g,C(xs(q)),py1,C(xs(q)),yq,'mi5-qs');
      S('circle',{cx:R(xs(q)),cy:R(yq),r:4.5,'class':'mi5-qdot'},g);
      text(g,xs(q)+6,py1-8,'q* = '+fmt(q,3),'mi5-qt nf-halo','start');
      if(!out) return;
      s='A: Heads pays '+fmt(fa,2)+' or '+fmt(fm,2)+', Tails pays '+fmt(fm,2)+' or '+fmt(fp,2)+
        '\nq* = [f(1) '+MINUS+' f('+MINUS+'1)] ÷ [f(h) + f(1) '+MINUS+' 2f('+MINUS+'1)] = '+fmt(fp-fm,3)+' ÷ '+fmt(fa+fp-2*fm,3)+' = '+fmt(q,3)+'   p* = 0.500';
      out.textContent=s;
      if(Math.abs(hh-1)<1e-9) out.appendChild(document.createTextNode('\ntwo payoff values: q* = 0.5 under every increasing f'));
      else if(tf==='aff') out.appendChild(document.createTextNode('\naffine f: the same q* as under f(t) = t'));
    }
    api=NF.api({
      get:function(){ return {h:hh, tf:tf, q:qstar(), p:0.5, uhh:f(hh), uht:f(-1), uth:f(-1), utt:f(1)}; },
      set:function(s){
        if('tf' in s) NF.press(fig,'data-tf',String(s.tf));
        if('h' in s && ra) ra.set(+s.h); else update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
