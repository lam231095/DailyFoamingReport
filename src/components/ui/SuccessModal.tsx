'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function SuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm p-8 glass-card text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 premium-gradient rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h3 className="text-2xl font-bold mb-2">Thành Công!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">{message}</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity"
            >
              ĐÓNG
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
