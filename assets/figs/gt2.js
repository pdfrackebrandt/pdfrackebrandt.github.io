/* Core Micro GT2 figures: dominance and rationalizability. The second price auction, a mixture that dominates B and the
   belief view of the same fact, iterated deletion on a clickable payoff matrix, the prisoner's dilemma and pigs in a box
   in payoff space, Cournot IDSDS, the belief simplex of game 3 and the correlated belief example of Osborne and
   Rubinstein 58.1. Drawn with the helpers of /assets/notes.js (window.NF); colours from /assets/figs/gt2.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, poly=NF.poly, fmt=NF.fmt, tl=NF.tl,
      lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg, key=NF.key,
      clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  var SUB='₀₁₂₃₄₅₆₇₈₉';
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); return g; }
  function lab(g,x,y,s,cls,anchor){ return text(g,x,y,s,(cls?cls+' ':'')+'nf-halo',anchor); }
  function dot(g,x,y,r,cls){ return S('circle',{cx:R(x),cy:R(y),r:r,'class':cls},g); }
  function path(g,pts,cls){ return S('path',{d:poly(pts),'class':cls},g); }
  function f2(v){ return fmt(v,2); }
  function f1(v){ return fmt(v,1); }
  /* an arrow from (x1,y1) to (x2,y2), pulled back by s1 and s2 pixels at its ends */
  function arrow(g,x1,y1,x2,y2,cls,hcls,s1,s2){
    var dx=x2-x1, dy=y2-y1, d=Math.hypot(dx,dy), ux, uy, bx, by;
    s1=s1||0; s2=s2||0;
    if(d<s1+s2+8) return;
    ux=dx/d; uy=dy/d; x1+=ux*s1; y1+=uy*s1; x2-=ux*s2; y2-=uy*s2;
    bx=x2-ux*8; by=y2-uy*8;
    line(g,x1,y1,bx+ux,by+uy,cls);
    S('path',{d:poly([[x2,y2],[bx-uy*4.2,by+ux*4.2],[bx+uy*4.2,by-ux*4.2]])+'Z','class':hcls},g);
  }
  /* a focusable round handle, moved by dragging or the arrow keys; onKey gets (dx, dy, big) */
  function handle(svg,knob,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+knob},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, dx=0, dy=0;
      if(k==='ArrowRight') dx=1; else if(k==='ArrowLeft') dx=-1; else if(k==='ArrowUp') dy=1; else if(k==='ArrowDown') dy=-1; else return;
      e.preventDefault(); onKey(dx,dy,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+(+now).toFixed(3));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever handle is nearest the pointer; any(p), when given, names the handle a press elsewhere grabs (or -1) */
  function dragger(svg,size,pts,move,focus,any){
    var cur=-1, off=[0,0];
    function near(p){
      var P=pts(), best=-1, bd=26, i, d;
      for(i=0;i<P.length;i++){ if(!P[i]) continue; d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
      return best;
    }
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]), i=near(p), P, jump=false;
      if(i<0 && any){ i=any(p); jump=true; }
      if(i<0) return;
      P=pts(); cur=i; off=jump||!P[i]?[0,0]:[P[i][0]-p[0],P[i][1]-p[1]];
      e.preventDefault(); capture(svg,e);
      if(focus) focus(i);
      svg.classList.add('is-drag');
      if(jump) move(cur,p[0],p[1]);
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
  function api(get,set){ return NF.api({get:function(){ var o={}, k, c=get(); for(k in c) o[k]=c[k]; return o; }, set:set}); }
  function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
  function span(out,s,cls){ var sp=document.createElement('span'); sp.className=cls; sp.textContent=s; out.appendChild(sp); }
  /* a square plot of the domain [d0, d1] on both axes, centred in the free width */
  function square(W,top,side,d0,d1,mL,mR){
    var x0=Math.round(mL+((W-mL-mR)-side)/2), G={x0:x0, x1:x0+side, top:top, bot:top+side, side:side};
    G.xs=lin(d0,d1,x0,x0+side); G.ys=lin(d0,d1,top+side,top);
    return G;
  }

  /* ---------- 1. Second price auction: bid v against any other bid ---------- */
  NF.register('gt2-spa',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var v=6, b=9, r=7.5, RX=12, Y0=-8, Y1=10, W=520, H=300, F={}, xs, ys, el={}, hs=[], A, cur={};
    var rv=range(fig,'v',1,function(x){ v=x; update(); }), rb=range(fig,'b',1,function(x){ b=x; update(); });
    if(rv) v=rv.v();
    if(rb) b=rb.v();
    function tru(x){ return x<v?v-x:0; }
    function dev(x){ return x<b?v-x:0; }
    function draw(){
      var g, i, rows;
      W=measure(svg); H=W<440?316:300; frame(svg,W,H);
      el.key=S('g',null,svg);
      rows=key(el.key,[['line','gt2-l gt2-ink','bid vᵢ'],['line','gt2-l gt2-dash gt2-mut','bid bᵢ′'],['rect','gt2-fr','overbid loss'],['rect','gt2-fp','underbid loss']],40,13,W-10);
      F={x0:40, x1:W-14, top:13+rows*16+12, bot:H-38};
      xs=lin(0,RX,F.x0,F.x1); ys=lin(Y0,Y1,F.bot,F.top);
      g=S('g',null,svg);
      for(i=0;i<=RX;i+=2){ line(g,C(xs(i)),F.top,C(xs(i)),F.bot,'nf-grid'); text(g,xs(i),F.bot+16,String(i),null,'middle'); }
      for(i=Y0;i<=Y1;i+=2){ line(g,F.x0,C(ys(i)),F.x1,C(ys(i)),i===0?'nf-ax':'nf-grid'); text(g,F.x0-6,ys(i)+4,tl(i),null,'end'); }
      line(g,C(F.x0),F.top,C(F.x0),F.bot,'nf-ax');
      text(g,F.x1,F.bot+31,'rᵢ, the highest other bid','nf-title','end');
      text(g,F.x0-6,F.top-8,'uᵢ','nf-title gt2-it','end');
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt2-k','Highest other bid r, arrow keys move it',function(dx,dy,big){ setR(r+(dx||dy)*(big?1:0.1)); })];
      update();
    }
    function setR(x){ r=clamp(Math.round(x*10)/10,0,RX); update(); }
    function update(){
      var over=b>v+1e-9, under=b<v-1e-9, cls=over?'gt2-r':under?'gt2-p':'gt2-mut', t=tru(r), d=dev(r), why, s;
      clear(el.gc); clear(el.fg);
      if(over||under) path(el.gc,[[xs(v),ys(0)],[xs(b),ys(v-b)],[xs(b),ys(0)]],over?'gt2-fr':'gt2-fp');
      path(el.gc,[[xs(0),ys(v)],[xs(v),ys(0)],[xs(RX),ys(0)]],'gt2-l gt2-ink gt2-w3');
      S('path',{d:poly([[xs(0),ys(v)],[xs(b),ys(v-b)]])+poly([[xs(b),ys(0)],[xs(RX),ys(0)]]),'class':'gt2-l gt2-dash '+cls},el.gc);
      line(el.gc,xs(b),ys(v-b),xs(b),ys(0),'gt2-l gt2-dot gt2-thin '+cls);
      line(el.fg,xs(v),F.top,xs(v),F.bot,'nf-guide');
      lab(el.fg,xs(v),F.top+12,'vᵢ','gt2-tk gt2-it','middle');
      if(over||under){ line(el.fg,xs(b),F.top,xs(b),F.bot,'nf-guide'); lab(el.fg,xs(b)+(Math.abs(xs(b)-xs(v))<18?(over?12:-12):0),F.top+12,'bᵢ′',(over?'gt2-tr':'gt2-tp')+' gt2-it','middle'); }
      line(el.fg,xs(r),F.top+18,xs(r),F.bot,'gt2-l gt2-thin gt2-mut');
      dot(el.fg,xs(r),ys(t),4.5,'gt2-dk');
      dot(el.fg,xs(r),ys(d),3.5,over?'gt2-dr':under?'gt2-dp':'gt2-dk');
      place(hs[0],xs(r),F.bot,r,'r = '+r.toFixed(1));
      if(over && r>v && r<b) why='bᵢ′ wins and pays rᵢ > vᵢ: a loss of '+f2(r-v);
      else if(under && r>b && r<v) why='bᵢ′ loses an auction worth vᵢ '+MINUS+' rᵢ = '+f2(v-r);
      else why='same outcome, same payoff';
      cur={v:v, b:b, r:r, tru:t, dev:d, gap:d-t};
      if(out){
        s=(over?'overbid':under?'underbid':'bᵢ′ = vᵢ')+': vᵢ = '+f1(v)+', bᵢ′ = '+f1(b)+
          '\nat rᵢ = '+f1(r)+': bidding vᵢ earns '+f2(t)+', bidding bᵢ′ earns '+f2(d)+': '+why;
        if(over||under) s+='\nbᵢ′ is never better and is strictly worse for '+f1(Math.min(v,b))+' < rᵢ < '+f1(Math.max(v,b));
        out.textContent=s;
      }
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(r),F.bot]]; },
      function(i,x){ setR(xs.inv(clamp(x,F.x0,F.x1))); },focusOf(function(){ return hs; }),
      function(p){ return p[0]>=F.x0-4 && p[0]<=F.x1+4 && p[1]>=F.top && p[1]<=F.bot+10 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('v' in st && rv) rv.set(+st.v);
      if('b' in st && rb) rb.set(+st.b);
      if('r' in st) setR(+st.r);
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 2. B dominated by a mixture of T and M, and never a best response ---------- */
  NF.register('gt2-mixdom',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var p=0.5, b=1, mu=0.5, view, W=520, H=330, G, F={}, xs, ys, el={}, hs=[], A, cur={};
    var rp=range(fig,'p',2,function(x){ p=x; update(); }), rbb=range(fig,'b',2,function(x){ b=x; update(); });
    if(rp) p=rp.v();
    if(rbb) b=rbb.v();
    view=seg(fig,'data-view',function(x){ view=x; draw(); }) || 'vec';
    function draw(){
      var g, i, rows, side;
      W=measure(svg); H=view==='vec'?(W<440?Math.max(320,W+30):420):(W<440?340:330); frame(svg,W,H);
      el.key=S('g',null,svg);
      rows=view==='vec'?key(el.key,[['line','gt2-l gt2-r','3p = b (against L)'],['line','gt2-l gt2-p','3(1 '+MINUS+' p) = b (against R)'],['rect','gt2-fg','better than B on both']],40,13,W-10)
        :key(el.key,[['line','gt2-l gt2-ink','T: 3μ'],['line','gt2-l gt2-ink gt2-dash','M: 3(1 '+MINUS+' μ)'],['line','gt2-l gt2-mut','B: b']],40,13,W-10);
      F.top=13+rows*16+12;
      g=S('g',null,svg);
      if(view==='vec'){
        side=Math.min(W-40-20,H-F.top-36);
        G=square(W,F.top,side,-0.3,3.4,40,20); xs=G.xs; ys=G.ys;
        for(i=0;i<=3;i++){
          line(g,C(xs(i)),G.top,C(xs(i)),G.bot,i===0?'nf-ax':'nf-grid'); text(g,xs(i),G.bot+16,String(i),null,'middle');
          line(g,G.x0,C(ys(i)),G.x1,C(ys(i)),i===0?'nf-ax':'nf-grid'); text(g,G.x0-6,ys(i)+4,String(i),null,'end');
        }
        text(g,G.x1,G.bot+31,'payoff against L','nf-title','end');
        text(g,G.x0-6,G.top-8,'against R','nf-title','start');
        el.gc=clip(svg,G.x0,G.top,G.side,G.side);
        F.x0=G.x0; F.x1=G.x1; F.bot=G.bot;
      } else {
        F.x0=40; F.x1=W-16; F.bot=H-38;
        xs=lin(0,1,F.x0,F.x1); ys=lin(0,3.3,F.bot,F.top);
        for(i=0;i<=10;i+=2){ line(g,C(xs(i/10)),F.top,C(xs(i/10)),F.bot,i===0?'nf-ax':'nf-grid'); text(g,xs(i/10),F.bot+16,tl(i/10),null,'middle'); }
        for(i=0;i<=3;i++){ line(g,F.x0,C(ys(i)),F.x1,C(ys(i)),i===0?'nf-ax':'nf-grid'); text(g,F.x0-6,ys(i)+4,String(i),null,'end'); }
        text(g,F.x1,F.bot+31,'belief μ that player 2 plays L','nf-title','end');
        text(g,F.x0-6,F.top-8,'u₁','nf-title gt2-it','end');
        el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      }
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt2-kb',view==='vec'?'Mixture weight p on T, arrow keys move it':'Belief mu on L, arrow keys move it',function(dx,dy,big){
        var st=(dx||dy)*(big?0.1:0.01);
        if(view==='vec'){ if(rp) rp.set(p+(dx||-dy)*(big?0.1:0.01)); } else setMu(mu+st);
      })];
      update();
    }
    function setMu(x){ mu=clamp(Math.round(x*100)/100,0,1); update(); }
    function update(){
      var dom=3*p>b+1e-9 && 3*(1-p)>b+1e-9, lo=b/3, hi=1-b/3, sx, sy, tT, tM, best, s, uT, uM, uB;
      clear(el.gc); clear(el.fg);
      if(view==='vec'){
        S('rect',{x:R(xs(b)),y:R(ys(3.4)),width:R(Math.max(0,xs(3.4)-xs(b))),height:R(Math.max(0,ys(b)-ys(3.4))),'class':'gt2-fg'},el.gc);
        line(el.gc,xs(b),G.top,xs(b),G.bot,'gt2-l gt2-thin gt2-r');
        line(el.gc,G.x0,ys(b),G.x1,ys(b),'gt2-l gt2-thin gt2-p');
        line(el.gc,xs(3),ys(0),xs(0),ys(3),'gt2-l gt2-thin gt2-ink');
        if(lo<hi) line(el.gc,xs(3*lo),ys(3*(1-lo)),xs(3*hi),ys(3*(1-hi)),'gt2-l gt2-thick gt2-b');
        dot(el.fg,xs(3),ys(0),4.5,'gt2-dk'); lab(el.fg,xs(3)-8,ys(0)+16,'T = (3, 0)','gt2-tk','end');
        dot(el.fg,xs(0),ys(3),4.5,'gt2-dk'); lab(el.fg,xs(0)+8,ys(3)-8,'M = (0, 3)','gt2-tk','start');
        dot(el.fg,xs(b),ys(b),4.5,'gt2-dk'); if(b<=1.5) lab(el.fg,xs(b)-8,ys(b)+16,'B = ('+f2(b)+', '+f2(b)+')','gt2-tk','end'); else lab(el.fg,xs(b)+8,ys(b)-8,'B = ('+f2(b)+', '+f2(b)+')','gt2-tk','start');
        sx=xs(3*p); sy=ys(3*(1-p));
        lab(el.fg,sx+12,sy-10,'σ','gt2-it '+(dom?'gt2-tb':'gt2-tk')+' gt2-big','start');
        place(hs[0],sx,sy,p,'p = '+p.toFixed(2));
      } else {
        uT=function(m){ return 3*m; }; uM=function(m){ return 3*(1-m); };
        /* where B is a best response, if anywhere */
        if(b>=1.5-1e-9) S('rect',{x:R(xs(1-b/3)),y:R(F.top),width:R(Math.max(0,xs(b/3)-xs(1-b/3))),height:R(F.bot-F.top),'class':'gt2-fo'},el.gc);
        else S('path',{d:poly([[xs(0),ys(b)],[xs(0),ys(3)],[xs(0.5),ys(1.5)],[xs(1),ys(3)],[xs(1),ys(b)]])+'Z','class':'gt2-fg'},el.gc);
        line(el.gc,xs(0),ys(b),xs(1),ys(b),'gt2-l gt2-mut');
        line(el.gc,xs(0),ys(0),xs(1),ys(3),'gt2-l gt2-ink');
        line(el.gc,xs(0),ys(3),xs(1),ys(0),'gt2-l gt2-ink gt2-dash');
        line(el.fg,xs(mu),F.top,xs(mu),F.bot,'nf-guide');
        tT=uT(mu); tM=uM(mu);
        dot(el.fg,xs(mu),ys(tT),3.5,'gt2-dk'); dot(el.fg,xs(mu),ys(tM),3.5,'gt2-dk'); dot(el.fg,xs(mu),ys(b),3.5,'gt2-df');
        if(b<1.5) lab(el.fg,xs(0.5),ys(1.5)-12,'1.5','gt2-tk','middle');
        place(hs[0],xs(mu),F.bot,mu,'mu = '+mu.toFixed(2));
      }
      tT=3*mu; tM=3*(1-mu);
      best=[]; s=Math.max(tT,tM,b);
      if(tT>=s-1e-9) best.push('T'); if(tM>=s-1e-9) best.push('M'); if(b>=s-1e-9) best.push('B');
      cur={view:view, p:p, b:b, mu:mu, dom:dom, nbr:b<1.5-1e-9, best:best.join('')};
      if(out){
        out.textContent='';
        if(view==='vec'){
          out.appendChild(document.createTextNode('σ = ('+f2(p)+', '+f2(1-p)+', 0): against L 3p = '+f2(3*p)+(3*p>b+1e-9?' > ':' ≤ ')+f2(b)+
            ', against R 3(1 '+MINUS+' p) = '+f2(3*(1-p))+(3*(1-p)>b+1e-9?' > ':' ≤ ')+f2(b)+': '));
          if(dom) span(out,'σ strictly dominates B','gt2-good'); else span(out,'σ does not dominate B','gt2-bad');
          out.appendChild(document.createTextNode(lo<hi?'\nB is dominated by (p, 1 '+MINUS+' p, 0) exactly for '+f2(lo)+' < p < '+f2(hi):
            '\nb ≥ 1.5: no mixture of T and M dominates B'));
        } else {
          out.appendChild(document.createTextNode('μ = '+f2(mu)+': T earns '+f2(tT)+', M '+f2(tM)+', B '+f2(b)+': best response '+best.join(' and ')+'\n'));
          if(b<1.5-1e-9) span(out,'b < 1.5: B is never a best response, and a mixture of T and M dominates it','gt2-good');
          else span(out,'b ≥ 1.5: B is a best response for '+f2(1-b/3)+' ≤ μ ≤ '+f2(b/3)+', and no mixture dominates it','gt2-bad');
        }
      }
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return view==='vec'?[[xs(3*p),ys(3*(1-p))]]:[[xs(mu),F.bot]]; },
      function(i,x,y){
        if(view==='vec'){
          /* project onto the segment from T = (3, 0) to M = (0, 3) */
          var ux=xs.inv(x), uy=ys.inv(y), t=clamp((ux-uy+3)/6,0,1);
          if(rp) rp.set(Math.round(t*100)/100);
        } else setMu(xs.inv(clamp(x,F.x0,F.x1)));
      },focusOf(function(){ return hs; }),
      function(pt){ return view==='bel' && pt[0]>=F.x0-4 && pt[0]<=F.x1+4 && pt[1]>=F.top && pt[1]<=F.bot+10 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('view' in st) NF.press(fig,'data-view',String(st.view));
      if('p' in st && rp) rp.set(+st.p);
      if('b' in st && rbb) rbb.set(+st.b);
      if('mu' in st) setMu(+st.mu);
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 3. Iterated deletion on a payoff matrix: click a strategy to delete it ---------- */
  var GAMES={
    g1:{rows:['T','M','B'], cols:['L','R'], weak:false, u:[[[3,0],[0,1]],[[2,1],[2,2]],[[1,4],[1,3]]]},
    g2:{rows:['T','M','B'], cols:['L','R'], weak:false, u:[[[3,0],[0,1]],[[0,1],[3,2]],[[1,4],[1,3]]]},
    g3:{rows:['T','M','B'], cols:['L','C','R'], weak:false, u:[[[0,7],[2,5],[7,0]],[[5,2],[3,3],[5,2]],[[7,0],[2,5],[0,7]]]},
    w:{rows:['T','M','B'], cols:['L','R'], weak:true, u:[[[5,1],[4,0]],[[6,0],[3,1]],[[6,4],[4,4]]]}
  };
  var STEP=['r','p','o','t'];
  NF.register('gt2-idsds',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var game, Gm, alive, steps, log, msg='', flash=null, W=520, H=240, el={}, A, cur={}, L={};
    game=seg(fig,'data-game',function(x){ if(!GAMES[x]) return; game=x; reset(); }) || 'g1';
    if(!GAMES[game]) game='g1';
    var rb=fig.querySelector('.gt2-round'), xb=fig.querySelector('.nfig-reset');
    if(rb) rb.addEventListener('click',function(){ round(); });
    if(xb) xb.addEventListener('click',function(){ reset(); });
    function reset(){
      Gm=GAMES[game]; alive=[Gm.rows.map(function(){ return true; }),Gm.cols.map(function(){ return true; })];
      steps=0; log=[]; msg=''; flash=null; draw();
    }
    function names(pl){ return pl?Gm.cols:Gm.rows; }
    function pay(pl,s,o){ return pl?Gm.u[o][s][1]:Gm.u[s][o][0]; }
    function live(pl){ var a=[], i; for(i=0;i<alive[pl].length;i++) if(alive[pl][i]) a.push(i); return a; }
    function vs(pl,a,bv,o){ return tl(a)+(a>bv?' > ':a===bv?' = ':' < ')+tl(bv)+' against '+names(1-pl)[o]; }
    /* is s dominated given the strategies still alive? strict by a pure strategy or a mix of two; weak by a pure one */
    function dominated(pl,s,weak){
      var own=live(pl).filter(function(t){ return t!==s; }), opp=live(1-pl), i, j, k, t, o, ok, some, lo, hi, a, bb, c, d, q, why;
      for(i=0;i<own.length;i++){
        t=own[i]; ok=true; some=false;
        for(k=0;k<opp.length;k++){ o=opp[k]; d=pay(pl,t,o)-pay(pl,s,o); if(d<0 || (!weak && d===0)){ ok=false; break; } if(d>0) some=true; }
        if(ok && (some || !weak)) return {by:names(pl)[t], how:weak&&opp.some(function(o2){ return pay(pl,t,o2)===pay(pl,s,o2); })?'weakly':'strictly',
          why:opp.map(function(o2){ return vs(pl,pay(pl,s,o2),pay(pl,t,o2),o2); }).join(', ')};
      }
      for(i=0;i<own.length;i++) for(j=i+1;j<own.length;j++){
        lo=0; hi=1;
        for(k=0;k<opp.length;k++){
          o=opp[k]; a=pay(pl,own[i],o); bb=pay(pl,own[j],o); c=pay(pl,s,o)-bb; d=a-bb;
          if(d>0) lo=Math.max(lo,c/d); else if(d<0) hi=Math.min(hi,c/d); else if(!(bb>pay(pl,s,o))){ lo=1; hi=0; }
        }
        if(lo<hi-1e-9){
          q=(lo<0.5 && hi>0.5)?0.5:Math.round((lo+hi)*50)/100;
          why=opp.map(function(o2){ var m=q*pay(pl,own[i],o2)+(1-q)*pay(pl,own[j],o2); return vs(pl,pay(pl,s,o2),m,o2); }).join(', ');
          return {by:tl(q)+' '+names(pl)[own[i]]+' + '+tl(1-q)+' '+names(pl)[own[j]], how:'strictly', why:why};
        }
      }
      return null;
    }
    function label(pl){ return pl?'player 2':'player 1'; }
    function kill(pl,s,d,step){
      alive[pl][s]=false;
      L[pl+':'+s]=step;
      log.push(step+'. '+names(pl)[s]+' ('+label(pl)+'): '+d.how+' dominated by '+d.by+' ('+d.why+')');
    }
    function candidates(){
      var c=[], pl, s, d;
      for(pl=0;pl<2;pl++) for(s=0;s<alive[pl].length;s++) if(alive[pl][s]){ d=dominated(pl,s,Gm.weak); if(d) c.push([pl,s,d]); }
      return c;
    }
    function round(){
      var c=candidates(), i;
      if(!c.length){ msg='nothing left to delete'; update(); return; }
      steps++;
      for(i=0;i<c.length;i++) kill(c[i][0],c[i][1],c[i][2],steps);
      msg=''; flash=null; update();
    }
    function click(pl,s){
      if(!alive[pl][s]) return;
      if(live(pl).length<2){ msg=names(pl)[s]+' is the only strategy '+label(pl)+' has left'; flash=pl+':'+s; update(); return; }
      var d=dominated(pl,s,Gm.weak);
      if(!d){ msg=names(pl)[s]+' is not '+(Gm.weak?'weakly':'strictly')+' dominated given the strategies left'; flash=pl+':'+s; update(); return; }
      steps++; kill(pl,s,d,steps); msg=''; flash=null; update();
    }
    function hit(g,x,y,w,h,pl,s){
      var e=S('g',{'class':'gt2-hit',tabindex:'0',role:'button'},g);
      S('rect',{x:R(x),y:R(y),width:R(w),height:R(h),'class':'gt2-hbox'},e);
      e.addEventListener('click',function(){ click(pl,s); });
      e.addEventListener('keydown',function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); click(pl,s); } });
      return e;
    }
    function draw(){
      W=measure(svg);
      var nr=Gm.rows.length, nc=Gm.cols.length, lw=58, cw=Math.min(116,Math.floor((W-lw-14)/nc)), ch=42, top=46, x0, i;
      x0=Math.round(lw+((W-lw-14)-cw*nc)/2);
      H=top+nr*ch+12; frame(svg,W,H);
      el.geo={nr:nr, nc:nc, cw:cw, ch:ch, top:top, x0:x0};
      el.bg=S('g',null,svg); el.hit=[[],[]];
      for(i=0;i<nr;i++) el.hit[0].push(hit(svg,x0-lw+2,top+i*ch+3,lw-8,ch-6,0,i));
      for(i=0;i<nc;i++) el.hit[1].push(hit(svg,x0+i*cw+4,4,cw-8,top-8,1,i));
      el.fg=S('g',{'class':'gt2-nopt'},svg);
      update();
    }
    function update(){
      var g=el.geo, i, j, x, y, st, k, cls, done=!candidates().length, surv=[], s;
      clear(el.fg);
      for(i=0;i<g.nr;i++) for(j=0;j<g.nc;j++){
        x=g.x0+j*g.cw; y=g.top+i*g.ch;
        S('rect',{x:R(x),y:R(y),width:g.cw,height:g.ch,'class':'gt2-cell'},el.fg);
        st=Math.min(alive[0][i]?99:L['0:'+i],alive[1][j]?99:L['1:'+j]);
        if(st<99) S('rect',{x:R(x+0.5),y:R(y+0.5),width:g.cw-1,height:g.ch-1,'class':'gt2-c'+(STEP[st-1]||'g')},el.fg);
        text(el.fg,x+g.cw/2,y+g.ch/2+5,tl(Gm.u[i][j][0])+', '+tl(Gm.u[i][j][1]),st<99?'gt2-payx':'gt2-pay','middle');
        if(done && st===99){ S('rect',{x:R(x+3),y:R(y+3),width:g.cw-6,height:g.ch-6,'class':'gt2-surv'},el.fg); surv.push([i,j]); }
      }
      for(k=0;k<2;k++) for(i=0;i<alive[k].length;i++){
        st=alive[k][i]?0:L[k+':'+i]; cls=st?'gt2-t'+(STEP[st-1]||'f'):'gt2-tk';
        x=k?g.x0+i*g.cw+g.cw/2:g.x0-24; y=k?g.top-12:g.top+i*g.ch+g.ch/2+5;
        text(el.fg,x,y,names(k)[i],'gt2-sl '+(st?cls:''),'middle').setAttribute('class','gt2-sl'+(st?' '+cls:''));
        if(st){
          line(el.fg,x-9,y-5,x+9,y-5,'gt2-l gt2-thin gt2-'+(STEP[st-1]||'fnt'));
          var bx=k?x+18:x-24, by=y-5;
          S('circle',{cx:R(bx),cy:R(by),r:8,'class':'gt2-ring gt2-'+(STEP[st-1]||'fnt')},el.fg);
          text(el.fg,bx,by+4,String(st),'gt2-badge gt2-t'+(STEP[st-1]||'f'),'middle');
        }
        el.hit[k][i].classList.toggle('is-off',!alive[k][i]);
        el.hit[k][i].classList.toggle('gt2-flash',flash===k+':'+i);
        el.hit[k][i].setAttribute('aria-label',(alive[k][i]?'Delete ':'Deleted: ')+names(k)[i]+' for '+label(k));
      }
      s=live(0).map(function(i2){ return Gm.rows[i2]; }).join(', ')+' × '+live(1).map(function(j2){ return Gm.cols[j2]; }).join(', ');
      cur={game:game, steps:steps, done:done, left:s.replace(/[ ×,]+/g,''), n:surv.length};
      if(out){
        var lines=log.slice(-4);
        if(log.length>4) lines.unshift('…');
        if(msg) lines.push(msg+'.');
        if(done) lines.push(steps?'nothing more is '+(Gm.weak?'weakly':'strictly')+' dominated: survivors '+s+(surv.length===1?', payoffs ('+Gm.u[surv[0][0]][surv[0][1]].join(', ')+')':'')
          :'no strategy is dominated: '+(Gm.weak?'weak':'strict')+' deletion removes nothing');
        else if(!log.length && !msg) lines.push('click a dominated strategy, or delete one full round');
        out.textContent=lines.join('\n');
      }
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){
      if('game' in st && GAMES[st.game]) NF.press(fig,'data-game',String(st.game));
      if('reset' in st) reset();
      if('rounds' in st){ var n=+st.rounds; while(n-->0) round(); }
    });
    reset();
    watch(svg,draw);
    return A;
  });

  /* ---------- 4. Prisoner's dilemma and pigs in a box in payoff space ---------- */
  NF.register('gt2-pdpigs',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var game, y=1, k=1, W=520, H=340, F={}, xs, ys, el={}, A, cur={};
    var ry=range(fig,'y',1,function(x){ y=x; update(); }), rk=range(fig,'k',1,function(x){ k=x; update(); });
    if(ry) y=ry.v();
    if(rk) k=rk.v();
    game=seg(fig,'data-game',function(x){ game=x; lockAll(); draw(); }) || 'pd';
    function lockAll(){ lock(ry,game!=='pd'); lock(rk,game!=='pigs'); }
    function model(){
      if(game==='pd') return {P1:'player 1', P2:'player 2', s1:['c','d'], s2:['c','d'],
        u:[[[-2,-2],[-10,-y]],[[-y,-10],[-5,-5]]], c1:'r', c2:'p', X:[-11,0], Y:[-11,0], xt:[-10,-8,-6,-4,-2,0], yt:[-10,-8,-6,-4,-2,0]};
      return {P1:'Big Pig', P2:'piglet', s1:['Push','Wait'], s2:['Push','Wait'],
        u:[[[5,1],[3,5]],[[10-k,k-2],[0,0]]], c1:'p', c2:'r', X:[-1,10.5], Y:[-2.5,7], xt:[0,2,4,6,8,10], yt:[-2,0,2,4,6]};
    }
    /* strict IDSDS on the 2 by 2 game: the rounds, and who survives */
    function solve(M){
      var al=[[true,true],[true,true]], rounds=[], pl, s, o, t, ok, del, list;
      for(;;){
        del=[];
        for(pl=0;pl<2;pl++){
          if(!(al[pl][0]&&al[pl][1])) continue;
          for(s=0;s<2;s++){
            t=1-s; ok=true; list=[];
            for(o=0;o<2;o++){ if(!al[1-pl][o]) continue;
              var us=pl?M.u[o][s][1]:M.u[s][o][0], ut=pl?M.u[o][t][1]:M.u[t][o][0];
              if(!(ut>us+1e-9)) ok=false; list.push(tl(Math.round(ut*10)/10)+' > '+tl(Math.round(us*10)/10)); }
            if(ok) del.push([pl,s,list]);
          }
        }
        if(!del.length) break;
        rounds.push(del);
        for(s=0;s<del.length;s++) al[del[s][0]][del[s][1]]=false;
      }
      return {al:al, rounds:rounds};
    }
    function draw(){
      var M=model(), g, i, rows;
      W=measure(svg); H=W<440?350:340; frame(svg,W,H);
      el.key=S('g',null,svg);
      rows=key(el.key,[['line','gt2-l gt2-'+M.c1,M.P1+' switches and gains'],['line','gt2-l gt2-'+M.c2,M.P2+' switches and gains']],44,13,W-10);
      F={x0:44, x1:W-16, top:13+rows*16+12, bot:H-38};
      xs=lin(M.X[0],M.X[1],F.x0,F.x1); ys=lin(M.Y[0],M.Y[1],F.bot,F.top);
      g=S('g',null,svg);
      for(i=0;i<M.xt.length;i++){ line(g,C(xs(M.xt[i])),F.top,C(xs(M.xt[i])),F.bot,M.xt[i]===0?'nf-ax':'nf-grid'); text(g,xs(M.xt[i]),F.bot+16,tl(M.xt[i]),null,'middle'); }
      for(i=0;i<M.yt.length;i++){ line(g,F.x0,C(ys(M.yt[i])),F.x1,C(ys(M.yt[i])),M.yt[i]===0?'nf-ax':'nf-grid'); text(g,F.x0-6,ys(M.yt[i])+4,tl(M.yt[i]),null,'end'); }
      text(g,F.x1,F.bot+31,M.P1+"'s payoff",'nf-title','end');
      text(g,F.x0-6,F.top-8,M.P2+"'s payoff",'nf-title','start');
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.fg=S('g',null,svg);
      update();
    }
    function update(){
      var M=model(), sol=solve(M), i, j, P, Q, n=0, last=null, s, rr, d, cls, nm, lines=[], tag;
      clear(el.gc); clear(el.fg);
      if(game==='pd') S('rect',{x:R(xs(-5)),y:R(ys(0)),width:R(xs(0)-xs(-5)),height:R(ys(-5)-ys(0)),'class':'gt2-fg'},el.gc);
      else line(el.gc,xs(-2.5),ys(-2.5),xs(10.5),ys(10.5),'gt2-l gt2-thin gt2-dot gt2-fnt');
      for(i=0;i<2;i++) for(j=0;j<2;j++){
        P=M.u[i][j];
        Q=M.u[1-i][j]; if(Q[0]>P[0]+1e-9) arrow(el.fg,xs(P[0]),ys(P[1]),xs(Q[0]),ys(Q[1]),'gt2-l gt2-thin gt2-'+M.c1,'gt2-h'+M.c1,7,8);
        Q=M.u[i][1-j]; if(Q[1]>P[1]+1e-9) arrow(el.fg,xs(P[0]),ys(P[1]),xs(Q[0]),ys(Q[1]),'gt2-l gt2-thin gt2-'+M.c2,'gt2-h'+M.c2,7,8);
      }
      for(i=0;i<2;i++) for(j=0;j<2;j++) if(sol.al[0][i]&&sol.al[1][j]){ n++; last=[i,j]; }
      for(i=0;i<2;i++) for(j=0;j<2;j++){
        P=M.u[i][j]; s=sol.al[0][i]&&sol.al[1][j];
        cls=s?(n===1?'gt2-db':'gt2-dk'):'gt2-df';
        dot(el.fg,xs(P[0]),ys(P[1]),n===1&&s?6:4.5,cls);
        nm='('+M.s1[i]+', '+M.s2[j]+')';
        tag=game==='pd'?[[8,-9,'start'],[8,-9,'start'],[-8,16,'end'],[-8,-9,'end']][2*i+j]:[[-8,16,'end'],[-8,-10,'end'],k>4.5?[8,16,'start']:[-6,-10,'end'],[8,16,'start']][2*i+j];
        lab(el.fg,xs(P[0])+tag[0],ys(P[1])+tag[1],nm,s?(n===1?'gt2-tb':'gt2-tk'):'gt2-tf',tag[2]);
      }
      if(game==='pigs') lab(el.fg,F.x0+6,F.top+12,'above the dotted line: piglet gets more','gt2-tf','start');
      else lab(el.fg,xs(-4.8),ys(-0.6),'better for both than (d, d)','gt2-tm','start');
      for(rr=0;rr<sol.rounds.length;rr++){
        d=sol.rounds[rr];
        lines.push('round '+(rr+1)+': '+d.map(function(x){ var who=x[0]?M.P2:M.P1, sn=(x[0]?M.s2:M.s1); return who+"'s "+sn[1-x[1]]+' beats '+sn[x[1]]+' ('+x[2].join(', ')+')'; }).join('; '));
      }
      if(game==='pd') lines.unshift('a lone confessor serves '+f1(y)+' years: (d, c) pays ('+f1(-y)+', '+MINUS+'10)');
      else lines.unshift('after pushing alone piglet eats '+f1(k)+' grains: (Wait, Push) pays ('+f1(10-k)+', '+f1(k-2)+')');
      if(n===1) lines.push('IDSDS outcome ('+M.s1[last[0]]+', '+M.s2[last[1]]+') with payoffs ('+tl(Math.round(M.u[last[0]][last[1]][0]*10)/10)+', '+tl(Math.round(M.u[last[0]][last[1]][1]*10)/10)+')');
      else if(!sol.rounds.length) lines.push('no strategy is strictly dominated: IDSDS keeps all four profiles');
      else lines.push('IDSDS keeps '+n+' profiles');
      cur={game:game, y:y, k:k, n:n, rounds:sol.rounds.length, out:n===1?M.s1[last[0]]+M.s2[last[1]]:''};
      if(out) out.textContent=lines.join('\n');
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){
      if('game' in st) NF.press(fig,'data-game',String(st.game));
      if('y' in st && ry) ry.set(+st.y);
      if('k' in st && rk) rk.set(+st.k);
    });
    lockAll(); draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 5. Cournot: isoprofit curves, best responses and the shrinking square (a − c = 1, b = 1) ---------- */
  var QM=0.5, QO=1, QC=1/3;
  function cbr(q){ return Math.max(QM-q/2,0); }
  function cbounds(k){ var x=[0], i; for(i=0;i<k;i++) x.push(QM-x[i]/2); return k?[Math.min(x[k-1],x[k]),Math.max(x[k-1],x[k])]:[0,Infinity]; }
  NF.register('gt2-cournot',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var K=0, q1=0.75, q2=0.2, W=520, H=360, G, el={}, hs=[], A, cur={};
    var rk=range(fig,'k',0,function(x){ K=Math.round(x); update(); });
    if(rk) K=Math.round(rk.v());
    function draw(){
      var g, i, side, t=[[0,'0'],[QC,'qᶜ'],[QM,'qᵐ'],[QO,'q°']], rows;
      W=measure(svg); H=W<440?W+70:Math.min(Math.round(W*0.78),480); frame(svg,W,H);
      el.key=S('g',null,svg);
      rows=key(el.key,[['line','gt2-l gt2-r','BR₁'],['line','gt2-l gt2-p','BR₂'],['line','gt2-l gt2-thin gt2-mut','isoprofit of firm 1'],['rect','gt2-sqk','survivors']],40,13,W-10);
      side=Math.min(W-40-20,H-(13+rows*16+12)-38);
      G=square(W,13+rows*16+12,side,0,1.05,40,20);
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        line(g,C(G.xs(t[i][0])),G.top,C(G.xs(t[i][0])),G.bot,i===0?'nf-ax':'nf-grid'); text(g,G.xs(t[i][0]),G.bot+16,t[i][1],null,'middle');
        line(g,G.x0,C(G.ys(t[i][0])),G.x1,C(G.ys(t[i][0])),i===0?'nf-ax':'nf-grid'); text(g,G.x0-6,G.ys(t[i][0])+4,t[i][1],null,'end');
      }
      text(g,G.x1,G.bot+31,'q₁','nf-title gt2-it','end');
      text(g,G.x0-6,G.top-8,'q₂','nf-title gt2-it','end');
      el.gc=clip(svg,G.x0,G.top,G.side,G.side);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt2-k','Output pair q1 and q2, arrow keys move it',function(dx,dy,big){ put(q1+dx*(big?0.05:0.01),q2+dy*(big?0.05:0.01)); })];
      update();
    }
    function put(a,b){ q1=clamp(Math.round(a*100)/100,0.01,1.05); q2=clamp(Math.round(b*100)/100,0,1.05); update(); }
    function delRound(q){ var j, bd; for(j=1;j<=40;j++){ bd=cbounds(j); if(q<bd[0]-1e-9||q>bd[1]+1e-9) return [j,q<bd[0]?bd[0]:bd[1]]; } return null; }
    function update(){
      var xs=G.xs, ys=G.ys, j, bd, pi=q1*(1-q1-q2), pts=[], x, pk, br=cbr(q2), dr, s;
      clear(el.gc); clear(el.fg);
      for(j=1;j<=K;j++){
        bd=cbounds(j);
        S('rect',{x:R(xs(bd[0])),y:R(ys(bd[1])),width:R(xs(bd[1])-xs(bd[0])),height:R(ys(bd[0])-ys(bd[1])),'class':j===K?'gt2-sqk':'gt2-sq'},el.gc);
      }
      line(el.gc,xs(QM),ys(0),xs(0),ys(QO),'gt2-l gt2-r');
      line(el.gc,xs(QO),ys(0),xs(1.05),ys(0),'gt2-l gt2-p');
      line(el.gc,xs(0),ys(QM),xs(QO),ys(0),'gt2-l gt2-p');
      for(j=1;j<=K;j++){ bd=cbounds(j); dot(el.fg,xs(bd[0]),ys(bd[1]),3,'gt2-dk'); dot(el.fg,xs(bd[1]),ys(bd[0]),3,'gt2-dk'); }
      /* firm 1's isoprofit curve through (q1, q2): q2 = 1 − q1 − π/q1 */
      for(j=0;j<=240;j++){ x=0.004+1.05*j/240; pts.push([xs(x),ys(1-x-pi/x)]); }
      path(el.gc,pts.filter(function(p){ return p[1]>G.top-200 && p[1]<G.bot+200; }),'gt2-l gt2-thin gt2-mut');
      if(pi>0){ pk=Math.sqrt(pi); dot(el.fg,xs(pk),ys(1-2*pk),3.5,'gt2-dr'); }
      arrow(el.fg,xs(q1),ys(q2),xs(br),ys(q2),'gt2-l gt2-thin gt2-r','gt2-hr',7,2);
      dot(el.fg,xs(QC),ys(QC),5,'gt2-db');
      place(hs[0],xs(q1),ys(q2),q1,'q1 = '+q1.toFixed(2)+', q2 = '+q2.toFixed(2));
      bd=cbounds(K); dr=delRound(q1);
      cur={k:K, lo:bd[0], hi:K?bd[1]:-1, width:K?bd[1]-bd[0]:-1, q1:q1, q2:q2, pi1:pi, br1:br, gone:dr?dr[0]:0};
      if(out){
        s=K?'after round '+K+' each firm keeps q between '+fmt(bd[0],3)+' and '+fmt(bd[1],3)+' (width '+fmt(bd[1]-bd[0],3)+'); qᶜ = 0.333'
          :'round 0: every q ≥ 0 is still possible; move the slider to delete';
        s+='\n(q₁, q₂) = ('+f2(q1)+', '+f2(q2)+'): π₁ = '+fmt(pi,3)+' on the grey isoprofit curve, whose peak is BR₁(q₂) = '+f2(br);
        s+='\nq₁ = '+f2(q1)+(dr?' is deleted in round '+dr[0]+', strictly dominated by '+fmt(dr[1],3):' is never deleted');
        out.textContent=s;
      }
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[G.xs(q1),G.ys(q2)]]; },
      function(i,x,y){ put(G.xs.inv(x),G.ys.inv(y)); },focusOf(function(){ return hs; }));
    A=api(function(){ return cur; },function(st){
      if('k' in st && rk) rk.set(+st.k);
      if('q1' in st || 'q2' in st) put('q1' in st?+st.q1:q1,'q2' in st?+st.q2:q2);
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 6. Game 3: best responses on the belief simplex, and the justification chain ---------- */
  var U3={1:{own:['T','M','B'], opp:['L','C','R'], u:[[0,2,7],[5,3,5],[7,2,0]], cls:['r','p','o'], fill:['gt2-fr','gt2-fp','gt2-fo']},
          2:{own:['L','C','R'], opp:['T','M','B'], u:[[7,2,0],[5,3,5],[0,2,7]], cls:['k','k','k'], fill:['gt2-fg2','gt2-fg','gt2-fg3']}};
  /* each link: whose view, the belief (a point mass), the strategy it justifies */
  var LINKS=[[1,2,0],[2,2,2],[1,0,2],[2,0,0],[1,1,1],[2,1,1]];
  NF.register('gt2-rat',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var pl, al=[1/3,1/3,1/3], link=-1, W=520, H=330, T={}, el={}, hs=[], A, cur={};
    pl=+(seg(fig,'data-pl',function(x){ pl=+x; link=-1; draw(); }) || 1);
    var nb=fig.querySelector('.gt2-next');
    if(nb) nb.addEventListener('click',function(){
      var lk=(link+1)%LINKS.length, L=LINKS[lk];
      if(pl!==L[0]) NF.press(fig,'data-pl',String(L[0]));
      link=lk; pl=L[0]; al=[0,0,0]; al[L[1]]=1; draw();
    });
    /* opponent strategies 0, 1, 2 sit at bottom left, top, bottom right */
    function pt(a){ return [T.x0+(a[2]+0.5*a[1])*T.s, T.y0-a[1]*T.s*Math.sqrt(3)/2]; }
    function inv(x,y){
      var c=(T.y0-y)/(T.s*Math.sqrt(3)/2), r=(x-T.x0)/T.s-0.5*c, l=1-c-r, v=[l,c,r], i, m, tot;
      /* clip to the simplex: drop negative parts and renormalise, good enough for a pointer */
      for(i=0;i<3;i++) v[i]=Math.max(0,v[i]);
      tot=v[0]+v[1]+v[2]; for(i=0;i<3;i++) v[i]/=tot;
      m=[Math.round(v[0]*100)/100,Math.round(v[1]*100)/100]; m.push(Math.round((1-m[0]-m[1])*100)/100);
      return m;
    }
    function payoffs(a){ var u=U3[pl].u; return u.map(function(row){ return row[0]*a[0]+row[1]*a[1]+row[2]*a[2]; }); }
    function clipP(poly0,f){
      var out2=[], i, p, q, fp, fq, t;
      for(i=0;i<poly0.length;i++){
        p=poly0[i]; q=poly0[(i+1)%poly0.length]; fp=f(p); fq=f(q);
        if(fp>=0) out2.push(p);
        if(fp*fq<0){ t=fp/(fp-fq); out2.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1]),p[2]+t*(q[2]-p[2])]); }
      }
      return out2;
    }
    function draw(){
      var g, s, i, j, reg, P, cx, cy, M=U3[pl];
      W=measure(svg); H=W<440?Math.round(W*0.78)+70:330; frame(svg,W,H);
      s=Math.min(W-80,(H-74)/(Math.sqrt(3)/2));
      T={s:s, x0:(W-s)/2, y0:30+s*Math.sqrt(3)/2};
      g=S('g',null,svg);
      for(i=0;i<3;i++){
        reg=[[1,0,0],[0,0,1],[0,1,0]];
        for(j=0;j<3;j++) if(j!==i) reg=clipP(reg,(function(a,b){ return function(x){ return (M.u[a][0]-M.u[b][0])*x[0]+(M.u[a][1]-M.u[b][1])*x[1]+(M.u[a][2]-M.u[b][2])*x[2]; }; })(i,j));
        if(reg.length<3) continue;
        P=reg.map(pt); cx=0; cy=0; P.forEach(function(q){ cx+=q[0]/P.length; cy+=q[1]/P.length; });
        S('path',{d:poly(P)+'Z','class':M.fill[i]},g);
        S('path',{d:poly(P)+'Z','class':'gt2-edge'},g);
        lab(g,cx,cy+5,M.own[i],'gt2-sl gt2-t'+M.cls[i],'middle').setAttribute('class','gt2-sl nf-halo gt2-t'+M.cls[i]);
      }
      P=[[1,0,0],[0,1,0],[0,0,1]].map(pt);
      S('path',{d:poly(P)+'Z','class':'gt2-l gt2-thin gt2-ink'},g);
      text(g,P[0][0]-8,P[0][1]+16,M.opp[0],'gt2-sl','end'); text(g,P[1][0],P[1][1]-10,M.opp[1],'gt2-sl','middle'); text(g,P[2][0]+8,P[2][1]+16,M.opp[2],'gt2-sl','start');
      text(g,8,H-8,(pl===1?"player 1's belief about player 2":"player 2's belief about player 1"),'nf-title','start');
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt2-k','Belief point, arrow keys move it',function(dx,dy,big){
        var st=big?0.1:0.02, a=al.slice();
        if(dx){ a[2]+=dx*st; a[0]-=dx*st; } if(dy){ a[1]+=dy*st; a[0]-=dy*st/2; a[2]-=dy*st/2; }
        a=a.map(function(v){ return Math.max(0,v); }); var tt=a[0]+a[1]+a[2]; al=a.map(function(v){ return v/tt; }); link=-1; update();
      })];
      update();
    }
    function update(){
      var M=U3[pl], u=payoffs(al), m=Math.max(u[0],u[1],u[2]), best=[], i, p=pt(al), s, L;
      clear(el.fg);
      for(i=0;i<3;i++) if(u[i]>=m-1e-9) best.push(M.own[i]);
      place(hs[0],p[0],p[1],al[0],'belief '+M.opp.map(function(n,k){ return n+' '+al[k].toFixed(2); }).join(', '));
      cur={pl:pl, best:best.join(''), link:link, a0:al[0], a1:al[1], a2:al[2]};
      if(out){
        s=(pl===1?'player 1':'player 2')+', belief ('+M.opp.join(', ')+') = ('+al.map(f2).join(', ')+'): '+
          M.own.map(function(n,k){ return n+' '+f2(u[k]); }).join(', ')+': best response '+best.join(' and ');
        if(link>=0){
          L=LINKS[link];
          s+='\nlink '+(link+1)+' of 6: '+M.own[L[2]]+' is a best response to the belief that the other plays '+M.opp[L[1]]+
            (link<4?', which is itself justified by the next link: the cycle T, R, B, L closes':', and the pair M, C justifies itself');
        } else s+='\npress Next link to follow the chain of justifications';
        out.textContent=s;
      }
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [pt(al)]; },
      function(i,x,y){ al=inv(x,y); link=-1; update(); },focusOf(function(){ return hs; }),
      function(p){ var a=inv(p[0],p[1]), q=pt(a); return Math.hypot(q[0]-p[0],q[1]-p[1])<20?0:-1; });
    A=api(function(){ return cur; },function(st){
      if('pl' in st) NF.press(fig,'data-pl',String(st.pl));
      if('a0' in st || 'a1' in st || 'a2' in st){ var a=[+st.a0||0,+st.a1||0,+st.a2||0], tt=a[0]+a[1]+a[2]; if(tt>0){ al=a.map(function(v){ return v/tt; }); link=-1; update(); } }
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 7. Osborne and Rubinstein 58.1: correlated against independent beliefs ---------- */
  NF.register('gt2-corr',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, a=0.5, d=0.5, p=0.5, q=0.5, W=520, H=330, G, B={}, el={}, hs=[], A, cur={};
    var rp=range(fig,'p',2,function(x){ p=x; if(mode==='ind') update(); }), rq=range(fig,'q',2,function(x){ q=x; if(mode==='ind') update(); });
    if(rp) p=rp.v();
    if(rq) q=rq.v();
    mode=seg(fig,'data-mode',function(x){ mode=x; lockAll(); update(); }) || 'cor';
    function lockAll(){ lock(rp,mode!=='ind'); lock(rq,mode!=='ind'); }
    var CL=['r','t','p','o'], NM=['M₁','M₂','M₃','M₄'];
    function pays(A2,D2){ return [8*A2,4*A2+4*D2,8*D2,3]; }
    function draw(){
      var g, i, side, wide, t=[0,0.25,0.5,0.75,1], pts=[], s, x;
      W=measure(svg); wide=W>=520; H=wide?360:Math.round(W-30)+170; frame(svg,W,H);
      var rows=key(S('g',null,svg),[['line','gt2-l gt2-thin gt2-ink gt2-dash','independent beliefs stay below'],['rect','gt2-fg','reachable with independent mixing']],44,13,W-10), top=13+rows*16+14;
      side=wide?Math.min(H-top-40,W*0.56-50):Math.min(W-62,H-top-190);
      G=square(wide?Math.round(W*0.58):W,top,side,0,1,44,16);
      B=wide?{x0:G.x1+46, x1:W-72, top:G.top+30, step:44}:{x0:58, x1:W-72, top:G.bot+52, step:30};
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){
        line(g,C(G.xs(t[i])),G.top,C(G.xs(t[i])),G.bot,i===0?'nf-ax':'nf-grid'); text(g,G.xs(t[i]),G.bot+16,tl(t[i]),null,'middle');
        line(g,G.x0,C(G.ys(t[i])),G.x1,C(G.ys(t[i])),i===0?'nf-ax':'nf-grid'); text(g,G.x0-6,G.ys(t[i])+4,tl(t[i]),null,'end');
      }
      text(g,G.x1,G.bot+31,'a = α(U, L)','nf-title','end');
      text(g,G.x0+6,G.top+12,'d = α(D, R)','nf-title','start');
      var X=G.xs, Y=G.ys, th=3/8;
      S('path',{d:poly([[X(th),Y(0)],[X(1),Y(0)],[X(0.5),Y(0.5)],[X(th),Y(th)]])+'Z','class':'gt2-fr'},g);
      S('path',{d:poly([[X(0),Y(th)],[X(0),Y(1)],[X(0.5),Y(0.5)],[X(th),Y(th)]])+'Z','class':'gt2-fp'},g);
      S('path',{d:poly([[X(0),Y(0)],[X(th),Y(0)],[X(th),Y(th)],[X(0),Y(th)]])+'Z','class':'gt2-fo'},g);
      for(i=0;i<=120;i++){ s=i/120; pts.push([X(s*s),Y((1-s)*(1-s))]); }
      S('path',{d:poly([[X(0),Y(0)]].concat(pts))+'Z','class':'gt2-fg'},g);
      path(g,pts,'gt2-l gt2-thin gt2-ink gt2-dash');
      line(g,X(0),Y(1),X(1),Y(0),'gt2-l gt2-thin gt2-ink');
      line(g,X(th),Y(th),X(0.5),Y(0.5),'gt2-l gt2-thick gt2-t');
      lab(g,X(0.74),Y(0.1),'M₁','gt2-tr gt2-big','middle'); lab(g,X(0.1),Y(0.74),'M₃','gt2-tp gt2-big','middle');
      lab(g,X(0.08),Y(0.3),'M₄','gt2-to gt2-big','middle'); lab(g,X(0.53),Y(0.53),'M₂','gt2-tt gt2-big','start');
      el.bars=S('g',null,svg);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt2-k','Belief a and d, arrow keys move it',function(dx,dy,big){ if(mode==='cor') put(a+dx*(big?0.05:0.01),d+dy*(big?0.05:0.01)); })];
      update();
    }
    function put(x,y){ x=clamp(x,0,1); y=clamp(y,0,1); if(x+y>1){ var e=(x+y-1)/2; x-=e; y-=e; } a=Math.round(x*100)/100; d=Math.round(y*100)/100; if(a+d>1) d=Math.round((1-a)*100)/100; update(); }
    function update(){
      var A2=mode==='ind'?p*q:a, D2=mode==='ind'?(1-p)*(1-q):d, u=pays(A2,D2), m=Math.max.apply(null,u), best=[], i, bw=B.x1-B.x0, y, P, gap, s, xs8=function(v){ return B.x0+v/8*bw; };
      clear(el.bars); clear(el.fg);
      for(i=0;i<4;i++) if(u[i]>=m-1e-9) best.push(NM[i]);
      text(el.bars,B.x0,B.top-14,'u₃ against this belief','nf-title','start');
      for(i=0;i<4;i++){
        y=B.top+i*B.step;
        S('rect',{x:R(B.x0),y:R(y),width:R(bw),height:12,'class':'gt2-track'},el.bars);
        S('rect',{x:R(B.x0),y:R(y),width:R(Math.max(0,xs8(u[i])-B.x0)),height:12,'class':'gt2-f'+CL[i]},el.bars);
        line(el.bars,xs8(u[i]),y-2,xs8(u[i]),y+14,'gt2-l gt2-'+CL[i]);
        text(el.bars,B.x0-6,y+11,NM[i],'gt2-t'+CL[i],'end');
        text(el.bars,Math.min(xs8(u[i])+5,B.x1+2),y+11,f2(u[i])+(u[i]>=m-1e-9?' best':''),u[i]>=m-1e-9?'gt2-tk':'gt2-tm','start');
      }
      P=[G.xs(A2),G.ys(D2)];
      if(mode==='ind'){ dot(el.fg,P[0],P[1],5.5,'gt2-dk'); hs[0].classList.add('nf-hide'); }
      else { hs[0].classList.remove('nf-hide'); place(hs[0],P[0],P[1],a,'a = '+a.toFixed(2)+', d = '+d.toFixed(2)); }
      gap=u[1]-Math.max(u[0],u[2],u[3]);
      cur={mode:mode, a:A2, d:D2, p:p, q:q, best:best.join(''), m2:gap>=-1e-9, gap:gap};
      if(out){
        out.textContent='';
        s=(mode==='ind'?'independent: p = '+f2(p)+', q = '+f2(q)+' give a = pq = '+f2(A2)+', d = (1 '+MINUS+' p)(1 '+MINUS+' q) = '+f2(D2)
          :'correlated: a = '+f2(A2)+', d = '+f2(D2)+', off the diagonal '+f2(1-A2-D2))+'\nbest response '+best.join(', ')+': ';
        out.appendChild(document.createTextNode(s));
        if(gap>=-1e-9) span(out,'M₂ is a best response (it needs a = d ≥ 0.375)','gt2-good');
        else span(out,'M₂ falls short by '+f2(-gap)+(mode==='ind'?'; with independent beliefs it always falls short, by at least 0.90':''),'gt2-bad');
      }
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return mode==='cor'?[[G.xs(a),G.ys(d)]]:[null]; },
      function(i,x,y){ put(G.xs.inv(x),G.ys.inv(y)); },focusOf(function(){ return hs; }),
      function(pp){ return mode==='cor' && pp[0]>=G.x0 && pp[0]<=G.x1 && pp[1]>=G.top && pp[1]<=G.bot ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('p' in st && rp) rp.set(+st.p);
      if('q' in st && rq) rq.set(+st.q);
      if('a' in st || 'd' in st) put('a' in st?+st.a:a,'d' in st?+st.d:d);
    });
    lockAll(); draw();
    watch(svg,draw);
    return A;
  });
})();
