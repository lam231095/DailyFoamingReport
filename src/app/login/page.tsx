'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, UserCircle } from 'lucide-react';
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
        setError('Mã số nhân viên không tồn tại hoặc có lỗi xảy ra.');
      } else {
        // Lưu session giả lập vào localStorage
        localStorage.setItem('ovn_session', JSON.stringify(data));
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Lỗi hệ thống. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 glass-card shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full premium-gradient text-white mb-4">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">OVN Production</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Đăng nhập bằng mã số nhân viên của bạn</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Mã số nhân viên (MSNV)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <UserCircle size={20} />
              </span>
              <input
                type="text"
                value={msnv}
                onChange={(e) => setMsnv(e.target.value.toUpperCase())}
                placeholder="Ví dụ: NV001"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg premium-gradient text-white font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'VÀO HỆ THỐNG'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 italic">
            &copy; 2026 Ortholite Vietnam - IT Department
          </p>
        </div>
      </motion.div>
    </div>
  );
}
