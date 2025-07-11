import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { 
  CarrierShipment, 
  ShipmentStatus, 
  DriverTrackingStats,
  QRScanResult,
  TrackingEvent,
} from '../types/tracking';
import { trackingService } from '../services/trackingService';

interface TrackingContextType {
  // State
  shipments: CarrierShipment[];
  stats: DriverTrackingStats | null;
  loading: boolean;
  refreshing: boolean;
  isOnline: boolean;
  pendingUpdates: number;
  
  // Actions
  loadShipments: () => Promise<void>;
  refreshShipments: () => Promise<void>;
  updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, location?: string, notes?: string) => Promise<void>;
  processQRScan: (qrData: string) => Promise<QRScanResult>;
  getShipmentDetails: (shipmentId: string) => Promise<CarrierShipment>;
  getTrackingEvents: (shipmentId: string) => Promise<TrackingEvent[]>;
  syncOfflineUpdates: () => Promise<void>;
  searchShipments: (query: string) => Promise<CarrierShipment[]>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const useTracking = (): TrackingContextType => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};

interface TrackingProviderProps {
  children: React.ReactNode;
  driverId?: string;
}

export const TrackingProvider: React.FC<TrackingProviderProps> = ({ children, driverId }) => {
  const [shipments, setShipments] = useState<CarrierShipment[]>([]);
  const [stats, setStats] = useState<DriverTrackingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState(0);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected === true;
      
      setIsOnline(isNowOnline);
      
      // Sync offline updates when coming back online
      if (wasOffline && isNowOnline) {
        syncOfflineUpdates();
      }
    });

    return unsubscribe;
  }, [isOnline]);

  // Update pending updates count
  useEffect(() => {
    const updatePendingCount = () => {
      setPendingUpdates(trackingService.getPendingUpdatesCount());
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Load initial data
  useEffect(() => {
    if (driverId) {
      loadShipments();
      loadStats();
    }
  }, [driverId]);

  const loadShipments = useCallback(async (): Promise<void> => {
    if (!driverId) return;

    try {
      setLoading(true);
      const data = await trackingService.getDriverShipments(driverId);
      setShipments(data);
    } catch (error) {
      console.error('Failed to load shipments:', error);
      if (isOnline) {
        Alert.alert('Error', 'Failed to load shipments. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [driverId, isOnline]);

  const loadStats = useCallback(async (): Promise<void> => {
    if (!driverId) return;

    try {
      const data = await trackingService.getDriverStats(driverId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Stats are not critical, so don't show error to user
    }
  }, [driverId]);

  const refreshShipments = useCallback(async (): Promise<void> => {
    try {
      setRefreshing(true);
      await loadShipments();
      await loadStats();
    } finally {
      setRefreshing(false);
    }
  }, [loadShipments, loadStats]);

  const updateShipmentStatus = useCallback(async (
    shipmentId: string,
    status: ShipmentStatus,
    location?: string,
    notes?: string
  ): Promise<void> => {
    try {
      const updatedShipment = await trackingService.updateShipmentStatus(
        shipmentId,
        status,
        location,
        notes
      );

      // Update local state
      setShipments(prev => prev.map(shipment => 
        shipment.id === shipmentId ? updatedShipment : shipment
      ));

      // Refresh stats
      await loadStats();

      if (!isOnline) {
        Alert.alert(
          'Offline Update',
          'Status updated locally. Changes will sync when connection is restored.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update shipment status:', error);
      Alert.alert('Error', 'Failed to update shipment status. Please try again.');
    }
  }, [isOnline, loadStats]);

  const processQRScan = useCallback(async (qrData: string): Promise<QRScanResult> => {
    try {
      const result = await trackingService.processQRScan(qrData);
      
      if (result.success && result.shipment) {
        // Update shipment in local state if it exists
        setShipments(prev => prev.map(shipment => 
          shipment.id === result.shipment!.id ? result.shipment! : shipment
        ));
      }
      
      return result;
    } catch (error) {
      console.error('QR scan processing failed:', error);
      return {
        success: false,
        data: qrData,
        message: 'Failed to process QR code',
      };
    }
  }, []);

  const getShipmentDetails = useCallback(async (shipmentId: string): Promise<CarrierShipment> => {
    try {
      const shipment = await trackingService.getShipmentDetails(shipmentId);
      
      // Update in local state
      setShipments(prev => prev.map(s => s.id === shipmentId ? shipment : s));
      
      return shipment;
    } catch (error) {
      console.error('Failed to get shipment details:', error);
      throw error;
    }
  }, []);

  const getTrackingEvents = useCallback(async (shipmentId: string): Promise<TrackingEvent[]> => {
    try {
      return await trackingService.getTrackingEvents(shipmentId);
    } catch (error) {
      console.error('Failed to get tracking events:', error);
      return [];
    }
  }, []);

  const syncOfflineUpdates = useCallback(async (): Promise<void> => {
    if (!isOnline) return;

    try {
      await trackingService.syncOfflineUpdates();
      setPendingUpdates(0);
      
      // Refresh data after sync
      await refreshShipments();
      
      if (pendingUpdates > 0) {
        Alert.alert(
          'Sync Complete',
          `${pendingUpdates} offline updates have been synced.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to sync offline updates:', error);
      Alert.alert('Sync Error', 'Some offline updates could not be synced. They will retry automatically.');
    }
  }, [isOnline, pendingUpdates, refreshShipments]);

  const searchShipments = useCallback(async (query: string): Promise<CarrierShipment[]> => {
    try {
      return await trackingService.searchShipments(query);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }, []);

  const contextValue: TrackingContextType = {
    // State
    shipments,
    stats,
    loading,
    refreshing,
    isOnline,
    pendingUpdates,
    
    // Actions
    loadShipments,
    refreshShipments,
    updateShipmentStatus,
    processQRScan,
    getShipmentDetails,
    getTrackingEvents,
    syncOfflineUpdates,
    searchShipments,
  };

  return (
    <TrackingContext.Provider value={contextValue}>
      {children}
    </TrackingContext.Provider>
  );
};

export default TrackingProvider;