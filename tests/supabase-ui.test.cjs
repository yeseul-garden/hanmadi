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
 from(){return{select(){return this;},eq(){return this;},async order(){return {data:[],error:null};},then(resolve){return Promise.resolve({data:remote?[{id,code:remote.code}]:[],error:null}).then(resolve);}};},
 channel(){const listeners=[];const channel={listeners,on(type,filter,handler){listeners.push({type,filter,handler});return channel;},subscribe(fn){fn('SUBSCRIBED');return channel;}};channels.push(channel);return channel;},removeChannel(){},
 async rpc(name,p){calls.push({name,params:p});
  if(name==='hm_register_short_link'){const target=p.p_target;return {data:crypto.createHash('sha256').update([p.p_site,target.provider,target.url||target.endpoint,target.code].join('\n')).digest('base64url').slice(0,20)};}
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
const context={URLSearchParams,TextEncoder,Uint8Array,AbortController,Blob,URL:TestURL,crypto:crypto.webcrypto,HanmadiSheets:{uuid:()=>crypto.randomBytes(16).toString('hex')},sessionStorage:storage,localStorage:storage,console,setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),document:{hidden:false,head:new Node(),getElementById:id=>nodes.get('#'+id),createElement:()=>new Node(),addEventListener(){}},window:{supabase:{createClient:()=>client},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}}};
vm.runInNewContext(fs.readFileSync('src/supabase-client.js','utf8'),context);context.HanmadiSupabase=context.window.HanmadiSupabase;
context.window.SEMINAR_STATIC_APP=true;context.window.location={href:'https://example.com/hanmadi/',search:'',hash:''};
context.window.history={replaceState(_state,_title,value){const u=new URL(value);context.window.location={href:u.href,pathname:u.pathname,search:u.search,hash:u.hash};}};
store.set('hanmadi.supabase.connection',JSON.stringify({url:project,key}));
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\}\)\(\);\s*$/,'root.testing={state,render,shareLink,refreshSupabase,sbMutate,sbUpdatePayload,applySbSnapshot,sbError,shortEntry,entryParams,shareLinks,ensureShareAlias,loadSharedRoute,applyEntryLink,flush:()=>supabaseQueue,pending:()=>supabasePending};})();');
vm.runInNewContext(script,context);const t=root.testing,s=t.state;
(async()=>{
 assert.equal(store.has('hanmadi.supabase.connection'),false);
 assert.equal(context.HanmadiSupabase.publishable('sb_secret_'+'x'.repeat(24)),'');assert.equal(context.HanmadiSupabase.projectURL('https://evil.example'),'');
 for(const suffix of ['/','/rest/v1','/rest/v1/','/rest/v1/example_table','/auth/v1/','/storage/v1/object/public/example'])assert.equal(context.HanmadiSupabase.projectURL(' '+project+suffix+' '),project);
 for(const bad of [project+'/dashboard',project+'/rest/v1/?token=secret',project+'/#token',project.replace('https:','http:'),project.replace('https://','https://user:pass@'),project.replace('.supabase.co','.supabase.co.evil.example')])assert.equal(context.HanmadiSupabase.projectURL(bad),'');
 assert.match(t.sbError(new Error('INVALID_SUPABASE_URL')),/프로젝트 주소/);assert.match(t.sbError(new Error('INVALID_SUPABASE_KEY')),/공개용 연결 키/);assert.match(t.sbError({code:'invalid_credentials',message:'Invalid login credentials'}),/대시보드 로그인 계정과는 별개/);assert.match(t.sbError({code:'email_not_confirmed',message:'Email not confirmed'}),/이메일이 아직 확인되지/);
 n('setup-demo').onclick();s.publicBaseUrl='https://example.com/hanmadi/';
 n('connection-open').onclick();n('connection-mode').value='supabase';n('supabase-url').value=project+'/rest/v1/';n('supabase-key').value=' '+key+' ';n('supabase-email').value='host@example.com';n('supabase-password').value='test-password';n('supabase-existing').value='';
 await n('supabase-login').onclick();assert.equal(signins,1);assert.equal(n('supabase-password').value,'');assert.equal(n('supabase-url').value,project);assert.equal(n('supabase-key').value,key);
 assert.equal(n('setup-storage-status').textContent,'계정 확인 완료 · 설문 등록 전');assert.equal(n('setup-connection-open').textContent,'연결 마무리하기');assert.equal(creates,0);
 await n('connection-apply').onclick();assert.equal(creates,1);assert.equal(s.supabase.host,true);assert.equal(s.sheets,null);assert.equal(s.responses.length,0);assert.equal(s.accept,false);assert.equal(channels[0].listeners.length,2);
 assert.equal(n('setup-storage-status').textContent,'✓ Supabase 연결 완료');assert.equal(n('storage-status').textContent,'✓ Supabase 연결 완료');assert.equal(n('setup-connection-open').textContent,'저장할 곳 변경');
 assert.equal(store.has('hanmadi.supabase.connection'),false);n('connection-open').onclick();for(const field of ['supabase-url','supabase-key','supabase-email','supabase-password'])assert.equal(n(field).value,'');assert.equal(s.supabase.url,project);n('connection-close').onclick();
 assert.ok(t.shareLink('participant').includes('#sb='));assert.equal(new URL(t.shareLink('admin')).searchParams.get('v'),'a');context.window.HANMADI_SHARE_RESOLVER={url:project,key};
 const alias=await t.ensureShareAlias(true);assert.match(alias,/^[A-Za-z0-9_-]{20}$/);
 assert.equal(context.window.location.href,'https://example.com/hanmadi/'+alias+'/admin-page');
 for(const [role,path]of [['admin','admin-page'],['participant','participant-form'],['present','result']])assert.equal(t.shareLink(role),'https://example.com/hanmadi/'+alias+'/'+path);
 assert.ok(!t.shareLink('participant').includes(key));assert.ok(!t.shareLink('participant').includes(s.eventCode));
 const longOwner=new URL('https://example.com/hanmadi/');longOwner.searchParams.set('e',s.eventCode);longOwner.searchParams.set('v','a');longOwner.hash='sb='+encodeURIComponent(btoa(JSON.stringify({url:project,key,code:s.eventCode})));
 const linkedTarget={provider:'supabase',url:project,key,code:s.eventCode};
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
 assert.equal(n('storage-status').textContent,'외부 저장 연결 없음');assert.equal(n('setup-connection-open').textContent,'저장할 곳 선택·연결하기');
 context.fetch=async()=>({ok:true,json:async()=>linkedTarget});
 const beforeGate=signins;await t.loadSharedRoute({id:alias,role:'admin'});assert.equal(s.onboarding,'missing');assert.equal(n('shared-admin-open').hidden,false);assert.equal(signins,beforeGate);assert.equal(creates,1);
 n('shared-admin-open').onclick();n('shared-admin-email').value='host@example.com';n('shared-admin-password').value='test-password';await n('shared-admin-submit').onclick();assert.equal(s.onboarding,'workspace');assert.equal(s.supabase.host,true);assert.equal(creates,1);assert.equal(n('shared-admin-password').value,'');
 context.window.location={href:longOwner.href,search:longOwner.search,hash:longOwner.hash};delete context.window.HANMADI_SHARE_RESOLVER;t.applyEntryLink();assert.equal(s.onboarding,'missing');assert.equal(n('shared-admin-open').hidden,false);const beforeResume=creates;n('shared-admin-open').onclick();n('shared-admin-email').value='host@example.com';n('shared-admin-password').value='test-password';await n('shared-admin-submit').onclick();assert.equal(s.onboarding,'workspace');assert.equal(s.supabase.host,true);assert.equal(creates,beforeResume,'Reopening a direct owner link does not create another survey');
 console.log('PASS Supabase UI: key/URL validation, host auth, password clearing, event creation, safe QR route, realtime filters, shared reception, acknowledged submission, stable retry, vote/moderation refresh, clock correction, export failure and logout.');
})().catch(e=>{console.error(e);process.exitCode=1;});
