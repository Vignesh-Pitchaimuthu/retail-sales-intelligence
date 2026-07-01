import React from "react";
import { DollarSign, Target, ShoppingBag, RotateCcw, Tag, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface KPICardProps {
  type: "netsales" | "achievement" | "atv" | "return" | "discount";
  title: string;
  value: string;
  subtext: string;
  rawPercentage?: number;
}

export default function KPICard({ type, title, value, subtext, rawPercentage }: KPICardProps) {
  const getIcon = () => {
    switch (type) {
      case "netsales":
        return <DollarSign className="w-5 h-5 text-indigo-600" />;
      case "achievement":
        return <Target className="w-5 h-5 text-sky-600" />;
      case "atv":
        return <ShoppingBag className="w-5 h-5 text-violet-600" />;
      case "return":
        return <RotateCcw className="w-5 h-5 text-rose-600" />;
      case "discount":
        return <Tag className="w-5 h-5 text-amber-600" />;
    }
  };

  const getCardStyle = () => {
    switch (type) {
      case "netsales":
        return "border-l-4 border-l-indigo-500";
      case "achievement":
        return "border-l-4 border-l-sky-500";
      case "atv":
        return "border-l-4 border-l-violet-500";
      case "return":
        return "border-l-4 border-l-rose-500";
      case "discount":
        return "border-l-4 border-l-amber-500";
    }
  };

  // Build target-specific progress/bar micro-visualizers
  const renderVisualizer = () => {
    if (rawPercentage === undefined || isNaN(rawPercentage)) return null;

    if (type === "achievement") {
      const barColor = rawPercentage >= 100 
        ? "bg-emerald-500" 
        : rawPercentage >= 90 
          ? "bg-amber-500" 
          : "bg-rose-500";
      
      return (
        <div className="mt-3">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full ${barColor}`} style={{ width: `${Math.min(120, rawPercentage)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0%</span>
            <span className="font-semibold text-slate-500">Target (100%)</span>
            <span>{rawPercentage > 100 ? `${rawPercentage.toFixed(0)}%` : ""}</span>
          </div>
        </div>
      );
    }

    if (type === "return") {
      const isHigh = rawPercentage > 5.0;
      const indicatorColor = isHigh ? "text-rose-600 bg-rose-50 border-rose-100" : "text-emerald-600 bg-emerald-50 border-emerald-100";
      
      return (
        <div className="mt-2.5 flex items-center justify-between">
          <div className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${indicatorColor}`}>
            {isHigh ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                Above 5% Threshold
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3" />
                Optimized Return Rate
              </>
            )}
          </div>
        </div>
      );
    }

    if (type === "discount") {
      const isHighDiscount = rawPercentage > 15;
      const indicatorColor = isHighDiscount ? "text-amber-700 bg-amber-50" : "text-slate-600 bg-slate-50";

      return (
        <div className="mt-2.5">
          <span className={`text-[10px] px-2 py-0.5 rounded border border-slate-100 font-semibold ${indicatorColor}`}>
            {isHighDiscount ? "Aggressive Promotions" : "Standard Promotions"}
          </span>
        </div>
      );
    }

    if (type === "netsales") {
      return (
        <div className="mt-2.5 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Active revenue generated</span>
        </div>
      );
    }

    if (type === "atv") {
      return (
        <div className="mt-2.5 flex items-center gap-1 text-[10px] text-slate-500 font-medium">
          <span>Average purchase size across categories</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      id={`kpi-card-${type}`}
      className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all duration-200 flex flex-col justify-between ${getCardStyle()}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>
      </div>

      {renderVisualizer()}
    </div>
  );
}
