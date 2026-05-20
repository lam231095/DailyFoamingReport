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

// Bảng tiêu chuẩn từ file "độ dày - số tấm.xlsx"
export const THICKNESS_TABLE: Record<number, { bunRef: number; tolerance: number; tp: number; btp: number }> = {
  2: { bunRef: 144, tolerance: 0, tp: 72, btp: 36 },
  2.5: { bunRef: 145, tolerance: 0, tp: 58, btp: 29 },
  3: { bunRef: 144, tolerance: 0, tp: 48, btp: 24 },
  3.5: { bunRef: 144, tolerance: 0, tp: 41, btp: 20.5 },
  4: { bunRef: 144, tolerance: 0.1, tp: 37, btp: 18.5 },
  4.2: { bunRef: 144, tolerance: 0.1, tp: 35, btp: 17.5 },
  4.5: { bunRef: 144, tolerance: 0, tp: 32, btp: 16 },
  5: { bunRef: 145, tolerance: 0, tp: 29, btp: 14.5 },
  5.2: { bunRef: 145, tolerance: 0.1, tp: 29, btp: 14.5 },
  5.5: { bunRef: 145, tolerance: 0, tp: 26, btp: 13 },
  6: { bunRef: 144, tolerance: 0, tp: 24, btp: 12 },
  7: { bunRef: 146, tolerance: 0.1, tp: 21, btp: 10.5 },
  8: { bunRef: 144, tolerance: 0, tp: 18, btp: 9 },
  8.2: { bunRef: 144, tolerance: 0.2, tp: 18, btp: 9 },
  10: { bunRef: 140, tolerance: 0, tp: 14, btp: 7 },
  11: { bunRef: 143, tolerance: 0, tp: 13, btp: 6.5 },
  12: { bunRef: 144, tolerance: 0, tp: 12, btp: 6 },
  13: { bunRef: 143, tolerance: 0, tp: 11, btp: 5.5 },
  13.5: { bunRef: 135, tolerance: 0, tp: 10, btp: 5 },
  14: { bunRef: 140, tolerance: 0, tp: 10, btp: 5 },
}

/**
 * Lấy số lượng sheet tối ưu trên một bun dựa trên độ dày và loại sản phẩm (TP/BTP).
 */
export function getOptimalSheetsPerBun(
  thickness: number | null,
  isTP: boolean,
  dbStandards?: any[]
): number {
  if (thickness === null) {
    return isTP ? THICKNESS_TABLE[14].tp : THICKNESS_TABLE[14].btp;
  }
  
  const dbStd = dbStandards?.find(s => s.thickness_mm === thickness);
  if (dbStd) {
    const optimal = dbStd.optimal_sheets_per_bun || 0;
    return isTP ? optimal : Math.round(optimal / 2);
  }
  
  const localStd = THICKNESS_TABLE[thickness];
  if (localStd) {
    return isTP ? localStd.tp : localStd.btp;
  }
  
  // Fallback to 14mm
  return isTP ? THICKNESS_TABLE[14].tp : THICKNESS_TABLE[14].btp;
}

