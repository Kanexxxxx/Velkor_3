interface LoadingSkeletonProps {
  lines?: number;
  compact?: boolean;
}

export function LoadingSkeleton({ lines = 3, compact = false }: LoadingSkeletonProps) {
  return (
    <div className={`op-skeleton${compact ? ' compact' : ''}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} style={{ width: `${Math.max(35, 95 - index * 14)}%` }} />
      ))}
    </div>
  );
}
