const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3001);
const ENV_PATH = path.join(__dirname, '..', '.env');
const DATA_DIR = path.join(__dirname, '..', 'data');
const NEWSLETTER_FILE = path.join(DATA_DIR, 'newsletter.json');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith('#'))
    .reduce((env, line) => {
      const index = line.indexOf('=');
      if (index === -1) return env;
      env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
      return env;
    }, {});
}

const appConfig = {
  ...readEnvFile(ENV_PATH),
  ...process.env
};

// Origins permitidas — nunca usa wildcard '*'
const ALLOWED_ORIGINS = appConfig.ALLOWED_ORIGINS
  ? appConfig.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001'];

function resolveAllowedOrigin(req) {
  const origin = req.headers.origin;
  return (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : null;
}

function sendJson(res, statusCode, payload, corsOrigin) {
  const body = JSON.stringify(payload);
  const corsHeaders = corsOrigin ? {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  } : {};
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders
  });
  res.end(body);
}

function readNewsletterEmails() {
  try {
    if (!fs.existsSync(NEWSLETTER_FILE)) return [];
    return JSON.parse(fs.readFileSync(NEWSLETTER_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveNewsletterEmail(email) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const emails = readNewsletterEmails();
  if (emails.some(entry => entry.email === email)) return { duplicate: true };
  emails.push({ email, subscribedAt: new Date().toISOString() });
  fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(emails, null, 2), 'utf8');
  return { duplicate: false };
}

class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload too large');
    this.name = 'PayloadTooLargeError';
  }
}

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        req.resume(); // drena o stream sem armazenar
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) reject(new PayloadTooLargeError());
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const corsOrigin = resolveAllowedOrigin(req);

  if (req.method === 'OPTIONS') {
    if (corsOrigin) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin'
      });
    } else {
      res.writeHead(403);
    }
    res.end();
    return;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'ok', service: 'velkor-backend' }, corsOrigin);
    return;
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    sendJson(res, 200, {
      appName: appConfig.VELKOR_APP_NAME || 'VELKOR',
      publicUrl: appConfig.VELKOR_PUBLIC_URL || 'http://localhost:3000',
      supportEmail: appConfig.VELKOR_SUPPORT_EMAIL || 'velkor.officiall@gmail.com',
      whatsapp: appConfig.VELKOR_WHATSAPP || '+55 16 99706-2339',
      instagram: appConfig.VELKOR_INSTAGRAM || 'https://www.instagram.com/velk.0r/',
    }, corsOrigin);
    return;
  }

  if (url.pathname === '/api/admin/unlock' && req.method === 'POST') {
    const adminSecret = appConfig.ADMIN_SECRET;
    if (!adminSecret) {
      sendJson(res, 503, { error: 'Painel admin não configurado no servidor. Defina ADMIN_SECRET no .env.' }, corsOrigin);
      return;
    }
    try {
      const body = await readBody(req);
      const { password } = JSON.parse(body);
      if (typeof password !== 'string' || password !== adminSecret) {
        sendJson(res, 401, { error: 'Senha incorreta.' }, corsOrigin);
        return;
      }
      sendJson(res, 200, { ok: true }, corsOrigin);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'Payload muito grande.' }, corsOrigin);
        return;
      }
      sendJson(res, 500, { error: 'Erro interno.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/newsletter' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { email } = JSON.parse(body);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: 'Email inválido.' }, corsOrigin);
        return;
      }
      const result = saveNewsletterEmail(email.trim().toLowerCase());
      sendJson(res, 200, { ok: true, duplicate: result.duplicate }, corsOrigin);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'Payload muito grande.' }, corsOrigin);
        return;
      }
      sendJson(res, 500, { error: 'Erro interno.' }, corsOrigin);
    }
    return;
  }

  sendJson(res, 404, { error: 'Rota não encontrada' }, corsOrigin);
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`VELKOR backend ouvindo em http://localhost:${PORT}`);
});
