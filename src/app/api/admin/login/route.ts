import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const expected = process.env.ADMIN_PASSWORD || "exale-admin-2026";

  if (password !== expected) {
    return NextResponse.json({ ok: false, message: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
