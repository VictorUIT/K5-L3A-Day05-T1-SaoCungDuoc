# Kiểm thử chat và đồng bộ hai vai trò

Ngày 12/11/2026. Đã chạy `node --test tests/story.test.cjs`: 12 PASS. `node tests/browser-check.mjs`: 9 nhóm PASS qua Chrome file:// offline.

| Phép thử | Thao tác thực tế | Kết quả |
| --- | --- | --- |
| Giao diện | Mở ca và gửi | Không còn khối tuổi/giải thích/BLOCK/phép thử rời hoặc nút chuyển; preset nằm dưới chat |
| K4 | Gửi câu điền sẵn, mở tab Dược sĩ | Ca tự đồng bộ; xác nhận xem và phản hồi là hai thao tác riêng; phản hồi xuất hiện phía khách |
| 12 ca cơ bản | Chọn từng K1/K2/K3/K5/K6/K7/K9–K14 rồi Gửi | PASS: đúng câu điền sẵn, trước Gửi chưa có chat, sau Gửi một cặp hỏi–đáp; K1 không tạo ca chuyển, 11 ca còn lại đồng bộ và gửi phản hồi nhập tay được |
| Thứ tự | Xem danh sách kịch bản | PASS: đủ 14 nút, K4/K8 đứng đầu |
| K8 mở đầu | Gửi hỏi hạ sốt rồi gửi câu sốt ruột | Lần một chưa có hồ sơ dược sĩ; lần hai tự đồng bộ, không cần nút chuyển |
| Năm tuổi | Với từng preset tuổi: chọn rồi Gửi | Trước Gửi lịch sử không đổi; sau Gửi chỉ còn một cặp tuổi/phản hồi, tổng 6 bubble cơ bản; phía dược sĩ có tuổi mới |
| Duyệt dữ kiện cũ | Dược sĩ đã xem/phản hồi rồi khách gửi tuổi khác | Phản hồi và xác nhận cũ bị hủy; dược sĩ cần xem lại dữ kiện mới |
| Khó thở | Chọn preset rồi Gửi | Chọn chưa phát cảnh báo; sau Gửi cảnh báo và hồ sơ dược sĩ cập nhật đồng thời |
| Ảnh chú thích | Gửi phép thử, bật số và chụp | Hai screenshot thật được cập nhật; preset nằm dưới ô chat, có legend HAX/PAIR/mức tự chủ |
| Kỹ thuật | Hai vai trò ở 320/390/1366px, theo dõi lỗi/network/storage | Không tràn ngang, exception JS, HTTP(S) request hay persistent storage |

Node test bổ sung kiểm tra BLOCK sản phẩm ở K4/K8, adapter cấm lưu/kê đơn/tool lạ, nhánh context chuẩn vẫn cần dược sĩ, snapshot không sửa state và reset không ảnh hưởng ca khác.

Phạm vi xuất bản: `prototype/` và `tests/`. `spec.md` giữ nguyên, docs/agents chỉ local.
