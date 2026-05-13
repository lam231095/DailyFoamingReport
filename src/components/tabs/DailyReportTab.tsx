'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, Calendar, ChevronLeft, ChevronRight, 
  Droplets, Scissors, TrendingUp, Package, 
  Target, Info, Download, Filter, Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FoamingPourReport, FoamingSeparateReport } from '@/types'
import { getReportTimeRange, formatReportDate } from '@/lib/dateUtils'

interface DailyReportTabProps {
  user: SessionUser
}

type AggregatedDay = {
  date: string
  poured: number
  separated: number
  pouredByShift: { [key: string]: number }
  separatedByShift: { [key: string]: number }
}

// ── Custom Grouped Bar Chart ───────────────────────────────
function BunComparisonChart({ data }: { data: AggregatedDay[] }) {
  const chartHeight = 220
  const maxVal = Math.max(...data.map(d => Math.max(d.poured, d.separated)), 100) * 1.1

  return (
    <div className="relative w-full h-[280px] mt-8">
      {/* Y-Axis Grid */}
      <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-[var(--text-3)] pointer-events-none border-l border-b border-[var(--border)]">
        {[4, 3, 2, 1, 0].map(i => {
          const val = Math.round((maxVal / 4) * i)
          return (
            <div key={i} className="relative w-full border-t border-[var(--border)] border-dashed">
              <span className="absolute -left-10 -top-2 w-8 text-right">{val}</span>
            </div>
          )
        })}
      </div>

      {/* Bars Container */}
      <div className="absolute inset-0 flex items-end justify-around pl-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-1.5 h-full group relative">
            {/* Poured Bar */}
            <div className="relative flex flex-col items-center">
               <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${(d.poured / maxVal) * chartHeight}px` }}
                className="w-4 sm:w-6 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm shadow-lg shadow-blue-500/20"
              />
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap z-10">
                Đổ: {d.poured}
              </div>
            </div>

            {/* Separated Bar */}
            <div className="relative flex flex-col items-center">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${(d.separated / maxVal) * chartHeight}px` }}
                className="w-4 sm:w-6 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm shadow-lg shadow-purple-500/20"
              />
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap z-10">
                Tách: {d.separated}
              </div>
            </div>

            {/* X-Axis Label (below) */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] text-[var(--text-3)] whitespace-nowrap font-medium rotate-45 sm:rotate-0">
              {d.date.split('/')[0]}/{d.date.split('/')[1]}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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

    // Fetch Pour Reports
    const { data: pourData } = await supabase
      .from('foaming_pour_reports')
      .select('*')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth)
      .order('report_date', { ascending: true })

    // Fetch Separate Reports
    const { data: sepData } = await supabase
      .from('foaming_separate_reports')
      .select('*')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth)
      .order('report_date', { ascending: true })

    setPourReports((pourData as any) || [])
    setSeparateReports((sepData as any) || [])
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

  // ── Data Aggregation ──────────────────────────────────────
  const stats = useMemo(() => {
    const dailyMap = new Map<string, AggregatedDay>()
    
    // Helper to get array of all dates in month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${i}/${month}/${year}`
      dailyMap.set(dateStr, {
        date: dateStr,
        poured: 0,
        separated: 0,
        pouredByShift: { 'Ca 1': 0, 'Ca 2': 0, 'Ca 3': 0, 'Ca HC': 0 },
        separatedByShift: { 'Ca 1': 0, 'Ca 2': 0, 'Ca 3': 0, 'Ca HC': 0 }
      })
    }

    pourReports.forEach(r => {
      const d = formatReportDate(r.report_date || r.created_at)
      const day = dailyMap.get(d)
      if (day) {
        day.poured += (r.actual_bun_poured || 0)
        const s = r.shift || 'Ca 1'
        day.pouredByShift[s] = (day.pouredByShift[s] || 0) + (r.actual_bun_poured || 0)
      }
    })

    separateReports.forEach(r => {
      const d = formatReportDate(r.report_date || r.created_at)
      const day = dailyMap.get(d)
      if (day) {
        day.separated += (r.actual_bun_separated || 0)
        const s = r.shift || 'Ca 1'
        day.separatedByShift[s] = (day.separatedByShift[s] || 0) + (r.actual_bun_separated || 0)
      }
    })

    const chartData = Array.from(dailyMap.values()).filter(d => d.poured > 0 || d.separated > 0)
    
    const totalPoured = pourReports.reduce((acc, r) => acc + (r.actual_bun_poured || 0), 0)
    const totalSeparated = separateReports.reduce((acc, r) => acc + (r.actual_bun_separated || 0), 0)

    return {
      chartData,
      totalPoured,
      totalSeparated,
      yieldRate: totalPoured > 0 ? (totalSeparated / totalPoured) * 100 : 0
    }
  }, [pourReports, separateReports, daysInMonth, month, year])

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between card p-3 px-4">
        <button onClick={() => changeMonth(-1)} className="btn-ghost p-2 rounded-full">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-500" />
          <span className="text-sm font-bold uppercase tracking-tight">Tháng {month < 10 ? `0${month}` : month} / {year}</span>
        </div>
        <button onClick={() => changeMonth(1)} className="btn-ghost p-2 rounded-full">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-medium">Đang tổng hợp báo cáo...</p>
        </div>
      ) : stats.chartData.length === 0 ? (
        <div className="card p-20 flex flex-col items-center gap-4 text-center opacity-60">
          <Activity size={48} className="text-[var(--text-3)]" />
          <div>
            <p className="text-sm font-bold text-[var(--text-2)]">Không có dữ liệu báo cáo</p>
            <p className="text-[10px] text-[var(--text-3)] mt-1">Vui lòng chọn tháng khác hoặc ghi nhận sản lượng</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-4 relative overflow-hidden bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10"
            >
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest mb-1">Tổng Bun Máy Đổ</p>
                <h4 className="text-3xl font-black text-blue-600">{stats.totalPoured.toLocaleString()}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-blue-500/60 font-bold text-[9px]">
                  <Droplets size={10} />
                  <span>Khu vực Đổ ( ICT )</span>
                </div>
              </div>
              <Droplets size={54} className="absolute -right-2 -bottom-2 text-blue-500/10 -rotate-12" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-4 relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10"
            >
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest mb-1">Thành Phẩm Tách</p>
                <h4 className="text-3xl font-black text-purple-600">{stats.totalSeparated.toLocaleString()}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-purple-500/60 font-bold text-[9px]">
                  <Scissors size={10} />
                  <span>Khu vực Tách</span>
                </div>
              </div>
              <Scissors size={54} className="absolute -right-2 -bottom-2 text-purple-500/10 12" />
            </motion.div>
          </div>

          {/* Efficiency Card */}
          <div className="card p-3 flex items-center justify-between bg-brand-500/5 border-brand-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-brand-500" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Hiệu suất Tách/Đổ</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-[var(--text-1)]">{stats.yieldRate.toFixed(1)}%</span>
                  <div className="h-1.5 w-24 bg-[var(--bg-input)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.yieldRate}%` }}
                      className="h-full bg-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-3)] font-medium">Hao hụt ước tính</p>
              <p className="text-sm font-bold text-red-500">{(100 - stats.yieldRate).toFixed(1)}%</p>
            </div>
          </div>

          {/* Main Comparison Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-brand-500" />
                <h3 className="text-sm font-bold tracking-tight text-[var(--text-1)]">So Sánh Sản Lượng Đổ vs Tách</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">Đổ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-[10px] font-bold text-[var(--text-3)] uppercase">Tách</span>
                </div>
              </div>
            </div>

            <BunComparisonChart data={stats.chartData} />

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                  <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[var(--text-2)] leading-relaxed">
                    Dữ liệu được lấy từ báo cáo thực tế tại khu vực Đổ (Bun thô). Phân bổ theo từng ca làm việc để quản lý hiệu quả máy móc.
                  </p>
               </div>
               <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
                  <Activity size={14} className="text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[var(--text-2)] leading-relaxed">
                    Sản lượng Tách thể hiện số lượng Bun thành phẩm thực tế nhập kho. Chênh lệch giữa Đổ và Tách là tỷ lệ hao hụt/phế phẩm.
                  </p>
               </div>
            </div>
          </motion.div>

          {/* Shift Detail breakdown Table */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--text-1)]">Chi Tiết Theo Ca (Tháng {month})</h3>
              <button className="text-[10px] font-bold text-brand-500 flex items-center gap-1 hover:underline">
                <Download size={12} /> XUẤT EXCEL
              </button>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-xs min-w-[320px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-3)] uppercase text-[9px] font-black tracking-widest">
                    <th className="pb-3 px-1">Ngày</th>
                    <th className="pb-3 px-1">Ca 1</th>
                    <th className="pb-3 px-1">Ca 2</th>
                    <th className="pb-3 px-1">Ca 3</th>
                    <th className="pb-3 px-1">Ca HC</th>
                    <th className="pb-3 px-1 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {stats.chartData.slice(-10).reverse().map((d, i) => (
                    <tr key={i} className="group hover:bg-[var(--bg-input)]/50 transition-colors">
                      <td className="py-3 px-1 font-bold text-[var(--text-1)]">{d.date.split('/')[0]}/{d.date.split('/')[1]}</td>
                      <td className="py-3 px-1">
                        <div className="flex flex-col">
                          <span className="text-blue-500 font-bold">{d.pouredByShift['Ca 1'] || 0}</span>
                          <span className="text-purple-500 text-[10px] font-medium">{d.separatedByShift['Ca 1'] || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-1">
                        <div className="flex flex-col">
                          <span className="text-blue-500 font-bold">{d.pouredByShift['Ca 2'] || 0}</span>
                          <span className="text-purple-500 text-[10px] font-medium">{d.separatedByShift['Ca 2'] || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-1">
                        <div className="flex flex-col">
                          <span className="text-blue-500 font-bold">{d.pouredByShift['Ca 3'] || 0}</span>
                          <span className="text-purple-500 text-[10px] font-medium">{d.separatedByShift['Ca 3'] || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-1">
                        <div className="flex flex-col">
                          <span className="text-blue-500 font-bold">{d.pouredByShift['Ca HC'] || 0}</span>
                          <span className="text-purple-500 text-[10px] font-medium">{d.separatedByShift['Ca HC'] || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-1 text-right font-black">
                        <div className="flex flex-col">
                          <span className="text-[var(--text-1)]">{d.poured}</span>
                          <span className="text-brand-500 text-[9px]">{d.separated}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[9px] text-[var(--text-3)] italic text-center font-medium">
              * Hàng trên (Xanh): Số Bun Đổ | Hàng dưới (Tím): Số Bun Tách
            </p>
          </motion.div>
        </>
      )}
    </div>
  )
}
