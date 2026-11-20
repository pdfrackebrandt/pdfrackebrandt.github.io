/* Core Macroeconomics L11 figures: costly state verification (Bernanke, Gertler and Gilchrist 1999) in the two period
   model of the note. Every number is computed in the browser from the model:
     omega ~ lognormal with mean 1 and log standard deviation sigma, z = (ln w + sigma^2/2)/sigma,
     F(w) = Phi(z), f(w) = phi(z)/(w sigma), G(w) = int_0^w omega dF = Phi(z - sigma), Gamma(w) = G(w) + w(1 - F(w)).
   The banker's first order condition, solved for the premium x = r^k/R in closed form:
     x(w) = (1 - F) / [ (1 - F)(Gamma - mu G) + (1 - F - mu w f)(1 - Gamma) ],
   and mutual fund zero profit gives leverage L(w) = 1 / (1 - x (Gamma - mu G)). Both rise with the cutoff w, from
   x = L = 1 at w = 0, so tracing w traces the premium against leverage, s(L).
   Equilibrium: B = N(L - 1), c1 = y - B, c2 = r^k (N + B)(1 - mu G), c2 = c1 (beta R)^(1/alpha), R = r^k / x.
   The Euler residual rises with the cutoff, so one bisection on w solves the five equations.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/ma11.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      clip=NF.clip, local=NF.local, capture=NF.capture, Phi=NF.Phi, phi=NF.phi, press=NF.press, MINUS=NF.MINUS;

  /* ---------- the model ---------- */
  var RK=1.04, BETA=0.97, Y0=3.11, N0=1, SIG0=0.37, TOT=Y0+N0;
  function parts(w,sig){
    if(!(w>0)) return {w:0, F:0, f:0, G:0, Gam:0};
    var z=(Math.log(w)+sig*sig/2)/sig, F=Phi(z), G=Phi(z-sig);
    return {w:w, F:F, f:phi(z)/(w*sig), G:G, Gam:G+w*(1-F)};
  }
  /* the optimal contract with cutoff w: the premium x that makes w optimal, and leverage from zero profit */
  function deal(w,mu,sig){
    var p=parts(w,sig), h=1-p.F-mu*p.w*p.f, net=p.Gam-mu*p.G, d=(1-p.F)*net+h*(1-p.Gam);
    p.h=h; p.net=net; p.x=d>0?(1-p.F)/d:Infinity; p.L=1/(1-p.x*net);
    p.ok=h>0 && d>0 && isFinite(p.L) && p.L>=1-1e-12;
    p.V=p.L*(1-p.Gam);
    return p;
  }
  /* the highest cutoff a contract can have: beyond it, where 1 - F - mu w f < 0, a higher cutoff lowers what lenders get */
  function wTop(mu,sig){
    var lo=0, hi=0.05, i, m;
    while(hi<60 && deal(hi,mu,sig).ok){ lo=hi; hi*=1.2; }
    if(hi>=60) return 60;
    for(i=0;i<70;i++){ m=(lo+hi)/2; if(deal(m,mu,sig).ok) lo=m; else hi=m; }
    return lo;
  }
  function inv(fn,target,lo,hi){ var i, m; for(i=0;i<90;i++){ m=(lo+hi)/2; if(fn(m)<target) lo=m; else hi=m; } return (lo+hi)/2; }
  function wAtL(L,mu,sig,top){ return inv(function(w){ var d=deal(w,mu,sig); return d.ok?d.L:Infinity; },L,0,top||wTop(mu,sig)); }
  function wAtX(x,mu,sig,top){ return inv(function(w){ var d=deal(w,mu,sig); return d.ok?d.x:Infinity; },x,0,top||wTop(mu,sig)); }
  function U(c,a){ return Math.abs(a-1)<1e-9?Math.log(c):Math.pow(c,1-a)/(1-a); }
  /* mu = 0: R = r^k and the Euler equation alone gives B */
  function firstBest(o){
    var g=Math.pow(o.beta*RK,1/o.alpha), B=Math.max(0,(o.y*g-RK*o.N)/(RK+g)), c1=o.y-B, c2=RK*(o.N+B);
    return {B:B, c1:c1, c2:c2, W:U(c1,o.alpha)+o.beta*U(c2,o.alpha)};
  }
  /* consumption equivalent loss: the share of first best consumption in both periods that gives the same utility */
  function ceLoss(W,fb,o){ return Math.abs(o.alpha-1)<1e-9?1-Math.exp((W-fb.W)/(1+o.beta)):1-Math.pow(W/fb.W,1/(1-o.alpha)); }
  /* the equilibrium; o: sig, alpha, beta, N, y, gam (true charges the monitoring loss as mu Gamma instead of mu G) */
  function eqm(mu,o){
    var top=wTop(mu,o.sig), lo=0, hi=top, e, m, i;
    function atw(w){
      var c=deal(w,mu,o.sig);
      if(!c.ok) return null;
      c.B=o.N*(c.L-1); c.c1=o.y-c.B;
      if(c.c1<=0) return null;
      c.R=RK/c.x; c.mug=mu*(o.gam?c.Gam:c.G);
      c.c2=RK*(o.N+c.B)*(1-c.mug);
      c.res=c.c2-c.c1*Math.pow(o.beta*c.R,1/o.alpha);
      return c;
    }
    e=atw(0);
    if(e.res>=0) e.corner=true;
    else {
      for(i=0;i<100;i++){ m=(lo+hi)/2; e=atw(m); if(e && e.res<0) lo=m; else hi=m; }
      e=atw(lo); e.corner=false;
    }
    e.W=U(e.c1,o.alpha)+o.beta*U(e.c2,o.alpha);
    e.spread=RK-e.R; e.prem=e.x-1; e.top=top;
    e.Z=e.L>1+1e-9?e.w*RK*e.L/(e.L-1):e.R;
    return e;
  }
  /* the horse race at mu: total dL/dmu, the part at a fixed premium (fixed R), and the rest, through the fall in R */
  function race(mu,o){
    var h=0.004, e=eqm(mu,o), a=eqm(mu+h,o), b=eqm(mu-h,o), wa=wAtX(e.x,mu+h,o.sig), wb=wAtX(e.x,mu-h,o.sig),
        da=deal(wa,mu+h,o.sig), db=deal(wb,mu-h,o.sig);
    return {e:e, dl:(a.L-b.L)/(2*h), dlp:(da.L-db.L)/(2*h), dw:(a.w-b.w)/(2*h), dwp:(wa-wb)/(2*h)};
  }

  /* ---------- drawing helpers ---------- */
  function niceStep(span,n){ var raw=span/n, mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)), r=raw/mag; return (r<1.5?1:r<2.25?2:r<3.5?2.5:r<7.5?5:10)*mag; }
  function ticks(lo,hi,n){ var st=niceStep(hi-lo,n), out=[], v; for(v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9*st;v+=st) out.push(Math.round(v/st)*st); return out; }
  /* one plot box: grid, ticks, tick labels and names; sx and sy map data to the svg, gc is clipped to the box */
  function box(svg,b,xd,yd,o){
    var g=S('g',null,svg), sx=lin(xd[0],xd[1],b.x,b.x+b.w), sy=lin(yd[0],yd[1],b.y+b.h,b.y),
        xt=o.xt||ticks(xd[0],xd[1],o.nx||5), yt=o.yt||ticks(yd[0],yd[1],o.ny||4), i, v, f;
    for(i=0;i<xt.length;i++){
      v=xt[i]; if(v<xd[0]-1e-9 || v>xd[1]+1e-9) continue;
      f=C(sx(v)); line(g,f,b.y,f,b.y+b.h,'nf-grid'); line(g,f,b.y+b.h,f,b.y+b.h+4,'nf-ax');
      if(!o.noxl) text(g,sx(v),b.y+b.h+15,(o.xf||tl)(v),null,'middle');
    }
    for(i=0;i<yt.length;i++){
      v=yt[i]; if(v<yd[0]-1e-9 || v>yd[1]+1e-9) continue;
      f=C(sy(v)); line(g,b.x,f,b.x+b.w,f,'nf-grid'); text(g,b.x-5,sy(v)+4,(o.yf||tl)(v),null,'end');
    }
    line(g,b.x,C(b.y+b.h),b.x+b.w,C(b.y+b.h),'nf-ax'); line(g,C(b.x),b.y,C(b.x),b.y+b.h,'nf-ax');
    if(o.xl) text(g,b.x+b.w,b.y+b.h+30,o.xl,'nf-title','end');
    if(o.title) text(g,b.x-(o.tin||0),b.y-8,o.title,'nf-title');
    return {sx:sx, sy:sy, b:b, xd:xd, yd:yd, gc:clip(svg,b.x,b.y,b.w,b.h)};
  }
  function curve(P,pts){ var a=[], i; for(i=0;i<pts.length;i++) if(isFinite(pts[i][1])) a.push([P.sx(pts[i][0]),P.sy(pts[i][1])]); return poly(a); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function knob(svg,cls,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+cls},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, d=0;
      if(k==='ArrowRight'||k==='ArrowUp') d=1; else if(k==='ArrowLeft'||k==='ArrowDown') d=-1; else return;
      e.preventDefault(); onKey(d,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+now.toFixed(3));
    h.setAttribute('aria-valuetext',txt);
  }
  /* press or drag inside one of the boxes: move(p) gets the svg point and the box index */
  function dragIn(svg,size,boxes,move,focus){
    var on=-1;
    function which(p){ var bs=boxes(), i, b; for(i=0;i<bs.length;i++){ b=bs[i]; if(b && p[0]>=b.x-10 && p[0]<=b.x+b.w+10 && p[1]>=b.y-10 && p[1]<=b.y+b.h+10) return i; } return -1; }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), i=which(p);
      if(i<0) return;
      on=i; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag');
      if(focus) focus();
      move(p,i);
    });
    svg.addEventListener('pointermove',function(e){ if(on<0) return; var s=size(); move(local(svg,e,s[0],s[1]),on); });
    function stop(){ on=-1; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
  }
  function pc(v,d){ return fmt(100*v,d)+'%'; }
  function sg(v,d){ var s=fmt(v,d); return (v>0 && parseFloat(v.toFixed(d))!==0?'+':'')+s; }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }

  /* ---------- 1. The debt contract: who gets what ---------- */
  NF.register('ma11-contract',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var wb=0.5, mu=0.1, sig=SIG0, W=520, H=420, PA, PB, bar={}, el={}, api, cur={}, XM=2.2, YM=1.6;
    var rw=range(fig,'wbar',2,function(v){ wb=v; update(); }), rm=range(fig,'mu',2,function(v){ mu=v; update(); }),
        rs=range(fig,'sigma',2,function(v){ sig=v; draw(); if(api) api.changed(); });
    if(rw){ wb=rw.v(); mu=rm.v(); sig=rs.v(); }
    onClick(fig,'.nfig-reset',function(){ api.set({wbar:0.5, mu:0.1, sigma:SIG0}); });
    function draw(){
      var mL, ph, pb, top, i, w, fmax=0, rows;
      W=measure(svg); mL=W<420?38:44;
      ph=Math.round(clamp(W*0.4,150,220)); pb=Math.round(clamp(W*0.15,58,84)); top=30;
      for(i=1;i<=200;i++){ w=XM*i/200; fmax=Math.max(fmax,phi((Math.log(w)+sig*sig/2)/sig)/(w*sig)); }
      rows=W<520?3:1;
      bar.y=top+ph+54+pb+44; bar.h=14;
      H=bar.y+bar.h+rows*17+12;
      frame(svg,W,H);
      PA=box(svg,{x:mL,y:top,w:W-mL-14,h:ph},[0,XM],[0,YM],{xt:ticks(0,XM,W<420?4:6),yt:ticks(0,YM,4),title:'payoff per unit of (N + B)rᵏ',tin:mL-6});
      text(svg,PA.b.x+PA.b.w,PA.b.y+PA.b.h+30,'productivity ω','nf-title','end');
      PB=box(svg,{x:mL,y:top+ph+54,w:W-mL-14,h:pb},[0,XM],[0,fmax*1.12],{xt:ticks(0,XM,W<420?4:6),yt:[0],noxl:true,title:'density of ω, mean 1',tin:mL-6});
      bar.x=mL; bar.w=W-mL-14;
      el.wedge=S('path',{'class':'ma11-loss'},PA.gc);
      line(PA.gc,PA.sx(0),PA.sy(0),PA.sx(XM),PA.sy(XM),'ma11-out');
      el.lend=S('path',{'class':'ma11-lend'},PA.gc);
      el.bank=S('path',{'class':'ma11-bank'},PA.gc);
      el.cutA=line(PA.gc,0,PA.b.y,0,PA.b.y+PA.b.h,'ma11-cut');
      el.cutB=line(PB.gc,0,PB.b.y,0,PB.b.y+PB.b.h,'ma11-cut');
      el.dens=S('path',{'class':'ma11-dens'},PB.gc);
      el.def=S('path',{'class':'ma11-def'},PB.gc);
      el.dline=S('path',{'class':'ma11-dline'},PB.gc);
      el.tout=text(svg,0,0,'output ω','nf-lab nf-halo ma11-small','end');
      el.tlend=text(svg,0,0,'lenders','nf-lab nf-halo ma11-tlend','end');
      el.tbank=text(svg,0,0,'banker','nf-lab nf-halo ma11-tbank','end');
      el.tloss=text(svg,0,0,'μω burned','nf-lab nf-halo ma11-tloss','end');
      el.tcut=text(svg,0,0,'ω̄','nf-lab nf-halo ma11-tcut ma11-it');
      el.tdef=text(svg,0,0,'','nf-lab ma11-tcut','end');
      el.bb=S('rect',{'class':'ma11-fbank',y:bar.y,height:bar.h},svg);
      el.bl=S('rect',{'class':'ma11-flend',y:bar.y,height:bar.h},svg);
      el.bm=S('rect',{'class':'ma11-floss',y:bar.y,height:bar.h},svg);
      line(svg,bar.x,C(bar.y+bar.h+0.5),bar.x+bar.w,C(bar.y+bar.h+0.5),'nf-ax');
      text(svg,bar.x-(mL-6),bar.y-7,'where expected output goes','nf-title');
      el.lab=[]; el.sw=[];
      var cls=['ma11-fbank','ma11-flend','ma11-floss'];
      for(i=0;i<3;i++){
        var lx=rows===1?bar.x+i*bar.w/3:bar.x, ly=bar.y+bar.h+16+(rows===1?0:i*17);
        el.sw.push(S('rect',{x:R(lx),y:R(ly-9),width:10,height:10,'class':cls[i]},svg));
        el.lab.push(text(svg,lx+15,ly,'','nf-lab'));
      }
      el.k=knob(svg,'ma11-kcut','Cutoff ω̄ of the debt contract, arrow keys move it',function(d,big){ if(rw) rw.set(wb+d*(big?0.1:0.01)); });
      paint();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var sx=PA.sx, sy=PA.sy, p=parts(wb,sig), mug=mu*p.G, bank=1-p.Gam, lend=p.Gam-mug, pts=[], pd=[], i, w, f, x0=bar.x, s;
      el.wedge.setAttribute('d',poly([[sx(0),sy(0)],[sx(wb),sy(wb)],[sx(wb),sy((1-mu)*wb)]])+'Z');
      el.lend.setAttribute('d',poly([[sx(0),sy(0)],[sx(wb),sy((1-mu)*wb)],[sx(wb),sy(wb)],[sx(XM),sy(wb)]]));
      el.bank.setAttribute('d',poly([[sx(0),sy(0)],[sx(wb),sy(0)],[sx(XM),sy(XM-wb)]]));
      el.cutA.setAttribute('x1',C(sx(wb))); el.cutA.setAttribute('x2',C(sx(wb)));
      el.cutB.setAttribute('x1',C(PB.sx(wb))); el.cutB.setAttribute('x2',C(PB.sx(wb)));
      for(i=0;i<=240;i++){
        w=XM*i/240; f=w>0?phi((Math.log(w)+sig*sig/2)/sig)/(w*sig):0;
        pts.push([PB.sx(w),PB.sy(f)]);
        if(w<=wb) pd.push([PB.sx(w),PB.sy(f)]);
      }
      f=phi((Math.log(wb)+sig*sig/2)/sig)/(wb*sig); pd.push([PB.sx(wb),PB.sy(f)]);
      el.dline.setAttribute('d',poly(pts));
      el.dens.setAttribute('d',poly(pts)+'L'+R(PB.sx(XM))+','+R(PB.sy(0))+'L'+R(PB.sx(0))+','+R(PB.sy(0))+'Z');
      el.def.setAttribute('d',poly(pd)+'L'+R(PB.sx(wb))+','+R(PB.sy(0))+'L'+R(PB.sx(0))+','+R(PB.sy(0))+'Z');
      moveTo(el.tout,sx(YM-0.06)-4,sy(YM-0.06)+3);
      moveTo(el.tlend,PA.b.x+PA.b.w-4,sy(wb)-6);
      /* the banker's label sits beside the purple line, below it on the right, or above it where the box runs out */
      w=wb+0.55*(Math.min(XM,wb+YM)-wb);
      if(sx(w)+64<PA.b.x+PA.b.w){ el.tbank.setAttribute('text-anchor','start'); moveTo(el.tbank,sx(w)+8,sy(w-wb)+6); }
      else { el.tbank.setAttribute('text-anchor','end'); moveTo(el.tbank,sx(w)-8,sy(w-wb)-2); }
      /* the burned wedge is labelled above the diagonal, just left of the cutoff */
      moveTo(el.tloss,sx(wb*0.62)-4,sy(wb*0.62)-7);
      el.tloss.textContent=mu>0.04 && sx(wb)-PA.b.x>70?'μω burned':'';
      if(sx(wb)>PA.b.x+PA.b.w-40){ el.tcut.setAttribute('text-anchor','end'); moveTo(el.tcut,sx(wb)-5,PA.b.y+12); }
      else { el.tcut.setAttribute('text-anchor','start'); moveTo(el.tcut,sx(wb)+5,PA.b.y+12); }
      el.tdef.textContent='default F(ω̄) = '+pc(p.F,1);
      moveTo(el.tdef,PB.b.x+PB.b.w,PB.b.y-8);
      el.bb.setAttribute('x',R(x0)); el.bb.setAttribute('width',R(Math.max(0,bank*bar.w)));
      el.bl.setAttribute('x',R(x0+bank*bar.w)); el.bl.setAttribute('width',R(Math.max(0,lend*bar.w)));
      el.bm.setAttribute('x',R(x0+(bank+lend)*bar.w)); el.bm.setAttribute('width',R(Math.max(mug>0?1:0,mug*bar.w)));
      el.lab[0].textContent='banker 1 '+MINUS+' Γ = '+pc(bank,1);
      el.lab[1].textContent='lenders Γ '+MINUS+' μG = '+pc(lend,1);
      el.lab[2].textContent='monitoring μG = '+pc(mug,2);
      place(el.k,sx(wb),sy(wb),wb,'ω̄ = '+fmt(wb,2)+', default probability '+pc(p.F,1));
      cur={wbar:wb, mu:mu, sigma:sig, f:100*p.F, g:p.G, gam:p.Gam, mug:100*mug, bank:100*bank, lend:100*lend};
      if(!out) return;
      s='ω̄ = '+fmt(wb,2)+': F(ω̄) = '+pc(p.F,1)+' of bankers default   G(ω̄) = '+fmt(p.G,4)+'   Γ(ω̄) = '+fmt(p.Gam,4)+
        '\nbanker 1 '+MINUS+' Γ = '+fmt(bank,4)+'   lenders Γ '+MINUS+' μG = '+fmt(lend,4)+'   monitoring μG = '+fmt(mug,4);
      out.textContent=s;
    }
    dragIn(svg,function(){ return [W,H]; },function(){ return [PA&&PA.b,PB&&PB.b]; },function(p,i){
      var P=i===0?PA:PB; if(rw) rw.set(clamp(P.sx.inv(p[0]),0.05,2));
    },function(){ try{ el.k.focus({preventScroll:true}); }catch(err){} });
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('sigma' in st && rs) rs.set(+st.sigma);
        if('mu' in st && rm) rm.set(+st.mu);
        if('wbar' in st && rw) rw.set(+st.wbar);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The banker's choice and the premium against leverage, s(L) ---------- */
  NF.register('ma11-premium',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mu=0.1, sig=SIG0, lev=2, W=520, H=320, PL, PR, el={}, api, cur={}, LM=5, top, curveS, refS, eq, st;
    var rm=range(fig,'mu',2,function(v){ mu=v; solve(); draw(); if(api) api.changed(); }),
        rs=range(fig,'sigma',2,function(v){ sig=v; solve(); draw(); if(api) api.changed(); }),
        rl=range(fig,'lev',2,function(v){ lev=v; paint(); if(api) api.changed(); });
    if(rm){ mu=rm.v(); sig=rs.v(); lev=rl.v(); }
    onClick(fig,'.nfig-reset',function(){ api.set({mu:0.1, sigma:SIG0, lev:2}); });
    /* s(L) traced by the cutoff, from w = 0 (L = 1) until L passes LM */
    function trace(m,s){
      var t=wTop(m,s), wL=wAtL(LM*1.02,m,s,t), pts=[], i, w, d;
      for(i=0;i<=220;i++){ w=wL*Math.pow(i/220,1.5); d=deal(w,m,s); if(d.ok) pts.push([d.L,100*(d.x-1),w]); }
      return pts;
    }
    function solve(){
      top=wTop(mu,sig);
      curveS=trace(mu,sig);
      refS=(Math.abs(mu-0.1)>1e-9 || Math.abs(sig-SIG0)>1e-9)?trace(0.1,SIG0):null;
      eq=eqm(mu,{sig:sig, alpha:1, beta:BETA, N:N0, y:Y0, gam:false});
    }
    function ymax(){ var d=deal(wAtL(LM,mu,sig,top),mu,sig), v=100*(d.x-1); return clamp(Math.ceil(v*1.25/2)*2,4,30); }
    function draw(){
      var mL, ph, pw, gap=18, yM;
      W=measure(svg); mL=W<420?40:46;
      if(W>=600){ pw=Math.floor((W-2*mL-14-gap)/2); ph=Math.round(clamp(pw*0.78,170,250)); top=30;
        H=top+ph+44; el.bl={x:mL,y:top,w:pw,h:ph}; el.br={x:2*mL+pw+gap,y:top,w:pw,h:ph}; }
      else { pw=W-mL-14; ph=Math.round(clamp(pw*0.6,160,230)); top=30;
        el.bl={x:mL,y:top,w:pw,h:ph}; el.br={x:mL,y:top+ph+44+30,w:pw,h:ph}; H=el.br.y+ph+44; }
      frame(svg,W,H);
      yM=ymax();
      PR=box(svg,el.br,[1,LM],[0,yM],{xt:ticks(1,LM,4),yt:ticks(0,yM,4),title:'premium rᵏ/R '+MINUS+' 1, %',tin:mL-6});
      text(svg,PR.b.x+PR.b.w,PR.b.y+PR.b.h+30,'leverage L = (N + B)/N','nf-title','end');
      line(PR.gc,PR.sx(1),C(PR.sy(0)),PR.sx(LM),C(PR.sy(0)),'ma11-zero');
      if(refS) S('path',{d:curve(PR,refS),'class':'ma11-prem ma11-ref'},PR.gc);
      S('path',{d:curve(PR,curveS),'class':'ma11-prem'},PR.gc);
      el.eq=S('circle',{r:4.5,'class':'ma11-eqc'},PR.gc);
      el.teq=text(svg,0,0,'equilibrium','nf-lab nf-halo ma11-small');
      el.ts=text(svg,0,0,'s(L)','nf-lab nf-halo ma11-tprem ma11-it');
      el.tr=text(svg,0,0,refS?'μ = 0.1, σ = 0.37':'','nf-lab nf-halo ma11-small');
      el.gl=S('g',null,svg);
      el.k=knob(svg,'ma11-kprem','Leverage on the s(L) curve, arrow keys move it',function(d,big){ if(rl) rl.set(lev+d*(big?0.25:0.02)); });
      paint();
    }
    function paint(){
      var w=wAtL(lev,mu,sig,top), d=deal(w,mu,sig), x=d.x, pts=[], i, v, wm, yl, yh, dd, P, g=el.gl, a, Z, vmax, sp;
      while(g.firstChild) g.removeChild(g.firstChild);
      /* left: the banker's payoff L(w)(1 - Gamma(w)) at this premium, w on the axis; the hump's top is the chosen cutoff */
      wm=Math.min(Math.max(1.1,1.7*w),top*0.999);
      for(i=0;i<=200;i++){ v=wm*i/200; dd=parts(v,sig); a=1-x*(dd.Gam-mu*dd.G); pts.push([v,a>1e-9?(1-dd.Gam)/a:Infinity]); }
      vmax=d.V; sp=Math.max(vmax-1,0.004);
      yl=1-2.2*sp; yh=1+1.5*sp;
      P=box(g,el.bl,[0,wm],[yl,yh],{xt:ticks(0,wm,4),yt:ticks(yl,yh,4),yf:function(t){ return fmt(t,niceStep(yh-yl,4)<0.01?3:2); },title:'banker’s payoff L(1 '+MINUS+' Γ), in units of rᵏN',tin:el.bl.x-6});
      text(g,P.b.x+P.b.w,P.b.y+P.b.h+30,'cutoff ω̄','nf-title ma11-it','end');
      line(P.gc,P.b.x,C(P.sy(1)),P.b.x+P.b.w,C(P.sy(1)),'ma11-one');
      text(g,P.b.x+P.b.w-4,P.sy(1)+14,'L = 1, no loan','nf-lab nf-halo ma11-small','end');
      S('path',{d:curve(P,pts),'class':'ma11-bankc'},P.gc);
      line(P.gc,C(P.sx(w)),P.b.y,C(P.sx(w)),P.b.y+P.b.h,'ma11-cut');
      at(S('circle',{r:4.5,'class':'ma11-dcut'},P.gc),P.sx(w),P.sy(vmax));
      text(g,P.sx(w)+6,P.b.y+12,'ω̄ = '+fmt(w,3),'nf-lab nf-halo ma11-tcut');
      /* right: the knob on s(L) and the equilibrium with the households */
      at(el.eq,PR.sx(eq.L),PR.sy(100*eq.prem));
      moveTo(el.teq,PR.sx(eq.L)+8,PR.sy(100*eq.prem)+14);
      el.teq.textContent=Math.abs(PR.sx(eq.L)-PR.sx(lev))>40 && PR.sy(100*eq.prem)>PR.b.y+10?'equilibrium':'';
      a=curveS[curveS.length-1];
      if(a[1]>PR.yd[1]){ for(i=curveS.length-1;i>0 && curveS[i][1]>PR.yd[1]*0.9;i--); i=curveS[i]; } else i=a;
      moveTo(el.ts,Math.min(PR.sx(i[0])+6,PR.b.x+PR.b.w-30),PR.sy(i[1])-8);
      if(refS){ a=refS[Math.floor(refS.length*0.8)]; if(a){ el.tr.setAttribute('text-anchor','end'); moveTo(el.tr,Math.min(PR.sx(a[0])+40,PR.b.x+PR.b.w-4),PR.sy(a[1])+16); } }
      place(el.k,PR.sx(lev),PR.sy(clamp(100*(x-1),PR.yd[0],PR.yd[1])),lev,'L = '+fmt(lev,2)+', premium '+fmt(100*(x-1),2)+'%');
      Z=lev>1+1e-9?w*RK*lev/(lev-1):RK/x;
      cur={mu:mu, sigma:sig, lev:lev, prem:100*(x-1), wbar:w, f:100*d.F, z:Z, v:d.V, eqlev:eq.L, eqprem:100*eq.prem};
      if(!out) return;
      if(mu===0) out.textContent='μ = 0: lenders lose nothing in default, so rᵏ = R for every L; at that price the payoff is 1 for every cutoff: the contract is indeterminate'+
        '\nL = '+fmt(lev,2)+' needs ω̄ = '+fmt(w,3)+' (zero profit alone), default '+pc(d.F,1);
      else out.textContent='L = '+fmt(lev,2)+' needs the premium rᵏ/R = '+fmt(x,4)+' (+'+fmt(100*(x-1),2)+'%): ω̄ = '+fmt(w,3)+', default F(ω̄) = '+pc(d.F,1)+', loan rate Z = '+fmt(Z,4)+
        '\nbanker’s payoff L(1 '+MINUS+' Γ) = '+fmt(d.V,4)+'   equilibrium with the households (N = 1, y = 3.11): L = '+fmt(eq.L,3)+', premium '+fmt(100*eq.prem,2)+'%';
    }
    dragIn(svg,function(){ return [W,H]; },function(){ return [PR&&PR.b]; },function(p){ if(rl) rl.set(clamp(PR.sx.inv(p[0]),1,LM)); },
      function(){ try{ el.k.focus({preventScroll:true}); }catch(err){} });
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(s){
        if('mu' in s && rm) rm.set(+s.mu);
        if('sigma' in s && rs) rs.set(+s.sigma);
        if('lev' in s && rl) rl.set(+s.lev);
      }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- small multiples for the equilibrium figures ---------- */
  function grid(W,n){
    var mL=W<420?40:46, gap=16, cols=W>=470?2:1, pw=Math.floor((W-cols*mL-14-(cols-1)*gap)/cols), ph=Math.round(clamp(pw*0.56,92,150)),
        top=26, rowH=ph+26+30, out=[], i;
    for(i=0;i<n;i++) out.push({x:mL+(i%cols)*(pw+gap+mL),y:top+Math.floor(i/cols)*rowH,w:pw,h:ph});
    return {boxes:out, H:top+Math.ceil(n/cols)*rowH-12, mL:mL};
  }
  function span(vals,pad,floor0){
    var lo=Infinity, hi=-Infinity, i, d, st;
    for(i=0;i<vals.length;i++){ if(!isFinite(vals[i])) continue; lo=Math.min(lo,vals[i]); hi=Math.max(hi,vals[i]); }
    if(floor0) lo=Math.min(lo,0);
    d=hi-lo; if(d<1e-9){ d=Math.max(Math.abs(hi)*0.02,0.01); lo-=d/2; hi+=d/2; }
    lo-=d*pad; hi+=d*pad; if(floor0 && lo<0 && Math.min.apply(null,vals.filter(isFinite))>=0) lo=0;
    st=niceStep(hi-lo,3);
    return [Math.floor(lo/st+1e-9)*st,Math.ceil(hi/st-1e-9)*st];
  }

  /* ---------- 3. Raising mu: the equilibrium, and the horse race for leverage ---------- */
  NF.register('ma11-mu',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mus=0.1, alpha=1, sig=SIG0, gam=false, W=520, H=420, Ps=[], el={}, api, cur={}, path=[], fb, rc, MX=0.5;
    var specs=[
      {k:'spread', t:'spread rᵏ '+MINUS+' R, pp', cls:'ma11-prem', f:function(e){ return 100*e.spread; }, z:true},
      {k:'w', t:'cutoff ω̄', cls:'ma11-cutc', f:function(e){ return e.w; }},
      {k:'L', t:'leverage L', cls:'ma11-levc', f:function(e){ return e.L; }},
      {k:'loss', t:'welfare loss, % of consumption', cls:'ma11-welc', f:function(e){ return 100*e.loss; }, z:true}
    ];
    var rm=range(fig,'mu',2,function(v){ mus=v; mark(); }), ra=range(fig,'alpha',1,function(v){ alpha=v; solve(); draw(); }),
        rs=range(fig,'sigma',2,function(v){ sig=v; solve(); draw(); });
    if(rm){ mus=rm.v(); alpha=ra.v(); sig=rs.v(); }
    var g0=seg(fig,'data-loss',function(v){ gam=v==='gam'; solve(); draw(); });
    gam=g0==='gam';
    onClick(fig,'.nfig-reset',function(){ api.set({mu:0.1, alpha:1, sigma:SIG0, loss:'g'}); });
    function opts(){ return {sig:sig, alpha:alpha, beta:BETA, N:N0, y:Y0, gam:gam}; }
    function solve(){
      var o=opts(), i, m, e;
      fb=firstBest(o); path=[];
      for(i=0;i<=40;i++){ m=MX*i/40; e=eqm(m,o); e.loss=ceLoss(e.W,fb,o); e.mu=m; path.push(e); }
    }
    function draw(){
      var lay, i, sp, vals, P;
      W=measure(svg); lay=grid(W,4); H=lay.H+8; frame(svg,W,H); Ps=[];
      for(i=0;i<4;i++){
        sp=specs[i]; vals=path.map(sp.f);
        P=box(svg,lay.boxes[i],[0,MX],span(vals,0.12,sp.z),{xt:[0,0.1,0.2,0.3,0.4,0.5],ny:3,title:sp.t,tin:lay.mL-6});
        text(svg,P.b.x+P.b.w,P.b.y+P.b.h+28,'μ','nf-title ma11-it','end');
        S('path',{d:curve(P,path.map(function(e){ return [e.mu,sp.f(e)]; })),'class':sp.cls},P.gc);
        P.mk=line(P.gc,0,P.b.y,0,P.b.y+P.b.h,'ma11-mk');
        P.dot=S('circle',{r:4,'class':'ma11-dot'},P.gc);
        Ps.push(P);
      }
      mark();
    }
    function mark(){
      var o=opts(), r=race(mus,o), e=r.e, i, P, v, s, lrise=path[path.length-1].L-path[0].L, wrise=path[path.length-1].w-path[0].w;
      e.loss=ceLoss(e.W,fb,o);
      for(i=0;i<4;i++){ P=Ps[i]; v=specs[i].f(e); P.mk.setAttribute('x1',C(P.sx(mus))); P.mk.setAttribute('x2',C(P.sx(mus))); at(P.dot,P.sx(mus),P.sy(v)); }
      rc=r;
      cur={mu:mus, alpha:alpha, sigma:sig, loss:gam?'gam':'g', r:e.R, spread:100*e.spread, wbar:e.w, f:100*e.F, lev:e.L, b:e.B, c1:e.c1, c2:e.c2,
        wloss:100*e.loss, dl:r.dl, dlp:r.dlp, dlr:r.dl-r.dlp, dw:r.dw, lrise:lrise, wrise:wrise, mug:100*e.mug};
      if(api) api.changed();
      if(!out) return;
      s='μ = '+fmt(mus,2)+': R = '+fmt(e.R,4)+', spread '+fmt(100*e.spread,2)+' pp   ω̄ = '+fmt(e.w,3)+' ('+pc(e.F,1)+' default)   L = '+fmt(e.L,3)+', B = '+fmt(e.B,3)+
        '\nc₁ = '+fmt(e.c1,3)+', c₂ = '+fmt(e.c2,3)+'   monitoring burns '+pc(e.mug,2)+' of output   welfare loss '+pc(e.loss,3)+
        '\ndL/dμ = '+sg(r.dl,3)+': '+sg(r.dlp,3)+' at a fixed R, '+sg(r.dl-r.dlp,3)+' through the fall in R';
      out.textContent=s;
      if(gam) warn(out,'\nloss charged as μΓ: '+pc(e.mug,1)+' of output destroyed, far more than the model’s μG');
    }
    function setMu(p,i){ var P=Ps[i]; if(rm) rm.set(clamp(P.sx.inv(p[0]),0.02,MX)); }
    dragIn(svg,function(){ return [W,H]; },function(){ return Ps.map(function(P){ return P.b; }); },setMu,null);
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){
        if('loss' in st) press(fig,'data-loss',String(st.loss));
        if('sigma' in st && rs) rs.set(+st.sigma);
        if('alpha' in st && ra) ra.set(+st.alpha);
        if('mu' in st && rm) rm.set(+st.mu);
      }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. More net worth, same total resources: N up, y down ---------- */
  NF.register('ma11-networth',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mu=0.1, Ns=1, W=520, H=420, Ps=[], api, cur={}, path=[], NL=0.6, NH=2.2, NSTAR;
    var specs=[
      {t:'spread rᵏ '+MINUS+' R, pp', cls:'ma11-prem', f:function(e){ return 100*e.spread; }, z:true},
      {t:'cutoff ω̄', cls:'ma11-cutc', f:function(e){ return e.w; }, z:true},
      {t:'leverage L', cls:'ma11-levc', f:function(e){ return e.L; }},
      {t:'welfare loss, % of consumption', cls:'ma11-welc', f:function(e){ return 100*e.loss; }, z:true}
    ];
    var rm=range(fig,'mu',2,function(v){ mu=v; solve(); draw(); }), rn=range(fig,'n',2,function(v){ Ns=v; mark(); });
    if(rm){ mu=rm.v(); Ns=rn.v(); }
    onClick(fig,'.nfig-reset',function(){ if(rm) rm.set(0.1); if(rn) rn.set(1); });
    /* N* = first best net worth: with B = 0 and R = r^k the Euler equation holds at c1 = TOT - N, c2 = r^k N */
    NSTAR=TOT*BETA/(1+BETA);
    function at(N){ var o={sig:SIG0, alpha:1, beta:BETA, N:N, y:TOT-N, gam:false}, e=eqm(mu,o); e.loss=ceLoss(e.W,firstBest(o),o); e.N=N; return e; }
    function solve(){ var i, N; path=[]; for(i=0;i<=60;i++){ N=NL+(NH-NL)*i/60; path.push(at(N)); } }
    function draw(){
      var lay, i, sp, vals, P, xt=[0.6,1,1.4,1.8,2.2];
      W=measure(svg); lay=grid(W,4); H=lay.H+8; frame(svg,W,H); Ps=[];
      for(i=0;i<4;i++){
        sp=specs[i]; vals=path.map(sp.f);
        P=box(svg,lay.boxes[i],[NL,NH],span(vals,0.12,sp.z),{xt:xt,ny:3,title:sp.t,tin:lay.mL-6});
        text(svg,P.b.x+P.b.w,P.b.y+P.b.h+28,'net worth N (y = 4.11 '+MINUS+' N)','nf-title','end');
        line(P.gc,C(P.sx(NSTAR)),P.b.y,C(P.sx(NSTAR)),P.b.y+P.b.h,'ma11-star');
        if(i===0) text(svg,P.sx(NSTAR)-4,P.b.y+12,'N* = '+fmt(NSTAR,2),'nf-lab nf-halo ma11-small','end');
        S('path',{d:curve(P,path.map(function(e){ return [e.N,sp.f(e)]; })),'class':sp.cls},P.gc);
        P.mk=line(P.gc,0,P.b.y,0,P.b.y+P.b.h,'ma11-mk');
        P.dot=S('circle',{r:4,'class':'ma11-dot'},P.gc);
        Ps.push(P);
      }
      mark();
    }
    function mark(){
      var e=at(Ns), i, P, v;
      for(i=0;i<4;i++){ P=Ps[i]; v=specs[i].f(e); P.mk.setAttribute('x1',C(P.sx(Ns))); P.mk.setAttribute('x2',C(P.sx(Ns))); at(P.dot,P.sx(Ns),P.sy(v)); }
      cur={mu:mu, n:Ns, y:TOT-Ns, r:e.R, spread:100*e.spread, wbar:e.w, f:100*e.F, lev:e.L, b:e.B, c1:e.c1, c2:e.c2, wloss:100*e.loss, nstar:NSTAR, corner:e.corner};
      if(api) api.changed();
      if(!out) return;
      out.textContent='N = '+fmt(Ns,2)+', y = '+fmt(TOT-Ns,2)+': R = '+fmt(e.R,4)+', spread '+fmt(100*e.spread,3)+' pp   ω̄ = '+fmt(e.w,3)+' ('+pc(e.F,2)+' default)   L = '+fmt(e.L,3)+', B = '+fmt(e.B,3)+
        '\nc₁ = '+fmt(e.c1,3)+', c₂ = '+fmt(e.c2,3)+', welfare loss '+pc(e.loss,3)+
        '\nfirst best from N* = 4.11β/(1 + β) = '+fmt(NSTAR,3)+': B = 0, L = 1, nobody defaults, c₁ = '+fmt(TOT-NSTAR,3)+', c₂ = '+fmt(RK*NSTAR,3);
    }
    function setN(p,i){ var P=Ps[i]; if(rn) rn.set(clamp(P.sx.inv(p[0]),NL,NH)); }
    dragIn(svg,function(){ return [W,H]; },function(){ return Ps.map(function(P){ return P.b; }); },setN,null);
    api=NF.api({
      get:function(){ var r={}, k; for(k in cur) r[k]=cur[k]; return r; },
      set:function(st){ if('mu' in st && rm) rm.set(+st.mu); if('n' in st && rn) rn.set(+st.n); }
    });
    solve(); draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
