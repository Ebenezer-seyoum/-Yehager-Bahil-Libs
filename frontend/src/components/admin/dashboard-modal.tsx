"use client";

import { X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type DashboardModalSize = "compact" | "sm" | "md" | "lg" | "xl" | "wide";
type DashboardModalChrome = "compact" | "form" | "detail" | "wide";
type DashboardModalButtonSize = "sm" | "md" | "lg";

const modalSizeClass: Record<DashboardModalSize, string> = {
  compact: "max-w-2xl",
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  wide: "max-w-[90rem]",
};

export function dashboardModalContentClass(size: DashboardModalSize = "lg", className?: string) {
  return cn(
    "max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-h-[92vh]",
    modalSizeClass[size],
    className,
  );
}

export function DashboardModalFrame({
  children,
  maxWidth = "max-w-5xl",
  className,
  onClose,
  closeLabel = "Close",
}: {
  children: ReactNode;
  maxWidth?: string;
  className?: string;
  onClose?: () => void;
  closeLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {onClose ? <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label={closeLabel} /> : null}
      <section
        className={cn(
          "relative z-[1] max-h-[92vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl",
          maxWidth,
          className,
        )}
      >
        {children}
      </section>
    </div>
  );
}

export function DashboardModalHeader({
  title,
  description,
  icon: Icon,
  onClose,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  onClose?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 bg-blue-950 px-6 py-4 pr-16 text-white shadow-sm">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <h2 className="truncate text-lg font-bold leading-tight text-white">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm text-blue-100">{description}</p> : null}
        {children}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function DashboardModalActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-6 py-3", className)}>
      {children}
    </div>
  );
}

export function DashboardModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-h-[calc(92vh-76px)] overflow-y-auto bg-slate-50 p-5", className)}>{children}</div>;
}

export function DashboardModalSection({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {title ? <h3 className="text-base font-bold text-slate-900">{title}</h3> : null}
      {children}
    </section>
  );
}

export function DashboardModalTitleBar({
  title,
  description,
  icon: Icon,
  variant = "form",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  variant?: DashboardModalChrome;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-blue-950 text-left text-white",
        variant === "compact"
          ? "px-7 py-4 pr-14"
          : variant === "detail"
            ? "px-8 py-5 pr-16"
            : "px-8 py-5 pr-16",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-white",
              variant === "compact" ? "h-8 w-8" : "h-10 w-10",
            )}
          >
            <Icon className={variant === "compact" ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
          </span>
        ) : null}
        <h2
          className={cn(
            "truncate font-bold leading-tight text-white",
            variant === "compact" ? "text-2xl" : "text-2xl sm:text-3xl",
          )}
        >
          {title}
        </h2>
      </div>
      {description ? (
        <p
          className={cn(
            "mt-2 max-w-4xl text-blue-100",
            variant === "compact" ? "text-base leading-6" : "text-base leading-7 sm:text-lg",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export const DashboardModalScrollBody = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
    hasFooter?: boolean;
    variant?: DashboardModalChrome;
  }
>(({ children, className, hasFooter = true, variant = "form" }, ref) => (
  <div
    ref={ref}
    className={cn(
      variant === "compact"
        ? hasFooter
          ? "max-h-[calc(86vh-140px)]"
          : "max-h-[calc(86vh-82px)]"
        : variant === "detail"
          ? hasFooter
            ? "max-h-[calc(92vh-154px)]"
            : "max-h-[calc(92vh-96px)]"
          : hasFooter
            ? "max-h-[calc(90vh-152px)] sm:max-h-[calc(92vh-156px)]"
            : "max-h-[calc(90vh-90px)] sm:max-h-[calc(92vh-98px)]",
      "overflow-y-auto bg-slate-50",
      variant === "compact" ? "px-6 py-6" : "px-7 py-7",
      className,
    )}
  >
    {children}
  </div>
));

DashboardModalScrollBody.displayName = "DashboardModalScrollBody";

export function DashboardModalFooter({
  children,
  className,
  variant = "form",
}: {
  children: ReactNode;
  className?: string;
  variant?: DashboardModalChrome;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-slate-200 bg-white",
        variant === "compact" ? "px-6 py-4" : "px-7 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardModalFooterButton({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: DashboardModalButtonSize;
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 rounded-xl px-4 text-sm"
      : size === "lg"
        ? "h-12 rounded-2xl px-7 text-base"
        : "h-11 rounded-xl px-5 text-sm";
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold shadow-sm transition disabled:opacity-50",
        variant === "primary"
          ? "bg-blue-700 text-white shadow-blue-700/25 hover:bg-blue-800"
          : variant === "danger"
            ? "bg-red-600 text-white shadow-red-600/20 hover:bg-red-700"
            : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const dashboardModalPresets = {
  compact: {
    content: (className?: string) => dashboardModalContentClass("compact", className),
    body: "max-h-[calc(86vh-140px)] overflow-y-auto bg-slate-50 px-6 py-6",
    chrome: "compact" as const,
  },
  simple: {
    content: (className?: string) => dashboardModalContentClass("compact", className),
    body: "max-h-[calc(86vh-140px)] overflow-y-auto bg-slate-50 px-6 py-6",
    chrome: "compact" as const,
  },
  form: {
    content: (className?: string) => dashboardModalContentClass("xl", className),
    body: "max-h-[calc(90vh-152px)] overflow-y-auto bg-slate-50 px-7 py-7 sm:max-h-[calc(92vh-156px)]",
    chrome: "form" as const,
  },
  detail: {
    content: (className?: string) => dashboardModalContentClass("xl", className),
    body: "max-h-[calc(92vh-96px)] overflow-y-auto bg-slate-50 px-7 py-7",
    chrome: "detail" as const,
  },
  scrollable: {
    content: (className?: string) => dashboardModalContentClass("xl", className),
    body: "max-h-[calc(92vh-96px)] overflow-y-auto bg-slate-50 px-7 py-7",
    chrome: "detail" as const,
  },
  wide: {
    content: (className?: string) => dashboardModalContentClass("wide", className),
    body: "max-h-[calc(90vh-152px)] overflow-y-auto bg-slate-50 px-7 py-7 sm:max-h-[calc(92vh-156px)]",
    chrome: "wide" as const,
  },
};
