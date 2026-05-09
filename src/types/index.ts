export interface User {
  id: string;
  msnv: string;
  full_name: string;
  department: string;
  role: 'worker' | 'supervisor' | 'qc' | 'admin' | 'manager';
  created_at?: string;
}

export type SessionUser = User;

export interface SKU {
  id: string;
  firm_plan: string;
  bun_code: string | null;
  pu_code: string | null;
  ten_san_pham: string | null;
}

export interface ResidualMaterial {
  id: string;
  user_id: string;
  stage: 'Foaming Đổ' | 'Foaming Tách';
  material_name: string;
  initial_quantity: number;
  current_quantity: number;
  unit: 'tấm' | 'bun';
  entry_date: string;
  created_at: string;
  users?: { msnv: string; full_name: string };
}

export interface ResidualMaterialUsage {
  id: string;
  material_id: string;
  user_id: string;
  used_quantity: number;
  used_at: string;
  residual_materials?: ResidualMaterial;
  users?: { msnv: string; full_name: string };
}

export interface ProductionPlan {
  id: string;
  firm_plan: string;
  bun_code: string | null;
  pu_code: string | null;
  ten_san_pham: string | null;
  product_name?: string | null; // Alias
  sl_sheet: number | null;
  target_sheets?: number | null; // Alias
  sl_bun_can_tach: number | null;
  target_buns_tach?: number | null; // Alias
  sl_bun_can_do: number | null;
  target_buns_do?: number | null; // Alias
  no_order: string | null;
  completion_date: string | null;
  delivery_date: string | null;
  week_label: string;
  week_info?: string; // Alias
  synced_at: string;
  status?: 'pending' | 'in_progress' | 'completed';
  created_at?: string;
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

export type ChangeLog = Change4M;

export interface FoamingPourReport {
  id: string;
  firm_plan: string;
  shift: string;
  machine_id: string | null;
  operator_name: string | null;
  actual_bun_poured: number;
  ng_bun_qty: number;
  error_type: string | null;
  cleaning_agent_used?: boolean;
  waste_kg?: number;
  note?: string | null;
  recorder_id: string;
  created_at: string;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
}

export interface FoamingSeparateReport {
  id: string;
  firm_plan: string;
  shift: string;
  machine_id: string | null;
  operator_name: string | null;
  bun_thickness_mm: number | null;
  sheet_thickness_mm: number | null;
  actual_bun_separated: number;
  actual_sheet_received: number;
  lot_no: string | null;
  ng_qty: number;
  ng_bun_qty: number;
  error_type: string | null;
  recorder_id: string;
  created_at: string;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
}

export interface FoamingWarehouseReport {
  id: string;
  firm_plan: string;
  qty_delivered_sheet: number;
  delivery_date: string;
  ng_bun_qty: number;
  error_type: string | null;
  deliverer_id: string;
  created_at: string;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
}

export type ProductionReport = FoamingPourReport | FoamingSeparateReport | FoamingWarehouseReport;
