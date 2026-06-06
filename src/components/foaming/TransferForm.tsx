'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle2, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { SessionUser } from '@/types'

interface TransferFormProps {
  user: SessionUser
}

const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']
const MACHINES = ['Máy 1', 'Máy 2', 'Máy 3', 'Máy đổ tay']

function getTodayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMinDate(): string {
  const d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}

function getMaxDate(): string {
  const d = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}

export default function TransferForm({ user }: TransferFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    pour_date: getTodayISO(),
    shift: 'Ca 1',
    machine_id: 'Máy 1',
    actual_bun_qty: '' as string | number,
  })

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const qty = Number(formData.actual_bun_qty)
    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số lượng bun hợp lệ (> 0).' })
      return
    }
    if (!formData.pour_date) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ngày đổ.' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('foaming_transfer_reports').insert({
        pour_date: formData.pour_date,
        shift: formData.shift,
        machine_id: formData.machine_id,
        actual_bun_qty: qty,
        recorder_id: user.id,
        report_date: getTodayISO(),
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setMessage({ type: 'success', text: '✅ Đã lưu giao hàng đổ - tách thành công!' })
      setFormData({
        pour_date: getTodayISO(),
        shift: 'Ca 1',
        machine_id: 'Máy 1',
        actual_bun_qty: '',
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Lỗi khi lưu dữ liệu: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] shadow-md"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          <Truck size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--text-1)]">Giao hàng Đổ → Tách</h3>
          <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest">
            Khai báo bàn giao bun từ công đoạn Đổ sang Tách
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Ngày đổ + Ca đổ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ngày đổ */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
              📅 Ngày đổ
            </label>
            <input
              type="date"
              value={formData.pour_date}
              min={getMinDate()}
              max={getMaxDate()}
              onChange={(e) => handleChange('pour_date', e.target.value)}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all"
              required
            />
          </div>

          {/* Ca đổ */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
              🕐 Ca đổ
            </label>
            <select
              value={formData.shift}
              onChange={(e) => handleChange('shift', e.target.value)}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
            >
              {SHIFTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Máy đổ + Số lượng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Máy đổ */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
              ⚙️ Máy đổ
            </label>
            <select
              value={formData.machine_id}
              onChange={(e) => handleChange('machine_id', e.target.value)}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
            >
              {MACHINES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Số lượng bun */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
              📦 Số lượng bun
            </label>
            <input
              type="number"
              min={1}
              value={formData.actual_bun_qty}
              onChange={(e) => handleChange('actual_bun_qty', e.target.value)}
              placeholder="Nhập số lượng bun thực tế..."
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Summary preview */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase text-[var(--text-3)]">Người khai báo</p>
            <p className="text-sm font-bold text-[var(--text-1)]">{user.full_name}</p>
          </div>
          {formData.actual_bun_qty !== '' && Number(formData.actual_bun_qty) > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-[var(--text-3)]">Xem trước</p>
              <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                {formData.machine_id} · {formData.shift} · <span className="text-[var(--text-1)]">{Number(formData.actual_bun_qty).toLocaleString()} bun</span>
              </p>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 size={16} />}
            {message.text}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 text-white rounded-xl font-bold text-base
            shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.25)' }}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              XÁC NHẬN GIAO HÀNG ĐỔ - TÁCH
            </>
          )}
        </button>
      </form>
    </motion.div>
  )
}
