import { useState } from "react";
import { Search } from "lucide-react";

const SEVERITY_BADGE = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900",
};

const CATEGORY_BADGE = {
  order: "bg-amber-100 text-amber-800",
  inventory: "bg-green-100 text-green-800",
  payment: "bg-purple-100 text-purple-800",
  shipping: "bg-blue-100 text-blue-700",
  customer: "bg-rose-100 text-rose-800",
  system: "bg-gray-100 text-gray-700",
  admin: "bg-slate-100 text-slate-700",
};

export default function AuditLogPanel({ logs }) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = logs.filter(l => {
    const matchSearch = l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.performed_by?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || l.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {["order", "inventory", "payment", "shipping", "customer", "system", "admin"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {["Time", "Action", "Category", "Severity", "Entity", "By"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 100).map(log => (
              <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_date).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs max-w-xs truncate">{log.action}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_BADGE[log.category] || "bg-gray-100 text-gray-700"}`}>
                    {log.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEVERITY_BADGE[log.severity] || "bg-gray-100 text-gray-700"}`}>
                    {log.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.entity_type} {log.entity_id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs">{log.performed_by || "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No logs found.</div>
        )}
      </div>
    </div>
  );
}