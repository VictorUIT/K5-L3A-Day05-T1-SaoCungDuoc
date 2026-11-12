/* Levels and reasons copied from the user's supplied table 4.1.
 * Missing execution details stay null, never an invented approver/deadline/fallback.
 * FORBID is unconditional in this prototype, including saving with consent.
 * APPROVAL remains locked until P3 supplies all required details.
 */
window.P3_AUTONOMY = {
  source: 'Bảng 4.1 do người dùng cung cấp trong cuộc trò chuyện ngày 12/11/2026',
  tools: {
    goi_y_san_pham: {
      level: 'APPROVAL',
      justification: 'Có thể gợi ý sai nếu người dùng không rõ hoặc bệnh nền chưa biết; cần hỏi trước khi đưa ra khuyến nghị',
      conditions: null,
      conditionChecks: null,
      approver: null,
      timeoutMs: null,
      timeoutBehavior: null,
      fallback: null,
      pendingFields: ['conditions', 'conditionChecks', 'approver', 'timeoutMs', 'timeoutBehavior', 'fallback']
    },
    chuyen_duoc_si: {
      level: 'AUTO',
      justification: 'Khi có dấu hiệu cần chuyên môn, chuyển dược sĩ là bước đủ nguy và tốn ít công hơn so với sai lầm do tự tư vấn',
      conditions: ['Khi có dấu hiệu cần chuyên môn'],
      conditionChecks: null,
      approver: 'none',
      pendingFields: ['conditionChecks']
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
