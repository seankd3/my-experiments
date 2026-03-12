import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'default' | 'pills';
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'default',
}: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
              transition-all duration-150
              ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                  : 'bg-surface-700/50 text-gray-400 hover:bg-surface-700 hover:text-gray-200'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${activeTab === tab.id ? 'bg-primary-500/50' : 'bg-surface-600'}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`border-b border-surface-700/50 ${className}`}>
      <div className="flex items-center gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              inline-flex items-center gap-2 px-5 py-3 text-sm font-medium
              border-b-2 transition-all duration-150
              ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-surface-600'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${activeTab === tab.id ? 'bg-primary-900/50 text-primary-300' : 'bg-surface-700 text-gray-500'}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
