/* L4 figures: projection geometry, collinearity, the sampling distribution of the slope, Gauss Markov, degrees of freedom.
   Each registers with NF (assets/notes.js) and reuses its helpers. No third party code. */
(function(){
  'use strict';
  var NF=window.NF;
  if(!NF) return;
  var S=NF.S, R=NF.R, C=NF.C, clamp=NF.clamp, text=NF.text, line=NF.line, setLine=NF.setLine, at=NF.at, poly=NF.poly,
      fmt=NF.fmt, tl=NF.tl, lin=NF.lin, measure=NF.measure, frame=NF.frame, watch=NF.watch, yGrid=NF.yGrid, xGrid=NF.xGrid,
      seg=NF.seg, range=NF.range, phi=NF.phi, mulberry32=NF.mulberry32, key=NF.key, clip=NF.clip, local=NF.local, capture=NF.capture;

  /* ---------- shared ---------- */
  function gauss(rnd){ var a=1-rnd(), b=rnd(); return Math.sqrt(-2*Math.log(a))*Math.cos(6.283185307179586*b); }
  function dot3(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function sub3(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  /* text with a subscript, as in the determinant figure */
  function sublab(g,base,sub,cls){
    var t=S('text',{'class':cls||'nf-lab'},g), s;
    t.appendChild(document.createTextNode(base));
    s=S('tspan',{dy:'3','class':'nf-sub'},t); s.textContent=sub;
    return t;
  }
  /* parts alternate base text and subscript: ['β̂','1','X','1'] */
  function rich(g,parts,cls){
    var t=S('text',{'class':cls||'nf-lab'},g), i, s, low=false;
    for(i=0;i<parts.length;i++){
      s=S('tspan',null,t);
      if(i%2){ s.setAttribute('class','nf-sub'); s.setAttribute('dy','3'); low=true; }
      else if(low){ s.setAttribute('dy','-3'); low=false; }
      s.textContent=parts[i];
    }
    return t;
  }
  function place(t,x,y,anchor){ t.setAttribute('x',R(x)); t.setAttribute('y',R(y)); t.setAttribute('text-anchor',anchor||'start'); }
  /* arrow from p0 to p1 in screen coordinates; the head ends gap px short of p1 */
  function arrow(g,cls){ return {l:line(g,0,0,0,0,cls), h:S('path',{'class':cls+' l4-head'},g)}; }
  function setArrow(a,p0,p1,gap){
    var dx=p1[0]-p0[0], dy=p1[1]-p0[1], len=Math.hypot(dx,dy), ux, uy, hl, tx, ty, bx, by;
    if(len<8){ setLine(a.l,p0[0],p0[1],p0[0],p0[1]); a.h.setAttribute('d',''); return; }
    ux=dx/len; uy=dy/len; gap=gap||0; hl=Math.min(9,len*0.4);
    tx=p1[0]-ux*gap; ty=p1[1]-uy*gap; bx=tx-ux*hl; by=ty-uy*hl;
    setLine(a.l,p0[0],p0[1],bx+ux*1.5,by+uy*1.5);
    a.h.setAttribute('d',poly([[tx,ty],[bx-uy*4,by+ux*4],[bx+uy*4,by-ux*4]])+'Z');
  }
  /* density histogram of vals[0..n-1] on nb bins of width bw from lo */
  function density(vals,n,lo,bw,nb){
    var c=new Float64Array(nb), i, k;
    for(i=0;i<n;i++){ k=Math.floor((vals[i]-lo)/bw); if(k>=0 && k<nb) c[k]++; }
    for(k=0;k<nb;k++) c[k]/=n*bw;
    return c;
  }
  /* filled area and step outline of a density histogram; the outline skips empty bins so it never runs along the axis */
  function histPaths(c,lo,bw,xs,ys,cap){
    var nb=c.length, y0=ys(0), tp=[], edge='', run=null, k, d, x0, x1;
    for(k=0;k<nb;k++){
      d=Math.min(c[k],cap); x0=xs(lo+k*bw); x1=xs(lo+(k+1)*bw);
      tp.push([x0,ys(d)],[x1,ys(d)]);
      if(c[k]>0){ if(!run) run=[[x0,y0]]; run.push([x0,ys(d)],[x1,ys(d)]); }
      if(run && (c[k]===0 || k===nb-1)){ run.push([run[run.length-1][0],y0]); edge+=poly(run); run=null; }
    }
    return {area:poly([[xs(lo),y0]].concat(tp,[[xs(lo+nb*bw),y0]]))+'Z', edge:edge};
  }
  function meanSd(v,n){
    var m=0, s=0, i, d;
    for(i=0;i<n;i++) m+=v[i];
    m/=n;
    for(i=0;i<n;i++){ d=v[i]-m; s+=d*d; }
    return [m,Math.sqrt(s/(n-1))];
  }
  function warn(out,s){ var sp=document.createElement('span'); sp.className='nf-warn'; sp.textContent=s; out.appendChild(sp); }

  /* ---------- 1. Projection of y onto col(X), N = 3, K = 2 ---------- */
  NF.register('l4-proj',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var X1=[2.6,0.5,0], X2=[0.6,2.4,0], Y=[1.7,1.5,2];
    function comb(s,t){ return [s*X1[0]+t*X2[0],s*X1[1]+t*X2[1],s*X1[2]+t*X2[2]]; }
    /* OLS by the normal equations X'X b = X'y, solved as a 2 by 2 system */
    var g11=dot3(X1,X1), g12=dot3(X1,X2), g22=dot3(X2,X2), r1=dot3(X1,Y), r2=dot3(X2,Y), dt=g11*g22-g12*g12;
    var BH=[(g22*r1-g12*r2)/dt,(g11*r2-g12*r1)/dt], YH=comb(BH[0],BH[1]), U=sub3(Y,YH);
    var LO=-0.2, HI=1.3, B0=[1,0.9], b=B0.slice(), snapped=false, api=null;
    var az=322, ev=26, EVLO=12, EVHI=40, W=520, H=340, u=48, cx=260, cy=170, E={}, drag=null;
    var C0=comb((LO+HI)/2,(LO+HI)/2);
    C0[2]=0.8;
    var EXT=extent();
    var rt=range(fig,'turn',0,function(v){ az=v; update(); });
    if(rt) az=rt.v();
    var bb=fig.querySelector('.nfig-snap');
    if(bb) bb.addEventListener('click',function(){ b=BH.slice(); snapped=true; update(); });
    var rb=fig.querySelector('.nfig-reset');
    if(rb) rb.addEventListener('click',function(){ b=B0.slice(); snapped=false; ev=26; setTurn(322); });
    function setTurn(v){
      v=((Math.round(v)%360)+360)%360;
      if(rt){ rt.el.value=v; rt.el.dispatchEvent(new Event('input',{bubbles:true})); } else { az=v; update(); }
    }
    function proj(q){
      var a=az*Math.PI/180, e=ev*Math.PI/180, x=q[0]-C0[0], y=q[1]-C0[1], z=q[2]-C0[2];
      var xr=x*Math.cos(a)-y*Math.sin(a), yr=x*Math.sin(a)+y*Math.cos(a);
      return [cx+u*xr, cy-u*(z*Math.cos(e)+yr*Math.sin(e))];
    }
    /* screen extent, in units of u, over every view the slider and the tilt allow, so turning never leaves the frame */
    function extent(){
      var pts=[comb(LO,LO),comb(HI,LO),comb(HI,HI),comb(LO,HI),Y,[0,0,0]], a, e, k, x, y, z, xr, yr, s, r=[1e9,-1e9,1e9,-1e9];
      for(a=0;a<360;a+=3) for(e=EVLO;e<=EVHI+1e-9;e+=(EVHI-EVLO)/8) for(k=0;k<pts.length;k++){
        x=pts[k][0]-C0[0]; y=pts[k][1]-C0[1]; z=pts[k][2]-C0[2];
        xr=x*Math.cos(a*Math.PI/180)-y*Math.sin(a*Math.PI/180); yr=x*Math.sin(a*Math.PI/180)+y*Math.cos(a*Math.PI/180);
        s=z*Math.cos(e*Math.PI/180)+yr*Math.sin(e*Math.PI/180);
        r[0]=Math.min(r[0],xr); r[1]=Math.max(r[1],xr); r[2]=Math.min(r[2],s); r[3]=Math.max(r[3],s);
      }
      return r;
    }
    function draw(){
      var g, k, padX=30, padT=24, padB=14, hmax;
      W=measure(svg); hmax=clamp(Math.round(W*0.75),260,440);
      u=Math.min((W-2*padX)/(EXT[1]-EXT[0]),(hmax-padT-padB)/(EXT[3]-EXT[2]));
      H=Math.ceil(u*(EXT[3]-EXT[2])+padT+padB); frame(svg,W,H);
      cx=W/2-u*(EXT[0]+EXT[1])/2; cy=padT+u*EXT[3];
      g=S('g',null,svg);
      E.plane=S('path',{'class':'l4-plane'},g);
      E.grid=[];
      for(k=0;k<6;k++) E.grid.push(line(g,0,0,0,0,'l4-pgrid'));
      E.col=text(g,0,0,'col(X)','l4-tg');
      E.d1=line(g,0,0,0,0,'l4-dot'); E.d2=line(g,0,0,0,0,'l4-dot');
      E.c1=rich(g,[fmt(BH[0],2)+' X','1'],'l4-tf');
      E.c2=rich(g,[fmt(BH[1],2)+' X','2'],'l4-tf');
      E.x1=arrow(g,'l4-xv'); E.x2=arrow(g,'l4-xv');
      E.lx1=sublab(g,'X','1','nf-vlab l4-ti'); E.lx2=sublab(g,'X','2','nf-vlab l4-ti');
      E.ra=S('path',{'class':'l4-ra'},g);
      E.c3=line(g,0,0,0,0,'l4-cand'); E.c4=line(g,0,0,0,0,'l4-cand2');
      E.yh=arrow(g,'l4-yh'); E.uh=arrow(g,'l4-uh'); E.y=arrow(g,'l4-y');
      E.lyh=text(g,0,0,'ŷ = Py','l4-tb'); E.luh=text(g,0,0,'û = My','l4-tr'); E.ly=text(g,0,0,'y','nf-vlab l4-ti');
      E.lxb=text(g,0,0,'Xb','l4-tf');
      S('circle',{cx:0,cy:0,r:2.5,'class':'l4-origin'},g);
      E.o=g.lastChild;
      E.h=S('g',{'class':'nf-handle',tabindex:'0',role:'slider','aria-roledescription':'draggable point',
        'aria-label':'Candidate point Xb in the plane col(X). Arrow keys move it.','aria-valuemin':LO,'aria-valuemax':HI},svg);
      S('circle',{r:18,'class':'nf-hit'},E.h);
      S('circle',{r:11,'class':'nf-ring'},E.h);
      S('circle',{r:5.5,'class':'nf-knob nf-v1'},E.h);
      E.h.addEventListener('keydown',function(e){
        var k=e.key, s=b[0], t=b[1];
        if(k==='ArrowRight') s+=0.05; else if(k==='ArrowLeft') s-=0.05;
        else if(k==='ArrowUp') t+=0.05; else if(k==='ArrowDown') t-=0.05;
        else return;
        e.preventDefault(); setB(s,t,true);
      });
      update();
    }
    function setB(s,t,round){
      if(round){ s=Math.round(s*100)/100; t=Math.round(t*100)/100; }
      b=[clamp(s,LO,HI),clamp(t,LO,HI)];
      snapped=Math.abs(b[0]-BH[0])<0.026 && Math.abs(b[1]-BH[1])<0.026;
      if(snapped) b=BH.slice();
      update();
    }
    function update(){
      var o=proj([0,0,0]), k, a, q1, q2, a1, a2, ph=proj(YH), py=proj(Y), XB=comb(b[0],b[1]), pb=proj(XB), dir, L, n, sq, s, mid, d, gg, uu, yy, hh, xu;
      E.plane.setAttribute('d',poly([proj(comb(LO,LO)),proj(comb(HI,LO)),proj(comb(HI,HI)),proj(comb(LO,HI))])+'Z');
      for(k=0;k<3;k++){
        a=k*0.5;
        q1=proj(comb(a,LO)); q2=proj(comb(a,HI)); setLine(E.grid[k],q1[0],q1[1],q2[0],q2[1]);
        q1=proj(comb(LO,a)); q2=proj(comb(HI,a)); setLine(E.grid[k+3],q1[0],q1[1],q2[0],q2[1]);
      }
      q1=proj(comb(HI-0.08,HI-0.02)); place(E.col,q1[0],q1[1],'middle');
      /* the parallelogram that splits y hat into its two components */
      q1=proj(comb(BH[0],0)); q2=proj(comb(0,BH[1]));
      setLine(E.d1,ph[0],ph[1],q1[0],q1[1]); setLine(E.d2,ph[0],ph[1],q2[0],q2[1]);
      /* labels on an axis sit on the side of it away from the other axis, outside the parallelogram */
      a1=proj(X1); a2=proj(X2);
      side(E.c1,q1,o,a1,a2,12); side(E.c2,q2,o,a2,a1,12);
      setArrow(E.x1,o,a1); setArrow(E.x2,o,a2);
      side(E.lx1,proj(comb(0.97,0)),o,a1,a2,10); side(E.lx2,proj(comb(0,0.97)),o,a2,a1,10);
      /* right angle mark at y hat, between u hat and the plane direction towards Xb (or towards 0) */
      dir=sub3(XB,YH); L=Math.hypot(dir[0],dir[1]);
      if(L<0.3){ dir=[-YH[0],-YH[1],0]; L=Math.hypot(dir[0],dir[1]); }
      s=0.2; n=[dir[0]/L*s,dir[1]/L*s,0];
      sq=[proj([YH[0]+n[0],YH[1]+n[1],0]),proj([YH[0]+n[0],YH[1]+n[1],s]),proj([YH[0],YH[1],s])];
      E.ra.setAttribute('d','M'+R(sq[0][0])+','+R(sq[0][1])+'L'+R(sq[1][0])+','+R(sq[1][1])+'L'+R(sq[2][0])+','+R(sq[2][1]));
      setLine(E.c3,ph[0],ph[1],pb[0],pb[1]); setLine(E.c4,py[0],py[1],pb[0],pb[1]);
      E.c3.setAttribute('class',snapped?'l4-cand nf-hide':'l4-cand');
      E.c4.setAttribute('class',snapped?'l4-cand2 nf-hide':'l4-cand2');
      setArrow(E.yh,o,ph,snapped?7:0); setArrow(E.uh,ph,py); setArrow(E.y,o,py);
      tipLabel(E.ly,o,py,9);
      /* ŷ label just below its tip, on the origin side */
      d=[ph[0]-o[0],ph[1]-o[1]];
      place(E.lyh,ph[0]+(d[0]>=0?-8:8),ph[1]+17,d[0]>=0?'end':'start');
      /* û label: left or right of the pole, low or high, wherever it is furthest from the other marks */
      s=[pb,ph,mark(E.c1),mark(E.c2),mark(E.lx1),mark(E.lx2),mark(E.lyh)];
      [[py,pb],[o,py],[o,ph],[o,a1],[o,a2]].forEach(function(sgm){ for(var j=0;j<=8;j++) s.push([sgm[0][0]+(sgm[1][0]-sgm[0][0])*j/8,sgm[0][1]+(sgm[1][1]-sgm[0][1])*j/8]); });
      gg=-1;
      [0.35,0.6].forEach(function(fr){ [1,-1].forEach(function(sg){
        var m=[ph[0]+(py[0]-ph[0])*fr,ph[1]+(py[1]-ph[1])*fr], sc=Math.min(crowd([m[0]+sg*10,m[1]],s),crowd([m[0]+sg*36,m[1]],s),crowd([m[0]+sg*62,m[1]],s));
        if(sc>gg+3){ gg=sc; mid=m; k=sg; }
      }); });
      place(E.luh,mid[0]+k*8,mid[1]+4,k>0?'start':'end');
      place(E.lxb,pb[0]+(pb[0]>=ph[0]?11:-11),pb[1]-10,pb[0]>=ph[0]?'start':'end');
      E.lxb.setAttribute('class',snapped?'l4-tf nf-hide':'l4-tf');
      at(E.o,o[0],o[1]);
      E.h.setAttribute('transform','translate('+R(pb[0])+','+R(pb[1])+')');
      E.h.setAttribute('aria-valuenow',b[0]);
      E.h.setAttribute('aria-valuetext','b = ('+fmt(b[0],2)+', '+fmt(b[1],2)+')'+(snapped?', the OLS point':''));
      if(api) api.changed();
      if(!out) return;
      xu=[dot3(X1,U),dot3(X2,U)]; uu=dot3(U,U); yy=dot3(Y,Y); hh=dot3(YH,YH);
      gg=dot3(sub3(YH,XB),sub3(YH,XB));
      out.textContent='ŷ = '+fmt(BH[0],2)+' X₁ + '+fmt(BH[1],2)+' X₂   X′û = ('+fmt(xu[0],2)+', '+fmt(xu[1],2)+')\n'+
        '‖y‖² = ‖ŷ‖² + ‖û‖² = '+hh.toFixed(2)+' + '+uu.toFixed(2)+' = '+yy.toFixed(2)+'\n'+
        (snapped?'Xb = ŷ, the OLS point   ‖y − Xb‖² = '+uu.toFixed(2)+', the smallest it can be':
          'b = ('+fmt(b[0],2)+', '+fmt(b[1],2)+')   ‖y − Xb‖² = '+uu.toFixed(2)+' + '+gg.toFixed(2)+' = '+(uu+gg).toFixed(2));
    }
    /* place text t next to point p on the axis from o to a, on the side away from the other axis b */
    function side(t,p,o,a,b,off){
      var dx=a[0]-o[0], dy=a[1]-o[1], L=Math.hypot(dx,dy)||1, n=[-dy/L,dx/L], w;
      if(n[0]*(b[0]-o[0])+n[1]*(b[1]-o[1])>0) n=[-n[0],-n[1]];
      w=NF.tw(t,t.textContent);
      /* push the text out by its half width in the sideways direction, so it never sits on the axis */
      place(t,p[0]+n[0]*(off+w/2*Math.abs(n[0]))-w/2,p[1]+n[1]*(off+5)+4,'start');
    }
    /* distance from p to the nearest of the points in list: larger means more free room */
    /* centre of a placed text label */
    function mark(t){ var x=+t.getAttribute('x'), w=NF.tw(t,t.textContent), an=t.getAttribute('text-anchor'); return [an==='end'?x-w/2:an==='middle'?x:x+w/2,+t.getAttribute('y')-4]; }
    function crowd(p,list){ var m=1e9, i; for(i=0;i<list.length;i++) m=Math.min(m,Math.hypot(p[0]-list[i][0],p[1]-list[i][1])); return m; }
    function tipLabel(t,p0,p1,off){
      var dx=p1[0]-p0[0], dy=p1[1]-p0[1], L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
      place(t,p1[0]+ux*off,p1[1]+uy*off+4,ux>0.35?'start':ux<-0.35?'end':'middle');
    }
    function solve(px,py){
      var o=proj([0,0,0]), a=proj(X1), c=proj(X2), d1=[a[0]-o[0],a[1]-o[1]], d2=[c[0]-o[0],c[1]-o[1]], det=d1[0]*d2[1]-d2[0]*d1[1], rx=px-o[0], ry=py-o[1];
      if(Math.abs(det)<1e-6) return null;
      return [(rx*d2[1]-d2[0]*ry)/det,(d1[0]*ry-rx*d1[1])/det];
    }
    svg.addEventListener('pointerdown',function(e){
      var p=local(svg,e,W,H), pb=proj(comb(b[0],b[1]));
      if(Math.hypot(pb[0]-p[0],pb[1]-p[1])<24){
        drag={kind:'b',grab:[pb[0]-p[0],pb[1]-p[1]]};
        try{ E.h.focus({preventScroll:true,focusVisible:false}); }catch(err){}
      } else drag={kind:'turn',p:p,az:az,ev:ev};
      e.preventDefault(); capture(svg,e);
      svg.classList.add('is-drag');
    });
    svg.addEventListener('pointermove',function(e){
      if(!drag) return;
      var p=local(svg,e,W,H), st, ph;
      if(drag.kind==='b'){
        st=solve(p[0]+drag.grab[0],p[1]+drag.grab[1]);
        if(!st) return;
        ph=proj(YH);
        if(Math.hypot(p[0]+drag.grab[0]-ph[0],p[1]+drag.grab[1]-ph[1])<9){ b=BH.slice(); snapped=true; update(); }
        else setB(st[0],st[1],true);
      } else {
        ev=clamp(drag.ev+(p[1]-drag.p[1])*0.3,EVLO,EVHI);
        setTurn(drag.az-(p[0]-drag.p[0])*0.6);
      }
    });
    function stop(){ drag=null; svg.classList.remove('is-drag'); }
    svg.addEventListener('pointerup',stop);
    svg.addEventListener('pointercancel',stop);
    svg.addEventListener('touchstart',function(e){
      if(e.touches.length!==1) return;
      var p=local(svg,e.touches[0],W,H), pb=proj(comb(b[0],b[1]));
      if(Math.hypot(pb[0]-p[0],pb[1]-p[1])<24) e.preventDefault();
    },{passive:false});
    /* the Try it steps read the candidate b, the Pythagoras split and the view, and can move b, snap, reset or turn */
    api=NF.api({
      get:function(){
        var XB=comb(b[0],b[1]), g=dot3(sub3(YH,XB),sub3(YH,XB)), uu=dot3(U,U);
        return {b1:b[0], b2:b[1], snap:snapped, dist:uu+g, gap:g, uu:uu, xu1:dot3(X1,U), xu2:dot3(X2,U), turn:az, bh1:BH[0], bh2:BH[1]};
      },
      set:function(st){
        if(st.reset && rb) rb.click();
        if('turn' in st) setTurn(+st.turn);
        if('b1' in st || 'b2' in st) setB('b1' in st?+st.b1:b[0],'b2' in st?+st.b2:b[1],true);
        if(st.snap && bb) bb.click();
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 2. Correlated regressors and the joint sampling distribution of two slopes ---------- */
  NF.register('l4-collin',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=50, RD=800, r=0, q1=[], q2=[], A=new Float64Array(RD), B=new Float64Array(RD), rnd=mulberry32(20261104), i, m1=0, m2=0, s1=0, s2=0, c=0, api=null, abar=0, bbar=0;
    /* two orthonormal centred vectors: x2 and x3 are built from them so their sample correlation is exactly r */
    for(i=0;i<N;i++){ q1.push(gauss(rnd)); q2.push(gauss(rnd)); m1+=q1[i]; m2+=q2[i]; }
    m1/=N; m2/=N;
    for(i=0;i<N;i++){ q1[i]-=m1; q2[i]-=m2; s1+=q1[i]*q1[i]; }
    s1=Math.sqrt(s1);
    for(i=0;i<N;i++){ q1[i]/=s1; c+=q1[i]*q2[i]; }
    for(i=0;i<N;i++){ q2[i]-=c*q1[i]; s2+=q2[i]*q2[i]; }
    s2=Math.sqrt(s2);
    for(i=0;i<N;i++) q2[i]/=s2;
    /* a = q1'u and b = q2'u are iid N(0, 1) when u ~ N(0, I) */
    for(i=0;i<RD;i++){ A[i]=gauss(rnd); B[i]=gauss(rnd); abar+=A[i]/RD; bbar+=B[i]/RD; }
    var rr=range(fig,'r',2,function(v){ r=v; update(); });
    if(rr) r=rr.v();
    var W=520, H=300, E={}, P1, P2, wide;
    function panel(x0,y0,side,lo,hi){ return {x0:x0,y0:y0,side:side,xs:lin(lo,hi,x0,x0+side),ys:lin(lo,hi,y0+side,y0)}; }
    function axes(g,P,ticks,title,xl,yl){
      var k, v;
      S('rect',{x:R(P.x0),y:R(P.y0),width:R(P.side),height:R(P.side),'class':'l4-frame'},g);
      for(k=0;k<ticks.length;k++){
        v=ticks[k];
        line(g,C(P.xs(v)),P.y0,C(P.xs(v)),P.y0+P.side,'nf-grid');
        line(g,P.x0,C(P.ys(v)),P.x0+P.side,C(P.ys(v)),'nf-grid');
        text(g,P.xs(v),P.y0+P.side+14,tl(v),null,'middle');
        text(g,P.x0-6,P.ys(v)+4,tl(v),null,'end');
      }
      text(g,P.x0,P.y0-8,title,'nf-title');
      /* axis names sit inside the frame (x bottom right, y top left), clear of the tick labels */
      place(xl,P.x0+P.side-6,P.y0+P.side-8,'end'); g.appendChild(xl);
    }
    function draw(){
      var g, side, mL=30, top=22, bot=22, gap=26, gx, gb, k;
      W=measure(svg); wide=W>=480;
      if(wide){ side=Math.min(250,Math.floor((W-2*mL-gap)/2)); H=top+side+bot; }
      else { side=Math.min(240,W-mL-12); H=2*(top+side+bot)+6; }
      frame(svg,W,H);
      if(wide){ k=(W-(2*side+2*mL+gap))/2; P1=panel(k+mL,top,side,-3.2,3.2); P2=panel(k+2*mL+side+gap,top,side,-0.6,2.6); }
      else { k=(W-(side+mL))/2; P1=panel(k+mL,top,side,-3.2,3.2); P2=panel(k+mL,2*top+side+bot+6,side,-0.6,2.6); }
      g=S('g',null,svg);
      axes(g,P1,[-2,0,2],'regressors',sublab(svg,'x','2','nf-title'));
      E.y1=sublab(g,'x','3','nf-title'); place(E.y1,P1.x0+6,P1.y0+14,'start');
      E.x2=rich(svg,['estimate of β','2'],'nf-title nf-halo');
      axes(g,P2,[0,1,2],'estimates, the truth at the cross',E.x2);
      E.y2=rich(g,['estimate of β','3'],'nf-title nf-halo'); place(E.y2,P2.x0+6,P2.y0+14,'start');
      line(g,P2.x0,C(P2.ys(1)),P2.x0+P2.side,C(P2.ys(1)),'nf-mean0');
      line(g,C(P2.xs(1)),P2.y0,C(P2.xs(1)),P2.y0+P2.side,'nf-mean0');
      gx=clip(svg,P1.x0,P1.y0,P1.side,P1.side);
      E.xp=[];
      for(i=0;i<N;i++) E.xp.push(S('circle',{r:2.6,'class':'l4-xpt'},gx));
      gb=clip(svg,P2.x0,P2.y0,P2.side,P2.side);
      E.ell=S('path',{'class':'l4-ell'},gb);
      E.bp=[];
      for(i=0;i<RD;i++) E.bp.push(S('circle',{r:wide?1.7:1.6,'class':'l4-cloud'},gb));
      /* the axis names go on top, with a halo, so a stretched cloud never hides them */
      svg.appendChild(E.x2); svg.appendChild(E.y2);
      update();
    }
    function update(){
      var s=Math.sqrt(1-r*r), rn=Math.sqrt(N), k, t, e=[], l1, l2, ca=Math.SQRT1_2, inf=1/(1-r*r), sd=Math.sqrt(inf/N), rad=Math.sqrt(5.991);
      for(i=0;i<N;i++) at(E.xp[i],P1.xs(rn*q1[i]),P1.ys(rn*(r*q1[i]+s*q2[i])));
      /* beta hat minus beta for slopes 2 and 3: ((a - r b / s), b / s) / sqrt(N), with sigma = 1 */
      for(i=0;i<RD;i++) at(E.bp[i],P2.xs(1+(A[i]-r*B[i]/s)/rn),P2.ys(1+B[i]/(s*rn)));
      /* 95% ellipse: variances 1/(N(1 + r)) along (1, 1) and 1/(N(1 - r)) along (1, -1) */
      l1=Math.sqrt(1/(N*(1+r)))*rad; l2=Math.sqrt(1/(N*(1-r)))*rad;
      for(k=0;k<=72;k++){ t=k/72*2*Math.PI; e.push([P2.xs(1+ca*(l1*Math.cos(t)+l2*Math.sin(t))),P2.ys(1+ca*(l1*Math.cos(t)-l2*Math.sin(t)))]); }
      E.ell.setAttribute('d',poly(e)+'Z');
      if(api) api.changed();
      if(!out) return;
      out.textContent='r = '+fmt(r,2)+'   slope variance × 1/(1 − r²) = × '+inf.toFixed(2)+'   sd '+sd.toFixed(3)+'   corr of the two estimates '+fmt(-r,2);
      if(Math.abs(r)>=0.9) warn(out,r>0?'\nnear collinear: the data pin down little more than β₂ + β₃':'\nnear collinear: the data pin down little more than β₂ − β₃');
    }
    /* the Try it steps read the state and can set r. With sigma = 1 and unit spread in each regressor:
       Var(b2 + b3) = 2/(N(1 + r)), Var(b2 - b3) = 2/(N(1 - r)), and N(1 - r^2) is the sample size that
       uncorrelated regressors would need for the same Var(b2). m2, m3 average the 800 drawn estimates. */
    api=NF.api({
      get:function(){
        var inf=1/(1-r*r), s=Math.sqrt(1-r*r), rn=Math.sqrt(N);
        return {r:r, vif:inf, sd:Math.sqrt(inf/N), corr:-r, sdsum:Math.sqrt(2/(N*(1+r))), sddif:Math.sqrt(2/(N*(1-r))), neff:N*(1-r*r),
          m2:1+(abar-r*bbar/s)/rn, m3:1+bbar/(s*rn)};
      },
      set:function(st){ if('r' in st && rr) rr.set(st.r); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 3. Sampling distribution of the OLS slope, X held fixed ---------- */
  NF.register('l4-sampling',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var NMAX=100, RS=4000, seed=20261105, Z=new Float64Array(RS*NMAX), EX=new Float64Array(RS*NMAX), X=[], ZO=[], b2=0.5, gam=0.5, N=20, i, rnd, api=null, last={};
    var LO=-0.15, HI=1.15, sl=new Float64Array(RS);
    rnd=mulberry32(20261031);
    for(i=0;i<NMAX;i++){ X.push(Math.round((0.3+9.4*rnd())*100)/100); }
    /* the omitted variable z rises with x, plus its own fixed noise */
    for(i=0;i<NMAX;i++) ZO.push(0.28*(X[i]-5)+0.6*gauss(rnd));
    function sample(){
      var r2=mulberry32(seed), k;
      for(k=0;k<RS*NMAX;k++){ Z[k]=gauss(r2); EX[k]=-Math.log(1-r2())-1; }
    }
    var mode=seg(fig,'data-mode',function(v){ if(v===mode) return; mode=v; update(); });
    var rn=range(fig,'n',0,function(v){ N=Math.round(v); update(); });
    if(rn) N=Math.round(rn.v());
    var nb=fig.querySelector('.nfig-new');
    if(nb) nb.addEventListener('click',function(){ seed++; sample(); update(); });
    var W=520, H=270, mL=16, mR=16, top=34, bot=236, xs, E={};
    function draw(){
      var g, rows;
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['rect','nf-hist nf-sw','4000 OLS slopes'],['line','l4-fcurve','N(β₂, σ²/Sxx), the formula'],['line','nf-mean0','true β₂']],mL,11,W-mR);
      top=rows>1?50:34;
      xs=lin(LO,HI,mL,W-mR);
      g=S('g',null,svg);
      E.ticks=[0,0.25,0.5,0.75,1];
      for(i=0;i<E.ticks.length;i++){ line(g,C(xs(E.ticks[i])),top,C(xs(E.ticks[i])),bot,'nf-grid'); line(g,C(xs(E.ticks[i])),bot,C(xs(E.ticks[i])),bot+4,'nf-ax'); text(g,xs(E.ticks[i]),bot+17,tl(E.ticks[i]),null,'middle'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      E.gc=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      E.area=S('path',{'class':'nf-hist'},E.gc);
      E.edge=S('path',{'class':'nf-histline'},E.gc);
      E.curve=S('path',{'class':'l4-fcurve'},E.gc);
      E.truth=line(E.gc,C(xs(b2)),top-4,C(xs(b2)),bot,'nf-mean0');
      E.mean=line(E.gc,0,0,0,0,'l4-meanline');
      update();
    }
    function update(){
      var xb=0, sxx=0, w=[], hs=[], m4=0, k, j, s, base, sd, sw=0, bias=0, ms, c, peak, ys, p=[], v, hp, msg, bw, nb;
      for(k=0;k<N;k++) xb+=X[k];
      xb/=N;
      for(k=0;k<N;k++) sxx+=(X[k]-xb)*(X[k]-xb);
      for(k=0;k<N;k++){ w.push((X[k]-xb)/sxx); m4+=Math.pow(X[k],4); }
      m4/=N;
      /* heteroskedastic: sd proportional to x squared, scaled so the average variance is still 1 */
      for(k=0;k<N;k++){ hs.push(X[k]*X[k]/Math.sqrt(m4)); sw+=w[k]*w[k]*hs[k]*hs[k]; bias+=w[k]*ZO[k]; }
      for(j=0;j<RS;j++){
        s=0; base=j*NMAX;
        if(mode==='skewed') for(k=0;k<N;k++) s+=w[k]*EX[base+k];
        else if(mode==='hetero') for(k=0;k<N;k++) s+=w[k]*hs[k]*Z[base+k];
        else if(mode==='omitted') for(k=0;k<N;k++) s+=w[k]*(gam*ZO[k]+Z[base+k]);
        else for(k=0;k<N;k++) s+=w[k]*Z[base+k];
        sl[j]=b2+s;
      }
      ms=meanSd(sl,RS); sd=1/Math.sqrt(sxx);
      bw=sd/5; nb=Math.ceil((HI-LO)/bw);
      c=density(sl,RS,LO,bw,nb);
      peak=phi(0)/sd;
      for(k=0;k<nb;k++) peak=Math.max(peak,c[k]);
      ys=lin(0,peak*1.08,bot,top);
      hp=histPaths(c,LO,bw,xs,ys,peak*1.2);
      E.area.setAttribute('d',hp.area); E.edge.setAttribute('d',hp.edge);
      for(k=0;k<=240;k++){ v=LO+(HI-LO)*k/240; p.push([xs(v),ys(phi((v-b2)/sd)/sd)]); }
      E.curve.setAttribute('d',poly(p));
      setLine(E.mean,C(xs(ms[0])),top-4,C(xs(ms[0])),bot);
      last={mean:ms[0], sd:ms[1], fsd:sd, sand:Math.sqrt(sw), dhat:bias, bmean:b2+gam*bias, sxx:sxx};
      if(api) api.changed();
      if(!out) return;
      msg='mean '+ms[0].toFixed(3)+'   sd '+ms[1].toFixed(3)+'   formula σ/√Sxx = '+sd.toFixed(3);
      if(mode==='hetero') msg+='   sandwich '+Math.sqrt(sw).toFixed(3);
      if(mode==='omitted') msg+='   β₂ + bias = '+(b2+gam*bias).toFixed(3);
      out.textContent=msg;
      if(mode==='hetero') warn(out,'\nOLS.4 fails: still centred on β₂, but the formula understates the spread');
      else if(mode==='omitted') warn(out,'\nOLS.3 fails: centred on β₂ + γ × (slope of z on x), not on β₂');
      else if(mode==='skewed') out.appendChild(document.createTextNode('\nOLS.5 fails: mean and spread still right, shape only roughly normal'));
      else out.appendChild(document.createTextNode('\nOLS.1 to OLS.5 hold: the histogram is exactly N(β₂, σ²/Sxx)'));
    }
    /* the Try it steps read the summary of the 4000 slopes and the theory beside it; they can pick a mode, set N or redraw */
    api=NF.api({
      get:function(){ return {mode:mode, n:N, mean:last.mean, sd:last.sd, fsd:last.fsd, sand:last.sand, dhat:last.dhat, bmean:last.bmean, sxx:last.sxx, draws:seed-20261105}; },
      set:function(st){
        if('mode' in st) NF.press(fig,'data-mode',st.mode);
        if('n' in st && rn) rn.set(st.n);
        if(st['new'] && nb) nb.click();
      }
    });
    sample(); draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 4. Gauss Markov: OLS against other linear unbiased slope estimators ---------- */
  NF.register('l4-gm',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, RS=8000, b2=0.5, X=[], WO=[], xb=0, sxx=0, i, k, rnd=mulberry32(20261106), U=new Float64Array(RS*N), so=new Float64Array(RS), sa=new Float64Array(RS), api=null, last={};
    for(i=0;i<N;i++){ X.push(i+1); xb+=i+1; }
    xb/=N;
    for(i=0;i<N;i++) sxx+=(X[i]-xb)*(X[i]-xb);
    for(i=0;i<N;i++) WO.push((X[i]-xb)/sxx);
    for(k=0;k<RS*N;k++) U[k]=gauss(rnd);
    for(k=0;k<RS;k++){ var s=0; for(i=0;i<N;i++) s+=WO[i]*U[k*N+i]; so[k]=b2+s; }
    /* weights a on y for each alternative; each satisfies sum a = 0 and sum a x = 1 */
    function ends(){ var a=[]; for(i=0;i<N;i++) a.push(i===0?-1/(X[N-1]-X[0]):i===N-1?1/(X[N-1]-X[0]):0); return a; }
    function groups(){
      var a=[], h=N/2, lo=0, hi=0;
      for(i=0;i<h;i++) lo+=X[i];
      for(i=h;i<N;i++) hi+=X[i];
      lo/=h; hi/=h;
      for(i=0;i<N;i++) a.push((i<h?-1:1)/(h*(hi-lo)));
      return a;
    }
    function weighted(){
      var a=[], sw=0, sx=0, xw, d=0;
      for(i=0;i<N;i++){ sw+=1/X[i]; sx+=1; }
      xw=sx/sw;
      for(i=0;i<N;i++) d+=(X[i]-xw)*(X[i]-xw)/X[i];
      for(i=0;i<N;i++) a.push((X[i]-xw)/X[i]/d);
      return a;
    }
    var ALT={ends:ends(),groups:groups(),weighted:weighted()};
    var alt=seg(fig,'data-alt',function(v){ if(!ALT[v]||v===alt) return; alt=v; draw(); });
    if(!ALT[alt]) alt='ends';
    var t=1, rt=range(fig,'t',2,function(v){ t=v; update(); });
    if(rt) t=rt.v();
    var W=520, H=360, mL=16, mR=16, xs, ws, hx, hy, E={}, LO=b2-0.32, HI=b2+0.32, BW=0.008, NB=80;
    var oc=density(so,RS,LO,BW,NB), PK=phi(0)*Math.sqrt(sxx);
    function draw(){
      var g, a=ALT[alt], m=0, k2, v, hp, y, rows, wTop, wBot, hTop, hBot, gl;
      W=measure(svg); frame(svg,W,H);
      for(i=0;i<N;i++) m=Math.max(m,Math.abs(a[i]),Math.abs(WO[i]));
      m*=1.12;
      g=S('g',null,svg);
      /* weights panel: title, legend, then the stems */
      text(g,mL,12,'weight on each observation, against x = 1, …, 20','nf-title');
      rows=key(S('g',null,svg),[['rect','l4-swo','OLS weights w'],['rect','l4-swa','alternative weights a']],mL,30,W-mR);
      wTop=30+16*(rows-1)+12; wBot=wTop+92;
      /* histogram panel below it */
      y=wBot+38;
      gl=S('g',null,svg);
      rows=key(gl,[['rect','nf-hist nf-sw','8000 OLS slopes'],['rect','l4-althist l4-sw2','8000 alternative slopes'],['line','nf-mean0','β₂ = 0.5']],mL,y,W-mR);
      hTop=y+16*(rows-1)+10; hBot=hTop+140;
      H=hBot+24; svg.setAttribute('viewBox','0 0 '+W+' '+H);
      xs=lin(0.4,N+0.6,mL,W-mR); ws=lin(-m,m,wBot,wTop);
      hx=lin(LO,HI,mL,W-mR); hy=lin(0,PK*1.15,hBot,hTop);
      line(g,mL,C(ws(0)),W-mR,C(ws(0)),'nf-ax');
      for(k2=0;k2<5;k2++){ v=[1,5,10,15,20][k2]; text(g,xs(v),wBot+16,tl(v),null,'middle'); }
      E.stems=[]; E.adot=[]; E.odot=[];
      for(i=0;i<N;i++) E.stems.push(line(svg,0,0,0,0,'l4-stem'));
      line(svg,xs(X[0]),ws(WO[0]),xs(X[N-1]),ws(WO[N-1]),'l4-wline');
      for(i=0;i<N;i++) E.odot.push(S('circle',{r:3.6,cx:R(xs(X[i])),cy:R(ws(WO[i])),'class':'l4-wols'},svg));
      for(i=0;i<N;i++) E.adot.push(S('circle',{r:3.2,'class':'l4-walt'},svg));
      g=S('g',null,svg);
      for(k2=0;k2<5;k2++){ v=[0.2,0.35,0.5,0.65,0.8][k2]; line(g,C(hx(v)),hBot,C(hx(v)),hBot+4,'nf-ax'); text(g,hx(v),hBot+17,tl(v),null,'middle'); }
      line(g,mL,C(hBot),W-mR,C(hBot),'nf-ax');
      E.gc=clip(svg,mL,hTop,W-mR-mL,hBot-hTop);
      hp=histPaths(oc,LO,BW,hx,hy,PK*1.3);
      S('path',{d:hp.area,'class':'nf-hist'},E.gc);
      S('path',{d:hp.edge,'class':'nf-histline'},E.gc);
      E.aarea=S('path',{'class':'l4-althist'},E.gc);
      E.aedge=S('path',{'class':'l4-altline'},E.gc);
      line(E.gc,C(hx(b2)),hTop,C(hx(b2)),hBot,'nf-mean0');
      update();
    }
    function update(){
      var a=ALT[alt], c=[], sa0=0, sax=0, dd=0, ow=0, j, s, ac, hp, ms, mo;
      for(i=0;i<N;i++){ c.push(WO[i]+t*(a[i]-WO[i])); sa0+=c[i]; sax+=c[i]*X[i]; dd+=(c[i]-WO[i])*(c[i]-WO[i]); ow+=WO[i]*WO[i]; }
      for(i=0;i<N;i++){ setLine(E.stems[i],xs(X[i]),ws(0),xs(X[i]),ws(c[i])); at(E.adot[i],xs(X[i]),ws(c[i])); }
      for(j=0;j<RS;j++){ s=0; for(i=0;i<N;i++) s+=c[i]*U[j*N+i]; sa[j]=b2+s; }
      ac=density(sa,RS,LO,BW,NB);
      hp=histPaths(ac,LO,BW,hx,hy,PK*1.3);
      E.aarea.setAttribute('d',hp.area); E.aedge.setAttribute('d',hp.edge);
      ms=meanSd(sa,RS); mo=meanSd(so,RS);
      last={sa:sa0, sax:sax, mean:ms[0], omean:mo[0], ratio:1+dd/ow, dr:dd/ow, sim:ms[1]*ms[1]/(mo[1]*mo[1])};
      if(api) api.changed();
      if(!out) return;
      out.textContent='Σa = '+fmt(sa0,3)+'   Σax = '+fmt(sax,3)+'   mean '+ms[0].toFixed(3)+'\nVar ratio = 1 + Σd²/Σw² = '+(1+dd/ow).toFixed(2)+'   simulated '+(ms[1]*ms[1]/(mo[1]*mo[1])).toFixed(2);
    }
    /* the Try it steps read the constraints, the variance ratio (theory and simulation) and the blend; they can pick
       an alternative and set the blend t */
    api=NF.api({
      get:function(){ return {alt:alt, t:t, sa:last.sa, sax:last.sax, mean:last.mean, omean:last.omean, ratio:last.ratio, dr:last.dr, sim:last.sim}; },
      set:function(st){
        if('alt' in st) NF.press(fig,'data-alt',st.alt);
        if('t' in st && rt) rt.set(st.t);
      }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* ---------- 5. Degrees of freedom: dividing the residual sum of squares by N or by N - K ---------- */
  NF.register('l4-dof',function(fig){
    var svg=fig.querySelector('svg'), out=fig.querySelector('.nfig-read');
    if(!svg) return;
    var N=20, KM=19, RS=3000, K=2, rnd=mulberry32(20261107), Q=[], uu=new Float64Array(RS), CO=new Float64Array(RS*KM), i, j, k, v, s, col;
    /* regressors: a column of ones, then pure noise; Gram Schmidt gives nested orthonormal bases, so tr(M) = N - K for each K */
    for(k=0;k<KM;k++){
      col=[];
      for(i=0;i<N;i++) col.push(k===0?1:gauss(rnd));
      for(j=0;j<k;j++){ s=0; for(i=0;i<N;i++) s+=Q[j][i]*col[i]; for(i=0;i<N;i++) col[i]-=s*Q[j][i]; }
      s=0; for(i=0;i<N;i++) s+=col[i]*col[i];
      s=Math.sqrt(s); for(i=0;i<N;i++) col[i]/=s;
      Q.push(col);
    }
    for(j=0;j<RS;j++){
      var u=[];
      for(i=0;i<N;i++){ v=gauss(rnd); u.push(v); uu[j]+=v*v; }
      for(k=0;k<KM;k++){ s=0; for(i=0;i<N;i++) s+=Q[k][i]*u[i]; CO[j*KM+k]=s; }
    }
    var rk=range(fig,'k',0,function(v){ K=Math.round(v); update(); });
    if(rk) K=Math.round(rk.v());
    var W=520, H=270, mL=16, mR=16, top=34, bot=236, xs, E={}, LO=0, HI=3, BW=0.05, NB=60, A1=new Float64Array(RS), A2=new Float64Array(RS), api=null, last={};
    function draw(){
      var g, rows, t=[0,0.5,1,1.5,2,2.5,3];
      W=measure(svg); frame(svg,W,H);
      rows=key(S('g',null,svg),[['rect','nf-hist nf-sw','û′û/(N − K)'],['rect','l4-swr','û′û/N'],['line','nf-mean0','σ² = 1']],mL,11,W-mR);
      top=rows>1?50:34;
      xs=lin(LO,HI,mL,W-mR);
      g=S('g',null,svg);
      for(i=0;i<t.length;i++){ line(g,C(xs(t[i])),top,C(xs(t[i])),bot,'nf-grid'); line(g,C(xs(t[i])),bot,C(xs(t[i])),bot+4,'nf-ax'); text(g,xs(t[i]),bot+17,tl(t[i]),null,'middle'); }
      line(g,mL,C(bot),W-mR,C(bot),'nf-ax');
      E.gc=clip(svg,mL,top-4,W-mR-mL,bot-top+4);
      E.a1=S('path',{'class':'nf-hist'},E.gc);
      E.e1=S('path',{'class':'nf-histline'},E.gc);
      E.a2=S('path',{'class':'nf-hide'},E.gc);
      E.e2=S('path',{'class':'l4-altline l4-alt2'},E.gc);
      line(E.gc,C(xs(1)),top-4,C(xs(1)),bot,'nf-mean0');
      E.m1=line(E.gc,0,0,0,0,'l4-meanline');
      E.m2=line(E.gc,0,0,0,0,'l4-meanalt');
      update();
    }
    function update(){
      var m1=0, m2=0, c1, c2, pk=0, ys, hp, ssr;
      for(j=0;j<RS;j++){
        ssr=uu[j];
        for(k=0;k<K;k++) ssr-=CO[j*KM+k]*CO[j*KM+k];
        A1[j]=ssr/(N-K); A2[j]=ssr/N; m1+=A1[j]; m2+=A2[j];
      }
      m1/=RS; m2/=RS;
      c1=density(A1,RS,LO,BW,NB); c2=density(A2,RS,LO,BW,NB);
      for(k=0;k<NB;k++) pk=Math.max(pk,c1[k],c2[k]);
      ys=lin(0,pk*1.12,bot,top);
      hp=histPaths(c1,LO,BW,xs,ys,pk*1.3); E.a1.setAttribute('d',hp.area); E.e1.setAttribute('d',hp.edge);
      hp=histPaths(c2,LO,BW,xs,ys,pk*1.3); E.a2.setAttribute('d',hp.area); E.e2.setAttribute('d',hp.edge);
      setLine(E.m1,C(xs(m1)),top-4,C(xs(m1)),bot);
      setLine(E.m2,C(xs(m2)),top-4,C(xs(m2)),bot);
      last={m1:m1, m2:m2, sd1:meanSd(A1,RS)[1]};
      if(api) api.changed();
      if(!out) return;
      out.textContent='K = '+K+'   N − K = '+(N-K)+'   mean of û′û/(N − K) = '+m1.toFixed(2)+'\nmean of û′û/N = '+m2.toFixed(2)+', theory (N − K)/N = '+((N-K)/N).toFixed(2);
    }
    /* the Try it steps read K, the degrees of freedom and both means (with the theory (N - K)/N); they can set K */
    api=NF.api({
      get:function(){ return {k:K, n:N, dof:N-K, m1:last.m1, m2:last.m2, theory:(N-K)/N, sd1:last.sd1}; },
      set:function(st){ if('k' in st && rk) rk.set(st.k); }
    });
    draw();
    watch(svg,draw);
    return api;
  });

  /* notes.js may have booted before this file loaded; start any L4 figure still waiting */
  if(window.initNoteFigures) window.initNoteFigures(document);
})();
