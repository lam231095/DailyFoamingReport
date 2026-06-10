'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SessionUser, FoamingPourReport } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Edit3,
  Save,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2,
  CalendarDays,
} from 'lucide-react'

interface ProcessControlTabProps {
  user: SessionUser
}

const ERROR_TYPES = [
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn',
]

const MACHINES = ['Máy 1', 'Máy 2', 'Máy 3', 'Máy đổ tay']
const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']
const MANAGERS = ['Linh', 'Thảo', 'Tuấn Anh']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

interface EditState {
  actual_bun_poured: number
  ng_bun_qty: number
  error_type: string
  machine_id: string
  shift: string
  manager_name: string
  operator_name: string
  downtime_reason: string
  downtime_start: string
  downtime_end: string
  pc_note: string
  has_downtime: boolean
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProcessControlTab({ user }: ProcessControlTabProps) {
  const [records, setRecords] = useState<FoamingPourReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed'>('all')
  const [filterDate, setFilterDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('foaming_pour_reports')
        .select(`
          *,
          production_plan:firm_plan(no_order, bun_code, ten_san_pham, product_type),
          users:recorder_id(msnv, full_name)
        `)
        .gte('report_date', '2026-06-10')
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filterDate) {
        query = query.eq('report_date', filterDate)
      }

      const { data, error } = await query
      if (error) throw error
      setRecords(data || [])
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Lỗi tải dữ liệu: ' + err.message })
    } finally {
      setLoading(false)
    }
  }, [filterDate])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const filteredRecords = records.filter(r => {
    if (filterStatus === 'pending') return !r.is_pc_confirmed
    if (filterStatus === 'confirmed') return r.is_pc_confirmed
    return true
  })

  const startEdit = (r: FoamingPourReport) => {
    setEditingId(r.id)
    setEditState({
      actual_bun_poured: r.actual_bun_poured,
      ng_bun_qty: r.ng_bun_qty,
      error_type: r.error_type || '',
      machine_id: r.machine_id || '',
      shift: r.shift,
      manager_name: r.manager_name || '',
      operator_name: r.operator_name || '',
      downtime_reason: r.downtime_reason || '',
      downtime_start: r.downtime_start || '',
      downtime_end: r.downtime_end || '',
      pc_note: r.pc_note || '',
      has_downtime: !!(r.downtime_reason),
    })
    setExpandedId(r.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditState(null)
  }

  const saveEdit = async (id: string) => {
    if (!editState) return
    setSavingId(id)
    try {
      const updatePayload: Record<string, any> = {
        actual_bun_poured: editState.actual_bun_poured,
        ng_bun_qty: editState.ng_bun_qty,
        error_type: editState.error_type || null,
        machine_id: editState.machine_id || null,
        shift: editState.shift,
        manager_name: editState.manager_name || null,
        operator_name: editState.operator_name || null,
        pc_note: editState.pc_note || null,
        downtime_reason: editState.has_downtime && editState.downtime_reason ? editState.downtime_reason : null,
        downtime_start: editState.has_downtime && editState.downtime_start ? editState.downtime_start : null,
        downtime_end: editState.has_downtime && editState.downtime_end ? editState.downtime_end : null,
      }

      // Calculate downtime duration
      if (editState.has_downtime && editState.downtime_start && editState.downtime_end) {
        const [sh, sm] = editState.downtime_start.split(':').map(Number)
        const [eh, em] = editState.downtime_end.split(':').map(Number)
        const startTotal = sh * 60 + sm
        const endTotal = eh * 60 + em
        updatePayload.downtime_duration = endTotal >= startTotal
          ? endTotal - startTotal
          : (24 * 60 - startTotal) + endTotal
      } else {
        updatePayload.downtime_duration = null
      }

      const { error } = await supabase.from('foaming_pour_reports').update(updatePayload).eq('id', id)
      if (error) throw error

      setMessage({ type: 'success', text: 'Đã lưu chỉnh sửa thành công!' })
      setEditingId(null)
      setEditState(null)
      await fetchRecords()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Lỗi khi lưu: ' + err.message })
    } finally {
      setSavingId(null)
    }
  }

  const confirmReport = async (id: string) => {
    setConfirmingId(id)
    try {
      const { error } = await supabase.from('foaming_pour_reports').update({
        is_pc_confirmed: true,
        pc_confirmed_at: new Date().toISOString(),
        pc_confirmed_by: user.id,
      }).eq('id', id)
      if (error) throw error

      setMessage({ type: 'success', text: '✅ Báo cáo đổ đã được xác nhận và gửi vào Daily Report!' })
      await fetchRecords()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Lỗi khi xác nhận: ' + err.message })
    } finally {
      setConfirmingId(null)
    }
  }

  const pendingCount = records.filter(r => !r.is_pc_confirmed).length
  const confirmedCount = records.filter(r => r.is_pc_confirmed).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,88,12,0.04))',
          border: '1px solid rgba(249,115,22,0.18)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-[var(--text-1)]">Process Control Đổ</h3>
            <p className="text-[11px] text-[var(--text-3)] font-medium">
              Kiểm tra · Chỉnh sửa · Xác nhận báo cáo đổ (từ 10/06/2026)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Clock size={12} />
            {pendingCount} chờ xác nhận
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle2 size={12} />
            {confirmedCount} đã xác nhận
          </div>
          <button
            onClick={fetchRecords}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-all"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message.text}
            <button className="ml-auto" onClick={() => setMessage(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)] flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-[var(--text-3)]" />
        <span className="text-xs font-bold text-[var(--text-2)] uppercase">Lọc:</span>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
          {([['all', 'Tất cả'], ['pending', 'Chờ XN'], ['confirmed', 'Đã XN']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
                filterStatus === val
                  ? 'bg-orange-500 text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--border)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <CalendarDays size={13} className="text-[var(--text-3)]" />
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-all"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <span className="ml-auto text-xs text-[var(--text-3)] font-medium">
          {filteredRecords.length} bản ghi
        </span>
      </div>

      {/* Records list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-orange-500 mb-3" />
          <p className="text-sm text-[var(--text-3)]">Đang tải dữ liệu...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
          <ShieldCheck size={40} className="text-[var(--text-3)] mb-3" />
          <p className="text-sm font-bold text-[var(--text-2)]">Không có dữ liệu</p>
          <p className="text-xs text-[var(--text-3)]">Chưa có báo cáo đổ nào từ 10/06/2026</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const isEditing = editingId === record.id
            const isExpanded = expandedId === record.id
            const isConfirmed = record.is_pc_confirmed

            return (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-card)] rounded-2xl border overflow-hidden transition-all"
                style={{
                  borderColor: isConfirmed ? 'rgba(16,185,129,0.3)' : isEditing ? 'rgba(249,115,22,0.4)' : 'var(--border)',
                  boxShadow: isEditing ? '0 0 0 2px rgba(249,115,22,0.12)' : undefined,
                }}
              >
                {/* Row Header */}
                <div className="flex items-start gap-3 p-4">
                  {/* Status badge */}
                  <div className="shrink-0 mt-0.5">
                    {isConfirmed ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <Clock size={16} className="text-red-500" />
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-black text-[var(--text-1)] font-mono">{record.firm_plan}</span>
                      {(record.production_plan as any)?.no_order && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                          {(record.production_plan as any).no_order}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {isConfirmed ? '✓ Đã xác nhận' : '⏳ Chờ xác nhận'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                      <div>
                        <span className="text-[var(--text-3)]">Ngày BC: </span>
                        <span className="font-bold text-[var(--text-1)]">{formatDate(record.report_date)}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">Mã Bun: </span>
                        <span className="font-bold text-[var(--text-1)]">{(record.production_plan as any)?.bun_code || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">Ca: </span>
                        <span className="font-bold text-[var(--text-1)]">{record.shift}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">Máy: </span>
                        <span className="font-bold text-[var(--text-1)]">{record.machine_id || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">Quản lý: </span>
                        <span className="font-bold text-[var(--text-1)]">{record.manager_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">Operator: </span>
                        <span className="font-bold text-[var(--text-1)]">{record.operator_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">SL Đổ: </span>
                        <span className="font-black text-blue-600 text-sm">{record.actual_bun_poured}</span>
                        <span className="text-[var(--text-3)]"> bun</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-3)]">NG: </span>
                        <span className={`font-black text-sm ${record.ng_bun_qty > 0 ? 'text-red-600' : 'text-[var(--text-3)]'}`}>
                          {record.ng_bun_qty}
                        </span>
                        {record.ng_bun_qty > 0 && (
                          <span className="text-[var(--text-3)]"> bun</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-[var(--text-3)]">Người nhập: </span>
                        <span className="font-bold text-[var(--text-1)]">{record.users?.full_name || '—'}</span>
                      </div>
                      {record.downtime_reason && (
                        <div className="col-span-2 sm:col-span-4 mt-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                          style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                          ⚠️ Dừng máy: {record.downtime_reason}
                          {record.downtime_start && ` · Từ ${record.downtime_start}`}
                          {record.downtime_end && ` → ${record.downtime_end}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {!isConfirmed && !isEditing && (
                      <button
                        onClick={() => startEdit(record)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[var(--border)] text-[var(--text-2)] hover:text-orange-600 hover:border-orange-300 transition-all bg-[var(--bg-card)]"
                      >
                        <Edit3 size={12} /> Chỉnh sửa
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-all bg-[var(--bg-card)]"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                <AnimatePresence>
                  {isEditing && editState && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-orange-500/20"
                      style={{ background: 'rgba(249,115,22,0.03)' }}
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Edit3 size={14} className="text-orange-500" />
                          <span className="text-xs font-black text-orange-600 uppercase tracking-wide">Chỉnh sửa báo cáo đổ</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Ca */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ca</label>
                            <select value={editState.shift} onChange={e => setEditState({ ...editState, shift: e.target.value })}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all">
                              {SHIFTS.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>

                          {/* Máy */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Máy</label>
                            <select value={editState.machine_id} onChange={e => setEditState({ ...editState, machine_id: e.target.value })}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all">
                              <option value="">-- Chọn --</option>
                              {MACHINES.map(m => <option key={m}>{m}</option>)}
                            </select>
                          </div>

                          {/* Quản lý */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Quản lý</label>
                            <select value={editState.manager_name} onChange={e => setEditState({ ...editState, manager_name: e.target.value })}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all">
                              <option value="">-- Chọn --</option>
                              {MANAGERS.map(m => <option key={m}>{m}</option>)}
                            </select>
                          </div>

                          {/* Operator */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Operator</label>
                            <input type="text" value={editState.operator_name}
                              onChange={e => setEditState({ ...editState, operator_name: e.target.value })}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all" />
                          </div>

                          {/* SL Đổ */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">SL Đổ (Bun)</label>
                            <input type="number" min={0} value={editState.actual_bun_poured}
                              onChange={e => setEditState({ ...editState, actual_bun_poured: Number(e.target.value) })}
                              className="w-full bg-[var(--bg-card)] border-2 border-blue-500/40 rounded-xl px-3 py-2 text-sm font-black text-blue-600 focus:border-blue-500 outline-none transition-all font-mono" />
                          </div>

                          {/* NG */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">NG (Bun)</label>
                            <input type="number" min={0} value={editState.ng_bun_qty}
                              onChange={e => setEditState({ ...editState, ng_bun_qty: Number(e.target.value) })}
                              className="w-full bg-[var(--bg-card)] border-2 border-red-500/30 rounded-xl px-3 py-2 text-sm font-black text-red-600 focus:border-red-500 outline-none transition-all font-mono" />
                          </div>

                          {/* Error type */}
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Loại lỗi NG</label>
                            <select value={editState.error_type} onChange={e => setEditState({ ...editState, error_type: e.target.value })}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all">
                              <option value="">-- Không có lỗi --</option>
                              {ERROR_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Downtime section */}
                        <div className="space-y-3 bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id={`downtime-${record.id}`} checked={editState.has_downtime}
                              onChange={e => setEditState({ ...editState, has_downtime: e.target.checked })}
                              className="w-4 h-4 accent-amber-500 cursor-pointer" />
                            <label htmlFor={`downtime-${record.id}`} className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase cursor-pointer">
                              Có dừng máy
                            </label>
                          </div>

                          {editState.has_downtime && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Nguyên nhân dừng</label>
                                <input type="text" value={editState.downtime_reason}
                                  onChange={e => setEditState({ ...editState, downtime_reason: e.target.value })}
                                  placeholder="Nhập nguyên nhân..."
                                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-amber-500 outline-none transition-all" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Dừng từ lúc</label>
                                <div className="flex gap-1">
                                  <select value={editState.downtime_start.split(':')[0] || '00'}
                                    onChange={e => {
                                      const mins = editState.downtime_start.split(':')[1] || '00'
                                      setEditState({ ...editState, downtime_start: `${e.target.value}:${mins}` })
                                    }}
                                    className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-2 py-2 text-sm font-bold focus:border-amber-500 outline-none transition-all">
                                    {HOURS.map(h => <option key={h}>{h}</option>)}
                                  </select>
                                  <select value={editState.downtime_start.split(':')[1] || '00'}
                                    onChange={e => {
                                      const hrs = editState.downtime_start.split(':')[0] || '00'
                                      setEditState({ ...editState, downtime_start: `${hrs}:${e.target.value}` })
                                    }}
                                    className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-2 py-2 text-sm font-bold focus:border-amber-500 outline-none transition-all">
                                    {MINUTES.map(m => <option key={m}>{m}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Dừng đến lúc</label>
                                <div className="flex gap-1">
                                  <select value={editState.downtime_end.split(':')[0] || '00'}
                                    onChange={e => {
                                      const mins = editState.downtime_end.split(':')[1] || '00'
                                      setEditState({ ...editState, downtime_end: `${e.target.value}:${mins}` })
                                    }}
                                    className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-2 py-2 text-sm font-bold focus:border-amber-500 outline-none transition-all">
                                    {HOURS.map(h => <option key={h}>{h}</option>)}
                                  </select>
                                  <select value={editState.downtime_end.split(':')[1] || '00'}
                                    onChange={e => {
                                      const hrs = editState.downtime_end.split(':')[0] || '00'
                                      setEditState({ ...editState, downtime_end: `${hrs}:${e.target.value}` })
                                    }}
                                    className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-2 py-2 text-sm font-bold focus:border-amber-500 outline-none transition-all">
                                    {MINUTES.map(m => <option key={m}>{m}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* PC Note */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Ghi chú Process Control</label>
                          <textarea
                            value={editState.pc_note}
                            onChange={e => setEditState({ ...editState, pc_note: e.target.value })}
                            rows={2}
                            placeholder="Nhập ghi chú xác nhận (nếu có)..."
                            className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-1)] focus:border-orange-500 outline-none transition-all resize-none"
                          />
                        </div>

                        {/* Save/Cancel buttons */}
                        <div className="flex gap-3 pt-1">
                          <button onClick={cancelEdit}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-all bg-[var(--bg-card)]">
                            <X size={14} /> Hủy
                          </button>
                          <button onClick={() => saveEdit(record.id)}
                            disabled={savingId === record.id}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
                            {savingId === record.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Lưu chỉnh sửa
                          </button>
                          <button onClick={() => { saveEdit(record.id).then(() => confirmReport(record.id)) }}
                            disabled={savingId === record.id || confirmingId === record.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.25)' }}>
                            {(savingId === record.id || confirmingId === record.id) ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            Lưu & Xác nhận gửi báo cáo đổ
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Confirm Button (when not editing) */}
                {!isConfirmed && !isEditing && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => confirmReport(record.id)}
                      disabled={confirmingId === record.id}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.2)' }}
                    >
                      {confirmingId === record.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      Xác nhận gửi báo cáo đổ
                    </button>
                  </div>
                )}

                {/* Confirmed info */}
                {isConfirmed && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium"
                      style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', color: '#059669' }}>
                      <CheckCircle2 size={13} />
                      <span>Đã xác nhận lúc {record.pc_confirmed_at ? new Date(record.pc_confirmed_at).toLocaleString('vi-VN') : '—'}</span>
                      {record.pc_note && <span className="ml-auto text-[var(--text-3)] truncate max-w-[200px]">📝 {record.pc_note}</span>}
                    </div>
                  </div>
                )}

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && !isEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-[var(--border)]"
                    >
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div className="bg-[var(--bg-page)] rounded-xl p-3">
                          <div className="text-[var(--text-3)] mb-1">Dòng sản phẩm</div>
                          <div className="font-bold text-[var(--text-1)]">{(record.production_plan as any)?.ten_san_pham || '—'}</div>
                        </div>
                        <div className="bg-[var(--bg-page)] rounded-xl p-3">
                          <div className="text-[var(--text-3)] mb-1">Loại lỗi NG</div>
                          <div className="font-bold text-[var(--text-1)]">{record.error_type || '—'}</div>
                        </div>
                        <div className="bg-[var(--bg-page)] rounded-xl p-3">
                          <div className="text-[var(--text-3)] mb-1">Chất rửa (kg)</div>
                          <div className="font-bold text-[var(--text-1)]">{record.cleaning_agent_kg ?? '—'}</div>
                        </div>
                        <div className="bg-[var(--bg-page)] rounded-xl p-3">
                          <div className="text-[var(--text-3)] mb-1">Rác (kg)</div>
                          <div className="font-bold text-[var(--text-1)]">{record.waste_kg ?? '—'}</div>
                        </div>
                        <div className="col-span-2 sm:col-span-4 bg-[var(--bg-page)] rounded-xl p-3">
                          <div className="text-[var(--text-3)] mb-1">Ghi chú</div>
                          <div className="font-medium text-[var(--text-1)]">{record.note || '—'}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
