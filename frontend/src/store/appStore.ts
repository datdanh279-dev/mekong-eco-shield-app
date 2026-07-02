import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  activeFarmId: string | null;
  mapViewport: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  mapLayerVisibility: {
    farms: boolean;
    sensors: boolean;
    flood: boolean;
    salinity: boolean;
    satellite: boolean;
  };
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setActiveFarmId: (id: string | null) => void;
  setMapViewport: (viewport: { latitude: number; longitude: number; zoom: number }) => void;
  toggleLayer: (layer: keyof AppStore['mapLayerVisibility']) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      activeFarmId: null,
      mapViewport: {
        latitude: 10.0452,
        longitude: 105.7469,
        zoom: 8,
      },
      mapLayerVisibility: {
        farms: true,
        sensors: true,
        flood: true,
        salinity: true,
        satellite: false,
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setActiveFarmId: (id) => set({ activeFarmId: id }),
      setMapViewport: (viewport) => set({ mapViewport: viewport }),
      toggleLayer: (layer) =>
        set((state) => ({
          mapLayerVisibility: {
            ...state.mapLayerVisibility,
            [layer]: !state.mapLayerVisibility[layer],
          },
        })),
    }),
    {
      name: 'mekong-app-store',
      partialize: (state) => ({
        theme: state.theme,
        mapViewport: state.mapViewport,
        mapLayerVisibility: state.mapLayerVisibility,
      }),
    }
  )
);
