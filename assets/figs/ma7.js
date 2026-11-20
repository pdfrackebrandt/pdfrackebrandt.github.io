/* Core Macroeconomics L7 figures: the consumption CAPM in a two state economy, the CRRA log normal yield curve,
   Lucas tree prices when dividend growth is persistent, and the equity premium and risk free rate puzzles.
   Calibration: US 1889 to 1978, annual. Mean log consumption growth eta = 1.8%, s.d. s = 3.57%, beta = 0.97;
   data: T bill 0.80%, stocks 6.98% (s.d. 16.54%), premium 6.18% (s.d. 16.67%).
   Every number is computed in the browser from the closed forms in the note:
   - two states, growth eta - s or eta + s with probability 1/2: m = beta e^(-sigma g), R_f = 1/E m, an asset whose
     return is Rbar - v in the bust and Rbar + v in the boom has Rbar = R_f + v tanh(sigma s) (from E[m R] = 1);
   - yields with g_t = eta + z_t, z_t = rho z_(t-1) + eps_t, eps ~ N(0, s^2), and expected growth x above trend next
     year: ln R_j / j = -ln beta + sigma eta + sigma x a_j / j - sigma^2 s^2 B_j / (2j), a_j = (1 - rho^j)/(1 - rho),
     B_j = sum_(k<=j) a_k^2 (the conditional variance of j year growth over s^2);
   - Lucas tree with c = d: p/d = sum_j beta^j E_t[(d_(t+j)/d_t)^(1-sigma)]
     = sum_j beta^j exp((1-sigma)(j eta + rho a_j z_t) + (1-sigma)^2 s^2 B_j / 2);
   - the same tree with i.i.d. growth: ln E R_e - ln R_f = sigma s^2, ln R_f = -ln beta + sigma eta - sigma^2 s^2 / 2.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma7.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      clip=NF.clip, mulberry32=NF.mulberry32, invPhi=NF.invPhi, MINUS=NF.MINUS;

  /* ---------- calibration and data ---------- */
  var BETA=0.97, ETA=0.018, SC=0.0357;
  var RF_D=0.0080, RE_D=0.0698, SD_E=0.1654;
  var LRF_D=Math.log(1+RF_D), LP_D=Math.log((1+RE_D)/(1+RF_D)), SHARPE_D=0.0618/0.1667;

  /* ---------- shared drawing ---------- */
  function niceStep(span,n){ var raw=span/n, mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), r=raw/mag; return (r<1.5?1:r<2.25?2:r<3.5?2.5:r<7.5?5:10)*mag; }
  function ticksBy(lo,hi,st){ var out=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9*st;v+=st) out.push(Math.round(v/st)*st); return out; }
  /* a padded range with round ends and its ticks; minSpan keeps a nearly flat curve from filling the box */
  function niceRange(lo,hi,n,minSpan,pad){
    var mid, span, st;
    if(hi-lo<minSpan){ mid=(lo+hi)/2; lo=mid-minSpan/2; hi=mid+minSpan/2; }
    span=hi-lo; lo-=span*(pad||0.08); hi+=span*(pad||0.08);
    st=niceStep(hi-lo,n);
    lo=Math.floor(lo/st+1e-9)*st; hi=Math.ceil(hi/st-1e-9)*st;
    return {d:[lo,hi], t:ticksBy(lo,hi,st), st:st};
  }
  /* one plot box: grid, ticks, tick labels and axis names; sx and sy map data to the svg, gc is clipped to the box */
  function box(svg,b,xd,yd,o){
    var g=S('g',null,svg), sx=lin(xd[0],xd[1],b.x,b.x+b.w), sy=lin(yd[0],yd[1],b.y+b.h,b.y), i, v, f;
    for(i=0;i<o.xt.length;i++){
      v=o.xt[i]; f=C(sx(v));
      line(g,f,b.y,f,b.y+b.h,Math.abs(v)<1e-12&&o.zero?'nf-ax':'nf-grid');
      line(g,f,b.y+b.h,f,b.y+b.h+4,'nf-ax');
      text(g,sx(v),b.y+b.h+16,(o.xf||tl)(v),null,'middle');
    }
    for(i=0;i<o.yt.length;i++){
      v=o.yt[i]; f=C(sy(v));
      line(g,b.x,f,b.x+b.w,f,Math.abs(v)<1e-12&&o.zero?'nf-ax':'nf-grid');
      text(g,b.x-6,sy(v)+4,(o.yf||tl)(v),null,'end');
    }
    line(g,b.x,C(b.y+b.h),b.x+b.w,C(b.y+b.h),'nf-ax');
    line(g,C(b.x),b.y,C(b.x),b.y+b.h,'nf-ax');
    if(o.xl) text(g,b.x+b.w,b.y+b.h+31,o.xl,'nf-title','end');
    if(o.yl) text(g,b.x-36,b.y-11,o.yl,'nf-title');
    if(o.title) text(g,b.x+b.w,b.y-11,o.title,'nf-lab','end');
    return {sx:sx, sy:sy, b:b, xd:xd, yd:yd, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  /* two plot boxes, side by side when the figure is wide, otherwise one above the other */
  function two(W,ph){
    var L=44, Rm=12, T=30, B=40, gap=22, pw;
    if(W>=600){ pw=Math.floor((W-2*L-Rm-gap)/2); return {b1:{x:L,y:T,w:pw,h:ph}, b2:{x:2*L+pw+gap,y:T,w:pw,h:ph}, H:T+ph+B}; }
    pw=W-L-Rm;
    return {b1:{x:L,y:T,w:pw,h:ph}, b2:{x:L,y:2*T+ph+B,w:pw,h:ph}, H:2*(T+ph+B)};
  }
  function curve(P,pts){ var a=[], i; for(i=0;i<pts.length;i++) a.push([P.sx(pts[i][0]),P.sy(pts[i][1])]); return poly(a); }
  /* the closed region between an upper and a lower curve over the same x values */
  function band(P,top,bot){ var a=[], i; for(i=0;i<top.length;i++) a.push([P.sx(top[i][0]),P.sy(top[i][1])]); for(i=bot.length-1;i>=0;i--) a.push([P.sx(bot[i][0]),P.sy(bot[i][1])]); return poly(a)+'Z'; }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function cross(e,x,y){ e.setAttribute('d','M'+R(x-4)+','+R(y-4)+'L'+R(x+4)+','+R(y+4)+'M'+R(x-4)+','+R(y+4)+'L'+R(x+4)+','+R(y-4)); }
  function sg(v,d){ var s=fmt(v,d); return (v>0 && parseFloat(v.toFixed(d))!==0?'+':'')+s; }
  function pct(v,d){ return fmt(100*v,d)+'%'; }
  function pctTick(v){ return tl(v)+'%'; }
  function minmax(list){ var lo=Infinity, hi=-Infinity, i; for(i=0;i<list.length;i++){ if(list[i]<lo) lo=list[i]; if(list[i]>hi) hi=list[i]; } return [lo,hi]; }
  function swatch(g,x,y,cls,label){ S('rect',{x:R(x),y:R(y-9),width:10,height:10,'class':cls},g); return text(g,x+15,y,label,'nf-lab'); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }

  /* ---------- 1. The consumption CAPM in two states ---------- */
  /* Next year consumption grows by eta - s (bust) or eta + s (boom), each with probability 1/2, so log growth has mean
     eta and s.d. s. m = beta e^(-sigma g). An asset returns Rbar - v in the bust and Rbar + v in the boom; E[m R] = 1
     gives Rbar = R_f (1 + v (m_b - m_g)/2) = R_f + v tanh(sigma s), and the premium Rbar - R_f = -cov(m, R)/E m. */
  NF.register('ma7-ccapm',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var sig=2, sc=3.57, v=16.5, W=520, H=300, P1, P2, el={}, api, axKey='';
    var rsg=range(fig,'sigma',1,function(x){ sig=x; update(); }), rsc=range(fig,'s',2,function(x){ sc=x; update(); }), rv=range(fig,'v',1,function(x){ v=x; update(); });
    if(rsg) sig=rsg.v();
    if(rsc) sc=rsc.v();
    if(rv) v=rv.v();
    function state(){
      var s=sc/100, gb=ETA-s, gg=ETA+s, mb=BETA*Math.exp(-sig*gb), mg=BETA*Math.exp(-sig*gg), em=(mb+mg)/2, rf=1/em,
          k=(mb-mg)/(mb+mg), er=rf+(v/100)*k;
      return {s:s, gb:gb, gg:gg, mb:mb, mg:mg, em:em, rf:rf, k:k, er:er, prem:er-rf, cov:-(v/100)*(mb-mg)/2, dm:k};
    }
    function axes(st){
      var dev=Math.max(Math.abs(v),100*st.k), d1=niceRange(-dev,dev,4,10,0.12),
          ys=[100*(st.rf-1)-20*st.k, 100*(st.rf-1)+20*st.k, 100*RF_D, 100*RE_D, 100*(st.er-1)], mm=minmax(ys),
          d2=niceRange(mm[0],mm[1],4,6,0.1);
      return {d1:d1, d2:d2, key:d1.d.join()+'/'+d2.d.join()};
    }
    function draw(){
      var L, st=state(), ax=axes(st), lg;
      axKey=ax.key;
      W=measure(svg); L=two(W,W>=600?190:172); H=L.H; frame(svg,W,H);
      P1=box(svg,L.b1,[0,2],ax.d1.d,{xt:[],yt:ax.d1.t,zero:true,yl:'% from the mean'});
      P2=box(svg,L.b2,[-20,20],ax.d2.d,{xt:[-20,-10,0,10,20],yt:ax.d2.t,zero:true,xl:'swing of the return v, %',yl:'E R − 1, %'});
      /* left: deviations from the mean in each state; the two bars of a state pointing opposite ways is a negative covariance */
      lg=S('g',null,svg);
      swatch(lg,L.b1.x+L.b1.w-58,L.b1.y-11,'ma7-m','m');
      swatch(lg,L.b1.x+L.b1.w-26,L.b1.y-11,'ma7-ret','R');
      el.mb=S('rect',{'class':'ma7-m'},P1.gc); el.mg=S('rect',{'class':'ma7-m'},P1.gc);
      el.rb=S('rect',{'class':'ma7-ret'},P1.gc); el.rg=S('rect',{'class':'ma7-ret'},P1.gc);
      el.cb=text(svg,P1.sx(0.5),L.b1.y+L.b1.h+16,'bust','nf-lab','middle');
      el.cg=text(svg,P1.sx(1.5),L.b1.y+L.b1.h+16,'boom','nf-lab','middle');
      el.gb=text(svg,P1.sx(0.5),L.b1.y+L.b1.h+30,'','nf-title','middle');
      el.gg=text(svg,P1.sx(1.5),L.b1.y+L.b1.h+30,'','nf-title','middle');
      el.vb=text(svg,0,0,'','nf-lab nf-halo ma7-tm','middle'); el.vg=text(svg,0,0,'','nf-lab nf-halo ma7-tm','middle');
      el.wb=text(svg,0,0,'','nf-lab nf-halo ma7-tret','middle'); el.wg=text(svg,0,0,'','nf-lab nf-halo ma7-tret','middle');
      /* right: the consumption CAPM line E R = R_f + v tanh(sigma s) */
      el.rfl=line(P2.gc,0,0,0,0,'ma7-rfline');
      el.mod=line(P2.gc,0,0,0,0,'ma7-model');
      el.pr=line(P2.gc,0,0,0,0,'ma7-prem');
      el.dl=line(P2.gc,0,0,0,0,'ma7-dataline');
      el.d1=S('path',{'class':'ma7-data'},P2.gc); el.d2=S('path',{'class':'ma7-data'},P2.gc);
      el.drf=S('circle',{r:4.5,'class':'ma7-drf'},P2.gc);
      el.da=S('circle',{r:4.5,'class':'ma7-dprem'},P2.gc);
      el.tm=text(svg,0,0,'model','nf-lab nf-halo ma7-tmodel');
      el.trf=text(svg,0,0,'safe rate','nf-lab nf-halo ma7-trf');
      el.td1=text(svg,0,0,'T bill','nf-lab nf-halo');
      el.td2=text(svg,0,0,'stocks','nf-lab nf-halo','middle');
      el.tp=text(svg,0,0,'premium','nf-lab nf-halo ma7-tprem');
      paint();
    }
    function update(){ if(axes(state()).key!==axKey) draw(); else paint(); }
    function bar(e,P,x0,x1,v0,v1){ var y0=P.sy(Math.max(v0,v1)), y1=P.sy(Math.min(v0,v1)); e.setAttribute('x',R(P.sx(x0))); e.setAttribute('width',R(P.sx(x1)-P.sx(x0))); e.setAttribute('y',R(y0)); e.setAttribute('height',R(Math.max(0.5,y1-y0))); }
    function lab(e,P,x,val,s){ e.textContent=s; moveTo(e,P.sx(x),P.sy(val)+(val>=0?-5:13)); }
    function paint(){
      var st=state(), dm=100*st.k, w=0.3, rfp=100*(st.rf-1), erp=100*(st.er-1), x2, y2, sx=P2.sx, sy=P2.sy;
      bar(el.mb,P1,0.5-w-0.02,0.5-0.02,0,dm); bar(el.rb,P1,0.5+0.02,0.5+w+0.02,0,-v);
      bar(el.mg,P1,1.5-w-0.02,1.5-0.02,0,-dm); bar(el.rg,P1,1.5+0.02,1.5+w+0.02,0,v);
      lab(el.vb,P1,0.5-w/2-0.02,dm,sg(dm,1)); lab(el.vg,P1,1.5-w/2-0.02,-dm,sg(-dm,1));
      lab(el.wb,P1,0.5+w/2+0.02,-v,sg(-v,1)); lab(el.wg,P1,1.5+w/2+0.02,v,sg(v,1));
      el.gb.textContent='Δln c = '+sg(100*st.gb,2)+'%'; el.gg.textContent='Δln c = '+sg(100*st.gg,2)+'%';
      setLine(el.rfl,sx(-20),sy(rfp),sx(20),sy(rfp));
      setLine(el.mod,sx(-20),sy(rfp-20*st.k),sx(20),sy(rfp+20*st.k));
      setLine(el.pr,sx(v),sy(rfp),sx(v),sy(erp));
      cross(el.d1,sx(0),sy(100*RF_D)); cross(el.d2,sx(100*SD_E),sy(100*RE_D));
      setLine(el.dl,sx(0),sy(100*RF_D),sx(100*SD_E),sy(100*RE_D));
      at(el.drf,sx(0),sy(rfp)); at(el.da,sx(v),sy(erp));
      /* the model label under the left part of the line, the safe rate label above its dashed line, the data below their crosses */
      moveTo(el.tm,sx(-19),sy(rfp-17*st.k)+15);
      moveTo(el.trf,sx(-20)+4,sy(rfp)-6);
      moveTo(el.td1,sx(0)+8,sy(100*RF_D)+4);
      moveTo(el.td2,sx(100*SD_E),sy(100*RE_D)+17);
      x2=sx(v)+(v>=0?-6:6); y2=(sy(rfp)+sy(erp))/2+4;
      el.tp.setAttribute('text-anchor',v>=0?'end':'start');
      moveTo(el.tp,x2,y2);
      el.tp.textContent=Math.abs(sy(rfp)-sy(erp))>24?'premium':'';
      if(api) api.changed();
      if(!out) return;
      out.textContent='bust: Δln c = '+sg(100*st.gb,2)+'%, m '+fmt(dm,1)+'% above its mean   boom: Δln c = '+sg(100*st.gg,2)+'%, m '+fmt(dm,1)+'% below'+
        '\nsafe rate 1/E m = '+fmt(rfp,2)+'%   E R = '+fmt(erp,2)+'%   premium −cov(m, R)/E m = '+sg(100*st.prem,2)+' points'+
        '\nper unit of swing tanh(σs) = '+fmt(st.k,3)+'   stocks in the data: 6.18/16.67 = '+fmt(SHARPE_D,2);
    }
    api=NF.api({
      get:function(){ var st=state(); return {sigma:sig, s:sc, v:v, rf:100*(st.rf-1), er:100*(st.er-1), prem:100*st.prem, k:st.k, dm:100*st.k, cov:st.cov}; },
      set:function(o){
        if('sigma' in o && rsg) rsg.set(+o.sigma);
        if('s' in o && rsc) rsc.set(+o.s);
        if('v' in o && rv) rv.set(+o.v);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The yield curve ---------- */
  /* ln R_j / j = -ln beta + sigma eta + sigma x a_j / j - sigma^2 s^2 B_j / (2j) for j = 1..30; nr is the same
     without the variance term, flat the i.i.d. no news benchmark -ln beta + sigma eta - sigma^2 s^2 / 2 */
  function yields(beta,sig,rho,x,J){
    var y=[], nr=[], parts=[], B=0, j, a, imp=-Math.log(beta), gro=sig*ETA, news, risk;
    for(j=1;j<=J;j++){
      a=(1-Math.pow(rho,j))/(1-rho); B+=a*a;
      news=sig*x*a/j; risk=sig*sig*SC*SC*B/(2*j);
      y.push([j,100*(imp+gro+news-risk)]); nr.push([j,100*(imp+gro+news)]);
      parts.push({imp:imp, gro:gro, news:news, risk:risk});
    }
    return {y:y, nr:nr, flat:100*(imp+gro-sig*sig*SC*SC/2), r1:parts[0], rJ:parts[J-1]};
  }
  NF.register('ma7-yield',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var beta=0.97, sig=2, rho=0.3, x=0, view='slope', J=30, W=520, H=290, P, el={}, api, axKey='';
    var rb=range(fig,'beta',3,function(q){ beta=q; update(); }), rsg=range(fig,'sigma',2,function(q){ sig=q; update(); }),
        rr=range(fig,'rho',2,function(q){ rho=q; update(); }), rx=range(fig,'news',2,function(q){ x=q; update(); });
    if(rb) beta=rb.v();
    if(rsg) sig=rsg.v();
    if(rr) rho=rr.v();
    if(rx) x=rx.v();
    var cur=seg(fig,'data-view',function(q){ view=q; draw(); });
    if(cur) view=cur;
    function axes(Y){
      var all=[], i, mm, r;
      for(i=0;i<Y.y.length;i++){ all.push(Y.y[i][1]); all.push(Y.nr[i][1]); }
      all.push(Y.flat);
      if(view==='level'){ all.push(0); all.push(100*LRF_D); mm=minmax(all); r=niceRange(Math.min(0,mm[0]),Math.max(8,mm[1]),5,1,0.04); }
      else { mm=minmax(all); r=niceRange(mm[0],mm[1],4,0.5,0.1); }
      return {r:r, key:view+r.d.join()};
    }
    function draw(){
      var Y=yields(beta,sig,rho,x/100,J), ax=axes(Y), b, ph;
      axKey=ax.key;
      W=measure(svg); ph=Math.round(clamp(W*0.42,170,240));
      b={x:46,y:30,w:W-46-12,h:ph}; H=30+ph+40; frame(svg,W,H);
      P=box(svg,b,[0,J],ax.r.d,{xt:[0,5,10,15,20,25,30],yt:ax.r.t,zero:true,xl:'maturity j, years',yl:'yield, % a year',yf:function(v){ return tl(v); }});
      el.band=S('path',{'class':'ma7-riskband'},P.gc);
      el.nr=S('path',{'class':'ma7-norisk'},P.gc);
      el.flat=line(P.gc,0,0,0,0,'ma7-ref');
      el.y=S('path',{'class':'ma7-model ma7-thick'},P.gc);
      el.y1=S('circle',{r:4,'class':'ma7-drf'},P.gc);
      el.data=S('path',{'class':'ma7-data'},P.gc);
      el.ty=text(svg,0,0,'yield','nf-lab nf-halo ma7-tmodel','end');
      el.tnr=text(svg,0,0,'without the risk term','nf-lab nf-halo ma7-trisk','end');
      el.tfl=text(svg,0,0,'i.i.d. growth, no news','nf-lab nf-halo');
      el.td=text(svg,0,0,'T bill, data','nf-lab nf-halo');
      paint(Y);
    }
    function update(){ var Y=yields(beta,sig,rho,x/100,J); if(axes(Y).key!==axKey) draw(); else paint(Y); }
    function paint(Y){
      var sx=P.sx, sy=P.sy, yJ=Y.y[J-1][1], nJ=Y.nr[J-1][1], y1=Y.y[0][1], top=P.b.y, bot=P.b.y+P.b.h, ly, lf, yfl;
      el.band.setAttribute('d',band(P,Y.nr,Y.y));
      el.nr.setAttribute('d',curve(P,Y.nr));
      el.y.setAttribute('d',curve(P,Y.y));
      setLine(el.flat,sx(0),sy(Y.flat),sx(J),sy(Y.flat));
      at(el.y1,sx(1),sy(y1));
      /* labels at the right end: the yield below its curve, the no risk line above its own (it is never below the yield) */
      ly=clamp(sy(yJ)+15,top+12,bot-4); moveTo(el.ty,sx(J)-2,ly);
      lf=clamp(sy(nJ)-6,top+11,bot-4); if(Math.abs(lf-ly)<13) lf=ly-13; moveTo(el.tnr,sx(J)-2,lf);
      /* the benchmark's label sits at j = 3 on the side away from the yield curve */
      yfl=sy(Y.flat);
      if(view==='level') moveTo(el.tfl,sx(11),yfl-7);
      else moveTo(el.tfl,sx(2.2),(sy(Y.y[2][1])>yfl+2 || sy(Y.nr[2][1])>yfl+2)&&yfl-top>16?yfl-6:yfl+14);
      if(view==='level'){ cross(el.data,sx(1),sy(100*LRF_D)); moveTo(el.td,sx(1)+9,sy(100*LRF_D)+4); el.td.textContent='T bill, data 0.8%'; }
      else { el.data.setAttribute('d',''); el.td.textContent=''; }
      if(api) api.changed();
      if(!out) return;
      function line1(r,j,y){ return 'y'+j+' = '+fmt(100*r.imp,2)+' impatience + '+fmt(100*r.gro,2)+' growth '+(Math.abs(r.news)>1e-12?sg(100*r.news,2)+' news ':'')+MINUS+' '+fmt(100*r.risk,2)+' risk = '+fmt(y,2)+'%'; }
      out.textContent=line1(Y.r1,1,y1)+'\n'+line1(Y.rJ,J,yJ)+'   slope y30 '+MINUS+' y1 = '+sg(yJ-y1,2)+' points'+
        (view==='level'?'\nT bill in the data 0.80%: the model one year rate is '+fmt(Math.abs(y1-100*LRF_D),2)+' points '+(y1>=100*LRF_D?'above':'below')+' it':'');
    }
    api=NF.api({
      get:function(){
        var Y=yields(beta,sig,rho,x/100,J);
        return {beta:beta, sigma:sig, rho:rho, news:x, view:view, y1:Y.y[0][1], y30:Y.y[J-1][1], slope:Y.y[J-1][1]-Y.y[0][1],
                imp:100*Y.r1.imp, gro:100*Y.r1.gro, risk1:100*Y.r1.risk, risk30:100*Y.rJ.risk, flat:Y.flat};
      },
      set:function(o){
        if('view' in o) NF.press(fig,'data-view',String(o.view));
        if('beta' in o && rb) rb.set(+o.beta);
        if('sigma' in o && rsg) rsg.set(+o.sigma);
        if('rho' in o && rr) rr.set(+o.rho);
        if('news' in o && rx) rx.set(+o.news);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Lucas tree prices ---------- */
  /* p/d as a function of this year's growth gap z: w(z) = sum_j base_j e^((1-sigma) A_j z) with
     base_j = beta^j e^((1-sigma) j eta + (1-sigma)^2 s^2 B_j / 2) and A_j = rho a_j = rho + ... + rho^j.
     The sum converges when beta e^((1-sigma) eta + (1-sigma)^2 s^2 / (2 (1-rho)^2)) < 1, true on the sliders' range.
     Beyond K terms A_j equals its limit rho/(1-rho) to machine precision, so the tail is summed once. */
  function tree(sig,rho){
    var one=1-sig, s2=SC*SC, lam=Math.log(BETA)+one*ETA+0.5*one*one*s2/((1-rho)*(1-rho)), J, K, base=[], A=[], tail=0, Ainf=rho/(1-rho), j, a, B=0, b, w0, D=0;
    if(!(lam<-1e-5)) return null;
    J=Math.min(60000,Math.ceil(-46/lam)+40); K=Math.min(J,240);
    for(j=1;j<=J;j++){
      a=(1-Math.pow(rho,j))/(1-rho); B+=a*a;
      b=Math.exp(j*Math.log(BETA)+one*j*ETA+0.5*one*one*s2*B);
      if(j<=K){ base.push(b); A.push(rho*a); } else tail+=b;
    }
    function w(z){ var s=tail*Math.exp(one*Ainf*z), i, c=one*z; for(i=0;i<K;i++) s+=base[i]*Math.exp(c*A[i]); return s; }
    w0=w(0);
    for(j=0;j<K;j++) D+=base[j]*A[j];
    D=(D+tail*Ainf)/w0;
    return {w:w, w0:w0, D:D};
  }
  NF.register('ma7-tree',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var sig=2, rho=0.4, mode='news', seed=7, W=520, H=300, P1, P2, el={}, api, axKey='', T, st={};
    var rsg=range(fig,'sigma',1,function(q){ sig=q; update(); }), rr=range(fig,'rho',2,function(q){ rho=q; update(); });
    if(rsg) sig=rsg.v();
    if(rr) rho=rr.v();
    var cur=seg(fig,'data-mode',function(q){ mode=q; draw(); });
    if(cur) mode=cur;
    onClick(fig,'.ma7-draw',function(){ seed++; if(mode!=='path') NF.press(fig,'data-mode','path'); else draw(); });
    /* the expected path after one good year (news) or a simulated path; both in % deviation from the trend e^(eta t) */
    function compute(){
      var M=tree(sig,rho), i, z, ld, eps=SC, d=[], p=[], zs=[], top=[], rnd, gd=[], gp=[], m1=0, m2=0, n1=0, n2=0, k;
      if(!M) return null;
      for(i=0;i<=80;i++){ z=-0.1+0.2*i/80; top.push([100*z,100*(M.w(z)/M.w0-1)]); }
      if(mode==='news'){
        T=20;
        for(i=-3;i<=T;i++){
          if(i<0){ d.push([i,0]); p.push([i,0]); continue; }
          z=Math.pow(rho,i)*eps; ld=eps*(1-Math.pow(rho,i+1))/(1-rho);
          d.push([i,100*ld]); p.push([i,100*(ld+Math.log(M.w(z)/M.w0))]); zs.push(z);
        }
      } else {
        T=60; rnd=mulberry32(20261120+97*seed); z=0; ld=0;
        d.push([0,0]); p.push([0,0]); zs.push(0);
        for(i=1;i<=T;i++){
          z=rho*z+SC*invPhi(clamp(rnd(),1e-12,1-1e-12)); ld+=z;
          d.push([i,100*ld]); p.push([i,100*(ld+Math.log(M.w(z)/M.w0))]); zs.push(z);
        }
        for(k=1;k<=T;k++){ gd.push(d[k][1]-d[k-1][1]); gp.push(p[k][1]-p[k-1][1]); }
        for(k=0;k<T;k++){ m1+=gd[k]/T; m2+=gp[k]/T; }
        for(k=0;k<T;k++){ n1+=(gd[k]-m1)*(gd[k]-m1)/(T-1); n2+=(gp[k]-m2)*(gp[k]-m2)/(T-1); }
      }
      var jump=mode==='news'?p[3][1]:0;
      return {M:M, top:top, d:d, p:p, zs:zs, jump:jump, lr:100*eps/(1-rho), sdd:Math.sqrt(n1), sdp:Math.sqrt(n2),
              cf:100*M.D*eps, dr:100*sig*M.D*eps, imp:100*(Math.log(M.w(eps)/M.w0))};
    }
    function axes(Q){
      var t=minmax(Q.top.map(function(q){ return q[1]; })), dv=Math.max(Math.abs(t[0]),Math.abs(t[1])), r1=niceRange(-Math.max(dv,4),Math.max(dv,4),4,8,0.05),
          a=minmax(Q.d.map(function(q){ return q[1]; }).concat(Q.p.map(function(q){ return q[1]; })).concat([0])), r2=niceRange(a[0],a[1],4,6,0.08);
      return {r1:r1, r2:r2, key:mode+r1.d.join()+'/'+r2.d.join()};
    }
    function draw(){
      var Q=compute(), ax, L, xt;
      if(!Q) return;
      ax=axes(Q); axKey=ax.key;
      W=measure(svg); L=two(W,W>=600?190:172); H=L.H; frame(svg,W,H);
      P1=box(svg,L.b1,[-10,10],ax.r1.d,{xt:[-10,-5,0,5,10],yt:ax.r1.t,zero:true,xl:'this year’s growth gap z, %',yl:'p/d, % from z = 0'});
      xt=mode==='news'?[0,5,10,15,20]:[0,10,20,30,40,50,60];
      P2=box(svg,L.b2,mode==='news'?[-3,T]:[0,T],ax.r2.d,{xt:xt,yt:ax.r2.t,zero:true,xl:'year',yl:'% from trend'});
      el.log=line(P1.gc,P1.sx(-10),P1.sy(0),P1.sx(10),P1.sy(0),'ma7-ref');
      el.top=S('path',{'class':'ma7-model ma7-thick'},P1.gc);
      el.rug=S('g',null,P1.gc);
      el.o=S('circle',{r:4,'class':'ma7-open'},P1.gc);
      el.f=S('circle',{r:4.5,'class':'ma7-dot'},P1.gc);
      el.tl=text(svg,0,0,'σ = 1: flat','nf-lab nf-halo');
      el.tt=text(svg,0,0,'','nf-lab nf-halo ma7-tmodel','end');
      el.dv=S('path',{'class':'ma7-div'},P2.gc);
      el.pr=S('path',{'class':'ma7-price'},P2.gc);
      el.t0=line(P2.gc,0,0,0,0,'ma7-guide');
      /* legend in the bottom box's title row: the two paths meet in the long run, so they are not labelled at their ends */
      el.kg=S('g',null,svg);
      line(el.kg,L.b2.x+L.b2.w-118,L.b2.y-14.5,L.b2.x+L.b2.w-104,L.b2.y-14.5,'ma7-div');
      text(el.kg,L.b2.x+L.b2.w-99,L.b2.y-11,'dividend','nf-lab');
      line(el.kg,L.b2.x+L.b2.w-48,L.b2.y-14.5,L.b2.x+L.b2.w-34,L.b2.y-14.5,'ma7-price');
      el.tp=text(el.kg,L.b2.x+L.b2.w-29,L.b2.y-11,'price','nf-lab');
      paint(Q);
    }
    function update(){ var Q=compute(); if(!Q) return; if(axes(Q).key!==axKey) draw(); else paint(Q); }
    function paint(Q){
      var sx=P1.sx, sy=P1.sy, i, M=Q.M, gap, b2=P2.b, ve, up;
      el.top.setAttribute('d',curve(P1,Q.top));
      while(el.rug.firstChild) el.rug.removeChild(el.rug.firstChild);
      ve=100*(M.w(SC)/M.w0-1);
      if(mode==='news'){
        el.o.setAttribute('r',4); at(el.o,sx(0),sy(0));
        el.f.setAttribute('r',4.5); at(el.f,sx(100*SC),sy(ve));
      } else {
        el.o.setAttribute('r',0); el.f.setAttribute('r',0);
        for(i=0;i<Q.zs.length;i++) if(Math.abs(Q.zs[i])<=0.1) S('circle',{r:2.4,'class':'ma7-rug',cx:R(sx(100*Q.zs[i])),cy:R(sy(100*(M.w(Q.zs[i])/M.w0-1)))},el.rug);
      }
      moveTo(el.tl,sx(-9.6),sy(0)+(Q.top[4][1]<0?-6:14));
      el.tt.textContent='σ = '+fmt(sig,1);
      /* beside the curve's right end, on the side the curve leaves clear: below a falling curve, above a rising one */
      up=Q.top[78][1]>=Q.top[2][1];
      moveTo(el.tt,sx(9.6),clamp(sy(Q.top[78][1])+(up?-8:16),P1.b.y+11,P1.b.y+P1.b.h-4));
      el.dv.setAttribute('d',curve(P2,Q.d));
      el.pr.setAttribute('d',curve(P2,Q.p));
      if(mode==='news') setLine(el.t0,P2.sx(0),b2.y,P2.sx(0),b2.y+b2.h); else setLine(el.t0,0,0,0,0);
      for(i=0,gap=0;i<Q.d.length;i++) gap=Math.max(gap,Math.abs(Q.d[i][1]-Q.p[i][1]));
      el.tp.textContent=gap<1e-6?'price, the same':'price';
      st={sigma:sig, rho:rho, mode:mode, pd:M.w0, jump:Q.jump, lr:Q.lr, cf:Q.cf, dr:Q.dr, imp:Q.imp, ve:ve, sdd:Q.sdd, sdp:Q.sdp, ratio:Q.jump/(100*SC)};
      if(api) api.changed();
      if(!out) return;
      if(mode==='news')
        out.textContent='p/d = '+fmt(M.w0,2)+' at z = 0   log utility: β/(1 '+MINUS+' β) = '+fmt(BETA/(1-BETA),2)+
          '\none good year, z = +3.57%: dividend +3.57% now and +'+fmt(Q.lr,2)+'% for good, price '+sg(Q.jump,2)+'% on impact'+
          '\nfirst order: 3.57 today + '+fmt(Q.cf,2)+' future dividends '+MINUS+' '+fmt(Q.dr,2)+' discounting = '+fmt(3.57+Q.cf-Q.dr,2)+'%';
      else
        out.textContent='p/d = '+fmt(M.w0,2)+' at z = 0   log utility: β/(1 '+MINUS+' β) = '+fmt(BETA/(1-BETA),2)+
          '\nthis draw, s.d. of yearly growth: dividend '+fmt(Q.sdd,2)+'%, price '+fmt(Q.sdp,2)+'%';
    }
    api=NF.api({
      get:function(){ var r={}, k; for(k in st) r[k]=st[k]; return r; },
      set:function(o){
        if('mode' in o) NF.press(fig,'data-mode',String(o.mode));
        if('sigma' in o && rsg) rsg.set(+o.sigma);
        if('rho' in o && rr) rr.set(+o.rho);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. The equity premium and the risk free rate ---------- */
  /* Lucas tree, CRRA, i.i.d. log normal growth (mean eta, s.d. s): ln E R_e - ln R_f = sigma s^2 and
     ln R_f = -ln beta + sigma eta - sigma^2 s^2 / 2. Data in logs: premium ln(1.0698/1.0080) = 5.95%, safe rate 0.80%. */
  NF.register('ma7-puzzle',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var sig=2, beta=0.97, sc=3.57, SM=50, W=520, H=300, P1, P2, el={}, api;
    var rsg=range(fig,'sigma',1,function(q){ sig=q; paint(); }), rb=range(fig,'beta',3,function(q){ beta=q; paint(); }), rs=range(fig,'s',2,function(q){ sc=q; paint(); });
    if(rsg) sig=rsg.v();
    if(rb) beta=rb.v();
    if(rs) sc=rs.v();
    function rfOf(x,s){ return -Math.log(beta)+x*ETA-x*x*s*s/2; }
    /* the tree has a finite price only if beta G < 1, G = E e^((1-sigma) g); otherwise the premium is not defined */
    function finite(x,s){ return Math.log(beta)+(1-x)*ETA+(1-x)*(1-x)*s*s/2<0; }
    function state(){
      var s=sc/100, prem=sig*s*s, rf=rfOf(sig,s), need=LP_D/(s*s), bneed=Math.exp(sig*ETA-sig*sig*s*s/2-LRF_D);
      return {s:s, prem:prem, rf:rf, need:need, rfneed:rfOf(need,s), bneed:bneed, imp:-Math.log(beta), gro:sig*ETA, prec:sig*sig*s*s/2,
              fin:finite(sig,s), G:Math.exp((1-sig)*ETA+(1-sig)*(1-sig)*s*s/2)};
    }
    function draw(){
      var L;
      W=measure(svg); L=two(W,W>=600?200:176); H=L.H; frame(svg,W,H);
      P1=box(svg,L.b1,[0,SM],[0,10],{xt:[0,10,20,30,40,50],yt:[0,2,4,6,8,10],zero:true,xl:'risk aversion σ',yf:pctTick});
      P2=box(svg,L.b2,[0,SM],[-20,30],{xt:[0,10,20,30,40,50],yt:[-20,-10,0,10,20,30],zero:true,xl:'risk aversion σ',yf:pctTick});
      text(svg,L.b1.x-36,L.b1.y-11,'log equity premium σs², %','nf-title ma7-tprem');
      text(svg,L.b2.x-36,L.b2.y-11,'log safe rate, %','nf-title ma7-trf');
      [P1,P2].forEach(function(P){ S('rect',{'class':'ma7-plaus',x:R(P.sx(1)),y:P.b.y,width:R(P.sx(5)-P.sx(1)),height:P.b.h},P.gc); });
      text(svg,P1.sx(5)+4,P1.b.y+P1.b.h-6,'plausible σ','nf-title nf-halo');
      line(P1.gc,P1.sx(0),P1.sy(100*LP_D),P1.sx(SM),P1.sy(100*LP_D),'ma7-dataline');
      line(P2.gc,P2.sx(0),P2.sy(100*LRF_D),P2.sx(SM),P2.sy(100*LRF_D),'ma7-dataline');
      text(svg,P1.sx(31),P1.sy(100*LP_D)-6,'data 5.95%','nf-lab nf-halo','middle');
      text(svg,P2.sx(SM)-4,P2.sy(100*LRF_D)+14,'data 0.80%','nf-lab nf-halo','end');
      el.need=line(P1.gc,0,0,0,0,'ma7-guide');
      el.tneed=text(svg,0,0,'','nf-lab nf-halo');
      el.pr=S('path',{'class':'ma7-prem ma7-thick'},P1.gc);
      el.prx=S('path',{'class':'ma7-prem ma7-nofin'},P1.gc);
      el.tx=text(svg,0,0,'','nf-title nf-halo');
      el.dp=S('circle',{r:4.5,'class':'ma7-dprem'},P1.gc);
      el.band=S('path',{'class':'ma7-riskband'},P2.gc);
      el.nop=S('path',{'class':'ma7-norisk'},P2.gc);
      el.rf=S('path',{'class':'ma7-rf ma7-thick'},P2.gc);
      el.drf=S('circle',{r:4.5,'class':'ma7-drf'},P2.gc);
      el.tnp=text(svg,0,0,'−ln β + ση','nf-lab nf-halo ma7-trisk','end');
      el.tpc=text(svg,0,0,'precaution','nf-lab nf-halo ma7-trisk','middle');
      paint();
    }
    function paint(){
      var q=state(), s=q.s, i, x, pa='', pb='', rr=[], nn=[], sx1=P1.sx, sy1=P1.sy, sx2=P2.sx, sy2=P2.sy, xn, last=null, fx=null, f, pt, xp;
      /* the premium line, solid where the tree has a finite price and faint where it has none */
      for(i=0;i<=400;i++){
        x=SM*i/400; f=finite(x,s); pt=R(sx1(x))+','+R(sy1(Math.min(100*x*s*s,12)));
        if(f){ pa+=(last===true?'L':'M')+pt; } else { pb+=(last===false?'L':'M')+pt; if(fx===null) fx=x; }
        last=f;
      }
      el.pr.setAttribute('d',pa); el.prx.setAttribute('d',pb);
      /* label the faint part where it starts, below and right of the rising line */
      if(fx!==null && fx>0 && fx*s*s<0.09 && sx1(fx)+92<P1.b.x+P1.b.w){ el.tx.textContent='no finite price'; moveTo(el.tx,sx1(fx)+6,sy1(100*fx*s*s)+15); }
      else el.tx.textContent='';
      at(el.dp,sx1(sig),sy1(Math.min(100*q.prem,10.6)));
      if(q.need<=SM){
        setLine(el.need,sx1(q.need),sy1(0),sx1(q.need),sy1(100*LP_D)); el.tneed.textContent='σ = '+fmt(q.need,1);
        if(q.need>SM*0.6){ el.tneed.setAttribute('text-anchor','end'); moveTo(el.tneed,sx1(q.need)-5,sy1(100*LP_D)+15); }
        else { el.tneed.setAttribute('text-anchor','start'); moveTo(el.tneed,sx1(q.need)+5,sy1(100*LP_D)+15); }
      } else { setLine(el.need,0,0,0,0); el.tneed.textContent=''; }
      for(i=0;i<=200;i++){ x=SM*i/200; rr.push([x,100*rfOf(x,s)]); nn.push([x,100*(-Math.log(beta)+x*ETA)]); }
      el.band.setAttribute('d',band(P2,nn,rr));
      el.nop.setAttribute('d',curve(P2,nn));
      el.rf.setAttribute('d',curve(P2,rr));
      at(el.drf,sx2(sig),sy2(clamp(100*q.rf,-21,31)));
      xn=Math.min(SM*0.55,(0.28+Math.log(beta))/ETA); moveTo(el.tnp,sx2(xn)-6,sy2(100*(-Math.log(beta)+xn*ETA))-6);
      /* the precautionary band's label in its widest visible part */
      xp=SM*0.78; moveTo(el.tpc,sx2(xp),sy2(8)+4);
      el.tpc.textContent=rfOf(xp,s)<0.02 && -Math.log(beta)+xp*ETA>0.14?'precaution':'';
      if(api) api.changed();
      if(!out) return;
      out.textContent='σ = '+fmt(sig,1)+': premium σs² = '+fmt(100*q.prem,2)+'% (data 5.95%)   safe rate '+fmt(100*q.imp,2)+' + '+fmt(100*q.gro,2)+' '+MINUS+' '+fmt(100*q.prec,2)+' = '+fmt(100*q.rf,2)+'% (data 0.80%)'+
        '\nthe premium needs σ = '+fmt(q.need,1)+', and there the safe rate is '+fmt(100*q.rfneed,1)+'%   the safe rate at σ = '+fmt(sig,1)+' needs β = '+fmt(q.bneed,3)+
        '\nequity return s.d. in the model ≈ s = '+fmt(sc,2)+'% (data 16.54%)';
      if(!q.fin){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent='\nβG = '+fmt(beta*q.G,3)+' ≥ 1: at this σ and β the tree has no finite price, so there is no premium to speak of'; out.appendChild(sp); }
    }
    api=NF.api({
      get:function(){ var q=state(); return {sigma:sig, beta:beta, s:sc, prem:100*q.prem, rf:100*q.rf, need:q.need, bneed:q.bneed, rfneed:100*q.rfneed, imp:100*q.imp, gro:100*q.gro, prec:100*q.prec, fin:q.fin?1:0, bg:beta*q.G}; },
      set:function(o){
        if('sigma' in o && rsg) rsg.set(+o.sigma);
        if('beta' in o && rb) rb.set(+o.beta);
        if('s' in o && rs) rs.set(+o.s);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
