import { 
  Order, 
  Driver, 
  BatchOrder,
  OrderStatus,
  PaymentMethod,
  BalanceTransaction
} from '../types';
import { apiDebug } from '../config/environment';
import { BatchLeg } from '../types/batchLeg';
import { 
  BackendDelivery, 
  BackendOrder, 
  BackendCustomer, 
  BackendOrderItem,
  BackendDriver,
  BackendBatch,
  BackendTransactionData,
  BackendBatchLeg,
  BackendVariantGroup,
  BackendAddonGroup
} from './apiTypes';

/**
 * API Data Transformers
 * 
 * This file contains all the methods for transforming backend API responses
 * into the frontend TypeScript types used by the mobile app.
 */

// Performance optimization: Only log in development
const perfLog = (message: string, data?: any) => {
  if (__DEV__ && apiDebug) {
    console.log(message, data);
  }
};

export class ApiTransformers {
  /**
   * Transform backend driver data to frontend Driver type
   */
  static transformDriver(driverData: BackendDriver): Driver {
    return {
      id: String(driverData.id),
      firstName: driverData.first_name || driverData.firstName || '',
      lastName: driverData.last_name || driverData.lastName || '',
      email: driverData.email || '',
      phone: driverData.phone || driverData.phone_number || '',
      rating: driverData.rating || 0,
      totalDeliveries: driverData.total_deliveries || 0,
      isOnline: Boolean(driverData.is_available || driverData.is_online),
      profileImage: driverData.profile_image || driverData.avatar || undefined,
      distance: driverData.distance_km,
      vehicleInfo: driverData.vehicle ? {
        type: String(driverData.vehicle?.type || ''),
        model: String(driverData.vehicle?.model || ''),
        licensePlate: String(driverData.vehicle?.license_plate || '')
      } : undefined
    };
  }

  /**
   * Determine order status based on delivery and order data
   */
  static determineOrderStatus(
    delivery: BackendDelivery | null, 
    order: BackendOrder
  ): OrderStatus {
    const deliveryStatus = delivery?.status || delivery?.delivery_status;
    const orderStatus = order.status || order.order_status;
    
    perfLog('Determining order status', { deliveryStatus, orderStatus });

    // Map backend status to frontend OrderStatus enum
    const statusMap: Record<string, OrderStatus> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'accepted': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'assigned': 'assigned',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned',
      'failed': 'failed'
    };

    // Available orders are those that drivers can accept
    if (!delivery?.driver || delivery?.driver === null || delivery?.driver === '') {
      perfLog('Order has no driver assigned - setting status to pending');
      return 'pending';
    }

    // If delivery has a driver, use the delivery status directly
    if (delivery?.driver && deliveryStatus) {
      perfLog('Order has driver - using delivery status', deliveryStatus);
      return deliveryStatus as OrderStatus;
    }

    // Use delivery status if available, then order status, default to pending
    const finalStatus = deliveryStatus || orderStatus || 'pending';
    perfLog('Final order status determined', finalStatus);
    return statusMap[finalStatus] || 'pending';
  }

  /**
   * Transform backend order/delivery data to frontend Order type
   */
  static transformOrder(backendData: unknown): Order {
    // Type guard to safely access properties
    if (!backendData || typeof backendData !== 'object') {
      throw new Error('Invalid backend data provided to transformOrder');
    }
    
    const data = backendData as any;
    
    // Performance: Remove excessive logging
    perfLog('transformOrder input type', { type: data.type, hasBatch: !!data.batch_id });
    
    // Check if this is a batch order from available_orders endpoint
    if (data.type === 'batch' && data.batch_id && data.orders) {
      perfLog('Processing batch order', { orderCount: data.orders.length });
      
      // For batch orders, we need to return the first delivery with batch info
      if (data.orders.length > 0) {
        const firstDelivery = data.orders[0];
        
        // Make sure the delivery has an ID
        if (!firstDelivery.id) {
          console.error('❌ [TRANSFORM] First delivery in batch has no ID!');
          firstDelivery.id = firstDelivery.order?.id || firstDelivery.order || `batch-${data.batch_id}-1`;
        }
        
        const transformedOrder = this.transformOrder(firstDelivery);
        
        // Add batch information
        transformedOrder.current_batch = {
          id: data.batch_id,
          batch_number: data.batch_number,
          name: `Batch ${data.batch_number}`,
          status: 'pending',
          batch_type: data.batch_type || 'regular',
          orders: data.orders.map((d: any) => this.transformOrder(d)),
          is_consolidated: data.is_consolidated || false,
          warehouse_info: data.warehouse_info || null,
          delivery_address_info: data.delivery_address_info || null
        };
        
        // Also add warehouse info to the order itself for easier access
        if (data.warehouse_info) {
          transformedOrder.warehouse_info = data.warehouse_info;
        }
        if (data.is_consolidated) {
          transformedOrder.is_consolidated = data.is_consolidated;
        }
        if (data.delivery_address_info) {
          transformedOrder.delivery_address_info = data.delivery_address_info;
        }
        
        // Override some fields with batch-level data
        transformedOrder.pickup_address = data.pickup_address || transformedOrder.pickup_address;
        transformedOrder.pickup_latitude = data.pickup_latitude || transformedOrder.pickup_latitude;
        transformedOrder.pickup_longitude = data.pickup_longitude || transformedOrder.pickup_longitude;
        
        // Make sure we have contact info
        if (data.pickup_contact_name) {
          transformedOrder.pickup_contact_name = data.pickup_contact_name;
        }
        if (data.pickup_contact_phone) {
          transformedOrder.pickup_contact_phone = data.pickup_contact_phone;
        }
        
        perfLog('Batch order transformed', {
          id: transformedOrder.id,
          batchId: transformedOrder.current_batch.id,
          orderCount: transformedOrder.current_batch.orders?.length
        });
        
        return transformedOrder;
      }
    }
    
    // Check if this is a single order from available_orders endpoint
    if (data.type === 'single') {
      perfLog('Processing single order');
      // Remove the type field and process the rest
      const { type, ...orderData } = data;
      return this.transformOrder(orderData);
    }

    // Handle different backend response formats
    let order: BackendOrder | null = null;
    let delivery: BackendDelivery | null = null;
    
    // Check if this is a delivery object
    if ('order' in data) {
      delivery = data as BackendDelivery;
      
      // If order is just an ID, create a minimal order object
      if (typeof delivery.order === 'number' || typeof delivery.order === 'string') {
        perfLog('Order field is just an ID, creating minimal order object');
        order = {
          id: String(delivery.order),
          order_number: delivery.order_id ? `#${delivery.order_id}` : `#${delivery.order}`,
          customer_name: delivery.customer_name,
          customer_phone: delivery.customer_phone,
          customer_email: delivery.customer_email,
          customer_id: delivery.customer_id,
          customer_details: delivery.customer_details,
          customer: delivery.customer,
          delivery_address: delivery.delivery_address,
          pickup_address: delivery.pickup_address,
          status: delivery.status || delivery.delivery_status,
          // Set default values for amounts since we don't have them
          subtotal: 0,
          delivery_fee: 0,
          tax: 0,
          total: 0,
          items: [],
          created_at: delivery.created_at
        };
      } else if (delivery.order && typeof delivery.order === 'object') {
        order = delivery.order as BackendOrder;
      }
    } else {
      // This is already an order object
      order = data as BackendOrder;
    }

    perfLog('Transforming order data', { hasOrder: !!order, hasDelivery: !!delivery });

    // Enhanced customer data extraction
    let customerData: BackendCustomer = {};
    
    // Handle case where customer is just an ID (needs to be fixed in backend)
    if (order && (typeof order.customer === 'number' || typeof order.customer === 'string')) {
      perfLog('Customer field is just an ID');
      customerData = {
        id: String(order.customer),
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email
      };
    } else {
      customerData = (order?.customer_details as BackendCustomer) ||  // Use customer_details first (contains full object)
                    (order?.customer as BackendCustomer) || 
                    (delivery?.customer_details as BackendCustomer) || 
                    (delivery?.customer as BackendCustomer) || 
                    {};
    }

    // Fallback customer data if missing
    const customer = {
      id: String(customerData.id || order?.customer_id || delivery?.customer_id || order?.customer || `customer_${order?.id || delivery?.id || 'unknown'}`),
      name: customerData.name || 
            customerData.full_name || 
            order?.customer_name || 
            delivery?.customer_name ||
            `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() ||
            (customerData.user?.first_name && customerData.user?.last_name ? 
              `${customerData.user.first_name} ${customerData.user.last_name}` : 
            'Unknown Customer'),
      phone: customerData.phone || 
             customerData.phone_number || 
             order?.customer_phone || 
             delivery?.customer_phone ||
             '',
      email: customerData.email || 
             order?.customer_email || 
             delivery?.customer_email ||
             ''
    };

    // Log if customer data is missing for debugging
    if (!customer.name || customer.name === 'Unknown Customer') {
      if (__DEV__) {
        console.error('❌ [TRANSFORM] Missing customer name!', { orderId: order?.id, deliveryId: delivery?.id });
      }
    }

    // CRITICAL: For available_orders endpoint, the root object IS the delivery
    const primaryId = String(data.id || delivery?.id || order?.id || '');

    if (!primaryId || primaryId === 'undefined' || primaryId === '') {
      console.error('❌ [TRANSFORM] No valid ID found in order data!');
    }
    
    perfLog('ID Resolution', { primaryId });

    // Batch order support - use current_batch structure
    const isBatchDelivery = !!(
      (delivery as BackendDelivery)?.batch_id || 
      (delivery as BackendDelivery)?.batch?.id ||
      data.batch_id || 
      (data as BackendBatch)?.id ||
      order?.current_batch_id
    );

    perfLog('Batch detection', { isBatchDelivery });

    // Transform variant groups
    const transformVariantGroups = (variantGroups: BackendVariantGroup[] = []) => {
      return variantGroups.map(group => ({
        id: String(group.id || ''),
        name: group.name || '',
        options: (group.options || []).map(option => ({
          name: option.name || '',
          price_adjustment: option.price_adjustment || 0
        }))
      }));
    };

    // Transform addon groups
    const transformAddonGroups = (addonGroups: BackendAddonGroup[] = []) => {
      return addonGroups.map(group => ({
        id: String(group.id || ''),
        name: group.name || '',
        addons: (group.addons || []).map(addon => ({
          name: addon.name || '',
          price: addon.price || 0
        }))
      }));
    };

    // Transform order items with variants and addons
    const items = (order?.items || order?.order_items || []).map((item: BackendOrderItem) => ({
      id: String(item.id || Math.random()),
      name: item.name || item.product_details?.name || item.product?.name || 'Unknown Item',
      quantity: item.quantity || 1,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0,
      specialInstructions: item.notes || '',
      variant_groups: transformVariantGroups(item.variant_groups),
      addon_groups: transformAddonGroups(item.addon_groups)
    }));

    // Parse coordinates with better debugging - coordinates are only on order, not delivery
    const parsedCoords = {
      pickup_lat: order?.pickup_latitude ? parseFloat(String(order.pickup_latitude)) : undefined,
      pickup_lng: order?.pickup_longitude ? parseFloat(String(order.pickup_longitude)) : undefined,
      delivery_lat: order?.delivery_latitude ? parseFloat(String(order.delivery_latitude)) : undefined,
      delivery_lng: order?.delivery_longitude ? parseFloat(String(order.delivery_longitude)) : undefined,
    };
    
    perfLog('Parsed coordinates', parsedCoords);

    const baseOrder: Order = {
      // Use the primary ID (delivery ID if available, otherwise order ID)
      id: primaryId,
      deliveryId: primaryId, // Same as id for compatibility
      orderId: order?.id || primaryId, // Original order ID if different
      order_number: order?.order_number || order?.orderNumber || `#${order?.id || delivery?.id || 'N/A'}`,
      customer,
      customer_details: customer, // For backward compatibility
      items,
      delivery_address: delivery?.delivery_address || 
                       order?.delivery_address || 
                       `${customer.name}'s Address`,
      pickup_address: delivery?.pickup_address || order?.pickup_address,
      // Use the parsed coordinates
      pickup_latitude: parsedCoords.pickup_lat,
      pickup_longitude: parsedCoords.pickup_lng,
      delivery_latitude: parsedCoords.delivery_lat,
      delivery_longitude: parsedCoords.delivery_lng,
      
      status: ApiTransformers.determineOrderStatus(delivery, order || {} as BackendOrder),
      payment_method: (order?.payment_method as PaymentMethod) || 'cash',
      
      // Parse amounts as numbers - check order level only
      subtotal: order?.subtotal ? parseFloat(String(order.subtotal)) : 0,
      delivery_fee: order?.delivery_fee ? parseFloat(String(order.delivery_fee)) : 0,
      tax: order?.tax ? parseFloat(String(order.tax)) : 0,
      total: order?.total ? parseFloat(String(order.total)) : 0,
      estimated_delivery_time: delivery?.estimated_delivery_time || order?.scheduled_delivery_time || '',
      delivery_notes: order?.delivery_notes || '',
      created_at: order?.created_at ? new Date(order.created_at) : delivery?.created_at ? new Date(delivery.created_at) : new Date(),
      // Add delivery-specific fields if this is a delivery object
      driverId: delivery?.driver || undefined,
      driverName: delivery?.driver_name || undefined,
      
      // Batch order support - use current_batch structure
      current_batch: order?.current_batch || null,
      consolidation_warehouse_id: order?.consolidation_warehouse_id,
      final_delivery_address: order?.final_delivery_address,
      final_delivery_latitude: order?.final_delivery_latitude ? parseFloat(String(order.final_delivery_latitude)) : undefined,
      final_delivery_longitude: order?.final_delivery_longitude ? parseFloat(String(order.final_delivery_longitude)) : undefined,
      
      // QR Code fields
      qr_code_id: order?.qr_code_id || undefined,
      qr_code_url: order?.qr_code_url || undefined,
    };

    // If this is a batch order, try to determine batch size from available data
    if (isBatchDelivery && order?.consolidation_batch_id) {
      // For now, we'll estimate batch size from other indicators
      const estimatedBatchSize = order?.batchSize || 
                                order?.orders?.length || 
                                2; // Default estimate
      
      return {
        ...baseOrder,
        batchSize: estimatedBatchSize,
      } as Order;
    }

    const finalOrder = baseOrder as Order;
    
    perfLog('Final transformed order', {
      id: finalOrder.id,
      orderNumber: finalOrder.order_number,
      status: finalOrder.status
    });
    
    return finalOrder;
  }

  /**
   * Transform backend batch data to frontend BatchOrder type
   */
  static transformBatchOrder(backendBatch: BackendBatch): BatchOrder {
    const orders = (backendBatch.orders || []).map((order: BackendOrder) => this.transformOrder(order));
    
    return {
      id: backendBatch.id,
      batch_number: backendBatch.batch_number,
      status: backendBatch.status as OrderStatus,
      order_number: `BATCH-${backendBatch.id}`,
      created_at: backendBatch.created_at ? new Date(backendBatch.created_at) : new Date(),
      current_batch: {
        id: backendBatch.id,
        batch_number: backendBatch.batch_number || '',
        name: backendBatch.name || `Batch ${backendBatch.id}`,
        status: backendBatch.status || 'pending',
        batch_type: backendBatch.batch_type || 'regular',
        orders
      },
      warehouseInfo: backendBatch.location ? {
        id: String(backendBatch.location_id || ''),
        name: backendBatch.location,
        address: backendBatch.location_address || '',
        latitude: backendBatch.location_latitude ? parseFloat(String(backendBatch.location_latitude)) : undefined,
        longitude: backendBatch.location_longitude ? parseFloat(String(backendBatch.location_longitude)) : undefined,
      } : undefined,
      
      // Location info - these are part of the base Order interface
      pickup_latitude: backendBatch.pickup_latitude ? parseFloat(String(backendBatch.pickup_latitude)) : undefined,
      pickup_longitude: backendBatch.pickup_longitude ? parseFloat(String(backendBatch.pickup_longitude)) : undefined,
      delivery_latitude: backendBatch.delivery_latitude ? parseFloat(String(backendBatch.delivery_latitude)) : undefined,
      delivery_longitude: backendBatch.delivery_longitude ? parseFloat(String(backendBatch.delivery_longitude)) : undefined,
      pickup_address: backendBatch.pickup_address,
      delivery_address: backendBatch.delivery_address,
    };
  }

  /**
   * Transform backend transaction data to frontend BalanceTransaction type
   */
  static transformTransaction(transaction: BackendTransactionData): BalanceTransaction {
    return {
      id: transaction.id || String(Math.random()),
      type: (transaction.transaction_type || transaction.type || 'earning') as BalanceTransaction['type'],
      amount: Number(transaction.amount || 0),
      description: transaction.description || 'Transaction',
      date: transaction.created_at ? new Date(transaction.created_at) : new Date(),
      status: (transaction.status || 'completed') as BalanceTransaction['status'],
      orderId: transaction.orderId || transaction.order_id
    };
  }

  /**
   * Transform backend batch leg to frontend BatchLeg type
   */
  static transformBatchLeg(data: unknown): BatchLeg {
    const batchLegData = data as BackendBatchLeg;
    return {
      id: batchLegData.id || '',
      leg_number: batchLegData.leg_number || batchLegData.batch_number || '',
      leg_type: (batchLegData.leg_type || 'direct') as 'pickup' | 'direct' | 'multi_stop',
      status: (batchLegData.status || 'available') as 'available' | 'assigned' | 'in_progress' | 'completed',
      
      // Batch information
      batch: {
        id: batchLegData.batch_id || batchLegData.id || '',
        batch_number: batchLegData.batch_number || '',
        name: batchLegData.batch_name || `Batch ${batchLegData.batch_number}`,
        customer: {
          id: batchLegData.customer_id || '',
          name: batchLegData.customer_name || 'Unknown Customer'
        },
        total_orders: batchLegData.order_count || 0,
        total_value: batchLegData.total_value || 0
      },
      
      // Leg details
      stops_count: batchLegData.stops_count || batchLegData.destinations?.length || 1,
      distance_km: batchLegData.distance_km || batchLegData.estimated_distance_km || 0,
      estimated_duration: batchLegData.estimated_duration || batchLegData.estimated_duration_minutes || 0,
      
      // Origin (pickup point)
      origin_type: (batchLegData.origin_type || 'warehouse') as 'customer' | 'warehouse' | 'hub',
      origin_location: {
        address: batchLegData.start_location || batchLegData.pickup_address || '',
        latitude: batchLegData.start_coordinates?.latitude,
        longitude: batchLegData.start_coordinates?.longitude,
        contact: batchLegData.origin_contact
      },
      
      // Destinations (delivery points)
      destinations: batchLegData.destinations || [{
        address: batchLegData.end_location || batchLegData.delivery_address || '',
        latitude: batchLegData.end_coordinates?.latitude,
        longitude: batchLegData.end_coordinates?.longitude,
        contact: batchLegData.destination_contact
      }],
      
      // Requirements
      total_weight: batchLegData.total_weight,
      total_volume: batchLegData.total_volume,
      required_vehicle_type: batchLegData.required_vehicle_type as 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck' | undefined,
      requires_temperature_control: batchLegData.requires_temperature_control || batchLegData.requires_refrigeration || false,
      contains_fragile: batchLegData.contains_fragile || false,
      
      // Earnings
      estimated_earnings: batchLegData.estimated_earnings,
      
      // Timing
      created_at: batchLegData.created_at || new Date().toISOString(),
      pickup_deadline: batchLegData.pickup_deadline || batchLegData.scheduled_start_time,
      delivery_deadline: batchLegData.delivery_deadline || batchLegData.scheduled_end_time
    };
  }
}