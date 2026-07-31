/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import StoreSearch from "@/components/store-search"
import TrustSecurity from "@/components/trust-security"

async function getRuntimeStorefront() {
  try {
    if (typeof document !== "undefined") {
      const element = document.getElementById("exale-storefront-data");
      const raw = element?.textContent || "";

      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}

  const response = await fetch("/api/storefront?client=" + Date.now(), {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao carregar dados da vitrine.");
  }

  return response.json();
}

type Product = {
  slug: string
  sku?: string
  name: string
  category?: string
  line?: string
  price: number
  oldPrice?: number
  shortText?: string
  description?: string
  images: string[]
  featured?: boolean
  stock?: number
}

type ProductLine = {
  slug: string
  name: string
  subtitle?: string
  image?: string
  active?: boolean
  order?: number
  highlightText?: string
}

type Banner = {
  slug: string
  title: string
  subtitle?: string
  image: string
  buttonText?: string
  buttonLink?: string
  active?: boolean
  order?: number
}

function brl(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function firstImage(product: Product) {
  return product.images?.[0] || "/uploads/logo-exale.svg"
}

export default function Home({ initialData = null }: any) {
  const [data, setData] = useState<any>(initialData || null);

  useEffect(() => {
    let alive = true;

    if (!data) {
      getRuntimeStorefront()
        .then((nextData) => {
          if (alive) {
            setData(nextData || {
              settings: {},
              products: [],
              banners: [],
              productLines: [],
              coupons: [],
              combos: [],
            });
          }
        })
        .catch(() => {
          if (alive) {
            setData({
              settings: {},
              products: [],
              banners: [],
              productLines: [],
              coupons: [],
              combos: [],
            });
          }
        });
    }

    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "linear-gradient(135deg,#fff7ed,#fffaf0,#ffffff)",
          color: "#3b2a18",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>Exale Cosmeticos Naturais</div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>Carregando loja...</div>
        </div>
      </main>
    );
  }const settings: any = data.settings || {}

  const products = ((data.products || []) as Product[])
    .filter((item) => item && item.name && Number(item.price || 0) > 0)

  const lines = ((data.productLines || data.lines || []) as ProductLine[])
    .filter((line) => line && line.active !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .slice(0, 12)

  const banners = ((data.banners || []) as Banner[])
    .filter((banner) => banner && banner.active !== false && banner.image)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .slice(0, 5)

  const visibleBanners = banners.length ? banners : [
    {
      slug: "exale",
      title: "Exale Cosméticos Naturais",
      subtitle: "Presentes artesanais, fragrâncias marcantes e autocuidado premium.",
      image: "/uploads/banner-banho-premium.svg",
      buttonText: "Ver produtos",
      buttonLink: "#produtos",
      active: true,
      order: 1
    }
  ]

  const featured = products
    .filter((item) => item.featured !== false)
    .slice(0, 24)

  const promotions = products
    .filter((item) => item.oldPrice && Number(item.oldPrice) > Number(item.price))
    .slice(0, 6)

  const launches = products.slice(-6).reverse()

  return (
    <main className="store-shell">
      <div className="commerce-top">
        {settings.promoText || "Atendimento exclusivo pelo WhatsApp · Kits artesanais · Brilho premium"}
      </div>

      <header className="commerce-header">
        <div className="commerce-header-main">
          <a href="/" className="commerce-logo" aria-label="Página inicial">
            <img
              src={settings.logoImage || "/uploads/logo-exale.svg"}
              alt={settings.logoAlt || "Exale"}
              loading="eager"
              decoding="async"
            />
            <span className="commerce-logo-text"><strong className="header-standard-title">{settings.headerTitle || settings.neonName || "Exale"}</strong><small className="header-standard-subtitle">{settings.headerSubtitle || "Cosméticos naturais e velas artesanais"}</small></span>
          </a>

          <StoreSearch products={products} lines={lines} />

          <div className="commerce-actions">
            <a href="#linhas">Linhas</a>
            <a href="#promocoes">Promoção</a>
            <a href="#produtos">Produtos</a>
            <a href="/carrinho" className="cart-pill">Carrinho</a>
          </div>
        </div>

        <nav className="commerce-nav" aria-label="Categorias">
          {lines.slice(0, 8).map((line) => (
            <a href="#produtos" key={line.slug}>{line.name}</a>
          ))}
          <a href="#promocoes">Presentes</a>
        </nav>
      </header>

      <section className="main-banner-wrap" aria-label="Destaques">
        <div className="main-banner-scroll">
          {visibleBanners.map((banner, index) => (
            <a href={banner.buttonLink || "#produtos"} className="main-banner" key={banner.slug}>
              <img
                src={banner.image || "/uploads/banner-banho-premium.svg"}
                alt={banner.title}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
              <div className="main-banner-content">
                <span>Especial Exale</span>
                <h1 className="site-standard-title">{settings.siteTitle || banner.title}</h1>
                <p className="site-standard-subtitle">{settings.siteSubtitle || banner.subtitle || "Produtos especiais para transformar seu momento de cuidado."}</p>
                <strong>{banner.buttonText || "Ver produtos"}</strong>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="container commerce-cards" aria-label="Atalhos">
        <MiniShelf title="Em alta" products={featured.slice(0, 3)} link="#produtos" />
        <MiniShelf title="Lançamentos" products={launches.slice(0, 3)} link="#produtos" />
        <MiniShelf title="Promoções" products={(promotions.length ? promotions : featured).slice(0, 3)} link="#promocoes" />
      </section>

      <section className="container quick-pills" aria-label="Compra rápida">
        <a href="#promocoes">Ofertas</a>
        <a href="#produtos">Mais vendidos</a>
        <a href="/carrinho">Compre pelo WhatsApp</a>
        <a href="#linhas">Linhas Exale</a>
      </section>

      <section id="linhas" className="container section">
        <div className="section-head clean-head">
          <div>
            <h2>Escolha sua linha favorita</h2>
            <p>Navegue pelas linhas Exale e descubra produtos pensados para beleza, cuidado, perfume e bem-estar.</p>
          </div>
        </div>

        <div className="category-strip">
          {lines.map((line) => (
            <a href="#produtos" className="category-card" key={line.slug}>
              <img
                src={line.image || "/uploads/logo-exale.svg"}
                alt={line.name}
                loading="lazy"
                decoding="async"
              />
              <span>{line.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section id="promocoes" className="container seasonal-block">
        <div>
          <h2>Para todo tipo de presente, uma experiência Exale</h2>
          <p>Presentes artesanais, fragrâncias marcantes e cuidados especiais para transformar cada momento em uma experiência inesquecível.</p>
        </div>
        <img
          src={visibleBanners[0]?.image || "/uploads/banner-dia-dos-namorados.svg"}
          alt={visibleBanners[0]?.title || "Exale"}
          loading="lazy"
          decoding="async"
        />
      </section>

      <section id="produtos" className="container section">
        <div className="section-head clean-head">
          <div>
            <h2>Mais desejados da Exale</h2>
            <p>Produtos selecionados para você adicionar ao carrinho e finalizar com atendimento personalizado pelo WhatsApp.</p>
          </div>
          <a href="/carrinho" className="btn btn-pink">Ir para carrinho</a>
        </div>

        <div className="commerce-product-grid">
          {featured.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      </section>

      <a className="floating-whatsapp" href={`https://wa.me/${settings.whatsapp || "5513991616048"}`}>
        Compre pelo WhatsApp
      </a>

      <TrustSecurity />

      <footer className="footer">
        <div className="container">
          <h2>{settings.storeName || "Exale Cosméticos Naturais"}</h2>
          <p>{settings.slogan || "Produtos naturais, velas artesanais e presentes especiais"}</p>
          <p>WhatsApp: {settings.whatsapp || "5513991616048"}</p>
          <p>CNPJ: {settings.cnpj || "24.604.430/0001-80"}</p>
          
        </div>
      </footer>
    </main>
  )
}

function MiniShelf({ title, products, link }: { title: string; products: Product[]; link: string }) {
  return (
    <a href={link} className="mini-shelf">
      <div className="mini-shelf-head">
        <strong>{title}</strong>
        <span>Ver produtos →</span>
      </div>

      <div className="mini-products">
        {products.map((product) => (
          <div key={product.slug}>
            <img
              src={firstImage(product)}
              alt={product.name}
              loading="lazy"
              decoding="async"
            />
            {product.oldPrice ? <small>Oferta</small> : null}
          </div>
        ))}
      </div>
    </a>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="commerce-product">
      <a href={`/produto/${product.slug}`} className="commerce-product-image">
        {product.oldPrice && Number(product.oldPrice) > Number(product.price) ? <span className="discount-tag">Oferta</span> : null}
        <img
          src={firstImage(product)}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />
      </a>

      <div className="commerce-product-body">
        <div className="brand-row">
          <span>EXALE</span>
          <small>♡</small>
        </div>

        <h3>{product.name}</h3>
        <p>{product.shortText || product.description || "Produto artesanal Exale."}</p>

        <div className="price-row">
          {product.oldPrice && Number(product.oldPrice) > Number(product.price) ? (
            <span className="old-price">De {brl(product.oldPrice)}</span>
          ) : null}
          <strong>Por {brl(product.price)}</strong>
        </div>

        <a href={`/carrinho?add=${product.slug}`} className="buy-button">Adicionar ao carrinho</a>
      </div>
    </article>
  )
}
