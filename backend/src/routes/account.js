const authRepoDefault = require('../db/auth');
const orderRepoDefault = require('../db/orders');
const { getSessionId } = require('../db/session');
const { requireAuth, sendJson } = require('./guards');

function createAccountHandler({ authRepo = authRepoDefault, orderRepo = orderRepoDefault } = {}) {
  return async function handleAccountRequest(req, res, corsOrigin) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/account')) return false;

    try {
      const current = await requireAuth(req, res, corsOrigin, authRepo);
      if (!current) return true;

      if (url.pathname === '/api/account/me' && req.method === 'GET') {
        sendJson(res, 200, { user: current.user }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/addresses' && req.method === 'GET') {
        sendJson(res, 200, { addresses: current.user.addresses || [] }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/orders' && req.method === 'GET') {
        const sessionId = getSessionId(req) || '';
        sendJson(res, 200, await orderRepo.listOrders(sessionId, current.user.email), corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/account/orders/') && req.method === 'GET') {
        const id = decodeURIComponent(url.pathname.replace('/api/account/orders/', '')).trim();
        if (!id) {
          sendJson(res, 400, { error: 'Pedido invalido.' }, corsOrigin);
          return true;
        }
        const sessionId = getSessionId(req) || '';
        const result = await orderRepo.getOrder(sessionId, id, current.user.email);
        if (!result.order) {
          sendJson(res, 404, { error: 'Pedido nao encontrado.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, result, corsOrigin);
        return true;
      }

      sendJson(res, 404, { error: 'Rota da conta nao encontrada.' }, corsOrigin);
      return true;
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro da conta.' }, corsOrigin);
      return true;
    }
  };
}

module.exports = { createAccountHandler };
