'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Cpu, Layers, BookOpen,
  AlertTriangle, Send, RefreshCw,
  Shield, ShieldAlert, Info, Wrench
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FourMCategory } from '@/types'
import SuccessModal from '@/components/ui/SuccessModal'

interface Changelog4MTabProps {
  user: SessionUser
}

const FOUR_M_ITEMS: {
  key: FourMCategory
  label: string
  labelVN: string
  icon: React.ElementType
  color: string
  bg: string
  desc: string
}[] = [
  {
    key: 'Man',
    label: 'Man',
    labelVN: 'Con Người',
    icon: Users,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    desc: 'Thay đổi nhân sự, kỹ năng, đào tạo',
  },
  {
    key: 'Machine',
    label: 'Machine',
    labelVN: 'Máy Móc',
    icon: Cpu,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    desc: 'Sửa chữa, điều chỉnh thiết bị',
  },
  {
    key: 'Material',
    label: 'Material',
    labelVN: 'Vật Liệu',
    icon: Layers,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    desc: 'Thay đổi NVL, nhà cung cấp, lô hàng',
  },
  {
    key: 'Method',
    label: 'Method',
    labelVN: 'Phương Pháp',
    icon: BookOpen,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    desc: 'Thay đổi quy trình, tiêu chuẩn, WI',
  },
]

export default function Changelog4MTab({ user }: Changelog4MTabProps) {
  const [category, setCategory] = useState<FourMCategory | ''>('')
  const [machineId, setMachineId] = useState('')
  const [description, setDescription] = useState('')
  const [affectsQuality, setAffectsQuality] = useState(false)
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low')
  const [shift, setShift] = useState('Ca 1')
  const [submitting, setSubmitting] = useState(false)

  // Auto-detect shift
  useState(() => {
    const hour = new Date().getHours()
    let defaultShift = 'Ca 3'
    if (hour >= 6 && hour < 14) defaultShift = 'Ca 1'
    else if (hour >= 14 && hour < 22) defaultShift = 'Ca 2'
    setShift(defaultShift)
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(() => {
    const e: Record<string, string> = {}
    if (!category) e.category = 'Vui lòng chọn loại biến động'
    if (!machineId.trim()) e.machineId = 'Vui lòng nhập ID máy / vị trí'
    if (!description.trim()) e.description = 'Vui lòng mô tả nội dung thay đổi'
    if (description.trim().length < 10) e.description = 'Mô tả phải có ít nhất 10 ký tự'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [category, machineId, description])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('change_logs').insert({
        user_id: user.id,
        machine_id: machineId.trim(),
        category,
        description: description.trim(),
        affects_quality: affectsQuality,
        severity,
        shift,
      })
      if (error) throw error
      setShowSuccess(true)
      setCategory('')
      setMachineId('')
      setDescription('')
      setAffectsQuality(false)
      setSeverity('low')
      setErrors({})
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedM = FOUR_M_ITEMS.find((m) => m.key === category)

  return (
    <>
      <SuccessModal
        show={showSuccess}
        message="Biến động 4M đã ghi nhận!"
        onDone={() => setShowSuccess(false)}
      />

      <div className="space-y-4">

        {/* ── 4M Quick select ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Wrench size={16} className="text-purple-500" />
            </div>
            <div>
              <h2 className="section-title text-base">Biến Động 4M</h2>
              <p className="text-xs text-[var(--text-3)]">Chọn loại biến động xảy ra</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FOUR_M_ITEMS.map((item) => {
              const active = category === item.key
              return (
                <motion.button
                  key={item.key}
                  type="button"
                  onClick={() => { setCategory(item.key); setErrors((p) => ({ ...p, category: '' })) }}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-200"
                  style={{
                    borderColor: active ? item.color : 'var(--border)',
                    background: active ? item.bg : 'var(--bg-input)',
                    boxShadow: active ? `0 4px 16px ${item.color}25` : 'none',
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="active-m"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: item.bg }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: active ? item.color : `${item.color}25` }}
                  >
                    <item.icon size={22} style={{ color: active ? '#fff' : item.color }} />
                  </div>
                  <div className="relative">
                    <p className="font-bold text-sm" style={{ color: active ? item.color : 'var(--text-1)' }}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)]">{item.labelVN}</p>
                  </div>
                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: item.color }}
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Category hint */}
          <AnimatePresence>
            {selectedM && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: `${selectedM.color}10`, border: `1px solid ${selectedM.color}30` }}
              >
                <Info size={12} style={{ color: selectedM.color }} />
                <p className="text-xs" style={{ color: selectedM.color }}>{selectedM.desc}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {errors.category && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertTriangle size={11} /> {errors.category}
            </p>
          )}
        </motion.div>

        {/* ── Detail Form ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="card p-5"
        >
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Machine ID */}
            <div>
              <label className="label" htmlFor="machine-input">
                <Cpu size={11} className="inline mr-1" />
                ID Máy / Vị Trí
              </label>
              <input
                id="machine-input"
                type="text"
                value={machineId}
                onChange={(e) => { setMachineId(e.target.value); setErrors((p) => ({ ...p, machineId: '' })) }}
                placeholder="VD: M-01, Line-A, Chuyền 2..."
                className={`input-field ${errors.machineId ? 'border-red-500/50 focus:ring-red-500/50' : ''}`}
              />
              {errors.machineId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} />{errors.machineId}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="label" htmlFor="desc-input">
                Nội Dung Thay Đổi / Sự Cố
              </label>
              <textarea
                id="desc-input"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: '' })) }}
                placeholder="Mô tả chi tiết điều gì đã thay đổi, tại sao, và hành động khắc phục (nếu có)..."
                rows={4}
                className={`input-field resize-none ${errors.description ? 'border-red-500/50 focus:ring-red-500/50' : ''}`}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.description
                  ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={11} />{errors.description}</p>
                  : <span />
                }
                <span className={`text-[10px] ${description.length < 10 ? 'text-[var(--text-3)]' : 'text-green-500'}`}>
                  {description.length} ký tự
                </span>
              </div>
            </div>

            {/* Shift */}
            <div>
              <label className="label">Ca Làm Việc</label>
              <div className="grid grid-cols-3 gap-2">
                {['Ca 1', 'Ca 2', 'Ca 3'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      shift === s 
                        ? 'bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/20' 
                        : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-3)] hover:border-purple-500/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="label">Mức Độ Nghiêm Trọng</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: 'low', label: 'Thấp', color: '#22c55e' },
                  { val: 'medium', label: 'Trung bình', color: '#f59e0b' },
                  { val: 'high', label: 'Cao', color: '#ef4444' },
                ] as const).map((s) => (
                  <motion.button
                    key={s.val}
                    type="button"
                    onClick={() => setSeverity(s.val)}
                    whileTap={{ scale: 0.95 }}
                    className="py-2 rounded-lg text-xs font-semibold border-2 transition-all duration-150"
                    style={{
                      borderColor: severity === s.val ? s.color : 'var(--border)',
                      background: severity === s.val ? `${s.color}15` : 'var(--bg-input)',
                      color: severity === s.val ? s.color : 'var(--text-3)',
                    }}
                  >
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quality Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: affectsQuality ? '#ef4444' : 'var(--border)',
                background: affectsQuality ? 'rgba(239,68,68,0.06)' : 'var(--bg-input)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: affectsQuality ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)' }}
                >
                  {affectsQuality
                    ? <ShieldAlert size={18} className="text-red-500" />
                    : <Shield size={18} className="text-green-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">Ảnh Hưởng Chất Lượng?</p>
                  <p className="text-xs" style={{ color: affectsQuality ? '#ef4444' : '#22c55e' }}>
                    {affectsQuality ? '⚠ Cần thông báo QC ngay' : '✓ Không ảnh hưởng chất lượng'}
                  </p>
                </div>
              </div>

              {/* Toggle */}
              <motion.button
                type="button"
                onClick={() => setAffectsQuality((p) => !p)}
                whileTap={{ scale: 0.92 }}
                className="relative w-12 h-6 rounded-full transition-colors duration-250 shrink-0"
                style={{ background: affectsQuality ? '#ef4444' : '#22c55e30', border: `2px solid ${affectsQuality ? '#ef4444' : '#22c55e'}` }}
                aria-label="Toggle quality impact"
              >
                <motion.div
                  animate={{ x: affectsQuality ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="absolute top-0.5 w-4 h-4 rounded-full"
                  style={{ background: affectsQuality ? '#fff' : '#22c55e' }}
                />
              </motion.button>
            </div>

            {/* Quality warning */}
            <AnimatePresence>
              {affectsQuality && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/25"
                >
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-500">Cảnh Báo Chất Lượng!</p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Biến động này được đánh dấu ảnh hưởng chất lượng sản phẩm.
                      Hãy thông báo cho bộ phận QC và giữ lại mẫu sản phẩm.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full py-3.5 text-sm"
              style={affectsQuality ? {
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
              } : undefined}
            >
              {submitting ? (
                <><RefreshCw size={16} className="animate-spin" /> Đang ghi nhận...</>
              ) : (
                <><Send size={16} />{affectsQuality ? 'Ghi Nhận & Cảnh Báo QC' : 'Ghi Nhận Biến Động 4M'}</>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </>
  )
}
