'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import ProductionTab from '@/components/tabs/ProductionTab';
import Changelog4MTab from '@/components/tabs/Changelog4MTab';
import TachReportTab from '@/components/tabs/TachReportTab';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, ClipboardList, Settings, HelpCircle, Activity, ClipboardCheck } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('production');

  const tabs = [
    { id: 'production', label: 'Sản Lượng & KPI', icon: LayoutGrid },
    { id: 'tach-report', label: 'Báo Cáo Tách', icon: ClipboardCheck },
    { id: 'changelog', label: 'Biến Động 4M', icon: ClipboardList },
    { id: 'settings', label: 'Cài Đặt', icon: Settings },
    { id: 'help', label: 'Hướng Dẫn', icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 space-y-2">
            <p className="text-xs font-bold text-slate-400 px-4 uppercase tracking-widest mb-4">Menu Chính</p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                      : 'text-slate-500 hover:bg-white dark:hover:bg-slate-900 hover:text-indigo-600'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* Content Area */}
          <section className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'production' && <ProductionTab />}
                {activeTab === 'tach-report' && <TachReportTab />}
                {activeTab === 'changelog' && <Changelog4MTab />}
                {activeTab === 'settings' && (
                  <div className="p-10 glass-card text-center italic text-slate-400">
                    Tính năng Cài Đặt đang được phát triển...
                  </div>
                )}
                {activeTab === 'help' && (
                  <div className="p-10 glass-card text-center italic text-slate-400">
                    Vui lòng xem file Huong_Dan_Su_Dung_Foaming_App.pptx để biết chi tiết.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </main>

      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
        <p>Hệ thống OVN Production - Developed for Ortholite Vietnam &copy; 2026</p>
      </footer>
    </div>
  );
}
