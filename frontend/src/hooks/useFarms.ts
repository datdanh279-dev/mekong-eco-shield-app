'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import type { Farm, FarmCreatePayload, PaginatedResponse } from '@/types';

export function useFarms(params?: { page?: number; per_page?: number; search?: string; province?: string }) {
  return useQuery({
    queryKey: ['farms', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Farm>>('/farms', { params });
      return data;
    },
  });
}

export function useFarm(id: string) {
  return useQuery({
    queryKey: ['farm', id],
    queryFn: async () => {
      const { data } = await api.get<Farm>(`/farms/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FarmCreatePayload) => {
      const { data } = await api.post<Farm>('/farms', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useUpdateFarm(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FarmCreatePayload>) => {
      const { data } = await api.patch<Farm>(`/farms/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      queryClient.invalidateQueries({ queryKey: ['farm', id] });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useFarmStats() {
  return useQuery({
    queryKey: ['farm-stats'],
    queryFn: async () => {
      const { data } = await api.get('/farms/stats');
      return data as {
        total: number;
        by_crop: Record<string, number>;
        by_province: Record<string, number>;
        total_area: number;
      };
    },
  });
}
