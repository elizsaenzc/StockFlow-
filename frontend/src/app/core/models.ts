export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  fullName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category  { id: number; name: string; color: string; }
export interface Location  { id: number; name: string; address?: string; city?: string; manager?: string; product_count: number; stock_value: number; }

export interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  country: string;
  lead_time: number;
  payment_terms?: string;
  notes?: string;
  score: number;
  active: number;
  product_count?: number;
  open_orders?: number;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  supplier_id?: number;
  supplier_name?: string;
  unit: string;
  stock: number;
  min_stock: number;
  max_stock?: number;
  reorder_point?: number;
  reorder_qty?: number;
  cost_price: number;
  sale_price: number;
  location_id?: number;
  location_name?: string;
  shelf?: string;
  active: number;
  stock_status: 'ok' | 'low' | 'out';
  created_at: string;
  updated_at: string;
}

export type MovementType = 'in' | 'out' | 'adjust' | 'transfer';

export interface Movement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  location_name?: string;
  type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason?: string;
  reference?: string;
  username?: string;
  created_at: string;
}

export interface POLine {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  location_id?: number;
  location_name?: string;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  expected_at?: string;
  received_at?: string;
  total: number;
  notes?: string;
  created_by_name?: string;
  created_at: string;
  lines: POLine[];
}

export interface DashboardData {
  kpis: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    totalSuppliers: number;
    openOrders: number;
    stockValue: number;
    saleValue: number;
    movToday: number;
  };
  recentMovements: Movement[];
  lowStockItems: Product[];
  byCategory: { name: string; color: string; product_count: number; stock_value: number }[];
  movChart: { day: string; entries: number; exits: number }[];
  topMoved: { id: number; name: string; sku: string; unit: string; movement_count: number; total_qty: number }[];
  pendingOrders: PurchaseOrder[];
}

export interface AnalyticsData {
  turnover: any[];
  stockByCategory: any[];
  dailyChart: any[];
  supplierPerf: any[];
  deadStock: any[];
}
