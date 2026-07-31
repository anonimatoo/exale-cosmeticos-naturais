/* eslint-disable @typescript-eslint/no-explicit-any */

export function onlyText(value: any, fallback = "") {
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

export function safeInt(value: any, fallback = 0) {
  const parsed = parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function safeBool(value: any) {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1"
}

export function safeImages(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean)
  }

  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function sanitizeProduct(input: any) {
  const name = onlyText(input?.name, "Produto Exale")
  const slug = slugify(input?.slug || name)

  const price = moneyToNumber(input?.price)
  const oldPrice = moneyToNumber(input?.oldPrice)
  const costPrice = moneyToNumber(input?.costPrice)

  return {
    slug,
    sku: onlyText(input?.sku, slug.toUpperCase()),
    name,
    category: onlyText(input?.category, "Cosméticos Naturais"),
    line: onlyText(input?.line),
    price,
    oldPrice,
    costPrice,
    shortText: onlyText(input?.shortText),
    description: onlyText(input?.description),
    stock: safeInt(input?.stock, 0),
    featured: input?.featured === undefined ? true : safeBool(input?.featured),
    images: safeImages(input?.images),
    benefits: Array.isArray(input?.benefits) ? input.benefits : []
  }
}

export function sanitizeBanner(input: any) {
  const title = onlyText(input?.title, "Banner Exale")

  return {
    slug: slugify(input?.slug || title),
    title,
    subtitle: onlyText(input?.subtitle),
    image: onlyText(input?.image),
    buttonText: onlyText(input?.buttonText, "Ver produtos"),
    buttonLink: onlyText(input?.buttonLink, "#produtos"),
    active: input?.active === undefined ? true : safeBool(input?.active),
    order: safeInt(input?.order, 1)
  }
}

export function sanitizeLine(input: any) {
  const name = onlyText(input?.name, "Linha Exale")

  return {
    slug: slugify(input?.slug || name),
    name,
    subtitle: onlyText(input?.subtitle),
    image: onlyText(input?.image),
    active: input?.active === undefined ? true : safeBool(input?.active),
    order: safeInt(input?.order, 1),
    highlightText: onlyText(input?.highlightText)
  }
}
