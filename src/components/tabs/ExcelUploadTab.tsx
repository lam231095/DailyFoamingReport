'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  X, RefreshCw, ChevronDown, Info, Loader2, Database,
  ArrowRight, Eye, Trash2
} from 'lucide-react'
import { SessionUser } from '@/types'


interface ExcelUploadTabProps {
  user: SessionUser
}

interface ParsedRow {
  firm_plan: string
  no_order: string | null
  bun_code: string | null
  pu_code: string | null
  ten_san_pham: string | null
  sl_sheet: number | null
  sl_bun_can_tach: number | null
  sl_bun_can_do: number | null
  completion_date: string | null
  delivery_date: string | null
  week_label: string
  synced_at: string
}

interface UploadResult {
  uploaded: number
  failed: number
  errors?: string[]
}

type UploadState = 'idle' | 'parsing' | 'preview' | 'uploading' | 'done' | 'error'

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseIntVal(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).replace(/,/g, '').replace(/\./g, '').trim()
  if (str === '-' || str === '') return null
  const m = str.match(/^(\d+)/)
  if (m) return parseInt(m[1], 10)
  return null
}

function cellText(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ')
}

// ─── File type config ───────────────────────────────────────────────────────

type FileType = 'production' | 'sample' | 'bcn'

interface ColConfig {
  COL_NO_ORDER: number
  COL_FIRM_PLAN: number
  COL_BUN_CODE: number
  COL_PU_CODE: number
  COL_TEN_SP: number
  COL_SL_SHEET: number
  COL_SL_TACH: number
  COL_SL_DO: number | null
  COL_COMPLETION: number
  COL_DELIVERY: number
  DATA_START: number
  filterFPRO: boolean  // Có lọc chỉ lấy FPRO/RPRO không
}

const COL_CONFIGS: Record<FileType, ColConfig> = {
  production: {
    COL_NO_ORDER: 0,   // col 1
    COL_FIRM_PLAN: 1,  // col 2
    COL_BUN_CODE: 4,   // col 5
    COL_PU_CODE: 5,    // col 6
    COL_TEN_SP: 6,     // col 7
    COL_SL_SHEET: 7,   // col 8
    COL_SL_TACH: 8,    // col 9
    COL_SL_DO: 9,      // col 10
    COL_COMPLETION: 16, // col 17
    COL_DELIVERY: 17,   // col 18
    DATA_START: 2,
    filterFPRO: false,
  },
  sample: {
    COL_NO_ORDER: 0,   // col 1
    COL_FIRM_PLAN: 1,  // col 2
    COL_BUN_CODE: 2,   // col 3
    COL_PU_CODE: 3,    // col 4
    COL_TEN_SP: 4,     // col 5
    COL_SL_SHEET: 5,   // col 6
    COL_SL_TACH: 6,    // col 7
    COL_SL_DO: 7,      // col 8
    COL_COMPLETION: 13, // col 14
    COL_DELIVERY: 14,   // col 15
    DATA_START: 2,
    filterFPRO: true,
  },
  bcn: {
    COL_NO_ORDER: 1,   // col 2
    COL_FIRM_PLAN: 2,  // col 3
    COL_BUN_CODE: 3,   // col 4
    COL_PU_CODE: 4,    // col 5
    COL_TEN_SP: 5,     // col 6
    COL_SL_SHEET: 6,   // col 7
    COL_SL_TACH: 9,    // col 10
    COL_SL_DO: 9,      // col 10 (dùng chung)
    COL_COMPLETION: 11, // col 12
    COL_DELIVERY: 12,   // col 13
    DATA_START: 2,
    filterFPRO: true,
  },
}

const FILE_TYPE_OPTIONS: { value: FileType; label: string; weekLabel: string; color: string }[] = [
  { value: 'production', label: '📅 Kế hoạch sản xuất (W##-YYYY)', weekLabel: '', color: '#10b981' },
  { value: 'sample',     label: '🧪 Tiến độ Sample',                  weekLabel: 'Sample',    color: '#f59e0b' },
  { value: 'bcn',        label: '🏭 Tiến độ BCN (China CN)',          weekLabel: 'China CN',  color: '#6366f1' },
]

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ExcelUploadTab({ user }: ExcelUploadTabProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [fileType, setFileType] = useState<FileType>('production')
  const [weekLabel, setWeekLabel] = useState('')
  const [sheetIndex, setSheetIndex] = useState<number>(0)
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [showAllRows, setShowAllRows] = useState(false)
  const fileRef = useRef<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isAuthorized = user.msnv === '04127'


  // Effective week label: auto-fill for Sample/BCN, manual for production
  const effectiveWeekLabel = fileType === 'production' ? weekLabel : (FILE_TYPE_OPTIONS.find(o => o.value === fileType)?.weekLabel ?? '')

  // ─── Parse Excel ──────────────────────────────────────────────────────────

  const parseExcel = useCallback(async (file: File, shIdx: number, wLabel: string, fType: FileType) => {
    setUploadState('parsing')
    setErrorMsg('')
    setParsedRows([])

    try {
      // Dynamically import xlsx to keep bundle size small
      const xlsxModule = (await import('xlsx')) as any
      const XLSX = xlsxModule.read ? xlsxModule : xlsxModule.default



      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: false })

      // List sheets
      const sheets = workbook.SheetNames
      setAvailableSheets(sheets)

      if (sheets.length === 0) {
        throw new Error('File Excel không có sheet nào.')
      }

      // -1 là sentinel: tự động chọn sheet cuối cùng (mới nhất)
      const actualIdx = shIdx === -1 ? sheets.length - 1 : shIdx
      setSheetIndex(actualIdx)
      const targetSheet = sheets[actualIdx] ?? sheets[sheets.length - 1]
      const ws = workbook.Sheets[targetSheet]

      // Read all values as text (similar to PowerShell's .Text)
      const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        defval: '',
      }) as unknown[][]

      // Get column config based on file type
      const cfg = COL_CONFIGS[fType]

      const now = new Date().toISOString()
      const rows: ParsedRow[] = []
      let consecutiveEmpty = 0

      for (let r = cfg.DATA_START; r < raw.length; r++) {
        const row = raw[r] || []
        const firmPlan = cellText(row[cfg.COL_FIRM_PLAN])

        if (!firmPlan) {
          consecutiveEmpty++
          if (consecutiveEmpty >= 15) break
          continue
        }
        consecutiveEmpty = 0

        // Filter: only FPRO/RPRO for Sample and BCN
        if (cfg.filterFPRO && !/^[FR]PRO-/i.test(firmPlan)) continue

        const compDate = cellText(row[cfg.COL_COMPLETION]) || null
        const delDate  = cellText(row[cfg.COL_DELIVERY]) || null

        rows.push({
          firm_plan: firmPlan,
          no_order: cellText(row[cfg.COL_NO_ORDER]) || null,
          bun_code: cellText(row[cfg.COL_BUN_CODE]) || null,
          pu_code: cellText(row[cfg.COL_PU_CODE]) || null,
          ten_san_pham: cellText(row[cfg.COL_TEN_SP]) || null,
          sl_sheet: parseIntVal(row[cfg.COL_SL_SHEET]),
          sl_bun_can_tach: parseIntVal(row[cfg.COL_SL_TACH]),
          sl_bun_can_do: cfg.COL_SL_DO !== null ? parseIntVal(row[cfg.COL_SL_DO]) : null,
          completion_date: compDate,
          delivery_date: delDate || compDate,
          week_label: wLabel.trim() || 'Unknown',
          synced_at: now,
        })
      }

      if (rows.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ. Kiểm tra lại file hoặc sheet đã chọn.')
      }

      setParsedRows(rows)
      setUploadState('preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi đọc file.'
      setErrorMsg(msg)
      setUploadState('error')
    }
  }, [])

  // ─── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File, fType: FileType, wLabel: string) => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setErrorMsg('Chỉ hỗ trợ file .xlsx hoặc .xls')
        setUploadState('error')
        return
      }
      fileRef.current = file
      setFileName(file.name)
      setSheetIndex(0)  // sẽ được update bởi parseExcel
      setAvailableSheets([])
      setShowAllRows(false)
      await parseExcel(file, -1, wLabel, fType)  // -1 = tự chọn sheet cuối cùng
    },
    [parseExcel]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file, fileType, effectiveWeekLabel)
    },
    [handleFile, fileType, effectiveWeekLabel]
  )

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file, fileType, effectiveWeekLabel)
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    },
    [handleFile, fileType, effectiveWeekLabel]
  )

  // Re-parse when sheet selection changes
  const onSheetChange = async (idx: number) => {
    setSheetIndex(idx)
    if (fileRef.current) {
      await parseExcel(fileRef.current, idx, effectiveWeekLabel, fileType)
    }
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (parsedRows.length === 0) return
    setUploadState('uploading')
    setResult(null)

    try {
      const resp = await fetch('/api/upload-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parsedRows.map(row => ({
            ...row,
            week_label: effectiveWeekLabel.trim()
          }))
        }),
      })


      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.error || `Server lỗi: ${resp.status}`)
      }

      setResult(data)
      setUploadState('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi upload dữ liệu.'
      setErrorMsg(msg)
      setUploadState('error')
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = () => {
    setUploadState('idle')
    setParsedRows([])
    setFileName('')
    setResult(null)
    setErrorMsg('')
    setAvailableSheets([])
    setSheetIndex(0)
    setShowAllRows(false)
    fileRef.current = null
  }

  // ─── Guard: not authorized ─────────────────────────────────────────────────

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

  const displayRows = showAllRows ? parsedRows : parsedRows.slice(0, 20)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header card */}
      <div
        className="rounded-2xl p-5 flex items-start gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))',
          border: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          <FileSpreadsheet size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>
            Upload Kế Hoạch Sản Xuất
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Tải file Excel (.xlsx) kế hoạch sản xuất lên để cập nhật dữ liệu hệ thống.
            Hệ thống sẽ đọc file ngay trong trình duyệt và sync lên Supabase.
          </p>
        </div>
      </div>

      {/* Step 1: Config */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
          Bước 1 · Chọn loại file
        </h3>

        {/* File type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FILE_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setFileType(opt.value)
                // Reset if already had a file parsed
                if (uploadState === 'preview' || uploadState === 'done') reset()
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left"
              style={{
                background: fileType === opt.value
                  ? `${opt.color}18`
                  : 'var(--bg-page)',
                border: fileType === opt.value
                  ? `1.5px solid ${opt.color}`
                  : '1.5px solid var(--border)',
                color: fileType === opt.value ? opt.color : 'var(--text-2)',
              }}
            >
              <span className="text-base">{opt.label.split(' ')[0]}</span>
              <span className="text-xs">{opt.label.replace(/^\S+ /, '')}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Week label input — only for production type */}
          {fileType === 'production' ? (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
                Week Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: W23-2026"
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: 'var(--bg-page)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text-1)',
                }}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                Nhãn tuần sẽ được gán cho toàn bộ dữ liệu trong file
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Info size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                  Week Label tự động: <strong style={{ color: FILE_TYPE_OPTIONS.find(o=>o.value===fileType)?.color }}>&ldquo;{effectiveWeekLabel}&rdquo;</strong>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Không cần nhập thủ công cho loại file này
                </p>
              </div>
            </div>
          )}

          {/* Sheet selector */}
          {availableSheets.length > 0 && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
                Chọn Sheet
              </label>
              <div className="relative">
                <select
                  value={sheetIndex}
                  onChange={e => onSheetChange(parseInt(e.target.value, 10))}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--bg-page)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-1)',
                  }}
                >
                  {availableSheets.map((s, i) => (
                    <option key={i} value={i}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                File có {availableSheets.length} sheet · Đang đọc: <strong>{availableSheets[sheetIndex]}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Drop zone */}
      <AnimatePresence mode="wait">
        {(uploadState === 'idle' || uploadState === 'error') && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
                Bước 2 · Chọn file Excel
              </h3>

              {/* Error banner */}
              {uploadState === 'error' && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{errorMsg}</p>
                </motion.div>
              )}

              {/* Drop area */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { onDrop(e) }}
                onClick={() => { inputRef.current?.click() }}
                style={{
                  border: `2px dashed ${isDragging ? '#10b981' : 'var(--border)'}`,
                  background: isDragging
                    ? 'rgba(16,185,129,0.05)'
                    : 'var(--bg-page)',
                  cursor: 'pointer',
                }}
              >
                <motion.div
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: isDragging ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)' }}
                >
                  <Upload size={26} style={{ color: '#10b981' }} />
                </motion.div>

                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                    {isDragging ? 'Thả file vào đây...' : 'Kéo & thả file Excel vào đây'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    hoặc <span style={{ color: '#10b981' }} className="font-semibold">nhấn để chọn file</span> · Hỗ trợ .xlsx, .xls
                  </p>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>

              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(14,165,233,0.06)', color: 'var(--text-3)' }}
              >
                <Info size={13} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                File Excel cần có: Cột 1=No.Order, Cột 2=Firm Plan, Cột 5=Mã Bun, Cột 6=Mã PU, Cột 7=Tên SP,
                Cột 8=SL Sheet, Cột 9=SL Tách, Cột 10=SL Đổ, Cột 17=Completion, Cột 18=Delivery. Header ở row 2, data từ row 3.
              </div>
            </div>
          </motion.div>
        )}

        {/* Parsing state */}
        {uploadState === 'parsing' && (
          <motion.div
            key="parsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-10 flex flex-col items-center gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#10b981' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Đang đọc file Excel...</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{fileName}</p>
            </div>
          </motion.div>
        )}

        {/* Preview state */}
        {(uploadState === 'preview' || uploadState === 'uploading') && parsedRows.length > 0 && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Preview header */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <Eye size={15} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                    Preview dữ liệu
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    <span className="font-semibold" style={{ color: '#10b981' }}>{parsedRows.length} dòng</span> hợp lệ từ &ldquo;{fileName}&rdquo; · Sheet: <strong>{availableSheets[sheetIndex] ?? 'Sheet 1'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-3)' }}
                title="Chọn file khác"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Firm Plan', 'No.Order', 'Mã Bun', 'Mã PU', 'Tên SP', 'SL Sheet', 'SL Tách', 'SL Đổ', 'Completion', 'Delivery'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                        style={{ color: 'var(--text-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={i}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td className="px-3 py-2" style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: '#10b981' }}>{row.firm_plan}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-2)' }}>{row.no_order ?? '—'}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-2)' }}>{row.bun_code ?? '—'}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-2)' }}>{row.pu_code ?? '—'}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate" style={{ color: 'var(--text-1)' }} title={row.ten_san_pham ?? ''}>{row.ten_san_pham ?? '—'}</td>
                      <td className="px-3 py-2 text-right" style={{ color: 'var(--text-1)' }}>{row.sl_sheet?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2 text-right" style={{ color: 'var(--text-1)' }}>{row.sl_bun_can_tach?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2 text-right" style={{ color: 'var(--text-1)' }}>{row.sl_bun_can_do?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{row.completion_date ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{row.delivery_date ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Show more / footer */}
            {parsedRows.length > 20 && (
              <div className="px-5 py-3 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {showAllRows
                    ? `Hiển thị tất cả ${parsedRows.length} dòng`
                    : `Đang hiển thị 20/${parsedRows.length} dòng`}
                </p>
                <button
                  onClick={() => setShowAllRows(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#10b981' }}
                >
                  {showAllRows ? 'Thu gọn' : `Xem tất cả ${parsedRows.length} dòng`}
                  <ChevronDown size={13} style={{ transform: showAllRows ? 'rotate(180deg)' : undefined }} />
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-5 py-4 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-page)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                <div className="flex items-center gap-2">
                  <Database size={13} style={{ color: '#10b981' }} />
                  <span>UPSERT lên Supabase · Week: <strong style={{ color: '#10b981' }}>{effectiveWeekLabel || '(chưa nhập)'}</strong></span>
                </div>
                {!effectiveWeekLabel.trim() && (
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    ⚠️ Vui lòng nhập Week Label ở Bước 1
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  disabled={uploadState === 'uploading'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-2)',
                    opacity: uploadState === 'uploading' ? 0.5 : 1,
                  }}
                >
                  <X size={13} /> Hủy
                </button>

                <button
                  onClick={handleUpload}
                  disabled={uploadState === 'uploading' || !effectiveWeekLabel.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  style={{
                    background: uploadState === 'uploading' || !effectiveWeekLabel.trim()
                      ? 'rgba(16,185,129,0.4)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    cursor: uploadState === 'uploading' || !effectiveWeekLabel.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {uploadState === 'uploading' ? (
                    <><Loader2 size={13} className="animate-spin" /> Đang sync...</>
                  ) : (
                    <><ArrowRight size={13} /> Xác nhận Sync {parsedRows.length} dòng</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Done state */}
        {uploadState === 'done' && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <CheckCircle2 size={40} style={{ color: '#10b981' }} />
            </motion.div>

            <div>
              <h3 className="text-xl font-black mb-1" style={{ color: 'var(--text-1)' }}>
                Sync hoàn tất! 🎉
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Dữ liệu đã được cập nhật thành công lên Supabase
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: '#10b981' }}>{result.uploaded}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-2)' }}>Dòng thành công</p>
              </div>
              {result.failed > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-black text-red-500">{result.failed}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-2)' }}>Dòng lỗi</p>
                </div>
              )}
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="w-full text-left px-4 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="font-semibold text-red-600 mb-1">Chi tiết lỗi:</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-red-500">{e}</p>
                ))}
              </div>
            )}

            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
              }}
            >
              <RefreshCw size={15} /> Upload file khác
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
