import type { ReactNode } from 'react';

export interface TimelineItem {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  state?: 'complete' | 'current' | 'pending' | 'danger';
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="op-timeline">
      {items.map((item, index) => (
        <li key={index} className={`op-timeline-item state-${item.state ?? 'pending'}`}>
          <span className="op-timeline-marker" aria-hidden="true" />
          <div>
            <strong>{item.title}</strong>
            {item.description ? <p>{item.description}</p> : null}
            {item.meta ? <small>{item.meta}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
