'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera, RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (decodedText: string) => void
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (isOpen) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  const startScanner = async () => {
    setIsInitializing(true)
    setError(null)
    
    try {
      // Small delay to ensure the DOM element is ready
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const html5QrCode = new Html5Qrcode("qr-reader")
      scannerRef.current = html5QrCode

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      await html5QrCode.start(
        { facingMode: "environment" }, // Prioritize back camera
        config,
        (decodedText) => {
          onScanSuccess(decodedText)
          stopScanner()
          onClose()
        },
        (errorMessage) => {
          // Ignore frequent "No QR code detected" errors
        }
      )
      
      setHasPermission(true)
    } catch (err: any) {
      console.error("Scanner initialization failed:", err)
      if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission denied")) {
        setError("Bạn cần cho phép truy cập camera để quét mã QR.")
        setHasPermission(false)
      } else {
        setError("Không thể khởi động camera. Vui lòng thử lại hoặc dùng trình duyệt khác.")
      }
    } finally {
      setIsInitializing(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (err) {
        console.error("Failed to stop scanner:", err)
      }
    }
  }

  const handleRetry = () => {
    stopScanner().then(() => startScanner())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-[var(--bg-card)] rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)]"
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)]">
          <h3 className="font-bold text-[var(--text-1)] flex items-center gap-2">
            <Camera size={18} className="text-brand-500" />
            Quét mã QR đơn hàng
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[var(--text-3)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative aspect-square bg-black flex items-center justify-center">
          <div id="qr-reader" className="w-full h-full" />
          
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-white gap-3">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Đang khởi động camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-card)] p-8 text-center">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <p className="text-[var(--text-1)] font-bold mb-2">Lỗi Camera</p>
              <p className="text-[var(--text-3)] text-sm mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all active:scale-95"
              >
                <RotateCcw size={16} /> Thử lại
              </button>
            </div>
          )}

          {/* Overlay scanner effect */}
          {!isInitializing && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-brand-500/50 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-500 rounded-br-xl" />
                
                {/* Scanning line animation */}
                <motion.div 
                  animate={{ top: ['10%', '90%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-4 right-4 h-0.5 bg-brand-500/50 shadow-[0_0_15px_rgba(var(--brand-500-rgb),0.5)]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-[var(--bg-card)]">
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
              Hãy đưa mã QR vào khung ngắm để hệ thống tự động quét. Đảm bảo ánh sáng đủ tốt để camera nhận diện chính xác.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
