import React, { useState, useMemo } from "react";
import { JoinedRecord, WeeklySalesRecord, StoreMasterRecord, FilterState, DashboardMetrics } from "./types";
import { getDemoJoinedData, DEFAULT_WEEKLY_SALES, DEFAULT_STORE_MASTER } from "./demoData";
import UploadZone from "./components/UploadZone";
import DashboardFilters from "./components/DashboardFilters";
import KPICard from "./components/KPICard";
import InsightsPanel from "./components/InsightsPanel";
import DashboardCharts from "./components/DashboardCharts";
import { 
  Briefcase, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  Info,
  Layers,
  Database
} from "lucide-react";

export default function App() {
  // --- 1. Base Data States ---
  // Default is active demo data
  const [salesData, setSalesData] = useState<WeeklySalesRecord[]>(DEFAULT_WEEKLY_SALES);
  const [storeMaster, setStoreMaster] = useState<StoreMasterRecord[]>(DEFAULT_STORE_MASTER);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(true);

  // --- 2. Filter States ---
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedStoreFormat, setSelectedStoreFormat] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Table pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // --- 3. Join logic ---
  const joinedData = useMemo<JoinedRecord[]>(() => {
    const storeMap = new Map<string, StoreMasterRecord>();
    storeMaster.forEach((s) => storeMap.set(s.store_id, s));

    return salesData.map((sale, idx) => {
      const store = storeMap.get(sale.store_id) || {
        store_id: sale.store_id,
        store_name: `Store ID: ${sale.store_id}`,
        region: "Unmapped",
        city: "Unmapped",
        store_format: "Unmapped",
      };

      return {
        ...sale,
        ...store,
        id: `${sale.store_id}_${sale.week}_${sale.product_category.replace(/\s+/g, "")}_${idx}`,
      };
    });
  }, [salesData, storeMaster]);

  // --- 4. Get Unique Filter Lists ---
  const uniqueWeeks = useMemo(() => Array.from(new Set(joinedData.map((d) => d.week))).sort(), [joinedData]);
  const uniqueRegions = useMemo(() => Array.from(new Set(joinedData.map((d) => d.region))).sort(), [joinedData]);
  const uniqueCities = useMemo(() => Array.from(new Set(joinedData.map((d) => d.city))).sort(), [joinedData]);
  const uniqueStoreFormats = useMemo(() => Array.from(new Set(joinedData.map((d) => d.store_format))).sort(), [joinedData]);
  const uniqueCategories = useMemo(() => Array.from(new Set(joinedData.map((d) => d.product_category))).sort(), [joinedData]);

  // Unique stores mapping for dropdown (only stores that actually match active data)
  const uniqueStores = useMemo(() => {
    const storeMap = new Map<string, string>();
    joinedData.forEach((d) => {
      storeMap.set(d.store_id, d.store_name);
    });
    return Array.from(storeMap.entries())
      .map(([store_id, store_name]) => ({ store_id, store_name }))
      .sort((a, b) => a.store_name.localeCompare(b.store_name));
  }, [joinedData]);

  // --- 5. Data upload triggers ---
  const handleCustomDataLoaded = (customSales: WeeklySalesRecord[], customStores: StoreMasterRecord[]) => {
    setSalesData(customSales);
    setStoreMaster(customStores);
    setIsDemoActive(false);
    // Reset filters when a brand new dataset is loaded to prevent invalid selections
    handleResetFilters();
  };

  const handleResetToDemo = () => {
    setSalesData(DEFAULT_WEEKLY_SALES);
    setStoreMaster(DEFAULT_STORE_MASTER);
    setIsDemoActive(true);
    handleResetFilters();
  };

  // --- 6. Filter Handlers ---
  const handleFilterChange = (key: string, value: string) => {
    setCurrentPage(1); // Reset to page 1 on filter
    switch (key) {
      case "week":
        setSelectedWeek(value);
        break;
      case "region":
        setSelectedRegion(value);
        break;
      case "store":
        setSelectedStore(value);
        break;
      case "city":
        setSelectedCity(value);
        break;
      case "storeFormat":
        setSelectedStoreFormat(value);
        break;
      case "category":
        setSelectedCategory(value);
        break;
    }
  };

  const handleResetFilters = () => {
    setSelectedWeek("");
    setSelectedRegion("");
    setSelectedStore("");
    setSelectedCity("");
    setSelectedStoreFormat("");
    setSelectedCategory("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // --- 7. Multi-level filtering logic ---
  const filteredData = useMemo(() => {
    return joinedData.filter((row) => {
      if (selectedWeek && row.week !== selectedWeek) return false;
      if (selectedRegion && row.region !== selectedRegion) return false;
      if (selectedStore && row.store_id !== selectedStore) return false;
      if (selectedCity && row.city !== selectedCity) return false;
      if (selectedStoreFormat && row.store_format !== selectedStoreFormat) return false;
      if (selectedCategory && row.product_category !== selectedCategory) return false;
      
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = row.store_name.toLowerCase().includes(query);
        const matchesCity = row.city.toLowerCase().includes(query);
        const matchesCategory = row.product_category.toLowerCase().includes(query);
        const matchesId = row.store_id.toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesCategory && !matchesId) return false;
      }
      return true;
    });
  }, [joinedData, selectedWeek, selectedRegion, selectedStore, selectedCity, selectedStoreFormat, selectedCategory, searchTerm]);

  // --- 8. Metric calculations ---
  const metrics = useMemo<DashboardMetrics>(() => {
    let netSales = 0;
    let targetSales = 0;
    let transactions = 0;
    let returnAmount = 0;
    let discountAmount = 0;
    let grossSales = 0;
    let highStockoutCount = 0;
    let totalStockouts = 0;

    // To evaluate stores high-risk incidents count
    const storeStockoutsMap: Record<string, number> = {};

    filteredData.forEach((row) => {
      netSales += row.net_sales;
      targetSales += row.target_sales;
      transactions += row.transactions;
      returnAmount += row.return_amount;
      discountAmount += row.discount_amount;
      grossSales += row.gross_sales;
      totalStockouts += row.stockout_incidents;

      if (!storeStockoutsMap[row.store_id]) {
        storeStockoutsMap[row.store_id] = 0;
      }
      // Sum stockouts per store in current active view
      storeStockoutsMap[row.store_id] += row.stockout_incidents;
    });

    // Count how many stores in current active dataset have stockout incidents > 5
    Object.values(storeStockoutsMap).forEach((count) => {
      if (count > 5) {
        highStockoutCount++;
      }
    });

    const targetAchievement = targetSales > 0 ? (netSales / targetSales) * 100 : 0;
    const averageTransactionValue = transactions > 0 ? netSales / transactions : 0;
    const returnRate = netSales > 0 ? (returnAmount / netSales) * 100 : 0;
    const discountRate = grossSales > 0 ? (discountAmount / grossSales) * 100 : 0;

    return {
      totalNetSales: netSales,
      totalTargetSales: targetSales,
      targetAchievement,
      averageTransactionValue,
      returnRate,
      discountRate,
      totalReturnAmount: returnAmount,
      totalDiscountAmount: discountAmount,
      totalGrossSales: grossSales,
      totalTransactions: transactions,
      highStockoutRiskCount: highStockoutCount,
      totalStockoutIncidents: totalStockouts,
    };
  }, [filteredData]);

  // --- 9. Pagination ---
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredData.slice(startIdx, startIdx + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // --- 10. Format currency helper ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // --- 11. Export Handlers ---
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      "ID",
      "Store ID",
      "Store Name",
      "Region",
      "City",
      "Store Format",
      "Week",
      "Product Category",
      "Gross Sales",
      "Discount Amount",
      "Net Sales",
      "Target Sales",
      "Target Achievement %",
      "Transactions",
      "Average Transaction Value",
      "Return Amount",
      "Return Rate %",
      "Stockout Incidents",
      "Stockout Risk",
    ];

    const csvRows = [headers.join(",")];

    filteredData.forEach((row) => {
      const achievement = row.target_sales > 0 ? (row.net_sales / row.target_sales) * 100 : 0;
      const atv = row.transactions > 0 ? row.net_sales / row.transactions : 0;
      const returnRate = row.net_sales > 0 ? (row.return_amount / row.net_sales) * 100 : 0;
      const risk = row.stockout_incidents > 5 ? "High" : "Normal";

      const lineValues = [
        row.id,
        row.store_id,
        `"${row.store_name.replace(/"/g, '""')}"`,
        row.region,
        row.city,
        row.store_format,
        row.week,
        row.product_category,
        row.gross_sales,
        row.discount_amount,
        row.net_sales,
        row.target_sales,
        achievement.toFixed(2),
        row.transactions,
        atv.toFixed(2),
        row.return_amount,
        returnRate.toFixed(2),
        row.stockout_incidents,
        risk,
      ];

      csvRows.push(lineValues.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `retail_weekly_sales_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInsights = () => {
    // Determine dynamic values for the text report
    // Region
    const regionMetrics: Record<string, { netSales: number; targetSales: number }> = {};
    filteredData.forEach((row) => {
      if (!regionMetrics[row.region]) regionMetrics[row.region] = { netSales: 0, targetSales: 0 };
      regionMetrics[row.region].netSales += row.net_sales;
      regionMetrics[row.region].targetSales += row.target_sales;
    });
    const sortedReg = Object.keys(regionMetrics).map((reg) => ({
      region: reg,
      netSales: regionMetrics[reg].netSales,
      targetSales: regionMetrics[reg].targetSales,
      achievement: regionMetrics[reg].targetSales > 0 ? (regionMetrics[reg].netSales / regionMetrics[reg].targetSales) * 100 : 0
    })).sort((a, b) => b.netSales - a.netSales);

    const bestRegion = sortedReg[0];
    const worstRegion = sortedReg.length > 1 ? sortedReg[sortedReg.length - 1] : null;

    // Stores < 90%
    const storeMetrics: Record<string, { storeName: string; region: string; netSales: number; targetSales: number }> = {};
    filteredData.forEach((row) => {
      if (!storeMetrics[row.store_id]) storeMetrics[row.store_id] = { storeName: row.store_name, region: row.region, netSales: 0, targetSales: 0 };
      storeMetrics[row.store_id].netSales += row.net_sales;
      storeMetrics[row.store_id].targetSales += row.target_sales;
    });
    const storesBelow90 = Object.keys(storeMetrics).map((sid) => {
      const store = storeMetrics[sid];
      return {
        storeId: sid,
        storeName: store.storeName,
        region: store.region,
        netSales: store.netSales,
        targetSales: store.targetSales,
        achievement: store.targetSales > 0 ? (store.netSales / store.targetSales) * 100 : 0
      };
    }).filter((s) => s.achievement < 90).sort((a, b) => a.achievement - b.achievement);

    // Categories return rate > 5%
    const categoryMetrics: Record<string, { netSales: number; returnAmount: number }> = {};
    filteredData.forEach((row) => {
      if (!categoryMetrics[row.product_category]) categoryMetrics[row.product_category] = { netSales: 0, returnAmount: 0 };
      categoryMetrics[row.product_category].netSales += row.net_sales;
      categoryMetrics[row.product_category].returnAmount += row.return_amount;
    });
    const highReturnCategories = Object.keys(categoryMetrics).map((cat) => {
      const metrics = categoryMetrics[cat];
      return {
        category: cat,
        netSales: metrics.netSales,
        returnAmount: metrics.returnAmount,
        returnRate: metrics.netSales > 0 ? (metrics.returnAmount / metrics.netSales) * 100 : 0
      };
    }).filter((cat) => cat.returnRate > 5.0).sort((a, b) => b.returnRate - a.returnRate);

    let report = `RETAIL INTEL INSIGHTS SUMMARY REPORT\n`;
    report += `=========================================\n`;
    report += `Created: ${new Date().toLocaleString()}\n`;
    report += `Dataset Mode: ${isDemoActive ? "Demo Database" : "User Custom Import"}\n\n`;

    report += `I. PERFORMANCE METRICS (ACTIVE FILTERED VIEW)\n`;
    report += `-----------------------------------------\n`;
    report += `Net Sales: ${formatCurrency(metrics.totalNetSales)}\n`;
    report += `Target Quota: ${formatCurrency(metrics.totalTargetSales)}\n`;
    report += `Achievement Rate: ${metrics.targetAchievement.toFixed(1)}%\n`;
    report += `Average Ticket Size (ATV): ${formatCurrency(metrics.averageTransactionValue)}\n`;
    report += `Customer Return Rate: ${metrics.returnRate.toFixed(2)}%\n`;
    report += `Average Promotional Markdowns: ${metrics.discountRate.toFixed(2)}%\n`;
    report += `Total Incidents of High Stockout Risk (>5): ${metrics.highStockoutRiskCount}\n\n`;

    report += `II. EXHAUSTIVE BUSINESS INTELLIGENCE INSIGHTS\n`;
    report += `-----------------------------------------\n`;
    report += `• Best Performing Territory: ${bestRegion ? `${bestRegion.region} (Sales: ${formatCurrency(bestRegion.netSales)}, Quota Met: ${bestRegion.achievement.toFixed(1)}%)` : "No Region Active"}\n`;
    if (worstRegion) {
      report += `• Lagging Territory: ${worstRegion.region} (Sales: ${formatCurrency(worstRegion.netSales)}, Quota Met: ${worstRegion.achievement.toFixed(1)}%)\n`;
    }

    report += `\n• Underachieving Stores (< 90% Target Achievement) [Count: ${storesBelow90.length}]:\n`;
    if (storesBelow90.length > 0) {
      storesBelow90.forEach((s) => {
        report += `  - Store [${s.storeId}] ${s.storeName} (${s.region}): ${s.achievement.toFixed(1)}% met (Actual: ${formatCurrency(s.netSales)} vs Plan: ${formatCurrency(s.targetSales)})\n`;
      });
    } else {
      report += `  - Excellent! There are no stores running below 90% quota in the current view.\n`;
    }

    report += `\n• Flagged High-Return Categories (> 5.0% return rate) [Count: ${highReturnCategories.length}]:\n`;
    if (highReturnCategories.length > 0) {
      highReturnCategories.forEach((c) => {
        report += `  - Category: "${c.category}" has a return rate of ${c.returnRate.toFixed(2)}% (Returned volume: ${formatCurrency(c.returnAmount)})\n`;
      });
    } else {
      report += `  - Healthy quality control. No categories exceed the 5% threshold.\n`;
    }

    const blob = new Blob([report], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `retail_executive_summary_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50/50">
      {/* Executive Header */}
      <header id="platform-header" className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-bold tracking-tight text-white font-display flex items-center gap-2">
                RETAIL INTEL
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-400/20">
                  v1.2 PRO
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Multi-source Retail Join & Sales Intelligence Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50 text-[11px] font-medium text-slate-300 mr-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isDemoActive ? "Demo Mode" : "Custom Storage"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Combined export button menu */}
            <div className="flex items-center gap-1">
              <button
                id="btn-export-csv"
                onClick={handleExportCSV}
                disabled={filteredData.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Download Filtered Joined Dataset (CSV)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              
              <button
                id="btn-export-insights"
                onClick={handleExportInsights}
                disabled={filteredData.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Download Summarized Executive Insights (TXT)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Insights</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {/* Upload zone - toggle/control */}
        <UploadZone 
          onDataLoaded={handleCustomDataLoaded} 
          onResetToDemo={handleResetToDemo} 
          isDemoActive={isDemoActive}
          salesCount={salesData.length}
          storesCount={storeMaster.length}
        />

        {/* Multi-Level Operations Filters */}
        <DashboardFilters 
          weeks={uniqueWeeks}
          regions={uniqueRegions}
          stores={uniqueStores}
          cities={uniqueCities}
          storeFormats={uniqueStoreFormats}
          categories={uniqueCategories}
          selectedWeek={selectedWeek}
          selectedRegion={selectedRegion}
          selectedStore={selectedStore}
          selectedCity={selectedCity}
          selectedStoreFormat={selectedStoreFormat}
          selectedCategory={selectedCategory}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />

        {/* KPI Scorecard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard 
            type="netsales" 
            title="Net Sales" 
            value={formatCurrency(metrics.totalNetSales)} 
            subtext={`Gross: ${formatCurrency(metrics.totalGrossSales)}`}
          />
          <KPICard 
            type="achievement" 
            title="Target Achievement" 
            value={`${metrics.targetAchievement.toFixed(1)}%`} 
            subtext={`Quota: ${formatCurrency(metrics.totalTargetSales)}`}
            rawPercentage={metrics.targetAchievement}
          />
          <KPICard 
            type="atv" 
            title="Avg Ticket Value (ATV)" 
            value={formatCurrency(metrics.averageTransactionValue)} 
            subtext={`Across ${metrics.totalTransactions.toLocaleString()} txs`}
          />
          <KPICard 
            type="return" 
            title="Return Rate" 
            value={`${metrics.returnRate.toFixed(2)}%`} 
            subtext={`Returned: ${formatCurrency(metrics.totalReturnAmount)}`}
            rawPercentage={metrics.returnRate}
          />
          <KPICard 
            type="discount" 
            title="Markdown Rate" 
            value={`${metrics.discountRate.toFixed(2)}%`} 
            subtext={`Promo: ${formatCurrency(metrics.totalDiscountAmount)}`}
            rawPercentage={metrics.discountRate}
          />
        </div>

        {/* Automatic Business Insights Panel */}
        <InsightsPanel data={filteredData} />

        {/* Charts & Graphs Section */}
        <DashboardCharts data={filteredData} />

        {/* Exhaustive Joined Records Data Table */}
        <div id="records-table-container" className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Filtered Joined Records Table</h3>
              <p className="text-xs text-slate-400 mt-0.5">Showing exact database alignments matched on store_id</p>
            </div>

            {/* Local table search box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="table-search"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search store, city, category..."
                className="w-full text-xs bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredData.length > 0 ? (
              <table id="tbl-joined-records" className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Store Name</th>
                    <th className="py-3 px-4">Hierarchy</th>
                    <th className="py-3 px-4">Week</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Target quota</th>
                    <th className="py-3 px-4 text-center">Achievement</th>
                    <th className="py-3 px-4 text-center">Returns</th>
                    <th className="py-3 px-4 text-center">Stockout risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedData.map((row) => {
                    const achievement = row.target_sales > 0 ? (row.net_sales / row.target_sales) * 100 : 0;
                    const returnRate = row.net_sales > 0 ? (row.return_amount / row.net_sales) * 100 : 0;
                    const hasHighStockout = row.stockout_incidents > 5;
                    const isUnderachieved = achievement < 90;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{row.store_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{row.store_id}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-600">{row.region}</span>
                          <span className="mx-1 text-slate-300">•</span>
                          <span className="text-slate-500 text-[10px]">{row.city} ({row.store_format})</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{row.week}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium border border-slate-200/55">
                            {row.product_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold font-mono text-slate-800">{formatCurrency(row.net_sales)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(row.target_sales)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block w-14 text-center font-bold font-mono py-0.5 rounded ${
                            isUnderachieved 
                              ? "text-rose-600 bg-rose-50" 
                              : achievement >= 100 
                                ? "text-emerald-600 bg-emerald-50" 
                                : "text-amber-600 bg-amber-50"
                          }`}>
                            {achievement.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <p className={`font-semibold font-mono ${returnRate > 5 ? "text-rose-600" : "text-slate-500"}`}>
                            {returnRate.toFixed(1)}%
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">({formatCurrency(row.return_amount)})</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasHighStockout ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-full animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                              High Risk ({row.stockout_incidents})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full">
                              Normal ({row.stockout_incidents})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 px-4">
                <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800 text-sm">No matched records found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your operational filters or check if the store_id values in both uploaded worksheets correctly align.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reset Search Filters
                </button>
              </div>
            )}
          </div>

          {/* Table pagination control bar */}
          {filteredData.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong className="text-slate-800">{Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}</strong> to{" "}
                  <strong className="text-slate-800">{Math.min(filteredData.length, currentPage * pageSize)}</strong> of{" "}
                  <strong className="text-slate-800">{filteredData.length}</strong> entries
                </span>
                
                {/* Items per page selector */}
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <select
                    id="select-page-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="btn-prev-page"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3">
                  Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages || 1}</strong>
                </span>
                <button
                  id="btn-next-page"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Corporate footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; 2026 Retail Intel Platform. All rights reserved. Confidential corporate usage.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 transition-colors">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-600 transition-colors">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-600 transition-colors">API Endpoint Documentation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
