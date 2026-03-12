import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  icon,
  hint,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-surface-900/60 border border-surface-600/50 rounded-md
            text-gray-200 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
            transition-colors duration-150
            ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger-500/50 focus:ring-danger-500/50' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-surface-900/60 border border-surface-600/50 rounded-md
          text-gray-200 px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-danger-500/50' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-400">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-surface-900/60 border border-surface-600/50 rounded-md
          text-gray-200 placeholder-gray-500 px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
          transition-colors duration-150 resize-y min-h-[80px]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-danger-500/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-danger-400">{error}</p>}
    </div>
  );
}

export default Input;
