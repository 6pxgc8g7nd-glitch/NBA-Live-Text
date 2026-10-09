// 附加功能:最愛球隊、勝率走勢、投籃圖、排名、球員小卡
// 依賴 index.html 內的 API、get、esc、logo、view、app、$、schedule、zhPlay(呼叫時才用到,載入順序不影響)

/* ---------- 最愛球隊 ---------- */
const favs=new Set((()=>{try{return JSON.parse(localStorage.favs||'[]')}catch(e){return[]}})());
const isFav=id=>favs.has(String(id));
function toggleFav(id){
  id=String(id);favs.has(id)?favs.delete(id):favs.add(id);
  try{localStorage.favs=JSON.stringify([...favs])}catch(e){}
}
const starHTML=id=>`<button class="star ${isFav(id)?'on':''}" data-fav="${id}" aria-label="最愛球隊" title="${isFav(id)?'取消最愛':'加入最愛'}">${isFav(id)?'★':'☆'}</button>`;
function bindStars(root,rerender){
  root.querySelectorAll('.star').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFav(b.dataset.fav);rerender()});
}

/* ---------- 導覽(賽程 / 排名) ---------- */
const navHTML=a=>`<div class="nav"><button data-nav="list" class="${a==='list'?'on':''}">賽程</button><button data-nav="standings" class="${a==='standings'?'on':''}">排名</button></div>`;
function bindNav(){
  document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{b.dataset.nav==='standings'?openStandings():openList()});
}

/* ---------- 系列賽資訊 ---------- */
function seriesText(c){
  const s=c?.series;if(!s)return '';
  const arr=Array.isArray(s)?s:[s];
  const p=arr.find(x=>x.type==='playoff')||(arr[0]?.type==='season'?null:arr[0]);
  if(!p?.summary)return '';
  return (p.description?p.description+' · ':'')+p.summary;
}

/* ---------- 勝率走勢 ---------- */
const teamColor=(t,fallback)=>{
  const c=t?.color?'#'+t.color:fallback;
  const n=parseInt(c.slice(1),16),l=((n>>16&255)*.3+(n>>8&255)*.59+(n&255)*.11)/255;
  return l<.14?'#7a7a7a':c;
};
let wpCtx=null;
function wpHTML(d,cs){
  const w=d.winprobability||[];
  if(w.length<2)return '<div class="empty">尚無勝率資料</div>';
  const home=cs.find(x=>x.homeAway==='home'),away=cs.find(x=>x.homeAway==='away');
  const byId=new Map((d.plays||[]).map(p=>[String(p.id),p]));
  const W=640,H=240,n=w.length,mid=H/2;
  const X=i=>i/(n-1)*W,Y=i=>(1-w[i].homeWinPercentage)*H;
  const pts=w.map((_,i)=>`${X(i).toFixed(1)},${Y(i).toFixed(1)}`).join(' ');
  const area=f=>`M0,${mid} `+w.map((_,i)=>`L${X(i).toFixed(1)},${f(Y(i)).toFixed(1)}`).join(' ')+` L${W},${mid} Z`;
  const ticks=[];let last=1;
  w.forEach((x,i)=>{const p=byId.get(String(x.playId));const q=p?.period?.number;if(q&&q>last){ticks.push([X(i),q]);last=q}});
  // 影響最大的回合
  const swings=[];
  for(let i=1;i<n;i++){const p=byId.get(String(w[i].playId));if(p)swings.push({p,dv:w[i].homeWinPercentage-w[i-1].homeWinPercentage})}
  swings.sort((a,b)=>Math.abs(b.dv)-Math.abs(a.dv));
  const top=swings.slice(0,5);
  wpCtx={w,byId,home,away,n,W};
  const hc=teamColor(home.team,'#b3261e'),ac=teamColor(away.team,'#1d428a');
  const q=p=>p.period?.number>4?'OT'+(p.period.number-4):'Q'+(p.period?.number??'');
  return `<div class="wp">
    <div class="wpl"><span style="color:${hc}">▲ ${esc(home.team.abbreviation)}(主)</span><span style="color:${ac}">▼ ${esc(away.team.abbreviation)}(客)</span></div>
    <svg id="wpsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="主隊勝率走勢">
      <defs><clipPath id="cu"><rect x="0" y="0" width="${W}" height="${mid}"/></clipPath><clipPath id="cd"><rect x="0" y="${mid}" width="${W}" height="${mid}"/></clipPath></defs>
      <path d="${area(y=>Math.min(y,mid))}" fill="${hc}" opacity=".35"/>
      <path d="${area(y=>Math.max(y,mid))}" fill="${ac}" opacity=".35"/>
      ${ticks.map(([x])=>`<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
      <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--dim)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
      <polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <line id="wpcur" x1="0" x2="0" y1="0" y2="${H}" stroke="var(--acc)" stroke-width="1.5" vector-effect="non-scaling-stroke" visibility="hidden"/>
    </svg>
    <div class="wpx">${ticks.map(([x,qq])=>`<span style="left:${(x/W*100).toFixed(1)}%">${qq>4?'OT'+(qq-4):'Q'+qq}</span>`).join('')}</div>
    <div class="wpinfo" id="wpinfo">把滑鼠移到圖上,或手指在圖上滑動,查看每個回合的勝率</div>
    ${top.length?`<div class="sec">影響最大的回合</div><ul class="plays">${top.map(({p,dv})=>`<li><span class="t">${q(p)} ${esc(p.clock?.displayValue||'')}</span><span class="x" style="flex:1">${esc(lang==='zh'?zhPlay(p.text):p.text)}</span><span class="sc" style="color:${dv>0?hc:ac};font-weight:700">${esc((dv>0?home:away).team.abbreviation)} ${dv>0?'+':'−'}${(Math.abs(dv)*100).toFixed(0)}%</span></li>`).join('')}</ul>`:''}
  </div>`;
}
function bindWp(){
  const svg=$('#wpsvg');if(!svg||!wpCtx)return;
  const {w,byId,home,away,n}=wpCtx,info=$('#wpinfo'),cur=$('#wpcur');
  const at=e=>{
    const r=svg.getBoundingClientRect(),t=Math.max(0,Math.min(1,((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width));
    const i=Math.round(t*(n-1)),p=byId.get(String(w[i].playId)),hp=w[i].homeWinPercentage;
    cur.setAttribute('x1',t*wpCtx.W);cur.setAttribute('x2',t*wpCtx.W);cur.setAttribute('visibility','visible');
    const qn=p?(p.period?.number>4?'OT'+(p.period.number-4):'Q'+p.period?.number):'';
    info.innerHTML=`<b>${esc(qn)} ${esc(p?.clock?.displayValue||'')}</b> · ${esc(home.team.abbreviation)} ${(hp*100).toFixed(0)}% / ${esc(away.team.abbreviation)} ${((1-hp)*100).toFixed(0)}%${p?`<br>${esc(lang==='zh'?zhPlay(p.text):p.text)}`:''}`;
  };
  svg.addEventListener('pointermove',at);svg.addEventListener('pointerdown',at);
  svg.style.touchAction='pan-y';
}

/* ---------- 投籃圖 ---------- */
let shotTeam=null;
function shotHTML(d,cs){
  const shots=(d.plays||[]).filter(p=>p.shootingPlay&&p.coordinate&&p.coordinate.x>=0&&p.coordinate.x<=50&&p.coordinate.y>=-3&&p.coordinate.y<=47&&!/free throw/i.test(p.type?.text||''));
  if(!shots.length)return '<div class="empty">尚無投籃座標資料</div>';
  if(!shotTeam||!cs.some(x=>x.id===shotTeam))shotTeam=cs[0].id;
  const mine=shots.filter(p=>p.team?.id===shotTeam);
  const made=mine.filter(p=>p.scoringPlay),threes=mine.filter(p=>/three point/i.test(p.text)),threeMade=threes.filter(p=>p.scoringPlay);
  const pct=(a,b)=>b?` (${(a/b*100).toFixed(0)}%)`:'';
  const dot=p=>{const x=p.coordinate.x,y=47-Math.max(0,p.coordinate.y);return p.scoringPlay
    ?`<circle cx="${x}" cy="${y}" r=".95" fill="var(--ink)" stroke="var(--bg)" stroke-width=".25"/>`
    :`<path d="M${x-.7},${y-.7}L${x+.7},${y+.7}M${x+.7},${y-.7}L${x-.7},${y+.7}" stroke="var(--acc)" stroke-width=".35" stroke-linecap="round"/>`};
  const L='stroke="var(--dim)" stroke-width=".25" fill="none"';
  return `<div class="bar" style="margin-bottom:10px">${cs.map(x=>`<button data-shot="${x.id}" class="${x.id===shotTeam?'on':''}" style="${x.id===shotTeam?'background:var(--ink);color:var(--bg)':''}">${esc(x.team.displayName)}</button>`).join('')}</div>
    <svg class="court" viewBox="-1 -1 52 49" role="img" aria-label="投籃分布圖">
      <rect x="0" y="0" width="50" height="47" ${L}/>
      <rect x="17" y="28" width="16" height="19" ${L}/>
      <circle cx="25" cy="28" r="6" ${L}/>
      <path d="M3,47 L3,32.8 A23.75,23.75 0 0 1 47,32.8 L47,47" ${L}/>
      <path d="M21,41.75 A4,4 0 0 1 29,41.75" ${L}/>
      <line x1="22" x2="28" y1="43" y2="43" stroke="var(--dim)" stroke-width=".5"/>
      <circle cx="25" cy="41.75" r=".75" stroke="var(--acc)" stroke-width=".3" fill="none"/>
      ${mine.map(dot).join('')}
    </svg>
    <div class="shotsum"><span>投籃 <b>${made.length}/${mine.length}</b>${pct(made.length,mine.length)}</span><span>三分 <b>${threeMade.length}/${threes.length}</b>${pct(threeMade.length,threes.length)}</span></div>
    <div class="wpinfo"><svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:-1px"><circle cx="6" cy="6" r="4" fill="var(--ink)"/></svg> 命中 &nbsp; <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:-1px"><path d="M2,2L10,10M10,2L2,10" stroke="var(--acc)" stroke-width="1.6"/></svg> 未進 · 不含罰球</div>`;
}
function bindShot(rerender){
  document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>{shotTeam=b.dataset.shot;rerender()});
}

/* ---------- 排名 ---------- */
async function openStandings(){view={type:'standings'};history.replaceState(null,'','#standings');renderStandings(true)}
async function renderStandings(first){
  try{
    const d=await get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');
    if(view.type!=='standings')return;
    const stat=(e,n)=>e.stats.find(s=>s.name===n)?.displayValue??'-';
    const num=(e,n)=>+(e.stats.find(s=>s.name===n)?.value??999);
    const tbl=c=>{
      const es=[...c.standings.entries].sort((a,b)=>num(a,'playoffSeed')-num(b,'playoffSeed'));
      return `<div class="sec">${c.name==='Eastern Conference'?'東區':c.name==='Western Conference'?'西區':esc(c.name)}</div><div class="scroll"><table class="stand"><tr><th>#</th><th>球隊</th><th>勝</th><th>負</th><th>勝率</th><th>勝差</th><th>近十場</th><th>連勝/敗</th></tr>`+
        es.map((e,i)=>`<tr class="${i===5||i===9?'cut':''}"><td>${i+1}</td><td class="tm">${starHTML(e.team.id)}<img src="${logo(e.team)}" alt=""> ${esc(e.team.displayName)}</td><td>${esc(stat(e,'wins'))}</td><td>${esc(stat(e,'losses'))}</td><td>${esc(stat(e,'winPercent'))}</td><td>${esc(stat(e,'gamesBehind'))}</td><td>${esc(stat(e,'Last Ten Games'))}</td><td>${esc(stat(e,'streak'))}</td></tr>`).join('')+'</table></div>';
    };
    app.innerHTML=navHTML('standings')+`<div class="foot" style="margin:6px 0 0;text-align:left">${esc(d.children?.[0]?.seasonDisplayName||d.seasons?.[0]?.displayName||'')} · 前 6 名直接晉級季後賽,第 7–10 名打附加賽(粗線分隔)</div>`+(d.children||[]).map(tbl).join('')+'<div class="foot">資料來源:ESPN 公開接口 · 非官方</div>';
    bindNav();bindStars(app,()=>renderStandings());bindPlayers();
    schedule(120000,()=>renderStandings());
  }catch(err){
    if(first)app.innerHTML=navHTML('standings')+'<div class="empty">讀取排名失敗,請稍後重試</div>',bindNav();
    schedule(20000,()=>renderStandings());
  }
}

/* ---------- 球員小卡 ---------- */
const PSTAT={GP:'出賽',MIN:'時間',PTS:'得分',REB:'籃板',AST:'助攻',STL:'抄截',BLK:'阻攻',TO:'失誤',PF:'犯規','FG%':'投籃%','3P%':'三分%','FT%':'罰球%'};
const SPLIT_ZH={'Regular Season':'例行賽',Postseason:'季後賽',Career:'生涯'};
const POS_ZH={Guard:'後衛',Forward:'前鋒',Center:'中鋒','Point Guard':'控球後衛','Shooting Guard':'得分後衛','Small Forward':'小前鋒','Power Forward':'大前鋒'};
function bindPlayers(){
  document.querySelectorAll('[data-pid]').forEach(el=>el.onclick=()=>openPlayer(el.dataset.pid));
}
async function openPlayer(id){
  let m=$('#pm');
  if(!m){m=document.createElement('div');m.id='pm';m.className='modal';document.body.appendChild(m)}
  const close=()=>{m.remove();document.removeEventListener('keydown',esc_)};
  const esc_=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',esc_);
  m.onclick=e=>{if(e.target===m)close()};
  m.innerHTML='<div class="mc"><div class="empty">讀取中…</div></div>';
  try{
    const [a,o]=await Promise.all([
      get(`https://site.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}`),
      get(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/overview`).catch(()=>null)
    ]);
    const p=a.athlete,st=o?.statistics;
    const pos=p.position?.displayName,idx=st?st.labels.map((_,i)=>i):[];
    const inch=(p.displayHeight||'').match(/(\d+)'\s*(\d+)/),cm=inch?Math.round((+inch[1]*12+ +inch[2])*2.54):null;
    const lb=(p.displayWeight||'').match(/(\d+)/),kg=lb?Math.round(+lb[1]*.4536):null;
    const info=[p.team?.displayName,p.displayJersey?'#'+p.displayJersey.replace('#',''):'',POS_ZH[pos]||pos,p.age?p.age+' 歲':'',cm?`${cm} 公分`:'',kg?`${kg} 公斤`:'',p.displayExperience?'球齡 '+p.displayExperience:'',p.displayDraft?'選秀 '+p.displayDraft:''].filter(Boolean);
    m.innerHTML=`<div class="mc"><button class="mx" aria-label="關閉">✕</button>
      <div class="ph">${p.headshot?.href?`<img src="${esc(p.headshot.href)}" alt="">`:''}<div><div class="pn">${esc(p.displayName)}</div><div class="pi">${info.map(esc).join(' · ')}</div></div></div>
      ${st?`<div class="scroll"><table><tr><th></th>${st.labels.map(l=>`<th>${esc(PSTAT[l]||l)}</th>`).join('')}</tr>${st.splits.map(s=>`<tr><td>${esc(SPLIT_ZH[s.displayName]||s.displayName)}</td>${s.stats.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table></div><div class="foot" style="margin:8px 0 0;text-align:left">場均數據</div>`:'<div class="empty">沒有統計資料</div>'}</div>`;
    m.querySelector('.mx').onclick=close;
  }catch(e){
    m.innerHTML='<div class="mc"><button class="mx" aria-label="關閉">✕</button><div class="empty">讀取球員資料失敗</div></div>';
    m.querySelector('.mx').onclick=close;
  }
}
