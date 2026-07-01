'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Cpu, Factory, Save, Calendar, Info, 
  RefreshCw, CheckCircle2, Sliders, ChevronDown, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser } from '@/types'
import { getReportDateISO } from '@/lib/dateUtils'
import SuccessModal from '@/components/ui/SuccessModal'

interface MachineInputTabProps {
  user: SessionUser
}

const MANAGERS = ['Lâm', 'Thảo', 'Tuấn Anh'] as const
type ManagerName = typeof MANAGERS[number]

interface ManagerDeclaration {
  pourActiveQty: number
  separateAutoQty: number
  separateSemiAutoQty: number
  separateMechanicalQty: number
}

const DEFAULT_DECLARATION: ManagerDeclaration = {
  pourActiveQty: 0,
  separateAutoQty: 0,
  separateSemiAutoQty: 0,
  separateMechanicalQty: 0,
}

// Target values defined by the user
const TARGETS = {
  pour: 107,          // 107 bun/ca/máy
  separateAuto: 50,    // 50 bun/ca/máy tự động
  separateSemiAuto: 100, // 100 bun/ca/máy bán tự động
  separateMechanical: 50, // 50 bun/ca/máy cơ
}

const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca HC']

export default function MachineInputTab({ user }: MachineInputTabProps) {
  const isAuthorized = ['02075', '02603', '04820', '04127'].includes(user.msnv || '')

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)' }}>
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
          Không có quyền truy cập
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Chức năng này chỉ dành cho quản lý được cấp quyền.
        </p>
      </div>
    )
  }

  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Declare state for all managers
  const [managerData, setManagerData] = useState<Record<ManagerName, ManagerDeclaration>>({
    'Lâm': { ...DEFAULT_DECLARATION },
    'Thảo': { ...DEFAULT_DECLARATION },
    'Tuấn Anh': { ...DEFAULT_DECLARATION },
  })

  // Auto-detect initial date on mount
  useEffect(() => {
    const todayISO = getReportDateISO(new Date())
    setSelectedDate(todayISO)
  }, [])

  // Fetch machine configurations for the selected date
  const fetchDeclarations = useCallback(async (date: string) => {
    if (!date) return
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await supabase
        .from('foaming_machine_declarations')
        .select('*')
        .eq('declaration_date', date)

      const newManagerData = {
        'Lâm': { ...DEFAULT_DECLARATION },
        'Thảo': { ...DEFAULT_DECLARATION },
        'Tuấn Anh': { ...DEFAULT_DECLARATION },
      }

      if (error) throw error

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          const mName = row.manager_name as ManagerName
          if (MANAGERS.includes(mName)) {
            newManagerData[mName] = {
              pourActiveQty: row.pour_active_qty ?? 0,
              separateAutoQty: row.separate_auto_qty ?? 0,
              separateSemiAutoQty: row.separate_semi_auto_qty ?? 0,
              separateMechanicalQty: row.separate_mechanical_qty ?? 0,
            }
          }
        })
      }

      setManagerData(newManagerData)
    } catch (err) {
      console.error('Error fetching machine declarations:', err)
      setMessage({ type: 'error', text: 'Không thể tải cấu hình máy móc.' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Trigger fetch when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchDeclarations(selectedDate)
    }
  }, [selectedDate, fetchDeclarations])

  // Handle single input changes
  const handleInputChange = (
    manager: ManagerName,
    field: keyof ManagerDeclaration,
    value: string
  ) => {
    const numericVal = Math.max(0, parseInt(value, 10) || 0)
    setManagerData((prev) => ({
      ...prev,
      [manager]: {
        ...prev[manager],
        [field]: numericVal,
      },
    }))
  }

  // Calculate targets for visual preview
  const getManagerTargets = (data: ManagerDeclaration) => {
    const pourTarget = data.pourActiveQty * TARGETS.pour
    const separateTarget =
      data.separateAutoQty * TARGETS.separateAuto +
      data.separateSemiAutoQty * TARGETS.separateSemiAuto +
      data.separateMechanicalQty * TARGETS.separateMechanical
    return { pourTarget, separateTarget }
  }

  // Check permission for a manager
  const hasPermissionForManager = useCallback((manager: ManagerName): boolean => {
    if (user.msnv === '04127') return true
    if (manager === 'Lâm' && user.msnv === '02075') return true
    if (manager === 'Thảo' && user.msnv === '02603') return true
    if (manager === 'Tuấn Anh' && user.msnv === '04820') return true
    return false
  }, [user.msnv])

  const hasAnyPermission = MANAGERS.some(hasPermissionForManager)

  // Handle saving configurations to Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !hasAnyPermission) return
    setSaving(true)
    setMessage(null)

    try {
      // Only upsert data for managers that the current user has permission to edit
      const permittedManagers = MANAGERS.filter(hasPermissionForManager)
      if (permittedManagers.length === 0) throw new Error('Không có quyền lưu.')

      const payload = permittedManagers.map((manager) => {
        const data = managerData[manager]
        return {
          declaration_date: selectedDate,
          manager_name: manager,
          pour_active_qty: data.pourActiveQty,
          separate_auto_qty: data.separateAutoQty,
          separate_semi_auto_qty: data.separateSemiAutoQty,
          separate_mechanical_qty: data.separateMechanicalQty,
          updated_at: new Date().toISOString(),
        }
      })

      const { error } = await supabase
        .from('foaming_machine_declarations')
        .upsert(payload, { onConflict: 'declaration_date,manager_name' })

      if (error) throw error

      setShowSuccess(true)
      setMessage({ type: 'success', text: 'Cập nhật cấu hình máy móc thành công!' })
    } catch (err) {
      console.error('Error saving declarations:', err)
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cấu hình máy móc.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SuccessModal
        isOpen={showSuccess}
        message="Đã lưu khai báo máy móc thành công!"
        onClose={() => setShowSuccess(false)}
      />

      <div className="space-y-6">
        {/* Date & Shift Select Card */}
        <div className="card p-5 bg-[var(--bg-card)] border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[var(--text-1)]">Khai Báo Máy Móc Hoạt Động</h2>
                <p className="text-xs text-[var(--text-3)]">Thiết lập số lượng máy móc đầu vào để tính target tự động</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Input */}
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" size={14} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2.5 
                    text-xs font-bold text-[var(--text-1)] outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Message Indicator */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <p className="font-semibold">{message.text}</p>
          </div>
        )}

        {/* Form area */}
        <form onSubmit={handleSave} className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-[var(--bg-card)] rounded-3xl border border-[var(--border)]">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-3)] font-medium">Đang tải cấu hình máy móc...</p>
            </div>
          ) : (
            <>
              {/* Managers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MANAGERS.map((manager) => {
                  const data = managerData[manager]
                  const { pourTarget, separateTarget } = getManagerTargets(data)
                  
                  // Color codes matching manager visual themes
                  const colorTheme = 
                    manager === 'Lâm' ? { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/15', fill: '#3b82f6' } :
                    manager === 'Thảo' ? { text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/15', fill: '#a855f7' } :
                    { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', fill: '#10b981' }

                  const hasPerm = hasPermissionForManager(manager)

                  return (
                    <div
                      key={manager}
                      className={`card overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                        !hasPerm ? 'opacity-85' : ''
                      }`}
                      style={{ borderTop: `4px solid ${colorTheme.fill}` }}
                    >
                      <div className="p-5 space-y-6">
                        {/* Manager Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                          <span className="text-sm font-black uppercase text-[var(--text-1)]">Quản lý {manager}</span>
                          {hasPerm ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                              Có quyền nhập
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500">
                              Chỉ xem
                            </span>
                          )}
                        </div>

                        {/* Pouring Area (Đổ) */}
                        <div className="space-y-3 bg-[var(--bg-page)]/40 p-4 rounded-2xl border border-[var(--border)]/60">
                          <div className="flex items-center gap-2 text-indigo-500 mb-1">
                            <Factory size={16} />
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-2)]">Khu Vực Đổ</h4>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Số máy đổ hoạt động</label>
                            <input
                              type="number"
                              min="0"
                              value={data.pourActiveQty || ''}
                              placeholder="0"
                              disabled={!hasPerm}
                              onChange={(e) => handleInputChange(manager, 'pourActiveQty', e.target.value)}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2
                                text-sm text-[var(--text-1)] font-bold focus:border-indigo-500 outline-none transition-all font-mono
                                disabled:opacity-60 disabled:bg-[var(--bg-input)] disabled:cursor-not-allowed"
                            />
                          </div>

                          <div className="flex justify-between items-center pt-2 text-[10px] font-semibold text-[var(--text-3)] border-t border-[var(--border)]/50">
                            <span>Mục tiêu Đổ (107/máy):</span>
                            <span className="font-black text-indigo-600 text-xs font-mono">{pourTarget} bun</span>
                          </div>
                        </div>

                        {/* Splitting Area (Tách) */}
                        <div className="space-y-3 bg-[var(--bg-page)]/40 p-4 rounded-2xl border border-[var(--border)]/60">
                          <div className="flex items-center gap-2 text-purple-500 mb-1">
                            <Cpu size={16} />
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-2)]">Khu Vực Tách</h4>
                          </div>

                          {/* Auto splitter */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Máy tách tự động</label>
                              <span className="text-[9px] text-[var(--text-3)] font-mono">Target: 50/máy</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={data.separateAutoQty || ''}
                              placeholder="0"
                              disabled={!hasPerm}
                              onChange={(e) => handleInputChange(manager, 'separateAutoQty', e.target.value)}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2
                                text-sm text-[var(--text-1)] font-bold focus:border-indigo-500 outline-none transition-all font-mono
                                disabled:opacity-60 disabled:bg-[var(--bg-input)] disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Semi auto splitter */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Máy bán tự động</label>
                              <span className="text-[9px] text-[var(--text-3)] font-mono">Target: 100/máy</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={data.separateSemiAutoQty || ''}
                              placeholder="0"
                              disabled={!hasPerm}
                              onChange={(e) => handleInputChange(manager, 'separateSemiAutoQty', e.target.value)}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2
                                text-sm text-[var(--text-1)] font-bold focus:border-indigo-500 outline-none transition-all font-mono
                                disabled:opacity-60 disabled:bg-[var(--bg-input)] disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Mechanical splitter */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase">Máy tách cơ</label>
                              <span className="text-[9px] text-[var(--text-3)] font-mono">Target: 50/máy</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={data.separateMechanicalQty || ''}
                              placeholder="0"
                              disabled={!hasPerm}
                              onChange={(e) => handleInputChange(manager, 'separateMechanicalQty', e.target.value)}
                              className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-3 py-2
                                text-sm text-[var(--text-1)] font-bold focus:border-indigo-500 outline-none transition-all font-mono
                                disabled:opacity-60 disabled:bg-[var(--bg-input)] disabled:cursor-not-allowed"
                            />
                          </div>

                          <div className="flex justify-between items-center pt-2 text-[10px] font-semibold text-[var(--text-3)] border-t border-[var(--border)]/50">
                            <span>Mục tiêu Tách:</span>
                            <span className="font-black text-purple-600 text-xs font-mono">{separateTarget} bun</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Summary Footer */}
                      <div className="bg-[var(--bg-page)]/70 px-5 py-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--text-2)]">
                        <span>Tổng máy hoạt động:</span>
                        <span className="font-extrabold text-[var(--text-1)] font-mono">
                          {data.pourActiveQty + data.separateAutoQty + data.separateSemiAutoQty + data.separateMechanicalQty} máy
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
                <div className="flex items-start gap-2.5 max-w-md sm:max-w-xl text-[var(--text-2)]">
                  <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Sau khi lưu khai báo này, các biểu đồ và báo cáo hiệu suất (Daily Report) của ngày <strong>{selectedDate.split('-').reverse().join('/')}</strong> sẽ tự động cập nhật mục tiêu (Target) tương ứng.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving || !hasAnyPermission}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider
                    px-6 py-3.5 rounded-xl shadow-md transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Lưu Khai Báo</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  )
}
