# Kiểm thử các kịch bản

Kết quả P4 đã chạy và ca còn chờ dữ liệu nhóm nằm tại [acceptance-checklist.md](acceptance-checklist.md).

Prototype có 14 ca; K4/K8 ở đầu với luồng chi tiết, 12 ca còn lại chạy cơ bản. Chạy `node --test tests/story.test.cjs` và `node tests/browser-check.mjs` cho chính sách P3 bàn giao mới. Cần bấm từng bước, không mở sẵn toàn bộ cuộc hội thoại. Xem checklist để đối chiếu 5 nhánh tuổi, đồng bộ ca, phản hồi nhập tay, đính chính, cấp cứu và ảnh đánh số. Nhánh chuyển thất bại/thử lại chỉ kiểm tra nội bộ bằng Node, không có preset trên giao diện. Tài liệu nguồn trong `docs/` chỉ giữ local.


Bổ sung 12 ca cơ bản (12/11/2026): K1, K2, K3, K5, K6, K7, K9–K14. Đã bấm từng ca trên Chrome: câu điền sẵn → Gửi → một cặp chat. K1 không tạo hồ sơ dược sĩ; 11 ca còn lại nhận ca, đánh dấu xem và phản hồi nhập tay đồng bộ được. K4/K8 luôn ở đầu. Kết quả: PASS (browser-check.mjs); không mở rộng các nhánh chi tiết ngoài hai ca ưu tiên.
