
const assert=require('node:assert/strict');
function client(){
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
  if(action==='health'||action==='snapshot'||action==='authorize')return JSON.parse(JSON.stringify(remote));
  if(action==='update'){lastPayload=payload;remote.event=payload.event;remote.revision++;return JSON.parse(JSON.stringify(remote));}
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
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\}\)\(\);\s*$/,'root.testing={state,render,shareLink,loadSheetEntry,getPending:()=>sheetPending,applySheetSnapshot,queueSheetSave,getQueue:()=>sheetWriteQueue,entryParams,sessionSnapshot};})();');
vm.runInNewContext(script,context);
const t=root.testing,s=t.state,n=id=>nodes.get('#'+id),event={preventDefault(){}};

return {t,s,n,context,click:dataset=>root.listeners.click({target:{closest:()=>({dataset,disabled:false})}}),setRemote:v=>remote=v,last:()=>lastPayload};
}
(async()=>{
 const host=client(),participant=client(),present=client();
 const endpoint='https://script.google.com/macros/s/'+'x'.repeat(40)+'/exec',now=Date.now(),deadline=now+120000;
 const data={ok:true,protocol:2,eventCode:'live-event',revision:4,serverNow:now,event:{title:'<비주얼커뮤니케이션> 커리어 특강',question:'Question',guidance:'Instructions',nameLabel:'Name',anonymous:true,required:true,color:'#FF6B58',brandCustom:true,view:'board',logo:'data:image/png;base64,AAAA',accept:true,timerEnabled:true,timerMinutes:2,timerSeconds:0,timerDeadline:deadline,timerPausedMs:null,timerExpired:false},responses:[{id:'a'.repeat(32),sequence:1,name:'First person',text:'First response',createdAt:new Date(now).toISOString()},{id:'b'.repeat(32),sequence:2,name:'Second person',text:'Second response',createdAt:new Date(now+1).toISOString()}]};
 for(const [c,role]of [[host,'admin'],[participant,'participant'],[present,'present']]){c.s.eventCode=data.eventCode;c.s.role=role;c.s.onboarding='workspace';c.s.sheets={endpoint,protocol:2,host:role==='admin',adminKey:role==='admin'?'private-key':undefined};c.s.publicBaseUrl='https://example.com/hanmadi/';c.setRemote(data);c.t.applySheetSnapshot(JSON.parse(JSON.stringify(data)));assert.equal(c.s.title,data.event.title);assert.equal(c.s.logo,data.event.logo);assert.equal(c.s.responses.length,2);assert.equal(c.s.responses[1].text,'Second response');assert.equal(c.s.view,'board');assert.ok(Math.abs(c.t.sessionSnapshot().seconds-120)<=1);}
 present.click({themeToggle:'true'});assert.equal(present.s.appearance,'dark');present.click({view:'space'});assert.equal(present.s.view,'space');present.t.applySheetSnapshot(data);assert.equal(present.s.appearance,'dark');assert.equal(present.s.view,'space');assert.equal(participant.s.view,'board');
 participant.click({themeToggle:'true'});assert.equal(participant.s.appearance,'dark');participant.t.applySheetSnapshot({...data,event:{...data.event,accept:false,timerPausedMs:45000,timerDeadline:null}});assert.equal(participant.t.sessionSnapshot().paused,true);assert.equal(participant.t.sessionSnapshot().seconds,45);
 const advanced={...data,serverNow:now-10000,event:{...data.event,timerDeadline:now+110000}};host.t.applySheetSnapshot(advanced);assert.ok(Math.abs(host.t.sessionSnapshot().seconds-120)<=1);host.s.title='New title';host.t.queueSheetSave();await host.t.getQueue();assert.equal(host.last().event.title,'New title');assert.ok(Math.abs(host.last().event.timerDeadline-advanced.event.timerDeadline)<100);assert.equal(host.last().adminKey,'private-key');
 const links={abc123def4:{eventCode:data.eventCode,deployment:'x'.repeat(40)}};
 for(const c of [host,participant,present])c.context.window.HANMADI_LINKS=links;
 const p=participant.t.shareLink('participant'),r=present.t.shareLink('present');assert.ok(p.endsWith('#/abc123def4/participant-form'));assert.ok(r.endsWith('#/abc123def4/result'));assert.notEqual(p,r);assert.ok(!p.includes('private-key'));
 participant.context.window.location.hash='#/abc123def4/participant-form';assert.equal(participant.t.entryParams().get('v'),'p');present.context.window.location.hash='#/abc123def4/result';assert.equal(present.t.entryParams().get('v'),'s');assert.equal(present.t.entryParams().get('gs'),'x'.repeat(40));
 participant.context.window.location.hash='';participant.context.window.location.search='?e=live-event&v=p&gs='+'x'.repeat(40);assert.equal(participant.t.entryParams().get('v'),'p');
 console.log('PASS three-screen Sheets UI: shared title/logo/responses, clock correction, pause, local presenter view/theme, authenticated host writes, distinct short routes and legacy URL compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1;});
