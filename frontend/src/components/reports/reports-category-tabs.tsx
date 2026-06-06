"use client";

import {
  ADMIN_TAB_ACTIVE,
  ADMIN_TAB_BUTTON_BASE,
  ADMIN_TAB_ICON_ACTIVE,
  ADMIN_TAB_ICON_INACTIVE,
  ADMIN_TAB_INACTIVE,
  ADMIN_TAB_LIST,
  ADMIN_TAB_WRAPPER,
  ADMIN_TAB_WRAPPER_ACCENT,
} from "@/lib/admin/admin-design-system";
import { categories, type ReportCategoryKey } from "@/lib/reports/report-registry";
import { cn } from "@/lib/utils";

/** Report category tabs — same tab bar style as AdminTabs */
export function ReportsCategoryTabs({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: ReportCategoryKey;
  onSelectCategory: (category: ReportCategoryKey) => void;
}) {
  return (
    <nav aria-label="Report categories" className="w-full">
      <div className={ADMIN_TAB_WRAPPER}>
        <span className={ADMIN_TAB_WRAPPER_ACCENT} aria-hidden />
        <div className={ADMIN_TAB_LIST}>
          {categories.map((category) => {
            const Icon = category.icon;
            const active = selectedCategory === category.key;

            return (
              <button
                key={category.key}
                type="button"
                onClick={() => onSelectCategory(category.key)}
                className={cn(
                  ADMIN_TAB_BUTTON_BASE,
                  active ? ADMIN_TAB_ACTIVE : ADMIN_TAB_INACTIVE,
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? ADMIN_TAB_ICON_ACTIVE : ADMIN_TAB_ICON_INACTIVE,
                  )}
                />
                <span className="whitespace-nowrap">{category.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
