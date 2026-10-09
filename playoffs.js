// 季後賽對戰樹與球隊頁
// 依賴 index.html / features.js:API、get、esc、logo、view、app、$、schedule、openList、openGame、openStandings、navHTML、bindNav、bindPlayers、ico

/* ---------- 純函式(可在 Node 測試) ---------- */
const ROUND_KEY={'1st round':1,semifinals:2,finals:3};
function parseRound(h){
  if(!h)return null;
  let m=String(h).match(/^(East|West)\s+(1st Round|Semifinals|Finals)\b/i);
  if(m)return {conf:m[1].toLowerCase(),round:ROUND_KEY[m[2].toLowerCase()]};
  if(/^NBA Finals/i.test(h))return {conf:'',round:4};
  return null;
}
function roundZh(h){
  if(!h)return '';
  const g=String(h).match(/Game (\d+)/i),info=parseRound(h);
  const conf={east:'東區',west:'西區'};
  let r='';
  if(info){r=info.round===4?'總冠軍賽':conf[info.conf]+['','第一輪','準決賽','決賽'][info.round]}
  else if(/play-?in/i.test(h))r='附加賽';
  else r=h.replace(/\s*-\s*Game \d+/i,'');
  return r+(g?` 第 ${g[1]} 戰`:'');
}
const DIV_ZH={Atlantic:'大西洋組',Central:'中部組',Southeast:'東南組',Northwest:'西北組',Pacific:'太平洋組',Southwest:'西南組'};
function standingZh(s){
  const m=String(s||'').match(/^(\d+)(?:st|nd|rd|th) in (.+?) Division$/i);
  return m?`${DIV_ZH[m[2]]||m[2]} 第 ${m[1]} 名`:(s||'');
}

// events:各隊季後賽賽程的賽事(可重複,以 id 去重)→ 系列賽清單
function buildSeries(events){
  const uniq=new Map();(events||[]).forEach(e=>uniq.set(String(e.id),e));
  const series=new Map();
  for(const e of uniq.values()){
    const c=e.competitions?.[0];if(!c)continue;
    const info=parseRound(c.notes?.[0]?.headline);if(!info)continue;
    const cp=c.competitors||[];if(cp.length!==2)continue;
    const ids=cp.map(x=>String(x.id||x.team?.id)).sort();
    const key=`${info.round}|${info.conf}|${ids.join('-')}`;
    let s=series.get(key);
    if(!s){s={key,round:info.round,conf:info.conf,teams:{},games:[]};series.set(key,s)}
    cp.forEach(x=>{const id=String(x.id||x.team.id);s.teams[id]=s.teams[id]||{id,abbr:x.team.abbreviation,name:x.team.displayName,logo:x.team.logo||x.team.logos?.[0]?.href||'',wins:0}});
    s.games.push({id:String(e.id),date:e.date,state:c.status?.type?.state,winner:String(cp.find(x=>x.winner)?.id||''),home:String(cp.find(x=>x.homeAway==='home')?.id||'')});
  }
  for(const s of series.values()){
    s.games.sort((a,b)=>a.date.localeCompare(b.date));
    s.games.forEach(g=>{if(g.state==='post'&&g.winner&&s.teams[g.winner])s.teams[g.winner].wins++});
    s.homeId=s.games[0]?.home;
    s.list=Object.values(s.teams).sort((a,b)=>(a.id===s.homeId?-1:1)-(b.id===s.homeId?-1:1));
    const mx=Math.max(...s.list.map(t=>t.wins));
    s.winner=mx>=4?s.list.find(t=>t.wins===mx):null;
    s.started=s.games.some(g=>g.state!=='pre');
    const played=s.games.filter(g=>g.state!=='pre');
    s.focusGame=(played[played.length-1]||s.games[0]).id;
  }
  return [...series.values()];
}
function serStatus(s){
  if(!s.started)return '尚未開打';
  const [a,b]=[...s.list].sort((x,y)=>y.wins-x.wins);
  if(s.winner)return `${s.winner.abbr} ${a.wins}-${b.wins} ${s.round===4?'奪冠':'晉級'}`;
  return a.wins===b.wins?`戰成 ${a.wins}-${b.wins}`:`${a.abbr} 領先 ${a.wins}-${b.wins}`;
}
// 依「誰晉級到哪」排出對戰樹的上下順序,讓下一輪的對戰剛好落在兩場來源賽事之間
function orderSeries(all){
  const pos=new Map();let n=0;
  const kids=s=>all.filter(k=>k.round===s.round-1&&(s.round===4||k.conf===s.conf)&&Object.keys(s.teams).some(t=>k.teams[t]))
                   .sort((a,b)=>a.games[0].date.localeCompare(b.games[0].date));
  const place=s=>{
    if(pos.has(s.key))return pos.get(s.key);
    const ks=kids(s);
    const ps=ks.map(place);
    const p=ps.length?Math.min(...ps):n++;
    pos.set(s.key,p);return p;
  };
  for(const r of [4,3,2,1])all.filter(s=>s.round===r).sort((a,b)=>a.games[0].date.localeCompare(b.games[0].date)).forEach(place);
  return all.slice().sort((a,b)=>a.round-b.round||pos.get(a.key)-pos.get(b.key));
}
if(typeof module!=='undefined')module.exports={parseRound,roundZh,standingZh,buildSeries,serStatus,orderSeries};

/* ---------- 共用 ---------- */
if(typeof document!=='undefined'){
let curSeasonInfo=null;
async function curSeason(){
  if(curSeasonInfo)return curSeasonInfo;
  try{const d=await get(`${API}/scoreboard`);const s=d.leagues?.[0]?.season;curSeasonInfo={year:s?.year||new Date().getFullYear(),type:s?.type?.type||2}}
  catch(e){curSeasonInfo={year:new Date().getFullYear(),type:2}}
  return curSeasonInfo;
}
const seasonLabel=y=>`${y-1}-${String(y).slice(2)} 賽季`;
globalThis.bindTeams=root=>(root||document).querySelectorAll('[data-team]').forEach(el=>{el.style.cursor='pointer';el.onclick=ev=>{ev.stopPropagation();openTeam(el.dataset.team)}});

/* ---------- 季後賽對戰樹 ---------- */
let bracketYear=null;
async function pool(items,size,fn){let i=0;await Promise.all(Array.from({length:size},async()=>{while(i<items.length){const x=items[i++];await fn(x)}}))}
async function loadBracket(year,onProgress){
  const key='bracket'+year;
  try{const c=JSON.parse(localStorage[key]||'null');if(c&&(c.done||Date.now()-c.t<180000))return c}catch(e){}
  const st=await get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');
  const ids=(st.children||[]).flatMap(c=>c.standings.entries.map(e=>e.team.id));
  const events=[];let done=0;
  await pool(ids,6,async id=>{
    try{const d=await get(`${API}/teams/${id}/schedule?season=${year}&seasontype=3`);events.push(...(d.events||[]))}catch(e){}
    onProgress&&onProgress(++done,ids.length);
  });
  const series=orderSeries(buildSeries(events));
  const fin=series.find(s=>s.round===4);
  const out={t:Date.now(),done:!!fin?.winner,series};
  try{localStorage[key]=JSON.stringify(out)}catch(e){}
  return out;
}
const serCard=s=>`<div class="ser" data-gid="${s.focusGame}" title="點一下看最近一場">
  ${s.list.map(t=>`<div class="sr ${s.winner&&s.winner.id!==t.id?'out':''} ${s.winner&&s.winner.id===t.id?'win':''}"><span class="tl" data-team="${t.id}"><img src="${esc(t.logo)}" alt="">${esc(t.abbr)}</span><b>${s.started?t.wins:''}</b></div>`).join('')}
  <div class="ss">${esc(serStatus(s))}</div></div>`;
async function openBracket(){clearTimeout(timer);view={type:'bracket'};history.replaceState(null,'','#bracket');renderBracket(true)}
async function renderBracket(first){
  if(view.type!=='bracket')return;
  document.body.dataset.view='bracket';
  if(first)app.innerHTML=navHTML('bracket')+'<div class="empty" id="bl">讀取季後賽資料…</div>',bindNav();
  try{
    const cs=await curSeason(),Y0=cs.year;
    const prog=(a,b)=>{const el=$('#bl');if(el&&view.type==='bracket')el.textContent=`讀取季後賽資料… ${a}/${b}`};
    let data=null;
    if(bracketYear){data=await loadBracket(bracketYear,prog)}
    else for(const y of [Y0,Y0-1]){const d=await loadBracket(y,prog);if(d.series.length){bracketYear=y;data=d;break}}
    if(view.type!=='bracket')return;
    if(!data){app.innerHTML=navHTML('bracket')+'<div class="empty">找不到季後賽資料</div>';bindNav();return}
    const col=(r,conf)=>`<div class="bc"><div class="bh">${['','第一輪','準決賽','分區決賽','總冠軍賽'][r]}</div><div class="bl">${data.series.filter(s=>s.round===r&&s.conf===conf).map(serCard).join('')||'<div class="bx">尚無</div>'}</div></div>`;
    const years=Array.from({length:6},(_,i)=>Y0-i);
    app.innerHTML=navHTML('bracket')+`<div class="bar"><select id="by" aria-label="賽季">${years.map(y=>`<option value="${y}" ${y===bracketYear?'selected':''}>${seasonLabel(y)}</option>`).join('')}</select>
      <span class="foot" style="margin:0">點系列賽看最近一場,點球隊看球隊頁</span></div>
      <div class="scroll"><div class="bw"><div class="bconf"><span>西區</span><span>總冠軍賽</span><span>東區</span></div>
      <div class="br">${col(1,'west')}${col(2,'west')}${col(3,'west')}${col(4,'')}${col(3,'east')}${col(2,'east')}${col(1,'east')}</div></div></div>
      <div class="foot">資料來源:ESPN 公開接口 · 非官方</div>`;
    bindNav();bindTeams(app);
    document.querySelectorAll('.ser').forEach(el=>el.onclick=()=>openGame(el.dataset.gid));
    $('#by').onchange=e=>{bracketYear=+e.target.value;renderBracket(true)};
    schedule(data.done?600000:180000,()=>renderBracket());
  }catch(err){
    if(first)app.innerHTML=navHTML('bracket')+'<div class="empty">讀取季後賽資料失敗,請稍後重試</div>',bindNav();
    schedule(20000,()=>renderBracket());
  }
}
globalThis.openBracket=openBracket;

/* ---------- 球隊頁 ---------- */
let teamBack=null,teamTab='sched',teamYear=null,teamType=null;
const POS_ABBR={PG:'控球後衛',SG:'得分後衛',SF:'小前鋒',PF:'大前鋒',C:'中鋒',G:'後衛',F:'前鋒','G-F':'後衛/前鋒','F-C':'前鋒/中鋒','F-G':'前鋒/後衛','C-F':'中鋒/前鋒'};
function openTeam(id){
  clearTimeout(timer);
  const v=view;
  if(v.type!=='team')teamBack=v.type==='game'?()=>openGame(v.id):v.type==='standings'?openStandings:v.type==='bracket'?openBracket:openList;
  view={type:'team',id:String(id)};history.replaceState(null,'','#team/'+id);
  teamTab='sched';teamYear=null;teamType=null;
  renderTeam(true);
}
globalThis.openTeam=openTeam;
async function renderTeam(first){
  if(view.type!=='team')return;
  document.body.dataset.view='team';
  const id=view.id;
  const back=`<button class="back" id="bk">${ico('left')} 返回</button>`;
  if(first)app.innerHTML=back+'<div class="empty">讀取中…</div>',$('#bk').onclick=()=>teamBack?teamBack():openList();
  try{
    const cs=await curSeason();
    if(!teamYear)teamYear=cs.year;
    if(!teamType)teamType=cs.type;
    const [info,sch,ros]=await Promise.all([
      get(`${API}/teams/${id}`),
      teamTab==='sched'?get(`${API}/teams/${id}/schedule?season=${teamYear}&seasontype=${teamType}`).catch(()=>({events:[]})):null,
      teamTab==='roster'?get(`${API}/teams/${id}/roster`).catch(()=>({athletes:[]})):null
    ]);
    if(view.type!=='team'||view.id!==id)return;
    const t=info.team,color=t.color?'#'+t.color:'var(--ink)';
    const rec=t.record?.items?.find(x=>x.type==='total')||t.record?.items?.[0];
    const hero=`<div class="hero" style="border-top-color:${/^#(0|1)[0-9a-f]{5}$/i.test(color)||t.color==='000000'?'var(--ink)':color}">
      <div class="teams" style="justify-content:flex-start;gap:16px;text-align:left"><img src="${esc(logo(t))}" alt="">
      <div><div style="font:900 22px/1.2 var(--sans)">${esc(t.displayName)}</div><div class="mid">${esc(rec?.summary?'戰績 '+rec.summary:'')}${t.standingSummary?' · '+esc(standingZh(t.standingSummary)):''}</div></div></div></div>`;
    const tabs=`<div class="tabs"><button data-tt="sched" class="${teamTab==='sched'?'on':''}">賽程</button><button data-tt="roster" class="${teamTab==='roster'?'on':''}">陣容</button></div>`;
    let body='';
    if(teamTab==='sched'){
      const years=Array.from({length:6},(_,i)=>cs.year-i);
      const ev=(sch.events||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
      let w=0,l=0;
      const rows=ev.map(e=>{
        const c=e.competitions[0],me=c.competitors.find(x=>String(x.team.id)===String(id)),op=c.competitors.find(x=>x!==me);
        const st=c.status.type.state,sc=x=>x.score?.displayValue??x.score??'';
        let res='';
        if(st==='post'){const win=me.winner;win?w++:l++;res=`<b class="${win?'rw':'rl'}">${win?'勝':'負'}</b> ${esc(sc(me))}-${esc(sc(op))}`}
        else if(st==='in')res=`<span style="color:var(--live);font-weight:700">進行中</span> ${esc(sc(me))}-${esc(sc(op))}`;
        else res=new Date(e.date).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
        const note=roundZh(c.notes?.[0]?.headline);
        return `<li data-gid="${e.id}"><span class="t" style="width:86px">${new Date(e.date).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric',weekday:'short'})}</span>
          <span class="x" style="flex:1"><small style="color:var(--dim)">${me.homeAway==='home'?'主':'客'}</small> <img src="${esc(logo(op.team))}" alt="" style="width:20px;height:20px;vertical-align:middle"> ${esc(op.team.displayName)}${note?`<br><small style="color:var(--dim)">${esc(note)}</small>`:''}</span>
          <span class="sc" style="width:auto;white-space:nowrap">${res}</span></li>`;
      }).join('');
      body=`<div class="bar"><select id="ty" aria-label="賽季">${years.map(y=>`<option value="${y}" ${y===teamYear?'selected':''}>${seasonLabel(y)}</option>`).join('')}</select>
        <span class="rpsp" style="margin:0">${[[1,'季前賽'],[2,'例行賽'],[3,'季後賽']].map(([v,n])=>`<button data-ttype="${v}" class="${v===teamType?'on':''}" style="min-height:30px;padding:2px 10px;font-size:13px">${n}</button>`).join('')}</span></div>
        ${ev.length?`<div class="wpinfo" style="min-height:0">共 ${ev.length} 場${w+l?` · 已賽 ${w+l} 場:${w} 勝 ${l} 負`:''}</div><ul class="plays tsch">${rows}</ul>`:'<div class="empty">這個賽季沒有這類賽事</div>'}`;
    }else{
      const as=(ros.athletes||[]).flatMap(a=>a.items?a.items:[a]);
      const cm=h=>{const m=(h||'').match(/(\d+)'\s*(\d+)/);return m?Math.round((+m[1]*12+ +m[2])*2.54)+' cm':'-'};
      const kg=w=>{const m=(w||'').match(/(\d+)/);return m?Math.round(+m[1]*.4536)+' kg':'-'};
      body=as.length?`<div class="scroll"><table><tr><th>#</th><th>球員</th><th>位置</th><th>年齡</th><th>身高</th><th>體重</th><th>球齡</th></tr>${as.map(a=>`<tr><td>${esc(a.jersey||'')}</td><td><span data-pid="${esc(a.id)}">${esc(a.displayName||a.fullName)}</span></td><td>${esc(POS_ABBR[a.position?.abbreviation]||a.position?.abbreviation||'')}</td><td>${esc(a.age??'')}</td><td>${cm(a.displayHeight)}</td><td>${kg(a.displayWeight)}</td><td>${esc(a.experience?.years??'')}</td></tr>`).join('')}</table></div>`:'<div class="empty">沒有陣容資料</div>';
    }
    app.innerHTML=back+hero+tabs+body+'<div class="foot">資料來源:ESPN 公開接口 · 非官方</div>';
    $('#bk').onclick=()=>teamBack?teamBack():openList();
    document.querySelectorAll('[data-tt]').forEach(b=>b.onclick=()=>{teamTab=b.dataset.tt;renderTeam(true)});
    document.querySelectorAll('[data-ttype]').forEach(b=>b.onclick=()=>{teamType=+b.dataset.ttype;renderTeam(true)});
    const ty=$('#ty');if(ty)ty.onchange=()=>{teamYear=+ty.value;renderTeam(true)};
    document.querySelectorAll('.tsch li').forEach(li=>li.onclick=()=>openGame(li.dataset.gid));
    bindPlayers();
  }catch(err){
    if(first)app.innerHTML=back+'<div class="empty">讀取球隊資料失敗,請稍後重試</div>',$('#bk').onclick=()=>teamBack?teamBack():openList();
  }
}
}
