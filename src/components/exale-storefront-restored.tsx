/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";

const PLACEHOLDER = "/exale-produto-sem-foto.svg";

function money(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pickProducts(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.produtos)) return data.produtos;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalize(product: any) {
  const name = product?.name || product?.nome || product?.title || product?.titulo || "Produto sem nome";
  const slug = product?.slug || product?.id || name;
  const price = product?.price ?? product?.preco ?? product?.valor ?? 0;
  const description = product?.description || product?.descricao || product?.shortDescription || product?.resumo || "";
  const category = product?.category || product?.categoria || product?.line || product?.linha || "Exale";
  const image = product?.image || product?.imagem || product?.foto || PLACEHOLDER;

  return { ...product, name, slug, price, description, category, image };
}

function imageFallback(event: any) {
  event.currentTarget.src = PLACEHOLDER;
}

export default function ExaleStorefrontRestored() {
  const [products, setProducts] = useState<any[]>([]);
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProducts() {
    setLoading(true);

    try {
      const response = await fetch("/api/products?restoredSite=" + Date.now(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });

      const data = await response.json().catch(() => ({}));
      const list = pickProducts(data).map(normalize).filter((item: any) => item.slug);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) =>
      [product.name, product.slug, product.category, product.description].join(" ").toLowerCase().includes(q)
    );
  }, [products, query]);

  const visibleProducts = filtered;
  const hero = products.find((p) => p.image && p.image !== PLACEHOLDER) || products[0];
  const categories = Array.from(new Set(products.map((p) => p.category || "Exale"))).slice(0, 8);

  return (
    <main className="exale-page">
      <section className="service-bar">
        Atendimento exclusivo pelo WhatsApp · Kits artesanais · Brilho premium
      </section>

      <header className="header">
        <a className="brand" href="/">
          <span className="logo">Exale</span>
          <span>
            <strong>Patrícia Santana</strong>
            <small>Exale Cosméticos Naturais</small>
          </span>
        </a>

        <nav className="desktop-menu">
          <a href="#linhas">Linhas</a>
          <a href="#promocao">Promoção</a>
          <a href="#produtos">Produtos</a>
          <a className="cart" href="#produtos">Carrinho</a>
        </nav>
      </header>

      <section className="search-wrap">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="O que você procura hoje?"
        />
        <button type="button" onClick={loadProducts}>🔎</button>
      </section>

      <nav className="line-nav">
        {(categories.length ? categories : ["Linha Cosméticos Tratamento com Argila", "Linha Body Splash", "Hidratantes Corporais", "Linha Sabonetes"]).map((category) => (
          <a key={category} href="#produtos">{category}</a>
        ))}
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span>Especial Exale</span>
          <h1>Faça quem você ama feliz</h1>
          <p>Melhore o presente com beleza, aroma e carinho.</p>
          <a href="#produtos">Ver produtos</a>
        </div>

        <img src={hero?.image || PLACEHOLDER} alt={hero?.name || "Exale"} onError={imageFallback} />
      </section>

      <section id="promocao" className="mini-shelves">
        <MiniShelf title="Em alta" products={products.slice(0, 3)} />
        <MiniShelf title="Lançamentos" products={products.slice(1, 4)} />
        <MiniShelf title="Promoções" products={products.slice(2, 5)} />
      </section>

      <section className="quick-buttons">
        <a href="#produtos">Ofertas</a>
        <a href="#produtos">Mais vendidos</a>
        <a href="#produtos">Compre pelo WhatsApp</a>
        <a href="#linhas">Linhas Exale</a>
      </section>

      <section id="linhas" className="lines">
        <h2>Escolha sua linha favorita</h2>
        <p>Navegue pelas linhas Exale e descubra produtos pensados para beleza, cuidado, perfume e bem-estar.</p>

        <div className="line-grid">
          {(categories.length ? categories : ["Linha Cosméticos Tratamento com Argila", "Linha Body Splash", "Hidratantes Corporais", "Sabonetes"]).map((line) => (
            <a key={line} href="#produtos">
              <span>Exale</span>
              <strong>{line}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="gift">
        <h2>Para todo tipo de presente, uma experiência Exale</h2>
        <p>Presentes artesanais, fragrâncias marcantes e cuidados especiais para transformar cada momento em uma experiência inesquecível.</p>
      </section>

      <section id="produtos" className="products">
        <div className="products-head">
          <div>
            <span>Produtos do painel administrativo</span>
            <h2>Produtos Exale atualizados</h2>
            <p>Produtos sincronizados com o painel, com imagem, preço e descrição.</p>
          </div>
          <button type="button" onClick={loadProducts}>{loading ? "Atualizando..." : "Atualizar"}</button>
        </div>

        {loading ? (
          <div className="status">Carregando produtos...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="status">Nenhum produto encontrado.</div>
        ) : (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.slug}>
                <a href={`/produto/${product.slug}`} className="product-image">
                  <img src={product.image || PLACEHOLDER} alt={product.name} onError={imageFallback} />
                  <b>Oferta</b>
                </a>

                <div className="product-info">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <p>{product.description || "Produto Exale cadastrado no painel administrativo."}</p>
                  <strong>{money(product.price)}</strong>

                  <div>
                    <a href={`/produto/${product.slug}`}>Ver produto</a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Olá! Tenho interesse no produto ${product.name} (${money(product.price)}).`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Comprar
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="sync">{products.length} produto(s) sincronizado(s) · {source}</p>
      </section>

      <a className="whatsapp" href="https://wa.me/?text=Olá! Tenho interesse nos produtos Exale." target="_blank" rel="noreferrer">
        Compre pelo WhatsApp
      </a>

      <style jsx>{`
        .exale-page {
          --cream: #fff4dc;
          --cream2: #f6e2bd;
          --paper: #fffaf1;
          --brown: #5b2d12;
          --brown2: #7a461f;
          --gold: #c4942b;
          --gold2: #f4d676;

          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          background: linear-gradient(180deg, var(--cream), #fff9ed 48%, var(--cream2));
          color: var(--brown);
          padding-bottom: 96px;
        }

        .service-bar {
          width: 100%;
          min-height: 28px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 7px 12px;
          background: #2b1609;
          color: #ffe8a2;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          overflow-x: auto;
        }

        .header {
          width: min(1240px, calc(100% - 18px));
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0 10px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          min-width: 0;
        }

        .logo {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: radial-gradient(circle, #c79a2d, #130807 64%);
          color: #f8dc83;
          display: grid;
          place-items: center;
          font-weight: 950;
          box-shadow: 0 12px 28px rgba(0,0,0,.20);
          flex: 0 0 auto;
        }

        .brand strong {
          display: block;
          color: #fff7dc;
          text-shadow: 0 3px 18px rgba(0,0,0,.35);
          font-size: clamp(28px, 5vw, 54px);
          line-height: .9;
          letter-spacing: -.05em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 500px;
        }

        .brand small {
          display: block;
          color: #ffe8a2;
          font-weight: 950;
          margin-top: 5px;
          font-size: clamp(13px, 2.4vw, 22px);
        }

        .desktop-menu {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .desktop-menu a {
          text-decoration: none;
          font-weight: 950;
          padding: 12px 10px;
          border-radius: 999px;
        }

        .desktop-menu .cart {
          color: #fff;
          background: linear-gradient(135deg, #2b1609, var(--gold));
          padding: 16px 25px;
        }

        .search-wrap {
          width: min(1240px, calc(100% - 18px));
          margin: 0 auto 10px;
          display: flex;
          gap: 8px;
          padding: 9px;
          border-radius: 999px;
          background: var(--paper);
          box-shadow: 0 12px 30px rgba(91,45,18,.10);
          border: 1px solid rgba(122,70,31,.14);
        }

        .search-wrap input {
          flex: 1;
          min-width: 0;
          border: 0;
          background: transparent;
          outline: none;
          color: var(--brown);
          font-size: 18px;
          font-weight: 950;
          padding: 14px 18px;
        }

        .search-wrap button {
          width: 52px;
          height: 52px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, #2b1609, var(--gold));
        }

        .line-nav {
          width: min(1240px, calc(100% - 18px));
          margin: 0 auto 12px;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 5px;
        }

        .line-nav::-webkit-scrollbar {
          display: none;
        }

        .line-nav a {
          flex: 0 0 auto;
          text-decoration: none;
          color: var(--brown);
          font-weight: 950;
          white-space: nowrap;
        }

        .hero {
          width: min(1240px, calc(100% - 18px));
          margin: 0 auto 18px;
          min-height: 420px;
          display: grid;
          grid-template-columns: .82fr 1.18fr;
          overflow: hidden;
          border-radius: 4px;
          background: #2b1609;
          box-shadow: 0 18px 50px rgba(91,45,18,.16);
        }

        .hero-copy {
          padding: clamp(28px, 5vw, 56px);
          color: #fff8dc;
          background: linear-gradient(90deg, rgba(43,22,9,.92), rgba(43,22,9,.45));
          z-index: 2;
        }

        .hero-copy span {
          display: inline-flex;
          background: #fff8dc;
          color: var(--brown);
          padding: 9px 13px;
          border-radius: 999px;
          font-weight: 950;
          margin-bottom: 18px;
        }

        .hero-copy h1 {
          margin: 0;
          font-size: clamp(44px, 8vw, 88px);
          line-height: .84;
          letter-spacing: -.07em;
          color: var(--gold2);
        }

        .hero-copy p {
          font-size: 20px;
          line-height: 1.4;
          font-weight: 850;
        }

        .hero-copy a {
          display: inline-flex;
          margin-top: 12px;
          padding: 14px 19px;
          border-radius: 999px;
          background: #fff8dc;
          color: var(--brown);
          text-decoration: none;
          font-weight: 950;
        }

        .hero img {
          width: 100%;
          height: 100%;
          min-height: 420px;
          object-fit: cover;
        }

        .mini-shelves {
          width: min(1240px, calc(100% - 18px));
          margin: 0 auto 18px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .mini-card {
          padding: 18px;
          border-radius: 20px;
          background: var(--paper);
          border: 1px solid rgba(122,70,31,.14);
          box-shadow: 0 14px 32px rgba(91,45,18,.10);
        }

        .mini-card header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }

        .mini-card strong {
          font-size: 18px;
        }

        .mini-card a {
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }

        .mini-images {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .mini-images img {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 14px;
          background: #fff0cc;
        }

        .quick-buttons {
          width: min(920px, calc(100% - 18px));
          margin: 0 auto 36px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .quick-buttons a {
          text-decoration: none;
          text-align: center;
          padding: 15px 10px;
          border-radius: 999px;
          background: var(--paper);
          box-shadow: 0 12px 28px rgba(91,45,18,.09);
          font-weight: 950;
        }

        .lines,
        .gift,
        .products {
          width: min(1240px, calc(100% - 18px));
          margin: 0 auto 42px;
        }

        .lines h2,
        .gift h2,
        .products h2 {
          margin: 0;
          color: var(--brown);
          font-size: clamp(34px, 6vw, 62px);
          line-height: .95;
          letter-spacing: -.06em;
        }

        .lines p,
        .gift p,
        .products p {
          color: var(--brown2);
          line-height: 1.55;
          font-weight: 700;
        }

        .line-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-top: 22px;
        }

        .line-grid a {
          min-height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          border-radius: 22px;
          color: #fff8dc;
          text-decoration: none;
          background: radial-gradient(circle at top, rgba(196,148,43,.55), transparent 38%), #130807;
        }

        .line-grid span {
          color: #f8dc83;
          font-weight: 950;
        }

        .line-grid strong {
          font-size: 15px;
          line-height: 1.15;
        }

        .gift {
          text-align: center;
          max-width: 980px;
        }

        .products-head {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .products-head span {
          color: var(--brown2);
          font-weight: 950;
        }

        .products-head button {
          border: 0;
          border-radius: 999px;
          padding: 13px 17px;
          color: #fff;
          background: linear-gradient(135deg, #2b1609, var(--gold));
          font-weight: 950;
        }

        .status {
          padding: 18px;
          border-radius: 20px;
          background: var(--paper);
          font-weight: 950;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .product-card {
          overflow: hidden;
          border-radius: 22px;
          background: var(--paper);
          box-shadow: 0 16px 38px rgba(91,45,18,.10);
          border: 1px solid rgba(122,70,31,.14);
        }

        .product-image {
          position: relative;
          display: block;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #fff0cc;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .product-image b {
          position: absolute;
          left: 11px;
          top: 11px;
          border-radius: 999px;
          padding: 7px 10px;
          background: var(--brown);
          color: #f8dc83;
          font-size: 12px;
        }

        .product-info {
          padding: 15px;
        }

        .product-info small {
          color: var(--brown2);
          font-weight: 950;
        }

        .product-info h3 {
          min-height: 42px;
          margin: 8px 0 0;
          font-size: 18px;
          line-height: 1.15;
        }

        .product-info p {
          min-height: 50px;
          font-size: 13px;
        }

        .product-info strong {
          display: block;
          font-size: 21px;
          margin: 8px 0 12px;
        }

        .product-info div {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .product-info a {
          text-decoration: none;
          text-align: center;
          border-radius: 999px;
          padding: 10px 8px;
          font-size: 13px;
          font-weight: 950;
          background: #fff0cc;
        }

        .product-info a:last-child {
          color: #fff;
          background: #21c063;
        }

        .sync {
          text-align: center;
          font-size: 12px;
          font-weight: 850;
        }

        .whatsapp {
          position: fixed;
          z-index: 80;
          right: 18px;
          bottom: 18px;
          display: inline-flex;
          justify-content: center;
          border-radius: 999px;
          padding: 15px 20px;
          color: #fff;
          background: #21c063;
          text-decoration: none;
          font-weight: 950;
          box-shadow: 0 14px 35px rgba(33,192,99,.28);
        }

        @media (max-width: 900px) {
          .desktop-menu {
            display: none;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .hero img {
            min-height: 300px;
          }

          .mini-shelves {
            grid-template-columns: 1fr;
          }

          .line-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-buttons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .logo {
            width: 48px;
            height: 48px;
            font-size: 13px;
          }

          .brand strong {
            max-width: 230px;
            font-size: 29px;
          }

          .brand small {
            font-size: 13px;
          }

          .hero {
            min-height: auto;
          }

          .hero-copy {
            padding: 24px;
          }

          .hero-copy h1 {
            font-size: 44px;
          }

          .hero-copy p {
            font-size: 16px;
          }

          .hero img {
            min-height: 260px;
          }

          .product-grid {
            grid-template-columns: 1fr;
          }

          .whatsapp {
            left: 12px;
            right: 12px;
            bottom: 12px;
          }
        }
      `}</style>
    </main>
  );
}

function MiniShelf({ title, products }: any) {
  return (
    <article className="mini-card">
      <header>
        <strong>{title}</strong>
        <a href="#produtos">Ver produtos →</a>
      </header>

      <div className="mini-images">
        {products.slice(0, 3).map((product: any) => (
          <img key={product.slug} src={product.image || PLACEHOLDER} alt={product.name} onError={imageFallback} />
        ))}
      </div>
    </article>
  );
}
