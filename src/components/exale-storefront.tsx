/* eslint-disable @next/next/no-html-link-for-pages, @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

const CART_KEY = "exale-cart-premium-v1";
const FALLBACK = "/exale-produto-sem-foto.svg";

const CART_EVENT = "exale-cart-updated";

function readCart(): any[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(CART_KEY) || "[]"
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: any[]) {
  localStorage.setItem(
    CART_KEY,
    JSON.stringify(items)
  );

  window.dispatchEvent(
    new CustomEvent(CART_EVENT, {
      detail: items
    })
  );
}

const CartSummary = memo(function CartSummary() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    setItems(readCart());

    const update = (event: Event) => {
      const customEvent =
        event as CustomEvent<any[]>;

      setItems(
        Array.isArray(customEvent.detail)
          ? customEvent.detail
          : readCart()
      );
    };

    const storage = (event: StorageEvent) => {
      if (event.key === CART_KEY) {
        setItems(readCart());
      }
    };

    window.addEventListener(
      CART_EVENT,
      update as EventListener
    );

    window.addEventListener(
      "storage",
      storage
    );

    return () => {
      window.removeEventListener(
        CART_EVENT,
        update as EventListener
      );

      window.removeEventListener(
        "storage",
        storage
      );
    };
  }, []);

  const count = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.quantity || 1),
        0
      ),
    [items]
  );

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price =
          Number(item.promotionalPrice) > 0
            ? Number(item.promotionalPrice)
            : Number(item.price);

        return (
          sum +
          price * Number(item.quantity || 1)
        );
      }, 0),
    [items]
  );

  return (
    <a className="cart" href="/carrinho">
      <span>🛒</span>
      <b>{count}</b>
      <small>{money(total)}</small>
    </a>
  );
});

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const nav = ["Lançamentos", "Promoções", "Kits", "Corpo e Banho", "Cabelos", "Skincare", "Perfumes", "Presentes", "Outlet"];
const keys: Record<string, string[]> = {
  "Lançamentos": ["lançamento", "lancamento", "novo"],
  "Promoções": ["promoção", "promocao", "oferta"],
  "Kits": ["kit"],
  "Corpo e Banho": ["corpo", "banho", "sabonete", "hidratante"],
  "Cabelos": ["cabelo", "capilar", "shampoo"],
  "Skincare": ["skincare", "rosto", "facial"],
  "Perfumes": ["perfume", "perfumaria"],
  "Presentes": ["presente"],
  "Outlet": ["outlet"],
};

export default function ExaleStorefront() {
  const [store, setStore] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [hero, setHero] = useState(0);

  const load = async () => {
    const r = await fetch(`/api/store?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-store" } });
    const data = await r.json();
    if (!r.ok || !data?.ok) throw new Error(data?.message || "Erro ao carregar a loja");
    setStore(data);
  };

  useEffect(() => {
    load().catch(console.error);
    const refresh = () => load().catch(() => null);
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  const deferredSearch =
    useDeferredValue(search);

  const settings = store?.settings || {};
  const whatsapp = String(settings.whatsapp || "").replace(/\D/g, "");
  const products = useMemo(() => (store?.products || []).filter((p: any) => p.active !== false), [store]);
  const promotions = useMemo(() => (store?.promotions || []).filter((p: any) => p.active !== false), [store]);
  const reviews = useMemo(() => (store?.reviews || []).filter((r: any) => r.active !== false), [store]);
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p: any) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q));
  }, [products, deferredSearch]);

  useEffect(() => {
    if (promotions.length < 2) return;
    const timer = setInterval(() => setHero((i) => (i + 1) % promotions.length), 6000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  const promo = promotions[hero] || promotions[0];
  const featured = products.filter((p: any) => p.featured).slice(0, 5);
  const highlights = featured.length ? featured : products.slice(0, 5);
  const kit = products.find((p: any) => `${p.name} ${p.category}`.toLowerCase().includes("kit")) || products[0];

  const add = useCallback(
    (product: any, go = false) => {
      if (Number(product.stock || 0) <= 0) {
        alert("Produto sem estoque.");
        return;
      }

      const current = readCart();

      const found = current.find(
        (item) => item.id === product.id
      );

      const next = found
        ? current.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(
                    Number(item.quantity || 1) + 1,
                    Number(product.stock || 99)
                  )
                }
              : item
          )
        : [
            ...current,
            {
              ...product,
              quantity: 1
            }
          ];

      saveCart(next);

      if (go) {
        window.location.href = "/carrinho";
      }
    },
    []
  );

  const filter = useCallback(
    (label: string) => {
      setSearch(
        (keys[label] || [
          label.toLowerCase()
        ])[0]
      );

      setMenu(false);

      window.requestAnimationFrame(() => {
        document
          .getElementById("produtos")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      });
    },
    []
  );

  if (!store) return <main className="loading"><div className="loader"/><strong>Carregando EXALE...</strong><Styles/></main>;

  return (
    <main className="page">
      <div className="topBenefits">
        <span>▱ <b>FRETE GRÁTIS</b> acima de R$199</span><span>◉ <b>5% OFF</b> no PIX</span><span>▣ Compre parcelado</span><span>♙ Primeira troca grátis</span><a href={`https://wa.me/${whatsapp}`} target="_blank">◉ Atendimento</a>
      </div>

      <header>
        <a className="logo" href="/"><strong>EXALE</strong><small>Cosméticos Naturais</small></a>
        <label className="search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="O que você procura hoje?"/><button onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}>⌕</button></label>
        <div className="welcome">♙ <span><small>Bem-vinda(o)!</small><a href="/painel-exale">Entre ou cadastre-se</a></span></div>
        <button className="fav">♡</button>
        <CartSummary />
        <button className="hamb" onClick={() => setMenu(!menu)}>☰</button>
      </header>

      <nav className={menu ? "open" : ""}>
        <button onClick={() => setMenu(!menu)}>☰ TODAS CATEGORIAS</button>
        {nav.map(i => <button key={i} onClick={() => filter(i)}>{i}</button>)}
      </nav>

      <section className="hero" style={(promo?.imageUrl || settings.heroImageUrl) ? { backgroundImage: `linear-gradient(90deg,rgba(5,3,2,.97),rgba(33,15,6,.55),rgba(5,3,2,.2)),url("${promo?.imageUrl || settings.heroImageUrl}")` } : undefined}>
        <button className="arrow left" onClick={() => setHero(promotions.length ? hero === 0 ? promotions.length - 1 : hero - 1 : 0)}>‹</button>
        <div className="heroCopy"><span>BELEZA QUE</span><h1>ilumina</h1><h2>SUA ESSÊNCIA</h2><p>{promo?.description || settings.heroSubtitle || "Fórmulas naturais, resultados reais e o cuidado que você merece."}</p><button onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}>COMPRE AGORA →</button></div>
        <div className="stage"><div className="ring"/>{products.slice(0,3).map((p:any,i:number)=><img key={p.id} className={`p${i+1}`} src={p.imageUrl || FALLBACK} alt={p.name}/>)}</div>
        <div className="off"><small>ATÉ</small><strong>50%</strong><span>OFF</span></div>
        <button className="arrow right" onClick={() => setHero(promotions.length ? (hero + 1) % promotions.length : 0)}>›</button>
        <div className="dots">{(promotions.length ? promotions : [1,2,3]).map((_:any,i:number)=><button key={i} className={i===hero?"active":""} onClick={()=>setHero(i)}/>)}</div>
      </section>

      <section className="trust">
        <Trust icon="♧" title="Fórmulas Naturais" text="Ingredientes selecionados"/><Trust icon="♙" title="Cruelty Free" text="Não testado em animais"/><Trust icon="▱" title="Entrega Rápida" text="Para todo o Brasil"/><Trust icon="♢" title="Compra 100% Segura" text="Seus dados protegidos"/>
      </section>

      <section className="panels">
        <Panel title="LANÇAMENTOS" text="O que há de novo" action="VER TODOS" products={products.slice(0,3)} click={()=>filter("Lançamentos")}/>
        <Panel title="PROMOÇÕES" text="Descontos imperdíveis" action="VER OFERTAS" products={[]} click={()=>filter("Promoções")} icon="%"/>
        <Panel title="MAIS VENDIDOS" text="Os favoritos da Exale" action="VER TODOS" products={highlights.slice(0,3)} click={()=>{setSearch("");document.getElementById("produtos")?.scrollIntoView({behavior:"smooth"})}}/>
      </section>

      <section className="categories"><h2>COMPRE POR CATEGORIA</h2><div>{[["Kits","🎁"],["Corpo e Banho","♙"],["Cabelos","♧"],["Skincare","◉"],["Perfumes","♙"],["Presentes","♢"],["Outlet","◇"]].map(([l,i])=><button key={l} onClick={()=>filter(l)}><span>{i}</span><small>{l.toUpperCase()}</small></button>)}</div></section>

      <section id="produtos" className="featured"><div className="title"><h2>DESTAQUES EXALE</h2><button onClick={()=>setSearch("")}>VER TODOS</button></div><div className="grid">{filtered.slice(0,5).map((p:any)=><Card key={p.id} product={p} add={add} details={setSelected}/>)}</div></section>

      {kit && <section className="kit"><div className="kitImage"><img src={kit.imageUrl || FALLBACK} alt={kit.name}/></div><div><h2>KIT AUTOCUIDADO EXALE</h2><p>Cuidado completo para corpo, mente e alma.</p></div><div className="kitPrice"><small>DE {money(Number(kit.price||0)*1.45)}</small><span>POR APENAS</span><strong>{money(Number(kit.promotionalPrice)>0?kit.promotionalPrice:kit.price)}</strong><b>ou 6x sem juros</b></div><div className="kitOff">31%<small>OFF</small></div><button onClick={()=>add(kit,true)}>QUERO MEU KIT</button></section>}

      <section className="bottom"><div><h2>O QUE NOSSAS CLIENTES DIZEM</h2><div className="reviews">{(reviews.length?reviews.slice(0,3):fallbackReviews).map((r:any,i:number)=><article key={r.id||i}><span>★★★★★</span><p>{r.comment}</p><strong>{r.name}</strong><small>{r.city||"Brasil"}</small></article>)}</div></div><aside><h2>EXALE É SOBRE VOCÊ ✨</h2><div><strong>EXALE</strong><span>Sua melhor versão</span><small>todos os dias.</small><button onClick={()=>document.getElementById("produtos")?.scrollIntoView({behavior:"smooth"})}>CONHEÇA A EXALE</button></div></aside></section>

      <footer><a href={`https://wa.me/${whatsapp}`} target="_blank">◉ <span>Fale conosco<br/><b>pelo WhatsApp</b></span></a><div>♢ <span>Site 100% seguro<br/><small>Seus dados protegidos</small></span></div><div>▣ <span>Parcele suas compras<br/><small>em até 6x sem juros</small></span></div><div className="pay"><span>Meios de pagamento</span><b>VISA</b><b>●●</b><b>PIX</b></div></footer>

      {selected && <div className="modal" onClick={()=>setSelected(null)}><article onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><img src={selected.imageUrl || FALLBACK} alt={selected.name}/><div><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.description}</p><strong>{money(Number(selected.promotionalPrice)>0?selected.promotionalPrice:selected.price)}</strong><button onClick={()=>add(selected)}>ADICIONAR AO CARRINHO</button><button className="buy" onClick={()=>add(selected,true)}>COMPRAR AGORA</button></div></article></div>}
      <Styles/>
    </main>
  );
}

function Trust({icon,title,text}:{icon:string;title:string;text:string}){return <article><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>}
const Panel = memo(function Panel({title,text,action,products,click,icon}:{title:string;text:string;action:string;products:any[];click:()=>void;icon?:string}){return <article><div><h3>{title}</h3><p>{text}</p><button onClick={click}>{action}</button></div>{icon?<strong className="panelIcon">{icon}</strong>:<div className="panelProducts">{products.map(p=><img key={p.id} src={p.imageUrl||FALLBACK} alt={p.name}/>)}</div>}</article>});
const Card = memo(function Card({product,add,details}:{product:any;add:(p:any,g?:boolean)=>void;details:(p:any)=>void}){const promo=Number(product.promotionalPrice)>0;const price=promo?Number(product.promotionalPrice):Number(product.price);const disc=promo&&Number(product.price)>0?Math.round((1-Number(product.promotionalPrice)/Number(product.price))*100):0;return <article className="card">{disc>0&&<span className="badge">-{disc}%</span>}<button className="img" onClick={()=>details(product)}><img src={product.imageUrl||FALLBACK} alt={product.name}/></button><div><h3>{product.name}</h3><p>{product.description}</p><strong>{money(price)}</strong>{promo&&<small><del>{money(product.price)}</del></small>}<span>ou 2x de {money(price/2)}</span><button onClick={()=>add(product)}>🛒</button></div></article>});
const fallbackReviews=[{name:"Juliana S.",city:"São Paulo, SP",comment:"Amei os produtos! Minha pele nunca esteve tão macia e cheirosa. Super recomendo!"},{name:"Camila R.",city:"Belo Horizonte, MG",comment:"Entrega rápida e tudo muito bem embalado. Já virei cliente fiel!"},{name:"Larissa M.",city:"Curitiba, PR",comment:"Os perfumes são maravilhosos e ficam muito na pele!"}];

function Styles(){return <style jsx global>{`
:root{--bg:#070402;--gold:#f1b83f;--gold2:#ffdb70;--line:rgba(241,184,63,.42);--text:#fff8e7;--muted:#d8c7a4}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--text);background:#070402;font-family:Arial,Helvetica,sans-serif}button,input,a{font:inherit}button{cursor:pointer}.loading{min-height:100vh;display:grid;place-items:center;gap:18px;background:#070402;color:var(--gold2)}.loader{width:64px;height:64px;border:2px solid rgba(241,184,63,.2);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite;box-shadow:0 0 28px rgba(241,184,63,.22)}@keyframes spin{to{transform:rotate(360deg)}}.page{min-height:100vh;overflow-x:hidden;background:radial-gradient(circle at 50% 5%,rgba(241,184,63,.06),transparent 20%),#070402}.topBenefits{min-height:36px;display:grid;grid-template-columns:repeat(5,1fr);align-items:center;gap:12px;padding:7px max(18px,calc((100vw - 1360px)/2));color:var(--gold);background:#030201;border-bottom:1px solid rgba(241,184,63,.18);font-size:10px}.topBenefits>*{text-align:center;color:inherit;text-decoration:none}header{min-height:116px;display:grid;grid-template-columns:250px minmax(260px,1fr) auto auto auto;align-items:center;gap:24px;padding:18px max(28px,calc((100vw - 1360px)/2));background:radial-gradient(circle at 13% 50%,rgba(241,184,63,.1),transparent 230px),#0c0704;border-bottom:1px solid var(--line)}.logo{color:var(--gold2);text-decoration:none;text-align:center;filter:drop-shadow(0 0 8px rgba(241,184,63,.32))}.logo strong{display:block;font-family:Georgia,serif;font-size:52px;line-height:.9;letter-spacing:.08em}.logo small{display:block;margin-top:8px;font-family:cursive;font-size:17px;color:#fff4d8}.search{position:relative}.search input{width:100%;height:48px;padding:0 54px 0 20px;border:1px solid var(--line);border-radius:999px;outline:none;color:#fff;background:rgba(15,9,5,.78)}.search button{position:absolute;right:5px;top:5px;width:38px;height:38px;border:0;border-radius:50%;color:var(--gold);background:transparent;font-size:24px}.welcome{display:flex;align-items:center;gap:10px;color:var(--gold)}.welcome small,.welcome a{display:block}.welcome a{color:#fff;font-size:12px;text-decoration:none}.fav{border:0;color:var(--gold);background:transparent;font-size:30px}.cart{position:relative;display:grid;grid-template-columns:auto auto;align-items:center;gap:3px 10px;color:#fff;text-decoration:none}.cart>span{grid-row:1/3;font-size:28px}.cart b{position:absolute;top:-8px;left:22px;width:18px;height:18px;display:grid;place-items:center;border-radius:50%;color:#120a04;background:var(--gold);font-size:10px}.cart small{font-size:11px}.hamb{display:none}nav{min-height:54px;display:grid;grid-template-columns:230px repeat(9,auto);align-items:center;justify-content:center;gap:2px;padding:0 18px;background:linear-gradient(90deg,#0c0704,#1d0f07,#0c0704);border-bottom:1px solid var(--line)}nav button{height:42px;padding:0 15px;border:0;color:#f6d88e;background:transparent;font-size:12px}nav button:first-child{border-radius:6px;color:#fff;background:linear-gradient(180deg,#4d2d0b,#2c1707);font-weight:900}.hero{position:relative;min-height:430px;display:grid;grid-template-columns:1.05fr 1fr 220px;align-items:center;padding:35px max(40px,calc((100vw - 1360px)/2));overflow:hidden;background:radial-gradient(circle at 65% 50%,rgba(241,184,63,.22),transparent 280px),linear-gradient(90deg,#050302,#2b1507 60%,#120904);background-size:cover;background-position:center;border-bottom:1px solid var(--line)}.heroCopy{position:relative;z-index:4;padding-left:70px}.heroCopy>span{display:block;color:#f6d88e;font-family:Georgia,serif;font-size:26px;letter-spacing:.09em}.heroCopy h1{margin:2px 0 0;color:#fff0c9;font-family:cursive;font-size:clamp(68px,8vw,118px);font-weight:400;line-height:.9;text-shadow:0 0 7px #ffb832,0 0 24px rgba(255,161,28,.85)}.heroCopy h2{margin:5px 0 28px;color:#f6d88e;font-family:Georgia,serif;font-size:26px;letter-spacing:.16em}.heroCopy p{width:min(420px,100%);color:#f5e5c5;line-height:1.6}.heroCopy>button{min-width:210px;height:48px;margin-top:18px;border:1px solid #ffd872;border-radius:999px;color:#fff;background:linear-gradient(180deg,#d99a2c,#9b5c10);font-weight:900;box-shadow:0 0 8px #ffb72c,0 0 23px rgba(255,166,31,.48)}.stage{position:relative;min-height:350px;z-index:2}.ring{position:absolute;left:50%;top:50%;width:330px;height:330px;transform:translate(-50%,-50%);border:4px solid #ffd260;border-radius:50%;box-shadow:0 0 10px #ffb326,0 0 34px #ff9916,inset 0 0 24px rgba(255,179,38,.45)}.stage img{position:absolute;bottom:0;object-fit:contain;filter:drop-shadow(0 18px 20px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(241,184,63,.22))}.stage .p1{left:17%;width:42%;height:95%}.stage .p2{right:10%;width:30%;height:70%}.stage .p3{left:47%;width:34%;height:48%}.off{width:170px;height:170px;display:grid;place-items:center;align-content:center;border:3px solid #ffd260;border-radius:50%;text-align:center;background:rgba(42,19,6,.38);box-shadow:0 0 9px #ffb326,0 0 28px rgba(255,153,22,.7)}.off>*{display:block;font-family:Georgia,serif}.off small{font-size:20px}.off strong{font-size:58px;line-height:.95}.off span{font-size:25px}.arrow{position:absolute;top:50%;z-index:8;width:45px;height:45px;transform:translateY(-50%);border:0;color:var(--gold);background:transparent;font-size:50px}.arrow.left{left:12px}.arrow.right{right:12px}.dots{position:absolute;left:50%;bottom:10px;z-index:8;display:flex;gap:6px;transform:translateX(-50%)}.dots button{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.4)}.dots button.active{width:28px;border-radius:999px;background:var(--gold);box-shadow:0 0 10px var(--gold)}.trust{min-height:86px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:18px max(28px,calc((100vw - 1360px)/2));background:linear-gradient(90deg,#1a0e06,#311606,#1a0e06);border-bottom:1px solid var(--line)}.trust article{display:flex;align-items:center;justify-content:center;gap:12px}.trust article>span{color:var(--gold);font-size:31px}.trust strong,.trust small{display:block}.trust small{color:var(--muted)}.panels{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:24px max(28px,calc((100vw - 1360px)/2));background:linear-gradient(180deg,#0d0703,#1b0e05)}.panels>article{min-height:185px;display:grid;grid-template-columns:1fr 1.1fr;align-items:center;overflow:hidden;padding:20px;border:1px solid var(--gold);border-radius:10px;background:radial-gradient(circle at 80% 50%,rgba(241,184,63,.12),transparent 180px),#100804;box-shadow:inset 0 0 24px rgba(241,184,63,.05),0 0 12px rgba(241,184,63,.08)}.panels h3{margin:0;color:var(--gold2);font-family:Georgia,serif;font-size:21px}.panels p{color:#f0d994}.panels button{height:38px;padding:0 18px;border:1px solid var(--gold);border-radius:6px;color:var(--gold);background:transparent;font-size:11px;font-weight:900}.panelProducts{height:130px;display:flex;align-items:flex-end;justify-content:center}.panelProducts img{width:33%;height:100%;object-fit:contain}.panelIcon{color:var(--gold);font-size:100px;text-align:center;text-shadow:0 0 18px rgba(241,184,63,.48)}.categories{padding:4px max(28px,calc((100vw - 1360px)/2)) 18px;background:#100804;border-bottom:1px solid var(--line)}.categories h2,.title h2,.bottom h2{margin:0 0 16px;text-align:center;font-family:Georgia,serif;font-size:20px;letter-spacing:.08em}.categories>div{display:grid;grid-template-columns:repeat(7,1fr);gap:18px}.categories button{border:0;color:#fff;background:transparent}.categories button>span{width:82px;height:82px;display:grid;place-items:center;margin:0 auto 8px;border:2px solid var(--gold);border-radius:50%;color:var(--gold);font-size:36px;box-shadow:0 0 8px rgba(255,185,47,.8),0 0 22px rgba(255,154,20,.35)}.featured{padding:18px max(28px,calc((100vw - 1360px)/2)) 28px;background:radial-gradient(circle at 50% 0%,rgba(241,184,63,.06),transparent 260px),#070402;border-bottom:1px solid var(--line)}.title{position:relative}.title button{position:absolute;right:0;top:-6px;height:34px;padding:0 16px;border:1px solid var(--gold);border-radius:5px;color:var(--gold);background:transparent;font-size:10px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}.card{position:relative;min-width:0;overflow:hidden;border:1px solid rgba(241,184,63,.42);border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.025),transparent 60%),#0d0805}.badge{position:absolute;top:14px;left:14px;z-index:2;width:48px;height:48px;display:grid;place-items:center;border-radius:50%;color:#251203;background:#ffd267;font-weight:900}.img{width:100%;height:220px;padding:20px;border:0;background:transparent}.img img{width:100%;height:100%;object-fit:contain}.card>div{position:relative;min-height:150px;padding:4px 58px 16px 16px}.card h3{margin:0;font-size:13px}.card p{height:35px;overflow:hidden;margin:4px 0 10px;color:#d8c7a4;font-size:10px;line-height:1.35}.card strong{display:block;color:var(--gold);font-size:19px}.card small,.card div>span{display:block;margin-top:3px;color:#d9c9aa;font-size:9px}.card div>button{position:absolute;right:13px;bottom:17px;width:38px;height:38px;border:1px solid var(--gold);border-radius:7px;color:var(--gold);background:transparent}.kit{min-height:178px;display:grid;grid-template-columns:1.35fr 1fr .7fr 120px 160px;align-items:center;gap:24px;padding:18px max(28px,calc((100vw - 1360px)/2));background:radial-gradient(circle at 80% 50%,rgba(255,199,90,.22),transparent 220px),linear-gradient(90deg,#1b0d04,#7c4519,#231005);border-bottom:1px solid var(--line)}.kitImage{height:150px;display:grid;place-items:center;overflow:hidden;border-right:1px solid rgba(241,184,63,.25)}.kitImage img{width:100%;height:100%;object-fit:contain}.kit h2{margin:0 0 12px;font-family:Georgia,serif;font-size:21px}.kitPrice>*{display:block}.kitPrice span{margin-top:9px;color:#f6d88e}.kitPrice strong{margin:4px 0;color:#fff0bf;font-family:Georgia,serif;font-size:32px}.kitOff{width:100px;height:100px;display:grid;place-items:center;align-content:center;border:2px solid var(--gold);border-radius:50%;font-family:Georgia,serif;font-size:36px;box-shadow:0 0 10px rgba(255,194,69,.9),0 0 26px rgba(255,149,18,.4)}.kitOff small{display:block;font-size:17px}.kit>button{height:44px;border:1px solid var(--gold);border-radius:999px;color:#fff;background:#271406;font-weight:900}.bottom{display:grid;grid-template-columns:1.45fr .75fr;gap:28px;padding:24px max(28px,calc((100vw - 1360px)/2));background:#080402;border-bottom:1px solid var(--line)}.reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.reviews article{min-height:170px;padding:18px;border:1px solid rgba(241,184,63,.34);border-radius:9px;background:#120a05}.reviews article>span{color:var(--gold);letter-spacing:.15em}.reviews p{color:#f4dfb4;line-height:1.55}.reviews strong,.reviews small{display:block}.reviews small{margin-top:5px;color:#d2bc90}.bottom aside>div{min-height:190px;display:grid;place-items:center;align-content:center;padding:20px;border:2px solid var(--gold);border-radius:14px;background:radial-gradient(circle,rgba(241,184,63,.15),transparent 65%),#0d0703;box-shadow:inset 0 0 30px rgba(241,184,63,.08),0 0 14px rgba(241,184,63,.34)}.bottom aside strong{font-family:Georgia,serif;font-size:54px;letter-spacing:.09em;text-shadow:0 0 7px #ffc84e,0 0 23px rgba(255,157,22,.72)}.bottom aside span,.bottom aside small{font-family:cursive;font-size:24px}.bottom aside button{height:36px;margin-top:14px;padding:0 20px;border:1px solid var(--gold);border-radius:999px;color:#fff;background:transparent;font-size:10px}footer{min-height:72px;display:grid;grid-template-columns:repeat(4,1fr);align-items:center;gap:20px;padding:12px max(28px,calc((100vw - 1360px)/2));background:#050301}footer>a,footer>div{display:flex;align-items:center;justify-content:center;gap:10px;color:#fff;text-decoration:none}.pay{gap:8px}.pay b{padding:4px 7px;border-radius:4px;color:#0b0703;background:#fff;font-size:10px}.modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.86);backdrop-filter:blur(7px)}.modal>article{position:relative;width:min(920px,100%);max-height:92vh;display:grid;grid-template-columns:1fr 1fr;overflow:auto;border:1px solid var(--gold);border-radius:16px;background:#100804;box-shadow:0 0 32px rgba(241,184,63,.24)}.modal article>img{width:100%;height:100%;min-height:480px;object-fit:contain;padding:30px;background:radial-gradient(circle,rgba(241,184,63,.1),transparent 60%)}.modal article>div{padding:40px}.modal h2{font-family:Georgia,serif;font-size:42px}.modal article>div>strong{display:block;margin:18px 0;color:var(--gold);font-size:30px}.modal article>div>button{width:100%;height:46px;margin-top:10px;border:1px solid var(--gold);border-radius:999px;color:#fff;background:transparent;font-weight:900}.modal .buy{color:#1b0d04;background:var(--gold)}.close{position:absolute;top:12px;right:12px;z-index:3;width:42px;height:42px;border:1px solid var(--gold);border-radius:50%;color:#fff;background:#090401;font-size:26px}@media(max-width:1100px){header{grid-template-columns:210px 1fr auto auto}.welcome{display:none}nav{grid-template-columns:repeat(5,1fr);padding:8px 18px}.hero{grid-template-columns:1fr 1fr}.off{position:absolute;right:40px;top:40px;width:130px;height:130px}.off strong{font-size:43px}.grid{grid-template-columns:repeat(3,1fr)}.kit{grid-template-columns:1fr 1fr 1fr}.kitOff,.kit>button{display:none}}@media(max-width:760px){.topBenefits{grid-template-columns:1fr 1fr;padding:8px 12px}.topBenefits>*:nth-child(n+3){display:none}header{min-height:150px;grid-template-columns:1fr auto auto;gap:12px;padding:16px 18px}.logo{text-align:left}.logo strong{font-size:34px}.logo small{font-size:12px}.search{grid-column:1/-1;grid-row:2}.fav{display:none}.hamb{display:inline-grid;place-items:center;width:48px;height:48px;border:1px solid var(--gold);border-radius:12px;color:var(--gold);background:transparent}.cart small{display:none}nav{display:none;grid-template-columns:1fr 1fr;padding:10px}nav.open{display:grid}.hero{min-height:560px;display:block;padding:42px 20px}.heroCopy{padding-left:0}.heroCopy>span,.heroCopy h2{font-size:20px}.heroCopy h1{font-size:68px}.stage{height:260px;min-height:260px;margin-top:15px}.ring{width:240px;height:240px}.off{right:16px;top:270px;width:105px;height:105px}.off small{font-size:13px}.off strong{font-size:34px}.off span{font-size:16px}.trust{grid-template-columns:1fr 1fr}.panels{grid-template-columns:1fr;padding:16px}.categories>div{grid-template-columns:repeat(3,1fr);gap:22px 10px}.categories button>span{width:70px;height:70px}.featured,.categories{padding-left:16px;padding-right:16px}.grid{grid-template-columns:1fr 1fr;gap:10px}.img{height:170px}.card>div{min-height:170px;padding-right:12px}.card div>button{position:static;width:100%;margin-top:10px}.kit{grid-template-columns:1fr;text-align:center;padding:20px}.kitImage{border-right:0}.bottom{grid-template-columns:1fr;padding:18px 16px}.reviews{grid-template-columns:1fr}footer{grid-template-columns:1fr 1fr}.modal>article{grid-template-columns:1fr}.modal article>img{min-height:260px;height:260px}}@media(max-width:430px){.topBenefits{grid-template-columns:1fr}.topBenefits>*:nth-child(2){display:none}.logo strong{font-size:30px}.grid{grid-template-columns:1fr}.categories>div{grid-template-columns:1fr 1fr}footer{grid-template-columns:1fr}}
`}</style>}
