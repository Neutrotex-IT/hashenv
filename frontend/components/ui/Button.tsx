import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  href?: string;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  asLink = false,
  href,
  children,
  className = '',
  onClick,
  ...props
}: ButtonProps) {
  const baseStyles =
    'motion-press inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)]',
    secondary:
      'bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--text-muted)] focus:ring-[var(--accent)]',
    outline:
      'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus:ring-[var(--accent)]',
    danger:
      'bg-[var(--error)] text-white hover:opacity-90 focus:ring-[var(--error)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus:ring-[var(--accent)]',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  if (asLink && href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
