(() => {
  'use strict';

  const WIDTH = 1586, HEIGHT = 992;
  const STORAGE_KEY = 'fuyu-storybook-scene-v5';
  const LEGACY_STORAGE_KEYS = ['fuyu-storybook-scene-v4','fuyu-storybook-scene-v3','fuyu-storybook-scene-v2','fuyu-storybook-scene-v1'];
  const colors = [
    {name:'もみの木', value:'#347c56'},
    {name:'若葉', value:'#87ad62'},
    {name:'金色', value:'#dca744'},
    {name:'赤い実', value:'#b74f47'},
    {name:'青い灯り', value:'#5c9ab8'},
    {name:'雪色', value:'#e5ecdf'}
  ];
  const blank = () => ({strokes:[],ornaments:[],ornamentStep:0,snowmen:[],lit:{},snow:true,brush:34,color:0});
  let state = blank(), mode = 'paint', nightMode = false, activeStroke = null, pendingPaintPointer = null, historyStack = [], saveTimer, toastTimer;
  let exportAssetsPromise;
  const $ = s => document.querySelector(s);
  const studio = $('#studio');
  document.body.classList.add('storybook-active');

  studio.insertAdjacentHTML('beforeend', `
    <div class="storybook-shell" id="storybookShell">
      <div class="storybook-page">
        <div class="storybook-viewport" id="storybookViewport">
          <div class="storybook-art" id="storybookArt">
            <div class="storybook-art-inner" id="storybookArtInner">
              <img id="storybookScene" src="assets/storybook-scene-storyboy.png" alt="星の傘を持つ少年と、雪の森に立つ三つの丸いランプが消えたクリスマスツリー。足もとに三つのプレゼントがある" width="${WIDTH}" height="${HEIGHT}" draggable="false">
              <canvas id="storyPaint" width="${WIDTH}" height="${HEIGHT}" aria-label="ツリーを塗るキャンバス。飾りやランプを押すと光ります"></canvas>
              <canvas id="storyNight" width="${WIDTH}" height="${HEIGHT}" aria-hidden="true"></canvas>
              <canvas id="storyDecor" width="${WIDTH}" height="${HEIGHT}" aria-hidden="true"></canvas>
              <button class="storybook-gift" style="left:55.4%;top:86.6%;width:7%;height:9%" data-story-gift="game" aria-label="左のプレゼントを開く"></button>
              <button class="storybook-gift" style="left:64.5%;top:86.8%;width:12.5%;height:11%" data-story-gift="book" aria-label="真ん中のプレゼントを開く"></button>
              <button class="storybook-gift" style="left:75%;top:86.5%;width:8%;height:10%" data-story-gift="letter" aria-label="右のプレゼントを開く"></button>
            </div>
          </div>
          <div class="storybook-snow" id="storybookSnow" aria-hidden="true"></div>
          <header class="storybook-top">
            <button class="storybook-wordmark" id="storybookHome" aria-label="ホームに戻る">✧ 冬のアトリエ</button>
            <div class="storybook-top-actions"><button class="storybook-sound-trigger" id="storybookSound" aria-label="音を消す" aria-pressed="true">音を消す</button><button class="storybook-night-trigger" id="storybookNight" aria-label="夜の灯りを見る" aria-pressed="false">夜の灯りを見る</button><button class="storybook-tools-trigger" id="storybookTools" aria-label="道具をひらく" aria-controls="storybookPanel" aria-expanded="false">道具をひらく</button></div>
          </header>
          <div class="storybook-ribbon" role="group" aria-label="制作の道具">
            <button class="storybook-tool" data-story-mode="paint" aria-label="色を塗る" aria-pressed="true">✎<small>色を塗る</small></button>
            <button class="storybook-tool" data-story-mode="ornament" aria-label="灯りを飾る" aria-pressed="false">✦<small>灯りを飾る</small></button>
            <button class="storybook-tool" data-story-mode="snowman" aria-label="雪だるまを置く" aria-pressed="false">☃<small>雪だるまを置く</small></button>
            <button class="storybook-tool" data-story-mode="erase" aria-label="色や飾りを消す" aria-pressed="false">⌫<small>色や飾りを消す</small></button>
            <button class="storybook-tool storybook-undo" id="storybookUndoQuick" aria-label="ひとつ戻す">↶<small>ひとつ戻す</small></button>
          </div>
          <div class="storybook-palette" id="storybookPalette" role="group" aria-label="色を選ぶ"></div>
          <p class="storybook-caption" id="storybookCaption">ひとつずつ、冬を飾ろう。</p>
          <aside class="storybook-panel" id="storybookPanel" aria-label="制作の道具" aria-hidden="true" inert>
            <div class="storybook-panel-head"><h2>冬をつくる道具</h2><button class="storybook-panel-close" id="storybookPanelClose" aria-label="道具を閉じる">×</button></div>
            <label for="storybookBrush">筆の太さ <span id="storybookBrushValue">34</span></label><input id="storybookBrush" type="range" min="18" max="70" value="34">
            <h3>雪の庭</h3><div class="storybook-panel-grid"><button id="storybookSnowToggle">雪を止める</button><button id="storybookSnowman">雪だるまを置く</button></div>
            <h3>作品を残す</h3><div class="storybook-panel-grid">
              <button id="storybookUndo">ひとつ戻す</button>
              <button id="storybookReset">白紙に戻す</button><button id="storybookExport" class="wide">画像を保存</button>
            </div><h3>三つのプレゼント</h3><div class="storybook-panel-grid"><button data-panel-gift="game">左のプレゼント</button><button data-panel-gift="book">真ん中のプレゼント</button><button data-panel-gift="letter" class="wide">右のプレゼント</button></div>
            <p>ツリーをなぞって色を重ね、灯りを添えてください。雪だるまは足もとの庭に置けます。</p>
          </aside>
          <div class="storybook-toast" id="storybookToast" role="status" aria-live="polite"></div>
        </div>
      </div>
    </div>`);

  const art = $('#storybookArtInner'), viewport = $('#storybookViewport');
  const paint = $('#storyPaint'), paintCtx = paint.getContext('2d');
  const decor = $('#storyDecor'), decorCtx = decor.getContext('2d');
  const night = $('#storyNight'), nightCtx = night.getContext('2d');
  const fixedDecor = [
    {id:'star',kind:'star',x:1092,y:69,r:49,label:'ツリーの星'},
    {id:'roundLamp1',kind:'round-lamp',x:1163,y:320,r:37,label:'上の丸いランプ'},
    {id:'roundLamp2',kind:'round-lamp',x:942,y:455,r:37,label:'左の丸いランプ'},
    {id:'roundLamp3',kind:'round-lamp',x:1229,y:604,r:37,label:'右の丸いランプ'}
  ];
  const treeMask = new Image();
  let maskPixels = null;
  paint.style.visibility = 'hidden';
  const clamp = (x,lo,hi) => Math.max(lo,Math.min(hi,x));
  const clone = value => JSON.parse(JSON.stringify(value));
  const hash = (a,b=0) => {const x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x)};
  const groundEdge=[[430,875],[540,850],[630,856],[730,897],[820,932],[900,946],[1250,946],[1360,925],[1460,900],[1550,880]];
  const groundYAt=x=>{
    for(let i=1;i<groundEdge.length;i++){
      const [rightX,rightY]=groundEdge[i];
      if(x<=rightX){
        const [leftX,leftY]=groundEdge[i-1];
        return leftY+(rightY-leftY)*clamp((x-leftX)/(rightX-leftX),0,1);
      }
    }
    return groundEdge.at(-1)[1];
  };
  const snowmanGroundMinY=x=>Math.max(groundYAt(x-48),groundYAt(x),groundYAt(x+48))+8;
  const canPlaceSnowmanAt=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=490&&x<=1510&&y>=snowmanGroundMinY(x)-48&&y<=970;
  const groundedSnowman=sm=>{
    const x=clamp(Number(sm.x)||490,490,1510);
    return {...sm,x,y:clamp(Number(sm.y)||970,snowmanGroundMinY(x),970)};
  };
  const onTree = (x,y) => {
    if(y<72||y>800)return false;
    const t=(y-72)/728, center=1094-12*t;
    const radius=Math.min(500,45+500*Math.pow(t,.65));
    return Math.abs(x-center)<radius;
  };
  const canPaintAt = (x,y) => {
    if(!maskPixels || !onTree(x,y))return false;
    for(const [dx,dy] of [[0,0],[-24,0],[24,0],[0,-24],[0,24],[-18,-18],[18,-18],[-18,18],[18,18]]){
      const xx=Math.round(x+dx), yy=Math.round(y+dy);
      if(xx<0||xx>=WIDTH||yy<0||yy>=HEIGHT)continue;
      if(maskPixels[(yy*WIDTH+xx)*4+3]>28)return true;
    }
    return false;
  };
  treeMask.onload=()=>{
    try{
      const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;
      const context=c.getContext('2d',{willReadFrequently:true});context.drawImage(treeMask,0,0);
      maskPixels=context.getImageData(0,0,WIDTH,HEIGHT).data;
      renderPaint();paint.style.visibility='visible';
    }catch(error){toast('描画を準備できませんでした。ページを再読み込みしてください。');console.error(error)}
  };
  treeMask.onerror=()=>toast('ツリーの描画データを読み込めませんでした。');
  treeMask.src=window.TREE_MASK_DATA_URL||'assets/tree-paint-mask.png';
  const atPoint = e => {
    const r=paint.getBoundingClientRect();
    return {x:(e.clientX-r.left)/r.width*WIDTH,y:(e.clientY-r.top)/r.height*HEIGHT};
  };
  function layoutArt(){
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if(w>=720){
      const scaleY=h/HEIGHT,scaleX=Math.min(w/WIDTH,scaleY*1.15);
      art.style.transform=`translate(${(w-WIDTH*scaleX)/2}px,0) scale(${scaleX},${scaleY})`;
      return;
    }
    const scale=Math.max(w/WIDTH,h/HEIGHT);
    art.style.transform=`translate(${(w-WIDTH*scale)*.70}px,${(h-HEIGHT*scale)/2}px) scale(${scale})`;
  }
  function toast(message){
    const el=$('#storybookToast');el.textContent=message;el.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
  }
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){toast('このブラウザーでは保存できませんでした。')}
  },350)}
  function backup(){historyStack.push(clone(state));if(historyStack.length>12)historyStack.shift();}
  function renderPaint(){
    paintCtx.clearRect(0,0,WIDTH,HEIGHT);
    for(const stroke of state.strokes){
      const points=stroke.points;if(!points?.length)continue;
      paintCtx.save();
      if(stroke.erase)paintCtx.globalCompositeOperation='destination-out';
      paintCtx.fillStyle=stroke.erase?'rgba(0,0,0,.4)':stroke.color;
      let index=0;
      const dab=(x,y) => {
        for(let j=0;j<5;j++){
          const a=hash(index,j)*Math.PI*2;
          const d=hash(index+17,j)*stroke.size*.27;
          const radius=stroke.size*(.22+hash(index+29,j)*.36);
          paintCtx.globalAlpha=stroke.erase?.37:(.15+hash(index+11,j)*.13);
          paintCtx.beginPath();paintCtx.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d,radius,radius*(.52+hash(index+37,j)*.35),a,0,Math.PI*2);paintCtx.fill();
        }
        index++;
      };
      dab(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++){
        const [ax,ay]=points[i-1],[bx,by]=points[i];
        const n=Math.ceil(Math.hypot(bx-ax,by-ay)/10);
        for(let k=1;k<=n;k++)dab(ax+(bx-ax)*k/n,ay+(by-ay)*k/n);
      }
      paintCtx.restore();
    }
    if(maskPixels){
      paintCtx.save();paintCtx.globalCompositeOperation='destination-in';paintCtx.globalAlpha=1;
      paintCtx.drawImage(treeMask,0,0);paintCtx.restore();
    }
  }
  const snowmanArt=new Image();
  snowmanArt.onload=()=>renderDecor();
  snowmanArt.src='assets/snowman-watercolor.png';
  function drawSnowman(c,sm,image=snowmanArt){
    if(!image.complete||!image.naturalWidth)return;
    const height=150,width=height*image.naturalWidth/image.naturalHeight;
    c.save();c.translate(sm.x,sm.y);c.rotate((hash(sm.x,sm.y)-.5)*.06);
    c.drawImage(image,-width/2,-height,width,height);c.restore();
  }
  function renderNight(){
    nightCtx.clearRect(0,0,WIDTH,HEIGHT);
    if(!nightMode)return;
    nightCtx.fillStyle='rgba(5,15,31,.56)';nightCtx.fillRect(0,0,WIDTH,HEIGHT);
    nightCtx.save();nightCtx.globalCompositeOperation='destination-out';
    const treeGlow=nightCtx.createRadialGradient(1080,515,70,1080,515,750);
    treeGlow.addColorStop(0,'rgba(0,0,0,.34)');treeGlow.addColorStop(.55,'rgba(0,0,0,.18)');treeGlow.addColorStop(1,'rgba(0,0,0,0)');
    nightCtx.fillStyle=treeGlow;nightCtx.fillRect(260,0,1326,992);
    const pools=[...fixedDecor.map(item=>({x:item.x,y:item.y,r:item.kind==='star'?290:230,center:.48,middle:.25})),
      ...state.ornaments.filter(o=>o.on!==false).map(o=>({x:o.x,y:o.y,r:140,center:.42,middle:.2}))];
    for(const pool of pools){
      const glow=nightCtx.createRadialGradient(pool.x,pool.y,2,pool.x,pool.y,pool.r);
      glow.addColorStop(0,`rgba(0,0,0,${pool.center})`);glow.addColorStop(.4,`rgba(0,0,0,${pool.middle})`);glow.addColorStop(1,'rgba(0,0,0,0)');
      nightCtx.fillStyle=glow;nightCtx.beginPath();nightCtx.arc(pool.x,pool.y,pool.r,0,Math.PI*2);nightCtx.fill();
    }
    nightCtx.restore();
    const warmth=nightCtx.createRadialGradient(1085,520,40,1085,520,715);
    warmth.addColorStop(0,'rgba(255,208,130,.22)');warmth.addColorStop(.55,'rgba(236,159,83,.1)');warmth.addColorStop(1,'rgba(255,178,85,0)');
    nightCtx.fillStyle=warmth;nightCtx.fillRect(370,0,1215,992);
  }
  function renderDecor(ctx=decorCtx,snowmanImage=snowmanArt){
    renderNight();
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    for(const item of fixedDecor){
      const on=nightMode||!!state.lit?.[item.id];
      if(on){
        const size=item.kind==='star'?(nightMode?155:93):(nightMode?115:85);
        const glow=ctx.createRadialGradient(item.x,item.y,2,item.x,item.y,size);
        glow.addColorStop(0,nightMode?'#fff3bf9f':'#fff3bfbb');glow.addColorStop(.35,nightMode?'#ffd16b6b':'#ffd16b88');glow.addColorStop(1,'#ffcb5700');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(item.x,item.y,size,0,Math.PI*2);ctx.fill();
        if(item.kind==='star'){
          ctx.save();ctx.translate(item.x,item.y);ctx.shadowColor='#ffd46c';ctx.shadowBlur=nightMode?22:26;
          ctx.fillStyle=nightMode?'#ffe6a0a8':'#ffe6a0c9';ctx.beginPath();
          for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?18:37;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
          ctx.closePath();ctx.fill();ctx.restore();
        }else{
          const glass=ctx.createRadialGradient(item.x-8,item.y-9,3,item.x,item.y,26);
          glass.addColorStop(0,'#fff9d9');glass.addColorStop(.58,'#f4d793');glass.addColorStop(1,'#d9af64');
          ctx.fillStyle=glass;ctx.beginPath();ctx.arc(item.x,item.y,23,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.ellipse(item.x-8,item.y-9,4,6,-.5,0,Math.PI*2);ctx.fill();
        }
      }
      const button=art.querySelector(`[data-light-id="${item.id}"]`);
      button?.setAttribute('aria-pressed',String(!!state.lit?.[item.id]));
    }
    for(const o of state.ornaments){
      const color=o.color||'#dca744';
      const isLit=o.on!==false;
      if(isLit){
        const radius=nightMode?57:39;
        const glow=ctx.createRadialGradient(o.x,o.y,2,o.x,o.y,radius);
        glow.addColorStop(0,nightMode?'#fff9d7b8':'#fff9d7dd');glow.addColorStop(.24,color+(nightMode?'86':'aa'));glow.addColorStop(1,'#ffffff00');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(o.x,o.y,radius,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle=isLit?color:'#9c897a';ctx.strokeStyle='#714d36';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(o.x,o.y,9,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff8e9';ctx.beginPath();ctx.ellipse(o.x-3,o.y-3,2.5,3.5,-.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ae8456';ctx.beginPath();ctx.moveTo(o.x,o.y-9);ctx.lineTo(o.x,o.y-15);ctx.stroke();
    }
    ctx.save();ctx.globalAlpha=nightMode?.72:1;
    state.snowmen.forEach(sm=>drawSnowman(ctx,sm,snowmanImage));ctx.restore();
  }
  function toggleFixed(id){
    backup();state.lit=state.lit||{};state.lit[id]=!state.lit[id];
    window.winterAudio?.play(state.lit[id]?'light':'tap');
    renderDecor();scheduleSave();toast(state.lit[id]?'灯りがともりました。':'灯りを消しました。');
  }
  function setNight(on){
    nightMode=on;
    if(on)closePanel();
    viewport.classList.toggle('night-viewing',on);
    paint.style.pointerEvents=on?'none':'auto';
    art.querySelectorAll('[data-light-id]').forEach(button=>button.inert=on);
    for(const selector of ['.storybook-ribbon','.storybook-palette','#storybookHome','#storybookTools'])$(selector).inert=on;
    $('#storybookNight').setAttribute('aria-pressed',String(on));
    $('#storybookNight').textContent=on?'制作に戻る':'夜の灯りを見る';
    $('#storybookNight').setAttribute('aria-label',on?'制作に戻る':'夜の灯りを見る');
    renderDecor();
  }
  function setMode(next){
    mode=next;
    document.querySelectorAll('[data-story-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.storyMode===next)));
    $('#storybookCaption').textContent={paint:'ツリーをなぞると、枝に色が宿ります。',ornament:'ツリーをタップして、灯りをともそう。',erase:'色を薄く、飾りはタップで外せます。',snowman:'手前の雪の地面をタップしてね。'}[next];
    paint.style.cursor=next==='paint'||next==='erase'?'crosshair':'pointer';
    closePanel();
  }
  function setColor(index){state.color=index;document.querySelectorAll('.storybook-swatch').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));scheduleSave()}
  function setSnow(on){state.snow=on;$('#storybookSnow').hidden=!on;$('#storybookSnowToggle').textContent=on?'雪を止める':'雪を降らせる';scheduleSave()}
  function openPanel(){const p=$('#storybookPanel');p.classList.add('open');p.inert=false;p.setAttribute('aria-hidden','false');$('#storybookTools').setAttribute('aria-expanded','true');$('#storybookPanelClose').focus()}
  function closePanel(){const p=$('#storybookPanel');p.classList.remove('open');p.inert=true;p.setAttribute('aria-hidden','true');$('#storybookTools').setAttribute('aria-expanded','false')}
  function endStroke(e){
    if(pendingPaintPointer===e.pointerId){
      pendingPaintPointer=null;
      try{paint.releasePointerCapture(e.pointerId)}catch{}
      if(e.type==='pointerup')toast('ツリーの枝をなぞってみてください。');
      return;
    }
    if(!activeStroke||activeStroke.pointer!==e.pointerId)return;
    activeStroke=null;scheduleSave();
    try{paint.releasePointerCapture(e.pointerId)}catch{}
  }
  function beginStroke(e,p){
    backup();
    window.winterAudio?.play('brush');
    const stroke={color:colors[state.color].value,size:state.brush,erase:mode==='erase',points:[[Math.round(p.x),Math.round(p.y)]]};
    state.strokes.push(stroke);activeStroke={pointer:e.pointerId,stroke};paint.setPointerCapture(e.pointerId);renderPaint();
  }
  paint.addEventListener('pointerdown',e=>{
    const p=atPoint(e);
    const fixed=fixedDecor.find(item=>Math.hypot(p.x-item.x,p.y-item.y)<item.r);
    if(fixed){e.preventDefault();toggleFixed(fixed.id);return}
    const placed=state.ornaments.findLast?.(o=>Math.hypot(p.x-o.x,p.y-o.y)<19)
      ||[...state.ornaments].reverse().find(o=>Math.hypot(p.x-o.x,p.y-o.y)<19);
    if(placed){
      e.preventDefault();backup();
      if(mode==='erase'){
        window.winterAudio?.play('page');
        state.ornaments.splice(state.ornaments.indexOf(placed),1);
        renderDecor();scheduleSave();toast('飾りを外しました。');
      }else{
        if(placed.on===false){
          const tone=placed.tone ?? window.winterAudio?.ornamentPitch(state.ornaments.indexOf(placed));
          window.winterAudio?.play('ornament',tone);
        }else window.winterAudio?.play('tap');
        placed.on=placed.on===false;renderDecor();scheduleSave();toast(placed.on?'飾りが光りました。':'飾りを消しました。');
      }
      return;
    }
    if(mode==='snowman'){
      if(!canPlaceSnowmanAt(p.x,p.y)){toast('雪だるまは手前の雪の地面に置いてください。');return}
      if(state.snowmen.length>=9){toast('雪だるまは9人まで置けます。');return}
      const next=groundedSnowman(p);
      if(state.snowmen.some(sm=>Math.abs(sm.x-next.x)<110&&Math.abs(sm.y-next.y)<95)){toast('そこにはもう雪だるまがいます。少し離して置いてください。');return}
      backup();state.snowmen.push(next);window.winterAudio?.play('gift');renderDecor();scheduleSave();setMode('paint');toast('雪だるまが庭に仲間入りしました。');return;
    }
    if(!canPaintAt(p.x,p.y)){
      if(mode==='paint'||mode==='erase'){
        pendingPaintPointer=e.pointerId;
        paint.setPointerCapture(e.pointerId);
      }else toast('ツリーの枝をなぞってみてください。');
      return;
    }
    e.preventDefault();
    if(mode==='ornament'){
      backup();const tone=window.winterAudio?.ornamentPitch(state.ornamentStep) ?? 74;
      state.ornamentStep++;
      state.ornaments.push({x:p.x,y:p.y,color:colors[state.color].value,on:true,tone});
      window.winterAudio?.play('ornament',tone);renderDecor();scheduleSave();return;
    }
    beginStroke(e,p);
  });
  paint.addEventListener('pointermove',e=>{
    if(pendingPaintPointer===e.pointerId){
      const p=atPoint(e);
      if(!canPaintAt(p.x,p.y))return;
      pendingPaintPointer=null;beginStroke(e,p);return;
    }
    if(activeStroke?.pointer!==e.pointerId)return;
    const p=atPoint(e);if(!canPaintAt(p.x,p.y))return;
    const points=activeStroke.stroke.points,last=points.at(-1);
    if(Math.hypot(p.x-last[0],p.y-last[1])<5)return;
    points.push([Math.round(p.x),Math.round(p.y)]);renderPaint();
  });
  paint.addEventListener('pointerup',endStroke);
  paint.addEventListener('pointercancel',endStroke);
  function undo(){if(!historyStack.length){toast('まだ戻せる操作はありません。');return}state=historyStack.pop();renderPaint();renderDecor();setSnow(state.snow);setColor(state.color);$('#storybookBrush').value=String(state.brush);$('#storybookBrushValue').textContent=String(state.brush);scheduleSave();toast('ひとつ前に戻しました。')}
  function reset(){
    const dialog=$('#confirmDialog');
    $('#confirmHeading').textContent='冬の庭を白紙に戻しますか？';
    $('#confirmDescription').textContent='塗った色、灯り、雪だるまを消して、絵本のはじめのページに戻します。';
    $('#confirmReset').textContent='白紙に戻す';
    $('#confirmReset').onclick=()=>{dialog.close();backup();state=blank();setNight(false);renderPaint();renderDecor();setSnow(true);setColor(0);$('#storybookBrush').value='34';$('#storybookBrushValue').textContent='34';scheduleSave();toast('白紙のツリーに戻しました。')};
    dialog.showModal();closePanel();
  }
  function getExportAssets(){
    if(exportAssetsPromise)return exportAssetsPromise;
    exportAssetsPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='assets/storybook-export-data.js?v=1';
      script.onerror=()=>reject(new Error('画像データを読み込めませんでした'));
      script.onload=()=>{
        const loadImage=src=>new Promise((done,fail)=>{
          if(!src){fail(new Error('画像データがありません'));return}
          const image=new Image();image.onload=()=>done(image);image.onerror=()=>fail(new Error('画像を開けませんでした'));image.src=src;
        });
        Promise.all([loadImage(window.STORYBOOK_EXPORT_SCENE_URL),loadImage(window.STORYBOOK_EXPORT_SNOWMAN_URL)])
          .then(([sceneImage,snowmanImage])=>resolve({sceneImage,snowmanImage}),reject);
      };
      document.head.append(script);
    }).catch(error=>{exportAssetsPromise=null;throw error});
    return exportAssetsPromise;
  }
  async function exportImage(){
    try{
      toast('画像を準備しています。');
      const {sceneImage,snowmanImage}=await getExportAssets();
      const out=document.createElement('canvas');out.width=WIDTH;out.height=HEIGHT;
      const c=out.getContext('2d');
      c.drawImage(sceneImage,0,0,WIDTH,HEIGHT);
      c.save();c.globalCompositeOperation='multiply';c.drawImage(paint,0,0);c.restore();
      c.drawImage(night,0,0);
      const safeDecor=document.createElement('canvas');safeDecor.width=WIDTH;safeDecor.height=HEIGHT;
      renderDecor(safeDecor.getContext('2d'),snowmanImage);
      c.drawImage(safeDecor,0,0);
      const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('画像を書き出せませんでした');
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='冬のアトリエ-絵本.png';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      toast('今の冬景色を画像にしました。');closePanel();
    }catch(error){console.error(error);toast('画像を保存できませんでした。もう一度お試しください。')}
  }
  function load(){
    try{
      const current=localStorage.getItem(STORAGE_KEY);
      const legacy=!current&&LEGACY_STORAGE_KEYS.map(key=>localStorage.getItem(key)).find(Boolean);
      if(current||legacy)state={...blank(),...JSON.parse(current||legacy)};
      if(legacy){state.lit={};state.ornaments=[];state.snowmen=[];state.color=0;scheduleSave()}
      if(location.hash.startsWith('#storybook=')){
        const token=location.hash.slice(11).replaceAll('-','+').replaceAll('_','/');
        const obj=JSON.parse(atob(token));
        state={...blank(),strokes:(obj.s||[]).slice(0,500).map(s=>({color:s[0],size:s[1],erase:!!s[2],points:s[3]})),ornaments:(obj.o||[]).slice(0,280),snowmen:(obj.m||[]).slice(0,9),lit:obj.l||{},snow:obj.n!==false};
        history.replaceState(null,'',location.href.split('#')[0]);scheduleSave();toast('共有された冬景色を開きました。');
      }
      state.ornamentStep=Math.max(Number(state.ornamentStep)||0,state.ornaments.length);
      state.color=clamp(Number(state.color)||0,0,colors.length-1);state.brush=clamp(Number(state.brush)||34,18,70);
      const previousSnowmen=state.snowmen;
      state.snowmen=(Array.isArray(state.snowmen)?state.snowmen:[]).filter(sm=>Number.isFinite(Number(sm.x))&&Number.isFinite(Number(sm.y))).slice(0,9).map(groundedSnowman);
      if(JSON.stringify(previousSnowmen)!==JSON.stringify(state.snowmen))scheduleSave();
    }catch(e){state=blank()}
  }
  function openGift(which){window.winterApp.openGift(which);closePanel()}
  function createSnow(){
    const box=$('#storybookSnow');
    for(let i=0;i<42;i++){
      const f=document.createElement('i');
      f.style.setProperty('--x',`${hash(i,1)*100}%`);f.style.setProperty('--size',`${2+hash(i,2)*3}px`);
      f.style.setProperty('--duration',`${8+hash(i,3)*11}s`);f.style.setProperty('--delay',`${-hash(i,4)*18}s`);
      f.style.setProperty('--drift',`${(hash(i,5)-.5)*130}px`);box.append(f);
    }
  }
  colors.forEach((color,i)=>{
    const b=document.createElement('button');b.type='button';b.className='storybook-swatch';b.style.setProperty('--swatch',color.value);b.setAttribute('aria-label',color.name);b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>setColor(i);$('#storybookPalette').append(b);
  });
  fixedDecor.forEach(item=>{
    const button=document.createElement('button');button.type='button';button.className='storybook-light-hotspot';
    button.dataset.lightId=item.id;button.setAttribute('aria-label',`${item.label}を点灯・消灯`);
    button.setAttribute('aria-pressed','false');button.title=`${item.label}を光らせる`;
    Object.assign(button.style,{left:`${item.x}px`,top:`${item.y}px`,width:`${item.r*2}px`,height:`${item.r*2}px`});
    button.onclick=()=>toggleFixed(item.id);art.append(button);
  });
  createSnow();load();renderPaint();renderDecor();setSnow(state.snow);setColor(state.color);
  window.winterAudio?.updateButton();
  $('#storybookBrush').value=String(state.brush);$('#storybookBrushValue').textContent=String(state.brush);
  $('#storybookBrush').oninput=e=>{state.brush=Number(e.target.value);$('#storybookBrushValue').textContent=e.target.value;scheduleSave()};
  document.querySelectorAll('[data-story-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.storyMode));
  $('#storybookHome').onclick=()=>window.winterApp.leaveStudio();
  $('#storybookSound').onclick=()=>window.winterAudio?.toggle();
  $('#storybookNight').onclick=()=>setNight(!nightMode);
  $('#storybookTools').onclick=()=>$('#storybookPanel').classList.contains('open')?closePanel():openPanel();
  $('#storybookPanelClose').onclick=closePanel;
  $('#storybookSnowToggle').onclick=()=>setSnow(!state.snow);
  $('#storybookSnowman').onclick=()=>setMode('snowman');
  $('#storybookUndo').onclick=undo;$('#storybookUndoQuick').onclick=undo;$('#storybookReset').onclick=reset;
  $('#storybookExport').onclick=exportImage;
  document.querySelectorAll('[data-story-gift]').forEach(b=>b.onclick=()=>openGift(b.dataset.storyGift));
  document.querySelectorAll('[data-panel-gift]').forEach(b=>b.onclick=()=>openGift(b.dataset.panelGift));
  window.addEventListener('resize',layoutArt);layoutArt();
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&$('#storybookPanel').classList.contains('open'))closePanel();
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&document.body.classList.contains('in-studio')&&!document.querySelector('dialog[open]')){e.preventDefault();undo()}
  });
})();
