#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="/root/exale-cosmeticos-naturais"
SAVE_ROUTE="$PROJECT/src/app/api/admin/save/route.ts"
STORE_ROUTE="$PROJECT/src/app/api/store/route.ts"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/exale-backups-fora-do-projeto/corrige-imagens-site-$STAMP"

cd "$PROJECT" || exit 1

for ARQUIVO in "$SAVE_ROUTE" "$STORE_ROUTE"
do
  test -f "$ARQUIVO" || {
    echo "ERRO: arquivo não encontrado:"
    echo "$ARQUIVO"
    exit 1
  }
done

mkdir -p \
  "$BACKUP/src/app/api/admin/save" \
  "$BACKUP/src/app/api/store"

cp -a \
  "$SAVE_ROUTE" \
  "$BACKUP/src/app/api/admin/save/route.ts"

cp -a \
  "$STORE_ROUTE" \
  "$BACKUP/src/app/api/store/route.ts"

echo
echo "============================================================"
echo "1. BACKUP CRIADO"
echo "============================================================"
echo "$BACKUP"

cat > "$SAVE_ROUTE" <<'TS'
import { NextResponse } from "next/server";
import { writeStore } from "@/lib/exale-store";

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

function normalizePayload(input: AnyRecord): AnyRecord {
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
TS

cat > "$STORE_ROUTE" <<'TS'
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
TS

echo
echo "============================================================"
echo "2. BUILD DE SEGURANÇA"
echo "============================================================"

export USER="${USER:-$(whoami)}"
export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

nvm use 20 || exit 1

rm -rf \
  .next \
  .turbo \
  node_modules/.cache \
  .vercel/output \
  2>/dev/null || true

if ! npm run build; then
  echo
  echo "============================================================"
  echo "BUILD FALHOU — RESTAURANDO BACKUP"
  echo "============================================================"

  cp -a \
    "$BACKUP/src/app/api/admin/save/route.ts" \
    "$SAVE_ROUTE"

  cp -a \
    "$BACKUP/src/app/api/store/route.ts" \
    "$STORE_ROUTE"

  rm -rf .next .turbo 2>/dev/null || true

  echo "Arquivos anteriores restaurados."
  exit 1
fi

echo
echo "============================================================"
echo "3. COMMIT"
echo "============================================================"

git add \
  src/app/api/admin/save/route.ts \
  src/app/api/store/route.ts

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova para commit."
else
  git commit -m \
    "corrige sincronizacao das imagens do painel com o site"
fi

echo
echo "============================================================"
echo "CORREÇÃO CONCLUÍDA"
echo "============================================================"
echo
echo "Backup:"
echo "$BACKUP"
echo
echo "Agora publique com:"
echo "git pull --rebase origin main"
echo "git push origin main"
echo "vercel --prod --force"
