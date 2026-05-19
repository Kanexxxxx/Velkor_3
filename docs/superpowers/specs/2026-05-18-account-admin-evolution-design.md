# VOLKERR Account And Admin Evolution Design

## Goal

Evoluir `/account` e `/admin` para experiências reais de e-commerce moderno, mantendo a arquitetura atual, o branding VOLKERR, a sessão HttpOnly, Prisma/PostgreSQL, Mercado Pago, Melhor Envio e SMTP já existentes.

## Constraints

- Não recriar o projeto.
- Não trocar stack, layout base ou identidade visual.
- Não remover fallback/demo até a validação completa.
- Implementar em fases pequenas, com commits pequenos.
- Validar `npm test --prefix backend`, `npm run typecheck --prefix frontend` e `npm run build --prefix frontend` frequentemente.
- Toda rota sensível deve usar autenticação real server-side.

## Phase 1: UX Responsiva E Catálogo Confiável

Adicionar um indicador global de carregamento para cliques, submits e navegações. O objetivo é deixar claro que a ação está em andamento, evitando sensação de site congelado.

Corrigir o flash de produtos antigos: páginas de catálogo devem iniciar com cache real da API quando existir, ou estado de carregamento, e só cair para fallback demo quando a API falhar.

## Phase 2: Mercado Pago 100/100

Melhorar a preferência Checkout Pro com os campos recomendados pela medição:

- `items.id`
- `items.title`
- `items.description`
- `items.category_id`
- `payer.email`
- `payer.first_name`
- `payer.last_name`
- `payer.phone`
- `payer.address`

Referência oficial usada: documentação Mercado Pago Checkout Pro Preferences e Industry Data.

## Phase 3: Área Do Cliente

Manter `/account` atual e evoluir incrementalmente para rotas dedicadas:

- `/account`
- `/account/profile`
- `/account/orders`
- `/account/orders/[id]`
- `/account/addresses`
- `/account/security`
- `/account/wishlist`
- `/account/coupons`
- `/account/support`

Implementar primeiro por compatibilidade via abas existentes e links, depois quebrar em páginas dedicadas.

Endpoints planejados:

- `GET /api/account/me`
- `PATCH /api/account/profile`
- `GET /api/account/orders`
- `GET /api/account/orders/:id`
- `GET /api/account/addresses`
- `POST /api/account/addresses`
- `PATCH /api/account/addresses/:id`
- `DELETE /api/account/addresses/:id`
- `POST /api/account/security/change-password`
- `POST /api/account/security/logout-all`
- `POST /api/account/verify-email/resend`
- `GET /api/account/coupons`
- `GET /api/account/wishlist`

Todos protegidos por `requireAuth`.

## Phase 4: Admin Profissional Modular

Evoluir `/admin` em módulos sem recriar a tela:

- dashboard
- pedidos
- produtos
- clientes
- pagamentos
- frete
- cupons
- newsletter
- configurações
- logs

As primeiras entregas devem priorizar: dashboard real, pedidos com filtros, produtos com importação CSV Nuvemshop, clientes, pagamentos/webhooks e logs.

## Phase 5: Importação Nuvemshop

Adicionar importação CSV de produtos da Nuvemshop no admin:

- upload CSV
- preview antes de importar
- mapeamento seguro de colunas
- validação server-side
- criação/atualização de produtos
- relatório de erros por linha

## Security Model

- `requireAuth` para conta.
- `requireAdmin` para admin.
- usuário só acessa próprios pedidos por `sessionId` ou email autenticado.
- admin actions geram audit logs.
- uploads validam MIME, extensão e tamanho.
- CSV não executa conteúdo, só parseia dados.
- logs não expõem senha, token, secret ou dados sensíveis.

## Rollback

Cada fase terá commit próprio. Para rollback em produção:

1. `git log --oneline`
2. `git revert <commit>`
3. `npm run build --prefix frontend`
4. `pm2 restart velkor-backend --update-env`
5. `pm2 restart velkor-frontend --update-env`

