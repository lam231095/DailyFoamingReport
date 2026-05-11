'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser, User } from '@/types'
import { Plus, Trash2, Info, Package, MapPin, Palette, Truck } from 'lucide-react'

const ERROR_TYPES = [
  'Bọt khí', 'Loang màu', 'Thiếu liệu', 'Dính khuôn',
  'Biến dạng', 'Lỗi thiết bị', 'Lỗi khác'
]

const STORAGE_LOCATIONS = ['Khu A', 'Khu B', 'Khu C']
const STORAGE_LINES = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5', 'line 6', 'line 7']
const COLOR_TAGS = ['xanh', 'đỏ', 'vàng', 'đen']

interface PourFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

export default function PourForm({ plan, user, onSuccess }: PourFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [operators, setOperators] = useState<User[]>([])

  useEffect(() => {
    async function fetchOperators() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .ilike('department', '%FOAMING Rectangular%')
        .in('position', ['team leader', 'Operator', 'Team Leader', 'operator', 'Team leader'])
        .order('full_name')
      
      setOperators(data || [])
    }
    fetchOperators()
  }, [])

  const [formData, setFormData] = useState({
    shift: 'Ca 1',
    machine_id: 'Máy 1',
    operator_name: '',
    actual_bun_poured: plan.sl_bun_can_do || 0,
    lot_no: '',
    ng_items: [{ qty: 0, type: ERROR_TYPES[0] }],
    storage_location: STORAGE_LOCATIONS[0],
    storage_line: STORAGE_LINES[0],
    color_tag: COLOR_TAGS[0],
    cleaning_agent_kg: 0,
    waste_kg: 0,
    note: '',
  })

  const storageCarts = Math.ceil(formData.actual_bun_poured / 6)

  const addNGItem = () => setFormData({ ...formData, ng_items: [...formData.ng_items, { qty: 0, type: ERROR_TYPES[0] }] })
  const removeNGItem = (i: number) => {
    if (formData.ng_items.length <= 1) return
    setFormData({ ...formData, ng_items: formData.ng_items.filter((_, idx) => idx !== i) })
  }
  const updateNGItem = (i: number, field: 'qty' | 'type', value: any) => {
    const items = [...formData.ng_items]
    items[i] = { ...items[i], [field]: value }
    setFormData({ ...formData, ng_items: items })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const totalNG = formData.ng_items.reduce((s, x) => s + (x.qty || 0), 0)
      const combinedError = formData.ng_items
        .filter(x => x.qty > 0).map(x => `${x.type} (${x.qty})`).join(', ')

      const { error } = await supabase.from('foaming_pour_reports').insert({
        firm_plan: plan.firm_plan,
        shift: formData.shift,
        machine_id: formData.machine_id,
        operator_name: formData.operator_name,
        actual_bun_poured: Number(formData.actual_bun_poured),
        lot_no: formData.lot_no,
        ng_bun_qty: totalNG,
        error_type: combinedError || '',
        storage_location: formData.storage_location,
        storage_line: formData.storage_line,
        color_tag: formData.color_tag,
        storage_carts: storageCarts,
        cleaning_agent_kg: Number(formData.cleaning_agent_kg),
        waste_kg: Number(formData.waste_kg),
        note: formData.note.trim() || null,
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
              <option>Ca HC</option>
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
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-[var(--text-2)] uppercase">Số bun thực tế Đổ</label>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-md">
                <Truck size={10} className="text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600">Dự kiến: {storageCarts} xe</span>
              </div>
            </div>
            <input
              type="number"
              value={formData.actual_bun_poured}
              onChange={(e) => setFormData({ ...formData, actual_bun_poured: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-bold focus:border-blue-500 outline-none transition-all font-mono"
            />
          </div>
        </div>

        {/* --- Phần lưu trữ (Mới) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1 flex items-center gap-1.5">
              <MapPin size={12} /> Nơi lưu trữ
            </label>
            <select
              value={formData.storage_location}
              onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
            >
              {STORAGE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1 flex items-center gap-1.5">
              <Package size={12} /> Line lưu trữ
            </label>
            <select
              value={formData.storage_line}
              onChange={(e) => setFormData({ ...formData, storage_line: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
            >
              {STORAGE_LINES.map(line => <option key={line} value={line}>{line}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1 flex items-center gap-1.5">
              <Palette size={12} /> Thẻ màu
            </label>
            <select
              value={formData.color_tag}
              onChange={(e) => setFormData({ ...formData, color_tag: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
            >
              {COLOR_TAGS.map(color => <option key={color} value={color}>{color.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Người vận hành (Operator)</label>
            <select
              value={formData.operator_name}
              onChange={(e) => setFormData({ ...formData, operator_name: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            >
              <option value="">-- Chọn người vận hành --</option>
              {operators.map(op => (
                <option key={op.id} value={op.full_name}>{op.full_name} ({op.msnv})</option>
              ))}
            </select>
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

        {/* --- Phần báo cáo NG (Cập nhật giống báo cáo tách) --- */}
        <div className="space-y-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-red-600 uppercase">Ghi nhận phế phẩm (NG)</h4>
            <button type="button" onClick={addNGItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-all shadow-sm">
              <Plus size={14} /> THÊM LỖI
            </button>
          </div>
          <div className="space-y-3">
            {formData.ng_items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="text-[10px] font-bold text-red-500/60 uppercase ml-1">Số lượng (Bun)</label>
                  <input type="number" value={item.qty}
                    onChange={e => updateNGItem(index, 'qty', Number(e.target.value))}
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all text-sm" />
                </div>
                <div className="flex-[2] w-full space-y-1.5">
                  <label className="text-[10px] font-bold text-red-500/60 uppercase ml-1">Loại lỗi</label>
                  <select value={item.type} onChange={e => updateNGItem(index, 'type', e.target.value)}
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all text-sm">
                    {ERROR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {formData.ng_items.length > 1 && (
                  <button type="button" onClick={() => removeNGItem(index)}
                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Chất rửa đầu súng (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.cleaning_agent_kg}
              onChange={(e) => setFormData({ ...formData, cleaning_agent_kg: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Rác (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.waste_kg}
              onChange={(e) => setFormData({ ...formData, waste_kg: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ghi chú</label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Ghi chú thêm nếu có..."
            rows={3}
            className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
              text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all resize-none"
          />
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
