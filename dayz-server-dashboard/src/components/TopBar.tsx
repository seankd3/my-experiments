import React, { useState } from 'react';
import {
  Server,
  Plug,
  Unplug,
  Users,
  Clock,
  Bell,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useServerStore } from '../store/serverStore';
import { useServers } from '../api/hooks';
import Badge from './ui/Badge';

export default function TopBar() {
  const {
    activeServer,
    setActiveServer,
    rconConnected,
    isConnecting,
    connectRcon,
    disconnectRcon,
    serverStatus,
    onlinePlayers,
  } = useServerStore();
  const { data: servers } = useServers();
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleServerSelect = (server: typeof activeServer) => {
    if (server) {
      setActiveServer(server);
      setShowServerDropdown(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <header className="h-16 bg-surface-800/80 backdrop-blur-sm border-b border-surface-700/50 flex items-center justify-between px-6 z-20">
      {/* Left: Server Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowServerDropdown(!showServerDropdown)}
            className="flex items-center gap-2.5 px-3 py-2 bg-surface-900/60 border border-surface-600/50 rounded-lg hover:bg-surface-700/50 transition-colors"
          >
            <Server className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-gray-200 max-w-[200px] truncate">
              {activeServer?.name || 'Select Server'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showServerDropdown && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-surface-800 border border-surface-600/50 rounded-lg shadow-2xl z-50 py-1 animate-fade-in">
              {servers && servers.length > 0 ? (
                servers.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => handleServerSelect(server)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-700/50 transition-colors
                      ${activeServer?.id === server.id ? 'bg-primary-900/20' : ''}
                    `}
                  >
                    <span
                      className={`status-dot ${
                        server.status === 'online'
                          ? 'status-dot-online'
                          : server.status === 'restarting'
                          ? 'status-dot-warning'
                          : 'status-dot-offline'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {server.name}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {server.ip}:{server.port}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {server.currentPlayers}/{server.maxPlayers}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">
                  No servers available
                </p>
              )}
            </div>
          )}
        </div>

        {/* RCON Connect Button */}
        {activeServer && (
          <button
            onClick={() =>
              rconConnected
                ? disconnectRcon()
                : connectRcon(activeServer.id)
            }
            disabled={isConnecting}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${
                rconConnected
                  ? 'bg-green-900/30 text-green-400 border border-green-700/30 hover:bg-red-900/30 hover:text-red-400 hover:border-red-700/30'
                  : 'bg-surface-700/50 text-gray-400 border border-surface-600/50 hover:bg-primary-900/30 hover:text-primary-400'
              }
              disabled:opacity-50
            `}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : rconConnected ? (
              <Plug className="w-4 h-4" />
            ) : (
              <Unplug className="w-4 h-4" />
            )}
            {isConnecting
              ? 'Connecting...'
              : rconConnected
              ? 'Connected'
              : 'Connect RCON'}
          </button>
        )}
      </div>

      {/* Right: Status Badges & Actions */}
      <div className="flex items-center gap-4">
        {/* Server Stats */}
        {activeServer && rconConnected && (
          <div className="flex items-center gap-3">
            <Badge variant="success" dot>
              <Users className="w-3 h-3 mr-1" />
              {onlinePlayers.length} / {activeServer.maxPlayers}
            </Badge>
            {serverStatus && (
              <Badge variant="info" dot>
                <Clock className="w-3 h-3 mr-1" />
                {formatUptime(serverStatus.uptime)}
              </Badge>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-400 hover:bg-surface-700/50 hover:text-gray-200 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-surface-800 border border-surface-600/50 rounded-lg shadow-2xl z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-700/50">
                <h3 className="text-sm font-semibold text-gray-200">
                  Notifications
                </h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No new notifications
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
