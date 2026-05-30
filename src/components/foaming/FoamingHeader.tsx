'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, CheckCircle2, AlertCircle, QrCode } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan } from '@/types'
import { calculateOptimalSheetsPerBun } from '@/lib/calculations'
import QRScannerModal from './QRScannerModal'

interface FoamingHeaderProps {
  onPlanFound: (plan: ProductionPlan | null) => void
}

export default function FoamingHeader({ onPlanFound }: FoamingHeaderProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundPlan, setFoundPlan] = useState<ProductionPlan | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [totalPoured, setTotalPoured] = useState(0)
  const [totalNG, setTotalNG] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Tự động điều chỉnh chiều cao của textarea khi người dùng gõ
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [searchTerm])

  const handleSearch = async (term?: string) => {
    const searchVal = (term || searchTerm).trim()
    if (!searchVal) return

    setLoading(true)
    setError(null)
    setFoundPlan(null)
    onPlanFound(null)

    try {
      const codes = searchVal.split('|').map(x => x.trim()).filter(Boolean)
      if (codes.length === 0) {
        setLoading(false)
        return
      }

      // Xây dựng điều kiện OR để truy vấn tất cả mã đơn khớp
      const conditions = codes.flatMap(code => [
        `firm_plan.ilike.%${code}%`,
        `no_order.ilike.%${code}%`
      ]).join(',')

      const { data: rawPlans, error: sbError } = await supabase
        .from('production_plan')
        .select('*')
        .or(conditions)

      if (sbError || !rawPlans || rawPlans.length === 0) {
        setError('Không tìm thấy mã đơn hàng này trong kế hoạch!')
        setLoading(false)
        return
      }

      // Lọc kế hoạch: Ưu tiên khớp chính xác cho từng mã tìm kiếm
      let plans: typeof rawPlans = []
      const plansMap = new Map<string, typeof rawPlans[0]>()
      for (const code of codes) {
        const lowerCode = code.toLowerCase()
        const matchingPlans = rawPlans.filter(p => 
          (p.firm_plan && p.firm_plan.toLowerCase().includes(lowerCode)) ||
          (p.no_order && p.no_order.toLowerCase().includes(lowerCode))
        )
        const exactMatch = matchingPlans.filter(p => 
          (p.firm_plan && p.firm_plan.toLowerCase() === lowerCode) ||
          (p.no_order && p.no_order.toLowerCase() === lowerCode)
        )
        const selectedForCode = exactMatch.length > 0 ? exactMatch : matchingPlans
        for (const p of selectedForCode) {
          plansMap.set(p.id, p)
        }
      }
      plans = Array.from(plansMap.values())

      if (plans.length === 0) {
        setError('Không tìm thấy mã đơn hàng này trong kế hoạch!')
        setLoading(false)
        return
      }

      // Hợp nhất các đơn hàng tìm thấy thành 1 kế hoạch ảo
      const combinedFirmPlan = Array.from(new Set(plans.map(p => p.firm_plan).filter(Boolean))).join('|')
      const combinedNoOrder = Array.from(new Set(plans.map(p => p.no_order).filter(Boolean))).join(' | ')
      const combinedBunCode = Array.from(new Set(plans.map(p => p.bun_code).filter(Boolean))).join(' | ')
      const combinedPuCode = Array.from(new Set(plans.map(p => p.pu_code).filter(Boolean))).join(' | ')
      
      const productNames = Array.from(new Set(plans.map(p => p.ten_san_pham).filter(Boolean)))
      const combinedProductName = productNames.join(' | ')

      const totalSheets = plans.reduce((sum, p) => sum + (p.sl_sheet || 0), 0)
      const totalBunCanDo = plans.reduce((sum, p) => sum + (p.sl_bun_can_do || 0), 0)
      const totalBunCanTach = plans.reduce((sum, p) => sum + (p.sl_bun_can_tach || 0), 0)

      const compDates = Array.from(new Set(plans.map(p => p.completion_date).filter(Boolean))).sort()
      const delDates = Array.from(new Set(plans.map(p => p.delivery_date).filter(Boolean))).sort()
      const combinedCompDate = compDates.length > 0 ? compDates.join(' | ') : null
      const combinedDelDate = delDates.length > 0 ? delDates.join(' | ') : null

      const consolidatedPlan: ProductionPlan = {
        id: plans[0].id,
        firm_plan: combinedFirmPlan,
        no_order: combinedNoOrder,
        bun_code: combinedBunCode,
        pu_code: combinedPuCode,
        ten_san_pham: combinedProductName,
        sl_sheet: totalSheets,
        sl_bun_can_do: totalBunCanDo,
        sl_bun_can_tach: totalBunCanTach,
        completion_date: combinedCompDate as any,
        delivery_date: combinedDelDate as any,
        week_label: Array.from(new Set(plans.map(p => p.week_label).filter(Boolean))).join(' | '),
        synced_at: new Date().toISOString()
      }

      setFoundPlan(consolidatedPlan)
      onPlanFound(consolidatedPlan)

      // Xây dựng điều kiện OR để truy xuất báo cáo của tất cả mã đơn thuộc nhóm này
      const reportConditions = plans.map(p => `firm_plan.ilike.%${p.firm_plan}%`).join(',')

      const { data: pourData, error: pourError } = await supabase
        .from('foaming_pour_reports')
        .select('actual_bun_poured, ng_bun_qty')
        .or(reportConditions)

      if (!pourError && pourData) {
        const total = pourData.reduce((sum, row) => sum + (row.actual_bun_poured || 0), 0)
        const ngPour = pourData.reduce((sum, row) => sum + (row.ng_bun_qty || 0), 0)
        setTotalPoured(total)
        
        // Fetch NG từ Tách, Kho và Bảng tiêu chuẩn
        const [{ data: sepData }, { data: whData }, { data: standards }] = await Promise.all([
          supabase.from('foaming_separate_reports').select('ng_qty').or(reportConditions),
          supabase.from('foaming_warehouse_reports').select('ng_bun_qty').or(reportConditions),
          supabase.from('thickness_standards').select('*')
        ])

        const ngSepSheets = sepData?.reduce((sum, row) => sum + (row.ng_qty || 0), 0) || 0
        const ngWh = whData?.reduce((sum, row) => sum + (row.ng_bun_qty || 0), 0) || 0
        
        // Xác định độ dày từ tên sản phẩm đầu tiên (cùng loại sản phẩm)
        const match = plans[0].ten_san_pham?.match(/([0-9.]+)\s*mm/i)
        const thickness = match ? parseFloat(match[1]) : null
        
        // Tìm số sheet tối ưu
        const standard = standards?.find(s => s.thickness_mm === thickness)
        const optimalSheets = standard 
          ? standard.optimal_sheets_per_bun 
          : (thickness ? calculateOptimalSheetsPerBun(thickness) : 1)

        // Công thức mới: NG Đổ (bun) + NG Kho (bun) + ceil(NG Tách (tấm) / Số sheet tối ưu)
        const ngSepEquivalentBuns = Math.ceil(ngSepSheets / (optimalSheets || 1))
        
        setTotalNG(ngPour + ngWh + ngSepEquivalentBuns)
      }
    } catch (err: any) {
      setError('Lỗi khi truy xuất dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] shadow-sm mb-6">
      <h3 className="text-lg font-bold text-[var(--text-1)] mb-4 flex items-center gap-2">
        <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
        Truy xuất Kế hoạch Sản xuất
      </h3>

      <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="flex flex-col sm:block sm:relative group gap-3">
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            rows={1}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder="Nhập mã FPRO, RPRO hoặc NO.ORDER..."
            className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl py-3.5 pl-20 pr-4 sm:pr-36 
              text-[var(--text-1)] placeholder-[var(--text-3)] text-base font-medium
              focus:border-brand-500 focus:ring-0 transition-all duration-300
              group-hover:border-[var(--text-3)] outline-none resize-none min-h-[54px] max-h-[150px] overflow-y-auto block"
            style={{ height: 'auto' }}
          />
          <div className="absolute left-4 top-[16px] flex items-center gap-2">
            <Search className="text-[var(--text-3)] group-focus-within:text-brand-500 transition-colors" size={20} />
            <div className="w-[1px] h-4 bg-[var(--border)] mx-0.5" />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="text-brand-500 hover:text-brand-600 transition-colors active:scale-90"
              title="Quét mã QR"
            >
              <QrCode size={20} />
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto py-3.5 sm:py-0 sm:absolute sm:right-2 sm:top-1.5 sm:bottom-1.5 px-6 bg-brand-500 hover:bg-brand-600 text-white rounded-xl 
            font-bold text-sm shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'TÌM KIẾM'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {foundPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-green-600 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Đã tìm thấy kế hoạch
                </p>
                <h4 className="text-[var(--text-1)] font-bold text-base leading-tight">
                  {foundPlan.ten_san_pham}
                </h4>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5 min-w-[90px]">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Bun Code</p>
                    <p className="text-sm font-mono font-bold text-brand-500">{foundPlan.bun_code || '---'}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5 min-w-[90px]">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">PU Code</p>
                    <p className="text-sm font-mono font-bold text-brand-500">{foundPlan.pu_code || '---'}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5 min-w-[90px]">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Kế hoạch Đổ</p>
                    <p className="text-sm font-bold text-brand-500">{foundPlan.sl_bun_can_do || 0} Bun</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5 min-w-[90px]">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">SL Sheet</p>
                    <p className="text-sm font-bold text-blue-600">{foundPlan.sl_sheet || 0} Sheet</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5 min-w-[90px]">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Kế hoạch Tách</p>
                    <p className="text-sm font-bold text-purple-600">{foundPlan.sl_bun_can_tach || 0} Bun</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 min-w-[90px]">
                    <p className="text-[10px] text-orange-600 font-bold uppercase">Độ dày</p>
                    <p className="text-sm font-bold text-orange-600">
                      {(() => {
                        if (!foundPlan.ten_san_pham) return '---';
                        const matches = foundPlan.ten_san_pham.match(/([0-9.]+)\s*mm/gi);
                        if (!matches || matches.length === 0) return '---';
                        const thicknesses = Array.from(new Set(matches.map(m => {
                          const num = m.match(/[0-9.]+/);
                          return num ? parseFloat(num[0]) : null;
                        }).filter((x): x is number => x !== null)));
                        return thicknesses.join(' | ');
                      })()} mm
                    </p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 min-w-[120px]">
                    <p className="text-[10px] text-red-600 font-bold uppercase">Cần đổ thêm</p>
                    <p className="text-sm font-bold text-red-600">
                      {(foundPlan.sl_bun_can_do || 0) - totalPoured} Bun
                      <span className="text-[10px] font-medium ml-1 opacity-70">(Đã đổ {totalPoured})</span>
                    </p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 min-w-[100px]">
                    <p className="text-[10px] text-rose-600 font-bold uppercase underline">Số bun cần bù</p>
                    <p className="text-sm font-bold text-rose-600">
                      {totalNG} Bun
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[var(--border)] border-dashed">
                  <div>
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">NO.ORDER</p>
                    <p className="text-xs font-bold text-[var(--text-1)]">{foundPlan.no_order || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Tuần SX</p>
                    <p className="text-xs font-bold text-[var(--text-1)]">{foundPlan.week_label || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ngày HT dự kiến</p>
                    <p className="text-xs font-bold text-[var(--text-1)]">{foundPlan.completion_date || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Ngày giao ETD</p>
                    <p className="text-xs font-bold text-[var(--text-1)]">{foundPlan.delivery_date || '---'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(decodedText) => {
          setSearchTerm(decodedText)
          handleSearch(decodedText)
        }}
      />
    </div>
  )
}
