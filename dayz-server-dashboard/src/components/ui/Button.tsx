import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 hover:bg-primary-500 text-white border-primary-500/50 shadow-lg shadow-primary-900/20',
  secondary:
    'bg-surface-700 hover:bg-surface-600 text-gray-200 border-surface-600/50',
  danger:
    'bg-danger-700 hover:bg-danger-600 text-white border-danger-600/50 shadow-lg shadow-danger-900/20',
  ghost:
    'bg-transparent hover:bg-surface-700/50 text-gray-300 border-transparent',
  accent:
    'bg-accent-700 hover:bg-accent-600 text-white border-accent-600/50 shadow-lg shadow-accent-900/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-md border
        transition-all duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-1 focus:ring-offset-surface-800
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
