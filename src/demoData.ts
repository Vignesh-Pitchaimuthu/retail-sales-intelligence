import { StoreMasterRecord, WeeklySalesRecord, JoinedRecord } from "./types";

export const DEFAULT_STORE_MASTER: StoreMasterRecord[] = [
  { store_id: "ST001", store_name: "Manhattan Flagship", region: "North", city: "New York", store_format: "Flagship" },
  { store_id: "ST002", store_name: "Brooklyn Express", region: "North", city: "New York", store_format: "Express" },
  { store_id: "ST003", store_name: "Sunset Supercenter", region: "West", city: "Los Angeles", store_format: "Supercenter" },
  { store_id: "ST004", store_name: "Beverly Hills Boutique", region: "West", city: "Los Angeles", store_format: "Boutique" },
  { store_id: "ST005", store_name: "Lincoln Park Boutique", region: "Midwest", city: "Chicago", store_format: "Boutique" },
  { store_id: "ST006", store_name: "Loop Daily Express", region: "Midwest", city: "Chicago", store_format: "Express" },
  { store_id: "ST007", store_name: "Magnificent Mile Flagship", region: "Midwest", city: "Chicago", store_format: "Flagship" },
  { store_id: "ST008", store_name: "Metro Galleria Mall", region: "South", city: "Houston", store_format: "Supercenter" },
  { store_id: "ST009", store_name: "Houston Downtown Express", region: "South", city: "Houston", store_format: "Express" },
  { store_id: "ST010", store_name: "Union Square Flagship", region: "West", city: "San Francisco", store_format: "Flagship" },
  { store_id: "ST011", store_name: "Buckhead Executive Store", region: "South", city: "Atlanta", store_format: "Boutique" },
  { store_id: "ST012", store_name: "Atlanta Perimeter Supercenter", region: "South", city: "Atlanta", store_format: "Supercenter" }
];

const WEEKS = ["W23", "W24", "W25", "W26"];
const CATEGORIES = ["Electronics", "Apparel", "Home & Kitchen", "Groceries", "Beauty"];

// Generate deterministic-looking random sales data based on store format and category
export const generateWeeklySales = (stores: StoreMasterRecord[]): WeeklySalesRecord[] => {
  const records: WeeklySalesRecord[] = [];

  // Seeding factor to make data realistic and consistent
  stores.forEach((store) => {
    // Determine performance multiplier for this store
    // ST002 (Brooklyn Express) and ST006 (Loop Daily Express) will underperform (< 90% target)
    // ST004 (Beverly Hills Boutique) and ST010 (Union Square) will overperform
    let performanceMultiplier = 1.0;
    if (store.store_id === "ST002") performanceMultiplier = 0.81; // Underperformer
    else if (store.store_id === "ST006") performanceMultiplier = 0.78; // Underperformer
    else if (store.store_id === "ST004") performanceMultiplier = 1.15;
    else if (store.store_id === "ST010") performanceMultiplier = 1.12;
    else performanceMultiplier = 0.94 + (parseInt(store.store_id.slice(-2)) % 5) * 0.04; // 0.94, 0.98, 1.02, 1.06, 1.10

    WEEKS.forEach((week) => {
      CATEGORIES.forEach((category) => {
        // Base numbers based on format and category
        let baseSales = 20000;
        if (store.store_format === "Supercenter") baseSales = 45000;
        else if (store.store_format === "Flagship") baseSales = 35000;
        else if (store.store_format === "Boutique") baseSales = 15000;
        else if (store.store_format === "Express") baseSales = 10000;

        // Category adjustments
        let categoryMultiplier = 1.0;
        if (category === "Electronics") categoryMultiplier = 1.4;
        else if (category === "Groceries") categoryMultiplier = 1.2;
        else if (category === "Apparel") categoryMultiplier = 1.0;
        else if (category === "Home & Kitchen") categoryMultiplier = 0.8;
        else if (category === "Beauty") categoryMultiplier = 0.7;

        // Week adjustments to create a trend (e.g. rising sales)
        let weekMultiplier = 1.0;
        if (week === "W23") weekMultiplier = 0.92;
        else if (week === "W24") weekMultiplier = 0.96;
        else if (week === "W25") weekMultiplier = 1.02;
        else if (week === "W26") weekMultiplier = 1.08;

        // Base target calculations
        const targetSales = Math.round(baseSales * categoryMultiplier * weekMultiplier);
        
        // Net sales with some randomized fluctuation multiplied by performanceMultiplier
        const seedValue = (parseInt(store.store_id.slice(-2)) + week.charCodeAt(2) + category.charCodeAt(0)) % 100;
        const fluctuation = 0.85 + (seedValue / 100) * 0.3; // 0.85 to 1.15
        let netSales = Math.round(targetSales * fluctuation * performanceMultiplier);
        
        // Ensure net sales is positive and realistic
        if (netSales < 1000) netSales = 1000;

        // Return rate - Apparel (6.2%) and Electronics (5.8%) have higher return rates
        let returnRate = 0.02; // default 2%
        if (category === "Apparel") returnRate = 0.068; // 6.8%
        else if (category === "Electronics") returnRate = 0.054; // 5.4%
        else if (category === "Home & Kitchen") returnRate = 0.038;
        else if (category === "Beauty") returnRate = 0.025;
        const returnAmount = Math.round(netSales * returnRate);

        // Discount rate
        const discountRate = 0.05 + (seedValue % 15) / 100; // 5% to 19%
        // Net Sales = Gross Sales - Discount Amount -> Gross Sales = Net Sales / (1 - discountRate)
        const grossSales = Math.round(netSales / (1 - discountRate));
        const discountAmount = grossSales - netSales;

        // Transactions
        let avgTicket = 45; // average basket size
        if (category === "Electronics") avgTicket = 180;
        else if (category === "Beauty") avgTicket = 65;
        else if (category === "Home & Kitchen") avgTicket = 85;
        const transactions = Math.max(1, Math.round(netSales / avgTicket));

        // Stockout incidents
        // Make some combinations have stockouts > 5 (High Stockout Risk)
        // Store 3, 7, and 12 will have higher stockout issues in groceries & electronics
        let stockoutIncidents = seedValue % 4; // 0 to 3 default
        if ((store.store_id === "ST003" || store.store_id === "ST007" || store.store_id === "ST012") && 
            (category === "Groceries" || category === "Electronics") && 
            (week === "W25" || week === "W26")) {
          stockoutIncidents = 6 + (seedValue % 4); // 6 to 9 incidents (High risk!)
        }

        records.push({
          store_id: store.store_id,
          week,
          net_sales: netSales,
          target_sales: targetSales,
          transactions,
          return_amount: returnAmount,
          discount_amount: discountAmount,
          gross_sales: grossSales,
          product_category: category,
          stockout_incidents: stockoutIncidents
        });
      });
    });
  });

  return records;
};

export const DEFAULT_WEEKLY_SALES: WeeklySalesRecord[] = generateWeeklySales(DEFAULT_STORE_MASTER);

// Pre-joined dataset for default display
export const getDemoJoinedData = (): JoinedRecord[] => {
  const storeMap = new Map<string, StoreMasterRecord>();
  DEFAULT_STORE_MASTER.forEach((s) => storeMap.set(s.store_id, s));

  return DEFAULT_WEEKLY_SALES.map((sale, index) => {
    const store = storeMap.get(sale.store_id) || {
      store_id: sale.store_id,
      store_name: `Store ${sale.store_id}`,
      region: "Unknown",
      city: "Unknown",
      store_format: "Unknown"
    };

    return {
      ...sale,
      ...store,
      id: `${sale.store_id}_${sale.week}_${sale.product_category.replace(/\s+/g, "")}_${index}`
    };
  });
};

// Generate template CSV text for retail_weekly_sales.xlsx / csv
export const getSalesCSVTemplate = (): string => {
  return [
    "week_start_date,region,store_id,store_name,city,store_format,product_category,footfall,transactions,units_sold,gross_sales,discount_amount,net_sales,sales_target,inventory_on_hand,stockouts,returns_amount,customer_rating,marketing_spend",
    "2026-06-01,North,ST001,Manhattan Flagship,New York,Flagship,Electronics,12000,136,350,27700,3200,24500,25000,850,2,1200,4.5,450",
    "2026-06-01,North,ST001,Manhattan Flagship,New York,Flagship,Apparel,8500,278,540,13600,1100,12500,12000,1200,0,850,4.2,300",
    "2026-06-01,North,ST002,Brooklyn Express,New York,Express,Groceries,5400,198,420,9850,950,8900,11000,320,6,180,3.9,150",
    "2026-06-01,West,ST003,Sunset Supercenter,Los Angeles,Supercenter,Home & Kitchen,21000,530,980,49500,4500,45000,43000,2400,4,1400,4.6,800",
    "2026-06-01,West,ST004,Beverly Hills Boutique,Los Angeles,Boutique,Beauty,7200,254,310,18300,1800,16500,15000,640,1,410,4.8,600"
  ].join("\n");
};

// Generate template CSV text for store_master.xlsx / csv
export const getStoresCSVTemplate = (): string => {
  return [
    "store_id,store_name,region,city,store_format",
    "ST001,Manhattan Flagship,North,New York,Flagship",
    "ST002,Brooklyn Express,North,New York,Express",
    "ST003,Sunset Supercenter,West,Los Angeles,Supercenter",
    "ST004,Beverly Hills Boutique,West,Los Angeles,Boutique"
  ].join("\n");
};
