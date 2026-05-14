'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, UserCircle, ShieldCheck, Factory, Cpu, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [msnv, setMsnv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('msnv', msnv)
        .single();

      if (fetchError || !data) {
        setError('Mã số nhân viên không tồn tại.');
      } else {
        localStorage.setItem('ovn_session', JSON.stringify(data));
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#05070f]">
      {/* Background Image */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.55 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
        className="absolute inset-0 z-0"
      >
        <img
          src="/images/login-bg.png"
          alt="Foaming Process"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#05070f]/90 via-[#05070f]/30 to-[#05070f]/90" />
      </motion.div>

      {/* Glow blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[480px]"
      >
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(99,102,241,0.15),0_0_0_1px_rgba(255,255,255,0.05)]"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)', backdropFilter: 'blur(24px)' }}>

          {/* Top gradient bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }} />

          <div className="px-10 pt-10 pb-10">

            {/* Logo + Title */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col items-center gap-5"
              >
                {/* Icon */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }} />
                  <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center border border-white/10"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))' }}>
                    <Factory size={44} className="text-white" />
                  </div>
                </div>

                {/* Company badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-300">Ortholite Vietnam</span>
                </div>

                {/* Main title */}
                <div>
                  <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
                    Hệ thống Quản lý
                  </h1>
                  <h1 className="text-3xl font-black leading-tight tracking-tight"
                    style={{ background: 'linear-gradient(90deg, #818cf8, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Sản xuất Foaming
                  </h1>
                </div>

                {/* Subtitle */}
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                  <span className="font-medium">Xác thực bảo mật · Chỉ dành cho nhân viên OVN</span>
                </div>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Đăng nhập</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                  Mã số nhân viên (MSNV)
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                    <UserCircle size={22} />
                  </span>
                  <input
                    type="text"
                    value={msnv}
                    onChange={(e) => setMsnv(e.target.value.toUpperCase())}
                    placeholder="Nhập mã nhân viên..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl text-white text-base font-semibold placeholder:text-slate-600 placeholder:font-normal outline-none transition-all duration-200 tracking-wider"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.08)',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.border = '1.5px solid rgba(99,102,241,0.6)';
                      e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm font-medium"
                >
                  <span className="text-red-400">⚠</span>
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden py-4 rounded-xl font-black text-base tracking-widest text-white shadow-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 hover:shadow-indigo-500/25 hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)' }}
              >
                <div className="flex items-center justify-center gap-3">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={20} />
                      <span>XÁC THỰC VÀO HỆ THỐNG</span>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex items-center gap-5 opacity-30">
                <Factory size={18} className="text-white" />
                <Zap size={18} className="text-white" />
                <Cpu size={18} className="text-white" />
                <ShieldCheck size={18} className="text-white" />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] text-center">
                © 2026 Ortholite Vietnam · IT Smart Factory
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="w-full h-[2px] bg-white animate-scanline" />
      </div>
    </div>
  );
}
