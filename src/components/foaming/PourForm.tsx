'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser, User } from '@/types'
import { Plus, Trash2, Info, Truck } from 'lucide-react'
import { getReportDateISO } from '@/lib/dateUtils'
import { distributeInteger, distributeSequential } from '@/lib/calculations'

const ERROR_TYPES = [
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn'
]



interface PourFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

export default function PourForm({ plan, user, onSuccess }: PourFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [operators, setOperators] = useState<User[]>([])

  const [hasDowntime, setHasDowntime] = useState(false)
  const [downtimeReason, setDowntimeReason] = useState('')
  const [downtimeStartHour, setDowntimeStartHour] = useState('00')
  const [downtimeStartMinute, setDowntimeStartMinute] = useState('00')
  const [downtimeEndHour, setDowntimeEndHour] = useState('00')
  const [downtimeEndMinute, setDowntimeEndMinute] = useState('00')

  const getDowntimeDuration = () => {
    if (!hasDowntime || !downtimeReason.trim()) return 0
    const sh = parseInt(downtimeStartHour, 10)
    const sm = parseInt(downtimeStartMinute, 10)
    const eh = parseInt(downtimeEndHour, 10)
    const em = parseInt(downtimeEndMinute, 10)
    
    const startTotal = sh * 60 + sm
    const endTotal = eh * 60 + em
    if (endTotal >= startTotal) {
      return endTotal - startTotal
    } else {
      return (24 * 60 - startTotal) + endTotal
    }
  }

  useEffect(() => {
    async function fetchOperators() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .or('and(department.ilike.%FOAMING Rectangular%,position.in.("team leader","Operator","Team Leader","operator","Team leader")),msnv.in.("02126","04462")')
        .order('full_name')
      
      setOperators(data || [])
    }
    fetchOperators()
  }, [])

  const hour = new Date().getHours()
  let initialShift = 'Ca 1'
  if (hour >= 14 && hour < 22) initialShift = 'Ca 2'
  else if (hour >= 22 || hour < 6) initialShift = 'Ca 3'

  const [formData, setFormData] = useState({
    shift: initialShift,
    machine_id: 'Máy 1',
    operator_name: '',
    actual_bun_poured: plan.sl_bun_can_do || plan.sl_bun_can_tach || 0,
    ng_items: [{ qty: 0, type: ERROR_TYPES[0], note: '' }],
    cleaning_agent_kg: 0,
    waste_kg: 0,
    manager_name: '',
    note: '',
    is_compensation: false,
  })

  const storageCarts = Math.ceil(formData.actual_bun_poured / 6)

  const addNGItem = () => setFormData({ ...formData, ng_items: [...formData.ng_items, { qty: 0, type: ERROR_TYPES[0], note: '' }] })
  const removeNGItem = (i: number) => {
    if (formData.ng_items.length <= 1) return
    setFormData({ ...formData, ng_items: formData.ng_items.filter((_, idx) => idx !== i) })
  }
  const updateNGItem = (i: number, field: 'qty' | 'type' | 'note', value: any) => {
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
        .filter(x => x.qty > 0)
        .map(x => x.type === 'Lỗi khác' && x.note ? `${x.type}: ${x.note.trim()} (${x.qty})` : `${x.type} (${x.qty})`)
        .join(', ')

      const plansList = plan.firm_plan.split('|').map(x => x.trim()).filter(Boolean)

      // Query previous pour reports to check cumulative poured buns
      const { data: prevPourReports, error: prevPourErr } = await supabase
        .from('foaming_pour_reports')
        .select('actual_bun_poured, is_compensation, firm_plan')
        .in('firm_plan', plansList)

      if (prevPourErr) throw prevPourErr

      const previousMainBuns = prevPourReports
        ?.filter(r => !r.is_compensation)
        .reduce((sum, r) => sum + (r.actual_bun_poured || 0), 0) || 0
      const currentInputBuns = Number(formData.actual_bun_poured)
      const totalInputBuns = previousMainBuns + currentInputBuns

      let targetBuns = 0
      let plansData: any[] = []

      if (plansList.length > 1) {
        const { data, error: fetchErr } = await supabase
          .from('production_plan')
          .select('firm_plan, sl_bun_can_do, sl_bun_can_tach')
          .in('firm_plan', plansList)
        if (fetchErr) throw fetchErr
        plansData = data || []
        plansList.forEach(fp => {
          const p = plansData.find(x => x.firm_plan === fp)
          targetBuns += p ? (p.sl_bun_can_do || p.sl_bun_can_tach || 0) : 0
        })
      } else {
        targetBuns = plan.sl_bun_can_do || plan.sl_bun_can_tach || 0
      }

      if (targetBuns > 0 && !formData.is_compensation && totalInputBuns > targetBuns) {
        throw new Error(
          `Số lượng bun đổ vượt quá giới hạn của đơn hàng này. (Lũy kế đơn chính đã nhập trước đó: ${previousMainBuns} bun, Nhập lần này: ${currentInputBuns} bun, Số lượng tối đa cho phép: ${targetBuns} bun). Vui lòng điều chỉnh lại hoặc chọn "Đơn bù" nếu đây là lượt chạy bù hàng NG.`
        )
      }

      if (plansList.length > 1) {
        const targets = plansList.map(fp => {
          const p = plansData.find(x => x.firm_plan === fp)
          return p ? (p.sl_bun_can_do || p.sl_bun_can_tach || 0) : 0
        })

        // Tính lượng đã đổ trước đó cho mỗi đơn trong nhóm gộp (chỉ tính đơn chính, không tính đơn bù)
        const alreadyPouredMap = new Map<string, number>()
        prevPourReports?.filter(r => !r.is_compensation).forEach(r => {
          alreadyPouredMap.set(r.firm_plan, (alreadyPouredMap.get(r.firm_plan) || 0) + (r.actual_bun_poured || 0))
        })

        // Tính lượng còn lại cần đổ cho từng đơn
        const remainingTargets = plansList.map((fp, idx) => {
          const target = targets[idx] || 0
          const poured = alreadyPouredMap.get(fp) || 0
          return Math.max(0, target - poured)
        })

        // Phân bổ số lượng bun thực tế lũy tiến (FIFO)
        const distributedActual = distributeSequential(Number(formData.actual_bun_poured), remainingTargets)
        // Phân bổ NG theo tỷ lệ số lượng thực tế đã phân bổ
        const distributedNG = distributeInteger(totalNG, distributedActual)

        // Phân bổ các số thực (cleaning, waste)
        const totalTarget = targets.reduce((a, b) => a + b, 0)
        const distributeFloat = (val: number, idx: number) => {
          if (totalTarget === 0) return val / plansList.length
          return (targets[idx] / totalTarget) * val
        }

        // Tạo danh sách các bản ghi để chèn
        const recordsToInsert = plansList.map((fp, idx) => {
          const act = distributedActual[idx]
          const ng = distributedNG[idx]
          const carts = Math.ceil(act / 6)
          const cleaning = distributeFloat(Number(formData.cleaning_agent_kg), idx)
          const waste = distributeFloat(Number(formData.waste_kg), idx)
          const groupNote = `[Báo cáo gộp nhóm: ${plan.firm_plan}]`
          const finalNote = formData.note.trim() 
            ? `${formData.note.trim()} ${groupNote}`
            : groupNote

          return {
            firm_plan: fp,
            shift: formData.shift,
            machine_id: formData.machine_id,
            operator_name: formData.operator_name,
            actual_bun_poured: act,
            lot_no: null,
            report_date: getReportDateISO(new Date(), formData.shift),
            ng_bun_qty: ng,
            error_type: combinedError || '',
            storage_location: null,
            storage_line: null,
            color_tag: null,
            storage_carts: carts,
            cleaning_agent_kg: parseFloat(cleaning.toFixed(2)),
            waste_kg: parseFloat(waste.toFixed(2)),
            manager_name: formData.manager_name,
            note: finalNote,
            is_compensation: formData.is_compensation,
            recorder_id: user.id,
            downtime_reason: hasDowntime && downtimeReason.trim() ? downtimeReason.trim() : null,
            downtime_start: hasDowntime && downtimeReason.trim() ? `${downtimeStartHour}:${downtimeStartMinute}` : null,
            downtime_end: hasDowntime && downtimeReason.trim() ? `${downtimeEndHour}:${downtimeEndMinute}` : null,
            downtime_duration: hasDowntime && downtimeReason.trim() ? getDowntimeDuration() : null,
          }
        })

        const filteredRecords = recordsToInsert.filter(r => r.actual_bun_poured > 0 || r.ng_bun_qty > 0)

        if (filteredRecords.length === 0) {
          throw new Error('Không có đơn hàng nào được phân bổ số lượng. Vui lòng nhập số lượng lớn hơn 0.')
        }

        const { error: insertErr } = await supabase.from('foaming_pour_reports').insert(filteredRecords)
        if (insertErr) throw insertErr
      } else {
        const { error } = await supabase.from('foaming_pour_reports').insert({
          firm_plan: plan.firm_plan,
          shift: formData.shift,
          machine_id: formData.machine_id,
          operator_name: formData.operator_name,
          actual_bun_poured: Number(formData.actual_bun_poured),
          lot_no: null,
          report_date: getReportDateISO(new Date(), formData.shift),
          ng_bun_qty: totalNG,
          error_type: combinedError || '',
          storage_location: null,
          storage_line: null,
          color_tag: null,
          storage_carts: storageCarts,
          cleaning_agent_kg: Number(formData.cleaning_agent_kg),
          waste_kg: Number(formData.waste_kg),
          manager_name: formData.manager_name,
          note: formData.note.trim() || null,
          is_compensation: formData.is_compensation,
          recorder_id: user.id,
          downtime_reason: hasDowntime && downtimeReason.trim() ? downtimeReason.trim() : null,
          downtime_start: hasDowntime && downtimeReason.trim() ? `${downtimeStartHour}:${downtimeStartMinute}` : null,
          downtime_end: hasDowntime && downtimeReason.trim() ? `${downtimeEndHour}:${downtimeEndMinute}` : null,
          downtime_duration: hasDowntime && downtimeReason.trim() ? getDowntimeDuration() : null,
        })
        if (error) throw error
      }

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
              required
              onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            >
              <option value="">-- Chọn máy --</option>
              <option>Máy 1</option>
              <option>Máy 2</option>
              <option>Máy 3</option>
              <option>Máy đổ tay</option>
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
              required
              min="1"
              onChange={(e) => setFormData({ ...formData, actual_bun_poured: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-bold focus:border-blue-500 outline-none transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Quản lý (Manager)</label>
            <select
              value={formData.manager_name}
              required
              onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            >
              <option value="">-- Chọn quản lý --</option>
              <option value="Linh">Linh</option>
              <option value="Thảo">Thảo</option>
              <option value="Tuấn Anh">Tuấn Anh</option>
              <option value="Lâm">Lâm</option>
            </select>
          </div>
        </div>

        {/* Đơn bù checkbox */}
        <div className="flex items-center gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 hover:bg-amber-500/10 transition-colors">
          <input
            type="checkbox"
            id="is_compensation_pour"
            checked={formData.is_compensation}
            onChange={(e) => setFormData({ ...formData, is_compensation: e.target.checked })}
            className="w-5 h-5 rounded border-2 border-[var(--border)] text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500 transition-all"
          />
          <label htmlFor="is_compensation_pour" className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase select-none cursor-pointer flex-1">
            Đơn bù (Báo cáo này bù cho hàng phế phẩm NG)
          </label>
        </div>



        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Người vận hành (Operator)</label>
          <select
            value={formData.operator_name}
            required
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

        {/* --- Phần báo cáo NG (Cập nhật giống báo cáo tách) --- */}
        <div className="space-y-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-red-600 uppercase">Ghi nhận phế phẩm (NG)</h4>
            <button type="button" onClick={addNGItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-all shadow-sm">
              <Plus size={14} /> THÊM LỖI
            </button>
          </div>
          <div className="space-y-4">
            {formData.ng_items.map((item, index) => (
              <div key={index} className="space-y-3 pb-3 border-b border-red-500/10 last:border-b-0 last:pb-0">
                <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                  <div className="flex-1 w-full space-y-1.5">
                    <label className="text-[10px] font-bold text-red-500/60 uppercase ml-1">Số lượng (Bun)</label>
                    <input type="number" value={item.qty || ''}
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
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all mb-0.5">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                {item.type === 'Lỗi khác' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-red-500/80 uppercase ml-1">Chi tiết lỗi khác</label>
                    <input 
                      type="text" 
                      value={(item as any).note || ''}
                      onChange={e => updateNGItem(index, 'note', e.target.value)}
                      placeholder="Ghi chú chi tiết lỗi khác..."
                      className="w-full bg-[var(--bg-card)] border-2 border-red-500/20 rounded-xl px-4 py-2.5 text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all text-xs" 
                    />
                  </div>
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
              required
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
              required
              onChange={(e) => setFormData({ ...formData, waste_kg: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* --- Phần khai báo dừng máy --- */}
        <div className="space-y-4 bg-gray-500/5 p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_downtime"
              checked={hasDowntime}
              onChange={(e) => setHasDowntime(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-500 transition-all"
            />
            <label htmlFor="has_downtime" className="text-xs font-black text-[var(--text-2)] uppercase select-none cursor-pointer">
              Có sự cố dừng máy / Gặp sự cố thiết bị
            </label>
          </div>

          <AnimatePresence>
            {hasDowntime && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 border-t border-[var(--border)] overflow-hidden"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Nguyên nhân dừng máy (nhập tay)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập nguyên nhân dừng máy..."
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                      text-[var(--text-1)] font-medium focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Dừng từ lúc</label>
                    <div className="flex gap-2">
                      <select
                        value={downtimeStartHour}
                        onChange={(e) => setDowntimeStartHour(e.target.value)}
                        className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hs = String(h).padStart(2, '0')
                          return <option key={hs} value={hs}>{hs} giờ</option>
                        })}
                      </select>
                      <select
                        value={downtimeStartMinute}
                        onChange={(e) => setDowntimeStartMinute(e.target.value)}
                        className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                      >
                        {Array.from({ length: 60 }).map((_, m) => {
                          const ms = String(m).padStart(2, '0')
                          return <option key={ms} value={ms}>{ms} phút</option>
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Dừng đến lúc</label>
                    <div className="flex gap-2">
                      <select
                        value={downtimeEndHour}
                        onChange={(e) => setDowntimeEndHour(e.target.value)}
                        className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hs = String(h).padStart(2, '0')
                          return <option key={hs} value={hs}>{hs} giờ</option>
                        })}
                      </select>
                      <select
                        value={downtimeEndMinute}
                        onChange={(e) => setDowntimeEndMinute(e.target.value)}
                        className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                      >
                        {Array.from({ length: 60 }).map((_, m) => {
                          const ms = String(m).padStart(2, '0')
                          return <option key={ms} value={ms}>{ms} phút</option>
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 text-xs font-bold text-blue-600 flex items-center justify-between">
                  <span>Tổng thời gian dừng máy:</span>
                  <span>{getDowntimeDuration()} phút ({Math.floor(getDowntimeDuration() / 60)}h {getDowntimeDuration() % 60}m)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
