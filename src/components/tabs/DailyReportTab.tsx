'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Calendar, ChevronLeft, ChevronRight,
  Activity, Zap, Factory, CheckCircle2, TrendingUp,
  Clock, Sun, Moon, Sunrise, Filter, X, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FoamingPourReport, FoamingSeparateReport } from '@/types'
import { getReportTimeRange, formatReportDate } from '@/lib/dateUtils'

interface DailyReportTabProps { user: SessionUser }

type AggregatedDay = {
  date: string
  poured: number
  separated: number
  pouredByShift: Record<string, number>
  separatedByShift: Record<string, number>
}

type AreaFilter = 'all' | 'pour' | 'separate'
const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']
const SHIFT_COLORS: Record<string, string> = {
  'Ca 1': 'text-orange-500', 'Ca 2': 'text-yellow-500',
  'Ca 3': 'text-blue-500', 'Ca HC': 'text-purple-500'
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function firstDayOfMonth() {
  const d = new Date(); d.setDate(1)
  return d.toISOString().split('T')[0]
}

function SvgBarChart({
  data, maxVal, showPour, showSep
}: {
  data: AggregatedDay[]
  maxVal: number
  showPour: boolean
  showSep: boolean
}) {
  const W = 800
  const H = 280
  const PAD_L = 44
  const PAD_R = 8
  const PAD_T = 20
  const PAD_B = 48
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const n = data.length
  const groupW = chartW / Math.max(n, 1)
  const barCount = (showPour ? 1 : 0) + (showSep ? 1 : 0)
  const barW = Math.max(4, Math.min(18, groupW / (barCount + 1)))
  const gridLines = 5
  const yTick = (i: number) => PAD_T + (chartH / gridLines) * i

  return (
    <div className="w-full overflow-x-auto">
      <style>{`
        .svg-bar { transition: opacity 0.15s; }
        .svg-bar-group:hover .svg-bar { opacity: 0.4; }
        .svg-bar-group:hover .svg-bar-hovered { opacity: 1; }
        .svg-tooltip { display: none; }
        .svg-bar-group:hover .svg-tooltip { display: block; }
      `}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', minWidth: Math.max(W, n * 22) }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gPour" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="gSep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="gPourH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="gSepH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0004" />
          </filter>
        </defs>

        {/* Y-axis grid */}
        {[...Array(gridLines + 1)].map((_, i) => {
          const y = yTick(i)
          const val = Math.round(maxVal * (1 - i / gridLines))
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={i === gridLines ? '#cbd5e1' : '#e2e8f0'}
                strokeWidth={i === gridLines ? 1.5 : 1}
                strokeDasharray={i === gridLines ? '0' : '4 4'}
              />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end"
                fontSize="9" fill="#94a3b8" fontWeight="600">
                {val > 0 ? val.toLocaleString() : '0'}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((day, idx) => {
          const cx = PAD_L + groupW * idx + groupW / 2
          const totalBars = (showPour ? 1 : 0) + (showSep ? 1 : 0)
          const offset = totalBars === 2 ? barW / 2 + 1 : 0
          const pourX = cx - offset - barW / 2
          const sepX = totalBars === 2 ? cx + offset - barW / 2 : cx - barW / 2

          const pourH = maxVal > 0 ? (day.poured / maxVal) * chartH : 0
          const sepH = maxVal > 0 ? (day.separated / maxVal) * chartH : 0
          const pourY = PAD_T + chartH - pourH
          const sepY = PAD_T + chartH - sepH

          const labelX = cx
          const labelY = PAD_T + chartH + 14

          return (
            <g key={day.date} className="svg-bar-group" style={{ cursor: 'default' }}>
              {/* Pour bar */}
              {showPour && pourH > 0 && (
                <>
                  <rect
                    className="svg-bar svg-bar-hovered"
                    x={pourX} y={pourY} width={barW} height={pourH}
                    rx="3" fill="url(#gPour)" filter="url(#shadow)"
                  />
                  {pourH > 16 && (
                    <text x={pourX + barW / 2} y={pourY - 4} textAnchor="middle"
                      fontSize="8" fill="#3b82f6" fontWeight="800" className="svg-bar svg-bar-hovered">
                      {day.poured}
                    </text>
                  )}
                </>
              )}
              {/* Sep bar */}
              {showSep && sepH > 0 && (
                <>
                  <rect
                    className="svg-bar svg-bar-hovered"
                    x={sepX} y={sepY} width={barW} height={sepH}
                    rx="3" fill="url(#gSep)" filter="url(#shadow)"
                  />
                  {sepH > 16 && (
                    <text x={sepX + barW / 2} y={sepY - 4} textAnchor="middle"
                      fontSize="8" fill="#a855f7" fontWeight="800" className="svg-bar svg-bar-hovered">
                      {day.separated}
                    </text>
                  )}
                </>
              )}

              {/* Tooltip on hover */}
              {(day.poured > 0 || day.separated > 0) && (
                <g className="svg-tooltip">
                  <rect x={cx - 38} y={PAD_T - 4} width={76} height={showPour && showSep ? 38 : 22}
                    rx="6" fill="#1e293b" opacity="0.92" />
                  {showPour && (
                    <text x={cx} y={PAD_T + 11} textAnchor="middle" fontSize="9" fill="#93c5fd" fontWeight="700">
                      Đổ: {day.poured.toLocaleString()}
                    </text>
                  )}
                  {showSep && (
                    <text x={cx} y={PAD_T + (showPour ? 25 : 11)} textAnchor="middle" fontSize="9" fill="#c4b5fd" fontWeight="700">
                      Tách: {day.separated.toLocaleString()}
                    </text>
                  )}
                </g>
              )}

              {/* X-axis label */}
              <text x={labelX} y={labelY} textAnchor="middle"
                fontSize="9" fill="#94a3b8" fontWeight="700">
                {day.date.split('/')[0]}/{day.date.split('/')[1]}
              </text>
            </g>
          )
        })}

        {/* Y-axis line */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH}
          stroke="#cbd5e1" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

export default function DailyReportTab({ user }: DailyReportTabProps) {

  const [loading, setLoading] = useState(true)
  const [pourReports, setPourReports] = useState<FoamingPourReport[]>([])
  const [separateReports, setSeparateReports] = useState<FoamingSeparateReport[]>([])

  // Filters
  const [startDate, setStartDate] = useState(firstDayOfMonth())
  const [endDate, setEndDate] = useState(todayStr())
  const [shiftFilter, setShiftFilter] = useState<string>('Tất cả')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getReportTimeRange(startDate, endDate)
    const [pourRes, sepRes] = await Promise.all([
      supabase.from('foaming_pour_reports').select('*')
        .gte('created_at', start).lt('created_at', end),
      supabase.from('foaming_separate_reports').select('*')
        .gte('created_at', start).lt('created_at', end),
    ])
    setPourReports((pourRes.data as any) || [])
    setSeparateReports((sepRes.data as any) || [])
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  // Build date list between startDate and endDate
  const dateList = useMemo(() => {
    const list: string[] = []
    const cur = new Date(startDate + 'T00:00:00')
    const last = new Date(endDate + 'T00:00:00')
    while (cur <= last) {
      const d = cur.getDate(), m = cur.getMonth() + 1, y = cur.getFullYear()
      list.push(`${d}/${m}/${y}`)
      cur.setDate(cur.getDate() + 1)
    }
    return list
  }, [startDate, endDate])

  const aggregatedData = useMemo(() => {
    const dailyMap = new Map<string, AggregatedDay>()
    dateList.forEach(dateStr => {
      dailyMap.set(dateStr, { date: dateStr, poured: 0, separated: 0, pouredByShift: {}, separatedByShift: {} })
    })

    const norm = (dStr: string) => {
      const [d, m, y] = dStr.split('/')
      return `${parseInt(d)}/${parseInt(m)}/${y}`
    }

    if (areaFilter !== 'separate') {
      pourReports.forEach(r => {
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return
        let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at)
        d = norm(d)
        const day = dailyMap.get(d)
        if (day) {
          day.poured += (r.actual_bun_poured || 0)
          const s = r.shift || 'Ca 1'
          day.pouredByShift[s] = (day.pouredByShift[s] || 0) + (r.actual_bun_poured || 0)
        }
      })
    }

    if (areaFilter !== 'pour') {
      separateReports.forEach(r => {
        // Tính TẤT CẢ loại sản phẩm (TP + BTP) để khớp với báo cáo
        if (shiftFilter !== 'Tất cả' && r.shift !== shiftFilter) return
        let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at)
        d = norm(d)
        const day = dailyMap.get(d)
        if (day) {
          day.separated += (r.actual_bun_separated || 0)
          const s = r.shift || 'Ca 1'
          day.separatedByShift[s] = (day.separatedByShift[s] || 0) + (r.actual_bun_separated || 0)
        }
      })
    }

    return Array.from(dailyMap.values())
  }, [pourReports, separateReports, dateList, shiftFilter, areaFilter])

  const totals = useMemo(() => aggregatedData.reduce(
    (acc, d) => ({ poured: acc.poured + d.poured, separated: acc.separated + d.separated }),
    { poured: 0, separated: 0 }
  ), [aggregatedData])

  const yieldRate = totals.poured > 0 ? (totals.separated / totals.poured) * 100 : 0

  const activeFiltersCount = [
    shiftFilter !== 'Tất cả',
    areaFilter !== 'all',
    startDate !== firstDayOfMonth() || endDate !== todayStr()
  ].filter(Boolean).length

  const resetFilters = () => {
    setShiftFilter('Tất cả')
    setAreaFilter('all')
    setStartDate(firstDayOfMonth())
    setEndDate(todayStr())
  }

  const visibleData = aggregatedData.filter(d => d.poured > 0 || d.separated > 0)
  const maxVal = Math.max(...aggregatedData.map(d => Math.max(d.poured, d.separated))) || 100

  return (
    <div className="space-y-5 pb-20">

      {/* ── Filter Panel ───────────────────────────── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <Filter size={16} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight">Bộ lọc báo cáo</h3>
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button onClick={resetFilters}
                className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all">
                <X size={12} /> Xóa lọc
              </button>
            )}
            <button onClick={() => setShowFilters(!showFilters)}
              className="text-xs font-bold text-brand-500 hover:underline">
              {showFilters ? 'Thu gọn ▲' : 'Mở rộng ▼'}
            </button>
          </div>
        </div>

        {/* Date range — always visible */}
        <div className="bg-orange-500/5 p-3 rounded-xl border border-orange-500/10">
          <p className="text-[10px] font-bold text-orange-600 uppercase mb-2 flex items-center gap-1">
            <Calendar size={11} /> Khoảng thời gian
          </p>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono" />
            <ArrowRight size={16} className="text-orange-300 shrink-0" />
            <input type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono" />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Shift filter */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1">Ca làm việc</p>
              <div className="flex flex-wrap gap-1.5">
                {['Tất cả', ...SHIFTS].map(s => (
                  <button key={s} onClick={() => setShiftFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      shiftFilter === s
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-brand-500/10'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Area filter */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1">Khu vực / Công đoạn</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: '🏭 Tất cả' },
                  { id: 'pour', label: '💧 Khu vực Đổ' },
                  { id: 'separate', label: '✂️ Khu vực Tách' },
                ].map(a => (
                  <button key={a.id} onClick={() => setAreaFilter(a.id as AreaFilter)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      areaFilter === a.id
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-brand-500/10'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick date buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Hôm nay', fn: () => { setStartDate(todayStr()); setEndDate(todayStr()) } },
            { label: '7 ngày', fn: () => { const d = new Date(); d.setDate(d.getDate()-6); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr()) } },
            { label: 'Tháng này', fn: () => { setStartDate(firstDayOfMonth()); setEndDate(todayStr()) } },
          ].map(q => (
            <button key={q.label} onClick={q.fn}
              className="px-3 py-1 text-[10px] font-bold rounded-full border border-[var(--border)] text-[var(--text-3)] hover:border-brand-500 hover:text-brand-500 transition-all">
              {q.label}
            </button>
          ))}
          <button onClick={fetchData}
            className="ml-auto px-4 py-1 text-[10px] font-bold rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-all shadow-sm">
            ↻ Tải lại
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-bold animate-pulse">Đang tổng hợp dữ liệu...</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {areaFilter !== 'separate' && (
              <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-blue-500/20 shadow-xl">
                <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Bun Đổ</p>
                <h4 className="text-4xl font-black">{totals.poured.toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Factory size={10} />
                  {shiftFilter === 'Tất cả' ? 'Tất cả ca' : shiftFilter}
                </div>
                <Activity size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            )}
            {areaFilter !== 'pour' && (
              <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 text-white border-none shadow-purple-500/20 shadow-xl">
                <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Bun Tách (TP+BTP)</p>
                <h4 className="text-4xl font-black">{totals.separated.toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <CheckCircle2 size={10} /> Tất cả loại sản phẩm
                </div>
                <Zap size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            )}
            {areaFilter === 'all' && (
              <div className={`card p-5 relative overflow-hidden border-none shadow-xl ${yieldRate >= 95 ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-500/20' : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-500/20'}`}>
                <p className="text-[10px] font-black uppercase opacity-80 mb-1">Hiệu Suất TP</p>
                <h4 className="text-4xl font-black">{yieldRate.toFixed(1)}%</h4>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <TrendingUp size={10} /> {yieldRate >= 95 ? 'Đạt mục tiêu' : 'Cần cải thiện'}
                </div>
                <BarChart3 size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Biểu đồ sản lượng</h3>
                  <p className="text-[10px] text-[var(--text-3)]">
                    {startDate} → {endDate}
                    {shiftFilter !== 'Tất cả' && ` · ${shiftFilter}`}
                    {areaFilter !== 'all' && ` · ${areaFilter === 'pour' ? 'Khu vực Đổ' : 'Khu vực Tách'}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {areaFilter !== 'separate' && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">Đổ</span>
                  </div>
                )}
                {areaFilter !== 'pour' && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-purple-500" />
                    <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">Tách TP</span>
                  </div>
                )}
              </div>
            </div>

            {aggregatedData.every(d => d.poured === 0 && d.separated === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-3)]">
                <Activity size={40} className="opacity-20" />
                <p className="text-sm font-medium">Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            ) : (
              <SvgBarChart
                data={aggregatedData}
                maxVal={maxVal}
                showPour={areaFilter !== 'separate'}
                showSep={areaFilter !== 'pour'}
              />
            )}
          </div>

          {/* Detail Table */}
          {visibleData.length > 0 && (
            <div className="card overflow-hidden border-none shadow-xl">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-transparent border-b border-[var(--border)] flex items-center gap-2">
                <Clock size={18} className="text-brand-500" />
                <h3 className="text-sm font-black uppercase tracking-tight">
                  Chi tiết sản lượng theo ngày & ca
                  {shiftFilter !== 'Tất cả' && <span className="ml-2 text-brand-500">({shiftFilter})</span>}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase text-[var(--text-3)] border-b border-[var(--border)]">
                      <th className="p-3 w-24">Ngày</th>
                      {(shiftFilter === 'Tất cả' ? SHIFTS : [shiftFilter]).map(s => (
                        <th key={s} className="p-3 text-center border-l border-[var(--border)] min-w-[110px]">
                          <div className="flex flex-col items-center gap-1">
                            {s === 'Ca 1' && <Sunrise size={13} className="text-orange-500" />}
                            {s === 'Ca 2' && <Sun size={13} className="text-yellow-500" />}
                            {s === 'Ca 3' && <Moon size={13} className="text-blue-500" />}
                            {s === 'Ca HC' && <Clock size={13} className="text-purple-500" />}
                            <span>{s}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center border-l border-[var(--border)] bg-gray-100 dark:bg-white/5 w-28">TỔNG NGÀY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {visibleData.slice().reverse().map(day => {
                      const cols = shiftFilter === 'Tất cả' ? SHIFTS : [shiftFilter]
                      return (
                        <tr key={day.date} className="text-xs hover:bg-brand-500/5 transition-colors">
                          <td className="p-3 font-black text-[var(--text-1)] bg-gray-50/50 dark:bg-white/5 whitespace-nowrap">
                            {day.date}
                          </td>
                          {cols.map(s => (
                            <td key={s} className="p-3 text-center border-l border-[var(--border)]">
                              <div className="flex flex-col gap-1.5">
                                {areaFilter !== 'separate' && (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-600">Đổ</span>
                                    <span className="font-mono font-bold">{(day.pouredByShift[s] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {areaFilter !== 'pour' && (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-500/10 text-purple-600">Tách</span>
                                    <span className="font-mono font-bold">{(day.separatedByShift[s] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}
                          <td className="p-3 text-center border-l border-[var(--border)] bg-gray-100/50 dark:bg-white/10">
                            <div className="flex flex-col gap-1">
                              {areaFilter !== 'separate' && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-blue-600 block">Tổng Đổ</span>
                                  <span className="text-base font-black text-blue-700">{day.poured.toLocaleString()}</span>
                                </div>
                              )}
                              {areaFilter !== 'pour' && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-purple-600 block">Tổng Tách</span>
                                  <span className="text-base font-black text-purple-700">{day.separated.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
