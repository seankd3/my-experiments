import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserX,
  Ban,
  Navigation,
  Heart,
  Shield,
  MessageSquare,
  Eye,
  X,
  Clock,
  MapPin,
  AlertTriangle,
  FileText,
  History,
} from 'lucide-react';
import Table, { Column } from '../components/ui/Table';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import { useServerStore } from '../store/serverStore';
import { usePlayers, useOnlinePlayers, usePlayerAction } from '../api/hooks';
import { useToastStore } from '../store/toastStore';
import type { Player } from '../types';

export default function Players() {
  const { activeServer, rconConnected } = useServerStore();
  const { data: allPlayers } = usePlayers(activeServer?.id);
  const { data: onlinePlayers } = useOnlinePlayers(activeServer?.id);
  const playerAction = usePlayerAction(activeServer?.id);
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showKickModal, setShowKickModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [kickReason, setKickReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [actionTarget, setActionTarget] = useState<Player | null>(null);

  const currentPlayers = activeTab === 'online' ? onlinePlayers || [] : allPlayers || [];

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return currentPlayers;
    const q = searchQuery.toLowerCase();
    return currentPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.steamId.toLowerCase().includes(q)
    );
  }, [currentPlayers, searchQuery]);

  const handleAction = (player: Player, action: string, data?: Record<string, unknown>) => {
    playerAction.mutate(
      { playerId: player.id, action, data },
      {
        onSuccess: () => addToast('success', `Action "${action}" applied to ${player.name}`),
        onError: () => addToast('error', `Failed to ${action} ${player.name}`),
      }
    );
  };

  const confirmKick = () => {
    if (actionTarget) {
      handleAction(actionTarget, 'kick', { reason: kickReason });
      setShowKickModal(false);
      setKickReason('');
      setActionTarget(null);
    }
  };

  const confirmBan = () => {
    if (actionTarget) {
      handleAction(actionTarget, 'ban', { reason: banReason });
      setShowBanModal(false);
      setBanReason('');
      setActionTarget(null);
    }
  };

  const columns: Column<Player>[] = [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      render: (player: Player) => (
        <div className="flex items-center gap-2">
          <span
            className={`status-dot ${
              player.status === 'online' ? 'status-dot-online' : 'status-dot-offline'
            }`}
          />
          <button
            className="text-gray-200 hover:text-primary-400 font-medium transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlayer(player);
            }}
          >
            {player.name}
          </button>
          {player.isAdmin && (
            <Badge variant="accent" size="sm">Admin</Badge>
          )}
          {player.isBanned && (
            <Badge variant="danger" size="sm">Banned</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'steamId',
      header: 'Steam ID',
      render: (player: Player) => (
        <span className="font-mono text-xs text-gray-400">{player.steamId}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (player: Player) => (
        <Badge variant={player.status === 'online' ? 'success' : 'default'} dot>
          {player.status}
        </Badge>
      ),
    },
    {
      key: 'playtime',
      header: 'Playtime',
      sortable: true,
      render: (player: Player) => (
        <span className="font-mono text-xs text-gray-400">
          {Math.round(player.playtime / 60)}h {player.playtime % 60}m
        </span>
      ),
    },
    {
      key: 'lastSeen',
      header: 'Last Seen',
      sortable: true,
      render: (player: Player) => (
        <span className="text-xs text-gray-400">
          {new Date(player.lastSeen).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (player: Player) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionTarget(player);
              setShowKickModal(true);
            }}
            className="p-1.5 rounded hover:bg-surface-700 text-gray-500 hover:text-yellow-400 transition-colors"
            title="Kick"
            disabled={!rconConnected || player.status !== 'online'}
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionTarget(player);
              setShowBanModal(true);
            }}
            className="p-1.5 rounded hover:bg-surface-700 text-gray-500 hover:text-red-400 transition-colors"
            title="Ban"
            disabled={!rconConnected}
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(player, 'heal');
            }}
            className="p-1.5 rounded hover:bg-surface-700 text-gray-500 hover:text-green-400 transition-colors"
            title="Heal"
            disabled={!rconConnected || player.status !== 'online'}
          >
            <Heart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(player, 'godmode');
            }}
            className="p-1.5 rounded hover:bg-surface-700 text-gray-500 hover:text-accent-400 transition-colors"
            title="Godmode"
            disabled={!rconConnected || player.status !== 'online'}
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlayer(player);
            }}
            className="p-1.5 rounded hover:bg-surface-700 text-gray-500 hover:text-blue-400 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Players</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage players on {activeServer?.name || 'your server'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Tabs
            tabs={[
              {
                id: 'online',
                label: 'Online',
                icon: <Users className="w-4 h-4" />,
                count: onlinePlayers?.length || 0,
              },
              {
                id: 'all',
                label: 'All Players',
                icon: <Users className="w-4 h-4" />,
                count: allPlayers?.length || 0,
              },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pills"
          />
        </CardHeader>
        <CardBody className="p-0">
          {/* Search */}
          <div className="px-5 py-3 border-b border-surface-700/50">
            <Input
              placeholder="Search players by name or Steam ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <Table
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={filteredPlayers as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={(item) => setSelectedPlayer(item as unknown as Player)}
            emptyMessage="No players found"
            pageSize={25}
          />
        </CardBody>
      </Card>

      {/* Player Detail Slide-out */}
      {selectedPlayer && (
        <div className="fixed inset-y-0 right-0 w-96 bg-surface-800 border-l border-surface-700/50 shadow-2xl z-40 animate-slide-in overflow-y-auto">
          <div className="sticky top-0 bg-surface-800 border-b border-surface-700/50 px-5 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-semibold text-gray-100">
              Player Details
            </h3>
            <button
              onClick={() => setSelectedPlayer(null)}
              className="p-1 rounded hover:bg-surface-700 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Profile */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary-700 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3">
                {selectedPlayer.name.charAt(0).toUpperCase()}
              </div>
              <h4 className="text-lg font-semibold text-gray-100">
                {selectedPlayer.name}
              </h4>
              <p className="text-xs text-gray-500 font-mono mt-1">
                {selectedPlayer.steamId}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge
                  variant={
                    selectedPlayer.status === 'online' ? 'success' : 'default'
                  }
                  dot
                >
                  {selectedPlayer.status}
                </Badge>
                {selectedPlayer.isAdmin && (
                  <Badge variant="accent">Admin</Badge>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-900/60 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">Playtime</span>
                </div>
                <p className="text-sm font-semibold text-gray-200 font-mono">
                  {Math.round(selectedPlayer.playtime / 60)}h {selectedPlayer.playtime % 60}m
                </p>
              </div>
              <div className="bg-surface-900/60 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">Position</span>
                </div>
                <p className="text-sm font-semibold text-gray-200 font-mono">
                  {selectedPlayer.position
                    ? `${Math.round(selectedPlayer.position.x)}, ${Math.round(selectedPlayer.position.y)}`
                    : 'Unknown'}
                </p>
              </div>
              <div className="bg-surface-900/60 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">Health</span>
                </div>
                <p className="text-sm font-semibold text-gray-200 font-mono">
                  {selectedPlayer.health != null ? `${selectedPlayer.health}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-surface-900/60 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">First Seen</span>
                </div>
                <p className="text-sm font-semibold text-gray-200">
                  {new Date(selectedPlayer.firstSeen).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Actions
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Navigation className="w-3.5 h-3.5" />}
                  disabled={!rconConnected}
                  onClick={() => handleAction(selectedPlayer, 'teleport')}
                >
                  Teleport
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Heart className="w-3.5 h-3.5" />}
                  disabled={!rconConnected}
                  onClick={() => handleAction(selectedPlayer, 'heal')}
                >
                  Heal
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  disabled={!rconConnected}
                  onClick={() => handleAction(selectedPlayer, 'message')}
                >
                  Message
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Shield className="w-3.5 h-3.5" />}
                  disabled={!rconConnected}
                  onClick={() => handleAction(selectedPlayer, 'godmode')}
                >
                  Godmode
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<UserX className="w-3.5 h-3.5" />}
                  disabled={!rconConnected}
                  onClick={() => {
                    setActionTarget(selectedPlayer);
                    setShowKickModal(true);
                  }}
                >
                  Kick
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Ban className="w-3.5 h-3.5" />}
                  disabled={!rconConnected}
                  onClick={() => {
                    setActionTarget(selectedPlayer);
                    setShowBanModal(true);
                  }}
                >
                  Ban
                </Button>
              </div>
            </div>

            {/* Sessions */}
            {selectedPlayer.sessions && selectedPlayer.sessions.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Recent Sessions
                </h5>
                <div className="space-y-2">
                  {selectedPlayer.sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between bg-surface-900/60 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-400">
                        {new Date(session.startTime).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {Math.round(session.duration / 60)}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ban History */}
            {selectedPlayer.banHistory && selectedPlayer.banHistory.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger-400" />
                  Ban History
                </h5>
                <div className="space-y-2">
                  {selectedPlayer.banHistory.map((ban) => (
                    <div
                      key={ban.id}
                      className="bg-danger-900/10 border border-danger-700/20 rounded-lg px-3 py-2"
                    >
                      <p className="text-xs text-danger-300">{ban.reason}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        By {ban.bannedBy} - {new Date(ban.bannedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Notes
              </h5>
              <textarea
                className="w-full bg-surface-900/60 border border-surface-600/50 rounded-md text-gray-200 text-sm px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-y"
                placeholder="Add notes about this player..."
                defaultValue={selectedPlayer.notes || ''}
              />
            </div>
          </div>
        </div>
      )}

      {/* Kick Modal */}
      <Modal
        isOpen={showKickModal}
        onClose={() => {
          setShowKickModal(false);
          setActionTarget(null);
        }}
        title={`Kick ${actionTarget?.name}`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowKickModal(false);
                setActionTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmKick}>
              Kick Player
            </Button>
          </>
        }
      >
        <Input
          label="Reason (optional)"
          value={kickReason}
          onChange={(e) => setKickReason(e.target.value)}
          placeholder="Enter kick reason..."
        />
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setActionTarget(null);
        }}
        title={`Ban ${actionTarget?.name}`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowBanModal(false);
                setActionTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmBan}>
              Ban Player
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-danger-900/20 border border-danger-700/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-danger-400" />
            <p className="text-sm text-danger-300">
              This will permanently ban the player from the server.
            </p>
          </div>
          <Input
            label="Ban Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Enter ban reason..."
          />
        </div>
      </Modal>
    </div>
  );
}
