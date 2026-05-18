'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const COOKIE_CONSENT_KEY = 'velkor_cookie_consent_v1';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(COOKIE_CONSENT_KEY) !== 'accepted');
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <section className="cookie-consent" aria-label="Aviso de cookies">
      <div>
        <strong>Cookies essenciais</strong>
        <p>Usamos cookies para manter carrinho, conta e checkout funcionando. Veja a politica de privacidade para detalhes.</p>
      </div>
      <div className="cookie-actions">
        <Link href="/politica-de-privacidade" className="btn btn-ghost">Privacidade</Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
            setVisible(false);
          }}
        >
          Aceitar
        </button>
      </div>
    </section>
  );
}
