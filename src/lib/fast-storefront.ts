/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "node:fs";
import path from "node:path";

function readJsonSafe(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readJsonFolderSafe(folderPath: string) {
  try {
    if (!fs.existsSync(folderPath)) return [];

    return fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".json"))
      .map((file) => readJsonSafe(path.join(folderPath, file), null))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function stripAccentsFast(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function slugifyFast(value: any) {
  return stripAccentsFast(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";
}

function firstValidImage(...values: any[]): string {
  const flat = values.flat(Infinity).filter(Boolean);

  for (const value of flat) {
    if (!value) continue;

    if (typeof value === "string") {
      const parts = value
        .split(/\\n|\n|\r|\t|\s+/g)
        .map((item) => item.trim())
        .filter(Boolean);

      for (const part of parts) {
        const clean = part.trim();

        if (!clean) continue;
        if (clean === "#") continue;
        if (clean.toLowerCase().includes("produto sem foto")) continue;

        if (
          clean.startsWith("/") ||
          clean.startsWith("http://") ||
          clean.startsWith("https://") ||
          clean.startsWith("data:image/")
        ) {
          return clean;
        }

        if (clean.startsWith("uploads/")) return "/" + clean;
      }

      continue;
    }

    if (typeof value === "object") {
      const nested =
        value.url ||
        value.src ||
        value.path ||
        value.image ||
        value.imagem ||
        value.foto ||
        value.thumbnail ||
        value.download_url;

      if (nested) {
        const found: string = firstValidImage(nested);
        if (found) return found;
      }
    }
  }

  return "";
}

export function normalizeProductFast(product: any) {
  const name =
    product?.name ||
    product?.nome ||
    product?.title ||
    product?.titulo ||
    "Produto sem nome";

  const slug = slugifyFast(product?.slug || product?.id || name);

  const image = firstValidImage(
    product?.image,
    product?.imagem,
    product?.imageUrl,
    product?.image_url,
    product?.foto,
    product?.fotos,
    product?.cover,
    product?.coverImage,
    product?.cover_image,
    product?.thumbnail,
    product?.thumb,
    product?.picture,
    product?.pictures,
    product?.media,
    product?.gallery,
    product?.galeria,
    product?.images,
    product?.imagens,
    product?.photos
  );

  const description =
    product?.description ||
    product?.descricao ||
    product?.shortDescription ||
    product?.resumo ||
    product?.details ||
    product?.detalhes ||
    "";

  const price =
    product?.price ??
    product?.preco ??
    product?.valor ??
    product?.salePrice ??
    product?.sale_price ??
    0;

  return {
    ...product,
    name,
    nome: product?.nome || name,
    slug,
    price,
    preco: product?.preco ?? price,
    image: image || "/exale-produto-sem-foto.svg",
    imagem: image || "/exale-produto-sem-foto.svg",
    description,
    descricao: product?.descricao || description,
  };
}

export function normalizeStorefrontFast(store: any) {
  const productsRaw =
    (Array.isArray(store?.products) && store.products) ||
    (Array.isArray(store?.produtos) && store.produtos) ||
    [];

  const products = productsRaw.map(normalizeProductFast).filter((p: any) => p.slug);

  return {
    settings: store?.settings || store?.config || store?.store || {},
    products,
    produtos: products,
    banners: Array.isArray(store?.banners) ? store.banners : [],
    lines: Array.isArray(store?.lines) ? store.lines : Array.isArray(store?.linhas) ? store.linhas : [],
    productLines: Array.isArray(store?.productLines) ? store.productLines : [],
    coupons: Array.isArray(store?.coupons) ? store.coupons : [],
    combos: Array.isArray(store?.combos) ? store.combos : [],
    updatedAt: new Date().toISOString(),
  };
}

export function getLocalStorefrontFast() {
  const root = process.cwd();

  const settings =
    readJsonSafe(path.join(root, "content/settings/store.json"), {}) ||
    readJsonSafe(path.join(root, "content/settings.json"), {}) ||
    {};

  const products = readJsonFolderSafe(path.join(root, "content/products")).map(normalizeProductFast);
  const banners = readJsonFolderSafe(path.join(root, "content/banners"));
  const lines = readJsonFolderSafe(path.join(root, "content/product-lines"));
  const coupons = readJsonFolderSafe(path.join(root, "content/coupons"));
  const combos = readJsonFolderSafe(path.join(root, "content/combos"));

  return normalizeStorefrontFast({
    settings,
    products,
    banners,
    lines,
    productLines: lines,
    coupons,
    combos,
  });
}

export async function withTimeoutFast<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: any;

  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout-fast-storefront")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
