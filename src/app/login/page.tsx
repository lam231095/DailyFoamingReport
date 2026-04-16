'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Factory, Loader2, AlertCircle, Contact, ChevronRight, Cpu, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { setSession } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const [msnv, setMsnv] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msnv.trim()) {
      triggerError('Vui lòng nhập Mã Số Nhân Viên')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('id, msnv, full_name, department, is_active')
        .eq('msnv', msnv.trim().toUpperCase())
        .single()

      if (dbError || !data) {
        triggerError('Mã Số Nhân Viên không tồn tại trong hệ thống')
        return
      }
      if (!data.is_active) {
        triggerError('Tài khoản này đã bị vô hiệu hóa. Liên hệ quản lý.')
        return
      }

      setSession({
        id: data.id,
        msnv: data.msnv,
        full_name: data.full_name,
        department: data.department,
      })
      router.push('/dashboard')
    } catch {
      triggerError('Lỗi kết nối. Kiểm tra lại mạng và thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const triggerError = (msg: string) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#0a0f1e]">

      {/* ── Left Panel ─────────────────────────────── */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #003380 50%, #0052CC 100%)' }}
      >
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Glowing orbs */}
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #66a3ff, transparent)' }} />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #0052CC, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Factory size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium tracking-widest uppercase">Ortholite Vietnam</p>
              <p className="text-white font-bold text-lg leading-tight">OVN Production</p>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              Hệ Thống<br />
              <span style={{ color: '#66a3ff' }}>Quản Lý</span><br />
              Sản Xuất
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Theo dõi sản lượng, KPI và biến động 4M theo thời gian thực cho toàn bộ chuyền sản xuất.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap gap-2 mt-6"
          >
            {['📊 Sản Lượng Real-time', '⚙️ Biến Động 4M', '📈 KPI 15 Điểm', '🔔 Cảnh Báo Chất Lượng'].map((f) => (
              <span key={f} className="px-3 py-1.5 rounded-full text-xs font-medium text-white/80 border border-white/20 bg-white/10 backdrop-blur-sm">
                {f}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Chuyền', value: '6' },
            { label: 'Nhân viên', value: '200+' },
            { label: 'SKU', value: '50+' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Right Panel (Login Form) ─────────────────── */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
        style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1428 100%)' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <Factory size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white/50 text-xs">Ortholite Vietnam</p>
            <p className="text-white font-bold">OVN Production</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-brand-400" />
              <span className="text-brand-400 text-xs font-medium tracking-wider uppercase">Đăng Nhập Hệ Thống</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Chào mừng trở lại</h2>
            <p className="text-white/40 text-sm mt-1">Nhập MSNV để bắt đầu ca làm việc</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* MSNV input */}
            <motion.div
              animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <label className="label text-white/60" htmlFor="msnv-input">
                Mã Số Nhân Viên (MSNV)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                  <Contact size={18} />
                </div>
                <input
                  id="msnv-input"
                  type="text"
                  value={msnv}
                  onChange={(e) => { setMsnv(e.target.value); setError('') }}
                  placeholder="VD: NV001, QL001"
                  autoComplete="off"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border text-white placeholder:text-white/20
                    focus:outline-none focus:ring-2 transition-all duration-200 text-sm font-medium tracking-wider uppercase
                    bg-white/5 border-white/10 focus:ring-brand-500/50 focus:border-brand-500/60"
                  style={{ letterSpacing: '0.08em' }}
                />
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading || !msnv.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-white
                transition-all duration-200 relative overflow-hidden
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading || !msnv.trim()
                  ? 'rgba(0,82,204,0.4)'
                  : 'linear-gradient(135deg, #0052CC, #3385ff)',
                boxShadow: loading || !msnv.trim() ? 'none' : '0 4px 20px rgba(0,82,204,0.5)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng Nhập Ca Làm Việc</span>
                  <ChevronRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Info */}
          <div className="mt-6 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-brand-500/5 border border-brand-500/15">
            <Cpu size={14} className="text-brand-400 shrink-0 mt-0.5" />
            <p className="text-white/35 text-xs leading-relaxed">
              Hệ thống nội bộ OVN. Mọi thao tác được ghi nhận và đồng bộ tức thời.
              Liên hệ quản lý nếu quên MSNV.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 text-white/20 text-xs">
          © 2026 Ortholite Vietnam · v1.0.0
        </p>
      </motion.div>
    </div>
  )
}
