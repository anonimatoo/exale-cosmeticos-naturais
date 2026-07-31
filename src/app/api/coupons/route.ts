import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  const dir = path.join(process.cwd(), "content", "coupons")
  if (!fs.existsSync(dir)) return NextResponse.json([])

  const coupons = fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")))

  return NextResponse.json(coupons)
}
