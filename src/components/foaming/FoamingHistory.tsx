'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Calendar, Clock, User, 
  ChevronDown, FileText, Download, Loader2,
  AlertCircle, ArrowRight, RotateCcw, Pencil, Save, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser } from '@/types'
import { calculateOptimalSheetsPerBun, calculateSuggestedSheets, calculateEfficiency } from '@/lib/calculations'
import { formatReportDate, getReportTimeRange } from '@/lib/dateUtils'
import { canDownloadReport } from '@/lib/permissions'

interface FoamingHistoryProps {
  user: SessionUser
}

type StageType = 'pour' | 'separate' | 'warehouse' | 'transfer'

const STAGE_CONFIG = {
  pour: { table: 'foaming_pour_reports', label: 'Công đoạn Đổ' },
  separate: { table: 'foaming_separate_reports', label: 'Công đoạn Tách' },
  warehouse: { table: 'foaming_warehouse_reports', label: 'Nhập kho' },
  transfer: { table: 'foaming_transfer_reports', label: 'Giao hàng Đổ - Tách' },
}

const ERROR_TYPES = [
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn'
]

const AUTHORIZED_REVERT_MSNVS = [
  '04127', // Dương Vĩnh Lâm
  '02075', // Đinh Chi Linh
  '02603', // Nguyễn Văn Thảo
  '04820', // Trần Tuấn Anh
]

function cleanProductName(name: string | null | undefined): string {
  if (!name) return '---'
  let clean = name.trim()
  
  // 1. Remove "OrthoLite" at the beginning (case-insensitive, optional trailing space)
  clean = clean.replace(/^ortholite\s*/i, '')

  // 2. Remove bracket codes like [116-17888], [118-467], [xxx] anywhere in the string
  clean = clean.replace(/\[[^\]]*\]\s*/g, '')
  
  // 3. Remove dimensions in mm: e.g. "4mm", "12.5mm", "4.2mm"
  clean = clean.replace(/\b\d+(\.\d+)?\s*mm\b/gi, '')
  
  // 4. Remove dimension pairs in M/m separated by X/x (e.g. "1.10M X 2.00M", "1.1M x 2M")
  clean = clean.replace(/\b\d+(\.\d+)?\s*[Mm]\s*[xX]\s*\d+(\.\d+)?\s*[Mm]\b/g, '')

  // 5. Remove single dimensions in M/m: e.g. "1.1M", "2M", "1.7M", "1.47M"
  clean = clean.replace(/\b\d+(\.\d+)?\s*[Mm]\b/g, '')

  // 6. Handle Asker hardness: e.g. "25+/-4 Asker C", "35+/-4 asker C", "70-80 Asker F"
  clean = clean.replace(/\b(\d+(?:-\d+)?)(?:\s*\+\/-\s*\d+)?\s*asker\s*([a-zA-Z])\b/gi, '$1$2')

  // Clean double spaces
  clean = clean.replace(/\s+/g, ' ').trim()
  
  return clean
}

export default function FoamingHistory({ user }: FoamingHistoryProps) {
  const [activeStage, setActiveStage] = useState<StageType>('pour')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [standards, setStandards] = useState<any[]>([])
  
  const [revertingItem, setRevertingItem] = useState<any | null>(null)
  const [revertLoading, setRevertLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  const isAuthorized = AUTHORIZED_REVERT_MSNVS.includes(user?.msnv || '')

  // Filters
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    shift: 'Tất cả',
    firmPlan: '',
    puCode: '',
    msnv: '',
    manager: 'Tất cả',
  })
  const [showFilters, setShowFilters] = useState(false)

  // 1. Tải bảng tiêu chuẩn độ dày
  useEffect(() => {
    async function fetchStandards() {
      const { data } = await supabase.from('thickness_standards').select('*')
      setStandards(data || [])
    }
    fetchStandards()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const config = STAGE_CONFIG[activeStage]

      // Transfer stage has its own query (with optional production_plan join since we now save firm_plan)
      if (activeStage === 'transfer') {
        let query = supabase
          .from('foaming_transfer_reports')
          .select(`
            *,
            production_plan (
              pu_code,
              ten_san_pham,
              bun_code,
              no_order,
              week_label,
              sl_bun_can_tach,
              sl_bun_can_do,
              completion_date,
              delivery_date
            ),
            users (
              full_name,
              msnv
            )
          `)
          .gte('pour_date', filters.startDate)
          .lte('pour_date', filters.endDate)

        if (filters.shift !== 'Tất cả') {
          query = query.eq('shift', filters.shift)
        }
        if (filters.msnv.trim()) {
          query = query.ilike('users.msnv', `%${filters.msnv.trim()}%`)
        }

        const { data: result, error: sbError } = await query.order('created_at', { ascending: false })
        if (sbError) throw sbError
        setData(result || [])
        return
      }

      // Khởi tạo query
      let query = supabase
        .from(config.table)
        .select(`
          *,
          production_plan!inner (
            pu_code,
            ten_san_pham,
            bun_code,
            no_order,
            week_label,
            sl_bun_can_tach,
            sl_bun_can_do,
            completion_date,
            delivery_date
          ),
          users!inner (
            full_name,
            msnv
          )
        `)

      // Áp dụng bộ lọc thời gian
      if (activeStage === 'warehouse') {
        query = query.gte('delivery_date', filters.startDate).lte('delivery_date', filters.endDate)
      } else {
        query = query.gte('report_date', filters.startDate).lte('report_date', filters.endDate)
      }

      // Lọc theo Ca (không áp dụng cho Nhập kho)
      if (activeStage !== 'warehouse' && filters.shift !== 'Tất cả') {
        query = query.eq('shift', filters.shift)
      }

      // Lọc theo Quản lý (không áp dụng cho Nhập kho)
      if (activeStage !== 'warehouse' && filters.manager !== 'Tất cả') {
        query = query.eq('manager_name', filters.manager)
      }

      // Lọc theo Firm Plan hoặc No Order
      if (filters.firmPlan.trim()) {
        const rawTerm = `%${filters.firmPlan.trim()}%`
        const cleanTerm = `%${filters.firmPlan.replace(/\s+/g, '')}%`
        const { data: matchedPlans } = await supabase
          .from('production_plan')
          .select('firm_plan')
          .or(`firm_plan.ilike.${rawTerm},no_order.ilike.${rawTerm},firm_plan.ilike.${cleanTerm},no_order.ilike.${cleanTerm}`)
        
        const matchedFirmPlans = matchedPlans?.map(p => p.firm_plan).filter(Boolean) || []
        if (matchedFirmPlans.length > 0) {
          const orConditions = matchedFirmPlans.map(fp => `firm_plan.ilike.%${fp}%`).join(',')
          query = query.or(orConditions)
        } else {
          query = query.eq('firm_plan', 'NON_EXISTENT_PLAN')
        }
      }

      // Lọc theo PU Code (Join Production Plan)
      if (filters.puCode.trim()) {
        query = query.ilike('production_plan.pu_code', `%${filters.puCode.trim()}%`)
      }

      // Lọc theo MSNV (Join Users)
      if (filters.msnv.trim()) {
        query = query.ilike('users.msnv', `%${filters.msnv.trim()}%`)
      }

      const { data: result, error: sbError } = await query.order('created_at', { ascending: false })

      if (sbError) throw sbError
      setData(result || [])
    } catch (err: any) {
      setError('Lỗi khi truy xuất dữ liệu: ' + err.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeStage, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRevertClick = (item: any) => {
    setRevertingItem(item)
  }

  const handleEditClick = (item: any) => {
    // Pre-populate edit form with current values based on stage
    const base: Record<string, any> = {
      shift: item.shift || 'Ca 1',
      machine_id: item.machine_id || '',
      manager_name: item.manager_name || '',
      operator_name: item.operator_name || '',
      note: item.note || '',
      report_date: item.report_date || new Date().toISOString().split('T')[0],
      is_compensation: item.is_compensation || false,
    }
    if (activeStage === 'pour') {
      base.actual_bun_poured = item.actual_bun_poured || 0
      base.ng_bun_qty = item.ng_bun_qty || 0
      base.error_type = item.error_type || ''
      base.cleaning_agent_kg = item.cleaning_agent_kg || 0
      base.waste_kg = item.waste_kg || 0
    }
    if (activeStage === 'separate') {
      base.actual_bun_separated = item.actual_bun_separated || 0
      base.actual_sheet_received = item.actual_sheet_received || 0
      base.bun_thickness_mm = item.bun_thickness_mm || 0
      base.sheet_thickness_mm = item.sheet_thickness_mm || 0
      base.ng_qty = item.ng_qty || 0
      base.ng_bun_qty = item.ng_bun_qty || 0
      base.error_type = item.error_type || ''
    }
    if (activeStage === 'warehouse') {
      base.qty_delivered_sheet = item.qty_delivered_sheet || 0
      base.delivery_date = item.delivery_date || new Date().toISOString().split('T')[0]
      base.ng_bun_qty = item.ng_bun_qty || 0
      base.error_type = item.error_type || ''
    }
    setEditForm(base)
    setEditMsg(null)
    setEditingItem(item)
  }

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setEditLoading(true)
    setEditMsg(null)
    try {
      const config = STAGE_CONFIG[activeStage]
      let payload: Record<string, any> = { ...editForm }
      // Remove undefined / empty fields carefully
      if (!payload.note?.trim()) payload.note = null
      if (!payload.error_type?.trim()) payload.error_type = null
      if (!payload.manager_name?.trim()) payload.manager_name = null
      if (!payload.operator_name?.trim()) payload.operator_name = null

      const { error } = await supabase
        .from(config.table)
        .update(payload)
        .eq('id', editingItem.id)
      if (error) throw error
      setEditMsg({ type: 'success', text: 'Đã cập nhật báo cáo thành công!' })
      await fetchData()
      setTimeout(() => setEditingItem(null), 1200)
    } catch (err: any) {
      setEditMsg({ type: 'error', text: 'Lỗi khi cập nhật: ' + err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const handleConfirmRevert = async () => {
    if (!revertingItem) return
    setRevertLoading(true)
    try {
      const config = STAGE_CONFIG[activeStage]
      const { error: deleteError } = await supabase
        .from(config.table)
        .delete()
        .eq('id', revertingItem.id)

      if (deleteError) throw deleteError

      await fetchData()
      setRevertingItem(null)
    } catch (err: any) {
      alert('Không thể hồi lại báo cáo: ' + err.message)
    } finally {
      setRevertLoading(false)
    }
  }

  const exportCSV = () => {
    if (!canDownloadReport(user)) {
      alert('Bạn không có quyền tải báo cáo!')
      return
    }
    if (data.length === 0) return
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""'
      let str = String(val)
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1)
      }
      return `"${str.replace(/"/g, '""')}"`
    }

    // Header dựa trên stage
    const headers = ["Ngày/Giờ", "Ngày Báo Cáo", "Tuần", "NO.ORDER", "Firm Plan", "PU Code", "Mã Bun", "Sản phẩm", "Dòng sản phẩm", "Người nhập", "MSNV", "Quản lý", "Đơn bù"]
    if (activeStage === 'pour') headers.push("Ca", "Máy", "Operator", "SL Đổ (Bun)", "Lot No", "Chất rửa (kg)", "Rác (kg)", "Vị trí", "Line", "Thẻ màu", "Số xe", "Ghi chú", "NG", "Nguyên nhân dừng máy", "Dừng từ lúc", "Dừng đến lúc", "Tổng thời gian dừng (phút)")
    if (activeStage === 'separate') {
      headers.push("Ca", "Máy", "Operator", "Viết tắt loại hàng", "Dày Bun (mm)", "Độ dày bun thực tế", "Tổng độ dày sheet thực tế", "Dày Sheet (mm)", "SL Tách (Bun)", "SL Sheet Nhận", "Sheet Tối Ưu (Gợi ý)", "% Hiệu Suất", "Lot No", "Ghi chú", "Sheet không có thông tin", "NG", "Lỗi Cứng Trên", "Lỗi Cứng Dưới", "Nguyên nhân dừng máy", "Dừng từ lúc", "Dừng đến lúc", "Tổng thời gian dừng (phút)")
      headers.push(...ERROR_TYPES)
    }
    if (activeStage === 'transfer') headers.push("Ca", "Máy", "SL Giao (Bun)", "Ngày Đổ")
    if (activeStage === 'warehouse') headers.push("SL Giao (Sheet)", "Ngày Giao", "Người Giao")

    const csvContentRaw = headers.map(escapeCSV).join(",") + "\r\n" + data.map(row => {
      const pad2 = (n: number) => String(n).padStart(2, '0')
      const dObj = new Date(row.created_at)
      let dateTime = '---'
      if (!isNaN(dObj.getTime())) {
        dateTime = `${dObj.getFullYear()}-${pad2(dObj.getMonth() + 1)}-${pad2(dObj.getDate())} ${pad2(dObj.getHours())}:${pad2(dObj.getMinutes())}:${pad2(dObj.getSeconds())}`
      }

      const getReportDateISOFromDate = (dateInput: string | Date, shift?: string): string => {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        const hours = date.getHours();

        // Ngày làm việc được tính từ 6h sáng hôm nay tới 6h sáng ngày hôm sau.
        // Do đó, nếu giờ nộp báo cáo < 6h sáng, ta lùi lại 1 ngày.
        const subtract = hours < 6;

        if (subtract) {
          date.setDate(date.getDate() - 1);
        }

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');

        return `${y}-${m}-${d}`;
      }

      let reportDateStr = '---'
      if (row.delivery_date) {
        const parts = row.delivery_date.split('-')
        if (parts.length === 3) {
          reportDateStr = row.delivery_date
        } else {
          const slashParts = row.delivery_date.split('/')
          if (slashParts.length === 3) {
            reportDateStr = `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`
          } else {
            const delDate = new Date(row.delivery_date)
            if (!isNaN(delDate.getTime())) {
              reportDateStr = `${delDate.getFullYear()}-${pad2(delDate.getMonth() + 1)}-${pad2(delDate.getDate())}`
            }
          }
        }
      } else if (row.report_date) {
        reportDateStr = row.report_date
      } else {
        reportDateStr = getReportDateISOFromDate(row.created_at, row.shift)
      }

      const common = [
        dateTime,
        reportDateStr,
        row.production_plan?.week_label || '---',
        row.production_plan?.no_order || '---',
        row.firm_plan,
        row.production_plan?.pu_code || '---',
        row.production_plan?.bun_code || '---',
        row.production_plan?.ten_san_pham || '---',
        cleanProductName(row.production_plan?.ten_san_pham),
        row.users?.full_name || '---',
        row.users?.msnv || '---',
        row.manager_name || '---',
        row.is_compensation ? 'Đơn bù' : 'Đơn chính'
      ]
      
      let specific: any[] = []
      if (activeStage === 'pour') specific = [
        row.shift, 
        row.machine_id || '---', 
        row.operator_name || '---', 
        row.actual_bun_poured, 
        row.lot_no, 
        row.cleaning_agent_kg || 0, 
        row.waste_kg || 0,
        row.storage_location || '---',
        row.storage_line || '---',
        row.color_tag || '---',
        row.storage_carts || 0,
        row.note || '',
        row.error_type || '',
        row.downtime_reason || '',
        row.downtime_start || '',
        row.downtime_end || '',
        row.downtime_duration || 0
      ]
      if (activeStage === 'separate') {
        const thickness = parseFloat(row.production_plan?.ten_san_pham?.match(/([0-9.]+)\s*mm/i)?.[1] || "0")
        const std = standards.find(s => s.thickness_mm === thickness)
        let optimalSheetsPerBun = std ? std.optimal_sheets_per_bun : (thickness > 0 ? calculateOptimalSheetsPerBun(thickness) : 0)
        if (row.product_type === 'ban_thanh_pham') {
          optimalSheetsPerBun = optimalSheetsPerBun / 2
        }
        
        const suggested = calculateSuggestedSheets(row.actual_bun_separated, optimalSheetsPerBun)
        const perf = calculateEfficiency(row.actual_sheet_received, suggested)
        
        const totalActualSheetThickness = (row.actual_sheet_received || 0) * (row.sheet_thickness_mm || 0)
        const actualBunThickness = row.actual_bun_separated > 0 ? (totalActualSheetThickness / row.actual_bun_separated) : 0

        // Parse error types into separate columns
        const errorDetails = ERROR_TYPES.map(type => {
          const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`${escapedType}\\s*\\((\\d+)\\)`, 'i')
          const match = row.error_type?.match(regex)
          return match ? parseInt(match[1]) : 0
        })

        const noInfoSheets = Math.max(0, suggested - (row.actual_sheet_received || 0) - (row.ng_qty || 0))

        specific = [
          row.shift, 
          row.machine_id || '---',
          row.operator_name || '---',
          row.product_type_abbrev || '---',
          row.bun_thickness_mm || 0,
          actualBunThickness.toFixed(2),
          totalActualSheetThickness.toFixed(2),
          row.sheet_thickness_mm || 0,
          row.actual_bun_separated, 
          row.actual_sheet_received, 
          suggested, 
          `${perf}%`,
          row.lot_no, 
          row.note || '',
          noInfoSheets,
          row.ng_qty, 
          row.error_hardness_above || 0,
          row.error_hardness_below || 0,
          row.downtime_reason || '',
          row.downtime_start || '',
          row.downtime_end || '',
          row.downtime_duration || 0,
          ...errorDetails
        ]
      }
      if (activeStage === 'transfer') specific = [
        row.shift,
        row.machine_id || '---',
        row.actual_bun_qty || 0,
        row.pour_date ? row.pour_date.split('-').reverse().join('/') : '---'
      ]
      if (activeStage === 'warehouse') specific = [row.qty_delivered_sheet, row.delivery_date, row.users?.full_name || '---']
      
      return [...common, ...specific].map(escapeCSV).join(",")
    }).join("\r\n")

    // Thêm BOM (Byte Order Mark) để Excel nhận diện đúng UTF-8 (Tiếng Việt)
    const blob = new Blob(["\uFEFF" + csvContentRaw], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `baocao_foaming_${activeStage}_${filters.startDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* --- Filter Header --- */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Filter size={18} />
            </div>
            <h3 className="font-bold text-[var(--text-1)]">Bộ lọc báo cáo</h3>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs font-bold text-brand-500 flex items-center gap-1 hover:underline"
          >
            {showFilters ? 'Thu gọn' : 'Mở rộng bộ lọc'}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Hàng 1: Khoảng thời gian (Chiếm trọn hàng) */}
          <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 space-y-3">
            <label className="text-[10px] font-bold text-orange-600 uppercase ml-1 flex items-center gap-1">
              <Calendar size={12} /> Khoảng thời gian báo cáo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full space-y-1">
                <p className="text-[9px] text-[var(--text-3)] font-bold ml-1">TỪ NGÀY</p>
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono"
                />
              </div>
              <div className="hidden sm:flex items-center justify-center pt-5">
                <ArrowRight size={20} className="text-orange-300" />
              </div>
              <div className="flex-1 w-full space-y-1">
                <p className="text-[9px] text-[var(--text-3)] font-bold ml-1">ĐẾN NGÀY</p>
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Hàng 2: Mã đơn hàng & Công đoạn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1 flex items-center gap-1">
                <Search size={12} /> Tra cứu Firm Plan / NO.ORDER
              </label>
              <input 
                type="text" 
                placeholder="Nhập mã FPRO, RPRO hoặc NO.ORDER..."
                value={filters.firmPlan}
                onChange={(e) => setFilters({...filters, firmPlan: e.target.value})}
                className="w-full bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 font-mono transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1 flex items-center gap-1">
                <Clock size={12} /> Chọn công đoạn sản xuất
              </label>
              <div className="flex gap-1 bg-[var(--bg-input)] p-1 rounded-xl border-2 border-[var(--border)]">
                {(Object.keys(STAGE_CONFIG) as StageType[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveStage(s)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      activeStage === s 
                        ? 'bg-brand-500 text-white shadow-md' 
                        : 'text-[var(--text-3)] hover:bg-white/50 dark:hover:bg-black/20'
                    }`}
                  >
                    {s === 'pour' ? 'ĐỔ' : s === 'separate' ? 'TÁCH' : s === 'transfer' ? 'GH Đ-T' : 'KHO'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 mt-4 border-t border-[var(--border)]">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1">Loại PU Code</label>
                  <input 
                    type="text" 
                    placeholder="VD: PVN-00..."
                    value={filters.puCode}
                    onChange={(e) => setFilters({...filters, puCode: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1 flex items-center gap-1">
                    <User size={10} /> Mã nhân viên (MSNV)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Mã NV..."
                    value={filters.msnv}
                    onChange={(e) => setFilters({...filters, msnv: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1">Ca làm việc</label>
                  <select 
                    value={filters.shift}
                    onChange={(e) => setFilters({...filters, shift: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500"
                  >
                    <option>Tất cả</option>
                    <option>Ca 1</option>
                    <option>Ca 2</option>
                    <option>Ca 3</option>
                    <option>Ca HC</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1">Quản lý (Manager)</label>
                  <select 
                    value={activeStage === 'warehouse' ? 'Không áp dụng' : filters.manager}
                    disabled={activeStage === 'warehouse'}
                    onChange={(e) => setFilters({...filters, manager: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500 disabled:opacity-50"
                  >
                    {activeStage === 'warehouse' ? (
                      <option>Không áp dụng</option>
                    ) : (
                      <>
                        <option value="Tất cả">Tất cả</option>
                        <option value="Linh">Linh</option>
                        <option value="Thảo">Thảo</option>
                        <option value="Tuấn Anh">Tuấn Anh</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex gap-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            TRUY XUẤT DỮ LIỆU
          </button>
          {canDownloadReport(user) && (
            <button 
              onClick={exportCSV}
              disabled={loading || data.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              title="Xuất CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">XUẤT FILE</span>
            </button>
          )}
        </div>
      </div>

      {/* --- Data List --- */}
      <div className="space-y-3 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-brand-500" size={40} />
            <p className="text-sm text-[var(--text-3)] font-medium">Đang truy xuất dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3 bg-red-500/5 rounded-3xl border border-red-500/10 text-red-600">
            <AlertCircle size={40} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3 bg-[var(--bg-card)]/40 rounded-3xl border-2 border-dashed border-[var(--border)] text-[var(--text-3)]">
            <FileText size={40} />
            <p className="text-sm font-medium">Không tìm thấy dữ liệu nào phù hợp</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                Tìm thấy {data.length} báo cáo
              </p>
            </div>
            
            {data.map((row) => {
              // Precalculate separate stage metrics if activeStage === 'separate'
              let separateMetrics = null;
              if (activeStage === 'separate') {
                const thickness = parseFloat(row.production_plan?.ten_san_pham?.match(/([0-9.]+)\s*mm/i)?.[1] || "0");
                const std = standards.find(s => s.thickness_mm === thickness);
                let optimalSheetsPerBun = std ? std.optimal_sheets_per_bun : (thickness > 0 ? calculateOptimalSheetsPerBun(thickness) : 0);
                if (row.product_type === 'ban_thanh_pham') {
                  optimalSheetsPerBun = optimalSheetsPerBun / 2;
                }
                const suggested = calculateSuggestedSheets(row.actual_bun_separated, optimalSheetsPerBun);
                const perf = calculateEfficiency(row.actual_sheet_received, suggested);
                const noInfo = Math.max(0, suggested - (row.actual_sheet_received || 0) - (row.ng_qty || 0));
                separateMetrics = { optimalSheetsPerBun, suggested, perf, noInfo };
              }

              return (
                <motion.div 
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)] shadow-sm hover:border-brand-500/30 transition-all group"
                >
                {activeStage === 'transfer' ? (
                  /* ── Transfer card ──────────────── */
                  <div className="flex items-start justify-between gap-4">
                    {row.firm_plan ? (
                      /* New style card with plan details */
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                            GH Đổ → Tách
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-bold uppercase">
                            {row.firm_plan}
                          </span>
                          <span className="text-[11px] font-bold text-[var(--text-1)] font-mono">
                            {row.production_plan?.pu_code || '---'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                            {row.production_plan?.no_order || '---'}
                          </span>
                          <span className="text-[10px] text-[var(--text-3)] font-bold">
                            {row.production_plan?.week_label || '---'}
                          </span>
                          <span className="text-[10px] text-[var(--text-3)] font-medium">
                            • {row.shift} {row.machine_id ? `• ${row.machine_id}` : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">Sản phẩm (Gốc)</span>
                            <h4 className="text-sm font-semibold text-[var(--text-2)] leading-tight">
                              {row.production_plan?.ten_san_pham || '---'}
                            </h4>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider block mb-0.5">Dòng sản phẩm</span>
                            <h4 className="text-sm font-bold text-brand-500 leading-tight">
                              {cleanProductName(row.production_plan?.ten_san_pham)}
                            </h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 pt-3 border-t border-[var(--border)]">
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ngày đổ</p>
                            <p className="text-sm font-bold text-amber-600">
                              {row.pour_date ? row.pour_date.split('-').reverse().join('/') : '---'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ca đổ</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{row.shift}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Máy đổ</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{row.machine_id || '---'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Số lượng bun giao</p>
                            <p className="text-xl font-black" style={{ color: '#f59e0b' }}>{(row.actual_bun_qty || 0).toLocaleString()} Bun</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Người khai báo</p>
                            <p className="text-xs font-bold text-[var(--text-2)]">{row.users?.full_name || '---'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Old style card without plan details */
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                            GH Đổ → Tách
                          </span>
                          <span className="text-xs font-bold text-[var(--text-2)]">{row.machine_id || '---'}</span>
                          <span className="text-xs text-[var(--text-3)] font-medium">• {row.shift}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 pt-3 border-t border-[var(--border)]">
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ngày đổ</p>
                            <p className="text-sm font-bold text-amber-600">
                              {row.pour_date ? row.pour_date.split('-').reverse().join('/') : '---'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ca đổ</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{row.shift}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Máy đổ</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{row.machine_id || '---'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Số lượng bun giao</p>
                            <p className="text-xl font-black" style={{ color: '#f59e0b' }}>{(row.actual_bun_qty || 0).toLocaleString()} Bun</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Người khai báo</p>
                            <p className="text-xs font-bold text-[var(--text-2)]">{row.users?.full_name || '---'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                      <div>
                        <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">
                          {row.pour_date ? row.pour_date.split('-').reverse().join('/') : '---'}
                        </p>
                        <p className="text-[10px] text-[var(--text-3)]">
                          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isAuthorized && (
                        <div className="flex flex-col gap-1.5 mt-3">
                          <button
                            onClick={() => handleEditClick(row)}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-indigo-500/20 active:scale-95 cursor-pointer"
                          >
                            <Pencil size={12} /> Sửa
                          </button>
                          <button
                            onClick={() => handleRevertClick(row)}
                            className="mt-0 flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-red-500/20 active:scale-95 cursor-pointer"
                          >
                            <RotateCcw size={12} /> Hồi lại
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── Normal stages card ──────────── */
                  <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-bold uppercase">
                        {row.firm_plan}
                      </span>
                      {row.is_compensation && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black uppercase">
                          Đơn bù
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-[var(--text-1)] font-mono">
                        {row.production_plan?.pu_code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                        {row.production_plan?.no_order || '---'}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] font-bold">
                        {row.production_plan?.week_label || '---'}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] font-medium">
                        • {row.shift || 'Warehouse'} {row.machine_id ? `• ${row.machine_id}` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">Sản phẩm (Gốc)</span>
                        <h4 className="text-sm font-semibold text-[var(--text-2)] leading-tight">
                          {row.production_plan?.ten_san_pham}
                        </h4>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider block mb-0.5">Dòng sản phẩm</span>
                        <h4 className="text-sm font-bold text-brand-500 leading-tight">
                          {cleanProductName(row.production_plan?.ten_san_pham)}
                        </h4>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-3 pt-3 border-t border-[var(--border)]">
                      {activeStage === 'pour' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">SL Đổ</p>
                            <p className="text-sm font-bold text-blue-600">{row.actual_bun_poured} Bun</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Máy Đổ</p>
                            <p className="text-sm font-bold text-orange-600">{row.machine_id || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Lot No</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{row.lot_no || '---'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 mb-2">
                            <div>
                              <p className="text-[10px] text-blue-600 font-bold uppercase">Lưu trữ</p>
                              <p className="text-xs font-bold text-[var(--text-1)]">{row.storage_location || '---'} / {row.storage_line || '---'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-blue-600 font-bold uppercase">Thẻ màu</p>
                              <p className="text-xs font-bold text-[var(--text-1)] uppercase">{row.color_tag || '---'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-blue-600 font-bold uppercase">Số xe</p>
                              <p className="text-xs font-bold text-[var(--text-1)]">{row.storage_carts || 0} xe</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-red-600 font-bold uppercase">Phế phẩm (NG)</p>
                              <p className={`text-xs font-bold ${row.ng_bun_qty > 0 ? 'text-red-500' : 'text-[var(--text-1)]'}`}>
                                {row.ng_bun_qty} {row.error_type ? `(${row.error_type})` : ''}
                              </p>
                            </div>
                          </div>
                          {row.downtime_reason && (
                            <div className="col-span-2 sm:col-span-3 bg-red-500/5 p-3 rounded-xl border border-red-500/10 mb-2">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] text-red-600 font-extrabold uppercase">SỰ CỐ DỪNG MÁY</p>
                                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded font-mono">
                                  {row.downtime_start} - {row.downtime_end} ({row.downtime_duration} phút)
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-1)] font-medium">
                                <span className="text-[var(--text-3)] font-bold">Nguyên nhân:</span> {row.downtime_reason}
                              </p>
                            </div>
                          )}
                          {row.note && (
                            <div className="col-span-2 sm:col-span-3 bg-gray-500/5 p-2 rounded-lg border border-gray-500/10">
                              <p className="text-[10px] text-gray-600 font-bold uppercase mb-0.5">Ghi chú</p>
                              <p className="text-xs text-[var(--text-2)] italic">"{row.note}"</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {activeStage === 'separate' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Tách / Nhận</p>
                            <p className="text-sm font-bold text-purple-600">{row.actual_bun_separated}B / {row.actual_sheet_received}S</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Loại hàng</p>
                            <p className="text-sm font-bold text-blue-600">
                               {row.product_type_abbrev === 'A' ? 'Thường (A)' :
                                row.product_type_abbrev === 'T' ? 'Test (T)' :
                                row.product_type_abbrev === 'M' ? 'Đổ tay (M)' :
                                row.product_type_abbrev === 'B' ? 'Xấu (B)' :
                                row.product_type_abbrev === 'G' ? 'Xấu (G)' :
                                row.product_type_abbrev === 'S' ? 'Sửa (S)' : (row.product_type_abbrev || '---')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Hiệu suất (%)</p>
                            <p className={(() => {
                              const perf = separateMetrics ? separateMetrics.perf : 0;
                              return `text-sm font-bold ${perf >= 95 ? 'text-green-600' : perf >= 85 ? 'text-orange-500' : 'text-red-500'}`
                            })()}>
                              {separateMetrics && separateMetrics.optimalSheetsPerBun > 0 
                                ? `${separateMetrics.perf}% (${separateMetrics.suggested} tấm tối ưu)` 
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Phế phẩm (NG)</p>
                            <div className="flex flex-col">
                              <p className={`text-sm font-bold ${row.ng_qty > 0 ? 'text-red-500' : 'text-[var(--text-1)]'}`}>
                                {row.ng_qty} {row.error_type ? `(${row.error_type})` : ''}
                              </p>
                              {(row.error_hardness_above > 0 || row.error_hardness_below > 0) && (
                                <div className="flex gap-2 mt-1">
                                  {row.error_hardness_above > 0 && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                      CỨNG TRÊN (Cũ): {row.error_hardness_above}
                                    </span>
                                  )}
                                  {row.error_hardness_below > 0 && (
                                    <span className="text-[9px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                                      CỨNG DƯỚI (Cũ): {row.error_hardness_below}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Không có thông tin</p>
                            <p className={(() => {
                              const noInfo = separateMetrics ? separateMetrics.noInfo : 0;
                              return `text-sm font-bold ${noInfo > 0 ? 'text-red-500 font-black animate-pulse' : 'text-[var(--text-1)]'}`
                            })()}>
                              {separateMetrics ? `${separateMetrics.noInfo} Sheet` : '0 Sheet'}
                            </p>
                          </div>
                        </>
                      )}

                      {activeStage === 'warehouse' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">SL Giao</p>
                            <p className="text-sm font-bold text-green-600">{row.qty_delivered_sheet} Sheet</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ngày Giao</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">
                              {row.delivery_date
                                ? (row.delivery_date.includes('-')
                                    ? row.delivery_date.split('-').reverse().map((x: string) => x.padStart(2, '0')).join('/')
                                    : (row.delivery_date.includes('/')
                                        ? row.delivery_date.split('/').map((x: string) => x.padStart(2, '0')).join('/')
                                        : new Date(row.delivery_date).toLocaleDateString('vi-VN')))
                                : '---'}
                            </p>
                          </div>
                        </>
                      )}

                      <div>
                        <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Người báo cáo / Operator</p>
                        <p className="text-xs font-bold text-[var(--text-2)]">{row.users?.full_name} / {row.operator_name || '---'}</p>
                      </div>
                      {activeStage !== 'warehouse' && (
                        <div>
                          <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Quản lý / Manager</p>
                          <p className="text-xs font-bold text-[var(--text-2)]">{row.manager_name || '---'}</p>
                        </div>
                      )}
                      {activeStage === 'separate' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Máy Tách</p>
                            <p className="text-xs font-bold text-[var(--text-1)]">{row.machine_id || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Dày Bun / Sheet</p>
                            <p className="text-xs font-bold text-[var(--text-1)]">{row.bun_thickness_mm || 0} / {row.sheet_thickness_mm || 0} mm</p>
                          </div>
                          {row.downtime_reason && (
                            <div className="col-span-2 sm:col-span-3 bg-red-500/5 p-3 rounded-xl border border-red-500/10 mb-2">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] text-red-600 font-extrabold uppercase">SỰ CỐ DỪNG MÁY</p>
                                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded font-mono">
                                  {row.downtime_start} - {row.downtime_end} ({row.downtime_duration} phút)
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-1)] font-medium">
                                <span className="text-[var(--text-3)] font-bold">Nguyên nhân:</span> {row.downtime_reason}
                              </p>
                            </div>
                          )}
                          {row.note && (
                            <div className="col-span-2 sm:col-span-3 bg-gray-500/5 p-2 rounded-lg border border-gray-500/10">
                              <p className="text-[10px] text-gray-600 font-bold uppercase mb-0.5">Ghi chú</p>
                              <p className="text-xs text-[var(--text-2)] italic">"{row.note}"</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">
                        {row.delivery_date 
                          ? row.delivery_date.split('-').reverse().map((x: string) => x.padStart(2, '0')).join('/')
                          : (row.report_date 
                              ? row.report_date.split('-').reverse().map((x: string) => x.padStart(2, '0')).join('/')
                              : formatReportDate(row.created_at, row.shift))}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)]">
                        {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {isAuthorized && (
                      <div className="flex flex-col gap-1.5 mt-3">
                        <button
                          onClick={() => handleEditClick(row)}
                          className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-indigo-500/20 active:scale-95 cursor-pointer"
                        >
                          <Pencil size={12} /> Sửa
                        </button>
                        <button
                          onClick={() => handleRevertClick(row)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-red-500/20 active:scale-95 cursor-pointer"
                        >
                          <RotateCcw size={12} /> Hồi lại
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </motion.div>
            )})}
          </>
        )}
      </div>

      {/* ── Edit Modal ────────────────────────────────── */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !editLoading && setEditingItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Pencil size={16} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-1)]">Chỉnh sửa báo cáo</h3>
                    <p className="text-[10px] text-[var(--text-3)] font-mono">{editingItem.firm_plan} · {STAGE_CONFIG[activeStage].label}</p>
                  </div>
                </div>
                <button onClick={() => setEditingItem(null)} disabled={editLoading}
                  className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors">
                  <X size={16} className="text-[var(--text-3)]" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleConfirmEdit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Common: shift, machine, report_date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ca làm việc</label>
                    <select value={editForm.shift || 'Ca 1'} onChange={e => setEditForm({ ...editForm, shift: e.target.value })}
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                      <option>Ca 1</option><option>Ca 2</option><option>Ca 3</option><option>Ca HC</option>
                    </select>
                  </div>
                  {activeStage !== 'warehouse' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Máy</label>
                      <select value={editForm.machine_id || ''} onChange={e => setEditForm({ ...editForm, machine_id: e.target.value })}
                        className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                        <option value="">-- Chọn máy --</option>
                        <option>Máy 1</option><option>Máy 2</option><option>Máy 3</option><option>Máy đổ tay</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ngày báo cáo</label>
                  <input type="date" value={editForm.report_date || editForm.delivery_date || ''}
                    onChange={e => setEditForm({ ...editForm, report_date: e.target.value, delivery_date: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono" />
                </div>

                {/* Stage-specific fields */}
                {activeStage === 'pour' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Quản lý</label>
                        <select value={editForm.manager_name || ''} onChange={e => setEditForm({ ...editForm, manager_name: e.target.value })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                          <option value="">-- Chọn --</option>
                          <option>Linh</option><option>Thảo</option><option>Tuấn Anh</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">SL Đổ (Bun)</label>
                        <input type="number" min="0" value={editForm.actual_bun_poured || 0}
                          onChange={e => setEditForm({ ...editForm, actual_bun_poured: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">NG (Bun)</label>
                        <input type="number" min="0" value={editForm.ng_bun_qty || 0}
                          onChange={e => setEditForm({ ...editForm, ng_bun_qty: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Loại lỗi</label>
                        <select value={editForm.error_type || ''} onChange={e => setEditForm({ ...editForm, error_type: e.target.value })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                          <option value="">-- Không có --</option>
                          {ERROR_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Chất rửa (kg)</label>
                        <input type="number" step="0.1" min="0" value={editForm.cleaning_agent_kg || 0}
                          onChange={e => setEditForm({ ...editForm, cleaning_agent_kg: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Rác (kg)</label>
                        <input type="number" step="0.1" min="0" value={editForm.waste_kg || 0}
                          onChange={e => setEditForm({ ...editForm, waste_kg: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                  </>
                )}

                {activeStage === 'separate' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Quản lý</label>
                        <select value={editForm.manager_name || ''} onChange={e => setEditForm({ ...editForm, manager_name: e.target.value })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                          <option value="">-- Chọn --</option>
                          <option>Linh</option><option>Thảo</option><option>Tuấn Anh</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">SL Tách (Bun)</label>
                        <input type="number" min="0" value={editForm.actual_bun_separated || 0}
                          onChange={e => setEditForm({ ...editForm, actual_bun_separated: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">SL Sheet Nhận</label>
                        <input type="number" min="0" value={editForm.actual_sheet_received || 0}
                          onChange={e => setEditForm({ ...editForm, actual_sheet_received: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">NG Sheet</label>
                        <input type="number" min="0" value={editForm.ng_qty || 0}
                          onChange={e => setEditForm({ ...editForm, ng_qty: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Dày Bun (mm)</label>
                        <input type="number" step="0.1" min="0" value={editForm.bun_thickness_mm || 0}
                          onChange={e => setEditForm({ ...editForm, bun_thickness_mm: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Dày Sheet (mm)</label>
                        <input type="number" step="0.1" min="0" value={editForm.sheet_thickness_mm || 0}
                          onChange={e => setEditForm({ ...editForm, sheet_thickness_mm: Number(e.target.value) })}
                          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Loại lỗi</label>
                      <select value={editForm.error_type || ''} onChange={e => setEditForm({ ...editForm, error_type: e.target.value })}
                        className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                        <option value="">-- Không có --</option>
                        {ERROR_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {activeStage === 'warehouse' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">SL Giao (Sheet)</label>
                    <input type="number" min="0" value={editForm.qty_delivered_sheet || 0}
                      onChange={e => setEditForm({ ...editForm, qty_delivered_sheet: Number(e.target.value) })}
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono font-bold" />
                  </div>
                )}

                {/* Đơn bù checkbox */}
                <div className="flex items-center gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                  <input type="checkbox" id="edit_is_comp" checked={editForm.is_compensation || false}
                    onChange={e => setEditForm({ ...editForm, is_compensation: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer" />
                  <label htmlFor="edit_is_comp" className="text-xs font-bold text-amber-700 dark:text-amber-400 cursor-pointer">
                    Đơn bù
                  </label>
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ghi chú</label>
                  <textarea value={editForm.note || ''} onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    rows={2} placeholder="Ghi chú..."
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all resize-none" />
                </div>

                {editMsg && (
                  <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    editMsg.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>
                    {editMsg.type === 'success' ? <Save size={14} /> : <AlertCircle size={14} />}
                    {editMsg.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingItem(null)} disabled={editLoading}
                    className="flex-1 py-2.5 rounded-xl border-2 border-[var(--border)] text-sm font-bold text-[var(--text-2)] hover:bg-[var(--border)] transition-all disabled:opacity-50">
                    Hủy
                  </button>
                  <button type="submit" disabled={editLoading}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {editLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Modal ──────────────────────── */}
      <AnimatePresence>
        {revertingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !revertLoading && setRevertingItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text-1)]">
                    Xác nhận hồi lại báo cáo?
                  </h3>
                  <p className="text-xs text-[var(--text-3)]">
                    Bạn đang thực hiện hồi lại (xóa) báo cáo đã lưu cho đơn:
                  </p>
                  <div className="bg-red-500/5 border border-red-500/10 p-2.5 rounded-xl text-xs space-y-1 mt-2 text-[var(--text-2)] font-semibold font-mono">
                    <p>• Firm Plan: <span className="text-red-500 font-bold">{revertingItem.firm_plan}</span></p>
                    <p>• Sản phẩm (Gốc): {revertingItem.production_plan?.ten_san_pham}</p>
                    <p>• Dòng sản phẩm: <span className="text-brand-500 font-bold">{cleanProductName(revertingItem.production_plan?.ten_san_pham)}</span></p>
                    <p>• Ca: {revertingItem.shift || 'Warehouse'} {revertingItem.machine_id ? `· ${revertingItem.machine_id}` : ''}</p>
                    {activeStage === 'pour' && <p>• SL Đổ: <span className="text-blue-500 font-bold">{revertingItem.actual_bun_poured} Bun</span></p>}
                    {activeStage === 'separate' && <p>• SL Tách: <span className="text-purple-500 font-bold">{revertingItem.actual_bun_separated} Bun</span></p>}
                    {activeStage === 'warehouse' && <p>• SL Giao: <span className="text-green-500 font-bold">{revertingItem.qty_delivered_sheet} Sheet</span></p>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  disabled={revertLoading}
                  onClick={() => setRevertingItem(null)}
                  className="px-4 py-2 bg-gray-500/10 hover:bg-gray-500/20 text-[var(--text-2)] rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={revertLoading}
                  onClick={handleConfirmRevert}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {revertLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      Đồng ý Hồi lại
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RefreshCw({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}
