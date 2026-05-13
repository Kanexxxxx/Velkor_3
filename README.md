# VELKOR

Projeto MVP da loja VELKOR, organizado por responsabilidade.

## Estrutura

- `frontend/`: site estático, páginas HTML, CSS e JavaScript do e-commerce.
- `backend/`: API mínima em Node.js para configuração e health check.
- `backend/.env`: variáveis locais do backend.
- `backend/.env.example`: exemplo de configuração.
- `docs/`: briefing e documentação do projeto.
- `.agents/` e `skills-lock.json`: ferramentas/skills instaladas para o Codex, fora do código da aplicação.

## Rodar o frontend

Abra `frontend/index.html` no navegador ou sirva a pasta `frontend` com um servidor estático.

## Rodar o backend

```bash
cd backend
npm start
```

Rotas disponíveis:

- `GET /api/health`
- `GET /api/config`
