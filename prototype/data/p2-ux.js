/* PENDING_P2: flows, exact UI copy, states, notifications and 2–3 HAX/PAIR anchors.
 * State: { id, kind?, aiText, evidenceText, actions: [{id,label,next,tool:null}] }
 * kind is a state-machine name; omit it when id already equals that name.
 * Flow: { states: [...], haxAnchors: [{principle,targetId,reason}],
 *         errorType: 'system|user|context', notification: {who,when,what} }
 * Anchor targets available: evidence, actions, correction; state IDs also render anchors.
 * No clinical copy is supplied by P4. These two neutral fallbacks come from AGENTS.md.
 */
window.P2_UX = {
  flows: {},
  common: {
    unknownInput: 'Chưa đủ thông tin để tiếp tục trong bản mô phỏng. Vui lòng mô tả rõ hơn hoặc chọn chuyển dược sĩ.',
    simulatedHandoff: 'Yêu cầu chuyển dược sĩ đã được ghi nhận trong bản mô phỏng; chưa kết nối nhân viên thật.'
  }
};
