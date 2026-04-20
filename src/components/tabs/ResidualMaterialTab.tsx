'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, History, Package, ChevronRight, 
  Trash2, AlertCircle, CheckCircle2, Loader2,
  Layers, Filter, ArrowDownToLine, User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, ResidualMaterial, ResidualMaterialUsage } from '@/types'

interface ResidualMaterialTabProps {
  user: SessionUser
}

type TabType = 'stock' | 'add' | 'use' | 'history'

export default function ResidualMaterialTab({ user }: ResidualMaterialTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stock')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [materials, setMaterials] = useState<ResidualMaterial[]>([])
  const [usageLogs, setUsageLogs] = useState<ResidualMaterialUsage[]>([])
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    stage: 'Foaming Đổ' as 'Foaming Đổ' | 'Foaming Tách',
    material_name: '',
    quantity: '',
    unit: 'tấm' as 'tấm' | 'bun',
    entry_date: new Date().toISOString().split('T')[0]
  })

  const [useData, setUseData] = useState({
    material_id: '',
    used_quantity: ''
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [mRes, uRes] = await Promise.all([
      supabase.from('residual_materials').select('*, users(full_name)').order('created_at', { ascending: false }),
      supabase.from('residual_material_usage').select('*, users(full_name), residual_materials(*)').order('used_at', { ascending: false }).limit(20)
    ])
    
    if (mRes.data) setMaterials(mRes.data)
    if (uRes.data) setUsageLogs(uRes.data as any)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)

    const { error } = await supabase.from('residual_materials').insert({
      user_id: user.id,
      stage: formData.stage,
      material_name: formData.material_name,
      initial_quantity: Number(formData.quantity),
      current_quantity: Number(formData.quantity),
      unit: formData.unit,
      entry_date: formData.entry_date
    })

    if (error) {
      setStatus({ type: 'error', msg: 'Lỗi khi thêm liệu tồn: ' + error.message })
    } else {
      setStatus({ type: 'success', msg: 'Đã thêm liệu tồn mới thành công!' })
      setFormData({ ...formData, material_name: '', quantity: '' })
      fetchData()
      setTimeout(() => setActiveTab('stock'), 1500)
    }
    setSubmitting(false)
  }

  const handleUseMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)

    const material = materials.find(m => m.id === useData.material_id)
    if (!material) return

    if (Number(useData.used_quantity) > material.current_quantity) {
      setStatus({ type: 'error', msg: 'Số lượng sử dụng vượt quá số lượng tồn hiện có!' })
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('residual_material_usage').insert({
      material_id: useData.material_id,
      user_id: user.id,
      used_quantity: Number(useData.used_quantity)
    })

    if (error) {
      setStatus({ type: 'error', msg: 'Lỗi khi ghi nhận sử dụng: ' + error.message })
    } else {
      setStatus({ type: 'success', msg: 'Đã cập nhật số lượng sử dụng!' })
      setUseData({ material_id: '', used_quantity: '' })
      fetchData()
      setTimeout(() => setActiveTab('stock'), 1500)
    }
    setSubmitting(false)
  }

  const categories = ['Foaming Đổ', 'Foaming Tách']

  return (
    <div className="space-y-4">
      {/* ── Sub-Tabs ──────────────────────────────── */}
      <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto scrollbar-hide">
        {[
          { id: 'stock', label: 'Tồn Kho', icon: Package },
          { id: 'add', label: 'Nhập Tồn', icon: Plus },
          { id: 'use', label: 'Sử Dụng', icon: ArrowDownToLine },
          { id: 'history', label: 'Lịch Sử', icon: History },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id as TabType); setStatus(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === t.id 
                ? 'bg-brand-500 text-white shadow-lg' 
                : 'text-[var(--text-3)] hover:bg-brand-500/10'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Tab: Stock ───────────────────────────── */}
        {activeTab === 'stock' && (
          <motion.div
            key="stock"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" /></div>
            ) : materials.length === 0 ? (
              <div className="card p-12 text-center">
                <Package size={40} className="mx-auto text-[var(--border)] mb-2" />
                <p className="text-sm text-[var(--text-3)]">Chưa có liệu tồn nào được ghi nhận</p>
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-black text-brand-500 uppercase tracking-widest px-1">{cat}</h3>
                  <div className="grid gap-2">
                    {materials.filter(m => m.stage === cat && m.current_quantity > 0).map(m => (
                      <div key={m.id} className="card p-3 flex items-center justify-between group hover:border-brand-500/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat === 'Foaming Đổ' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                            <Layers size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--text-1)]">{m.material_name}</p>
                            <p className="text-[10px] text-[var(--text-3)]">Ngày nhập: {new Date(m.entry_date).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-brand-500">{m.current_quantity} <span className="text-[10px] font-medium uppercase">{m.unit}</span></p>
                          <p className="text-[10px] text-[var(--text-3)]">Ban đầu: {m.initial_quantity}</p>
                        </div>
                      </div>
                    ))}
                    {materials.filter(m => m.stage === cat && m.current_quantity > 0).length === 0 && (
                      <div className="p-4 border border-dashed border-[var(--border)] rounded-xl text-center">
                        <p className="text-[10px] text-[var(--text-3)] italic">Không có liệu tồn hiện tại</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* ── Tab: Add Entry ───────────────────────── */}
        {activeTab === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5"
          >
            <h3 className="text-sm font-bold mb-4">Khai Báo Liệu Tồn Mới</h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="label">Công đoạn</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, stage: c as any })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        formData.stage === c ? 'bg-brand-500 border-brand-500 text-white' : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-2)] hover:border-brand-500/50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Tên liệu tồn dư</label>
                <input
                  required
                  placeholder="VD: C-14, D-12..."
                  value={formData.material_name}
                  onChange={e => setFormData({ ...formData, material_name: e.target.value })}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Số lượng</label>
                  <input
                    required
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Đơn vị</label>
                  <select
                    className="input appearance-none"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                  >
                    <option value="tấm">Tấm</option>
                    <option value="bun">Bun</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Ngày tồn dư</label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                  className="input"
                />
              </div>

              {status && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${status.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {status.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Lưu liệu tồn dư</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Tab: Use Material ────────────────────── */}
        {activeTab === 'use' && (
          <motion.div
            key="use"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5"
          >
            <h3 className="text-sm font-bold mb-4">Ghi Nhận Sử Dụng Liệu Tồn</h3>
            <form onSubmit={handleUseMaterial} className="space-y-4">
              <div>
                <label className="label">Chọn liệu trong kho</label>
                <select
                  required
                  className="input appearance-none"
                  value={useData.material_id}
                  onChange={e => setUseData({ ...useData, material_id: e.target.value })}
                >
                  <option value="">-- Chọn liệu tồn dư --</option>
                  {materials.filter(m => m.current_quantity > 0).map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.stage}] {m.material_name} - Còn {m.current_quantity} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              {useData.material_id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-brand-500/5 rounded-lg border border-brand-500/20"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-3)]">Cơ số khả dụng:</span>
                    <span className="font-bold text-brand-500">
                      {materials.find(m => m.id === useData.material_id)?.current_quantity} {materials.find(m => m.id === useData.material_id)?.unit}
                    </span>
                  </div>
                </motion.div>
              )}

              <div>
                <label className="label">Số lượng sử dụng</label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={useData.used_quantity}
                  onChange={e => setUseData({ ...useData, used_quantity: e.target.value })}
                  className="input"
                />
              </div>

              {status && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${status.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {status.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !useData.material_id}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <><ArrowDownToLine size={18} /> Xác nhận sử dụng</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Tab: History ─────────────────────────── */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-bold px-1">Lịch Sử Biến Động</h3>
            {usageLogs.length === 0 ? (
              <div className="card p-10 text-center text-[var(--text-3)] text-xs italic">
                Chưa có lịch sử sử dụng
              </div>
            ) : (
              usageLogs.map(log => (
                <div key={log.id} className="card p-3 flex gap-3 items-start border-l-4 border-l-purple-500">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <ArrowDownToLine size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-[var(--text-1)]">
                        Sử dụng <span className="text-purple-600">-{log.used_quantity}</span> {log.residual_materials?.unit}
                      </p>
                      <span className="text-[9px] text-[var(--text-3)]">{new Date(log.used_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-2)] mt-0.5">
                      Liệu: {log.residual_materials?.material_name} ({log.residual_materials?.stage})
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 opacity-60">
                      <User size={10} className="text-[var(--text-3)]" />
                      <span className="text-[9px] text-[var(--text-3)] font-medium">Bởi: {log.users?.full_name}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
