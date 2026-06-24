'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Save, Loader2, CheckCircle2, Search, Calendar,
  Pencil, Trash2, X, Filter, AlertCircle, FileText,
  ChevronDown, RefreshCw, Lock, Info, Scissors, Droplets
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser } from '@/types'

const ADMIN_MSNV = '04127'

interface SupplementaryReportTabProps {
  user: SessionUser
}

// Dùng lại cấu trúc pour_report, map working_date <-> report_date
interface PourReport {
  id: string
  firm_plan: string
  shift: string
  machine_id: string | null
  actual_bun_poured: number
  report_date: string         // ← hiển thị là "Ngày làm việc"
  cleaning_agent_kg: number
  waste_kg: number
  is_compensation: boolean
  note: string | null
  manager_name: string | null
  recorder_id: string
  created_at: string
  production_plan?: {
    ten_san_pham: string | null
    no_order: string | null
    bun_code: string | null
    week_label: string
    sl_bun_can_do: number | null
  }
  users?: { full_name: string; msnv: string }
}

const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']
const MACHINES = ['Máy 1', 'Máy 2', 'Máy 3', 'Máy đổ tay']
const SEPARATE_MACHINES = ['Máy tách tự động 1', 'Máy tách tự động 2', 'Máy tách tay']
const MANAGERS = ['Linh', 'Thảo', 'Tuấn Anh']

// Interface báo cáo tách
interface SeparateReport {
  id: string
  firm_plan: string
  shift: string
  machine_id: string | null
  operator_name: string | null
  actual_bun_separated: number
  actual_sheet_received: number
  lot_no: string | null
  manager_name: string | null
  report_date: string
  ng_qty: number
  recorder_id: string
  created_at: string
  production_plan?: {
    ten_san_pham: string | null
    no_order: string | null
  }
}

function cleanProductName(name: string | null | undefined): string {
  if (!name) return '---'
  let clean = name.trim()
  clean = clean.replace(/^ortholite\s*/i, '')
  clean = clean.replace(/\[[^\]]*\]\s*/g, '')
  clean = clean.replace(/\b\d+(\.\d+)?\s*mm\b/gi, '')
  clean = clean.replace(/\b\d+(\.\d+)?\s*[Mm]\s*[xX]\s*\d+(\.\d+)?\s*[Mm]\b/g, '')
  clean = clean.replace(/\b\d+(\.\d+)?\s*[Mm]\b/g, '')
  clean = clean.replace(/\b(\d+(?:-\d+)?)(?:\s*\+\/-\s*\d+)?\s*asker\s*([a-zA-Z])\b/gi, '$1$2')
  return clean.replace(/\s+/g, ' ').trim() || '---'
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function last30DaysStr() {
  const d = new Date(); d.setDate(d.getDate() - 29)
  return d.toISOString().split('T')[0]
}

const emptyForm = () => ({
  firm_plan: '',
  shift: 'Ca 1',
  machine_id: 'Máy 1',
  actual_bun_poured: 0,
  working_date: todayStr(),   // → report_date in DB
  cleaning_agent_kg: 0,
  waste_kg: 0,
  is_compensation: false,
  note: '',
  manager_name: '',
})

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────
function EditModal({
  report,
  user,
  onClose,
  onSaved,
}: {
  report: PourReport
  user: SessionUser
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    shift: report.shift,
    machine_id: report.machine_id || 'Máy 1',
    actual_bun_poured: report.actual_bun_poured,
    working_date: report.report_date,
    cleaning_agent_kg: report.cleaning_agent_kg || 0,
    waste_kg: report.waste_kg || 0,
    is_compensation: report.is_compensation,
    note: report.note || '',
    manager_name: report.manager_name || '',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const { error } = await supabase
        .from('foaming_pour_reports')
        .update({
          shift: form.shift,
          machine_id: form.machine_id,
          actual_bun_poured: Number(form.actual_bun_poured),
          report_date: form.working_date,      // working_date → report_date
          cleaning_agent_kg: Number(form.cleaning_agent_kg),
          waste_kg: Number(form.waste_kg),
          is_compensation: form.is_compensation,
          note: form.note.trim() || null,
          manager_name: form.manager_name.trim() || null,
          is_pc_confirmed: true,
          pc_confirmed_at: new Date().toISOString(),
          pc_confirmed_by: user.id,
        })
        .eq('id', report.id)
      if (error) throw error
      setMsg({ type: 'success', text: 'Đã cập nhật thành công!' })
      setTimeout(() => { onSaved(); onClose() }, 1000)
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Pencil size={16} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-1)]">Chỉnh sửa báo cáo đổ</h3>
              <p className="text-[10px] text-[var(--text-3)] font-mono">{report.firm_plan}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors">
            <X size={16} className="text-[var(--text-3)]" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ca làm việc</label>
              <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}
                className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                {SHIFTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Máy làm việc</label>
              <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
                className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                {MACHINES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ngày làm việc (report_date)</label>
            <input type="date" value={form.working_date}
              onChange={e => setForm({ ...form, working_date: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Số bun thực tế đổ</label>
              <input type="number" value={form.actual_bun_poured} min="0"
                onChange={e => setForm({ ...form, actual_bun_poured: Number(e.target.value) })}
                className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Quản lý</label>
              <select value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })}
                className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
                <option value="">-- Chọn quản lý --</option>
                <option value="Linh">Linh</option>
                <option value="Thảo">Thảo</option>
                <option value="Tuấn Anh">Tuấn Anh</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Chất rửa (kg)</label>
              <input type="number" step="0.1" value={form.cleaning_agent_kg}
                onChange={e => setForm({ ...form, cleaning_agent_kg: Number(e.target.value) })}
                className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Rác (kg)</label>
              <input type="number" step="0.1" value={form.waste_kg}
                onChange={e => setForm({ ...form, waste_kg: Number(e.target.value) })}
                className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
            <input type="checkbox" id="edit_is_compensation_supp" checked={form.is_compensation}
              onChange={e => setForm({ ...form, is_compensation: e.target.checked })}
              className="w-4 h-4 accent-amber-500 cursor-pointer" />
            <label htmlFor="edit_is_compensation_supp" className="text-xs font-bold text-amber-700 dark:text-amber-400 cursor-pointer">
              Đơn bù
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ghi chú</label>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              rows={2} placeholder="Ghi chú thêm..."
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all resize-none" />
          </div>

          {msg && (
            <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
              {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {msg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-[var(--border)] text-sm font-bold text-[var(--text-2)] hover:bg-[var(--border)] transition-all">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── ADD SEPARATE FORM ────────────────────────────────────────────────────────
function AddSeparateReportForm({ user, onSuccess }: { user: SessionUser; onSuccess: () => void }) {
  const emptyForm = () => ({
    firm_plan: '',
    shift: 'Ca 1',
    machine_id: 'Máy tách tự động 2',
    working_date: new Date().toISOString().split('T')[0],
    operator_name: '',
    manager_name: '',
    lot_no: '',
    actual_bun_separated: 0,
    actual_sheet_received: 0,
    note: '',
  })
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [planSearch, setPlanSearch] = useState('')
  const [planResults, setPlanResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showPlanResults, setShowPlanResults] = useState(false)
  const [operators, setOperators] = useState<any[]>([])

  useEffect(() => {
    supabase.from('users').select('id, full_name, msnv')
      .or('and(department.ilike.%FOAMING Splitting%,position.in.("team leader","Operator","Team Leader","operator","Team leader")),msnv.in.("02126","04462")')
      .order('full_name')
      .then(({ data }) => setOperators(data || []))
  }, [])

  const searchPlan = useCallback(async (term: string) => {
    const rawTerm = term.trim()
    if (!rawTerm) { setPlanResults([]); return }
    const cleanTerm = rawTerm.replace(/\s+/g, '')
    setSearchLoading(true)
    try {
      const { data } = await supabase
        .from('production_plan')
        .select('firm_plan, ten_san_pham, no_order, bun_code, sl_bun_can_tach')
        .or(`firm_plan.ilike."%${rawTerm}%",no_order.ilike."%${rawTerm}%",firm_plan.ilike."%${cleanTerm}%",no_order.ilike."%${cleanTerm}%"`)
        .limit(8)
      setPlanResults(data || [])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchPlan(planSearch), 350)
    return () => clearTimeout(t)
  }, [planSearch, searchPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firm_plan.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng chọn mã đơn hàng.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const { error } = await supabase.from('foaming_separate_reports').insert({
        firm_plan: form.firm_plan,
        shift: form.shift,
        machine_id: form.machine_id,
        operator_name: form.operator_name.trim() || null,
        manager_name: form.manager_name.trim() || null,
        lot_no: form.lot_no.trim() || null,
        actual_bun_separated: Number(form.actual_bun_separated),
        actual_sheet_received: Number(form.actual_sheet_received),
        report_date: form.working_date,
        ng_qty: 0,
        ng_bun_qty: 0,
        error_type: null,
        note: form.note.trim() ? `[BỔ SUNG] ${form.note.trim()}` : '[BỔ SUNG]',
        is_compensation: false,
        bun_thickness_mm: 0,
        sheet_thickness_mm: 0,
        product_type: 'thanh_pham',
        recorder_id: user.id,
      })
      if (error) throw error
      setMsg({ type: 'success', text: 'Đã lưu vào báo cáo tách thành công!' })
      setForm(emptyForm())
      setPlanSearch('')
      setTimeout(() => { setMsg(null); onSuccess() }, 1500)
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi khi lưu: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
          <Scissors size={20} />
        </div>
        <div>
          <h3 className="font-bold text-base text-[var(--text-1)]">Thêm báo cáo tách bổ sung</h3>
          <p className="text-[10px] text-[var(--text-3)]">Lưu trực tiếp vào bảng foaming_separate_reports · MSNV: {user.msnv}</p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
        <Info size={14} className="text-purple-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-purple-700 dark:text-purple-300">
          Báo cáo tách bổ sung sẽ được lưu vào <strong>bảng báo cáo tách</strong> và hiển thị trong tab <em>BÁO CÁO</em> công đoạn Tách.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan Search */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1 flex items-center gap-1">
            <Search size={12} /> Mã đơn hàng (Firm Plan / NO.ORDER)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm FPRO, RPRO hoặc NO.ORDER..."
              value={planSearch}
              onChange={e => { setPlanSearch(e.target.value); setShowPlanResults(true) }}
              onFocus={() => setShowPlanResults(true)}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] font-mono outline-none focus:border-purple-500 transition-all"
            />
            {searchLoading && <Loader2 size={16} className="absolute right-3 top-3.5 text-[var(--text-3)] animate-spin" />}
          </div>
          {form.firm_plan && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <CheckCircle2 size={12} className="text-purple-500" />
              <span className="text-xs font-bold text-purple-600">Đã chọn: {form.firm_plan}</span>
              <button type="button" onClick={() => { setForm({ ...form, firm_plan: '' }); setPlanSearch('') }}
                className="ml-auto text-purple-400 hover:text-purple-600">
                <X size={12} />
              </button>
            </div>
          )}
          {showPlanResults && planResults.length > 0 && (
            <div className="absolute z-20 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden mt-1">
              {planResults.map(p => (
                <button key={p.firm_plan} type="button"
                  onClick={() => { setForm({ ...form, firm_plan: p.firm_plan }); setPlanSearch(p.firm_plan); setShowPlanResults(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-purple-500/5 transition-colors border-b border-[var(--border)] last:border-b-0">
                  <p className="font-mono font-bold text-xs text-[var(--text-1)]">{p.firm_plan}</p>
                  <p className="text-[10px] text-[var(--text-3)] truncate">{cleanProductName(p.ten_san_pham)}</p>
                  {p.no_order && <p className="text-[9px] text-purple-500 font-bold">NO: {p.no_order}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ca làm việc</label>
            <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all">
              {SHIFTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Máy tách</label>
            <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all">
              {SEPARATE_MACHINES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ngày làm việc</label>
            <input type="date" value={form.working_date}
              onChange={e => setForm({ ...form, working_date: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Người vận hành (Operator)</label>
            <select value={form.operator_name} onChange={e => setForm({ ...form, operator_name: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all">
              <option value="">-- Chọn operator --</option>
              {operators.map(op => <option key={op.id} value={op.full_name}>{op.full_name} ({op.msnv})</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Quản lý (Manager)</label>
            <select value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all">
              <option value="">-- Chọn quản lý --</option>
              {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số Lot</label>
            <input type="text" value={form.lot_no} placeholder="VD: 14/6"
              onChange={e => setForm({ ...form, lot_no: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số Bun tách</label>
            <input type="number" min="0" required value={form.actual_bun_separated}
              onChange={e => setForm({ ...form, actual_bun_separated: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all font-mono font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số Sheet nhận</label>
            <input type="number" min="0" required value={form.actual_sheet_received}
              onChange={e => setForm({ ...form, actual_sheet_received: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all font-mono font-bold" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ghi chú</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2} placeholder="Ghi chú thêm nếu có..."
            className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-purple-500 transition-all resize-none" />
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl text-white font-bold text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 8px 24px rgba(168,85,247,0.3)' }}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Scissors size={20} />}
          LƯU VÀO BÁO CÁO TÁCH
        </button>
      </form>
    </div>
  )
}

// ─── ADD FORM ─────────────────────────────────────────────────────────────────
function AddReportForm({ user, onSuccess }: { user: SessionUser; onSuccess: () => void }) {
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [planSearch, setPlanSearch] = useState('')
  const [planResults, setPlanResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showPlanResults, setShowPlanResults] = useState(false)

  const searchPlan = useCallback(async (term: string) => {
    const rawTerm = term.trim()
    if (!rawTerm) { setPlanResults([]); return }
    const cleanTerm = rawTerm.replace(/\s+/g, '')
    setSearchLoading(true)
    try {
      const { data } = await supabase
        .from('production_plan')
        .select('firm_plan, ten_san_pham, no_order, bun_code, sl_bun_can_do')
        .or(`firm_plan.ilike."%${rawTerm}%",no_order.ilike."%${rawTerm}%",firm_plan.ilike."%${cleanTerm}%",no_order.ilike."%${cleanTerm}%"`)
        .limit(8)
      setPlanResults(data || [])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchPlan(planSearch), 350)
    return () => clearTimeout(t)
  }, [planSearch, searchPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firm_plan.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng chọn mã đơn hàng.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const storageCarts = Math.ceil(Number(form.actual_bun_poured) / 6)
      // Lưu vào foaming_pour_reports, working_date → report_date
      const { error } = await supabase.from('foaming_pour_reports').insert({
        firm_plan: form.firm_plan,
        shift: form.shift,
        machine_id: form.machine_id,
        actual_bun_poured: Number(form.actual_bun_poured),
        report_date: form.working_date,         // Ngày làm việc → report_date
        cleaning_agent_kg: Number(form.cleaning_agent_kg),
        waste_kg: Number(form.waste_kg),
        is_compensation: form.is_compensation,
        note: form.note.trim() || null,
        recorder_id: user.id,
        // Các trường bắt buộc nhưng không nhập trong form bổ sung:
        ng_bun_qty: 0,
        error_type: null,
        operator_name: null,
        manager_name: form.manager_name.trim() || null,
        lot_no: null,
        storage_location: null,
        storage_line: null,
        color_tag: null,
        storage_carts: storageCarts,
        is_pc_confirmed: true,
        pc_confirmed_at: new Date().toISOString(),
        pc_confirmed_by: user.id,
      })
      if (error) throw error
      setMsg({ type: 'success', text: 'Đã lưu vào báo cáo đổ thành công!' })
      setForm(emptyForm())
      setPlanSearch('')
      setTimeout(() => { setMsg(null); onSuccess() }, 1500)
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi khi lưu: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Plus size={20} />
        </div>
        <div>
          <h3 className="font-bold text-base text-[var(--text-1)]">Thêm báo cáo bổ sung</h3>
          <p className="text-[10px] text-[var(--text-3)]">Dữ liệu sẽ lưu vào bảng báo cáo đổ · MSNV: {user.msnv}</p>
        </div>
      </div>

      {/* Thông báo rõ ràng */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
        <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
          Báo cáo bổ sung sẽ được lưu trực tiếp vào <strong>bảng báo cáo đổ</strong> (foaming_pour_reports), và sẽ hiển thị cùng với các báo cáo đổ thông thường trong tab <em>Daily report</em> và tab <em>BÁO CÁO</em>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan Search */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1 flex items-center gap-1">
            <Search size={12} /> Mã đơn hàng (Firm Plan / NO.ORDER)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm FPRO, RPRO hoặc NO.ORDER..."
              value={planSearch}
              onChange={e => { setPlanSearch(e.target.value); setShowPlanResults(true) }}
              onFocus={() => setShowPlanResults(true)}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] font-mono outline-none focus:border-indigo-500 transition-all"
            />
            {searchLoading && <Loader2 size={16} className="absolute right-3 top-3.5 text-[var(--text-3)] animate-spin" />}
          </div>
          {form.firm_plan && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <CheckCircle2 size={12} className="text-indigo-500" />
              <span className="text-xs font-bold text-indigo-600">Đã chọn: {form.firm_plan}</span>
              <button type="button" onClick={() => { setForm({ ...form, firm_plan: '' }); setPlanSearch('') }}
                className="ml-auto text-indigo-400 hover:text-indigo-600">
                <X size={12} />
              </button>
            </div>
          )}
          {showPlanResults && planResults.length > 0 && (
            <div className="absolute z-20 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden mt-1">
              {planResults.map(p => (
                <button key={p.firm_plan} type="button"
                  onClick={() => { setForm({ ...form, firm_plan: p.firm_plan }); setPlanSearch(p.firm_plan); setShowPlanResults(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-500/5 transition-colors border-b border-[var(--border)] last:border-b-0">
                  <p className="font-mono font-bold text-xs text-[var(--text-1)]">{p.firm_plan}</p>
                  <p className="text-[10px] text-[var(--text-3)] truncate">{cleanProductName(p.ten_san_pham)}</p>
                  {p.no_order && <p className="text-[9px] text-indigo-500 font-bold">NO: {p.no_order}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ca làm việc</label>
            <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
              {SHIFTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Máy làm việc</label>
            <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
              {MACHINES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ngày làm việc</label>
            <input type="date" value={form.working_date}
              onChange={e => setForm({ ...form, working_date: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Số bun thực tế đổ</label>
            <input type="number" value={form.actual_bun_poured} min="0" required
              onChange={e => setForm({ ...form, actual_bun_poured: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Quản lý</label>
            <select value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all">
              <option value="">-- Chọn quản lý (không bắt buộc) --</option>
              <option value="Linh">Linh</option>
              <option value="Thảo">Thảo</option>
              <option value="Tuấn Anh">Tuấn Anh</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Chất rửa đầu súng (kg)</label>
            <input type="number" step="0.1" value={form.cleaning_agent_kg}
              onChange={e => setForm({ ...form, cleaning_agent_kg: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Rác (kg)</label>
            <input type="number" step="0.1" value={form.waste_kg}
              onChange={e => setForm({ ...form, waste_kg: Number(e.target.value) })}
              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all" />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
          <input type="checkbox" id="add_is_compensation_supp" checked={form.is_compensation}
            onChange={e => setForm({ ...form, is_compensation: e.target.checked })}
            className="w-5 h-5 accent-amber-500 cursor-pointer" />
          <label htmlFor="add_is_compensation_supp" className="text-xs font-black text-amber-700 dark:text-amber-400 cursor-pointer">
            Đơn bù (Báo cáo này bù cho hàng phế phẩm NG)
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-2)] uppercase ml-1">Ghi chú</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2} placeholder="Ghi chú thêm nếu có..."
            className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all resize-none" />
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl text-white font-bold text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          LƯU VÀO BÁO CÁO ĐỔ
        </button>
      </form>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SupplementaryReportTab({ user }: SupplementaryReportTabProps) {
  const isAdmin = user?.msnv === ADMIN_MSNV

  // Tab chọn: báo cáo đổ hay tách
  const [activeSection, setActiveSection] = useState<'pour' | 'separate'>('pour')

  const [reports, setReports] = useState<PourReport[]>([])
  const [loading, setLoading] = useState(true)
  const [editingReport, setEditingReport] = useState<PourReport | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Separate reports state
  const [separateReports, setSeparateReports] = useState<SeparateReport[]>([])
  const [sepLoading, setSepLoading] = useState(true)
  const [deletingSepId, setDeletingSepId] = useState<string | null>(null)
  const [deleteSepLoading, setDeleteSepLoading] = useState(false)

  const [startDate, setStartDate] = useState(last30DaysStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [shiftFilter, setShiftFilter] = useState('Tất cả')
  const [managerFilter, setManagerFilter] = useState('Tất cả')
  const [showFilters, setShowFilters] = useState(false)
  const [activeView, setActiveView] = useState<'add' | 'list'>('list')

  // Fetch từ foaming_pour_reports, lọc theo report_date (ngày làm việc)
  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('foaming_pour_reports')
        .select(`
          *,
          production_plan (
            ten_san_pham,
            no_order,
            bun_code,
            week_label,
            sl_bun_can_do
          ),
          users (full_name, msnv)
        `)
        .eq('recorder_id', user.id)
        .is('operator_name', null)
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      let result = data || []
      if (shiftFilter !== 'Tất cả') {
        result = result.filter((r: any) => r.shift === shiftFilter)
      }
      if (managerFilter !== 'Tất cả') {
        result = result.filter((r: any) => (r.manager_name || 'Khác') === managerFilter)
      }
      setReports(result as PourReport[])
    } catch (err: any) {
      console.error('Error fetching pour reports:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, shiftFilter, managerFilter])

  useEffect(() => { if (activeSection === 'pour') fetchReports() }, [fetchReports, activeSection])

  const handleDelete = async (id: string) => {
    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('foaming_pour_reports')
        .delete()
        .eq('id', id)
      if (error) throw error
      await fetchReports()
      setDeletingId(null)
    } catch (err: any) {
      alert('Không thể xóa: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const fetchSeparateReports = useCallback(async () => {
    setSepLoading(true)
    try {
      const { data, error } = await supabase
        .from('foaming_separate_reports')
        .select(`
          id, firm_plan, shift, machine_id, operator_name,
          actual_bun_separated, actual_sheet_received, lot_no,
          manager_name, report_date, ng_qty, recorder_id, created_at,
          production_plan (ten_san_pham, no_order)
        `)
        .eq('recorder_id', user.id)
        .like('note', '[BỔ SUNG]%')
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      let result = data || []
      if (shiftFilter !== 'Tất cả') result = result.filter((r: any) => r.shift === shiftFilter)
      setSeparateReports(result as unknown as SeparateReport[])
    } catch (err: any) {
      console.error('Error fetching separate reports:', err)
    } finally {
      setSepLoading(false)
    }
  }, [startDate, endDate, shiftFilter, user.id])

  useEffect(() => { if (activeSection === 'separate') fetchSeparateReports() }, [fetchSeparateReports, activeSection])

  const handleDeleteSeparate = async (id: string) => {
    setDeleteSepLoading(true)
    try {
      const { error } = await supabase.from('foaming_separate_reports').delete().eq('id', id)
      if (error) throw error
      await fetchSeparateReports()
      setDeletingSepId(null)
    } catch (err: any) {
      alert('Không thể xóa: ' + err.message)
    } finally {
      setDeleteSepLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <Lock size={40} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-[var(--text-1)] mb-2">Không có quyền truy cập</h3>
          <p className="text-sm text-[var(--text-3)] max-w-xs">
            Tab này chỉ dành cho quản trị viên.
          </p>
        </div>
      </div>
    )
  }

  const totalBun = reports.reduce((s, r) => s + r.actual_bun_poured, 0)
  const totalCleaning = reports.reduce((s, r) => s + (r.cleaning_agent_kg || 0), 0)
  const totalWaste = reports.reduce((s, r) => s + (r.waste_kg || 0), 0)
  const totalSepBun = separateReports.reduce((s, r) => s + r.actual_bun_separated, 0)
  const totalSepSheet = separateReports.reduce((s, r) => s + r.actual_sheet_received, 0)

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: activeSection === 'pour' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
            {activeSection === 'pour' ? <Droplets size={20} /> : <Scissors size={20} />}
          </div>
          <div>
            <h2 className="text-base font-black text-[var(--text-1)]">Báo cáo bổ sung</h2>
            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-widest flex items-center gap-1">
              <Lock size={9} /> Chỉ dành cho: {user.full_name} · MSNV {user.msnv}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => activeSection === 'pour' ? fetchReports() : fetchSeparateReports()}
            className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--border)] transition-all text-[var(--text-3)]">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setActiveView(activeView === 'add' ? 'list' : 'add')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: activeView === 'add' ? '#64748b' : activeSection === 'pour' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
            {activeView === 'add' ? <><X size={14} /> Đóng form</> : <><Plus size={14} /> Thêm mới</>}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--bg-2,#f3f4f6)] dark:bg-white/5 rounded-2xl">
        <button
          onClick={() => { setActiveSection('pour'); setActiveView('list') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'pour'
              ? 'bg-white dark:bg-white/10 shadow-md text-indigo-600'
              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
          }`}>
          <Droplets size={14} /> Báo cáo đổ bổ sung
          <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">{reports.length}</span>
        </button>
        <button
          onClick={() => { setActiveSection('separate'); setActiveView('list') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'separate'
              ? 'bg-white dark:bg-white/10 shadow-md text-purple-600'
              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
          }`}>
          <Scissors size={14} /> Báo cáo tách bổ sung
          <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600">{separateReports.length}</span>
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {activeView === 'add' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {activeSection === 'pour'
              ? <AddReportForm user={user} onSuccess={() => { fetchReports(); setActiveView('list') }} />
              : <AddSeparateReportForm user={user} onSuccess={() => { fetchSeparateReports(); setActiveView('list') }} />
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI - pour */}
      {activeSection === 'pour' && !loading && reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tổng Bun Đổ', value: totalBun.toLocaleString(), unit: 'bun', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
            { label: 'Chất Rửa', value: totalCleaning.toFixed(1), unit: 'kg', color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
            { label: 'Rác', value: totalWaste.toFixed(1), unit: 'kg', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-4 border"
              style={{ background: kpi.bg, borderColor: `${kpi.color}20` }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: kpi.color }}>{kpi.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: kpi.color }}>
                {kpi.value}<span className="text-sm font-normal ml-1 opacity-75">{kpi.unit}</span>
              </p>
              <p className="text-[10px] text-[var(--text-3)] mt-1">{reports.length} báo cáo</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI - separate */}
      {activeSection === 'separate' && !sepLoading && separateReports.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Tổng Bun Tách', value: totalSepBun.toLocaleString(), unit: 'bun', color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
            { label: 'Tổng Sheet Nhận', value: totalSepSheet.toLocaleString(), unit: 'sheet', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-4 border"
              style={{ background: kpi.bg, borderColor: `${kpi.color}20` }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: kpi.color }}>{kpi.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: kpi.color }}>
                {kpi.value}<span className="text-sm font-normal ml-1 opacity-75">{kpi.unit}</span>
              </p>
              <p className="text-[10px] text-[var(--text-3)] mt-1">{separateReports.length} báo cáo</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-indigo-500" />
            <h3 className="text-sm font-black text-[var(--text-1)] uppercase tracking-tight">Bộ lọc</h3>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1">
            {showFilters ? 'Thu gọn' : 'Mở rộng'}
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
          <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
            <Calendar size={11} /> Khoảng thời gian (theo Ngày làm việc)
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono" />
            <span className="text-indigo-300 font-bold text-xs self-center">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono" />
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ca làm việc</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Tất cả', ...SHIFTS].map(s => (
                      <button key={s} onClick={() => setShiftFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${shiftFilter === s ? 'bg-indigo-500 text-white shadow-md' : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-indigo-500/10'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">Quản lý</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Tất cả', 'Linh', 'Thảo', 'Tuấn Anh', 'Khác'].map(m => (
                      <button key={m} onClick={() => setManagerFilter(m)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${managerFilter === m ? 'bg-indigo-500 text-white shadow-md' : 'bg-[var(--bg-2,#f3f4f6)] dark:bg-white/10 text-[var(--text-2)] hover:bg-indigo-500/10'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          {[
            { label: 'Hôm nay', fn: () => { setStartDate(todayStr()); setEndDate(todayStr()) } },
            { label: '7 ngày', fn: () => { const d = new Date(); d.setDate(d.getDate() - 6); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr()) } },
            { label: '30 ngày', fn: () => { setStartDate(last30DaysStr()); setEndDate(todayStr()) } },
          ].map(q => (
            <button key={q.label} onClick={q.fn}
              className="px-2.5 py-1 text-[9px] font-bold rounded-full border border-[var(--border)] text-[var(--text-3)] hover:border-indigo-500 hover:text-indigo-500 transition-all">
              {q.label}
            </button>
          ))}
          <button onClick={fetchReports}
            className="ml-auto px-3.5 py-1 text-[9px] font-bold rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm">
            ↻ Tải lại
          </button>
        </div>
      </div>

      {/* Table - POUR */}
      {activeSection === 'pour' && (loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-bold animate-pulse">Đang tải dữ liệu...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] border-dashed">
          <FileText size={40} className="text-[var(--text-3)] opacity-30" />
          <p className="text-sm text-[var(--text-3)] font-medium">Không có báo cáo đổ trong khoảng thời gian này</p>
          <button onClick={() => setActiveView('add')}
            className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-all">
            + Thêm báo cáo
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), transparent)' }}>
            <FileText size={16} className="text-indigo-500" />
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--text-1)]">
              Báo cáo đổ bổ sung (lọc theo ngày làm việc)
            </h3>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
              {reports.length} bản ghi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase text-[var(--text-3)] border-b border-[var(--border)]">
                  <th className="p-3 whitespace-nowrap">Ngày làm việc</th>
                  <th className="p-3">Firm Plan</th>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3 text-center">Ca</th>
                  <th className="p-3 text-center">Máy</th>
                  <th className="p-3 text-center">Bun Đổ</th>
                  <th className="p-3 text-center">Chất rửa</th>
                  <th className="p-3 text-center">Rác</th>
                  <th className="p-3">Quản lý</th>
                  <th className="p-3">Người nhập</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {reports.map(r => (
                  <tr key={r.id} className="text-xs hover:bg-indigo-500/5 transition-colors group">
                    <td className="p-3 font-bold text-[var(--text-1)] whitespace-nowrap font-mono">
                      {r.report_date?.split('-').reverse().join('/')}
                      {r.is_compensation && (
                        <span className="ml-1 text-[8px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-700">BÙ</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-indigo-600 font-bold">{r.firm_plan}</td>
                    <td className="p-3 text-[var(--text-2)] max-w-[180px]">
                      <p className="truncate" title={r.production_plan?.ten_san_pham || ''}>
                        {cleanProductName(r.production_plan?.ten_san_pham)}
                      </p>
                      {r.production_plan?.no_order && (
                        <p className="text-[9px] text-[var(--text-3)]">NO: {r.production_plan.no_order}</p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.shift === 'Ca 1' ? 'bg-orange-100 text-orange-700' :
                        r.shift === 'Ca 2' ? 'bg-yellow-100 text-yellow-700' :
                        r.shift === 'Ca 3' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{r.shift}</span>
                    </td>
                    <td className="p-3 text-center text-[var(--text-2)]">{r.machine_id || '—'}</td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-black text-indigo-600">{r.actual_bun_poured.toLocaleString()}</span>
                    </td>
                    <td className="p-3 text-center text-[var(--text-2)]">
                      {(r.cleaning_agent_kg || 0) > 0 ? `${r.cleaning_agent_kg} kg` : '—'}
                    </td>
                    <td className="p-3 text-center text-[var(--text-2)]">
                      {(r.waste_kg || 0) > 0 ? `${r.waste_kg} kg` : '—'}
                    </td>
                    <td className="p-3 text-[var(--text-2)] font-medium whitespace-nowrap">
                      {r.manager_name || '—'}
                    </td>
                    <td className="p-3 text-[var(--text-3)] text-[11px]">
                      {r.users?.full_name || '—'}
                    </td>
                    <td className="p-3 text-[var(--text-3)] max-w-[120px]">
                      <span className="truncate block" title={r.note || ''}>{r.note || '—'}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingReport(r)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setDeletingId(r.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Table - SEPARATE */}
      {activeSection === 'separate' && (sepLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-3)] font-bold animate-pulse">Đang tải dữ liệu...</p>
        </div>
      ) : separateReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] border-dashed">
          <Scissors size={40} className="text-[var(--text-3)] opacity-30" />
          <p className="text-sm text-[var(--text-3)] font-medium">Không có báo cáo tách trong khoảng thời gian này</p>
          <button onClick={() => setActiveView('add')}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
            + Thêm báo cáo tách
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.04), transparent)' }}>
            <Scissors size={16} className="text-purple-500" />
            <h3 className="text-sm font-black uppercase tracking-tight text-[var(--text-1)]">
              Báo cáo tách bổ sung (lọc theo ngày làm việc)
            </h3>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
              {separateReports.length} bản ghi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase text-[var(--text-3)] border-b border-[var(--border)]">
                  <th className="p-3 whitespace-nowrap">Ngày</th>
                  <th className="p-3">Firm Plan</th>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3 text-center">Ca</th>
                  <th className="p-3 text-center">Máy tách</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Quản lý</th>
                  <th className="p-3 text-center">Lot</th>
                  <th className="p-3 text-center">Bun tách</th>
                  <th className="p-3 text-center">Sheet nhận</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {separateReports.map(r => (
                  <tr key={r.id} className="text-xs hover:bg-purple-500/5 transition-colors group">
                    <td className="p-3 font-bold text-[var(--text-1)] whitespace-nowrap font-mono">
                      {r.report_date?.split('-').reverse().join('/')}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-purple-600 font-bold">{r.firm_plan}</td>
                    <td className="p-3 text-[var(--text-2)] max-w-[150px]">
                      <p className="truncate" title={r.production_plan?.ten_san_pham || ''}>
                        {cleanProductName(r.production_plan?.ten_san_pham)}
                      </p>
                      {r.production_plan?.no_order && (
                        <p className="text-[9px] text-[var(--text-3)]">NO: {r.production_plan.no_order}</p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.shift === 'Ca 1' ? 'bg-orange-100 text-orange-700' :
                        r.shift === 'Ca 2' ? 'bg-yellow-100 text-yellow-700' :
                        r.shift === 'Ca 3' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{r.shift}</span>
                    </td>
                    <td className="p-3 text-center text-[var(--text-2)] text-[10px]">{r.machine_id || '—'}</td>
                    <td className="p-3 text-[var(--text-2)] text-[11px]">{r.operator_name || '—'}</td>
                    <td className="p-3 text-[var(--text-2)] font-medium whitespace-nowrap">{r.manager_name || '—'}</td>
                    <td className="p-3 text-center font-mono text-[var(--text-2)]">{r.lot_no || '—'}</td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-black text-purple-600">{r.actual_bun_separated.toLocaleString()}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-black text-violet-600">{r.actual_sheet_received.toLocaleString()}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDeletingSepId(r.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Edit Modal - pour */}
      <AnimatePresence>
        {editingReport && (
          <EditModal
            report={editingReport}
            user={user}
            onClose={() => setEditingReport(null)}
            onSaved={fetchReports}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm - pour */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeletingId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-black text-[var(--text-1)]">Xóa báo cáo đổ?</h3>
              <p className="text-sm text-[var(--text-3)]">Hành động này sẽ xóa khỏi bảng báo cáo đổ và không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[var(--border)] text-sm font-bold text-[var(--text-2)] hover:bg-[var(--border)] transition-all">
                  Hủy
                </button>
                <button onClick={() => handleDelete(deletingId)} disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm - separate */}
      <AnimatePresence>
        {deletingSepId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeletingSepId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-black text-[var(--text-1)]">Xóa báo cáo tách?</h3>
              <p className="text-sm text-[var(--text-3)]">Hành động này sẽ xóa khỏi bảng báo cáo tách và không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingSepId(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[var(--border)] text-sm font-bold text-[var(--text-2)] hover:bg-[var(--border)] transition-all">
                  Hủy
                </button>
                <button onClick={() => handleDeleteSeparate(deletingSepId)} disabled={deleteSepLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteSepLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

