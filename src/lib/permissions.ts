import { SessionUser } from '@/types'

export const AUTHORIZED_DOWNLOAD_MSNVS = [
  '02075', // Đinh Chi Linh
  '02603', // Nguyễn Văn Thảo
  '04820', // Trần Tuấn Anh
  '00012', // Lê Hữu Dũng
  '04043', // Phạm Việt Hà
  '05091', // Phan Nguyễn Trọng Đức
  '04127', // Dương Vĩnh Lâm
  '03108', // Nguyễn Thị Cẩm Nguyên
  '04420', // Nguyễn Quốc Nam
]

export function canDownloadReport(user: SessionUser | null | undefined): boolean {
  if (!user || !user.msnv) return false
  return AUTHORIZED_DOWNLOAD_MSNVS.includes(user.msnv)
}
