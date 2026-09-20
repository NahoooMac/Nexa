import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function Input({ label, error, rightElement, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          className={`
            w-full bg-[var(--color-surface)] border rounded-xl px-4 py-3 text-[var(--color-text-main)]
            text-sm placeholder:text-[var(--color-text-subtle)]
            focus:outline-none transition-all duration-200
            ${error
              ? 'border-rose-500/50 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
            }
            ${rightElement ? 'pr-11' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
