/* L5 figures: what one coefficient of a multiple regression measures, the Frisch Waugh Lovell theorem.
   Each registers with NF (assets/notes.js) and reuses its helpers. No third party code. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at,
      fmt=NF.fmt, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, yGrid=NF.yGrid, xGrid=NF.xGrid,
      seg=NF.seg, range=NF.range, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  function gauss(rnd){ var a=1-rnd(), b=rnd(); return Math.sqrt(-2*Math.log(a))*Math.cos(6.283185307179586*b); }
  /* solve A b = c for a small square A, Gaussian elimination with partial pivoting */
  function solve(A,c){
    var n=c.length, M=[], i, j, k, p, t, f, x=[];
    for(i=0;i<n;i++) M.push(A[i].slice().concat([c[i]]));
    for(k=0;k<n;k++){
      p=k;
      for(i=k+1;i<n;i++) if(Math.abs(M[i][k])>Math.abs(M[p][k])) p=i;
      t=M[k]; M[k]=M[p]; M[p]=t;
      for(i=k+1;i<n;i++){ f=M[i][k]/M[k][k]; for(j=k;j<=n;j++) M[i][j]-=f*M[k][j]; }
    }
    for(i=n-1;i>=0;i--){ t=M[i][n]; for(j=i+1;j<n;j++) t-=M[i][j]*x[j]; x[i]=t/M[i][i]; }
    return x;
  }
  /* least squares of v on the columns cols (arrays of length n): returns the coefficients */
  function ls(cols,v){
    var K=cols.length, A=[], c=[], i, j, k, s;
    for(i=0;i<K;i++){
      A.push([]);
      for(j=0;j<K;j++){ s=0; for(k=0;k<v.length;k++) s+=cols[i][k]*cols[j][k]; A[i].push(s); }
      s=0; for(k=0;k<v.length;k++) s+=cols[i][k]*v[k]; c.push(s);
    }
    return solve(A,c);
  }
  /* simple regression of v on h with an intercept: slope, intercept, means and R² */
  function simple(h,v){
    var n=h.length, mx=0, my=0, sxx=0, sxy=0, syy=0, i, dx, dy, b;
    for(i=0;i<n;i++){ mx+=h[i]; my+=v[i]; }
    mx/=n; my/=n;
    for(i=0;i<n;i++){ dx=h[i]-mx; dy=v[i]-my; sxx+=dx*dx; sxy+=dx*dy; syy+=dy*dy; }
    b=sxy/sxx;
    return {b:b, a:my-b*mx, mx:mx, my:my, r2:sxy*sxy/(sxx*syy)};
  }
  /* parts alternate base text and subscript: ['r̂','y'] */
  function rich(g,parts,cls){
    var t=S('text',{'class':cls||'nf-lab'},g), i, s, low=false;
    for(i=0;i<parts.length;i++){
      s=S('tspan',null,t);
      if(i%2){ s.setAttribute('class','nf-sub'); s.setAttribute('dy','3'); low=true; }
      else if(low){ s.setAttribute('dy','-3'); low=false; }
      s.textContent=parts[i];
    }
    return t;
  }
  function place(t,x,y,anchor){ t.setAttribute('x',R(x)); t.setAttribute('y',R(y)); t.setAttribute('text-anchor',anchor||'start'); }
  /* a readout line: _y marks a subscript y (Unicode has none), and a hatted Greek letter gets its hat from CSS,
     since the site font sets a combining circumflex beside β and θ instead of above them */
  function say(out,s){
    var re=/_([a-z])|([βθ])\u0302/g, last=0, m, e;
    while(out.firstChild) out.removeChild(out.firstChild);
    while((m=re.exec(s))){
      if(m.index>last) out.appendChild(document.createTextNode(s.slice(last,m.index)));
      if(m[1]){ e=document.createElement('sub'); e.textContent=m[1]; }
      else { e=document.createElement('span'); e.className='l5-hat'; e.textContent=m[2]; }
      out.appendChild(e);
      last=re.lastIndex;
    }
    if(last<s.length) out.appendChild(document.createTextNode(s.slice(last)));
  }
  var SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
  /* a tiny gap such as 2.2 × 10⁻¹⁶ */
  function sci(d){
    d=Math.abs(d);
    if(d===0) return '0';
    var e=Math.floor(Math.log(d)/Math.LN10), m=d/Math.pow(10,e);
    if(m>=9.95){ m/=10; e++; }
    return m.toFixed(1)+' × 10'+String(e).split('').map(function(c){ return SUP[c]; }).join('');
  }
  function r2d(v){ return Math.round(v*100)/100; }
  function r3d(v){ return Math.round(v*1000)/1000; }
  function dec(v,d){ var s=String(Math.round(v*Math.pow(10,d))/Math.pow(10,d)); return s.charAt(0)==='-'?MINUS+s.slice(1):s; }

  /* ---------- 1. Frisch Waugh Lovell: four regressions on one sample ---------- */
  NF.register('l5-fwl',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* y = 1 + β2 x2 + β3 x3 + u with W = [ι, x2] and X_K = x3, N = 60, u ~ N(0, 1), β3 = 1 */
    var N=60, B1=1, B3=1, SEED=20261122, seed=SEED, sample=0, rho=0.6, b2=1, api=null, raf=0, cur=null;
    var Q1=new Float64Array(N), Q2=new Float64Array(N), U=new Float64Array(N), ONE=new Float64Array(N), XR=3.5, i;
    var X2=new Float64Array(N), V={x3:new Float64Array(N), r3:new Float64Array(N), y:new Float64Array(N), ry:new Float64Array(N)};
    for(i=0;i<N;i++) ONE[i]=1;
    /* which variable each regression puts on the horizontal and on the vertical axis */
    var MODES={yx:['x3','y'], fwl:['r3','ry'], yr:['r3','y'], rx:['x3','ry']};
    var F={}, YR=null, W=520, H=300, mL=36, mR=14, top=34, bot=272, xs, ys, E={};
    var rr=range(fig,'rho',2,function(v){ rho=v; refresh(false); });
    var rb=range(fig,'b2',1,function(v){ b2=v; refresh(false); });
    if(rr) rho=rr.v();
    if(rb) b2=rb.v();
    var mode=seg(fig,'data-mode',function(v){ if(!MODES[v]||v===mode) return; mode=v; show(true); });
    if(!MODES[mode]) mode='yx';
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; sample++; draws(); fit(); YR=yRange(); draw(); });

    /* x2 and x3 are built from two centred orthogonal directions with sample variance 1, so the sample correlation
       of x2 and x3 is exactly ρ and both auxiliary slopes (x2 on x3, x3 on x2) equal ρ */
    function draws(){
      var rnd=mulberry32(seed), m1=0, m2=0, s1=0, s2=0, c=0, r=0;
      for(i=0;i<N;i++){ Q1[i]=gauss(rnd); Q2[i]=gauss(rnd); U[i]=gauss(rnd); }
      for(i=0;i<N;i++){ m1+=Q1[i]; m2+=Q2[i]; }
      m1/=N; m2/=N;
      for(i=0;i<N;i++){ Q1[i]-=m1; Q2[i]-=m2; s1+=Q1[i]*Q1[i]; }
      s1=Math.sqrt(s1/N);
      for(i=0;i<N;i++){ Q1[i]/=s1; c+=Q1[i]*Q2[i]; }
      c/=N;
      for(i=0;i<N;i++){ Q2[i]-=c*Q1[i]; s2+=Q2[i]*Q2[i]; }
      s2=Math.sqrt(s2/N);
      for(i=0;i<N;i++){ Q2[i]/=s2; r=Math.max(r,Math.hypot(Q1[i],Q2[i])); }
      /* |x3| and |r̂3| never exceed this radius for any ρ; a half integer keeps the last tick clear of the axis name */
      XR=Math.max(3.5,Math.ceil(r-0.5)+0.5);
    }
    /* every number by its formula: the full regression, the two partialling regressions on W, then the four panels */
    function fit(){
      var s=Math.sqrt(1-rho*rho), bh, g, d, m;
      for(i=0;i<N;i++){ X2[i]=Q1[i]; V.x3[i]=rho*Q1[i]+s*Q2[i]; V.y[i]=B1+b2*X2[i]+B3*V.x3[i]+U[i]; }
      bh=ls([ONE,X2,V.x3],V.y);
      g=ls([ONE,X2],V.y); d=ls([ONE,X2],V.x3);
      var a=0, b=0;
      for(i=0;i<N;i++){ V.ry[i]=V.y[i]-g[0]-g[1]*X2[i]; V.r3[i]=V.x3[i]-d[0]-d[1]*X2[i]; a+=V.r3[i]*V.ry[i]; b+=V.r3[i]*V.r3[i]; }
      F={bh:bh, lam:a/b, short:simple(V.x3,V.y), dh:simple(V.x3,X2).b};
      for(m in MODES) if(Object.prototype.hasOwnProperty.call(MODES,m)) F[m]=simple(V[MODES[m][0]],V[MODES[m][1]]);
      /* the FWL slope as written, λ̂ = r̂3′r̂y / r̂3′r̂3 (the intercept adds nothing: both residuals have mean zero) */
      F.fwl.b=F.lam; F.fwl.a=F.fwl.my-F.lam*F.fwl.mx;
    }
    /* one vertical scale for all four panels, so switching panels moves the points and not the axes */
    function yRange(){
      var lo=Infinity, hi=-Infinity, sp, st, k, ST=[0.5,1,2,4,5,10];
      for(i=0;i<N;i++){ lo=Math.min(lo,V.y[i],V.ry[i]); hi=Math.max(hi,V.y[i],V.ry[i]); }
      sp=hi-lo;
      for(k=0;k<ST.length;k++){ st=ST[k]; if(sp/st<=6) break; }
      return [Math.floor(lo/st)*st,Math.ceil(hi/st)*st,st];
    }
    function refresh(animate){
      var y=null;
      fit(); y=yRange();
      if(!YR || y[0]!==YR[0] || y[1]!==YR[1] || y[2]!==YR[2]){ YR=y; draw(); }
      else show(animate);
    }
    function draw(){
      var g, rows, ph, t=[], v, step, xt=[];
      W=measure(svg);
      cancelAnimationFrame(raf); cur=null;
      frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','l5-fit','fitted line of this panel'],['line','l5-ref','full regression slope of x₃']],mL+6,11,W-mR);
      top=rows>1?50:34;
      ph=clamp(Math.round((W-mL-mR)*0.5),200,236);
      H=top+ph+30; bot=top+ph;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(-XR,XR,mL,W-mR); ys=lin(YR[0],YR[1],bot,top);
      g=S('g',null,svg);
      step=(W-mL-mR)/(2*XR)>=30?1:2;
      for(v=-Math.floor(XR/step)*step;v<=XR;v+=step) xt.push(v);
      xGrid(g,xs,xt,top,bot,bot+17);
      for(v=0;v<xt.length;v++) line(g,C(xs(xt[v])),bot,C(xs(xt[v])),bot+4,'nf-ax');
      for(v=YR[0];v<=YR[1]+1e-9;v+=YR[2]) t.push(Math.round(v*100)/100);
      yGrid(g,ys,t,mL,W-mR);
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      E.yt=rich(g,['y'],'nf-title'); E.xt=rich(g,['x','3'],'nf-title');
      E.gc=clip(svg,mL-4,top-4,W-mR-mL+8,bot-top+8);
      E.pts=[];
      for(i=0;i<N;i++) E.pts.push(S('circle',{r:W>=420?3.2:2.8,'class':'l5-pt'},E.gc));
      E.fit=line(E.gc,0,0,0,0,'l5-fit');
      E.ref=line(E.gc,0,0,0,0,'l5-ref');
      E.mean=S('circle',{r:4,'class':'l5-mean'},E.gc);
      show(false);
    }
    /* axis names: y or r̂y up the side, x3 or r̂3 along the bottom */
    function names(){
      var m=MODES[mode], ty=m[1]==='y'?['y']:['r̂','y'], tx=m[0]==='x3'?['x','3']:['r̂','3'], g=E.yt.parentNode;
      g.removeChild(E.yt); g.removeChild(E.xt);
      E.yt=rich(g,ty,'nf-title'); place(E.yt,mL-7,top-12,'end');
      E.xt=rich(g,tx,'nf-title'); place(E.xt,W-3,bot+17,'end');
    }
    function apply(st){
      for(i=0;i<N;i++) at(E.pts[i],st.P[i][0],st.P[i][1]);
      setLine(E.fit,st.f[0],st.f[1],st.f[2],st.f[3]);
      setLine(E.ref,st.r[0],st.r[1],st.r[2],st.r[3]);
      at(E.mean,st.m[0],st.m[1]);
      cur=st;
    }
    function show(animate){
      var m=MODES[mode], h=V[m[0]], v=V[m[1]], o=F[mode], b3=F.bh[2], st={P:[]};
      for(i=0;i<N;i++) st.P.push([xs(h[i]),ys(v[i])]);
      /* both lines run through the panel's means; the reference has the full regression's slope β̂3 */
      st.f=[xs(-XR),ys(o.a-o.b*XR),xs(XR),ys(o.a+o.b*XR)];
      st.r=[xs(-XR),ys(o.my+b3*(-XR-o.mx)),xs(XR),ys(o.my+b3*(XR-o.mx))];
      st.m=[xs(o.mx),ys(o.my)];
      names();
      readout();
      if(api) api.changed();
      cancelAnimationFrame(raf);
      if(!animate || NF.reduce || !cur){ apply(st); return; }
      var from=cur, t0=0;
      function mix(a,b,e){ var r=[], k; for(k=0;k<a.length;k++) r.push(a[k]+(b[k]-a[k])*e); return r; }
      function step(ts){
        if(!t0) t0=ts;
        var k=Math.min(1,(ts-t0)/380), e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2, M={P:[]}, j;
        for(j=0;j<N;j++) M.P.push(mix(from.P[j],st.P[j],e));
        M.f=mix(from.f,st.f,e); M.r=mix(from.r,st.r,e); M.m=mix(from.m,st.m,e);
        apply(M);
        if(k<1) raf=requestAnimationFrame(step);
      }
      raf=requestAnimationFrame(step);
    }
    function readout(){
      var o=F[mode], b2h=F.bh[1], b3=F.bh[2], s;
      s='full regression   β̂₂ = '+fmt(b2h,3)+'   β̂₃ = '+fmt(b3,3)+'\n';
      if(mode==='yx') s+='y on x₃   slope '+fmt(o.b,3)+' = β̂₃ + β̂₂θ̂ = '+fmt(b3,3)+' + '+fmt(b2h,3)+' × '+fmt(F.dh,2);
      else if(mode==='fwl') s+='r̂_y on r̂₃   slope '+fmt(o.b,3)+' = β̂₃, gap '+sci(o.b-b3)+'   R² '+o.r2.toFixed(2);
      else if(mode==='yr') s+='y on r̂₃   slope '+fmt(o.b,3)+' = β̂₃, gap '+sci(o.b-b3)+'   R² '+o.r2.toFixed(2)+', not '+F.fwl.r2.toFixed(2);
      else s+='r̂_y on x₃   slope '+fmt(o.b,3)+' = β̂₃(1 − ρ²) = '+fmt(b3,3)+' × '+dec(1-rho*rho,4);
      if(out) say(out,s);
    }
    /* Try it.
       get: mode (yx, fwl, yr, rx), rho, b2, b3 (fixed at 1), bhat2 and bhat3 (the full regression), slope (this panel),
            simple (y on x3 with an intercept), that (θ̂, the slope of x2 on x3 with an intercept, here equal to rho;
            dhat is the same number under its old name), ovb (bhat2 times that), gap (slope minus bhat3), match (slope equals bhat3 to 1e-9), r2 (this panel's R²),
            r2fwl (R² of the FWL regression), shrink (1 minus rho squared), slopefwl, slopeyr and sloperx (the slopes of
            r̂y on r̂3, y on r̂3 and r̂y on x3 whichever panel is on show), sample (New sample presses);
            rounded as the readout shows them: coefficients and slopes to 3 decimals, that, dhat, r2 and r2fwl to 2, shrink to 4.
       set: mode, rho, b2, sample (presses New sample until the count reaches it) */
    api=NF.api({
      get:function(){
        var o=F[mode], b3=F.bh[2];
        return {mode:mode, rho:rho, b2:b2, b3:B3, bhat2:r3d(F.bh[1]), bhat3:r3d(b3), slope:r3d(o.b), simple:r3d(F.short.b), that:r2d(F.dh), dhat:r2d(F.dh),
          ovb:r3d(F.bh[1]*F.dh), gap:r3d(o.b-b3), match:Math.abs(o.b-b3)<1e-9*Math.max(1,Math.abs(b3)), r2:r2d(o.r2), r2fwl:r2d(F.fwl.r2),
          shrink:Math.round((1-rho*rho)*1e4)/1e4, slopefwl:r3d(F.fwl.b), slopeyr:r3d(F.yr.b), sloperx:r3d(F.rx.b), sample:sample};
      },
      set:function(st){
        var k=0;
        if('mode' in st && MODES[st.mode]) NF.press(fig,'data-mode',String(st.mode));
        if('rho' in st && rr) rr.set(st.rho);
        if('b2' in st && rb) rb.set(st.b2);
        if('sample' in st && nb) while(sample<+st.sample && k++<20) nb.click();
      }
    });
    draws(); fit(); YR=yRange(); draw();
    watch(svg,function(){ draw(); });
    return api;
  });

  /* notes.js may have booted before this file loaded; start any L5 figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
