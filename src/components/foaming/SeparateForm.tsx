'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle2, Zap, TrendingUp, Info, Plus, Trash2, AlertOctagon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser, User } from '@/types'
import { calculateSuggestedSheets, calculateEfficiency, getOptimalSheetsPerBun, THICKNESS_TABLE, calculateOptimalSheetsPerBun, distributeInteger, distributeSequential } from '@/lib/calculations'
import { getReportDateISO } from '@/lib/dateUtils'

interface SeparateFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

const ERROR_TYPES = [
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn'
]

const PRODUCT_TYPE_ABBREVS = [
  { value: 'A', label: 'Hàng thường (A)' },
  { value: 'T', label: 'Test (T)' },
  { value: 'M', label: 'Đổ tay (M)' },
  { value: 'G', label: 'Hàng xấu (G)' },
  { value: 'S', label: 'Hàng sửa (S)' },
]

type ProductType = 'thanh_pham' | 'ban_thanh_pham'

const TABS: { id: ProductType; label: string; color: string; bg: string }[] = [
  { id: 'thanh_pham', label: '✅ Thành phẩm', color: 'purple', bg: 'bg-purple-600' },
  { id: 'ban_thanh_pham', label: '🔶 Bán thành phẩm', color: 'amber', bg: 'bg-amber-500' },
]

interface NGItem {
  qty: number;
  type: string;
  note: string;
}

const defaultForm = (plan: ProductionPlan) => {
  const match = plan.ten_san_pham?.match(/([0-9.]+)\s*mm/i)
  const thickness = match ? parseFloat(match[1]) : null
  const std = thickness ? THICKNESS_TABLE[thickness] : null
  
  const hasStd = thickness !== null && std !== undefined && std !== null
  const finalThickness = thickness !== null ? thickness : 14
  const initialBunThickness = hasStd ? std.bunRef : 144

  const hour = new Date().getHours()
  let initialShift = 'Ca 1'
  if (hour >= 14 && hour < 22) initialShift = 'Ca 2'
  else if (hour >= 22 || hour < 6) initialShift = 'Ca 3'

  return {
    shift: initialShift,
    machine_id: 'Máy tách tự động 2',
    operator_name: '',
    bun_thickness_mm: initialBunThickness,
    sheet_thickness_mm: finalThickness,
    items: [
      { product_type_abbrev: 'A' as const, actual_bun_separated: plan.sl_bun_can_tach || 0, actual_sheet_received: plan.sl_sheet || 0, ng_items: [] as NGItem[] }
    ],
    lot_no: '',
    manager_name: '',
    note: '',
    is_compensation: false,
  }
}

export default function SeparateForm({ plan, user, onSuccess }: SeparateFormProps) {
  const [productType, setProductType] = useState<ProductType>('thanh_pham')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [operators, setOperators] = useState<User[]>([])
  const [standards, setStandards] = useState<any[]>([])
  const [formData, setFormData] = useState(defaultForm(plan))

  const [hasDowntime, setHasDowntime] = useState(false)
  const [downtimeReason, setDowntimeReason] = useState('')
  const [downtimeStartHour, setDowntimeStartHour] = useState('00')
  const [downtimeStartMinute, setDowntimeStartMinute] = useState('00')
  const [downtimeEndHour, setDowntimeEndHour] = useState('00')
  const [downtimeEndMinute, setDowntimeEndMinute] = useState('00')

  const getDowntimeDuration = () => {
    if (!hasDowntime || !downtimeReason.trim()) return 0
    const sh = parseInt(downtimeStartHour, 10)
    const sm = parseInt(downtimeStartMinute, 10)
    const eh = parseInt(downtimeEndHour, 10)
    const em = parseInt(downtimeEndMinute, 10)
    const startTotal = sh * 60 + sm
    const endTotal = eh * 60 + em
    return endTotal >= startTotal
      ? endTotal - startTotal
      : (24 * 60 - startTotal) + endTotal
  }

  useEffect(() => {
    supabase.from('users').select('*')
      .or('and(department.ilike.%FOAMING Splitting%,position.in.("team leader","Operator","Team Leader","operator","Team leader")),msnv.in.("02126","04462")')
      .order('full_name')
      .then(({ data }) => setOperators(data || []))

    supabase.from('thickness_standards').select('*')
      .then(({ data }) => setStandards(data || []))
  }, [])

  // Xác định độ dày từ tên sản phẩm
  const identifiedThickness = (() => {
    const match = plan.ten_san_pham?.match(/([0-9.]+)\s*mm/i)
    return match ? parseFloat(match[1]) : null
  })()

  const dbStd = identifiedThickness !== null ? standards.find(s => s.thickness_mm === identifiedThickness) : null
  const localStd = identifiedThickness !== null ? THICKNESS_TABLE[identifiedThickness] : null
  const hasStandard = !!(dbStd || localStd)

  // Kiểm tra dung sai độ dày (±0.2mm)
  const isOutOfTolerance = identifiedThickness !== null && formData.sheet_thickness_mm !== undefined && formData.sheet_thickness_mm !== null &&
    Math.abs(Number(formData.sheet_thickness_mm) - identifiedThickness) > 0.2

  const standard = dbStd 
    ? {
        bunRef: dbStd.total_bun_thickness_mm || 144,
        tolerance: dbStd.tolerance_mm || 0,
        tp: dbStd.optimal_sheets_per_bun || 0,
        btp: Math.round((dbStd.optimal_sheets_per_bun || 0) / 2)
      }
    : (localStd 
        ? localStd 
        : {
            bunRef: 144,
            tolerance: 0,
            tp: calculateOptimalSheetsPerBun(identifiedThickness || 14),
            btp: Math.round(calculateOptimalSheetsPerBun(identifiedThickness || 14) / 2)
          }
      )

  // Đồng bộ hóa dữ liệu form khi plan hoặc danh sách tiêu chuẩn thay đổi
  useEffect(() => {
    let initialBunThickness = 144
    if (dbStd) {
      initialBunThickness = dbStd.total_bun_thickness_mm || 144
    } else if (localStd) {
      initialBunThickness = localStd.bunRef
    }

    setFormData(prev => ({
      ...prev,
      bun_thickness_mm: initialBunThickness,
      sheet_thickness_mm: identifiedThickness !== null ? identifiedThickness : 14,
      items: [
        { product_type_abbrev: 'A' as const, actual_bun_separated: plan.sl_bun_can_tach || 0, actual_sheet_received: plan.sl_sheet || 0, ng_items: [] as NGItem[] }
      ],
    }))
  }, [plan, standards, identifiedThickness, dbStd, localStd])

  // Reset form khi đổi tab
  const handleTabChange = (tab: ProductType) => {
    setProductType(tab)
    setMessage(null)
    
    let initialBunThickness = 144
    if (dbStd) {
      initialBunThickness = dbStd.total_bun_thickness_mm || 144
    } else if (localStd) {
      initialBunThickness = localStd.bunRef
    }

    setFormData(prev => ({
      ...prev,
      bun_thickness_mm: initialBunThickness,
      sheet_thickness_mm: identifiedThickness !== null ? identifiedThickness : 14,
      items: [
        { product_type_abbrev: 'A' as const, actual_bun_separated: plan.sl_bun_can_tach || 0, actual_sheet_received: plan.sl_sheet || 0, ng_items: [] as NGItem[] }
      ],
      note: '',
      is_compensation: false,
    }))
  }
  const isTP = productType === 'thanh_pham'

  // Số sheet/bun tối ưu theo loại
  const optimalPerBun = standard ? (isTP ? standard.tp : standard.btp) : 0

  const totalBunsSeparated = formData.items.reduce((sum, item) => sum + Number(item.actual_bun_separated || 0), 0)
  const totalSheetsReceived = formData.items.reduce((sum, item) => sum + Number(item.actual_sheet_received || 0), 0)
  const totalNGQty = formData.items.reduce((sum, item) => {
    const itemNGSum = item.ng_items.reduce((s, x) => s + (x.qty || 0), 0)
    return sum + itemNGSum
  }, 0)

  const suggestedSheets = optimalPerBun > 0
    ? Math.round(totalBunsSeparated * optimalPerBun)
    : 0
  const efficiency = suggestedSheets > 0
    ? Math.round((totalSheetsReceived / suggestedSheets) * 100)
    : 0

  const addNGItem = (itemIndex: number) => {
    const updated = [...formData.items]
    updated[itemIndex].ng_items.push({ qty: 0, type: ERROR_TYPES[0], note: '' })
    setFormData({ ...formData, items: updated })
  }

  const removeNGItem = (itemIndex: number, ngIndex: number) => {
    const updated = [...formData.items]
    updated[itemIndex].ng_items = updated[itemIndex].ng_items.filter((_, idx) => idx !== ngIndex)
    setFormData({ ...formData, items: updated })
  }

  const updateNGItem = (itemIndex: number, ngIndex: number, field: 'qty' | 'type' | 'note', value: any) => {
    const updated = [...formData.items]
    updated[itemIndex].ng_items[ngIndex] = {
      ...updated[itemIndex].ng_items[ngIndex],
      [field]: value
    }
    setFormData({ ...formData, items: updated })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOutOfTolerance) {
      setMessage({
        type: 'error',
        text: `Độ dày nhập vào (${formData.sheet_thickness_mm}mm) lệch quá dung sai cho phép (±0.2mm) so với độ dày quy định (${identifiedThickness}mm). Đơn bán thành phẩm không cần nhập vào hệ thống.`
      })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const noInfoSheets = suggestedSheets - totalSheetsReceived - totalNGQty

      const plansList = plan.firm_plan.split('|').map(x => x.trim()).filter(Boolean)

      // Query previous separate reports to check cumulative sheets (for both main and compensation)
      const { data: prevReports, error: prevErr } = await supabase
        .from('foaming_separate_reports')
        .select('actual_sheet_received, firm_plan')
        .in('firm_plan', plansList)
        .eq('product_type', productType)

      if (prevErr) throw prevErr

      const previousSheets = prevReports?.reduce((sum, r) => sum + (r.actual_sheet_received || 0), 0) || 0
      const currentInputSheets = totalSheetsReceived
      const totalInputSheets = previousSheets + currentInputSheets

      // Query previous separate reports to check cumulative separated buns (only main reports)
      const { data: prevSepReports, error: prevSepErr } = await supabase
        .from('foaming_separate_reports')
        .select('actual_bun_separated, is_compensation, firm_plan')
        .in('firm_plan', plansList)

      if (prevSepErr) throw prevSepErr

      const previousMainBuns = prevSepReports
        ?.filter(r => !r.is_compensation)
        .reduce((sum, r) => sum + (r.actual_bun_separated || 0), 0) || 0
      const currentInputBuns = totalBunsSeparated
      const totalInputBuns = previousMainBuns + currentInputBuns

      let maxOptimalSheets = 0
      let targetBuns = 0
      let plansData: any[] = []

      if (plansList.length > 1) {
        // Query targets for each plan
        const { data, error: fetchErr } = await supabase
          .from('production_plan')
          .select('firm_plan, sl_bun_can_tach, sl_sheet')
          .in('firm_plan', plansList)
        if (fetchErr) throw fetchErr
        plansData = data || []

        plansList.forEach(fp => {
          const p = plansData.find(x => x.firm_plan === fp)
          if (p) {
            const opt = (p.sl_bun_can_tach || 0) * optimalPerBun
            maxOptimalSheets += opt > 0 ? opt : (p.sl_sheet || 0)
            targetBuns += p.sl_bun_can_tach || 0
          }
        })
      } else {
        const opt = (plan.sl_bun_can_tach || 0) * optimalPerBun
        maxOptimalSheets = opt > 0 ? opt : (plan.sl_sheet || 0)
        targetBuns = plan.sl_bun_can_tach || 0
      }

      // Check max optimal sheets (always enforced for both main and compensation if target is specified)
      if (maxOptimalSheets > 0 && totalInputSheets > maxOptimalSheets) {
        throw new Error(
          `Số lượng sheet nhận vượt quá giới hạn tối ưu của đơn hàng này (tính cả đơn chính và đơn bù). (Lũy kế đã nhập trước đó: ${previousSheets} sheet, Nhập lần này: ${currentInputSheets} sheet, Số lượng tối ưu tối đa cho phép: ${maxOptimalSheets} sheet). Vui lòng điều chỉnh lại.`
        )
      }

      // Check max separated buns for main orders (if target is specified)
      if (targetBuns > 0 && !formData.is_compensation && totalInputBuns > targetBuns) {
        throw new Error(
          `Số lượng bun tách vượt quá giới hạn của đơn hàng này. (Lũy kế đơn chính đã nhập trước đó: ${previousMainBuns} bun, Nhập lần này: ${currentInputBuns} bun, Số lượng tối đa cho phép: ${targetBuns} bun). Vui lòng điều chỉnh lại hoặc chọn "Đơn bù" nếu đây là lượt chạy bù hàng NG.`
        )
      }

      if (suggestedSheets > 0 && noInfoSheets > 0) {
        const confirmSave = window.confirm(
          `Cảnh báo: Hiện tại vẫn còn ${noInfoSheets} sheet chưa có thông tin, bạn có muốn lưu dữ liệu báo cáo này hay không?`
        )
        if (!confirmSave) {
          setLoading(false)
          return
        }
      }

      if (plansList.length > 1) {
        const targets = plansList.map(fp => {
          const p = plansData.find(x => x.firm_plan === fp)
          return p ? (p.sl_bun_can_tach || 0) : 0
        })

        // Tính số lượng bun và sheet đã thống kê từ trước cho mỗi đơn thành phần
        const alreadySeparatedMap = new Map<string, number>()
        prevSepReports?.filter(r => !r.is_compensation).forEach(r => {
          alreadySeparatedMap.set(r.firm_plan, (alreadySeparatedMap.get(r.firm_plan) || 0) + (r.actual_bun_separated || 0))
        })

        const alreadyReceivedSheetsMap = new Map<string, number>()
        prevReports?.forEach(r => {
          alreadyReceivedSheetsMap.set(r.firm_plan, (alreadyReceivedSheetsMap.get(r.firm_plan) || 0) + (r.actual_sheet_received || 0))
        })

        // Tính kế hoạch sheet cho từng đơn hàng
        const targetSheets = plansList.map(fp => {
          const p = plansData.find(x => x.firm_plan === fp)
          if (!p) return 0
          const opt = (p.sl_bun_can_tach || 0) * optimalPerBun
          return opt > 0 ? opt : (p.sl_sheet || 0)
        })

        const remainingTargetBuns = plansList.map((fp, idx) => {
          const target = targets[idx] || 0
          const separated = alreadySeparatedMap.get(fp) || 0
          return Math.max(0, target - separated)
        })

        const remainingTargetSheets = plansList.map((fp, idx) => {
          const target = targetSheets[idx] || 0
          const received = alreadyReceivedSheetsMap.get(fp) || 0
          return Math.max(0, target - received)
        })

        const recordsToInsert: any[] = []

        formData.items.forEach(item => {
          const itemNGSum = item.ng_items.reduce((s, x) => s + (x.qty || 0), 0)
          const itemCombinedError = item.ng_items
            .filter(x => x.qty > 0)
            .map(x => x.type === 'Lỗi khác' && x.note ? `${x.type}: ${x.note.trim()} (${x.qty})` : `${x.type} (${x.qty})`)
            .join(', ')

          const distributedBun = distributeSequential(Number(item.actual_bun_separated), remainingTargetBuns)
          const distributedSheet = distributeSequential(Number(item.actual_sheet_received), remainingTargetSheets)
          const distributedNG = distributeInteger(itemNGSum, distributedSheet)

          plansList.forEach((fp, idx) => {
            const groupNote = `[Báo cáo gộp nhóm: ${plan.firm_plan}]`
            const finalNote = formData.note.trim() 
              ? `${formData.note.trim()} ${groupNote}`
              : groupNote

            recordsToInsert.push({
              firm_plan: fp,
              shift: formData.shift,
              machine_id: formData.machine_id,
              operator_name: formData.operator_name,
              bun_thickness_mm: Number(formData.bun_thickness_mm),
              sheet_thickness_mm: Number(formData.sheet_thickness_mm),
              actual_bun_separated: distributedBun[idx],
              actual_sheet_received: distributedSheet[idx],
              lot_no: formData.lot_no,
              report_date: getReportDateISO(new Date(), formData.shift),
              ng_qty: distributedNG[idx],
              ng_bun_qty: 0,
              error_type: itemCombinedError || '',
              manager_name: formData.manager_name,
              product_type: productType,
              product_type_abbrev: item.product_type_abbrev,
              note: finalNote,
              is_compensation: formData.is_compensation,
              recorder_id: user.id,
              downtime_reason: hasDowntime && downtimeReason.trim() ? downtimeReason.trim() : null,
              downtime_start: hasDowntime && downtimeReason.trim() ? `${downtimeStartHour}:${downtimeStartMinute}` : null,
              downtime_end: hasDowntime && downtimeReason.trim() ? `${downtimeEndHour}:${downtimeEndMinute}` : null,
              downtime_duration: hasDowntime && downtimeReason.trim() ? getDowntimeDuration() : null,
            })
          })
        })

        const { error: insertErr } = await supabase.from('foaming_separate_reports').insert(recordsToInsert)
        if (insertErr) throw insertErr
      } else {
        const recordsToInsert = formData.items.map(item => {
          const itemNGSum = item.ng_items.reduce((s, x) => s + (x.qty || 0), 0)
          const itemCombinedError = item.ng_items
            .filter(x => x.qty > 0)
            .map(x => x.type === 'Lỗi khác' && x.note ? `${x.type}: ${x.note.trim()} (${x.qty})` : `${x.type} (${x.qty})`)
            .join(', ')

          return {
            firm_plan: plan.firm_plan,
            shift: formData.shift,
            machine_id: formData.machine_id,
            operator_name: formData.operator_name,
            bun_thickness_mm: Number(formData.bun_thickness_mm),
            sheet_thickness_mm: Number(formData.sheet_thickness_mm),
            actual_bun_separated: Number(item.actual_bun_separated),
            actual_sheet_received: Number(item.actual_sheet_received),
            lot_no: formData.lot_no,
            report_date: getReportDateISO(new Date(), formData.shift),
            ng_qty: itemNGSum,
            ng_bun_qty: 0,
            error_type: itemCombinedError || '',
            manager_name: formData.manager_name,
            product_type: productType,
            product_type_abbrev: item.product_type_abbrev,
            note: formData.note.trim() || null,
            is_compensation: formData.is_compensation,
            recorder_id: user.id,
            downtime_reason: hasDowntime && downtimeReason.trim() ? downtimeReason.trim() : null,
            downtime_start: hasDowntime && downtimeReason.trim() ? `${downtimeStartHour}:${downtimeStartMinute}` : null,
            downtime_end: hasDowntime && downtimeReason.trim() ? `${downtimeEndHour}:${downtimeEndMinute}` : null,
            downtime_duration: hasDowntime && downtimeReason.trim() ? getDowntimeDuration() : null,
          }
        })

        const { error } = await supabase.from('foaming_separate_reports').insert(recordsToInsert)
        if (error) throw error
      }
      const label = isTP ? 'Thành phẩm' : 'Bán thành phẩm'
      setMessage({ type: 'success', text: `Đã lưu báo cáo Tách (${label}) thành công!` })
      setTimeout(() => onSuccess(), 2000)
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Lỗi khi lưu: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const accentColor = isTP ? 'purple' : 'amber'
  const focusClass = isTP ? 'focus:border-purple-500' : 'focus:border-amber-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] shadow-md"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
          ${isTP ? 'bg-purple-500/10 text-purple-500' : 'bg-amber-500/10 text-amber-500'}`}>
          TÁCH
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--text-1)]">Báo cáo Sản xuất Khu vực Tách</h3>
          <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest">{plan.firm_plan}</p>
        </div>
      </div>

      {/* Badge loại */}
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#9333ea' }} />
        Báo cáo THÀNH PHẨM
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ca + Máy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ca làm việc</label>
            <select value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })}
              className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all`}>
              <option value="Ca 1">Ca 1</option><option value="Ca 2">Ca 2</option><option value="Ca 3">Ca 3</option><option value="Ca HC">Ca HC</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Máy tách</label>
            <select value={formData.machine_id} required onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
              className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all`}>
              <option value="">-- Chọn máy tách --</option>
              <option>Máy tách tự động 2</option>
              <option>Máy tách tự động 3</option>
              <option>Máy tách bán tự động 1</option>
              <option>Máy tách cơ 1</option>
              <option>Máy tách cơ 2</option>
              <option>Máy tách cơ 3</option>
              <option>Máy tách cơ 4</option>
              <option>Máy tách cơ 5</option>
            </select>
          </div>
        </div>

        {/* Operator + Lot + Manager */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Người vận hành (Operator)</label>
            <select value={formData.operator_name} required onChange={e => setFormData({ ...formData, operator_name: e.target.value })}
              className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all`}>
              <option value="">-- Chọn người vận hành --</option>
              {operators.map(op => <option key={op.id} value={op.full_name}>{op.full_name} ({op.msnv})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Quản lý (Manager)</label>
            <select value={formData.manager_name} required onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
              className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all`}>
              <option value="">-- Chọn quản lý --</option>
              <option value="Linh">Linh</option>
              <option value="Thảo">Thảo</option>
              <option value="Tuấn Anh">Tuấn Anh</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Lot No (Số lô)</label>
            <input type="text" value={formData.lot_no} required onChange={e => setFormData({ ...formData, lot_no: e.target.value })}
              className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all`} />
          </div>
        </div>

        {/* Đơn bù checkbox */}
        <div className="flex items-center gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 hover:bg-amber-500/10 transition-colors">
          <input
            type="checkbox"
            id="is_compensation_sep"
            checked={formData.is_compensation}
            onChange={(e) => setFormData({ ...formData, is_compensation: e.target.checked })}
            className="w-5 h-5 rounded border-2 border-[var(--border)] text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500 transition-all"
          />
          <label htmlFor="is_compensation_sep" className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase select-none cursor-pointer flex-1">
            Đơn bù (Báo cáo này bù cho hàng phế phẩm NG)
          </label>
        </div>

        {/* Độ dày */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-[var(--text-2)] uppercase">Độ dày bun sau tách da (mm)</label>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Tự động</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={formData.bun_thickness_mm}
              readOnly
              className={`w-full bg-gray-50 dark:bg-black/10 border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-bold outline-none transition-all font-mono cursor-not-allowed`}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-[var(--text-2)] uppercase">Độ dày sheet thực tế (mm)</label>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Gợi ý</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={formData.sheet_thickness_mm}
              required
              onChange={e => setFormData({ ...formData, sheet_thickness_mm: Number(e.target.value) })}
              className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all font-mono`}
            />
            {isOutOfTolerance && (
              <div className="flex items-start gap-2.5 text-xs text-red-700 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-2 animate-fadeIn font-sans">
                <AlertOctagon size={16} className="mt-0.5 shrink-0 text-red-600 animate-bounce" />
                <div>
                  <p className="font-bold">Độ dày lệch quá dung sai cho phép (±0.2mm)</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    Độ dày nhập vào ({formData.sheet_thickness_mm}mm) lệch quá 0.2mm so với độ dày quy định ({identifiedThickness}mm). Đơn bán thành phẩm không cần nhập vào hệ thống.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Phần khai báo Loại hàng & Số lượng (Mới) --- */}
        <div className="space-y-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-blue-600 uppercase">Khai báo loại hàng & Số lượng</h4>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  items: [...prev.items, { product_type_abbrev: 'A', actual_bun_separated: 0, actual_sheet_received: 0, ng_items: [] }]
                }))
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={14} /> THÊM LOẠI HÀNG
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 space-y-4 shadow-sm hover:shadow-md transition-all">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Loại hàng */}
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Loại hàng</label>
                    <select
                      value={item.product_type_abbrev}
                      onChange={e => {
                        const updated = [...formData.items]
                        updated[index].product_type_abbrev = e.target.value as any
                        setFormData({ ...formData, items: updated })
                      }}
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                    >
                      {PRODUCT_TYPE_ABBREVS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Số bun thực tế Tách */}
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Số bun Tách</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={item.actual_bun_separated || ''}
                      onChange={e => {
                        const updated = [...formData.items]
                        updated[index].actual_bun_separated = Number(e.target.value)
                        setFormData({ ...formData, items: updated })
                      }}
                      placeholder="Số bun..."
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  {/* Số sheet thực tế nhận */}
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Số sheet Nhận</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={item.actual_sheet_received || ''}
                      onChange={e => {
                        const updated = [...formData.items]
                        updated[index].actual_sheet_received = Number(e.target.value)
                        setFormData({ ...formData, items: updated })
                      }}
                      placeholder="Số sheet..."
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  {/* Nút Thêm Lỗi / Xoá */}
                  <div className="sm:col-span-3 flex gap-2 justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => addNGItem(index)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-600 rounded-xl text-xs font-bold hover:bg-red-500/15 transition-all"
                    >
                      <Plus size={14} /> THÊM LỖI PHẾ
                    </button>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            items: prev.items.filter((_, idx) => idx !== index)
                          }))
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Xoá dòng"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách lỗi phế phẩm của loại hàng này */}
                {item.ng_items.length > 0 && (
                  <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 space-y-3">
                    <p className="text-[9px] font-bold text-red-600 uppercase ml-1">Chi tiết phế phẩm (NG):</p>
                    <div className="space-y-3">
                      {item.ng_items.map((ng, ngIdx) => (
                        <div key={ngIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pb-3 border-b border-red-500/10 last:border-b-0 last:pb-0">
                          <div className="sm:col-span-3 space-y-1.5">
                            <label className="text-[9px] font-semibold text-red-500/60 uppercase ml-1">Số lượng (Sheet)</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={ng.qty || ''}
                              onChange={e => updateNGItem(index, ngIdx, 'qty', Number(e.target.value))}
                              placeholder="Số phế..."
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-red-500 outline-none transition-all"
                            />
                          </div>
                          <div className="sm:col-span-5 space-y-1.5">
                            <label className="text-[9px] font-semibold text-red-500/60 uppercase ml-1">Loại lỗi</label>
                            <select
                              value={ng.type}
                              onChange={e => updateNGItem(index, ngIdx, 'type', e.target.value)}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs focus:border-red-500 outline-none transition-all"
                            >
                              {ERROR_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-3 space-y-1.5">
                            {ng.type === 'Lỗi khác' && (
                              <>
                                <label className="text-[9px] font-semibold text-red-500/60 uppercase ml-1">Chi tiết lỗi khác</label>
                                <input
                                  type="text"
                                  value={ng.note || ''}
                                  onChange={e => updateNGItem(index, ngIdx, 'note', e.target.value)}
                                  placeholder="Mô tả lỗi khác..."
                                  className="w-full bg-[var(--bg-card)] border-2 border-red-500/20 rounded-lg px-3 py-1.5 text-xs focus:border-red-500 outline-none transition-all"
                                />
                              </>
                            )}
                          </div>
                          <div className="sm:col-span-1 flex justify-center pb-0.5">
                            <button
                              type="button"
                              onClick={() => removeNGItem(index, ngIdx)}
                              className="p-1.5 text-red-400 hover:text-red-500 rounded transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phân tích hiệu suất */}
        <AnimatePresence>
          {plan && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              {standard ? (
                <div className={`rounded-2xl border-2 border-dashed p-4 space-y-4
                  ${isTP ? 'bg-purple-500/5 border-purple-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  


                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className={isTP ? 'text-purple-500' : 'text-amber-500'} />
                      <h4 className={`text-xs font-bold uppercase ${isTP ? 'text-purple-600' : 'text-amber-600'}`}>
                        Phân tích hiệu suất tách
                      </h4>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[10px] font-bold
                      ${isTP ? 'bg-purple-500' : 'bg-amber-500'}`}>
                      <Zap size={10} fill="white" />
                      {isTP ? 'THÀNH PHẨM' : 'BÁN THÀNH PHẨM'} {identifiedThickness !== null ? identifiedThickness : 14}MM
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-purple-500/10">
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">
                        {isTP ? 'Số sheet tối ưu (Gợi ý)' : 'Số sheet BTP (Gợi ý)'}
                      </p>
                      <p className={`text-lg font-mono font-bold ${isTP ? 'text-purple-600' : 'text-amber-600'}`}>
                        {suggestedSheets} <span className="text-xs font-medium text-[var(--text-3)]">Sheet</span>
                      </p>
                      <p className="text-[9px] text-[var(--text-3)] mt-1">
                        (Dựa trên {optimalPerBun} sheet/bun)
                      </p>
                    </div>

                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-blue-500/10">
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">Tham chiếu độ dày (mm)</p>
                      <p className="text-lg font-mono font-bold text-blue-600">
                        Bun: {standard.bunRef} <span className="text-xs font-medium text-[var(--text-3)]">mm</span>
                      </p>
                      <p className="text-[9px] text-[var(--text-3)] mt-1">
                        Dung sai: ±{standard.tolerance} mm
                      </p>
                    </div>

                    <div className={`p-3 rounded-xl border ${efficiency >= 95 ? 'bg-green-500/10 border-green-500/20' :
                        efficiency >= 85 ? 'bg-orange-500/10 border-orange-500/20' :
                          'bg-red-500/10 border-red-500/20'}`}>
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">% Đạt tiêu chuẩn</p>
                      <div className="flex items-end gap-2">
                        <p className={`text-2xl font-mono font-bold ${efficiency >= 95 ? 'text-green-600' :
                            efficiency >= 85 ? 'text-orange-600' : 'text-red-600'}`}>
                          {efficiency}%
                        </p>
                        <p className="text-[10px] font-bold mb-1.5 uppercase opacity-70">
                          {efficiency >= 95 ? 'Tốt' : efficiency >= 85 ? 'Đạt' : 'Thấp'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {efficiency < 85 && totalSheetsReceived > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-red-600 font-medium bg-red-500/5 p-2 rounded-lg">
                      <Info size={12} />
                      Số lượng sheet thực tế thấp hơn tiêu chuẩn ({suggestedSheets} sheet). Vui lòng kiểm tra lại.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-orange-500/5 rounded-2xl border border-orange-500/20 p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Info size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-700">Độ dày {identifiedThickness}mm chưa có tiêu chuẩn</p>
                    <p className="text-[10px] text-orange-600">Vui lòng kiểm tra lại tên sản phẩm hoặc cập nhật bảng tiêu chuẩn.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>



        {/* --- Phần khai báo dừng máy --- */}
        <div className="space-y-4 bg-gray-500/5 p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_downtime_sep"
              checked={hasDowntime}
              onChange={(e) => setHasDowntime(e.target.checked)}
              className={`w-5 h-5 rounded border-2 border-[var(--border)] ${isTP ? 'text-purple-600 focus:ring-purple-500 accent-purple-500' : 'text-amber-600 focus:ring-amber-500 accent-amber-500'} cursor-pointer transition-all`}
            />
            <label htmlFor="has_downtime_sep" className="text-xs font-black text-[var(--text-2)] uppercase select-none cursor-pointer">
              Có sự cố dừng máy / Gặp sự cố thiết bị
            </label>
          </div>

          <AnimatePresence>
            {hasDowntime && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 border-t border-[var(--border)] overflow-hidden"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Nguyên nhân dừng máy (nhập tay)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập nguyên nhân dừng máy..."
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                    className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                      text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Dừng từ lúc</label>
                    <div className="flex gap-2">
                      <select
                        value={downtimeStartHour}
                        onChange={(e) => setDowntimeStartHour(e.target.value)}
                        className={`flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold ${focusClass} outline-none transition-all`}
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hs = String(h).padStart(2, '0')
                          return <option key={hs} value={hs}>{hs} giờ</option>
                        })}
                      </select>
                      <select
                        value={downtimeStartMinute}
                        onChange={(e) => setDowntimeStartMinute(e.target.value)}
                        className={`flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold ${focusClass} outline-none transition-all`}
                      >
                        {Array.from({ length: 60 }).map((_, m) => {
                          const ms = String(m).padStart(2, '0')
                          return <option key={ms} value={ms}>{ms} phút</option>
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Dừng đến lúc</label>
                    <div className="flex gap-2">
                      <select
                        value={downtimeEndHour}
                        onChange={(e) => setDowntimeEndHour(e.target.value)}
                        className={`flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold ${focusClass} outline-none transition-all`}
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hs = String(h).padStart(2, '0')
                          return <option key={hs} value={hs}>{hs} giờ</option>
                        })}
                      </select>
                      <select
                        value={downtimeEndMinute}
                        onChange={(e) => setDowntimeEndMinute(e.target.value)}
                        className={`flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold ${focusClass} outline-none transition-all`}
                      >
                        {Array.from({ length: 60 }).map((_, m) => {
                          const ms = String(m).padStart(2, '0')
                          return <option key={ms} value={ms}>{ms} phút</option>
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-between ${isTP ? 'bg-purple-500/5 border-purple-500/10 text-purple-600' : 'bg-amber-500/5 border-amber-500/10 text-amber-600'}`}>
                  <span>Tổng thời gian dừng máy:</span>
                  <span>{getDowntimeDuration()} phút ({Math.floor(getDowntimeDuration() / 60)}h {getDowntimeDuration() % 60}m)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* General Note */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ghi chú</label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Ghi chú thêm nếu có..."
            rows={3}
            className={`w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
              text-[var(--text-1)] font-medium ${focusClass} outline-none transition-all resize-none`}
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success'
              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
            {message.type === 'success' && <CheckCircle2 size={16} />}
            {message.text}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading || isOutOfTolerance}
          className={`w-full py-4 text-white rounded-xl font-bold text-base shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3
            ${isOutOfTolerance
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'}`}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <Save size={20} />
              LƯU BÁO CÁO THÀNH PHẨM
            </>
          )}
        </button>
      </form>
    </motion.div>
  )
}
