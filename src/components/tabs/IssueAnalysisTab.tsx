'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertOctagon, Calendar, ChevronLeft, ChevronRight, 
  Activity, ShieldAlert, BarChart3, RefreshCw,
  Cpu, Zap, AlertTriangle, Layers
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, ChangeLog } from '@/types'

interface IssueAnalysisTabProps {
  user: SessionUser
}

type AggregatedCategory = {
  category: string
  count: number
  qualityCount: number
}

type RepeatIssue = {
  machineId: string
  category: string
  count: number
  lastOccurrence: string
}

export default function IssueAnalysisTab({ user }: IssueAnalysisTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [logs, setLogs] = useState<(ChangeLog & { users: { full_name: string } })[]>([])
  const [loading, setLoading] = useState(true)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()

  const fetchMonthlyLogs = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}T23:59:59Z`

    let query = supabase
      .from('change_logs')
      .select('*, users(full_name)')
      .gte('logged_at', startDate)
      .lte('logged_at', endDate)

    // Supervisor view vs Worker view
    if (user.role !== 'supervisor' && user.role !== 'admin' && user.role !== 'manager') {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.order('logged_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching logs:', error)
    } else {
      setLogs((data as any) ?? [])
    }
    setLoading(false)
  }, [month, year, daysInMonth, user.id, user.role])

  useEffect(() => {
    fetchMonthlyLogs()
  }, [fetchMonthlyLogs])

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate)
    next.setMonth(next.getMonth() + offset)
    setCurrentDate(next)
  }

  // ── Aggregation Logic ────────────────────────────────────
  const stats = useMemo(() => {
    if (logs.length === 0) return null

    const totalIncidents = logs.length
    const qualityIncidents = logs.filter(l => l.affects_quality).length
    const highSeverity = logs.filter(l => l.severity === 'high').length

    // Category breakdown
    const catMap = new Map<string, { count: number, quality: number }>()
    logs.forEach(l => {
      const existing = catMap.get(l.category) || { count: 0, quality: 0 }
      catMap.set(l.category, {
        count: existing.count + 1,
        quality: existing.quality + (l.affects_quality ? 1 : 0)
      })
    })

    const categories: AggregatedCategory[] = Array.from(catMap.entries()).map(([category, val]) => ({
      category,
      count: val.count,
      qualityCount: val.quality
    })).sort((a, b) => b.count - a.count)

    // Repetition analysis: Machine + Category
    const repeatMap = new Map<string, { count: number, lastDate: string }>()
    logs.forEach(l => {
      const key = `${l.machine_id}::${l.category}`
      const existing = repeatMap.get(key) || { count: 0, lastDate: '' }
      repeatMap.set(key, {
        count: existing.count + 1,
        lastDate: !existing.lastDate || new Date(l.logged_at) > new Date(existing.lastDate) ? l.logged_at : existing.lastDate
      })
    })

    const repeats: RepeatIssue[] = Array.from(repeatMap.entries())
      .filter(([_, val]) => val.count > 1) // Only recurring issues
      .map(([key, val]) => {
        const [machineId, category] = key.split('::')
        return { machineId, category, count: val.count, lastOccurrence: val.lastDate }
      })
      .sort((a, b) => b.count - a.count)

    return {
      totalIncidents,
      qualityIncidents,
      highSeverity,
      categories,
      repeats,
      qualityRate: (qualityIncidents / totalIncidents) * 100
    }
  }, [logs])

  return (
    <div className="space-y-4">
      {/* ── Month Selector ─────────────────────────── */}
      <div className="flex items-center justify-between card p-3 px-4">
        <button onClick={() => changeMonth(-1)} className="btn-ghost p-2 rounded-full">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-500" />
          <span className="text-sm font-bold">Phân Tích Tháng {month < 10 ? `0${month}` : month} / {year}</span>
        </div>
        <button onClick={() => changeMonth(1)} className="btn-ghost p-2 rounded-full">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw size={32} className="text-brand-500 animate-spin" />
          <p className="text-sm text-[var(--text-3)]">Đang tổng hợp dữ liệu 4M...</p>
        </div>
      ) : !stats ? (
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <Activity size={40} className="text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-2)] font-medium">Không có bản ghi biến động 4M nào</p>
          <p className="text-xs text-[var(--text-3)]">Dữ liệu ổn định, không có sự cố ghi nhận</p>
        </div>
      ) : (
        <>
          {/* ── Summary Grid ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 relative overflow-hidden bg-gradient-to-br from-red-500/5 to-transparent border-red-500/10">
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-medium mb-1 uppercase tracking-wider">Tổng Sự Cố 4M</p>
                <h4 className="text-3xl font-black text-red-500">{stats.totalIncidents}</h4>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-red-600 dark:text-red-400 font-bold">
                  <ShieldAlert size={10} />
                  <span>{stats.qualityIncidents} ảnh hưởng chất lượng</span>
                </div>
              </div>
              <AlertOctagon size={48} className="absolute -right-2 -bottom-2 text-red-500/10 rotate-12" />
            </div>
            <div className="card p-4 relative overflow-hidden bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/10">
              <div className="relative z-10">
                <p className="text-[10px] text-[var(--text-3)] font-medium mb-1 uppercase tracking-wider">Mức Độ Lặp Lại</p>
                <h4 className="text-3xl font-black text-orange-500">{stats.repeats.length}</h4>
                <p className="text-[10px] text-[var(--text-3)] mt-1">vấn đề lặp lại từ 2 lần trở lên</p>
              </div>
              <Activity size={48} className="absolute -right-2 -bottom-2 text-orange-500/10 rotate-12" />
            </div>
          </div>

          {/* ── Category & Quality Chart ──────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-500" />
                <h3 className="text-sm font-bold">Phân Bổ Biến Động 4M</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                Tỷ lệ lỗi: {stats.qualityRate.toFixed(1)}%
              </span>
            </div>
            
            <div className="space-y-4">
              {stats.categories.map((c, i) => (
                <div key={c.category}>
                  <div className="flex justify-between items-end mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      <p className="text-xs font-bold text-[var(--text-1)]">{c.category}</p>
                    </div>
                    <p className="text-[10px] font-medium text-[var(--text-3)]">
                      {c.count} vụ {c.qualityCount > 0 && <span className="text-red-500">({c.qualityCount} ảnh hưởng CL)</span>}
                    </p>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-input)] rounded-full overflow-hidden flex">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.count / stats.totalIncidents) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full bg-brand-500/60"
                    />
                    {c.qualityCount > 0 && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.qualityCount / stats.totalIncidents) * 100}%` }}
                        className="h-full bg-red-500"
                        style={{ marginLeft: - (c.qualityCount / stats.totalIncidents) * 100 + '%' }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Repetition Ranking ────────────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-orange-500" />
              <h3 className="text-sm font-bold">Cảnh Báo Vấn Đề Lặp Lại</h3>
            </div>
            
            {stats.repeats.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <Zap size={24} className="text-green-500 opacity-30" />
                <p className="text-xs text-[var(--text-3)]">Tuyệt vời, không có vấn đề lặp lại trong tháng này.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.repeats.map((r) => (
                  <div key={`${r.machineId}-${r.category}`} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] group">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-black text-sm">
                      x{r.count}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Cpu size={10} className="text-[var(--text-3)]" />
                        <p className="text-xs font-bold text-[var(--text-1)] truncate">{r.machineId}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 font-medium">{r.category}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-3)]">Lần cuối: {new Date(r.lastOccurrence).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <AlertTriangle size={14} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[9px] text-[var(--text-3)] italic text-center">
              * Vấn đề lặp lại cho thấy sự cố chưa được xử lý tận gốc.
            </p>
          </motion.div>

          {/* ── Quality Impact List ───────────────────── */}
          {stats.qualityIncidents > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card border-red-500/20"
            >
              <div className="p-4 border-b border-red-500/10 bg-red-500/5">
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Sự Cố Ảnh Hưởng Chất Lượng
                </h3>
              </div>
              <div className="p-2 space-y-1">
                {logs.filter(l => l.affects_quality).slice(0, 5).map((l) => (
                  <div key={l.id} className="p-3 rounded-lg hover:bg-red-500/5 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-[var(--text-1)]">{l.machine_id}</p>
                      <span className="text-[9px] text-red-500 font-bold uppercase">{l.severity}</span>
                    </div>
                    <p className="text-xs text-[var(--text-2)] line-clamp-2">{l.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[9px] text-[var(--text-3)]">Bởi: {l.users?.full_name}</p>
                      <p className="text-[9px] text-[var(--text-3)]">{new Date(l.logged_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
