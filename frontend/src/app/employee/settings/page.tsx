import { redirect } from "next/navigation";

export default function EmployeeSettingsRedirectPage() {
  redirect("/admin/profile");
}
