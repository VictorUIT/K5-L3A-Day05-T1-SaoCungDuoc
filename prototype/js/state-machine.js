(function (root) {
  'use strict';
  const V = root.P4Validation;
  const clone = value => JSON.parse(JSON.stringify(value));
  const blocked = (reason, status = 'FORBID') => ({ allowed: false, status, reason });
  function authorizeAction(toolId, context = {}, autonomy = {}) {
    if (!V.TOOL_IDS.includes(toolId)) return blocked('Tool không thuộc Track T1.');
    if (toolId === 'ban_thuoc_ke_don') return blocked('Track T1 không cho phép bán thuốc kê đơn trong prototype.');
    if (V.TOOL_IDS.some(id => !V.own(autonomy.tools, id) || V.validateToolDeclaration(id, autonomy.tools[id]))) return blocked('PENDING_P3: cần mức và lý do hợp lệ cho đủ 5 tool trước khi thực thi.', 'PENDING_P3');
    const policy = V.own(autonomy.tools, toolId) ? autonomy.tools[toolId] : null;
    const error = V.validateTool(toolId, policy);
    if (error) return blocked(error, 'PENDING_P3');
    if (policy.level === 'FORBID') return blocked(policy.justification);
    if (context.active !== true) return blocked('Cần một kịch bản hợp lệ đang hoạt động.');
    if (context.urgent === true && ['goi_y_san_pham', 'chuyen_duoc_si', 'luu_ghi_chu_suc_khoe'].includes(toolId)) return blocked('Ca khẩn cấp không được trì hoãn bởi gợi ý, lưu hồ sơ hoặc hàng chờ.');
    const pharmacistReview = policy.level === 'APPROVAL' && policy.approver === 'dược sĩ' && context.pharmacistReviewed === true;
    if (toolId === 'goi_y_san_pham' && (context.urgent !== false || (context.vulnerable !== false && !pharmacistReview) || context.prescription !== false || context.screeningComplete !== true)) return blocked('Chưa có đủ sàng lọc đã xác nhận; không tự gợi ý sản phẩm.');
    if ((policy.conditionChecks || []).some(check => context[check.field] !== check.equals)) return blocked('Chưa đáp ứng điều kiện do P3 cung cấp.');
    if (toolId === 'luu_ghi_chu_suc_khoe' && context.consent !== true) return blocked('Cần đồng ý rõ ràng cho nội dung hiện tại.', 'CONSENT_REQUIRED');
    if (policy.level === 'APPROVAL') {
      const approval = context.approval;
      const validExpiry = approval && (policy.timeoutMode === 'manual' ? approval.expiresAt === null : Number.isFinite(approval.expiresAt) && Number.isFinite(context.now) && context.now < approval.expiresAt);
      if (!approval || approval.toolId !== toolId || approval.actor !== policy.approver || !validExpiry) return blocked('Cần duyệt mô phỏng hợp lệ, đúng người và còn hạn.', 'APPROVAL_REQUIRED');
    }
    return { allowed: true, status: policy.level, reason: policy.justification };
  }
  function createEngine(scenarios = [], ux = {}, autonomy = {}, now = () => Date.now()) {
    // Snapshot approved files once. Subsequent external edits cannot change a pending request.
    scenarios = clone(scenarios); ux = clone(ux); autonomy = clone(autonomy);
    const report = V.validate(scenarios, ux, autonomy);
    let serial = 0;
    let scenario = null;
    let flow = null;
    let step = null;
    let model;
    const fallback = ux.common && ux.common.unknownInput || 'Chưa đủ thông tin để tiếp tục trong bản mô phỏng. Vui lòng mô tả rõ hơn hoặc chọn chuyển dược sĩ.';
    function reset() {
      serial += 1; scenario = null; flow = null; step = null;
      model = { state: 'START', scenarioId: null, messages: [], evidenceText: '', urgentText: '', pending: null, notice: '', handoff: false, savedNote: null, lastUndo: null, history: ['START'] };
    }
    reset();
    function transition(state) { model.state = state; model.history.push(state); }
    function context(extra = {}) {
      const flags = scenario && scenario.safety || {};
      return { ...flags, active: model.messages.length > 0, urgent: model.urgentText ? true : flags.urgent, now: now(), consent: false, ...extra };
    }
    function message(role, value) { model.messages.push({ role, text: value }); }
    function enter(target) {
      step = flow.states.find(s => s.id === target);
      if (!step) { transition('FAILED'); model.notice = 'INTEGRATION_ISSUE: không có state đích.'; return; }
      transition(V.kindOf(step));
      if (V.kindOf(step) === 'URGENT') model.urgentText = step.aiText;
      model.evidenceText = step.evidenceText;
      message('assistant', step.aiText);
    }
    function start(id) {
      reset();
      const candidate = scenarios.find(s => s.id === id);
      if (!candidate || !candidate.flowId || !V.own(ux.flows, candidate.flowId) || report.issues.some(i => i.severity === 'ERROR' && ['P1', 'P2'].includes(i.whoMustDecide) && (!i.scenarioId || i.scenarioId === id))) {
        transition('FAILED'); model.notice = 'Kịch bản chưa đủ dữ liệu hợp lệ. Xem Trạng thái tích hợp.'; return snapshot();
      }
      scenario = candidate; flow = ux.flows[scenario.flowId];
      model.scenarioId = id;
      transition('ASSESSING'); message('user', scenario.message);
      // A confirmed emergency goes directly to its URGENT state, never to a queue.
      const first = scenario.safety && scenario.safety.urgent ? flow.states.find(s => V.kindOf(s) === 'URGENT') : flow.states[0];
      enter(first.id);
      return snapshot();
    }
    function freeInput(value) {
      reset(); transition('ASSESSING'); message('user', String(value).slice(0, 2000));
      transition('NEEDS_MORE_INFO'); message('assistant', fallback);
      model.evidenceText = 'Không có kịch bản P1/P2 tương ứng. Bản mô phỏng không phân tích nội dung tự do.';
      return snapshot();
    }
    function finish(toolId, next, extra) {
      const result = root.P4MockTools.execute(toolId, context(extra), autonomy);
      if (!result.ok) { model.notice = result.reason; return snapshot(); }
      model.pending = null; model.notice = 'Thao tác đã cập nhật trong bản mô phỏng; không thực thi bên ngoài.';
      if (toolId === 'chuyen_duoc_si') {
        model.handoff = true; model.lastUndo = toolId;
        model.notice = ux.common.simulatedHandoff;
      } else if (toolId === 'luu_ghi_chu_suc_khoe') {
        model.savedNote = { scenarioId: model.scenarioId, message: scenario.message };
        model.lastUndo = toolId;
        model.notice = 'Đã mô phỏng lưu đúng nội dung được đồng ý trong bộ nhớ tạm. Bạn có thể hủy.';
      }
      if (next) enter(next); else transition('COMPLETE');
      return snapshot();
    }
    function requestTool(toolId, next = null) {
      model.notice = '';
      if (model.pending) { model.notice = 'Hãy duyệt, từ chối hoặc hủy yêu cầu hiện tại trước.'; return snapshot(); }
      const verdict = authorizeAction(toolId, context(), autonomy);
      if (verdict.allowed) return finish(toolId, next, {});
      if (!['APPROVAL_REQUIRED', 'CONSENT_REQUIRED'].includes(verdict.status)) { model.notice = verdict.reason; return snapshot(); }
      const policy = autonomy.tools[toolId];
      // Consent prompt does not choose an autonomy level for P3.
      model.pending = { id: ++serial, toolId, next, previousState: model.state, approver: policy.approver, needsConsent: toolId === 'luu_ghi_chu_suc_khoe', requiresApproval: policy.level === 'APPROVAL', expiresAt: policy.level === 'APPROVAL' && policy.timeoutMode !== 'manual' ? now() + policy.timeoutMs : null, policyCopy: clone(policy), preview: scenario.message };
      transition('AWAITING_APPROVAL');
      return snapshot();
    }
    function act(actionId) {
      if (!step || model.pending) return snapshot();
      const action = step.actions.find(a => a.id === actionId);
      if (!action) { model.notice = 'Action không thuộc state hiện tại.'; return snapshot(); }
      if (model.urgentText && (V.kindOf(flow.states.find(s => s.id === action.next)) !== 'URGENT')) { model.notice = 'Cảnh báo khẩn cấp được giữ lại; không chuyển sang luồng chờ.'; return snapshot(); }
      if (action.tool) return requestTool(action.tool, action.next);
      enter(action.next); return snapshot();
    }
    function tick() {
      if (model.pending && model.pending.expiresAt !== null && now() >= model.pending.expiresAt) {
        const pending = model.pending; model.pending = null;
        transition('FAILED'); model.notice = pending.policyCopy.timeoutBehavior + '\n' + pending.policyCopy.fallback;
      }
      return snapshot();
    }
    function approve(id, actor, consent = false) {
      tick();
      const p = model.pending;
      if (!p || p.id !== id) { model.notice = 'Yêu cầu không còn hiệu lực; không có tool nào được thực thi.'; return snapshot(); }
      if (p.requiresApproval && p.approver !== actor) { model.notice = 'Người duyệt mô phỏng không khớp policy.'; return snapshot(); }
      const extra = { consent: consent === true, approval: p.requiresApproval ? { toolId: p.toolId, actor, expiresAt: p.expiresAt } : null };
      return finish(p.toolId, p.next, extra);
    }
    function reject(id, cancelled = false) {
      tick();
      const p = model.pending;
      if (!p || p.id !== id) return snapshot();
      model.pending = null; transition(p.previousState);
      model.notice = (cancelled ? 'Đã hủy yêu cầu. ' : 'Đã từ chối duyệt. ') + p.policyCopy.fallback;
      return snapshot();
    }
    function undo() {
      if (model.handoff) {
        model.handoff = false;
        model.lastUndo = model.savedNote ? 'luu_ghi_chu_suc_khoe' : null;
      } else { model.savedNote = null; model.lastUndo = null; }
      model.notice = 'Đã hủy thao tác trong bộ nhớ mô phỏng.';
      return snapshot();
    }
    function discardNote() {
      model.savedNote = null;
      if (model.lastUndo === 'luu_ghi_chu_suc_khoe') model.lastUndo = null;
      model.notice = 'Đã xóa ghi chú khỏi bộ nhớ mô phỏng.';
      return snapshot();
    }
    function snapshot() {
      return clone({ ...model, stepId: step && step.id, actions: step && !model.pending ? step.actions : [], anchors: flow ? flow.haxAnchors : [], notification: flow ? flow.notification : null });
    }
    function inspectTool(id) { return authorizeAction(id, context(), autonomy); }
    return Object.freeze({ start, freeInput, act, approve, reject, tick, undo, discardNote, reset: () => { reset(); return snapshot(); }, requestHandoff: () => requestTool('chuyen_duoc_si'), inspectTool, snapshot, report: clone(report) });
  }
  root.P4State = Object.freeze({ authorizeAction, createEngine });
})(window);
