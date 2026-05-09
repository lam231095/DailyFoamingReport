'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ProductionPlan, DailyReport } from '@/types';

export default function ProductionTab() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_plan')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPlans(data);
    }
    setLoading(false);
  };

  const filteredPlans = plans.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.firm_plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 glass-card border-l-4 border-indigo-500 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Tổng mục tiêu tuần</p>
              <h3 className="text-2xl font-bold mt-1">45,200 <span className="text-sm font-normal text-slate-400">tấm</span></h3>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-500">
            <ArrowUpRight size={14} className="mr-1" />
            <span>+12% so với tuần trước</span>
          </div>
        </div>

        <div className="p-6 glass-card border-l-4 border-emerald-500 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Thực tế đã đạt</p>
              <h3 className="text-2xl font-bold mt-1">38,150 <span className="text-sm font-normal text-slate-400">tấm</span></h3>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '84%' }}></div>
          </div>
        </div>

        <div className="p-6 glass-card border-l-4 border-amber-500 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Tổng lỗi độ cứng</p>
              <h3 className="text-2xl font-bold mt-1">
                {plans.reduce((acc, p) => acc + 0, 0)} <span className="text-sm font-normal text-slate-400">lỗi</span>
              </h3>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-amber-600">
            <ArrowUpRight size={14} className="mr-1" />
            <span>Độ cứng trên/dưới chuẩn</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo Firm Plan hoặc Tên Sản Phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={18} />
          Báo cáo sản lượng mới
        </button>
      </div>

      {/* Production List */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-collapse bg-white dark:bg-slate-950">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Firm Plan / Bun</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Mục tiêu (Tấm)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Thực tế</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Tiến độ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">Đang tải dữ liệu...</td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">Không tìm thấy kế hoạch nào.</td>
              </tr>
            ) : filteredPlans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{plan.firm_plan}</div>
                  <div className="text-xs text-slate-500">{plan.bun_code}</div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate font-medium text-sm" title={plan.product_name}>
                  {plan.product_name}
                </td>
                <td className="px-6 py-4 text-center font-mono font-bold text-indigo-600">
                  {plan.target_sheets.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center font-mono font-bold">
                  {/* Placeholder for actual data */}
                  0
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                    <span className="text-xs font-bold w-8 text-right">0%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                    plan.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {plan.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
