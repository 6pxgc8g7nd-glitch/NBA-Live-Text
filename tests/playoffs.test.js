// 季後賽對戰樹與球隊頁的純函式測試。執行:npm test
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseRound,roundZh,standingZh,buildSeries,serStatus,orderSeries}=require('../playoffs.js');
const events=require('./fixtures/playoff-events.json');

test('parseRound:辨識輪次與分區',()=>{
  assert.deepEqual(parseRound('West 1st Round - Game 1'),{conf:'west',round:1});
  assert.deepEqual(parseRound('East Semifinals - Game 6'),{conf:'east',round:2});
  assert.deepEqual(parseRound('West Finals - Game 7'),{conf:'west',round:3});
  assert.deepEqual(parseRound('NBA Finals - Game 5'),{conf:'',round:4});
  assert.equal(parseRound('Play-In Tournament'),null);
  assert.equal(parseRound(undefined),null);
});

test('roundZh:輪次與場次中文化',()=>{
  assert.equal(roundZh('West 1st Round - Game 1'),'西區第一輪 第 1 戰');
  assert.equal(roundZh('East Semifinals - Game 6'),'東區準決賽 第 6 戰');
  assert.equal(roundZh('East Finals - Game 2'),'東區決賽 第 2 戰');
  assert.equal(roundZh('NBA Finals - Game 5'),'總冠軍賽 第 5 戰');
  assert.equal(roundZh('Play-In Tournament'),'附加賽');
  assert.equal(roundZh(''),'');
});

test('standingZh:分組排名中文化,認不得的維持原文',()=>{
  assert.equal(standingZh('4th in Southwest Division'),'西南組 第 4 名');
  assert.equal(standingZh('1st in Atlantic Division'),'大西洋組 第 1 名');
  assert.equal(standingZh('something else'),'something else');
  assert.equal(standingZh(undefined),'');
});

test('buildSeries:兩隊的賽程合併後,同一場比賽只算一次',()=>{
  const series=buildSeries(events);
  const finals=series.filter(s=>s.round===4);
  assert.equal(finals.length,1);
  assert.equal(finals[0].games.length,5);
  assert.equal(series.length,7); // 尼克 4 輪 + 馬刺 4 輪,共用總冠軍賽
});

test('buildSeries:勝場、勝者、主場優先順序',()=>{
  const f=buildSeries(events).find(s=>s.round===4);
  const wins=Object.fromEntries(f.list.map(t=>[t.abbr,t.wins]));
  assert.deepEqual(wins,{NY:4,SA:1});
  assert.equal(f.winner.abbr,'NY');
  assert.equal(f.list[0].id,f.homeId); // 第一戰的主場隊排前面
  assert.equal(serStatus(f),'NY 4-1 奪冠');
});

test('buildSeries:分區系列賽的場次依日期排序',()=>{
  const s=buildSeries(events).find(x=>x.round===3&&x.conf==='west');
  const dates=s.games.map(g=>g.date);
  assert.deepEqual(dates,[...dates].sort());
  assert.equal(s.games.length,7);
  assert.equal(serStatus(s),'SA 4-3 晉級');
});

test('orderSeries:同一輪依輪次排序,下一輪對戰落在來源賽事之間',()=>{
  const ordered=orderSeries(buildSeries(events));
  const rounds=ordered.map(s=>s.round);
  assert.deepEqual(rounds,[...rounds].sort((a,b)=>a-b));
});

test('serStatus:進行中、戰成平手、尚未開打',()=>{
  const mk=(w1,w2,started=true)=>({started,winner:null,round:1,list:[{abbr:'AAA',wins:w1},{abbr:'BBB',wins:w2}]});
  assert.equal(serStatus(mk(2,1)),'AAA 領先 2-1');
  assert.equal(serStatus(mk(1,3)),'BBB 領先 3-1');
  assert.equal(serStatus(mk(2,2)),'戰成 2-2');
  assert.equal(serStatus(mk(0,0,false)),'尚未開打');
});

test('buildSeries:沒有輪次資訊或不是兩隊的賽事會被忽略,空輸入不丟錯',()=>{
  assert.deepEqual(buildSeries([]),[]);
  assert.deepEqual(buildSeries(undefined),[]);
  const bad=[{id:'1',date:'2026-04-20T00:00Z',competitions:[{notes:[{headline:'Play-In Tournament'}],status:{type:{state:'post'}},competitors:[]}]}];
  assert.deepEqual(buildSeries(bad),[]);
});
