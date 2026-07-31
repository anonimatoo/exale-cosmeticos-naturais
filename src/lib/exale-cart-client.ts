/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const EXALE_CART_KEY = "exale-carrinho-v1";

const LEGACY_CART_KEYS = [
  "exale-cart",
  "exale_cart",
  "exale-carrinho",
  "exale-cart-v1",
  "carrinho",
  "cart",
];

export type ExaleCartItem = {
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.max(0, value)
      : 0;
  }

  const text = String(value ?? "")
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(text);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
}

function quantityValue(value: unknown): number {
  const number = Math.floor(Number(value || 1));

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.min(99, Math.max(1, number));
}

function firstImage(value: any): string {
  const values = Array.isArray(value)
    ? value
    : [value];

  for (const item of values.flat(Infinity)) {
    if (!item) continue;

    const parts = String(item)
      .split(/\\n|\n|\r|\t|\s+/g)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (
        part.startsWith("/") ||
        part.startsWith("http://") ||
        part.startsWith("https://") ||
        part.startsWith("data:image/")
      ) {
        return part;
      }
    }
  }

  return "";
}

function normalizeItem(item: any): ExaleCartItem | null {
  const source =
    item?.product ||
    item?.produto ||
    item;

  const name = String(
    source?.name ||
    source?.nome ||
    source?.title ||
    source?.titulo ||
    ""
  ).trim();

  const slug = String(
    source?.slug ||
    source?.id ||
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  ).trim();

  if (!name || !slug) {
    return null;
  }

  const normalPrice = numberValue(
    source?.price ??
    source?.preco ??
    source?.valor ??
    item?.price ??
    item?.preco ??
    0
  );

  const promotionalPrice = numberValue(
    source?.promotionalPrice ??
    source?.precoPromocional ??
    source?.salePrice ??
    0
  );

  const finalPrice =
    promotionalPrice > 0 &&
    promotionalPrice < normalPrice
      ? promotionalPrice
      : normalPrice;

  return {
    slug,
    name,
    image: firstImage([
      source?.image,
      source?.imagem,
      source?.foto,
      source?.images,
      source?.imagens,
      item?.image,
      item?.imagem,
    ]),
    price: finalPrice,
    quantity: quantityValue(
      item?.quantity ??
      item?.quantidade ??
      item?.qtd ??
      source?.quantity ??
      1
    ),
  };
}

function parseStoredCart(raw: string | null): ExaleCartItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : Array.isArray(parsed?.products)
          ? parsed.products
          : Array.isArray(parsed?.produtos)
            ? parsed.produtos
            : [];

    return list
      .map(normalizeItem)
      .filter(Boolean)
      .slice(0, 50) as ExaleCartItem[];
  } catch {
    return [];
  }
}

export function readExaleCart(): ExaleCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const mainCart = parseStoredCart(
    window.localStorage.getItem(EXALE_CART_KEY)
  );

  if (mainCart.length > 0) {
    return mainCart;
  }

  for (const key of LEGACY_CART_KEYS) {
    const legacyCart = parseStoredCart(
      window.localStorage.getItem(key)
    );

    if (legacyCart.length > 0) {
      saveExaleCart(legacyCart);
      return legacyCart;
    }
  }

  return [];
}

export function saveExaleCart(
  items: ExaleCartItem[]
): ExaleCartItem[] {
  const normalized = items
    .map(normalizeItem)
    .filter(Boolean)
    .slice(0, 50) as ExaleCartItem[];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      EXALE_CART_KEY,
      JSON.stringify(normalized)
    );

    try {
      window.dispatchEvent(
        new CustomEvent("exale-cart-updated", {
          detail: normalized,
        })
      );
    } catch {}
  }

  return normalized;
}

export function addToExaleCart(
  product: any,
  quantity = 1
): ExaleCartItem[] {
  const normalized = normalizeItem({
    ...product,
    quantity,
  });

  if (!normalized) {
    return readExaleCart();
  }

  const current = readExaleCart();

  const index = current.findIndex(
    (item) => item.slug === normalized.slug
  );

  if (index >= 0) {
    current[index] = {
      ...normalized,
      quantity: quantityValue(
        current[index].quantity +
        normalized.quantity
      ),
    };
  } else {
    current.push(normalized);
  }

  return saveExaleCart(current);
}

export function buyExaleProductNow(
  product: any
): void {
  addToExaleCart(product, 1);

  if (typeof window !== "undefined") {
    window.location.assign(
      "/carrinho?finalizar=1"
    );
  }
}

export function updateExaleCartQuantity(
  slug: string,
  quantity: number
): ExaleCartItem[] {
  const next = readExaleCart().map((item) =>
    item.slug === slug
      ? {
          ...item,
          quantity: quantityValue(quantity),
        }
      : item
  );

  return saveExaleCart(next);
}

export function removeFromExaleCart(
  slug: string
): ExaleCartItem[] {
  return saveExaleCart(
    readExaleCart().filter(
      (item) => item.slug !== slug
    )
  );
}

export function clearExaleCart(): void {
  saveExaleCart([]);
}
