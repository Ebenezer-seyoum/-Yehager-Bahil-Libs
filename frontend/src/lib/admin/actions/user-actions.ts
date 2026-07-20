"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export async function createEmployeeAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleId = String(formData.get("roleId") ?? "").trim() || undefined;
  const status = String(formData.get("status") ?? "active").trim() || undefined;

  if (!name || !email || !password) {
    redirect("/admin/users?tab=create&error=validation");
  }

  try {
    await apiRequest("/api/v1/admin/users/employees", {
      method: "POST",
      body: { name, email, password, roleId, status, sendInvite: false },
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/audit");
    redirect("/admin/users?tab=all&created=1");
  } catch {
    redirect("/admin/users?tab=create&error=create");
  }
}

export async function createCustomerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    redirect("/admin/customers?tab=create&error=validation");
  }

  try {
    await apiRequest("/api/v1/admin/users/customers", {
      method: "POST",
      body: { name, email, password },
    });
    revalidatePath("/admin/customers");
    redirect("/admin/customers?tab=all&created=1");
  } catch {
    redirect("/admin/customers?tab=create&error=create");
  }
}
