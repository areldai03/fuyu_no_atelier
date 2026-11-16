(() => {
'use strict';

const $ = selector => document.querySelector(selector);
const TAU = Math.PI * 2;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CONTENT = window.WINTER_CONTENT || {};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const fract = value => value - Math.floor(value);
const hash = (x, y = 0, z = 0) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
let time = 0;

const coverSnowCanvas=document.getElementById('homeSnow');
const coverSnowCtx=coverSnowCanvas.getContext('2d',{alpha:true});
let coverSnow=[],coverW=0,coverH=0,coverDPR=1,lastCoverDraw=0;
function resetCoverSnow(){
 coverW=Math.max(1,innerWidth);coverH=Math.max(1,innerHeight);
 coverDPR=Math.min(devicePixelRatio||1,2);
 coverSnowCanvas.width=Math.round(coverW*coverDPR);
 coverSnowCanvas.height=Math.round(coverH*coverDPR);
 coverSnowCtx.setTransform(coverDPR,0,0,coverDPR,0,0);
 const count=Math.min(210,Math.max(66,Math.floor(coverW*coverH/6300)));
 coverSnow=Array.from({length:count},()=>makeCoverFlake(true));
}
function makeCoverFlake(full=false){
 const layer=Math.random(),s=layer*layer;
 return {x:Math.random()*coverW,y:full?Math.random()*coverH:-Math.random()*70-5,
   depth:layer,r:.65+s*2.5,vy:12+s*38,drift:5+s*11,
   wave:.22+Math.random()*.64,phase:Math.random()*Math.PI*2,
   alpha:.27+s*.58};
}
function updateCoverSnow(dt){
 if(reduced)return;
 for(const f of coverSnow){
  f.y+=f.vy*dt;
  f.x+=(2+Math.sin(time*f.wave+f.phase)*f.drift)*dt;
  if(f.y>coverH+6)Object.assign(f,makeCoverFlake(false));
  if(f.x>coverW+10)f.x=-8;
 }
}
function drawCoverSnow(){
 if(!coverW||!coverH)return;
 const c=coverSnowCtx;c.clearRect(0,0,coverW,coverH);
 for(const f of coverSnow){
  c.globalAlpha=f.alpha;
  c.fillStyle=f.depth>.70?'#fff8e9':'#e6f5fb';
  c.beginPath();c.arc(f.x,f.y,f.r,0,Math.PI*2);c.fill();
  if(f.depth>.87){
   c.globalAlpha=f.alpha*.43;c.lineWidth=.7;c.strokeStyle='#f8fbff';
   c.beginPath();c.moveTo(f.x-f.r*2.2,f.y);c.lineTo(f.x+f.r*2.2,f.y);
   c.moveTo(f.x,f.y-f.r*2.2);c.lineTo(f.x,f.y+f.r*2.2);c.stroke();
  }
 }
 c.globalAlpha=1;
}


let studioActive = false;
let pageTurning = false;
let bookPage = 0;
const letter = CONTENT.letter || {body:'お手紙は準備中です。'};
const game = {active:false,started:false,over:false,score:0,t:0,playerX:240,objects:[],spawn:0,move:0,catchFlash:0,canvas:null,ctx:null};

function setStudio(active) {
  studioActive = active;
  document.body.classList.toggle('in-studio', active);
  $('#studio').inert = !active;
  $('#home').inert = active;
  if (active) $('#home').setAttribute('aria-hidden', 'true');
  else $('#home').removeAttribute('aria-hidden');
}

function enterStudio() {
  if (pageTurning) return;
  window.winterAudio?.enter();
  if (!reduced) {
    pageTurning = true;
    document.body.classList.add('page-turning-forward');
  }
  setStudio(true);
  if (!reduced) setTimeout(() => {
    document.body.classList.remove('page-turning-forward');
    pageTurning = false;
    $('#storybookHome')?.focus({preventScroll:true});
  }, 1300);
}

function leaveStudio() {
  if (pageTurning) return;
  window.winterAudio?.leave();
  if (reduced) {
    setStudio(false);
    $('#enterButton').focus({preventScroll:true});
    return;
  }
  pageTurning = true;
  $('#home').inert = false;
  $('#home').removeAttribute('aria-hidden');
  document.body.classList.add('page-turning-back');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('page-turning-back-open')));
  setTimeout(() => {
    setStudio(false);
    document.body.classList.remove('page-turning-back', 'page-turning-back-open');
    pageTurning = false;
    $('#enterButton').focus({preventScroll:true});
  }, 1300);
}

function updateGame(dt){
 if(!game.started||game.over)return;
 game.t+=dt;game.playerX=clamp(game.playerX+game.move*dt*300,28,452);game.catchFlash=Math.max(0,game.catchFlash-dt);
 game.spawn-=dt;if(game.spawn<=0){game.spawn=rand(.48,.78);game.objects.push({x:rand(34,446),y:-25,vy:rand(115,165),phase:rand(0,TAU),angle:rand(-.13,.13)})}
 for(let i=game.objects.length-1;i>=0;i--){const s=game.objects[i];s.y+=s.vy*dt;s.x+=Math.sin(game.t*2+s.phase)*dt*5;
  if(s.y>221&&s.y<268&&Math.abs(s.x-game.playerX)<30){game.score++;game.catchFlash=.55;game.objects.splice(i,1);updateGameScore();window.winterAudio?.play('catch');continue}
  if(s.y>320)game.objects.splice(i,1);
 }
 if(game.t>=24){game.over=true;game.started=false;updateGameScore()}
}
function updateGameScore(){
 const count=$('#gameScore'),result=$('#gameResult');
 if(count)count.textContent=`${game.score}こ`;
 if(result)result.textContent=game.over?`24秒で ${game.score}こ 拾えました。`:'プレゼントを拾うと数が増えます。';
}
const gameArt=new Image();gameArt.src='assets/game-forest.png';
const gameSanta=new Image();gameSanta.src='assets/santa-watercolor.png';
const gamePresent=new Image();gamePresent.src='assets/game-present.png';
for(const art of [gameArt,gameSanta,gamePresent])art.onload=()=>{if(game.active)drawGame()};
function drawGamePaper(c,x,y,w,h,r){
 c.save();c.shadowColor='rgba(26,35,43,.28)';c.shadowBlur=9;c.shadowOffsetY=3;
 c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
 c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);
 c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
 c.fillStyle='rgba(247,233,203,.92)';c.fill();c.shadowColor='transparent';
 c.strokeStyle='rgba(137,100,70,.75)';c.lineWidth=1.4;c.stroke();c.restore();
}
function drawGame(){
 if(!game.ctx)return;const c=game.ctx,w=480,h=295;
 c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;
 if(gameArt.complete&&gameArt.naturalWidth){
  const iw=gameArt.naturalWidth,ih=gameArt.naturalHeight,sw=Math.min(iw,ih*w/h);
  c.drawImage(gameArt,(iw-sw)/2,0,sw,ih,0,0,w,h);
 }else{c.fillStyle='#173548';c.fillRect(0,0,w,h)}
 for(let i=0;i<24;i++){
  const x=hash(i,3)*w,y=(hash(i,8)*h+time*9*(.4+hash(i,12)))%h;
  c.fillStyle='rgba(255,250,237,.62)';c.beginPath();c.arc(x,y,.8+hash(i,9)*1.2,0,TAU);c.fill();
 }
 if(gameSanta.complete&&gameSanta.naturalWidth){
  const sh=91,sw=sh*gameSanta.naturalWidth/gameSanta.naturalHeight;
  c.drawImage(gameSanta,game.playerX-sw/2,191,sw,sh);
 }
 if(game.catchFlash>0){
  const glow=c.createRadialGradient(game.playerX,241,4,game.playerX,241,66);
  glow.addColorStop(0,`rgba(255,238,171,${game.catchFlash})`);glow.addColorStop(1,'rgba(255,238,171,0)');
  c.fillStyle=glow;c.beginPath();c.arc(game.playerX,241,66,0,TAU);c.fill();
 }
 for(const s of game.objects){
  if(gamePresent.complete&&gamePresent.naturalWidth){c.save();c.translate(s.x,s.y);c.rotate(s.angle);c.drawImage(gamePresent,-19,-21,38,38);c.restore()}
 }
 drawGamePaper(c,5,4,w-10,32,8);
 c.fillStyle='#4d4037';c.font='bold 15px serif';c.fillText('プレゼントをあつめよう！',13,25);
 c.font='bold 14px serif';c.fillText(`${game.score}こ`,340,25);
 c.font='bold 13px sans-serif';c.fillText(`あと${Math.max(0,Math.ceil(24-game.t))}秒`,402,25);
 if(!game.started){
  drawGamePaper(c,44,76,392,109,12);
  c.fillStyle='#46382d';c.textAlign='center';c.font='bold 23px serif';
  c.fillText(game.over?'おしまい！':'サンタのプレゼントあつめ',240,122);
  c.font='15px sans-serif';c.fillText(game.over?`拾ったプレゼント：${game.score}こ`:'24秒でいくつ拾えるかな？',240,153);c.textAlign='left';
 }
}
function startGame(){game.active=true;game.started=true;game.over=false;game.score=0;game.t=0;game.playerX=240;game.objects=[];game.spawn=.35;game.move=0;game.catchFlash=0;updateGameScore();drawGame()}
function gamePointer(e){if(!game.active||!game.canvas)return;const r=game.canvas.getBoundingClientRect();game.playerX=clamp((e.clientX-r.left)/r.width*480,25,455)}
function bookArt(i){
  const labels=['少年が雪の森で白いツリーを見つける','少年が筆で枝に冬の色を重ねる','灯りがともったツリーの前で少年と雪だるまが並ぶ'];
  const page=i%3+1;
  return `<img class="storybook-book-picture" src="assets/story-page-${page}.png" alt="${labels[i%3]}" width="1672" height="941">`;
 }
 const BOOK=Array.isArray(CONTENT.book)&&CONTENT.book.length?CONTENT.book:[{title:'第1ページ',text:'準備中です。'}];
function showBookPage(){
 const data=BOOK[bookPage],el=$('#bookContainer');if(!el)return;
 el.innerHTML=`<div class="book-page"><div class="book-illustration">${bookArt(bookPage)}</div><h3 id="bookTitle"></h3><p id="bookText"></p></div><div class="book-navigation"><button id="bookPrev" ${bookPage===0?'disabled':''}>前のページ</button><span>${bookPage+1} / ${BOOK.length}</span><button id="bookNext" ${bookPage===BOOK.length-1?'disabled':''}>次のページ</button></div>`;
 $('#bookTitle').textContent=data.title||'';$('#bookText').textContent=data.text||'';
 $('#bookPrev').onclick=()=>{bookPage--;showBookPage()};$('#bookNext').onclick=()=>{bookPage++;showBookPage()};
}
function renderLetter(){const b=$('#letterBody');if(b)b.textContent=letter.body}
function openGift(which){
 const modal=$('#giftDialog');$('#giftContent').replaceChildren();game.active=false;
 if(which==='game'){
  $('#giftEyebrow').textContent='ゲーム';
  $('#giftContent').innerHTML=`<div class="gift-body game-body"><h2 id="giftHeading">サンタのプレゼントあつめ</h2><p>24秒でいくつ拾えるかな？<br>パソコンは左右キー、スマホは指でサンタを動かしてね。</p><div class="game-score" role="status" aria-live="polite"><span>ひろった数</span><strong id="gameScore">0こ</strong><small id="gameResult">プレゼントを拾うと数が増えます。</small></div><canvas id="gameCanvas" width="480" height="295" aria-label="落ちてくるプレゼントを集めるサンタのミニゲーム"></canvas><div class="game-controls"><strong>プレゼントを受けとろう！</strong><button id="gameLeft" aria-label="左に移動">←</button><button id="gameRight" aria-label="右に移動">→</button><button class="modal-primary" id="gameStart">はじめる</button></div></div>`;
  game.canvas=$('#gameCanvas');game.ctx=game.canvas.getContext('2d');game.active=true;game.started=false;game.over=false;game.t=0;game.score=0;game.objects=[];game.catchFlash=0;
  game.canvas.addEventListener('pointerdown',gamePointer);game.canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')gamePointer(e)});
  for(const [id,dir] of [['#gameLeft',-1],['#gameRight',1]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();game.move=dir});['pointerup','pointerleave','pointercancel'].forEach(k=>b.addEventListener(k,()=>game.move=0))}
  $('#gameStart').onclick=()=>{startGame();$('#gameStart').textContent='もう一度'};
  drawGame();
 } else if(which==='book'){
  $('#giftEyebrow').textContent='絵本';
  $('#giftContent').innerHTML=`<div class="gift-body"><h2 id="giftHeading">小さな絵本</h2><div id="bookContainer"></div></div>`;
  bookPage=0;showBookPage();
 }else{
  $('#giftEyebrow').textContent='手紙';
  $('#giftContent').innerHTML=`<div class="gift-body"><h2 id="giftHeading">ツリーを灯したあなたへ</h2><article class="letter-paper"><p id="letterBody"></p></article></div>`;
  renderLetter();
 }
 modal.showModal();
}


function tick(timestamp) {
  if (!tick.previous) tick.previous = timestamp;
  const dt = clamp((timestamp - tick.previous) / 1000, 0, .045);
  tick.previous = timestamp;
  time += dt;
  if (!studioActive && (reduced ? lastCoverDraw === 0 : timestamp - lastCoverDraw >= (innerWidth < 650 ? 1000 / 30 : 1000 / 40))) {
    updateCoverSnow(dt);
    drawCoverSnow();
    lastCoverDraw = timestamp || 1;
  }
  if (game.active) {
    updateGame(dt);
    drawGame();
  }
  requestAnimationFrame(tick);
}

$('#enterButton').addEventListener('click', enterStudio);
$('#giftDialog').addEventListener('close', () => { game.active = false; game.move = 0; });
document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog').close());
});
$('#cancelReset').addEventListener('click', () => $('#confirmDialog').close());
window.addEventListener('keydown', event => {
  if (!game.active) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    game.move = event.key === 'ArrowLeft' ? -1 : 1;
  }
});
window.addEventListener('keyup', event => {
  if (game.active && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) game.move = 0;
});
window.addEventListener('resize', resetCoverSnow);
window.winterApp = {openGift, leaveStudio};
resetCoverSnow();
requestAnimationFrame(tick);
})();
