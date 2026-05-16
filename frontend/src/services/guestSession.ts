const GUEST_SESSION_KEY = 'velkor_guest_session_v1';

function createGuestSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `guest_${crypto.randomUUID()}`;
  }
  return `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getGuestSessionId() {
  if (typeof window === 'undefined') return '';

  const stored = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (stored) return stored;

  const sessionId = createGuestSessionId();
  window.localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  return sessionId;
}
