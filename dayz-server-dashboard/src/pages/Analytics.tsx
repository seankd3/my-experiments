import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
  UserPlus,
  UserCheck,
  Crown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useServerStore } from '../store/serverStore';
import { useAnalytics } from '../api/hooks';

const CHART_COLORS = ['#4a6741', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

// Demo data
const demoData = {
  playerCountHistory: Array.from({ length: 48 }, (_, i) => ({
    time: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
    count: Math.floor(Math.random() * 35) + 8,
  })),
  peakHours: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    avgPlayers: Math.floor(
      Math.sin(((i - 6) / 24) * Math.PI * 2) * 15 + 20 + Math.random() * 5
    ),
  })),
  sessionDistribution: [
    { range: '0-15m', count: 45 },
    { range: '15-30m', count: 82 },
    { range: '30-1h', count: 120 },
    { range: '1-2h', count: 95 },
    { range: '2-4h', count: 60 },
    { range: '4h+', count: 25 },
  ],
  retentionData: [
    { day: 1, percentage: 100 },
    { day: 2, percentage: 68 },
    { day: 3, percentage: 52 },
    { day: 7, percentage: 38 },
    { day: 14, percentage: 28 },
    { day: 30, percentage: 18 },
  ],
  topPlayers: [
    { name: 'SurvivorMike', playtime: 4820, sessions: 156 },
    { name: 'DayZKing99', playtime: 3650, sessions: 98 },
    { name: 'NightStalker', playtime: 3200, sessions: 112 },
    { name: 'BaseBuilder42', playtime: 2890, sessions: 87 },
    { name: 'LootGoblin', playtime: 2540, sessions: 76 },
    { name: 'ChernoVeteran', playtime: 2100, sessions: 65 },
    { name: 'FreshSpawn', playtime: 1850, sessions: 142 },
    { name: 'WolfPack_Alpha', playtime: 1720, sessions: 54 },
  ],
  metrics: {
    avgPlayers: 22,
    peakPlayers: 48,
    totalUnique: 342,
    avgSessionLength: 82,
    uptimePercentage: 99.2,
    newPlayers: 45,
    returningPlayers: 297,
  },
};

const pieData = [
  { name: 'New', value: 45 },
  { name: 'Returning', value: 297 },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #374270',
    borderRadius: '8px',
    fontSize: '12px',
  },
  labelStyle: { color: '#9fa5bb' },
};

export default function Analytics() {
  const { activeServer } = useServerStore();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  const { data: analyticsData } = useAnalytics(activeServer?.id, dateRange);
  const data = analyticsData || demoData;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Server performance and player insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-800 border border-surface-700/50 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="bg-transparent text-sm text-gray-300 border-none focus:outline-none"
            />
            <span className="text-gray-600">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="bg-transparent text-sm text-gray-300 border-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Avg Players',
            value: data.metrics.avgPlayers,
            icon: Users,
            color: 'text-green-400',
            bg: 'bg-green-900/30',
          },
          {
            label: 'Peak Players',
            value: data.metrics.peakPlayers,
            icon: TrendingUp,
            color: 'text-blue-400',
            bg: 'bg-blue-900/30',
          },
          {
            label: 'Total Unique',
            value: data.metrics.totalUnique,
            icon: UserCheck,
            color: 'text-purple-400',
            bg: 'bg-purple-900/30',
          },
          {
            label: 'Avg Session',
            value: `${data.metrics.avgSessionLength}m`,
            icon: Clock,
            color: 'text-accent-400',
            bg: 'bg-accent-900/30',
          },
          {
            label: 'Uptime',
            value: `${data.metrics.uptimePercentage}%`,
            icon: Activity,
            color: 'text-cyan-400',
            bg: 'bg-cyan-900/30',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} hover>
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    {label}
                  </p>
                  <p className="text-2xl font-bold text-gray-100 mt-1 font-mono">
                    {value}
                  </p>
                </div>
                <div className={`p-2 ${bg} rounded-lg`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Count Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <TrendingUp className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Player Count Over Time
            </h2>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.playerCountHistory}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4a6741" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4a6741" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis dataKey="time" stroke="#5c668c" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#5c668c" tick={{ fontSize: 10 }} />
                  <Tooltip {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#4a6741"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                    name="Players"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Peak Hours Heatmap */}
        <Card>
          <CardHeader>
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Peak Hours</h2>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="hour"
                    stroke="#5c668c"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}:00`}
                  />
                  <YAxis stroke="#5c668c" tick={{ fontSize: 10 }} />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => `${v}:00`}
                  />
                  <Bar
                    dataKey="avgPlayers"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Avg Players"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Session Duration */}
        <Card>
          <CardHeader>
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Session Duration
            </h2>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sessionDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis dataKey="range" stroke="#5c668c" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#5c668c" tick={{ fontSize: 10 }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar
                    dataKey="count"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                    name="Sessions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Player Retention */}
        <Card>
          <CardHeader>
            <TrendingUp className="w-4 h-4 text-accent-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              Player Retention
            </h2>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.retentionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="day"
                    stroke="#5c668c"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `Day ${v}`}
                  />
                  <YAxis
                    stroke="#5c668c"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(v) => `Day ${v}`}
                    formatter={(v: number) => [`${v}%`, 'Retention']}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    name="Retention %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* New vs Returning */}
        <Card>
          <CardHeader>
            <UserPlus className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              New vs Returning
            </h2>
          </CardHeader>
          <CardBody>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Top Players */}
      <Card>
        <CardHeader>
          <Crown className="w-4 h-4 text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-200">
            Top Players by Playtime
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Playtime
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Avg Session
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topPlayers.map((player, i) => (
                  <tr
                    key={player.name}
                    className="border-b border-surface-700/30 hover:bg-surface-700/20"
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                          ${
                            i === 0
                              ? 'bg-accent-700/30 text-accent-400'
                              : i === 1
                              ? 'bg-gray-600/30 text-gray-300'
                              : i === 2
                              ? 'bg-amber-900/30 text-amber-600'
                              : 'bg-surface-700 text-gray-500'
                          }
                        `}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-200">
                      {player.name}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-400">
                      {Math.floor(player.playtime / 60)}h {player.playtime % 60}m
                    </td>
                    <td className="px-5 py-3 text-gray-400">{player.sessions}</td>
                    <td className="px-5 py-3 font-mono text-gray-400">
                      {Math.round(player.playtime / player.sessions)}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
