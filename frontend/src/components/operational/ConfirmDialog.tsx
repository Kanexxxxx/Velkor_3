import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  danger = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="op-dialog-backdrop" role="presentation">
      <section className="op-dialog" role="dialog" aria-modal="true" aria-labelledby="op-dialog-title">
        <h2 id="op-dialog-title">{title}</h2>
        <p>{description}</p>
        {children ? <div className="op-dialog-body">{children}</div> : null}
        <div className="op-dialog-actions">
          <ActionButton type="button" tone="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </ActionButton>
          <ActionButton type="button" tone={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
