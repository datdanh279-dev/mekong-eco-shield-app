'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import type {
  TokenAccount,
  TokenTransaction,
  EmergencyListing,
  EmergencyOrder,
  TokenMarketStats,
  TierBenefits,
  TokenTransferPayload,
  EmergencyListingPayload,
  EmergencyOrderPayload,
  ContributionPayload,
} from '@/types';

export function useTokenAccount() {
  return useQuery({
    queryKey: ['token-account'],
    queryFn: async () => {
      const { data } = await api.get<TokenAccount>('/tokens/account');
      return data;
    },
  });
}

export function useTokenTransactions(page: number = 1) {
  return useQuery({
    queryKey: ['token-transactions', page],
    queryFn: async () => {
      const { data } = await api.get<{
        items: TokenTransaction[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>('/tokens/transactions', { params: { page, page_size: 20 } });
      return data;
    },
  });
}

export function useTransferTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TokenTransferPayload) => {
      const { data } = await api.post<TokenTransaction>('/tokens/transfer', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-account'] });
      queryClient.invalidateQueries({ queryKey: ['token-transactions'] });
    },
  });
}

export function useMarketListings(filters?: { goods_type?: string; zone?: string; page?: number }) {
  return useQuery({
    queryKey: ['market-listings', filters],
    queryFn: async () => {
      const { data } = await api.get<{
        items: EmergencyListing[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>('/tokens/market/listings', { params: filters });
      return data;
    },
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmergencyListingPayload) => {
      const { data } = await api.post<EmergencyListing>('/tokens/market/listings', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings'] });
    },
  });
}

export function useListingDetail(listingId: string) {
  return useQuery({
    queryKey: ['listing-detail', listingId],
    queryFn: async () => {
      const { data } = await api.get<EmergencyListing>(`/tokens/market/listings/${listingId}`);
      return data;
    },
    enabled: !!listingId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmergencyOrderPayload) => {
      const { data } = await api.post<EmergencyOrder>('/tokens/market/order', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings'] });
      queryClient.invalidateQueries({ queryKey: ['token-orders'] });
      queryClient.invalidateQueries({ queryKey: ['token-account'] });
    },
  });
}

export function useMyOrders(page: number = 1) {
  return useQuery({
    queryKey: ['token-orders', page],
    queryFn: async () => {
      const { data } = await api.get<{
        items: EmergencyOrder[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>('/tokens/market/orders', { params: { page, page_size: 20 } });
      return data;
    },
  });
}

export function useFulfillOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post<EmergencyOrder>(`/tokens/market/orders/${orderId}/fulfill`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-orders'] });
      queryClient.invalidateQueries({ queryKey: ['token-account'] });
    },
  });
}

export function useMarketStats() {
  return useQuery({
    queryKey: ['market-stats'],
    queryFn: async () => {
      const { data } = await api.get<TokenMarketStats>('/tokens/market/stats');
      return data;
    },
  });
}

export function useContributeMesh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: ContributionPayload) => {
      const { data } = await api.post<TokenTransaction>('/tokens/contribute/mesh', payload || {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-account'] });
      queryClient.invalidateQueries({ queryKey: ['token-transactions'] });
    },
  });
}

export function useContributeData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: ContributionPayload) => {
      const { data } = await api.post<TokenTransaction>('/tokens/contribute/data', payload || {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-account'] });
      queryClient.invalidateQueries({ queryKey: ['token-transactions'] });
    },
  });
}

export function useTierBenefits() {
  return useQuery({
    queryKey: ['tier-benefits'],
    queryFn: async () => {
      const { data } = await api.get<TierBenefits>('/tokens/tier-benefits');
      return data;
    },
  });
}
