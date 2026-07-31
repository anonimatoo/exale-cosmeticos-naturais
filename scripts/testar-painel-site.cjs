const fs = require("node:fs");
const path = require("node:path");
const { spawn, execSync } = require("node:child_process");
const { chromium } = require("playwright");

const ROOT = process.cwd();
const PORT = Number(process.env.TEST_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "exale-admin-2026";

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const REPORT_DIR = path.join(
  ROOT,
  "test-reports",
  `painel-site-${timestamp}`
);

const STORE_FILE = path.join(ROOT, "content", "store.json");
const BACKUP_FILE = path.join(REPORT_DIR, "store-original.json");
const REPORT_JSON = path.join(REPORT_DIR, "resultado.json");
const REPORT_TXT = path.join(REPORT_DIR, "resultado.txt");
const SERVER_LOG = path.join(REPORT_DIR, "servidor.log");

fs.mkdirSync(REPORT_DIR, { recursive: true });

if (fs.existsSync(STORE_FILE)) {
  fs.copyFileSync(STORE_FILE, BACKUP_FILE);
}

const results = [];

function register(status, name, detail = "") {
  results.push({ status, name, detail });

  const icon =
    status === "OK" ? "✅" :
    status === "AVISO" ? "⚠️" :
    status === "PULADO" ? "⏭️" : "❌";

  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

const ok = (name, detail = "") =>
  register("OK", name, detail);

const fail = (name, detail = "") =>
  register("ERRO", name, detail);

const warning = (name, detail = "") =>
  register("AVISO", name, detail);

async function waitForServer() {
  const deadline = Date.now() + 90000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);

      if (response.status < 500) {
        return;
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error("O servidor não iniciou em até 90 segundos.");
}

function findChromium() {
  const commands = [
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
  ];

  for (const command of commands) {
    try {
      const executable = execSync(
        `command -v ${command}`,
        { encoding: "utf8" }
      ).trim();

      if (executable) return executable;
    } catch {}
  }

  return "";
}

async function requestJson(
  context,
  method,
  route,
  expectedStatuses,
  options = {}
) {
  const response = await context.request.fetch(
    `${BASE_URL}${route}`,
    {
      method,
      failOnStatusCode: false,
      ...options,
    }
  );

  const status = response.status();
  const text = await response.text();
  const expected = Array.isArray(expectedStatuses)
    ? expectedStatuses
    : [expectedStatuses];

  if (expected.includes(status)) {
    ok(`${method} ${route}`, `HTTP ${status}`);
  } else {
    fail(
      `${method} ${route}`,
      `HTTP ${status}; esperado ${expected.join("/")}; resposta: ${text.slice(0, 300)}`
    );
  }

  let data = null;

  try {
    data = JSON.parse(text);
  } catch {}

  return { response, status, text, data };
}

async function inspectPage(context, route) {
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];

  page.on("pageerror", error => {
    errors.push(error.message);
  });

  page.on("console", message => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("requestfailed", request => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      error: request.failure()?.errorText,
    });
  });

  try {
    const response = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });

    const status = response?.status() || 0;

    if (status >= 200 && status < 400) {
      ok(`Página ${route}`, `HTTP ${status}`);
    } else {
      fail(`Página ${route}`, `HTTP ${status}`);
    }

    if (errors.length) {
      fail(
        `JavaScript ${route}`,
        errors.slice(0, 5).join(" | ")
      );
    } else {
      ok(`JavaScript ${route}`, "sem erros");
    }

    if (failedRequests.length) {
      fail(
        `Requisições ${route}`,
        JSON.stringify(failedRequests.slice(0, 5))
      );
    } else {
      ok(`Requisições ${route}`, "sem falhas");
    }

    await page.screenshot({
      path: path.join(
        REPORT_DIR,
        `pagina-${route.replace(/\W+/g, "-") || "inicio"}.png`
      ),
      fullPage: true,
    });
  } catch (error) {
    fail(`Página ${route}`, error.message);
  } finally {
    await page.close();
  }
}

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/admin`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });

  const passwordInput = page
    .locator('input[type="password"]')
    .first();

  if (!(await passwordInput.count())) {
    fail(
      "Proteção do painel",
      "campo de senha não encontrado"
    );
    return false;
  }

  ok("Proteção do painel", "senha obrigatória encontrada");

  await passwordInput.fill(ADMIN_PASSWORD);

  const loginButton = page
    .getByRole("button", {
      name: /entrar|login|acessar/i,
    })
    .first();

  if (!(await loginButton.count())) {
    fail("Login administrativo", "botão de login não encontrado");
    return false;
  }

  await loginButton.click();

  await page.waitForTimeout(1500);

  await page.waitForTimeout(800);

  const passwordVisible = await page
    .locator('input[type="password"]:visible')
    .count();

  const dashboardVisible = await page
    .getByText(/produtos cadastrados|novo produto|atualizar produtos/i)
    .first()
    .isVisible()
    .catch(() => false);

  if (passwordVisible > 0 && !dashboardVisible) {
    const body = await page.locator("body").innerText();

    fail(
      "Login administrativo",
      body.slice(0, 300)
    );

    return false;
  }

  if (!dashboardVisible) {
    fail(
      "Login administrativo",
      "login respondeu, mas o painel não ficou visível"
    );

    return false;
  }

  ok(
    "Login administrativo",
    "painel liberado e produtos carregados"
  );

  return true;
}

async function testPanelButtons(page) {
  const buttons = page.locator("button:visible");
  const count = await buttons.count();

  ok("Botões visíveis no painel", String(count));

  if (!count) {
    fail("Interação do painel", "nenhum botão visível");
    return;
  }

  const names = [];

  for (let index = 0; index < count; index++) {
    const button = buttons.nth(index);
    const text = (
      await button.innerText().catch(() => "")
    ).trim();

    names.push(text || `botão-${index + 1}`);
  }

  fs.writeFileSync(
    path.join(REPORT_DIR, "botoes-painel.json"),
    JSON.stringify(names, null, 2)
  );
}

async function testCrud(context) {
  const page = await context.newPage();
  const adminCalls = [];
  const pageErrors = [];

  page.on("response", response => {
    if (response.url().includes("/api/admin/")) {
      adminCalls.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
      });
    }
  });

  page.on("pageerror", error => {
    pageErrors.push(error.message);
  });

  const logged = await loginAdmin(page);

  if (!logged) {
    await page.close();
    return;
  }

  await testPanelButtons(page);

  const createButton = page.locator(
    [
      "#btnNew",
      "button:has-text('Novo produto')",
      "button:has-text('+ Novo produto')",
      "button:has-text('Adicionar produto')",
      "button:has-text('Cadastrar produto')",
    ].join(",")
  ).first();

  if (!(await createButton.count())) {
    fail("Criar produto", "botão de novo produto não encontrado");
    await page.close();
    return;
  }

  await createButton.click();
  await page.waitForTimeout(500);

  const unique = Date.now();
  const productName = `Produto Integração ${unique}`;
  const productSlug = `produto-integracao-${unique}`;

  const nameField = page.locator(
    '#name:visible, input[name="name"]:visible, input[name="nome"]:visible'
  ).first();

  if (!(await nameField.count())) {
    fail(
      "Formulário de produto",
      "campo de nome visível não encontrado"
    );
    await page.close();
    return;
  }

  await nameField.fill(productName);

  const slugField = page.locator(
    '#slug:visible, input[name="slug"]:visible'
  ).first();

  if (await slugField.count()) {
    await slugField.fill(productSlug);
  }

  const priceField = page.locator(
    [
      '#price:visible',
      'input[name="price"]:visible',
      'input[name="preco"]:visible',
      'input[name="promotionalPrice"]:visible',
    ].join(",")
  ).first();

  if (await priceField.count()) {
    await priceField.fill("19.90");
  }

  const descriptionField = page.locator(
    [
      '#description:visible',
      'textarea[name="description"]:visible',
      'textarea[name="descricao"]:visible',
    ].join(",")
  ).first();

  if (await descriptionField.count()) {
    await descriptionField.fill(
      "Produto temporário criado pelo teste automático de integração."
    );
  }

  const saveButton = page.locator(
    [
      "#btnSave",
      "button:has-text('Salvar e atualizar site')",
      "button:has-text('Salvar e sincronizar')",
      "button:has-text('Salvar produto')",
      "button:has-text('Salvar')",
    ].join(",")
  ).filter({ visible: true }).first();

  if (!(await saveButton.count())) {
    fail("Salvar produto", "botão salvar não encontrado");
    await page.close();
    return;
  }

  await saveButton.click();
  await page.waitForTimeout(2500);

  const failedCalls = adminCalls.filter(call => call.status >= 400);

  if (failedCalls.length) {
    fail(
      "Painel → API administrativa",
      failedCalls
        .map(call => `${call.status} ${call.url}`)
        .join(" | ")
    );
  } else {
    ok(
      "Painel → API administrativa",
      adminCalls
        .map(call => `${call.status} ${call.url}`)
        .join(" | ")
    );
  }

  const productsResponse = await fetch(
    `${BASE_URL}/api/products?t=${Date.now()}`,
    { cache: "no-store" }
  );

  const productsText = await productsResponse.text();

  if (
    productsText.includes(productName) ||
    productsText.includes(productSlug)
  ) {
    ok(
      "Painel → API pública",
      "produto apareceu em /api/products"
    );
  } else {
    fail(
      "Painel → API pública",
      "produto não apareceu em /api/products"
    );
  }

  const storeResponse = await fetch(
    `${BASE_URL}/api/store?t=${Date.now()}`,
    { cache: "no-store" }
  );

  const storeText = await storeResponse.text();

  if (
    storeText.includes(productName) ||
    storeText.includes(productSlug)
  ) {
    ok(
      "Painel → /api/store",
      "produto apareceu na API da loja"
    );
  } else {
    fail(
      "Painel → /api/store",
      "produto não apareceu na API da loja"
    );
  }

  await page.goto(`${BASE_URL}/?t=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });

  const visibleOnSite = await page
    .getByText(productName, { exact: false })
    .count();

  if (visibleOnSite) {
    ok(
      "Painel → site público",
      "produto apareceu na página inicial"
    );
  } else {
    warning(
      "Painel → site público",
      "produto não apareceu na página inicial; pode estar filtrado, inativo ou em outra seção"
    );
  }

  await page.goto(`${BASE_URL}/produtos?t=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });

  const visibleOnProducts = await page
    .getByText(productName, { exact: false })
    .count();

  if (visibleOnProducts) {
    ok(
      "Painel → página de produtos",
      "produto apareceu em /produtos"
    );
  } else {
    warning(
      "Painel → página de produtos",
      "produto não apareceu visualmente"
    );
  }

  if (pageErrors.length) {
    fail(
      "JavaScript durante CRUD",
      pageErrors.join(" | ")
    );
  } else {
    ok("JavaScript durante CRUD", "sem erros");
  }

  await page.screenshot({
    path: path.join(REPORT_DIR, "resultado-crud.png"),
    fullPage: true,
  });

  await page.close();
}

function restoreData() {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, STORE_FILE);
    console.log("♻️ content/store.json restaurado.");
  }
}

async function main() {
  let server;
  let browser;

  try {
    const logStream = fs.createWriteStream(
      SERVER_LOG,
      { flags: "a" }
    );

    server = spawn("npm", ["run", "dev"], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(PORT),
        ADMIN_PASSWORD,
        GITHUB_TOKEN: "",
        GITHUB_REPO: "",
        GITHUB_OWNER: "",
        GITHUB_BRANCH: "",
        VERCEL: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    server.stdout.pipe(logStream);
    server.stderr.pipe(logStream);

    await waitForServer();
    ok("Servidor", BASE_URL);

    const executablePath = findChromium();

    if (!executablePath) {
      throw new Error(
        "Chromium não encontrado. Execute: apt install chromium -y"
      );
    }

    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      viewport: {
        width: 390,
        height: 844,
      },
      ignoreHTTPSErrors: true,
    });

    for (const route of [
      "/",
      "/loja",
      "/produtos",
      "/carrinho",
      "/admin",
      "/painel",
      "/painel-exale",
    ]) {
      await inspectPage(context, route);
    }

    for (const route of [
      "/api/health",
      "/api/products",
      "/api/store",
      "/api/storefront",
      "/api/settings",
      "/api/coupons",
    ]) {
      await requestJson(context, "GET", route, 200);
    }

    await requestJson(
      context,
      "POST",
      "/api/admin/login",
      401,
      {
        data: {
          password: "senha-incorreta",
        },
      }
    );

    await requestJson(
      context,
      "POST",
      "/api/admin/login",
      200,
      {
        data: {
          password: ADMIN_PASSWORD,
        },
      }
    );

    await requestJson(
      context,
      "POST",
      "/api/admin/save",
      401,
      {
        data: {
          settings: {},
          products: [],
        },
      }
    );

    await testCrud(context);

    await context.close();
  } catch (error) {
    fail("Execução geral", error.stack || error.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }

    if (server) {
      server.kill("SIGTERM");

      await new Promise(resolve =>
        setTimeout(resolve, 1000)
      );

      if (!server.killed) {
        server.kill("SIGKILL");
      }
    }

    restoreData();

    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      totals: {
        ok: results.filter(item => item.status === "OK").length,
        errors: results.filter(item => item.status === "ERRO").length,
        warnings: results.filter(item => item.status === "AVISO").length,
      },
      results,
    };

    fs.writeFileSync(
      REPORT_JSON,
      JSON.stringify(summary, null, 2)
    );

    fs.writeFileSync(
      REPORT_TXT,
      [
        "TESTE DE INTEGRAÇÃO PAINEL ↔ SITE",
        "=================================",
        `OK: ${summary.totals.ok}`,
        `ERROS: ${summary.totals.errors}`,
        `AVISOS: ${summary.totals.warnings}`,
        "",
        ...results.map(item =>
          `[${item.status}] ${item.name}` +
          (item.detail ? `: ${item.detail}` : "")
        ),
        "",
        `Relatório: ${REPORT_DIR}`,
      ].join("\n")
    );

    console.log("\n======================================");
    console.log(`OK: ${summary.totals.ok}`);
    console.log(`ERROS: ${summary.totals.errors}`);
    console.log(`AVISOS: ${summary.totals.warnings}`);
    console.log(`RELATÓRIO: ${REPORT_DIR}`);
    console.log("======================================");

    process.exitCode =
      summary.totals.errors > 0 ? 1 : 0;
  }
}

main();
