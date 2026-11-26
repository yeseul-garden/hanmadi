// Hanmadi Google Sheets receiver. Deploy as a Web app: Execute as Me, access Anyone.
// Generated configuration contains your private Sheet ID. Do not commit that file.
const HANMADI = /*__HANMADI_CONFIG__*/ null;
const HANMADI_BRIDGE_HTML = /*__HANMADI_BRIDGE__*/ null;
const HANMADI_HEADERS = ['submission_id','event_id','booth_id','participant_id','display_name','question_id','question','answer','submitted_at','activity_status','client_id','payload_hash'];
const HANMADI_KOREAN_HEADERS = ['제출 ID','행사 ID','부스 ID','참가자 ID','표시 이름','질문 ID','질문 내용','답변 내용','제출 시각'];

function initializeHanmadi() {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    sheetHanmadi_();
    const p = PropertiesService.getScriptProperties();
    if (p.getProperty('HANMADI_ACCEPTING') === null) p.setProperty('HANMADI_ACCEPTING','true');
    initializeControlHanmadi_();
    p.setProperty('HANMADI_CONTROL_READY','true');
    console.log('Ready. Open the settings tab in Google Sheets to start or close submissions.');
  } finally { lock.releaseLock(); }
}
function controlNameHanmadi_() {
  const name=HANMADI.sheetName+'_설정';
  return name.length<=100?name:HANMADI.sheetName.slice(0,80)+'_설정_'+HANMADI.eventCode.slice(-12);
}
function initializeControlHanmadi_() {
  const book=SpreadsheetApp.openById(HANMADI.spreadsheetId);
  const sheet=book.getSheetByName(controlNameHanmadi_()) || book.insertSheet(controlNameHanmadi_());
  if(!sheet.getLastRow()) {
    sheet.getRange(1,1,6,2).setValues([
      ['Hanmadi 연결 설정','이 탭에서 답변 접수를 관리하세요.'],
      ['답변 받기',false],['행사 코드',HANMADI.eventCode],['답변 탭',HANMADI.sheetName],
      ['사용 방법','체크하면 접수 중, 체크를 해제하면 접수가 마감됩니다.'],
      ['참고','운영 화면의 답변 받기와 타이머가 연결됩니다. 아래 데이터는 수정하지 마세요.']
    ]);
    sheet.getRange(2,2,1,1).insertCheckboxes().setValue(PropertiesService.getScriptProperties().getProperty('HANMADI_ACCEPTING')==='true');
    sheet.setColumnWidth(1,160);sheet.setColumnWidth(2,440);
  } else if(sheet.getRange(1,1,1,1).getValue()!=='Hanmadi 연결 설정' || sheet.getRange(3,2,1,1).getValue()!==HANMADI.eventCode) throw new Error('CONTROL_SHEET_MISMATCH');
  return sheet;
}
function acceptingHanmadi_() {
  const book=SpreadsheetApp.openById(HANMADI.spreadsheetId),sheet=book.getSheetByName(controlNameHanmadi_());
  // Legacy installations still work until re-initialized. New controls take precedence.
  if(!sheet){
    const properties=PropertiesService.getScriptProperties();
    if(properties.getProperty('HANMADI_CONTROL_READY')==='true')throw new Error('CONTROL_SHEET_MISSING');
    return properties.getProperty('HANMADI_ACCEPTING')==='true';
  }
  if(sheet.getRange(1,1,1,1).getValue()!=='Hanmadi 연결 설정' || sheet.getRange(3,2,1,1).getValue()!==HANMADI.eventCode)throw new Error('CONTROL_SHEET_MISMATCH');
  return sheet.getRange(2,2,1,1).getValue()===true;
}
function sheetHanmadi_() {
  if (!HANMADI || !HANMADI.spreadsheetId || !HANMADI.event) throw new Error('SETUP_REQUIRED');
  const book = SpreadsheetApp.openById(HANMADI.spreadsheetId);
  const sheet = book.getSheetByName(HANMADI.sheetName) || book.insertSheet(HANMADI.sheetName);
  if (!sheet.getLastRow()) {
    sheet.getRange(1,1,1,HANMADI_HEADERS.length).setValues([HANMADI_HEADERS]); sheet.setFrozenRows(1);
  }
  const headers = sheet.getRange(1,1,1,HANMADI_HEADERS.length).getValues()[0].map(function(v){return String(v).trim();});
  const base = headers.slice(0,9).join('|');
  if (base !== HANMADI_HEADERS.slice(0,9).join('|') && base !== HANMADI_KOREAN_HEADERS.join('|')) throw new Error('HEADER_MISMATCH');
  if (headers.slice(9).every(function(v){return !v;}) && sheet.getLastRow()===1) {
    sheet.getRange(1,10,1,3).setValues([HANMADI_HEADERS.slice(9)]);
  } else if (headers.slice(9).join('|') !== HANMADI_HEADERS.slice(9).join('|')) throw new Error('HEADER_MISMATCH');
  return sheet;
}
function doGet(e) {
  if (!HANMADI) return HtmlService.createHtmlOutput('Run Hanmadi setup first.');
  const channel = String(e.parameter.channel || '');
  if (!/^[a-f0-9]{32}$/.test(channel)) return HtmlService.createHtmlOutput('Open the participant link from Hanmadi.');
  const bootstrap = JSON.stringify({channel:channel,origin:HANMADI.allowedOrigin}).replace(/</g,'\\u003c');
  if(HANMADI_BRIDGE_HTML) return HtmlService.createHtmlOutput(HANMADI_BRIDGE_HTML.replace('__HANMADI_BOOTSTRAP__',bootstrap)).setTitle('Hanmadi Sheets connection').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  const template = HtmlService.createTemplateFromFile('Bridge');
  template.bootstrap = bootstrap;
  return template.evaluate().setTitle('Hanmadi Sheets connection').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function healthHanmadi() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('HANMADI_ACCEPTING') === null) throw new Error('RUN_INITIALIZE');
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('BUSY_RETRY');
  try {return healthSharedHanmadi_();} finally {lock.releaseLock();}
}
function textHanmadi_(value,max,required) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('INVALID_INPUT');
  return value.trim();
}
function literalHanmadi_(s) { return /^[\s]*[=+\-@]/.test(s) ? "'" + s : s; }
function nameHanmadi_(s) { return s.normalize('NFKC').toLowerCase().replace(/\s+/g,''); }
function submitHanmadi(data) {
  if (!data || JSON.stringify(data).length > 16000) throw new Error('INVALID_INPUT');
  if (data.event_id !== HANMADI.eventCode || String(data.question_id) !== '1') throw new Error('EVENT_MISMATCH');
  const id = textHanmadi_(data.submission_id,80,true);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(id)) throw new Error('INVALID_INPUT');
  const client = textHanmadi_(data.client_id,80,true);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(client)) throw new Error('INVALID_INPUT');
  const test = data.record_type === 'test';
  if (!test && data.record_type !== 'response') throw new Error('INVALID_INPUT');
  const name = textHanmadi_(data.display_name,50,true), answer = textHanmadi_(data.answer,1000,true);
  const participant = textHanmadi_(data.participant_id,100,!test && !!HANMADI.requireParticipantId);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([data.event_id,'1',client,participant,name,answer,test])).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('BUSY_RETRY');
  try {
    const sheet = sheetHanmadi_();
    const rows = sheet.getLastRow()>1 ? sheet.getRange(2,1,sheet.getLastRow()-1,HANMADI_HEADERS.length).getValues() : [];
    const previous = rows.find(function(r){return r[0] === id;});
    // Check the receipt before the reception gate: an already accepted retry stays successful.
    if (previous) {
      if (previous[11] !== digest) throw new Error('RETRY_MISMATCH');
      return {ok:true,submission_id:id,submitted_at:String(previous[8]),duplicate:true,test:test};
    }
    const current=healthSharedHanmadi_().event;
    if (!current.accept) throw new Error('SUBMISSIONS_CLOSED');
    if (!test && current.anonymous && rows.some(function(r){return r[9]==='submitted' && nameHanmadi_(String(r[4]).replace(/^'(?=\s*[=+\-@])/,''))===nameHanmadi_(name) && r[10]!==client;})) throw new Error('NAME_TAKEN');
    const stamp = new Date().toISOString();
    const row = [id,HANMADI.eventCode,HANMADI.boothId,participant,name,'1',current.question,answer,stamp,test?'test':'submitted',client,digest].map(function(v){return literalHanmadi_(String(v || ''));});
    sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();
    invalidateBoardHanmadi_();
    return {ok:true,submission_id:id,submitted_at:stamp,duplicate:false,test:test};
  } finally { lock.releaseLock(); }
}

// Version 2: public board snapshots and authenticated host settings.
// The private admin key is never returned by health/snapshot or embedded in a QR.
function hostHanmadi_(data) {
  if(!HANMADI.adminKey || !data || data.adminKey!==HANMADI.adminKey)throw new Error('HOST_KEY_REQUIRED');
}
function sharedStateHanmadi_() {
  const p=PropertiesService.getScriptProperties(),count=Number(p.getProperty('HANMADI_STATE_PARTS')||0);
  if(!count)return {event:HANMADI.event,moderation:{}};
  if(count<0||count>160)throw new Error('INVALID_INPUT');
  const sheet=SpreadsheetApp.openById(HANMADI.spreadsheetId).getSheetByName(controlNameHanmadi_());
  const json=sheet.getRange(8,2,count,1).getValues().map(function(r){return String(r[0]);}).join('');
  return JSON.parse(json);
}
function healthSharedHanmadi_() {
  const shared=sharedStateHanmadi_(),event=Object.assign({},shared.event),p=PropertiesService.getScriptProperties();
  event.accept=acceptingHanmadi_() && !(event.timerEnabled && Number.isFinite(event.timerDeadline) && event.timerDeadline<=Date.now());
  if(event.timerEnabled&&Number.isFinite(event.timerDeadline)&&event.timerDeadline<=Date.now())event.timerExpired=true;
  return {ok:true,protocol:2,event:event,eventCode:HANMADI.eventCode,requireParticipantId:!!HANMADI.requireParticipantId,revision:Number(p.getProperty('HANMADI_REVISION')||0),serverNow:Date.now()};
}
function snapshotHanmadi(data) {
  if(data&&data.adminKey)hostHanmadi_(data);
  const cache=typeof CacheService!=='undefined'?CacheService.getScriptCache():null,key=data&&data.adminKey?'board-host':'board-public';
  const hit=cache&&cache.get(key);if(hit){const cached=JSON.parse(hit);cached.serverNow=Date.now();if(cached.event.timerEnabled&&Number.isFinite(cached.event.timerDeadline)&&cached.event.timerDeadline<=Date.now()){cached.event.accept=false;cached.event.timerExpired=true;}return cached;}
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('BUSY_RETRY');
  try {
    const result=healthSharedHanmadi_(),shared=sharedStateHanmadi_(),sheet=sheetHanmadi_();
    const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,HANMADI_HEADERS.length).getValues():[];
    const literal=function(v){return String(v||'').replace(/^'(?=\s*[=+\-@])/,'');};
    result.responses=rows.filter(function(r){return r[1]===HANMADI.eventCode&&r[9]==='submitted';}).map(function(r,i){
      const meta=(shared.moderation||{})[r[0]]||{};
      // Explicit public allowlist: no participant_id, client_id, payload_hash or bot information.
      return {id:String(r[0]),sequence:i+1,name:literal(r[4]),text:literal(r[7]),createdAt:String(r[8]),hidden:meta.hidden===true,pinned:meta.pinned===true,completed:meta.completed===true};
    }).filter(function(r){return data&&data.adminKey||!r.hidden;});
    const encoded=JSON.stringify(result);if(cache&&encoded.length<20000)cache.put(key,encoded,10);
    return result;
  } finally {lock.releaseLock();}
}
function authorizeHanmadi(data){hostHanmadi_(data);return snapshotHanmadi(data);}
function updateHanmadi(data) {
  hostHanmadi_(data);
  if(!data.event||JSON.stringify(data).length>3100000)throw new Error('INVALID_INPUT');
  if(typeof data.event.title==='string'&&data.event.title.length>40)throw new Error('INVALID_INPUT');
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('BUSY_RETRY');
  try {
    const p=PropertiesService.getScriptProperties(),revision=Number(p.getProperty('HANMADI_REVISION')||0);
    if(data.revision!==revision)throw new Error('STALE_EVENT');
    const old=sharedStateHanmadi_(),event=Object.assign({},old.event),input=data.event;
    ['title','question','guidance','nameLabel','nameExample'].forEach(function(k){if(typeof input[k]==='string'&&input[k].length<=4000)event[k]=input[k];});
    ['required','anonymous','brandCustom','react','timerEnabled','timerExpired','fontCustom'].forEach(function(k){if(typeof input[k]==='boolean')event[k]=input[k];});
    [['color',/^#[a-f0-9]{6}$/i],['view',/^(list|board|space)$/],['sort',/^(hybrid|latest)$/],['logoBg',/^(light|dark)$/],['spacePalette',/^(planets|brand|custom)$/],['fontChoice',/^(ibm|pretendard|noto-sans|noto-serif|inter|dm-sans|manrope|source-sans)$/]].forEach(function(pair){if(typeof input[pair[0]]==='string'&&pair[1].test(input[pair[0]]))event[pair[0]]=input[pair[0]];});
    if(input.logo===null)event.logo=null;
    else if(typeof input.logo==='string'&&input.logo.length<2900000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.logo))event.logo=input.logo;
    ['timerDeadline','timerPausedMs'].forEach(function(k){if(input[k]===null||Number.isFinite(input[k])&&input[k]>=0)event[k]=input[k];});
    ['timerMinutes','timerSeconds'].forEach(function(k){if(Number.isInteger(input[k])&&input[k]>=0&&input[k]<=10800)event[k]=input[k];});
    if(Array.isArray(input.planetColors)&&input.planetColors.length===5&&input.planetColors.every(function(c){return /^#[a-f0-9]{6}$/i.test(c);}))event.planetColors=input.planetColors;
    if(input.emojiByView){event.emojiByView={};['list','board','space'].forEach(function(k){event.emojiByView[k]=input.emojiByView[k]===true;});}
    const moderation=old.moderation||{};
    if(data.moderation)Object.keys(data.moderation).slice(0,5000).forEach(function(id){if(!/^[a-zA-Z0-9_-]{16,80}$/.test(id))return;const m=data.moderation[id];moderation[id]={hidden:m.hidden===true,pinned:m.pinned===true,completed:m.completed===true};});
    const value=JSON.stringify({event:event,moderation:moderation}),parts=[];
    for(let i=0;i<value.length;i+=20000)parts.push([value.slice(i,i+20000)]);
    const sheet=initializeControlHanmadi_();sheet.getRange(8,2,parts.length,1).setNumberFormat('@').setValues(parts);
    if(typeof input.accept==='boolean')sheet.getRange(2,2,1,1).setValue(input.accept);
    p.setProperty('HANMADI_STATE_PARTS',String(parts.length));p.setProperty('HANMADI_REVISION',String(revision+1));
    SpreadsheetApp.flush();invalidateBoardHanmadi_();return healthSharedHanmadi_();
  } finally {lock.releaseLock();}
}
function invalidateBoardHanmadi_(){if(typeof CacheService!=='undefined')CacheService.getScriptCache().removeAll(['board-host','board-public']);}
