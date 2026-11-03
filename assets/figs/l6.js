/* Lecture 6 figures: size and power of the z test, and the t test against the normal one.
   Drawn with the helpers that notes.js exposes as window.NF; colours come from the site tokens through classes. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, yGrid=NF.yGrid, xGrid=NF.xGrid,
      seg=NF.seg, range=NF.range, phi=NF.phi, Phi=NF.Phi, invPhi=NF.invPhi, key=NF.key, clip=NF.clip, local=NF.local,
      capture=NF.capture, tw=NF.tw;
  var uid=0, SIDE={gt:1, lt:1, ne:1};

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
      if(Math.abs(del-1)<1e-15) break;
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
  /* P(Z > x) for Z ~ N(0, 1), and c with P(Z > c) = a: Acklam's inverse, then one Newton step on Hart's CDF */
  function zSf(x){ return Phi(-x); }
  function zUp(a){ var x=-invPhi(a); return x+(Phi(-x)-a)/phi(x); }
  /* P(T > x) for T ~ t_n, exact through I_{n/(n + x²)}(n/2, 1/2); n = Infinity is N(0, 1) */
  function tSf(x,n){
    if(!isFinite(n)) return zSf(x);
    var q=0.5*ibeta(n/(n+x*x),n/2,0.5);
    return x>0?q:1-q;
  }
  /* c with P(T > c) = a for 0 < a ≤ 0.5: bisection on x = n/(n + c²), where I_x(n/2, 1/2) = 2a */
  function tUp(a,n){
    if(!isFinite(n)) return zUp(a);
    if(a>=0.5) return 0;
    var lo=0, hi=1, mid, i;
    for(i=0;i<120;i++){ mid=(lo+hi)/2; if(ibeta(mid,n/2,0.5)<2*a) lo=mid; else hi=mid; }
    mid=(lo+hi)/2;
    return Math.sqrt(n*(1-mid)/mid);
  }
  /* the t_n density as a function, with its constant worked out once */
  function tDens(n){
    if(!isFinite(n)) return phi;
    var k=lgamma((n+1)/2)-lgamma(n/2)-0.5*Math.log(n*Math.PI), e=(n+1)/2;
    return function(x){ return Math.exp(k-e*Math.log(1+x*x/n)); };
  }
  /* ---------- end of special functions ---------- */

  function r3(v){ return Math.round(v*1000)/1000; }
  var SUBS='₀₁₂₃₄₅₆₇₈₉';
  function sub(n){ return String(n).replace(/\d/g,function(d){ return SUBS.charAt(+d); }); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  /* text made of [base, subscript, base, ...] pieces, rebuilt in place */
  function rich(t,parts){
    var i, s, low=false;
    while(t.firstChild) t.removeChild(t.firstChild);
    for(i=0;i<parts.length;i++){
      if(!parts[i]){ continue; }
      s=S('tspan',null,t);
      if(i%2){ s.setAttribute('class','nf-sub'); s.setAttribute('dy','3'); low=true; }
      else if(low){ s.setAttribute('dy','-3'); low=false; }
      s.textContent=parts[i];
    }
    return t;
  }
  function hide(e,off){ e.setAttribute('visibility',off?'hidden':'visible'); }
  /* a slider that steps through a list of values; the label shows the value, not the index (as in l2.js) */
  function steps(fig,k,vals,label,name,cb){
    var inp=fig.querySelector('input[data-k="'+k+'"]'), val, hi=vals.length-1;
    if(!inp) return null;
    val=inp.parentNode.querySelector('.nfig-val');
    inp.min='0'; inp.max=String(hi); inp.step='1';
    function show(i){
      var s=label(vals[i]);
      inp.value=String(i);
      inp.style.setProperty('--p',(i/hi*100).toFixed(1)+'%');
      if(val) val.textContent=s;
      inp.setAttribute('aria-valuetext',name+' = '+s);
    }
    inp.addEventListener('input',function(){ var i=clamp(Math.round(+inp.value),0,hi); show(i); cb(vals[i],i); });
    show(clamp(Math.round(+inp.value),0,hi));
    return {el:inp, i:function(){ return clamp(Math.round(+inp.value),0,hi); }, set:function(i){ i=clamp(i,0,hi); show(i); cb(vals[i],i); }};
  }

  /* ---------- 1. Size, power and the Type II error of the z test of H₀: θ = r ---------- */
  NF.register('l6-power',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var LO=-6.5, HI=6.5, YMAX=0.5, alpha=0.05, delta=2, moves=0, api=null;
    var H=300, mL=36, mR=28, top=46, bot=246, W=520, xs, ys, el={}, drag=false, pid='l6hatch'+(++uid);
    var side=seg(fig,'data-side',function(v){ if(!SIDE[v]||v===side) return; side=v; moves++; update(); });
    if(!SIDE[side]) side='gt';
    var ra=range(fig,'alpha',2,function(v){ alpha=Math.round(v*100)/100; moves++; update(); });
    var rd=range(fig,'delta',1,function(v){ delta=Math.round(v*10)/10; moves++; update(); });
    if(ra) alpha=Math.round(ra.v()*100)/100;
    if(rd) delta=Math.round(rd.v()*10)/10;
    /* critical value: c_α one sided, c_{α/2} two sided */
    function crit(){ return zUp(side==='ne'?alpha/2:alpha); }
    /* P(reject H₀) when z ~ N(d, 1) */
    function rej(d,c){
      if(side==='gt') return zSf(c-d);
      if(side==='lt') return Phi(-c-d);
      return zSf(c-d)+Phi(-c-d);
    }
    /* H₀ holds at δ = 0, and for a one sided test also on the far side: θ < r is inside H₀: θ ≤ r */
    function h0true(){ return delta===0 || (side==='gt' && delta<0) || (side==='lt' && delta>0); }
    function area(m,a,b){
      a=Math.max(a,LO); b=Math.min(b,HI);
      if(b<=a) return '';
      var q=[[xs(a),ys(0)]], n=Math.max(8,Math.ceil((b-a)*14)), j, v;
      for(j=0;j<=n;j++){ v=a+(b-a)*j/n; q.push([xs(v),ys(phi(v-m))]); }
      q.push([xs(b),ys(0)]);
      return poly(q)+'Z';
    }
    function draw(){
      var g, gc, rows, defs, pat, sw, i, p=[], x, tk=[-6,-4,-2,0,2,4,6];
      W=measure(svg); frame(svg,W,H);
      defs=S('defs',null,svg);
      pat=S('pattern',{id:pid,width:6,height:6,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},defs);
      S('line',{x1:3,y1:-1,x2:3,y2:7,'class':'l6-hatch'},pat);
      g=S('g',null,svg);
      rows=key(g,[['rect','l6-hatchsw','size'],['rect','l6-pow l6-swb','power'],['rect','l6-typ2 l6-swp','Type II error'],
        ['line','nf-ref','H₀: N(0, 1)'],['line','nf-line','truth: N(δ, 1)']],mL+6,11,W-mR);
      sw=g.querySelector('rect.l6-hatchsw');
      if(sw) sw.setAttribute('fill','url(#'+pid+')');
      top=rows*16+30; bot=top+196; H=bot+30;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(LO,HI,mL,W-mR); ys=lin(0,YMAX,bot,top);
      g=S('g',null,svg);
      xGrid(g,xs,tk,top,bot,bot+17);
      for(i=0;i<tk.length;i++) line(g,C(xs(tk[i])),bot,C(xs(tk[i])),bot+4,'nf-ax');
      yGrid(g,ys,[0,0.2,0.4],mL,W-mR);
      text(g,mL-7,top-12,'f(z)','nf-title','end');
      text(g,W-3,bot+17,'z','nf-title','end');
      gc=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      /* Type II error in the purple of \kp, power in the blue of \kb, size hatched in the red of \kr */
      el.typ2=S('path',{'class':'l6-typ2'},gc);
      el.pow=S('path',{'class':'l6-pow'},gc);
      el.size=S('path',{'class':'l6-size',fill:'url(#'+pid+')'},gc);
      for(i=0;i<=260;i++){ x=LO+(HI-LO)*i/260; p.push([xs(x),ys(phi(x))]); }
      S('path',{d:poly(p),'class':'nf-ref'},gc);
      el.tr=S('path',{'class':'nf-line'},gc);
      el.cl=[line(svg,0,0,0,0,'nf-guide'),line(svg,0,0,0,0,'nf-guide')];
      el.ct=[text(svg,0,top+11,'','nf-lab nf-halo'),text(svg,0,top+11,'','nf-lab nf-halo')];
      el.h0t=text(svg,0,0,'H₀','nf-lab nf-halo','middle');
      el.trt=text(svg,0,0,'truth','nf-lab nf-halo','middle');
      update();
    }
    function update(){
      var c=crit(), P=rej(delta,c), sz=rej(0,c), h0=h0true(), pts=[], i, x, d1='', d2='', d3='', gap, py, s, a, b, room, cx;
      for(i=0;i<=260;i++){ x=LO+(HI-LO)*i/260; pts.push([xs(x),ys(phi(x-delta))]); }
      el.tr.setAttribute('d',poly(pts));
      if(side==='gt'){ d1=area(0,c,HI); d2=area(delta,c,HI); d3=area(delta,LO,c); }
      else if(side==='lt'){ d1=area(0,LO,-c); d2=area(delta,LO,-c); d3=area(delta,-c,HI); }
      else { d1=area(0,LO,-c)+area(0,c,HI); d2=area(delta,LO,-c)+area(delta,c,HI); d3=area(delta,-c,c); }
      el.size.setAttribute('d',d1);
      el.pow.setAttribute('d',d2);
      /* not rejecting a true H₀ is no error, so the purple area shows only when H₀ is false */
      el.typ2.setAttribute('d',h0?'':d3);
      /* the dashed critical values with their labels, kept clear of each other on either side */
      if(side==='ne'){
        setLine(el.cl[0],C(xs(-c)),top,C(xs(-c)),bot); setLine(el.cl[1],C(xs(c)),top,C(xs(c)),bot);
        hide(el.cl[1],false); hide(el.ct[1],false);
        rich(el.ct[0],[NF.MINUS+'c','α/2']); el.ct[0].setAttribute('x',R(xs(-c)-5)); el.ct[0].setAttribute('text-anchor','end');
        rich(el.ct[1],['c','α/2',' = '+c.toFixed(3)]); el.ct[1].setAttribute('x',R(xs(c)+5)); el.ct[1].setAttribute('text-anchor','start');
      } else {
        x=side==='gt'?c:-c;
        setLine(el.cl[0],C(xs(x)),top,C(xs(x)),bot);
        hide(el.cl[1],true); hide(el.ct[1],true);
        rich(el.ct[0],[side==='gt'?'c':NF.MINUS+'c','α',' = '+fmt(x,3)]);
        el.ct[0].setAttribute('x',R(xs(x)+(side==='gt'?5:-5)));
        el.ct[0].setAttribute('text-anchor',side==='gt'?'start':'end');
      }
      /* H₀ and truth over their peaks when there is room for both words; each moves sideways off a dashed line that would cross it */
      py=ys(phi(0))-7; el.h0t.textContent=delta===0?'H₀ = truth':'H₀';
      cx=side==='ne'?[xs(-c),xs(c)]:[xs(side==='gt'?c:-c)];
      function off(x0,w){ for(var k=0;k<cx.length;k++) if(Math.abs(x0-cx[k])<w/2+6) x0=cx[k]+(x0>=cx[k]?1:-1)*(w/2+6); return x0; }
      a=tw(el.h0t,el.h0t.textContent); b=tw(el.trt,'truth');
      x=off(xs(0),a); gap=off(xs(delta),b);
      room=Math.abs(gap-x)>=(a+b)/2+10;
      el.h0t.setAttribute('x',R(x)); el.h0t.setAttribute('y',R(py));
      el.trt.setAttribute('x',R(gap)); el.trt.setAttribute('y',R(py));
      hide(el.h0t,delta!==0 && !room); hide(el.trt,delta===0 || !room);
      if(api) api.changed();
      if(!out) return;
      s='c = '+c.toFixed(3)+'   size = '+sz.toFixed(3)+'   ';
      if(h0) s+='P(reject) = '+P.toFixed(3)+'   no Type II error: H₀ is true\n';
      else s+='power = '+P.toFixed(3)+'   P(Type II) = '+(1-P).toFixed(3)+'\n';
      out.textContent=s;
      if(delta===0){ out.appendChild(document.createTextNode('δ = 0: H₀ holds, so power falls to the size and every rejection is a Type I error')); return; }
      if(h0){ warn(out,(side==='gt'?'θ < r lies inside H₀: θ ≤ r':'θ > r lies inside H₀: θ ≥ r')+', so a rejection is a Type I error, rarer than α'); return; }
      if(side==='gt') s='power = P(Z > c '+NF.MINUS+' δ) = P(Z > '+fmt(c-delta,3)+') = '+P.toFixed(3);
      else if(side==='lt') s='power = P(Z < '+NF.MINUS+'c '+NF.MINUS+' δ) = P(Z < '+fmt(-c-delta,3)+') = '+P.toFixed(3);
      else { a=zSf(c-delta); b=Phi(-c-delta); s='power = P(Z > c '+NF.MINUS+' δ) + P(Z < '+NF.MINUS+'c '+NF.MINUS+' δ) = '+a.toFixed(3)+' + '+b.toFixed(3)+' = '+P.toFixed(3); }
      out.appendChild(document.createTextNode(s));
    }
    /* drag on the plot to carry the truth N(δ, 1) along, as the δ slider does */
    function toDelta(px){ var v=clamp(Math.round(xs.inv(px)*10)/10,-4,4); if(rd && v!==delta) rd.set(v); }
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H);
      if(p[1]<top-8 || p[1]>bot+8 || p[0]<mL-8 || p[0]>W-mR+8) return;
      drag=true; capture(svg,e); toDelta(p[0]);
    });
    svg.addEventListener('pointermove',function(e){ if(drag) toDelta(local(svg,e,W,H)[0]); });
    function stop(){ drag=false; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    /* Try it. get: side (gt, lt, ne), alpha, delta, c (the critical value c_α or c_{α/2}), size (area under H₀ beyond c),
       power (P(reject) under the truth, which is the size at δ = 0), typeii (1 − power when H₀ is false, 0 when H₀ is true),
       h0 (true when H₀ holds: δ = 0, or δ on the far side of a one sided H₁), moves (slider, button and drag changes).
       Numbers are rounded as the readout shows them. set: side, alpha, delta (moved as a person would, snapped to the slider step). */
    api=NF.api({
      get:function(){
        var c=crit(), P=rej(delta,c), h0=h0true();
        return {side:side, alpha:alpha, delta:delta, c:r3(c), size:r3(rej(0,c)), power:r3(P), typeii:h0?0:r3(1-P), h0:h0, moves:moves};
      },
      set:function(st){
        if('side' in st && SIDE[st.side]) NF.press(fig,'data-side',String(st.side));
        if('alpha' in st && ra) ra.set(+st.alpha);
        if('delta' in st && rd) rd.set(+st.delta);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The t test: t_{N−K} against N(0, 1), p values and critical values ---------- */
  NF.register('l6-ttest',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var DF=[], i;
    for(i=1;i<=30;i++) DF.push(i);
    DF.push(35,40,45,50,60,70,80,90,100,Infinity);
    var LO=-5, HI=5, YMAX=0.48, df=30, t=2.1, alpha=0.05, moves=0, api=null, fT=tDens(30);
    var H=300, mL=36, mR=28, top=46, bot=246, W=520, xs, ys, el={}, drag=false;
    function dfText(v){ return isFinite(v)?String(v):'∞'; }
    function tName(){ return isFinite(df)?'t'+sub(df):'t∞'; }
    var side=seg(fig,'data-side',function(v){ if(!SIDE[v]||v===side) return; side=v; moves++; update(); });
    if(!SIDE[side]) side='ne';
    var al=seg(fig,'data-alpha',function(v){ var a=+v; if(!(a>0) || a===alpha) return; alpha=a; moves++; update(); });
    if(+al>0) alpha=+al;
    var rdf=steps(fig,'df',DF,dfText,'N − K',function(v){ df=v; moves++; draw(); });
    if(rdf) df=DF[rdf.i()];
    var rt=range(fig,'t',2,function(v){ t=Math.round(v*100)/100; moves++; update(); });
    if(rt) t=Math.round(rt.v()*100)/100;
    /* p value as in the three cases: P(T < t), P(T > t), 2P(T > |t|) */
    function pval(n){
      if(side==='lt') return tSf(-t,n);
      if(side==='gt') return tSf(t,n);
      return Math.min(1,2*tSf(Math.abs(t),n));
    }
    function lev(){ return side==='ne'?alpha/2:alpha; }
    /* p values to 3 decimals, to 4 when that is needed to see which side of α they fall, and below 0.0005 as < 0.001 (0 in get) */
    function near(v){ return Math.abs(v-alpha)<0.0005; }
    function ps(v){ return v<0.0005?'< 0.001':v.toFixed(near(v)?4:3); }
    function pr(v){ return v<0.0005?0:near(v)?Math.round(v*1e4)/1e4:r3(v); }
    function area(a,b){
      a=Math.max(a,LO); b=Math.min(b,HI);
      if(b<=a) return '';
      var q=[[xs(a),ys(0)]], n=Math.max(8,Math.ceil((b-a)*18)), j, v;
      for(j=0;j<=n;j++){ v=a+(b-a)*j/n; q.push([xs(v),ys(fT(v))]); }
      q.push([xs(b),ys(0)]);
      return poly(q)+'Z';
    }
    function draw(){
      var g, gc, rows, nm=tName(), p=[], q=[], j, x, tk=[-4,-2,0,2,4];
      fT=tDens(df);
      W=measure(svg); frame(svg,W,H);
      g=S('g',null,svg);
      rows=key(g,[['line','nf-line',nm],['line','l6-zref','N(0, 1)'],['rect','l6-pval l6-swr','p value under '+nm],
        ['line','l6-ct','critical '+nm],['line','l6-cz','critical N(0, 1)']],mL+6,11,W-mR);
      top=rows*16+26; bot=top+200; H=bot+44;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(LO,HI,mL,W-mR); ys=lin(0,YMAX,bot,top);
      g=S('g',null,svg);
      xGrid(g,xs,tk,top,bot,bot+17);
      for(j=0;j<tk.length;j++) line(g,C(xs(tk[j])),bot,C(xs(tk[j])),bot+4,'nf-ax');
      yGrid(g,ys,[0,0.2,0.4],mL,W-mR);
      text(g,mL-7,top-12,'f(t)','nf-title','end');
      text(g,W-3,bot+17,'t','nf-title','end');
      gc=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      /* the p value in the red of \kr, the observed t in the purple of \kp */
      el.pa=S('path',{'class':'l6-pval'},gc);
      for(j=0;j<=300;j++){ x=LO+(HI-LO)*j/300; p.push([xs(x),ys(phi(x))]); q.push([xs(x),ys(fT(x))]); }
      S('path',{d:poly(p),'class':'l6-zref'},gc);
      S('path',{d:poly(q),'class':'nf-line'},gc);
      el.cz=[line(svg,0,0,0,0,'l6-cz'),line(svg,0,0,0,0,'l6-cz')];
      el.ct=[line(svg,0,0,0,0,'l6-ct'),line(svg,0,0,0,0,'l6-ct')];
      el.ctl=text(svg,0,top+11,'','nf-lab nf-halo l6-tct');
      el.czl=text(svg,0,top+25,'','nf-lab nf-halo l6-tcz');
      el.tm=line(svg,0,0,0,0,'l6-tm');
      el.td=S('circle',{r:4,'class':'l6-tdot'},svg);
      el.tt=text(svg,0,bot+33,'','nf-lab l6-tt','middle');
      update();
    }
    /* lines at the critical values for the chosen side; the label goes on the rejecting side, or flips inward at the edge */
    function crit(ls,lab,c,dig){
      var pos=side==='ne'?[-c,c]:side==='gt'?[c]:[-c], k, x, s, w, right=side!=='lt', v;
      for(k=0;k<2;k++){
        v=pos[k];
        if(v===undefined || Math.abs(v)>HI){ setLine(ls[k],0,0,0,0); hide(ls[k],true); continue; }
        hide(ls[k],false); setLine(ls[k],C(xs(v)),top,C(xs(v)),bot);
      }
      s=(side==='ne'?'±':'')+fmt(right?c:-c,dig);
      if(c>HI){
        lab.textContent=right?s+' →':'← '+s;
        lab.setAttribute('x',R(right?W-mR:mL)); lab.setAttribute('text-anchor',right?'end':'start');
        return;
      }
      lab.textContent=s; x=xs(right?c:-c); w=tw(lab,s);
      if(right){
        if(x+5+w<=W-4){ lab.setAttribute('x',R(x+5)); lab.setAttribute('text-anchor','start'); }
        else { lab.setAttribute('x',R(x-5)); lab.setAttribute('text-anchor','end'); }
      } else {
        if(x-5-w>=4){ lab.setAttribute('x',R(x-5)); lab.setAttribute('text-anchor','end'); }
        else { lab.setAttribute('x',R(x+5)); lab.setAttribute('text-anchor','start'); }
      }
    }
    function update(){
      var c=tUp(lev(),df), cz=zUp(lev()), p=pval(df), pz=pval(Infinity), rej=p<alpha, rejz=pz<alpha, nm=tName(), x, y, s, w, sideTxt, cs, czs;
      if(side==='gt') el.pa.setAttribute('d',area(t,HI));
      else if(side==='lt') el.pa.setAttribute('d',area(LO,t));
      else el.pa.setAttribute('d',area(LO,-Math.abs(t))+area(Math.abs(t),HI));
      crit(el.ct,el.ctl,c,3);
      crit(el.cz,el.czl,cz,3);
      x=xs(clamp(t,LO,HI)); y=ys(fT(t));
      setLine(el.tm,C(x),bot,C(x),y); at(el.td,x,y);
      s='t = '+fmt(t,2); el.tt.textContent=s; w=tw(el.tt,s);
      el.tt.setAttribute('x',R(clamp(x,mL+w/2,W-mR-w/2+20)));
      if(api) api.changed();
      if(!out) return;
      sideTxt=side==='ne'?'two sided':side==='gt'?'right tail':'left tail';
      cs=(side==='ne'?'±':'')+fmt(side==='lt'?-c:c,3); czs=(side==='ne'?'±':'')+fmt(side==='lt'?-cz:cz,3);
      s='t = '+fmt(t,2)+'   p '+(p<0.0005?'':'= ')+ps(p)+' under '+(isFinite(df)?nm+', '+ps(pz)+' under N(0, 1)':'t∞ = N(0, 1)')+'\n'+
        'critical value '+cs+(isFinite(df)?' under '+nm+', '+czs+' under N(0, 1)':' under N(0, 1)')+'\n'+
        sideTxt+' at α = '+alpha.toFixed(2)+': '+(rej?'reject H₀':'fail to reject H₀');
      out.textContent=s;
      if(rejz && !rej) warn(out,', but N(0, 1) would reject: its cut ignores that σ² is estimated');
    }
    /* drag on the plot to place the observed t, as the t slider does */
    function toT(px){ var v=clamp(Math.round(xs.inv(px)*100)/100,LO,HI); if(rt && v!==t) rt.set(v); }
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H);
      if(p[1]<top-8 || p[1]>bot+40 || p[0]<mL-8 || p[0]>W-mR+8) return;
      drag=true; capture(svg,e); toT(p[0]);
    });
    svg.addEventListener('pointermove',function(e){ if(drag) toT(local(svg,e,W,H)[0]); });
    function stop(){ drag=false; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    /* Try it. get: df (N − K, Infinity at the last stop), dflab (the same as text: '30' or '∞', for live equations), inf (true at ∞),
       t, side (ne, gt, lt), alpha (0.1, 0.05, 0.01), p (p value under t_{N−K}), pz (under N(0, 1)), c (critical value of t_{N−K}:
       c_{α/2,N−K} two sided, c_{α,N−K} one sided, as a positive number), cz (the same for N(0, 1)), reject and rejectz (the decisions
       at α under t_{N−K} and under N(0, 1)), moves (slider, button and drag changes). Numbers are rounded as the readout shows them
       (a p value below 0.0005 reads 0). set: side, alpha, df (a number, snapped to the nearest stop; inf or anything above 100 is ∞), t. */
    api=NF.api({
      get:function(){
        var c=tUp(lev(),df), p=pval(df), pz=pval(Infinity);
        return {df:df, dflab:dfText(df), inf:!isFinite(df), t:t, side:side, alpha:alpha, p:pr(p), pz:pr(pz), c:r3(c), cz:r3(zUp(lev())),
          reject:p<alpha, rejectz:pz<alpha, moves:moves};
      },
      set:function(st){
        var v, j, b=0;
        if('side' in st && SIDE[st.side]) NF.press(fig,'data-side',String(st.side));
        if('alpha' in st) NF.press(fig,'data-alpha',String(+st.alpha));
        if('df' in st && rdf){
          v=st.df;
          if(v==='inf' || v==='∞' || +v>100) b=DF.length-1;
          else { v=+v; for(j=1;j<DF.length-1;j++) if(Math.abs(DF[j]-v)<Math.abs(DF[b]-v)) b=j; }
          if(b!==rdf.i()) rdf.set(b);
        }
        if('t' in st && rt) rt.set(+st.t);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();

/* L6 figures, part b: the joint F test against the two t tests in the (β2, β3) plane, and R squared against adjusted R squared
   as irrelevant regressors are added. Each registers with NF (assets/notes.js) and reuses its helpers. No third party code. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, yGrid=NF.yGrid,
      mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, tw=NF.tw;
  var uid=0;

  /* ---------- special functions (as in l1.js): log gamma, the regularised incomplete beta, t and F tails ---------- */
  var LG=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,
    12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  function lgamma(x){
    if(x<0.5) return Math.log(Math.PI/Math.sin(Math.PI*x))-lgamma(1-x);
    x-=1;
    var a=LG[0], t=x+7.5, i;
    for(i=1;i<9;i++) a+=LG[i]/(x+i);
    return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);
  }
  function tiny(v){ return Math.abs(v)<1e-300?1e-300:v; }
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
  function ibeta(x,a,b){
    if(x<=0) return 0;
    if(x>=1) return 1;
    var bt=Math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*Math.log(x)+b*Math.log(1-x));
    return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b;
  }
  function tTail2(t,n){ return ibeta(n/(n+t*t),n/2,0.5); }               /* P(|T| > |t|), T ~ t_n */
  function fSf(v,m,p){ return v<=0?1:ibeta(p/(p+m*v),p/2,m/2); }       /* P(F > v), F ~ F_{m,p} */
  /* the critical value c with tail(c) = alpha, by bisection on an exact tail */
  function crit(tail,alpha,hi){ var lo=0, i, mid; for(i=0;i<200;i++){ mid=(lo+hi)/2; if(tail(mid)>alpha) lo=mid; else hi=mid; } return (lo+hi)/2; }
  /* a round tick step giving about n ticks over span, and the ticks */
  function step(span,n){
    var raw=span/n, p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), r=raw/p;
    return (r<=1?1:r<=2?2:r<=2.5?2.5:r<=5?5:10)*p;
  }
  function ticks(lo,hi,st){ var a=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9;v+=st) a.push(Math.round(v*1e6)/1e6); return a; }
  /* a number as the readout prints it, for the Try it goals */
  function rd(v,d){ return +v.toFixed(d); }
  function kv(a,b){ return a+'\u00a0=\u00a0'+b; }
  function yn(a,j,p){ return a+'\u00a0'+(j?'yes':'no')+'\u00a0(p\u00a0=\u00a0'+p.toFixed(3)+')'; }
  function note(out,s,cls){ var sp=document.createElement('span'); sp.className=cls; sp.textContent=s; out.appendChild(sp); }
  /* β̂ as a β with its hat drawn as a small caret: the combining accent lands off centre in the site font */
  function hatBeta(g,x,y){
    var b=S('g',null,g), t=text(b,x,y,'β','nf-lab nf-halo'), w=tw(t,'β'), c=x+w/2;
    /* drawn at (x, y); the figure may shift the group with a transform */
    S('path',{d:'M'+R(c-2.6)+','+R(y-10.2)+'L'+R(c)+','+R(y-12.8)+'L'+R(c+2.6)+','+R(y-10.2),'class':'l6-hat'},b);
    return b;
  }
  /* a clip path whose shape the figure can reshape later */
  function clipShape(svg,tag){
    var id='l6bclip'+(++uid), defs=S('defs',null,svg), cp=S('clipPath',{id:id},defs);
    return {url:'url(#'+id+')', el:S(tag,null,cp)};
  }

  /* ---------- 1. Joint F test against two t tests: H0: β2 = r2 and β3 = r3 ---------- */
  NF.register('l6-wald',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* N = 33 and K = 3, so t has 30 df and v has F(2, 30). β̂ and the standard errors stay fixed; rho is the correlation of
       β̂2 and β̂3, so the block of Σ̂ is [se2², rho se2 se3; rho se2 se3, se3²] and, with t_k = (β̂_k − r_k)/se_k,
       v = (1/2)(β̂ − r)′[block]⁻¹(β̂ − r) = (t2² − 2 rho t2 t3 + t3²)/(2(1 − rho²)) */
    var DF=30, B=[0.42,0.30], SE=[0.25,0.20];
    var CT=crit(function(c){ return tTail2(c,DF); },0.05,50), CF=crit(function(c){ return fSf(c,2,DF); },0.05,200);
    /* r moves within TX standard errors of β̂2 and TY of β̂3; the plot always shows AY standard errors of β̂3 each way */
    var TX=4, TY=3, AY=3.3;
    var LO=[rd(B[0]-TX*SE[0],2),rd(B[1]-TY*SE[1],2)], HI=[rd(B[0]+TX*SE[0],2),rd(B[1]+TY*SE[1],2)];
    var r=[0,0], rho=0, moves=0, api=null, st={}, drag=false, grab=[0,0];
    var W=520, H=340, x0=46, x1=508, top=40, bot=300, xs, ys, E={};
    var rr=range(fig,'rho',2,function(v){ rho=rd(v,2); update(); });
    if(rr) rho=rd(rr.v(),2);
    function draw(){
      var g, gp, rows, mL=46, mR=12, avail, u, ph, A2, pw, k, xt, yt, t, ttl, lim, cp, bx;
      W=measure(svg); avail=W-mL-mR;
      /* equal pixels per standard error on both axes, so the ellipse has its true shape in t units */
      ph=W>=480?260:236; u=ph/(2*AY); A2=avail/(2*u);
      if(A2<TX+0.3){ A2=TX+0.3; u=avail/(2*A2); ph=2*AY*u; }
      A2=Math.min(A2,4.7);
      pw=2*A2*u; x0=mL+(avail-pw)/2; x1=x0+pw;
      frame(svg,W,400);
      rows=key(S('g',null,svg),[['line','l6-ell','joint 95% region: v ≤ '+CF.toFixed(2)],['line','l6-box','t intervals: |t| ≤ '+CT.toFixed(2)],
        ['rect','l6-jo l6-sw','only F rejects'],['rect','l6-to l6-sw','only a t test rejects']],x0,12,W-mR);
      top=12+16*(rows-1)+30; bot=top+ph; H=Math.ceil(bot+28);
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(B[0]-A2*SE[0],B[0]+A2*SE[0],x0,x1); ys=lin(B[1]-AY*SE[1],B[1]+AY*SE[1],bot,top);
      g=S('g',null,svg);
      /* grid in β units; the β = 0 lines a little stronger; x tick labels give way to the axis name */
      xt=ticks(B[0]-A2*SE[0],B[0]+A2*SE[0],step(2*A2*SE[0],pw>=360?7:5));
      yt=ticks(B[1]-AY*SE[1],B[1]+AY*SE[1],step(2*AY*SE[1],5));
      /* the axis name sits just right of the frame when there is room, else at the right edge */
      if(W-x1>=26){ ttl=text(g,x1+7,bot+4,'β₂','nf-title'); lim=W; }
      else { ttl=text(g,W-3,bot+17,'β₂','nf-title','end'); lim=W-3-tw(ttl,'β₂')-10; }
      for(k=0;k<xt.length;k++){
        line(g,C(xs(xt[k])),top,C(xs(xt[k])),bot,xt[k]===0?'nf-zero':'nf-grid');
        t=text(g,xs(xt[k]),bot+17,tl(xt[k]),null,'middle');
        if(xs(xt[k])+tw(t,t.textContent)/2>lim || xs(xt[k])-tw(t,t.textContent)/2<4) g.removeChild(t);
      }
      for(k=0;k<yt.length;k++){
        line(g,x0,C(ys(yt[k])),x1,C(ys(yt[k])),yt[k]===0?'nf-zero':'nf-grid');
        text(g,x0-7,ys(yt[k])+4,tl(yt[k]),null,'end');
      }
      text(g,x0-7,top-10,'β₃','nf-title','end');
      S('rect',{x:R(x0),y:R(top),width:R(pw),height:R(ph),'class':'l6-frame'},g);
      /* regions: box minus ellipse (only F rejects), ellipse minus box (only a t test rejects), and their overlap */
      cp=clipShape(svg,'rect');
      cp.el.setAttribute('x',R(x0)); cp.el.setAttribute('y',R(top)); cp.el.setAttribute('width',R(pw)); cp.el.setAttribute('height',R(ph));
      bx=[xs(B[0]-CT*SE[0]),ys(B[1]+CT*SE[1]),xs(B[0]+CT*SE[0]),ys(B[1]-CT*SE[1])];
      E.rectD='M'+R(bx[0])+','+R(bx[1])+'H'+R(bx[2])+'V'+R(bx[3])+'H'+R(bx[0])+'Z';
      E.cb=clipShape(svg,'path'); E.cb.el.setAttribute('d',E.rectD);
      E.ce=clipShape(svg,'path');
      gp=S('g',{'clip-path':cp.url},svg);
      E.inn=S('path',{'class':'l6-in','clip-path':E.cb.url},gp);
      E.jo=S('path',{'class':'l6-jo','clip-path':E.cb.url},gp);
      E.to=S('path',{'class':'l6-to','clip-path':E.ce.url},gp);
      S('path',{d:E.rectD,'class':'l6-box'},gp);
      E.ell=S('path',{'class':'l6-ell'},gp);
      S('circle',{cx:R(xs(B[0])),cy:R(ys(B[1])),r:3.5,'class':'l6-bhat'},gp);
      E.bl=hatBeta(gp,0,0);
      E.rl=text(svg,0,0,'r','nf-vlab nf-halo l6-rl');
      E.h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point',
        'aria-label':'The null r = (r₂, r₃). Arrow keys move it by 0.01, with Shift by 0.1; Home puts it at (0, 0).',
        'aria-valuemin':LO[0],'aria-valuemax':HI[0]},svg);
      S('circle',{r:18,'class':'nf-hit'},E.h);
      S('circle',{r:11,'class':'nf-ring'},E.h);
      S('circle',{r:5.5,'class':'nf-knob l6-knob'},E.h);
      E.h.addEventListener('keydown',function(e){
        var k2=e.key, d=e.shiftKey?0.1:0.01, a=r[0], b=r[1];
        if(k2==='ArrowRight') a+=d; else if(k2==='ArrowLeft') a-=d;
        else if(k2==='ArrowUp') b+=d; else if(k2==='ArrowDown') b-=d;
        else if(k2==='Home'){ a=0; b=0; }
        else return;
        e.preventDefault(); setR(a,b,true);
      });
      update();
    }
    function update(){
      var t2=(B[0]-r[0])/SE[0], t3=(B[1]-r[1])/SE[1], q=1-rho*rho, v=(t2*t2-2*rho*t2*t3+t3*t3)/(2*q),
          j2=Math.abs(t2)>CT, j3=Math.abs(t3)>CT, jf=v>CF, nt=(j2?1:0)+(j3?1:0), c=Math.sqrt(2*CF), sq=Math.sqrt(q),
          p=[], k, th, a, ed, reg, hx, hy, lx, ly, msg;
      /* the ellipse {r : v ≤ CF}: t = √(2 CF) L w with L L′ the correlation matrix and w on the unit circle; r = β̂ + D t */
      for(k=0;k<144;k++){ th=k/144*2*Math.PI; a=Math.cos(th); p.push([xs(B[0]+SE[0]*c*a),ys(B[1]+SE[1]*c*(rho*a+sq*Math.sin(th)))]); }
      ed=poly(p)+'Z';
      E.ce.el.setAttribute('d',ed); E.inn.setAttribute('d',ed); E.ell.setAttribute('d',ed);
      E.jo.setAttribute('d',E.rectD+ed); E.to.setAttribute('d',E.rectD+ed);
      reg=jf?(nt?'both':'jointonly'):(nt?'tonly':'none');
      hx=xs(r[0]); hy=ys(r[1]);
      E.h.setAttribute('transform','translate('+R(hx)+','+R(hy)+')');
      /* the r label sits up and right of the knob, and flips at the frame */
      lx=hx+11; ly=hy-10;
      if(lx>x1-12){ lx=hx-11; E.rl.setAttribute('text-anchor','end'); } else E.rl.setAttribute('text-anchor','start');
      if(ly<top+12) ly=hy+19;
      E.rl.setAttribute('x',R(lx)); E.rl.setAttribute('y',R(ly));
      /* the β̂ label sits along the long axis of the ellipse, so it stays inside: down right for rho < 0, up right for rho > 0 */
      E.bl.setAttribute('transform','translate('+R(xs(B[0])+7)+','+R(ys(B[1])+(rho>0?-7:16))+')');
      E.bl.setAttribute('class',Math.hypot(hx-xs(B[0]),hy-ys(B[1]))<26?'nf-hide':'');
      st={r2:rd(r[0],2), r3:rd(r[1],2), rho:rd(rho,2), t2:rd(t2,2), t3:rd(t3,2), v:rd(v,2),
        pt2:rd(tTail2(t2,DF),3), pt3:rd(tTail2(t3,DF),3), pf:rd(fSf(v,2,DF),3), rejt2:j2, rejt3:j3, rejf:jf, region:reg, moves:moves};
      msg=reg==='none'?'inside the ellipse and the box: no test rejects':
        reg==='both'?'outside the ellipse and the box: the F test and '+(nt===2?'both t tests':'one t test')+' reject':
        reg==='jointonly'?'inside the box, outside the ellipse: the F test rejects, neither t test does':
        'inside the ellipse, outside the box: '+(nt===2?'both t tests reject':'a t test rejects')+', the F test does not';
      E.h.setAttribute('aria-valuenow',st.r2);
      E.h.setAttribute('aria-valuetext','r = ('+fmt(r[0],2)+', '+fmt(r[1],2)+'), t₂ = '+fmt(t2,2)+', t₃ = '+fmt(t3,2)+', v = '+v.toFixed(2)+': '+msg);
      if(out){
        /* no break inside a pair like t₂ = 1.68 or t₂ no (p = 0.103) when the readout wraps */
        out.textContent=kv('r','('+fmt(r[0],2)+',\u00a0'+fmt(r[1],2)+')')+'   '+kv('t₂',fmt(t2,2))+'   '+kv('t₃',fmt(t3,2))+'   '+kv('v',v.toFixed(2))+
          '\nreject at 5%?  '+yn('t₂',j2,st.pt2)+'   '+yn('t₃',j3,st.pt3)+'   '+yn('F',jf,st.pf)+'\n';
        if(reg==='jointonly') note(out,msg,'l6-wj');
        else if(reg==='tonly') note(out,msg,'l6-wt');
        else out.appendChild(document.createTextNode(msg));
      }
      if(api) api.changed();
    }
    function setR(a,b,user){
      var n=[clamp(rd(a,2),LO[0],HI[0]),clamp(rd(b,2),LO[1],HI[1])];
      if(n[0]===r[0] && n[1]===r[1]) return;
      r=n; if(user) moves++;
      update();
    }
    function near(p){ return Math.hypot(xs(r[0])-p[0],ys(r[1])-p[1])<24; }
    /* drag the knob; a mouse click in the plane also moves r there. A touch away from the knob scrolls the page. */
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H), on=near(p);
      if(!on && (e.pointerType==='touch' || p[0]<x0 || p[0]>x1 || p[1]<top || p[1]>bot)) return;
      drag=true; grab=on?[xs(r[0])-p[0],ys(r[1])-p[1]]:[0,0];
      e.preventDefault(); capture(svg,e);
      try{ E.h.focus({preventScroll:true,focusVisible:false}); }catch(err){}
      svg.classList.add('is-drag');
      if(!on) setR(xs.inv(p[0]),ys.inv(p[1]),true);
    });
    svg.addEventListener('pointermove',function(e){
      if(!drag) return;
      var p=local(svg,e,W,H);
      setR(xs.inv(p[0]+grab[0]),ys.inv(p[1]+grab[1]),true);
    });
    function stop(){ drag=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      if(near(local(svg,e.touches[0],W,H))) e.preventDefault();
    },{passive:false});
    /* Try it. get: r2 r3 (the null, to 0.01), rho, t2 t3 v (to 0.01), pt2 pt3 pf (their p values, to 0.001),
       rejt2 rejt3 rejf (true when that 5% test rejects), region (none, jointonly, tonly, both), moves (drags and key presses of r).
       set: rho, r2, r3 */
    api=NF.api({
      get:function(){ var o={}, q; for(q in st) o[q]=st[q]; return o; },
      set:function(o){
        if('rho' in o && rr) rr.set(+o.rho);
        if('r2' in o || 'r3' in o) setR('r2' in o?+o.r2:r[0],'r3' in o?+o.r3:r[1],false);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. R squared and adjusted R squared as noise regressors are added ---------- */
  NF.register('l6-r2',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* y = 1 + 0.6x + u with x and u standard normal, then regressors z1, z2, ... of pure noise. The draws fill row by row,
       so a larger N keeps the first observations and adds new ones. */
    var NMAX=100, KZ=NMAX-3, BETA=0.6, SEED=20261106, seed=SEED, X=new Float64Array(NMAX), Y=new Float64Array(NMAX), Z=new Float64Array(NMAX*KZ);
    var N=30, k=3, P=new Float64Array(NMAX), A=new Float64Array(NMAX), api=null, st={}, pk=1;
    var W=520, H=300, mL=40, mR=14, top=40, bot=260, xs, ys, E={};
    function gauss(rnd){ var a=1-rnd(), b=rnd(); return Math.sqrt(-2*Math.log(a))*Math.cos(6.283185307179586*b); }
    function gen(){
      var rnd=mulberry32(seed), i, j;
      for(i=0;i<NMAX;i++){
        X[i]=gauss(rnd); Y[i]=1+BETA*X[i]+gauss(rnd);
        for(j=0;j<KZ;j++) Z[i*KZ+j]=gauss(rnd);
      }
    }
    /* R² of the nested regressions on the first N rows for K = 1, ..., N − 1 (intercept, x, z1, z2, ...), by Gram Schmidt
       (two passes): each new orthonormal direction q adds (q′y)² to the explained sum of squares, so R² never falls */
    function fit(){
      var Q=[], q, col, i, j, K, s, pass, yb=0, tss=0, ess=0;
      for(i=0;i<N;i++) yb+=Y[i];
      yb/=N;
      for(i=0;i<N;i++) tss+=(Y[i]-yb)*(Y[i]-yb);
      q=new Float64Array(N);
      for(i=0;i<N;i++) q[i]=1/Math.sqrt(N);
      Q.push(q); P[1]=0; A[1]=0;
      for(K=2;K<N;K++){
        col=new Float64Array(N);
        for(i=0;i<N;i++) col[i]=K===2?X[i]:Z[i*KZ+K-3];
        for(pass=0;pass<2;pass++) for(j=0;j<Q.length;j++){
          q=Q[j]; s=0;
          for(i=0;i<N;i++) s+=q[i]*col[i];
          for(i=0;i<N;i++) col[i]-=s*q[i];
        }
        s=0; for(i=0;i<N;i++) s+=col[i]*col[i];
        s=Math.sqrt(s); for(i=0;i<N;i++) col[i]/=s;
        s=0; for(i=0;i<N;i++) s+=col[i]*Y[i];
        ess+=s*s;
        P[K]=ess/tss; A[K]=1-(N-1)*(1-P[K])/(N-K);
        Q.push(col);
      }
    }
    /* k has its own slider code: its maximum N − 3 moves with N */
    var ki=fig.querySelector('input[data-k="k"]'), kval=ki?ki.parentNode.querySelector('.nfig-val'):null;
    function syncK(){
      if(!ki) return;
      ki.max=String(N-3); ki.value=String(k);
      ki.style.setProperty('--p',(k/(N-3)*100).toFixed(1)+'%');
      if(kval) kval.textContent=String(k);
    }
    if(ki){
      k=clamp(Math.round(+ki.value),0,N-3);
      ki.addEventListener('input',function(){ k=clamp(Math.round(+ki.value),0,N-3); syncK(); update(); });
    }
    var rn=range(fig,'n',0,function(v){ N=Math.round(v); k=Math.min(k,N-3); syncK(); fit(); draw(); });
    if(rn) N=Math.round(rn.v());
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; gen(); fit(); draw(); });
    function draw(){
      var g, gp, rows, lo, K, xt=[], s, yt, mn=0, sp, t, ttl, lim, i, p1=[], p2=[];
      W=measure(svg); frame(svg,W,400);
      rows=key(S('g',null,svg),[['line','l6-r2c','R²'],['line','l6-adjc','adjusted R²'],['line','l6-rr','R² of intercept and x'],['line','l6-gap','gain from the noise']],mL,12,W-mR);
      top=12+16*(rows-1)+30; bot=top+(W>=480?220:200); H=bot+28;
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      /* the y axis reaches down to the lowest adjusted R² of this sample, but never below −1 */
      for(K=2;K<N;K++) mn=Math.min(mn,A[K]);
      lo=Math.max(-1,Math.min(-0.25,Math.floor(mn*4)/4));
      xs=lin(1,N-1,mL+6,W-mR-6); ys=lin(lo,1,bot,top);
      g=S('g',null,svg);
      yt=ticks(lo,1,lo<-0.5 && bot-top<210?0.5:0.25);
      yGrid(g,ys,yt,mL,W-mR);
      line(g,mL,C(ys(1)),W-mR,C(ys(1)),'nf-one');
      text(g,mL-7,top-10,'R²','nf-title','end');
      /* K ticks at round steps, plus K = 1 when there is room */
      sp=(W-mL-mR-12)/(N-2);
      s=[1,2,5,10,20,25,50].filter(function(v){ return v*sp>=30; })[0]||50;
      if(s>=5) xt.push(1);
      for(K=s;K<N;K+=s) xt.push(K);
      ttl=text(g,W-3,bot+17,'K','nf-title','end'); lim=W-3-tw(ttl,'K')-10;
      for(i=0;i<xt.length;i++){
        line(g,C(xs(xt[i])),bot,C(xs(xt[i])),bot+4,'nf-ax');
        t=text(g,xs(xt[i]),bot+17,tl(xt[i]),null,'middle');
        if(xs(xt[i])+tw(t,t.textContent)/2>lim) g.removeChild(t);
      }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      gp=clip(svg,mL,top-6,W-mR-mL,bot-top+6);
      E.guide=line(gp,0,top,0,bot,'nf-guide');
      E.rr=line(gp,0,0,0,0,'l6-rr');
      for(K=1;K<N;K++){ p1.push([xs(K),ys(P[K])]); p2.push([xs(K),ys(Math.max(A[K],lo-1))]); }
      S('path',{d:poly(p2),'class':'l6-adjc'},gp);
      S('path',{d:poly(p1),'class':'l6-r2c'},gp);
      /* a dot per regression when they have room */
      if(sp>=7) for(K=1;K<N;K++){
        S('circle',{cx:R(xs(K)),cy:R(ys(Math.max(A[K],lo-1))),r:2,'class':'l6-pt2'},gp);
        S('circle',{cx:R(xs(K)),cy:R(ys(P[K])),r:2,'class':'l6-pt1'},gp);
      }
      E.gap=S('path',{'class':'l6-gap'},gp);
      E.m2=S('circle',{r:4.5,'class':'l6-mk2'},gp);
      E.m1=S('circle',{r:4.5,'class':'l6-mk1'},gp);
      update();
    }
    function stats(){
      var K=k+2, df=N-K, r2=P[K], o={n:N, k:k, kk:K, r2:rd(r2,3), r2adj:rd(A[K],3), r2r:rd(P[2],3), f:'none', p:'none', fg:0, pg:0, df:df, sample:seed-SEED}, f, fg;
      pk=1;
      if(k>0){ f=df/k*(r2-P[2])/(1-r2); pk=fSf(f,k,df); o.f=rd(f,2); o.p=rd(pk,3); }
      fg=df/(K-1)*r2/(1-r2); o.fg=rd(fg,2); o.pg=rd(fSf(fg,K-1,df),3);
      return o;
    }
    function update(){
      var K=k+2, x=xs(K), gx=x+10<W-mR-4?x+10:x-10, yR=ys(P[2]), yU=ys(P[K]);
      setLine(E.guide,C(x),top,C(x),bot);
      /* the restricted R² runs from K = 2 to a bracket beside the markers: the bracket is the gain R²_UR − R²_R */
      setLine(E.rr,xs(2),yR,gx+(gx>x?4:-4),yR);
      E.gap.setAttribute('d','M'+R(gx-4)+','+R(yR)+'H'+R(gx+4)+'M'+R(gx)+','+R(yR)+'V'+R(yU)+'M'+R(gx-4)+','+R(yU)+'H'+R(gx+4));
      E.gap.setAttribute('class',k?'l6-gap':'l6-gap nf-hide');
      E.rr.setAttribute('class',k?'l6-rr':'l6-rr nf-hide');
      at(E.m1,x,ys(P[K])); at(E.m2,x,ys(A[K]));
      st=stats();
      if(out){
        out.textContent=kv('N',N)+'   '+kv('K',K)+' (intercept, x'+(k?' and '+k+' noise':'')+')   '+kv('R²',P[K].toFixed(3))+'   adjusted '+kv('R²',fmt(A[K],3))+'\n';
        if(k){
          out.appendChild(document.createTextNode('F test of the '+k+' noise coefficient'+(k>1?'s':'')+': '+kv('v',st.f.toFixed(2))+'\u00a0~\u00a0F('+k+',\u00a0'+st.df+'), '+kv('p',st.p.toFixed(3))));
          if(pk<0.05) note(out,', rejects at 5%: a Type I error','nf-warn');
        } else out.appendChild(document.createTextNode('k = 0: no noise coefficients to test'));
        out.appendChild(document.createTextNode('\nglobal significance: '+kv('v',st.fg.toFixed(2))+'\u00a0~\u00a0F('+(K-1)+',\u00a0'+st.df+'), '+kv('p',st.pg.toFixed(3))));
      }
      if(api) api.changed();
    }
    /* Try it. get: n, k (noise regressors), kk (K = k + 2), df (N − K), r2 r2adj r2r (R², adjusted R², R² of intercept and x, to 0.001),
       f p (F statistic of the k noise coefficients to 0.01 and its p value to 0.001; 'none' when k = 0), fg pg (global significance F and p),
       sample (New sample presses, 0 for the first draws). set: sample, n, k */
    api=NF.api({
      get:function(){ var o={}, q; for(q in st) o[q]=st[q]; return o; },
      set:function(o){
        var s2;
        if('sample' in o){ s2=SEED+Math.max(0,Math.round(+o.sample)||0); if(s2!==seed){ seed=s2; gen(); fit(); draw(); } }
        if('n' in o && rn) rn.set(+o.n);
        if('k' in o){ k=clamp(Math.round(+o.k),0,N-3); syncK(); update(); }
      }
    });
    gen(); fit(); syncK(); draw();
    watch(svg,draw);
    return api;
  });

  /* notes.js may have booted before this file loaded; start any L6 figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
