import { redirect } from "next/navigation";

export default function EmployeeOrdersRedirectPage() {
  redirect("/admin/catalog-orders");
}
