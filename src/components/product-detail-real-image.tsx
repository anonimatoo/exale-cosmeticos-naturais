/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";

function stripAccents(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: any) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";
}

function isPlaceholder(value: any) {
  const src = String(value || "").trim().toLowerCase();

  return (
    !src ||
    src.includes("exale-produto-sem-foto") ||
    src.includes("produto-sem-foto") ||
    src.includes("sem-foto")
  );
}

function pickFirstImage(...values: any[]): string {
  const flat = values.flat(Infinity).filter(Boolean);

  for (const value of flat) {
    if (!value) continue;

    if (typeof value === "string") {
      const parts = value
        .split(/\\n|\n|\r|\t|\s+/g)
        .map((item) => item.trim())
        .filter(Boolean);

      for (const part of parts) {
        if (!part || part === "#") continue;
        if (part.toLowerCase().includes("produto sem foto")) continue;

        if (
          part.startsWith("/") ||
          part.startsWith("http://") ||
          part.startsWith("https://") ||
          part.startsWith("data:image/")
        ) {
          return part;
        }

        if (part.startsWith("uploads/")) return "/" + part;
      }
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

      const found: string = pickFirstImage(nested);

      if (found) return found;
    }
  }

  return "";
}

function pickProducts(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.produtos)) return data.produtos;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function normalizeProduct(product: any) {
  const name = product?.name || product?.nome || product?.title || product?.titulo || "";
  const slug = slugify(product?.slug || product?.id || name);

  const image = pickFirstImage(
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

  return {
    ...product,
    name,
    slug,
    image,
  };
}

export default function ProductDetailRealImage({
  slug,
  name,
  initialImage,
}: {
  slug: string;
  name: string;
  initialImage?: string;
}) {
  const placeholder = "/exale-produto-sem-foto.svg";
  const [src, setSrc] = useState(initialImage || placeholder);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const realImageAvailable = useMemo(() => !isPlaceholder(src), [src]);

  useEffect(() => {
    let cancelled = false;

    async function loadRealImage() {
      try {
        const response = await fetch("/api/products?detailImage=" + Date.now(), {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
          },
        });

        const data = await response.json();
        const wanted = slugify(slug);

        const products: Array<Record<string, any>> =
          pickProducts(data).map(normalizeProduct);

        const found = products.find(
          (product: Record<string, any>) => {
          const candidates = [
            product?.slug,
            product?.id,
            product?.name,
            product?.nome,
            product?.title,
            product?.titulo,
          ]
            .map(slugify)
            .filter(Boolean);

          return candidates.includes(wanted);
          }
        );

        const image = pickFirstImage(found?.image, found?.imagem);

        if (!cancelled && image && !isPlaceholder(image)) {
          setSrc(image);
        }
      } catch {}
    }

    loadRealImage();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (realImageAvailable) setOpen(true);
        }}
        title={realImageAvailable ? "Clique para ampliar a imagem" : "Produto sem foto cadastrada"}
        style={{
          appearance: "none",
          border: 0,
          padding: 0,
          margin: 0,
          width: "100%",
          background: "transparent",
          cursor: realImageAvailable ? "zoom-in" : "default",
          display: "block",
          position: "relative",
        }}
      >
        <img
          src={src || placeholder}
          alt={name}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setSrc(placeholder);
            setLoaded(true);
          }}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            borderRadius: 28,
            display: "block",
            background: "#fff7ed",
            border: "1px solid rgba(120,72,24,.12)",
            opacity: loaded ? 1 : .72,
            transition: "opacity .25s ease, transform .25s ease",
          }}
        />

        {realImageAvailable ? (
          <span
            style={{
              position: "absolute",
              right: 14,
              bottom: 14,
              borderRadius: 999,
              padding: "8px 12px",
              background: "rgba(59,33,15,.82)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 950,
              boxShadow: "0 10px 24px rgba(0,0,0,.22)",
            }}
          >
            Ampliar foto
          </span>
        ) : null}
      </button>

      {open && realImageAvailable ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            background: "rgba(15,23,42,.78)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "92vh",
              borderRadius: 28,
              overflow: "hidden",
              background: "#fffaf0",
              boxShadow: "0 30px 90px rgba(0,0,0,.48)",
              border: "1px solid rgba(255,255,255,.22)",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                zIndex: 3,
                border: 0,
                borderRadius: 999,
                width: 44,
                height: 44,
                cursor: "pointer",
                background: "rgba(59,33,15,.88)",
                color: "#fff",
                fontSize: 22,
                fontWeight: 950,
              }}
            >
              ×
            </button>

            <img
              src={src}
              alt={name}
              style={{
                width: "100%",
                maxHeight: "92vh",
                objectFit: "contain",
                display: "block",
                background: "#fffaf0",
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
