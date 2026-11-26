const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('src/seminar-board.html','utf8'),nodes=new Map(),store=new Map();
class Node {
  constructor(){this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.listeners={};this.classList={toggle(){}};this.clientWidth=700;this.offsetHeight=180;}
  set innerHTML(v){this.html=v;}get innerHTML(){return this.html||'';}
  querySelector(s){return nodes.get(s)||new Node();}querySelectorAll(){return [];}
  setAttribute(){}removeAttribute(){}addEventListener(n,f){this.listeners[n]=f;}contains(){return false;}
  focus(){}click(){}remove(){}append(){}replaceChildren(){}prepend(){}
  showModal(){this.open=true;}close(){this.open=false;}
}
for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+match[1],new Node());
const root=nodes.get('#seminar-prototype'),media={matches:false,addEventListener(){}};
class TestURL extends URL{};let download;TestURL.createObjectURL=blob=>{download=blob;return 'blob:test';};TestURL.revokeObjectURL=()=>{};
let remote,mode='success',release,lastPayload,calls=0;
const api={uuid:()=>crypto.randomBytes(16).toString('hex'),endpoint:s=>/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]{20,200}\/exec$/.test(s)?s:'',connect:()=>({dispose(){},async call(action,payload){
  if(action==='health')return remote;
  calls++;lastPayload=JSON.parse(JSON.stringify(payload));
  if(mode==='defer')await new Promise(resolve=>release=resolve);
  if(mode==='timeout')throw new Error('SAVE_TIMEOUT');
  if(mode==='name')throw new Error('NAME_TAKEN');
  if(mode==='busy')throw new Error('BUSY_RETRY');
  return {ok:true,submission_id:payload.submission_id,submitted_at:'2026-11-21T00:00:00.000Z',test:payload.record_type==='test'};
}})};
const context={URLSearchParams,TextEncoder,Uint8Array,Blob,URL:TestURL,crypto:crypto.webcrypto,HanmadiSheets:api,console,setTimeout(){},setInterval(){},sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},document:{hidden:false,getElementById:id=>nodes.get('#'+id),createElement:()=>new Node(),addEventListener(){}},window:{matchMedia:()=>media,addEventListener(){}}};
context.window.SEMINAR_STATIC_APP=true;context.window.location={href:'https://example.com/hanmadi/',search:'',hash:''};
const transportContext={window:{},URL,Uint8Array,crypto:crypto.webcrypto};vm.runInNewContext(fs.readFileSync('src/sheets-transport.js','utf8'),transportContext);api.installation=transportContext.window.HanmadiSheets.installation;
context.fetch=async url=>({ok:true,text:async()=>fs.readFileSync(String(url).endsWith('Code.gs')?'integrations/google-sheets/Code.gs':'integrations/google-sheets/Bridge.html','utf8')});
let copiedCode='';context.navigator={clipboard:{writeText:async text=>copiedCode=text}};
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\}\)\(\);\s*$/,'root.testing={state,render,shareLink,loadSheetEntry,getPending:()=>sheetPending};})();');
vm.runInNewContext(script,context);
const t=root.testing,s=t.state,n=id=>nodes.get('#'+id),event={preventDefault(){}};
(async()=>{
  n('setup-demo').onclick();s.responses=[];s.accept=true;s.anonymous=false;
  const endpoint='https://script.google.com/macros/s/'+'x'.repeat(40)+'/exec';
  s.sheets={endpoint,requireParticipantId:true};s.publicBaseUrl='https://example.com/hanmadi/';
  assert.equal(new URL(t.shareLink('participant')).searchParams.get('gs'),'x'.repeat(40));
  n('compose-open').onclick();n('author').value='Test User';n('answer').value='A response';n('sheet-participant-id').value='';
  await n('response-form').onsubmit(event);assert.equal(calls,0);assert.equal(s.responses.length,0);assert.match(n('form-message').textContent,/참가자 ID/);
  n('sheet-participant-id').value='bot-123';mode='defer';
  const submitted=n('response-form').onsubmit(event);await Promise.resolve();assert.equal(calls,1);assert.equal(s.responses.length,0);assert.equal(n('submit-answer').disabled,true);assert.equal(n('answer').readOnly,true);
  await n('response-form').onsubmit(event);assert.equal(calls,1);release();await submitted;
  assert.equal(s.responses.length,1);assert.equal(s.responses[0].createdAt,'2026-11-21T00:00:00.000Z');assert.equal(n('composer').open,false);assert.equal(t.getPending(),null);assert.equal(lastPayload.participant_id,'bot-123');assert.equal(Object.hasOwn(s.responses[0],'botId'),false);
  mode='timeout';n('compose-open').onclick();n('author').value='Another User';n('answer').value='Keep this draft';n('sheet-participant-id').value='bot-456';
  await n('response-form').onsubmit(event);assert.equal(s.responses.length,1);assert.equal(n('composer').open,true);assert.equal(n('answer').value,'Keep this draft');assert.equal(n('answer').readOnly,true);assert.equal(n('submit-answer').disabled,false);assert.ok(t.getPending());
  const pendingId=lastPayload.submission_id;assert.equal(store.size>=1,true);
  // Closing and reopening restores the identical pending payload rather than allocating a new ID.
  n('compose-close').onclick();n('compose-open').onclick();assert.equal(n('answer').value,'Keep this draft');
  mode='busy';await n('response-form').onsubmit(event);assert.equal(t.getPending().submission_id,pendingId);
  mode='success';s.accept=false;await n('response-form').onsubmit(event);assert.equal(lastPayload.submission_id,pendingId);assert.equal(s.responses.length,2);assert.equal(t.getPending(),null);
  s.accept=true;mode='name';n('compose-open').onclick();n('author').value='Duplicate User';n('answer').value='Try another nickname';n('sheet-participant-id').value='bot-789';
  await n('response-form').onsubmit(event);assert.equal(t.getPending(),null);assert.equal(n('answer').readOnly,false);assert.equal(s.responses.length,2);
  mode='success';n('author').value='Unique User';await n('response-form').onsubmit(event);assert.equal(s.responses.length,3);
  s.sheets=null;n('connection-open').onclick();n('connection-mode').value='sheets';n('sheets-endpoint').value=endpoint;
  remote={ok:true,eventCode:s.eventCode,event:{question:s.question,accept:true},requireParticipantId:true};
  await n('sheets-test').onclick();await n('connection-apply').onclick();assert.equal(n('connection-dialog').open,true);
  assert.notEqual(n('setup-storage-status').textContent,'✓ Google Sheets 연결 완료');
  await n('sheets-test-record').onclick();assert.equal(n('setup-storage-status').textContent,'시트 저장 확인 완료 · 연결 확정 전');
  await n('connection-apply').onclick();assert.equal(n('connection-dialog').open,false);assert.equal(lastPayload.record_type,'test');
  assert.equal(n('setup-storage-status').textContent,'✓ Google Sheets 연결 완료');assert.equal(n('storage-status').textContent,'✓ Google Sheets 연결 완료');assert.equal(n('setup-connection-open').textContent,'저장할 곳 변경');assert.equal(n('connection-open').textContent,'저장할 곳 변경');
  n('sheets-template').onclick();const bytes=Buffer.from(await download.arrayBuffer());fs.writeFileSync('/private/tmp/hanmadi-google-sheets-template.xlsx',bytes);assert.equal(bytes.subarray(0,2).toString(),'PK');
  assert.equal(t.state.sheets.requireParticipantId,true);
  s.question='How was the event?';remote.event.question=s.question;
  api.templates=()=>({'Code.gs':fs.readFileSync('integrations/google-sheets/Code.gs','utf8'),'Bridge.html':fs.readFileSync('integrations/google-sheets/Bridge.html','utf8')});
  context.fetch=async()=>{throw new Error('External asset requests must not be needed');};
  n('sheets-document').value='https://docs.google.com/spreadsheets/d/test-sheet-id/edit';n('sheets-tab').value='hanmadi';n('sheets-site').value='https://example.com/hanmadi/';
  await n('sheets-build-code').onclick();assert.ok(n('sheets-code').value.includes('const HANMADI_BRIDGE_HTML = "'),n('connection-status').textContent);assert.equal(n('sheets-google-step').open,true);assert.equal(n('sheets-copy-code').disabled,false);
  copiedCode='';const copyPromise=n('sheets-copy-code').onclick();assert.equal(copiedCode,n('sheets-code').value,'Clipboard write must run synchronously inside the click');await copyPromise;
  context.navigator.clipboard.writeText=()=>Promise.reject(new Error('NotAllowedError'));let legacyCopies=0;context.document.execCommand=command=>{assert.equal(command,'copy');assert.equal(n('sheets-code').value,copiedCode);legacyCopies++;return true;};assert.equal(await n('sheets-copy-code').onclick(),true);assert.equal(legacyCopies,1);delete context.document.execCommand;
  delete context.navigator.clipboard.writeText;await n('sheets-copy-code').onclick();assert.equal(n('sheets-code-details').open,true);
  n('sheets-select-code').onclick();assert.equal(n('sheets-code').value,copiedCode);
  await n('sheets-connect-once').onclick();assert.equal(lastPayload.record_type,'test');
  context.window.SEMINAR_STATIC_APP=false;const callsBeforePreview=calls;await n('sheets-connect-once').onclick();assert.equal(calls,callsBeforePreview);assert.match(n('connection-status').textContent,/미리보기/);context.window.SEMINAR_STATIC_APP=true;
  s.sheets=null;n('compose-open').onclick();n('author').value='Local User';n('answer').value='Local response';const before=calls;await n('response-form').onsubmit(event);assert.equal(calls,before);assert.equal(s.responses.length,4);
  context.window.SEMINAR_STATIC_APP=true;context.window.location={href:'https://example.com/hanmadi/',search:'?e='+s.eventCode+'&v=p&gs='+'x'.repeat(40)};
  remote.event={question:'Server-configured question',guidance:'Instructions',title:'Connected event',accept:true,anonymous:false};
  await t.loadSheetEntry('x'.repeat(40),s.eventCode,'participant');
  assert.equal(s.question,'Server-configured question');assert.equal(s.role,'participant');assert.equal(s.responses.length,0);assert.equal(s.react,false);assert.equal(s.sheets.endpoint,endpoint);assert.equal(s.onboarding,'workspace');
  console.log('PASS UI: bot ID validation, server acknowledgement before success, double-click guard, stable retry after timeout/close/reception change, drafts, name conflict recovery, connection test gate, test row, template download, local fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
