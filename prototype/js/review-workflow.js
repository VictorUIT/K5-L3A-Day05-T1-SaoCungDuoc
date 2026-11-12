/* Shared, in-memory two-role workflow. Drafts are never in the customer projection. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function create(scenarios, ux, autonomy, now = () => Date.now()) {
    scenarios = clone(scenarios); ux = clone(ux); autonomy = clone(autonomy);
    const copy = ux.review;
    const cases = new Map();
    let serial = 0;
    function baseline(scenario) {
      const urgent = scenario.id === 'K4';
      const alertResult = urgent ? root.P4MockTools.execute('khuyen_di_kham', { active: true, urgent: true }, autonomy) : null;
      return {
        id: scenario.id, version: ++serial, status: urgent ? 'URGENT' : 'NEEDS_MORE_INFO',
        screening: Object.fromEntries(copy.fields.map(field => [field.id, ''])),
        messages: [{ role: 'user', text: scenario.message.replace(/\*\([^)]*\)\*\s*/g, '').replace(/[“”]/g, '') }, { role: 'assistant', text: urgent ? copy.urgentAdult : copy.askScreening }],
        request: null, latestReview: null, approvedProduct: null, approvedVersion: null,
        reviewNote: '', notice: '', alerts: urgent ? [copy.urgentAdult] : [], events: alertResult && alertResult.ok ? [alertResult.event] : []
      };
    }
    scenarios.forEach(s => cases.set(s.id, baseline(s)));
    function get(id) { if (!cases.has(id)) throw new Error('Kịch bản không tồn tại.'); return cases.get(id); }
    function risk(item) {
      if (item.id === 'K4' || item.screening.danger === 'yes' || item.screening.ageBand === 'under3') return 'URGENT';
      if (item.screening.ageBand === '3to6' || item.screening.duration === '5plus') return 'MEDICAL_REVIEW';
      return null;
    }
    function missing(item) {
      return copy.fields.filter(field => !item.screening[field.id] || item.screening[field.id] === 'unknown' || (['medicines', 'allergies', 'conditions', 'treatment'].includes(field.id) && item.screening[field.id] === 'yes')).map(field => field.label);
    }
    function ready(item) { return item.id === 'K8' && !risk(item) && !missing(item).length; }
    function record(item, text, role = 'assistant') { item.messages.push({ role, text }); }
    function invalidate(item) {
      const hadDecision = Boolean(item.request || item.approvedProduct || item.latestReview);
      if (item.request) item.latestReview = { ...item.request, status: 'SUPERSEDED' };
      else if (item.latestReview) item.latestReview.status = 'SUPERSEDED';
      item.request = null; item.approvedProduct = null; item.approvedVersion = null;
      item.version = ++serial;
      if (hadDecision) item.notice = copy.changed;
    }
    function assess(item) {
      const danger = risk(item);
      item.status = danger || 'NEEDS_MORE_INFO';
      if (danger) {
        const text = danger === 'URGENT' ? (item.id === 'K4' ? copy.urgentAdult : copy.urgentChild) : copy.medicalReview;
        item.alerts = [text];
        const result = root.P4MockTools.execute('khuyen_di_kham', { active: true, urgent: true }, autonomy);
        if (result.ok) item.events.push(result.event);
      } else item.alerts = [];
    }
    function updateScreening(id, fieldId, value) {
      const item = get(id);
      const field = copy.fields.find(f => f.id === fieldId);
      if (id !== 'K8' || !field || (value !== '' && !field.options.some(option => option[0] === value))) return { ok: false, error: 'Giá trị sàng lọc không hợp lệ.' };
      if (item.screening[fieldId] === value) return { ok: true };
      invalidate(item); item.screening[fieldId] = value; assess(item);
      return { ok: true };
    }
    function sendMessage(id, text) {
      const item = get(id); text = String(text).trim().slice(0, 1500);
      if (!text) return { ok: false, error: 'Nhập lời nhắn trước khi gửi.' };
      invalidate(item); record(item, text, 'user');
      // Free text is not clinical NLP. A changed context requires the explicit danger field again.
      if (id === 'K8') item.screening.danger = '';
      assess(item); if (!risk(item)) record(item, ux.common.unknownInput);
      return { ok: true };
    }
    function submit(id) {
      const item = get(id);
      if (risk(item)) return { ok: false, error: 'Cần đi khám ngay theo cảnh báo, không chờ duyệt sản phẩm.' };
      if (item.request) return { ok: false, error: 'Yêu cầu đang được dược sĩ xem xét.' };
      if (item.status === 'APPROVED' && item.approvedVersion === item.version) return { ok: false, error: 'Đề xuất này đã được duyệt.' };
      const policyError = root.P4Validation.validateTool('goi_y_san_pham', autonomy.tools && autonomy.tools.goi_y_san_pham);
      if (policyError) return { ok: false, error: policyError };
      const result = root.P4MockTools.execute('chuyen_duoc_si', { active: true, urgent: false }, autonomy);
      if (!result.ok) return { ok: false, error: result.reason };
      const policy = autonomy.tools.goi_y_san_pham;
      item.request = { id: 'REQ-' + (++serial), caseId: id, version: item.version, screening: clone(item.screening), proposal: clone(copy.proposal), createdAt: now(), expiresAt: policy.timeoutMode === 'manual' ? null : now() + policy.timeoutMs };
      item.latestReview = null; item.approvedProduct = null; item.reviewNote = ''; item.notice = '';
      item.status = 'AWAITING_APPROVAL'; item.events.push(result.event); record(item, copy.pending);
      return { ok: true, requestId: item.request.id };
    }
    function tick() {
      cases.forEach(item => {
        if (item.request && item.request.expiresAt !== null && now() >= item.request.expiresAt) {
          item.latestReview = { ...item.request, status: 'EXPIRED' }; item.request = null;
          item.status = 'REJECTED'; item.approvedProduct = null;
          item.reviewNote = 'Yêu cầu đã hết hạn. Chưa có gợi ý sản phẩm nào được gửi.';
          record(item, item.reviewNote, 'pharmacist');
        }
      });
    }
    function decide(requestId, decision, options = {}) {
      tick();
      if (options.actor !== 'pharmacist') return { ok: false, error: 'Chỉ tab Dược sĩ được xử lý yêu cầu.' };
      const item = Array.from(cases.values()).find(value => value.request && value.request.id === requestId);
      if (!item || item.request.version !== item.version || item.status !== 'AWAITING_APPROVAL') return { ok: false, error: 'Yêu cầu đã thay đổi hoặc không còn chờ duyệt.' };
      const request = item.request;
      if (decision === 'approve') {
        if (!options.reviewed || !ready(item)) return { ok: false, error: 'Cần xem đủ thông tin sàng lọc và làm rõ các mục còn thiếu trước khi duyệt.' };
        if (request.proposal.demoOnly !== true) return { ok: false, error: 'Chỉ có thẻ minh họa được cấu hình cho bản demo này.' };
        const result = root.P4MockTools.execute('goi_y_san_pham', {
          active: true, urgent: false, vulnerable: true, prescription: false,
          screeningComplete: true, pharmacistReviewed: true, now: now(),
          approval: { toolId: 'goi_y_san_pham', actor: 'dược sĩ', expiresAt: request.expiresAt }
        }, autonomy);
        if (!result.ok) return { ok: false, error: result.reason };
        item.status = 'APPROVED'; item.approvedProduct = clone(request.proposal); item.approvedVersion = item.version;
        item.events.push(result.event); record(item, 'Dược sĩ đã duyệt đề xuất. Bạn có thể xem thẻ minh họa bên dưới.', 'pharmacist');
      } else if (['reject', 'more-info'].includes(decision)) {
        const note = String(options.note || '').trim().slice(0, 1500);
        if (!note) return { ok: false, error: 'Ghi lý do hoặc thông tin cần bổ sung để khách biết bước tiếp theo.' };
        item.status = decision === 'reject' ? 'REJECTED' : 'MORE_INFO_REQUESTED';
        item.reviewNote = note; item.approvedProduct = null; item.approvedVersion = null;
        record(item, (decision === 'reject' ? 'Dược sĩ chưa duyệt đề xuất: ' : 'Dược sĩ cần bạn bổ sung: ') + note, 'pharmacist');
      } else return { ok: false, error: 'Thao tác không hợp lệ.' };
      item.latestReview = { ...request, status: item.status };
      item.request = null; item.notice = '';
      return { ok: true };
    }
    function cancel(id) {
      const item = get(id);
      if (!item.request) return { ok: false, error: 'Không có yêu cầu đang chờ.' };
      invalidate(item); assess(item); item.notice = 'Bạn đã hủy yêu cầu. Chưa gửi gợi ý sản phẩm.';
      return { ok: true };
    }
    function reset(id) { const source = scenarios.find(s => s.id === id); cases.set(id, baseline(source)); return { ok: true }; }
    function customerView(id) {
      tick(); const item = get(id);
      return clone({ id, title: copy.titles[id], version: item.version, status: item.status, statusLabel: copy.labels[item.status], messages: item.messages, screening: item.screening, alerts: item.alerts, notice: item.notice, reviewNote: item.reviewNote, waiting: Boolean(item.request), missing: missing(item), product: item.status === 'APPROVED' && item.approvedVersion === item.version ? item.approvedProduct : null });
    }
    function pharmacistView(id) {
      tick(); const item = get(id);
      return clone({ ...customerView(id), request: item.request, lastReview: item.latestReview, approvalReady: ready(item), events: item.events });
    }
    function queue() {
      tick();
      return Array.from(cases.values()).filter(item => item.request || item.latestReview || item.id === 'K4').map(item => ({ id: item.id, title: copy.titles[item.id], status: item.status, statusLabel: copy.labels[item.status], waiting: Boolean(item.request) }));
    }
    return Object.freeze({ updateScreening, sendMessage, submit, decide, cancel, reset, customerView, pharmacistView, queue, tick });
  }
  root.P4Review = Object.freeze({ create });
})(window);
