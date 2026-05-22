'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Calendar, ChevronLeft, ChevronRight,
  Activity, Zap, Factory, CheckCircle2,
  Clock, Sun, Moon, Sunrise, Filter, X, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FoamingPourReport, FoamingSeparateReport } from '@/types'
import { getReportTimeRange, formatReportDate } from '@/lib/dateUtils'
import { TrendingUp, Award, UserCheck } from 'lucide-react'

const TARGET_POUR = 320
const TARGET_SEPARATE = 300
const MANAGERS = ['Linh', 'Thảo', 'Tuấn Anh']
const MANAGER_COLORS: Record<string, string> = {
  'Linh': '#3b82f6',
  'Thảo': '#a855f7',
  'Tuấn Anh': '#10b981'
}

interface DailyReportTabProps { user: SessionUser }

type AggregatedDay = {
  date: string
  poured: number
  separated: number
  separatedSheets: number
  pouredByShift: Record<string, number>
  separatedByShift: Record<string, number>
  separatedByShiftSheets: Record<string, number>
  pouredByManager: Record<string, { actual: number; shifts: Set<string> }>
  separatedByManager: Record<string, { actual: number; shifts: Set<string>; actualSheets: number }>
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

// SVG gradient ID không được chứa ký tự đặc biệt / khoảng trắng
const safeId = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_')

function calcManagerPerf(
  day: AggregatedDay,
  manager: string,
  areaFilter: AreaFilter
): number | null {
  let totalActual = 0, compositeTarget = 0
  if (areaFilter !== 'separate' && day.pouredByManager[manager]) {
    totalActual += day.pouredByManager[manager].actual
    compositeTarget += day.pouredByManager[manager].shifts.size * TARGET_POUR
  }
  if (areaFilter !== 'pour' && day.separatedByManager[manager]) {
    totalActual += day.separatedByManager[manager].actual
    compositeTarget += day.separatedByManager[manager].shifts.size * TARGET_SEPARATE
  }
  if (compositeTarget === 0) return null
  return (totalActual / compositeTarget) * 100
}

function SvgPerformanceChart({
  data, dateList, managers, managerFilter, areaFilter, startDate, endDate, shiftFilter
}: {
  data: AggregatedDay[]
  dateList: string[]
  managers: string[]
  managerFilter: string
  areaFilter: AreaFilter
  startDate: string
  endDate: string
  shiftFilter: string
}) {
  const activeManagers = managers.filter(m => managerFilter === 'Tất cả' || m === managerFilter)

  // Lấy 10 ngày gần nhất có ít nhất 1 manager có dữ liệu
  const datesWithData = [...dateList].reverse().filter(date => {
    const day = data.find(d => d.date === date)
    if (!day) return false
    return activeManagers.some(m => calcManagerPerf(day, m, areaFilter) !== null)
  }).slice(0, 10).reverse()

  const n = datesWithData.length
  if (n === 0) return (
    <div className="flex items-center justify-center py-12 text-[var(--text-3)] text-xs font-bold">
      Không có dữ liệu hiệu suất trong khoảng thời gian này
    </div>
  )

  // Tạo nhãn filter đang áp dụng
  const fmtDate = (d: string) => {
    const [y, m, dd] = d.split('-')
    return `${parseInt(dd)}/${parseInt(m)}`
  }

  const W = 720
  const H = 220
  const PAD_L = 46
  const PAD_R = 12
  const PAD_T = 36  // chừa chỗ cho label % phía trên
  const PAD_B = 32
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const MAX_PERF = 120

  const groupW = chartW / n
  const barCount = activeManagers.length
  const totalBarZone = groupW * 0.78
  const barW = Math.max(6, Math.min(22, totalBarZone / barCount - 2))
  const barGap = 2

  const perfY = (perf: number) =>
    PAD_T + chartH - Math.min(1, perf / MAX_PERF) * chartH

  return (
    <div className="w-full">
      {/* Filter context badge */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-[10px] font-bold">
          📅 {fmtDate(startDate)} → {fmtDate(endDate)}
        </span>
        {shiftFilter !== 'Tất cả' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-bold">
            🕐 {shiftFilter}
          </span>
        )}
        {areaFilter !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-bold">
            {areaFilter === 'pour' ? '💧 Khu vực Đổ' : '✂️ Khu vực Tách'}
          </span>
        )}
        <span className="ml-auto text-[10px] text-[var(--text-3)] font-bold">
          Hiển thị {n} ngày gần nhất có dữ liệu
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', minWidth: 320 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {activeManagers.map(m => (
              <linearGradient key={m} id={`barGrad_${safeId(m)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MANAGER_COLORS[m]} stopOpacity="1" />
                <stop offset="100%" stopColor={MANAGER_COLORS[m]} stopOpacity="0.65" />
              </linearGradient>
            ))}
          </defs>

          {/* Vùng nền theo mức hiệu suất */}
          {/* Vùng đỏ: 0% → 80% */}
          <rect x={PAD_L} y={perfY(80)} width={chartW} height={chartH - (perfY(80) - PAD_T)}
            fill="#fee2e2" opacity="0.35" />
          {/* Vùng vàng: 80% → 100% */}
          <rect x={PAD_L} y={perfY(100)} width={chartW} height={perfY(80) - perfY(100)}
            fill="#fef9c3" opacity="0.5" />
          {/* Vùng xanh: 100% → 120% */}
          <rect x={PAD_L} y={PAD_T} width={chartW} height={perfY(100) - PAD_T}
            fill="#dcfce7" opacity="0.5" />

          {/* Grid lines Y */}
          {[0, 20, 40, 60, 80, 100, 120].map(val => {
            const y = perfY(val)
            if (y < PAD_T || y > PAD_T + chartH + 1) return null
            return (
              <g key={val}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke={val === 100 ? '#10b981' : '#e2e8f0'}
                  strokeWidth={val === 100 ? 1.5 : 0.8}
                  strokeDasharray={val === 100 ? '0' : '3 4'}
                />
                <text x={PAD_L - 5} y={y + 4} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">
                  {val}%
                </text>
              </g>
            )
          })}

          {/* Đường 100% label */}
          <text x={W - PAD_R - 2} y={perfY(100) - 3} textAnchor="end" fontSize="7.5" fill="#10b981" fontWeight="800">
            MỤC TIÊU
          </text>

          {/* Cột nhóm theo ngày */}
          {datesWithData.map((date, idx) => {
            const day = data.find(d => d.date === date)
            const cx = PAD_L + groupW * idx + groupW / 2
            const totalBarW = barCount * barW + (barCount - 1) * barGap
            const startX = cx - totalBarW / 2

            return (
              <g key={date}>
                {/* X label */}
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="8.5" fill="#64748b" fontWeight="700">
                  {date.split('/')[0]}/{date.split('/')[1]}
                </text>

                {/* Vertical separator */}
                {idx > 0 && (
                  <line x1={PAD_L + groupW * idx} y1={PAD_T} x2={PAD_L + groupW * idx} y2={PAD_T + chartH}
                    stroke="#e2e8f0" strokeWidth="0.5" />
                )}

                {/* Bars per manager */}
                {day && activeManagers.map((manager, mi) => {
                  const perf = calcManagerPerf(day, manager, areaFilter)
                  if (perf === null) return null
                  const bx = startX + mi * (barW + barGap)
                  const by = perfY(perf)
                  const bh = PAD_T + chartH - by
                  const color = MANAGER_COLORS[manager]
                  const perfCapped = Math.min(perf, MAX_PERF)
                  const isGood = perf >= 100

                  return (
                    <g key={manager}>
                      {/* Bar */}
                      <rect
                        x={bx} y={by} width={barW} height={Math.max(bh, 2)}
                        rx="3"
                        fill={`url(#barGrad_${safeId(manager)})`}
                      />
                      {/* % label phía trên cột */}
                      <text
                        x={bx + barW / 2}
                        y={by - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fill={color}
                        fontWeight="800"
                      >
                        {Math.round(perf)}%
                      </text>
                      {/* Đánh dấu ✓ nếu ≥100% */}
                      {isGood && (
                        <text x={bx + barW / 2} y={by - 13} textAnchor="middle" fontSize="8" fill="#10b981">✓</text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Y-axis line */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
        {activeManagers.map(manager => {
          const color = MANAGER_COLORS[manager]
          // Avg perf trên toàn bộ dateList
          let tp = 0, cnt = 0
          datesWithData.forEach(date => {
            const day = data.find(d => d.date === date)
            if (!day) return
            const p = calcManagerPerf(day, manager, areaFilter)
            if (p !== null) { tp += p; cnt++ }
          })
          const avg = cnt > 0 ? Math.round(tp / cnt) : 0
          return (
            <div key={manager} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[11px] font-bold text-[var(--text-2)]">{manager}</span>
              <span className={`text-[11px] font-black ${avg >= 100 ? 'text-green-600' : avg >= 80 ? 'text-orange-500' : 'text-red-500'}`}>
                TB: {avg}%
              </span>
            </div>
          )
        })}
        <div className="flex items-center gap-3 ml-4 border-l border-[var(--border)] pl-4">
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-green-200 opacity-80" /><span className="text-[9px] text-green-700 font-bold">≥100%</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-yellow-200 opacity-80" /><span className="text-[9px] text-yellow-700 font-bold">80-100%</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-red-200 opacity-80" /><span className="text-[9px] text-red-700 font-bold">&lt;80%</span></div>
        </div>
      </div>
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
  const [managerFilter, setManagerFilter] = useState<string>('Tất cả')
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
      dailyMap.set(dateStr, { 
        date: dateStr, 
        poured: 0, 
        separated: 0, 
        separatedSheets: 0,
        pouredByShift: {}, 
        separatedByShift: {},
        separatedByShiftSheets: {},
        pouredByManager: {},
        separatedByManager: {}
      })
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
          
          const m = r.manager_name || 'Khác'
          if (!day.pouredByManager[m]) day.pouredByManager[m] = { actual: 0, shifts: new Set() }
          day.pouredByManager[m].actual += (r.actual_bun_poured || 0)
          day.pouredByManager[m].shifts.add(s)
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
          day.separatedSheets += (r.actual_sheet_received || 0)
          const s = r.shift || 'Ca 1'
          day.separatedByShift[s] = (day.separatedByShift[s] || 0) + (r.actual_bun_separated || 0)
          day.separatedByShiftSheets[s] = (day.separatedByShiftSheets[s] || 0) + (r.actual_sheet_received || 0)
          
          const m = r.manager_name || 'Khác'
          if (!day.separatedByManager[m]) day.separatedByManager[m] = { actual: 0, actualSheets: 0, shifts: new Set() }
          day.separatedByManager[m].actual += (r.actual_bun_separated || 0)
          day.separatedByManager[m].actualSheets += (r.actual_sheet_received || 0)
          day.separatedByManager[m].shifts.add(s)
        }
      })
    }

    return Array.from(dailyMap.values())
  }, [pourReports, separateReports, dateList, shiftFilter, areaFilter])

  const totals = useMemo(() => aggregatedData.reduce(
    (acc, d) => ({ 
      poured: acc.poured + d.poured, 
      separated: acc.separated + d.separated,
      separatedSheets: acc.separatedSheets + d.separatedSheets
    }),
    { poured: 0, separated: 0, separatedSheets: 0 }
  ), [aggregatedData])


  const activeFiltersCount = [
    shiftFilter !== 'Tất cả',
    areaFilter !== 'all',
    startDate !== firstDayOfMonth() || endDate !== todayStr()
  ].filter(Boolean).length

  const resetFilters = () => {
    setShiftFilter('Tất cả')
    setManagerFilter('Tất cả')
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

            {/* Manager filter */}
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-2 ml-1">Quản lý</p>
              <div className="flex flex-wrap gap-1.5">
                {['Tất cả', ...MANAGERS].map(m => (
                  <button key={m} onClick={() => setManagerFilter(m)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      managerFilter === m
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-brand-500/10'
                    }`}>
                    {m}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {areaFilter !== 'separate' && (
              <div className="rounded-2xl p-5 relative overflow-hidden text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 10px 30px rgba(37,99,235,0.35)' }}>
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
              <div className="rounded-2xl p-5 relative overflow-hidden text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', boxShadow: '0 10px 30px rgba(147,51,234,0.35)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Bun Tách (TP+BTP)</p>
                    <h4 className="text-4xl font-black">{totals.separated.toLocaleString()} <span className="text-sm font-normal opacity-85">bun</span></h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Sheet Tách</p>
                    <h4 className="text-2xl font-black">{totals.separatedSheets.toLocaleString()} <span className="text-xs font-normal opacity-85">sheet</span></h4>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <CheckCircle2 size={10} /> Tất cả loại sản phẩm
                </div>
                <Zap size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            )}
          </div>

          {/* Performance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                <Award size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">Hiệu suất theo Quản lý (%)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {MANAGERS.map(manager => {
                if (managerFilter !== 'Tất cả' && manager !== managerFilter) return null
                
                const managerData = aggregatedData.map(d => {
                  let totalActual = 0
                  let totalShifts = 0
                  
                  if (areaFilter !== 'separate' && d.pouredByManager[manager]) {
                    totalActual += d.pouredByManager[manager].actual
                    totalShifts += d.pouredByManager[manager].shifts.size
                  }
                  if (areaFilter !== 'pour' && d.separatedByManager[manager]) {
                    totalActual += d.separatedByManager[manager].actual
                    totalShifts += d.separatedByManager[manager].shifts.size
                  }
                  
                  const target = (areaFilter === 'pour' ? TARGET_POUR : 
                                 areaFilter === 'separate' ? TARGET_SEPARATE : 
                                 (TARGET_POUR + TARGET_SEPARATE) / 2) * (totalShifts || 1)
                  
                  // Nếu filter 'all', ta tính trung bình target? 
                  // Thực tế user nói "tổng / target". Nếu đổ tách riêng thì dễ. 
                  // Nếu gộp, ta lấy tổng thực tế / tổng target của các ca đó.
                  let compositeTarget = 0
                  if (areaFilter !== 'separate' && d.pouredByManager[manager]) {
                    compositeTarget += d.pouredByManager[manager].shifts.size * TARGET_POUR
                  }
                  if (areaFilter !== 'pour' && d.separatedByManager[manager]) {
                    compositeTarget += d.separatedByManager[manager].shifts.size * TARGET_SEPARATE
                  }

                  const perf = compositeTarget > 0 ? (totalActual / compositeTarget) * 100 : 0
                  return { date: d.date, perf }
                }).filter(d => d.perf > 0)

                if (managerData.length === 0) return null

                const avgPerf = Math.round(managerData.reduce((s, x) => s + x.perf, 0) / managerData.length)

                return (
                  <div key={manager} className="card p-4 border-l-4" style={{ borderLeftColor: MANAGER_COLORS[manager] }}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" 
                          style={{ backgroundColor: MANAGER_COLORS[manager] }}>
                          {manager[0]}
                        </div>
                        <span className="text-xs font-bold text-[var(--text-1)]">{manager}</span>
                      </div>
                      <span className={`text-lg font-black ${avgPerf >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                        {avgPerf}%
                      </span>
                    </div>
                    
                    {/* Mini Sparkline using CSS */}
                    <div className="flex items-end gap-0.5 h-12 bg-gray-50 dark:bg-black/10 rounded-lg p-1">
                      {managerData.slice(-15).map((d, i) => (
                        <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                          style={{ 
                            height: `${Math.min(100, d.perf)}%`, 
                            backgroundColor: MANAGER_COLORS[manager],
                            opacity: 0.6 + (d.perf / 200)
                          }}
                          title={`${d.date}: ${Math.round(d.perf)}%`}
                        />
                      ))}
                    </div>
                    <p className="text-[9px] text-[var(--text-3)] mt-2 font-bold uppercase text-center">Xu hướng 15 ngày gần nhất</p>
                  </div>
                )
              })}
            </div>

            {/* Performance Trend Chart */}
            <div className="card p-5 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black uppercase text-[var(--text-2)] flex items-center gap-2">
                  <TrendingUp size={14} className="text-brand-500" />
                  Biểu đồ diễn biến hiệu suất theo ngày
                </h4>
              </div>
              <SvgPerformanceChart 
                data={aggregatedData} 
                dateList={dateList}
                managers={MANAGERS}
                managerFilter={managerFilter}
                areaFilter={areaFilter}
                startDate={startDate}
                endDate={endDate}
                shiftFilter={shiftFilter}
              />
            </div>
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

            {visibleData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-3)]">
                <Activity size={40} className="opacity-20" />
                <p className="text-sm font-medium">Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            ) : (
              <SvgBarChart
                data={visibleData}
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
                                    <span className="font-mono font-bold">
                                      {(day.separatedByShift[s] || 0).toLocaleString()} <span className="text-[10px] font-normal opacity-70">B</span> / {(day.separatedByShiftSheets[s] || 0).toLocaleString()} <span className="text-[10px] font-normal opacity-70">S</span>
                                    </span>
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
                                  <span className="text-base font-black text-purple-700">
                                    {day.separated.toLocaleString()} <span className="text-xs font-normal opacity-70">B</span> / {day.separatedSheets.toLocaleString()} <span className="text-xs font-normal opacity-70">S</span>
                                  </span>
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
