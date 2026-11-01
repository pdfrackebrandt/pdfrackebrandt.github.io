/* Core Micro L3 figures: Engel curves and budget shares, the utility maximisation tangency and corners, Roy's identity,
   Shephard's lemma and the concavity of e, and the Slutsky split of a price change.
   Every curve is computed from the stated utility function. Drawn with the helpers of /assets/notes.js (window.NF);
   colours come from CSS variables in /assets/figs/mi3.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

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
  /* a plot box: grid, ticks and axis names; x domain xd over [mL, W - mR], y domain yd over [bot, top] */
  function box(svg,W,top,bot,xd,yd,xname,yname){
    var mL=40, mR=14, g=S('g',null,svg), xs=lin(xd[0],xd[1],mL,W-mR), ys=lin(yd[0],yd[1],bot,top),
        sx=niceStep(xd[1]-xd[0],Math.max(3,Math.floor((W-mL-mR)/62))), sy=niceStep(yd[1]-yd[0],Math.max(2,Math.floor((bot-top)/40))), i, v;
    for(i=Math.ceil(xd[0]/sx-1e-9);i*sx<=xd[1]+1e-9;i++){
      v=i*sx;
      if(Math.abs(v-xd[0])>1e-9) line(g,C(xs(v)),top,C(xs(v)),bot,'nf-grid');
      text(g,xs(v),bot+15,tick(v),null,'middle');
    }
    for(i=Math.ceil(yd[0]/sy-1e-9);i*sy<=yd[1]+1e-9;i++){
      v=i*sy;
      if(Math.abs(v-yd[0])>1e-9) line(g,mL,C(ys(v)),W-mR,C(ys(v)),Math.abs(v)<1e-9?'nf-ax':'nf-grid');
      text(g,mL-6,ys(v)+4,tick(v),null,'end');
    }
    line(g,C(mL),top,C(mL),bot,'nf-ax');
    line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
    if(xname) text(g,W-mR-3,bot-6,xname,'nf-title nf-halo','end');
    if(yname) text(g,mL+6,top+12,yname,'nf-title nf-halo');
    return {xs:xs, ys:ys, x0:mL, x1:W-mR, top:top, bot:bot, xd:xd, yd:yd, gc:clip(svg,mL,top-1,W-mR-mL+1,bot-top+2)};
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
  function geo(a,b,n){ var o=[], la=Math.log(a), lb=Math.log(b), i; for(i=0;i<=n;i++) o.push(Math.exp(la+(lb-la)*i/n)); return o; }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function pair(a,b,d){ return '('+fmt(a,d)+', '+fmt(b,d)+')'; }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function put(out,s){ out.appendChild(document.createTextNode(s)); }
  function cmp(a,b){ return Math.abs(a-b)<5e-4?'=':a>b?'>':'<'; }
  /* an arrow with a head; it hides itself when it would be too short to read */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  function setVec(v,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(len<9){ setLine(v.l,x0,y0,x0,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return false; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len; hl=Math.min(9,len*0.45); bx=x1-ux*hl; by=y1-uy*hl;
    setLine(v.l,x0,y0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',poly([[x1,y1],[bx-uy*4.2,by+ux*4.2],[bx+uy*4.2,by-ux*4.2]])+'Z');
    return true;
  }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function pressed(fig,attr){ var b=fig.querySelector('.nfig-opt['+attr+'][aria-pressed="true"]'); return b?b.getAttribute(attr):null; }

  /* indifference curves through a utility level, as data points inside roughly [0, D]^2 */
  var IC={
    cd:function(u,D){ return geo(u*u/(3*D),3*D,240).map(function(x){ return [x,u*u/x]; }); },          /* u = sqrt(x1 x2) */
    sg:function(u,D,s1){ return geo(u*u/(3*D),3*D,240).map(function(y){ return [s1+u*u/y,y]; }); },    /* u = sqrt((x1 - s1) x2) */
    ql:function(u,D){                                                                               /* u = ln x1 + x2 */
      var hi=Math.exp(u), lo=Math.max(Math.exp(u-3*D),1e-6), pts;
      if(hi<=lo) return [];
      pts=geo(lo,hi,240).map(function(x){ return [x,u-Math.log(x)]; });
      pts[pts.length-1]=[hi,0];
      return pts;
    }
  };

  /* ---------- 1. Engel curves and budget shares ---------- */
  NF.register('mi3-engel',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var S1=2, D=16, WMAX=20, W=520, H=0, F, G, el={}, st={pref:'cd', w:10, p1:1, p2:1}, cur={}, api=null;
    var rw=range(fig,'w',1,function(v){ st.w=v; update(); }),
        rp1=range(fig,'p1',1,function(v){ st.p1=v; update(); }),
        rp2=range(fig,'p2',1,function(v){ st.p2=v; update(); });
    if(rw) st.w=rw.v();
    if(rp1) st.p1=rp1.v();
    if(rp2) st.p2=rp2.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; update(); }) || 'cd';
    /* Marshallian demand and its wealth slopes. cd: sqrt(x1 x2); sg: Stone Geary sqrt((x1 - 2) x2); ql: ln x1 + x2 (slide 46) */
    function dem(pref,w,p1,p2){
      if(pref==='sg'){
        if(w<=p1*S1+1e-12) return {ok:false};
        return {ok:true, x1:S1+(w-p1*S1)/(2*p1), x2:(w-p1*S1)/(2*p2), d1:1/(2*p1), d2:1/(2*p2)};
      }
      if(pref==='ql'){
        if(w<=p2) return {ok:true, corner:true, x1:w/p1, x2:0, d1:1/p1, d2:0};
        return {ok:true, x1:p2/p1, x2:w/p2-1, d1:0, d2:1/p2};
      }
      return {ok:true, x1:w/(2*p1), x2:w/(2*p2), d1:1/(2*p1), d2:1/(2*p2)};
    }
    function draw(){
      W=measure(svg);
      var h1=Math.round(clamp(W*0.5,200,250)), top2=h1+40, h2=Math.round(clamp(W*0.24,96,130));
      H=top2+h2+22; frame(svg,W,H);
      F=box(svg,W,8,h1,[0,D],[0,D],'x₁','x₂');
      el.bud=line(F.gc,0,0,0,0,'mi3-bud');
      el.ic=S('path',{'class':'mi3-ic'},F.gc);
      el.path=S('path',{'class':'mi3-path'},F.gc);
      el.dot=S('circle',{r:5,'class':'mi3-dot'},F.gc);
      el.plab=text(svg,0,0,'expansion path','nf-lab nf-halo mi3-tb');
      el.xlab=text(svg,0,0,'x(p, w)','nf-lab nf-halo mi3-it');
      G=box(svg,W,top2,top2+h2,[0,WMAX],[0,1],'w','budget shares');
      /* b1 is drawn last, so it stays visible where the two shares coincide */
      el.b2=S('path',{'class':'mi3-b2'},G.gc);
      el.b1=S('path',{'class':'mi3-b1'},G.gc);
      el.wl=line(G.gc,0,0,0,0,'nf-guide');
      el.d2=S('circle',{r:4,'class':'mi3-dot'},G.gc);
      el.d1=S('circle',{r:4,'class':'mi3-rdot'},G.gc);
      el.l1=text(svg,0,0,'b₁','mi3-tr nf-halo');
      el.l2=text(svg,0,0,'b₂','mi3-tb nf-halo');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function kind(e,x){
      if(!(x>0)) return 'none';
      if(Math.abs(e-1)<1e-9) return 'unit';
      return e>1?'luxury':'necessity';
    }
    function words(e,x){
      if(!(x>0)) return 'not bought';
      if(e<-1e-9) return 'inferior, necessity';
      if(Math.abs(e)<1e-9) return 'no wealth effect, necessity';
      if(Math.abs(e-1)<1e-9) return 'normal, unit elastic';
      return e>1?'normal, luxury':'normal, necessity';
    }
    function paint(){
      var p1=st.p1, p2=st.p2, w=st.w, d=dem(st.pref,w,p1,p2), ws=[], pts=[], b1s=[], b2s=[], i, v, q, lo, e1, e2, b1, b2, agg, X, Y;
      setLine(el.bud,F.xs(w/p1),F.ys(0),F.xs(0),F.ys(w/p2));
      /* the expansion path and the share curves at these prices, from w = 0 (or the subsistence cost) up */
      lo=st.pref==='sg'?p1*S1*(1+1e-9):1e-6;
      for(i=0;i<=300;i++) ws.push(lo+(Math.max(4*D,WMAX)*Math.max(p1,p2)-lo)*Math.pow(i/300,1.6));
      if(st.pref==='ql') ws.push(p2);
      ws.sort(function(a,b){ return a-b; });
      for(i=0;i<ws.length;i++){
        q=dem(st.pref,ws[i],p1,p2);
        if(!q.ok) continue;
        pts.push([q.x1,q.x2]);
        if(ws[i]<=WMAX+1e-9){ b1s.push([ws[i],p1*q.x1/ws[i]]); b2s.push([ws[i],p2*q.x2/ws[i]]); }
      }
      el.path.setAttribute('d',pathOf(pts,F));
      el.b1.setAttribute('d',pathOf(b1s,G));
      el.b2.setAttribute('d',pathOf(b2s,G));
      if(b1s.length){
        v=b1s[b1s.length-1]; moveTo(el.l1,G.x1-14,G.ys(v[1])+(v[1]>=b2s[b2s.length-1][1]?-6:14));
        v=b2s[b2s.length-1]; moveTo(el.l2,G.x1-14,G.ys(v[1])+(v[1]>b1s[b1s.length-1][1]?-6:14));
      }
      /* the path label sits where the path leaves the top or right edge of the plot */
      for(i=0;i<pts.length && pts[i][0]<=0.88*D && pts[i][1]<=0.86*D;i++);
      v=pts[Math.min(i,pts.length-1)] || [0,0];
      X=clamp(F.xs(Math.min(v[0],0.88*D)),F.x0+50,F.x1-4); Y=clamp(F.ys(Math.min(v[1],0.86*D)),F.top+26,F.bot-8);
      el.plab.setAttribute('text-anchor',X>F.x1-60?'end':'start');
      moveTo(el.plab,X+(X>F.x1-60?-8:8),Y+4);
      setLine(el.wl,G.xs(w),G.top,G.xs(w),G.bot);
      cur={pref:st.pref, w:w, p1:p1, p2:p2, ok:d.ok};
      out.textContent='';
      if(!d.ok){
        el.dot.setAttribute('r',0); el.ic.setAttribute('d',''); el.xlab.textContent='';
        el.d1.setAttribute('r',0); el.d2.setAttribute('r',0);
        warn(out,'w = '+fmt(w,2)+' is not above p₁s₁ = '+fmt(p1*S1,2)+': she cannot afford the subsistence amount s₁ = 2 of good 1, so no affordable bundle has a Stone Geary utility');
        if(api) api.changed();
        return;
      }
      el.dot.setAttribute('r',5); at(el.dot,F.xs(d.x1),F.ys(d.x2));
      /* the bundle's label goes below right, clear of the path and the indifference curve */
      el.xlab.textContent='x(p, w)'; moveTo(el.xlab,F.xs(d.x1)+10,F.ys(d.x2)+17);
      if(st.pref==='cd') el.ic.setAttribute('d',pathOf(IC.cd(Math.sqrt(d.x1*d.x2),D),F));
      else if(st.pref==='sg') el.ic.setAttribute('d',pathOf(IC.sg(Math.sqrt((d.x1-S1)*d.x2),D,S1),F));
      else el.ic.setAttribute('d',pathOf(IC.ql(Math.log(d.x1)+d.x2,D),F));
      b1=p1*d.x1/w; b2=p2*d.x2/w;
      e1=d.x1>0?d.d1*w/d.x1:NaN; e2=d.x2>0?d.d2*w/d.x2:NaN;
      agg=(d.x1>0?b1*e1:0)+(d.x2>0?b2*e2:0);
      el.d1.setAttribute('r',4); at(el.d1,G.xs(Math.min(w,WMAX)),G.ys(b1));
      el.d2.setAttribute('r',4); at(el.d2,G.xs(Math.min(w,WMAX)),G.ys(b2));
      cur.x1=d.x1; cur.x2=d.x2; cur.b1=b1; cur.b2=b2; cur.e1=isFinite(e1)?e1:'n/a'; cur.e2=isFinite(e2)?e2:'n/a';
      cur.agg=agg; cur.k1=kind(e1,d.x1); cur.k2=kind(e2,d.x2); cur.corner=!!d.corner;
      put(out,'x(p, w) = '+pair(d.x1,d.x2,2)+'   b₁ = '+fmt(b1,2)+'   b₂ = '+fmt(b2,2)+
        '\nε₁w = '+(isFinite(e1)?fmt(e1,2):'undefined')+', '+words(e1,d.x1)+'   ε₂w = '+(isFinite(e2)?fmt(e2,2):'undefined')+', '+words(e2,d.x2)+
        '\nb₁ε₁w + b₂ε₂w = '+fmt(agg,2)+' (Engel aggregation)'+(d.corner?'   corner: w ≤ p₂, nothing left for good 2':''));
    }
    /* the Try it steps read the bundle, shares, elasticities and their labels; set takes pref, w, p1 and p2 */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('p1' in s && rp1) rp1.set(+s.p1);
        if('p2' in s && rp2) rp2.set(+s.p2);
        if('w' in s && rw) rw.set(+s.w);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Utility maximisation: tangency, corners and lambda ---------- */
  NF.register('mi3-ump',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var W=520, H=300, F, el={}, st={pref:'cd', p1:2, w:12, x1:2}, cur={}, hs=null, api=null, drag=false;
    var rp1=range(fig,'p1',1,function(v){ st.p1=v; keep(); update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; keep(); update(); });
    if(rp1) st.p1=rp1.v();
    if(rw) st.w=rw.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; keep(); update(); }) || 'cd';
    onClick(fig,'.mi3-toopt',function(){ st.x1=opt().x1; update(); });
    /* u = sqrt(x1 x2) or ln x1 + x2, with p2 = 1 */
    function util(x1,x2){ return st.pref==='cd'?Math.sqrt(x1*x2):Math.log(x1)+x2; }
    function mu(x1,x2){ return st.pref==='cd'?[0.5*Math.sqrt(x2/x1),0.5*Math.sqrt(x1/x2)]:[1/x1,1]; }
    function opt(){
      if(st.pref==='cd') return {x1:st.w/(2*st.p1), x2:st.w/2};
      return st.w>1?{x1:1/st.p1, x2:st.w-1}:{x1:st.w/st.p1, x2:0, corner:true};
    }
    function lims(){ var X=st.w/st.p1; return st.pref==='cd'?[0.02*X,0.98*X]:[0.02*X,X]; }
    /* a change of prices or wealth keeps the bundle's share of the budget line, and an optimal bundle stays optimal */
    var share=null, wasOpt=false;
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
    function draw(){
      W=measure(svg);
      H=Math.round(clamp(W*0.62,240,320)); frame(svg,W,H);
      var X=niceUp(1.15*st.w/st.p1), Y=niceUp(1.15*st.w);
      F=box(svg,W,8,H-24,[0,X],[0,Y],'x₁','x₂');
      el.bud=line(F.gc,0,0,0,0,'mi3-bud');
      el.icp=S('path',{'class':'mi3-ic2'},F.gc);
      el.ic=S('path',{'class':'mi3-ic'},F.gc);
      el.tan=line(F.gc,0,0,0,0,'mi3-tanp');
      el.opt=S('circle',{r:5,'class':'mi3-dot'},F.gc);
      el.olab=text(svg,0,0,'x*','nf-lab nf-halo mi3-it');
      hs=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':'Bundle on the budget line, arrow keys move it'},svg);
      S('circle',{r:18,'class':'nf-hit'},hs); S('circle',{r:11,'class':'nf-ring'},hs); S('circle',{r:5.5,'class':'nf-knob mi3-knob'},hs);
      hs.addEventListener('keydown',function(e){
        var k=e.key, s=(lims()[1]-lims()[0])/(e.shiftKey?10:50);
        if(k==='ArrowRight'||k==='ArrowUp') setX(st.x1+(k==='ArrowRight'?s:-s),0);
        else if(k==='ArrowLeft'||k==='ArrowDown') setX(st.x1-(k==='ArrowLeft'?s:-s),0);
        else return;
        e.preventDefault();
      });
      update();
    }
    function update(){
      /* the axes follow p1 and w; redraw the frame when they would change */
      if(F && (niceUp(1.15*st.w/st.p1)!==F.xd[1] || niceUp(1.15*st.w)!==F.yd[1])){ draw(); return; }
      paint(); if(api) api.changed();
    }
    function paint(){
      var p1=st.p1, w=st.w, o=opt(), x1=st.x1, x2=Math.max(0,w-p1*x1), m=mu(x1,x2), mrs=m[0]/m[1], mo, isOpt, P, s, L, v, lam, D=Math.max(F.xd[1],F.yd[1]);
      isOpt=Math.abs(x1-o.x1)<1e-9;
      wasOpt=isOpt; share=x1*p1/w;
      setLine(el.bud,F.xs(w/p1),F.ys(0),F.xs(0),F.ys(w));
      v=util(o.x1,o.x2);
      el.ic.setAttribute('d',pathOf(st.pref==='cd'?IC.cd(v,D):IC.ql(v,D),F));
      el.icp.setAttribute('d',isOpt?'':pathOf(st.pref==='cd'?IC.cd(util(x1,x2),D):IC.ql(util(x1,x2),D),F));
      at(el.opt,F.xs(o.x1),F.ys(o.x2)); moveTo(el.olab,F.xs(o.x1)+9,F.ys(o.x2)-9);
      /* the purple segment has the indifference curve's slope at the bundle, minus the MRS */
      P=[F.xs(x1),F.ys(x2)];
      L=26/Math.hypot(F.xs(1)-F.xs(0),(F.ys(0)-F.ys(1))*mrs)*1;
      setLine(el.tan,F.xs(x1-L),F.ys(x2+mrs*L),F.xs(x1+L),F.ys(x2-mrs*L));
      hs.setAttribute('transform','translate('+R(P[0])+','+R(P[1])+')');
      hs.setAttribute('aria-valuenow',+x1.toFixed(2));
      hs.setAttribute('aria-valuetext','x = '+pair(x1,x2,2)+', MRS = '+fmt(mrs,2));
      mo=mu(o.x1,o.x2); lam=mo[0]/p1;
      cur={pref:st.pref, p1:p1, w:w, x1:x1, x2:x2, mrs:mrs, ratio:p1, mu1:m[0]/p1, mu2:m[1], opt:isOpt, xs1:o.x1, xs2:o.x2, v:v, lam:lam, corner:!!o.corner, u:util(x1,x2)};
      out.textContent='';
      s='at x = '+pair(x1,x2,2)+': MRS = u₁/u₂ = '+fmt(mrs,2)+' '+cmp(mrs,p1)+' p₁/p₂ = '+fmt(p1,2)+
        '\nu₁/p₁ = '+fmt(m[0]/p1,3)+' '+cmp(m[0]/p1,m[1])+' u₂/p₂ = '+fmt(m[1],3);
      if(isOpt && !o.corner) s+=': equal value per pound, the optimum';
      else if(isOpt) s+=': the optimum, a corner';
      else if(m[0]/p1>m[1]) s+=': move spending to good 1';
      else s+=': move spending to good 2';
      s+='\noptimum x* = '+pair(o.x1,o.x2,2)+(o.corner?', a corner':'')+'   v = '+fmt(v,2)+'   λ = u₁/p₁ = '+fmt(lam,3);
      if(o.corner) s+=' ≥ u₂/p₂ = '+fmt(mo[1],3);
      put(out,s);
    }
    /* drag the bundle along the budget line; it snaps to the optimum within 8 px */
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H);
      if(Math.hypot(p[0]-F.xs(st.x1),p[1]-F.ys(Math.max(0,st.w-st.p1*st.x1)))>26) return;
      drag=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      try{ hs.focus({preventScroll:true,focusVisible:false}); }catch(err){}
    });
    svg.addEventListener('pointermove',function(e){
      if(!drag) return;
      var p=local(svg,e,W,H), bx=F.xs(st.w/st.p1)-F.xs(0), by=F.ys(st.w)-F.ys(0), t;
      /* project the pointer onto the budget segment in pixel space */
      t=((p[0]-F.xs(0))*bx+(p[1]-F.ys(0))*by)/(bx*bx+by*by);
      setX(clamp(t,0,1)*st.w/st.p1,8);
    });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var p=local(svg,e.touches[0],W,H);
      if(Math.hypot(p[0]-F.xs(st.x1),p[1]-F.ys(Math.max(0,st.w-st.p1*st.x1)))<=26) e.preventDefault();
    },{passive:false});
    /* the Try it steps read the bundle, the MRS, the value per pound and the optimum; set takes pref, p1, w, x1 and probe=opt */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('p1' in s && rp1) rp1.set(+s.p1);
        if('w' in s && rw) rw.set(+s.w);
        if('x1' in s) setX(+s.x1,0);
        if(s.probe==='opt'){ st.x1=opt().x1; update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Roy's identity: demand from the slope of v ---------- */
  NF.register('mi3-roy',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var PL=0.4, PH=4, W=520, H=0, F, G, el={}, st={pref:'cd', tr:'id', p1:2, w:4}, cur={}, api=null;
    var rp1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; draw(); });
    if(rp1) st.p1=rp1.v();
    if(rw) st.w=rw.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; draw(); }) || 'cd';
    st.tr=seg(fig,'data-tr',function(v){ st.tr=v; draw(); }) || 'id';
    /* v for u = sqrt(x1 x2) or ln x1 + x2 with p2 = 1, and its derivatives in p1 and w */
    function base(p1,w){
      if(st.pref==='cd'){ var v=w/(2*Math.sqrt(p1)); return {v:v, vp:-v/(2*p1), vw:v/w, x:w/(2*p1)}; }
      if(w>1) return {v:-Math.log(p1)+w-1, vp:-1/p1, vw:1, x:1/p1};
      return {v:Math.log(w/p1), vp:-1/p1, vw:1/w, x:w/p1, corner:true};
    }
    /* the utility shown is f(u) for f(t) = t, 2t or e^t; v becomes f(v) and both slopes scale by f'(v) */
    function val(p1,w){
      var b=base(p1,w), f, d;
      if(st.tr==='two'){ f=2*b.v; d=2; } else if(st.tr==='exp'){ f=Math.exp(b.v); d=f; } else { f=b.v; d=1; }
      return {v:f, vp:d*b.vp, vw:d*b.vw, x:b.x, corner:!!b.corner};
    }
    function draw(){
      W=measure(svg);
      var h1=Math.round(clamp(W*0.42,170,220)), top2=h1+40, h2=Math.round(clamp(W*0.3,120,160)), ps=[], i, q, vmin=Infinity, vmax=-Infinity, xmax=0;
      for(i=0;i<=200;i++){ q=val(PL+(PH-PL)*i/200,st.w); ps.push(q); vmin=Math.min(vmin,q.v); vmax=Math.max(vmax,q.v); xmax=Math.max(xmax,q.x); }
      H=top2+h2+22; frame(svg,W,H);
      var lo=vmin>=0?0:-niceUp(-vmin*1.1), hi=niceUp(vmax*1.08);
      if(vmax<=0) hi=0.5;
      F=box(svg,W,8,h1,[0,PH],[lo,hi],'p₁','v(p₁, w)');
      el.v=S('path',{'class':'mi3-e'},F.gc);
      el.v.setAttribute('d',pathOf(ps.map(function(q,j){ return [PL+(PH-PL)*j/200,q.v]; }),F));
      el.tan=line(F.gc,0,0,0,0,'mi3-tanr');
      el.vd=S('circle',{r:4.5,'class':'mi3-dot'},F.gc);
      G=box(svg,W,top2,top2+h2,[0,PH],[0,niceUp(Math.min(xmax,4*st.w)*1.05)],'p₁','x₁(p₁, w)');
      el.x=S('path',{'class':'mi3-path'},G.gc);
      el.x.setAttribute('d',pathOf(ps.map(function(q,j){ return [PL+(PH-PL)*j/200,q.x]; }),G));
      el.gl=line(svg,0,0,0,0,'nf-guide');
      el.xd=S('circle',{r:5,'class':'mi3-ring'},G.gc);
      el.xl=text(svg,0,0,'Roy','mi3-tr nf-halo');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var p1=st.p1, w=st.w, q=val(p1,w), roy=-q.vp/q.vw, X=F.xs(p1), Y=F.ys(q.v), dpx, s, k, x0, x1;
      at(el.vd,X,Y);
      /* the tangent spans 0.6 in p1 either side, shortened if it would leave the plot steeply */
      x0=Math.max(PL*0.5,p1-0.6); x1=Math.min(PH,p1+0.6);
      setLine(el.tan,F.xs(x0),F.ys(q.v+q.vp*(x0-p1)),F.xs(x1),F.ys(q.v+q.vp*(x1-p1)));
      setLine(el.gl,X,F.top,X,G.bot);
      at(el.xd,G.xs(p1),G.ys(roy));
      el.xl.setAttribute('text-anchor',X>G.x1-70?'end':'start');
      moveTo(el.xl,X+(X>G.x1-70?-9:9),G.ys(roy)-8);
      cur={pref:st.pref, tr:st.tr, p1:p1, w:w, v:q.v, vp:q.vp, vw:q.vw, roy:roy, x1:q.x, corner:q.corner};
      out.textContent='';
      s='v = '+fmt(q.v,2)+'   ∂v/∂p₁ = '+fmt(q.vp,2)+'   ∂v/∂w = λ = '+fmt(q.vw,2)+
        '\nRoy: x₁ = '+MINUS+'(∂v/∂p₁)/(∂v/∂w) = '+fmt(roy,2)+'   demand solved directly: x₁ = '+fmt(q.x,2)+(q.corner?' (corner, x₂ = 0)':'');
      put(out,s);
    }
    /* the Try it steps read v, its slopes and the two values of x1; set takes pref, tr, p1 and w */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('tr' in s) NF.press(fig,'data-tr',String(s.tr));
        if('w' in s && rw) rw.set(+s.w);
        if('p1' in s && rp1) rp1.set(+s.p1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Shephard's lemma and the concavity of e ---------- */
  NF.register('mi3-shephard',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var U=5, P2=1, PL=0.4, PH=3, D=12, W=520, H=0, F, G, el={}, st={sig:'1', p1:1.6, p0:1}, cur={}, api=null;
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
    function draw(){
      W=measure(svg);
      var h1=Math.round(clamp(W*0.46,180,240)), top2=h1+40, h2=Math.round(clamp(W*0.34,130,180));
      H=top2+h2+22; frame(svg,W,H);
      F=box(svg,W,8,h1,[0,D],[0,D],'x₁','x₂');
      el.ic=S('path',{'class':'mi3-ic'},F.gc);
      el.iso0=line(F.gc,0,0,0,0,'mi3-old');
      el.iso=line(F.gc,0,0,0,0,'mi3-bud');
      el.h0=S('circle',{r:4.5,'class':'mi3-pdot'},F.gc);
      el.h=S('circle',{r:5,'class':'mi3-dot'},F.gc);
      el.h0l=text(svg,0,0,'h(p⁰)','mi3-tp nf-halo');
      el.hl=text(svg,0,0,'h(p)','mi3-tb nf-halo');
      G=box(svg,W,top2,top2+h2,[0,PH],[0,yTop()],'p₁','expenditure');
      el.ec=S('path',{'class':'mi3-e'},G.gc);
      el.old=S('path',{'class':'mi3-old'},G.gc);
      el.gap=line(G.gc,0,0,0,0,'mi3-gap');
      el.t0=S('circle',{r:4,'class':'mi3-pdot'},G.gc);
      el.od=S('circle',{r:4.5,'class':'mi3-pring'},G.gc);
      el.ed=S('circle',{r:4.5,'class':'mi3-dot'},G.gc);
      el.el=text(svg,0,0,'e(p, ū)','mi3-tb nf-halo');
      el.ol=text(svg,0,0,'p·h(p⁰)','mi3-tp nf-halo');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    /* the top of the expenditure axis: e and the old bundle's cost line over the price range */
    function yTop(){
      var b=sol(st.p0), m=0, i, q;
      for(i=0;i<=60;i++){ q=PL+(PH-PL)*i/60; m=Math.max(m,sol(q).e); if(b.h) m=Math.max(m,q*b.h[0]+P2*b.h[1]); }
      return niceUp(m*1.04);
    }
    function iso(e,cost,p1){ setLine(e,F.xs(cost/p1),F.ys(0),F.xs(0),F.ys(cost/P2)); }
    function paint(){
      var p1=st.p1, p0=st.p0, a=sol(p1), b=sol(p0), es=[], ls=[], i, q, old=null, gap=null, slope, fixed;
      el.ic.setAttribute('d',pathOf(icPts(),F));
      /* the lower plot's height follows the curves; redraw when it would change */
      if(yTop()!==G.yd[1]){ draw(); return; }
      for(i=0;i<=240;i++){ q=PL+(PH-PL)*i/240; es.push([q,sol(q).e]); if(b.h) ls.push([q,q*b.h[0]+P2*b.h[1]]); }
      el.ec.setAttribute('d',pathOf(es,G));
      el.old.setAttribute('d',b.h?pathOf(ls,G):'');
      at(el.ed,G.xs(p1),G.ys(a.e));
      moveTo(el.el,G.xs(PH)-4,G.ys(es[es.length-1][1])+15); el.el.setAttribute('text-anchor','end');
      if(b.h){
        old=p1*b.h[0]+P2*b.h[1]; gap=old-a.e;
        el.od.setAttribute('r',4.5); at(el.od,G.xs(p1),G.ys(old));
        setLine(el.gap,G.xs(p1),G.ys(old),G.xs(p1),G.ys(a.e));
        el.t0.setAttribute('r',4); at(el.t0,G.xs(p0),G.ys(b.e));
        el.ol.textContent='p·h(p⁰)'; el.ol.setAttribute('text-anchor','end'); moveTo(el.ol,G.xs(PH)-4,G.ys(ls[ls.length-1][1])-7);
        el.h0.setAttribute('r',4.5); at(el.h0,F.xs(b.h[0]),F.ys(b.h[1]));
        el.h0l.textContent='h(p⁰)'; moveTo(el.h0l,F.xs(b.h[0])+8,F.ys(b.h[1])+15);
        iso(el.iso0,old,p1);
      } else {
        el.od.setAttribute('r',0); setLine(el.gap,0,0,0,0); el.t0.setAttribute('r',0); el.ol.textContent='';
        el.h0.setAttribute('r',0); el.h0l.textContent=''; setLine(el.iso0,0,0,0,0);
      }
      iso(el.iso,a.e,p1);
      if(a.h){ el.h.setAttribute('r',5); at(el.h,F.xs(a.h[0]),F.ys(a.h[1])); el.hl.textContent='h(p)'; moveTo(el.hl,F.xs(a.h[0])+8,F.ys(a.h[1])-8); }
      else { el.h.setAttribute('r',0); el.hl.textContent=''; }
      /* the slope of e at p0: h1(p0) where h is unique; at a kink the left and right slopes differ */
      slope=b.h?b.h[0]:'n/a';
      fixed=st.sig==='0';
      cur={sig:st.sig, p1:p1, p0:p0, e:a.e, uniq:a.ok, uniq0:b.ok, slope:slope, e0:b.e};
      if(a.h){ cur.h1=a.h[0]; cur.h2=a.h[1]; }
      if(b.h){ cur.h01=b.h[0]; cur.h02=b.h[1]; cur.old=old; cur.gap=gap; } else { cur.old='n/a'; cur.gap='n/a'; }
      out.textContent='';
      put(out,(a.h?'h(p) = '+pair(a.h[0],a.h[1],2):'h(p) is every bundle on the indifference line')+'   e(p, ū) = '+fmt(a.e,2)+' at p₁ = '+fmt(p1,2));
      if(b.h){
        put(out,'\nold bundle h(p⁰) = '+pair(b.h[0],b.h[1],2)+' costs p·h(p⁰) = '+fmt(old,2)+(gap>5e-3?', so substitution saves '+fmt(gap,2):', the cheapest way to reach ū'));
        put(out,'\nslope of e at p₁⁰ = '+fmt(p0,2)+': ∂e/∂p₁ = '+fmt(slope,2)+' = h₁(p⁰)'+(fixed?', the same at every price':''));
      } else {
        put(out,'\n'); warn(out,'at p₁⁰ = p₂ every bundle on the indifference line is cheapest: h(p⁰) is not unique and e has a kink, left slope 10, right slope 0, so Shephard’s lemma does not apply');
      }
    }
    /* the Try it steps read e, h, the old bundle's cost and the slope at p0; set takes sig, p1 and p0 */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
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

  /* ---------- 5. Slutsky: a price rise split into substitution and income effects ---------- */
  NF.register('mi3-slutsky',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var PL=0.5, PH=3, W=520, H=0, F, el={}, st={pref:'cd', p1:1.5, w:10}, cur={}, api=null, dom=null;
    var rp1=range(fig,'p1',2,function(v){ st.p1=v; update(); }),
        rw=range(fig,'w',1,function(v){ st.w=v; update(); });
    if(rp1) st.p1=rp1.v();
    if(rw) st.w=rw.v();
    st.pref=seg(fig,'data-pref',function(v){ st.pref=v; update(); }) || 'cd';
    /* u = sqrt(x1 x2) or ln x1 + x2; p2 = 1 and the old price of good 1 is 1 */
    function x(p1,w){
      if(st.pref==='cd') return [w/(2*p1),w/2];
      return w>1?[1/p1,w-1]:[w/p1,0];
    }
    function v(p1,w){
      if(st.pref==='cd') return w/(2*Math.sqrt(p1));
      return w>1?-Math.log(p1)+w-1:Math.log(w/p1);
    }
    function h(p1,u){
      if(st.pref==='cd') return [u/Math.sqrt(p1),u*Math.sqrt(p1)];
      return u+Math.log(p1)>0?[1/p1,u+Math.log(p1)]:[Math.exp(u),0];
    }
    function e(p1,u){ var b=h(p1,u); return p1*b[0]+b[1]; }
    /* the axes depend on the preference and w only, so they stay put while p1 moves */
    function domain(){
      var u=v(1,st.w), mx=st.w, my=st.w, i, q, b;
      for(i=0;i<=60;i++){ q=PL+(PH-PL)*i/60; b=h(q,u); mx=Math.max(mx,b[0]); my=Math.max(my,b[1],e(q,u)); }
      return [niceUp(1.08*mx),niceUp(1.08*my)];
    }
    function draw(){
      W=measure(svg);
      H=Math.round(clamp(W*0.66,250,340)); frame(svg,W,H);
      dom=domain();
      F=box(svg,W,8,H-24,[0,dom[0]],[0,dom[1]],'x₁','x₂');
      el.bud0=line(F.gc,0,0,0,0,'mi3-bud0');
      el.comp=line(F.gc,0,0,0,0,'mi3-comp');
      el.bud=line(F.gc,0,0,0,0,'mi3-bud');
      el.ic0=S('path',{'class':'mi3-ic'},F.gc);
      el.ic1=S('path',{'class':'mi3-ic2'},F.gc);
      el.se=vec(F.gc,'mi3-se','mi3-seh');
      el.ie=vec(F.gc,'mi3-ie','mi3-ieh');
      el.A=S('circle',{r:5,'class':'mi3-dot'},F.gc);
      el.B=S('circle',{r:4.5,'class':'mi3-pdot'},F.gc);
      el.C=S('circle',{r:4.5,'class':'mi3-rdot'},F.gc);
      el.Al=text(svg,0,0,'A','nf-lab nf-halo');
      el.Bl=text(svg,0,0,'B','mi3-tp nf-halo');
      el.Cl=text(svg,0,0,'C','mi3-tr nf-halo');
      update();
    }
    function update(){
      var d=domain();
      if(dom && (d[0]!==dom[0] || d[1]!==dom[1])){ draw(); return; }
      paint(); if(api) api.changed();
    }
    function lab(t,P,Q){
      /* put the label on the far side of P from Q, or above when they coincide */
      var dx=P[0]-Q[0], dy=P[1]-Q[1], n=Math.hypot(dx,dy);
      if(n<1){ dx=0.7; dy=-0.7; n=1; }
      moveTo(t,P[0]+dx/n*13,P[1]+dy/n*13+4);
    }
    function paint(){
      var w=st.w, p1=st.p1, u=v(1,w), A=x(1,w), B=h(p1,u), Cb=x(p1,w), ep=e(p1,u), D=Math.max(dom[0],dom[1]), dp=p1-1, pa, pb, pc, s,
          se=B[0]-A[0], ie=Cb[0]-B[0], dx=Cb[0]-A[0], u1=v(p1,w), dxdp, dhdp, inc;
      setLine(el.bud0,F.xs(w),F.ys(0),F.xs(0),F.ys(w));
      setLine(el.bud,F.xs(w/p1),F.ys(0),F.xs(0),F.ys(w));
      setLine(el.comp,F.xs(ep/p1),F.ys(0),F.xs(0),F.ys(ep));
      el.ic0.setAttribute('d',pathOf(st.pref==='cd'?IC.cd(u,D):IC.ql(u,D),F));
      el.ic1.setAttribute('d',Math.abs(dp)<1e-9?'':pathOf(st.pref==='cd'?IC.cd(u1,D):IC.ql(u1,D),F));
      pa=[F.xs(A[0]),F.ys(A[1])]; pb=[F.xs(B[0]),F.ys(B[1])]; pc=[F.xs(Cb[0]),F.ys(Cb[1])];
      setVec(el.se,pa[0],pa[1],pb[0],pb[1]);
      setVec(el.ie,pb[0],pb[1],pc[0],pc[1]);
      at(el.A,pa[0],pa[1]); at(el.B,pb[0],pb[1]); at(el.C,pc[0],pc[1]);
      lab(el.Al,pa,pb); lab(el.Bl,pb,pa); lab(el.Cl,pc,pb);
      if(Math.hypot(pc[0]-pb[0],pc[1]-pb[1])<12){ moveTo(el.Cl,pc[0]+12,pc[1]+16); }
      /* the Slutsky terms at the old prices: dx1/dp1 = dh1/dp1 - x1 dx1/dw */
      if(st.pref==='cd'){ dxdp=-w/2; dhdp=-u/2; inc=w/4; }
      else if(w>1){ dxdp=-1; dhdp=-1; inc=0; }
      else { dxdp=-w; dhdp=0; inc=w; }
      cur={pref:st.pref, p1:p1, w:w, ub:u, a1:A[0], a2:A[1], b1:B[0], b2:B[1], c1:Cb[0], c2:Cb[1], ep:ep, comp:ep-w,
        se:se, ie:ie, dx:dx, se2:B[1]-A[1], ie2:Cb[1]-B[1], dxdp:dxdp, dhdp:dhdp, inc:inc, corner:A[1]===0, hcorner:B[1]===0};
      if(Math.abs(dp)>1e-9){ cur.rse=se/dp; cur.rie=ie/dp; cur.rdx=dx/dp; } else { cur.rse=dhdp; cur.rie=-inc; cur.rdx=dxdp; }
      out.textContent='';
      s='A = x(p, w) = h(p, ū) = '+pair(A[0],A[1],2)+'   ū = '+fmt(u,2)+
        '\nB = h(p′, ū) = '+pair(B[0],B[1],2)+'; the purple budget through B costs e(p′, ū) = '+fmt(ep,2)+
        '\nC = x(p′, w) = '+pair(Cb[0],Cb[1],2)+
        '\ngood 1: Δx₁ = '+fmt(dx,2)+' = SE '+fmt(se,2)+' + IE '+fmt(ie,2)+'   good 2: SE '+fmt(B[1]-A[1],2)+', IE '+fmt(Cb[1]-B[1],2);
      put(out,s);
    }
    /* the Try it steps read the three bundles, the split and the Slutsky terms at the old prices; set takes pref, w and p1 (the new price) */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(s){
        if('pref' in s) NF.press(fig,'data-pref',String(s.pref));
        if('w' in s && rw) rw.set(+s.w);
        if('p1' in s && rp1) rp1.set(+s.p1);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
