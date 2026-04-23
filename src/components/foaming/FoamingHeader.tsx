'use client'

import { useState } from 'react'
import { Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ProductionPlan } from '@/types'

interface FoamingHeaderProps {
  onPlanFound: (plan: ProductionPlan | null) => void
}

export default function FoamingHeader({ onPlanFound }: FoamingHeaderProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundPlan, setFoundPlan] = useState<ProductionPlan | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setLoading(true)
    setError(null)
    setFoundPlan(null)
    onPlanFound(null)

    try {
      const { data, error: sbError } = await supabase
        .from('production_plan')
        .select('*')
        .ilike('firm_plan', `%${searchTerm.trim()}%`)
        .limit(1)
        .single()

      if (sbError) {
        if (sbError.code === 'PGRST116') {
          setError('Không tìm thấy mã đơn hàng này trong kế hoạch!')
        } else {
          throw sbError
        }
      } else {
        setFoundPlan(data)
        onPlanFound(data)
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

      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nhập mã FPRO hoặc RPRO..."
          className="w-full bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl py-3.5 pl-12 pr-4 
            text-[var(--text-1)] placeholder-[var(--text-3)] text-base font-medium
            focus:border-brand-500 focus:ring-0 transition-all duration-300
            group-hover:border-[var(--text-3)] outline-none"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)] group-focus-within:text-brand-500 transition-colors" size={20} />
        
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1.5 bottom-1.5 px-6 bg-brand-500 hover:bg-brand-600 text-white rounded-lg 
            font-bold text-sm shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
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
                <div className="flex flex-wrap gap-4 mt-3">
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Bun Code</p>
                    <p className="text-sm font-mono font-bold text-brand-500">{foundPlan.bun_code || '---'}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">PU Code</p>
                    <p className="text-sm font-mono font-bold text-brand-500">{foundPlan.pu_code || '---'}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-black/5">
                    <p className="text-[10px] text-[var(--text-3)] font-bold uppercase">Kế hoạch Đổ</p>
                    <p className="text-sm font-bold text-brand-500">{foundPlan.sl_bun_can_do || 0} Bun</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
