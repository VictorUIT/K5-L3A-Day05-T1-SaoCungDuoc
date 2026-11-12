(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const scenarios = window.P1_SCENARIOS || [];
  const ux = window.P2_UX || {};
  const autonomy = window.P3_AUTONOMY || {};
  const engine = window.P4State.createEngine(scenarios, ux, autonomy);
  const report = engine.report;
  const stateLabels = { START: 'Chưa bắt đầu', ASSESSING: 'Đang xem kịch bản', NEEDS_MORE_INFO: 'Cần thêm thông tin', SAFE_INFO: 'Thông tin trong phạm vi', NEEDS_PHARMACIST: 'Cần dược sĩ', URGENT: 'Cần trợ giúp khẩn cấp', AWAITING_APPROVAL: 'Chờ duyệt mô phỏng', COMPLETE: 'Đã hoàn tất mô phỏng', FAILED: 'Chưa thể tiếp tục' };
  const toolNames = { goi_y_san_pham: 'Gợi ý sản phẩm', chuyen_duoc_si: 'Chuyển dược sĩ', khuyen_di_kham: 'Khuyến nghị đi khám', luu_ghi_chu_suc_khoe: 'Lưu ghi chú sức khỏe', ban_thuoc_ke_don: 'Bán thuốc kê đơn' };
  function element(tag, value, className) {
    const el = document.createElement(tag);
    if (value != null) el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function button(label, handler, className = 'button') {
    const el = element('button', label, className); el.type = 'button'; el.addEventListener('click', handler); return el;
  }
  function policyFor(id) { return autonomy.tools && window.P4Validation.own(autonomy.tools, id) ? autonomy.tools[id] : null; }
  function renderIntegration(model) {
    $('issue-count').textContent = String(report.issues.length);
    $('integration-summary').replaceChildren(...[
      'P1 · ' + report.counts.scenarios + '/≥8 kịch bản',
      'P2 · ' + report.counts.flows + ' flow',
      'P3 · ' + report.counts.tools + '/5 policy hợp lệ',
      report.ready ? 'Cấu trúc hợp lệ · cần nhóm xác nhận nội dung' : 'Chờ tích hợp · chưa chốt M3'
    ].map(value => element('span', value)));
    $('policy-list').replaceChildren(...window.P4Validation.TOOL_IDS.map(id => {
      const row = element('div', null, 'policy-row');
      const policy = policyFor(id);
      row.append(element('code', id), element('span', id === 'ban_thuoc_ke_don' ? 'CẤM · Track T1' : policy && !window.P4Validation.validateTool(id, policy) ? policy.level : 'PENDING_P3 · khóa'));
      return row;
    }));
    $('issue-list').replaceChildren(...report.issues.map(issue => element('li', [issue.code, issue.sourceFile, issue.scenarioId ? 'case ' + issue.scenarioId : '', issue.toolId || '', issue.conflict, 'Người quyết định: ' + issue.whoMustDecide].filter(Boolean).join(' · '))));
    if (!report.issues.length) $('issue-list').append(element('li', 'Không có lỗi cấu trúc. Không thay thế kiểm tra chuyên môn của nhóm.'));
    const anchors = model.anchors || [];
    $('anchor-list').replaceChildren(...(anchors.length ? anchors.map(a => {
      const target = Array.from(document.querySelectorAll('[data-anchor]')).find(el => el.dataset.anchor === a.targetId);
      return element('li', a.principle + ' → ' + a.targetId + ' · ' + (target && !target.closest('[hidden]') ? 'Có trên UI hiện tại' : 'Chưa hiện ở state này') + ' · ' + a.reason);
    }) : [element('li', 'PENDING_P2 · Chưa gán nguyên tắc hoặc số minh chứng khi chưa có quyết định của P2.') ]));
  }
  function renderAnchors(model) {
    document.querySelectorAll('.anchor-badge').forEach(el => el.remove());
    (model.anchors || []).forEach((anchor, index) => {
      const target = Array.from(document.querySelectorAll('[data-anchor]')).find(el => el.dataset.anchor === anchor.targetId);
      if (!target || target.closest('[hidden]')) return;
      const badge = element('span', String(index + 1), 'anchor-badge');
      badge.title = anchor.principle + ': ' + anchor.reason;
      badge.setAttribute('aria-label', 'Điểm ' + (index + 1) + ': ' + anchor.principle);
      target.prepend(badge);
    });
  }
  function render(model) {
    $('state-label').textContent = stateLabels[model.state];
    $('empty-state').hidden = model.messages.length > 0;
    $('messages').replaceChildren(...model.messages.map((message, index) => {
      const item = element('div', null, 'message ' + message.role);
      item.append(element('span', message.role === 'user' ? 'BẠN · DỮ LIỆU DỰNG' : 'AI · MÔ PHỎNG', 'message-label'), document.createTextNode(message.text));
      if (index === model.messages.length - 1 && model.stepId) item.dataset.anchor = model.stepId;
      return item;
    }));
    $('urgent-card').hidden = !model.urgentText;
    $('urgent-card').textContent = model.urgentText;
    $('evidence-card').hidden = !model.evidenceText;
    $('evidence-text').textContent = model.evidenceText;
    $('notification-text').hidden = !model.notification;
    if (model.notification) $('notification-text').textContent = (model.handoff ? 'Đã mô phỏng chuyển ca. ' : 'Thông báo dự kiến theo P2, chưa gửi. ') + 'Ai: ' + model.notification.who + ' · Khi nào: ' + model.notification.when + ' · Nội dung: ' + model.notification.what + '\nKhông thông báo người thật.';
    $('session-notice').textContent = model.notice;
    $('flow-actions').replaceChildren();
    model.actions.forEach(action => {
      const verdict = action.tool ? engine.inspectTool(action.tool) : { allowed: true };
      const policy = action.tool ? policyFor(action.tool) : null;
      if (action.tool === 'ban_thuoc_ke_don' || policy && policy.level === 'FORBID') {
        $('flow-actions').append(element('p', (toolNames[action.tool] || action.tool) + ' · Cấm: ' + verdict.reason, 'session-notice')); return;
      }
      const actionable = verdict.allowed || ['APPROVAL_REQUIRED', 'CONSENT_REQUIRED'].includes(verdict.status);
      const el = button(action.label, () => { render(engine.act(action.id)); focusResult(); });
      el.disabled = !actionable;
      if (!actionable) { el.title = verdict.reason; $('flow-actions').append(element('p', verdict.reason, 'session-notice')); }
      $('flow-actions').append(el);
    });
    $('approval-card').hidden = !model.pending;
    $('consent').checked = false;
    if (model.pending) {
      const p = model.pending;
      $('approval-title').textContent = p.requiresApproval ? 'Chờ ' + p.approver + ' duyệt (mô phỏng)' : 'Cần đồng ý lưu trong phiên';
      $('approval-description').textContent = (toolNames[p.toolId] || p.toolId) + '\nNội dung đang được xem xét: ' + p.preview + '\nCăn cứ policy: ' + p.policyCopy.justification + '\nKhi không tiếp tục: ' + p.policyCopy.fallback;
      $('consent-row').hidden = !p.needsConsent;
      $('approve').textContent = p.requiresApproval ? 'Duyệt mô phỏng · ' + p.approver : 'Đồng ý mô phỏng lưu';
      $('approve').disabled = p.needsConsent;
      updateClock(p);
    }
    $('session-controls').hidden = model.messages.length === 0;
    const handoff = engine.inspectTool('chuyen_duoc_si');
    const handoffPolicy = policyFor('chuyen_duoc_si');
    $('handoff').hidden = Boolean(model.urgentText || handoffPolicy && handoffPolicy.level === 'FORBID');
    $('handoff').disabled = Boolean(model.pending || (!handoff.allowed && handoff.status !== 'APPROVAL_REQUIRED'));
    $('handoff').title = handoff.reason || '';
    $('undo').hidden = !model.handoff;
    $('undo').textContent = 'Hủy chuyển dược sĩ mô phỏng';
    $('discard-note').hidden = !model.savedNote;
    renderAnchors(model); renderIntegration(model);
  }
  function focusResult() {
    const target = $('urgent-card').hidden ? $('session-notice') : $('urgent-card');
    if (target.textContent) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
  }
  function updateClock(pending) {
    $('approval-clock').textContent = pending.expiresAt === null ? 'Chưa đồng ý thì không lưu nội dung.' : 'Còn ' + Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000)) + ' giây · quá hạn không tự thực thi.';
  }
  if (Array.isArray(scenarios) && scenarios.length) {
    $('scenario-select').replaceChildren(...scenarios.filter(s => s && typeof s.id === 'string').map(s => {
      const option = element('option', s.id + (s.isPriority ? ' · Ưu tiên' : '')); option.value = s.id; return option;
    }));
    $('scenario-select').disabled = false; $('scenario-start').disabled = false;
    $('scenario-note').textContent = 'Chọn ID để chạy đúng kịch bản đã cung cấp; không suy diễn từ khóa.';
  }
  $('scenario-start').addEventListener('click', () => { render(engine.start($('scenario-select').value)); focusResult(); });
  $('composer').addEventListener('submit', event => {
    event.preventDefault(); const value = $('message-input').value.trim(); if (!value) return;
    render(engine.freeInput(value)); $('message-input').value = ''; $('message-input').focus();
  });
  $('reset').addEventListener('click', () => { render(engine.reset()); $('message-input').value = ''; $('message-input').focus(); });
  $('correct').addEventListener('click', () => {
    const model = engine.snapshot(); const last = [...model.messages].reverse().find(m => m.role === 'user');
    $('message-input').value = last ? last.text : ''; render(engine.reset());
    $('session-notice').textContent = 'Bạn có thể sửa tin nhắn dựng bên dưới. Việc sửa hủy yêu cầu duyệt và dữ liệu lưu tạm trước đó; tin tự do sẽ đi qua thông báo giới hạn.';
    $('message-input').focus();
  });
  $('handoff').addEventListener('click', () => { render(engine.requestHandoff()); focusResult(); });
  $('undo').addEventListener('click', () => render(engine.undo()));
  $('discard-note').addEventListener('click', () => render(engine.discardNote()));
  $('consent').addEventListener('change', () => { $('approve').disabled = !$('consent').checked; });
  $('approve').addEventListener('click', () => {
    const p = engine.snapshot().pending;
    if (p) render(engine.approve(p.id, p.approver, $('consent').checked));
    focusResult();
  });
  $('reject').addEventListener('click', () => { const p = engine.snapshot().pending; if (p) render(engine.reject(p.id)); focusResult(); });
  $('cancel-approval').addEventListener('click', () => { const p = engine.snapshot().pending; if (p) render(engine.reject(p.id, true)); focusResult(); });
  $('integration-open').addEventListener('click', () => { renderIntegration(engine.snapshot()); $('integration-dialog').showModal(); });
  $('integration-close').addEventListener('click', () => $('integration-dialog').close());
  // Tick never executes a tool. Only redraw on expiration, preserving focus/consent while waiting.
  window.setInterval(() => {
    const previous = engine.snapshot(); if (!previous.pending) return;
    const current = engine.tick(); if (!current.pending) render(current); else updateClock(current.pending);
  }, 250);
  render(engine.snapshot());
  if (report.issues.some(i => i.severity === 'ERROR')) console.error('[P4 integration]', report.issues);
  else if (report.issues.length) console.warn('[P4 integration]', report.issues);
})();
