  // Optional Google Form response board. Collection stays entirely in Google Forms.
  function startFormBoard() {
    const config=window.HANMADI_FORM_SOURCE;
    if(!config?.endpoint)return;
    const endpoint=HanmadiSheets.endpoint(config.endpoint);
    if(!endpoint){notify('Google Form 연결 주소를 확인해주세요.');return;}
    stopSupabase();state.supabase=null;state.sheets=null;
    state.onboarding='workspace';state.demo=false;state.role='present';state.view='space';
    state.responses=[];state.prompt=1;state.accept=false;state.react=false;
    state.timerEnabled=false;state.timerDeadline=null;state.timerPausedMs=null;state.timerExpired=false;
    state.question='AI Self-Learning 페이지에 어떤 콘텐츠가 담기면 좋을 것 같나요? AI를 내 업무에서 더 잘 사용하기 위해 필요한 아이디어나 사이트에 개선할 점이 있다면 알려주세요.';
    state.guidance='';state.nameLabel='LDAP ID';state.anonymous=false;
    state.prompts=[{id:1,question:state.question,guidance:''}];
    let connection=null,busy=false,last='';
    const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='padding:12px;font-size:14px';root.prepend(status);
    let formUrl='';try{const url=new URL(config.formUrl);if(url.protocol==='https:'&&['docs.google.com','forms.gle'].includes(url.hostname))formUrl=url.href;}catch{}
    function showStatus(message){status.textContent=message;if(formUrl){const a=document.createElement('a');a.href=formUrl;a.textContent='Google Form에서 답변하기';a.target='_blank';a.rel='noopener';status.append(' · ',a);}}
    async function refresh(){
      if(busy||document.hidden)return;busy=true;
      try{
        connection??=HanmadiSheets.connect(endpoint,root);
        const result=await connection.call('responses');
        if(!Array.isArray(result.responses)||result.responses.some(r=>!Number.isInteger(r.id)||typeof r.name!=='string'||typeof r.text!=='string'))throw new Error('INVALID_RESPONSE');
        const signature=JSON.stringify(result.responses);
        if(signature!==last){state.responses=result.responses.map(r=>({...r,prompt:1,up:0,heart:0,hidden:false,pinned:false,completed:false,completedAt:null,createdAt:null,nameLabel:'LDAP ID',anonymous:false,votedUp:false,votedHeart:false,extras:{},extraVotes:{}}));last=signature;render();}
        showStatus(`Google Form 응답 ${state.responses.length}개 · 마지막 확인 ${new Date().toLocaleTimeString('ko-KR')}`);
      }catch{connection?.dispose();connection=null;showStatus('응답을 불러오지 못했습니다. 자동으로 다시 연결합니다.');}
      finally{busy=false;}
    }
    updateSettingsInputs();render();showStatus('Google Form 응답을 불러오는 중…');refresh();
    // Refresh polling is independent of the disabled reception timer.
    const poll=setInterval(refresh,15000);
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('pagehide',()=>{clearInterval(poll);connection?.dispose();},{once:true});
  }
  startFormBoard();
