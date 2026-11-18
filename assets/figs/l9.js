/* L9 figures: attenuation under classical measurement error, and omitted variable bias as a probability limit.
   Each registers with NF (assets/notes.js) and reuses its helpers. No third party code. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, poly=NF.poly,
      tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, seg=NF.seg, range=NF.range,
      mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  /* standard normal draws from a uniform stream, Box Muller, both of each pair used */
  function normals(seed){
    var r=mulberry32(seed), spare=0, has=false;
    return function(){
      var u, v, m;
      if(has){ has=false; return spare; }
      u=1-r(); v=r(); m=Math.sqrt(-2*Math.log(u));
      spare=m*Math.sin(6.283185307179586*v); has=true;
      return m*Math.cos(6.283185307179586*v);
    };
  }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function rd(v,d){ var p=Math.pow(10,d), x=Math.round(v*p)/p; return x===0?0:x; }
  function f2(v){ return NF.fmt(v,2); }
  function f3(v){ return NF.fmt(v,3); }
  function sg(v,d){ var x=rd(v,d); return (x>0?'+':'')+NF.fmt(x,d); }
  function nearest(vals,v){ var i, b=0; for(i=1;i<vals.length;i++) if(Math.abs(vals[i]-v)<Math.abs(vals[b]-v)) b=i; return b; }
  /* a slider over a list of stops: the label shows the stop, the input holds its index */
  function steps(fig,k,vals,cb){
    var inp=fig.querySelector('input[data-k="'+k+'"]'), val, hi=vals.length-1;
    if(!inp) return null;
    val=inp.parentNode.querySelector('.nfig-val');
    inp.min='0'; inp.max=String(hi); inp.step='1';
    function show(i){
      inp.value=String(i);
      inp.style.setProperty('--p',(i/hi*100).toFixed(1)+'%');
      if(val) val.textContent=String(vals[i]);
      inp.setAttribute('aria-valuetext','N = '+vals[i]);
    }
    inp.addEventListener('input',function(){ var i=clamp(Math.round(+inp.value),0,hi); show(i); cb(vals[i],i); });
    show(clamp(Math.round(+inp.value),0,hi));
    return {el:inp, i:function(){ return clamp(Math.round(+inp.value),0,hi); }, set:function(i){ i=clamp(i,0,hi); show(i); cb(vals[i],i); }};
  }
  function niceUp(x){ var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p, s=[1,1.5,2,3,4,5,6,8,10], i; for(i=0;i<s.length;i++) if(m<=s[i]+1e-9) return s[i]*p; return 10*p; }
  function nice125(x){ var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)), m=x/p; return (m>=5?5:m>=2?2:1)*p; }

  /* ---------- 1. Classical errors in variables: attenuation ----------
     y = β1 + β2 x* + u with β1 = 1, β2 = 1.5, x* ~ N(0, 1), u ~ N(0, 0.5²). Observed x = x* + e, e ~ N(0, Var(e)), all independent,
     so E[e x*] = E[e u] = 0. OLS of y on the observed x has
       plim β̂2 = β2 λ,   λ = Var(x*) ÷ (Var(x*) + Var(e)) = 1 ÷ (1 + Var(e)).
     One seeded sample of 2000 standard normal triples (x*, e ÷ sd(e), u ÷ 0.5); the first N are used, so samples are nested in N
     and each point moves sideways as Var(e) grows. */
  NF.register('l9-atten',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var B1=1, B2=1.5, SU=0.5, NMAX=2000, NS=[25,50,100,200,500,1000,2000], SEED=20261147;
    var XLO=-7, XHI=7, YLO=-5, YHI=7;
    var ZX=new Float64Array(NMAX), ZE=new Float64Array(NMAX), ZU=new Float64Array(NMAX);
    var seed=SEED, se2=1, N=200, ghost=false, moves=0, api=null, st={}, E={};
    var W=520, H=340, mL=36, mR=14, top=30, bot=290, xs, ys;
    function gen(){ var r=normals(seed), i; for(i=0;i<NMAX;i++){ ZX[i]=r(); ZE[i]=r(); ZU[i]=r(); } }
    var rv=range(fig,'se2',1,function(v){ se2=rd(v,1); moves++; update(); });
    if(rv) se2=rd(rv.v(),1);
    var rn=steps(fig,'n',NS,function(v){ N=v; moves++; update(); });
    if(rn) N=NS[rn.i()];
    var g0=seg(fig,'data-ghost',function(v){ var b=v==='1'; if(b===ghost) return; ghost=b; moves++; draw(); });
    ghost=g0==='1';
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; moves++; gen(); update(); });

    function draw(){
      var g, rows, j, x, y, gc, items;
      W=measure(svg); frame(svg,W,H);
      g=S('g',null,svg);
      items=[['line','l9-true','true line, slope β₂'],['line','l9-plim','slope β₂λ'],['line','l9-ols','OLS on observed x']];
      if(ghost) items.push(['rect','l9-gsw','at the true x*']);
      rows=key(g,items,mL,11,W-mR);
      top=rows*16+12; bot=top+clamp(Math.round((W-mL-mR)*0.56),200,264); H=bot+26;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(XLO,XHI,mL,W-mR); ys=lin(YLO,YHI,bot,top);
      for(j=-6;j<=6;j+=2){ x=C(xs(j)); line(g,x,top,x,bot,j===0?'nf-zero':'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax'); text(g,xs(j),bot+17,tl(j),null,'middle'); }
      for(j=-4;j<=6;j+=2){ y=C(ys(j)); line(g,mL,y,W-mR,y,j===0?'nf-zero':'nf-grid'); text(g,mL-7,ys(j)+4,tl(j),null,'end'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,W-3,bot+17,'x','nf-title','end');
      text(g,mL-7,top+2,'y','nf-title','end');
      gc=clip(svg,mL,top,W-mR-mL,bot-top);
      E.gh=S('path',{'class':ghost?'l9-ghost':'nf-hide'},gc);
      E.pts=S('path',{'class':'l9-pts'},gc);
      E.tr=line(gc,xs(XLO),ys(B1+B2*XLO),xs(XHI),ys(B1+B2*XHI),'l9-true');
      E.pl=line(gc,0,0,0,0,'l9-plim');
      E.ols=line(gc,0,0,0,0,'l9-ols');
      update();
    }
    function update(){
      var s=Math.sqrt(se2), lam=1/(1+se2), i, x, y, sx=0, sy=0, sxx=0, sxy=0, b2, b1, d='', dg='', px, py, gap, t, sw;
      for(i=0;i<N;i++){
        x=ZX[i]+s*ZE[i]; y=B1+B2*ZX[i]+SU*ZU[i];
        sx+=x; sy+=y; sxx+=x*x; sxy+=x*y;
        py=R(ys(y));
        d+='M'+R(xs(x))+','+py+'h0';
        if(ghost) dg+='M'+R(xs(ZX[i]))+','+py+'h0';
      }
      b2=(sxy-sx*sy/N)/(sxx-sx*sx/N); b1=sy/N-b2*sx/N;
      /* smaller marks for larger samples */
      sw=N<=100?' l9-big':N<=500?'':' l9-small';
      E.pts.setAttribute('d',d); E.pts.setAttribute('class','l9-pts'+sw);
      if(ghost){ E.gh.setAttribute('d',dg); E.gh.setAttribute('class','l9-ghost'+sw); }
      setLine(E.pl,xs(XLO),ys(B1+B2*lam*XLO),xs(XHI),ys(B1+B2*lam*XHI));
      setLine(E.ols,xs(XLO),ys(b1+b2*XLO),xs(XHI),ys(b1+b2*XHI));
      gap=rd(b2,3)-rd(B2*lam,3);
      st={se2:se2, ratio:se2, lam:rd(lam,3), plim:rd(B2*lam,3), slope:rd(b2,3), gap:rd(gap,3), beta:B2, n:N, sample:seed-SEED, ghost:ghost?1:0, moves:moves};
      if(api) api.changed();
      if(!out) return;
      out.textContent='λ = Var(x*) ÷ (Var(x*) + Var(e)) = '+f3(lam)+'\nplim β̂₂ = β₂λ = '+f3(B2*lam)+'   true β₂ = 1.5'+
        '\nthis sample, N = '+N+': β̂₂ = '+f3(b2)+'   β̂₂ '+MINUS+' β₂λ = '+sg(gap,3);
      t=se2===0?'\nNo measurement error: λ = 1 and OLS is consistent for β₂.'
        :'\nMore N pulls β̂₂ to β₂λ = '+f3(B2*lam)+', not to β₂ = 1.5.';
      if(se2===0) out.appendChild(document.createTextNode(t)); else warn(out,t);
    }
    /* Try it. get: se2 (Var(e), the measurement error variance; Var(x*) = 1), ratio (Var(e) ÷ Var(x*), the same number),
       lam (the reliability ratio λ = Var(x*) ÷ (Var(x*) + Var(e)), to 0.001), plim (β₂λ, to 0.001), slope (this sample's OLS slope
       on the observed x, to 0.001), gap (slope − plim, to 0.001), beta (the true β₂ = 1.5), n (sample size N),
       sample (New sample presses, 0 for the first draw), ghost (1 when the points at the true x* show),
       moves (slider, button and New sample changes). Numbers are rounded as the readout shows them.
       set: se2, n (snaps to the nearest stop 25, 50, 100, 200, 500, 1000, 2000), sample, ghost (0 or 1). */
    api=NF.api({
      get:function(){ var o={}, q; for(q in st) o[q]=st[q]; return o; },
      set:function(o){
        var s2, b;
        if('ghost' in o) NF.press(fig,'data-ghost',+o.ghost?'1':'0');
        if('sample' in o){ s2=SEED+Math.max(0,Math.round(+o.sample)||0); if(s2!==seed){ seed=s2; moves++; gen(); update(); } }
        if('n' in o && rn){ b=nearest(NS,+o.n); if(b!==rn.i()) rn.set(b); }
        if('se2' in o && rv) rv.set(+o.se2);
        else if('ratio' in o && rv) rv.set(+o.ratio);
      }
    });
    gen(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Omitted variable bias as a probability limit ----------
     Long model y = β1 + β2 x + γ q + u with β1 = 0, β2 = 1; (x, q) jointly normal with mean 0, variance 1 and correlation ρ;
     u ~ N(0, 1) independent of (x, q). The linear projection of q on x has slope δ = Cov(x, q) ÷ Var(x) = ρ.
     Short regression: y on a constant and x, plim β2 + δγ. Long regression: y on a constant, x and q, plim β2.
     Monte Carlo: 2000 samples for each N, from one seeded stream per N. With x = z1 and q = ρ z1 + √(1 − ρ²) z2 each sample is
     kept as its centred moments S11, S12, S22, S1u, S2u of (z1, z2, u), from which both slopes follow exactly at any γ and ρ:
       short = β2 + γ (ρ + √(1 − ρ²) S12 ÷ S11) + S1u ÷ S11
       long  = β2 + a − ρ b ÷ √(1 − ρ²), with (a, b) the OLS coefficients of u on (z1, z2). */
  NF.register('l9-ovb',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var B2=1, REPS=2000, NS=[25,50,100,200,400,800,1600], SEED=91118, XLO=-1.25, XHI=3.25;
    var gam=1, rho=0.5, N=100, ni=2, moves=0, api=null, st={}, E={}, MOM={};
    var W=520, H=380, mL=36, mR=14, top=60, bot=250, xs, ys;
    var rg=range(fig,'b3',1,function(v){ gam=rd(v,1); moves++; update(); });
    if(rg) gam=rd(rg.v(),1);
    var rr=range(fig,'rho',1,function(v){ rho=rd(v,1); moves++; update(); });
    if(rr) rho=rd(rr.v(),1);
    var rn=steps(fig,'n',NS,function(v,i){ N=v; ni=i; moves++; update(); });
    if(rn){ ni=rn.i(); N=NS[ni]; }

    /* one resumable job per N, so the background can simulate in short slices; the draws run sample by sample from one stream,
       so the result does not depend on how the work is sliced */
    function job(n){
      if(MOM[n]) return MOM[n];
      var r=normals(SEED+n), m=new Float64Array(REPS*5), k=0;
      function step(budget){
        var i, a, b, c, s1, s2, su, s11, s12, s22, s1u, s2u;
        for(;k<REPS && budget>0;k++,budget-=n){
          s1=0; s2=0; su=0; s11=0; s12=0; s22=0; s1u=0; s2u=0;
          for(i=0;i<n;i++){ a=r(); b=r(); c=r(); s1+=a; s2+=b; su+=c; s11+=a*a; s12+=a*b; s22+=b*b; s1u+=a*c; s2u+=b*c; }
          m[5*k]=s11-s1*s1/n; m[5*k+1]=s12-s1*s2/n; m[5*k+2]=s22-s2*s2/n; m[5*k+3]=s1u-s1*su/n; m[5*k+4]=s2u-s2*su/n;
        }
        return k<REPS;
      }
      MOM[n]={step:step, left:function(){ return k<REPS; }, m:m};
      return MOM[n];
    }
    function moments(n){ var j=job(n); if(j.left()) j.step(Infinity); return j.m; }
    /* the other sample sizes are simulated in the background once the figure is near the screen */
    var seen=!window.IntersectionObserver, timer=0;
    function warm(){
      timer=0;
      for(var j=0;j<NS.length;j++) if(job(NS[j]).left()){ job(NS[j]).step(60000); timer=setTimeout(warm,16); return; }
    }
    function kick(){ if(seen && !timer) timer=setTimeout(warm,120); }
    if(window.IntersectionObserver) new IntersectionObserver(function(en){ for(var i=0;i<en.length;i++) if(en[i].isIntersecting){ seen=true; kick(); } },{rootMargin:'300px'}).observe(fig);

    function slopes(){
      var m=moments(N), s=Math.sqrt(1-rho*rho), sh=new Float64Array(REPS), lo=new Float64Array(REPS), k, a, b, D, o, ms=0, ml=0, vs=0, vl=0;
      for(k=0;k<REPS;k++){
        o=5*k; D=m[o]*m[o+2]-m[o+1]*m[o+1];
        a=(m[o+2]*m[o+3]-m[o+1]*m[o+4])/D; b=(m[o]*m[o+4]-m[o+1]*m[o+3])/D;
        sh[k]=B2+gam*(rho+s*m[o+1]/m[o])+m[o+3]/m[o];
        lo[k]=B2+a-rho*b/s;
        ms+=sh[k]; ml+=lo[k];
      }
      ms/=REPS; ml/=REPS;
      for(k=0;k<REPS;k++){ vs+=(sh[k]-ms)*(sh[k]-ms); vl+=(lo[k]-ml)*(lo[k]-ml); }
      return {sh:sh, lo:lo, ms:ms, ml:ml, ss:Math.sqrt(vs/(REPS-1)), sl:Math.sqrt(vl/(REPS-1))};
    }
    /* density histogram of v on [XLO, XHI] with bin width bw: the filled area and a step outline that skips empty bins */
    function hist(v,bw,cap){
      var nb=Math.round((XHI-XLO)/bw), c=new Float64Array(nb), i, b, d, tp=[], edge='', run=null, y0=ys(0), pk=0;
      for(i=0;i<REPS;i++){ b=Math.floor((v[i]-XLO)/bw); if(b>=0 && b<nb) c[b]++; }
      for(b=0;b<nb;b++){
        d=c[b]/(REPS*bw); if(d>pk) pk=d;
        d=Math.min(d,cap);
        tp.push([xs(XLO+b*bw),ys(d)],[xs(XLO+(b+1)*bw),ys(d)]);
        if(c[b]>0){ if(!run) run=[[xs(XLO+b*bw),y0]]; run.push([xs(XLO+b*bw),ys(d)],[xs(XLO+(b+1)*bw),ys(d)]); }
        if(run && (c[b]===0 || b===nb-1)){ run.push([run[run.length-1][0],y0]); edge+=poly(run); run=null; }
      }
      return {area:poly([[xs(XLO),y0]].concat(tp,[[xs(XHI),y0]]))+'Z', edge:edge, peak:pk};
    }
    function bins(sd){ return clamp(nice125(sd/2.5),0.005,0.2); }

    var CW=74, CH=24;
    function draw(){
      var g, rows, j, x, gx, gy, lab, r, c, wide;
      W=measure(svg); frame(svg,W,H);
      g=S('g',null,svg);
      rows=key(g,[['rect','l9-short l9-sws','short: y on x'],['rect','l9-long l9-swl','long: y on x and q']],mL,11,W-mR);
      E.r1=rows*16+16; E.r2=E.r1+15;
      top=E.r2+10; bot=top+clamp(Math.round((W-mL-mR)*0.42),150,196);
      xs=lin(XLO,XHI,mL,W-mR);
      for(j=-1;j<=3;j++){ x=C(xs(j)); line(g,x,top,x,bot,'nf-grid'); line(g,x,bot,x,bot+4,'nf-ax'); text(g,xs(j),bot+17,tl(j),null,'middle'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,(mL+W-mR)/2,bot+34,'estimated slope on x','nf-title','middle');
      text(g,4,E.r1,'density','nf-title');
      E.yg=S('g',null,svg);
      E.band=S('rect',{'class':'l9-bias',y:R(top),height:R(bot-top)},svg);
      E.clip=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      E.la=S('path',{'class':'l9-long'},E.clip); E.le=S('path',{'class':'l9-longl'},E.clip);
      E.sa=S('path',{'class':'l9-short'},E.clip); E.se=S('path',{'class':'l9-shortl'},E.clip);
      E.t0=line(svg,C(xs(B2)),top-4,C(xs(B2)),bot,'l9-true');
      E.t1=line(svg,0,top-4,0,bot,'l9-lim');
      E.arrow=S('path',{'class':'l9-arrow'},svg);
      text(svg,xs(B2),E.r1,'β₂ = 1','nf-lab nf-halo','middle');
      E.lab=text(svg,0,E.r2,'','l9-tk nf-halo','middle');
      /* the sign grid: rows by the sign of γ, columns by the sign of δ */
      wide=W>=430;
      gy=bot+62; gx=mL+(wide?62:44);
      text(svg,mL,gy,'sign of the bias δγ','nf-title');
      text(svg,gx+CW/2,gy+19,'δ < 0',null,'middle'); text(svg,gx+CW+CW/2,gy+19,'δ > 0',null,'middle');
      lab=[['γ > 0',MINUS,'+'],['γ < 0','+',MINUS]];
      E.cell=[]; E.ct=[];
      for(r=0;r<2;r++){
        text(svg,gx-8,gy+26+r*CH+16,lab[r][0],null,'end');
        for(c=0;c<2;c++){
          E.cell.push(S('rect',{x:C(gx+c*CW),y:C(gy+26+r*CH),width:CW,height:CH,'class':'l9-cell'},svg));
          E.ct.push(text(svg,gx+c*CW+CW/2,gy+26+r*CH+16,'bias '+lab[r][c+1],'l9-ctext','middle'));
        }
      }
      E.note=text(svg,gx+2*CW+14,gy+26+CH+4,'',wide?'nf-lab':'nf-hide');
      H=gy+26+2*CH+10;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      update();
    }
    function update(){
      var o=slopes(), delta=rho, bias=rd(gam*delta,2), lim=rd(B2+bias,2), ymax, hs, hl, yt, i, xa, xb, cap, a, t, hot, w, half, y;
      ymax=niceUp(1.25*0.3989422804/Math.min(o.ss,o.sl)); cap=ymax*1.04;
      ys=lin(0,ymax,bot,top);
      hs=hist(o.sh,bins(o.ss),cap); hl=hist(o.lo,bins(o.sl),cap);
      /* a histogram peak is noisy: if one pokes above the axis, give it a taller axis */
      if(Math.max(hs.peak,hl.peak)>ymax){ ymax=niceUp(1.05*Math.max(hs.peak,hl.peak)); cap=ymax*1.04; ys=lin(0,ymax,bot,top); hs=hist(o.sh,bins(o.ss),cap); hl=hist(o.lo,bins(o.sl),cap); }
      while(E.yg.firstChild) E.yg.removeChild(E.yg.firstChild);
      yt=[ymax/2,ymax];
      for(i=0;i<yt.length;i++){ line(E.yg,mL,C(ys(yt[i])),W-mR,C(ys(yt[i])),'nf-grid'); text(E.yg,mL-7,ys(yt[i])+4,tl(yt[i]),null,'end'); }
      text(E.yg,mL-7,bot+4,'0',null,'end');
      E.sa.setAttribute('d',hs.area); E.se.setAttribute('d',hs.edge);
      E.la.setAttribute('d',hl.area); E.le.setAttribute('d',hl.edge);
      xa=xs(B2); xb=xs(lim);
      E.band.setAttribute('x',R(Math.min(xa,xb))); E.band.setAttribute('width',R(Math.abs(xb-xa)));
      E.t1.setAttribute('x1',C(xb)); E.t1.setAttribute('x2',C(xb));
      E.t1.setAttribute('class',bias===0?'nf-hide':'l9-lim');
      /* an arrow from β₂ to the limit of the short slope */
      y=top+9; a=xb>xa?1:-1;
      E.arrow.setAttribute('d',Math.abs(xb-xa)>=14?'M'+R(xa)+','+y+'L'+R(xb-a*2)+','+y+'M'+R(xb-a*8)+','+(y-4)+'L'+R(xb-a*1.5)+','+y+'L'+R(xb-a*8)+','+(y+4):'');
      t=bias===0?'β₂ + δγ = '+f2(lim)+', no bias':'β₂ + δγ = '+f2(lim)+', bias '+sg(bias,2);
      E.lab.textContent=t;
      w=NF.tw(E.lab,t); half=w/2+2;
      E.lab.setAttribute('x',R(clamp(xb,half,W-half)));
      E.lab.setAttribute('class',(bias===0?'nf-lab':'l9-tk')+' nf-halo');
      hot=bias===0?-1:(gam>0?0:2)+(delta>0?1:0);
      for(i=0;i<4;i++){
        E.cell[i].setAttribute('class',i===hot?'l9-cell l9-on':'l9-cell');
        E.ct[i].setAttribute('class',i===hot?'l9-ctext l9-con':'l9-ctext');
      }
      E.note.textContent=bias===0?(gam===0?'γ = 0: no bias':'δ = 0: no bias'):bias>0?'β̂₂ too large':'β̂₂ too small';
      st={b3:gam, gamma:gam, rho:rho, n:N, delta:rd(delta,2), bias:bias, limshort:lim, limlong:B2, meanshort:rd(o.ms,3), meanlong:rd(o.ml,3),
        sdshort:rd(o.ss,3), sdlong:rd(o.sl,3), sign:bias>0?1:bias<0?-1:0, moves:moves};
      kick();
      if(api) api.changed();
      if(!out) return;
      out.textContent='δ = Cov(x, q) ÷ Var(x) = '+f2(delta)+'   bias δγ = '+sg(bias,2)+'\nshort slope →ₚ β₂ + δγ = '+f2(lim)+'   long slope →ₚ β₂ = 1'+
        '\n2000 samples of N = '+N+':   short mean '+f3(o.ms)+', sd '+f3(o.ss)+'   long mean '+f3(o.ml)+', sd '+f3(o.sl);
      if(bias===0) out.appendChild(document.createTextNode(gam===0?'\nγ = 0: q does not belong in the model, so leaving it out costs nothing.':'\nδ = 0: x and q are orthogonal, so the short slope is still consistent for β₂.'));
      else warn(out,'\nMore N tightens the short slope around '+f2(lim)+', '+(bias>0?'above':'below')+' β₂ = 1. The bias does not shrink.');
    }
    /* Try it. get: b3 (γ, the coefficient on the omitted variable q; gamma is the same number), rho (Corr(x, q)), n (sample size N),
       delta (δ = Cov(x, q) ÷ Var(x), equal to ρ here because both variances are 1, to 0.01), bias (δγ, to 0.01),
       limshort (β₂ + δγ, the limit of the short slope, to 0.01), limlong (β₂ = 1),
       meanshort meanlong sdshort sdlong (mean and sd of the short and the long slope over the 2000 samples, to 0.001),
       sign (1, 0 or −1, the sign of the bias), moves (slider changes). Numbers are rounded as the readout shows them.
       set: b3 (or gamma), rho, n (snaps to the nearest stop 25, 50, 100, 200, 400, 800, 1600). */
    api=NF.api({
      get:function(){ var o={}, q; for(q in st) o[q]=st[q]; return o; },
      set:function(o){
        var b;
        if('n' in o && rn){ b=nearest(NS,+o.n); if(b!==rn.i()) rn.set(b); }
        if('rho' in o && rr) rr.set(+o.rho);
        if('b3' in o && rg) rg.set(+o.b3);
        else if('gamma' in o && rg) rg.set(+o.gamma);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* notes.js may have booted before this file loaded; start any L9 figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();

/* L9 figure: simultaneity in Haavelmo's model. Drawn with the helpers of /assets/notes.js (window.NF); colours come from
   CSS variables in /assets/figs/l9b.css.
   Design: consumption function Cᵢ = α + βYᵢ + uᵢ and income identity Yᵢ = Cᵢ + Iᵢ, with Iᵢ = 2 + sd(I)·z₁ᵢ and
   uᵢ = sd(u)·z₂ᵢ, z₁ and z₂ independent N(0, 1), N = 200. α = 8 − 10β keeps the mean equilibrium at (Y, C) = (10, 8).
   Reduced form: Yᵢ = (α + Iᵢ + uᵢ) ÷ (1 − β), Cᵢ = (α + βIᵢ + uᵢ) ÷ (1 − β). Hence
   Cov(Y, u) = Var(u) ÷ (1 − β) and plim β̂ = Cov(Y, C) ÷ Var(Y) = (β Var(I) + Var(u)) ÷ (Var(I) + Var(u)). */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, fmt=NF.fmt, tl=NF.tl, lin=NF.lin,
      measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip;

  NF.register('l9-simul',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=200, MARK=5, SEED=20261118, YBAR=10, CBAR=8, IBAR=2, X0=4, X1=16, Y0=3, Y1=13, TWO_PI=6.283185307179586;
    var b=0.6, si=0.4, su=0.3, seed=SEED, moves=0, api=null, ST={}, Z1=new Float64Array(N), Z2=new Float64Array(N);
    var W=520, H=330, mL=34, mR=10, top=30, bot=280, xs, ys, el={};
    function r2(v){ return Math.round(v*100)/100; }
    function r3(v){ return Math.round(v*1000)/1000; }
    var rb=range(fig,'b',2,function(v){ b=r2(v); moves++; update(); });
    var ri=range(fig,'si',2,function(v){ si=r2(v); moves++; update(); });
    var ru=range(fig,'su',2,function(v){ su=r2(v); moves++; update(); });
    if(rb) b=r2(rb.v());
    if(ri) si=r2(ri.v());
    if(ru) su=r2(ru.v());
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; moves++; gen(); update(); });

    /* the standard normal draws behind one sample; the sliders rescale them, so the cloud moves smoothly */
    function gen(){
      var r=mulberry32(seed), i, a, t;
      for(i=0;i<N;i++){ a=Math.sqrt(-2*Math.log(1-r())); t=TWO_PI*r(); Z1[i]=a*Math.cos(t); Z2[i]=a*Math.sin(t); }
    }
    /* a line through (px, py) with the given slope, across the whole plot; the clip trims it */
    function span(e,px,py,slope){ setLine(e,xs(X0),ys(py+slope*(X0-px)),xs(X1),ys(py+slope*(X1-px))); }

    function draw(){
      var g, i, rows, t, pw;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['line','l9-cf','consumption function α + βY'],['line','l9-id','identity C = Y − E[I]'],['line','l9s-ols','OLS of C on Y'],
        ['line','l9-sh l9-shk','shifted by uᵢ and Iᵢ']],mL+4,11,W-4);
      top=14+16*rows+8; pw=W-mL-mR;
      bot=top+Math.round(clamp(0.833*pw,200,340)); H=bot+40;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(X0,X1,mL,W-mR); ys=lin(Y0,Y1,bot,top);
      g=S('g',null,svg);
      t=[4,6,8,10,12,14,16];
      for(i=0;i<t.length;i++){ line(g,C(xs(t[i])),top,C(xs(t[i])),bot,'nf-grid'); line(g,C(xs(t[i])),bot,C(xs(t[i])),bot+4,'nf-ax'); text(g,xs(t[i]),bot+17,tl(t[i]),null,i===t.length-1?'end':'middle'); }
      t=[4,6,8,10,12];
      for(i=0;i<t.length;i++){ line(g,mL,C(ys(t[i])),W-mR,C(ys(t[i])),'nf-grid'); text(g,mL-7,ys(t[i])+4,tl(t[i]),null,'end'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,(mL+W-mR)/2,bot+34,'income Y','nf-title','middle');
      text(g,mL+6,top+13,'consumption C','nf-title','start');
      el.clip=clip(svg,mL,top,pw,bot-top);
      el.sc=[]; el.si=[];
      for(i=0;i<MARK;i++){ el.sc.push(line(el.clip,0,0,0,0,'l9-sh l9-shc')); el.si.push(line(el.clip,0,0,0,0,'l9-sh l9-shi')); }
      el.ols=line(el.clip,0,0,0,0,'l9s-ols');
      el.cf=line(el.clip,0,0,0,0,'l9-cf');
      el.id=line(el.clip,0,0,0,0,'l9-id');
      /* the cloud sits on top, so it still shows when it lies on a line */
      el.pts=S('path',{'class':'l9s-pts'},el.clip);
      el.mk=[];
      for(i=0;i<MARK;i++) el.mk.push(S('circle',{r:3.6,'class':'l9-mark'},el.clip));
      update();
    }
    function update(){
      var a=CBAR-b*YBAR, k=1/(1-b), i, I, u, y, c, sy=0, sc=0, syy=0, syc=0, my, mc, vy, slope=null, d='', vi=si*si, vu=su*su, plim=null, cov=vu*k, why, flat=vi+vu<1e-12;
      if(!el.pts) return;
      for(i=0;i<N;i++){
        I=IBAR+si*Z1[i]; u=su*Z2[i]; y=(a+I+u)*k; c=y-I;
        sy+=y; sc+=c; syy+=y*y; syc+=y*c;
        d+='M'+R(xs(y))+','+R(ys(c))+'h0';
        if(i<MARK){
          span(el.sc[i],y,c,b); span(el.si[i],y,c,1);
          el.mk[i].setAttribute('cx',R(xs(y))); el.mk[i].setAttribute('cy',R(ys(c)));
        }
      }
      my=sy/N; mc=sc/N; vy=syy-N*my*my;
      el.pts.setAttribute('d',d);
      span(el.cf,YBAR,CBAR,b); span(el.id,YBAR,CBAR,1);
      if(!flat){
        slope=(syc-N*my*mc)/vy; plim=(b*vi+vu)/(vi+vu);
        span(el.ols,my,mc,slope);
      }
      el.ols.setAttribute('class',flat?'l9s-ols nf-hide':'l9s-ols');
      for(i=0;i<MARK;i++){ el.sc[i].setAttribute('class',su>0?'l9-sh l9-shc':'l9-sh l9-shc nf-hide'); el.si[i].setAttribute('class',si>0?'l9-sh l9-shi':'l9-sh l9-shi nf-hide'); }
      ST={slope:flat?null:r3(slope), plim:flat?null:r3(plim), bias:flat?null:r3(plim-b), cov:r3(cov)};
      why=flat?'Nothing moves: every point is the mean equilibrium and no slope is defined.'
        :su===0?'Only I moves: the points trace the consumption function, slope β.'
        :si===0?'Only u moves: the points trace the identity, slope 1.'
        :'Both move: OLS estimates neither slope, a weighted average of β and 1.';
      if(out) out.textContent='β = '+b.toFixed(2)+'   sd(I) = '+si.toFixed(2)+'   sd(u) = '+su.toFixed(2)+'   N = '+N+
        '\nOLS slope of C on Y in this sample: '+(flat?'not defined':fmt(slope,3))+
        '\nits plim (β Var(I) + Var(u)) ÷ (Var(I) + Var(u)): '+(flat?'not defined':plim.toFixed(3)+'   plim − β = '+(plim-b).toFixed(3))+
        '\nCov(Y, u) = Var(u) ÷ (1 − β) = '+cov.toFixed(3)+
        '\n'+why;
      if(api) api.changed();
    }
    /* Try it. get: b (β, the marginal propensity to consume), si (sd of investment I), su (sd of the consumption shock u), n (sample size, 200),
       slope (OLS slope of C on Y in the plotted sample, to 0.001; null when sd(I) = sd(u) = 0), plim (its probability limit
       (β Var(I) + Var(u)) ÷ (Var(I) + Var(u)), to 0.001; null when both sds are 0), bias (plim − β, to 0.001), covyu (Cov(Y, u) = Var(u) ÷ (1 − β),
       to 0.001), sample (New sample presses, 0 for the first draws), moves (slider and New sample changes).
       The same numbers under the names of a supply and demand system, the estimated equation in the role of demand:
       bd (= b), bs (1, the slope of the identity), sd (= su, the shock of the estimated equation), ss (= si, the shock of the other equation), covpu (= covyu).
       set: b (0.3 to 0.7), si and su (0 to 0.5), sample; bd, ss and sd are accepted for b, si and su. */
    api=NF.api({
      get:function(){ return {b:b, si:si, su:su, n:N, slope:ST.slope, plim:ST.plim, bias:ST.bias, covyu:ST.cov, sample:seed-SEED, moves:moves,
        bd:b, bs:1, sd:su, ss:si, covpu:ST.cov}; },
      set:function(o){
        var v, s2;
        v='b' in o?o.b:o.bd; if(v!==undefined && rb && Math.abs(+v-b)>1e-9) rb.set(+v);
        v='si' in o?o.si:o.ss; if(v!==undefined && ri && Math.abs(+v-si)>1e-9) ri.set(+v);
        v='su' in o?o.su:o.sd; if(v!==undefined && ru && Math.abs(+v-su)>1e-9) ru.set(+v);
        if('sample' in o){ s2=SEED+Math.max(0,Math.round(+o.sample)||0); if(s2!==seed){ seed=s2; moves++; gen(); update(); } }
      }
    });
    gen(); draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
