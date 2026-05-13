# VELKOR

Projeto MVP da loja VELKOR, organizado por responsabilidade.

## Estrutura

- `frontend/`: aplicação Next.js com TypeScript e Tailwind CSS.
- `backend/`: API Node.js em preparação para Express, PostgreSQL e integrações externas.
- `backend/.env.example`: exemplo de configuração local. Crie `backend/.env` no seu ambiente quando precisar rodar variáveis reais.
- `docs/`: briefing e documentação do projeto.
- `.agents/` e `skills-lock.json`: ferramentas/skills instaladas para o Codex, fora do código da aplicação.

## Rodar o frontend Next.js

```bash
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1
```

Rotas principais: `/`, `/shop`, `/product/v01`, `/wishlist`, `/account`, `/checkout`, `/admin`, `/contato`, `/privacidade`, `/termos`, `/reembolso` e `/cookies`.

## Rodar o backend

```bash
cd backend
npm install
npm start
```

Rotas disponíveis:

- `GET /api/health`
- `GET /api/config`

## Documentação

- `GUIA_DO_USUARIO.md`: guia operacional para rodar, editar e testar.
- `AUDITORIA_TECNICA.md`: relatório da auditoria, rotas testadas e pendências.
