// Browser ↔ Apps Script HTML-service bridge. Writes are acknowledged by google.script.run.
// No opaque fetch/no-cors success assumptions, JSONP, or response reads are used.
window.HanmadiSheets = (() => {
  /* HANMADI_SHEETS_RESOURCES_START */
  const resources=null;
  /* HANMADI_SHEETS_RESOURCES_END */
  const endpoint = value => {
    try { const u=new URL(value); return u.origin==='https://script.google.com' && !u.username && !u.password && /^\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(u.pathname) && !u.search && !u.hash ? u.href : ''; } catch { return ''; }
  };
  const uuid = () => {
    const bytes=new Uint8Array(16); crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  };
  function connect(value,container=document.body) {
    const url=endpoint(value); if(!url) throw new Error('INVALID_ENDPOINT');
    const channel=uuid(),frame=document.createElement('iframe');
    frame.hidden=true;frame.title='Google Sheets connection';frame.referrerPolicy='no-referrer';
    let peer=null,origin=null,closed=false,request=null,readyResolve,readyReject;
    const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
    const timer=setTimeout(()=>{readyReject(new Error('CONNECTION_TIMEOUT'));dispose();},30000);
    function receive(e) {
      if(closed || !/^https:\/\/(?:script\.google\.com|script\.googleusercontent\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/.test(e.origin)) return;
      const m=e.data;if(!m || m.hanmadiSheets!==1 || m.channel!==channel) return;
      if(m.ready && !peer && e.source) {peer=e.source;origin=e.origin;clearTimeout(timer);readyResolve();return;}
      if(e.source!==peer || e.origin!==origin || !request || m.id!==request.id) return;
      const pending=request;request=null;clearTimeout(pending.timer);
      if(m.error)pending.reject(new Error(m.error));else if(m.result?.ok===true)pending.resolve(m.result);else pending.reject(new Error('INVALID_RECEIPT'));
    }
    function dispose(){
      if(closed)return;closed=true;clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();
      readyReject(new Error('CONNECTION_CLOSED'));
      if(request){clearTimeout(request.timer);request.reject(new Error('CONNECTION_CLOSED'));request=null;}
    }
    window.addEventListener('message',receive);
    frame.src=url+'?channel='+channel;container.append(frame);
    async function call(action,payload){
      await ready;if(closed)throw new Error('CONNECTION_CLOSED');if(request)throw new Error('REQUEST_BUSY');
      return new Promise((resolve,reject)=>{
        const id=uuid();request={id,resolve,reject,timer:setTimeout(()=>{request=null;dispose();reject(new Error('SAVE_TIMEOUT'));},45000)};
        peer.postMessage({hanmadiSheets:1,channel,id,action,payload},origin);
      });
    }
    return {call,dispose};
  }
  function installation(code,bridge,config){
    if(!code.includes('/*__HANMADI_CONFIG__*/ null')||!code.includes('/*__HANMADI_BRIDGE__*/ null')||!bridge.includes('<?!= bootstrap ?>'))throw new Error('ASSET');
    return code.replace('/*__HANMADI_CONFIG__*/ null',()=>JSON.stringify(config,null,2))
      .replace('/*__HANMADI_BRIDGE__*/ null',()=>JSON.stringify(bridge.replace('<?!= bootstrap ?>','__HANMADI_BOOTSTRAP__')));
  }
  return {endpoint,uuid,connect,installation,templates:()=>resources};
})();
