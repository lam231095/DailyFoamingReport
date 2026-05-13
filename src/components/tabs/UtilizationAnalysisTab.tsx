'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, Calendar, ChevronLeft, ChevronRight, 
  Activity, Zap, BarChart3, Download, Filter,
  Users, Cpu, Package, AlertTriangle, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, ProductionReport, SKU, ChangeLog } from '@/types'
import { getReportTimeRange, formatReportDate, getWeekNumber, getReportDateISO } from '@/lib/dateUtils'

interface UtilizationAnalysisTabProps {
  user: SessionUser
}

type ShiftData = {
  date: string
  shift: string
  utilization: number
  output: number
  points: number
  issues: ChangeLog[]
}

type DailyData = {
  date: string
  totalOutput: number
  avgUtilization: number
  issueCount: number
  issues: ChangeLog[]
}

type WeeklyData = {
  week: number
  totalOutput: number
  avgUtilization: number
  issueCount: number
}

// ── Utilization Chart Component ─────────────────────────────
function UtilizationChart({ data, type }: { data: any[], type: 'day' | 'week' }) {
  const chartHeight = 200
  const maxUtilization = 120 // Up to 120%
  
  const points = useMemo(() => {
    if (data.length === 0) return []
    if (type === 'day') {
      return data.map((d, i) => ({
        x: data.length > 1 ? (i / (data.length - 1)) * 100 : 50,
        y: chartHeight - (Math.min(d.utilization, maxUtilization) / maxUtilization) * chartHeight,
        original: d
      }))
    } else {
      return data.map((d, i) => ({
        x: data.length > 1 ? (i / (data.length - 1)) * 100 : 50,
        y: chartHeight - (Math.min(d.avgUtilization, maxUtilization) / maxUtilization) * chartHeight,
        original: d
      }))
    }
  }, [data, type])

  const pathData = useMemo(() => {
    if (points.length < 2) return ''
    return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
  }, [points])

  const areaData = useMemo(() => {
    if (points.length < 2) return ''
    return `${pathData} L 100,${chartHeight} L 0,${chartHeight} Z`
  }, [pathData, points.length])

  if (data.length === 0) return (
    <div className="h-[200px] flex items-center justify-center text-[var(--text-3)] text-xs">
      Không có dữ liệu hiển thị
    </div>
  )

  return (
    <div className="relative w-full h-[240px] mt-6">
      {/* Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-[var(--text-3)] pointer-events-none border-l border-b border-[var(--border)]">
        {[100, 75, 50, 25, 0].map(val => (
          <div key={val} className="relative w-full border-t border-[var(--border)] border-dashed">
            <span className="absolute -left-8 -top-2 w-6 text-right">{val}%</span>
            {val === 100 && <div className="absolute top-0 left-0 right-0 border-t border-green-500/30 w-full" />}
          </div>
        ))}
      </div>
      
      <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area */}
        {points.length >= 2 && (
          <motion.path
            initial={{ d: `M 0,${chartHeight} L 100,${chartHeight} L 100,${chartHeight} L 0,${chartHeight} Z` }}
            animate={{ d: areaData }}
            transition={{ duration: 1 }}
            fill="url(#utilGradient)"
          />
        )}
        
        {/* Line */}
        {points.length >= 2 && (
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
            d={pathData}
            fill="none"
            stroke="var(--brand-500)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        
        {/* Markers */}
        {points.map((p, i) => (
          <g key={i}>
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="2" 
              fill={(type === 'day' ? p.original.utilization : p.original.avgUtilization) >= 95 ? '#22c55e' : (type === 'day' ? p.original.utilization : p.original.avgUtilization) >= 80 ? 'var(--brand-500)' : '#ef4444'} 
            />
            
            {type === 'day' && p.original.issues?.length > 0 && (
              <g transform={`translate(${p.x}, ${p.y - 12})`}>
                <circle r="5" fill="#ef4444" />
                <text y="2.5" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">!</text>
              </g>
            )}
          </g>
        ))}
      </svg>
      
      {/* X-Axis Labels */}
      <div className="flex justify-between mt-4 px-1 text-[8px] text-[var(--text-3)] overflow-hidden">
        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 5)) === 0).map((p, i) => (
          <span key={i} className="whitespace-nowrap">
            {type === 'day' ? `${p.original.date.split('-').slice(1).reverse().join('/')} (${p.original.shift})` : `Tuần ${p.original.week}`}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function UtilizationAnalysisTab({ user }: UtilizationAnalysisTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<(ProductionReport & { skus: SKU })[]>([])
  const [logs, setLogs] = useState<ChangeLog[]>([])
  
  // Filters
  const [filterType, setFilterType] = useState<'day' | 'week'>('day')
  const [showFilters, setShowFilters] = useState(false)
  
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`
    const { start, end } = getReportTimeRange(startOfMonth, endOfMonth)

    // Fetch Production Reports
    const { data: reportData, error: reportError } = await supabase
      .from('production_reports')
      .select('*, skus(*)')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth)
      .order('report_date', { ascending: true })

    // Fetch 4M Logs
    const { data: logData, error: logError } = await supabase
      .from('change_logs')
      .select('*')
      .gte('logged_at', start)
      .lte('logged_at', end)

    if (reportError || logError) {
      console.error('Error fetching data:', reportError || logError)
    } else {
      setReports((reportData as any) || [])
      setLogs((logData as any) || [])
    }
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

  // ── Data Processing ──────────────────────────────────────
  const analysis = useMemo(() => {
    if (reports.length === 0) return null

    // 1. Process Shift Data
    const shiftMap = new Map<string, ShiftData>()
    reports.forEach(r => {
      const dateStr = r.report_date || ''
      const shiftStr = r.shift || 'Unknown'
      const key = `${dateStr}_${shiftStr}`
      
      const utilization = ((r.productivity_points || 0) / 15) * 100
      
      const shiftIssues = logs.filter(l => {
        const logDate = getReportDateISO(l.logged_at)
        return logDate === dateStr && l.shift === shiftStr
      })

      const existing = shiftMap.get(key)
      if (existing) {
        existing.utilization = (existing.utilization + utilization) / 2
        existing.output += (r.actual_quantity || 0)
        existing.points = (existing.points + (r.productivity_points || 0)) / 2
      } else {
        shiftMap.set(key, {
          date: dateStr,
          shift: shiftStr,
          utilization,
          output: r.actual_quantity || 0,
          points: r.productivity_points || 0,
          issues: shiftIssues
        })
      }
    })

    const shiftData = Array.from(shiftMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.shift.localeCompare(b.shift)
    })

    // 2. Process Daily Data
    const dailyMap = new Map<string, DailyData>()
    shiftData.forEach(s => {
      const existing = dailyMap.get(s.date) || { date: s.date, totalOutput: 0, avgUtilization: 0, issueCount: 0, issues: [] }
      const currentAvg = existing.avgUtilization
      const currentOutput = existing.totalOutput
      
      dailyMap.set(s.date, {
        date: s.date,
        totalOutput: existing.totalOutput + s.output,
        avgUtilization: currentOutput > 0 ? (currentAvg + s.utilization) / 2 : s.utilization,
        issueCount: existing.issueCount + s.issues.length,
        issues: [...existing.issues, ...s.issues]
      })
    })

    const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // 3. Process Weekly Data
    const weeklyMap = new Map<number, WeeklyData>()
    dailyData.forEach(d => {
      const week = getWeekNumber(new Date(d.date))
      const existing = weeklyMap.get(week) || { week, totalOutput: 0, avgUtilization: 0, issueCount: 0 }
      
      weeklyMap.set(week, {
        week,
        totalOutput: existing.totalOutput + d.totalOutput,
        avgUtilization: existing.totalOutput > 0 ? (existing.avgUtilization + d.avgUtilization) / 2 : d.avgUtilization,
        issueCount: existing.issueCount + d.issueCount
      })
    })
    
    const weeklyData = Array.from(weeklyMap.values()).sort((a, b) => a.week - b.week)

    // 3. 4M Breakdown
    const mBreakdown = {
      Man: { count: 0, impact: 0, color: '#3b82f6' },
      Machine: { count: 0, impact: 0, color: '#f59e0b' },
      Material: { count: 0, impact: 0, color: '#10b981' },
      Method: { count: 0, impact: 0, color: '#8b5cf6' }
    }

    logs.forEach(l => {
      const cat = l.category as keyof typeof mBreakdown
      if (mBreakdown[cat]) {
        mBreakdown[cat].count++
        const matchingShift = shiftData.find(s => s.date === getReportDateISO(l.logged_at) && s.shift === l.shift)
        if (matchingShift && matchingShift.utilization < 100) {
          mBreakdown[cat].impact += (100 - matchingShift.utilization)
        }
      }
    })

    return {
      shiftData,
      dailyData,
      weeklyData,
      mBreakdown: Object.entries(mBreakdown).map(([name, data]) => ({ name, ...data })),
      avgUtilization: shiftData.length > 0 ? shiftData.reduce((acc, s) => acc + s.utilization, 0) / shiftData.length : 0,
      totalOutput: dailyData.reduce((acc, d) => acc + d.totalOutput, 0),
      totalIssues: logs.length
    }
  }, [reports, logs])

  return (
    <div className="space-y-4">
      {/* Header & Month Selector */}
      <div className="flex items-center justify-between card p-3 px-4">
        <button onClick={() => changeMonth(-1)} className="btn-ghost p-2 rounded-full">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-500" />
          <span className="text-sm font-bold">Tháng {month < 10 ? `0${month}` : month} / {year}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-brand-500 text-white' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-3)]'}`}
          >
            <Filter size={16} />
          </button>
          <button onClick={() => changeMonth(1)} className="btn-ghost p-2 rounded-full">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 space-y-3 overflow-hidden"
          >
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterType('day')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${filterType === 'day' ? 'bg-brand-500 text-white border-brand-500' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-3)]'}`}
              >
                Theo Ngày/Ca
              </button>
              <button 
                onClick={() => setFilterType('week')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${filterType === 'week' ? 'bg-brand-500 text-white border-brand-500' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-3)]'}`}
              >
                Theo Tuần
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)]">Đang tính toán hiệu suất...</p>
        </div>
      ) : !analysis ? (
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <Activity size={40} className="text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-2)] font-medium">Chưa có dữ liệu phân tích</p>
        </div>
      ) : (
        <>
          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 relative overflow-hidden bg-gradient-to-br from-brand-500/5 to-transparent border-brand-500/10">
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-medium mb-1 uppercase">Hiệu Suất TB (Utilization)</p>
                <h4 className="text-3xl font-black text-brand-500">{analysis.avgUtilization.toFixed(1)}%</h4>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={10} className={analysis.avgUtilization >= 90 ? 'text-green-500' : 'text-orange-500'} />
                  <span className={`text-[10px] font-bold ${analysis.avgUtilization >= 90 ? 'text-green-500' : 'text-orange-500'}`}>
                    {analysis.avgUtilization >= 100 ? 'Vượt mục tiêu' : analysis.avgUtilization >= 90 ? 'Đạt mục tiêu' : 'Dưới mục tiêu'}
                  </span>
                </div>
              </div>
              <Zap size={48} className="absolute -right-2 -bottom-2 text-brand-500/10 rotate-12" />
            </div>
            <div className="card p-4 relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-medium mb-1 uppercase">Tổng Sản Lượng</p>
                <h4 className="text-3xl font-black text-purple-500">{analysis.totalOutput.toLocaleString('vi-VN')}</h4>
                <p className="text-[10px] text-[var(--text-3)] mt-1">Đôi sản phẩm</p>
              </div>
              <Package size={48} className="absolute -right-2 -bottom-2 text-purple-500/10 rotate-12" />
            </div>
          </div>

          {/* Visualization Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-500" />
                <h3 className="text-sm font-bold">Biểu Đồ Hiệu Suất & Sự Cố 4M</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="text-[9px] text-[var(--text-3)]">Hiệu suất</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] text-[var(--text-3)]">Sự cố 4M</span>
                </div>
              </div>
            </div>
            
            <UtilizationChart 
              data={filterType === 'day' ? analysis.shiftData : analysis.weeklyData} 
              type={filterType} 
            />
            
            <div className="mt-8 flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--text-2)] leading-relaxed">
                Biểu đồ thể hiện tỷ lệ đạt so với target của từng ca. Các điểm màu đỏ đánh dấu sự xuất hiện của biến động 4M (Man, Machine, Material, Method) ảnh hưởng trực tiếp đến năng suất.
              </p>
            </div>
          </motion.div>

          {/* 4M Impact Analysis */}
          <div className="grid grid-cols-1 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-5"
            >
              <div className="flex items-center gap-2 mb-6">
                <Activity size={16} className="text-orange-500" />
                <h3 className="text-sm font-bold">Phân Tích Nguyên Nhân (4M)</h3>
              </div>
              
              <div className="space-y-5">
                {analysis.mBreakdown.map((m, i) => (
                  <div key={m.name}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        {m.name === 'Man' && <Users size={14} className="text-blue-500" />}
                        {m.name === 'Machine' && <Cpu size={14} className="text-orange-500" />}
                        {m.name === 'Material' && <Package size={14} className="text-green-500" />}
                        {m.name === 'Method' && <Zap size={14} className="text-purple-500" />}
                        <p className="text-xs font-bold text-[var(--text-1)]">{m.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-3)] font-medium">
                          {m.count} vụ
                        </span>
                        {m.impact > 0 && (
                          <span className="text-[10px] text-red-500 font-bold">
                            -{Math.round(m.impact / Math.max(1, analysis.shiftData.length))}% H.Suất
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.count / Math.max(1, analysis.totalIssues)) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Critical Issues List */}
            {analysis.totalIssues > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card border-red-500/20"
              >
                <div className="p-4 border-b border-red-500/10 bg-red-500/5">
                  <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Sự Cố Ảnh Hợp Năng Suất Nhất
                  </h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {analysis.shiftData
                    .filter(s => s.utilization < 80 && s.issues.length > 0)
                    .sort((a, b) => a.utilization - b.utilization)
                    .slice(0, 5)
                    .map((s) => (
                      <div key={`${s.date}_${s.shift}`} className="p-3 hover:bg-[var(--bg-input)] transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-xs font-bold text-[var(--text-1)]">{s.date} - {s.shift}</p>
                            <p className="text-[10px] text-red-500 font-bold">Hiệu suất: {s.utilization.toFixed(1)}%</p>
                          </div>
                          <div className="flex gap-1">
                            {s.issues.map((iss, idx) => (
                              <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold border border-red-500/20">
                                {iss.category}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--text-3)] line-clamp-2">
                          {s.issues.map(iss => iss.description).join('; ')}
                        </p>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
