// 逐球文字翻譯規則的自動測試。執行:npm test(或 node --test tests/*.test.js)
const test=require('node:test');
const assert=require('node:assert/strict');
const {zhPlay}=require('../zh.js');
const fixtures=require('./fixtures/plays.json');

const cases=(name,rows)=>test(name,()=>{for(const [en,zh] of rows)assert.equal(zhPlay(en),zh,en)});

cases('投籃:命中與未進,含距離、三分、助攻',[
  ['Naji Marshall makes 24-foot three point jumper (Jett Howard assists)','Naji Marshall 命中 24 英尺三分跳投(Jett Howard 助攻)'],
  ['Cooper Flagg misses 23-foot three point jumper','Cooper Flagg 未進 23 英尺三分跳投'],
  ['Kevin Durant makes 8-foot two point shot (Alperen Sengun assists)','Kevin Durant 命中 8 英尺兩分球(Alperen Sengun 助攻)'],
  ['Zaccharie Risacher misses two point shot','Zaccharie Risacher 未進 兩分球'],
]);

cases('投籃:各種動作修飾詞',[
  ['Zaccharie Risacher misses 7-foot fade away jump shot','Zaccharie Risacher 未進 7 英尺後仰跳投'],
  ['Fred VanVleet makes 32-foot running pullup jump shot','Fred VanVleet 命中 32 英尺跑動急停跳投'],
  ['Max Christie misses 25-foot three point step back jumpshot','Max Christie 未進 25 英尺三分後撤步跳投'],
  ['Naji Marshall misses driving floating jump shot','Naji Marshall 未進 切入拋投式跳投'],
  ['Kevin Durant misses 9-foot turnaround jump shot','Kevin Durant 未進 9 英尺轉身跳投'],
  ['Alperen Sengun misses 3-foot two point shot','Alperen Sengun 未進 3 英尺兩分球'],
]);

cases('投籃:上籃、灌籃、補籃',[
  ['Alperen Sengun makes 2-foot layup (Kevin Durant assists)','Alperen Sengun 命中 2 英尺上籃(Kevin Durant 助攻)'],
  ['Daniel Gafford makes running layup (Cooper Flagg assists)','Daniel Gafford 命中 跑動上籃(Cooper Flagg 助攻)'],
  ['Cooper Flagg makes 1-foot driving dunk','Cooper Flagg 命中 1 英尺切入灌籃'],
  ['Alperen Sengun makes 6-foot running dunk (Fred VanVleet assists)','Alperen Sengun 命中 6 英尺跑動灌籃(Fred VanVleet 助攻)'],
  ['Amen Thompson misses 2-foot tip shot','Amen Thompson 未進 2 英尺補籃'],
  ['Jabari Smith Jr. makes tip in dunk','Jabari Smith Jr. 命中 補扣'],
]);

cases('阻攻',[
  ["Cooper Flagg blocks Amen Thompson 's 11-foot driving layup",'Cooper Flagg 阻攻 Amen Thompson 的 11 英尺切入上籃'],
]);

cases('罰球',[
  ['Jabari Smith Jr. makes free throw 1 of 2','Jabari Smith Jr. 罰球命中(1/2)'],
  ['Kevin Durant misses free throw 1 of 1','Kevin Durant 罰球不中(1/1)'],
  ['Fred VanVleet misses free throw 3 of 3','Fred VanVleet 罰球不中(3/3)'],
  ['misses free throw 2 of 2','罰球不中(2/2)'], // ESPN 偶爾缺球員名字
]);

cases('籃板',[
  ['Amen Thompson defensive rebound','Amen Thompson 防守籃板'],
  ['Alperen Sengun offensive rebound','Alperen Sengun 進攻籃板'],
  ['Mavericks offensive team rebound','獨行俠 進攻團隊籃板'],
  ['Rockets defensive team rebound','火箭 防守團隊籃板'],
]);

cases('失誤',[
  ['Amen Thompson bad pass\nturnover (Morez Johnson Jr. steals)','Amen Thompson 傳球失誤(Morez Johnson Jr. 抄截)'], // ESPN 文字裡會夾換行
  ['Naji Marshall lost ball turnover (Fred VanVleet steals)','Naji Marshall 掉球失誤(Fred VanVleet 抄截)'],
  ['Fred VanVleet out of bounds lost ball turnover','Fred VanVleet 球出界失誤'],
  ['Cooper Flagg steps out of bounds turnover','Cooper Flagg 踩線失誤'],
  ['Bogdan Bogdanovic offensive foul turnover','Bogdan Bogdanovic 進攻犯規失誤'],
  ['John Poulakidas traveling turnover','John Poulakidas 走步違例'],
  ['shot clock turnover ','進攻 24 秒違例'], // 尾端有空白
  ['delay of game violation','延誤比賽違例'],
]);

cases('犯規與違例',[
  ['Daniel Gafford shooting foul','Daniel Gafford 投籃犯規'],
  ['Alperen Sengun personal foul','Alperen Sengun 個人犯規'],
  ['Morez Johnson Jr. loose ball foul','Morez Johnson Jr. 爭球犯規'],
  ['Bogdan Bogdanovic offensive foul','Bogdan Bogdanovic 進攻犯規'],
  ['Alperen Sengun offensive charge','Alperen Sengun 帶球撞人(進攻犯規)'],
  ['Kevin Durant kicked ball violation','Kevin Durant 踢球違例'],
  ['Landry Shamet personal take foul','Landry Shamet 戰術犯規'],
  ['Devin Vassell defensive goaltending violation','Devin Vassell 防守干擾球違例'],
]);

cases('換人、暫停、跳球、節次',[
  ['Sergio de Larrea enters the game for Morez Johnson Jr.','換人:Sergio de Larrea 上場,Morez Johnson Jr. 下場'],
  ['Mavericks Full timeout','獨行俠 暫停'],
  ['Rockets 20 Sec. timeout','火箭 20 秒暫停'],
  ['Alperen Sengun vs. Morez Johnson Jr. (Fred VanVleet gains possession)','跳球:Alperen Sengun 對 Morez Johnson Jr.(Fred VanVleet 獲得球權)'],
  ['End of the 1st Quarter','第 1 節結束'],
  ['End of the 4th Quarter','第 4 節結束'],
  ['End of Game','比賽結束'],
]);

cases('回放檢視與教練挑戰',[
  ['(00:00) [Rockets] REF-INITIATED REVIEW (REPLAY SUPPORTS CALL)','火箭 裁判發起回放檢視 (回放支持原判)'],
  ["(09:29) [Rockets] COACH'S CHALLENGE (CALL STANDS) [Rockets] charged with a timeout",'火箭 教練挑戰 (維持原判) 火箭 被記一次暫停'],
  ["(05:31) [Spurs] COACH'S CHALLENGE (CALL OVERTURNED) [Spurs] retain their timeout",'馬刺 教練挑戰 (推翻原判) 馬刺 保留暫停'],
  ['(01:18) [Knicks] REF-INITIATED REVIEW (CALL OVERTURNED)','尼克 裁判發起回放檢視 (推翻原判)'],
]);

test('翻不到的句子維持原文,不會壞掉',()=>{
  assert.equal(zhPlay('Something completely unexpected happens'),'Something completely unexpected happens');
});

test('空值與非字串不會丟錯',()=>{
  assert.equal(zhPlay(''),'');
  assert.equal(zhPlay(undefined),undefined);
  assert.equal(zhPlay(null),null);
});

test('所有 30 支球隊暱稱都有中文',()=>{
  const names=['Hawks','Celtics','Nets','Hornets','Bulls','Cavaliers','Mavericks','Nuggets','Pistons','Warriors','Rockets','Pacers','Clippers','Lakers','Grizzlies','Heat','Bucks','Timberwolves','Pelicans','Knicks','Thunder','Magic','76ers','Suns','Trail Blazers','Kings','Spurs','Raptors','Jazz','Wizards'];
  assert.equal(names.length,30);
  for(const n of names){
    const z=zhPlay(`${n} Full timeout`);
    assert.notEqual(z,`${n} Full timeout`,n);
    assert.ok(!z.includes(n),`${n} 沒有被翻成中文: ${z}`);
  }
});

test('真實比賽資料:幾乎每一筆都能翻成中文(防止規則被改壞)',()=>{
  const untranslated=fixtures.filter(r=>zhPlay(r.text)===r.text).map(r=>`[${r.type}] ${r.text}`);
  assert.deepEqual(untranslated,[],`有 ${untranslated.length} 筆沒翻到`);
});

test('真實比賽資料:翻譯結果不留英文動作詞',()=>{
  const leftovers=fixtures.map(r=>zhPlay(r.text)).filter(z=>/\b(makes|misses|rebound|turnover|foul|timeout|assists|steals|blocks|enters)\b/i.test(z));
  assert.deepEqual(leftovers,[]);
});
