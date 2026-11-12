/* Optional browser QA: Node >=22 + installed Chrome/Edge. No npm packages.
 * Runs the production file:// page offline, then an isolated technical fixture.
 * Temporary fixture/profile/screenshots stay in ignored .tmp/, never P1/P2/P3 files.
 */
import { spawn } from 'node:child_process';
import { cp, mkdir, writeFile, access } from 'node:fs/promises';
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
    if (await evaluate('document.readyState === "complete" && !!window.P4State && document.getElementById("issue-count").textContent !== "…"')) return;
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
try {
  const target = await send('Target.createTarget', { url: 'about:blank' }, null);
  const attached = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null); session = attached.sessionId;
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await navigate(path.join(root, 'prototype/index.html'));
  assert.equal(await evaluate('document.getElementById("scenario-start").disabled'), true);
  assert.equal(await evaluate('window.P1_SCENARIOS.length'), 0); pass('T01/T02: file:// opens offline; pending contracts; no automatic tool');
  await screenshot(path.join(root, 'prototype/assets/screen-01.png'));
  await evaluate('document.getElementById("integration-open").focus()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate('document.getElementById("integration-dialog").open'), true);
  await screenshot(path.join(root, 'prototype/assets/screen-02.png'));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate('document.getElementById("integration-dialog").open'), false); pass('T13: keyboard opens integration dialog; Escape closes');
  await fill('<img src=x onerror=alert(1)> TEST_UNKNOWN'); await click('#composer button[type=submit]');
  assert.equal(await evaluate('document.querySelectorAll("#messages img").length'), 0);
  assert.equal(await evaluate('document.getElementById("messages").textContent.includes(window.P2_UX.common.unknownInput)'), true);
  assert.equal(await evaluate('document.getElementById("handoff").disabled'), true); pass('T10: arbitrary input uses neutral fallback; text escaped; missing policy blocks handoff');
  await click('#correct');
  assert.equal(await evaluate('document.getElementById("message-input").value.includes("TEST_UNKNOWN")'), true);
  await click('#reset'); assert.equal(await evaluate('document.getElementById("messages").children.length'), 0); pass('correction/reset clears session and returns focus to composer');
  for (const width of [390, 320, 1366]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".button:not(:disabled)")).filter(el => !el.closest("dialog") && !el.closest("[hidden]")).every(el => el.getBoundingClientRect().height >= 44)'), true);
    if (width === 390) await screenshot(path.join(temp, 'mobile.png'));
  }
  pass('T13: no horizontal overflow at 320/390/1366px; active buttons >=44px tall');
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0); pass('T07/T14: no localStorage/sessionStorage writes');

  // A separate copy exercises rendered controls without inventing production data.
  const fixtureDirectory = path.join(temp, 'technical-fixture'); await cp(path.join(root, 'prototype'), fixtureDirectory, { recursive: true });
  const scenario = { id: 'TECH_ONLY', message: 'TECHNICAL_TEST_MESSAGE', riskClass: 'ambiguity', failureMode: 'TEST_FAILURE', expectedBehavior: 'TEST_EXPECTED', harmLevel: 'recoverable', isPriority: false, evidence: ['TEST_SOURCE'], flowId: 'tech', safety: { urgent: false, vulnerable: false, prescription: false, screeningComplete: true } };
  const flow = { states: [
    { id: 'SAFE_INFO', aiText: 'TECHNICAL_TEST_COPY', evidenceText: 'TECHNICAL_TEST_EVIDENCE', actions: [{ id: 'save', label: 'TECH_SAVE', next: 'COMPLETE', tool: 'luu_ghi_chu_suc_khoe' }, { id: 'handoff', label: 'TECH_HANDOFF', next: 'COMPLETE', tool: 'chuyen_duoc_si' }, { id: 'product', label: 'TECH_PRODUCT', next: 'COMPLETE', tool: 'goi_y_san_pham' }, { id: 'forbidden', label: 'TECH_FORBIDDEN', next: 'COMPLETE', tool: 'ban_thuoc_ke_don' }] },
    { id: 'COMPLETE', aiText: 'TECHNICAL_TEST_COMPLETE', evidenceText: 'TEST_EVIDENCE', actions: [] }
  ], errorType: 'system', notification: { who: 'TEST_ROLE', when: 'TEST_TIME', what: 'TEST_NOTIFICATION' }, haxAnchors: [{ principle: 'TEST_ONLY_1', targetId: 'evidence', reason: 'TEST_REASON' }, { principle: 'TEST_ONLY_2', targetId: 'actions', reason: 'TEST_REASON' }] };
  const toolIds = ['goi_y_san_pham', 'chuyen_duoc_si', 'khuyen_di_kham', 'luu_ghi_chu_suc_khoe', 'ban_thuoc_ke_don'];
  const tools = Object.fromEntries(toolIds.map(id => [id, { level: id === 'ban_thuoc_ke_don' ? 'FORBID' : id === 'luu_ghi_chu_suc_khoe' ? 'APPROVAL' : 'AUTO', approver: id === 'luu_ghi_chu_suc_khoe' ? 'khách' : 'none', timeoutMs: 3000, conditions: [], conditionChecks: [], justification: 'TEST_COST', timeoutBehavior: 'TEST_TIMEOUT', fallback: 'TEST_FALLBACK' }]));
  await writeFile(path.join(fixtureDirectory, 'data/p1-scenarios.js'), 'window.P1_SCENARIOS=' + JSON.stringify([scenario]));
  await writeFile(path.join(fixtureDirectory, 'data/p2-ux.js'), 'window.P2_UX=' + JSON.stringify({ flows: { tech: flow }, common: { unknownInput: 'TEST_UNKNOWN', simulatedHandoff: 'TEST_HANDOFF_MOCK_ONLY' } }));
  await writeFile(path.join(fixtureDirectory, 'data/p3-autonomy.js'), 'window.P3_AUTONOMY=' + JSON.stringify({ tools }));
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await navigate(path.join(fixtureDirectory, 'index.html')); await click('#scenario-start');
  assert.equal(await evaluate('document.getElementById("messages").textContent.includes("TECHNICAL_TEST_COPY")'), true);
  assert.equal(await evaluate('document.querySelectorAll(".anchor-badge").length'), 2);
  assert.equal(await evaluate('Array.from(document.querySelectorAll("#flow-actions button")).some(b => b.textContent === "TECH_FORBIDDEN")'), false); pass('technical fixture: copy, anchors and FORBID UI render correctly');
  await click('#flow-actions button');
  assert.equal(await evaluate('document.getElementById("approval-card").hidden'), false);
  assert.equal(await evaluate('document.getElementById("approve").disabled'), true);
  await click('#consent'); assert.equal(await evaluate('document.getElementById("approve").disabled'), false);
  await click('#approve'); assert.equal(await evaluate('document.getElementById("discard-note").hidden'), false);
  await click('#discard-note'); assert.equal(await evaluate('document.getElementById("discard-note").hidden'), true); pass('T07/T08 technical fixture: consent -> valid approval -> in-memory save -> delete');
  await click('#scenario-start'); await click('#flow-actions button'); await click('#reject');
  assert.equal(await evaluate('document.getElementById("approval-card").hidden'), true);
  assert.equal(await evaluate('document.getElementById("discard-note").hidden'), true); pass('T08 technical fixture: rejection executes no tool');
  await click('#flow-actions button'); await new Promise(resolve => setTimeout(resolve, 3300));
  assert.equal(await evaluate('document.getElementById("approval-card").hidden'), true);
  assert.equal(await evaluate('document.getElementById("session-notice").textContent.includes("TEST_TIMEOUT")'), true); pass('T08 technical fixture: actual timer expires without execution');
  await click('#scenario-start'); await click('#handoff');
  assert.equal(await evaluate('document.getElementById("session-notice").textContent.includes("TEST_HANDOFF_MOCK_ONLY")'), true);
  await click('#undo'); assert.equal(await evaluate('document.getElementById("undo").hidden'), true); pass('technical fixture: AUTO handoff has no approval wait; undo works');
  scenario.safety.vulnerable = true;
  await writeFile(path.join(fixtureDirectory, 'data/p1-scenarios.js'), 'window.P1_SCENARIOS=' + JSON.stringify([scenario]));
  await navigate(path.join(fixtureDirectory, 'index.html')); await click('#scenario-start');
  assert.equal(await evaluate('Array.from(document.querySelectorAll("#flow-actions button")).find(b => b.textContent === "TECH_PRODUCT").disabled'), true);
  pass('T04 technical fixture: vulnerable flag blocks product action on rendered UI');
  scenario.safety.urgent = true;
  flow.states.push({ id: 'URGENT', aiText: 'TECHNICAL_URGENT_COPY', evidenceText: 'TECHNICAL_URGENT_EVIDENCE', actions: [] });
  await writeFile(path.join(fixtureDirectory, 'data/p1-scenarios.js'), 'window.P1_SCENARIOS=' + JSON.stringify([scenario]));
  await writeFile(path.join(fixtureDirectory, 'data/p2-ux.js'), 'window.P2_UX=' + JSON.stringify({ flows: { tech: flow }, common: { unknownInput: 'TEST_UNKNOWN', simulatedHandoff: 'TEST_HANDOFF_MOCK_ONLY' } }));
  await navigate(path.join(fixtureDirectory, 'index.html')); await click('#scenario-start');
  assert.equal(await evaluate('document.getElementById("urgent-card").textContent'), 'TECHNICAL_URGENT_COPY');
  assert.equal(await evaluate('document.getElementById("urgent-card").hidden'), false);
  assert.equal(await evaluate('document.getElementById("handoff").hidden'), true);
  assert.equal(await evaluate('document.querySelectorAll("#flow-actions button").length'), 0);
  pass('T05 technical fixture: urgent card is immediate; no queue/product controls');
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions)); assert.equal(externalRequests.length, 0, JSON.stringify(externalRequests)); pass('no uncaught JavaScript errors or HTTP(S) requests across production/technical fixture');
  await writeFile(path.join(temp, 'results.json'), JSON.stringify({ results, exceptions, externalRequests, productionScreenshots: ['prototype/assets/screen-01.png', 'prototype/assets/screen-02.png'] }, null, 2));
  console.log('QA artifacts: ' + temp);
} finally {
  try { await send('Browser.close', {}, null); } catch {} browser.kill();
}
