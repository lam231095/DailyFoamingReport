'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, UserCircle, ShieldCheck, Factory, Cpu } from 'lucide-react';
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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* Background Image with Parallax-like effect */}
      <motion.div 
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 z-0"
      >
        <img 
          src="/images/login-bg.png" 
          alt="Foaming Process" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-transparent to-black/80" />
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border-white/10">
          {/* Accent Line */}
          <div className="h-1.5 w-full premium-gradient" />
          
          <div className="p-8">
            <div className="text-center mb-10">
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 text-white mb-6 backdrop-blur-xl relative group"
              >
                <div className="absolute inset-0 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500" />
                <Factory size={40} className="relative z-10 text-indigo-400" />
              </motion.div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                OVN <span className="text-transparent bg-clip-text premium-gradient">Production</span>
              </h1>
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Hệ thống quản lý sản xuất Foaming / PU</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
                  Mã số nhân viên (MSNV)
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <UserCircle size={22} />
                  </span>
                  <input
                    type="text"
                    value={msnv}
                    onChange={(e) => setMsnv(e.target.value.toUpperCase())}
                    placeholder="NHẬP MÃ NV..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-white/5 bg-white/5 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all font-mono tracking-wider"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs font-medium text-center"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden py-4 rounded-xl font-black text-sm tracking-widest text-white shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="absolute inset-0 premium-gradient group-hover:scale-105 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>XÁC THỰC VÀO HỆ THỐNG</span>
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="h-px w-12 bg-white/10" />
              <div className="flex items-center gap-6 opacity-40">
                <Factory size={16} className="text-white" />
                <Cpu size={16} className="text-white" />
                <ShieldCheck size={16} className="text-white" />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                &copy; 2026 Ortholite Vietnam · IT Smart Factory
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Decorative Scanline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="w-full h-[2px] bg-white animate-scanline" />
      </div>
    </div>
  );
}
