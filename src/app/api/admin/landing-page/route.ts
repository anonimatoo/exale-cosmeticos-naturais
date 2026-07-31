/* eslint-disable @typescript-eslint/no-explicit-any */

import { getLandingPage, saveLandingPage } from "@/lib/landing-page-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function noCache() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export async function GET() {
  const page = await getLandingPage();
  return Response.json(page, { headers: noCache() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await saveLandingPage(body);

    return Response.json(
      {
        ...saved,
        ok: true,
        message: "Landing page salva com sucesso.",
      },
      { headers: noCache() }
    );
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        message: String(error?.message || error || "Erro ao salvar landing page."),
      },
      {
        status: 500,
        headers: noCache(),
      }
    );
  }
}
