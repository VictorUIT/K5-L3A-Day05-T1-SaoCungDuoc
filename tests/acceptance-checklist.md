# Acceptance checklist · Khách hàng / Dược sĩ

Ngày chạy: **12/11/2026**. Phạm vi prototype hiện tại chỉ gồm **K4 và K8** theo yêu cầu người dùng. `spec.md` không thay đổi. Toàn bộ tư vấn/sản phẩm/duyệt là mô phỏng; thẻ P-01 không phải thuốc.

Đã chạy `node --test tests/guardrails.test.cjs tests/integration.test.cjs tests/review-workflow.test.cjs`: **40/40 PASS** khi có tài liệu local (clone không có docs: 39 PASS, 1 SKIP nguồn). `node tests/browser-check.mjs`: **12 nhóm QA trình duyệt PASS**, file:// offline với Chrome có sẵn.

| ID | Input | Thao tác | Expected | Actual | Kết quả | Bằng chứng |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | Trang nguyên bản | Mở file:// offline | Chỉ K4/K8, hai tab, không cần server | Mở đủ CSS/JS, không exception, không ghi chú PENDING/nguồn/hero cũ | PASS | Browser `offline startup…` |
| T02 | K8 chưa sàng lọc | Gửi dược sĩ, mở tab Dược sĩ | Nhận bản nháp, chưa hiện sản phẩm cho khách, chưa được duyệt | Badge 1, xem được sàng lọc thiếu và bản nháp; nút duyệt khóa | PASS | Browser `pending proposal…`, Node `incomplete K8…` |
| T03 | K8 đã bổ sung đầy đủ | Gửi lại, mở Dược sĩ, xác nhận đã kiểm tra, duyệt | Thẻ chỉ phát sau duyệt, hai tab đồng bộ | Trước duyệt DOM tên sản phẩm khách rỗng; sau duyệt hiện P-01, trạng thái APPROVED, badge 0 | PASS | Browser `resubmission…`, screen-01/02.png |
| T04 | K8 đang chờ nhưng thiếu thông tin | Nhập phản hồi, yêu cầu bổ sung | Khách nhận yêu cầu, không có sản phẩm, cần lượt duyệt mới | MORE_INFO_REQUESTED và đúng nội dung dược sĩ; gửi lại có request ID mới | PASS | Browser `request-more-info…`, Node cùng luồng |
| T05 | K4 | Chọn ở cả hai tab | Cảnh báo ngay, không hàng chờ sản phẩm | URGENT, cảnh báo hiện, không có đề xuất/nút duyệt | PASS | Browser `K4…`, Node `K4 warns…` |
| T06 | K8 dưới 3 tháng/dấu hiệu nguy hiểm; 3–6 tháng hoặc sốt ≥5 ngày | Đổi trường sàng lọc | Khẩn/khám kịp thời đúng nhánh; không chờ duyệt | Nhánh URGENT hoặc MEDICAL_REVIEW, nút gửi duyệt khóa, không phát sản phẩm | PASS | Browser `K8 danger…`, Node hai test nhánh tuổi/thời gian |
| T07 | Policy cấm lưu và kê đơn | Gọi adapter với consent | Không vượt FORBID | Cả hai bị chặn; không có luồng lưu/kê đơn trên UI | PASS | integration.test.cjs; guardrails.test.cjs |
| T08 | K8 đủ thông tin | Thử sai vai trò/chưa xác nhận, rồi duyệt đúng; lặp click | Chỉ đúng người và request hợp lệ mới phát đúng một lần | Sai vai trò/chưa xem bị chặn; click cũ không phát thêm | PASS | Node `only a pharmacist…`; browser duyệt thật |
| T09 | K8 chờ duyệt | Nhập lý do, từ chối; hoặc khách hủy | Phản hồi đồng bộ; không lộ thẻ | REJECTED kèm lý do; hủy xóa request, badge 0; không có sản phẩm | PASS | Browser `rejection…`, `customer cancellation…` |
| T10 | K8 đã duyệt, hoặc đang chờ | Sửa sàng lọc / gửi lời nhắn mới | Hủy hiệu lực duyệt cũ, xóa nội dung thẻ; request cũ vô hiệu | DOM sản phẩm bị xóa ngay; tin tự do yêu cầu chọn lại nguy hiểm, không phân tích y tế | PASS | Browser `screening correction…`, `new free text…`; Node các test sửa/hủy |
| T11 | Hai vai trò cùng trang | Chuyển tab và request ID | Dùng chung state; bản nháp không trong customer projection | Đồng bộ trong RAM; khách chỉ nhận projection sản phẩm đã duyệt | PASS | Node `incomplete K8…`, `snapshots…`; browser luồng hai tab |
| T12 | Request thủ công và fixture có hạn | Tăng thời gian, duyệt muộn | Không tự duyệt; nếu có hạn thì quá hạn không gửi | Chờ thủ công giữ AWAITING_APPROVAL; fixture timed bị chặn khi hết hạn | PASS | Node `manual requests…`, guardrails timeout |
| T13 | Hai tab, viewport 320/390/1366px | Phím mũi tên, đo kích thước, xem ảnh | ARIA/focus đúng, không tràn ngang, nút ≥44px | Cả hai view đạt; đã xem ảnh desktop/mobile thật | PASS | Browser keyboard/responsive; ảnh .tmp local |
| T14 | Tin giả có chuỗi HTML; toàn phiên | Gửi lời nhắn, quan sát requests/storage/errors | Không HTML injection hoặc gửi/lưu ngoài | Không thẻ img, không HTTP(S), không storage, không JS exception | PASS | Browser `new free text…` |

## Điểm neo và giới hạn bàn giao

- `data-anchor="evidence"`: cảnh báo ưu tiên, căn cứ K4/K8 (G10/G11).
- `data-anchor="correction"`: form sàng lọc, sửa thông tin làm mất hiệu lực duyệt (G9).
- `data-anchor="actions"`: thao tác gửi xem xét; `approved-product`: chỉ hiện khi duyệt.
- Các điểm neo là hỗ trợ kỹ thuật. Không chèn nhãn nguyên tắc hay số chú thích vào giao diện chính; nhóm chốt lập luận HAX/PAIR trong báo cáo.
- Chưa có nguồn thuốc/catalog, người duyệt thật hoặc SLA tự động. Prototype kiểm thử luồng với thẻ minh họa; không tuyên bố đủ điều kiện tư vấn/bán thuốc thật.
- `docs/`, tài liệu nguồn và agents không nằm trong commit. `spec.md` do nhóm tự chốt, chưa bị P4 sửa.
