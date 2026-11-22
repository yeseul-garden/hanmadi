const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('src/seminar-board.html','utf8'),nodes=new Map();
class Node{
 constructor(){this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.listeners={};this.flags=new Map();this.classList={toggle:(k,v)=>this.flags.set(k,v)};this.clientWidth=700;this.offsetHeight=180;this.attrs={};}
 set innerHTML(v){this.html=v;}get innerHTML(){return this.html||'';}
 querySelector(s){if(this.parts?.[s])return this.parts[s];return nodes.get(s)||new Node();}querySelectorAll(){return [];}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(n,f){this.listeners[n]=f;}contains(){return false;}focus(){}click(){}remove(){}append(){}replaceChildren(){}prepend(){}showModal(){this.open=true;}close(){this.open=false;}
}
for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+m[1],new Node());
const root=nodes.get('#seminar-prototype'),marks=[new Node(),new Node()],wordmark=new Node(),hero=new Node(),eventNames=[new Node(),new Node()];
for(const mark of marks)mark.parts={span:new Node(),img:new Node()};
root.querySelectorAll=s=>s==='.brandmark'?marks:s==='.default-wordmark'?[wordmark]:s==='.welcome-host'?[hero]:s==='.event-name'?eventNames:[];
const context={URLSearchParams,TextEncoder,Uint8Array,Blob,URL,crypto:crypto.webcrypto,HanmadiSheets:{uuid:()=>crypto.randomBytes(16).toString('hex')},console,setTimeout(){},setInterval(){},document:{hidden:false,getElementById:id=>nodes.get('#'+id),createElement:()=>new Node(),addEventListener(){}},window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}}};
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\}\)\(\);\s*$/,'root.testing={state,defaultBrand,render,publishedEvent,applySaved,englishText};})();');
vm.runInNewContext(script,context);const t=root.testing,s=t.state,n=id=>nodes.get('#'+id);
const click=dataset=>root.listeners.click({target:{closest:()=>({dataset,disabled:false})}});
const decode=url=>Buffer.from(url.split(',')[1],'base64').toString();
assert.equal(s.color,'#FF6B58');assert.equal(root.style['--sb-accent'],'#FF6B58');assert.equal(s.fontChoice,'ibm');assert.equal(s.fontCustom,false);
assert.match(root.style['--sb-font'],/^"IBM Plex Sans KR"/);assert.equal(decode(marks[0].parts.img.src),fs.readFileSync('assets/brand/hanmadi/c-symbol-black.svg','utf8'));assert.equal(decode(wordmark.src),fs.readFileSync('assets/brand/hanmadi/c-horizontal-black.svg','utf8'));assert.equal(decode(hero.src),fs.readFileSync('assets/brand/hanmadi/c-symbol-coral.svg','utf8'));
click({locale:'en'});assert.equal(s.fontChoice,'inter');assert.match(root.style['--sb-font'],/^"Inter"/);assert.match(root.style['--sb-audience-font'],/^"Inter"/);
s.appearance='dark';t.render();assert.equal(root.style['--sb-accent'],'#FF6B58');assert.equal(decode(wordmark.src),fs.readFileSync('assets/brand/hanmadi/c-horizontal-white.svg','utf8'));
t.applySaved({privateContent:{brandCustom:true,color:'#FF00AA'}});assert.equal(s.color,'#FF00AA');assert.equal(root.style['--sb-accent'],'#FF6B58');assert.equal(root.dataset.branded,'false');
s.onboarding='setup';t.render();assert.equal(root.style['--sb-accent'],'#FF6B58');
s.onboarding='workspace';s.brandCustom=true;s.color='#112233';t.render();assert.equal(root.style['--sb-accent'],'#112233');assert.equal(root.dataset.branded,'true');assert.equal(decode(marks[0].parts.img.src),fs.readFileSync('assets/brand/hanmadi/c-symbol-white.svg','utf8'));
s.onboarding='welcome';t.render();assert.equal(root.style['--sb-accent'],'#FF6B58');assert.equal(s.color,'#112233');assert.equal(root.dataset.branded,'false');s.onboarding='workspace';t.render();assert.equal(root.style['--sb-accent'],'#112233');
s.logo='data:image/png;base64,custom';t.render();assert.equal(marks[0].parts.img.src,s.logo);assert.equal(marks[0].flags.get('default-logo'),false);
s.appearance='light';s.brandCustom=false;s.logo=null;s.locale='en';t.render();
n('font-preset').value='pretendard';n('font-preset').onchange();n('question').value='A question';n('guidance').value='Guidance';n('event-title').value='Custom event';n('name-label').value='Name';n('settings-form').onsubmit({preventDefault(){}});assert.equal(s.fontChoice,'pretendard');assert.equal(s.fontCustom,true);click({locale:'ko'});assert.equal(s.fontChoice,'pretendard');assert.match(root.style['--sb-font'],/^"IBM Plex Sans KR"/);
assert.equal(t.publishedEvent().fontCustom,true);
t.applySaved({privateContent:{brandCustom:true,color:'#234567',fontChoice:'inter',fontCustom:true}});assert.equal(s.color,'#234567');assert.equal(s.fontChoice,'inter');
t.applySaved({privateContent:{brandCustom:false,color:'#245b52',fontCustom:false,locale:'ko'}});assert.equal(s.color,'#FF6B58');assert.equal(s.fontChoice,'ibm');
n('setup-color').oninput();assert.equal(n('setup-use-color').checked,true);
s.onboarding='setup';s.setupStep=3;s.locale='en';n('setup-event').value='New event';n('setup-question').value='Question';n('setup-name-label').value='Name';n('setup-use-color').checked=false;n('setup-color').value='#112233';n('setup-form').onsubmit({preventDefault(){}});assert.equal(s.color,'#FF6B58');assert.equal(s.fontChoice,'inter');assert.equal(s.fontCustom,false);assert.equal(s.logo,null);assert.equal(marks[0].flags.get('default-logo'),true);
assert.equal(t.defaultBrand.background,'#F8F5EF');assert.equal(t.defaultBrand.ink,'#242321');
s.onboarding='setup';s.setupStep=3;n('setup-event').value='';n('setup-form').onsubmit({preventDefault(){}});assert.equal(s.onboarding,'workspace');assert.equal(s.title,'hanmadi');
s.color='#FF00AA';s.brandCustom=true;s.title='A very long custom event name';s.logo='data:image/png;base64,custom';n('setup-demo').onclick();assert.equal(s.color,'#FF6B58');assert.equal(s.brandCustom,false);assert.equal(s.logo,null);
for(const role of ['admin','participant','present']){s.role=role;t.render();assert.equal(root.style['--sb-accent'],'#FF6B58');assert.equal(root.dataset.branded,'false');for(const name of eventNames)assert.equal(name.textContent,'hanmadi');}
s.demo=false;s.title='A very long custom event name';s.brandCustom=true;s.color='#112233';t.render();assert.equal(s.title,'A very long custom event name');for(const name of eventNames)assert.equal(name.textContent,'hanmadi');assert.equal(root.style['--sb-accent'],'#112233');
const copy=JSON.parse(fs.readFileSync('src/ux-copy.json','utf8'));
for(const item of Object.values(copy.messages))assert.equal(t.englishText(item.ko),item.en,'Missing English copy: '+item.ko);
console.log('PASS branding: original logo variants, coral default/light-dark, language-specific first fonts, explicit event overrides, saved custom settings, legacy-default migration and clean new-event defaults.');
