export type StoreSettings = {
  storeName: string
  neonName: string
  slogan: string
  heroTitle: string
  heroSubtitle: string
  whatsapp: string
  instagram: string
  tiktok: string
  siteUrl?: string
  displayUrl?: string
  adminUrl?: string
  logoImage?: string
  logoAlt?: string
  paymentProvider?: string
  paymentButtonText?: string
  pixKey?: string
  mercadoPagoPublicKey?: string
  mercadoPagoAccessTokenEnv?: string
  customPaymentEndpoint?: string
  customPaymentRedirectUrl?: string
}

export type Product = {
  slug: string
  name: string
  category: string
  price: number
  oldPrice?: number
  shortText: string
  description: string
  benefits: string[]
  stock: number
  featured: boolean
  images: string[]
}
