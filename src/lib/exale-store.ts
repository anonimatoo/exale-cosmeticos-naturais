/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs/promises";
import path from "node:path";

export type StoreData = {
  settings: Record<string, any>;
  products: Array<Record<string, any>>;
  promotions: Array<Record<string, any>>;
  reviews: Array<Record<string, any>>;
  categories: Array<Record<string, any>>;
};

const localStoreFile = path.join(
  process.cwd(),
  "content",
  "store.json"
);

function githubConfig() {
  const repository = String(
    process.env.GITHUB_REPO || ""
  ).trim();

  const [owner, repo] = repository.split("/");

  return {
    owner: String(owner || "").trim(),
    repo: String(repo || "").trim(),
    branch: String(
      process.env.GITHUB_BRANCH || "main"
    ).trim(),
    token: String(
      process.env.GITHUB_TOKEN || ""
    ).trim()
  };
}

function isVercelRuntime() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV)
  );
}

function requireGithubConfiguration() {
  const configuration = githubConfig();

  const missing: string[] = [];

  if (!configuration.owner || !configuration.repo) {
    missing.push("GITHUB_REPO");
  }

  if (!configuration.branch) {
    missing.push("GITHUB_BRANCH");
  }

  if (!configuration.token) {
    missing.push("GITHUB_TOKEN");
  }

  if (missing.length > 0) {
    throw new Error(
      `Sincronização não configurada na Vercel. Configure: ${missing.join(
        ", "
      )}.`
    );
  }

  return configuration;
}

export function normalizeStore(
  input: any
): StoreData {
  const settings = input?.settings || {};

  return {
    settings: {
      ...settings,
      storeName: String(
        settings.storeName ||
          "Patrícia Santana"
      ),
      brandName: String(
        settings.brandName || "EXALE"
      ),
      slogan: String(
        settings.slogan ||
          "Cosméticos naturais que transformam cuidado em beleza, equilíbrio e bem-estar."
      ),
      heroTitle: String(
        settings.heroTitle ||
          "Natureza, beleza e sofisticação em cada detalhe."
      ),
      heroSubtitle: String(
        settings.heroSubtitle ||
          "Uma experiência exclusiva em cosméticos naturais, autocuidado e presentes especiais."
      ),
      logoUrl: String(
        settings.logoUrl || ""
      ),
      heroImageUrl: String(
        settings.heroImageUrl || ""
      ),
      whatsapp: String(
        settings.whatsapp || ""
      ).replace(/\D/g, ""),
      instagram: String(
        settings.instagram || ""
      ),
      tiktok: String(
        settings.tiktok || ""
      ),
      cnpj: String(
        settings.cnpj ||
          "24.604.430/0001-80"
      ),
      primaryColor: String(
        settings.primaryColor ||
          "#170d08"
      ),
      accentColor: String(
        settings.accentColor ||
          "#d4af37"
      ),
      footerText: String(
        settings.footerText ||
          "Patrícia Santana • EXALE — cosméticos naturais, cuidado e sofisticação."
      )
    },
    products: Array.isArray(
      input?.products
    )
      ? input.products.map(
          (product: Record<string, any>, index: number) => {
            const id = String(
              product?.id ||
              product?.slug ||
              product?.sku ||
              `produto-${index + 1}`
            );

            const price =
              product?.price === ""
                ? 0
                : Number(product?.price || 0);

            const promotionalPrice =
              product?.promotionalPrice === "" ||
              product?.promotionalPrice === null ||
              product?.promotionalPrice === undefined
                ? null
                : Number(
                    product.promotionalPrice
                  );

            const stock =
              product?.stock === ""
                ? 0
                : Number(product?.stock || 0);

            return {
              ...product,
              id,
              price:
                Number.isFinite(price)
                  ? price
                  : 0,
              promotionalPrice:
                promotionalPrice === null ||
                Number.isFinite(
                  promotionalPrice
                )
                  ? promotionalPrice
                  : null,
              stock:
                Number.isFinite(stock)
                  ? stock
                  : 0,
              active:
                product?.active !== false,
              featured:
                Boolean(product?.featured),
            };
          }
        )
      : [],
    promotions: Array.isArray(
      input?.promotions
    )
      ? input.promotions
      : [],
    reviews: Array.isArray(
      input?.reviews
    )
      ? input.reviews
      : [],
    categories: Array.isArray(
      input?.categories
    )
      ? input.categories
      : []
  };
}

async function readLocalStore(): Promise<StoreData> {
  const raw = await fs.readFile(
    localStoreFile,
    "utf8"
  );

  return normalizeStore(
    JSON.parse(raw)
  );
}

export async function readStore(): Promise<StoreData> {
  const {
    owner,
    repo,
    branch,
    token
  } = githubConfig();

  if (owner && repo) {
    const rawUrl =
      `https://raw.githubusercontent.com/` +
      `${owner}/${repo}/${branch}/content/store.json` +
      `?t=${Date.now()}`;

    const response = await fetch(rawUrl, {
      cache: "no-store",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            Accept:
              "application/vnd.github+json"
          }
        : undefined
    });

    if (response.ok) {
      return normalizeStore(
        await response.json()
      );
    }
  }

  return readLocalStore();
}

export async function writeStore(
  input: StoreData
): Promise<void> {
  const store = normalizeStore(input);

  const currentConfiguration =
    githubConfig();

  if (
    !currentConfiguration.owner ||
    !currentConfiguration.repo ||
    !currentConfiguration.token
  ) {
    if (isVercelRuntime()) {
      requireGithubConfiguration();
    }

    await fs.mkdir(
      path.dirname(localStoreFile),
      {
        recursive: true
      }
    );

    await fs.writeFile(
      localStoreFile,
      JSON.stringify(
        store,
        null,
        2
      ) + "\n",
      "utf8"
    );

    return;
  }

  const {
    owner,
    repo,
    branch,
    token
  } = requireGithubConfiguration();

  const apiUrl =
    `https://api.github.com/repos/` +
    `${owner}/${repo}/contents/content/store.json`;

  const currentResponse = await fetch(
    `${apiUrl}?ref=${encodeURIComponent(
      branch
    )}&t=${Date.now()}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          "application/vnd.github+json"
      }
    }
  );

  let sha = "";

  if (currentResponse.ok) {
    const currentData =
      await currentResponse.json();

    sha = String(
      currentData?.sha || ""
    );
  }

  const saveResponse = await fetch(
    apiUrl,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          "application/vnd.github+json",
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        message:
          `Atualização pelo painel EXALE ` +
          new Date().toISOString(),
        content: Buffer.from(
          JSON.stringify(
            store,
            null,
            2
          ) + "\n"
        ).toString("base64"),
        branch,
        ...(sha ? { sha } : {})
      })
    }
  );

  if (!saveResponse.ok) {
    throw new Error(
      `Falha ao salvar os dados no GitHub: ` +
        `HTTP ${saveResponse.status} ` +
        `${await saveResponse.text()}`
    );
  }
}

export async function uploadImageToGithub(
  filename: string,
  bytes: Uint8Array
): Promise<string> {
  const currentConfiguration =
    githubConfig();

  if (
    !currentConfiguration.owner ||
    !currentConfiguration.repo ||
    !currentConfiguration.token
  ) {
    if (isVercelRuntime()) {
      requireGithubConfiguration();
    }

    const localUploadPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      filename
    );

    await fs.mkdir(
      path.dirname(localUploadPath),
      {
        recursive: true
      }
    );

    await fs.writeFile(
      localUploadPath,
      bytes
    );

    return `/uploads/${filename}`;
  }

  const {
    owner,
    repo,
    branch,
    token
  } = requireGithubConfiguration();

  const uploadPath =
    `public/uploads/${filename}`;

  const apiUrl =
    `https://api.github.com/repos/` +
    `${owner}/${repo}/contents/${uploadPath}`;

  const currentResponse = await fetch(
    `${apiUrl}?ref=${encodeURIComponent(
      branch
    )}&t=${Date.now()}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          "application/vnd.github+json"
      }
    }
  );

  let sha = "";

  if (currentResponse.ok) {
    const currentData =
      await currentResponse.json();

    sha = String(
      currentData?.sha || ""
    );
  }

  const uploadResponse = await fetch(
    apiUrl,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          "application/vnd.github+json",
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        message:
          `Upload de imagem pelo painel EXALE: ${filename}`,
        content: Buffer.from(
          bytes
        ).toString("base64"),
        branch,
        ...(sha ? { sha } : {})
      })
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `Falha ao enviar a imagem ao GitHub: ` +
        `HTTP ${uploadResponse.status} ` +
        `${await uploadResponse.text()}`
    );
  }

  return (
    `https://raw.githubusercontent.com/` +
    `${owner}/${repo}/${branch}/${uploadPath}` +
    `?v=${Date.now()}`
  );
}
