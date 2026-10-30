/* rackebrandt.pe lecture note figures. Draws every [data-nfig] figure on the page. No third party code. */
(function(){
  'use strict';
  var NS='http://www.w3.org/2000/svg', MINUS='−', clipN=0;
  var reduce=!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- helpers ---------- */
  function S(tag,a,parent){
    var e=document.createElementNS(NS,tag), k;
    if(a) for(k in a) if(Object.prototype.hasOwnProperty.call(a,k)) e.setAttribute(k,a[k]);
    if(parent) parent.appendChild(e);
    return e;
  }
  function R(v){ return Math.round(v*10)/10; }
  function C(v){ return Math.round(v)+0.5; }                 /* crisp 1px line */
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  function text(g,x,y,s,cls,anchor){
    var e=S('text',{x:R(x),y:R(y)},g);
    if(cls) e.setAttribute('class',cls);
    if(anchor) e.setAttribute('text-anchor',anchor);
    e.textContent=s;
    return e;
  }
  function line(g,x1,y1,x2,y2,cls){ return S('line',{x1:R(x1),y1:R(y1),x2:R(x2),y2:R(y2),'class':cls},g); }
  function setLine(e,x1,y1,x2,y2){ e.setAttribute('x1',R(x1)); e.setAttribute('y1',R(y1)); e.setAttribute('x2',R(x2)); e.setAttribute('y2',R(y2)); }
  function at(e,x,y){ e.setAttribute('cx',R(x)); e.setAttribute('cy',R(y)); }
  function poly(p){ var s='', i; for(i=0;i<p.length;i++) s+=(i?'L':'M')+R(p[i][0])+','+R(p[i][1]); return s; }
  function fmt(v,d){ var s=Math.abs(v).toFixed(d); return (v<0 && parseFloat(s)!==0?MINUS:'')+s; }
  function tl(v){ var s=String(Math.round(v*1000)/1000); return s.charAt(0)==='-'?MINUS+s.slice(1):s; }
  function lin(d0,d1,r0,r1){
    var k=(r1-r0)/(d1-d0);
    function f(v){ return r0+(v-d0)*k; }
    f.inv=function(p){ return d0+(p-r0)/k; };
    return f;
  }
  function measure(svg){ var w=svg.getBoundingClientRect().width; return w>10?clamp(Math.round(w),260,760):520; }
  function frame(svg,W,H){ svg.setAttribute('viewBox','0 0 '+W+' '+H); while(svg.firstChild) svg.removeChild(svg.firstChild); }
  /* redraw when the figure's width changes, debounced */
  function watch(svg,redraw){
    var last=measure(svg), t=0;
    function check(){ var w=measure(svg); if(w!==last){ last=w; redraw(); } }
    function soon(){ clearTimeout(t); t=setTimeout(check,90); }
    if(window.ResizeObserver) new ResizeObserver(soon).observe(svg);
    else window.addEventListener('resize',soon);
  }
  /* y grid with tick labels; the zero line is a little stronger */
  function yGrid(g,ys,ticks,x0,x1){
    for(var i=0;i<ticks.length;i++){
      var v=ticks[i], y=C(ys(v));
      line(g,x0,y,x1,y,v===0?'nf-ax':'nf-grid');
      text(g,x0-7,ys(v)+4,tl(v),null,'end');
    }
  }
  function xGrid(g,xs,ticks,y0,y1,labelY){
    for(var i=0;i<ticks.length;i++){
      var v=ticks[i], x=C(xs(v));
      line(g,x,y0,x,y1,v===0?'nf-zero':'nf-grid');
      text(g,xs(v),labelY,tl(v),null,'middle');
    }
  }
  /* segmented buttons: one aria-pressed at a time */
  function seg(fig,attr,cb){
    var bs=fig.querySelectorAll('.nfig-opt['+attr+']'), cur=null, i;
    function pick(v){ for(var j=0;j<bs.length;j++) bs[j].setAttribute('aria-pressed',bs[j].getAttribute(attr)===v?'true':'false'); }
    function click(){ var v=this.getAttribute(attr); pick(v); cb(v); }
    for(i=0;i<bs.length;i++){
      if(bs[i].getAttribute('aria-pressed')==='true') cur=bs[i].getAttribute(attr);
      bs[i].addEventListener('click',click);
    }
    if(!cur && bs.length){ cur=bs[0].getAttribute(attr); pick(cur); }
    return cur;
  }
  /* range input: keeps the value label and the filled track in step */
  function range(fig,key,dec,cb){
    var inp=fig.querySelector('input[data-k="'+key+'"]');
    if(!inp) return null;
    var wrap=inp.parentNode, val=wrap.querySelector('.nfig-val'), lo=parseFloat(inp.min), hi=parseFloat(inp.max);
    function sync(){
      var v=parseFloat(inp.value);
      inp.style.setProperty('--p',((v-lo)/(hi-lo)*100).toFixed(1)+'%');
      if(val) val.textContent=fmt(v,dec);
      return v;
    }
    inp.addEventListener('input',function(){ cb(sync()); });
    sync();
    return {el:inp, wrap:wrap, v:function(){ return parseFloat(inp.value); }};
  }

  /* ---------- distributions ---------- */
  function phi(x){ return Math.exp(-0.5*x*x)/2.5066282746310002; }
  /* standard normal CDF, Hart (1968) as given by West (2005); double precision accuracy */
  function Phi(x){
    var z=Math.abs(x), c=0, e, n, d, b;
    if(z<=37){
      e=Math.exp(-z*z/2);
      if(z<7.07106781186547){
        n=((((((0.0352624965998911*z+0.700383064443688)*z+6.37396220353165)*z+33.912866078383)*z+112.079291497871)*z+221.213596169931)*z+220.206867912376);
        d=(((((((0.0883883476483184*z+1.75566716318264)*z+16.064177579207)*z+86.7807322029461)*z+296.564248779674)*z+637.333633378831)*z+793.826512519948)*z+440.413735824752);
        c=e*n/d;
      } else {
        b=z+0.65; b=z+4/b; b=z+3/b; b=z+2/b; b=z+1/b;
        c=e/b/2.506628274631;
      }
    }
    return x>0?1-c:c;
  }
  /* inverse normal CDF (Acklam), relative error below 1.2e-9 */
  function invPhi(p){
    var a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
    var b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
    var c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
    var d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
    var q, r;
    if(p<0.02425){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if(p>0.97575){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q=p-0.5; r=q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  function mulberry32(a){
    return function(){
      a=(a+0x6D2B79F5)|0;
      var t=Math.imul(a^(a>>>15),1|a);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  /* ---------- 1. CDF over density ---------- */
  function initCdf(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    function samples(f,lo,hi,n){ var a=[], i, x; for(i=0;i<=n;i++){ x=lo+(hi-lo)*i/n; a.push([x,f(x)]); } return a; }
    var D={
      bern:{lo:-1,hi:2,x0:0,step:0.25,top:1,ft:[0,0.5,1],xt:[-1,0,1,2],atoms:[0,1],mass:[0.7,0.3],
        F:function(x){ return x<0?0:x<1?0.7:1; },
        p:function(x){ return x===0?0.7:x===1?0.3:0; }},
      unif:{lo:-0.5,hi:1.5,x0:0.5,step:0.05,top:1.25,ft:[0,0.5,1],xt:[-0.5,0,0.5,1,1.5],
        F:function(x){ return clamp(x,0,1); },
        f:function(x){ return x<0||x>1?0:1; },
        pts:function(){ return [[-0.5,0],[0,0],[0,1],[1,1],[1,0],[1.5,0]]; }},
      norm:{lo:-4,hi:4,x0:0.5,step:0.1,top:0.5,ft:[0,0.2,0.4],xt:[-4,-2,0,2,4],F:Phi,f:phi,
        pts:function(){ return samples(phi,-4,4,200); }},
      expo:{lo:-1,hi:5,x0:1,step:0.1,top:1.25,ft:[0,0.5,1],xt:[-1,0,1,2,3,4,5],
        F:function(x){ return x<0?0:1-Math.exp(-x); },
        f:function(x){ return x<0?0:Math.exp(-x); },
        pts:function(){ return [[-1,0],[0,0]].concat(samples(function(x){ return Math.exp(-x); },0,5,150)); }}
    };
    var H=262, mL=36, mR=28, tF=22, bF=112, tf=148, bf=236;
    var W=520, xs, yF, yf, el={}, drag=false;
    var key=seg(fig,'data-dist',function(v){ if(!D[v]||v===key) return; key=v; gx=D[v].x0; draw(); });
    if(!D[key]) key='norm';
    var gx=D[key].x0;

    function draw(){
      var d=D[key], i, g, a, m, gs;
      W=measure(svg); frame(svg,W,H);
      xs=lin(d.lo,d.hi,mL,W-mR); yF=lin(0,1.1,bF,tF); yf=lin(0,d.top*1.1,bf,tf);
      g=S('g',null,svg);
      for(i=0;i<d.xt.length;i++){
        a=C(xs(d.xt[i]));
        line(g,a,tF,a,bF,'nf-grid'); line(g,a,tf,a,bf,'nf-grid'); line(g,a,bf,a,bf+4,'nf-ax');
        text(g,xs(d.xt[i]),bf+17,tl(d.xt[i]),null,'middle');
      }
      yGrid(g,yF,[0,0.5,1],mL,W-mR);
      yGrid(g,yf,d.ft,mL,W-mR);
      text(g,mL-7,12,'F(x)','nf-title','end');
      text(g,mL-7,tf-11,d.p?'p(x)':'f(x)','nf-title','end');
      text(g,W-3,bf+17,'x','nf-title','end');
      el.area=null; el.stems=[]; el.df=null;
      if(d.p){
        gs=S('g',null,svg);
        line(gs,xs(0),yF(0),xs(0),yF(0.7),'nf-jump');
        line(gs,xs(1),yF(0.7),xs(1),yF(1),'nf-jump');
        line(gs,xs(d.lo),yF(0),xs(0),yF(0),'nf-line nf-flat');
        line(gs,xs(0),yF(0.7),xs(1),yF(0.7),'nf-line nf-flat');
        line(gs,xs(1),yF(1),xs(d.hi),yF(1),'nf-line nf-flat');
        S('circle',{cx:R(xs(0)),cy:R(yF(0)),r:4,'class':'nf-open'},gs);
        S('circle',{cx:R(xs(1)),cy:R(yF(0.7)),r:4,'class':'nf-open'},gs);
        S('circle',{cx:R(xs(0)),cy:R(yF(0.7)),r:4,'class':'nf-dot'},gs);
        S('circle',{cx:R(xs(1)),cy:R(yF(1)),r:4,'class':'nf-dot'},gs);
        for(i=0;i<d.atoms.length;i++){
          a=d.atoms[i]; m=d.mass[i];
          gs=S('g',{'class':'nf-stem'},svg);
          line(gs,xs(a),yf(0),xs(a),yf(m),'nf-line nf-flat');
          S('circle',{cx:R(xs(a)),cy:R(yf(m)),r:4,'class':'nf-dot'},gs);
          text(gs,xs(a)+9,yf(m)+4,tl(m),'nf-lab');
          el.stems.push(gs);
        }
      } else {
        el.area=S('path',{'class':'nf-area'},svg);
        S('path',{d:poly(samples(d.F,d.lo,d.hi,240).map(function(p){ return [xs(p[0]),yF(p[1])]; })),'class':'nf-line'},svg);
        el.fp=d.pts();
        S('path',{d:poly(el.fp.map(function(p){ return [xs(p[0]),yf(p[1])]; })),'class':'nf-line'},svg);
      }
      el.h=line(svg,0,0,0,0,'nf-hread');
      el.g1=line(svg,0,0,0,0,'nf-guide');
      el.g2=line(svg,0,0,0,0,'nf-guide');
      el.dF=S('circle',{r:4.5,'class':'nf-dot'},svg);
      if(!d.p) el.df=S('circle',{r:4,'class':'nf-dot'},svg);
      svg.setAttribute('aria-valuemin',d.lo);
      svg.setAttribute('aria-valuemax',d.hi);
      update();
    }
    function update(){
      var d=D[key], x=gx, px=xs(x), F=d.F(x), v, i, a;
      setLine(el.g1,px,tF,px,bF); setLine(el.g2,px,tf,px,bf);
      setLine(el.h,mL,yF(F),px,yF(F));
      at(el.dF,px,yF(F));
      if(d.p){
        v=d.p(x);
        for(i=0;i<el.stems.length;i++) el.stems[i].setAttribute('class',d.atoms[i]<=x?'nf-stem':'nf-stem nf-off');
      } else {
        v=d.f(x);
        a=[[xs(d.lo),yf(0)]];
        for(i=0;i<el.fp.length && el.fp[i][0]<x;i++) a.push([xs(el.fp[i][0]),yf(el.fp[i][1])]);
        a.push([px,yf(d.f(x-1e-9))],[px,yf(0)]);
        el.area.setAttribute('d',poly(a)+'Z');
        at(el.df,px,yf(v));
      }
      var s='x = '+fmt(x,2)+'   F(x) = '+fmt(F,2)+'   '+(d.p?'p(x)':'f(x)')+' = '+fmt(v,2);
      if(out) out.textContent=s;
      svg.setAttribute('aria-valuenow',+x.toFixed(2));
      svg.setAttribute('aria-valuetext',s.replace(/ {3}/g,', '));
    }
    function fromPointer(e){
      var d=D[key], r=svg.getBoundingClientRect(), x, i;
      x=xs.inv((e.clientX-r.left)*W/(r.width||W));
      x=Math.round(clamp(x,d.lo,d.hi)*100)/100;
      if(d.atoms) for(i=0;i<d.atoms.length;i++) if(Math.abs(xs(x)-xs(d.atoms[i]))<6) x=d.atoms[i];
      gx=x; update();
    }
    svg.addEventListener('pointerdown',function(e){
      drag=true;
      if(svg.setPointerCapture){ try{ svg.setPointerCapture(e.pointerId); }catch(err){} }
      fromPointer(e);
    });
    svg.addEventListener('pointermove',function(e){ if(drag || e.pointerType==='mouse') fromPointer(e); });
    function stop(){ drag=false; }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('keydown',function(e){
      var d=D[key], s=d.step, x=gx, k=e.key;
      if(k==='ArrowRight'||k==='ArrowUp') x+=s;
      else if(k==='ArrowLeft'||k==='ArrowDown') x-=s;
      else if(k==='PageUp') x+=5*s;
      else if(k==='PageDown') x-=5*s;
      else if(k==='Home') x=d.lo;
      else if(k==='End') x=d.hi;
      else return;
      e.preventDefault();
      x=clamp(Math.round(x/s)*s,d.lo,d.hi);
      gx=+x.toFixed(6); update();
    });
    draw();
    watch(svg,draw);
  }

  /* ---------- 2. Normal density ---------- */
  function initNormal(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var H=250, mL=36, mR=28, top=18, bot=220, W=520, xs, ys, el={};
    var mu=0, sd=1;
    var rm=range(fig,'mu',1,function(v){ mu=v; update(); });
    var rs=range(fig,'sd',2,function(v){ sd=v; update(); });
    if(rm) mu=rm.v();
    if(rs) sd=rs.v();
    function draw(){
      var g, t=[], v, step;
      W=measure(svg); frame(svg,W,H);
      xs=lin(-5,5,mL,W-mR); ys=lin(0,1.4,bot,top);
      step=(W-mL-mR)>=360?1:2;
      for(v=(step===1?-5:-4);v<=5;v+=step) t.push(v);
      g=S('g',null,svg);
      xGrid(g,xs,t,top,bot,bot+17);
      for(v=0;v<t.length;v++) line(g,C(xs(t[v])),bot,C(xs(t[v])),bot+4,'nf-ax');
      yGrid(g,ys,[0,0.5],mL,W-mR);
      el.one=line(g,mL,C(ys(1)),W-mR,C(ys(1)),'nf-one');
      el.oneLab=text(g,mL-7,ys(1)+4,'1',null,'end');
      text(g,mL-7,11,'f(x)','nf-title','end');
      text(g,W-3,bot+17,'x','nf-title','end');
      el.area=S('path',{'class':'nf-area'},svg);
      el.curve=S('path',{'class':'nf-line'},svg);
      el.lab=text(svg,0,0,'68.3%','nf-lab','middle');
      update();
    }
    function dens(x){ return phi((x-mu)/sd)/sd; }
    function update(){
      var pk=phi(0)/sd, p=[], a=[], i, x, lo=mu-sd, hi=mu+sd, over, wpx, hpx, sp;
      for(i=0;i<=300;i++){ x=-5+10*i/300; p.push([xs(x),ys(dens(x))]); }
      el.curve.setAttribute('d',poly(p));
      a.push([xs(lo),ys(0)]);
      for(i=0;i<=60;i++){ x=lo+(hi-lo)*i/60; a.push([xs(x),ys(dens(x))]); }
      a.push([xs(hi),ys(0)]);
      el.area.setAttribute('d',poly(a)+'Z');
      wpx=xs(hi)-xs(lo); hpx=ys(0)-ys(pk);
      el.lab.setAttribute('x',R(xs(mu)));
      el.lab.setAttribute('y',R(wpx>=48 && hpx>=26 ? bot-Math.max(8,hpx*0.3) : ys(pk)-9));
      over=Math.round(pk*100)>100;
      el.one.setAttribute('class',over?'nf-one nf-hot':'nf-one');
      el.oneLab.setAttribute('class',over?'nf-hot':'');
      if(!out) return;
      out.textContent='μ = '+fmt(mu,1)+'   σ = '+fmt(sd,2)+'   peak = '+pk.toFixed(2);
      if(over){ sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=', above 1: a density is not a probability'; out.appendChild(sp); }
    }
    draw();
    watch(svg,draw);
  }

  /* ---------- 3. Correlation is not dependence ---------- */
  function initCorr(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=300, seed=20261030, z1=[], z2=[], rho=0.6, cur=null, raf=0, clipId='nfclip'+(++clipN);
    var H=280, mL=36, mR=28, top=27, bot=250, W=520, xs, ys, el={};
    var Y={normal:{lo:-4,hi:4,t:[-4,-2,0,2,4]}, square:{lo:-2,hi:10,t:[-2,0,2,4,6,8,10]}};
    var rr=range(fig,'rho',2,function(v){ rho=v; place(false); });
    if(rr) rho=rr.v();
    var mode=seg(fig,'data-mode',function(v){ if(!Y[v]||v===mode) return; mode=v; lock(); draw(true); });
    if(!Y[mode]) mode='normal';
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; sample(); place(true); });
    function lock(){
      if(!rr) return;
      var off=mode!=='normal';
      rr.el.disabled=off;
      rr.wrap.setAttribute('class',off?'nfig-range is-off':'nfig-range');
    }
    function sample(){
      var rnd=mulberry32(seed), i, u, t, rad;
      for(i=0;i<N;i++){
        u=1-rnd(); t=2*Math.PI*rnd(); rad=Math.sqrt(-2*Math.log(u));
        z1[i]=rad*Math.cos(t); z2[i]=rad*Math.sin(t);
      }
    }
    function data(){
      var P=[], i, c=Math.sqrt(1-rho*rho);
      for(i=0;i<N;i++) P.push(mode==='normal'?[z1[i],rho*z1[i]+c*z2[i]]:[z1[i],z1[i]*z1[i]-1+0.3*z2[i]]);
      return P;
    }
    function draw(animate){
      var yr=Y[mode], g, i, rad, defs, cp;
      W=measure(svg); frame(svg,W,H);
      xs=lin(-4,4,mL,W-mR); ys=lin(yr.lo,yr.hi,bot,top);
      g=S('g',null,svg);
      xGrid(g,xs,[-4,-2,0,2,4],top,bot,bot+17);
      yGrid(g,ys,yr.t,mL,W-mR);
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      text(g,mL-7,11,'y','nf-title','end');
      text(g,W-3,bot+17,'x','nf-title','end');
      defs=S('defs',null,svg); cp=S('clipPath',{id:clipId},defs);
      S('rect',{x:mL-4,y:top-4,width:W-mR-mL+8,height:bot-top+8},cp);
      rad=W>=420?2.6:2.2;
      el.g=S('g',{'clip-path':'url(#'+clipId+')'},svg);
      el.pts=[];
      for(i=0;i<N;i++) el.pts.push(S('circle',{r:rad,'class':'nf-pt'},el.g));
      el.fit=line(el.g,0,0,0,0,'nf-fit');
      place(animate);
    }
    function apply(Q){ for(var i=0;i<N;i++) at(el.pts[i],Q[i][0],Q[i][1]); cur=Q; }
    function place(animate){
      var P=data(), Q=[], n=P.length, mx=0, my=0, sxx=0, syy=0, sxy=0, i, dx, dy, r, b, a, x0=-4, x1=4, lo=Y[mode].lo, hi=Y[mode].hi, xa, xb;
      for(i=0;i<n;i++){ mx+=P[i][0]; my+=P[i][1]; }
      mx/=n; my/=n;
      for(i=0;i<n;i++){ dx=P[i][0]-mx; dy=P[i][1]-my; sxx+=dx*dx; syy+=dy*dy; sxy+=dx*dy; Q.push([xs(P[i][0]),ys(P[i][1])]); }
      r=sxy/Math.sqrt(sxx*syy); b=sxy/sxx; a=my-b*mx;
      if(Math.abs(b)>1e-9){ xa=(lo-a)/b; xb=(hi-a)/b; x0=Math.max(x0,Math.min(xa,xb)); x1=Math.min(x1,Math.max(xa,xb)); }
      setLine(el.fit,xs(x0),ys(a+b*x0),xs(x1),ys(a+b*x1));
      if(out) out.textContent='r = '+fmt(r,2)+(mode==='normal'?'':', yet Y depends on X');
      cancelAnimationFrame(raf);
      if(!animate || reduce || !cur || cur.length!==N){ apply(Q); return; }
      var from=cur, t0=0;
      function step(ts){
        if(!t0) t0=ts;
        var k=Math.min(1,(ts-t0)/340), e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2, M=[], j;
        for(j=0;j<N;j++) M.push([from[j][0]+(Q[j][0]-from[j][0])*e, from[j][1]+(Q[j][1]-from[j][1])*e]);
        apply(M);
        if(k<1) raf=requestAnimationFrame(step);
      }
      raf=requestAnimationFrame(step);
    }
    sample(); lock(); draw(false);
    watch(svg,function(){ cur=null; draw(false); });
  }

  /* ---------- 4. Law of total variance ---------- */
  function initTotalVar(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var b=1, s=0.6, Q=[], J=[], i;
    for(i=0;i<15;i++){ Q.push(invPhi((i+0.5)/15)); J.push(((i*0.6180339887498949)%1)*2-1); }
    var mL=36, mR=40, top=18, bot=192, by=244, bh=12, W=520, H=288, ys, cx=[], jw=16, el={};
    var rb=range(fig,'b',2,function(v){ b=v; update(); });
    var rs=range(fig,'s',2,function(v){ s=v; update(); });
    if(rb) b=rb.v();
    if(rs) s=rs.v();
    function legend(g,x,y,cls,name,formula){
      S('rect',{x:R(x),y:R(y-9),width:10,height:10,'class':cls},g);
      var t=S('text',{x:R(x+16),y:R(y)},g), a=S('tspan',{'class':'nf-lab'},t), v;
      a.textContent=name;
      t.appendChild(document.createTextNode(' '+formula+' = '));
      v=S('tspan',{'class':'nf-lab'},t);
      return v;
    }
    function draw(){
      var g, k, pw, two;
      W=measure(svg); two=W<480; H=two?304:286; frame(svg,W,H);
      pw=W-mL-mR; ys=lin(-5,5,bot,top);
      jw=Math.min(18,pw*0.055);
      g=S('g',null,svg);
      yGrid(g,ys,[-4,-2,2,4],mL,W-mR);
      text(g,mL-7,ys(0)+4,'0',null,'end');
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      line(g,mL,C(ys(0)),W-mR,C(ys(0)),'nf-mean0');
      text(g,W-mR+6,ys(0)+4,'E[Y]','nf-lab');
      text(g,mL-7,11,'y','nf-title','end');
      el.dots=[]; el.means=[]; cx=[];
      for(k=0;k<3;k++){
        cx.push(mL+pw*(2*k+1)/6);
        text(g,cx[k],bot+17,'X = '+(k+1),null,'middle');
        var gd=S('g',null,svg), arr=[];
        for(i=0;i<15;i++) arr.push(S('circle',{r:W>=420?3.4:3,'class':'nf-dw'},gd));
        el.dots.push(arr);
        el.means.push(line(svg,0,0,0,0,'nf-mean'));
      }
      text(g,mL,by-8,'Var(Y)','nf-title');
      S('rect',{x:mL,y:by,width:R(pw),height:bh,'class':'nf-track'},svg);
      el.w=S('rect',{x:mL,y:by,height:bh,width:0,'class':'nf-w'},svg);
      el.b=S('rect',{x:mL,y:by,height:bh,width:0,'class':'nf-b'},svg);
      el.tot=text(svg,0,by+bh-2,'','nf-lab');
      g=S('g',null,svg);
      el.lw=legend(g,mL,by+bh+24,'nf-w','within','E[Var(Y|X)]');
      el.lb=two?legend(g,mL,by+bh+42,'nf-b','between','Var(E[Y|X])'):legend(g,mL+Math.max(210,pw*0.5),by+bh+24,'nf-b','between','Var(E[Y|X])');
      update();
    }
    function update(){
      var k, m, y, half=Math.min(28,(W-mL-mR)/6*0.34), wv=s*s, bv=2/3*b*b, kx=(W-mL-mR)/5, gap, w2, b2, tot;
      for(k=0;k<3;k++){
        m=b*(k-1);
        for(i=0;i<15;i++) at(el.dots[k][i],cx[k]+J[i]*jw,ys(m+s*Q[i]));
        y=ys(m); setLine(el.means[k],cx[k]-half,y,cx[k]+half,y);
      }
      gap=bv*kx>3?2:0;
      el.w.setAttribute('width',R(wv*kx));
      el.b.setAttribute('x',R(mL+wv*kx+gap));
      el.b.setAttribute('width',R(Math.max(0,bv*kx-gap)));
      w2=Math.round(wv*100)/100; b2=Math.round(bv*100)/100; tot=w2+b2;
      el.tot.setAttribute('x',R(mL+(wv+bv)*kx+6));
      el.tot.textContent=tot.toFixed(2);
      el.lw.textContent=w2.toFixed(2);
      el.lb.textContent=b2.toFixed(2);
      if(out) out.textContent='Var(Y) = '+tot.toFixed(2)+' = '+w2.toFixed(2)+' within + '+b2.toFixed(2)+' between   R² = '+(bv/(wv+bv)).toFixed(2);
    }
    draw();
    watch(svg,draw);
  }

  /* ---------- boot ---------- */
  var INIT={cdf:initCdf, normal:initNormal, corr:initCorr, totalvar:initTotalVar};
  function boot(){
    var figs=document.querySelectorAll('[data-nfig]'), i, f, fn;
    for(i=0;i<figs.length;i++){
      f=figs[i]; fn=INIT[f.getAttribute('data-nfig')];
      if(!fn || f.getAttribute('data-nfig-ready')) continue;
      f.setAttribute('data-nfig-ready','1');
      try{ fn(f); }catch(err){ if(window.console && console.error) console.error(err); }
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
