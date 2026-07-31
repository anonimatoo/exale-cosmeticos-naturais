/* eslint-disable @typescript-eslint/no-explicit-any */

export function cleanText(value: any, fallback = "") {
  return String(value ?? fallback).trim()
}

export function slugify(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function moneyToNumber(value: any) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0

  const raw = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function publicImageUrl(value: any) {
  const raw = cleanText(value)
  if (!raw) return ""

  if (raw.startsWith("http://")) return raw
  if (raw.startsWith("https://")) return raw
  if (raw.startsWith("data:")) return raw

  const owner = process.env.GITHUB_REPO_OWNER || "anonimatoo"
  const repo = process.env.GITHUB_REPO_NAME || "exale-cosmeticos-naturais"

  if (raw.startsWith("/uploads/")) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/main/public${raw}`
  }

  return raw
}

export function normalizeImages(value: any) {
  if (Array.isArray(value)) {
    return value.map(publicImageUrl).filter(Boolean)
  }

  return String(value || "")
    .split("\n")
    .map(publicImageUrl)
    .filter(Boolean)
}

export function normalizeSettings(input: any) {
  return {
    ...input,
    storeName: cleanText(input?.storeName, "Exale Cosméticos Naturais"),
    neonName: cleanText(input?.neonName, "Exale"),
    slogan: cleanText(input?.slogan, "Cosméticos naturais e velas artesanais"),
    whatsapp: cleanText(input?.whatsapp, "5513991616048"),
    promoText: cleanText(input?.promoText, "Compre online e finalize pelo WhatsApp"),
    headerTitle: cleanText(input?.headerTitle, "Exale"),
    headerSubtitle: cleanText(input?.headerSubtitle, "Cosméticos naturais e velas artesanais"),
    siteTitle: cleanText(input?.siteTitle, "Exale Cosméticos naturais e velas artesanais"),
    siteSubtitle: cleanText(input?.siteSubtitle, "Produtos naturais, velas artesanais e presentes especiais para transformar seu momento de cuidado."),
    logoImage: publicImageUrl(input?.logoImage || "/uploads/logo-exale.svg")
  }
}

export function normalizeBanner(input: any) {
  const title = cleanText(input?.title, "Banner Exale")

  return {
    slug: slugify(input?.slug || title),
    title,
    subtitle: cleanText(input?.subtitle),
    image: publicImageUrl(input?.image),
    buttonText: cleanText(input?.buttonText, "Ver produtos"),
    buttonLink: cleanText(input?.buttonLink, "#produtos"),
    active: input?.active === false ? false : true,
    order: parseInt(String(input?.order || "1"), 10) || 1
  }
}

export function normalizeLine(input: any) {
  const name = cleanText(input?.name, "Linha Exale")

  return {
    slug: slugify(input?.slug || name),
    name,
    subtitle: cleanText(input?.subtitle),
    image: publicImageUrl(input?.image),
    active: input?.active === false ? false : true,
    order: parseInt(String(input?.order || "1"), 10) || 1,
    highlightText: cleanText(input?.highlightText)
  }
}

export function normalizeProduct(input: any) {
  const name = cleanText(input?.name, "Produto Exale")
  const slug = slugify(input?.slug || name)

  return {
    slug,
    sku: cleanText(input?.sku, slug.toUpperCase()),
    name,
    category: cleanText(input?.category, "Exale"),
    line: cleanText(input?.line),
    price: moneyToNumber(input?.price),
    oldPrice: moneyToNumber(input?.oldPrice),
    costPrice: moneyToNumber(input?.costPrice),
    shortText: cleanText(input?.shortText),
    description: cleanText(input?.description),
    stock: parseInt(String(input?.stock || "0"), 10) || 0,
    featured: input?.featured === false ? false : true,
    images: normalizeImages(input?.images),
    benefits: Array.isArray(input?.benefits) ? input.benefits : []
  }
}
