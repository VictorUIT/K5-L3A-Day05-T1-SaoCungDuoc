/* Chuyển thể từ LAB5_T1_CHANG3_BAN_NOP_CHINH_THUC.md, §3.1–§3.4.
   Chỉ mock nội dung; không thực hiện hành động y tế/đặt thuốc thật.
   K4/K8 là ID trong Chặng 3, chờ đối chiếu mapping chính thức với P1. */
window.P2_UX = Object.freeze({
  source: 'LAB5_T1_CHANG3_BAN_NOP_CHINH_THUC.md',
  sourceStatus: 'P2_OFFICIAL_STAGE3',
  scenarios: {
    K4: {
      id:'K4', title:'Bỏ sót cấp cứu', tag:'Cấp cứu • không chờ duyệt',
      userMessage:'Bố mình 70t, từ chiều tức ngực khó thở, bán loại gì dễ thở, mua luôn.',
      facts:['Bố 70 tuổi','Tức ngực từ chiều','Khó thở','Khách yêu cầu mua thuốc ngay'],
      aiText:'⚠️ Gọi cấp cứu 113 ngay (hoặc 115). Bố bạn 70 tuổi, tức ngực kèm khó thở, có thể đang gặp tình trạng cấp cứu. Đừng chờ mua thuốc hoặc chờ chat. Trong lúc chờ hỗ trợ, để bác nghỉ, tránh gắng sức và làm theo hướng dẫn của tổng đài về việc dùng thuốc. Mình là trợ lý AI, không gọi cấp cứu thay bạn và không thể chọn thuốc cho tình huống này.',
      evidence:'70 tuổi / tức ngực / khó thở',
      pharmacistSummary:'Bố 70 tuổi; tức ngực, khó thở từ chiều; khách xin mua thuốc; AI đã hiển thị cảnh báo cấp cứu; chưa gợi ý thuốc.',
      pharmacistReply:'Ca có dấu hiệu cần cấp cứu. Hãy gọi 113 hoặc 115 ngay, không chờ chat hoặc mua thuốc.',
      policyContext:{emergency:true,highRisk:true,riskGroup:'high',screeningComplete:false},
      hax:['G1','G10','G11']
    },
    K8: {
      id:'K8', title:'Thiếu tuổi ở ca sốt trẻ em', tag:'Chưa chắc • hỏi một câu',
      openingUser:'Có thuốc hạ sốt không shop?',
      openingAI:'Thuốc dùng cho ai và người đó bao nhiêu tuổi?',
      userMessage:'Hỏi gì lắm thế! Con sốt 39 độ, nói có thuốc hay không, nhanh lên.',
      facts:['Sốt 39°C (khách tự khai)','Tuổi chưa xác định','Phụ huynh cần phản hồi nhanh'],
      aiText:'Mình hiểu bạn cần nhanh. Người đang sốt bao nhiêu tuổi? Với trẻ dưới 3 tháng sốt từ 38°C hoặc 3–6 tháng sốt từ 39°C, cần được nhân viên y tế đánh giá khẩn, không chỉ chờ mua thuốc. Mình là trợ lý AI, không tự chọn thuốc hay liều. Mình đang yêu cầu chuyển cuộc chat cho dược sĩ; trạng thái sẽ hiện bên dưới.',
      evidence:'Sốt 39°C / chưa rõ tuổi thật / chưa đủ thông tin chọn thuốc',
      pharmacistSummary:'Khách báo con sốt 39°C; tuổi chưa rõ; muốn biết thuốc nhanh; AI hỏi một câu tuổi, hiển thị dấu hiệu nguy hiểm, chưa gợi ý thuốc.',
      pharmacistReply:'Bạn hãy xác nhận tuổi người đang sốt. Nếu có dấu hiệu nguy kịch trên màn hình, cần gọi cấp cứu ngay; không chờ chat.',
      policyContext:{emergency:false,highRisk:true,riskGroup:'unknown',screeningComplete:false},
      ageOptions:[
        {id:'u3',label:'Dưới 3 tháng',reply:'Nếu bé sốt như bạn mô tả, đây là nhóm tuổi cần đánh giá y tế khẩn ngay. Bạn hãy đưa bé đến cơ sở y tế phù hợp, đừng chờ tư vấn mua thuốc. Nếu có dấu hiệu nguy kịch ở khung đỏ, gọi cấp cứu ngay.',care:'urgent'},
        {id:'m3to6',label:'3–6 tháng',reply:'Bé 3–6 tháng sốt 39°C cần được nhân viên y tế đánh giá khẩn. Hãy liên hệ cơ sở y tế ngay; đừng chỉ chờ dược sĩ để mua thuốc. Có dấu hiệu nguy kịch thì gọi cấp cứu.',care:'urgent'},
        {id:'over6',label:'Trên 6 tháng',reply:'Nhiệt độ 39°C một mình chưa cho biết mức nguy hiểm. Bạn hãy xem dấu hiệu ở khung đỏ; mình đang yêu cầu chuyển cho dược sĩ để hỏi thêm. Mình không tự chọn thuốc.',care:'screening'},
        {id:'unknown',label:'Không rõ / Hỏi dược sĩ',reply:'Mình chưa biết tuổi nên chưa loại trừ khả năng trẻ rất nhỏ cần khám gấp. Hãy đọc khung cảnh báo trên và liên hệ cơ sở y tế nếu thuộc nhóm cần khám khẩn; mình không gửi thuốc.',care:'screening'},
        {id:'adult',label:'Người sốt là người lớn',reply:'Cảm ơn bạn đã sửa; mình sẽ đánh giá lại hướng xử lý theo thông tin mới. Chưa đủ dữ liệu để gợi ý sản phẩm.',care:'reassess'}
      ],
      hax:['G1','G10','G11']
    }
  },
  patientSafety:{
    emergency:'CẦN GỌI CẤP CỨU NGAY nếu trẻ khó đánh thức, co giật, thở khó/thở rên, tím tái hoặc ban không mất khi ấn.',
    urgent:'CẦN ĐƯỢC ĐÁNH GIÁ Y TẾ KHẨN nếu bé dưới 3 tháng sốt từ 38°C, hoặc 3–6 tháng sốt từ 39°C. Liên hệ cơ sở y tế/đưa bé đi khám ngay; không chờ chat.'
  },
  globalScope:'Trợ lý AI hỗ trợ sàng lọc ban đầu — không thay thế dược sĩ, bác sĩ; không tự kê đơn hoặc gợi ý liều.'
});
