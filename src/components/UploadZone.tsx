import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { WeeklySalesRecord, StoreMasterRecord } from "../types";
import { getSalesCSVTemplate, getStoresCSVTemplate, DEFAULT_STORE_MASTER } from "../demoData";
import { FileUp, FileCheck, RefreshCw, HelpCircle, Download, AlertTriangle, FileSpreadsheet } from "lucide-react";

interface UploadZoneProps {
  onDataLoaded: (sales: WeeklySalesRecord[], stores: StoreMasterRecord[]) => void;
  onResetToDemo: () => void;
  isDemoActive: boolean;
  salesCount: number;
  storesCount: number;
}

export default function UploadZone({
  onDataLoaded,
  onResetToDemo,
  isDemoActive,
  salesCount,
  storesCount,
}: UploadZoneProps) {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [storesFile, setStoresFile] = useState<File | null>(null);
  const [parsedSales, setParsedSales] = useState<WeeklySalesRecord[] | null>(null);
  const [parsedStores, setParsedStores] = useState<StoreMasterRecord[] | null>(null);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const [sheetUrl, setSheetUrl] = useState("");
  const [importTarget, setImportTarget] = useState<"sales" | "stores" | "auto">("auto");
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetSuccessMessage, setSheetSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "sheet">("upload");

  const salesInputRef = useRef<HTMLInputElement>(null);
  const storesInputRef = useRef<HTMLInputElement>(null);

  const normalizeKey = (key: string): string => {
    return key.toLowerCase().trim().replace(/[\s_\-\/]/g, "");
  };

  const getYearAndWeek = (weekRaw: any): string => {
    if (weekRaw === null || weekRaw === undefined) return "Unknown";
    
    let date: Date | null = null;
    
    if (weekRaw instanceof Date) {
      date = weekRaw;
    } else if (typeof weekRaw === "number") {
      // Excel serial date representation (days since 1900-01-01)
      date = new Date((weekRaw - 25569) * 86400000);
    } else {
      const strVal = String(weekRaw).trim();
      if (!strVal) return "Unknown";
      
      // Check if it's already in a week format like "2026-W23" or similar
      if (/^\d{4}-W\d{1,2}$/i.test(strVal)) {
        return strVal.toUpperCase();
      }
      
      // Matches dd-mm-yyyy or d-m-yyyy (dash or slash separated)
      const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
      const dmyMatch = strVal.match(dmyRegex);
      
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
        const year = parseInt(dmyMatch[3], 10);
        date = new Date(year, month, day);
      } else {
        // Try parsing other formats (e.g., yyyy-mm-dd)
        date = new Date(strVal);
      }
    }
    
    if (!date || isNaN(date.getTime())) {
      return String(weekRaw).trim();
    }
    
    // Calculate ISO week number of the year
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    target.setDate(target.getDate() - dayNr + 3); // Find Thursday of this week
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7)); // First Thursday of the year
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const year = new Date(firstThursday).getFullYear();
    
    const paddedWeek = String(weekNum).padStart(2, '0');
    return `${year}-W${paddedWeek}`;
  };

  const parseExcelOrCsv = (file: File, isSalesFile: boolean) => {
    setErrorLog([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

        if (!rawJson || rawJson.length === 0) {
          throw new Error("The file is empty or could not be parsed.");
        }

        const normalizedRecords: any[] = [];
        const parsingErrors: string[] = [];
        const extractedStoresMap = new Map<string, StoreMasterRecord>();

        rawJson.forEach((row, idx) => {
          // Normalize row keys
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[normalizeKey(k)] = row[k];
          });

          if (isSalesFile) {
            // Looking for: store_id, week, net_sales, target_sales, transactions, return_amount, discount_amount, gross_sales, product_category, stockout_incidents
            const storeId = String(normalizedRow["storeid"] || normalizedRow["store"] || normalizedRow["id"] || "").trim();
            const weekRaw = normalizedRow["weekstartdate"] || normalizedRow["week"] || normalizedRow["weekid"] || "";
            const week = getYearAndWeek(weekRaw);
            const productCategory = String(normalizedRow["productcategory"] || normalizedRow["category"] || normalizedRow["prodcategory"] || "").trim();
            
            // Numbers
            const netSales = parseFloat(normalizedRow["netsales"] || normalizedRow["sales"] || normalizedRow["netamount"] || 0);
            const targetSales = parseFloat(normalizedRow["salestarget"] || normalizedRow["targetsales"] || normalizedRow["target"] || normalizedRow["salesbudget"] || 0);
            const transactions = parseInt(normalizedRow["transactions"] || normalizedRow["transactioncount"] || normalizedRow["txs"] || 0);
            const returnAmount = parseFloat(normalizedRow["returnsamount"] || normalizedRow["returnamount"] || normalizedRow["returns"] || normalizedRow["returnedamount"] || 0);
            const discountAmount = parseFloat(normalizedRow["discountamount"] || normalizedRow["discount"] || normalizedRow["discounts"] || 0);
            const grossSales = parseFloat(normalizedRow["grosssales"] || normalizedRow["grossamount"] || 0);
            const stockoutIncidents = parseInt(normalizedRow["stockouts"] || normalizedRow["stockoutincidents"] || normalizedRow["stockoutcount"] || 0);

            // Capture new optional columns from user
            const footfall = parseFloat(normalizedRow["footfall"] || 0);
            const unitsSold = parseInt(normalizedRow["unitssold"] || 0);
            const inventoryOnHand = parseInt(normalizedRow["inventoryonhand"] || 0);
            const customerRating = parseFloat(normalizedRow["customerrating"] || 0);
            const marketingSpend = parseFloat(normalizedRow["marketingspend"] || 0);

            if (!storeId || !week) {
              parsingErrors.push(`Row ${idx + 2}: Missing store_id or week (week_start_date) value. Skipping.`);
              return;
            }

            // Extract store master details if present in sales file (single-file upload convenience!)
            const storeName = String(normalizedRow["storename"] || "").trim();
            const region = String(normalizedRow["region"] || "").trim();
            const city = String(normalizedRow["city"] || "").trim();
            const storeFormat = String(normalizedRow["storeformat"] || "").trim();

            if (storeName || region || city || storeFormat) {
              if (!extractedStoresMap.has(storeId)) {
                extractedStoresMap.set(storeId, {
                  store_id: storeId,
                  store_name: storeName || `Store ${storeId}`,
                  region: region || "General",
                  city: city || "General",
                  store_format: storeFormat || "General",
                });
              } else {
                const existing = extractedStoresMap.get(storeId)!;
                if (storeName && !existing.store_name) existing.store_name = storeName;
                if (region && !existing.region) existing.region = region;
                if (city && !existing.city) existing.city = city;
                if (storeFormat && !existing.store_format) existing.store_format = storeFormat;
              }
            }

            normalizedRecords.push({
              store_id: storeId,
              week,
              net_sales: isNaN(netSales) ? 0 : netSales,
              target_sales: isNaN(targetSales) ? 0 : targetSales,
              transactions: isNaN(transactions) ? 0 : transactions,
              return_amount: isNaN(returnAmount) ? 0 : returnAmount,
              discount_amount: isNaN(discountAmount) ? 0 : discountAmount,
              gross_sales: isNaN(grossSales) ? (isNaN(netSales) ? 0 : netSales) : grossSales,
              product_category: productCategory || "General",
              stockout_incidents: isNaN(stockoutIncidents) ? 0 : stockoutIncidents,
              footfall: isNaN(footfall) ? undefined : footfall,
              units_sold: isNaN(unitsSold) ? undefined : unitsSold,
              inventory_on_hand: isNaN(inventoryOnHand) ? undefined : inventoryOnHand,
              customer_rating: isNaN(customerRating) ? undefined : customerRating,
              marketing_spend: isNaN(marketingSpend) ? undefined : marketingSpend,
            } as WeeklySalesRecord);
          } else {
            // Looking for store_master: store_id, store_name, region, city, store_format
            const storeId = String(normalizedRow["storeid"] || normalizedRow["store"] || normalizedRow["id"] || "").trim();
            const storeName = String(normalizedRow["storename"] || normalizedRow["name"] || "").trim();
            const region = String(normalizedRow["region"] || "").trim();
            const city = String(normalizedRow["city"] || "").trim();
            const storeFormat = String(normalizedRow["storeformat"] || normalizedRow["format"] || "").trim();

            if (!storeId) {
              parsingErrors.push(`Row ${idx + 2}: Missing store_id value. Skipping.`);
              return;
            }

            normalizedRecords.push({
              store_id: storeId,
              store_name: storeName || `Store ${storeId}`,
              region: region || "General",
              city: city || "General",
              store_format: storeFormat || "General",
            } as StoreMasterRecord);
          }
        });

        if (parsingErrors.length > 0) {
          setErrorLog((prev) => [...prev, ...parsingErrors]);
        }

        if (normalizedRecords.length === 0) {
          throw new Error("No valid rows could be imported based on column mapping.");
        }

        if (isSalesFile) {
          setParsedSales(normalizedRecords);
          setSalesFile(file);
          const extractedStores = Array.from(extractedStoresMap.values());

          if (parsedStores) {
            onDataLoaded(normalizedRecords, parsedStores);
          } else if (extractedStores.length > 0) {
            setParsedStores(extractedStores);
            onDataLoaded(normalizedRecords, extractedStores);
            setErrorLog((prev) => [
              ...prev,
              `Successfully auto-joined using ${extractedStores.length} store master profiles extracted from '${file.name}'!`
            ]);
          } else {
            onDataLoaded(normalizedRecords, DEFAULT_STORE_MASTER);
            setErrorLog((prev) => [
              ...prev,
              "Sales dataset loaded. No inline store definitions found; joined using default stores master list. Upload store_master.xlsx for custom mappings."
            ]);
          }
        } else {
          setParsedStores(normalizedRecords);
          setStoresFile(file);
          if (parsedSales) {
            onDataLoaded(parsedSales, normalizedRecords);
          } else if (isDemoActive) {
            setErrorLog((prev) => [...prev, "Store master parsed. Please upload 'retail_weekly_sales.xlsx' to complete the join."]);
          }
        }
      } catch (err: any) {
        console.error(err);
        setErrorLog((prev) => [...prev, `Error parsing ${file.name}: ${err.message || err}`]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSalesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelOrCsv(e.target.files[0], true);
    }
  };

  const handleStoresUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelOrCsv(e.target.files[0], false);
    }
  };

  const triggerSalesInput = () => salesInputRef.current?.click();
  const triggerStoresInput = () => storesInputRef.current?.click();

  const handleSalesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelOrCsv(e.dataTransfer.files[0], true);
    }
  };

  const handleStoresDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelOrCsv(e.dataTransfer.files[0], false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleReset = () => {
    setSalesFile(null);
    setStoresFile(null);
    setParsedSales(null);
    setParsedStores(null);
    setErrorLog([]);
    onResetToDemo();
  };

  const handleTriggerCombine = () => {
    if (parsedSales && parsedStores) {
      onDataLoaded(parsedSales, parsedStores);
    } else {
      setErrorLog(["Please upload BOTH files to join and view results."]);
    }
  };

  const downloadCSVTemplate = (type: "sales" | "stores") => {
    const csvContent = type === "sales" ? getSalesCSVTemplate() : getStoresCSVTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", type === "sales" ? "retail_weekly_sales_template.csv" : "store_master_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const extractSpreadsheetId = (url: string): string | null => {
    const reg = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(reg);
    if (match) return match[1];
    
    if (/^[a-zA-Z0-9-_]{15,}$/.test(url.trim())) {
      return url.trim();
    }
    return null;
  };

  const handleImportGoogleSheet = async () => {
    setErrorLog([]);
    setSheetSuccessMessage("");
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    if (!spreadsheetId) {
      setErrorLog(["Invalid Google Sheets URL or Spreadsheet ID. Please make sure it's in the format https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit"]);
      return;
    }

    setIsFetchingSheet(true);
    try {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      const res = await fetch(exportUrl);
      
      if (!res.ok) {
        throw new Error(
          "Failed to fetch sheet. Please verify that the spreadsheet is set to 'Anyone with the link can view' under Share settings."
        );
      }

      const buffer = await res.arrayBuffer();
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook || workbook.SheetNames.length === 0) {
        throw new Error("Spreadsheet was fetched but contains no sheets.");
      }

      let salesLoadedCount = 0;
      let storesLoadedCount = 0;
      let newlyParsedSales: WeeklySalesRecord[] | null = parsedSales;
      let newlyParsedStores: StoreMasterRecord[] | null = parsedStores;
      const extractedStoresMap = new Map<string, StoreMasterRecord>();

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
        if (!rawJson || rawJson.length === 0) continue;

        const firstRow = rawJson[0];
        const normalizedKeys = Object.keys(firstRow).map((k) => normalizeKey(k));

        const isSales = 
          importTarget === "sales" || 
          (importTarget === "auto" && 
           (normalizedKeys.includes("weekstartdate") || normalizedKeys.includes("week") || normalizedKeys.includes("netsales") || normalizedKeys.includes("grosssales") || sheetName.toLowerCase().includes("sales") || sheetName.toLowerCase().includes("weekly")));

        const isStores = 
          importTarget === "stores" || 
          (importTarget === "auto" && 
           !isSales && 
           (normalizedKeys.includes("storename") || normalizedKeys.includes("region") || normalizedKeys.includes("city") || sheetName.toLowerCase().includes("store") || sheetName.toLowerCase().includes("master")));

        if (isSales) {
          const normalizedSales: WeeklySalesRecord[] = [];
          rawJson.forEach((row) => {
            const normalizedRow: Record<string, any> = {};
            Object.keys(row).forEach((k) => {
              normalizedRow[normalizeKey(k)] = row[k];
            });

            const storeId = String(normalizedRow["storeid"] || normalizedRow["store"] || normalizedRow["id"] || "").trim();
            const weekRaw = normalizedRow["weekstartdate"] || normalizedRow["week"] || normalizedRow["weekid"] || "";
            const week = getYearAndWeek(weekRaw);
            const productCategory = String(normalizedRow["productcategory"] || normalizedRow["category"] || normalizedRow["prodcategory"] || "").trim();
            
            const netSales = parseFloat(normalizedRow["netsales"] || normalizedRow["sales"] || normalizedRow["netamount"] || 0);
            const targetSales = parseFloat(normalizedRow["salestarget"] || normalizedRow["targetsales"] || normalizedRow["target"] || normalizedRow["salesbudget"] || 0);
            const transactions = parseInt(normalizedRow["transactions"] || normalizedRow["transactioncount"] || normalizedRow["txs"] || 0);
            const returnAmount = parseFloat(normalizedRow["returnsamount"] || normalizedRow["returnamount"] || normalizedRow["returns"] || normalizedRow["returnedamount"] || 0);
            const discountAmount = parseFloat(normalizedRow["discountamount"] || normalizedRow["discount"] || normalizedRow["discounts"] || 0);
            const grossSales = parseFloat(normalizedRow["grosssales"] || normalizedRow["grossamount"] || 0);
            const stockoutIncidents = parseInt(normalizedRow["stockouts"] || normalizedRow["stockoutincidents"] || normalizedRow["stockoutcount"] || 0);

            const footfall = parseFloat(normalizedRow["footfall"] || 0);
            const unitsSold = parseInt(normalizedRow["unitssold"] || 0);
            const inventoryOnHand = parseInt(normalizedRow["inventoryonhand"] || 0);
            const customerRating = parseFloat(normalizedRow["customerrating"] || 0);
            const marketingSpend = parseFloat(normalizedRow["marketingspend"] || 0);

            if (!storeId || !week) return;

            const storeName = String(normalizedRow["storename"] || "").trim();
            const region = String(normalizedRow["region"] || "").trim();
            const city = String(normalizedRow["city"] || "").trim();
            const storeFormat = String(normalizedRow["storeformat"] || "").trim();

            if (storeName || region || city || storeFormat) {
              if (!extractedStoresMap.has(storeId)) {
                extractedStoresMap.set(storeId, {
                  store_id: storeId,
                  store_name: storeName || `Store ${storeId}`,
                  region: region || "General",
                  city: city || "General",
                  store_format: storeFormat || "General",
                });
              }
            }

            normalizedSales.push({
              store_id: storeId,
              week,
              net_sales: isNaN(netSales) ? 0 : netSales,
              target_sales: isNaN(targetSales) ? 0 : targetSales,
              transactions: isNaN(transactions) ? 0 : transactions,
              return_amount: isNaN(returnAmount) ? 0 : returnAmount,
              discount_amount: isNaN(discountAmount) ? 0 : discountAmount,
              gross_sales: isNaN(grossSales) ? (isNaN(netSales) ? 0 : netSales) : grossSales,
              product_category: productCategory || "General",
              stockout_incidents: isNaN(stockoutIncidents) ? 0 : stockoutIncidents,
              footfall: isNaN(footfall) ? undefined : footfall,
              units_sold: isNaN(unitsSold) ? undefined : unitsSold,
              inventory_on_hand: isNaN(inventoryOnHand) ? undefined : inventoryOnHand,
              customer_rating: isNaN(customerRating) ? undefined : customerRating,
              marketing_spend: isNaN(marketingSpend) ? undefined : marketingSpend,
            });
          });

          if (normalizedSales.length > 0) {
            newlyParsedSales = normalizedSales;
            salesLoadedCount = normalizedSales.length;
          }
        } else if (isStores) {
          const normalizedStores: StoreMasterRecord[] = [];
          rawJson.forEach((row) => {
            const normalizedRow: Record<string, any> = {};
            Object.keys(row).forEach((k) => {
              normalizedRow[normalizeKey(k)] = row[k];
            });

            const storeId = String(normalizedRow["storeid"] || normalizedRow["store"] || normalizedRow["id"] || "").trim();
            const storeName = String(normalizedRow["storename"] || normalizedRow["name"] || "").trim();
            const region = String(normalizedRow["region"] || "").trim();
            const city = String(normalizedRow["city"] || "").trim();
            const storeFormat = String(normalizedRow["storeformat"] || "").trim();

            if (!storeId) return;

            normalizedStores.push({
              store_id: storeId,
              store_name: storeName || `Store ${storeId}`,
              region: region || "General",
              city: city || "General",
              store_format: storeFormat || "General",
            });
          });

          if (normalizedStores.length > 0) {
            newlyParsedStores = normalizedStores;
            storesLoadedCount = normalizedStores.length;
          }
        }
      }

      if (salesLoadedCount > 0 || storesLoadedCount > 0) {
        let msg = "Google Sheet imported successfully! ";
        if (salesLoadedCount > 0) {
          setParsedSales(newlyParsedSales);
          msg += `Loaded ${salesLoadedCount} sales records. `;
        }
        if (storesLoadedCount > 0) {
          setParsedStores(newlyParsedStores);
          msg += `Loaded ${storesLoadedCount} store profiles. `;
        } else if (extractedStoresMap.size > 0) {
          const extractedStores = Array.from(extractedStoresMap.values());
          setParsedStores(extractedStores);
          newlyParsedStores = extractedStores;
          msg += `Extracted ${extractedStores.length} store profiles. `;
        }

        const finalSales = newlyParsedSales || [];
        const finalStores = newlyParsedStores || parsedStores || DEFAULT_STORE_MASTER;

        onDataLoaded(finalSales, finalStores);
        setSheetSuccessMessage(msg);
        setSalesFile(new File([], "Google Spreadsheet Source"));
        if (newlyParsedStores || extractedStoresMap.size > 0) {
          setStoresFile(new File([], "Google Spreadsheet Store Master"));
        }
      } else {
        throw new Error(
          "Could not identify or parse any sales logs or store master data from the spreadsheet. Check your column headers."
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorLog([err.message || "An unexpected error occurred while connecting to Google Sheets."]);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  return (
    <div id="upload-center" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
        <div>
          <h2 id="import-title" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-indigo-600" />
            Data Import Control Center
          </h2>
          <p id="import-desc" className="text-xs text-slate-500 mt-0.5">
            Configure dataset input from Google Sheets or standard spreadsheet files.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Navigation Tab Toggles */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeTab === "upload" 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setActiveTab("sheet")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "sheet" 
                  ? "bg-white text-emerald-600 shadow-sm" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Google Sheets
            </button>
          </div>

          <button
            id="btn-help-toggle"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            Schema Guide
          </button>
          
          {!isDemoActive && (
            <button
              id="btn-reset-demo"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {showHelp && (
        <div id="help-panel" className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-800 text-sm">Required File Structure Guide</span>
            <div className="flex gap-2">
              <button
                id="btn-dl-sales-tpl"
                onClick={() => downloadCSVTemplate("sales")}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded border border-slate-200"
              >
                <Download className="w-3 h-3" /> Sales CSV Template
              </button>
              <button
                id="btn-dl-stores-tpl"
                onClick={() => downloadCSVTemplate("stores")}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded border border-slate-200"
              >
                <Download className="w-3 h-3" /> Stores CSV Template
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">1. retail_weekly_sales.xlsx (or .csv)</h4>
              <p className="text-[11px] text-slate-500 mb-2">Weekly performance logs. Store attributes can be bundled inside or mapped.</p>
              <ul className="space-y-1 list-disc list-inside text-[11px]">
                <li><strong className="text-slate-800">store_id</strong> (string, unique key)</li>
                <li><strong className="text-slate-800">week_start_date</strong> (date/string)</li>
                <li><strong className="text-slate-800">product_category</strong> (e.g. Electronics, Apparel)</li>
                <li><strong className="text-slate-800">net_sales, sales_target, gross_sales</strong> (numbers)</li>
                <li><strong className="text-slate-800">transactions, units_sold, footfall</strong> (numbers)</li>
                <li><strong className="text-slate-800">returns_amount, discount_amount, marketing_spend</strong> (numbers)</li>
                <li><strong className="text-slate-800">stockouts</strong> (number, &gt; 5 is High Risk)</li>
                <li><strong className="text-slate-800">inventory_on_hand, customer_rating</strong> (numbers)</li>
              </ul>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">2. store_master.xlsx (or .csv)</h4>
              <p className="text-[11px] text-slate-500 mb-2">Unique records for store properties (Region, City, Format).</p>
              <ul className="space-y-1 list-disc list-inside text-[11px]">
                <li><strong className="text-slate-800">store_id</strong> (string, unique ID)</li>
                <li><strong className="text-slate-800">store_name</strong> (string, display name)</li>
                <li><strong className="text-slate-800">region</strong> (string, e.g. North, South, West)</li>
                <li><strong className="text-slate-800">city</strong> (string, e.g. New York, Houston)</li>
                <li><strong className="text-slate-800">store_format</strong> (e.g. Flagship, Express, Supercenter)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Grid containing upload targets */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload Sales File */}
          <div
            id="dropzone-sales"
            onDragOver={handleDragOver}
            onDrop={handleSalesDrop}
            onClick={triggerSalesInput}
            className={`group border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              salesFile 
                ? "border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40" 
                : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              id="input-sales-file"
              type="file"
              ref={salesInputRef}
              onChange={handleSalesUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            {salesFile ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2.5">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-emerald-800 max-w-full truncate">{salesFile.name}</span>
                <span className="text-[10px] text-emerald-600 mt-1 font-medium px-2 py-0.5 bg-emerald-50 rounded-full">
                  {salesCount > 0 ? `${salesCount} sales records loaded` : "Ready to join"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center mb-2.5 transition-colors">
                  <FileUp className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-900">Upload retail_weekly_sales.xlsx</span>
                <span className="text-[10px] text-slate-400 mt-1">Drag and drop or click to browse</span>
              </div>
            )}
          </div>

          {/* Upload Store Master File */}
          <div
            id="dropzone-stores"
            onDragOver={handleDragOver}
            onDrop={handleStoresDrop}
            onClick={triggerStoresInput}
            className={`group border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              storesFile 
                ? "border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40" 
                : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              id="input-stores-file"
              type="file"
              ref={storesInputRef}
              onChange={handleStoresUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            {storesFile ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2.5">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-emerald-800 max-w-full truncate">{storesFile.name}</span>
                <span className="text-[10px] text-emerald-600 mt-1 font-medium px-2 py-0.5 bg-emerald-50 rounded-full">
                  {storesCount > 0 ? `${storesCount} stores loaded` : "Ready to join"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center mb-2.5 transition-colors">
                  <FileUp className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-900">Upload store_master.xlsx</span>
                <span className="text-[10px] text-slate-400 mt-1">Drag and drop or click to browse</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Sheets Connector */}
      {activeTab === "sheet" && (
        <div id="google-sheets-connector" className="space-y-4 border border-indigo-50/50 p-4 rounded-xl bg-indigo-50/5/10 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cloud Google Sheets Import</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connect directly to your Google Sheets document. Supports automatic schema detection, date conversion, and real-time synchronization.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-4 rounded-xl border border-slate-150/80 shadow-sm animate-fade-in">
            <div className="md:col-span-6 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Google Spreadsheet URL or ID
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
              />
            </div>

            <div className="md:col-span-3 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Sheet Content
              </label>
              <select
                value={importTarget}
                onChange={(e) => setImportTarget(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium cursor-pointer"
              >
                <option value="auto">Auto-Detect Contents</option>
                <option value="sales">Force Sales Weekly Logs</option>
                <option value="stores">Force Stores Master</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={handleImportGoogleSheet}
                disabled={isFetchingSheet || !sheetUrl.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
              >
                {isFetchingSheet ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Import Cloud Sheet
                  </>
                )}
              </button>
            </div>
          </div>

          {sheetSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">{sheetSuccessMessage}</span>
            </div>
          )}

          {/* Guidelines on Sharing Sheets */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed animate-fade-in">
            <span className="font-bold text-slate-700 block mb-1">💡 Quick Share & Link Configuration Instructions:</span>
            To connect a sheet, click the <strong className="text-slate-800">Share</strong> button in the top right of your Google Sheet, 
            change General Access to <strong className="text-slate-800">"Anyone with the link can view"</strong>, copy the browser URL, 
            and paste it into the field above. Standard date columns like <span className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">week_start_date</span> are 
            automatically converted from <span className="font-mono bg-slate-100 px-1 rounded">dd-mm-yyyy</span> format to year-week dropdown ranges.
          </div>
        </div>
      )}

      {/* Error and Parsing Log panel */}
      {errorLog.length > 0 && (
        <div id="parsing-alerts" className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Parsing details and notifications:</span>
              <ul className="list-disc list-inside mt-1 max-h-24 overflow-y-auto space-y-0.5">
                {errorLog.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Combine Data button & Demo Mode Banner */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isDemoActive ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <span className="text-xs text-slate-600 font-medium">
            Status: <span className="text-slate-800 font-bold">{isDemoActive ? "DEMO PLAYGROUND ACTIVE" : "CUSTOM DATASET CONNECTED"}</span>
          </span>
        </div>

        {/* If custom sheets uploaded but not synchronized, provide compile join trigger */}
        {parsedSales && parsedStores && (
          <button
            id="btn-trigger-join"
            onClick={handleTriggerCombine}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            Join Custom Datasets Now
          </button>
        )}

        {isDemoActive && (
          <span className="text-[11px] text-slate-500 italic">
            Visualizing sample databases. Upload your files to override.
          </span>
        )}
      </div>
    </div>
  );
}
