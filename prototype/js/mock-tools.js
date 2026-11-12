/* Pure mock results. No endpoint, storage, payment, prescription or real handoff. */
(function (root) {
  'use strict';
  function execute(toolId, context, autonomy) {
    // Guard the adapter too: calling it directly must not bypass authorization.
    const verdict = root.P4State.authorizeAction(toolId, context, autonomy);
    if (!verdict.allowed) return { ok: false, status: verdict.status, reason: verdict.reason };
    return { ok: true, event: { toolId, simulated: true } };
  }
  root.P4MockTools = Object.freeze({ execute });
})(window);
