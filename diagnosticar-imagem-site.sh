#!/usr/bin/env bash
set -u

SITE="https://exale-cosmeticos-naturais.vercel.app"
OUT="diagnostico-imagem-site-$(date +%Y%m%d-%H%M%S).txt"

echo "DIAGNÓSTICO DE IMAGEM / BANNER / SITE" | tee "$OUT"
echo "Data: $(date)" | tee -a "$OUT"
echo "Projeto: $(pwd)" | tee -a "$OUT"
echo "" | tee -a "$OUT"

echo "1) Últimos banners locais encontrados:" | tee -a "$OUT"
find content/banners -type f -name "*.json" -maxdepth 1 2>/dev/null | sort | while read -r f; do
  echo "---- $f" | tee -a "$OUT"
  python3 - "$f" <<'PY' 2>&1 | tee -a "$OUT"
import json, sys
p=sys.argv[1]
try:
    d=json.load(open(p, encoding="utf-8"))
    print("slug:", d.get("slug"))
    print("title:", d.get("title"))
    print("image:", d.get("image"))
    print("active:", d.get("active"))
    print("order:", d.get("order"))
except Exception as e:
    print("ERRO JSON:", e)
PY
done

echo "" | tee -a "$OUT"
echo "2) Conferindo se cada imagem dos banners abre publicamente:" | tee -a "$OUT"
python3 - <<'PY' > /tmp/banner_images.txt
import json, glob
for f in sorted(glob.glob("content/banners/*.json")):
    try:
        d=json.load(open(f, encoding="utf-8"))
        img=(d.get("image") or "").strip()
        if img:
            print(f"{f}|{img}")
    except Exception:
        pass
PY

while IFS='|' read -r file img; do
  [ -z "${img:-}" ] && continue
  echo "Imagem em $file" | tee -a "$OUT"
  echo "$img" | tee -a "$OUT"
  code="$(curl -L -s -o /tmp/check_image.bin -w "%{http_code}" "$img")"
  size="$(wc -c < /tmp/check_image.bin 2>/dev/null || echo 0)"
  mime="$(file -b --mime-type /tmp/check_image.bin 2>/dev/null || echo desconhecido)"
  echo "HTTP: $code | bytes: $size | mime: $mime" | tee -a "$OUT"
  if [ "$code" != "200" ]; then
    echo "FALHA: a URL da imagem não abre publicamente." | tee -a "$OUT"
  fi
  echo "" | tee -a "$OUT"
done < /tmp/banner_images.txt

echo "" | tee -a "$OUT"
echo "3) Conferindo API pública /api/storefront:" | tee -a "$OUT"
api_code="$(curl -L -s -o /tmp/storefront.json -w "%{http_code}" "$SITE/api/storefront?diag=$(date +%s)")"
echo "HTTP API: $api_code" | tee -a "$OUT"
python3 - <<'PY' 2>&1 | tee -a "$OUT"
import json
try:
    d=json.load(open("/tmp/storefront.json", encoding="utf-8"))
    print("ok:", d.get("ok"))
    print("generatedAt:", d.get("generatedAt"))
    banners=d.get("banners") or []
    print("total banners api:", len(banners))
    for b in banners[:10]:
        print("API banner:", b.get("slug"), "|", b.get("title"), "|", b.get("image"))
except Exception as e:
    print("ERRO LENDO API:", e)
    print(open("/tmp/storefront.json", encoding="utf-8", errors="ignore").read()[:500])
PY

echo "" | tee -a "$OUT"
echo "4) Conferindo se a home contém as URLs das imagens dos banners:" | tee -a "$OUT"
home_code="$(curl -L -s -o /tmp/home.html -w "%{http_code}" "$SITE/?diag=$(date +%s)")"
echo "HTTP HOME: $home_code" | tee -a "$OUT"

while IFS='|' read -r file img; do
  [ -z "${img:-}" ] && continue
  clean_img="${img%%\?*}"
  if grep -Fq "$clean_img" /tmp/home.html; then
    echo "OK: home contém imagem de $file" | tee -a "$OUT"
  else
    echo "FALHA: home NÃO contém imagem de $file" | tee -a "$OUT"
    echo "Imagem esperada: $clean_img" | tee -a "$OUT"
  fi
done < /tmp/banner_images.txt

echo "" | tee -a "$OUT"
echo "5) Conferindo arquivos críticos:" | tee -a "$OUT"
for f in \
  src/lib/runtime-store.ts \
  src/app/api/storefront/route.ts \
  src/app/api/admin/upload/route.ts \
  src/app/api/admin/data/route.ts \
  src/app/page.tsx
do
  echo "---- $f" | tee -a "$OUT"
  if [ -f "$f" ]; then
    grep -nE 'force-dynamic|force-no-store|no-store|raw.githubusercontent|publicUrl|download_url|getRuntimeStorefront|/api/storefront' "$f" | head -80 | tee -a "$OUT" || true
  else
    echo "ARQUIVO AUSENTE" | tee -a "$OUT"
  fi
done

echo "" | tee -a "$OUT"
echo "6) Conferindo build local:" | tee -a "$OUT"
npm run build 2>&1 | tee -a "$OUT"
BUILD_STATUS="${PIPESTATUS[0]}"

echo "" | tee -a "$OUT"
echo "RESULTADO FINAL:" | tee -a "$OUT"
if [ "$BUILD_STATUS" = "0" ] && [ "$api_code" = "200" ] && [ "$home_code" = "200" ]; then
  echo "Diagnóstico concluído. Leia as linhas com FALHA acima para saber o ponto exato." | tee -a "$OUT"
else
  echo "Existe erro de build/API/home. Leia o arquivo completo: $OUT" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "Arquivo gerado: $OUT"
