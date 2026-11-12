/* PENDING_P3: all five tool policies, conditions, approver and timeout/fallback.
 * Tool: { level:'AUTO|APPROVAL|FORBID', justification, conditions:[], approver,
 *         timeoutBehavior, fallback }
 * Proposed executable contract (needs P3 confirmation):
 * conditionChecks: [{ field:'screeningComplete', equals:true }] -- one per condition.
 * Supported fields: urgent, vulnerable, prescription, screeningComplete.
 * APPROVAL also needs timeoutMs > 0. No default timeout or AUTO policy is invented.
 * No eval(), executable strings, implicit clinical inference, network or persistence.
 */
window.P3_AUTONOMY = { tools: {} };
