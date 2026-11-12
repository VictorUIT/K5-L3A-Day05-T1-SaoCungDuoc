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
    if (await evaluate('document.readyState === "complete" && !!window.P4Review && document.getElementById("customer-status").textContent.length > 0')) return;
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

async function choose(field, value) {
  await evaluate(`(() => { const input = document.getElementById(${JSON.stringify('field-' + field)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
}
async function note(value) {
  await evaluate(`document.getElementById('review-note').value = ${JSON.stringify(value)}; document.getElementById('review-note').dispatchEvent(new Event('input', {bubbles:true}))`);
}
async function completeScreening() {
  for (const [key,value] of Object.entries({ageBand:'over6',danger:'no',duration:'under1',medicines:'none',allergies:'none',conditions:'none',treatment:'none'})) await choose(key,value);
}
try {
  const target = await send('Target.createTarget', { url: 'about:blank' }, null);
  const attached = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null); session = attached.sessionId;
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await navigate(path.join(root,'prototype/index.html'));
  assert.equal(await evaluate('document.querySelectorAll(".case-option").length'),2);
  assert.equal(await evaluate('document.getElementById("customer-tab").getAttribute("aria-selected")'), 'true');
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),true);
  assert.equal(await evaluate('document.getElementById("product-name").textContent'),'');
  const unwanted = ['PENDING_', 'Xem kịch bản nguồn P1', 'Trong bản mô phỏng này', 'Một cuộc trò chuyện.', 'Không có AI API'];
  for (const text of unwanted) assert.equal(await evaluate('document.body.innerText.includes('+JSON.stringify(text)+')'),false);
  pass('offline startup: exactly two cases, two role tabs, no legacy notes or customer product');

  await click('#send-review');
  assert.equal(await evaluate('document.getElementById("pending-count").textContent'),'1');
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),true);
  await click('#pharmacist-tab');
  assert.equal(await evaluate('document.getElementById("review-detail").hidden'),false);
  assert.equal(await evaluate('document.getElementById("draft-heading").textContent'), 'Sản phẩm minh họa P-01');
  assert.equal(await evaluate('document.getElementById("screening-summary").textContent.includes("Chưa cung cấp")'),true);
  assert.equal(await evaluate('document.getElementById("approve").disabled'),true);
  pass('pending proposal arrives in pharmacist view; missing screening blocks approval');

  await note('Vui lòng bổ sung tuổi và thông tin sàng lọc.'); await click('#request-info');
  await click('#customer-tab');
  assert.equal(await evaluate('document.getElementById("customer-status").textContent'), 'Dược sĩ cần bổ sung');
  assert.equal(await evaluate('document.getElementById("messages").textContent.includes("Vui lòng bổ sung tuổi")'),true);
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),true);
  pass('request-more-info syncs to customer without exposing proposal');

  await completeScreening(); await click('#send-review');
  assert.equal(await evaluate('document.getElementById("product-name").textContent'),'');
  await click('#pharmacist-tab');
  assert.equal(await evaluate('document.getElementById("screening-summary").textContent.includes("Trên 6 tháng")'),true);
  assert.equal(await evaluate('document.getElementById("approve").disabled'),true);
  await click('#review-confirm');
  assert.equal(await evaluate('document.getElementById("approve").disabled'),false);
  await screenshot(path.join(root,'prototype/assets/screen-02.png'));
  await click('#approve'); await click('#customer-tab');
  assert.equal(await evaluate('document.getElementById("customer-status").textContent'),'Đã được duyệt');
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),false);
  assert.equal(await evaluate('document.getElementById("product-name").textContent'),'Sản phẩm minh họa P-01');
  assert.equal(await evaluate('document.getElementById("pending-count").textContent'),'0');
  await screenshot(path.join(root,'prototype/assets/screen-01.png'));
  pass('resubmission -> pharmacist review -> approval -> synchronized customer product release');

  await choose('allergies','unknown');
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),true);
  assert.equal(await evaluate('document.getElementById("product-name").textContent'),'');
  assert.equal(await evaluate('document.getElementById("customer-notice").textContent.includes("không còn hiệu lực")'),true);
  pass('screening correction instantly removes previously approved product from customer DOM');

  await choose('allergies','none'); await click('#send-review'); await click('#pharmacist-tab');
  await note('Đề xuất cần được xem xét thêm.'); await click('#reject'); await click('#customer-tab');
  assert.equal(await evaluate('document.getElementById("customer-status").textContent'),'Dược sĩ đã từ chối');
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),true);
  assert.equal(await evaluate('document.getElementById("messages").textContent.includes("Đề xuất cần được xem xét thêm.")'),true);
  pass('rejection and reason sync to customer; no product is released');

  await click('#send-review'); await click('#cancel-review');
  assert.equal(await evaluate('document.getElementById("pending-count").textContent'),'0');
  assert.equal(await evaluate('document.getElementById("product-card").hidden'),true);
  pass('customer cancellation clears pending request without release');

  await click('[data-case-id="K4"]');
  assert.equal(await evaluate('document.getElementById("urgent-alert").hidden'),false);
  assert.equal(await evaluate('document.getElementById("screening-section").hidden'),true);
  await click('#pharmacist-tab');
  assert.equal(await evaluate('document.getElementById("pharmacist-alert").hidden'),false);
  assert.equal(await evaluate('document.getElementById("review-detail").hidden'),true);
  assert.equal(await evaluate('document.getElementById("pending-count").textContent'),'0');
  pass('K4 shows immediate emergency guidance in both views, with no approval queue');

  await click('#customer-tab'); await click('[data-case-id="K8"]'); await choose('ageBand','under3');
  assert.equal(await evaluate('document.getElementById("customer-status").textContent'),'Cần cấp cứu ngay');
  assert.equal(await evaluate('document.getElementById("send-review").disabled'),true);
  await choose('ageBand','3to6');
  assert.equal(await evaluate('document.getElementById("customer-status").textContent'),'Cần được khám kịp thời');
  assert.equal(await evaluate('document.getElementById("send-review").disabled'),true);
  await choose('ageBand','over6'); await choose('danger','yes');
  assert.equal(await evaluate('document.getElementById("customer-status").textContent'),'Cần cấp cứu ngay');
  pass('K8 danger/young-age branches bypass product review with appropriate guidance');

  await click('#reset-case'); await completeScreening(); await click('#send-review');
  await evaluate('document.getElementById("customer-tab").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await evaluate('document.getElementById("pharmacist-tab").getAttribute("aria-selected")'),'true');
  assert.equal(await evaluate('document.activeElement.id'),'pharmacist-tab');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  assert.equal(await evaluate('document.getElementById("customer-tab").getAttribute("aria-selected")'),'true');
  pass('role tabs support keyboard arrows and correct ARIA/focus state');

  for (const width of [320,390,1366]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    for (const tab of ['#customer-tab','#pharmacist-tab']) {
      await click(tab);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
      assert.equal(await evaluate('Array.from(document.querySelectorAll(".button:not(:disabled),.tab,.case-option")).filter(el=>!el.closest("[hidden]")).every(el=>el.getBoundingClientRect().height>=44)'),true);
      if(width===390) await screenshot(path.join(temp,tab.includes('pharmacist')?'pharmacist-mobile.png':'customer-mobile.png'));
    }
  }
  pass('both views fit 320/390/1366px; visible action targets are at least 44px tall');

  await click('#customer-tab'); await fill('<img src=x onerror=alert(1)> TEST_CONTEXT'); await click('#composer button');
  assert.equal(await evaluate('document.querySelectorAll("#messages img").length'),0);
  assert.equal(await evaluate('document.getElementById("field-danger").value'),'');
  assert.equal(await evaluate('document.getElementById("pending-count").textContent'),'0');
  assert.equal(await evaluate('localStorage.length+sessionStorage.length'),0);
  assert.equal(exceptions.length,0,JSON.stringify(exceptions)); assert.equal(externalRequests.length,0,JSON.stringify(externalRequests));
  pass('new free text invalidates old review, remains escaped, and causes no storage/network/errors');
  await writeFile(path.join(temp,'results.json'),JSON.stringify({results,exceptions,externalRequests},null,2));
  console.log('QA artifacts: '+temp);
} finally {
  try { await send('Browser.close',{},null); } catch {} browser.kill();
}
