// Set Script Properties: SHEET_ID, TAB_NAME, SITE_ORIGIN.
// Optional: LDAP_HEADER (default LDAP ID), ANSWER_HEADER (default question below).
const FORM_QUESTION = 'AI Self-Learning 페이지에 어떤 콘텐츠가 담기면 좋을 것 같나요? AI를 내 업무에서 더 잘 사용하기 위해 필요한 아이디어나 사이트에 개선할 점이 있다면 알려주세요.';
function readFormResponses() {
  const p = PropertiesService.getScriptProperties().getProperties();
  if (!p.SHEET_ID || !p.TAB_NAME) throw new Error('SETUP_REQUIRED');
  const sheet = SpreadsheetApp.openById(p.SHEET_ID).getSheetByName(p.TAB_NAME);
  if (!sheet) throw new Error('TAB_NOT_FOUND');
  if (sheet.getLastRow() < 1) throw new Error('HEADER_MISMATCH');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(v => v.trim());
  const ldap = headers.indexOf(p.LDAP_HEADER || 'LDAP ID');
  const answer = headers.indexOf(p.ANSWER_HEADER || FORM_QUESTION);
  if (ldap < 0 || answer < 0) throw new Error('HEADER_MISMATCH');
  // Return only the two selected fields; never expose email or other form columns.
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).getDisplayValues() : [];
  return {ok:true, question:FORM_QUESTION, responses:rows.map((row,i) => ({id:i+1,name:row[ldap].trim(),text:row[answer].trim()})).filter(row => row.name && row.text)};
}
function doGet(e) {
  const origin = PropertiesService.getScriptProperties().getProperty('SITE_ORIGIN');
  if (!/^https:\/\/[^/]+$/.test(origin || '')) throw new Error('SETUP_REQUIRED');
  const channel = String(e.parameter.channel || '');
  if (!/^[a-f0-9]{32}$/.test(channel)) throw new Error('INVALID_CHANNEL');
  const config = JSON.stringify({origin,channel}).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<script>(function(){const c='+config+';const send=m=>top.postMessage(Object.assign({hanmadiSheets:1,channel:c.channel},m),c.origin);let busy=false;addEventListener("message",e=>{const m=e.data;if(e.source!==top||e.origin!==c.origin||!m||m.channel!==c.channel||m.hanmadiSheets!==1||m.action!=="responses"||typeof m.id!=="string"||busy)return;busy=true;google.script.run.withSuccessHandler(result=>{busy=false;send({id:m.id,result});}).withFailureHandler(()=>{busy=false;send({id:m.id,error:"READ_FAILED"});}).readFormResponses();});send({ready:true});})();</script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
