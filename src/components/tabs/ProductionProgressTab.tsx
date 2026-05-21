'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, Search, Calendar,
  Droplets, Scissors, Package, Target, Layers
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, ProductionPlan, FoamingPourReport, FoamingSeparateReport } from '@/types'
import { getOptimalSheetsPerBun } from '@/lib/calculations'

interface ProductionProgressTabProps {
  user: SessionUser
}

// ─── Constants ──────────────────────────────────────────────
// Chỉ hiển thị đơn từ W19-2026 trở đi
const MIN_WEEK = 19
const MIN_YEAR = 2026

// ─── Helper ─────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function fmtDatePlan(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

// Get report date from record (prefer report_date, else created_at with 6h rule)
function getRecordDate(r: { report_date?: string; created_at: string }): string {
  if (r.report_date) return r.report_date
  const d = new Date(r.created_at)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// Parse "W19-2026" or "W20-2026 - L1" → { week: 19, year: 2026 }
function parseWeekLabel(label: string | null | undefined): { week: number; year: number } | null {
  if (!label) return null
  const m = label.match(/W(\d+)-(\d{4})/)
  if (!m) return null
  return { week: parseInt(m[1]), year: parseInt(m[2]) }
}

// Returns true if plan is >= W19-2026 or is China CN or Sample
function isWeekAllowed(label: string | null | undefined): boolean {
  if (label === 'China CN' || label === 'Sample') return true
  const parsed = parseWeekLabel(label)
  if (!parsed) return false
  if (parsed.year < MIN_YEAR) return false
  if (parsed.year === MIN_YEAR && parsed.week < MIN_WEEK) return false
  return true
}

// Parse completion date (e.g. "16/May", "22/Dec", "2026-05-19") into Date object
function parseDeadlineDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const clean = dateStr.trim()
  if (!clean) return null

  // If standard ISO: YYYY-MM-DD
  if (clean.includes('-') && !clean.includes('/')) {
    const d = new Date(clean)
    if (!isNaN(d.getTime())) return d
  }

  // Format: "15/Dec", "6/May", "20/Apr", etc.
  const parts = clean.split('/')
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10)
    const monthStr = parts[1].trim().toLowerCase()
    
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }
    
    if (months[monthStr] !== undefined && !isNaN(day)) {
      // Default to 2026 since we filtered out 2025
      return new Date(2026, months[monthStr], day)
    }
  }
  
  const fallback = new Date(clean)
  return isNaN(fallback.getTime()) ? null : fallback
}

// Get deadline text, status color and badge class
function getDeadlineStatus(dateStr: string | null | undefined, isCompleted: boolean) {
  if (!dateStr) return { text: '—', badgeBg: 'bg-transparent text-[var(--text-3)]' }
  const d = parseDeadlineDate(dateStr)
  if (!d) return { text: dateStr, badgeBg: 'bg-transparent text-[var(--text-3)]' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)

  const diffTime = d.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`

  if (isCompleted) {
    return { 
      text: formattedDate, 
      badgeBg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
    }
  }

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return { 
      text: `${formattedDate} (Trễ ${absDays}n)`, 
      badgeBg: 'bg-red-500/15 text-red-500 border border-red-500/40 font-black animate-pulse' 
    }
  } else if (diffDays === 0) {
    return { 
      text: `${formattedDate} (Hôm nay)`, 
      badgeBg: 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold' 
    }
  } else {
    return { 
      text: formattedDate, 
      badgeBg: 'bg-[var(--bg-input)] text-[var(--text-2)] border border-[var(--border-color)]' 
    }
  }
}

// Generate list of active week labels starting from W19-2026 up to W52-2028, plus China CN and Sample
function generateAllowedWeeks(): string[] {
  const list: string[] = ['China CN', 'Sample']
  // 2026: W19 -> W52
  for (let i = 19; i <= 52; i++) {
    list.push(`W${i}-2026`)
  }
  // 2027: W1 -> W52
  for (let i = 1; i <= 52; i++) {
    list.push(`W${i}-2027`)
  }
  // 2028: W1 -> W52
  for (let i = 1; i <= 52; i++) {
    list.push(`W${i}-2028`)
  }
  return list
}

// ─── Sub-types ──────────────────────────────────────────────
type ShiftEntry = {
  date: string      // YYYY-MM-DD
  shift: string
  qty: number
}

type OrderProgress = {
  plan: ProductionPlan
  // Đổ
  pourTotal: number
  pourEntries: ShiftEntry[]
  pourDone: boolean
  // Tách
  sepTotal: number
  sepTotalSheets: number
  plannedOptimalSheets: number
  sepEntries: any[]
  sepDone: boolean
  // Overall
  overallStatus: 'completed' | 'in_progress' | 'pending'
}

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderProgress['overallStatus'] }) {
  const map = {
    completed: { label: 'Hoàn thành', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle2 },
    in_progress: { label: 'Đang SX', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
    pending: { label: 'Chưa bắt đầu', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: AlertCircle },
  }
  const s = map[status]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
      <s.icon size={10} />
      {s.label}
    </span>
  )
}

// ─── Progress Bar ────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

// ─── Shift Entries Table ─────────────────────────────────────
function ShiftTable({ entries, color, isSeparate = false }: { entries: any[]; color: string; isSeparate?: boolean }) {
  if (entries.length === 0) return (
    <p className="text-[10px] text-[var(--text-3)] italic">Chưa có dữ liệu</p>
  )

  // Group by date, then list shifts
  const grouped = entries.reduce<Record<string, any[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  return (
    <div className="space-y-1.5">
      {Object.entries(grouped).map(([date, rows]) => (
        <div key={date} className="flex flex-wrap items-start gap-2">
          <span className="text-[10px] font-bold text-[var(--text-2)] min-w-[52px] pt-0.5">
            {fmtDate(date)}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {rows.map((r, i) => (
              <span key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
              >
                {r.shift}: <strong>{isSeparate ? r.sheets.toLocaleString('vi-VN') : r.qty.toLocaleString('vi-VN')}</strong> {isSeparate ? 'sheet' : 'bun'}
                {isSeparate && <span className="opacity-65">({r.qty} bun)</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Order Row (Airport Board Style) ─────────────────────────
function OrderRow({ order }: { order: OrderProgress }) {
  const [open, setOpen] = useState(false)
  const { plan } = order

  const pourPct = plan.sl_bun_can_do && plan.sl_bun_can_do > 0
    ? Math.min((order.pourTotal / plan.sl_bun_can_do) * 100, 100) : 0
  const sepPct = order.plannedOptimalSheets && order.plannedOptimalSheets > 0
    ? Math.min((order.sepTotalSheets / order.plannedOptimalSheets) * 100, 100) : 0

  const isCompleted = order.overallStatus === 'completed'
  const dlStatus = getDeadlineStatus(plan.completion_date, isCompleted)

  return (
    <>
      <tr 
        className={`hover:bg-[var(--bg-input)]/45 transition-colors cursor-pointer text-xs font-semibold ${
          open ? 'bg-[var(--bg-input)]/25' : ''
        }`}
        onClick={() => setOpen(o => !o)}
      >
        {/* Trạng thái */}
        <td className="py-3 px-4 text-center">
          <StatusBadge status={order.overallStatus} />
        </td>

        {/* Hạn HT */}
        <td className="py-3 px-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold ${dlStatus.badgeBg}`}>
            {dlStatus.text}
          </span>
        </td>

        {/* Tuần / No.Order */}
        <td className="py-3 px-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-3)] font-black uppercase tracking-wider">{plan.week_label || 'N/A'}</span>
            <span className="text-xs font-bold text-[var(--text-1)]">{plan.no_order || '—'}</span>
          </div>
        </td>

        {/* Firm Plan */}
        <td className="py-3 px-4 font-mono font-bold text-[var(--text-2)]">
          {plan.firm_plan || '—'}
        </td>

        {/* Tên sản phẩm */}
        <td className="py-3 px-4">
          <div className="flex flex-col max-w-[320px]">
            <span className="text-xs text-[var(--text-1)] font-bold truncate" title={plan.ten_san_pham ?? undefined}>
              {plan.ten_san_pham || '—'}
            </span>
            <span className="text-[9px] text-[var(--text-3)]">
              {plan.bun_code ? `Bun: ${plan.bun_code}` : ''} {plan.pu_code ? ` | PU: ${plan.pu_code}` : ''}
            </span>
          </div>
        </td>

        {/* Tiến độ Đổ */}
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] mb-0.5">
              <span className="text-blue-500 font-black">
                {order.pourTotal.toLocaleString('vi-VN')} / {(plan.sl_bun_can_do ?? 0).toLocaleString('vi-VN')}
              </span>
              <span className="font-extrabold text-blue-600">({pourPct.toFixed(0)}%)</span>
            </div>
            <ProgressBar value={order.pourTotal} max={plan.sl_bun_can_do ?? 0} color="#3b82f6" />
          </div>
        </td>

        {/* Tiến độ Tách */}
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] mb-0.5">
              <span className="text-purple-500 font-black">
                {order.sepTotalSheets.toLocaleString('vi-VN')} / {order.plannedOptimalSheets.toLocaleString('vi-VN')} sheet
              </span>
              <span className="font-extrabold text-purple-600">({sepPct.toFixed(0)}%)</span>
            </div>
            <ProgressBar value={order.sepTotalSheets} max={order.plannedOptimalSheets} color="#a855f7" />
            <p className="text-[9px] text-[var(--text-3)] text-right mt-0.5">
              (Đã tách {order.sepTotal} bun)
            </p>
          </div>
        </td>

        {/* Action Toggle */}
        <td className="py-3 px-2 text-center" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
          <button className="p-1 rounded hover:bg-[var(--bg-input)] text-[var(--text-3)]">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>
      </tr>

      {/* Expanded Details Row */}
      {open && (
        <tr className="bg-[var(--bg-input)]/10">
          <td colSpan={8} className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Cột 1: Thông tin kế hoạch */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/45 border border-[var(--border-color)] space-y-2">
                <p className="text-[10px] font-black uppercase text-[var(--text-3)] flex items-center gap-1">
                  <Package size={10} /> Chi tiết đơn hàng
                </p>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'Tên sản phẩm', val: plan.ten_san_pham },
                    { label: 'Bun Code', val: plan.bun_code },
                    { label: 'PU Code', val: plan.pu_code },
                    { label: 'Số Sheet cần', val: plan.sl_sheet != null ? `${plan.sl_sheet.toLocaleString('vi-VN')} sheet` : null },
                    { label: 'Yêu cầu Đổ', val: plan.sl_bun_can_do != null ? `${plan.sl_bun_can_do.toLocaleString('vi-VN')} bun` : null },
                    { label: 'Yêu cầu Tách', val: plan.sl_bun_can_tach != null ? `${plan.sl_bun_can_tach.toLocaleString('vi-VN')} bun` : null },
                    { label: 'Hạn hoàn thành', val: plan.completion_date ? fmtDate(plan.completion_date) : null },
                  ].map(row => row.val ? (
                    <div key={row.label} className="flex justify-between border-b border-[var(--border-color)]/30 pb-1">
                      <span className="text-[var(--text-3)] font-medium">{row.label}</span>
                      <span className="font-bold text-[var(--text-1)] text-right max-w-[200px] truncate" title={row.val.toString()}>{row.val}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Cột 2: Lịch sử Đổ */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/45 border border-[var(--border-color)] space-y-2">
                <p className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1.5 border-b border-[var(--border-color)]/30 pb-1">
                  <Droplets size={11} /> Lịch sử công đoạn Đổ
                </p>
                <div className="max-h-[160px] overflow-y-auto pr-1">
                  <ShiftTable entries={order.pourEntries} color="#3b82f6" />
                </div>
              </div>

              {/* Cột 3: Lịch sử Tách */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/45 border border-[var(--border-color)] space-y-2">
                <p className="text-[10px] font-black uppercase text-purple-600 flex items-center gap-1.5 border-b border-[var(--border-color)]/30 pb-1">
                  <Scissors size={11} /> Lịch sử công đoạn Tách
                </p>
                <div className="max-h-[160px] overflow-y-auto pr-1">
                  <ShiftTable entries={order.sepEntries} color="#a855f7" isSeparate={true} />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main Tab ────────────────────────────────────────────────
export default function ProductionProgressTab({ user: _user }: ProductionProgressTabProps) {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [pourReports, setPourReports] = useState<FoamingPourReport[]>([])
  const [sepReports, setSepReports] = useState<FoamingSeparateReport[]>([])
  const [standards, setStandards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState<string>('Tất cả')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const weeksList = generateAllowedWeeks()
      const { data: plansData, error: plansErr } = await supabase
        .from('production_plan')
        .select('*')
        .in('week_label', weeksList)
        .order('week_label', { ascending: false })

      if (plansErr) throw plansErr

      const allPlans = (plansData as ProductionPlan[]) ?? []
      const allowedFirmPlans = allPlans.map(p => p.firm_plan?.trim()).filter(Boolean) as string[]

      if (allowedFirmPlans.length === 0) {
        setPlans([])
        setPourReports([])
        setSepReports([])
        return
      }

      // Fetch reports matching only the current active firm plans and thickness standards
      const [pourRes, sepRes, standardsRes] = await Promise.all([
        supabase
          .from('foaming_pour_reports')
          .select('id,firm_plan,shift,actual_bun_poured,report_date,created_at')
          .in('firm_plan', allowedFirmPlans),
        supabase
          .from('foaming_separate_reports')
          .select('id,firm_plan,shift,actual_bun_separated,actual_sheet_received,product_type,report_date,created_at')
          .in('firm_plan', allowedFirmPlans),
        supabase
          .from('thickness_standards')
          .select('*')
      ])

      setPlans(allPlans)
      setPourReports((pourRes.data as FoamingPourReport[]) ?? [])
      setSepReports((sepRes.data as FoamingSeparateReport[]) ?? [])
      setStandards((standardsRes.data as any[]) ?? [])
    } catch (err) {
      console.error('Error fetching production progress data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Build order progress
  const orders = useMemo<OrderProgress[]>(() => {
    return plans.map(plan => {
      const fp = plan.firm_plan?.trim()

      // Pour entries for this plan
      const pours = pourReports.filter(r => r.firm_plan?.trim() === fp)
      const pourEntries: ShiftEntry[] = pours.map(r => ({
        date: getRecordDate(r),
        shift: r.shift || 'Ca ?',
        qty: r.actual_bun_poured || 0,
      }))
      const pourTotal = pourEntries.reduce((s, e) => s + e.qty, 0)

      // Sep entries for this plan
      const seps = sepReports.filter(r => r.firm_plan?.trim() === fp)
      const sepEntries = seps.map(r => ({
        date: getRecordDate(r),
        shift: r.shift || 'Ca ?',
        qty: r.actual_bun_separated || 0,
        sheets: r.actual_sheet_received || 0,
        productType: r.product_type || 'thanh_pham'
      }))
      const sepTotal = sepEntries.reduce((s, e) => s + e.qty, 0)
      const sepTotalSheets = sepEntries.reduce((s, e) => s + e.sheets, 0)

      // Identify thickness
      const match = plan.ten_san_pham?.match(/([0-9.]+)\s*mm/i)
      const thickness = match ? parseFloat(match[1]) : null

      const firstSepType = seps.length > 0 ? (seps[0].product_type || 'thanh_pham') : 'thanh_pham'
      const optimalPerBun = getOptimalSheetsPerBun(thickness, firstSepType === 'thanh_pham', standards)

      let plannedOptimalSheets = (plan.sl_bun_can_tach || 0) * optimalPerBun
      if (plannedOptimalSheets === 0) {
        plannedOptimalSheets = plan.sl_sheet || 0
      }

      // Sort entries by date asc
      pourEntries.sort((a, b) => a.date.localeCompare(b.date))
      sepEntries.sort((a, b) => a.date.localeCompare(b.date))

      const pourDone = (plan.sl_bun_can_do ?? 0) > 0 && pourTotal >= (plan.sl_bun_can_do ?? 0)
      const sepDone = plannedOptimalSheets > 0 && sepTotalSheets >= plannedOptimalSheets

      let overallStatus: OrderProgress['overallStatus'] = 'pending'
      if (pourTotal > 0 || sepTotalSheets > 0) overallStatus = 'in_progress'
      if (pourDone && sepDone) overallStatus = 'completed'

      return {
        plan,
        pourTotal,
        pourEntries,
        pourDone,
        sepTotal,
        sepTotalSheets,
        plannedOptimalSheets,
        sepEntries,
        sepDone,
        overallStatus
      }
    })
  }, [plans, pourReports, sepReports, standards])

  // Unique weeks
  const weekLabels = useMemo(() => {
    const set = new Set(plans.map(p => p.week_label).filter(Boolean))
    return ['Tất cả', ...Array.from(set).sort((a, b) => b!.localeCompare(a!))] as string[]
  }, [plans])

  // Filtered — hỗ trợ tìm kiếm nhiều đơn phân cách bởi | + Sắp xếp theo deadline tăng dần
  const filtered = useMemo(() => {
    const rawTokens = search
      .split(/[|\n]/)
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)

    const matched = orders.filter(o => {
      const matchSearch = rawTokens.length === 0
        || rawTokens.some(tok =>
          (o.plan.no_order ?? '').toLowerCase().includes(tok) ||
          (o.plan.firm_plan ?? '').toLowerCase().includes(tok)
        )
      const matchWeek = weekFilter === 'Tất cả' || o.plan.week_label === weekFilter
      const matchStatus = statusFilter === 'all' || o.overallStatus === statusFilter
      return matchSearch && matchWeek && matchStatus
    })

    // Sắp xếp: Deadline trễ nhất (gần nhất) lên đầu, đơn không deadline ở cuối
    return matched.sort((a, b) => {
      const dateA = parseDeadlineDate(a.plan.completion_date)
      const dateB = parseDeadlineDate(b.plan.completion_date)
      
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      
      return dateA.getTime() - dateB.getTime()
    })
  }, [orders, search, weekFilter, statusFilter])

  // Summary
  const summary = useMemo(() => ({
    total: filtered.length,
    completed: filtered.filter(o => o.overallStatus === 'completed').length,
    inProgress: filtered.filter(o => o.overallStatus === 'in_progress').length,
    pending: filtered.filter(o => o.overallStatus === 'pending').length,
  }), [filtered])

  return (
    <div className="space-y-4 pb-24">

      {/* ── Title row ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-[var(--text-1)]">
              Tiến độ sản xuất
            </h2>
            <p className="text-[10px] text-[var(--text-3)]">Tổng hợp theo kế hoạch · Đổ &amp; Tách</p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* ── KPI strip ──────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Tổng đơn', val: summary.total, color: '#6366f1' },
          { label: 'Hoàn thành', val: summary.completed, color: '#22c55e' },
          { label: 'Đang SX', val: summary.inProgress, color: '#f59e0b' },
          { label: 'Chưa bắt đầu', val: summary.pending, color: '#94a3b8' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[9px] font-bold text-[var(--text-3)] leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        {/* ── Multi-search: NO.ORDER / Firm Plan ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Search size={11} className="text-[#6366f1]" />
            <p className="text-[10px] font-black uppercase text-[#6366f1]">Tìm theo NO.ORDER / Firm Plan</p>
            <span className="text-[9px] text-[var(--text-3)] font-medium italic ml-auto">
              Dùng <code className="bg-[var(--bg-input)] px-1 py-0.5 rounded text-[10px] font-black">|</code> để tra nhiều đơn
            </span>
          </div>

          <div className="relative">
            <textarea
              rows={2}
              placeholder={`VD: F-2026-05-101 | FPRO-260504-0002\nHoặc: F-2026-04-217 | F-2026-05-51 | F-2026-05-52`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field w-full text-xs py-2 px-3 resize-none font-mono leading-relaxed"
              style={{ minHeight: 60 }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-2 right-2 p-1 rounded-full bg-[var(--bg-input)] hover:bg-red-500/10 text-[var(--text-3)] hover:text-red-500 transition-all"
                title="Xóa"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* Active token badges */}
          {search.split(/[|\n]/).map(t => t.trim()).filter(Boolean).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {search.split(/[|\n]/).map(t => t.trim()).filter(Boolean).map((tok, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                  {tok}
                </span>
              ))}
              <span className="text-[9px] text-[var(--text-3)] self-center">
                → {filtered.length} kết quả
              </span>
            </div>
          )}
        </div>

        {/* Week filter */}
        <div>
          <p className="text-[9px] font-black uppercase text-[var(--text-3)] mb-1.5 flex items-center gap-1">
            <Calendar size={9} /> Tuần kế hoạch
          </p>
          <div className="flex flex-wrap gap-1.5">
            {weekLabels.map(w => (
              <button key={w} onClick={() => setWeekFilter(w)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  weekFilter === w
                    ? 'bg-[#6366f1] text-white shadow'
                    : 'bg-[var(--bg-input)] text-[var(--text-2)] hover:bg-[#6366f1]/10'
                }`}>
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          {([
            { id: 'all', label: 'Tất cả' },
            { id: 'completed', label: '✓ Hoàn thành' },
            { id: 'in_progress', label: '⚡ Đang SX' },
            { id: 'pending', label: '○ Chưa bắt đầu' },
          ] as const).map(s => (
            <button key={s.id} onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                statusFilter === s.id
                  ? 'bg-[#0ea5e9] text-white shadow'
                  : 'bg-[var(--bg-input)] text-[var(--text-2)] hover:bg-[#0ea5e9]/10'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-bold animate-pulse">Đang tải tiến độ...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <ClipboardList size={40} className="text-[var(--text-3)] opacity-40" />
          <p className="text-sm font-bold text-[var(--text-2)]">Không có đơn hàng phù hợp</p>
          <p className="text-xs text-[var(--text-3)]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-[var(--bg-input)] border-b border-[var(--border-color)] text-[10px] uppercase font-black text-[var(--text-3)] tracking-wider">
                <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                <th className="py-3 px-4 w-32">Hạn HT (Deadline)</th>
                <th className="py-3 px-4 w-36">Tuần / No.Order</th>
                <th className="py-3 px-4 w-40">Firm Plan</th>
                <th className="py-3 px-4">Tên Sản Phẩm</th>
                <th className="py-3 px-4 w-48">Tiến độ Đổ</th>
                <th className="py-3 px-4 w-48">Tiến độ Tách</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map(order => (
                <OrderRow key={order.plan.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
