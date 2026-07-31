import fs from "fs"
import path from "path"
import { Product, StoreSettings } from "./types"

const root = process.cwd()

export function getSettings(): StoreSettings {
  const file = path.join(root, "content", "settings", "store.json")
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

export function getProducts(): Product[] {
  const dir = path.join(root, "content", "products")
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const full = path.join(dir, file)
      return JSON.parse(fs.readFileSync(full, "utf8")) as Product
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured))
}

export function getProduct(slug: string): Product | undefined {
  return getProducts().find((product) => product.slug === slug)
}

export function brl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}
