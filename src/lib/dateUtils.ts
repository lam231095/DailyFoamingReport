/**
 * Lấy ngày báo cáo dựa trên quy tắc ca làm việc và giờ.
 * Nếu là Ca 3 và nộp trước 12:00 trưa, hoặc các ca khác nộp trước 6:00 sáng,
 * thì ngày báo cáo được lùi lại 1 ngày (thuộc ngày sản xuất hôm trước).
 * 
 * @param dateInput Chuỗi ISO hoặc đối tượng Date
 * @param shift Ca làm việc (e.g. "Ca 1", "Ca 2", "Ca 3", "Ca HC")
 * @returns Chuỗi ngày định dạng DD/MM/YYYY
 */
export function formatReportDate(dateInput: string | Date, shift?: string): string {
  const date = new Date(dateInput);
  const hours = date.getHours();

  let subtract = false;
  if (shift === 'Ca 3') {
    subtract = hours < 22;
  } else if (shift === 'Ca 2') {
    subtract = hours < 14;
  } else if (shift === 'Ca 1') {
    subtract = hours < 6;
  } else if (shift === 'Ca HC') {
    subtract = hours < 8;
  } else {
    subtract = hours < 6;
  }

  if (subtract) {
    date.setDate(date.getDate() - 1);
  }

  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  return `${d}/${m}/${y}`;
}

/**
 * Lấy ngày báo cáo định dạng ISO (YYYY-MM-DD)
 * 
 * @param dateInput Chuỗi ISO hoặc đối tượng Date
 * @param shift Ca làm việc (e.g. "Ca 1", "Ca 2", "Ca 3", "Ca HC")
 * @returns Chuỗi ngày định dạng YYYY-MM-DD
 */
export function getReportDateISO(dateInput: string | Date, shift?: string): string {
  const date = new Date(dateInput);
  const hours = date.getHours();

  let subtract = false;
  if (shift === 'Ca 3') {
    subtract = hours < 22;
  } else if (shift === 'Ca 2') {
    subtract = hours < 14;
  } else if (shift === 'Ca 1') {
    subtract = hours < 6;
  } else if (shift === 'Ca HC') {
    subtract = hours < 8;
  } else {
    subtract = hours < 6;
  }

  if (subtract) {
    date.setDate(date.getDate() - 1);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * Tính toán khoảng thời gian UTC cho một khoảng ngày báo cáo (ICT).
 * Ngày báo cáo D (ICT) bắt đầu từ (D) 06:00:00 ICT và kết thúc lúc (D+1) 05:59:59 ICT.
 * Tương đương với (D) 06:00:00+07:00.
 */
export function getReportTimeRange(startDate: string, endDate: string) {
  // startDate, endDate: YYYY-MM-DD
  const start = new Date(`${startDate}T06:00:00+07:00`).toISOString();

  // Kết thúc là 6h sáng ngày tiếp theo của endDate
  const nextDayOfEnd = new Date(new Date(`${endDate}T06:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000);
  const end = nextDayOfEnd.toISOString();

  return { start, end };
}

/**
 * Lấy số tuần trong năm của một ngày
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
