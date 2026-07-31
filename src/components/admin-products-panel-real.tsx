/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function clean(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: any) {
  return clean(value)
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

function productArray(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.produtos)) return data.produtos;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function normalizeProduct(product: any) {
  const name = product?.name || product?.nome || product?.title || product?.titulo || "Produto sem nome";
  const slug = slugify(product?.slug || product?.id || name);
  const price = product?.price ?? product?.preco ?? product?.valor ?? product?.salePrice ?? 0;
  const image = product?.image || product?.imagem || product?.cover || product?.foto || product?.thumbnail || "";

  return {
    ...product,
    name,
    slug,
    price,
    image,
  };
}

function findProdutosArea() {
  const nodes = Array.from(document.querySelectorAll("h1,h2,h3,div,section"));

  const heading = nodes.find((node: any) => {
    const text = clean(String(node.textContent || "")).toLowerCase().trim();
    return text === "produtos cadastrados" || text.includes("produtos cadastrados");
  }) as HTMLElement | undefined;

  if (!heading) return null;

  let anchor: HTMLElement = heading;

  for (let i = 0; i < 4; i++) {
    const parent = anchor.parentElement;

    if (!parent) break;

    const text = clean(String(parent.textContent || "")).toLowerCase();

    if (text.includes("produtos cadastrados")) {
      anchor = parent;
    }
  }

  let container = document.getElementById("exale-admin-products-real-root");

  if (!container) {
    container = document.createElement("div");
    container.id = "exale-admin-products-real-root";
    container.setAttribute("data-exale-products-real", "1");
    container.style.width = "100%";
    container.style.marginTop = "18px";

    anchor.insertAdjacentElement("afterend", container);
  }

  return container;
}

function hideBrokenOldEmptyArea() {
  const root = document.getElementById("exale-admin-products-real-root");

  if (!root) return;

  const siblings = [];
  let node = root.nextElementSibling;

  while (node && siblings.length < 8) {
    siblings.push(node);
    node = node.nextElementSibling;
  }

  for (const el of siblings as any[]) {
    const text = clean(String(el.textContent || "")).toLowerCase();

    if (text.includes("editar") && text.includes("remover")) {
      el.style.display = "none";
      el.setAttribute("data-exale-old-products-hidden", "1");
    }
  }
}

export default function AdminProductsPanelReal() {
  const [portal, setPortal] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<any>(null);
  const [busySlug, setBusySlug] = useState("");
  const [toast, setToast] = useState<any>(null);

  const total = useMemo(() => products.length, [products]);

  function showToast(type: "ok" | "error" | "info", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), type === "error" ? 9000 : 5200);
  }

  async function loadProducts() {
    setLoading(true);

    try {
      const response = await fetch("/api/products?adminPanelReal=" + Date.now(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      });

      const data = await response.json();
      const list = productArray(data).map(normalizeProduct).filter((p: any) => p.slug);

      setProducts(list);
      hideBrokenOldEmptyArea();
    } catch (error: any) {
      showToast("error", "Erro ao carregar produtos no painel: " + String(error?.message || error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function mount() {
      const area = findProdutosArea();

      if (area) {
        setPortal(area);
        window.setTimeout(hideBrokenOldEmptyArea, 100);
      }
    }

    mount();

    const t1 = window.setTimeout(mount, 500);
    const t2 = window.setTimeout(mount, 1300);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (portal) loadProducts();
  }, [portal]);

  async function removeProduct(product: any) {
    setTarget(null);
    setBusySlug(product.slug);

    const before = products;

    try {
      setProducts((items) => items.filter((item) => item.slug !== product.slug));
      showToast("info", "Removendo produto...");

      const response = await fetch("/api/admin/remove-product", {
        method: "DELETE",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          slug: product.slug,
          name: product.name,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Nao foi possivel remover o produto.");
      }

      showToast("ok", "Produto removido do painel e do site.");

      fetch("/api/admin/sync-site?reason=remove-product&t=" + Date.now(), {
        method: "POST",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      }).catch(() => null);

      window.history.replaceState(null, "", "/painel-exale?v=produto-removido-" + Date.now());
    } catch (error: any) {
      setProducts(before);
      showToast("error", String(error?.message || error || "Erro ao remover produto."));
    } finally {
      setBusySlug("");
    }
  }

  if (!portal) return null;

  return createPortal(
    <>
      <section
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 24,
          background: "rgba(255,255,255,.62)",
          border: "1px solid rgba(120,72,24,.12)",
          boxShadow: "0 18px 40px rgba(120,72,24,.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 950, color: "#653510" }}>
              Produtos do painel
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#8a5a2b", marginTop: 4 }}>
              {loading ? "Carregando produtos..." : `${total} produto(s) carregado(s)`}
            </div>
          </div>

          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 950,
              background: "#f59e0b",
              color: "#2b1705",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 10px 22px rgba(120,72,24,.18)",
            }}
          >
            Atualizar produtos
          </button>
        </div>

        {loading ? (
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "#fff7ed",
              fontWeight: 900,
              color: "#7c2d12",
            }}
          >
            Carregando produtos cadastrados...
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "#fff7ed",
              fontWeight: 900,
              color: "#7c2d12",
            }}
          >
            Nenhum produto retornou da API. Verifique /api/products.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {products.map((product) => (
              <article
                key={product.slug}
                data-exale-admin-product-card="1"
                style={{
                  display: "grid",
                  gridTemplateColumns: "82px 1fr",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 20,
                  background: "linear-gradient(135deg,#fffaf0,#ffffff)",
                  border: "1px solid rgba(120,72,24,.12)",
                  boxShadow: "0 12px 30px rgba(120,72,24,.08)",
                }}
              >
                <img
                  src={product.image || "/exale-produto-sem-foto.svg"}
                  alt={product.name}
                  style={{
                    width: 82,
                    height: 82,
                    objectFit: "cover",
                    borderRadius: 18,
                    border: "1px solid rgba(120,72,24,.16)",
                    background: "#fff7ed",
                  }}
                  onError={(event: any) => {
                    event.currentTarget.src = "/exale-produto-sem-foto.svg";
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 950,
                      color: "#3b210f",
                      fontSize: 16,
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                    }}
                  >
                    {product.name}
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      color: "#8a5a2b",
                      fontSize: 12,
                      marginTop: 5,
                      wordBreak: "break-word",
                    }}
                  >
                    {product.slug}
                  </div>

                  <div
                    style={{
                      fontWeight: 950,
                      color: "#653510",
                      fontSize: 15,
                      marginTop: 6,
                    }}
                  >
                    {money(product.price)}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const editButton = Array.from(document.querySelectorAll("button,a")).find((el: any) => {
                          const text = clean(String(el.textContent || "")).toLowerCase();
                          const boxText = clean(String(el.closest?.("article,li,tr,div")?.textContent || "")).toLowerCase();
                          return text.includes("editar") && boxText.includes(product.slug);
                        }) as HTMLElement | undefined;

                        if (editButton) editButton.click();
                        else showToast("info", "Use o formulário Novo Produto para editar este item.");
                      }}
                      style={{
                        border: 0,
                        borderRadius: 999,
                        padding: "9px 13px",
                        fontWeight: 950,
                        cursor: "pointer",
                        background: "#fef3c7",
                        color: "#653510",
                      }}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={busySlug === product.slug}
                      onClick={() => setTarget(product)}
                      style={{
                        border: 0,
                        borderRadius: 999,
                        padding: "9px 13px",
                        fontWeight: 950,
                        cursor: busySlug === product.slug ? "wait" : "pointer",
                        background: "#fee2e2",
                        color: "#991b1b",
                      }}
                    >
                      {busySlug === product.slug ? "Removendo..." : "Remover"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {target && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            background: "rgba(15,23,42,.68)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
          onClick={() => setTarget(null)}
        >
          <div
            style={{
              width: "min(480px,100%)",
              borderRadius: 26,
              padding: 22,
              background: "linear-gradient(135deg,#fffaf0,#ffffff)",
              color: "#3b2a18",
              boxShadow: "0 30px 90px rgba(0,0,0,.45)",
              border: "1px solid rgba(92,59,22,.16)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 24, fontWeight: 950, marginBottom: 10 }}>
              Remover produto?
            </div>

            <div style={{ fontSize: 14, fontWeight: 800, opacity: .85 }}>
              Produto selecionado:
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 14,
                borderRadius: 16,
                background: "#fff7ed",
                border: "1px solid rgba(92,59,22,.14)",
                fontWeight: 950,
                fontSize: 17,
              }}
            >
              {target.name}
            </div>

            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.45, fontWeight: 800, color: "#7c2d12" }}>
              Esta ação remove somente este produto e atualiza o site. O painel não será enviado para login.
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setTarget(null)}
                style={{
                  flex: "1 1 140px",
                  border: 0,
                  borderRadius: 999,
                  padding: "13px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => removeProduct(target)}
                style={{
                  flex: "1 1 180px",
                  border: 0,
                  borderRadius: 999,
                  padding: "13px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                  background: "#dc2626",
                  color: "#fff",
                  boxShadow: "0 12px 26px rgba(220,38,38,.28)",
                }}
              >
                Remover com segurança
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 14,
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            width: "min(520px,calc(100vw - 28px))",
            borderRadius: 18,
            padding: "14px 16px",
            textAlign: "center",
            fontWeight: 950,
            lineHeight: 1.35,
            color: toast.type === "error" ? "#7f1d1d" : toast.type === "ok" ? "#064e3b" : "#172554",
            background:
              toast.type === "error"
                ? "linear-gradient(135deg,#fff1f2,#fecaca)"
                : toast.type === "ok"
                  ? "linear-gradient(135deg,#ecfdf5,#a7f3d0)"
                  : "linear-gradient(135deg,#eff6ff,#bfdbfe)",
            boxShadow: "0 18px 48px rgba(0,0,0,.30)",
            border: "1px solid rgba(0,0,0,.08)",
          }}
        >
          {toast.text}
        </div>
      )}
    </>,
    portal
  );
}
