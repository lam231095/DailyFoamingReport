'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart3, AlertOctagon, Package, Factory, TrendingUp } from 'lucide-react'
import { getSession } from '@/lib/session'
import { SessionUser } from '@/types'
import Header from '@/components/layout/Header'
import IssueAnalysisTab from '@/components/tabs/IssueAnalysisTab'
import UtilizationAnalysisTab from '@/components/tabs/UtilizationAnalysisTab'
import DailyReportTab from '@/components/tabs/DailyReportTab'
import ResidualMaterialTab from '@/components/tabs/ResidualMaterialTab'
import FoamingProcessTab from '@/components/tabs/FoamingProcessTab'

const TABS = [
  {
    id: 'foaming',
    label: 'Quy trình Foaming',
    shortLabel: 'Foaming',
    icon: Factory,
    color: '#f43f5e',
  },
  {
    id: 'daily-report',
    label: 'Daily report',
    shortLabel: 'Báo cáo',
    icon: BarChart3,
    color: '#3b82f6',
  },
  {
    id: 'utilization',
    label: 'Hiệu Suất & 4M',
    shortLabel: 'Hiệu Suất',
    icon: TrendingUp,
    color: '#8b5cf6',
  },
  {
    id: 'issues',
    label: 'Biến Động 4M',
    shortLabel: 'Sự Cố',
    icon: AlertOctagon,
    color: '#ef4444',
  },
  {
    id: 'residual',
    label: 'Quản Lý Liệu Tồn',
    shortLabel: 'Liệu Tồn',
    icon: Package,
    color: '#10b981',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [activeTab, setActiveTab] = useState('foaming')

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace('/login')
    } else {
      setUser(session)
    }
  }, [router])

  const switchTab = (tabId: string) => {
    setActiveTab(tabId)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-[var(--text-2)] text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  const activeTabData = TABS.find((t) => t.id === activeTab)!

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Header user={user} />

      {/* ── Tab Bar ──────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="relative flex">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className="relative flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors duration-200"
                  style={{ color: active ? tab.color : 'var(--text-3)' }}
                >
                  <tab.icon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: tab.color }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {/* Welcome bar */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl
            bg-brand-500/6 dark:bg-brand-500/8 border border-brand-500/15"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs font-medium text-[var(--text-2)]">
              Xin chào, <span className="text-brand-500 font-bold">{user.full_name}</span>
              {user.department && <span className="text-[var(--text-3)]"> · {user.department}</span>}
            </p>
          </div>
          <span className="text-[10px] text-[var(--text-3)] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full text-green-600 dark:text-green-400 font-medium">
            ● Online
          </span>
        </motion.div>

        {/* Tab panels — always mounted, shown/hidden via CSS to avoid blank flash */}
        <div className="relative">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              style={{
                display: activeTab === tab.id ? 'block' : 'none',
              }}
            >
              {tab.id === 'daily-report' && <DailyReportTab user={user} />}
              {tab.id === 'utilization'  && <UtilizationAnalysisTab user={user} />}
              {tab.id === 'issues'       && <IssueAnalysisTab user={user} />}
              {tab.id === 'residual'     && <ResidualMaterialTab user={user} />}
              {tab.id === 'foaming'      && <FoamingProcessTab user={user} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Nav (mobile) ───────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-30
        border-t border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-md">
        <div className="flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative"
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-bg"
                    className="absolute inset-x-3 inset-y-1.5 rounded-xl"
                    style={{ background: `${tab.color}12` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <tab.icon
                  size={20}
                  style={{ color: active ? tab.color : 'var(--text-3)' }}
                  className="relative z-10"
                />
                <span
                  className="text-[10px] font-medium relative z-10"
                  style={{ color: active ? tab.color : 'var(--text-3)' }}
                >
                  {tab.shortLabel}
                </span>
              </button>
            )
          })}
        </div>
        {/* Safe area spacer */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  )
}
