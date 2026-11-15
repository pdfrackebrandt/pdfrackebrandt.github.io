/* Core Micro L1 figures: regularity under a rational population, the decoy effect, a semiorder, majority rule and
   single peakedness, the money pump, ordinal utility, a preference on four alternatives, lexicographic slices and the
   upper contour set, WARP on the menus of {x, y, z}, and WARP on budget data.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi1.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, clip=NF.clip,
      local=NF.local, capture=NF.capture, legend=NF.key, MINUS=NF.MINUS;
  var SUCC='≻', SUCCEQ='⪰', SIM='∼', PREC='≺', SUBD='₀₁₂₃₄₅₆₇₈₉';

  /* ---------- shared ---------- */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  /* arrow from (x0,y0) to (x1,y1); the tail starts t0 px out and the head stops gap px short of the tip */
  function setVec(v,x0,y0,x1,y1,gap,t0,head){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by, tx, ty;
    gap=gap||0; t0=t0||0;
    if(len<gap+t0+8){ setLine(v.l,x0,y0,x0,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return false; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len;
    tx=x1-ux*gap; ty=y1-uy*gap;
    if(head===false){ setLine(v.l,x0+ux*t0,y0+uy*t0,tx,ty); v.h.setAttribute('d',''); return true; }
    hl=Math.min(9,(len-gap-t0)*0.45); bx=tx-ux*hl; by=ty-uy*hl;
    setLine(v.l,x0+ux*t0,y0+uy*t0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',poly([[tx,ty],[bx-uy*4.5,by+ux*4.5],[bx+uy*4.5,by-ux*4.5]])+'Z');
    return true;
  }
  function twoHeads(v,x0,y0,x1,y1,gap){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, a, b, h=8, d='';
    if(len<2*gap+2*h+2){ setVec(v,x0,y0,x1,y1,0,0,false); return; }
    ux=dx/len; uy=dy/len; a=[x0+ux*gap,y0+uy*gap]; b=[x1-ux*gap,y1-uy*gap];
    setLine(v.l,a[0]+ux*h,a[1]+uy*h,b[0]-ux*h,b[1]-uy*h); v.l.removeAttribute('visibility');
    d+=poly([[b[0],b[1]],[b[0]-ux*h-uy*4.5,b[1]-uy*h+ux*4.5],[b[0]-ux*h+uy*4.5,b[1]-uy*h-ux*4.5]])+'Z';
    d+=poly([[a[0],a[1]],[a[0]+ux*h-uy*4.5,a[1]+uy*h+ux*4.5],[a[0]+ux*h+uy*4.5,a[1]+uy*h-ux*4.5]])+'Z';
    v.h.setAttribute('d',d);
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function put(out,s){ out.appendChild(document.createTextNode(s)); }
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); }
  function pct(v){ return Math.round(v*100)+'%'; }
  function sub(n){ return String(n).split('').map(function(c){ return SUBD.charAt(+c); }).join(''); }
  function copy(V){ return V.map(function(p){ return p.slice(); }); }
  function lockRange(r,off){ if(!r) return; r.el.disabled=off; r.wrap.setAttribute('class',off?'nfig-range is-off':'nfig-range'); }
  function show(e,on){ if(on) e.removeAttribute('visibility'); else e.setAttribute('visibility','hidden'); }
  /* round tick values: about n steps of 1, 2 or 5 times a power of ten inside [lo, hi] */
  function nice(lo,hi,n){
    var raw=(hi-lo)/n, mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), r=raw/mag, step, t=[], v;
    step=(r<1.5?1:r<3?2:r<7?5:10)*mag;
    for(v=Math.ceil(lo/step-1e-9);v*step<=hi+1e-9;v++) t.push(+(v*step).toFixed(10));
    return t;
  }
  /* an svg group that acts as a button (or a checkbox when checked is given): click, Enter and Space */
  function clicker(g,label,fn){
    g.setAttribute('tabindex','0'); g.setAttribute('role','button'); g.setAttribute('aria-label',label);
    g.addEventListener('click',function(e){ e.preventDefault(); fn(); });
    g.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(); } });
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
      for(i=0;i<P.length;i++){ d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
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
  function focusOf(list){ return function(i){ try{ list()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} }; }
  /* a plot box at (x0, top), w by h, for the ranges xr and yr: grid lines and labels at the ticks xt and yt, axis names.
     Short names (x₁) sit at the ends of the axes, long ones under the x axis and above the y axis. */
  function axes(svg,x0,top,w,h,xr,yr,xt,yt,names,long){
    var g=S('g',null,svg), i, v, sx, sy;
    sx=function(v){ return x0+(v-xr[0])/(xr[1]-xr[0])*w; };
    sy=function(v){ return top+(yr[1]-v)/(yr[1]-yr[0])*h; };
    sx.inv=function(p){ return xr[0]+(p-x0)/w*(xr[1]-xr[0]); };
    sy.inv=function(p){ return yr[1]-(p-top)/h*(yr[1]-yr[0]); };
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(sx(v)),top,C(sx(v)),top+h,v===0?'nf-ax':'nf-grid'); text(g,sx(v),top+h+15,tl(v),null,'middle'); }
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,x0,C(sy(v)),x0+w,C(sy(v)),v===0?'nf-ax':'nf-grid'); text(g,x0-6,sy(v)+4,tl(v),null,'end'); }
    S('rect',{x:x0,y:top,width:w,height:h,'class':'mi1-frame'},g);
    if(long){ text(g,x0+w,top+h+31,names[0],'nf-title','end'); text(g,x0,top-8,names[1],'nf-title'); }
    else { text(g,x0+w+10,top+h+15,names[0],'nf-title mi1-it'); text(g,x0-6,top-7,names[1],'nf-title mi1-it','end'); }
    return {sx:sx, sy:sy, x0:x0, top:top, w:w, h:h, side:w, gc:clip(svg,x0,top,w,h)};
  }
  /* a square plot of [lo, hi]^2 with whole number grid lines */
  function plane(svg,x0,top,side,lo,hi,names){
    var t=[], v;
    for(v=Math.ceil(lo);v<=hi;v++) t.push(v);
    return axes(svg,x0,top,side,side,[lo,hi],[lo,hi],t,t,names);
  }

  /* ---------- 1. Regularity: the data against a rational population ---------- */
  NF.register('mi1-regular',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var MODES={ts:1, pop:1, jam:1}, q=0.34, al=0, be=0.59, W=520, H=256, el={}, cur={}, api;
    var rq=range(fig,'q',2,function(v){ q=v; update(); });
    var ra=range(fig,'al',2,function(v){ al=v; update(); });
    var rb=range(fig,'be',2,function(v){ be=v; update(); });
    if(rq) q=rq.v();
    if(ra) al=ra.v();
    if(rb) be=rb.v();
    var mode=NF.seg(fig,'data-mode',function(v){ if(MODES[v] && v!==mode){ mode=v; lock(); draw(); } });
    if(!MODES[mode]) mode='ts';
    function lock(){ lockRange(rq,mode!=='pop'); lockRange(ra,mode!=='pop'); lockRange(rb,mode!=='pop'); }
    /* shares by menu: the Tversky and Shafir data, or a population of strict rankings of A, S, W with
       q = μ(W ≻ S), α = μ(A ≻ W ≻ S) / q and β = μ(A ≻ S ≻ W) / (1 − q) */
    function shares(){
      if(mode==='ts') return {p:{S:0.66, W:0.34}, t:{A:0.27, S:0.27, W:0.46}};
      return {p:{S:1-q, W:q}, t:{A:q*al+(1-q)*be, S:(1-q)*(1-be), W:q*(1-al)}};
    }
    function groups(){
      var s;
      if(mode==='jam') return [{n:'6 jams', b:[{v:0.30, c:'mi1-bar1'}]}, {n:'24 jams', b:[{v:0.03, c:'mi1-bar2'}]}];
      s=shares();
      return [{n:'AIWA, A', b:[null,{v:s.t.A, c:'mi1-bar2'}]},
              {n:'SONY, S', b:[{v:s.p.S, c:'mi1-bar1'},{v:s.t.S, c:'mi1-bar2', cap:s.p.S}]},
              {n:'wait, W', b:[{v:s.p.W, c:'mi1-bar1'},{v:s.t.W, c:'mi1-bar2', cap:s.p.W}]}];
    }
    function draw(){
      var G=groups(), jam=mode==='jam', mL=42, mR=8, rows, top, tk, g, i, j, k, n, gw, bw, cx, b, ymax=jam?0.4:1;
      W=measure(svg); H=256; frame(svg,W,H);
      rows=legend(S('g',null,svg),jam?[['rect','mi1-bar1','6 jams on display'],['rect','mi1-bar2','24 jams on display']]:
        [['rect','mi1-bar1','menu {S, W}'],['rect','mi1-bar2','menu {A, S, W}'],['line','mi1-cap','its share on {S, W}']],mL,12,W-mR);
      top=rows>1?50:34; el.bot=H-30;
      el.ys=lin(0,ymax,el.bot,top);
      tk=jam?[0,0.1,0.2,0.3,0.4]:[0,0.2,0.4,0.6,0.8,1];
      g=S('g',null,svg);
      for(i=0;i<tk.length;i++){
        line(g,mL,C(el.ys(tk[i])),W-mR,C(el.ys(tk[i])),tk[i]===0?'nf-ax':'nf-grid');
        text(g,mL-6,el.ys(tk[i])+4,Math.round(tk[i]*100)+'%',null,'end');
      }
      text(g,mL-6,top-14,jam?'buy':'choose','nf-title','end');
      n=G.length; gw=(W-mL-mR)/n; bw=Math.min(46,gw*0.3);
      el.bars=[];
      for(i=0;i<n;i++){
        cx=mL+gw*(i+0.5); k=G[i].b.length;
        text(g,cx,el.bot+18,G[i].n,'nf-lab','middle');
        el.bars.push([]);
        for(j=0;j<k;j++){
          b={x:cx+(j-(k-1)/2)*(bw+6)-bw/2, w:bw};
          if(G[i].b[j]){
            b.r=S('rect',{x:R(b.x),width:R(bw),y:el.bot,height:0},svg);
            b.t=text(svg,b.x+bw/2,el.bot,'','nf-lab','middle');
            if(G[i].b[j].cap!==undefined) b.cap=line(svg,0,0,0,0,'mi1-cap');
          } else if(!jam) text(svg,b.x+bw/2,el.bot-6,'none','mi1-tiny','middle');
          el.bars[i].push(b);
        }
      }
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var G=groups(), i, j, d, b, y, over, s, nov=0;
      for(i=0;i<G.length;i++) for(j=0;j<G[i].b.length;j++){
        d=G[i].b[j]; b=el.bars[i][j];
        if(!d || !b || !b.r) continue;
        y=el.ys(d.v); over=d.cap!==undefined && Math.round(d.v*100)>Math.round(d.cap*100);
        b.r.setAttribute('y',R(y)); b.r.setAttribute('height',R(Math.max(0,el.bot-y)));
        b.r.setAttribute('class',d.c+(over?' mi1-over':''));
        b.t.setAttribute('y',R(y-5)); b.t.textContent=pct(d.v);
        b.t.setAttribute('class','nf-lab'+(over?' mi1-warnt':''));
        if(b.cap){ y=C(el.ys(d.cap)); setLine(b.cap,b.x-5,y,b.x+b.w+5,y); }
        if(over) nov++;
      }
      s=mode==='jam'?null:shares();
      cur={mode:mode, q:q, al:al, be:be, reg:nov===0, pw:s?s.p.W:0, tw:s?s.t.W:0};
      if(!out) return;
      out.textContent='';
      if(mode==='jam'){
        put(out,'6 jams on display: 30% buy   24 jams: 3% buy\n');
        warn(out,'more options, a tenth of the purchases');
        put(out,'; a rational shopper who evaluates for free is never hurt by more options');
        return;
      }
      put(out,'{S, W}: S '+pct(s.p.S)+', W '+pct(s.p.W)+'   {A, S, W}: A '+pct(s.t.A)+', S '+pct(s.t.S)+', W '+pct(s.t.W)+'\n');
      if(mode==='ts'){
        warn(out,'adding A raises W from 34% to 46%: regularity fails');
        put(out,'\nno rational population does this: pick Rational population and try');
        return;
      }
      put(out,'P(W | {A, S, W}) = q(1 '+MINUS+' α) ≤ q = P(W | {S, W})   P(S | {A, S, W}) = (1 '+MINUS+' q)(1 '+MINUS+' β) ≤ 1 '+MINUS+' q\n');
      put(out,Math.abs(q-0.34)<0.005?'with q = 0.34 as in the data, W on {A, S, W} is at most 34%, never the observed 46%':
        'adding A only draws choosers away from S and W: regularity holds for every q, α and β');
    }
    /* Try it keys: mode (ts, pop, jam), q, al, be; reg is true when no bar passes its cap */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('mode' in st && MODES[st.mode]) NF.press(fig,'data-mode',String(st.mode));
        if('q' in st && rq) rq.set(+st.q);
        if('al' in st && ra) ra.set(+st.al);
        if('be' in st && rb) rb.set(+st.be);
      }
    });
    lock(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The decoy effect in attribute space ---------- */
  NF.register('mi1-decoy',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var V0=[[0.3,0.8],[0.8,0.3],[0.16,0.7]], V=copy(V0), NM=['x','y','d'], KN=['nf-v1','nf-v2','mi1-kd'], LC=['nf-c1','nf-c2','mi1-cd'];
    var W=520, H=360, Q, el={}, hs=[], cur={}, api, T=[0,0.2,0.4,0.6,0.8,1];
    onClick(fig,'.nfig-reset',function(){ V=copy(V0); update(); });
    function dom(a,b){ return a[0]>=b[0]-1e-9 && a[1]>=b[1]-1e-9 && (a[0]>b[0]+1e-9 || a[1]>b[1]+1e-9); }
    function draw(){
      var side, x0, i;
      W=measure(svg); side=Math.min(W-64,300); x0=Math.round((W-side)/2)+16;
      H=28+side+40; frame(svg,W,H);
      Q=axes(svg,x0,28,side,side,[0,1],[0,1],T,T,['attribute 1','attribute 2'],true);
      el.zx=S('rect',{'class':'mi1-zx'},Q.gc); el.zy=S('rect',{'class':'mi1-zy'},Q.gc);
      el.gx=S('path',{'class':'mi1-guide'},Q.gc); el.gy=S('path',{'class':'mi1-guide'},Q.gc);
      el.lx=text(svg,0,0,'x only','nf-lab mi1-zl','middle');
      el.ly=text(svg,0,0,'y only','nf-lab mi1-zl','middle');
      el.lb=text(svg,0,0,'both','nf-lab mi1-zl','middle');
      el.pl=[]; hs=[];
      for(i=0;i<3;i++) el.pl.push(text(svg,0,0,NM[i],'nf-vlab '+LC[i]));
      for(i=0;i<3;i++) hs.push(handle(svg,KN[i],(i<2?'Option ':'Decoy ')+NM[i]+', arrow keys move it',keyer(i)));
      update();
    }
    function keyer(i){ return function(dx,dy,big){ var s=big?0.1:0.02; move(i,V[i][0]+dx*s,V[i][1]+dy*s); }; }
    function move(i,x,y){ V[i]=[clamp(Math.round(x*100)/100,0,1),clamp(Math.round(y*100)/100,0,1)]; update(); }
    function box(e,p){
      e.setAttribute('x',R(Q.sx(0))); e.setAttribute('y',R(Q.sy(p[1])));
      e.setAttribute('width',R(Q.sx(p[0])-Q.sx(0))); e.setAttribute('height',R(Q.sy(0)-Q.sy(p[1])));
    }
    /* the larger strip of a's dominated box that b's box leaves free, in data units [x0, y0, x1, y1] */
    function strip(a,b){
      var c=[], best=null, ar=-1, i, A;
      if(a[1]>b[1]) c.push([0,b[1],a[0],a[1]]);
      if(a[0]>b[0]) c.push([b[0],0,a[0],a[1]]);
      for(i=0;i<c.length;i++){ A=(c[i][2]-c[i][0])*(c[i][3]-c[i][1]); if(A>ar){ ar=A; best=c[i]; } }
      return best;
    }
    function tag(e,r){
      var w, h;
      if(!r){ show(e,false); return; }
      w=Q.sx(r[2])-Q.sx(r[0]); h=Q.sy(r[1])-Q.sy(r[3]);
      if(w<50 || h<18){ show(e,false); return; }
      show(e,true); moveTo(e,Q.sx((r[0]+r[2])/2),Q.sy((r[1]+r[3])/2)+4);
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var x=V[0], y=V[1], d=V[2], i, P, bx, by, dx, dy, kind, s;
      box(el.zx,x); box(el.zy,y);
      el.gx.setAttribute('d','M'+R(Q.sx(x[0]))+','+R(Q.sy(0))+'V'+R(Q.sy(x[1]))+'H'+R(Q.sx(0)));
      el.gy.setAttribute('d','M'+R(Q.sx(y[0]))+','+R(Q.sy(0))+'V'+R(Q.sy(y[1]))+'H'+R(Q.sx(0)));
      tag(el.lx,strip(x,y)); tag(el.ly,strip(y,x));
      s=[Math.min(x[0],y[0]),Math.min(x[1],y[1])];
      tag(el.lb,[0,0,s[0],s[1]]);
      for(i=0;i<3;i++){
        P=[Q.sx(V[i][0]),Q.sy(V[i][1])];
        place(hs[i],P[0],P[1],V[i][0],NM[i]+' = ('+fmt(V[i][0],2)+', '+fmt(V[i][1],2)+')');
        moveTo(el.pl[i],P[0]+10,P[1]-10);
      }
      bx=dom(x,d); by=dom(y,d); dx=dom(d,x); dy=dom(d,y);
      kind=dx||dy?'dominant':bx&&by?'both':bx?'x':by?'y':'none';
      cur={x1:x[0], x2:x[1], y1:y[0], y2:y[1], d1:d[0], d2:d[1], kind:kind};
      if(!out) return;
      out.textContent='';
      put(out,'d = ('+fmt(d[0],2)+', '+fmt(d[1],2)+'): ');
      if(kind==='dominant') put(out,'d dominates '+(dx&&dy?'x and y':dx?'x':'y')+': no decoy, a better option');
      else if(kind==='both') put(out,'dominated by x and by y: no asymmetry to exploit');
      else if(kind==='none') put(out,'dominated by neither: a real third option');
      else put(out,'dominated by '+kind+' only: a decoy for '+kind);
      put(out,'\nincreasing preferences never choose a dominated d, and any rational population has P(x | {x, y, d}) ≤ P(x | {x, y})');
      if(kind==='x'||kind==='y'){ put(out,'\n'); warn(out,'observed: P('+kind+' | {x, y, d}) > P('+kind+' | {x, y}), a regularity violation'); }
    }
    dragger(svg,function(){ return [W,H]; },function(){ return V.map(function(p){ return [Q.sx(p[0]),Q.sy(p[1])]; }); },
      function(i,px,py){ move(i,Q.sx.inv(px),Q.sy.inv(py)); },focusOf(function(){ return hs; }));
    /* Try it keys: x1 x2 y1 y2 d1 d2, and kind (x, y, both, none, dominant) */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        var i, k;
        for(i=0;i<3;i++){ k=NM[i]; if((k+'1') in st || (k+'2') in st) move(i,(k+'1') in st?+st[k+'1']:V[i][0],(k+'2') in st?+st[k+'2']:V[i][1]); }
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. A semiorder: indifference within δ ---------- */
  NF.register('mi1-semi',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var U0=[1,1.6,2.2], U=U0.slice(), NM=['a','b','c'], delta=1, foc=0, W=520, H=236, xs, ay, ROWY=[], el={}, hs=[], cur={}, api;
    var rd=range(fig,'delta',2,function(v){ delta=v; update(); });
    if(rd) delta=rd.v();
    onClick(fig,'.nfig-reset',function(){ U=U0.slice(); foc=0; if(rd) rd.set(1); else update(); });
    /* 1 when i ≻ j, -1 when j ≻ i, 0 when i ∼ j; gaps in thousandths so a gap equal to δ counts as indifference */
    function rel(i,j){ var d=Math.round((U[i]-U[j])*1000), e=Math.round(delta*1000); return Math.abs(d)<=e?0:(d>0?1:-1); }
    function draw(){
      var g, v, i, r;
      W=measure(svg); H=236; frame(svg,W,H);
      ay=H-58; xs=lin(0,4,26,W-26); ROWY=[ay-44,ay-88,ay-132];
      el.band=S('rect',{'class':'mi1-sband',y:R(ay-11),height:22},svg);
      g=S('g',null,svg);
      line(g,xs(0),C(ay),xs(4),C(ay),'nf-ax');
      for(v=0;v<=8;v++){
        line(g,C(xs(v/2)),ay,C(xs(v/2)),ay+(v%2?3:6),'nf-ax');
        if(v%2===0) text(g,xs(v/2),ay+44,String(v/2),null,'middle');
      }
      text(g,W-4,ay+44,'u','nf-title mi1-it','end');
      el.vg=[];
      for(i=0;i<3;i++) el.vg.push(line(g,0,0,0,0,'mi1-vguide'));
      el.rows=[];
      for(r=0;r<3;r++){
        el.rows.push({v:vec(svg,'mi1-rel','mi1-relh'), e1:line(svg,0,0,0,0,'mi1-tick'), e2:line(svg,0,0,0,0,'mi1-tick'), t:text(svg,0,0,'','nf-lab','middle')});
      }
      el.pl=[]; hs=[];
      for(i=0;i<3;i++) el.pl.push(text(svg,0,0,NM[i],'nf-vlab nf-c1','middle'));
      for(i=0;i<3;i++) hs.push(handle(svg,'nf-v1','Point '+NM[i]+' on the utility line, arrow keys move it',keyer(i)));
      update();
    }
    function keyer(i){ return function(dx,dy,big){ var s=(big?0.25:0.05)*(dx||dy); move(i,U[i]+s); }; }
    function move(i,u){ U[i]=clamp(Math.round(u*20)/20,0,4); foc=i; update(); }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var P=[[0,1],[1,2],[0,2]], r, i, j, k, lo, hi, b, w, y, row, cls, gap, cx, ord, s=[], t=null, tri, a;
      P.sort(function(p,q){ return Math.abs(U[p[0]]-U[p[1]])-Math.abs(U[q[0]]-U[q[1]]); });
      a=xs(Math.max(0,U[foc]-delta)); el.band.setAttribute('x',R(a)); el.band.setAttribute('width',R(xs(Math.min(4,U[foc]+delta))-a));
      for(r=0;r<3;r++){
        i=P[r][0]; j=P[r][1]; k=rel(i,j); y=ROWY[r]; row=el.rows[r];
        lo=U[i]<=U[j]?i:j; hi=lo===i?j:i; gap=Math.abs(U[i]-U[j]);
        if(k===0){ setVec(row.v,xs(U[lo]),y,xs(U[hi]),y,0,0,false); cls='mi1-sim'; }
        else { b=k>0?i:j; w=k>0?j:i; setVec(row.v,xs(U[b]),y,xs(U[w]),y,0,0,true); cls='mi1-str'; }
        row.v.l.setAttribute('class','mi1-rel '+cls); row.v.h.setAttribute('class','mi1-relh '+cls);
        setLine(row.e1,xs(U[lo]),y-5,xs(U[lo]),y+5); setLine(row.e2,xs(U[hi]),y-5,xs(U[hi]),y+5);
        row.e1.setAttribute('class','mi1-tick '+cls); row.e2.setAttribute('class','mi1-tick '+cls);
        row.t.textContent=k===0?NM[lo]+' '+SIM+' '+NM[hi]+': gap '+fmt(gap,2)+' ≤ δ':NM[b]+' '+SUCC+' '+NM[w]+': gap '+fmt(gap,2)+' > δ';
        cx=clamp((xs(U[lo])+xs(U[hi]))/2,26+74,W-26-74);
        moveTo(row.t,cx,y-9); row.t.setAttribute('class','nf-lab nf-halo '+(k===0?'mi1-simt':'mi1-strt'));
      }
      /* point labels under the line, pushed down when two points sit close together */
      ord=[0,1,2].sort(function(p,q){ return U[p]-U[q]; });
      for(i=0;i<3;i++){
        j=ord[i]; y=ay+22;
        if(i>0 && xs(U[j])-xs(U[ord[i-1]])<14 && +el.pl[ord[i-1]].getAttribute('y')<ay+30) y=ay+34;
        moveTo(el.pl[j],xs(U[j]),y);
        setLine(el.vg[j],xs(U[j]),ay-6,xs(U[j]),ROWY[2]);
        place(hs[j],xs(U[j]),ay,U[j],'u('+NM[j]+') = '+fmt(U[j],2));
      }
      for(i=0;i<3;i++) for(j=0;j<3;j++) for(k=0;k<3;k++){
        if(t || i===j || j===k || i===k) continue;
        if(rel(i,j)===0 && rel(j,k)===0 && rel(i,k)!==0) t=[i,j,k];
      }
      tri=!t;
      cur={a:U[0], b:U[1], c:U[2], delta:delta, rab:rel(0,1), rbc:rel(1,2), rac:rel(0,2), trans:tri};
      if(!out) return;
      out.textContent='';
      put(out,'δ = '+fmt(delta,2)+'   u(a) = '+fmt(U[0],2)+', u(b) = '+fmt(U[1],2)+', u(c) = '+fmt(U[2],2)+'\n');
      [[0,1],[1,2],[0,2]].forEach(function(p){ var k=rel(p[0],p[1]); s.push(k===0?NM[p[0]]+' '+SIM+' '+NM[p[1]]:k>0?NM[p[0]]+' '+SUCC+' '+NM[p[1]]:NM[p[1]]+' '+SUCC+' '+NM[p[0]]); });
      put(out,s.join(', ')+'\n');
      if(t){
        k=rel(t[0],t[2]);
        warn(out,SIM+' is not transitive: '+NM[t[0]]+' '+SIM+' '+NM[t[1]]+' and '+NM[t[1]]+' '+SIM+' '+NM[t[2]]+', yet '+(k>0?NM[t[0]]+' '+SUCC+' '+NM[t[2]]:NM[t[2]]+' '+SUCC+' '+NM[t[0]]));
      } else put(out,delta<1e-9?'δ = 0: indifference means equal u, which is transitive':SIM+' is transitive on these three; '+SUCC+' always is, since gaps above δ add up');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return U.map(function(u){ return [xs(u),ay]; }); },
      function(i,px){ move(i,xs.inv(px)); },focusOf(function(){ return hs; }));
    /* Try it keys: a b c (utilities), delta, rab rbc rac (1 first preferred, 0 indifferent, -1 second), trans */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        var i;
        for(i=0;i<3;i++) if(NM[i] in st) U[i]=clamp(Math.round(+st[NM[i]]*20)/20,0,4);
        if('delta' in st && rd) rd.set(+st.delta); else update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Majority rule over three voters, and single peakedness ---------- */
  NF.register('mi1-vote',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var LAB={voters:['Alice','Bob','Charlie'], may:['Intelligence','Looks','Wealth']}, L=['x','y','z'], AX={xyz:1, yxz:1, xzy:1};
    var CYC=['xyz','yzx','zxy'], SP=['xyz','yxz','zyx'], pro=CYC.slice(), mode='voters', W=520, H=420, el={}, T=null, tri=[], pf={}, api;
    var axis=NF.seg(fig,'data-axis',function(v){ if(AX[v]){ axis=v; update(); } });
    if(!AX[axis]) axis='xyz';
    onClick(fig,'.mi1-condorcet',function(){ pro=CYC.slice(); mode='voters'; update(); });
    onClick(fig,'.mi1-may',function(){ pro=CYC.slice(); mode='may'; update(); });
    onClick(fig,'.mi1-sp',function(){ pro=SP.slice(); mode='voters'; if(!NF.press(fig,'data-axis','xyz') || axis==='xyz') update(); });
    function toTop(v,ch){ pro[v]=ch+pro[v].replace(ch,''); update(); }
    function votes(a,b){ var n=0, v; for(v=0;v<3;v++) if(pro[v].indexOf(a)<pro[v].indexOf(b)) n++; return n; }
    function tally(){
      var t={}, i, j, a, b, beats=[0,0,0], w='none', nl='', mid=axis.charAt(1), dp=[], pk;
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j){ a=L[i]; b=L[j]; t['v'+a+b]=votes(a,b); }
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j && t['v'+L[i]+L[j]]>=2) beats[i]++;
      for(i=0;i<3;i++) if(beats[i]===2) w=L[i];
      for(i=0;i<3;i++) if(pro[0].charAt(2)!==L[i] && pro[1].charAt(2)!==L[i] && pro[2].charAt(2)!==L[i]) nl+=L[i];
      /* on a line of three, a ranking is single peaked unless it puts the middle alternative last */
      for(i=0;i<3;i++) if(pro[i].charAt(2)===mid) dp.push(i);
      pk=[0,1,2].map(function(v){ return pro[v].charAt(0); }).sort(function(p,q){ return axis.indexOf(p)-axis.indexOf(q); });
      t.cycle=w==='none'; t.winner=w; t.notlast=nl||'none'; t.dp=dp; t.sp=dp.length===0; t.median=pk[1]; t.mid=mid;
      return t;
    }
    function chip(g,v,r,x,y,w,h){
      var c=S('g',{'class':'mi1-vchip',transform:'translate('+R(x)+','+R(y)+')'},g);
      S('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:4,'class':'mi1-vbg'},c);
      var t=text(c,0,4.5,'','mi1-vtx','middle');
      clicker(c,'',function(){ var ch=pro[v].charAt(r); if(r>0) toTop(v,ch); });
      return {g:c, t:t};
    }
    function draw(){
      var side, pw, cw, top=8, v, r, g, x, y, cx, cy, rr, i, h1, k;
      W=measure(svg); side=W>=480;
      pw=side?Math.round(W*0.5):W; cw=Math.min(104,(pw-30)/3);
      h1=side?212:376;
      pf={top:h1+30, h:118, x0:52, w:Math.min(W-52-24,400)};
      H=pf.top+pf.h+34;
      frame(svg,W,H);
      g=S('g',null,svg);
      el.heads=[]; el.chips=[];
      for(r=0;r<3;r++) text(g,10,top+52+r*36+4,(r+1)+(r===0?'st':r===1?'nd':'rd'),'nf-title');
      for(v=0;v<3;v++){
        x=34+cw*(v+0.5);
        el.heads.push(text(g,x,top+18,'','nf-lab mi1-vh'+(v+1),'middle'));
        el.chips.push([]);
        for(r=0;r<3;r++) el.chips[v].push(chip(g,v,r,x,top+52+r*36,Math.min(56,cw-12),27));
      }
      /* the majority relation as a triangle */
      if(side){ cx=pw+(W-pw)/2; cy=128; rr=Math.min(84,(W-pw)/2-34); }
      else { cx=W/2; cy=top+190+92; rr=84; }
      tri=[[cx,cy-rr],[cx+rr*0.87,cy+rr*0.5],[cx-rr*0.87,cy+rr*0.5]];
      g=S('g',null,svg);
      el.arr=[]; el.alab=[];
      for(i=0;i<3;i++){ el.arr.push(vec(g,'mi1-edge','mi1-head')); el.alab.push(text(g,0,0,'','nf-lab nf-halo','middle')); }
      el.tn=[];
      for(i=0;i<3;i++){
        g=S('g',{transform:'translate('+R(tri[i][0])+','+R(tri[i][1])+')'},svg);
        el.tn.push({c:S('circle',{r:15,'class':'mi1-node'},g), t:text(g,0,5,L[i],'mi1-nl','middle')});
      }
      text(svg,side?pw+10:10,side?18:top+170,'majority','nf-title');
      /* each ranking drawn over the alternatives in the chosen order on a line */
      g=S('g',null,svg);
      text(g,10,pf.top-12,'rankings along the line','nf-title');
      el.px=[]; el.xl=[];
      for(k=0;k<3;k++) el.px.push(pf.x0+pf.w*(k+0.5)/3);
      for(r=0;r<3;r++){
        y=pf.top+12+r*(pf.h-24)/2;
        line(g,pf.x0,C(y),pf.x0+pf.w,C(y),'nf-grid');
        text(g,pf.x0-10,y+4,(r+1)+(r===0?'st':r===1?'nd':'rd'),null,'end');
      }
      for(k=0;k<3;k++) el.xl.push(text(g,el.px[k],pf.top+pf.h+16,'','mi1-axl','middle'));
      el.pl=[]; el.pd=[];
      for(v=0;v<3;v++){
        el.pl.push(S('path',{'class':'mi1-pl mi1-pl'+(v+1)},svg));
        el.pd.push([]);
        for(k=0;k<3;k++) el.pd[v].push(S('circle',{r:4,'class':'mi1-pd mi1-pd'+(v+1)},svg));
      }
      el.dip=S('circle',{r:9,'class':'mi1-dip'},svg);
      el.dipt=text(svg,0,0,'','nf-lab nf-halo mi1-warnt');
      update();
    }
    function py(r){ return pf.top+12+r*(pf.h-24)/2; }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var v, r, i, j, k, a, b, pairs=[[0,1],[1,2],[2,0]], n, m, mx, my, ox, oy, len, s, p, pts, off, names, x, y;
      T=tally();
      for(v=0;v<3;v++){
        el.heads[v].textContent=LAB[mode][v];
        for(r=0;r<3;r++){
          el.chips[v][r].t.textContent=pro[v].charAt(r);
          el.chips[v][r].g.setAttribute('aria-label',LAB[mode][v]+', rank '+(r+1)+': '+pro[v].charAt(r)+(r?'. Press to move it to the top.':''));
        }
      }
      for(k=0;k<3;k++){
        i=pairs[k][0]; j=pairs[k][1]; n=T['v'+L[i]+L[j]];
        if(n>=2){ a=i; b=j; } else { a=j; b=i; }
        m=Math.max(n,3-n);
        el.arr[k].l.setAttribute('class','mi1-edge'+(T.cycle?' mi1-bad':''));
        el.arr[k].h.setAttribute('class','mi1-head'+(T.cycle?' mi1-badh':''));
        setVec(el.arr[k],tri[a][0],tri[a][1],tri[b][0],tri[b][1],17,16,true);
        mx=(tri[i][0]+tri[j][0])/2; my=(tri[i][1]+tri[j][1])/2;
        ox=mx-(tri[0][0]+tri[1][0]+tri[2][0])/3; oy=my-(tri[0][1]+tri[1][1]+tri[2][1])/3; len=Math.hypot(ox,oy);
        moveTo(el.alab[k],mx+ox/len*17,my+oy/len*17+4);
        el.alab[k].textContent=m+':'+(3-m);
      }
      for(i=0;i<3;i++){
        el.tn[i].c.setAttribute('class','mi1-node'+(T.winner===L[i]?' mi1-best':''));
        el.tn[i].t.setAttribute('class','mi1-nl'+(T.winner===L[i]?' mi1-nlb':''));
      }
      /* the rank profile on the line; voters sharing a ranking are spread a few pixels apart */
      for(k=0;k<3;k++) el.xl[k].textContent=axis.charAt(k);
      for(v=0;v<3;v++){
        pts=[]; off=(v-1)*3;
        for(k=0;k<3;k++){ x=el.px[k]+off; y=py(pro[v].indexOf(axis.charAt(k)))+off; pts.push([x,y]); at(el.pd[v][k],x,y); }
        el.pl[v].setAttribute('d',poly(pts));
        el.pl[v].setAttribute('class','mi1-pl mi1-pl'+(v+1)+(T.dp.indexOf(v)>=0?' mi1-plbad':''));
      }
      if(T.sp){ show(el.dip,false); el.dipt.textContent=''; }
      else {
        show(el.dip,true); at(el.dip,el.px[1],py(2));
        names=T.dp.map(function(v){ return LAB[mode][v]; }).join(' and ');
        el.dipt.textContent=names+' '+(T.dp.length>1?'dip':'dips')+' at '+T.mid;
        moveTo(el.dipt,el.px[1]+14,py(2)+4);
      }
      if(!out) return;
      out.textContent='';
      s='x vs y '+T.vxy+':'+T.vyx+'   y vs z '+T.vyz+':'+T.vzy+'   z vs x '+T.vzx+':'+T.vxz+'\n';
      put(out,s);
      if(T.cycle){
        p=T.vxy>=2?['x','y','z']:['x','z','y'];
        warn(out,'a Condorcet cycle: '+p[0]+' '+SUCC+' '+p[1]+', '+p[1]+' '+SUCC+' '+p[2]+', '+p[2]+' '+SUCC+' '+p[0]+', so no alternative beats both others');
      } else {
        p=L.slice().sort(function(a,b){ return T['v'+b+a]-T['v'+a+b]; });
        put(out,'Condorcet winner '+T.winner+': majority ranks '+p.join(' '+SUCC+' '));
      }
      put(out,'\nline '+axis.split('').join(', ')+': ');
      if(T.sp) put(out,'every ranking single peaked, median peak '+T.median+(T.winner===T.median?', the Condorcet winner':''));
      else warn(out,T.dp.map(function(v){ return LAB[mode][v]; }).join(' and ')+' rank'+(T.dp.length>1?'':'s')+' the middle '+T.mid+' last: double peaked');
      if(T.notlast==='none') put(out,'\nevery alternative is somebody’s last, so every order on the line has a double peak');
    }
    function ok(s){ return typeof s==='string' && s.length===3 && s.indexOf('x')>=0 && s.indexOf('y')>=0 && s.indexOf('z')>=0; }
    /* Try it keys: the rankings a, b, c, mode (voters, may), axis, the vote counts, cycle, winner, notlast, sp (all single
       peaked on the axis) and median; set takes the same keys or preset (condorcet, may, sp) */
    api=NF.api({
      get:function(){
        var o={a:pro[0], b:pro[1], c:pro[2], mode:mode, axis:axis}, k;
        if(!T) T=tally();
        for(k in T) if(k!=='dp') o[k]=T[k];
        o.ndp=T.dp.length;
        return o;
      },
      set:function(st){
        if(st.preset==='condorcet' || st.preset==='may'){ pro=CYC.slice(); mode=st.preset==='may'?'may':'voters'; }
        else if(st.preset==='sp'){ pro=SP.slice(); mode='voters'; }
        if(ok(st.a)) pro[0]=st.a;
        if(ok(st.b)) pro[1]=st.b;
        if(ok(st.c)) pro[2]=st.c;
        if(st.mode==='voters' || st.mode==='may') mode=st.mode;
        if(AX[st.axis]) NF.press(fig,'data-axis',String(st.axis));
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. The money pump ---------- */
  NF.register('mi1-pump',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var PM={cyc:1, tr:1}, T=[1,0.8,0.6], n=1, m0=10, W=520, H=270, cur={}, api, i;
    var NMS=['t','t′','t″'];
    var rt=[range(fig,'t0',2,function(v){ T[0]=v; draw(); }),range(fig,'t1',2,function(v){ T[1]=v; draw(); }),range(fig,'t2',2,function(v){ T[2]=v; draw(); })];
    var rn=range(fig,'n',0,function(v){ n=Math.round(v); draw(); });
    for(i=0;i<3;i++) if(rt[i]) T[i]=rt[i].v();
    if(rn) n=Math.round(rn.v());
    var mode=NF.seg(fig,'data-pref',function(v){ if(PM[v] && v!==mode){ mode=v; lock(); draw(); } });
    if(!PM[mode]) mode='cyc';
    function lock(){ lockRange(rn,mode!=='cyc'); }
    /* money after each trade, and what she holds: z, then y for t, x for t′, z for t″, and round again */
    function path(){
      var M=[m0], Hd=['z'], O=['y','x','z'], K=mode==='cyc'?3*n:2, k;
      for(k=0;k<K;k++){ M.push(Math.round((M[k]-T[k%3])*100)/100); Hd.push(O[k%3]); }
      return {M:M, Hd:Hd, K:K};
    }
    function draw(){
      var P=path(), K=P.K, cyc=mode==='cyc', narrow, mL=40, mR, top=24, bot, xs, ys, lo, hi, span, tk, g, k, pts=[], sp, x, y0, y1, v, lab;
      W=measure(svg); narrow=W<440; mR=cyc?(narrow?66:82):14;
      H=narrow?256:272; bot=H-(cyc && n>1?52:40);
      frame(svg,W,H);
      lo=Math.min(P.M[K],cyc?P.M[K]:P.M[2]-T[2]); hi=m0; span=hi-lo;
      ys=lin(lo-0.12*span-0.2,hi+0.12*span+0.2,bot,top);
      xs=lin(-0.45,K+(cyc?0.45:1.6),mL,W-mR);
      sp=xs(1)-xs(0);
      g=S('g',null,svg);
      tk=nice(lo-0.12*span-0.2,hi+0.12*span+0.2,4);
      for(k=0;k<tk.length;k++){ line(g,mL,C(ys(tk[k])),W-mR,C(ys(tk[k])),'nf-grid'); text(g,mL-6,ys(tk[k])+4,tl(tk[k]),null,'end'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,mL-6,top-10,'money','nf-title','end');
      for(k=0;k<=K+(cyc?0:1);k++){
        if(k===0) lab=sp>=44?'start':'0';
        else lab=(sp>=44?(k>K?'offer ':'pay '):'')+NMS[(k-1)%3];
        text(g,xs(k),bot+17,lab,k>K?'mi1-warnt':null,'middle');
      }
      if(cyc && n>1 && sp*3>=54) for(k=0;k<n;k++) text(g,(xs(3*k)+xs(3*k+3))/2,bot+33,'round '+(k+1),'nf-title','middle');
      line(g,mL,C(ys(m0)),W-mR,C(ys(m0)),'mi1-ref');
      for(k=0;k<K;k++) pts.push([xs(k),ys(P.M[k])],[xs(k+1),ys(P.M[k])]);
      pts.push([xs(K),ys(P.M[K])]);
      S('path',{d:poly(pts),'class':'mi1-stair'},svg);
      if(!cyc){
        /* she is offered z for t″ while holding x, and refuses: she keeps x and her money */
        x=xs(3); y0=ys(P.M[2]); y1=ys(P.M[2]-T[2]);
        line(svg,xs(2),y0,x,y0,'mi1-keep');
        line(svg,x,y0,x,y1,'mi1-keep');
        S('circle',{cx:R(x),cy:R(y1),r:4.5,'class':'mi1-ghost'},svg);
        line(svg,x-4,y1-4,x+4,y1+4,'mi1-xmark'); line(svg,x-4,y1+4,x+4,y1-4,'mi1-xmark');
        text(svg,x+9,y1+4,'z refused','nf-lab nf-halo mi1-warnt');
      }
      for(k=0;k<=K;k++){
        S('circle',{cx:R(xs(k)),cy:R(ys(P.M[k])),r:4.5,'class':'nf-dot'},svg);
        text(svg,xs(k)+6,ys(P.M[k])-8,P.Hd[k],'nf-lab nf-halo mi1-it');
      }
      if(cyc){
        x=xs(K+0.3); v=vec(svg,'mi1-loss','mi1-lossh');
        twoHeads(v,x,ys(m0),x,ys(P.M[K]),1);
        text(svg,x+6,(ys(m0)+ys(P.M[K]))/2+4,'lost '+fmt(m0-P.M[K],2),'nf-lab mi1-warnt');
      }
      cur={mode:mode, n:n, t0:T[0], t1:T[1], t2:T[2], end:P.M[P.K], lost:Math.round((m0-P.M[P.K])*100)/100, hold:P.Hd[P.K]};
      if(api) api.changed();
      if(!out) return;
      out.textContent='';
      put(out,'she pays t = '+fmt(T[0],2)+' for y '+SUCC+' z, t′ = '+fmt(T[1],2)+' for x '+SUCC+' y'+(cyc?', t″ = '+fmt(T[2],2)+' for z '+SUCC+' x':'')+'\n');
      if(cyc){
        warn(out,'after '+n+' round'+(n>1?'s':'')+' she holds z again with '+fmt(P.M[K],2)+' instead of '+fmt(m0,2)+': lost '+(n>1?n+'(t + t′ + t″)':'t + t′ + t″')+' = '+fmt(m0-P.M[K],2));
        put(out,'\nevery trade is one she strictly wants; only the cycle makes the sequence a loss');
      } else {
        put(out,'x '+SUCC+' z: offered z for t″ = '+fmt(T[2],2)+', she refuses and keeps x, her best element\n');
        put(out,'she paid t + t′ = '+fmt(T[0]+T[1],2)+' for two upgrades she wanted, and the pump stops');
      }
    }
    /* Try it keys: mode (cyc, tr), n, t0 t1 t2, end (final money), lost, hold (what she ends with) */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        var k;
        if('mode' in st && PM[st.mode]) NF.press(fig,'data-pref',String(st.mode));
        for(k=0;k<3;k++) if(('t'+k) in st && rt[k]) rt[k].set(+st['t'+k]);
        if('n' in st && rn) rn.set(+st.n);
      }
    });
    lock(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. Ordinal utility: one indifference map, many labels ---------- */
  NF.register('mi1-ordinal',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var F={
      id:{f:function(t){ return t; }, n:'u'},
      ln:{f:function(t){ return Math.log(t); }, n:'ln u'},
      cube:{f:function(t){ return t*t*t; }, n:'u³'},
      floor:{f:function(t){ return Math.floor(t+1e-9); }, n:'⌊u⌋', step:true},
      neg:{f:function(t){ return -t; }, n:MINUS+'u'}
    };
    var LV=[0.5,1,2,3,4,6,8], LAB=[1,2,4,8];
    var V0=[[0.5,0.5],[3.5,3.5]], V=copy(V0), W=520, H=360, Q, G={}, el={}, hs=[], cur={}, api;
    var fk=NF.seg(fig,'data-f',function(v){ if(F[v]){ fk=v; update(); } });
    if(!F[fk]) fk='id';
    onClick(fig,'.nfig-reset',function(){ V=copy(V0); update(); });
    function u(p){ return Math.round(p[0]*p[1]*1e6)/1e6; }
    function v(p){ return F[fk].f(u(p)); }
    function vf(t){ var a=Math.abs(t); return F[fk].step?tl(t):fmt(t,a>=100?0:a>=10?1:2); }
    function curve(c){
      var pts=[], i, x1, a=c/4;
      for(i=0;i<=90;i++){ x1=a*Math.pow(4/a,i/90); pts.push([Q.sx(x1),Q.sy(c/x1)]); }
      return poly(pts);
    }
    function band(k){
      var top=[], bot=[], i, x1;
      for(i=0;i<=120;i++){ x1=0.001+4*i/120; top.push([Q.sx(x1),Q.sy(Math.min(4.2,(k+1)/x1))]); bot.push([Q.sx(x1),Q.sy(Math.min(4.2,k/x1))]); }
      return poly(top.concat(bot.reverse()))+'Z';
    }
    function draw(){
      var side, x0, i, wide;
      W=measure(svg); wide=W>=600;
      if(wide){ side=Math.min(270,W-350); x0=40; H=22+side+30; G={x0:x0+side+104, top:22, h:side}; G.w=W-G.x0-12; }
      else { side=Math.min(W-112,300); x0=Math.round((W-side-112)/2)+38; G={x0:52, top:22+side+62, h:150}; G.w=W-G.x0-18; H=G.top+G.h+30; }
      frame(svg,W,H);
      Q=plane(svg,x0,22,side,0,4,['a₁, b₁','a₂, b₂']);
      el.bands=S('g',null,Q.gc);
      for(i=0;i<LV.length;i++) S('path',{d:curve(LV[i]),'class':LAB.indexOf(LV[i])>=0?'mi1-lev mi1-levk':'mi1-lev'},Q.gc);
      el.lab=[];
      for(i=0;i<LAB.length;i++) el.lab.push(text(svg,Q.x0+Q.side+5,Q.sy(LAB[i]/4)+4,'','mi1-llab'));
      el.better=vec(Q.gc,'mi1-better','mi1-betterh');
      el.btx=text(Q.gc,0,0,'better','nf-lab nf-halo','middle');
      el.seg=line(svg,0,0,0,0,'mi1-ab');
      el.mid=S('circle',{r:3.5,'class':'mi1-mid'},svg);
      el.midl=text(svg,0,0,'m','nf-lab nf-halo mi1-it');
      el.pl=[text(svg,0,0,'a','nf-vlab nf-c1'),text(svg,0,0,'b','nf-vlab nf-c2')];
      text(svg,G.x0,G.top-10,'v = f(u) along the segment from a to b','nf-title');
      el.g2=S('g',null,svg);
      hs=[handle(svg,'nf-v1','Bundle a, arrow keys move it',keyer(0)),handle(svg,'nf-v2','Bundle b, arrow keys move it',keyer(1))];
      update();
    }
    function keyer(i){ return function(dx,dy,big){ var s=big?0.5:0.1; move(i,V[i][0]+dx*s,V[i][1]+dy*s); }; }
    function move(i,x,y){ V[i]=[clamp(Math.round(x*10)/10,0.1,4),clamp(Math.round(y*10)/10,0.1,4)]; update(); }
    function update(){ paint(); if(api) api.changed(); }
    /* v along the segment from a to b, its chord, and the midpoint test of concavity */
    function along(a,b){
      var g=el.g2, N=200, pts=[], i, s, p, w, lo=Infinity, hi=-Infinity, pad, xs, ys, tk, va, vb, vm, avg, x, y;
      clear(g);
      for(i=0;i<=N;i++){ s=i/N; p=[a[0]+s*(b[0]-a[0]),a[1]+s*(b[1]-a[1])]; w=v(p); pts.push([s,w]); if(w<lo) lo=w; if(w>hi) hi=w; }
      va=pts[0][1]; vb=pts[N][1]; vm=pts[N/2][1]; avg=(va+vb)/2;
      if(hi-lo<1e-9){ lo-=1; hi+=1; }
      pad=(hi-lo)*0.1; lo-=pad; hi+=pad;
      xs=lin(0,1,G.x0,G.x0+G.w); ys=lin(lo,hi,G.top+G.h,G.top);
      tk=nice(lo,hi,4);
      for(i=0;i<tk.length;i++){ line(g,G.x0,C(ys(tk[i])),G.x0+G.w,C(ys(tk[i])),tk[i]===0?'nf-ax':'nf-grid'); text(g,G.x0-6,ys(tk[i])+4,tl(tk[i]),null,'end'); }
      S('rect',{x:G.x0,y:G.top,width:R(G.w),height:G.h,'class':'mi1-frame'},g);
      [['a',0,'nf-c1'],['m',0.5,''],['b',1,'nf-c2']].forEach(function(t){ text(g,xs(t[1]),G.top+G.h+16,t[0],'nf-vlab mi1-it '+t[2],'middle'); });
      line(g,xs(0),ys(va),xs(1),ys(vb),'mi1-chord');
      S('path',{d:poly(pts.map(function(q){ return [xs(q[0]),ys(q[1])]; })),'class':'mi1-vcurve'},g);
      x=xs(0.5);
      line(g,x,ys(avg),x,ys(vm),'mi1-gap');
      S('circle',{cx:R(xs(0)),cy:R(ys(va)),r:4,'class':'mi1-end1'},g);
      S('circle',{cx:R(xs(1)),cy:R(ys(vb)),r:4,'class':'mi1-end2'},g);
      S('circle',{cx:R(x),cy:R(ys(avg)),r:3.5,'class':'mi1-mid'},g);
      S('circle',{cx:R(x),cy:R(ys(vm)),r:4,'class':'mi1-midv'},g);
      y=Math.abs(ys(vm)-ys(avg))<14?Math.min(ys(vm),ys(avg))-8:ys(vm)+(vm>avg?-8:14);
      text(g,x+7,y,'v(m)','nf-lab nf-halo');
      y=Math.abs(ys(vm)-ys(avg))<14?Math.max(ys(vm),ys(avg))+16:ys(avg)+(vm>avg?14:-8);
      text(g,x+7,y,'chord','nf-lab nf-halo mi1-chordt');
      return {va:va, vb:vb, vm:vm, avg:avg};
    }
    function paint(){
      var f=F[fk], i, k, a=V[0], b=V[1], m=[(a[0]+b[0])/2,(a[1]+b[1])/2], ua=u(a), ub=u(b), va=v(a), vb=v(b), A, t, s, neg=fk==='neg', same, tie, sg, P;
      clear(el.bands);
      if(f.step) for(k=0;k<16;k+=2) S('path',{d:band(k),'class':'mi1-band'},el.bands);
      for(i=0;i<LAB.length;i++){ t=f.f(LAB[i]); el.lab[i].textContent=vf(t); }
      if(neg) setVec(el.better,Q.sx(0.95),Q.sy(0.95),Q.sx(0.45),Q.sy(0.45),0,0,true);
      else setVec(el.better,Q.sx(0.45),Q.sy(0.45),Q.sx(0.95),Q.sy(0.95),0,0,true);
      moveTo(el.btx,Q.sx(1.25),Q.sy(0.62)+4);
      setLine(el.seg,Q.sx(a[0]),Q.sy(a[1]),Q.sx(b[0]),Q.sy(b[1]));
      at(el.mid,Q.sx(m[0]),Q.sy(m[1]));
      moveTo(el.midl,Q.sx(m[0])+8,Q.sy(m[1])-6);
      for(i=0;i<2;i++){
        P=[Q.sx(V[i][0]),Q.sy(V[i][1])];
        place(hs[i],P[0],P[1],V[i][0],(i?'b':'a')+' = ('+fmt(V[i][0],1)+', '+fmt(V[i][1],1)+')');
        moveTo(el.pl[i],P[0]+(i?10:-10),P[1]-12);
        el.pl[i].setAttribute('text-anchor',i?'start':'end');
      }
      A=along(a,b);
      sg=function(d){ return Math.abs(d)<1e-9?0:(d>0?1:-1); };
      same=sg(ua-ub)===sg(va-vb); tie=Math.abs(va-vb)<1e-9;
      cur={f:fk, a1:a[0], a2:a[1], b1:b[0], b2:b[1], ua:ua, ub:ub, va:va, vb:vb, same:same, tie:tie, vm:A.vm, avg:A.avg, conc:A.vm>=A.avg-1e-9, mra:a[1]/a[0]};
      if(!out) return;
      out.textContent='';
      s='f(u) = '+f.n+'   u(a) = '+fmt(ua,2)+', u(b) = '+fmt(ub,2)+'   v(a) = '+vf(va)+', v(b) = '+vf(vb)+': ';
      put(out,s);
      if(same) put(out,sg(ua-ub)===0?'a '+SIM+' b under both':(ua>ub?'a '+SUCC+' b':'b '+SUCC+' a')+' under both');
      else warn(out,tie?'tied under v, not under u: a different preference':'v reverses the ranking: a different preference');
      if(f.step) put(out,'\nv is flat within each band, so each band is one thick indifference class');
      else put(out,'\nMRS at a = a₂ over a₁ = '+fmt(a[1]/a[0],2)+(neg?', but the better direction is reversed':' under u and under v'));
      put(out,'\nmidpoint m: v(m) = '+vf(A.vm)+' against the chord '+vf(A.avg)+(cur.conc?', on or above the chord':', below the chord: v is not concave along this segment'));
    }
    dragger(svg,function(){ return [W,H]; },function(){ return V.map(function(p){ return [Q.sx(p[0]),Q.sy(p[1])]; }); },
      function(i,x,y){ move(i,Q.sx.inv(x),Q.sy.inv(y)); },focusOf(function(){ return hs; }));
    /* Try it keys: f (id, ln, cube, floor, neg), a1 a2 b1 b2, u and v at a and b, same (ranking kept), tie,
       vm and avg (v at the midpoint and the chord there) and conc (vm >= avg) */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('f' in st && F[st.f]) NF.press(fig,'data-f',String(st.f));
        if('a1' in st || 'a2' in st) move(0,'a1' in st?+st.a1:V[0][0],'a2' in st?+st.a2:V[0][1]);
        if('b1' in st || 'b2' in st) move(1,'b1' in st?+st.b1:V[1][0],'b2' in st?+st.b2:V[1][1]);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. A preference on four alternatives, and the counting utility ---------- */
  NF.register('mi1-rank',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=['x','y','z','w'], PR=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]], KEYS=['xy','xz','xw','yz','yw','zw'];
    /* P[k] = 1 when the first of pair k is strictly preferred, 0 for indifference, -1 when the second is */
    var P0=[1,1,1,0,1,1], P=P0.slice(), W=520, H=340, pos=[], el={}, A=null, sx, api;
    onClick(fig,'.nfig-reset',function(){ P=P0.slice(); update(); });
    function analyse(){
      var G=[], i, j, k, u=[], best=[], viol=null, scyc=null, nind=0, rep=true, mis=null, b;
      for(i=0;i<4;i++){ G.push([]); for(j=0;j<4;j++) G[i].push(i===j); }
      for(k=0;k<6;k++){ i=PR[k][0]; j=PR[k][1]; G[i][j]=P[k]>=0; G[j][i]=P[k]<=0; if(P[k]===0) nind++; }
      for(i=0;i<4;i++) for(j=0;j<4;j++) for(k=0;k<4;k++){
        if(i===j||j===k||i===k) continue;
        if(G[i][j] && G[j][k] && !G[i][k]){
          if(!viol) viol=[i,j,k];
          if(!scyc && !G[j][i] && !G[k][j]) scyc=[i,j,k];
        }
      }
      /* u(a) = |{b : a ⪰ b}|, the number of alternatives a weakly beats, itself included */
      for(i=0;i<4;i++){ u.push(0); for(j=0;j<4;j++) if(G[i][j]) u[i]++; }
      for(i=0;i<4;i++){ b=true; for(j=0;j<4;j++) if(!G[i][j]) b=false; if(b) best.push(i); }
      for(i=0;i<4;i++) for(j=0;j<4;j++) if(i!==j && G[i][j]!==(u[i]>=u[j])){ rep=false; if(!mis) mis=[i,j]; }
      return {G:G, u:u, best:best, viol:scyc||viol, scyc:!!scyc, nind:nind, rep:rep, mis:mis};
    }
    function cycler(k){ return function(){ P[k]=P[k]===1?0:(P[k]===0?-1:1); update(); }; }
    function draw(){
      var r, cx, cy, i, k, g, a, b, t, px, py, pg, axY, v;
      W=measure(svg);
      r=Math.max(72,Math.min(96,(W-120)/2)); cx=W/2; cy=26+r; axY=cy+r+74; H=axY+44;
      frame(svg,W,H);
      pos=[[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]];
      el.edges=[]; el.pills=[];
      g=S('g',null,svg);
      for(k=0;k<6;k++) el.edges.push(vec(g,'mi1-edge','mi1-head'));
      for(k=0;k<6;k++){
        a=pos[PR[k][0]]; b=pos[PR[k][1]];
        /* the two diagonals cross in the middle, so their labels sit nearer one end */
        t=k===1?0.3:(k===4?0.7:0.5);
        px=a[0]+(b[0]-a[0])*t; py=a[1]+(b[1]-a[1])*t;
        pg=S('g',{'class':'mi1-pill',transform:'translate('+R(px)+','+R(py)+')'},svg);
        S('rect',{x:-20,y:-10.5,width:40,height:21,rx:10.5,'class':'mi1-pbg'},pg);
        el.pills.push({g:pg, t:text(pg,0,4.5,'','mi1-ptx','middle')});
        clicker(pg,'',cycler(k));
      }
      el.nodes=[];
      for(i=0;i<4;i++){
        g=S('g',{transform:'translate('+R(pos[i][0])+','+R(pos[i][1])+')'},svg);
        el.nodes.push({c:S('circle',{r:15,'class':'mi1-node'},g), t:text(g,0,5,N[i],'mi1-nl','middle')});
      }
      /* the scores on a number line */
      sx=function(v){ return 46+(v-0.5)/4*(W-76); };
      g=S('g',null,svg);
      line(g,46,C(axY),W-30,C(axY),'nf-ax');
      for(v=1;v<=4;v++){ line(g,C(sx(v)),axY,C(sx(v)),axY+4,'nf-ax'); text(g,sx(v),axY+17,String(v),null,'middle'); }
      el.axt=text(svg,W/2,axY+36,'','nf-title','middle');
      el.dots=S('g',null,svg);
      el.ay=axY;
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var k, i, j, a, b, onV, vi, s, n, st=[0,0,0,0,0], y, g, lab;
      A=analyse(); vi=A.viol;
      function inV(i,j){ if(!vi) return false; var p=[[vi[0],vi[1]],[vi[1],vi[2]],[vi[0],vi[2]]], m; for(m=0;m<3;m++) if((p[m][0]===i&&p[m][1]===j)||(p[m][0]===j&&p[m][1]===i)) return true; return false; }
      for(k=0;k<6;k++){
        i=PR[k][0]; j=PR[k][1]; onV=inV(i,j);
        a=P[k]>=0?pos[i]:pos[j]; b=P[k]>=0?pos[j]:pos[i];
        el.edges[k].l.setAttribute('class','mi1-edge'+(P[k]===0?' mi1-ind':'')+(onV?' mi1-bad':''));
        el.edges[k].h.setAttribute('class','mi1-head'+(onV?' mi1-badh':''));
        setVec(el.edges[k],a[0],a[1],b[0],b[1],17,16,P[k]!==0);
        lab=P[k]===1?N[i]+SUCC+N[j]:P[k]===-1?N[j]+SUCC+N[i]:N[i]+SIM+N[j];
        el.pills[k].t.textContent=lab;
        el.pills[k].g.setAttribute('class','mi1-pill'+(onV?' mi1-pbad':''));
        el.pills[k].g.setAttribute('aria-label',N[i]+' against '+N[j]+': '+(P[k]===1?N[i]+' strictly preferred':P[k]===-1?N[j]+' strictly preferred':'indifferent')+'. Press to change.');
      }
      for(i=0;i<4;i++) el.nodes[i].c.setAttribute('class','mi1-node'+(A.best.indexOf(i)>=0?' mi1-best':''));
      for(i=0;i<4;i++) el.nodes[i].t.setAttribute('class','mi1-nl'+(A.best.indexOf(i)>=0?' mi1-nlb':''));
      clear(el.dots);
      for(i=0;i<4;i++){
        n=A.u[i]; y=el.ay-13-st[n]*19; st[n]++;
        g=S('g',{transform:'translate('+R(sx(n))+','+R(y)+')'},el.dots);
        S('circle',{r:8.5,'class':A.rep?'mi1-sdot':'mi1-sdot mi1-soff'},g);
        text(g,0,4,N[i],'mi1-stx','middle');
      }
      el.axt.textContent=A.rep?'u(a) = number a weakly beats: a utility':'counts, not a utility';
      el.axt.setAttribute('class',A.rep?'nf-title':'nf-title mi1-warnt');
      if(!out) return;
      out.textContent='';
      if(!vi) put(out,'complete and transitive: rational');
      else warn(out,'not transitive: '+N[vi[0]]+' '+SUCCEQ+' '+N[vi[1]]+' and '+N[vi[1]]+' '+SUCCEQ+' '+N[vi[2]]+', but not '+N[vi[0]]+' '+SUCCEQ+' '+N[vi[2]]+(A.scyc?' (a strict cycle)':''));
      s='\nbest element'+(A.best.length===1?': ':'s: ')+(A.best.length?A.best.map(function(i){ return N[i]; }).join(', '):'none');
      s+='\nu(a) = |{b : a '+SUCCEQ+' b}|: x '+A.u[0]+', y '+A.u[1]+', z '+A.u[2]+', w '+A.u[3];
      put(out,s);
      if(A.rep) put(out,', represents '+SUCCEQ);
      else {
        i=A.mis[0]; j=A.mis[1];
        warn(out,', fails: '+(A.G[i][j]&&!A.G[j][i]?N[i]+' '+SUCC+' '+N[j]:A.G[i][j]?N[i]+' '+SIM+' '+N[j]:N[j]+' '+SUCC+' '+N[i])+' but u('+N[i]+') = '+A.u[i]+', u('+N[j]+') = '+A.u[j]);
      }
    }
    /* Try it keys: each pair (xy = 1: x strictly preferred, 0: indifferent, -1: y), trans, scyc (a strict cycle),
       nbest, best, nind, rep (the counts represent the relation) and ux uy uz uw */
    api=NF.api({
      get:function(){
        var o={}, k;
        if(!A) A=analyse();
        for(k=0;k<6;k++) o[KEYS[k]]=P[k];
        o.trans=!A.viol; o.scyc=A.scyc; o.nbest=A.best.length; o.best=A.best.length?A.best.map(function(i){ return N[i]; }).join(''):'none';
        o.nind=A.nind; o.rep=A.rep; o.ux=A.u[0]; o.uy=A.u[1]; o.uz=A.u[2]; o.uw=A.u[3];
        return o;
      },
      set:function(st){
        var k;
        for(k=0;k<6;k++) if(KEYS[k] in st) P[k]=clamp(Math.round(+st[KEYS[k]]),-1,1);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 8. Lexicographic slices: one interval and one rational each ---------- */
  NF.register('mi1-slices',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var k=3, eps=0.5, W=520, H=262, xs, top=30, ph=84, uy, el={}, cur={}, api, COL=['mi1-s0','mi1-s1','mi1-s2'];
    var rk=range(fig,'k',0,function(v){ k=Math.round(v); draw(); });
    var re=range(fig,'eps',2,function(v){ eps=v; update(); });
    if(rk) k=Math.round(rk.v());
    if(re) eps=re.v();
    function slices(){ var A=[], i; for(i=0;i<k;i++) A.push(Math.round((0.5+3*i/(k-1))*1e6)/1e6); return A; }
    /* the fraction with the smallest denominator strictly inside (lo, hi) */
    function simplest(lo,hi){ var q, p; for(q=1;q<=1000;q++){ p=Math.floor(lo*q+1e-9)+1; if(p/q<hi-1e-9) return [p,q]; } return null; }
    function frac(r){ return r[1]===1?String(r[0]):r[0]+'/'+r[1]; }
    function draw(){
      var mL=34, mR=18, g, i, v, A=slices(), y0=top+ph, sl;
      W=measure(svg); H=266; frame(svg,W,H);
      xs=lin(0,4.6,mL,W-mR); uy=y0+66;
      g=S('g',null,svg);
      text(g,mL,top-12,'slices {a} × [0, 1] of the plane','nf-title');
      for(v=0;v<=4;v++){ line(g,C(xs(v)),top,C(xs(v)),y0,'nf-grid'); text(g,xs(v),y0+15,String(v),null,'middle'); }
      line(g,mL,C(top),W-mR,C(top),'nf-grid'); line(g,mL,C(y0),W-mR,C(y0),'nf-ax');
      text(g,mL-6,top+4,'1',null,'end'); text(g,mL-6,y0+4,'0',null,'end');
      text(g,W-mR,y0+15,'x₁','nf-title mi1-it','end');
      line(g,mL,C(uy),W-mR,C(uy),'nf-ax');
      for(v=0;v<=4;v++){ line(g,C(xs(v)),uy,C(xs(v)),uy+4,'nf-ax'); text(g,xs(v),uy+44,String(v),null,'middle'); }
      text(g,W-mR,uy+44,'u','nf-title mi1-it','end');
      text(g,mL-6,uy+4,'u','nf-title mi1-it','end');
      el.sl=[]; el.ov=[];
      for(i=0;i<k;i++){
        sl={};
        if(k<=8){ sl.c0=line(svg,xs(A[i]),y0,xs(A[i]),uy,'mi1-conn'); sl.c1=line(svg,0,0,0,0,'mi1-conn'); }
        sl.bar=line(svg,xs(A[i]),y0,xs(A[i]),top,'mi1-slice '+COL[i%3]);
        sl.iv=S('rect',{y:R(uy+7+(i%2)*11),height:8,'class':'mi1-iv '+COL[i%3]},svg);
        sl.q=S('circle',{r:3,cy:R(uy),'class':'mi1-q'},svg);
        sl.qt=text(svg,0,uy-7,'','nf-lab nf-halo','middle');
        el.sl.push(sl);
      }
      for(i=0;i<k-1;i++) el.ov.push(S('rect',{y:R(uy+5),height:23,'class':'mi1-ovl'},svg));
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var A=slices(), i, sl, gap=k>1?A[1]-A[0]:0, nov=0, ov=null, qs=[], r, x0, x1, ok, lab=k<=6;
      for(i=0;i<k-1;i++){
        x0=A[i+1]; x1=Math.min(A[i]+eps,A[i+1]+eps);
        if(A[i]+eps>A[i+1]+1e-9){ nov++; if(!ov) ov=i; el.ov[i].setAttribute('x',R(xs(x0))); el.ov[i].setAttribute('width',R(Math.max(1,xs(x1)-xs(x0)))); }
        else el.ov[i].setAttribute('width',0);
      }
      ok=nov===0 && eps>1e-9;
      for(i=0;i<k;i++){
        sl=el.sl[i];
        if(sl.c1) setLine(sl.c1,xs(A[i]),top,xs(A[i]+eps),uy);
        sl.iv.setAttribute('x',R(xs(A[i])-(eps<1e-9?1:0)));
        sl.iv.setAttribute('width',R(Math.max(2,xs(A[i]+eps)-xs(A[i]))));
        r=ok?simplest(A[i],A[i]+eps):null;
        if(r){ qs.push(frac(r)); show(sl.q,true); sl.q.setAttribute('cx',R(xs(r[0]/r[1]))); sl.qt.textContent=lab?frac(r):''; moveTo(sl.qt,xs(r[0]/r[1]),uy-7); }
        else { show(sl.q,false); sl.qt.textContent=''; }
      }
      cur={k:k, eps:eps, gap:gap, nov:nov, ok:ok};
      if(!out) return;
      out.textContent='';
      put(out,k+' slices, '+(k>1?'gap '+fmt(gap,2)+', ':'')+'u = x₁ + εx₂ with ε = '+fmt(eps,2)+' sends slice a onto [a, a + ε]\n');
      if(eps<1e-9) warn(out,'ε = 0: each interval is a point, u(a, 1) = u(a, 0), yet (a, 1) '+SUCC+' (a, 0)');
      else if(nov){
        i=ov;
        warn(out,'gap '+fmt(gap,2)+' < ε: u('+fmt(A[i],2)+', 1) = '+fmt(A[i]+eps,2)+' > u('+fmt(A[i+1],2)+', 0) = '+fmt(A[i+1],2)+', yet ('+fmt(A[i+1],2)+', 0) '+SUCC+' ('+fmt(A[i],2)+', 1)');
      }
      else put(out,'disjoint, each holds a rational ('+qs.slice(0,5).join(', ')+(qs.length>5?', …':'')+'): u represents the order on these '+k+' slices');
      put(out,'\nany ε > 0 fails once two slices are closer than ε; every real a at once would need as many rationals as reals');
    }
    /* Try it keys: k (slices), eps, gap, nov (overlapping neighbours) and ok (disjoint intervals of positive length) */
    api=NF.api({
      get:function(){ var o={}, kk; for(kk in cur) o[kk]=cur[kk]; return o; },
      set:function(st){ if('k' in st && rk) rk.set(+st.k); if('eps' in st && re) re.set(+st.eps); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 9. Lexicographic preferences: the upper contour set is not closed ---------- */
  NF.register('mi1-lex',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var r0=[0,1], r=r0.slice(), N=8, W=520, H=360, Q, el={}, hs=[], cur={}, api;
    var rn=range(fig,'n',0,function(v){ N=Math.round(v); update(); });
    if(rn) N=Math.round(rn.v());
    onClick(fig,'.nfig-reset',function(){ r=r0.slice(); update(); });
    function draw(){
      var side, x0;
      W=measure(svg); side=Math.min(W-90,320); x0=Math.round((W-side-90)/2)+42;
      H=26+side+30; frame(svg,W,H);
      Q=plane(svg,x0,26,side,-0.5,2.5,['x₁','x₂']);
      el.up=S('rect',{'class':'mi1-up'},Q.gc);
      el.open=line(Q.gc,0,0,0,0,'mi1-open');
      el.ray=line(Q.gc,0,0,0,0,'mi1-ray');
      el.ut=text(Q.gc,0,0,'U(r): at least as good as r','mi1-utx');
      el.seq=S('g',null,Q.gc);
      el.xn=S('circle',{r:5,'class':'mi1-xn'},svg);
      el.xnt=text(svg,0,0,'','nf-lab nf-halo mi1-seqt','middle');
      el.lim=S('circle',{r:5,'class':'mi1-lim'},svg);
      el.limt=text(svg,0,0,'limit','nf-lab nf-halo');
      el.rl=text(svg,0,0,'r','nf-vlab mi1-cd');
      hs=[handle(svg,'mi1-kd','Reference bundle r, arrow keys move it',keyer)];
      update();
    }
    function keyer(dx,dy,big){ var s=big?0.5:0.1; move(r[0]+dx*s,r[1]+dy*s); }
    function move(x,y){ r=[clamp(Math.round(x*10)/10,-0.4,1.4),clamp(Math.round(y*10)/10,0.6,2.4)]; update(); }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var sx=Q.sx, sy=Q.sy, n, xN=[r[0]+1/N,r[1]-1], lx, ly;
      el.up.setAttribute('x',R(sx(r[0]))); el.up.setAttribute('y',R(Q.top));
      el.up.setAttribute('width',R(Math.max(0,sx(2.5)-sx(r[0])))); el.up.setAttribute('height',R(Q.side));
      setLine(el.open,sx(r[0]),sy(-0.5),sx(r[0]),sy(r[1]));
      setLine(el.ray,sx(r[0]),sy(r[1]),sx(r[0]),sy(2.5));
      moveTo(el.ut,sx(r[0])+8,sy(2.5)+16); el.ut.textContent=sx(2.5)-sx(r[0])>170?'U(r): at least as good as r':'U(r)';
      clear(el.seq);
      for(n=1;n<N;n++) S('circle',{cx:R(sx(r[0]+1/n)),cy:R(sy(r[1]-1)),r:3,'class':'mi1-seq'},el.seq);
      at(el.xn,sx(xN[0]),sy(xN[1]));
      el.xnt.textContent='x'+sub(N); moveTo(el.xnt,sx(xN[0]),sy(xN[1])-11);
      at(el.lim,sx(r[0]),sy(r[1]-1));
      lx=sx(r[0])-9; ly=sy(r[1]-1)+18;
      if(lx-34<Q.x0){ el.limt.setAttribute('text-anchor','start'); lx=sx(r[0])+4; } else el.limt.setAttribute('text-anchor','end');
      moveTo(el.limt,lx,ly);
      place(hs[0],sx(r[0]),sy(r[1]),r[0],'r = ('+fmt(r[0],1)+', '+fmt(r[1],1)+')');
      moveTo(el.rl,sx(r[0])-10,sy(r[1])-10); el.rl.setAttribute('text-anchor','end');
      cur={r1:r[0], r2:r[1], n:N, xn1:xN[0], xn2:xN[1]};
      if(!out) return;
      out.textContent='';
      put(out,'r = ('+fmt(r[0],1)+', '+fmt(r[1],1)+')   x'+sub(N)+' = ('+fmt(xN[0],3)+', '+fmt(xN[1],1)+'): first coordinate above r₁, so x'+sub(N)+' '+SUCC+' r, for every n\n');
      warn(out,'limit ('+fmt(r[0],1)+', '+fmt(r[1]-1,1)+'): same first coordinate, lower second, so limit '+PREC+' r');
      put(out,'\nU(r) holds every xₙ but not their limit: it is not closed, so the order is not continuous');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[Q.sx(r[0]),Q.sy(r[1])]]; },
      function(i,x,y){ move(Q.sx.inv(x),Q.sy.inv(y)); },focusOf(function(){ return hs; }));
    /* Try it keys: r1 r2 (the reference bundle), n (the last term shown) and xn1 xn2 (that term) */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('n' in st && rn) rn.set(+st.n);
        if('r1' in st || 'r2' in st) move('r1' in st?+st.r1:r[0],'r2' in st?+st.r2:r[1]);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 10. WARP on the menus of {x, y, z} ---------- */
  NF.register('mi1-warp',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var L=['x','y','z'], M=[{k:'xy',s:[0,1]},{k:'yz',s:[1,2]},{k:'xz',s:[0,2]},{k:'xyz',s:[0,1,2]}];
    var PRE={
      all:{o:[1,1,1,1], c:['x','y','x','x']},
      c1:{o:[1,0,0,1], c:['x','y','x','x']},
      c2:{o:[1,0,0,1], c:['x','y','x','xy']},
      pairs:{o:[1,1,1,0], c:['x','y','z','x']}
    };
    var obs, ch, W=520, H=330, el={}, cards=[], tri=[], A=null, tried={}, msg='', api;
    /* every weak order on {x, y, z}, as utility vectors with values 0, 1, 2 */
    var ORD=(function(){
      var seen={}, list=[], a, b, c, u, key, i, j;
      for(a=0;a<3;a++) for(b=0;b<3;b++) for(c=0;c<3;c++){
        u=[a,b,c]; key='';
        for(i=0;i<3;i++) for(j=0;j<3;j++) key+=u[i]>=u[j]?'1':'0';
        if(!seen[key]){ seen[key]=1; list.push(u); }
      }
      return list;
    })();
    function preset(p){ obs=PRE[p].o.slice(); ch=PRE[p].c.map(function(s){ return s.split('').map(function(t){ return L.indexOf(t); }); }); }
    preset('all');
    onClick(fig,'.nfig-reset',function(){ preset('all'); msg=''; update(); });
    onClick(fig,'.mi1-c1',function(){ preset('c1'); msg=''; update(); });
    onClick(fig,'.mi1-c2',function(){ preset('c2'); msg=''; update(); });
    onClick(fig,'.mi1-pairs',function(){ preset('pairs'); msg=''; update(); });
    function cs(m){ return ch[m].slice().sort().map(function(i){ return L[i]; }).join(''); }
    function name(u){
      var idx=[0,1,2].sort(function(a,b){ return u[b]-u[a] || a-b; }), s=L[idx[0]], i;
      for(i=1;i<3;i++) s+=(u[idx[i]]===u[idx[i-1]]?' '+SIM+' ':' '+SUCC+' ')+L[idx[i]];
      return s;
    }
    function analyse(){
      var ge=[], gt=[], src=[], i, j, m, k, c, viol=null, rat=[], ok, best, mx, nv=0, cyc;
      for(i=0;i<3;i++){ ge.push([false,false,false]); gt.push([false,false,false]); src.push([null,null,null]); }
      for(m=0;m<4;m++){
        if(!obs[m]) continue;
        for(k=0;k<ch[m].length;k++){
          i=ch[m][k];
          for(j=0;j<M[m].s.length;j++){
            c=M[m].s[j]; if(c===i) continue;
            ge[i][c]=true;
            if(ch[m].indexOf(c)<0){ gt[i][c]=true; src[i][c]=m; }
          }
        }
      }
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j && ge[i][j] && gt[j][i]){ nv++; if(!viol) viol=[i,j]; }
      for(k=0;k<ORD.length;k++){
        ok=true;
        for(m=0;m<4 && ok;m++){
          if(!obs[m]) continue;
          mx=-1; for(j=0;j<M[m].s.length;j++) mx=Math.max(mx,ORD[k][M[m].s[j]]);
          best=M[m].s.filter(function(t){ return ORD[k][t]===mx; });
          if(best.length!==ch[m].length || best.some(function(t){ return ch[m].indexOf(t)<0; })) ok=false;
        }
        if(ok) rat.push(name(ORD[k]));
      }
      cyc=obs[0]&&obs[1]&&obs[2]&&((cs(0)==='x'&&cs(1)==='y'&&cs(2)==='z')||(cs(0)==='y'&&cs(1)==='z'&&cs(2)==='x'));
      return {ge:ge, gt:gt, src:src, viol:viol, nv:nv, rat:rat, cyc:cyc};
    }
    function toggleObs(m){ obs[m]=obs[m]?0:1; msg=''; update(); }
    function toggleCh(m,i){
      var p=ch[m].indexOf(i);
      if(!obs[m]){ msg='tick the menu first: only observed menus have a choice'; update(); return; }
      if(p>=0){ if(ch[m].length===1){ msg='C(B) cannot be empty: something must be chosen from every observed menu'; update(); return; } ch[m].splice(p,1); }
      else ch[m].push(i);
      msg=''; update();
    }
    function draw(){
      var row, cw, chh=74, gap=8, m, x, y, g, cg, i, n, hdr, cx, cy, rr, tw, ty, c, t;
      W=measure(svg); row=W>=500;
      cw=row?(W-3*gap)/4:(W-gap)/2;
      ty=row?chh+16:2*chh+gap+16;
      H=ty+190; frame(svg,W,H);
      cards=[];
      for(m=0;m<4;m++){
        x=row?m*(cw+gap):(m%2)*(cw+gap); y=row?0:Math.floor(m/2)*(chh+gap);
        g=S('g',{transform:'translate('+R(x)+','+R(y)+')'},svg);
        cg={g:g, chips:[]};
        cg.bg=S('rect',{x:0.5,y:0.5,width:R(cw-1),height:chh-1,rx:4,'class':'mi1-card'},g);
        hdr=S('g',{'class':'mi1-obs'},g);
        S('rect',{x:1,y:1,width:R(cw-2),height:24,'class':'nf-hit'},hdr);
        cg.box=S('rect',{x:9,y:7,width:12,height:12,rx:2,'class':'mi1-box'},hdr);
        cg.tick=S('path',{d:'M11.5,13l2.5,2.6l4.6,-5.6','class':'mi1-tickm'},hdr);
        text(hdr,28,17.5,'{'+M[m].s.map(function(t){ return L[t]; }).join(', ')+'}','nf-lab');
        clicker(hdr,'',(function(mm){ return function(){ toggleObs(mm); }; })(m));
        hdr.setAttribute('role','checkbox');
        cg.hdr=hdr;
        n=M[m].s.length;
        for(i=0;i<n;i++){
          c=S('g',{'class':'mi1-chip',transform:'translate('+R(cw/2+(i-(n-1)/2)*36)+','+(chh-26)+')'},g);
          S('circle',{r:13,'class':'mi1-cbg'},c);
          t=text(c,0,4.5,L[M[m].s[i]],'mi1-ctx','middle');
          clicker(c,'',(function(mm,ii){ return function(){ toggleCh(mm,ii); }; })(m,M[m].s[i]));
          c.setAttribute('role','checkbox');
          cg.chips.push({g:c, i:M[m].s[i], t:t});
        }
        cards.push(cg);
      }
      /* the revealed relation on a triangle, and the preferences that fit */
      tw=Math.min(200,W*0.48); cx=tw/2+4; cy=ty+104; rr=Math.min(72,tw/2-22);
      tri=[[cx,cy-rr],[cx+rr*0.87,cy+rr*0.5],[cx-rr*0.87,cy+rr*0.5]];
      text(svg,4,ty+6,'revealed','nf-title');
      g=S('g',null,svg);
      el.ed=[]; el.el=[];
      for(i=0;i<3;i++){ el.ed.push(vec(g,'mi1-edge','mi1-head')); el.el.push(text(g,0,0,'','nf-lab nf-halo','middle')); }
      for(i=0;i<3;i++){
        g=S('g',{transform:'translate('+R(tri[i][0])+','+R(tri[i][1])+')'},svg);
        S('circle',{r:14,'class':'mi1-node'},g); text(g,0,5,L[i],'mi1-nl','middle');
      }
      el.vx=tw+16;
      el.vt=text(svg,el.vx,ty+6,'','nf-title');
      el.vl=[];
      for(i=0;i<5;i++) el.vl.push(text(svg,el.vx,ty+34+i*20,'','mi1-vline'));
      el.ty=ty;
      update();
    }
    function update(){
      var c;
      A=analyse();
      if(A.cyc && obs[3] && ch[3].length===1){ c=L[ch[3][0]]; if(A.viol) tried[c]=1; }
      if(!A.cyc) tried={};
      paint();
      if(api) api.changed();
    }
    function paint(){
      var m, i, j, k, on, P=[[0,1],[1,2],[0,2]], a, b, ge=A.ge, gt=A.gt, vio, mx, my, ox, oy, len, s, list, n, cxm=(tri[0][0]+tri[1][0]+tri[2][0])/3, cym=(tri[0][1]+tri[1][1]+tri[2][1])/3;
      for(m=0;m<4;m++){
        cards[m].bg.setAttribute('class','mi1-card'+(obs[m]?'':' is-off'));
        cards[m].tick.setAttribute('visibility',obs[m]?'visible':'hidden');
        cards[m].hdr.setAttribute('aria-checked',obs[m]?'true':'false');
        cards[m].hdr.setAttribute('aria-label','Menu {'+M[m].s.map(function(t){ return L[t]; }).join(', ')+'} observed');
        for(k=0;k<cards[m].chips.length;k++){
          i=cards[m].chips[k].i; on=ch[m].indexOf(i)>=0;
          cards[m].chips[k].g.setAttribute('class','mi1-chip'+(on?' is-on':'')+(obs[m]?'':' is-off'));
          cards[m].chips[k].g.setAttribute('aria-checked',on?'true':'false');
          cards[m].chips[k].g.setAttribute('aria-label',L[i]+' chosen from {'+M[m].s.map(function(t){ return L[t]; }).join(', ')+'}');
        }
      }
      for(k=0;k<3;k++){
        i=P[k][0]; j=P[k][1];
        mx=(tri[i][0]+tri[j][0])/2; my=(tri[i][1]+tri[j][1])/2; ox=mx-cxm; oy=my-cym; len=Math.hypot(ox,oy);
        moveTo(el.el[k],mx+ox/len*16,my+oy/len*16+4);
        vio=(ge[i][j]&&gt[j][i])||(ge[j][i]&&gt[i][j]);
        el.ed[k].l.setAttribute('class','mi1-edge'+(vio?' mi1-bad':'')+(!ge[i][j]&&!ge[j][i]?' mi1-none':(!gt[i][j]&&!gt[j][i]?' mi1-ind':'')));
        el.ed[k].h.setAttribute('class','mi1-head'+(vio?' mi1-badh':''));
        el.el[k].setAttribute('class','nf-lab nf-halo'+(vio?' mi1-warnt':''));
        if(vio){ twoHeads(el.ed[k],tri[i][0],tri[i][1],tri[j][0],tri[j][1],16); el.el[k].textContent='both ways'; }
        else if(gt[i][j] || gt[j][i]){ a=gt[i][j]?i:j; b=gt[i][j]?j:i; setVec(el.ed[k],tri[a][0],tri[a][1],tri[b][0],tri[b][1],16,15,true); el.el[k].textContent=L[a]+' '+SUCC+'* '+L[b]; }
        else if(ge[i][j]){ setVec(el.ed[k],tri[i][0],tri[i][1],tri[j][0],tri[j][1],16,15,false); el.el[k].textContent=L[i]+' '+SIM+'* '+L[j]; }
        else { setVec(el.ed[k],tri[i][0],tri[i][1],tri[j][0],tri[j][1],16,15,false); el.el[k].textContent='no data'; }
      }
      el.vt.textContent=A.viol?'WARP fails':'WARP holds';
      el.vt.setAttribute('class',A.viol?'nf-title mi1-warnt':'nf-title');
      list=A.rat; n=list.length;
      for(i=0;i<5;i++) el.vl[i].textContent='';
      el.vl[0].textContent=n===0?'no rational preference fits':n===1?'fitted by one preference:':'fitted by '+n+' preferences:';
      el.vl[0].setAttribute('class',n===0?'mi1-vline mi1-warnt':'mi1-vline');
      for(i=0;i<Math.min(n,n>4?3:4);i++) el.vl[i+1].textContent=list[i];
      if(n>4) el.vl[4].textContent='and '+(n-3)+' more';
      if(!out) return;
      out.textContent='';
      s=[];
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j && gt[i][j]) s.push(L[i]+' '+SUCC+'* '+L[j]);
      for(k=0;k<3;k++){ i=P[k][0]; j=P[k][1]; if(ge[i][j] && ge[j][i] && !gt[i][j] && !gt[j][i]) s.push(L[i]+' '+SIM+'* '+L[j]); }
      put(out,'revealed: '+(s.length?s.join(', '):'nothing yet')+'\n');
      if(A.viol){
        i=A.viol[0]; j=A.viol[1];
        warn(out,'WARP fails: '+L[i]+' '+SUCCEQ+'* '+L[j]+', yet '+L[j]+' '+SUCC+'* '+L[i]+' from {'+M[A.src[j][i]].s.map(function(t){ return L[t]; }).join(', ')+'}');
      } else put(out,'WARP holds: no pair is revealed both ways'+(A.cyc?', though the choices cycle':''));
      put(out,'\n');
      if(n===0) warn(out,'no rational preference rationalizes these choices');
      else put(out,n===1?'rationalized by '+list[0]+' and by no other preference':'rationalized by '+n+' preferences, so the data do not pin one down');
      if(msg){ put(out,'\n'); warn(out,msg); }
    }
    /* Try it keys: which menus are observed (oxy ... oxyz), the choices (cxy ... cxyz, letters in order), WARP,
       nrat (rational preferences that fit), and tried: how many of x, y, z have been chosen alone from {x, y, z}
       while the pairs cycle. set takes the same keys, preset (all, c1, c2, pairs), and tour=1, which chooses x, y, z in turn */
    api=NF.api({
      get:function(){
        var o={}, m;
        if(!A) A=analyse();
        for(m=0;m<4;m++){ o['o'+M[m].k]=obs[m]; o['c'+M[m].k]=cs(m); }
        o.nobs=obs[0]+obs[1]+obs[2]+obs[3]; o.full=o.nobs===4; o.warp=!A.viol; o.nviol=A.nv; o.nrat=A.rat.length;
        o.rat=A.rat.length===1?A.rat[0]:'none'; o.tried=Object.keys(tried).length; o.cyc=A.cyc;
        return o;
      },
      set:function(st){
        var m, s, k, v;
        if(st.preset && PRE[st.preset]) preset(st.preset);
        for(m=0;m<4;m++){
          k=M[m].k;
          if(('o'+k) in st) obs[m]=+st['o'+k]?1:0;
          if(('c'+k) in st){
            s=String(st['c'+k]).split('').map(function(t){ return L.indexOf(t); }).filter(function(t,i,a){ return t>=0 && M[m].s.indexOf(t)>=0 && a.indexOf(t)===i; });
            if(s.length) ch[m]=s;
          }
        }
        msg='';
        update();
        if(+st.tour===1){ for(v=0;v<3;v++){ ch[3]=[v]; obs[3]=1; update(); } }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 11. WARP on budget data ---------- */
  NF.register('mi1-budget',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var p=2, s=[7,2], W=520, H=330, Q, el={}, hs=[], cur={}, api;
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rp) p=rp.v();
    onClick(fig,'.nfig-reset',function(){ s=[7,2]; if(rp) rp.set(2); else update(); });
    /* B⁰: x₁ + x₂ = 10; B¹: x₁ + p x₂ = 14. Each choice sits on its budget line, given by its first coordinate */
    function pt(i,t){ return i===0?[t,10-t]:[t,(14-t)/p]; }
    function hi(i){ return i===0?10:14; }
    /* the part [t0, t1] of budget line i that the other budget also affords, or null */
    function inside(i){
      var f=function(t){ var q=pt(i,t); return i===0?q[0]+p*q[1]-14:q[0]+q[1]-10; }, a=f(0), b=f(hi(i)), r;
      if(a<=1e-9 && b<=1e-9) return [0,hi(i)];
      if(a>1e-9 && b>1e-9) return null;
      r=hi(i)*a/(a-b);
      return a<=1e-9?[0,r]:[r,hi(i)];
    }
    function draw(){
      var w, h, x0=40, xt=[0,2,4,6,8,10,12,14], yt=[0,2,4,6,8,10,12];
      W=measure(svg); w=W-x0-28; h=Math.min(300,Math.round(w*0.7));
      if(w<330) xt=[0,4,8,12];
      H=22+h+34; frame(svg,W,H);
      Q=axes(svg,x0,22,w,h,[0,15],[0,12.5],xt,yt,['x₁','x₂']);
      el.s0=S('path',{'class':'mi1-set0'},Q.gc); el.s1=S('path',{'class':'mi1-set1'},Q.gc);
      el.i0=line(Q.gc,0,0,0,0,'mi1-inside'); el.i1=line(Q.gc,0,0,0,0,'mi1-inside');
      el.b0=line(Q.gc,0,0,0,0,'mi1-b0'); el.b1=line(Q.gc,0,0,0,0,'mi1-b1');
      el.n0=text(svg,0,0,'B⁰','nf-lab nf-halo nf-c1'); el.n1=text(svg,0,0,'B¹','nf-lab nf-halo nf-c2');
      el.pl=[text(svg,0,0,'x⁰','nf-vlab nf-c1'),text(svg,0,0,'x¹','nf-vlab nf-c2')];
      hs=[handle(svg,'nf-v1','Choice x⁰ on budget line B⁰, arrow keys move it',keyer(0)),handle(svg,'nf-v2','Choice x¹ on budget line B¹, arrow keys move it',keyer(1))];
      update();
    }
    function keyer(i){ return function(dx,dy,big){ move(i,s[i]+(dx||-dy)*(big?1:0.1)); }; }
    function move(i,t){ s[i]=clamp(Math.round(t*10)/10,0,hi(i)); update(); }
    function seg(e,i,iv){ var a, b; if(!iv){ setLine(e,0,0,0,0); return; } a=pt(i,iv[0]); b=pt(i,iv[1]); setLine(e,Q.sx(a[0]),Q.sy(a[1]),Q.sx(b[0]),Q.sy(b[1])); }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var sx=Q.sx, sy=Q.sy, x0, x1, i, P, v01, v10, same, r01, r10, viol;
      el.s0.setAttribute('d',poly([[sx(0),sy(0)],[sx(10),sy(0)],[sx(0),sy(10)]])+'Z');
      el.s1.setAttribute('d',poly([[sx(0),sy(0)],[sx(14),sy(0)],[sx(0),sy(14/p)]])+'Z');
      setLine(el.b0,sx(0),sy(10),sx(10),sy(0)); setLine(el.b1,sx(0),sy(14/p),sx(14),sy(0));
      seg(el.i0,0,inside(0)); seg(el.i1,1,inside(1));
      moveTo(el.n0,sx(10)+5,sy(0)-6); moveTo(el.n1,sx(14)-4,sy(0)-10); el.n1.setAttribute('text-anchor','end');
      for(i=0;i<2;i++){
        P=pt(i,s[i]);
        place(hs[i],sx(P[0]),sy(P[1]),s[i],'x'+(i?'¹':'⁰')+' = ('+fmt(P[0],1)+', '+fmt(P[1],2)+')');
        moveTo(el.pl[i],sx(P[0])+9,sy(P[1])-10);
      }
      x0=pt(0,s[0]); x1=pt(1,s[1]);
      v01=x1[0]+x1[1]; v10=x0[0]+p*x0[1];
      same=Math.abs(x0[0]-x1[0])<1e-6 && Math.abs(x0[1]-x1[1])<1e-6;
      r01=!same && v01<=10+1e-9; r10=!same && v10<=14+1e-9; viol=r01 && r10;
      cur={p:p, s0:s[0], s1:s[1], c01:v01, c10:v10, r01:r01, r10:r10, warp:!viol};
      if(!out) return;
      out.textContent='';
      put(out,'p⁰·x¹ = '+fmt(x1[0],1)+' + '+fmt(x1[1],2)+' = '+fmt(v01,2)+(r01?' ≤ 10: x¹ was affordable when x⁰ was chosen, x⁰ '+SUCC+'* x¹':same?'':' > 10: x¹ was not affordable at B⁰')+'\n');
      put(out,'p¹·x⁰ = '+fmt(x0[0],1)+' + '+fmt(p,2)+' × '+fmt(x0[1],1)+' = '+fmt(v10,2)+(r10?' ≤ 14: x⁰ was affordable when x¹ was chosen, x¹ '+SUCC+'* x⁰':same?'':' > 14: x⁰ was not affordable at B¹')+'\n');
      if(viol) warn(out,'WARP fails: each bundle is revealed preferred to the other');
      else put(out,same?'the same bundle chosen twice: nothing is revealed between them':'WARP holds');
    }
    function proj(i,x,y){ var a=i===0?[1,1]:[1,p], w=i===0?10:14, t=(a[0]*x+a[1]*y-w)/(a[0]*a[0]+a[1]*a[1]); return x-t*a[0]; }
    dragger(svg,function(){ return [W,H]; },function(){ return [0,1].map(function(i){ var q=pt(i,s[i]); return [Q.sx(q[0]),Q.sy(q[1])]; }); },
      function(i,x,y){ move(i,proj(i,Q.sx.inv(x),Q.sy.inv(y))); },focusOf(function(){ return hs; }));
    /* Try it keys: p (price of good 2 at B¹), s0 s1 (first coordinates of the choices), c01 = p⁰·x¹, c10 = p¹·x⁰,
       r01 r10 (revealed preferred) and warp */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('s0' in st) s[0]=clamp(+st.s0,0,10);
        if('s1' in st) s[1]=clamp(+st.s1,0,14);
        if('p' in st && rp) rp.set(+st.p); else update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
