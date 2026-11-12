/* Levels and reasons copied from the user's supplied table 4.1.
 * User requested pharmacist approval/rejection/request-more-info in this revision.
 * No timed SLA: requests remain pending until acted on or invalidated.
 * FORBID is unconditional in this prototype, including saving with consent.
 * APPROVAL only executes after a pharmacist action on the latest request.
 */
window.P3_AUTONOMY = {
  source: 'Bảng 4.1 do người dùng cung cấp trong cuộc trò chuyện ngày 12/11/2026',
  tools: {
    goi_y_san_pham: {
      level: 'APPROVAL',
      justification: 'Có thể gợi ý sai nếu người dùng không rõ hoặc bệnh nền chưa biết; cần hỏi trước khi đưa ra khuyến nghị',
      conditions: ['Sàng lọc đầy đủ, không có dấu hiệu khẩn cấp', 'Dược sĩ đã kiểm tra đề xuất minh họa'],
      conditionChecks: [{ field: 'screeningComplete', equals: true }, { field: 'pharmacistReviewed', equals: true }],
      approver: 'dược sĩ',
      timeoutMode: 'manual',
      timeoutBehavior: 'Giữ chờ; không tự duyệt hoặc gửi sản phẩm.',
      fallback: 'Dược sĩ từ chối hoặc yêu cầu bổ sung; khách có thể sửa thông tin.'
    },
    chuyen_duoc_si: {
      level: 'AUTO',
      justification: 'Khi có dấu hiệu cần chuyên môn, chuyển dược sĩ là bước đủ nguy và tốn ít công hơn so với sai lầm do tự tư vấn',
      conditions: ['Trường hợp cần chuyên môn và không phải ca khẩn cấp'],
      conditionChecks: [{ field: 'urgent', equals: false }],
      approver: 'none'
    },
    khuyen_di_kham: {
      level: 'AUTO',
      justification: 'Dấu hiệu nguy hiểm thì nên tránh chờ, cảnh báo rõ là bắt buộc',
      conditions: ['Có dấu hiệu nguy hiểm'],
      conditionChecks: [{ field: 'urgent', equals: true }],
      approver: 'none'
    },
    luu_ghi_chu_suc_khoe: {
      level: 'FORBID',
      justification: 'Lộ thông tin y tế nguy hiểm nếu không có đồng ý rõ ràng'
    },
    ban_thuoc_ke_don: {
      level: 'FORBID',
      justification: 'Không được bán, không được gợi ý thuốc kê đơn'
    }
  }
};
