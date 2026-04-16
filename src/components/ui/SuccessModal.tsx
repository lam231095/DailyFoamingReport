'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

interface SuccessModalProps {
  show: boolean
  message?: string
  onDone?: () => void
}

export default function SuccessModal({ show, message = 'Ghi nhận thành công!', onDone }: SuccessModalProps) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => onDone?.(), 2500)
      return () => clearTimeout(t)
    }
  }, [show, onDone])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative flex flex-col items-center gap-5 px-10 py-10 rounded-2xl text-center max-w-xs w-full"
            style={{
              background: 'linear-gradient(135deg, #111827, #1a2540)',
              border: '1px solid rgba(0,82,204,0.3)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,82,204,0.2)',
            }}
          >
            {/* Pulse ring */}
            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
                className="absolute w-20 h-20 rounded-full bg-green-500/30"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.05 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.4)' }}
              >
                <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
              </motion.div>
            </div>

            <div>
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-white"
              >
                {message}
              </motion.p>
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-white/40 mt-1"
              >
                Dữ liệu đã được đồng bộ lên hệ thống
              </motion.p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 rounded-full overflow-hidden bg-white/10">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
                className="h-full rounded-full bg-green-500"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
