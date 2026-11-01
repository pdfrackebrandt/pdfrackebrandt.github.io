/* Lecture 1 figures: joint table mosaic, zero covariance with dependence, chi squared t F from normals, quantiles and the PIT.
   Drawn with the helpers that notes.js exposes as window.NF; colours come from the site tokens through classes. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, yGrid=NF.yGrid, xGrid=NF.xGrid,
      seg=NF.seg, range=NF.range, phi=NF.phi, Phi=NF.Phi, invPhi=NF.invPhi, mulberry32=NF.mulberry32, key=NF.key,
      clip=NF.clip, local=NF.local, capture=NF.capture;

  /* ---------- special functions ---------- */
  var LG=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,
    12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  /* log gamma, Lanczos (g = 7), about 15 digits */
  function lgamma(x){
    if(x<0.5) return Math.log(Math.PI/Math.sin(Math.PI*x))-lgamma(1-x);
    x-=1;
    var a=LG[0], t=x+7.5, i;
    for(i=1;i<9;i++) a+=LG[i]/(x+i);
    return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);
  }
  function tiny(v){ return Math.abs(v)<1e-300?1e-300:v; }
  /* continued fraction for the incomplete beta function (Lentz) */
  function betacf(a,b,x){
    var qab=a+b, qap=a+1, qam=a-1, c=1, d=1/tiny(1-qab*x/qap), h=d, m, m2, aa, del;
    for(m=1;m<=400;m++){
      m2=2*m;
      aa=m*(b-m)*x/((qam+m2)*(a+m2));
      d=1/tiny(1+aa*d); c=tiny(1+aa/c); h*=d*c;
      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
      d=1/tiny(1+aa*d); c=tiny(1+aa/c); del=d*c; h*=del;
      if(Math.abs(del-1)<1e-14) break;
    }
    return h;
  }
  /* regularised incomplete beta I_x(a, b) */
  function ibeta(x,a,b){
    if(x<=0) return 0;
    if(x>=1) return 1;
    var bt=Math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*Math.log(x)+b*Math.log(1-x));
    return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b;
  }
  /* regularised lower incomplete gamma P(a, x): series below a + 1, continued fraction above */
  function gammaP(a,x){
    if(x<=0) return 0;
    var g=lgamma(a), n, ap, sum, del, b, c, d, h, an;
    if(x<a+1){
      ap=a; sum=del=1/a;
      for(n=0;n<1000;n++){ ap++; del*=x/ap; sum+=del; if(Math.abs(del)<Math.abs(sum)*1e-15) break; }
      return sum*Math.exp(-x+a*Math.log(x)-g);
    }
    b=x+1-a; c=1e300; d=1/b; h=d;
    for(n=1;n<1000;n++){
      an=-n*(n-a); b+=2;
      d=1/tiny(an*d+b); c=tiny(b+an/c); del=d*c; h*=del;
      if(Math.abs(del-1)<1e-15) break;
    }
    return 1-Math.exp(-x+a*Math.log(x)-g)*h;
  }
  function chiPdf(x,k){ return x<=0?0:Math.exp((k/2-1)*Math.log(x)-x/2-(k/2)*Math.LN2-lgamma(k/2)); }
  function chiCdf(x,k){ return gammaP(k/2,x/2); }
  function tPdf(x,n){ return Math.exp(lgamma((n+1)/2)-lgamma(n/2)-0.5*Math.log(n*Math.PI)-(n+1)/2*Math.log(1+x*x/n)); }
  function tTail2(c,n){ return ibeta(n/(n+c*c),n/2,0.5); }          /* P(|T| > c) */
  function fPdf(x,m,p){
    if(x<=0) return 0;
    return Math.exp(0.5*(m*Math.log(m*x)+p*Math.log(p)-(m+p)*Math.log(m*x+p))-Math.log(x)-(lgamma(m/2)+lgamma(p/2)-lgamma((m+p)/2)));
  }
  function fSf(c,m,p){ return ibeta(p/(p+m*c),p/2,m/2); }            /* P(F > c) */
  function chiQ(tau,k){
    var lo=0, hi=k+40*Math.sqrt(2*k)+40, i, mid;
    for(i=0;i<200;i++){ mid=(lo+hi)/2; if(chiCdf(mid,k)<tau) lo=mid; else hi=mid; }
    return (lo+hi)/2;
  }
  /* a round tick step giving about n ticks over span */
  function step(span,n){
    var raw=span/n, p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), r=raw/p;
    return (r<=1?1:r<=2?2:r<=2.5?2.5:r<=5?5:10)*p;
  }
  function ticks(lo,hi,st){ var a=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9;v+=st) a.push(Math.round(v*1e6)/1e6); return a; }

  /* a focusable draggable knob, as in the determinant figure */
  function handle(svg,label){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob nf-v1'},h);
    return h;
  }
  function place(h,x,y){ h.setAttribute('transform','translate('+R(x)+','+R(y)+')'); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }

  /* ---------- 1. The joint table as a mosaic ---------- */
  NF.register('l1-joint',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var w, c=[0,0], H=292, mL=36, mR=44, top=34, bot=262, gap=3, W=520, pw, ys, el={}, drag=null;
    function reset(){ w=0.4; c=[1/3,0.75]; }
    reset();
    function q(v){ return Math.round(v*100)/100; }
    function bx(){ return mL+(1-w)*pw; }
    function cols(){ var b=bx(); return [[mL,b-gap/2],[b+gap/2,W-mR]]; }
    var ib=fig.querySelector('.nfig-indep'), rb=fig.querySelector('.nfig-reset');
    if(ib) ib.addEventListener('click',function(){ var p1=(1-w)*c[0]+w*c[1]; c=[p1,p1]; update(); });
    if(rb) rb.addEventListener('click',function(){ reset(); update(); });
    function keyer(i){
      return function(e){
        var k=e.key, d=0;
        if(i<0){
          if(k==='ArrowLeft'||k==='ArrowUp') d=0.01; else if(k==='ArrowRight'||k==='ArrowDown') d=-0.01;
          else if(k==='PageUp') d=0.1; else if(k==='PageDown') d=-0.1; else return;
          w=clamp(q(w+d),0.1,0.9);
        } else {
          if(k==='ArrowUp'||k==='ArrowRight') d=0.01; else if(k==='ArrowDown'||k==='ArrowLeft') d=-0.01;
          else if(k==='PageUp') d=0.1; else if(k==='PageDown') d=-0.1;
          else if(k==='Home'){ c[i]=0; update(); e.preventDefault(); return; }
          else if(k==='End'){ c[i]=1; update(); e.preventDefault(); return; }
          else return;
          c[i]=clamp(q(c[i]+d),0,1);
        }
        e.preventDefault(); update();
      };
    }
    function draw(){
      var g, rows, i, k;
      W=measure(svg); frame(svg,W,H); pw=W-mL-mR;
      rows=key(S('g',null,svg),[['rect','nf-w','wage over 1000 (X₁ = 1)'],['rect','nf-area','X₁ = 0'],['line','nf-mean0','P(X₁ = 1)']],mL,11,W-mR);
      top=rows>1?50:34;
      ys=lin(0,1,bot,top);
      g=S('g',null,svg);
      for(i=0;i<3;i++){ k=i/2; line(g,mL-4,C(ys(k)),mL,C(ys(k)),'nf-ax'); text(g,mL-7,ys(k)+4,tl(k),null,'end'); }
      el.r=[]; el.lab=[]; el.lv=[]; el.cl=[];
      for(k=0;k<2;k++){
        el.r.push([S('rect',{'class':'nf-area'},svg),S('rect',{'class':'nf-w'},svg)]);
        el.lv.push(line(svg,0,0,0,0,'nf-line'));
        el.lab.push([text(svg,0,0,'','nf-lab','middle'),text(svg,0,0,'','nf-lab','middle')]);
        el.cl.push(text(svg,0,bot+18,'',null,'middle'));
      }
      el.p1=line(svg,0,0,0,0,'nf-mean0');
      el.p1t=text(svg,W-mR+5,0,'','nf-lab');
      el.h=[handle(svg,'Share with a degree, P(X₂ = 1): the boundary between the columns. Left and right arrows move it.'),
            handle(svg,'P(X₁ = 1 | X₂ = 0), the level in the no degree column. Up and down arrows move it.'),
            handle(svg,'P(X₁ = 1 | X₂ = 1), the level in the degree column. Up and down arrows move it.')];
      el.h[0].addEventListener('keydown',keyer(-1));
      el.h[1].addEventListener('keydown',keyer(0));
      el.h[2].addEventListener('keydown',keyer(1));
      update();
    }
    function update(){
      var cs=cols(), k, x0, x1, y, mid, p1=(1-w)*c[0]+w*c[1], f=[[(1-w)*(1-c[0]),w*(1-c[1])],[(1-w)*c[0],w*c[1]]],
          f11=f[1][1], prod=p1*w, cov=w*(1-w)*(c[1]-c[0]), v1=p1*(1-p1), s, txt, wd;
      for(k=0;k<2;k++){
        x0=cs[k][0]; x1=cs[k][1]; y=ys(c[k]); mid=(x0+x1)/2; wd=x1-x0;
        el.r[k][0].setAttribute('x',R(x0)); el.r[k][0].setAttribute('width',R(wd)); el.r[k][0].setAttribute('y',R(top)); el.r[k][0].setAttribute('height',R(Math.max(0,y-top)));
        el.r[k][1].setAttribute('x',R(x0)); el.r[k][1].setAttribute('width',R(wd)); el.r[k][1].setAttribute('y',R(y)); el.r[k][1].setAttribute('height',R(Math.max(0,bot-y)));
        setLine(el.lv[k],x0,y,x1,y);
        /* joint probabilities in the cells, when the cell has room for them */
        el.lab[k][0].setAttribute('x',R(mid)); el.lab[k][0].setAttribute('y',R((top+y)/2+4)); el.lab[k][0].textContent=(y-top>=30&&wd>=34)?fmt(f[0][k],2):'';
        el.lab[k][1].setAttribute('x',R(mid)); el.lab[k][1].setAttribute('y',R((y+bot)/2+4)); el.lab[k][1].textContent=(bot-y>=30&&wd>=34)?fmt(f[1][k],2):'';
        txt=(k?'degree ':'no degree ')+fmt(k?w:1-w,2);
        el.cl[k].setAttribute('x',R(mid));
        el.cl[k].textContent=wd>=txt.length*6.2?txt:wd>=52?'X₂ = '+k:fmt(k?w:1-w,2);
        place(el.h[k+1],mid,y);
        el.h[k+1].setAttribute('aria-valuemin','0'); el.h[k+1].setAttribute('aria-valuemax','1');
        el.h[k+1].setAttribute('aria-valuenow',q(c[k]));
        el.h[k+1].setAttribute('aria-valuetext','P(X₁ = 1 | X₂ = '+k+') = '+fmt(c[k],2));
      }
      place(el.h[0],bx(),top);
      el.h[0].setAttribute('aria-valuemin','0.1'); el.h[0].setAttribute('aria-valuemax','0.9');
      el.h[0].setAttribute('aria-valuenow',q(w)); el.h[0].setAttribute('aria-valuetext','P(X₂ = 1) = '+fmt(w,2));
      setLine(el.p1,mL,ys(p1),W-mR,ys(p1));
      el.p1t.setAttribute('y',R(ys(p1)+4)); el.p1t.textContent=fmt(p1,2);
      if(!out) return;
      s='f(1,1) = '+fmt(f11,3)+' against P(X₁=1) P(X₂=1) = '+fmt(p1,2)+' × '+fmt(w,2)+' = '+fmt(prod,3)+': ';
      out.textContent=s+(fmt(f11,3)===fmt(prod,3)?'independent':'dependent')+
        '\nP(X₁=1 | X₂=0) = '+fmt(c[0],2)+'   P(X₁=1 | X₂=1) = '+fmt(c[1],2)+'   P(X₁=1) = '+fmt(p1,2)+
        '\nCov = '+fmt(cov,3)+'   ';
      if(v1<1e-12) warn(out,'Corr undefined: X₁ is constant');
      else out.appendChild(document.createTextNode('Corr = '+fmt(cov/Math.sqrt(v1*w*(1-w)),3)));
    }
    function pick(p){
      var b=bx(), k, d, best=null, bd=24, cs=cols();
      d=Math.hypot(p[0]-b,p[1]-top); if(d<bd){ bd=d; best=-1; }
      for(k=0;k<2;k++){ d=Math.hypot(p[0]-(cs[k][0]+cs[k][1])/2,p[1]-ys(c[k])); if(d<bd){ bd=d; best=k; } }
      if(best!==null) return best;
      if(Math.abs(p[0]-b)<10 && p[1]>top-12 && p[1]<bot) return -1;
      if(p[1]>=top-8 && p[1]<=bot+8) for(k=0;k<2;k++) if(p[0]>=cs[k][0] && p[0]<=cs[k][1]) return k;
      return null;
    }
    function move(p){
      if(drag===-1) w=clamp(q(1-(p[0]-mL)/pw),0.1,0.9);
      else c[drag]=clamp(q(ys.inv(p[1])),0,1);
      update();
    }
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H), k=pick(p);
      if(k===null) return;
      drag=k; e.preventDefault(); capture(svg,e);
      try{ el.h[k+1].focus({preventScroll:true,focusVisible:false}); }catch(err){}
      svg.classList.add('is-drag');
      move(p);
    });
    svg.addEventListener('pointermove',function(e){ if(drag!==null) move(local(svg,e,W,H)); });
    function stop(){ drag=null; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    /* a touch on a handle or on a level line drags it; anywhere else the page scrolls as usual */
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var p=local(svg,e.touches[0],W,H), b=bx(), cs=cols(), k;
      if(Math.hypot(p[0]-b,p[1]-top)<26 || (Math.abs(p[0]-b)<12 && p[1]>top && p[1]<bot)){ e.preventDefault(); return; }
      for(k=0;k<2;k++) if(p[0]>=cs[k][0] && p[0]<=cs[k][1] && Math.abs(p[1]-ys(c[k]))<16){ e.preventDefault(); return; }
    },{passive:false});
    draw();
    watch(svg,draw);
  });

  /* ---------- 2. Slide 96: Y = X squared ---------- */
  NF.register('l1-square',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var s=0.5, X=[-2,-1,1,2], H=292, mL=36, mR=28, top=34, bot=258, W=520, xs, ys, el={};
    var rs=range(fig,'s',2,function(v){ s=v; update(); });
    if(rs) s=rs.v();
    function probs(){ return [(1-s)/2,(1-s)/2,s/2,s/2]; }
    function draw(){
      var g, gc, rows, i, x, p=[];
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','l1-curve','Y = X²'],['line','nf-fit','best linear fit'],['line','l1-cmk','E(X | Y)'],['line','nf-hread','E(X)']],mL+6,11,W-mR);
      top=rows>1?52:36;
      xs=lin(-2.6,2.6,mL,W-mR); ys=lin(0,5,bot,top);
      g=S('g',null,svg);
      xGrid(g,xs,[-2,-1,0,1,2],top,bot,bot+17);
      yGrid(g,ys,[0,1,2,3,4,5],mL,W-mR);
      text(g,mL-7,top-10,'y','nf-title','end');
      text(g,W-3,bot+17,'x','nf-title','end');
      gc=clip(svg,mL,top-2,W-mR-mL,bot-top+2);
      for(i=0;i<=120;i++){ x=-2.6+5.2*i/120; p.push([xs(x),ys(x*x)]); }
      S('path',{d:poly(p),'class':'l1-curve'},gc);
      el.ex=line(gc,0,0,0,0,'nf-hread');
      el.fit=line(gc,0,0,0,0,'nf-fit');
      el.cm=[S('circle',{r:8,'class':'l1-cm'},svg),S('circle',{r:8,'class':'l1-cm'},svg)];
      el.dot=[]; el.pl=[];
      for(i=0;i<4;i++){ el.dot.push(S('circle',{'class':'nf-dot'},svg)); el.pl.push(text(svg,0,0,'','nf-lab nf-halo','middle')); }
      el.ext=text(svg,0,bot-8,'E(X)','nf-lab nf-halo','middle');
      update();
    }
    function update(){
      var P=probs(), i, r, d=2*s-1, ex=1.5*d, ey=2.5, cov=0.75*d, vx=2.5-ex*ex, vy=2.25, b=cov/vx, a=ey-b*ex, cm1=d, cm4=2*d, mi=Math.abs(d)<1e-9;
      for(i=0;i<4;i++){
        r=22*Math.sqrt(P[i]);
        at(el.dot[i],xs(X[i]),ys(X[i]*X[i])); el.dot[i].setAttribute('r',R(r));
        el.pl[i].setAttribute('x',R(xs(X[i]))); el.pl[i].setAttribute('y',R(ys(X[i]*X[i])-r-6)); el.pl[i].textContent=fmt(P[i],2);
      }
      setLine(el.fit,xs(-2.6),ys(a-2.6*b),xs(2.6),ys(a+2.6*b));
      setLine(el.ex,xs(ex),top,xs(ex),bot);
      el.ext.setAttribute('x',R(xs(ex)));
      at(el.cm[0],xs(cm1),ys(1)); at(el.cm[1],xs(cm4),ys(4));
      if(!out) return;
      out.textContent='Cov(X, Y) = '+fmt(cov,3)+'   Corr = '+fmt(cov/Math.sqrt(vx*vy),3)+'   best line slope = '+fmt(b,3)+
        '\nP(Y = 4 | X = '+NF.MINUS+'2) = 1, but P(Y = 4) = 0.50: Y depends on X'+
        '\nE(X | Y = 1) = '+fmt(cm1,2)+'   E(X | Y = 4) = '+fmt(cm4,2)+'   E(X) = '+fmt(ex,2)+': ';
      if(mi) out.appendChild(document.createTextNode('X is mean independent of Y'));
      else warn(out,'X is not mean independent of Y');
    }
    draw();
    watch(svg,draw);
  });

  /* ---------- 3. Chi squared, t and F built from standard normals ---------- */
  NF.register('l1-tests',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* 4000 replications of 61 standard normals: Z0 for the t numerator, block A (Z0 to Z29) for chi squared and the F numerator,
       block B (Z30 to Z59) for the t and F denominators, so F with m = 1 is exactly the square of the t draw */
    var RN=4000, K=30, A=new Float64Array(RN*K), B=new Float64Array(RN*K), Z0=new Float64Array(RN), D=new Float64Array(RN);
    (function(){
      var rnd=mulberry32(20261101), r, j, u, t, rad, z=[], sa, sb;
      function norm(){
        if(z.length) return z.pop();
        u=1-rnd(); t=2*Math.PI*rnd(); rad=Math.sqrt(-2*Math.log(u));
        z.push(rad*Math.sin(t)); return rad*Math.cos(t);
      }
      for(r=0;r<RN;r++){
        Z0[r]=norm(); sa=Z0[r]*Z0[r]; A[r*K]=sa;
        for(j=1;j<K;j++){ u=norm(); sa+=u*u; A[r*K+j]=sa; }
        sb=0;
        for(j=0;j<K;j++){ u=norm(); sb+=u*u; B[r*K+j]=sb; }
      }
    })();
    var n=3, p=10, mode, H=300, mL=40, mR=28, top=34, bot=262, W=520, el={};
    var nm=fig.querySelector('.l1-nm');
    var rn=range(fig,'n',0,function(v){ n=Math.round(v); draw(); });
    var rp=range(fig,'p',0,function(v){ p=Math.round(v); draw(); });
    if(rn) n=Math.round(rn.v());
    if(rp) p=Math.round(rp.v());
    mode=seg(fig,'data-dist',function(v){ if(v===mode) return; mode=v; lock(); draw(); });
    if(mode!=='chi' && mode!=='t' && mode!=='f') mode='t';
    function lock(){
      if(nm) nm.textContent=mode==='f'?'m':'n';
      if(!rp) return;
      var off=mode!=='f';
      rp.el.disabled=off;
      rp.wrap.setAttribute('class',off?'nfig-range is-off':'nfig-range');
    }
    function draws(){
      var r;
      for(r=0;r<RN;r++){
        if(mode==='chi') D[r]=A[r*K+n-1];
        else if(mode==='t') D[r]=Z0[r]/Math.sqrt(B[r*K+n-1]/n);
        else D[r]=(A[r*K+n-1]/n)/(B[r*K+p-1]/p);
      }
    }
    function draw(){
      var lo, hi, nb, bw, dens, cut, g, gc, i, x, b, c, ymax=0, yst, xst, xs, ys, pts=[], tp=[], edge='', run=null, y0, d, rows, items, tail=[], kk, lab, xt, share=0, s1, s2;
      draws();
      if(mode==='chi'){
        lo=0; hi=n<=2?8:Math.ceil((n+4.5*Math.sqrt(2*n))/5)*5; nb=40;
        dens=function(v){ return chiPdf(v,n); }; cut=chiQ(0.95,n);
      } else if(mode==='t'){
        lo=-5; hi=5; nb=40; dens=function(v){ return tPdf(v,n); }; cut=2;
      } else {
        lo=0; hi=5; nb=40; dens=function(v){ return fPdf(v,n,p); }; cut=4;
      }
      bw=(hi-lo)/nb; c=new Float64Array(nb);
      for(i=0;i<RN;i++){
        b=Math.floor((D[i]-lo)/bw); if(b>=0 && b<nb) c[b]++;
        if(mode==='t'? Math.abs(D[i])>cut : D[i]>cut) share++;
      }
      share/=RN;
      /* the height scale ignores the first bin and the density right at 0, which blow up for 1 or 2 degrees of freedom */
      for(i=1;i<nb;i++) ymax=Math.max(ymax,c[i]/(RN*bw));
      for(i=0;i<=200;i++){ x=lo+(hi-lo)*i/200; if(lo===0 && x<(hi-lo)/nb) continue; ymax=Math.max(ymax,dens(x)); }
      if(mode==='t') ymax=Math.max(ymax,phi(0));
      ymax=Math.min(ymax*1.12,mode==='t'?0.5:1.6);
      W=measure(svg); frame(svg,W,H);
      items=[['rect','nf-hist nf-sw','4000 draws'],['line','nf-line','exact density']];
      if(mode==='t') items.push(['line','nf-ref','N(0, 1)']);
      items.push(['rect','nf-area',mode==='chi'?'top 5%':mode==='t'?'|T| > 2':'F > 4']);
      rows=key(S('g',null,svg),items,mL+6,11,W-mR);
      top=rows>1?50:34;
      xs=lin(lo,hi,mL,W-mR); ys=lin(0,ymax,bot,top); y0=ys(0);
      xst=step(hi-lo,(W-mL-mR)>=360?8:5); xt=ticks(lo,hi,xst);
      yst=step(ymax,4);
      g=S('g',null,svg);
      xGrid(g,xs,xt,top,bot,bot+17);
      for(i=0;i<xt.length;i++) line(g,C(xs(xt[i])),bot,C(xs(xt[i])),bot+4,'nf-ax');
      yGrid(g,ys,ticks(0,ymax,yst),mL,W-mR);
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,mL-7,top-12,'f(x)','nf-title','end');
      text(g,W-3,bot+17,'x','nf-title','end');
      gc=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      /* tail area under the exact density */
      function area(a,z){
        var q=[[xs(a),y0]], j, v;
        for(j=0;j<=80;j++){ v=a+(z-a)*j/80; q.push([xs(v),ys(Math.min(dens(v),ymax*1.2))]); }
        q.push([xs(z),y0]);
        S('path',{d:poly(q)+'Z','class':'nf-area'},gc);
      }
      if(cut<hi) area(cut,hi);
      if(mode==='t') area(lo,-cut);
      /* histogram, as a step outline that skips empty bins */
      for(b=0;b<nb;b++){
        d=Math.min(c[b]/(RN*bw),ymax*1.2);
        tp.push([xs(lo+b*bw),ys(d)],[xs(lo+(b+1)*bw),ys(d)]);
        if(c[b]>0){ if(!run) run=[[xs(lo+b*bw),y0]]; run.push([xs(lo+b*bw),ys(d)],[xs(lo+(b+1)*bw),ys(d)]); }
        if(run && (c[b]===0 || b===nb-1)){ run.push([run[run.length-1][0],y0]); edge+=poly(run); run=null; }
      }
      S('path',{d:poly([[xs(lo),y0]].concat(tp,[[xs(hi),y0]]))+'Z','class':'nf-hist'},gc);
      S('path',{d:edge,'class':'nf-histline'},gc);
      if(mode==='t'){
        for(i=0;i<=240;i++){ x=lo+(hi-lo)*i/240; tail.push([xs(x),ys(phi(x))]); }
        S('path',{d:poly(tail),'class':'nf-ref'},gc);
      }
      for(i=0;i<=300;i++){ x=lo+(hi-lo)*i/300; if(lo===0 && x===0) x=1e-6; pts.push([xs(x),ys(Math.min(dens(x),ymax*1.3))]); }
      S('path',{d:poly(pts),'class':'nf-line'},gc);
      kk=mode==='t'?[-cut,cut]:[cut];
      for(i=0;i<kk.length;i++) if(kk[i]<hi) line(svg,C(xs(kk[i])),top,C(xs(kk[i])),bot,'nf-guide');
      if(mode==='chi' && cut<hi){ lab=text(svg,xs(cut)+5,top+11,'q = '+cut.toFixed(2),'nf-lab nf-halo'); if(xs(cut)+70>W-mR){ lab.setAttribute('x',R(xs(cut)-5)); lab.setAttribute('text-anchor','end'); } }
      if(!out) return;
      if(mode==='chi'){
        s1='n = '+n+': mean '+n+', variance '+(2*n)+', 95% quantile q = '+cut.toFixed(2);
        s2='share of the 4000 draws above q: '+share.toFixed(3);
        if(cut>=hi) s2+=' (q is off the plot)';
      } else if(mode==='t'){
        s1='n = '+n+': P(|T| > 2) = '+tTail2(2,n).toFixed(3)+' against '+(2*(1-Phi(2))).toFixed(3)+' under N(0, 1); '+
          (n>2?'variance n/(n '+NF.MINUS+' 2) = '+(n/(n-2)).toFixed(2):n===2?'no variance':'no mean, no variance');
        s2='share of the 4000 draws beyond ±2: '+share.toFixed(3);
      } else {
        s1='m = '+n+', p = '+p+': P(F > 4) = '+fSf(4,n,p).toFixed(3)+
          (n===1?', which is P(|T| > 2) = '+tTail2(2,p).toFixed(3)+' under t with '+p+' df':'')+
          (p>2?'; mean p/(p '+NF.MINUS+' 2) = '+(p/(p-2)).toFixed(2):'; no mean');
        s2='share of the 4000 draws above 4: '+share.toFixed(3);
      }
      out.textContent=s1+'\n'+s2;
    }
    lock(); draw();
    watch(svg,draw);
  });

  /* ---------- 4. Quantile function and the probability integral transform ---------- */
  NF.register('l1-quantile',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var DST={
      norm:{F:Phi, Q:invPhi, cdf:function(t){ return t; }},
      /* a flat stretch: F = 0.5 on [−0.6, 0.6], continuous everywhere */
      flat:{F:function(x){ return x<-0.6?Phi((x+0.6)/0.6):x<0.6?0.5:Phi((x-0.6)/0.6); },
        Q:function(t){ return t<=0.5?-0.6+0.6*invPhi(t):0.6+0.6*invPhi(t); }, cdf:function(t){ return t; }},
      /* an atom of 0.3 at 0, else N(0, 0.64): F jumps from 0.35 to 0.65 (set exactly, so F(X) lands in the bar from 0.65) */
      atom:{F:function(x){ return x<0?0.7*Phi(x/0.8):x===0?0.65:0.3+0.7*Phi(x/0.8); },
        Q:function(t){ return t<0.35?0.8*invPhi(t/0.7):t<=0.65?0:0.8*invPhi((t-0.3)/0.7); },
        /* P(F(X) <= t): F(X) never falls inside the jump, so this is flat at 0.35 there */
        cdf:function(t){ return t<0.35?t:t<0.65?0.35:t; }}
    };
    var NU=2000, U=new Float64Array(NU), FX=new Float64Array(NU), i, rnd=mulberry32(20261102);
    for(i=0;i<NU;i++){ U[i]=rnd(); if(U[i]<1e-9) U[i]=1e-9; }
    var tau=0.3, H=334, mL=36, mR=28, tF=34, bF=150, tH=204, bH=296, W=520, xs, yF, xh, yh, el={}, drag=0, NB=20, HMAX=2.2;
    var dist=seg(fig,'data-dist',function(v){ if(!DST[v]||v===dist) return; dist=v; draw(); });
    if(!DST[dist]) dist='norm';
    function draw(){
      var d=DST[dist], g, gc, p=[], k, x, c=new Float64Array(NB), b, y, top, rows;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','nf-line','F(x)'],['line','nf-guide','τ to Q(τ)'],['rect','nf-hist nf-sw','F(X) for 2000 draws'],['line','nf-ref','uniform density']],mL+6,11,W-mR);
      tF=rows>1?50:34; top=tF;
      xs=lin(-3,3,mL,W-mR); yF=lin(0,1,bF,tF);
      xh=lin(0,1,mL,W-mR); yh=lin(0,HMAX,bH,tH);
      g=S('g',null,svg);
      xGrid(g,xs,[-3,-2,-1,0,1,2,3],tF,bF,bF+17);
      yGrid(g,yF,[0,0.5,1],mL,W-mR);
      text(g,mL-7,top-12,'F(x)','nf-title','end');
      text(g,W-3,bF+17,'x','nf-title','end');
      xGrid(g,xh,[0,0.25,0.5,0.75,1],tH,bH,bH+17);
      yGrid(g,yh,[0,1,2],mL,W-mR);
      text(g,mL-7,tH-10,'density of F(X)','nf-title');
      text(g,W-3,bH+17,'F(X)','nf-title','end');
      /* the CDF; a jump is drawn as a dotted riser with an open and a filled dot */
      gc=clip(svg,mL,tF-6,W-mR-mL,bF-tF+12);
      if(dist==='atom'){
        for(k=0;k<=150;k++){ x=-3+3*k/150; p.push([xs(x),yF(d.F(x-1e-12))]); }
        S('path',{d:poly(p),'class':'nf-line'},gc); p=[];
        for(k=0;k<=150;k++){ x=3*k/150; p.push([xs(x),yF(d.F(x))]); }
        S('path',{d:poly(p),'class':'nf-line'},gc);
        line(gc,xs(0),yF(0.35),xs(0),yF(0.65),'nf-jump');
        S('circle',{cx:R(xs(0)),cy:R(yF(0.35)),r:4,'class':'nf-open'},gc);
        S('circle',{cx:R(xs(0)),cy:R(yF(0.65)),r:4,'class':'nf-dot'},gc);
      } else {
        for(k=0;k<=300;k++){ x=-3+6*k/300; p.push([xs(x),yF(d.F(x))]); }
        S('path',{d:poly(p),'class':'nf-line'},gc);
      }
      el.gh=line(svg,0,0,0,0,'nf-guide'); el.gv=line(svg,0,0,0,0,'nf-guide');
      el.qd=S('circle',{r:4.5,'class':'nf-dot'},svg);
      el.tl=text(svg,mL+4,0,'','nf-lab nf-halo');
      el.ql=text(svg,0,bF-6,'','nf-lab nf-halo');
      /* histogram of F(X), with X = Q(U) drawn by the inverse CDF */
      for(k=0;k<NU;k++){ FX[k]=d.F(d.Q(U[k])); b=Math.floor(FX[k]*NB); if(b>=NB) b=NB-1; c[b]++; }
      gc=clip(svg,mL,tH-4,W-mR-mL,bH-tH+4);
      el.bars=[];
      for(b=0;b<NB;b++){
        y=c[b]/(NU/NB);
        S('rect',{x:R(xh(b/NB)+0.5),y:R(yh(Math.min(y,HMAX*1.05))),width:R(Math.max(0,xh(1/NB)-xh(0)-1)),height:R(Math.max(0,bH-yh(Math.min(y,HMAX*1.05)))),'class':'nf-hist l1-bar'},gc);
        if(y>HMAX) text(svg,xh((b+0.5)/NB),tH+10,y.toFixed(1),'nf-lab nf-halo','middle');
      }
      line(gc,mL,C(yh(1)),W-mR,C(yh(1)),'nf-ref');
      el.gt=line(svg,0,tH,0,bH,'nf-guide');
      svg.setAttribute('aria-valuemin','0.005'); svg.setAttribute('aria-valuemax','0.995');
      update();
    }
    function update(){
      var d=DST[dist], q=d.Q(tau), Fq=d.F(q), px=xs(clamp(q,-3.2,3.2)), py=yF(tau), share=0, k, ex=d.cdf(tau), s;
      setLine(el.gh,mL,py,px,py); setLine(el.gv,px,py,px,bF);
      at(el.qd,px,py);
      el.tl.setAttribute('y',R(py-5)); el.tl.textContent='τ = '+tau.toFixed(3);
      el.ql.textContent='q = '+fmt(q,2);
      if(px+70<W-mR){ el.ql.setAttribute('x',R(px+6)); el.ql.setAttribute('text-anchor','start'); }
      else { el.ql.setAttribute('x',R(px-6)); el.ql.setAttribute('text-anchor','end'); }
      setLine(el.gt,xh(tau),tH,xh(tau),bH);
      for(k=0;k<NU;k++) if(FX[k]<=tau+1e-12) share++;
      share/=NU;
      s='τ = '+tau.toFixed(3)+'   q = Q(τ) = '+fmt(q,3)+'   F(q) = '+Fq.toFixed(3);
      if(Fq>tau+1e-6) s+=', F jumps over τ at q';
      else if(dist==='flat' && Math.abs(tau-0.5)<1e-9) s+=', F is flat at τ on ['+NF.MINUS+'0.6, 0.6]: Q takes the left end';
      if(!out) return;
      out.textContent=s+'\nP(F(X) ≤ τ) = '+ex.toFixed(3)+' ';
      if(Math.abs(ex-tau)>1e-9) warn(out,'≠ τ');
      else out.appendChild(document.createTextNode('= τ'));
      out.appendChild(document.createTextNode('   share of draws: '+share.toFixed(3)));
      svg.setAttribute('aria-valuenow',tau.toFixed(3));
      svg.setAttribute('aria-valuetext','tau = '+tau.toFixed(3)+', q = '+fmt(q,3));
    }
    function setTau(v){ v=Math.round(clamp(v,0.005,0.995)*200)/200; if(Math.abs(v-0.5)<0.006) v=0.5; tau=v; update(); }
    function fromPointer(e){
      var p=local(svg,e,W,H);
      if(drag===1) setTau(yF.inv(p[1]));
      else if(drag===2) setTau(xh.inv(p[0]));
    }
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H);
      drag=p[1]<(bF+tH)/2?1:2;
      capture(svg,e);
      fromPointer(e);
    });
    svg.addEventListener('pointermove',function(e){ if(drag) fromPointer(e); });
    function stop(){ drag=0; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('keydown',function(e){
      var k=e.key, v=tau;
      if(k==='ArrowRight'||k==='ArrowUp') v+=0.005;
      else if(k==='ArrowLeft'||k==='ArrowDown') v-=0.005;
      else if(k==='PageUp') v+=0.05;
      else if(k==='PageDown') v-=0.05;
      else if(k==='Home') v=0.005;
      else if(k==='End') v=0.995;
      else return;
      e.preventDefault();
      tau=Math.round(clamp(v,0.005,0.995)*200)/200; update();
    });
    draw();
    watch(svg,draw);
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
