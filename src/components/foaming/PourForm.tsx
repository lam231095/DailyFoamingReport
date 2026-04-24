'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser } from '@/types'

interface PourFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

export default function PourForm({ plan, user, onSuccess }: PourFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    shift: 'Ca 1',
    machine_id: 'Máy 1',
    operator_name: user.full_name,
    actual_bun_poured: plan.sl_bun_can_do || 0,
    lot_no: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('foaming_pour_reports').insert({
        firm_plan: plan.firm_plan,
        shift: formData.shift,
        machine_id: formData.machine_id,
        operator_name: formData.operator_name,
        actual_bun_poured: Number(formData.actual_bun_poured),
        lot_no: formData.lot_no,
        recorder_id: user.id
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Đã lưu báo cáo công đoạn Đổ thành công!' })
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
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
          ĐỔ
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--text-1)]">Báo cáo Sản xuất Khu vực Đổ</h3>
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
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            >
              <option>Ca 1</option>
              <option>Ca 2</option>
              <option>Ca 3</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Máy làm việc</label>
            <select
              value={formData.machine_id}
              onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            >
              <option>Máy 1</option>
              <option>Máy 2</option>
              <option>Máy 3</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số bun thực tế Đổ</label>
            <input
              type="number"
              value={formData.actual_bun_poured}
              onChange={(e) => setFormData({ ...formData, actual_bun_poured: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Tên Operator (Người đứng máy)</label>
            <input
              type="text"
              value={formData.operator_name}
              onChange={(e) => setFormData({ ...formData, operator_name: e.target.value })}
              placeholder="Nhập tên người vận hành"
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Lot No (Số lô)</label>
            <input
              type="text"
              value={formData.lot_no}
              onChange={(e) => setFormData({ ...formData, lot_no: e.target.value })}
              placeholder="VD: L04-2304..."
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
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
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base
            shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              LƯU BÁO CÁO CÔNG ĐOẠN ĐỔ
            </>
          )}
        </button>
      </form>
    </motion.div>
  )
}
