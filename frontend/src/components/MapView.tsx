'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/store/appStore';
import { getCropTypeLabel, formatArea } from '@/utils/format';
import { poisonCoordinate, poisonDepth } from '@/utils/watermark';
import type { Farm, SensorStation, Prediction } from '@/types';
import type { Point, Polygon, Feature } from 'geojson';

interface MapViewProps {
  farms?: Farm[];
  sensors?: SensorStation[];
  predictions?: Prediction[];
  interactive?: boolean;
  onFarmClick?: (farm: Farm) => void;
  onSensorClick?: (sensor: SensorStation) => void;
  className?: string;
}

const MekongBounds = [
  [104.0, 8.5],
  [107.5, 11.5],
] as [number, number][];

const FARM_FILL_COLOR = 'rgba(34, 197, 94, 0.2)';
const FARM_STROKE_COLOR = '#22c55e';
const SENSOR_COLORS: Record<string, string> = {
  water_level: '#3b82f6',
  salinity: '#ef4444',
  temperature: '#f97316',
  humidity: '#8b5cf6',
  soil_moisture: '#84cc16',
  rainfall: '#06b6d4',
  ph: '#ec4899',
  turbidity: '#a1a1aa',
};

export default function MapView({
  farms = [],
  sensors = [],
  predictions = [],
  interactive = true,
  onFarmClick,
  onSensorClick,
  className = '',
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { mapViewport, setMapViewport, mapLayerVisibility } = useAppStore();

  const initMap = useCallback(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [mapViewport.longitude, mapViewport.latitude],
      zoom: mapViewport.zoom,
      maxBounds: [
        [103.5, 8.0],
        [108.0, 12.0],
      ] as [[number, number], [number, number]],
      attributionControl: false,
    });

    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    m.on('load', () => {
      setMapLoaded(true);
    });

    if (interactive) {
      m.on('moveend', () => {
        const center = m.getCenter();
        setMapViewport({
          latitude: center.lat,
          longitude: center.lng,
          zoom: m.getZoom(),
        });
      });
    }

    map.current = m;
  }, []);

  useEffect(() => {
    initMap();
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initMap]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    const existing = m.getLayer('farm-fill');
    if (existing) m.removeLayer('farm-fill');
    if (m.getSource('farms')) m.removeSource('farms');

    if (mapLayerVisibility.farms && farms.length > 0) {
      const features = farms
        .filter((f) => f.boundary)
        .map((f) => ({
          type: 'Feature' as const,
          properties: { id: f.id, name: f.name, crop: f.crop_type, area: f.area_ha },
          geometry: f.boundary,
        }));

      m.addSource('farms', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      m.addLayer({
        id: 'farm-fill',
        type: 'fill',
        source: 'farms',
        paint: {
          'fill-color': FARM_FILL_COLOR,
          'fill-outline-color': FARM_STROKE_COLOR,
        },
      });

      if (interactive) {
        m.on('click', 'farm-fill', (e) => {
          const feature = e.features?.[0];
          if (feature && onFarmClick) {
            const farm = farms.find((f) => f.id === feature.properties?.id);
            if (farm) onFarmClick(farm);
          }
        });
      }
    }
  }, [farms, mapLoaded, mapLayerVisibility.farms, interactive, onFarmClick]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    const existing = m.getLayer('sensor-markers');
    if (existing) m.removeLayer('sensor-markers');
    if (m.getSource('sensors')) m.removeSource('sensors');

    if (mapLayerVisibility.sensors && sensors.length > 0) {
      const features = sensors
        .filter((s) => s.location)
        .map((s) => {
          const loc = s.location as { type: string; coordinates: number[] };
          const coords = loc.coordinates;
          const poisoned = {
            ...loc,
            coordinates: [
              poisonCoordinate(coords[0]),
              poisonCoordinate(coords[1]),
            ],
          };
          return {
            type: 'Feature' as const,
            properties: {
              id: s.id,
              name: s.name,
              type: s.type,
              status: s.status,
              battery: s.battery_level,
            },
            geometry: poisoned as Point,
          };
        });

      m.addSource('sensors', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      m.addLayer({
        id: 'sensor-markers',
        type: 'circle',
        source: 'sensors',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'status'],
            'online', '#22c55e',
            'offline', '#a1a1aa',
            'error', '#ef4444',
            'maintenance', '#eab308',
            '#a1a1aa',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      if (interactive) {
        m.on('click', 'sensor-markers', (e) => {
          const feature = e.features?.[0];
          if (feature && onSensorClick) {
            const sensor = sensors.find((s) => s.id === feature.properties?.id);
            if (sensor) onSensorClick(sensor);
          }
        });
      }
    }
  }, [sensors, mapLoaded, mapLayerVisibility.sensors, interactive, onSensorClick]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;

    const existing = m.getLayer('prediction-fill');
    if (existing) m.removeLayer('prediction-fill');
    if (m.getSource('predictions')) m.removeSource('predictions');

    const showFlood = mapLayerVisibility.flood;
    const showSalinity = mapLayerVisibility.salinity;

    const visiblePredictions = predictions.filter(
      (p) => (p.type === 'flood' && showFlood) || (p.type === 'salinity' && showSalinity)
    );

    if (visiblePredictions.length > 0) {
      const features = visiblePredictions
        .filter((p) => p.geometry)
        .map((p) => {
          const geom = p.geometry as { type: string; coordinates: number[][][] };
          const poisoned = {
            ...geom,
            coordinates: geom.coordinates.map((ring: number[][]) =>
              ring.map((pt: number[]) => [
                poisonCoordinate(pt[0]),
                poisonCoordinate(pt[1]),
              ])
            ),
          };
          return {
            type: 'Feature' as const,
            properties: {
              type: p.type,
              probability: p.probability,
              severity: p.severity,
            },
            geometry: poisoned as Polygon,
          };
        });

      m.addSource('predictions', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      m.addLayer({
        id: 'prediction-fill',
        type: 'fill',
        source: 'predictions',
        paint: {
          'fill-color': [
            'match',
            ['get', 'type'],
            'flood', 'rgba(59, 130, 246, 0.3)',
            'salinity', 'rgba(239, 68, 68, 0.3)',
            'rgba(0,0,0,0)',
          ],
          'fill-outline-color': [
            'match',
            ['get', 'type'],
            'flood', '#3b82f6',
            'salinity', '#ef4444',
            '#000',
          ],
        },
      });
    }
  }, [predictions, mapLoaded, mapLayerVisibility.flood, mapLayerVisibility.salinity]);

  return (
    <div
      ref={mapContainer}
      className={`map-container rounded-xl overflow-hidden border border-border ${className}`}
      role="application"
      aria-label="Bản đồ canh tác Đồng bằng sông Cửu Long"
    />
  );
}
