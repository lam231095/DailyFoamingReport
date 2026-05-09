export interface User {
  id: string;
  msnv: string;
  full_name: string;
  department: string;
  role: 'worker' | 'supervisor' | 'qc';
  created_at?: string;
}

export type SessionUser = User;

export interface ProductionPlan {
  id: string;
  week_info: string;
  firm_plan: string;
  bun_code: string;
  pu_code: string;
  product_name: string;
  target_sheets: number;
  target_buns_tach: number;
  target_buns_do: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at?: string;
  
  // Tên cũ hỗ trợ cho các component foaming
  ten_san_pham?: string;
  sl_bun_can_do?: number;
  sl_sheet?: number;
  sl_bun_can_tach?: number;
  no_order?: string;
  week_label?: string;
  completion_date?: string;
  delivery_date?: string;
}

export interface DailyReport {
  id: string;
  plan_id: string;
  worker_id: string;
  actual_sheets: number;
  actual_buns: number;
  shift: string;
  report_date: string;
  kpi_score: number;
  error_hardness_above?: number;
  error_hardness_below?: number;
  notes?: string;
  created_at?: string;
}

export interface Change4M {
  id: string;
  type: 'Man' | 'Machine' | 'Material' | 'Method';
  description: string;
  reported_by: string;
  created_at?: string;
}
