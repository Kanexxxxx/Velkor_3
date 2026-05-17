# Admin Completo 2 e 3 Design

## Objetivo

Concluir o painel admin incrementalmente para que a operacao diaria do VOLKERR possa ser feita pelo `/admin`, sem editar codigo antes do deploy na VPS.

## Escopo da Fase Admin Completo 2

- Carregar no painel real: pedidos, produtos, usuarios, cupons e newsletter em uma unica atualizacao admin.
- Permitir alterar status de pedidos existentes usando o endpoint admin ja protegido.
- Permitir editar dados basicos de cliente: nome, email, role e email verificado.
- Mostrar detalhes do cliente no admin: enderecos salvos e pedidos vinculados.
- Manter protecao por `requireAdmin()` e audit log para alteracoes de usuario e pedido.

## Escopo da Fase Admin Completo 3

- Expor configuracoes operacionais simples da loja no painel, sem criar uma nova tabela agora.
- Centralizar configuracoes editaveis em env/config do backend: marca, email de suporte, WhatsApp, Instagram, URL publica, modo Mercado Pago, modo email e credenciais Melhor Envio presentes/ausentes.
- Mostrar status seguro de integracoes sem vazar segredo.
- Manter cupons e newsletter administraveis no painel.
- Atualizar `backend/.env.example` para documentar Melhor Envio no backend.

## Fora de escopo agora

- Nao criar uma nova pagina admin.
- Nao alterar branding/layout global.
- Nao criar migration para configuracoes de loja ainda.
- Nao guardar credenciais no frontend.
- Nao implementar compra de etiqueta Melhor Envio nesta etapa; somente preparar configuracao segura e painel.

## Arquitetura

O backend continua com `backend/src/routes/admin.js` como entrada HTTP e `backend/src/db/admin.js` como repositorio Prisma. O frontend continua em `frontend/src/app/admin/AdminPageClient.tsx`, preservando layout atual e adicionando blocos funcionais no mesmo painel. O contrato typed fica em `frontend/src/services/adminApi.ts`.

## Dados e seguranca

Usuarios nunca retornam `passwordHash`. Configuracoes retornam apenas valores publicos e flags de presenca de segredo. Alteracoes criticas usam audit log: pedido, usuario, cupom, produto e newsletter.

## Rollback

Se algo falhar, manteremos o fallback legado do `/api/admin/unlock` e o modo demo/local atual. Como os commits sao pequenos, o rollback tambem pode ser feito revertendo somente o commit da Fase 2 ou somente o commit da Fase 3.
