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

interface ProductionProgressTabProps {
  user: SessionUser
}

// ─── Helper ─────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  // report_date: YYYY-MM-DD or created_at: ISO
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
  sepEntries: ShiftEntry[]
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
function ShiftTable({ entries, color }: { entries: ShiftEntry[]; color: string }) {
  if (entries.length === 0) return (
    <p className="text-[10px] text-[var(--text-3)] italic">Chưa có dữ liệu</p>
  )

  // Group by date, then list shifts
  const grouped = entries.reduce<Record<string, ShiftEntry[]>>((acc, e) => {
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
                {r.shift}: <strong>{r.qty.toLocaleString('vi-VN')}</strong> bun
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Order Card ──────────────────────────────────────────────
function OrderCard({ order }: { order: OrderProgress }) {
  const [open, setOpen] = useState(false)
  const { plan } = order

  const pourPct = plan.sl_bun_can_do && plan.sl_bun_can_do > 0
    ? Math.min((order.pourTotal / plan.sl_bun_can_do) * 100, 100) : 0
  const sepPct = plan.sl_bun_can_tach && plan.sl_bun_can_tach > 0
    ? Math.min((order.sepTotal / plan.sl_bun_can_tach) * 100, 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* ── Header row ──────────────────────────────── */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setOpen(o => !o)}
      >
        {/* Status stripe */}
        <div className="w-1 self-stretch rounded-full shrink-0"
          style={{
            background: order.overallStatus === 'completed' ? '#22c55e'
              : order.overallStatus === 'in_progress' ? '#f59e0b' : '#e2e8f0'
          }}
        />

        <div className="flex-1 min-w-0">
          {/* Row 1: firm_plan + status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-3)]">
                {plan.week_label || 'N/A'}
              </span>
              <span className="text-xs font-black text-[var(--text-1)] truncate">
                {plan.firm_plan || '—'}
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <StatusBadge status={order.overallStatus} />
              {open ? <ChevronUp size={14} className="text-[var(--text-3)]" />
                : <ChevronDown size={14} className="text-[var(--text-3)]" />}
            </div>
          </div>

          {/* Row 2: product name */}
          <p className="text-sm font-bold text-[var(--text-1)] mb-2 truncate">
            {plan.ten_san_pham || '—'}
          </p>

          {/* Row 3: Plan info pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {plan.sl_bun_can_do != null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                <Droplets size={9} />
                Đổ: {plan.sl_bun_can_do.toLocaleString('vi-VN')} bun
              </span>
            )}
            {plan.sl_bun_can_tach != null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
                <Scissors size={9} />
                Tách: {plan.sl_bun_can_tach.toLocaleString('vi-VN')} bun
              </span>
            )}
            {plan.sl_sheet != null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                <Layers size={9} />
                {plan.sl_sheet.toLocaleString('vi-VN')} sheet
              </span>
            )}
            {plan.completion_date && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                <Target size={9} />
                Deadline: {fmtDatePlan(plan.completion_date)}
              </span>
            )}
          </div>

          {/* Row 4: Mini progress bars */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                  <Droplets size={8} /> Đổ
                </span>
                <span className="text-[9px] font-black text-blue-700">
                  {order.pourTotal.toLocaleString('vi-VN')}/{(plan.sl_bun_can_do ?? 0).toLocaleString('vi-VN')}
                  <span className="ml-1 text-blue-500">({pourPct.toFixed(0)}%)</span>
                </span>
              </div>
              <ProgressBar value={order.pourTotal} max={plan.sl_bun_can_do ?? 0} color="#3b82f6" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-purple-600 uppercase flex items-center gap-1">
                  <Scissors size={8} /> Tách
                </span>
                <span className="text-[9px] font-black text-purple-700">
                  {order.sepTotal.toLocaleString('vi-VN')}/{(plan.sl_bun_can_tach ?? 0).toLocaleString('vi-VN')}
                  <span className="ml-1 text-purple-500">({sepPct.toFixed(0)}%)</span>
                </span>
              </div>
              <ProgressBar value={order.sepTotal} max={plan.sl_bun_can_tach ?? 0} color="#a855f7" />
            </div>
          </div>
        </div>
      </button>

      {/* ── Expanded detail ──────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] space-y-4">

              {/* Plan detail */}
              <div className="mt-3 p-3 rounded-xl bg-[var(--bg-input)] space-y-1.5">
                <p className="text-[10px] font-black uppercase text-[var(--text-3)] mb-2 flex items-center gap-1">
                  <Package size={10} /> Thông tin kế hoạch
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  {[
                    { label: 'Tên SP', val: plan.ten_san_pham },
                    { label: 'Bun Code', val: plan.bun_code },
                    { label: 'PU Code', val: plan.pu_code },
                    { label: 'No. Order', val: plan.no_order },
                    { label: 'Số Sheet', val: plan.sl_sheet != null ? `${plan.sl_sheet.toLocaleString('vi-VN')} sheet` : null },
                    { label: 'Bun cần đổ', val: plan.sl_bun_can_do != null ? `${plan.sl_bun_can_do.toLocaleString('vi-VN')} bun` : null },
                    { label: 'Bun cần tách', val: plan.sl_bun_can_tach != null ? `${plan.sl_bun_can_tach.toLocaleString('vi-VN')} bun` : null },
                    { label: 'Deadline', val: plan.completion_date ? fmtDate(plan.completion_date) : null },
                  ].map(row => row.val ? (
                    <div key={row.label}>
                      <span className="text-[var(--text-3)] font-medium">{row.label}: </span>
                      <span className="font-bold text-[var(--text-1)]">{row.val}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Đổ detail */}
              <div>
                <p className="text-[11px] font-black uppercase text-blue-600 mb-2 flex items-center gap-1.5">
                  <Droplets size={12} />
                  Công đoạn Đổ · Đã hoàn thành: <span className="text-blue-700">{order.pourTotal.toLocaleString('vi-VN')} bun</span>
                </p>
                <ShiftTable entries={order.pourEntries} color="#3b82f6" />
              </div>

              {/* Tách detail */}
              <div>
                <p className="text-[11px] font-black uppercase text-purple-600 mb-2 flex items-center gap-1.5">
                  <Scissors size={12} />
                  Công đoạn Tách · Đã hoàn thành: <span className="text-purple-700">{order.sepTotal.toLocaleString('vi-VN')} bun</span>
                </p>
                <ShiftTable entries={order.sepEntries} color="#a855f7" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Tab ────────────────────────────────────────────────
export default function ProductionProgressTab({ user: _user }: ProductionProgressTabProps) {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [pourReports, setPourReports] = useState<FoamingPourReport[]>([])
  const [sepReports, setSepReports] = useState<FoamingSeparateReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState<string>('Tất cả')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [planRes, pourRes, sepRes] = await Promise.all([
      supabase.from('production_plans').select('*').order('week_label', { ascending: false }),
      supabase.from('foaming_pour_reports').select('id,firm_plan,shift,actual_bun_poured,report_date,created_at'),
      supabase.from('foaming_separate_reports').select('id,firm_plan,shift,actual_bun_separated,report_date,created_at'),
    ])
    setPlans((planRes.data as ProductionPlan[]) ?? [])
    setPourReports((pourRes.data as FoamingPourReport[]) ?? [])
    setSepReports((sepRes.data as FoamingSeparateReport[]) ?? [])
    setLoading(false)
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
      const sepEntries: ShiftEntry[] = seps.map(r => ({
        date: getRecordDate(r),
        shift: r.shift || 'Ca ?',
        qty: r.actual_bun_separated || 0,
      }))
      const sepTotal = sepEntries.reduce((s, e) => s + e.qty, 0)

      // Sort entries by date asc
      pourEntries.sort((a, b) => a.date.localeCompare(b.date))
      sepEntries.sort((a, b) => a.date.localeCompare(b.date))

      const pourDone = (plan.sl_bun_can_do ?? 0) > 0 && pourTotal >= (plan.sl_bun_can_do ?? 0)
      const sepDone = (plan.sl_bun_can_tach ?? 0) > 0 && sepTotal >= (plan.sl_bun_can_tach ?? 0)

      let overallStatus: OrderProgress['overallStatus'] = 'pending'
      if (pourTotal > 0 || sepTotal > 0) overallStatus = 'in_progress'
      if (pourDone && sepDone) overallStatus = 'completed'

      return { plan, pourTotal, pourEntries, pourDone, sepTotal, sepEntries, sepDone, overallStatus }
    })
  }, [plans, pourReports, sepReports])

  // Unique weeks
  const weekLabels = useMemo(() => {
    const set = new Set(plans.map(p => p.week_label).filter(Boolean))
    return ['Tất cả', ...Array.from(set).sort((a, b) => b!.localeCompare(a!))] as string[]
  }, [plans])

  // Filtered
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase()
      const matchSearch = !q
        || (o.plan.firm_plan ?? '').toLowerCase().includes(q)
        || (o.plan.ten_san_pham ?? '').toLowerCase().includes(q)
        || (o.plan.bun_code ?? '').toLowerCase().includes(q)
        || (o.plan.no_order ?? '').toLowerCase().includes(q)
      const matchWeek = weekFilter === 'Tất cả' || o.plan.week_label === weekFilter
      const matchStatus = statusFilter === 'all' || o.overallStatus === statusFilter
      return matchSearch && matchWeek && matchStatus
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
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Tìm đơn hàng, tên SP, bun code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 text-xs py-2"
          />
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
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderCard key={order.plan.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
