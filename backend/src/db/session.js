function normalizeSessionId(value) {
  if (typeof value !== 'string') return null;
  const sessionId = value.trim();
  if (!sessionId || sessionId.length > 120) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(sessionId)) return null;
  return sessionId;
}

function getSessionId(req) {
  return normalizeSessionId(req.headers['x-velkor-session']);
}

module.exports = { getSessionId, normalizeSessionId };
