import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  tone?: ActionButtonTone;
  children: ReactNode;
}

export function ActionButton({ loading = false, tone = 'primary', children, disabled, className = '', ...props }: ActionButtonProps) {
  return (
    <button
      {...props}
      className={`op-action op-action-${tone} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="op-action-spinner" aria-hidden="true" /> : null}
      <span>{loading ? 'Carregando...' : children}</span>
    </button>
  );
}
