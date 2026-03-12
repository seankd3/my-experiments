import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', hover = false, glow = false }: CardProps) {
  return (
    <div
      className={`
        military-card overflow-hidden
        ${hover ? 'hover:border-primary-600/30 hover:shadow-xl transition-all duration-200' : ''}
        ${glow ? 'glow-green' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div
      className={`
        px-5 py-4 border-b border-surface-700/50
        flex items-center justify-between
        ${className}
      `}
    >
      <div className="flex items-center gap-3">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={`
        px-5 py-3 border-t border-surface-700/50 bg-surface-900/30
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Card;
