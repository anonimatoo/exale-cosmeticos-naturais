# Correções aplicadas ao painel Exale

- Corrigido o erro JavaScript `Unexpected string` causado pela montagem inválida do atributo `onerror`.
- Unificadas as rotas `/admin`, `/painel` e `/painel-exale`.
- Adicionada autenticação visível por senha administrativa.
- Integrado o painel às APIs existentes `/api/admin/login`, `/api/admin/save` e `/api/admin/upload`.
- Removidas chamadas do painel às rotas inexistentes `/api/admin/upsert-product` e `/api/admin/upload-product-image`.
- Cadastro, edição e exclusão agora salvam o objeto completo da loja pela API real.
- Adicionado envio do cabeçalho `x-admin-password` nas operações administrativas.
- Corrigida a abertura do modal para que os campos fiquem visíveis e editáveis.
- Adicionados tratamento de erro de imagem, mensagens de status e logout.

## Validar

```bash
rm -rf node_modules .next
npm install
npm run lint
npm run build
npm run dev
```

Acesse `http://localhost:3000/admin`.
