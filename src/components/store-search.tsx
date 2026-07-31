/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Product = {
  slug: string
  name: string
  category?: string
  line?: string
  price?: number
  oldPrice?: number
  shortText?: string
  description?: string
  images?: string[]
}

type ProductLine = {
  slug: string
  name: string
  subtitle?: string
}

function brl(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function normalize(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function productImage(product: Product) {
  return product.images?.[0] || "/uploads/logo-exale.svg"
}

export default function StoreSearch({
  products,
  lines
}: {
  products: Product[]
  lines: ProductLine[]
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const cleanQuery = normalize(query).trim()

  const results = useMemo(() => {
    if (!cleanQuery) return []

    const words = cleanQuery.split(/\s+/).filter(Boolean)

    return products
      .map((product) => {
        const line = lines.find((item) => item.slug === product.line)
        const haystack = normalize([
          product.name,
          product.category,
          product.line,
          product.shortText,
          product.description,
          line?.name,
          line?.subtitle
        ].join(" "))

        const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0)

        return { product, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.product)
  }, [cleanQuery, products, lines])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function closeSearch() {
    setQuery("")
    setOpen(false)
    inputRef.current?.blur()
  }

  const suggestions = ["perfume", "sabonete", "óleo", "vela", "hidratante", "body splash"]

  return (
    <div className="store-search-box" ref={boxRef}>
      <form
        className="commerce-search real-search"
        action="#produtos"
        onSubmit={(event) => {
          event.preventDefault()
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="O que você procura hoje?"
          aria-label="Pesquisar produtos"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
        />

        {open || query ? (
          <button
            type="button"
            className="search-clear"
            aria-label="Fechar pesquisa"
            title="Fechar pesquisa"
            onClick={closeSearch}
          >
            ×
          </button>
        ) : (
          <button
            type="submit"
            className="search-submit"
            aria-label="Pesquisar"
            title="Pesquisar"
          >
            🔎
          </button>
        )}
      </form>

      {open ? (
        <div className="search-popover" role="dialog" aria-label="Resultado da pesquisa">
          <div className="search-popover-head">
            <strong>Pesquisar na loja</strong>
            <button
              type="button"
              className="search-popover-close"
              aria-label="Fechar pesquisa"
              onClick={closeSearch}
            >
              ×
            </button>
          </div>

          {!query ? (
            <>
              <p className="search-helper">Digite o nome do produto, aroma ou categoria.</p>
              <div className="search-tags">
                {suggestions.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setQuery(item)
                      setOpen(true)
                      inputRef.current?.focus()
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          ) : results.length ? (
            <>
              <div className="search-results">
                {results.map((product) => (
                  <a
                    href={`/produto/${product.slug}`}
                    className="search-result-item"
                    key={product.slug}
                    onClick={() => setOpen(false)}
                  >
                    <img src={productImage(product)} alt={product.name} loading="lazy" decoding="async" />
                    <span>
                      <b>{product.name}</b>
                      <small>{product.shortText || product.category || "Produto Exale"}</small>
                      <em>{brl(product.price)}</em>
                    </span>
                  </a>
                ))}
              </div>
              <a href="#produtos" className="search-see-all" onClick={() => setOpen(false)}>
                Ver vitrine completa
              </a>
            </>
          ) : (
            <div className="search-empty">
              <strong>Nenhum produto encontrado</strong>
              <p>Tente pesquisar por perfume, sabonete, óleo, vela, hidratante ou body splash.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
