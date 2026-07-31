/* eslint-disable @typescript-eslint/no-explicit-any */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { normalizeStorefrontSafe, normalizeProductsSafe } from "./storefront-safety";

const ROOT = process.cwd();

async function readJsonSafe(relativeFile: string, fallback: any) {
  try {
    const full = path.join(ROOT, relativeFile);
    const text = await readFile(full, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export async function readLocalJsonFileSafe(relativeFile: string, fallback: any = {}) {
  return readJsonSafe(relativeFile, fallback);
}

export async function readLocalJsonFolderSafe(relativeDir: string) {
  const fullDir = path.join(ROOT, relativeDir);
  const items: any[] = [];

  try {
    const files = await readdir(fullDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const full = path.join(fullDir, file);

      try {
        const info = await stat(full);

        if (info.size > 2 * 1024 * 1024) {
          continue;
        }

        const text = await readFile(full, "utf8");
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === "object") items.push(item);
          }
        } else if (parsed && typeof parsed === "object") {
          items.push(parsed);
        }
      } catch {}
    }
  } catch {}

  return items;
}

export async function readLocalStorefrontSafe() {
  const settings =
    await readJsonSafe("content/settings/store.json", null) ||
    await readJsonSafe("content/settings.json", {}) ||
    {};

  const products = normalizeProductsSafe(await readLocalJsonFolderSafe("content/products"));
  const banners = await readLocalJsonFolderSafe("content/banners");
  const productLines = await readLocalJsonFolderSafe("content/product-lines");

  return normalizeStorefrontSafe({
    settings,
    products,
    banners,
    productLines,
    coupons: [],
    combos: [],
  });
}
