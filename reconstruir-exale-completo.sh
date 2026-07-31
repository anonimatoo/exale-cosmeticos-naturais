#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/exale-cosmeticos-naturais"
cd "$PROJECT" || { echo "ERRO: projeto não encontrado."; exit 1; }

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/exale-backups-fora-do-projeto/rebuild-total-$STAMP"
mkdir -p "$BACKUP"
cp -a src content public package.json package-lock.json next.config.ts tsconfig.json "$BACKUP/" 2>/dev/null || true
git branch "backup-rebuild-total-$STAMP" 2>/dev/null || true

mkdir -p src/app/api/store src/app/api/admin/login src/app/api/admin/save src/app/painel-exale src/app/admin src/app/carrinho src/components src/lib content public/uploads

cat > content/store.json <<'EOF'
{
  "settings": {
    "storeName": "Exale Cosméticos Naturais",
    "slogan": "Cosméticos naturais e experiências que encantam",
    "heroTitle": "Beleza natural com identidade própria.",
    "heroSubtitle": "Produtos selecionados, promoções especiais e atendimento personalizado pelo WhatsApp.",
    "logoUrl": "",
    "whatsapp": "5513991616048",
    "instagram": "@exale.cosmeticosnaturais",
    "tiktok": "",
    "cnpj": "24.604.430/0001-80",
    "primaryColor": "#2a160d",
    "accentColor": "#c79533",
    "footerText": "Exale Cosméticos Naturais — cuidado, beleza e confiança."
  },
  "products": [],
  "promotions": [],
  "reviews": [
    {
      "id": "review-1",
      "name": "Cliente Exale",
      "photoUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
      "comment": "Atendimento cuidadoso, produtos bem apresentados e uma experiência excelente.",
      "rating": 5,
      "active": true
    },
    {
      "id": "review-2",
      "name": "Cliente Exale",
      "photoUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      "comment": "Pedido organizado e atendimento muito rápido pelo WhatsApp.",
      "rating": 5,
      "active": true
    }
  ]
}
EOF

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

function config() {
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
      storeName: String(settings.storeName || "Exale Cosméticos Naturais"),
      slogan: String(settings.slogan || ""),
      heroTitle: String(settings.heroTitle || ""),
      heroSubtitle: String(settings.heroSubtitle || ""),
      logoUrl: String(settings.logoUrl || ""),
      whatsapp: String(settings.whatsapp || "").replace(/\D/g, ""),
      instagram: String(settings.instagram || ""),
      tiktok: String(settings.tiktok || ""),
      cnpj: String(settings.cnpj || "24.604.430/0001-80"),
      primaryColor: String(settings.primaryColor || "#2a160d"),
      accentColor: String(settings.accentColor || "#c79533"),
      footerText: String(settings.footerText || "")
    },
    products: Array.isArray(input?.products) ? input.products : [],
    promotions: Array.isArray(input?.promotions) ? input.promotions : [],
    reviews: Array.isArray(input?.reviews) ? input.reviews : []
  };
}

export async function readStore(): Promise<StoreData> {
  const { owner, repo, branch, token } = config();

  if (owner && repo) {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/content/store.json?t=${Date.now()}`,
      { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    );
    if (response.ok) return normalizeStore(await response.json());
  }

  return normalizeStore(JSON.parse(await fs.readFile(localFile, "utf8")));
}

export async function writeStore(data: StoreData): Promise<void> {
  const normalized = normalizeStore(data);
  const { owner, repo, branch, token } = config();

  if (!owner || !repo || !token) {
    await fs.writeFile(localFile, JSON.stringify(normalized, null, 2) + "\n", "utf8");
    return;
  }

  const api = `https://api.github.com/repos/${owner}/${repo}/contents/content/store.json`;
  const current = await fetch(`${api}?ref=${branch}&t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });

  let sha = "";
  if (current.ok) sha = String((await current.json()).sha || "");

  const response = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Atualização pelo painel Exale ${new Date().toISOString()}`,
      content: Buffer.from(JSON.stringify(normalized, null, 2) + "\n").toString("base64"),
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if (!response.ok) {
    throw new Error(`Falha ao sincronizar com GitHub: HTTP ${response.status} ${await response.text()}`);
  }
}
EOF

cat > src/app/api/store/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { readStore } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const store = await readStore();
    return NextResponse.json(
      { ok: true, ...store, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || "Erro ao carregar." }, { status: 500 });
  }
}
EOF

cat > src/app/api/admin/login/route.ts <<'EOF'
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const expected = process.env.ADMIN_PASSWORD || "exale-admin-2026";
  if (password !== expected) return NextResponse.json({ ok: false, message: "Senha incorreta." }, { status: 401 });
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
    if (password !== expected) return NextResponse.json({ ok: false, message: "Acesso negado." }, { status: 401 });

    await writeStore(await request.json());
    return NextResponse.json({ ok: true, message: "Salvo e sincronizado com o site." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || "Erro ao salvar." }, { status: 500 });
  }
}
EOF

cat > src/components/exale-storefront.tsx <<'EOF'
"use client";

import { useEffect, useMemo, useState } from "react";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ExaleStorefront() {
  const [store, setStore] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");

  async function load() {
    const response = await fetch(`/api/store?t=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao carregar.");
    setStore(data);
  }

  useEffect(() => {
    load().catch(console.error);
    setCart(JSON.parse(localStorage.getItem("exale-cart-v2") || "[]"));
    const timer = window.setInterval(() => load().catch(() => null), 10000);
    const focus = () => load().catch(() => null);
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, []);

  useEffect(() => {
    localStorage.setItem("exale-cart-v2", JSON.stringify(cart));
  }, [cart]);

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (store?.products || []).filter((p: any) => p.active !== false);
    return (term ? list.filter((p: any) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)) : list)
      .sort((a: any, b: any) => Number(b.featured) - Number(a.featured));
  }, [store, search]);

  const promotions = useMemo(() => {
    const now = Date.now();
    return (store?.promotions || []).filter((p: any) => {
      if (p.active === false) return false;
      const start = p.startDate ? new Date(p.startDate).getTime() : 0;
      const end = p.endDate ? new Date(p.endDate).getTime() : Number.MAX_SAFE_INTEGER;
      return now >= start && now <= end;
    });
  }, [store]);

  function add(product: any, buy = false) {
    setCart((current: any[]) => {
      const exists = current.find(i => i.id === product.id);
      return exists
        ? current.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...current, { ...product, quantity: 1 }];
    });
    if (buy) window.location.href = "/carrinho";
  }

  if (!store) return <main className="loading">Carregando loja...</main>;
  const s = store.settings;

  return (
    <main style={{ ["--primary" as any]: s.primaryColor, ["--accent" as any]: s.accentColor }}>
      <header className="top">
        <a className="brand" href="/">
          {s.logoUrl ? <img src={s.logoUrl} alt={s.storeName} /> : <span>E</span>}
          <div><strong>{s.storeName}</strong><small>{s.slogan}</small></div>
        </a>
        <nav>
          <a href="#produtos">Produtos</a>
          <a href="#promocoes">Promoções</a>
          <a href="#avaliacoes">Avaliações</a>
          <a className="cart-link" href="/carrinho">Carrinho ({cart.reduce((n, i) => n + i.quantity, 0)})</a>
        </nav>
      </header>

      <section className="hero">
        <span>EXALE COSMÉTICOS NATURAIS</span>
        <h1>{s.heroTitle}</h1>
        <p>{s.heroSubtitle}</p>
        <div><a href="#produtos">Comprar agora</a><a className="outline" target="_blank" href={`https://wa.me/${s.whatsapp}`}>WhatsApp</a></div>
      </section>

      {promotions.length > 0 && (
        <section id="promocoes" className="section">
          <Title label="OFERTAS" title="Promoções especiais" />
          <div className="promo-grid">
            {promotions.map((p: any) => <article key={p.id}>{p.imageUrl && <img src={p.imageUrl} alt={p.title} />}<div><b>{p.badge || "PROMOÇÃO"}</b><h3>{p.title}</h3><p>{p.description}</p></div></article>)}
          </div>
        </section>
      )}

      <section id="produtos" className="section">
        <div className="product-head"><Title label="VITRINE" title="Produtos" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." /></div>
        {products.length === 0 ? <div className="empty">Nenhum produto cadastrado. Use o painel para adicionar.</div> : (
          <div className="product-grid">
            {products.map((p: any) => {
              const price = p.promotionalPrice > 0 ? p.promotionalPrice : p.price;
              return <article className={`product ${p.featured ? "featured" : ""}`} key={p.id}>
                <button className="photo" onClick={() => setSelected(p)}>
                  <img src={p.imageUrl || "/exale-produto-sem-foto.svg"} alt={p.name} />
                  {p.featured && <b>Destaque</b>}
                  {p.promotionalPrice > 0 && <em>Promoção</em>}
                </button>
                <div className="product-body">
                  <small>{p.category}</small><h3>{p.name}</h3><p>{p.description}</p>
                  <div className="price">{p.promotionalPrice > 0 && <del>{money(p.price)}</del>}<strong>{money(price)}</strong></div>
                  <div className="actions"><button onClick={() => add(p)}>Adicionar</button><button className="buy" onClick={() => add(p, true)}>Comprar</button><button className="details" onClick={() => setSelected(p)}>Detalhes</button></div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <section id="avaliacoes" className="reviews">
        <Title label="EXPERIÊNCIAS" title="Avaliações 5.0" />
        <div className="review-grid">
          {(store.reviews || []).filter((r: any) => r.active !== false).map((r: any) => <article key={r.id}><img src={r.photoUrl || "/exale-produto-sem-foto.svg"} alt={r.name} /><strong>{r.name}</strong><span>{"★".repeat(Math.max(1, Math.min(5, Number(r.rating || 5))))}</span><p>“{r.comment}”</p></article>)}
        </div>
      </section>

      <footer><div><strong>{s.storeName}</strong><p>{s.footerText}</p></div><div><b>CNPJ</b><span>{s.cnpj}</span></div><div><b>Atendimento</b><a target="_blank" href={`https://wa.me/${s.whatsapp}`}>WhatsApp</a></div></footer>

      {selected && <div className="modal" onClick={() => setSelected(null)}><article onClick={e => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}>×</button><img src={selected.imageUrl || "/exale-produto-sem-foto.svg"} alt={selected.name} /><div><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.description}</p><strong>{money(selected.promotionalPrice > 0 ? selected.promotionalPrice : selected.price)}</strong><button className="modal-buy" onClick={() => add(selected, true)}>Comprar agora</button></div></article></div>}
      <StoreCss />
    </main>
  );
}

function Title({ label, title }: any) {
  return <div className="title"><span>{label}</span><h2>{title}</h2></div>;
}

function StoreCss() {
  return <style jsx global>{`
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fbf7ef;color:#2a160d;font-family:Arial,sans-serif}button,a,input{font:inherit}.loading{min-height:100vh;display:grid;place-items:center;font-weight:900}
    .top{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:14px max(18px,calc((100vw - 1220px)/2));background:rgba(255,250,241,.95);backdrop-filter:blur(12px);border-bottom:1px solid #eadfce}.brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none}.brand>span,.brand>img{width:50px;height:50px;border-radius:16px;display:grid;place-items:center;object-fit:cover;background:var(--primary);color:#fff;font-weight:950}.brand strong,.brand small{display:block}.brand small{color:#80634f;margin-top:3px}.top nav{display:flex;align-items:center;gap:14px}.top nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:850}.cart-link{padding:10px 14px;border-radius:999px;background:var(--primary);color:#fff!important}
    .hero{width:min(1220px,calc(100% - 28px));min-height:510px;margin:18px auto 55px;padding:clamp(30px,7vw,80px);display:flex;flex-direction:column;justify-content:center;border-radius:34px;color:#fff;background:radial-gradient(circle at 80% 5%,rgba(199,149,51,.4),transparent 35%),linear-gradient(135deg,var(--primary),#6b3d20);box-shadow:0 25px 70px rgba(42,22,13,.2)}.hero>span,.title span{color:var(--accent);font-size:11px;font-weight:950;letter-spacing:.11em}.hero h1{max-width:820px;margin:10px 0;font-size:clamp(48px,8vw,86px);line-height:.92;letter-spacing:-.06em}.hero p{max-width:670px;color:#f0dfc3;font-size:17px;line-height:1.55}.hero>div{display:flex;gap:10px;margin-top:20px}.hero a{padding:14px 20px;border-radius:999px;background:var(--accent);color:#211108;text-decoration:none;font-weight:950}.hero .outline{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35)}
    .section{width:min(1220px,calc(100% - 28px));margin:0 auto 65px}.title h2{margin:6px 0 0;font-size:clamp(36px,5vw,56px);letter-spacing:-.05em}.product-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}.product-head input{width:min(350px,100%);padding:13px 16px;border:1px solid #dccbb3;border-radius:999px}.promo-grid,.product-grid,.review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:17px}.promo-grid article,.product,.review-grid article{overflow:hidden;border-radius:25px;background:#fff;box-shadow:0 14px 40px rgba(42,22,13,.09)}.promo-grid img{width:100%;height:220px;object-fit:cover}.promo-grid article>div{padding:19px}.promo-grid b{color:var(--accent);font-size:11px}.promo-grid h3{font-size:27px;margin:7px 0}.product.featured{outline:2px solid var(--accent)}.photo{position:relative;width:100%;padding:0;border:0;background:#eee;cursor:pointer}.photo img{display:block;width:100%;height:280px;object-fit:cover}.photo b,.photo em{position:absolute;top:12px;padding:7px 10px;border-radius:999px;font-size:10px;font-style:normal}.photo b{left:12px;background:var(--accent)}.photo em{right:12px;background:#14734b;color:#fff}.product-body{padding:18px}.product-body small{color:#8d6a50;font-weight:800}.product-body h3{font-size:23px;margin:7px 0}.product-body p{min-height:42px;color:#73533f;font-size:13px;line-height:1.5}.price{display:flex;align-items:center;gap:8px;margin:13px 0}.price strong{font-size:24px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.actions button,.modal-buy{padding:11px;border:0;border-radius:999px;background:#efe0c7;font-weight:950;cursor:pointer}.actions .buy,.modal-buy{background:var(--primary);color:#fff}.actions .details{grid-column:1/-1;background:transparent;border:1px solid #ddcdb7}.empty{padding:40px;border:1px dashed #cdb99e;border-radius:24px;text-align:center;background:#fff}
    .reviews{width:min(1220px,calc(100% - 28px));margin:0 auto 55px;padding:clamp(24px,5vw,44px);border-radius:30px;background:var(--primary);color:#fff}.reviews .title h2{color:#fff}.review-grid{margin-top:22px}.review-grid article{padding:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}.review-grid img{width:58px;height:58px;border-radius:50%;object-fit:cover}.review-grid strong,.review-grid span{display:block}.review-grid span{color:var(--accent);margin-top:4px}.review-grid p{color:#f0dfc3;line-height:1.5}
    footer{display:grid;grid-template-columns:2fr 1fr 1fr;gap:22px;padding:35px max(18px,calc((100vw - 1220px)/2));background:#f0e2c8}footer strong,footer b,footer span,footer a{display:block}footer a{color:inherit}.modal{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:18px;background:rgba(17,8,4,.72)}.modal article{position:relative;width:min(900px,100%);display:grid;grid-template-columns:1fr 1fr;overflow:hidden;border-radius:28px;background:#fff}.modal article>img{width:100%;height:100%;min-height:460px;object-fit:cover}.modal article>div{padding:35px}.modal h2{font-size:40px;margin:8px 0}.modal p{color:#745642;line-height:1.6}.modal strong{display:block;font-size:30px;margin:15px 0}.close{position:absolute;right:12px;top:12px;width:40px;height:40px;border:0;border-radius:50%;font-size:27px}.modal-buy{width:100%}
    @media(max-width:800px){.top nav a:not(.cart-link){display:none}.product-head{align-items:stretch;flex-direction:column}.modal article{grid-template-columns:1fr;max-height:92vh;overflow:auto}.modal article>img{min-height:270px;height:270px}footer{grid-template-columns:1fr}}
  `}</style>;
}
EOF

cat > src/components/exale-admin.tsx <<'EOF'
"use client";

import { useEffect, useState } from "react";

const id = () => crypto.randomUUID();
const product = () => ({ id:id(), name:"", description:"", category:"Cosméticos Naturais", imageUrl:"", price:0, promotionalPrice:0, stock:1, featured:false, active:true });
const promotion = () => ({ id:id(), title:"", description:"", imageUrl:"", badge:"PROMOÇÃO", startDate:"", endDate:"", active:true });
const review = () => ({ id:id(), name:"", photoUrl:"", comment:"", rating:5, active:true });

export default function ExaleAdmin() {
  const [password,setPassword]=useState("");
  const [logged,setLogged]=useState(false);
  const [store,setStore]=useState<any>(null);
  const [tab,setTab]=useState("products");
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  async function load(){
    const r=await fetch(`/api/store?t=${Date.now()}`,{cache:"no-store"});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.message||"Erro ao carregar.");
    setStore({settings:d.settings,products:d.products,promotions:d.promotions,reviews:d.reviews});
  }

  useEffect(()=>{
    if(sessionStorage.getItem("exale-auth")==="1"){
      setLogged(true);
      setPassword(sessionStorage.getItem("exale-password")||"");
      load().catch(e=>setMessage(e.message));
    }
  },[]);

  async function login(){
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
    const d=await r.json();
    if(!r.ok) return setMessage(d.message||"Senha incorreta.");
    sessionStorage.setItem("exale-auth","1"); sessionStorage.setItem("exale-password",password);
    setLogged(true); await load();
  }

  async function save(){
    setSaving(true); setMessage("");
    try{
      const r=await fetch("/api/admin/save",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":password},body:JSON.stringify(store)});
      const d=await r.json();
      if(!r.ok||!d.ok) throw new Error(d.message||"Erro ao salvar.");
      setMessage("Salvo e sincronizado com o site.");
      await load();
    }catch(e:any){setMessage(e.message)}finally{setSaving(false)}
  }

  const updateSettings=(key:string,value:any)=>setStore((s:any)=>({...s,settings:{...s.settings,[key]:value}}));
  const update=(list:string,index:number,key:string,value:any)=>setStore((s:any)=>({...s,[list]:s[list].map((x:any,i:number)=>i===index?{...x,[key]:value}:x)}));
  const remove=(list:string,index:number)=>{if(confirm("Excluir este item?"))setStore((s:any)=>({...s,[list]:s[list].filter((_:any,i:number)=>i!==index)}));};

  if(!logged)return <main className="login"><section><div>E</div><h1>Painel Exale</h1><p>Gerencie produtos, promoções, destaques, avaliações e configurações.</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Senha administrativa"/><button onClick={login}>Entrar</button>{message&&<small>{message}</small>}</section><AdminCss/></main>;
  if(!store)return <main className="login">Carregando...</main>;

  const title=tab==="products"?"Produtos":tab==="promotions"?"Promoções":tab==="reviews"?"Avaliações":"Configurações";

  return <main className="admin"><aside><div className="aside-brand"><b>E</b><span>Painel Exale<small>Integrado ao site</small></span></div>{[["products","Produtos"],["promotions","Promoções"],["reviews","Avaliações"],["settings","Configurações"]].map(([x,y])=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{y}</button>)}<a href="/" target="_blank">Abrir site</a></aside><section className="content"><header><div><span>ADMINISTRAÇÃO</span><h1>{title}</h1></div><button className="save" disabled={saving} onClick={save}>{saving?"Salvando...":"Salvar e sincronizar"}</button></header>{message&&<div className="message">{message}</div>}
  {tab==="products"&&<><div className="toolbar"><button onClick={()=>setStore((s:any)=>({...s,products:[...s.products,product()]}))}>+ Novo produto</button></div><List items={store.products} list="products" update={update} remove={remove} render={(p:any,i:number)=><><Field label="Nome" value={p.name} onChange={(v:string)=>update("products",i,"name",v)}/><Field label="Categoria" value={p.category} onChange={(v:string)=>update("products",i,"category",v)}/><Field full label="Imagem (URL)" value={p.imageUrl} onChange={(v:string)=>update("products",i,"imageUrl",v)}/><Field full textarea label="Descrição" value={p.description} onChange={(v:string)=>update("products",i,"description",v)}/><Field type="number" label="Preço normal" value={p.price} onChange={(v:string)=>update("products",i,"price",Number(v))}/><Field type="number" label="Preço promocional" value={p.promotionalPrice} onChange={(v:string)=>update("products",i,"promotionalPrice",Number(v))}/><Field type="number" label="Estoque" value={p.stock} onChange={(v:string)=>update("products",i,"stock",Number(v))}/><Check label="Destacar produto" checked={p.featured} onChange={(v:boolean)=>update("products",i,"featured",v)}/><Check label="Produto ativo" checked={p.active!==false} onChange={(v:boolean)=>update("products",i,"active",v)}/></>}/></>}
  {tab==="promotions"&&<><div className="toolbar"><button onClick={()=>setStore((s:any)=>({...s,promotions:[...s.promotions,promotion()]}))}>+ Criar promoção</button></div><List items={store.promotions} list="promotions" update={update} remove={remove} render={(p:any,i:number)=><><Field label="Título" value={p.title} onChange={(v:string)=>update("promotions",i,"title",v)}/><Field label="Selo" value={p.badge} onChange={(v:string)=>update("promotions",i,"badge",v)}/><Field full label="Imagem (URL)" value={p.imageUrl} onChange={(v:string)=>update("promotions",i,"imageUrl",v)}/><Field full textarea label="Descrição" value={p.description} onChange={(v:string)=>update("promotions",i,"description",v)}/><Field type="datetime-local" label="Início" value={p.startDate} onChange={(v:string)=>update("promotions",i,"startDate",v)}/><Field type="datetime-local" label="Fim" value={p.endDate} onChange={(v:string)=>update("promotions",i,"endDate",v)}/><Check label="Promoção ativa" checked={p.active!==false} onChange={(v:boolean)=>update("promotions",i,"active",v)}/></>}/></>}
  {tab==="reviews"&&<><div className="toolbar"><button onClick={()=>setStore((s:any)=>({...s,reviews:[...s.reviews,review()]}))}>+ Nova avaliação</button></div><List items={store.reviews} list="reviews" update={update} remove={remove} render={(r:any,i:number)=><><Field label="Nome do cliente" value={r.name} onChange={(v:string)=>update("reviews",i,"name",v)}/><Field type="number" label="Nota" value={r.rating} onChange={(v:string)=>update("reviews",i,"rating",Number(v))}/><Field full label="Foto (URL)" value={r.photoUrl} onChange={(v:string)=>update("reviews",i,"photoUrl",v)}/><Field full textarea label="Comentário" value={r.comment} onChange={(v:string)=>update("reviews",i,"comment",v)}/><Check label="Avaliação ativa" checked={r.active!==false} onChange={(v:boolean)=>update("reviews",i,"active",v)}/></>}/></>}
  {tab==="settings"&&<article className="card"><div className="form"><Field label="Nome da loja" value={store.settings.storeName} onChange={(v:string)=>updateSettings("storeName",v)}/><Field label="Slogan" value={store.settings.slogan} onChange={(v:string)=>updateSettings("slogan",v)}/><Field full label="Logotipo (URL)" value={store.settings.logoUrl} onChange={(v:string)=>updateSettings("logoUrl",v)}/><Field full label="Título principal" value={store.settings.heroTitle} onChange={(v:string)=>updateSettings("heroTitle",v)}/><Field full textarea label="Texto principal" value={store.settings.heroSubtitle} onChange={(v:string)=>updateSettings("heroSubtitle",v)}/><Field label="WhatsApp com DDI" value={store.settings.whatsapp} onChange={(v:string)=>updateSettings("whatsapp",v.replace(/\D/g,""))}/><Field label="Instagram" value={store.settings.instagram} onChange={(v:string)=>updateSettings("instagram",v)}/><Field label="TikTok" value={store.settings.tiktok} onChange={(v:string)=>updateSettings("tiktok",v)}/><Field label="CNPJ" value={store.settings.cnpj} onChange={(v:string)=>updateSettings("cnpj",v)}/><Field type="color" label="Cor principal" value={store.settings.primaryColor} onChange={(v:string)=>updateSettings("primaryColor",v)}/><Field type="color" label="Cor de destaque" value={store.settings.accentColor} onChange={(v:string)=>updateSettings("accentColor",v)}/><Field full textarea label="Texto do rodapé" value={store.settings.footerText} onChange={(v:string)=>updateSettings("footerText",v)}/></div></article>}
  </section><AdminCss/></main>;
}

function List({items,list,remove,render}:any){return <div className="list">{items.map((item:any,i:number)=><article className="card" key={item.id}><div className="item-head"><h3>{item.name||item.title||"Novo item"}</h3><button onClick={()=>remove(list,i)}>Excluir</button></div><div className="form">{render(item,i)}</div></article>)}</div>}
function Field({label,value,onChange,full,textarea,type="text"}:any){return <label className={full?"field full":"field"}><span>{label}</span>{textarea?<textarea value={value??""} onChange={e=>onChange(e.target.value)}/>:<input type={type} value={value??""} onChange={e=>onChange(e.target.value)}/>}</label>}
function Check({label,checked,onChange}:any){return <label className="check"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>{label}</label>}
function AdminCss(){return <style jsx global>{`*{box-sizing:border-box}body{margin:0}.login{min-height:100vh;display:grid;place-items:center;padding:20px;background:linear-gradient(135deg,#fffaf1,#ead4ae);font-family:Arial;color:#2a160d}.login section{width:min(470px,100%);padding:35px;border-radius:28px;background:#fff;text-align:center;box-shadow:0 22px 70px rgba(42,22,13,.15)}.login section>div{width:70px;height:70px;display:grid;place-items:center;margin:auto;border-radius:22px;background:#2a160d;color:#fff;font-size:30px;font-weight:950}.login h1{font-size:42px;margin:14px 0 5px}.login input,.login button{width:100%;padding:14px;border-radius:999px}.login input{border:1px solid #d5c3aa}.login button{margin-top:10px;border:0;background:#2a160d;color:#fff;font-weight:950}.login small{display:block;margin-top:10px;color:#a22}.admin{min-height:100vh;display:grid;grid-template-columns:255px 1fr;background:#f7f1e7;font-family:Arial;color:#2a160d}.admin aside{position:sticky;top:0;height:100vh;padding:20px;background:#24130b;color:#fff}.aside-brand{display:flex;align-items:center;gap:10px;margin-bottom:25px}.aside-brand>b{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:#c79533}.aside-brand span,.aside-brand small{display:block}.aside-brand small{color:#d9c3a4;margin-top:3px}.admin aside button,.admin aside a{width:100%;display:block;margin:7px 0;padding:12px 14px;border:0;border-radius:13px;background:transparent;color:#fff;text-align:left;text-decoration:none;font-weight:850}.admin aside .active,.admin aside button:hover,.admin aside a:hover{background:rgba(255,255,255,.1)}.content{padding:28px;min-width:0}.content>header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.content>header span{font-size:11px;color:#a67523;font-weight:950;letter-spacing:.1em}.content>header h1{font-size:48px;margin:5px 0 0}.save,.toolbar button{border:0;border-radius:999px;padding:13px 18px;background:#2a160d;color:#fff;font-weight:950}.message{padding:13px 16px;margin-bottom:15px;border-radius:14px;background:#e5f4e9;color:#1f6a39;font-weight:850}.toolbar{margin-bottom:15px}.list{display:grid;gap:15px}.card{padding:20px;border:1px solid rgba(42,22,13,.12);border-radius:22px;background:#fff;box-shadow:0 10px 30px rgba(42,22,13,.06)}.item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.item-head h3{margin:0}.item-head button{border:0;border-radius:999px;padding:8px 11px;color:#a22;background:#feeaea}.form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field{display:block}.field.full{grid-column:1/-1}.field span{display:block;margin-bottom:6px;font-size:11px;font-weight:950}.field input,.field textarea{width:100%;padding:12px;border:1px solid #ddcdb7;border-radius:13px}.field textarea{min-height:95px}.check{display:flex;align-items:center;gap:8px;padding:12px;border-radius:13px;background:#f4ead8;font-weight:800}@media(max-width:850px){.admin{grid-template-columns:1fr}.admin aside{position:relative;height:auto}.content{padding:15px}.content>header{align-items:stretch;flex-direction:column}.form{grid-template-columns:1fr}.field.full{grid-column:auto}}`}</style>}
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

cat > src/app/carrinho/page.tsx <<'EOF'
"use client";
import { useEffect,useMemo,useState } from "react";
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function Cart(){
 const[items,setItems]=useState<any[]>([]);const[settings,setSettings]=useState<any>({});const[form,setForm]=useState<any>({name:"",email:"",phone:"",cep:"",street:"",number:"",neighborhood:"",city:"",state:""});
 useEffect(()=>{setItems(JSON.parse(localStorage.getItem("exale-cart-v2")||"[]"));fetch(`/api/store?t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()).then(d=>setSettings(d.settings||{}))},[]);
 useEffect(()=>localStorage.setItem("exale-cart-v2",JSON.stringify(items)),[items]);
 const total=useMemo(()=>items.reduce((s,i)=>s+(i.promotionalPrice>0?i.promotionalPrice:i.price)*i.quantity,0),[items]);
 async function cep(v:string){setForm((f:any)=>({...f,cep:v}));const d=v.replace(/\D/g,"");if(d.length!==8)return;const r=await fetch(`https://viacep.com.br/ws/${d}/json/`);const x=await r.json();if(!x.erro)setForm((f:any)=>({...f,street:x.logradouro||"",neighborhood:x.bairro||"",city:x.localidade||"",state:x.uf||""}))}
 function finish(){if(!items.length)return alert("Carrinho vazio.");if(!form.name||!form.phone||!form.cep||!form.street||!form.number)return alert("Preencha os campos obrigatórios.");const p=items.map((i,n)=>`${n+1}. ${i.name}\nQuantidade: ${i.quantity}\nSubtotal: ${money((i.promotionalPrice>0?i.promotionalPrice:i.price)*i.quantity)}`).join("\n\n");const m=`*NOVO PEDIDO EXALE*\n\n${p}\n\n*TOTAL: ${money(total)}*\n\nNome: ${form.name}\nE-mail: ${form.email}\nTelefone: ${form.phone}\nEndereço: ${form.street}, ${form.number} - ${form.neighborhood} - ${form.city}/${form.state} - CEP ${form.cep}`;window.location.href=`https://wa.me/${String(settings.whatsapp||"").replace(/\D/g,"")}?text=${encodeURIComponent(m)}`}
 return <main className="cart"><header><a href="/">← Voltar</a><h1>Finalizar compra</h1></header><div className="layout"><section><h2>Seu pedido</h2>{items.length===0&&<p>Carrinho vazio.</p>}{items.map((i,n)=><article key={i.id}><img src={i.imageUrl||"/exale-produto-sem-foto.svg"} alt={i.name}/><div><strong>{i.name}</strong><span>{money(i.promotionalPrice>0?i.promotionalPrice:i.price)}</span><div className="qty"><button onClick={()=>setItems(items.map((x,k)=>k===n?{...x,quantity:Math.max(1,x.quantity-1)}:x))}>−</button><b>{i.quantity}</b><button onClick={()=>setItems(items.map((x,k)=>k===n?{...x,quantity:x.quantity+1}:x))}>+</button></div></div><button className="remove" onClick={()=>setItems(items.filter((_,k)=>k!==n))}>Remover</button></article>)}<div className="total">Total <strong>{money(total)}</strong></div></section><section><h2>Dados para entrega</h2><div className="form">{[["name","Nome completo *"],["email","E-mail"],["phone","Telefone *"],["cep","CEP *"],["street","Rua *"],["number","Número *"],["neighborhood","Bairro"],["city","Cidade"],["state","Estado"]].map(([k,l])=><label key={k}><span>{l}</span><input value={form[k]} onChange={e=>k==="cep"?cep(e.target.value):setForm((f:any)=>({...f,[k]:e.target.value}))}/></label>)}</div><button className="finish" onClick={finish}>Finalizar pelo WhatsApp</button></section></div><style jsx global>{`*{box-sizing:border-box}body{margin:0;background:#f8f1e5;color:#2a160d;font-family:Arial}.cart{min-height:100vh;padding:20px}.cart>header,.layout{width:min(1100px,100%);margin:auto}.cart h1{font-size:48px}.layout{display:grid;grid-template-columns:1fr 1fr;gap:18px}.layout>section{padding:22px;border-radius:24px;background:#fff}.layout article{display:grid;grid-template-columns:80px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eadfce}.layout article img{width:80px;height:80px;border-radius:14px;object-fit:cover}.layout article strong,.layout article span{display:block}.qty{display:flex;gap:8px;align-items:center;margin-top:8px}.qty button,.remove{border:0;border-radius:999px;padding:7px 10px}.total{display:flex;justify-content:space-between;margin-top:18px;font-size:22px}.form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form label span{display:block;margin-bottom:5px;font-size:11px;font-weight:900}.form input{width:100%;padding:12px;border:1px solid #dbcab2;border-radius:12px}.finish{width:100%;margin-top:15px;padding:14px;border:0;border-radius:999px;background:#167849;color:#fff;font-weight:950}@media(max-width:800px){.layout{grid-template-columns:1fr}.form{grid-template-columns:1fr}}`}</style></main>
}
EOF

cat > src/app/layout.tsx <<'EOF'
import type { Metadata } from "next";
export const metadata:Metadata={title:"Exale Cosméticos Naturais",description:"Cosméticos naturais, promoções e atendimento personalizado."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
EOF

rm -rf \
  src/app/api/products src/app/api/settings src/app/api/storefront \
  src/app/api/admin/data src/app/api/admin/products \
  src/app/api/admin/upsert-product src/app/api/admin/remove-product \
  src/app/api/admin/sync-site \
  src/components/exale-storefront-full.tsx \
  src/components/exale-admin-full.tsx \
  src/components/exale-admin-client-shell.tsx \
  src/components/exale-company-reviews.tsx \
  src/lib/github-live-store.ts src/lib/live-storefront-fresh.ts \
  2>/dev/null || true

node -e 'JSON.parse(require("fs").readFileSync("content/store.json","utf8")); console.log("[OK] store.json válido")'
rm -rf .next .turbo node_modules/.cache .vercel/output 2>/dev/null || true
npm run build

git add src content public package.json package-lock.json next.config.ts tsconfig.json
if ! git diff --cached --quiet; then
  git commit -m "reconstrói site e painel Exale sincronizados"
fi

git fetch origin main
if [ "$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)" != "0" ]; then
  git merge origin/main --no-edit
  npm run build
fi

git push origin main
vercel --prod --force

echo
echo "CONCLUÍDO"
echo "Site: https://exale-cosmeticos-naturais.vercel.app"
echo "Painel: https://exale-cosmeticos-naturais.vercel.app/painel-exale"
echo "Senha padrão: exale-admin-2026"
echo "Backup: $BACKUP"
echo
echo "Configure na Vercel:"
echo "ADMIN_PASSWORD=uma_senha_forte"
echo "GITHUB_REPO=anonimatoo/exale-cosmeticos-naturais"
echo "GITHUB_BRANCH=main"
echo "GITHUB_TOKEN=token_com_permissao_contents_write"
