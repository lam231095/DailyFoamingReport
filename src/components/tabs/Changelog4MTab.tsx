'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Settings, 
  Package, 
  Activity,
  Plus,
  MessageSquare
} from 'lucide-react';

export default function Changelog4MTab() {
  const [logs, setLogs] = useState([
    { id: 1, type: 'Machine', description: 'Máy ép số 5 bảo trì định kỳ, dự kiến xong 14h', time: '10:30 AM', user: 'Lâm Supervisor' },
    { id: 2, type: 'Man', description: 'Chuyền 1 thiếu 2 công nhân, đã điều động từ Chuyền 3', time: '08:15 AM', user: 'Lâm Supervisor' },
    { id: 3, type: 'Material', description: 'Lô cao su mới có độ đàn hồi thấp hơn 5%, cần điều chỉnh nhiệt độ', time: 'Hôm qua', user: 'QC Team' },
  ]);

  const categories = [
    { id: 'Man', label: 'Con người', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'Machine', label: 'Máy móc', icon: Settings, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'Material', label: 'Nguyên liệu', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'Method', label: 'Phương pháp', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Biến Động 4M</h2>
        <button className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-pink-100 dark:shadow-none">
          <Plus size={18} />
          Ghi nhận biến động
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id} className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm glass-card hover:scale-105 transition-transform cursor-pointer`}>
              <div className={`w-10 h-10 ${cat.bg} ${cat.color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <p className="font-bold text-sm">{cat.label}</p>
              <p className="text-xs text-slate-500 mt-1">2 ghi nhận mới</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dòng thời gian biến động</p>
        
        {logs.map((log) => {
          const cat = categories.find(c => c.id === log.type);
          const Icon = cat?.icon || MessageSquare;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={log.id} 
              className="flex gap-4 p-4 glass-card border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
            >
              <div className={`w-12 h-12 shrink-0 rounded-full ${cat?.bg} ${cat?.color} flex items-center justify-center`}>
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{log.type} - {cat?.label}</h4>
                  <span className="text-xs text-slate-400 font-medium">{log.time}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                  {log.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">USER: {log.user}</span>
                </div>
              </div>
              <div className={`absolute right-0 top-0 bottom-0 w-1 ${cat?.bg.replace('/20', '')} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
