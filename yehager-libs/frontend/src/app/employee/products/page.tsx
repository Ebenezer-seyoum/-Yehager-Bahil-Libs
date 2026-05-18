import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

function formatCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default async function EmployeeProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/employee/products");
  if (session.user.role !== "employee" && session.user.role !== "admin") redirect("/");

  let products: any[] = [];
  try {
    const response = (await apiRequest("/api/v1/admin/products?limit=200")) as { data?: any[] };
    products = Array.isArray(response?.data) ? response.data : [];
  } catch {
    products = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Employee</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">Read-only product visibility for staff with product access.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-muted-foreground">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{product.region}</td>
                  <td className="px-4 py-3">{product.category ?? "—"}</td>
                  <td className="px-4 py-3 text-primary">{formatCurrency(product.priceUsd)}</td>
                  <td className="px-4 py-3">{product.isActive ? "Active" : "Hidden"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
