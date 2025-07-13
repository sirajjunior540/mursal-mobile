/**
 * Batch Service for mobile app
 * Updated to work with unified Batch model supporting all operational modes
 * Handles batch operations, driver assignments, and status updates
 */

import { ApiResponse } from '../types';
import { 
  BatchOrderInfo, 
  BatchOrderResponse, 
  BatchOrderListResponse, 
  BatchAcceptResponse,
  BatchStatus 
} from '../shared/types/order.types';

// New batch operation types for unified system
interface BatchDriverAssignment {
  driver_id: number;
}

interface BatchStatusUpdate {
  status: string;
}

interface DeliveryStatusUpdate {
  status: string;
}
import { apiService } from './api';

interface BatchOrderTransformer {
  transformFromBackend(backendData: any): BatchOrderInfo;
  transformToBackend(batchOrder: BatchOrderInfo): any;
}

class BatchOrderTransformerImpl implements BatchOrderTransformer {
  transformFromBackend(backendData: any): BatchOrderInfo {
    return {
      id: backendData.id || '',
      batch_number: backendData.batch_number || '',
      name: backendData.name || '',
      status: this.mapBackendStatus(backendData.status) || BatchStatus.DRAFT,
      customer_id: backendData.customer || backendData.customer_id || '',
      total_orders: backendData.total_orders || backendData.orders?.length || 0,
      total_items: backendData.total_items || this.calculateTotalItems(backendData.orders),
      current_step: backendData.current_step || 1,
      
      // Pickup information
      pickup_address: backendData.pickup_address || '',
      pickup_latitude: backendData.pickup_latitude ? parseFloat(backendData.pickup_latitude) : undefined,
      pickup_longitude: backendData.pickup_longitude ? parseFloat(backendData.pickup_longitude) : undefined,
      pickup_contact_name: backendData.pickup_contact_name || '',
      pickup_contact_phone: backendData.pickup_contact_phone || '',
      pickup_instructions: backendData.pickup_instructions || '',
      
      // Scheduling
      scheduled_pickup_date: backendData.scheduled_pickup_date || undefined,
      scheduled_pickup_time: backendData.scheduled_pickup_time || undefined,
      
      // Settings
      enable_smart_routing: backendData.enable_smart_routing ?? true,
      batch_notes: backendData.batch_notes || '',
      
      // Step completion timestamps
      step1_completed_at: backendData.step1_completed_at || undefined,
      step2_completed_at: backendData.step2_completed_at || undefined,
      step3_completed_at: backendData.step3_completed_at || undefined,
      submitted_at: backendData.submitted_at || undefined,
      
      // Metadata
      created_at: backendData.created_at || new Date().toISOString(),
      updated_at: backendData.updated_at || new Date().toISOString(),
      
      // Orders in this batch
      orders: (backendData.orders || []).map(this.transformOrderFromBackend.bind(this))
    };
  }

  transformToBackend(batchOrder: BatchOrderInfo): any {
    return {
      id: batchOrder.id,
      batch_number: batchOrder.batch_number,
      name: batchOrder.name,
      status: batchOrder.status,
      customer: batchOrder.customer_id,
      pickup_address: batchOrder.pickup_address,
      pickup_latitude: batchOrder.pickup_latitude,
      pickup_longitude: batchOrder.pickup_longitude,
      pickup_contact_name: batchOrder.pickup_contact_name,
      pickup_contact_phone: batchOrder.pickup_contact_phone,
      pickup_instructions: batchOrder.pickup_instructions,
      scheduled_pickup_date: batchOrder.scheduled_pickup_date,
      scheduled_pickup_time: batchOrder.scheduled_pickup_time,
      enable_smart_routing: batchOrder.enable_smart_routing,
      batch_notes: batchOrder.batch_notes,
      orders: batchOrder.orders.map(this.transformOrderToBackend.bind(this))
    };
  }

  private transformOrderFromBackend(backendOrder: any): any {
    return {
      id: backendOrder.id || '',
      order_number: backendOrder.order_number || '',
      recipient_name: backendOrder.recipient_name || backendOrder.delivery_contact_name || '',
      recipient_phone: backendOrder.recipient_phone || backendOrder.delivery_contact_phone || '',
      recipient_email: backendOrder.recipient_email || '',
      delivery_address: backendOrder.delivery_address || '',
      delivery_latitude: backendOrder.delivery_latitude ? parseFloat(backendOrder.delivery_latitude) : undefined,
      delivery_longitude: backendOrder.delivery_longitude ? parseFloat(backendOrder.delivery_longitude) : undefined,
      delivery_contact_name: backendOrder.delivery_contact_name || '',
      delivery_contact_phone: backendOrder.delivery_contact_phone || '',
      delivery_instructions: backendOrder.delivery_instructions || '',
      package_size: backendOrder.package_size || 'medium',
      package_weight: backendOrder.package_weight || 0,
      delivery_type: backendOrder.delivery_type || 'regular',
      payment_method: backendOrder.payment_method || 'cash',
      priority: backendOrder.priority || 'normal',
      scheduled_date: backendOrder.scheduled_date || undefined,
      scheduled_time: backendOrder.scheduled_time || undefined,
      special_instructions: backendOrder.special_instructions || '',
      requires_signature: backendOrder.requires_signature || false,
      requires_id_verification: backendOrder.requires_id_verification || false,
      cash_on_delivery: backendOrder.cash_on_delivery || false,
      cod_amount: backendOrder.cod_amount || 0,
      subtotal: backendOrder.subtotal || 0,
      delivery_fee: backendOrder.delivery_fee || 0,
      tax: backendOrder.tax || 0,
      total: backendOrder.total || 0,
      items: (backendOrder.items || []).map(this.transformItemFromBackend.bind(this)),
      status: backendOrder.status || 'pending',
      created_at: backendOrder.created_at || new Date().toISOString(),
      updated_at: backendOrder.updated_at || new Date().toISOString()
    };
  }

  private transformOrderToBackend(order: any): any {
    return {
      id: order.id,
      order_number: order.order_number,
      recipient_name: order.recipient_name,
      recipient_phone: order.recipient_phone,
      recipient_email: order.recipient_email,
      delivery_address: order.delivery_address,
      delivery_latitude: order.delivery_latitude,
      delivery_longitude: order.delivery_longitude,
      delivery_contact_name: order.delivery_contact_name,
      delivery_contact_phone: order.delivery_contact_phone,
      delivery_instructions: order.delivery_instructions,
      package_size: order.package_size,
      package_weight: order.package_weight,
      delivery_type: order.delivery_type,
      payment_method: order.payment_method,
      priority: order.priority,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time,
      special_instructions: order.special_instructions,
      requires_signature: order.requires_signature,
      requires_id_verification: order.requires_id_verification,
      cash_on_delivery: order.cash_on_delivery,
      cod_amount: order.cod_amount,
      items: order.items.map(this.transformItemToBackend.bind(this))
    };
  }

  private transformItemFromBackend(backendItem: any): any {
    return {
      id: backendItem.id || '',
      name: backendItem.name || '',
      description: backendItem.description || '',
      quantity: backendItem.quantity || 1,
      price: backendItem.price || 0,
      weight: backendItem.weight || 0,
      product_id: backendItem.product_id || ''
    };
  }

  private transformItemToBackend(item: any): any {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      weight: item.weight,
      product_id: item.product_id
    };
  }

  private calculateTotalItems(orders: any[]): number {
    if (!orders || !Array.isArray(orders)) return 0;
    return orders.reduce((total, order) => {
      return total + (order.items?.length || 0);
    }, 0);
  }

  // Map backend status to mobile app status
  private mapBackendStatus(backendStatus: string): BatchStatus {
    const statusMap: { [key: string]: BatchStatus } = {
      'batch_created': BatchStatus.DRAFT,
      'ready_for_pickup': BatchStatus.READY_FOR_PICKUP,
      'driver_assigned': BatchStatus.SUBMITTED,
      'picked_up': BatchStatus.COLLECTED,
      'at_local_warehouse': BatchStatus.AT_WAREHOUSE,
      'out_for_delivery': BatchStatus.FINAL_DELIVERY,
      'arrived_at_wh_1': BatchStatus.AT_WAREHOUSE,
      'departed_wh_1': BatchStatus.WAREHOUSE_PROCESSING,
      'arrived_at_wh_2': BatchStatus.AT_WAREHOUSE,
      'consolidated_at_wh_x': BatchStatus.WAREHOUSE_PROCESSING,
      'delivered': BatchStatus.COMPLETED,
      'completed': BatchStatus.COMPLETED,
      'cancelled': BatchStatus.CANCELLED,
      // Legacy statuses
      'draft': BatchStatus.DRAFT,
      'step1_complete': BatchStatus.DRAFT,
      'step2_complete': BatchStatus.DRAFT,
      'step3_complete': BatchStatus.DRAFT,
      'submitted': BatchStatus.SUBMITTED
    };
    
    return statusMap[backendStatus] || BatchStatus.DRAFT;
  }
}

export class BatchOrderService {
  private transformer: BatchOrderTransformer;

  constructor() {
    this.transformer = new BatchOrderTransformerImpl();
  }

  /**
   * Get available batch orders for drivers
   */
  async getAvailableBatchOrders(): Promise<ApiResponse<BatchOrderInfo[]>> {
    try {
      console.log('📦 Fetching available batch orders...');
      
      // Use unified batch API
      const response = await apiService.get<any[]>('/api/v1/delivery/batches/?status=ready_for_pickup,driver_assigned');
      
      if (response.success && response.data) {
        const batchOrders = response.data
          .map(batch => this.transformer.transformFromBackend(batch));
        
        console.log(`✅ Found ${batchOrders.length} available batches via unified API`);
        return {
          success: true,
          data: batchOrders,
          message: response.message
        };
      }
      
      return {
        success: false,
        data: [],
        error: 'Failed to fetch batch orders from both APIs'
      };
    } catch (error) {
      console.error('❌ Error fetching batch orders:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch batch orders'
      };
    }
  }

  /**
   * Get batch order details by ID
   */
  async getBatchOrderDetails(batchId: string): Promise<ApiResponse<BatchOrderInfo>> {
    try {
      console.log(`📋 Fetching batch order details for: ${batchId}`);
      
      // Try step-based API first
      const stepBasedResponse = await apiService.get<any>(`/api/v1/delivery/step-based/batches/${batchId}/`);
      
      if (stepBasedResponse.success && stepBasedResponse.data) {
        const batchOrder = this.transformer.transformFromBackend(stepBasedResponse.data);
        console.log(`✅ Batch order details fetched via step-based API`);
        return {
          success: true,
          data: batchOrder,
          message: stepBasedResponse.message
        };
      }
      
      // Fallback to regular API
      console.log('🔄 Falling back to regular batch orders API...');
      const regularResponse = await apiService.get<any>(`/api/v1/delivery/batch-orders/${batchId}/`);
      
      if (regularResponse.success && regularResponse.data) {
        const batchOrder = this.transformer.transformFromBackend(regularResponse.data);
        console.log(`✅ Batch order details fetched via regular API`);
        return {
          success: true,
          data: batchOrder,
          message: regularResponse.message
        };
      }
      
      return {
        success: false,
        data: null!,
        error: 'Failed to fetch batch order details'
      };
    } catch (error) {
      console.error(`❌ Error fetching batch order details for ${batchId}:`, error);
      return {
        success: false,
        data: null!,
        error: error instanceof Error ? error.message : 'Failed to fetch batch order details'
      };
    }
  }

  /**
   * Accept a batch order with proper order assignment and navigation sorting
   */
  async acceptBatchOrder(batchId: string): Promise<ApiResponse<BatchAcceptResponse>> {
    try {
      console.log(`🎯 Accepting batch order: ${batchId}`);
      
      // Try step-based API first (if the batch is submitted through step-based flow)
      try {
        const stepBasedResponse = await apiService.post<BatchAcceptResponse>(
          `/api/v1/delivery/step-based/batches/${batchId}/accept/`,
          {}
        );
        
        if (stepBasedResponse.success) {
          console.log(`✅ Batch order ${batchId} accepted via step-based API`);
          
          // After successful acceptance, get the assigned orders and sort them for navigation
          await this.processAcceptedBatchOrders(batchId);
          
          return stepBasedResponse;
        }
      } catch (stepBasedError) {
        console.log('🔄 Step-based accept failed, trying regular API...');
      }
      
      // Fallback to regular batch accept API
      const regularResponse = await apiService.post<BatchAcceptResponse>(
        `/api/v1/delivery/batch-orders/${batchId}/assign_driver/`,
        { action: 'accept' }
      );
      
      if (regularResponse.success) {
        console.log(`✅ Batch order ${batchId} accepted via regular API`);
        
        // After successful acceptance, get the assigned orders and sort them for navigation
        await this.processAcceptedBatchOrders(batchId);
        
        return regularResponse;
      }
      
      return {
        success: false,
        data: null!,
        error: 'Failed to accept batch order'
      };
    } catch (error) {
      console.error(`❌ Error accepting batch order ${batchId}:`, error);
      return {
        success: false,
        data: null!,
        error: error instanceof Error ? error.message : 'Failed to accept batch order'
      };
    }
  }

  /**
   * Process accepted batch orders - assign orders to driver and sort for navigation
   */
  private async processAcceptedBatchOrders(batchId: string): Promise<void> {
    try {
      console.log(`📋 Processing accepted batch orders for batch: ${batchId}`);
      
      // Get full batch details including all orders
      const batchDetails = await this.getBatchOrderDetails(batchId);
      
      if (!batchDetails.success || !batchDetails.data) {
        console.error('❌ Failed to get batch details after acceptance');
        return;
      }
      
      const batch = batchDetails.data;
      console.log(`📦 Batch contains ${batch.orders.length} orders`);
      
      // Check if this is a warehouse consolidation batch (Phase 1)
      const isWarehouseBatch = this.isWarehouseConsolidationBatch(batch);
      
      if (isWarehouseBatch) {
        console.log('🏭 Processing warehouse consolidation batch (Phase 1)');
        await this.processWarehouseBatch(batch);
      } else {
        console.log('🚚 Processing direct delivery batch');
        await this.processDirectDeliveryBatch(batch);
      }
      
    } catch (error) {
      console.error(`❌ Error processing accepted batch orders:`, error);
      // Don't throw - this is post-acceptance processing
    }
  }

  /**
   * Check if this is a warehouse consolidation batch
   * Integrates with franchise network routing system
   */
  private isWarehouseConsolidationBatch(batch: BatchOrderInfo): boolean {
    // First check if warehouse consolidation is enabled in settings
    const consolidateToWarehouse = this.getConsolidateToWarehouseSetting();
    
    if (!consolidateToWarehouse) {
      console.log('🏭 Warehouse consolidation disabled - treating as direct delivery');
      return false;
    }
    
    // Check if this batch uses the franchise network
    const usesFranchiseNetwork = this.checkFranchiseNetworkUsage(batch);
    
    if (usesFranchiseNetwork) {
      console.log('🌐 Franchise network batch detected - using intelligent routing');
      return this.determineFranchiseRoutingStrategy(batch);
    }
    
    // Traditional warehouse consolidation check
    const deliveryAddresses = batch.orders.map(order => order.delivery_address?.toLowerCase());
    const uniqueAddresses = new Set(deliveryAddresses);
    
    // If all orders have the same delivery address and it contains warehouse keywords
    if (uniqueAddresses.size === 1) {
      const address = Array.from(uniqueAddresses)[0];
      const isWarehouseAddress = address?.includes('warehouse') || 
                                address?.includes('distribution') || 
                                address?.includes('hub') ||
                                address?.includes('depot') ||
                                address?.includes('facility');
      
      if (isWarehouseAddress) {
        console.log('🏭 Traditional warehouse consolidation batch detected');
        return true;
      }
    }
    
    console.log('🚚 Direct delivery batch - no warehouse consolidation needed');
    return false;
  }

  /**
   * Check if batch uses franchise network
   */
  private checkFranchiseNetworkUsage(batch: BatchOrderInfo): boolean {
    // Check if any order in the batch uses franchise network
    // This would be set in the batch creation process
    return batch.orders.some(order => (order as any).use_franchise_network === true);
  }

  /**
   * Determine franchise routing strategy based on distance and capabilities
   */
  private determineFranchiseRoutingStrategy(batch: BatchOrderInfo): boolean {
    console.log('🌐 Analyzing franchise network routing strategy...');
    
    // Calculate delivery distances to determine if this is long-range
    const isLongRange = this.isLongRangeDelivery(batch);
    
    if (!isLongRange) {
      console.log('📍 Local delivery (≤50km) - no network routing needed');
      return false;
    }
    
    // Check tenant warehouse capabilities
    const tenantHasWarehouse = this.checkTenantWarehouseCapabilities();
    
    if (tenantHasWarehouse) {
      console.log('🏭 Long-range delivery with tenant warehouse - local pickup → network delivery');
      return true; // Phase 1: Local pickup → warehouse consolidation
    } else {
      console.log('🚚 Long-range delivery without warehouse - full hub network');
      return false; // Full hub network handles everything
    }
  }

  /**
   * Check if delivery is long-range (>50km)
   */
  private isLongRangeDelivery(batch: BatchOrderInfo): boolean {
    const MAX_LOCAL_DISTANCE = 50; // km
    
    // Calculate average distance for the batch
    // In a real implementation, you would use a proper distance calculation service
    const avgDistance = this.calculateAverageDeliveryDistance(batch);
    
    console.log(`📏 Average delivery distance: ${avgDistance}km (threshold: ${MAX_LOCAL_DISTANCE}km)`);
    return avgDistance > MAX_LOCAL_DISTANCE;
  }

  /**
   * Calculate average delivery distance for batch
   */
  private calculateAverageDeliveryDistance(batch: BatchOrderInfo): number {
    if (!batch.pickup_latitude || !batch.pickup_longitude) {
      return 0;
    }
    
    const pickupCoords = { lat: batch.pickup_latitude, lng: batch.pickup_longitude };
    let totalDistance = 0;
    let validDistances = 0;
    
    for (const order of batch.orders) {
      if (order.delivery_latitude && order.delivery_longitude) {
        const deliveryCoords = { lat: order.delivery_latitude, lng: order.delivery_longitude };
        const distance = this.calculateDistance(pickupCoords, deliveryCoords);
        totalDistance += distance;
        validDistances++;
      }
    }
    
    return validDistances > 0 ? totalDistance / validDistances : 0;
  }

  /**
   * Simple distance calculation (Haversine formula)
   */
  private calculateDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
    const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check tenant warehouse capabilities
   */
  private checkTenantWarehouseCapabilities(): boolean {
    // This would typically be fetched from the tenant's settings or API
    // For now, we'll check local storage or return a default
    try {
      const tenantSettings = localStorage.getItem('tenant_warehouse_capabilities');
      if (tenantSettings) {
        const settings = JSON.parse(tenantSettings);
        return settings.has_warehouse === true;
      }
      
      // Default to false if no settings found
      return false;
    } catch (error) {
      console.error('❌ Error checking tenant warehouse capabilities:', error);
      return false;
    }
  }

  /**
   * Get warehouse consolidation setting
   * This should be configured in your app settings or fetched from backend
   */
  private getConsolidateToWarehouseSetting(): boolean {
    // For now, return true by default
    // In a real app, this would be fetched from:
    // - App configuration
    // - Backend settings API
    // - Local storage preferences
    // - Environment variables
    
    try {
      // Check if there's a setting stored locally
      const setting = localStorage.getItem('consolidate_to_warehouse');
      if (setting !== null) {
        return JSON.parse(setting);
      }
      
      // Default to true if warehouse consolidation is the preferred workflow
      return true;
    } catch (error) {
      console.error('❌ Error reading warehouse consolidation setting:', error);
      return true; // Default to true for safety
    }
  }

  /**
   * Process warehouse consolidation batch (Phase 1)
   * Handles both traditional warehouse and franchise network scenarios
   */
  private async processWarehouseBatch(batch: BatchOrderInfo): Promise<void> {
    console.log('🏭 Processing warehouse batch - Phase 1 (Pickup → Warehouse)');
    
    // Check if this is a franchise network batch
    const usesFranchiseNetwork = this.checkFranchiseNetworkUsage(batch);
    
    if (usesFranchiseNetwork) {
      await this.processFranchiseWarehouseBatch(batch);
    } else {
      await this.processTraditionalWarehouseBatch(batch);
    }
  }

  /**
   * Process franchise network warehouse batch
   */
  private async processFranchiseWarehouseBatch(batch: BatchOrderInfo): Promise<void> {
    console.log('🌐 Processing franchise network warehouse batch');
    
    const tenantHasWarehouse = this.checkTenantWarehouseCapabilities();
    
    if (tenantHasWarehouse) {
      // Local pickup → network delivery scenario
      console.log('🏭 Tenant warehouse → network delivery');
      
      const navigationData = {
        batchId: batch.id,
        batchType: 'franchise_local_pickup',
        phase: 1,
        franchiseNetwork: true,
        routingStrategy: 'local_pickup_network_delivery',
        pickupPoint: {
          address: batch.pickup_address,
          latitude: batch.pickup_latitude,
          longitude: batch.pickup_longitude,
          contactName: batch.pickup_contact_name,
          contactPhone: batch.pickup_contact_phone,
          instructions: batch.pickup_instructions,
        },
        warehousePoint: {
          address: 'Tenant Warehouse', // This should be fetched from tenant settings
          latitude: batch.pickup_latitude, // Warehouse coordinates
          longitude: batch.pickup_longitude,
        },
        totalOrders: batch.orders.length,
        totalItems: batch.total_items,
        smartRouting: batch.enable_smart_routing,
        destinationHubs: this.getDestinationHubs(batch.orders),
      };
      
      console.log('📍 Franchise local pickup navigation data:', navigationData);
      await this.storeNavigationData(batch.id, navigationData);
      
    } else {
      // Full hub network scenario - should be handled by hub collection
      console.log('🚚 Full hub network - should be handled by hub collection');
      // This case should not reach here as it would be processed as direct delivery
    }
  }

  /**
   * Process traditional warehouse batch
   */
  private async processTraditionalWarehouseBatch(batch: BatchOrderInfo): Promise<void> {
    console.log('🏭 Processing traditional warehouse batch');
    
    // For traditional warehouse, all orders go to the same warehouse
    const navigationData = {
      batchId: batch.id,
      batchType: 'warehouse_consolidation',
      phase: 1,
      franchiseNetwork: false,
      pickupPoint: {
        address: batch.pickup_address,
        latitude: batch.pickup_latitude,
        longitude: batch.pickup_longitude,
        contactName: batch.pickup_contact_name,
        contactPhone: batch.pickup_contact_phone,
        instructions: batch.pickup_instructions,
      },
      deliveryPoint: {
        address: batch.orders[0]?.delivery_address, // All orders go to same warehouse
        latitude: batch.orders[0]?.delivery_latitude,
        longitude: batch.orders[0]?.delivery_longitude,
      },
      totalOrders: batch.orders.length,
      totalItems: batch.total_items,
      smartRouting: batch.enable_smart_routing,
    };
    
    console.log('📍 Traditional warehouse navigation data:', navigationData);
    await this.storeNavigationData(batch.id, navigationData);
  }

  /**
   * Get destination hubs for franchise network orders
   */
  private getDestinationHubs(orders: any[]): any[] {
    const hubs = [];
    const hubMap = new Map();
    
    for (const order of orders) {
      if (order.delivery_latitude && order.delivery_longitude) {
        // In a real implementation, this would call the franchise API to determine the destination hub
        const hubId = this.determineDestinationHub(order.delivery_latitude, order.delivery_longitude);
        
        if (!hubMap.has(hubId)) {
          hubMap.set(hubId, {
            id: hubId,
            name: `Hub ${hubId}`,
            orders: [],
            estimatedDistance: this.calculateDistance(
              { lat: order.delivery_latitude, lng: order.delivery_longitude },
              { lat: order.delivery_latitude, lng: order.delivery_longitude } // Placeholder
            )
          });
        }
        
        hubMap.get(hubId).orders.push(order.id);
      }
    }
    
    return Array.from(hubMap.values());
  }

  /**
   * Determine destination hub for delivery coordinates
   */
  private determineDestinationHub(latitude: number, longitude: number): string {
    // Simple hub determination based on geographic regions
    // In a real implementation, this would use the franchise API
    
    if (latitude > 40 && longitude > -75) {
      return 'hub_northeast';
    } else if (latitude > 35 && longitude > -90) {
      return 'hub_southeast';
    } else if (latitude > 40 && longitude < -90) {
      return 'hub_northwest';
    } else {
      return 'hub_southwest';
    }
  }

  /**
   * Process direct delivery batch (no warehouse consolidation or Phase 2 warehouse→final)
   */
  private async processDirectDeliveryBatch(batch: BatchOrderInfo): Promise<void> {
    // Check if this is a franchise network batch
    const usesFranchiseNetwork = this.checkFranchiseNetworkUsage(batch);
    
    if (usesFranchiseNetwork) {
      await this.processFranchiseDirectDeliveryBatch(batch);
    } else {
      await this.processTraditionalDirectDeliveryBatch(batch);
    }
  }

  /**
   * Process franchise network direct delivery batch
   */
  private async processFranchiseDirectDeliveryBatch(batch: BatchOrderInfo): Promise<void> {
    console.log('🌐 Processing franchise network direct delivery batch');
    
    const tenantHasWarehouse = this.checkTenantWarehouseCapabilities();
    const isLongRange = this.isLongRangeDelivery(batch);
    
    if (isLongRange && !tenantHasWarehouse) {
      // Full hub network scenario - hub will handle collection and delivery
      console.log('🚚 Full hub network - hub collection and delivery');
      
      const navigationData = {
        batchId: batch.id,
        batchType: 'franchise_hub_network',
        phase: 1,
        franchiseNetwork: true,
        routingStrategy: 'full_hub_network',
        requiresHubCollection: true,
        assignedHub: await this.getAssignedHub(batch),
        destinationHubs: this.getDestinationHubs(batch.orders),
        totalOrders: batch.orders.length,
        totalItems: batch.total_items,
        smartRouting: batch.enable_smart_routing,
      };
      
      console.log('📍 Hub network navigation data:', navigationData);
      await this.storeNavigationData(batch.id, navigationData);
      
    } else {
      // Local franchise delivery or Phase 2 from warehouse
      console.log('🚚 Local franchise delivery or Phase 2 delivery');
      await this.processLocalFranchiseDelivery(batch);
    }
  }

  /**
   * Process local franchise delivery
   */
  private async processLocalFranchiseDelivery(batch: BatchOrderInfo): Promise<void> {
    const sortedOrders = await this.sortOrdersForNavigation(batch.orders, batch.enable_smart_routing);
    
    const navigationData = {
      batchId: batch.id,
      batchType: 'franchise_local_delivery',
      phase: 1,
      franchiseNetwork: true,
      routingStrategy: 'local_delivery',
      startPoint: {
        address: batch.pickup_address,
        latitude: batch.pickup_latitude,
        longitude: batch.pickup_longitude,
      },
      deliveryPoints: sortedOrders.map((order, index) => ({
        orderId: order.id,
        sequence: index + 1,
        address: order.delivery_address,
        latitude: order.delivery_latitude,
        longitude: order.delivery_longitude,
        contactName: order.delivery_contact_name || order.recipient_name,
        contactPhone: order.delivery_contact_phone || order.recipient_phone,
        instructions: order.delivery_instructions,
        items: order.items,
        total: order.total,
        paymentMethod: order.payment_method,
        requiresSignature: order.requires_signature,
        requiresIdVerification: order.requires_id_verification,
        cashOnDelivery: order.cash_on_delivery,
        codAmount: order.cod_amount,
      })),
      totalOrders: batch.orders.length,
      totalItems: batch.total_items,
      smartRouting: batch.enable_smart_routing,
    };
    
    console.log('📍 Local franchise delivery navigation data:', navigationData);
    await this.storeNavigationData(batch.id, navigationData);
  }

  /**
   * Process traditional direct delivery batch
   */
  private async processTraditionalDirectDeliveryBatch(batch: BatchOrderInfo): Promise<void> {
    const consolidateToWarehouse = this.getConsolidateToWarehouseSetting();
    
    if (consolidateToWarehouse) {
      console.log('🚚 Processing Phase 2 delivery batch (Warehouse → Final Delivery)');
    } else {
      console.log('🚚 Processing direct delivery batch (Pickup → Final Delivery)');
    }
    
    // For both scenarios, orders need to be sorted by optimal navigation route
    const sortedOrders = await this.sortOrdersForNavigation(batch.orders, batch.enable_smart_routing);
    
    const navigationData = {
      batchId: batch.id,
      batchType: consolidateToWarehouse ? 'final_delivery' : 'direct_delivery',
      phase: consolidateToWarehouse ? 2 : 1,
      franchiseNetwork: false,
      startPoint: {
        address: batch.pickup_address, // Pickup point for direct, warehouse for Phase 2
        latitude: batch.pickup_latitude,
        longitude: batch.pickup_longitude,
      },
      deliveryPoints: sortedOrders.map((order, index) => ({
        orderId: order.id,
        sequence: index + 1,
        address: order.delivery_address,
        latitude: order.delivery_latitude,
        longitude: order.delivery_longitude,
        contactName: order.delivery_contact_name || order.recipient_name,
        contactPhone: order.delivery_contact_phone || order.recipient_phone,
        instructions: order.delivery_instructions,
        items: order.items,
        total: order.total,
        paymentMethod: order.payment_method,
        requiresSignature: order.requires_signature,
        requiresIdVerification: order.requires_id_verification,
        cashOnDelivery: order.cash_on_delivery,
        codAmount: order.cod_amount,
      })),
      totalOrders: batch.orders.length,
      totalItems: batch.total_items,
      smartRouting: batch.enable_smart_routing,
    };
    
    console.log('📍 Traditional direct delivery navigation data:', navigationData);
    
    // Store navigation data for the driver app
    await this.storeNavigationData(batch.id, navigationData);
  }

  /**
   * Get assigned hub for collection
   */
  private async getAssignedHub(batch: BatchOrderInfo): Promise<any> {
    // In a real implementation, this would call the franchise API to get the assigned hub
    const pickupCoords = { lat: batch.pickup_latitude || 0, lng: batch.pickup_longitude || 0 };
    
    return {
      id: 'hub_001',
      name: 'Regional Hub North',
      address: 'Hub Collection Center',
      latitude: pickupCoords.lat,
      longitude: pickupCoords.lng,
      collectionZones: ['zone_1', 'zone_2'],
      hasSpecialVehicles: true,
      collectionRadiusKm: 75,
      estimatedCollectionTime: '2-4 hours'
    };
  }

  /**
   * Sort orders for optimal navigation route
   */
  private async sortOrdersForNavigation(orders: any[], smartRouting: boolean): Promise<any[]> {
    if (!smartRouting || orders.length <= 1) {
      return orders;
    }
    
    try {
      console.log('🗺️ Sorting orders for optimal navigation route...');
      
      // Use a simple distance-based sorting for now
      // In a real implementation, you would use a proper routing service
      const sortedOrders = [...orders].sort((a, b) => {
        // Sort by latitude first, then longitude for a simple geographic clustering
        const latDiff = (a.delivery_latitude || 0) - (b.delivery_latitude || 0);
        if (Math.abs(latDiff) > 0.001) {
          return latDiff;
        }
        return (a.delivery_longitude || 0) - (b.delivery_longitude || 0);
      });
      
      console.log(`✅ Orders sorted for navigation: ${sortedOrders.length} orders`);
      return sortedOrders;
      
    } catch (error) {
      console.error('❌ Error sorting orders for navigation:', error);
      return orders; // Return original order if sorting fails
    }
  }

  /**
   * Store navigation data for the driver app
   */
  private async storeNavigationData(batchId: string, navigationData: any): Promise<void> {
    try {
      // Store in local storage for quick access
      const storageKey = `batch_navigation_${batchId}`;
      await apiService.post('/api/v1/delivery/batch-orders/store-navigation/', {
        batchId,
        navigationData
      });
      
      console.log(`💾 Navigation data stored for batch: ${batchId}`);
      
    } catch (error) {
      console.error('❌ Error storing navigation data:', error);
      // Don't throw - this is not critical for the acceptance flow
    }
  }

  /**
   * Decline a batch order
   */
  async declineBatchOrder(batchId: string, reason?: string): Promise<ApiResponse<void>> {
    try {
      console.log(`🚫 Declining batch order: ${batchId}`);
      
      // Try step-based API first
      try {
        const stepBasedResponse = await apiService.post<void>(
          `/api/v1/delivery/step-based/batches/${batchId}/decline/`,
          { reason }
        );
        
        if (stepBasedResponse.success) {
          console.log(`✅ Batch order ${batchId} declined via step-based API`);
          return stepBasedResponse;
        }
      } catch (stepBasedError) {
        console.log('🔄 Step-based decline failed, trying regular API...');
      }
      
      // Fallback to regular batch decline API
      const regularResponse = await apiService.post<void>(
        `/api/v1/delivery/batch-orders/${batchId}/decline/`,
        { reason }
      );
      
      if (regularResponse.success) {
        console.log(`✅ Batch order ${batchId} declined via regular API`);
        return regularResponse;
      }
      
      return {
        success: false,
        data: undefined,
        error: 'Failed to decline batch order'
      };
    } catch (error) {
      console.error(`❌ Error declining batch order ${batchId}:`, error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to decline batch order'
      };
    }
  }

  /**
   * Update batch order status
   */
  async updateBatchOrderStatus(batchId: string, status: BatchStatus): Promise<ApiResponse<void>> {
    try {
      console.log(`🔄 Updating batch order ${batchId} status to: ${status}`);
      
      const response = await apiService.post<void>(
        `/api/v1/delivery/batch-orders/${batchId}/update_status/`,
        { status }
      );
      
      if (response.success) {
        console.log(`✅ Batch order ${batchId} status updated to ${status}`);
        return response;
      }
      
      return {
        success: false,
        data: undefined,
        error: 'Failed to update batch order status'
      };
    } catch (error) {
      console.error(`❌ Error updating batch order status for ${batchId}:`, error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to update batch order status'
      };
    }
  }

  /**
   * Get driver's assigned batch orders
   */
  async getDriverBatchOrders(): Promise<ApiResponse<BatchOrderInfo[]>> {
    try {
      console.log('🚛 Fetching driver batch orders...');
      
      const response = await apiService.get<any[]>('/api/v1/delivery/batch-orders/driver/');
      
      if (response.success && response.data) {
        const batchOrders = response.data.map(batch => this.transformer.transformFromBackend(batch));
        console.log(`✅ Found ${batchOrders.length} driver batch orders`);
        return {
          success: true,
          data: batchOrders,
          message: response.message
        };
      }
      
      return {
        success: false,
        data: [],
        error: 'Failed to fetch driver batch orders'
      };
    } catch (error) {
      console.error('❌ Error fetching driver batch orders:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch driver batch orders'
      };
    }
  }

  // === NEW UNIFIED BATCH OPERATIONS ===

  /**
   * Update batch status using centralized routing
   */
  async updateBatchStatus(batchId: string, status: string): Promise<ApiResponse<any>> {
    try {
      console.log(`📦 Updating batch ${batchId} status to ${status}`);
      
      const response = await apiService.post<any>(
        `/api/v1/delivery/batches/${batchId}/update_status/`,
        { status }
      );
      
      if (response.success) {
        console.log(`✅ Batch status updated successfully`);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error updating batch status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update batch status'
      };
    }
  }

  /**
   * Update delivery status using centralized routing
   */
  async updateDeliveryStatus(deliveryId: string, status: string): Promise<ApiResponse<any>> {
    try {
      console.log(`🚚 Updating delivery ${deliveryId} status to ${status}`);
      
      const response = await apiService.post<any>(
        `/api/v1/delivery/deliveries/${deliveryId}/update_status_centralized/`,
        { status }
      );
      
      if (response.success) {
        console.log(`✅ Delivery status updated successfully`);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delivery status'
      };
    }
  }

  /**
   * Get batch tracking information
   */
  async getBatchTracking(batchId: string): Promise<ApiResponse<any>> {
    try {
      console.log(`📍 Fetching tracking for batch ${batchId}`);
      
      const response = await apiService.get<any>(
        `/api/v1/delivery/batches/${batchId}/tracking/`
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching batch tracking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch batch tracking'
      };
    }
  }

  /**
   * Get batch operational mode and workflow
   */
  async getBatchOperationalMode(batchId: string): Promise<ApiResponse<any>> {
    try {
      console.log(`🔍 Fetching operational mode for batch ${batchId}`);
      
      const response = await apiService.get<any>(
        `/api/v1/delivery/batches/${batchId}/operational_mode/`
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching batch operational mode:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch operational mode'
      };
    }
  }

  /**
   * Check if batch requires network operations
   */
  private async isNetworkBatch(batchId: string): Promise<boolean> {
    try {
      const response = await this.getBatchOperationalMode(batchId);
      if (response.success && response.data) {
        return response.data.operational_mode === 'NETWORK';
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking if batch is network batch:', error);
      return false;
    }
  }
}

// Export singleton instance
export const batchOrderService = new BatchOrderService();