/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";

function money(value: any) {
  const n = Number(String(value || "0").replace(/[R$\s.]/g, "").replace(",", ".")) || 0;

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isImageUrl(value: string) {
  const text = String(value || "").trim().toLowerCase();

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
    .find(isImageUrl) || "";
}

function findImageField() {
  const fields = Array.from(document.querySelectorAll("textarea, input")) as any[];

  return fields.find((field) => firstImageUrl(String(field.value || ""))) ||
    fields.find((field) => {
      const placeholder = String(field.getAttribute("placeholder") || "").toLowerCase();
      return placeholder.includes("imagem") || placeholder.includes("foto") || placeholder.includes("url");
    }) ||
    fields[fields.length - 1] ||
    null;
}

function findUploadButton() {
  const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];

  return buttons.find((button) => {
    const text = String(button.textContent || "").toLowerCase();

    return text.includes("enviar imagem") ||
      text.includes("imagem do produto") ||
      text.includes("upload") ||
      text.includes("foto");
  }) || null;
}

function formValues() {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select")) as any[];

  const values = inputs.map((field) => String(field.value || "").trim());

  const name = values.find((value) =>
    value &&
    !isImageUrl(value) &&
    !value.startsWith("http") &&
    value.length <= 80 &&
    !/^\d+([,.]\d+)?$/.test(value)
  ) || "Nome do produto";

  const priceRaw = values.find((value) => /^\d+([,.]\d{1,2})?$/.test(value)) || "0";

  const description = values.find((value) =>
    value &&
    !isImageUrl(value) &&
    value.length > 20
  ) || "Descricao do produto aparecera aqui.";

  const imageField = findImageField();
  const image = firstImageUrl(String(imageField?.value || "")) || "/exale-produto-sem-foto.svg";

  return {
    name,
    price: money(priceRaw),
    description,
    image,
  };
}

function ensureTopPreview() {
  const headings = Array.from(document.querySelectorAll("h1,h2,h3")) as HTMLElement[];
  const formTitle = headings.find((h) =>
    String(h.textContent || "").toLowerCase().includes("produto")
  );

  if (!formTitle) return;

  const parent = formTitle.parentElement || document.body;

  let preview = parent.querySelector("[data-exale-product-site-preview='1']") as HTMLElement | null;

  if (!preview) {
    preview = document.createElement("section");
    preview.setAttribute("data-exale-product-site-preview", "1");
    preview.innerHTML = `
      <div class="exale-preview-head">
        <div>
          <strong>Previa do produto no site</strong>
          <span>Veja como a imagem e as informacoes vao aparecer para o cliente.</span>
        </div>
        <button type="button" data-exale-select-product-image="1">Escolher imagem</button>
      </div>
      <div class="exale-preview-card">
        <img alt="Previa da imagem do produto" />
        <div>
          <b data-exale-preview-name>Nome do produto</b>
          <strong data-exale-preview-price>R$ 0,00</strong>
          <p data-exale-preview-description>Descricao do produto aparecera aqui.</p>
        </div>
      </div>
    `;

    formTitle.insertAdjacentElement("afterend", preview);
  }

  const values = formValues();

  const img = preview.querySelector("img") as HTMLImageElement | null;
  const name = preview.querySelector("[data-exale-preview-name]") as HTMLElement | null;
  const price = preview.querySelector("[data-exale-preview-price]") as HTMLElement | null;
  const description = preview.querySelector("[data-exale-preview-description]") as HTMLElement | null;
  const button = preview.querySelector("[data-exale-select-product-image]") as HTMLButtonElement | null;

  if (img) img.src = values.image;
  if (name) name.textContent = values.name;
  if (price) price.textContent = values.price;
  if (description) description.textContent = values.description;

  if (button && button.dataset.bound !== "1") {
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const upload = findUploadButton();

      if (upload) {
        upload.click();
        return;
      }

      const imageField = findImageField();

      if (imageField) {
        imageField.scrollIntoView({ behavior: "smooth", block: "center" });
        imageField.focus();
      }
    });
  }
}

function cleanTechnicalImageArea() {
  const imageField = findImageField();

  if (!imageField) return;

  imageField.setAttribute("placeholder", "Imagem do produto");

  const parent = imageField.parentElement;

  if (!parent) return;

  if (parent.querySelector("[data-exale-friendly-image-label='1']")) return;

  const label = document.createElement("div");
  label.setAttribute("data-exale-friendly-image-label", "1");
  label.innerHTML = `
    <strong>Imagem do produto</strong>
    <span>Use o botao acima para escolher a foto. A previa aparece no topo do painel.</span>
  `;

  imageField.insertAdjacentElement("beforebegin", label);
}

function relabelUploadButton() {
  const button = findUploadButton();

  if (!button) return;

  button.textContent = "Escolher imagem do produto";
  button.setAttribute("data-exale-image-main-button", "1");
}

function run() {
  ensureTopPreview();
  cleanTechnicalImageArea();
  relabelUploadButton();
}

export default function AdminProductImageProUI() {
  useEffect(() => {
    run();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(run);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("input", run, true);
    window.addEventListener("change", run, true);
    window.addEventListener("click", () => window.setTimeout(run, 250), true);

    return () => {
      observer.disconnect();
      window.removeEventListener("input", run, true);
      window.removeEventListener("change", run, true);
    };
  }, []);

  return (
    <style jsx global>{`
      [data-exale-product-site-preview="1"] {
        margin: 14px 0 22px;
        padding: 16px;
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(255,247,237,.96));
        border: 1px solid rgba(120,72,24,.14);
        box-shadow: 0 18px 44px rgba(120,72,24,.12);
      }

      [data-exale-product-site-preview="1"] .exale-preview-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }

      [data-exale-product-site-preview="1"] .exale-preview-head strong {
        display: block;
        font-size: 18px;
        font-weight: 950;
        color: #653510;
      }

      [data-exale-product-site-preview="1"] .exale-preview-head span {
        display: block;
        margin-top: 3px;
        font-size: 13px;
        font-weight: 800;
        color: #7a4b22;
      }

      [data-exale-select-product-image="1"],
      [data-exale-image-main-button="1"] {
        border: 0 !important;
        border-radius: 999px !important;
        padding: 12px 18px !important;
        background: linear-gradient(135deg, #3b210f, #c9951f) !important;
        color: #fff !important;
        font-weight: 950 !important;
        box-shadow: 0 12px 28px rgba(120,72,24,.22) !important;
        cursor: pointer !important;
      }

      [data-exale-product-site-preview="1"] .exale-preview-card {
        display: grid;
        grid-template-columns: 118px 1fr;
        gap: 14px;
        align-items: center;
        padding: 14px;
        border-radius: 22px;
        background: #fffaf0;
        border: 1px solid rgba(120,72,24,.12);
      }

      [data-exale-product-site-preview="1"] img {
        width: 118px;
        height: 118px;
        object-fit: cover;
        border-radius: 20px;
        background: #fff7ed;
        border: 1px solid rgba(120,72,24,.14);
      }

      [data-exale-product-site-preview="1"] b {
        display: block;
        color: #3b210f;
        font-size: 20px;
        font-weight: 950;
        line-height: 1.1;
      }

      [data-exale-product-site-preview="1"] strong[data-exale-preview-price] {
        display: block;
        margin-top: 6px;
        color: #653510;
        font-size: 19px;
        font-weight: 950;
      }

      [data-exale-product-site-preview="1"] p {
        margin: 8px 0 0;
        color: #7a4b22;
        font-size: 13px;
        line-height: 1.45;
        font-weight: 750;
      }

      [data-exale-friendly-image-label="1"] {
        margin: 12px 0 8px;
        padding: 12px 14px;
        border-radius: 18px;
        background: #fff7ed;
        border: 1px solid rgba(120,72,24,.12);
        color: #653510;
      }

      [data-exale-friendly-image-label="1"] strong {
        display: block;
        font-size: 14px;
        font-weight: 950;
      }

      [data-exale-friendly-image-label="1"] span {
        display: block;
        margin-top: 3px;
        font-size: 12px;
        font-weight: 800;
        color: #7a4b22;
      }

      @media (max-width: 620px) {
        [data-exale-product-site-preview="1"] {
          padding: 12px;
        }

        [data-exale-product-site-preview="1"] .exale-preview-card {
          grid-template-columns: 92px 1fr;
          padding: 12px;
        }

        [data-exale-product-site-preview="1"] img {
          width: 92px;
          height: 92px;
        }

        [data-exale-product-site-preview="1"] b {
          font-size: 17px;
        }
      }
    `}</style>
  );
}
