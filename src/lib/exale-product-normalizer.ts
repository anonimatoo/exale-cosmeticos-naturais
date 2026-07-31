/* eslint-disable @typescript-eslint/no-explicit-any */

const PLACEHOLDER = "/exale-produto-sem-foto.svg";

export function slugifyProduct(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productNumber(value: any) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? "")
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(text);

  return Number.isFinite(number) ? number : 0;
}

export function findProductImage(value: any): string {
  const values = Array.isArray(value)
    ? value
    : [value];

  for (const item of values.flat(Infinity)) {
    if (!item) continue;

    if (typeof item === "object") {
      const nested =
        item.url ||
        item.src ||
        item.path ||
        item.image ||
        item.imagem ||
        item.foto ||
        item.download_url ||
        "";

      const result = findProductImage(nested);

      if (result) {
        return result;
      }

      continue;
    }

    const parts = String(item)
      .split(/\\n|\n|\r|\t|\s+/g)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (
        part.startsWith("/") ||
        part.startsWith("https://") ||
        part.startsWith("http://") ||
        part.startsWith("data:image/") ||
        part.startsWith("uploads/")
      ) {
        return part.startsWith("uploads/")
          ? `/${part}`
          : part;
      }
    }
  }

  return "";
}

export function normalizeExaleProduct(product: any) {
  const name = String(
    product?.name ||
    product?.nome ||
    product?.title ||
    product?.titulo ||
    "Produto sem nome"
  ).trim();

  const slug =
    slugifyProduct(
      product?.slug ||
      product?.id ||
      name
    ) || "produto";

  const normalPrice = productNumber(
    product?.price ??
    product?.preco ??
    product?.valor ??
    0
  );

  const promotionalPrice = productNumber(
    product?.promotionalPrice ??
    product?.precoPromocional ??
    product?.salePrice ??
    0
  );

  const image = findProductImage([
    product?.image,
    product?.imagem,
    product?.foto,
    product?.imageUrl,
    product?.image_url,
    product?.cover,
    product?.coverImage,
    product?.thumbnail,
    product?.images,
    product?.imagens,
    product?.gallery,
    product?.galeria,
    product?.photos,
    product?.pictures,
    product?.media,
  ]);

  const finalImage =
    image || PLACEHOLDER;

  const description = String(
    product?.description ||
    product?.descricao ||
    product?.shortText ||
    product?.shortDescription ||
    product?.resumo ||
    ""
  ).trim();

  const category = String(
    product?.category ||
    product?.categoria ||
    product?.line ||
    product?.linha ||
    "Cosméticos Naturais"
  ).trim();

  const active =
    product?.active ??
    product?.ativo ??
    true;

  const featured =
    product?.featured ??
    product?.destaque ??
    false;

  return {
    ...product,

    id: product?.id || slug,
    slug,

    name,
    nome: name,
    title: name,
    titulo: name,

    price: normalPrice,
    preco: normalPrice,
    valor: normalPrice,

    promotionalPrice:
      promotionalPrice > 0
        ? promotionalPrice
        : null,

    precoPromocional:
      promotionalPrice > 0
        ? promotionalPrice
        : null,

    description,
    descricao: description,

    shortText:
      product?.shortText ||
      product?.shortDescription ||
      product?.resumo ||
      description,

    category,
    categoria: category,

    line:
      product?.line ||
      product?.linha ||
      category,

    linha:
      product?.linha ||
      product?.line ||
      category,

    image: finalImage,
    imagem: finalImage,
    foto: finalImage,
    imageUrl: finalImage,
    image_url: finalImage,

    images:
      image
        ? Array.from(
            new Set([
              image,
              ...(
                Array.isArray(product?.images)
                  ? product.images
                  : []
              ),
            ])
          )
        : [],

    imagens:
      image
        ? Array.from(
            new Set([
              image,
              ...(
                Array.isArray(product?.imagens)
                  ? product.imagens
                  : []
              ),
            ])
          )
        : [],

    withoutImage: !image,
    semImagem: !image,

    active: Boolean(active),
    ativo: Boolean(active),

    featured: Boolean(featured),
    destaque: Boolean(featured),

    stock: Math.max(
      0,
      Number(
        product?.stock ??
        product?.estoque ??
        0
      ) || 0
    ),

    estoque: Math.max(
      0,
      Number(
        product?.stock ??
        product?.estoque ??
        0
      ) || 0
    ),
  };
}

export function normalizeExaleProducts(products: any) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .filter(
      (product) =>
        product &&
        typeof product === "object"
    )
    .map(normalizeExaleProduct)
    .filter((product) => product.slug)
    .slice(0, 50);
}
