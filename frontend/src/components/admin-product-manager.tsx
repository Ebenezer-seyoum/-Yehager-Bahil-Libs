"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  region: string;
  subcategory?: string | null;
  category?: string | null;
  uniqueId?: string | null;
  priceUsd: string | number;
  groomPriceUsd?: string | number | null;
  gender: "male" | "female" | "unisex";
  images?: string[];
  fabricType?: string | null;
  embroideryStyle?: string | null;
  tailoringDays?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  hasNewPriceSubmission?: boolean;
  priceSubmissionAlertId?: string | null;
};

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatEtb(value: string | number | null | undefined) {
  const amount = Number(value) * 156.16;
  if (!Number.isFinite(amount)) return "0 ETB";
  return `${Math.round(amount).toLocaleString()} ETB`;
}

export function AdminProductManager({
  initialProducts,
  externalSearch,
  onFilteredCountChange,
}: {
  initialProducts: Product[];
  externalSearch?: string;
  viewMode?: "modal" | "page";
  onFilteredCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [newPriceProductIds, setNewPriceProductIds] = useState<string[]>(
    initialProducts.filter((product) => product.hasNewPriceSubmission).map((product) => product.id),
  );

  useEffect(() => {
    const refresh = () => {
      fetch("/api/backend/admin/summary-counts", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          const ids = payload?.data?.catalogPriceProductIds;
          if (Array.isArray(ids)) setNewPriceProductIds(ids.filter(Boolean).map(String));
        })
        .catch(() => undefined);
    };
    refresh();
    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const filteredProducts = initialProducts.filter((p) => {
    if (!externalSearch) return true;
    const q = externalSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.uniqueId?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.region.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    onFilteredCountChange?.(filteredProducts.length);
  }, [filteredProducts.length, onFilteredCountChange]);

  function openProductDetail(productId: string) {
    router.push(`/admin/inventory/${productId}`);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full divide-y divide-slate-200 text-left text-sm text-slate-900 bg-white">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell className="w-14">No</TableHeadCell>
              <TableHeadCell>Clothing Item with ID</TableHeadCell>
              <TableHeadCell>Price</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product, index) => {
              const image = product.images?.[0];
              const hasNewPrice = newPriceProductIds.includes(product.id);
              return (
                <tr 
                  key={product.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => openProductDetail(product.id)}
                >
                  <td className="px-6 py-5 text-sm font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">
                    {index + 1}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex min-w-[420px] items-center gap-5">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-transform group-hover:scale-105">
                        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div>
                        <p className="line-clamp-1 text-base font-black text-slate-900 uppercase tracking-tight">
                          {product.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {hasNewPrice ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-800">
                              New Price
                            </span>
                          ) : null}
                          <span className="font-mono text-[10px] font-black tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                            #{product.uniqueId ?? product.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            {product.subcategory || product.region}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-nowrap">
                    <div className="inline-flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                      <span className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(product.priceUsd)}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{formatEtb(product.priceUsd)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                      product.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                    )}>
                      {product.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <DashboardTableActions>
                      <DashboardActionButton 
                        action="view" 
                        onClick={(e) => {
                          e.stopPropagation();
                          openProductDetail(product.id);
                        }} 
                      />
                    </DashboardTableActions>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                  No matches found for your search criteria.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
