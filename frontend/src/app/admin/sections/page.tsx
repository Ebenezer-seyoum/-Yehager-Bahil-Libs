import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminSectionsWorkspace } from "@/components/admin/pages/admin-sections-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { can } from "@/lib/permissions";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

type HomepageCollection = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type HomepageSection = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  collections?: HomepageCollection[];
  subsections?: HomepageCollection[];
};

type Product = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  category?: string | null;
  images?: string[] | null;
  priceUsd?: string | number | null;
  uniqueId?: string | null;
  isActive?: boolean;
};

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function defaultHomepageSections(): Array<Omit<HomepageSection, "id" | "slug">> {
  return REGIONS.map((name, index) => ({
    name,
    isActive: true,
    sortOrder: index,
    collections: (TAXONOMY[name] ?? []).map((collection, collectionIndex) => ({
      id: `seed-${toSlug(name)}-${toSlug(collection)}`,
      name: collection,
      isActive: true,
      sortOrder: collectionIndex,
    })),
  }));
}

export default async function AdminSectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/sections");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "products.view")) {
    return <AccessRestricted requiredPermission="products.view" sectionName="Homepage collections" />;
  }

  let sections: HomepageSection[] = [];
  let products: Product[] = [];
  try {
    const sectionsResponse = await apiRequest<{ data: HomepageSection[] }>("/api/v1/admin/homepage-sections");
    sections = sectionsResponse.data ?? [];
    if (sections.length === 0 && can(session.user.permissions, "products.edit")) {
      const createdSections = await Promise.all(
        defaultHomepageSections().map((section) =>
          apiRequest<{ data: HomepageSection }>("/api/v1/admin/homepage-sections", { method: "POST", body: section }),
        ),
      );
      sections = createdSections.map((response) => response.data);
    }
  } catch {
    sections = [];
  }

  try {
    const productsResponse = await apiRequest<{ data: Product[] }>("/api/v1/admin/products?limit=200");
    products = productsResponse.data ?? [];
  } catch {
    products = [];
  }

  return (
    <AdminSectionsWorkspace
      data={{ sections, products }}
      canEdit={can(session.user.permissions, "products.edit")}
      canDelete={can(session.user.permissions, "products.delete")}
    />
  );
}
