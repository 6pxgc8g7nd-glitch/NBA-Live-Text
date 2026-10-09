// 逐球文字:英文 → 繁體中文(規則式翻譯,球員名字保留英文;翻不到的句子維持原文)
const TEAM_ZH={Hawks:'老鷹',Celtics:'塞爾提克',Nets:'籃網',Hornets:'黃蜂',Bulls:'公牛',Cavaliers:'騎士',Mavericks:'獨行俠',Nuggets:'金塊',Pistons:'活塞',Warriors:'勇士',Rockets:'火箭',Pacers:'溜馬',Clippers:'快艇',Lakers:'湖人',Grizzlies:'灰熊',Heat:'熱火',Bucks:'公鹿',Timberwolves:'灰狼',Pelicans:'鵜鶘',Knicks:'尼克',Thunder:'雷霆',Magic:'魔術','76ers':'七六人',Suns:'太陽',Blazers:'拓荒者','Trail Blazers':'拓荒者',Kings:'國王',Spurs:'馬刺',Raptors:'暴龍',Jazz:'爵士',Wizards:'巫師'};
const teamZh=n=>TEAM_ZH[n]||n;

function shotZh(desc){
  const d=desc.toLowerCase();
  const three=/three point/.test(d)?'三分':'';
  let base;
  if(/tip.?in dunk|tip dunk/.test(d))base='補扣';
  else if(/dunk/.test(d))base='灌籃';
  else if(/layup/.test(d))base='上籃';
  else if(/tip/.test(d))base='補籃';
  else if(/hook/.test(d))base='勾射';
  else if(/bank/.test(d))base='擦板跳投';
  else if(/two point shot/.test(d)&&!/jump/.test(d))base='兩分球';
  else if(/jump ?shot|jumper/.test(d))base='跳投';
  else base='投籃';
  const mods=[];
  if(/fade ?away/.test(d))mods.push('後仰');
  if(/pull ?up/.test(d))mods.push('急停');
  if(/step back/.test(d))mods.push('後撤步');
  if(/turnaround/.test(d))mods.push('轉身');
  if(/floating/.test(d))mods.push('拋投式');
  if(/driving/.test(d))mods.unshift('切入');
  else if(/running/.test(d))mods.unshift('跑動');
  else if(/cutting/.test(d))mods.unshift('空切');
  if(/alley oop/.test(d)&&base==='灌籃')mods.unshift('空接');
  if(/putback/.test(d))mods.push('補進');
  return three+mods.join('')+base;
}

function zhPlay(raw){
  if(!raw)return raw;
  let t=String(raw).replace(/\s+/g,' ').trim(),m;
  const ast=s=>s.replace(/ \((.+?) assists\)$/,(_,n)=>`(${n} 助攻)`);

  if(m=t.match(/^End of the (\d)(?:st|nd|rd|th) Quarter$/i))return `第 ${m[1]} 節結束`;
  if(m=t.match(/^End of the (\d)?(?:st|nd|rd|th)? ?Overtime$/i))return `延長賽${m[1]?' 第 '+m[1]+' 節':''}結束`;
  if(/^End of (the )?Game$/i.test(t))return '比賽結束';
  if(m=t.match(/^Start of the (\d)(?:st|nd|rd|th) Quarter$/i))return `第 ${m[1]} 節開始`;
  if(m=t.match(/^(.+?) enters the game for (.+)$/))return `換人:${m[1]} 上場,${m[2]} 下場`;
  if(m=t.match(/^(.+?) vs\. (.+?) \((.+?) gains possession\)$/))return `跳球:${m[1]} 對 ${m[2]}(${m[3]} 獲得球權)`;
  if(m=t.match(/^(?:(.+?) )?(makes|misses) free throw (?:technical |flagrant |clear path )?(\d) of (\d)$/))return `${m[1]?m[1]+' ':''}罰球${m[2]==='makes'?'命中':'不中'}(${m[3]}/${m[4]})`;
  if(m=t.match(/^(.+?) blocks (.+?) ?'s (?:(\d+)-foot )?(.+)$/))return `${m[1]} 阻攻 ${m[2]} 的 ${m[3]?m[3]+' 英尺':''}${shotZh(m[4])}`;
  if(m=t.match(/^(.+?) (makes|misses) (?:(\d+)-foot )?(.+?)(?: \((.+?) assists\))?$/)){
    if(/shot|jump|layup|dunk|hook|tip|finger roll|bank|three point|two point|alley/i.test(m[4])){
      return `${m[1]} ${m[2]==='makes'?'命中':'未進'} ${m[3]?m[3]+' 英尺':''}${shotZh(m[4])}${m[5]?`(${m[5]} 助攻)`:''}`;
    }
  }
  if(m=t.match(/^(.+?) (defensive|offensive) rebound$/))return `${m[1]} ${m[2]==='defensive'?'防守':'進攻'}籃板`;
  if(m=t.match(/^(.+?) (defensive|offensive) team rebound$/))return `${teamZh(m[1])} ${m[2]==='defensive'?'防守':'進攻'}團隊籃板`;
  if(/^shot clock turnover$/i.test(t))return '進攻 24 秒違例';
  if(m=t.match(/^(.+?) (bad pass) ?turnover(?: \((.+?) steals\))?$/i))return `${m[1]} 傳球失誤${m[3]?`(${m[3]} 抄截)`:''}`;
  if(m=t.match(/^(.+?) out of bounds lost ball turnover$/))return `${m[1]} 球出界失誤`;
  if(m=t.match(/^(.+?) lost ball turnover(?: \((.+?) steals\))?$/))return `${m[1]} 掉球失誤${m[2]?`(${m[2]} 抄截)`:''}`;
  if(m=t.match(/^(.+?) steps out of bounds turnover$/))return `${m[1]} 踩線失誤`;
  if(m=t.match(/^(.+?) offensive foul turnover$/))return `${m[1]} 進攻犯規失誤`;
  if(m=t.match(/^(.+?) (traveling|double dribble|palming|discontinue dribble)(?: turnover)?$/i)){
    const k={traveling:'走步違例','double dribble':'二次運球違例',palming:'翻腕違例','discontinue dribble':'停運後再運球違例'};return `${m[1]} ${k[m[2].toLowerCase()]}`;}
  if(m=t.match(/^(.+?) turnover(?: \((.+?) steals\))?$/))return `${m[1]} 失誤${m[2]?`(${m[2]} 抄截)`:''}`;
  const foul={'shooting foul':'投籃犯規','personal foul':'個人犯規','loose ball foul':'爭球犯規','offensive foul':'進攻犯規','offensive charge':'帶球撞人(進攻犯規)','technical foul':'技術犯規','flagrant foul type 1':'一級惡意犯規','flagrant foul type 2':'二級惡意犯規','personal take foul':'戰術犯規','transition take foul':'快攻戰術犯規','away from play foul':'無球犯規','defensive 3-seconds':'防守三秒違例','defensive 3 seconds':'防守三秒違例','kicked ball violation':'踢球違例','lane violation':'罰球線違例','goaltending':'干擾球','defensive goaltending violation':'防守干擾球違例','offensive goaltending violation':'進攻干擾球違例','inbound foul':'發球犯規','punching foul':'揮拳犯規','clear path foul':'破壞快攻犯規'};
  if(m=t.match(/^(.+?) (shooting foul|personal foul|loose ball foul|offensive foul|offensive charge|technical foul|flagrant foul type [12]|personal take foul|transition take foul|away from play foul|defensive 3[- ]seconds|kicked ball violation|lane violation|(?:defensive|offensive) goaltending violation|goaltending|inbound foul|clear path foul)$/i))return `${m[1]} ${foul[m[2].toLowerCase()]}`;
  if(/^delay of game violation$/i.test(t))return '延誤比賽違例';
  if(m=t.match(/^(.+?) (Full|20 Sec\.?|Short|Official|No) timeout$/i)){
    const k=/^full/i.test(m[2])?'暫停':/^20/.test(m[2])?'20 秒暫停':/^short/i.test(m[2])?'短暫停':/^official/i.test(m[2])?'官方暫停':'暫停';
    return `${teamZh(m[1])} ${k}`;}
  if(/REVIEW|CHALLENGE/i.test(t)){
    return t.replace(/\((\d\d:\d\d)\)\s*/,'').replace(/\[(.+?)\]/g,(_,n)=>teamZh(n))
      .replace(/REF-INITIATED REVIEW/i,'裁判發起回放檢視').replace(/COACH'S CHALLENGE/i,'教練挑戰')
      .replace(/\(REPLAY SUPPORTS CALL\)/i,'(回放支持原判)').replace(/\(REPLAY OVERTURNS CALL\)|\(CALL OVERTURNED\)/i,'(推翻原判)')
      .replace(/\(CALL STANDS\)/i,'(維持原判)').replace(/\(NO CHANGE\)/i,'(維持原判)')
      .replace(/charged with a timeout/i,'被記一次暫停').replace(/retain their timeout/i,'保留暫停').replace(/\(REPLAY SUPPORTS CALL\)/i,'(回放支持原判)')
      .replace(/\s+/g,' ').trim();
  }
  return raw;
}
if(typeof module!=='undefined')module.exports={zhPlay};
