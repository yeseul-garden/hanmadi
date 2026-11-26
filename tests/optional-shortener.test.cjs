const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),n=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,disabled:false,hidden:false,value:'',textContent:'',open:true,parentElement:{hidden:false},addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);};
let calls=[],mode='ok',pending;
const context={URL,URLSearchParams,Map,AbortController,setTimeout,clearTimeout,$:n,sheetText:x=>x,translateChrome(){},qrDataUrl:url=>'QR:'+url,activeShareUrl:'',activeQrData:'',fetch:async(url,options)=>{calls.push({url,options});if(mode==='wait')await new Promise(resolve=>pending=resolve);if(mode==='fail')throw Error('offline');return {ok:true,json:async()=>({shorturl:mode==='invalid'?'https://evil.example/redirect':'https://is.gd/abc123'})};}};
vm.runInNewContext(fs.readFileSync('src/optional-shortener.js','utf8')+'\nthis.begin=url=>{resetOptionalShortening(true);originalParticipantUrl=url;displayParticipantLink(url);};',context);
(async()=>{
 const original='https://example.com/hanmadi/?e=one&v=p#sb=public-connection%3D';
 context.begin(original);assert.equal(calls.length,0);assert.equal(context.activeShareUrl,original);
 n('#share-shorten').checked=true;await n('#share-shorten').onchange();assert.equal(context.activeShareUrl,'https://is.gd/abc123');assert.equal(n('#participant-qr').src,'QR:https://is.gd/abc123');assert.equal(new URLSearchParams(calls[0].options.body).get('url'),original);assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');
 n('#share-shorten').checked=false;await n('#share-shorten').onchange();assert.equal(context.activeShareUrl,original);assert.equal(n('#participant-qr').src,'QR:'+original);
 n('#share-shorten').checked=true;await n('#share-shorten').onchange();assert.equal(calls.length,1,'Exact URL cache avoids repeat shortening');
 for(const failure of ['fail','invalid']){context.begin(original+failure);mode=failure;n('#share-shorten').checked=true;await n('#share-shorten').onchange();assert.equal(context.activeShareUrl,original+failure);assert.equal(n('#share-shorten').checked,false);assert.equal(n('#share-copy').disabled,false);}
 mode='wait';context.begin(original+'race');n('#share-shorten').checked=true;const task=n('#share-shorten').onchange();n('#share-shorten').checked=false;await n('#share-shorten').onchange();assert.equal(n('#share-copy').disabled,false);pending();await task;assert.equal(context.activeShareUrl,original+'race','Late response cannot replace original after unchecking');
 context.begin(original+'close');n('#share-shorten').checked=true;const closing=n('#share-shorten').onchange();n('#share-dialog').close();context.begin(original+'new-survey');pending();await closing;assert.equal(context.activeShareUrl,original+'new-survey','Old request cannot replace reopened survey link');
 console.log('PASS optional URL shortening: opt-in only, encoded query/hash, QR parity, original restoration, cache, timeout/error recovery and close/toggle race protection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
