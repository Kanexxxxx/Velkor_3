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

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': process.env.VELKOR_PUBLIC_URL || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.VELKOR_PUBLIC_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'ok', service: 'velkor-backend' });
    return;
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    sendJson(res, 200, {
      appName: appConfig.VELKOR_APP_NAME || 'VELKOR',
      publicUrl: appConfig.VELKOR_PUBLIC_URL || 'http://localhost:3000',
      supportEmail: appConfig.VELKOR_SUPPORT_EMAIL || 'velkor.officiall@gmail.com',
      whatsapp: appConfig.VELKOR_WHATSAPP || '+55 16 99706-2339',
      instagram: appConfig.VELKOR_INSTAGRAM || 'https://www.instagram.com/velk.0r/',
    });
    return;
  }

  if (url.pathname === '/api/admin/unlock' && req.method === 'POST') {
    const adminSecret = appConfig.ADMIN_SECRET;
    if (!adminSecret) {
      sendJson(res, 503, { error: 'Painel admin não configurado no servidor. Defina ADMIN_SECRET no .env.' });
      return;
    }
    try {
      const body = await readBody(req);
      const { password } = JSON.parse(body);
      if (typeof password !== 'string' || password !== adminSecret) {
        sendJson(res, 401, { error: 'Senha incorreta.' });
        return;
      }
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 500, { error: 'Erro interno.' });
    }
    return;
  }

  if (url.pathname === '/api/newsletter' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { email } = JSON.parse(body);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: 'Email inválido.' });
        return;
      }
      const result = saveNewsletterEmail(email.trim().toLowerCase());
      sendJson(res, 200, { ok: true, duplicate: result.duplicate });
    } catch {
      sendJson(res, 500, { error: 'Erro interno.' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Rota não encontrada' });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`VELKOR backend ouvindo em http://localhost:${PORT}`);
});
