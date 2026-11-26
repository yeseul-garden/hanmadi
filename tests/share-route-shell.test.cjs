const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const page=fs.readFileSync('public/index.html','utf8');assert.equal(fs.readFileSync('public/404.html','utf8'),page);
const shell=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],id='X1A2b3C4d5E6f7G8h9J0';
for(const prefix of ['/hanmadi/','/custom/nested/site/','/'])for(const role of ['admin-page','participant-form','result']){
 const location=new URL('https://fork.example'+prefix+id+'/'+role);let base;
 vm.runInNewContext(shell,{location,document:{createElement:()=>({}),head:{appendChild:item=>base=item.href}}});assert.equal(base,'https://fork.example'+prefix);
}
let added=false;vm.runInNewContext(shell,{location:new URL('https://fork.example/hanmadi/'),document:{createElement:()=>({}),head:{appendChild:()=>added=true}}});assert.equal(added,false);
console.log('PASS clean-route shell: GitHub Pages 404 fallback, root/nested deployments, all three roles and correct asset base without a fixed repository prefix.');
