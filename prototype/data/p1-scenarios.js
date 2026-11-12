/* PENDING_P1: P1 supplies approved scenarios; do not add invented clinical cases.
 * Required fields: id, message, riskClass, failureMode, expectedBehavior,
 * harmLevel, isPriority, evidence[], flowId. At least 8; exactly 2 priorities.
 * Proposed technical safety metadata (needs P1/P3 confirmation):
 * safety: { urgent: boolean, vulnerable: boolean, prescription: boolean,
 *           screeningComplete: boolean }
 * Missing metadata never permits product suggestions. See README integration contract.
 */
window.P1_SCENARIOS = [];
