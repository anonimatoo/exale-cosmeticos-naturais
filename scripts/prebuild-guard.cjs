"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const productsDir = path.join(root, "content", "products");

function fail(message) {
  console.error("[PREBUILD-GUARD] ERRO:", message);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, "package.json"))) {
  fail("package.json nao encontrado.");
}

if (!fs.existsSync(productsDir)) {
  fail("content/products nao encontrado.");
}

const products = fs
  .readdirSync(productsDir)
  .filter((file) => file.endsWith(".json"));

if (products.length === 0) {
  fail("nenhum produto JSON encontrado.");
}

for (const file of products) {
  const fullPath = path.join(productsDir, file);

  try {
    JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`JSON invalido em ${file}: ${error.message}`);
  }
}

console.log(
  `[PREBUILD-GUARD] OK: ${products.length} produto(s) preservado(s).`
);
