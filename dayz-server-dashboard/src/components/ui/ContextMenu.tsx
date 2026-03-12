import React, { useEffect, useRef } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 40 - 20);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[200px] bg-surface-800 border border-surface-600/50 rounded-lg shadow-2xl py-1 animate-fade-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 border-t border-surface-700/50" />
        ) : (
          <button
            key={i}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
              ${
                item.danger
                  ? 'text-danger-400 hover:bg-danger-900/30'
                  : 'text-gray-300 hover:bg-surface-700/50'
              }
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
