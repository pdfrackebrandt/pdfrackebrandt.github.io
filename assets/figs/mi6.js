/* Core Micro L6 figures: the Allais paradox in the probability triangle, the St. Petersburg game, risk attitudes on a
   utility curve, the risk and probability premia, Pratt's comparison of two people, CARA with normal risk, the CARA and
   CRRA families, and risky asset demand across wealth.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi6.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;
  var triN=0;

  /* ---------- shared ---------- */
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); }
  function copy(o){ var c={}, k; for(k in o) c[k]=o[k]; return c; }
  /* a slider that only matters in some views is dimmed and disabled in the others */
  function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
  /* a step of 1, 2, 2.5 or 5 times a power of ten that cuts span into about n pieces */
  function niceStep(span,n){
    var raw=span/n, p=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/p;
    return p*(f<1.5?1:f<2.25?2:f<3.5?2.5:f<7.5?5:10);
  }
  function ticks(lo,hi,n){ var s=niceStep(hi-lo,n), t=[], v; for(v=Math.ceil(lo/s-1e-9)*s;v<=hi+1e-9;v+=s) t.push(Math.round(v/s)*s); return {t:t, s:s}; }
  function dec(step){ var d=0; while(d<4 && Math.abs(Math.round(step*Math.pow(10,d))-step*Math.pow(10,d))>1e-9) d++; return d; }
  function scale(d0,d1,r0,r1){ var f=lin(d0,d1,r0,r1); f.r0=r0; f.r1=r1; f.d0=d0; f.d1=d1; return f; }
  /* frame of a plot: grid, axes and tick labels; xs and ys map data to svg units */
  function axes(g,xs,ys,xt,yt,xd,yd){
    var x0=xs.r0, x1=xs.r1, y0=ys.r0, y1=ys.r1, i, v;
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,x0,C(ys(v)),x1,C(ys(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,x0-7,ys(v)+4,fmt(v,yd),null,'end'); }
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(xs(v)),y0,C(xs(v)),y1,'nf-grid'); text(g,xs(v),y0+17,typeof xd==='function'?xd(v):fmt(v,xd),null,'middle'); }
    line(g,x0,C(y0),x1,C(y0),'nf-ax');
    line(g,C(x0),y1,C(x0),y0,'nf-ax');
  }
  /* axis titles: x under the tick labels at the right, y above the axis */
  function names(g,b,xl,yl){ if(xl) text(g,b.x1,b.bot+33,xl,'nf-title','end'); if(yl) text(g,b.x0-7,b.top-8,yl,'nf-title mi6-it','end'); }
  /* path of f on [a, b]; points far off the plot are pulled in, the clip hides them */
  function path(f,a,b,n,xs,ys){
    var p=[], i, x, y, lo=Math.min(ys.r0,ys.r1)-80, hi=Math.max(ys.r0,ys.r1)+80;
    for(i=0;i<=n;i++){ x=a+(b-a)*i/n; y=f(x); if(isFinite(y)) p.push([xs(x),clamp(ys(y),lo,hi)]); }
    return p.length>1?poly(p):'';
  }
  /* n plots, side by side when each column gets minW, else one above the other. Each has a title and a legend
     (key() items) above it. Returns the boxes {x0, x1, top, bot, title} and sets the viewBox. */
  function panels(svg,W,o){
    var n=o.titles.length, side=n>1 && W/n>=o.minW, cw=side?W/n:W, P=[], G=[], i, b, g, rows, y=0, mh=0, H;
    for(i=0;i<n;i++){
      b={x0:Math.round((side?i*cw:0)+o.mL), x1:Math.round((side?(i+1)*cw:W)-o.mR)};
      g=S('g',null,svg); G.push(g);
      b.title=text(g,(b.x0+b.x1)/2,12,o.titles[i]||'','nf-title','middle');
      rows=o.keys && o.keys[i] && o.keys[i].length?key(g,o.keys[i],b.x0,32,b.x1):0;
      b.head=rows?32+(rows-1)*16+22:32;
      mh=Math.max(mh,b.head); P.push(b);
    }
    for(i=0;i<n;i++){
      b=P[i];
      if(side) b.top=mh;
      else { G[i].setAttribute('transform','translate(0,'+y+')'); b.top=y+b.head; }
      b.bot=b.top+o.ph;
      if(!side) y=b.bot+o.foot+10;
    }
    H=side?mh+o.ph+o.foot:y-10;
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    return {P:P, H:H, side:side};
  }
  /* a focusable round handle, moved by dragging or the arrow keys: onKey(dx, dy, big) */
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
    h.setAttribute('aria-valuenow',+(+now).toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever handle is nearest the pointer; pts() gives svg positions, move(i, x, y) takes the new one */
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
  function focusOf(list){ return function(i){ try{ list()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} }; }
  /* labels on one row, pushed apart so they never overlap; items are [x, text, class] */
  function spread(g,items,y,gap){
    var s=items.slice().sort(function(a,b){ return a[0]-b[0]; }), xs=[], i, j, shift;
    for(i=0;i<s.length;i++) xs.push(s[i][0]);
    for(j=0;j<6;j++){
      for(i=1;i<xs.length;i++) if(xs[i]-xs[i-1]<gap){ shift=(gap-(xs[i]-xs[i-1]))/2; xs[i-1]-=shift; xs[i]+=shift; }
    }
    for(i=0;i<s.length;i++) text(g,xs[i],y,s[i][1],s[i][2],'middle');
  }
  /* labels in one column, pushed apart vertically; items are [y, text, class] */
  function stack(g,items,x,gap,anchor){
    items.slice().sort(function(a,b){ return a[0]-b[0]; }).reduce(function(prev,q){
      var y=Math.max(q[0],prev+gap); text(g,x,y,q[1],q[2],anchor); return y;
    },-1e9);
  }
  var SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','K':'ᴷ','m':'ᵐ'};
  function sup(n){ return String(n).split('').map(function(c){ return SUP[c]||c; }).join(''); }
  function commas(v,d){ var s=v.toFixed(d), p=s.split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,','); return p.join('.'); }
  function dot(g,x,y,cls,r){ return S('circle',{cx:R(x),cy:R(y),r:r||4,'class':cls},g); }

  /* CRRA utility (x^(1 − r) − 1) over (1 − r), the log at r = 1, and its inverse */
  function crra(x,r){ return Math.abs(r-1)<1e-9?Math.log(x):(Math.pow(x,1-r)-1)/(1-r); }
  function crraInv(y,r){ return Math.abs(r-1)<1e-9?Math.exp(y):Math.pow(1+(1-r)*y,1/(1-r)); }
  function crraName(r){
    if(Math.abs(r)<1e-9) return 'u = x, risk neutral';
    if(Math.abs(r-1)<1e-9) return 'u = ln x';
    if(Math.abs(r-0.5)<1e-9) return 'ranks like √x';
    if(Math.abs(r+1)<1e-9) return 'ranks like x², risk loving';
    if(Math.abs(r-2)<1e-9) return 'ranks like ' + MINUS + '1 over x';
    return r<0?'convex, risk loving':'concave, risk averse';
  }
  function crraClass(r){ return r>1e-9?'mi6-g':r<-1e-9?'mi6-or':'mi6-k'; }

  /* ---------- 1. The Allais paradox in the probability triangle, with zooms at A and at C ---------- */
  NF.register('mi6-allais',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var v=0.5, w=20, model='eu', W=520, H=340, el={}, T, Z=[], api, cur={};
    var rv=range(fig,'v',2,function(x){ v=x; update(); }), rw=range(fig,'w',1,function(x){ w=x; update(); });
    if(rv) v=rv.v();
    if(rw) w=rw.v();
    model=seg(fig,'data-model',function(m){ model=m; lock(rw,model!=='fan'); update(); }) || 'eu';
    lock(rw,model!=='fan');
    /* each lottery as [Pr($0), Pr($5M)]; Pr($1M) is what is left */
    var L={A:[0,0], B:[0.01,0.10], C:[0.89,0], D:[0.90,0.10]};
    var ZW=[{k:'A', o:'B', x:[-0.003,0.021], xt:[0,0.01,0.02], cls:'mi6-ab'},
            {k:'C', o:'D', x:[0.887,0.911], xt:[0.89,0.9,0.91], cls:'mi6-cd'}], ZY=[-0.008,0.13];
    function wt(){ return model==='fan'?w:1; }
    /* weighted utility (Chew 1983) with weight w on $0 and 1 on the other prizes; w = 1 is expected utility.
       u($0) = 0, u($1M) = v, u($5M) = 1. Its indifference sets are straight lines through one point (betweenness) */
    function V(p){ var p0=p[0], p5=p[1], p1=1-p0-p5; return (p1*v+p5)/(p0*wt()+p1+p5); }
    /* the indifference line at level c is Pr($5M) = s Pr($0) + a */
    function lineAt(c){ return {s:(c*(wt()-1)+v)/(1-v), a:(c-v)/(1-v)}; }
    /* the part of that line inside the box [x0, x1] × [y0, y1] (s > 0), or null */
    function cut(ln,x0,x1,y0,y1){
      var a=Math.max(x0,(y0-ln.a)/ln.s), b=Math.min(x1,(y1-ln.a)/ln.s);
      return b>a?[[a,ln.a+ln.s*a],[b,ln.a+ln.s*b]]:null;
    }
    function draw(){
      var wide, side, x0, y0=34, g, i, q, tri, z, b, cw, zh, zt, zx, id, Zb=[];
      W=measure(svg); wide=W>=500;
      if(wide){ side=Math.min(250,Math.round(W*0.42)); x0=46; }
      else { side=Math.min(W-104,300); x0=Math.max(46,Math.round((W-side)/2)-4); }
      if(wide){
        zx=x0+side+102; zh=Math.round((side-48)/2);
        Zb=[{x0:zx, x1:W-10, top:y0, bot:y0+zh},{x0:zx, x1:W-10, top:y0+side-zh, bot:y0+side}];
        H=y0+side+40;
      } else {
        zt=y0+side+40+28; cw=W/2; zh=Math.min(150,Math.round((cw-50)*1.1));
        Zb=[{x0:44, x1:Math.round(cw-8), top:zt, bot:zt+zh},{x0:Math.round(cw+42), x1:W-8, top:zt, bot:zt+zh}];
        H=zt+zh+40;
      }
      frame(svg,W,H);
      T={px:function(p0){ return x0+p0*side; }, py:function(p5){ return y0+(1-p5)*side; }};
      g=S('g',null,svg);
      tri=[[T.px(0),T.py(0)],[T.px(1),T.py(0)],[T.px(0),T.py(1)]];
      for(i=1;i<4;i++){ q=i/4; line(g,C(T.px(q)),T.py(0),C(T.px(q)),T.py(1-q),'nf-grid'); line(g,T.px(0),C(T.py(q)),T.px(1-q),C(T.py(q)),'nf-grid'); }
      for(i=0;i<=4;i++){ q=i/4; text(g,T.px(q),T.py(0)+16,tl(q),null,'middle'); if(i) text(g,T.px(0)-7,T.py(q)+4,tl(q),null,'end'); }
      text(g,T.px(1),T.py(0)+32,'Pr($0)','nf-title','end');
      text(g,T.px(0)-7,T.py(1)-14,'Pr($5M)','nf-title','start');
      text(g,T.px(0.06),T.py(1)+4,'$5M for sure','nf-lab');
      text(g,T.px(1)+6,T.py(0)-16,'$0','nf-lab'); text(g,T.px(1)+6,T.py(0)-4,'for sure','nf-lab');
      /* indifference lines are clipped to the triangle itself */
      id='mi6tri'+(++triN);
      S('path',{d:poly(tri)+'Z'},S('clipPath',{id:id},S('defs',null,svg)));
      el.lines=S('g',{'clip-path':'url(#'+id+')'},svg);
      S('path',{d:poly(tri)+'Z','class':'mi6-tri'},svg);
      /* the direction of preference: towards more $5M and less $0 */
      el.better=S('g',{'class':'mi6-better'},svg);
      el.seg=[line(svg,0,0,0,0,'mi6-ab'),line(svg,0,0,0,0,'mi6-cd')];
      el.dot={}; el.lab={};
      ['A','B','C','D'].forEach(function(k){ el.dot[k]=S('circle',{r:4,'class':'mi6-lot'},svg); el.lab[k]=text(svg,0,0,k,'mi6-lotlab nf-halo','middle'); });
      /* the two zoom windows, outlined on the triangle */
      for(i=0;i<2;i++) S('rect',{x:R(T.px(ZW[i].x[0])),y:R(T.py(ZY[1])),width:R((ZW[i].x[1]-ZW[i].x[0])*side),height:R((ZY[1]-ZY[0])*side),'class':'mi6-zoomr'},svg);
      Z=[];
      for(i=0;i<2;i++){
        b=Zb[i]; z={b:b, w:ZW[i]};
        z.xs=scale(ZW[i].x[0],ZW[i].x[1],b.x0,b.x1); z.ys=scale(ZY[0],ZY[1],b.bot,b.top);
        g=S('g',null,svg);
        axes(g,z.xs,z.ys,ZW[i].xt,[0,0.05,0.1],2,2);
        z.title=text(g,(b.x0+b.x1)/2,b.top-10,'','nf-title','middle');
        text(g,b.x1,b.bot+33,'Pr($0)','nf-title','end');
        z.gc=clip(svg,b.x0,b.top,b.x1-b.x0,b.bot-b.top);
        S('path',{d:poly([[z.xs(0),z.ys(0)],[z.xs(1),z.ys(0)],[z.xs(0),z.ys(1)]])+'Z','class':'mi6-feas'},z.gc);
        z.lines=S('g',null,z.gc);
        z.seg=line(z.gc,0,0,0,0,ZW[i].cls);
        z.dk=S('circle',{r:4.5,'class':'mi6-lot'},svg); z.dO=S('circle',{r:4.5,'class':'mi6-lot'},svg);
        z.lk=text(svg,0,0,ZW[i].k,'mi6-lotlab nf-halo','end'); z.lO=text(svg,0,0,ZW[i].o,'mi6-lotlab nf-halo','start');
        Z.push(z);
      }
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var va=V(L.A), vb=V(L.B), vc=V(L.C), vd=V(L.D), j, c, cls, k, pt, la=lineAt(va), lc=lineAt(vc), p1, p2, s, d1, d2, p1s, p2s, i, z, zw, pk, po, lk, lo;
      function full(ln,cl){ var q=cut(ln,-0.05,1.05,-0.05,1.05); if(q) line(el.lines,T.px(q[0][0]),T.py(q[0][1]),T.px(q[1][0]),T.py(q[1][1]),cl); }
      function zl(z,ln,cl){ var q=cut(ln,z.w.x[0]-0.01,z.w.x[1]+0.01,ZY[0]-0.05,ZY[1]+0.05); if(q) line(z.lines,z.xs(q[0][0]),z.ys(q[0][1]),z.xs(q[1][0]),z.ys(q[1][1]),cl); }
      clear(el.lines);
      /* faint lines through evenly spaced points of the hypotenuse, darker ones through A and C */
      for(j=1;j<12;j++){ c=V([1-j/12,j/12]); full(lineAt(c),'mi6-ind'); }
      full(la,'mi6-ind mi6-indk'); full(lc,'mi6-ind mi6-indk');
      clear(el.better);
      p1=[T.px(0.52),T.py(0.16)]; p2=[T.px(0.40),T.py(0.34)];
      line(el.better,p1[0],p1[1],p2[0],p2[1],'mi6-barrow');
      d1=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]); s=[(p2[0]-p1[0])/d1,(p2[1]-p1[1])/d1];
      S('path',{d:poly([[p2[0]+s[0]*6,p2[1]+s[1]*6],[p2[0]-s[1]*4.5,p2[1]+s[0]*4.5],[p2[0]+s[1]*4.5,p2[1]-s[0]*4.5]])+'Z','class':'mi6-bhead'},el.better);
      text(el.better,p1[0]+6,p1[1]+12,'better','nf-lab');
      setLine(el.seg[0],T.px(L.A[0]),T.py(L.A[1]),T.px(L.B[0]),T.py(L.B[1]));
      setLine(el.seg[1],T.px(L.C[0]),T.py(L.C[1]),T.px(L.D[0]),T.py(L.D[1]));
      d1=va-vb; d2=vc-vd;
      p1s=Math.abs(d1)<5e-7?'tie':d1>0?'A':'B'; p2s=Math.abs(d2)<5e-7?'tie':d2>0?'C':'D';
      for(k in L){
        pt=L[k]; at(el.dot[k],T.px(pt[0]),T.py(pt[1]));
        el.dot[k].setAttribute('class',(k===p1s||k===p2s)?'mi6-lot mi6-pick':'mi6-lot');
      }
      moveTo(el.lab.A,T.px(0)-11,T.py(0)+4);
      moveTo(el.lab.B,T.px(0.01)+11,T.py(0.10)+2);
      moveTo(el.lab.C,T.px(0.89)-12,T.py(0)-8);
      moveTo(el.lab.D,T.px(0.90)+11,T.py(0.10)+2);
      for(i=0;i<2;i++){
        z=Z[i]; zw=z.w; pk=L[zw.k]; po=L[zw.o]; lk=lineAt(V(pk)); lo=lineAt(V(po));
        clear(z.lines);
        zl(z,{s:10,a:pk[1]-10*pk[0]},'mi6-ten');
        zl(z,lo,'mi6-ind mi6-indz');
        zl(z,lk,'mi6-ind mi6-indk');
        setLine(z.seg,z.xs(pk[0]),z.ys(pk[1]),z.xs(po[0]),z.ys(po[1]));
        at(z.dk,z.xs(pk[0]),z.ys(pk[1])); at(z.dO,z.xs(po[0]),z.ys(po[1]));
        z.dk.setAttribute('class',(zw.k===p1s||zw.k===p2s)?'mi6-lot mi6-pick':'mi6-lot');
        z.dO.setAttribute('class',(zw.o===p1s||zw.o===p2s)?'mi6-lot mi6-pick':'mi6-lot');
        moveTo(z.lk,z.xs(pk[0])-9,z.ys(pk[1])-4); moveTo(z.lO,z.xs(po[0])+9,z.ys(po[1])+4);
        z.title.textContent='at '+zw.k+': slope '+fmt(lk.s,lk.s<100?1:0);
      }
      cur={model:model, v:v, w:model==='fan'?w:1, va:va, vb:vb, vc:vc, vd:vd, sa:la.s, sc:lc.s, pick1:p1s, pick2:p2s, allais:p1s==='A' && p2s==='D'};
      if(!out) return;
      function rel(a,b,x,y){ return Math.abs(a-b)<5e-7?x+' ∼ '+y:a>b?x+' ≻ '+y:y+' ≻ '+x; }
      s=(model==='eu'?'expected utility: every indifference line has slope s = '+fmt(la.s,2):
        'fanning out, weight '+fmt(w,1)+' on $0: slope '+fmt(la.s,2)+' at A, '+fmt(lc.s,2)+' at C')+
        '; AB and CD have slope 10'+
        '\nV(A) = '+fmt(va,3)+', V(B) = '+fmt(vb,3)+': '+rel(va,vb,'A','B')+
        '   V(C) = '+fmt(vc,3)+', V(D) = '+fmt(vd,3)+': '+rel(vc,vd,'C','D');
      out.textContent=s;
      if(cur.allais) warn(out,'\nA and D: the Allais pattern, which no expected utility can produce');
    }
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('model' in st) NF.press(fig,'data-model',String(st.model));
        if('v' in st && rv) rv.set(+st.v);
        if('w' in st && rw) rw.set(+st.w);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The St. Petersburg game: partial sums, and a banker who can pay at most 2^K ---------- */
  NF.register('mi6-stpete',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var M=10, K=10, r=1, N=30, W=520, H=300, el={}, hs=[], P, xl, xr, yl, yr, api, cur={}, LN2=Math.LN2;
    var rr=range(fig,'r',2,function(x){ r=x; update(); });
    if(rr) r=rr.v();
    /* partial sums over the first m tosses: Σ 2^(−i) x_i with x_i = 2^i, Σ 2^(−i) ln 2^i, and Σ 2^(−i) ln e^(2^i) */
    function ev(m){ return m; }
    function eln(m){ var s=0, i; for(i=1;i<=m;i++) s+=i*LN2/Math.pow(2,i); return s; }
    /* the game stops after k tosses: a first tail on toss i ≤ k pays 2^i, no tail in k tosses pays 2^k */
    function ce(k){
      var i, p, s=0, lx, logc=Math.abs(r-1)<1e-9;
      for(i=1;i<=k;i++){ p=i<k?Math.pow(2,-i):Math.pow(2,1-k); lx=i*LN2; s+=logc?p*lx:p*Math.exp((1-r)*lx); }
      return logc?Math.exp(s):Math.pow(s,1/(1-r));
    }
    function ceLim(){ return r<1e-9?Infinity:Math.abs(r-1)<1e-9?4:Math.pow(1/(Math.pow(2,r)-1),1/(1-r)); }
    function putM(x){ M=clamp(Math.round(x),1,N); }
    function putK(x){ K=clamp(Math.round(x),1,N); }
    function draw(){
      var g, a, b, xt, i;
      W=measure(svg); frame(svg,W,H);
      P=panels(svg,W,{titles:['Partial sums','Finite banker'],
        keys:[[['line','mi6-k','E[x], prizes 2ᵐ'],['line','mi6-g','E[ln x], prizes 2ᵐ'],['line','mi6-rd','E[ln x], prizes e^(2ᵐ)']],
              [['line','mi6-k','E[x] = K + 1'],['line','mi6-g','CRRA certainty equivalent']]],
        minW:250, mL:38, mR:12, ph:180, foot:40});
      H=P.H; a=P.P[0]; b=P.P[1];
      xl=scale(0,N+0.5,a.x0,a.x1); xr=scale(0,N+0.5,b.x0,b.x1);
      yl=scale(0,32,a.bot,a.top); yr=scale(0,32,b.bot,b.top);
      xt=(a.x1-a.x0)>=300?[0,5,10,15,20,25,30]:[0,10,20,30];
      g=S('g',null,svg);
      axes(g,xl,yl,xt,[0,10,20,30],0,0); axes(g,xr,yr,xt,[0,10,20,30],0,0);
      names(g,a,'tosses counted M','');
      names(g,b,'cap K: the game stops after K tosses','');
      el.ga=clip(svg,a.x0,a.top-4,a.x1-a.x0+4,a.bot-a.top+4);
      el.gb=clip(svg,b.x0,b.top-4,b.x1-b.x0+4,b.bot-b.top+4);
      var pk=[], pg=[], pr=[];
      for(i=1;i<=N;i++){ pk.push([xl(i),yl(ev(i))]); pg.push([xl(i),yl(eln(i))]); }
      S('path',{d:poly(pk),'class':'mi6-k'},el.ga);
      S('path',{d:poly(pg),'class':'mi6-g'},el.ga);
      S('path',{d:poly(pk),'class':'mi6-rd'},el.ga);
      pr=[]; for(i=1;i<=N;i++) pr.push([xr(i),yr(i+1)]);
      S('path',{d:poly(pr),'class':'mi6-k'},el.gb);
      el.lim=line(el.gb,0,0,0,0,'mi6-asym');
      el.ce=S('path',{'class':'mi6-g'},el.gb);
      el.limt=text(svg,0,0,'','nf-lab mi6-small','end');
      el.gu=[line(svg,0,0,0,0,'nf-guide'),line(svg,0,0,0,0,'nf-guide')];
      el.dl=[dot(svg,0,0,'mi6-dk'),dot(svg,0,0,'mi6-dg')];
      el.dr=[dot(svg,0,0,'mi6-dk'),dot(svg,0,0,'mi6-dg')];
      hs=[handle(svg,'mi6-kx','Tosses counted M, arrow keys move it',function(dx,dy,big){ putM(M+(dx||dy)*(big?5:1)); update(); }),
          handle(svg,'mi6-kx','Banker cap K, arrow keys move it',function(dx,dy,big){ putK(K+(dx||dy)*(big?5:1)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var a=P.P[0], b=P.P[1], i, pc=[], lim=ceLim(), c=ce(K), s;
      for(i=1;i<=N;i++) pc.push([xr(i),clamp(yr(ce(i)),b.top-80,b.bot+80)]);
      el.ce.setAttribute('d',poly(pc));
      if(isFinite(lim) && lim<32){ setLine(el.lim,b.x0,yr(lim),b.x1,yr(lim)); moveTo(el.limt,b.x1-2,yr(lim)-5); el.limt.textContent='limit '+fmt(lim,2); }
      else { setLine(el.lim,0,0,0,0); el.limt.textContent=''; }
      setLine(el.gu[0],xl(M),a.bot,xl(M),yl(M)); setLine(el.gu[1],xr(K),b.bot,xr(K),yr(Math.max(K+1,Math.min(c,32))));
      at(el.dl[0],xl(M),yl(ev(M))); at(el.dl[1],xl(M),yl(eln(M)));
      at(el.dr[0],xr(K),yr(K+1)); at(el.dr[1],xr(K),yr(Math.min(c,32.5)));
      place(hs[0],xl(M),a.bot,M,'M = '+M); place(hs[1],xr(K),b.bot,K,'K = '+K);
      cur={m:M, k:K, r:r, ev:M, eln:eln(M), evk:K+1, ce:c, lim:lim};
      if(!out) return;
      s='M = '+M+' tosses counted: E[x] = '+M+', E[ln x] = '+fmt(eln(M),3)+' (limit 2 ln 2 = 1.386), with prizes e^(2ᵐ) E[ln x] = '+M+
        '\nK = '+K+', so the bank pays at most 2'+sup('K')+' = '+commas(Math.pow(2,K),0)+': E[x] = K + 1 = '+(K+1)+
        '; CRRA r = '+fmt(r,2)+' ('+crraName(r)+'): C = '+fmt(c,2)+(isFinite(lim)?', limit '+fmt(lim,2):', no limit');
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xl(M),P.P[0].bot],[xr(K),P.P[1].bot]]; },
      function(i,x){ if(i===0) putM(xl.inv(x)); else putK(xr.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('r' in st && rr) rr.set(+st.r);
        if('m' in st) putM(+st.m);
        if('k' in st) putK(+st.k);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Risk attitudes: certainty equivalent and risk premium of a two prize lottery ---------- */
  NF.register('mi6-ce',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var r=0.5, p=0.5, X=[1,9], W=520, H=320, XMAX=10, el={}, hs=[], xs, ys, F, api, cur={}, i;
    var rr=range(fig,'r',2,function(v){ r=v; update(); }), rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rr) r=rr.v();
    if(rp) p=rp.v();
    /* presets: concave √x, linear x and convex x² are CRRA with r = 0.5, 0 and −1 */
    var pres=fig.querySelectorAll('.nfig-opt[data-r]');
    for(i=0;i<pres.length;i++) pres[i].addEventListener('click',function(){ if(rr) rr.set(+this.getAttribute('data-r')); });
    function put(i,x){
      x=clamp(Math.round(x*2)/2,0.5,XMAX);
      if(i===0) x=Math.min(x,X[1]-0.5); else x=Math.max(x,X[0]+0.5);
      X[i]=x;
    }
    function stats(){
      var x1=X[0], x2=X[1], m=(1-p)*x1+p*x2, eu=(1-p)*crra(x1,r)+p*crra(x2,r), ce=Math.abs(r)<1e-9?m:crraInv(eu,r);
      return {x1:x1, x2:x2, m:m, eu:eu, ce:ce, rp:m-ce};
    }
    function draw(){
      var top=18, bot, x0=58, x1;
      W=measure(svg); H=W<440?300:320; frame(svg,W,H);
      bot=H-56; x1=W-14;
      xs=scale(0,XMAX,x0,x1); ys=scale(-0.32,1.3,bot,top);
      F={top:top, bot:bot, x0:x0, x1:x1};
      el.bg=S('g',null,svg);
      el.gc=clip(svg,x0,top,x1-x0,bot-top);
      el.curve=S('path',{'class':'mi6-g'},el.gc);
      el.guides=S('g',null,svg);
      el.chord=line(svg,0,0,0,0,'mi6-chord');
      el.br=S('g',null,svg);
      el.dots=S('g',null,svg);
      el.labs=S('g',null,svg);
      hs=[handle(svg,'mi6-kx','Low prize x1, arrow keys move it',function(dx,dy,big){ put(0,X[0]+(dx||dy)*(big?2:0.5)); update(); }),
          handle(svg,'mi6-kx','High prize x2, arrow keys move it',function(dx,dy,big){ put(1,X[1]+(dx||dy)*(big?2:0.5)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var st=stats(), u1=crra(st.x1,r), u2=crra(st.x2,r), du=u2-u1, x, g, yE, yU, b, lo, hi, y0=F.bot, s, kind, cls=crraClass(r), step=(F.x1-F.x0)>=380?1:2;
      function Y(u){ return ys((u-u1)/du); }
      g=el.bg; clear(g);
      for(x=0;x<=XMAX;x+=step){ line(g,C(xs(x)),F.top,C(xs(x)),y0,'nf-grid'); text(g,xs(x),y0+18,String(x),null,'middle'); }
      line(g,F.x0,C(y0),F.x1,C(y0),'nf-ax');
      line(g,C(F.x0),F.top,C(F.x0),y0,'nf-ax');
      text(g,F.x1,y0+50,'money x','nf-title','end');
      text(g,F.x0-7,F.top+4,'u','nf-title mi6-it','end');
      el.curve.setAttribute('d',path(function(x){ return (crra(x,r)-u1)/du; },0.04,XMAX,360,xs,ys));
      el.curve.setAttribute('class',cls);
      yE=Y(st.eu); yU=Y(crra(st.m,r));
      g=el.guides; clear(g);
      /* dashed guides: the prizes up to the curve, E[u] across to the curve at C, and C, x bar down to the axis */
      line(g,xs(st.x1),y0,xs(st.x1),Y(u1),'nf-guide'); line(g,xs(st.x2),y0,xs(st.x2),Y(u2),'nf-guide');
      line(g,F.x0,Y(u1),xs(st.x1),Y(u1),'nf-hread'); line(g,F.x0,Y(u2),xs(st.x2),Y(u2),'nf-hread');
      line(g,F.x0,yE,Math.max(xs(st.m),xs(st.ce)),yE,'nf-hread');
      line(g,xs(st.m),y0,xs(st.m),Math.min(yE,yU),'nf-guide');
      line(g,xs(st.ce),y0,xs(st.ce),yE,'mi6-cguide');
      setLine(el.chord,xs(st.x1),Y(u1),xs(st.x2),Y(u2));
      g=el.dots; clear(g);
      dot(g,xs(st.x1),Y(u1),'mi6-dk'); dot(g,xs(st.x2),Y(u2),'mi6-dk');
      dot(g,xs(st.m),yU,cls==='mi6-g'?'mi6-dg':cls==='mi6-or'?'mi6-do':'mi6-dk',4.5);
      dot(g,xs(st.m),yE,'mi6-dk',4.5);
      dot(g,xs(st.ce),yE,'mi6-dr',4.5);
      /* the risk premium: a purple bracket from C to x bar just above the axis */
      g=el.br; clear(g);
      lo=Math.min(xs(st.ce),xs(st.m)); hi=Math.max(xs(st.ce),xs(st.m)); b=y0-9;
      if(hi-lo>2) S('path',{d:'M'+R(lo)+','+R(b+4)+'V'+R(b)+'H'+R(hi)+'V'+R(b+4),'class':'mi6-pline'},g);
      text(g,(lo+hi)/2,b-5,Math.abs(st.rp)<0.005?'P = 0':st.rp<0?'P < 0':'P','mi6-plab nf-halo','middle');
      g=el.labs; clear(g);
      spread(g,[[xs(st.x1),'x₁','nf-lab'],[xs(st.x2),'x₂','nf-lab'],[xs(st.m),'x̄','nf-lab'],[xs(st.ce),'C','mi6-tr']],y0+34,18);
      stack(g,[[Y(u1)+4,'u(x₁)','nf-lab'],[Y(u2)+4,'u(x₂)','nf-lab'],[yE+4,'E[u]','nf-lab']],F.x0-6,12,'end');
      for(i=0;i<2;i++) place(hs[i],xs(X[i]),y0,X[i],(i?'x2':'x1')+' = '+tl(X[i]));
      for(i=0;i<pres.length;i++) pres[i].setAttribute('aria-pressed',Math.abs(+pres[i].getAttribute('data-r')-r)<1e-9?'true':'false');
      kind=Math.abs(r)<1e-9?'neutral':r>0?'averse':'loving';
      cur={r:r, p:p, x1:st.x1, x2:st.x2, mean:st.m, ce:st.ce, rp:st.rp, kind:kind};
      if(!out) return;
      s='r = '+fmt(r,2)+' ('+crraName(r)+')   p = '+fmt(p,2)+' on x₂'+
        '\nx̄ = '+fmt(st.m,2)+'   u(x̄) '+(kind==='averse'?'>':kind==='loving'?'<':'=')+' E[u]   C = '+fmt(st.ce,3)+'   P = x̄ '+MINUS+' C = '+fmt(st.rp,3)+
        (kind==='neutral'?': risk neutral':kind==='loving'?': risk loving, so the agent pays to keep the risk':': risk averse');
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(X[0]),F.bot],[xs(X[1]),F.bot]]; },
      function(i,x){ put(i,xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('r' in st && rr) rr.set(+st.r);
        if('p' in st && rp) rp.set(+st.p);
        /* move the high prize first when it rises, so the two never have to cross */
        if('x2' in st && +st.x2>X[1]){ put(1,+st.x2); if('x1' in st) put(0,+st.x1); }
        else { if('x1' in st) put(0,+st.x1); if('x2' in st) put(1,+st.x2); }
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Risk premium (second order), probability premium (first order), and the premium across wealth ---------- */
  NF.register('mi6-premia',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* x0 = 100; across wealth, all three utilities have r_A = 0.01 at 100: CARA r = 0.01, ln x, and x − b x² with b = 0.0025 */
    var X0=100, A=0.01, B=0.0025, view='p', r=1, h=10, d={p:40, pi:40, w:100}, W=520, H=300, el={}, hs=[], F, P, xs, ys, api, cur={};
    var rr=range(fig,'r',1,function(x){ r=x; update(); }), rh=range(fig,'h',0,function(x){ h=x; update(); });
    if(rr) r=rr.v();
    if(rh) h=rh.v();
    view=seg(fig,'data-view',function(x){ view=x; locks(); draw(); }) || 'p';
    function locks(){ lock(rr,view==='w'); lock(rh,view!=='w'); }
    locks();
    function u(x){ return crra(x,r); }
    function pEx(t){ return t<=0||Math.abs(r)<1e-9?0:X0-crraInv(0.5*u(X0+t)+0.5*u(X0-t),r); }
    function pAp(t){ return 0.5*(r/X0)*t*t; }
    function qEx(e){ if(e<=0||Math.abs(r)<1e-9) return 0; var a=u(X0+e), b=u(X0-e); return (u(X0)-0.5*a-0.5*b)/(a-b); }
    function qAp(e){ return 0.25*(r/X0)*e; }
    function wL(x){ return x-Math.sqrt(x*x-h*h); }
    function wC(){ return Math.log(Math.cosh(A*h))/A; }
    function wQ(x){ var k=x-B*x*x-B*h*h; return x-(1-Math.sqrt(Math.max(0,1-4*B*k)))/(2*B); }
    var V={
      p:{title:'P: second order in h', key:[['line','mi6-g','exact P'],['line','mi6-bd','Arrow Pratt ½ r_A h²']], lo:0, hi:90, xl:'risk ± h at x₀ = 100', yl:'P', f:[pEx,pAp], cls:['mi6-g','mi6-bd'], dc:['mi6-dg','mi6-db']},
      pi:{title:'π: first order in ε', key:[['line','mi6-pu','exact π'],['line','mi6-bd','¼ r_A ε']], lo:0, hi:90, xl:'gamble ± ε at x₀ = 100', yl:'π', f:[qEx,qAp], cls:['mi6-pu','mi6-bd'], dc:['mi6-dp','mi6-db']},
      w:{title:'Premium across wealth', key:[['line','mi6-g','DARA: ln x'],['line','mi6-k','CARA: r = 0.01'],['line','mi6-or','IARA: x − 0.0025x²']], lo:25, hi:180, xl:'initial wealth x₀', yl:'P', f:[wL,wC,wQ], cls:['mi6-g','mi6-k','mi6-or'], dc:['mi6-dg','mi6-dk','mi6-do']}
    };
    function put(x){ var o=V[view]; d[view]=clamp(Math.round(x),o.lo,o.hi); }
    function draw(){
      var o=V[view], j;
      W=measure(svg); frame(svg,W,H);
      P=panels(svg,W,{titles:[o.title], keys:[o.key], minW:0, mL:46, mR:14, ph:W<440?190:200, foot:40});
      F=P.P[0]; H=P.H;
      xs=scale(o.lo,o.hi,F.x0,F.x1);
      el.g=S('g',null,svg);
      el.gc=clip(svg,F.x0,F.top-4,F.x1-F.x0+4,F.bot-F.top+4);
      el.c=[]; el.d=[];
      for(j=0;j<o.f.length;j++) el.c.push(S('path',{'class':o.cls[j]},el.gc));
      el.guide=line(svg,0,0,0,0,'nf-guide');
      for(j=0;j<o.f.length;j++) el.d.push(dot(svg,0,0,o.dc[j]));
      hs=[handle(svg,'mi6-kx',view==='w'?'Initial wealth, arrow keys move it':'Size of the risk, arrow keys move it',function(dx,dy,big){ put(d[view]+(dx||dy)*(big?10:1)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var o=V[view], g=el.g, i, j, t, ymax=0, tk, xt, x=d[view], vals=[], s, ra;
      for(j=0;j<o.f.length;j++) for(i=0;i<=120;i++){ t=o.lo+(o.hi-o.lo)*i/120; ymax=Math.max(ymax,o.f[j](t)); }
      ymax=Math.max(ymax*1.08,view==='pi'?0.05:0.5);
      tk=ticks(0,ymax,4); ymax=Math.max(ymax,tk.t[tk.t.length-1]);
      ys=scale(0,ymax,F.bot,F.top);
      clear(g);
      xt=view==='w'?((F.x1-F.x0)>=330?[25,50,75,100,125,150,175]:[50,100,150]):((F.x1-F.x0)>=330?[0,15,30,45,60,75,90]:[0,30,60,90]);
      axes(g,xs,ys,xt,tk.t,0,dec(tk.s));
      names(g,F,o.xl,o.yl);
      if(view==='w'){ line(g,C(xs(100)),F.top,C(xs(100)),F.bot,'mi6-asym'); text(g,xs(100)+5,F.bot-8,'all r_A = 0.01 here','nf-lab mi6-small'); }
      for(j=0;j<o.f.length;j++){ el.c[j].setAttribute('d',path(o.f[j],o.lo,o.hi,240,xs,ys)); vals.push(o.f[j](x)); at(el.d[j],xs(x),ys(Math.min(vals[j],ymax))); }
      setLine(el.guide,xs(x),F.bot,xs(x),ys(Math.max.apply(null,vals)));
      place(hs[0],xs(x),F.bot,x,(view==='w'?'x0 = ':'size ')+x);
      cur={view:view, r:r, h:h, x:x, a:vals[0], b:vals[1], c:view==='w'?vals[2]:null};
      if(!out) return;
      if(view==='p') s='CRRA r = '+fmt(r,1)+' ('+crraName(r)+') at x₀ = 100: r_A(x₀) = '+fmt(r/X0,4)+
        '\nrisk ± '+x+': exact P = '+fmt(vals[0],3)+'   ½ r_A h² = '+fmt(vals[1],3)+(vals[1]>0?'   ratio '+fmt(vals[0]/vals[1],3):'');
      else if(view==='pi') s='CRRA r = '+fmt(r,1)+' ('+crraName(r)+') at x₀ = 100: r_A(x₀) = '+fmt(r/X0,4)+
        '\ngamble ± '+x+' needs win probability ½ + π: exact π = '+fmt(vals[0],4)+'   ¼ r_A ε = '+fmt(vals[1],4)+(vals[1]>0?'   ratio '+fmt(vals[0]/vals[1],3):'');
      else { ra=[1/x,A,2*B/(1-2*B*x)];
        s='risk ± '+h+' at x₀ = '+x+': r_A = '+fmt(ra[0],4)+' (ln), '+fmt(ra[1],4)+' (CARA), '+fmt(ra[2],4)+' (IARA)'+
          '\nP = insurance WTP:   ln '+fmt(vals[0],3)+'   CARA '+fmt(vals[1],3)+'   IARA '+fmt(vals[2],3); }
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(d[view]),F.bot]]; },
      function(i,x){ put(xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('view' in st) NF.press(fig,'data-view',String(st.view));
        if('r' in st && rr) rr.set(+st.r);
        if('h' in st && rh) rh.set(+st.h);
        if('x' in st){ put(+st.x); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Pratt: two utilities rescaled to agree at x1 and x2, and f = u1 composed with the inverse of u2 ---------- */
  NF.register('mi6-pratt',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var r1=1, r2=0.5, X=[1,9], XMAX=10, W=520, H=300, el={}, hs=[], P, xs, ys, fx, fy, api, cur={};
    var ra=range(fig,'r1',2,function(v){ r1=v; update(); }), rb=range(fig,'r2',2,function(v){ r2=v; update(); });
    if(ra) r1=ra.v();
    if(rb) r2=rb.v();
    function put(i,x){
      x=clamp(Math.round(x*2)/2,0.5,XMAX);
      if(i===0) x=Math.min(x,X[1]-0.5); else x=Math.max(x,X[0]+0.5);
      X[i]=x;
    }
    /* utility rescaled so that u(x1) = 0 and u(x2) = 1 */
    function resc(x,r){ var a=crra(X[0],r), b=crra(X[1],r); return (crra(x,r)-a)/(b-a); }
    function ceOf(r){ return Math.abs(r)<1e-9?0.5*(X[0]+X[1]):crraInv(0.5*crra(X[0],r)+0.5*crra(X[1],r),r); }
    function draw(){
      var a, b, g;
      W=measure(svg); frame(svg,W,H);
      P=panels(svg,W,{titles:['Rescaled to agree at x₁ and x₂','f = u₁ after the inverse of u₂'],
        keys:[[['line','mi6-pu','u₁'],['line','mi6-g','u₂'],['line','mi6-chord','chord']],[['line','mi6-pu','f'],['line','mi6-id','identity']]],
        minW:250, mL:40, mR:12, ph:190, foot:52});
      H=P.H; a=P.P[0]; b=P.P[1];
      xs=scale(0,XMAX,a.x0,a.x1); ys=scale(-0.3,1.15,a.bot,a.top);
      fx=scale(0,1,b.x0,b.x1); fy=scale(0,1.05,b.bot,b.top);
      g=S('g',null,svg);
      axes(g,fx,fy,[0,0.25,0.5,0.75,1],[0,0.5,1],2,1);
      names(g,b,'u₂ rescaled','u₁');
      el.ga=S('g',null,svg);
      el.gc=clip(svg,a.x0,a.top,a.x1-a.x0,a.bot-a.top);
      el.u2=S('path',{'class':'mi6-g'},el.gc);
      el.u1=S('path',{'class':'mi6-pu'},el.gc);
      el.chord=line(el.gc,0,0,0,0,'mi6-chord');
      el.guides=S('g',null,svg);
      el.dots=S('g',null,svg);
      el.labs=S('g',null,svg);
      el.gf=clip(svg,b.x0,b.top-4,b.x1-b.x0+4,b.bot-b.top+4);
      line(el.gf,fx(0),fy(0),fx(1),fy(1),'mi6-id');
      el.f=S('path',{'class':'mi6-pu'},el.gf);
      el.jg=line(svg,0,0,0,0,'mi6-jensen');
      el.j1=dot(svg,0,0,'mi6-dp',4.5); el.j2=dot(svg,0,0,'mi6-dk',4);
      el.jt=text(svg,0,0,'','nf-lab mi6-small nf-halo','end');
      hs=[handle(svg,'mi6-kx','Low prize x1, arrow keys move it',function(dx,dy,big){ put(0,X[0]+(dx||dy)*(big?2:0.5)); update(); }),
          handle(svg,'mi6-kx','High prize x2, arrow keys move it',function(dx,dy,big){ put(1,X[1]+(dx||dy)*(big?2:0.5)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var a=P.P[0], b=P.P[1], g=el.ga, x, c1=ceOf(r1), c2=ceOf(r2), m=0.5*(X[0]+X[1]), y0=a.bot, yh=ys(0.5), i, pf=[], t, s, f5, rel, xt=[], st=(a.x1-a.x0)>=330?1:2;
      clear(g);
      for(x=0;x<=XMAX;x+=st) xt.push(x);
      axes(g,xs,ys,xt,[0,0.5,1],0,1);
      text(g,a.x1,a.bot+46,'money x','nf-title','end');
      el.u1.setAttribute('d',path(function(x){ return resc(x,r1); },0.04,XMAX,300,xs,ys));
      el.u2.setAttribute('d',path(function(x){ return resc(x,r2); },0.04,XMAX,300,xs,ys));
      setLine(el.chord,xs(X[0]),ys(0),xs(X[1]),ys(1));
      g=el.guides; clear(g);
      line(g,a.x0,yh,xs(Math.max(c1,c2,m)),yh,'nf-hread');
      line(g,xs(c1),y0,xs(c1),yh,'mi6-pguide'); line(g,xs(c2),y0,xs(c2),yh,'mi6-gguide'); line(g,xs(m),y0,xs(m),yh,'nf-guide');
      g=el.dots; clear(g);
      dot(g,xs(m),yh,'mi6-dk',4.5); dot(g,xs(c2),yh,'mi6-dg',4.5); dot(g,xs(c1),yh,'mi6-dp',4.5);
      g=el.labs; clear(g);
      spread(g,[[xs(X[0]),'x₁','nf-lab'],[xs(X[1]),'x₂','nf-lab'],[xs(m),'x̄','nf-lab'],[xs(c1),'C₁','mi6-tp'],[xs(c2),'C₂','mi6-tg']],y0+31,17);
      for(i=0;i<=200;i++){ t=X[0]+(X[1]-X[0])*i/200; pf.push([fx(resc(t,r2)),fy(resc(t,r1))]); }
      el.f.setAttribute('d',poly(pf));
      /* Jensen: E[u1] = E[f(u2)] = ½ against f(E[u2]) = f(½) */
      f5=resc(c2,r1);
      setLine(el.jg,fx(0.5),fy(0.5),fx(0.5),fy(f5));
      at(el.j1,fx(0.5),fy(f5)); at(el.j2,fx(0.5),fy(0.5));
      moveTo(el.jt,fx(0.5)-8,fy(Math.max(f5,0.5))-8); el.jt.textContent='f(½) = '+fmt(f5,2);
      for(i=0;i<2;i++) place(hs[i],xs(X[i]),y0,X[i],(i?'x2':'x1')+' = '+tl(X[i]));
      rel=Math.abs(r1-r2)<1e-9?0:r1>r2?1:-1;
      cur={r1:r1, r2:r2, x1:X[0], x2:X[1], c1:c1, c2:c2, mean:m, f5:f5, rel:rel};
      if(!out) return;
      s='agent 1: r = '+fmt(r1,2)+' ('+crraName(r1)+')   agent 2: r = '+fmt(r2,2)+' ('+crraName(r2)+')'+
        '\nat x̄: r_A¹ = '+fmt(r1/m,3)+', r_A² = '+fmt(r2/m,3)+'   C₁ = '+fmt(c1,3)+'   C₂ = '+fmt(c2,3)+'   x̄ = '+fmt(m,2)+
        (rel===0?'\nsame r: f is the identity and C₁ = C₂':rel>0?'\nr_A¹ > r_A² everywhere: f concave, C₁ < C₂, agent 1 is more risk averse':'\nr_A¹ < r_A² everywhere: f convex, C₁ > C₂, agent 2 is more risk averse');
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(X[0]),P.P[0].bot],[xs(X[1]),P.P[0].bot]]; },
      function(i,x){ put(i,xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('r1' in st && ra) ra.set(+st.r1);
        if('r2' in st && rb) rb.set(+st.r2);
        if('x2' in st && +st.x2>X[1]){ put(1,+st.x2); if('x1' in st) put(0,+st.x1); }
        else { if('x1' in st) put(0,+st.x1); if('x2' in st) put(1,+st.x2); }
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. CARA with normal risk: mean variance indifference curves, and fat tails at equal variance ---------- */
  NF.register('mi6-meanvar',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var r=1, pt=[1,2.5], hh=1.5, W=520, H=300, el={}, hs=[], P, xa, ya, xb, yb, api, cur={};
    var rr=range(fig,'r',1,function(x){ r=x; update(); });
    if(rr) r=rr.v();
    function putPt(s,m){ pt=[clamp(Math.round(s*20)/20,0,2),clamp(Math.round(m*20)/20,0,5)]; }
    function putH(x){ hh=clamp(Math.round(x*20)/20,0,3); }
    function nP(t){ return 0.5*r*t*t; }
    function tP(t){ return Math.log(Math.cosh(r*t))/r; }
    function draw(){
      var a, b, g;
      W=measure(svg); frame(svg,W,H);
      P=panels(svg,W,{titles:['Indifference: μ − ½ r σ² = C','Same variance, different tails'],
        keys:[[['line','mi6-or','r now'],['line','mi6-ref1','r = 1']],[['line','mi6-bl','normal: ½ r h²'],['line','mi6-or','± h: ln cosh(rh) over r']]],
        minW:250, mL:40, mR:12, ph:190, foot:40});
      H=P.H; a=P.P[0]; b=P.P[1];
      xa=scale(0,2,a.x0,a.x1); ya=scale(0,5,a.bot,a.top);
      xb=scale(0,3,b.x0,b.x1);
      g=S('g',null,svg);
      axes(g,xa,ya,[0,0.5,1,1.5,2],[0,1,2,3,4,5],1,0);
      names(g,a,'σ','μ');
      el.gb=S('g',null,svg);
      el.ga=clip(svg,a.x0,a.top,a.x1-a.x0,a.bot-a.top);
      el.fam=S('g',null,el.ga);
      el.cur=S('path',{'class':'mi6-or mi6-thick'},el.ga);
      el.cg=line(svg,0,0,0,0,'nf-hread');
      el.cd=dot(svg,0,0,'mi6-dr',4.5);
      el.ct=text(svg,0,0,'','mi6-tr nf-halo','start');
      el.gc=clip(svg,b.x0,b.top-4,b.x1-b.x0+4,b.bot-b.top+4);
      el.n=S('path',{'class':'mi6-bl'},el.gc); el.t=S('path',{'class':'mi6-or'},el.gc);
      el.hg=line(svg,0,0,0,0,'nf-guide');
      el.hd=[dot(svg,0,0,'mi6-db'),dot(svg,0,0,'mi6-do')];
      hs=[handle(svg,'mi6-kx','Risky prospect: sigma left and right, mu up and down',function(dx,dy,big){ var k=big?0.25:0.05; putPt(pt[0]+dx*k,pt[1]+dy*k); update(); }),
          handle(svg,'mi6-kx','Risk size h, arrow keys move it',function(dx,dy,big){ putH(hh+(dx||dy)*(big?0.25:0.05)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var a=P.P[0], b=P.P[1], g=el.fam, c, i, cl=pt[1]-0.5*r*pt[0]*pt[0], ymax, tk, s, np, tp;
      clear(g);
      for(c=1;c<=4;c++){
        if(Math.abs(r-1)>1e-9) S('path',{d:path(function(x){ return c+0.5*x*x; },0,2,80,xa,ya),'class':'mi6-ref1'},g);
        S('path',{d:path(function(x){ return c+0.5*r*x*x; },0,2,80,xa,ya),'class':'mi6-or mi6-faint'},g);
      }
      el.cur.setAttribute('d',path(function(x){ return cl+0.5*r*x*x; },0,2,120,xa,ya));
      setLine(el.cg,xa(0),ya(cl),xa(pt[0]),ya(cl));
      at(el.cd,xa(0),ya(clamp(cl,-0.3,5.2))); moveTo(el.ct,xa(0)+8,ya(clamp(cl,0,5))-6); el.ct.textContent='C = '+fmt(cl,2);
      place(hs[0],xa(pt[0]),ya(pt[1]),pt[1],'sigma '+fmt(pt[0],2)+', mu '+fmt(pt[1],2));
      ymax=Math.max(nP(3)*1.08,0.5); tk=ticks(0,ymax,4); ymax=Math.max(ymax,tk.t[tk.t.length-1]);
      yb=scale(0,ymax,b.bot,b.top);
      g=el.gb; clear(g);
      axes(g,xb,yb,[0,0.5,1,1.5,2,2.5,3].filter(function(v,j){ return (b.x1-b.x0)>=230 || j%2===0; }),tk.t,1,dec(tk.s));
      names(g,b,'h: variance h², r = '+fmt(r,1),'P');
      el.n.setAttribute('d',path(nP,0,3,160,xb,yb)); el.t.setAttribute('d',path(tP,0,3,160,xb,yb));
      np=nP(hh); tp=tP(hh);
      setLine(el.hg,xb(hh),b.bot,xb(hh),yb(np));
      at(el.hd[0],xb(hh),yb(np)); at(el.hd[1],xb(hh),yb(tp));
      place(hs[1],xb(hh),b.bot,hh,'h = '+fmt(hh,2));
      cur={r:r, sigma:pt[0], mu:pt[1], ce:cl, prem:0.5*r*pt[0]*pt[0], h:hh, pn:np, pt:tp};
      if(!out) return;
      s='r = '+fmt(r,1)+'   σ = '+fmt(pt[0],2)+', μ = '+fmt(pt[1],2)+': C = μ '+MINUS+' ½ r σ² = '+fmt(cl,3)+', P = ½ r σ² = '+fmt(0.5*r*pt[0]*pt[0],3)+
        '\nh = '+fmt(hh,2)+' (variance '+fmt(hh*hh,2)+'): normal P = '+fmt(np,3)+', two point ± h P = '+fmt(tp,3)+(hh>0?': the fatter tails cost more':'');
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xa(pt[0]),ya(pt[1])],[xb(hh),P.P[1].bot]]; },
      function(i,x,y){ if(i===0) putPt(xa.inv(x),ya.inv(y)); else putH(xb.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('r' in st && rr) rr.set(+st.r);
        if('sigma' in st || 'mu' in st) putPt('sigma' in st?+st.sigma:pt[0],'mu' in st?+st.mu:pt[1]);
        if('h' in st) putH(+st.h);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. The CARA and CRRA families, and the certainty equivalent rate of a proportionate gamble ---------- */
  NF.register('mi6-families',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var fam='crra', ra=1, rc=1, x=2, wv=5, W=520, H=300, el={}, hs=[], P, xa, ya, xb, yb, api, cur={};
    var rA=range(fig,'ra',2,function(v){ ra=v; update(); }), rC=range(fig,'rc',1,function(v){ rc=v; update(); });
    if(rA) ra=rA.v();
    if(rC) rc=rC.v();
    fam=seg(fig,'data-fam',function(v){ fam=v; locks(); draw(); }) || 'crra';
    function locks(){ lock(rA,fam!=='cara'); lock(rC,fam!=='crra'); }
    locks();
    var FAM={cara:{rs:[0,0.25,0.5,1,2], xm:6, y:[0,6.3], yt:[0,2,4,6]}, crra:{rs:[0,0.5,1,2,5], xm:4, y:[-3,3], yt:[-3,-2,-1,0,1,2,3]}};
    function cara(x,r){ return r<1e-9?x:(1-Math.exp(-r*x))/r; }
    function uOf(x,r){ return fam==='cara'?cara(x,r):crra(x,r); }
    function rNow(){ return fam==='cara'?ra:rc; }
    /* certainty equivalent rate of t = 0.95 or 2, equally likely: CRRA at any wealth, CARA at wealth w */
    function tCrra(r){ return Math.abs(r-1)<1e-9?Math.sqrt(1.9):Math.pow(0.5*(Math.pow(0.95,1-r)+Math.pow(2,1-r)),1/(1-r)); }
    function tCara(w){ var k=ra*w; return k<1e-9?1.475:(0.95*k+Math.LN2-Math.log(1+Math.exp(-1.05*k)))/k; }
    function root(f,a,b){ var i, m; for(i=0;i<80;i++){ m=0.5*(a+b); if(f(a)*f(m)<=0) b=m; else a=m; } return 0.5*(a+b); }
    var RSTAR=root(function(r){ return Math.pow(0.95,1-r)+Math.pow(2,1-r)-2; },2,30);
    var KSTAR=root(function(k){ return 0.5*Math.exp(0.05*k)+0.5*Math.exp(-k)-1; },1,40);
    function putX(v){ x=clamp(Math.round(v*20)/20,0.05,FAM[fam].xm); }
    function putW(v){ wv=clamp(Math.round(v*2)/2,0.5,40); }
    function draw(){
      var a, b, g, F=FAM[fam], cara=fam==='cara', j;
      putX(x);
      W=measure(svg); frame(svg,W,H);
      P=panels(svg,W,{titles:[cara?'CARA: (1 − e^(−rx)) over r':'CRRA: (x^(1−r) − 1) over (1 − r)', cara?'CE rate of ×0.95 or ×2 across wealth':'CE rate of ×0.95 or ×2, any wealth'],
        keys:[[['line','mi6-fam','r = '+F.rs.join(', ')],['line','nf-line','chosen r']],[['line','mi6-g','t̄'],['line','mi6-thr','break even']]],
        minW:250, mL:40, mR:14, ph:190, foot:40});
      H=P.H; a=P.P[0]; b=P.P[1];
      xa=scale(0,F.xm,a.x0,a.x1); ya=scale(F.y[0],F.y[1],a.bot,a.top);
      xb=cara?scale(0,40,b.x0,b.x1):scale(0,18,b.x0,b.x1); yb=scale(0.95,1.5,b.bot,b.top);
      g=S('g',null,svg);
      axes(g,xa,ya,cara?[0,1,2,3,4,5,6]:[0,1,2,3,4],F.yt,0,0);
      names(g,a,'x','u');
      axes(g,xb,yb,cara?[0,10,20,30,40]:[0,5,10,15],[1,1.1,1.2,1.3,1.4,1.5],0,1);
      names(g,b,cara?'wealth w, r = chosen r':'CRRA r','t̄');
      el.ga=clip(svg,a.x0,a.top,a.x1-a.x0,a.bot-a.top);
      for(j=0;j<F.rs.length;j++) S('path',{d:path(function(t){ return uOf(t,F.rs[j]); },0.005,F.xm,240,xa,ya),'class':'mi6-fam'},el.ga);
      el.ftx=S('g',null,svg);
      el.cur=S('path',{'class':'nf-line'},el.ga);
      el.xg=line(svg,0,0,0,0,'nf-guide'); el.xd=dot(svg,0,0,'nf-dot',4.5);
      el.gb=clip(svg,b.x0,b.top-4,b.x1-b.x0+4,b.bot-b.top+4);
      line(el.gb,b.x0,C(yb(1)),b.x1,C(yb(1)),'mi6-asym');
      el.tc=S('path',{'class':'mi6-g'},el.gb);
      el.thr=line(el.gb,0,0,0,0,'mi6-thr');
      el.thrt=text(svg,0,0,'','mi6-tr mi6-small nf-halo','end');
      el.tg=line(svg,0,0,0,0,'nf-guide'); el.td=dot(svg,0,0,'mi6-dg',4.5);
      hs=[handle(svg,'mi6-kx','Money x, arrow keys move it',function(dx,dy,big){ putX(x+(dx||dy)*(big?0.5:0.05)); update(); }),
          handle(svg,'mi6-kx',cara?'Wealth w, arrow keys move it':'Relative risk aversion r, arrow keys move it',function(dx,dy,big){
            var dd=dx||dy;
            if(fam==='cara'){ putW(wv+dd*(big?5:0.5)); update(); } else if(rC) rC.set(rc+dd*(big?1:0.1));
          })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var a=P.P[0], b=P.P[1], r=rNow(), cara=fam==='cara', uy=uOf(x,r), rA_=cara?r:r/x, rR=cara?r*x:r, tb, s, xt, thr, F=FAM[fam], j, ends=[];
      el.cur.setAttribute('d',path(function(t){ return uOf(t,r); },0.005,F.xm,300,xa,ya));
      setLine(el.xg,xa(x),a.bot,xa(x),ya(clamp(uy,F.y[0],F.y[1])));
      at(el.xd,xa(x),ya(clamp(uy,F.y[0]-0.2,F.y[1]+0.2)));
      place(hs[0],xa(x),a.bot,x,'x = '+fmt(x,2));
      /* the chosen r named at the right end of its curve */
      clear(el.ftx);
      ends.push([ya(clamp(uOf(F.xm,r),F.y[0],F.y[1]))-7,'r = '+fmt(r,cara?2:1),'mi6-tb nf-halo']);
      stack(el.ftx,ends,a.x1-4,12,'end');
      if(cara){
        el.tc.setAttribute('d',path(tCara,0.05,40,240,xb,yb));
        thr=ra>1e-9?KSTAR/ra:Infinity;
        tb=tCara(wv); xt=wv;
      } else {
        el.tc.setAttribute('d',path(tCrra,0,18,240,xb,yb));
        thr=RSTAR; tb=tCrra(rc); xt=clamp(rc,0,18);
      }
      if(thr<=xb.d1){ setLine(el.thr,xb(thr),b.top,xb(thr),b.bot); moveTo(el.thrt,xb(thr)-4,b.top+12); el.thrt.textContent=(cara?'w = ':'r = ')+fmt(thr,2); }
      else { setLine(el.thr,0,0,0,0); el.thrt.textContent=''; }
      setLine(el.tg,xb(xt),b.bot,xb(xt),yb(clamp(tb,0.95,1.5)));
      at(el.td,xb(xt),yb(clamp(tb,0.94,1.52)));
      place(hs[1],xb(xt),b.bot,xt,(cara?'w = ':'r = ')+fmt(xt,1));
      cur={fam:fam, r:r, x:x, u:uy, ra:rA_, rr:rR, w:wv, tbar:tb, take:tb>1, thr:thr};
      if(!out) return;
      s=(cara?'CARA':'CRRA')+' r = '+fmt(r,cara?2:1)+' at x = '+fmt(x,2)+': u = '+fmt(uy,3)+', r_A = '+fmt(rA_,3)+', r_R = '+fmt(rR,3);
      if(cara) s+='\nwealth '+fmt(wv,1)+': t̄ = '+fmt(tb,3)+(tb>1?', taken':', refused')+(isFinite(thr)?'; taken only below wealth '+fmt(thr,2)+', since r_R = r w rises':'; risk neutral, always taken');
      else s+='\nt̄ = '+fmt(tb,3)+' at every wealth, '+(tb>1?'taken':'refused')+'; taken iff r < '+fmt(RSTAR,2);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xa(x),P.P[0].bot],[xb(fam==='cara'?wv:clamp(rc,0,18)),P.P[1].bot]]; },
      function(i,px){ if(i===0){ putX(xa.inv(px)); update(); } else if(fam==='cara'){ putW(xb.inv(px)); update(); } else if(rC) rC.set(Math.round(xb.inv(px)*10)/10); },
      focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('fam' in st) NF.press(fig,'data-fam',String(st.fam));
        if('ra' in st && rA) rA.set(+st.ra);
        if('rc' in st && rC) rC.set(+st.rc);
        if('x' in st) putX(+st.x);
        if('w' in st) putW(+st.w);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 8. Risky asset demand across wealth: amount and share ---------- */
  NF.register('mi6-assets',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* net return z = 0.5 with probability p, −0.3 otherwise; CARA r = 0.02, ln x, ln(x − 20), x − 0.002x² */
    var ZH=0.5, ZL=-0.3, RC=0.02, BQ=0.002, SH=20, LO=30, HI=200, p=0.5, w=100, W=520, H=300, el={}, hs=[], P, xa, ya, xb, yb, api, cur={};
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rp) p=rp.v();
    function ez(){ return p*ZH+(1-p)*ZL; }
    function ez2(){ return p*ZH*ZH+(1-p)*ZL*ZL; }
    function k(){ return ez()/(ZH*(-ZL)); }
    var NAMES=['CARA','ln x','ln(x − 20)','IARA'], CLS=['mi6-k','mi6-g','mi6-bl','mi6-or'], DC=['mi6-dk','mi6-dg','mi6-db','mi6-do'];
    var AF=[function(){ return Math.log(p*ZH/((1-p)*(-ZL)))/(RC*(ZH-ZL)); },
            function(x){ return k()*x; },
            function(x){ return k()*(x-SH); },
            function(x){ return ez()*(1-2*BQ*x)/(2*BQ*ez2()); }];
    function putW(v){ w=clamp(Math.round(v),LO,HI); }
    function draw(){
      var a, b, j;
      W=measure(svg); frame(svg,W,H);
      P=panels(svg,W,{titles:['Amount a*','Share of wealth a* over w'],
        keys:[[['line','mi6-k','CARA r = 0.02'],['line','mi6-g','CRRA ln x'],['line','mi6-bl','ln(x − 20): r_R falls'],['line','mi6-or','IARA x − 0.002x²']],[]],
        minW:250, mL:42, mR:12, ph:190, foot:40});
      H=P.H; a=P.P[0]; b=P.P[1];
      xa=scale(LO,HI,a.x0,a.x1); xb=scale(LO,HI,b.x0,b.x1);
      el.g=S('g',null,svg);
      el.ga=clip(svg,a.x0,a.top-4,a.x1-a.x0+4,a.bot-a.top+4);
      el.gb=clip(svg,b.x0,b.top-4,b.x1-b.x0+4,b.bot-b.top+4);
      el.ca=[]; el.cb=[]; el.da=[]; el.db=[];
      for(j=0;j<4;j++){ el.ca.push(S('path',{'class':CLS[j]},el.ga)); el.cb.push(S('path',{'class':CLS[j]},el.gb)); }
      el.guide=[line(svg,0,0,0,0,'nf-guide'),line(svg,0,0,0,0,'nf-guide')];
      for(j=0;j<4;j++){ el.da.push(dot(svg,0,0,DC[j])); el.db.push(dot(svg,0,0,DC[j])); }
      hs=[handle(svg,'mi6-kx','Wealth w, arrow keys move it',function(dx,dy,big){ putW(w+(dx||dy)*(big?10:1)); update(); }),
          handle(svg,'mi6-kx','Wealth w, arrow keys move it',function(dx,dy,big){ putW(w+(dx||dy)*(big?10:1)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var a=P.P[0], b=P.P[1], g=el.g, j, i, t, amax=0, smax, tk, tk2, xt, av=[], sv=[], s;
      for(j=0;j<4;j++) for(i=0;i<=40;i++){ t=LO+(HI-LO)*i/40; amax=Math.max(amax,AF[j](t)); }
      amax*=1.08; tk=ticks(0,amax,4); amax=Math.max(amax,tk.t[tk.t.length-1]);
      smax=Math.max(1,1.6*k()); tk2=ticks(0,smax,4); smax=Math.max(smax,tk2.t[tk2.t.length-1]);
      ya=scale(0,amax,a.bot,a.top); yb=scale(0,smax,b.bot,b.top);
      clear(g);
      xt=(a.x1-a.x0)>=330?[50,100,150,200]:[50,100,150,200];
      axes(g,xa,ya,xt,tk.t,0,dec(tk.s)); axes(g,xb,yb,xt,tk2.t,0,dec(tk2.s));
      names(g,a,'wealth w','a*'); names(g,b,'wealth w','');
      for(j=0;j<4;j++){
        el.ca[j].setAttribute('d',path(AF[j],LO,HI,120,xa,ya));
        el.cb[j].setAttribute('d',path((function(f){ return function(x){ return f(x)/x; }; })(AF[j]),LO,HI,160,xb,yb));
        av.push(AF[j](w)); sv.push(AF[j](w)/w);
        at(el.da[j],xa(w),ya(av[j])); at(el.db[j],xb(w),yb(sv[j]));
        el.da[j].setAttribute('r',av[j]>amax*1.02||av[j]<0?0:4); el.db[j].setAttribute('r',sv[j]>smax*1.02||sv[j]<0?0:4);
      }
      setLine(el.guide[0],xa(w),a.bot,xa(w),a.top); setLine(el.guide[1],xb(w),b.bot,xb(w),b.top);
      place(hs[0],xa(w),a.bot,w,'wealth '+w); place(hs[1],xb(w),b.bot,w,'wealth '+w);
      cur={p:p, ez:ez(), w:w, cara:av[0], log:av[1], shift:av[2], quad:av[3], scara:sv[0], slog:sv[1], sshift:sv[2], squad:sv[3]};
      if(!out) return;
      s='z = +0.5 with probability '+fmt(p,2)+', '+MINUS+'0.3 otherwise: E[z] = '+fmt(ez(),3)+' > 0, so every agent buys some';
      s+='\nw = '+w+':   a* ';
      for(j=0;j<4;j++) s+=(j?', ':'')+NAMES[j]+' '+fmt(av[j],1);
      s+='\nshare a* over w: ';
      for(j=0;j<4;j++) s+=(j?', ':'')+NAMES[j]+' '+fmt(sv[j],2);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xa(w),P.P[0].bot],[xb(w),P.P[1].bot]]; },
      function(i,x){ putW(i?xb.inv(x):xa.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(st){
        if('p' in st && rp) rp.set(+st.p);
        if('w' in st){ putW(+st.w); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
