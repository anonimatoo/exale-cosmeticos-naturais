import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noCacheHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function getRequestPassword(request: NextRequest): string {
  const headerPassword =
    request.headers.get("x-admin-password")?.trim() || "";

  const authorization =
    request.headers.get("authorization")?.trim() || "";

  const bearerPassword =
    authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";

  return headerPassword || bearerPassword;
}

function isAuthorized(request: NextRequest): boolean {
  const configuredPassword =
    process.env.ADMIN_PASSWORD?.trim() || "";

  if (!configuredPassword) {
    return false;
  }

  const receivedPassword =
    getRequestPassword(request);

  return (
    receivedPassword.length > 0 &&
    receivedPassword === configuredPassword
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Acesso administrativo não autorizado.",
        },
        {
          status: 401,
          headers: noCacheHeaders(),
        }
      );
    }

    const reason =
      request.nextUrl.searchParams.get("reason") ||
      "sincronização solicitada pelo painel";

    /*
     * O salvamento principal já é realizado pela rota
     * /api/admin/save, que grava os dados no GitHub.
     *
     * Como o projeto está integrado à Vercel, o commit
     * dispara automaticamente um novo deployment.
     *
     * Esta rota funciona como confirmação de sincronização
     * para o painel e elimina o erro HTTP 404.
     */

    return NextResponse.json(
      {
        ok: true,
        synchronized: true,
        deploymentMode: "github-vercel",
        reason,
        message:
          "Alterações salvas. A atualização do site será realizada pelo deployment automático da Vercel.",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: noCacheHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "[EXALE sync-site]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Não foi possível confirmar a sincronização do site.",
      },
      {
        status: 500,
        headers: noCacheHeaders(),
      }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
        headers: noCacheHeaders(),
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      route: "/api/admin/sync-site",
      status: "ready",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: noCacheHeaders(),
    }
  );
}
