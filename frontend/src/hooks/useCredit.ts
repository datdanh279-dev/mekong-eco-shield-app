'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import type { CreditScore, CreditApplication, CreditApplicationPayload, PaginatedResponse } from '@/types';

export function useCreditScore(farmId: string) {
  return useQuery({
    queryKey: ['credit-score', farmId],
    queryFn: async () => {
      const { data } = await api.get<CreditScore>(`/credit/scores/${farmId}`);
      return data;
    },
    enabled: !!farmId,
  });
}

export function useCreditApplications(params?: { page?: number; per_page?: number; status?: string }) {
  return useQuery({
    queryKey: ['credit-applications', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CreditApplication>>('/credit/applications', { params });
      return data;
    },
  });
}

export function useCreateCreditApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreditApplicationPayload) => {
      const { data } = await api.post<CreditApplication>('/credit/applications', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-applications'] });
    },
  });
}

export function useCreditTiers() {
  return useQuery({
    queryKey: ['credit-tiers'],
    queryFn: async () => {
      const { data } = await api.get('/credit/tiers');
      return data as Array<{
        tier: string;
        min_score: number;
        max_score: number;
        interest_rate: number;
        max_amount: number;
      }>;
    },
  });
}

export function useESGReport(farmId: string) {
  return useQuery({
    queryKey: ['esg-report', farmId],
    queryFn: async () => {
      const { data } = await api.get(`/credit/esg/${farmId}`);
      return data;
    },
    enabled: !!farmId,
  });
}
