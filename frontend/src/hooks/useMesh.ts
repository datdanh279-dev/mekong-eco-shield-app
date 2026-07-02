'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';

interface MeshStats {
  active_nodes: number;
  total_nodes: number;
  messages_relayed: number;
  messages_logged: number;
  coverage_area_km2: number;
  avg_hops: number;
  protocol_version: string;
}

interface NetworkMap {
  nodes: Array<{
    id: string;
    type: string;
    active: boolean;
    location: { lat: number; lng: number };
    last_seen: string;
  }>;
  edges: Array<{ source: string; target: string }>;
  message_count: number;
}

interface RegisterNodePayload {
  device_id: string;
  public_key: string;
  location?: { lat: number; lng: number };
}

interface RelayMessagePayload {
  encoded_frame: string;
  from_device: string;
}

interface BroadcastAlertPayload {
  alert_type: number;
  severity: number;
  latitude: number;
  longitude: number;
  radius: number;
  source_device: string;
}

export function useMeshStats() {
  return useQuery({
    queryKey: ['mesh-stats'],
    queryFn: async () => {
      const { data } = await api.get<MeshStats>('/mesh/stats');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useNetworkMap() {
  return useQuery({
    queryKey: ['mesh-network'],
    queryFn: async () => {
      const { data } = await api.get<NetworkMap>('/mesh/network');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useActiveNodes() {
  return useQuery({
    queryKey: ['mesh-nodes'],
    queryFn: async () => {
      const { data } = await api.get('/mesh/nodes');
      return data as { nodes: Array<Record<string, unknown>>; count: number };
    },
    refetchInterval: 30000,
  });
}

export function useRegisterNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterNodePayload) => {
      const { data } = await api.post('/mesh/register', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesh-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mesh-nodes'] });
    },
  });
}

export function useRelayMessage() {
  return useMutation({
    mutationFn: async (payload: RelayMessagePayload) => {
      const { data } = await api.post('/mesh/relay', payload);
      return data as { success: boolean; error?: string; parsed?: Record<string, unknown> };
    },
  });
}

export function useBroadcastAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BroadcastAlertPayload) => {
      const { data } = await api.post('/mesh/broadcast', payload);
      return data as { success: boolean; frame_hex: string; parsed?: Record<string, unknown> };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesh-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mesh-network'] });
    },
  });
}
