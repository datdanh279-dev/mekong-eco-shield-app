export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'farmer' | 'investor' | 'admin';
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Farm {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  location: GeoJSON.Point;
  boundary: GeoJSON.Polygon;
  area_ha: number;
  crop_type: CropType;
  soil_type: SoilType;
  water_source: WaterSource;
  address: string;
  province: string;
  district: string;
  status: FarmStatus;
  created_at: string;
  updated_at: string;
}

export type CropType = 'rice' | 'fruit' | 'vegetable' | 'aquaculture' | 'mixed';
export type SoilType = 'clay' | 'sandy' | 'loamy' | 'peat' | 'saline';
export type WaterSource = 'river' | 'canal' | 'groundwater' | 'rainfed' | 'mixed';
export type FarmStatus = 'active' | 'inactive' | 'pending';

export interface SensorStation {
  id: string;
  farm_id: string;
  name: string;
  location: GeoJSON.Point;
  type: SensorType;
  status: SensorStatus;
  battery_level: number;
  last_reading?: SensorReading;
  installed_at: string;
}

export type SensorType = 'water_level' | 'salinity' | 'temperature' | 'humidity' | 'soil_moisture' | 'rainfall' | 'ph' | 'turbidity';
export type SensorStatus = 'online' | 'offline' | 'error' | 'maintenance';

export interface SensorReading {
  id: string;
  sensor_id: string;
  value: number;
  unit: string;
  recorded_at: string;
  sensor_type: SensorType;
}

export interface Alert {
  id: string;
  farm_id: string;
  sensor_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  is_read: boolean;
  created_at: string;
  resolved_at?: string;
}

export type AlertType = 'flood' | 'salinity' | 'drought' | 'water_quality' | 'soil_degradation' | 'equipment_failure' | 'weather';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CreditScore {
  id: string;
  farm_id: string;
  score: number;
  factors: CreditFactor[];
  tier: CreditTier;
  valid_until: string;
  calculated_at: string;
}

export type CreditTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';

export interface CreditFactor {
  name: string;
  label: string;
  score: number;
  weight: number;
  description: string;
}

export interface CreditApplication {
  id: string;
  farm_id: string;
  amount: number;
  term_months: number;
  purpose: string;
  status: ApplicationStatus;
  created_at: string;
}

export type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected';

export interface Prediction {
  id: string;
  type: 'flood' | 'salinity' | 'rainfall';
  region: string;
  probability: number;
  severity: AlertSeverity;
  expected_at: string;
  issued_at: string;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface DashboardStats {
  total_farms: number;
  active_sensors: number;
  active_alerts: number;
  average_credit_score: number;
  today_readings: number;
  farms_at_risk: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'farmer' | 'investor';
  phone?: string;
}

export interface FarmCreatePayload {
  name: string;
  description?: string;
  area_ha: number;
  crop_type: CropType;
  soil_type: SoilType;
  water_source: WaterSource;
  address: string;
  province: string;
  district: string;
  boundary: GeoJSON.Polygon;
}

export interface SensorFilters {
  farm_id?: string;
  type?: SensorType;
  status?: SensorStatus;
  page?: number;
  per_page?: number;
}

export interface AlertFilters {
  farm_id?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  is_read?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface CreditApplicationPayload {
  farm_id: string;
  amount: number;
  term_months: number;
  purpose: string;
}
