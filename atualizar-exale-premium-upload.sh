#!/usr/bin/env bash
set -Ee -o pipefail

PROJECT="$HOME/exale-cosmeticos-naturais"
cd "$PROJECT" || { echo "ERRO: projeto não encontrado."; exit 1; }

export USER="${USER:-$(whoami)}"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/exale-backups-fora-do-projeto/exale-premium-upload-$STAMP"
mkdir -p "$BACKUP"

echo "============================================================"
echo " EXALE - PERSONALIZAÇÃO PREMIUM + UPLOAD DE IMAGENS"
echo "============================================================"

cp -a src content public package.json package-lock.json next.config.ts tsconfig.json "$BACKUP/" 2>/dev/null || true
git branch "backup-exale-premium-upload-$STAMP" 2>/dev/null || true

mkdir -p src/app/api/admin/upload src/app/api/store src/app/api/admin/save src/app/api/admin/login src/components src/lib public/uploads content

python3 <<'PY'
from pathlib import Path
import json

file = Path("content/store.json")
if file.exists():
    data = json.loads(file.read_text(encoding="utf-8"))
else:
    data = {"settings": {}, "products": [], "promotions": [], "reviews": []}

settings = data.setdefault("settings", {})
settings["storeName"] = "Patrícia Santana"
settings["brandName"] = "EXALE"
settings["slogan"] = "Cosméticos naturais que transformam cuidado em beleza, equilíbrio e bem-estar."
settings["heroTitle"] = settings.get("heroTitle") or "Natureza, beleza e sofisticação em cada detalhe."
settings["heroSubtitle"] = settings.get("heroSubtitle") or "Uma experiência exclusiva em cosméticos naturais, autocuidado e presentes especiais."
settings["logoUrl"] = settings.get("logoUrl", "")
settings["heroImageUrl"] = settings.get("heroImageUrl", "")
settings["whatsapp"] = settings.get("whatsapp", "5513991616048")
settings["instagram"] = settings.get("instagram", "@exale.cosmeticosnaturais")
settings["tiktok"] = settings.get("tiktok", "")
settings["cnpj"] = "24.604.430/0001-80"
settings["primaryColor"] = "#160c07"
settings["accentColor"] = "#d4af37"
settings["footerText"] = "Patrícia Santana • EXALE — cosméticos naturais, cuidado e sofisticação."

data.setdefault("products", [])
data.setdefault("promotions", [])
data.setdefault("reviews", [])

if not data["reviews"]:
    data["reviews"] = [
        {
            "id": "demo-1",
            "name": "Avaliação demonstrativa",
            "photoUrl": "",
            "comment": "Espaço preparado para uma avaliação verdadeira cadastrada pelo painel.",
            "rating": 5,
            "active": True,
            "demo": True
        },
        {
            "id": "demo-2",
            "name": "Avaliação demonstrativa",
            "photoUrl": "",
            "comment": "Adicione uma foto e um comentário real autorizado pelo cliente.",
            "rating": 5,
            "active": True,
            "demo": True
        }
    ]

file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("[OK] content/store.json atualizado sem apagar cadastros existentes.")
PY

cat > src/lib/exale-store.ts <<'EOF'
import fs from "node:fs/promises";
import path from "node:path";

export type StoreData = {
  settings: Record<string, any>;
  products: Array<Record<string, any>>;
  promotions: Array<Record<string, any>>;
  reviews: Array<Record<string, any>>;
};

const localFile = path.join(process.cwd(), "content", "store.json");

function githubConfig() {
  const [owner, repo] = String(process.env.GITHUB_REPO || "").split("/");
  return {
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    token: process.env.GITHUB_TOKEN || ""
  };
}

export function normalizeStore(input: any): StoreData {
  const settings = input?.settings || {};

  return {
    settings: {
      storeName: String(settings.storeName || "Patrícia Santana"),
      brandName: String(settings.brandName || "EXALE"),
      slogan: String(settings.slogan || "Cosméticos naturais que transformam cuidado em beleza, equilíbrio e bem-estar."),
      heroTitle: String(settings.heroTitle || "Natureza, beleza e sofisticação em cada detalhe."),
      heroSubtitle: String(settings.heroSubtitle || "Uma experiência exclusiva em cosméticos naturais, autocuidado e presentes especiais."),
      logoUrl: String(settings.logoUrl || ""),
      heroImageUrl: String(settings.heroImageUrl || ""),
      whatsapp: String(settings.whatsapp || "").replace(/\D/g, ""),
      instagram: String(settings.instagram || ""),
      tiktok: String(settings.tiktok || ""),
      cnpj: String(settings.cnpj || "24.604.430/0001-80"),
      primaryColor: String(settings.primaryColor || "#160c07"),
      accentColor: String(settings.accentColor || "#d4af37"),
      footerText: String(settings.footerText || "Patrícia Santana • EXALE — cosméticos naturais, cuidado e sofisticação.")
    },
    products: Array.isArray(input?.products) ? input.products : [],
    promotions: Array.isArray(input?.promotions) ? input.promotions : [],
    reviews: Array.isArray(input?.reviews) ? input.reviews : []
  };
}

export async function readStore(): Promise<StoreData> {
  const { owner, repo, branch, token } = githubConfig();

  if (owner && repo) {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/content/store.json?t=${Date.now()}`,
      {
        cache: "no-store",
        headers: token
          ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
          : undefined
      }
    );

    if (response.ok) return normalizeStore(await response.json());
  }

  return normalizeStore(JSON.parse(await fs.readFile(localFile, "utf8")));
}

async function putGithubFile(filePath: string, contentBase64: string, message: string) {
  const { owner, repo, branch, token } = githubConfig();

  if (!owner || !repo || !token) {
    throw new Error("Configure GITHUB_REPO, GITHUB_BRANCH e GITHUB_TOKEN na Vercel.");
  }

  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const current = await fetch(`${api}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  let sha = "";
  if (current.ok) sha = String((await current.json())?.sha || "");

  const response = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if (!response.ok) {
    throw new Error(`Falha no GitHub: HTTP ${response.status} ${await response.text()}`);
  }
}

export async function writeStore(input: StoreData): Promise<void> {
  const data = normalizeStore(input);
  const { owner, repo, token } = githubConfig();

  if (!owner || !repo || !token) {
    await fs.writeFile(localFile, JSON.stringify(data, null, 2) + "\n", "utf8");
    return;
  }

  await putGithubFile(
    "content/store.json",
    Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64"),
    `Atualização pelo painel EXALE ${new Date().toISOString()}`
  );
}

export async function uploadImage(filename: string, bytes: Uint8Array): Promise<string> {
  const { owner, repo, branch, token } = githubConfig();

  if (!owner || !repo || !token) {
    const localPath = path.join(process.cwd(), "public", "uploads", filename);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, bytes);
    return `/uploads/${filename}`;
  }

  const filePath = `public/uploads/${filename}`;

  await putGithubFile(
    filePath,
    Buffer.from(bytes).toString("base64"),
    `Upload de imagem pelo painel EXALE: ${filename}`
  );

  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}
EOF

cat > src/app/api/store/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { readStore } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const store = await readStore();
    return NextResponse.json(
      { ok: true, ...store, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Erro ao carregar a loja." },
      { status: 500 }
    );
  }
}
EOF

cat > src/app/api/admin/login/route.ts <<'EOF'
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const expected = process.env.ADMIN_PASSWORD || "exale-admin-2026";

  if (password !== expected) {
    return NextResponse.json({ ok: false, message: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
EOF

cat > src/app/api/admin/save/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { writeStore } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const password = request.headers.get("x-admin-password") || "";
    const expected = process.env.ADMIN_PASSWORD || "exale-admin-2026";

    if (password !== expected) {
      return NextResponse.json({ ok: false, message: "Acesso negado." }, { status: 401 });
    }

    await writeStore(await request.json());

    return NextResponse.json({
      ok: true,
      message: "Salvo e sincronizado com o site.",
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Erro ao salvar." },
      { status: 500 }
    );
  }
}
EOF

cat > src/app/api/admin/upload/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const extension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

export async function POST(request: Request) {
  try {
    const password = request.headers.get("x-admin-password") || "";
    const expected = process.env.ADMIN_PASSWORD || "exale-admin-2026";

    if (password !== expected) {
      return NextResponse.json({ ok: false, message: "Acesso negado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Selecione uma imagem." }, { status: 400 });
    }

    if (!allowed.has(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Use JPG, PNG, WEBP ou GIF." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, message: "A imagem deve ter no máximo 8 MB." },
        { status: 400 }
      );
    }

    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45) || "imagem";

    const filename = `${Date.now()}-${safeName}.${extension[file.type] || "jpg"}`;
    const url = await uploadImage(filename, new Uint8Array(await file.arrayBuffer()));

    return NextResponse.json({ ok: true, url, filename });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Erro ao enviar imagem." },
      { status: 500 }
    );
  }
}
EOF

cat > src/components/exale-admin.tsx <<'EOF'
"use client";

import { useEffect, useState } from "react";

const uid = () => crypto.randomUUID();
const newProduct = () => ({ id: uid(), name: "", description: "", category: "Cosméticos naturais", imageUrl: "", price: 0, promotionalPrice: 0, stock: 1, featured: false, active: true });
const newPromotion = () => ({ id: uid(), title: "", description: "", imageUrl: "", badge: "PROMOÇÃO", startDate: "", endDate: "", active: true });
const newReview = () => ({ id: uid(), name: "", photoUrl: "", comment: "", rating: 5, active: true, demo: false });

export default function ExaleAdmin() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [tab, setTab] = useState("products");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");

  async function load() {
    const response = await fetch(`/api/store?t=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao carregar.");
    setStore({ settings: data.settings, products: data.products, promotions: data.promotions, reviews: data.reviews });
  }

  useEffect(() => {
    if (sessionStorage.getItem("exale-auth") === "1") {
      setLogged(true);
      setPassword(sessionStorage.getItem("exale-password") || "");
      load().catch(error => setMessage(error.message));
    }
  }, []);

  async function login() {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) return setMessage(data.message || "Senha incorreta.");
    sessionStorage.setItem("exale-auth", "1");
    sessionStorage.setItem("exale-password", password);
    setLogged(true);
    await load();
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(store)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao salvar.");
      setMessage("Alterações salvas e sincronizadas com o site.");
      await load();
    } catch (error: any) {
      setMessage(error.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File, key: string) {
    setUploading(key);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-password": password },
        body
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Erro no upload.");
      setMessage("Imagem enviada. Clique em Salvar e sincronizar.");
      return String(data.url || "");
    } catch (error: any) {
      setMessage(error.message || "Erro no upload.");
      return "";
    } finally {
      setUploading("");
    }
  }

  const setSetting = (key: string, value: any) =>
    setStore((current: any) => ({ ...current, settings: { ...current.settings, [key]: value } }));

  const setItem = (list: string, index: number, key: string, value: any) =>
    setStore((current: any) => ({
      ...current,
      [list]: current[list].map((item: any, itemIndex: number) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));

  const remove = (list: string, index: number) => {
    if (!confirm("Excluir este item?")) return;
    setStore((current: any) => ({
      ...current,
      [list]: current[list].filter((_: any, itemIndex: number) => itemIndex !== index)
    }));
  };

  if (!logged) {
    return (
      <main className="login">
        <section>
          <div className="login-logo">PS</div>
          <span>PATRÍCIA SANTANA • EXALE</span>
          <h1>Painel administrativo</h1>
          <p>Produtos, promoções, destaques, avaliações, logotipo e imagens do aparelho.</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Senha administrativa" />
          <button onClick={login}>Entrar com segurança</button>
          {message && <small>{message}</small>}
        </section>
        <Css />
      </main>
    );
  }

  if (!store) return <main className="loading">Carregando painel EXALE...</main>;

  const title = tab === "products" ? "Produtos" : tab === "promotions" ? "Promoções" : tab === "reviews" ? "Avaliações" : "Configurações";

  return (
    <main className="admin">
      <aside>
        <div className="brand"><b>PS</b><div><strong>Patrícia Santana</strong><span>EXALE</span><small>Painel sincronizado</small></div></div>
        {[["products","Produtos"],["promotions","Promoções"],["reviews","Avaliações"],["settings","Configurações"]].map(([id,label]) =>
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        )}
        <a href="/" target="_blank">Abrir site</a>
      </aside>

      <section className="content">
        <header>
          <div><span>ADMINISTRAÇÃO EXALE</span><h1>{title}</h1></div>
          <button className="save" disabled={saving || Boolean(uploading)} onClick={save}>{saving ? "Salvando..." : "Salvar e sincronizar"}</button>
        </header>

        {message && <div className="message">{message}</div>}

        {tab === "products" && <>
          <div className="toolbar"><button onClick={() => setStore((s:any) => ({...s, products:[...s.products,newProduct()]}))}>+ Novo produto</button></div>
          <div className="list">{store.products.map((p:any,i:number) =>
            <Card key={p.id} title={p.name || "Novo produto"} onDelete={() => remove("products",i)}>
              <Field label="Nome do produto" value={p.name} onChange={(v:string)=>setItem("products",i,"name",v)} />
              <Field label="Categoria" value={p.category} onChange={(v:string)=>setItem("products",i,"category",v)} />
              <Upload label="Imagem do produto" value={p.imageUrl} busy={uploading === `product-${i}`} onFile={async(f:File)=>{const url=await upload(f,`product-${i}`);if(url)setItem("products",i,"imageUrl",url)}} onRemove={()=>setItem("products",i,"imageUrl","")} />
              <Field label="Descrição" value={p.description} textarea full onChange={(v:string)=>setItem("products",i,"description",v)} />
              <Field label="Preço normal" type="number" value={p.price} onChange={(v:string)=>setItem("products",i,"price",Number(v))} />
              <Field label="Preço promocional" type="number" value={p.promotionalPrice} onChange={(v:string)=>setItem("products",i,"promotionalPrice",Number(v))} />
              <Field label="Estoque" type="number" value={p.stock} onChange={(v:string)=>setItem("products",i,"stock",Number(v))} />
              <Check label="Destacar produto" checked={Boolean(p.featured)} onChange={(v:boolean)=>setItem("products",i,"featured",v)} />
              <Check label="Produto ativo" checked={p.active !== false} onChange={(v:boolean)=>setItem("products",i,"active",v)} />
            </Card>
          )}</div>
        </>}

        {tab === "promotions" && <>
          <div className="toolbar"><button onClick={() => setStore((s:any) => ({...s, promotions:[...s.promotions,newPromotion()]}))}>+ Criar promoção</button></div>
          <div className="list">{store.promotions.map((p:any,i:number) =>
            <Card key={p.id} title={p.title || "Nova promoção"} onDelete={() => remove("promotions",i)}>
              <Field label="Título" value={p.title} onChange={(v:string)=>setItem("promotions",i,"title",v)} />
              <Field label="Selo" value={p.badge} onChange={(v:string)=>setItem("promotions",i,"badge",v)} />
              <Upload label="Imagem da promoção" value={p.imageUrl} busy={uploading === `promotion-${i}`} onFile={async(f:File)=>{const url=await upload(f,`promotion-${i}`);if(url)setItem("promotions",i,"imageUrl",url)}} onRemove={()=>setItem("promotions",i,"imageUrl","")} />
              <Field label="Descrição" value={p.description} textarea full onChange={(v:string)=>setItem("promotions",i,"description",v)} />
              <Field label="Início" type="datetime-local" value={p.startDate} onChange={(v:string)=>setItem("promotions",i,"startDate",v)} />
              <Field label="Fim" type="datetime-local" value={p.endDate} onChange={(v:string)=>setItem("promotions",i,"endDate",v)} />
              <Check label="Promoção ativa" checked={p.active !== false} onChange={(v:boolean)=>setItem("promotions",i,"active",v)} />
            </Card>
          )}</div>
        </>}

        {tab === "reviews" && <>
          <div className="toolbar"><button onClick={() => setStore((s:any) => ({...s, reviews:[...s.reviews,newReview()]}))}>+ Nova avaliação</button></div>
          <div className="list">{store.reviews.map((r:any,i:number) =>
            <Card key={r.id} title={r.name || "Nova avaliação"} onDelete={() => remove("reviews",i)}>
              <Field label="Nome do cliente" value={r.name} onChange={(v:string)=>setItem("reviews",i,"name",v)} />
              <Field label="Nota de 1 a 5" type="number" value={r.rating} onChange={(v:string)=>setItem("reviews",i,"rating",Math.max(1,Math.min(5,Number(v))))} />
              <Upload label="Foto do cliente" value={r.photoUrl} busy={uploading === `review-${i}`} onFile={async(f:File)=>{const url=await upload(f,`review-${i}`);if(url){setItem("reviews",i,"photoUrl",url);setItem("reviews",i,"demo",false)}}} onRemove={()=>setItem("reviews",i,"photoUrl","")} />
              <Field label="Comentário" value={r.comment} textarea full onChange={(v:string)=>setItem("reviews",i,"comment",v)} />
              <Check label="Avaliação ativa" checked={r.active !== false} onChange={(v:boolean)=>setItem("reviews",i,"active",v)} />
            </Card>
          )}</div>
        </>}

        {tab === "settings" &&
          <Card title="Identidade da loja">
            <Field label="Nome principal" value={store.settings.storeName} onChange={(v:string)=>setSetting("storeName",v)} />
            <Field label="Nome da marca" value={store.settings.brandName} onChange={(v:string)=>setSetting("brandName",v)} />
            <Field label="Frase da marca" value={store.settings.slogan} textarea full onChange={(v:string)=>setSetting("slogan",v)} />
            <Upload label="Logotipo" value={store.settings.logoUrl} busy={uploading === "logo"} onFile={async(f:File)=>{const url=await upload(f,"logo");if(url)setSetting("logoUrl",url)}} onRemove={()=>setSetting("logoUrl","")} />
            <Upload label="Imagem principal do banner" value={store.settings.heroImageUrl} busy={uploading === "hero"} onFile={async(f:File)=>{const url=await upload(f,"hero");if(url)setSetting("heroImageUrl",url)}} onRemove={()=>setSetting("heroImageUrl","")} />
            <Field label="Título principal" value={store.settings.heroTitle} full onChange={(v:string)=>setSetting("heroTitle",v)} />
            <Field label="Texto principal" value={store.settings.heroSubtitle} textarea full onChange={(v:string)=>setSetting("heroSubtitle",v)} />
            <Field label="WhatsApp com DDI" value={store.settings.whatsapp} onChange={(v:string)=>setSetting("whatsapp",v.replace(/\D/g,""))} />
            <Field label="Instagram" value={store.settings.instagram} onChange={(v:string)=>setSetting("instagram",v)} />
            <Field label="TikTok" value={store.settings.tiktok} onChange={(v:string)=>setSetting("tiktok",v)} />
            <Field label="CNPJ" value={store.settings.cnpj} onChange={(v:string)=>setSetting("cnpj",v)} />
            <Field label="Cor principal" type="color" value={store.settings.primaryColor} onChange={(v:string)=>setSetting("primaryColor",v)} />
            <Field label="Dourado de destaque" type="color" value={store.settings.accentColor} onChange={(v:string)=>setSetting("accentColor",v)} />
            <Field label="Texto do rodapé" value={store.settings.footerText} textarea full onChange={(v:string)=>setSetting("footerText",v)} />
          </Card>
        }
      </section>
      <Css />
    </main>
  );
}

function Card({title,onDelete,children}:any){
  return <article className="card"><div className="card-head"><h3>{title}</h3>{onDelete&&<button onClick={onDelete}>Excluir</button>}</div><div className="form">{children}</div></article>
}
function Field({label,value,onChange,full,textarea,type="text"}:any){
  return <label className={full?"field full":"field"}><span>{label}</span>{textarea?<textarea value={value??""} onChange={e=>onChange(e.target.value)}/>:<input type={type} value={value??""} onChange={e=>onChange(e.target.value)}/>}</label>
}
function Check({label,checked,onChange}:any){
  return <label className="check"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>
}
function Upload({label,value,busy,onFile,onRemove}:any){
  return <div className="upload full"><span>{label}</span><div className="upload-box"><div className="preview">{value?<img src={value} alt={label}/>:<b>Sem imagem</b>}</div><div><label className="pick"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)onFile(file);e.currentTarget.value=""}}/>{busy?"Enviando...":"Escolher do aparelho"}</label>{value&&<button className="remove-image" onClick={onRemove}>Remover imagem</button>}<small>Galeria do smartphone ou arquivos do computador. Máximo 8 MB.</small></div></div></div>
}
function Css(){
  return <style jsx global>{`
    *{box-sizing:border-box}body{margin:0}button,input,textarea,a{font:inherit}
    .login,.loading{min-height:100vh;display:grid;place-items:center;padding:20px;color:#fff;background:radial-gradient(circle at top,rgba(212,175,55,.2),transparent 420px),linear-gradient(135deg,#080503,#30190f);font-family:Arial}
    .login section{width:min(520px,100%);padding:42px;border:1px solid rgba(255,216,92,.5);border-radius:31px;background:rgba(255,255,255,.06);text-align:center;box-shadow:0 0 30px rgba(212,175,55,.1),0 26px 70px rgba(0,0,0,.3)}
    .login-logo{width:78px;height:78px;display:grid;place-items:center;margin:auto;border:1px solid #d4af37;border-radius:24px;color:#f1ca58;background:#100906;font-size:24px;font-weight:950}.login span{display:block;margin-top:18px;color:#f1ca58;font-size:10px;letter-spacing:.13em}.login h1{font-size:49px;line-height:.98;margin:9px 0}.login p{color:#d7c7b4;line-height:1.55}.login input,.login button{width:100%;min-height:49px;padding:12px 15px;border-radius:999px}.login input{border:1px solid rgba(255,216,92,.3);color:#fff;background:rgba(255,255,255,.08)}.login button{margin-top:10px;border:1px solid #dfbd52;background:linear-gradient(135deg,#8b6419,#f0cd5d,#9b731f);font-weight:950}.login small{display:block;margin-top:12px;color:#ffd7d7}
    .admin{min-height:100vh;display:grid;grid-template-columns:270px minmax(0,1fr);color:#2a160d;background:radial-gradient(circle at top right,rgba(212,175,55,.08),transparent 450px),#f8f3ea;font-family:Arial}
    .admin aside{position:sticky;top:0;height:100vh;padding:21px;border-right:1px solid rgba(212,175,55,.3);color:#fff;background:linear-gradient(180deg,#090503,#28140c)}
    .brand{display:flex;gap:11px;align-items:center;margin-bottom:26px}.brand>b{width:53px;height:53px;display:grid;place-items:center;border:1px solid #d4af37;border-radius:17px;color:#f0cc5d}.brand strong,.brand span,.brand small{display:block}.brand span{margin-top:3px;color:#f0cc5d;font-size:11px;letter-spacing:.16em}.brand small{margin-top:3px;color:#bcae9e;font-size:9px}
    aside>button,aside>a{width:100%;min-height:44px;display:flex;align-items:center;margin:7px 0;padding:11px 14px;border:1px solid transparent;border-radius:14px;color:#fff;background:transparent;text-decoration:none;font-size:12px;font-weight:850}aside>button.active,aside>button:hover,aside>a:hover{border-color:rgba(255,217,97,.3);background:rgba(255,255,255,.07);color:#f0cc5d}
    .content{min-width:0;padding:clamp(18px,4vw,36px)}.content>header{display:flex;align-items:end;justify-content:space-between;gap:22px;margin-bottom:21px}.content>header span{color:#9d721a;font-size:10px;font-weight:950;letter-spacing:.13em}.content>header h1{margin:6px 0 0;font-size:clamp(39px,6vw,59px);line-height:.98;letter-spacing:-.055em}
    .save,.toolbar button{min-height:47px;padding:11px 18px;border:1px solid rgba(255,220,105,.62);border-radius:999px;color:#fff;background:linear-gradient(135deg,#160c07,#583019);font-size:12px;font-weight:950}.save:disabled{opacity:.55}.message{margin-bottom:16px;padding:13px 16px;border-radius:14px;color:#185e35;background:#e6f4eb;font-size:12px;font-weight:850}.toolbar{margin-bottom:15px}.list{display:grid;gap:16px}
    .card{padding:clamp(17px,3vw,24px);border:1px solid rgba(212,175,55,.45);border-radius:26px;background:linear-gradient(180deg,#fff,#fffaf1);box-shadow:0 0 19px rgba(212,175,55,.06),0 15px 38px rgba(51,25,11,.07)}.card-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:18px}.card-head h3{margin:0;font-size:25px}.card-head button{padding:8px 11px;border:0;border-radius:999px;color:#9b2525;background:#fff0f0;font-size:10px;font-weight:850}
    .form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field.full,.upload.full{grid-column:1/-1}.field span,.upload>span{display:block;margin-bottom:6px;color:#50301e;font-size:10px;font-weight:950}.field input,.field textarea{width:100%;min-height:46px;padding:11px 13px;border:1px solid rgba(110,70,35,.18);border-radius:13px;outline:0;background:#fff}.field textarea{min-height:104px;resize:vertical}.field input:focus,.field textarea:focus{border-color:#c59a2a;box-shadow:0 0 0 3px rgba(212,175,55,.1)}
    .check{min-height:48px;display:flex;align-items:center;gap:9px;padding:11px 13px;border:1px solid rgba(212,175,55,.2);border-radius:13px;background:#f6ead5;font-size:11px;font-weight:850}.check input{width:19px;height:19px}
    .upload-box{display:grid;grid-template-columns:145px minmax(0,1fr);gap:13px;align-items:center;padding:12px;border:1px solid rgba(112,72,35,.15);border-radius:16px;background:#fff}.preview{width:145px;height:120px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(212,175,55,.24);border-radius:13px;color:#94785e;background:#f5ecde}.preview img{width:100%;height:100%;object-fit:cover}.pick,.remove-image{width:100%;min-height:42px;display:flex;align-items:center;justify-content:center;margin-bottom:7px;padding:10px 13px;border:1px solid rgba(212,175,55,.31);border-radius:999px;color:#fff;background:linear-gradient(135deg,#160c07,#583019);font-size:10px;font-weight:950}.pick input{display:none}.remove-image{color:#8e2525;background:#fff1f1}.upload small{display:block;color:#7f6652;font-size:9px;line-height:1.45}
    @media(max-width:900px){.admin{grid-template-columns:1fr}.admin aside{position:relative;height:auto}}@media(max-width:700px){.content{padding:14px}.content>header{align-items:stretch;flex-direction:column}.form{grid-template-columns:1fr}.field.full,.upload.full{grid-column:auto}.upload-box{grid-template-columns:1fr}.preview{width:100%;height:190px}}
  `}</style>
}
EOF

cat > src/components/exale-storefront.tsx <<'EOF'
"use client";

import { useEffect, useMemo, useState } from "react";

const placeholder = "/exale-produto-sem-foto.svg";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function ExaleStorefront(){
  const[store,setStore]=useState<any>(null);
  const[cart,setCart]=useState<any[]>([]);
  const[selected,setSelected]=useState<any>(null);
  const[search,setSearch]=useState("");

  async function load(){
    const r=await fetch(`/api/store?t=${Date.now()}`,{cache:"no-store"});
    const d=await r.json();
    if(!r.ok||!d.ok)throw new Error(d.message||"Erro ao carregar.");
    setStore(d);
  }

  useEffect(()=>{
    load().catch(console.error);
    try{setCart(JSON.parse(localStorage.getItem("exale-cart-premium-v1")||"[]"))}catch{}
    const refresh=()=>load().catch(()=>null);
    const timer=setInterval(refresh,10000);
    window.addEventListener("focus",refresh);
    const visibility=()=>document.visibilityState==="visible"&&refresh();
    document.addEventListener("visibilitychange",visibility);
    return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",visibility)}
  },[]);

  useEffect(()=>{try{localStorage.setItem("exale-cart-premium-v1",JSON.stringify(cart))}catch{}},[cart]);

  const products=useMemo(()=>{
    const term=search.trim().toLowerCase();
    const list=(store?.products||[]).filter((p:any)=>p.active!==false);
    return (term?list.filter((p:any)=>`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)):list)
      .sort((a:any,b:any)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)));
  },[store,search]);

  const promotions=useMemo(()=>{
    const now=Date.now();
    return (store?.promotions||[]).filter((p:any)=>{
      if(p.active===false)return false;
      const start=p.startDate?new Date(p.startDate).getTime():0;
      const end=p.endDate?new Date(p.endDate).getTime():Number.MAX_SAFE_INTEGER;
      return now>=start&&now<=end;
    });
  },[store]);

  function add(product:any,buy=false){
    setCart(current=>{
      const exists=current.find(i=>i.id===product.id);
      return exists?current.map(i=>i.id===product.id?{...i,quantity:Number(i.quantity||1)+1}:i):[...current,{...product,quantity:1}];
    });
    if(buy)setTimeout(()=>location.href="/carrinho",80);
  }

  if(!store)return <main className="status">Carregando experiência EXALE...<Css/></main>;
  const s=store.settings;
  const count=cart.reduce((n,i)=>n+Number(i.quantity||1),0);

  return <main className="site" style={{["--primary" as any]:s.primaryColor,["--accent" as any]:s.accentColor}}>
    <header className="top">
      <a className="site-brand" href="/">
        <div>{s.logoUrl?<img src={s.logoUrl} alt={s.storeName}/>:<span>PS</span>}</div>
        <section><strong>{s.storeName}</strong><b>{s.brandName}</b><small>{s.slogan}</small></section>
      </a>
      <nav><a href="#produtos">Produtos</a><a href="#promocoes">Promoções</a><a href="#avaliacoes">Avaliações</a><a className="cart" href="/carrinho">Carrinho <span>{count}</span></a></nav>
    </header>

    <section className="hero" style={s.heroImageUrl?{backgroundImage:`linear-gradient(90deg,rgba(10,5,3,.95),rgba(10,5,3,.5)),url("${s.heroImageUrl}")`}:undefined}>
      <div><span>PATRÍCIA SANTANA • EXALE</span><h1>{s.heroTitle}</h1><p>{s.heroSubtitle}</p><section><a href="#produtos">Conhecer produtos</a><a className="ghost" href={`https://wa.me/${s.whatsapp}`} target="_blank">Atendimento exclusivo</a></section></div>
      <aside><strong>EXALE</strong><span>Cosméticos naturais</span><small>Beleza • equilíbrio • bem-estar</small></aside>
    </section>

    {promotions.length>0&&<section id="promocoes" className="content-section"><Title eye="OPORTUNIDADES EXCLUSIVAS" title="Promoções especiais" text="Condições selecionadas para uma experiência de compra ainda mais especial."/><div className="promo-grid">{promotions.map((p:any)=><article className="window promo" key={p.id}>{p.imageUrl?<img src={p.imageUrl} alt={p.title}/>:<div className="promo-empty">EXALE</div>}<div><b>{p.badge||"PROMOÇÃO"}</b><h3>{p.title}</h3><p>{p.description}</p></div></article>)}</div></section>}

    <section id="produtos" className="content-section">
      <div className="products-head"><Title eye="VITRINE EXALE" title="Produtos selecionados" text="Janelas personalizadas com contorno dourado e apresentação estratégica."/><label><span>Buscar</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome do produto"/></label></div>
      {products.length===0?<div className="window empty"><strong>Nenhum produto cadastrado</strong><p>Adicione pelo painel e ele aparecerá automaticamente aqui.</p></div>:<div className="product-grid">{products.map((p:any)=>{
        const price=Number(p.promotionalPrice)>0?Number(p.promotionalPrice):Number(p.price);
        return <article className={`window product ${p.featured?"featured":""}`} key={p.id}>
          <button className="photo" onClick={()=>setSelected(p)}><img src={p.imageUrl||placeholder} alt={p.name}/>{p.featured&&<b>Destaque EXALE</b>}{Number(p.promotionalPrice)>0&&<em>Oferta especial</em>}</button>
          <div className="product-body"><small>{p.category||"Cosméticos naturais"}</small><h3>{p.name}</h3><p>{p.description}</p><div className="price">{Number(p.promotionalPrice)>0&&<del>{money(p.price)}</del>}<strong>{money(price)}</strong></div><div className="actions"><button onClick={()=>add(p)}>Adicionar</button><button className="primary" onClick={()=>add(p,true)}>Comprar</button><button className="details" onClick={()=>setSelected(p)}>Ver detalhes</button></div></div>
        </article>
      })}</div>}
    </section>

    <section id="avaliacoes" className="reviews"><div className="reviews-head"><Title eye="EXPERIÊNCIAS" title="Avaliações 5.0" text="Fotos e comentários cadastrados no painel administrativo."/><div className="rating"><strong>5.0</strong><span>★★★★★</span><small>experiência EXALE</small></div></div><div className="review-grid">{(store.reviews||[]).filter((r:any)=>r.active!==false).map((r:any)=><article key={r.id}><div className="user"><div>{r.photoUrl?<img src={r.photoUrl} alt={r.name}/>:<span>EX</span>}</div><section><strong>{r.name}</strong><span>{"★".repeat(Math.max(1,Math.min(5,Number(r.rating||5))))}</span></section></div><p>“{r.comment}”</p>{r.demo&&<small>Avaliação demonstrativa</small>}</article>)}</div></section>

    <footer><div><strong>{s.storeName}</strong><b>{s.brandName}</b><p>{s.footerText}</p></div><div><span>Empresa</span><strong>CNPJ {s.cnpj}</strong></div><div><span>Atendimento</span><a href={`https://wa.me/${s.whatsapp}`} target="_blank">WhatsApp</a><small>{s.instagram}</small></div></footer>

    {selected&&<div className="modal" onClick={()=>setSelected(null)}><article className="window" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><img src={selected.imageUrl||placeholder} alt={selected.name}/><div><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.description}</p><strong>{money(Number(selected.promotionalPrice)>0?selected.promotionalPrice:selected.price)}</strong><button onClick={()=>add(selected)}>Adicionar ao carrinho</button><button className="primary" onClick={()=>add(selected,true)}>Comprar agora</button></div></article></div>}
    <Css/>
  </main>
}

function Title({eye,title,text}:any){return <div className="title"><span>{eye}</span><h2>{title}</h2><p>{text}</p></div>}
function Css(){return <style jsx global>{`
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:#20120c;background:radial-gradient(circle at top,rgba(212,175,55,.08),transparent 440px),#fffdf8;font-family:Arial}button,input,a{font:inherit}.status{min-height:100vh;display:grid;place-items:center;font-weight:950}
  .top{position:sticky;top:0;z-index:30;min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:12px max(18px,calc((100vw - 1240px)/2));border-bottom:1px solid rgba(212,175,55,.25);background:rgba(13,8,5,.95);backdrop-filter:blur(14px)}
  .site-brand{min-width:0;display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none}.site-brand>div{width:56px;height:56px;display:grid;place-items:center;overflow:hidden;border:1px solid #d4af37;border-radius:18px;color:#ffe18b;background:linear-gradient(145deg,#2d190f,#090503);font-weight:950;box-shadow:0 0 18px rgba(212,175,55,.18)}.site-brand img{width:100%;height:100%;object-fit:cover}.site-brand strong,.site-brand b,.site-brand small{display:block}.site-brand b{margin-top:2px;color:#f1ca58;font-size:13px;letter-spacing:.2em}.site-brand small{max-width:420px;overflow:hidden;color:#ccbda9;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.top nav{display:flex;align-items:center;gap:15px}.top nav>a{color:#fff;text-decoration:none;font-size:12px;font-weight:850}.cart{display:flex;gap:8px;align-items:center;padding:11px 15px;border:1px solid #d4af37;border-radius:999px;background:linear-gradient(135deg,#6c4915,#d4af37,#8f681e);color:#150c07!important}.cart span{min-width:24px;height:24px;display:grid;place-items:center;border-radius:50%;color:#fff;background:#120a06}
  .hero{width:min(1240px,calc(100% - 28px));min-height:590px;display:grid;grid-template-columns:1fr 260px;gap:40px;align-items:center;margin:18px auto 68px;padding:clamp(34px,7vw,82px);border:1px solid rgba(255,221,117,.52);border-radius:38px;color:#fff;background:radial-gradient(circle at 82% 18%,rgba(255,210,76,.25),transparent 310px),linear-gradient(135deg,#090503,#2d170d 53%,#120a06);background-size:cover;background-position:center;box-shadow:0 24px 70px rgba(18,9,4,.24)}
  .hero>div>span{color:#f1ca58;font-size:11px;font-weight:950;letter-spacing:.16em}.hero h1{max-width:860px;margin:12px 0 0;font-size:clamp(48px,8vw,88px);line-height:.92;letter-spacing:-.065em}.hero p{max-width:680px;margin:21px 0 0;color:#e9ddce;font-size:17px;line-height:1.58}.hero>div>section{display:flex;flex-wrap:wrap;gap:11px;margin-top:28px}.hero a{padding:14px 20px;border:1px solid #d4af37;border-radius:999px;color:#160c07;background:linear-gradient(135deg,#8e6519,#f2ce5b,#a57b25);text-decoration:none;font-weight:950}.hero a.ghost{color:#fff;background:rgba(255,255,255,.04)}
  .hero>aside{width:230px;height:230px;display:grid;place-items:center;align-content:center;padding:24px;border:1px solid #d4af37;border-radius:50%;text-align:center;background:radial-gradient(circle,rgba(255,210,71,.16),rgba(8,4,2,.42));box-shadow:0 0 36px rgba(212,175,55,.12)}.hero>aside strong,.hero>aside span,.hero>aside small{display:block}.hero>aside strong{color:#f2cf61;font-size:33px;letter-spacing:.14em}.hero>aside span{margin-top:8px;font-weight:900}.hero>aside small{margin-top:7px;color:#d7c6b0}
  .content-section{width:min(1240px,calc(100% - 28px));margin:0 auto 70px}.title{max-width:760px}.title>span{color:#a87813;font-size:10px;font-weight:950;letter-spacing:.14em}.title h2{margin:7px 0 0;font-size:clamp(37px,5vw,59px);line-height:.98;letter-spacing:-.055em}.title p{margin:12px 0 0;color:#775b47;line-height:1.55}.products-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}.products-head>label{width:min(370px,100%)}.products-head label span{display:block;margin-bottom:6px;font-size:10px;font-weight:950}.products-head input{width:100%;min-height:48px;padding:12px 16px;border:1px solid rgba(131,88,25,.22);border-radius:999px;outline:0;background:#fff}
  .window{position:relative;border:1px solid rgba(212,175,55,.62);background:#fff;box-shadow:0 0 0 1px rgba(255,239,184,.22),0 0 18px rgba(212,175,55,.08),0 18px 46px rgba(46,23,10,.09)}.window:before{content:"";position:absolute;inset:5px;pointer-events:none;border:1px solid rgba(212,175,55,.2);border-radius:inherit}
  .promo-grid,.product-grid,.review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:19px}.promo-grid{margin-top:25px}.promo{overflow:hidden;border-radius:29px;color:#fff;background:linear-gradient(145deg,#100906,#3b2013)}.promo img,.promo-empty{width:100%;height:235px;object-fit:cover}.promo-empty{display:grid;place-items:center;color:#e7bf4c;background:#160c07;font-size:34px;font-weight:950}.promo>div{position:relative;padding:21px}.promo b{color:#f1ca58;font-size:10px}.promo h3{margin:8px 0 0;font-size:28px}.promo p{color:#dfcfbb}
  .product{overflow:hidden;border-radius:30px;background:linear-gradient(180deg,#fff,#fffaf0)}.product.featured{box-shadow:0 0 0 1px rgba(255,225,126,.45),0 0 24px rgba(212,175,55,.15),0 22px 52px rgba(46,23,10,.12)}.photo{position:relative;width:100%;padding:0;border:0;background:#eee5d7;cursor:pointer}.photo img{width:100%;height:310px;display:block;object-fit:cover}.photo b,.photo em{position:absolute;top:14px;padding:8px 11px;border-radius:999px;font-size:9px;font-style:normal}.photo b{left:14px;background:linear-gradient(135deg,#97701d,#f0ce63)}.photo em{right:14px;color:#fff;background:#9e2020}.product-body{position:relative;padding:20px}.product-body small{color:#9b711b;font-size:10px;font-weight:950}.product-body h3{margin:8px 0 0;font-size:24px}.product-body p{min-height:62px;color:#735644;font-size:13px;line-height:1.5}.price{display:flex;align-items:center;gap:8px}.price strong{font-size:25px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.actions button,.modal article>div>button{min-height:43px;padding:10px 12px;border:1px solid rgba(143,101,28,.24);border-radius:999px;background:#f3e8d3;font-size:11px;font-weight:950}.actions .primary,.modal .primary{color:#fff;background:linear-gradient(135deg,#160c07,#5a321b)}.actions .details{grid-column:1/-1;background:transparent}.empty{padding:42px;border-radius:28px;text-align:center}
  .reviews{width:min(1240px,calc(100% - 28px));margin:0 auto 64px;padding:clamp(25px,5vw,48px);border:1px solid rgba(212,175,55,.55);border-radius:36px;color:#fff;background:radial-gradient(circle at 90% 10%,rgba(212,175,55,.2),transparent 280px),linear-gradient(135deg,#080503,#351d11)}.reviews .title h2{color:#fff}.reviews .title p{color:#ddcdb9}.reviews-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}.rating{min-width:170px;padding:18px;border:1px solid rgba(255,218,99,.35);border-radius:22px;text-align:center;background:rgba(255,255,255,.05)}.rating strong,.rating span,.rating small{display:block}.rating strong{color:#f0cc5d;font-size:39px}.rating span{color:#f0cc5d}.review-grid{margin-top:24px}.review-grid>article{padding:19px;border:1px solid rgba(255,219,102,.23);border-radius:24px;background:rgba(255,255,255,.055)}.user{display:flex;align-items:center;gap:11px}.user>div{width:58px;height:58px;display:grid;place-items:center;overflow:hidden;border:1px solid #d4af37;border-radius:50%;color:#f0cc5d}.user img{width:100%;height:100%;object-fit:cover}.user strong,.user span{display:block}.user span{color:#f0cc5d}.review-grid p{color:#eadfce}.review-grid>article>small{color:#d3b04b}
  footer{display:grid;grid-template-columns:1.7fr 1fr 1fr;gap:26px;padding:38px max(18px,calc((100vw - 1240px)/2));color:#fff;background:#0e0805;border-top:1px solid rgba(212,175,55,.42)}footer strong,footer b,footer span,footer a,footer small{display:block}footer b{color:#f0cc5d;letter-spacing:.17em}footer p,footer small{color:#cdbba7}footer a{color:#fff;text-decoration:none}
  .modal{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:18px;background:rgba(7,4,2,.82);backdrop-filter:blur(8px)}.modal>article{width:min(940px,100%);max-height:92vh;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;border-radius:33px}.modal>article>img{width:100%;height:100%;min-height:520px;object-fit:cover}.modal>article>div{position:relative;padding:clamp(27px,5vw,46px)}.modal h2{font-size:clamp(36px,5vw,54px);line-height:.98}.modal>article>div>strong{display:block;margin:19px 0;font-size:31px}.close{position:absolute;top:13px;right:13px;z-index:4;width:43px;height:43px;border:1px solid #d4af37;border-radius:50%;color:#fff;background:#150b07;font-size:27px}
  @media(max-width:900px){.hero{grid-template-columns:1fr}.hero>aside{display:none}.products-head,.reviews-head{align-items:stretch;flex-direction:column}.modal>article{grid-template-columns:1fr;overflow-y:auto}.modal>article>img{min-height:310px;height:310px}}@media(max-width:700px){.top nav>a:not(.cart){display:none}.site-brand small{display:none}.hero{min-height:500px;padding:31px 23px;border-radius:29px}.hero h1{font-size:48px}.product-grid{grid-template-columns:1fr}.product-photo img{height:330px}footer{grid-template-columns:1fr}}
  `}</style>}
EOF

cat > src/app/page.tsx <<'EOF'
import ExaleStorefront from "@/components/exale-storefront";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function HomePage(){return <ExaleStorefront/>}
EOF

cat > src/app/painel-exale/page.tsx <<'EOF'
import ExaleAdmin from "@/components/exale-admin";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function PainelPage(){return <ExaleAdmin/>}
EOF

cat > src/app/admin/page.tsx <<'EOF'
import { redirect } from "next/navigation";
export default function AdminPage(){redirect("/painel-exale")}
EOF

cat > src/app/layout.tsx <<'EOF'
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Patrícia Santana • EXALE",
  description: "Cosméticos naturais que transformam cuidado em beleza, equilíbrio e bem-estar."
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}</body></html>
}
EOF

rm -rf \
  src/app/api/products \
  src/app/api/settings \
  src/app/api/storefront \
  src/app/api/admin/data \
  src/app/api/admin/products \
  src/app/api/admin/upsert-product \
  src/app/api/admin/remove-product \
  src/app/api/admin/sync-site \
  src/app/api/admin/upload-product-image \
  src/components/exale-storefront-full.tsx \
  src/components/exale-admin-full.tsx \
  src/components/exale-admin-client-shell.tsx \
  src/components/exale-company-reviews.tsx \
  src/lib/github-live-store.ts \
  src/lib/live-storefront-fresh.ts \
  2>/dev/null || true

node -e 'JSON.parse(require("fs").readFileSync("content/store.json","utf8")); console.log("[OK] store.json válido")'

if grep -RInE 'Imagem \(URL\)|Foto \(URL\)|Logotipo \(URL\)' src/components/exale-admin.tsx 2>/dev/null; then
  echo "ERRO: ainda existem campos de URL no painel."
  exit 1
fi

rm -rf .next .turbo node_modules/.cache .vercel/output 2>/dev/null || true
npm run build

git add -A
if ! git diff --cached --quiet; then
  git commit -m "personaliza Exale premium e adiciona upload por arquivo"
fi

git fetch origin main
REMOTE_AHEAD="$(git rev-list --count HEAD..origin/main 2>/dev/null || printf "0")"
if [ "$REMOTE_AHEAD" != "0" ]; then
  echo "ERRO: o GitHub possui alterações mais recentes."
  echo "Push bloqueado para evitar sobrescrever dados."
  echo "Backup: $BACKUP"
  exit 1
fi

git push origin main
vercel --prod --force

echo
echo "============================================================"
echo " CONCLUÍDO"
echo "============================================================"
echo "Site: https://exale-cosmeticos-naturais.vercel.app"
echo "Painel: https://exale-cosmeticos-naturais.vercel.app/painel-exale"
echo "Senha padrão: exale-admin-2026"
echo "Backup: $BACKUP"
echo
echo "Configure na Vercel:"
echo "ADMIN_PASSWORD=uma_senha_forte"
echo "GITHUB_REPO=anonimatoo/exale-cosmeticos-naturais"
echo "GITHUB_BRANCH=main"
echo "GITHUB_TOKEN=novo_token_com_permissao_contents_write"
