  let supabaseClient=null,supabaseDraft=null,supabaseChannel=null,supabaseRefreshTimer=null;
  let supabaseFetching=false,supabaseFetchAgain=false,supabaseApplying=false,supabaseBusy=0,supabaseQueue=Promise.resolve();
  let supabasePending=null,supabaseSubmitting=false,supabaseMessage='',supabaseRevision=null,supabaseLastSettings='',supabaseReady=false;
  let supabaseStatus='',supabaseClockOffset=0,supabaseDraftRevision=null;
  const sbText=message=>state.locale==='en'?englishText(message):message;
  function sbError(error){
    const message=String(error?.message||error||'');
    if(message==='INVALID_SUPABASE_URL')return sbText('프로젝트 주소를 확인해주세요. https://프로젝트ID.supabase.co 형식으로 입력하세요.');
    if(message==='INVALID_SUPABASE_KEY')return sbText('공개용 연결 키를 확인해주세요. sb_publishable_로 시작하는 키를 입력하세요.');
    if(error?.code==='email_not_confirmed')return sbText('운영자 이메일이 아직 확인되지 않았습니다. 인증 메일을 확인하거나 Supabase에서 이메일 확인 상태를 점검해주세요.');
    if(error?.code==='invalid_credentials')return sbText('이 프로젝트에 등록된 운영자 이메일과 비밀번호를 확인해주세요. Supabase 대시보드 로그인 계정과는 별개입니다.');
    if(/invalid api key|invalid.*apikey/i.test(message))return sbText('이 공개용 키가 입력한 프로젝트의 키인지 확인해주세요. 같은 프로젝트의 API Keys에서 다시 복사하세요.');
    const rules={INVALID_SUPABASE:'프로젝트 URL과 sb_publishable_ 공개용 키를 확인해주세요.',SDK_FAILED:'연결 파일을 불러오지 못했습니다. 최신 배포 파일을 확인해주세요.',HOST_LOGIN_REQUIRED:'운영자 계정으로 로그인해주세요.',NAME_TAKEN:'다른 참가자가 사용 중인 닉네임입니다. 이름을 바꿔 다시 제출해주세요.',SUBMISSIONS_CLOSED:'답변 접수가 마감되었습니다. 작성 내용은 유지됩니다.',QUESTION_CHANGED:'현재 질문이 변경되었습니다. 내용을 확인한 뒤 다시 제출해주세요.',STALE_EVENT:'다른 운영 화면에서 설정이 변경되었습니다. 최신 설정을 불러왔습니다.',FORBIDDEN:'이 행사에 접근할 권한이 없습니다. 운영자 계정을 확인해주세요.',EVENT_NOT_FOUND:'행사를 찾을 수 없습니다. 공유 링크를 확인해주세요.',SAVE_TIMEOUT:'저장 결과를 확인하지 못했습니다. 같은 제출의 저장 여부를 다시 확인해주세요.',RETRY_MISMATCH:'이전 제출과 내용이 다릅니다. 운영자에게 문의해주세요.'};
    for(const [code,label]of Object.entries(rules))if(message.includes(code))return sbText(label);
    if(error?.code==='PGRST202'||error?.code==='42P01')return sbText('Supabase SQL Editor에서 설치 SQL을 먼저 실행해주세요.');
    if(/anonymous|signups.*disabled/i.test(message))return sbText('Supabase Authentication에서 익명 로그인을 켜주세요.');
    if(/Invalid login credentials/i.test(message))return sbText('운영자 이메일과 비밀번호를 확인해주세요.');
    if(/rate|limit/i.test(message))return sbText('접속 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
    return sbText('Supabase 연결을 확인하지 못했습니다. 네트워크와 프로젝트 설정을 확인해주세요.');
  }
  function sbParams(){return {url:HanmadiSupabase.projectURL($('#supabase-url').value.trim()),key:HanmadiSupabase.publishable($('#supabase-key').value.trim())};}
  const sbUUID=()=>crypto.randomUUID();
  function sbPendingKey(){return 'hanmadi.supabase.pending.'+state.eventCode;}
  function rememberSbPending(){try{if(supabasePending)sessionStorage.setItem(sbPendingKey(),JSON.stringify(supabasePending));else sessionStorage.removeItem(sbPendingKey());}catch{}}
  function restoreSbPending(){if(!state.supabase)return;try{const p=JSON.parse(sessionStorage.getItem(sbPendingKey())||'null');if(p?.p_event===state.supabase.eventId&&typeof p.p_submission==='string')supabasePending=p;}catch{}}
  function sbSettings(){return {...publishedEvent(),sort:state.sort,timerEnabled:state.timerEnabled,timerMinutes:state.timerMinutes,timerSeconds:state.timerSeconds};}
  function sbUpdatePayload(){return {p_event:state.supabase.eventId,p_settings:sbSettings(),p_accept:state.accept,p_deadline:state.timerDeadline?new Date(state.timerDeadline-supabaseClockOffset).toISOString():null,p_paused_ms:state.timerPausedMs};}
  function sbSignature(payload){return JSON.stringify([payload.p_settings,payload.p_accept,payload.p_deadline,payload.p_paused_ms]);}
  function applySbSnapshot(snapshot){
    if(!state.supabase||snapshot.event_id!==state.supabase.eventId)return;
    const settings=snapshot.settings,oldPrompt=state.prompt,oldVersion=state.version;
    supabaseApplying=true;
    for(const key of ['title','question','guidance','nameLabel','nameExample','color','logoBg','sort','view','fontChoice','spacePalette'])if(typeof settings[key]==='string')state[key]=settings[key];
    for(const key of ['required','anonymous','brandCustom','react','timerEnabled','fontCustom'])if(typeof settings[key]==='boolean')state[key]=settings[key];
    if(typeof settings.fontCustom!=='boolean')state.fontCustom=!!settings.fontChoice&&settings.fontChoice!=='ibm';
    if(!state.brandCustom)state.color=defaultBrand.accent;
    if(settings.logo===null||typeof settings.logo==='string')state.logo=settings.logo;
    if(Array.isArray(settings.planetColors))state.planetColors=settings.planetColors;
    if(settings.emojiByView)state.emojiByView={...settings.emojiByView};
    for(const key of ['timerMinutes','timerSeconds'])if(Number.isInteger(settings[key]))state[key]=settings[key];
    if(state.role==='present'){if(['ko','en'].includes(settings.locale))state.locale=settings.locale;if(!state.localAppearance&&['light','dark'].includes(settings.appearance))state.appearance=settings.appearance;if(state.presentationView)state.view=state.presentationView;}
    state.accept=snapshot.accept;state.timerDeadline=snapshot.deadline?Date.parse(snapshot.deadline):null;state.timerPausedMs=snapshot.paused_ms;
    state.timerExpired=!!snapshot.deadline&&Date.parse(snapshot.deadline)<=Date.parse(snapshot.server_now);state.prompt=snapshot.prompt;state.version=snapshot.version;
    state.responses=snapshot.responses;state.prompts=snapshot.prompts;state.eventCode=snapshot.code;
    state.supabase.host=snapshot.host;supabaseRevision=snapshot.revision;
    // The DB clock remains authoritative even if this device's wall clock is wrong.
    const serverNow=Date.parse(snapshot.server_now);supabaseClockOffset=Number.isFinite(serverNow)?Date.now()-serverNow:0;if(state.timerDeadline)state.timerDeadline+=supabaseClockOffset;
    if($('#composer').open&&(oldPrompt!==state.prompt||oldVersion!==state.version)){retainDraft();needsReview=true;}
    if(state.role==='admin'&&$('#settings-save').disabled){
      const active=document.activeElement?.id,editingTimer=['timer-minutes','timer-seconds'].includes(active),minutes=$('#timer-minutes').value,seconds=$('#timer-seconds').value;
      updateSettingsInputs();if(editingTimer){$('#timer-minutes').value=minutes;$('#timer-seconds').value=seconds;}
    }
    supabaseLastSettings=sbSignature(sbUpdatePayload());render();supabaseApplying=false;
  }
  async function refreshSupabase(){
    if(!state.supabase||!supabaseClient)return;
    if(supabaseBusy||supabaseFetching){supabaseFetchAgain=true;return;}
    supabaseFetching=true;
    try{const data=await HanmadiSupabase.rpc(supabaseClient,'hm_snapshot',{p_event:state.supabase.eventId});if(!supabaseBusy){if(supabaseChannel?.state==='joined')supabaseStatus='실시간 연결됨';applySbSnapshot(data);}else supabaseFetchAgain=true;}
    catch(error){supabaseStatus=sbError(error);renderSupabaseConnection();translateChrome();}
    finally{supabaseFetching=false;if(supabaseFetchAgain&&!supabaseBusy){supabaseFetchAgain=false;setTimeout(()=>refreshSupabase(),100);}}
  }
  function stopSupabase(){
    if(supabaseChannel&&supabaseClient)supabaseClient.removeChannel(supabaseChannel);supabaseChannel=null;
    if(supabaseRefreshTimer)clearInterval(supabaseRefreshTimer);supabaseRefreshTimer=null;
    supabaseClient=null;state.supabase=null;supabaseReady=false;supabaseStatus='';
  }
  function watchSupabase(){
    if(supabaseChannel)supabaseClient.removeChannel(supabaseChannel);
    let refreshScheduled=false;
    const schedule=()=>{if(refreshScheduled)return;refreshScheduled=true;setTimeout(()=>{refreshScheduled=false;refreshSupabase();},180);};
    supabaseChannel=supabaseClient.channel('hanmadi-'+state.supabase.eventId)
      .on('postgres_changes',{event:'*',schema:'public',table:'hm_signals',filter:'event_id=eq.'+state.supabase.eventId},schedule)
      .on('postgres_changes',{event:'*',schema:'public',table:'hm_responses',filter:'event_id=eq.'+state.supabase.eventId},schedule)
      .subscribe(status=>{supabaseStatus=status==='SUBSCRIBED'?'실시간 연결됨':'실시간 연결 확인 중 · 주기적으로 다시 확인합니다.';renderSupabaseConnection();translateChrome();});
    if(supabaseRefreshTimer)clearInterval(supabaseRefreshTimer);
    supabaseRefreshTimer=setInterval(()=>{if(!document.hidden)refreshSupabase();},15000);
  }
  function queueSupabaseSave(){
    if(!state.supabase||!state.supabase.host||state.role!=='admin'||supabaseApplying||!supabaseReady)return;
    const payload=sbUpdatePayload(),signature=sbSignature(payload);if(signature===supabaseLastSettings)return;
    supabaseLastSettings=signature;supabaseBusy++;
    supabaseQueue=supabaseQueue.then(async()=>{
      try{payload.p_revision=supabaseRevision;supabaseRevision=await HanmadiSupabase.rpc(supabaseClient,'hm_update',payload);}
      catch(error){supabaseStatus=sbError(error);notify(supabaseStatus);supabaseLastSettings='';}
      finally{supabaseBusy--;if(!supabaseBusy)await refreshSupabase();}
    });
  }
  async function sbMutate(name,params){
    if(!state.supabase||!supabaseClient)return;
    try{await supabaseQueue;await HanmadiSupabase.rpc(supabaseClient,name,params);await refreshSupabase();}
    catch(error){notify(sbError(error));}
  }
  function sbModerate(response,key){sbMutate('hm_moderate',{p_response:response.id,p_action:key,p_active:!response[key]});}
  function sbVote(response,key){const active=key==='up'?response.votedUp:key==='heart'?response.votedHeart:!!response.extraVotes?.[key];sbMutate('hm_vote',{p_response:response.id,p_emoji:key,p_active:!active});}
  async function sbSubmit(name,text){
    if(supabaseSubmitting)return;
    if(!supabasePending){supabasePending={p_event:state.supabase.eventId,p_submission:sbUUID(),p_prompt:state.prompt,p_name:name,p_body:text,p_participant:''};rememberSbPending();}
    supabaseSubmitting=true;supabaseMessage=sbText('답변을 저장하는 중…');syncSupabaseForm();
    try{
      const receipt=await HanmadiSupabase.rpc(supabaseClient,'hm_submit',supabasePending);
      if(receipt?.ok!==true||!receipt.id)throw new Error('INVALID_RECEIPT');
      supabasePending=null;rememberSbPending();supabaseMessage='';draftByPrompt.delete(state.prompt);$('#answer').value='';$('#composer').close();await refreshSupabase();notify(sbText('답변이 저장되어 행사 화면에 반영되었습니다.'));
    }catch(error){supabaseMessage=sbError(error);if(['NAME_TAKEN','SUBMISSIONS_CLOSED','QUESTION_CHANGED','INVALID_INPUT'].some(c=>String(error.message).includes(c))){supabasePending=null;rememberSbPending();if(String(error.message).includes('QUESTION_CHANGED'))await refreshSupabase();}}
    finally{supabaseSubmitting=false;syncForm();}
  }
  function syncSupabaseForm(){
    if(!state.supabase)return;
    const locked=supabaseSubmitting||!!supabasePending;
    for(const id of ['author','answer'])$('#'+id).readOnly=locked;
    $('#compose-close').disabled=supabaseSubmitting;
    if(supabaseSubmitting){$('#submit-answer').disabled=true;$('#submit-answer').textContent=sbText('답변을 저장하는 중…');}
    else if(supabasePending){$('#submit-answer').disabled=false;$('#submit-answer').textContent=sbText('저장 여부 다시 확인');}
    if(supabaseMessage)$('#form-message').textContent=supabaseMessage;
  }
  function renderConnectionRegistration(){
    const supabaseDone=!!state.supabase?.eventId&&supabaseReady,sheetsDone=!!state.sheets;
    const sheetsVerified=!!connectionHealth?.written&&$('#connection-mode').value==='sheets'&&connectionHealth.endpoint===HanmadiSheets.endpoint($('#sheets-endpoint').value.trim());
    const pending=!supabaseDone&&!sheetsDone&&(!!supabaseDraft||sheetsVerified);
    const done=supabaseDone||sheetsDone;
    const message=supabaseDone?'✓ Supabase 연결 완료':sheetsDone?'✓ Google Sheets 연결 완료':pending?(sheetsVerified?'시트 저장 확인 완료 · 연결 확정 전':'계정 확인 완료 · 설문 등록 전'):'외부 저장 연결 없음';
    const detail=sheetsDone?'Google 시트에 테스트 기록이 저장되는 것을 확인했습니다. 참가자의 답변도 연결한 시트에 저장됩니다.':done?'설문이 저장할 곳에 등록되었습니다. 진행 화면에서 답변을 받을 수 있습니다.':pending?'연결 창에서 ‘이 저장 방식으로 계속’을 눌러 설문 등록을 마무리해주세요.':'현재는 이 화면에서만 체험합니다. 다른 휴대폰의 답변을 모으려면 저장할 곳을 연결해주세요.';
    for(const id of ['setup-storage-status','storage-status']){
      const element=$('#'+id),text=sbText(message);if(element.textContent!==text)element.textContent=text;element.dataset.state=done?'complete':pending?'pending':'local';
    }
    for(const id of ['setup-storage-detail','storage-detail'])$('#'+id).textContent=sbText(detail);
    for(const id of ['setup-connection-open','connection-open'])$('#'+id).textContent=sbText(done?'저장할 곳 변경':pending?'연결 마무리하기':'저장할 곳 선택·연결하기');
  }
  function renderSupabaseConnection(){
    $('#supabase-guide').hidden=$('#connection-mode').value!=='supabase';
    if(state.supabase){
      $('#connection-summary').textContent=sbText('Supabase로 실시간 운영');$('#setup-connection-summary').textContent=$('#connection-summary').textContent;
      $('#sheet-export-note').textContent=sbText('연결된 행사의 전체 답변을 불러와 Excel로 저장합니다.');
      $('#sheets-audience-notice').hidden=false;$('#sheets-audience-notice').textContent=sbText(supabaseStatus||'Supabase에 연결되었습니다.');
      $('#share-status').textContent=sbText('QR과 발표 링크가 같은 행사에 실시간으로 연결됩니다.');
    }
    renderConnectionRegistration();
  }
  $('#supabase-login').onclick=async()=>{
    if(!externalConnectionAvailable())return;
    const {url,key}=sbParams(),button=$('#supabase-login');button.disabled=true;supabaseDraft=null;
    if(url)$('#supabase-url').value=url;if(key)$('#supabase-key').value=key;
    $('#connection-status').textContent=sbText('운영자 연결을 확인하는 중…');
    try{
      const client=await HanmadiSupabase.connect(url,key,publicBase(),'host');
      const password=$('#supabase-password').value,email=$('#supabase-email').value.trim();
      const auth=password?await client.auth.signInWithPassword({email,password}):await client.auth.getSession();
      if(auth.error)throw auth.error;
      const user=auth.data?.session?.user;if(!user||user.is_anonymous)throw new Error('HOST_LOGIN_REQUIRED');
      const events=await client.from('hm_events').select('id,code,settings').eq('owner_id',user.id).order('updated_at',{ascending:false});if(events.error)throw events.error;
      $('#supabase-existing').replaceChildren();
      const fresh=document.createElement('option');fresh.value='';fresh.textContent=sbText('현재 설정으로 새 행사 만들기');$('#supabase-existing').append(fresh);
      for(const e of events.data){const option=document.createElement('option');option.value=e.id;option.textContent=e.settings.title;$('#supabase-existing').append(option);}
      supabaseDraft={url,key,client,events:events.data};$('#connection-status').textContent=sbText('연결되었습니다. 새 행사를 만들거나 기존 행사를 선택하세요.');
    }catch(error){$('#connection-status').textContent=sbError(error);}
    finally{$('#supabase-password').value='';button.disabled=false;renderConnectionRegistration();translateChrome();}
  };
  async function activateSupabase(){
    if(!supabaseDraft||JSON.stringify(sbParams())!==JSON.stringify({url:supabaseDraft.url,key:supabaseDraft.key})){$('#connection-status').textContent=sbText('운영자 연결 확인을 먼저 완료해주세요.');return;}
    const button=$('#connection-apply');button.disabled=true;
    try{
      const chosen=$('#supabase-existing').value,code=HanmadiSheets.uuid();
      if(!chosen&&state.onboarding==='welcome'){$('#connection-status').textContent=sbText('기존 행사를 선택하거나 내 설문 만들기에서 새 설문을 준비해주세요.');return;}
      const eventId=chosen||await HanmadiSupabase.rpc(supabaseDraft.client,'hm_create',{p_code:code,p_settings:{...configSnapshot(),sort:state.sort,timerEnabled:false,timerMinutes:5,timerSeconds:0}});
      const snapshot=await HanmadiSupabase.rpc(supabaseDraft.client,'hm_snapshot',{p_event:eventId});
      stopSupabase();supabaseClient=supabaseDraft.client;state.supabase={url:supabaseDraft.url,key:supabaseDraft.key,eventId,host:true};state.sheets=null;
      state.eventCode=snapshot.code;setupEventCode=snapshot.code;state.demo=false;state.role='admin';nameClaims.clear();
      if(chosen)state.onboarding='workspace';
      applySbSnapshot(snapshot);supabaseReady=true;watchSupabase();$('#connection-dialog').close();
      try{localStorage.setItem('hanmadi.supabase.connection',JSON.stringify({url:state.supabase.url,key:state.supabase.key}));}catch{}
      render();
    }catch(error){$('#connection-status').textContent=sbError(error);}
    finally{button.disabled=false;translateChrome();}
  }
  for(const id of ['supabase-url','supabase-key'])$('#'+id).oninput=()=>{supabaseDraft=null;renderConnectionRegistration();translateChrome();};
  $('#supabase-install').onclick=async()=>{
    try{const response=await fetch(new URL('integrations/supabase/install.sql',publicBase()));if(!response.ok)throw new Error();downloadText('hanmadi-supabase-install.sql',await response.text(),'text/plain;charset=utf-8');}
    catch{$('#connection-status').textContent=sbText('최신 배포 사이트에서 설치 SQL을 다운로드해주세요.');}
  };
  async function loadSupabaseEntry(config,role){
    state.role=role;state.externalRole=role;state.onboarding='missing';state.demo=false;
    $('#share-missing').querySelector('h1').textContent=sbText('행사에 연결하는 중…');render();
    try{
      if(!config||!HanmadiSupabase.projectURL(config.url)||!HanmadiSupabase.publishable(config.key)||!/^[a-f0-9]{32}$/.test(config.code))throw new Error('INVALID_SUPABASE');
      const client=await HanmadiSupabase.connect(config.url,config.key,publicBase(),'participant');
      const session=await client.auth.getSession();if(session.error)throw session.error;
      if(!session.data.session){const signed=await client.auth.signInAnonymously();if(signed.error)throw signed.error;}
      const eventId=await HanmadiSupabase.rpc(client,'hm_join',{p_code:config.code});
      supabaseClient=client;state.sheets=null;state.supabase={url:config.url,key:config.key,eventId,host:false};nameClaims.clear();
      const snapshot=await HanmadiSupabase.rpc(client,'hm_snapshot',{p_event:eventId});state.onboarding='workspace';
      if(['ko','en'].includes(snapshot.settings.locale))state.locale=snapshot.settings.locale;if(['light','dark'].includes(snapshot.settings.appearance))state.appearance=snapshot.settings.appearance;
      applySbSnapshot(snapshot);restoreSbPending();supabaseReady=true;watchSupabase();render();
    }catch(error){$('#share-missing').querySelector('h1').textContent=sbText('행사에 연결하지 못했습니다.');$('#share-missing').querySelector('p').textContent=sbError(error);state.onboarding='missing';render();}
  }
  const applyStorageConnection=$('#connection-apply').onclick;
  $('#connection-apply').onclick=async()=>{if(state.role!=='admin')return;if($('#connection-mode').value==='supabase'){await activateSupabase();return;}await supabaseQueue;await applyStorageConnection();if(!$('#connection-dialog').open){stopSupabase();supabaseDraft=null;render();}};
  $('#supabase-logout').onclick=async()=>{const client=supabaseClient||supabaseDraft?.client;if(!client)return;stopSupabase();supabaseDraft=null;await client.auth.signOut({scope:'local'});state.responses=[];state.onboarding='welcome';$('#connection-dialog').close();render();};
