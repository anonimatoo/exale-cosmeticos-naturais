/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

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

function pickProducts(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.produtos)) return data.produtos;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function firstImage(product: any): string {
  const values = [
    product?.image,
    product?.imagem,
    product?.foto,
    product?.images,
    product?.imagens,
    product?.gallery,
    product?.galeria,
    product?.thumbnail,
  ].flat(Infinity);

  for (const value of values) {
    if (!value) continue;

    if (typeof value === "string") {
      const parts = value
        .split(/\\n|\n|\r|\t|\s+/g)
        .map((x) => x.trim())
        .filter(Boolean);

      for (const part of parts) {
        if (!part || part === "#") continue;
        if (part.toLowerCase().includes("produto sem foto")) continue;

        if (
          part.startsWith("/") ||
          part.startsWith("http://") ||
          part.startsWith("https://") ||
          part.startsWith("data:image/") ||
          part.startsWith("uploads/")
        ) {
          return part.startsWith("uploads/") ? "/" + part : part;
        }
      }
    }

    if (typeof value === "object") {
      const nested = value.url || value.src || value.path || value.image || value.imagem || value.foto || value.thumbnail;
      const found: string = firstImage({ image: nested });
      if (found) return found;
    }
  }

  return "/exale-produto-sem-foto.svg";
}

function normalizeProduct(product: any) {
  const name = product?.name || product?.nome || product?.title || product?.titulo || "Produto sem nome";
  const slug = slugify(product?.slug || product?.id || name);
  const price = product?.price ?? product?.preco ?? product?.valor ?? product?.salePrice ?? 0;
  const description = product?.description || product?.descricao || product?.shortDescription || product?.resumo || "";
  const category = product?.category || product?.categoria || product?.line || product?.linha || "Cosméticos Naturais";
  const image = firstImage(product);

  return {
    ...product,
    name,
    slug,
    price,
    description,
    category,
    image,
  };
}

function emptyForm() {
  return {
    name: "",
    slug: "",
    price: "",
    category: "Cosméticos Naturais",
    description: "",
    image: "",
  };
}

export default function AdminProductsInlinePanel() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [busySlug, setBusySlug] = useState("");
  const [toast, setToast] = useState<any>(null);

  const total = useMemo(() => products.length, [products]);

  function showToast(type: "ok" | "error" | "info", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), type === "error" ? 9000 : 4500);
  }

  async function loadProducts() {
    setLoading(true);

    try {
      const response = await fetch("/api/products?adminInlinePanel=" + Date.now(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });

      const data = await response.json();
      const list = pickProducts(data)
        .map(normalizeProduct)
        .filter((item: any) => item.slug);

      setProducts(list);
    } catch (error: any) {
      showToast("error", "Erro ao carregar produtos: " + String(error?.message || error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openEditor(product?: any) {
    if (!product) {
      setEditor(emptyForm());
      return;
    }

    const p = normalizeProduct(product);

    setEditor({
      ...p,
      name: p.name,
      slug: p.slug,
      price: p.price,
      category: p.category,
      description: p.description,
      image: p.image === "/exale-produto-sem-foto.svg" ? "" : p.image,
    });
  }

  function updateEditor(key: string, value: any) {
    setEditor((current: any) => {
      const next = { ...(current || emptyForm()), [key]: value };

      if (key === "name" && !current?.slug) {
        next.slug = slugify(value);
      }

      return next;
    });
  }

  async function uploadProductImage(file: File) {
    if (!file || !editor) return;

    setBusy(true);

    try {
      showToast("info", "Enviando imagem do produto...");

      const form = new FormData();
      form.append("file", file);
      form.append("productName", editor.name || editor.slug || "produto");

      const response = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        cache: "no-store",
        body: form,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Nao foi possivel enviar a imagem.");
      }

      updateEditor("image", data.image || data.url || data.imagem);
      showToast("ok", "Imagem enviada. Agora clique em Salvar e atualizar site.");
    } catch (error: any) {
      showToast("error", String(error?.message || error || "Erro ao enviar imagem."));
    } finally {
      setBusy(false);
    }
  }

  async function saveEditor() {
    if (!editor) return;

    const name = String(editor.name || "").trim();

    if (!name) {
      showToast("error", "Informe o nome do produto.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        ...editor,
        slug: slugify(editor.slug || editor.name),
        name: editor.name,
        nome: editor.name,
        title: editor.name,
        titulo: editor.name,
        price: editor.price,
        preco: editor.price,
        valor: editor.price,
        category: editor.category,
        categoria: editor.category,
        description: editor.description,
        descricao: editor.description,
        image: editor.image,
        imagem: editor.image,
        foto: editor.image,
        images: editor.image ? [editor.image] : [],
        imagens: editor.image ? [editor.image] : [],
        active: true,
        ativo: true,
      };

      const response = await fetch("/api/admin/upsert-product", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Não foi possível salvar o produto.");
      }

      showToast("ok", "Produto salvo e site atualizado.");
      setEditor(null);

      await fetch("/api/admin/sync-site?reason=upsert-product&t=" + Date.now(), {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      }).catch(() => null);

      await loadProducts();
    } catch (error: any) {
      showToast("error", String(error?.message || error || "Erro ao salvar produto."));
    } finally {
      setBusy(false);
    }
  }

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
        throw new Error(data?.message || "Não foi possível remover o produto.");
      }

      showToast("ok", "Produto removido.");
      await loadProducts();
    } catch (error: any) {
      setProducts(before);
      showToast("error", String(error?.message || error || "Erro ao remover produto."));
    } finally {
      setBusySlug("");
    }
  }

  return (
    <>
      <section id="exale-admin-products-inline-panel" style={panelStyle}>
        <div style={headStyle}>
          <div>
            <div style={titleStyle}>Produtos do painel</div>
            <div style={subStyle}>
              {loading ? "Carregando produtos..." : `${total} produto(s) carregado(s)`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => openEditor()} style={topButtonStyle("#16a34a", "#fff")}>
              Novo produto
            </button>

            <button type="button" onClick={loadProducts} disabled={loading} style={topButtonStyle("#f59e0b", "#2b1705")}>
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div style={statusStyle}>Carregando produtos cadastrados...</div>
        ) : products.length === 0 ? (
          <div style={statusStyle}>Nenhum produto apareceu. Verifique a API /api/products.</div>
        ) : (
          <div style={gridStyle}>
            {products.map((product) => (
              <article key={product.slug} data-admin-product-card="1" style={cardStyle}>
                <img
                  src={product.image || "/exale-produto-sem-foto.svg"}
                  alt={product.name}
                  style={thumbStyle}
                  onError={(event: any) => {
                    event.currentTarget.src = "/exale-produto-sem-foto.svg";
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <div style={nameStyle}>{product.name}</div>
                  <div style={slugStyle}>{product.slug}</div>
                  <div style={priceStyle}>{money(product.price)}</div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => openEditor(product)} style={smallButtonStyle("#fef3c7", "#653510")}>
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={busySlug === product.slug}
                      onClick={() => setTarget(product)}
                      style={smallButtonStyle("#fee2e2", "#991b1b")}
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

      {editor && (
        <div style={modalBackdrop} onClick={() => !busy && setEditor(null)}>
          <div style={editorModal} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeadStyle}>
              <div>
                <div style={modalTitleStyle}>{editor.slug ? "Editar produto" : "Novo produto"}</div>
                <div style={subStyle}>Salva no painel e atualiza o site automaticamente.</div>
              </div>

              <button type="button" onClick={() => !busy && setEditor(null)} style={closeButton}>×</button>
            </div>

            <div style={previewBox}>
              <img
                src={editor.image || "/exale-produto-sem-foto.svg"}
                alt={editor.name || "Produto"}
                style={previewImg}
                onError={(event: any) => {
                  event.currentTarget.src = "/exale-produto-sem-foto.svg";
                }}
              />

              <div>
                <div style={{ fontSize: 18, fontWeight: 950, color: "#3b210f" }}>
                  {editor.name || "Nome do produto"}
                </div>
                <div style={{ marginTop: 6, fontSize: 17, fontWeight: 950, color: "#653510" }}>
                  {money(editor.price)}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: "#7a4b22", fontWeight: 750 }}>
                  {editor.description || "A descrição aparecerá aqui como prévia para o cliente."}
                </div>
              </div>
            </div>

            <label style={labelStyle}>Nome do produto</label>
            <input value={editor.name || ""} onChange={(e) => updateEditor("name", e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Link do produto</label>
            <input value={editor.slug || ""} onChange={(e) => updateEditor("slug", slugify(e.target.value))} style={inputStyle} />

            <label style={labelStyle}>Preço de venda</label>
            <input value={editor.price ?? ""} onChange={(e) => updateEditor("price", e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Categoria / linha</label>
            <input value={editor.category || ""} onChange={(e) => updateEditor("category", e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Imagem do produto</label>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 10,
              padding: 12,
              borderRadius: 18,
              background: "#fff7ed",
              border: "1px solid rgba(120,72,24,.14)",
            }}>
              <label style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                borderRadius: 999,
                padding: "13px 16px",
                background: "linear-gradient(135deg,#3b210f,#c9951f)",
                color: "#fff",
                fontWeight: 950,
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: "0 12px 28px rgba(120,72,24,.20)",
              }}>
                Escolher imagem do produto
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadProductImage(file);
                    event.currentTarget.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>

              {editor.image ? (
                <div style={{
                  padding: 10,
                  borderRadius: 14,
                  background: "#ffffff",
                  color: "#653510",
                  fontSize: 12,
                  fontWeight: 850,
                  wordBreak: "break-word",
                }}>
                  Imagem selecionada e pronta para salvar.
                </div>
              ) : (
                <div style={{
                  padding: 10,
                  borderRadius: 14,
                  background: "#ffffff",
                  color: "#8a5a2b",
                  fontSize: 12,
                  fontWeight: 850,
                }}>
                  Nenhuma imagem escolhida ainda.
                </div>
              )}

              <details style={{
                borderRadius: 14,
                background: "#ffffff",
                padding: 10,
              }}>
                <summary style={{
                  cursor: "pointer",
                  color: "#7a4b22",
                  fontSize: 12,
                  fontWeight: 950,
                }}>
                  Opção avançada
                </summary>

                <input
                  value={editor.image || ""}
                  onChange={(e) => updateEditor("image", e.target.value)}
                  placeholder="Imagem do produto"
                  style={{ ...inputStyle, marginTop: 10 }}
                />
              </details>
            </div>

            <label style={labelStyle}>Descrição do produto</label>
            <textarea
              value={editor.description || ""}
              onChange={(e) => updateEditor("description", e.target.value)}
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setEditor(null)} disabled={busy} style={topButtonStyle("#e5e7eb", "#111827")}>
                Cancelar
              </button>

              <button type="button" onClick={saveEditor} disabled={busy} style={topButtonStyle("#16a34a", "#fff")}>
                {busy ? "Salvando..." : "Salvar e atualizar site"}
              </button>
            </div>
          </div>
        </div>
      )}

      {target && (
        <div style={modalBackdrop} onClick={() => setTarget(null)}>
          <div style={confirmModal} onClick={(event) => event.stopPropagation()}>
            <div style={{ fontSize: 24, fontWeight: 950, marginBottom: 10 }}>Remover produto?</div>
            <div style={{ padding: 14, borderRadius: 16, background: "#fff7ed", fontWeight: 950 }}>{target.name}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setTarget(null)} style={topButtonStyle("#e5e7eb", "#111827")}>Cancelar</button>
              <button type="button" onClick={() => removeProduct(target)} style={topButtonStyle("#dc2626", "#fff")}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.text}
        </div>
      )}
    </>
  );
}

const panelStyle: CSSProperties = {
  marginTop: 22,
  padding: 16,
  borderRadius: 24,
  background: "rgba(255,255,255,.78)",
  border: "1px solid rgba(120,72,24,.16)",
  boxShadow: "0 18px 40px rgba(120,72,24,.10)",
};

const headStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const titleStyle: CSSProperties = { fontSize: 22, fontWeight: 950, color: "#653510", lineHeight: 1.15 };
const subStyle: CSSProperties = { marginTop: 4, fontSize: 13, fontWeight: 800, color: "#8a5a2b" };
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 };
const cardStyle: CSSProperties = { display: "grid", gridTemplateColumns: "82px 1fr", gap: 12, alignItems: "center", padding: 12, borderRadius: 20, background: "linear-gradient(135deg,#fffaf0,#ffffff)", border: "1px solid rgba(120,72,24,.14)", boxShadow: "0 12px 30px rgba(120,72,24,.10)" };
const thumbStyle: CSSProperties = { width: 82, height: 82, objectFit: "cover", borderRadius: 18, border: "1px solid rgba(120,72,24,.16)", background: "#fff7ed" };
const nameStyle: CSSProperties = { fontWeight: 950, color: "#3b210f", fontSize: 16, lineHeight: 1.2, wordBreak: "break-word" };
const slugStyle: CSSProperties = { marginTop: 5, fontWeight: 800, color: "#8a5a2b", fontSize: 12, wordBreak: "break-word" };
const priceStyle: CSSProperties = { marginTop: 6, fontWeight: 950, color: "#653510", fontSize: 15 };
const statusStyle: CSSProperties = { padding: 18, borderRadius: 18, background: "#fff7ed", color: "#7c2d12", fontWeight: 900 };

function topButtonStyle(bg: string, color: string) : CSSProperties {
  return { border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 950, background: bg, color, cursor: "pointer", boxShadow: "0 10px 22px rgba(120,72,24,.16)" };
}

function smallButtonStyle(bg: string, color: string) : CSSProperties {
  return { border: 0, borderRadius: 999, padding: "9px 13px", fontWeight: 950, cursor: "pointer", background: bg, color };
}

const modalBackdrop: CSSProperties = { position: "fixed", inset: 0, zIndex: 2147483647, background: "rgba(15,23,42,.68)", display: "grid", placeItems: "center", padding: 18, overflow: "auto" };
const editorModal: CSSProperties = { width: "min(760px,100%)", maxHeight: "92vh", overflow: "auto", borderRadius: 26, padding: 22, background: "linear-gradient(135deg,#fffaf0,#ffffff)", color: "#3b2a18", boxShadow: "0 30px 90px rgba(0,0,0,.45)", border: "1px solid rgba(92,59,22,.16)" };
const confirmModal: CSSProperties = { width: "min(480px,100%)", borderRadius: 26, padding: 22, background: "linear-gradient(135deg,#fffaf0,#ffffff)", color: "#3b2a18", boxShadow: "0 30px 90px rgba(0,0,0,.45)" };
const modalHeadStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 14 };
const modalTitleStyle: CSSProperties = { fontSize: 26, fontWeight: 950, color: "#653510", lineHeight: 1 };
const previewBox: CSSProperties = { display: "grid", gridTemplateColumns: "118px 1fr", gap: 14, alignItems: "center", padding: 14, borderRadius: 22, background: "#fff7ed", border: "1px solid rgba(120,72,24,.12)", marginBottom: 16 };
const previewImg: CSSProperties = { width: 118, height: 118, objectFit: "cover", borderRadius: 20, background: "#fff7ed", border: "1px solid rgba(120,72,24,.14)" };
const labelStyle: CSSProperties = { display: "block", margin: "12px 0 6px", color: "#653510", fontSize: 13, fontWeight: 950 };
const inputStyle: CSSProperties = { width: "100%", border: "1px solid rgba(120,72,24,.22)", borderRadius: 16, padding: "12px 13px", background: "#fffaf0", color: "#3b210f", fontWeight: 750 };
const closeButton: CSSProperties = { border: 0, borderRadius: 999, width: 40, height: 40, background: "#3b210f", color: "#fff", fontSize: 22, fontWeight: 950, cursor: "pointer" };

function toastStyle(type: string): CSSProperties {
  return {
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
    color: type === "error" ? "#7f1d1d" : type === "ok" ? "#064e3b" : "#172554",
    background: type === "error" ? "linear-gradient(135deg,#fff1f2,#fecaca)" : type === "ok" ? "linear-gradient(135deg,#ecfdf5,#a7f3d0)" : "linear-gradient(135deg,#eff6ff,#bfdbfe)",
    boxShadow: "0 18px 48px rgba(0,0,0,.30)",
    border: "1px solid rgba(0,0,0,.08)",
  };
}
