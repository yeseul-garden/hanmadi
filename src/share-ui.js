  let shareRegistration={signature:'',id:'',status:'idle',error:''},shareRegistrationTask=null;
  let shareResolverClient=null,shareResolverClientURL='',shareResolverClientKey='',shareResolverDraft=null,sharePublisherID='';
  let incomingSharedLink=null,shareRouteRequest=0;
  let shareConfigurationTask=null;
  function currentShareRoute(){return shareLinks.parse(window.location.hash)||shareLinks.parse(window.location.href);}
  function shareTarget(){
    if(state.supabase)return shareLinks.target({provider:'supabase',url:state.supabase.url,key:state.supabase.key,code:state.eventCode});
    if(state.sheets)return shareLinks.target({provider:'sheets',endpoint:state.sheets.endpoint,code:state.eventCode});
    return null;
  }
  function shareSignature(){const t=shareTarget();return t&&publicBase()?JSON.stringify([publicBase(),t]):'';}
  function sharedLinkError(error){
    const code=String(error?.message||error||'');
    const messages={LINK_RESOLVER_REQUIRED:'이 사이트의 공유 링크 저장소를 먼저 설정해주세요.',LINK_PUBLISHER_LOGIN_REQUIRED:'공유 링크 저장소의 운영자 계정으로 연결해주세요.',LINK_PUBLISHER_REQUIRED:'공유 링크 설치 SQL에서 이 운영자 계정을 허용해주세요.',LINK_OWNER_REQUIRED:'이 공유 주소를 등록한 운영자 계정으로 연결해주세요.',LINK_ID_COLLISION:'공유 코드가 다른 설문과 충돌했습니다. 기존 주소는 변경하지 않았습니다.',LINK_NOT_FOUND:'등록된 설문 주소를 찾지 못했습니다. 운영자에게 새 링크를 요청해주세요.',INVALID_LINK_RECEIPT:'공유 주소의 연결 정보를 확인하지 못했습니다.',LINK_CONFIG_NOT_PUBLISHED:'공유 링크 설정 파일을 사이트에 배포한 뒤 페이지를 다시 열어주세요.',LINK_AUTH_REQUIRED:'이 설문을 관리하려면 운영자 인증이 필요합니다.'};
    if(error?.code==='PGRST202'||error?.code==='42P01'||/hm_register_short_link|hm_resolve_short_link/.test(code))return sheetText('공유 링크 설치 SQL을 먼저 실행해주세요.');
    for(const [key,text]of Object.entries(messages))if(code.includes(key))return sheetText(text);
    return sheetText('공유 주소를 준비하지 못했습니다. 저장소 연결을 확인한 뒤 다시 시도해주세요.');
  }
  function configuredShareResolver(){return shareLinks.config(window.HANMADI_SHARE_RESOLVER);}
  async function loadShareConfiguration(force=false){
    if(!force&&configuredShareResolver())return configuredShareResolver();
    if(!window.SEMINAR_STATIC_APP||!publicBase())return null;
    if(force)shareConfigurationTask=null;
    if(!shareConfigurationTask)shareConfigurationTask=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      try{const response=await fetch(new URL('share-config.json',publicBase()).href,{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)return null;const value=shareLinks.config(await response.json());window.HANMADI_SHARE_RESOLVER=value;return value;}
      catch{return null;}finally{clearTimeout(timer);}
    })();return shareConfigurationTask;
  }
  async function sharePublisherClient(){
    const c=await loadShareConfiguration();if(!c)throw new Error('LINK_RESOLVER_REQUIRED');
    if(state.supabase?.host&&supabaseClient&&state.supabase.url===c.url)return supabaseClient;
    if(shareResolverClient&&shareResolverClientURL===c.url&&shareResolverClientKey===c.key)return shareResolverClient;
    const client=await HanmadiSupabase.connect(c.url,c.key,publicBase(),'link-host'),session=await client.auth.getSession();
    if(session.error)throw session.error;if(!session.data?.session?.user||session.data.session.user.is_anonymous)throw new Error('LINK_PUBLISHER_LOGIN_REQUIRED');
    shareResolverClient=client;shareResolverClientURL=c.url;shareResolverClientKey=c.key;return client;
  }
  function updateAdminAddress(){
    if(state.role!=='admin'||state.onboarding!=='workspace'||!window.SEMINAR_STATIC_APP||!window.history?.replaceState)return;
    const url=shareLink('admin');if(!url)return;
    try{const current=new URL(window.location.href),next=new URL(url);if(current.origin===next.origin&&shareLinks.deploymentBase(current.href)===publicBase()&&current.href!==next.href)window.history.replaceState(null,'',url);}catch{}
  }
  async function ensureShareAlias(force=false){
    const signature=shareSignature();if(!signature)return '';
    if(shareRegistration.signature===signature){
      if(shareRegistration.id)return shareRegistration.id;
      if(shareRegistrationTask){const result=await shareRegistrationTask;if(result||!force)return result;return ensureShareAlias(true);}
      if(!force)return '';
    }
    if(incomingSharedLink&&incomingSharedLink.signature===signature){shareRegistration={signature,id:incomingSharedLink.id,status:'ready',error:''};renderShareLinkState();updateAdminAddress();return incomingSharedLink.id;}
    if(state.role!=='admin'||!state.supabase?.host&&!state.sheets?.host)return '';
    shareRegistration={signature,id:'',status:'preparing',error:''};renderShareLinkState();
    const target=shareTarget(),base=publicBase();
    const task=(async()=>{
      try{
        const client=await sharePublisherClient(),id=await shareLinks.register(client,base,target);
        if(shareSignature()!==signature)return '';
        shareRegistration={signature,id,status:'ready',error:''};renderShareLinkState();updateAdminAddress();return id;
      }catch(error){if(shareSignature()===signature){shareRegistration={signature,id:'',status:'error',error:sharedLinkError(error)};renderShareLinkState();}return '';}
      finally{if(shareRegistrationTask===task)shareRegistrationTask=null;}
    })();shareRegistrationTask=task;return task;
  }
  function renderShareLinkState(){
    $('#share-status').textContent=sheetText(!publicBase()?'QR과 링크를 만들려면 공유 주소 설정에 배포 주소를 입력해주세요.':state.supabase||state.sheets?'참가자 링크와 QR을 사용할 수 있습니다. URL 단축은 참가자 QR·링크 창에서 선택하세요.':'다른 기기의 답변을 모으려면 Google Sheets 또는 Supabase를 연결해주세요.');
    $('#export-event-config').hidden=!!shareTarget();$('#static-share-help').hidden=!!shareTarget();
    $('#participant-copy-link').disabled=!shareLink('participant');
    for(const id of ['share-admin','share-participant','share-present'])$('#'+id).disabled=false;
    $('#share-admin').hidden=state.role!=='admin'||!shareTarget();$('#export-short-links').hidden=true;
  }
  function showShareSettings(){
    if(state.role!=='admin')return;
    const c=configuredShareResolver();
    shareResolverDraft=null;sharePublisherID='';
    $('#link-resolver-url').value=c?.url||'';$('#link-resolver-key').value=c?.key||'';
    $('#link-resolver-email').value='';$('#link-resolver-password').value='';
    $('#share-link-settings-status').textContent='';$('#share-link-settings').showModal();translateChrome();
  }
  $('#export-short-links').onclick=showShareSettings;
  $('#share-link-settings-close').onclick=()=>$('#share-link-settings').close();
  $('#link-resolver-login').onclick=async()=>{
    const button=$('#link-resolver-login');button.disabled=true;
    try{
      const c=shareLinks.config({url:HanmadiSupabase.projectURL($('#link-resolver-url').value.trim()),key:$('#link-resolver-key').value.trim()});if(!c)throw new Error('INVALID_LINK_TARGET');
      const client=await HanmadiSupabase.connect(c.url,c.key,publicBase(),'link-host');
      const email=$('#link-resolver-email').value.trim(),password=$('#link-resolver-password').value;
      const auth=password?await client.auth.signInWithPassword({email,password}):await client.auth.getSession();
      if(auth.error)throw auth.error;const user=auth.data?.session?.user;if(!user||user.is_anonymous)throw new Error('LINK_PUBLISHER_LOGIN_REQUIRED');
      shareResolverClient=client;shareResolverClientURL=c.url;shareResolverClientKey=c.key;shareResolverDraft=c;sharePublisherID=user.id;
      $('#share-link-settings-status').textContent=sheetText('운영자 계정을 확인했습니다. 처음 설정한다면 설치 SQL을 실행하고 설정 파일을 배포해주세요.');
    }catch(error){$('#share-link-settings-status').textContent=sharedLinkError(error);}
    finally{$('#link-resolver-password').value='';button.disabled=false;translateChrome();}
  };
  for(const id of ['link-resolver-url','link-resolver-key'])$('#'+id).oninput=()=>{shareResolverDraft=null;sharePublisherID='';};
  $('#link-resolver-install').onclick=()=>{
    if(!/^[a-f0-9-]{36}$/i.test(sharePublisherID)){$('#share-link-settings-status').textContent=sheetText('공유 링크 저장소의 운영자 계정을 먼저 확인해주세요.');translateChrome();return;}
    const statement="insert into hanmadi_private.link_publishers(user_id) values ('"+sharePublisherID+"') on conflict do nothing;";
    downloadText('hanmadi-share-links.sql',shareLinkSchemaSQL.replace('/*__HANMADI_LINK_PUBLISHER__*/',statement),'text/plain;charset=utf-8');
  };
  $('#link-resolver-config').onclick=()=>{
    if(!shareResolverDraft){$('#share-link-settings-status').textContent=sheetText('공유 링크 저장소의 운영자 계정을 먼저 확인해주세요.');translateChrome();return;}
    downloadText('share-config.json',JSON.stringify(shareResolverDraft,null,2)+'\n','application/json;charset=utf-8');
    $('#share-link-settings-status').textContent=sheetText('share-config.json을 사이트에 배포한 뒤 페이지를 다시 열어주세요. 설문마다 파일을 만들 필요는 없습니다.');translateChrome();
  };
  $('#link-resolver-retry').onclick=async()=>{const c=await loadShareConfiguration(true);if(shareResolverDraft&&JSON.stringify(c)!==JSON.stringify(shareResolverDraft)){$('#share-link-settings-status').textContent=sharedLinkError(new Error('LINK_CONFIG_NOT_PUBLISHED'));translateChrome();return;}await ensureShareAlias(true);if(shareRegistration.id)$('#share-link-settings').close();translateChrome();};

  async function loadSharedRoute(route){
    const request=++shareRouteRequest;state.role=route.role;state.externalRole=route.role;state.onboarding='missing';state.demo=false;
    $('#shared-admin-open').hidden=true;$('#share-missing').querySelector('h1').textContent=sheetText('설문에 연결하는 중…');render();
    try{
      const config=await loadShareConfiguration(),target=await shareLinks.resolve(config,publicBase(),route.id);if(request!==shareRouteRequest)return;
      incomingSharedLink={...route,target,signature:JSON.stringify([publicBase(),target])};
      const clean=shareLinks.url(publicBase(),route.id,route.role);if(window.history?.replaceState&&clean)window.history.replaceState(null,'',clean);
      if(route.role==='admin'){
        $('#share-missing').querySelector('h1').textContent=sheetText('운영자 인증이 필요합니다.');
        $('#share-missing').querySelector('p').textContent=sheetText('이 설문의 운영자 계정 또는 운영자 연결 키로 접속해주세요.');
        $('#shared-admin-open').hidden=false;render();return;
      }
      if(target.provider==='supabase')await loadSupabaseEntry({url:target.url,key:target.key,code:target.code},route.role);
      else await loadSheetEntry(new URL(target.endpoint).pathname.split('/')[3],target.code,route.role);
      if(request!==shareRouteRequest)return;
      shareRegistration={signature:shareSignature(),id:route.id,status:'ready',error:''};renderShareLinkState();
    }catch(error){if(request!==shareRouteRequest)return;$('#share-missing').querySelector('h1').textContent=sheetText('설문에 연결하지 못했습니다.');$('#share-missing').querySelector('p').textContent=sharedLinkError(error);render();}
  }
  $('#shared-admin-open').onclick=()=>{
    if(!incomingSharedLink||incomingSharedLink.role!=='admin')return;
    $('#shared-admin-error').textContent='';$('#shared-admin-email').value='';$('#shared-admin-password').value='';$('#shared-admin-key').value='';
    const sb=incomingSharedLink.target.provider==='supabase';$('#shared-admin-supabase').hidden=!sb;$('#shared-admin-sheets').hidden=sb;
    $('#shared-admin-dialog').showModal();translateChrome();
  };
  $('#shared-admin-close').onclick=()=>$('#shared-admin-dialog').close();
  $('#shared-admin-submit').onclick=async()=>{
    if(incomingSharedLink?.role!=='admin')return;
    const button=$('#shared-admin-submit'),target=incomingSharedLink.target;button.disabled=true;
    try{
      if(target.provider==='supabase'){
        const client=await HanmadiSupabase.connect(target.url,target.key,publicBase(),'host');
        const auth=await client.auth.signInWithPassword({email:$('#shared-admin-email').value.trim(),password:$('#shared-admin-password').value});if(auth.error)throw auth.error;
        const user=auth.data?.session?.user;if(!user||user.is_anonymous)throw new Error('HOST_LOGIN_REQUIRED');
        const result=await client.from('hm_events').select('id,code').eq('owner_id',user.id).eq('code',target.code);if(result.error)throw result.error;
        const event=result.data?.find(e=>e.code===target.code);if(!event)throw new Error('FORBIDDEN');
        const snapshot=await HanmadiSupabase.rpc(client,'hm_snapshot',{p_event:event.id});if(!snapshot.host)throw new Error('FORBIDDEN');
        stopSupabase();supabaseClient=client;state.sheets=null;state.supabase={url:target.url,key:target.key,eventId:event.id,host:true};state.eventCode=target.code;setupEventCode=target.code;state.onboarding='workspace';
        applySbSnapshot(snapshot);supabaseReady=true;watchSupabase();
      }else{
        const adminKey=$('#shared-admin-key').value,health=await sheetsCall(target.endpoint,'authorize',{adminKey});if(health.eventCode!==target.code)throw new Error('EVENT_MISMATCH');
        stopSupabase();state.sheets={endpoint:target.endpoint,protocol:2,host:true,adminKey,requireParticipantId:health.requireParticipantId};state.eventCode=target.code;setupEventCode=target.code;state.onboarding='workspace';applySheetSnapshot(health);watchSheets();
      }
      shareRegistration={signature:shareSignature(),id:incomingSharedLink.id,status:'ready',error:''};$('#shared-admin-dialog').close();render();
    }catch(error){$('#shared-admin-error').textContent=target.provider==='supabase'?sbError(error):sheetsError(error);}
    finally{$('#shared-admin-password').value='';$('#shared-admin-key').value='';button.disabled=false;translateChrome();}
  };
