/* Core Micro L4 figures: Marshallian against Hicksian demand, net against gross cross effects, CV and EV in the goods
   plane, CV, consumer surplus and EV as areas, how close consumer surplus gets, price indices against the true cost of
   living, and when individual demands add up. Every number is computed from the stated model.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi4.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  /* signed number: a plus for positives, the Unicode minus for negatives */
  function sg(v,d){ var s=fmt(v,d); return (v>0 && parseFloat(Math.abs(v).toFixed(d))!==0?'+':'')+s; }
  function paren(v,d){ return v<0 && parseFloat(Math.abs(v).toFixed(d))!==0?'('+fmt(v,d)+')':fmt(v,d); }
  function ticks(lo,hi,step){ var a=[], v; for(v=Math.ceil(lo/step-1e-9)*step; v<=hi+1e-9; v+=step) a.push(Math.round(v*1000)/1000); return a; }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  /* grid, axis lines and tick labels for the box b = {L, Rr, T, B}; the x name sits right of the axis end,
     the y name (or the panel title) above the axis */
  function axes(g,b,xs,ys,xt,yt,xname,yname,yfmt){
    var i, v, X, Y;
    for(i=0;i<xt.length;i++){
      v=xt[i]; X=xs(v);
      if(X<b.L-0.5 || X>b.Rr+0.5) continue;
      if(Math.abs(X-b.L)>1) line(g,C(X),b.T,C(X),b.B,'nf-grid');
      text(g,X,b.B+15,tl(v),null,'middle');
    }
    for(i=0;i<yt.length;i++){
      v=yt[i]; Y=ys(v);
      if(Y<b.T-0.5 || Y>b.B+0.5) continue;
      if(Math.abs(Y-b.B)>1) line(g,b.L,C(Y),b.Rr,C(Y),v===0?'nf-ax':'nf-grid');
      text(g,b.L-6,Y+4,yfmt?yfmt(v):tl(v),null,'end');
    }
    line(g,b.L,C(b.B),b.Rr,C(b.B),'nf-ax'); line(g,C(b.L),b.T,C(b.L),b.B,'nf-ax');
    if(xname) text(g,b.Rr+5,b.B+4,xname,'nf-title mi4-it');
    if(yname) text(g,b.L-34,b.T-9,yname,'nf-title');
  }
  /* a path through model points [x, y]; a point that is not finite breaks the line, far points are pinned */
  function pth(pts,xs,ys){
    var d='', run=false, i, q;
    for(i=0;i<pts.length;i++){
      q=pts[i];
      if(!q || !isFinite(q[0]) || !isFinite(q[1])){ run=false; continue; }
      d+=(run?'L':'M')+R(clamp(xs(q[0]),-3000,5000))+','+R(clamp(ys(q[1]),-3000,5000));
      run=true;
    }
    return d;
  }
  /* sample f on [a, b]: points [t, f(t)] */
  function samp(f,a,b,n){ var p=[], i, t; for(i=0;i<=n;i++){ t=a+(b-a)*i/n; p.push([t,f(t)]); } return p; }
  function simpson(f,a,b,n){ var h=(b-a)/n, s=f(a)+f(b), i; for(i=1;i<n;i++) s+=(i%2?4:2)*f(a+i*h); return s*h/3; }
  /* arrows: one head, two heads, or a head at the end of a path */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  function head(x1,y1,ux,uy,hl){ var bx=x1-ux*hl, by=y1-uy*hl; return poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z'; }
  function setDbl(v,x,y0,y1){
    var len=Math.abs(y1-y0), u=y1>y0?1:-1, hl;
    if(len<7){ setLine(v.l,x,y0,x,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return false; }
    v.l.removeAttribute('visibility'); hl=Math.min(7,len*0.4);
    setLine(v.l,x,y0+u*(hl-1),x,y1-u*(hl-1));
    v.h.setAttribute('d',head(x,y1,0,u,hl)+head(x,y0,0,-u,hl));
    return true;
  }
  function pathVec(g,cls,hcls){ return {l:S('path',{'class':cls},g), h:S('path',{'class':hcls},g)}; }
  /* an arrow along a curve: px points in svg units, the head at the last one */
  function setPathVec(v,P){
    var n=P.length, i, dx, dy, len=0, ux, uy, k;
    for(i=1;i<n;i++) len+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
    if(n<2 || len<9){ v.l.setAttribute('d',''); v.h.setAttribute('d',''); return false; }
    for(k=n-2;k>0 && Math.hypot(P[n-1][0]-P[k][0],P[n-1][1]-P[k][1])<6;k--);
    dx=P[n-1][0]-P[k][0]; dy=P[n-1][1]-P[k][1]; len=Math.hypot(dx,dy)||1; ux=dx/len; uy=dy/len;
    var Q=P.slice(0,n-1).concat([[P[n-1][0]-ux*7,P[n-1][1]-uy*7]]);
    v.l.setAttribute('d',poly(Q)); v.h.setAttribute('d',head(P[n-1][0],P[n-1][1],ux,uy,8));
    return true;
  }
  /* drag on the plot: grab(p) gives a token when the pointer at svg point p takes hold of something, or null;
     move(token, p) applies the drag. A touch that grabs nothing scrolls the page as usual. */
  function drag(svg,size,grab,move){
    var cur=null;
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), k=grab(p);
      if(k===null) return;
      cur=k; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag'); move(cur,p);
    });
    svg.addEventListener('pointermove',function(e){ if(cur===null) return; var s=size(); move(cur,local(svg,e,s[0],s[1])); });
    function stop(){ cur=null; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(grab(local(svg,e.touches[0],s[0],s[1]))!==null) e.preventDefault();
    },{passive:false});
  }
  function inBox(b,p,pad){ return p[0]>=b.L-pad && p[0]<=b.Rr+pad && p[1]>=b.T-pad && p[1]<=b.B+pad; }
  /* two plot boxes, side by side when the figure is wide enough, else one above the other */
  function two(W,top,ph){
    var mL=40, mR=22, gap=58, pw;
    if(W>=540){
      pw=(W-2*mL-2*mR)/2;
      return {side:true, a:{L:mL,Rr:mL+pw,T:top,B:top+ph}, b:{L:2*mL+mR+pw,Rr:W-mR,T:top,B:top+ph}, H:top+ph+26};
    }
    return {side:false, a:{L:mL,Rr:W-mR,T:top,B:top+ph}, b:{L:mL,Rr:W-mR,T:top+ph+gap,B:top+2*ph+gap}, H:top+2*ph+gap+26};
  }

  /* ---------- 1. Marshallian and Hicksian demand through the same point ----------
     p2 = 1 throughout. nor: u = 2 sqrt(x1 x2), w = 100. inf: the Gorman form e = 40 p1 + u (2 sqrt(p1 p2) - p1), w = 150,
     inferior for 1 < p1 < 4. gif: u = ln(x1 - 1) - 2.5 ln(9.5 - x2), w = 10 (Haagsma 2012), Giffen for p1 > 1/2. */
  function gorV(p,w){ return (w-40*p)/(2*Math.sqrt(p)-p); }
  function gorH(p,u){ return 40+u*(1/Math.sqrt(p)-1); }
  function gifX(p,w){ return (5*p+19-2*w)/(3*p); }
  var DM={
    nor:{w:100, p0:1, xr:[0,120], xt:20, plo:0.25, phi:3.4,
      x:function(p,w){ return w/(2*p); },
      v:function(p,w){ return w/Math.sqrt(p); },
      h:function(p,u){ return u/(2*Math.sqrt(p)); }},
    inf:{w:150, p0:2, xr:[0,60], xt:10, plo:0.25, phi:3.7,
      x:function(p,w){ return gorH(p,gorV(p,w)); }, v:gorV, h:gorH},
    gif:{w:10, p0:2, xr:[1,2.2], xt:0.2, plo:0.52, phi:3.4,
      x:gifX,
      v:function(p,w){ var a=gifX(p,w); return Math.log(a-1)-2.5*Math.log(9.5-(w-p*a)); },
      h:function(p,u){ return 1+Math.exp(-(u+2.5*Math.log(2.5*p))/1.5); }}
  };
  NF.register('mi4-demand',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='nor', p=1, W=520, H=340, el={}, b, xs, ys, api;
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    pre=seg(fig,'data-pre',function(v){ if(!DM[v]||v===pre) return; pre=v; if(rp) rp.set(DM[v].p0); draw(); });
    if(!DM[pre]) pre='nor';
    if(rp) p=rp.v();
    function state(){
      var m=DM[pre], w=m.w, d=1e-5, hw=w*1e-6, x=m.x(p,w), u=m.v(p,w),
          tot=(m.x(p+d,w)-m.x(p-d,w))/(2*d), se=(m.h(p+d,u)-m.h(p-d,u))/(2*d), dw=(m.x(p,w+hw)-m.x(p,w-hw))/(2*hw);
      return {x:x, u:u, tot:tot, se:se, dw:dw, ie:-x*dw, w:w};
    }
    function draw(){
      var m=DM[pre], g, rows, PH, T;
      W=measure(svg); frame(svg,W,500);
      rows=key(S('g',null,svg),[['line','mi4-mx','x₁(p, w), Marshallian'],['line','mi4-hu','h₁(p, ū), Hicksian']],40,12,W-8);
      T=rows*16+30; PH=Math.round(clamp((W-64)*0.56,200,290));
      b={L:40, Rr:W-24, T:T, B:T+PH}; H=b.B+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(m.xr[0],m.xr[1],b.L,b.Rr); ys=lin(0,3.2,b.B,b.T);
      g=S('g',null,svg);
      axes(g,b,xs,ys,ticks(m.xr[0],m.xr[1],m.xt),ticks(0,3,0.5),'x₁','p₁');
      var gc=clip(svg,b.L,b.T-2,b.Rr-b.L,b.B-b.T+2);
      el.gh=line(gc,0,0,0,0,'mi4-guide'); el.gv=line(gc,0,0,0,0,'mi4-guide');
      el.x=S('path',{'class':'mi4-mx'},gc); el.h=S('path',{'class':'mi4-hu'},gc);
      el.dot=S('circle',{r:5,'class':'mi4-pt'},svg);
      update();
    }
    function update(){
      var m=DM[pre], st=state(), X, Y, s, e11, eh, b1, e1w, verdict;
      el.x.setAttribute('d',pth(samp(function(q){ return m.x(q,m.w); },m.plo,m.phi,280).map(function(a){ return [a[1],a[0]]; }),xs,ys));
      el.h.setAttribute('d',pth(samp(function(q){ return m.h(q,st.u); },m.plo,m.phi,280).map(function(a){ return [a[1],a[0]]; }),xs,ys));
      X=xs(st.x); Y=ys(p);
      setLine(el.gh,b.L,Y,X,Y); setLine(el.gv,X,Y,X,b.B);
      at(el.dot,X,Y);
      if(api) api.changed();
      if(!out) return;
      e11=st.tot*p/st.x; eh=st.se*p/st.x; b1=p*st.x/st.w; e1w=st.dw*st.w/st.x;
      if(st.tot>0) verdict='Giffen: IE > |SE|, so x₁ rises with its own price';
      else if(st.dw<0) verdict='inferior: IE > 0 offsets SE, so x₁ is steeper than h₁ in the (x₁, p₁) plane';
      else verdict='normal: IE ≤ 0 reinforces SE, so x₁ is flatter than h₁ in the (x₁, p₁) plane';
      s='p̄₁ = '+fmt(p,2)+'   x̄₁ = '+fmt(st.x,2)+'   ū = v(p, w) = '+fmt(st.u,2)+
        '\nslope of x₁ in p₁ = '+fmt(st.tot,2)+' = SE '+fmt(st.se,2)+' + IE '+sg(st.ie,2)+
        '\nε₁₁ = '+fmt(e11,2)+' = εʰ₁₁ − b₁ε₁w = '+fmt(eh,2)+' − '+fmt(b1,2)+' × '+paren(e1w,2)+
        '\n'+verdict;
      out.textContent=s;
    }
    drag(svg,function(){ return [W,H]; },function(q){ return b && q[0]>=b.L-8 && q[0]<=b.Rr+8 && Math.abs(q[1]-ys(p))<20 ? 1 : null; },
      function(k,q){ if(rp) rp.set(ys.inv(q[1])); });
    /* state for a Try it panel: the good, the crossing point and the three slopes */
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, p:p, x:st.x, u:st.u, tot:st.tot, se:st.se, ie:st.ie}; },
      set:function(st){ if('pre' in st) NF.press(fig,'data-pre',String(st.pre)); if('p' in st && rp) rp.set(+st.p); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Net against gross cross price effects ----------
     cd: u = 2 sqrt(x1 x2), w = 100. ql: u = ln x1 + x2, w = 4 (interior while x2 > 0). */
  var NG={
    cd:{w:100, yr:150, yt:25,
      x:function(p1,p2,w){ return [w/(2*p1), w/(2*p2)]; },
      v:function(p1,p2,w){ return w/Math.sqrt(p1*p2); },
      h:function(p1,p2,u){ return [u/2*Math.sqrt(p2/p1), u/2*Math.sqrt(p1/p2)]; }},
    ql:{w:4, yr:8, yt:2,
      x:function(p1,p2,w){ return [p2/p1, w/p2-1]; },
      v:function(p1,p2,w){ return Math.log(p2/p1)+w/p2-1; },
      h:function(p1,p2,u){ var b=u-Math.log(p2/p1); return [p2/p1, b>=0?b:NaN]; }}
  };
  NF.register('mi4-netgross',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='cd', p1=1, p2=1, W=520, H=340, el={}, L, xa, ya, xb, yb, api;
    var r1=range(fig,'p1',2,function(v){ p1=v; update(); });
    var r2=range(fig,'p2',2,function(v){ p2=v; update(); });
    if(r1) p1=r1.v();
    if(r2) p2=r2.v();
    pre=seg(fig,'data-pre',function(v){ if(!NG[v]||v===pre) return; pre=v; draw(); });
    if(!NG[pre]) pre='cd';
    function state(){
      var m=NG[pre], w=m.w, d=1e-5, hw=w*1e-6, x=m.x(p1,p2,w), u=m.v(p1,p2,w), J=[[0,0],[0,0]], dW=[0,0], Sm=[[0,0],[0,0]], i, k,
          a1=m.x(p1+d,p2,w), b1=m.x(p1-d,p2,w), a2=m.x(p1,p2+d,w), b2=m.x(p1,p2-d,w), aw=m.x(p1,p2,w+hw), bw=m.x(p1,p2,w-hw);
      for(i=0;i<2;i++){ J[i][0]=(a1[i]-b1[i])/(2*d); J[i][1]=(a2[i]-b2[i])/(2*d); dW[i]=(aw[i]-bw[i])/(2*hw); }
      /* the Slutsky matrix from Marshallian demand alone */
      for(i=0;i<2;i++) for(k=0;k<2;k++) Sm[i][k]=J[i][k]+dW[i]*x[k];
      return {x:x, u:u, J:J, S:Sm, Sp:[Sm[0][0]*p1+Sm[0][1]*p2, Sm[1][0]*p1+Sm[1][1]*p2]};
    }
    function draw(){
      var m=NG[pre], g, rows, ph;
      W=measure(svg); frame(svg,W,700);
      rows=key(S('g',null,svg),[['line','mi4-mx','Marshallian x(p, w)'],['line','mi4-hu','Hicksian h(p, ū)']],40,12,W-8);
      ph=Math.round(clamp(W>=540?(W-124)/2*0.8:(W-62)*0.62,170,240));
      L=two(W,rows*16+34,ph);
      svg.setAttribute('viewBox','0 0 '+W+' '+L.H);
      H=L.H;
      xa=lin(0,3,L.a.L,L.a.Rr); ya=lin(0,m.yr,L.a.B,L.a.T);
      xb=lin(0,3,L.b.L,L.b.Rr); yb=lin(0,m.yr,L.b.B,L.b.T);
      g=S('g',null,svg);
      axes(g,L.a,xa,ya,ticks(0,3,0.5),ticks(0,m.yr,m.yt),'p₂','good 1 against p₂');
      axes(g,L.b,xb,yb,ticks(0,3,0.5),ticks(0,m.yr,m.yt),'p₁','good 2 against p₁');
      el.ga=clip(svg,L.a.L,L.a.T-2,L.a.Rr-L.a.L,L.a.B-L.a.T+2); el.gb=clip(svg,L.b.L,L.b.T-2,L.b.Rr-L.b.L,L.b.B-L.b.T+2);
      el.va=line(el.ga,0,0,0,0,'mi4-guide'); el.vb=line(el.gb,0,0,0,0,'mi4-guide');
      el.xa=S('path',{'class':'mi4-mx'},el.ga); el.ha=S('path',{'class':pre==='ql'?'mi4-hu mi4-hd':'mi4-hu'},el.ga);
      el.xb=S('path',{'class':'mi4-mx'},el.gb); el.hb=S('path',{'class':'mi4-hu'},el.gb);
      el.da=S('circle',{r:5,'class':'mi4-pt'},svg); el.db=S('circle',{r:5,'class':'mi4-pt'},svg);
      update();
    }
    function update(){
      var m=NG[pre], st=state(), s, g1, g2, cls;
      el.xa.setAttribute('d',pth(samp(function(q){ return m.x(p1,q,m.w)[0]; },0.2,3,200),xa,ya));
      el.ha.setAttribute('d',pth(samp(function(q){ return m.h(p1,q,st.u)[0]; },0.2,3,200),xa,ya));
      el.xb.setAttribute('d',pth(samp(function(q){ return m.x(q,p2,m.w)[1]; },0.2,3,200),xb,yb));
      el.hb.setAttribute('d',pth(samp(function(q){ return m.h(q,p2,st.u)[1]; },0.2,3,200),xb,yb));
      setLine(el.va,xa(p2),L.a.T,xa(p2),L.a.B); setLine(el.vb,xb(p1),L.b.T,xb(p1),L.b.B);
      at(el.da,xa(p2),ya(st.x[0])); at(el.db,xb(p1),yb(st.x[1]));
      if(api) api.changed();
      if(!out) return;
      g1=st.J[0][1]; g2=st.J[1][0];
      function kind(v){ return Math.abs(v)<5e-4?'neutral':v>0?'substitutes':'complements'; }
      cls=Math.abs(g1-g2)<5e-4?'gross '+kind(g1)+' both ways':'asymmetric: '+kind(g1)+' one way, '+kind(g2)+' the other';
      s='p = ('+fmt(p1,2)+', '+fmt(p2,2)+')   ū = '+fmt(st.u,2)+
        '\ngross: x₁ in p₂ = '+fmt(g1,2)+', x₂ in p₁ = '+fmt(g2,2)+', '+cls+
        '\nnet:   s₁₂ = '+fmt(st.S[0][1],2)+', s₂₁ = '+fmt(st.S[1][0],2)+', symmetric net '+kind(st.S[0][1])+
        '\nS = ['+fmt(st.S[0][0],2)+', '+fmt(st.S[0][1],2)+'; '+fmt(st.S[1][0],2)+', '+fmt(st.S[1][1],2)+']   Sp = ('+fmt(st.Sp[0],2)+', '+fmt(st.Sp[1],2)+')';
      out.textContent=s;
    }
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, p1:p1, p2:p2, g12:st.J[0][1], g21:st.J[1][0], s12:st.S[0][1], s21:st.S[1][0], s11:st.S[0][0], s22:st.S[1][1]}; },
      set:function(st){ if('pre' in st) NF.press(fig,'data-pre',String(st.pre)); if('p1' in st && r1) r1.set(+st.p1); if('p2' in st && r2) r2.set(+st.p2); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. CV and EV in the goods plane ----------
     u = 2 sqrt(x1 x2), w = 100, p2 = 1: v = w / sqrt(p1), e = u sqrt(p1), h = (u / (2 sqrt p1), u sqrt(p1) / 2).
     With p2 = 1 a budget line meets the x2 axis at its money, so CV and EV are gaps on that axis. */
  var CW=100, CX=180;
  function cdV(p){ return CW/Math.sqrt(p); }
  function cdE(p,u){ return u*Math.sqrt(p); }
  function cdH(p,u){ return [u/(2*Math.sqrt(p)), u*Math.sqrt(p)/2]; }
  NF.register('mi4-cvev',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var a0=2, a1=1, W=520, H=360, el={}, b, xs, ys, api;
    var r0=range(fig,'p0',2,function(v){ a0=v; update(); });
    var r1=range(fig,'p1',2,function(v){ a1=v; update(); });
    if(r0) a0=r0.v();
    if(r1) a1=r1.v();
    onClick(fig,'.mi4-swap',function(){ var t=a0; if(r0) r0.set(a1); if(r1) r1.set(t); });
    function state(){
      var u0=cdV(a0), u1=cdV(a1), ec=cdE(a1,u0), ee=cdE(a0,u1);
      return {u0:u0, u1:u1, ec:ec, ee:ee, cv:CW-ec, ev:ee-CW};
    }
    /* a label on a paper backing, so the curves under it do not cut through the numbers */
    function tag(t,bg,show,s,x,y){
      if(!show){ t.textContent=''; bg.setAttribute('width',0); return; }
      t.textContent=s; moveTo(t,x+3,y+4);
      bg.setAttribute('x',R(x)); bg.setAttribute('y',R(y-8)); bg.setAttribute('width',R(NF.tw(t,s)+6));
    }
    function icPts(u){ var lo=u*u/(4*CX*1.3), p=[], i, t, x; for(i=0;i<=260;i++){ t=i/260; x=lo+(CX*1.05-lo)*t*t; p.push([x,u*u/(4*x)]); } return p; }
    function draw(){
      var g, gc, rows, PH;
      W=measure(svg); frame(svg,W,600);
      rows=key(S('g',null,svg),[['line','mi4-u0','u⁰'],['line','mi4-u1','u¹'],['line','mi4-b0','old budget'],['line','mi4-b1','new budget'],
        ['line','mi4-cvl','new prices, reach u⁰'],['line','mi4-evl','old prices, reach u¹']],40,12,W-8);
      PH=Math.round(clamp((W-60)*0.72,230,330));
      b={L:40, Rr:W-22, T:rows*16+30}; b.B=b.T+PH; H=b.B+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0,CX,b.L,b.Rr); ys=lin(0,CX,b.B,b.T);
      g=S('g',null,svg);
      axes(g,b,xs,ys,ticks(0,CX,30),ticks(0,CX,30),'x₁','x₂ = money');
      gc=clip(svg,b.L,b.T-2,b.Rr-b.L,b.B-b.T+2);
      el.ic0=S('path',{'class':'mi4-u0'},gc); el.ic1=S('path',{'class':'mi4-u1'},gc);
      el.b0=line(gc,0,0,0,0,'mi4-b0'); el.b1=line(gc,0,0,0,0,'mi4-b1');
      el.cl=line(gc,0,0,0,0,'mi4-cvl'); el.el=line(gc,0,0,0,0,'mi4-evl');
      el.hc=S('circle',{r:3.5,'class':'mi4-oc'},gc); el.he=S('circle',{r:3.5,'class':'mi4-oe'},gc);
      el.x0=S('circle',{r:5,'class':'mi4-pt'},gc); el.x1=S('circle',{r:5,'class':'mi4-pe'},gc);
      el.cv=vec(svg,'mi4-acv','mi4-hcv'); el.ev=vec(svg,'mi4-aev','mi4-hev');
      el.bcv=S('rect',{rx:2,height:15,width:0,'class':'mi4-lbg'},svg); el.bev=S('rect',{rx:2,height:15,width:0,'class':'mi4-lbg'},svg);
      el.tcv=text(svg,0,0,'','mi4-tr mi4-big'); el.tev=text(svg,0,0,'','mi4-tb mi4-big');
      update();
    }
    function update(){
      var st=state(), h0=cdH(a1,st.u0), h1=cdH(a0,st.u1), y0=ys(CW), x;
      el.ic0.setAttribute('d',pth(icPts(st.u0),xs,ys)); el.ic1.setAttribute('d',pth(icPts(st.u1),xs,ys));
      setLine(el.b0,xs(0),ys(CW),xs(CW/a0),ys(0));
      setLine(el.b1,xs(0),ys(CW),xs(CW/a1),ys(0));
      setLine(el.cl,xs(0),ys(st.ec),xs(st.ec/a1),ys(0));
      setLine(el.el,xs(0),ys(st.ee),xs(st.ee/a0),ys(0));
      at(el.hc,xs(h0[0]),ys(h0[1])); at(el.he,xs(h1[0]),ys(h1[1]));
      at(el.x0,xs(CW/(2*a0)),ys(CW/2)); at(el.x1,xs(CW/(2*a1)),ys(CW/2));
      /* CV between w and e(p1, u0), EV between w and e(p0, u1): on opposite sides of w, so they never overlap */
      x=b.L+9;
      tag(el.tcv,el.bcv,setDbl(el.cv,x,y0,ys(Math.min(st.ec,CX))),'CV = '+fmt(st.cv,1),x+8,(y0+ys(Math.min(st.ec,CX)))/2);
      x=b.L+23;
      tag(el.tev,el.bev,setDbl(el.ev,x,y0,ys(Math.min(st.ee,CX))),'EV = '+fmt(st.ev,1),x+8,(y0+ys(Math.min(st.ee,CX)))/2);
      if(api) api.changed();
      if(!out) return;
      out.textContent='p₁: '+fmt(a0,2)+' → '+fmt(a1,2)+(a1<a0?', a fall':a1>a0?', a rise':', no change')+': u⁰ = '+fmt(st.u0,2)+', u¹ = '+fmt(st.u1,2)+
        '\nCV = w − e(p¹, u⁰) = 100 − '+fmt(st.ec,2)+' = '+fmt(st.cv,2)+
        '\nEV = e(p⁰, u¹) − w = '+fmt(st.ee,2)+' − 100 = '+fmt(st.ev,2)+
        '\nthe reverse change has CV = '+fmt(-st.ev,2)+' = −EV and EV = '+fmt(-st.cv,2)+' = −CV';
    }
    api=NF.api({
      get:function(){ var st=state(); return {p0:a0, p1:a1, u0:st.u0, u1:st.u1, cv:st.cv, ev:st.ev}; },
      set:function(st){ if('p0' in st && r0) r0.set(+st.p0); if('p1' in st && r1) r1.set(+st.p1); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. CV, consumer surplus and EV as areas ----------
     p2 = 1 and p1 moves from 2 to p. nor: u = 2 sqrt(x1 x2), w = 100. ql: u = 50 ln x1 + x2, w = 100, the same
     Marshallian demand 50 / p1 with no income effect. inf: the Gorman form of figure 1, w = 150, inferior for p1 > 1. */
  var P0=2;
  var WM={
    nor:{w:100, xr:80, xt:20, phi:4,
      x:function(p){ return 50/p; },
      v:function(p){ return 100/Math.sqrt(p); },
      h:function(p,u){ return u/(2*Math.sqrt(p)); },
      e:function(p,u){ return u*Math.sqrt(p); }},
    ql:{w:100, xr:80, xt:20, phi:4,
      x:function(p){ return 50/p; },
      v:function(p){ return 50*Math.log(50/p)+50; },
      h:function(p){ return 50/p; },
      e:function(p,u){ return 50+u-50*Math.log(50/p); }},
    inf:{w:150, xr:50, xt:10, phi:3.7,
      x:function(p){ return gorH(p,gorV(p,150)); },
      v:function(p){ return gorV(p,150); },
      h:gorH,
      e:function(p,u){ return 40*p+u*(2*Math.sqrt(p)-p); }}
  };
  NF.register('mi4-welfare',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='nor', view='all', p=1, W=520, H=320, el={}, xs, ys, b, api;
    var rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rp) p=rp.v();
    pre=seg(fig,'data-pre',function(v){ if(!WM[v]||v===pre) return; pre=v; draw(); });
    if(!WM[pre]) pre='nor';
    view=seg(fig,'data-view',function(v){ if(v===view) return; view=v; update(); });
    function state(){
      var m=WM[pre], u0=m.v(P0), u1=m.v(p), cv=m.w-m.e(p,u0), evv=m.e(P0,u1)-m.w,
          cs=Math.abs(p-P0)<1e-12?0:simpson(m.x,p,P0,240), rank;
      if(Math.abs(p-P0)<1e-9) rank='none';
      else if(Math.abs(evv-cv)<1e-6*Math.max(1,Math.abs(cs))) rank='equal';
      else if(cv<=cs && cs<=evv) rank='normal';
      else if(evv<=cs && cs<=cv) rank='inferior';
      else rank='mixed';
      return {m:m, u0:u0, u1:u1, cv:cv, ev:evv, cs:cs, rank:rank};
    }
    function draw(){
      var m=WM[pre], g, rows, PH;
      W=measure(svg); frame(svg,W,500);
      rows=key(S('g',null,svg),[['line','mi4-h0','h₁(p, u⁰)'],['line','mi4-cs','x₁(p, w)'],['line','mi4-h1','h₁(p, u¹)']],40,12,W-8);
      PH=Math.round(clamp((W-60)*0.52,190,260));
      b={L:40, Rr:W-62, T:rows*16+30}; b.B=b.T+PH; H=b.B+24;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0,m.xr,b.L,b.Rr); ys=lin(0,4,b.B,b.T);
      g=S('g',null,svg);
      axes(g,b,xs,ys,ticks(0,m.xr,m.xt),ticks(0,4,1),'x₁','p₁');
      el.gc=clip(svg,b.L,b.T-2,b.Rr-b.L,b.B-b.T+2);
      el.f=[S('path',{'class':'mi4-f'},el.gc),S('path',{'class':'mi4-f'},el.gc),S('path',{'class':'mi4-f'},el.gc)];
      el.h0=S('path',{'class':'mi4-h0'},el.gc); el.cs=S('path',{'class':'mi4-cs'},el.gc); el.h1=S('path',{'class':'mi4-h1'},el.gc);
      el.pl0=line(svg,b.L,0,b.Rr,0,'mi4-pl'); el.pl1=line(svg,b.L,0,b.Rr,0,'mi4-pl');
      el.t0=text(svg,b.Rr+6,0,'p⁰₁ = 2','nf-lab'); el.t1=text(svg,b.Rr+6,0,'','nf-lab');
      el.d0=S('circle',{r:4,'class':'mi4-dcs'},svg); el.d1=S('circle',{r:4,'class':'mi4-dcs'},svg);
      update();
    }
    /* a demand curve as [x1, p1] points; a bundle outside the consumption set breaks it */
    function curve(f){
      var m=WM[pre];
      return samp(function(q){ var x=f(q); return x>=0?x:NaN; },0.2,m.phi,300).map(function(a){ return [a[1],a[0]]; });
    }
    var CLS={cv:'mi4-f mi4-fcv', cs:'mi4-f mi4-fcs', ev:'mi4-f mi4-fev'}, LINE={cv:'h0', cs:'cs', ev:'h1'};
    function update(){
      var st=state(), m=st.m, lo=Math.min(p,P0), hi=Math.max(p,P0), mid=(lo+hi)/2, fx, order, i, k, A, B, q, n=60, s, txt, keys=['cv','cs','ev'];
      el.h0.setAttribute('d',pth(curve(function(q){ return m.h(q,st.u0); }),xs,ys));
      el.cs.setAttribute('d',pth(curve(m.x),xs,ys));
      el.h1.setAttribute('d',pth(curve(function(q){ return m.h(q,st.u1); }),xs,ys));
      fx={cv:function(q){ return m.h(q,st.u0); }, cs:m.x, ev:function(q){ return m.h(q,st.u1); }};
      /* All: the smallest area first, each extra sliver in the colour of the curve on its outer edge.
         One measure: its whole area, the other curves faint. */
      order=keys.slice().sort(function(u,v){ return fx[u](mid)-fx[v](mid); });
      for(k=0;k<3;k++){
        if(hi-lo<1e-9 || (view!=='all' && k>0)){ el.f[k].setAttribute('d',''); continue; }
        A=[]; B=[];
        for(i=0;i<=n;i++){
          q=lo+(hi-lo)*i/n;
          if(view==='all'){ A.push([xs(k?fx[order[k-1]](q):0),ys(q)]); B.push([xs(fx[order[k]](q)),ys(q)]); }
          else { A.push([xs(0),ys(q)]); B.push([xs(fx[view](q)),ys(q)]); }
        }
        el.f[k].setAttribute('d',poly(A.concat(B.reverse()))+'Z');
        el.f[k].setAttribute('class',CLS[view==='all'?order[k]:view]);
      }
      for(k=0;k<3;k++) el[LINE[keys[k]]].setAttribute('class','mi4-'+LINE[keys[k]]+(view==='all'||view===keys[k]?'':' mi4-dim'));
      setLine(el.pl0,b.L,C(ys(P0)),b.Rr,C(ys(P0)));
      setLine(el.pl1,b.L,C(ys(p)),b.Rr,C(ys(p)));
      el.t1.textContent=Math.abs(p-P0)<1e-9?'':'p¹₁ = '+fmt(p,2);
      moveTo(el.t1,b.Rr+6,ys(p)+(p<P0?13:-5));
      moveTo(el.t0,b.Rr+6,ys(P0)+(Math.abs(p-P0)<1e-9?4:(p<P0?-5:13)));
      at(el.d0,xs(m.x(P0)),ys(P0)); at(el.d1,xs(m.x(p)),ys(p));
      if(api) api.changed();
      if(!out) return;
      s='CV = '+fmt(st.cv,2)+'   ΔCS = '+fmt(st.cs,2)+'   EV = '+fmt(st.ev,2);
      if(st.rank==='none') txt='no price change, so all three are 0';
      else if(st.rank==='equal') txt='CV = ΔCS = EV: no income effect, the area under demand is exact';
      else if(st.rank==='normal') txt='CV ≤ ΔCS ≤ EV: good 1 is normal on this price range';
      else if(st.rank==='inferior') txt='EV ≤ ΔCS ≤ CV: good 1 is inferior on this price range';
      else txt='';
      out.textContent=s+(txt?'\n'+txt:'')+(Math.abs(p-P0)>1e-9?(p>P0?'; a price rise, so all three are negative':'; a price fall, so all three are positive'):'');
    }
    drag(svg,function(){ return [W,H]; },function(q){ return b && q[0]>=b.L-8 && q[0]<=b.Rr+8 && Math.abs(q[1]-ys(p))<16 ? 1 : null; },
      function(k,q){ if(rp) rp.set(ys.inv(q[1])); });
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, view:view, p:p, cv:st.cv, cs:st.cs, ev:st.ev, rank:st.rank}; },
      set:function(st){ if('pre' in st) NF.press(fig,'data-pre',String(st.pre)); if('view' in st) NF.press(fig,'data-view',String(st.view)); if('p' in st && rp) rp.set(+st.p); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. How good is consumer surplus: Cobb Douglas with share a, w = 100, p1 from 1 to t ----------
     CV = w (1 - t^a), CS = -a w ln t, EV = w (t^-a - 1). */
  var WW=100;
  function wCV(a,t){ return WW*(1-Math.pow(t,a)); }
  function wCS(a,t){ return -a*WW*Math.log(t); }
  function wEV(a,t){ return WW*(Math.pow(t,-a)-1); }
  /* ratios to CS, with their limit 1 where CS is 0 */
  function ratio(f,a,t){ var c=wCS(a,t); return Math.abs(c)<1e-9?1:f(a,t)/c; }
  NF.register('mi4-willig',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var a=0.5, t=2, W=520, H=400, el={}, L, xa, ya, xb, yb, api;
    var ra=range(fig,'a',2,function(v){ a=v; update(); });
    var rt=range(fig,'t',2,function(v){ t=v; update(); });
    if(ra) a=ra.v();
    if(rt) t=rt.v();
    function draw(){
      var g, rows, ph;
      W=measure(svg); frame(svg,W,800);
      rows=key(S('g',null,svg),[['line','mi4-h0','CV'],['line','mi4-cs','ΔCS'],['line','mi4-h1','EV']],40,12,W-8);
      ph=Math.round(clamp(W>=540?(W-124)/2*0.82:(W-62)*0.6,170,240));
      L=two(W,rows*16+34,ph);
      H=L.H; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xa=lin(0,4,L.a.L,L.a.Rr); ya=lin(-125,125,L.a.B,L.a.T);
      xb=lin(0,1,L.b.L,L.b.Rr); yb=lin(0.4,2.2,L.b.B,L.b.T);
      g=S('g',null,svg);
      axes(g,L.a,xa,ya,ticks(0,4,L.side?1:0.5),ticks(-100,100,50),'t','money, against t');
      axes(g,L.b,xb,yb,ticks(0,1,0.2),ticks(0.5,2,0.5),'a','ratio to ΔCS, against a');
      el.ga=clip(svg,L.a.L,L.a.T-2,L.a.Rr-L.a.L,L.a.B-L.a.T+2); el.gb=clip(svg,L.b.L,L.b.T-2,L.b.Rr-L.b.L,L.b.B-L.b.T+2);
      line(el.ga,C(xa(1)),L.a.T,C(xa(1)),L.a.B,'mi4-one');
      el.va=line(el.ga,0,0,0,0,'mi4-guide'); el.vb=line(el.gb,0,0,0,0,'mi4-guide');
      el.cvA=S('path',{'class':'mi4-h0'},el.ga); el.csA=S('path',{'class':'mi4-cs'},el.ga); el.evA=S('path',{'class':'mi4-h1'},el.ga);
      line(el.gb,L.b.L,C(yb(1)),L.b.Rr,C(yb(1)),'mi4-cs mi4-dash');
      el.cvB=S('path',{'class':'mi4-h0'},el.gb); el.evB=S('path',{'class':'mi4-h1'},el.gb);
      el.qa=text(svg,L.b.Rr-4,yb(1)-6,'ΔCS, the quasilinear limit','mi4-tp nf-halo','end');
      el.dA=[S('circle',{r:4.5,'class':'mi4-pt'},svg),S('circle',{r:4.5,'class':'mi4-pc'},svg),S('circle',{r:4.5,'class':'mi4-pe'},svg)];
      el.dB=[S('circle',{r:4.5,'class':'mi4-pt'},svg),S('circle',{r:4.5,'class':'mi4-pe'},svg)];
      update();
    }
    function update(){
      var cv=wCV(a,t), cs=wCS(a,t), ev=wEV(a,t), rc=ratio(wCV,a,t), re=ratio(wEV,a,t), s;
      el.cvA.setAttribute('d',pth(samp(function(q){ return wCV(a,q); },0.25,4,200),xa,ya));
      el.csA.setAttribute('d',pth(samp(function(q){ return wCS(a,q); },0.25,4,200),xa,ya));
      el.evA.setAttribute('d',pth(samp(function(q){ return wEV(a,q); },0.25,4,200),xa,ya));
      el.cvB.setAttribute('d',pth(samp(function(q){ return ratio(wCV,q,t); },0.001,1,160),xb,yb));
      el.evB.setAttribute('d',pth(samp(function(q){ return ratio(wEV,q,t); },0.001,1,160),xb,yb));
      setLine(el.va,xa(t),L.a.T,xa(t),L.a.B); setLine(el.vb,xb(a),L.b.T,xb(a),L.b.B);
      at(el.dA[0],xa(t),clamp(ya(cv),L.a.T,L.a.B)); at(el.dA[1],xa(t),clamp(ya(cs),L.a.T,L.a.B)); at(el.dA[2],xa(t),clamp(ya(ev),L.a.T,L.a.B));
      at(el.dB[0],xb(a),clamp(yb(rc),L.b.T,L.b.B)); at(el.dB[1],xb(a),clamp(yb(re),L.b.T,L.b.B));
      if(api) api.changed();
      if(!out) return;
      s='a = '+fmt(a,2)+', p₁: 1 → t = '+fmt(t,2)+', w = 100'+
        '\nCV = '+fmt(cv,2)+'   ΔCS = '+fmt(cs,2)+'   EV = '+fmt(ev,2);
      if(Math.abs(t-1)<1e-9) s+='\nno price change: all three are 0';
      else s+='\nratio to ΔCS: CV '+rc.toFixed(3)+', EV '+re.toFixed(3)+'; the gap EV − CV is '+(100*Math.abs(ev-cv)/Math.abs(cs)).toFixed(1)+'% of |ΔCS|';
      out.textContent=s;
    }
    drag(svg,function(){ return [W,H]; },function(q){
      if(!L) return null;
      if(inBox(L.a,q,8) && Math.abs(q[0]-xa(t))<18) return 'a';
      if(inBox(L.b,q,8) && Math.abs(q[0]-xb(a))<18) return 'b';
      return null;
    },function(k,q){ if(k==='a' && rt) rt.set(xa.inv(q[0])); else if(k==='b' && ra) ra.set(xb.inv(q[0])); });
    api=NF.api({
      get:function(){ return {a:a, t:t, cv:wCV(a,t), cs:wCS(a,t), ev:wEV(a,t), rcv:ratio(wCV,a,t), rev:ratio(wEV,a,t)}; },
      set:function(st){ if('a' in st && ra) ra.set(+st.a); if('t' in st && rt) rt.set(+st.t); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 6. Price indices against the true cost of living ----------
     Cobb Douglas with share a; p1 scaled by t, p2 fixed. Laspeyres a t + 1 - a, true t^a, Paasche 1 / (a / t + 1 - a). */
  function iL(a,t){ return a*t+1-a; }
  function iT(a,t){ return Math.pow(t,a); }
  function iP(a,t){ return 1/(a/t+1-a); }
  NF.register('mi4-index',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var a=0.5, t=0.5, W=520, H=400, el={}, L, xa, ya, xb, yb, api;
    var ra=range(fig,'a',2,function(v){ a=v; update(); });
    var rt=range(fig,'t',2,function(v){ t=v; update(); });
    if(ra) a=ra.v();
    if(rt) t=rt.v();
    function pct(v){ return Math.round(v*100)+'%'; }
    function draw(){
      var g, rows, ph;
      W=measure(svg); frame(svg,W,800);
      rows=key(S('g',null,svg),[['line','mi4-las','Laspeyres, arithmetic'],['line','mi4-tru','true tᵃ, geometric'],['line','mi4-pas','Paasche, harmonic']],40,12,W-8);
      ph=Math.round(clamp(W>=540?(W-124)/2*0.82:(W-62)*0.6,170,240));
      L=two(W,rows*16+34,ph);
      H=L.H; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xa=lin(0,4,L.a.L,L.a.Rr); ya=lin(0,4,L.a.B,L.a.T);
      xb=lin(0,4,L.b.L,L.b.Rr); yb=lin(0,0.4,L.b.B,L.b.T);
      g=S('g',null,svg);
      axes(g,L.a,xa,ya,ticks(0,4,L.side?1:0.5),ticks(0,4,1),'t','index, against t');
      axes(g,L.b,xb,yb,ticks(0,4,L.side?1:0.5),ticks(0,0.4,0.1),'t','relative bias (Paasche dashed)',pct);
      el.ga=clip(svg,L.a.L,L.a.T-2,L.a.Rr-L.a.L,L.a.B-L.a.T+2); el.gb=clip(svg,L.b.L,L.b.T-2,L.b.Rr-L.b.L,L.b.B-L.b.T+2);
      line(el.ga,C(xa(1)),L.a.T,C(xa(1)),L.a.B,'mi4-one'); line(el.gb,C(xb(1)),L.b.T,C(xb(1)),L.b.B,'mi4-one');
      el.va=line(el.ga,0,0,0,0,'mi4-guide'); el.vb=line(el.gb,0,0,0,0,'mi4-guide');
      el.LA=S('path',{'class':'mi4-las'},el.ga); el.TA=S('path',{'class':'mi4-tru'},el.ga); el.PA=S('path',{'class':'mi4-pas'},el.ga);
      el.LB=S('path',{'class':'mi4-las'},el.gb); el.PB=S('path',{'class':'mi4-pas mi4-dash'},el.gb);
      el.dA=[S('circle',{r:4.5,'class':'mi4-dla'},svg),S('circle',{r:4.5,'class':'mi4-pe'},svg),S('circle',{r:4.5,'class':'mi4-dpa'},svg)];
      el.dB=[S('circle',{r:4.5,'class':'mi4-dla'},svg),S('circle',{r:4.5,'class':'mi4-dpa'},svg)];
      update();
    }
    function bl(a,t){ return iL(a,t)/iT(a,t)-1; }
    function bp(a,t){ return 1-iP(a,t)/iT(a,t); }
    function update(){
      var l=iL(a,t), tr=iT(a,t), pa=iP(a,t), s;
      el.LA.setAttribute('d',pth(samp(function(q){ return iL(a,q); },0.2,4,200),xa,ya));
      el.TA.setAttribute('d',pth(samp(function(q){ return iT(a,q); },0.2,4,200),xa,ya));
      el.PA.setAttribute('d',pth(samp(function(q){ return iP(a,q); },0.2,4,200),xa,ya));
      el.LB.setAttribute('d',pth(samp(function(q){ return bl(a,q); },0.2,4,200),xb,yb));
      el.PB.setAttribute('d',pth(samp(function(q){ return bp(a,q); },0.2,4,200),xb,yb));
      setLine(el.va,xa(t),L.a.T,xa(t),L.a.B); setLine(el.vb,xb(t),L.b.T,xb(t),L.b.B);
      at(el.dA[0],xa(t),ya(l)); at(el.dA[1],xa(t),ya(tr)); at(el.dA[2],xa(t),ya(pa));
      at(el.dB[0],xb(t),clamp(yb(bl(a,t)),L.b.T,L.b.B)); at(el.dB[1],xb(t),clamp(yb(bp(a,t)),L.b.T,L.b.B));
      if(api) api.changed();
      if(!out) return;
      s='a = '+fmt(a,2)+', t = '+fmt(t,2)+':   Paasche '+pa.toFixed(3)+' ≤ true '+tr.toFixed(3)+' ≤ Laspeyres '+l.toFixed(3)+
        '\nharmonic ≤ geometric ≤ arithmetic mean of the price relatives (t, 1), weights (a, 1 − a)'+
        '\nLaspeyres overstates by '+(100*bl(a,t)).toFixed(1)+'%, Paasche understates by '+(100*bp(a,t)).toFixed(1)+'%'+
        '\nquantity index Q = u¹ over u⁰ = t⁻ᵃ = '+Math.pow(t,-a).toFixed(3)+' from either base';
      out.textContent=s;
    }
    drag(svg,function(){ return [W,H]; },function(q){
      if(!L) return null;
      if(inBox(L.a,q,8) && Math.abs(q[0]-xa(t))<18) return 'a';
      if(inBox(L.b,q,8) && Math.abs(q[0]-xb(t))<18) return 'b';
      return null;
    },function(k,q){ if(rt) rt.set((k==='a'?xa:xb).inv(q[0])); });
    api=NF.api({
      get:function(){ return {a:a, t:t, las:iL(a,t), tru:iT(a,t), pas:iP(a,t), bl:bl(a,t), bp:bp(a,t)}; },
      set:function(st){ if('a' in st && ra) ra.set(+st.a); if('t' in st && rt) rt.set(+st.t); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 7. Aggregation: Engel curves and a transfer from i to j ----------
     same: x_i = 1 + w/2, x_j = 3 + w/2. diff: x_i = 0.8 w, x_j = 0.3 w (Cobb Douglas). corner: x_i = max(0, w/2 - 2),
     x_j = 1 + w/2, Gorman lines where i stops at zero below w = 4. */
  var GM={
    same:{xi:function(w){ return 1+w/2; }, xj:function(w){ return 3+w/2; }, li:'xᵢ = 1 + ½wᵢ', lj:'xⱼ = 3 + ½wⱼ', wi:6, wj:4},
    diff:{xi:function(w){ return 0.8*w; }, xj:function(w){ return 0.3*w; }, li:'xᵢ = 0.8wᵢ', lj:'xⱼ = 0.3wⱼ', wi:6, wj:4},
    corner:{xi:function(w){ return Math.max(0,w/2-2); }, xj:function(w){ return 1+w/2; }, li:'xᵢ = max{0, ½wᵢ − 2}', lj:'xⱼ = 1 + ½wⱼ', wi:4, wj:6}
  };
  NF.register('mi4-gorman',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pre='same', wi=6, wj=4, tau=2, W=520, H=400, el={}, L, xa, ya, xb, yb, api, quiet=false;
    var ri=range(fig,'wi',1,function(v){ wi=v; if(!quiet) draw(); });
    var rj=range(fig,'wj',1,function(v){ wj=v; if(!quiet) draw(); });
    var rt=range(fig,'tau',1,function(v){ tau=v; if(!quiet) update(); });
    if(ri) wi=ri.v();
    if(rj) wj=rj.v();
    if(rt) tau=rt.v();
    pre=seg(fig,'data-pre',function(v){
      if(!GM[v]||v===pre) return;
      pre=v; quiet=true;
      if(ri) ri.set(GM[v].wi); if(rj) rj.set(GM[v].wj); if(rt) rt.set(2);
      quiet=false; draw();
    });
    if(!GM[pre]) pre='same';
    function state(){
      var m=GM[pre], te=Math.min(tau,wi), a0=m.xi(wi), a1=m.xi(wi-te), b0=m.xj(wj), b1=m.xj(wj+te);
      return {m:m, te:te, dxi:a1-a0, dxj:b1-b0, dx:a1-a0+b1-b0, tot:wi+wj, xi0:a0, xi1:a1, xj0:b0, xj1:b1};
    }
    function draw(){
      var m=GM[pre], g, rows, ph, T;
      W=measure(svg); frame(svg,W,800);
      rows=key(S('g',null,svg),[['line','mi4-ei',m.li],['line','mi4-ej',m.lj],['line','mi4-agg','x = xᵢ + xⱼ']],40,12,W-8);
      ph=Math.round(clamp(W>=540?(W-124)/2*0.85:(W-62)*0.6,170,240));
      L=two(W,rows*16+34,ph);
      H=L.H; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xa=lin(0,14,L.a.L,L.a.Rr); ya=lin(0,10,L.a.B,L.a.T);
      T=Math.max(wi+wj,1); xb=lin(0,T,L.b.L,L.b.Rr); yb=lin(0,16,L.b.B,L.b.T);
      g=S('g',null,svg);
      axes(g,L.a,xa,ya,ticks(0,14,2),ticks(0,10,2),'w','demand for good ℓ');
      axes(g,L.b,xb,yb,ticks(0,T,T>12?4:T>5?2:1),ticks(0,16,4),'wᵢ','aggregate, total wealth '+tl(wi+wj)+' fixed');
      el.ga=clip(svg,L.a.L,L.a.T-3,L.a.Rr-L.a.L,L.a.B-L.a.T+6); el.gb=clip(svg,L.b.L,L.b.T-3,L.b.Rr-L.b.L,L.b.B-L.b.T+6);
      S('path',{d:pth(samp(m.xi,0,14,280),xa,ya),'class':'mi4-ei'},el.ga);
      S('path',{d:pth(samp(m.xj,0,14,280),xa,ya),'class':'mi4-ej'},el.ga);
      el.agg=S('path',{'class':'mi4-agg'},el.gb);
      el.vi=pathVec(svg,'mi4-mvi','mi4-mvih'); el.vj=pathVec(svg,'mi4-mvj','mi4-mvjh'); el.vx=pathVec(svg,'mi4-mvx','mi4-mvxh');
      el.oi=S('circle',{r:4,'class':'mi4-oi'},svg); el.oj=S('circle',{r:4,'class':'mi4-oj'},svg); el.ox=S('circle',{r:4,'class':'mi4-ox'},svg);
      el.fi=S('circle',{r:4.5,'class':'mi4-fi'},svg); el.fj=S('circle',{r:4.5,'class':'mi4-fj'},svg); el.fx=S('circle',{r:4.5,'class':'mi4-fx'},svg);
      update();
    }
    function along(f,w0,w1,xs,ys){ var P=[], i, w; for(i=0;i<=40;i++){ w=w0+(w1-w0)*i/40; P.push([xs(w),ys(f(w))]); } return P; }
    function update(){
      var st=state(), m=st.m, T=st.tot, agg=function(v){ return m.xi(v)+m.xj(T-v); }, s, verdict;
      el.agg.setAttribute('d',pth(samp(agg,0,T,Math.max(20,Math.round(T*20))),xb,yb));
      setPathVec(el.vi,along(m.xi,wi,wi-st.te,xa,ya));
      setPathVec(el.vj,along(m.xj,wj,wj+st.te,xa,ya));
      setPathVec(el.vx,along(agg,wi,wi-st.te,xb,yb));
      at(el.oi,xa(wi),ya(st.xi0)); at(el.oj,xa(wj),ya(st.xj0)); at(el.ox,xb(wi),yb(agg(wi)));
      at(el.fi,xa(wi-st.te),ya(st.xi1)); at(el.fj,xa(wj+st.te),ya(st.xj1)); at(el.fx,xb(wi-st.te),yb(agg(wi-st.te)));
      if(api) api.changed();
      if(!out) return;
      if(st.te<1e-9) verdict='no transfer';
      else if(Math.abs(st.dx)<1e-9) verdict='aggregate unchanged';
      else verdict=st.dx<0?'aggregate falls':'aggregate rises';
      s='transfer '+fmt(st.te,1)+' from i ('+fmt(wi,1)+' → '+fmt(wi-st.te,1)+') to j ('+fmt(wj,1)+' → '+fmt(wj+st.te,1)+'), total '+fmt(T,1)+' fixed'+
        '\nΔx = Δxᵢ + Δxⱼ = '+fmt(st.dxi,2)+' + '+fmt(st.dxj,2)+' = '+fmt(st.dx,2)+': '+verdict;
      if(st.te>1e-9) s+='\nwealth effects on the moved range: i '+fmt(-st.dxi/st.te,2)+', j '+fmt(st.dxj/st.te,2)+(Math.abs(st.dxi+st.dxj)<1e-9?', equal':', not equal');
      if(tau>wi+1e-9) s+='\ni has only '+fmt(wi,1)+' to give';
      out.textContent=s;
    }
    api=NF.api({
      get:function(){ var st=state(); return {pre:pre, wi:wi, wj:wj, tau:st.te, dxi:st.dxi, dxj:st.dxj, dx:st.dx}; },
      set:function(st){
        if('pre' in st) NF.press(fig,'data-pre',String(st.pre));
        if('wi' in st && ri) ri.set(+st.wi); if('wj' in st && rj) rj.set(+st.wj); if('tau' in st && rt) rt.set(+st.tau);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });
})();
