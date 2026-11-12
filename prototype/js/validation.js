/* Structural validation only. Clinical content still requires P1/P2/P3 review. */
(function (root) {
  'use strict';
  const TOOL_IDS = Object.freeze(['goi_y_san_pham', 'chuyen_duoc_si', 'khuyen_di_kham', 'luu_ghi_chu_suc_khoe', 'ban_thuoc_ke_don']);
  const STATES = Object.freeze(['START', 'ASSESSING', 'NEEDS_MORE_INFO', 'SAFE_INFO', 'NEEDS_PHARMACIST', 'URGENT', 'AWAITING_APPROVAL', 'COMPLETE', 'FAILED']);
  const SAFETY_FIELDS = Object.freeze(['urgent', 'vulnerable', 'prescription', 'screeningComplete']);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const own = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value != null && typeof value === 'object' && !Array.isArray(value);
  const kindOf = state => state && (state.kind || state.id);
  function validateToolDeclaration(id, policy) {
    if (!TOOL_IDS.includes(id)) return 'Tool không có trong Track T1.';
    if (!record(policy)) return 'PENDING_P3: chưa có policy.';
    if (!['AUTO', 'APPROVAL', 'FORBID'].includes(policy.level)) return 'Mức tự chủ không hợp lệ.';
    if (!text(policy.justification)) return 'Thiếu lý do cost-of-error.';
    if (id === 'ban_thuoc_ke_don' && policy.level !== 'FORBID') return 'Xung đột Track T1: bán thuốc kê đơn luôn bị cấm.';
    return null;
  }
  function validateTool(id, policy) {
    const declarationError = validateToolDeclaration(id, policy);
    if (declarationError) return declarationError;
    // FORBID has no approval path and therefore needs no fictitious timeout/approver.
    if (policy.level === 'FORBID') return null;
    if (policy.conditions == null) return 'PENDING_P3: chưa có điều kiện thực thi.';
    if (!Array.isArray(policy.conditions) || policy.conditions.some(c => !text(c))) return 'conditions phải là danh sách điều kiện có nội dung.';
    if (policy.approver == null) return 'PENDING_P3: chưa chỉ định người duyệt.';
    if (!['none', 'khách', 'dược sĩ'].includes(policy.approver)) return 'approver phải là none, khách hoặc dược sĩ.';
    if (policy.level === 'AUTO' && policy.approver !== 'none') return 'AUTO không được ngầm bỏ qua người duyệt.';
    if (policy.level === 'APPROVAL' && (policy.timeoutMs == null || !text(policy.timeoutBehavior) || !text(policy.fallback))) return 'PENDING_P3: chưa có thời hạn duyệt, timeoutBehavior hoặc fallback.';
    if (policy.level === 'APPROVAL' && (policy.approver === 'none' || !Number.isSafeInteger(policy.timeoutMs) || policy.timeoutMs <= 0)) return 'APPROVAL cần người duyệt và timeoutMs dương do P3 cung cấp.';
    if (policy.conditions.length && policy.conditionChecks == null) return 'PENDING_P3: chưa có mapping điều kiện thực thi.';
    const checks = policy.conditionChecks || [];
    if (!Array.isArray(checks) || checks.length !== policy.conditions.length || checks.some(c => !record(c) || !SAFETY_FIELDS.includes(c.field) || typeof c.equals !== 'boolean')) return 'Điều kiện chưa có conditionChecks tương ứng; không thể tự suy diễn để cho phép.';
    return null;
  }
  function validate(scenarios, ux, autonomy) {
    const issues = [];
    function issue(owner, conflict, scenarioId = null, toolId = null, severity = 'ERROR') {
      const sourceFile = { P1: 'prototype/data/p1-scenarios.js', P2: 'prototype/data/p2-ux.js', P3: 'prototype/data/p3-autonomy.js' }[owner];
      issues.push({ code: severity === 'PENDING' ? 'PENDING_' + owner : 'INTEGRATION_ISSUE', sourceFile, scenarioId, toolId, conflict, whoMustDecide: owner, severity });
    }
    const cases = Array.isArray(scenarios) ? scenarios : [];
    if (!Array.isArray(scenarios)) issue('P1', 'P1_SCENARIOS phải là một mảng.');
    if (cases.length < 8) issue('P1', 'Cần ít nhất 8 kịch bản; hiện có ' + cases.length + '.', null, null, 'PENDING');
    if (cases.filter(s => s && s.isPriority === true).length !== 2) issue('P1', 'Cần đúng 2 ca ưu tiên do P1 chốt.', null, null, 'PENDING');
    const classes = new Set(cases.map(s => s && s.riskClass));
    ['source', 'ambiguity', 'authority', 'domain'].forEach(c => { if (!classes.has(c)) issue('P1', 'Chưa có kịch bản lớp ' + c + '.', null, null, 'PENDING'); });
    const flows = record(ux) && record(ux.flows) ? ux.flows : {};
    if (!Object.keys(flows).length) issue('P2', 'Chưa có flows, lời thoại, notification và điểm neo HAX/PAIR.', null, null, 'PENDING');
    ['unknownInput', 'simulatedHandoff'].forEach(key => { if (!text(ux && ux.common && ux.common[key])) issue('P2', 'Thiếu common.' + key + '.'); });
    const tools = record(autonomy) && record(autonomy.tools) ? autonomy.tools : {};
    TOOL_IDS.forEach(id => {
      const policy = own(tools, id) ? tools[id] : null;
      const error = validateTool(id, policy);
      if (error) issue('P3', error, null, id, error.startsWith('PENDING_P3') ? 'PENDING' : 'ERROR');
    });
    Object.keys(tools).filter(id => !TOOL_IDS.includes(id)).forEach(id => issue('P3', 'Tool ngoài Track T1 chưa được hỗ trợ.', null, id));
    const ids = new Set();
    cases.forEach(s => {
      if (!record(s) || !text(s.id)) { issue('P1', 'Kịch bản thiếu id hoặc sai cấu trúc.'); return; }
      if (ids.has(s.id)) issue('P1', 'Trùng id kịch bản.', s.id);
      ids.add(s.id);
      ['message', 'failureMode', 'expectedBehavior'].forEach(key => { if (!text(s[key])) issue('P1', 'Thiếu ' + key + '.', s.id); });
      if (!['source', 'ambiguity', 'authority', 'domain'].includes(s.riskClass)) issue('P1', 'riskClass không hợp lệ.', s.id);
      if (!['minor', 'recoverable', 'unacceptable'].includes(s.harmLevel)) issue('P1', 'harmLevel không hợp lệ.', s.id);
      if (typeof s.isPriority !== 'boolean') issue('P1', 'Thiếu isPriority dạng boolean.', s.id);
      if (!Array.isArray(s.evidence) || !s.evidence.length || s.evidence.some(e => !text(e))) issue('P1', 'Thiếu evidence cụ thể.', s.id);
      if (s.safety != null && (!record(s.safety) || SAFETY_FIELDS.some(f => typeof s.safety[f] !== 'boolean'))) issue('P1', 'safety cần đủ 4 trường boolean; không dùng giá trị suy đoán.', s.id);
      if (!text(s.flowId)) { issue('P2', 'Chưa có mapping flowId cho kịch bản đã nhận.', s.id, null, 'PENDING'); return; }
      if (!own(flows, s.flowId)) { issue('P2', 'flowId không có trong P2_UX.flows.', s.id, null, Object.keys(flows).length ? 'ERROR' : 'PENDING'); return; }
      const flow = flows[s.flowId];
      if (!record(flow) || !Array.isArray(flow.states) || !flow.states.length) { issue('P2', 'Flow cần ít nhất một state.', s.id); return; }
      const stateIds = new Set();
      flow.states.forEach(state => {
        if (!record(state) || !text(state.id)) { issue('P2', 'State thiếu id.', s.id); return; }
        if (stateIds.has(state.id)) issue('P2', 'Trùng state.id: ' + state.id, s.id);
        stateIds.add(state.id);
        if (!STATES.includes(kindOf(state)) || ['START', 'ASSESSING', 'AWAITING_APPROVAL'].includes(kindOf(state))) issue('P2', 'State cần kind hợp lệ (không dùng trạng thái nội bộ): ' + state.id, s.id);
        if (!text(state.aiText) || !text(state.evidenceText)) issue('P2', 'Thiếu aiText/evidenceText tại ' + state.id, s.id);
        if (!Array.isArray(state.actions)) issue('P2', 'State.actions phải là một mảng.', s.id);
      });
      flow.states.forEach(state => {
        const actionIds = new Set();
        (Array.isArray(state && state.actions) ? state.actions : []).forEach(a => {
          if (!record(a)) { issue('P2', 'Action sai cấu trúc.', s.id); return; }
          if (!text(a.id) || actionIds.has(a.id)) issue('P2', 'Action thiếu/trùng id.', s.id);
          actionIds.add(a.id);
          if (!text(a.label) || !stateIds.has(a.next)) issue('P2', 'Action thiếu label hoặc next không tồn tại.', s.id, a.tool || null);
          if (a.tool != null && !TOOL_IDS.includes(a.tool)) issue('P2', 'Action tham chiếu tool ngoài Track T1.', s.id, a.tool);
          if (a.tool != null && !own(tools, a.tool)) issue('P3', 'Action chưa có policy tương ứng.', s.id, a.tool, 'PENDING');
          if (kindOf(state) === 'URGENT' && (a.tool === 'chuyen_duoc_si' || a.tool === 'goi_y_san_pham')) issue('P2', 'Ca khẩn cấp không được đặt vào hàng chờ/gợi ý sản phẩm.', s.id, a.tool);
        });
      });
      if (s.safety && s.safety.urgent === true && !flow.states.some(st => kindOf(st) === 'URGENT')) issue('P2', 'Ca urgent cần state URGENT có lời thoại đã xác nhận.', s.id);
      if (!['system', 'user', 'context'].includes(flow.errorType)) issue('P2', 'Thiếu errorType hệ thống/người dùng/ngữ cảnh.', s.id);
      if (!record(flow.notification) || ['who', 'when', 'what'].some(k => !text(flow.notification[k]))) issue('P2', 'Thiếu notification.who/when/what.', s.id);
      if (!Array.isArray(flow.haxAnchors) || flow.haxAnchors.length < 2 || flow.haxAnchors.length > 3) issue('P2', 'Cần 2–3 điểm neo HAX/PAIR cho flow.', s.id);
      const targets = new Set(['evidence', 'actions', 'correction', ...stateIds]);
      (Array.isArray(flow.haxAnchors) ? flow.haxAnchors : []).forEach(a => {
        if (!record(a) || !text(a.principle) || !text(a.reason) || !targets.has(a.targetId)) issue('P2', 'HAX/PAIR thiếu nội dung hoặc targetId không có điểm neo UI.', s.id);
      });
    });
    return { ready: issues.length === 0, issues, counts: { scenarios: cases.length, flows: Object.keys(flows).length, declaredTools: TOOL_IDS.filter(id => own(tools, id) && !validateToolDeclaration(id, tools[id])).length, tools: TOOL_IDS.filter(id => own(tools, id) && !validateTool(id, tools[id])).length } };
  }
  root.P4Validation = Object.freeze({ TOOL_IDS, STATES, SAFETY_FIELDS, validate, validateTool, validateToolDeclaration, kindOf, own });
})(window);
