import { redirect } from "next/navigation";

export default function EmployeeActivityRedirectPage() {
  redirect("/admin/audit");
}
