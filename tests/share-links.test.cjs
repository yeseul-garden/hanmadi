const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let reply;const requests=[];
const context={URL,TextEncoder,Uint8Array,crypto:crypto.webcrypto,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>reply};}};
vm.runInNewContext(fs.readFileSync('src/share-links.js','utf8')+'\nthis.api=shareLinks;',context);const api=context.api;
(async()=>{
 const site='https://owner.github.io/hanmadi/',key='sb_publishable_'+'a'.repeat(24),url='https://'+'a'.repeat(20)+'.supabase.co',target={provider:'supabase',url,key,code:'1'.repeat(32)};
 const id=await api.id(site,target);assert.match(id,/^[A-Za-z0-9_-]{20}$/);assert.equal(id,crypto.createHash('sha256').update([site,'supabase',url,target.code].join('\n')).digest('base64url').slice(0,20));
 assert.equal(await api.id(site,{...target,key:'sb_publishable_'+'b'.repeat(24)}),id);
 for(const [s,t]of [[site,{...target,code:'2'.repeat(32)}],[site,{...target,url:'https://'+'b'.repeat(20)+'.supabase.co'}],['https://another.github.io/hanmadi/',target]])assert.notEqual(await api.id(s,t),id);
 const sheet={provider:'sheets',endpoint:'https://script.google.com/macros/s/'+'x'.repeat(40)+'/exec',code:'event-one'};
 assert.notEqual(await api.id(site,sheet),id);assert.notEqual(await api.id(site,{...sheet,endpoint:sheet.endpoint.replace('x'.repeat(40),'y'.repeat(40))}),await api.id(site,sheet));
 const ids=await Promise.all(Array.from({length:500},(_,i)=>api.id(site,{...target,code:'event-'+i})));assert.equal(new Set(ids).size,500);
 for(const [role,suffix]of [['admin','admin-page'],['participant','participant-form'],['present','result']]){const link=api.url(site,id,role);assert.equal(link,site+id+'/'+suffix);assert.equal(api.parse(new URL(link).pathname).role,role);assert.ok(!link.includes(key));assert.ok(!link.includes(target.code));}
 assert.equal(api.url('https://example.com/custom/path/',id,'admin'),'https://example.com/custom/path/'+id+'/admin-page');
 assert.equal(api.deploymentBase('https://example.com/custom/path/'+id+'/admin-page'),'https://example.com/custom/path/');assert.equal(api.deploymentBase('https://example.com/custom/path/index.html'),'https://example.com/custom/path/');assert.equal(api.parse('#/'+id+'/result').role,'present');
 assert.equal(api.parse('#/too-long-code-which-is-invalid/admin-page'),null);assert.equal(api.parse('#/'+id+'/wrong-role'),null);
 assert.throws(()=>api.target({...target,key:'sb_secret_'+'x'.repeat(24)}),/INVALID_LINK_TARGET/);assert.throws(()=>api.target({...sheet,endpoint:sheet.endpoint+'?secret=value'}),/INVALID_LINK_TARGET/);
 const raw={...target,password:'do-not-publish',adminKey:'private'};let sent;
 const client={rpc:async(name,payload)=>{sent={name,payload};return {data:id};}};assert.equal(await api.register(client,site,raw),id);assert.equal(sent.name,'hm_register_short_link');assert.ok(!JSON.stringify(sent).includes('do-not-publish'));assert.ok(!JSON.stringify(sent).includes('adminKey'));
 reply={...target,password:'do-not-publish'};const resolved=await api.resolve({url,key},site,id);assert.equal(resolved.code,target.code);assert.ok(!Object.hasOwn(resolved,'password'));assert.equal(requests[0].options.credentials,'omit');assert.equal(requests[0].options.headers.apikey,key);assert.ok(!Object.hasOwn(requests[0].options.headers,'Authorization'));
 reply={...target,code:'different'};await assert.rejects(()=>api.resolve({url,key},site,id),/INVALID_LINK_RECEIPT/);reply=null;await assert.rejects(()=>api.resolve({url,key},site,id),/LINK_NOT_FOUND/);
 console.log('PASS universal links: 20-character identities, backend/site/event separation, key rotation, all three role paths, 500 distinct survey IDs, public-only payloads and verified resolution.');
})().catch(e=>{console.error(e);process.exitCode=1;});
