window.HanmadiSupabase = (() => {
  let loading;const clients=new Map();
  const projectURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&/^[a-z0-9]{12,40}\.supabase\.co$/.test(u.hostname)&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:'';}catch{return '';}};
  const publishable=value=>/^sb_publishable_[A-Za-z0-9_-]{10,200}$/.test(value||'')?value:'';
  async function sdk(base){
    if(window.supabase?.createClient)return window.supabase;
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=new URL('vendor/supabase.min.js',base).href;
      script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error('SDK_FAILED'));
      script.onerror=()=>{loading=null;script.remove();reject(new Error('SDK_FAILED'));};document.head.append(script);
    });return loading;
  }
  async function connect(url,key,base,role='participant'){
    url=projectURL(url);key=publishable(key);if(!url||!key)throw new Error('INVALID_SUPABASE');
    const id=role+'|'+url+'|'+key;if(clients.has(id))return clients.get(id);
    const lib=await sdk(base);
    const client=lib.createClient(url,key,{auth:{storageKey:'hanmadi-'+role+'-'+new URL(url).hostname.split('.')[0],persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});clients.set(id,client);return client;
  }
  async function rpc(client,name,params){
    let timer;
    try{
      const result=await Promise.race([client.rpc(name,params),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('SAVE_TIMEOUT')),25000))]);
      if(result.error)throw result.error;return result.data;
    }finally{clearTimeout(timer);}
  }
  return {projectURL,publishable,connect,rpc};
})();
