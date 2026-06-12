import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "customer" | "employee";
      permissions: string[];
      roleStatus?: "unassigned" | "assigned";
      assignedRoleId?: string | null;
      assignedRoleActive?: boolean | null;
      assignedRoleName?: string | null;
      accountStatus?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "customer" | "employee";
    permissions?: string[];
    roleStatus?: "unassigned" | "assigned";
    assignedRoleId?: string | null;
    assignedRoleActive?: boolean | null;
    assignedRoleName?: string | null;
    accountStatus?: string;
  }
}
