export interface WeeklySalesRecord {
  store_id: string;
  week: string;
  net_sales: number;
  target_sales: number;
  transactions: number;
  return_amount: number;
  discount_amount: number;
  gross_sales: number;
  product_category: string;
  stockout_incidents: number;
  footfall?: number;
  units_sold?: number;
  inventory_on_hand?: number;
  customer_rating?: number;
  marketing_spend?: number;
}

export interface StoreMasterRecord {
  store_id: string;
  store_name: string;
  region: string;
  city: string;
  store_format: string;
}

export interface JoinedRecord extends WeeklySalesRecord, StoreMasterRecord {
  id: string;
}

export interface FilterState {
  weeks: string[];
  regions: string[];
  stores: string[];
  cities: string[];
  storeFormats: string[];
  categories: string[];
}

export interface DashboardMetrics {
  totalNetSales: number;
  totalTargetSales: number;
  targetAchievement: number;
  averageTransactionValue: number;
  returnRate: number;
  discountRate: number;
  totalReturnAmount: number;
  totalDiscountAmount: number;
  totalGrossSales: number;
  totalTransactions: number;
  highStockoutRiskCount: number;
  totalStockoutIncidents: number;
}

export interface RegionPerformance {
  region: string;
  netSales: number;
  targetSales: number;
  targetAchievement: number;
}

export interface CategoryPerformance {
  category: string;
  netSales: number;
  returnAmount: number;
  returnRate: number;
}

export interface WeeklyTrend {
  week: string;
  netSales: number;
  targetSales: number;
}

export interface StorePerformance {
  store_id: string;
  store_name: string;
  region: string;
  city: string;
  store_format: string;
  netSales: number;
  targetSales: number;
  targetAchievement: number;
  returnRate: number;
  stockoutIncidents: number;
  stockoutRisk: "High" | "Normal";
}
