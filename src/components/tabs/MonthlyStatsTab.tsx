'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, Calendar, Package, TrendingUp, 
  ChevronLeft, ChevronRight, Trophy, Target,
  Users, Activity, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, SKU, ProductionReport } from '@/types'

interface MonthlyStatsTabProps {
  user: SessionUser
}

type AggregatedDay = {
  day: number
  avgPoints: number
  totalQty: number
  count: number
}

type SkuStats = {
  skuName: string
  totalQty: number
  avgPoints: number
  count: number
}

// ── Simple Area Chart Component ─────────────────────────────
function MonthlyAreaChart({ data, daysInMonth }: { data: AggregatedDay[], daysInMonth: number }) {
  const maxPoints = 15
  const chartHeight = 120
  const chartWidth = 300 // Flexible via CSS
  
  const points = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const found = data.find(d => d.day === day)
      return { day, val: found ? found.avgPoints : 0 }
    })
  }, [data, daysInMonth])

  // Generate SVG path
  const pathData = useMemo(() => {
    if (points.length === 0) return ''
    const coords = points.map((p, i) => {
      const x = (i / (daysInMonth - 1)) * 100 // % width
      const y = chartHeight - (p.val / maxPoints) * chartHeight
      return `${x},${y}`
    })
    return `M 0,${chartHeight} ` + coords.map(c => `L ${c}`).join(' ') + ` L 100,${chartHeight} Z`
  }, [points, daysInMonth])

  const lineData = useMemo(() => {
    if (points.length === 0) return ''
    const coords = points.map((p, i) => {
      const x = (i / (daysInMonth - 1)) * 100
      const y = chartHeight - (p.val / maxPoints) * chartHeight
      return `${x},${y}`
    })
    return `M ${coords.join(' L ')}`
  }, [points, daysInMonth])

  return (
    <div className="relative w-full h-[160px] mt-4">
      <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-[var(--text-3)] pointer-events-none">
        <div className="border-t border-[var(--border)] border-dashed w-full pt-1">15 KPI</div>
        <div className="border-t border-[var(--border)] border-dashed w-full pt-1">10 KPI</div>
        <div className="border-t border-[var(--border)] border-dashed w-full pt-1">5 KPI</div>
        <div className="pt-1">0</div>
      </div>
      
      <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full pt-2">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill Area */}
        <motion.path
          initial={{ d: `M 0,${chartHeight} L 0,${chartHeight} L 100,${chartHeight} L 100,${chartHeight} Z` }}
          animate={{ d: pathData }}
          transition={{ duration: 1, ease: "easeOut" }}
          fill="url(#chartGradient)"
        />
        
        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          d={lineData}
          fill="none"
          stroke="var(--brand-500)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Dots for active days */}
        {points.filter(p => p.val > 0).map((p, i) => (
          <circle 
            key={i} 
            cx={(p.day - 1) / (daysInMonth - 1) * 100} 
            cy={chartHeight - (p.val / maxPoints) * chartHeight} 
            r="1.5" 
            fill="var(--brand-500)" 
          />
        ))}
      </svg>
      
      <div className="flex justify-between mt-2 px-1 text-[9px] text-[var(--text-3)]">
        <span>Ngày 01</span>
        <span>Ngày {Math.floor(daysInMonth / 2)}</span>
        <span>Ngày {daysInMonth}</span>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function MonthlyStatsTab({ user }: MonthlyStatsTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // New Filter States
  const [useDateRange, setUseDateRange] = useState(false)
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [searchMsnv, setSearchMsnv] = useState('')

  const [reports, setReports] = useState<(ProductionReport & { skus: SKU })[]>([])
  const [loading, setLoading] = useState(true)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()

  const fetchMonthlyData = useCallback(async () => {
    setLoading(true)
    
    let queryStartDate = `${year}-${String(month).padStart(2, '0')}-01`
    let queryEndDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

    if (useDateRange) {
      queryStartDate = startDate
      queryEndDate = endDate
    }

    let query = supabase
      .from('production_reports')
      .select('*, skus(*), users(msnv, full_name)')
      .gte('report_date', queryStartDate)
      .lte('report_date', queryEndDate)

    if (searchMsnv.trim()) {
      // Find user id by msnv first or use join filter if possible
      // For simplicity and since we have the users relation:
      query = query.filter('users.msnv', 'ilike', `%${searchMsnv.trim()}%`)
    } else if (user.role !== 'supervisor' && user.role !== 'admin' && user.role !== 'manager') {
       query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.order('report_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching monthly stats:', error)
    } else {
      setReports((data as (ProductionReport & { skus: SKU })[]) ?? [])
    }
    setLoading(false)
  }, [month, year, daysInMonth, user.id, user.role, useDateRange, startDate, endDate, searchMsnv])

  useEffect(() => {
    fetchMonthlyData()
  }, [fetchMonthlyData])

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate)
    next.setMonth(next.getMonth() + offset)
    setCurrentDate(next)
  }

  const handleDownloadCSV = () => {
    if (reports.length === 0) return

    // CSV header with BOM for UTF-8 compatibility with Excel
    let csvContent = '\uFEFF'
    csvContent += 'Ngày,Ca,Giờ ghi,MSNV,Người báo cáo,Mã SP,Tên SP,Giờ làm,Số lượng,Đơn vị,KPI,Ghi chú\n'

    reports.forEach(r => {
      const logTime = new Date(r.created_at).toLocaleTimeString('vi-VN')
      const row = [
        r.report_date,
        r.shift || '—',
        logTime,
        r.users?.msnv || '',
        `"${(r.users?.full_name || '').replace(/"/g, '""')}"`,
        r.skus?.id || '',
        `"${(r.skus?.product_type || '').replace(/"/g, '""')}"`,
        r.working_hours,
        r.actual_quantity,
        r.skus?.unit || 'đôi',
        r.productivity_points,
        `"${(r.note || '').replace(/"/g, '""')}"`
      ]
      csvContent += row.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const filename = `Bao_cao_san_luong_${month}_${year}.csv`
    
    if ((navigator as any).msSaveBlob) {
      (navigator as any).msSaveBlob(blob, filename)
    } else {
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // ── Calculated Data ──────────────────────────────────────
  const stats = useMemo(() => {
    if (reports.length === 0) return null

    const totalQty = reports.reduce((acc, r) => acc + r.actual_quantity, 0)
    const avgPoints = reports.reduce((acc, r) => acc + r.productivity_points, 0) / reports.length
    
    // Group by day
    const dayMap = new Map<number, { sumPoints: number, sumQty: number, count: number }>()
    reports.forEach(r => {
      const d = new Date(r.report_date).getDate()
      const existing = dayMap.get(d) || { sumPoints: 0, sumQty: 0, count: 0 }
      dayMap.set(d, {
        sumPoints: existing.sumPoints + r.productivity_points,
        sumQty: existing.sumQty + r.actual_quantity,
        count: existing.count + 1
      })
    })
    
    const dailyData: AggregatedDay[] = Array.from(dayMap.entries()).map(([day, val]) => ({
      day,
      avgPoints: val.sumPoints / val.count,
      totalQty: val.sumQty,
      count: val.count
    }))

    // Group by SKU
    const skuMap = new Map<string, { sumPoints: number, sumQty: number, count: number }>()
    reports.forEach(r => {
      const name = r.skus?.product_type || 'Unknown'
      const existing = skuMap.get(name) || { sumPoints: 0, sumQty: 0, count: 0 }
      skuMap.set(name, {
        sumPoints: existing.sumPoints + r.productivity_points,
        sumQty: existing.sumQty + r.actual_quantity,
        count: existing.count + 1
      })
    })

    const skuData: SkuStats[] = Array.from(skuMap.entries()).map(([skuName, val]) => ({
      skuName,
      totalQty: val.sumQty,
      avgPoints: val.sumPoints / val.count,
      count: val.count
    })).sort((a, b) => b.totalQty - a.totalQty)

    const bestDay = dailyData.reduce((prev, curr) => prev.avgPoints > curr.avgPoints ? prev : curr, dailyData[0])

    return {
      totalQty,
      avgPoints,
      dailyData,
      skuData,
      bestDay,
      reportCount: reports.length
    }
  }, [reports])

  return (
    <div className="space-y-4">
      {/* ── Month Selector ─────────────────────────── */}
      <div className="flex items-center justify-between card p-3 px-4">
        <button onClick={() => changeMonth(-1)} className="btn-ghost p-2 rounded-full">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-500" />
          <span className="text-sm font-bold">Tháng {month < 10 ? `0${month}` : month} / {year}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setUseDateRange(!useDateRange)}
            className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1 ${useDateRange ? 'bg-brand-500 text-white border-brand-500' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-2)] hover:border-brand-500/50'}`}
          >
            {useDateRange ? 'Đang lọc ngày' : 'Lọc theo ngày'}
          </button>
          {reports.length > 0 && (
            <button 
              onClick={handleDownloadCSV}
              className="btn-ghost p-2 rounded-full text-brand-500 hover:bg-brand-500/10"
              title="Tải báo cáo CSV"
            >
              <Download size={18} />
            </button>
          )}
          <button onClick={() => changeMonth(1)} className="btn-ghost p-2 rounded-full">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Advanced Filters ───────────────────────── */}
      <AnimatePresence>
        {useDateRange && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1 block">Từ ngày</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input text-xs" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1 block">Đến ngày</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input text-xs" 
                />
              </div>
            </div>
            {(user.role === 'supervisor' || user.role === 'admin' || user.role === 'manager') && (
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1 block">Mã nhân viên (MSNV)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Nhập MSNV để tìm kiếm..." 
                    value={searchMsnv}
                    onChange={(e) => setSearchMsnv(e.target.value)}
                    className="input text-xs pl-8" 
                  />
                  <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)]">Đang phân tích dữ liệu...</p>
        </div>
      ) : !stats ? (
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <Activity size={40} className="text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-2)] font-medium">Không tìm thấy dữ liệu báo cáo</p>
          <p className="text-xs text-[var(--text-3)]">Hãy thay đổi điều kiện lọc hoặc ghi nhận sản lượng</p>
        </div>
      ) : (
        <>
          {/* ── Main Stats Grid ──────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-medium mb-1">KPI Trung Bình</p>
                <h4 className="text-2xl font-black text-brand-500">{stats.avgPoints.toFixed(1)}</h4>
                <p className="text-[10px] text-[var(--text-3)]">trên thang điểm 15</p>
              </div>
              <Trophy size={48} className="absolute -right-2 -bottom-2 text-brand-500/10 rotate-12" />
            </div>
            <div className="card p-4 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-medium mb-1">Tổng Sản Lượng</p>
                <h4 className="text-2xl font-black text-purple-500">{stats.totalQty.toLocaleString('vi-VN')}</h4>
                <p className="text-[10px] text-[var(--text-3)]">đôi sản phẩm</p>
              </div>
              <Package size={48} className="absolute -right-2 -bottom-2 text-purple-500/10 rotate-12" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-3)]">Lượt báo cáo</p>
                <p className="text-sm font-bold text-[var(--text-1)]">{stats.reportCount}</p>
              </div>
            </div>
            <div className="card p-3 flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Target size={16} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-3)]">Ngày tốt nhất</p>
                <p className="text-sm font-bold text-[var(--text-1)]">{stats.bestDay?.day || '—'}</p>
              </div>
            </div>
          </div>

          {/* ── Performance Chart ────────────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold">Biểu Đồ Xu Hướng KPI</h3>
            </div>
            <p className="text-[10px] text-[var(--text-3)] mb-4">Điểm năng suất trung bình theo ngày</p>
            
            <MonthlyAreaChart data={stats.dailyData} daysInMonth={daysInMonth} />
          </motion.div>

          {/* ── SKU Breakdown ───────────────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold">Hiệu Suất Theo Sản Phẩm</h3>
            </div>
            
            <div className="space-y-3">
              {stats.skuData.map((s, i) => (
                <div key={s.skuName} className="group">
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-xs font-semibold text-[var(--text-1)]">{s.skuName}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{s.totalQty.toLocaleString('vi-VN')} đôi</p>
                  </div>
                  <div className="relative h-2 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.avgPoints / 15) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{ 
                        background: s.avgPoints >= 12 ? '#22c55e' : s.avgPoints >= 8 ? '#f59e0b' : '#ef4444' 
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-[9px] text-[var(--text-3)]">{s.count} lượt làm</p>
                    <p className="text-[9px] font-bold" style={{ 
                      color: s.avgPoints >= 12 ? '#22c55e' : s.avgPoints >= 8 ? '#f59e0b' : '#ef4444' 
                    }}>
                      KPI: {s.avgPoints.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
