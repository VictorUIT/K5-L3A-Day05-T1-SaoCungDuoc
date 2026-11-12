/* Two-role interaction requested by the user. Product cards are fictional UI fixtures,
 * never a medicine name, dose, price, stock claim or ordering action. */
window.P2_UX = {
  demoScope: 'priority-only',
  common: {
    unknownInput: 'Bạn có thể cập nhật thông tin sàng lọc hoặc gửi thêm lời nhắn để dược sĩ xem xét.',
    simulatedHandoff: 'Đã chuyển yêu cầu đến tab Dược sĩ trong bản mô phỏng.'
  },
  review: {
    labels: { NEEDS_MORE_INFO: 'Cần thông tin sàng lọc', AWAITING_APPROVAL: 'Đang chờ dược sĩ', MORE_INFO_REQUESTED: 'Dược sĩ cần bổ sung', APPROVED: 'Đã được duyệt', REJECTED: 'Dược sĩ đã từ chối', URGENT: 'Cần cấp cứu ngay', MEDICAL_REVIEW: 'Cần được khám kịp thời' },
    titles: { K4: 'Bố tức ngực, khó thở', K8: 'Bé sốt, chưa rõ tuổi' },
    urgentAdult: 'Tức ngực kèm khó thở cần được trợ giúp y tế khẩn cấp. Hãy gọi cấp cứu hoặc đến cơ sở cấp cứu ngay. Không chờ tư vấn qua chat.',
    urgentChild: 'Bé có dấu hiệu nguy hiểm hoặc dưới 3 tháng đang sốt 39°C. Hãy tìm trợ giúp y tế khẩn cấp ngay, không chờ dược sĩ duyệt sản phẩm.',
    medicalReview: 'Bé 3–6 tháng sốt 39°C, hoặc đã sốt từ 5 ngày, cần được cơ sở y tế đánh giá kịp thời. Không chờ duyệt sản phẩm.',
    childWarning: 'Nếu bé li bì khó đánh thức, co giật, khó thở hoặc tím tái, hãy tìm trợ giúp y tế khẩn cấp ngay.',
    askScreening: 'Mình cần biết tuổi và một số thông tin của bé trước khi chuyển đề xuất cho dược sĩ. Mình chưa gửi gợi ý sản phẩm.',
    pending: 'Dược sĩ đang xem thông tin và đề xuất. Bạn sẽ thấy kết quả tại đây sau khi xử lý.',
    changed: 'Thông tin đã thay đổi. Đề xuất trước không còn hiệu lực và cần được xem xét lại.',
    proposal: { id: 'DEMO-P01', name: 'Sản phẩm minh họa P-01', description: 'Thẻ minh họa luồng duyệt, không phải tên thuốc hoặc khuyến nghị sử dụng.', rationale: 'Khách hỏi sản phẩm cho bé đang sốt. Cần làm rõ sàng lọc và được dược sĩ kiểm tra trước khi hiển thị.', demoOnly: true },
    fields: [
      { id: 'ageBand', label: 'Tuổi của bé', options: [['under3', 'Dưới 3 tháng'], ['3to6', '3–6 tháng'], ['over6', 'Trên 6 tháng']] },
      { id: 'danger', label: 'Dấu hiệu nguy hiểm', options: [['yes', 'Có'], ['no', 'Không'], ['unknown', 'Chưa rõ']] },
      { id: 'duration', label: 'Bé đã sốt bao lâu?', options: [['under1', 'Dưới 1 ngày'], ['1to4', '1–4 ngày'], ['5plus', 'Từ 5 ngày']] },
      { id: 'medicines', label: 'Thuốc đang dùng', options: [['none', 'Không có'], ['yes', 'Có · cần làm rõ'], ['unknown', 'Chưa rõ']] },
      { id: 'allergies', label: 'Dị ứng', options: [['none', 'Không có'], ['yes', 'Có · cần làm rõ'], ['unknown', 'Chưa rõ']] },
      { id: 'conditions', label: 'Bệnh nền', options: [['none', 'Không có'], ['yes', 'Có · cần làm rõ'], ['unknown', 'Chưa rõ']] },
      { id: 'treatment', label: 'Đã dùng gì trong đợt sốt này?', options: [['none', 'Chưa dùng gì'], ['yes', 'Đã dùng · cần làm rõ'], ['unknown', 'Chưa rõ']] }
    ]
  },
  flows: {
    K4: {
      states: [{ id: 'URGENT', aiText: 'Hãy tìm trợ giúp y tế khẩn cấp ngay, không chờ tư vấn qua chat.', evidenceText: 'Người dùng nêu: bố 70 tuổi, tức ngực và khó thở.', actions: [] }],
      haxAnchors: [{ principle: 'G10', targetId: 'evidence', reason: 'Ưu tiên cảnh báo, không đưa vào hàng chờ.' }, { principle: 'G11', targetId: 'actions', reason: 'Nêu dấu hiệu từ tin nhắn làm căn cứ.' }],
      errorType: 'context', notification: { who: 'Khách hàng', when: 'Ngay khi mở ca K4', what: 'Cảnh báo tìm trợ giúp khẩn cấp; không tự gọi cấp cứu.' }
    },
    K8: {
      states: [{ id: 'NEEDS_MORE_INFO', aiText: 'Cần biết tuổi và thông tin sàng lọc của bé trước khi gửi đề xuất.', evidenceText: 'Bé sốt 39°C, chưa rõ tuổi và các yếu tố liên quan.', actions: [] }],
      haxAnchors: [{ principle: 'G10', targetId: 'evidence', reason: 'Hỏi sàng lọc trước đề xuất.' }, { principle: 'G9', targetId: 'correction', reason: 'Đổi thông tin hủy hiệu lực duyệt cũ.' }, { principle: 'G11', targetId: 'actions', reason: 'Dược sĩ xem căn cứ và đề xuất trước khi duyệt.' }],
      errorType: 'context', notification: { who: 'Dược sĩ trong bản mô phỏng', when: 'Khi khách gửi yêu cầu', what: 'Thông tin sàng lọc và đề xuất nội bộ, chưa gửi cho khách.' }
    }
  }
};
