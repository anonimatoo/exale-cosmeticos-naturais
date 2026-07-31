/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";

const PLACEHOLDER = "/exale-produto-sem-foto.svg";

function money(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function slugify(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";
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
  const slug = slugify(product?.slug || product?.id || name);
  const price = product?.price ?? product?.preco ?? product?.valor ?? 0;
  const description = product?.description || product?.descricao || product?.shortDescription || product?.resumo || "";
  const category = product?.category || product?.categoria || product?.line || product?.linha || "Cosméticos Naturais";
  const image = product?.image || product?.imagem || product?.foto || PLACEHOLDER;

  return { ...product, name, slug, price, description, category, image };
}

function emptyProduct() {
  return {
    name: "",
    slug: "",
    price: "",
    category: "Cosméticos Naturais",
    description: "",
    image: "",
  };
}

function safeImg(event: any) {
  event.currentTarget.src = PLACEHOLDER;
}

export default function ExaleAdminFull() {
  const [products, setProducts] = useState<any[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [errorText, setErrorText] = useState("");

  function notify(type: "ok" | "error" | "info", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), type === "error" ? 9000 : 4500);
  }

  async function loadProducts() {
    setLoading(true);
    setErrorText("");

    try {
      const response = await fetch("/api/products?adminFull=" + Date.now(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Não foi possível carregar os produtos.");
      }

      const list = pickProducts(data).map(normalize).filter((item: any) => item.slug);
      setProducts(list);
      setSource(data?.source || "");
    } catch (error: any) {
      setProducts([]);
      setErrorText(String(error?.message || error || "Erro ao carregar produtos."));
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
      [product.name, product.slug, product.category, product.description]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, query]);

  function openNew() {
    setEditor(emptyProduct());
  }

  function openEdit(product: any) {
    const p = normalize(product);
    setEditor({
      ...p,
      image: p.image === PLACEHOLDER ? "" : p.image,
    });
  }

  function updateField(field: string, value: any) {
    setEditor((current: any) => {
      const next = { ...(current || emptyProduct()), [field]: value };
      if (field === "name" && !current?.slug) next.slug = slugify(value);
      return next;
    });
  }

  async function uploadImage(file: File) {
    if (!file || !editor) return;

    setSaving(true);

    try {
      notify("info", "Enviando imagem...");

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
        throw new Error(data?.message || "Não foi possível enviar a imagem.");
      }

      updateField("image", data.image || data.url || data.imagem);
      notify("ok", "Imagem enviada. Agora clique em Salvar e atualizar site.");
    } catch (error: any) {
      notify("error", String(error?.message || error || "Erro ao enviar imagem."));
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    if (!editor) return;

    const name = String(editor.name || "").trim();

    if (!name) {
      notify("error", "Informe o nome do produto.");
      return;
    }

    setSaving(true);

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
        line: editor.category,
        linha: editor.category,
        description: editor.description,
        descricao: editor.description,
        shortDescription: editor.description,
        resumo: editor.description,
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

      await fetch("/api/admin/sync-site?reason=admin-full-save&t=" + Date.now(), {
        method: "POST",
        cache: "no-store",
      }).catch(() => null);

      notify("ok", "Produto salvo e site atualizado.");
      setEditor(null);
      await loadProducts();
    } catch (error: any) {
      notify("error", String(error?.message || error || "Erro ao salvar produto."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <div>
            <h1>Painel Administrativo Exale</h1>
            <p>Edite produtos, imagens, preços, categorias e descrições sincronizadas com o site.</p>
          </div>

          <a href="/" target="_blank" rel="noreferrer">Ver loja</a>
        </header>

        <nav className="tabs">
          <button type="button">Resumo</button>
          <button type="button" className="active">Produtos</button>
          <button type="button" onClick={openNew}>Novo Produto</button>
          <button type="button">Loja e Logo</button>
          <button type="button">Banners</button>
          <button type="button">Linhas</button>
        </nav>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Produtos cadastrados</h2>
              <p>{loading ? "Carregando..." : `${products.length} produto(s) carregado(s) • ${source || "fonte"}`}</p>
            </div>

            <div className="tools">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto..." />
              <button type="button" onClick={loadProducts}>Atualizar</button>
              <button type="button" className="gold" onClick={openNew}>Novo produto</button>
            </div>
          </div>

          {errorText ? (
            <div className="error-box">
              <h3>Produtos não carregaram</h3>
              <p>{errorText}</p>
              <button type="button" onClick={loadProducts}>Tentar novamente</button>
            </div>
          ) : loading ? (
            <div className="status">Carregando produtos...</div>
          ) : filtered.length === 0 ? (
            <div className="status">Nenhum produto encontrado.</div>
          ) : (
            <div className="grid">
              {filtered.map((product) => (
                <article className="admin-product" key={product.slug}>
                  <img src={product.image || PLACEHOLDER} alt={product.name} onError={safeImg} />

                  <div>
                    <h3>{product.name}</h3>
                    <small>{product.slug}</small>
                    <strong>{money(product.price)}</strong>
                    <span>{product.category}</span>
                    <button type="button" onClick={() => openEdit(product)}>Editar</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {editor && (
        <section className="modal" onClick={() => !saving && setEditor(null)}>
          <div className="editor" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{editor.slug ? "Editar produto" : "Novo produto"}</h2>
                <p>Prévia profissional antes de salvar no site.</p>
              </div>

              <button type="button" className="close" onClick={() => !saving && setEditor(null)}>×</button>
            </header>

            <div className="preview">
              <img src={editor.image || PLACEHOLDER} alt={editor.name || "Produto"} onError={safeImg} />

              <div>
                <h3>{editor.name || "Nome do produto"}</h3>
                <strong>{money(editor.price)}</strong>
                <p>{editor.description || "Descrição para o cliente aparecerá aqui."}</p>
              </div>
            </div>

            <label>Nome do produto</label>
            <input value={editor.name || ""} onChange={(event) => updateField("name", event.target.value)} />

            <label>Link do produto</label>
            <input value={editor.slug || ""} onChange={(event) => updateField("slug", slugify(event.target.value))} />

            <label>Preço de venda</label>
            <input value={editor.price ?? ""} onChange={(event) => updateField("price", event.target.value)} />

            <label>Categoria / linha</label>
            <input value={editor.category || ""} onChange={(event) => updateField("category", event.target.value)} />

            <label>Imagem do produto</label>
            <div className="upload-box">
              <label className="upload-btn">
                Escolher imagem do produto
                <input
                  type="file"
                  accept="image/*"
                  disabled={saving}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <span>{editor.image ? "Imagem selecionada. Agora salve o produto." : "Nenhuma imagem escolhida."}</span>

              <details>
                <summary>Opção avançada</summary>
                <input value={editor.image || ""} onChange={(event) => updateField("image", event.target.value)} />
              </details>
            </div>

            <label>Descrição do produto</label>
            <textarea value={editor.description || ""} onChange={(event) => updateField("description", event.target.value)} />

            <footer>
              <button type="button" onClick={() => setEditor(null)} disabled={saving}>Cancelar</button>
              <button type="button" className="gold" onClick={saveProduct} disabled={saving}>
                {saving ? "Salvando..." : "Salvar e atualizar site"}
              </button>
            </footer>
          </div>
        </section>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

      <style jsx>{`
        .admin-page {
          --cream: #fff4dc;
          --paper: #fffaf1;
          --brown: #5b2d12;
          --brown2: #7a461f;
          --gold: #c4942b;
          --line: rgba(122,70,31,.16);
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          padding: 14px;
          background: linear-gradient(180deg, var(--cream), #fff9eb 44%, #f6e2bd);
          color: var(--brown);
        }

        .admin-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: clamp(18px, 4vw, 34px);
          border-radius: 28px;
          background: rgba(255,250,241,.90);
          border: 1px solid var(--line);
          box-shadow: 0 20px 56px rgba(91,45,18,.12);
        }

        .admin-header,
        .panel-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        h1 {
          margin: 0;
          color: var(--brown);
          font-size: clamp(38px, 7vw, 68px);
          line-height: .92;
          letter-spacing: -.065em;
        }

        h2 {
          margin: 0;
          color: var(--brown);
          font-size: clamp(30px, 5vw, 48px);
          line-height: 1;
          letter-spacing: -.05em;
        }

        p {
          color: var(--brown2);
          font-weight: 700;
        }

        .admin-header a,
        button {
          border: 0;
          border-radius: 999px;
          padding: 12px 16px;
          background: #fff0cc;
          color: var(--brown);
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
        }

        .admin-header a,
        button.gold,
        .tabs .active {
          background: linear-gradient(135deg, #2b1609, var(--gold));
          color: #fff;
        }

        .tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin: 20px 0;
        }

        .panel {
          padding: 18px;
          border-radius: 24px;
          background: var(--paper);
          border: 1px solid var(--line);
        }

        .tools {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 13px;
          background: #fff;
          color: var(--brown);
          outline: none;
          font-weight: 800;
        }

        .tools input {
          width: 240px;
        }

        .status,
        .error-box {
          padding: 18px;
          border-radius: 20px;
          background: #fff;
          color: var(--brown2);
          font-weight: 900;
          border: 1px solid var(--line);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .admin-product {
          display: grid;
          grid-template-columns: 92px 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 20px;
          background: #fff;
          border: 1px solid var(--line);
          box-shadow: 0 12px 28px rgba(91,45,18,.08);
        }

        .admin-product img {
          width: 92px;
          height: 92px;
          object-fit: cover;
          border-radius: 16px;
          background: #fff3d4;
        }

        .admin-product h3 {
          margin: 0;
          color: var(--brown);
          font-size: 17px;
        }

        .admin-product small,
        .admin-product span {
          display: block;
          margin-top: 4px;
          color: var(--brown2);
          font-size: 12px;
          font-weight: 800;
          word-break: break-word;
        }

        .admin-product strong {
          display: block;
          margin: 6px 0;
          color: var(--brown);
        }

        .modal {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: grid;
          place-items: center;
          padding: 14px;
          overflow: auto;
          background: rgba(43,22,9,.72);
        }

        .editor {
          width: min(760px, 100%);
          max-height: 94vh;
          overflow: auto;
          padding: 20px;
          border-radius: 26px;
          background: var(--paper);
          box-shadow: 0 26px 88px rgba(0,0,0,.38);
          border: 1px solid var(--line);
        }

        .editor header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .close {
          width: 42px;
          height: 42px;
          padding: 0;
          background: #2b1609;
          color: #fff;
          font-size: 24px;
        }

        .preview {
          display: grid;
          grid-template-columns: 116px 1fr;
          gap: 14px;
          align-items: center;
          padding: 14px;
          border-radius: 20px;
          background: #fff0cc;
          margin-bottom: 14px;
        }

        .preview img {
          width: 116px;
          height: 116px;
          object-fit: cover;
          border-radius: 18px;
          background: #fff3d4;
        }

        label {
          display: block;
          margin: 12px 0 6px;
          color: var(--brown);
          font-weight: 950;
        }

        textarea {
          min-height: 110px;
          resize: vertical;
        }

        .upload-box {
          padding: 12px;
          border-radius: 18px;
          background: #fff0cc;
          border: 1px solid var(--line);
        }

        .upload-btn {
          display: flex;
          justify-content: center;
          padding: 14px;
          margin: 0;
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, #2b1609, var(--gold));
          cursor: pointer;
        }

        .upload-btn input {
          display: none;
        }

        .upload-box span {
          display: block;
          margin-top: 10px;
          color: var(--brown2);
          font-size: 12px;
          font-weight: 900;
        }

        details {
          margin-top: 10px;
        }

        summary {
          cursor: pointer;
          color: var(--brown);
          font-weight: 950;
          font-size: 12px;
        }

        footer {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .toast {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000000;
          width: min(560px, calc(100vw - 24px));
          border-radius: 18px;
          padding: 14px 16px;
          text-align: center;
          font-weight: 950;
          box-shadow: 0 16px 44px rgba(0,0,0,.24);
        }

        .toast.ok {
          background: #dcfce7;
          color: #064e3b;
        }

        .toast.error {
          background: #fee2e2;
          color: #7f1d1d;
        }

        .toast.info {
          background: #dbeafe;
          color: #172554;
        }

        @media (max-width: 680px) {
          .admin-page {
            padding: 10px;
          }

          .admin-shell {
            padding: 16px;
            border-radius: 22px;
          }

          .tools,
          .tools input,
          .tools button {
            width: 100%;
          }

          .panel {
            padding: 12px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .preview {
            grid-template-columns: 90px 1fr;
          }

          .preview img {
            width: 90px;
            height: 90px;
          }

          footer button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
