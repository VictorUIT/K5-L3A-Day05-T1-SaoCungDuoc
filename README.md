# LAB 05 · Hỏi dược sĩ · SaoCungDuoc

Prototype HTML/CSS/JS chạy offline với hai tab **Khách hàng / Dược sĩ**. Chỉ giữ hai ca ưu tiên **K4, K8**, theo yêu cầu cập nhật. `spec.md` được giữ nguyên; phạm vi hai ca của giao diện không thay đổi yêu cầu ≥8 kịch bản trong báo cáo lab.

## Mở và demo

Double-click [prototype/index.html](prototype/index.html) bằng Chrome hoặc Edge. Không cần server, npm, đăng nhập hay mạng.

- **K4 · Bố tức ngực, khó thở:** cảnh báo hiện ngay. Tab Dược sĩ thấy ca khẩn cấp ở chế độ đọc; không có luồng chờ duyệt/gợi ý sản phẩm.
- **K8 · Bé sốt, chưa rõ tuổi:** khách bổ sung sàng lọc rồi bấm **Gửi dược sĩ xem xét**. Cũng có thể gửi khi còn thiếu thông tin để dược sĩ yêu cầu bổ sung.
- Mở **Dược sĩ** để xem yêu cầu, sàng lọc và đề xuất AI nội bộ. **Duyệt đề xuất** chỉ bật khi đã đủ thông tin và chọn ô xác nhận đã kiểm tra. **Từ chối / Yêu cầu bổ sung** cần nhập phản hồi cho khách.
- Quay lại **Khách hàng**: trạng thái và phản hồi đã đồng bộ. Chỉ sau khi dược sĩ duyệt, thẻ sản phẩm mới xuất hiện.
- Sửa bất kỳ thông tin sàng lọc nào hoặc gửi lời nhắn mới sẽ hủy hiệu lực duyệt cũ, ẩn thẻ đã duyệt và yêu cầu xem xét lại. **Hủy yêu cầu** và **Bắt đầu lại ca này** cũng vô hiệu yêu cầu cũ.

Để thử nhánh duyệt của K8: chọn **Trên 6 tháng**, **Không** có dấu hiệu nguy hiểm, **Dưới 1 ngày**, và chọn **Không có/Chưa dùng gì** cho thuốc, dị ứng, bệnh nền, điều trị trước đó. Đây là dữ liệu dựng để bấm thử luồng; không phải quy tắc khẳng định trẻ an toàn. Dược sĩ vẫn phải xác nhận trước khi duyệt.

## Dữ liệu và giới hạn

- Thẻ **Sản phẩm minh họa P-01** là fixture giao diện, không phải thuốc, liều, giá, tồn kho hoặc khuyến nghị sử dụng. Không có nút mua hay giao dịch thật. Chưa tích hợp danh mục sản phẩm hoặc nguồn thuốc được kiểm chứng.
- Trường còn trống, “Chưa rõ” hoặc thông tin thuốc/dị ứng/bệnh nền/đã điều trị cần làm rõ sẽ chặn duyệt. Dược sĩ có thể yêu cầu bổ sung hoặc từ chối.
- K8 có dấu hiệu nguy hiểm hoặc trẻ dưới 3 tháng đang sốt 39°C đi thẳng sang cảnh báo khẩn. Trẻ 3–6 tháng sốt 39°C hoặc sốt từ 5 ngày được hướng tới đánh giá tại cơ sở y tế kịp thời; không chờ duyệt sản phẩm.
- Không có AI API hoặc phân tích y tế từ tin nhắn tự do. Lời nhắn thêm được hiển thị nguyên văn cho dược sĩ; context mới yêu cầu chọn lại trường dấu hiệu nguy hiểm.
- Hai vai trò cùng dùng trạng thái trong RAM trên **một trang**. Chuyển tab đồng bộ ngay; không có backend, đăng nhập, đồng bộ giữa thiết bị hay lưu hồ sơ. Đóng/tải lại trang xóa phiên.
- Tab Dược sĩ là vai trò mô phỏng, không xác thực người có chuyên môn. Trình duyệt/DevTools không phải ranh giới bảo mật cho ứng dụng thật.
- Chưa có SLA thời gian do nhóm cung cấp. Yêu cầu chờ xử lý thủ công, không tự duyệt khi chờ lâu; hủy/sửa dữ liệu làm yêu cầu mất hiệu lực. Engine vẫn có kiểm thử chính sách có hạn để bảo đảm quá hạn không phát sản phẩm.

Nhãn mô phỏng vẫn hiển thị cố định. Các ghi chú PENDING, nguồn tài liệu, phần giới thiệu dài và thông tin triển khai đã được bỏ khỏi giao diện chính theo yêu cầu.

## Quyền tool

| Tool | Mức | Cách thực hiện trong prototype |
| --- | --- | --- |
| `goi_y_san_pham` | Cần dược sĩ duyệt | Đề xuất nội bộ chưa được gửi cho khách. Chỉ phát thẻ minh họa sau kiểm tra sàng lọc, xác nhận đúng yêu cầu/phiên bản và thao tác duyệt |
| `chuyen_duoc_si` | Tự làm | Gửi ca K8 tới tab Dược sĩ; chặn ca có cảnh báo khẩn/đi khám |
| `khuyen_di_kham` | Tự làm | Hiện cảnh báo trực tiếp, không phụ thuộc duyệt sản phẩm |
| `luu_ghi_chu_suc_khoe` | Cấm | Không có luồng lưu hồ sơ; consent không thể vượt mức Cấm |
| `ban_thuoc_ke_don` | Cấm | Chặn ở bộ kiểm tra quyền và adapter; không bán/gợi ý thay thế |

## Cấu trúc kỹ thuật

`P1/P2/P3 → validation → review-workflow → authorizeAction → mock-tools → hai view`.

| File | Trách nhiệm |
| --- | --- |
| `prototype/index.html`, `css/style.css`, `js/app.js` | Hai tab accessible, form sàng lọc, hàng chờ và phản hồi đồng bộ |
| `prototype/data/p1-scenarios.js` | Chỉ K4/K8; giữ nguyên nội dung nguồn và ID |
| `prototype/data/p2-ux.js` | Lời thoại, trường sàng lọc, trạng thái, thẻ minh họa và điểm neo cho luồng mới |
| `prototype/data/p3-autonomy.js` | Đủ 5 mức; dược sĩ là người duyệt; chờ thủ công, không tự gửi |
| `prototype/js/review-workflow.js` | State chung theo ca, request ID + phiên bản, tách customer projection khỏi bản nháp, duyệt/từ chối/bổ sung, thu hồi hiệu lực khi sửa |
| `prototype/js/state-machine.js`, `mock-tools.js`, `validation.js` | Kiểm tra quyền tại handler/adapter; giữ bộ engine tổng quát đã kiểm thử |

Customer projection **không chứa bản nháp/request nội bộ**. DOM thẻ sản phẩm khách hàng chỉ được điền từ projection đã duyệt; khi duyệt mất hiệu lực, cả nội dung và phần hiển thị được xóa. Snapshot là bản sao, không sửa được state gốc. Request cũ, click lặp, sai vai trò hoặc sửa context đều không phát thẻ.

`docs/` và file hướng dẫn agents chỉ giữ local, đã ignore. Không có file nào trong `docs/` được commit. Test đối chiếu nguồn chỉ chạy khi tài liệu local có mặt; các test sản phẩm không phụ thuộc tài liệu này. Không có `Architecture.md` hiện hữu.

## Kiểm thử và ảnh thật

Prototype không cần Node. Bộ kiểm thử phát triển dùng Node ≥22 và Chrome/Edge có sẵn, không cài package:

```powershell
node --test tests/guardrails.test.cjs tests/integration.test.cjs tests/review-workflow.test.cjs
node tests/browser-check.mjs
```

Đã chạy **40 test đạt** trên máy có tài liệu local; bản clone thiếu tài liệu chạy **39 đạt, 1 SKIP** cho đối chiếu nguồn. Browser QA chạy **12 nhóm kiểm tra đạt** trên chính ứng dụng qua `file://` offline, gồm cả hai vai trò, duyệt/từ chối/bổ sung/sửa thông tin và giao diện 320/390/1366px. Không có exception JS, HTTP(S) request hoặc ghi localStorage/sessionStorage trong phiên thử. Chi tiết tại [acceptance checklist](tests/acceptance-checklist.md).

[Ảnh 01 — Khách hàng sau duyệt](prototype/assets/screen-01.png) · [Ảnh 02 — Dược sĩ xem đề xuất chờ duyệt](prototype/assets/screen-02.png). Ảnh được chụp từ trình duyệt thật, không chứa tài khoản/dữ liệu người thật.

## Căn cứ nội dung và bàn giao

Các dấu hiệu/nhánh tuổi bám nội dung K4/K8 đã giao và được đối chiếu với [NHS: Chest pain](https://www.nhs.uk/symptoms/chest-pain/) và [NICE NG143, mục 1.2.12–1.2.14](https://www.nice.org.uk/guidance/ng143/chapter/recommendations). Không sinh tên thuốc hoặc liều từ các nguồn này.

[Track T1](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/tracks/t1-healthcare.md) · [Guide](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/02-guide.md) · [Rubric](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/04-rubric.md).

Luồng hai vai trò được triển khai theo yêu cầu cập nhật trực tiếp của người dùng. Nhóm vẫn cần bàn giao nguồn sản phẩm thật nếu muốn thay thẻ minh họa và tự chốt nội dung báo cáo, thành viên, HAX/PAIR và kết quả demo trong `spec.md`; P4 không điền thay báo cáo.
