/* Core Micro L7 figures: the transformation frontier and the profit maximising plan, the properties of production
   sets, isoquants and cost minimisation, returns to scale in costs and profits, single output profit maximisation and
   the convex profit function, conditional and unconditional factor demand, and supply with a fixed cost.
   Every curve is computed from the stated technology. Drawn with the helpers of /assets/notes.js (window.NF);
   colours come from CSS variables in /assets/figs/mi7.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function niceStep(span,n){
    var raw=span/Math.max(1,n), p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), m=raw/p;
    return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;
  }
  function tick(v){ return tl(Math.round(v*1000)/1000); }
  /* a plot box from x0 to x1 (svg units) and from top to bot: grid, ticks, axes and names.
     o.cross draws the axes through the origin as well; o.sx and o.sy fix the tick steps */
  function box(svg,x0,x1,top,bot,xd,yd,xname,yname,o){
    o=o||{};
    var g=S('g',null,svg), xs=lin(xd[0],xd[1],x0,x1), ys=lin(yd[0],yd[1],bot,top),
        sx=o.sx||niceStep(xd[1]-xd[0],Math.max(2,Math.floor((x1-x0)/58))),
        sy=o.sy||niceStep(yd[1]-yd[0],Math.max(2,Math.floor((bot-top)/36))), i, v, zero;
    for(i=Math.ceil(xd[0]/sx-1e-9);i*sx<=xd[1]+1e-9;i++){
      v=i*sx; zero=Math.abs(v)<1e-9;
      if(Math.abs(v-xd[0])>1e-9) line(g,C(xs(v)),top,C(xs(v)),bot,zero&&o.cross?'nf-ax mi7-axis':'nf-grid');
      text(g,xs(v),bot+15,tick(v),null,'middle');
    }
    for(i=Math.ceil(yd[0]/sy-1e-9);i*sy<=yd[1]+1e-9;i++){
      v=i*sy; zero=Math.abs(v)<1e-9;
      if(Math.abs(v-yd[0])>1e-9) line(g,x0,C(ys(v)),x1,C(ys(v)),zero?(o.cross?'nf-ax mi7-axis':'nf-ax'):'nf-grid');
      text(g,x0-6,ys(v)+4,tick(v),null,'end');
    }
    line(g,C(x0),top,C(x0),bot,'nf-ax');
    line(g,x0,C(bot),x1,C(bot),'nf-ax');
    if(xname) text(g,x1-3,bot-6,xname,'nf-title nf-halo','end');
    if(yname) text(g,x0+6,top+12,yname,'nf-title nf-halo');
    return {xs:xs, ys:ys, x0:x0, x1:x1, top:top, bot:bot, xd:xd, yd:yd, gc:clip(svg,x0,top-1,x1-x0+1,bot-top+2)};
  }
  /* a polyline through data points; a null point lifts the pen; pixels are capped so far points stay finite */
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
  function curve(f,a,b,n){ var o=[], i, x; for(i=0;i<=n;i++){ x=a+(b-a)*i/n; o.push([x,f(x)]); } return o; }
  function moveTo(e,x,y,anchor){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); if(anchor) e.setAttribute('text-anchor',anchor); }
  function hide(e){ e.setAttribute('visibility','hidden'); }
  function show(e){ e.removeAttribute('visibility'); }
  function vis(e,on){ if(on) show(e); else hide(e); }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function num(v){ return tl(Math.round(v*100)/100); }
  function put(out,s){ out.appendChild(document.createTextNode(s)); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function copy(o){ var c={}, k; for(k in o) c[k]=o[k]; return c; }
  /* an arrow with a head; it hides itself when it would be too short to read */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  function setVec(v,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(len<9){ hide(v.l); hide(v.h); return false; }
    show(v.l); show(v.h);
    ux=dx/len; uy=dy/len; hl=Math.min(9,len*0.45); bx=x1-ux*hl; by=y1-uy*hl;
    setLine(v.l,x0,y0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',poly([[x1,y1],[bx-uy*4.2,by+ux*4.2],[bx+uy*4.2,by-ux*4.2]])+'Z');
    return true;
  }
  function setCross(e,x,y,r){ r=r||5; e.setAttribute('d','M'+R(x-r)+','+R(y-r)+'L'+R(x+r)+','+R(y+r)+'M'+R(x-r)+','+R(y+r)+'L'+R(x+r)+','+R(y-r)); }
  /* a focusable round handle; the arrow keys call onKey(dx, dy, shift) */
  function handle(svg,knob,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+knob},h);
    h.addEventListener('keydown',function(e){
      var k=e.key;
      if(k==='ArrowRight') onKey(1,0,e.shiftKey); else if(k==='ArrowLeft') onKey(-1,0,e.shiftKey);
      else if(k==='ArrowUp') onKey(0,1,e.shiftKey); else if(k==='ArrowDown') onKey(0,-1,e.shiftKey);
      else return;
      e.preventDefault();
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+(+now).toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever handle is nearest the pointer; pts() gives svg positions, move(i, x, y) takes the new one */
  function dragger(svg,size,pts,move,hs){
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
      try{ hs()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){}
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
  /* two plot columns side by side when there is room, else stacked */
  function cols(W){ var mL=40, mR=14, g=46, w=(W-mL-mR-g)/2; return W>=470?[[mL,mL+w],[mL+w+g,W-mR]]:null; }

  /* ---------- 1. The transformation frontier, the MRT and the profit maximising plan ---------- */
  NF.register('mi7-frontier',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* F(y) = y1 + y2 + c y1^2 with c = 0.15 and p2 = 2: the frontier is y2 = -y1 - c y1^2 */
    var CC=0.15, P2=2, XD=[-5,3], YD=[-3,3], LO=-4.9, HI=2.2, AL=1.25, W=520, H=420, F=null, el={}, st={p1:1, y1:-2.5}, cur={}, api=null, hs=null;
    var rp=range(fig,'p1',2,function(v){ st.p1=v; update(); });
    if(rp) st.p1=rp.v();
    onClick(fig,'.mi7-toopt',function(){ st.y1=opt()[0]; update(); });
    function fr(y1){ return -y1-CC*y1*y1; }
    function mrt(y1){ return 1+2*CC*y1; }
    function opt(){ var y1=(st.p1/P2-1)/(2*CC); return [y1,fr(y1)]; }
    function setY(v,snap){
      var o=opt()[0];
      v=clamp(v,LO,HI);
      if(snap && Math.abs(F.xs(v)-F.xs(o))<snap) v=o;
      st.y1=v; update();
    }
    function draw(){
      var mL=40, mR=14, rows, top, u, pts;
      W=measure(svg); frame(svg,W,600);
      rows=key(S('g',null,svg),[['line','mi7-iso','p·y = π(p)'],['line','mi7-iso0','p·y = p·ȳ'],['line','mi7-tan','tangent at ȳ']],mL,12,W-mR);
      top=12+16*(rows-1)+14;
      /* equal units on both axes, so the gradient and p look normal to the frontier */
      u=(W-mL-mR)/(XD[1]-XD[0]);
      H=Math.round(top+u*(YD[1]-YD[0])+24); svg.setAttribute('viewBox','0 0 '+W+' '+H);
      F=box(svg,mL,W-mR,top,H-24,XD,YD,'y₁','y₂',{cross:true,sx:1,sy:1});
      pts=curve(fr,XD[0],XD[1],240);
      S('path',{d:pathOf(pts.concat([[XD[1],YD[0]-5],[XD[0],YD[0]-5]]),F)+'Z','class':'mi7-Y'},F.gc);
      S('path',{d:pathOf(pts,F),'class':'mi7-fr'},F.gc);
      text(svg,F.xs(XD[0])+8,F.ys(YD[0])-10,'Y = {y : F(y) ≤ 0}','mi7-tg nf-halo');
      text(svg,F.xs(1.6)+8,F.ys(fr(1.6))+4,'F(y) = 0','mi7-tg nf-halo');
      el.iso=line(F.gc,0,0,0,0,'mi7-iso');
      el.iso0=line(F.gc,0,0,0,0,'mi7-iso0');
      el.tan=line(F.gc,0,0,0,0,'mi7-tan');
      el.pv=vec(F.gc,'mi7-pv','mi7-pvh');
      el.gr=vec(F.gc,'mi7-gr','mi7-grh');
      el.opt=S('circle',{r:5,'class':'mi7-dot'},F.gc);
      el.ol=text(svg,0,0,'y(p)','mi7-tb nf-halo mi7-it');
      el.pl=text(svg,0,0,'p','mi7-tb nf-halo mi7-it','middle');
      el.gl=text(svg,0,0,'∇F(ȳ)','mi7-tr nf-halo mi7-it','middle');
      el.yl=text(svg,0,0,'ȳ','mi7-tr nf-halo mi7-it');
      hs=handle(svg,'mi7-kr','Plan y bar on the frontier, arrow keys move it',function(dx,dy,big){ setY(st.y1+(dx||dy)*(big?0.25:0.05),0); });
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var p1=st.p1, r=p1/P2, o=opt(), y1=st.y1, y2=fr(y1), m=mrt(y1), pi=p1*o[0]+P2*o[1], pb=p1*y1+P2*y2,
          isOpt=Math.abs(y1-o[0])<1e-9, X=F.xs(y1), Y=F.ys(y2), OX=F.xs(o[0]), OY=F.ys(o[1]), ng=Math.hypot(m,1), np=Math.hypot(p1,P2),
          close=Math.hypot(X-OX,Y-OY)<16, dx, s;
      setLine(el.iso,F.xs(XD[0]),F.ys((pi-p1*XD[0])/P2),F.xs(XD[1]),F.ys((pi-p1*XD[1])/P2));
      vis(el.iso0,!isOpt);
      setLine(el.iso0,F.xs(XD[0]),F.ys((pb-p1*XD[0])/P2),F.xs(XD[1]),F.ys((pb-p1*XD[1])/P2));
      setLine(el.tan,F.xs(y1-1.5/ng),F.ys(y2+1.5*m/ng),F.xs(y1+1.5/ng),F.ys(y2-1.5*m/ng));
      setVec(el.gr,X,Y,F.xs(y1+AL*m/ng),F.ys(y2+AL/ng));
      setVec(el.pv,OX,OY,F.xs(o[0]+AL*p1/np),F.ys(o[1]+AL*P2/np));
      at(el.opt,OX,OY);
      moveTo(el.gl,F.xs(y1+(AL+0.32)*m/ng),F.ys(y2+(AL+0.32)/ng)+4,'middle');
      moveTo(el.pl,F.xs(o[0]+(AL+0.25)*p1/np),F.ys(o[1]+(AL+0.25)*P2/np)+4,'middle');
      /* y(p) sits below left of its dot, away from p; the plan's label sits away from its gradient */
      moveTo(el.ol,OX-13*p1/np,OY+13*P2/np+6,'end');
      dx=-13*m/ng;
      moveTo(el.yl,X+dx,Y+13/ng+8,dx<0?'end':'start');
      if(close && !isOpt){
        /* two plans a few pixels apart: the labels and the arrow names part to either side */
        if(X<=OX){ moveTo(el.yl,X-9,Y-9,'end'); moveTo(el.ol,OX+9,OY+17,'start'); moveTo(el.gl,F.xs(y1+(AL+0.32)*m/ng)-6,F.ys(y2+(AL+0.32)/ng)+4,'end'); moveTo(el.pl,F.xs(o[0]+(AL+0.25)*p1/np)+6,F.ys(o[1]+(AL+0.25)*P2/np)+4,'start'); }
        else { moveTo(el.yl,X+9,Y+17,'start'); moveTo(el.ol,OX-9,OY-9,'end'); moveTo(el.gl,F.xs(y1+(AL+0.32)*m/ng)+6,F.ys(y2+(AL+0.32)/ng)+4,'start'); moveTo(el.pl,F.xs(o[0]+(AL+0.25)*p1/np)-6,F.ys(o[1]+(AL+0.25)*P2/np)+4,'end'); }
      }
      /* arrow names stay inside the plot, clear of the legend above it */
      [el.gl,el.pl].forEach(function(t){ t.setAttribute('y',R(clamp(+t.getAttribute('y'),F.top+11,F.bot-4))); });
      vis(el.yl,!isOpt); vis(el.pl,!isOpt);
      el.ol.textContent=isOpt?'ȳ = y(p)':'y(p)';
      el.gl.textContent=isOpt?'∇F(ȳ) ∥ p':'∇F(ȳ)';
      place(hs,X,Y,y1,'y bar = ('+fmt(y1,2)+', '+fmt(y2,2)+'), MRT = '+fmt(m,2));
      cur={p1:p1, p2:P2, ratio:r, y1:y1, y2:y2, mrt:m, o1:o[0], o2:o[1], pi:pi, pb:pb, opt:isOpt};
      out.textContent='';
      s='ȳ = '+pair(y1,y2,2)+'   MRT₁₂(ȳ) = F₁/F₂ = 1 + 0.3ȳ₁ = '+fmt(m,2)+'   p₁/p₂ = '+fmt(r,2);
      if(isOpt) s+='\nMRT₁₂ = p₁/p₂: ∇F(ȳ) points along p, so ȳ = y(p)';
      else if(m<r) s+='\nMRT₁₂ < p₁/p₂: profit rises as ȳ moves right along the frontier';
      else s+='\nMRT₁₂ > p₁/p₂: profit rises as ȳ moves left along the frontier';
      s+='\np = '+pair(p1,P2,2)+': y(p) = '+pair(o[0],o[1],2)+', '+(Math.abs(o[0])<5e-3?'inaction':o[0]<0?'good 1 makes good 2':'good 2 makes good 1')+
        '   π(p) = '+fmt(pi,2)+(isOpt?'':(pi-pb>=5e-3?' > ':' ≈ ')+'p·ȳ = '+fmt(pb,2));
      put(out,s);
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[F.xs(st.y1),F.ys(fr(st.y1))]]; },
      function(i,x){ setY(F.xs.inv(x),8); },function(){ return [hs]; });
    /* the Try it steps read the plan, its MRT, the optimum and both profits; set takes p1, y1 and probe=opt */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('p1' in s && rp) rp.set(+s.p1);
        if('y1' in s){ st.y1=clamp(+s.y1,LO,HI); update(); }
        if(s.probe==='opt'){ st.y1=opt()[0]; update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Properties of production sets: scaling, adding and mixing plans ---------- */
  NF.register('mi7-properties',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* one input z = -y1 and one output q = y2; every set has free disposal: Y = {y : y1 <= 0, y2 <= f(-y1)} */
    var XD=[-4.5,2.5], YD=[-2,3.2], W=520, H=330, F=null, el={}, hs=[], cur={}, api=null;
    var T={
      sqrt:{f:function(z){ return Math.sqrt(Math.max(0,z)); }, y:[-1,1], y2:[-2.5,Math.sqrt(2.5)], a:2, name:'q ≤ √z',
            has:'convex and DRS; not IRS, so not CRS; not additive',
            fr:function(){ var o=[], i, z; for(i=0;i<=200;i++){ z=4.6*Math.pow(i/200,2); o.push([-z,Math.sqrt(z)]); } return o; }},
      setup:{f:function(z){ return Math.max(0,z-1); }, y:[-2,1], y2:[-0.5,0], a:0.5, name:'q ≤ z − 1 after a setup cost of 1',
            has:'IRS and additive; not convex, not DRS',
            fr:function(){ return [[0,0],[-1,0],[-4.6,3.6]]; }},
      cone:{f:function(z){ return 0.6*z; }, y:[-1.5,0.9], y2:[-3,0.6], a:2, name:'q ≤ 0.6z',
            has:'a convex cone: CRS, convex and additive',
            fr:function(){ return [[0,0],[-4.6,2.76]]; }},
      floor:{f:function(z){ return Math.floor(z+1e-9); }, y:[-1,1], y2:[-2,2], a:1.5, name:'q ≤ ⌊z⌋, whole units only',
            has:'additive; not convex, not DRS, not IRS',
            fr:function(){ return [[0,0],[-1,0],[-1,1],[-2,1],[-2,2],[-3,2],[-3,3],[-4,3],[-4,4],[-4.6,4]]; }}
    };
    var st={t:'sqrt', y:null, y2:null, a:2};
    var ra=range(fig,'a',2,function(v){ st.a=v; update(); });
    st.t=seg(fig,'data-tech',function(v){ if(!T[v]) return; st.t=v; st.y=T[v].y.slice(); st.y2=T[v].y2.slice(); if(ra) ra.set(T[v].a); else update(); }) || 'sqrt';
    if(!T[st.t]) st.t='sqrt';
    st.y=T[st.t].y.slice(); st.y2=T[st.t].y2.slice();
    if(ra) st.a=ra.v();
    function inY(p){ return p[0]<=1e-9 && p[1]<=T[st.t].f(-p[0])+1e-9; }
    function snap(v){ return Math.round(v*20)/20; }
    function fix(p){ var y1=clamp(snap(p[0]),XD[0]+0.1,0); return [y1,clamp(snap(p[1]),YD[0]+0.1,T[st.t].f(-y1))]; }
    function setP(i,p){ if(i) st.y2=fix(p); else st.y=fix(p); update(); }
    /* membership along a path p(k/n), k = 0..n, as runs [k0, k1, in] */
    function runs(fn,n){
      var o=[], k, b, last=null;
      for(k=0;k<=n;k++){ b=inY(fn(k/n)); if(last && last[2]===b) last[1]=k; else { last=[k,k,b]; o.push(last); } }
      return o;
    }
    function draw(){
      var mL=40, mR=14;
      W=measure(svg);
      H=Math.round(clamp((W-mL-mR)*(YD[1]-YD[0])/(XD[1]-XD[0])+32,230,360)); frame(svg,W,H);
      F=box(svg,mL,W-mR,8,H-24,XD,YD,'y₁ = −z','y₂ = q',{cross:true,sx:1,sy:1});
      el.Y=S('path',{'class':'mi7-Y'},F.gc);
      el.fr=S('path',{'class':'mi7-fr'},F.gc);
      el.Yl=text(svg,F.xs(XD[0])+8,F.ys(YD[0])-10,'Y','mi7-tg nf-halo mi7-it');
      el.par=S('path',{'class':'mi7-par'},F.gc);
      el.sout=S('path',{'class':'mi7-out'},F.gc);
      el.sin=S('path',{'class':'mi7-mix'},F.gc);
      el.rout=S('path',{'class':'mi7-out'},F.gc);
      el.rin=S('path',{'class':'mi7-in'},F.gc);
      el.dots=S('g',null,F.gc);
      el.zero=S('circle',{r:3.5,'class':'mi7-rdot'},F.gc);
      el.ad=S('circle',{r:4.5,'class':'mi7-dot'},F.gc); el.ax=S('path',{'class':'mi7-cross'},F.gc);
      el.sd=S('circle',{r:4.5,'class':'mi7-kdot'},F.gc); el.sx=S('path',{'class':'mi7-cross'},F.gc);
      el.nx=S('path',{'class':'mi7-ocross'},F.gc);
      el.al=text(svg,0,0,'αy','mi7-tb nf-halo mi7-it');
      el.sl=text(svg,0,0,'y + y′','nf-lab nf-halo mi7-it');
      el.nl=text(svg,0,0,'−y','mi7-to nf-halo mi7-it');
      el.yl=text(svg,0,0,'y','mi7-tb nf-halo mi7-it');
      el.y2l=text(svg,0,0,'y′','mi7-tp nf-halo mi7-it');
      hs=[handle(svg,'mi7-kb','Plan y, arrow keys move it',function(dx,dy,b){ var s=b?0.25:0.05; setP(0,[st.y[0]+dx*s,st.y[1]+dy*s]); }),
          handle(svg,'mi7-kp','Plan y prime, arrow keys move it',function(dx,dy,b){ var s=b?0.25:0.05; setP(1,[st.y2[0]+dx*s,st.y2[1]+dy*s]); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function interval(rs,n,scale){
      var parts=[], pts=[], i, r;
      for(i=0;i<rs.length;i++){
        r=rs[i]; if(!r[2]) continue;
        if(r[0]===r[1]) pts.push(num(r[0]*scale/n));
        else { if(pts.length){ parts.push('{'+pts.join(', ')+'}'); pts=[]; } parts.push('['+num(r[0]*scale/n)+', '+num(r[1]*scale/n)+']'); }
      }
      if(pts.length) parts.push('{'+pts.join(', ')+'}');
      if(parts.length>4) parts=parts.slice(0,4).concat(['…']);
      return parts.length?parts.join(' ∪ '):'no α';
    }
    function paint(){
      var t=T[st.t], y=st.y, y2=st.y2, a=st.a, ay=[a*y[0],a*y[1]], sum=[y[0]+y2[0],y[1]+y2[1]], neg=[-y[0],-y[1]], fp=t.fr(), am=50, n, rs, rr, ss, dIn='', dOut='', i, r, P, k0, k1,
          ray=function(s){ return [s*y[0],s*y[1]]; }, mix=function(s){ return [y[0]+s*(y2[0]-y[0]),y[1]+s*(y2[1]-y[1])]; }, pin, sin, aIn, s;
      el.fr.setAttribute('d',pathOf(fp,F));
      el.Y.setAttribute('d',pathOf(fp.concat([[fp[fp.length-1][0],YD[0]-2],[0,YD[0]-2]]),F)+'Z');
      /* the ray {αy : α ≥ 0} up to the edge of the plot, solid where it is in Y and dashed red where it is not */
      if(y[0]<0) am=Math.min(am,XD[0]/y[0]);
      if(y[1]>0) am=Math.min(am,YD[1]/y[1]); else if(y[1]<0) am=Math.min(am,YD[0]/y[1]);
      n=Math.max(1,Math.min(4000,Math.ceil(am*200)));
      rs=runs(function(s){ return ray(s*n/200); },n);
      while(el.dots.firstChild) el.dots.removeChild(el.dots.firstChild);
      function paths(list,fn,N){
        var di='', dO='', j, q, A, B;
        for(j=0;j<list.length;j++){
          q=list[j];
          if(q[2]){
            if(q[1]>q[0]){ A=fn(q[0]/N); B=fn(q[1]/N); di+='M'+R(F.xs(A[0]))+','+R(F.ys(A[1]))+'L'+R(F.xs(B[0]))+','+R(F.ys(B[1])); }
            else { A=fn(q[0]/N); S('circle',{cx:R(F.xs(A[0])),cy:R(F.ys(A[1])),r:2.6,'class':'mi7-dot'},el.dots); }
          } else {
            A=fn(Math.max(0,q[0]-1)/N); B=fn(Math.min(N,q[1]+1)/N);
            dO+='M'+R(F.xs(A[0]))+','+R(F.ys(A[1]))+'L'+R(F.xs(B[0]))+','+R(F.ys(B[1]));
          }
        }
        return [di,dO];
      }
      P=paths(rs,function(s){ return ray(s*n/200); },n);
      el.rin.setAttribute('d',P[0]); el.rout.setAttribute('d',P[1]);
      ss=runs(mix,200);
      P=paths(ss,mix,200);
      el.sin.setAttribute('d',P[0]); el.sout.setAttribute('d',P[1]);
      el.par.setAttribute('d','M'+R(F.xs(y[0]))+','+R(F.ys(y[1]))+'L'+R(F.xs(sum[0]))+','+R(F.ys(sum[1]))+'L'+R(F.xs(y2[0]))+','+R(F.ys(y2[1])));
      at(el.zero,F.xs(0),F.ys(0));
      aIn=inY(ay); pin=inY(sum); sin=ss.length===1 && ss[0][2];
      vis(el.ad,aIn); vis(el.ax,!aIn); at(el.ad,F.xs(ay[0]),F.ys(ay[1])); setCross(el.ax,F.xs(ay[0]),F.ys(ay[1]),5);
      vis(el.sd,pin); vis(el.sx,!pin); at(el.sd,F.xs(sum[0]),F.ys(sum[1])); setCross(el.sx,F.xs(sum[0]),F.ys(sum[1]),5);
      setCross(el.nx,F.xs(neg[0]),F.ys(neg[1]),4.5);
      moveTo(el.al,F.xs(ay[0])-9,F.ys(ay[1])-8,'end');
      moveTo(el.sl,F.xs(sum[0])+9,F.ys(sum[1])-8,'start');
      moveTo(el.nl,F.xs(neg[0])+8,F.ys(neg[1])+16,'start');
      moveTo(el.yl,F.xs(y[0])+11,F.ys(y[1])+15,'start');
      moveTo(el.y2l,F.xs(y2[0])-11,F.ys(y2[1])+15,'end');
      vis(el.al,Math.hypot(F.xs(ay[0])-F.xs(y[0]),F.ys(ay[1])-F.ys(y[1]))>14);
      place(hs[0],F.xs(y[0]),F.ys(y[1]),y[0],'y = ('+fmt(y[0],2)+', '+fmt(y[1],2)+')');
      place(hs[1],F.xs(y2[0]),F.ys(y2[1]),y2[0],'y prime = ('+fmt(y2[0],2)+', '+fmt(y2[1],2)+')');
      rr=runs(function(q){ return ray(3*q); },600);
      cur={tech:st.t, a:a, y1:y[0], y2:y[1], z1:y2[0], z2:y2[1], ain:aIn, sumin:pin, mixin:sin};
      out.textContent='';
      s='y = '+pair(y[0],y[1],2)+', y′ = '+pair(y2[0],y2[1],2)+', both in Y; −y = '+pair(neg[0],neg[1],2)+(Math.abs(y[0])+Math.abs(y[1])<1e-9?' = 0 ∈ Y':' ∉ Y')+
        '\nα = '+fmt(a,2)+': αy = '+pair(ay[0],ay[1],2)+(aIn?' ∈ Y':' ∉ Y')+'   for α ≤ 3, αy ∈ Y when α ∈ '+interval(rr,600,3)+
        '\ny + y′ = '+pair(sum[0],sum[1],2)+(pin?' ∈ Y':' ∉ Y')+'   the segment from y to y′ '+(sin?'stays in Y':'leaves Y')+
        '\nY: '+t.name+'; '+t.has;
      put(out,s);
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[F.xs(st.y[0]),F.ys(st.y[1])],[F.xs(st.y2[0]),F.ys(st.y2[1])]]; },
      function(i,x,y){ setP(i,[F.xs.inv(x),F.ys.inv(y)]); },function(){ return hs; });
    /* the Try it steps read the technology, alpha, both plans and the three tests; set takes tech and a */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('tech' in s) NF.press(fig,'data-tech',String(s.tech));
        if('a' in s && ra) ra.set(+s.a);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Isoquants and cost minimisation ---------- */
  NF.register('mi7-isoquants',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* constant returns with equal weights: Leontief min(z1, z2), CES (z1^ρ + z2^ρ)^(1/ρ) with σ = 1/(1 − ρ),
       Cobb Douglas sqrt(z1 z2), and the linear z1 + z2; p2 = 2 */
    var P2=2, D=6, W=520, H=320, F=null, el={}, st={t:'cd', p1:1, q:2}, cur={}, api=null;
    var SIG={leo:0, ces:0.5, cd:1, ces2:2, lin:Infinity};
    var rp=range(fig,'p1',2,function(v){ st.p1=v; update(); }), rq=range(fig,'q',2,function(v){ st.q=v; update(); });
    if(rp) st.p1=rp.v();
    if(rq) st.q=rq.v();
    st.t=seg(fig,'data-tech',function(v){ if(!(v in SIG)) return; st.t=v; update(); }) || 'cd';
    function rho(t){ return 1-1/SIG[t]; }
    function sol(t,p1,q){
      var s=SIG[t], A, k;
      if(t==='leo') return {z:[q,q], c:q*(p1+P2), kind:'kink'};
      if(t==='lin'){
        if(Math.abs(p1-P2)<1e-9) return {z:[q/2,q/2], c:q*p1, kind:'flat'};
        return p1<P2?{z:[q,0], c:q*p1, kind:'corner'}:{z:[0,q], c:q*P2, kind:'corner'};
      }
      if(t==='cd') return {z:[q*Math.sqrt(P2/p1),q*Math.sqrt(p1/P2)], c:2*q*Math.sqrt(p1*P2), kind:'tan'};
      A=Math.pow(p1,1-s)+Math.pow(P2,1-s); k=Math.pow(A,s/(1-s));
      return {z:[q*Math.pow(p1,-s)*k,q*Math.pow(P2,-s)*k], c:q*Math.pow(A,1/(1-s)), kind:'tan'};
    }
    function isoPts(t,q){
      var pts=[], i, w, r, X=4*D, lo;
      if(t==='leo') return [[q,X],[q,q],[X,q]];
      if(t==='lin') return [[0,q],[q,0]];
      if(t==='cd'){ lo=q*q/X; for(i=0;i<=240;i++){ w=lo*Math.pow(X/lo,i/240); pts.push([w,q*q/w]); } return pts; }
      r=rho(t);
      for(i=1;i<400;i++){ w=(1-Math.cos(Math.PI*i/400))/2; pts.push([q*Math.pow(w,1/r),q*Math.pow(1-w,1/r)]); }
      if(r>0){ pts.unshift([0,q]); pts.push([q,0]); }
      return pts;
    }
    function mrts(t,z){ if(t==='cd') return z[1]/z[0]; if(t==='lin') return 1; return Math.pow(z[0]/z[1],rho(t)-1); }
    function draw(){
      W=measure(svg);
      H=Math.round(clamp(W*0.62,250,330)); frame(svg,W,H);
      F=box(svg,40,W-14,8,H-24,[0,D],[0,D],'z₁','z₂',{sx:1,sy:1});
      el.ray=line(F.gc,0,0,0,0,'mi7-ray');
      el.iq0=S('path',{'class':'mi7-iq2'},F.gc);
      el.iq1=S('path',{'class':'mi7-iq2'},F.gc);
      el.iq=S('path',{'class':'mi7-iq'},F.gc);
      el.cost=line(F.gc,0,0,0,0,'mi7-cost');
      el.flat=line(F.gc,0,0,0,0,'mi7-flat');
      el.dot=S('circle',{r:5,'class':'mi7-rdot'},F.gc);
      el.zl=text(svg,0,0,'z(p, q)','mi7-tr nf-halo mi7-it');
      el.ql=text(svg,0,0,'','mi7-tg nf-halo');
      el.cl=text(svg,0,0,'p·z = c(p, q)','nf-lab nf-halo');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var t=st.t, p1=st.p1, q=st.q, o=sol(t,p1,q), z=o.z, X=F.xs(z[0]), Y=F.ys(z[1]), m, k, s, sg=SIG[t], ratio=p1/P2, ex, cx;
      el.iq.setAttribute('d',pathOf(isoPts(t,q),F));
      el.iq0.setAttribute('d',pathOf(isoPts(t,0.5*q),F));
      el.iq1.setAttribute('d',pathOf(isoPts(t,1.5*q),F));
      setLine(el.cost,F.xs(o.c/p1),F.ys(0),F.xs(0),F.ys(o.c/P2));
      k=2*D/Math.max(z[0],z[1]);
      vis(el.ray,o.kind==='tan'||o.kind==='kink');
      setLine(el.ray,F.xs(0),F.ys(0),F.xs(k*z[0]),F.ys(k*z[1]));
      vis(el.flat,o.kind==='flat'); vis(el.dot,o.kind!=='flat');
      setLine(el.flat,F.xs(0),F.ys(q),F.xs(q),F.ys(0));
      at(el.dot,X,Y);
      if(o.kind==='flat') moveTo(el.zl,F.xs(q/2)+10,F.ys(q/2)-8,'start');
      else moveTo(el.zl,X+(X>F.x1-70?-9:9),Y-9,X>F.x1-70?'end':'start');
      /* the isoquant's label at the top of the plot, the isocost label where the line meets the z1 axis */
      el.ql.textContent='f(z) = '+fmt(q,2);
      if(t==='lin'){ moveTo(el.ql,F.xs(0)+6,F.ys(q)-6,'start'); }
      else { ex=isoPts(t,q).filter(function(p){ return p[1]<=0.93*D && p[0]<=D; }); ex=ex.length?ex[0]:[q,q]; moveTo(el.ql,F.xs(ex[0])+7,Math.max(F.ys(ex[1]),F.top+14),'start'); }
      /* the isocost label sits just below its line, a fifth of the way in from where it enters the plot on the left */
      cx=Math.max(0,(o.c-P2*0.97*D)/p1); cx=cx+0.2*(Math.min(o.c/p1,D)-cx);
      moveTo(el.cl,F.xs(cx)+6,F.ys((o.c-p1*cx)/P2)+16,'start');
      cur={tech:t, p1:p1, p2:P2, q:q, z1:z[0], z2:z[1], c:o.c, mc:o.c/q, kind:o.kind};
      out.textContent='';
      s=(o.kind==='flat'?'z(p, q): every z on the red segment':'z(p, q) = '+pair(z[0],z[1],2))+'   c(p, q) = '+fmt(o.c,2)+'   MC = AC = c(p, 1) = '+fmt(o.c/q,2);
      if(o.kind==='tan'){ m=mrts(t,z); cur.mrts=m; s+='\nMRTS₁₂ = f₁/f₂ = '+fmt(m,2)+' = p₁/p₂ = '+fmt(ratio,2)+': the isocost line is tangent to the isoquant'; }
      else if(o.kind==='kink') s+='\nkink: z = (q, q) at every price; MRTS₁₂ is ∞ above it and 0 to its right, so D_pz = 0';
      else if(o.kind==='flat') s+='\nMRTS₁₂ = 1 = p₁/p₂: the isocost line lies on the isoquant';
      else if(p1>P2) s+='\ncorner: MRTS₁₂ = 1 < p₁/p₂ = '+fmt(ratio,2)+', so p₁ > μf₁ and z₁ = 0';
      else s+='\ncorner: MRTS₁₂ = 1 > p₁/p₂ = '+fmt(ratio,2)+', so p₂ > μf₂ and z₂ = 0';
      if(t==='leo') s+='\nσ = 0: z₁/z₂ = 1 whatever p₁/p₂';
      else if(t==='lin') s+='\nσ = ∞: only the cheaper input is used';
      else s+='\nσ = '+tl(sg)+': z₁/z₂ = (p₁/p₂)^(−σ) = '+fmt(z[0]/z[1],2);
      put(out,s);
    }
    /* the Try it steps read the bundle, the cost and the kind of solution; set takes tech, p1 and q */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('tech' in s) NF.press(fig,'data-tech',String(s.tech));
        if('p1' in s && rp) rp.set(+s.p1);
        if('q' in s && rq) rq.set(+s.q);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Returns to scale: the cost curve, AC and MC, and a constant returns profit ---------- */
  NF.register('mi7-returns',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* c = K q^(1/r) with K = 1; the CRS plan (-t, t) earns t (p2 - p1) with p2 = 1 */
    var QH=2.5, TH=3, W=520, H=0, A=null, B=null, G=null, el={}, st={r:0.5, q:1.5, p1:1.2}, cur={}, api=null;
    var rr=range(fig,'r',2,function(v){ st.r=v; update(); }), rq=range(fig,'q',2,function(v){ st.q=v; update(); }),
        rp=range(fig,'p1',2,function(v){ st.p1=v; update(); });
    if(rr) st.r=rr.v();
    if(rq) st.q=rq.v();
    if(rp) st.p1=rp.v();
    function draw(){
      var c2, h1, top3, h3=130, g, refs=[[0.5,'r = ½'],[1,'r = 1'],[2,'r = 2']], i, rf, end;
      W=measure(svg); c2=cols(W); h1=c2?170:150;
      frame(svg,W,800);
      if(c2){
        A=box(svg,c2[0][0],c2[0][1],8,8+h1,[0,QH],[0,4],'q','cost c',{sy:1});
        B=box(svg,c2[1][0],c2[1][1],8,8+h1,[0,QH],[0,4],'q','AC and MC',{sy:1});
        top3=8+h1+44;
      } else {
        A=box(svg,40,W-14,8,8+h1,[0,QH],[0,4],'q','cost c',{sy:1});
        B=box(svg,40,W-14,8+h1+44,8+2*h1+44,[0,QH],[0,4],'q','AC and MC',{sy:1});
        top3=8+2*h1+88;
      }
      G=box(svg,40,W-14,top3,top3+h3,[0,TH],[-1.8,1.8],'scale t','profit of (−t, t)',{sy:1});
      H=top3+h3+24; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      for(i=0;i<refs.length;i++){
        rf=refs[i][0];
        S('path',{d:pathOf(curve(function(q){ return Math.pow(q,1/rf); },0,QH,120),A),'class':'mi7-cref'},A.gc);
        end=Math.min(QH,Math.pow(3.9,rf));
        text(svg,A.xs(end)-3,A.ys(Math.pow(end,1/rf))+(rf<1?14:rf>1?14:-6),refs[i][1],'mi7-tm nf-halo','end');
      }
      line(B.gc,B.x0,B.ys(1),B.x1,B.ys(1),'mi7-cref');
      text(svg,B.x1-3,B.ys(1)-5,'r = 1: AC = MC','mi7-tm nf-halo','end');
      el.c=S('path',{'class':'mi7-c'},A.gc);
      el.ga=line(A.gc,0,0,0,0,'nf-guide');
      el.cd=S('circle',{r:4.5,'class':'mi7-dot'},A.gc);
      el.ac=S('path',{'class':'mi7-ac'},B.gc);
      el.mc=S('path',{'class':'mi7-mc'},B.gc);
      el.gb=line(B.gc,0,0,0,0,'nf-guide');
      el.acd=S('circle',{r:4.5,'class':'mi7-dot'},B.gc);
      el.mcd=S('circle',{r:4.5,'class':'mi7-rdot'},B.gc);
      el.acl=text(svg,0,0,'AC','mi7-tb nf-halo');
      el.mcl=text(svg,0,0,'MC','mi7-tr nf-halo');
      el.pr=line(G.gc,0,0,0,0,'mi7-zero');
      el.prl=text(svg,0,0,'','nf-lab nf-halo','end');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var r=st.r, q=st.q, p1=st.p1, e=1/r, AC=Math.pow(q,e-1), MC=e*AC, c=Math.pow(q,e), d=1-p1, s, kind, end, lab, py;
      el.c.setAttribute('d',pathOf(curve(function(x){ return Math.pow(x,e); },0,QH,200),A));
      el.ac.setAttribute('d',pathOf(curve(function(x){ return Math.pow(x,e-1); },0.004,QH,300),B));
      el.mc.setAttribute('d',pathOf(curve(function(x){ return e*Math.pow(x,e-1); },0.004,QH,300),B));
      setLine(el.ga,A.xs(q),A.top,A.xs(q),A.bot); at(el.cd,A.xs(q),A.ys(c)); vis(el.cd,c<=4.2);
      setLine(el.gb,B.xs(q),B.top,B.xs(q),B.bot);
      at(el.acd,B.xs(q),B.ys(AC)); at(el.mcd,B.xs(q),B.ys(MC)); vis(el.acd,AC<=4.2); vis(el.mcd,MC<=4.2);
      /* AC and MC labels at the right edge, the higher one above */
      end=[Math.pow(QH,e-1),e*Math.pow(QH,e-1)];
      moveTo(el.acl,B.x1-4,clamp(B.ys(end[0])+(end[0]>=end[1]?-6:14),B.top+12,B.bot-4),'end');
      moveTo(el.mcl,B.x1-4,clamp(B.ys(end[1])+(end[1]>end[0]?-6:14),B.top+12,B.bot-4),'end');
      if(Math.abs(end[0]-end[1])<1e-9){ moveTo(el.mcl,B.x1-30,B.ys(end[1])-6,'end'); }
      kind=Math.abs(d)<1e-9?'mi7-zero':d>0?'mi7-pos':'mi7-neg';
      el.pr.setAttribute('class',kind);
      setLine(el.pr,G.xs(0),G.ys(0),G.xs(TH),G.ys(TH*d));
      lab=Math.abs(d)<1e-9?'every t ≥ 0 is optimal':d>0?'profit grows without bound: π = ∞':'t* = 0, π = 0';
      el.prl.textContent=lab;
      py=G.ys(TH*d)+(d>=0?-8:16); moveTo(el.prl,G.x1-4,clamp(py,G.top+12,G.bot-4),'end');
      cur={r:r, q:q, p1:p1, ac:AC, mc:MC, ratio:e, c:c, profit:d, ret:Math.abs(r-1)<1e-9?'crs':r<1?'drs':'irs'};
      out.textContent='';
      s='r = '+fmt(r,2)+': '+(Math.abs(r-1)<1e-9?'CRS, c = Kq is linear in q':(r<1?'DRS, c = Kq^(1/r) = Kq^'+fmt(e,2)+' is convex in q':'IRS, c = Kq^(1/r) = Kq^'+fmt(e,2)+' is concave in q'))+
        '\nat q = '+fmt(q,2)+': AC = '+fmt(AC,2)+', MC = '+fmt(MC,2)+', MC/AC = 1/r = '+fmt(e,2)+
        (Math.abs(r-1)<1e-9?': both flat':r<1?': MC above a rising AC':': MC below a falling AC')+
        '\nCRS plan (−t, t) at p = '+pair(p1,1,2)+': profit t(p₂ − p₁) = '+(Math.abs(d)<1e-9?'0':fmt(d,2)+'t')+', '+
        (Math.abs(d)<1e-9?'so every t ≥ 0 is optimal and π = 0':d>0?'so π = ∞ and there is no optimum':'so t* = 0 and π = 0');
      put(out,s);
    }
    /* the Try it steps read r, the probe q with AC and MC, and the CRS profit slope; set takes r, q and p1 */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('r' in s && rr) rr.set(+s.r);
        if('q' in s && rq) rq.set(+s.q);
        if('p1' in s && rp) rp.set(+s.p1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. One input: the highest iso profit line, and the convex profit function ---------- */
  NF.register('mi7-profit',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* f(z) = sqrt(z): z* = (P/2p)^2, q* = P/2p, pi = P^2/4p */
    var ZH=4, PH=3.2, W=520, H=0, A=null, B=null, el={}, st={P:2, p:1, z0:1}, cur={}, api=null, hs=null;
    var rP=range(fig,'P',2,function(v){ st.P=v; update(); }), rp=range(fig,'p',2,function(v){ st.p=v; update(); });
    if(rP) st.P=rP.v();
    if(rp) st.p=rp.v();
    function zs(){ var k=st.P/(2*st.p); return k*k; }
    function setZ(v,snap){
      var o=zs(); v=clamp(v,0.01,ZH);
      if(snap && Math.abs(A.xs(v)-A.xs(o))<snap) v=o;
      st.z0=v; update();
    }
    function draw(){
      var c2, h=200, rows, top;
      W=measure(svg); c2=cols(W); frame(svg,W,900);
      rows=key(S('g',null,svg),[['line','mi7-iso','iso profit line at z*'],['line','mi7-iso0','through the plan z⁰'],['line','mi7-pi','π(P, p) = P²/4p'],['line','mi7-plan','fixed plan: Pq⁰ − pz⁰']],40,12,W-14);
      top=12+16*(rows-1)+14;
      if(c2){
        A=box(svg,c2[0][0],c2[0][1],top,top+h,[0,ZH],[0,2.6],'input z','output q',{sx:1,sy:0.5});
        B=box(svg,c2[1][0],c2[1][1],top,top+h,[0,PH],[-1,3.5],'output price P','profit',{sx:1,sy:1});
        H=top+h+24;
      } else {
        A=box(svg,40,W-14,top,top+h,[0,ZH],[0,2.6],'input z','output q',{sx:1,sy:0.5});
        B=box(svg,40,W-14,top+h+44,top+2*h+44,[0,PH],[-1,3.5],'output price P','profit',{sx:1,sy:1});
        H=top+2*h+68;
      }
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      S('path',{d:pathOf(curve(function(z){ return Math.sqrt(z); },0,ZH,200).map(function(p,i){ var z=ZH*Math.pow(i/200,2); return [z,Math.sqrt(z)]; }),A),'class':'mi7-f'},A.gc);
      text(svg,A.xs(ZH)-4,A.ys(2)+16,'q = f(z) = √z','mi7-tg nf-halo','end');
      el.iso0=line(A.gc,0,0,0,0,'mi7-iso0');
      el.iso=line(A.gc,0,0,0,0,'mi7-iso');
      el.opt=S('circle',{r:5,'class':'mi7-rdot'},A.gc);
      el.ol=text(svg,0,0,'z*','mi7-tr nf-halo mi7-it');
      el.pi=S('path',{'class':'mi7-pi'},B.gc);
      el.plan=line(B.gc,0,0,0,0,'mi7-plan');
      el.gap=line(B.gc,0,0,0,0,'mi7-gap');
      el.slope=line(B.gc,0,0,0,0,'mi7-slope');
      el.touch=S('circle',{r:4.5,'class':'mi7-odot'},B.gc);
      el.pd=S('circle',{r:5,'class':'mi7-dot'},B.gc);
      hs=handle(svg,'mi7-ko','Plan z0 on the production function, arrow keys move it',function(dx,dy,b){ setZ(st.z0+(dx||dy)*(b?0.25:0.05),0); });
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var P=st.P, p=st.p, z=zs(), q=Math.sqrt(z), pi=P*P/(4*p), z0=st.z0, q0=Math.sqrt(z0), pb=P*q0-p*z0, P0=2*p*q0, isOpt=Math.abs(z0-z)<1e-9, s, y1, y2;
      /* iso profit lines q = π/P + (p/P) z */
      setLine(el.iso,A.xs(0),A.ys(pi/P),A.xs(ZH),A.ys(pi/P+p/P*ZH));
      setLine(el.iso0,A.xs(0),A.ys(pb/P),A.xs(ZH),A.ys(pb/P+p/P*ZH)); vis(el.iso0,!isOpt);
      at(el.opt,A.xs(z),A.ys(q));
      moveTo(el.ol,A.xs(z)+8,A.ys(q)+16,'start');
      place(hs,A.xs(z0),A.ys(q0),z0,'z0 = '+fmt(z0,2)+', q0 = '+fmt(q0,2));
      el.pi.setAttribute('d',pathOf(curve(function(x){ return x*x/(4*p); },0,PH,160),B));
      setLine(el.plan,B.xs(0),B.ys(-p*z0),B.xs(PH),B.ys(PH*q0-p*z0));
      y1=pi; y2=pb;
      setLine(el.gap,B.xs(P),B.ys(y1),B.xs(P),B.ys(y2)); vis(el.gap,!isOpt);
      setLine(el.slope,B.xs(P-0.45),B.ys(pi-0.45*q),B.xs(P+0.45),B.ys(pi+0.45*q));
      at(el.pd,B.xs(P),B.ys(pi));
      at(el.touch,B.xs(P0),B.ys(P0*P0/(4*p))); vis(el.touch,P0<=PH);
      cur={P:P, p:p, zs:z, qs:q, pi:pi, z0:z0, q0:q0, pb:pb, P0:P0, opt:isOpt, dpdP:q, dpdp:-z};
      out.textContent='';
      s='P = '+fmt(P,2)+', p = '+fmt(p,2)+': Pf′(z) = p at z* = (P/2p)² = '+fmt(z,2)+', q* = '+fmt(q,2)+', π(P, p) = P²/4p = '+fmt(pi,2)+
        '\nplan z⁰ = '+fmt(z0,2)+', q⁰ = '+fmt(q0,2)+' earns Pq⁰ − pz⁰ = '+fmt(pb,2)+(isOpt?' = π: it is the optimum':(pi-pb>=5e-3?' < π':' ≈ π')+', on a lower iso profit line')+
        '\nas a fixed plan its profit is linear in P and touches the convex π at P⁰ = 2pq⁰ = '+fmt(P0,2)+(P0>PH?', off the plot':'')+
        '\nHotelling: ∂π/∂P = P/2p = '+fmt(q,2)+' = q*   ∂π/∂p = −P²/4p² = '+fmt(-z,2)+' = −z*';
      put(out,s);
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[A.xs(st.z0),A.ys(Math.sqrt(st.z0))]]; },
      function(i,x){ setZ(A.xs.inv(x),8); },function(){ return [hs]; });
    /* the Try it steps read prices, the optimum, the plan and its profit; set takes P, p, z0 and probe=opt */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('P' in s && rP) rP.set(+s.P);
        if('p' in s && rp) rp.set(+s.p);
        if('z0' in s){ st.z0=clamp(+s.z0,0.01,ZH); update(); }
        if(s.probe==='opt'){ st.z0=zs(); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. Conditional and unconditional factor demand (Le Chatelier), and Shephard on c ---------- */
  NF.register('mi7-factor',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* Cobb Douglas f = z1^a z2^b with a = 0.25, b = 0.35, output price P = 3 and p2 = 0.8 */
    var a=0.25, b=0.35, r=a+b, P=3, P2=0.8, PL=0.6, PH=2.6, W=520, H=0, A=null, B=null, el={}, st={p0:1.3, p1:1.8}, cur={}, api=null;
    var KK=r*Math.pow(Math.pow(a,a)*Math.pow(b,b),-1/r);
    var r0=range(fig,'p0',2,function(v){ st.p0=v; draw(); }), r1=range(fig,'p1',2,function(v){ st.p1=v; update(); });
    if(r0) st.p0=r0.v();
    if(r1) st.p1=r1.v();
    function K(p1){ return KK*Math.pow(p1,a/r)*Math.pow(P2,b/r); }
    function qs(p1){ return Math.pow(r*P/K(p1),r/(1-r)); }
    function z1(p1,q){ return Math.pow(q,1/r)*Math.pow(a*P2/(b*p1),b/r); }
    function z2(p1,q){ return Math.pow(q,1/r)*Math.pow(b*p1/(a*P2),a/r); }
    function cost(p1,q){ return K(p1)*Math.pow(q,1/r); }
    function draw(){
      var c2, h=210, rows, top, q0=qs(st.p0), Z1=z1(st.p0,q0), Z2=z2(st.p0,q0), lo=Infinity, hi=-Infinity, i, x, sy, yd, t0;
      W=measure(svg); c2=cols(W); frame(svg,W,900);
      rows=key(S('g',null,svg),[['line','mi7-cond','conditional z₁(p₁, q⁰)'],['line','mi7-unc','unconditional z₁*(p₁)'],['line','mi7-c','c(p₁, p₂, q⁰)'],['line','mi7-plan','cost of the old bundle z⁰']],40,12,W-14);
      top=12+16*(rows-1)+14;
      for(i=0;i<=60;i++){ x=PL+(PH-PL)*i/60; lo=Math.min(lo,cost(x,q0)); hi=Math.max(hi,x*Z1+P2*Z2); }
      sy=niceStep(hi-lo,4); yd=[Math.floor(lo/sy)*sy,Math.ceil(hi/sy)*sy];
      if(c2){
        A=box(svg,c2[0][0],c2[0][1],top,top+h,[0,2],[0.5,2.7],'z₁','p₁',{sx:0.5,sy:0.5});
        B=box(svg,c2[1][0],c2[1][1],top,top+h,[0.5,2.7],yd,'p₁','cost of q⁰',{sx:0.5});
        H=top+h+24;
      } else {
        A=box(svg,40,W-14,top,top+h,[0,2],[0.5,2.7],'z₁','p₁',{sx:0.5,sy:0.5});
        t0=top+h+44;
        B=box(svg,40,W-14,t0,t0+h,[0.5,2.7],yd,'p₁','cost of q⁰',{sx:0.5});
        H=t0+h+24;
      }
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      S('path',{d:pathOf(curve(function(p){ return p; },PL,PH,200).map(function(v){ return [z1(v[0],q0),v[0]]; }),A),'class':'mi7-cond'},A.gc);
      S('path',{d:pathOf(curve(function(p){ return p; },PL,PH,200).map(function(v){ return [z1(v[0],qs(v[0])),v[0]]; }),A),'class':'mi7-unc'},A.gc);
      el.h=line(A.gc,0,0,0,0,'nf-guide');
      el.v=line(A.gc,0,0,0,0,'mi7-gap');
      el.se=vec(A.gc,'mi7-se','mi7-seh');
      el.oe=vec(A.gc,'mi7-oe','mi7-oeh');
      el.ref=S('circle',{r:4.5,'class':'mi7-kdot'},A.gc);
      el.cp=S('circle',{r:4.5,'class':'mi7-edot'},A.gc);
      el.up=S('circle',{r:4.5,'class':'mi7-rdot'},A.gc);
      el.rl=text(svg,A.xs(Z1)+9,A.ys(st.p0)-7,'p₁⁰','nf-lab nf-halo');
      S('path',{d:pathOf(curve(function(p){ return cost(p,q0); },PL,PH,200),B),'class':'mi7-c'},B.gc);
      S('path',{d:pathOf([[PL,PL*Z1+P2*Z2],[PH,PH*Z1+P2*Z2]],B),'class':'mi7-plan'},B.gc);
      at(S('circle',{r:4.5,'class':'mi7-rdot'},B.gc),B.xs(st.p0),B.ys(cost(st.p0,q0)));
      el.bg=line(B.gc,0,0,0,0,'mi7-gap');
      el.bo=S('circle',{r:4,'class':'mi7-oring'},B.gc);
      el.bc=S('circle',{r:4.5,'class':'mi7-dot'},B.gc);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var p0=st.p0, p1=st.p1, q0=qs(p0), Z1=z1(p0,q0), Z2=z2(p0,q0), zc=z1(p1,q0), qn=qs(p1), zu=z1(p1,qn), c0=cost(p0,q0), c1=cost(p1,q0), old=p1*Z1+P2*Z2,
          dsub=-(b/r)*Z1/p0, dzq=Z1/(r*q0), dqP=(r/(1-r))*q0/P, dout=-dzq*dzq*dqP, Y=A.ys(p1), s;
      setLine(el.h,A.x0,Y,A.x1,Y);
      setLine(el.v,A.xs(Z1),A.ys(p0),A.xs(Z1),Y);
      setVec(el.se,A.xs(Z1),Y,A.xs(zc),Y);
      setVec(el.oe,A.xs(zc),Y,A.xs(zu),Y);
      at(el.ref,A.xs(Z1),A.ys(p0)); at(el.cp,A.xs(zc),Y); at(el.up,A.xs(zu),Y);
      setLine(el.bg,B.xs(p1),B.ys(c1),B.xs(p1),B.ys(old));
      at(el.bo,B.xs(p1),B.ys(old)); at(el.bc,B.xs(p1),B.ys(c1));
      cur={p0:p0, p1:p1, q0:q0, z10:Z1, z20:Z2, zc:zc, zu:zu, qn:qn, sub:dsub, out:dout, total:dsub+dout, c0:c0, c1:c1, old:old};
      out.textContent='';
      s='p₁⁰ = '+fmt(p0,2)+': q⁰ = q*(p⁰) = '+fmt(q0,2)+', z⁰ = '+pair(Z1,Z2,2)+', c = '+fmt(c0,2)+
        '\nslopes at p₁⁰: ∂z₁*/∂p₁ = '+fmt(dsub+dout,3)+' = substitution '+fmt(dsub,3)+' + output effect '+fmt(dout,3)+
        '\np₁ = '+fmt(p1,2)+': conditional z₁ = '+fmt(zc,2)+' (change '+fmt(zc-Z1,2)+'), unconditional z₁* = '+fmt(zu,2)+' (change '+fmt(zu-Z1,2)+', q* = '+fmt(qn,2)+')'+
        '\nc(p₁, p₂, q⁰) = '+fmt(c1,2)+(old-c1>=5e-3?' < ':' = ')+'old bundle cost '+fmt(old,2)+'; c has slope z₁⁰ = '+fmt(Z1,2)+' at p₁⁰ (Shephard)';
      put(out,s);
    }
    /* the Try it steps read the reference point, the slopes there and the two demands at p1; set takes p0 and p1 */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('p0' in s && r0) r0.set(+s.p0);
        if('p1' in s && r1) r1.set(+s.p1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. Cost curves and supply with a fixed cost ---------- */
  NF.register('mi7-supply',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* C(q) = F + 2q - q^2 + q^3/3 for q > 0: MC = 1 + (q - 1)^2, AVC = 2 - q + q^2/3 (min 1.25 at q = 1.5) */
    var QH=3.2, YH=4, W=520, H=0, A=null, B=null, el={}, st={P:2.5, F:1, fc:'avoid'}, cur={}, api=null;
    var rP=range(fig,'P',2,function(v){ st.P=v; update(); }), rF=range(fig,'F',1,function(v){ st.F=v; update(); });
    if(rP) st.P=rP.v();
    if(rF) st.F=rF.v();
    st.fc=seg(fig,'data-fc',function(v){ st.fc=v; update(); }) || 'avoid';
    function MC(q){ return 1+(q-1)*(q-1); }
    function AVC(q){ return 2-q+q*q/3; }
    function AC(q){ return st.F/q+AVC(q); }
    /* min AC solves 2q^3/3 - q^2 - F = 0 on q >= 1.5 */
    function minAC(){
      var lo=1.5, hi=6, m, i;
      if(st.F<=0) return [1.5,1.25];
      for(i=0;i<80;i++){ m=(lo+hi)/2; if(2*m*m*m/3-m*m-st.F>0) hi=m; else lo=m; }
      m=(lo+hi)/2; return [m,AC(m)];
    }
    function draw(){
      var c2, h=210;
      W=measure(svg); c2=cols(W); frame(svg,W,800);
      if(c2){
        A=box(svg,c2[0][0],c2[0][1],8,8+h,[0,QH],[0,YH],'q','cost per unit',{sx:0.5,sy:1});
        B=box(svg,c2[1][0],c2[1][1],8,8+h,[0,QH],[0,YH],'q','P',{sx:0.5,sy:1});
        H=8+h+24;
      } else {
        A=box(svg,40,W-14,8,8+h,[0,QH],[0,YH],'q','cost per unit',{sx:0.5,sy:1});
        B=box(svg,40,W-14,8+h+44,8+2*h+44,[0,QH],[0,YH],'q','P',{sx:0.5,sy:1});
        H=8+2*h+68;
      }
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      el.rect=S('path',{'class':'mi7-gain'},A.gc);
      S('path',{d:pathOf(curve(AVC,0,QH,200),A),'class':'mi7-avc'},A.gc);
      el.ac=S('path',{'class':'mi7-ac'},A.gc);
      S('path',{d:pathOf(curve(MC,0,QH,200),A),'class':'mi7-mcs'},A.gc);
      el.price=line(A.gc,0,0,0,0,'mi7-price');
      el.avcd=S('circle',{r:4,'class':'mi7-mdot'},A.gc);
      el.acd=S('circle',{r:4.5,'class':'mi7-dot'},A.gc);
      el.pmin=S('circle',{r:4.5,'class':'mi7-xring'},A.gc);
      el.qd=S('circle',{r:5,'class':'mi7-gdot'},A.gc);
      text(svg,A.xs(2.75)+6,A.ys(MC(2.75))+4,'MC','mi7-tr nf-halo');
      el.acl=text(svg,0,0,'AC','mi7-tb nf-halo','end');
      text(svg,A.x1-4,A.ys(AVC(QH))+14,'AVC','mi7-tm nf-halo','end');
      el.pl=text(svg,A.x0+6,0,'','nf-lab nf-halo');
      S('path',{d:pathOf(curve(function(P){ return P; },1,YH,200).map(function(v){ return [1+Math.sqrt(v[0]-1),v[0]]; }),B),'class':'mi7-unused'},B.gc);
      el.sup=S('path',{'class':'mi7-sup'},B.gc);
      el.jump=line(B.gc,0,0,0,0,'mi7-jump');
      el.hole=S('circle',{r:4.5,'class':'mi7-ring'},B.gc);
      el.land=S('circle',{r:4.5,'class':'mi7-gdot'},B.gc);
      el.bh=line(B.gc,0,0,0,0,'nf-guide');
      el.bd=S('circle',{r:5,'class':'mi7-gdot'},B.gc);
      el.jl=text(svg,0,0,'','mi7-to nf-halo');
      text(svg,B.x1-4,B.ys(YH)+14,'supply q(P)','mi7-tg nf-halo','end');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var P=st.P, Fc=st.F, m=minAC(), sunk=st.fc==='sunk', thr=sunk?1.25:m[1], qt=sunk?1.5:m[0], qr=P>=1?1+Math.sqrt(P-1):NaN, ql=P>=1 && P<=2?1-Math.sqrt(P-1):NaN,
          make=P>=thr-1e-9, qx=isFinite(qr)?qr:0, acq=isFinite(qr)?AC(qr):NaN, prof=isFinite(qr)?(P-acq)*qr:NaN, s, sp, top, X0, X1;
      el.ac.setAttribute('d',pathOf(curve(AC,Math.max(0.02,Fc/(YH*1.6)),QH,300),A));
      moveTo(el.acl,A.x1-4,A.ys(AC(QH))-6);
      setLine(el.price,A.x0,A.ys(P),A.x1,A.ys(P));
      moveTo(el.pl,A.x0+6,A.ys(P)-6); el.pl.textContent='P = '+fmt(P,2);
      at(el.avcd,A.xs(1.5),A.ys(1.25)); at(el.acd,A.xs(m[0]),A.ys(m[1]));
      /* the profit rectangle (P − AC) q at the rising root of P = MC */
      if(isFinite(qr) && qr<=QH){
        el.rect.setAttribute('d',poly([[A.xs(0),A.ys(P)],[A.xs(qr),A.ys(P)],[A.xs(qr),A.ys(Math.min(acq,YH*1.2))],[A.xs(0),A.ys(Math.min(acq,YH*1.2))]])+'Z');
        el.rect.setAttribute('class',prof>=0?'mi7-gain':'mi7-loss'); show(el.rect);
        at(el.qd,A.xs(qr),A.ys(P)); show(el.qd);
        el.qd.setAttribute('class',make?'mi7-gdot':'mi7-xring');
      } else { hide(el.rect); hide(el.qd); }
      vis(el.pmin,isFinite(ql) && ql>0.02); if(isFinite(ql)) at(el.pmin,A.xs(ql),A.ys(P));
      /* supply: 0 below the threshold, a jump to qt, then the rising MC branch */
      top=YH*1.2;
      el.sup.setAttribute('d',pathOf([[0,0],[0,thr],null,[qt,thr]].concat(curve(function(v){ return v; },thr,top,160).map(function(v){ return [1+Math.sqrt(v[0]-1),v[0]]; })),B));
      setLine(el.jump,B.xs(0),B.ys(thr),B.xs(qt),B.ys(thr));
      at(el.hole,B.xs(0),B.ys(thr)); at(el.land,B.xs(qt),B.ys(thr));
      el.jl.textContent='jump at P = '+(sunk?'min AVC':'min AC')+' = '+fmt(thr,2);
      moveTo(el.jl,B.x0+10,B.ys(thr)-7,'start');
      setLine(el.bh,B.x0,B.ys(P),B.x1,B.ys(P));
      at(el.bd,B.xs(make?qx:0),B.ys(P));
      cur={P:P, F:Fc, fc:st.fc, thr:thr, qt:qt, minac:m[1], qminac:m[0], q:make?qx:0, produce:make, profit:make?prof:(sunk?-Fc:0), qlow:isFinite(ql)?ql:'n/a'};
      out.textContent='';
      if(!isFinite(qr)){
        s='P = '+fmt(P,2)+' < min MC = 1: no q has P = MC, profit falls with q, so q = 0';
      } else {
        s='P = '+fmt(P,2)+': P = MC on the rising branch at q = '+fmt(qr,2)+', where AC = '+fmt(acq,2)+' and AVC = '+fmt(AVC(qr),2);
        sp='\nprofit there (P − AC)q = '+fmt(prof,2);
        if(sunk) sp+=make?(prof>=0?' ≥ 0: produce':', but P ≥ AVC: produce, since the loss beats −F = '+fmt(-Fc,2)+' from shutting down'):', and P < min AVC: shut down and lose the sunk F = '+fmt(Fc,2);
        else sp+=make?' ≥ 0: produce':' < 0: shut down, avoid F and earn 0';
        s+=sp;
      }
      s+='\nfixed cost '+(sunk?'sunk: the threshold is min AVC = 1.25 at q = 1.50':'avoidable: shut down below min AC = '+fmt(m[1],2)+' at q = '+fmt(m[0],2)+' (min AVC = 1.25)');
      if(isFinite(ql) && ql>0.02) s+='\nthe other root q = '+fmt(ql,2)+' has MC falling: π″ = −C″ > 0 there, a profit minimum';
      put(out,s);
    }
    /* the Try it steps read the price, the threshold, the choice and its profit; set takes P, F and fc */
    api=NF.api({
      get:function(){ return copy(cur); },
      set:function(s){
        if('fc' in s) NF.press(fig,'data-fc',String(s.fc));
        if('F' in s && rF) rF.set(+s.F);
        if('P' in s && rP) rP.set(+s.P);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
