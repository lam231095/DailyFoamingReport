'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, History, Package, ChevronRight, 
  Trash2, AlertCircle, CheckCircle2, Loader2,
  Layers, Filter, ArrowDownToLine, User, Download, Search, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionUser, ResidualMaterial, ResidualMaterialUsage } from '@/types'
import { canDownloadReport } from '@/lib/permissions'

const DEFAULT_COLORS = [
  '(ROCKPORT)', '300C', 'AIR BLUE', 'AMAZON', 'BILLIARD', 'BLACK', 'BLUE ATOLL', 
  'BROWN SUGAR', 'BURNT SIENNA', 'CASTLEROCK', 'COLORO', 'FAIRWAY', 'FOSSIL', 
  'GLACIER GRAY', 'GREEN', 'GREY', 'LIME GREEN', 'MINT GREEN', 'NEUTRAL GRAY', 
  'NINE IRON', 'RED', 'SEEDPEARL', 'TAWNY PORT', 'TRUE BLUE', 'YELLOW'
]

const DEFAULT_DENSITIES = [
  '0.085D', '0.095D', '0.11D', '0.12D', '0.13D', '0.145D', '0.15D', '0.16D', 
  '0.185D', '0.19D', '0.22D', '015D'
]

const DEFAULT_HARDNESS = [
  '15C', '20C', '21C', '25', '25C', '28C', '33C', '35C', '45C', '5-10C', 
  '51C', '70-80C', '72-78C', '78-90C', '78-90F'
]

const DEFAULT_POWDERS = [
  'CSD', 'CSD HB', 'CSDHB', 'NIKE', 'NIKE HB'
]

const DEFAULT_LENGTHS = [
  '1.47M', '1.70M', '1.7M', '2.00M', '2M'
]

const normalizeValue = (val: string | null | undefined): string => {
  if (!val) return ''
  return val
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/(\d+)\.0+M/g, '$1M')
    .replace(/(\d+\.[1-9]+)0+M/g, '$1M')
}

interface ResidualMaterialTabProps {
  user: SessionUser
}

type TabType = 'stock' | 'add' | 'use' | 'history'

export default function ResidualMaterialTab({ user }: ResidualMaterialTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stock')
  const [materials, setMaterials] = useState<ResidualMaterial[]>([])
  const [usageLogs, setUsageLogs] = useState<ResidualMaterialUsage[]>([])
  const [bunProperties, setBunProperties] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  
  // Filters
  const [useFilters, setUseFilters] = useState(false)
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    bun_code: '',
    material_name: '',
    color: '',
    density: '',
    hardness: '',
    powder: '',
    length: '',
    quantity: '',
    unit: 'bun' as const,
    machine_id: 'Máy 1',
    shift: 'Ca 1',
    manager_name: 'Linh',
    entry_date: new Date().toISOString().split('T')[0]
  })

  // Mode for finding Bun Code
  const [dontKnowBunCode, setDontKnowBunCode] = useState(false)
  
  // Search state for finding Bun Code
  const [searchColor, setSearchColor] = useState('')
  const [searchDensity, setSearchDensity] = useState('')
  const [searchHardness, setSearchHardness] = useState('')
  const [searchPowder, setSearchPowder] = useState('')
  const [searchLength, setSearchLength] = useState('')

  const [useData, setUseData] = useState({
    material_id: '',
    used_quantity: ''
  })

  // Fetch unique properties from loaded bun specifications
  const uniqueColors = useMemo(() => {
    const vals = bunProperties.map(b => b.mau).filter(Boolean)
    return Array.from(new Set([...vals, ...DEFAULT_COLORS])).sort()
  }, [bunProperties])

  const uniqueDensities = useMemo(() => {
    const vals = bunProperties.map(b => b.density).filter(Boolean)
    return Array.from(new Set([...vals, ...DEFAULT_DENSITIES])).sort()
  }, [bunProperties])

  const uniqueHardness = useMemo(() => {
    const vals = bunProperties.map(b => b.do_cung).filter(Boolean)
    return Array.from(new Set([...vals, ...DEFAULT_HARDNESS])).sort()
  }, [bunProperties])

  const uniquePowders = useMemo(() => {
    const vals = bunProperties.map(b => b.bot).filter(Boolean)
    return Array.from(new Set([...vals, ...DEFAULT_POWDERS])).sort()
  }, [bunProperties])

  const uniqueLengths = useMemo(() => {
    const vals = bunProperties.map(b => b.chieu_dai).filter(Boolean)
    return Array.from(new Set([...vals, ...DEFAULT_LENGTHS])).sort()
  }, [bunProperties])

  // Filter bun specifications based on selected details
  const filteredSpecBuns = useMemo(() => {
    if (!dontKnowBunCode) return []
    return bunProperties.filter(b => {
      return (!searchColor || normalizeValue(b.mau) === normalizeValue(searchColor)) &&
             (!searchDensity || normalizeValue(b.density) === normalizeValue(searchDensity)) &&
             (!searchHardness || normalizeValue(b.do_cung) === normalizeValue(searchHardness)) &&
             (!searchPowder || normalizeValue(b.bot) === normalizeValue(searchPowder)) &&
             (!searchLength || normalizeValue(b.chieu_dai) === normalizeValue(searchLength))
    })
  }, [dontKnowBunCode, bunProperties, searchColor, searchDensity, searchHardness, searchPowder, searchLength])

  // Handle unique spec match
  useEffect(() => {
    if (dontKnowBunCode && filteredSpecBuns.length === 1) {
      const matched = filteredSpecBuns[0]
      setFormData(prev => ({
        ...prev,
        bun_code: matched.bun_code || '',
        material_name: matched.material_name || '',
        color: matched.mau || '',
        density: matched.density || '',
        hardness: matched.do_cung || '',
        powder: matched.bot || '',
        length: matched.chieu_dai || ''
      }))
    }
  }, [filteredSpecBuns, dontKnowBunCode])

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Bun Properties Master List
      const { data: bpData } = await supabase
        .from('bun_properties')
        .select('*')
        .order('bun_code')
      setBunProperties(bpData || [])

      // 2. Fetch Residual Materials
      let mQuery = supabase
        .from('residual_materials')
        .select('*, users(msnv, full_name)')
      
      if (useFilters) {
        mQuery = mQuery.gte('entry_date', startDate).lte('entry_date', endDate)
      }

      // 3. Fetch Usage Logs
      let uQuery = supabase
        .from('residual_material_usage')
        .select('*, users(msnv, full_name), residual_materials(*)')

      if (useFilters) {
        uQuery = uQuery.gte('used_at', `${startDate}T00:00:00Z`).lte('used_at', `${endDate}T23:59:59Z`)
      }

      const [mRes, uRes] = await Promise.all([
        mQuery.order('created_at', { ascending: false }),
        uQuery.order('used_at', { ascending: false }).limit(60)
      ])

      if (mRes.data) {
        setMaterials(mRes.data as ResidualMaterial[])
      }
      if (uRes.data) {
        setUsageLogs(uRes.data as ResidualMaterialUsage[])
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu tồn dư:', err)
    } finally {
      setLoading(false)
    }
  }, [useFilters, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Autocomplete search matching for bun code input
  const bunCodeSuggestions = useMemo(() => {
    if (!formData.bun_code || dontKnowBunCode) return []
    const val = formData.bun_code.toUpperCase()
    return bunProperties.filter(b => 
      (b.bun_code && b.bun_code.toUpperCase().includes(val)) ||
      (b.ma_bun && b.ma_bun.includes(val))
    ).slice(0, 5)
  }, [formData.bun_code, bunProperties, dontKnowBunCode])

  const handleSelectSuggestion = (spec: any) => {
    setFormData(prev => ({
      ...prev,
      bun_code: spec.bun_code || '',
      material_name: spec.material_name || '',
      color: spec.mau || '',
      density: spec.density || '',
      hardness: spec.do_cung || '',
      powder: spec.bot || '',
      length: spec.chieu_dai || ''
    }))
  }

  // Handle direct bun code input changes
  const handleBunCodeChange = (val: string) => {
    setFormData(prev => ({ ...prev, bun_code: val }))
    // If it's a exact match, auto-fill characteristics
    const matched = bunProperties.find(b => b.bun_code?.toUpperCase() === val.trim().toUpperCase())
    if (matched) {
      setFormData(prev => ({
        ...prev,
        material_name: matched.material_name || '',
        color: matched.mau || '',
        density: matched.density || '',
        hardness: matched.do_cung || '',
        powder: matched.bot || '',
        length: matched.chieu_dai || ''
      }))
    }
  }

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bun_code.trim()) {
      setStatus({ type: 'error', msg: 'Vui lòng nhập hoặc chọn mã Bun!' })
      return
    }

    setSubmitting(true)
    setStatus(null)

    // Insert into residual_materials first and get the generated ID
    const { data: insertedMaterial, error } = await supabase
      .from('residual_materials')
      .insert({
        user_id: user.id,
        bun_code: formData.bun_code.toUpperCase().trim(),
        material_name: formData.material_name,
        color: formData.color,
        density: formData.density,
        hardness: formData.hardness,
        powder: formData.powder,
        length: formData.length,
        initial_quantity: Number(formData.quantity),
        current_quantity: Number(formData.quantity),
        unit: 'bun',
        machine_id: formData.machine_id,
        shift: formData.shift,
        manager_name: formData.manager_name,
        entry_date: formData.entry_date
      })
      .select('id')
      .single()

    if (error) {
      setStatus({ type: 'error', msg: 'Lỗi khi thêm liệu tồn: ' + error.message })
      setSubmitting(false)
      return
    }

    // Insert into foaming_pour_reports with the SAME ID and firm_plan = null
    const { error: pourError } = await supabase
      .from('foaming_pour_reports')
      .insert({
        id: insertedMaterial.id,
        recorder_id: user.id,
        firm_plan: null,
        shift: formData.shift,
        machine_id: formData.machine_id,
        operator_name: null,
        actual_bun_poured: Number(formData.quantity),
        report_date: formData.entry_date,
        ng_bun_qty: 0,
        error_type: null,
        manager_name: formData.manager_name,
        note: '[LIỆU TỒN DƯ]',
        is_compensation: false,
        bun_code: formData.bun_code.toUpperCase().trim(),
        color: formData.color,
        density: formData.density,
        hardness: formData.hardness,
        powder: formData.powder,
        length: formData.length,
        material_name: formData.material_name,
        is_pc_confirmed: true
      })

    if (pourError) {
      // If inserting into pour reports fails, clean up the residual materials table
      await supabase.from('residual_materials').delete().eq('id', insertedMaterial.id)
      setStatus({ type: 'error', msg: 'Lỗi khi gộp vào báo cáo đổ: ' + pourError.message })
    } else {
      setStatus({ type: 'success', msg: 'Đã thêm liệu tồn mới và gộp vào báo cáo đổ thành công!' })
      // Reset form
      setFormData({
        bun_code: '',
        material_name: '',
        color: '',
        density: '',
        hardness: '',
        powder: '',
        length: '',
        quantity: '',
        unit: 'bun',
        machine_id: 'Máy 1',
        shift: 'Ca 1',
        manager_name: 'Linh',
        entry_date: new Date().toISOString().split('T')[0]
      })
      setDontKnowBunCode(false)
      setSearchColor('')
      setSearchDensity('')
      setSearchHardness('')
      setSearchPowder('')
      setSearchLength('')
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

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa liệu tồn này? Thao tác này cũng sẽ xóa toàn bộ lịch sử sử dụng liên quan và gỡ khỏi báo cáo đổ.')) return
    
    // Delete from both tables (residual_materials and foaming_pour_reports)
    const [resMat, resPour] = await Promise.all([
      supabase.from('residual_materials').delete().eq('id', id),
      supabase.from('foaming_pour_reports').delete().eq('id', id)
    ])
    
    if (resMat.error) {
      alert('Lỗi khi xóa liệu tồn: ' + resMat.error.message)
    } else if (resPour.error) {
      alert('Lỗi khi xóa báo cáo đổ: ' + resPour.error.message)
    } else {
      fetchData()
    }
  }

  const handleDeleteUsage = async (id: string) => {
    if (!confirm('Xóa bản ghi sử dụng này? Số lượng tồn kho sẽ được tự động hoàn lại.')) return
    
    const { error } = await supabase.from('residual_material_usage').delete().eq('id', id)
    if (error) {
      alert('Lỗi khi xóa: ' + error.message)
    } else {
      fetchData()
    }
  }

  const handleDownloadCSV = () => {
    if (!canDownloadReport(user)) {
      alert('Bạn không có quyền tải báo cáo!')
      return
    }
    if (materials.length === 0) return

    let csvContent = '\uFEFF'
    csvContent += 'Ngày nhập,MSNV,Người nhập,Mã Bun,Tên vật liệu,Màu,Density,Độ cứng,Bột,Chiều dài,Máy,Ca,Quản lý,Số lượng ban đầu,Còn lại,Đơn vị\n'

    materials.forEach(m => {
      const row = [
        m.entry_date,
        m.users?.msnv || '',
        `"${(m.users?.full_name || '').replace(/"/g, '""')}"`,
        m.bun_code || '',
        `"${(m.material_name || '').replace(/"/g, '""')}"`,
        m.color || '',
        m.density || '',
        m.hardness || '',
        m.powder || '',
        m.length || '',
        m.machine_id || '',
        m.shift || '',
        m.manager_name || '',
        m.initial_quantity,
        m.current_quantity,
        m.unit
      ]
      csvContent += row.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.body.appendChild(document.createElement('a'))
    link.href = URL.createObjectURL(blob)
    link.download = `Bao_cao_lieu_ton_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.csv`
    link.click()
    document.body.removeChild(link)
  }

  // Filter stock display list based on top search input
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials
    const query = searchQuery.toUpperCase()
    return materials.filter(m => 
      (m.bun_code && m.bun_code.toUpperCase().includes(query)) ||
      (m.material_name && m.material_name.toUpperCase().includes(query)) ||
      (m.color && m.color.toUpperCase().includes(query)) ||
      (m.machine_id && m.machine_id.toUpperCase().includes(query)) ||
      (m.shift && m.shift.toUpperCase().includes(query)) ||
      (m.manager_name && m.manager_name.toUpperCase().includes(query))
    )
  }, [materials, searchQuery])

  return (
    <div className="space-y-4">
      {/* ── Sub-Tabs ──────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto scrollbar-hide">
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
        <button 
          onClick={() => setUseFilters(!useFilters)}
          className={`p-2.5 rounded-xl border transition-all ${useFilters ? 'bg-brand-500 text-white border-brand-500' : 'bg-[var(--bg-card)] border-[var(--border)] text-brand-500 hover:bg-brand-500/10'}`}
          title="Bộ lọc ngày"
        >
          <Filter size={18} />
        </button>
        {canDownloadReport(user) && materials.length > 0 && (
          <button 
            onClick={handleDownloadCSV}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-brand-500 hover:bg-brand-500/10 transition-all"
            title="Tải báo cáo CSV"
          >
            <Download size={18} />
          </button>
        )}
      </div>

      {/* ── Advanced Filters (Date Range) ──────────── */}
      <AnimatePresence>
        {useFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 space-y-3 overflow-hidden border-brand-500/20"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1 block">Từ ngày</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input text-xs" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase mb-1 block">Đến ngày</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input text-xs" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {/* Search Stock Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm tồn kho theo Mã Bun, Tên liệu, Máy, Ca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 text-xs"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" /></div>
            ) : filteredMaterials.length === 0 ? (
              <div className="card p-12 text-center">
                <Package size={40} className="mx-auto text-[var(--border)] mb-2" />
                <p className="text-sm text-[var(--text-3)]">Không tìm thấy liệu tồn nào phù hợp</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredMaterials.filter(m => m.current_quantity > 0).map(m => (
                  <div key={m.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-brand-500/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <Layers size={18} />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-md">
                            {m.bun_code}
                          </span>
                          <span className="text-[10px] bg-[var(--bg-input)] text-[var(--text-2)] px-2 py-0.5 rounded font-medium">
                            Máy: {m.machine_id || '—'}
                          </span>
                          <span className="text-[10px] bg-[var(--bg-input)] text-[var(--text-2)] px-2 py-0.5 rounded font-medium">
                            Ca: {m.shift || '—'}
                          </span>
                          <span className="text-[10px] bg-[var(--bg-input)] text-[var(--text-2)] px-2 py-0.5 rounded font-medium">
                            QL: {m.manager_name || '—'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[var(--text-1)] truncate">{m.material_name || 'Chưa cập nhật tên vật liệu'}</p>
                        
                        {/* Specs row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-3)] font-medium pt-1">
                          {m.color && <span>Màu: <strong className="text-[var(--text-2)]">{m.color}</strong></span>}
                          {m.density && <span>Density: <strong className="text-[var(--text-2)]">{m.density}</strong></span>}
                          {m.hardness && <span>Độ cứng: <strong className="text-[var(--text-2)]">{m.hardness}</strong></span>}
                          {m.powder && <span>Bột: <strong className="text-[var(--text-2)]">{m.powder}</strong></span>}
                          {m.length && <span>Dài: <strong className="text-[var(--text-2)]">{m.length}</strong></span>}
                        </div>
                        <p className="text-[9px] text-[var(--text-3)]">
                          Ngày nhập: {new Date(m.entry_date).toLocaleDateString('vi-VN')} | Đăng bởi: {m.users?.full_name || 'Hệ thống'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t border-[var(--border)] md:border-none pt-3 md:pt-0">
                      <div className="text-right">
                        <p className="text-xl font-black text-brand-500">
                          {m.current_quantity} <span className="text-xs font-bold uppercase">{m.unit}</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-3)] font-medium">Ban đầu: {m.initial_quantity} {m.unit}</p>
                      </div>
                      {(user.role === 'supervisor' || user.role === 'admin' || m.user_id === user.id) && (
                        <button 
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-2.5 text-[var(--text-3)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tab: Add Entry ───────────────────────── */}
        {activeTab === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="card p-6 md:p-8 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-[var(--border)] shadow-xl relative overflow-hidden"
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]/60">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 shrink-0">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--text-1)] tracking-tight">Khai Báo Liệu Tồn Mới</h3>
                <p className="text-[11px] text-[var(--text-3)] font-medium">Nhập hoặc truy ngược đặc tính kỹ thuật để gộp vào báo cáo đổ</p>
              </div>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-6">
              
              {/* Toggle Mode Option */}
              <div 
                onClick={() => {
                  setDontKnowBunCode(!dontKnowBunCode)
                  setStatus(null)
                  setFormData(prev => ({
                    ...prev,
                    bun_code: '',
                    material_name: '',
                    color: '',
                    density: '',
                    hardness: '',
                    powder: '',
                    length: ''
                  }))
                  setSearchColor('')
                  setSearchDensity('')
                  setSearchHardness('')
                  setSearchPowder('')
                  setSearchLength('')
                }}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer group select-none ${
                  dontKnowBunCode 
                    ? 'bg-brand-500/5 border-brand-500/30 shadow-sm shadow-brand-500/5' 
                    : 'bg-[var(--bg-input)] border-[var(--border)] hover:border-[var(--border)]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    dontKnowBunCode ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-gray-500/10 text-[var(--text-2)]'
                  }`}>
                    <Search size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[var(--text-1)] group-hover:text-brand-500 transition-colors">Tìm Mã Bun bằng đặc tính kỹ thuật</p>
                    <p className="text-[10px] text-[var(--text-3)] font-medium mt-0.5">Sử dụng khi không biết hoặc không nhớ chính xác Mã Bun</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ${dontKnowBunCode ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${dontKnowBunCode ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 2-Column Responsive Form Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Column 1: Bun Code Selection & Specifications */}
                <div className="space-y-5">
                  
                  {/* Search / Direct Input mode wrapper */}
                  {!dontKnowBunCode ? (
                    <div className="relative">
                      <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)] flex items-center gap-1.5">
                        <Package size={13} className="text-brand-500" /> Mã Bun (Bun Code)
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          required
                          type="text"
                          placeholder="Nhập hoặc chọn mã Bun (VD: BDB-000160)"
                          value={formData.bun_code}
                          onChange={e => handleBunCodeChange(e.target.value)}
                          className="input font-mono uppercase font-bold pl-10 h-11 text-sm tracking-wide bg-[var(--bg-input)] border-[var(--border)] focus:border-brand-500"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none">
                          <Plus size={16} />
                        </span>
                      </div>
                      
                      {/* Suggestion list */}
                      {bunCodeSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                          {bunCodeSuggestions.map((spec, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectSuggestion(spec)}
                              className="w-full px-4 py-3 text-left text-xs hover:bg-brand-500/10 border-b border-[var(--border)]/60 last:border-0 flex justify-between items-center transition-colors"
                            >
                              <span className="font-bold text-brand-500 font-mono tracking-wide">{spec.bun_code}</span>
                              <span className="text-[var(--text-3)] font-medium truncate max-w-[70%]">{spec.material_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Search Mode: Parameters fields to find Bun Code */
                    <div className="space-y-4 p-4 bg-brand-500/5 rounded-2xl border border-brand-500/10">
                      <h4 className="text-xs font-black text-brand-500 uppercase tracking-wider border-b border-brand-500/10 pb-2 flex items-center gap-1.5">
                        <Filter size={14} /> Chọn đặc tính lọc mã Bun
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Màu sắc</label>
                          <select
                            value={searchColor}
                            onChange={e => setSearchColor(e.target.value)}
                            className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                          >
                            <option value="">-- Tất cả --</option>
                            {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Density</label>
                          <select
                            value={searchDensity}
                            onChange={e => setSearchDensity(e.target.value)}
                            className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                          >
                            <option value="">-- Tất cả --</option>
                            {uniqueDensities.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Độ cứng</label>
                          <select
                            value={searchHardness}
                            onChange={e => setSearchHardness(e.target.value)}
                            className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                          >
                            <option value="">-- Tất cả --</option>
                            {uniqueHardness.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Bột</label>
                          <select
                            value={searchPowder}
                            onChange={e => setSearchPowder(e.target.value)}
                            className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                          >
                            <option value="">-- Tất cả --</option>
                            {uniquePowders.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Chiều dài</label>
                        <select
                          value={searchLength}
                          onChange={e => setSearchLength(e.target.value)}
                          className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                        >
                          <option value="">-- Tất cả --</option>
                          {uniqueLengths.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Search Results Display */}
                      <div className="pt-3 border-t border-brand-500/10">
                        {filteredSpecBuns.length === 0 ? (
                          <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-[10px] text-red-500 font-medium italic flex items-center gap-1.5">
                            <AlertCircle size={14} /> Không tìm thấy mã Bun khớp đặc tính.
                          </div>
                        ) : filteredSpecBuns.length === 1 ? (
                          <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-xs text-green-700">
                            <p className="font-bold flex items-center gap-1">
                              <CheckCircle2 size={14} /> Đã phát hiện mã Bun duy nhất:
                            </p>
                            <p className="mt-1 font-mono font-black text-sm tracking-wide">{filteredSpecBuns[0].bun_code}</p>
                            <p className="mt-0.5 text-[10px] leading-relaxed truncate">{filteredSpecBuns[0].material_name}</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                              ⚠️ Tìm thấy {filteredSpecBuns.length} mã. Chọn mã phù hợp:
                            </label>
                            <select
                              required
                              value={formData.bun_code}
                              onChange={e => {
                                const spec = filteredSpecBuns.find(x => x.bun_code === e.target.value)
                                if (spec) handleSelectSuggestion(spec)
                              }}
                              className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                            >
                              <option value="">-- Chọn mã Bun --</option>
                              {filteredSpecBuns.map(b => (
                                <option key={b.id} value={b.bun_code}>
                                  {b.bun_code} - {b.material_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Material Name (auto-fill display) */}
                  <div className="space-y-1.5">
                    <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Tên vật liệu (Material Name)</label>
                    <input
                      type="text"
                      placeholder="Tên vật liệu tự động điền"
                      value={formData.material_name}
                      onChange={e => setFormData({ ...formData, material_name: e.target.value })}
                      className="input text-xs font-bold bg-[var(--bg-input)] border-[var(--border)]/70 h-10"
                    />
                  </div>

                  {/* Glassmorphic Specs Card */}
                  <div className="bg-gradient-to-tr from-gray-500/5 to-gray-500/[0.02] dark:from-white/5 dark:to-white/[0.01] rounded-2xl p-4 border border-[var(--border)] shadow-sm space-y-3 relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-3)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
                      <span>Thuộc tính tự động</span>
                      {formData.bun_code && <span className="text-brand-500 font-mono font-black">{formData.bun_code}</span>}
                    </p>
                    <div className="grid grid-cols-3 gap-2.5 text-[10px] font-bold">
                      <div className="bg-gray-500/5 dark:bg-white/5 p-2 rounded-xl border border-gray-500/5">
                        <span className="text-[9px] text-[var(--text-3)] font-medium block mb-0.5">Màu sắc</span>
                        <span className="text-[var(--text-1)] truncate block">{formData.color || '—'}</span>
                      </div>
                      <div className="bg-gray-500/5 dark:bg-white/5 p-2 rounded-xl border border-gray-500/5">
                        <span className="text-[9px] text-[var(--text-3)] font-medium block mb-0.5">Density</span>
                        <span className="text-[var(--text-1)] truncate block">{formData.density || '—'}</span>
                      </div>
                      <div className="bg-gray-500/5 dark:bg-white/5 p-2 rounded-xl border border-gray-500/5">
                        <span className="text-[9px] text-[var(--text-3)] font-medium block mb-0.5">Độ cứng</span>
                        <span className="text-[var(--text-1)] truncate block">{formData.hardness || '—'}</span>
                      </div>
                      <div className="bg-gray-500/5 dark:bg-white/5 p-2 rounded-xl border border-gray-500/5">
                        <span className="text-[9px] text-[var(--text-3)] font-medium block mb-0.5">Loại bột</span>
                        <span className="text-[var(--text-1)] truncate block">{formData.powder || '—'}</span>
                      </div>
                      <div className="bg-gray-500/5 dark:bg-white/5 p-2 rounded-xl border border-gray-500/5">
                        <span className="text-[9px] text-[var(--text-3)] font-medium block mb-0.5">Chiều dài</span>
                        <span className="text-[var(--text-1)] truncate block">{formData.length || '—'}</span>
                      </div>
                      <div className="bg-brand-500/5 p-2 rounded-xl border border-brand-500/10">
                        <span className="text-[9px] text-brand-500 font-medium block mb-0.5">Đơn vị</span>
                        <span className="text-brand-500 font-black tracking-wide">BUN</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Column 2: Actual Logging Quantities & Metadata */}
                <div className="space-y-5 bg-gradient-to-br from-brand-500/[0.02] to-orange-500/[0.01] dark:from-white/[0.02] dark:to-transparent p-5 rounded-2xl border border-[var(--border)] shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-3)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                    <Info size={14} className="text-brand-500" /> Thông tin khai báo thực tế
                  </p>

                  {/* Quantity Input */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Số lượng (Số Bun)</label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          step="0.01"
                          placeholder="VD: 5.5, 12"
                          value={formData.quantity}
                          onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                          className="input font-bold pl-9 h-11 text-sm bg-[var(--bg-card)] border-[var(--border)] focus:border-brand-500"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none">
                          <Layers size={16} />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Đơn vị khai báo</label>
                      <input
                        type="text"
                        disabled
                        value="Bun"
                        className="input h-11 bg-[var(--bg-input)] border-[var(--border)]/70 opacity-80 text-center font-black text-brand-500"
                      />
                    </div>
                  </div>

                  {/* Machine, Shift, Manager */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Máy làm việc</label>
                      <select
                        className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                        value={formData.machine_id}
                        onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
                      >
                        <option>Máy 1</option>
                        <option>Máy 2</option>
                        <option>Máy 3</option>
                        <option>Máy đổ tay</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Ca làm việc</label>
                      <select
                        className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                        value={formData.shift}
                        onChange={e => setFormData({ ...formData, shift: e.target.value })}
                      >
                        <option>Ca 1</option>
                        <option>Ca 2</option>
                        <option>Ca 3</option>
                        <option>Ca HC</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Quản lý</label>
                      <select
                        className="input text-xs bg-[var(--bg-card)] border-[var(--border)]"
                        value={formData.manager_name}
                        onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
                      >
                        <option>Linh</option>
                        <option>Thảo</option>
                        <option>Tuấn Anh</option>
                      </select>
                    </div>
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-1.5">
                    <label className="label text-[11px] font-black uppercase tracking-wider text-[var(--text-2)]">Ngày tồn dư</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.entry_date}
                        onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                        className="input h-11 bg-[var(--bg-card)] border-[var(--border)] focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Status alert */}
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed ${
                        status.type === 'success' 
                          ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                      <span>{status.msg}</span>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full py-3 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-black shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Đang ghi nhận...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Lưu liệu tồn dư
                      </>
                    )}
                  </button>

                </div>
              </div>
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
                  className="input appearance-none text-xs"
                  value={useData.material_id}
                  onChange={e => setUseData({ ...useData, material_id: e.target.value })}
                >
                  <option value="">-- Chọn liệu tồn dư --</option>
                  {materials.filter(m => m.current_quantity > 0).map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.bun_code}] {m.material_name} - Máy: {m.machine_id} - Ca: {m.shift} (Còn: {m.current_quantity} {m.unit})
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
                <label className="label">Số lượng sử dụng (Bun)</label>
                <input
                  required
                  type="number"
                  step="0.01"
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
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <><ArrowDownToLine size={18} /> Ghi nhận sử dụng</>}
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
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
                    <ArrowDownToLine size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-[var(--text-1)]">
                        Sử dụng <span className="text-purple-600">-{log.used_quantity}</span> {log.residual_materials?.unit}
                      </p>
                      <span className="text-[9px] text-[var(--text-3)]">{new Date(log.used_at).toLocaleString('vi-VN')}</span>
                    </div>
                    
                    <div className="text-[10px] text-[var(--text-2)] mt-0.5 space-y-0.5">
                      <p>
                        Mã Bun: <span className="font-bold text-brand-500 font-mono">{log.residual_materials?.bun_code}</span> - {log.residual_materials?.material_name}
                      </p>
                      <p className="text-[9px] text-[var(--text-3)] font-medium">
                        Máy: {log.residual_materials?.machine_id} | Ca: {log.residual_materials?.shift} | Quản lý: {log.residual_materials?.manager_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5 opacity-60">
                      <User size={10} className="text-[var(--text-3)]" />
                      <span className="text-[9px] text-[var(--text-3)] font-medium">Bởi: {log.users?.full_name}</span>
                    </div>
                  </div>
                  {(user.role === 'supervisor' || user.role === 'admin' || log.user_id === user.id) && (
                    <button 
                      onClick={() => handleDeleteUsage(log.id)}
                      className="p-1.5 text-[var(--text-3)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
