import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminCustomersDirectory } from "@/components/admin-customers-directory";

function hrefFor(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return `/admin/customers?${search.toString()}`;
}

export default async function AdminCustomersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin") redirect("/");
  const query = (await searchParams) ?? {};

  async function createCustomer(formData) {
    "use server";
    try {
      await apiRequest("/api/v1/admin/users/customers", {
        method: "POST",
        body: {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        },
      });
      revalidatePath("/admin/customers");
      redirect("/admin/customers?created=1");
    } catch {
      redirect("/admin/customers?error=create");
    }
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
  const panelMode = query.panel === "create" ? "create" : "manage";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Customers</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">{panelMode === "create" ? "New Customer" : "All Customers"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {panelMode === "create"
              ? "Create a customer account for storefront access and order tracking."
              : "Search, review, and manage customer accounts with the same workflow as employees."}
          </p>
        </div>
        <a
          href={hrefFor({ panel: "create" })}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:w-auto"
        >
          + Add customer
        </a>
      </div>

      {query.created === "1" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">Success — customer account created.</div> : null}
      {query.updated ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">Success — customer information updated.</div> : null}
      {query.deleted === "1" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">Success — customer was deleted.</div> : null}
      {query.error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">Action failed — please review the customer details and try again.</div> : null}

      {panelMode === "create" ? (
        <section className="overflow-hidden rounded-[28px] border border-border bg-card">
          <div className="border-t-4 border-primary bg-background/60 px-5 py-8 text-center sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">👤</div>
            <h2 className="mt-5 text-3xl font-semibold">Register New Customer</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Create a customer account for storefront access and order tracking.</p>
          </div>
          <form action={createCustomer} className="space-y-6 p-5 sm:p-6">
            <section className="rounded-3xl border border-border bg-background/50 p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Customer Information</p>
                <h3 className="mt-2 text-xl font-semibold">Account Information</h3>
                <p className="mt-1 text-sm text-muted-foreground">Basic details used to identify the customer account.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input name="name" placeholder="Name" required className="h-12 rounded-xl border border-input bg-background px-4" />
                <input name="email" type="email" placeholder="Email" required className="h-12 rounded-xl border border-input bg-background px-4" />
                <input name="password" type="password" minLength={8} placeholder="Password" required className="h-12 rounded-xl border border-input bg-background px-4 md:col-span-2" />
              </div>
            </section>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <a href="/admin/customers" className="rounded-xl border border-border px-5 py-3 text-center text-sm font-medium">Back to customers</a>
              <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">+ Create customer</button>
            </div>
          </form>
        </section>
      ) : (
        <AdminCustomersDirectory customers={customers} />
      )}
    </div>
  );
}
