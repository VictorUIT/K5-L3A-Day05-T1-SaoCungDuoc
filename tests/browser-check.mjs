/* Optional browser QA: Node >=22 + installed Chrome/Edge. No npm packages.
 * Runs the two-role production file:// page offline through the full approval story.
 * Temporary fixture/profile/screenshots stay in ignored .tmp/, never P1/P2/P3 files.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const temp = path.join(root, '.tmp', 'browser-' + Date.now());
await mkdir(temp, { recursive: true });
const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
let executable;
for (const candidate of candidates) { try { await access(candidate); executable = candidate; break; } catch {} }
if (!executable) throw new Error('No installed browser. Set CHROME_PATH; browser checks have NOT run.');
const browser = spawn(executable, ['--headless=new', '--remote-debugging-pipe', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + path.join(temp, 'profile'), 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
const calls = new Map(); let sequence = 0; let buffer = ''; let session;
const exceptions = []; const externalRequests = []; const results = [];
browser.on('error', error => { for (const call of calls.values()) { clearTimeout(call.timer); call.reject(error); } calls.clear(); });
browser.stdio[4].on('data', chunk => {
  buffer += chunk.toString();
  for (let end; (end = buffer.indexOf('\0')) >= 0;) {
    const part = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (!part) continue;
    const event = JSON.parse(part);
    if (event.id && calls.has(event.id)) {
      const call = calls.get(event.id); clearTimeout(call.timer); calls.delete(event.id);
      if (event.error) call.reject(new Error(JSON.stringify(event.error))); else call.resolve(event.result || {});
    }
    if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails);
    if (event.method === 'Network.requestWillBeSent' && /^https?:/i.test(event.params.request.url)) externalRequests.push(event.params.request.url);
  }
});
function send(method, params = {}, targetSession = session) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { calls.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
    calls.set(id, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(targetSession ? { sessionId: targetSession } : {}) }) + '\0');
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function navigate(file) {
  await send('Page.navigate', { url: pathToFileURL(file).href });
  for (let i = 0; i < 70; i++) {
    if (await evaluate('document.readyState === "complete" && !!window.T1_STORY && !!document.querySelector(".step-progress")')) return;
    await new Promise(resolve => setTimeout(resolve, 70));
  }
  throw new Error('Page did not initialize: ' + file);
}
async function click(selector) {
  const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.disabled || el.closest('[hidden]')) throw Error('Not clickable'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function fill(value) { await evaluate(`document.getElementById('message-input').value = ${JSON.stringify(value)}`); }
async function screenshot(destination) {
  await evaluate('window.scrollTo(0,0)');
  const metrics = await send('Page.getLayoutMetrics');
  const size = metrics.cssContentSize || metrics.contentSize;
  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } });
  await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, Buffer.from(image.data, 'base64'));
}
function pass(name) { results.push(name); console.log('PASS ' + name); }

async function action(name){await click('[data-action="'+name+'"]');}
async function reply(){
 assert.equal(await evaluate('document.querySelector("[data-action=reply]").disabled'),true);
 const text='Mình đã xem thông tin bạn cung cấp. Bạn vui lòng bổ sung các thông tin còn thiếu để được hỗ trợ.';
 await evaluate('document.getElementById("pharmacist-reply").value='+JSON.stringify(text)+';document.getElementById("pharmacist-reply").dispatchEvent(new Event("input",{bubbles:true}))');
 await click('#customer-tab');await click('#pharmacist-tab');
 assert.equal(await evaluate('document.getElementById("pharmacist-reply").value'),text);
 await action('reply');await click('#customer-tab');
 assert.equal(await evaluate('document.querySelector(".message.pharmacist").textContent.includes('+JSON.stringify(text)+')'),true);
 await click('#pharmacist-tab');
}
async function start(){await action('send');if(await evaluate('!document.querySelector("[data-action=send]").disabled'))await action('send');}
async function trial(kind,value){await click('[data-trial="'+kind+'"]'+(value?'[data-value="'+value+'"]':''));}
try{
 const target=await send('Target.createTarget',{url:'about:blank'},null);const attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null);session=attached.sessionId;
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await navigate(path.join(root,'prototype/index.html'));assert.equal(await evaluate('document.querySelectorAll(".message").length'),0);await start();
 assert.equal(await evaluate('document.querySelector(".message.assistant[data-slot=main] .tool-autonomy").dataset.tool'),'khuyen_di_kham');
 assert.equal(await evaluate('document.querySelector(".sync-status .tool-autonomy").dataset.level'),'AUTO');
 assert.equal(await evaluate('!!document.querySelector("[data-action=transfer]")'),false);assert.equal(await evaluate('!!document.querySelector(".policy-note")'),false);assert.equal(await evaluate('!!document.querySelector(".correction")'),false);assert.equal(await evaluate('!!document.querySelector("[data-trial=product]")'),true);pass('removed standalone trial sections; suggestions are below chat, no transfer button');
 await click('#pharmacist-tab');assert.equal(await evaluate('!!document.querySelector("[data-action=ack]")'),true);await action('ack');await reply();await click('#customer-tab');assert.equal(await evaluate('document.querySelectorAll(".message.pharmacist").length'),1);pass('sending automatically synchronizes K4; pharmacist reply appears in customer chat');
 await click('#customer-tab');await trial('product');await action('send');assert.equal(await evaluate('document.querySelectorAll("[data-trial=transport]").length'),0);assert.equal(await evaluate('document.querySelector(".message.assistant[data-slot=product]").textContent.includes("fixture")'),false);
 assert.equal(await evaluate('document.querySelector(".message.assistant[data-slot=product] .tool-autonomy").dataset.level'),'REVIEW');
 assert.equal(await evaluate('document.querySelector(".message.assistant[data-slot=product] .tool-autonomy").classList.contains("is-blocked")'),true);
 await click('#annotation-toggle');await screenshot(path.join(root,'prototype/assets/screen-01.png'));
 await click('[data-case="K8"]');await action('send');assert.equal(await evaluate('document.querySelectorAll(".message").length'),2);await click('#pharmacist-tab');assert.equal(await evaluate('!!document.querySelector("[data-action=ack]")'),false);await click('#customer-tab');await action('send');assert.equal(await evaluate('document.querySelectorAll(".message").length'),4);await click('#pharmacist-tab');assert.equal(await evaluate('!!document.querySelector("[data-action=ack]")'),true);await click('#customer-tab');pass('K8 still requires two sends; pharmacist receives case only after second send');
 for(const age of ['u3','m3to6','over6','unknown','adult']){
 const count=await evaluate('document.querySelectorAll(".message").length');await trial('age',age);assert.equal(await evaluate('document.querySelectorAll(".message").length'),count);assert.equal(await evaluate('document.getElementById("script-message").value === P2_UX.scenarios.K8.ageOptions.find(a=>a.id==='+JSON.stringify(age)+').label'),true);await action('send');assert.equal(await evaluate('document.querySelectorAll(".message[data-slot=age]").length'),2);assert.equal(await evaluate('document.querySelectorAll(".message").length'),6);await click('#pharmacist-tab');assert.equal(await evaluate('document.querySelector(".review-content").innerText.includes(P2_UX.scenarios.K8.ageOptions.find(a=>a.id==='+JSON.stringify(age)+').label)'),true);await click('#customer-tab');
 }pass('all 5 age presets prefill only; Send replaces old age pair in place and synchronizes pharmacist facts');
 await click('#pharmacist-tab');await action('ack');await reply();await click('#customer-tab');await trial('age','over6');await action('send');assert.equal(await evaluate('document.querySelectorAll(".message.pharmacist").length'),0);await click('#pharmacist-tab');assert.equal(await evaluate('!!document.querySelector("[data-action=ack]")'),true);assert.equal(await evaluate('!!document.querySelector("[data-action=reply]")'),false);await action('ack');await reply();await screenshot(path.join(root,'prototype/assets/screen-02.png'));pass('new age revokes stale read/reply and replaces rather than appends; refreshed annotated images');
 await click('#customer-tab');await trial('redflag');assert.equal(await evaluate('document.querySelectorAll(".message[data-slot=redflag]").length'),0);await action('send');assert.equal(await evaluate('document.querySelectorAll(".message[data-slot=redflag]").length'),2);await click('#pharmacist-tab');assert.equal(await evaluate('!!document.querySelector("[data-action=ack]")'),true);pass('danger trial runs on Send and automatically updates pharmacist view');
 for(const width of [320,390,1366]){await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});for(const tab of ['#customer-tab','#pharmacist-tab']){await click(tab);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);}}pass('both role views fit mobile and laptop');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("[data-case]")).slice(0,2).map(e=>e.dataset.case)'),['K4','K8']);
 assert.equal(await evaluate('document.querySelectorAll("[data-case]").length'),14);
 for(const id of ['K1','K2','K3','K5','K6','K7','K9','K10','K11','K12','K13','K14']){
  await click('#customer-tab');await click('[data-case="'+id+'"]');
  assert.equal(await evaluate('document.querySelectorAll(".message").length'),0);
  assert.equal(await evaluate('document.getElementById("script-message").value===P2_UX.scenarios['+JSON.stringify(id)+'].userMessage'),true);
  await action('send');assert.equal(await evaluate('document.querySelectorAll(".message").length'),2);
  assert.equal(await evaluate('document.querySelector(".message.assistant").textContent.includes(P2_UX.scenarios['+JSON.stringify(id)+'].aiText)'),true);
  await click('#pharmacist-tab');assert.equal(await evaluate('!!document.querySelector("[data-action=ack]")'),id!=='K1');
  if(id!=='K1'){assert.equal(await evaluate('document.querySelector(".review-content").innerText.includes("undefined")'),false);await action('ack');await reply();}
 }
 pass('14 selectable cases, K4/K8 first; all 12 basic questions run on Send and synchronize manual replies where required');
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));assert.equal(externalRequests.length,0);assert.equal(await evaluate('localStorage.length+sessionStorage.length'),0);pass('no JavaScript exceptions, external requests or browser storage');
 await writeFile(path.join(temp,'results.json'),JSON.stringify({results,exceptions,externalRequests},null,2));console.log('QA artifacts: '+temp);
}finally{try{await send('Browser.close',{},null);}catch{}browser.kill();}
