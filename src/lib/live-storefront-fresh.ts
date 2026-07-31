/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "node:fs";
import path from "node:path";

function getToken() {
  return process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PAT ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_ACCESS_TOKEN ||
    "";
}

function getRepoConfig() {
  const repoEnv = process.env.GITHUB_REPO || "";
  const [ownerFromFull, repoFromFull] = repoEnv.includes("/") ? repoEnv.split("/") : ["", ""];

  return {
    token: getToken(),
    owner: process.env.GITHUB_OWNER || process.env.GITHUB_REPO_OWNER || ownerFromFull || "anonimatoo",
    repo: process.env.GITHUB_REPO_NAME || process.env.GITHUB_PROJECT || repoFromFull || "exale-cosmeticos-naturais",
    branch: process.env.GITHUB_BRANCH || process.env.GIT_BRANCH || "main",
  };
}

function slugify(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";
}

function priceNumber(value: any) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const n = Number(
    String(value || "")
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(n) ? n : 0;
}

function firstImage(value: any): string {
  const values = Array.isArray(value) ? value : [value];

  for (const item of values.flat(Infinity)) {
    if (!item) continue;

    if (typeof item === "string") {
      const parts = item
        .split(/\\n|\n|\r|\t|\s+/g)
        .map((x) => x.trim())
        .filter(Boolean);

      for (const part of parts) {
        if (!part || part === "#") continue;
        if (part.toLowerCase().includes("produto sem foto")) continue;

        if (
          part.startsWith("/") ||
          part.startsWith("http://") ||
          part.startsWith("https://") ||
          part.startsWith("data:image/") ||
          part.startsWith("uploads/")
        ) {
          return part.startsWith("uploads/") ? "/" + part : part;
        }
      }
    }

    if (typeof item === "object") {
      const found = firstImage(
        item.url ||
        item.src ||
        item.path ||
        item.image ||
        item.imagem ||
        item.foto ||
        item.thumbnail ||
        item.download_url
      );

      if (found) return found;
    }
  }

  return "";
}

export function normalizeProductFresh(product: any) {
  const name =
    product?.name ||
    product?.nome ||
    product?.title ||
    product?.titulo ||
    "Produto sem nome";

  const slug = slugify(product?.slug || product?.id || name);

  const price = priceNumber(
    product?.price ??
    product?.preco ??
    product?.valor ??
    product?.salePrice ??
    0
  );

  const description =
    product?.description ||
    product?.descricao ||
    product?.shortDescription ||
    product?.resumo ||
    "";

  const category =
    product?.category ||
    product?.categoria ||
    product?.line ||
    product?.linha ||
    "Cosméticos Naturais";

  const image = firstImage([
    product?.image,
    product?.imagem,
    product?.foto,
    product?.imageUrl,
    product?.cover,
    product?.thumbnail,
    product?.images,
    product?.imagens,
    product?.gallery,
    product?.galeria,
    product?.media,
  ]) || "/exale-produto-sem-foto.svg";

  return {
    ...product,
    slug,

    name,
    nome: name,
    title: name,
    titulo: name,

    price,
    preco: price,
    valor: price,

    description,
    descricao: description,
    shortDescription: description,
    resumo: description,

    category,
    categoria: category,
    line: category,
    linha: category,

    image,
    imagem: image,
    foto: image,
    images: image !== "/exale-produto-sem-foto.svg" ? [image] : [],
    imagens: image !== "/exale-produto-sem-foto.svg" ? [image] : [],

    active: product?.active ?? product?.ativo ?? true,
    ativo: product?.ativo ?? product?.active ?? true,
  };
}

function readLocalJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getLocalProducts() {
  const productsDir = path.join(process.cwd(), "content/products");
  const products: any[] = [];

  try {
    if (fs.existsSync(productsDir)) {
      for (const file of fs.readdirSync(productsDir)) {
        if (!file.endsWith(".json")) continue;
        const json = readLocalJson(path.join(productsDir, file));
        if (json) products.push(json);
      }
    }
  } catch {}

  const storeCandidates = [
    path.join(process.cwd(), "content/store.json"),
    path.join(process.cwd(), "content/storefront.json"),
    path.join(process.cwd(), "content/settings/store.json"),
  ];

  for (const file of storeCandidates) {
    const json = readLocalJson(file);
    const list = Array.isArray(json?.products) ? json.products : Array.isArray(json?.produtos) ? json.produtos : [];
    for (const item of list) products.push(item);
  }

  const map = new Map();

  for (const product of products.map(normalizeProductFresh).filter((p) => p.slug)) {
    map.set(product.slug, product);
  }

  return Array.from(map.values());
}

async function fetchJson(url: string, headers: any = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...headers,
        "Cache-Control": "no-store",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function readGithubProducts() {
  const cfg = getRepoConfig();

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
  };

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/content/products?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`;
  const files = await fetchJson(url, headers);
  const jsonFiles = Array.isArray(files)
    ? files.filter((file: any) => file?.type === "file" && String(file.name || "").endsWith(".json") && file.download_url)
    : [];

  const products = [];

  for (const file of jsonFiles) {
    try {
      const json = await fetchJson(file.download_url + "?t=" + Date.now());
      if (json) products.push({ ...json, __githubPath: file.path });
    } catch {}
  }

  return products.map(normalizeProductFresh).filter((p) => p.slug);
}

async function readSettings() {
  const candidates = [
    path.join(process.cwd(), "content/settings/store.json"),
    path.join(process.cwd(), "content/store.json"),
  ];

  for (const file of candidates) {
    const json = readLocalJson(file);
    if (json) return json;
  }

  return {};
}

export async function getLiveStorefrontFreshSafe() {
  const localProducts = getLocalProducts();

  try {
    const githubProducts = await readGithubProducts();

    if (githubProducts.length) {
      return {
        ok: true,
        settings: await readSettings(),
        products: githubProducts,
        produtos: githubProducts,
        source: "github-live-fresh",
        liveProducts: githubProducts.length,
        localProducts: localProducts.length,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      ok: true,
      settings: await readSettings(),
      products: localProducts,
      produtos: localProducts,
      source: "local-fallback-no-live-products",
      liveProducts: 0,
      localProducts: localProducts.length,
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      ok: true,
      settings: await readSettings(),
      products: localProducts,
      produtos: localProducts,
      source: "local-fallback-live-error",
      liveError: String(error?.message || error || "erro-live"),
      liveProducts: 0,
      localProducts: localProducts.length,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function findProductFresh(store: any, slugValue: string) {
  const wanted = slugify(slugValue);
  const products = Array.isArray(store?.products) ? store.products : [];

  return products.find((product: any) => {
    return [
      product.slug,
      product.id,
      product.name,
      product.nome,
      product.title,
      product.titulo,
    ].map(slugify).includes(wanted);
  });
}
