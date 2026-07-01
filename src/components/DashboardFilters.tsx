import React from "react";
import { Filter, X, ChevronDown, Check } from "lucide-react";

interface DashboardFiltersProps {
  weeks: string[];
  regions: string[];
  stores: { store_id: string; store_name: string }[];
  cities: string[];
  storeFormats: string[];
  categories: string[];

  selectedWeek: string;
  selectedRegion: string;
  selectedStore: string;
  selectedCity: string;
  selectedStoreFormat: string;
  selectedCategory: string;

  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
}

export default function DashboardFilters({
  weeks,
  regions,
  stores,
  cities,
  storeFormats,
  categories,
  selectedWeek,
  selectedRegion,
  selectedStore,
  selectedCity,
  selectedStoreFormat,
  selectedCategory,
  onFilterChange,
  onResetFilters,
}: DashboardFiltersProps) {
  // Count active filters
  const activeCount = [
    selectedWeek,
    selectedRegion,
    selectedStore,
    selectedCity,
    selectedStoreFormat,
    selectedCategory,
  ].filter(Boolean).length;

  return (
    <div id="dashboard-filters" className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-50 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Filter className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Operational Filters</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Narrow down analytics across hierarchies</p>
          </div>
          {activeCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            id="btn-clear-filters"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg transition-colors border border-rose-100 cursor-pointer w-fit"
          >
            <X className="w-3 h-3" />
            Clear All Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Week Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Week</label>
          <div className="relative">
            <select
              id="filter-week"
              value={selectedWeek}
              onChange={(e) => onFilterChange("week", e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">All Weeks</option>
              {weeks.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Region Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Region</label>
          <div className="relative">
            <select
              id="filter-region"
              value={selectedRegion}
              onChange={(e) => onFilterChange("region", e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* City Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
          <div className="relative">
            <select
              id="filter-city"
              value={selectedCity}
              onChange={(e) => onFilterChange("city", e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Store Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Store</label>
          <div className="relative">
            <select
              id="filter-store"
              value={selectedStore}
              onChange={(e) => onFilterChange("store", e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Store Format Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Store Format</label>
          <div className="relative">
            <select
              id="filter-format"
              value={selectedStoreFormat}
              onChange={(e) => onFilterChange("storeFormat", e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">All Formats</option>
              {storeFormats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
          <div className="relative">
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => onFilterChange("category", e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
