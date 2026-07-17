"use client";

import { RefreshCcw } from "lucide-react";
import type { FilterFamily } from "@/lib/reports/report-registry";
import {
  DATE_RANGE_OPTIONS,
  FILTER_FIELDS_BY_FAMILY,
  type FilterValues,
} from "@/lib/reports/report-filters";

function SelectBox({
  label,
  value,
  onChange,
  options = [],
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  wide?: boolean;
}) {
  return (
    <label className={wide ? "min-w-[260px] flex-1" : "min-w-[220px] flex-1"}>
      <div className="mb-2 text-[12px] font-semibold text-slate-500">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 shadow-sm outline-none hover:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="min-w-[220px] flex-1">
      <div className="mb-2 text-[12px] font-semibold text-slate-500">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function ReportsFilterPanel({
  family,
  filters,
  optionLists,
  onChange,
  onClear,
}: {
  family: FilterFamily;
  filters: FilterValues;
  optionLists: Record<string, string[]>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const fields = FILTER_FIELDS_BY_FAMILY[family];

  return (
    <div className="px-6 py-4">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
        <span>Results update automatically when you change a filter.</span>
        <span className="hidden text-xs font-semibold text-blue-600 sm:inline">Live report</span>
      </div>
      <div className="flex flex-wrap items-end gap-5">
      {fields.includes("dateRange") ? (
        <SelectBox
          label="Date Range"
          value={filters.dateRange ?? "Last 30 Days"}
          onChange={(value) => onChange("dateRange", value)}
          options={[...DATE_RANGE_OPTIONS]}
          wide
        />
      ) : null}

      {fields.includes("status") ? (
        <SelectBox
          label="Status"
          value={filters.status ?? "All Status"}
          onChange={(value) => onChange("status", value)}
          options={optionLists.status ?? ["All Status"]}
        />
      ) : null}

      {fields.includes("paymentMethod") ? (
        <SelectBox
          label="Payment Method"
          value={filters.paymentMethod ?? "All Methods"}
          onChange={(value) => onChange("paymentMethod", value)}
          options={optionLists.paymentMethod ?? ["All Methods"]}
        />
      ) : null}

      {fields.includes("country") ? (
        <SelectBox
          label="Country"
          value={filters.country ?? "All Countries"}
          onChange={(value) => onChange("country", value)}
          options={optionLists.country ?? ["All Countries"]}
        />
      ) : null}

      {fields.includes("city") ? (
        <TextFilter
          label="City"
          value={filters.city ?? ""}
          onChange={(value) => onChange("city", value)}
          placeholder="Enter city"
        />
      ) : null}

      {fields.includes("employee") ? (
        <SelectBox
          label="Employee"
          value={filters.employee ?? "All Employees"}
          onChange={(value) => onChange("employee", value)}
          options={optionLists.employee ?? ["All Employees"]}
        />
      ) : null}

      {fields.includes("customerSearch") ? (
        <TextFilter
          label="Customer"
          value={filters.customerSearch ?? ""}
          onChange={(value) => onChange("customerSearch", value)}
          placeholder="Name or email"
        />
      ) : null}

      {fields.includes("product") ? (
        <TextFilter
          label="Product"
          value={filters.product ?? ""}
          onChange={(value) => onChange("product", value)}
          placeholder="Search product"
        />
      ) : null}

      {fields.includes("productCategory") ? (
        <SelectBox
          label="Product Category"
          value={filters.productCategory ?? "All Categories"}
          onChange={(value) => onChange("productCategory", value)}
          options={optionLists.productCategory ?? ["All Categories"]}
        />
      ) : null}

      {fields.includes("stockLevel") ? (
        <SelectBox
          label="Stock Level"
          value={filters.stockLevel ?? "All Stock"}
          onChange={(value) => onChange("stockLevel", value)}
          options={optionLists.stockLevel ?? ["All Stock", "Low Stock", "In Stock"]}
        />
      ) : null}

      {fields.includes("deliveryStatus") ? (
        <SelectBox
          label="Delivery Status"
          value={filters.deliveryStatus ?? "All Status"}
          onChange={(value) => onChange("deliveryStatus", value)}
          options={optionLists.deliveryStatus ?? ["All Status"]}
        />
      ) : null}

      {fields.includes("driver") ? (
        <SelectBox
          label="Driver"
          value={filters.driver ?? "All Drivers"}
          onChange={(value) => onChange("driver", value)}
          options={optionLists.driver ?? ["All Drivers"]}
        />
      ) : null}

      {fields.includes("refundStatus") ? (
        <SelectBox
          label="Refund Status"
          value={filters.refundStatus ?? "All Refunds"}
          onChange={(value) => onChange("refundStatus", value)}
          options={optionLists.refundStatus ?? ["All Refunds", "Refunded", "Not refunded"]}
        />
      ) : null}

      {fields.includes("ticketStatus") ? (
        <SelectBox
          label="Ticket Status"
          value={filters.ticketStatus ?? "All Status"}
          onChange={(value) => onChange("ticketStatus", value)}
          options={optionLists.ticketStatus ?? ["All Status", "open", "closed"]}
        />
      ) : null}

      {fields.includes("priority") ? (
        <SelectBox
          label="Priority"
          value={filters.priority ?? "All Priority"}
          onChange={(value) => onChange("priority", value)}
          options={optionLists.priority ?? ["All Priority", "info", "warning", "error", "critical"]}
        />
      ) : null}

      {fields.includes("amountMin") ? (
        <TextFilter
          label="Min Amount"
          value={filters.amountMin ?? ""}
          onChange={(value) => onChange("amountMin", value)}
          placeholder="0"
        />
      ) : null}

      {fields.includes("amountMax") ? (
        <TextFilter
          label="Max Amount"
          value={filters.amountMax ?? ""}
          onChange={(value) => onChange("amountMax", value)}
          placeholder="1000"
        />
      ) : null}

      {fields.includes("category") ? (
        <SelectBox
          label="Category"
          value={filters.category ?? "All Categories"}
          onChange={(value) => onChange("category", value)}
          options={optionLists.category ?? ["All Categories"]}
        />
      ) : null}

        <button
        type="button"
        onClick={onClear}
        className="mb-0 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <RefreshCcw className="h-4.5 w-4.5" />
        Clear Filters
        </button>
      </div>
    </div>
  );
}
