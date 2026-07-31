/* eslint-disable @typescript-eslint/no-explicit-any */

const PLACEHOLDER_IMAGE = "/exale-produto-sem-foto.svg";

function cleanText(value: any) {
  return String(value || "").trim();
}

function slugify(value: any) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "produto";
}

function productImage(product: any) {
  return (
    product?.image ||
    product?.imagem ||
    product?.imageUrl ||
    product?.image_url ||
    product?.photo ||
    product?.foto ||
    product?.cover ||
    product?.thumbnail ||
    PLACEHOLDER_IMAGE
  );
}

function hasRealImage(product: any) {
  return Boolean(
    product?.image ||
    product?.imagem ||
    product?.imageUrl ||
    product?.image_url ||
    product?.photo ||
    product?.foto ||
    product?.cover ||
    product?.thumbnail
  );
}

export function normalizeProductSafe(product: any) {
  const next = { ...(product || {}) };

  const name =
    next.name ||
    next.nome ||
    next.title ||
    next.titulo ||
    next.slug ||
    next.id ||
    "Produto";

  const image = productImage(next);

  next.name = next.name || name;
  next.nome = next.nome || name;
  next.title = next.title || name;
  next.titulo = next.titulo || name;
  next.slug = next.slug || slugify(name);

  next.image = image;
  next.imagem = image;
  next.imageUrl = image;
  next.image_url = image;

  if (!hasRealImage(product)) {
    next.withoutImage = true;
    next.semImagem = true;
  }

  return next;
}

export function normalizeProductsSafe(products: any) {
  if (!Array.isArray(products)) return [];

  const seen = new Set();

  return products
    .filter((item) => item && typeof item === "object")
    .map(normalizeProductSafe)
    .filter((item) => {
      const slug = String(item.slug || "");
      if (!slug) return false;
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
}

export function normalizeStorefrontSafe(data: any) {
  const next = { ...(data || {}) };

  const settings = next.settings || next.store || next.loja || next.config || {};
  const products = normalizeProductsSafe(next.products || next.produtos || next.items || []);
  const banners = Array.isArray(next.banners) ? next.banners : [];
  const productLines = Array.isArray(next.productLines) ? next.productLines : [];

  return {
    ...next,
    ok: true,
    settings,
    store: settings,
    loja: settings,
    config: settings,
    products,
    produtos: products,
    items: products,
    banners,
    productLines,
    lines: productLines,
    linhas: productLines,
    coupons: next.coupons || next.cupons || [],
    cupons: next.coupons || next.cupons || [],
    combos: next.combos || [],
    activeProducts: products.filter((p: any) => p?.active !== false && p?.ativo !== false),
    featuredProducts: products.filter((p: any) => p?.featured || p?.destaque),
  };
}
