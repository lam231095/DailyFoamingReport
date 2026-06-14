export interface User {
  id: string;
  msnv: string;
  full_name: string;
  department: string | null;
  role: string;
  position?: string;
  is_active?: boolean;
  created_at?: string;
}

export type SessionUser = User;

export interface SKU {
  id: string;
  firm_plan?: string;
  bun_code?: string | null;
  pu_code?: string | null;
  ten_san_pham?: string | null;
  product_type?: string;
  unit?: string;
  target_per_hour?: number;
  is_active?: boolean;
  updated_at?: string;
}

export interface ResidualMaterial {
  id: string;
  user_id: string;
  bun_code: string;
  material_name?: string | null;
  color?: string | null;
  density?: string | null;
  hardness?: string | null;
  powder?: string | null;
  length?: string | null;
  initial_quantity: number;
  current_quantity: number;
  unit: 'bun';
  machine_id?: string | null;
  shift?: string | null;
  manager_name?: string | null;
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

export interface ChangeLog {
  id: string;
  user_id: string;
  machine_id: string;
  category: string;
  description: string;
  affects_quality: boolean;
  severity: 'low' | 'medium' | 'high';
  logged_at: string;
  shift?: string | null;
  users?: { msnv: string; full_name: string };
  // Alias for 4M compatibility
  type?: string;
  reported_by?: string;
  created_at?: string;
}

export type FourMCategory = 'Man' | 'Machine' | 'Material' | 'Method';

export interface FoamingPourReport {
  id: string;
  firm_plan: string;
  shift: string;
  machine_id: string | null;
  operator_name: string | null;
  actual_bun_poured: number;
  manager_name?: string | null;
  ng_bun_qty: number;
  error_type: string | null;
  cleaning_agent_kg?: number;
  waste_kg?: number;
  storage_location?: string;
  storage_line?: string;
  color_tag?: string;
  storage_carts?: number;
  note?: string | null;
  is_compensation?: boolean;
  downtime_reason?: string | null;
  downtime_start?: string | null;
  downtime_end?: string | null;
  downtime_duration?: number | null;
  recorder_id: string;
  created_at: string;
  report_date?: string;
  working_hours?: number;
  actual_quantity?: number;
  productivity_points?: number;
  is_pc_confirmed?: boolean;
  pc_confirmed_at?: string | null;
  pc_confirmed_by?: string | null;
  pc_note?: string | null;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
  skus?: SKU;
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
  manager_name?: string | null;
  lot_no: string | null;
  ng_qty: number;
  ng_bun_qty: number;
  error_type: string | null;
  error_hardness_above?: number;
  error_hardness_below?: number;
  recorder_id: string;
  created_at: string;
  report_date?: string;
  working_hours?: number;
  actual_quantity?: number;
  productivity_points?: number;
  note?: string | null;
  product_type?: string;
  product_type_abbrev?: string | null;
  is_compensation?: boolean;
  downtime_reason?: string | null;
  downtime_start?: string | null;
  downtime_end?: string | null;
  downtime_duration?: number | null;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
  skus?: SKU;
}

export interface FoamingWarehouseReport {
  id: string;
  firm_plan: string;
  shift?: string;
  qty_delivered_sheet: number;
  delivery_date: string;
  ng_bun_qty: number;
  error_type: string | null;
  deliverer_id: string;
  created_at: string;
  report_date?: string;
  working_hours?: number;
  actual_quantity?: number;
  productivity_points?: number;
  note?: string | null;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
  skus?: SKU;
}

export type ProductionReport = FoamingPourReport | FoamingSeparateReport | FoamingWarehouseReport;
