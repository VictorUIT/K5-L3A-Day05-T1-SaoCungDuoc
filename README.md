# LAB 05 · Hỏi dược sĩ · SaoCungDuoc

Prototype P4 cho **Track T1 Healthcare**, lấy bối cảnh kênh Hỏi dược sĩ của Pharmacity. Đã sang **Phase B: nhận 14 kịch bản P1 và 5 mức tool từ nhóm**, còn chờ UX P2 và một số chi tiết thực thi P3. Chưa phải bài nộp hoàn thiện. Không kết nối Pharmacity, dược sĩ thật, AI API, cơ sở dữ liệu hay thanh toán.

## Mở prototype

Double-click [prototype/index.html](prototype/index.html) bằng Chrome hoặc Edge. Không cần server, mạng, npm hay thư viện. Toàn bộ tài nguyên là file cục bộ; script dữ liệu chạy trước ứng dụng nên hỗ trợ `file://`.

1. Mở **Trạng thái tích hợp** để xem dữ liệu còn thiếu và quyền của 5 tool.
2. Chọn **K1–K14**, mở **Xem kịch bản nguồn P1** để xem tin nhắn, lỗi có thể xảy ra và yêu cầu thiết kế nguyên bản. **K4 và K8** được đánh dấu ưu tiên. Vì chưa có flow/lời thoại P2, nút **Bắt đầu kịch bản** vẫn khóa và ghi rõ `PENDING_P2`; việc xem nguồn không chạy tool hay giả làm câu trả lời AI.
3. Nhập một **tin nhắn dựng** rồi bấm **Gửi**: ứng dụng luôn hiện fallback trung tính. Không nhận diện triệu chứng/từ khóa và không giả làm AI hiểu tiếng Việt tự do.
4. Bấm **Sửa thông tin** để đưa tin vào khung sửa; thao tác này hủy phiên/duyệt/lưu tạm cũ. **Xóa phiên** xóa toàn bộ dữ liệu trong bộ nhớ ứng dụng.
5. Sau khi đủ dữ liệu thực thi: chọn ID case → bắt đầu → đi theo action P2. `goi_y_san_pham` cần người duyệt nhưng chưa có người duyệt/hạn/fallback nên tiếp tục khóa. `luu_ghi_chu_suc_khoe` và `ban_thuoc_ke_don` hiện **Cấm**, kể cả khi có đồng ý.

## Trạng thái bàn giao

| Phần | Trạng thái | Cần người phụ trách cung cấp |
| --- | --- | --- |
| P1 · Risk & Spec | Đã nhận K1–K14 | Đủ 4 lớp (3/5/3/3 ca), đúng 2 ca ưu tiên K4/K8; còn xác nhận cờ an toàn, P2 cấp mapping `flowId` |
| P2 · UX & HAX/PAIR | `PENDING_P2` | Lời thoại nguyên văn, state/action/next, căn cứ, 2–3 điểm neo HAX/PAIR, loại lỗi và ai được báo/khi nào/nội dung |
| P3 · Autonomy | Đã nhận 5 mức + lý do | Gợi ý = APPROVAL; chuyển dược sĩ/khuyên khám = AUTO; lưu ghi chú/kê đơn = FORBID. Còn điều kiện/người duyệt/hạn/fallback của gợi ý và mapping điều kiện chuyển dược sĩ |
| P4 · Prototype | Phase B đã kiểm thử | Xem nguồn 14 ca, bảng 5 mức, quyền khóa đúng phần chưa đủ, validator/state machine/mock và ảnh thật |

`spec.md` thuộc P1/nhóm và được giữ nguyên. Tài liệu P1 đầy đủ trong `docs/` **chỉ giữ local, không commit và không phát hành cùng repo**. `window.P1_SOURCE` ghi nguồn local và SHA-256 để đối chiếu khi có file trên máy; prototype chỉ dùng 14 ca trong JS, không cần đọc tài liệu này để chạy. Nội dung bảng được chuyển sang JS mà không sửa câu chữ, không tự gán cờ lâm sàng hoặc chọn flow thay P2. M2/M3 chưa nghiệm thu. Danh sách thành viên/phân công chờ nhóm bổ sung; hướng dẫn P4 ghi nhận nhóm dự kiến 4 người trong khi đề quy định 3, nên cần TA/giảng viên xác nhận.

## File và trách nhiệm

| File | Trách nhiệm |
| --- | --- |
| `prototype/index.html`, `prototype/css/style.css` | Một màn hình chat responsive và dialog trạng thái tích hợp |
| `prototype/data/p1-scenarios.js` | 14 ca K1–K14 nguyên văn bảng §2.2 của P1; metadata nguồn, hash, 2 ca ưu tiên; `flowId` để null chờ P2 |
| `prototype/data/p2-ux.js` | P2 giao `window.P2_UX`; hiện chỉ có 2 fallback trung tính được hướng dẫn cho phép |
| `prototype/data/p3-autonomy.js` | Đủ 5 mức/lý do từ ảnh bảng 4.1 người dùng giao; trường chưa có để null, không tự chọn người duyệt/thời hạn |
| `prototype/js/validation.js` | Kiểm tra schema, ID, liên kết case/flow/state/action/tool, điểm neo, độ đầy đủ |
| `prototype/js/state-machine.js` | Quản lý phiên, quyền, đồng ý, yêu cầu duyệt, hủy, từ chối, timeout và hoàn tác |
| `prototype/js/mock-tools.js` | Chỉ trả kết quả mô phỏng; gọi lại bộ kiểm tra quyền trước khi trả thành công |
| `prototype/js/app.js` | Render bằng `textContent`, điều phối nút, dialog, focus và nhãn pending |
| `tests/acceptance-checklist.md` | Kết quả thật và các ca còn chờ dữ liệu cuối |
| `tests/guardrails.test.cjs`, `tests/integration.test.cjs`, `tests/browser-check.mjs` | Test rào chắn, đối chiếu nguyên văn nguồn P1/mức P3 và tương tác trình duyệt; fixture cách ly |

Không còn dùng `prototype/js/scenarios.js` và `autonomy.js` rỗng: dữ liệu được đưa về 3 hợp đồng P1/P2/P3 ở trên. Không có `Architecture.md` hiện hữu cần cập nhật.

## Hợp đồng tích hợp

Giữ nguyên ID của người bàn giao. Chỉ sửa file của phần được giao, mở lại trang để đọc dữ liệu mới. Không dùng `fetch()` để đọc JSON hoặc `eval()` để chạy điều kiện.

### P1

Mỗi case cần `id`, `message`, `riskClass` (`source|ambiguity|authority|domain`), `failureMode`, `expectedBehavior`, `harmLevel` (`minor|recoverable|unacceptable`), `isPriority`, `evidence[]`, `flowId`. Đã nhận đủ 14 ca và căn cứ; `harmReason` giữ nguyên nhãn/giải thích ở nguồn. `flowId: null` là chờ mapping P2, được báo `PENDING_P2`, không bị coi là P1 chưa giao kịch bản. Markdown trong ô nguồn được giữ nguyên và hiển thị an toàn bằng text. Không sao chép fixture trong test thành kịch bản bài nộp.

**Đề xuất kỹ thuật chờ P1/P3 xác nhận**: thêm `safety: { urgent, vulnerable, prescription, screeningComplete }`, mỗi trường là boolean đã được nhóm xác nhận. P4 không suy diễn các giá trị này từ câu người dùng. Nếu chưa có đủ cờ rõ ràng, `goi_y_san_pham` bị khóa. Không tự xác định ngưỡng tuổi hay tiêu chuẩn sàng lọc.

### P2

`P2_UX.flows[flowId]` cần:

- `states[]`: `{ id, aiText, evidenceText, actions: [{ id, label, next, tool }] }`. `tool` có thể là `null`. `next` phải có trong cùng flow.
- `haxAnchors[]`: 2–3 mục `{ principle, targetId, reason }`, do P2 chọn. Các vị trí có sẵn: `evidence`, `actions`, `correction` và `state.id` của câu AI hiện tại. UI đánh số theo thứ tự P2 cung cấp; không tự chọn nguyên tắc.
- `errorType`: `system|user|context`; `notification: { who, when, what }`. UI phân biệt thông báo dự kiến với chuyển ca đã mô phỏng, không nói đã báo người thật.

**Đề xuất kỹ thuật chờ P2 xác nhận**: `state.id` có thể dùng `NEEDS_MORE_INFO`, `SAFE_INFO`, `NEEDS_PHARMACIST`, `URGENT`, `COMPLETE`, `FAILED`. Nếu giữ ID khác, thêm `kind` bằng một trong các trạng thái này để máy trạng thái hiểu; không đổi ID đã chốt. `START`, `ASSESSING`, `AWAITING_APPROVAL` là trạng thái nội bộ.

Case có `safety.urgent: true` đi **ngay** vào state `URGENT` của P2, kể cả P3 chưa đủ policy; cảnh báo không chờ tool/hàng đợi. P2 phải cung cấp câu khẩn cấp hợp lệ; P4 không viết thay. Cảnh báo giữ trên màn hình và chặn chuyển sang state chờ/gợi ý thuốc. Trường hợp thiếu hoặc mâu thuẫn dữ liệu hiện `INTEGRATION_ISSUE` và cần người phụ trách sửa trước demo.

### P3

Đủ 5 tool: `goi_y_san_pham`, `chuyen_duoc_si`, `khuyen_di_kham`, `luu_ghi_chu_suc_khoe`, `ban_thuoc_ke_don`.

Mỗi khai báo cần `level: AUTO|APPROVAL|FORBID` và `justification`. Trước khi đủ 5 khai báo hợp lệ, mọi tool khóa. Khi đã đủ bảng mức, từng tool kiểm tra cấu hình thực thi riêng; chi tiết duyệt còn thiếu của gợi ý không chặn tool AUTO khác có điều kiện rõ ràng. `FORBID` khóa vô điều kiện, không yêu cầu bịa người duyệt/timeout/fallback. `AUTO` không cần các trường chờ duyệt. `APPROVAL` còn cần điều kiện, người duyệt, thời hạn và xử lý từ chối/quá hạn.

| Tool | Mức nhóm đã giao | Tình trạng thực thi |
| --- | --- | --- |
| `goi_y_san_pham` | Cần người duyệt | `PENDING_P3`: điều kiện/mapping, người duyệt, thời hạn, timeout/fallback chưa có; luôn khóa |
| `chuyen_duoc_si` | Tự làm | Có điều kiện “Khi có dấu hiệu cần chuyên môn”; chờ P3 mapping kiểm tra được, không tự cho mọi input vào hàng chờ |
| `khuyen_di_kham` | Tự làm | Điều kiện “Có dấu hiệu nguy hiểm” ánh xạ kiểm tra `urgent === true`; cần P1/P2 giao cờ/flow/lời cảnh báo trước khi chạy ca |
| `luu_ghi_chu_suc_khoe` | Cấm | Không có ngoại lệ khi consent hay người duyệt đồng ý |
| `ban_thuoc_ke_don` | Cấm | Chặn cứng cả ở adapter và handler, không gợi ý thay thế |

K10 trong tài liệu P1 có nhắc phương án hỏi đồng ý nếu cần lưu. Bảng mức mới chọn **Cấm**, nên bản tích hợp không triển khai đường lưu cho K10; không biến đồng ý thành một ngoại lệ của mức Cấm.

**Đề xuất kỹ thuật chờ P3 xác nhận**:

- `conditionChecks[]` tương ứng từng chuỗi `conditions[]`, dạng `{ field, equals }`; `field` chỉ nhận 4 cờ an toàn P1 nêu trên, `equals` là boolean. Điều kiện chưa ánh xạ sẽ khóa tool. Các điều kiện khác cần P3 và P4 thống nhất trước khi triển khai; không thực thi chuỗi code do dữ liệu cung cấp.
- Tool `APPROVAL` cần `timeoutMs` nguyên dương do P3 chọn, không có thời hạn mặc định do P4 tự đặt.
- Chưa duyệt: không đổi tác động mô phỏng. Quá hạn: trạng thái `FAILED`, hiện nguyên `timeoutBehavior` + `fallback`, không tự duyệt hay tự gọi tool. Từ chối/hủy: về trạng thái trước, hiện `fallback`. Nếu P3 muốn chuyển state/escalation khác, cần giao mapping cụ thể; bản này không suy ra hành động từ văn bản.
- Cơ chế consent/ghi chú trong engine chỉ là năng lực kỹ thuật được kiểm tra bằng fixture cách ly. **Policy nhóm hiện cấm lưu**, vì vậy chưa cấp đường này cho dữ liệu thật của nhóm. Nếu nhóm chủ động đổi policy sau này, vẫn phải đồng ý đúng nội dung đang xem, chỉ cập nhật RAM và có nút hủy; consent không bao giờ tự cấp quyền vượt `FORBID`.

Các phần mở rộng trên là **đề xuất hợp đồng thực thi, chưa phải quyết định của P1/P2/P3**. Đây là điểm cần chốt khi tích hợp, không dùng để tự điền spec.

## Luồng kỹ thuật và giới hạn

`P1/P2/P3 → validation → state machine → authorizeAction → mock tool → UI`.

Máy trạng thái giữ bản sao dữ liệu khi khởi tạo, cấp ID riêng cho từng lần duyệt, kiểm tra người duyệt/hạn/consent ở handler và adapter. Policy không hợp lệ khóa hành động tương ứng; tool cấm không có nút thực thi. Hành động được phép mô phỏng chỉ ảnh hưởng dữ liệu tạm, có hỗ trợ hủy. Không có `localStorage`, `sessionStorage`, gửi dữ liệu mạng, tên thuốc/giá/liều do P4 tạo.

Vai trò người duyệt được chọn sẵn theo policy và gắn nhãn **mô phỏng**; đây không phải xác thực dược sĩ. JavaScript chạy trong trình duyệt không phải ranh giới bảo mật trước người có toàn quyền sửa mã bằng DevTools. Dù vậy adapter và handler đều chặn các đường gọi thông thường, và không có giao dịch bên ngoài nào để thực thi.

## Kiểm thử

Prototype không cần Node. Để chạy bộ kiểm thử phát triển, dùng Node.js ≥22:

```powershell
node --test tests/guardrails.test.cjs tests/integration.test.cjs
node tests/browser-check.mjs
```

Browser check dùng Chrome/Edge đã cài, có thể chỉ định `CHROME_PATH`; không tải trình duyệt hay cài package. Trên môi trường giới hạn tiến trình, có thể cần quyền chạy trình duyệt; nếu không chạy được phải ghi chưa kiểm thử trình duyệt. Script dùng Chrome DevTools Protocol qua pipe, chỉ mở `file://` với mạng trang bị ngắt. Thư mục profile, bản sao fixture và kết quả JSON nằm trong `.tmp/` đã ignore; script đóng đúng trình duyệt nó tạo.

Test dùng `TEST_*`/`TECH_*` thuần kỹ thuật trong bản sao cách ly, **không phải** nội dung P1–P3. Browser check kiểm tra cả UI bằng click/phím, không chỉ kiểm tra hàm. Test đối chiếu toàn bộ tài liệu nguồn là tùy chọn: có file local thì kiểm tra hash/từng ô; bản clone không có `docs/` sẽ báo SKIP riêng cho test đó, các test sản phẩm vẫn chạy đầy đủ. Xem bảng [acceptance checklist](tests/acceptance-checklist.md) để phân biệt PASS kỹ thuật và PENDING nghiệp vụ.

## Ảnh chụp thật sau tích hợp P1/P3

[Ảnh 01 — đã nhận 14 ca, chọn K4, chờ P2](prototype/assets/screen-01.png) · [Ảnh 02 — trạng thái tích hợp và 5 mức tool](prototype/assets/screen-02.png).

Cả hai được chụp lại từ trang thật qua `file://`. Đây là bằng chứng **bản tích hợp một phần**, chưa phải ảnh minh chứng ca khó/HAX/Autonomy cuối cùng. Chỉ chụp lại ảnh có số HAX/PAIR sau khi P2 giao nguyên tắc, nhóm chốt chi tiết còn thiếu và chạy thành công M3.

## Nguồn yêu cầu

[Track T1](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/tracks/t1-healthcare.md) · [Guide](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/02-guide.md) · [Spec template](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/03-spec-template.md) · [Rubric](https://github.com/VinUni-AI20k/K5-L3-Day05-AI-Product-UX-Autonomy/blob/main/04-rubric.md).
