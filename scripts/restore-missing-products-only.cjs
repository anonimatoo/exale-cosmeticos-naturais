const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const currentDir = "content/products";
fs.mkdirSync(currentDir, { recursive: true });

function exists(file) {
  try { return fs.existsSync(file); } catch { return false; }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function slugFromProduct(product, file) {
  const raw = product?.slug || product?.id || product?.codigo || product?.code || path.basename(file, ".json");
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "produto";
}

function safeName(slug) {
  return slug.replace(/[^a-z0-9-]/g, "-") + ".json";
}

function listCurrentProducts() {
  const map = new Map();

  if (!exists(currentDir)) return map;

  for (const file of fs.readdirSync(currentDir)) {
    if (!file.endsWith(".json")) continue;

    const full = path.join(currentDir, file);
    const product = readJson(full);
    const slug = slugFromProduct(product || {}, full);

    map.set(slug, full);
  }

  return map;
}

function walk(dir, files = []) {
  if (!exists(dir)) return files;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    let stat;

    try { stat = fs.statSync(full); } catch { continue; }

    if (stat.isDirectory()) {
      if (["node_modules", ".next", ".git", ".turbo"].includes(item)) continue;
      walk(full, files);
    } else if (full.includes("content/products") && full.endsWith(".json")) {
      files.push(full);
    }
  }

  return files;
}

function collectFromGitHistory() {
  const files = [];

  try {
    const commits = cp.execSync("git rev-list --all -- content/products", { encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 80);

    for (const commit of commits) {
      let names = [];

      try {
        names = cp.execSync(`git ls-tree -r --name-only ${commit} content/products`, { encoding: "utf8" })
          .split(/\r?\n/)
          .filter((x) => x.endsWith(".json"));
      } catch {}

      for (const name of names) {
        try {
          const text = cp.execSync(`git show ${commit}:${name}`, {
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
          });

          const tmpDir = ".tmp-restored-products-from-git";
          fs.mkdirSync(tmpDir, { recursive: true });

          const tmpFile = path.join(tmpDir, commit.slice(0, 10) + "-" + path.basename(name));
          fs.writeFileSync(tmpFile, text, "utf8");
          files.push(tmpFile);
        } catch {}
      }
    }
  } catch {}

  return files;
}

const before = listCurrentProducts();
const currentSlugs = new Set(before.keys());
const candidates = [
  ...walk("backups"),
  ...collectFromGitHistory(),
];

let restored = 0;
const restoredList = [];

for (const file of candidates) {
  const product = readJson(file);

  if (!product || typeof product !== "object") continue;

  const slug = slugFromProduct(product, file);

  if (currentSlugs.has(slug)) continue;

  const target = path.join(currentDir, safeName(slug));

  if (exists(target)) continue;

  fs.writeFileSync(target, JSON.stringify(product, null, 2) + "\n", "utf8");

  currentSlugs.add(slug);
  restored++;
  restoredList.push({ slug, from: file, to: target });
}

if (exists(".tmp-restored-products-from-git")) {
  fs.rmSync(".tmp-restored-products-from-git", { recursive: true, force: true });
}

const after = listCurrentProducts();

for (const slug of before.keys()) {
  if (!after.has(slug)) {
    console.error("ERRO: produto atual sumiu, bloqueando correcao:", slug);
    process.exit(1);
  }
}

console.log("Produtos existentes antes:", before.size);
console.log("Produtos existentes depois:", after.size);
console.log("Produtos faltantes restaurados:", restored);

if (restoredList.length) {
  for (const item of restoredList) {
    console.log("Restaurado:", item.slug, "->", item.to);
  }
} else {
  console.log("Nenhum produto faltante encontrado para restaurar.");
}
