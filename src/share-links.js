// A shared link is an identity, not a compressed credential bundle.
const shareLinks = (()=>{
  const error=code=>{throw new Error(code);};
  const routePattern=/^(.*\/)([A-Za-z0-9_-]{20})\/(admin-page|participant-form|result)\/?$/;
  function deploymentBase(value){
    try{const u=new URL(value),m=routePattern.exec(u.pathname);if(m)u.pathname=m[1];else if(/\/index\.html$/i.test(u.pathname))u.pathname=u.pathname.slice(0,-10);u.search='';u.hash='';return site(u.href);}catch{return '';}
  }
  function site(value){
    try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return '';const route=routePattern.exec(u.pathname);if(route)u.pathname=route[1];else if(/\/index\.html$/i.test(u.pathname))u.pathname=u.pathname.slice(0,-10);if(!u.pathname.endsWith('/')&&!/\.[a-z0-9]+$/i.test(u.pathname))u.pathname+='/';return u.href;}catch{return '';}
  }
  function project(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^[a-z0-9]{12,40}\.supabase\.co$/.test(u.hostname)&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:'';}catch{return '';}}
  function config(value){const url=project(value?.url),key=value?.key;return url&&/^sb_publishable_[A-Za-z0-9_-]{10,200}$/.test(key||'')?{url,key}:null;}
  function target(input){
    if(!input||!/^[a-zA-Z0-9_-]{1,64}$/.test(input.code||''))return error('INVALID_LINK_TARGET');
    if(input.provider==='supabase'){
      const normalized=config(input);if(!normalized)return error('INVALID_LINK_TARGET');
      return {provider:'supabase',url:normalized.url,key:normalized.key,code:input.code};
    }
    if(input.provider==='sheets'){
      try{const u=new URL(input.endpoint);if(u.origin==='https://script.google.com'&&!u.username&&!u.password&&/^\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(u.pathname)&&!u.search&&!u.hash)return {provider:'sheets',endpoint:u.href,code:input.code};}catch{}
    }
    return error('INVALID_LINK_TARGET');
  }
  function identity(base,input){const s=site(base),t=target(input);if(!s)return error('INVALID_LINK_SITE');return [s,t.provider,t.provider==='supabase'?t.url:t.endpoint,t.code].join('\n');}
  async function id(base,input){
    const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity(base,input)))).slice(0,15);
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let result='';
    for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];result+=alphabet[(n>>>18)&63]+alphabet[(n>>>12)&63]+alphabet[(n>>>6)&63]+alphabet[n&63];}
    return result;
  }
  function url(base,alias,role){
    const origin=site(base);if(!origin||!/^[A-Za-z0-9_-]{20}$/.test(alias))return '';
    const suffix={admin:'admin-page',participant:'participant-form',present:'result'}[role];if(!suffix)return '';
    return origin+alias+'/'+suffix;
  }
  function parse(value){
    let m=/^#\/([A-Za-z0-9_-]{20})\/(admin-page|participant-form|result)\/?$/.exec(value||'');
    if(!m){let path;try{path=new URL(value).pathname;}catch{path=value;}const p=routePattern.exec(path||'');if(p)m=[p[0],p[2],p[3]];}
    return m?{id:m[1],role:{'admin-page':'admin','participant-form':'participant',result:'present'}[m[2]]}:null;
  }
  async function register(client,base,input){
    const t=target(input),expected=await id(base,t);let timer;
    try{
      const result=await Promise.race([client.rpc('hm_register_short_link',{p_site:site(base),p_target:t}),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('LINK_REGISTRATION_TIMEOUT')),25000))]);
      if(result.error)throw result.error;if(result.data!==expected)return error('INVALID_LINK_RECEIPT');return expected;
    }finally{clearTimeout(timer);}
  }
  async function resolve(settings,base,alias){
    const c=config(settings);if(!c)return error('LINK_RESOLVER_REQUIRED');if(!/^[A-Za-z0-9_-]{20}$/.test(alias))return error('INVALID_LINK_ID');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(c.url+'/rest/v1/rpc/hm_resolve_short_link',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({p_site:site(base),p_alias:alias}),credentials:'omit',signal:controller.signal});
      const result=await response.json();if(!response.ok){const e=new Error(result.message||'LINK_RESOLVE_FAILED');e.code=result.code;throw e;}if(!result)return error('LINK_NOT_FOUND');
      const t=target(result);if(await id(base,t)!==alias)return error('INVALID_LINK_RECEIPT');return t;
    }finally{clearTimeout(timer);}
  }
  return {site,deploymentBase,config,target,identity,id,url,parse,register,resolve};
})();
