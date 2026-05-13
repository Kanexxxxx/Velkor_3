'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export function ResetPasswordPageClient() {
  const { resetPassword } = useAuth();
  const { notify } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirmation = String(data.get('confirmation') ?? '');

    if (password !== confirmation) {
      setError('A confirmação não bate com a nova senha.');
      return;
    }

    try {
      setPending(true);
      await resetPassword({ token, password });
      notify('Senha redefinida. Você já está logado.', 'success');
      router.push('/account?tab=profile');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Início</Link>
          <span className="sep">/</span>
          <Link href="/account">Conta</Link>
          <span className="sep">/</span>
          <span>Redefinir senha</span>
        </div>

        <div className="info-hero">
          <div>
            <div className="section-num">RECUPERAÇÃO DE ACESSO</div>
            <h1>Nova <span className="red">Senha.</span></h1>
            <p>Defina uma senha nova para sua conta. Após confirmar, você é levado direto para o painel.</p>
          </div>
        </div>

        <div className="auth-grid auth-grid-single">
          <form className="form-block" onSubmit={handleSubmit}>
            <h3><span className="num">RESET</span> Crie sua nova senha</h3>
            <div className="sub">{token ? 'Token válido detectado na URL.' : 'Use o link recebido no email para abrir esta página com token.'}</div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="reset-token">Token</label>
                <input id="reset-token" name="token" type="text" defaultValue={token} required readOnly={Boolean(token)} />
              </div>
            </div>
            <div className="field-row cols-2">
              <div className="field">
                <label htmlFor="reset-password">Nova senha</label>
                <input id="reset-password" name="password" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="reset-confirmation">Confirmar senha</label>
                <input id="reset-confirmation" name="confirmation" type="password" required minLength={6} autoComplete="new-password" />
              </div>
            </div>

            <button type="submit" className="place-order-btn" disabled={pending}>
              {pending ? 'Atualizando...' : 'Salvar nova senha'}
            </button>

            {error ? <p className="auth-error" role="alert">{error}</p> : null}

            <Link href="/account" className="auth-secondary">← Voltar para a conta</Link>
          </form>
        </div>
      </div>
    </main>
  );
}
