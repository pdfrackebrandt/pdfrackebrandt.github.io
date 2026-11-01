/* Core Micro L5 figures (decision making under risk): the probability simplex, compound lotteries, independence
   against two other preferences, the expected utility construction, and cardinal utility in matching pennies.
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

  /* The simplex as an equilateral triangle with vertex 1 bottom left, 2 bottom right and 3 on top, as on the slides.
     With the altitude h pixels tall, the height of a point above the side opposite vertex n is p_n times h. */
  function Tri(x0,yb,h){
    var s=2*h/R3, T={x0:x0, yb:yb, h:h, s:s};
    T.V=[[x0,yb],[x0+s,yb],[x0+s/2,yb-h]];
    T.xy=function(p){ return [x0+(p[1]+p[2]/2)*s, yb-p[2]*h]; };
    T.bary=function(x,y){ var p3=(yb-y)/h, p2=(x-x0)/s-p3/2; return [1-p2-p3,p2,p3]; };
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
  /* counts from a Try it state: two of the three probabilities fix the third */
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
  function arrowHead(e,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, bx=x1-ux*8, by=y1-uy*8;
    e.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  /* tick values at a round step for the range lo..hi, about n of them */
  function nice(lo,hi,n){
    var span=hi-lo, step=Math.pow(10,Math.floor(Math.log(span/n)/Math.LN10)), err=span/n/step, t=[], v;
    if(err>=7.5) step*=10; else if(err>=3.5) step*=5; else if(err>=1.5) step*=2;
    for(v=Math.ceil(lo/step-1e-9)*step;v<=hi+1e-9;v+=step) t.push(Math.round(v/step)*step);
    return t;
  }

  /* ---------- 1. The simplex: distances to the sides are the probabilities ---------- */
  NF.register('mi5-simplex',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, K0=[7,8,5], K=K0.slice(), areas=false, W=520, H=300, T, el={}, hs=[], api;
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
      triBase(svg,T,['δ₁','δ₂','δ₃'],true);
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
      else if(zeros===1) s+='\non the side opposite δ'+SUB[z]+': z'+SUB[z]+' cannot happen';
      else s+='\nthe vertex δ'+SUB[nz]+': z'+SUB[nz]+' for sure';
      if(areas) s+='\nshaded areas: '+fmt(p[0],2)+', '+fmt(p[1],2)+' and '+fmt(p[2],2)+' of the triangle';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(K,N))]; },
      function(i,x,y){ K=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read the three probabilities, how many are zero and whether the areas show */
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
    /* a grid of fortieths holds the slide 14 lotteries (3/8 = 15/40) exactly */
    var N=40, A0=[[24,8,8],[4,12,24]], A=[A0[0].slice(),A0[1].slice()], al=0.3, ex='free', hold=false, W=520, H=300, T, el={}, hs=[], api, wide;
    var G4=[0.5,0.5,0], G5=[0.5,0,0.5];
    /* any move by hand leaves the slide 14 example, so its ghost lotteries go */
    var ra=range(fig,'a',2,function(v){ al=v; if(!hold) ex='free'; update(); });
    if(ra) al=ra.v();
    function setA(v){ hold=true; if(ra) ra.set(v); hold=false; al=v; }
    function preset(){ A=[[40,0,0],[10,15,15]]; setA(1/3); ex='s14'; update(); }
    function reset(){ A=[A0[0].slice(),A0[1].slice()]; setA(0.3); ex='free'; update(); }
    onClick(fig,'.mi5-s14',preset);
    onClick(fig,'.nfig-reset',reset);
    function aTxt(v){ return Math.abs(v-1/3)<1e-12?'1/3':Math.abs(v-2/3)<1e-12?'2/3':fmt(v,2); }
    function red(){ var p=probs(A[0],N), q=probs(A[1],N); return [al*p[0]+(1-al)*q[0], al*p[1]+(1-al)*q[1], al*p[2]+(1-al)*q[2]]; }
    function draw(){
      var h, i, tx, ty, g;
      W=measure(svg); wide=W>=560;
      if(wide){ h=Math.round(Math.min(230,(W*0.5-70)*R3/2)); H=h+62; T=Tri(46,h+30,h); tx=Math.round(W*0.5)+14; ty=Math.round(H/2-58); }
      else { h=Math.round(Math.min(230,(W-90)*R3/2)); H=h+62+134; T=Tri(W/2-h/R3,h+30,h); tx=16; ty=h+66; }
      frame(svg,W,H);
      triBase(svg,T,['δ₁','δ₂','δ₃'],true);
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
      if(ex==='s14'){
        P4=T.xy(G4); P5=T.xy(G5);
        setLine(el.ghost,P4[0],P4[1],P5[0],P5[1]);
        el.gd[0].setAttribute('r',4); at(el.gd[0],P4[0],P4[1]); el.gd[1].setAttribute('r',4); at(el.gd[1],P5[0],P5[1]);
        moveTo(el.gl[0],P4[0],P4[1]-9); el.gl[0].textContent='L₄';
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
      el.tg.textContent=ex==='s14'?'½ L₄ + ½ L₅ = (0.500, 0.250, 0.250)':'';
      if(!out) return;
      s=aTxt(al)+' × '+triple(p[0],3)+' + '+aTxt(1-al)+' × '+triple(p[1],3)+'\n= '+triple(r,3);
      if(ex==='s14') s+='\nslide 14: ⅓ L₁ + ⅓ L₂ + ⅓ L₃ with L₂ = L₃ is this compound, and ½ L₄ + ½ L₅ reduces to the same point';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(A[0],N)),T.xy(probs(A[1],N))]; },
      function(i,x,y){ A[i]=snap(T.bary(x,y),N); ex='free'; update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read the weight, both lotteries, the reduced lottery and whether the slide 14 example shows */
    api=NF.api({
      get:function(){
        var p=probs(A[0],N), q=probs(A[1],N), r=red();
        return {a:al, p11:p[0], p12:p[1], p13:p[2], p21:q[0], p22:q[1], p23:q[2], r1:r[0], r2:r[1], r3:r[2], ex:ex};
      },
      set:function(st){
        if('ex' in st){ if(st.ex==='s14') preset(); else reset(); }
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

  /* ---------- 3. Independence: mix two lotteries with a common third ---------- */
  NF.register('mi5-indep',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, U=[0,0.6,1], P0=[[12,8,0],[10,0,10],[0,0,20]], P=P0.map(function(k){ return k.slice(); }), al=0.5, W=520, H=300, T, el={}, hs=[], api;
    var NAMES=['L','L′','L″'], PREF={eu:'expected utility', ml:'most likely', wc:'worst case'};
    var ra=range(fig,'a',2,function(v){ al=v; update(); });
    if(ra) al=ra.v();
    var pref=seg(fig,'data-pref',function(v){ if(!PREF[v]) return; pref=v; draw(); if(api) api.changed(); });
    if(!PREF[pref]) pref='eu';
    onClick(fig,'.nfig-reset',function(){ P=P0.map(function(k){ return k.slice(); }); if(ra) ra.set(0.5); update(); });
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
      var h, g, i, c, n, a, b, lo, hi, p, q, A, B, rows=0;
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
        /* U rises fastest along its gradient in the plane */
        A=T.xy([0.5,0.4,0.1]); a=(U[1]-U[0])/T.s; b=(U[0]+U[1])/(2*T.h)-U[2]/T.h; n=Math.hypot(a,b);
        B=[A[0]+a/n*34,A[1]+b/n*34];
        line(g,A[0],A[1],B[0]-a/n*6,B[1]-b/n*6,'mi5-arr'); arrowHead(S('path',{'class':'mi5-arrh'},g),A[0],A[1],B[0],B[1]);
        text(g,B[0]+6,B[1]+4,'better','nf-lab nf-halo','start');
      } else if(pref==='ml'){
        for(c=4;c<=9;c++) for(n=0;n<3;n++){
          a=(n+1)%3; b=(n+2)%3; lo=Math.max(0,1-2*c/10); hi=Math.min(c/10,1-c/10);
          if(lo>hi+1e-12) continue;
          p=[]; p[n]=c/10; p[a]=lo; p[b]=1-c/10-lo; q=[]; q[n]=c/10; q[a]=hi; q[b]=1-c/10-hi;
          A=T.xy(p); B=T.xy(q); line(g,A[0],A[1],B[0],B[1],'mi5-lev');
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
    function rel(s){ return s>0?'≻':s<0?'≺':'∼'; }
    function paint(){
      var o=state(), X=[T.xy(o.L),T.xy(o.L1),T.xy(o.L2)], Y=[T.xy(o.M),T.xy(o.M1)], i, s, cx=T.x0+T.s/2, cy=T.yb-T.h/3, dx, dy, d;
      for(i=0;i<3;i++){
        place(hs[i],X[i][0],X[i][1],o[['L','L1','L2'][i]][2],NAMES[i]+' = '+triple(o[['L','L1','L2'][i]],2));
        /* labels sit on the side away from the middle of the triangle */
        dx=X[i][0]-cx; dy=X[i][1]-cy; d=Math.hypot(dx,dy)||1; dx/=d; dy/=d;
        /* at a vertex the outward spot belongs to the vertex label, so go sideways */
        if(Math.hypot(X[i][0]-T.V[0][0],X[i][1]-T.V[0][1])<10){ dx=-0.7; dy=-0.7; }
        else if(Math.hypot(X[i][0]-T.V[1][0],X[i][1]-T.V[1][1])<10){ dx=0.7; dy=-0.7; }
        else if(Math.hypot(X[i][0]-T.V[2][0],X[i][1]-T.V[2][1])<10){ dx=1; dy=0; }
        moveTo(el.lab[i],X[i][0]+dx*17,X[i][1]+dy*17+4);
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
    /* the Try it steps read the preference, the weight, the three lotteries, the four utilities and the verdict */
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

  /* ---------- 4. The expected utility construction (Jehle and Reny, slides 41 to 46) ---------- */
  NF.register('mi5-eu',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, LA=[0,0.2,0.8], LB=[0.07,0.03,0.9], Q0=[6,8,6], Q=Q0.slice(), u4=0.6, W=520, H=300, T, el={}, hs=[], api;
    var TF={id:'u', aff:'3 + 2u', sqrt:'√u'};
    var ru=range(fig,'u',2,function(v){ u4=v; update(); });
    if(ru) u4=ru.v();
    var tf=seg(fig,'data-tf',function(v){ if(!TF[v]) return; tf=v; update(); });
    if(!TF[tf]) tf='id';
    onClick(fig,'.nfig-reset',function(){ Q=Q0.slice(); NF.press(fig,'data-tf','id'); if(ru) ru.set(0.6); update(); });
    /* Bernoulli utilities of -2, 4 and 10 pounds after the chosen transformation of the calibrated 0, u(4), 1 */
    function w(){
      if(tf==='aff') return [3,3+2*u4,5];
      if(tf==='sqrt') return [0,Math.sqrt(u4),1];
      return [0,u4,1];
    }
    function draw(){
      var h, g, c;
      W=measure(svg); h=Math.round(Math.min(250,(W-120)*R3/2)); H=h+62;
      frame(svg,W,H);
      T=Tri(Math.max(70,W/2-h/R3+14),h+30,h);
      triBase(svg,T,['−£2','£4','£10'],false);
      g=S('g',null,svg);
      el.lev=[];
      for(c=1;c<10;c++) el.lev.push(line(g,0,0,0,0,'mi5-lev'));
      el.arr=line(g,0,0,0,0,'mi5-arr'); el.arrh=S('path',{'class':'mi5-arrh'},g); el.arrt=text(g,0,0,'better','nf-lab nf-halo','start');
      el.la=line(svg,0,0,0,0,'mi5-lev2'); el.lb=line(svg,0,0,0,0,'mi5-lev2');
      el.plev=line(svg,0,0,0,0,'mi5-plev');
      el.cal=S('circle',{r:5,'class':'mi5-cal'},svg);
      el.calt=text(svg,0,0,'','mi5-calt nf-halo','end');
      el.pa=S('circle',{r:4,'class':'mi5-pt'},svg); el.pb=S('circle',{r:4,'class':'mi5-pt'},svg);
      el.ta=text(svg,0,0,'L₁','nf-vlab nf-halo mi5-ink','start'); el.tb=text(svg,0,0,'L₂','nf-vlab nf-halo mi5-ink','end');
      el.lab=text(svg,0,0,'L','nf-vlab nf-halo mi5-ink','middle');
      hs=[handle(svg,'mi5-k0','Lottery L, arrow keys move it',function(dx,dy){ Q=nudge(Q,dx,dy); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function st(){
      var v=w(), q=probs(Q,N), uq=eu(v,q), e1=eu(v,LA), e2=eu(v,LB);
      return {v:v, q:q, uq:uq, cal:(uq-v[0])/(v[2]-v[0]), e1:e1, e2:e2, pref:sgn(e1-e2)>0?'l1':sgn(e1-e2)<0?'l2':'tie', un:(v[1]-v[0])/(v[2]-v[0])};
    }
    function paint(){
      var o=st(), wn=[0,o.un,1], c, A, B, X=T.xy(o.q), Cp=T.xy([1-o.cal,0,o.cal]), a, b, n, s, Pa=T.xy(LA), Pb=T.xy(LB);
      for(c=1;c<10;c++) segTo(el.lev[c-1],level(T,wn,c/10));
      segTo(el.la,level(T,wn,eu(wn,LA)));
      segTo(el.lb,level(T,wn,eu(wn,LB)));
      segTo(el.plev,level(T,wn,o.cal));
      /* the gradient of U in the plane points to better lotteries */
      A=T.xy([0.64,0.3,0.06]); a=o.un/T.s; b=o.un/(2*T.h)-1/T.h; n=Math.hypot(a,b);
      B=[A[0]+a/n*34,A[1]+b/n*34];
      setLine(el.arr,A[0],A[1],B[0]-a/n*6,B[1]-b/n*6); arrowHead(el.arrh,A[0],A[1],B[0],B[1]); moveTo(el.arrt,B[0]+6,B[1]+4);
      at(el.cal,Cp[0],Cp[1]); moveTo(el.calt,Cp[0]-9,Cp[1]+4); el.calt.textContent='p = '+fmt(o.cal,2);
      at(el.pa,Pa[0],Pa[1]); at(el.pb,Pb[0],Pb[1]);
      moveTo(el.ta,Pa[0]+9,Pa[1]+4); moveTo(el.tb,Pb[0]-8,Pb[1]+4);
      place(hs[0],X[0],X[1],o.q[2],'L = '+triple(o.q,2));
      /* up and to the right of L is clear of its own indifference line, which falls to the right */
      moveTo(el.lab,X[0]+12,X[1]-11);
      if(!out) return;
      s='u('+money(-2)+') = '+fmt(o.v[0],2)+'   u(£4) = '+fmt(o.v[1],3)+'   u(£10) = '+fmt(o.v[2],2)+(tf==='id'?'':'   ('+TF[tf]+' of the calibrated 0, '+fmt(u4,2)+', 1)')+
        '\nU(L₁) = '+fmt(o.e1,3)+'   U(L₂) = '+fmt(o.e2,3)+'   so L₁ '+(o.pref==='l1'?'≻':o.pref==='l2'?'≺':'∼')+' L₂'+
        '\nL = '+triple(o.q,2)+':   U(L) = '+fmt(o.uq,3)+',   L ∼ '+fmt(o.cal,3)+' × £10 + '+fmt(1-o.cal,3)+' × ('+money(-2)+')';
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [T.xy(probs(Q,N))]; },
      function(i,x,y){ Q=snap(T.bary(x,y),N); update(); },focusOf(function(){ return hs; }));
    /* the Try it steps read the calibrated u(4), the transformation, both slide 44 utilities, the ranking and the probe */
    api=NF.api({
      get:function(){
        var o=st();
        return {u4:u4, tf:tf, v1:o.v[0], v2:o.v[1], v3:o.v[2], e1:o.e1, e2:o.e2, diff:o.e1-o.e2, pref:o.pref, q1:o.q[0], q2:o.q[1], q3:o.q[2], eu:o.uq, cal:o.cal};
      },
      set:function(s){
        if('tf' in s) NF.press(fig,'data-tf',String(s.tf));
        if('u4' in s && ru) ru.set(+s.u4);
        Q=fromSet(s,['q1','q2','q3'],Q,N);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Matching pennies: which transformations keep the mixed equilibrium ---------- */
  NF.register('mi5-pennies',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var hh=1, W=520, H=300, el={}, api, px0, px1, py0, py1, xs, ys, wide;
    var TF={id:'u', aff:'3 + 2u', exp:'eᵘ', cube:'u³'};
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
      var s1=S('tspan',{'class':'mi5-pa'},t), s2;
      t.insertBefore(document.createTextNode('('),s1);
      s1.textContent=fmt(va,2);
      t.appendChild(document.createTextNode(', '));
      s2=S('tspan',{'class':'mi5-pb'},t); s2.textContent=fmt(vb,2);
      t.appendChild(document.createTextNode(')'));
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var g=el.plot, lo, hi, pad, ticks, i, v, q=qstar(), yq, ya, yb, s, fa=f(hh), fm=f(-1), fp=f(1);
      cellText(el.cell[0],fa,fm); cellText(el.cell[1],fm,fp); cellText(el.cell[2],fm,fp); cellText(el.cell[3],fp,fm);
      el.cap.textContent='ũ = '+TF[tf]+', with h = '+fmt(hh,2);
      while(g.firstChild) g.removeChild(g.firstChild);
      lo=Math.min(fm,fp,fa); hi=Math.max(fm,fp,fa); pad=(hi-lo)*0.08; lo-=pad; hi+=pad;
      ticks=nice(lo,hi,4);
      xs=lin(0,1,px0,px1); ys=lin(lo,hi,py1,py0);
      for(i=0;i<ticks.length;i++){ v=ticks[i]; line(g,px0,C(ys(v)),px1,C(ys(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,px0-7,ys(v)+4,tl(v),null,'end'); }
      for(i=0;i<=4;i++){ v=i/4; line(g,C(xs(v)),py1,C(xs(v)),py1+4,'nf-ax'); text(g,xs(v),py1+17,tl(v),null,'middle'); }
      line(g,px0,C(py1),px1,C(py1),'nf-ax');
      text(g,px1+14,py1+17,'q','nf-title','start');
      text(g,px0-7,py0-10,'expected ũ for A','nf-title','start');
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
        '\nq* = (ũ(1) '+MINUS+' ũ('+MINUS+'1)) / (ũ(h) + ũ(1) '+MINUS+' 2ũ('+MINUS+'1)) = '+fmt(fp-fm,3)+' / '+fmt(fa+fp-2*fm,3)+' = '+fmt(q,3)+'   p* = 0.500';
      out.textContent=s;
    }
    /* the Try it steps read h, the transformation, both equilibrium mixes and A's four transformed payoffs */
    api=NF.api({
      get:function(){ return {h:hh, tf:tf, q:qstar(), p:0.5, uhh:f(hh), uht:f(-1), uth:f(-1), utt:f(1)}; },
      set:function(s){
        if('tf' in s) NF.press(fig,'data-tf',String(s.tf));
        if('h' in s && ra) ra.set(+s.h);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
