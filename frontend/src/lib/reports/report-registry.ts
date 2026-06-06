import type { LucideIcon } from "lucide-react";
import {
  Box,
  BriefcaseBusiness,
  Clock,
  Headphones,
  Package,
  RotateCcw,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

export type ReportCategoryKey =
  | "overview"
  | "sales"
  | "orders"
  | "customers"
  | "delivery"
  | "product"
  | "financial"
  | "support";

export type ReportKey =
  | "business-overview"
  | "sales-overview"
  | "revenue-summary"
  | "order-overview"
  | "customer-overview"
  | "top-customers"
  | "delivery-overview"
  | "delivery-performance"
  | "product-overview"
  | "low-stock"
  | "payment-overview"
  | "refunds-returns"
  | "support-overview"
  | "daily-sales"
  | "monthly-sales"
  | "sales-by-product"
  | "sales-by-category"
  | "sales-by-country"
  | "sales-by-customer"
  | "sales-by-payment-method"
  | "sales-growth"
  | "all-orders"
  | "pending-orders"
  | "delivered-orders"
  | "cancelled-orders"
  | "returned-orders"
  | "orders-by-country"
  | "orders-by-customer"
  | "orders-by-date-range"
  | "customer-list"
  | "new-customers"
  | "returning-customers"
  | "customer-location-report"
  | "customer-purchase-history"
  | "delivery-summary"
  | "driver-performance"
  | "pending-deliveries"
  | "delivered-packages"
  | "failed-deliveries"
  | "delivery-by-country-city"
  | "product-performance"
  | "best-selling-products"
  | "product-category-report"
  | "inventory-report"
  | "product-revenue-report"
  | "revenue-report"
  | "payment-methods"
  | "refund-report"
  | "profit-loss-summary"
  | "tax-vat-summary"
  | "outstanding-payments"
  | "support-tickets"
  | "open-tickets"
  | "closed-tickets"
  | "customer-complaints"
  | "response-time-report";

export type FilterFamily =
  | "orders"
  | "sales"
  | "customers"
  | "products"
  | "delivery"
  | "financial"
  | "support";

export const categories: {
  key: ReportCategoryKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    key: "overview",
    title: "Overview",
    subtitle: "Business overview & analytics",
    icon: TrendingUp,
    color: "blue",
  },
  {
    key: "sales",
    title: "Sales Reports",
    subtitle: "Sales performance & analysis",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    key: "orders",
    title: "Order Reports",
    subtitle: "Order status & analysis",
    icon: ShoppingBag,
    color: "purple",
  },
  {
    key: "customers",
    title: "Customer Reports",
    subtitle: "Customer insights & analytics",
    icon: Users,
    color: "blue",
  },
  {
    key: "delivery",
    title: "Delivery Reports",
    subtitle: "Delivery & shipping analysis",
    icon: Truck,
    color: "orange",
  },
  {
    key: "product",
    title: "Clothes / Products",
    subtitle: "Clothing performance, inventory & stock",
    icon: Box,
    color: "cyan",
  },
  {
    key: "financial",
    title: "Financial Reports",
    subtitle: "Financial & accounting reports",
    icon: WalletCards,
    color: "rose",
  },
  {
    key: "support",
    title: "Support Reports",
    subtitle: "Support tickets & performance",
    icon: Headphones,
    color: "violet",
  },
];

export const reportsList: {
  key: ReportKey;
  category: ReportCategoryKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  filterFamily: FilterFamily;
  dataSource: "orders" | "products" | "customers" | "support";
}[] = [
  {
    key: "business-overview",
    category: "overview",
    title: "Business Overview",
    subtitle: "Complete business performance overview",
    icon: TrendingUp,
    color: "blue",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "sales-overview",
    category: "sales",
    title: "Sales Overview",
    subtitle: "Detailed sales performance analysis",
    icon: WalletCards,
    color: "amber",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "revenue-summary",
    category: "sales",
    title: "Revenue Summary",
    subtitle: "Revenue trends and breakdown",
    icon: TrendingUp,
    color: "rose",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "order-overview",
    category: "orders",
    title: "Order Overview",
    subtitle: "Order statistics and summary",
    icon: Package,
    color: "orange",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "customer-overview",
    category: "customers",
    title: "Customer Overview",
    subtitle: "Customer growth and insights",
    icon: Users,
    color: "blue",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "top-customers",
    category: "customers",
    title: "Top Customers",
    subtitle: "Best customers by spending",
    icon: Star,
    color: "blue",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "delivery-overview",
    category: "delivery",
    title: "Delivery Overview",
    subtitle: "Delivery performance summary",
    icon: Truck,
    color: "emerald",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "delivery-performance",
    category: "delivery",
    title: "Delivery Performance",
    subtitle: "Driver performance analytics",
    icon: Headphones,
    color: "green",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "product-overview",
    category: "product",
    title: "Product Overview",
    subtitle: "Top products and stock summary",
    icon: BriefcaseBusiness,
    color: "violet",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "low-stock",
    category: "product",
    title: "Low Stock Report",
    subtitle: "Products with low inventory",
    icon: Package,
    color: "orange",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "payment-overview",
    category: "financial",
    title: "Payment Overview",
    subtitle: "Payment methods analysis",
    icon: WalletCards,
    color: "purple",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "refunds-returns",
    category: "financial",
    title: "Refunds & Returns",
    subtitle: "Refunds and returns analysis",
    icon: RotateCcw,
    color: "rose",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "support-overview",
    category: "support",
    title: "Support Overview",
    subtitle: "Ticket volume, resolution, and response trends",
    icon: Headphones,
    color: "violet",
    filterFamily: "support",
    dataSource: "support",
  },
  {
    key: "daily-sales",
    category: "sales",
    title: "Daily Sales",
    subtitle: "Sales by day with trend comparison",
    icon: TrendingUp,
    color: "emerald",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "monthly-sales",
    category: "sales",
    title: "Monthly Sales",
    subtitle: "Sales performance by month",
    icon: TrendingUp,
    color: "emerald",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "sales-by-product",
    category: "sales",
    title: "Sales by Product",
    subtitle: "Revenue contribution by product",
    icon: BriefcaseBusiness,
    color: "blue",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "sales-by-category",
    category: "sales",
    title: "Sales by Category",
    subtitle: "Revenue by product category",
    icon: Box,
    color: "cyan",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "sales-by-country",
    category: "sales",
    title: "Sales by Country",
    subtitle: "Where sales are coming from",
    icon: Truck,
    color: "orange",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "sales-by-customer",
    category: "sales",
    title: "Sales by Customer",
    subtitle: "Customer revenue distribution",
    icon: Users,
    color: "blue",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "sales-by-payment-method",
    category: "sales",
    title: "Sales by Payment Method",
    subtitle: "Payment method revenue mix",
    icon: WalletCards,
    color: "purple",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "sales-growth",
    category: "sales",
    title: "Sales Growth",
    subtitle: "Growth rate and trend analysis",
    icon: TrendingUp,
    color: "green",
    filterFamily: "sales",
    dataSource: "orders",
  },
  {
    key: "all-orders",
    category: "orders",
    title: "All Orders Report",
    subtitle: "Full order ledger and status overview",
    icon: ShoppingBag,
    color: "orange",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "pending-orders",
    category: "orders",
    title: "Pending Orders",
    subtitle: "Orders waiting to be processed",
    icon: Clock,
    color: "amber",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "delivered-orders",
    category: "orders",
    title: "Delivered Orders",
    subtitle: "Completed and delivered orders",
    icon: Truck,
    color: "green",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "cancelled-orders",
    category: "orders",
    title: "Cancelled Orders",
    subtitle: "Cancelled or failed orders",
    icon: RotateCcw,
    color: "rose",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "returned-orders",
    category: "orders",
    title: "Returned Orders",
    subtitle: "Returned and refunded orders",
    icon: RotateCcw,
    color: "rose",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "orders-by-country",
    category: "orders",
    title: "Orders by Country",
    subtitle: "Order distribution by geography",
    icon: Truck,
    color: "orange",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "orders-by-customer",
    category: "orders",
    title: "Orders by Customer",
    subtitle: "Order frequency by customer",
    icon: Users,
    color: "blue",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "orders-by-date-range",
    category: "orders",
    title: "Orders by Date Range",
    subtitle: "Order volume over time",
    icon: TrendingUp,
    color: "green",
    filterFamily: "orders",
    dataSource: "orders",
  },
  {
    key: "customer-list",
    category: "customers",
    title: "Customer List",
    subtitle: "All active and historical customers",
    icon: Users,
    color: "blue",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "new-customers",
    category: "customers",
    title: "New Customers",
    subtitle: "Recently acquired customers",
    icon: Users,
    color: "emerald",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "returning-customers",
    category: "customers",
    title: "Returning Customers",
    subtitle: "Repeat buyers and loyal users",
    icon: Star,
    color: "blue",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "customer-location-report",
    category: "customers",
    title: "Customer Location Report",
    subtitle: "Customer distribution by country and city",
    icon: Truck,
    color: "orange",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "customer-purchase-history",
    category: "customers",
    title: "Customer Purchase History",
    subtitle: "Lifetime orders and spend by customer",
    icon: BriefcaseBusiness,
    color: "violet",
    filterFamily: "customers",
    dataSource: "customers",
  },
  {
    key: "delivery-summary",
    category: "delivery",
    title: "Delivery Summary",
    subtitle: "Delivery status summary and success rate",
    icon: Truck,
    color: "emerald",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "driver-performance",
    category: "delivery",
    title: "Driver Performance",
    subtitle: "Delivery driver performance comparison",
    icon: Truck,
    color: "green",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "pending-deliveries",
    category: "delivery",
    title: "Pending Deliveries",
    subtitle: "Deliveries waiting for action",
    icon: Clock,
    color: "amber",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "delivered-packages",
    category: "delivery",
    title: "Delivered Packages",
    subtitle: "Successfully completed deliveries",
    icon: Truck,
    color: "emerald",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "failed-deliveries",
    category: "delivery",
    title: "Failed Deliveries",
    subtitle: "Delivery issues and failures",
    icon: RotateCcw,
    color: "rose",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "delivery-by-country-city",
    category: "delivery",
    title: "Delivery by Country/City",
    subtitle: "Delivery distribution across locations",
    icon: Truck,
    color: "orange",
    filterFamily: "delivery",
    dataSource: "orders",
  },
  {
    key: "product-performance",
    category: "product",
    title: "Product Performance",
    subtitle: "Product revenue and popularity",
    icon: BriefcaseBusiness,
    color: "violet",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "best-selling-products",
    category: "product",
    title: "Best Selling Products",
    subtitle: "Top products by units sold",
    icon: Star,
    color: "green",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "product-category-report",
    category: "product",
    title: "Product Category Report",
    subtitle: "Performance by category",
    icon: Box,
    color: "cyan",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "inventory-report",
    category: "product",
    title: "Inventory Report",
    subtitle: "Catalog availability and stock alerts",
    icon: Package,
    color: "orange",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "product-revenue-report",
    category: "product",
    title: "Product Revenue Report",
    subtitle: "Revenue contribution by product",
    icon: WalletCards,
    color: "purple",
    filterFamily: "products",
    dataSource: "products",
  },
  {
    key: "revenue-report",
    category: "financial",
    title: "Revenue Report",
    subtitle: "Revenue and net revenue trend",
    icon: WalletCards,
    color: "blue",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "payment-methods",
    category: "financial",
    title: "Payment Methods",
    subtitle: "Payment method breakdown",
    icon: WalletCards,
    color: "purple",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "refund-report",
    category: "financial",
    title: "Refund Report",
    subtitle: "Refunded orders and amounts",
    icon: RotateCcw,
    color: "rose",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "profit-loss-summary",
    category: "financial",
    title: "Profit/Loss Summary",
    subtitle: "Revenue vs shipping and refunds",
    icon: TrendingUp,
    color: "green",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "tax-vat-summary",
    category: "financial",
    title: "Tax/VAT Summary",
    subtitle: "Taxable and VAT-related orders",
    icon: WalletCards,
    color: "amber",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "outstanding-payments",
    category: "financial",
    title: "Outstanding Payments",
    subtitle: "Orders still awaiting payment",
    icon: Clock,
    color: "orange",
    filterFamily: "financial",
    dataSource: "orders",
  },
  {
    key: "support-tickets",
    category: "support",
    title: "Support Tickets",
    subtitle: "All support tickets and alerts",
    icon: Headphones,
    color: "violet",
    filterFamily: "support",
    dataSource: "support",
  },
  {
    key: "open-tickets",
    category: "support",
    title: "Open Tickets",
    subtitle: "Tickets still awaiting action",
    icon: Clock,
    color: "amber",
    filterFamily: "support",
    dataSource: "support",
  },
  {
    key: "closed-tickets",
    category: "support",
    title: "Closed Tickets",
    subtitle: "Resolved support tickets",
    icon: Headphones,
    color: "green",
    filterFamily: "support",
    dataSource: "support",
  },
  {
    key: "customer-complaints",
    category: "support",
    title: "Customer Complaints",
    subtitle: "Complaint and incident tracking",
    icon: RotateCcw,
    color: "rose",
    filterFamily: "support",
    dataSource: "support",
  },
  {
    key: "response-time-report",
    category: "support",
    title: "Response Time Report",
    subtitle: "Time to resolution by ticket",
    icon: TrendingUp,
    color: "blue",
    filterFamily: "support",
    dataSource: "support",
  },
];

export const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  green: "bg-green-50 text-green-600 border-green-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
};

export const metricStyle: Record<string, string> = {
  blue: "from-blue-600 to-blue-500",
  green: "from-green-600 to-green-500",
  purple: "from-purple-600 to-violet-600",
  orange: "from-orange-600 to-orange-500",
  rose: "from-rose-600 to-red-500",
};

export function getReport(key: string) {
  return reportsList.find((report) => report.key === key) ?? reportsList[0];
}

export function reportsForCategory(category: ReportCategoryKey, search = "") {
  return reportsList.filter((item) => {
    const matchesCategory = item.category === category;
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

export function firstReportInCategory(category: ReportCategoryKey) {
  return reportsForCategory(category)[0]?.key ?? "business-overview";
}
