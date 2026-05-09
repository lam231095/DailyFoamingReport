'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Bell, LayoutDashboard } from 'lucide-react';
import { User as UserType } from '@/types';

export default function Header() {
  const [user, setUser] = useState<UserType | null>(null);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('ovn_session');
    if (session) {
      setUser(JSON.parse(session));
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('ovn_session');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center text-white">
            <LayoutDashboard size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">OVN Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full border-2 border-white dark:border-slate-950"></span>
          </button>
          
          <div className="h-8 w-[1px] bg-slate-200 dark:border-slate-800 mx-2"></div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold">{user?.full_name || 'Đang tải...'}</p>
              <p className="text-xs text-slate-500">{user?.department} - {user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <User size={24} />
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
