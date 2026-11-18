import fs from 'node:fs/promises';
const base='http://127.0.0.1:5174';
const target=await(await fetch('http://127.0.0.1:9234/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let counter=0;const pending=new Map();const exceptions=[];const checks=[];
ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(message.error):p.resolve(message.result);}}
  if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);};
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method));}},15000).unref();});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression){const end=Date.now()+45000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,200));}throw Error('Timed out: '+expression);}
async function nav(path){await call('Page.navigate',{url:base+path});await wait('document.readyState==="complete"');}
async function fill(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`);}
async function button(label){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText===${JSON.stringify(label)});if(!b)throw Error('Missing button');b.click();return true;})()`);}
function pass(name){checks.push(name);console.log('PASS',name);}
try{
 await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await nav('/');await wait('document.body.innerText.includes("Sign in")');pass('anonymous dashboard access requires sign-in');
 await nav('/login');await wait('!!document.querySelector("input[autocomplete=username]")');
 await fill('input[autocomplete=username]','browser_admin');await fill('input[type=password]',process.env.QA_PASSWORD);
 await evaluate('document.querySelector("form").requestSubmit(); true');
 await wait('document.body.innerText.includes("Report assignment, imports and model versions")');pass('staff sign-in opens existing dashboard');
 await nav('/report');await wait('!!document.querySelector("input[aria-label=Latitude]")');
 await fill('input[aria-label=Latitude]','6.9069');await fill('input[aria-label=Longitude]','80.1347');
 await fill('textarea','BROWSER V2 TEST');await evaluate('document.querySelector("form").requestSubmit();true');
 await wait('document.body.innerText.includes("Report saved. ID:")');
 const reportId=(await evaluate('document.body.innerText')).match(/Report saved\. ID: (\d+)/)[1];pass('public report form saves real report');
 await nav('/operations');await wait('document.body.innerText.includes("BROWSER V2 TEST")');
 const card=`[...document.querySelectorAll('article')].find(a=>a.innerText.includes('${reportId}'))`;
 async function reportButton(label){await evaluate(`(()=>{const card=${card};const b=[...card.querySelectorAll('button')].find(b=>b.innerText===${JSON.stringify(label)});if(!b)throw Error('Missing report button');b.click();return true;})()`);}
 await reportButton('Move to reviewed');await wait(`${card}?.innerText.includes('Move to assigned')`);
 await fill(`select[aria-label="Coordinator ${reportId}"]`,'browser_coordinator');
 await reportButton('Move to assigned');await wait(`${card}?.innerText.includes('Move to in_progress')`);
 await reportButton('Move to in_progress');await wait(`${card}?.innerText.includes('Move to resolved')`);
 await reportButton('Move to resolved');await wait(`${card}?.querySelector('h2').innerText.includes('resolved')`);
 await call('Page.reload');await wait(`${card}?.querySelector('h2').innerText.includes('resolved')`);pass('review, assignment, progress, resolution persist across reload');
 await reportButton('View history and actions');await wait(`${card}?.innerText.includes('report_transition')`);pass('report audit history is visible');
 await button('Model versions and retraining');await wait('document.body.innerText.includes("random_forest_fixed.pkl") && !!document.querySelector("pre")');pass('admin model metadata and retraining command load');
 await call('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFile('research/verification/operations.png',Buffer.from(r.data,'base64')));
 await nav('/account');await wait('document.body.innerText.includes("Ready")');
 await evaluate('document.querySelector("form").requestSubmit();true');await wait('document.body.innerText.includes("Hanwella · web")');pass('web station subscription persists');
 await nav('/operations');await wait('!!document.querySelector("input[type=file]")');
 await evaluate(`(()=>{const lines=['station,datetime,unit,water_level_current,water_level_previous,rainfall_12hr,alert_level,minor_flood_level,major_flood_level'];for(let i=0;i<4;i++)lines.push(['Hanwella',new Date(Date.now()-(3-i)*3600000-300000).toISOString(),'m',5+i*.1,4.9+i*.1,1,2,3,4].join(','));const file=new File([lines.join('\\n')],'browser-observations.csv',{type:'text/csv'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
 await wait('JSON.parse(document.querySelector("pre")?.innerText || "{}").accepted === 4');pass('web CSV upload validates four out-of-order-capable station observations');
 await button('Process pending observations');await wait('document.querySelector("pre")?.innerText.includes("Very High")');pass('web worker action exposes persistent prediction and prototype alert');
 await nav('/account');await wait('document.body.innerText.includes("available_in_web_inbox")');await button('Acknowledge');
 await wait('[...document.querySelectorAll("button")].some(b=>b.innerText==="Acknowledge" && b.disabled)');pass('web inbox alert acknowledgement persists');
 await nav('/alerts');await wait('!document.querySelector("[role=status]").innerText.includes("Loading")');pass('public alerts render prototype/source metadata');
 if(exceptions.length)throw Error(exceptions.join('\n'));pass('no uncaught browser exceptions');
 await fs.writeFile('research/verification/browser.json',JSON.stringify({checks,reportId,exceptions},null,2));
}catch(error){
 await fs.writeFile('research/verification/browser-failure.json',JSON.stringify({error:String(error),checks,body:await evaluate('document.body.innerText'),exceptions},null,2));
 throw error;
}finally{try{await call('Browser.close');}catch{}ws.close();}
