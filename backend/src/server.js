const http = require('http');
const fs = require('fs');
const path = require('path');
const { getProductBySlug, listCategories, listProducts } = require('./db/products');
const { subscribeNewsletter, unsubscribeNewsletter } = require('./db/newsletter');
const { addCartItem, deleteCartItem, listCartItems, updateCartItem } = require('./db/cart');
const { addWishlistItem, deleteWishlistItem, listWishlist } = require('./db/wishlist');
const { createOrder, getOrder, listOrders, validateCoupon } = require('./db/orders');
const { getSessionId } = require('./db/session');
const { createAuthHandler } = require('./routes/auth');
const { createAdminHandler } = require('./routes/admin');
const { createPaymentsHandler } = require('./routes/payments');
const { sendOrderConfirmationIfNeeded } = require('./services/order-email');
const { createEmailClient } = require('./services/email');

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

for (const [key, value] of Object.entries(appConfig)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const handleAuthRequest = createAuthHandler();
const handleAdminRequest = createAdminHandler({ appConfig });
const handlePaymentsRequest = createPaymentsHandler({ appConfig });
const emailClient = createEmailClient(appConfig);

// Rate limiting — 5 requests por IP por minuto no endpoint de newsletter
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? '0.0.0.0';
}

function cleanupRateLimitStore(now) {
  if (rateLimitStore.size < 1000) return;
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}

function checkRateLimit(ip, scope) {
  const now = Date.now();
  cleanupRateLimitStore(now);
  const key = `${scope}:${ip}`;
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// Origins permitidas — nunca usa wildcard '*'
const LOCAL_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
const ALLOWED_ORIGINS = appConfig.ALLOWED_ORIGINS
  ? appConfig.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : LOCAL_DEV_ORIGINS;
for (const origin of LOCAL_DEV_ORIGINS) {
  if (!ALLOWED_ORIGINS.includes(origin)) ALLOWED_ORIGINS.push(origin);
}

function resolveAllowedOrigin(req) {
  const origin = req.headers.origin;
  return (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : null;
}

function sendJson(res, statusCode, payload, corsOrigin) {
  const body = JSON.stringify(payload);
  const corsHeaders = corsOrigin ? {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  } : {};
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    ...corsHeaders
  });
  res.end(body);
}

function parseJsonBody(body) {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return { error: 'JSON invalido.' };
  }
}

function validateSession(req, res, corsOrigin) {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    sendJson(res, 400, { error: 'Sessao invalida.' }, corsOrigin);
    return null;
  }
  return sessionId;
}

function validateCartPayload(payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload invalido.' };
  const productId = typeof payload.productId === 'string' ? payload.productId.trim() : '';
  const size = typeof payload.size === 'string' ? payload.size.trim() : '';
  const color = typeof payload.color === 'string' ? payload.color.trim() : '';
  const quantity = Number(payload.quantity ?? 1);

  if (!productId || productId.length > 80) return { error: 'Produto invalido.' };
  if (!size || size.length > 24) return { error: 'Tamanho invalido.' };
  if (!color || color.length > 40) return { error: 'Cor invalida.' };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return { error: 'Quantidade invalida.' };

  return { value: { productId, size, color, quantity } };
}

function validateQuantityPayload(payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload invalido.' };
  const quantity = Number(payload.quantity);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) return { error: 'Quantidade invalida.' };
  return { value: quantity };
}

function extractRouteId(pathname, prefix) {
  const value = decodeURIComponent(pathname.replace(prefix, '')).trim();
  return value && value.length <= 120 ? value : null;
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

  const json = JSON.stringify(emails, null, 2);
  const tmpFile = `${NEWSLETTER_FILE}.tmp`;

  // Escrita atômica: grava em .tmp e depois renomeia atomicamente.
  // Se o processo morrer durante a gravação, o arquivo original fica intacto.
  fs.writeFileSync(tmpFile, json, 'utf8');
  if (fs.existsSync(NEWSLETTER_FILE)) {
    fs.copyFileSync(NEWSLETTER_FILE, `${NEWSLETTER_FILE}.bak`);
  }
  fs.renameSync(tmpFile, NEWSLETTER_FILE);

  return { duplicate: false };
}

function unsubscribeNewsletterEmail(email) {
  const emails = readNewsletterEmails();
  const nextEmails = emails.map(entry => entry.email === email ? { ...entry, isActive: false, unsubscribedAt: new Date().toISOString() } : entry);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(nextEmails, null, 2), 'utf8');
  return { ok: true };
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
  const requestOrigin = req.headers.origin;

  if (requestOrigin && !corsOrigin) {
    sendJson(res, 403, { error: 'Origem não permitida.' }, null);
    return;
  }

  if (req.method === 'OPTIONS') {
    if (corsOrigin) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie',
        'Access-Control-Allow-Credentials': 'true',
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

  if (await handleAuthRequest(req, res, corsOrigin)) return;
  if (await handleAdminRequest(req, res, corsOrigin)) return;
  if (await handlePaymentsRequest(req, res, corsOrigin)) return;

  if (url.pathname === '/api/products' && req.method === 'GET') {
    try {
      sendJson(res, 200, { products: await listProducts() }, corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar produtos.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname.startsWith('/api/products/') && req.method === 'GET') {
    const slug = decodeURIComponent(url.pathname.replace('/api/products/', '')).trim();
    if (!slug) {
      sendJson(res, 400, { error: 'Produto invalido.' }, corsOrigin);
      return;
    }
    try {
      const product = await getProductBySlug(slug);
      if (!product) {
        sendJson(res, 404, { error: 'Produto nao encontrado.' }, corsOrigin);
        return;
      }
      sendJson(res, 200, { product }, corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar produto.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/categories' && req.method === 'GET') {
    try {
      sendJson(res, 200, { categories: await listCategories() }, corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar categorias.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/cart' && req.method === 'GET') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    try {
      sendJson(res, 200, await listCartItems(sessionId), corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar carrinho.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/cart/items' && req.method === 'POST') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 'cart')) {
      sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
      return;
    }
    try {
      const parsed = parseJsonBody(await readBody(req));
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error }, corsOrigin);
        return;
      }
      const payload = validateCartPayload(parsed.value);
      if (payload.error) {
        sendJson(res, 400, { error: payload.error }, corsOrigin);
        return;
      }
      const result = await addCartItem(sessionId, payload.value);
      sendJson(res, 200, result, corsOrigin);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'Payload muito grande.' }, corsOrigin);
        return;
      }
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro ao atualizar carrinho.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname.startsWith('/api/cart/items/') && req.method === 'PATCH') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const id = extractRouteId(url.pathname, '/api/cart/items/');
    if (!id) {
      sendJson(res, 400, { error: 'Item invalido.' }, corsOrigin);
      return;
    }
    try {
      const parsed = parseJsonBody(await readBody(req));
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error }, corsOrigin);
        return;
      }
      const payload = validateQuantityPayload(parsed.value);
      if (payload.error) {
        sendJson(res, 400, { error: payload.error }, corsOrigin);
        return;
      }
      const result = await updateCartItem(sessionId, id, payload.value);
      sendJson(res, 200, result, corsOrigin);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'Payload muito grande.' }, corsOrigin);
        return;
      }
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro ao atualizar item.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname.startsWith('/api/cart/items/') && req.method === 'DELETE') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const id = extractRouteId(url.pathname, '/api/cart/items/');
    if (!id) {
      sendJson(res, 400, { error: 'Item invalido.' }, corsOrigin);
      return;
    }
    try {
      sendJson(res, 200, await deleteCartItem(sessionId, id), corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao remover item.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/wishlist' && req.method === 'GET') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    try {
      sendJson(res, 200, await listWishlist(sessionId), corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar favoritos.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname.startsWith('/api/wishlist/') && req.method === 'POST') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 'wishlist')) {
      sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
      return;
    }
    const productId = extractRouteId(url.pathname, '/api/wishlist/');
    if (!productId) {
      sendJson(res, 400, { error: 'Produto invalido.' }, corsOrigin);
      return;
    }
    try {
      sendJson(res, 200, await addWishlistItem(sessionId, productId), corsOrigin);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro ao atualizar favoritos.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname.startsWith('/api/wishlist/') && req.method === 'DELETE') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const productId = extractRouteId(url.pathname, '/api/wishlist/');
    if (!productId) {
      sendJson(res, 400, { error: 'Produto invalido.' }, corsOrigin);
      return;
    }
    try {
      sendJson(res, 200, await deleteWishlistItem(sessionId, productId), corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao remover favorito.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 'orders')) {
      sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
      return;
    }
    try {
      const parsed = parseJsonBody(await readBody(req));
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error }, corsOrigin);
        return;
      }
      const result = await createOrder(sessionId, parsed.value);
      const email = await sendOrderConfirmationIfNeeded({ orderResult: result });
      if (email) result.email = email;
      sendJson(res, 201, result, corsOrigin);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'Payload muito grande.' }, corsOrigin);
        return;
      }
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro ao criar pedido.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/orders' && req.method === 'GET') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    try {
      sendJson(res, 200, await listOrders(sessionId), corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar pedidos.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const sessionId = validateSession(req, res, corsOrigin);
    if (!sessionId) return;
    const id = extractRouteId(url.pathname, '/api/orders/');
    if (!id) {
      sendJson(res, 400, { error: 'Pedido invalido.' }, corsOrigin);
      return;
    }
    try {
      const result = await getOrder(sessionId, id);
      if (!result.order) {
        sendJson(res, 404, { error: 'Pedido nao encontrado.' }, corsOrigin);
        return;
      }
      sendJson(res, 200, result, corsOrigin);
    } catch {
      sendJson(res, 500, { error: 'Erro ao carregar pedido.' }, corsOrigin);
    }
    return;
  }

  if (url.pathname === '/api/coupon/validate' && req.method === 'POST') {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 'coupon')) {
      sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
      return;
    }
    try {
      const body = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        sendJson(res, 400, { valid: false, error: 'JSON inválido.' }, corsOrigin);
        return;
      }
      const { code } = parsed;
      if (!code || typeof code !== 'string') {
        sendJson(res, 400, { valid: false, error: 'Código inválido.' }, corsOrigin);
        return;
      }
      const normalizedCode = code.trim().toUpperCase();

      // Prisma-first: mesma fonte usada pelo createOrder
      const prismaResult = await validateCoupon(normalizedCode);
      if (prismaResult.prismaAvailable) {
        if (!prismaResult.valid) {
          sendJson(res, 200, { valid: false }, corsOrigin);
          return;
        }
        const response = prismaResult.discountType === 'PERCENT'
          ? { valid: true, code: prismaResult.code, discountPercent: prismaResult.discountValue }
          : { valid: true, code: prismaResult.code, discountFixed: prismaResult.discountValue / 100 };
        sendJson(res, 200, response, corsOrigin);
        return;
      }

      // Fallback: .env (Prisma indisponível — modo demo)
      const key = `COUPON_${normalizedCode}`;
      const discountPercent = Number(appConfig[key]);
      if (!discountPercent || Number.isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
        sendJson(res, 200, { valid: false }, corsOrigin);
        return;
      }
      sendJson(res, 200, { valid: true, code: normalizedCode, discountPercent }, corsOrigin);
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
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 'newsletter')) {
      sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
      return;
    }
    try {
      const body = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        sendJson(res, 400, { error: 'JSON inválido.' }, corsOrigin);
        return;
      }
      const { email } = parsed;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: 'Email inválido.' }, corsOrigin);
        return;
      }
      const result = await subscribeNewsletter(email, saveNewsletterEmail);
      try {
        await emailClient.sendNewsletterOptIn({ to: email.trim().toLowerCase() });
      } catch (err) {
        console.warn(`email.newsletter_opt_in.failed to=${email} message=${err instanceof Error ? err.message : 'unknown'}`);
      }
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

  if (url.pathname === '/api/newsletter/unsubscribe' && req.method === 'POST') {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 'newsletter-unsubscribe')) {
      sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
      return;
    }
    try {
      const parsed = parseJsonBody(await readBody(req));
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error }, corsOrigin);
        return;
      }
      const { email } = parsed.value;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: 'Email invalido.' }, corsOrigin);
        return;
      }
      await unsubscribeNewsletter(email, unsubscribeNewsletterEmail);
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
  sendJson(res, 404, { error: 'Rota não encontrada' }, corsOrigin);
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`VELKOR backend ouvindo em http://localhost:${PORT}`);
});
