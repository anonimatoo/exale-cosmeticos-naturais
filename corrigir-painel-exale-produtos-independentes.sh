#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="/root/exale-cosmeticos-naturais"
PANEL="$PROJECT/src/app/painel-exale/page.tsx"
STORE_LIB="$PROJECT/src/lib/exale-store.ts"
CSS="$PROJECT/src/app/globals.css"
STORE_JSON="$PROJECT/content/store.json"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/exale-backups-fora-do-projeto/corrige-painel-produtos-$STAMP"

cd "$PROJECT" || exit 1

for arquivo in \
  "$PANEL" \
  "$STORE_LIB" \
  "$CSS" \
  "$STORE_JSON"
do
  test -f "$arquivo" || {
    echo "ERRO: arquivo não encontrado:"
    echo "$arquivo"
    exit 1
  }
done

mkdir -p \
  "$BACKUP/src/app/painel-exale" \
  "$BACKUP/src/app" \
  "$BACKUP/src/lib" \
  "$BACKUP/content"

cp -a "$PANEL" \
  "$BACKUP/src/app/painel-exale/page.tsx"

cp -a "$STORE_LIB" \
  "$BACKUP/src/lib/exale-store.ts"

cp -a "$CSS" \
  "$BACKUP/src/app/globals.css"

cp -a "$STORE_JSON" \
  "$BACKUP/content/store.json"

echo
echo "============================================================"
echo "BACKUP CRIADO"
echo "============================================================"
echo "$BACKUP"

python3 <<'PY'
from pathlib import Path
import json
import re
import unicodedata

project = Path("/root/exale-cosmeticos-naturais")
panel_path = project / "src/app/painel-exale/page.tsx"
store_path = project / "src/lib/exale-store.ts"
store_json_path = project / "content/store.json"

panel = panel_path.read_text(encoding="utf-8")
store_lib = store_path.read_text(encoding="utf-8")


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(
        char
        for char in value
        if unicodedata.category(char) != "Mn"
    )
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "produto"


# ============================================================
# 1. CORRIGIR IDs DOS PRODUTOS ATUAIS
# ============================================================

data = json.loads(
    store_json_path.read_text(encoding="utf-8")
)

products = data.get("products")

if not isinstance(products, list):
    products = []

used_ids = set()

for index, product in enumerate(products):
    if not isinstance(product, dict):
        continue

    base = str(
        product.get("id")
        or product.get("slug")
        or product.get("sku")
        or slugify(product.get("name") or product.get("title"))
        or f"produto-{index + 1}"
    ).strip()

    product_id = base
    suffix = 2

    while product_id in used_ids:
        product_id = f"{base}-{suffix}"
        suffix += 1

    used_ids.add(product_id)

    product["id"] = product_id

    if not product.get("slug"):
        product["slug"] = slugify(
            product.get("name")
            or product.get("title")
            or product_id
        )

    if "active" not in product or product.get("active") is None:
        product["active"] = True

    if "featured" not in product or product.get("featured") is None:
        product["featured"] = False

data["products"] = products

store_json_path.write_text(
    json.dumps(
        data,
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)

print(
    f"[OK] {len(products)} produto(s) receberam IDs únicos."
)


# ============================================================
# 2. ADICIONAR FUNÇÕES SEGURAS AO PAINEL
# ============================================================

anchor = '''const money = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
'''

replacement = '''const money = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const normalizeDecimalInput = (value: string): number | "" => {
  const clean = String(value || "")
    .replace(",", ".")
    .trim();

  if (clean === "") {
    return "";
  }

  const number = Number(clean);

  return Number.isFinite(number)
    ? number
    : "";
};

const displayNumberInput = (value: any): string | number => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return value;
};

const ensureUniqueIds = (
  items: AnyRecord[],
  prefix: string
): AnyRecord[] => {
  const used = new Set<string>();

  return items.map((item, index) => {
    const original =
      String(
        item?.id ||
        item?.slug ||
        item?.sku ||
        ""
      ).trim();

    const base =
      original ||
      `${prefix}-${index + 1}-${Date.now()}`;

    let nextId = base;
    let suffix = 2;

    while (used.has(nextId)) {
      nextId = `${base}-${suffix}`;
      suffix += 1;
    }

    used.add(nextId);

    return {
      ...item,
      id: nextId,
    };
  });
};
'''

if "const normalizeDecimalInput" not in panel:
    if anchor not in panel:
        raise SystemExit(
            "ERRO: ponto de inclusão das funções numéricas não encontrado."
        )

    panel = panel.replace(
        anchor,
        replacement,
        1
    )


# ============================================================
# 3. GARANTIR IDS ÚNICOS AO CARREGAR A API
# ============================================================

old_load = '''      products: data.products || [],
      promotions: data.promotions || [],
      reviews: data.reviews || [],
      categories: data.categories || [],
'''

new_load = '''      products: ensureUniqueIds(
        Array.isArray(data.products)
          ? data.products
          : [],
        "produto"
      ),
      promotions: ensureUniqueIds(
        Array.isArray(data.promotions)
          ? data.promotions
          : [],
        "promocao"
      ),
      reviews: ensureUniqueIds(
        Array.isArray(data.reviews)
          ? data.reviews
          : [],
        "avaliacao"
      ),
      categories: ensureUniqueIds(
        Array.isArray(data.categories)
          ? data.categories
          : [],
        "categoria"
      ),
'''

if old_load not in panel:
    raise SystemExit(
        "ERRO: carregamento das listas não encontrado."
    )

panel = panel.replace(
    old_load,
    new_load,
    1
)


# ============================================================
# 4. ATUALIZAÇÃO POR ID ÚNICO
# ============================================================

old_update = '''      [section]: current[section].map((item: AnyRecord) =>
        item.id === id ? { ...item, [key]: value } : item
      ),
'''

new_update = '''      [section]: current[section].map(
        (item: AnyRecord) =>
          String(item.id) === String(id)
            ? {
                ...item,
                [key]: value,
              }
            : item
      ),
'''

if old_update not in panel:
    raise SystemExit(
        "ERRO: função updateListItem não encontrada."
    )

panel = panel.replace(
    old_update,
    new_update,
    1
)


# ============================================================
# 5. NOVO PRODUTO ABRE DIRETAMENTE NO EDITOR
# ============================================================

old_add_product = '''  function addProduct() {
    const item = {
      id: uid("produto"),
      name: "Novo produto",
      category: "Cosméticos naturais",
      description: "Descrição do produto",
      price: 0,
      promotionalPrice: 0,
      stock: 0,
      featured: false,
      active: true,
      imageUrl: "",
    };
    setStore((current) => ({
      ...current,
      products: [item, ...current.products],
    }));
  }
'''

new_add_product = '''  function addProduct() {
    const item = {
      id: uid("produto"),
      slug: "",
      sku: "",
      name: "",
      category: "Cosméticos naturais",
      description: "",
      price: "",
      promotionalPrice: "",
      stock: "",
      featured: false,
      active: true,
      imageUrl: "",
    };

    setStore((current) => ({
      ...current,
      products: [
        item,
        ...current.products,
      ],
    }));

    setTab(`produto:${item.id}`);

    setStatus(
      "Novo produto criado. Preencha os dados e salve."
    );
  }
'''

if old_add_product not in panel:
    raise SystemExit(
        "ERRO: função addProduct não encontrada."
    )

panel = panel.replace(
    old_add_product,
    new_add_product,
    1
)


# ============================================================
# 6. CAMPO DE PREÇO DA TABELA
# ============================================================

old_price = '''                        <input
                          type="number"
                          value={product.price || 0}
                          onChange={(event) =>
                            updateListItem(
                              "products",
                              product.id,
                              "price",
                              Number(event.target.value)
                            )
                          }
                        />
'''

new_price = '''                        <input
                          type="text"
                          inputMode="decimal"
                          value={displayNumberInput(
                            product.price
                          )}
                          placeholder="0,00"
                          onChange={(event) =>
                            updateListItem(
                              "products",
                              product.id,
                              "price",
                              normalizeDecimalInput(
                                event.target.value
                              )
                            )
                          }
                        />
'''

if old_price not in panel:
    raise SystemExit(
        "ERRO: campo de preço da tabela não encontrado."
    )

panel = panel.replace(
    old_price,
    new_price,
    1
)


# ============================================================
# 7. CAMPO DE DESCONTO EDITÁVEL
# ============================================================

old_discount = '''                        <input
                          type="number"
                          value={discount}
                          onChange={(event) => {
                            const percentage = Number(event.target.value || 0);
                            const finalPrice =
                              Number(product.price || 0) *
                              (1 - percentage / 100);
                            updateListItem(
                              "products",
                              product.id,
                              "promotionalPrice",
                              Number(finalPrice.toFixed(2))
                            );
                          }}
                        />
'''

new_discount = '''                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            product.discountInput ??
                            (
                              discount > 0
                                ? discount
                                : ""
                            )
                          }
                          placeholder="0"
                          onChange={(event) => {
                            const raw =
                              event.target.value;

                            const parsed =
                              normalizeDecimalInput(raw);

                            const percentage =
                              parsed === ""
                                ? 0
                                : Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      Number(parsed)
                                    )
                                  );

                            const price =
                              Number(
                                product.price || 0
                              );

                            const finalPrice =
                              percentage > 0 &&
                              price > 0
                                ? Number(
                                    (
                                      price *
                                      (
                                        1 -
                                        percentage / 100
                                      )
                                    ).toFixed(2)
                                  )
                                : "";

                            setStore((current) => ({
                              ...current,
                              products:
                                current.products.map(
                                  (item) =>
                                    String(item.id) ===
                                    String(product.id)
                                      ? {
                                          ...item,
                                          discountInput:
                                            raw,
                                          promotionalPrice:
                                            finalPrice,
                                        }
                                      : item
                                ),
                            }));
                          }}
                          onBlur={() => {
                            setStore((current) => ({
                              ...current,
                              products:
                                current.products.map(
                                  (item) =>
                                    String(item.id) ===
                                    String(product.id)
                                      ? {
                                          ...item,
                                          discountInput:
                                            undefined,
                                        }
                                      : item
                                ),
                            }));
                          }}
                        />
'''

if old_discount not in panel:
    raise SystemExit(
        "ERRO: campo de desconto não encontrado."
    )

panel = panel.replace(
    old_discount,
    new_discount,
    1
)


# ============================================================
# 8. CAMPOS NUMÉRICOS DO EDITOR
# ============================================================

panel = panel.replace(
'''                      type="number"
                      value={product.price || 0}
                      onChange={(value) =>
                        updateListItem("products", product.id, "price", Number(value))
                      }
''',
'''                      type="text"
                      inputMode="decimal"
                      value={displayNumberInput(product.price)}
                      onChange={(value) =>
                        updateListItem(
                          "products",
                          product.id,
                          "price",
                          normalizeDecimalInput(value)
                        )
                      }
''',
1
)

panel = panel.replace(
'''                      type="number"
                      value={product.promotionalPrice || 0}
                      onChange={(value) =>
                        updateListItem(
                          "products",
                          product.id,
                          "promotionalPrice",
                          Number(value)
                        )
                      }
''',
'''                      type="text"
                      inputMode="decimal"
                      value={displayNumberInput(
                        product.promotionalPrice
                      )}
                      onChange={(value) =>
                        updateListItem(
                          "products",
                          product.id,
                          "promotionalPrice",
                          normalizeDecimalInput(value)
                        )
                      }
''',
1
)

panel = panel.replace(
'''                      type="number"
                      value={product.stock || 0}
                      onChange={(value) =>
                        updateListItem("products", product.id, "stock", Number(value))
                      }
''',
'''                      type="text"
                      inputMode="numeric"
                      value={displayNumberInput(product.stock)}
                      onChange={(value) =>
                        updateListItem(
                          "products",
                          product.id,
                          "stock",
                          normalizeDecimalInput(value)
                        )
                      }
''',
1
)


# ============================================================
# 9. FIELD ACEITA INPUTMODE
# ============================================================

old_field_signature = '''  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  textarea?: boolean;
  type?: string;
}) {
'''

new_field_signature = '''  type = "text",
  inputMode,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  textarea?: boolean;
  type?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
}) {
'''

if old_field_signature not in panel:
    raise SystemExit(
        "ERRO: assinatura do componente Field não encontrada."
    )

panel = panel.replace(
    old_field_signature,
    new_field_signature,
    1
)

panel = panel.replace(
'''        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
''',
'''        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
''',
1
)


# ============================================================
# 10. BOTÕES DE EDITOR: VOLTAR E SALVAR
# ============================================================

old_editor_end = '''                    <ImageEditor
                      label="Imagem do produto"
                      value={product.imageUrl || ""}
                      onChange={(value) =>
                        updateListItem("products", product.id, "imageUrl", value)
                      }
                      uploadImage={uploadImage}
                    />
                  </div>
                </Panel>
'''

new_editor_end = '''                    <ImageEditor
                      label="Imagem do produto"
                      value={product.imageUrl || ""}
                      onChange={(value) =>
                        updateListItem(
                          "products",
                          product.id,
                          "imageUrl",
                          value
                        )
                      }
                      uploadImage={uploadImage}
                    />
                  </div>

                  <div className="product-editor-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setTab("produtos")
                      }
                    >
                      Voltar aos produtos
                    </button>

                    <button
                      type="button"
                      className="gold"
                      disabled={saving}
                      onClick={async () => {
                        const saved =
                          await saveStore(
                            false,
                            store
                          );

                        if (saved) {
                          setTab("produtos");
                        }
                      }}
                    >
                      {saving
                        ? "Salvando..."
                        : "Salvar produto"}
                    </button>
                  </div>
                </Panel>
'''

if old_editor_end not in panel:
    raise SystemExit(
        "ERRO: final do editor de produto não encontrado."
    )

panel = panel.replace(
    old_editor_end,
    new_editor_end,
    1
)


# ============================================================
# 11. REMOVER ATRIBUTOS DUPLICADOS
# ============================================================

panel = panel.replace(
    'type="button" className="menu-icon" type="button"',
    'type="button" className="menu-icon"'
)

panel = panel.replace(
    'type="button" className="add-wide" type="button"',
    'type="button" className="add-wide"'
)


# ============================================================
# 12. NORMALIZAÇÃO NO SERVIDOR
# ============================================================

old_products = '''    products: Array.isArray(
      input?.products
    )
      ? input.products
      : [],
'''

new_products = '''    products: Array.isArray(
      input?.products
    )
      ? input.products.map(
          (product: Record<string, any>, index: number) => {
            const id = String(
              product?.id ||
              product?.slug ||
              product?.sku ||
              `produto-${index + 1}`
            );

            const price =
              product?.price === ""
                ? 0
                : Number(product?.price || 0);

            const promotionalPrice =
              product?.promotionalPrice === "" ||
              product?.promotionalPrice === null ||
              product?.promotionalPrice === undefined
                ? null
                : Number(
                    product.promotionalPrice
                  );

            const stock =
              product?.stock === ""
                ? 0
                : Number(product?.stock || 0);

            return {
              ...product,
              id,
              price:
                Number.isFinite(price)
                  ? price
                  : 0,
              promotionalPrice:
                promotionalPrice === null ||
                Number.isFinite(
                  promotionalPrice
                )
                  ? promotionalPrice
                  : null,
              stock:
                Number.isFinite(stock)
                  ? stock
                  : 0,
              active:
                product?.active !== false,
              featured:
                Boolean(product?.featured),
            };
          }
        )
      : [],
'''

if old_products not in store_lib:
    raise SystemExit(
        "ERRO: normalização de produtos no servidor não encontrada."
    )

store_lib = store_lib.replace(
    old_products,
    new_products,
    1
)

panel_path.write_text(
    panel,
    encoding="utf-8"
)

store_path.write_text(
    store_lib,
    encoding="utf-8"
)

print("[OK] Código do painel corrigido.")
PY

cat >> "$CSS" <<'CSS'

/* =========================================================
   EXALE — PRODUTOS INDEPENDENTES E EDITOR MOBILE
   ========================================================= */

.product-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.product-editor-actions button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid #d9aa35;
  border-radius: 8px;
  color: #ffe59a;
  background: transparent;
  font-weight: 800;
}

.product-editor-actions .gold {
  color: #1a1004;
  background:
    linear-gradient(
      135deg,
      #ffe59a,
      #b57d16
    );
}

.product-row input:focus {
  border-color: #f3c95e;
  box-shadow:
    0 0 0 2px
    rgba(243, 201, 94, 0.15);
}

.icon-toggle,
.switch,
.row-actions button {
  touch-action: manipulation;
  user-select: none;
}

@media (max-width: 820px) {
  .dashboard-grid {
    width: 100%;
    min-width: 0;
  }

  .table-toolbar {
    display: grid;
    grid-template-columns: 1fr;
  }

  .table-toolbar input,
  .table-toolbar button {
    width: 100%;
    min-height: 48px;
    font-size: 16px;
  }

  .product-table {
    width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }

  .product-row {
    min-width: 790px;
  }

  .product-row input {
    min-height: 44px;
    font-size: 16px;
  }

  .icon-toggle,
  .switch,
  .row-actions button {
    min-width: 42px;
    min-height: 42px;
  }

  .product-editor-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .product-editor-actions button {
    width: 100%;
    min-height: 50px;
  }
}
CSS

echo
echo "============================================================"
echo "VALIDANDO IDS"
echo "============================================================"

python3 <<'PY'
import json
from pathlib import Path

arquivo = Path(
    "/root/exale-cosmeticos-naturais/content/store.json"
)

dados = json.loads(
    arquivo.read_text(encoding="utf-8")
)

produtos = dados.get("products") or []
ids = [produto.get("id") for produto in produtos]

print("Produtos:", len(produtos))
print("IDs:", ids)

if any(not item for item in ids):
    raise SystemExit(
        "ERRO: ainda existe produto sem ID."
    )

if len(ids) != len(set(ids)):
    raise SystemExit(
        "ERRO: ainda existem IDs duplicados."
    )

print("[OK] Todos os IDs são únicos.")
PY

echo
echo "============================================================"
echo "BUILD DE SEGURANÇA"
echo "============================================================"

export USER="${USER:-$(whoami)}"
export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

nvm use 20 || exit 1

rm -rf \
  .next \
  .turbo \
  node_modules/.cache \
  .vercel/output \
  2>/dev/null || true

if ! npm run build; then
  echo
  echo "============================================================"
  echo "BUILD FALHOU — RESTAURANDO BACKUP"
  echo "============================================================"

  cp -a \
    "$BACKUP/src/app/painel-exale/page.tsx" \
    "$PANEL"

  cp -a \
    "$BACKUP/src/lib/exale-store.ts" \
    "$STORE_LIB"

  cp -a \
    "$BACKUP/src/app/globals.css" \
    "$CSS"

  cp -a \
    "$BACKUP/content/store.json" \
    "$STORE_JSON"

  rm -rf .next .turbo 2>/dev/null || true

  echo "Arquivos anteriores restaurados."
  exit 1
fi

echo
echo "============================================================"
echo "COMMIT"
echo "============================================================"

git add \
  src/app/painel-exale/page.tsx \
  src/lib/exale-store.ts \
  src/app/globals.css \
  content/store.json

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova para commit."
else
  git commit -m \
    "corrige produtos independentes e campos numericos do painel"
fi

echo
echo "============================================================"
echo "CORREÇÃO CONCLUÍDA"
echo "============================================================"
echo
echo "Backup:"
echo "$BACKUP"
echo
echo "Agora execute:"
echo "git pull --rebase origin main"
echo "git push origin main"
echo "vercel --prod --force"
