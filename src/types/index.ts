export interface User {
  id: string;
  msnv: string;
  full_name: string;
  department: string | null;
  role: string;
  is_active: boolean;
}

export interface SKU {
  id: string;
  product_type: string;
  target_per_hour: number;
  unit: string;
  is_active: boolean;
  updated_at: string;
}

export interface ProductionReport {
  id: string;
  user_id: string;
  sku_id: string;
  working_hours: number;
  actual_quantity: number;
  productivity_points: number;
  report_date: string;
  note: string | null;
  created_at: string;
  shift?: string | null;
  skus?: SKU;
  users?: { msnv: string; full_name: string };
}

export interface ChangeLog {
  id: string;
  user_id: string;
  machine_id: string;
  category: '4M_Category';
  description: string;
  affects_quality: boolean;
  severity: 'low' | 'medium' | 'high';
  logged_at: string;
  shift?: string | null;
  users?: { msnv: string; full_name: string };
}

export type FourMCategory = 'Man' | 'Machine' | 'Material' | 'Method';

export interface SessionUser {
  id: string;
  msnv: string;
  full_name: string;
  department: string | null;
  role: string;
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
  sl_sheet: number | null;
  sl_bun_can_tach: number | null;
  sl_bun_can_do: number | null;
  week_label: string;
  synced_at: string;
}

export interface FoamingPourReport {
  id: string;
  firm_plan: string;
  shift: string;
  actual_bun_poured: number;
  lot_no: string | null;
  recorder_id: string;
  created_at: string;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
}

export interface FoamingSeparateReport {
  id: string;
  firm_plan: string;
  shift: string;
  actual_bun_separated: number;
  actual_sheet_received: number;
  lot_no: string | null;
  ng_qty: number;
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
  deliverer_id: string;
  created_at: string;
  production_plan?: ProductionPlan;
  users?: { msnv: string; full_name: string };
}
