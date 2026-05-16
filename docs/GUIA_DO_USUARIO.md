# Guia do Usuário - VELKOR

Este guia resume como instalar, rodar, editar e testar o projeto VELKOR.

## Estrutura principal

- `frontend/`: aplicação Next.js com TypeScript e estilos globais.
- `backend/`: API Node.js simples para health check e configuração pública.
- `docs/`: documentação de integração e planejamento.
- `.agents/skills/`: skills instaladas para apoio do Codex.

## Instalação

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

## Rodar localmente

Frontend:

```bash
cd frontend
npm run dev -- --hostname 127.0.0.1
```

Acesse:

```text
http://127.0.0.1:3000/
```

Backend:

```bash
cd backend
npm start
```

Endpoints úteis:

```text
http://localhost:3001/api/health
http://localhost:3001/api/config
```

## Build de produção

```bash
cd frontend
npm run build
```

Para checar sintaxe do backend:

```bash
cd backend
npm run check
```

## Testar rotas

Com o frontend rodando em `http://127.0.0.1:3000/`:

```bash
cd frontend
npm run smoke
```

O smoke test valida home, loja, categorias, produto, conta, checkout, admin, wishlist e páginas institucionais.

## Rotas principais

- `/`: página inicial.
- `/shop`: loja.
- `/shop?cat=sneakers`: tênis.
- `/shop?cat=apparel`: vestuário.
- `/shop?cat=accessories`: acessórios.
- `/product/v01`: exemplo de produto.
- `/wishlist`: favoritos.
- `/account`: login, cadastro e área da conta.
- `/checkout`: checkout.
- `/admin`: painel administrativo MVP.

## Rotas de suporte, marca e políticas

- `/envio-e-devolucoes`
- `/guia-de-tamanhos`
- `/rastrear-pedido`
- `/contato`
- `/faq`
- `/nossa-historia`
- `/lojas-parceiras`
- `/carreiras`
- `/imprensa`
- `/sustentabilidade`
- `/privacidade`
- `/termos`
- `/reembolso`
- `/cookies`

A rota antiga `/info?page=...` continua funcionando por compatibilidade.

## Editar páginas principais

- Home: `frontend/src/app/page.tsx`
- Loja: `frontend/src/app/shop/ShopPageClient.tsx`
- Produto: `frontend/src/app/product/[id]/ProductDetailClient.tsx`
- Conta: `frontend/src/app/account/AccountPageClient.tsx`
- Checkout: `frontend/src/app/checkout/CheckoutPageClient.tsx`
- Admin: `frontend/src/app/admin/AdminPageClient.tsx`
- Footer: `frontend/src/components/layout/Footer.tsx`
- Navbar: `frontend/src/components/layout/Navbar.tsx`

## Alterar contatos da marca

Edite apenas:

```text
frontend/src/services/brand.ts
backend/.env.example
```

Dados oficiais atuais:

- Marca: VELKOR
- Instagram: https://www.instagram.com/velk.0r/
- Email: velkor.officiall@gmail.com
- WhatsApp: +55 16 99706-2339

## Editar textos institucionais

Use:

```text
frontend/src/services/infoPages.ts
```

Esse arquivo alimenta suporte, marca, políticas e rotas limpas.

## Publicar/deployar

Fluxo recomendado para MVP:

1. Rode `npm install` dentro de `frontend/`.
2. Rode `npm run build`.
3. Publique o diretório `frontend/` em uma plataforma compatível com Next.js.
4. Configure variáveis públicas e backend conforme `backend/.env.example`.
5. Rode o backend em ambiente Node.js quando as APIs reais forem ativadas.

## Comandos principais

```bash
cd frontend && npm install
cd frontend && npm run dev -- --hostname 127.0.0.1
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run smoke
cd backend && npm install
cd backend && npm run check
cd backend && npm start
```

## Observações

- O projeto ainda não tem script `npm run test`; use `npm run smoke`, `npm run typecheck`, `npm run lint` e `npm run build` como verificação de MVP.
- Não coloque senhas, tokens ou chaves privadas em arquivos versionados.
