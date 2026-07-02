'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import type { Alert, AlertFilters, PaginatedResponse } from '@/types';

export function useAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Alert>>('/alerts', { params: filters });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: ['alert', id],
    queryFn: async () => {
      const { data } = await api.get<Alert>(`/alerts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRecentAlerts(limit = 10) {
  return useQuery({
    queryKey: ['recent-alerts', limit],
    queryFn: async () => {
      const { data } = await api.get<Alert[]>('/alerts/recent', { params: { limit } });
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/alerts/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/alerts/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-alerts'] });
    },
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: ['alert-stats'],
    queryFn: async () => {
      const { data } = await api.get('/alerts/stats');
      return data as {
        total: number;
        by_severity: Record<string, number>;
        by_type: Record<string, number>;
        active: number;
      };
    },
    refetchInterval: 60000,
  });
}
