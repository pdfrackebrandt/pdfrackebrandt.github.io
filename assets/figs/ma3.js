/* Core Macroeconomics L3 figures: the Ramsey phase diagram, an unexpected capital tax, a permanent rise in TFP,
   and growth in efficiency units. Everything is computed from the model y = eps k^alpha with CRRA utility:
   the loci in closed form, the saddle path by integrating outward from the steady state along the stable
   eigenvector (RK4), and the time paths by RK4 forward in time.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma3.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- the model ---------- */
  /* p: a (alpha), d (depreciation), rho, sig (sigma), tau (capital income tax, rebated), eps (TFP), g (labour augmenting
     growth; with g > 0, k and c are per efficiency unit). k dot = F(k, c), c dot = G(k, c). */
  function model(p){
    var a=p.a, d=p.d, rho=p.rho, sig=p.sig, tau=p.tau||0, eps=p.eps||1, g=p.g||0, m={p:p}, Fk, Gk, disc;
    m.f=function(k){ return eps*Math.pow(k,a); };
    m.mpk=function(k){ return a*eps*Math.pow(k,a-1); };
    m.F=function(k,c){ return eps*Math.pow(k,a)-c-(d+g)*k; };
    m.G=function(k,c){ return c*((1-tau)*a*eps*Math.pow(k,a-1)-d-rho-sig*g)/sig; };
    m.hump=function(k){ return eps*Math.pow(k,a)-(d+g)*k; };
    m.ks=Math.pow((1-tau)*a*eps/(d+rho+sig*g),1/(1-a));
    m.cs=m.hump(m.ks);
    m.kgr=Math.pow(a*eps/(d+g),1/(1-a));
    m.cgr=m.hump(m.kgr);
    m.kbar=Math.pow(eps/(d+g),1/(1-a));
    /* linearised at the steady state: [[Fk, -1], [Gk, 0]], eigenvalues of opposite sign, so a saddle */
    Fk=m.mpk(m.ks)-d-g; Gk=m.cs*(1-tau)*a*(a-1)*eps*Math.pow(m.ks,a-2)/sig; disc=Math.sqrt(Fk*Fk-4*Gk);
    m.ls=(Fk-disc)/2; m.lu=(Fk+disc)/2; m.slope=Fk-m.ls; m.half=Math.LN2/(-m.ls);
    return m;
  }
  /* The saddle path from the steady state out to k1: dc/dk = G/F, in steps of ln k with RK4, starting a hair off the
     steady state along the stable eigenvector. Integrating outward is stable: in reverse time nearby paths close in on it. */
  function branch(m,k1,n){
    var ks=m.ks, h0, k, c, x, h, pts=[[ks,m.cs]], i, a1, a2, a3, a4;
    if(Math.abs(k1-ks)<ks*1e-5){ pts.push([k1,m.cs+m.slope*(k1-ks)]); return pts; }
    h0=ks*1e-6*(k1>ks?1:-1); k=ks+h0; c=m.cs+m.slope*h0; x=Math.log(k); h=(Math.log(k1)-x)/n;
    function dc(x,c){ var kk=Math.exp(x); return kk*m.G(kk,c)/m.F(kk,c); }
    pts.push([k,c]);
    for(i=0;i<n;i++){
      a1=dc(x,c); a2=dc(x+h/2,c+h/2*a1); a3=dc(x+h/2,c+h/2*a2); a4=dc(x+h,c+h*a3);
      c+=h/6*(a1+2*a2+2*a3+a4); x+=h;
      if(!isFinite(c) || c<=0) break;
      pts.push([Math.exp(x),c]);
    }
    return pts;
  }
  function saddleAt(m,k){ var b=branch(m,k,320), e=b[b.length-1]; return Math.abs(e[0]-k)<1e-9*Math.max(1,k)?e[1]:NaN; }
  /* both branches, ascending in k */
  function saddle(m,kmin,kmax){
    var L=m.ks>kmin?branch(m,kmin,260).reverse():[[m.ks,m.cs]], Rb=m.ks<kmax?branch(m,kmax,260):[[m.ks,m.cs]];
    return L.concat(Rb.slice(1));
  }
  function interp(pts,k){
    var lo=0, hi=pts.length-1, mid, t;
    if(k<=pts[0][0]) return pts[0][1];
    if(k>=pts[hi][0]) return pts[hi][1];
    while(hi-lo>1){ mid=(lo+hi)>>1; if(pts[mid][0]<=k) lo=mid; else hi=mid; }
    t=(k-pts[lo][0])/(pts[hi][0]-pts[lo][0]);
    return pts[lo][1]+t*(pts[hi][1]-pts[lo][1]);
  }
  /* time path on the saddle path: k dot = F(k, c(k)) with c(k) read off the path; returns [t, k, c] */
  function ride(m,pts,k0,T,n){
    var dt=T/n, k=k0, out=[[0,k0,interp(pts,k0)]], i, a1, a2, a3, a4;
    function kd(k){ return m.F(k,interp(pts,k)); }
    for(i=1;i<=n;i++){
      a1=kd(k); a2=kd(k+dt/2*a1); a3=kd(k+dt/2*a2); a4=kd(k+dt*a3);
      k+=dt/6*(a1+2*a2+2*a3+a4);
      out.push([i*dt,k,interp(pts,k)]);
    }
    return out;
  }
  /* a path off the saddle path, forward in time, until k reaches 0 (tz is that time) or it leaves the box */
  function fly(m,k0,c0,T,n,kcap,ccap){
    var dt=T/n, k=k0, c=c0, out=[[0,k,c]], i, k1, c1, fr, tz=null, a, b;
    function F(k,c){ return m.F(Math.max(k,1e-12),c); }
    function G(k,c){ return m.G(Math.max(k,1e-12),c); }
    for(i=1;i<=n;i++){
      a=[F(k,c),G(k,c)]; b=[F(k+dt/2*a[0],c+dt/2*a[1]),G(k+dt/2*a[0],c+dt/2*a[1])];
      var b3=[F(k+dt/2*b[0],c+dt/2*b[1]),G(k+dt/2*b[0],c+dt/2*b[1])], b4=[F(k+dt*b3[0],c+dt*b3[1]),G(k+dt*b3[0],c+dt*b3[1])];
      k1=k+dt/6*(a[0]+2*b[0]+2*b3[0]+b4[0]); c1=c+dt/6*(a[1]+2*b[1]+2*b3[1]+b4[1]);
      if(!(k1>0)){ fr=k/(k-(isFinite(k1)?k1:0)); tz=(i-1+fr)*dt; out.push([tz,0,c+(isFinite(c1)?(c1-c)*fr:0)]); break; }
      k=k1; c=c1; out.push([i*dt,k,c]);
      if(c<1e-9 || k>kcap || c>ccap) break;
    }
    return {pts:out, tz:tz};
  }

  /* ---------- drawing ---------- */
  function niceStep(span,n){ var raw=span/n, mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), r=raw/mag; return (r<1.5?1:r<2.25?2:r<3.5?2.5:r<7.5?5:10)*mag; }
  function ticks(lo,hi,n){ var st=niceStep(hi-lo,n), out=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9*st;v+=st) out.push(Math.round(v/st)*st); return out; }
  function niceCeil(v,st){ return Math.ceil(v/st-1e-9)*st; }
  /* a plot box with grid and tick labels; the axis names sit inside the box at its ends */
  /* low: the x name goes on the tick row (in place of the last tick label), for panels whose bottom right is busy */
  function panel(g0,x0,y0,w,h,xr,yr,nx,ny,names,low){
    var g=S('g',null,g0), sx=lin(xr[0],xr[1],x0,x0+w), sy=lin(yr[0],yr[1],y0+h,y0), xt=ticks(xr[0],xr[1],nx), yt=ticks(yr[0],yr[1],ny), i, v;
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,x0,C(sy(v)),x0+w,C(sy(v)),Math.abs(v-yr[0])<1e-12?'nf-ax':'nf-grid'); text(g,x0-6,sy(v)+4,tl(v),null,'end'); }
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(sx(v)),y0,C(sx(v)),y0+h,Math.abs(v-xr[0])<1e-12?'nf-ax':'nf-grid'); if(!low || sx(v)<x0+w-24) text(g,sx(v),y0+h+15,tl(v),null,'middle'); }
    line(g,C(x0),y0,C(x0),y0+h,'nf-ax'); line(g,x0,C(y0+h),x0+w,C(y0+h),'nf-ax');
    if(names){ text(g,x0+w-(low?2:4),low?y0+h+15:y0+h-6,names[0],'nf-title nf-halo ma3-it','end'); text(g,x0+6,y0+12,names[1],'nf-title nf-halo ma3-it'); }
    return {sx:sx, sy:sy, x0:x0, y0:y0, w:w, h:h, xr:xr, yr:yr};
  }
  function pathOf(P,pts,ix,iy){ var a=[], i; for(i=0;i<pts.length;i++) a.push([P.sx(pts[i][ix]),P.sy(pts[i][iy])]); return poly(a); }
  function curve(P,f,lo,hi,n){ var a=[], i, k; for(i=0;i<=n;i++){ k=lo+(hi-lo)*i/n; a.push([P.sx(k),P.sy(f(k))]); } return poly(a); }
  /* an arrow: a stroked shaft and a filled head */
  function arrow(g,cls){ return {l:line(g,0,0,0,0,cls), h:S('path',{'class':cls+'h'},g)}; }
  function setArrow(A,x0,y0,x1,y1){
    var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(L<4){ setLine(A.l,x0,y0,x0,y0); A.l.setAttribute('visibility','hidden'); A.h.setAttribute('d',''); return; }
    A.l.removeAttribute('visibility');
    ux=dx/L; uy=dy/L; hl=Math.min(8,L*0.5); bx=x1-ux*hl; by=y1-uy*hl;
    setLine(A.l,x0,y0,bx+ux,by+uy);
    A.h.setAttribute('d',poly([[x1,y1],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  /* the slides' arrow pairs: in each region, which way k (horizontal) and c (vertical) move */
  function regionArrows(g,P,m,ky){
    var xs=[m.ks*0.5,m.ks+(P.xr[1]-m.ks)*0.5], i, j, k, hk, ys, c, x, y, sF, sG, A;
    for(i=0;i<2;i++){
      k=xs[i]; hk=m.hump(k);
      if(k<=P.xr[0] || k>=P.xr[1]) continue;
      ys=[Math.max(hk,0)/2, (Math.max(hk,0)+P.yr[1])/2];
      for(j=0;j<2;j++){
        c=ys[j]; x=P.sx(k); y=P.sy(c);
        if(Math.abs(P.sy(hk)-y)<20) continue;
        sF=m.F(k,c)>0?1:-1; sG=(ky?ky(k):m.G(k,c))>0?1:-1;
        A=arrow(g,'ma3-arr'); setArrow(A,x,y,x+sF*15,y);
        A=arrow(g,'ma3-arr'); setArrow(A,x,y,x,y-sG*15);
      }
    }
  }
  /* figure frame: legend, phase plane, a second legend, then the time panel */
  function layout(svg,W,items1,items2){
    var mL=W<420?34:42, mR=12, o={W:W, mL:mL, mR:mR}, rows;
    frame(svg,W,100);
    rows=key(S('g',null,svg),items1,mL,13,W-mR);
    o.top=13+(rows-1)*16+14;
    o.pw=W-mL-mR; o.ph=Math.round(clamp(W*0.5,190,290));
    o.y2=o.top+o.ph+40;
    rows=key(S('g',null,svg),items2,mL,o.y2,W-mR);
    o.ttop=o.y2+(rows-1)*16+14; o.th=Math.round(clamp(W*0.27,104,150));
    o.H=o.ttop+o.th+22;
    svg.setAttribute('viewBox','0 0 '+W+' '+o.H);
    return o;
  }
  function handle(svg,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob ma3-knob'},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, dx=0, dy=0;
      if(k==='ArrowRight') dx=1; else if(k==='ArrowLeft') dx=-1;
      else if(k==='ArrowUp') dy=1; else if(k==='ArrowDown') dy=-1;
      else return;
      e.preventDefault(); onKey(dx,dy,e.shiftKey);
    });
    return h;
  }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function pct(v,d){ return (v>0?'+':'')+fmt(v,d)+'%'; }
  /* the time panel: series [t, value] in percent of a reference, with a dashed 100 line and a marker at t0 */
  function timePanel(g,o,T,series,yr,t0,ref){
    var P=panel(g,o.mL,o.ttop,o.pw,o.th,[0,T],yr,o.pw<300?4:6,3,['t',ref],true), cg=clip(g,o.mL,o.ttop-1,o.pw,o.th+2), i;
    if(ref==='%') line(cg,o.mL,C(P.sy(100)),o.mL+o.pw,C(P.sy(100)),'ma3-ref');
    if(t0) line(cg,C(P.sx(t0)),o.ttop,C(P.sx(t0)),o.ttop+o.th,'ma3-shock');
    for(i=0;i<series.length;i++) S('path',{d:pathOf(P,series[i].pts,0,1),'class':series[i].cls},cg);
    return P;
  }
  function pcts(path,ks,cs,t0){
    var k=[], c=[], i;
    if(t0){ k.push([0,100]); c.push([0,100]); }
    for(i=0;i<path.length;i++){ k.push([path[i][0]+(t0||0),100*path[i][1]/ks]); c.push([path[i][0]+(t0||0),100*path[i][2]/cs]); }
    return {k:k, c:c};
  }
  function seriesMax(list){ var mx=-Infinity, i, j; for(i=0;i<list.length;i++) for(j=0;j<list[i].length;j++) if(list[i][j][1]>mx) mx=list[i][j][1]; return mx; }
  function seriesMin(list){ var mn=Infinity, i, j; for(i=0;i<list.length;i++) for(j=0;j<list[i].length;j++) if(list[i][j][1]<mn) mn=list[i][j][1]; return mn; }
  function horizon(m){ return clamp(niceCeil(6*m.half,10),20,150); }

  /* ---------- 1. The phase diagram and the saddle path ---------- */
  NF.register('ma3-phase',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var P0={a:0.3,d:0.1,rho:0.05,sig:2}, p={a:0.3,d:0.1,rho:0.05,sig:2,tau:0,eps:1,g:0}, st={kr:0.3,gr:0,on:true},
        m, sp, xr, yr, T, W=520, o, Ph, el={}, hs=null, cur={}, api, drag=false, K0, C0, res, resc;
    var rs={a:range(fig,'alpha',2,par('a')), d:range(fig,'delta',2,par('d')), rho:range(fig,'rho',3,par('rho')), sig:range(fig,'sigma',2,par('sig'))};
    if(rs.a){ p.a=rs.a.v(); p.d=rs.d.v(); p.rho=rs.rho.v(); p.sig=rs.sig.v(); }
    function par(k){ return function(v){ p[k]=v; solve(); draw(); }; }
    onClick(fig,'.nfig-reset',function(){ var k; st={kr:0.3,gr:0,on:true}; for(k in P0){ p[k]=P0[k]; if(rs[k]) rs[k].set(P0[k]); } solve(); draw(); });
    onClick(fig,'.ma3-onpath',function(){ st.on=true; st.gr=0; paint(); });
    function solve(){
      m=model(p);
      xr=[0,2*m.kgr]; yr=[0,1.6*m.cgr];
      res=Math.pow(10,Math.floor(Math.log(xr[1]/200)/Math.LN10)); resc=Math.pow(10,Math.floor(Math.log(yr[1]/200)/Math.LN10));
      sp=saddle(m,xr[1]*0.002,xr[1]*1.02);
      T=horizon(m);
    }
    function draw(){
      W=measure(svg);
      o=layout(svg,W,[['line','ma3-sp','saddle path'],['line','ma3-path','path from your start'],['line','ma3-cd','ċ = 0'],['line','ma3-kd','k̇ = 0']],
        [['line','ma3-c','c, % of steady state'],['line','ma3-k','k, % of steady state']]);
      Ph=panel(svg,o.mL,o.top,o.pw,o.ph,xr,yr,o.pw<300?4:6,4,['k','c']);
      var cg=clip(svg,o.mL,o.top,o.pw,o.ph), sx=Ph.sx, sy=Ph.sy;
      line(cg,C(sx(m.kgr)),o.top,C(sx(m.kgr)),o.top+o.ph,'ma3-gr');
      text(svg,sx(m.kgr)+4,o.top+o.ph-6,'golden rule','nf-lab nf-halo ma3-small');
      S('path',{d:curve(Ph,m.hump,0,xr[1],240),'class':'ma3-kd'},cg);
      line(cg,C(sx(m.ks)),o.top,C(sx(m.ks)),o.top+o.ph,'ma3-cd');
      text(svg,sx(m.ks)+5,o.top+12,'ċ = 0','ma3-cdl nf-halo');
      text(svg,o.mL+o.pw-4,sy(m.hump(xr[1]))+16,'k̇ = 0','nf-lab nf-halo','end');
      regionArrows(cg,Ph,m);
      S('path',{d:pathOf(Ph,sp,0,1),'class':'ma3-sp'},cg);
      el.path=S('path',{'class':'ma3-path'},cg);
      el.zero=S('path',{'class':'ma3-zero'},cg);
      el.ss=S('circle',{r:4.5,'class':'ma3-ssd'},cg); at(el.ss,sx(m.ks),sy(m.cs));
      el.tg=S('g',null,svg);
      hs=handle(svg,'Starting point (k₀, c₀), arrow keys move it',function(dx,dy,big){
        if(dx) moveTo(K0+dx*xr[1]*(big?0.05:0.01),null);
        if(dy) moveTo(K0,C0+dy*yr[1]*(big?0.05:0.01),true);
      });
      paint();
    }
    function start(){
      K0=clamp(st.kr*m.ks,0.02*xr[1],0.98*xr[1]);
      var csp=interp(sp,K0);
      C0=st.on?csp:csp*(1+st.gr);
      return csp;
    }
    /* move the start to (k, c) in model units; c null keeps it on (or the same share off) the saddle path */
    function moveTo(k,c,nosnap){
      var csp;
      k=clamp(Math.round(k/res)*res,0.02*xr[1],0.98*xr[1]);
      csp=interp(sp,k);
      if(c===null){ st.kr=k/m.ks; paint(); return; }
      c=clamp(Math.round(c/resc)*resc,0.004*yr[1],0.98*yr[1]);
      st.kr=k/m.ks;
      if(!nosnap && Math.abs(Ph.sy(c)-Ph.sy(csp))<7){ st.on=true; st.gr=0; }
      else { st.on=false; st.gr=c/csp-1; }
      paint();
    }
    function paint(){
      var csp=start(), sx=Ph.sx, sy=Ph.sy, fate, run, tz=null, pts, s, ser, yt, ymax, path, kend;
      if(st.on){ fate='saddle'; path=ride(m,sp,K0,T,400); pts=path; }
      else {
        fate=st.gr>0?'collapse':'tc';
        run=fly(m,K0,C0,6*T,2400,8*xr[1],20*yr[1]); tz=run.tz; pts=run.pts; path=pts;
      }
      el.path.setAttribute('d',pathOf(Ph,pts,1,2));
      if(fate==='collapse' && tz!==null){ var e=pts[pts.length-1], x=sx(0), y=sy(e[2]); el.zero.setAttribute('d','M'+R(x-5)+','+R(y-5)+'L'+R(x+5)+','+R(y+5)+'M'+R(x-5)+','+R(y+5)+'L'+R(x+5)+','+R(y-5)); }
      else el.zero.setAttribute('d','');
      hs.setAttribute('transform','translate('+R(sx(K0))+','+R(sy(C0))+')');
      hs.setAttribute('aria-valuenow',+K0.toFixed(2));
      hs.setAttribute('aria-valuetext','k₀ = '+fmt(K0,2)+', c₀ = '+fmt(C0,3)+(st.on?', on the saddle path':''));
      /* time panel, percent of the steady state, over the first T years */
      while(el.tg.firstChild) el.tg.removeChild(el.tg.firstChild);
      ser=pcts(path.filter(function(q){ return q[0]<=T+1e-9; }),m.ks,m.cs,0);
      ymax=clamp(niceCeil(Math.max(150,1.1*seriesMax([ser.k,ser.c])),50),150,250);
      timePanel(el.tg,o,T,[{pts:ser.k,cls:'ma3-k'},{pts:ser.c,cls:'ma3-c'}],[0,ymax],0,'%');
      kend=path[path.length-1][1];
      cur={alpha:p.a, delta:p.d, rho:p.rho, sigma:p.sig, ks:m.ks, cs:m.cs, kgr:m.kgr, cgr:m.cgr, kbar:m.kbar,
        k0:K0, c0:C0, csp:csp, gap:C0-csp, on:st.on, fate:fate, tz:tz===null?0:tz, ls:m.ls, lu:m.lu, slope:m.slope, half:m.half,
        rbar:m.mpk(m.kbar)-p.d, kend:kend, horizon:T};
      if(api) api.changed();
      if(!out) return;
      s='steady state k = '+fmt(m.ks,2)+', c = '+fmt(m.cs,3)+'   golden rule k = '+fmt(m.kgr,2)+'   stable root '+fmt(m.ls,3)+', half life '+fmt(m.half,1)+
        '\nstart k₀ = '+fmt(K0,2)+', c₀ = '+fmt(C0,3)+'; the saddle path at k₀ has c = '+fmt(csp,3);
      out.textContent=s;
      if(fate==='saddle') out.appendChild(document.createTextNode(', so the economy converges to the steady state'));
      else if(fate==='collapse') warn(out,'\nc₀ above the saddle path: k reaches 0 at t = '+(tz===null?'(beyond '+fmt(6*T,0)+')':fmt(tz,1))+', and then c must crash to 0');
      else warn(out,'\nc₀ below the saddle path: c turns down and k heads for k̄ = '+fmt(m.kbar,1)+', where r '+MINUS+' δ = '+fmt(m.mpk(m.kbar)-p.d,3)+' < 0, so the transversality condition fails');
    }
    svg.addEventListener('pointerdown',function(e){
      var q=local(svg,e,W,o.H);
      if(q[0]<o.mL-8 || q[0]>o.mL+o.pw+8 || q[1]<o.top-8 || q[1]>o.top+o.ph+8) return;
      drag=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      try{ hs.focus({preventScroll:true}); }catch(err){}
      moveTo(Ph.sx.inv(q[0]),Ph.sy.inv(q[1]));
    });
    svg.addEventListener('pointermove',function(e){ if(!drag) return; var q=local(svg,e,W,o.H); moveTo(Ph.sx.inv(q[0]),Ph.sy.inv(q[1])); });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1 || !hs) return;
      var q=local(svg,e.touches[0],W,o.H);
      if(Math.hypot(q[0]-Ph.sx(K0),q[1]-Ph.sy(C0))<26) e.preventDefault();
    },{passive:false});
    /* the Try it steps read the parameters, the start and its fate; set takes alpha, delta, rho, sigma, k0, c0 and on=1 */
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(o2){
        var map={alpha:'a', delta:'d', rho:'rho', sigma:'sig'}, k, changed=false, c, csp;
        for(k in map) if(k in o2){ if(rs[map[k]]){ rs[map[k]].set(+o2[k]); p[map[k]]=rs[map[k]].v(); } else p[map[k]]=+o2[k]; changed=true; }
        if(changed){ solve(); draw(); }
        if('k0' in o2 || 'c0' in o2 || 'on' in o2){
          k='k0' in o2?+o2.k0:K0;
          k=clamp(k,0.02*xr[1],0.98*xr[1]); st.kr=k/m.ks;
          if(o2.on===1 || o2.on==='true' || o2.on===true){ st.on=true; st.gr=0; }
          else if('c0' in o2){ c=+o2.c0; csp=interp(sp,k); st.on=false; st.gr=c/csp-1; }
          paint();
        }
      }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. An unexpected capital income tax ---------- */
  NF.register('ma3-tax',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var base={a:0.3,d:0.1,rho:0.05,sig:2,tau:0,eps:1,g:0}, tau=0.2, sig=2, m0, m1, sp1, sp0, cimp, path, T, t0, W=520, o, cur={}, api;
    var M0=model(base), xr=[0,1.35*M0.kgr], yr=[0,1.5*M0.cgr];
    var rt=range(fig,'tau',2,function(v){ tau=v; solve(); draw(); }), rsg=range(fig,'sigma',2,function(v){ sig=v; solve(); draw(); });
    if(rt) tau=rt.v();
    if(rsg) sig=rsg.v();
    function solve(){
      m0=model({a:0.3,d:0.1,rho:0.05,sig:sig,tau:0,eps:1,g:0});
      m1=model({a:0.3,d:0.1,rho:0.05,sig:sig,tau:tau,eps:1,g:0});
      sp1=saddle(m1,xr[1]*0.002,xr[1]*1.02);
      sp0=saddle(m0,xr[1]*0.002,xr[1]*1.02);
      cimp=saddleAt(m1,m0.ks);
      T=horizon(m1); t0=Math.round(T/8);
      path=ride(m1,sp1,m0.ks,T-t0,400);
      path[0][2]=cimp;
    }
    function draw(){
      W=measure(svg);
      o=layout(svg,W,[['line','ma3-sp','new saddle path'],['line','ma3-sp ma3-faint','old saddle path'],['line','ma3-path','jump, then the path'],['line','ma3-cd','ċ = 0 with the tax'],['line','ma3-cd ma3-old','ċ = 0 before']],
        [['line','ma3-c','c, % of the old steady state'],['line','ma3-k','k, % of the old steady state']]);
      var P=panel(svg,o.mL,o.top,o.pw,o.ph,xr,yr,o.pw<300?4:6,4,['k','c']), cg=clip(svg,o.mL,o.top,o.pw,o.ph), sx=P.sx, sy=P.sy, A, ser, lo, hi, d;
      line(cg,C(sx(m1.kgr)),o.top,C(sx(m1.kgr)),o.top+o.ph,'ma3-gr');
      text(svg,sx(m1.kgr)+4,o.top+o.ph-6,'golden rule','nf-lab nf-halo ma3-small');
      S('path',{d:curve(P,m1.hump,0,xr[1],240),'class':'ma3-kd'},cg);
      text(svg,o.mL+o.pw-4,sy(m1.hump(xr[1]))+16,'k̇ = 0','nf-lab nf-halo','end');
      line(cg,C(sx(m0.ks)),o.top,C(sx(m0.ks)),o.top+o.ph,'ma3-cd ma3-old');
      line(cg,C(sx(m1.ks)),o.top,C(sx(m1.ks)),o.top+o.ph,'ma3-cd');
      S('path',{d:pathOf(P,sp0,0,1),'class':'ma3-sp ma3-faint'},cg);
      S('path',{d:pathOf(P,sp1,0,1),'class':'ma3-sp'},cg);
      S('path',{d:pathOf(P,path,1,2),'class':'ma3-path'},cg);
      A=arrow(cg,'ma3-jump'); setArrow(A,sx(m0.ks),sy(m0.cs),sx(m0.ks),sy(cimp));
      S('circle',{r:4.5,'class':'ma3-ssold',cx:R(sx(m0.ks)),cy:R(sy(m0.cs))},cg);
      S('circle',{r:4.5,'class':'ma3-ssd',cx:R(sx(m1.ks)),cy:R(sy(m1.cs))},cg);
      ser=pcts(path,m0.ks,m0.cs,t0);
      ser.c.splice(1,0,[t0,100]);
      lo=Math.min(100,seriesMin([ser.c,ser.k])); hi=Math.max(100,seriesMax([ser.c,ser.k]));
      d=Math.max(10,(hi-lo)*0.12);
      timePanel(S('g',null,svg),o,T,[{pts:ser.k,cls:'ma3-k'},{pts:ser.c,cls:'ma3-c'}],[Math.floor((lo-d)/10)*10,Math.ceil((hi+d)/10)*10],t0,'%');
      paint();
    }
    function paint(){
      var jump=100*(cimp/m0.cs-1), lr=100*(m1.cs/m0.cs-1), dk=100*(m1.ks/m0.ks-1), fk=(0.1+0.05)/(1-tau), s;
      cur={tau:tau, sigma:sig, fk:fk, ks0:m0.ks, cs0:m0.cs, ks1:m1.ks, cs1:m1.cs, cimp:cimp, jump:jump, lr:lr, dk:dk, kgr:m1.kgr, half:m1.half,
        up:jump>1e-6?'up':jump<-1e-6?'down':'none', rnet:(1-tau)*m1.mpk(m0.ks)-0.1};
      if(api) api.changed();
      if(!out) return;
      s='τ = '+fmt(tau,2)+': f′(k) = (δ + ρ)/(1 '+MINUS+' τ) = '+fmt(fk,4)+', so the steady state k goes from '+fmt(m0.ks,2)+' to '+fmt(m1.ks,2)+' ('+pct(dk,1)+')'+
        '\non impact c goes from '+fmt(m0.cs,3)+' to '+fmt(cimp,3)+' ('+pct(jump,1)+'); in the long run c = '+fmt(m1.cs,3)+' ('+pct(lr,1)+')';
      out.textContent=s;
    }
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('tau' in st){ if(rt) rt.set(+st.tau); else { tau=+st.tau; solve(); draw(); } }
        if('sigma' in st){ if(rsg) rsg.set(+st.sigma); else { sig=+st.sigma; solve(); draw(); } }
      }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. A permanent rise in TFP ---------- */
  NF.register('ma3-tfp',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var eps=1.3, sig=2, a=0.3, m0, m1, sp0, sp1, cimp, path, T, t0, W=520, o, cur={}, api;
    var Mx=model({a:a,d:0.1,rho:0.05,sig:2,eps:1.6}), xr=[0,1.3*Mx.ks], yr=[0,1.25*Mx.cgr];
    var re=range(fig,'eps',2,function(v){ eps=v; solve(); draw(); }), rsg=range(fig,'sigma',2,function(v){ sig=v; solve(); draw(); });
    if(re) eps=re.v();
    if(rsg) sig=rsg.v();
    function solve(){
      m0=model({a:a,d:0.1,rho:0.05,sig:sig,eps:1});
      m1=model({a:a,d:0.1,rho:0.05,sig:sig,eps:eps});
      sp0=saddle(m0,xr[1]*0.002,xr[1]*1.02);
      sp1=saddle(m1,xr[1]*0.002,xr[1]*1.02);
      cimp=eps===1?m0.cs:saddleAt(m1,m0.ks);
      T=horizon(m1); t0=Math.round(T/8);
      path=ride(m1,sp1,m0.ks,T-t0,400);
      path[0][2]=cimp;
    }
    function draw(){
      W=measure(svg);
      o=layout(svg,W,[['line','ma3-sp','new saddle path'],['line','ma3-sp ma3-faint','old saddle path'],['line','ma3-ray','ray c = (c*/k*) k'],['line','ma3-path','jump, then the path']],
        [['line','ma3-c','c, % of the old steady state'],['line','ma3-k','k, % of the old steady state']]);
      var P=panel(svg,o.mL,o.top,o.pw,o.ph,xr,yr,o.pw<300?4:6,4,['k','c']), cg=clip(svg,o.mL,o.top,o.pw,o.ph), sx=P.sx, sy=P.sy, A, ser, lo, hi, d, ray=m0.cs/m0.ks;
      S('path',{d:curve(P,m0.hump,0,xr[1],240),'class':'ma3-kd ma3-old'},cg);
      S('path',{d:curve(P,m1.hump,0,xr[1],240),'class':'ma3-kd'},cg);
      line(cg,C(sx(m0.ks)),o.top,C(sx(m0.ks)),o.top+o.ph,'ma3-cd ma3-old');
      line(cg,C(sx(m1.ks)),o.top,C(sx(m1.ks)),o.top+o.ph,'ma3-cd');
      text(svg,sx(m1.ks)+5,o.top+12,'ċ = 0','ma3-cdl nf-halo');
      text(svg,o.mL+o.pw-4,sy(m1.hump(xr[1]))+16,'k̇ = 0','nf-lab nf-halo','end');
      line(cg,sx(0),sy(0),sx(xr[1]),sy(ray*xr[1]),'ma3-ray');
      S('path',{d:pathOf(P,sp0,0,1),'class':'ma3-sp ma3-faint'},cg);
      S('path',{d:pathOf(P,sp1,0,1),'class':'ma3-sp'},cg);
      S('path',{d:pathOf(P,path,1,2),'class':'ma3-path'},cg);
      A=arrow(cg,'ma3-jump'); setArrow(A,sx(m0.ks),sy(m0.cs),sx(m0.ks),sy(cimp));
      S('circle',{r:4.5,'class':'ma3-ssold',cx:R(sx(m0.ks)),cy:R(sy(m0.cs))},cg);
      S('circle',{r:4.5,'class':'ma3-ssd',cx:R(sx(m1.ks)),cy:R(sy(m1.cs))},cg);
      ser=pcts(path,m0.ks,m0.cs,t0);
      ser.c.splice(1,0,[t0,100]);
      lo=Math.min(100,seriesMin([ser.c,ser.k])); hi=Math.max(100,seriesMax([ser.c,ser.k]));
      d=Math.max(10,(hi-lo)*0.12);
      timePanel(S('g',null,svg),o,T,[{pts:ser.k,cls:'ma3-k'},{pts:ser.c,cls:'ma3-c'}],[Math.floor((lo-d)/10)*10,Math.ceil((hi+d)/10)*10],t0,'%');
      paint();
    }
    function paint(){
      var jump=100*(cimp/m0.cs-1), scale=Math.pow(eps,1/(1-a)), ray=m0.cs/m0.ks, up=jump>1e-6?'up':jump<-1e-6?'down':'none', s;
      cur={eps:eps, sigma:sig, alpha:a, scale:scale, ks0:m0.ks, cs0:m0.cs, ks1:m1.ks, cs1:m1.cs, cimp:cimp, jump:jump, up:up,
        slope:m1.slope, ray:ray, sbar:a, rnet0:eps*(0.05+0.1)-0.1, half:m1.half, lr:100*(m1.cs/m0.cs-1)};
      if(api) api.changed();
      if(!out) return;
      s='ε′ = '+fmt(eps,2)+': k* and c* both scale by ε′^(1/(1 '+MINUS+' α)) = '+fmt(scale,3)+', so k* goes from '+fmt(m0.ks,2)+' to '+fmt(m1.ks,2)+
        '\nσ = '+fmt(sig,2)+(up==='up'?' > ':up==='down'?' < ':' = ')+'α = '+fmt(a,2)+': saddle slope '+fmt(m1.slope,3)+' against the ray '+fmt(ray,3)+', so c '+
        (up==='up'?'jumps up '+fmt(jump,1)+'% on impact':up==='down'?'falls '+fmt(-jump,1)+'% on impact':'does not move on impact');
      out.textContent=s;
    }
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('eps' in st){ if(re) re.set(+st.eps); else { eps=+st.eps; solve(); draw(); } }
        if('sigma' in st){ if(rsg) rsg.set(+st.sigma); else { sig=+st.sigma; solve(); draw(); } }
      }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Growth in efficiency units (beyond the slides) ---------- */
  NF.register('ma3-growth',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var p={a:0.3,d:0.1,rho:0.05,sig:2,tau:0,eps:1,g:0.02}, k0r=0.5, m, m00, sp, path, T, W=520, o, cur={}, api;
    var Mb=model({a:0.3,d:0.1,rho:0.05,sig:2,g:0}), xr=[0,1.4*Mb.kgr], yr=[0,1.5*Mb.cgr];
    var rg=range(fig,'g',3,function(v){ p.g=v; solve(); draw(); }), rsg=range(fig,'sigma',2,function(v){ p.sig=v; solve(); draw(); }),
        rr=range(fig,'rho',3,function(v){ p.rho=v; solve(); draw(); }), rk=range(fig,'k0',2,function(v){ k0r=v; solve(); draw(); });
    if(rg){ p.g=rg.v(); p.sig=rsg.v(); p.rho=rr.v(); k0r=rk.v(); }
    function solve(){
      m=model(p);
      m00=model({a:p.a,d:p.d,rho:p.rho,sig:p.sig,g:0});
      sp=saddle(m,xr[1]*0.002,xr[1]*1.02);
      T=clamp(niceCeil(5*m.half,10),20,150);
      path=ride(m,sp,k0r*m.ks,T,400);
    }
    function draw(){
      W=measure(svg);
      o=layout(svg,W,[['line','ma3-sp','saddle path'],['line','ma3-path','path from k̂₀'],['line','ma3-cd','ĉ constant'],['line','ma3-kd','k̂ constant'],['line','ma3-kd ma3-old','both at g = 0']],
        [['line','ma3-c','growth of c per worker, %'],['line','ma3-k','growth of k per worker, %'],['line','ma3-gline','g']]);
      var P=panel(svg,o.mL,o.top,o.pw,o.ph,xr,yr,o.pw<300?4:6,4,['k̂','ĉ']), cg=clip(svg,o.mL,o.top,o.pw,o.ph), sx=P.sx, sy=P.sy,
          gc=[], gk=[], i, q, lo, hi, Tp, d;
      S('path',{d:curve(P,m00.hump,0,xr[1],240),'class':'ma3-kd ma3-old'},cg);
      line(cg,C(sx(m00.ks)),o.top,C(sx(m00.ks)),o.top+o.ph,'ma3-cd ma3-old');
      line(cg,C(sx(m.kgr)),o.top,C(sx(m.kgr)),o.top+o.ph,'ma3-gr');
      text(svg,sx(m.kgr)+4,o.top+o.ph-6,'golden rule','nf-lab nf-halo ma3-small');
      S('path',{d:curve(P,m.hump,0,xr[1],240),'class':'ma3-kd'},cg);
      line(cg,C(sx(m.ks)),o.top,C(sx(m.ks)),o.top+o.ph,'ma3-cd');
      if(sx(m.ks)-o.mL>96) text(svg,sx(m.ks)-5,o.top+12,'ĉ constant','ma3-cdl nf-halo','end'); else text(svg,sx(m.ks)+5,o.top+12,'ĉ constant','ma3-cdl nf-halo');
      text(svg,o.mL+o.pw-4,sy(m.hump(xr[1]))+16,'k̂ constant','nf-lab nf-halo','end');
      S('path',{d:pathOf(P,sp,0,1),'class':'ma3-sp'},cg);
      S('path',{d:pathOf(P,path,1,2),'class':'ma3-path'},cg);
      S('circle',{r:4.5,'class':'ma3-start',cx:R(sx(path[0][1])),cy:R(sy(path[0][2]))},cg);
      S('circle',{r:4.5,'class':'ma3-ssd',cx:R(sx(m.ks)),cy:R(sy(m.cs))},cg);
      /* growth of per worker c and k: the efficiency unit growth plus g */
      for(i=0;i<path.length;i++){
        q=path[i];
        gc.push([q[0],100*(m.G(q[1],q[2])/q[2]+p.g)]);
        gk.push([q[0],100*(m.F(q[1],q[2])/q[1]+p.g)]);
      }
      lo=Math.min(0,seriesMin([gc,gk])); hi=Math.max(100*p.g,seriesMax([gc,gk]));
      d=Math.max(0.5,(hi-lo)*0.1);
      Tp=timePanel(S('g',null,svg),o,T,[{pts:gk,cls:'ma3-k'},{pts:gc,cls:'ma3-c'}],[Math.floor(lo-d),Math.ceil(hi+d)],0,'%/yr');
      line(svg,o.mL,C(Tp.sy(100*p.g)),o.mL+o.pw,C(Tp.sy(100*p.g)),'ma3-gline');
      cur={g:p.g, sigma:p.sig, rho:p.rho, k0r:k0r, kh:m.ks, ch:m.cs, khgr:m.kgr, rnet:p.rho+p.sig*p.g, ok:p.rho>(1-p.sig)*p.g+1e-12,
        gc0:gc[0][1], gk0:gk[0][1], gcT:gc[gc.length-1][1], half:m.half, mgr:m.ks<m.kgr};
      paint();
    }
    function paint(){
      var s;
      if(api) api.changed();
      if(!out) return;
      s='k̂* = '+fmt(cur.kh,2)+' (golden rule '+fmt(cur.khgr,2)+')   r '+MINUS+' δ = ρ + σg = '+fmt(cur.rnet,3)+
        '\ngrowth of c per worker: '+fmt(cur.gc0,1)+'% at t = 0, '+fmt(cur.gcT,2)+'% at t = '+fmt(T,0)+', heading to g = '+fmt(100*p.g,1)+'%';
      out.textContent=s;
      if(!cur.ok) warn(out,'\nρ ≤ (1 '+MINUS+' σ)g: lifetime utility is infinite and r '+MINUS+' δ ≤ g, so the transversality condition fails: no optimum exists');
    }
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('g' in st && rg) rg.set(+st.g);
        if('sigma' in st && rsg) rsg.set(+st.sigma);
        if('rho' in st && rr) rr.set(+st.rho);
        if('k0r' in st && rk) rk.set(+st.k0r);
      }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
