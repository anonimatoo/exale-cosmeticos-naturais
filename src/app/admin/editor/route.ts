
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const html = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <title>Editor Visual Exale</title>
  <link rel="stylesheet" href="https://unpkg.com/grapesjs@0.23.2/dist/css/grapes.min.css" />
  <style>
    html,body{height:100%;margin:0;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#1b1008}
    .top{height:58px;display:flex;align-items:center;gap:10px;padding:8px 12px;background:#2b1609;color:#fff4dc;border-bottom:1px solid rgba(244,214,118,.25)}
    .brand{font-weight:950;color:#f4d676;white-space:nowrap}
    button,a,.file{border:0;border-radius:999px;padding:10px 13px;background:#fff0cc;color:#5b2d12;font-weight:950;text-decoration:none;cursor:pointer;font-size:13px}
    .gold{background:linear-gradient(135deg,#c4942b,#f4d676);color:#2b1609}
    .dark{background:#130807;color:#fff4dc}
    .file input{display:none}
    #status{margin-left:auto;font-size:12px;color:#f4d676;font-weight:800}
    #gjs{height:calc(100vh - 58px)}
    .gjs-one-bg{background-color:#2b1609}
    .gjs-two-color{color:#fff4dc}
    .gjs-three-bg{background-color:#c4942b;color:#2b1609}
    .gjs-four-color,.gjs-four-color-h:hover{color:#f4d676}
    @media(max-width:700px){.top{height:auto;min-height:58px;flex-wrap:wrap}#status{width:100%;margin-left:0}#gjs{height:calc(100vh - 116px)}}
  </style>
</head>
<body>
  <div class="top">
    <div class="brand">Exale Editor Visual</div>
    <button id="save" class="gold" type="button">Salvar landing page</button>
    <a class="dark" href="/landing" target="_blank">Ver landing</a>
    <a href="/" target="_blank">Ver loja</a>
    <label class="file">Enviar imagem <input id="file" type="file" accept="image/*" /></label>
    <button id="reset" type="button">Restaurar modelo</button>
    <span id="status">Carregando...</span>
  </div>

  <div id="gjs"></div>

  <script src="https://unpkg.com/grapesjs@0.23.2/dist/grapes.min.js"></script>
  <script>
(function(){
  var editor;

  function status(text,type){
    var s=document.getElementById("status");
    s.textContent=text;
    s.style.color=type==="error"?"#fecaca":type==="ok"?"#bbf7d0":"#f4d676";
  }

  function htmlDefault(){
    return '<section class="hero"><div><span>Especial Exale</span><h1>Faça quem você ama feliz</h1><p>Cosméticos naturais, velas artesanais e presentes premium para encantar.</p><a href="#produtos">Ver produtos</a></div></section><section class="cards"><article><strong>Entrega rápida</strong><p>Atendimento pelo WhatsApp</p></article><article><strong>Kits artesanais</strong><p>Presentes especiais</p></article><article><strong>Brilho premium</strong><p>Produtos selecionados</p></article></section><section class="section"><span>Linhas Exale</span><h2>Escolha sua linha favorita</h2><p>Edite esta landing page visualmente pelo GrapesJS.</p></section><section id="produtos" class="section"><span>Produtos do painel</span><h2>Produtos Exale atualizados</h2><p>Os produtos abaixo vêm automaticamente da API /api/products.</p><div data-exale-products class="products-grid"><div class="loading">Carregando produtos...</div></div></section><section class="whats"><h2>Quer comprar agora?</h2><p>Fale pelo WhatsApp e receba atendimento personalizado.</p><a href="https://wa.me/?text=Olá! Tenho interesse nos produtos Exale." target="_blank">Compre pelo WhatsApp</a></section>';
  }

  function cssDefault(){
    return 'body{margin:0;background:linear-gradient(180deg,#fff4dc,#fffaf1 50%,#f6e2bd);color:#5b2d12;font-family:Arial,Helvetica,sans-serif}*{box-sizing:border-box}.hero{width:min(1180px,calc(100% - 24px));margin:24px auto;padding:clamp(36px,7vw,90px);border-radius:34px;background:linear-gradient(135deg,#2b1609,#7a461f);color:#fff4dc;box-shadow:0 24px 70px rgba(91,45,18,.22)}.hero span,.section span{display:inline-flex;border-radius:999px;padding:9px 14px;background:#fff0cc;color:#5b2d12;font-weight:900;margin-bottom:14px}.hero h1,.section h2,.whats h2{margin:0;font-size:clamp(42px,7vw,82px);line-height:.9;letter-spacing:-.07em}.hero p,.section p,.whats p{font-size:18px;line-height:1.55}.hero a,.whats a,.product-card a{display:inline-flex;justify-content:center;border-radius:999px;padding:15px 22px;background:linear-gradient(135deg,#c4942b,#f4d676);color:#2b1609;text-decoration:none;font-weight:950}.cards{width:min(1180px,calc(100% - 24px));margin:20px auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cards article,.product-card{border-radius:24px;padding:20px;background:#fffaf1;border:1px solid rgba(122,70,31,.16);box-shadow:0 14px 34px rgba(91,45,18,.08)}.section,.whats{width:min(1180px,calc(100% - 24px));margin:72px auto;text-align:center}.products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:24px;text-align:left}.product-card{padding:0;overflow:hidden}.product-card img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#fff0cc}.product-card div{padding:16px}.product-card h3{min-height:42px;margin:0 0 8px;font-size:18px}.product-card small{color:#7a461f;font-weight:900}.product-card strong{display:block;font-size:21px;margin:10px 0}.product-card a{width:100%;background:#21c063;color:#fff}.loading{grid-column:1/-1;padding:20px;border-radius:20px;background:#fffaf1;text-align:center;font-weight:900}.whats{padding:54px 20px;border-radius:34px;background:linear-gradient(135deg,#2b1609,#7a461f);color:#fff4dc}@media(max-width:900px){.cards,.products-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.cards,.products-grid{grid-template-columns:1fr}}';
  }

  function blocks(){
    var bm=editor.BlockManager;

    bm.add("hero-exale",{label:"Hero Exale",category:"Exale",content:'<section class="hero"><div><span>Especial Exale</span><h1>Faça quem você ama feliz</h1><p>Texto da oferta especial.</p><a href="#produtos">Ver produtos</a></div></section>'});
    bm.add("texto-exale",{label:"Texto",category:"Exale",content:'<section class="section"><span>Exale</span><h2>Título da seção</h2><p>Texto personalizado.</p></section>'});
    bm.add("produtos-api",{label:"Produtos da API",category:"Exale",content:'<section id="produtos" class="section"><span>Produtos do painel</span><h2>Produtos Exale atualizados</h2><p>Produtos carregados automaticamente.</p><div data-exale-products class="products-grid"><div class="loading">Produtos aparecem na landing publicada.</div></div></section>'});
    bm.add("whatsapp",{label:"WhatsApp",category:"Exale",content:'<section class="whats"><h2>Quer comprar agora?</h2><p>Fale pelo WhatsApp.</p><a href="https://wa.me/?text=Olá! Tenho interesse nos produtos Exale." target="_blank">Compre pelo WhatsApp</a></section>'});
  }

  async function load(){
    status("Carregando landing...");
    var r=await fetch("/api/admin/landing-page?t="+Date.now(),{cache:"no-store"});
    var d=await r.json().catch(function(){return {};});

    editor=grapesjs.init({
      container:"#gjs",
      height:"calc(100vh - 58px)",
      fromElement:false,
      storageManager:false,
      noticeOnUnload:false,
      components:d.html||htmlDefault(),
      style:d.css||cssDefault(),
      assetManager:{upload:false,assets:[]}
    });

    blocks();
    status("Editor carregado.","ok");
  }

  async function save(){
    if(!editor)return;
    status("Salvando...");

    var r=await fetch("/api/admin/landing-page",{
      method:"POST",
      cache:"no-store",
      headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify({
        html:editor.getHtml(),
        css:editor.getCss(),
        projectData:editor.getProjectData ? editor.getProjectData() : null
      })
    });

    var d=await r.json().catch(function(){return {};});

    if(!r.ok||d.ok===false){
      status(d.message||"Erro ao salvar.","error");
      alert(d.message||"Erro ao salvar.");
      return;
    }

    status("Salvo com sucesso.","ok");
    alert("Landing page salva com sucesso!");
  }

  async function upload(file){
    if(!file||!editor)return;
    status("Enviando imagem...");

    var fd=new FormData();
    fd.append("file",file);
    fd.append("productName","landing-page");

    var r=await fetch("/api/admin/upload-product-image",{method:"POST",cache:"no-store",body:fd});
    var d=await r.json().catch(function(){return {};});

    if(!r.ok||d.ok===false){
      status(d.message||"Erro ao enviar imagem.","error");
      alert(d.message||"Erro ao enviar imagem.");
      return;
    }

    var url=d.image||d.url||d.imagem;
    editor.AssetManager.add({src:url,name:file.name||"Imagem"});

    var selected=editor.getSelected();
    if(selected && selected.is && selected.is("image")){
      selected.addAttributes({src:url});
    }

    status("Imagem enviada.","ok");
    alert("Imagem enviada.");
  }

  document.getElementById("save").onclick=save;

  document.getElementById("reset").onclick=function(){
    if(!confirm("Restaurar o modelo padrão?"))return;
    editor.setComponents(htmlDefault());
    editor.setStyle(cssDefault());
    status("Modelo restaurado. Clique em salvar.","ok");
  };

  document.getElementById("file").onchange=function(e){
    var f=e.target.files&&e.target.files[0];
    if(f)upload(f);
    e.target.value="";
  };

  load().catch(function(e){
    status(String(e&&e.message||e||"Erro ao carregar editor."),"error");
  });
})();
  </script>
</body>
</html>`;

export async function GET() {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
