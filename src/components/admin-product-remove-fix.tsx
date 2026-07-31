/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __EXALE_REMOVE_FIX_INSTALLED__?: boolean;
    __EXALE_ORIGINAL_CONFIRM__?: typeof confirm;
  }
}

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

function isRemoveText(value: any) {
  const text = clean(String(value || "")).toLowerCase();

  return (
    text.includes("remover") ||
    text.includes("excluir") ||
    text.includes("apagar") ||
    text.includes("deletar") ||
    text.includes("remocao")
  );
}

function findButton(target: any) {
  return target?.closest?.("button, a, [role='button'], [onclick]");
}

function isRemoveButton(button: any) {
  if (!button) return false;
  if (button.closest?.("[data-exale-remove-ui='1']")) return false;

  return isRemoveText(button.textContent || button.getAttribute?.("aria-label") || button.getAttribute?.("title"));
}

function findCard(button: HTMLElement) {
  let node: HTMLElement | null = button;

  for (let i = 0; i < 8; i++) {
    node = node?.parentElement || null;

    if (!node) break;

    const text = String(node.textContent || "");
    const plain = clean(text).toLowerCase();

    if (
      plain.includes("editar") &&
      plain.includes("remover") &&
      text.length < 2600
    ) {
      return node;
    }
  }

  return button.parentElement;
}

function productFromButton(button: HTMLElement) {
  const card = findCard(button);

  const dataSlug =
    button.getAttribute("data-slug") ||
    button.getAttribute("data-product-slug") ||
    card?.getAttribute("data-slug") ||
    card?.getAttribute("data-product-slug") ||
    "";

  const dataName =
    button.getAttribute("data-name") ||
    button.getAttribute("data-product-name") ||
    card?.getAttribute("data-name") ||
    card?.getAttribute("data-product-name") ||
    "";

  const titleEl =
    card?.querySelector?.("[data-product-name], [data-produto-nome], h1, h2, h3, h4, strong, b") ||
    null;

  const text = String(card?.textContent || "");
  const lines = text
    .split(/\n| {2,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(editar|remover|excluir|apagar|deletar)$/i.test(clean(line)));

  const name = String(titleEl?.textContent || dataName || lines[0] || dataSlug || "Produto").trim();
  const slug = slugify(dataSlug || name);

  return { card, name, slug };
}

export default function AdminProductRemoveFix() {
  const [target, setTarget] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  function showToast(type: "ok" | "error" | "info", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), type === "error" ? 9000 : 5200);
  }

  function openForButton(button: HTMLElement | null) {
    if (!button) {
      showToast("error", "Nao consegui identificar o botao Remover.");
      return;
    }

    const info = productFromButton(button);

    if (!info.slug) {
      showToast("error", "Nao consegui identificar o produto.");
      return;
    }

    setTarget(info);
  }

  useEffect(() => {
    if (window.__EXALE_REMOVE_FIX_INSTALLED__) return;

    window.__EXALE_REMOVE_FIX_INSTALLED__ = true;
    window.__EXALE_ORIGINAL_CONFIRM__ = window.confirm.bind(window);

    let lastRemoveButton: HTMLElement | null = null;
    const originalConfirm = window.__EXALE_ORIGINAL_CONFIRM__;

    function capture(event: any) {
      const button = findButton(event.target);

      if (!isRemoveButton(button)) return;

      lastRemoveButton = button;

      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();

      openForButton(button);
    }

    window.confirm = function patchedConfirm(message?: string) {
      if (isRemoveText(message)) {
        openForButton(lastRemoveButton);
        return false;
      }

      return originalConfirm(message);
    };

    document.addEventListener("click", capture, true);
    document.addEventListener("pointerdown", capture, true);
    document.addEventListener("pointerup", capture, true);
    document.addEventListener("touchstart", capture, true);
    document.addEventListener("touchend", capture, true);

    return () => {
      document.removeEventListener("click", capture, true);
      document.removeEventListener("pointerdown", capture, true);
      document.removeEventListener("pointerup", capture, true);
      document.removeEventListener("touchstart", capture, true);
      document.removeEventListener("touchend", capture, true);
      window.confirm = originalConfirm;
      window.__EXALE_REMOVE_FIX_INSTALLED__ = false;
    };
  }, []);

  async function removeNow() {
    if (!target?.slug) {
      showToast("error", "Produto nao identificado.");
      setTarget(null);
      return;
    }

    setBusy(true);

    try {
      showToast("info", "Removendo produto...");

      const response = await fetch("/api/admin/remove-product", {
        method: "DELETE",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          slug: target.slug,
          name: target.name,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Nao foi possivel remover.");
      }

      try {
        target.card?.remove?.();
      } catch {}

      try {
        await fetch("/api/admin/sync-site?reason=remove-product&t=" + Date.now(), {
          method: "POST",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
      } catch {}

      setTarget(null);
      showToast("ok", "Produto removido e site atualizado.");

      try {
        window.dispatchEvent(new CustomEvent("exale-admin-product-removed", {
          detail: { slug: target.slug, name: target.name }
        }));
      } catch {}

      try {
        window.history.replaceState(null, "", "/painel-exale?v=produto-removido-" + Date.now());
      } catch {}
    } catch (error: any) {
      showToast("error", String(error?.message || error || "Erro ao remover produto."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {target && (
        <div
          data-exale-remove-ui="1"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            background: "rgba(15,23,42,.68)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
          onClick={() => !busy && setTarget(null)}
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
            <div style={{ fontSize: 24, fontWeight: 950, marginBottom: 10 }}>Remover produto?</div>

            <div style={{ fontSize: 14, fontWeight: 800, opacity: .85 }}>Produto selecionado:</div>

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
              Esta acao remove somente este produto e atualiza o site. Configuracoes da loja nao serao alteradas.
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setTarget(null)}
                style={{
                  flex: "1 1 140px",
                  border: 0,
                  borderRadius: 999,
                  padding: "13px 14px",
                  fontWeight: 950,
                  cursor: busy ? "wait" : "pointer",
                  background: "#e5e7eb",
                  color: "#111827",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={removeNow}
                style={{
                  flex: "1 1 180px",
                  border: 0,
                  borderRadius: 999,
                  padding: "13px 14px",
                  fontWeight: 950,
                  cursor: busy ? "wait" : "pointer",
                  background: busy ? "#9ca3af" : "#dc2626",
                  color: "#fff",
                  boxShadow: "0 12px 26px rgba(220,38,38,.28)",
                }}
              >
                {busy ? "Removendo..." : "Remover com seguranca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          data-exale-remove-ui="1"
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
    </>
  );
}
