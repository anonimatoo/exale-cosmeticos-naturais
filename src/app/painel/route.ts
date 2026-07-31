export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const html = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
<title>Painel Administrativo Exale</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Arial,sans-serif;background:#fff4dc;color:#5b2d12}body{background:linear-gradient(180deg,#fff4dc,#fff9eb 45%,#f6e2bd)}button,a{border:0;border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer;text-decoration:none}.primary{background:linear-gradient(135deg,#2b1609,#c4942b);color:#fff}.secondary{background:#fff0cc;color:#5b2d12}.danger{background:#fee2e2;color:#7f1d1d}.page{min-height:100vh;padding:14px}.box{width:min(1180px,100%);margin:auto;padding:clamp(18px,4vw,34px);border-radius:28px;background:rgba(255,250,241,.96);box-shadow:0 20px 56px rgba(91,45,18,.14)}.top,.head,.actions{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap}h1{font-size:clamp(32px,7vw,62px);line-height:.95;margin:0}h2{margin:0}.nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.panel{padding:18px;border:1px solid #ead4aa;border-radius:24px;background:#fffaf1}input,textarea{width:100%;padding:13px;border-radius:14px;border:1px solid #dbc08e;background:#fff;color:#5b2d12;font-weight:700}textarea{min-height:110px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px;margin-top:16px}.card{display:grid;grid-template-columns:92px 1fr;gap:12px;padding:12px;border:1px solid #ead4aa;border-radius:20px;background:#fff}.card img{width:92px;height:92px;object-fit:cover;border-radius:14px;background:#fff3d4}.card h3{margin:0}.card small,.card span{display:block;margin:4px 0;color:#7a461f;word-break:break-word}.empty{padding:18px;border-radius:16px;background:#fff}.modal,.login{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:14px;background:rgba(43,22,9,.75)}.modal[hidden],.login[hidden],.page[hidden]{display:none}.dialog{width:min(760px,100%);max-height:94vh;overflow:auto;padding:22px;border-radius:24px;background:#fffaf1;box-shadow:0 30px 90px rgba(0,0,0,.4)}.login .dialog{width:min(430px,100%)}label{display:block;margin:12px 0 6px;font-weight:900}.preview{display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:center;padding:14px;border-radius:18px;background:#fff0cc}.preview img{width:110px;height:110px;object-fit:cover;border-radius:15px}.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:12000;width:min(560px,calc(100vw - 24px));padding:14px;border-radius:16px;text-align:center;font-weight:900;background:#dbeafe}.toast.ok{background:#dcfce7;color:#064e3b}.toast.error{background:#fee2e2;color:#7f1d1d}@media(max-width:650px){.box{padding:16px}.grid{grid-template-columns:1fr}.nav button,#search{width:100%}}
</style>
</head>
<body>
<section id="login" class="login">
  <div class="dialog">
    <h2>Acesso administrativo</h2>
    <p>Digite a senha administrativa para acessar o painel.</p>
    <label for="adminPassword">Senha administrativa</label>
    <input id="adminPassword" type="password" autocomplete="current-password" />
    <div class="actions" style="margin-top:16px">
      <a class="secondary" href="/">Voltar à loja</a>
      <button id="btnLogin" class="primary" type="button">Entrar com segurança</button>
    </div>
  </div>
</section>

<main id="app" class="page" hidden>
<section class="box">
<header class="top"><div><h1>Painel Administrativo Exale</h1><p>Cadastre, edite e remova produtos. As alterações são salvas na mesma fonte usada pelo site.</p></div><div class="actions"><a class="secondary" href="/" target="_blank">Abrir loja</a><button id="btnLogout" class="danger">Sair</button></div></header>
<nav class="nav"><button id="btnReload" class="primary">Atualizar produtos</button><button id="btnNew" class="secondary">Novo produto</button></nav>
<section class="panel"><div class="head"><div><h2>Produtos cadastrados</h2><p id="status">Aguardando autenticação...</p></div><input id="search" placeholder="Buscar produto..." /></div><div id="grid" class="grid"></div></section>
</section>
</main>

<section id="modal" class="modal" hidden>
<div class="dialog">
<div class="head"><div><h2 id="modalTitle">Novo produto</h2><p>Preencha os dados do produto.</p></div><button id="btnClose" class="secondary">×</button></div>
<div class="preview"><img id="previewImg" src="/exale-produto-sem-foto.svg" alt="Prévia"><div><h3 id="previewName">Nome do produto</h3><strong id="previewPrice">R$ 0,00</strong><p id="previewDesc">Descrição do produto.</p></div></div>
<label for="name">Nome</label><input id="name" />
<label for="slug">Slug</label><input id="slug" />
<label for="price">Preço</label><input id="price" inputmode="decimal" />
<label for="category">Categoria</label><input id="category" />
<label for="file">Imagem</label><input id="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
<input id="image" type="hidden" /><small id="uploadStatus">Nenhuma imagem enviada.</small>
<label for="description">Descrição</label><textarea id="description"></textarea>
<div class="actions" style="margin-top:16px"><button id="btnCancel" class="secondary">Cancelar</button><button id="btnDelete" class="danger" hidden>Excluir produto</button><button id="btnSave" class="primary">Salvar e atualizar site</button></div>
</div>
</section>
<div id="toast" class="toast" hidden></div>
<script>
(function(){
  "use strict";
  var PLACEHOLDER="/exale-produto-sem-foto.svg";
  var password="";
  var store={settings:{},products:[],promotions:[],reviews:[],categories:[]};
  var products=[];
  var editingSlug="";
  var saving=false;
  function q(id){return document.getElementById(id);}
  function text(v){return v==null?"":String(v);}
  function slugify(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
  function number(v){var n=Number(text(v).replace(/\./g,"").replace(",","."));return Number.isFinite(n)?n:0;}
  function money(v){return number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
  function escapeHtml(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");}
  function imageOf(p){return p.imageUrl||p.image||p.imagem||(Array.isArray(p.images)&&p.images[0])||PLACEHOLDER;}
  function normalize(p){p=p||{};var name=p.name||p.nome||p.title||"Produto";var category=p.category||p.categoria||p.line||"Cosméticos Naturais";var description=p.description||p.descricao||p.shortText||p.shortDescription||"";var price=p.price!=null?p.price:(p.preco!=null?p.preco:0);var image=imageOf(p);return Object.assign({},p,{id:text(p.id||p.slug||slugify(name)),slug:slugify(p.slug||p.id||name),name:name,nome:name,title:name,titulo:name,category:category,categoria:category,line:category,description:description,descricao:description,price:number(price),preco:number(price),image:image,imagem:image,imageUrl:image,images:image&&image!==PLACEHOLDER?[image]:[],active:p.active!==false,ativo:p.ativo!==false});}
  function toast(message,type){var el=q("toast");el.textContent=message;el.className="toast "+(type||"");el.hidden=false;setTimeout(function(){el.hidden=true;},type==="error"?7000:3500);}
  function headers(json){var h={"x-admin-password":password};if(json)h["Content-Type"]="application/json";return h;}
  async function jsonResponse(response){var data=await response.json().catch(function(){return {};});if(!response.ok||data.ok===false)throw new Error(data.message||("Erro HTTP "+response.status));return data;}
  async function login(){var candidate=q("adminPassword").value;if(!candidate){toast("Digite a senha administrativa.","error");return;}try{var response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:candidate})});await jsonResponse(response);password=candidate;sessionStorage.setItem("exale-admin-password",candidate);q("login").hidden=true;q("app").hidden=false;await load();toast("Acesso autorizado.","ok");}catch(error){toast(error.message||String(error),"error");}}
  function logout(){sessionStorage.removeItem("exale-admin-password");password="";q("app").hidden=true;q("login").hidden=false;q("adminPassword").value="";}
  function render(){var term=q("search").value.toLowerCase().trim();var list=products.filter(function(p){return !term||[p.name,p.slug,p.category,p.description].join(" ").toLowerCase().includes(term);});q("grid").innerHTML=list.length?list.map(function(p){return '<article class="card"><img src="'+escapeHtml(imageOf(p))+'" alt="'+escapeHtml(p.name)+'"><div><h3>'+escapeHtml(p.name)+'</h3><small>'+escapeHtml(p.slug)+'</small><strong>'+money(p.price)+'</strong><span>'+escapeHtml(p.category)+'</span><div class="actions"><button class="secondary" type="button" data-edit="'+escapeHtml(p.slug)+'">Editar</button></div></div></article>';}).join(""):'<div class="empty">Nenhum produto encontrado.</div>';Array.from(document.querySelectorAll("[data-edit]")).forEach(function(button){button.addEventListener("click",function(){openEditor(products.find(function(p){return p.slug===button.dataset.edit;}));});});Array.from(document.querySelectorAll(".card img")).forEach(function(img){img.addEventListener("error",function(){img.src=PLACEHOLDER;},{once:true});});}
  async function load(){q("status").textContent="Carregando produtos...";try{var response=await fetch("/api/store?t="+Date.now(),{cache:"no-store"});var data=await jsonResponse(response);store={settings:data.settings||{},products:Array.isArray(data.products)?data.products:[],promotions:Array.isArray(data.promotions)?data.promotions:[],reviews:Array.isArray(data.reviews)?data.reviews:[],categories:Array.isArray(data.categories)?data.categories:[]};products=store.products.map(normalize);q("status").textContent=products.length+" produto(s) carregado(s)";render();}catch(error){q("status").textContent="Erro ao carregar produtos";toast(error.message||String(error),"error");}}
  function openEditor(product){var p=product?normalize(product):normalize({name:"",slug:"",price:0,category:"Cosméticos Naturais",description:"",image:""});editingSlug=product?p.slug:"";q("modalTitle").textContent=editingSlug?"Editar produto":"Novo produto";q("name").value=product?p.name:"";q("slug").value=product?p.slug:"";q("price").value=product?String(p.price):"";q("category").value=product?p.category:"Cosméticos Naturais";q("description").value=product?p.description:"";q("image").value=product&&imageOf(p)!==PLACEHOLDER?imageOf(p):"";q("btnDelete").hidden=!editingSlug;updatePreview();q("modal").hidden=false;setTimeout(function(){q("name").focus();},0);}
  function closeEditor(){if(!saving)q("modal").hidden=true;}
  function updatePreview(){q("previewName").textContent=q("name").value||"Nome do produto";q("previewPrice").textContent=money(q("price").value);q("previewDesc").textContent=q("description").value||"Descrição do produto.";q("previewImg").src=q("image").value||PLACEHOLDER;}
  async function upload(){var file=q("file").files&&q("file").files[0];if(!file)return;saving=true;q("uploadStatus").textContent="Enviando imagem...";try{var form=new FormData();form.append("file",file);var response=await fetch("/api/admin/upload",{method:"POST",headers:headers(false),body:form});var data=await jsonResponse(response);q("image").value=data.url||"";q("uploadStatus").textContent="Imagem enviada com sucesso.";updatePreview();toast("Imagem enviada.","ok");}catch(error){q("uploadStatus").textContent="Falha no envio.";toast(error.message||String(error),"error");}finally{saving=false;q("file").value="";}}
  async function persist(nextProducts){var payload={settings:store.settings,products:nextProducts,promotions:store.promotions,reviews:store.reviews,categories:store.categories};var response=await fetch("/api/admin/save",{method:"POST",headers:headers(true),body:JSON.stringify(payload)});await jsonResponse(response);store.products=nextProducts;}
  async function save(){var name=q("name").value.trim();if(!name){toast("Informe o nome do produto.","error");return;}saving=true;q("btnSave").disabled=true;q("btnSave").textContent="Salvando...";try{var slug=slugify(q("slug").value||name);var image=q("image").value||"";var existing=products.find(function(p){return p.slug===editingSlug;})||{};var product=normalize(Object.assign({},existing,{id:existing.id||slug,slug:slug,name:name,price:number(q("price").value),category:q("category").value||"Cosméticos Naturais",description:q("description").value||"",image:image,imageUrl:image,images:image?[image]:[]}));var next=products.filter(function(p){return p.slug!==editingSlug&&p.slug!==slug;});next.push(product);await persist(next);products=next.map(normalize);closeEditor();render();toast("Produto salvo e atualizado no site.","ok");}catch(error){toast(error.message||String(error),"error");}finally{saving=false;q("btnSave").disabled=false;q("btnSave").textContent="Salvar e atualizar site";}}
  async function remove(){if(!editingSlug)return;if(!confirm("Excluir este produto?"))return;saving=true;try{var next=products.filter(function(p){return p.slug!==editingSlug;});await persist(next);products=next;closeEditor();render();toast("Produto excluído.","ok");}catch(error){toast(error.message||String(error),"error");}finally{saving=false;}}
  q("btnLogin").addEventListener("click",login);q("adminPassword").addEventListener("keydown",function(e){if(e.key==="Enter")login();});q("btnLogout").addEventListener("click",logout);q("btnReload").addEventListener("click",load);q("btnNew").addEventListener("click",function(){openEditor(null);});q("search").addEventListener("input",render);q("btnClose").addEventListener("click",closeEditor);q("btnCancel").addEventListener("click",closeEditor);q("btnSave").addEventListener("click",save);q("btnDelete").addEventListener("click",remove);q("file").addEventListener("change",upload);["name","price","description"].forEach(function(id){q(id).addEventListener("input",updatePreview);});q("name").addEventListener("input",function(){if(!editingSlug&&!q("slug").value)q("slug").value=slugify(q("name").value);});q("previewImg").addEventListener("error",function(){q("previewImg").src=PLACEHOLDER;});
  var saved=sessionStorage.getItem("exale-admin-password")||"";if(saved){q("adminPassword").value=saved;login();}
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}
