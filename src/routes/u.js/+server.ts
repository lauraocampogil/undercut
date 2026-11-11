// The tracking snippet agencies paste on client sites:
// <script defer src="https://YOUR-UNDERCUT/u.js" data-site="CLIENT_ID"></script>
// Cookieless: no cookies, no IP stored, form values never captured.
const SCRIPT = `(()=>{try{
var s=document.currentScript,site=s&&s.dataset.site;if(!site||navigator.webdriver)return;
var api=new URL(s.src).origin,q=[],vid=Math.random().toString(36).slice(2,10),sent=0,dev=innerWidth<768?'mobile':'desktop',path=location.pathname;
function docH(){return Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0)}
function send(){if(maxD>sent+0.02){sent=maxD;q.push({t:'s',v:vid,p:path,d:dev,depth:+maxD.toFixed(3),h:docH()})}if(!q.length)return;var b=JSON.stringify({site:site,events:q.splice(0)});
fetch(api+'/api/collect',{method:'POST',body:b,keepalive:true,headers:{'content-type':'application/json'}}).catch(function(){})}
q.push({t:'pv',v:vid,p:path,d:dev,r:document.referrer?new URL(document.referrer).hostname:'',w:innerWidth,h:innerHeight});
var last=[];
addEventListener('click',function(e){var el=e.target&&e.target.closest?e.target:null;if(!el)return;
var a=el.closest('a,button,input,select,textarea,label,[role=button],[onclick]');
var now=Date.now();last=last.filter(function(c){return now-c.t<700&&Math.abs(c.x-e.pageX)<30&&Math.abs(c.y-e.pageY)<30});last.push({t:now,x:e.pageX,y:e.pageY});
var txt=((a||el).innerText||(a||el).getAttribute('aria-label')||(a||el).getAttribute('alt')||'').trim().replace(/\\s+/g,' ').slice(0,40);
if((a||el).closest('[data-undercut-mask]')||(a||el).matches('input,textarea'))txt='';
q.push({t:'c',p:path,d:dev,x:+(e.pageX/document.documentElement.scrollWidth).toFixed(4),y:Math.round(e.pageY),w:innerWidth,s:(a||el).tagName.toLowerCase(),txt:txt,i:!!a,rage:last.length>=3});
if(q.length>20)send()},true);
var maxD=0;setTimeout(function(){if(!maxD)maxD=Math.min(1,innerHeight/docH())},1000);addEventListener('scroll',function(){var d=(scrollY+innerHeight)/docH();if(d>maxD)maxD=Math.min(1,d)},{passive:true});
function leave(){if(!maxD)maxD=Math.min(1,innerHeight/docH());send()}
addEventListener('pagehide',leave);setInterval(send,4000);setTimeout(send,1200);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')send()});
fetch(api+'/api/fixes?site='+encodeURIComponent(site)+'&path='+encodeURIComponent(path)).then(function(r){return r.json()}).then(function(f){
function meta(n,v){var m=document.querySelector('meta[name="'+n+'"]');if(!m){m=document.createElement('meta');m.setAttribute('name',n);document.head.appendChild(m)}m.setAttribute('content',v)}
function run(){if(f.title)document.title=f.title;if(f.description)meta('description',f.description);
if(f.canonical){var c=document.querySelector('link[rel=canonical]');if(!c){c=document.createElement('link');c.rel='canonical';document.head.appendChild(c)}c.href=f.canonical}
(f.schema||[]).forEach(function(j,i){if(document.getElementById('uc-ld-'+i))return;var s2=document.createElement('script');s2.type='application/ld+json';s2.id='uc-ld-'+i;s2.text=j;document.head.appendChild(s2)});
var a=f.alts||{};document.querySelectorAll('img').forEach(function(im){var src=im.getAttribute('src')||'';for(var k in a){if(src===k||im.src.split('?')[0].slice(-k.length)===k.split('?')[0]){if(!im.getAttribute('alt'))im.alt=a[k]}}})}
run();setTimeout(run,2000)}).catch(function(){});
setTimeout(function(){fetch(api+'/api/snapshot?site='+encodeURIComponent(site)+'&path='+encodeURIComponent(path)+'&device='+dev).then(function(r){return r.json()}).then(function(j){if(!j.need)return;
var c=document.documentElement.cloneNode(true);c.querySelectorAll('script,noscript,iframe').forEach(function(n){n.remove()});
c.querySelectorAll('input,textarea,select').forEach(function(n){n.removeAttribute('value');n.textContent=''});
c.querySelectorAll('[data-undercut-mask]').forEach(function(n){n.textContent='•••'});
var head=c.querySelector('head');if(head){var b=document.createElement('base');b.href=location.origin+'/';head.insertBefore(b,head.firstChild)}
fetch(api+'/api/snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({site:site,path:path,device:dev,height:docH(),html:'<!doctype html>'+c.outerHTML})})}).catch(function(){})},2500);
}catch(e){}})();`;

export const GET = () =>
	new Response(SCRIPT, {
		headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' }
	});
