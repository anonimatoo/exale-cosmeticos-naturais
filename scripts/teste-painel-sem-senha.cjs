const fs = require("node:fs");
const cp = require("node:child_process");
const path = require("node:path");

const BASE = "https://exale-cosmeticos-naturais.vercel.app";
const STAMP = process.env.DATA_HORA || String(Date.now());
const REPORT_DIR = process.env.REPORT_DIR || "test-reports/teste-painel-sem-senha";

fs.mkdirSync(REPORT_DIR, { recursive: true });

const results = [];

function log(type, name, message) {
  results.push({ type, name, message });
  console.log(`[${type}] ${name}: ${message}`);
}

function ok(name, message) {
  log("OK", name, message);
}

function warn(name, message) {
  log("WARN", name, message);
}

function fail(name, message) {
  log("FAIL", name, message);
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function exists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      signal: controller.signal,
    });

    const text = await response.text();

    return {
      status: response.status,
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const response = await fetchText(url);

  let json = null;

  try {
    json = JSON.parse(response.text);
  } catch {}

  return { ...response, json };
}

function checkFiles() {
  const adminPage = read("src/app/admin/page.tsx");
  const painelPage = read("src/app/painel-exale/page.tsx");
  const painelLayout = read("src/app/painel-exale/layout.tsx");
  const saveAlert = read("src/components/admin-save-alert.tsx");
  const enhancer = read("src/components/admin-professional-enhancer.tsx");

  if (exists("src/app/admin/page.tsx")) ok("arquivo_admin", "src/app/admin/page.tsx existe.");
  else fail("arquivo_admin", "src/app/admin/page.tsx nao existe.");

  if (exists("src/app/painel-exale/page.tsx")) ok("arquivo_painel", "src/app/painel-exale/page.tsx existe.");
  else fail("arquivo_painel", "src/app/painel-exale/page.tsx nao existe.");

  if (adminPage.includes("redirect") && adminPage.includes("painel-exale")) {
    ok("admin_redirect", "/admin redireciona para /painel-exale.");
  } else {
    fail("admin_redirect", "/admin nao redireciona corretamente.");
  }

  if (painelPage.includes('"use client"') || painelPage.includes("'use client'")) {
    ok("painel_use_client", "Painel tem use client.");
  } else if (painelPage.includes("useState") || painelPage.includes("useEffect")) {
    fail("painel_use_client", "Painel usa hooks mas nao tem use client.");
  } else {
    warn("painel_use_client", "Nao identifiquei hooks no painel.");
  }

  if (painelPage.includes("/api/admin/data") || painelPage.includes("/api/admin/products")) {
    ok("painel_api_admin", "Painel usa API administrativa.");
  } else {
    warn("painel_api_admin", "Nao encontrei /api/admin no painel.");
  }

  if (painelLayout.includes("AdminSaveAlert")) ok("save_alert", "AdminSaveAlert instalado.");
  else warn("save_alert", "AdminSaveAlert nao encontrado no layout.");

  if (painelLayout.includes("AdminProfessionalEnhancer")) ok("enhancer", "AdminProfessionalEnhancer instalado.");
  else warn("enhancer", "AdminProfessionalEnhancer nao encontrado no layout.");

  if (saveAlert.includes("window.fetch")) ok("fetch_monitor", "Monitor de salvamento encontrado.");
  else warn("fetch_monitor", "Monitor de salvamento nao encontrado.");

  if (enhancer.includes("moneyFromTyping")) ok("formatacao_valor", "Formatacao automatica de valor encontrada.");
  else warn("formatacao_valor", "Formatacao automatica de valor nao encontrada.");

  if (exists("src/middleware.ts") || exists("src/src/middleware.ts")) {
    fail("middleware_next16", "middleware.ts encontrado. Next 16 deve usar proxy.ts.");
  } else {
    ok("middleware_next16", "Nenhum middleware.ts ativo.");
  }

  if (exists("src/proxy.ts")) ok("proxy", "src/proxy.ts existe.");
  else warn("proxy", "src/proxy.ts nao existe.");
}

async function checkHttp() {
  const urls = [
    ["site", `${BASE}/?v=painel-sem-senha-${STAMP}`],
    ["admin", `${BASE}/admin?v=painel-sem-senha-${STAMP}`],
    ["painel_exale", `${BASE}/painel-exale?v=painel-sem-senha-${STAMP}`],
    ["api_storefront", `${BASE}/api/storefront?v=painel-sem-senha-${STAMP}`],
    ["api_settings", `${BASE}/api/settings?v=painel-sem-senha-${STAMP}`],
    ["api_products", `${BASE}/api/products?v=painel-sem-senha-${STAMP}`],
  ];

  for (const [name, url] of urls) {
    try {
      const response = name.startsWith("api_") ? await fetchJson(url) : await fetchText(url);

      fs.writeFileSync(
        path.join(REPORT_DIR, `${name}.${name.startsWith("api_") ? "json" : "html"}`),
        name.startsWith("api_") ? JSON.stringify(response.json, null, 2) : response.text,
        "utf8"
      );

      if (response.status === 200) {
        ok(`http_${name}`, `HTTP 200`);
      } else {
        fail(`http_${name}`, `HTTP ${response.status}`);
      }

      if (name === "admin" && response.url.includes("/painel-exale")) {
        ok("admin_final_url", "/admin chegou em /painel-exale.");
      }

      if (!name.startsWith("api_")) {
        const lower = response.text.toLowerCase();

        const errors = [
          "application error",
          "internal server error",
          "hydration failed",
          "unhandled runtime error",
          "typeerror:",
          "referenceerror:",
          "syntaxerror:",
        ].filter((word) => lower.includes(word));

        if (errors.length) {
          fail(`html_${name}_erro`, "Encontrou erro visivel: " + errors.join(", "));
        } else {
          ok(`html_${name}_erro`, "Nenhum erro critico visivel no HTML.");
        }
      }

      if (name.startsWith("api_")) {
        if (response.json) ok(`json_${name}`, "JSON valido.");
        else fail(`json_${name}`, "JSON invalido ou vazio.");
      }
    } catch (error) {
      fail(`http_${name}`, error?.message || String(error));
    }
  }
}

function runBuild() {
  console.log("");
  console.log("============================================================");
  console.log("BUILD LOCAL");
  console.log("============================================================");

  const result = cp.spawnSync("npm", ["run", "build"], {
    encoding: "utf8",
    shell: false,
    maxBuffer: 50 * 1024 * 1024,
  });

  const output = String(result.stdout || "") + "\n" + String(result.stderr || "");

  fs.writeFileSync(path.join(REPORT_DIR, "build.log"), output, "utf8");

  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");

  if (result.status === 0) ok("build", "Build passou.");
  else fail("build", `Build falhou com codigo ${result.status}.`);

  if (output.includes("ƒ /painel-exale")) ok("rota_painel_build", "/painel-exale aparece dinamica no build.");
  else warn("rota_painel_build", "Nao identifiquei /painel-exale como dinamica no build.");
}

async function main() {
  console.log("============================================================");
  console.log("TESTE DO PAINEL ADMINISTRATIVO SEM SENHA");
  console.log("============================================================");
  console.log("Nao pede senha, nao faz login real, nao salva, nao remove, nao publica.");
  console.log("Relatorio:", REPORT_DIR);
  console.log("");

  checkFiles();
  await checkHttp();
  runBuild();

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
      ok: results.filter((r) => r.type === "OK").length,
      warn: results.filter((r) => r.type === "WARN").length,
      fail: results.filter((r) => r.type === "FAIL").length,
    },
    results,
  };

  fs.writeFileSync(path.join(REPORT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log("");
  console.log("============================================================");
  console.log("RESUMO FINAL");
  console.log("============================================================");
  console.log("OK:", summary.totals.ok);
  console.log("WARN:", summary.totals.warn);
  console.log("FAIL:", summary.totals.fail);
  console.log("Relatorio:", path.join(REPORT_DIR, "summary.json"));
  console.log("Log completo:", path.join(REPORT_DIR, "saida-terminal.log"));

  if (summary.totals.fail > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  fail("erro_geral", error?.stack || error?.message || String(error));
  fs.writeFileSync(path.join(REPORT_DIR, "summary.json"), JSON.stringify({ results }, null, 2), "utf8");
  process.exit(1);
});
