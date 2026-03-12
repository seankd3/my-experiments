import React, { useState } from 'react';
import {
  Shield,
  Users,
  CreditCard,
  Settings,
  FileText,
  TrendingUp,
  DollarSign,
  Server,
  Search,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import Table, { Column } from '../components/ui/Table';
import {
  useAdminStats,
  useAdminUsers,
  useAdminUpdateUser,
  useAdminTiers,
  useAdminUpdateTier,
  useAdminCreateTier,
  useAdminFeatures,
  useAdminUpdateFeature,
  useAdminCreateFeature,
  useAdminDeleteFeature,
  useAdminAuditLog,
} from '../api/hooks';
import { useToastStore } from '../store/toastStore';
import type { User, SubscriptionTier, FeatureFlag, AuditLog } from '../types';

// Demo data
const demoStats = {
  totalUsers: 1248,
  activeSubscriptions: 342,
  mrr: 8540.5,
  totalServers: 567,
  userGrowth: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: Math.floor(1100 + i * 5 + Math.random() * 20),
  })),
  revenueHistory: Array.from({ length: 12 }, (_, i) => ({
    date: new Date(2026, i, 1).toLocaleDateString('en-US', { month: 'short' }),
    amount: Math.floor(5000 + i * 300 + Math.random() * 500),
  })),
};

const demoUsers: User[] = Array.from({ length: 20 }, (_, i) => ({
  id: `user-${i}`,
  username: `user_${['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango'][i]}`,
  email: `user${i}@example.com`,
  role: i === 0 ? 'superadmin' : i < 3 ? 'admin' : 'user',
  createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
}));

const demoFeatures: FeatureFlag[] = [
  { id: 'f1', key: 'map_view', name: 'Interactive Map', description: 'Real-time map with player positions', minimumTier: 'pro', isActive: true },
  { id: 'f2', key: 'analytics', name: 'Analytics Dashboard', description: 'Server analytics and metrics', minimumTier: 'pro', isActive: true },
  { id: 'f3', key: 'automation', name: 'Task Automation', description: 'Scheduled tasks and commands', minimumTier: 'starter', isActive: true },
  { id: 'f4', key: 'player_mgmt', name: 'Player Management', description: 'Kick, ban, teleport controls', minimumTier: 'starter', isActive: true },
  { id: 'f5', key: 'api_access', name: 'API Access', description: 'REST API for integrations', minimumTier: 'pro', isActive: true },
  { id: 'f6', key: 'webhooks', name: 'Webhook Notifications', description: 'Discord & custom webhooks', minimumTier: 'enterprise', isActive: false },
];

const demoAuditLogs: AuditLog[] = Array.from({ length: 30 }, (_, i) => ({
  id: `log-${i}`,
  userId: `user-${i % 3}`,
  userName: ['admin_alpha', 'admin_bravo', 'admin_charlie'][i % 3],
  action: ['user.update', 'tier.update', 'feature.toggle', 'user.ban', 'server.restart', 'subscription.override'][i % 6],
  details: ['Updated user role to admin', 'Changed Pro tier price', 'Toggled webhook feature', 'Banned user for ToS violation', 'Triggered server restart', 'Overrode subscription tier'][i % 6],
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  ip: '192.168.1.' + (100 + i),
}));

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1a1a2e', border: '1px solid #374270', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#9fa5bb' },
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const { addToast } = useToastStore();

  const { data: stats } = useAdminStats();
  const { data: users } = useAdminUsers();
  const { data: tiers } = useAdminTiers();
  const { data: features } = useAdminFeatures();
  const { data: auditLogData } = useAdminAuditLog();
  const updateUser = useAdminUpdateUser();
  const updateTier = useAdminUpdateTier();
  const createTier = useAdminCreateTier();
  const updateFeature = useAdminUpdateFeature();
  const createFeature = useAdminCreateFeature();
  const deleteFeature = useAdminDeleteFeature();

  const displayStats = stats || demoStats;
  const displayUsers = users || demoUsers;
  const displayFeatures = features || demoFeatures;
  const displayAuditLogs = auditLogData?.logs || demoAuditLogs;

  // User management
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Feature management
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureForm, setFeatureForm] = useState({
    key: '', name: '', description: '', minimumTier: 'starter', isActive: true,
  });
  const [editingFeature, setEditingFeature] = useState<FeatureFlag | null>(null);

  // Tier management
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [tierForm, setTierForm] = useState({
    name: '', price: '', maxServers: '', features: '', description: '',
  });
  const [showTierModal, setShowTierModal] = useState(false);

  // Audit search
  const [auditSearch, setAuditSearch] = useState('');

  const handleUserRoleUpdate = () => {
    if (editingUser && userRole) {
      updateUser.mutate(
        { userId: editingUser.id, data: { role: userRole as User['role'] } },
        {
          onSuccess: () => {
            addToast('success', `Updated ${editingUser.username}'s role`);
            setEditingUser(null);
          },
          onError: () => addToast('error', 'Failed to update user'),
        }
      );
    }
  };

  const handleFeatureSubmit = () => {
    if (editingFeature) {
      updateFeature.mutate(
        { featureId: editingFeature.id, data: featureForm },
        {
          onSuccess: () => { addToast('success', 'Feature updated'); setShowFeatureModal(false); },
          onError: () => addToast('error', 'Failed to update feature'),
        }
      );
    } else {
      createFeature.mutate(featureForm, {
        onSuccess: () => { addToast('success', 'Feature created'); setShowFeatureModal(false); },
        onError: () => addToast('error', 'Failed to create feature'),
      });
    }
  };

  const handleTierSubmit = () => {
    const data = {
      name: tierForm.name,
      price: parseFloat(tierForm.price),
      maxServers: parseInt(tierForm.maxServers),
      features: tierForm.features.split('\n').filter(Boolean),
      description: tierForm.description,
    };
    if (editingTier) {
      updateTier.mutate(
        { tierId: editingTier.id, data },
        {
          onSuccess: () => { addToast('success', 'Tier updated'); setShowTierModal(false); },
          onError: () => addToast('error', 'Failed to update tier'),
        }
      );
    } else {
      createTier.mutate(data, {
        onSuccess: () => { addToast('success', 'Tier created'); setShowTierModal(false); },
        onError: () => addToast('error', 'Failed to create tier'),
      });
    }
  };

  const filteredUsers = userSearch
    ? displayUsers.filter((u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : displayUsers;

  const filteredLogs = auditSearch
    ? displayAuditLogs.filter((l) =>
        l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.details.toLowerCase().includes(auditSearch.toLowerCase())
      )
    : displayAuditLogs;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-accent-400" />
          <h1 className="text-2xl font-bold text-gray-100">Admin Panel</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          System administration and management
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
          { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'features', label: 'Features', icon: <Settings className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: displayStats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/30' },
              { label: 'Active Subs', value: displayStats.activeSubscriptions.toLocaleString(), icon: CreditCard, color: 'text-green-400', bg: 'bg-green-900/30' },
              { label: 'MRR', value: `$${displayStats.mrr.toLocaleString()}`, icon: DollarSign, color: 'text-accent-400', bg: 'bg-accent-900/30' },
              { label: 'Total Servers', value: displayStats.totalServers.toLocaleString(), icon: Server, color: 'text-purple-400', bg: 'bg-purple-900/30' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} hover>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                      <p className="text-2xl font-bold text-gray-100 mt-1 font-mono">{value}</p>
                    </div>
                    <div className={`p-2 ${bg} rounded-lg`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-gray-200">User Growth</h2>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayStats.userGrowth}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                      <XAxis dataKey="date" stroke="#5c668c" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#5c668c" tick={{ fontSize: 10 }} />
                      <Tooltip {...tooltipStyle} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorUsers)" name="Users" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="w-4 h-4 text-accent-400" />
                <h2 className="text-sm font-semibold text-gray-200">Revenue History</h2>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayStats.revenueHistory}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                      <XAxis dataKey="date" stroke="#5c668c" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#5c668c" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, 'Revenue']} />
                      <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader action={
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="w-64"
            />
          }>
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Users ({displayUsers.length})</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Username</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Created</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                      <td className="px-5 py-3 font-medium text-gray-200">{user.username}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{user.email}</td>
                      <td className="px-5 py-3">
                        <Badge variant={user.role === 'superadmin' ? 'accent' : user.role === 'admin' ? 'primary' : 'default'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setEditingUser(user);
                            setUserRole(user.role);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">Subscription Tiers</h2>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingTier(null);
                setTierForm({ name: '', price: '', maxServers: '', features: '', description: '' });
                setShowTierModal(true);
              }}
            >
              Add Tier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(tiers || []).map((tier) => (
              <Card key={tier.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200">{tier.name}</h3>
                      <p className="text-2xl font-bold text-gray-100 font-mono">
                        ${tier.price}<span className="text-sm text-gray-500">/mo</span>
                      </p>
                    </div>
                    <Badge variant={tier.isActive ? 'success' : 'default'} dot>
                      {tier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Max Servers: {tier.maxServers === -1 ? 'Unlimited' : tier.maxServers} | Sort: {tier.sortOrder}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tier.features.slice(0, 4).map((f, i) => (
                      <Badge key={i} variant="default" size="sm">{f}</Badge>
                    ))}
                    {tier.features.length > 4 && (
                      <Badge variant="default" size="sm">+{tier.features.length - 4}</Badge>
                    )}
                  </div>
                </CardBody>
                <div className="px-5 py-3 border-t border-surface-700/50 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setEditingTier(tier);
                      setTierForm({
                        name: tier.name,
                        price: String(tier.price),
                        maxServers: String(tier.maxServers),
                        features: tier.features.join('\n'),
                        description: tier.description || '',
                      });
                      setShowTierModal(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
            {(!tiers || tiers.length === 0) && (
              <p className="text-gray-500 text-sm col-span-2 text-center py-8">
                No tiers configured. Add tiers from the API or click "Add Tier".
              </p>
            )}
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">Feature Flags</h2>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingFeature(null);
                setFeatureForm({ key: '', name: '', description: '', minimumTier: 'starter', isActive: true });
                setShowFeatureModal(true);
              }}
            >
              Add Feature
            </Button>
          </div>

          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Feature</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Key</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Min Tier</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayFeatures.map((feature) => (
                      <tr key={feature.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                        <td className="px-5 py-3">
                          <button
                            onClick={() =>
                              updateFeature.mutate(
                                { featureId: feature.id, data: { isActive: !feature.isActive } },
                                { onError: () => addToast('error', 'Failed to toggle feature') }
                              )
                            }
                            className="text-gray-400 hover:text-gray-200"
                          >
                            {feature.isActive ? (
                              <ToggleRight className="w-6 h-6 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-gray-600" />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-200">{feature.name}</p>
                          <p className="text-xs text-gray-500">{feature.description}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">{feature.key}</td>
                        <td className="px-5 py-3">
                          <Badge variant={feature.minimumTier === 'enterprise' ? 'accent' : feature.minimumTier === 'pro' ? 'primary' : 'info'}>
                            {feature.minimumTier}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setEditingFeature(feature);
                              setFeatureForm({
                                key: feature.key,
                                name: feature.name,
                                description: feature.description,
                                minimumTier: feature.minimumTier,
                                isActive: feature.isActive,
                              });
                              setShowFeatureModal(true);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            className="text-danger-400"
                            onClick={() => deleteFeature.mutate(feature.id, {
                              onSuccess: () => addToast('success', 'Feature deleted'),
                              onError: () => addToast('error', 'Failed to delete'),
                            })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader action={
            <Input
              placeholder="Search logs..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="w-64"
            />
          }>
            <FileText className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200">Audit Log</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Details</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-200">{log.userName}</td>
                      <td className="px-5 py-3">
                        <Badge variant={
                          log.action.includes('delete') || log.action.includes('ban') ? 'danger' :
                          log.action.includes('create') ? 'success' : 'default'
                        } size="sm">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs max-w-xs truncate">{log.details}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User: ${editingUser?.username}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUserRoleUpdate} loading={updateUser.isPending}>Save</Button>
          </>
        }
      >
        <Select
          label="Role"
          value={userRole}
          onChange={(e) => setUserRole(e.target.value)}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
            { value: 'superadmin', label: 'Super Admin' },
          ]}
        />
      </Modal>

      {/* Feature Modal */}
      <Modal
        isOpen={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
        title={editingFeature ? 'Edit Feature' : 'Add Feature'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowFeatureModal(false)}>Cancel</Button>
            <Button onClick={handleFeatureSubmit}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Key" value={featureForm.key} onChange={(e) => setFeatureForm({ ...featureForm, key: e.target.value })} placeholder="feature_key" />
          <Input label="Name" value={featureForm.name} onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })} placeholder="Feature Name" />
          <Textarea label="Description" value={featureForm.description} onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })} />
          <Select label="Minimum Tier" value={featureForm.minimumTier} onChange={(e) => setFeatureForm({ ...featureForm, minimumTier: e.target.value })} options={[
            { value: 'free', label: 'Free' },
            { value: 'starter', label: 'Starter' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise' },
          ]} />
        </div>
      </Modal>

      {/* Tier Modal */}
      <Modal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        title={editingTier ? 'Edit Tier' : 'Add Tier'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowTierModal(false)}>Cancel</Button>
            <Button onClick={handleTierSubmit}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} placeholder="Tier Name" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price ($/mo)" type="number" value={tierForm.price} onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })} />
            <Input label="Max Servers (-1 = unlimited)" type="number" value={tierForm.maxServers} onChange={(e) => setTierForm({ ...tierForm, maxServers: e.target.value })} />
          </div>
          <Input label="Description" value={tierForm.description} onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })} />
          <Textarea label="Features (one per line)" value={tierForm.features} onChange={(e) => setTierForm({ ...tierForm, features: e.target.value })} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
        </div>
      </Modal>
    </div>
  );
}
