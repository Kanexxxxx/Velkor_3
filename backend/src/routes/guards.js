const authRepo = require('../db/auth');
const { parseCookies } = require('./auth');

const COOKIE_NAME = 'velkor_sid';

function sendJson(res, statusCode, payload, corsOrigin) {
  const body = JSON.stringify(payload);
  const corsHeaders = corsOrigin ? {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  } : {};

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...corsHeaders,
  });
  res.end(body);
}

function getSessionCookie(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || '';
}

async function requireAuth(req, res, corsOrigin, repo = authRepo) {
  const sessionUser = await repo.findSessionUser(getSessionCookie(req));
  if (!sessionUser) {
    sendJson(res, 401, { error: 'Sessao invalida.' }, corsOrigin);
    return null;
  }
  return sessionUser;
}

async function requireAdmin(req, res, corsOrigin, repo = authRepo) {
  const context = await requireAuth(req, res, corsOrigin, repo);
  if (!context) return null;
  if (context.user?.role !== 'ADMIN') {
    sendJson(res, 403, { error: 'Acesso admin necessario.' }, corsOrigin);
    return null;
  }
  return context;
}

module.exports = { requireAuth, requireAdmin, sendJson };
