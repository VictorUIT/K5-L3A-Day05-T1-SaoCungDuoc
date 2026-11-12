const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup(changePolicy) {
  const c = vm.createContext({}); c.window = c;
  for (const file of ['data/p1-scenarios.js', 'data/p2-ux.js', 'data/p3-autonomy.js', 'js/validation.js', 'js/mock-tools.js', 'js/state-machine.js', 'js/review-workflow.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../prototype', file), 'utf8'), c);
  if (changePolicy) changePolicy(c.P3_AUTONOMY);
  let time = 1000;
  const workflow = c.P4Review.create(c.P1_SCENARIOS, c.P2_UX, c.P3_AUTONOMY, () => time);
  return { workflow, c, setTime: value => { time = value; } };
}
function complete(w) {
  for (const [key, value] of Object.entries({ ageBand: 'over6', danger: 'no', duration: 'under1', medicines: 'none', allergies: 'none', conditions: 'none', treatment: 'none' })) assert.equal(w.updateScreening('K8', key, value).ok, true);
}
const pharmacist = { actor: 'pharmacist', reviewed: true };
test('K4 warns immediately and cannot enter a review queue or reveal a product', () => {
  const { workflow: w } = setup();
  assert.equal(w.customerView('K4').status, 'URGENT'); assert.ok(w.customerView('K4').alerts.length);
  assert.equal(w.submit('K4').ok, false); assert.equal(w.pharmacistView('K4').request, null);
  assert.equal(w.customerView('K4').product, null);
  assert.ok(w.pharmacistView('K4').events.some(e => e.toolId === 'khuyen_di_kham'));
});
test('incomplete K8 can reach pharmacist for clarification, but cannot be approved', () => {
  const { workflow: w } = setup(); const result = w.submit('K8');
  assert.equal(result.ok, true); assert.equal(w.customerView('K8').status, 'AWAITING_APPROVAL');
  assert.equal(w.customerView('K8').product, null);
  assert.equal('proposal' in w.customerView('K8'), false); assert.equal('request' in w.customerView('K8'), false);
  assert.equal(w.pharmacistView('K8').request.proposal.demoOnly, true);
  assert.equal(w.decide(result.requestId, 'approve', pharmacist).ok, false);
});
test('only a pharmacist who reviewed complete screening can release the demo card', () => {
  const { workflow: w } = setup(); complete(w); const { requestId } = w.submit('K8');
  assert.equal(w.decide(requestId, 'approve', { actor: 'customer', reviewed: true }).ok, false);
  assert.equal(w.decide(requestId, 'approve', { actor: 'pharmacist', reviewed: false }).ok, false);
  assert.equal(w.customerView('K8').product, null);
  assert.equal(w.decide(requestId, 'approve', pharmacist).ok, true);
  assert.equal(w.customerView('K8').status, 'APPROVED'); assert.equal(w.customerView('K8').product.demoOnly, true);
  assert.equal(w.decide(requestId, 'approve', pharmacist).ok, false);
  assert.equal(w.pharmacistView('K8').events.filter(e => e.toolId === 'goi_y_san_pham').length, 1);
});
test('rejection requires a reason and never releases the draft', () => {
  const { workflow: w } = setup(); complete(w); const { requestId } = w.submit('K8');
  assert.equal(w.decide(requestId, 'reject', pharmacist).ok, false);
  assert.equal(w.decide(requestId, 'reject', { ...pharmacist, note: 'TEST_REJECT_REASON' }).ok, true);
  assert.equal(w.customerView('K8').status, 'REJECTED'); assert.equal(w.customerView('K8').product, null);
  assert.ok(w.customerView('K8').messages.some(m => m.role === 'pharmacist' && m.text.includes('TEST_REJECT_REASON')));
});
test('request-more-info syncs to customer and requires a fresh review after resubmission', () => {
  const { workflow: w } = setup(); const first = w.submit('K8');
  assert.equal(w.decide(first.requestId, 'more-info', { ...pharmacist, note: 'TEST_NEED_AGE' }).ok, true);
  assert.equal(w.customerView('K8').status, 'MORE_INFO_REQUESTED'); assert.equal(w.customerView('K8').reviewNote, 'TEST_NEED_AGE');
  complete(w); const second = w.submit('K8'); assert.notEqual(second.requestId, first.requestId);
  assert.equal(w.decide(first.requestId, 'approve', pharmacist).ok, false);
  assert.equal(w.decide(second.requestId, 'approve', pharmacist).ok, true);
});
test('any screening correction immediately hides an approved card and invalidates approval', () => {
  const { workflow: w } = setup(); complete(w); const first = w.submit('K8'); w.decide(first.requestId, 'approve', pharmacist);
  w.updateScreening('K8', 'duration', '1to4');
  assert.equal(w.customerView('K8').product, null); assert.equal(w.customerView('K8').status, 'NEEDS_MORE_INFO');
  assert.equal(w.decide(first.requestId, 'approve', pharmacist).ok, false);
  assert.equal(w.pharmacistView('K8').lastReview.status, 'SUPERSEDED');
});
test('pending screening edits and cancellation revoke the stale request token', () => {
  const { workflow: w } = setup(); complete(w); const first = w.submit('K8');
  w.updateScreening('K8', 'allergies', 'unknown'); assert.equal(w.pharmacistView('K8').request, null);
  assert.equal(w.decide(first.requestId, 'approve', pharmacist).ok, false);
  w.updateScreening('K8', 'allergies', 'none'); const second = w.submit('K8');
  w.cancel('K8'); assert.equal(w.decide(second.requestId, 'approve', pharmacist).ok, false);
});
test('under-3-months or explicit danger overrides all pending/approved product states', () => {
  for (const [field, value] of [['ageBand', 'under3'], ['danger', 'yes']]) {
    const { workflow: w } = setup(); complete(w); const first = w.submit('K8'); w.decide(first.requestId, 'approve', pharmacist);
    w.updateScreening('K8', field, value);
    assert.equal(w.customerView('K8').status, 'URGENT'); assert.equal(w.customerView('K8').product, null);
    assert.equal(w.submit('K8').ok, false); assert.equal(w.pharmacistView('K8').request, null);
  }
});
test('3-to-6-month fever and prolonged fever request medical assessment without a product queue', () => {
  for (const [field, value] of [['ageBand', '3to6'], ['duration', '5plus']]) {
    const { workflow: w } = setup(); complete(w); w.updateScreening('K8', field, value);
    assert.equal(w.customerView('K8').status, 'MEDICAL_REVIEW'); assert.equal(w.submit('K8').ok, false);
    assert.equal(w.customerView('K8').product, null);
  }
});
test('unknown or unresolved medicines/allergies/conditions/treatment never count as clear screening', () => {
  for (const key of ['medicines', 'allergies', 'conditions', 'treatment']) {
    const { workflow: w } = setup(); complete(w); w.updateScreening('K8', key, 'yes');
    const result = w.submit('K8'); assert.equal(w.decide(result.requestId, 'approve', pharmacist).ok, false);
  }
});
test('new free-text context revokes a card and requires explicit danger screening again', () => {
  const { workflow: w } = setup(); complete(w); const first = w.submit('K8'); w.decide(first.requestId, 'approve', pharmacist);
  w.sendMessage('K8', '<img src=x> TEST_CONTEXT');
  assert.equal(w.customerView('K8').product, null); assert.equal(w.customerView('K8').screening.danger, '');
  assert.equal(w.customerView('K8').status, 'NEEDS_MORE_INFO');
});
test('manual requests never auto-approve; timed requests expire without publishing', () => {
  const manual = setup(); complete(manual.workflow); manual.workflow.submit('K8'); manual.setTime(1e12); manual.workflow.tick();
  assert.equal(manual.workflow.customerView('K8').status, 'AWAITING_APPROVAL');
  assert.equal(manual.workflow.customerView('K8').product, null);
  const timed = setup(p => { p.tools.goi_y_san_pham.timeoutMode = 'timed'; p.tools.goi_y_san_pham.timeoutMs = 2000; });
  complete(timed.workflow); const first = timed.workflow.submit('K8'); timed.setTime(3000); timed.workflow.tick();
  assert.equal(timed.workflow.decide(first.requestId, 'approve', pharmacist).ok, false);
  assert.equal(timed.workflow.customerView('K8').product, null);
});
test('snapshots cannot forge a draft, screening state or approval', () => {
  const { workflow: w } = setup(); const first = w.submit('K8'); const view = w.pharmacistView('K8');
  view.request.proposal.demoOnly = false; view.screening.ageBand = 'over6'; view.approvalReady = true;
  assert.equal(w.decide(first.requestId, 'approve', pharmacist).ok, false); assert.equal(w.customerView('K8').product, null);
});
test('reset preserves case isolation and invalidates old decisions', () => {
  const { workflow: w } = setup(); complete(w); const first = w.submit('K8'); w.reset('K8');
  assert.equal(w.decide(first.requestId, 'approve', pharmacist).ok, false);
  assert.equal(w.customerView('K4').status, 'URGENT'); assert.equal(w.customerView('K8').product, null);
});
test('policy FORBID cannot be bypassed by the pharmacist workflow', () => {
  const { workflow: w } = setup(p => { p.tools.goi_y_san_pham.level = 'FORBID'; });
  complete(w); const first = w.submit('K8');
  assert.equal(w.decide(first.requestId, 'approve', pharmacist).ok, false); assert.equal(w.customerView('K8').product, null);
});
