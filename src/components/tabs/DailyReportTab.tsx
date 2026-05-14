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
        if (r.product_type && r.product_type !== 'thanh_pham') return
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
                <p className="text-[10px] font-black uppercase opacity-80 mb-1">Bun Thành Phẩm</p>
                <h4 className="text-4xl font-black">{totals.separated.toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <CheckCircle2 size={10} /> Đã tách TP
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
              <div className="h-[260px] w-full flex items-end gap-0.5 border-b border-[var(--border)] relative overflow-x-auto pb-7">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-full border-t border-[var(--border)] border-dashed h-0" />
                  ))}
                </div>
                {aggregatedData.map(day => {
                  const ph = (day.poured / maxVal) * 100
                  const sh = (day.separated / maxVal) * 100
                  return (
                    <div key={day.date} className="flex-1 min-w-[18px] flex flex-col items-center group relative h-full justify-end">
                      <div className="flex items-end gap-0.5 w-full justify-center px-0.5">
                        {areaFilter !== 'separate' && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: `${ph}%` }}
                            className="w-full max-w-[10px] bg-blue-500 rounded-t-sm relative"
                          >
                            {day.poured > 0 && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold py-0.5 px-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none">
                                Đổ: {day.poured}
                              </div>
                            )}
                          </motion.div>
                        )}
                        {areaFilter !== 'pour' && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: `${sh}%` }}
                            className="w-full max-w-[10px] bg-purple-500 rounded-t-sm relative"
                          >
                            {day.separated > 0 && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold py-0.5 px-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none">
                                Tách: {day.separated}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                      <div className="absolute bottom-0 text-[8px] font-bold text-[var(--text-3)] rotate-45 origin-left whitespace-nowrap">
                        {day.date.split('/')[0]}/{day.date.split('/')[1]}
                      </div>
                    </div>
                  )
                })}
              </div>
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
