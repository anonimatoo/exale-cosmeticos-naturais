"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function full(relativePath) {
  return path.join(root, relativePath);
}

function ensureDir(relativePath) {
  fs.mkdirSync(path.dirname(full(relativePath)), { recursive: true });
}

function write(relativePath, content) {
  ensureDir(relativePath);
  fs.writeFileSync(full(relativePath), content.trimStart(), "utf8");
  console.log("CRIADO:", relativePath);
}

function backup(relativePath) {
  const source = full(relativePath);

  if (!fs.existsSync(source)) {
    return;
  }

  const destination =
    source + ".backup-" + new Date().toISOString().replace(/[:.]/g, "-");

  fs.copyFileSync(source, destination);
  console.log("BACKUP:", destination);
}

function patch(relativePath, transform) {
  const file = full(relativePath);

  if (!fs.existsSync(file)) {
    return false;
  }

  const current = fs.readFileSync(file, "utf8");
  const updated = transform(current);

  if (updated !== current) {
    backup(relativePath);
    fs.writeFileSync(file, updated, "utf8");
    console.log("ALTERADO:", relativePath);
  }

  return true;
}

[
  "src/lib/github-live-store.ts",
  "src/app/api/storefront/route.ts",
  "src/app/api/settings/route.ts",
  "src/app/api/products/route.ts",
  "src/app/api/admin/data/route.ts",
  "src/app/api/admin/products/route.ts",
  "src/components/admin-save-alert.tsx",
  "src/app/painel-exale/layout.tsx",
].forEach(backup);

write(
  "src/lib/github-live-store.ts",
  String.raw`
import fs from "node:fs/promises";
import path from "node:path";

const OWNER = process.env.GITHUB_OWNER || "anonimatoo";
const REPO =
  process.env.GITHUB_REPO || "exale-cosmeticos-naturais";
const BRANCH = process.env.GITHUB_BRANCH || "main";

const SETTINGS_FILE = "content/settings/store.json";

function getToken(): string {
  return (
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PAT ||
    process.env.GITHUB_ACCESS_TOKEN ||
    process.env.GH_TOKEN ||
    ""
  );
}

function cleanPath(filePath: string): string {
  return String(filePath || "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\.\./g, "");
}

function githubPath(filePath: string): string {
  return cleanPath(filePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function githubHeaders(tokenRequired = false): HeadersInit {
  const token = getToken();

  if (tokenRequired && !token) {
    throw new Error(
      "GITHUB_TOKEN não está configurado no ambiente Production da Vercel."
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Exale-Administrative-CMS",
  };

  if (token) {
    headers.Authorization = \`Bearer \${token}\`;
  }

  return headers;
}

export function slugify(value: unknown): string {
  return String(value || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "produto";
}

export function rawGithubUrl(filePath: string): string {
  return [
    "https://raw.githubusercontent.com",
    OWNER,
    REPO,
    BRANCH,
    cleanPath(filePath),
  ].join("/");
}

async function readLocalJson<T>(
  filePath: string,
  fallback: T
): Promise<T> {
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), cleanPath(filePath)),
      "utf8"
    );

    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function readJsonFileLive<T>(
  filePath: string,
  fallback: T
): Promise<T> {
  const apiUrl =
    \`https://api.github.com/repos/\${OWNER}/\${REPO}\` +
    \`/contents/\${githubPath(filePath)}\` +
    \`?ref=\${encodeURIComponent(BRANCH)}&v=\${Date.now()}\`;

  try {
    const response = await fetch(apiUrl, {
      headers: githubHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return readLocalJson(filePath, fallback);
    }

    const data = await response.json();

    if (
      data &&
      !Array.isArray(data) &&
      typeof data.content === "string"
    ) {
      const content = Buffer.from(
        data.content.replace(/\n/g, ""),
        "base64"
      ).toString("utf8");

      return JSON.parse(content) as T;
    }
  } catch {
    return readLocalJson(filePath, fallback);
  }

  return readLocalJson(filePath, fallback);
}

export async function readJsonFolderLive(
  folderPath: string
): Promise<any[]> {
  const cleanFolder = cleanPath(folderPath);

  const apiUrl =
    \`https://api.github.com/repos/\${OWNER}/\${REPO}\` +
    \`/contents/\${githubPath(cleanFolder)}\` +
    \`?ref=\${encodeURIComponent(BRANCH)}&v=\${Date.now()}\`;

  try {
    const response = await fetch(apiUrl, {
      headers: githubHeaders(),
      cache: "no-store",
    });

    if (response.ok) {
      const files = await response.json();

      if (Array.isArray(files)) {
        const jsonFiles = files.filter(
          (item: any) =>
            item?.type === "file" &&
            String(item?.name || "").endsWith(".json")
        );

        const output: any[] = [];

        for (const item of jsonFiles) {
          try {
            const itemResponse = await fetch(
              \`\${item.download_url}?v=\${Date.now()}\`,
              { cache: "no-store" }
            );

            if (itemResponse.ok) {
              output.push(await itemResponse.json());
            }
          } catch {
            // Um arquivo inválido não pode derrubar toda a vitrine.
          }
        }

        return output;
      }
    }
  } catch {
    // Usa conteúdo local quando o GitHub estiver indisponível.
  }

  try {
    const directory = path.join(process.cwd(), cleanFolder);
    const files = await fs.readdir(directory);
    const output: any[] = [];

    for (const file of files.sort()) {
      if (!file.endsWith(".json")) {
        continue;
      }

      try {
        const content = await fs.readFile(
          path.join(directory, file),
          "utf8"
        );

        output.push(JSON.parse(content));
      } catch {
        // Ignora somente o arquivo JSON inválido.
      }
    }

    return output;
  } catch {
    return [];
  }
}

async function getCurrentSha(
  filePath: string
): Promise<string | undefined> {
  const apiUrl =
    \`https://api.github.com/repos/\${OWNER}/\${REPO}\` +
    \`/contents/\${githubPath(filePath)}\` +
    \`?ref=\${encodeURIComponent(BRANCH)}&v=\${Date.now()}\`;

  const response = await fetch(apiUrl, {
    headers: githubHeaders(true),
    cache: "no-store",
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      \`Não foi possível consultar o arquivo no GitHub: \` +
      \`\${response.status} \${message}\`
    );
  }

  const data = await response.json();

  return typeof data?.sha === "string"
    ? data.sha
    : undefined;
}

export async function commitFileToGithub(
  filePath: string,
  content: string | Buffer,
  message: string
): Promise<any> {
  const clean = cleanPath(filePath);
  const sha = await getCurrentSha(clean);

  const apiUrl =
    \`https://api.github.com/repos/\${OWNER}/\${REPO}\` +
    \`/contents/\${githubPath(clean)}\`;

  const buffer = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content, "utf8");

  const payload: Record<string, unknown> = {
    message,
    branch: BRANCH,
    content: buffer.toString("base64"),
  };

  if (sha) {
    payload.sha = sha;
  }

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      ...githubHeaders(true),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const messageText = await response.text();

    throw new Error(
      \`Falha ao salvar no GitHub: \` +
      \`\${response.status} \${messageText}\`
    );
  }

  return response.json();
}

export async function writeJsonLive(
  filePath: string,
  data: unknown,
  message = "atualiza conteúdo pelo painel administrativo"
): Promise<void> {
  const content = JSON.stringify(data, null, 2) + "\n";

  await commitFileToGithub(filePath, content, message);

  try {
    const localPath = path.join(
      process.cwd(),
      cleanPath(filePath)
    );

    await fs.mkdir(path.dirname(localPath), {
      recursive: true,
    });

    await fs.writeFile(localPath, content, "utf8");
  } catch {
    // O filesystem da Vercel não é usado como persistência.
  }
}

function sortItems(items: any[]): any[] {
  return [...items].sort((a, b) => {
    const aOrder = Number(
      a?.order ?? a?.ordem ?? a?.position ?? 999
    );

    const bOrder = Number(
      b?.order ?? b?.ordem ?? b?.position ?? 999
    );

    return aOrder - bOrder;
  });
}

export async function getGithubLiveStore() {
  const [
    settings,
    products,
    banners,
    productLines,
    coupons,
    combos,
  ] = await Promise.all([
    readJsonFileLive(SETTINGS_FILE, {}),
    readJsonFolderLive("content/products"),
    readJsonFolderLive("content/banners"),
    readJsonFolderLive("content/product-lines"),
    readJsonFolderLive("content/coupons"),
    readJsonFolderLive("content/combos"),
  ]);

  return {
    ok: true,
    source: "github-live",
    updatedAt: new Date().toISOString(),
    settings,
    products: sortItems(products),
    produtos: sortItems(products),
    banners: sortItems(banners),
    productLines: sortItems(productLines),
    linhas: sortItems(productLines),
    coupons: sortItems(coupons),
    cupons: sortItems(coupons),
    combos: sortItems(combos),
  };
}
`
);

write(
  "src/app/api/storefront/route.ts",
  String.raw`
import { getGithubLiveStore } from "@/lib/github-live-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

export async function GET() {
  try {
    return Response.json(await getGithubLiveStore(), {
      headers: noCacheHeaders,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        message:
          error?.message ||
          "Não foi possível carregar os dados da loja.",
      },
      {
        status: 500,
        headers: noCacheHeaders,
      }
    );
  }
}
`
);

write(
  "src/app/api/settings/route.ts",
  String.raw`
import { readJsonFileLive } from "@/lib/github-live-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const settings = await readJsonFileLive(
    "content/settings/store.json",
    {}
  );

  return Response.json(
    {
      ok: true,
      settings,
      ...settings,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
`
);

write(
  "src/app/api/products/route.ts",
  String.raw`
import { readJsonFolderLive } from "@/lib/github-live-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const products = await readJsonFolderLive(
    "content/products"
  );

  return Response.json(
    {
      ok: true,
      products,
      produtos: products,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
`
);

write(
  "src/app/api/admin/data/route.ts",
  String.raw`
import {
  getGithubLiveStore,
  readJsonFileLive,
  slugify,
  writeJsonLive,
} from "@/lib/github-live-store";

import {
  revalidatePath,
  revalidateTag,
} from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function json(data: any, status = 200) {
  return Response.json(data, {
    status,
    headers: noCacheHeaders,
  });
}

function getObject(body: any, keys: string[]) {
  for (const container of [
    body,
    body?.data,
    body?.payload,
  ]) {
    if (!container || typeof container !== "object") {
      continue;
    }

    for (const key of keys) {
      const value = container[key];

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        return value;
      }
    }
  }

  return null;
}

function getArray(body: any, keys: string[]) {
  for (const container of [
    body,
    body?.data,
    body?.payload,
  ]) {
    if (!container || typeof container !== "object") {
      continue;
    }

    for (const key of keys) {
      if (Array.isArray(container[key])) {
        return container[key];
      }
    }
  }

  return null;
}

function normalizeProduct(product: any, index = 0) {
  const name = String(
    product?.name ||
    product?.nome ||
    product?.title ||
    product?.titulo ||
    \`Produto \${index + 1}\`
  ).trim();

  const slug = slugify(product?.slug || name);

  return {
    ...product,
    id: product?.id || slug,
    slug,
    name,
    nome: product?.nome || name,
    title: product?.title || name,
    description:
      product?.description ||
      product?.descricao ||
      "",
    descricao:
      product?.descricao ||
      product?.description ||
      "",
    price: Number(
      product?.price ??
      product?.preco ??
      0
    ),
    preco: Number(
      product?.preco ??
      product?.price ??
      0
    ),
    promotionalPrice:
      product?.promotionalPrice ??
      product?.precoPromocional ??
      null,
    stock: Number(
      product?.stock ??
      product?.estoque ??
      0
    ),
    sku: String(product?.sku || "").trim(),
    category:
      product?.category ||
      product?.categoria ||
      "",
    active:
      product?.active ??
      product?.ativo ??
      true,
    featured:
      product?.featured ??
      product?.destaque ??
      false,
    images: Array.isArray(product?.images)
      ? product.images
      : Array.isArray(product?.imagens)
        ? product.imagens
        : product?.image
          ? [product.image]
          : [],
    seo: {
      title:
        product?.seo?.title ||
        product?.seoTitle ||
        name,
      description:
        product?.seo?.description ||
        product?.seoDescription ||
        product?.description ||
        product?.descricao ||
        "",
      keywords:
        product?.seo?.keywords ||
        product?.keywords ||
        [],
    },
    updatedAt: new Date().toISOString(),
  };
}

async function saveProducts(products: any[]) {
  if (!products.length) {
    return json(
      {
        ok: false,
        message: "Nenhum produto foi recebido.",
      },
      400
    );
  }

  if (products.length > 50) {
    return json(
      {
        ok: false,
        message:
          "O painel permite salvar até 50 produtos por operação.",
      },
      400
    );
  }

  for (let index = 0; index < products.length; index++) {
    const product = normalizeProduct(products[index], index);

    await writeJsonLive(
      \`content/products/\${product.slug}.json\`,
      product,
      \`painel: atualiza produto \${product.name}\`
    );
  }

  invalidateSite();

  return json({
    ok: true,
    message:
      products.length === 1
        ? "Produto salvo e sincronizado com o site."
        : "Produtos salvos e sincronizados com o site.",
    store: await getGithubLiveStore(),
  });
}

function invalidateSite() {
  const paths = [
    "/",
    "/loja",
    "/produtos",
    "/admin",
    "/painel",
    "/painel-exale",
  ];

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // A leitura principal continua no-store.
    }
  }

  try {
    revalidateTag("storefront", "max");
  } catch {
    // Compatibilidade com projetos sem tag.
  }
}

export async function GET() {
  return json(await getGithubLiveStore());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(
      body?.action ||
      body?.type ||
      body?.key ||
      ""
    ).toLowerCase();

    const settings = getObject(body, [
      "settings",
      "config",
      "configuration",
      "store",
      "loja",
    ]);

    if (
      settings ||
      action.includes("setting") ||
      action.includes("config")
    ) {
      const current = await readJsonFileLive(
        "content/settings/store.json",
        {}
      );

      const source =
        settings ||
        body?.data ||
        body?.payload ||
        body;

      const nextSettings = {
        ...current,
        ...source,
        updatedAt: new Date().toISOString(),
      };

      delete nextSettings.action;
      delete nextSettings.type;
      delete nextSettings.key;

      await writeJsonLive(
        "content/settings/store.json",
        nextSettings,
        "painel: atualiza configurações da loja"
      );

      invalidateSite();

      return json({
        ok: true,
        message:
          "Configurações salvas e sincronizadas com o site.",
        settings: nextSettings,
        store: await getGithubLiveStore(),
      });
    }

    const productList = getArray(body, [
      "products",
      "produtos",
      "items",
    ]);

    if (productList) {
      return saveProducts(productList);
    }

    const product = getObject(body, [
      "product",
      "produto",
      "item",
    ]);

    if (
      product ||
      action.includes("product") ||
      action.includes("produto")
    ) {
      return saveProducts([
        product ||
        body?.data ||
        body?.payload ||
        body,
      ]);
    }

    return json(
      {
        ok: false,
        message:
          "A API não reconheceu o conteúdo enviado pelo painel.",
        receivedKeys: Object.keys(body || {}),
      },
      400
    );
  } catch (error: any) {
    return json(
      {
        ok: false,
        message:
          error?.message ||
          "Erro interno ao salvar pelo painel.",
      },
      500
    );
  }
}

export const PUT = POST;
export const PATCH = POST;
`
);

write(
  "src/app/api/admin/products/route.ts",
  String.raw`
export {
  GET,
  POST,
  PUT,
  PATCH,
} from "../data/route";
`
);

write(
  "src/components/admin-save-alert.tsx",
  String.raw`
"use client";

import { useEffect, useState } from "react";

type AlertState = {
  type: "saving" | "success" | "error";
  text: string;
} | null;

export default function AdminSaveAlert() {
  const [alert, setAlert] = useState<AlertState>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let savingRequests = 0;
    let clearTimer: ReturnType<typeof setTimeout> | null =
      null;

    function clearLater(milliseconds: number) {
      if (clearTimer) {
        clearTimeout(clearTimer);
      }

      clearTimer = setTimeout(
        () => setAlert(null),
        milliseconds
      );
    }

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const method = String(
        init?.method || "GET"
      ).toUpperCase();

      const isAdministrativeSave =
        url.includes("/api/admin/") &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(method);

      if (!isAdministrativeSave) {
        return originalFetch(input, init);
      }

      savingRequests += 1;

      setAlert({
        type: "saving",
        text:
          "Salvando e sincronizando as alterações com o site...",
      });

      try {
        const response = await originalFetch(input, {
          ...init,
          cache: "no-store",
          headers: {
            ...(init?.headers || {}),
            "Cache-Control": "no-store",
          },
        });

        let result: any = null;

        try {
          result = await response.clone().json();
        } catch {
          result = null;
        }

        if (!response.ok || result?.ok === false) {
          throw new Error(
            result?.message ||
            \`Erro HTTP \${response.status} ao salvar.\`
          );
        }

        setAlert({
          type: "success",
          text:
            result?.message ||
            "Alterações salvas e sincronizadas com o site.",
        });

        window.dispatchEvent(
          new CustomEvent("exale:store-updated", {
            detail: result,
          })
        );

        await originalFetch(
          \`/api/storefront?refresh=\${Date.now()}\`,
          {
            cache: "no-store",
          }
        ).catch(() => null);

        clearLater(7000);

        return response;
      } catch (error: any) {
        setAlert({
          type: "error",
          text:
            error?.message ||
            "Não foi possível sincronizar as alterações.",
        });

        clearLater(10000);
        throw error;
      } finally {
        savingRequests = Math.max(
          0,
          savingRequests - 1
        );
      }
    };

    return () => {
      window.fetch = originalFetch;

      if (clearTimer) {
        clearTimeout(clearTimer);
      }
    };
  }, []);

  if (!alert) {
    return null;
  }

  const isSaving = alert.type === "saving";
  const isError = alert.type === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 999999,
        width: "min(440px, calc(100vw - 40px))",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "17px 19px",
          borderRadius: 18,
          border: isError
            ? "1px solid #fecaca"
            : "1px solid #fde68a",
          background: isError
            ? "linear-gradient(135deg,#fff1f2,#ffe4e6)"
            : "linear-gradient(135deg,#fffbeb,#fef3c7)",
          color: isError ? "#991b1b" : "#422006",
          boxShadow:
            "0 20px 50px rgba(31,20,8,.24)",
          fontWeight: 800,
          lineHeight: 1.4,
        }}
      >
        {isSaving ? (
          <span
            aria-hidden="true"
            style={{
              width: 24,
              height: 24,
              flex: "0 0 auto",
              borderRadius: "999px",
              border:
                "3px solid rgba(120,70,10,.22)",
              borderTopColor: "#92400e",
              animation:
                "exaleAdminSpin .75s linear infinite",
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              fontSize: 22,
            }}
          >
            {isError ? "✕" : "✓"}
          </span>
        )}

        <span>{alert.text}</span>

        <style>{\`
          @keyframes exaleAdminSpin {
            to {
              transform: rotate(360deg);
            }
          }
        \`}</style>
      </div>
    </div>
  );
}
`
);

write(
  "src/components/admin-product-fields.css",
  String.raw`
.exale-product-editor,
[data-product-editor],
.product-editor,
.product-card-editor {
  position: relative;
  overflow: hidden;
  margin: 20px 0;
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid rgba(142, 92, 45, 0.18);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 100% 0,
      rgba(245, 197, 115, 0.18),
      transparent 34%
    ),
    linear-gradient(145deg, #ffffff, #fffaf3);
  box-shadow:
    0 18px 55px rgba(70, 38, 15, 0.1);
}

.exale-product-editor h2,
.exale-product-editor h3,
[data-product-editor] h2,
[data-product-editor] h3 {
  margin: 0 0 18px;
  color: #3b2112;
  font-size: clamp(1.25rem, 2vw, 1.65rem);
  letter-spacing: -0.025em;
}

.exale-product-grid,
[data-product-grid],
.product-editor-grid {
  display: grid;
  grid-template-columns:
    repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.exale-field,
[data-product-field] {
  grid-column: span 6;
  min-width: 0;
}

.exale-field-wide,
[data-product-field="wide"] {
  grid-column: 1 / -1;
}

.exale-field label,
[data-product-field] label {
  display: block;
  margin-bottom: 7px;
  color: #4b2c19;
  font-size: 0.88rem;
  font-weight: 800;
}

.exale-field input,
.exale-field textarea,
.exale-field select,
[data-product-field] input,
[data-product-field] textarea,
[data-product-field] select,
.exale-product-editor input,
.exale-product-editor textarea,
.exale-product-editor select {
  width: 100%;
  min-height: 48px;
  border: 1px solid #e7d5c4;
  border-radius: 13px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.96);
  color: #2f1d12;
  font: inherit;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.exale-product-editor textarea,
[data-product-field] textarea {
  min-height: 116px;
  resize: vertical;
}

.exale-product-editor input:focus,
.exale-product-editor textarea:focus,
.exale-product-editor select:focus,
[data-product-field] input:focus,
[data-product-field] textarea:focus,
[data-product-field] select:focus {
  border-color: #bd7838;
  box-shadow:
    0 0 0 4px rgba(189, 120, 56, 0.14);
}

.exale-product-editor button,
[data-product-editor] button {
  min-height: 46px;
  border: 0;
  border-radius: 13px;
  padding: 11px 18px;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    opacity 150ms ease;
}

.exale-product-editor button:hover,
[data-product-editor] button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 12px 25px rgba(75, 40, 15, 0.16);
}

.exale-product-save,
[data-action="save-product"] {
  color: #fff;
  background:
    linear-gradient(135deg, #77401d, #b86d2e);
}

.exale-product-secondary {
  color: #542f18;
  background: #f7eadc;
}

.exale-product-danger {
  color: #991b1b;
  background: #fee2e2;
}

.exale-product-switch {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #ead8c7;
  border-radius: 13px;
  background: #fff;
}

.exale-product-editor small,
[data-product-editor] small {
  display: block;
  margin-top: 6px;
  color: #7b685b;
  line-height: 1.4;
}

@media (max-width: 760px) {
  .exale-field,
  [data-product-field] {
    grid-column: 1 / -1;
  }

  .exale-product-editor,
  [data-product-editor],
  .product-editor,
  .product-card-editor {
    border-radius: 18px;
    padding: 18px;
  }
}
`
);

write(
  "src/app/painel-exale/layout.tsx",
  String.raw`
import type { ReactNode } from "react";
import AdminSaveAlert from "@/components/admin-save-alert";
import "@/components/admin-product-fields.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PainelExaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AdminSaveAlert />
      {children}
    </>
  );
}
`
);

write(
  "src/proxy.ts",
  String.raw`
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/painel")
  ) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );

    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set(
      "Surrogate-Control",
      "no-store"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/painel/:path*",
    "/painel-exale/:path*",
  ],
};
`
);

const oldMiddleware = full("src/middleware.ts");

if (fs.existsSync(oldMiddleware)) {
  const disabled =
    oldMiddleware + ".disabled-" + Date.now();

  fs.renameSync(oldMiddleware, disabled);
  console.log("MIDDLEWARE ANTIGO DESATIVADO:", disabled);
}

patch("src/app/painel-exale/page.tsx", (text) => {
  let next = text.replace(/^\uFEFF/, "");

  next = next.replace(
    /^\s*["']use client["'];?\s*$/gm,
    ""
  );

  next = next.replace(
    /^\s*export\s+const\s+dynamic\s*=.*?;?\s*$/gm,
    ""
  );

  next = next.replace(
    /^\s*export\s+const\s+revalidate\s*=.*?;?\s*$/gm,
    ""
  );

  next = next.replace(
    /^\s*\/\/\s*@ts-nocheck\s*$/gm,
    ""
  );

  return (
    '"use client";\n' +
    "// @ts-nocheck\n\n" +
    next.trimStart()
  );
});

for (const page of [
  "src/app/page.tsx",
  "src/app/loja/page.tsx",
  "src/app/produtos/page.tsx",
]) {
  patch(page, (text) => {
    if (text.includes('"use client"')) {
      return text;
    }

    let next = text;

    const declarations = [
      'export const dynamic = "force-dynamic";',
      "export const revalidate = 0;",
      'export const fetchCache = "force-no-store";',
    ];

    for (const declaration of declarations) {
      if (!next.includes(declaration)) {
        next = declaration + "\n" + next;
      }
    }

    return next;
  });
}

const autoRepair = "scripts/auto-repair.mjs";

patch(autoRepair, (text) => {
  const marker = "EXALE_KEEP_CLIENT_DIRECTIVE_2026";

  if (text.includes(marker)) {
    return text;
  }

  return (
    text.trimEnd() +
    String.raw`

/* EXALE_KEEP_CLIENT_DIRECTIVE_2026 */
try {
  const repairFs = await import("node:fs");

  const clientFile =
    "src/app/painel-exale/page.tsx";

  if (repairFs.existsSync(clientFile)) {
    let clientSource =
      repairFs.readFileSync(clientFile, "utf8");

    clientSource = clientSource
      .replace(/^\uFEFF/, "")
      .replace(
        /^\s*["']use client["'];?\s*$/gm,
        ""
      )
      .replace(
        /^\s*export\s+const\s+dynamic\s*=.*?;?\s*$/gm,
        ""
      )
      .replace(
        /^\s*export\s+const\s+revalidate\s*=.*?;?\s*$/gm,
        ""
      )
      .replace(
        /^\s*\/\/\s*@ts-nocheck\s*$/gm,
        ""
      );

    clientSource =
      '"use client";\n' +
      "// @ts-nocheck\n\n" +
      clientSource.trimStart();

    repairFs.writeFileSync(
      clientFile,
      clientSource,
      "utf8"
    );
  }
} catch (error) {
  console.error(
    "Falha ao preservar use client:",
    error
  );
}
`
  );
});

console.log("");
console.log("PATCH CONCLUÍDO.");
