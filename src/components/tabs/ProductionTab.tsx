'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, ChevronDown, Clock, Package,
  TrendingUp, AlertTriangle, RefreshCw, Send,
  Trophy, Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, SKU, ProductionReport } from '@/types'
import SuccessModal from '@/components/ui/SuccessModal'

interface ProductionTabProps {
  user: SessionUser
}

// ── Productivity Gauge ─────────────────────────────────────
function ProductivityGauge({ points }: { points: number }) {
  const clamped = Math.min(Math.max(points, 0), 15)
  const pct = clamped / 15
  const radius = 54
  const circumference = 2 * Math.PI * radius
  // Half-circle arc: starts from -180deg → 0deg
  const arcLength = circumference * 0.5
  const offset = arcLength - pct * arcLength

  const color =
    clamped >= 12 ? '#22c55e' :
    clamped >= 8  ? '#f59e0b' :
    clamped >= 4  ? '#f97316' : '#ef4444'

  const label =
    clamped >= 12 ? 'Xuất sắc' :
    clamped >= 8  ? 'Tốt' :
    clamped >= 4  ? 'Trung bình' : 'Cần cải thiện'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 132, height: 72 }}>
        <svg viewBox="0 0 132 72" className="w-full h-full overflow-visible">
          {/* Track */}
          <path
            d="M 10 66 A 56 56 0 0 1 122 66"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Active arc */}
          <motion.path
            d="M 10 66 A 56 56 0 0 1 122 66"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: 'easeOut', type: 'spring', stiffness: 60 }}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
          {/* Center value */}
          <text x="66" y="60" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
            {points > 0 ? clamped.toFixed(1) : '—'}
          </text>
          <text x="66" y="72" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">
            / 15 điểm
          </text>
        </svg>
      </div>
      {points > 0 && (
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function ProductionTab({ user }: ProductionTabProps) {
  const [skus, setSkus] = useState<SKU[]>([])
  const [reports, setReports] = useState<(ProductionReport & { skus: SKU })[]>([])
  const [loadingSkus, setLoadingSkus] = useState(true)
  const [loadingReports, setLoadingReports] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [selectedSku, setSelectedSku] = useState('')
  const [workingHours, setWorkingHours] = useState('')
  const [actualQty, setActualQty] = useState('')
  const [note, setNote] = useState('')
  const [skuOpen, setSkuOpen] = useState(false)

  // Computed productivity
  const currentSku = skus.find((s) => s.id === selectedSku)
  const productivityPoints = (() => {
    const h = parseFloat(workingHours)
    const q = parseFloat(actualQty)
    if (!currentSku || !h || !q || h <= 0) return 0
    return Math.min((q / (currentSku.target_per_hour * h)) * 15, 15)
  })()

  const fetchSkus = useCallback(async () => {
    setLoadingSkus(true)
    const { data } = await supabase.from('skus').select('*').eq('is_active', true).order('product_type')
    setSkus(data ?? [])
    setLoadingSkus(false)
  }, [])

  const fetchReports = useCallback(async () => {
    setLoadingReports(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('production_reports')
      .select('*, skus(*)')
      .eq('user_id', user.id)
      .eq('report_date', today)
      .order('created_at', { ascending: false })
      .limit(10)
    setReports((data as (ProductionReport & { skus: SKU })[]) ?? [])
    setLoadingReports(false)
  }, [user.id])

  useEffect(() => {
    fetchSkus()
    fetchReports()
  }, [fetchSkus, fetchReports])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSku || !workingHours || !actualQty) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('production_reports').insert({
        user_id: user.id,
        sku_id: selectedSku,
        working_hours: parseFloat(workingHours),
        actual_quantity: parseFloat(actualQty),
        productivity_points: parseFloat(productivityPoints.toFixed(2)),
        note: note.trim() || null,
        report_date: new Date().toISOString().split('T')[0],
      })
      if (error) throw error
      setShowSuccess(true)
      setSelectedSku('')
      setWorkingHours('')
      setActualQty('')
      setNote('')
      await fetchReports()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const todayTotal = reports.reduce((acc, r) => acc + r.actual_quantity, 0)
  const avgPoints = reports.length
    ? reports.reduce((acc, r) => acc + r.productivity_points, 0) / reports.length
    : 0

  return (
    <>
      <SuccessModal
        show={showSuccess}
        message="Sản lượng đã ghi nhận!"
        onDone={() => setShowSuccess(false)}
      />

      <div className="space-y-4">

        {/* ── Live KPI banner ───────────────────────── */}
        {reports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: BarChart3, label: 'Lượt ghi', value: String(reports.length), color: '#0052CC' },
              { icon: Package, label: 'Tổng Tấm', value: todayTotal.toLocaleString('vi-VN'), color: '#8b5cf6' },
              { icon: Trophy, label: 'KPI TB', value: `${avgPoints.toFixed(1)}/15`, color: avgPoints >= 10 ? '#22c55e' : '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label}
                className="card p-3 flex flex-col items-center gap-1 text-center"
              >
                <stat.icon size={16} style={{ color: stat.color }} />
                <p className="text-base font-bold text-[var(--text-1)]">{stat.value}</p>
                <p className="text-[10px] text-[var(--text-3)]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Form card ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-brand-500" />
            </div>
            <div>
              <h2 className="section-title text-base">Báo Cáo Sản Lượng</h2>
              <p className="text-xs text-[var(--text-3)]">Ca hôm nay · {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* SKU Dropdown */}
            <div>
              <label className="label" htmlFor="sku-select">Loại Sản Phẩm</label>
              <div className="relative">
                <button
                  id="sku-select"
                  type="button"
                  onClick={() => setSkuOpen((p) => !p)}
                  className="input-field flex items-center justify-between"
                  disabled={loadingSkus}
                >
                  <span className={currentSku ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'}>
                    {loadingSkus ? 'Đang tải...' : currentSku ? currentSku.product_type : 'Chọn loại sản phẩm...'}
                  </span>
                  <ChevronDown size={15} className={`text-[var(--text-3)] transition-transform duration-200 ${skuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {skuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSkuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{ transformOrigin: 'top' }}
                        className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-[var(--border)]
                          bg-[var(--bg-card)] shadow-glass overflow-hidden max-h-52 overflow-y-auto"
                      >
                        {skus.map((sku) => (
                          <button
                            key={sku.id}
                            type="button"
                            onClick={() => { setSelectedSku(sku.id); setSkuOpen(false) }}
                            className="w-full flex items-center justify-between px-4 py-3
                              hover:bg-brand-500/8 transition-colors duration-100 text-left"
                          >
                            <p className="text-sm font-semibold text-[var(--text-1)]">{sku.product_type}</p>
                            <span className="text-xs text-[var(--text-3)] shrink-0">
                              {sku.target_per_hour} {sku.unit}/h
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Target info */}
            {currentSku && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/6 border border-brand-500/15"
              >
                <Zap size={12} className="text-brand-500" />
                <p className="text-xs text-brand-500">
                  Mục tiêu: <strong>{currentSku.target_per_hour} {currentSku.unit}/giờ</strong>
                </p>
              </motion.div>
            )}

            {/* Hours + Qty grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="hours-input">
                  <Clock size={11} className="inline mr-1" />
                  Số Giờ Làm
                </label>
                <input
                  id="hours-input"
                  type="number"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="8"
                  step="0.5"
                  min="0.5"
                  max="24"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label" htmlFor="qty-input">
                  <Package size={11} className="inline mr-1" />
                  Số Tấm Thực Tế
                </label>
                <input
                  id="qty-input"
                  type="number"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  placeholder="640"
                  min="0"
                  className="input-field"
                />
              </div>
            </div>

            {/* Productivity live preview */}
            <AnimatePresence>
              {(workingHours || actualQty) && currentSku && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="flex flex-col items-center gap-2 py-4 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]"
                >
                  <p className="text-xs font-medium text-[var(--text-3)] flex items-center gap-1">
                    <TrendingUp size={11} />
                    Điểm Năng Suất Thực Tế
                  </p>
                  <ProductivityGauge points={productivityPoints} />
                  <p className="text-[10px] text-[var(--text-3)] text-center">
                    = ({actualQty || 0} ÷ ({currentSku.target_per_hour} × {workingHours || 0})) × 15
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note */}
            <div>
              <label className="label" htmlFor="note-input">Ghi Chú <span className="text-[var(--text-3)]">(tuỳ chọn)</span></label>
              <textarea
                id="note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Máy dừng 30 phút, thiếu NVL..."
                rows={2}
                className="input-field resize-none"
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={submitting || !selectedSku || !workingHours || !actualQty}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full py-3.5 text-sm"
            >
              {submitting ? (
                <><RefreshCw size={16} className="animate-spin" /> Đang ghi nhận...</>
              ) : (
                <><Send size={16} /> Ghi Nhận Sản Lượng</>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* ── Today's history ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-sm">Lịch Sử Hôm Nay</h3>
            <button
              onClick={fetchReports}
              className="btn-ghost py-1 px-2 text-xs gap-1"
              disabled={loadingReports}
            >
              <RefreshCw size={12} className={loadingReports ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          {loadingReports ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg shimmer bg-[var(--bg-input)]" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Package size={32} className="text-[var(--text-3)]" />
              <p className="text-sm text-[var(--text-3)]">Chưa có dữ liệu hôm nay</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Loại SP', 'Giờ làm', 'Số tấm', 'KPI', 'Giờ ghi'].map((h) => (
                      <th key={h} className="pb-2 text-left font-medium text-[var(--text-3)] px-1">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {reports.map((r) => {
                    const pts = r.productivity_points
                    const ptColor = pts >= 12 ? '#22c55e' : pts >= 8 ? '#f59e0b' : '#ef4444'
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group"
                      >
                        <td className="py-2.5 px-1">
                          <p className="font-semibold text-[var(--text-1)]">{r.skus?.product_type}</p>
                        </td>
                        <td className="py-2.5 px-1 text-[var(--text-2)]">{r.working_hours}h</td>
                        <td className="py-2.5 px-1 font-medium text-[var(--text-1)]">
                          {r.actual_quantity.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-1">
                          <span className="font-bold" style={{ color: ptColor }}>
                            {pts.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2.5 px-1 text-[var(--text-3)]">
                          {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Warning if any low KPI */}
          {reports.some((r) => r.productivity_points < 8) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20"
            >
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Có lượt báo cáo chưa đạt KPI tối thiểu (8/15 điểm)
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  )
}
