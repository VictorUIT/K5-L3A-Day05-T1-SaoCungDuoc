# Acceptance checklist · P4 / Phase A

Ngày chạy: **12/11/2026**. Mở bằng Chrome headless đã cài trên máy, qua **file:// và offline**. Không có AI API. Kết quả PASS kỹ thuật không thay thế demo trên dữ liệu P1/P2/P3 cuối cùng.

Lệnh đã chạy: `node --test tests/guardrails.test.cjs` và `node tests/browser-check.mjs`. Fixture `TEST_*`/`TECH_*` chỉ nằm trong test hoặc bản sao `.tmp/`, không được nhập vào dữ liệu nhóm. Không đánh dấu hoàn tất M3 khi chưa có dữ liệu thật của nhóm.

| ID | Input | Thao tác | Expected | Actual | PASS/FAIL/PENDING | Bằng chứng |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | `prototype/index.html` nguyên bản | Mở `file://` khi ngắt mạng trang | UI mở, không exception JS | UI tải đủ CSS/JS, không uncaught exception | PASS | `browser-check.mjs`, `prototype/assets/screen-01.png` |
| T02 | P1 mảng trống, P2 flows trống, P3 tools trống | Mở dialog, thử bắt đầu case | Hiện pending; không tự tạo kịch bản, lời y tế, policy hay thực thi | Bắt đầu bị khóa; dialog liệt kê 12 vấn đề chờ tích hợp | PASS | `screen-02.png`, test `empty production inputs…` |
| T03 | Ca bình thường của P1 | Chọn case → phản hồi P2 → tool P3 | Không chặn vô ích, không thực thi sai | Chưa có dữ liệu nhóm; AUTO đã chạy trên fixture kỹ thuật | PENDING_P1/P2/P3 | Browser fixture `AUTO handoff…`; chưa là bằng chứng ca thật |
| T04 | Ca trẻ nhỏ của P1 | Bấm ca chính, thử gợi ý/chuyển dược sĩ | Không tự gợi ý thuốc; chuyển phù hợp policy | Chưa có ca trẻ nhỏ/copy/policy. Cờ `vulnerable` đã chặn nút product trên UI fixture | PENDING_P1/P2/P3 | Browser test `T04 technical fixture`, Node `product suggestions…` |
| T05 | Ca dấu hiệu nguy hiểm của P1 | Bắt đầu ca | Cảnh báo ngay, không hàng chờ/thuốc | Fixture urgent đi thẳng vào cảnh báo, giấu chuyển hàng chờ, không nút thuốc; lời y tế cuối chưa có | PENDING_P1/P2 | Browser test `T05 technical fixture`, Node `confirmed urgent…`, `urgent state…` |
| T06 | Tool kê đơn và tin tự do yêu cầu ngoài phạm vi | Gọi adapter trực tiếp dù policy AUTO; kiểm tra UI | Không tự bán/kê đơn/đưa liều | Tool luôn bị cấm; UI không có nút chạy; input tự do chỉ fallback | PASS kỹ thuật | Node `prescription sales…`, browser `FORBID UI…`; vẫn cần P1/P2 nghiệm thu copy cuối |
| T07 | Fixture lưu ghi chú, checkbox chưa chọn | Thử duyệt trước/sau đồng ý, xóa ghi chú | Không consent không lưu; có thể hủy và đi tiếp | Chưa đồng ý nút duyệt bị khóa; đồng ý+duyệt mới hiện nút hủy lưu; hủy xóa; không ghi storage | PASS kỹ thuật | Node `approval without consent…`, `AUTO save…`; browser `T07/T08…`, `T07/T14…` |
| T08 | Fixture APPROVAL với người duyệt/hạn xác định | Đúng/sai người, duyệt, từ chối, hủy, hết hạn, click cũ | Chỉ duyệt hợp lệ mới cập nhật; không tự duyệt | Node chặn sai người/hạn/ID; browser chạy checkbox→duyệt→hủy lưu, từ chối và timeout thật | PASS kỹ thuật | Node nhóm approval, browser `T08…`; timeout/fallback cuối chờ P3 |
| T09 | Tool cấm và tool chưa có policy | Gọi thẳng adapter/handler thay vì chỉ xem nút | Cả handler và adapter chặn | Kê đơn AUTO vẫn bị cấm; thiếu 1 policy khóa các tool khác; UI tool cấm không có nút | PASS | Node `prescription sales…`, `one missing policy…`; browser `FORBID UI…` |
| T10 | Tin dựng bất kỳ, gồm chuỗi HTML | Gửi → sửa → xóa phiên | Fallback trung tính, không keyword routing hoặc HTML injection | Hiện đúng common fallback; không tạo thẻ HTML; sửa điền lại text, reset xóa tin; chuyển người khóa khi thiếu P3 | PASS | Browser `T10…`, `correction/reset…`, Node `arbitrary input…` |
| T11 | 2–3 nguyên tắc HAX/PAIR P2 | Đối chiếu DOM và ảnh đánh số | Nguyên tắc trỏ vào đúng chỗ nhìn thấy | Chưa có nguyên tắc P2; fixture render được 2 badge đúng target | PENDING_P2 | Browser `copy, anchors…`; ảnh hiện tại là khung, chưa phải R5 cuối |
| T12 | Hai ca ưu tiên + một ca thường đã chốt | Bấm từ đầu tới cuối, không sửa mã giữa demo | Đạt M3 với dữ liệu cuối | Chưa có ca của nhóm; không tuyên bố demo lâm sàng đã đạt | PENDING_P1/P2/P3 | Checklist tích hợp và README |
| T13 | Viewport 320/390/1366px; phím Enter/Escape | Đo overflow/nút; mở/đóng dialog bằng bàn phím | Không tràn ngang, nút ≥44px, dùng được bằng phím | Các phép đo đạt; Enter mở dialog, Escape đóng; đã xem ảnh laptop/điện thoại | PASS | Browser `T13…`, ảnh mobile thật trong `.tmp/` |
| T14 | Source và toàn phiên QA | Kiểm tra storage, request mạng, giới hạn chức năng | Không secret, dữ liệu thật, backend, hứa kết nối thật | Nội dung dựng/pending; không HTTP(S), không lưu local/sessionStorage; mọi chuyển ca gắn mô phỏng | PASS trong phạm vi source/phiên đã chạy | Browser `no uncaught…`, `T07/T14…`; code review |

## Chốt tích hợp trước demo

- [ ] P1 giao ≥8 case, phủ đủ lớp, đúng 2 ca ưu tiên; giữ nguyên ID và xác nhận cờ an toàn.
- [ ] P2 giao nguyên văn lời AI, căn cứ, correction, notification, điểm neo; nhóm kiểm tra câu khẩn cấp và không đưa liều.
- [ ] P3 giao đủ 5 policy và chốt mapping điều kiện/timeout/từ chối; không chỉ ghi văn bản không thể thực thi.
- [ ] Nhóm xác nhận các đề xuất hợp đồng `safety`, `kind`, `conditionChecks`, `timeoutMs` trong README hoặc giao mapping khác để P4 cập nhật.
- [ ] Chạy lại T03/T04/T05/T11/T12 bằng dữ liệu cuối; chỉ đổi pending sang PASS sau khi quan sát thực tế.
- [ ] Chụp lại 1–2 ảnh thật cho ca khó, đánh số HAX/PAIR theo P2; ghi vị trí minh chứng trong spec do P1 chốt.
- [ ] Nhóm hoàn tất M1/M2/M3 và việc mỗi thành viên giải thích được phần mình; chưa có xác nhận này.
