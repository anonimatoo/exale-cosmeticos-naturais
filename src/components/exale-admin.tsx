/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
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


function parseAdminNumber(
  rawValue: string,
  decimals: boolean
) {
  const cleaned = String(rawValue || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");

  if (
    cleaned === "" ||
    cleaned === "-" ||
    cleaned === "," ||
    cleaned === "."
  ) {
    return 0;
  }

  if (!decimals) {
    const integerOnly = cleaned
      .replace(/[.,]/g, "")
      .replace(/[^\d-]/g, "");

    const parsedInteger =
      Number.parseInt(integerOnly, 10);

    return Number.isFinite(parsedInteger)
      ? parsedInteger
      : 0;
  }

  const lastComma =
    cleaned.lastIndexOf(",");

  const lastDot =
    cleaned.lastIndexOf(".");

  const separatorPosition =
    Math.max(lastComma, lastDot);

  let normalized = "";

  if (separatorPosition >= 0) {
    const integerPart = cleaned
      .slice(0, separatorPosition)
      .replace(/[.,]/g, "");

    const decimalPart = cleaned
      .slice(separatorPosition + 1)
      .replace(/[.,]/g, "")
      .slice(0, 2);

    normalized =
      `${integerPart || "0"}.${decimalPart || "0"}`;
  } else {
    normalized =
      cleaned.replace(/[.,]/g, "");
  }

  const parsedNumber =
    Number(normalized);

  return Number.isFinite(parsedNumber)
    ? parsedNumber
    : 0;
}

function formatAdminNumber(
  value: any,
  decimals: boolean
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits:
        decimals ? 2 : 0,
      maximumFractionDigits:
        decimals ? 2 : 0
    }
  );
}

function NumericField({
  label,
  value,
  onChange,
  full = false
}: any) {
  const decimals =
    /preço|valor|total|desconto/i.test(
      String(label || "")
    );

  const [editing, setEditing] =
    useState(false);

  const [text, setText] =
    useState(
      formatAdminNumber(
        value,
        decimals
      )
    );

  useEffect(() => {
    if (!editing) {
      setText(
        formatAdminNumber(
          value,
          decimals
        )
      );
    }
  }, [value, decimals, editing]);

  function handleFocus(event: any) {
    setEditing(true);

    const numericValue =
      Number(value);

    if (
      !Number.isFinite(numericValue) ||
      numericValue === 0
    ) {
      setText("");
    } else {
      setText(
        decimals
          ? String(numericValue)
              .replace(".", ",")
          : String(
              Math.trunc(numericValue)
            )
      );
    }

    window.setTimeout(() => {
      try {
        event.currentTarget.select();
      } catch {}
    }, 0);
  }

  function handleChange(event: any) {
    const typed = String(
      event.currentTarget.value || ""
    );

    const allowed = decimals
      ? typed.replace(
          /[^\d,.-]/g,
          ""
        )
      : typed.replace(
          /[^\d-]/g,
          ""
        );

    setText(allowed);

    if (
      allowed.trim() === "" ||
      allowed.trim() === "-"
    ) {
      return;
    }

    const parsed =
      parseAdminNumber(
        allowed,
        decimals
      );

    onChange(String(parsed));
  }

  function handleBlur() {
    setEditing(false);

    if (
      text.trim() === "" ||
      text.trim() === "-"
    ) {
      onChange("0");

      setText(
        formatAdminNumber(
          0,
          decimals
        )
      );

      return;
    }

    const parsed =
      parseAdminNumber(
        text,
        decimals
      );

    onChange(String(parsed));

    setText(
      formatAdminNumber(
        parsed,
        decimals
      )
    );
  }

  return (
    <label
      className={
        full
          ? "admin-field full"
          : "admin-field"
      }
    >
      <span>{label}</span>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center"
        }}
      >
        {decimals && (
          <b
            style={{
              position: "absolute",
              left: "14px",
              zIndex: 2,
              color: "#8b671d",
              fontSize: "12px",
              fontWeight: 950,
              pointerEvents: "none"
            }}
          >
            R$
          </b>
        )}

        <input
          type="text"
          inputMode={
            decimals
              ? "decimal"
              : "numeric"
          }
          autoComplete="off"
          value={text}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          style={{
            paddingLeft:
              decimals
                ? "44px"
                : undefined,
            fontVariantNumeric:
              "tabular-nums"
          }}
        />
      </div>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  full = false,
  textarea = false,
  type = "text"
}: any) {
  if (type === "number") {
    return (
      <NumericField
        label={label}
        value={value}
        onChange={onChange}
        full={full}
      />
    );
  }

  return (
    <label
      className={
        full
          ? "admin-field full"
          : "admin-field"
      }
    >
      <span>{label}</span>

      {textarea ? (
        <textarea
          value={value ?? ""}
          onChange={(event) =>
            onChange(
              event.currentTarget.value
            )
          }
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) =>
            onChange(
              event.currentTarget.value
            )
          }
        />
      )}
    </label>
  );
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
