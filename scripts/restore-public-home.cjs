const fs = require("node:fs");
const cp = require("node:child_process");
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

function badScore(text) {
  const t = text.toLowerCase();
  const bad = [
    "painel administrativo",
    "painel-exale",
    "/api/admin",
    "loja e logo",
    "salvar loja",
    "edite sua loja",
    "settab(",
    "saveproduct",
    "adminpassword",
    "senha",
    "entrar com segurança",
    "exale-live-storefront",
    "vitrine atualizada pelo painel",
    "produtos cadastrados pelo painel",
    "atualização ao vivo",
    "atualizacao ao vivo"
  ];

  return bad.reduce((n, m) => n + (t.includes(m) ? 1 : 0), 0);
}

function goodScore(text) {
  const t = text.toLowerCase();
  const good = [
    "carrinho",
    "whatsapp",
    "produtos",
    "produto",
    "comprar",
    "promoção",
    "promocao",
    "especial exale",
    "em alta",
    "compre pelo whatsapp",
    "exale",
    "checkout",
    "getruntimestorefront",
    "addtocart"
  ];

  return good.reduce((n, m) => n + (t.includes(m) ? 1 : 0), 0);
}

function isPublicHome(text) {
  return text && goodScore(text) >= 3 && badScore(text) === 0;
}

const candidates = [];

function addCandidate(label, text) {
  if (!text) return;
  candidates.push({
    label,
    text,
    good: goodScore(text),
    bad: badScore(text),
    len: text.length,
  });
}

if (exists(pageFile)) addCandidate("atual:src/app/page.tsx", read(pageFile));
if (exists(clientFile)) addCandidate("atual:src/app/home-client.tsx", read(clientFile));

function walk(dir) {
  if (!exists(dir)) return;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    let st;
    try { st = fs.statSync(full); } catch { continue; }

    if (st.isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(item)) walk(full);
    } else if (item === "page.tsx" || item === "page.tsx.bak" || item === "home-client.tsx") {
      try {
        addCandidate("backup:" + full, read(full));
      } catch {}
    }
  }
}

walk("backups");

let commits = [];
try {
  commits = cp.execSync("git rev-list --all -- src/app/page.tsx", { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
} catch {}

for (const commit of commits) {
  try {
    const text = cp.execSync(`git show ${commit}:src/app/page.tsx`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    addCandidate("git:" + commit, text);
  } catch {}
}

candidates.sort((a, b) => {
  if (a.bad !== b.bad) return a.bad - b.bad;
  if (a.good !== b.good) return b.good - a.good;
  return b.len - a.len;
});

const chosen = candidates.find((c) => isPublicHome(c.text));

if (!chosen) {
  console.error("ERRO: não encontrei uma home pública original segura.");
  console.error("A correção parou para não colocar o painel na rota /.");
  process.exit(1);
}

let client = chosen.text;

client = client.replace(/^\s*export const runtime\s*=\s*["']edge["'];?\s*\n/gm, "");
client = client.replace(/^\s*export const runtime\s*=\s*["']nodejs["'];?\s*\n/gm, "");
client = client.replace(/^\s*export const dynamic\s*=\s*["']force-dynamic["'];?\s*\n/gm, "");
client = client.replace(/^\s*export const revalidate\s*=\s*0;?\s*\n/gm, "");
client = client.replace(/^\s*export const fetchCache\s*=\s*["']force-no-store["'];?\s*\n/gm, "");
client = client.replace(/^\s*["']use client["'];?\s*\n/gm, "");
client = client.replace(/^\s*\/\/ @ts-nocheck\s*\n/gm, "");

client = `"use client";\n// @ts-nocheck\n\n${client.trimStart()}`;

write(clientFile, client);

const wrapper = `import HomeClient from "./home-client";
import { getRuntimeStorefront } from "@/lib/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function safeJson(data: any) {
  return JSON.stringify(data).replace(/</g, "\\\\u003c");
}

export default async function SitePage() {
  const data = await getRuntimeStorefront();

  return (
    <>
      <script
        id="exale-storefront-data"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: safeJson(data) }}
      />
      <HomeClient initialData={data} />
    </>
  );
}
`;

write(pageFile, wrapper);

const cssFile = "src/app/globals.css";
if (exists(cssFile)) {
  let css = read(cssFile);
  css = css.replace(/\n\/\* EXALE LIVE STOREFRONT FINAL \*\/[\s\S]*?(?=\n\/\*|$)/g, "\n");
  write(cssFile, css);
}

console.log("Home pública restaurada de:", chosen.label);
console.log("Rota / agora é SITE.");
