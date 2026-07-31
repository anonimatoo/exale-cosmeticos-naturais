/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { readStore } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AnyRecord = Record<string, any>;

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

function getProductImage(product: AnyRecord): string {
  const candidates = [
    product?.imageUrl,
    product?.image,
    product?.imagem,
    product?.image_url,
    product?.foto,
    product?.photo,
    product?.cover,
    product?.thumbnail,
    product?.images?.[0],
    product?.imagens?.[0],
    product?.gallery?.[0],
    product?.galeria?.[0],
  ];

  for (const candidate of candidates) {
    const image = cleanImage(candidate);

    if (image) {
      return image;
    }
  }

  return "";
}

function normalizeProduct(
  product: AnyRecord,
  index: number
): AnyRecord {
  const image = getProductImage(product);

  const id = String(
    product?.id ||
    product?.slug ||
    product?.sku ||
    `produto-${index + 1}`
  );

  const images = image
    ? [image]
    : [];

  return {
    ...product,

    id,

    imageUrl: image,
    image,
    imagem: image,
    image_url: image,
    foto: image,
    photo: image,

    images:
      Array.isArray(product?.images) &&
      product.images.length
        ? product.images
        : images,

    imagens:
      Array.isArray(product?.imagens) &&
      product.imagens.length
        ? product.imagens
        : images,
  };
}

export async function GET() {
  try {
    const store =
      await readStore();

    const products =
      Array.isArray(store?.products)
        ? store.products.map(
            normalizeProduct
          )
        : [];

    return NextResponse.json(
      {
        ok: true,
        ...store,
        products,
        produtos: products,
        updatedAt:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "[EXALE store]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          error?.message ||
          "Erro ao carregar a loja.",
      },
      {
        status: 500,
      }
    );
  }
}
