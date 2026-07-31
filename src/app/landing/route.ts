
import { getLandingPage, productScript } from "@/lib/landing-page-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const page = await getLandingPage();

  const doc = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <title>Exale Cosméticos Naturais</title>
  <style>${page.css || ""}</style>
</head>
<body>
  ${page.html || ""}
  ${productScript()}
</body>
</html>`;

  return new Response(doc, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
