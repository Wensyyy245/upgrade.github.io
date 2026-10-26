/* UPGRADER — клиентская логика. Данные: js/data_loader.js */

const State = {
  balance: 1000,
  profile: { name:'User_'+Math.floor(Math.random()*90000+10000), totalWon:0, totalBet:0, gamesPlayed:0, gameHistory:[], inventory:[] },
  upgrade: { source:null, target:null, chance:50, rolling:false },
  crash: { rolling:false, mult:1, crashPoint:0, bet:0, cashedOut:false, t0:0, history:[] },
  mines: { active:false, mines:[], revealed:[], count:5, bet:0, opened:0, mult:1 }
};

const RC = { milspec:'#4b69ff', restricted:'#8847ff', classified:'#d32ce6', covert:'#eb4b4b', knife:'#e4ae39' };
const ADMIN_PASS = '123321';
const SELL_RATE = 0.85;

/* ===== УТИЛИТЫ ===== */
function fmt(n){ return Number(n||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtInt(n){ return Math.round(Number(n)||0).toLocaleString('ru-RU'); }
function icons(){ try{ lucide.createIcons(); }catch(e){} }

function loadState(){
  try{ const raw=localStorage.getItem('upgrader_v3');
    if(raw){ const s=JSON.parse(raw); State.balance=typeof s.balance==='number'?s.balance:1000; Object.assign(State.profile,s.profile||{}); }
  }catch(e){}
}
function saveState(){ localStorage.setItem('upgrader_v3', JSON.stringify({balance:State.balance,profile:State.profile})); }

/* ===== ДАННЫЕ ===== */
function normSkin(s){
  if(!s) return null;
  if(s.weapon!==undefined) return s;
  return { id:s.id, weapon:s.w, short_weapon:s.w, skin:s.n, price:s.p, category:s.c, image:s.i, name:(s.w||'')+' | '+(s.n||'') };
}
function normalizeData(){
  const d=window.CS2_DATA; if(!d||d.__n) return;
  d.skins=(d.skins||[]).map(normSkin).filter(Boolean);
  (d.cases||[]).forEach(c=>{ c.pool=(c.pool||[]).map(normSkin).filter(Boolean); c.rare_pool=(c.rare||[]).map(normSkin).filter(Boolean); delete c.rare; });
  d.__n=true;
}
function allSkins(){ return (window.CS2_DATA&&window.CS2_DATA.skins)||[]; }
function allCases(){ return (window.CS2_DATA&&window.CS2_DATA.cases)||[]; }

/* ===== БАЛАНС (с анимацией цифр) ===== */
let shownBalance = null;
function updateBalanceDisplay(animate=true){
  const el=document.getElementById('balanceDisplay');
  const pb=document.getElementById('profileBalance');
  if(pb) pb.textContent='$'+fmt(State.balance);
  if(!el) return;
  if(!animate || shownBalance===null || Math.abs(shownBalance-State.balance)<0.01){
    el.textContent=fmt(State.balance); shownBalance=State.balance; return;
  }
  const from=shownBalance, to=State.balance, t0=performance.now(), dur=650;
  (function step(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=fmt(from+(to-from)*e);
    if(p<1) requestAnimationFrame(step); else { el.textContent=fmt(to); shownBalance=to; }
  })(t0);
}

/* ===== НАВИГАЦИЯ ===== */
document.addEventListener('click', e=>{
  const nav=e.target.closest('.nav-btn'); if(nav&&nav.dataset.page) showPage(nav.dataset.page);
  if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
  const mb=e.target.closest('.multiplier-btn'); if(mb&&mb.dataset.chance) setUpgradeChance(+mb.dataset.chance);
});

function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('page-'+page); if(!el) return;
  el.classList.add('active');
  const btn=document.querySelector('.nav-btn[data-page="'+page+'"]'); if(btn) btn.classList.add('active');
  if(page==='upgrade') initUpgrade();
  if(page==='cases') initCases();
  if(page==='crash') initCrash();
  if(page==='mines') initMines();
  if(page==='inventory') renderInventory();
  if(page==='profile') initProfile();
  if(page==='admin') initAdmin();
  icons();
}

function openModal(n){ const m=document.getElementById('modal-'+n); if(m){m.classList.add('active'); icons();} }
function closeModal(n){ document.getElementById('modal-'+n)?.classList.remove('active'); }

/* ===== УВЕДОМЛЕНИЯ ===== */
function notify(msg,type='info'){
  const box=document.getElementById('notifications'); if(!box) return;
  const n=document.createElement('div'); n.className='notification '+type; n.textContent=msg;
  box.appendChild(n);
  setTimeout(()=>{ n.style.transition='0.3s'; n.style.opacity='0'; n.style.transform='translateX(40px)'; setTimeout(()=>n.remove(),300); },4000);
}

/* ===== КОНФЕТТИ ===== */
const Confetti={ parts:[], raf:null, canvas:null,
  fire(count=140){
    const c=this.canvas||document.getElementById('confetti'); if(!c) return;
    this.canvas=c; const ctx=c.getContext('2d');
    const resize=()=>{c.width=innerWidth;c.height=innerHeight;};
    resize(); window.addEventListener('resize',resize,{once:true});
    const cols=['#ffc63c','#ff9d0a','#2ee6a8','#a15cff','#3ea6ff','#ff4d5e','#ffffff'];
    for(let i=0;i<count;i++){
      this.parts.push({ x:innerWidth/2+(Math.random()-0.5)*260, y:innerHeight*0.32,
        vx:(Math.random()-0.5)*13, vy:Math.random()*-13-4, g:0.34+Math.random()*0.2,
        w:5+Math.random()*7, h:8+Math.random()*10, rot:Math.random()*6.28, vr:(Math.random()-0.5)*0.4,
        col:cols[Math.floor(Math.random()*cols.length)], life:1 });
    }
    if(this.raf) return;
    const loop=()=>{
      ctx.clearRect(0,0,c.width,c.height);
      this.parts=this.parts.filter(p=>p.life>0);
      this.parts.forEach(p=>{
        p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.vx*=0.995;
        if(p.y>c.height*0.92) p.life-=0.05;
        if(p.y>c.height) p.life=0;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.col;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      if(this.parts.length){ this.raf=requestAnimationFrame(loop); }
      else { cancelAnimationFrame(this.raf); this.raf=null; ctx.clearRect(0,0,c.width,c.height); }
    };
    this.raf=requestAnimationFrame(loop);
  }
};

/* ===== 3D TILT ===== */
function bindTilt(){
  document.querySelectorAll('.tilt').forEach(el=>{
    if(el.__tilt) return; el.__tilt=1;
    el.addEventListener('mousemove',ev=>{
      const r=el.getBoundingClientRect();
      const px=(ev.clientX-r.left)/r.width-0.5, py=(ev.clientY-r.top)/r.height-0.5;
      el.style.transform=`perspective(900px) rotateX(${(-py*9).toFixed(2)}deg) rotateY(${(px*9).toFixed(2)}deg) translateY(-6px)`;
    });
    el.addEventListener('mouseleave',()=>{ el.style.transform=''; });
  });
}

/* ===== ИКОНКА ОРУЖИЯ (фолбэк) ===== */
function weaponGlyph(w){
  const l=(w||'').toLowerCase();
  if(l.includes('knife')||l.includes('bayonet')||l.includes('★')) return '<i data-lucide="sword"></i>';
  if(l.includes('glove')||l.includes('wrap')||l.includes('hand')) return '<i data-lucide="hand"></i>';
  if(l.includes('awp')||l.includes('scar')||l.includes('g3sg1')||l.includes('ssg')) return '<i data-lucide="crosshair"></i>';
  if(l.includes('nova')||l.includes('xm1014')||l.includes('mag-7')||l.includes('sawed')) return '<i data-lucide="zap"></i>';
  if(l.includes('negev')||l.includes('m249')) return '<i data-lucide="flame"></i>';
  return '<i data-lucide="target"></i>';
}

/* ===== КАРТОЧКА СКИНА ===== */
function skinCardHTML(skin, extra='', actions=''){
  const color=RC[skin.category]||RC.milspec;
  const name=(skin.short_weapon||skin.weapon||'').replace('★','').trim();
  const star=skin.category==='knife'?'★ ':'';
  const label=star+name+' | '+(skin.skin||'');
  const key=skin.uid||skin.id;
  return `<div class="skin-card ${extra}" data-key="${key}">
    <div class="rarity-bar" style="background:${color};box-shadow:0 0 10px ${color}"></div>
    <div class="skin-image">
      <div class="weapon-bg" style="background:radial-gradient(ellipse at center, ${color}55, transparent 70%)"></div>
      <img src="${skin.image}" loading="lazy" alt="${label}" onerror="this.style.display='none'">
      <span class="weapon-glyph">${weaponGlyph(skin.weapon)}</span>
    </div>
    <div class="skin-name" title="${label}">${label}</div>
    <div class="skin-price">${fmt(skin.price)} <span class="coin-sm"></span></div>
    ${actions}
  </div>`;
}

function bindSkinCards(cid, getList, handler){
  const box=document.getElementById(cid); if(!box) return;
  box.querySelectorAll('.skin-card').forEach(card=>{
    card.addEventListener('click',ev=>{
      if(ev.target.closest('button[data-act]')) return;
      const s=getList().find(x=>(x.uid||x.id)===card.dataset.key); if(s) handler(s,card);
    });
  });
}

/* ===== ИСТОРИЯ ===== */
function addGameHistory(game,bet,result,payout){
  State.profile.gamesPlayed++; State.profile.totalBet+=bet;
  if(result==='win') State.profile.totalWon+=Math.max(0,payout-bet);
  State.profile.gameHistory.push({ time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}), game, bet, result, amount:payout });
  if(State.profile.gameHistory.length>200) State.profile.gameHistory=State.profile.gameHistory.slice(-200);
  saveState();
}
function addToInventory(skin){
  State.profile.inventory.push({...skin, uid:skin.id+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6)});
  if(State.profile.inventory.length>300) State.profile.inventory.shift();
  saveState();
}

/* ============================================================
   ГЛАВНАЯ
   ============================================================ */
function initHome(){
  const feed=document.getElementById('recentWins'); if(!feed) return;
  const skins=allSkins().filter(s=>s.price>20).slice(0,400);
  const names=['s1mple_pl','NiKo_fan','dev'+Math.floor(Math.random()*99),'KrimZ','AleksiT','BoGDaN','iM_Zen','frost__','Vitaly_B','Donk_2k','m0NESY_y','ropz_eu'];
  const games=['Upgrade','Kilowatt Case','Recoil Case','Crash','Mines','Gallery Case','Dreams & Nightmares','Fever Case'];
  feed.innerHTML='';
  for(let i=0;i<12;i++){
    const s=skins[Math.floor(Math.random()*Math.max(1,skins.length))]||{short_weapon:'AWP',skin:'Asiimov',price:41.1,category:'covert'};
    const tr=document.createElement('tr'); tr.style.animation=`fadeUp 0.45s ease-out ${i*0.035}s backwards`;
    tr.innerHTML=`<td><span class="feed-user">${names[i%names.length]}</span></td>
      <td style="color:var(--txt2)">${games[i%games.length]}</td>
      <td><span class="feed-rarity" style="background:${RC[s.category]||RC.milspec}"></span>${(s.short_weapon||'').replace('★','').trim()} | ${s.skin}</td>
      <td class="win">$${fmt(s.price)}</td>`;
    feed.appendChild(tr);
  }
}

/* ============================================================
   АПГРЕЙД — колесо с падающей стрелкой
   ============================================================ */
const WR=118, WC=150;
function polar(r,a){ const p=(a-90)*Math.PI/180; return {x:WC+r*Math.cos(p),y:WC+r*Math.sin(p)}; }
function arcPath(r,from,to){ const s=polar(r,to),e=polar(r,from),lg=Math.abs(to-from)<=180?0:1;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${lg} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`; }

function upgradeChance(){
  const s=State.upgrade.source,t=State.upgrade.target;
  if(s&&t&&t.price>0) return Math.max(1,Math.min(95,(s.price/t.price)*100*0.97));
  return State.upgrade.chance;
}

function renderUpgradeWheel(chance){
  const win=document.getElementById('wheelWinArc'), fail=document.getElementById('wheelFailArc');
  const ticks=document.getElementById('wheelTicks'), labels=document.getElementById('wheelLabels'), big=document.getElementById('upgradeChanceBig');
  if(ticks){ let o=''; for(let i=0;i<72;i++){ const a=i*5,maj=i%6===0,p1=polar(WR+10,a),p2=polar(WR+(maj?20:16),a);
      o+=`<line class="wheel-tick${maj?' major':''}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"/>`; }
    ticks.innerHTML=o; }
  if(labels){ labels.innerHTML=[{t:'100%',a:0},{t:'50%',a:90},{t:'50%',a:270},{t:'0%',a:180}]
      .map(l=>{const p=polar(WR+32,l.a);return `<text class="wheel-label" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}">${l.t}</text>`;}).join(''); }
  const half=chance*1.8;
  if(win){ win.setAttribute('d',half>0.4?arcPath(WR,180-half,180+half):'');
    win.style.stroke=chance>=45?'url(#winGrad)':(chance>=60?'var(--green)':chance>=25?'var(--gold)':'var(--red)'); }
  if(fail) fail.setAttribute('d',half<179.6?arcPath(WR,180+half,180-half+360):'');
  if(big){ big.textContent=chance.toFixed(2)+'%'; big.style.color=chance>=60?'var(--green)':chance>=25?'var(--gold)':'var(--red)'; }
}

function initUpgrade(){ renderUpgradeInventory(); renderUpgradeMarket(); renderUpgradePanels(); updateUpgradeUI(); }

function renderUpgradeInventory(){
  const box=document.getElementById('mySkins'); if(!box) return;
  const list=State.profile.inventory.slice(-24).reverse();
  if(!list.length){
    box.innerHTML=`<div class="empty-hint">Инвентарь пуст — открой кейсы или возьми стартовые скины.<br>
      <button class="btn btn-primary btn-sm mt-16" onclick="giveStarterSkins()">Выдать стартовые скины</button></div>`;
    return;
  }
  box.innerHTML=list.map(s=>skinCardHTML(s, State.upgrade.source&&(State.upgrade.source.uid||State.upgrade.source.id)===(s.uid||s.id)?'selected':'')).join('');
  bindSkinCards('mySkins',()=>State.profile.inventory.slice(-24).reverse(),selectUpgradeSource);
  icons();
}

function renderUpgradeMarket(){
  const box=document.getElementById('availableSkins'); if(!box) return;
  const pop=allSkins().filter(s=>s.price>=3&&s.price<=3000).slice(0,60);
  box.innerHTML=pop.map(s=>skinCardHTML(s, State.upgrade.target&&State.upgrade.target.id===s.id?'selected':'')).join('');
  bindSkinCards('availableSkins',()=>allSkins().filter(s=>s.price>=3&&s.price<=3000).slice(0,60),selectUpgradeTarget);
  icons();
}

function giveStarterSkins(){
  const pool=allSkins().filter(s=>s.price>=2&&s.price<=60&&s.category!=='knife');
  for(let i=0;i<5;i++){ const s=pool[Math.floor(Math.random()*pool.length)]; if(s) addToInventory(s); }
  notify('Выдано 5 случайных скинов','success'); initUpgrade();
}

function selectUpgradeSource(skin,card){
  State.upgrade.source=skin;
  document.querySelectorAll('#mySkins .skin-card').forEach(c=>c.classList.remove('selected'));
  card.classList.add('selected'); autoSelectTarget(); renderUpgradePanels(); updateUpgradeUI();
}
function selectUpgradeTarget(skin,card){
  State.upgrade.target=skin;
  document.querySelectorAll('#availableSkins .skin-card').forEach(c=>c.classList.remove('selected'));
  card.classList.add('selected'); renderUpgradePanels(); updateUpgradeUI();
}
function autoSelectTarget(){
  const src=State.upgrade.source; if(!src) return;
  const want=src.price*(100/State.upgrade.chance);
  const pool=allSkins().filter(s=>s.price>src.price*1.05); if(!pool.length) return;
  pool.sort((a,b)=>Math.abs(a.price-want)-Math.abs(b.price-want));
  State.upgrade.target=pool[0];
}
function renderUpgradePanels(){
  const l=document.getElementById('upgradeLeft'), r=document.getElementById('upgradeRight');
  if(l) l.innerHTML=State.upgrade.source?skinCardHTML(State.upgrade.source,'big'):'<div class="empty-hint">Выберите скин слева<br><small>«Мои скины»</small></div>';
  if(r) r.innerHTML=State.upgrade.target?skinCardHTML(State.upgrade.target,'big'):'<div class="empty-hint">Выберите цель<br><small>«База CS2»</small></div>';
  icons();
}
function updateUpgradeUI(){
  const s=State.upgrade.source,t=State.upgrade.target;
  const sum=document.getElementById('upgradeSum'), rew=document.getElementById('upgradeReward');
  if(sum) sum.textContent=s?'$'+fmt(s.price):'$0.00';
  if(rew) rew.textContent=t?'$'+fmt(t.price):'$0.00';
  renderUpgradeWheel(upgradeChance());
}
function setUpgradeChance(p){
  State.upgrade.chance=p;
  document.querySelectorAll('[data-chance]').forEach(b=>b.classList.toggle('active',+b.dataset.chance===p));
  autoSelectTarget(); renderUpgradePanels(); updateUpgradeUI();
}

function startUpgrade(){
  if(State.upgrade.rolling) return;
  const src=State.upgrade.source, tgt=State.upgrade.target;
  if(!src||!tgt) return notify('Выберите оба скина','error');
  if(tgt.price<=src.price) return notify('Цель должна быть дороже источника','error');
  if(State.balance<src.price) return notify('Недостаточно средств','error');

  State.upgrade.rolling=true; State.balance-=src.price; updateBalanceDisplay();
  const chance=upgradeChance(), won=Math.random()*100<chance;
  const btn=document.getElementById('upgradeBtn'); if(btn){ btn.disabled=true; btn.innerHTML='<i data-lucide="loader-2"></i>КРУТИМ...'; icons(); }
  dropWheelArrow(won,chance,()=>finishUpgrade(won,src,tgt,chance));
}

function dropWheelArrow(won,chance,done){
  const arrow=document.getElementById('wheelArrow'), wrap=document.getElementById('upgradeCircle'), v=document.getElementById('wheelVerdict');
  if(!arrow){ done(); return; }
  const half=chance*1.8, center=180;
  let final;
  if(won){ const sp=Math.max(1,half*0.82); final=center+(Math.random()*2-1)*sp; }
  else { const ff=center+half, fs=360-half*2; final=ff+Math.random()*Math.max(1,fs-5); }
  final=((final%360)+360)%360;

  arrow.classList.remove('hit','miss'); wrap.classList.remove('win-flash','lose-flash'); wrap.classList.add('rolling');
  if(v){ v.className='wheel-verdict'; v.textContent=''; }

  const SPINS=5, dur=3400, t0=performance.now(), to=SPINS*360+final;
  const easeOutQuart=p=>1-Math.pow(1-p,4);
  (function frame(t){
    const p=Math.min(1,(t-t0)/dur);
    arrow.style.transform='rotate('+(to*easeOutQuart(p)).toFixed(2)+'deg)';
    if(p<1){ requestAnimationFrame(frame); return; }
    wrap.classList.remove('rolling');
    arrow.style.transform='rotate('+final.toFixed(2)+'deg)';
    arrow.classList.add(won?'hit':'miss');
    if(v){ v.textContent=won?'УСПЕХ!':'МИМО'; v.className='wheel-verdict show '+(won?'ok':'no'); }
    wrap.classList.add(won?'win-flash':'lose-flash');
    if(won) Confetti.fire(120);
    setTimeout(done,950);
  })(performance.now());
}

function finishUpgrade(won,src,tgt,chance){
  const idx=State.profile.inventory.findIndex(s=>s.uid===src.uid);
  if(idx!==-1) State.profile.inventory.splice(idx,1);
  if(won){
    addToInventory(tgt); addGameHistory('Upgrade',src.price,'win',tgt.price);
    notify('Апгрейд удался! '+tgt.weapon+' | '+tgt.skin+' ($'+fmt(tgt.price)+')','success');
  } else {
    addGameHistory('Upgrade',src.price,'loss',0);
    notify('Апгрейд не удался (шанс был '+chance.toFixed(1)+'%)','error');
  }
  saveState(); updateBalanceDisplay();
  State.upgrade.source=null; State.upgrade.target=null; State.upgrade.rolling=false;
  const btn=document.getElementById('upgradeBtn'); if(btn){ btn.disabled=false; btn.innerHTML='<i data-lucide="zap"></i>Улучшить'; icons(); }
  setTimeout(()=>{
    const v=document.getElementById('wheelVerdict'); if(v){ v.className='wheel-verdict'; v.textContent=''; }
    const a=document.getElementById('wheelArrow'); if(a){ a.classList.remove('hit','miss'); a.style.transform='rotate(0deg)'; }
  },1400);
  initUpgrade();
}

/* ============================================================
   КЕЙСЫ
   ============================================================ */
function initCases(){
  const grid=document.getElementById('casesGrid'); if(!grid) return;
  const cases=allCases().filter(c=>c.pool&&c.pool.length>=5).slice(0,24);
  grid.innerHTML=cases.map((c,i)=>{
    const best=[...c.pool,...(c.rare_pool||[])].sort((a,b)=>b.price-a.price)[0];
    const knives=c.pool.filter(s=>s.category==='knife').length;
    return `<div class="case-card" data-idx="${i}" style="animation:fadeUp .45s ease-out ${i*0.035}s backwards">
      <div class="case-image"><img src="${c.image}" loading="lazy" alt="${c.name}" onerror="this.remove()"><span class="case-glyph"><i data-lucide="package"></i></span></div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${fmt(c.price)} <span style="font-size:13px">$</span></div>
      <div class="case-drop">Топ-дроп: ${(best.short_weapon||'').replace('★','').trim()} | ${best.skin}<br>$${fmt(best.price)} ${knives?'· ножей: '+knives:''}</div>
      <button class="btn btn-primary" style="width:100%"><i data-lucide="key"></i>Открыть кейс</button>
    </div>`;
  }).join('');
  grid.querySelectorAll('.case-card').forEach(card=>card.addEventListener('click',()=>openCaseModal(cases[+card.dataset.idx])));
  icons();
}

function openCaseModal(c){
  const body=document.getElementById('caseModalBody'); if(!body) return;
  body.innerHTML=`<div class="case-modal-head">
      <img src="${c.image}" onerror="this.remove()">
      <div><div class="case-modal-name">${c.name}</div><div class="case-modal-price">${fmt(c.price)} $</div></div>
    </div>
    <div class="drop-list">${c.pool.slice(0,16).map(s=>
      `<div class="drop-row" style="--rc:${RC[s.category]}"><span class="drop-name">${(s.short_weapon||'').replace('★','').trim()} | ${s.skin}</span><span class="drop-price">$${fmt(s.price)}</span></div>`).join('')}</div>
    <button class="btn btn-primary btn-lg" style="width:100%;margin-top:16px" onclick="spinCase('${c.id}')"><i data-lucide="key"></i>Открыть за ${fmt(c.price)} $</button>`;
  document.getElementById('caseResult').classList.add('hidden');
  openModal('case'); icons();
}

function pickCaseDrop(c){
  const pool=c.pool, w={milspec:79.92,restricted:15.98,classified:3.2,covert:0.64,knife:0.26};
  const b={}; pool.forEach(s=>{(b[s.category]=b[s.category]||[]).push(s);});
  const keys=Object.keys(b); let total=keys.reduce((a,k)=>a+(w[k]||1),0), r=Math.random()*total;
  for(const k of keys){ r-=(w[k]||1); if(r<=0) return b[k][Math.floor(Math.random()*b[k].length)]; }
  return pool[Math.floor(Math.random()*pool.length)];
}

function spinCase(caseId){
  const c=allCases().find(x=>x.id===caseId); if(!c) return;
  if(State.balance<c.price) return notify('Недостаточно средств','error');
  State.balance-=c.price; updateBalanceDisplay();

  const strip=document.getElementById('caseRoulette'), result=document.getElementById('caseResult');
  result.classList.add('hidden');
  const win=pickCaseDrop(c), IW=140, TOT=60, WA=52;
  let html='';
  for(let i=0;i<TOT;i++){
    const s=i===WA?win:pickCaseDrop(c), rc=RC[s.category];
    html+=`<div class="case-roulette-item" style="border-bottom:3px solid ${rc}">
      <div class="skin-image" style="height:72px;margin:0">
        <div class="weapon-bg" style="background:radial-gradient(ellipse at center, ${rc}55, transparent 70%)"></div>
        <img src="${s.image}" loading="lazy" onerror="this.remove()" style="max-height:62px">
        <span class="weapon-glyph" style="font-size:26px">${weaponGlyph(s.weapon)}</span>
      </div>
      <span class="skin-label">${(s.short_weapon||'').replace('★','').trim()}<br><b>$${fmt(s.price)}</b></span></div>`;
  }
  strip.innerHTML=html; strip.style.transition='none'; strip.style.transform='translateX(0px)';
  const vp=strip.parentElement.clientWidth, offset=-(WA*IW)+vp/2-IW/2-(Math.random()*70-35);
  requestAnimationFrame(()=>{ strip.style.transition='transform 6s cubic-bezier(0.06,0.85,0.16,1)'; strip.style.transform='translateX('+offset+'px)'; });

  setTimeout(()=>{
    addToInventory(win); addGameHistory('Case: '+c.name, c.price, 'win', win.price);
    saveState();
    result.classList.remove('hidden');
    result.innerHTML=`<div class="won-skin">${win.short_weapon} | ${win.skin}</div>
      <div class="won-price" style="color:${RC[win.category]}">$${fmt(win.price)}</div>
      <div style="font-size:12px;color:var(--txt3);margin-top:6px">Предмет добавлен в инвентарь · <b style="color:var(--gold);cursor:pointer" onclick="closeModal('case');showPage('inventory')">открыть</b></div>`;
    if(win.price>c.price*10){ notify('ДЖЕКПОТ! '+win.weapon+' | '+win.skin+' — $'+fmt(win.price),'success'); Confetti.fire(200); }
    else notify('Выпало: '+win.weapon+' | '+win.skin,'info');
    icons();
  },6250);
}

/* ============================================================
   КРАШ
   ============================================================ */
function initCrash(){ drawCrashFrame(); renderCrashHistory(); }
function loadCrashHistory(){ try{ State.crash.history=JSON.parse(localStorage.getItem('upgrader_crash')||'[]'); }catch(e){ State.crash.history=[]; } }
function saveCrashHistory(){ localStorage.setItem('upgrader_crash', JSON.stringify(State.crash.history.slice(-40))); }

function renderCrashHistory(){
  const box=document.getElementById('crashHistory'); if(!box) return;
  box.innerHTML=State.crash.history.slice(-24).reverse().map(m=>
    `<div class="crash-history-item ${m>=2?'good':'bad'}">${m.toFixed(2)}x</div>`).join('');
}

function drawCrashFrame(){
  const c=document.getElementById('crashGraph'); if(!c) return;
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1;
  for(let i=0;i<=6;i++){ const y=(c.height/6)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke(); }
}

function crashPoint(){ const r=Math.random(); if(r<0.04) return 1.00; return Math.max(1,Math.min(0.96/(1-Math.random()),100)); }

function startCrash(){
  const btn=document.getElementById('crashBetBtn');
  if(State.crash.rolling){ cashoutCrash(); return; }
  const bet=parseFloat(document.getElementById('crashBet').value);
  if(!bet||bet<=0) return notify('Введите ставку','error');
  if(State.balance<bet) return notify('Недостаточно средств','error');

  State.balance-=bet; updateBalanceDisplay();
  Object.assign(State.crash,{rolling:true,mult:1,bet,crashPoint:crashPoint(),cashedOut:false,t0:performance.now()});
  btn.innerHTML='<i data-lucide="hand-coins"></i>ЗАБРАТЬ'; btn.className='btn btn-success btn-lg';
  const disp=document.getElementById('crashMultiplier'); disp.className='crash-multiplier growing';
  const canvas=document.getElementById('crashGraph'), ctx=canvas.getContext('2d'), pts=[];
  icons();

  (function frame(t){
    if(!State.crash.rolling) return;
    State.crash.mult=Math.pow(Math.E,0.09*((t-State.crash.t0)/1000));
    disp.textContent=State.crash.mult.toFixed(2)+'x';
    pts.push(State.crash.mult);
    ctx.clearRect(0,0,canvas.width,canvas.height); drawCrashFrame();
    const maxY=Math.max(2,State.crash.mult*1.15);
    ctx.beginPath();
    pts.forEach((m,i)=>{ const x=(i/Math.max(120,pts.length))*canvas.width, y=canvas.height-((m-1)/(maxY-1))*(canvas.height-10)-5; i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.strokeStyle='#2ee6a8'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.shadowColor='rgba(46,230,168,.65)'; ctx.shadowBlur=14; ctx.stroke(); ctx.shadowBlur=0;
    const auto=parseFloat(document.getElementById('crashAutoCashout').value);
    if(auto>1&&State.crash.mult>=auto&&!State.crash.cashedOut){ cashoutCrash(); return; }
    if(State.crash.mult>=State.crash.crashPoint){ crashCrash(); return; }
    requestAnimationFrame(frame);
  })(performance.now());
}

function cashoutCrash(){
  if(!State.crash.rolling||State.crash.cashedOut) return;
  State.crash.cashedOut=true;
  const payout=State.crash.bet*State.crash.mult;
  State.balance+=payout; addGameHistory('Crash',State.crash.bet,'win',payout); saveState(); updateBalanceDisplay();
  notify('Забрано на '+State.crash.mult.toFixed(2)+'x → +$'+fmt(payout),'success');
  if(State.crash.mult>=5) Confetti.fire(110);
  stopCrashUI();
}

function crashCrash(){
  State.crash.rolling=false;
  const disp=document.getElementById('crashMultiplier');
  disp.textContent=State.crash.crashPoint.toFixed(2)+'x'; disp.className='crash-multiplier crashed';
  if(!State.crash.cashedOut){
    addGameHistory('Crash',State.crash.bet,'loss',0);
    notify('Краш на '+State.crash.crashPoint.toFixed(2)+'x — минус $'+fmt(State.crash.bet),'error');
  }
  State.crash.history.push(State.crash.crashPoint); saveCrashHistory(); renderCrashHistory();
  saveState(); updateBalanceDisplay(); stopCrashUI();
  setTimeout(()=>{ if(!State.crash.rolling){ disp.className='crash-multiplier waiting'; disp.textContent='1.00x'; drawCrashFrame(); } },2500);
}

function stopCrashUI(){
  State.crash.rolling=false;
  const b=document.getElementById('crashBetBtn');
  b.innerHTML='<i data-lucide="play"></i>СТАВКА'; b.className='btn btn-primary btn-lg'; icons();
}

/* ============================================================
   МИНЫ
   ============================================================ */
function initMines(){ renderMines(); }
function minesMult(opened,count){ if(opened<=0) return 1; let m=1; for(let i=0;i<opened;i++) m*=(25-i)/(25-count-i); return m*0.97; }

function renderMines(revealAll=false){
  const grid=document.getElementById('minesGrid'); if(!grid) return;
  let html='';
  for(let i=0;i<25;i++){
    const im=State.mines.mines.includes(i), ir=State.mines.revealed.includes(i);
    let cls='mine-cell', inner='';
    if(ir){ cls+=im?' revealed mine':' revealed safe'; inner=im?'<i data-lucide="flame"></i>':'<i data-lucide="gem"></i>'; }
    else if(revealAll&&im){ cls+=' revealed mine'; inner='<i data-lucide="flame"></i>'; }
    html+=`<div class="${cls}" data-i="${i}">${inner}</div>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.mine-cell').forEach(c=>c.addEventListener('click',()=>revealMine(+c.dataset.i)));
  icons();
}

function startMines(){
  const bet=parseFloat(document.getElementById('minesBet').value), count=parseInt(document.getElementById('minesCount').value);
  if(!bet||bet<=0) return notify('Введите ставку','error');
  if(State.balance<bet) return notify('Недостаточно средств','error');
  State.balance-=bet; updateBalanceDisplay();
  const mines=[]; while(mines.length<count){ const p=Math.floor(Math.random()*25); if(!mines.includes(p)) mines.push(p); }
  Object.assign(State.mines,{active:true,mines,revealed:[],count,bet,opened:0,mult:1});
  document.getElementById('minesStartBtn').classList.add('hidden');
  document.getElementById('minesCashoutBtn').disabled=true;
  updateMinesInfo(); renderMines();
}

function revealMine(i){
  if(!State.mines.active||State.mines.revealed.includes(i)) return;
  if(State.mines.mines.includes(i)){
    State.mines.revealed.push(i);
    addGameHistory('Mines',State.mines.bet,'loss',0); saveState();
    renderMines(true); notify('Мина! -$'+fmt(State.mines.bet),'error'); endMines(); return;
  }
  State.mines.revealed.push(i); State.mines.opened++;
  State.mines.mult=minesMult(State.mines.opened,State.mines.count);
  updateMinesInfo(); renderMines();
  if(State.mines.opened>=25-State.mines.count) cashoutMines();
}

function cashoutMines(){
  if(!State.mines.active) return;
  const payout=State.mines.bet*State.mines.mult;
  State.balance+=payout; addGameHistory('Mines',State.mines.bet,'win',payout);
  saveState(); updateBalanceDisplay();
  notify('Забрано '+State.mines.mult.toFixed(2)+'x → +$'+fmt(payout),'success');
  if(State.mines.mult>=8) Confetti.fire(120);
  renderMines(true); endMines();
}

function endMines(){
  State.mines.active=false;
  document.getElementById('minesStartBtn').classList.remove('hidden');
  document.getElementById('minesCashoutBtn').disabled=true;
}
function updateMinesInfo(){
  document.getElementById('minesOpened').textContent=State.mines.opened;
  document.getElementById('minesMultiplier').textContent=State.mines.mult.toFixed(2)+'x';
  const b=document.getElementById('minesCashoutBtn');
  b.innerHTML='<i data-lucide="hand-coins"></i>ЗАБРАТЬ ($'+fmt(State.mines.bet*State.mines.mult)+')';
  b.disabled=!State.mines.active||State.mines.opened===0; icons();
}

/* ============================================================
   ИНВЕНТАРЬ + ПРОДАЖА
   ============================================================ */
function invList(){
  const f=(document.getElementById('invFilter')||{}).value||'all';
  return f==='all'?State.profile.inventory:State.profile.inventory.filter(s=>s.category===f);
}

function renderInventory(){
  const box=document.getElementById('inventoryGrid'); if(!box) return;
  const list=invList().slice().reverse();
  const total=State.profile.inventory.reduce((a,s)=>a+s.price,0);
  const c1=document.getElementById('invCount'), c2=document.getElementById('invValue'), c3=document.getElementById('invSellAll');
  if(c1) c1.textContent=fmtInt(State.profile.inventory.length);
  if(c2) c2.textContent='$'+fmt(total);
  if(c3) c3.textContent='$'+fmt(total*SELL_RATE);

  if(!list.length){
    box.innerHTML=`<div class="empty-hint" style="padding:60px 20px">
      <i data-lucide="package-open" style="font-size:40px;display:block;margin:0 auto 14px;color:var(--txt3)"></i>
      ${State.profile.inventory.length?'В этой редкости пусто':'Инвентарь пуст — открой кейсы или выиграй апгрейд'}<br>
      <button class="btn btn-primary btn-sm mt-16" onclick="showPage('cases')">К кейсам</button></div>`;
    icons(); return;
  }
  box.innerHTML=list.map(s=>skinCardHTML(s,'inv-skin',
    `<button class="inv-sell" data-act="sell" data-key="${s.uid||s.id}" title="Продать за $${fmt(s.price*SELL_RATE)}"><i data-lucide="hand-coins"></i></button>
     <button class="inv-sell-x" data-act="use" data-key="${s.uid||s.id}" title="В апгрейд"><i data-lucide="arrow-up"></i></button>`)).join('');

  box.querySelectorAll('[data-act="sell"]').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation(); openSell(b.dataset.key);
  }));
  box.querySelectorAll('[data-act="use"]').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation();
    const s=State.profile.inventory.find(x=>(x.uid||x.id)===b.dataset.key);
    if(s){ State.upgrade.source=s; showPage('upgrade'); notify('Скин выбран для апгрейда','info'); }
  }));
  icons();
}

function openSell(uid){
  const s=State.profile.inventory.find(x=>(x.uid||x.id)===uid); if(!s) return;
  const price=s.price, sell=price*SELL_RATE;
  document.getElementById('sellModalBody').innerHTML=`
    <div class="sell-preview">
      <div class="sp-img"><img src="${s.image}" onerror="this.remove()"></div>
      <div style="font-family:Unbounded,sans-serif;font-weight:700;font-size:15px;margin-bottom:4px">${(s.short_weapon||'').replace('★','').trim()} | ${s.skin}</div>
      <div style="font-size:11.5px;color:${RC[s.category]};font-weight:800;text-transform:uppercase;letter-spacing:1px">${s.rarity||s.category}</div>
    </div>
    <div class="sell-row"><span>Рыночная цена</span><span style="color:var(--gold);font-weight:800">$${fmt(price)}</span></div>
    <div class="sell-row"><span>Комиссия площадки (15%)</span><span style="color:var(--red);font-weight:800">-$${fmt(price-sell)}</span></div>
    <div class="sell-row"><span>Получите на баланс</span><b>$${fmt(sell)}</b></div>
    <button class="btn btn-success btn-lg" style="width:100%;margin-top:18px" onclick="confirmSell('${uid}')"><i data-lucide="hand-coins"></i>Продать за $${fmt(sell)}</button>`;
  openModal('sell'); icons();
}

function confirmSell(uid){
  const i=State.profile.inventory.findIndex(x=>(x.uid||x.id)===uid); if(i===-1) return;
  const s=State.profile.inventory[i], sell=s.price*SELL_RATE;
  State.profile.inventory.splice(i,1);
  State.balance+=sell; saveState(); updateBalanceDisplay(); closeModal('sell');
  notify('Продано: '+s.weapon+' | '+s.skin+' → +$'+fmt(sell),'success');
  renderInventory();
}

function sellAll(){
  const list=invList();
  if(!list.length) return notify('Нечего продавать','error');
  const total=list.reduce((a,s)=>a+s.price*SELL_RATE,0);
  if(!confirm('Продать '+list.length+' предмет(ов) за $'+fmt(total)+'?')) return;
  const ids=new Set(list.map(s=>s.uid||s.id));
  State.profile.inventory=State.profile.inventory.filter(s=>!ids.has(s.uid||s.id));
  State.balance+=total; saveState(); updateBalanceDisplay(); renderInventory();
  notify('Продано '+list.length+' предметов → +$'+fmt(total),'success');
  Confetti.fire(90);
}

/* ============================================================
   ПРОФИЛЬ
   ============================================================ */
function initProfile(){
  const p=State.profile;
  document.getElementById('profileName').textContent=p.name;
  document.getElementById('profileAvatar').textContent=p.name[0].toUpperCase();
  document.getElementById('profileBalance').textContent='$'+fmt(State.balance);
  document.getElementById('profileWon').textContent='$'+fmt(p.totalWon);
  document.getElementById('profileLost').textContent='$'+fmt(p.totalBet);
  document.getElementById('profileGames').textContent=fmtInt(p.gamesPlayed);
  const net=p.totalWon-p.totalBet;
  const pn=document.getElementById('profileNet');
  pn.textContent=(net>=0?'+$':'-$')+fmt(Math.abs(net));
  pn.className='profile-stat-value '+(net>=0?'win':'loss');

  const tb=document.getElementById('gameHistory');
  tb.innerHTML=p.gameHistory.length
    ? p.gameHistory.slice(-40).reverse().map(g=>`<tr><td style="color:var(--txt3)">${g.time}</td><td>${g.game}</td><td>$${fmt(g.bet)}</td>
        <td class="${g.result}">${g.result==='win'?'Выигрыш':'Проигрыш'}</td>
        <td class="${g.result}">${g.result==='win'?'+'+fmt(g.amount):'-'+fmt(g.bet)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty-hint">Сыграй первую игру</td></tr>';

  const inv=document.getElementById('profileSkins');
  if(inv){
    const list=p.inventory.slice(-40).reverse();
    inv.innerHTML=list.length?list.map(s=>skinCardHTML(s)).join(''):'<div class="empty-hint">Инвентарь пуст</div>';
  }
  icons();
}

/* ============================================================
   АДМИН
   ============================================================ */
function initAdmin(){
  const p=State.profile, wag=p.totalBet;
  const po=p.gameHistory.reduce((s,g)=>s+(g.result==='win'?g.amount:0),0), pr=wag-po;
  const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  set('adminTotalGames',fmtInt(p.gamesPlayed));
  set('adminWagered','$'+fmt(wag));
  set('adminPaidOut','$'+fmt(po));
  set('adminProfit',(pr>=0?'+$':'-$')+fmt(Math.abs(pr)));
  set('adminEdge',wag?((pr/wag)*100).toFixed(1)+'%':'0%');
  set('adminBalance','$'+fmt(State.balance));
  set('adminCases',fmtInt(allCases().length));
  set('adminSkins',fmtInt(allSkins().length));
  const log=document.getElementById('adminLog');
  log.innerHTML=p.gameHistory.slice(-15).reverse().map(g=>
    `<div class="log-row"><span style="color:var(--txt3)">${g.time}</span><span>${g.game}</span>
     <span class="${g.result}">${g.result==='win'?'+'+fmt(g.amount):'-'+fmt(g.bet)}</span></div>`).join('')
    ||'<div class="empty-hint">Пусто</div>';
  icons();
}

function adminAddBalance(){
  const v=parseFloat(document.getElementById('adminBalanceInput').value);
  if(!v) return notify('Введите сумму','error');
  State.balance=Math.max(0,State.balance+v); saveState(); updateBalanceDisplay(); initAdmin();
  notify('Баланс: $'+fmt(State.balance),'success');
}
function adminSetBalance(){
  const v=parseFloat(document.getElementById('adminBalanceInput').value);
  if(isNaN(v)||v<0) return notify('Некорректная сумма','error');
  State.balance=v; saveState(); updateBalanceDisplay(); initAdmin();
  notify('Установлено $'+fmt(v),'success');
}
function adminGiveRandomSkin(){
  const pool=allSkins().filter(s=>s.price>5), s=pool[Math.floor(Math.random()*pool.length)];
  if(!s) return;
  addToInventory(s); notify('Выдан: '+s.weapon+' | '+s.skin,'success');
  Confetti.fire(70); initAdmin();
}
function adminReset(){
  if(!confirm('Сбросить весь прогресс?')) return;
  localStorage.removeItem('upgrader_v3'); localStorage.removeItem('upgrader_crash'); localStorage.removeItem('upgrader_start');
  location.reload();
}
function adminOpenAdminPanel(){
  document.getElementById('adminPassInput').value='';
  openModal('pass');
  setTimeout(()=>document.getElementById('adminPassInput').focus(),250);
}
function tryAdminPass(){
  const v=document.getElementById('adminPassInput').value;
  if(v===ADMIN_PASS){ closeModal('pass'); showPage('admin'); notify('Доступ разрешён','success'); }
  else {
    notify('Неверный пароль','error');
    const m=document.querySelector('#modal-pass .modal');
    m.style.animation='shake .45s'; setTimeout(()=>m.style.animation='',450);
  }
}

/* ===== ДЕПОЗИТ ===== */
function setDeposit(a){ const el=document.getElementById('depositAmount'); if(el) el.value=a; }
function deposit(){
  const el=document.getElementById('depositAmount'), a=parseFloat(el&&el.value);
  if(!a||a<=0) return notify('Введите корректную сумму','error');
  State.balance+=a; saveState(); updateBalanceDisplay(); closeModal('deposit');
  notify('Баланс пополнен на $'+fmt(a),'success');
}

/* ===== ЖИВАЯ СТАТИСТИКА ===== */
const Live={ online:3000+Math.floor(Math.random()*1500), upgrades:569556748+Math.floor(Math.random()*1000) };
function tickLive(){
  Live.online=Math.max(800,Live.online+Math.floor(Math.random()*21)-10);
  Live.upgrades+=Math.floor(Math.random()*4);
  const o=document.getElementById('statOnline'), u=document.getElementById('statUpgrades'), w=document.getElementById('statWagered');
  if(o) o.textContent=fmtInt(Live.online);
  if(u) u.textContent=fmtInt(Live.upgrades);
  if(w) w.textContent='$'+fmt(State.profile.totalBet);
}

/* ===== СТАРТ ===== */
document.addEventListener('DOMContentLoaded',()=>{
  normalizeData(); loadState(); loadCrashHistory();
  shownBalance=State.balance;
  if(!localStorage.getItem('upgrader_start')){
    localStorage.setItem('upgrader_start','1');
    setTimeout(()=>notify('Добро пожаловать! Стартовый баланс $1000 — загляни в кейсы','info'),700);
  }
  updateBalanceDisplay(false);
  initHome(); renderCrashHistory(); bindTilt(); icons();
  document.querySelectorAll('[data-chance]').forEach(b=>b.classList.toggle('active',+b.dataset.chance===State.upgrade.chance));
  setInterval(()=>{ tickLive(); bindTilt(); },3000);
  tickLive();

  // Страховка: любая вставка <i data-lucide> через innerHTML gets иконки автоматически
  let iconQueued=false;
  new MutationObserver(()=>{
    if(iconQueued) return;
    iconQueued=true;
    requestAnimationFrame(()=>{ iconQueued=false; if(document.querySelector('i[data-lucide]')) icons(); });
  }).observe(document.body,{childList:true,subtree:true});
});
