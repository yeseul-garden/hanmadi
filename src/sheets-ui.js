  // Sheets UI: embedded inside the product closure by scripts/build-sheets-fragment.py.
  let sheetsConnection=null,sheetsConnectionUrl='',sheetSubmitting=false,sheetMessage='',sheetPending=null;
  let setupEventCode=HanmadiSheets.uuid(),connectionHealth=null,sheetEntryReady=false;
  let sheetRequestQueue=Promise.resolve(),sheetRevision=0,sheetClockOffset=0,sheetApplying=false,sheetWrites=0,sheetLastSettings='',sheetWriteQueue=Promise.resolve(),sheetPolling=null,sheetFetching=false;
  const sheetsErrors={
    INVALID_ENDPOINT:'Apps Script의 /exec 배포 주소를 확인해주세요.',
    CONNECTION_TIMEOUT:'Google 연결 도구가 응답하지 않습니다. 연결 주소를 직접 열어 오류를 확인하고, 코드 전체를 새 버전으로 배포했는지 확인해주세요.',
    SAVE_TIMEOUT:'저장 결과를 아직 확인하지 못했습니다. 같은 내용으로 저장 여부를 다시 확인해주세요.',
    CONNECTION_CLOSED:'연결이 끊겼습니다. 다시 연결해주세요.',
    NAME_TAKEN:'다른 참가자가 사용 중인 닉네임입니다. 이름을 바꿔 다시 제출해주세요.',
    SUBMISSIONS_CLOSED:'시트의 답변 접수가 닫혀 있습니다. 운영자에게 문의해주세요.',
    HEADER_MISMATCH:'시트의 열 이름이 템플릿과 다릅니다. 새 빈 탭으로 연결해주세요.',
    CONTROL_SHEET_MISMATCH:'같은 이름의 설정 탭이 이미 있습니다. 다른 답변 탭 이름으로 연결해주세요.',
    CONTROL_SHEET_MISSING:'접수 설정 탭이 없습니다. 연결 도구에서 초기 설정을 다시 실행해주세요.',
    EVENT_MISMATCH:'연결된 행사 또는 질문이 다릅니다. 연결 설정을 확인해주세요.',
    RUN_INITIALIZE:'Apps Script에서 initializeHanmadi를 먼저 실행해주세요.',
    SETUP_REQUIRED:'Apps Script 설정을 확인해주세요.',
    BUSY_RETRY:'현재 제출이 몰려 있습니다. 잠시 후 같은 내용으로 다시 제출해주세요.',
    INVALID_INPUT:'입력값과 글자 수를 확인해주세요.',
    RETRY_MISMATCH:'이전 제출과 내용이 다릅니다. 운영자에게 제출 ID를 알려주세요.',
    SAVE_FAILED:'저장을 확인하지 못했습니다. 작성 내용은 유지됩니다. 다시 확인해주세요.',
    INVALID_RECEIPT:'올바른 저장 확인을 받지 못했습니다. 다시 확인해주세요.'
  };
  Object.assign(sheetsErrors,{HOST_KEY_REQUIRED:'운영자 연결 키가 맞지 않습니다. 연결 코드를 만들 때 저장한 키를 입력해주세요.',STALE_EVENT:'다른 운영 화면에서 설정이 바뀌었습니다. 최신 설정을 불러온 뒤 다시 적용해주세요.'});
  const sheetText=message=>state.locale==='en'?englishText(message):message;
  function sheetsError(error){return sheetText(sheetsErrors[error?.message]||sheetsErrors.SAVE_FAILED);}
  function sheetsApi(url){
    if(!sheetsConnection || sheetsConnectionUrl!==url){sheetsConnection?.dispose();sheetsConnection=HanmadiSheets.connect(url,root);sheetsConnectionUrl=url;}
    return sheetsConnection;
  }
  function sheetsCall(url,action,payload){
    const result=sheetRequestQueue.then(async()=>{
      try{return await sheetsApi(url).call(action,payload);}
      catch(error){sheetsConnection?.dispose();sheetsConnection=null;sheetsConnectionUrl='';throw error;}
    });sheetRequestQueue=result.catch(()=>{});return result;
  }
  function sheetHostKey(code,create=false){
    const key='hanmadi.sheets.host.'+code;let value='';try{value=localStorage.getItem(key)||'';}catch{}
    if(!value&&create){value=HanmadiSheets.uuid();try{localStorage.setItem(key,value);}catch{}}
    return value;
  }
  function sheetSettings(){return {...publishedEvent(),sort:state.sort,timerEnabled:state.timerEnabled,timerMinutes:state.timerMinutes,timerSeconds:state.timerSeconds,timerDeadline:state.timerDeadline===null?null:state.timerDeadline-sheetClockOffset,timerPausedMs:state.timerPausedMs,timerExpired:state.timerExpired};}
  function sheetModeration(){return Object.fromEntries(state.responses.filter(r=>r.sheetId).map(r=>[r.sheetId,{hidden:!!r.hidden,pinned:!!r.pinned,completed:!!r.completed}]));}
  function applySheetSnapshot(data){
    if(!state.sheets||data.eventCode!==state.eventCode||!data.event)return;
    const event=data.event,previousQuestion=state.question;sheetApplying=true;
    const localView=state.role==='present'?state.presentationView:null;
    for(const k of ['title','question','guidance','nameLabel','nameExample','color','logoBg','view','sort','spacePalette'])if(typeof event[k]==='string')state[k]=event[k];
    for(const k of ['required','anonymous','brandCustom','accept','timerEnabled','timerExpired','fontCustom'])if(typeof event[k]==='boolean')state[k]=event[k];
    if(Object.hasOwn(fontCatalog,event.fontChoice))state.fontChoice=event.fontChoice;
    state.logo=typeof event.logo==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(event.logo)?event.logo:null;
    if(!state.brandCustom)state.color=defaultBrand.accent;
    if(localView)state.view=localView;
    for(const k of ['timerMinutes','timerSeconds'])if(Number.isInteger(event[k]))state[k]=event[k];
    sheetClockOffset=Number.isFinite(data.serverNow)?Date.now()-data.serverNow:0;
    state.timerDeadline=Number.isFinite(event.timerDeadline)?event.timerDeadline+sheetClockOffset:null;
    state.timerPausedMs=Number.isFinite(event.timerPausedMs)?event.timerPausedMs:null;
    if(event.emojiByView)state.emojiByView={...event.emojiByView};
    if(Array.isArray(event.planetColors)&&event.planetColors.length===5)state.planetColors=[...event.planetColors];
    // Reactions remain local-only in Sheets mode; do not imply shared vote counts.
    state.react=false;
    if(Array.isArray(data.responses))state.responses=data.responses.map((r,i)=>({id:r.sequence||i+1,sheetId:r.id,prompt:state.prompt,name:r.name,text:r.text,createdAt:r.createdAt,hidden:!!r.hidden,pinned:!!r.pinned,completed:!!r.completed,up:0,heart:0,extras:{},extraVotes:{},votedUp:false,votedHeart:false,anonymous:state.anonymous,nameLabel:state.nameLabel}));
    state.prompts=[{id:state.prompt,question:state.question,guidance:state.guidance}];
    if(previousQuestion!==state.question&&$('#composer').open){retainDraft();needsReview=true;}
    sheetRevision=data.revision||0;state.sheetEvent=event;
    if(state.role==='admin'&&$('#settings-save').disabled)updateSettingsInputs();
    sheetLastSettings=JSON.stringify([sheetSettings(),sheetModeration()]);render();sheetApplying=false;
  }
  async function refreshSheets(){
    if(!state.sheets||state.sheets.protocol!==2||sheetFetching||sheetWrites||sheetSubmitting)return;
    const current=state.sheets;sheetFetching=true;
    try{const data=await sheetsCall(current.endpoint,'snapshot',current.host?{adminKey:current.adminKey}:{});if(state.sheets===current&&!sheetWrites)applySheetSnapshot(data);}
    catch(error){notify(sheetsError(error));}
    finally{sheetFetching=false;}
  }
  function watchSheets(){if(sheetPolling)clearInterval(sheetPolling);if(state.sheets?.protocol===2){sheetPolling=setInterval(()=>{if(!document.hidden&&state.onboarding==='workspace')refreshSheets();},15000);refreshSheets();}}
  function queueSheetSave(){
    if(!state.sheets?.host||state.sheets.protocol!==2||state.role!=='admin'||state.onboarding!=='workspace'||sheetApplying)return;
    const current=state.sheets,event=sheetSettings(),moderation=sheetModeration(),signature=JSON.stringify([event,moderation]);if(signature===sheetLastSettings)return;
    sheetLastSettings=signature;sheetWrites++;
    sheetWriteQueue=sheetWriteQueue.then(async()=>{
      try{const data=await sheetsCall(current.endpoint,'update',{adminKey:current.adminKey,revision:sheetRevision,event,moderation});sheetRevision=data.revision;}
      catch(error){sheetLastSettings='';notify(sheetsError(error));}
      finally{sheetWrites--;if(!sheetWrites)await refreshSheets();}
    });
  }
  function pendingKey(){return 'hanmadi.pending.'+state.eventCode;}
  function rememberSheetPending(){try{if(sheetPending)sessionStorage.setItem(pendingKey(),JSON.stringify({endpoint:state.sheets.endpoint,payload:sheetPending}));else sessionStorage.removeItem(pendingKey());}catch{}}
  function restoreSheetPending(){
    if(!state.sheets)return;
    try{const saved=JSON.parse(sessionStorage.getItem(pendingKey())||'null');if(saved?.endpoint===state.sheets.endpoint && saved.payload?.event_id===state.eventCode)sheetPending=saved.payload;}catch{}
  }
  function syncSheetsForm(){
    const connected=!!state.sheets;
    $('#sheet-participant-field').hidden=!connected;
    $('#sheet-participant-id').required=connected && !!state.sheets.requireParticipantId;
    $('#sheet-participant-label').textContent=connected&&state.sheets.requireParticipantId?'참가자 ID *':'(선택) 참가자 ID';
    $('#sheet-participant-id').placeholder='봇과 연결할 참가자 ID가 있으면 입력해주세요. 공개 화면에는 표시되지 않습니다.';
    $('#sheet-participant-note').textContent='';
    $('#sheet-privacy-note').hidden=!connected;
    const locked=sheetSubmitting || !!sheetPending;
    for(const id of ['author','answer','sheet-participant-id'])$('#'+id).readOnly=locked;
    $('#compose-close').disabled=sheetSubmitting;
    if(sheetSubmitting){$('#submit-answer').disabled=true;$('#submit-answer').textContent=sheetText('시트에 저장하는 중…');}
    else if(sheetPending){$('#submit-answer').disabled=false;$('#submit-answer').textContent=sheetText('저장 여부 다시 확인');}
    if(sheetMessage)$('#form-message').textContent=sheetMessage;
  }
  function showConnection(){
    if(state.role!=='admin')return;
    connectionHealth=null;
    preparedSheetsCode='';preparedSheetsSignature='';$('#sheets-code').value='';$('#sheets-copy-code').disabled=true;$('#sheets-select-code').disabled=true;$('#sheets-code-status').textContent='';
    $('#connection-mode').value=state.supabase||supabaseDraft?'supabase':state.sheets?'sheets':'local';
    $('#sheets-endpoint').value=state.sheets?.endpoint||'';
    $('#sheets-admin-key').value=state.sheets?.adminKey||sheetHostKey(state.eventCode);
    $('#sheets-site').value=publicBase()||$('#sheets-site').value;
    $('#connection-status').textContent='';$('#connection-apply').disabled=false;
    if(!window.SEMINAR_STATIC_APP)$('#connection-status').textContent=sheetText('실제 Google Sheets 연결은 배포된 Hanmadi 사이트에서 진행해주세요.');
    resetSupabaseConnectionForm();
    renderConnection();$('#connection-dialog').showModal();translateChrome();
  }
  function renderConnection(){
    $('#connection-preview-note').hidden=!!window.SEMINAR_STATIC_APP;$('#connection-live-link').href=publicBase()||canonicalBase($('#sheets-site').value)||'https://yeseul-garden.github.io/hanmadi/';
    $('#sheets-guide').hidden=$('#connection-mode').value!=='sheets';
    $('#local-guide').hidden=$('#connection-mode').value!=='local';
    $('#connection-summary').textContent=state.sheets?'Google Sheets에 답변 기록':'이 브라우저에서만 체험';
    $('#setup-connection-summary').textContent=$('#connection-summary').textContent;
    $('#sheet-export-note').textContent=state.sheets?.protocol===2?'최근 불러온 공유 답변을 Excel로 저장합니다. 원본 제출 기록은 Google 시트에도 보관됩니다.':state.sheets?'이 Excel에는 현재 화면의 답변만 포함됩니다. 전체 제출 기록은 Google Sheets에서 내려받으세요.':'현재 화면의 체험 답변만 저장됩니다. 다른 기기의 답변은 포함되지 않습니다.';
    $('#sheets-audience-notice').hidden=!state.sheets||state.sheets.protocol===2;
    $('#sheets-audience-notice').textContent=state.sheets?'이 연결 도구는 이전 버전입니다. 다른 사람의 답변과 타이머를 함께 보려면 운영자가 연결 코드를 새 버전으로 배포해야 합니다.':'';
    renderSupabaseConnection();
  }
  function resetConnectionHealth(){connectionHealth=null;$('#connection-status').textContent='';renderConnectionRegistration();}
  function externalConnectionAvailable(){
    if(window.SEMINAR_STATIC_APP)return true;
    connectionHealth=null;$('#connection-status').textContent=sheetText('이 미리보기에서는 Google·Supabase 연결을 테스트할 수 없습니다. 배포된 Hanmadi 사이트를 직접 열어 진행해주세요.');
    return false;
  }
  $('#setup-connection-open').onclick=showConnection;
  $('#connection-open').onclick=showConnection;
  $('#connection-close').onclick=()=>$('#connection-dialog').close();
  $('#connection-mode').onchange=()=>{resetConnectionHealth();renderConnection();translateChrome();};
  $('#sheets-endpoint').oninput=()=>{resetConnectionHealth();const url=HanmadiSheets.endpoint($('#sheets-endpoint').value.trim());$('#sheets-open-endpoint').hidden=!url;if(url)$('#sheets-open-endpoint').href=url;};
  $('#sheets-load-existing').onclick=async()=>{
    if(!externalConnectionAvailable())return;
    const endpoint=HanmadiSheets.endpoint($('#sheets-endpoint').value.trim());if(!endpoint){$('#connection-status').textContent=sheetText(sheetsErrors.INVALID_ENDPOINT);return;}
    const button=$('#sheets-load-existing');button.disabled=true;
    try{
      const data=await sheetsCall(endpoint,'health'),event=data.event;
      if(!/^[a-z0-9-]{1,64}$/.test(data.eventCode||'')||typeof event?.question!=='string')throw new Error('EVENT_MISMATCH');
      setupEventCode=data.eventCode;state.eventCode=data.eventCode;
      for(const k of ['title','question','guidance','nameLabel','nameExample'])if(typeof event[k]==='string')state[k]=event[k];
      for(const k of ['required','anonymous','brandCustom'])if(typeof event[k]==='boolean')state[k]=event[k];
      if(/^#[a-f0-9]{6}$/i.test(event.color||''))state.color=event.color;
      state.logo=typeof event.logo==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(event.logo)?event.logo:null;
      setupLogo=state.logo;
      for(const [id,value]of [['setup-event',state.title],['setup-question',state.question],['setup-guidance',state.guidance],['setup-name-label',state.nameLabel],['setup-color',state.color]])$('#'+id).value=value;
      $('#setup-anonymous').checked=state.anonymous;$('#setup-use-color').checked=state.brandCustom;$('#sheets-admin-key').value=sheetHostKey(data.eventCode);$('#sheets-require-id').checked=!!data.requireParticipantId;
      updateSettingsInputs();$('#connection-status').textContent=sheetText('기존 설문을 불러왔습니다. 같은 시트 주소와 탭 이름으로 연결 코드를 다시 만들면 기존 링크와 답변을 유지할 수 있습니다.');
    }catch(error){$('#connection-status').textContent=sheetsError(error);}
    finally{button.disabled=false;translateChrome();}
  };
  $('#sheets-test').onclick=async()=>{
    if(!externalConnectionAvailable())return;
    const endpoint=HanmadiSheets.endpoint($('#sheets-endpoint').value.trim());
    if(!endpoint){$('#connection-status').textContent=sheetText(sheetsErrors.INVALID_ENDPOINT);return;}
    const button=$('#sheets-test');button.disabled=true;$('#connection-status').textContent=sheetText('연결을 확인하는 중…');connectionHealth=null;
    try{
      const result=await sheetsCall(endpoint,'health');
      const expected=state.onboarding==='setup'?setupEventCode:state.eventCode;
      if(result.eventCode!==expected || result.event.question!==configSnapshot().question)throw new Error('EVENT_MISMATCH');
      connectionHealth={endpoint,...result};
      $('#connection-status').textContent=sheetText('연결을 확인했습니다. 테스트 기록을 보내 저장까지 확인해주세요.');
    }catch(error){$('#connection-status').textContent=sheetsError(error);}
    finally{button.disabled=false;translateChrome();}
  };
  let sheetTestReceipt=null;
  $('#sheets-connect-once').onclick=async()=>{
    if(!externalConnectionAvailable())return;
    const button=$('#sheets-connect-once');button.disabled=true;
    try{await $('#sheets-test').onclick();if(connectionHealth)await $('#sheets-test-record').onclick();}
    finally{button.disabled=false;}
  };
  $('#sheets-test-record').onclick=async()=>{
    if(!externalConnectionAvailable())return;
    const endpoint=HanmadiSheets.endpoint($('#sheets-endpoint').value.trim());
    if(!connectionHealth||connectionHealth.endpoint!==endpoint){$('#connection-status').textContent=sheetText('먼저 연결 확인을 눌러주세요.');return;}
    const button=$('#sheets-test-record');button.disabled=true;$('#connection-status').textContent=sheetText('테스트 기록을 저장하는 중…');
    if(!sheetTestReceipt||sheetTestReceipt.event_id!==connectionHealth.eventCode)sheetTestReceipt={submission_id:HanmadiSheets.uuid(),event_id:connectionHealth.eventCode,question_id:'1',client_id:participantId,participant_id:'',display_name:'Hanmadi connection test',answer:'Connection test / 연결 확인',record_type:'test'};
    try{const receipt=await sheetsCall(endpoint,'submit',sheetTestReceipt);if(receipt.submission_id!==sheetTestReceipt.submission_id)throw new Error('INVALID_RECEIPT');connectionHealth.written=true;$('#connection-status').textContent=sheetText('테스트 기록이 저장되었습니다. activity_status가 test인 행은 봇 인증에서 제외해주세요.');}
    catch(error){$('#connection-status').textContent=sheetsError(error);}
    finally{button.disabled=false;renderConnectionRegistration();translateChrome();}
  };
  $('#connection-apply').onclick=async()=>{
    if(state.role!=='admin')return;
    if($('#connection-mode').value==='local')state.sheets=null;
    else {
      if(!connectionHealth?.written||connectionHealth.endpoint!==HanmadiSheets.endpoint($('#sheets-endpoint').value.trim())){$('#connection-status').textContent=sheetText('연결 확인과 테스트 기록 저장을 먼저 완료해주세요.');return;}
      const adminKey=$('#sheets-admin-key').value.trim();
      if(connectionHealth.protocol===2){try{await sheetsCall(connectionHealth.endpoint,'authorize',{adminKey});}catch(error){$('#connection-status').textContent=sheetsError(error);return;}}
      state.sheets={endpoint:connectionHealth.endpoint,requireParticipantId:connectionHealth.requireParticipantId,protocol:connectionHealth.protocol,host:connectionHealth.protocol===2,adminKey};
      if(adminKey)try{localStorage.setItem('hanmadi.sheets.host.'+connectionHealth.eventCode,adminKey);}catch{}
      sheetRevision=connectionHealth.revision||0;
      state.sheetEvent=connectionHealth.event;
    }
    sheetPending=null;sheetMessage='';$('#connection-dialog').close();watchSheets();renderConnection();renderSharing();translateChrome();
  };
  function configSnapshot(){
    if(state.onboarding!=='setup')return {...publishedEvent(),accept:true};
    return {...publishedEvent(),title:$('#setup-event').value.trim()||'hanmadi',question:$('#setup-question').value.trim(),guidance:$('#setup-guidance').value.trim(),nameLabel:$('#setup-name-label').value.trim(),anonymous:$('#setup-anonymous').checked,required:true,nameExample:state.locale==='en'?'Alex Kim':'홍길동',color:$('#setup-color').value,brandCustom:$('#setup-use-color').checked,logo:setupLogo,view:$('#setup-view').value,accept:true};
  }
  let preparedSheetsCode='',preparedSheetsSignature='';
  async function prepareSheetsCode(){
    const sheetURL=$('#sheets-document').value.trim(),match=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/.exec(sheetURL);
    const base=canonicalBase($('#sheets-site').value.trim());
    const tab=$('#sheets-tab').value.trim();
    if(!match)throw new Error('SHEET_URL');
    if(!base)throw new Error('SITE_URL');
    if(!tab || tab.length>100 || /[\[\]*?:/\\]/.test(tab))throw new Error('TAB_NAME');
    const config={spreadsheetId:match[1],sheetName:tab,boothId:$('#sheets-booth').value.trim().slice(0,80),allowedOrigin:new URL(base).origin,eventCode:state.onboarding==='setup'?setupEventCode:state.eventCode,requireParticipantId:$('#sheets-require-id').checked,event:configSnapshot()};
    config.adminKey=sheetHostKey(config.eventCode,true);$('#sheets-admin-key').value=config.adminKey;
    delete config.event.sheets;
    if(!config.event.question)throw new Error('QUESTION_REQUIRED');
    const signature=JSON.stringify(config);
    if(signature!==preparedSheetsSignature){
      const bundled=HanmadiSheets.templates?.();
      let files;
      if(bundled?.['Code.gs']&&bundled?.['Bridge.html'])files=['Code.gs','Bridge.html'].map(name=>[name,bundled[name]]);
      else{const assetBase=new URL('integrations/google-sheets/',base);files=await Promise.all(['Code.gs','Bridge.html'].map(async name=>{const response=await fetch(new URL(name,assetBase),{credentials:'omit'});if(!response.ok)throw new Error('ASSET');return [name,await response.text()];}));}
      preparedSheetsCode=HanmadiSheets.installation(files[0][1],files[1][1],config);preparedSheetsSignature=signature;
    }
    state.publicBaseUrl=base;$('#sheets-code').value=preparedSheetsCode;$('#sheets-copy-code').disabled=false;$('#sheets-select-code').disabled=false;
    $('#sheets-google-step').open=true;return preparedSheetsCode;
  }
  async function withPreparedSheetsCode(button,action){
    button.disabled=true;
    $('#sheets-code-status').textContent=sheetText('연결 코드를 준비하고 있습니다.');
    try{const code=await prepareSheetsCode();await action(code);}
    catch(error){const errors={SHEET_URL:'Google 시트 주소를 확인해주세요. 시트를 연 뒤 브라우저 주소 전체를 복사해 붙여 넣으세요.',SITE_URL:'Hanmadi 사이트 주소를 확인해주세요. https://로 시작하는 배포 주소를 입력하세요.',TAB_NAME:'탭 이름을 확인해주세요. 100자 이내로 입력하고 /, \\, ?, * 같은 기호는 빼주세요.',QUESTION_REQUIRED:'참가자에게 보여줄 질문을 먼저 입력한 뒤 다시 연결해주세요.'};$('#connection-status').textContent=sheetText(errors[error.message]||'설치 파일을 가져오지 못했습니다. 최신 Hanmadi 파일을 배포한 뒤 다시 시도해주세요.');}
    finally{$('#sheets-code-status').textContent=$('#connection-status').textContent;button.disabled=false;translateChrome();}
  }
  $('#sheets-build-code').onclick=()=>withPreparedSheetsCode($('#sheets-build-code'),async()=>{$('#connection-status').textContent=sheetText('연결 코드가 준비되었습니다. 복사한 뒤 Google 연결 화면에 붙여 넣으세요.');$('#sheets-copy-code').focus();});
  function selectPreparedSheetsCode(){
    $('#sheets-code-details').open=true;
    const field=$('#sheets-code');field.value=preparedSheetsCode;field.focus();field.select?.();field.setSelectionRange?.(0,field.value.length);
    return field;
  }
  function codeCopyStatus(message){$('#connection-status').textContent=sheetText(message);$('#sheets-code-status').textContent=sheetText(message);translateChrome();}
  function fallbackCodeCopy(){
    selectPreparedSheetsCode();let copied=false;
    try{copied=typeof document.execCommand==='function'&&document.execCommand('copy')===true;}catch{}
    codeCopyStatus(copied?'연결 코드를 복사했습니다. Google 연결 화면에 붙여 넣으세요.':'자동 복사를 사용할 수 없습니다. 코드 전체를 선택했습니다. 복사 단축키를 누르거나 길게 눌러 복사해주세요.');return copied;
  }
  $('#sheets-copy-code').onclick=()=>{
    // Keep writeText in the original click stack: Safari and embedded browsers can
    // reject clipboard calls after even a fulfilled prepare-code promise.
    if(!preparedSheetsCode){codeCopyStatus('연결 코드 만들기를 먼저 눌러주세요.');return Promise.resolve(false);}
    const button=$('#sheets-copy-code');button.disabled=true;
    let result;
    try{
      if(typeof navigator?.clipboard?.writeText==='function'){
        result=navigator.clipboard.writeText(preparedSheetsCode);
        return Promise.resolve(result).then(()=>{codeCopyStatus('연결 코드를 복사했습니다. Google 연결 화면에 붙여 넣으세요.');return true;},fallbackCodeCopy).finally(()=>{button.disabled=false;});
      }
    }catch{}
    const copied=fallbackCodeCopy();button.disabled=false;return Promise.resolve(copied);
  };
  $('#sheets-select-code').onclick=()=>{if(!preparedSheetsCode)return;selectPreparedSheetsCode();codeCopyStatus('코드 전체를 선택했습니다. 복사 단축키를 누르거나 길게 눌러 복사해주세요.');};
  $('#sheets-download-script').onclick=()=>withPreparedSheetsCode($('#sheets-download-script'),async(code)=>{
    downloadText('Code.gs',code,'text/plain;charset=utf-8');$('#connection-status').textContent=sheetText('연결 코드 파일을 저장했습니다. 내용 전체를 Google 연결 화면에 붙여 넣으세요.');
  });
  for(const id of ['sheets-document','sheets-tab','sheets-booth','sheets-site','sheets-require-id'])$('#'+id).addEventListener('input',()=>{
    preparedSheetsCode='';preparedSheetsSignature='';$('#sheets-code').value='';$('#sheets-copy-code').disabled=true;$('#sheets-select-code').disabled=true;$('#sheets-code-status').textContent='';resetConnectionHealth();
  });
  async function loadSheetEntry(deployment,code,role){
    if(!/^[a-zA-Z0-9_-]{20,200}$/.test(deployment)||!code)return;
    $('#share-missing').querySelector('h1').textContent=sheetText('행사에 연결하는 중…');
    $('#share-missing').querySelector('p').textContent=sheetText('Google Sheets 연결 설정을 확인하고 있습니다.');
    try{
      const endpoint='https://script.google.com/macros/s/'+deployment+'/exec';
      const result=await sheetsCall(endpoint,'health');
      if(result.eventCode!==code || typeof result.event?.question!=='string')throw new Error('EVENT_MISMATCH');
      window.SEMINAR_EVENTS={...(window.SEMINAR_EVENTS||{}),[code]:result.event};
      sheetEntryReady=true;state.sheets={endpoint,requireParticipantId:result.requireParticipantId,protocol:result.protocol,host:false};state.sheetEvent=result.event;
      applyEntryLink(new URLSearchParams({e:code,v:role==='present'?'s':'p'}));state.react=false;restoreSheetPending();render();watchSheets();
    }catch(error){
      $('#share-missing').querySelector('h1').textContent=sheetText('행사에 연결하지 못했습니다.');
      $('#share-missing').querySelector('p').textContent=sheetsError(error);render();
    }
  }
  $('#sheets-template').onclick=()=>{
    const keys=['submission_id','event_id','booth_id','participant_id','display_name','question_id','question','answer','submitted_at','activity_status','client_id','payload_hash'];
    const headers=['제출 ID','행사 ID','부스 ID','참가자 ID','표시 이름','질문 ID','질문 내용','답변 내용','제출 시각','activity_status','client_id','payload_hash'];
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const column=i=>{let n=i+1,s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
    const sheet=(rows,guide=false)=>`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols>${guide?'<col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="100" customWidth="1"/>':'<col min="1" max="6" width="30" customWidth="1"/><col min="7" max="8" width="55" customWidth="1"/><col min="9" max="12" width="32" customWidth="1"/>'}</cols><sheetData>${rows.map((row,i)=>`<row r="${i+1}" ht="${guide&&i?64:34}" customHeight="1">${row.map((value,j)=>`<c r="${column(j)}${i+1}" s="${i===0?1:0}" t="inlineStr"><is><t>${xmlText(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const instructions=[['Hanmadi / 사용 안내','Instructions'],['시작하기','Upload this file to Drive and save as Google Sheets. / Drive에 업로드 후 Google Sheets로 변환하세요.'],['hanmadi 탭','Keep row 1 unchanged. Leave data rows empty. / 첫 행은 수정하지 말고 데이터 행은 비워두세요.'],['설문별 구분','Use a separate tab and script project per survey. / 설문별로 탭과 스크립트 프로젝트를 나누세요.'],['봇 인증','Process only activity_status=submitted. Ignore test rows. / submitted만 인증하고 test는 제외하세요.'],['참가자 ID','Match your bot ID. A typed ID alone is not proof of identity. / 봇 ID와 맞추세요. 입력값 자체가 본인 인증은 아닙니다.'],...keys.map((h,i)=>[headers[i],({submission_id:'중복 방지용 제출 ID / Idempotent submission ID',event_id:'행사 ID / Event ID',booth_id:'부스 ID / Booth ID',participant_id:'봇 인증용 ID · 비공개 / Bot identifier · private',display_name:'화면에 표시할 이름 / Display name',question_id:'현재 버전은 질문 1개 / One question per installation',question:'설치 시 등록한 질문 / Configured question',answer:'참가자 답변 / Response',submitted_at:'서버 접수 시각 · UTC ISO 8601 / Server timestamp',activity_status:'submitted 또는 test / submitted or test',client_id:'기기 세션 ID · 본인 인증 아님 / Browser session ID',payload_hash:'재시도 검증용 · 수정 금지 / Retry digest · do not edit'})[h]])];
    const files=[
      ['[Content_Types].xml',`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
      ['_rels/.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="hanmadi" sheetId="1" r:id="rId1"/><sheet name="사용 안내" sheetId="2" r:id="rId2"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`],
      ['xl/worksheets/sheet1.xml',sheet([headers])],['xl/worksheets/sheet2.xml',sheet(instructions,true)]
    ];
    files[0][1]=files[0][1].replace('</Types>','<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    files[3][1]=files[3][1].replace('</Relationships>',`<Relationship Id="rId3" Type="${rel}/styles" Target="styles.xml"/></Relationships>`);
    files.push(['xl/styles.xml',`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF245B52"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]);
    const href=URL.createObjectURL(new Blob([zipStored(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');a.href=href;a.download='hanmadi-google-sheets-template.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);
  };
