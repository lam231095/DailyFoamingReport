'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Scissors, Warehouse } from 'lucide-react'
import { ProductionPlan, SessionUser } from '@/types'
import FoamingHeader from '../foaming/FoamingHeader'
import PourForm from '../foaming/PourForm'
import SeparateForm from '../foaming/SeparateForm'
import WarehouseForm from '../foaming/WarehouseForm'

const STAGES = [
  { id: 'pour', label: 'C.Đoạn ĐỔ', icon: Droplets, color: '#3b82f6' },
  { id: 'separate', label: 'C.Đoạn TÁCH', icon: Scissors, color: '#a855f7' },
  { id: 'warehouse', label: 'NHẬP KHO', icon: Warehouse, color: '#10b981' },
]

interface FoamingProcessTabProps {
  user: SessionUser
}

export default function FoamingProcessTab({ user }: FoamingProcessTabProps) {
  const [activeStage, setActiveStage] = useState('pour')
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null)

  const handlePlanFound = (plan: ProductionPlan | null) => {
    setSelectedPlan(plan)
  }

  const handleSuccess = () => {
    setSelectedPlan(null) // Reset form sau khi lưu thành công
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <FoamingHeader onPlanFound={handlePlanFound} />

      <div className="flex bg-[var(--bg-card)] rounded-2xl p-1.5 border border-[var(--border)] shadow-sm">
        {STAGES.map((stage) => {
          const active = activeStage === stage.id
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className="relative flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-300"
            >
              {active && (
                <motion.div
                  layoutId="active-stage-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: `${stage.color}15`, border: `1px solid ${stage.color}40` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <stage.icon
                size={18}
                style={{ color: active ? stage.color : 'var(--text-3)' }}
                className="relative z-10"
              />
              <span
                className="text-[10px] font-bold uppercase tracking-tight relative z-10"
                style={{ color: active ? stage.color : 'var(--text-2)' }}
              >
                {stage.label}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {!selectedPlan ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col items-center justify-center py-20 px-8 text-center bg-[var(--bg-card)]/40 rounded-3xl border-2 border-dashed border-[var(--border)]"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4 text-[var(--text-3)]">
              {(() => {
                const Icon = STAGES.find(s => s.id === activeStage)?.icon
                return Icon ? <Icon size={32} /> : null
              })()}
            </div>
            <h4 className="text-[var(--text-2)] font-bold mb-1">Vui lòng tìm mã đơn hàng</h4>
            <p className="text-xs text-[var(--text-3)] max-w-[240px]">
              Nhập mã FPRO hoặc RPRO ở ô tìm kiếm phía trên để bắt đầu báo cáo sản xuất
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={activeStage}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeStage === 'pour' && (
              <PourForm plan={selectedPlan} user={user} onSuccess={handleSuccess} />
            )}
            {activeStage === 'separate' && (
              <SeparateForm plan={selectedPlan} user={user} onSuccess={handleSuccess} />
            )}
            {activeStage === 'warehouse' && (
              <WarehouseForm plan={selectedPlan} user={user} onSuccess={handleSuccess} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
