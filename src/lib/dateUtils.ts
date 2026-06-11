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
  
  // Lấy giờ và phút theo múi giờ địa phương (ICT)
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Ngày làm việc được tính từ 6h30 sáng hôm nay tới 6h30 sáng ngày hôm sau.
  // Do đó, nếu giờ nộp báo cáo < 6h30 sáng (tức là < 390 phút), ta lùi lại 1 ngày.
  const subtract = totalMinutes < 390;

  if (subtract) {
    date.setDate(date.getDate() - 1);
  }

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
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
  
  // Lấy giờ và phút theo múi giờ địa phương (ICT)
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Ngày làm việc được tính từ 6h30 sáng hôm nay tới 6h30 sáng ngày hôm sau.
  // Do đó, nếu giờ nộp báo cáo < 6h30 sáng (tức là < 390 phút), ta lùi lại 1 ngày.
  const subtract = totalMinutes < 390;

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
 * Ngày báo cáo D (ICT) bắt đầu từ (D) 06:30:00 ICT và kết thúc lúc (D+1) 06:29:59 ICT.
 * Tương đương với (D) 06:30:00+07:00.
 */
export function getReportTimeRange(startDate: string, endDate: string) {
  // startDate, endDate: YYYY-MM-DD
  const start = new Date(`${startDate}T06:30:00+07:00`).toISOString();

  // Kết thúc là 6h30 sáng ngày tiếp theo của endDate
  const nextDayOfEnd = new Date(new Date(`${endDate}T06:30:00+07:00`).getTime() + 24 * 60 * 60 * 1000);
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
