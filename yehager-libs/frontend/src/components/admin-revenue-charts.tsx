"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Order = {
  createdAt?: string | null;
  paymentStatus?: string | null;
  totalUsd?: number | string | null;
};

function buildLast14Days(orders: Order[]) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, revenue: 0, orders: 0 };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));

  for (const order of orders) {
    if (!order.createdAt) continue;
    const key = order.createdAt.slice(0, 10);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    if (order.paymentStatus === "paid") {
      bucket.revenue += Number(order.totalUsd ?? 0);
    }
  }

  return days;
}

function formatShortDay(value: string) {
  return value.slice(5);
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function AdminRevenueCharts({ orders }: { orders: Order[] }) {
  const data = buildLast14Days(orders);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-slate-950">Revenue</h2>
        <p className="mt-1 text-sm text-slate-700">Paid order value over the last 14 days.</p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDay}
                tick={{ fontSize: 10, fill: "#334155" }}
                stroke="#334155"
              />
              <YAxis tick={{ fontSize: 10, fill: "#334155" }} stroke="#334155" />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-slate-950">Orders</h2>
        <p className="mt-1 text-sm text-slate-700">Daily order volume over the last 14 days.</p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDay}
                tick={{ fontSize: 10, fill: "#334155" }}
                stroke="#334155"
              />
              <YAxis tick={{ fontSize: 10, fill: "#334155" }} stroke="#334155" />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
