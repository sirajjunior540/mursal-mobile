import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {
  CarrierShipment,
  ShipmentStatus,
  TrackingEvent,
  DriverTrackingStats,
  QRScanResult,
  ShipmentUpdateRequest,
  ApiResponse,
  PaginatedResponse,
} from '../types/tracking';
import { ENV } from '../config/environment';

const API_BASE_URL = ENV.API_BASE_URL;
const OFFLINE_STORAGE_KEY = 'tracking_offline_updates';
const CACHE_KEY_PREFIX = 'tracking_cache_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface OfflineUpdate {
  id: string;
  type: 'status_update' | 'manual_entry' | 'qr_scan';
  data: ShipmentUpdateRequest | Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

class TrackingService {
  private token: string | null = null;
  private offlineUpdates: OfflineUpdate[] = [];

  constructor() {
    this.loadOfflineUpdates();
    this.setupNetworkListener();
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  private async setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncOfflineUpdates();
      }
    });
  }

  private async loadOfflineUpdates() {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      if (stored) {
        this.offlineUpdates = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline updates:', error);
    }
  }

  private async saveOfflineUpdates() {
    try {
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(this.offlineUpdates));
    } catch (error) {
      console.error('Failed to save offline updates:', error);
    }
  }

  private async addOfflineUpdate(update: Omit<OfflineUpdate, 'id' | 'timestamp' | 'retryCount'>) {
    const offlineUpdate: OfflineUpdate = {
      ...update,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.offlineUpdates.push(offlineUpdate);
    await this.saveOfflineUpdates();
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache = false,
    cacheKey?: string
  ): Promise<T> {
    const isOnline = (await NetInfo.fetch()).isConnected;

    // Check cache first if offline
    if (!isOnline && useCache && cacheKey) {
      const cached = await this.getCachedData<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    if (!isOnline) {
      throw new Error('No internet connection');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful responses
    if (useCache && cacheKey && response.status === 200) {
      await this.setCachedData(cacheKey, data);
    }

    return data;
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      if (cached) {
        const parsedCache: CachedData<T> = JSON.parse(cached);
        if (Date.now() < parsedCache.expiresAt) {
          return parsedCache.data;
        }
        // Remove expired cache
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  private async setCachedData<T>(key: string, data: T) {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY_MS,
      };
      await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  async getDriverShipments(driverId: string): Promise<CarrierShipment[]> {
    try {
      const response = await this.makeRequest<PaginatedResponse<CarrierShipment>>(
        `/api/tracking/driver/${driverId}/shipments/`,
        { method: 'GET' },
        true,
        `driver_shipments_${driverId}`
      );
      return response.results;
    } catch (error) {
      console.error('Failed to get driver shipments:', error);
      
      // Return cached data on error
      const cached = await this.getCachedData<PaginatedResponse<CarrierShipment>>(`driver_shipments_${driverId}`);
      return cached?.results || [];
    }
  }

  async getShipmentDetails(shipmentId: string): Promise<CarrierShipment> {
    const response = await this.makeRequest<ApiResponse<CarrierShipment>>(
      `/api/tracking/shipments/${shipmentId}/`,
      { method: 'GET' },
      true,
      `shipment_${shipmentId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get shipment details');
    }

    return response.data;
  }

  async getTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
    try {
      const response = await this.makeRequest<PaginatedResponse<TrackingEvent>>(
        `/api/tracking/shipments/${shipmentId}/events/`,
        { method: 'GET' },
        true,
        `events_${shipmentId}`
      );
      return response.results;
    } catch (error) {
      console.error('Failed to get tracking events:', error);
      
      const cached = await this.getCachedData<PaginatedResponse<TrackingEvent>>(`events_${shipmentId}`);
      return cached?.results || [];
    }
  }

  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    location?: string,
    notes?: string
  ): Promise<CarrierShipment> {
    const updateData: ShipmentUpdateRequest = {
      shipment_id: shipmentId,
      status,
      location,
      notes,
      timestamp: new Date().toISOString(),
    };

    const isOnline = (await NetInfo.fetch()).isConnected;

    if (!isOnline) {
      // Store for offline sync
      await this.addOfflineUpdate({
        type: 'status_update',
        data: updateData,
      });

      // Return optimistic update
      const cachedShipment = await this.getCachedData<CarrierShipment>(`shipment_${shipmentId}`);
      if (cachedShipment) {
        const updatedShipment = {
          ...cachedShipment,
          current_status: status,
          current_location: location || cachedShipment.current_location,
          last_tracking_update: updateData.timestamp,
        };
        
        // Update cache with optimistic data
        await this.setCachedData(`shipment_${shipmentId}`, updatedShipment);
        return updatedShipment;
      }
      
      throw new Error('No cached data available for offline update');
    }

    try {
      const response = await this.makeRequest<ApiResponse<CarrierShipment>>(
        `/api/tracking/shipments/${shipmentId}/update-status/`,
        {
          method: 'POST',
          body: JSON.stringify(updateData),
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update shipment status');
      }

      // Update cache
      await this.setCachedData(`shipment_${shipmentId}`, response.data);

      return response.data;
    } catch (error) {
      console.error('Status update failed:', error);
      
      // Store for offline sync on failure
      await this.addOfflineUpdate({
        type: 'status_update',
        data: updateData,
      });
      
      throw error;
    }
  }

  async processQRScan(qrData: string): Promise<QRScanResult> {
    try {
      const response = await this.makeRequest<ApiResponse<QRScanResult>>(
        '/api/tracking/process-qr/',
        {
          method: 'POST',
          body: JSON.stringify({ qr_data: qrData }),
        }
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          data: qrData,
          message: response.error || 'Failed to process QR code',
        };
      }

      return response.data;
    } catch (error) {
      console.error('QR scan processing failed:', error);
      
      // Store for offline sync
      await this.addOfflineUpdate({
        type: 'qr_scan',
        data: { qr_data: qrData },
      });

      return {
        success: false,
        data: qrData,
        message: 'Stored for offline processing',
      };
    }
  }

  async getDriverStats(driverId: string): Promise<DriverTrackingStats> {
    try {
      const response = await this.makeRequest<ApiResponse<DriverTrackingStats>>(
        `/api/tracking/driver/${driverId}/stats/`,
        { method: 'GET' },
        true,
        `driver_stats_${driverId}`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get driver stats');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get driver stats:', error);
      
      // Return cached stats or default
      const cached = await this.getCachedData<DriverTrackingStats>(`driver_stats_${driverId}`);
      return cached || {
        total_shipments: 0,
        completed_deliveries: 0,
        pending_pickups: 0,
        in_transit: 0,
        completion_rate: 0,
        on_time_rate: 0,
        avg_delivery_time: 0,
        distance_traveled: 0,
      };
    }
  }

  async searchShipments(query: string): Promise<CarrierShipment[]> {
    try {
      const response = await this.makeRequest<PaginatedResponse<CarrierShipment>>(
        `/api/tracking/shipments/search/?q=${encodeURIComponent(query)}`,
        { method: 'GET' }
      );
      return response.results;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  async syncOfflineUpdates(): Promise<void> {
    if (this.offlineUpdates.length === 0) {
      return;
    }

    const isOnline = (await NetInfo.fetch()).isConnected;
    if (!isOnline) {
      return;
    }

    const updates = [...this.offlineUpdates];
    
    for (const update of updates) {
      try {
        let endpoint = '';
        const method = 'POST';
        
        switch (update.type) {
          case 'status_update':
            endpoint = `/api/tracking/shipments/${update.data.shipment_id}/update-status/`;
            break;
          case 'qr_scan':
            endpoint = '/api/tracking/process-qr/';
            break;
          case 'manual_entry':
            endpoint = '/api/tracking/manual-entry/';
            break;
          default:
            continue;
        }

        await this.makeRequest(endpoint, {
          method,
          body: JSON.stringify(update.data),
        });

        // Remove successful update
        this.offlineUpdates = this.offlineUpdates.filter(u => u.id !== update.id);
      } catch (error) {
        console.error(`Failed to sync update ${update.id}:`, error);
        
        // Increment retry count
        update.retryCount++;
        
        // Remove updates that have failed too many times
        if (update.retryCount >= 3) {
          this.offlineUpdates = this.offlineUpdates.filter(u => u.id !== update.id);
        }
      }
    }

    await this.saveOfflineUpdates();
  }

  getPendingUpdatesCount(): number {
    return this.offlineUpdates.length;
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async clearOfflineUpdates(): Promise<void> {
    this.offlineUpdates = [];
    await this.saveOfflineUpdates();
  }
}

export const trackingService = new TrackingService();
export default trackingService;