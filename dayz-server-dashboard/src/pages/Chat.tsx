import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Users,
  User,
  Shield,
  ChevronRight,
  X,
  Hash,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useServerStore } from '../store/serverStore';
import { useChatHistory, useSendMessage, useOnlinePlayers } from '../api/hooks';
import type { ChatMessage, Player } from '../types';

export default function Chat() {
  const { activeServer, chatMessages } = useServerStore();
  const { data: chatHistory } = useChatHistory(activeServer?.id);
  const { data: onlinePlayers } = useOnlinePlayers(activeServer?.id);
  const sendMessage = useSendMessage(activeServer?.id);

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [pmTabs, setPmTabs] = useState<Player[]>([]);
  const [activePmTab, setActivePmTab] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = chatHistory || chatMessages;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.message.toLowerCase().includes(q) ||
        m.playerName.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const data: { message: string; type?: string; target?: string } = {
      message: messageInput.trim(),
    };

    if (activePmTab) {
      data.type = 'private';
      data.target = activePmTab;
    } else {
      data.type = 'global';
    }

    sendMessage.mutate(data);
    setMessageInput('');
  };

  const openPm = (player: Player) => {
    if (!pmTabs.find((p) => p.id === player.id)) {
      setPmTabs([...pmTabs, player]);
    }
    setActivePmTab(player.id);
  };

  const closePm = (playerId: string) => {
    setPmTabs(pmTabs.filter((p) => p.id !== playerId));
    if (activePmTab === playerId) {
      setActivePmTab(null);
    }
  };

  const getMessageStyle = (msg: ChatMessage) => {
    if (msg.isAdmin || msg.type === 'admin') return 'text-accent-400';
    if (msg.type === 'system') return 'text-gray-500 italic';
    if (msg.type === 'private') return 'text-purple-400';
    return 'text-primary-400';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-in">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-1.5 rounded hover:bg-surface-700 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            }
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">
              {activePmTab
                ? `PM: ${pmTabs.find((p) => p.id === activePmTab)?.name}`
                : 'Global Chat'}
            </h2>
          </CardHeader>

          {/* PM Tabs */}
          {pmTabs.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-700/50 overflow-x-auto">
              <button
                onClick={() => setActivePmTab(null)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${!activePmTab ? 'bg-primary-600/20 text-primary-400' : 'text-gray-400 hover:bg-surface-700/50'}
                `}
              >
                <Hash className="w-3 h-3" />
                Global
              </button>
              {pmTabs.map((player) => (
                <div
                  key={player.id}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer
                    ${activePmTab === player.id ? 'bg-purple-900/30 text-purple-400' : 'text-gray-400 hover:bg-surface-700/50'}
                  `}
                  onClick={() => setActivePmTab(player.id)}
                >
                  <User className="w-3 h-3" />
                  {player.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closePm(player.id);
                    }}
                    className="ml-1 hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search bar */}
          {showSearch && (
            <div className="px-4 py-2 border-b border-surface-700/50">
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="group flex items-start gap-2 py-1 px-2 rounded hover:bg-surface-700/20 transition-colors"
                >
                  <span className="text-[10px] text-gray-600 font-mono mt-1 flex-shrink-0 w-16">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1">
                      {msg.isAdmin && <Shield className="w-3 h-3 text-accent-400" />}
                      <span className={`text-sm font-semibold ${getMessageStyle(msg)}`}>
                        {msg.playerName}
                      </span>
                      {msg.type === 'private' && (
                        <Badge variant="info" size="sm">PM</Badge>
                      )}
                    </span>
                    <span className="text-sm text-gray-300 ml-2">
                      {msg.message}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Messages will appear here in real-time</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-surface-700/50 p-4">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={
                    activePmTab
                      ? `Message ${pmTabs.find((p) => p.id === activePmTab)?.name}...`
                      : 'Send a global message...'
                  }
                  className="w-full bg-surface-900/60 border border-surface-600/50 rounded-lg text-gray-200 placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                />
              </div>
              <Button
                type="submit"
                icon={<Send className="w-4 h-4" />}
                disabled={!messageInput.trim() || sendMessage.isPending}
                loading={sendMessage.isPending}
              >
                Send
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Player List Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader>
            <Users className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-gray-200">
              Online ({onlinePlayers?.length || 0})
            </h3>
          </CardHeader>
          <CardBody className="p-0 flex-1 overflow-y-auto">
            {onlinePlayers && onlinePlayers.length > 0 ? (
              onlinePlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => openPm(player)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-surface-700/30 transition-colors text-left group"
                >
                  <span className="status-dot status-dot-online flex-shrink-0" />
                  <span className="text-sm text-gray-300 group-hover:text-gray-100 truncate flex-1">
                    {player.name}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No players online
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
