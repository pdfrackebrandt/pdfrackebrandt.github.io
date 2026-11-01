/* Core Micro L6 figures: the Allais paradox in the probability triangle, the St. Petersburg game, the certainty
   equivalent and risk premium on a concave utility, the Arrow Pratt approximation, and risk premia across wealth.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi6.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;
  var clipN=0;

  /* ---------- shared ---------- */
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  /* a slider that only matters in some modes is dimmed and disabled in the others */
  function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
  /* a step of 1, 2, 2.5 or 5 times a power of ten that cuts span into about n pieces */
  function niceStep(span,n){
    var raw=span/n, p=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/p;
    return p*(f<1.5?1:f<2.25?2:f<3.5?2.5:f<7.5?5:10);
  }
  function ticks(lo,hi,n){ var s=niceStep(hi-lo,n), t=[], v; for(v=Math.ceil(lo/s-1e-9)*s;v<=hi+1e-9;v+=s) t.push(Math.round(v/s)*s); return {t:t, s:s}; }
  function dec(step){ return step>=1?0:step>=0.1?1:step>=0.01?2:3; }
  /* frame of a plot: grid, axes and tick labels; xs and ys map data to svg units */
  function axes(g,xs,ys,xt,yt,xd,yd){
    var x0=xs.r0, x1=xs.r1, y0=ys.r0, y1=ys.r1, i, v;
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,x0,C(ys(v)),x1,C(ys(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,x0-7,ys(v)+4,fmt(v,yd),null,'end'); }
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(xs(v)),y0,C(xs(v)),y1,'nf-grid'); text(g,xs(v),y0+18,fmt(v,xd),null,'middle'); }
    line(g,x0,C(y0),x1,C(y0),'nf-ax');
  }
  function scale(d0,d1,r0,r1){ var f=lin(d0,d1,r0,r1); f.r0=r0; f.r1=r1; f.d0=d0; f.d1=d1; return f; }
  /* a focusable round handle, moved by dragging or the arrow keys */
  function handle(svg,knob,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+knob},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, d=0;
      if(k==='ArrowRight'||k==='ArrowUp') d=1; else if(k==='ArrowLeft'||k==='ArrowDown') d=-1; else return;
      e.preventDefault(); onKey(d,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+(+now).toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever handle is nearest the pointer; pts() gives svg positions, move(i,x,y) takes the new one */
  function dragger(svg,size,pts,move,focus){
    var cur=-1, off=[0,0];
    function near(p){
      var P=pts(), best=-1, bd=26, i, d;
      for(i=0;i<P.length;i++){ if(!P[i]) continue; d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
      return best;
    }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), i=near(p), P;
      if(i<0) return;
      P=pts(); cur=i; off=[P[i][0]-p[0],P[i][1]-p[1]];
      e.preventDefault(); capture(svg,e);
      if(focus) focus(i);
      svg.classList.add('is-drag');
    });
    svg.addEventListener('pointermove',function(e){
      if(cur<0) return;
      var s=size(), p=local(svg,e,s[0],s[1]);
      move(cur,p[0]+off[0],p[1]+off[1]);
    });
    function stop(){ cur=-1; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size();
      if(near(local(svg,e.touches[0],s[0],s[1]))>=0) e.preventDefault();
    },{passive:false});
  }
  function focusOf(list){ return function(i){ try{ list()[i].focus({preventScroll:true,focusVisible:false}); }catch(err){} }; }
  /* labels on one row, pushed apart so they never overlap; items are [x, text, class] */
  function spread(g,items,y,gap){
    var s=items.slice().sort(function(a,b){ return a[0]-b[0]; }), xs=[], i, j, shift;
    for(i=0;i<s.length;i++) xs.push(s[i][0]);
    for(j=0;j<4;j++){
      for(i=1;i<xs.length;i++) if(xs[i]-xs[i-1]<gap){ shift=(gap-(xs[i]-xs[i-1]))/2; xs[i-1]-=shift; xs[i]+=shift; }
    }
    for(i=0;i<s.length;i++) text(g,xs[i],y,s[i][1],s[i][2],'middle');
  }
  /* money with thousands separators, or as a power of ten once it is large */
  var SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','−':'⁻','m':'ᵐ','K':'ᴷ'};
  function sup(n){ return String(n).split('').map(function(c){ return SUP[c]||c; }).join(''); }
  function commas(v,d){ var s=v.toFixed(d), p=s.split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,','); return p.join('.'); }
  /* a positive number given by its base ten logarithm, written for a reader */
  function big(l10,d){
    var e, m;
    if(l10<6) return commas(Math.pow(10,l10),d);
    if(l10<1e6){ e=Math.floor(l10); m=Math.pow(10,l10-e); if(m>=9.995){ m=1; e++; } return m.toFixed(2)+' × 10'+sup(e); }
    e=Math.floor(Math.log10(l10)); m=l10/Math.pow(10,e);
    return '10 to the power '+m.toFixed(2)+' × 10'+sup(e);
  }

  /* ---------- 1. The Allais paradox in the probability triangle ---------- */
  NF.register('mi6-allais',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var v=0.8, w=3, model='eu', W=520, H=340, el={}, T, api, cur={};
    var rv=range(fig,'v',2,function(x){ v=x; update(); }), rw=range(fig,'w',1,function(x){ w=x; update(); });
    if(rv) v=rv.v();
    if(rw) w=rw.v();
    model=seg(fig,'data-model',function(m){ model=m; lock(rw,model!=='fan'); update(); }) || 'eu';
    lock(rw,model!=='fan');
    /* each lottery as [Pr($0), Pr($5M)]; Pr($1M) is what is left */
    var L={A:[0,0], B:[0.01,0.10], C:[0.89,0], D:[0.90,0.10]};
    function wt(){ return model==='fan'?w:1; }
    /* weighted utility (Chew 1983) with weight w on $0 and 1 on the other prizes; w = 1 is expected utility.
       u($0) = 0, u($1M) = v, u($5M) = 1 */
    function V(p){ var p0=p[0], p5=p[1], p1=1-p0-p5; return (p1*v+p5)/(p0*wt()+p1+p5); }
    /* the indifference line at level c is Pr($5M) = s Pr($0) + a, straight for every c (betweenness) */
    function lineAt(c){ var s=(c*wt()+v-c)/(1-v); return {s:s, a:-(v-c)/(1-v)}; }
    function draw(){
      var side, x0, y0, g, i, q, tri, id, cp;
      W=measure(svg);
      side=Math.min(W-118,270); x0=Math.round(Math.max(56,(W-side)/2-12)); y0=34;
      H=y0+side+50; frame(svg,W,H);
      T={x0:x0, y0:y0, side:side, px:function(p0){ return x0+p0*side; }, py:function(p5){ return y0+(1-p5)*side; }};
      g=S('g',null,svg);
      tri=[[T.px(0),T.py(0)],[T.px(1),T.py(0)],[T.px(0),T.py(1)]];
      for(i=1;i<4;i++){ q=i/4; line(g,C(T.px(q)),T.py(0),C(T.px(q)),T.py(1-q),'nf-grid'); line(g,T.px(0),C(T.py(q)),T.px(1-q),C(T.py(q)),'nf-grid'); }
      for(i=0;i<=4;i++){ q=i/4; text(g,T.px(q),T.py(0)+15,tl(q),null,'middle'); if(i) text(g,T.px(0)-7,T.py(q)+4,tl(q),null,'end'); }
      text(g,T.px(1),T.py(0)+31,'Pr($0)','nf-title','end');
      text(g,T.px(0)-7,T.py(1)-14,'Pr($5M)','nf-title','end');
      text(g,T.px(0.06),T.py(1)+4,'$5M for sure','nf-lab');
      /* right of its corner, clear of C and D */
      text(g,T.px(1)+7,T.py(0)-15,'$0','nf-lab'); text(g,T.px(1)+7,T.py(0)-3,'for sure','nf-lab');
      id='mi6c'+(++clipN);
      cp=S('clipPath',{id:id},S('defs',null,svg)); S('path',{d:poly(tri)+'Z'},cp);
      el.lines=S('g',{'clip-path':'url(#'+id+')'},svg);
      S('path',{d:poly(tri)+'Z','class':'mi6-tri'},svg);
      /* the direction of preference: towards more $5M and less $0 */
      el.better=S('g',{'class':'mi6-better'},svg);
      el.seg=[line(svg,0,0,0,0,'mi6-cc'),line(svg,0,0,0,0,'mi6-cc')];
      el.dot={}; el.lab={};
      ['A','B','C','D'].forEach(function(k){ el.dot[k]=S('circle',{r:4.5,'class':'mi6-lot'},svg); el.lab[k]=text(svg,0,0,k,'mi6-lotlab nf-halo','middle'); });
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var va=V(L.A), vb=V(L.B), vc=V(L.C), vd=V(L.D), j, c, ln, p1, p2, cls, k, pt, la=lineAt(va), lc=lineAt(vc), p1s, p2s, s, sa, sc, d1, d2;
      while(el.lines.firstChild) el.lines.removeChild(el.lines.firstChild);
      /* faint lines through evenly spaced points of the hypotenuse, darker ones through A and C */
      for(j=1;j<12;j++){
        c=V([1-j/12,j/12]); ln=lineAt(c);
        line(el.lines,T.px(-1),T.py(ln.a-ln.s),T.px(2),T.py(ln.a+2*ln.s),'mi6-ind');
      }
      [la,lc].forEach(function(l){ line(el.lines,T.px(-1),T.py(l.a-l.s),T.px(2),T.py(l.a+2*l.s),'mi6-ind mi6-indk'); });
      while(el.better.firstChild) el.better.removeChild(el.better.firstChild);
      p1=[T.px(0.52),T.py(0.16)]; p2=[T.px(0.40),T.py(0.34)];
      line(el.better,p1[0],p1[1],p2[0],p2[1],'mi6-barrow');
      d1=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]); s=[(p2[0]-p1[0])/d1,(p2[1]-p1[1])/d1];
      S('path',{d:poly([[p2[0]+s[0]*6,p2[1]+s[1]*6],[p2[0]-s[1]*4.5,p2[1]+s[0]*4.5],[p2[0]+s[1]*4.5,p2[1]-s[0]*4.5]])+'Z','class':'mi6-bhead'},el.better);
      text(el.better,p1[0]+6,p1[1]+12,'better','nf-lab');
      setLine(el.seg[0],T.px(L.A[0]),T.py(L.A[1]),T.px(L.B[0]),T.py(L.B[1]));
      setLine(el.seg[1],T.px(L.C[0]),T.py(L.C[1]),T.px(L.D[0]),T.py(L.D[1]));
      d1=va-vb; d2=vc-vd;
      p1s=Math.abs(d1)<5e-7?'tie':d1>0?'A':'B'; p2s=Math.abs(d2)<5e-7?'tie':d2>0?'C':'D';
      for(k in L){
        pt=L[k]; at(el.dot[k],T.px(pt[0]),T.py(pt[1]));
        cls=(k===p1s||k===p2s)?'mi6-lot mi6-pick':'mi6-lot';
        el.dot[k].setAttribute('class',cls);
      }
      moveTo(el.lab.A,T.px(0)-11,T.py(0)+4);
      moveTo(el.lab.B,T.px(0.01)+12,T.py(0.10)+2);
      moveTo(el.lab.C,T.px(0.89)-12,T.py(0)-8);
      moveTo(el.lab.D,T.px(0.90)+12,T.py(0.10)+2);
      sa=la.s; sc=lc.s;
      cur={model:model, v:v, w:model==='fan'?w:1, va:va, vb:vb, vc:vc, vd:vd, dab:d1, dcd:d2, pick1:p1s, pick2:p2s,
        allais:p1s==='A' && p2s==='D', sa:sa, sc:sc};
      if(!out) return;
      function rel(a,b,x,y){ return Math.abs(a-b)<5e-7?x+' ∼ '+y:a>b?x+' ≻ '+y:y+' ≻ '+x; }
      s=(model==='eu'?'expected utility: every indifference line has slope '+fmt(sa,2):
        'weighted utility, weight '+fmt(w,1)+' on $0: slope '+fmt(sa,2)+' through A, '+fmt(sc,2)+' through C')+
        '; the red segments have slope 10'+
        '\nV(A) = '+fmt(va,3)+', V(B) = '+fmt(vb,3)+': '+rel(va,vb,'A','B')+
        '   V(C) = '+fmt(vc,3)+', V(D) = '+fmt(vd,3)+': '+rel(vc,vd,'C','D');
      out.textContent=s;
      if(cur.allais) warn(out,'\nA and D: the Allais pattern, which no expected utility can produce');
    }
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('model' in st) NF.press(fig,'data-model',String(st.model));
        if('v' in st && rv) rv.set(+st.v);
        if('w' in st && rw) rw.set(+st.w);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. The St. Petersburg game, with a bank of 2^K ---------- */
  NF.register('mi6-stpete',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var util='lin', prize='two', K=10, W=520, H=270, el={}, api, cur={}, SC=50;
    var rk=range(fig,'k',0,function(x){ K=Math.round(x); update(); });
    if(rk) K=Math.round(rk.v());
    util=seg(fig,'data-util',function(x){ util=x; draw(); }) || 'lin';
    prize=seg(fig,'data-prize',function(x){ prize=x; draw(); }) || 'two';
    /* the prize when the first tail comes on toss m, as its natural log: 2^m, or Menger's e^(2^m) */
    function lnX(m){ return prize==='two'?m*Math.LN2:Math.pow(2,m); }
    /* probability of payout index m when the bank can pay at most prize K: tails first on toss m < K, or K heads in a row and then anything */
    function prob(m){ return m<K?Math.pow(2,-m):Math.pow(2,1-K); }
    function uOf(m){ var l=lnX(m); return util==='lin'?Math.exp(l):util==='log'?l:1-Math.exp(-Math.exp(l)/SC); }
    function solve(){
      var m, eu=0, l10=null, lse=-Infinity, a, b, ce, cl10;
      if(util==='lin' && prize==='super'){
        /* the sum is astronomically large, so it is kept as a logarithm */
        for(m=1;m<=K;m++){ a=Math.log(prob(m))+lnX(m); b=Math.max(lse,a); lse=b+Math.log(Math.exp(lse-b)+Math.exp(a-b)); }
        l10=lse/Math.LN10; eu=l10<300?Math.pow(10,l10):Infinity; ce=eu; cl10=l10;
      } else {
        for(m=1;m<=K;m++) eu+=prob(m)*uOf(m);
        if(util==='lin') ce=eu; else if(util==='log') ce=Math.exp(eu); else ce=-SC*Math.log(1-eu);
        cl10=util==='log'?eu/Math.LN10:Math.log10(ce);
      }
      return {eu:eu, ce:ce, l10:l10, cl10:cl10};
    }
    function draw(){
      var items=[['rect','mi6-bar','first tail on toss m'],['rect','mi6-bar mi6-last','K heads in a row: the bank pays all it has']], rows;
      W=measure(svg); H=280; frame(svg,W,H);
      rows=key(S('g',null,svg),items,46,13,W-8);
      el.top=rows*16+22;
      el.g=S('g',null,svg);
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var g=el.g, sol=solve(), m, vals=[], top=el.top, bot=H-38, x0=46, x1=W-12, ymax, tk, xs, ys, bw, v, h, cls, s, every, us, cs, eus;
      while(g.firstChild) g.removeChild(g.firstChild);
      for(m=1;m<=K;m++) vals.push(util==='lin' && prize==='super'?Math.exp(Math.min(700,Math.log(prob(m))+lnX(m))):prob(m)*uOf(m));
      ymax=util==='lin' && prize==='super'?4:Math.max.apply(null,vals)*1.12;
      tk=ticks(0,ymax,4); ymax=Math.max(ymax,tk.t[tk.t.length-1]);
      xs=scale(0.5,40.5,x0,x1); ys=scale(0,ymax,bot,top);
      axes(g,{r0:x0,r1:x1},ys,[],tk.t,0,dec(tk.s));
      bw=Math.max(2,(x1-x0)/40-2);
      every=W<480?10:5;
      for(m=1;m<=K;m++){
        v=vals[m-1]; h=Math.min(v,ymax);
        cls=m===K?'mi6-bar mi6-last':'mi6-bar';
        S('rect',{x:R(xs(m)-bw/2),y:R(ys(h)),width:R(bw),height:R(Math.max(0,ys(0)-ys(h))),'class':cls},g);
        if(v>ymax) S('path',{d:'M'+R(xs(m)-bw/2)+','+R(top-2)+'L'+R(xs(m))+','+R(top-8)+'L'+R(xs(m)+bw/2)+','+R(top-2)+'Z','class':'mi6-off'},g);
      }
      for(m=1;m<=40;m++) if(m===1 || m%every===0) text(g,xs(m),bot+18,String(m),null,'middle');
      text(g,x1,bot+34,'toss m on which the first tail comes','nf-title','end');
      us=util==='lin'?'p × x':util==='log'?'p × ln x':'p × u(x)';
      text(g,x0-7,top-8,us,'nf-title','start');
      /* readout */
      if(prize==='two') s='the bank holds 2'+sup('K')+' = $'+commas(Math.pow(2,K),0)+' (K = '+K+')';
      else s='prizes e^(2'+sup('m')+'), and the bank holds the prize for toss K = '+K;
      if(util==='lin'){
        eus=prize==='two'?commas(sol.eu,2):big(sol.l10,2);
        cs=eus;
        s+='\nE[x] = '+(prize==='two'?'':'about ')+eus+(prize==='two'?': each toss before K adds 2'+sup('−m')+' × 2'+sup('m')+' = 1':'')+
          ', so a risk neutral player’s certainty equivalent is $'+cs;
      } else if(util==='log'){
        eus=commas(sol.eu,3); cs=big(sol.cl10,2);
        s+='\nE[ln x] = '+eus+(prize==='two'?' (2 ln 2 = 1.386 with an unlimited bank)':'')+'   C = e^E[ln x] = $'+cs;
      } else {
        eus=commas(sol.eu,4); cs=big(sol.cl10,2);
        s+='\nu(x) = 1 '+MINUS+' e^('+MINUS+'x/50) never exceeds 1   E[u] = '+eus+'   C = '+MINUS+'50 ln(1 '+MINUS+' E[u]) = $'+cs;
      }
      cur={util:util, prize:prize, k:K, eu:sol.eu, ce:sol.ce, eus:eus, cs:cs};
      if(out) out.textContent=s;
    }
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('util' in st) NF.press(fig,'data-util',String(st.util));
        if('prize' in st) NF.press(fig,'data-prize',String(st.prize));
        if('k' in st && rk) rk.set(+st.k);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* CRRA utility (x^(1 - r) - 1)/(1 - r), the log at r = 1, and its inverse */
  function crra(x,r){ return Math.abs(r-1)<1e-9?Math.log(x):(Math.pow(x,1-r)-1)/(1-r); }
  function crraInv(y,r){ return Math.abs(r-1)<1e-9?Math.exp(y):Math.pow(1+(1-r)*y,1/(1-r)); }
  function crraName(r){ return Math.abs(r)<1e-9?'u = x, risk neutral':Math.abs(r-1)<1e-9?'u = ln x':'u = (x^(1 '+MINUS+' r) '+MINUS+' 1)/(1 '+MINUS+' r)'; }

  /* ---------- 3. Certainty equivalent and risk premium of a two prize lottery ---------- */
  NF.register('mi6-ce',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var r=1, p=0.5, X=[2,10], W=520, H=320, XMAX=12, el={}, hs=[], xs, ys, F, api, cur={};
    var rr=range(fig,'r',1,function(v){ r=v; update(); }), rp=range(fig,'p',2,function(v){ p=v; update(); });
    if(rr) r=rr.v();
    if(rp) p=rp.v();
    function put(i,x){
      x=clamp(Math.round(x*2)/2,0.5,XMAX-0.5);
      if(i===0) x=Math.min(x,X[1]-0.5); else x=Math.max(x,X[0]+0.5);
      X[i]=x;
    }
    function stats(){
      var x1=X[0], x2=X[1], m=(1-p)*x1+p*x2, va=p*(1-p)*(x2-x1)*(x2-x1), eu=(1-p)*crra(x1,r)+p*crra(x2,r), ce=Math.abs(r)<1e-9?m:crraInv(eu,r);
      return {x1:x1, x2:x2, m:m, va:va, eu:eu, ce:ce, rp:m-ce, ra:r/m, ap:0.5*(r/m)*va};
    }
    function draw(){
      var top=16, bot, x0=62, x1;
      W=measure(svg); H=W<440?300:320; frame(svg,W,H);
      bot=H-56; x1=W-14;
      xs=scale(0,XMAX,x0,x1); ys=scale(-0.32,1.3,bot,top);
      F={top:top, bot:bot, x0:x0, x1:x1};
      el.bg=S('g',null,svg);
      el.gc=clip(svg,x0,top,x1-x0,bot-top);
      el.curve=S('path',{'class':'nf-line'},el.gc);
      el.guides=S('g',null,svg);
      el.chord=line(svg,0,0,0,0,'mi6-chord');
      el.br=S('g',{'class':'mi6-pbr'},svg);
      el.dots=S('g',null,svg);
      el.labs=S('g',null,svg);
      hs=[handle(svg,'mi6-kx','Low prize x1, arrow keys move it',function(d,big){ put(0,X[0]+d*(big?2:0.5)); update(); }),
          handle(svg,'mi6-kx','High prize x2, arrow keys move it',function(d,big){ put(1,X[1]+d*(big?2:0.5)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var st=stats(), u1=crra(st.x1,r), u2=crra(st.x2,r), du=u2-u1, i, x, pts=[], g, yE, yU, b, lo, hi, y0=F.bot, s, kind;
      function Y(u){ return ys((u-u1)/du); }
      g=el.bg; while(g.firstChild) g.removeChild(g.firstChild);
      for(i=0;i<=XMAX;i+=2){ line(g,C(xs(i)),F.top,C(xs(i)),y0,'nf-grid'); text(g,xs(i),y0+19,String(i),null,'middle'); }
      line(g,F.x0,C(y0),F.x1,C(y0),'nf-ax');
      line(g,C(F.x0),F.top,C(F.x0),y0,'nf-ax');
      text(g,F.x1,y0+50,'money x','nf-title','end');
      text(g,F.x0-7,F.top+4,'u','nf-title mi6-it','end');
      for(i=0;i<=360;i++){ x=0.15+(XMAX-0.15)*i/360; pts.push([xs(x),clamp(Y(crra(x,r)),-2000,4000)]); }
      el.curve.setAttribute('d',poly(pts));
      yE=Y(st.eu); yU=Y(crra(st.m,r));
      g=el.guides; while(g.firstChild) g.removeChild(g.firstChild);
      /* dashed guides: the prizes up to the curve, E[u] across to the curve at C, and C, x bar down to the axis */
      line(g,xs(st.x1),y0,xs(st.x1),Y(u1),'nf-guide'); line(g,xs(st.x2),y0,xs(st.x2),Y(u2),'nf-guide');
      line(g,F.x0,Y(u1),xs(st.x1),Y(u1),'nf-hread'); line(g,F.x0,Y(u2),xs(st.x2),Y(u2),'nf-hread');
      line(g,F.x0,yE,Math.max(xs(st.m),xs(st.ce)),yE,'nf-hread');
      line(g,xs(st.m),y0,xs(st.m),Math.min(yE,yU),'nf-guide');
      line(g,xs(st.ce),y0,xs(st.ce),yE,'nf-guide');
      setLine(el.chord,xs(st.x1),Y(u1),xs(st.x2),Y(u2));
      g=el.dots; while(g.firstChild) g.removeChild(g.firstChild);
      S('circle',{cx:R(xs(st.x1)),cy:R(Y(u1)),r:4,'class':'nf-dot'},g);
      S('circle',{cx:R(xs(st.x2)),cy:R(Y(u2)),r:4,'class':'nf-dot'},g);
      S('circle',{cx:R(xs(st.m)),cy:R(yU),r:4,'class':'nf-dot'},g);
      S('circle',{cx:R(xs(st.m)),cy:R(yE),r:4.5,'class':'mi6-eu'},g);
      S('circle',{cx:R(xs(st.ce)),cy:R(yE),r:4,'class':'nf-dot'},g);
      /* the risk premium: a red bracket from C to x bar just above the axis */
      g=el.br; while(g.firstChild) g.removeChild(g.firstChild);
      lo=Math.min(xs(st.ce),xs(st.m)); hi=Math.max(xs(st.ce),xs(st.m)); b=y0-9;
      if(hi-lo>2){ S('path',{d:'M'+R(lo)+','+R(b+4)+'V'+R(b)+'H'+R(hi)+'V'+R(b+4),'class':'mi6-pline'},g); }
      text(g,(lo+hi)/2,b-5,Math.abs(st.rp)<0.005?'P ≈ 0':st.rp<0?'P < 0':'P','mi6-plab nf-halo','middle');
      g=el.labs; while(g.firstChild) g.removeChild(g.firstChild);
      spread(g,[[xs(st.x1),'x₁','nf-lab'],[xs(st.x2),'x₂','nf-lab'],[xs(st.m),'x̄','nf-lab'],[xs(st.ce),'C','nf-lab']],y0+34,18);
      [[Y(u1),'u(x₁)'],[Y(u2),'u(x₂)'],[yE,'E[u]']].sort(function(a,c){ return a[0]-c[0]; }).reduce(function(prev,q){
        var y=Math.max(q[0]+4,prev+12); text(g,F.x0-6,y,q[1],q[1]==='E[u]'?'mi6-eul':'nf-lab','end'); return y;
      },-1e9);
      for(i=0;i<2;i++) place(hs[i],xs(X[i]),y0,X[i],(i?'x2':'x1')+' = '+tl(X[i]));
      kind=Math.abs(r)<1e-9?'neutral':r>0?'averse':'loving';
      cur={r:r, p:p, x1:st.x1, x2:st.x2, mean:st.m, var:st.va, ce:st.ce, rp:st.rp, ra:st.ra, ap:st.ap, kind:kind};
      if(!out) return;
      s='r = '+fmt(r,2)+' ('+crraName(r)+')   p = '+fmt(p,2)+' on x₂'+
        '\nx̄ = '+fmt(st.m,2)+'   C = '+fmt(st.ce,3)+'   P = x̄ '+MINUS+' C = '+fmt(st.rp,3)+
        (kind==='neutral'?': risk neutral':kind==='loving'?': risk loving, so the agent pays to keep the risk':'')+
        '\nArrow Pratt: ½ r_A(x̄) σ² = ½ × '+fmt(st.ra,3)+' × '+fmt(st.va,2)+' = '+fmt(st.ap,3);
      out.textContent=s;
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(X[0]),F.bot],[xs(X[1]),F.bot]]; },
      function(i,x){ put(i,xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('r' in st && rr) rr.set(+st.r);
        if('p' in st && rp) rp.set(+st.p);
        /* move the high prize first when it rises, so the two never have to cross */
        if('x2' in st && +st.x2>X[1]){ put(1,+st.x2); if('x1' in st) put(0,+st.x1); }
        else { if('x1' in st) put(0,+st.x1); if('x2' in st) put(1,+st.x2); }
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. The Arrow Pratt approximation P(t) ≈ ½ r_A σ² t² ---------- */
  NF.register('mi6-ap',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var r=1, x0=20, t=0.4, SIG=10, W=520, H=300, el={}, hs=[], xs, ys, F, api, cur={};
    var rr=range(fig,'r',1,function(v){ r=v; update(); }), rx=range(fig,'x0',0,function(v){ x0=v; update(); });
    if(rr) r=rr.v();
    if(rx) x0=rx.v();
    /* exact premium for wealth x0 + t z, z = +10 or -10 with equal chance */
    function P(tt){ var a=x0-SIG*tt, b=x0+SIG*tt; return Math.abs(r)<1e-9?0:x0-crraInv(0.5*crra(a,r)+0.5*crra(b,r),r); }
    function AP(tt){ return 0.5*(r/x0)*SIG*SIG*tt*tt; }
    function putT(v){ t=clamp(Math.round(v*100)/100,0,1); }
    function draw(){
      W=measure(svg); H=300; frame(svg,W,H);
      F={top:30, bot:H-46, x0:52, x1:W-16};
      xs=scale(0,1,F.x0,F.x1);
      el.bg=S('g',null,svg);
      key(el.bg,[['line','nf-line','exact P(t)'],['line','mi6-apl','½ r_A(x₀) σ² t²']],F.x0,13,F.x1);
      el.g=S('g',null,svg);
      el.gc=clip(svg,F.x0,F.top-4,F.x1-F.x0,F.bot-F.top+4);
      el.ap=S('path',{'class':'mi6-apl'},el.gc);
      el.ex=S('path',{'class':'nf-line'},el.gc);
      el.guide=line(svg,0,0,0,0,'nf-guide');
      el.d1=S('circle',{r:4.5,'class':'nf-dot'},svg);
      el.d2=S('circle',{r:4,'class':'mi6-apd'},svg);
      hs=[handle(svg,'mi6-kx','Risk scale t, arrow keys move it',function(d,big){ putT(t+d*(big?0.1:0.01)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var g=el.g, i, tt, ymax=0, pe=[], pa=[], tk, xt=[0,0.2,0.4,0.6,0.8,1], pt=P(t), at2=AP(t), half=0.5*(r/x0)*SIG*SIG, s;
      for(i=0;i<=200;i++){ tt=i/200; ymax=Math.max(ymax,P(tt),AP(tt)); }
      ymax=Math.max(ymax*1.08,0.5);
      tk=ticks(0,ymax,4); ymax=Math.max(ymax,tk.t[tk.t.length-1]);
      ys=scale(0,ymax,F.bot,F.top);
      while(g.firstChild) g.removeChild(g.firstChild);
      axes(g,xs,ys,xt,tk.t,1,dec(tk.s));
      text(g,F.x1,F.bot+34,'t: wealth is x₀ ± 10t','nf-title','end');
      text(g,F.x0-7,F.top-10,'P','nf-title mi6-it','end');
      for(i=0;i<=200;i++){ tt=i/200; pe.push([xs(tt),ys(P(tt))]); pa.push([xs(tt),ys(AP(tt))]); }
      el.ex.setAttribute('d',poly(pe)); el.ap.setAttribute('d',poly(pa));
      setLine(el.guide,xs(t),F.bot,xs(t),Math.min(ys(pt),ys(at2)));
      at(el.d1,xs(t),ys(pt)); at(el.d2,xs(t),Math.max(F.top-4,ys(at2)));
      place(hs[0],xs(t),F.bot,t,'t = '+fmt(t,2));
      cur={r:r, x0:x0, t:t, p:pt, ap:at2, ra:r/x0, half:half, pt:t>0?pt/t:0, pt2:t>0?pt/(t*t):half};
      if(!out) return;
      s='x₀ = '+fmt(x0,0)+', r = '+fmt(r,1)+' ('+crraName(r)+'): r_A(x₀) = r/x₀ = '+fmt(r/x0,3)+', σ² = 100'+
        '\nat t = '+fmt(t,2)+': exact P = '+fmt(pt,3)+'   ½ r_A σ² t² = '+fmt(at2,3)+
        (t>0?'   P/t = '+fmt(pt/t,3)+'   P/t² = '+fmt(pt/(t*t),3)+' against ½ r_A σ² = '+fmt(half,3):'');
      out.textContent=s;
      if(x0-SIG*t<=1.0001 && t>0) warn(out,'\nthe bad outcome leaves wealth '+fmt(x0-SIG*t,1)+': this risk is not small');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(t),F.bot]]; },
      function(i,x){ putT(xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('r' in st && rr) rr.set(+st.r);
        if('x0' in st && rx) rx.set(+st.x0);
        if('t' in st){ putT(+st.t); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Risk premium across wealth: CARA, log and quadratic utility ---------- */
  NF.register('mi6-wealth',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    /* all three have r_A = 0.05 at wealth 20: CARA with r = 0.05, u = ln x, and u = x - b x^2 with b = 0.0125 (bliss at 40) */
    var A=0.05, B=0.0125, LO=10, HI=40, mode='add', h=5, sh=0.2, x0=20, W=520, H=300, el={}, hs=[], xs, ys, F, api, cur={};
    var rh=range(fig,'h',1,function(v){ h=v; update(); }), rs=range(fig,'s',2,function(v){ sh=v; update(); });
    if(rh) h=rh.v();
    if(rs) sh=rs.v();
    mode=seg(fig,'data-mode',function(m){ mode=m; locks(); update(); }) || 'add';
    function locks(){ lock(rh,mode!=='add'); lock(rs,mode!=='prop'); }
    locks();
    function size(w){ return mode==='add'?h:sh*w; }
    /* exact risk premia for wealth w plus or minus d with equal chance */
    function pC(w,d){ return Math.log(Math.cosh(A*d))/A; }
    function pL(w,d){ return w-Math.sqrt(w*w-d*d); }
    function qOk(w,d){ return w+d<=1/(2*B)+1e-9; }
    function pQ(w,d){ var k=w-B*w*w-B*d*d; return w-(1-Math.sqrt(Math.max(0,1-4*B*k)))/(2*B); }
    function val(f,w){ var d=size(w), v=f(w,d); return mode==='add'?v:100*v/w; }
    function putX(v){ x0=clamp(Math.round(v*2)/2,LO,HI); }
    function draw(){
      var items=[['line','mi6-wc','CARA, r = 0.05'],['line','mi6-wl','log'],['line','mi6-wq','quadratic, b = 0.0125']], rows;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),items,52,13,W-8);
      F={top:rows*16+30, bot:H-46, x0:52, x1:W-16};
      xs=scale(LO,HI,F.x0,F.x1);
      el.g=S('g',null,svg);
      el.gc=clip(svg,F.x0,F.top-4,F.x1-F.x0,F.bot-F.top+4);
      el.c=[S('path',{'class':'mi6-wc'},el.gc),S('path',{'class':'mi6-wl'},el.gc),S('path',{'class':'mi6-wq'},el.gc)];
      el.guide=line(svg,0,0,0,0,'nf-guide');
      el.d=[S('circle',{r:4,'class':'mi6-wdc'},svg),S('circle',{r:4,'class':'mi6-wdl'},svg),S('circle',{r:4,'class':'mi6-wdq'},svg)];
      hs=[handle(svg,'mi6-kx','Initial wealth, arrow keys move it',function(d,big){ putX(x0+d*(big?5:0.5)); update(); })];
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var g=el.g, fs=[pC,pL,pQ], i, j, w, ymax=0, pts, tk, xt=[10,15,20,25,30,35,40], v, ok, qmax, vals=[], s, unit=mode==='add'?'':'%';
      for(j=0;j<3;j++) for(i=0;i<=120;i++){ w=LO+(HI-LO)*i/120; if(j===2 && !qOk(w,size(w))) continue; ymax=Math.max(ymax,val(fs[j],w)); }
      ymax=Math.min(ymax*1.08,mode==='add'?6:12);
      tk=ticks(0,ymax,4); ymax=Math.max(ymax,tk.t[tk.t.length-1]);
      ys=scale(0,ymax,F.bot,F.top);
      while(g.firstChild) g.removeChild(g.firstChild);
      axes(g,xs,ys,xt,tk.t,0,dec(tk.s));
      line(g,C(xs(20)),F.top,C(xs(20)),F.bot,'mi6-ref');
      text(g,xs(20)+5,F.top+10,'r_A = 0.05 for all three','nf-lab mi6-small');
      text(g,F.x1,F.bot+34,'initial wealth x₀','nf-title','end');
      text(g,F.x0-7,F.top-10,mode==='add'?'P':'P/x₀ (%)','nf-title','end');
      for(j=0;j<3;j++){
        pts=[];
        for(i=0;i<=240;i++){ w=LO+(HI-LO)*i/240; if(j===2 && !qOk(w,size(w))) break; pts.push([xs(w),ys(val(fs[j],w))]); }
        el.c[j].setAttribute('d',pts.length>1?poly(pts):'');
      }
      setLine(el.guide,xs(x0),F.bot,xs(x0),F.top);
      for(j=0;j<3;j++){
        ok=j<2 || qOk(x0,size(x0));
        v=ok?val(fs[j],x0):NaN; vals.push(v);
        if(ok && v<=ymax){ el.d[j].setAttribute('r',4); at(el.d[j],xs(x0),ys(v)); } else el.d[j].setAttribute('r',0);
      }
      place(hs[0],xs(x0),F.bot,x0,'initial wealth '+fmt(x0,1));
      qmax=mode==='add'?1/(2*B)-h:1/(2*B)/(1+sh);
      cur={mode:mode, h:h, s:sh, x0:x0, pc:vals[0], pl:vals[1], pq:isNaN(vals[2])?-1:vals[2], qok:!isNaN(vals[2]), qmax:qmax};
      if(!out) return;
      s='x₀ = '+fmt(x0,1)+', risk '+(mode==='add'?'± '+fmt(h,1):'± '+fmt(100*sh,0)+'% of wealth = ± '+fmt(sh*x0,2))+', 50/50'+
        '\n'+(mode==='add'?'P':'P/x₀')+':   CARA '+fmt(vals[0],2)+unit+'   log '+fmt(vals[1],2)+unit+'   quadratic ';
      out.textContent=s+(isNaN(vals[2])?'':fmt(vals[2],2)+unit);
      if(isNaN(vals[2])) warn(out,'undefined: the top prize passes the bliss point 40, where u stops rising (needs x₀ ≤ '+fmt(qmax,1)+')');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(x0),F.bot]]; },
      function(i,x){ putX(xs.inv(x)); update(); },focusOf(function(){ return hs; }));
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
        if('h' in st && rh) rh.set(+st.h);
        if('s' in st && rs) rs.set(+st.s);
        if('x0' in st){ putX(+st.x0); update(); }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
