'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import type { SensorStation, SensorReading, SensorFilters, PaginatedResponse } from '@/types';

export function useSensors(filters?: SensorFilters) {
  return useQuery({
    queryKey: ['sensors', filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SensorStation>>('/sensors', { params: filters });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useSensor(id: string) {
  return useQuery({
    queryKey: ['sensor', id],
    queryFn: async () => {
      const { data } = await api.get<SensorStation>(`/sensors/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useSensorReadings(
  sensorId: string,
  params?: { start_date?: string; end_date?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['sensor-readings', sensorId, params],
    queryFn: async () => {
      const { data } = await api.get<SensorReading[]>(`/sensors/${sensorId}/readings`, { params });
      return data;
    },
    enabled: !!sensorId,
    refetchInterval: 60000,
  });
}

export function useFarmSensors(farmId: string) {
  return useQuery({
    queryKey: ['farm-sensors', farmId],
    queryFn: async () => {
      const { data } = await api.get<SensorStation[]>(`/farms/${farmId}/sensors`);
      return data;
    },
    enabled: !!farmId,
    refetchInterval: 30000,
  });
}

export function useLatestReadings(farmId?: string) {
  return useQuery({
    queryKey: ['latest-readings', farmId],
    queryFn: async () => {
      const params = farmId ? { farm_id: farmId } : {};
      const { data } = await api.get<Record<string, SensorReading>>('/sensors/latest', { params });
      return data;
    },
    refetchInterval: 15000,
  });
}
