interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-[var(--surface-hover)] rounded-[var(--radius-sm)]';
  const variantClasses = {
    text: 'h-4 rounded-[var(--radius-sm)]',
    circular: 'rounded-full',
    rectangular: 'rounded-[var(--radius-sm)]',
  };

  const animationClasses = {
    pulse: 'animate-pulse opacity-60',
    wave: 'animate-skeleton-wave',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
          className="h-4"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-card p-5 ${className}`}>
      <Skeleton variant="rectangular" height={20} width="50%" className="mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return <SkeletonCard className={className} />;
}

export function SkeletonButton({ className = '' }: { className?: string }) {
  return <Skeleton variant="rectangular" height={36} width={120} className={className} />;
}

export function SkeletonAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />;
}
