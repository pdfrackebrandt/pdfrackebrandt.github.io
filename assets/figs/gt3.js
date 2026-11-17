/* Core Micro GT3 figures (Nash equilibrium): the best reply cycle and belief simplex of the 3 by 3 game, player 2's
   payoffs against her belief in the 2 by 4 game, Bertrand, Cournot and Hotelling best responses, best response
   correspondences of six 2 by 2 games, and Kakutani's two conditions.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/gt3.css.
   Player 1 (or firm 1) is red and player 2 purple, as in the Word notes; equilibria are blue. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg,
      key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;

  /* ---------- shared ---------- */
  var SUB='₀₁₂₃₄₅₆₇₈₉';
  function sub(n){ return String(n).replace(/\d/g,function(d){ return SUB.charAt(+d); }); }
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); return g; }
  function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
  function scale(d0,d1,r0,r1){ var f=lin(d0,d1,r0,r1); f.r0=r0; f.r1=r1; f.d0=d0; f.d1=d1; return f; }
  function axes(g,xs,ys,xt,yt,xd,yd,xl){
    var x0=xs.r0, x1=xs.r1, y0=ys.r0, y1=ys.r1, i, v;
    for(i=0;i<yt.length;i++){ v=yt[i]; line(g,x0,C(ys(v)),x1,C(ys(v)),Math.abs(v)<1e-12?'nf-ax':'nf-grid'); text(g,x0-7,ys(v)+4,fmt(v,yd),null,'end'); }
    for(i=0;i<xt.length;i++){ v=xt[i]; line(g,C(xs(v)),y0,C(xs(v)),y1,'nf-grid'); text(g,xs(v),y0+17,xl?xl[i]:fmt(v,xd),null,'middle'); }
    line(g,x0,C(y0),x1,C(y0),'nf-ax');
    line(g,C(x0),y1,C(x0),y0,'nf-ax');
  }
  function path(g,pts,cls){ return S('path',{d:poly(pts),'class':cls},g); }
  function lab(g,x,y,s,cls,anchor){ return text(g,x,y,s,(cls?cls+' ':'')+'nf-halo',anchor); }
  function dot(g,x,y,r,cls){ return S('circle',{cx:R(x),cy:R(y),r:r,'class':cls},g); }
  function arrow(g,x1,y1,x2,y2,cls,hcls){
    var dx=x2-x1, dy=y2-y1, d=Math.hypot(dx,dy), ux, uy, hl, bx, by;
    if(d<3) return;
    ux=dx/d; uy=dy/d; hl=Math.min(8,d*0.6); bx=x2-ux*hl; by=y2-uy*hl;
    line(g,x1,y1,bx,by,cls);
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
    h.setAttribute('aria-valuenow',+(+now).toFixed(4));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever handle is nearest the pointer; pts() gives svg positions (null for none), move(i,x,y) takes the new
     one; any(p), when given, names the handle a press away from every handle grabs (or -1 for none) */
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
  function ticks(lo,hi,step){ var t=[], v; for(v=Math.ceil(lo/step-1e-9)*step;v<=hi+1e-9;v+=step) t.push(Math.round(v/step)*step); return t; }
  function sgn(v){ return v>1e-9?' > 0':v<-1e-9?' < 0':' = 0'; }

  /* ================= 1. the 3 by 3 game: best reply dynamics and player 1's beliefs ================= */
  NF.register('gt3-cycle',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var U1=[[0,2,7],[5,3,5],[7,2,0]], U2=[[7,5,0],[2,3,2],[0,5,7]], RN=['T','M','B'], CN=['L','C','R'];
    var mode, W=520, H=300, el={}, sel=[0,0], trail=[[0,0]], mover=1, bel=[0.3,0.3,0.4], hs=[], G={}, A, cur={};
    var stepB=fig.querySelector('[data-act="step"]'), resetB=fig.querySelector('[data-act="reset"]');
    function br1(c){ var b=0, i; for(i=1;i<3;i++) if(U1[i][c]>U1[b][c]) b=i; return b; }
    function br2(r){ var b=0, j; for(j=1;j<3;j++) if(U2[r][j]>U2[r][b]) b=j; return b; }
    function prof(rc){ return '('+RN[rc[0]]+', '+CN[rc[1]]+')'; }
    function u1(b){ return [2*b[1]+7*b[2], 5*b[0]+3*b[1]+5*b[2], 7*b[0]+2*b[1]]; }
    mode=seg(fig,'data-mode',function(v){ mode=v; draw(); }) || 'dyn';
    function select(r,c){ sel=[r,c]; trail=[[r,c]]; mover=1; update(); }
    function step(){
      var r=sel[0], c=sel[1], k;
      for(k=0;k<2;k++){
        if(mover===1 && br1(c)!==r){ sel=[br1(c),c]; trail.push(sel.slice()); mover=2; update(); return; }
        if(mover===2 && br2(r)!==c){ sel=[r,br2(r)]; trail.push(sel.slice()); mover=1; update(); return; }
        mover=mover===1?2:1;
      }
      update();
    }
    if(stepB) stepB.addEventListener('click',step);
    if(resetB) resetB.addEventListener('click',function(){ select(trail[0][0],trail[0][1]); });
    function geomDyn(){
      var cw=Math.min(120,Math.floor((W-48)/3)), ch=cw<90?50:58;
      G.cw=cw; G.ch=ch; G.x0=Math.round(36+((W-48)-3*cw)/2); G.y0=30;
      H=G.y0+3*ch+14;
    }
    function cx(c){ return G.x0+(c+0.5)*G.cw; }
    function cy(r){ return G.y0+(r+0.5)*G.ch; }
    function geomBel(){
      var s=Math.min(W-90,330), h=s*Math.sqrt(3)/2;
      G.s=s; G.h=h; G.xl=Math.round((W-s)/2); G.yb=Math.round(30+h); H=Math.round(G.yb+40);
      G.L=[G.xl,G.yb]; G.Rv=[G.xl+s,G.yb]; G.Cv=[G.xl+s/2,G.yb-h];
    }
    function bp(b){ return [b[0]*G.L[0]+b[1]*G.Cv[0]+b[2]*G.Rv[0], b[0]*G.L[1]+b[1]*G.Cv[1]+b[2]*G.Rv[1]]; }
    function toBel(x,y){
      var c=clamp((G.yb-y)/G.h,0,1), r=(x-G.xl-c*G.s/2)/G.s, l;
      r=clamp(r,0,1-c); l=1-c-r;
      return [l,c,r];
    }
    function putBel(b){
      var i, v=[[1,0,0],[0,1,0],[0,0,1]];
      b=[Math.max(0,b[0]),Math.max(0,b[1]),Math.max(0,b[2])];
      var s=b[0]+b[1]+b[2]; b=[b[0]/s,b[1]/s,b[2]/s];
      for(i=0;i<3;i++) if(Math.abs(b[0]-v[i][0])+Math.abs(b[1]-v[i][1])+Math.abs(b[2]-v[i][2])<0.08) b=v[i].slice();
      bel=[Math.round(b[0]*100)/100,Math.round(b[1]*100)/100,0]; bel[2]=Math.round((1-bel[0]-bel[1])*100)/100;
    }
    function draw(){
      W=measure(svg);
      if(stepB) stepB.hidden=mode!=='dyn';
      if(resetB) resetB.hidden=mode!=='dyn';
      if(mode==='dyn') geomDyn(); else geomBel();
      frame(svg,W,H);
      el.bg=S('g',null,svg); el.fg=S('g',null,svg);
      hs=[];
      if(mode==='dyn'){
        svg.setAttribute('tabindex','0');
      } else {
        svg.removeAttribute('tabindex');
        hs=[handle(svg,'gt3-kk','Player 1 belief over L, C and R, arrow keys move it',function(dx,dy,big){
          var d=big?0.1:0.02; putBel([bel[0]-dx*d/2-dy*d/2,bel[1]+dy*d,bel[2]+dx*d/2-dy*d/2]); update(); })];
      }
      update();
    }
    function paintDyn(){
      var g=el.bg, r, c, x, y, cls, t, i, a, b, nx, ny;
      for(c=0;c<3;c++) text(g,cx(c),G.y0-10,CN[c],'nf-title gt3-it gt3-big','middle');
      for(r=0;r<3;r++) text(g,G.x0-12,cy(r)+5,RN[r],'nf-title gt3-it gt3-big','end');
      for(r=0;r<3;r++) for(c=0;c<3;c++){
        cls='gt3-cell'+(r===1&&c===1?' gt3-ne':'')+(r===sel[0]&&c===sel[1]?' gt3-sel':'');
        S('rect',{x:G.x0+c*G.cw,y:G.y0+r*G.ch,width:G.cw,height:G.ch,'class':cls},g);
        x=cx(c); y=cy(r)+5;
        text(g,x-5,y,String(U1[r][c]),'gt3-pay'+(br1(c)===r?' gt3-tr gt3-bold':' gt3-tk'),'end');
        text(g,x,y,',','gt3-pay gt3-tk','middle');
        text(g,x+5,y,String(U2[r][c]),'gt3-pay'+(br2(r)===c?' gt3-tp gt3-bold':' gt3-tk'),'start');
      }
      text(g,cx(1),G.y0+G.ch+13,'NE','gt3-tb gt3-bold','middle');
      /* the path so far */
      for(i=1;i<trail.length;i++){
        a=trail[i-1]; b=trail[i];
        if(a[1]===b[1]) arrow(el.fg,cx(a[1])+G.cw*0.32,cy(a[0])+(b[0]>a[0]?10:-10),cx(b[1])+G.cw*0.32,cy(b[0])+(b[0]>a[0]?-12:12),'gt3-r gt3-thin','gt3-hr');
        else arrow(el.fg,cx(a[1])+(b[1]>a[1]?14:-14),cy(a[0])+G.ch*0.3,cx(b[1])+(b[1]>a[1]?-16:16),cy(b[0])+G.ch*0.3,'gt3-p gt3-thin','gt3-hp');
      }
      /* the pending best replies from the selected cell */
      r=sel[0]; c=sel[1];
      nx=br1(c); ny=br2(r);
      if(nx!==r) arrow(el.fg,cx(c)-G.cw*0.32,cy(r)+(nx>r?10:-10),cx(c)-G.cw*0.32,cy(nx)+(nx>r?-12:12),'gt3-r gt3-dash','gt3-hr');
      if(ny!==c) arrow(el.fg,cx(c)+(ny>c?14:-14),cy(r)-G.ch*0.3,cx(ny)+(ny>c?-16:16),cy(r)-G.ch*0.3,'gt3-p gt3-dash','gt3-hp');
    }
    function paintBel(){
      var g=el.bg, P=function(l,c,r){ return bp([l,c,r]); }, reg, u=u1(bel), b=0, i, pt, tie=[];
      for(i=1;i<3;i++) if(u[i]>u[b]+1e-9) b=i;
      for(i=0;i<3;i++) if(Math.abs(u[i]-u[b])<1e-9) tie.push(RN[i]);
      reg={T:[P(0,0,1),P(2/7,0,5/7),P(0,2/3,1/3)], B:[P(1,0,0),P(5/7,0,2/7),P(1/3,2/3,0)],
           M:[P(2/7,0,5/7),P(5/7,0,2/7),P(1/3,2/3,0),P(0,1,0),P(0,2/3,1/3)]};
      S('path',{d:poly(reg.T)+'Z','class':'gt3-fo'+(b===0?' gt3-hot':'')},g);
      S('path',{d:poly(reg.M)+'Z','class':'gt3-fb'+(b===1?' gt3-hot':'')},g);
      S('path',{d:poly(reg.B)+'Z','class':'gt3-ft'+(b===2?' gt3-hot':'')},g);
      line(g,P(2/7,0,5/7)[0],P(2/7,0,5/7)[1],P(0,2/3,1/3)[0],P(0,2/3,1/3)[1],'gt3-edge');
      line(g,P(5/7,0,2/7)[0],P(5/7,0,2/7)[1],P(1/3,2/3,0)[0],P(1/3,2/3,0)[1],'gt3-edge');
      path(g,[G.L,G.Rv,G.Cv,G.L],'gt3-tri');
      pt=P(0.12,0.1,0.78); lab(g,pt[0],pt[1]+4,'T','gt3-to gt3-big gt3-bold','middle');
      pt=P(0.78,0.1,0.12); lab(g,pt[0],pt[1]+4,'B','gt3-tt gt3-big gt3-bold','middle');
      pt=P(0.3,0.5,0.2); lab(g,pt[0],pt[1]+4,'M','gt3-tb gt3-big gt3-bold','middle');
      text(g,G.L[0]-6,G.L[1]+18,'belief L','nf-title','start');
      text(g,G.Rv[0]+6,G.Rv[1]+18,'belief R','nf-title','end');
      text(g,G.Cv[0],G.Cv[1]-10,'belief C (the NE)','nf-title','middle');
      pt=bp(bel);
      place(hs[0],pt[0],pt[1],bel[1],'belief l '+bel[0].toFixed(2)+', c '+bel[1].toFixed(2)+', r '+bel[2].toFixed(2));
      return {u:u,b:b,tie:tie};
    }
    function update(){
      clear(el.bg); clear(el.fg);
      var s, r=sel[0], c=sel[1], res, ne, cyc;
      if(mode==='dyn'){
        paintDyn();
        ne=br1(c)===r && br2(r)===c;
        s=prof(sel)+': player 1\'s best reply to '+CN[c]+' is '+RN[br1(c)]+' ('+U1[br1(c)][c]+')'+(br1(c)===r?', kept':', so player 1 moves')+
          '; player 2\'s best reply to '+RN[r]+' is '+CN[br2(r)]+' ('+U2[r][br2(r)]+')'+(br2(r)===c?', kept':', so player 2 moves');
        cyc=trail.length>=5 && trail[trail.length-1][0]===trail[trail.length-5][0] && trail[trail.length-1][1]===trail[trail.length-5][1];
        s+='\npath: '+trail.map(prof).join(' → ');
        s+=ne?'\nmutual best replies: '+prof(sel)+' is the Nash equilibrium':cyc?'\nthe path cycles through (T, L), (B, L), (B, R), (T, R): each strategy is justified, none is a fixed point':'\npress Best reply step to let the next player switch';
        cur={mode:mode, row:RN[r], col:CN[c], ne:ne, steps:trail.length-1, cycle:cyc};
      } else {
        res=paintBel();
        s='belief (ℓ, c, r) = ('+bel[0].toFixed(2)+', '+bel[1].toFixed(2)+', '+bel[2].toFixed(2)+')'+
          '\nu₁(T) = 2c + 7r = '+res.u[0].toFixed(2)+',  u₁(M) = 5ℓ + 3c + 5r = '+res.u[1].toFixed(2)+',  u₁(B) = 7ℓ + 2c = '+res.u[2].toFixed(2)+
          '\n'+(res.tie.length>1?'indifferent between '+res.tie.join(' and '):'best response '+RN[res.b])+(bel[1]===1?': the correct belief at (M, C)':bel[0]===1?': but player 2\'s best reply to B is R, so the belief L is wrong':bel[2]===1?': but player 2\'s best reply to T is L, so the belief R is wrong':'');
        cur={mode:mode, l:bel[0], c:bel[1], r:bel[2], br:RN[res.b]};
      }
      if(out) out.textContent=s;
      if(A) A.changed();
    }
    svg.addEventListener('click',function(e){
      if(mode!=='dyn') return;
      var p=local(svg,e,W,H), c=Math.floor((p[0]-G.x0)/G.cw), r=Math.floor((p[1]-G.y0)/G.ch);
      if(r>=0 && r<3 && c>=0 && c<3) select(r,c);
    });
    svg.addEventListener('keydown',function(e){
      if(mode!=='dyn' || e.target!==svg) return;
      var k=e.key, r=sel[0], c=sel[1];
      if(k==='ArrowRight') c=Math.min(2,c+1); else if(k==='ArrowLeft') c=Math.max(0,c-1);
      else if(k==='ArrowDown') r=Math.min(2,r+1); else if(k==='ArrowUp') r=Math.max(0,r-1);
      else if(k==='Enter' || k===' '){ e.preventDefault(); step(); return; }
      else return;
      e.preventDefault(); select(r,c);
    });
    dragger(svg,function(){ return [W,H]; },function(){ return mode==='bel'?[bp(bel)]:[]; },
      function(i,x,y){ var b=toBel(x,y); putBel(b); update(); },focusOf(function(){ return hs; }),
      function(p){ return mode==='bel' && p[1]>=G.yb-G.h-6 && p[1]<=G.yb+6 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('row' in st || 'col' in st) select(Math.max(0,RN.indexOf(st.row||RN[sel[0]])),Math.max(0,CN.indexOf(st.col||CN[sel[1]])));
      if('l' in st || 'c' in st) putBel(['l' in st?+st.l:bel[0],'c' in st?+st.c:bel[1],1-('l' in st?+st.l:bel[0])-('c' in st?+st.c:bel[1])]);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ================= 2. the 2 by 4 game: player 2's payoffs against her belief ================= */
  NF.register('gt3-risk',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var B2=[[6,5,3,-1000],[-10000,-1000,3,20]], A1=[[200,3,4,0],[0,5,6,3]];
    var CUT=[0,1/60,1003/1005,9000/9001,1], ORD=[3,2,1,0], CL=['gt3-o','gt3-g','gt3-p','gt3-r'], FL=['gt3-fo','gt3-fg','gt3-fp','gt3-fr'];
    var WIN={near0:[0,0.05,0.01,2,0.0005], all:[0,1,0.25,2,0.005], near1:[0.996,1,0.001,3,0.00005]};
    var mode, p=0.01, W=520, H=300, F, xs, ys, el={}, hs=[], A, cur={};
    mode=seg(fig,'data-mode',function(v){ mode=v; var w=WIN[v]; if(p<w[0]||p>w[1]) p=v==='near0'?0.01:v==='all'?0.5:0.999; draw(); }) || 'near0';
    function u2(q){ return [0,1,2,3].map(function(j){ return q*B2[0][j]+(1-q)*B2[1][j]; }); }
    function br(q){ var u=u2(q), b=0, j; for(j=1;j<4;j++) if(u[j]>u[b]+1e-12) b=j; return b; }
    function snap(v){ var w=WIN[mode]; v=clamp(v,w[0],w[1]); v=Math.round(v/w[4])*w[4]; if(Math.abs(v-1/60)<w[4]*0.75) v=1/60; return clamp(+v.toFixed(6),w[0],w[1]); }
    function draw(){
      var w=WIN[mode], rows, xt, i;
      W=measure(svg); H=W<440?290:310; frame(svg,W,H);
      el.key=S('g',null,svg);
      rows=key(el.key,[['line','gt3-o','t₁'],['line','gt3-g','t₂'],['line','gt3-p','t₃ (safe)'],['line','gt3-r','t₄']],46,13,W-10);
      F={top:13+rows*16+12, bot:H-62, x0:46, x1:W-14};
      xs=scale(w[0],w[1],F.x0,F.x1); ys=scale(-30,25,F.bot,F.top);
      xt=ticks(w[0],w[1],(F.x1-F.x0)<300?w[2]*2:w[2]);
      el.bg=S('g',null,svg);
      axes(el.bg,xs,ys,xt,[-30,-20,-10,0,10,20],w[3],0);
      text(el.bg,F.x1,F.bot+52,'p = Pr(s₁), player 2\'s belief','nf-title','end');
      text(el.bg,F.x0-7,F.top-8,'u₂','nf-title gt3-it','end');
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.strip=S('g',null,svg);
      el.fg=S('g',null,svg);
      for(i=0;i<4;i++){
        path(el.gc,[[xs(w[0]),ys(u2(w[0])[i])],[xs(w[1]),ys(u2(w[1])[i])]],CL[i]+(i===2||i===3?' gt3-w':''));
      }
      /* the best response strip under the axis */
      for(i=0;i<4;i++){
        var a=Math.max(CUT[i],w[0]), b=Math.min(CUT[i+1],w[1]);
        if(b>a) S('rect',{x:R(xs(a)),y:F.bot+24,width:Math.max(1,R(xs(b)-xs(a))),height:8,'class':FL[ORD[i]]+' gt3-solid'},el.strip);
      }
      text(el.strip,F.x0-7,F.bot+32,'B₂','nf-title gt3-it','end');
      hs=[handle(svg,'gt3-kk','Belief p, the probability of s1, arrow keys move it',function(dx,dy,big){ p=snap(p+(dx||dy)*WIN[mode][4]*(big?10:1)); update(); })];
      update();
    }
    function update(){
      clear(el.fg);
      var u=u2(p), b=br(p), pb=A1[0][b]>A1[1][b]?0:1, need=pb===0?1:0, bn=br(need), s, x=xs(p), tie=[], j;
      for(j=0;j<4;j++) if(Math.abs(u[j]-u[b])<1e-9) tie.push('t'+sub(j+1));
      line(el.fg,x,F.top,x,F.bot,'nf-guide');
      for(var j=0;j<4;j++) if(u[j]>=-30 && u[j]<=25) dot(el.fg,x,ys(u[j]),j===b?4.5:3,'gt3-d'+'oxpr'.charAt(j)+(j===b?'':' gt3-faint'));
      place(hs[0],x,F.bot,p,'p = '+p.toFixed(5));
      s='p = '+fmt(p,mode==='near1'?5:4)+':  u₂(t₁) = '+fmt(u[0],1)+',  u₂(t₂) = '+fmt(u[1],1)+',  u₂(t₃) = 3.0,  u₂(t₄) = '+fmt(u[3],1)+
        '\n'+(tie.length>1?'best responses '+tie.join(' and ')+' (a tie); with t'+sub(b+1):'best response t'+sub(b+1))+'; player 1\'s best reply to t'+sub(b+1)+' is s'+sub(pb+1)+', so the correct belief is p = '+need+
        '\n'+(bn===b?'at p = '+need+' player 2 still plays t'+sub(b+1)+': (s'+sub(pb+1)+', t'+sub(b+1)+') is a Nash equilibrium':
          'at p = '+need+' player 2 would switch to t'+sub(bn+1)+': (s'+sub(pb+1)+', t'+sub(b+1)+') is not an equilibrium');
      if(out) out.textContent=s;
      cur={mode:mode, p:p, br:'t'+(b+1), ne:bn===b};
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(p),F.bot]]; },function(i,x){ p=snap(xs.inv(clamp(x,F.x0,F.x1))); update(); },
      focusOf(function(){ return hs; }),function(q){ return q[0]>=F.x0-4 && q[0]<=F.x1+4 && q[1]>=F.top && q[1]<=F.bot+36 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('p' in st) p=snap(+st.p);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ================= 3. Bertrand ================= */
  NF.register('gt3-bertrand',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, c=0.2, p2=0.45, P=[0.4,0.55], W=520, H=320, F, xs, ys, el={}, hs=[], A, cur={}, EPS=0.001;
    var rc=range(fig,'c',2,function(v){ c=v; update(); }), rp=range(fig,'p2',2,function(v){ p2=v; update(); });
    if(rc) c=rc.v();
    if(rp) p2=rp.v();
    mode=seg(fig,'data-mode',function(v){ mode=v; lock(rp,mode!=='profit'); draw(); }) || 'profit';
    lock(rp,mode!=='profit');
    function pm(){ return (1+c)/2; }
    function pi(a,b){ return a<b-1e-9?(a-c)*(1-a):Math.abs(a-b)<=1e-9?0.5*(a-c)*(1-a):0; }
    function brText(b){
      var m=pm();
      if(b<c-1e-9) return 'any price above '+b.toFixed(2)+' (profit 0; matching or undercutting loses money)';
      if(Math.abs(b-c)<=1e-9) return 'any price of at least c = '+c.toFixed(2)+' (profit 0)';
      if(b<=m+1e-9) return 'empty: undercut as little as possible, the supremum '+((b-c)*(1-b)).toFixed(4)+' at p₁ → '+b.toFixed(2)+' is not attained';
      return 'the monopoly price '+m.toFixed(2)+', profit '+((m-c)*(1-m)).toFixed(4);
    }
    /* firm i's most profitable move against the rival price b, from a short list that always contains the best one */
    function bestMove(a,b){
      var cand=[b-EPS,b,pm(),c,Math.min(1,b+0.05),a], best=a, bv=pi(a,b), i, v;
      for(i=0;i<cand.length;i++){ if(cand[i]<0) continue; v=pi(cand[i],b); if(v>bv+1e-9){ bv=v; best=cand[i]; } }
      return {to:best, gain:bv-pi(a,b), v:bv};
    }
    function snapP(v){ v=clamp(Math.round(v*100)/100,0,0.9); if(Math.abs(v-c)<0.012) v=c; return v; }
    function draw(){
      var rows;
      W=measure(svg);
      if(mode==='profit'){
        H=W<440?290:310; frame(svg,W,H); el.key=S('g',null,svg);
        rows=key(el.key,[['line','gt3-r','π₁ against p₁'],['line','gt3-g gt3-dash','(p₁ − c)(1 − p₁)']],50,13,W-10);
        F={top:13+rows*16+12, bot:H-40, x0:50, x1:W-14};
        xs=scale(0,1,F.x0,F.x1); ys=scale(-0.1,0.3,F.bot,F.top);
        el.bg=S('g',null,svg);
        axes(el.bg,xs,ys,(F.x1-F.x0)<300?[0,0.5,1]:[0,0.2,0.4,0.6,0.8,1],[-0.1,0,0.1,0.2,0.3],1,1);
        text(el.bg,F.x1,F.bot+32,'p₁','nf-title gt3-it','end');
        text(el.bg,F.x0-7,F.top-8,'π₁','nf-title gt3-it','end');
        hs=[];
      } else {
        var side=Math.min(W-64,360);
        H=Math.round(side+70); frame(svg,W,H); el.key=S('g',null,svg);
        rows=key(el.key,[['line','gt3-r','B₁(p₂)'],['line','gt3-p gt3-dash','B₂(p₁)'],['line','gt3-r gt3-thin','firm 1 deviates'],['line','gt3-p gt3-thin','firm 2 deviates']],50,13,W-10);
        F={top:13+rows*16+12, x0:Math.round(50+((W-64)-side)/2)};
        F.bot=F.top+side; F.x1=F.x0+side; H=F.bot+40; frame(svg,W,H);
        el.key=S('g',null,svg);
        key(el.key,[['line','gt3-r','B₁(p₂)'],['line','gt3-p gt3-dash','B₂(p₁)'],['line','gt3-r gt3-thin','firm 1 deviates'],['line','gt3-p gt3-thin','firm 2 deviates']],50,13,W-10);
        xs=scale(0,0.9,F.x0,F.x1); ys=scale(0,0.9,F.bot,F.top);
        el.bg=S('g',null,svg);
        axes(el.bg,xs,ys,[0,0.2,0.4,0.6,0.8],[0,0.2,0.4,0.6,0.8],1,1);
        text(el.bg,F.x1,F.bot+32,'p₁','nf-title gt3-it','end');
        text(el.bg,F.x0-7,F.top-8,'p₂','nf-title gt3-it','end');
        hs=[handle(svg,'gt3-kk','Price pair p1 and p2, arrow keys move it',function(dx,dy,big){ P=[snapP(P[0]+dx*(big?0.05:0.01)),snapP(P[1]+dy*(big?0.05:0.01))]; update(); })];
      }
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.fg=S('g',null,svg);
      update();
    }
    function paintProfit(){
      var g=el.gc, f=el.fg, m=pm(), pts=[], i, x, top=(p2-c)*(1-p2), s;
      for(i=0;i<=200;i++){ x=i/200; pts.push([xs(x),ys((x-c)*(1-x))]); }
      path(g,pts,'gt3-g gt3-dash');
      line(g,xs(c),F.top,xs(c),F.bot,'nf-guide'); lab(f,xs(c)+4,F.bot-6,'c','gt3-tm gt3-it','start');
      line(g,xs(m),F.top,xs(m),F.bot,'nf-guide'); lab(f,xs(m)+4,F.top+12,'monopoly price','gt3-tm','start');
      pts=[];
      for(i=0;i<=200;i++){ x=p2*i/200; pts.push([xs(x),ys((x-c)*(1-x))]); }
      path(g,pts,'gt3-r gt3-w');
      path(g,[[xs(p2),ys(0)],[xs(1),ys(0)]],'gt3-r gt3-w');
      if(p2<c-1e-9 || Math.abs(p2-c)<=1e-9) path(g,[[xs(Math.max(p2,c)),ys(0)],[xs(1),ys(0)]],'gt3-r gt3-thick');
      dot(f,xs(p2),ys(top),4.5,'gt3-open gt3-or');
      dot(f,xs(p2),ys(top/2),4,'gt3-dr');
      if(p2>m+1e-9){ dot(f,xs(m),ys((m-c)*(1-m)),5,'gt3-db'); lab(f,xs(m),ys((m-c)*(1-m))-10,'B₁ = monopoly price','gt3-tb','middle'); }
      else if(p2>c+1e-9) lab(f,xs(p2),ys(top)-10,'sup, not attained','gt3-tr','middle');
      cur={mode:mode, c:c, p2:p2, empty:p2>c+1e-9 && p2<=m+1e-9};
      s='rival price p₂ = '+p2.toFixed(2)+', c = '+c.toFixed(2)+', monopoly price '+m.toFixed(2)+
        '\nπ₁ = (p₁ − c)(1 − p₁) below p₂, half of it at p₁ = p₂ ('+(top/2).toFixed(4)+'), 0 above'+
        '\nB₁(p₂): '+brText(p2);
      return s;
    }
    function paintMap(){
      var g=el.gc, f=el.fg, m=pm(), L=0.9, a=bestMove(P[0],P[1]), b=bestMove(P[1],P[0]), s, ne;
      S('path',{d:poly([[xs(0),ys(0)],[xs(c),ys(c)],[xs(L),ys(c)],[xs(L),ys(0)]])+'Z','class':'gt3-fr'},g);
      S('path',{d:poly([[xs(0),ys(0)],[xs(c),ys(c)],[xs(c),ys(L)],[xs(0),ys(L)]])+'Z','class':'gt3-fp'},g);
      line(g,xs(0),ys(0),xs(L),ys(L),'gt3-diag');
      path(g,[[xs(c),ys(c)],[xs(L),ys(c)]],'gt3-r gt3-w'); path(g,[[xs(m),ys(m)],[xs(m),ys(L)]],'gt3-r gt3-w');
      path(g,[[xs(c),ys(c)],[xs(c),ys(L)]],'gt3-p gt3-w gt3-dash'); path(g,[[xs(m),ys(m)],[xs(L),ys(m)]],'gt3-p gt3-w gt3-dash');
      dot(f,xs(c),ys(c),5.5,'gt3-db'); lab(f,xs(c)+9,ys(c)+16,'NE (c, c)','gt3-tb gt3-bold','start');
      if(a.gain>1e-9) arrow(f,xs(P[0]),ys(P[1]),xs(a.to),ys(P[1]),'gt3-r gt3-thin','gt3-hr');
      if(b.gain>1e-9) arrow(f,xs(P[0]),ys(P[1]),xs(P[0]),ys(b.to),'gt3-p gt3-thin','gt3-hp');
      place(hs[0],xs(P[0]),ys(P[1]),P[0],'p1 '+P[0].toFixed(2)+', p2 '+P[1].toFixed(2));
      ne=a.gain<=1e-9 && b.gain<=1e-9;
      function mv(i,o,own,r){
        if(o.gain<=1e-9) return 'firm '+i+' has no profitable deviation';
        var below=Math.abs(o.to-(r-EPS))<1e-9, where=below?'just below '+r.toFixed(2):Math.abs(o.to-r)<1e-9?r.toFixed(2)+' (a tie)':o.to.toFixed(2);
        return 'firm '+i+' gains '+o.gain.toFixed(4)+' by '+(o.to>own?'raising':below?'undercutting':'cutting')+' to '+where;
      }
      s='(p₁, p₂) = ('+P[0].toFixed(2)+', '+P[1].toFixed(2)+'):  π₁ = '+pi(P[0],P[1]).toFixed(4)+',  π₂ = '+pi(P[1],P[0]).toFixed(4)+
        '\n'+mv(1,a,P[0],P[1])+'; '+mv(2,b,P[1],P[0])+
        '\n'+(ne?'no one deviates: this is the Nash equilibrium (c, c)':'not an equilibrium; only (c, c) survives every deviation');
      cur={mode:mode, c:c, p1:P[0], p2:P[1], ne:ne};
      return s;
    }
    function update(){
      clear(el.gc); clear(el.fg);
      var s=mode==='profit'?paintProfit():paintMap();
      if(out) out.textContent=s;
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return mode==='map'?[[xs(P[0]),ys(P[1])]]:[]; },
      function(i,x,y){ P=[snapP(xs.inv(clamp(x,F.x0,F.x1))),snapP(ys.inv(clamp(y,F.top,F.bot)))]; update(); },
      focusOf(function(){ return hs; }),function(q){ return mode==='map' && q[0]>=F.x0 && q[0]<=F.x1 && q[1]>=F.top && q[1]<=F.bot ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('c' in st && rc) rc.set(+st.c);
      if('p2' in st && rp && mode==='profit') rp.set(+st.p2);
      if('p1' in st && mode==='map') P[0]=snapP(+st.p1);
      if('p2' in st && mode==='map') P[1]=snapP(+st.p2);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ================= 4. Cournot ================= */
  NF.register('gt3-cournot',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var a0=10, mode, c1=2, c2=4, N=2, st0=[0,0], W=520, H=320, F, xs, ys, el={}, hs=[], A, cur={};
    var r1=range(fig,'c1',1,function(v){ c1=v; update(); }), r2=range(fig,'c2',1,function(v){ c2=v; update(); }), rn=range(fig,'n',0,function(v){ N=Math.round(v); update(); });
    if(r1) c1=r1.v();
    if(r2) c2=r2.v();
    if(rn) N=Math.round(rn.v());
    mode=seg(fig,'data-mode',function(v){ mode=v; lock(r1,mode!=='br'); lock(r2,mode!=='br'); lock(rn,mode!=='n'); draw(); }) || 'br';
    lock(r1,mode!=='br'); lock(r2,mode!=='br'); lock(rn,mode!=='n');
    function B1(q){ return Math.max(0,(a0-c1-q)/2); }
    function B2(q){ return Math.max(0,(a0-c2-q)/2); }
    function ne(){ var x=0, y=0, k; for(k=0;k<200;k++){ x=B1(y); y=B2(x); } return [x,y]; }
    function lin_(n){ return {p:2+8/(n+1), Q:8*n/(n+1)}; }
    function con_(n){ var Q=Math.sqrt(8/(0.1+0.2/n)); return {p:10-0.1*Q*Q, Q:Q}; }
    function draw(){
      var rows;
      W=measure(svg); H=W<440?300:320; frame(svg,W,H);
      el.key=S('g',null,svg);
      if(mode==='br'){
        rows=key(el.key,[['line','gt3-r','B₁(q₂)'],['line','gt3-p','B₂(q₁)'],['line','gt3-g gt3-dash','best reply path']],46,13,W-10);
        F={top:13+rows*16+12, bot:H-40, x0:46, x1:W-14};
        xs=scale(0,10,F.x0,F.x1); ys=scale(0,10,F.bot,F.top);
        el.bg=S('g',null,svg);
        axes(el.bg,xs,ys,[0,2,4,6,8,10],[0,2,4,6,8,10],0,0);
        text(el.bg,F.x1,F.bot+32,'q₁','nf-title gt3-it','end');
        text(el.bg,F.x0-7,F.top-8,'q₂','nf-title gt3-it','end');
        hs=[handle(svg,'gt3-kk','Starting point of the best reply path, arrow keys move it',function(dx,dy,big){ st0=[clamp(st0[0]+dx*(big?1:0.25),0,10),clamp(st0[1]+dy*(big?1:0.25),0,10)]; update(); })];
      } else {
        rows=key(el.key,[['line','gt3-k','p(Q) = 10 − Q'],['line','gt3-g','p(Q) = 10 − Q²/10'],['line','gt3-o','markup']],46,13,W-10);
        F={top:13+rows*16+12, bot:H-40, x0:46, x1:W-14};
        xs=scale(0.5,20.5,F.x0,F.x1); ys=scale(1.5,8,F.bot,F.top);
        el.bg=S('g',null,svg);
        axes(el.bg,xs,ys,(F.x1-F.x0)<300?[1,5,10,15,20]:[1,2,4,6,8,10,12,14,16,18,20],[2,3,4,5,6,7,8],0,0);
        text(el.bg,F.x1,F.bot+32,'number of firms N, common cost c = 2','nf-title','end');
        text(el.bg,F.x0-7,F.top-8,'p*','nf-title gt3-it','end');
        hs=[];
      }
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.fg=S('g',null,svg);
      update();
    }
    function paintBr(){
      var g=el.gc, f=el.fg, q=ne(), path_=[st0.slice()], x=st0[0], y=st0[1], k, Q, p, act=0, avg=0, s;
      /* B1: q1 = (a - c1 - q2)/2 from (B1(0), 0) up to (0, a - c1), then q1 = 0; B2 the mirror image */
      path(g,[[xs(B1(0)),ys(0)],[xs(0),ys(a0-c1)],[xs(0),ys(10)]],'gt3-r gt3-w');
      path(g,[[xs(0),ys(B2(0))],[xs(a0-c2),ys(0)],[xs(10),ys(0)]],'gt3-p gt3-w');
      for(k=0;k<12;k++){ x=B1(y); path_.push([x,y]); y=B2(x); path_.push([x,y]); }
      path(g,path_.map(function(v){ return [xs(v[0]),ys(v[1])]; }),'gt3-g gt3-dash');
      dot(f,xs(q[0]),ys(q[1]),5.5,'gt3-db');
      lab(f,xs(q[0])+9,ys(q[1])-9,'q* = ('+q[0].toFixed(2)+', '+q[1].toFixed(2)+')','gt3-tb','start');
      place(hs[0],xs(st0[0]),ys(st0[1]),st0[0],'start ('+st0[0].toFixed(2)+', '+st0[1].toFixed(2)+')');
      Q=q[0]+q[1]; p=a0-Q;
      if(q[0]>1e-9){ act++; avg+=c1; }
      if(q[1]>1e-9){ act++; avg+=c2; }
      avg/=Math.max(1,act);
      s='c₁ = '+c1.toFixed(1)+', c₂ = '+c2.toFixed(1)+':  q* = ('+q[0].toFixed(2)+', '+q[1].toFixed(2)+'),  Q* = '+Q.toFixed(2)+',  p* = '+p.toFixed(2)+
        '\nactive firms '+act+': p* − Q*/'+act+' = '+(p-Q/act).toFixed(2)+' equals their average cost '+avg.toFixed(2)+
        '\nbest replies from ('+st0[0].toFixed(2)+', '+st0[1].toFixed(2)+') reach ('+x.toFixed(2)+', '+y.toFixed(2)+') after 24 moves';
      cur={mode:mode, c1:c1, c2:c2, q1:q[0], q2:q[1], p:p, active:act};
      return s;
    }
    function paintN(){
      var g=el.gc, f=el.fg, n, pl=[], pc=[], L=lin_(N), K=con_(N), s;
      line(g,F.x0,ys(2),F.x1,ys(2),'gt3-diag'); lab(f,F.x1-4,ys(2)-6,'c = 2','gt3-tm','end');
      for(n=1;n<=20;n++){ pl.push([xs(n),ys(lin_(n).p)]); pc.push([xs(n),ys(con_(n).p)]); }
      path(g,pc,'gt3-g gt3-w'); path(g,pl,'gt3-k gt3-w');
      for(n=1;n<=20;n++){ dot(g,xs(n),ys(con_(n).p),2.5,'gt3-dg'); dot(g,xs(n),ys(lin_(n).p),2.5,'gt3-dk'); }
      line(f,xs(N),ys(2),xs(N),ys(L.p),'gt3-o gt3-w');
      dot(f,xs(N),ys(L.p),5,'gt3-dk'); dot(f,xs(N),ys(K.p),5,'gt3-dg');
      lab(f,xs(N)+(N>14?-8:8),ys((2+L.p)/2)+4,'markup '+(L.p-2).toFixed(2),'gt3-to',N>14?'end':'start');
      s='N = '+N+', linear demand:  p* = 2 + 8/(N + 1) = '+L.p.toFixed(2)+',  Q* = '+L.Q.toFixed(2)+',  markup −(Q*/N)p′ = '+(L.p-2).toFixed(2)+
        '\nconcave demand:  p* = '+K.p.toFixed(2)+',  Q* = '+K.Q.toFixed(2)+',  markup (Q*/N)(Q*/5) = '+(K.Q/N*K.Q/5).toFixed(2)+
        '\n'+(N===1?'one firm: the monopoly prices 6 and 7.33':'c = 2 < p* < monopoly price ('+(N>1?'6 and 7.33':'')+'), and p* falls towards c as N grows');
      cur={mode:mode, n:N, p:L.p, pc:K.p};
      return s;
    }
    function update(){
      clear(el.gc); clear(el.fg);
      var s=mode==='br'?paintBr():paintN();
      if(out) out.textContent=s;
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return mode==='br'?[[xs(st0[0]),ys(st0[1])]]:[]; },
      function(i,x,y){ st0=[clamp(Math.round(xs.inv(x)*4)/4,0,10),clamp(Math.round(ys.inv(y)*4)/4,0,10)]; update(); },
      focusOf(function(){ return hs; }),function(q){ return mode==='br' && q[0]>=F.x0 && q[0]<=F.x1 && q[1]>=F.top && q[1]<=F.bot ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('c1' in st && r1) r1.set(+st.c1);
      if('c2' in st && r2) r2.set(+st.c2);
      if('n' in st && rn) rn.set(+st.n);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ================= 5. Hotelling ================= */
  NF.register('gt3-hotelling',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, t=1, c=1, p1=2.3, p2=2, W=520, H=320, F, xs, ys, el={}, hs=[], A, cur={}, PM=6;
    var rt=range(fig,'t',2,function(v){ t=v; drawOrUpdate(); }), rc=range(fig,'c',2,function(v){ c=v; drawOrUpdate(); }),
        r1=range(fig,'p1',2,function(v){ p1=v; update(); }), r2=range(fig,'p2',2,function(v){ p2=v; update(); });
    if(rt) t=rt.v();
    if(rc) c=rc.v();
    if(r1) p1=r1.v();
    if(r2) p2=r2.v();
    mode=seg(fig,'data-mode',function(v){ mode=v; draw(); }) || 'city';
    function Bh(pj){ return pj<c-t?c:pj<=3*t+c?(t+c+pj)/2:pj-t; }
    function zh(){ return clamp(0.5+(p2-p1)/(2*t),0,1); }
    function drawOrUpdate(){ if(mode==='br') draw(); else update(); }
    function draw(){
      var rows, side, tk;
      W=measure(svg);
      if(mode==='city'){
        H=W<440?290:300; frame(svg,W,H);
        el.key=S('g',null,svg);
        rows=key(el.key,[['line','gt3-r','buy from 1: p₁ + tz'],['line','gt3-p','buy from 2: p₂ + t(1 − z)']],46,13,W-10);
        F={top:13+rows*16+12, bot:H-62, x0:46, x1:W-14};
        hs=[];
      } else {
        side=Math.min(W-64,360);
        frame(svg,W,side+90);
        el.key=S('g',null,svg);
        rows=key(el.key,[['line','gt3-r','B₁(p₂)'],['line','gt3-p gt3-dash','B₂(p₁)']],50,13,W-10);
        F={top:13+rows*16+12, x0:Math.round(50+((W-64)-side)/2)};
        F.bot=F.top+side; F.x1=F.x0+side; H=F.bot+40; frame(svg,W,H);
        el.key=S('g',null,svg);
        key(el.key,[['line','gt3-r','B₁(p₂)'],['line','gt3-p gt3-dash','B₂(p₁)']],50,13,W-10);
        PM=Math.max(6,Math.ceil(3*t+c+2));
        xs=scale(0,PM,F.x0,F.x1); ys=scale(0,PM,F.bot,F.top);
        tk=ticks(0,PM,PM>8?2:1);
        el.bg=S('g',null,svg);
        axes(el.bg,xs,ys,tk,tk,0,0);
        text(el.bg,F.x1,F.bot+32,'p₁','nf-title gt3-it','end');
        text(el.bg,F.x0-7,F.top-8,'p₂','nf-title gt3-it','end');
        hs=[handle(svg,'gt3-kk','Prices p1 and p2, arrow keys move them',function(dx,dy,big){ setP(p1+dx*(big?0.5:0.05),p2+dy*(big?0.5:0.05)); })];
      }
      el.gc=null; el.fg=null;
      if(mode==='city'){ el.bg=S('g',null,svg); }
      el.gc=clip(svg,F.x0,F.top,F.x1-F.x0,F.bot-F.top);
      el.fg=S('g',null,svg);
      update();
    }
    function setP(a,b){
      if(r1) r1.set(Math.round(clamp(a,0,6)*20)/20); else p1=a;
      if(r2) r2.set(Math.round(clamp(b,0,6)*20)/20); else p2=b;
    }
    function paintCity(){
      var g=el.gc, f=el.fg, z=zh(), lo=Math.max(0,Math.min(p1,p2)-0.4), hi=Math.max(p1,p2)+t+0.4, yt, s, x1, x2;
      clear(el.bg);
      xs=scale(0,1,F.x0,F.x1); ys=scale(lo,hi,F.bot,F.top);
      yt=ticks(Math.ceil(lo*2)/2,hi,hi-lo>4?1:0.5);
      axes(el.bg,xs,ys,[0,0.25,0.5,0.75,1],yt,2,1);
      text(el.bg,F.x1,F.bot+52,'location z','nf-title','end');
      path(g,[[xs(0),ys(p1)],[xs(1),ys(p1+t)]],'gt3-r gt3-w');
      path(g,[[xs(0),ys(p2+t)],[xs(1),ys(p2)]],'gt3-p gt3-w');
      line(f,xs(z),F.top,xs(z),F.bot,'nf-guide');
      if(z>0 && z<1) dot(f,xs(z),ys(p1+t*z),4.5,'gt3-dk');
      if(z>0) S('rect',{x:R(xs(0)),y:F.bot+24,width:R(xs(z)-xs(0)),height:9,'class':'gt3-fr gt3-solid'},f);
      if(z<1) S('rect',{x:R(xs(z)),y:F.bot+24,width:R(xs(1)-xs(z)),height:9,'class':'gt3-fp gt3-solid'},f);
      lab(f,xs(z),F.top+12,'ẑ = '+z.toFixed(3),'gt3-tk',z>0.8?'end':z<0.2?'start':'middle');
      x1=z; x2=1-z;
      s='p₁ = '+p1.toFixed(2)+', p₂ = '+p2.toFixed(2)+', t = '+t.toFixed(2)+', c = '+c.toFixed(2)+':  ẑ = 1/2 + (p₂ − p₁)/(2t) = '+(0.5+(p2-p1)/(2*t)).toFixed(3)+(z!==0.5+(p2-p1)/(2*t)?' → '+z.toFixed(3):'')+
        '\nshares x₁ = '+x1.toFixed(3)+', x₂ = '+x2.toFixed(3)+';  profits π₁ = '+((p1-c)*x1).toFixed(3)+', π₂ = '+((p2-c)*x2).toFixed(3)+
        '\nbest replies: B₁(p₂) = '+Bh(p2).toFixed(2)+', B₂(p₁) = '+Bh(p1).toFixed(2)+';  equilibrium p* = c + t = '+(c+t).toFixed(2);
      cur={mode:mode, t:t, c:c, p1:p1, p2:p2, z:z};
      return s;
    }
    function paintBr(){
      var g=el.gc, f=el.fg, i, v, a=[], b=[], ps=c+t, k=3*t+c, s, e1=Bh(p2), e2=Bh(p1), ne;
      for(i=0;i<=200;i++){ v=PM*i/200; a.push([xs(Bh(v)),ys(v)]); b.push([xs(v),ys(Bh(v))]); }
      line(g,xs(0),ys(0),xs(PM),ys(PM),'gt3-diag');
      path(g,a,'gt3-r gt3-w'); path(g,b,'gt3-p gt3-w gt3-dash');
      dot(f,xs(Bh(k)),ys(k),3.5,'gt3-dr'); lab(f,xs(Bh(k))-8,ys(k)-6,'kink, p₂ = 3t + c','gt3-tr','end');
      dot(f,xs(ps),ys(ps),5.5,'gt3-db'); lab(f,xs(ps)+9,ys(ps)+16,'p* = c + t = '+ps.toFixed(2),'gt3-tb gt3-bold','start');
      if(Math.abs(e1-p1)>0.01) arrow(f,xs(p1),ys(p2),xs(e1),ys(p2),'gt3-r gt3-thin','gt3-hr');
      if(Math.abs(e2-p2)>0.01) arrow(f,xs(p1),ys(p2),xs(p1),ys(e2),'gt3-p gt3-thin','gt3-hp');
      place(hs[0],xs(p1),ys(p2),p1,'p1 '+p1.toFixed(2)+', p2 '+p2.toFixed(2));
      ne=Math.abs(e1-p1)<=0.01 && Math.abs(e2-p2)<=0.01;
      s='(p₁, p₂) = ('+p1.toFixed(2)+', '+p2.toFixed(2)+'):  B₁(p₂) = '+e1.toFixed(2)+',  B₂(p₁) = '+e2.toFixed(2)+
        '\ninside the kinks B(p) = (t + c + p)/2, slope one half: prices are strategic complements'+
        '\n'+(ne?'both best reply: the equilibrium p* = c + t = '+ps.toFixed(2):'the arrows show each firm\'s best reply; they meet only at p* = c + t = '+ps.toFixed(2));
      cur={mode:mode, t:t, c:c, p1:p1, p2:p2, ne:ne};
      return s;
    }
    function update(){
      clear(el.gc); clear(el.fg);
      var s=mode==='city'?paintCity():paintBr();
      if(out) out.textContent=s;
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return mode==='br'?[[xs(p1),ys(p2)]]:[]; },
      function(i,x,y){ setP(xs.inv(clamp(x,F.x0,F.x1)),ys.inv(clamp(y,F.top,F.bot))); },
      focusOf(function(){ return hs; }),function(q){ return mode==='br' && q[0]>=F.x0 && q[0]<=F.x1 && q[1]>=F.top && q[1]<=F.bot ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('t' in st && rt) rt.set(+st.t);
      if('c' in st && rc) rc.set(+st.c);
      if('p1' in st || 'p2' in st) setP('p1' in st?+st.p1:p1,'p2' in st?+st.p2:p2);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ================= 6. best response correspondences of 2 by 2 games ================= */
  NF.register('gt3-br',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var GM={
      mp:{A:[[-1,1],[1,-1]], B:[[1,-1],[-1,1]], r:['H','T'], c:['H','T']},
      bos:{A:[[2,0],[0,1]], B:[[1,0],[0,2]], r:['C','P'], c:['C','P']},
      stag:{A:[[4,0],[3,3]], B:[[4,3],[0,3]], r:['Stag','Hare'], c:['Stag','Hare']},
      chicken:{A:[[3,1],[4,0]], B:[[3,4],[1,0]], r:['D','H'], c:['D','H']},
      ag:{A:[[0,1],[1,0]], B:[[0,1],[1,0]], r:['Go','Wait'], c:['Go','Wait']},
      ex8:{A:[[3,2],[1,2]], B:[[4,2],[1,1]], r:['U','D'], c:['L','R']}
    };
    var game, A0, B0, pq=[0.4,0.7], W=520, H=360, F, xs, ys, el={}, hs=[], A, cur={}, busy=false;
    var ra=range(fig,'a',1,function(v){ A0[0][0]=v; if(!busy) update(); }), rb=range(fig,'b',1,function(v){ B0[0][0]=v; if(!busy) update(); });
    function load(g){
      game=g; A0=GM[g].A.map(function(r){ return r.slice(); }); B0=GM[g].B.map(function(r){ return r.slice(); });
      busy=true; if(ra) ra.set(A0[0][0]); if(rb) rb.set(B0[0][0]); busy=false;
      if(ra) A0[0][0]=ra.v();
      if(rb) B0[0][0]=rb.v();
    }
    game=seg(fig,'data-game',function(v){ load(v); update(); }) || 'bos';
    load(game);
    function d1(q){ return (A0[0][0]-A0[1][0])*q+(A0[0][1]-A0[1][1])*(1-q); }
    function d2(p){ return (B0[0][0]-B0[0][1])*p+(B0[1][0]-B0[1][1])*(1-p); }
    /* {(x, y): y in BR(x)} for a gain lo + (hi - lo) x; null when the player is always indifferent */
    function graph(lo,hi){
      var e=1e-9, xs_, yl, yh;
      if(Math.abs(hi-lo)<e){ if(Math.abs(lo)<e) return null; return [[0,lo>0?1:0],[1,lo>0?1:0]]; }
      xs_=-lo/(hi-lo);
      if(xs_<=e && xs_>=-e) return [[0,0],[0,1],[0,hi>0?1:0],[1,hi>0?1:0]];
      if(xs_<0) return [[0,hi>0?1:0],[1,hi>0?1:0]];
      if(Math.abs(xs_-1)<=e) return [[0,lo>0?1:0],[1,lo>0?1:0],[1,0],[1,1]];
      if(xs_>1) return [[0,lo>0?1:0],[1,lo>0?1:0]];
      yl=lo>0?1:0; yh=hi>0?1:0;
      return [[0,yl],[xs_,yl],[xs_,yh],[1,yh]];
    }
    function thr(lo,hi){ return Math.abs(hi-lo)<1e-9?null:-lo/(hi-lo)+0; }
    function ok1(p,q){ var d=d1(q); return Math.abs(d)<1e-9 || (d>0 && p===1) || (d<0 && p===0); }
    function ok2(p,q){ var d=d2(p); return Math.abs(d)<1e-9 || (d>0 && q===1) || (d<0 && q===0); }
    function equilibria(){
      var qs=thr(A0[0][1]-A0[1][1],A0[0][0]-A0[1][0]), ps=thr(B0[1][0]-B0[1][1],B0[0][0]-B0[0][1]), P=[0,1], Q=[0,1], res=[], i, j, k, dup;
      if(ps!==null && ps>0 && ps<1) P.push(ps);
      if(qs!==null && qs>0 && qs<1) Q.push(qs);
      for(i=0;i<P.length;i++) for(j=0;j<Q.length;j++) if(ok1(P[i],Q[j]) && ok2(P[i],Q[j])){
        dup=false; for(k=0;k<res.length;k++) if(Math.abs(res[k][0]-P[i])<1e-9 && Math.abs(res[k][1]-Q[j])<1e-9) dup=true;
        if(!dup) res.push([P[i],Q[j]]);
      }
      /* two equilibria on a common edge or line with an equilibrium halfway between them span a continuum */
      var segs=[], m;
      for(i=0;i<res.length;i++) for(j=i+1;j<res.length;j++){
        if(Math.abs(res[i][0]-res[j][0])>1e-9 && Math.abs(res[i][1]-res[j][1])>1e-9) continue;
        m=[(res[i][0]+res[j][0])/2,(res[i][1]+res[j][1])/2];
        if(ok1(m[0],m[1]) && ok2(m[0],m[1])) segs.push([res[i],res[j]]);
      }
      return {list:res, segs:segs, ps:ps, qs:qs};
    }
    function draw(){
      var side, rows;
      W=measure(svg); side=Math.min(W-70,330);
      frame(svg,W,side+90);
      el.key=S('g',null,svg);
      rows=key(el.key,[['line','gt3-r','B₁(q)'],['line','gt3-p gt3-dash','B₂(p)'],['rect','gt3-db','Nash equilibrium']],50,13,W-10);
      F={top:13+rows*16+14, x0:Math.round(52+((W-70)-side)/2)};
      F.bot=F.top+side; F.x1=F.x0+side; H=F.bot+44; frame(svg,W,H);
      el.key=S('g',null,svg);
      key(el.key,[['line','gt3-r','B₁(q)'],['line','gt3-p gt3-dash','B₂(p)'],['rect','gt3-db','Nash equilibrium']],50,13,W-10);
      xs=scale(0,1,F.x0,F.x1); ys=scale(0,1,F.bot,F.top);
      el.bg=S('g',null,svg);
      axes(el.bg,xs,ys,[0,0.25,0.5,0.75,1],[0,0.25,0.5,0.75,1],2,2);
      el.ax=S('g',null,svg);
      el.gc=S('g',null,svg);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt3-kk','Mixed profile p and q, arrow keys move it',function(dx,dy,big){ put(pq[0]+dx*(big?0.1:0.01),pq[1]+dy*(big?0.1:0.01)); update(); })];
      update();
    }
    function put(p,q){
      var e=equilibria(), i, P=[0,1], Q=[0,1];
      p=clamp(Math.round(p*100)/100,0,1); q=clamp(Math.round(q*100)/100,0,1);
      if(e.ps!==null) P.push(e.ps);
      if(e.qs!==null) Q.push(e.qs);
      for(i=0;i<P.length;i++) if(Math.abs(p-P[i])<0.015) p=P[i];
      for(i=0;i<Q.length;i++) if(Math.abs(q-Q[i])<0.015) q=Q[i];
      pq=[p+0,q+0];
    }
    function pt(v){ return Math.abs(v-Math.round(v))<1e-9?String(Math.round(v)):v.toFixed(2); }
    function update(){
      clear(el.ax); clear(el.gc); clear(el.fg);
      var G=GM[game], g1=graph(A0[0][1]-A0[1][1],A0[0][0]-A0[1][0]), g2=graph(B0[1][0]-B0[1][1],B0[0][0]-B0[0][1]), e=equilibria(), i, s, p=pq[0], q=pq[1],
          a=d1(q), b=d2(p), isNe, x1, y1;
      text(el.ax,F.x1,F.bot+34,'p = Pr('+G.r[0]+'), player 1','nf-title','end');
      text(el.ax,F.x0-7,F.top-8,'q = Pr('+G.c[0]+')','nf-title','start');
      if(g1) path(el.gc,g1.map(function(v){ return [xs(v[1]),ys(v[0])]; }),'gt3-r gt3-thick');
      else S('rect',{x:R(xs(0)),y:R(ys(1)),width:R(xs(1)-xs(0)),height:R(ys(0)-ys(1)),'class':'gt3-fr'},el.gc);
      if(g2) path(el.gc,g2.map(function(v){ return [xs(v[0]),ys(v[1])]; }),'gt3-p gt3-w gt3-dash');
      else S('rect',{x:R(xs(0)),y:R(ys(1)),width:R(xs(1)-xs(0)),height:R(ys(0)-ys(1)),'class':'gt3-fp'},el.gc);
      for(i=0;i<e.segs.length;i++) path(el.fg,[[xs(e.segs[i][0][0]),ys(e.segs[i][0][1])],[xs(e.segs[i][1][0]),ys(e.segs[i][1][1])]],'gt3-b gt3-thick');
      for(i=0;i<e.list.length;i++) dot(el.fg,xs(e.list[i][0]),ys(e.list[i][1]),5.5,'gt3-db');
      x1=a>1e-9?1:a<-1e-9?0:null; y1=b>1e-9?1:b<-1e-9?0:null;
      if(x1!==null && x1!==p) arrow(el.fg,xs(p),ys(q),xs(x1),ys(q),'gt3-r gt3-thin','gt3-hr');
      if(y1!==null && y1!==q) arrow(el.fg,xs(p),ys(q),xs(p),ys(y1),'gt3-p gt3-thin','gt3-hp');
      place(hs[0],xs(p),ys(q),p,'p '+p.toFixed(2)+', q '+q.toFixed(2));
      isNe=ok1(p,q) && ok2(p,q);
      function cell(i,j){ return '('+G.r[i]+', '+G.c[j]+') '+fmt(A0[i][j],i+j?0:1)+', '+fmt(B0[i][j],i+j?0:1); }
      s=cell(0,0)+'   '+cell(0,1)+'   '+cell(1,0)+'   '+cell(1,1)+
        '\np = '+p.toFixed(2)+', q = '+q.toFixed(2)+':  u₁('+G.r[0]+') − u₁('+G.r[1]+') = '+fmt(a,2)+sgn(a)+',  u₂('+G.c[0]+') − u₂('+G.c[1]+') = '+fmt(b,2)+sgn(b)+
        '\nplayer 1 indifferent at q = '+(e.qs===null?'every q (or never)':e.qs.toFixed(3))+', player 2 at p = '+(e.ps===null?'every p (or never)':e.ps.toFixed(3))+
        '\nNash equilibria (p, q): '+(e.list.length?e.list.map(function(v){ return '('+pt(v[0])+', '+pt(v[1])+')'; }).join(', '):'none on the grid')+
        (e.segs.length?', and every profile on the blue segment'+(e.segs.length>1?'s':'')+' between them':'')+(g1&&g2?'':', and a continuum where a player is always indifferent')+(isNe?'\n(p, q) is a Nash equilibrium':'');
      if(out) out.textContent=s;
      cur={game:game, a:A0[0][0], b:B0[0][0], p:p, q:q, ne:isNe, count:e.list.length};
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(pq[0]),ys(pq[1])]]; },
      function(i,x,y){ put(xs.inv(clamp(x,F.x0,F.x1)),ys.inv(clamp(y,F.top,F.bot))); update(); },
      focusOf(function(){ return hs; }),function(q){ return q[0]>=F.x0-6 && q[0]<=F.x1+6 && q[1]>=F.top-6 && q[1]<=F.bot+6 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('game' in st) NF.press(fig,'data-game',String(st.game));
      if('a' in st && ra) ra.set(+st.a);
      if('b' in st && rb) rb.set(+st.b);
      if('p' in st || 'q' in st) put('p' in st?+st.p:pq[0],'q' in st?+st.q:pq[1]);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ================= 7. Kakutani's two conditions ================= */
  NF.register('gt3-kakutani',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, x=0.3, W=520, H=360, F, xs, ys, el={}, hs=[], A, cur={};
    mode=seg(fig,'data-mode',function(v){ mode=v; update(); }) || 'nc';
    function flo(v){ return 0.3+0.55*Math.sqrt(2*v); }
    function fhi(v){ return 0.15+0.55*Math.pow(2*v-1,2); }
    /* the value set f(x) as a list of points, or [lo, hi] for an interval */
    function val(v){
      if(Math.abs(v-0.5)>1e-9) return {pts:[v<0.5?flo(v):fhi(v)]};
      if(mode==='nc') return {pts:[0.15,0.85]};
      if(mode==='open') return {pts:[0.15]};
      return {iv:[0.15,0.85]};
    }
    function draw(){
      var side;
      W=measure(svg); side=Math.min(W-70,330);
      F={top:20, x0:Math.round(52+((W-70)-side)/2)};
      F.bot=F.top+side; F.x1=F.x0+side; H=F.bot+44; frame(svg,W,H);
      xs=scale(0,1,F.x0,F.x1); ys=scale(0,1,F.bot,F.top);
      el.bg=S('g',null,svg);
      axes(el.bg,xs,ys,[0,0.25,0.5,0.75,1],[0,0.25,0.5,0.75,1],2,2);
      text(el.bg,F.x1,F.bot+34,'x','nf-title gt3-it','end');
      text(el.bg,F.x0-7,F.top-8,'f(x)','nf-title gt3-it','start');
      line(el.bg,xs(0),ys(0),xs(1),ys(1),'gt3-diag');
      el.gc=S('g',null,svg);
      el.fg=S('g',null,svg);
      hs=[handle(svg,'gt3-kk','Point x, arrow keys move it',function(dx,dy,big){ put(x+(dx||dy)*(big?0.1:0.01)); update(); })];
      update();
    }
    function put(v){ v=clamp(Math.round(v*100)/100,0,1); x=v; }
    function update(){
      clear(el.gc); clear(el.fg);
      var i, v, a=[], b=[], f=val(x), s, fixed=false, set;
      for(i=0;i<=100;i++){ v=0.5*i/100; a.push([xs(v),ys(flo(v))]); v=0.5+0.5*i/100; b.push([xs(v),ys(fhi(v))]); }
      path(el.gc,a,'gt3-k gt3-w'); path(el.gc,b,'gt3-k gt3-w');
      if(mode==='nc'){ line(el.gc,xs(0.5),ys(0.15),xs(0.5),ys(0.85),'gt3-r gt3-dot'); dot(el.gc,xs(0.5),ys(0.85),4.5,'gt3-dr'); dot(el.gc,xs(0.5),ys(0.15),4.5,'gt3-dr'); lab(el.gc,xs(0.5)+8,ys(0.5),'gap','gt3-tr','start'); }
      else if(mode==='open'){ dot(el.gc,xs(0.5),ys(0.85),4.5,'gt3-open gt3-op'); dot(el.gc,xs(0.5),ys(0.15),4.5,'gt3-dp'); }
      else { path(el.gc,[[xs(0.5),ys(0.15)],[xs(0.5),ys(0.85)]],'gt3-b gt3-thick'); dot(el.gc,xs(0.5),ys(0.5),5.5,'gt3-db'); }
      line(el.fg,xs(x),F.top,xs(x),F.bot,'nf-guide');
      dot(el.fg,xs(x),ys(x),3.5,'gt3-dg');
      if(f.iv){ path(el.fg,[[xs(x),ys(f.iv[0])],[xs(x),ys(f.iv[1])]],'gt3-o gt3-thick'); fixed=x>=f.iv[0]-1e-9 && x<=f.iv[1]+1e-9; set='['+f.iv[0].toFixed(2)+', '+f.iv[1].toFixed(2)+']'; }
      else { for(i=0;i<f.pts.length;i++){ dot(el.fg,xs(x),ys(f.pts[i]),4.5,'gt3-do'); if(Math.abs(f.pts[i]-x)<1e-9) fixed=true; } set='{'+f.pts.map(function(u){ return u.toFixed(2); }).join(', ')+'}'; }
      place(hs[0],xs(x),F.bot,x,'x = '+x.toFixed(2));
      s='x = '+x.toFixed(2)+':  f(x) = '+set+(fixed?',  x ∈ f(x): a fixed point':',  x ∉ f(x): '+(x<0.5?'f(x) lies above the diagonal':x>0.5?'f(x) lies below the diagonal':'the value set skips the diagonal'))+
        '\n'+(mode==='nc'?'closed graph, but f(½) = {0.15, 0.85} is not convex: no fixed point anywhere':
              mode==='open'?'f(½) = {0.15} is convex, but points of the graph converge to (½, 0.85), which is not in it: no fixed point':
              'f(½) = [0.15, 0.85] is convex and the graph is closed: Kakutani gives the fixed point x* = ½');
      if(out) out.textContent=s;
      cur={mode:mode, x:x, fixed:fixed};
      if(A) A.changed();
    }
    dragger(svg,function(){ return [W,H]; },function(){ return [[xs(x),F.bot]]; },function(i,px){ put(xs.inv(clamp(px,F.x0,F.x1))); update(); },
      focusOf(function(){ return hs; }),function(q){ return q[0]>=F.x0-4 && q[0]<=F.x1+4 && q[1]>=F.top && q[1]<=F.bot+30 ? 0 : -1; });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('x' in st) put(+st.x);
      update();
    });
    draw();
    watch(svg,draw);
    return A;
  });
})();
