/**
 * LAB5 / T1 Healthcare — P3 -> P4 autonomy integration contract.
 * Source: Chặng 4 provided by teammate (2026-11-12).
 * Browser-compatible, no backend, no APIs, no real patient data.
 *
 * IMPORTANT:
 * - Policy is a PROTOTYPE RULESET, not clinical decision support.
 * - No medical product names, dosages, or medical diagnosis are generated here.
 * - `riskGroup` and `emergency` are supplied by P1 fixture / team-approved script.
 *   They are NOT inferred clinically from free text in this file.
 * - No tool here performs a real-world action.
 */
(function (global) {
  "use strict";

  const LEVEL = Object.freeze({ AUTO: "AUTO", REVIEW: "REVIEW", FORBIDDEN: "FORBIDDEN" });
  const DECISION = Object.freeze({
    MOCK_EXECUTE: "MOCK_EXECUTE",
    REQUIRE_PHARMACIST: "REQUIRE_PHARMACIST",
    BLOCK: "BLOCK"
  });

  const TOOL_POLICIES = Object.freeze({
    goi_y_san_pham: Object.freeze({
      level: LEVEL.REVIEW,
      reviewer: "duoc_si_truc",
      rationale: "Gợi ý sai có thể gây hại sức khỏe, đặc biệt với nhóm nguy cơ cao; cần dược sĩ phê duyệt và có đủ thông tin sàng lọc."
    }),
    chuyen_duoc_si: Object.freeze({
      level: LEVEL.AUTO,
      reviewer: null,
      rationale: "Chuyển thừa thường ít nguy hiểm hơn bỏ sót hoặc chuyển muộn ca cần tư vấn chuyên môn."
    }),
    khuyen_di_kham: Object.freeze({
      level: LEVEL.AUTO,
      reviewer: null,
      rationale: "Cảnh báo nguy hiểm không được chờ phê duyệt; việc chậm cảnh báo có thể gây hậu quả nghiêm trọng."
    }),
    luu_ghi_chu_suc_khoe: Object.freeze({
      level: LEVEL.FORBIDDEN,
      reviewer: null,
      rationale: "Trong phạm vi prototype này, AI không được tự lưu thông tin sức khỏe nhạy cảm."
    }),
    ban_thuoc_ke_don: Object.freeze({
      level: LEVEL.FORBIDDEN,
      reviewer: null,
      rationale: "AI không được bán thuốc kê đơn qua chat hoặc cung cấp thuốc thay thế theo cơ chế tự động."
    })
  });

  function result(tool, decision, reason, nextActions) {
    return {
      tool,
      configuredLevel: TOOL_POLICIES[tool]?.level || null,
      decision,
      reason,
      nextActions: nextActions || []
    };
  }

  /**
   * Evaluate an attempted mock action.
   * @param {{tool: string, context?: {
   *   emergency?: boolean, highRisk?: boolean,
   *   screeningComplete?: boolean, riskGroup?: 'standard'|'high'|'unknown'
   * }}} request
   * @returns {{tool: string,configuredLevel: string|null,decision: string,reason:string,nextActions:string[]}}
   */
  function evaluateToolRequest(request) {
    const tool = request?.tool;
    const ctx = request?.context || {};
    if (typeof tool !== "string" || !Object.prototype.hasOwnProperty.call(TOOL_POLICIES, tool)) {
      return { tool: tool || null, configuredLevel: null, decision: DECISION.BLOCK,
        reason: "Tool không thuộc danh sách 5 tool được cấp cho Track 1.", nextActions: [] };
    }

    if (tool === "luu_ghi_chu_suc_khoe" || tool === "ban_thuoc_ke_don") {
      return result(tool, DECISION.BLOCK,
        "Tool bị cấm trong chính sách của prototype.",
        tool === "ban_thuoc_ke_don" ? ["chuyen_duoc_si"] : []);
    }

    if (tool === "goi_y_san_pham") {
      if (ctx.emergency === true) {
        return result(tool, DECISION.BLOCK,
          "Bạn đừng vội mua hoặc tự dùng thuốc lúc này vì có thể làm chậm việc cấp cứu. Hãy gọi cấp cứu ngay và làm theo hướng dẫn của nhân viên y tế; đừng chờ mua thuốc hoặc chờ chat. Mình không thể gợi ý thuốc an toàn cho tình huống này.",
          ["khuyen_di_kham"]);
      }
      if (ctx.highRisk === true || ctx.riskGroup === "high") {
        return result(tool, DECISION.BLOCK,
          "Người dùng thuốc thuộc nhóm nguy cơ cao: không tự gợi ý; chuyển dược sĩ.",
          ["chuyen_duoc_si"]);
      }
      if (ctx.screeningComplete !== true || ctx.riskGroup !== "standard" || ctx.emergency !== false) {
        return result(tool, DECISION.BLOCK,
          "Chưa xác minh đầy đủ thông tin sàng lọc hoặc tình trạng nguy cơ.",
          ["hoi_lai", "chuyen_duoc_si"]);
      }
      return result(tool, DECISION.REQUIRE_PHARMACIST,
        "Đã có dữ liệu sàng lọc mô phỏng, nhưng nội dung gợi ý vẫn cần dược sĩ kiểm tra và duyệt trước khi gửi khách.",
        ["show_review_panel", "chuyen_duoc_si"]);
    }

    if (tool === "khuyen_di_kham") {
      return result(tool, DECISION.MOCK_EXECUTE,
        "Mô phỏng hiển thị thông báo khuyên khám; với dấu hiệu nguy hiểm thì cảnh báo khẩn cấp ngay, không chờ dược sĩ.",
        [ctx.emergency === true ? "show_emergency_warning" : "show_care_guidance"]);
    }

    if (tool === "chuyen_duoc_si") {
      return result(tool, DECISION.MOCK_EXECUTE,
        "Mô phỏng tạo yêu cầu chuyển dược sĩ; không xác nhận đã chuyển thật.",
        ["show_mock_handoff_status"]);
    }

    return result(tool, DECISION.BLOCK, "Không có chính sách hỗ trợ.", []);
  }

  global.T1_AUTONOMY = Object.freeze({ LEVEL, DECISION, TOOL_POLICIES, evaluateToolRequest });
})(typeof window !== "undefined" ? window : globalThis);
