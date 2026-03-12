import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Map,
  Clock,
  BarChart3,
  CreditCard,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crosshair,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useServerStore } from '../store/serverStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/automation', icon: Clock, label: 'Automation' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/subscription', icon: CreditCard, label: 'Subscription' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { rconConnected } = useServerStore();

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-surface-800 border-r border-surface-700/50
        flex flex-col z-30 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-700/50">
        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Crosshair className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-gray-100 whitespace-nowrap">
              DayZ Dashboard
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={`status-dot ${
                  rconConnected ? 'status-dot-online' : 'status-dot-offline'
                }`}
              />
              <span className="text-[10px] text-gray-500">
                {rconConnected ? 'RCON Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-150 group
              ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border-l-2 border-primary-500'
                  : 'text-gray-400 hover:bg-surface-700/50 hover:text-gray-200 border-l-2 border-transparent'
              }
              ${collapsed ? 'justify-center px-0' : ''}
            `}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Admin link - only for superadmin */}
        {user?.role === 'superadmin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-150 mt-4 pt-4 border-t border-surface-700/50
              ${
                isActive
                  ? 'bg-accent-700/20 text-accent-400 border-l-2 border-accent-500'
                  : 'text-gray-400 hover:bg-surface-700/50 hover:text-gray-200 border-l-2 border-transparent'
              }
              ${collapsed ? 'justify-center px-0' : ''}
            `}
            title={collapsed ? 'Admin' : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </NavLink>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-surface-700/50 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-xs font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user.username}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400
              hover:bg-danger-900/30 hover:text-danger-400 transition-colors w-full
              ${collapsed ? 'justify-center px-0' : ''}
            `}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-surface-700 border border-surface-600 rounded-full
          flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-surface-600
          transition-colors z-40"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
