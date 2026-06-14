"use client";

import {
  ADMIN_TAB_ACTION,
  ADMIN_TAB_ACTION_ACTIVE,
  ADMIN_TAB_ACTIVE,
  ADMIN_TAB_BUTTON_BASE,
  ADMIN_TAB_ICON_ACTION,
  ADMIN_TAB_ICON_ACTIVE,
  ADMIN_TAB_ICON_INACTIVE,
  ADMIN_TAB_INACTIVE,
  ADMIN_TAB_LIST,
  ADMIN_TAB_WRAPPER,
  ADMIN_TAB_WRAPPER_ACCENT,
} from "@/lib/admin/admin-design-system";
import type { AdminTabConfig } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

function TabButton({
  tab,
  active,
  onChange,
}: {
  tab: AdminTabConfig;
  active: boolean;
  onChange: (tabId: string) => void;
}) {
  const Icon = tab.icon;
  const isAction = tab.variant === "action";

  const buttonClass = cn(
    ADMIN_TAB_BUTTON_BASE,
    isAction
      ? active
        ? ADMIN_TAB_ACTION_ACTIVE
        : ADMIN_TAB_ACTION
      : active
        ? ADMIN_TAB_ACTIVE
        : ADMIN_TAB_INACTIVE,
  );

  const iconClass = cn(
    "h-4 w-4 shrink-0",
    isAction
      ? ADMIN_TAB_ICON_ACTION
      : active
        ? ADMIN_TAB_ICON_ACTIVE
        : ADMIN_TAB_ICON_INACTIVE,
  );

  return (
    <button type="button" onClick={() => onChange(tab.id)} className={buttonClass}>
      <Icon className={iconClass} />
      <span className="whitespace-nowrap">{tab.label}</span>
      {typeof tab.badgeCount === "number" && tab.badgeCount > 0 ? (
        <span
          className={cn(
            "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black",
            active ? "bg-white text-blue-700" : "bg-blue-600 text-white",
          )}
        >
          {tab.badgeCount > 99 ? "99+" : tab.badgeCount}
        </span>
      ) : null}
    </button>
  );
}

export function AdminTabs({
  tabs,
  activeTab,
  onChange,
}: {
  pageId?: string;
  tabs: AdminTabConfig[];
  activeTab: string;
  onChange: (tabId: string) => void;
}) {
  return (
    <nav aria-label="Page sections" className="w-full">
      <div className={ADMIN_TAB_WRAPPER}>
        <span className={ADMIN_TAB_WRAPPER_ACCENT} aria-hidden />
        <div className={ADMIN_TAB_LIST}>
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={tab.id === activeTab} onChange={onChange} />
          ))}
        </div>
      </div>
    </nav>
  );
}
