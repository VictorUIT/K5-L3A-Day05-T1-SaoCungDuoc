(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const scenarios = window.P1_SCENARIOS;
  const ux = window.P2_UX;
  const workflow = window.P4Review.create(scenarios, ux, window.P3_AUTONOMY);
  const report = window.P4Validation.validate(scenarios, ux, window.P3_AUTONOMY);
  if (!report.ready) console.error('[integration]', report.issues);
  let activeCase = 'K8';
  let role = 'customer';
  let shownRequest = null;
  let customerError = '';
  let decisionError = '';
  let renderedSignature = '';
  function signature() { return workflow.customerView(activeCase).status + JSON.stringify(workflow.queue()); }
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const setStatus = (id, view) => { $(id).textContent = view.statusLabel; $(id).dataset.state = view.status; };
  function selectCase(id) { activeCase = id; customerError = ''; decisionError = ''; render(); }
  function selectRole(next, focus = false) {
    role = next; render();
    if (focus) $(role === 'customer' ? 'customer-tab' : 'pharmacist-tab').focus();
  }
  const caseButtons = scenarios.map(scenario => {
    const el = node('button', null, 'case-option'); el.type = 'button'; el.dataset.caseId = scenario.id;
    el.append(node('small', scenario.id === 'K4' ? 'K4 · KHẨN CẤP' : 'K8 · CẦN SÀNG LỌC'), node('strong', ux.review.titles[scenario.id]));
    el.addEventListener('click', () => selectCase(scenario.id)); return el;
  });
  $('case-list').append(...caseButtons);
  ux.review.fields.forEach(field => {
    const wrap = node('div', null, 'field'); const label = node('label', field.label); label.htmlFor = 'field-' + field.id;
    const input = node('select'); input.id = 'field-' + field.id; input.name = field.id;
    const blank = node('option', 'Chọn thông tin'); blank.value = ''; input.append(blank);
    field.options.forEach(([value, text]) => { const option = node('option', text); option.value = value; input.append(option); });
    input.addEventListener('change', () => {
      const result = workflow.updateScreening(activeCase, field.id, input.value);
      customerError = result.ok ? '' : result.error; decisionError = ''; render();
    });
    wrap.append(label, input); $('screening-fields').append(wrap);
  });
  function renderCustomer() {
    const view = workflow.customerView(activeCase);
    setStatus('customer-status', view);
    $('urgent-alert').hidden = !view.alerts.length;
    $('urgent-alert').textContent = view.alerts.join('\n');
    $('child-warning').hidden = activeCase !== 'K8' || view.alerts.length > 0;
    $('child-warning').textContent = ux.review.childWarning;
    $('messages').replaceChildren(...view.messages.map(message => {
      const el = node('div', null, 'message ' + message.role);
      el.append(node('span', { user: 'BẠN', assistant: 'AI · MÔ PHỎNG', pharmacist: 'DƯỢC SĨ · MÔ PHỎNG' }[message.role], 'message-label'), document.createTextNode(message.text));
      return el;
    }));
    $('screening-section').hidden = activeCase !== 'K8';
    ux.review.fields.forEach(field => { $('field-' + field.id).value = view.screening[field.id]; });
    $('customer-notice').textContent = customerError || view.notice;
    $('send-review').disabled = Boolean(view.waiting || view.alerts.length || view.status === 'APPROVED');
    $('send-review').textContent = view.waiting ? 'Đang chờ dược sĩ' : view.status === 'APPROVED' ? 'Đề xuất đã được duyệt' : 'Gửi dược sĩ xem xét →';
    $('cancel-review').hidden = !view.waiting;
    // Only the approved projection may populate the customer product DOM.
    $('product-card').hidden = !view.product;
    $('product-name').textContent = view.product ? view.product.name : '';
    $('product-description').textContent = view.product ? view.product.description : '';
  }
  function screeningRows(view) {
    const rows = [{ label: 'Người dùng thuốc', value: activeCase === 'K4' ? 'Bố · 70 tuổi' : 'Bé · sốt 39°C' }];
    ux.review.fields.forEach(field => {
      const value = view.screening[field.id]; const option = field.options.find(item => item[0] === value);
      rows.push({ label: field.label, value: activeCase === 'K4' && field.id === 'ageBand' ? '70 tuổi' : activeCase === 'K4' && field.id === 'danger' ? 'Tức ngực, khó thở' : option ? option[1] : 'Chưa cung cấp', missing: !value || value === 'unknown' });
    });
    rows.push({ label: 'Lời khách hàng', value: view.messages.filter(message => message.role === 'user').map(message => message.text).join('\n') });
    return rows;
  }
  function updateDecisionButtons(view) {
    const pending = Boolean(view.request);
    $('review-confirm').disabled = !pending || !view.approvalReady;
    $('approve').disabled = !pending || !view.approvalReady || !$('review-confirm').checked;
    const hasNote = $('review-note').value.trim().length > 0;
    $('reject').disabled = !pending || !hasNote;
    $('request-info').disabled = !pending || !hasNote;
  }
  function renderPharmacist() {
    const view = workflow.pharmacistView(activeCase);
    const queue = workflow.queue();
    setStatus('pharmacist-status', view);
    $('queue-summary').textContent = queue.filter(item => item.waiting).length + ' đề xuất đang chờ';
    $('review-queue').replaceChildren(...queue.map(item => {
      const button = node('button', null, 'queue-item'); button.type = 'button'; button.dataset.queueCase = item.id;
      button.setAttribute('aria-pressed', String(item.id === activeCase));
      const label = node('span', item.statusLabel, 'status-pill'); label.dataset.state = item.status;
      button.append(node('strong', item.id + ' · ' + item.title), label);
      button.addEventListener('click', () => selectCase(item.id)); return button;
    }));
    $('pharmacist-alert').hidden = !view.alerts.length;
    $('pharmacist-alert').textContent = view.alerts.join('\n') + (view.alerts.length ? '\nLời khách: ' + view.messages.filter(message => message.role === 'user').map(message => message.text).join('\n') + '\nCảnh báo đã hiện ở màn hình khách hàng; không xếp vào hàng chờ duyệt.' : '');
    const review = view.request || view.lastReview;
    const hasDetail = Boolean(review && review.status !== 'SUPERSEDED' && !view.alerts.length);
    $('review-empty').hidden = hasDetail || view.alerts.length > 0;
    $('review-detail').hidden = !hasDetail;
    if (!hasDetail) { shownRequest = null; $('review-confirm').checked = false; return; }
    if (shownRequest !== review.id) { $('review-note').value = ''; $('review-confirm').checked = false; decisionError = ''; shownRequest = review.id; }
    $('request-id').textContent = review.id;
    $('review-case-title').textContent = view.title;
    setStatus('review-status', view);
    $('screening-summary').replaceChildren(...screeningRows(view).map(row => {
      const el = node('div'); el.append(node('dt', row.label), node('dd', row.value, row.missing ? 'missing' : '')); return el;
    }));
    $('draft-heading').textContent = review.proposal.name;
    $('draft-description').textContent = review.proposal.description;
    $('draft-rationale').textContent = review.proposal.rationale;
    $('review-missing').textContent = view.request && !view.approvalReady ? 'Cần làm rõ trước khi duyệt: ' + view.missing.join(', ') + '.' : view.reviewNote;
    $('decision-form').hidden = !view.request;
    $('decision-notice').textContent = decisionError;
    updateDecisionButtons(view);
  }
  function render() {
    const queue = workflow.queue();
    $('pending-count').textContent = String(queue.filter(item => item.waiting).length);
    caseButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.caseId === activeCase)));
    $('customer-view').hidden = role !== 'customer'; $('pharmacist-view').hidden = role !== 'pharmacist';
    for (const name of ['customer', 'pharmacist']) {
      const tab = $(name + '-tab'); tab.setAttribute('aria-selected', String(role === name)); tab.tabIndex = role === name ? 0 : -1;
    }
    // Clear/update the customer product projection even while another role is active.
    renderCustomer(); if (role === 'pharmacist') renderPharmacist();
    renderedSignature = signature();
  }
  $('customer-tab').addEventListener('click', () => selectRole('customer'));
  $('pharmacist-tab').addEventListener('click', () => selectRole('pharmacist'));
  $('role-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); selectRole(event.key === 'Home' ? 'customer' : event.key === 'End' ? 'pharmacist' : role === 'customer' ? 'pharmacist' : 'customer', true);
  });
  $('screening-form').addEventListener('submit', event => event.preventDefault());
  $('decision-form').addEventListener('submit', event => event.preventDefault());
  $('send-review').addEventListener('click', () => { const result = workflow.submit(activeCase); customerError = result.ok ? '' : result.error; render(); });
  $('cancel-review').addEventListener('click', () => { const result = workflow.cancel(activeCase); customerError = result.ok ? '' : result.error; render(); });
  $('reset-case').addEventListener('click', () => { workflow.reset(activeCase); customerError = ''; decisionError = ''; shownRequest = null; render(); });
  $('composer').addEventListener('submit', event => {
    event.preventDefault(); const result = workflow.sendMessage(activeCase, $('message-input').value);
    customerError = result.ok ? '' : result.error; if (result.ok) $('message-input').value = ''; render(); $('message-input').focus();
  });
  $('review-note').addEventListener('input', () => updateDecisionButtons(workflow.pharmacistView(activeCase)));
  $('review-confirm').addEventListener('change', () => updateDecisionButtons(workflow.pharmacistView(activeCase)));
  function decide(decision) {
    const request = workflow.pharmacistView(activeCase).request; if (!request) return;
    const result = workflow.decide(request.id, decision, { actor: 'pharmacist', reviewed: $('review-confirm').checked, note: $('review-note').value });
    decisionError = result.ok ? '' : result.error; render();
  }
  $('approve').addEventListener('click', () => decide('approve'));
  $('reject').addEventListener('click', () => decide('reject'));
  $('request-info').addEventListener('click', () => decide('more-info'));
  render();
  window.setInterval(() => {
    workflow.tick();
    if (signature() !== renderedSignature) render();
  }, 1000);
})();
