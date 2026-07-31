/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { writeStore, type StoreData } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const existingImages = Array.isArray(product?.images)
    ? product.images
        .map(cleanImage)
        .filter(Boolean)
    : [];

  const images = image
    ? [
        image,
        ...existingImages.filter(
          (item: string) => item !== image
        ),
      ]
    : existingImages;

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
    imagens: images,
    gallery: images,
    galeria: images,
  };
}

function normalizePayload(input: AnyRecord): StoreData {
  const products = Array.isArray(input?.products)
    ? input.products.map(normalizeProduct)
    : [];

  return {
    settings:
      input?.settings &&
      typeof input.settings === "object"
        ? input.settings
        : {},

    products,

    promotions: Array.isArray(input?.promotions)
      ? input.promotions
      : [],

    reviews: Array.isArray(input?.reviews)
      ? input.reviews
      : [],

    categories: Array.isArray(input?.categories)
      ? input.categories
      : [],
  };
}

export async function POST(request: Request) {
  try {
    const password =
      request.headers.get("x-admin-password") || "";

    const expected =
      process.env.ADMIN_PASSWORD ||
      "exale-admin-2026";

    if (password !== expected) {
      return NextResponse.json(
        {
          ok: false,
          message: "Acesso negado.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const normalized =
      normalizePayload(body);

    await writeStore(normalized);

    return NextResponse.json({
      ok: true,
      message:
        "Produtos, imagens e configurações foram salvos e sincronizados.",
      products:
        normalized.products.length,
      updatedAt:
        new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(
      "[EXALE admin save]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          error?.message ||
          "Erro ao salvar.",
      },
      {
        status: 500,
      }
    );
  }
}
