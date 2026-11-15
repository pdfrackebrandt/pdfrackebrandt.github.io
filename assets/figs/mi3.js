/* Core Micro L3 figures: PIGLOG Engel curves, the utility maximisation tangency and corner with the quasiconvexity of v
   in price space, Hicksian against Marshallian demand with Shephard's lemma, the duality map, the Slutsky split of a price
   change, backward bending labour supply, and expansion paths and Engel curves of special preferences.
   Every curve is computed from the stated utility function. Drawn with the helpers of /assets/notes.js (window.NF);
   colours come from CSS variables in /assets/figs/mi3.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      clip=NF.clip, local=NF.local, capture=NF.capture, key=NF.key, tw=NF.tw, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function niceStep(span,n){
    var raw=span/Math.max(1,n), p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), m=raw/p;
    return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;
  }
  /* the smallest of 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 times a power of ten that is at least x */
  function niceUp(x){
    if(!(x>0)) return 1;
    var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p, c=[1,1.2,1.5,2,2.5,3,4,5,6,8,10], i;
    for(i=0;i<c.length;i++) if(m<=c[i]*(1+1e-9)) return c[i]*p;
    return 10*p;
  }
  function tick(v){ return tl(Math.round(v*1000)/1000); }
  /* a plot box between pixels L and Rr (the first mL px hold the y tick labels); x domain xd, y domain yd over [bot, top] */
  function box(svg,L,Rr,top,bot,xd,yd,xname,yname,o){
    o=o||{};
    var mL=o.mL||38, x0=L+mL, x1=Rr, g=S('g',null,svg), xs=lin(xd[0],xd[1],x0,x1), ys=lin(yd[0],yd[1],bot,top),
        sx=o.sx||niceStep(xd[1]-xd[0],Math.max(2,Math.floor((x1-x0)/54))), sy=o.sy||niceStep(yd[1]-yd[0],Math.max(2,Math.floor((bot-top)/34))), i, v;
    for(i=Math.ceil(xd[0]/sx-1e-9);i*sx<=xd[1]+1e-9;i++){
      v=i*sx;
      if(Math.abs(v-xd[0])>1e-9) line(g,C(xs(v)),top,C(xs(v)),bot,Math.abs(v)<1e-9?'nf-ax':'nf-grid');
      text(g,xs(v),bot+14,tick(v),null,'middle');
    }
    for(i=Math.ceil(yd[0]/sy-1e-9);i*sy<=yd[1]+1e-9;i++){
      v=i*sy;
      if(Math.abs(v-yd[0])>1e-9) line(g,x0,C(ys(v)),x1,C(ys(v)),Math.abs(v)<1e-9?'nf-ax':'nf-grid');
      text(g,x0-5,ys(v)+4,tick(v),null,'end');
    }
    line(g,C(x0),top,C(x0),bot,'nf-ax');
    line(g,x0,C(bot),x1,C(bot),'nf-ax');
    if(xname) text(g,x1-3,bot-6,xname,'nf-title nf-halo','end');
    if(yname) text(g,x0+6,top+12,yname,'nf-title nf-halo');
    if(o.title) text(g,x0,top-8,o.title,'nf-title');
    return {xs:xs, ys:ys, x0:x0, x1:x1, top:top, bot:bot, xd:xd, yd:yd, gc:clip(svg,x0,top-1,x1-x0+1,bot-top+2)};
  }
  /* a polyline through data points; a null or infinite point lifts the pen; pixels are capped so far points stay finite */
  function pathOf(pts,F){
    var d='', pen=false, i, p, X, Y;
    for(i=0;i<pts.length;i++){
      p=pts[i];
      if(!p || !isFinite(p[0]) || !isFinite(p[1])){ pen=false; continue; }
      X=clamp(F.xs(p[0]),-4000,4000); Y=clamp(F.ys(p[1]),-4000,4000);
      d+=(pen?'L':'M')+R(X)+','+R(Y); pen=true;
    }
    return d;
  }
  function geo(a,b,n){ var o=[], la=Math.log(a), lb=Math.log(b), i; for(i=0;i<=n;i++) o.push(Math.exp(la+(lb-la)*i/n)); return o; }
  function grid(a,b,n){ var o=[], i; for(i=0;i<=n;i++) o.push(a+(b-a)*i/n); return o; }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function put(out,s){ out.appendChild(document.createTextNode(s)); }
  function cmp(a,b){ return Math.abs(a-b)<5e-4?'=':a>b?'>':'<'; }
  function copy(o){ var r={}, k; for(k in o) if(Object.prototype.hasOwnProperty.call(o,k)) r[k]=o[k]; return r; }
  function dot(g,cls,r){ return S('circle',{r:r||4.5,'class':cls},g); }
  function show(e,on){ e.setAttribute('visibility',on?'visible':'hidden'); }
  /* an arrow with a head (or two); it hides itself when shorter than minLen px */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  function setVec(v,x0,y0,x1,y1,minLen,both){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by, ax, ay, d;
    if(len<(minLen||9)){ setLine(v.l,x0,y0,x0,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return false; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len; hl=Math.min(8,len*(both?0.3:0.45)); bx=x1-ux*hl; by=y1-uy*hl;
    d=poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z';
    if(both){ ax=x0+ux*hl; ay=y0+uy*hl; d+=poly([[x0,y0],[ax-uy*4,ay+ux*4],[ax+uy*4,ay-ux*4]])+'Z'; setLine(v.l,ax-ux*2,ay-uy*2,bx+ux*2,by+uy*2); }
    else setLine(v.l,x0,y0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',d);
    return true;
  }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function viewBox(svg,W,H){ svg.setAttribute('viewBox','0 0 '+W+' '+H); }
  /* an svg group that acts as a button: click, Enter and Space */
  function clicker(g,label,fn){
    g.setAttribute('tabindex','0'); g.setAttribute('role','button'); g.setAttribute('aria-label',label);
    g.addEventListener('click',function(e){ e.preventDefault(); fn(); });
    g.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(); } });
  }
  /* a draggable point: a focusable group with a knob; arrow keys call onKey(dx, dy, shift) */
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
  function place(h,x,y,txt){ h.setAttribute('transform','translate('+R(x)+','+R(y)+')'); h.setAttribute('aria-valuetext',txt); }
  function focusedIndex(list){ var a=document.activeElement, i; for(i=0;i<list.length;i++) if(list[i]===a) return i; return -1; }
  function refocus(list,i){ if(i>=0 && list[i]){ try{ list[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} } }
  /* drag whichever point is nearest the pointer; pts() gives svg positions, move(i, x, y) the new one */
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
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(near(local(svg,e.touches[0],s[0],s[1]))>=0) e.preventDefault();
    },{passive:false});
  }
  /* indifference curves through a utility level, as data points inside roughly [0, D]^2 */
  var IC={
    cd:function(u,D){ return geo(u*u/(3*D),3*D,240).map(function(x){ return [x,u*u/x]; }); },          /* u = sqrt(x1 x2) */
    ql:function(u,D){                                                                               /* u = ln x1 + x2 */
      var hi=Math.exp(u), lo=Math.max(Math.exp(u-3*D),1e-6), pts;
      if(hi<=lo) return [];
      pts=geo(lo,hi,240).map(function(x){ return [x,u-Math.log(x)]; });
      pts[pts.length-1]=[hi,0];
      return pts;
    },
    inf:function(u,D){                                                                              /* u = ln x1 + x2^2/2 */
      var top=Math.sqrt(Math.max(0,2*(u-Math.log(1e-4)))), pts=[], i, y;
      for(i=0;i<=260;i++){ y=Math.min(top,3*D)*i/260; pts.push([Math.exp(u-0.5*y*y),y]); }
      return pts;
    }
  };
  /* a line of math with stacked fractions, centred on cx with its fraction bars at cy: items are strings or [numerator, denominator] */
  function mathLine(g,cx,cy,items,cls){
    var parts=[], tot=0, i, it, a, b, wf, x;
    for(i=0;i<items.length;i++){
      it=items[i];
      if(typeof it==='string'){ a=text(g,0,cy+3.5,it,cls); parts.push({a:a, w:tw(a,it)}); }
      else {
        a=text(g,0,cy-3.5,it[0],cls+' mi3-fn','middle'); b=text(g,0,cy+10.5,it[1],cls+' mi3-fn','middle');
        wf=Math.max(tw(a,it[0]),tw(b,it[1]))+4;
        parts.push({a:a, b:b, w:wf, bar:line(g,0,cy,0,cy,'mi3-fbar')});
      }
      tot+=parts[i].w+(i?3.5:0);
    }
    x=cx-tot/2;
    for(i=0;i<parts.length;i++){
      if(i) x+=3.5;
      if(!parts[i].b) parts[i].a.setAttribute('x',R(x));
      else { parts[i].a.setAttribute('x',R(x+parts[i].w/2)); parts[i].b.setAttribute('x',R(x+parts[i].w/2)); setLine(parts[i].bar,x+1,cy,x+parts[i].w-1,cy); }
      x+=parts[i].w;
    }
  }
  var SUB=['₁','₂','₃'];

  /* ---------- 1. PIGLOG shares: Engel curves, budget shares and wealth elasticities ---------- */
  NF.register('mi3-piglog',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var AL=[0.2,0.5,0.3], WL=1, WH=14, W=520, H=0, PA=null, PB=null, PC=null, el={}, st={w:4, b1:0.12, b3:-0.1}, cur={}, api=null,
        CL=['mi3-g1','mi3-g2','mi3-g3'], DC=['mi3-d1','mi3-d2','mi3-d3'], TC=['mi3-to','mi3-tb','mi3-tr'];
    var rw=range(fig,'w',1,function(v){ st.w=v; update(); }),
        rb1=range(fig,'beta1',2,function(v){ st.b1=v; draw(); }),
        rb3=range(fig,'beta3',2,function(v){ st.b3=v; draw(); });
    if(rw) st.w=rw.v();
    if(rb1) st.b1=rb1.v();
    if(rb3) st.b3=rb3.v();
    /* beta2 = -beta1 - beta3 keeps the shares adding to 1 */
    function BE(){ return [st.b1,-st.b1-st.b3,st.b3]; }
    function sh(l,w){ return AL[l]+BE()[l]*Math.log(w); }
    /* the shares are a demand system while all are at least 0: up to wv */
    function wvalid(){ var b=BE(), v=WH, l; for(l=0;l<3;l++) if(b[l]<-1e-12) v=Math.min(v,Math.exp(-AL[l]/b[l])); return Math.max(v,WL); }
    /* where good l turns inferior: beta = -b, the top of its Engel curve */
    function winf(l){ var b=BE()[l]; return b<-1e-12?Math.exp(-(AL[l]+b)/b):Infinity; }
    function draw(){
      var wv=wvalid(), mx=0, mb=0, i, l, w, b, rows, hA, hB, hC, y0, n=240, X=[[],[],[]], Bs=[[],[],[]], E=[[],[],[]], P, wi, lab=false, g;
      W=measure(svg);
      for(i=0;i<=n;i++){
        w=WL+(wv-WL)*i/n;
        for(l=0;l<3;l++){ b=sh(l,w); X[l].push([w,b*w]); Bs[l].push([w,b]); E[l].push([w,b>1e-6?1+BE()[l]/b:-1e6]); mx=Math.max(mx,b*w); mb=Math.max(mb,b); }
      }
      hA=Math.round(clamp(W*0.3,130,170)); hB=Math.round(clamp(W*0.2,96,124)); hC=Math.round(clamp(W*0.24,112,140));
      frame(svg,W,900);
      rows=key(S('g',null,svg),[['line','mi3-g1','good 1'],['line','mi3-g2','good 2'],['line','mi3-g3','good 3']],40,12,W-8);
      y0=12+(rows-1)*16+30;
      PA=box(svg,0,W-12,y0,y0+hA,[0,WH],[0,niceUp(mx*1.06)],'','',{title:'Engel curves xℓ = bℓw'});
      y0+=hA+42;
      PB=box(svg,0,W-12,y0,y0+hB,[0,WH],[0,Math.min(1,niceUp(mb*1.1))],'','',{title:'budget shares bℓ = αℓ + βℓ ln w'});
      y0+=hB+42;
      PC=box(svg,0,W-12,y0,y0+hC,[0,WH],[-1.5,2],'w','',{title:'wealth elasticities εℓw', sy:0.5});
      H=y0+hC+22; viewBox(svg,W,H);
      /* past wv some share is negative: grey that part out */
      if(wv<WH-1e-9){
        P=[PA,PB,PC];
        for(i=0;i<3;i++) S('rect',{x:R(P[i].xs(wv)),y:P[i].top,width:R(P[i].x1-P[i].xs(wv)),height:P[i].bot-P[i].top,'class':'mi3-void'},P[i].gc);
        text(PA.gc,(PA.xs(wv)+PA.x1)/2,PA.top+28,'a share < 0','nf-title','middle');
      }
      line(PC.gc,PC.x0,C(PC.ys(1)),PC.x1,C(PC.ys(1)),'mi3-ref');
      text(PC.gc,PC.x1-4,PC.ys(1.5)+4,'luxury','nf-title nf-halo','end');
      text(PC.gc,PC.x1-4,PC.ys(0.5)+4,'necessity','nf-title nf-halo','end');
      text(PC.gc,PC.x1-4,PC.ys(-0.75)+4,'inferior','nf-title nf-halo','end');
      for(l=0;l<3;l++){
        S('path',{d:pathOf(X[l],PA),'class':CL[l]},PA.gc);
        S('path',{d:pathOf(Bs[l],PB),'class':CL[l]},PB.gc);
        S('path',{d:pathOf(E[l],PC),'class':CL[l]},PC.gc);
        /* a good turns inferior at the top of its Engel curve */
        wi=winf(l);
        if(wi>=WL && wi<=wv){
          b=sh(l,wi)*wi;
          line(PA.gc,PA.xs(wi),PA.ys(0),PA.xs(wi),PA.ys(b),'mi3-vdot');
          S('circle',{cx:R(PA.xs(wi)),cy:R(PA.ys(b)),r:4,'class':'mi3-open '+CL[l]},PA.gc);
          if(!lab){ g=text(svg,PA.xs(wi)+6,PA.ys(0)-6,'good '+(l+1)+' turns inferior','nf-lab nf-halo '+TC[l]); lab=true; if(PA.xs(wi)+6+tw(g,'good 3 turns inferior')>PA.x1){ g.setAttribute('text-anchor','end'); moveTo(g,PA.xs(wi)-6,PA.ys(0)-6); } }
        }
      }
      el.g=[line(PA.gc,0,0,0,0,'nf-guide'),line(PB.gc,0,0,0,0,'nf-guide'),line(PC.gc,0,0,0,0,'nf-guide')];
      el.d=[[],[],[]];
      for(l=0;l<3;l++){ el.d[0].push(dot(PA.gc,DC[l],4)); el.d[1].push(dot(PB.gc,DC[l],4)); el.d[2].push(dot(PC.gc,DC[l],4)); }
      el.wv=wv;
      paint();
      if(api) api.changed();
    }
    function update(){ paint(); if(api) api.changed(); }
    function kind(e){ return e>1+1e-9?'luxury':e<-1e-9?'inferior':e>1-1e-9?'unit elastic':'necessity'; }
    function paint(){
      var w=st.w, be=BE(), ok=w<=el.wv+1e-9, P=[PA,PB,PC], b=[], x=[], e=[], l, i, s, agg=0, inf=[];
      for(i=0;i<3;i++) setLine(el.g[i],P[i].xs(w),P[i].top,P[i].xs(w),P[i].bot);
      for(l=0;l<3;l++){
        b.push(sh(l,w)); x.push(b[l]*w); e.push(1+be[l]/b[l]); agg+=b[l]*e[l];
        if(winf(l)<=WH) inf.push('good '+(l+1)+' turns inferior at w = '+fmt(winf(l),2));
        if(ok){ at(el.d[0][l],PA.xs(w),PA.ys(x[l])); at(el.d[1][l],PB.xs(w),PB.ys(b[l])); at(el.d[2][l],PC.xs(w),PC.ys(clamp(e[l],-1.6,2.1))); }
        for(i=0;i<3;i++) show(el.d[i][l],ok);
      }
      cur={w:w, beta1:be[0], beta2:be[1], beta3:be[2], b1:b[0], b2:b[1], b3:b[2], x1:x[0], x2:x[1], x3:x[2], e1:e[0], e2:e[1], e3:e[2],
        agg:agg, winf3:isFinite(winf(2))?winf(2):'none', wv:el.wv, valid:ok};
      out.textContent='';
      s='β = '+'('+fmt(be[0],2)+', '+fmt(be[1],2)+', '+fmt(be[2],2)+'), β₂ = '+MINUS+'β₁ '+MINUS+' β₃\n';
      put(out,s);
      if(!ok){ warn(out,'w = '+fmt(w,1)+' lies past w = '+fmt(el.wv,2)+', where a share turns negative: no demand system has these shares there'); return; }
      s='w = '+fmt(w,1)+': b = ('+fmt(b[0],2)+', '+fmt(b[1],2)+', '+fmt(b[2],2)+'), x = ('+fmt(x[0],2)+', '+fmt(x[1],2)+', '+fmt(x[2],2)+')\n';
      for(l=0;l<3;l++) s+='ε'+SUB[l]+'w = '+fmt(e[l],2)+' '+kind(e[l])+(l<2?'   ':'\n');
      s+='b₁ε₁w + b₂ε₂w + b₃ε₃w = '+fmt(agg,2)+' (Engel aggregation)'+(inf.length?'; '+inf.join(', '):'');
      put(out,s);
    }
    /* the Try it steps read the shares (b), quantities (x), elasticities (e) and the slopes beta; set takes w, beta1 and beta3 */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('beta1' in s && rb1) rb1.set(+s.beta1);
        if('beta3' in s && rb3) rb3.set(+s.beta3);
        if('w' in s && rw) rw.set(+s.w);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Utility maximisation: tangency and corner; v is quasiconvex in prices ---------- */
  NF.register('mi3-ump',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var PH=3, PMIN=0.2, W=520, H=0, F=null, G=null, el={}, st={pref:'ql', p1:1, p2:2, w:6, x1:4, q1:2.4, q2:2.6}, cur={}, hs=[], api=null, share=null, wasOpt=false;
    var rp1=range(fig,'p1',2,function(v){ st.p1=v; keep(); update(); }),
        rp2=range(fig,'p2',2,function(v){ st.p2=v; keep(); update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; keep(); update(); });
    if(rp1) st.p1=rp1.v();
    if(rp2) st.p2=rp2.v();
    if(rw) st.w=rw.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; keep(); draw(); }) || 'ql';
    onClick(fig,'.mi3-toopt',function(){ st.x1=opt().x1; update(); });
    /* u = sqrt(x1 x2) or ln x1 + x2 */
    function util(x1,x2){ return st.pref==='cd'?Math.sqrt(x1*x2):Math.log(x1)+x2; }
    function mu(x1,x2){ return st.pref==='cd'?[0.5*Math.sqrt(x2/x1),0.5*Math.sqrt(x1/x2)]:[1/x1,1]; }
    function opt(){
      var p1=st.p1, p2=st.p2, w=st.w;
      if(st.pref==='cd') return {x1:w/(2*p1), x2:w/(2*p2)};
      return w>p2?{x1:p2/p1, x2:w/p2-1}:{x1:w/p1, x2:0, corner:true};
    }
    function vf(p1,p2){ var w=st.w; if(st.pref==='cd') return w/(2*Math.sqrt(p1*p2)); return w>p2?Math.log(p2/p1)+w/p2-1:Math.log(w/p1); }
    /* the level set v(p, w) = c as p1 for each p2; v falls in p1, so the lower set v <= c lies to its right */
    function lev(c,p2){ var w=st.w; if(st.pref==='cd') return w*w/(4*c*c*p2); return p2<w?p2*Math.exp(Math.min(50,w/p2-1-c)):w*Math.exp(-c); }
    function lims(){ var X=st.w/st.p1; return st.pref==='cd'?[0.02*X,0.98*X]:[0.02*X,X]; }
    /* a change of prices or wealth keeps the bundle's share of the budget, and an optimal bundle stays optimal */
    function keep(){
      var l=lims();
      if(wasOpt) st.x1=opt().x1;
      else if(share!==null) st.x1=clamp(share*st.w/st.p1,l[0],l[1]);
    }
    function setX(x,snap){
      var l=lims(), o=opt();
      x=clamp(x,l[0],l[1]);
      if(snap && Math.abs(F.xs(x)-F.xs(o.x1))<snap) x=o.x1;
      st.x1=x; update();
    }
    function setP(a,b){
      if(rp1) rp1.set(clamp(a,PMIN,PH)); else st.p1=clamp(a,PMIN,PH);
      if(rp2) rp2.set(clamp(b,PMIN,PH)); else st.p2=clamp(b,PMIN,PH);
      if(!rp1 || !rp2){ keep(); update(); }
    }
    function setQ(a,b){ st.q1=Math.round(clamp(a,0.1,PH)*100)/100; st.q2=Math.round(clamp(b,0.1,PH)*100)/100; update(); }
    function draw(){
      var fi=focusedIndex(hs), h1, h2, top2, i;
      W=measure(svg);
      h1=Math.round(clamp(W*0.5,200,270)); h2=Math.round(clamp(W*0.46,180,250));
      frame(svg,W,900);
      F=box(svg,0,W-12,22,22+h1,[0,niceUp(1.15*st.w/st.p1)],[0,niceUp(1.15*st.w/st.p2)],'x₁','x₂',{title:'commodity space: budget p·x = w'});
      el.bud=line(F.gc,0,0,0,0,'mi3-bud');
      el.icp=S('path',{'class':'mi3-ic2'},F.gc);
      el.ic=S('path',{'class':'mi3-ic'},F.gc);
      el.tan=line(F.gc,0,0,0,0,'mi3-tanp');
      el.opt=dot(F.gc,'mi3-dot',5);
      el.olab=text(svg,0,0,'x*','nf-lab nf-halo mi3-it');
      top2=22+h1+46;
      G=box(svg,0,W-12,top2,top2+h2,[0,PH],[0,PH],'p₁','p₂',{title:'price space: level sets of v(p, w)'});
      el.low=S('path',{'class':'mi3-low'},G.gc);
      el.lev=[]; el.levt=[];
      for(i=0;i<4;i++){ el.lev.push(S('path',{'class':'mi3-lev'},G.gc)); el.levt.push(text(G.gc,0,0,'','mi3-levt nf-halo','end')); }
      el.levk=S('path',{'class':'mi3-levk'},G.gc);
      el.chord=line(G.gc,0,0,0,0,'mi3-chord');
      el.lowt=text(G.gc,0,0,'v ≤ v(p)','mi3-lowt nf-halo');
      el.pl=text(svg,0,0,'p','nf-vlab mi3-tb');
      el.ql=text(svg,0,0,'q','nf-vlab mi3-tp');
      H=top2+h2+22; viewBox(svg,W,H);
      hs=[handle(svg,'mi3-kp','Bundle on the budget line, arrow keys move it',function(dx,dy,big){ var l=lims(), s=(l[1]-l[0])/(big?10:50); setX(st.x1+(dx||dy)*s,0); }),
          handle(svg,'mi3-kb','Price vector p, arrow keys move it',function(dx,dy,big){ var s=big?0.25:0.05; setP(st.p1+dx*s,st.p2+dy*s); }),
          handle(svg,'mi3-kq','Second price vector q, arrow keys move it',function(dx,dy,big){ var s=big?0.25:0.05; setQ(st.q1+dx*s,st.q2+dy*s); })];
      paint();
      refocus(hs,fi);
      if(api) api.changed();
    }
    function update(){
      /* the commodity axes follow p and w; redraw the frame when they would change */
      if(F && (niceUp(1.15*st.w/st.p1)!==F.xd[1] || niceUp(1.15*st.w/st.p2)!==F.yd[1])){ draw(); return; }
      paint(); if(api) api.changed();
    }
    function levPts(c){ var p=[], i, y; for(i=0;i<=200;i++){ y=0.005+(PH+0.4)*Math.pow(i/200,1.3); p.push([clamp(lev(c,y),-1,PH+1),y]); } return p; }
    function paint(){
      var p1=st.p1, p2=st.p2, w=st.w, o=opt(), x1=st.x1, x2=Math.max(0,(w-p1*x1)/p2), m=mu(x1,x2), mrs=m[0]/m[1], ratio=p1/p2, mo, isOpt, P, s, L, v, lam,
          D=Math.max(F.xd[1],F.yd[1]), vp, vq, i, t, c, pts, lo, vmax=-Infinity, inq, Q, k;
      isOpt=Math.abs(x1-o.x1)<1e-9;
      wasOpt=isOpt; share=x1*p1/w;
      setLine(el.bud,F.xs(w/p1),F.ys(0),F.xs(0),F.ys(w/p2));
      v=util(o.x1,o.x2);
      el.ic.setAttribute('d',pathOf(st.pref==='cd'?IC.cd(v,D):IC.ql(v,D),F));
      el.icp.setAttribute('d',isOpt?'':pathOf(st.pref==='cd'?IC.cd(util(x1,x2),D):IC.ql(util(x1,x2),D),F));
      at(el.opt,F.xs(o.x1),F.ys(o.x2)); moveTo(el.olab,F.xs(o.x1)+9,F.ys(o.x2)-9);
      /* the purple segment has the indifference curve's slope at the bundle, minus the MRS */
      P=[F.xs(x1),F.ys(x2)];
      L=26/Math.hypot(F.xs(1)-F.xs(0),(F.ys(0)-F.ys(1))*mrs);
      setLine(el.tan,F.xs(x1-L),F.ys(x2+mrs*L),F.xs(x1+L),F.ys(x2-mrs*L));
      place(hs[0],P[0],P[1],'x = '+pair(x1,x2,2)+', MRS = '+fmt(mrs,2));
      mo=mu(o.x1,o.x2); lam=mo[0]/p1;
      /* price space: dotted level sets through (t, t), the solid one through p, its lower set shaded */
      vp=vf(p1,p2); vq=vf(st.q1,st.q2);
      /* dotted level sets through k p for k = 0.5, 0.7, 1.5, 2.2: v falls along the ray through p */
      t=[0.5,0.7,1.5,2.2];
      for(i=0;i<4;i++){
        c=vf(t[i]*p1,t[i]*p2); pts=levPts(c);
        el.lev[i].setAttribute('d',pathOf(pts,G));
        for(k=pts.length-1;k>=0 && !(pts[k][0]<=PH && pts[k][1]<=PH);k--);
        if(k>=0 && Math.abs(c-vp)>0.04*Math.max(1,Math.abs(vp))){
          el.levt[i].textContent='v = '+fmt(c,2); L=G.xs(Math.min(pts[k][0],PH));
          el.levt[i].setAttribute('text-anchor',L<(G.x0+G.x1)/2?'start':'end'); moveTo(el.levt[i],L<(G.x0+G.x1)/2?L+5:L-4,G.ys(pts[k][1])+13);
        }
        else el.levt[i].textContent='';
      }
      pts=levPts(vp);
      el.levk.setAttribute('d',pathOf(pts,G));
      lo=pts.slice(); lo.push([PH+1,PH+0.4],[PH+1,-0.5],[pts[0][0],-0.5]);
      el.low.setAttribute('d',pathOf(lo,G)+'Z');
      moveTo(el.lowt,G.xs(Math.min(PH-0.05,Math.max(p1,lev(vp,PH*0.85))+0.12)),G.ys(PH*0.85));
      /* quasiconvexity: along the segment from p to q, v never exceeds the larger end */
      for(i=0;i<=200;i++){ k=i/200; vmax=Math.max(vmax,vf(p1+(st.q1-p1)*k,p2+(st.q2-p2)*k)); }
      inq=vq<=vp+1e-9;
      setLine(el.chord,G.xs(p1),G.ys(p2),G.xs(st.q1),G.ys(st.q2));
      el.chord.setAttribute('class',inq?'mi3-chord':'mi3-chord is-out');
      Q=[G.xs(st.q1),G.ys(st.q2)];
      place(hs[1],G.xs(p1),G.ys(p2),'p = '+pair(p1,p2,2)+', v(p) = '+fmt(vp,2));
      place(hs[2],Q[0],Q[1],'q = '+pair(st.q1,st.q2,2)+', v(q) = '+fmt(vq,2));
      moveTo(el.pl,G.xs(p1)-12,G.ys(p2)-10); el.pl.setAttribute('text-anchor','end');
      moveTo(el.ql,Q[0]+12,Q[1]-10);
      cur={pref:st.pref, p1:p1, p2:p2, w:w, x1:x1, x2:x2, mrs:mrs, ratio:ratio, mu1:m[0]/p1, mu2:m[1]/p2, opt:isOpt, xs1:o.x1, xs2:o.x2, v:v, lam:lam,
        corner:!!o.corner, u:util(x1,x2), q1:st.q1, q2:st.q2, vp:vp, vq:vq, inq:inq, chordmax:vmax, qc:vmax<=Math.max(vp,vq)+1e-9};
      out.textContent='';
      s='at x = '+pair(x1,x2,2)+': MRS = u₁/u₂ = '+fmt(mrs,2)+' '+cmp(mrs,ratio)+' p₁/p₂ = '+fmt(ratio,2)+
        '\nu₁/p₁ = '+fmt(m[0]/p1,3)+' '+cmp(m[0]/p1,m[1]/p2)+' u₂/p₂ = '+fmt(m[1]/p2,3);
      if(isOpt && !o.corner) s+=': equal value per pound, the optimum';
      else if(isOpt) s+=': the optimum, a corner';
      else if(m[0]/p1>m[1]/p2) s+=': move spending to good 1';
      else s+=': move spending to good 2';
      s+='\noptimum x* = '+pair(o.x1,o.x2,2)+(o.corner?', a corner since w ≤ p₂':'')+'   v = '+fmt(v,2)+'   λ = u₁/p₁ = '+fmt(lam,3);
      if(o.corner) s+=' ≥ u₂/p₂ = '+fmt(mo[1]/p2,3);
      s+='\nv(p) = '+fmt(vp,2)+', v(q) = '+fmt(vq,2)+': '+(inq?'q is in the shaded set, and so is every point between p and q':'q lies outside the shaded set')+
        '; on the segment v peaks at '+fmt(vmax,2)+' = max(v(p), v(q))';
      put(out,s);
    }
    dragger(svg,function(){ return [W,H]; },
      function(){ var x2=Math.max(0,(st.w-st.p1*st.x1)/st.p2); return [[F.xs(st.x1),F.ys(x2)],[G.xs(st.p1),G.ys(st.p2)],[G.xs(st.q1),G.ys(st.q2)]]; },
      function(i,X,Y){
        var bx, by, t;
        if(i===0){
          /* project the pointer onto the budget segment in pixel space; it snaps to the optimum within 8 px */
          bx=F.xs(st.w/st.p1)-F.xs(0); by=F.ys(st.w/st.p2)-F.ys(0);
          t=((X-F.xs(0))*bx+(Y-F.ys(0))*by)/(bx*bx+by*by);
          setX(clamp(t,0,1)*st.w/st.p1,8);
        } else if(i===1) setP(G.xs.inv(X),G.ys.inv(Y));
        else setQ(G.xs.inv(X),G.ys.inv(Y));
      },
      function(i){ try{ hs[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} });
    /* the Try it steps read the bundle, MRS, value per pound, the optimum, v at p and q and the chord check;
       set takes pref, p1, p2, w, x1, q1, q2 and probe=opt */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('p1' in s && rp1) rp1.set(+s.p1);
        if('p2' in s && rp2) rp2.set(+s.p2);
        if('w' in s && rw) rw.set(+s.w);
        if('x1' in s) setX(+s.x1,0);
        if('q1' in s || 'q2' in s) setQ('q1' in s?+s.q1:st.q1,'q2' in s?+s.q2:st.q2);
        if(s.probe==='opt'){ st.x1=opt().x1; update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Hicksian demand, Marshallian demand and Shephard's lemma ---------- */
  NF.register('mi3-shephard',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var U=5, P2=1, PL=0.4, PH=3, D=12, W=520, H=0, F, G, K, el={}, st={sig:'1', p1:1.6, p0:1}, cur={}, api=null;
    var rp1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        rp0=range(fig,'p0',2,function(v){ st.p0=v; update(); });
    if(rp1) st.p1=rp1.v();
    if(rp0) st.p0=rp0.v();
    st.sig=seg(fig,'data-sig',function(v){ st.sig=v; update(); }) || '1';
    /* CES u = (x1^r/2 + x2^r/2)^(1/r) with r = (s - 1)/s: s = 0 is min(x1, x2), s = 1 Cobb Douglas sqrt(x1 x2),
       s = inf (x1 + x2)/2. Price index P(p) = e(p, 1); Hicksian demand h = u P^s (p/2)^(-s)/2^s */
    function sol(p1){
      var s=st.sig, P, h1, h2;
      if(s==='0') return {e:U*(p1+P2), h:[U,U], ok:true};
      if(s==='inf'){
        if(Math.abs(p1-P2)<1e-9) return {e:2*U*P2, h:null, ok:false};
        return p1<P2?{e:2*U*p1, h:[2*U,0], ok:true}:{e:2*U*P2, h:[0,2*U], ok:true};
      }
      if(s==='1') return {e:2*U*Math.sqrt(p1*P2), h:[U*Math.sqrt(P2/p1),U*Math.sqrt(p1/P2)], ok:true};
      s=+s;
      P=Math.pow(Math.pow(0.5,s)*Math.pow(p1,1-s)+Math.pow(0.5,s)*Math.pow(P2,1-s),1/(1-s));
      h1=U*Math.pow(0.5,s)*Math.pow(p1,-s)*Math.pow(P,s); h2=U*Math.pow(0.5,s)*Math.pow(P2,-s)*Math.pow(P,s);
      return {e:U*P, h:[h1,h2], ok:true};
    }
    /* Marshallian demand at wealth w0: homothetic, so x(p, w0) = h(p, u) w0/e(p, u) */
    function marsh(p1,w0){ var a=sol(p1); return a.h?a.h[0]*w0/a.e:NaN; }
    function hick(p1){ var a=sol(p1); return a.h?a.h[0]:NaN; }
    function icPts(){
      var s=st.sig, pts=[], i, t, r, q;
      if(s==='0') return [[U,3*D],[U,U],[3*D,U]];
      if(s==='inf') return [[0,2*U],[2*U,0]];
      if(s==='1') return IC.cd(U,D);
      r=(+s-1)/(+s);
      /* parametrise by the share q of u^r that comes from good 1: x1 = u (2q)^(1/r), x2 = u (2(1 - q))^(1/r) */
      for(i=1;i<400;i++){ t=i/400; q=(1-Math.cos(Math.PI*t))/2; pts.push([U*Math.pow(2*q,1/r),U*Math.pow(2*(1-q),1/r)]); }
      if(r>0){ pts.unshift([0,U*Math.pow(2,1/r)]); pts.push([U*Math.pow(2,1/r),0]); }
      return pts;
    }
    /* the top of the expenditure axis: e and the old bundle's cost line over the price range */
    function yTop(){
      var b=sol(st.p0), m=0, i, q;
      for(i=0;i<=60;i++){ q=PL+(PH-PL)*i/60; m=Math.max(m,sol(q).e); if(b.h) m=Math.max(m,q*b.h[0]+P2*b.h[1]); }
      return niceUp(m*1.04);
    }
    /* the bottom of the expenditure axis sits a little under the lowest curve, so the gap between them reads well */
    function yBot(top){
      var b=sol(st.p0), m=Infinity, i, q, step;
      for(i=0;i<=60;i++){ q=PL+(PH-PL)*i/60; m=Math.min(m,sol(q).e); if(b.h) m=Math.min(m,q*b.h[0]+P2*b.h[1]); }
      step=niceStep(top-m,4);
      return Math.max(0,Math.floor(m*0.97/step)*step);
    }
    function draw(){
      var wide, half, hA, hB, hC, y0;
      W=measure(svg); wide=W>=560;
      frame(svg,W,1200);
      if(wide){
        half=Math.floor((W-24)/2); hA=Math.round(clamp(half*0.8,190,250)); hC=Math.round(clamp(W*0.27,140,180));
        F=box(svg,0,half,22,22+hA,[0,D],[0,D],'x₁','x₂',{title:'h(p, ū) slides along u = ū'});
        K=box(svg,half+12,W-12,22,22+hA,[0,D],[0,PH],'x₁','p₁',{title:'Hicksian and Marshallian demand'});
        y0=22+hA+46;
      } else {
        hA=Math.round(clamp(W*0.64,190,250)); hB=Math.round(clamp(W*0.5,150,190));
        F=box(svg,0,W-12,22,22+hA,[0,D],[0,D],'x₁','x₂',{title:'h(p, ū) slides along u = ū'});
        y0=22+hA+46;
        K=box(svg,0,W-12,y0,y0+hB,[0,D],[0,PH],'x₁','p₁',{title:'Hicksian and Marshallian demand'});
        y0+=hB+46; hC=hB;
      }
      G=box(svg,0,W-12,y0,y0+hC,[0,PH],[yBot(yTop()),yTop()],'p₁','expenditure',{title:'e(p₁, ū) is concave in p₁'});
      H=y0+hC+22; viewBox(svg,W,H);
      el.ic=S('path',{'class':'mi3-ic'},F.gc);
      el.iso0=line(F.gc,0,0,0,0,'mi3-old');
      el.iso=line(F.gc,0,0,0,0,'mi3-bud');
      el.h0=dot(F.gc,'mi3-pdot',4.5);
      el.h=dot(F.gc,'mi3-dot',5);
      el.h0l=text(svg,0,0,'h(p⁰)','mi3-tp nf-halo');
      el.hl=text(svg,0,0,'h(p)','mi3-tb nf-halo');
      el.mx=S('path',{'class':'mi3-marsh'},K.gc);
      el.hx=S('path',{'class':'mi3-path'},K.gc);
      el.kg=line(K.gc,0,0,0,0,'nf-guide');
      el.kr=dot(K.gc,'mi3-rdot',4.5);
      el.km=dot(K.gc,'mi3-kdot',4);
      el.kh=dot(K.gc,'mi3-dot',4);
      el.kml=text(svg,0,0,'x₁(p₁, w⁰)','nf-lab nf-halo');
      el.khl=text(svg,0,0,'h₁(p₁, ū)','mi3-tb nf-halo');
      el.ec=S('path',{'class':'mi3-e'},G.gc);
      el.old=S('path',{'class':'mi3-old'},G.gc);
      el.gap=line(G.gc,0,0,0,0,'mi3-gap');
      el.t0=dot(G.gc,'mi3-pdot',4);
      el.od=dot(G.gc,'mi3-pring',4.5);
      el.ed=dot(G.gc,'mi3-dot',4.5);
      el.el=text(svg,0,0,'e(p, ū)','mi3-tb nf-halo');
      el.ol=text(svg,0,0,'p·h(p⁰)','mi3-tp nf-halo');
      paint();
      if(api) api.changed();
    }
    function update(){
      /* the lower plot's height follows the curves; redraw when it would change */
      if(G && (yTop()!==G.yd[1] || yBot(yTop())!==G.yd[0])){ draw(); return; }
      paint(); if(api) api.changed();
    }
    function iso(e,cost,p1){ setLine(e,F.xs(cost/p1),F.ys(0),F.xs(0),F.ys(cost/P2)); }
    /* elasticity d ln f / d ln p at p, or NaN where f is 0 or jumps */
    function elas(f,p){ var d=1e-4, a=f(p*(1+d)), b=f(p*(1-d)); return a>0 && b>0 && Math.abs(a-b)<0.5*(a+b)?(Math.log(a)-Math.log(b))/(Math.log(1+d)-Math.log(1-d)):NaN; }
    function paint(){
      var p1=st.p1, p0=st.p0, a=sol(p1), b=sol(p0), es=[], ls=[], hs=[], ms=[], i, q, old=null, gap=null, slope, w0=b.e, qs=grid(PL,PH,240), xm, eh, em, b1, lab, s;
      el.ic.setAttribute('d',pathOf(icPts(),F));
      if(st.sig==='inf') qs.push(P2-1e-9,P2+1e-9);
      qs.sort(function(x,y){ return x-y; });
      for(i=0;i<qs.length;i++){
        q=qs[i]; es.push([q,sol(q).e]); if(b.h) ls.push([q,q*b.h[0]+P2*b.h[1]]);
        hs.push([hick(q),q]); ms.push([marsh(q,w0),q]);
      }
      el.ec.setAttribute('d',pathOf(es,G));
      el.old.setAttribute('d',b.h?pathOf(ls,G):'');
      el.hx.setAttribute('d',pathOf(hs,K));
      el.mx.setAttribute('d',pathOf(ms,K));
      at(el.ed,G.xs(p1),G.ys(a.e));
      moveTo(el.el,G.xs(PH)-4,G.ys(es[es.length-1][1])+15); el.el.setAttribute('text-anchor','end');
      /* the demand panel: both curves pass through h1(p0) at p0, and the guide marks p1 */
      setLine(el.kg,K.x0,K.ys(p1),K.x1,K.ys(p1));
      xm=marsh(p1,w0);
      show(el.kh,!!a.h); show(el.km,isFinite(xm)); show(el.kr,!!b.h);
      if(a.h) at(el.kh,K.xs(a.h[0]),K.ys(p1));
      if(isFinite(xm)) at(el.km,K.xs(xm),K.ys(p1));
      if(b.h) at(el.kr,K.xs(b.h[0]),K.ys(p0));
      lab=function(t,x,y){ t.setAttribute('text-anchor',x>K.x1-80?'end':'start'); moveTo(t,x>K.x1-80?x-8:x+8,y); };
      q=PH*0.88;
      lab(el.khl,K.xs(Math.min(D,hick(q))),K.ys(q)-4);
      el.kml.setAttribute('text-anchor','end'); moveTo(el.kml,Math.max(K.x0+70,K.xs(Math.min(D,marsh(q,w0)||0))-8),K.ys(q)+4);
      if(b.h){
        old=p1*b.h[0]+P2*b.h[1]; gap=old-a.e;
        show(el.od,true); at(el.od,G.xs(p1),G.ys(old));
        setLine(el.gap,G.xs(p1),G.ys(old),G.xs(p1),G.ys(a.e));
        show(el.t0,true); at(el.t0,G.xs(p0),G.ys(b.e));
        el.ol.textContent='p·h(p⁰)'; el.ol.setAttribute('text-anchor','end'); moveTo(el.ol,G.xs(PH)-4,G.ys(ls[ls.length-1][1])-7);
        show(el.h0,true); at(el.h0,F.xs(b.h[0]),F.ys(b.h[1]));
        el.h0l.textContent='h(p⁰)'; moveTo(el.h0l,F.xs(b.h[0])+8,F.ys(b.h[1])+15);
        iso(el.iso0,old,p1);
      } else {
        show(el.od,false); setLine(el.gap,0,0,0,0); show(el.t0,false); el.ol.textContent='';
        show(el.h0,false); el.h0l.textContent=''; setLine(el.iso0,0,0,0,0);
      }
      iso(el.iso,a.e,p1);
      if(a.h){ show(el.h,true); at(el.h,F.xs(a.h[0]),F.ys(a.h[1])); el.hl.textContent='h(p)'; moveTo(el.hl,F.xs(a.h[0])+8,F.ys(a.h[1])-8); }
      else { show(el.h,false); el.hl.textContent=''; }
      slope=b.h?b.h[0]:'n/a';
      em=elas(function(p){ return marsh(p,w0); },p1); eh=elas(hick,p1);
      if(st.sig==='0') eh=0;
      if(st.sig==='inf' && a.h) eh=0;
      b1=isFinite(xm)?p1*xm/w0:NaN;
      cur={sig:st.sig, p1:p1, p0:p0, e:a.e, uniq:a.ok, uniq0:b.ok, slope:slope, e0:b.e, w0:w0, xm:isFinite(xm)?xm:'n/a', em:isFinite(em)?em:'n/a', eh:isFinite(eh)?eh:'n/a', share:isFinite(b1)?b1:'n/a'};
      if(a.h){ cur.h1=a.h[0]; cur.h2=a.h[1]; }
      if(b.h){ cur.h01=b.h[0]; cur.h02=b.h[1]; cur.old=old; cur.gap=gap; } else { cur.old='n/a'; cur.gap='n/a'; }
      out.textContent='';
      put(out,(a.h?'h(p) = '+pair(a.h[0],a.h[1],2):'h(p) is every bundle on the indifference line')+'   e(p, ū) = '+fmt(a.e,2)+' at p₁ = '+fmt(p1,2));
      if(b.h){
        put(out,'\nold bundle h(p⁰) = '+pair(b.h[0],b.h[1],2)+' costs p·h(p⁰) = '+fmt(old,2)+(gap>5e-3?', so substitution saves '+fmt(gap,2):', the cheapest way to reach ū'));
        put(out,'\nslope of e at p₁⁰ = '+fmt(p0,2)+': ∂e/∂p₁ = '+fmt(slope,2)+' = h₁(p⁰)'+(st.sig==='0'?', the same at every price':''));
      } else {
        put(out,'\n'); warn(out,'at p₁⁰ = p₂ every bundle on the indifference line is cheapest: h(p⁰) is not unique and e has a kink, left slope 10, right slope 0, so Shephard’s lemma does not apply');
      }
      s='\nw⁰ = e(p⁰, ū) = '+fmt(w0,2)+'. At p₁ = '+fmt(p1,2)+': ';
      if(isFinite(em) && isFinite(eh) && isFinite(b1)) s+='ε₁₁ = '+fmt(em,2)+' = εʰ₁₁ '+MINUS+' ε₁w b₁ = '+fmt(eh,2)+' '+MINUS+' 1 × '+fmt(b1,2);
      else s+='x₁ is 0 or jumps here, so the elasticities are not defined';
      put(out,s);
    }
    /* the Try it steps read e, h, the old bundle's cost, the slope at p0 and the two elasticities; set takes sig, p1 and p0 */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('sig' in s) NF.press(fig,'data-sig',String(s.sig));
        if('p0' in s && rp0) rp0.set(+s.p0);
        if('p1' in s && rp1) rp1.set(+s.p1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. The duality map ---------- */
  NF.register('mi3-duality',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=0, el={}, st={pref:'cd', link:'roy', p1:1, p2:1, w:10}, cur={}, api=null, B={};
    var rp1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        rp2=range(fig,'p2',2,function(v){ st.p2=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); });
    if(rp1) st.p1=rp1.v();
    if(rp2) st.p2=rp2.v();
    if(rw) st.w=rw.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; update(); }) || 'cd';
    st.link=seg(fig,'data-link',function(v){ st.link=v; update(); }) || 'roy';
    /* x, v, e and h for u = sqrt(x1 x2), min(x1, x2) and ln x1 + x2 */
    var M={
      cd:{x:function(p1,p2,w){ return [w/(2*p1),w/(2*p2)]; }, v:function(p1,p2,w){ return w/(2*Math.sqrt(p1*p2)); },
          e:function(p1,p2,u){ return 2*u*Math.sqrt(p1*p2); }, h:function(p1,p2,u){ return [u*Math.sqrt(p2/p1),u*Math.sqrt(p1/p2)]; },
          f:function(){ return {x:['x₁ =',['w','2p₁']], v:['v =',['w','2√(p₁p₂)']], e:['e = 2ū√(p₁p₂)'], h:['h₁ =',['ū√p₂','√p₁']]}; }},
      leo:{x:function(p1,p2,w){ return [w/(p1+p2),w/(p1+p2)]; }, v:function(p1,p2,w){ return w/(p1+p2); },
          e:function(p1,p2,u){ return (p1+p2)*u; }, h:function(p1,p2,u){ return [u,u]; },
          f:function(){ return {x:['x₁ = x₂ =',['w','p₁ + p₂']], v:['v =',['w','p₁ + p₂']], e:['e = (p₁ + p₂)ū'], h:['h₁ = h₂ = ū']}; }},
      ql:{x:function(p1,p2,w){ return w>p2?[p2/p1,w/p2-1]:[w/p1,0]; }, v:function(p1,p2,w){ return w>p2?Math.log(p2/p1)+w/p2-1:Math.log(w/p1); },
          e:function(p1,p2,u){ return u>Math.log(p2/p1)?p2*(1+u-Math.log(p2/p1)):p1*Math.exp(u); },
          h:function(p1,p2,u){ return u>Math.log(p2/p1)?[p2/p1,u-Math.log(p2/p1)]:[Math.exp(u),0]; },
          f:function(p1,p2,w){ return w>p2?{x:['x₁ =',['p₂','p₁']], v:['v = ln',['p₂','p₁'],'+',['w','p₂'],MINUS+' 1'], e:['e = p₂(1 + ū '+MINUS+' ln',['p₂','p₁'],')'], h:['h₁ =',['p₂','p₁']]}
                                          :{x:['x₁ =',['w','p₁'],', x₂ = 0'], v:['v = ln',['w','p₁']], e:['e = p₁ exp(ū)'], h:['h₁ = exp(ū), h₂ = 0']}; }}
    };
    var LINKS={roy:['v','x'], shep:['e','h'], inv:['v','e'], same:['x','h']};
    function draw(){
      var m=1, hg, cw, bh=86, vg=52, y1=46, y2, xl, xr, k, b, g, cx, mid, a;
      W=measure(svg);
      hg=W>=520?116:Math.max(58,Math.round(W*0.17)); cw=(W-hg-2*m)/2; y2=y1+bh+vg; xl=m; xr=m+cw+hg;
      H=y2+bh+4; frame(svg,W,H);
      g=S('g',null,svg);
      text(g,xl+cw/2,13,'UMP','mi3-hu','middle'); text(g,xl+cw/2,29,'max u(x) s.t. p·x ≤ w','nf-lab','middle');
      text(g,xr+cw/2,13,'EMP','mi3-he','middle'); text(g,xr+cw/2,29,'min p·x s.t. u(x) ≥ ū','nf-lab','middle');
      B={v:[xl,y1,'v(p, w)','u'], e:[xr,y1,'e(p, ū)','e'], x:[xl,y2,'x(p, w)','u'], h:[xr,y2,'h(p, ū)','e']};
      for(k in B){
        b=B[k]; g=S('g',null,svg);
        b.r=S('rect',{x:R(b[0]+0.5),y:R(b[1]+0.5),width:R(cw-1),height:bh-1,rx:4,'class':'mi3-bx mi3-bx'+b[3]},g);
        text(g,b[0]+cw/2,b[1]+18,b[2],'mi3-bt mi3-bt'+b[3],'middle');
        b.f=S('g',null,g);
        b.v=text(g,b[0]+cw/2,b[1]+bh-11,'','mi3-bv','middle');
        b.cx=b[0]+cw/2;
      }
      el.ar={};
      /* Roy and Shephard run down the columns; inverse and x = h run across the gap */
      function arrow(name,x0,y0,x1,y1,both,lab,lx,ly,anchor){
        var a=S('g',{'class':'mi3-link'},svg);
        line(a,x0,y0,x1,y1,'mi3-hitl');
        a.v=vec(a,'mi3-arr','mi3-arrh');
        setVec(a.v,x0,y0,x1,y1,4,both);
        text(a,lx,ly,lab,'mi3-al',anchor);
        clicker(a,lab+': show this link',function(){ NF.press(fig,'data-link',name); });
        el.ar[name]=a;
      }
      cx=xl+cw/2; mid=(y1+bh+y2)/2;
      arrow('roy',cx,y1+bh+3,cx,y2-3,false,'Roy',cx+9,mid+4,'start');
      cx=xr+cw/2;
      arrow('shep',cx,y1+bh+3,cx,y2-3,false,'Shephard',cx-9,mid+4,'end');
      a=xl+cw+4;
      arrow('inv',a,y1+bh/2+6,xr-4,y1+bh/2+6,true,'inverse',(a+xr)/2,y1+bh/2-3,'middle');
      arrow('same',a,y2+bh/2+6,xr-4,y2+bh/2+6,true,'x = h',(a+xr)/2,y2+bh/2-3,'middle');
      update();
    }
    function V(p1,p2,w){ return M[st.pref].v(p1,p2,w); }
    function X(p1,p2,w){ return M[st.pref].x(p1,p2,w); }
    function E(p1,p2,u){ return M[st.pref].e(p1,p2,u); }
    function Hh(p1,p2,u){ return M[st.pref].h(p1,p2,u); }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var p1=st.p1, p2=st.p2, w=st.w, x=X(p1,p2,w), u=V(p1,p2,w), e=E(p1,p2,u), h=Hh(p1,p2,u), f=M[st.pref].f(p1,p2,w), d=1e-5, k, on, s,
          vp=(V(p1+d,p2,w)-V(p1-d,p2,w))/(2*d), vw=(V(p1,p2,w+d)-V(p1,p2,w-d))/(2*d), ep=(E(p1+d,p2,u)-E(p1-d,p2,u))/(2*d),
          hp=(Hh(p1+d,p2,u)[0]-Hh(p1-d,p2,u)[0])/(2*d), xp=(X(p1+d,p2,w)[0]-X(p1-d,p2,w)[0])/(2*d), xw=(X(p1,p2,w+d)[0]-X(p1,p2,w-d)[0])/(2*d),
          vi=V(p1,p2,e), lk=LINKS[st.link];
      for(k in B){
        while(B[k].f.firstChild) B[k].f.removeChild(B[k].f.firstChild);
        mathLine(B[k].f,B[k].cx,B[k][1]+44,f[k],'mi3-fx');
        on=lk.indexOf(k)>=0;
        B[k].r.setAttribute('class','mi3-bx mi3-bx'+B[k][3]+(on?' is-on':''));
      }
      B.x.v.textContent=pair(x[0],x[1],2);
      B.v.v.textContent=fmt(u,2);
      B.e.v.textContent=fmt(e,2);
      B.h.v.textContent=pair(h[0],h[1],2);
      for(k in el.ar) el.ar[k].setAttribute('class','mi3-link'+(k===st.link?' is-on':''));
      cur={pref:st.pref, link:st.link, p1:p1, p2:p2, w:w, ub:u, x1:x[0], x2:x[1], v:u, e:e, h1:h[0], h2:h[1], vp:vp, vw:vw, roy:-vp/vw, ep:ep,
        hp:hp, xp:xp, xw:xw, slutsky:xp+x[0]*xw, vi:vi, corner:x[1]<=1e-12};
      out.textContent='';
      put(out,'ū = v(p, w) = '+fmt(u,2)+', so both problems aim at the same utility: x = '+pair(x[0],x[1],2)+', h = '+pair(h[0],h[1],2)+'\n');
      if(st.link==='roy') s='Roy: ∂v/∂p₁ = '+fmt(vp,3)+' and ∂v/∂w = λ = '+fmt(vw,3)+', so '+MINUS+'(∂v/∂p₁)/(∂v/∂w) = '+fmt(-vp/vw,2)+' = x₁(p, w)';
      else if(st.link==='shep') s='Shephard: ∂e/∂p₁ = '+fmt(ep,2)+' = h₁(p, ū) at ū = '+fmt(u,2)+'; e is in money, so nothing is divided out';
      else if(st.link==='inv') s='e(p, v(p, w)) = e(p, '+fmt(u,2)+') = '+fmt(e,2)+' = w, and v(p, e(p, ū)) = v(p, '+fmt(e,2)+') = '+fmt(vi,2)+' = ū: e(p, ·) and v(p, ·) are inverses';
      else s='x(p, w) = h(p, v(p, w)). Differentiate in p₁: ∂h₁/∂p₁ = ∂x₁/∂p₁ + x₁ ∂x₁/∂w, '+fmt(hp,2)+' = '+fmt(xp,2)+' + '+fmt(x[0],2)+' × '+fmt(xw,3)+': the Slutsky equation';
      put(out,s);
    }
    /* the Try it steps read the four objects and the derivatives each link uses; set takes pref, link, p1, p2 and w */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('link' in s) NF.press(fig,'data-link',String(s.link));
        if('p1' in s && rp1) rp1.set(+s.p1);
        if('p2' in s && rp2) rp2.set(+s.p2);
        if('w' in s && rw) rw.set(+s.w);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Slutsky: a price rise split into substitution and wealth effects ---------- */
  NF.register('mi3-slutsky',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var PL=0.5, PH=3, W=520, H=0, F, el={}, st={pref:'cd', p1:2, w:10, wi:2.5}, cur={}, api=null, dom=null;
    var rp1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); }),
        rwi=range(fig,'wi',2,function(v){ st.wi=v; update(); });
    if(rp1) st.p1=rp1.v();
    if(rw) st.w=rw.v();
    if(rwi) st.wi=rwi.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; sliders(); update(); }) || 'cd';
    /* the inferior good has its own wealth slider, since its tangency needs w >= 2 */
    function sliders(){ var i=st.pref==='inf'; if(rw) rw.wrap.classList.toggle('mi3-hide',i); if(rwi) rwi.wrap.classList.toggle('mi3-hide',!i); }
    sliders();
    function W0(){ return st.pref==='inf'?st.wi:st.w; }
    /* u = sqrt(x1 x2) (normal), ln x1 + x2^2/2 (inferior) or ln x1 + x2 (quasilinear); p2 = 1 and the old price of good 1 is 1 */
    function util(b){ return st.pref==='cd'?Math.sqrt(b[0]*b[1]):st.pref==='ql'?Math.log(b[0])+b[1]:Math.log(b[0])+0.5*b[1]*b[1]; }
    function x(p1,w){
      var t, T, Cn;
      if(st.pref==='cd') return [w/(2*p1),w/2];
      if(st.pref==='ql') return w>1?[1/p1,w-1]:[w/p1,0];
      /* the tangency x1 x2 = 1/p1 on the branch x2 > 1, where preferences are convex, against the corner (w/p1, 0) */
      Cn=[w/p1,0];
      if(w<2) return Cn;
      t=(w-Math.sqrt(w*w-4))/2; T=[t/p1,w-t];
      return util(T)>=util(Cn)?T:Cn;
    }
    function h(p1,u){
      var c, lo, hi, m, i, y, tc;
      if(st.pref==='cd') return [u/Math.sqrt(p1),u*Math.sqrt(p1)];
      if(st.pref==='ql') return u+Math.log(p1)>0?[1/p1,u+Math.log(p1)]:[Math.exp(u),0];
      /* cheapest of the tangency (x2 > 1 solves x2^2/2 - ln x2 = u + ln p1, cost x2 + 1/x2) and the corner (e^u, 0), cost p1 e^u */
      c=u+Math.log(p1);
      if(c<0.5) return [Math.exp(u),0];
      lo=1; hi=Math.max(2,Math.sqrt(2*c)+2);
      for(i=0;i<80;i++){ m=(lo+hi)/2; if(0.5*m*m-Math.log(m)<c) lo=m; else hi=m; }
      y=(lo+hi)/2; tc=y+1/y;
      return tc<=p1*Math.exp(u)?[1/(p1*y),y]:[Math.exp(u),0];
    }
    function e(p1,u){ var b=h(p1,u); return p1*b[0]+b[1]; }
    function ic(u,D){ return st.pref==='cd'?IC.cd(u,D):st.pref==='ql'?IC.ql(u,D):IC.inf(u,D); }
    /* the axes depend on the preference and w only, so they stay put while p1 moves */
    /* for the inferior good the corner bundles (x2 = 0) far out on the x1 axis count only when they are on screen now,
       so the axes jump only when B or C jumps to the corner */
    function domain(){
      var w=W0(), A=x(1,w), u=util(A), mx=A[0], my=A[1], i, q, b, c, inf=st.pref==='inf';
      for(i=0;i<=60;i++){
        q=PL+(PH-PL)*i/60; b=h(q,u); c=x(q,w);
        if(!inf || b[1]>0){ mx=Math.max(mx,b[0]); my=Math.max(my,b[1]); }
        if(!inf || c[1]>0){ mx=Math.max(mx,c[0]); my=Math.max(my,c[1]); }
      }
      b=h(st.p1,u); c=x(st.p1,w); mx=Math.max(mx,b[0],c[0]); my=Math.max(my,b[1],c[1]);
      return [st.pref,w,niceUp(1.12*mx),niceUp(1.12*my)];
    }
    function draw(){
      var rows, top;
      W=measure(svg);
      frame(svg,W,900);
      dom=domain();
      rows=key(S('g',null,svg),[['line','mi3-bud0','old budget, p₁ = 1'],['line','mi3-bud','new budget, p₁′'],['line','mi3-comp','compensated']],40,12,W-8);
      top=12+(rows-1)*16+20;
      el.bot=top+Math.round(clamp(W*0.6,220,320));
      F=box(svg,0,W-12,top,el.bot,[0,dom[2]],[0,dom[3]],'x₁','x₂');
      H=el.bot+64; viewBox(svg,W,H);
      el.bud0=line(F.gc,0,0,0,0,'mi3-bud0');
      el.comp=line(F.gc,0,0,0,0,'mi3-comp');
      el.bud=line(F.gc,0,0,0,0,'mi3-bud');
      el.ic0=S('path',{'class':'mi3-ic'},F.gc);
      el.ic1=S('path',{'class':'mi3-ic2'},F.gc);
      el.se=vec(F.gc,'mi3-se','mi3-seh');
      el.ie=vec(F.gc,'mi3-ie','mi3-ieh');
      el.A=dot(F.gc,'mi3-dot',5);
      el.B=dot(F.gc,'mi3-pdot',4.5);
      el.C=dot(F.gc,'mi3-rdot',4.5);
      el.Al=text(svg,0,0,'A','nf-lab nf-halo');
      el.Bl=text(svg,0,0,'B','mi3-tp nf-halo');
      el.Cl=text(svg,0,0,'C','mi3-tr nf-halo');
      /* the strip under the x1 axis splits the change in x1 */
      el.va=line(svg,0,0,0,0,'mi3-vdot'); el.vb=line(svg,0,0,0,0,'mi3-vdot'); el.vc=line(svg,0,0,0,0,'mi3-vdot');
      el.sse=vec(svg,'mi3-se','mi3-seh'); el.swe=vec(svg,'mi3-ie','mi3-ieh');
      el.tse=text(svg,0,0,'','mi3-tp'); el.twe=text(svg,0,0,'','mi3-tr');
      paint();
      if(api) api.changed();
    }
    function update(){
      var d=domain();
      if(!dom || d[0]!==dom[0] || d[1]!==dom[1] || d[2]!==dom[2] || d[3]!==dom[3]){ draw(); return; }
      paint(); if(api) api.changed();
    }
    function lab(t,P,Q){
      /* put the label on the far side of P from Q, or above when they coincide */
      var dx=P[0]-Q[0], dy=P[1]-Q[1], n=Math.hypot(dx,dy);
      if(n<1){ dx=0.7; dy=-0.7; n=1; }
      moveTo(t,P[0]+dx/n*13-4,P[1]+dy/n*13+4);
    }
    function stripLab(t,xa,xb,y,s){
      var r=Math.max(xa,xb), l=Math.min(xa,xb);
      t.textContent=s;
      if(r+8+tw(t,s)<=F.x1){ t.setAttribute('text-anchor','start'); moveTo(t,r+8,y+4); }
      else { t.setAttribute('text-anchor','end'); moveTo(t,l-8,y+4); }
    }
    function paint(){
      var w=W0(), p1=st.p1, A=x(1,w), u=util(A), B=h(p1,u), Cb=x(p1,w), ep=e(p1,u), D=Math.max(dom[2],dom[3]), dp=p1-1, pa, pb, pc, s,
          se=B[0]-A[0], we=Cb[0]-B[0], dx=Cb[0]-A[0], u1=util(Cb), y1=el.bot+31, y2=el.bot+49;
      setLine(el.bud0,F.xs(w),F.ys(0),F.xs(0),F.ys(w));
      setLine(el.bud,F.xs(w/p1),F.ys(0),F.xs(0),F.ys(w));
      setLine(el.comp,F.xs(ep/p1),F.ys(0),F.xs(0),F.ys(ep));
      el.ic0.setAttribute('d',pathOf(ic(u,D),F));
      el.ic1.setAttribute('d',Math.abs(dp)<1e-9?'':pathOf(ic(u1,D),F));
      pa=[F.xs(A[0]),F.ys(A[1])]; pb=[F.xs(B[0]),F.ys(B[1])]; pc=[F.xs(Cb[0]),F.ys(Cb[1])];
      setVec(el.se,pa[0],pa[1],pb[0],pb[1]);
      setVec(el.ie,pb[0],pb[1],pc[0],pc[1]);
      at(el.A,pa[0],pa[1]); at(el.B,pb[0],pb[1]); at(el.C,pc[0],pc[1]);
      lab(el.Al,pa,pb); lab(el.Bl,pb,pa); lab(el.Cl,pc,pb);
      if(Math.hypot(pc[0]-pb[0],pc[1]-pb[1])<12) moveTo(el.Cl,pc[0]+10,pc[1]+16);
      setLine(el.va,pa[0],F.bot+18,pa[0],y2+6); setLine(el.vb,pb[0],F.bot+18,pb[0],y2+6); setLine(el.vc,pc[0],F.bot+18,pc[0],y2+6);
      setVec(el.sse,pa[0],y1,pb[0],y1,3); setVec(el.swe,pb[0],y2,pc[0],y2,3);
      stripLab(el.tse,pa[0],pb[0],y1,'SE '+fmt(se,2));
      stripLab(el.twe,pb[0],pc[0],y2,'WE '+(we>5e-3?'+':'')+fmt(we,2));
      cur={pref:st.pref, p1:p1, w:w, ub:u, a1:A[0], a2:A[1], b1:B[0], b2:B[1], c1:Cb[0], c2:Cb[1], ep:ep, comp:ep-w,
        se:se, we:we, dx:dx, se2:B[1]-A[1], we2:Cb[1]-B[1], corner:A[1]===0, hcorner:B[1]===0, ccorner:Cb[1]===0};
      out.textContent='';
      s='A = x(p, w) = h(p, ū) = '+pair(A[0],A[1],2)+'   ū = '+fmt(u,2)+
        '\nB = h(p′, ū) = '+pair(B[0],B[1],2)+'; the compensated budget through B costs e(p′, ū) = '+fmt(ep,2)+
        '\nC = x(p′, w) = '+pair(Cb[0],Cb[1],2)+
        '\nΔx₁ = '+fmt(dx,2)+' = SE '+fmt(se,2)+' + WE '+fmt(we,2);
      put(out,s);
      if(Math.abs(dp)<1e-9) return;
      if(st.pref==='ql') put(out,A[1]===0?': A is a corner, where a small price change works through the wealth effect alone':Math.abs(we)<5e-4?': no wealth effect, all substitution':': C is a corner, so wealth matters again');
      else if(we*dp<-5e-4) put(out,': both effects push x₁ the same way, a normal good');
      else if(we*dp>5e-4) put(out,': the wealth effect pushes against the substitution effect, an inferior good'+(Math.abs(we)>Math.abs(se)?', strong enough to be Giffen':''));
      if(st.pref==='inf' && (A[1]===0 || Cb[1]===0)){ put(out,'\n'); warn(out,'w is below w* ≈ 2.22, where the corner (w/p₁, 0) beats the tangency'); }
    }
    /* the Try it steps read the three bundles and the split; set takes pref, w (wi for the inferior good) and p1 (the new price) */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('w' in s && rw) rw.set(+s.w);
        if('wi' in s && rwi) rwi.set(+s.wi);
        if('p1' in s && rp1) rp1.set(+s.p1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. Labour supply: substitution against the endowment income effect ---------- */
  NF.register('mi3-labour',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var T=1, SM=3, W=520, H=0, F, G, el={}, st={s:0.5, sig:0.5, M:0.1}, cur={}, api=null, pk=null;
    var rs=range(fig,'s',2,function(v){ st.s=v; update(); }),
        rg=range(fig,'sig',2,function(v){ st.sig=v; draw(); }),
        rm=range(fig,'M',2,function(v){ st.M=v; draw(); });
    if(rs) st.s=rs.v();
    if(rg) st.sig=rg.v();
    if(rm) st.M=rm.v();
    /* CES in consumption and leisure, equal weights, consumption price 1: l = m g(s) with g(s) = s^(-sig)/(1 + s^(1 - sig)), m = sT + M */
    function g(s){ return Math.pow(s,-st.sig)/(1+Math.pow(s,1-st.sig)); }
    function lnGp(s){ return -(st.sig/s+(1-st.sig)*Math.pow(s,-st.sig)/(1+Math.pow(s,1-st.sig))); }
    function at_(s){
      var m=s*T+st.M, gg=g(s), l=m*gg, gp, sub, inc;
      if(!(l<T)) return {s:s, l:T, L:0, corner:true};
      gp=gg*lnGp(s);
      /* Slutsky: dh/ds = dl/ds + l dl/dm = m g' + m g^2, so dL/ds = -dh/ds - L g */
      sub=-(m*gp+m*gg*gg); inc=-(T-l)*gg;
      return {s:s, l:l, L:T-l, sub:sub, inc:inc, tot:sub+inc, corner:false};
    }
    function peak(){
      var best=null, i, s, q, lo, hi, a, b, k;
      for(i=1;i<=600;i++){ s=SM*i/600; q=at_(s); if(!best || q.L>best.L) best=q; }
      lo=Math.max(1e-4,best.s-SM/600); hi=Math.min(SM,best.s+SM/600);
      for(k=0;k<60;k++){ a=lo+(hi-lo)/3; b=hi-(hi-lo)/3; if(at_(a).L<at_(b).L) lo=a; else hi=b; }
      q=at_((lo+hi)/2);
      return q.s>=SM-1e-3?null:q;
    }
    function draw(){
      var wide, half, h, i, s, q, sup=[], tot=[], sub=[], inc=[], mx=0, rows, top, xL, lg;
      W=measure(svg); wide=W>=560;
      for(i=1;i<=500;i++){
        s=SM*Math.pow(i/500,1.4); q=at_(s);
        sup.push(q.corner?[0,s]:[q.L,s]); mx=Math.max(mx,q.L);
        tot.push(q.corner?null:[s,q.tot]); sub.push(q.corner?null:[s,q.sub]); inc.push(q.corner?null:[s,q.inc]);
      }
      pk=peak();
      frame(svg,W,900);
      xL=niceUp(1.1*Math.max(mx,0.05));
      if(wide){
        half=Math.floor((W-24)/2); h=Math.round(clamp(half*0.95,210,280));
        rows=key(S('g',null,svg),[['line','mi3-tot','dL/ds'],['line','mi3-sub','substitution ≥ 0'],['line','mi3-inc','endowment income ≤ 0']],half+12+40,12,W-8);
        top=12+(rows-1)*16+28;
        F=box(svg,0,half,top,top+h,[0,xL],[0,SM],'L','s',{title:'labour supply'});
        G=box(svg,half+12,W-12,top,top+h,[0,SM],[-0.8,1.2],'s','',{title:'dL/ds split by Slutsky'});
        H=top+h+22;
      } else {
        h=Math.round(clamp(W*0.62,200,260));
        F=box(svg,0,W-12,22,22+h,[0,xL],[0,SM],'L','s',{title:'labour supply'});
        top=22+h+30;
        rows=key(S('g',null,svg),[['line','mi3-tot','dL/ds'],['line','mi3-sub','substitution ≥ 0'],['line','mi3-inc','endowment income ≤ 0']],40,top,W-8);
        top+=(rows-1)*16+30;
        G=box(svg,0,W-12,top,top+h,[0,SM],[-0.8,1.2],'s','',{title:'dL/ds split by Slutsky'});
        H=top+h+22;
      }
      viewBox(svg,W,H);
      S('path',{d:pathOf(sup,F),'class':'mi3-path'},F.gc);
      S('path',{d:pathOf(sub,G),'class':'mi3-sub'},G.gc);
      S('path',{d:pathOf(inc,G),'class':'mi3-inc'},G.gc);
      S('path',{d:pathOf(tot,G),'class':'mi3-tot'},G.gc);
      if(pk){
        dot(F.gc,'mi3-rdot',4.5).setAttribute('cx',R(F.xs(pk.L)));
        F.gc.lastChild.setAttribute('cy',R(F.ys(pk.s)));
        el.pkt=text(svg,F.xs(pk.L)-8,F.ys(pk.s)-9,'peak at s ≈ '+fmt(pk.s,2),'mi3-tr nf-halo','end');
        dot(G.gc,'mi3-rdot',3.5).setAttribute('cx',R(G.xs(pk.s)));
        G.gc.lastChild.setAttribute('cy',R(G.ys(0)));
      }
      el.fg=line(F.gc,0,0,0,0,'nf-guide');
      el.gg=line(G.gc,0,0,0,0,'nf-guide');
      el.fd=dot(F.gc,'mi3-dot',5);
      el.d1=dot(G.gc,'mi3-kdot',4); el.d2=dot(G.gc,'mi3-dot',4); el.d3=dot(G.gc,'mi3-odot',4);
      paint();
      if(api) api.changed();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var q=at_(st.s), s;
      setLine(el.fg,F.x0,F.ys(st.s),F.x1,F.ys(st.s));
      setLine(el.gg,G.xs(st.s),G.top,G.xs(st.s),G.bot);
      at(el.fd,F.xs(q.L),F.ys(st.s));
      show(el.d1,!q.corner); show(el.d2,!q.corner); show(el.d3,!q.corner);
      if(!q.corner){ at(el.d1,G.xs(st.s),G.ys(clamp(q.tot,-0.9,1.3))); at(el.d2,G.xs(st.s),G.ys(clamp(q.sub,-0.9,1.3))); at(el.d3,G.xs(st.s),G.ys(clamp(q.inc,-0.9,1.3))); }
      cur={s:st.s, sig:st.sig, M:st.M, l:q.l, L:q.L, corner:q.corner, tot:q.corner?0:q.tot, sub:q.corner?0:q.sub, inc:q.corner?0:q.inc,
        back:!q.corner && q.tot<0, peak:pk?pk.s:'none', lpeak:pk?pk.L:'none'};
      out.textContent='';
      s='s = '+fmt(st.s,2)+', m = sT + M = '+fmt(st.s*T+st.M,2)+': leisure l = '+fmt(q.l,2)+', labour L = '+fmt(q.L,2);
      if(q.corner) s+=', a corner: at this wage she does not work';
      else s+='\ndL/ds = '+fmt(q.tot,3)+' = substitution '+fmt(q.sub,3)+' + endowment income '+fmt(q.inc,3)+(q.tot<0?': bending backward':': rising');
      s+='\n'+(pk?'labour peaks at L = '+fmt(pk.L,3)+' when s = '+fmt(pk.s,2)+'; above it the endowment income effect wins':'labour rises at every wage shown: substitution always wins');
      put(out,s);
    }
    /* the Try it steps read leisure, labour, the two Slutsky terms and the peak; set takes s, sig and M */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(o){
        if('sig' in o && rg) rg.set(+o.sig);
        if('M' in o && rm) rm.set(+o.M);
        if('s' in o && rs) rs.set(+o.s);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. Expansion paths and Engel curves: homothetic, Gorman and quasilinear ---------- */
  NF.register('mi3-engel',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var G1=2, G2=1, P2=1, D=10, WM=10, W=520, H=0, F, E, el={}, st={w:6, p1:1, a:0.4}, cur={}, api=null;
    var rw=range(fig,'w',1,function(v){ st.w=v; update(); }),
        rp=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        ra=range(fig,'a',2,function(v){ st.a=v; update(); });
    if(rw) st.w=rw.v();
    if(rp) st.p1=rp.v();
    if(ra) st.a=ra.v();
    /* Cobb Douglas x1^a x2^(1-a); Stone Geary (x1 - 2)^a (x2 - 1)^(1-a); quasilinear ln x1 + x2; p2 = 1 */
    function cd(w){ return [st.a*w/st.p1,(1-st.a)*w/P2]; }
    function sg(w){ var r=w-st.p1*G1-P2*G2; return r>0?[G1+st.a*r/st.p1,G2+(1-st.a)*r/P2]:null; }
    function ql(w){ return w>P2?[P2/st.p1,w/P2-1]:[w/st.p1,0]; }
    function eTop(){ var m=Math.max(cd(WM)[0],sg(WM)?sg(WM)[0]:0,ql(WM)[0]); return niceUp(1.08*m); }
    function draw(){
      var wide, half, h, rows, top, k;
      W=measure(svg); wide=W>=560;
      frame(svg,W,900);
      rows=key(S('g',null,svg),[['line','mi3-cd','Cobb Douglas'],['line','mi3-sg','Stone Geary'],['line','mi3-ql','quasilinear']],40,12,W-8);
      top=12+(rows-1)*16+30;
      if(wide){
        half=Math.floor((W-24)/2); h=Math.round(clamp(half*0.95,210,280));
        F=box(svg,0,half,top,top+h,[0,D],[0,D],'x₁','x₂',{title:'expansion paths at p = (p₁, 1)'});
        E=box(svg,half+12,W-12,top,top+h,[0,WM],[0,eTop()],'w','x₁(p, w)',{title:'Engel curves for good 1'});
        H=top+h+22;
      } else {
        h=Math.round(clamp(W*0.7,210,270));
        F=box(svg,0,W-12,top,top+h,[0,D],[0,D],'x₁','x₂',{title:'expansion paths at p = (p₁, 1)'});
        top+=h+46; h=Math.round(clamp(W*0.5,160,200));
        E=box(svg,0,W-12,top,top+h,[0,WM],[0,eTop()],'w','x₁(p, w)',{title:'Engel curves for good 1'});
        H=top+h+22;
      }
      viewBox(svg,W,H);
      el.iso=[]; el.isot=[];
      for(k=2;k<=WM;k+=2){ el.iso.push(line(F.gc,0,0,0,0,'mi3-iso')); el.isot.push(text(F.gc,0,0,'w = '+k,'mi3-isot nf-halo')); }
      el.bud=line(F.gc,0,0,0,0,'mi3-bud');
      el.pc=S('path',{'class':'mi3-cd'},F.gc); el.ps=S('path',{'class':'mi3-sg'},F.gc); el.pq=S('path',{'class':'mi3-ql'},F.gc);
      el.gam=S('circle',{r:4,'class':'mi3-open mi3-sg'},F.gc);
      el.gt=text(F.gc,0,0,'γ = (2, 1)','mi3-to nf-halo');
      el.dc=dot(F.gc,'mi3-dot',4.5); el.ds=dot(F.gc,'mi3-odot',4.5); el.dq=dot(F.gc,'mi3-gdot',4.5);
      el.ec=S('path',{'class':'mi3-cd'},E.gc); el.es=S('path',{'class':'mi3-sg'},E.gc); el.eq=S('path',{'class':'mi3-ql'},E.gc);
      el.eg=line(E.gc,0,0,0,0,'nf-guide');
      el.ed=[dot(E.gc,'mi3-dot',4),dot(E.gc,'mi3-odot',4),dot(E.gc,'mi3-gdot',4)];
      paint();
      if(api) api.changed();
    }
    function update(){
      if(E && eTop()!==E.yd[1]){ draw(); return; }
      paint(); if(api) api.changed();
    }
    function paint(){
      var w=st.w, p1=st.p1, a=st.a, k, i, ws=grid(0,WM,200), pc=[], ps=[], pq=[], ec=[], es=[], eq=[], q, X=cd(w), Y=sg(w), Z=ql(w), pg=p1*G1+P2*G2, s, slope=a/p1;
      for(i=0;i<el.iso.length;i++){
        k=2*(i+1);
        setLine(el.iso[i],F.xs(k/p1),F.ys(0),F.xs(0),F.ys(k/P2));
        moveTo(el.isot[i],F.xs(0)+4,F.ys(k/P2)-4);
      }
      setLine(el.bud,F.xs(w/p1),F.ys(0),F.xs(0),F.ys(w/P2));
      /* the paths run well past the box so they leave it at its edge */
      el.pc.setAttribute('d',pathOf([[0,0],cd(4*WM)],F));
      el.ps.setAttribute('d',pathOf([[G1,G2],sg(pg+4*WM)],F));
      el.pq.setAttribute('d',pathOf([[0,0],[P2/p1,0],[P2/p1,4*WM]],F));
      at(el.gam,F.xs(G1),F.ys(G2)); moveTo(el.gt,F.xs(G1)+8,F.ys(G2)+15);
      for(i=0;i<ws.length;i++){ q=ws[i]; ec.push([q,cd(q)[0]]); es.push(sg(q)?[q,sg(q)[0]]:null); eq.push([q,ql(q)[0]]); }
      es.push([pg+1e-9,G1]);
      es.sort(function(u,v){ return (u?u[0]:-1)-(v?v[0]:-1); });
      el.ec.setAttribute('d',pathOf(ec,E)); el.es.setAttribute('d',pathOf(es.filter(function(u){ return u; }),E)); el.eq.setAttribute('d',pathOf(eq,E));
      at(el.dc,F.xs(X[0]),F.ys(X[1])); at(el.dq,F.xs(Z[0]),F.ys(Z[1]));
      show(el.ds,!!Y); if(Y) at(el.ds,F.xs(Y[0]),F.ys(Y[1]));
      setLine(el.eg,E.xs(w),E.top,E.xs(w),E.bot);
      at(el.ed[0],E.xs(w),E.ys(X[0])); at(el.ed[2],E.xs(w),E.ys(Z[0]));
      show(el.ed[1],!!Y); if(Y) at(el.ed[1],E.xs(w),E.ys(Y[0]));
      cur={w:w, p1:p1, a:a, cd1:X[0], cd2:X[1], sg1:Y?Y[0]:'n/a', sg2:Y?Y[1]:'n/a', ql1:Z[0], ql2:Z[1], slope:slope, pg:pg, sgok:!!Y, qlcorner:w<=P2};
      out.textContent='';
      s='Cobb Douglas x = '+pair(X[0],X[1],2)+': x₁ = '+fmt(slope,2)+'w, a ray from 0'+
        '\nStone Geary x = '+(Y?pair(Y[0],Y[1],2):'none, w does not cover the subsistence bundle')+': x₁ = 2 + '+fmt(slope,2)+'(w '+MINUS+' '+fmt(pg,2)+') once w > p·γ = '+fmt(pg,2)+', a line with the same slope'+
        '\nquasilinear x = '+pair(Z[0],Z[1],2)+': '+(w<=P2?'a corner, all wealth on good 1':'x₁ = '+fmt(P2/p1,2)+' at every w > p₂ = 1, flat');
      put(out,s);
    }
    /* the Try it steps read the three bundles and the common slope; set takes w, p1 and a */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(o){
        if('a' in o && ra) ra.set(+o.a);
        if('p1' in o && rp) rp.set(+o.p1);
        if('w' in o && rw) rw.set(+o.w);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
