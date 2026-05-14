'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Factory, LogOut, Calendar, User, ChevronDown, Zap } from 'lucide-react'
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

  const initials = user.full_name
    .split(' ')
    .slice(-2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 var(--border), var(--shadow-sm)',
      }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)' }} />

      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <Factory size={18} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2"
              style={{ borderColor: 'var(--bg-card)' }} />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              Ortholite Vietnam
            </p>
            <p className="text-sm font-black leading-tight" style={{ color: 'var(--text-1)' }}>
              OVN Production
            </p>
          </div>
        </div>

        {/* Date badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
          style={{
            background: 'rgba(79,70,229,0.08)',
            border: '1px solid rgba(79,70,229,0.2)',
            color: '#4f46e5',
          }}>
          <Calendar size={12} />
          {today}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User menu */}
          <div className="relative">
            <motion.button
              onClick={() => setMenuOpen((p) => !p)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-2)',
              }}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-none" style={{ color: 'var(--text-1)' }}>
                  {user.full_name}
                </p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {user.msnv}
                </p>
              </div>
              <ChevronDown size={12}
                className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-3)' }} />
            </motion.button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-56 z-50 rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  {/* User info */}
                  <div className="px-4 py-4"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{user.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{user.department ?? 'Nhân viên'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit"
                      style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)' }}>
                      <User size={10} style={{ color: '#4f46e5' }} />
                      <span className="text-xs font-bold" style={{ color: '#4f46e5' }}>{user.msnv}</span>
                    </div>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold transition-all duration-150 text-red-500 hover:bg-red-500/8"
                  >
                    <LogOut size={15} />
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
