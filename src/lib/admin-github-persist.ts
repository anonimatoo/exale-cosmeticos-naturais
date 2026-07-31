/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs/promises";
import path from "node:path";

const OWNER = process.env.GITHUB_OWNER || "anonimatoo";
const REPO = process.env.GITHUB_REPO || "exale-cosmeticos-naturais";
const BRANCH = process.env.GITHUB_BRANCH || "main";

function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function safePath(filePath: string) {
  return filePath.replace(/^\/+/, "").replace(/\\/g, "/");
}

function githubApiPath(filePath: string) {
  return encodeURIComponent(safePath(filePath)).replace(/%2F/g, "/");
}

function rawGithubUrl(filePath: string) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${safePath(filePath)}`;
}

async function githubRequest(filePath: string) {
  const tk = token();
  const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${githubApiPath(filePath)}?ref=${BRANCH}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Exale-CMS",
  };

  if (tk) headers.Authorization = `Bearer ${tk}`;

  return fetch(api, {
    headers,
    cache: "no-store",
  });
}

export async function writeLocalFile(filePath: string, content: string | Buffer) {
  try {
    const full = path.join(process.cwd(), safePath(filePath));
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
    return { ok: true };
  } catch (error: any) {
    if (String(error?.code || "").includes("EROFS") || String(error?.message || "").includes("read-only")) {
      return { ok: false, skipped: true, reason: "Ambiente read-only da Vercel" };
    }

    return { ok: false, skipped: true, reason: error?.message || "Falha local ignorada" };
  }
}

export async function commitFileToGithub(filePath: string, content: string | Buffer, message: string) {
  const tk = token();

  if (!tk) {
    throw new Error("GITHUB_TOKEN ausente na Vercel. Cadastre a variável GITHUB_TOKEN em Production.");
  }

  const clean = safePath(filePath);
  const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${githubApiPath(clean)}`;

  let sha: string | undefined;

  const current = await fetch(`${api}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${tk}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Exale-CMS",
    },
    cache: "no-store",
  });

  if (current.ok) {
    const json: any = await current.json();
    sha = json.sha;
  }

  const body: any = {
    message,
    content: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(content).toString("base64"),
    branch: BRANCH,
  };

  if (sha) body.sha = sha;

  const saved = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${tk}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Exale-CMS",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!saved.ok) {
    const txt = await saved.text();
    throw new Error(`Falha ao salvar no GitHub: ${saved.status} ${txt}`);
  }

  return saved.json();
}

export async function writeJsonFile(filePath: string, data: unknown) {
  const content = JSON.stringify(data, null, 2) + "\n";
  await commitFileToGithub(filePath, Buffer.from(content, "utf8"), "salva alteração feita no painel administrativo");
  await writeLocalFile(filePath, content);
  return { ok: true };
}

export function slugify(value: string) {
  return String(value || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "produto";
}

export async function readJsonSafe(filePath: string, fallback: any) {
  try {
    const response = await githubRequest(filePath);

    if (response.ok) {
      const json: any = await response.json();

      if (json?.content) {
        const raw = Buffer.from(json.content, "base64").toString("utf8");
        return JSON.parse(raw);
      }
    }
  } catch {}

  try {
    const full = path.join(process.cwd(), safePath(filePath));
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function readJsonFolder(folder: string) {
  try {
    const response = await githubRequest(folder);

    if (response.ok) {
      const list: any = await response.json();

      if (Array.isArray(list)) {
        const files = list.filter((item: any) => item?.type === "file" && String(item?.name || "").endsWith(".json"));
        const output = [];

        for (const file of files) {
          try {
            const rawResponse = await fetch(file.download_url, { cache: "no-store" });

            if (rawResponse.ok) {
              output.push(await rawResponse.json());
            }
          } catch {}
        }

        return output;
      }
    }
  } catch {}

  try {
    const full = path.join(process.cwd(), safePath(folder));
    const files = await fs.readdir(full);
    const list = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const raw = await fs.readFile(path.join(full, file), "utf8");
        list.push(JSON.parse(raw));
      } catch {}
    }

    return list;
  } catch {
    return [];
  }
}

export function publicGithubRawUrl(filePath: string) {
  return rawGithubUrl(filePath);
}
