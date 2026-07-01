import React from "react";
import { JoinedRecord } from "../types";
import { TrendingUp, TrendingDown, Store, RefreshCw, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

interface InsightsPanelProps {
  data: JoinedRecord[];
}

export default function InsightsPanel({ data }: InsightsPanelProps) {
  // If no data is available
  if (!data || data.length === 0) {
    return (
      <div id="insights-empty" className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 text-sm">
        No active data found to generate dynamic business insights.
      </div>
    );
  }

  // --- 1. Region Calculations ---
  const regionMetrics: Record<string, { netSales: number; targetSales: number }> = {};
  data.forEach((row) => {
    if (!regionMetrics[row.region]) {
      regionMetrics[row.region] = { netSales: 0, targetSales: 0 };
    }
    regionMetrics[row.region].netSales += row.net_sales;
    regionMetrics[row.region].targetSales += row.target_sales;
  });

  const regionsList = Object.keys(regionMetrics).map((reg) => ({
    region: reg,
    netSales: regionMetrics[reg].netSales,
    targetSales: regionMetrics[reg].targetSales,
    achievement: regionMetrics[reg].targetSales > 0 ? (regionMetrics[reg].netSales / regionMetrics[reg].targetSales) * 100 : 0
  }));

  // Sort regions by Net Sales
  const sortedRegionsBySales = [...regionsList].sort((a, b) => b.netSales - a.netSales);
  const bestRegion = sortedRegionsBySales[0];
  const worstRegion = sortedRegionsBySales.length > 1 ? sortedRegionsBySales[sortedRegionsBySales.length - 1] : null;

  // --- 2. Store Calculations (< 90% target achievement) ---
  const storeMetrics: Record<string, { storeName: string; region: string; netSales: number; targetSales: number }> = {};
  data.forEach((row) => {
    if (!storeMetrics[row.store_id]) {
      storeMetrics[row.store_id] = { storeName: row.store_name, region: row.region, netSales: 0, targetSales: 0 };
    }
    storeMetrics[row.store_id].netSales += row.net_sales;
    storeMetrics[row.store_id].targetSales += row.target_sales;
  });

  const storesBelow90 = Object.keys(storeMetrics)
    .map((sid) => {
      const store = storeMetrics[sid];
      const achievement = store.targetSales > 0 ? (store.netSales / store.targetSales) * 100 : 0;
      return {
        storeId: sid,
        storeName: store.storeName,
        region: store.region,
        netSales: store.netSales,
        targetSales: store.targetSales,
        achievement
      };
    })
    .filter((store) => store.achievement < 90)
    .sort((a, b) => a.achievement - b.achievement); // lowest achievement first

  // --- 3. Category Calculations (> 5% return rate) ---
  const categoryMetrics: Record<string, { netSales: number; returnAmount: number }> = {};
  data.forEach((row) => {
    if (!categoryMetrics[row.product_category]) {
      categoryMetrics[row.product_category] = { netSales: 0, returnAmount: 0 };
    }
    categoryMetrics[row.product_category].netSales += row.net_sales;
    categoryMetrics[row.product_category].returnAmount += row.return_amount;
  });

  const highReturnCategories = Object.keys(categoryMetrics)
    .map((cat) => {
      const metrics = categoryMetrics[cat];
      const returnRate = metrics.netSales > 0 ? (metrics.returnAmount / metrics.netSales) * 100 : 0;
      return {
        category: cat,
        netSales: metrics.netSales,
        returnAmount: metrics.returnAmount,
        returnRate
      };
    })
    .filter((cat) => cat.returnRate > 5.0)
    .sort((a, b) => b.returnRate - a.returnRate); // highest return rate first

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div id="insights-panel" className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 id="insights-title" className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-600" />
          Business Insight Summary
        </h3>
        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Dynamic Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-grow">
        {/* Region performance block */}
        <div id="insight-best-region" className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top Performing Region</span>
            {bestRegion ? (
              <div className="mt-2">
                <h4 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  {bestRegion.region}
                </h4>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p className="flex justify-between">
                    <span>Net Sales:</span>
                    <strong className="text-slate-800">{formatCurrency(bestRegion.netSales)}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Target Achieved:</span>
                    <strong className="text-emerald-600">{bestRegion.achievement.toFixed(1)}%</strong>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">No regional data available.</p>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500">
            Leading sales and pipeline generation.
          </div>
        </div>

        {/* Worst Region performance block */}
        <div id="insight-worst-region" className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lagging Region</span>
            {worstRegion ? (
              <div className="mt-2">
                <h4 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingDown className="w-5 h-5 text-rose-500 flex-shrink-0" />
                  {worstRegion.region}
                </h4>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p className="flex justify-between">
                    <span>Net Sales:</span>
                    <strong className="text-slate-800">{formatCurrency(worstRegion.netSales)}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Target Achieved:</span>
                    <strong className="text-rose-600">{worstRegion.achievement.toFixed(1)}%</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-slate-500">No alternate region</h4>
                <p className="text-xs text-slate-400 mt-1">Only one region selected in the active dataset.</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500">
            Requires targeted localized marketing efforts.
          </div>
        </div>

        {/* Stores below 90% achievement */}
        <div id="insight-underachieving-stores" className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stores below 90% Target</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                storesBelow90.length > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {storesBelow90.length} flagged
              </span>
            </div>

            <div className="mt-2 max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
              {storesBelow90.length > 0 ? (
                storesBelow90.map((store) => (
                  <div key={store.storeId} className="p-1.5 bg-white rounded border border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="truncate pr-1">
                      <p className="font-semibold text-slate-800 truncate" title={store.storeName}>
                        {store.storeName}
                      </p>
                      <p className="text-[9px] text-slate-400">{store.region} • {store.storeId}</p>
                    </div>
                    <span className="font-bold text-rose-500 flex-shrink-0">{store.achievement.toFixed(0)}%</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">All stores &ge; 90% target!</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            Mandatory performance reviews advised.
          </div>
        </div>

        {/* Categories with return rates > 5% */}
        <div id="insight-high-returns" className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Returns above 5%</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                highReturnCategories.length > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {highReturnCategories.length} flagged
              </span>
            </div>

            <div className="mt-2 max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
              {highReturnCategories.length > 0 ? (
                highReturnCategories.map((cat) => (
                  <div key={cat.category} className="p-1.5 bg-white rounded border border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 truncate" title={cat.category}>
                      {cat.category}
                    </span>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-rose-600">{cat.returnRate.toFixed(1)}%</p>
                      <p className="text-[9px] text-slate-400">rate</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">All categories below 5% return!</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            Monitor quality controls on flagged categories.
          </div>
        </div>
      </div>
    </div>
  );
}
