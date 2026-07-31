/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "node:fs";
import path from "node:path";

const FILE_PATH = "content/landing-page.json";

export const defaultHtml = `
<section class="hero">
  <div>
    <span>Especial Exale</span>
    <h1>Faça quem você ama feliz</h1>
    <p>Cosméticos naturais, velas artesanais e presentes premium para encantar.</p>
    <a href="#produtos">Ver produtos</a>
  </div>
</section>

<section class="cards">
  <article><strong>Entrega rápida</strong><p>Atendimento pelo WhatsApp</p></article>
  <article><strong>Kits artesanais</strong><p>Presentes especiais</p></article>
  <article><strong>Brilho premium</strong><p>Produtos selecionados</p></article>
</section>

<section class="section">
  <span>Linhas Exale</span>
  <h2>Escolha sua linha favorita</h2>
  <p>Edite esta landing page visualmente pelo GrapesJS.</p>
</section>

<section id="produtos" class="section">
  <span>Produtos do painel</span>
  <h2>Produtos Exale atualizados</h2>
  <p>Os produtos abaixo vêm automaticamente da API /api/products.</p>
  <div data-exale-products class="products-grid">
    <div class="loading">Carregando produtos...</div>
  </div>
</section>

<section class="whats">
  <h2>Quer comprar agora?</h2>
  <p>Fale pelo WhatsApp e receba atendimento personalizado.</p>
  <a href="https://wa.me/?text=Olá! Tenho interesse nos produtos Exale." target="_blank">Compre pelo WhatsApp</a>
</section>
`;

export const defaultCss = `
body{margin:0;background:linear-gradient(180deg,#fff4dc,#fffaf1 50%,#f6e2bd);color:#5b2d12;font-family:Arial,Helvetica,sans-serif}
*{box-sizing:border-box}
.hero{width:min(1180px,calc(100% - 24px));margin:24px auto;padding:clamp(36px,7vw,90px);border-radius:34px;background:linear-gradient(135deg,#2b1609,#7a461f);color:#fff4dc;box-shadow:0 24px 70px rgba(91,45,18,.22)}
.hero span,.section span{display:inline-flex;border-radius:999px;padding:9px 14px;background:#fff0cc;color:#5b2d12;font-weight:900;margin-bottom:14px}
.hero h1,.section h2,.whats h2{margin:0;font-size:clamp(42px,7vw,82px);line-height:.9;letter-spacing:-.07em}
.hero p,.section p,.whats p{font-size:18px;line-height:1.55}
.hero a,.whats a,.product-card a{display:inline-flex;justify-content:center;border-radius:999px;padding:15px 22px;background:linear-gradient(135deg,#c4942b,#f4d676);color:#2b1609;text-decoration:none;font-weight:950}
.cards{width:min(1180px,calc(100% - 24px));margin:20px auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cards article,.product-card{border-radius:24px;padding:20px;background:#fffaf1;border:1px solid rgba(122,70,31,.16);box-shadow:0 14px 34px rgba(91,45,18,.08)}
.section,.whats{width:min(1180px,calc(100% - 24px));margin:72px auto;text-align:center}
.products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:24px;text-align:left}
.product-card{padding:0;overflow:hidden}
.product-card img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#fff0cc}
.product-card div{padding:16px}
.product-card h3{min-height:42px;margin:0 0 8px;font-size:18px}
.product-card small{color:#7a461f;font-weight:900}
.product-card strong{display:block;font-size:21px;margin:10px 0}
.product-card a{width:100%;background:#21c063;color:#fff}
.loading{grid-column:1/-1;padding:20px;border-radius:20px;background:#fffaf1;text-align:center;font-weight:900}
.whats{padding:54px 20px;border-radius:34px;background:linear-gradient(135deg,#2b1609,#7a461f);color:#fff4dc}
@media(max-width:900px){.cards,.products-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.cards,.products-grid{grid-template-columns:1fr}}
`;

function getToken() {
  return process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PAT ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_ACCESS_TOKEN ||
    "";
}

function getRepo() {
  const repoEnv = process.env.GITHUB_REPO || "";
  const [ownerFromFull, repoFromFull] = repoEnv.includes("/") ? repoEnv.split("/") : ["", ""];

  return {
    token: getToken(),
    owner: process.env.GITHUB_OWNER || process.env.GITHUB_REPO_OWNER || ownerFromFull || "anonimatoo",
    repo: process.env.GITHUB_REPO_NAME || process.env.GITHUB_PROJECT || repoFromFull || "exale-cosmeticos-naturais",
    branch: process.env.GITHUB_BRANCH || process.env.GIT_BRANCH || "main",
  };
}

function enc(value: string) {
  return String(value || "").split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function localPage() {
  try {
    const full = path.join(process.cwd(), FILE_PATH);
    if (fs.existsSync(full)) {
      const j = JSON.parse(fs.readFileSync(full, "utf8"));
      return {
        ok: true,
        html: j.html || defaultHtml,
        css: j.css || defaultCss,
        projectData: j.projectData || null,
        source: "local",
        updatedAt: j.updatedAt || new Date().toISOString(),
      };
    }
  } catch {}

  return {
    ok: true,
    html: defaultHtml,
    css: defaultCss,
    projectData: null,
    source: "default",
    updatedAt: new Date().toISOString(),
  };
}

async function githubRequest(method: string, apiPath: string, body?: any) {
  const cfg = getRepo();

  if (!cfg.token) {
    throw new Error("GITHUB_TOKEN ausente na Vercel.");
  }

  const response = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/${apiPath.replace(/^\/+/, "")}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GitHub ${response.status}: ${text.slice(0, 300)}`);
  }

  return response.json();
}

async function getGithubFile() {
  const cfg = getRepo();
  return githubRequest("GET", `contents/${enc(FILE_PATH)}?ref=${encodeURIComponent(cfg.branch)}`);
}

export async function getLandingPage() {
  try {
    const file = await getGithubFile();
    const text = Buffer.from(String(file.content || "").replace(/\n/g, ""), "base64").toString("utf8");
    const j = JSON.parse(text || "{}");

    return {
      ok: true,
      html: j.html || defaultHtml,
      css: j.css || defaultCss,
      projectData: j.projectData || null,
      source: "github",
      updatedAt: j.updatedAt || new Date().toISOString(),
    };
  } catch {
    return localPage();
  }
}

export async function saveLandingPage(input: any) {
  const cfg = getRepo();

  const next = {
    html: String(input?.html || defaultHtml),
    css: String(input?.css || defaultCss),
    projectData: input?.projectData || null,
    updatedAt: new Date().toISOString(),
  };

  let sha = "";

  try {
    const current = await getGithubFile();
    sha = current?.sha || "";
  } catch {}

  const body: any = {
    message: "atualiza landing page pelo GrapesJS",
    content: Buffer.from(JSON.stringify(next, null, 2) + "\n", "utf8").toString("base64"),
    branch: cfg.branch,
  };

  if (sha) body.sha = sha;

  await githubRequest("PUT", `contents/${enc(FILE_PATH)}`, body);

  return {
    ok: true,
    ...next,
    source: "github",
  };
}

export function productScript() {
  return `
<script>
(function(){
  function money(v){var n=Number(v||0);try{return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}catch(e){return "R$ "+n.toFixed(2).replace(".",",");}}
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function pick(d){return Array.isArray(d)?d:Array.isArray(d&&d.products)?d.products:Array.isArray(d&&d.produtos)?d.produtos:[];}

  fetch("/api/products?landing="+Date.now(),{cache:"no-store"})
    .then(function(r){return r.json();})
    .then(function(d){
      var p=pick(d);
      document.querySelectorAll("[data-exale-products]").forEach(function(box){
        if(!p.length){box.innerHTML='<div class="loading">Nenhum produto encontrado.</div>';return;}
        box.innerHTML=p.map(function(x){
          var name=x.name||x.nome||x.title||"Produto Exale";
          var img=x.image||x.imagem||x.foto||"/exale-produto-sem-foto.svg";
          var price=x.price!=null?x.price:x.preco||0;
          var cat=x.category||x.categoria||x.line||"Exale";

          return '<article class="product-card"><img src="'+esc(img)+'" onerror="this.src=\\'/exale-produto-sem-foto.svg\\'"><div><small>'+esc(cat)+'</small><h3>'+esc(name)+'</h3><strong>'+money(price)+'</strong><a target="_blank" href="https://wa.me/?text='+encodeURIComponent("Olá! Tenho interesse no produto "+name+" - "+money(price))+'">Comprar</a></div></article>';
        }).join("");
      });
    })
    .catch(function(){
      document.querySelectorAll("[data-exale-products]").forEach(function(box){
        box.innerHTML='<div class="loading">Erro ao carregar produtos.</div>';
      });
    });
})();
</script>`;
}
