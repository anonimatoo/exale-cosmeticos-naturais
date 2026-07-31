import { NextResponse } from "next/server";
import { readStore } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ProductRecord = Record<string, unknown>;

function cleanImage(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const image = value.trim();

  if (
    !image ||
    image === "#" ||
    image.startsWith("blob:")
  ) {
    return "";
  }

  if (image.startsWith("uploads/")) {
    return `/${image}`;
  }

  return image;
}

function readFirstArrayValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function getProductImage(product: ProductRecord): string {
  const candidates: unknown[] = [
    product.imageUrl,
    product.image,
    product.imagem,
    product.image_url,
    product.foto,
    product.photo,
    product.cover,
    product.thumbnail,
    readFirstArrayValue(product.images),
    readFirstArrayValue(product.imagens),
    readFirstArrayValue(product.gallery),
    readFirstArrayValue(product.galeria),
  ];

  for (const candidate of candidates) {
    const image = cleanImage(candidate);

    if (image) {
      return image;
    }
  }

  return "";
}

function valueAsString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normalizeProduct(
  product: ProductRecord,
  index: number,
): ProductRecord {
  const image = getProductImage(product);

  const id =
    valueAsString(product.id) ||
    valueAsString(product.slug) ||
    valueAsString(product.sku) ||
    `produto-${index + 1}`;

  const generatedImages = image ? [image] : [];

  const images =
    Array.isArray(product.images) && product.images.length
      ? product.images
      : generatedImages;

  const imagens =
    Array.isArray(product.imagens) && product.imagens.length
      ? product.imagens
      : images;

  return {
    ...product,
    id,
    imageUrl: image,
    image,
    imagem: image,
    image_url: image,
    foto: image,
    photo: image,
    images,
    imagens,
  };
}

export async function GET() {
  try {
    const store = await readStore();

    const products = Array.isArray(store.products)
      ? store.products
          .filter(
            (product): product is ProductRecord =>
              typeof product === "object" &&
              product !== null &&
              !Array.isArray(product),
          )
          .map(normalizeProduct)
      : [];

    return NextResponse.json(
      {
        ok: true,
        products,
        produtos: products,
        total: products.length,
        source: "content/store.json",
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao carregar os produtos.";

    console.error("[EXALE products]", error);

    return NextResponse.json(
      {
        ok: false,
        products: [],
        produtos: [],
        total: 0,
        message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
