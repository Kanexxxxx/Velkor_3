# Auditoria Técnica - VELKOR

Data da auditoria: 2026-05-12

## Escopo

Auditoria de estrutura, rotas, links, dados oficiais da marca, comandos de verificação, segurança básica e limpeza do projeto VELKOR.

## Estrutura analisada

- `frontend/`: Next.js, TypeScript, CSS global, componentes, services e types.
- `backend/`: Node.js nativo com endpoints `/api/health` e `/api/config`.
- `docs/`: documentação de integrações e decisões do projeto.
- `.agents/skills/`: skills instaladas pelo usuário para fluxo de trabalho.

## Problemas encontrados

- Páginas de suporte, marca e políticas existiam apenas via `/info?page=...`, enquanto o MVP precisava de URLs diretas e amigáveis.
- Links internos do footer, navbar, admin, produto, conta e formulários ainda apontavam para `/info?page=...`.
- O smoke test não validava todas as rotas institucionais exigidas.
- Existiam duas pastas vazias em `frontend/src/components/`.
- O projeto não possui script `npm run test`.
- `npm audit` no frontend reporta 2 vulnerabilidades moderadas associadas a `next` e `postcss` transitivo. O fix automático sugerido pelo npm é inadequado porque propõe downgrade major para `next@9.3.3`; não foi aplicado.

## Correções feitas

- Criadas URLs limpas para suporte, marca e políticas:
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
- Mantida compatibilidade com `/info?page=...`.
- Centralizado o render das páginas institucionais em `frontend/src/app/info/InfoPageView.tsx`.
- Adicionado roteamento dinâmico controlado em `frontend/src/app/[slug]/page.tsx`.
- Atualizados links internos para usar as novas URLs limpas.
- Atualizado smoke test para validar todas as rotas essenciais.
- Confirmados dados oficiais da marca no frontend e backend:
  - VELKOR
  - https://www.instagram.com/velk.0r/
  - velkor.officiall@gmail.com
  - +55 16 99706-2339

## Arquivos alterados

- `frontend/src/services/infoPages.ts`
- `frontend/src/app/info/InfoPageView.tsx`
- `frontend/src/app/info/page.tsx`
- `frontend/src/app/[slug]/page.tsx`
- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/components/layout/Footer.tsx`
- `frontend/src/app/info/InfoForms.tsx`
- `frontend/src/app/admin/AdminPageClient.tsx`
- `frontend/src/app/account/AccountPageClient.tsx`
- `frontend/src/app/product/[id]/ProductDetailClient.tsx`
- `frontend/scripts/smoke.mjs`
- `GUIA_DO_USUARIO.md`
- `AUDITORIA_TECNICA.md`

## Arquivos ou pastas removidos

- `frontend/src/components/checkout`: pasta vazia, sem imports e sem conteúdo.
- `frontend/src/components/ui`: pasta vazia, sem imports e sem conteúdo.

## Rotas testadas

- `/`
- `/shop`
- `/shop?cat=sneakers`
- `/shop?cat=apparel`
- `/shop?cat=accessories`
- `/shop?sort=new`
- `/product/v01`
- `/wishlist`
- `/account`
- `/checkout`
- `/admin`
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
- `/info?page=privacy`
- `/legacy/index.html` com retorno 404 esperado

## Comandos executados

- `frontend`: `npm install`
- `frontend`: `npm run typecheck`
- `frontend`: `npm run lint`
- `frontend`: `npm run build`
- `frontend`: `npm run smoke`
- `frontend`: `npm audit --json`
- `frontend`: checagem HTTP de 37 links internos renderizados
- `backend`: `npm install`
- `backend`: `npm run check`
- `frontend` e `backend`: `npm run test` retornou `Missing script: "test"`

## Segurança

- Nenhum arquivo `.env` real foi mantido no projeto.
- `backend/.env.example` contém apenas exemplos e dados públicos da marca.
- Não foram encontrados tokens reais, senhas reais ou chaves privadas no código auditado.
- O relatório de vulnerabilidade do frontend permanece como pendência controlada por depender de correção segura da cadeia Next/PostCSS.

## Checklist MVP

- [x] Página inicial funcional
- [x] Loja e produtos
- [x] Categorias por URL
- [x] Produto detalhado
- [x] Carrinho
- [x] Favoritos
- [x] Login/cadastro MVP em localStorage
- [x] Checkout MVP
- [x] Painel admin MVP
- [x] Footer completo
- [x] Página de contato
- [x] Políticas essenciais
- [x] Dados oficiais da VELKOR
- [x] Rotas institucionais amigáveis
- [x] Build validado
- [x] Smoke test validado

## Pendências e sugestões futuras

- Criar testes automatizados com Playwright para cliques reais em navbar, footer, checkout, login e responsividade.
- Criar `npm run test` quando os testes automatizados forem adicionados.
- Avaliar atualização segura de Next.js quando houver correção oficial para o alerta PostCSS sem downgrade inadequado.
- Migrar persistência de carrinho, pedidos e usuários de `localStorage` para PostgreSQL quando o backend sair do modo MVP.
- Integrar Mercado Pago em ambiente sandbox antes de liberar pagamentos reais.
- Proteger o painel admin com autenticação real antes de produção.
