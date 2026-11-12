const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function load() {
  const c = vm.createContext({}); c.window = c;
  for (const file of ['data/p1-scenarios.js', 'data/p2-ux.js', 'data/p3-autonomy.js', 'js/validation.js', 'js/mock-tools.js', 'js/state-machine.js']) vm.runInContext(fs.readFileSync(path.join(root, 'prototype', file), 'utf8'), c);
  return c;
}
test('14 imported cases retain IDs, priority and coverage without requiring local docs', () => {
  const c = load();
  assert.equal(c.P1_SCENARIOS.length, 14);
  assert.equal(c.P1_SOURCE.localOnly, true);
  c.P1_SCENARIOS.forEach((scenario, index) => {
    assert.equal(scenario.id, 'K' + (index + 1));
    for (const field of ['message', 'failureMode', 'expectedBehavior', 'harmReason']) assert.equal(typeof scenario[field] === 'string' && scenario[field].length > 0, true);
    assert.equal(scenario.flowId, null); assert.equal(scenario.safety, undefined);
  });
  assert.equal(JSON.stringify(c.P1_SCENARIOS.filter(s => s.isPriority).map(s => s.id)), '["K4","K8"]');
  assert.deepEqual(['source', 'ambiguity', 'authority', 'domain'].map(key => c.P1_SCENARIOS.filter(s => s.riskClass === key).length), [3, 5, 3, 3]);
});
const sourceDocument = path.join(root, load().P1_SOURCE.document);
test('optional local P1 source matches imported cells and provenance hash', { skip: !fs.existsSync(sourceDocument) }, () => {
  const c = load();
  const raw = fs.readFileSync(path.join(root, c.P1_SOURCE.document));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), c.P1_SOURCE.sha256);
  const rows = raw.toString('utf8').split(/\r?\n/).filter(line => /^\| \*\*K\d+(?: ★)?\*\* \|/.test(line));
  assert.equal(rows.length, 14); assert.equal(c.P1_SCENARIOS.length, rows.length);
  rows.forEach((row, index) => {
    const cells = row.trim().slice(1, -1).split('|').map(cell => cell.trim());
    const scenario = c.P1_SCENARIOS[index];
    assert.equal(scenario.id, cells[0].match(/K\d+/)[0]);
    assert.equal(scenario.message, cells[1]); assert.equal(scenario.failureMode, cells[3]);
    assert.equal(scenario.expectedBehavior, cells[4]); assert.equal(scenario.harmReason, cells[5]);
    assert.equal(scenario.isPriority, cells[0].includes('★'));
    assert.equal(scenario.flowId, null); assert.equal(scenario.safety, undefined);
  });
  assert.equal(JSON.stringify(c.P1_SCENARIOS.filter(s => s.isPriority).map(s => s.id)), '["K4","K8"]');
  assert.deepEqual(['source', 'ambiguity', 'authority', 'domain'].map(key => c.P1_SCENARIOS.filter(s => s.riskClass === key).length), [3, 5, 3, 3]);
});
test('five supplied autonomy levels are preserved without invented approval details', () => {
  const c = load(); const tools = c.P3_AUTONOMY.tools;
  assert.equal(tools.goi_y_san_pham.level, 'APPROVAL'); assert.equal(tools.goi_y_san_pham.approver, null);
  assert.equal(tools.goi_y_san_pham.timeoutMs, null); assert.equal(tools.goi_y_san_pham.fallback, null);
  assert.equal(tools.chuyen_duoc_si.level, 'AUTO'); assert.equal(tools.khuyen_di_kham.level, 'AUTO');
  assert.equal(tools.luu_ghi_chu_suc_khoe.level, 'FORBID'); assert.equal(tools.ban_thuoc_ke_don.level, 'FORBID');
});
test('imported cases remain viewable as P1 data without inventing P2 flows', () => {
  const c = load(); const e = c.P4State.createEngine(c.P1_SCENARIOS, c.P2_UX, c.P3_AUTONOMY);
  assert.equal(e.report.counts.scenarios, 14); assert.equal(e.report.counts.flows, 0); assert.equal(e.report.counts.declaredTools, 5);
  assert.equal(e.report.issues.some(i => i.whoMustDecide === 'P1'), false);
  assert.equal(e.report.issues.filter(i => i.whoMustDecide === 'P2' && i.scenarioId).length, 14);
  for (const scenario of c.P1_SCENARIOS) assert.equal(e.start(scenario.id).state, 'FAILED');
});
test('current FORBID on health notes cannot be bypassed by consent or approval', () => {
  const c = load();
  assert.equal(c.P4MockTools.execute('luu_ghi_chu_suc_khoe', { active: true, consent: true, now: 0, approval: { toolId: 'luu_ghi_chu_suc_khoe', actor: 'khách', expiresAt: 1000 } }, c.P3_AUTONOMY).ok, false);
});
test('incomplete product approval does not block an independently configured urgent AUTO tool', () => {
  const c = load();
  assert.equal(c.P4State.authorizeAction('khuyen_di_kham', { active: true, urgent: true }, c.P3_AUTONOMY).allowed, true);
  assert.equal(c.P4State.authorizeAction('khuyen_di_kham', { active: true }, c.P3_AUTONOMY).allowed, false);
  assert.equal(c.P4State.authorizeAction('goi_y_san_pham', { active: true, urgent: false, vulnerable: false, prescription: false, screeningComplete: true }, c.P3_AUTONOMY).allowed, false);
});
test('AUTO without a wait and unconditional FORBID require no invented timeout', () => {
  const c = load();
  assert.equal(c.P4Validation.validateTool('khuyen_di_kham', c.P3_AUTONOMY.tools.khuyen_di_kham), null);
  assert.equal(c.P4Validation.validateTool('luu_ghi_chu_suc_khoe', c.P3_AUTONOMY.tools.luu_ghi_chu_suc_khoe), null);
  assert.match(c.P4Validation.validateTool('chuyen_duoc_si', c.P3_AUTONOMY.tools.chuyen_duoc_si), /PENDING_P3/);
});
