const fs = require("node:fs");
const path = require("node:path");

const pageFile = "src/app/page.tsx";
const clientFile = "src/app/home-client.tsx";

function exists(file) {
  try { return fs.existsSync(file); } catch { return false; }
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

if (!exists(clientFile)) {
  console.error("ERRO: src/app/home-client.tsx nao encontrado.");
  process.exit(1);
}

function removeFunction(text, name) {
  const patterns = [
    `export async function ${name}`,
    `async function ${name}`,
    `export function ${name}`,
    `function ${name}`,
  ];

  for (const pattern of patterns) {
    let index = text.indexOf(pattern);

    while (index !== -1) {
      const brace = text.indexOf("{", index);
      if (brace === -1) break;

      let depth = 0;
      let end = -1;

      for (let i = brace; i < text.length; i++) {
        if (text[i] === "{") depth++;
        if (text[i] === "}") depth--;

        if (depth === 0) {
          end = i + 1;
          break;
        }
      }

      if (end === -1) break;

      const lineStart = text.lastIndexOf("\n", index) + 1;
      text = text.slice(0, lineStart) + text.slice(end).replace(/^\s*\n/, "\n");
      index = text.indexOf(pattern);
    }
  }

  return text;
}

function extractImports(text) {
  const imports = [];

  text = text.replace(/^\s*import[\s\S]*?from\s*["'][^"']+["'];?\s*\n/gm, (match) => {
    imports.push(match.trim());
    return "";
  });

  text = text.replace(/^\s*import\s*["'][^"']+["'];?\s*\n/gm, (match) => {
    imports.push(match.trim());
    return "";
  });

  return { imports, body: text };
}

function cleanClient(text) {
  text = text.replace(/^\s*export const runtime\s*=\s*["']edge["'];?\s*\n/gm, "");
  text = text.replace(/^\s*export const runtime\s*=\s*["']nodejs["'];?\s*\n/gm, "");
  text = text.replace(/^\s*export const dynamic\s*=\s*["']force-dynamic["'];?\s*\n/gm, "");
  text = text.replace(/^\s*export const revalidate\s*=\s*0;?\s*\n/gm, "");
  text = text.replace(/^\s*export const fetchCache\s*=\s*["']force-no-store["'];?\s*\n/gm, "");
  text = text.replace(/^\s*["']use client["'];?\s*\n/gm, "");
  text = text.replace(/^\s*\/\/ @ts-nocheck\s*\n/gm, "");

  const extracted = extractImports(text);

  let imports = extracted.imports.filter((line) => {
    const l = line.toLowerCase();
    if (l.includes("from \"react\"")) return false;
    if (l.includes("from 'react'")) return false;
    if (l.includes("@/lib/runtime-store")) return false;
    if (l.includes("@/lib/github-live-store")) return false;
    if (l.includes("node:fs")) return false;
    if (l.includes("node:path")) return false;
    if (l.includes("github-live-store")) return false;
    return true;
  });

  let body = extracted.body;

  body = removeFunction(body, "getRuntimeStorefront");

  body = body.replace(
    /export\s+default\s+async\s+function\s+([A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/,
    "export default function $1({ initialData = null }: any) {"
  );

  body = body.replace(
    /export\s+default\s+function\s+([A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/,
    "export default function $1({ initialData = null }: any) {"
  );

  const stateBlock = `const [data, setData] = useState<any>(initialData || null);

  useEffect(() => {
    let alive = true;

    if (!data) {
      getRuntimeStorefront()
        .then((nextData) => {
          if (alive) {
            setData(nextData || {
              settings: {},
              products: [],
              banners: [],
              productLines: [],
              coupons: [],
              combos: [],
            });
          }
        })
        .catch(() => {
          if (alive) {
            setData({
              settings: {},
              products: [],
              banners: [],
              productLines: [],
              coupons: [],
              combos: [],
            });
          }
        });
    }

    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "linear-gradient(135deg,#fff7ed,#fffaf0,#ffffff)",
          color: "#3b2a18",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>Exale Cosmeticos Naturais</div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>Carregando loja...</div>
        </div>
      </main>
    );
  }`;

  body = body.replace(
    /const\s+data(?:\s*:\s*[^=;]+)?\s*=\s*await\s+getRuntimeStorefront\s*\(\s*\)\s*;?/,
    stateBlock
  );

  body = body.replace(
    /let\s+data(?:\s*:\s*[^=;]+)?\s*=\s*await\s+getRuntimeStorefront\s*\(\s*\)\s*;?/,
    stateBlock
  );

  const helper = `async function getRuntimeStorefront() {
  try {
    if (typeof document !== "undefined") {
      const element = document.getElementById("exale-storefront-data");
      const raw = element?.textContent || "";

      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}

  const response = await fetch("/api/storefront?client=" + Date.now(), {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao carregar dados da vitrine.");
  }

  return response.json();
}

`;

  const header = [
    `"use client";`,
    `// @ts-nocheck`,
    ``,
    `import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";`,
    ...imports,
    ``,
    helper.trimEnd(),
    ``,
  ].join("\n");

  return header + "\n" + body.trimStart();
}

let client = cleanClient(read(clientFile));

if (/await\s+getRuntimeStorefront\s*\(/.test(client)) {
  console.error("ERRO: ainda existe await getRuntimeStorefront no home-client.");
  process.exit(1);
}

if (/@\/lib\/runtime-store|@\/lib\/github-live-store|node:fs|node:path/.test(client)) {
  console.error("ERRO: home-client ainda importa codigo de servidor.");
  process.exit(1);
}

write(clientFile, client);

const page = `"use client";
// @ts-nocheck

import dynamic from "next/dynamic";

const PublicHome = dynamic(() => import("./home-client"), {
  ssr: false,
  loading: () => (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(135deg,#fff7ed,#fffaf0,#ffffff)",
        color: "#3b2a18",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>Exale Cosmeticos Naturais</div>
        <div style={{ marginTop: 10, fontWeight: 700 }}>Carregando loja...</div>
      </div>
    </main>
  ),
});

export default function SitePage() {
  return <PublicHome />;
}
`;

write(pageFile, page);

write("src/app/admin/page.tsx", `import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminRedirect() {
  redirect("/painel-exale");
}
`);

write("src/app/painel/page.tsx", `import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PainelRedirect() {
  redirect("/painel-exale");
}
`);

console.log("OK: home-client corrigido sem await ilegal e sem import de servidor.");
