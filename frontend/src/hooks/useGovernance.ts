'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import type {
  GovernanceStats,
  Proposal,
  Proposal as ProposalType,
  Vote,
  Device,
} from '@/types';

interface CreateProposalPayload {
  title: string;
  description: string;
  proposal_type: string;
  target_param?: Record<string, unknown>;
  voting_days: number;
}

interface CastVotePayload {
  proposal_id: string;
  vote: 'yes' | 'no' | 'abstain';
  device_fingerprint: string;
}

interface RegisterDevicePayload {
  device_fingerprint: string;
}

export function useGovernanceStats() {
  return useQuery<GovernanceStats>({
    queryKey: ['governance', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<GovernanceStats>('/v1/governance/stats');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useProposals(status?: string) {
  return useQuery<ProposalType[]>({
    queryKey: ['governance', 'proposals', status],
    queryFn: async () => {
      const params = status && status !== 'all' ? { status } : {};
      const { data } = await api.get<ProposalType[]>('/v1/governance/proposals', { params });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useProposal(id: string) {
  return useQuery<ProposalType>({
    queryKey: ['governance', 'proposals', id],
    queryFn: async () => {
      const { data } = await api.get<ProposalType>(`/v1/governance/proposals/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProposalPayload) => {
      const { data } = await api.post<ProposalType>('/v1/governance/proposals', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'stats'] });
    },
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CastVotePayload) => {
      const { data } = await api.post<Vote>(
        `/v1/governance/proposals/${payload.proposal_id}/vote`,
        { vote: payload.vote, device_fingerprint: payload.device_fingerprint }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'stats'] });
    },
  });
}

export function useRegisterDevice() {
  return useMutation({
    mutationFn: async (payload: RegisterDevicePayload) => {
      const { data } = await api.post<Device>('/v1/governance/devices/register', payload);
      return data;
    },
  });
}

export function useExecuteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { data } = await api.post(`/v1/governance/proposals/${proposalId}/execute`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'stats'] });
    },
  });
}
