'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, Calendar, ChevronLeft, ChevronRight, 
  Activity, Zap, Download, Filter, Info,
  Factory, CheckCircle2, AlertTriangle, TrendingUp,
  Clock, Sun, Moon, Sunrise
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FoamingPourReport, FoamingSeparateReport } from '@/types'
import { getReportTimeRange, formatReportDate, getReportDateISO } from '@/lib/dateUtils'

interface DailyReportTabProps {
  user: SessionUser
}

type AggregatedDay = {
  date: string
  poured: number
  separated: number
  pouredByShift: Record<string, number>
  separatedByShift: Record<string, number>
}

const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']

export default function DailyReportTab({ user }: DailyReportTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [pourReports, setPourReports] = useState<FoamingPourReport[]>([])
  const [separateReports, setSeparateReports] = useState<FoamingSeparateReport[]>([])
  
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`
    const { start } = getReportTimeRange(startOfMonth, endOfMonth)

    // Fetch reports
    const [pourRes, sepRes] = await Promise.all([
      supabase.from('foaming_pour_reports').select('*').or(`report_date.gte.${startOfMonth},created_at.gte.${start}`),
      supabase.from('foaming_separate_reports').select('*').or(`report_date.gte.${startOfMonth},created_at.gte.${start}`)
    ])

    setPourReports((pourRes.data as any) || [])
    setSeparateReports((sepRes.data as any) || [])
    setLoading(false)
  }, [month, year, daysInMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate)
    next.setMonth(next.getMonth() + offset)
    setCurrentDate(next)
  }

  // ── Processing ──────────────────────────────────────────
  const aggregatedData = useMemo(() => {
    const dailyMap = new Map<string, AggregatedDay>()
    
    // Initialize days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${i}/${month}/${year}`
      dailyMap.set(dateStr, {
        date: dateStr,
        poured: 0,
        separated: 0,
        pouredByShift: {},
        separatedByShift: {}
      })
    }

    const normalizeDate = (dStr: string) => {
      const [d, m, y] = dStr.split('/')
      return `${parseInt(d)}/${parseInt(m)}/${y}`
    }

    pourReports.forEach(r => {
      let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at)
      d = normalizeDate(d)
      const day = dailyMap.get(d)
      if (day) {
        day.poured += (r.actual_bun_poured || 0)
        const s = r.shift || 'Ca 1'
        day.pouredByShift[s] = (day.pouredByShift[s] || 0) + (r.actual_bun_poured || 0)
      }
    })

    separateReports.forEach(r => {
      if (r.product_type && r.product_type !== 'thanh_pham') return

      let d = r.report_date ? r.report_date.split('-').reverse().join('/') : formatReportDate(r.created_at)
      d = normalizeDate(d)
      const day = dailyMap.get(d)
      if (day) {
        day.separated += (r.actual_bun_separated || 0)
        const s = r.shift || 'Ca 1'
        day.separatedByShift[s] = (day.separatedByShift[s] || 0) + (r.actual_bun_separated || 0)
      }
    })

    return Array.from(dailyMap.values())
  }, [pourReports, separateReports, daysInMonth, month, year])

  const totals = useMemo(() => {
    return aggregatedData.reduce((acc, d) => ({
      poured: acc.poured + d.poured,
      separated: acc.separated + d.separated
    }), { poured: 0, separated: 0 })
  }, [aggregatedData])

  const yieldRate = totals.poured > 0 ? (totals.separated / totals.poured) * 100 : 0

  return (
    <div className="space-y-6 pb-20">
      {/* Month Selector */}
      <div className="flex items-center justify-between card p-3 px-5 bg-gradient-to-r from-brand-500/5 to-purple-500/5">
        <button onClick={() => changeMonth(-1)} className="btn-ghost p-2 rounded-full hover:bg-white shadow-sm transition-all active:scale-90">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-500">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Tháng {month < 10 ? `0${month}` : month} / {year}</h2>
            <p className="text-[10px] text-[var(--text-3)] font-bold">BÁO CÁO SẢN LƯỢNG TỔNG HỢP</p>
          </div>
        </div>
        <button onClick={() => changeMonth(1)} className="btn-ghost p-2 rounded-full hover:bg-white shadow-sm transition-all active:scale-90">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-bold animate-pulse">Đang tổng hợp dữ liệu sản xuất...</p>
        </div>
      ) : totals.poured === 0 && totals.separated === 0 ? (
        <div className="card p-20 flex flex-col items-center gap-4 text-center border-2 border-dashed">
          <Activity size={48} className="text-[var(--text-3)] opacity-20" />
          <div>
            <h3 className="text-lg font-bold text-[var(--text-2)]">Không có dữ liệu báo cáo</h3>
            <p className="text-sm text-[var(--text-3)] max-w-xs mx-auto">Vui lòng chọn tháng khác hoặc ghi nhận sản lượng tại tab Quy trình Foaming.</p>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-blue-500/20 shadow-xl">
              <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Bun Đổ (Poured)</p>
              <h4 className="text-4xl font-black">{totals.poured.toLocaleString()}</h4>
              <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Factory size={10} /> Toàn bộ máy đổ
              </div>
              <Activity size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
            </div>
            
            <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 text-white border-none shadow-purple-500/20 shadow-xl">
              <p className="text-[10px] font-black uppercase opacity-80 mb-1">Bun Thành Phẩm (Separated)</p>
              <h4 className="text-4xl font-black">{totals.separated.toLocaleString()}</h4>
              <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                <CheckCircle2 size={10} /> Đã tách thành phẩm
              </div>
              <Zap size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
            </div>

            <div className={`card p-5 relative overflow-hidden border-none shadow-xl ${yieldRate >= 95 ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-500/20' : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-500/20'}`}>
              <p className="text-[10px] font-black uppercase opacity-80 mb-1">Hiệu Suất Thành Phẩm</p>
              <h4 className="text-4xl font-black">{yieldRate.toFixed(1)}%</h4>
              <div className="mt-2 flex items-center gap-1.5 bg-white/20 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                <TrendingUp size={10} /> {yieldRate >= 95 ? 'Đạt mục tiêu' : 'Cần cải thiện'}
              </div>
              <BarChart3 size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
            </div>
          </div>

          {/* Productivity Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <BarChart3 size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight">Biểu đồ sản lượng hàng ngày</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">Tổng Đổ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-purple-500" />
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">Thành Phẩm</span>
                </div>
              </div>
            </div>

            <div className="h-[280px] w-full flex items-end justify-between gap-1 px-2 border-b border-[var(--border)] relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t border-[var(--border)] border-dashed h-0" />
                ))}
              </div>
              
              {aggregatedData.map((day) => {
                const maxVal = Math.max(...aggregatedData.map(d => Math.max(d.poured, d.separated))) || 100
                const pouredHeight = (day.poured / maxVal) * 100
                const separatedHeight = (day.separated / maxVal) * 100
                
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end pb-8">
                    <div className="flex items-end gap-0.5 w-full justify-center px-0.5">
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${pouredHeight}%` }} 
                        className="w-full max-w-[8px] bg-blue-500 rounded-t-sm shadow-sm relative"
                      >
                        {day.poured > 0 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                            {day.poured}
                          </div>
                        )}
                      </motion.div>
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${separatedHeight}%` }} 
                        className="w-full max-w-[8px] bg-purple-500 rounded-t-sm shadow-sm relative"
                      >
                        {day.separated > 0 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                            {day.separated}
                          </div>
                        )}
                      </motion.div>
                    </div>
                    <div className="absolute bottom-0 text-[8px] font-bold text-[var(--text-3)] rotate-45 origin-left whitespace-nowrap">
                      {day.date.split('/')[0]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail Breakdown Table */}
          <div className="card overflow-hidden shadow-xl border-none">
            <div className="p-5 bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-transparent border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-brand-500" />
                <h3 className="text-sm font-black uppercase tracking-tight">Chi tiết sản lượng theo ngày & ca</h3>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase text-[var(--text-3)] border-b border-[var(--border)]">
                    <th className="p-4 w-32">Ngày</th>
                    {SHIFTS.map(s => (
                      <th key={s} className="p-4 text-center border-l border-[var(--border)] min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          {s === 'Ca 1' && <Sunrise size={14} className="text-orange-500" />}
                          {s === 'Ca 2' && <Sun size={14} className="text-yellow-500" />}
                          {s === 'Ca 3' && <Moon size={14} className="text-blue-500" />}
                          {s === 'Ca HC' && <Clock size={14} className="text-purple-500" />}
                          <span>{s}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-4 text-center border-l border-[var(--border)] bg-gray-100 dark:bg-white/5 w-32">TỔNG NGÀY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {aggregatedData.slice().reverse().filter(d => d.poured > 0 || d.separated > 0).map(day => (
                    <tr key={day.date} className="text-xs hover:bg-brand-500/5 transition-colors">
                      <td className="p-4 font-black text-[var(--text-1)] bg-gray-50/50 dark:bg-white/5">
                        {day.date}
                      </td>
                      {SHIFTS.map(s => (
                        <td key={s} className="p-4 text-center border-l border-[var(--border)]">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">Đổ</span>
                              <span className="font-mono font-bold text-sm">{(day.pouredByShift[s] || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600">Tách</span>
                              <span className="font-mono font-bold text-sm">{(day.separatedByShift[s] || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                      ))}
                      <td className="p-4 text-center border-l border-[var(--border)] bg-gray-100/50 dark:bg-white/10">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-blue-600">Tổng Đổ</span>
                            <span className="text-lg font-black text-blue-700 leading-none">{day.poured.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-purple-600">Tổng Tách</span>
                            <span className="text-lg font-black text-purple-700 leading-none">{day.separated.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
