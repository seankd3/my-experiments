import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-700 text-gray-300 border-surface-600/50',
  success: 'bg-green-900/40 text-green-400 border-green-700/30',
  warning: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/30',
  danger: 'bg-red-900/40 text-red-400 border-red-700/30',
  info: 'bg-blue-900/40 text-blue-400 border-blue-700/30',
  primary: 'bg-primary-900/40 text-primary-400 border-primary-700/30',
  accent: 'bg-accent-900/40 text-accent-400 border-accent-700/30',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  primary: 'bg-primary-400',
  accent: 'bg-accent-400',
};

export default function Badge({
  children,
  variant = 'default',
  dot = false,
  className = '',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium border rounded-full
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
