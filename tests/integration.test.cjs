const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function load() {
  const c = vm.createContext({}); c.window = c;
  for (const file of ['data/p1-scenarios.js', 'data/p2-ux.js', 'data/p3-autonomy.js', 'js/validation.js', 'js/mock-tools.js', 'js/state-machine.js', 'js/review-workflow.js']) vm.runInContext(fs.readFileSync(path.join(root, 'prototype', file), 'utf8'), c);
  return c;
}
test('production prototype contains only K4/K8 with valid review configuration', () => {
  const c = load();
  assert.equal(JSON.stringify(c.P1_SCENARIOS.map(s => s.id)), '["K4","K8"]');
  assert.equal(c.P1_SCENARIOS.every(s => s.isPriority), true);
  assert.equal(c.P1_SOURCE.localOnly, true);
  const report = c.P4Validation.validate(c.P1_SCENARIOS, c.P2_UX, c.P3_AUTONOMY);
  assert.equal(report.ready, true, JSON.stringify(report.issues));
});
const sourceDocument = path.join(root, load().P1_SOURCE.document);
test('optional local P1 document retains exact original K4/K8 source cells', { skip: !fs.existsSync(sourceDocument) }, () => {
  const c = load(); const raw = fs.readFileSync(sourceDocument);
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), c.P1_SOURCE.sha256);
  const rows = raw.toString('utf8').split(/\r?\n/).filter(line => /^\| \*\*K(?:4|8) ★\*\* \|/.test(line));
  assert.equal(rows.length, 2);
  rows.forEach((row, index) => {
    const cells = row.trim().slice(1, -1).split('|').map(cell => cell.trim()); const scenario = c.P1_SCENARIOS[index];
    assert.equal(scenario.message, cells[1]); assert.equal(scenario.failureMode, cells[3]);
    assert.equal(scenario.expectedBehavior, cells[4]); assert.equal(scenario.harmReason, cells[5]);
  });
});
test('pharmacist is the explicit approver; saving and prescriptions remain forbidden', () => {
  const c = load(); const tools = c.P3_AUTONOMY.tools;
  assert.equal(tools.goi_y_san_pham.level, 'APPROVAL'); assert.equal(tools.goi_y_san_pham.approver, 'dược sĩ');
  assert.equal(tools.goi_y_san_pham.timeoutMode, 'manual');
  for (const id of ['luu_ghi_chu_suc_khoe', 'ban_thuoc_ke_don']) assert.equal(c.P4MockTools.execute(id, { active: true, consent: true }, c.P3_AUTONOMY).ok, false);
});
