'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser } from '@/types'

interface SeparateFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

export default function SeparateForm({ plan, user, onSuccess }: SeparateFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    shift: 'Ca 1',
    actual_bun_separated: plan.sl_bun_can_tach || 0,
    actual_sheet_received: plan.sl_sheet || 0,
    lot_no: '',
    ng_qty: 0,
    error_type: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('foaming_separate_reports').insert({
        firm_plan: plan.firm_plan,
        shift: formData.shift,
        actual_bun_separated: Number(formData.actual_bun_separated),
        actual_sheet_received: Number(formData.actual_sheet_received),
        lot_no: formData.lot_no,
        ng_qty: Number(formData.ng_qty),
        error_type: formData.error_type,
        recorder_id: user.id
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Đã lưu báo cáo công đoạn Tách thành công!' })
      setTimeout(() => {
        onSuccess()
      }, 2000)
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold">
          TÁCH
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--text-1)]">Báo cáo Sản xuất Khu vực Tách</h3>
          <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest">{plan.firm_plan}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ca làm việc</label>
            <select
              value={formData.shift}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
            >
              <option>Ca 1</option>
              <option>Ca 2</option>
              <option>Ca 3</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Lot No (Số lô)</label>
            <input
              type="text"
              value={formData.lot_no}
              onChange={(e) => setFormData({ ...formData, lot_no: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số bun thực tế Tách</label>
            <input
              type="number"
              value={formData.actual_bun_separated}
              onChange={(e) => setFormData({ ...formData, actual_bun_separated: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số sheet thực tế nhận</label>
            <input
              type="number"
              value={formData.actual_sheet_received}
              onChange={(e) => setFormData({ ...formData, actual_sheet_received: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-red-600 uppercase ml-1">Số lượng NG (nếu có)</label>
            <input
              type="number"
              value={formData.ng_qty}
              onChange={(e) => setFormData({ ...formData, ng_qty: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-red-600 uppercase ml-1">Loại lỗi</label>
            <input
              type="text"
              value={formData.error_type}
              onChange={(e) => setFormData({ ...formData, error_type: e.target.value })}
              placeholder="VD: Rỗ mặt, bọt khí..."
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all"
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
              : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            {message.type === 'success' && <CheckCircle2 size={16} />}
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-base
            shadow-xl shadow-purple-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              LƯU BÁO CÁO CÔNG ĐOẠN TÁCH
            </>
          )}
        </button>
      </form>
    </motion.div>
  )
}
