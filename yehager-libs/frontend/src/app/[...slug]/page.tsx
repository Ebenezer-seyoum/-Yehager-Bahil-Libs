import { RoutePlaceholder } from "@/components/route-placeholder";

const namedRoutes: Record<string, string> = {
  catalog: "Product Catalog",
  product: "Product Detail",
  cart: "Cart",
  checkout: "Checkout",
  "order-confirmation": "Order Confirmation",
  events: "Events",
  event: "Event Dashboard",
  join: "Event Join",
  "my-orders": "My Orders",
  "tailoring-status": "Tailoring Status",
  "family-group": "Family Group",
  "create-family-group": "Create Family Group",
  "my-account": "My Account",
  "care-and-info": "Care and Info",
  about: "About Us",
  "follow-us": "Follow Us",
  terms: "Terms and Conditions",
  admin: "Admin Dashboard",
};

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const first = slug[0] ?? "";
  const fallbackTitle = first
    ? first
        .split("-")
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" ")
    : "Page";
  const title = namedRoutes[first] ?? fallbackTitle;
  const path = `/${slug.join("/")}`;

  return <RoutePlaceholder title={title} path={path} />;
}
