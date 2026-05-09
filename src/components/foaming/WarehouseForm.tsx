'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser } from '@/types'

interface WarehouseFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

export default function WarehouseForm({ plan, user, onSuccess }: WarehouseFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    qty_delivered_sheet: plan.sl_sheet || 0,
    delivery_date: new Date().toISOString().split('T')[0],
    ng_bun_qty: 0,
    error_type: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('foaming_warehouse_reports').insert({
        firm_plan: plan.firm_plan,
        qty_delivered_sheet: Number(formData.qty_delivered_sheet),
        delivery_date: formData.delivery_date,
        ng_bun_qty: Number(formData.ng_bun_qty),
        error_type: formData.error_type,
        deliverer_id: user.id
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Đã lưu báo cáo Nhập kho thành công!' })
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
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 font-bold">
          KHO
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--text-1)]">Báo cáo Nhập kho / Giao hàng</h3>
          <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest">{plan.firm_plan}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số lượng giao (Sheet)</label>
            <input
              type="number"
              value={formData.qty_delivered_sheet}
              onChange={(e) => setFormData({ ...formData, qty_delivered_sheet: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-green-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ngày giao hàng</label>
            <input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-green-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* --- Phần báo cáo NG --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-red-600 uppercase ml-1">Số lượng Bun NG (nếu có)</label>
            <input
              type="number"
              value={formData.ng_bun_qty}
              onChange={(e) => setFormData({ ...formData, ng_bun_qty: Number(e.target.value) })}
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
              placeholder="VD: Hư hỏng, lỗi bề mặt..."
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-brand-500/5 p-4 rounded-xl border border-brand-500/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Người giao hàng</p>
            <p className="text-sm font-bold text-[var(--text-1)]">{user.full_name}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Phòng ban</p>
            <p className="text-sm font-bold text-[var(--text-1)]">{user.department || '---'}</p>
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
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base
            shadow-xl shadow-green-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              XÁC NHẬN NHẬP KHO
            </>
          )}
        </button>
      </form>
    </motion.div>
  )
}
