# Funcionalidades atuais do frontend

Este documento cataloga o que o site VELKOR entrega no estado atual de MVP, ainda em modo demonstração para dados locais.

## Autenticação e conta

- Cadastro em `/account`, com criação de usuário local, sessão automática e redirecionamento para a área da conta.
- Login em `/account`, com sessão persistida por período limitado.
- Recuperação de senha em `/account/reset-password?token=...`.
- Troca de senha, edição de perfil, endereços e histórico de pedidos.
- Logout pelo menu do usuário.

## Navbar responsiva

- Menu desktop com links principais e item ativo.
- Menu mobile lateral.
- Ícone de conta ou avatar quando logado.
- Favoritos com badge.
- Sacola com badge e drawer lateral.

## Loja e produtos

- `/shop` lista produtos.
- `/shop?cat=sneakers`, `/shop?cat=apparel` e `/shop?cat=accessories` filtram categorias.
- Filtros por categoria, marca, tamanho, cor, preço e busca textual.
- Ordenação por popularidade, novidade, preço e avaliação.
- Página de produto em `/product/[id]`.

## Checkout

- Auto-fill com dados do usuário logado.
- Endereços salvos e opção de novo endereço.
- Frete padrão ou expresso.
- Pagamentos demonstrativos: cartão, Mercado Pago, Pix e PayPal.
- Cupom `VELKOR15`.
- Pedido salvo em `localStorage` no modo MVP.

## Favoritos e sacola

- Wishlist persistida em `localStorage`.
- `/wishlist` lista produtos salvos.
- Sacola lateral com alteração de quantidade, remoção e total ao vivo.

## Páginas institucionais

Rotas limpas disponíveis:

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

A rota antiga `/info?page=...` permanece ativa por compatibilidade.

## Notificações

- `NotificationProvider` global com variantes success, error e info.
- Auto-dismiss e fechamento manual.

## Acessibilidade e responsividade

- Foco visível em links, botões e campos.
- `Esc` fecha menu, drawer e dropdown.
- Breakpoints em 1100px, 760px e 520px.
- `prefers-reduced-motion` reduz animações.
- Atributos ARIA nos principais controles interativos.

## Storage usado no modo demo

| Chave                 | Conteúdo                                |
| --------------------- | --------------------------------------- |
| `velkor_users_v1`     | Lista de usuários com hash e endereços  |
| `velkor_session_v1`   | Sessão atual `{ userId, expiresAt }`    |
| `velkor_orders_v1`    | Pedidos com `userId` opcional           |
| `velkor_cart_v1`      | Itens da sacola                         |
| `velkor_wishlist_v1`  | Lista de IDs favoritos                  |

Quando integrar o backend, cada chave acima deve virar uma rota HTTP equivalente.
