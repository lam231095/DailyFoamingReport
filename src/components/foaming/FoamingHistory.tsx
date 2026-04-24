'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Calendar, Clock, User, 
  ChevronDown, FileText, Download, Loader2,
  AlertCircle, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser } from '@/types'

interface FoamingHistoryProps {
  user: SessionUser
}

type StageType = 'pour' | 'separate' | 'warehouse'

const STAGE_CONFIG = {
  pour: { table: 'foaming_pour_reports', label: 'Công đoạn Đổ' },
  separate: { table: 'foaming_separate_reports', label: 'Công đoạn Tách' },
  warehouse: { table: 'foaming_warehouse_reports', label: 'Nhập kho' },
}

export default function FoamingHistory({ user }: FoamingHistoryProps) {
  const [activeStage, setActiveStage] = useState<StageType>('pour')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [standards, setStandards] = useState<any[]>([])

  // Filters
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    shift: 'Tất cả',
    firmPlan: '',
    puCode: '',
    msnv: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // 1. Tải bảng tiêu chuẩn độ dày
  useEffect(() => {
    async function fetchStandards() {
      const { data } = await supabase.from('thickness_standards').select('*')
      setStandards(data || [])
    }
    fetchStandards()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const config = STAGE_CONFIG[activeStage]
      
      // Khởi tạo query
      let query = supabase
        .from(config.table)
        .select(`
          *,
          production_plan!inner (
            pu_code,
            ten_san_pham,
            bun_code
          ),
          users!inner (
            full_name,
            msnv
          )
        `)

      // Áp dụng bộ lọc thời gian
      if (activeStage === 'warehouse') {
        query = query.gte('delivery_date', filters.startDate).lte('delivery_date', filters.endDate)
      } else {
        query = query.gte('created_at', `${filters.startDate}T00:00:00Z`).lte('created_at', `${filters.endDate}T23:59:59Z`)
      }

      // Lọc theo Ca (không áp dụng cho Nhập kho)
      if (activeStage !== 'warehouse' && filters.shift !== 'Tất cả') {
        query = query.eq('shift', filters.shift)
      }

      // Lọc theo Firm Plan
      if (filters.firmPlan.trim()) {
        query = query.ilike('firm_plan', `%${filters.firmPlan.trim()}%`)
      }

      // Lọc theo PU Code (Join Production Plan)
      if (filters.puCode.trim()) {
        query = query.ilike('production_plan.pu_code', `%${filters.puCode.trim()}%`)
      }

      // Lọc theo MSNV (Join Users)
      if (filters.msnv.trim()) {
        query = query.ilike('users.msnv', `%${filters.msnv.trim()}%`)
      }

      const { data: result, error: sbError } = await query.order('created_at', { ascending: false })

      if (sbError) throw sbError
      setData(result || [])
    } catch (err: any) {
      setError('Lỗi khi truy xuất dữ liệu: ' + err.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeStage, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const exportCSV = () => {
    if (data.length === 0) return
    
    // Header dựa trên stage
    const headers = ["Ngày/Giờ", "Ngày Báo Cáo", "Firm Plan", "PU Code", "Sản phẩm", "Người nhập", "MSNV"]
    if (activeStage === 'pour') headers.push("Ca", "Máy", "Operator", "SL Đổ (Bun)", "Lot No")
    if (activeStage === 'separate') headers.push("Ca", "SL Tách (Bun)", "SL Sheet Nhận", "Sheet Tối Ưu (Gợi ý)", "% Hiệu Suất", "Lot No", "NG", "Lỗi")
    if (activeStage === 'warehouse') headers.push("SL Giao (Sheet)", "Ngày Giao")

    const csvContentRaw = headers.join(",") + "\r\n" + data.map(row => {
      const dateTime = new Date(row.created_at).toLocaleString('vi-VN')
      const dateOnly = row.delivery_date || new Date(row.created_at).toLocaleDateString('vi-VN')
      const common = [
        `"${dateTime}"`,
        `"${dateOnly}"`,
        row.firm_plan,
        `"${row.production_plan?.pu_code}"`,
        `"${row.production_plan?.ten_san_pham}"`,
        `"${row.users?.full_name}"`,
        row.users?.msnv
      ]
      
      let specific: any[] = []
      if (activeStage === 'pour') specific = [row.shift, row.machine_id || '---', row.operator_name || '---', row.actual_bun_poured, row.lot_no]
      if (activeStage === 'separate') {
        const thickness = parseFloat(row.production_plan?.ten_san_pham?.match(/([0-9.]+)\s*mm/i)?.[1] || "0")
        const std = standards.find(s => s.thickness_mm === thickness)
        const suggested = std ? Math.round(row.actual_bun_separated * std.optimal_sheets_per_bun) : 0
        const perf = suggested > 0 ? Math.round((row.actual_sheet_received / suggested) * 100) : 0
        
        specific = [
          row.shift, 
          row.actual_bun_separated, 
          row.actual_sheet_received, 
          suggested, 
          `${perf}%`,
          row.lot_no, 
          row.ng_qty, 
          row.error_type
        ]
      }
      if (activeStage === 'warehouse') specific = [row.qty_delivered_sheet, row.delivery_date]
      
      return [...common, ...specific].join(",")
    }).join("\r\n")

    // Thêm BOM (Byte Order Mark) để Excel nhận diện đúng UTF-8 (Tiếng Việt)
    const blob = new Blob(["\uFEFF" + csvContentRaw], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `baocao_foaming_${activeStage}_${filters.startDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* --- Filter Header --- */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Filter size={18} />
            </div>
            <h3 className="font-bold text-[var(--text-1)]">Bộ lọc báo cáo</h3>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs font-bold text-brand-500 flex items-center gap-1 hover:underline"
          >
            {showFilters ? 'Thu gọn' : 'Mở rộng bộ lọc'}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Hàng 1: Khoảng thời gian (Chiếm trọn hàng) */}
          <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 space-y-3">
            <label className="text-[10px] font-bold text-orange-600 uppercase ml-1 flex items-center gap-1">
              <Calendar size={12} /> Khoảng thời gian báo cáo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full space-y-1">
                <p className="text-[9px] text-[var(--text-3)] font-bold ml-1">TỪ NGÀY</p>
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono"
                />
              </div>
              <div className="hidden sm:flex items-center justify-center pt-5">
                <ArrowRight size={20} className="text-orange-300" />
              </div>
              <div className="flex-1 w-full space-y-1">
                <p className="text-[9px] text-[var(--text-3)] font-bold ml-1">ĐẾN NGÀY</p>
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-orange-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Hàng 2: Mã đơn hàng & Công đoạn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1 flex items-center gap-1">
                <Search size={12} /> Tra cứu Mã Firm Plan / FPRO
              </label>
              <input 
                type="text" 
                placeholder="Nhập mã FPRO (VD: FPRO-260...)"
                value={filters.firmPlan}
                onChange={(e) => setFilters({...filters, firmPlan: e.target.value})}
                className="w-full bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 font-mono transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1 flex items-center gap-1">
                <Clock size={12} /> Chọn công đoạn sản xuất
              </label>
              <div className="flex gap-1 bg-[var(--bg-input)] p-1 rounded-xl border-2 border-[var(--border)]">
                {(Object.keys(STAGE_CONFIG) as StageType[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveStage(s)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      activeStage === s 
                        ? 'bg-brand-500 text-white shadow-md' 
                        : 'text-[var(--text-3)] hover:bg-white/50 dark:hover:bg-black/20'
                    }`}
                  >
                    {s === 'pour' ? 'ĐỔ' : s === 'separate' ? 'TÁCH' : 'KHO'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 mt-4 border-t border-[var(--border)]">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1">Loại PU Code</label>
                  <input 
                    type="text" 
                    placeholder="VD: PVN-00..."
                    value={filters.puCode}
                    onChange={(e) => setFilters({...filters, puCode: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1 flex items-center gap-1">
                    <User size={10} /> Mã nhân viên (MSNV)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Mã NV..."
                    value={filters.msnv}
                    onChange={(e) => setFilters({...filters, msnv: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase ml-1">Ca làm việc</label>
                  <select 
                    value={filters.shift}
                    onChange={(e) => setFilters({...filters, shift: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-1)] outline-none focus:border-brand-500"
                  >
                    <option>Tất cả</option>
                    <option>Ca 1</option>
                    <option>Ca 2</option>
                    <option>Ca 3</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex gap-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            TRUY XUẤT DỮ LIỆU
          </button>
          <button 
            onClick={exportCSV}
            disabled={loading || data.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            title="Xuất CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">XUẤT FILE</span>
          </button>
        </div>
      </div>

      {/* --- Data List --- */}
      <div className="space-y-3 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-brand-500" size={40} />
            <p className="text-sm text-[var(--text-3)] font-medium">Đang truy xuất dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3 bg-red-500/5 rounded-3xl border border-red-500/10 text-red-600">
            <AlertCircle size={40} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3 bg-[var(--bg-card)]/40 rounded-3xl border-2 border-dashed border-[var(--border)] text-[var(--text-3)]">
            <FileText size={40} />
            <p className="text-sm font-medium">Không tìm thấy dữ liệu nào phù hợp</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                Tìm thấy {data.length} báo cáo
              </p>
            </div>
            
            {data.map((row) => (
              <motion.div 
                key={row.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)] shadow-sm hover:border-brand-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-bold uppercase">
                        {row.firm_plan}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--text-1)] font-mono">
                        {row.production_plan?.pu_code}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] font-medium">
                        • {row.shift || 'Warehouse'} {row.machine_id ? `• ${row.machine_id}` : ''}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-1)] leading-tight">
                      {row.production_plan?.ten_san_pham}
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-3 pt-3 border-t border-[var(--border)]">
                      {activeStage === 'pour' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">SL Đổ</p>
                            <p className="text-sm font-bold text-blue-600">{row.actual_bun_poured} Bun</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Máy Đổ</p>
                            <p className="text-sm font-bold text-orange-600">{row.machine_id || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Lot No</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{row.lot_no || '---'}</p>
                          </div>
                        </>
                      )}
                      
                      {activeStage === 'separate' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Tách / Nhận</p>
                            <p className="text-sm font-bold text-purple-600">{row.actual_bun_separated}B / {row.actual_sheet_received}S</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Hiệu suất (%)</p>
                            <p className={(() => {
                              const thickness = parseFloat(row.production_plan?.ten_san_pham?.match(/([0-9.]+)\s*mm/i)?.[1] || "0")
                              const std = standards.find(s => s.thickness_mm === thickness)
                              const suggested = std ? Math.round(row.actual_bun_separated * std.optimal_sheets_per_bun) : 0
                              const perf = suggested > 0 ? Math.round((row.actual_sheet_received / suggested) * 100) : 0
                              return `text-sm font-bold ${perf >= 95 ? 'text-green-600' : perf >= 85 ? 'text-orange-500' : 'text-red-500'}`
                            })()}>
                              {(() => {
                                const thickness = parseFloat(row.production_plan?.ten_san_pham?.match(/([0-9.]+)\s*mm/i)?.[1] || "0")
                                const std = standards.find(s => s.thickness_mm === thickness)
                                const suggested = std ? Math.round(row.actual_bun_separated * std.optimal_sheets_per_bun) : 0
                                const perf = suggested > 0 ? Math.round((row.actual_sheet_received / suggested) * 100) : 0
                                return std ? `${perf}% (${suggested} tấm tối ưu)` : 'N/A'
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Phế phẩm (NG)</p>
                            <p className={`text-sm font-bold ${row.ng_qty > 0 ? 'text-red-500' : 'text-[var(--text-1)]'}`}>
                              {row.ng_qty} {row.error_type ? `(${row.error_type})` : ''}
                            </p>
                          </div>
                        </>
                      )}

                      {activeStage === 'warehouse' && (
                        <>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">SL Giao</p>
                            <p className="text-sm font-bold text-green-600">{row.qty_delivered_sheet} Sheet</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ngày Giao</p>
                            <p className="text-sm font-bold text-[var(--text-1)]">{new Date(row.delivery_date).toLocaleDateString()}</p>
                          </div>
                        </>
                      )}

                      <div>
                        <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Người báo cáo / Operator</p>
                        <p className="text-xs font-bold text-[var(--text-2)]">{row.users?.full_name} / {row.operator_name || '---'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-[var(--text-3)] uppercase">
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)]">
                      {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function RefreshCw({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}
