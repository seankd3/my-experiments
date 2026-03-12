import React from 'react';
import {
  Users,
  Server,
  Clock,
  Activity,
  MessageSquare,
  Send,
  RefreshCw,
  Lock,
  Unlock,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useServerStore } from '../store/serverStore';
import { useServerStatus, useOnlinePlayers, useChatHistory, useScheduledTasks, useServerAction, usePlayerMetrics } from '../api/hooks';
import { useToastStore } from '../store/toastStore';

// Demo data for charts when no real data available
const demoPlayerHistory = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  count: Math.floor(Math.random() * 40) + 5,
}));

export default function Dashboard() {
  const { activeServer, onlinePlayers, chatMessages, rconConnected } = useServerStore();
  const { data: serverStatus } = useServerStatus(activeServer?.id);
  const { data: onlinePlayersData } = useOnlinePlayers(activeServer?.id);
  const { data: chatHistory } = useChatHistory(activeServer?.id);
  const { data: tasks } = useScheduledTasks(activeServer?.id);
  const { data: metrics } = usePlayerMetrics(activeServer?.id);
  const serverAction = useServerAction(activeServer?.id);
  const { addToast } = useToastStore();

  const players = onlinePlayersData || onlinePlayers;
  const messages = chatHistory || chatMessages;
  const activeTasks = tasks?.filter((t) => t.isActive) || [];

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleAction = (type: string, label: string) => {
    serverAction.mutate(
      { type },
      {
        onSuccess: () => addToast('success', `${label} sent`),
        onError: () => addToast('error', `Failed to ${label.toLowerCase()}`),
      }
    );
  };

  if (!activeServer) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Server className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">
          No Server Selected
        </h2>
        <p className="text-sm text-gray-500 max-w-md">
          Select a server from the dropdown in the top bar to get started with managing your DayZ server.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Server overview and quick actions for {activeServer.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Online Players
                </p>
                <p className="text-3xl font-bold text-gray-100 mt-1 font-mono">
                  {players.length}
                  <span className="text-lg text-gray-500">
                    /{activeServer.maxPlayers}
                  </span>
                </p>
              </div>
              <div className="p-2 bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-green-400">
              <ArrowUpRight className="w-3 h-3" />
              <span>{Math.round((players.length / activeServer.maxPlayers) * 100)}% capacity</span>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server Status
                </p>
                <p className="text-lg font-bold text-gray-100 mt-1">
                  {activeServer.status === 'online' ? (
                    <Badge variant="success" dot>Online</Badge>
                  ) : activeServer.status === 'restarting' ? (
                    <Badge variant="warning" dot>Restarting</Badge>
                  ) : (
                    <Badge variant="danger" dot>Offline</Badge>
                  )}
                </p>
              </div>
              <div className="p-2 bg-blue-900/30 rounded-lg">
                <Server className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-mono">
              {activeServer.ip}:{activeServer.port}
            </p>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </p>
                <p className="text-3xl font-bold text-gray-100 mt-1 font-mono">
                  {formatUptime(serverStatus?.uptime)}
                </p>
              </div>
              <div className="p-2 bg-purple-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            {serverStatus && (
              <p className="mt-3 text-xs text-gray-500">
                FPS: <span className="text-gray-300 font-mono">{serverStatus.fps}</span>
              </p>
            )}
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </p>
                <p className="text-3xl font-bold text-gray-100 mt-1 font-mono">
                  {serverStatus?.cpu ?? '--'}
                  <span className="text-lg text-gray-500">%</span>
                </p>
              </div>
              <div className="p-2 bg-accent-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-accent-400" />
              </div>
            </div>
            {serverStatus && (
              <p className="mt-3 text-xs text-gray-500">
                Memory: <span className="text-gray-300 font-mono">{serverStatus.memory}MB</span>
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <Zap className="w-4 h-4 text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-200">Quick Actions</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => handleAction('restart', 'Restart')}
            disabled={!rconConnected}
          >
            Restart Server
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Send className="w-4 h-4" />}
            onClick={() => handleAction('message', 'Message')}
            disabled={!rconConnected}
          >
            Broadcast Message
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Lock className="w-4 h-4" />}
            onClick={() => handleAction('lock', 'Lock')}
            disabled={!rconConnected}
          >
            Lock Server
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Unlock className="w-4 h-4" />}
            onClick={() => handleAction('unlock', 'Unlock')}
            disabled={!rconConnected}
          >
            Unlock Server
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Count Chart */}
        <Card>
          <CardHeader>
            <Users className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Player Count (24h)
            </h2>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics ? [] : demoPlayerHistory}>
                  <defs>
                    <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4a6741" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4a6741" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="time"
                    stroke="#5c668c"
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#2a2a3e' }}
                  />
                  <YAxis
                    stroke="#5c668c"
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#2a2a3e' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a2e',
                      border: '1px solid #374270',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#9fa5bb' }}
                    itemStyle={{ color: '#4a6741' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#4a6741"
                    strokeWidth={2}
                    fill="url(#colorPlayers)"
                    name="Players"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Online Players */}
        <Card>
          <CardHeader
            action={
              <Badge variant="success" size="sm">
                {players.length} online
              </Badge>
            }
          >
            <Users className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Online Players
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {players.length > 0 ? (
                players.slice(0, 15).map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-5 py-2.5 border-b border-surface-700/30 hover:bg-surface-700/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="status-dot status-dot-online" />
                      <span className="text-sm text-gray-200 font-medium">
                        {player.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {Math.round(player.playtime / 60)}h
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  No players online
                </div>
              )}
            </div>
          </CardBody>
          {players.length > 15 && (
            <CardFooter>
              <p className="text-xs text-gray-500">
                +{players.length - 15} more players
              </p>
            </CardFooter>
          )}
        </Card>

        {/* Recent Chat */}
        <Card>
          <CardHeader>
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Recent Chat</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {messages.length > 0 ? (
                messages.slice(-10).map((msg) => (
                  <div
                    key={msg.id}
                    className="px-5 py-2 border-b border-surface-700/30"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          msg.isAdmin
                            ? 'text-accent-400'
                            : msg.type === 'system'
                            ? 'text-gray-500'
                            : 'text-primary-400'
                        }`}
                      >
                        {msg.playerName}
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{msg.message}</p>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  No recent messages
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Active Tasks */}
        <Card>
          <CardHeader
            action={
              <Badge variant="primary" size="sm">
                {activeTasks.length} active
              </Badge>
            }
          >
            <Clock className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Scheduled Tasks
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {activeTasks.length > 0 ? (
                activeTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-5 py-2.5 border-b border-surface-700/30"
                  >
                    <div>
                      <p className="text-sm text-gray-200 font-medium">
                        {task.name}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {task.cronExpression}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.type === 'restart'
                          ? 'danger'
                          : task.type === 'message'
                          ? 'info'
                          : 'default'
                      }
                      size="sm"
                    >
                      {task.type}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  No active tasks
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
