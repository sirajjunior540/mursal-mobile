/**
 * Custom hook for batch order management
 * Follows React best practices with optimized performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BatchOrderInfo, 
  BatchStatus, 
  BatchAcceptResponse 
} from '../shared/types/order.types';
import { batchOrderService } from '../services/batchOrderService';
import { soundService } from '../services/soundService';
import { useAuth } from '../contexts/AuthContext';

interface UseBatchOrdersOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onNewBatch?: (batch: BatchOrderInfo) => void;
  onBatchAccepted?: (batchId: string) => void;
  onError?: (error: string) => void;
}

interface UseBatchOrdersReturn {
  // State
  availableBatches: BatchOrderInfo[];
  driverBatches: BatchOrderInfo[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshAvailableBatches: () => Promise<void>;
  refreshDriverBatches: () => Promise<void>;
  getBatchDetails: (batchId: string) => Promise<BatchOrderInfo | null>;
  acceptBatch: (batchId: string) => Promise<boolean>;
  declineBatch: (batchId: string, reason?: string) => Promise<boolean>;
  updateBatchStatus: (batchId: string, status: BatchStatus) => Promise<boolean>;
  
  // Computed
  totalAvailableBatches: number;
  totalDriverBatches: number;
  canAcceptMoreBatches: boolean;
}

export const useBatchOrders = (options: UseBatchOrdersOptions = {}): UseBatchOrdersReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 15000, // 15 seconds
    onNewBatch,
    onBatchAccepted,
    onError
  } = options;

  // State
  const [availableBatches, setAvailableBatches] = useState<BatchOrderInfo[]>([]);
  const [driverBatches, setDriverBatches] = useState<BatchOrderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent stale closures
  const availableBatchesRef = useRef<BatchOrderInfo[]>([]);
  const driverBatchesRef = useRef<BatchOrderInfo[]>([]);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auth context
  const { isLoggedIn } = useAuth();

  // Update refs when state changes
  useEffect(() => {
    availableBatchesRef.current = availableBatches;
  }, [availableBatches]);

  useEffect(() => {
    driverBatchesRef.current = driverBatches;
  }, [driverBatches]);

  // Refresh available batches
  const refreshAvailableBatches = useCallback(async (): Promise<void> => {
    if (!isLoggedIn) {
      console.log('🚫 Cannot refresh available batches: user not logged in');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Refreshing available batch orders...');
      const response = await batchOrderService.getAvailableBatchOrders();

      if (response.success && response.data) {
        const newBatches = response.data;
        
        // Check for new batches
        const currentBatchIds = availableBatchesRef.current.map(b => b.id);
        const newBatchIds = newBatches.map(b => b.id);
        const addedBatches = newBatches.filter(b => !currentBatchIds.includes(b.id));

        // Notify about new batches
        if (addedBatches.length > 0) {
          console.log(`📦 Found ${addedBatches.length} new batch orders`);
          addedBatches.forEach(batch => {
            console.log(`🆕 New batch: ${batch.name} (${batch.total_orders} orders)`);
            soundService.playOrderNotification();
            onNewBatch?.(batch);
          });
        }

        setAvailableBatches(newBatches);
        console.log(`✅ Available batches refreshed: ${newBatches.length} total`);
      } else {
        throw new Error(response.error || 'Failed to fetch available batches');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh available batches';
      console.error('❌ Error refreshing available batches:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, onNewBatch, onError]);

  // Refresh driver batches
  const refreshDriverBatches = useCallback(async (): Promise<void> => {
    if (!isLoggedIn) {
      console.log('🚫 Cannot refresh driver batches: user not logged in');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Refreshing driver batch orders...');
      const response = await batchOrderService.getDriverBatchOrders();

      if (response.success && response.data) {
        setDriverBatches(response.data);
        console.log(`✅ Driver batches refreshed: ${response.data.length} total`);
      } else {
        throw new Error(response.error || 'Failed to fetch driver batches');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh driver batches';
      console.error('❌ Error refreshing driver batches:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, onError]);

  // Get batch details
  const getBatchDetails = useCallback(async (batchId: string): Promise<BatchOrderInfo | null> => {
    try {
      console.log(`📋 Fetching batch details: ${batchId}`);
      const response = await batchOrderService.getBatchOrderDetails(batchId);

      if (response.success && response.data) {
        console.log(`✅ Batch details fetched for: ${batchId}`);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch batch details');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch batch details';
      console.error(`❌ Error fetching batch details for ${batchId}:`, errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [onError]);

  // Accept batch
  const acceptBatch = useCallback(async (batchId: string): Promise<boolean> => {
    try {
      console.log(`🎯 Accepting batch order: ${batchId}`);
      const response = await batchOrderService.acceptBatchOrder(batchId);

      if (response.success) {
        console.log(`✅ Batch order ${batchId} accepted successfully`);
        
        // Remove from available batches
        const updatedAvailable = availableBatchesRef.current.filter(b => b.id !== batchId);
        setAvailableBatches(updatedAvailable);
        
        // Refresh driver batches to show the accepted batch
        await refreshDriverBatches();
        
        // Get the batch details to process individual orders
        const batchDetails = await batchOrderService.getBatchOrderDetails(batchId);
        
        if (batchDetails.success && batchDetails.data) {
          console.log(`📋 Processing ${batchDetails.data.orders.length} individual orders from batch`);
          
          // The individual orders are now assigned to the driver
          // They will appear in the regular order flow through the OrderContext
          // The batch service has already handled the navigation sorting
          
          // Notify about successful acceptance
          onBatchAccepted?.(batchId);
          
          console.log(`🎉 Batch ${batchId} accepted and orders processed successfully`);
        } else {
          console.warn(`⚠️ Batch accepted but failed to get details: ${batchDetails.error}`);
        }
        
        return true;
      } else {
        throw new Error(response.error || 'Failed to accept batch order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept batch order';
      console.error(`❌ Error accepting batch ${batchId}:`, errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [refreshDriverBatches, onBatchAccepted, onError]);

  // Decline batch
  const declineBatch = useCallback(async (batchId: string, reason?: string): Promise<boolean> => {
    try {
      console.log(`🚫 Declining batch order: ${batchId}`);
      const response = await batchOrderService.declineBatchOrder(batchId, reason);

      if (response.success) {
        console.log(`✅ Batch order ${batchId} declined successfully`);
        
        // Remove from available batches
        const updatedAvailable = availableBatchesRef.current.filter(b => b.id !== batchId);
        setAvailableBatches(updatedAvailable);
        
        return true;
      } else {
        throw new Error(response.error || 'Failed to decline batch order');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline batch order';
      console.error(`❌ Error declining batch ${batchId}:`, errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  // Update batch status
  const updateBatchStatus = useCallback(async (batchId: string, status: BatchStatus): Promise<boolean> => {
    try {
      console.log(`🔄 Updating batch ${batchId} status to: ${status}`);
      const response = await batchOrderService.updateBatchOrderStatus(batchId, status);

      if (response.success) {
        console.log(`✅ Batch ${batchId} status updated to ${status}`);
        
        // Update driver batches
        const updatedDriverBatches = driverBatchesRef.current.map(batch => 
          batch.id === batchId ? { ...batch, status } : batch
        );
        setDriverBatches(updatedDriverBatches);
        
        return true;
      } else {
        throw new Error(response.error || 'Failed to update batch status');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update batch status';
      console.error(`❌ Error updating batch status for ${batchId}:`, errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  // Auto-refresh setup
  useEffect(() => {
    if (!isLoggedIn || !autoRefresh) {
      return;
    }

    console.log(`🔄 Setting up auto-refresh for batch orders (${refreshInterval}ms)`);
    
    // Initial fetch
    refreshAvailableBatches();
    refreshDriverBatches();

    // Set up interval
    refreshIntervalRef.current = setInterval(() => {
      console.log('⏰ Auto-refreshing batch orders...');
      refreshAvailableBatches();
      refreshDriverBatches();
    }, refreshInterval);

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        console.log('🛑 Clearing batch orders auto-refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, autoRefresh, refreshInterval, refreshAvailableBatches, refreshDriverBatches]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Clear data when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('🚪 User logged out, clearing batch orders data');
      setAvailableBatches([]);
      setDriverBatches([]);
      setError(null);
    }
  }, [isLoggedIn]);

  // Computed values
  const totalAvailableBatches = availableBatches.length;
  const totalDriverBatches = driverBatches.length;
  
  // Check if driver can accept more batches (business logic)
  const canAcceptMoreBatches = useMemo(() => {
    const activeBatches = driverBatches.filter(batch => 
      batch.status === BatchStatus.DRIVER_ASSIGNED || 
      batch.status === BatchStatus.COLLECTED ||
      batch.status === BatchStatus.FINAL_DELIVERY
    );
    
    // Driver can handle up to 2 active batches at a time
    return activeBatches.length < 2;
  }, [driverBatches]);

  return {
    // State
    availableBatches,
    driverBatches,
    isLoading,
    error,
    
    // Actions
    refreshAvailableBatches,
    refreshDriverBatches,
    getBatchDetails,
    acceptBatch,
    declineBatch,
    updateBatchStatus,
    
    // Computed
    totalAvailableBatches,
    totalDriverBatches,
    canAcceptMoreBatches
  };
};

// Import useMemo for computed values
import { useMemo } from 'react';