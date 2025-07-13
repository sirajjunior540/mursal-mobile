import { Alert } from 'react-native';
import { apiService } from './api';
import { Order, BatchOrder } from '../types';

export interface BatchScanResult {
  success: boolean;
  batchId?: string;
  orderNumber?: string;
  action?: 'pickup' | 'delivery' | 'consolidation';
  warehouseId?: string;
}

export interface BatchStatusUpdate {
  batchId: string;
  status: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  scannedOrders?: string[]; // Order IDs that were scanned
}

class BatchService {
  /**
   * Parse QR code data to determine batch action
   */
  parseBatchQRCode(qrData: string): BatchScanResult {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(qrData);
      
      if (data.batchId) {
        return {
          success: true,
          batchId: data.batchId,
          orderNumber: data.orderNumber,
          action: data.action || 'pickup',
          warehouseId: data.warehouseId,
        };
      }
    } catch (e) {
      // If not JSON, try to parse as formatted string
      // Format: BATCH:123:ORDER:456:ACTION:pickup
      const parts = qrData.split(':');
      
      if (parts.includes('BATCH')) {
        const batchIndex = parts.indexOf('BATCH');
        const orderIndex = parts.indexOf('ORDER');
        const actionIndex = parts.indexOf('ACTION');
        
        return {
          success: true,
          batchId: parts[batchIndex + 1],
          orderNumber: orderIndex > -1 ? parts[orderIndex + 1] : undefined,
          action: actionIndex > -1 ? parts[actionIndex + 1] as any : 'pickup',
        };
      }
    }
    
    return { success: false };
  }

  /**
   * Update batch status with optional QR validation
   */
  async updateBatchStatus(
    batch: BatchOrder,
    newStatus: string,
    scannedData?: BatchScanResult,
    location?: { latitude: number; longitude: number }
  ): Promise<boolean> {
    try {
      // If QR was scanned, validate it matches the batch
      if (scannedData && scannedData.batchId !== batch.id) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code belongs to a different batch.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // For warehouse operations, validate warehouse
      if (batch.warehouseInfo && scannedData?.warehouseId) {
        if (scannedData.warehouseId !== batch.warehouseInfo.id) {
          Alert.alert(
            'Wrong Warehouse',
            'This QR code is for a different warehouse.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }

      // Update batch status
      const response = await apiService.updateOrderStatus(batch.id, newStatus as any);
      
      if (response.success) {
        // If this is a consolidation batch, handle special logic
        if (batch.batchMetadata?.consolidationRequired && newStatus === 'arrived_at_warehouse') {
          Alert.alert(
            'Consolidation Required',
            'Please consolidate all orders at the warehouse before proceeding.',
            [{ text: 'OK' }]
          );
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating batch status:', error);
      Alert.alert('Error', 'Failed to update batch status');
      return false;
    }
  }

  /**
   * Get next status for batch based on current status and routing strategy
   */
  getNextBatchStatus(batch: BatchOrder): string | null {
    const { status, routingStrategy } = batch;
    
    if (routingStrategy === 'warehouse_to_customers') {
      // Warehouse → Customers flow
      const flow = {
        'assigned': 'accepted',
        'accepted': 'arrived_at_warehouse',
        'arrived_at_warehouse': 'picked_up',
        'picked_up': 'in_transit',
        'in_transit': 'delivered',
      };
      return flow[status as keyof typeof flow] || null;
    } else {
      // Customers → Warehouse flow
      const flow = {
        'assigned': 'accepted',
        'accepted': 'picked_up',
        'picked_up': 'in_transit',
        'in_transit': 'arrived_at_warehouse',
        'arrived_at_warehouse': 'consolidated',
        'consolidated': 'delivered',
      };
      return flow[status as keyof typeof flow] || null;
    }
  }

  /**
   * Get status button text for batch operations
   */
  getBatchStatusButtonText(batch: BatchOrder): string {
    const { status, routingStrategy } = batch;
    
    if (routingStrategy === 'warehouse_to_customers') {
      const texts = {
        'assigned': 'Accept Batch',
        'accepted': 'Arrive at Warehouse',
        'arrived_at_warehouse': 'Pick Up All Orders',
        'picked_up': 'Start Deliveries',
        'in_transit': 'Complete All Deliveries',
      };
      return texts[status as keyof typeof texts] || 'Update Status';
    } else {
      const texts = {
        'assigned': 'Accept Batch',
        'accepted': 'Start Pickups',
        'picked_up': 'Head to Warehouse',
        'in_transit': 'Arrive at Warehouse',
        'arrived_at_warehouse': 'Consolidate Orders',
        'consolidated': 'Complete Batch',
      };
      return texts[status as keyof typeof texts] || 'Update Status';
    }
  }

  /**
   * Check if individual order scanning is required for current status
   */
  requiresIndividualScanning(batch: BatchOrder): boolean {
    const { status, routingStrategy } = batch;
    
    // For warehouse operations, require scanning when picking up
    if (routingStrategy === 'warehouse_to_customers' && status === 'arrived_at_warehouse') {
      return true;
    }
    
    // For consolidation, require scanning when consolidating
    if (routingStrategy === 'customer_to_warehouse' && status === 'arrived_at_warehouse') {
      return true;
    }
    
    return false;
  }

  /**
   * Track scanned orders within a batch
   */
  private scannedOrders: Map<string, Set<string>> = new Map();

  addScannedOrder(batchId: string, orderId: string) {
    if (!this.scannedOrders.has(batchId)) {
      this.scannedOrders.set(batchId, new Set());
    }
    this.scannedOrders.get(batchId)!.add(orderId);
  }

  getScannedOrders(batchId: string): string[] {
    return Array.from(this.scannedOrders.get(batchId) || []);
  }

  clearScannedOrders(batchId: string) {
    this.scannedOrders.delete(batchId);
  }

  /**
   * Check if all orders in batch have been scanned
   */
  allOrdersScanned(batch: BatchOrder): boolean {
    const scanned = this.getScannedOrders(batch.id);
    const totalOrders = batch.orders?.length || 0;
    return scanned.length === totalOrders;
  }
}

export const batchService = new BatchService();
export default batchService;