'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart3, Package, Factory, TrendingUp, ClipboardList, FileText, Lock, UploadCloud } from 'lucide-react'
import { getSession } from '@/lib/session'
import { SessionUser } from '@/types'
import Header from '@/components/layout/Header'

import UtilizationAnalysisTab from '@/components/tabs/UtilizationAnalysisTab'
import DailyReportTab from '@/components/tabs/DailyReportTab'
import ResidualMaterialTab from '@/components/tabs/ResidualMaterialTab'
import FoamingProcessTab from '@/components/tabs/FoamingProcessTab'
import ProductionProgressTab from '@/components/tabs/ProductionProgressTab'
import SupplementaryReportTab from '@/components/tabs/SupplementaryReportTab'
import ExcelUploadTab from '@/components/tabs/ExcelUploadTab'

const TABS = [
  {
    id: 'foaming',
    label: 'Quy trình Foaming',
    shortLabel: 'Foaming',
    icon: Factory,
    color: '#f43f5e',
    adminOnly: false,
  },
  {
    id: 'daily-report',
    label: 'Daily report',
    shortLabel: 'Báo cáo',
    icon: BarChart3,
    color: '#3b82f6',
    adminOnly: false,
  },
  {
    id: 'supplementary-report',
    label: 'Báo cáo bổ sung',
    shortLabel: 'BC Bổ sung',
    icon: FileText,
    color: '#6366f1',
    adminOnly: true,
  },
  {
    id: 'utilization',
    label: 'Hiệu Suất & 4M',
    shortLabel: 'Hiệu Suất',
    icon: TrendingUp,
    color: '#8b5cf6',
    adminOnly: false,
  },
  {
    id: 'production-progress',
    label: 'Tiến Độ SX',
    shortLabel: 'Tiến Độ',
    icon: ClipboardList,
    color: '#0ea5e9',
    adminOnly: false,
  },
  {
    id: 'residual',
    label: 'Quản Lý Liệu Tồn',
    shortLabel: 'Liệu Tồn',
    icon: Package,
    color: '#10b981',
    adminOnly: false,
  },
  {
    id: 'excel-upload',
    label: 'Upload KH SX',
    shortLabel: 'Upload',
    icon: UploadCloud,
    color: '#059669',
    adminOnly: true,
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [activeTab, setActiveTab] = useState('foaming')

  const ADMIN_MSNV = '04127'

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
  const isAdmin = user?.msnv === ADMIN_MSNV
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  const isWide = activeTab === 'production-progress' || activeTab === 'daily-report' || activeTab === 'supplementary-report' || activeTab === 'excel-upload'

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Header user={user} activeTab={activeTab} />

      {/* ── Tab Bar ──────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className={`mx-auto px-3 transition-all duration-300 ${
          isWide ? 'max-w-[1400px] w-full px-6' : 'max-w-2xl w-full'
        }`}>
          <div className="relative flex gap-0.5">
            {visibleTabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className="relative flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-200 rounded-none"
                  style={{ color: active ? tab.color : 'var(--text-3)' }}
                >
                  <tab.icon size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {tab.adminOnly && (
                    <Lock size={8} className="shrink-0 opacity-50" />
                  )}
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full"
                      style={{ background: tab.color }}
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────── */}
      <div className={`mx-auto px-4 py-4 pb-20 transition-all duration-300 ${
        isWide ? 'max-w-[1400px] w-full px-6' : 'max-w-2xl w-full'
      }`}>
        {/* Welcome bar */}
        <div className="flex items-center justify-between mb-5 px-4 py-3 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.07), rgba(124,58,237,0.04))',
            border: '1px solid rgba(79,70,229,0.14)',
          }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              {user.full_name.split(' ').slice(-1)[0]?.[0] ?? 'U'}
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>
                Xin chào, <span style={{ color: '#4f46e5' }}>{user.full_name}</span>
                {user.department && <span style={{ color: 'var(--text-3)' }}> · {user.department}</span>}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Quản lý sản xuất Foaming · OVN</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600">Online</span>
          </div>
        </div>

        {/* Tab panels — always mounted, shown/hidden via CSS to avoid blank flash */}
        <div className="relative">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              style={{
                display: activeTab === tab.id ? 'block' : 'none',
              }}
            >
              {tab.id === 'daily-report'             && <DailyReportTab user={user} />}
              {tab.id === 'supplementary-report'     && <SupplementaryReportTab user={user} />}
              {tab.id === 'utilization'              && <UtilizationAnalysisTab user={user} />}
              {tab.id === 'production-progress'      && <ProductionProgressTab user={user} />}
              {tab.id === 'residual'                 && <ResidualMaterialTab user={user} />}
              {tab.id === 'foaming'                  && <FoamingProcessTab user={user} />}
              {tab.id === 'excel-upload'             && <ExcelUploadTab user={user} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Nav (mobile) ───────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-30
        border-t border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-md">
        <div className="flex">
          {visibleTabs.map((tab) => {
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
                    className="absolute inset-x-2 inset-y-1 rounded-xl"
                    style={{ background: `${tab.color}15` }}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
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
