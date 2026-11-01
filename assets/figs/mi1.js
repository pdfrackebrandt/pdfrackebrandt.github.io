/* Core Micro L1 figures: a preference on four alternatives, majority rule over three voters, ordinal utility,
   lexicographic preferences against a weighted sum, and a WARP checker on the menus of {x, y, z}.
   Drawn with the helpers of /assets/notes.js (window.NF); colours come from CSS variables in /assets/figs/mi1.css. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, measure=NF.measure, frame=NF.frame, watch=NF.watch, range=NF.range, clip=NF.clip,
      local=NF.local, capture=NF.capture, MINUS=NF.MINUS;
  var SUCC='≻', SUCCEQ='⪰', SIM='∼';

  /* ---------- shared ---------- */
  function vec(g,lcls,hcls){ return {l:line(g,0,0,0,0,lcls), h:S('path',{'class':hcls},g)}; }
  /* arrow from (x0,y0) to (x1,y1); the tail starts t0 px out and the head stops gap px short of the tip */
  function setVec(v,x0,y0,x1,y1,gap,t0,head){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux, uy, hl, bx, by, tx, ty;
    gap=gap||0; t0=t0||0;
    if(len<gap+t0+8){ setLine(v.l,x0,y0,x0,y0); v.l.setAttribute('visibility','hidden'); v.h.setAttribute('d',''); return false; }
    v.l.removeAttribute('visibility');
    ux=dx/len; uy=dy/len;
    tx=x1-ux*gap; ty=y1-uy*gap;
    if(head===false){ setLine(v.l,x0+ux*t0,y0+uy*t0,tx,ty); v.h.setAttribute('d',''); return true; }
    hl=Math.min(9,(len-gap-t0)*0.45); bx=tx-ux*hl; by=ty-uy*hl;
    setLine(v.l,x0+ux*t0,y0+uy*t0,bx+ux*2,by+uy*2);
    v.h.setAttribute('d',poly([[tx,ty],[bx-uy*4.5,by+ux*4.5],[bx+uy*4.5,by-ux*4.5]])+'Z');
    return true;
  }
  function twoHeads(v,x0,y0,x1,y1,gap){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ux=dx/len, uy=dy/len, a=[x0+ux*gap,y0+uy*gap], b=[x1-ux*gap,y1-uy*gap], h=8, d='';
    setLine(v.l,a[0]+ux*h,a[1]+uy*h,b[0]-ux*h,b[1]-uy*h); v.l.removeAttribute('visibility');
    d+=poly([[b[0],b[1]],[b[0]-ux*h-uy*4.5,b[1]-uy*h+ux*4.5],[b[0]-ux*h+uy*4.5,b[1]-uy*h-ux*4.5]])+'Z';
    d+=poly([[a[0],a[1]],[a[0]+ux*h-uy*4.5,a[1]+uy*h+ux*4.5],[a[0]+ux*h+uy*4.5,a[1]+uy*h-ux*4.5]])+'Z';
    v.h.setAttribute('d',d);
  }
  function moveTo(e,x,y){ e.setAttribute('x',R(x)); e.setAttribute('y',R(y)); }
  function onClick(fig,sel,fn){ var b=fig.querySelector(sel); if(b) b.addEventListener('click',fn); }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }
  function put(out,s){ out.appendChild(document.createTextNode(s)); }
  /* an svg group that acts as a button (or a checkbox when checked is given): click, Enter and Space */
  function clicker(g,label,fn){
    g.setAttribute('tabindex','0'); g.setAttribute('role','button'); g.setAttribute('aria-label',label);
    g.addEventListener('click',function(e){ e.preventDefault(); fn(); });
    g.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(); } });
  }
  function handle(svg,knob,label,onKey){
    var h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point','aria-label':label},svg);
    S('circle',{r:18,'class':'nf-hit'},h);
    S('circle',{r:11,'class':'nf-ring'},h);
    S('circle',{r:5.5,'class':'nf-knob '+knob},h);
    h.addEventListener('keydown',function(e){
      var k=e.key, dx=0, dy=0;
      if(k==='ArrowRight') dx=1; else if(k==='ArrowLeft') dx=-1;
      else if(k==='ArrowUp') dy=1; else if(k==='ArrowDown') dy=-1;
      else return;
      e.preventDefault(); onKey(dx,dy,e.shiftKey);
    });
    return h;
  }
  function place(h,x,y,now,txt){
    h.setAttribute('transform','translate('+R(x)+','+R(y)+')');
    h.setAttribute('aria-valuenow',+now.toFixed(2));
    h.setAttribute('aria-valuetext',txt);
  }
  /* drag whichever point is nearest the pointer; pts() gives svg positions, move(i,x,y) the new one */
  function dragger(svg,size,pts,move,focus){
    var cur=-1, off=[0,0];
    function near(p){
      var P=pts(), best=-1, bd=26, i, d;
      for(i=0;i<P.length;i++){ d=Math.hypot(P[i][0]-p[0],P[i][1]-p[1]); if(d<bd){ bd=d; best=i; } }
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
  /* a square plot of [lo, hi]^2 with its left edge at x0; whole number grid, tick labels, axis names */
  function plane(svg,x0,top,side,lo,hi,names){
    var g=S('g',null,svg), v, sx, sy;
    sx=function(v){ return x0+(v-lo)/(hi-lo)*side; };
    sy=function(v){ return top+(hi-v)/(hi-lo)*side; };
    sx.inv=function(p){ return lo+(p-x0)/side*(hi-lo); };
    sy.inv=function(p){ return hi-(p-top)/side*(hi-lo); };
    for(v=Math.ceil(lo);v<=hi;v++){
      line(g,C(sx(v)),top,C(sx(v)),top+side,v===0?'nf-ax':'nf-grid');
      line(g,x0,C(sy(v)),x0+side,C(sy(v)),v===0?'nf-ax':'nf-grid');
      text(g,sx(v),top+side+15,tl(v),null,'middle');
      text(g,x0-6,sy(v)+4,tl(v),null,'end');
    }
    S('rect',{x:x0,y:top,width:side,height:side,'class':'mi1-frame'},g);
    text(g,x0+side+12,top+side+15,names[0],'nf-title mi1-it');
    text(g,x0-6,top-7,names[1],'nf-title mi1-it','end');
    return {sx:sx, sy:sy, x0:x0, top:top, side:side, gc:clip(svg,x0,top,side,side)};
  }
  /* keep the points of a polygon on the side a x + b y + c >= 0 (Sutherland Hodgman, one edge) */
  function cut(P,a,b,c){
    var out=[], i, p, q, fp, fq, t;
    for(i=0;i<P.length;i++){
      p=P[i]; q=P[(i+1)%P.length]; fp=a*p[0]+b*p[1]+c; fq=a*q[0]+b*q[1]+c;
      if(fp>=0) out.push(p);
      if((fp>=0)!==(fq>=0)){ t=fp/(fp-fq); out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]); }
    }
    return out;
  }

  /* ---------- 1. A preference on four alternatives ---------- */
  NF.register('mi1-rank',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=['x','y','z','w'], PR=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]], KEYS=['xy','xz','xw','yz','yw','zw'];
    /* P[k] = 1 when the first of pair k is strictly preferred, 0 for indifference, -1 when the second is */
    var P0=[1,1,1,0,1,1], P=P0.slice(), W=520, H=340, pos=[], el={}, A=null, sx, api;
    onClick(fig,'.nfig-reset',function(){ P=P0.slice(); update(); });
    function analyse(){
      var G=[], i, j, k, u=[], best=[], viol=null, scyc=null, nind=0, rep=true, mis=null, b;
      for(i=0;i<4;i++){ G.push([]); for(j=0;j<4;j++) G[i].push(i===j); }
      for(k=0;k<6;k++){ i=PR[k][0]; j=PR[k][1]; G[i][j]=P[k]>=0; G[j][i]=P[k]<=0; if(P[k]===0) nind++; }
      for(i=0;i<4;i++) for(j=0;j<4;j++) for(k=0;k<4;k++){
        if(i===j||j===k||i===k) continue;
        if(G[i][j] && G[j][k] && !G[i][k]){
          if(!viol) viol=[i,j,k];
          if(!scyc && !G[j][i] && !G[k][j]) scyc=[i,j,k];
        }
      }
      /* u(a) = |NBT(a)|, the number of alternatives a weakly beats, itself included */
      for(i=0;i<4;i++){ u.push(0); for(j=0;j<4;j++) if(G[i][j]) u[i]++; }
      for(i=0;i<4;i++){ b=true; for(j=0;j<4;j++) if(!G[i][j]) b=false; if(b) best.push(i); }
      for(i=0;i<4;i++) for(j=0;j<4;j++) if(i!==j && G[i][j]!==(u[i]>=u[j])){ rep=false; if(!mis) mis=[i,j]; }
      return {G:G, u:u, best:best, viol:scyc||viol, scyc:!!scyc, nind:nind, rep:rep, mis:mis};
    }
    function cycler(k){ return function(){ P[k]=P[k]===1?0:(P[k]===0?-1:1); update(); }; }
    function draw(){
      var r, cx, cy, i, k, g, a, b, t, px, py, pg, axY, v;
      W=measure(svg);
      r=Math.max(72,Math.min(96,(W-120)/2)); cx=W/2; cy=26+r; axY=cy+r+74; H=axY+44;
      frame(svg,W,H);
      pos=[[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]];
      el.edges=[]; el.pills=[];
      g=S('g',null,svg);
      for(k=0;k<6;k++) el.edges.push(vec(g,'mi1-edge','mi1-head'));
      for(k=0;k<6;k++){
        a=pos[PR[k][0]]; b=pos[PR[k][1]];
        /* the two diagonals cross in the middle, so their labels sit nearer one end */
        t=k===1?0.3:(k===4?0.7:0.5);
        px=a[0]+(b[0]-a[0])*t; py=a[1]+(b[1]-a[1])*t;
        pg=S('g',{'class':'mi1-pill',transform:'translate('+R(px)+','+R(py)+')'},svg);
        S('rect',{x:-20,y:-10.5,width:40,height:21,rx:10.5,'class':'mi1-pbg'},pg);
        el.pills.push({g:pg, t:text(pg,0,4.5,'','mi1-ptx','middle')});
        clicker(pg,'',cycler(k));
      }
      el.nodes=[];
      for(i=0;i<4;i++){
        g=S('g',{transform:'translate('+R(pos[i][0])+','+R(pos[i][1])+')'},svg);
        el.nodes.push({c:S('circle',{r:15,'class':'mi1-node'},g), t:text(g,0,5,N[i],'mi1-nl','middle')});
      }
      /* the scores on a number line */
      sx=function(v){ return 46+(v-0.5)/4*(W-76); };
      g=S('g',null,svg);
      line(g,46,C(axY),W-30,C(axY),'nf-ax');
      for(v=1;v<=4;v++){ line(g,C(sx(v)),axY,C(sx(v)),axY+4,'nf-ax'); text(g,sx(v),axY+17,String(v),null,'middle'); }
      el.axt=text(svg,W/2,axY+36,'','nf-title','middle');
      el.dots=S('g',null,svg);
      el.ay=axY;
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var k, i, j, a, b, onV, vi, s, n, st=[0,0,0,0,0], y, g, cls, lab;
      A=analyse(); vi=A.viol;
      function inV(i,j){ if(!vi) return false; var p=[[vi[0],vi[1]],[vi[1],vi[2]],[vi[0],vi[2]]], m; for(m=0;m<3;m++) if((p[m][0]===i&&p[m][1]===j)||(p[m][0]===j&&p[m][1]===i)) return true; return false; }
      for(k=0;k<6;k++){
        i=PR[k][0]; j=PR[k][1]; onV=inV(i,j);
        a=P[k]>=0?pos[i]:pos[j]; b=P[k]>=0?pos[j]:pos[i];
        el.edges[k].l.setAttribute('class','mi1-edge'+(P[k]===0?' mi1-ind':'')+(onV?' mi1-bad':''));
        el.edges[k].h.setAttribute('class','mi1-head'+(onV?' mi1-badh':''));
        setVec(el.edges[k],a[0],a[1],b[0],b[1],17,16,P[k]!==0);
        lab=P[k]===1?N[i]+SUCC+N[j]:P[k]===-1?N[j]+SUCC+N[i]:N[i]+SIM+N[j];
        el.pills[k].t.textContent=lab;
        el.pills[k].g.setAttribute('class','mi1-pill'+(onV?' mi1-pbad':''));
        el.pills[k].g.setAttribute('aria-label',N[i]+' against '+N[j]+': '+(P[k]===1?N[i]+' strictly preferred':P[k]===-1?N[j]+' strictly preferred':'indifferent')+'. Press to change.');
      }
      for(i=0;i<4;i++) el.nodes[i].c.setAttribute('class','mi1-node'+(A.best.indexOf(i)>=0?' mi1-best':''));
      for(i=0;i<4;i++) el.nodes[i].t.setAttribute('class','mi1-nl'+(A.best.indexOf(i)>=0?' mi1-nlb':''));
      while(el.dots.firstChild) el.dots.removeChild(el.dots.firstChild);
      for(i=0;i<4;i++){
        n=A.u[i]; y=el.ay-13-st[n]*19; st[n]++;
        g=S('g',{transform:'translate('+R(sx(n))+','+R(y)+')'},el.dots);
        S('circle',{r:8.5,'class':A.rep?'mi1-sdot':'mi1-sdot mi1-soff'},g);
        text(g,0,4,N[i],'mi1-stx','middle');
      }
      el.axt.textContent=A.rep?'u = |NBT|, a utility':'|NBT| scores, not a utility';
      el.axt.setAttribute('class',A.rep?'nf-title':'nf-title mi1-warnt');
      if(!out) return;
      out.textContent='';
      if(!vi) put(out,'complete and transitive: rational');
      else warn(out,'not transitive: '+N[vi[0]]+' '+SUCCEQ+' '+N[vi[1]]+' and '+N[vi[1]]+' '+SUCCEQ+' '+N[vi[2]]+', but not '+N[vi[0]]+' '+SUCCEQ+' '+N[vi[2]]+(A.scyc?' (a strict cycle)':''));
      s='\nbest element'+(A.best.length===1?': ':'s: ')+(A.best.length?A.best.map(function(i){ return N[i]; }).join(', '):'none');
      s+='\nu = |NBT|: x '+A.u[0]+', y '+A.u[1]+', z '+A.u[2]+', w '+A.u[3];
      put(out,s);
      if(A.rep) put(out,', represents '+SUCCEQ);
      else {
        i=A.mis[0]; j=A.mis[1];
        warn(out,', fails: '+(A.G[i][j]&&!A.G[j][i]?N[i]+' '+SUCC+' '+N[j]:A.G[i][j]?N[i]+' '+SIM+' '+N[j]:N[j]+' '+SUCC+' '+N[i])+' but u('+N[i]+') = '+A.u[i]+', u('+N[j]+') = '+A.u[j]);
      }
    }
    /* the Try it steps read each pair (xy = 1: x strictly preferred, 0: indifferent, -1: y), transitivity, strict cycles,
       the best elements and the scores, and can set any pair */
    api=NF.api({
      get:function(){
        var o={}, k;
        if(!A) A=analyse();
        for(k=0;k<6;k++) o[KEYS[k]]=P[k];
        o.trans=!A.viol; o.scyc=A.scyc; o.nbest=A.best.length; o.best=A.best.length?A.best.map(function(i){ return N[i]; }).join(''):'none';
        o.nind=A.nind; o.rep=A.rep; o.ux=A.u[0]; o.uy=A.u[1]; o.uz=A.u[2]; o.uw=A.u[3];
        return o;
      },
      set:function(st){
        var k;
        for(k=0;k<6;k++) if(KEYS[k] in st) P[k]=clamp(Math.round(+st[KEYS[k]]),-1,1);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Majority rule over three voters ---------- */
  NF.register('mi1-vote',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var LAB={voters:['Alice','Bob','Charlie'], may:['Intelligence','Looks','Wealth']}, L=['x','y','z'];
    var PRO0=['xyz','yxz','xzy'], CYC=['xyz','yzx','zxy'], pro=PRO0.slice(), mode='voters', W=520, H=300, el={}, T=null, tri=[], api;
    onClick(fig,'.nfig-reset',function(){ pro=PRO0.slice(); mode='voters'; update(); });
    onClick(fig,'.mi1-condorcet',function(){ pro=CYC.slice(); mode='voters'; update(); });
    onClick(fig,'.mi1-may',function(){ pro=CYC.slice(); mode='may'; update(); });
    function toTop(v,ch){ pro[v]=ch+pro[v].replace(ch,''); update(); }
    function votes(a,b){ var n=0, v; for(v=0;v<3;v++) if(pro[v].indexOf(a)<pro[v].indexOf(b)) n++; return n; }
    function tally(){
      var t={}, i, j, a, b, beats=[0,0,0], w='none', cyc, nl='';
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j){ a=L[i]; b=L[j]; t['v'+a+b]=votes(a,b); }
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j && t['v'+L[i]+L[j]]>=2) beats[i]++;
      for(i=0;i<3;i++) if(beats[i]===2) w=L[i];
      cyc=w==='none';
      for(i=0;i<3;i++) if(pro[0].charAt(2)!==L[i] && pro[1].charAt(2)!==L[i] && pro[2].charAt(2)!==L[i]) nl+=L[i];
      t.cycle=cyc; t.winner=w; t.notlast=nl||'none';
      return t;
    }
    function chip(g,v,r,x,y,w,h){
      var c=S('g',{'class':'mi1-vchip',transform:'translate('+R(x)+','+R(y)+')'},g);
      S('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:4,'class':'mi1-vbg'},c);
      var t=text(c,0,4.5,'','mi1-vtx','middle');
      clicker(c,'',function(){ var ch=pro[v].charAt(r); if(r>0) toTop(v,ch); });
      return {g:c, t:t};
    }
    function draw(){
      var side=W>=480, pw, cw, top=8, v, r, g, x, cx, cy, rr, i;
      W=measure(svg); side=W>=480;
      pw=side?Math.round(W*0.5):W; cw=Math.min(104,(pw-30)/3);
      H=side?208:372;
      frame(svg,W,H);
      g=S('g',null,svg);
      el.heads=[]; el.chips=[];
      for(r=0;r<3;r++) text(g,10,top+52+r*36+4,(r+1)+(r===0?'st':r===1?'nd':'rd'),'nf-title');
      for(v=0;v<3;v++){
        x=34+cw*(v+0.5);
        el.heads.push(text(g,x,top+18,'','nf-lab','middle'));
        el.chips.push([]);
        for(r=0;r<3;r++) el.chips[v].push(chip(g,v,r,x,top+52+r*36,Math.min(56,cw-12),27));
      }
      /* the majority relation as a triangle */
      if(side){ cx=pw+(W-pw)/2; cy=128; rr=Math.min(84,(W-pw)/2-34); }
      else { cx=W/2; cy=top+190+92; rr=84; }
      tri=[[cx,cy-rr],[cx+rr*0.87,cy+rr*0.5],[cx-rr*0.87,cy+rr*0.5]];
      g=S('g',null,svg);
      el.arr=[]; el.alab=[];
      for(i=0;i<3;i++){ el.arr.push(vec(g,'mi1-edge','mi1-head')); el.alab.push(text(g,0,0,'','nf-lab nf-halo','middle')); }
      el.tn=[];
      for(i=0;i<3;i++){
        g=S('g',{transform:'translate('+R(tri[i][0])+','+R(tri[i][1])+')'},svg);
        el.tn.push({c:S('circle',{r:15,'class':'mi1-node'},g), t:text(g,0,5,L[i],'mi1-nl','middle')});
      }
      el.ttl=text(svg,side?pw+10:10,side?18:top+170,'majority','nf-title');
      update();
    }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var v, r, i, j, k, a, b, pairs=[[0,1],[1,2],[2,0]], n, m, mx, my, ox, oy, len, s, p;
      T=tally();
      for(v=0;v<3;v++){
        el.heads[v].textContent=LAB[mode][v];
        for(r=0;r<3;r++){
          el.chips[v][r].t.textContent=pro[v].charAt(r);
          el.chips[v][r].g.setAttribute('aria-label',LAB[mode][v]+', rank '+(r+1)+': '+pro[v].charAt(r)+(r?'. Press to move it to the top.':''));
        }
      }
      for(k=0;k<3;k++){
        i=pairs[k][0]; j=pairs[k][1]; n=T['v'+L[i]+L[j]];
        if(n>=2){ a=i; b=j; } else { a=j; b=i; }
        m=Math.max(n,3-n);
        el.arr[k].l.setAttribute('class','mi1-edge'+(T.cycle?' mi1-bad':''));
        el.arr[k].h.setAttribute('class','mi1-head'+(T.cycle?' mi1-badh':''));
        setVec(el.arr[k],tri[a][0],tri[a][1],tri[b][0],tri[b][1],17,16,true);
        mx=(tri[i][0]+tri[j][0])/2; my=(tri[i][1]+tri[j][1])/2;
        ox=mx-(tri[0][0]+tri[1][0]+tri[2][0])/3; oy=my-(tri[0][1]+tri[1][1]+tri[2][1])/3; len=Math.hypot(ox,oy);
        moveTo(el.alab[k],mx+ox/len*17,my+oy/len*17+4);
        el.alab[k].textContent=m+':'+(3-m);
      }
      for(i=0;i<3;i++){
        el.tn[i].c.setAttribute('class','mi1-node'+(T.winner===L[i]?' mi1-best':''));
        el.tn[i].t.setAttribute('class','mi1-nl'+(T.winner===L[i]?' mi1-nlb':''));
      }
      if(!out) return;
      out.textContent='';
      s='x vs y '+T.vxy+':'+T.vyx+'   y vs z '+T.vyz+':'+T.vzy+'   z vs x '+T.vzx+':'+T.vxz+'\n';
      put(out,s);
      if(T.cycle){
        p=T.vxy>=2?['x','y','z']:['x','z','y'];
        warn(out,'a Condorcet cycle: '+p[0]+' '+SUCC+' '+p[1]+', '+p[1]+' '+SUCC+' '+p[2]+', '+p[2]+' '+SUCC+' '+p[0]+', so no alternative beats both others');
      } else {
        p=L.slice().sort(function(a,b){ return T['v'+b+a]-T['v'+a+b]; });
        put(out,'Condorcet winner '+T.winner+': majority ranks '+p.join(' '+SUCC+' '));
      }
      put(out,'\nnever ranked last: '+(T.notlast==='none'?'none, every alternative is somebody’s worst':T.notlast.split('').join(', ')));
    }
    function ok(s){ return typeof s==='string' && s.length===3 && s.indexOf('x')>=0 && s.indexOf('y')>=0 && s.indexOf('z')>=0; }
    /* the Try it steps read the three rankings (a, b, c), the labels (mode), the vote counts, whether the majority cycles,
       the Condorcet winner and the alternatives nobody ranks last; set takes the same keys or preset */
    api=NF.api({
      get:function(){
        var o={a:pro[0], b:pro[1], c:pro[2], mode:mode}, k;
        if(!T) T=tally();
        for(k in T) o[k]=T[k];
        return o;
      },
      set:function(st){
        if(st.preset==='condorcet'){ pro=CYC.slice(); mode='voters'; }
        else if(st.preset==='may'){ pro=CYC.slice(); mode='may'; }
        else if(st.preset==='reset'){ pro=PRO0.slice(); mode='voters'; }
        if(ok(st.a)) pro[0]=st.a;
        if(ok(st.b)) pro[1]=st.b;
        if(ok(st.c)) pro[2]=st.c;
        if(st.mode==='voters' || st.mode==='may') mode=st.mode;
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Ordinal utility: one indifference map, many labels ---------- */
  NF.register('mi1-ordinal',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var F={
      id:{f:function(t){ return t; }, n:'u', d:2},
      ln:{f:function(t){ return Math.log(t); }, n:'ln u', d:2},
      inv:{f:function(t){ return -1/t; }, n:MINUS+'1/u', d:2},
      floor:{f:function(t){ return Math.floor(t+1e-9); }, n:'⌊u⌋', d:0},
      neg:{f:function(t){ return -t; }, n:MINUS+'u', d:2}
    };
    var LV=[0.5,1,2,3,4,6,8], LAB=[1,2,4,8];
    var V=[[1,4],[3,1]], W=520, H=360, Q, el={}, hs=[], cur={}, api;
    var fk=NF.seg(fig,'data-f',function(v){ if(F[v]){ fk=v; update(); } });
    if(!F[fk]) fk='id';
    function u(p){ return Math.round(p[0]*p[1]*1e6)/1e6; }
    function v(p){ return F[fk].f(u(p)); }
    function curve(c){
      var pts=[], i, x1, a=c/4;
      for(i=0;i<=90;i++){ x1=a*Math.pow(4/a,i/90); pts.push([Q.sx(x1),Q.sy(c/x1)]); }
      return poly(pts);
    }
    function band(k){
      var top=[], bot=[], i, x1;
      for(i=0;i<=120;i++){ x1=0.001+4*i/120; top.push([Q.sx(x1),Q.sy(Math.min(4.2,(k+1)/x1))]); bot.push([Q.sx(x1),Q.sy(Math.min(4.2,k/x1))]); }
      return poly(top.concat(bot.reverse()))+'Z';
    }
    function draw(){
      var side, x0, i, g;
      W=measure(svg);
      side=Math.min(W-112,300); x0=Math.round((W-side-112)/2)+38;
      H=18+side+30; frame(svg,W,H);
      Q=plane(svg,x0,18,side,0,4,['a₁, b₁','a₂, b₂']);
      el.bands=S('g',null,Q.gc);
      el.lev=[]; el.lab=[];
      for(i=0;i<LV.length;i++) el.lev.push(S('path',{d:curve(LV[i]),'class':LAB.indexOf(LV[i])>=0?'mi1-lev mi1-levk':'mi1-lev'},Q.gc));
      for(i=0;i<LAB.length;i++) el.lab.push(text(svg,Q.x0+Q.side+5,Q.sy(LAB[i]/4)+4,'','mi1-llab'));
      el.better=vec(Q.gc,'mi1-better','mi1-betterh');
      el.btx=text(Q.gc,0,0,'better','nf-lab nf-halo','middle');
      /* the inset: the transformation f itself, top right where no curve runs */
      el.ins={x:Q.sx(2.78), y:Q.sy(3.95), w:Q.sx(3.95)-Q.sx(2.78), h:Q.sy(3.08)-Q.sy(3.95)};
      g=S('g',{'class':'mi1-inset'},svg);
      S('rect',{x:R(el.ins.x),y:R(el.ins.y),width:R(el.ins.w),height:R(el.ins.h),rx:3,'class':'mi1-insbg'},g);
      el.inl=S('path',{'class':'mi1-insline'},g);
      el.int=text(g,el.ins.x+5,el.ins.y+12,'','mi1-instx');
      el.seg=line(svg,0,0,0,0,'mi1-ab');
      el.mid=S('circle',{r:3.5,'class':'mi1-mid'},svg);
      el.midl=text(svg,0,0,'m','nf-lab nf-halo mi1-it');
      el.pl=[text(svg,0,0,'a','nf-vlab nf-c1'),text(svg,0,0,'b','nf-vlab nf-c2')];
      hs=[handle(svg,'nf-v1','Bundle a, arrow keys move it',keyer(0)),handle(svg,'nf-v2','Bundle b, arrow keys move it',keyer(1))];
      update();
    }
    function keyer(i){ return function(dx,dy,big){ var s=big?0.5:0.1; move(i,V[i][0]+dx*s,V[i][1]+dy*s); }; }
    function move(i,x,y){ V[i]=[clamp(Math.round(x*10)/10,0.1,4),clamp(Math.round(y*10)/10,0.1,4)]; update(); }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var f=F[fk], i, k, a=V[0], b=V[1], m=[(a[0]+b[0])/2,(a[1]+b[1])/2], ua=u(a), ub=u(b), va=v(a), vb=v(b), vm=v(m), avg=(va+vb)/2,
          pts=[], t, lo, hi, ys, s, neg=fk==='neg', same, tie, sg, P;
      while(el.bands.firstChild) el.bands.removeChild(el.bands.firstChild);
      if(fk==='floor') for(k=0;k<16;k+=2) S('path',{d:band(k),'class':'mi1-band'},el.bands);
      for(i=0;i<LAB.length;i++){ t=f.f(LAB[i]); el.lab[i].textContent=(f.d?fmt(t,2):tl(t)); }
      if(neg) setVec(el.better,Q.sx(0.95),Q.sy(0.95),Q.sx(0.45),Q.sy(0.45),0,0,true);
      else setVec(el.better,Q.sx(0.45),Q.sy(0.45),Q.sx(0.95),Q.sy(0.95),0,0,true);
      moveTo(el.btx,Q.sx(1.25),Q.sy(0.62)+4);
      /* f on [0.25, 16], scaled to the inset */
      lo=f.f(0.25); hi=f.f(16); if(lo>hi){ t=lo; lo=hi; hi=t; }
      ys=function(y){ return el.ins.y+el.ins.h-4-(y-lo)/(hi-lo||1)*(el.ins.h-18); };
      for(i=0;i<=160;i++){ t=0.25+15.75*i/160; pts.push([el.ins.x+5+(t-0.25)/15.75*(el.ins.w-10),ys(f.f(t))]); }
      el.inl.setAttribute('d',poly(pts));
      el.int.textContent='f(u) = '+f.n;
      setLine(el.seg,Q.sx(a[0]),Q.sy(a[1]),Q.sx(b[0]),Q.sy(b[1]));
      at(el.mid,Q.sx(m[0]),Q.sy(m[1]));
      moveTo(el.midl,Q.sx(m[0])+8,Q.sy(m[1])-6);
      for(i=0;i<2;i++){
        P=[Q.sx(V[i][0]),Q.sy(V[i][1])];
        place(hs[i],P[0],P[1],V[i][0],(i?'b':'a')+' = ('+fmt(V[i][0],1)+', '+fmt(V[i][1],1)+')');
        moveTo(el.pl[i],P[0]+(i?10:-10),P[1]-12);
        el.pl[i].setAttribute('text-anchor',i?'start':'end');
      }
      sg=function(d){ return Math.abs(d)<1e-9?0:(d>0?1:-1); };
      same=sg(ua-ub)===sg(va-vb); tie=Math.abs(va-vb)<1e-9;
      cur={f:fk, a1:a[0], a2:a[1], b1:b[0], b2:b[1], ua:ua, ub:ub, va:va, vb:vb, du:ua-ub, dv:va-vb, same:same, tie:tie, vm:vm, avg:avg,
        conc:vm>=avg-1e-9, mra:a[1]/a[0]};
      if(!out) return;
      out.textContent='';
      s='u(a) = '+fmt(ua,2)+', u(b) = '+fmt(ub,2)+'   v(a) = '+fmt(va,f.d)+', v(b) = '+fmt(vb,f.d)+': ';
      put(out,s);
      if(same) put(out,sg(ua-ub)===0?'a '+SIM+' b under both':(ua>ub?'a '+SUCC+' b':'b '+SUCC+' a')+' under both');
      else warn(out,tie?'tied under v, not under u: a different preference':'v reverses the ranking: a different preference');
      if(fk==='floor') put(out,'\nv is flat within each band, so every band is one thick indifference class');
      else put(out,'\nMRS at a = a₂/a₁ = '+fmt(a[1]/a[0],2)+(neg?', but the better direction is reversed':' under u and under v'));
      put(out,'\nmidpoint m: v(m) = '+fmt(vm,f.d)+' against the average '+fmt(avg,f.d+(f.d?0:1))+(cur.conc?', at least the average':', below the average'));
    }
    dragger(svg,function(){ return [W,H]; },function(){ return V.map(function(p){ return [Q.sx(p[0]),Q.sy(p[1])]; }); },
      function(i,x,y){ move(i,Q.sx.inv(x),Q.sy.inv(y)); },focusOf(function(){ return hs; }));
    /* the Try it steps read the transformation f, both bundles, u and v at each, whether the ranking survives (same),
       ties, and the midpoint test of concavity (vm against avg); set takes f and the coordinates */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('f' in st && F[st.f]) NF.press(fig,'data-f',String(st.f));
        if('a1' in st || 'a2' in st) move(0,'a1' in st?+st.a1:V[0][0],'a2' in st?+st.a2:V[0][1]);
        if('b1' in st || 'b2' in st) move(1,'b1' in st?+st.b1:V[1][0],'b2' in st?+st.b2:V[1][1]);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Lexicographic preferences against a weighted sum ---------- */
  NF.register('mi1-lex',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var V=[[2,0.5],[1,1.5]], eps=0.5, W=520, H=360, Q, el={}, hs=[], cur={}, api, strip={};
    var re=range(fig,'eps',2,function(x){ eps=x; update(); });
    if(re) eps=re.v();
    function lexc(x,y){ var d1=Math.round((x[0]-y[0])*1e6), d2=Math.round((x[1]-y[1])*1e6); return d1>0?1:d1<0?-1:(d2>0?1:d2<0?-1:0); }
    function ue(p){ return p[0]+eps*p[1]; }
    function draw(){
      var side, x0, sxp, g;
      W=measure(svg);
      side=Math.min(W-130,300); x0=Math.round((W-side-130)/2)+32;
      H=22+side+30; frame(svg,W,H);
      Q=plane(svg,x0,22,side,0,4,['x₁, y₁','x₂, y₂']);
      el.up=S('rect',{'class':'mi1-up'},Q.gc);
      el.wa=S('path',{'class':'mi1-wedge'},Q.gc);
      el.wb=S('path',{'class':'mi1-wedge'},Q.gc);
      el.open=line(Q.gc,0,0,0,0,'mi1-open');
      el.ray=line(Q.gc,0,0,0,0,'mi1-ray');
      el.ul=line(Q.gc,0,0,0,0,'mi1-uline');
      el.pl=[text(svg,0,0,'x','nf-vlab nf-c1'),text(svg,0,0,'y','nf-vlab nf-c2')];
      hs=[handle(svg,'nf-v1','Bundle x, arrow keys move it',keyer(0)),handle(svg,'nf-v2','Bundle y, arrow keys move it',keyer(1))];
      /* the strip: what u_eps gives each of the two vertical slices */
      sxp=Q.x0+Q.side+30;
      strip={x:sxp, top:Q.top, h:Q.side, c1:sxp+20, c2:sxp+52};
      g=S('g',null,svg);
      text(g,sxp+36,Q.top-8,'u slices','nf-title','middle');
      line(g,C(sxp),Q.top,C(sxp),Q.top+Q.side,'nf-ax');
      el.st=S('g',null,svg);
      el.ia=S('rect',{width:12,'class':'mi1-ia'},svg);
      el.ib=S('rect',{width:12,'class':'mi1-ib'},svg);
      el.ov=S('rect',{width:56,'class':'mi1-ov'},svg);
      el.ma=line(svg,0,0,0,0,'mi1-mark1');
      el.mb=line(svg,0,0,0,0,'mi1-mark2');
      text(svg,strip.c1,strip.top+strip.h+15,'x','nf-vlab nf-c1','middle');
      text(svg,strip.c2,strip.top+strip.h+15,'y','nf-vlab nf-c2','middle');
      update();
    }
    function keyer(i){ return function(dx,dy,big){ var s=big?0.5:0.1; move(i,V[i][0]+dx*s,V[i][1]+dy*s); }; }
    function move(i,x,y){ V[i]=[clamp(Math.round(x*10)/10,0,4),clamp(Math.round(y*10)/10,0,4)]; update(); }
    function update(){ paint(); if(api) api.changed(); }
    function paint(){
      var x=V[0], y=V[1], sx=Q.sx, sy=Q.sy, c=ue(y), sq=[[0,0],[4,0],[4,4],[0,4]], A, B, lx=lexc(x,y), ux=ue(x), uy=ue(y),
          ua=Math.round((ux-uy)*1e6), agree, U=4+4*eps, us, k, v, P, i, ov, lo, hi, s, d;
      el.up.setAttribute('x',R(sx(y[0]))); el.up.setAttribute('y',R(Q.top));
      el.up.setAttribute('width',R(Math.max(0,sx(4)-sx(y[0])))); el.up.setAttribute('height',R(Q.side));
      setLine(el.open,sx(y[0]),sy(0),sx(y[0]),sy(y[1]));
      setLine(el.ray,sx(y[0]),sy(y[1]),sx(y[0]),sy(4));
      setLine(el.ul,sx(c),sy(0),sx(c-eps*4.4),sy(4.4));
      /* where the two rankings of bundles against y disagree */
      A=cut(cut(sq,1,0,-y[0]),-1,-eps,c);
      B=cut(cut(sq,-1,0,y[0]),1,eps,-c);
      el.wa.setAttribute('d',A.length>2?poly(A.map(function(p){ return [sx(p[0]),sy(p[1])]; }))+'Z':'');
      el.wb.setAttribute('d',B.length>2?poly(B.map(function(p){ return [sx(p[0]),sy(p[1])]; }))+'Z':'');
      for(i=0;i<2;i++){
        P=[sx(V[i][0]),sy(V[i][1])];
        place(hs[i],P[0],P[1],V[i][0],(i?'y':'x')+' = ('+fmt(V[i][0],1)+', '+fmt(V[i][1],1)+')');
        moveTo(el.pl[i],P[0]+(i?10:-10),P[1]-11);
        el.pl[i].setAttribute('text-anchor',i?'start':'end');
      }
      /* the strip, from 0 to 4 + 4 eps */
      us=function(t){ return strip.top+strip.h-t/U*strip.h; };
      while(el.st.firstChild) el.st.removeChild(el.st.firstChild);
      for(k=0;k<=Math.floor(U);k++){ line(el.st,strip.x-3,C(us(k)),strip.x,C(us(k)),'nf-ax'); text(el.st,strip.x-6,us(k)+4,String(k),null,'end'); }
      el.ia.setAttribute('x',R(strip.c1-6)); el.ia.setAttribute('y',R(us(x[0]+4*eps))); el.ia.setAttribute('height',R(us(x[0])-us(x[0]+4*eps)));
      el.ib.setAttribute('x',R(strip.c2-6)); el.ib.setAttribute('y',R(us(y[0]+4*eps))); el.ib.setAttribute('height',R(us(y[0])-us(y[0]+4*eps)));
      lo=Math.max(x[0],y[0]); hi=Math.min(x[0],y[0])+4*eps; ov=hi>=lo-1e-9;
      el.ov.setAttribute('x',R(strip.c1-14));
      if(ov && Math.abs(x[0]-y[0])>1e-9){ el.ov.setAttribute('y',R(us(hi))); el.ov.setAttribute('height',R(Math.max(1,us(lo)-us(hi)))); }
      else el.ov.setAttribute('height',0);
      setLine(el.ma,strip.c1-9,us(ux),strip.c1+9,us(ux));
      setLine(el.mb,strip.c2-9,us(uy),strip.c2+9,us(uy));
      agree=(ua>0?1:ua<0?-1:0)===lx;
      cur={x1:x[0], x2:x[1], y1:y[0], y2:y[1], eps:eps, lex:lx, ux:ux, uy:uy, agree:agree, overlap:ov && Math.abs(x[0]-y[0])>1e-9, same1:Math.abs(x[0]-y[0])<1e-9};
      if(!out) return;
      out.textContent='';
      d=Math.abs(x[0]-y[0])>1e-9;
      s='lexicographic: '+(lx>0?'x '+SUCC+' y':lx<0?'y '+SUCC+' x':'x = y')+(d?(lx>0?' (x₁ > y₁)':' (x₁ < y₁)'):(lx?' (x₁ = y₁, '+(lx>0?'x₂ > y₂)':'x₂ < y₂)'):''));
      put(out,s+'\nu(x) = x₁ + εx₂ = '+fmt(ux,2)+', u(y) = '+fmt(uy,2)+': ');
      if(agree) put(out,'u agrees');
      else warn(out,'u says '+(ua>0?'x '+SUCC+' y':ua<0?'y '+SUCC+' x':'x '+SIM+' y')+', wrong');
      put(out,'\nslices x₁ = '+fmt(x[0],1)+' and y₁ = '+fmt(y[0],1)+' get ['+fmt(x[0],2)+', '+fmt(x[0]+4*eps,2)+'] and ['+fmt(y[0],2)+', '+fmt(y[0]+4*eps,2)+']');
      if(!d) put(out,', the same slice');
      else if(cur.overlap) warn(out,', overlapping');
      else put(out,', disjoint');
    }
    dragger(svg,function(){ return [W,H]; },function(){ return V.map(function(p){ return [Q.sx(p[0]),Q.sy(p[1])]; }); },
      function(i,x,y){ move(i,Q.sx.inv(x),Q.sy.inv(y)); },focusOf(function(){ return hs; }));
    /* the Try it steps read both bundles, eps, the lexicographic verdict (lex = 1: x strictly better, 0 equal, -1 worse),
       u at each, whether u agrees, and whether the two slices' intervals overlap; set takes the coordinates and eps */
    api=NF.api({
      get:function(){ var o={}, k; for(k in cur) o[k]=cur[k]; return o; },
      set:function(st){
        if('eps' in st && re) re.set(+st.eps);
        if('x1' in st || 'x2' in st) move(0,'x1' in st?+st.x1:V[0][0],'x2' in st?+st.x2:V[0][1]);
        if('y1' in st || 'y2' in st) move(1,'y1' in st?+st.y1:V[1][0],'y2' in st?+st.y2:V[1][1]);
        update();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. WARP on the menus of {x, y, z} ---------- */
  NF.register('mi1-warp',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var L=['x','y','z'], M=[{k:'xy',s:[0,1]},{k:'yz',s:[1,2]},{k:'xz',s:[0,2]},{k:'xyz',s:[0,1,2]}];
    var PRE={
      all:{o:[1,1,1,1], c:['x','y','x','x']},
      c1:{o:[1,0,0,1], c:['x','y','x','x']},
      c2:{o:[1,0,0,1], c:['x','y','x','xy']},
      s35:{o:[1,1,1,0], c:['x','y','z','x']}
    };
    var obs, ch, W=520, H=330, el={}, cards=[], tri=[], A=null, tried={}, msg='', api;
    /* every weak order on {x, y, z}, as utility vectors with values 0, 1, 2 */
    var ORD=(function(){
      var seen={}, list=[], a, b, c, u, key, i, j;
      for(a=0;a<3;a++) for(b=0;b<3;b++) for(c=0;c<3;c++){
        u=[a,b,c]; key='';
        for(i=0;i<3;i++) for(j=0;j<3;j++) key+=u[i]>=u[j]?'1':'0';
        if(!seen[key]){ seen[key]=1; list.push(u); }
      }
      return list;
    })();
    function preset(p){ obs=PRE[p].o.slice(); ch=PRE[p].c.map(function(s){ return s.split('').map(function(t){ return L.indexOf(t); }); }); }
    preset('all');
    onClick(fig,'.nfig-reset',function(){ preset('all'); msg=''; update(); });
    onClick(fig,'.mi1-c1',function(){ preset('c1'); msg=''; update(); });
    onClick(fig,'.mi1-c2',function(){ preset('c2'); msg=''; update(); });
    onClick(fig,'.mi1-s35',function(){ preset('s35'); msg=''; update(); });
    function cs(m){ return ch[m].slice().sort().map(function(i){ return L[i]; }).join(''); }
    function name(u){
      var idx=[0,1,2].sort(function(a,b){ return u[b]-u[a] || a-b; }), s=L[idx[0]], i;
      for(i=1;i<3;i++) s+=(u[idx[i]]===u[idx[i-1]]?' '+SIM+' ':' '+SUCC+' ')+L[idx[i]];
      return s;
    }
    function analyse(){
      var ge=[], gt=[], src=[], i, j, m, k, c, viol=null, rat=[], ok, best, mx, nv=0, cyc;
      for(i=0;i<3;i++){ ge.push([false,false,false]); gt.push([false,false,false]); src.push([null,null,null]); }
      for(m=0;m<4;m++){
        if(!obs[m]) continue;
        for(k=0;k<ch[m].length;k++){
          i=ch[m][k];
          for(j=0;j<M[m].s.length;j++){
            c=M[m].s[j]; if(c===i) continue;
            if(!ge[i][c]){ ge[i][c]=true; }
            if(ch[m].indexOf(c)<0){ gt[i][c]=true; src[i][c]=m; }
          }
        }
      }
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j && ge[i][j] && gt[j][i]){ nv++; if(!viol) viol=[i,j]; }
      for(k=0;k<ORD.length;k++){
        ok=true;
        for(m=0;m<4 && ok;m++){
          if(!obs[m]) continue;
          mx=-1; for(j=0;j<M[m].s.length;j++) mx=Math.max(mx,ORD[k][M[m].s[j]]);
          best=M[m].s.filter(function(t){ return ORD[k][t]===mx; });
          if(best.length!==ch[m].length || best.some(function(t){ return ch[m].indexOf(t)<0; })) ok=false;
        }
        if(ok) rat.push(name(ORD[k]));
      }
      cyc=obs[0]&&obs[1]&&obs[2]&&((cs(0)==='x'&&cs(1)==='y'&&cs(2)==='z')||(cs(0)==='y'&&cs(1)==='z'&&cs(2)==='x'));
      return {ge:ge, gt:gt, src:src, viol:viol, nv:nv, rat:rat, cyc:cyc};
    }
    function toggleObs(m){ obs[m]=obs[m]?0:1; msg=''; update(); }
    function toggleCh(m,i){
      var p=ch[m].indexOf(i);
      if(!obs[m]){ msg='tick the menu first: only observed menus have a choice'; update(); return; }
      if(p>=0){ if(ch[m].length===1){ msg='C(B) cannot be empty: something must be chosen from every observed menu'; update(); return; } ch[m].splice(p,1); }
      else ch[m].push(i);
      msg=''; update();
    }
    function draw(){
      var row=W>=500, cw, chh=74, gap=8, m, x, y, g, cg, i, n, hdr, tri0, cx, cy, rr, tw, ty;
      W=measure(svg); row=W>=500;
      cw=row?(W-3*gap)/4:(W-gap)/2;
      ty=row?chh+16:2*chh+gap+16;
      H=ty+190; frame(svg,W,H);
      cards=[];
      for(m=0;m<4;m++){
        x=row?m*(cw+gap):(m%2)*(cw+gap); y=row?0:Math.floor(m/2)*(chh+gap);
        g=S('g',{transform:'translate('+R(x)+','+R(y)+')'},svg);
        cg={g:g, chips:[]};
        cg.bg=S('rect',{x:0.5,y:0.5,width:R(cw-1),height:chh-1,rx:4,'class':'mi1-card'},g);
        hdr=S('g',{'class':'mi1-obs'},g);
        S('rect',{x:1,y:1,width:R(cw-2),height:24,'class':'nf-hit'},hdr);
        cg.box=S('rect',{x:9,y:7,width:12,height:12,rx:2,'class':'mi1-box'},hdr);
        cg.tick=S('path',{d:'M11.5,13l2.5,2.6l4.6,-5.6','class':'mi1-tick'},hdr);
        text(hdr,28,17.5,'{'+M[m].s.map(function(t){ return L[t]; }).join(', ')+'}','nf-lab');
        clicker(hdr,'',(function(mm){ return function(){ toggleObs(mm); }; })(m));
        hdr.setAttribute('role','checkbox');
        cg.hdr=hdr;
        n=M[m].s.length;
        for(i=0;i<n;i++){
          var c=S('g',{'class':'mi1-chip',transform:'translate('+R(cw/2+(i-(n-1)/2)*36)+','+(chh-26)+')'},g);
          S('circle',{r:13,'class':'mi1-cbg'},c);
          var t=text(c,0,4.5,L[M[m].s[i]],'mi1-ctx','middle');
          clicker(c,'',(function(mm,ii){ return function(){ toggleCh(mm,ii); }; })(m,M[m].s[i]));
          c.setAttribute('role','checkbox');
          cg.chips.push({g:c, i:M[m].s[i], t:t});
        }
        cards.push(cg);
      }
      /* the revealed relation on a triangle, and the preferences that fit */
      tw=Math.min(200,W*0.48); cx=tw/2+4; cy=ty+104; rr=Math.min(72,tw/2-22);
      tri=[[cx,cy-rr],[cx+rr*0.87,cy+rr*0.5],[cx-rr*0.87,cy+rr*0.5]];
      text(svg,4,ty+6,'revealed','nf-title');
      g=S('g',null,svg);
      el.ed=[]; el.el=[];
      for(i=0;i<3;i++){ el.ed.push(vec(g,'mi1-edge','mi1-head')); el.el.push(text(g,0,0,'','nf-lab nf-halo','middle')); }
      for(i=0;i<3;i++){
        g=S('g',{transform:'translate('+R(tri[i][0])+','+R(tri[i][1])+')'},svg);
        S('circle',{r:14,'class':'mi1-node'},g); text(g,0,5,L[i],'mi1-nl','middle');
      }
      el.vx=tw+16;
      el.vt=text(svg,el.vx,ty+6,'','nf-title');
      el.vl=[];
      for(i=0;i<5;i++) el.vl.push(text(svg,el.vx,ty+34+i*20,'','mi1-vline'));
      el.ty=ty;
      update();
    }
    function update(){
      var c, t;
      A=analyse();
      if(A.cyc && obs[3] && ch[3].length===1){ c=L[ch[3][0]]; if(A.viol) tried[c]=1; }
      if(!A.cyc) tried={};
      paint();
      if(api) api.changed();
    }
    function paint(){
      var m, i, j, k, on, P=[[0,1],[1,2],[0,2]], a, b, ge=A.ge, gt=A.gt, vio, mx, my, ox, oy, len, s, list, n, cxm=(tri[0][0]+tri[1][0]+tri[2][0])/3, cym=(tri[0][1]+tri[1][1]+tri[2][1])/3;
      for(m=0;m<4;m++){
        cards[m].bg.setAttribute('class','mi1-card'+(obs[m]?'':' is-off'));
        cards[m].tick.setAttribute('visibility',obs[m]?'visible':'hidden');
        cards[m].hdr.setAttribute('aria-checked',obs[m]?'true':'false');
        cards[m].hdr.setAttribute('aria-label','Menu {'+M[m].s.map(function(t){ return L[t]; }).join(', ')+'} observed');
        for(k=0;k<cards[m].chips.length;k++){
          i=cards[m].chips[k].i; on=ch[m].indexOf(i)>=0;
          cards[m].chips[k].g.setAttribute('class','mi1-chip'+(on?' is-on':'')+(obs[m]?'':' is-off'));
          cards[m].chips[k].g.setAttribute('aria-checked',on?'true':'false');
          cards[m].chips[k].g.setAttribute('aria-label',L[i]+' chosen from {'+M[m].s.map(function(t){ return L[t]; }).join(', ')+'}');
        }
      }
      for(k=0;k<3;k++){
        i=P[k][0]; j=P[k][1];
        mx=(tri[i][0]+tri[j][0])/2; my=(tri[i][1]+tri[j][1])/2; ox=mx-cxm; oy=my-cym; len=Math.hypot(ox,oy);
        moveTo(el.el[k],mx+ox/len*16,my+oy/len*16+4);
        vio=(ge[i][j]&&gt[j][i])||(ge[j][i]&&gt[i][j]);
        el.ed[k].l.setAttribute('class','mi1-edge'+(vio?' mi1-bad':'')+(!ge[i][j]&&!ge[j][i]?' mi1-none':(!gt[i][j]&&!gt[j][i]?' mi1-ind':'')));
        el.ed[k].h.setAttribute('class','mi1-head'+(vio?' mi1-badh':''));
        el.el[k].setAttribute('class','nf-lab nf-halo'+(vio?' mi1-warnt':''));
        if(vio){ twoHeads(el.ed[k],tri[i][0],tri[i][1],tri[j][0],tri[j][1],16); el.el[k].textContent='both ways'; }
        else if(gt[i][j] || gt[j][i]){ a=gt[i][j]?i:j; b=gt[i][j]?j:i; setVec(el.ed[k],tri[a][0],tri[a][1],tri[b][0],tri[b][1],16,15,true); el.el[k].textContent=L[a]+' '+SUCC+'* '+L[b]; }
        else if(ge[i][j]){ setVec(el.ed[k],tri[i][0],tri[i][1],tri[j][0],tri[j][1],16,15,false); el.el[k].textContent=L[i]+' '+SIM+'* '+L[j]; }
        else { setVec(el.ed[k],tri[i][0],tri[i][1],tri[j][0],tri[j][1],16,15,false); el.el[k].textContent='no data'; }
      }
      el.vt.textContent=A.viol?'WARP fails':'WARP holds';
      el.vt.setAttribute('class',A.viol?'nf-title mi1-warnt':'nf-title');
      list=A.rat; n=list.length;
      for(i=0;i<5;i++) el.vl[i].textContent='';
      el.vl[0].textContent=n===0?'no rational preference fits':n===1?'fitted by one preference:':'fitted by '+n+' preferences:';
      el.vl[0].setAttribute('class',n===0?'mi1-vline mi1-warnt':'mi1-vline');
      for(i=0;i<Math.min(n,n>4?3:4);i++) el.vl[i+1].textContent=list[i];
      if(n>4) el.vl[4].textContent='and '+(n-3)+' more';
      if(!out) return;
      out.textContent='';
      s=[];
      for(i=0;i<3;i++) for(j=0;j<3;j++) if(i!==j && gt[i][j]) s.push(L[i]+' '+SUCC+'* '+L[j]);
      for(k=0;k<3;k++){ i=P[k][0]; j=P[k][1]; if(ge[i][j] && ge[j][i] && !gt[i][j] && !gt[j][i]) s.push(L[i]+' '+SIM+'* '+L[j]); }
      put(out,'revealed: '+(s.length?s.join(', '):'nothing yet')+'\n');
      if(A.viol){
        i=A.viol[0]; j=A.viol[1];
        warn(out,'WARP fails: '+L[i]+' '+SUCCEQ+'* '+L[j]+', yet '+L[j]+' '+SUCC+'* '+L[i]+' from {'+M[A.src[j][i]].s.map(function(t){ return L[t]; }).join(', ')+'}');
      } else put(out,'WARP holds: no pair is revealed both ways'+(A.cyc?', though the choices cycle':''));
      put(out,'\n');
      if(n===0) warn(out,'no rational preference rationalises these choices');
      else put(out,n===1?'rationalised by '+list[0]+' and by no other preference':'rationalised by '+n+' preferences, so the data do not pin one down');
      if(msg){ put(out,'\n'); warn(out,msg); }
    }
    /* the Try it steps read which menus are observed (oxy ... oxyz), the choices (cxy ... cxyz, letters in order),
       WARP, the number of rational preferences that fit (nrat), and tried: how many of x, y, z have been chosen alone
       from {x, y, z} while the pairs cycle. set takes the same keys, preset, and tour=1, which chooses x, y, z in turn */
    api=NF.api({
      get:function(){
        var o={}, m;
        if(!A) A=analyse();
        for(m=0;m<4;m++){ o['o'+M[m].k]=obs[m]; o['c'+M[m].k]=cs(m); }
        o.nobs=obs[0]+obs[1]+obs[2]+obs[3]; o.full=o.nobs===4; o.warp=!A.viol; o.nviol=A.nv; o.nrat=A.rat.length;
        o.rat=A.rat.length===1?A.rat[0]:'none'; o.tried=Object.keys(tried).length; o.cyc=A.cyc;
        return o;
      },
      set:function(st){
        var m, s, k, v;
        if(st.preset && PRE[st.preset]) preset(st.preset);
        for(m=0;m<4;m++){
          k=M[m].k;
          if(('o'+k) in st) obs[m]=+st['o'+k]?1:0;
          if(('c'+k) in st){
            s=String(st['c'+k]).split('').map(function(t){ return L.indexOf(t); }).filter(function(t,i,a){ return t>=0 && M[m].s.indexOf(t)>=0 && a.indexOf(t)===i; });
            if(s.length) ch[m]=s;
          }
        }
        msg='';
        update();
        if(+st.tour===1){ for(v=0;v<3;v++){ ch[3]=[v]; obs[3]=1; update(); } }
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* figures already on the page when this file loads (a standalone widget page) start now */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
