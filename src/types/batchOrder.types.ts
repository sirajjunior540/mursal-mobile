/**
 * Batch Order Types
 * Type definitions for batch order handling and route optimization
 */

export type StopType = 'pickup' | 'delivery';
export type StopStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type BatchStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/**
 * A single stop in an optimized route
 */
export interface OptimizedStop {
  /** Sequence number in the optimized route (1-indexed) */
  sequence: number;

  /** ID of the order associated with this stop */
  orderId: string;

  /** Type of stop: pickup or delivery */
  stopType: StopType;

  /** Full address of the stop */
  address: string;

  /** Latitude coordinate */
  lat: number;

  /** Longitude coordinate */
  lng: number;

  /** Contact person name at this stop */
  contactName: string;

  /** Contact phone number */
  contactPhone: string;

  /** Distance from previous stop in kilometers */
  distanceFromPreviousKm: number;

  /** Estimated time to reach this stop in minutes */
  etaMinutes: number;

  /** Special instructions for this stop */
  instructions?: string;

  /** Current status of this stop */
  status?: StopStatus;

  /** Priority level (0=normal, 1=high, 2=urgent) */
  priority?: number;
}

/**
 * Complete optimized route for a batch
 */
export interface OptimizedRoute {
  /** Unique identifier for the batch */
  batchId: string;

  /** Driver's current location when route was optimized */
  driverLocation: {
    lat: number;
    lng: number;
  };

  /** Ordered list of stops in the optimized sequence */
  stops: OptimizedStop[];

  /** Total distance of the entire route in kilometers */
  totalDistanceKm: number;

  /** Total estimated duration in minutes */
  totalDurationMinutes: number;

  /** Timestamp when route was optimized */
  optimizedAt: string;

  /** Optional polyline for map display */
  polyline?: string;
}

/**
 * Request payload for route optimization
 */
export interface RouteOptimizationRequest {
  /** Starting location (driver's current position) */
  origin: {
    lat: number;
    lng: number;
  };

  /** List of stops to be optimized */
  stops: Array<{
    orderId: string;
    stopType: StopType;
    address: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
    instructions?: string;
    priority?: number;
    status?: StopStatus;
  }>;

  /** Optional constraints for optimization */
  constraints?: {
    /** Maximum route distance in kilometers */
    maxDistanceKm?: number;

    /** Maximum route duration in minutes */
    maxDurationMinutes?: number;

    /** Time window constraints per stop */
    timeWindows?: Array<{
      stopId: string;
      earliestTime: string;
      latestTime: string;
    }>;
  };
}

/**
 * Batch order information
 */
export interface BatchOrderInfo {
  /** Unique batch identifier */
  id: string;

  /** Human-readable batch number */
  batchNumber: string;

  /** Batch name/description */
  name: string;

  /** Current batch status */
  status: BatchStatus;

  /** Customer/merchant ID */
  customerId?: string;

  /** Number of orders in this batch */
  totalOrders: number;

  /** Total number of items across all orders */
  totalItems: number;

  /** Pickup location details */
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupInstructions?: string;

  /** Scheduled pickup time */
  scheduledPickupDate?: string;
  scheduledPickupTime?: string;

  /** Individual orders in this batch */
  orders: BatchOrder[];

  /** Total earnings for completing this batch */
  totalEarnings?: number;

  /** Whether smart routing is enabled */
  enableSmartRouting?: boolean;

  /** Additional notes */
  batchNotes?: string;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual order within a batch
 */
export interface BatchOrder {
  /** Order ID */
  id: string;

  /** Order number */
  orderNumber: string;

  /** Customer information */
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;

  /** Delivery location */
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  deliveryInstructions?: string;

  /** Order details */
  items: OrderItem[];
  subtotal: number;
  deliveryFee?: number;
  tax?: number;
  total: number;

  /** Payment information */
  paymentMethod?: string;
  cashOnDelivery?: boolean;
  codAmount?: number;

  /** Delivery requirements */
  requiresSignature?: boolean;
  requiresIdVerification?: boolean;
  specialHandling?: string | SpecialHandlingObject;

  /** Priority and scheduling */
  priority?: 'normal' | 'high' | 'urgent';
  scheduledDate?: string;
  scheduledTime?: string;

  /** Status */
  status: string;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

/**
 * Order item details
 */
export interface OrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  weight?: number;
  productId?: string;
}

/**
 * Special handling requirements
 */
export interface SpecialHandlingObject {
  fragile?: boolean;
  temperatureControlled?: boolean;
  hazardous?: boolean;
  liquid?: boolean;
  perishable?: boolean;
}

/**
 * Stop completion payload
 */
export interface StopCompletionData {
  /** Order ID being completed */
  orderId: string;

  /** New status */
  status: 'picked_up' | 'delivered' | 'failed';

  /** Completion timestamp */
  timestamp: string;

  /** Location where stop was completed */
  latitude: number;
  longitude: number;

  /** Optional photo proof */
  photoId?: string;

  /** Optional signature */
  signatureId?: string;

  /** COD amount collected (if applicable) */
  codAmountCollected?: number;

  /** Notes or reason for failure */
  notes?: string;

  /** Failed delivery reason */
  failureReason?: string;
}

/**
 * Route progress tracking
 */
export interface RouteProgress {
  /** Batch ID */
  batchId: string;

  /** Total number of stops */
  totalStops: number;

  /** Number of completed stops */
  completedStops: number;

  /** Current stop index (0-based) */
  currentStopIndex: number;

  /** List of completed stop IDs */
  completedStopIds: string[];

  /** Remaining distance in kilometers */
  remainingDistanceKm: number;

  /** Remaining time in minutes */
  remainingTimeMinutes: number;

  /** Estimated completion time */
  estimatedCompletionTime: string;

  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Map point for visualization
 */
export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type: 'current' | 'pickup' | 'delivery';
  isCompleted?: boolean;
  isCurrent?: boolean;
  sequence?: number;
}

/**
 * Route optimization result
 */
export interface RouteOptimizationResult {
  success: boolean;
  route?: OptimizedRoute;
  error?: string;
  message?: string;
}

/**
 * Batch acceptance response
 */
export interface BatchAcceptanceResponse {
  success: boolean;
  batchId: string;
  optimizedRoute?: OptimizedRoute;
  message?: string;
  error?: string;
}

/**
 * Navigation state for batch orders
 */
export interface BatchNavigationState {
  batchId: string;
  currentStopId: string | null;
  isNavigating: boolean;
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
}
