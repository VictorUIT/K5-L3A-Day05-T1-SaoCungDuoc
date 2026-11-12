# Acceptance checklist · P4 / Phase B tích hợp một phần

Ngày chạy: **12/11/2026**. Mở bằng Chrome headless đã cài trên máy, qua **file:// và offline**. Không có AI API. Kết quả PASS kỹ thuật không thay thế demo trên dữ liệu P1/P2/P3 cuối cùng.

Lệnh đã chạy: `node --test tests/guardrails.test.cjs tests/integration.test.cjs` (**29/29 PASS trên máy có tài liệu local**) và `node tests/browser-check.mjs` (**14 nhóm kiểm tra PASS**). Bản clone không chứa `docs/` chạy 28 test sản phẩm, SKIP riêng 1 test đối chiếu tài liệu local. Fixture `TEST_*`/`TECH_*` chỉ nằm trong test hoặc bản sao `.tmp/`, không được nhập vào dữ liệu nhóm. Đã nhận 14 ca K1–K14, hai ưu tiên K4/K8 và bảng 5 mức tool; chưa có UX P2/chi tiết duyệt cuối nên không đánh dấu hoàn tất M3.

| ID | Input | Thao tác | Expected | Actual | PASS/FAIL/PENDING | Bằng chứng |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | `prototype/index.html` nguyên bản | Mở `file://` khi ngắt mạng trang | UI mở, không exception JS | UI tải đủ CSS/JS, không uncaught exception | PASS | `browser-check.mjs`, `prototype/assets/screen-01.png` |
| T02 | P1 14 ca, P2 chưa có flow, P3 đủ 5 mức nhưng chưa đủ chi tiết | Chọn K4, xem nguồn, mở dialog, thử bắt đầu | Xem được nguồn; chưa có UX thì không chạy ca; bảng phân biệt mức đã nhận và chi tiết còn thiếu | Dropdown đủ 14 ca, K4/K8 đánh dấu ưu tiên, nguồn đúng nguyên văn; nút bắt đầu khóa theo P2. Test riêng cho đầu vào trống vẫn chặn tool | PASS | `screen-01.png`, `screen-02.png`, `integration.test.cjs`, browser T01/T02 |
| T03 | Ca bình thường từ danh sách P1 | Chọn case → phản hồi P2 → tool P3 | Không chặn vô ích, không thực thi sai | Đã có P1; chưa có flow/lời thoại P2 và mapping điều kiện chuyển dược sĩ. AUTO đã chạy trên fixture kỹ thuật | PENDING_P2/P3 | Browser fixture `AUTO handoff…`; chưa là bằng chứng ca thật |
| T04 | K3/K8/K12/K13 từ P1 | Bấm ca chính, thử gợi ý/chuyển dược sĩ | Không tự gợi ý thuốc; chuyển phù hợp policy | Đã nhận nguyên văn ca trẻ nhỏ; chưa có flow/copy và cờ safety đã xác nhận. Fixture `vulnerable` chặn nút product | PENDING_P2/P3, cờ P1 | Browser test `T04 technical fixture`, Node `product suggestions…` |
| T05 | K4/K13 từ P1 | Bắt đầu ca | Cảnh báo ngay, không hàng chờ/thuốc | Đã nhận yêu cầu P1 và mức AUTO cho khuyên khám; chưa có flow/copy P2. Fixture urgent đi thẳng cảnh báo, không hàng chờ/thuốc | PENDING_P2, cờ P1 | Browser test `T05 technical fixture`, Node `confirmed urgent…`, `urgent state…` |
| T06 | Tool kê đơn và tin tự do yêu cầu ngoài phạm vi | Gọi adapter trực tiếp dù policy AUTO; kiểm tra UI | Không tự bán/kê đơn/đưa liều | Tool luôn bị cấm; UI không có nút chạy; input tự do chỉ fallback | PASS kỹ thuật | Node `prescription sales…`, browser `FORBID UI…`; vẫn cần P1/P2 nghiệm thu copy cuối |
| T07 | Policy nhóm cấm lưu; fixture riêng có consent | Gọi lưu với consent/approval; kiểm tra cơ chế consent ở fixture cách ly | `FORBID` không được vượt qua bằng đồng ý; fixture không ghi storage | Policy nhóm luôn chặn lưu kể cả consent/approval. Fixture riêng kiểm tra checkbox→duyệt→xóa RAM và không ghi storage | PASS kỹ thuật | `integration.test.cjs`: `current FORBID…`; browser `T07/T08…`, `T07/T14…` |
| T08 | `goi_y_san_pham` APPROVAL thiếu người/hạn; fixture riêng đầy đủ | Kiểm tra khóa cấu hình thiếu, đúng/sai người, duyệt/từ chối/hủy/quá hạn ở fixture | Không tự chọn người duyệt/hạn; chỉ duyệt hợp lệ mới cập nhật | Gợi ý sản phẩm nguồn vẫn khóa; fixture chặn sai người/hạn/ID, browser chạy từ chối và timeout thật | PASS kỹ thuật; ca cuối PENDING_P3 | `integration.test.cjs`, Node nhóm approval, browser T08 |
| T09 | Tool cấm và tool chưa có policy | Gọi thẳng adapter/handler thay vì chỉ xem nút | Cả handler và adapter chặn | Kê đơn AUTO vẫn bị cấm; thiếu 1 policy khóa các tool khác; UI tool cấm không có nút | PASS | Node `prescription sales…`, `one missing policy…`; browser `FORBID UI…` |
| T10 | Tin dựng bất kỳ, gồm chuỗi HTML | Gửi → sửa → xóa phiên | Fallback trung tính, không keyword routing hoặc HTML injection | Hiện đúng common fallback; không tạo thẻ HTML; sửa điền lại text, reset xóa tin; chuyển người khóa khi thiếu P3 | PASS | Browser `T10…`, `correction/reset…`, Node `arbitrary input…` |
| T11 | 2–3 nguyên tắc HAX/PAIR P2 | Đối chiếu DOM và ảnh đánh số | Nguyên tắc trỏ vào đúng chỗ nhìn thấy | Chưa có nguyên tắc P2; fixture render được 2 badge đúng target | PENDING_P2 | Browser `copy, anchors…`; ảnh hiện tại là khung, chưa phải R5 cuối |
| T12 | K4/K8 + một ca thường | Bấm từ đầu tới cuối, không sửa mã giữa demo | Đạt M3 với dữ liệu cuối | Đã có P1 và bảng mức P3; chưa có luồng P2/chi tiết thực thi, không tuyên bố demo đã đạt | PENDING_P2/P3 | Checklist tích hợp và README |
| T13 | Viewport 320/390/1366px; phím Enter/Escape | Đo overflow/nút; mở/đóng dialog bằng bàn phím | Không tràn ngang, nút ≥44px, dùng được bằng phím | Các phép đo đạt; Enter mở dialog, Escape đóng; đã xem ảnh laptop/điện thoại | PASS | Browser `T13…`, ảnh mobile thật trong `.tmp/` |
| T14 | Source và toàn phiên QA | Kiểm tra storage, request mạng, giới hạn chức năng | Không secret, dữ liệu thật, backend, hứa kết nối thật | Nội dung dựng/pending; không HTTP(S), không lưu local/sessionStorage; mọi chuyển ca gắn mô phỏng | PASS trong phạm vi source/phiên đã chạy | Browser `no uncaught…`, `T07/T14…`; code review |

## Chốt tích hợp trước demo

- [x] Nhận P1: đủ 14 ca, đủ lớp, K4/K8 ưu tiên; giữ nguyên ID, thông điệp, yêu cầu và nhãn; đối chiếu hash tài liệu nguồn.
- [ ] Nhóm xác nhận cờ an toàn theo từng case; không tự đặt “không có nguy cơ” từ thông tin còn thiếu.
- [ ] P2 giao nguyên văn lời AI, căn cứ, correction, notification, điểm neo; nhóm kiểm tra câu khẩn cấp và không đưa liều.
- [x] Nhận P3: đủ 5 mức và lý do trong bảng 4.1; lưu ghi chú/kê đơn cấm không có ngoại lệ consent.
- [ ] P3 chốt điều kiện gợi ý, ai duyệt, thời hạn, từ chối/quá hạn/fallback và mapping điều kiện chuyển dược sĩ.
- [ ] Nhóm xác nhận các đề xuất hợp đồng `safety`, `kind`, `conditionChecks`, `timeoutMs` trong README hoặc giao mapping khác để P4 cập nhật.
- [ ] Chạy lại T03/T04/T05/T11/T12 bằng dữ liệu cuối; chỉ đổi pending sang PASS sau khi quan sát thực tế.
- [ ] Chụp lại 1–2 ảnh thật cho ca khó, đánh số HAX/PAIR theo P2; ghi vị trí minh chứng trong spec do P1 chốt.
- [ ] Nhóm hoàn tất M1/M2/M3 và việc mỗi thành viên giải thích được phần mình; chưa có xác nhận này.
