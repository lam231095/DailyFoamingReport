'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle2, Truck, Plus, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { SessionUser, ProductionPlan } from '@/types'

interface TransferFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
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

interface LotItem {
  id: string
  pour_date: string
  shift: string
  machine_id: string
  actual_bun_qty: string | number
}

export default function TransferForm({ plan, user, onSuccess }: TransferFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [items, setItems] = useState<LotItem[]>([
    {
      id: Math.random().toString(),
      pour_date: getTodayISO(),
      shift: 'Ca 1',
      machine_id: 'Máy 1',
      actual_bun_qty: '',
    }
  ])

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        pour_date: getTodayISO(),
        shift: 'Ca 1',
        machine_id: 'Máy 1',
        actual_bun_qty: '',
      }
    ])
    setMessage(null)
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(item => item.id !== id))
    setMessage(null)
  }

  const handleChange = (id: string, field: keyof LotItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
    setMessage(null)
  }

  const totalBuns = items.reduce((sum, item) => sum + (Number(item.actual_bun_qty) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validate all lots
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const qty = Number(item.actual_bun_qty)
      if (!qty || qty <= 0) {
        setMessage({ type: 'error', text: `Vui lòng nhập số lượng bun hợp lệ (> 0) cho Lot #${i + 1}.` })
        return
      }
      if (!item.pour_date) {
        setMessage({ type: 'error', text: `Vui lòng chọn ngày đổ cho Lot #${i + 1}.` })
        return
      }
    }

    setLoading(true)
    try {
      const recordsToInsert = items.map(item => ({
        firm_plan: plan.firm_plan,
        pour_date: item.pour_date,
        shift: item.shift,
        machine_id: item.machine_id,
        actual_bun_qty: Number(item.actual_bun_qty),
        recorder_id: user.id,
        report_date: getTodayISO(),
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('foaming_transfer_reports').insert(recordsToInsert)
      if (error) throw error

      setMessage({ type: 'success', text: '✅ Đã lưu báo cáo giao hàng đổ - tách thành công!' })
      
      // Reset items list
      setItems([
        {
          id: Math.random().toString(),
          pour_date: getTodayISO(),
          shift: 'Ca 1',
          machine_id: 'Máy 1',
          actual_bun_qty: '',
        }
      ])
      
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
            {plan.firm_plan}
          </p>
        </div>
      </div>

      {/* Badge loại */}
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f59e0b' }} />
        Khai báo bàn giao bun từ công đoạn Đổ sang Tách
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Plan product display */}
        <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 mb-2">
          <p className="text-[10px] font-bold uppercase text-amber-600 mb-1">Sản phẩm</p>
          <p className="text-sm font-bold text-[var(--text-1)]">{plan.ten_san_pham || '---'}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-[var(--text-3)]">
            <p>PU Code: <span className="font-bold text-[var(--text-2)]">{plan.pu_code || '---'}</span></p>
            <p>Order No: <span className="font-bold text-[var(--text-2)]">{plan.no_order || '---'}</span></p>
            <p>Kế hoạch đổ: <span className="font-bold text-[var(--text-2)]">{plan.sl_bun_can_do || 0} Bun</span></p>
          </div>
        </div>

        {/* Dynamic list of lots */}
        <div className="space-y-4 bg-amber-500/[0.02] p-4 rounded-2xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[var(--text-2)] uppercase">Khai báo danh sách Lot Giao</h4>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold hover:bg-amber-600 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={14} /> THÊM LOT MỚI
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-4 shadow-sm hover:shadow-md transition-all relative"
              >
                {/* Lot title & delete button */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-bold text-amber-600">Lot #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="Xoá Lot này"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Pour Date & Shift */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
                      📅 Ngày đổ
                    </label>
                    <input
                      type="date"
                      value={item.pour_date}
                      min={getMinDate()}
                      max={getMaxDate()}
                      onChange={(e) => handleChange(item.id, 'pour_date', e.target.value)}
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                        text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
                      🕐 Ca đổ
                    </label>
                    <select
                      value={item.shift}
                      onChange={(e) => handleChange(item.id, 'shift', e.target.value)}
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                        text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                    >
                      {SHIFTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Machine & Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
                      ⚙️ Máy đổ
                    </label>
                    <select
                      value={item.machine_id}
                      onChange={(e) => handleChange(item.id, 'machine_id', e.target.value)}
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                        text-[var(--text-1)] font-medium focus:border-amber-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                    >
                      {MACHINES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">
                      📦 Số lượng bun
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.actual_bun_qty}
                      onChange={(e) => handleChange(item.id, 'actual_bun_qty', e.target.value)}
                      placeholder="Số lượng bun thực tế..."
                      className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3
                        text-[var(--text-1)] font-mono font-bold focus:border-amber-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
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
          {totalBuns > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-[var(--text-3)]">Xem trước tổng bun</p>
              <p className="text-base font-black text-amber-500">
                {totalBuns.toLocaleString()} Bun
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
          className="w-full py-4 text-white rounded-xl font-bold text-base cursor-pointer
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
