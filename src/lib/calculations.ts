/**
 * Tính toán số sheet tối ưu trên một bun dựa trên độ dày yêu cầu.
 * Công thức: 
 * 1. Lấy độ dày trừ đi 0.2mm (dung sai cận dưới).
 * 2. Tìm số nguyên n sao cho (thickness - 0.2) * n là giá trị lớn nhất <= 144mm.
 * 
 * @param thickness Độ dày yêu cầu (mm)
 * @returns Số sheet tối ưu trên 1 bun
 */
export function calculateOptimalSheetsPerBun(thickness: number): number {
  if (!thickness || thickness <= 0.2) return 0;
  
  const adjustedThickness = thickness - 0.2;
  const maxBunThickness = 144;
  
  // n = Math.floor(144 / (thickness - 0.2))
  const n = Math.floor(maxBunThickness / adjustedThickness);
  
  return n > 0 ? n : 0;
}

/**
 * Tính toán số lượng sheet gợi ý cho toàn bộ số bun thực tế.
 * 
 * @param actualBuns Số bun thực tế
 * @param sheetsPerBun Số sheet trên mỗi bun
 * @returns Tổng số sheet gợi ý (làm tròn)
 */
export function calculateSuggestedSheets(actualBuns: number, sheetsPerBun: number): number {
  return Math.round(actualBuns * sheetsPerBun);
}

/**
 * Tính toán hiệu suất tách (%)
 * 
 * @param actualSheets Số sheet thực tế nhận được
 * @param suggestedSheets Số sheet gợi ý (tối ưu)
 * @returns Phần trăm hiệu suất (0-100+)
 */
export function calculateEfficiency(actualSheets: number, suggestedSheets: number): number {
  if (suggestedSheets <= 0) return 0;
  return Math.round((actualSheets / suggestedSheets) * 100);
}
