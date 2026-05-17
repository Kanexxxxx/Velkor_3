'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { confirmEmailVerification } from '@/services/authApi';

type VerifyState = 'idle' | 'success' | 'error';

export function VerifyEmailPageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<VerifyState>('idle');
  const [message, setMessage] = useState('Confirmando seu email...');

  useEffect(() => {
    let active = true;

    async function confirm() {
      if (!token) {
        setState('error');
        setMessage('Token de confirmacao ausente.');
        return;
      }

      try {
        await confirmEmailVerification(token);
        if (!active) return;
        setState('success');
        setMessage('Email confirmado com sucesso.');
      } catch (error) {
        if (!active) return;
        setState('error');
        setMessage('Nao foi possivel confirmar este email. Solicite um novo link entrando na sua conta.');
      }
    }

    confirm();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Inicio</Link>
          <span className="sep">/</span>
          <Link href="/account">Conta</Link>
          <span className="sep">/</span>
          <span>Confirmar email</span>
        </div>

        <div className="info-hero">
          <div>
            <div className="section-num">SEGURANCA DA CONTA</div>
            <h1>Email <span className="red">Confirmado.</span></h1>
            <p>{message}</p>
          </div>
          <Link href="/account" className="btn btn-ghost">
            Ir para minha conta
          </Link>
        </div>

        <section className="auth-grid auth-grid-single">
          <div className="form-block">
            <h3><span className="num">{state === 'success' ? 'OK' : state === 'error' ? 'ERRO' : '...'}</span> Verificacao de email</h3>
            <div className="sub">
              {state === 'success'
                ? 'Sua conta esta pronta para receber comunicacoes e confirmacoes de pedido.'
                : state === 'error'
                  ? 'Solicite um novo link de verificacao entrando na sua conta.'
                  : 'Aguarde enquanto validamos o link recebido por email.'}
            </div>
            <Link href="/account" className="place-order-btn">
              Continuar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
