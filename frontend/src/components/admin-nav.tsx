import Link from "next/link";

export function AdminNav({ active }: { active: "orders" | "inventory" | "alerts" | "audit" | "users" }) {
  const items = [
    { href: "/admin", label: "Orders", key: "orders" as const },
    { href: "/admin/inventory", label: "Inventory", key: "inventory" as const },
    { href: "/admin/users", label: "Users", key: "users" as const },
    { href: "/admin/alerts", label: "Alerts", key: "alerts" as const },
    { href: "/admin/audit", label: "Audit Logs", key: "audit" as const },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={
            item.key === active
              ? "rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              : "rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
