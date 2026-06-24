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

export function SkeletonButton({ className = '', height = 36, width = 120 }: { className?: string; height?: number; width?: number }) {
  return <Skeleton variant="rectangular" height={height} width={width} className={className} />;
}

export function SkeletonDataTable({
  columns,
  rows = 3,
  className = '',
}: {
  columns: Array<{ key: string; width?: number; align?: 'left' | 'right' }>;
  rows?: number;
  className?: string;
}) {
  return (
    <table className={`min-w-full divide-y divide-[var(--border)] ${className}`}>
      <thead className="bg-[var(--surface-elevated)]">
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className={`px-6 py-3 ${
                column.align === 'right' ? 'text-right' : 'text-left'
              }`}
            >
              <Skeleton
                variant="text"
                width={column.width ?? 64}
                height={12}
                className={column.align === 'right' ? 'ml-auto' : undefined}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={`whitespace-nowrap px-6 py-4 ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                <Skeleton
                  variant="text"
                  width={column.width ?? 96}
                  height={16}
                  className={column.align === 'right' ? 'ml-auto' : undefined}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SkeletonAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />;
}
