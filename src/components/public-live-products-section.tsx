/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
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

function money(value: any) {
  const n = Number(value || 0);

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function validImage(value: any) {
  const text = String(value || "").trim();

  if (!text) return "";
  if (text === "#") return "";
  if (text.toLowerCase().includes("produto sem foto")) return "";

  const first = text
    .split(/\\n|\n|\r|\t|\s+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .find((item) =>
      item.startsWith("/") ||
      item.startsWith("http://") ||
      item.startsWith("https://") ||
      item.startsWith("data:image/") ||
      item.startsWith("uploads/")
    );

  if (!first) return "";

  if (first.startsWith("uploads/")) return "/" + first;

  return first;
}

function pickImage(product: any) {
  const values = [
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
    product?.photos,
  ].flat(Infinity);

  for (const value of values) {
    if (typeof value === "string") {
      const image = validImage(value);
      if (image) return image;
    }

    if (value && typeof value === "object") {
      const image = validImage(
        value.url ||
          value.src ||
          value.path ||
          value.image ||
          value.imagem ||
          value.foto ||
          value.thumbnail ||
          value.download_url
      );

      if (image) return image;
    }
  }

  return "/exale-produto-sem-foto.svg";
}

function pickProducts(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.produtos)) return data.produtos;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function normalizeProduct(product: any) {
  const name =
    product?.name ||
    product?.nome ||
    product?.title ||
    product?.titulo ||
    "Produto sem nome";

  const slug = slugify(product?.slug || product?.id || name);

  const description =
    product?.description ||
    product?.descricao ||
    product?.shortDescription ||
    product?.resumo ||
    product?.details ||
    product?.detalhes ||
    "";

  const category =
    product?.category ||
    product?.categoria ||
    product?.line ||
    product?.linha ||
    "Exale";

  const price =
    product?.price ??
    product?.preco ??
    product?.valor ??
    product?.salePrice ??
    product?.sale_price ??
    0;

  return {
    ...product,
    name,
    slug,
    description,
    category,
    price,
    image: pickImage(product),
  };
}

export default function PublicLiveProductsSection() {
  const [products, setProducts] = useState<any[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);

    try {
      const response = await fetch("/api/products?siteLiveProducts=" + Date.now(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      });

      const data = await response.json();
      const list = pickProducts(data)
        .map(normalizeProduct)
        .filter((item: any) => item.slug);

      setProducts(list);
      setSource(data?.source || "");
    } catch {
      setProducts([]);
      setSource("erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const featured = useMemo(() => products.slice(0, 6), [products]);

  return (
    <section id="produtos" className="exale-live-products-site">
      <div className="exale-live-products-head">
        <div>
          <span className="exale-live-eyebrow">Produtos cadastrados no painel</span>
          <h2>Escolha seu produto Exale</h2>
          <p>
            Os produtos abaixo são carregados diretamente do painel administrativo,
            com imagem, preço e detalhes atualizados.
          </p>
        </div>

        <button type="button" onClick={loadProducts} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar produtos"}
        </button>
      </div>

      {loading ? (
        <div className="exale-live-status">Carregando produtos atualizados...</div>
      ) : featured.length === 0 ? (
        <div className="exale-live-status">
          Nenhum produto ativo encontrado no momento.
        </div>
      ) : (
        <>
          <div className="exale-live-grid">
            {featured.map((product) => (
              <article className="exale-live-card" key={product.slug}>
                <Link href={`/produto/${product.slug}`} className="exale-live-image-wrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    onError={(event: any) => {
                      event.currentTarget.src = "/exale-produto-sem-foto.svg";
                    }}
                  />
                  <span>Ver detalhes</span>
                </Link>

                <div className="exale-live-info">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <strong>{money(product.price)}</strong>

                  <p>
                    {product.description ||
                      "Produto Exale cadastrado no painel administrativo."}
                  </p>

                  <div className="exale-live-actions">
                    <Link href={`/produto/${product.slug}`}>Abrir produto</Link>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Olá! Tenho interesse no produto ${product.name} (${money(product.price)}).`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="exale-live-source">
            {products.length} produto(s) sincronizado(s) do painel
            {source ? ` • ${source}` : ""}
          </div>
        </>
      )}

      <style jsx>{`
        .exale-live-products-site {
          width: min(1180px, calc(100% - 28px));
          margin: clamp(28px, 5vw, 70px) auto;
          padding: clamp(18px, 4vw, 34px);
          border-radius: 34px;
          background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(255,247,237,.96));
          border: 1px solid rgba(120,72,24,.13);
          box-shadow: 0 24px 70px rgba(120,72,24,.13);
        }

        .exale-live-products-head {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .exale-live-eyebrow {
          display: inline-flex;
          border-radius: 999px;
          padding: 8px 12px;
          background: #fff7ed;
          border: 1px solid rgba(120,72,24,.12);
          color: #8a5a2b;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .exale-live-products-head h2 {
          margin: 0;
          color: #653510;
          font-size: clamp(32px, 6vw, 58px);
          line-height: .98;
          letter-spacing: -.045em;
        }

        .exale-live-products-head p {
          max-width: 680px;
          margin: 12px 0 0;
          color: #7a4b22;
          font-size: clamp(15px, 2vw, 18px);
          line-height: 1.55;
          font-weight: 650;
        }

        .exale-live-products-head button {
          border: 0;
          border-radius: 999px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #3b210f, #c9951f);
          color: #fff;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(120,72,24,.22);
        }

        .exale-live-status {
          padding: 18px;
          border-radius: 20px;
          background: #fff7ed;
          color: #7a4b22;
          font-weight: 900;
        }

        .exale-live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(245px, 1fr));
          gap: 18px;
        }

        .exale-live-card {
          overflow: hidden;
          border-radius: 28px;
          background: #fffaf0;
          border: 1px solid rgba(120,72,24,.12);
          box-shadow: 0 18px 44px rgba(120,72,24,.10);
        }

        .exale-live-image-wrap {
          position: relative;
          display: block;
          aspect-ratio: 1 / 1;
          background: #fff7ed;
          overflow: hidden;
          text-decoration: none;
        }

        .exale-live-image-wrap img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .28s ease;
        }

        .exale-live-image-wrap:hover img {
          transform: scale(1.045);
        }

        .exale-live-image-wrap span {
          position: absolute;
          left: 12px;
          bottom: 12px;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(59,33,15,.84);
          color: #fff;
          font-size: 12px;
          font-weight: 950;
        }

        .exale-live-info {
          padding: 16px;
        }

        .exale-live-info small {
          display: inline-flex;
          color: #8a5a2b;
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .exale-live-info h3 {
          margin: 0;
          color: #3b210f;
          font-size: 22px;
          line-height: 1.05;
          letter-spacing: -.03em;
        }

        .exale-live-info strong {
          display: block;
          margin-top: 8px;
          color: #653510;
          font-size: 21px;
          font-weight: 950;
        }

        .exale-live-info p {
          margin: 10px 0 0;
          color: #7a4b22;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 650;
          min-height: 42px;
        }

        .exale-live-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .exale-live-actions a {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 999px;
          padding: 10px 13px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }

        .exale-live-actions a:first-child {
          background: #fef3c7;
          color: #653510;
        }

        .exale-live-actions a:last-child {
          background: #16a34a;
          color: #fff;
        }

        .exale-live-source {
          margin-top: 16px;
          color: #8a5a2b;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        @media (max-width: 540px) {
          .exale-live-products-site {
            width: min(100% - 18px, 1180px);
            border-radius: 28px;
            padding: 14px;
          }

          .exale-live-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .exale-live-card {
            border-radius: 24px;
          }

          .exale-live-info h3 {
            font-size: 20px;
          }
        }
      `}</style>
    </section>
  );
}
