/* Core Micro GT1 figures: games and their representations. Game trees you can play by clicking branches (a choice at
   one node of an information set is the choice at all of its nodes), Nature, perfect information, perfect recall,
   Bob's strategies and the normal form they induce, one normal form for two trees, mixed strategies in matching
   pennies, and Kuhn's theorem on the simplex of Bob's mixed strategies.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS classes in /assets/figs/gt1.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, poly=NF.poly, fmt=NF.fmt, tl=NF.tl, lin=NF.lin,
      measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, seg=NF.seg, local=NF.local, capture=NF.capture, MINUS=NF.MINUS;
  var NAMES={A:'Ana', B:'Bob', N:'Nature'};

  /* ---------- shared ---------- */
  function clear(g){ while(g.firstChild) g.removeChild(g.firstChild); return g; }
  function api(get,set){ return NF.api({get:function(){ var o={}, k, c=get(); for(k in c) o[k]=c[k]; return o; }, set:set}); }
  function num(v){ var r=Math.round(v*100)/100; return Math.abs(r-Math.round(r))<1e-9?tl(Math.round(r)):fmt(r,2); }
  function pv(u){ return '('+num(u[0])+', '+num(u[1])+')'; }
  /* one line of text in several colours: parts = [[string, class], ...] */
  function mtext(g,x,y,parts,cls,anchor){
    var e=S('text',{x:R(x),y:R(y)},g), i, t;
    if(cls) e.setAttribute('class',cls);
    if(anchor) e.setAttribute('text-anchor',anchor);
    for(i=0;i<parts.length;i++){ t=S('tspan',parts[i][1]?{'class':parts[i][1]}:null,e); t.textContent=parts[i][0]; }
    return e;
  }
  /* an information set name: I with a subscript and an optional superscript */
  function isl(g,x,y,sub,sup,cls,anchor){
    var e=S('text',{x:R(x),y:R(y)},g), t;
    e.setAttribute('class','gt1-who '+(cls||''));
    if(anchor) e.setAttribute('text-anchor',anchor);
    t=S('tspan',null,e); t.textContent='I';
    if(sup){ t=S('tspan',{'class':'gt1-sup',dy:'-6'},e); t.textContent=sup; t=S('tspan',{'class':'nf-sub',dx:'-5',dy:'9'},e); t.textContent=sub; }
    else { t=S('tspan',{'class':'nf-sub',dy:'3'},e); t.textContent=sub; }
    return e;
  }
  /* a stacked fraction centred at x with its bar at y */
  function frac(g,x,y,n,d,cls){
    text(g,x,y-3,String(n),cls||'gt1-act','middle');
    text(g,x,y+11,String(d),cls||'gt1-act','middle');
    line(g,x-5,y,x+5,y,'gt1-frac');
  }
  function dot(g,x,y,r,cls){ return S('circle',{cx:R(x),cy:R(y),r:r,'class':cls},g); }
  /* keep keyboard focus on a branch or cell across a redraw */
  function focusKey(svg){ var a=document.activeElement; return a && svg.contains(a) && a.getAttribute ? a.getAttribute('data-k') : null; }
  function refocus(svg,k){
    if(!k) return;
    var all=svg.querySelectorAll('[data-k]'), i;
    for(i=0;i<all.length;i++) if(all[i].getAttribute('data-k')===k){ try{ all[i].focus({preventScroll:true}); }catch(err){} return; }
  }
  function button(g,k,label,pressed,fn,cls){
    var b=S('g',{'class':cls||'gt1-btn',tabindex:'0',role:'button','aria-label':label,'aria-pressed':pressed?'true':'false','data-k':k},g);
    b.addEventListener('click',fn);
    b.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(); } });
    return b;
  }
  /* a focusable round handle moved by dragging or by the arrow keys; onKey gets (dx, dy, big) */
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
  function place(h,x,y,txt){ h.setAttribute('transform','translate('+R(x)+','+R(y)+')'); h.setAttribute('aria-valuetext',txt); }
  /* dragging inside a box: inside(p) says whether a press at svg point p grabs, move(p) takes the pointer */
  function dragBox(svg,size,inside,move){
    var on=false;
    svg.addEventListener('pointerdown',function(e){
      var s=size(), p=local(svg,e,s[0],s[1]);
      if(!inside(p)) return;
      on=true; e.preventDefault(); capture(svg,e); svg.classList.add('is-drag'); move(p);
    });
    svg.addEventListener('pointermove',function(e){ if(!on) return; var s=size(); move(local(svg,e,s[0],s[1])); });
    function stop(){ on=false; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var s=size(); if(inside(local(svg,e.touches[0],s[0],s[1]))) e.preventDefault();
    },{passive:false});
  }

  /* ---------- game trees ---------- */
  /* D(who, information set, [[action, child, Nature probability [n, d]], ...], forced depth); P(u_A, u_B) a terminal node */
  function D(who,I,kids,depth){ return {who:who, I:I, depth:depth||0, kids:kids.map(function(k){ return {a:k[0], c:k[1], p:k[2]||null}; })}; }
  function P(a,b){ return {pay:[a,b]}; }
  function layout(root,gap){
    var cnt=0, nodes=[], depth=0;
    (function walk(n,d,par,a,p,top){
      d=n.depth||d; n.d=d; n.par=par; n.a=a; n.p=p; nodes.push(n); if(d>depth) depth=d;
      if(n.pay){ n.u=cnt; cnt+=1; return; }
      n.kids.forEach(function(k,i){ if(top && i>0) cnt+=gap; walk(k.c,d+1,n,k.a,k.p,false); });
      n.u=(n.kids[0].c.u+n.kids[n.kids.length-1].c.u)/2;
    })(root,0,null,null,null,true);
    return {nodes:nodes, span:cnt-1, depth:depth};
  }
  /* n.r: probability that node n is reached given the choices (null when a choice on the way is missing) */
  function reach(root,ch){
    (function walk(n,r){
      n.r=r;
      if(n.pay) return;
      n.kids.forEach(function(k){
        var c=ch[n.I], cr;
        if(r===null) cr=null; else if(r===0) cr=0;
        else if(n.who==='N') cr=r*k.p[0]/k.p[1];
        else cr=c==null?null:(c===k.a?r:0);
        walk(k.c,cr);
      });
    })(root,1);
  }
  function outcome(L){
    var e=[0,0], parts=[], ok=true;
    L.nodes.forEach(function(n){
      if(!n.pay) return;
      if(n.r===null) ok=false;
      else if(n.r>0){ e[0]+=n.r*n.pay[0]; e[1]+=n.r*n.pay[1]; parts.push([n.r,n.pay]); }
    });
    return ok?{e:e, parts:parts}:null;
  }
  function outText(o){
    if(!o) return 'choose an action at every information set on the path to see the outcome';
    if(o.parts.length===1) return 'outcome '+pv(o.parts[0][1]);
    return 'expected payoffs '+o.parts.map(function(q){ return num(q[0])+' × '+pv(q[1]); }).join(' + ')+' = '+pv(o.e);
  }
  /* Draw one tree into g. T = {root, gap, sets: {I: {c: 'r'|'p'|'o', name, lab: [sub, sup], lp: 'mid'|'side'}}};
     geo = {x0, x1, y0, dy}; ch = the action chosen at each information set; pick(I, a) runs when a branch is clicked. */
  function drawTree(g,T,geo,ch,pick){
    var L=layout(T.root,T.gap==null?0.7:T.gap), pad=T.pad==null?0.55:T.pad, k=(geo.x1-geo.x0)/(L.span+2*pad), sets={},
        gH=S('g',null,g), gS=S('g',null,g), gE=S('g',null,g), gB=S('g',null,g), gN=S('g',null,g), gT=S('g',null,g), SI=T.sets||{};
    function X(n){ return geo.x0+(n.u+pad)*k; }
    function Y(n){ return geo.y0+n.d*geo.dy; }
    function col(I){ return SI[I] && SI[I].c ? SI[I].c : ''; }
    reach(T.root,ch);
    L.nodes.forEach(function(n){
      var p=n.par, cl, c, chosen, left, mx, my, b, lab, ex, ey, el, nx, ny;
      if(!n.pay && n.who!=='N') (sets[n.I]=sets[n.I]||[]).push(n);
      if(!p) return;
      if(n.r>0 && p.r>0) line(gH,X(p),Y(p),X(n),Y(n),'gt1-halo');
      left=X(n)<X(p)-0.5; mx=(X(p)+X(n))/2; my=(Y(p)+Y(n))/2;
      ex=X(n)-X(p); ey=Y(n)-Y(p); el=Math.hypot(ex,ey)||1; nx=left?-ey/el:ey/el; ny=left?ex/el:-ex/el;
      if(p.who==='N'){
        line(gE,X(p),Y(p),X(n),Y(n),'gt1-e gt1-nat');
        frac(gT,mx+nx*17,my+ny*17,n.p[0],n.p[1]);
        return;
      }
      c=col(p.I); chosen=ch[p.I];
      cl='gt1-e'+(chosen==null?'':chosen===n.a?' gt1-on'+(c?' gt1-'+c:''):' gt1-off');
      line(gE,X(p),Y(p),X(n),Y(n),cl);
      lab=chosen==null?'':chosen===n.a?(c?' gt1-t'+c:' gt1-tk'):' gt1-dimt';
      text(gT,mx+nx*11,my+ny*11+4.5,n.a,'gt1-act'+lab,'middle');
      if(pick){
        b=button(gB,p.I+'|'+n.a,(NAMES[p.who]||p.who)+(SI[p.I]&&SI[p.I].name?' at '+SI[p.I].name:'')+' plays '+n.a,chosen===n.a,
          (function(I,a){ return function(){ pick(I,a); }; })(p.I,n.a));
        line(b,X(p),Y(p),X(n),Y(n),'gt1-hit');
      }
    });
    Object.keys(sets).forEach(function(I){
      var ns=sets[I], c=col(I), y, s=SI[I], xm, left;
      ns.sort(function(a,b){ return a.u-b.u; });
      y=Y(ns[0]);
      if(ns.length>1) line(gS,X(ns[0]),y,X(ns[ns.length-1]),y,'gt1-set'+(c?' gt1-'+c:''));
      if(s && s.lab){
        if(ns.length>1 && s.lp!=='side'){
          xm=s.at==null?(X(ns[0])+X(ns[ns.length-1]))/2:X(ns[0])+s.at*(X(ns[ns.length-1])-X(ns[0]));
          isl(gT,xm,y-7,s.lab[0],s.lab[1],c?'gt1-t'+c:'','middle');
        } else {
          left=ns[0].par && X(ns[0])<X(ns[0].par)-0.5;
          if(!ns[0].par) isl(gT,X(ns[0])+11,y-11,s.lab[0],s.lab[1],c?'gt1-t'+c:'','start');
          else isl(gT,X(ns[0])+(left?-13:13),y+17,s.lab[0],s.lab[1],c?'gt1-t'+c:'',left?'end':'start');
        }
      }
    });
    L.nodes.forEach(function(n){
      var c, left, s;
      if(n.pay){
        dot(gN,X(n),Y(n),2.6,'gt1-leaf');
        s=n.r===null?'':n.r>0?' gt1-got':' gt1-dim';
        text(gT,X(n),Y(n)+18,tl(n.pay[0]),'gt1-pay'+s,'middle');
        text(gT,X(n),Y(n)+33,tl(n.pay[1]),'gt1-pay'+s,'middle');
        if(n.r>0 && n.r<1-1e-9) text(gT,X(n),Y(n)+48,'×'+num(n.r),'gt1-prob','middle');
        return;
      }
      c=n.who==='N'?'':col(n.I);
      if(!n.par){
        dot(gN,X(n),Y(n),4.5,'gt1-root');
        text(gT,X(n),Y(n)-10,n.who,'gt1-who','middle');
      } else {
        dot(gN,X(n),Y(n),4.5,'gt1-node'+(c?' gt1-'+c:''));
        left=X(n)<X(n.par)-0.5;
        text(gT,X(n)+(left?-9:9),Y(n)-7,n.who,'gt1-who'+(c?' gt1-t'+c:''),left?'end':'start');
      }
    });
    return {X:X, Y:Y, L:L, sets:sets, k:k, bottom:geo.y0+L.depth*geo.dy+52};
  }
  /* the games */
  var HS=[[-1,1],[1,-1],[1,-1],[-1,1]];               /* (H,h) (H,t) (T,h) (T,t): Bob finds Ana or not */
  function hideSeek(i1,i2){
    return D('A','A0',[['H',D('B',i1,[['h',P(-1,1)],['t',P(1,-1)]])],['T',D('B',i2,[['h',P(1,-1)],['t',P(-1,1)]])]]);
  }
  function bobFirst(){ return D('B','B0',[['h',D('A','A',[['H',P(-1,1)],['T',P(1,-1)]])],['t',D('A','A',[['H',P(1,-1)],['T',P(-1,1)]])]]); }
  function charlie(){
    return D('A','A0',[['H',D('N','N',[['',P(0,0),[1,4]],['',D('B','B',[['h',P(-1,1)],['t',P(1,-1)]]),[3,4]]])],
                       ['T',D('B','B',[['h',P(1,-1)],['t',P(-1,1)]],2)]]);
  }
  /* random it: Nature picks who is it; on the right Bob hides first and a match makes Ana (the seeker) win */
  function randomIt(peek){
    var l=D('A','Ah',[['H',D('B',peek?'Bs1':'Bs',[['h',P(-1,1)],['t',P(1,-1)]])],['T',D('B',peek?'Bs2':'Bs',[['h',P(1,-1)],['t',P(-1,1)]])]]),
        r=D('B','Bh',[['h',D('A',peek?'As1':'As',[['H',P(1,-1)],['T',P(-1,1)]])],['t',D('A',peek?'As2':'As',[['H',P(-1,1)],['T',P(1,-1)]])]]);
    return D('N','N',[['',l,[1,2]],['',r,[1,2]]]);
  }
  /* Ana L or R, Bob (who sees it) l or r, Ana c or d; after L Ana wins with (l,d) or (r,c), after R with (l,c) or (r,d) */
  function recallGame(merge){
    function sub(pay,b,a1,a2){ return D('B',b,[['l',D('A',a1,[['c',P(pay[0][0],pay[0][1])],['d',P(pay[1][0],pay[1][1])]])],
                                              ['r',D('A',a2,[['c',P(pay[2][0],pay[2][1])],['d',P(pay[3][0],pay[3][1])]])]]); }
    return D('A','A1',[['L',sub([[-1,1],[1,-1],[1,-1],[-1,1]],'BL',merge?'Am':'A2',merge?'Am':'A2')],
                       ['R',sub([[1,-1],[-1,1],[-1,1],[1,-1]],'BR',merge?'Am':'A3',merge?'Am':'A3')]]);
  }
  var STRAT=['hh','th','ht','tt'];
  var DOES={hh:'always seeks at h', th:'seeks where Ana is not', ht:'seeks where Ana is', tt:'always seeks at t'};
  function cellHS(a,s){ return HS[(a==='H'?0:2)+((a==='H'?s[0]:s[1])==='h'?0:1)]; }

  /* payoff matrix: Ana's rows H, T; Bob's columns. heads[j] = parts for a coloured header; pick(i, j) on a click */
  function matrix(g,x,y,w,rows,heads,cell,sel,pick,keys){
    var rh=30, hh=24, lw=26, cw=(w-lw)/heads.length, i, j, b, cl, u, tc;
    text(g,x+lw+(w-lw)/2,y-4,'Bob','gt1-note','middle');
    text(g,x,y+hh+rh+4,'Ana','gt1-note','start').setAttribute('transform','rotate(-90 '+R(x+4)+' '+R(y+hh+rh+4)+')');
    for(j=0;j<heads.length;j++) mtext(g,x+lw+(j+0.5)*cw,y+hh-8,heads[j],'gt1-ct','middle');
    for(i=0;i<rows.length;i++){
      text(g,x+lw-8,y+hh+(i+0.5)*rh+4,rows[i],'gt1-ct'+(sel.row===i?' gt1-got':''),'end');
      for(j=0;j<heads.length;j++){
        u=cell(i,j);
        cl='gt1-cell'+(sel.col===j?' gt1-col':sel.row===i?' gt1-row':'')+(sel.row===i&&sel.col===j?' gt1-pick':'');
        b=button(g,'c'+i+'-'+j,'Ana '+rows[i]+', Bob '+keys[j]+': payoffs '+pv(u),sel.row===i&&sel.col===j,
          (function(a,c){ return function(){ pick(a,c); }; })(i,j),'gt1-cbtn');
        S('rect',{x:R(x+lw+j*cw+1),y:R(y+hh+i*rh+1),width:R(cw-2),height:R(rh-2),rx:2,'class':cl},b);
        tc=sel.col===j?(i===0?' gt1-tr':' gt1-tp'):'';
        text(b,x+lw+(j+0.5)*cw,y+hh+(i+0.5)*rh+4,tl(u[0])+', '+tl(u[1]),'gt1-ct'+tc+(sel.row===i&&sel.col===j?' gt1-got':''),'middle');
      }
    }
    return y+hh+rows.length*rh;
  }
  function stratParts(s){ return [[s[0],'gt1-tr'],[s[1],'gt1-tp']]; }

  /* ---------- 1. Hide and seek, matching pennies with Bob first, Charlie ---------- */
  NF.register('gt1-trees',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var G={
      hide:{T:{root:hideSeek('B','B'), sets:{B:{name:'his information set'}}}, ch:{A0:'H', B:'h'}, dy:84},
      pennies:{T:{root:bobFirst(), sets:{A:{name:'her information set'}}}, ch:{B0:'h', A:'H'}, dy:84},
      charlie:{T:{root:charlie(), sets:{B:{name:'his information set'}}}, ch:{A0:'H', B:'h'}, dy:64}
    };
    var game, W=520, H=280, cur={}, A=null;
    game=seg(fig,'data-game',function(v){ if(G[v]){ game=v; draw(); } });
    if(!G[game]) game='hide';
    function pick(I,a){ G[game].ch[I]=a; draw(); }
    function draw(){
      var fk=focusKey(svg), g=G[game], r, m=W<420?4:34, o, s, n;
      W=measure(svg); m=W<420?4:34;
      H=game==='charlie'?300:270; frame(svg,W,H);
      r=drawTree(S('g',null,svg),g.T,{x0:m,x1:W-m,y0:28,dy:g.dy},g.ch,pick);
      if(game!=='charlie'){
        n=r.sets[game==='hide'?'B':'A'];
        text(svg,(r.X(n[0])+r.X(n[1]))/2,r.Y(n[0])+16,'information set','gt1-note','middle');
      } else {
        n=r.sets.B;
        text(svg,(r.X(n[0])+r.X(n[1]))/2,r.Y(n[0])-7,'information set','gt1-note','middle');
      }
      refocus(svg,fk);
      o=outcome(r.L);
      if(game==='hide') s='Ana hides at '+g.ch.A0+'. Bob seeks at '+g.ch.B+', the same at both nodes of his information set: he cannot tell them apart.';
      else if(game==='pennies') s='Bob shows '+g.ch.B0+'. Ana shows '+g.ch.A+', the same at both nodes of her information set: she has not seen his penny.';
      else s='Ana hides at '+g.ch.A0+'. Bob seeks at '+g.ch.B+' at both nodes of his information set. Charlie gives Ana away with probability 0.25 after H.';
      if(out) out.textContent=s+'\n'+outText(o).replace(/^./,function(c){ return c.toUpperCase(); })+'.';
      cur={game:game, ana:game==='pennies'?g.ch.A:g.ch.A0, bob:game==='pennies'?g.ch.B0:g.ch.B, ua:o?o.e[0]:null, ub:o?o.e[1]:null};
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){
      if('game' in st) NF.press(fig,'data-game',String(st.game));
      var g=G[game];
      if('ana' in st){ if(game==='pennies') g.ch.A=String(st.ana); else g.ch.A0=String(st.ana); }
      if('bob' in st){ if(game==='pennies') g.ch.B0=String(st.bob); else g.ch.B=String(st.bob); }
      draw();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 2. Random it, honest or with the seeker peeking ---------- */
  NF.register('gt1-perfect',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, ch={Ah:'H', Bs:'h', Bs1:'h', Bs2:'h', Bh:'h', As:'H', As1:'H', As2:'H'}, W=520, H=270, cur={}, A=null;
    mode=seg(fig,'data-mode',function(v){ mode=v; draw(); });
    if(mode!=='peek') mode='honest';
    function pick(I,a){
      ch[I]=a;
      if(I==='Bs'){ ch.Bs1=a; ch.Bs2=a; } if(I==='As'){ ch.As1=a; ch.As2=a; }
      draw();
    }
    function draw(){
      var fk=focusKey(svg), peek=mode==='peek', r, m, o, s, n;
      W=measure(svg); m=W<420?2:20;
      H=268; frame(svg,W,H);
      r=drawTree(S('g',null,svg),{root:randomIt(peek), gap:0.9, pad:0.5,
        sets:{Bs:{name:'his information set as seeker'}, As:{name:'her information set as seeker'}, Bs1:{name:'his node after H'}, Bs2:{name:'his node after T'},
              As1:{name:'her node after h'}, As2:{name:'her node after t'}, Ah:{name:'her node as hider'}, Bh:{name:'his node as hider'}}},
        {x0:m,x1:W-m,y0:28,dy:62},ch,pick);
      n=r.L.nodes[0].kids;
      text(svg,r.X(n[0].c)-8,r.Y(n[0].c)-21,'Bob is it','gt1-note','end');
      text(svg,r.X(n[1].c)+8,r.Y(n[1].c)-21,'Ana is it','gt1-note','start');
      refocus(svg,fk);
      o=outcome(r.L);
      n=peek?3:2;
      s=(peek?'The seeker peeks: every information set is a singleton, perfect information, even though Nature moves.':
               'Honest: each seeker has one information set with two nodes, imperfect information.')+
        '\nAna has '+n+' information sets, so '+Math.pow(2,n)+' strategies; Bob too.'+
        '\nHider moves: Ana '+ch.Ah+', Bob '+ch.Bh+'. Seekers: '+(peek?'Bob '+ch.Bs1+' after H and '+ch.Bs2+' after T, Ana '+ch.As1+' after h and '+ch.As2+' after t':'Bob '+ch.Bs+', Ana '+ch.As)+'.'+
        '\n'+outText(o).replace(/^./,function(c){ return c.toUpperCase(); })+'.';
      if(out) out.textContent=s;
      cur={mode:mode, sets:n, strategies:Math.pow(2,n), ua:o?o.e[0]:null};
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){ if('mode' in st) NF.press(fig,'data-mode',String(st.mode)); draw(); });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 3. Perfect recall: forgetful Ana or Ana who remembers ---------- */
  NF.register('gt1-recall',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, ch={A1:'L', BL:'l', BR:'r', A2:'d', A3:'c', Am:'d'}, W=520, H=270, cur={}, A=null;
    mode=seg(fig,'data-mode',function(v){ mode=v; draw(); });
    if(mode!=='forget') mode='remember';
    function pick(I,a){ ch[I]=a; draw(); }
    function draw(){
      var fk=focusKey(svg), fg=mode==='forget', r, m, o, s, sets, n;
      W=measure(svg); m=W<420?2:20;
      H=282; frame(svg,W,H);
      sets=fg?{A1:{name:'her first node'}, Am:{c:'o', name:'her one information set for the second move'}, BL:{name:'his node after L'}, BR:{name:'his node after R'}}:
              {A1:{name:'her first node', lab:['A','1'], lp:'side'}, A2:{c:'r', name:'I A 2, after L', lab:['A','2']}, A3:{c:'p', name:'I A 3, after R', lab:['A','3']},
               BL:{name:'his node after L'}, BR:{name:'his node after R'}};
      r=drawTree(S('g',null,svg),{root:recallGame(fg), gap:0.9, pad:0.5, sets:sets},{x0:m,x1:W-m,y0:34,dy:60},ch,pick);
      if(fg){ n=r.sets.Am; text(svg,(r.X(n[1])+r.X(n[2]))/2,r.Y(n[0])-30,'one information set','gt1-note gt1-to','middle'); }
      refocus(svg,fk);
      o=outcome(r.L);
      if(fg) s='Forgetful: one information set for all four second nodes. Ana plays '+ch.A1+' and then '+ch.Am+' whatever her first move was.'+
               '\nShe has 2 information sets, so 4 strategies; her second move cannot depend on her first.';
      else s='Ana remembers: one information set after L (red), another after R (purple). Plan: '+ch.A1+', then '+ch.A2+' after L and '+ch.A3+' after R.'+
               '\nShe has 3 information sets, so 8 strategies; she still does not see Bob’s move.';
      s+='\nBob plays '+ch.BL+' after L and '+ch.BR+' after R. '+outText(o).replace(/^./,function(c){ return c.toUpperCase(); })+(o&&o.e[0]>0?': Ana wins.':o?': Bob wins.':'.');
      if(out) out.textContent=s;
      cur={mode:mode, strategies:fg?4:8, ua:o?o.e[0]:null};
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){ if('mode' in st) NF.press(fig,'data-mode',String(st.mode)); draw(); });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 4. Bob's strategies and the normal form they induce ---------- */
  NF.register('gt1-strategies',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var ana='H', b=['h','t'], W=520, H=300, cur={}, A=null;
    var T={root:hideSeek('B1','B2'), sets:{B1:{c:'r', name:'I 1, after H', lab:['1'], lp:'side'}, B2:{c:'p', name:'I 2, after T', lab:['2'], lp:'side'}}};
    function pick(I,a){ if(I==='A0') ana=a; else if(I==='B1') b[0]=a; else b[1]=a; draw(); }
    function draw(){
      var fk=focusKey(svg), wide, r, tw, s=b.join(''), j=STRAT.indexOf(s), u, my, mx, mw;
      W=measure(svg); wide=W>=600;
      tw=wide?Math.round(W*0.5):W;
      H=wide?262:372; frame(svg,W,H);
      r=drawTree(S('g',null,svg),T,{x0:wide?10:Math.max(4,W/2-170),x1:wide?tw:Math.min(W-4,W/2+170),y0:30,dy:84},{A0:ana, B1:b[0], B2:b[1]},pick);
      mx=wide?tw+30:Math.max(6,W/2-170); mw=wide?W-tw-36:Math.min(W-12,340); my=wide?70:274;
      text(svg,mx+mw/2,my-26,'Normal form','gt1-note gt1-bold','middle');
      matrix(S('g',null,svg),mx,my,mw,['H','T'],STRAT.map(stratParts),function(i,jj){ return cellHS(i?'T':'H',STRAT[jj]); },{row:ana==='H'?0:1, col:j},
        function(i,jj){ ana=i?'T':'H'; b=STRAT[jj].split(''); draw(); },STRAT);
      refocus(svg,fk);
      u=cellHS(ana,s);
      if(out) out.textContent='Bob plays '+s+': '+b[0]+' at I₁ (after H), '+b[1]+' at I₂ (after T); he '+DOES[s]+'.'+
        '\nAgainst H: '+pv(cellHS('H',s))+'; against T: '+pv(cellHS('T',s))+'. This is column '+s+' of the normal form.'+
        '\nAna plays '+ana+': outcome '+pv(u)+'.';
      cur={ana:ana, bob:s, ua:u[0], ub:u[1]};
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){
      if('ana' in st) ana=String(st.ana)==='T'?'T':'H';
      if('bob' in st && STRAT.indexOf(String(st.bob))>=0) b=String(st.bob).split('');
      draw();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 5. One normal form, two extensive forms ---------- */
  NF.register('gt1-samenf',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var ana='H', bob='ht', W=520, H=400, cur={}, A=null, LET='abcd';
    var T1={root:hideSeek('B1','B2'), sets:{B1:{c:'r', name:'I 1, after H', lab:['1'], lp:'side'}, B2:{c:'p', name:'I 2, after T', lab:['2'], lp:'side'}}};
    var T2={root:D('B','B0',STRAT.map(function(s,k){ return [LET[k],D('A','Aall',[['H',P(cellHS('H',s)[0],cellHS('H',s)[1])],['T',P(cellHS('T',s)[0],cellHS('T',s)[1])]])]; })),
            gap:0.45, sets:{Aall:{name:'her information set'}}};
    function pick1(I,a){ if(I==='A0') ana=a; else if(I==='B1') bob=a+bob[1]; else bob=bob[0]+a; draw(); }
    function pick2(I,a){ if(I==='Aall') ana=a; else bob=STRAT[LET.indexOf(a)]; draw(); }
    function draw(){
      var fk=focusKey(svg), wide, r1, r2, j=STRAT.indexOf(bob), y2, my, mw, mx, u, k, n;
      W=measure(svg); wide=W>=620;
      H=wide?400:650; frame(svg,W,H);
      if(wide){
        r1=drawTree(S('g',null,svg),T1,{x0:6,x1:W*0.34,y0:30,dy:84},{A0:ana, B1:bob[0], B2:bob[1]},pick1);
        r2=drawTree(S('g',null,svg),T2,{x0:W*0.37,x1:W-4,y0:30,dy:84},{B0:LET[j], Aall:ana},pick2);
        y2=30; my=300;
      } else {
        r1=drawTree(S('g',null,svg),T1,{x0:Math.max(4,W/2-150),x1:Math.min(W-4,W/2+150),y0:30,dy:84},{A0:ana, B1:bob[0], B2:bob[1]},pick1);
        y2=262;
        r2=drawTree(S('g',null,svg),T2,{x0:2,x1:W-2,y0:y2+20,dy:84},{B0:LET[j], Aall:ana},pick2);
        my=548;
      }
      for(k=0;k<4;k++){
        n=r2.L.nodes.filter(function(q){ return q.I==='Aall'; })[k];
        mtext(svg,r2.X(n),r2.bottom+(wide?4:6),[[LET[k]+' = ','gt1-tm'],[STRAT[k][0],'gt1-tr'],[STRAT[k][1],'gt1-tp']],'gt1-ct','middle');
      }
      mw=Math.min(W-12,420); mx=(W-mw)/2;
      matrix(S('g',null,svg),mx,my,mw,['H','T'],STRAT.map(function(s,q){ return [[LET[q]+' = ','gt1-tm']].concat(stratParts(s)); }),
        function(i,jj){ return cellHS(i?'T':'H',STRAT[jj]); },{row:ana==='H'?0:1, col:j},
        function(i,jj){ ana=i?'T':'H'; bob=STRAT[jj]; draw(); },STRAT.map(function(s,q){ return LET[q]+', which plays like '+s; }));
      refocus(svg,fk);
      u=cellHS(ana,bob);
      if(out) out.textContent='Left tree: Bob plans '+bob+' ('+bob[0]+' after H, '+bob[1]+' after T). Right tree: he moves '+LET[j]+', which pays exactly like '+bob+'.'+
        '\nAna plays '+ana+' in both. Both trees end at '+pv(u)+', the cell ('+ana+', '+LET[j]+' = '+bob+') of the shared matrix.';
      cur={ana:ana, bob:bob, ua:u[0], ub:u[1]};
      if(A) A.changed();
    }
    A=api(function(){ return cur; },function(st){
      if('ana' in st) ana=String(st.ana)==='T'?'T':'H';
      if('bob' in st && STRAT.indexOf(String(st.bob))>=0) bob=String(st.bob);
      draw();
    });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 6. Mixed strategies in matching pennies ---------- */
  NF.register('gt1-mixed',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var p=0.5, q=1/3, W=520, H=300, F={}, el={}, h=null, cur={}, A=null;
    var rp=range(fig,'p',2,function(v){ p=v; update(); }), rq=range(fig,'q',2,function(v){ q=v; update(); });
    if(rp) p=rp.v(); if(rq) q=rq.v();
    function u(pp,qq){ return -(2*pp-1)*(2*qq-1); }
    function draw(){
      var wide, s, g, i, c, pts, x, side, lx, ly;
      W=measure(svg); wide=W>=560;
      s=wide?Math.min(230,W*0.42-40):Math.min(W-70,250);
      H=wide?s+66:s+300; frame(svg,W,H);
      F.sx=wide?44:Math.round((W-s)/2)+8; F.sy=26; F.s=s;
      F.lx0=wide?F.sx+s+64:44; F.lx1=W-20; F.ly0=wide?26:s+96; F.ly1=wide?26+s:s+96+170;
      g=S('g',null,svg);
      /* square: grey where u_A > 0, contour lines, corners */
      S('rect',{x:R(F.sx),y:R(F.sy),width:R(s/2),height:R(s/2),'class':'gt1-pos'},g);
      S('rect',{x:R(F.sx+s/2),y:R(F.sy+s/2),width:R(s/2),height:R(s/2),'class':'gt1-pos'},g);
      [-0.75,-0.5,-0.25,0.25,0.5,0.75].forEach(function(cv){
        [[0,0.5],[0.5,1]].forEach(function(iv){
          pts=[];
          for(i=0;i<=80;i++){ x=iv[0]+(iv[1]-iv[0])*(i/80); if(Math.abs(2*x-1)<1e-6) continue; c=0.5-cv/(2*(2*x-1)); if(c>=0 && c<=1) pts.push([F.sx+x*s,F.sy+(1-c)*s]); }
          if(pts.length>1) S('path',{d:poly(pts),'class':'gt1-ctr'},g);
        });
      });
      S('rect',{x:R(F.sx),y:R(F.sy),width:R(s),height:R(s),'class':'gt1-sq'},g);
      [[0,0,'(T,t): −1','start',-1],[1,1,'(H,h): −1','end',1],[1,0,'(H,t): 1','end',-1],[0,1,'(T,h): 1','start',1]].forEach(function(cn){
        text(g,F.sx+cn[0]*s+(cn[3]==='start'?5:-5),F.sy+(1-cn[1])*s+(cn[4]>0?14:-6),cn[2],'gt1-note nf-halo',cn[3]);
      });
      text(g,F.sx,F.sy+s+16,'0','gt1-note','middle'); text(g,F.sx+s,F.sy+s+16,'1','gt1-note','middle');
      text(g,F.sx-6,F.sy+s+4,'0','gt1-note','end'); text(g,F.sx-6,F.sy+4,'1','gt1-note','end');
      text(g,F.sx+s/2,F.sy+s+30,'p = σA(H)','gt1-note gt1-tr','middle');
      text(g,F.sx-10,F.sy+s/2,'q = σB(h)','gt1-note gt1-tp','middle').setAttribute('transform','rotate(-90 '+R(F.sx-10)+' '+R(F.sy+s/2)+')');
      /* lines panel */
      lx=lin(0,1,F.lx0,F.lx1); ly=lin(-1,1,F.ly1,F.ly0); el.lx=lx; el.ly=ly;
      [-1,-0.5,0,0.5,1].forEach(function(v){ line(g,F.lx0,C(ly(v)),F.lx1,C(ly(v)),v===0?'nf-ax':'nf-grid'); text(g,F.lx0-6,ly(v)+4,tl(v),null,'end'); });
      [0,0.25,0.5,0.75,1].forEach(function(v){ line(g,C(lx(v)),F.ly0,C(lx(v)),F.ly1,'nf-grid'); text(g,lx(v),F.ly1+16,tl(v),null,'middle'); });
      text(g,(F.lx0+F.lx1)/2,F.ly1+30,'q = σB(h)','gt1-note gt1-tp','middle');
      text(g,F.lx0-6,F.ly0-10,'payoff to Ana','gt1-note','start');
      line(g,lx(0),ly(1),lx(1),ly(-1),'gt1-lh'); line(g,lx(0),ly(-1),lx(1),ly(1),'gt1-lt');
      text(g,lx(1)+5,ly(-1)+4,'H','gt1-note gt1-tk','start');
      text(g,lx(1)+5,ly(1)+4,'T','gt1-note','start');
      el.fg=S('g',null,svg);
      h=handle(svg,'gt1-kk','Mixed strategy pair p and q, arrow keys move it',function(dx,dy,big){ setPQ(p+dx*(big?0.1:0.01),q+dy*(big?0.1:0.01)); });
      update();
    }
    function setPQ(a,b){ if(rp) rp.set(Math.round(clamp(a,0,1)*100)/100); else p=clamp(a,0,1); if(rq) rq.set(Math.round(clamp(b,0,1)*100)/100); else q=clamp(b,0,1); update(); }
    function update(){
      var g=clear(el.fg), lx=el.lx, ly=el.ly, uh=1-2*q, ut=2*q-1, um=u(p,q), x;
      if(!lx) return;
      line(g,F.sx+p*F.s,F.sy,F.sx+p*F.s,F.sy+F.s,'gt1-lp');
      line(g,F.sx,F.sy+(1-q)*F.s,F.sx+F.s,F.sy+(1-q)*F.s,'gt1-lq');
      place(h,F.sx+p*F.s,F.sy+(1-q)*F.s,'p = '+fmt(p,2)+', q = '+fmt(q,2)+', Ana earns '+fmt(um,2));
      line(g,lx(0),ly(u(p,0)),lx(1),ly(u(p,1)),'gt1-lp');
      x=0.8;
      text(g,lx(x),ly(u(p,x))+(2-4*p>0.05?18:-9),'mix p = '+fmt(p,2),'gt1-note gt1-tr nf-halo','middle');
      line(g,lx(q),F.ly0,lx(q),F.ly1,'gt1-lqd');
      dot(g,lx(q),ly(uh),4.5,'gt1-dk'); dot(g,lx(q),ly(ut),4.5,'gt1-dm'); dot(g,lx(q),ly(um),5,'gt1-dr');
      if(out) out.textContent='p = '+fmt(p,2)+', q = '+fmt(q,2)+
        '\nuA(H, q) = 1 − 2q = '+fmt(uh,2)+',   uA(T, q) = 2q − 1 = '+fmt(ut,2)+
        '\nuA(p, q) = p ('+fmt(uh,2)+') + (1 − p)('+fmt(ut,2)+') = −(2p − 1)(2q − 1) = '+fmt(um,2)+
        (Math.abs(p-0.5)<0.005?'\np = 0.50: Ana earns 0 whatever Bob does':Math.abs(q-0.5)<0.005?'\nq = 0.50: Ana earns 0 whatever she does':'');
      cur={p:p, q:q, ua:um};
      if(A) A.changed();
    }
    dragBox(svg,function(){ return [W,H]; },function(pt){ return pt[0]>=F.sx-10 && pt[0]<=F.sx+F.s+10 && pt[1]>=F.sy-10 && pt[1]<=F.sy+F.s+10; },
      function(pt){ setPQ((pt[0]-F.sx)/F.s,1-(pt[1]-F.sy)/F.s); });
    A=api(function(){ return cur; },function(st){ setPQ('p' in st?+st.p:p,'q' in st?+st.q:q); });
    draw();
    watch(svg,draw);
    return A;
  });

  /* ---------- 7. Kuhn's theorem: Bob's mixed strategies on the simplex, and forgetful Ana ---------- */
  NF.register('gt1-kuhn',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var mode, b1=0.5, b2=1/3, t=0.5, sa=0.5, W=520, H=460, F={}, el={}, h=null, cur={}, A=null;
    var r1=range(fig,'b1',2,function(v){ b1=v; update(); }), r2=range(fig,'b2',2,function(v){ b2=v; update(); }),
        rt=range(fig,'t',2,function(v){ t=v; update(); }), rs=range(fig,'sa',2,function(v){ sa=v; update(); });
    if(r1) b1=r1.v(); if(r2) b2=r2.v(); if(rt) t=rt.v(); if(rs) sa=rs.v();
    mode=seg(fig,'data-mode',function(v){ mode=v; relabel(); draw(); });
    if(mode!=='forget') mode='bob';
    /* the simplex of four pure strategies, projected as in the Word figure */
    var V3={hh:[1,1,1], th:[1,-1,-1], ht:[-1,1,-1], tt:[-1,-1,1]}, ORDER=['hh','th','ht','tt'], NAME={hh:'Lc', th:'Rc', ht:'Ld', tt:'Rd'};
    var el0=-76*Math.PI/180, az=12*Math.PI/180, ca=Math.cos(az), sn=Math.sin(az), ce=Math.cos(el0), se=Math.sin(el0);
    function proj(sig){
      var v=[0,0,0], k, i, x, y, z;
      for(k in V3) for(i=0;i<3;i++) v[i]+=sig[k]*V3[k][i];
      x=ca*v[0]-sn*v[1]; y=sn*v[0]+ca*v[1]; z=v[2];
      return [x, ce*y-se*z, se*y+ce*z];
    }
    function prod(x,y){ return {hh:x*y, th:(1-x)*y, ht:x*(1-y), tt:(1-x)*(1-y)}; }
    function lock(r,off){ if(!r) return; r.el.disabled=off; r.wrap.classList.toggle('is-off',off); }
    function relabel(){
      var n1=fig.querySelector('[data-k="b1"]'), n2=fig.querySelector('[data-k="b2"]'), fg=mode==='forget';
      [[n1,fg?'βA(L)':'βB(I₁, h)','gt1-nr'],[n2,fg?'βA(c)':'βB(I₂, h)','gt1-np']].forEach(function(z){
        var nm=z[0] && z[0].parentNode.querySelector('.nfig-name'); if(nm){ nm.textContent=z[1]; nm.classList.toggle(z[2],!fg); }
      });
      lock(rt,fg); lock(rs,fg);
    }
    function draw(){
      var g, wide, P0, xs, ys, minx=1e9, maxx=-1e9, miny=1e9, maxy=-1e9, sc, tw, k, i, j, e1, e2, hid=null, d1, d2, M, cx, cy;
      W=measure(svg); wide=W>=560;
      F.h1=wide?250:Math.min(230,Math.round(W*0.62)); F.bh=170;
      H=F.h1+F.bh+30; frame(svg,W,H);
      tw=Math.round(W*(wide?0.56:0.5));
      /* tetrahedron scale */
      P0={}; ORDER.forEach(function(kk){ var s={hh:0,th:0,ht:0,tt:0}; s[kk]=1; P0[kk]=proj(s); minx=Math.min(minx,P0[kk][0]); maxx=Math.max(maxx,P0[kk][0]); miny=Math.min(miny,P0[kk][1]); maxy=Math.max(maxy,P0[kk][1]); });
      sc=Math.min((tw-60)/(maxx-minx),(F.h1-60)/(maxy-miny));
      cx=tw/2; cy=F.h1/2+6;
      F.T=function(sig){ var p=proj(sig); return [cx+(p[0]-(minx+maxx)/2)*sc, cy-(p[1]-(miny+maxy)/2)*sc]; };
      /* hidden edge: of the two crossing diagonals, the one behind */
      var E=[['hh','th'],['hh','ht'],['hh','tt'],['th','ht'],['th','tt'],['ht','tt']];
      for(i=0;i<E.length;i++) for(j=i+1;j<E.length;j++){
        e1=E[i]; e2=E[j];
        if(e1[0]===e2[0]||e1[0]===e2[1]||e1[1]===e2[0]||e1[1]===e2[1]) continue;
        d1=[P0[e1[1]][0]-P0[e1[0]][0],P0[e1[1]][1]-P0[e1[0]][1]]; d2=[P0[e2[1]][0]-P0[e2[0]][0],P0[e2[1]][1]-P0[e2[0]][1]];
        M=d1[0]*(-d2[1])-(-d2[0])*d1[1];
        if(Math.abs(M)<1e-9) continue;
        var bx=P0[e2[0]][0]-P0[e1[0]][0], by=P0[e2[0]][1]-P0[e1[0]][1], ta=(bx*(-d2[1])-(-d2[0])*by)/M, tb=(d1[0]*by-d1[1]*bx)/M;
        if(ta>0.02&&ta<0.98&&tb>0.02&&tb<0.98){
          var z1=P0[e1[0]][2]+ta*(P0[e1[1]][2]-P0[e1[0]][2]), z2=P0[e2[0]][2]+tb*(P0[e2[1]][2]-P0[e2[0]][2]);
          hid=z1<z2?e1:e2;
        }
      }
      g=S('g',null,svg); el.bg=g;
      for(k=0;k<=6;k++){
        var a0=F.T(prod(k/6,0)), a1=F.T(prod(k/6,1)), c0=F.T(prod(0,k/6)), c1=F.T(prod(1,k/6));
        line(g,a0[0],a0[1],a1[0],a1[1],'gt1-surf'); line(g,c0[0],c0[1],c1[0],c1[1],'gt1-surf');
      }
      E.forEach(function(e){ var a=F.T(unit(e[0])), b=F.T(unit(e[1])); line(g,a[0],a[1],b[0],b[1],'gt1-tet'+(hid&&e[0]===hid[0]&&e[1]===hid[1]?' gt1-hid':'')); });
      el.vl=S('g',null,svg);
      /* square of behaviour strategies */
      F.s=Math.min(F.h1-70,W-tw-60); F.qx=tw+Math.round((W-tw-F.s)/2)+12; F.qy=Math.round((F.h1-F.s)/2)-4;
      S('rect',{x:R(F.qx),y:R(F.qy),width:R(F.s),height:R(F.s),'class':'gt1-sq'},g);
      for(k=1;k<6;k++){ line(g,F.qx+k*F.s/6,F.qy,F.qx+k*F.s/6,F.qy+F.s,'gt1-surf'); line(g,F.qx,F.qy+k*F.s/6,F.qx+F.s,F.qy+k*F.s/6,'gt1-surf'); }
      el.ql=S('g',null,svg);
      /* bars */
      F.by0=F.h1+20; F.by1=F.h1+F.bh; F.bx0=40; F.bx1=W-10;
      el.bars=S('g',null,svg);
      el.fg=S('g',null,svg);
      h=handle(svg,'gt1-kk','Behaviour strategy, arrow keys move it',function(dx,dy,big){ setB(b1+dx*(big?0.1:0.01),b2+dy*(big?0.1:0.01)); });
      update();
    }
    function unit(kk){ var s={hh:0,th:0,ht:0,tt:0}; s[kk]=1; return s; }
    function setB(x,y){ if(r1) r1.set(Math.round(clamp(x,0,1)*100)/100); else b1=clamp(x,0,1); if(r2) r2.set(Math.round(clamp(y,0,1)*100)/100); else b2=clamp(y,0,1); update(); }
    function bars(g,labels,A1,A2,n1,n2){
      var n=labels.length, gw=(F.bx1-F.bx0)/n, ys=lin(0,1,F.by1,F.by0+16), i, x, w=Math.min(26,gw*0.3);
      [0,0.25,0.5,0.75,1].forEach(function(v){ line(g,F.bx0,C(ys(v)),F.bx1,C(ys(v)),v===0?'nf-ax':'nf-grid'); text(g,F.bx0-6,ys(v)+4,tl(v),null,'end'); });
      for(i=0;i<n;i++){
        x=F.bx0+(i+0.5)*gw;
        S('rect',{x:R(x-w-1),y:R(ys(A1[i])),width:R(w),height:R(Math.max(0,ys(0)-ys(A1[i]))),'class':'gt1-bm'},g);
        S('rect',{x:R(x+1),y:R(ys(A2[i])),width:R(w),height:R(Math.max(0,ys(0)-ys(A2[i]))),'class':'gt1-bb'},g);
        text(g,x-w/2-1,ys(A1[i])-4,fmt(A1[i],2),'gt1-note gt1-to','middle');
        text(g,x+w/2+1,ys(A2[i])-4,fmt(A2[i],2),'gt1-note gt1-tk','middle');
        text(g,x,F.by1+15,labels[i],'gt1-ct','middle');
      }
      S('rect',{x:R(F.bx0+4),y:R(F.by0-6),width:10,height:10,'class':'gt1-bm'},g); text(g,F.bx0+18,F.by0+3,n1,'gt1-note','start');
      S('rect',{x:R(F.bx0+(F.bx1-F.bx0)/2),y:R(F.by0-6),width:10,height:10,'class':'gt1-bb'},g); text(g,F.bx0+(F.bx1-F.bx0)/2+14,F.by0+3,n2,'gt1-note','start');
    }
    function update(){
      var fg=mode==='forget', g=clear(el.fg), lo=Math.max(0,b1+b2-1), hi=Math.min(b1,b2), a=lo+t*(hi-lo), sig, p, q, s1, s2, D1, D2, tv, lab, i, pr, best;
      if(!F.T) return;
      clear(el.vl); clear(el.ql); clear(el.bars);
      ORDER.forEach(function(kk){ var pp=F.T(unit(kk)), c=F.T({hh:0.25,th:0.25,ht:0.25,tt:0.25}), dx=pp[0]-c[0], dy=pp[1]-c[1], d=Math.hypot(dx,dy)||1;
        text(el.vl,pp[0]+dx/d*16,pp[1]+dy/d*16+4,fg?NAME[kk]:kk,'gt1-who','middle'); });
      [[1,1,fg?'Lc':'hh','start',-5],[1,0,fg?'Ld':'ht','start',13],[0,1,fg?'Rc':'th','end',-5],[0,0,fg?'Rd':'tt','end',13]].forEach(function(c){
        text(el.ql,F.qx+c[0]*F.s+(c[3]==='start'?4:-4),F.qy+(1-c[1])*F.s+c[4],c[2],'gt1-who',c[3]); });
      text(el.ql,F.qx+F.s/2,F.qy+F.s+16,fg?'βA(L)':'βB(I₁, h)','gt1-note'+(fg?'':' gt1-tr'),'middle');
      text(el.ql,F.qx-8,F.qy+F.s/2,fg?'βA(c)':'βB(I₂, h)','gt1-note'+(fg?'':' gt1-tp'),'middle').setAttribute('transform','rotate(-90 '+R(F.qx-8)+' '+R(F.qy+F.s/2)+')');
      if(!fg){
        p=F.T(prod(b1,0)); q=F.T(prod(b1,1)); line(g,p[0],p[1],q[0],q[1],'gt1-lp');
        p=F.T(prod(0,b2)); q=F.T(prod(1,b2)); line(g,p[0],p[1],q[0],q[1],'gt1-lq');
        p=F.T({hh:lo,th:b2-lo,ht:b1-lo,tt:1-b1-b2+lo}); q=F.T({hh:hi,th:b2-hi,ht:b1-hi,tt:1-b1-b2+hi});
        line(g,p[0],p[1],q[0],q[1],'gt1-fib');
        sig={hh:a,th:b2-a,ht:b1-a,tt:1-b1-b2+a};
        p=F.T(sig); dot(g,p[0],p[1],5.5,'gt1-dk');
        p=F.T(prod(b1,b2)); S('circle',{cx:R(p[0]),cy:R(p[1]),r:7,'class':'gt1-ctr'},g);
        line(g,F.qx+b1*F.s,F.qy,F.qx+b1*F.s,F.qy+F.s,'gt1-lp'); line(g,F.qx,F.qy+(1-b2)*F.s,F.qx+F.s,F.qy+(1-b2)*F.s,'gt1-lq');
        /* outcomes against sigma_A: from the mixed strategy by summing over pure strategies, and from the behaviour strategy by products */
        D1=[sa*(sig.hh+sig.ht), sa*(sig.th+sig.tt), (1-sa)*(sig.hh+sig.th), (1-sa)*(sig.ht+sig.tt)];
        D2=[sa*b1, sa*(1-b1), (1-sa)*b2, (1-sa)*(1-b2)];
        bars(el.bars,['(H,h)','(H,t)','(T,h)','(T,t)'],D1,D2,'mixed σB','behaviour βB');
        tv=0; for(i=0;i<4;i++) tv+=Math.abs(D1[i]-D2[i])/2;
        lab='σB = ('+[sig.hh,sig.th,sig.ht,sig.tt].map(function(v){ return fmt(Math.abs(v)<5e-4?0:v,2); }).join(', ')+') over (hh, th, ht, tt), a = σB(hh) = '+fmt(a,2)+' in ['+fmt(lo,2)+', '+fmt(hi,2)+']'+
          '\nβB(I₁, h) = σB(hh) + σB(ht) = '+fmt(b1,2)+',   βB(I₂, h) = σB(hh) + σB(th) = '+fmt(b2,2)+
          '\nAgainst σA(H) = '+fmt(sa,2)+' both give outcomes ('+D2.map(function(v){ return fmt(v,2); }).join(', ')+'); difference '+fmt(tv,3);
        cur={mode:mode, b1:b1, b2:b2, a:a, sa:sa, tv:tv};
      } else {
        p=F.T(unit('hh')); q=F.T(unit('tt')); line(g,p[0],p[1],q[0],q[1],'gt1-edge');
        p=F.T({hh:0.5,th:0,ht:0,tt:0.5}); dot(g,p[0],p[1],5.5,'gt1-do');
        p=F.T(prod(b1,b2)); dot(g,p[0],p[1],5.5,'gt1-dk');
        D1=[0.5,0,0,0.5]; D2=[b1*b2,b1*(1-b2),(1-b1)*b2,(1-b1)*(1-b2)];
        bars(el.bars,['(L,c)','(L,d)','(R,c)','(R,d)'],D1,D2,'target 0.5 Lc + 0.5 Rd','behaviour βA');
        tv=0; for(i=0;i<4;i++) tv+=Math.abs(D1[i]-D2[i])/2;
        best=1; for(i=0;i<=100;i++) for(pr=0;pr<=100;pr++){ var x=i/100, y=pr/100, d=(Math.abs(x*y-0.5)+x*(1-y)+(1-x)*y+Math.abs((1-x)*(1-y)-0.5))/2; if(d<best) best=d; }
        lab='Behaviour: βA(L) = '+fmt(b1,2)+', βA(c) = '+fmt(b2,2)+' draws the two moves independently: P(L,c) = '+fmt(b1*b2,2)+', P(R,d) = '+fmt((1-b1)*(1-b2),2)+
          '\nTarget 0.5 Lc + 0.5 Rd: P(L,c) = P(R,d) = 0.5 and P(L,d) = P(R,c) = 0, a point off the surface of behaviour strategies'+
          '\nDifference '+fmt(tv,3)+'; no behaviour strategy gets below '+fmt(best,3);
        cur={mode:mode, x:b1, y:b2, tv:tv};
      }
      p=[F.qx+b1*F.s,F.qy+(1-b2)*F.s];
      place(h,p[0],p[1],(fg?'beta A of L ':'beta B at I1 of h ')+fmt(b1,2)+(fg?', beta A of c ':', at I2 of h ')+fmt(b2,2));
      if(out) out.textContent=lab;
      if(A) A.changed();
    }
    dragBox(svg,function(){ return [W,H]; },function(pt){ return F.s && pt[0]>=F.qx-10 && pt[0]<=F.qx+F.s+10 && pt[1]>=F.qy-10 && pt[1]<=F.qy+F.s+10; },
      function(pt){ setB((pt[0]-F.qx)/F.s,1-(pt[1]-F.qy)/F.s); });
    A=api(function(){ return cur; },function(st){
      if('mode' in st) NF.press(fig,'data-mode',String(st.mode));
      if('b1' in st || 'b2' in st) setB('b1' in st?+st.b1:b1,'b2' in st?+st.b2:b2);
      if('t' in st && rt) rt.set(+st.t);
      if('sa' in st && rs) rs.set(+st.sa);
      update();
    });
    relabel();
    draw();
    watch(svg,draw);
    return A;
  });
})();
