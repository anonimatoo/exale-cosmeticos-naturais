/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { uploadImageToGithub } from "@/lib/exale-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

function cleanName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function POST(request: Request) {
  try {
    const password =
      request.headers.get("x-admin-password") || "";

    const expected =
      process.env.ADMIN_PASSWORD ||
      "exale-admin-2026";

    if (password !== expected) {
      return NextResponse.json(
        {
          ok: false,
          message: "Acesso negado."
        },
        {
          status: 401
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Selecione uma imagem."
        },
        {
          status: 400
        }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Formato inválido. Use JPG, PNG, WEBP ou GIF."
        },
        {
          status: 400
        }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "A imagem deve ter no máximo 8 MB."
        },
        {
          status: 400
        }
      );
    }

    const originalName =
      cleanName(
        file.name.replace(/\.[^.]+$/, "")
      ) || "imagem";

    const extension =
      EXTENSIONS[file.type] || "jpg";

    const filename =
      `${Date.now()}-${originalName}.${extension}`;

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    const url =
      await uploadImageToGithub(
        filename,
        bytes
      );

    return NextResponse.json({
      ok: true,
      url,
      filename
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error?.message ||
          "Erro ao enviar a imagem."
      },
      {
        status: 500
      }
    );
  }
}
