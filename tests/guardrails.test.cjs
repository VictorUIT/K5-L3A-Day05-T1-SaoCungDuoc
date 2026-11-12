/* Technical fixtures only. These are NOT P1 scenarios, P2 copy or P3 decisions. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function load() {
  const context = vm.createContext({}); context.window = context;
  for (const file of ['validation.js', 'mock-tools.js', 'state-machine.js']) vm.runInContext(fs.readFileSync(path.join(root, 'prototype/js', file), 'utf8'), context, { filename: file });
  return context;
}
function fixtures() {
  const c = load();
  const safety = { urgent: false, vulnerable: false, prescription: false, screeningComplete: true };
  const scenarios = Array.from({ length: 8 }, (_, i) => ({ id: 'TEST_' + i, message: 'TEST_MESSAGE_' + i, riskClass: ['source', 'ambiguity', 'authority', 'domain'][i % 4], failureMode: 'TEST_FAILURE', expectedBehavior: 'TEST_EXPECTED', harmLevel: 'recoverable', isPriority: i < 2, evidence: ['TEST_EVIDENCE'], flowId: 'test-flow', safety: { ...safety } }));
  const ux = { common: { unknownInput: 'TEST_UNKNOWN', simulatedHandoff: 'TEST_SIMULATED_HANDOFF' }, flows: { 'test-flow': {
    states: [
      { id: 'SAFE_INFO', aiText: 'TEST_TEXT', evidenceText: 'TEST_EVIDENCE', actions: [
        { id: 'save', label: 'TEST_SAVE', tool: 'luu_ghi_chu_suc_khoe', next: 'COMPLETE' },
        { id: 'product', label: 'TEST_PRODUCT', tool: 'goi_y_san_pham', next: 'COMPLETE' },
        { id: 'handoff', label: 'TEST_HANDOFF', tool: 'chuyen_duoc_si', next: 'COMPLETE' }
      ] },
      { id: 'COMPLETE', aiText: 'TEST_COMPLETE', evidenceText: 'TEST_EVIDENCE', actions: [] },
      { id: 'URGENT', aiText: 'TEST_URGENT_TEXT', evidenceText: 'TEST_EVIDENCE', actions: [] }
    ],
    haxAnchors: [{ principle: 'TEST_ANCHOR_1', targetId: 'evidence', reason: 'TEST_REASON' }, { principle: 'TEST_ANCHOR_2', targetId: 'actions', reason: 'TEST_REASON' }],
    errorType: 'system', notification: { who: 'TEST_WHO', when: 'TEST_WHEN', what: 'TEST_WHAT' }
  } } };
  const policy = { tools: Object.fromEntries(c.P4Validation.TOOL_IDS.map(id => [id, { level: id === 'ban_thuoc_ke_don' ? 'FORBID' : 'AUTO', justification: 'TEST_COST', conditions: [], conditionChecks: [], approver: 'none', timeoutBehavior: 'TEST_TIMEOUT', fallback: 'TEST_FALLBACK' }])) };
  let clock = 1000;
  return { c, scenarios, ux, policy, safety, setTime: value => { clock = value; }, engine: () => c.P4State.createEngine(scenarios, ux, policy, () => clock) };
}
test('empty production inputs remain PENDING; no tool authorization', () => {
  const c = load();
  const report = c.P4Validation.validate([], { common: {}, flows: {} }, { tools: {} });
  assert.equal(report.ready, false);
  for (const id of c.P4Validation.TOOL_IDS) assert.equal(c.P4State.authorizeAction(id, { active: true }, { tools: {} }).allowed, false);
});
test('fully linked technical fixture passes structural validation', () => {
  const f = fixtures(); assert.equal(f.c.P4Validation.validate(f.scenarios, f.ux, f.policy).ready, true);
});
test('missing flow, action destination, tool and HAX target are rejected', () => {
  for (const change of [f => { f.scenarios[0].flowId = 'missing'; }, f => { f.ux.flows['test-flow'].states[0].actions[0].next = 'missing'; }, f => { f.ux.flows['test-flow'].states[0].actions[0].tool = 'unknown_tool'; }, f => { f.ux.flows['test-flow'].haxAnchors[0].targetId = 'missing'; }]) {
    const f = fixtures(); change(f);
    assert.equal(f.c.P4Validation.validate(f.scenarios, f.ux, f.policy).ready, false);
    assert.equal(f.engine().start('TEST_0').state, 'FAILED');
  }
});
test('duplicate scenario and state IDs fail closed', () => {
  const f = fixtures(); f.scenarios[1].id = f.scenarios[0].id;
  assert.equal(f.engine().start('TEST_0').state, 'FAILED');
  const g = fixtures(); g.ux.flows['test-flow'].states.push(g.ux.flows['test-flow'].states[0]);
  assert.equal(g.engine().start('TEST_0').state, 'FAILED');
});
test('prescription sales are forbidden even when directly calling mock adapter with AUTO', () => {
  const f = fixtures(); f.policy.tools.ban_thuoc_ke_don.level = 'AUTO';
  assert.equal(f.c.P4MockTools.execute('ban_thuoc_ke_don', { active: true, ...f.safety }, f.policy).ok, false);
});
test('one missing policy blocks every otherwise allowed tool', () => {
  const f = fixtures(); delete f.policy.tools.khuyen_di_kham;
  assert.equal(f.c.P4State.authorizeAction('chuyen_duoc_si', { active: true }, f.policy).status, 'PENDING_P3');
});
test('unmapped natural-language condition never authorizes', () => {
  const f = fixtures(); f.policy.tools.chuyen_duoc_si.conditions = ['TEST_CONDITION'];
  assert.equal(f.c.P4MockTools.execute('chuyen_duoc_si', { active: true }, f.policy).ok, false);
});
test('condition checks require exact boolean match', () => {
  const f = fixtures(); const policy = f.policy.tools.chuyen_duoc_si;
  policy.conditions = ['TEST_CONDITION']; policy.conditionChecks = [{ field: 'screeningComplete', equals: true }];
  assert.equal(f.c.P4MockTools.execute('chuyen_duoc_si', { active: true }, f.policy).ok, false);
  assert.equal(f.c.P4MockTools.execute('chuyen_duoc_si', { active: true, screeningComplete: true }, f.policy).ok, true);
});
test('product suggestions require explicit complete safety flags', () => {
  const f = fixtures();
  for (const flags of [{}, { ...f.safety, urgent: true }, { ...f.safety, vulnerable: true }, { ...f.safety, prescription: true }, { ...f.safety, screeningComplete: false }]) assert.equal(f.c.P4MockTools.execute('goi_y_san_pham', { active: true, ...flags }, f.policy).ok, false);
  assert.equal(f.c.P4MockTools.execute('goi_y_san_pham', { active: true, ...f.safety }, f.policy).ok, true);
});
test('confirmed urgent fixture skips normal state and cannot hand off to queue', () => {
  const f = fixtures(); f.scenarios[0].safety.urgent = true; const e = f.engine();
  const result = e.start('TEST_0');
  assert.equal(result.state, 'URGENT'); assert.equal(result.urgentText, 'TEST_URGENT_TEXT');
  assert.equal(result.messages.some(m => m.text === 'TEST_TEXT'), false);
  assert.equal(e.requestHandoff().handoff, false);
  assert.equal(e.snapshot().state, 'URGENT');
});
test('urgent state is shown immediately even while P3 is missing', () => {
  const f = fixtures(); f.scenarios[0].safety.urgent = true; f.policy.tools = {};
  assert.equal(f.engine().start('TEST_0').urgentText, 'TEST_URGENT_TEXT');
});
test('AUTO executes without approval; undo changes only mock session', () => {
  const f = fixtures(); const e = f.engine(); e.start('TEST_0');
  assert.equal(e.act('handoff').handoff, true); assert.equal(e.snapshot().pending, null);
  assert.equal(e.undo().handoff, false);
});
function approvalFixture() {
  const f = fixtures(); Object.assign(f.policy.tools.luu_ghi_chu_suc_khoe, { level: 'APPROVAL', approver: 'khách', timeoutMs: 2000 });
  return f;
}
test('approval without consent or wrong actor cannot write', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0');
  const p = e.act('save').pending;
  assert.equal(e.snapshot().savedNote, null);
  assert.equal(e.approve(p.id, 'dược sĩ', true).savedNote, null);
  assert.equal(e.approve(p.id, 'khách', false).savedNote, null);
  assert.equal(e.approve(p.id, 'khách', true).savedNote.message, 'TEST_MESSAGE_0');
  assert.equal(e.snapshot().state, 'COMPLETE'); assert.equal(e.undo().savedNote, null);
});
test('AUTO save still requires explicit UI consent', () => {
  const f = fixtures(); const e = f.engine(); e.start('TEST_0');
  const p = e.act('save').pending;
  assert.equal(p.requiresApproval, false); assert.equal(e.snapshot().savedNote, null);
  assert.equal(e.approve(p.id, 'none', true).savedNote.scenarioId, 'TEST_0');
});
test('timeout and late approval never execute', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0'); const p = e.act('save').pending;
  f.setTime(3000); const expired = e.tick();
  assert.equal(expired.state, 'FAILED'); assert.equal(expired.pending, null); assert.equal(expired.notice.includes('TEST_TIMEOUT'), true);
  assert.equal(e.approve(p.id, 'khách', true).savedNote, null);
});
test('reject/cancel do not execute; consent cannot be reused in another case', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0');
  let p = e.act('save').pending; assert.equal(e.reject(p.id).savedNote, null);
  p = e.act('save').pending; assert.equal(e.reject(p.id, true).savedNote, null);
  p = e.act('save').pending; e.start('TEST_1');
  assert.equal(e.approve(p.id, 'khách', true).savedNote, null);
});
test('duplicate approval click cannot execute twice', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0'); const p = e.act('save').pending;
  e.approve(p.id, 'khách', true); const history = e.snapshot().history.length;
  e.approve(p.id, 'khách', true); assert.equal(e.snapshot().history.length, history);
});
test('reset/correction clears notes, handoff and stale approvals', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0'); const p = e.act('save').pending;
  e.approve(p.id, 'khách', true); const reset = e.reset();
  assert.equal(reset.savedNote, null); assert.equal(reset.handoff, false); assert.equal(reset.messages.length, 0);
  assert.equal(e.approve(p.id, 'khách', true).savedNote, null);
});
test('arbitrary input including keywords always uses neutral fallback', () => {
  const f = fixtures(); const e = f.engine();
  for (const value of ['TEST_UNKNOWN_INPUT', '<script>TEST</script>', 'khó thở', 'TEST_MESSAGE_0']) {
    const result = e.freeInput(value);
    assert.equal(result.scenarioId, null); assert.equal(result.messages[1].text, 'TEST_UNKNOWN');
    assert.equal(result.savedNote, null); assert.equal(result.pending, null);
  }
  assert.equal(e.requestHandoff().handoff, true);
});
test('snapshot mutation cannot forge consent or approvals', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0'); const p = e.act('save').pending;
  p.approver = 'none'; p.expiresAt = Infinity;
  assert.equal(e.approve(p.id, 'none', true).savedNote, null);
});
test('saved note remains independently removable after another mock action', () => {
  const f = approvalFixture(); const e = f.engine(); e.start('TEST_0');
  const p = e.act('save').pending; e.approve(p.id, 'khách', true);
  e.requestHandoff();
  assert.equal(e.snapshot().handoff, true); assert.equal(e.snapshot().savedNote.message, 'TEST_MESSAGE_0');
  assert.equal(e.discardNote().savedNote, null); assert.equal(e.snapshot().handoff, true);
  assert.equal(e.undo().handoff, false);
});
test('production data scripts load without executing tools at startup', () => {
  const c = load();
  for (const file of ['p1-scenarios.js', 'p2-ux.js', 'p3-autonomy.js']) vm.runInContext(fs.readFileSync(path.join(root, 'prototype/data', file), 'utf8'), c);
  const e = c.P4State.createEngine(c.P1_SCENARIOS, c.P2_UX, c.P3_AUTONOMY);
  assert.equal(e.snapshot().state, 'START'); assert.equal(e.snapshot().savedNote, null);
  assert.equal(e.snapshot().handoff, false); assert.equal(e.snapshot().pending, null);
  if (c.P1_SCENARIOS.length === 0) assert.equal(e.report.ready, false);
});
