import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';
import { useServerStore } from '../store/serverStore';
import type {
  Server,
  ServerStatus,
  Player,
  ChatMessage,
  ScheduledTask,
  MapEntity,
  AnalyticsData,
  SubscriptionTier,
  Subscription,
  User,
  AdminStats,
  FeatureFlag,
  AuditLog,
} from '../types';

// ---- Servers ----
export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: () => api.get<Server[]>('/servers'),
  });
}

export function useServerStatus(serverId?: string) {
  return useQuery({
    queryKey: ['server-status', serverId],
    queryFn: () => api.get<ServerStatus>(`/servers/${serverId}/status`),
    enabled: !!serverId,
    refetchInterval: 10_000,
  });
}

// ---- Players ----
export function usePlayers(serverId?: string) {
  return useQuery({
    queryKey: ['players', serverId],
    queryFn: () => api.get<Player[]>(`/servers/${serverId}/players`),
    enabled: !!serverId,
  });
}

export function useOnlinePlayers(serverId?: string) {
  return useQuery({
    queryKey: ['online-players', serverId],
    queryFn: () => api.get<Player[]>(`/servers/${serverId}/players/online`),
    enabled: !!serverId,
    refetchInterval: 5_000,
  });
}

export function usePlayerDetails(serverId?: string, playerId?: string) {
  return useQuery({
    queryKey: ['player-details', serverId, playerId],
    queryFn: () => api.get<Player>(`/servers/${serverId}/players/${playerId}`),
    enabled: !!serverId && !!playerId,
  });
}

export function usePlayerAction(serverId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      playerId,
      action,
      data,
    }: {
      playerId: string;
      action: string;
      data?: Record<string, unknown>;
    }) =>
      api.post(`/servers/${serverId}/players/${playerId}/${action}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', serverId] });
      queryClient.invalidateQueries({
        queryKey: ['online-players', serverId],
      });
    },
  });
}

// ---- Chat ----
export function useChatHistory(serverId?: string) {
  return useQuery({
    queryKey: ['chat', serverId],
    queryFn: () => api.get<ChatMessage[]>(`/servers/${serverId}/chat`),
    enabled: !!serverId,
  });
}

export function useSendMessage(serverId?: string) {
  const { addChatMessage } = useServerStore.getState();
  return useMutation({
    mutationFn: (data: { message: string; type?: string; target?: string }) =>
      api.post<ChatMessage>(`/servers/${serverId}/chat`, data),
    onSuccess: (msg) => {
      addChatMessage(msg);
    },
  });
}

// ---- Scheduled Tasks ----
export function useScheduledTasks(serverId?: string) {
  return useQuery({
    queryKey: ['tasks', serverId],
    queryFn: () => api.get<ScheduledTask[]>(`/servers/${serverId}/tasks`),
    enabled: !!serverId,
  });
}

export function useCreateTask(serverId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScheduledTask>) =>
      api.post<ScheduledTask>(`/servers/${serverId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', serverId] });
    },
  });
}

export function useUpdateTask(serverId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<ScheduledTask> }) =>
      api.patch<ScheduledTask>(`/servers/${serverId}/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', serverId] });
    },
  });
}

export function useToggleTask(serverId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/servers/${serverId}/tasks/${taskId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', serverId] });
    },
  });
}

export function useDeleteTask(serverId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/servers/${serverId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', serverId] });
    },
  });
}

export function useRunTask(serverId?: string) {
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/servers/${serverId}/tasks/${taskId}/run`),
  });
}

// ---- Map Entities ----
export function useMapEntities(serverId?: string) {
  return useQuery({
    queryKey: ['map-entities', serverId],
    queryFn: () => api.get<MapEntity[]>(`/servers/${serverId}/map/entities`),
    enabled: !!serverId,
    refetchInterval: 3_000,
  });
}

export function usePlayerPositions(serverId?: string) {
  return useQuery({
    queryKey: ['player-positions', serverId],
    queryFn: () =>
      api.get<MapEntity[]>(`/servers/${serverId}/map/players`),
    enabled: !!serverId,
    refetchInterval: 3_000,
  });
}

export function useTeleportPlayer(serverId?: string) {
  return useMutation({
    mutationFn: ({
      playerId,
      position,
    }: {
      playerId: string;
      position: { x: number; y: number; z?: number };
    }) =>
      api.post(`/servers/${serverId}/players/${playerId}/teleport`, {
        position,
      }),
  });
}

export function useSpawnItem(serverId?: string) {
  return useMutation({
    mutationFn: (data: {
      item: string;
      position: { x: number; y: number; z?: number };
    }) => api.post(`/servers/${serverId}/map/spawn`, data),
  });
}

// ---- Analytics ----
export function useAnalytics(
  serverId?: string,
  dateRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: ['analytics', serverId, dateRange],
    queryFn: () => {
      const params = dateRange
        ? `?start=${dateRange.start}&end=${dateRange.end}`
        : '';
      return api.get<AnalyticsData>(
        `/servers/${serverId}/analytics${params}`
      );
    },
    enabled: !!serverId,
  });
}

export function usePlayerMetrics(serverId?: string) {
  return useQuery({
    queryKey: ['player-metrics', serverId],
    queryFn: () =>
      api.get<AnalyticsData['metrics']>(
        `/servers/${serverId}/analytics/metrics`
      ),
    enabled: !!serverId,
    refetchInterval: 60_000,
  });
}

// ---- Subscriptions ----
export function useSubscriptionTiers() {
  return useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: () => api.get<SubscriptionTier[]>('/subscriptions/tiers'),
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => api.get<Subscription>('/subscriptions/current'),
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tierId: string) =>
      api.post<{ url: string }>('/subscriptions/subscribe', { tierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/subscriptions/cancel'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
    },
  });
}

// ---- Admin ----
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<User[]>('/admin/users'),
  });
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      api.patch(`/admin/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useAdminTiers() {
  return useQuery({
    queryKey: ['admin-tiers'],
    queryFn: () => api.get<SubscriptionTier[]>('/admin/tiers'),
  });
}

export function useAdminUpdateTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tierId,
      data,
    }: {
      tierId: string;
      data: Partial<SubscriptionTier>;
    }) => api.patch(`/admin/tiers/${tierId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tiers'] });
    },
  });
}

export function useAdminCreateTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SubscriptionTier>) =>
      api.post('/admin/tiers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tiers'] });
    },
  });
}

export function useAdminFeatures() {
  return useQuery({
    queryKey: ['admin-features'],
    queryFn: () => api.get<FeatureFlag[]>('/admin/features'),
  });
}

export function useAdminUpdateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      featureId,
      data,
    }: {
      featureId: string;
      data: Partial<FeatureFlag>;
    }) => api.patch(`/admin/features/${featureId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
    },
  });
}

export function useAdminCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FeatureFlag>) =>
      api.post('/admin/features', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
    },
  });
}

export function useAdminDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) =>
      api.delete(`/admin/features/${featureId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });
}

export function useAdminAuditLog(page = 1, search = '') {
  return useQuery({
    queryKey: ['admin-audit-log', page, search],
    queryFn: () =>
      api.get<{ logs: AuditLog[]; total: number }>(
        `/admin/audit-log?page=${page}&search=${encodeURIComponent(search)}`
      ),
  });
}

// ---- Server Actions ----
export function useServerAction(serverId?: string) {
  return useMutation({
    mutationFn: (action: { type: string; data?: Record<string, unknown> }) =>
      api.post(`/servers/${serverId}/action`, action),
  });
}
