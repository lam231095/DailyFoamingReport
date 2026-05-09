'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Factory, LogOut, Calendar, User, ChevronDown } from 'lucide-react'
import { clearSession } from '@/lib/session'
import { SessionUser } from '@/types'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useState } from 'react'

interface HeaderProps {
  user: SessionUser
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-brand-sm">
            <Factory size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-[var(--text-3)] leading-none">Ortholite Vietnam</p>
            <p className="text-sm font-bold text-[var(--text-1)] leading-tight">OVN Production</p>
          </div>
        </div>

        {/* Date badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full
          bg-brand-500/8 dark:bg-brand-500/10 border border-brand-500/20">
          <Calendar size={12} className="text-brand-500" />
          <span className="text-xs font-medium text-brand-500 capitalize">{today}</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User menu */}
          <div className="relative">
            <motion.button
              onClick={() => setMenuOpen((p) => !p)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl
                border border-[var(--border)] bg-[var(--bg-input)]
                hover:border-brand-500/40 transition-all duration-200"
            >
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                {user.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[var(--text-1)] leading-none">{user.full_name}</p>
                <p className="text-[10px] text-[var(--text-3)] leading-tight mt-0.5">{user.msnv}</p>
              </div>
              <ChevronDown size={12} className={`text-[var(--text-3)] transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl border border-[var(--border)]
                    bg-[var(--bg-card)] shadow-glass overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text-1)]">{user.full_name}</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">{user.department ?? 'Nhân viên sản xuất'}</p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20">
                      <User size={10} className="text-brand-500" />
                      <span className="text-xs text-brand-500 font-medium">{user.msnv}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500
                      hover:bg-red-500/8 transition-colors duration-150"
                  >
                    <LogOut size={14} />
                    <span>Đăng xuất</span>
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
