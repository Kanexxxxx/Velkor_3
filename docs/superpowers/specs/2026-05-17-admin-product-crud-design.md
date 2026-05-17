# Admin Product CRUD Design

## Objetivo

Transformar o painel admin em fonte operacional para catalogo de produtos antes do deploy VPS. O admin deve permitir criar, editar e ativar/desativar produtos reais no PostgreSQL sem redesenhar o painel nem remover fallback/demo ainda.

## Escopo Desta Etapa

- Listar produtos no admin usando API real.
- Criar produto.
- Editar produto existente.
- Ativar/desativar produto.
- Preservar layout atual do `/admin`.
- Registrar audit log para criacao/edicao/status de produto.
- Manter fallback local apenas quando API estiver indisponivel.

## Campos Gerenciados

- `id`
- `slug`
- `name`
- `category`
- `brand`
- `price`
- `oldPrice`
- `badge`
- `discount`
- `colors`
- `image`
- `images`
- `sizes`
- `tag`
- `active`

`rating` e `reviews` permanecem editaveis no backend com defaults seguros, mas a UI foca no necessario para cadastrar produtos reais.

## Rotas

- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`

Todas usam `requireAdmin()` existente, rate limit admin e audit log.

## Validacao

- `id` e `slug`: letras, numeros, `_` e `-`.
- `name`, `brand`, `category`, `image`, `tag`: obrigatorios.
- `price`: maior que zero.
- `oldPrice`: opcional e maior que zero quando presente.
- `colors`, `sizes`, `images`: strings separadas por virgula na UI e arrays no backend.
- `active`: boolean.

## Fora De Escopo

- Upload de imagem.
- Estoque por variante.
- Exclusao fisica de produto.
- CRUD de categorias via UI.
- Edicao completa de clientes.

## Rollback

- Reverter commits desta etapa.
- Produtos existentes permanecem no banco.
- Se uma edicao ruim for feita, desativar produto pelo admin ou corrigir via novo PATCH.
