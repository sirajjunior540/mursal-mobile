import { Order } from './index';

// Route Navigation Types
export interface RoutePoint {
  id: string;
  order: Order;
  latitude: number;
  longitude: number;
  address: string;
  type: 'pickup' | 'delivery';
  sequenceNumber: number;
  estimatedArrival?: string;
  distanceFromPrevious?: number;
  timeFromPrevious?: number;
  batchOrders?: Order[];
}

export interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  estimatedCompletion: string;
}

export interface RouteStats {
  totalStops: number;
  totalDistance: number;
  totalTime: number;
  completedStops: number;
  remainingStops: number;
  progressPercentage: number;
}

export interface ConsolidatedBatch {
  id: string;
  orders: Order[];
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  isConsolidated: boolean; // Same pickup AND delivery location
  isDistribution: boolean; // Same pickup, different delivery locations
}

export interface RouteMapProps {
  route: OptimizedRoute;
  currentStopIndex: number;
  showMap: boolean;
  mapProvider: 'google' | 'mapbox' | 'openroute';
  onMarkerPress?: (point: RoutePoint) => void;
}

export interface CurrentStopCardProps {
  routePoint: RoutePoint;
  onNavigate: (order: Order) => void;
  onStatusUpdate: (orderId: string, status: string) => void;
  onCallCustomer: (phone: string) => void;
  onViewDetails: (order: Order) => void;
  isLoading?: boolean;
}

export interface RouteProgressProps {
  route: OptimizedRoute;
  currentStopIndex: number;
}

export interface UpcomingStopsProps {
  stops: RoutePoint[];
  onStopPress: (stop: RoutePoint) => void;
  onNavigateToStop: (stop: RoutePoint) => void;
}

export interface RouteHeaderProps {
  route: OptimizedRoute | null;
  driver?: {
    firstName: string;
    lastName: string;
  };
  onRefresh: () => void;
  isRefreshing: boolean;
}

export interface StatusUpdateOption {
  status: string;
  label: string;
  color: string;
  icon: string;
}

export interface MapConfig {
  provider: 'google' | 'mapbox' | 'openroute' | null;
  isActive: boolean;
  apiKey?: string;
}