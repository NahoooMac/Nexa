import React from 'react';

type CardVariant = 'default' | 'raised' | 'bordered' | 'gradient';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default:  'glass-panel',
  raised:   'bg-[var(--color-surface-2)] border border-[var(--color-border)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
  bordered: 'bg-transparent border-2 border-[var(--color-border)]',
  gradient: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20',
};

export function Card({ children, className = '', variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex justify-between items-start mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-base font-semibold text-[var(--color-text-main)] ${className}`}>{children}</h2>;
}
