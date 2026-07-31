
import { getLiveStorefrontFreshSafe } from "@/lib/live-storefront-fresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function noCacheHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export async function GET() {
  const store = await getLiveStorefrontFreshSafe();
  return Response.json(store, { headers: noCacheHeaders() });
}
