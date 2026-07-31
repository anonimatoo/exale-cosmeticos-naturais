/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";

function isMobileDevice() {
  if (typeof window === "undefined") return false;

  const width = window.innerWidth || 1200;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

  return width <= 820 || coarse || mobileUA;
}

function looksLikeImageUrl(value: string) {
  const text = String(value || "").trim();

  if (!text) return false;

  return (
    text.includes(".jpg") ||
    text.includes(".jpeg") ||
    text.includes(".png") ||
    text.includes(".webp") ||
    text.includes(".gif") ||
    text.includes("images.unsplash.com") ||
    text.includes("raw.githubusercontent.com") ||
    text.startsWith("/uploads/")
  );
}

function firstImageUrl(value: string) {
  return String(value || "")
    .split(/\\n|\n|\r|\t|\s+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .find(looksLikeImageUrl) || "";
}

function installImagePreview() {
  const fields = Array.from(document.querySelectorAll("textarea, input")) as any[];

  for (const field of fields) {
    const value = String(field.value || "");
    const url = firstImageUrl(value);

    if (!url) continue;

    const parent = field.parentElement;
    if (!parent) continue;

    let preview = parent.querySelector("[data-exale-admin-image-preview='1']") as HTMLElement | null;

    if (!preview) {
      preview = document.createElement("div");
      preview.setAttribute("data-exale-admin-image-preview", "1");
      preview.innerHTML = `
        <div class="exale-preview-title">Prévia da imagem cadastrada</div>
        <img alt="Prévia da imagem do produto" />
      `;
      field.insertAdjacentElement("afterend", preview);
    }

    const img = preview.querySelector("img") as HTMLImageElement | null;

    if (img && img.src !== url) {
      img.src = url;
    }
  }
}

function installFieldHints() {
  const controls = Array.from(document.querySelectorAll("input, textarea, select")) as any[];

  for (const field of controls) {
    if (field.dataset.exaleUxReady === "1") continue;

    const placeholder = String(field.getAttribute("placeholder") || "").toLowerCase();
    const value = String(field.value || "").toLowerCase();

    let label = "";

    if (placeholder.includes("código") || placeholder.includes("sku")) label = "Código interno / SKU";
    if (placeholder.includes("texto curto")) label = "Texto curto para aparecer na vitrine";
    if (placeholder.includes("descrição") || placeholder.includes("descricao")) label = "Descrição completa do produto";
    if (placeholder.includes("49,90")) label = "Preço antigo / promoção";
    if (placeholder.includes("18,00")) label = "Preço de custo interno";
    if (looksLikeImageUrl(value)) label = "URL da imagem do produto";

    if (!label) continue;

    const hint = document.createElement("div");
    hint.setAttribute("data-exale-admin-field-hint", "1");
    hint.textContent = label;

    field.insertAdjacentElement("beforebegin", hint);
    field.dataset.exaleUxReady = "1";
  }
}

function installProductEditNotice() {
  const headings = Array.from(document.querySelectorAll("h1,h2,h3,div,strong")) as HTMLElement[];

  const editHeading = headings.find((el) =>
    String(el.textContent || "").trim().toLowerCase().includes("editar produto")
  );

  if (!editHeading) return;

  const parent = editHeading.parentElement || editHeading;
  if (parent.querySelector("[data-exale-edit-notice='1']")) return;

  const notice = document.createElement("div");
  notice.setAttribute("data-exale-edit-notice", "1");
  notice.innerHTML = `
    <strong>Modo edição ativo</strong>
    <span>Confira nome, preço, descrição e imagem antes de salvar. A integração com o site continua automática.</span>
  `;

  editHeading.insertAdjacentElement("afterend", notice);
}

function applyDeviceClass() {
  const mode = isMobileDevice() ? "mobile" : "desktop";

  document.documentElement.setAttribute("data-exale-admin-mode", mode);
  document.body.setAttribute("data-exale-admin-mode", mode);
  document.body.classList.add("exale-admin-safe-ux");
}

function runEnhancements() {
  applyDeviceClass();
  installFieldHints();
  installImagePreview();
  installProductEditNotice();
}

export default function AdminSafeUXUpgrade() {
  useEffect(() => {
    runEnhancements();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(runEnhancements);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    window.addEventListener("resize", runEnhancements);
    window.addEventListener("orientationchange", runEnhancements);
    window.addEventListener("input", installImagePreview, true);
    window.addEventListener("change", installImagePreview, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", runEnhancements);
      window.removeEventListener("orientationchange", runEnhancements);
      window.removeEventListener("input", installImagePreview, true);
      window.removeEventListener("change", installImagePreview, true);
    };
  }, []);

  return (
    <style jsx global>{`
      body.exale-admin-safe-ux {
        overflow-x: hidden;
      }

      body.exale-admin-safe-ux * {
        box-sizing: border-box;
      }

      body.exale-admin-safe-ux main,
      body.exale-admin-safe-ux section {
        scroll-margin-top: 18px;
      }

      body.exale-admin-safe-ux input,
      body.exale-admin-safe-ux textarea,
      body.exale-admin-safe-ux select {
        transition:
          border-color .18s ease,
          box-shadow .18s ease,
          background .18s ease,
          transform .18s ease;
      }

      body.exale-admin-safe-ux input:focus,
      body.exale-admin-safe-ux textarea:focus,
      body.exale-admin-safe-ux select:focus {
        outline: none !important;
        border-color: #c9951f !important;
        box-shadow: 0 0 0 4px rgba(201, 149, 31, .18) !important;
        background: #fffaf0 !important;
      }

      body.exale-admin-safe-ux button {
        transition:
          transform .18s ease,
          box-shadow .18s ease,
          filter .18s ease;
      }

      body.exale-admin-safe-ux button:active {
        transform: scale(.98);
      }

      body.exale-admin-safe-ux [data-exale-admin-field-hint="1"] {
        margin: 12px 0 6px;
        color: #653510;
        font-size: 13px;
        font-weight: 950;
        letter-spacing: -.01em;
      }

      body.exale-admin-safe-ux [data-exale-edit-notice="1"] {
        margin: 12px 0 18px;
        padding: 14px 16px;
        border-radius: 18px;
        background: linear-gradient(135deg, #fff7ed, #ffffff);
        border: 1px solid rgba(120,72,24,.14);
        box-shadow: 0 12px 30px rgba(120,72,24,.08);
        color: #653510;
        display: grid;
        gap: 4px;
      }

      body.exale-admin-safe-ux [data-exale-edit-notice="1"] strong {
        font-size: 16px;
        font-weight: 950;
      }

      body.exale-admin-safe-ux [data-exale-edit-notice="1"] span {
        font-size: 13px;
        font-weight: 800;
        line-height: 1.4;
        color: #7a4b22;
      }

      body.exale-admin-safe-ux [data-exale-admin-image-preview="1"] {
        margin: 10px 0 14px;
        padding: 12px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(255,247,237,.96), rgba(255,255,255,.96));
        border: 1px solid rgba(120,72,24,.14);
        box-shadow: 0 14px 34px rgba(120,72,24,.10);
      }

      body.exale-admin-safe-ux [data-exale-admin-image-preview="1"] .exale-preview-title {
        margin-bottom: 8px;
        color: #653510;
        font-size: 13px;
        font-weight: 950;
      }

      body.exale-admin-safe-ux [data-exale-admin-image-preview="1"] img {
        display: block;
        width: 100%;
        max-width: 260px;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 18px;
        border: 1px solid rgba(120,72,24,.14);
        background: #fff7ed;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] {
        background: #fff7e6;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] h1 {
        font-size: clamp(38px, 11vw, 66px) !important;
        line-height: .98 !important;
        letter-spacing: -.045em !important;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] h2,
      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] h3 {
        font-size: clamp(26px, 8vw, 42px) !important;
        line-height: 1.04 !important;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] input,
      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] textarea,
      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] select {
        font-size: 16px !important;
        min-height: 46px;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] textarea {
        min-height: 92px;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] button {
        min-height: 44px;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="mobile"] [data-exale-admin-image-preview="1"] img {
        max-width: 180px;
      }

      body.exale-admin-safe-ux[data-exale-admin-mode="desktop"] input,
      body.exale-admin-safe-ux[data-exale-admin-mode="desktop"] textarea,
      body.exale-admin-safe-ux[data-exale-admin-mode="desktop"] select {
        font-size: 15px !important;
      }

      @media (max-width: 520px) {
        body.exale-admin-safe-ux [data-exale-admin-image-preview="1"] {
          padding: 10px;
        }

        body.exale-admin-safe-ux [data-exale-edit-notice="1"] {
          padding: 12px;
        }
      }
    `}</style>
  );
}
