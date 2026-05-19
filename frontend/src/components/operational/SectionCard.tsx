import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, description, actions, children, className = '' }: SectionCardProps) {
  return (
    <section className={`op-section-card ${className}`.trim()}>
      {title || description || actions ? (
        <header className="op-section-card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="op-section-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="op-section-card-body">{children}</div>
    </section>
  );
}
