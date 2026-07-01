import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { JoinedRecord, WeeklyTrend, RegionPerformance, CategoryPerformance, StorePerformance } from "../types";
import { ArrowUpRight, ArrowDownRight, Award, AlertTriangle, ChevronRight, BarChart3, TrendingUp, ShieldAlert } from "lucide-react";

interface DashboardChartsProps {
  data: JoinedRecord[];
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  const [leaderboardMetric, setLeaderboardMetric] = useState<"sales" | "achievement">("sales");

  // --- Formatting Helpers ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  // --- Data aggregation ---

  // 1. Weekly sales trend
  const weeklyMap: Record<string, { netSales: number; targetSales: number }> = {};
  data.forEach((row) => {
    if (!weeklyMap[row.week]) {
      weeklyMap[row.week] = { netSales: 0, targetSales: 0 };
    }
    weeklyMap[row.week].netSales += row.net_sales;
    weeklyMap[row.week].targetSales += row.target_sales;
  });
  const weeklyTrendData: WeeklyTrend[] = Object.keys(weeklyMap)
    .map((w) => ({
      week: w,
      netSales: weeklyMap[w].netSales,
      targetSales: weeklyMap[w].targetSales,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // 2. Sales by region
  const regionMap: Record<string, { netSales: number; targetSales: number }> = {};
  data.forEach((row) => {
    if (!regionMap[row.region]) {
      regionMap[row.region] = { netSales: 0, targetSales: 0 };
    }
    regionMap[row.region].netSales += row.net_sales;
    regionMap[row.region].targetSales += row.target_sales;
  });
  const regionData: RegionPerformance[] = Object.keys(regionMap).map((reg) => ({
    region: reg,
    netSales: regionMap[reg].netSales,
    targetSales: regionMap[reg].targetSales,
    targetAchievement: regionMap[reg].targetSales > 0 ? (regionMap[reg].netSales / regionMap[reg].targetSales) * 100 : 0,
  })).sort((a, b) => b.netSales - a.netSales);

  // 3. Category performance
  const categoryMap: Record<string, { netSales: number; returnAmount: number }> = {};
  data.forEach((row) => {
    if (!categoryMap[row.product_category]) {
      categoryMap[row.product_category] = { netSales: 0, returnAmount: 0 };
    }
    categoryMap[row.product_category].netSales += row.net_sales;
    categoryMap[row.product_category].returnAmount += row.return_amount;
  });
  const categoryData: CategoryPerformance[] = Object.keys(categoryMap).map((cat) => ({
    category: cat,
    netSales: categoryMap[cat].netSales,
    returnAmount: categoryMap[cat].returnAmount,
    returnRate: categoryMap[cat].netSales > 0 ? (categoryMap[cat].returnAmount / categoryMap[cat].netSales) * 100 : 0,
  })).sort((a, b) => b.netSales - a.netSales);

  // 4. Store Leaderboard & Stockout Aggregates
  const storeMap: Record<
    string,
    {
      storeName: string;
      region: string;
      city: string;
      storeFormat: string;
      netSales: number;
      targetSales: number;
      returnAmount: number;
      stockoutIncidents: number;
    }
  > = {};

  data.forEach((row) => {
    if (!storeMap[row.store_id]) {
      storeMap[row.store_id] = {
        storeName: row.store_name,
        region: row.region,
        city: row.city,
        storeFormat: row.store_format,
        netSales: 0,
        targetSales: 0,
        returnAmount: 0,
        stockoutIncidents: 0,
      };
    }
    storeMap[row.store_id].netSales += row.net_sales;
    storeMap[row.store_id].targetSales += row.target_sales;
    storeMap[row.store_id].returnAmount += row.return_amount;
    // We sum stockout incidents or look at the max stockout incident in any week/category combination
    // To make a realistic stockout risk per store, let's take the MAX stockout incidents recorded for this store in any single week/category
    storeMap[row.store_id].stockoutIncidents = Math.max(storeMap[row.store_id].stockoutIncidents, row.stockout_incidents);
  });

  const storePerformanceList: StorePerformance[] = Object.keys(storeMap).map((sid) => {
    const s = storeMap[sid];
    const achievement = s.targetSales > 0 ? (s.netSales / s.targetSales) * 100 : 0;
    const returnRate = s.netSales > 0 ? (s.returnAmount / s.netSales) * 100 : 0;
    return {
      store_id: sid,
      store_name: s.storeName,
      region: s.region,
      city: s.city,
      store_format: s.storeFormat,
      netSales: s.netSales,
      targetSales: s.targetSales,
      targetAchievement: achievement,
      returnRate,
      stockoutIncidents: s.stockoutIncidents,
      stockoutRisk: s.stockoutIncidents > 5 ? "High" : "Normal",
    };
  });

  // Sort by selected leaderboard metric
  const sortedStores = [...storePerformanceList].sort((a, b) => {
    if (leaderboardMetric === "sales") {
      return b.netSales - a.netSales;
    } else {
      return b.targetAchievement - a.targetAchievement;
    }
  });

  const topStores = sortedStores.slice(0, 5);
  // Bottom stores (reverse order of top, or bottom 5)
  const bottomStores = [...sortedStores].reverse().slice(0, 5);

  // Stockout Risk data points - group stockouts by store and show them
  // We can sort stores by stockout incidents to see who is at risk
  const stockoutRiskData = [...storePerformanceList]
    .sort((a, b) => b.stockoutIncidents - a.stockoutIncidents)
    .slice(0, 10); // top 10 stores with highest stockout issues

  return (
    <div id="dashboard-charts-container" className="space-y-6">
      
      {/* Chart Section Row 1: Weekly Trend & Region Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Weekly Sales Trend Chart */}
        <div id="chart-weekly-trend" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Weekly Sales Trend vs Target
            </h3>
            <p className="text-[11px] text-slate-400">Weekly progression of actual performance against targets</p>
          </div>
          <div className="h-72 w-full">
            {weeklyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="netSales" name="Net Sales" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  <Line type="monotone" dataKey="targetSales" name="Target Sales" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No trend data available</div>
            )}
          </div>
        </div>

        {/* 2. Sales by Region Chart */}
        <div id="chart-sales-by-region" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              Regional Sales & Targets
            </h3>
            <p className="text-[11px] text-slate-400">Regional sales volumes contrasted with performance quotas</p>
          </div>
          <div className="h-72 w-full">
            {regionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="region" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #f1f5f9" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="netSales" name="Net Sales" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="targetSales" name="Target Sales" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No region data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section Row 2: Category Performance & Stockout Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Category Performance Chart (Dual Axis: Sales & Return Rate) */}
        <div id="chart-category-performance" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              Category Sales & Return Rates
            </h3>
            <p className="text-[11px] text-slate-400">Comparative revenue against quality-control return percentage</p>
          </div>
          <div className="h-72 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={categoryData} margin={{ top: 10, right: -5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    yAxisId="left"
                    stroke="#4f46e5" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#f43f5e" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val.toFixed(0)}%`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const sales = payload[0]?.value;
                        const returnRate = payload[1]?.value;
                        return (
                          <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm text-xs space-y-1">
                            <p className="font-semibold text-slate-800">{payload[0]?.payload.category}</p>
                            <p className="flex justify-between gap-4 text-slate-600">
                              <span>Net Sales:</span>
                              <strong className="text-indigo-600">{formatCurrency(Number(sales))}</strong>
                            </p>
                            <p className="flex justify-between gap-4 text-slate-600">
                              <span>Return Rate:</span>
                              <strong className="text-rose-600">{Number(returnRate).toFixed(2)}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar yAxisId="left" dataKey="netSales" name="Net Sales" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="returnRate" name="Return Rate %" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                  <ReferenceLine yAxisId="right" y={5} stroke="#fda4af" strokeDasharray="3 3" label={{ value: '5% Max Return Limit', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No category data available</div>
            )}
          </div>
        </div>

        {/* 4. Stockout Risk Chart */}
        <div id="chart-stockout-risk" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Stockout Incidents & Risk Evaluator
            </h3>
            <p className="text-[11px] text-slate-400">Stores with stockouts near or exceeding high-risk levels (&gt; 5 incidents)</p>
          </div>
          <div className="h-72 w-full">
            {stockoutRiskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockoutRiskData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="store_name" stroke="#94a3b8" fontSize={9} interval={0} tickFormatter={(val) => val.split(" ")[0]} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 10]}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const store = payload[0]?.payload;
                        return (
                          <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm text-xs space-y-1">
                            <p className="font-semibold text-slate-800">{store.store_name}</p>
                            <p className="text-[10px] text-slate-400">Format: {store.store_format} • Region: {store.region}</p>
                            <p className="flex justify-between gap-4 text-slate-600 pt-1">
                              <span>Max Incidents:</span>
                              <strong className={store.stockoutIncidents > 5 ? "text-rose-600 font-bold" : "text-slate-700 font-bold"}>
                                {store.stockoutIncidents}
                              </strong>
                            </p>
                            <p className="flex justify-between gap-4 text-slate-600">
                              <span>Risk Tier:</span>
                              <strong className={store.stockoutIncidents > 5 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                                {store.stockoutIncidents > 5 ? "High Risk ⚠️" : "Normal ✅"}
                              </strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="stockoutIncidents" 
                    name="Stockout Incidents" 
                    fill="#f43f5e" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={25}
                  >
                    {/* Color bars conditionally based on risk value */}
                    {stockoutRiskData.map((entry, index) => (
                      <rect 
                        key={`rect-${index}`} 
                        fill={entry.stockoutIncidents > 5 ? "#ef4444" : "#fbbf24"} 
                      />
                    ))}
                  </Bar>
                  <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Risk Threshold (> 5)', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No stockout incidents reported</div>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Bento Grid Section */}
      <div id="section-leaderboard" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              Store Leaderboard (Rankings)
            </h3>
            <p className="text-[11px] text-slate-400">Highlighting our most productive nodes vs operations requiring optimization</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="btn-metric-sales"
              onClick={() => setLeaderboardMetric("sales")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                leaderboardMetric === "sales" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              By Net Sales
            </button>
            <button
              id="btn-metric-achieve"
              onClick={() => setLeaderboardMetric("achievement")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                leaderboardMetric === "achievement" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              By Target Achievement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 5 Stores */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100/50 flex items-center justify-between">
              <span>Top 5 Stores (Leaders)</span>
              <ArrowUpRight className="w-4 h-4" />
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
              {topStores.map((store, index) => (
                <div key={store.store_id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{store.store_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {store.city} • {store.store_format}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <p className="text-xs font-bold text-slate-800">
                      {leaderboardMetric === "sales" 
                        ? formatCurrency(store.netSales) 
                        : formatPercent(store.targetAchievement)
                      }
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {leaderboardMetric === "sales"
                        ? `Achieved: ${store.targetAchievement.toFixed(0)}%`
                        : `Net Sales: ${formatCurrency(store.netSales)}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 5 Stores */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100/50 flex items-center justify-between">
              <span>Lagging 5 Stores (Remedial Action)</span>
              <ArrowDownRight className="w-4 h-4" />
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
              {bottomStores.map((store, index) => (
                <div key={store.store_id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{store.store_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {store.city} • {store.store_format}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <p className="text-xs font-bold text-slate-800">
                      {leaderboardMetric === "sales" 
                        ? formatCurrency(store.netSales) 
                        : formatPercent(store.targetAchievement)
                      }
                    </p>
                    <p className="text-[9px] text-rose-600 font-semibold">
                      {leaderboardMetric === "sales"
                        ? `Achieved: ${store.targetAchievement.toFixed(0)}%`
                        : `Net Sales: ${formatCurrency(store.netSales)}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
