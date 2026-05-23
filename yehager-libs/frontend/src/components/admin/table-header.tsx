"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  TABLE_HEAD_CELL_CLASS,
  TABLE_HEAD_CELL_SORTABLE_CLASS,
  TABLE_HEAD_CELL_SORTED_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEAD_ROW_CLASS,
} from "@/lib/admin/admin-design-system";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function TableHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <thead className={cn(TABLE_HEAD_CLASS, className)}>{children}</thead>;
}

export function TableHeadRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn(TABLE_HEAD_ROW_CLASS, className)}>{children}</tr>;
}

export function TableHeadCell({
  children,
  className,
  sortable,
  sorted,
  sortDirection,
  onSort,
  colSpan,
  scope = "col",
}: {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: boolean;
  sortDirection?: "asc" | "desc";
  onSort?: () => void;
  colSpan?: number;
  scope?: "col" | "row";
}) {
  const content = (
    <span className="inline-flex items-center gap-1.5">
      {children}
      {sortable ? (
        sorted ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" aria-hidden />
        )
      ) : null}
    </span>
  );

  const cellClass = cn(
    TABLE_HEAD_CELL_CLASS,
    sortable && "group",
    sortable && TABLE_HEAD_CELL_SORTABLE_CLASS,
    sorted && TABLE_HEAD_CELL_SORTED_CLASS,
    className,
  );

  if (sortable && onSort) {
    return (
      <th scope={scope} colSpan={colSpan} className={cellClass}>
        <button type="button" onClick={onSort} className="inline-flex w-full items-center text-left">
          {content}
        </button>
      </th>
    );
  }

  return (
    <th scope={scope} colSpan={colSpan} className={cellClass}>
      {content}
    </th>
  );
}

/** Aliases for legacy imports */
export const AdminTableHead = TableHeader;
export const AdminTableHeadRow = TableHeadRow;
export const AdminTableHeadCell = TableHeadCell;
