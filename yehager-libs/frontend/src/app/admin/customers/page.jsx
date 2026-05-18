import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default async function AdminCustomersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin") redirect("/");
  const query = (await searchParams) ?? {};

  async function createCustomer(formData) {
    "use server";
    await apiRequest("/api/v1/admin/users/customers", {
      method: "POST",
      body: {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
    });
    revalidatePath("/admin/customers");
    redirect("/admin/customers?tab=create");
  }

  async function updateProfile(formData) {
    "use server";
    await apiRequest(`/api/v1/admin/users/${String(formData.get("userId"))}`, {
      method: "PATCH",
      body: { name: String(formData.get("name")), email: String(formData.get("email")) },
    });
    revalidatePath("/admin/customers");
    redirect("/admin/customers?tab=update");
  }

  async function updateStatus(formData) {
    "use server";
    await apiRequest(`/api/v1/admin/users/${String(formData.get("userId"))}/status`, {
      method: "PATCH",
      body: { status: String(formData.get("status")) },
    });
    revalidatePath("/admin/customers");
    redirect("/admin/customers?tab=block");
  }

  async function deleteCustomer(formData) {
    "use server";
    await apiRequest(`/api/v1/admin/users/${String(formData.get("userId"))}`, { method: "DELETE" });
    revalidatePath("/admin/customers");
    redirect("/admin/customers?tab=delete");
  }

  let users = [];
  let orders = [];
  try {
    const [usersResponse, ordersResponse] = await Promise.all([
      apiRequest("/api/v1/admin/users?limit=200"),
      apiRequest("/api/v1/orders?limit=200"),
    ]);
    users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch {}

  const customers = users.filter((user) => user.role === "customer").map((customer) => {
    const customerOrders = orders.filter((order) => order.userEmail === customer.email);
    return { ...customer, totalOrders: customerOrders.length, totalSpent: customerOrders.reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0) };
  });

  const tab = query.tab ?? "create";
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">People</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Customer Management</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {["create", "update", "delete", "block"].map((key) => (
          <a key={key} href={`/admin/customers?tab=${key}`} className={`rounded-xl px-4 py-2 text-sm capitalize ${tab === key ? "bg-primary text-primary-foreground" : "border border-border"}`}>{key}</a>
        ))}
      </div>
      {tab === "create" ? (
        <form action={createCustomer} className="grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-4">
          <input name="name" placeholder="Name" required className="h-11 rounded-xl border border-input bg-background px-3" />
          <input name="email" type="email" placeholder="Email" required className="h-11 rounded-xl border border-input bg-background px-3" />
          <input name="password" type="password" minLength={8} placeholder="Password" required className="h-11 rounded-xl border border-input bg-background px-3" />
          <button className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Create customer</button>
        </form>
      ) : null}
      <div className="space-y-3">
        {customers.map((customer) => (
          <article key={customer.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-semibold">{customer.name ?? "Unnamed customer"}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{customer.totalOrders} orders · {formatCurrency(customer.totalSpent)}</p>
              </div>
              <span className="text-sm capitalize">{customer.status}</span>
            </div>
            {tab === "update" ? (
              <form action={updateProfile} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="userId" value={customer.id} />
                <input name="name" defaultValue={customer.name ?? ""} className="h-10 rounded-xl border border-input bg-background px-3" />
                <input name="email" defaultValue={customer.email} className="h-10 rounded-xl border border-input bg-background px-3" />
                <button className="rounded-xl bg-secondary px-3 text-sm">Update</button>
              </form>
            ) : null}
            {tab === "block" ? (
              <form action={updateStatus} className="mt-4 flex gap-2">
                <input type="hidden" name="userId" value={customer.id} />
                <select name="status" defaultValue={customer.status} className="h-10 rounded-xl border border-input bg-background px-3">
                  {["active", "inactive", "suspended"].map((status) => <option key={status}>{status}</option>)}
                </select>
                <button className="rounded-xl bg-secondary px-3 text-sm">Save status</button>
              </form>
            ) : null}
            {tab === "delete" ? (
              <form action={deleteCustomer} className="mt-4">
                <input type="hidden" name="userId" value={customer.id} />
                <button className="rounded-xl border border-destructive/50 px-3 py-2 text-sm text-destructive">Delete</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
