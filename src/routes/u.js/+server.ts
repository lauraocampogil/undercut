// The tracking snippet agencies paste on client sites:
// <script defer src="https://YOUR-UNDERCUT/u.js" data-site="CLIENT_ID"></script>
// Cookieless: no cookies, no IP stored, form values never captured.
const SCRIPT = `(()=>{try{
var s=document.currentScript,site=s&&s.dataset.site;if(!site||navigator.webdriver)return;
var api=new URL(s.src).origin,q=[],vid=Math.random().toString(36).slice(2,10),sent=0,dev=innerWidth<768?'mobile':'desktop',path=location.pathname;
var S=null,ent=false;try{S=JSON.parse(sessionStorage.getItem('uc_s')||'null')}catch(e){}
if(!S||Date.now()-S.ts>18e5){var u=new URLSearchParams(location.search),rf=document.referrer?new URL(document.referrer).hostname:'';if(rf===location.hostname)rf='';
S={id:vid,src:u.get('utm_source')||(u.get('gclid')?'google':u.get('fbclid')?'facebook':rf)||'',med:u.get('utm_medium')||(u.get('gclid')?'cpc':u.get('fbclid')?'social':rf?'referral':'none'),camp:u.get('utm_campaign')||'',cont:u.get('utm_content')||'',land:path};ent=true}
S.ts=Date.now();try{sessionStorage.setItem('uc_s',JSON.stringify(S))}catch(e){}
var ctx={sid:S.id,src:S.src,med:S.med,camp:S.camp,cont:S.cont||'',land:S.land};
function ev(o){for(var k in ctx)o[k]=ctx[k];o.p=path;o.d=dev;q.push(o)}
var leadSeen={};function lead(kind,label){var k=kind+label;if(leadSeen[k]&&Date.now()-leadSeen[k]<5000)return;leadSeen[k]=Date.now();ev({t:'l',kind:kind,label:(label||'').slice(0,80)});send()}
function docH(){return Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0)}
function send(){if(maxD>sent+0.02){sent=maxD;q.push({t:'s',v:vid,p:path,d:dev,depth:+maxD.toFixed(3),h:docH()})}if(!q.length)return;var b=JSON.stringify({site:site,events:q.splice(0)});
fetch(api+'/api/collect',{method:'POST',body:b,keepalive:true,headers:{'content-type':'application/json'}}).catch(function(){})}
ev({t:'pv',v:vid,ent:ent,r:document.referrer?new URL(document.referrer).hostname:'',w:innerWidth,h:innerHeight,lang:(navigator.language||'').slice(0,5)});
// leads & outbound clicks, detected automatically — no events to configure
addEventListener('click',function(e){var l=e.target&&e.target.closest&&e.target.closest('a[href]');if(!l)return;var h=l.getAttribute('href')||'';
if(/^tel:/i.test(h))return lead('phone',h.slice(4));if(/^mailto:/i.test(h))return lead('email',h.slice(7).split('?')[0]);
if(/wa\.me|whatsapp\.com|^whatsapp:/i.test(h))return lead('whatsapp','WhatsApp');
var url;try{url=new URL(l.href)}catch(x){return}
if(/\.(pdf|zip|docx?|xlsx?|pptx?|csv)$/i.test(url.pathname))return ev({t:'o',kind:'download',label:url.pathname.split('/').pop().slice(0,80)});
if(url.hostname&&url.hostname!==location.hostname&&/^https?:/.test(url.protocol))ev({t:'o',kind:'out',label:url.hostname})},true);
addEventListener('submit',function(e){var f=e.target;if(!f||f.matches('[role=search],[data-undercut-ignore]'))return;var fields=f.querySelectorAll('input:not([type=hidden]):not([type=submit]),textarea,select');
if(fields.length<2&&f.querySelector('input[type=search],input[name=q],input[name=s]'))return;lead('form',f.getAttribute('name')||f.id||f.getAttribute('action')||'form')},true);
var last=[];
addEventListener('click',function(e){var el=e.target&&e.target.closest?e.target:null;if(!el)return;
var a=el.closest('a,button,input,select,textarea,label,[role=button],[onclick]');
var now=Date.now();last=last.filter(function(c){return now-c.t<700&&Math.abs(c.x-e.pageX)<30&&Math.abs(c.y-e.pageY)<30});last.push({t:now,x:e.pageX,y:e.pageY});
var txt=((a||el).innerText||(a||el).getAttribute('aria-label')||(a||el).getAttribute('alt')||'').trim().replace(/\\s+/g,' ').slice(0,40);
if((a||el).closest('[data-undercut-mask]')||(a||el).matches('input,textarea'))txt='';
q.push({t:'c',sid:S.id,p:path,d:dev,x:+(e.pageX/document.documentElement.scrollWidth).toFixed(4),y:Math.round(e.pageY),w:innerWidth,s:(a||el).tagName.toLowerCase(),txt:txt,i:!!a,rage:last.length>=3});
if(q.length>20)send()},true);
var maxD=0;setTimeout(function(){if(!maxD)maxD=Math.min(1,innerHeight/docH())},1000);addEventListener('scroll',function(){var d=(scrollY+innerHeight)/docH();if(d>maxD)maxD=Math.min(1,d)},{passive:true});
function leave(){if(!maxD)maxD=Math.min(1,innerHeight/docH());send()}
// JavaScript errors on the site → Errors page (max 10 distinct per page view, no personal data)
var errN=0,errSeen={};function jsErr(m,st){m=String(m||'');if(!m||m==='Script error.'||errN>=10||errSeen[m])return;errSeen[m]=1;errN++;
fetch(api+'/api/app',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({site:site,events:[{t:'error',pf:'web',u:S.id,msg:m.slice(0,400),stack:String(st||'').slice(0,3000),url:location.origin+path,name:path,os:dev}]})}).catch(function(){})}
addEventListener('error',function(e){if(e.target&&e.target!==window)return;jsErr(e.message,(e.error&&e.error.stack)||(e.filename?'at '+e.filename+':'+e.lineno+':'+e.colno:''))});
addEventListener('unhandledrejection',function(e){var r=e.reason;jsErr(r&&r.message||r,r&&r.stack)});
addEventListener('pagehide',leave);setInterval(send,4000);setTimeout(send,1200);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')send()});
fetch(api+'/api/fixes?site='+encodeURIComponent(site)+'&path='+encodeURIComponent(path)).then(function(r){return r.json()}).then(function(f){
if(f.gtm&&!window.google_tag_manager){window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});var gt=document.createElement('script');gt.async=true;gt.src='https://www.googletagmanager.com/gtm.js?id='+f.gtm;document.head.appendChild(gt)}
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
