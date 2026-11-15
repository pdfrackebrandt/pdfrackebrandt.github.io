/* Core Micro L8 figures: the Edgeworth box, offer curves and excess demand with Walras' law, Robinson Crusoe,
   Stolper Samuelson, and the small open economy (diversification cone, Rybczynski, balanced trade).
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from /assets/figs/mi8.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      press=NF.press, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); return b; }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function add(out,s){ out.appendChild(document.createTextNode(s)); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function show(e,on){ if(on) e.removeAttribute('visibility'); else e.setAttribute('visibility','hidden'); }
  /* a slider that only matters in some views is dimmed and disabled in the others */
  function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function pct(v){ var s=Math.abs(100*v).toFixed(1); return (parseFloat(s)===0?'':v>0?'+':MINUS)+s+'%'; }
  function sgn(v,d){ var s=Math.abs(v).toFixed(d); return (parseFloat(s)===0?'':v>0?'+':MINUS)+s; }
  function scale(d0,d1,r0,r1){ var f=lin(d0,d1,r0,r1); f.r0=r0; f.r1=r1; return f; }
  function steps(lo,hi,s){ var t=[], v; for(v=Math.ceil(lo/s-1e-9)*s;v<=hi+1e-9;v+=s) t.push(Math.round(v/s)*s); return t; }
  /* a slider the figure can also move itself, without hearing its own callback */
  function slider(fig,k,d,cb){
    var quiet=false, r=range(fig,k,d,function(v){ if(!quiet) cb(v); });
    if(r) r.show=function(v){ quiet=true; r.set(v); quiet=false; };
    return r;
  }
  /* name with a lowered small index, as svg text */
  function sub(g,name,s,cls){
    var t=S('text',{'class':cls||''},g), sp;
    t.appendChild(document.createTextNode(name));
    sp=S('tspan',{dy:'3','class':'nf-sub'},t); sp.textContent=s;
    return t;
  }
  /* arrow with a filled head; gap trims both ends so it stops short of the dots it joins */
  function arrow(g,cls){ return {l:line(g,0,0,0,0,'mi8-arr '+cls), h:S('path',{'class':'mi8-arrh '+cls},g)}; }
  function setArrow(v,x0,y0,x1,y1,gap){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, bx, by;
    gap=gap||0;
    if(!(len>=2*gap+12)){ v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len; x0+=ux*gap; y0+=uy*gap; x1-=ux*gap; y1-=uy*gap;
    bx=x1-ux*8; by=y1-uy*8;
    setLine(v.l,x0,y0,bx+ux*1.5,by+uy*1.5);
    v.h.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  /* a parametric curve t -> [x, y] in data units as one path; points far outside are pulled in so paths stay sane */
  function cpath(F,fn,t0,t1,n,lg){
    var d='', run=[], i, t, q, M=1e4;
    for(i=0;i<=n;i++){
      t=lg?t0*Math.pow(t1/t0,i/n):t0+(t1-t0)*i/n;
      q=fn(t);
      if(q && isFinite(q[0]) && isFinite(q[1])) run.push([clamp(F.sx(q[0]),-M,M),clamp(F.sy(q[1]),-M,M)]);
      else { if(run.length>1) d+=poly(run); run=[]; }
    }
    if(run.length>1) d+=poly(run);
    return d;
  }
  function fpath(F,f,a,b,n,lg){ return cpath(F,function(x){ return [x,f(x)]; },a,b,n,lg); }
  function ppath(F,list){ return poly(list.map(function(q){ return [F.sx(q[0]),F.sy(q[1])]; })); }
  /* the region where lo(x) < hi(x) inside (a, b), one interval, as a closed path; its two tips found by bisection */
  function between(F,lo,hi,a,b,n){
    var i, x, l=-1, r=-1, top=[], bot=[], xl, xr, dx=(b-a)/n;
    function g(x){ return hi(x)-lo(x); }
    function cross(u,v){ var k, m, su=g(u)>1e-9; for(k=0;k<44;k++){ m=(u+v)/2; if((g(m)>1e-9)===su) u=m; else v=m; } return (u+v)/2; }
    for(i=1;i<n;i++){ x=a+i*dx; if(g(x)>1e-9){ if(l<0) l=i; r=i; } }
    if(l<0 || r-l<1) return '';
    xl=l>1?cross(a+(l-1)*dx,a+l*dx):a+l*dx;
    xr=r<n-1?cross(a+r*dx,a+(r+1)*dx):a+r*dx;
    top.push([xl,lo(xl)]); bot.push([xl,lo(xl)]);
    for(i=l;i<=r;i++){ x=a+i*dx; top.push([x,hi(x)]); bot.push([x,lo(x)]); }
    top.push([xr,lo(xr)]);
    return ppath(F,top.concat(bot.reverse()))+'Z';
  }
  /* a plot: grid, tick labels and axis names; F.sx and F.sy map data to svg units, F.gc clips to the plot */
  function panel(svg,o){
    var g=S('g',null,svg), sx=scale(o.X[0],o.X[1],o.x,o.x+o.w), sy=scale(o.Y[0],o.Y[1],o.y+o.h,o.y), i, v, f;
    f=o.yf||tl;
    for(i=0;i<o.yt.length;i++){ v=o.yt[i]; line(g,o.x,C(sy(v)),o.x+o.w,C(sy(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,o.x-6,sy(v)+4,f(v),null,'end'); }
    f=o.xf||tl;
    for(i=0;i<o.xt.length;i++){ v=o.xt[i]; line(g,C(sx(v)),o.y,C(sx(v)),o.y+o.h,Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,sx(v),o.y+o.h+15,f(v),null,'middle'); }
    line(g,o.x,C(o.y+o.h),o.x+o.w,C(o.y+o.h),'nf-ax');
    line(g,C(o.x),o.y,C(o.x),o.y+o.h,'nf-ax');
    if(o.xn) text(g,o.x+o.w+7,o.y+o.h+4,o.xn,'nf-title mi8-it','start');
    if(o.yn) text(g,o.x,o.y-9,o.yn,'nf-title mi8-it','middle');
    return {sx:sx, sy:sy, x:o.x, y:o.y, w:o.w, h:o.h, X:o.X, Y:o.Y, g:g, gc:clip(svg,o.x,o.y,o.w,o.h), pc:clip(svg,o.x-8,o.y-8,o.w+16,o.h+16)};
  }
  /* the Edgeworth box [0, 8] x [0, 6] with equal units: a's numbers bottom and left, b's top and right */
  function edgeBox(svg,x0,top,bw){
    var u=bw/8, bh=6*u, g=S('g',null,svg), v, t;
    function sx(v){ return x0+v*u; }
    function sy(v){ return top+bh-v*u; }
    sx.inv=function(p){ return (p-x0)/u; };
    sy.inv=function(p){ return (top+bh-p)/u; };
    for(v=2;v<8;v+=2) line(g,C(sx(v)),top,C(sx(v)),top+bh,'nf-grid');
    for(v=2;v<6;v+=2) line(g,x0,C(sy(v)),x0+bw,C(sy(v)),'nf-grid');
    for(v=2;v<=8;v+=2) text(g,sx(v),top+bh+15,tl(v),null,'middle');
    for(v=2;v<=6;v+=2) text(g,x0-6,sy(v)+4,tl(v),null,'end');
    for(v=0;v<8;v+=2) text(g,sx(v),top-6,tl(8-v),'mi8-tbf','middle');
    for(v=0;v<6;v+=2) text(g,x0+bw+6,sy(v)+4,tl(6-v),'mi8-tbf','start');
    S('rect',{x:R(x0),y:R(top),width:R(bw),height:R(bh),'class':'mi8-frame'},g);
    t=sub(g,'O','a','nf-title mi8-it mi8-ta'); moveTo(t,x0-4,top+bh+16); t.setAttribute('text-anchor','end');
    t=sub(g,'O','b','nf-title mi8-it mi8-tb'); moveTo(t,x0+bw+4,top-6);
    text(g,x0+bw/2,top+bh+31,'good 1','nf-title','middle');
    t=text(g,0,0,'good 2','nf-title','middle'); t.setAttribute('transform','translate('+R(x0-27)+','+R(top+bh/2)+') rotate(-90)');
    return {sx:sx, sy:sy, x:x0, y:top, w:bw, h:bh, u:u, gc:clip(svg,x0,top,bw,bh), pc:clip(svg,x0-9,top-9,bw+18,bh+18)};
  }
  /* a focusable round handle, moved by dragging or the arrow keys (Shift for bigger steps) */
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
  function place(h,x,y,txt){ h.setAttribute('transform','translate('+R(x)+','+R(y)+')'); h.setAttribute('aria-valuetext',txt); }
  /* drag whichever handle is nearest the pointer; pts() gives svg positions, move(i, x, y) takes the new one */
  function dragger(svg,size,pts,move){
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
  /* press and drag along a chart: box() gives its svg rectangle [x, y, w, h] (or null), set(x) takes the pointer's svg x */
  function slide(svg,size,box,set){
    var on=false;
    function inside(p){ var b=box(); return !!b && p[0]>=b[0]-8 && p[0]<=b[0]+b[2]+8 && p[1]>=b[1]-8 && p[1]<=b[1]+b[3]+8; }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]);
      if(!inside(p)) return;
      on=true; capture(svg,e); svg.classList.add('is-drag'); set(p[0]);
    });
    svg.addEventListener('pointermove',function(e){ if(!on) return; var s=size(); set(local(svg,e,s[0],s[1])[0]); });
    function stop(){ on=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
  }
  /* Example 1: u^a = ln x1 + 3 ln x2 from O_a, u^b = ln y1 + ln y2 from O_b, total endowment (8, 6) */
  var XB=8, YB=6, A1=0.25, B1=0.5;
  function icA(c){ var k=Math.pow(c[0],A1)*Math.pow(c[1],1-A1); return function(x){ return x>0?Math.pow(k/Math.pow(x,A1),1/(1-A1)):Infinity; }; }
  function icB(c){ var k=Math.pow(XB-c[0],B1)*Math.pow(YB-c[1],1-B1); return function(x){ var y1=XB-x; return y1>0?YB-Math.pow(k/Math.pow(y1,B1),1/(1-B1)):-Infinity; }; }
  function icApath(F,c){ var f=icA(c); return cpath(F,function(t){ return [t,f(t)]; },0.01,XB,240,true); }
  function icBpath(F,c){ var f=icB(c); return cpath(F,function(t){ return [XB-t,f(XB-t)]; },0.01,XB,240,true); }
  /* MRS^a = x2/(3x1) equals MRS^b = (6 - x2)/(8 - x1) */
  function contract(x){ return 9*x/(4+x); }
  function ua(x){ return Math.log(x[0])+3*Math.log(x[1]); }
  function ub(y){ return Math.log(y[0])+Math.log(y[1]); }

  /* ---------- 1. The Edgeworth box ---------- */
  NF.register('mi8-box',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=380, B=null, el={}, api=null, st={w1:4, w2:2, p:0.5, eq:true};
    var rp=slider(fig,'p',2,function(v){ st.p=v; st.eq=false; update(); });
    function pstar(){ return (A1*st.w2+B1*(YB-st.w2))/(XB-A1*st.w1-B1*(XB-st.w1)); }
    function solve(){
      var p=st.eq?pstar():st.p, ma=p*st.w1+st.w2, mb=p*(XB-st.w1)+(YB-st.w2), xa=[A1*ma/p,(1-A1)*ma], xb=[B1*mb/p,(1-B1)*mb];
      return {p:p, xa:xa, xb:xb, bb:[XB-xb[0],YB-xb[1]], z1:xa[0]+xb[0]-XB, z2:xa[1]+xb[1]-YB};
    }
    function eqAlloc(){ var p=pstar(), ma=p*st.w1+st.w2; return [A1*ma/p,(1-A1)*ma]; }
    function moveW(a,b){
      st.w1=clamp(Math.round(a*100)/100,0.3,7.7); st.w2=clamp(Math.round(b*100)/100,0.3,5.7);
      if(st.eq && rp) rp.show(pstar());
      update();
    }
    function draw(){
      W=measure(svg);
      var bw=Math.min(W-68,440), x0=Math.round((W-bw-68)/2)+41, top=30;
      H=Math.round(top+0.75*bw+40); frame(svg,W,H);
      B=edgeBox(svg,x0,top,bw);
      el.lens=S('path',{'class':'mi8-lens'},B.gc);
      el.cc=S('path',{'class':'mi8-cc',d:fpath(B,contract,0,XB,160)},B.gc);
      el.wa=S('path',{'class':'mi8-a mi8-thin'},B.gc);
      el.wb=S('path',{'class':'mi8-b mi8-thin'},B.gc);
      el.ia=S('path',{'class':'mi8-a'},B.gc);
      el.ib=S('path',{'class':'mi8-b'},B.gc);
      el.bud=line(B.gc,0,0,0,0,'mi8-bud');
      el.z=arrow(B.pc,'mi8-k');
      el.E=S('circle',{r:7,'class':'mi8-ring'},B.pc);
      el.xa=S('circle',{r:5,'class':'mi8-da'},B.pc);
      el.xb=S('circle',{r:5,'class':'mi8-db'},B.pc);
      el.la=text(B.pc,0,0,'xᵃ','mi8-ta mi8-it nf-halo');
      el.lb=text(B.pc,0,0,'xᵇ','mi8-tb mi8-it nf-halo');
      el.lE=text(svg,0,0,'E','mi8-te mi8-it nf-halo');
      el.lw=text(svg,0,0,'ω','mi8-tw mi8-it nf-halo');
      el.h=handle(svg,'mi8-kw','endowment ω, drag it or use the arrow keys',function(dx,dy,big){ var s=big?0.5:0.1; moveW(st.w1+dx*s,st.w2+dy*s); });
      update();
    }
    function update(){
      if(!B) return;
      var s=solve(), w=[st.w1,st.w2], E=eqAlloc(), ps=pstar(), p=s.p, clear=Math.abs(s.z1)<1e-9, pa, pb, t, inA, inB;
      el.lens.setAttribute('d',between(B,icA(w),icB(w),0,XB,400));
      el.wa.setAttribute('d',icApath(B,w));
      el.wb.setAttribute('d',icBpath(B,w));
      el.ia.setAttribute('d',icApath(B,s.xa));
      el.ib.setAttribute('d',s.bb[0]<XB && s.bb[1]<YB?icBpath(B,s.bb):'');
      setLine(el.bud,B.sx(0),B.sy(st.w2+p*st.w1),B.sx(XB),B.sy(st.w2+p*(st.w1-XB)));
      pa=[B.sx(s.xa[0]),B.sy(s.xa[1])]; pb=[B.sx(s.bb[0]),B.sy(s.bb[1])];
      at(el.xa,pa[0],pa[1]); at(el.xb,pb[0],pb[1]);
      setArrow(el.z,pb[0],pb[1],pa[0],pa[1],6);
      at(el.E,B.sx(E[0]),B.sy(E[1]));
      moveTo(el.lE,B.sx(E[0])-16,B.sy(E[1])-9);
      show(el.la,!clear); show(el.lb,!clear);
      moveTo(el.la,pa[0]+8,pa[1]-8); moveTo(el.lb,pb[0]-15,pb[1]+17);
      moveTo(el.lw,B.sx(st.w1)+10,B.sy(st.w2)+17);
      place(el.h,B.sx(st.w1),B.sy(st.w2),'ω = '+pair(st.w1,st.w2,2));
      if(api) api.changed();
      if(!out) return;
      inA=s.xa[0]<=XB && s.xa[1]<=YB; inB=s.xb[0]<=XB && s.xb[1]<=YB;
      out.textContent='ωᵃ = '+pair(st.w1,st.w2,2)+', ωᵇ = '+pair(XB-st.w1,YB-st.w2,2)+';  p = '+p.toFixed(3)+'\n'+
        'xᵃ(p) = '+pair(s.xa[0],s.xa[1],2)+', xᵇ(p) = '+pair(s.xb[0],s.xb[1],2)+'\n';
      if(clear) add(out,'z = (0.00, 0.00): both markets clear at p* = '+ps.toFixed(3)+', and E lies on the contract curve\n');
      else {
        t='z = '+pair(s.z1,s.z2,2)+', p z₁ + z₂ = '+fmt(p*s.z1+s.z2,2)+': ';
        t+=s.z1>0?'good 1 is short, so p must rise to p* = ':'good 1 is in excess supply, so p must fall to p* = ';
        add(out,t+ps.toFixed(3)+'\n');
      }
      if(!inA || !inB) warn(out,(inA?'xᵇ(p) lies':inB?'xᵃ(p) lies':'both demands lie')+' outside the box: not feasible together\n');
      add(out,'at E = '+pair(E[0],E[1],2)+': uᵃ '+ua(w).toFixed(2)+' → '+ua(E).toFixed(2)+', uᵇ '+ub([XB-w[0],YB-w[1]]).toFixed(2)+' → '+ub([XB-E[0],YB-E[1]]).toFixed(2));
    }
    dragger(svg,function(){ return [W,H]; },function(){ return B?[[B.sx(st.w1),B.sy(st.w2)]]:[]; },function(i,x,y){ moveW(B.sx.inv(x),B.sy.inv(y)); });
    onClick(fig,'.mi8-clear',function(){ st.eq=true; if(rp) rp.show(pstar()); update(); });
    onClick(fig,'.nfig-reset',function(){ st.w1=4; st.w2=2; st.eq=true; if(rp) rp.show(pstar()); update(); });
    /* state for Try it steps: endowment, price, excess demand; set takes w1, w2, p (or eq=1 for the clearing price) */
    api=NF.api({
      get:function(){ var s=solve(); return {w1:st.w1, w2:st.w2, p:s.p, pstar:pstar(), z1:s.z1, z2:s.z2, xa1:s.xa[0], xa2:s.xa[1], xb1:s.xb[0], xb2:s.xb[1], clear:Math.abs(s.z1)<1e-9?'yes':'no'}; },
      set:function(o){
        if('w1' in o || 'w2' in o){ st.w1=clamp(+('w1' in o?o.w1:st.w1),0.3,7.7); st.w2=clamp(+('w2' in o?o.w2:st.w2),0.3,5.7); }
        if('p' in o && rp){ rp.show(+o.p); st.p=rp.v(); st.eq=false; }
        if(o.eq){ st.eq=true; if(rp) rp.show(pstar()); }
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Offer curves, excess demand and Walras' law ---------- */
  NF.register('mi8-excess',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=480, B=null, F=null, el={}, api=null, st={p:1}, P0=0.1, P1=1.5;
    var rp=slider(fig,'p',2,function(v){ st.p=v; update(); });
    if(rp) st.p=rp.v();
    var mode=seg(fig,'data-mode',function(v){ if(v===mode) return; mode=v; draw(); });
    if(mode!=='z' && mode!=='walras') mode='z';
    function xa(p){ return [1+1/(2*p),3*p+1.5]; }
    function bb(p){ return [6-2/p,4-2*p]; }
    function z1(p){ return 2.5/p-5; }
    function z2(p){ return 5*p-2.5; }
    function draw(){
      W=measure(svg);
      var side=W>=560, bw, x0, top=30, cx, cy, cw, ch, Y;
      if(side){ bw=Math.min(Math.round(W*0.5)-68,280); x0=41; cx=x0+bw+26+44; cw=W-cx-30; cy=top; ch=Math.round(0.75*bw); H=top+ch+40; }
      else { bw=Math.min(W-68,340); x0=Math.round((W-bw-68)/2)+41; cx=44; cw=W-44-30; cy=Math.round(top+0.75*bw+40+26); ch=Math.min(200,Math.round(cw*0.62)); H=cy+ch+26; }
      frame(svg,W,H);
      B=edgeBox(svg,x0,top,bw);
      el.oa=S('path',{'class':'mi8-a',d:cpath(B,xa,0.02,60,320,true)},B.gc);
      el.ob=S('path',{'class':'mi8-b',d:cpath(B,bb,0.02,60,320,true)},B.gc);
      el.bud=line(B.gc,0,0,0,0,'mi8-bud');
      S('circle',{r:7,cx:R(B.sx(2)),cy:R(B.sy(3)),'class':'mi8-ring'},B.pc);
      text(B.pc,B.sx(2)-15,B.sy(3)-9,'E','mi8-te mi8-it nf-halo');
      S('circle',{r:5,cx:R(B.sx(4)),cy:R(B.sy(2)),'class':'mi8-dw'},B.pc);
      text(B.pc,B.sx(4)+8,B.sy(2)+16,'ω','mi8-tw mi8-it nf-halo');
      text(B.pc,B.sx(1.42)+7,B.sy(5.3),'xᵃ(p)','mi8-ta mi8-it nf-halo','start');
      text(B.pc,B.sx(0.12),B.sy(3.62),'ω̄ − xᵇ(p)','mi8-tb mi8-it nf-halo','start');
      el.xa=S('circle',{r:5,'class':'mi8-da'},B.pc);
      el.xb=S('circle',{r:5,'class':'mi8-db'},B.pc);
      Y=mode==='z'?[-5,7.5]:[-5,5];
      F=panel(svg,{x:cx, y:cy, w:cw, h:ch, X:[P0,P1], Y:Y, xt:steps(0.25,1.5,cw>=300?0.25:0.5), yt:steps(Y[0],Y[1],2.5), xn:'p', yn:mode==='z'?'z':'', yf:function(v){ return fmt(v,v%1?1:0); }});
      line(F.g,C(F.sx(0.5)),F.y,C(F.sx(0.5)),F.y+F.h,'mi8-ref');
      text(F.g,F.sx(0.5)+5,F.y+F.h-6,'p* = 0.5','nf-lab mi8-it','start');
      if(mode==='z'){
        S('path',{'class':'mi8-a',d:fpath(F,z1,P0,P1,240,true)},F.gc);
        S('path',{'class':'mi8-b',d:fpath(F,z2,P0,P1,60)},F.gc);
        text(F.g,F.sx(P1)+4,F.sy(z1(P1))+4,'z₁','mi8-ta mi8-it','start');
        text(F.g,F.sx(P1)+4,F.sy(z2(P1))+4,'z₂','mi8-tb mi8-it','start');
      } else {
        S('path',{'class':'mi8-zero',d:ppath(F,[[P0,0],[P1,0]])},F.gc);
        S('path',{'class':'mi8-a',d:fpath(F,function(p){ return p*z1(p); },P0,P1,60)},F.gc);
        S('path',{'class':'mi8-b',d:fpath(F,z2,P0,P1,60)},F.gc);
        el.top=[F.sx(P1)-4,F.sy(P1*z1(P1))-8,F.sx(P1)-4,F.sy(z2(P1))+16,F.sx(P1)-4,F.sy(0)-7];
      }
      el.g=line(F.g,0,0,0,0,'mi8-guide');
      el.d1=S('circle',{r:4.5,'class':'mi8-da'},F.pc);
      el.d2=S('circle',{r:4.5,'class':'mi8-db'},F.pc);
      if(mode==='walras'){
        text(svg,el.top[0],el.top[1],'p z₁','mi8-ta mi8-it nf-halo','end');
        text(svg,el.top[2],el.top[3],'z₂','mi8-tb mi8-it nf-halo','end');
        text(svg,el.top[4],el.top[5],'p z₁ + z₂ = 0','mi8-tr mi8-it nf-halo','end');
      }
      update();
    }
    function update(){
      if(!F) return;
      var p=st.p, a=xa(p), b=bb(p), u=z1(p), v=z2(p), px=F.sx(p), t;
      setLine(el.bud,B.sx(0),B.sy(2+4*p),B.sx(XB),B.sy(2+p*(4-XB)));
      at(el.xa,B.sx(a[0]),B.sy(a[1])); at(el.xb,B.sx(b[0]),B.sy(b[1]));
      setLine(el.g,px,F.y,px,F.y+F.h);
      at(el.d1,px,F.sy(mode==='z'?u:p*u)); at(el.d2,px,F.sy(v));
      if(api) api.changed();
      if(!out) return;
      out.textContent='p = '+p.toFixed(2)+': xᵃ(p) = '+pair(a[0],a[1],2)+', ω̄ − xᵇ(p) = '+pair(b[0],b[1],2)+'\n'+
        'z₁ = '+fmt(u,2)+', z₂ = '+fmt(v,2)+';  p z₁ = '+fmt(p*u,2)+', so p z₁ + z₂ = '+fmt(p*u+v,2)+'\n';
      if(Math.abs(p-0.5)<1e-9) t='p = p*: both markets clear and the offer curves cross at E = (2, 3)';
      else t=(u>0?'good 1 is short: p rises':'good 1 is in excess supply: p falls')+' toward p* = 0.5, the only zero of z₁';
      if(Math.abs(p-1)<1e-9) t+='\nb demands its own endowment here: p = MRSᵇ(ω) = 1';
      else if(Math.abs(p-1/6)<0.006) t+='\na demands about its own endowment here: MRSᵃ(ω) = 0.167';
      add(out,t);
    }
    slide(svg,function(){ return [W,H]; },function(){ return F?[F.x,F.y,F.w,F.h]:null; },function(x){
      var p=clamp(Math.round(F.sx.inv(x)*100)/100,P0,P1);
      if(rp) rp.set(p); else { st.p=p; update(); }
    });
    api=NF.api({
      get:function(){ var p=st.p; return {p:p, z1:z1(p), z2:z2(p), pz1:p*z1(p), walras:p*z1(p)+z2(p), mode:mode}; },
      set:function(o){ if('mode' in o) press(fig,'data-mode',o.mode); if('p' in o && rp) rp.set(+o.p); update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Robinson Crusoe ---------- */
  NF.register('mi8-crusoe',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=320, F=null, el={}, api=null, st={a:0.5, b:2, rho:Math.sqrt(3), eq:true};
    var ra=slider(fig,'alpha',2,function(v){ st.a=v; update(); }),
        rb=slider(fig,'beta',1,function(v){ st.b=v; if(mode==='crs') draw(); }),
        rr=slider(fig,'rho',2,function(v){ st.rho=v; st.eq=false; update(); });
    if(ra) st.a=ra.v();
    if(rb) st.b=rb.v();
    var mode=seg(fig,'data-mode',function(v){ if(v===mode) return; mode=v; controls(); draw(); });
    if(mode!=='crs' && mode!=='drs' && mode!=='alpha') mode='drs';
    var clr=onClick(fig,'.mi8-clear',function(){ st.eq=true; if(rr) rr.show(rstar()); update(); });
    function rstar(){ return Math.sqrt((2-st.a)/st.a); }
    function rho(){ return st.eq?rstar():st.rho; }
    function controls(){ lock(rb,mode!=='crs'); lock(rr,mode!=='drs'); if(clr) clr.disabled=mode!=='drs'; }
    /* DRS, f(t) = 2 sqrt t, at real wage w/p = rho: the firm's plan and Crusoe's choice on the same price line */
    function drs(){
      var r=rho(), a=st.a, tf=1/(r*r), xf=2/r, pi=1/r, inc=r+pi, tc=(1-a)*inc/r, xc=a*inc, corner=false;
      if(tc>1){ tc=1; xc=pi; corner=true; }
      return {r:r, tf:tf, xf:xf, pi:pi, tc:tc, xc:xc, corner:corner, ls:1-tc, gap:tf-(1-tc), gx:xc-xf};
    }
    function eqs(a){ return {tf:a/(2-a), tc:2*(1-a)/(2-a), x:2*Math.sqrt(a/(2-a)), r:Math.sqrt((2-a)/a)}; }
    function draw(){
      W=measure(svg);
      var pw=Math.min(W-44-40,460), ph=Math.round(clamp(pw*0.6,200,280)), x0=Math.round((W-pw-84)/2)+44, top=26, Y, yt, g;
      H=top+ph+28; frame(svg,W,H);
      if(mode==='alpha'){
        F=panel(svg,{x:x0, y:top, w:pw, h:ph, X:[0,1], Y:[0,2.1], xt:steps(0,1,pw>=300?0.25:0.5), yt:steps(0,2,0.5), xn:'α', yf:function(v){ return fmt(v,1); }, xf:function(v){ return fmt(v,2); }});
        S('path',{'class':'mi8-r',d:fpath(F,function(a){ return eqs(a).tf; },0.001,0.999,200)},F.gc);
        S('path',{'class':'mi8-a',d:fpath(F,function(a){ return eqs(a).tc; },0.001,0.999,200)},F.gc);
        S('path',{'class':'mi8-b',d:fpath(F,function(a){ return eqs(a).x; },0.0005,0.999,300,true)},F.gc);
        text(F.g,F.sx(1)+5,F.sy(1)+4,'tᶠ*','mi8-tr mi8-it','start');
        text(F.g,F.sx(1)+5,F.sy(0)-9,'tᶜ*','mi8-ta mi8-it','start');
        text(F.g,F.sx(1)+5,F.sy(2)+4,'x*','mi8-tb mi8-it','start');
        el.g=line(F.g,0,0,0,0,'mi8-guide');
        el.d=[S('circle',{r:4.5,'class':'mi8-dr'},F.pc),S('circle',{r:4.5,'class':'mi8-da'},F.pc),S('circle',{r:4.5,'class':'mi8-db'},F.pc)];
        controls(); update(); return;
      }
      Y=mode==='crs'?Math.max(2.2,1.15*st.b):2.6; yt=steps(0,Y,Y>3?1:0.5);
      F=panel(svg,{x:x0, y:top, w:pw, h:ph, X:[0,1], Y:[0,Y], xt:steps(0,1,pw>=300?0.25:0.5), yt:yt, xn:'tᶜ', yn:'x', yf:function(v){ return fmt(v,v%1?1:0); }, xf:function(v){ return fmt(v,2); }});
      g=F.gc;
      el.ps=S('path',{'class':'mi8-ps'},g);
      el.fr=S('path',{'class':'mi8-b'},g);
      el.ic=S('path',{'class':'mi8-a'},g);
      el.bud=line(g,0,0,0,0,'mi8-bud');
      el.gap=line(F.pc,0,0,0,0,'mi8-idle');
      el.g1=line(g,0,0,0,0,'mi8-ref'); el.g2=line(g,0,0,0,0,'mi8-ref');
      el.pi=S('circle',{r:4.5,'class':'mi8-dw'},F.pc);
      el.lpi=text(svg,0,0,'π/p','mi8-tw mi8-it','start');
      el.df=S('circle',{r:5,'class':'mi8-db'},F.pc);
      el.dc=S('circle',{r:5,'class':'mi8-da'},F.pc);
      el.E=S('circle',{r:5.5,'class':'mi8-de'},F.pc);
      el.lf=text(svg,0,0,'firm','mi8-tb nf-halo');
      el.lc=text(svg,0,0,'Crusoe','mi8-ta nf-halo','end');
      el.lE=text(svg,0,0,'E','mi8-te mi8-it nf-halo');
      controls(); update();
    }
    function ic(t0,x0){ var a=st.a; return cpath(F,function(t){ return [t,x0*Math.pow(t0/t,(1-a)/a)]; },0.005,1.2,240,true); }
    function update(){
      if(!F) return;
      var a=st.a, b=st.b, s, e, px, i, fr=[], t, clear;
      if(mode==='alpha'){
        e=eqs(a); px=F.sx(a);
        setLine(el.g,px,F.y,px,F.y+F.h);
        at(el.d[0],px,F.sy(e.tf)); at(el.d[1],px,F.sy(e.tc)); at(el.d[2],px,F.sy(e.x));
        if(api) api.changed();
        if(out) out.textContent='DRS, α = '+a.toFixed(2)+': tᶠ* = '+e.tf.toFixed(3)+', tᶜ* = '+e.tc.toFixed(3)+', x* = '+e.x.toFixed(3)+'\n'+
          'w*/p* = '+e.r.toFixed(3)+', π*/p* = '+(1/e.r).toFixed(3)+';  tᶜ* + tᶠ* = 1\n'+
          'a stronger taste for the good means more work, more output and a lower real wage';
        return;
      }
      if(mode==='crs'){
        el.ps.setAttribute('d',ppath(F,[[0,0],[0,b],[1,0]])+'Z');
        el.fr.setAttribute('d',ppath(F,[[0,b],[1,0]]));
        setLine(el.bud,F.sx(0),F.sy(b),F.sx(1),F.sy(0));
        el.bud.setAttribute('class','mi8-bud mi8-budd');
        el.ic.setAttribute('d',ic(1-a,a*b));
        at(el.E,F.sx(1-a),F.sy(a*b)); moveTo(el.lE,F.sx(1-a)+9,F.sy(a*b)-9);
        setLine(el.g1,F.sx(1-a),F.sy(a*b),F.sx(1-a),F.sy(0)); setLine(el.g2,F.sx(0),F.sy(a*b),F.sx(1-a),F.sy(a*b));
        [el.pi,el.lpi,el.df,el.dc,el.lf,el.lc,el.gap].forEach(function(x){ show(x,false); });
        show(el.E,true); show(el.lE,true);
        if(rr) rr.show(b);
        if(api) api.changed();
        if(out) out.textContent='CRS, f(t) = '+b.toFixed(1)+'t, α = '+a.toFixed(2)+': w/p = β = '+b.toFixed(2)+' and π = 0\n'+
          'E: tᶜ = 1 − α = '+(1-a).toFixed(2)+', tᶠ = α = '+a.toFixed(2)+', x = αβ = '+(a*b).toFixed(2)+'\n'+
          'at w/p > β the firm shuts down; at w/p < β it wants unbounded output';
        return;
      }
      if(rr) rr.show(rho());
      s=drs(); clear=Math.abs(s.gap)<1e-9;
      for(i=0;i<=120;i++){ t=i/120; fr.push([t,2*Math.sqrt(1-t)]); }
      el.ps.setAttribute('d',ppath(F,[[0,0]].concat(fr))+'Z');
      el.fr.setAttribute('d',ppath(F,fr));
      el.bud.setAttribute('class','mi8-bud');
      setLine(el.bud,F.sx(0),F.sy(s.pi+s.r),F.sx(1),F.sy(s.pi));
      el.ic.setAttribute('d',ic(s.tc,s.xc));
      at(el.pi,F.sx(1),F.sy(s.pi)); moveTo(el.lpi,F.sx(1)+8,F.sy(s.pi)+4); show(el.pi,true); show(el.lpi,true);
      at(el.df,F.sx(1-s.tf),F.sy(s.xf)); at(el.dc,F.sx(s.tc),F.sy(s.xc));
      moveTo(el.lf,F.sx(1-s.tf)+(s.tf>0.5?9:-9),F.sy(s.xf)-10); el.lf.setAttribute('text-anchor',s.tf>0.5?'start':'end');
      moveTo(el.lc,F.sx(s.tc)-9,F.sy(s.xc)+18);
      show(el.df,!clear); show(el.dc,!clear); show(el.lf,!clear); show(el.lc,!clear);
      show(el.E,clear); show(el.lE,clear);
      at(el.E,F.sx(s.tc),F.sy(s.xc)); moveTo(el.lE,F.sx(s.tc)+9,F.sy(s.xc)-9);
      setLine(el.g1,F.sx(s.tc),F.sy(s.xc),F.sx(s.tc),F.sy(0)); setLine(el.g2,F.sx(0),F.sy(s.xc),F.sx(s.tc),F.sy(s.xc));
      show(el.gap,!clear); setLine(el.gap,F.sx(clamp(1-s.tf,0,1)),F.y+F.h,F.sx(s.tc),F.y+F.h);
      if(api) api.changed();
      if(!out) return;
      out.textContent='DRS, α = '+a.toFixed(2)+', w/p = '+s.r.toFixed(3)+(clear?' (clears the markets)':' (clearing value '+rstar().toFixed(3)+')')+'\n'+
        'firm: tᶠ = '+s.tf.toFixed(3)+', xᶠ = '+s.xf.toFixed(3)+', π/p = '+s.pi.toFixed(3)+'\n'+
        'Crusoe: tᶜ = '+s.tc.toFixed(3)+', xᶜ = '+s.xc.toFixed(3)+', labour supply '+s.ls.toFixed(3)+(s.corner?' (works not at all)':'')+'\n';
      if(clear) add(out,'labour demand = supply, so the goods market clears too: MRS = MRT = w/p');
      else {
        add(out,'labour '+(s.gap>0?'demand exceeds supply by ':'supply exceeds demand by ')+Math.abs(s.gap).toFixed(3)+', goods '+(s.gx>0?'short by ':'in surplus by ')+Math.abs(s.gx).toFixed(3)+'\n');
        add(out,'Walras: (xᶜ − xᶠ) + (w/p)(tᶜ + tᶠ − 1) = '+fmt(s.gx+s.r*s.gap,3)+';  '+(s.gap>0?'raise w/p':'lower w/p'));
        if(s.tf>1) warn(out,'\nthe firm wants more time than Crusoe has');
      }
    }
    slide(svg,function(){ return [W,H]; },function(){ return F && mode==='alpha'?[F.x,F.y,F.w,F.h]:null; },function(x){
      var a=clamp(Math.round(F.sx.inv(x)*100)/100,0.05,0.95);
      if(ra) ra.set(a); else { st.a=a; update(); }
    });
    api=NF.api({
      get:function(){ var s=drs(), e=eqs(st.a); return {mode:mode, alpha:st.a, beta:st.b, rho:s.r, rhostar:e.r, tf:s.tf, tc:s.tc, xf:s.xf, xc:s.xc, gap:s.gap, clear:Math.abs(s.gap)<1e-9?'yes':'no'}; },
      set:function(o){
        if('mode' in o) press(fig,'data-mode',o.mode);
        if('alpha' in o && ra) ra.set(+o.alpha);
        if('beta' in o && rb) rb.set(+o.beta);
        if('rho' in o && rr){ rr.show(+o.rho); st.rho=rr.v(); st.eq=false; }
        if(o.eq){ st.eq=true; if(rr) rr.show(rstar()); }
        update();
      }
    });
    if(rr) rr.show(rstar());
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Stolper Samuelson ---------- */
  NF.register('mi8-stolper',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=560, F=null, G=null, el={}, api=null, st={p1:5}, P2=4, LO=2, HI=8;
    var rp=slider(fig,'p1',2,function(v){ st.p1=v; update(); });
    if(rp) st.p1=rp.v();
    var ki=seg(fig,'data-int',function(v){ if(v===ki) return; ki=v; draw(); });
    if(ki!=='lab' && ki!=='cap') ki='lab';
    function tech(){ return ki==='cap'?{aL1:1,aK1:3,aL2:3,aK2:1}:{aL1:3,aK1:1,aL2:1,aK2:3}; }
    function wr(p1){ var t=tech(), D=t.aL1*t.aK2-t.aK1*t.aL2; return [(p1*t.aK2-P2*t.aK1)/D,(t.aL1*P2-t.aL2*p1)/D]; }
    /* the zero profit line aL w + aK r = c inside the plot, as two end points */
    function zp(aL,aK,c){
      var M=F.X[1], pts=[], q;
      q=[0,c/aK]; if(q[1]<=M) pts.push(q); else pts.push([(c-aK*M)/aL,M]);
      q=[c/aL,0]; if(q[0]<=M) pts.push(q); else pts.push([M,(c-aL*M)/aK]);
      return pts;
    }
    function draw(){
      W=measure(svg);
      var side=W>=560, s, x0=44, top=26, gx, gy, gw, gh, t=tech(), e, top2;
      if(side){ s=Math.min(Math.floor((W-44-56-40-34)/2),260); gx=x0+s+56+34; gy=top; gw=W-gx-44; gh=s; H=top+s+28; }
      else { s=Math.min(W-44-36,300); x0=Math.round((W-s-80)/2)+44; gx=44; gw=W-44-46; gy=top+s+50; gh=Math.min(200,Math.round(gw*0.66)); H=gy+gh+28; }
      frame(svg,W,H);
      F=panel(svg,{x:x0, y:top, w:s, h:s, X:[0,3], Y:[0,3], xt:steps(0,3,0.5), yt:steps(0,3,0.5), xn:'w', yn:'r', xf:function(v){ return fmt(v,1); }, yf:function(v){ return fmt(v,1); }});
      e=zp(t.aL1,t.aK1,4);
      S('path',{'class':'mi8-bud0',d:ppath(F,e)},F.gc);
      e=zp(t.aL2,t.aK2,P2);
      S('path',{'class':'mi8-a',d:ppath(F,e)},F.gc);
      el.lc2=text(F.g,0,0,'c₂ = 4','mi8-ta mi8-it nf-halo');
      el.c1=S('path',{'class':'mi8-bud'},F.gc);
      el.lc1=text(F.g,0,0,'','mi8-tw mi8-it nf-halo');
      el.ab=arrow(F.pc,'mi8-rd');
      S('circle',{r:5,cx:R(F.sx(1)),cy:R(F.sy(1)),'class':'mi8-ring0'},F.pc);
      el.lA=text(F.pc,F.sx(1)-9,F.sy(1)-9,'A','mi8-te mi8-it nf-halo','end');
      el.B=S('circle',{r:5,'class':'mi8-dr'},F.pc);
      el.lB=text(F.pc,0,0,'B','mi8-tr mi8-it nf-halo');
      /* the lines of c2 = 4 and of c1 = p1 carry their labels near the top of the plot */
      e=zp(t.aL2,t.aK2,P2);
      if(ki==='lab'){ moveTo(el.lc2,F.sx(e[1][0])-4,F.sy(e[1][1])+14); el.lc2.setAttribute('text-anchor','end'); }
      else { moveTo(el.lc2,F.sx(e[0][0])+6,F.sy(e[0][1])+12); el.lc2.setAttribute('text-anchor','start'); }
      top2=steps(-50,100,gw>=300?25:50);
      G=panel(svg,{x:gx, y:gy, w:gw, h:gh, X:[-50,100], Y:[-80,160], xt:top2, yt:steps(-80,160,40), xn:'p̂₁ %', yn:'%'});
      S('path',{'class':'mi8-lp',d:ppath(G,[[-50,-50],[100,100]])},G.gc);
      el.lw=S('path',{'class':'mi8-r'},G.gc);
      el.lr=S('path',{'class':'mi8-a'},G.gc);
      el.tw=text(G.g,0,0,'ŵ','mi8-tr mi8-it nf-halo','end');
      el.tr=text(G.g,0,0,'r̂','mi8-ta mi8-it nf-halo','end');
      text(G.g,G.sx(100)-4,G.sy(100)+16,'p̂₁','nf-lab mi8-it nf-halo','end');
      el.g=line(G.g,0,0,0,0,'mi8-guide');
      el.dw=S('circle',{r:4.5,'class':'mi8-dr'},G.pc);
      el.dp=S('circle',{r:4,'class':'mi8-de'},G.pc);
      el.dr=S('circle',{r:4.5,'class':'mi8-da'},G.pc);
      update();
    }
    function update(){
      if(!F) return;
      var t=tech(), p1=st.p1, B=wr(p1), ph=p1/4-1, wh=B[0]-1, rh=B[1]-1, e, mw, mr, items, order;
      e=zp(t.aL1,t.aK1,p1);
      el.c1.setAttribute('d',ppath(F,e));
      el.lc1.textContent='c₁ = '+fmt(p1,1);
      if(ki==='lab'){ moveTo(el.lc1,F.sx(e[0][0])+6,F.sy(e[0][1])+12); el.lc1.setAttribute('text-anchor','start'); }
      else { moveTo(el.lc1,F.sx(e[1][0])-4,F.sy(e[1][1])+14); el.lc1.setAttribute('text-anchor','end'); }
      at(el.B,F.sx(B[0]),F.sy(B[1]));
      moveTo(el.lB,F.sx(B[0])+9,F.sy(B[1])+(B[1]<1?16:-8));
      setArrow(el.ab,F.sx(1),F.sy(1),F.sx(B[0]),F.sy(B[1]),6);
      /* exact here: w and r are linear in p1, so the percentage changes are linear in p̂1; the slopes are the changes at p̂1 = 100% */
      mw=wr(8)[0]-1; mr=wr(8)[1]-1;
      el.lw.setAttribute('d',ppath(G,[[-50,-50*mw],[100,100*mw]]));
      el.lr.setAttribute('d',ppath(G,[[-50,-50*mr],[100,100*mr]]));
      moveTo(el.tw,G.sx(100)-4,G.sy(100*mw)+(mw>0?-7:16));
      moveTo(el.tr,G.sx(100)-4,G.sy(100*mr)+(mr>0?-7:16));
      setLine(el.g,G.sx(100*ph),G.y,G.sx(100*ph),G.y+G.h);
      at(el.dw,G.sx(100*ph),G.sy(100*wh)); at(el.dp,G.sx(100*ph),G.sy(100*ph)); at(el.dr,G.sx(100*ph),G.sy(100*rh));
      if(api) api.changed();
      if(!out) return;
      out.textContent='p₁ = '+p1.toFixed(2)+' (p̂₁ = '+pct(ph)+'), p₂ = 4: (w, r) = '+pair(B[0],B[1],3)+'\n';
      if(Math.abs(ph)<1e-9){ add(out,'point A: w = r = 1; move p₁ away from 4\n'); }
      else {
        items=[['ŵ',wh],['p̂₁',ph],['0',0],['r̂',rh]].sort(function(x,y){ return y[1]-x[1]; });
        order=items.map(function(x){ return x[0]; }).join(' > ');
        add(out,'ŵ = '+pct(wh)+', r̂ = '+pct(rh)+':  '+order+'\n');
        add(out,'w/p₁ '+pct(B[0]/p1*4-1)+', w/p₂ '+pct(wh)+';  r/p₁ '+pct(B[1]/p1*4-1)+', r/p₂ '+pct(rh)+'\n');
      }
      /* cost shares at A, where w = r = 1 and p = (4, 4) */
      add(out,'labour shares at A: '+(t.aL1/4).toFixed(2)+' in good 1, '+(t.aL2/4).toFixed(2)+' in good 2, so ŵ = '+
        fmt((t.aK2/4)/((t.aL1-t.aL2)/4),2)+' p̂₁ and r̂ = '+fmt(-(t.aL2/4)/((t.aL1-t.aL2)/4),2)+' p̂₁');
    }
    slide(svg,function(){ return [W,H]; },function(){ return G?[G.x,G.y,G.w,G.h]:null; },function(x){
      var p1=clamp(Math.round((1+G.sx.inv(x)/100)*4*10)/10,LO,HI);
      if(rp) rp.set(p1); else { st.p1=p1; update(); }
    });
    api=NF.api({
      get:function(){ var B=wr(st.p1); return {p1:st.p1, int:ki, w:B[0], r:B[1], what:B[0]-1, rhat:B[1]-1, phat:st.p1/4-1}; },
      set:function(o){ if('int' in o) press(fig,'data-int',o.int); if('p1' in o && rp) rp.set(+o.p1); update(); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. The small open economy: the cone, Rybczynski and balanced trade ---------- */
  NF.register('mi8-trade',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=420, F=null, el={}, api=null, st={L:10, K:8, a:0.5}, P=4, FM=16, GM=6;
    var rL=slider(fig,'L',1,function(v){ st.L=v; update(); }),
        rK=slider(fig,'K',1,function(v){ st.K=v; update(); }),
        rA=slider(fig,'alpha',2,function(v){ st.a=v; update(); });
    if(rL) st.L=rL.v();
    if(rK) st.K=rK.v();
    if(rA) st.a=rA.v();
    var view=seg(fig,'data-view',function(v){ if(v===view) return; view=v; draw(); });
    if(view!=='factor' && view!=='output' && view!=='trade') view='factor';
    /* a1 = (3, 1), a2 = (1, 3), p = (4, 4): inside the cone w = r = 1; outside, one good only and the idle factor is free */
    function solve(L,K,a){
      var o={};
      if(L>3*K){ o.q=[K,0]; o.w=0; o.r=P; o.kind='g1'; o.idle=L-3*K; }
      else if(K>3*L){ o.q=[0,L]; o.w=P; o.r=0; o.kind='g2'; o.idle=K-3*L; }
      else { o.q=[(3*L-K)/8,(3*K-L)/8]; o.w=1; o.r=1; o.kind='div'; o.idle=0; }
      o.m=o.w*L+o.r*K;
      o.x=[a*o.m/P,(1-a)*o.m/P];
      return o;
    }
    function feas(L,K){
      if(L>=3*K) return [[0,0],[K,0],[0,K/3]];
      if(K>=3*L) return [[0,0],[L/3,0],[0,L]];
      return [[0,0],[L/3,0],[(3*L-K)/8,(3*K-L)/8],[0,K/3]];
    }
    function moveE(a,b){
      if(rL) rL.set(clamp(Math.round(a*10)/10,2,16)); else st.L=a;
      if(rK) rK.set(clamp(Math.round(b*10)/10,2,16)); else st.K=b;
      update();
    }
    function draw(){
      W=measure(svg);
      var s=Math.min(W-44-50,340), x0=Math.round((W-s-94)/2)+44, top=26, g, M=view==='factor'?FM:GM, st1;
      H=top+s+28; frame(svg,W,H);
      st1=view==='factor'?4:(s>=260?1:2);
      F=panel(svg,{x:x0, y:top, w:s, h:s, X:[0,M], Y:[0,M], xt:steps(0,M,st1), yt:steps(0,M,st1),
        xn:view==='factor'?'L̄':view==='output'?'q₁':'x₁, q₁', yn:view==='factor'?'K̄':view==='output'?'q₂':'x₂, q₂'});
      g=F.gc; el={};
      if(view==='factor'){
        S('path',{'class':'mi8-cone',d:ppath(F,[[0,0],[FM/3,FM],[FM,FM],[FM,FM/3]])+'Z'},g);
        S('path',{'class':'mi8-ray',d:ppath(F,[[0,0],[FM,FM/3]])},g);
        S('path',{'class':'mi8-ray',d:ppath(F,[[0,0],[FM/3,FM]])},g);
        text(F.g,F.sx(FM)-4,F.sy(FM/3)+16,'a₁ = (3, 1)','nf-lab mi8-it nf-halo','end');
        text(F.g,F.sx(FM/3)+8,F.sy(FM)+14,'a₂ = (1, 3)','nf-lab mi8-it nf-halo','start');
        el.b1=S('path',{'class':'mi8-dash'},g);
        el.b0=S('circle',{r:4.5,cx:R(F.sx(8)),cy:R(F.sy(8)),'class':'mi8-ring0'},F.pc);
        el.lb0=text(F.pc,F.sx(8)-8,F.sy(8)-8,'(8, 8)','nf-lab nf-halo','end');
        el.r=S('path',{'class':'mi8-r'},g);
        el.d=S('path',{'class':'mi8-dashr'},g);
        el.idle=line(g,0,0,0,0,'mi8-idle');
        el.li=text(F.pc,0,0,'','mi8-tr nf-halo','middle');
        el.h=handle(svg,'mi8-kr','endowment (L̄, K̄), drag it or use the arrow keys',function(dx,dy,big){ var d=big?1:0.1; moveE(st.L+dx*d,st.K+dy*d); });
        el.lE=text(svg,0,0,'','mi8-tr nf-halo','start');
      } else {
        el.ps=S('path',{'class':'mi8-ps'},g);
        if(view==='output'){
          el.l0=S('path',{'class':'mi8-bud0'},g);
          el.lL=S('path',{'class':'mi8-bud'},g);
          el.lK=S('path',{'class':'mi8-a'},g);
          el.tL=text(F.g,0,0,'','mi8-tw mi8-it nf-halo','start');
          el.tK=text(F.g,0,0,'','mi8-ta mi8-it nf-halo','end');
          el.q0=S('circle',{r:4.5,'class':'mi8-ring0'},F.pc);
          el.ar=arrow(F.pc,'mi8-rd');
        } else {
          el.fr=S('path',{'class':'mi8-b'},g);
          el.pl=S('path',{'class':'mi8-bud'},g);
          el.ic=S('path',{'class':'mi8-a'},g);
          el.t1=line(F.pc,0,0,0,0,'mi8-tri'); el.t2=line(F.pc,0,0,0,0,'mi8-tri');
          el.x=S('circle',{r:5,'class':'mi8-da'},F.pc);
        }
        el.q=S('circle',{r:5,'class':'mi8-dr'},F.pc);
        if(view==='trade'){
          el.tt1=text(svg,0,0,'','mi8-tr nf-halo','end'); el.tt2=text(svg,0,0,'','mi8-tr nf-halo','start');
          el.lx=text(svg,0,0,'x','mi8-ta mi8-it nf-halo','end');
        }
        el.lq=text(svg,0,0,'q','mi8-tr mi8-it nf-halo','start');
      }
      update();
    }
    function fline(c1,c2,c){ /* c1 q1 + c2 q2 = c inside [0, GM]^2 */
      var a=[0,c/c2], b=[c/c1,0];
      if(a[1]>GM) a=[(c-c2*GM)/c1,GM];
      if(b[0]>GM) b=[GM,(c-c1*GM)/c2];
      return [a,b];
    }
    function update(){
      if(!F) return;
      var L=st.L, K=st.K, o=solve(L,K,st.a), q=o.q, x=o.x, b0=solve(8,K,st.a), ryb=o.kind==='div' && b0.kind==='div' && Math.abs(L-8)>1e-9, e, P1, P2, k, t;
      if(view==='factor'){
        P1=[3*q[0],q[0]]; P2=[q[1],3*q[1]];
        el.r.setAttribute('d',ppath(F,[P1,[0,0],P2]));
        el.d.setAttribute('d',o.kind==='div'?ppath(F,[P1,[L,K],P2]):'');
        show(el.idle,o.kind!=='div'); show(el.li,o.kind!=='div');
        if(o.kind==='g1'){ setLine(el.idle,F.sx(3*K),F.sy(K),F.sx(L),F.sy(K)); el.li.textContent='idle labour'; moveTo(el.li,F.sx((3*K+L)/2),F.sy(K)+16); }
        else if(o.kind==='g2'){ setLine(el.idle,F.sx(L),F.sy(3*L),F.sx(L),F.sy(K)); el.li.textContent='idle capital'; moveTo(el.li,F.sx(L)+(L<8?42:-42),F.sy((3*L+K)/2)); }
        k=Math.abs(L-8)>1e-9 || Math.abs(K-8)>1e-9;
        el.b1.setAttribute('d',k?ppath(F,[[6,2],[8,8],[2,6]]):'');
        show(el.b0,k); show(el.lb0,k);
        place(el.h,F.sx(L),F.sy(K),'L̄ = '+L.toFixed(1)+', K̄ = '+K.toFixed(1));
        el.lE.textContent=pair(L,K,1); moveTo(el.lE,F.sx(L)+(L>11?-10:10),F.sy(K)-9); el.lE.setAttribute('text-anchor',L>11?'end':'start');
      } else {
        e=feas(L,K);
        el.ps.setAttribute('d',ppath(F,e)+'Z');
        if(view==='output'){
          el.lL.setAttribute('d',ppath(F,fline(3,1,L)));
          el.lK.setAttribute('d',ppath(F,fline(1,3,K)));
          el.l0.setAttribute('d',Math.abs(L-8)>1e-9?ppath(F,fline(3,1,8)):'');
          t=fline(3,1,L); el.tL.textContent='3q₁ + q₂ = '+L.toFixed(1); moveTo(el.tL,F.sx(t[0][0])+6,F.sy(t[0][1])+12);
          if(t[0][0]>GM*0.55){ el.tL.setAttribute('text-anchor','end'); el.tL.setAttribute('x',R(F.sx(t[0][0])-6)); } else el.tL.setAttribute('text-anchor','start');
          t=fline(1,3,K); el.tK.textContent='q₁ + 3q₂ = '+K.toFixed(1); moveTo(el.tK,F.sx(t[1][0])-4,F.sy(t[1][1])-7);
          if(t[1][0]<GM*0.45){ el.tK.setAttribute('text-anchor','start'); el.tK.setAttribute('x',R(F.sx(t[1][0])+6)); } else el.tK.setAttribute('text-anchor','end');
          show(el.q0,ryb); at(el.q0,F.sx(b0.q[0]),F.sy(b0.q[1]));
          if(ryb) setArrow(el.ar,F.sx(b0.q[0]),F.sy(b0.q[1]),F.sx(q[0]),F.sy(q[1]),6); else setArrow(el.ar,0,0,0,0);
        } else {
          el.fr.setAttribute('d',ppath(F,e.slice(1)));
          el.pl.setAttribute('d',ppath(F,[[0,o.m/P],[o.m/P,0]]));
          k=Math.pow(x[0],st.a)*Math.pow(x[1],1-st.a);
          el.ic.setAttribute('d',cpath(F,function(v){ return [v,Math.pow(k/Math.pow(v,st.a),1/(1-st.a))]; },0.02,GM*1.3,240,true));
          at(el.x,F.sx(x[0]),F.sy(x[1])); moveTo(el.lx,F.sx(x[0])-8,F.sy(x[1])-8);
          setLine(el.t1,F.sx(q[0]),F.sy(q[1]),F.sx(x[0]),F.sy(q[1]));
          setLine(el.t2,F.sx(x[0]),F.sy(q[1]),F.sx(x[0]),F.sy(x[1]));
          t=Math.abs(x[0]-q[0])>0.005;
          show(el.t1,t); show(el.t2,t); show(el.tt1,t); show(el.tt2,t);
          el.tt1.textContent=(x[0]<q[0]?'exports ':'imports ')+Math.abs(x[0]-q[0]).toFixed(2);
          el.tt2.textContent=(x[1]>q[1]?'imports ':'exports ')+Math.abs(x[1]-q[1]).toFixed(2);
          /* the leg labels sit on the far side of the corner (x1, q2) from q, so they never cover q */
          k=x[0]<q[0];
          moveTo(el.tt1,F.sx(x[0])+(k?-6:6),F.sy(q[1])+4); el.tt1.setAttribute('text-anchor',k?'end':'start');
          moveTo(el.tt2,F.sx(x[0])+(k?6:-6),F.sy((q[1]+x[1])/2)+4); el.tt2.setAttribute('text-anchor',k?'start':'end');
        }
        at(el.q,F.sx(q[0]),F.sy(q[1])); moveTo(el.lq,F.sx(q[0])+8,F.sy(q[1])+(view==='trade'?16:-8));
      }
      if(api) api.changed();
      if(!out) return;
      out.textContent='L̄ = '+L.toFixed(1)+', K̄ = '+K.toFixed(1)+': ';
      if(o.kind==='div') add(out,'inside the cone, so both goods are made and w = r = 1, as abroad\n');
      else { add(out,'outside the cone, only good '+(o.kind==='g1'?'1':'2')+' is made\n'); warn(out,fmt(o.idle,2)+' units of '+(o.kind==='g1'?'labour':'capital')+' idle, so '+(o.kind==='g1'?'w = 0, r = 4':'r = 0, w = 4')+': factor prices differ from abroad\n'); }
      add(out,'q = '+pair(q[0],q[1],2)+', m = '+o.m.toFixed(2)+', x = '+pair(x[0],x[1],2)+'\n');
      if(Math.abs(x[0]-q[0])<0.005) add(out,'x = q: no trade');
      else add(out,(x[0]<q[0]?'exports ':'imports ')+Math.abs(x[0]-q[0]).toFixed(2)+' of good 1, '+(x[1]>q[1]?'imports ':'exports ')+Math.abs(x[1]-q[1]).toFixed(2)+' of good 2: 4('+fmt(x[0]-q[0],2)+') + 4('+fmt(x[1]-q[1],2)+') = '+fmt(P*(x[0]-q[0])+P*(x[1]-q[1]),2));
      if(ryb) add(out,'\nagainst L̄ = 8 at the same K̄: L̂ = '+pct(L/8-1)+', q̂₁ = '+pct(q[0]/b0.q[0]-1)+', q̂₂ = '+(b0.q[1]>1e-9?pct(q[1]/b0.q[1]-1):'n/a'));
    }
    dragger(svg,function(){ return [W,H]; },function(){ return F && view==='factor'?[[F.sx(st.L),F.sy(st.K)]]:[]; },function(i,x,y){ moveE(F.sx.inv(x),F.sy.inv(y)); });
    api=NF.api({
      get:function(){ var o=solve(st.L,st.K,st.a); return {view:view, L:st.L, K:st.K, alpha:st.a, q1:o.q[0], q2:o.q[1], x1:o.x[0], x2:o.x[1], w:o.w, r:o.r, cone:o.kind==='div'?'yes':'no'}; },
      set:function(o){
        if('view' in o) press(fig,'data-view',o.view);
        if('L' in o && rL) rL.set(+o.L);
        if('K' in o && rK) rK.set(+o.K);
        if('alpha' in o && rA) rA.set(+o.alpha);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
