/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { getProducts, getSettings } from "@/lib/data"

type Product = {
  slug: string
  name: string
  price: number
}

function getEnv(name?: string) {
  if (!name) return ""
  return process.env[name] || ""
}

function selectedProducts(slugs: string[], products: Product[]) {
  return slugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter(Boolean) as Product[]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const slugs: string[] = Array.isArray(body.slugs) ? body.slugs : []
    const products = getProducts() as Product[]
    const settings: any = getSettings()
    const items = selectedProducts(slugs, products)

    if (!items.length) {
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 })
    }

    const site = settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://exale-cosmeticos-naturais.vercel.app"
    const provider = settings.paymentProvider || "mercadopago"
    const total = items.reduce((sum, item) => sum + Number(item.price), 0)

    if (provider === "pix") {
      return NextResponse.json({
        provider,
        mode: "manual",
        pixKey: settings.pixKey || "",
        total,
        instructions: settings.paymentInstructions || "Faça o Pix e envie o comprovante pelo WhatsApp."
      })
    }

    if (provider === "external_link") {
      if (!settings.customPaymentRedirectUrl) {
        return NextResponse.json({ error: "Configure o link de redirecionamento no painel." }, { status: 400 })
      }
      return NextResponse.json({
        provider,
        init_point: settings.customPaymentRedirectUrl
      })
    }

    if (provider === "custom_api") {
      if (!settings.customPaymentEndpoint) {
        return NextResponse.json({ error: "Configure o endpoint da API personalizada no painel." }, { status: 400 })
      }

      const secret = getEnv(settings.customPaymentSecretEnv)

      const response = await fetch(settings.customPaymentEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {})
        },
        body: JSON.stringify({
          site,
          total,
          items,
          customer: body.customer || null,
          success_url: `${site}/obrigado`,
          cancel_url: `${site}/carrinho`
        })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        return NextResponse.json({ error: data.error || "Erro na API personalizada.", detail: data }, { status: 400 })
      }

      return NextResponse.json({
        provider,
        init_point: data.init_point || data.url || data.checkout_url,
        detail: data
      })
    }

    if (provider === "stripe") {
      return NextResponse.json({
        error: "Stripe selecionado. Configure a rota Stripe conforme sua conta e produto. Use API personalizada temporariamente ou link externo.",
        provider
      }, { status: 400 })
    }

    const token = getEnv(settings.mercadoPagoAccessTokenEnv || "MERCADO_PAGO_ACCESS_TOKEN")

    if (!token) {
      return NextResponse.json({
        error: "Configure o token do Mercado Pago em .env.local ou nas variaveis da Vercel.",
        env: settings.mercadoPagoAccessTokenEnv || "MERCADO_PAGO_ACCESS_TOKEN"
      }, { status: 400 })
    }

    const preference = {
      items: items.map((item) => ({
        title: item.name,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(item.price)
      })),
      back_urls: {
        success: `${site}/obrigado`,
        failure: `${site}/carrinho`,
        pending: `${site}/carrinho`
      },
      auto_return: "approved"
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Erro no Mercado Pago.", detail: data }, { status: 400 })
    }

    return NextResponse.json({
      provider: "mercadopago",
      id: data.id,
      init_point: data.init_point
    })
  } catch {
    return NextResponse.json({ error: "Erro interno no checkout." }, { status: 500 })
  }
}
