import { redirect } from "next/navigation";

export default function AdminUploadedDesignsRedirectPage() {
  redirect("/admin/custom-orders?tab=requests");
}
