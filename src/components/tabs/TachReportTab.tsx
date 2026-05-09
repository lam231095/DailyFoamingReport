'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ProductionPlan, DailyReport, User } from '@/types';
import { 
  ClipboardCheck, 
  Search, 
  Plus, 
  History, 
  AlertTriangle, 
  CheckCircle2,
  HardHat,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessModal from '@/components/ui/SuccessModal';

export default function TachReportTab() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    actual_sheets: 0,
    actual_buns: 0,
    shift: 'Ca 1',
    error_hardness_above: 0,
    error_hardness_below: 0,
    notes: ''
  });

  useEffect(() => {
    const session = localStorage.getItem('ovn_session');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch only plans that have target_buns_tach > 0
    const { data: planData } = await supabase
      .from('production_plan')
      .select('*')
      .gt('target_buns_tach', 0)
      .order('created_at', { ascending: false });

    if (planData) setPlans(planData);

    // Fetch recent reports
    const { data: reportData } = await supabase
      .from('daily_reports')
      .select('*, production_plan(firm_plan, bun_code, product_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (reportData) setReports(reportData as any);
    
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !currentUser) return;

    const { error } = await supabase.from('daily_reports').insert({
      plan_id: selectedPlan.id,
      worker_id: currentUser.id,
      actual_sheets: formData.actual_sheets,
      actual_buns: formData.actual_buns,
      shift: formData.shift,
      error_hardness_above: formData.error_hardness_above,
      error_hardness_below: formData.error_hardness_below,
      notes: formData.notes,
      kpi_score: 10, // Placeholder KPI
      report_date: new Date().toISOString().split('T')[0]
    });

    if (!error) {
      setIsModalOpen(false);
      setIsSuccessOpen(true);
      fetchData();
      // Reset form
      setFormData({
        actual_sheets: 0,
        actual_buns: 0,
        shift: 'Ca 1',
        error_hardness_above: 0,
        error_hardness_below: 0,
        notes: ''
      });
    } else {
      alert('Có lỗi xảy ra: ' + error.message);
    }
  };

  const filteredPlans = plans.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.firm_plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Báo Cáo Tách</h2>
          <p className="text-slate-500 text-sm mt-1">Nhập sản lượng và lỗi độ cứng hàng ngày</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kế hoạch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Selection */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kế hoạch cần báo cáo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-20 text-center text-slate-400 italic">Đang tải dữ liệu...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="col-span-2 py-20 text-center text-slate-400 italic">Không tìm thấy kế hoạch nào cần tách.</div>
            ) : filteredPlans.map(plan => (
              <div 
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan);
                  setIsModalOpen(true);
                }}
                className="p-5 glass-card border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{plan.firm_plan}</h4>
                    <p className="text-xs text-slate-500 font-mono">{plan.bun_code}</p>
                  </div>
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mb-4 h-10">
                  {plan.product_name}
                </p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Mục tiêu Tách</p>
                    <p className="font-mono font-bold text-indigo-600">{plan.target_buns_tach}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Mục tiêu Tấm</p>
                    <p className="font-mono font-bold text-slate-600">{plan.target_sheets}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-500" style={{ width: '30%' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hoạt động gần đây</p>
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="p-4 glass-card border border-slate-200 dark:border-slate-800 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">{(report as any).production_plan?.firm_plan}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold uppercase">{report.shift}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Thực tế: <span className="font-bold text-slate-900 dark:text-slate-100">{report.actual_buns} bun</span></span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded">
                    TRÊN: {report.error_hardness_above || 0}
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-1 rounded">
                    DƯỚI: {report.error_hardness_below || 0}
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reporting Modal */}
      <AnimatePresence>
        {isModalOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 premium-gradient text-white">
                <h3 className="text-xl font-bold">Báo Cáo Tách: {selectedPlan.firm_plan}</h3>
                <p className="text-white/80 text-sm">{selectedPlan.product_name}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ca làm việc</label>
                    <select 
                      value={formData.shift}
                      onChange={(e) => setFormData({...formData, shift: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Ca 1</option>
                      <option>Ca 2</option>
                      <option>Ca 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ngày báo cáo</label>
                    <input type="text" value={new Date().toLocaleDateString('vi-VN')} disabled className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-3">
                      <ClipboardCheck size={14} /> Sản lượng thực tế (Bun)
                    </label>
                    <input 
                      type="number" 
                      value={formData.actual_buns}
                      onChange={(e) => setFormData({...formData, actual_buns: parseInt(e.target.value) || 0})}
                      className="w-full text-2xl font-bold bg-transparent outline-none"
                    />
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3">
                      <Scale size={14} /> Số tấm thực tế
                    </label>
                    <input 
                      type="number" 
                      value={formData.actual_sheets}
                      onChange={(e) => setFormData({...formData, actual_sheets: parseInt(e.target.value) || 0})}
                      className="w-full text-2xl font-bold bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Báo cáo lỗi độ cứng (QC)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                      <label className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-3">
                        <AlertTriangle size={14} /> Độ cứng trên chuẩn
                      </label>
                      <input 
                        type="number" 
                        value={formData.error_hardness_above}
                        onChange={(e) => setFormData({...formData, error_hardness_above: parseInt(e.target.value) || 0})}
                        className="w-full text-2xl font-bold bg-transparent outline-none"
                        placeholder="Số lượng..."
                      />
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/40">
                      <label className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-3">
                        <AlertTriangle size={14} /> Độ cứng dưới chuẩn
                      </label>
                      <input 
                        type="number" 
                        value={formData.error_hardness_below}
                        onChange={(e) => setFormData({...formData, error_hardness_below: parseInt(e.target.value) || 0})}
                        className="w-full text-2xl font-bold bg-transparent outline-none"
                        placeholder="Số lượng..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ghi chú thêm</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập ghi chú nếu có..."
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    HỦY BỎ
                  </button>
                  <button 
                    type="submit" 
                    className="flex-2 py-3 px-8 rounded-xl premium-gradient text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-opacity"
                  >
                    LƯU BÁO CÁO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SuccessModal 
        isOpen={isSuccessOpen} 
        onClose={() => setIsSuccessOpen(false)} 
        message="Báo cáo sản lượng tách đã được lưu thành công vào hệ thống!" 
      />
    </div>
  );
}
