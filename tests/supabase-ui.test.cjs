const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('src/seminar-board.html','utf8'),nodes=new Map(),store=new Map();
class Node{
 constructor(){this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.listeners={};this.classList={toggle(){}};this.clientWidth=700;this.offsetHeight=180;}
 set innerHTML(v){this.html=v;}get innerHTML(){return this.html||'';}querySelector(s){return nodes.get(s)||new Node();}querySelectorAll(){return [];}
 setAttribute(){}removeAttribute(){}addEventListener(n,f){this.listeners[n]=f;}contains(){return false;}focus(){}click(){}remove(){}append(){}replaceChildren(){}prepend(){}showModal(){this.open=true;}close(){this.open=false;}
}
for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+m[1],new Node());
const root=nodes.get('#seminar-prototype'),n=id=>nodes.get('#'+id),event={preventDefault(){}};
const id='00000000-0000-4000-8000-000000000010',hostId='00000000-0000-4000-8000-000000000001',project='https://'+'a'.repeat(20)+'.supabase.co',key='sb_publishable_'+'b'.repeat(24);
let remote,failSubmit=false,lastSubmission,readFails=false,creates=0,signins=0,channels=[],calls=[];
const client={
 auth:{getSession:async()=>({data:{session:{user:{id:hostId,is_anonymous:false}}}}),signInWithPassword:async()=>{signins++;return {data:{session:{user:{id:hostId,is_anonymous:false}}}};},signOut:async()=>({error:null})},
 from(){return{select(){return this;},eq(){return this;},async order(){return {data:[],error:null};}};},
 channel(){const listeners=[];const channel={listeners,on(type,filter,handler){listeners.push({type,filter,handler});return channel;},subscribe(fn){fn('SUBSCRIBED');return channel;}};channels.push(channel);return channel;},removeChannel(){},
 async rpc(name,p){calls.push({name,params:p});
  if(name==='hm_create'){creates++;remote={event_id:id,code:p.p_code,settings:p.p_settings,accept:false,deadline:null,paused_ms:null,prompt:1,version:1,revision:1,host:true,server_now:new Date().toISOString(),responses:[],prompts:[{id:1,question:p.p_settings.question,guidance:p.p_settings.guidance}]};return {data:id};}
  if(name==='hm_snapshot'){if(readFails)return{error:new Error('network failed')};remote.server_now=new Date().toISOString();return {data:JSON.parse(JSON.stringify(remote))};}
  if(name==='hm_update'){assert.equal(p.p_revision,remote.revision);remote.settings=p.p_settings;remote.accept=p.p_accept;remote.deadline=p.p_deadline;remote.paused_ms=p.p_paused_ms;remote.revision++;return {data:remote.revision};}
  if(name==='hm_submit'){lastSubmission=p.p_submission;if(failSubmit)return {error:new Error('SAVE_TIMEOUT')};if(!remote.responses.length)remote.responses.push({id:42,prompt:p.p_prompt,name:p.p_name,text:p.p_body,up:0,heart:0,extras:{},extraVotes:{},votedUp:false,votedHeart:false,createdAt:'2026-11-22T00:00:00Z',hidden:false,pinned:false,completed:false});return {data:{ok:true,id:42,created_at:'2026-11-22T00:00:00Z'}};}
  if(name==='hm_vote'){remote.responses[0].up=1;remote.responses[0].votedUp=true;return {data:null};}
  if(name==='hm_moderate'){remote.responses[0][p.p_action]=p.p_active;return {data:null};}
  return {error:new Error('Unexpected RPC '+name)};
 }
};
const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
class TestURL extends URL{};TestURL.createObjectURL=()=> 'blob:test';TestURL.revokeObjectURL=()=>{};
const context={URLSearchParams,TextEncoder,Uint8Array,Blob,URL:TestURL,crypto:crypto.webcrypto,HanmadiSheets:{uuid:()=>crypto.randomBytes(16).toString('hex')},sessionStorage:storage,localStorage:storage,console,setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),document:{hidden:false,head:new Node(),getElementById:id=>nodes.get('#'+id),createElement:()=>new Node(),addEventListener(){}},window:{supabase:{createClient:()=>client},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}}};
vm.runInNewContext(fs.readFileSync('src/supabase-client.js','utf8'),context);context.HanmadiSupabase=context.window.HanmadiSupabase;
context.window.SEMINAR_STATIC_APP=true;context.window.location={href:'https://example.com/hanmadi/',search:'',hash:''};
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\}\)\(\);\s*$/,'root.testing={state,render,shareLink,refreshSupabase,sbMutate,sbUpdatePayload,applySbSnapshot,flush:()=>supabaseQueue,pending:()=>supabasePending};})();');
vm.runInNewContext(script,context);const t=root.testing,s=t.state;
(async()=>{
 assert.equal(context.HanmadiSupabase.publishable('sb_secret_'+'x'.repeat(24)),'');assert.equal(context.HanmadiSupabase.projectURL('https://evil.example'),'');
 n('setup-demo').onclick();s.publicBaseUrl='https://example.com/hanmadi/';
 n('connection-open').onclick();n('connection-mode').value='supabase';n('supabase-url').value=project;n('supabase-key').value=key;n('supabase-email').value='host@example.com';n('supabase-password').value='test-password';n('supabase-existing').value='';
 await n('supabase-login').onclick();assert.equal(signins,1);assert.equal(n('supabase-password').value,'');
 await n('connection-apply').onclick();assert.equal(creates,1);assert.equal(s.supabase.host,true);assert.equal(s.sheets,null);assert.equal(s.responses.length,0);assert.equal(s.accept,false);assert.equal(channels[0].listeners.length,2);
 const link=new URL(t.shareLink('participant')),route=JSON.parse(Buffer.from(new URLSearchParams(link.hash.slice(1)).get('sb'),'base64').toString());assert.equal(route.key,key);assert.equal(route.url,project);assert.equal(route.code,s.eventCode);assert.equal(JSON.stringify(route).includes('test-password'),false);assert.equal(JSON.stringify(route).includes('access_token'),false);
 n('accept-toggle').onclick();await t.flush();assert.equal(remote.accept,true);assert.equal(remote.revision,2);assert.equal(s.accept,true);
 s.role='participant';n('compose-open').onclick();n('author').value='A participant';n('answer').value='Keep my response';failSubmit=true;
 await n('response-form').onsubmit(event);assert.equal(s.responses.length,0);assert.equal(n('composer').open,true);assert.equal(n('answer').readOnly,true);assert.ok(t.pending());const submission=lastSubmission;
 failSubmit=false;await n('response-form').onsubmit(event);assert.equal(lastSubmission,submission);assert.equal(s.responses.length,1);assert.equal(t.pending(),null);assert.equal(n('composer').open,false);
 await t.sbMutate('hm_vote',{p_response:42,p_emoji:'up',p_active:true});assert.equal(s.responses[0].up,1);
 s.role='admin';await t.sbMutate('hm_moderate',{p_response:42,p_action:'completed',p_active:true});assert.equal(s.responses[0].completed,true);
 // Device clock skew must neither expire a running timer nor shift the persisted deadline.
 const timerSnapshot={...remote,settings:{...remote.settings,timerEnabled:true},accept:true,server_now:new Date(Date.now()-300000).toISOString(),deadline:new Date(Date.now()-240000).toISOString()};
 t.applySbSnapshot(timerSnapshot);assert.equal(s.timerExpired,false);assert.ok(s.timerDeadline>Date.now()+59000);assert.equal(t.sbUpdatePayload().p_deadline,timerSnapshot.deadline);
 readFails=true;await n('export-xlsx').onclick();assert.equal(n('composer').open,false);readFails=false;
 await n('supabase-logout').onclick();assert.equal(s.supabase,null);assert.equal(s.responses.length,0);assert.equal(s.onboarding,'welcome');
 console.log('PASS Supabase UI: key/URL validation, host auth, password clearing, event creation, safe QR route, realtime filters, shared reception, acknowledged submission, stable retry, vote/moderation refresh, clock correction, export failure and logout.');
})().catch(e=>{console.error(e);process.exitCode=1;});
