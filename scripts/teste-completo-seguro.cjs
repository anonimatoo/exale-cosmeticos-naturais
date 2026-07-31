const fs = require("node:fs");
const cp = require("node:child_process");
const path = require("node:path");

const SITE = "https://exale-cosmeticos-naturais.vercel.app";
const STAMP = process.env.DATA_HORA || String(Date.now());
const REPORT_DIR = process.env.REPORT_DIR || "test-reports/teste-completo-seguro";
fs.mkdirSync(REPORT_DIR, { recursive: true });

const results = [];

function log(type, name, message) {
  const item = { type, name, message };
  results.push(item);
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

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function hasFile(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url);
  let json = null;

  try {
    json = JSON.parse(response.text);
  } catch {}

  return { ...response, json };
}

function pickProducts(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.produtos)) return data.produtos;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data?.produtos)) return data.data.produtos;
  return [];
}

function pickSettings(data) {
  return data?.settings || data?.store || data?.loja || data?.config || {};
}

function parseMoney(value) {
  if (typeof value === "number") return value;

  const text = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatPhoneBR(value) {
  let d = onlyDigits(value);

  if (d.startsWith("55") && d.length > 11) d = d.slice(2);

  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  return value;
}

function formatCPF(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length !== 11) return value;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCNPJ(value) {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCEP(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length !== 8) return value;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function checkTextDoesNotContainAdmin(html) {
  const forbidden = [
    "painel administrativo",
    "entrar com segurança",
    "entrar com seguranca",
    "loja e logo",
    "salvar loja",
    "/api/admin/data",
    "adminpassword",
  ];

  const lower = String(html || "").toLowerCase();
  const found = forbidden.filter((word) => lower.includes(word));

  if (found.length) {
    fail("site_publico_nao_pode_conter_painel", "A home contem termos de painel: " + found.join(", "));
  } else {
    ok("site_publico_nao_contem_painel", "A rota / nao contem termos de painel administrativo.");
  }
}

function checkStaticFiles() {
  const page = readFileSafe("src/app/page.tsx");
  const home = readFileSafe("src/app/home-client.tsx");
  const admin = readFileSafe("src/app/admin/page.tsx");
  const painel = readFileSafe("src/app/painel-exale/page.tsx");

  if (!page) fail("arquivo_page", "src/app/page.tsx nao encontrado.");
  else ok("arquivo_page", "src/app/page.tsx encontrado.");

  if (!home) fail("arquivo_home_client", "src/app/home-client.tsx nao encontrado.");
  else ok("arquivo_home_client", "src/app/home-client.tsx encontrado.");

  if (hasFile("src/middleware.ts") || hasFile("src/src/middleware.ts")) {
    fail("middleware_next16", "middleware.ts encontrado. Next 16 deve usar proxy.ts.");
  } else {
    ok("middleware_next16", "Nenhum middleware.ts ativo encontrado.");
  }

  if (hasFile("src/proxy.ts")) {
    ok("proxy_next16", "src/proxy.ts encontrado.");
  } else {
    warn("proxy_next16", "src/proxy.ts nao encontrado.");
  }

  if (admin.includes("redirect") && admin.includes("painel-exale")) {
    ok("admin_redirect", "/admin redireciona para /painel-exale.");
  } else {
    fail("admin_redirect", "/admin nao parece redirecionar para /painel-exale.");
  }

  const pageLower = page.toLowerCase();

  if (
    pageLower.includes("painel administrativo") ||
    pageLower.includes("entrar com segurança") ||
    pageLower.includes("entrar com seguranca") ||
    pageLower.includes("/api/admin/data")
  ) {
    fail("root_sem_painel", "src/app/page.tsx contem termos de painel/admin.");
  } else {
    ok("root_sem_painel", "src/app/page.tsx nao contem painel/admin.");
  }

  const homeLower = home.toLowerCase();

  if (
    homeLower.includes("@/lib/runtime-store") ||
    homeLower.includes("@/lib/github-live-store") ||
    homeLower.includes("node:fs") ||
    homeLower.includes("node:path")
  ) {
    fail("home_client_sem_servidor", "home-client.tsx ainda importa codigo de servidor.");
  } else {
    ok("home_client_sem_servidor", "home-client.tsx nao importa codigo de servidor.");
  }

  if (/await\s+getRuntimeStorefront\s*\(/.test(home)) {
    fail("home_client_sem_await_ilegal", "home-client.tsx ainda tem await getRuntimeStorefront direto.");
  } else {
    ok("home_client_sem_await_ilegal", "home-client.tsx nao tem await ilegal.");
  }

  if (home.includes("/api/storefront") || home.includes("exale-storefront-data")) {
    ok("home_le_api", "Home publica tem caminho para carregar dados do painel.");
  } else {
    warn("home_le_api", "Nao encontrei /api/storefront nem exale-storefront-data no home-client.");
  }

  if (painel.includes("/api/admin/data") || painel.includes("/api/admin/products")) {
    ok("painel_salva_api", "Painel parece usar API administrativa.");
  } else {
    warn("painel_salva_api", "Nao encontrei chamada clara para API administrativa no painel.");
  }
}

function checkFormatters() {
  const money = formatBRL(1234.5);
  const phone = formatPhoneBR("5513991616048");
  const cpf = formatCPF("12345678909");
  const cnpj = formatCNPJ("12345678000199");
  const cep = formatCEP("11700000");

  if (money.includes("R$") && money.includes("1.234,50")) {
    ok("formatacao_brl", money);
  } else {
    fail("formatacao_brl", "Formato BRL inesperado: " + money);
  }

  if (phone === "(13) 99161-6048") {
    ok("formatacao_whatsapp", phone);
  } else {
    warn("formatacao_whatsapp", "Formato gerado: " + phone);
  }

  if (cpf === "123.456.789-09") ok("formatacao_cpf", cpf);
  else fail("formatacao_cpf", cpf);

  if (cnpj === "12.345.678/0001-99") ok("formatacao_cnpj", cnpj);
  else fail("formatacao_cnpj", cnpj);

  if (cep === "11700-000") ok("formatacao_cep", cep);
  else fail("formatacao_cep", cep);
}

function checkProductData(products) {
  if (!Array.isArray(products)) {
    fail("produtos_array", "Produtos nao retornaram como lista.");
    return;
  }

  ok("produtos_array", `Produtos carregados: ${products.length}`);

  const slugs = new Set();

  products.forEach((product, index) => {
    const name = product?.name || product?.nome || product?.title || product?.titulo;
    const slug = product?.slug || product?.id || product?.codigo || "";
    const priceRaw = product?.price ?? product?.preco ?? product?.valor ?? product?.salePrice ?? product?.sale_price;
    const price = parseMoney(priceRaw);

    if (!name) fail(`produto_${index + 1}_nome`, "Produto sem nome/titulo.");
    else ok(`produto_${index + 1}_nome`, String(name));

    if (!slug) warn(`produto_${index + 1}_slug`, "Produto sem slug/id claro.");
    else {
      if (slugs.has(slug)) fail(`produto_${index + 1}_slug_duplicado`, String(slug));
      else ok(`produto_${index + 1}_slug`, String(slug));
      slugs.add(slug);
    }

    if (priceRaw === undefined || priceRaw === null || priceRaw === "") {
      warn(`produto_${index + 1}_preco`, "Produto sem preco preenchido.");
    } else if (Number.isFinite(price)) {
      ok(`produto_${index + 1}_preco`, formatBRL(price));
    } else {
      fail(`produto_${index + 1}_preco`, "Preco invalido: " + String(priceRaw));
    }

    const image = product?.image || product?.imagem || product?.imageUrl || product?.image_url || product?.photo || product?.foto;

    if (image) ok(`produto_${index + 1}_imagem`, "Imagem preenchida.");
    else warn(`produto_${index + 1}_imagem`, "Produto sem imagem principal.");
  });
}

function simulateAddRemove(products) {
  const before = Array.isArray(products) ? products : [];
  const testSlug = "teste-seguro-nao-salvar-" + STAMP;

  const testProduct = {
    id: testSlug,
    slug: testSlug,
    name: "Produto Teste Seguro Nao Salvar",
    price: 19.9,
    active: true,
    image: "https://example.com/teste-seguro.png",
  };

  const added = [...before, testProduct];

  if (added.length === before.length + 1 && added.some((p) => p.slug === testSlug)) {
    ok("simulacao_adicionar_produto", "Adicao simulada em memoria funcionando.");
  } else {
    fail("simulacao_adicionar_produto", "Falha na simulacao de adicao em memoria.");
  }

  const removed = added.filter((p) => p.slug !== testSlug);

  if (removed.length === before.length && !removed.some((p) => p.slug === testSlug)) {
    ok("simulacao_remover_produto", "Remocao simulada em memoria funcionando.");
  } else {
    fail("simulacao_remover_produto", "Falha na simulacao de remocao em memoria.");
  }

  ok("seguranca_teste_produtos", "Nenhum POST/PUT/PATCH/DELETE foi executado. Nenhum produto real foi alterado.");
}

async function checkUrls() {
  const urls = [
    { name: "site_publico", url: `${SITE}/?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "painel_admin", url: `${SITE}/admin?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "api_storefront", url: `${SITE}/api/storefront?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "api_settings", url: `${SITE}/api/settings?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "api_products", url: `${SITE}/api/products?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "loja", url: `${SITE}/loja?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "produtos", url: `${SITE}/produtos?v=teste-seguro-${STAMP}`, expected: [200] },
    { name: "carrinho", url: `${SITE}/carrinho?v=teste-seguro-${STAMP}`, expected: [200] },
  ];

  const responses = {};

  for (const item of urls) {
    try {
      const response = await fetchWithTimeout(item.url);
      responses[item.name] = response;

      if (item.expected.includes(response.status)) {
        ok(`url_${item.name}`, `HTTP ${response.status}`);
      } else {
        fail(`url_${item.name}`, `HTTP ${response.status}`);
      }

      fs.writeFileSync(
        path.join(REPORT_DIR, `${item.name}.html`),
        response.text || "",
        "utf8"
      );
    } catch (error) {
      fail(`url_${item.name}`, error?.message || String(error));
    }
  }

  if (responses.site_publico) {
    checkTextDoesNotContainAdmin(responses.site_publico.text);

    const lower = responses.site_publico.text.toLowerCase();

    if (lower.includes("exale") || lower.includes("produto") || lower.includes("loja") || lower.includes("carregando loja")) {
      ok("site_publico_marcadores", "A home contem marcadores publicos de loja.");
    } else {
      warn("site_publico_marcadores", "A home retornou 200, mas nao encontrei marcadores claros de loja no HTML inicial.");
    }
  }
}

async function checkApisAndData() {
  const storefront = await fetchJson(`${SITE}/api/storefront?v=teste-seguro-${STAMP}`);
  const settingsApi = await fetchJson(`${SITE}/api/settings?v=teste-seguro-${STAMP}`);
  const productsApi = await fetchJson(`${SITE}/api/products?v=teste-seguro-${STAMP}`);

  fs.writeFileSync(path.join(REPORT_DIR, "api-storefront.json"), JSON.stringify(storefront.json, null, 2), "utf8");
  fs.writeFileSync(path.join(REPORT_DIR, "api-settings.json"), JSON.stringify(settingsApi.json, null, 2), "utf8");
  fs.writeFileSync(path.join(REPORT_DIR, "api-products.json"), JSON.stringify(productsApi.json, null, 2), "utf8");

  if (storefront.status === 200 && storefront.json) ok("api_storefront_json", "Storefront retornou JSON valido.");
  else fail("api_storefront_json", "Storefront nao retornou JSON valido.");

  if (settingsApi.status === 200 && settingsApi.json) ok("api_settings_json", "Settings retornou JSON valido.");
  else fail("api_settings_json", "Settings nao retornou JSON valido.");

  if (productsApi.status === 200 && productsApi.json) ok("api_products_json", "Products retornou JSON valido.");
  else fail("api_products_json", "Products nao retornou JSON valido.");

  const settings = pickSettings(storefront.json);
  const products = pickProducts(storefront.json).length ? pickProducts(storefront.json) : pickProducts(productsApi.json);

  const storeName = settings.storeName || settings.nomeLoja || settings.name || settings.headerTitle || settings.siteTitle;
  const whatsapp = settings.whatsapp || settings.phone || settings.telefone || settings.ownerWhatsapp;

  if (storeName) ok("personalizacao_nome_loja", String(storeName));
  else warn("personalizacao_nome_loja", "Nome da loja nao encontrado nas configuracoes.");

  if (whatsapp) ok("personalizacao_whatsapp", formatPhoneBR(whatsapp));
  else warn("personalizacao_whatsapp", "WhatsApp nao encontrado nas configuracoes.");

  checkProductData(products);
  simulateAddRemove(products);

  const after = await fetchJson(`${SITE}/api/storefront?v=teste-seguro-after-${STAMP}`);
  const afterProducts = pickProducts(after.json);

  if (afterProducts.length === pickProducts(storefront.json).length) {
    ok("confirmacao_sem_mutacao_real", "Quantidade de produtos permaneceu igual depois do teste.");
  } else {
    warn("confirmacao_sem_mutacao_real", `Antes: ${pickProducts(storefront.json).length}, depois: ${afterProducts.length}. Pode ter havido alteracao externa no painel.`);
  }

  if (products[0]) {
    const firstSlug = products[0].slug || products[0].id || "";
    if (firstSlug) {
      const productPage = await fetchWithTimeout(`${SITE}/produto/${encodeURIComponent(firstSlug)}?v=teste-seguro-${STAMP}`);
      if (productPage.status === 200) ok("pagina_produto_individual", `Produto ${firstSlug} abriu HTTP 200.`);
      else warn("pagina_produto_individual", `Produto ${firstSlug} retornou HTTP ${productPage.status}.`);
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

  if (result.status === 0) {
    ok("build_local", "npm run build concluiu com sucesso.");
  } else {
    fail("build_local", `npm run build falhou com codigo ${result.status}.`);
  }

  if (/┌\s*ƒ\s*\//.test(output) || /ƒ\s+\//.test(output)) {
    ok("rota_root_build", "Rota / aparece como dinamica no build.");
  } else if (/┌\s*○\s*\//.test(output) || /○\s+\//.test(output)) {
    warn("rota_root_build", "Rota / aparece como estatica no build. O site ainda pode funcionar via API cliente, mas vale revisar.");
  } else {
    warn("rota_root_build", "Nao consegui identificar a rota / no resumo do build.");
  }
}

async function main() {
  console.log("============================================================");
  console.log("TESTE COMPLETO SEGURO - EXALE");
  console.log("============================================================");
  console.log("Este teste NAO usa POST, PUT, PATCH ou DELETE.");
  console.log("Ele NAO altera produto real, NAO faz git push e NAO faz deploy.");
  console.log("Relatorios:", REPORT_DIR);
  console.log("");

  checkStaticFiles();
  checkFormatters();

  await checkUrls();
  await checkApisAndData();

  runBuild();

  const summary = {
    generatedAt: new Date().toISOString(),
    reportDir: REPORT_DIR,
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
  console.log("Relatorio JSON:", path.join(REPORT_DIR, "summary.json"));
  console.log("Log do build:", path.join(REPORT_DIR, "build.log"));

  if (summary.totals.fail > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  fail("erro_geral", error?.stack || error?.message || String(error));

  fs.writeFileSync(
    path.join(REPORT_DIR, "summary.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
    "utf8"
  );

  process.exit(1);
});
