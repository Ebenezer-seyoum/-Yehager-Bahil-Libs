import { redirect } from "next/navigation";

export default function EmployeeProductsRedirectPage() {
  redirect("/admin/inventory");
}
