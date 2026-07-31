import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "online",
    checkedAt: new Date().toISOString()
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  })
}
