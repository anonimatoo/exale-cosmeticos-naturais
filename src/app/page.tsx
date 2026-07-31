import ExaleStorefrontRestored from "@/components/exale-storefront-restored";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function HomePage() {
  return <ExaleStorefrontRestored />;
}
