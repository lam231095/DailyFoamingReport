'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle2, Zap, TrendingUp, Info, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan, SessionUser, User } from '@/types'
import { calculateOptimalSheetsPerBun, calculateSuggestedSheets, calculateEfficiency } from '@/lib/calculations'

interface SeparateFormProps {
  plan: ProductionPlan
  user: SessionUser
  onSuccess: () => void
}

export default function SeparateForm({ plan, user, onSuccess }: SeparateFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [standards, setStandards] = useState<any[]>([])
  const [operators, setOperators] = useState<User[]>([])

  const ERROR_TYPES = [
    'Bọt khí',
    'Loang trắng',
    'Loang đen',
    'Lõm mặt',
    'Xốp biên',
    'Cứng đáy',
    'NG màu',
    'Lỗi khác'
  ]

  const [formData, setFormData] = useState({
    shift: 'Ca 1',
    machine_id: 'Máy tách tự động 2',
    operator_name: '',
    bun_thickness_mm: 0,
    sheet_thickness_mm: 0,
    actual_bun_separated: plan.sl_bun_can_tach || 0,
    actual_sheet_received: plan.sl_sheet || 0,
    lot_no: '',
    ng_items: [{ qty: 0, type: ERROR_TYPES[0] }],
    error_type: '',
  })

  useEffect(() => {
    async function fetchStandards() {
      const { data } = await supabase.from('thickness_standards').select('*')
      setStandards(data || [])
    }
    fetchStandards()
  }, [])

  useEffect(() => {
    async function fetchOperators() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .ilike('department', '%FOAMING Splitting%')
        .in('position', ['team leader', 'Operator', 'Team Leader', 'operator', 'Team leader'])
        .order('full_name')
      
      setOperators(data || [])
    }
    fetchOperators()
  }, [])

  // 2. Phân tích độ dày và tìm tiêu chuẩn
  const identifiedThickness = (() => {
    const match = plan.ten_san_pham?.match(/([0-9.]+)\s*mm/i)
    return match ? parseFloat(match[1]) : null
  })()

  const currentStandard = standards.find(s => s.thickness_mm === identifiedThickness)
  
  // 3. Tính toán số sheet tối ưu đơn hàng
  const optimalSheetsPerBun = currentStandard 
    ? currentStandard.optimal_sheets_per_bun 
    : (identifiedThickness ? calculateOptimalSheetsPerBun(identifiedThickness) : 0)

  const suggestedSheets = calculateSuggestedSheets(formData.actual_bun_separated, optimalSheetsPerBun)
  const efficiency = calculateEfficiency(formData.actual_sheet_received, suggestedSheets)

  const addNGItem = () => {
    setFormData({
      ...formData,
      ng_items: [...formData.ng_items, { qty: 0, type: ERROR_TYPES[0] }]
    })
  }

  const removeNGItem = (index: number) => {
    if (formData.ng_items.length <= 1) return
    const newItems = formData.ng_items.filter((_, i) => i !== index)
    setFormData({ ...formData, ng_items: newItems })
  }

  const updateNGItem = (index: number, field: 'qty' | 'type', value: any) => {
    const newItems = [...formData.ng_items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, ng_items: newItems })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Tính toán tổng NG và chuỗi mô tả lỗi
      const totalNG = formData.ng_items.reduce((sum, item) => sum + (item.qty || 0), 0)
      const combinedErrorType = formData.ng_items
        .filter(item => item.qty > 0)
        .map(item => `${item.type} (${item.qty})`)
        .join(', ')

      const { error } = await supabase.from('foaming_separate_reports').insert({
        firm_plan: plan.firm_plan,
        shift: formData.shift,
        machine_id: formData.machine_id,
        operator_name: formData.operator_name,
        bun_thickness_mm: Number(formData.bun_thickness_mm),
        sheet_thickness_mm: Number(formData.sheet_thickness_mm),
        actual_bun_separated: Number(formData.actual_bun_separated),
        actual_sheet_received: Number(formData.actual_sheet_received),
        lot_no: formData.lot_no,
        ng_qty: totalNG,
        ng_bun_qty: 0,
        error_type: combinedErrorType || (formData.ng_items[0].qty > 0 ? formData.ng_items[0].type : ''),
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
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Máy tách</label>
            <select
              value={formData.machine_id}
              onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
            >
              <option>Máy tách tự động 2</option>
              <option>Máy tách tự động 3</option>
              <option>Máy tách bán tự động 1</option>
              <option>Máy tách cơ 1</option>
              <option>Máy tách cơ 2</option>
              <option>Máy tách cơ 3</option>
              <option>Máy tách cơ 4</option>
              <option>Máy tách cơ 5</option>
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
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
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
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Độ dày bun sau tách da (mm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.bun_thickness_mm}
              onChange={(e) => setFormData({ ...formData, bun_thickness_mm: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Độ dày sheet thực tế (mm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.sheet_thickness_mm}
              onChange={(e) => setFormData({ ...formData, sheet_thickness_mm: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all font-mono"
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
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số sheet thực tế nhận</label>
            <input
              type="number"
              value={formData.actual_sheet_received}
              onChange={(e) => setFormData({ ...formData, actual_sheet_received: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 
                text-[var(--text-1)] font-medium focus:border-purple-500 outline-none transition-all font-mono"
            />
          </div>
        </div>

        {/* --- Phân tích hiệu suất --- */}
        <AnimatePresence>
          {identifiedThickness && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="overflow-hidden"
            >
              {optimalSheetsPerBun > 0 ? (
                <div className="bg-purple-500/5 rounded-2xl border-2 border-dashed border-purple-500/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-purple-500" />
                      <h4 className="text-xs font-bold text-purple-600 uppercase">Phân tích hiệu suất tách</h4>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                      <Zap size={10} fill="white" />
                      {currentStandard ? `TIÊU CHUẨN ${identifiedThickness}MM` : `TÍNH TOÁN ${identifiedThickness}MM`}
                    </div>
                  </div>

                  {!currentStandard && (
                    <div className="flex items-center gap-2 text-[10px] text-orange-600 font-bold bg-orange-500/5 p-2 rounded-lg border border-orange-500/10">
                      <Info size={12} />
                      Độ dày này chưa có trong danh sách tiêu chuẩn. Đang sử dụng thuật toán tính toán tự động.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-purple-500/10">
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">Số sheet tối ưu (Gợi ý)</p>
                      <p className="text-lg font-mono font-bold text-purple-600">
                        {suggestedSheets} <span className="text-xs font-medium text-[var(--text-3)]">Sheet</span>
                      </p>
                      <p className="text-[9px] text-[var(--text-3)] mt-1">
                        (Dựa trên {optimalSheetsPerBun} sheet/bun)
                      </p>
                    </div>

                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-purple-500/10">
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">Tham chiếu độ dày (mm)</p>
                      <p className="text-lg font-mono font-bold text-blue-600">
                        Bun: {currentStandard?.total_bun_thickness_mm || '--'} <span className="text-xs font-medium text-[var(--text-3)]">mm</span>
                      </p>
                      <p className="text-[9px] text-[var(--text-3)] mt-1">
                        Sheet tối thiểu: <span className="font-bold text-purple-600">{currentStandard ? (currentStandard.thickness_mm - currentStandard.tolerance_mm).toFixed(1) : '--'}</span> mm
                      </p>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      efficiency >= 95 ? 'bg-green-500/10 border-green-500/20' : 
                      efficiency >= 85 ? 'bg-orange-500/10 border-orange-500/20' : 
                      'bg-red-500/10 border-red-500/20'
                    }`}>
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">% Đạt tiêu chuẩn</p>
                      <div className="flex items-end gap-2">
                        <p className={`text-2xl font-mono font-bold ${
                          efficiency >= 95 ? 'text-green-600' : 
                          efficiency >= 85 ? 'text-orange-600' : 
                          'text-red-600'
                        }`}>
                          {efficiency}%
                        </p>
                        <p className="text-[10px] font-bold mb-1.5 uppercase opacity-70">
                          {efficiency >= 95 ? 'Tốt' : efficiency >= 85 ? 'Đạt' : 'Thấp'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {efficiency < 85 && formData.actual_sheet_received > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-red-600 font-medium bg-red-500/5 p-2 rounded-lg">
                      <Info size={12} />
                      Số lượng sheet thực tế thấp hơn nhiều so với tiêu chuẩn ({suggestedSheets} sheet). Vui lòng kiểm tra lại.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-orange-500/5 rounded-2xl border border-orange-500/20 p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Info size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-700">Không xác định được độ dày</p>
                    <p className="text-[10px] text-orange-600">Vui lòng kiểm tra lại tên sản phẩm trong kế hoạch sản xuất.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-red-600 uppercase">Ghi nhận phế phẩm (NG)</h4>
            <button
              type="button"
              onClick={addNGItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-all shadow-sm"
            >
              <Plus size={14} /> THÊM LỖI
            </button>
          </div>

          <div className="space-y-3">
            {formData.ng_items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="text-[10px] font-bold text-red-500/60 uppercase ml-1">Số lượng (Sheet)</label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateNGItem(index, 'qty', Number(e.target.value))}
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 
                      text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="flex-[2] w-full space-y-1.5">
                  <label className="text-[10px] font-bold text-red-500/60 uppercase ml-1">Loại lỗi</label>
                  <select
                    value={item.type}
                    onChange={(e) => updateNGItem(index, 'type', e.target.value)}
                    className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 
                      text-[var(--text-1)] font-medium focus:border-red-500 outline-none transition-all text-sm"
                  >
                    {ERROR_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                {formData.ng_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeNGItem(index)}
                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
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
