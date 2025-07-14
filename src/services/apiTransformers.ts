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
  BackendBatchLeg
} from './apiTypes';

/**
 * API Data Transformers
 * 
 * This file contains all the methods for transforming backend API responses
 * into the frontend TypeScript types used by the mobile app.
 */

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
    
    apiDebug('🔍 Determining order status:', {
      deliveryStatus,
      orderStatus,
      hasDriver: !!delivery?.driver,
      driverId: delivery?.driver
    });

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
      apiDebug('📋 Order has no driver assigned - setting status to pending');
      return 'pending';
    }

    // If delivery has a driver, use the delivery status directly
    if (delivery?.driver && deliveryStatus) {
      apiDebug(`🚛 Order has driver - using delivery status: ${deliveryStatus}`);
      return deliveryStatus as OrderStatus;
    }

    // Use delivery status if available, then order status, default to pending
    const finalStatus = deliveryStatus || orderStatus || 'pending';
    apiDebug(`✅ Final order status: ${finalStatus}`);
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
    
    const data = backendData as BackendOrder | BackendDelivery;
    apiDebug('🔄 transformOrder input:', {
      hasId: !!data.id,
      hasOrder: !!('order' in data && data.order && typeof data.order === 'object'),
      hasDriver: 'driver' in data,
      topLevelKeys: Object.keys(data).slice(0, 10)
    });

    // Use type-safe extraction utilities - simplified inline
    const isDelivery = 'order' in data && data.order && typeof data.order === 'object';
    const order = isDelivery ? (data as BackendDelivery).order as BackendOrder : (data as BackendOrder);
    const delivery = isDelivery ? (data as BackendDelivery) : null;

    apiDebug('🔍 Transforming order data:', {
      isDelivery,
      hasOrder: !!order,
      orderId: order?.id,
      hasCustomer: !!(order?.customer || order?.customer_details),
      backendDataKeys: Object.keys(backendData),
      orderKeys: order ? Object.keys(order) : []
    });

    // Enhanced customer data extraction with debugging
    apiDebug('🔍 Customer data extraction:', {
      'order.customer': order.customer,
      'order.customer_details': order.customer_details,
      'order.customer_name': order.customer_name,
      'order.customer_id': order.customer_id,
      'delivery?.customer': delivery?.customer,
      'customerIsId': typeof order.customer === 'number' || typeof order.customer === 'string',
      'hasCustomerDetails': !!order.customer_details,
      'customerDetailsKeys': order.customer_details ? Object.keys(order.customer_details) : []
    });

    let customerData: BackendCustomer = {};
    
    // Handle case where customer is just an ID (needs to be fixed in backend)
    if (typeof order.customer === 'number' || typeof order.customer === 'string') {
      apiDebug('⚠️ Customer field is just an ID, not an object. Backend should return customer_details.');
      customerData = {
        id: String(order.customer),
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email
      };
    } else {
      customerData = (order.customer_details as BackendCustomer) ||  // Use customer_details first (contains full object)
                    (order.customer as BackendCustomer) || 
                    (delivery?.customer_details as BackendCustomer) || 
                    (delivery?.customer as BackendCustomer) || 
                    {};
    }

    // Fallback customer data if missing
    const customer = {
      id: String(customerData.id || order.customer_id || delivery?.customer_id || order.customer || `customer_${order.id || 'unknown'}`),
      name: customerData.name || 
            customerData.full_name || 
            order.customer_name || 
            delivery?.customer_name ||
            `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() ||
            (customerData.user?.first_name && customerData.user?.last_name ? 
              `${customerData.user.first_name} ${customerData.user.last_name}` : 
            'Unknown Customer'),
      phone: customerData.phone || 
             customerData.phone_number || 
             order.customer_phone || 
             delivery?.customer_phone ||
             '',
      email: customerData.email || 
             order.customer_email || 
             delivery?.customer_email ||
             ''
    };

    // Log if customer data is missing for debugging
    if (!customer.name || customer.name === 'Unknown Customer') {
      apiDebug('⚠️ Missing customer data in order:', {
        orderId: order.id,
        backendData: JSON.stringify(backendData, null, 2),
        extractedCustomer: customer
      });
    }

    // CRITICAL: For available_orders endpoint, the root object IS the delivery
    // So backendData.id is the delivery ID we need for accept/decline
    const primaryId = String(data.id || delivery?.id || order?.id || '');

    apiDebug('🆔 ID Resolution:', {
      primaryId,
      backendDataId: data.id,
      deliveryId: delivery?.id,
      orderId: order?.id,
      isFromAvailableOrders: !delivery && data.id && 'order' in data
    });

    // Batch order support - use current_batch structure
    const isBatchDelivery = !!(
      (delivery as BackendDelivery)?.batch_id || 
      (delivery as BackendDelivery)?.batch?.id ||
      data.batch_id || 
      (data as BackendBatch)?.id ||
      order?.current_batch_id
    );

    apiDebug('🔍 Batch detection:', {
      isBatchDelivery,
      deliveryBatchId: (delivery as BackendDelivery)?.batch_id,
      orderBatchId: order?.current_batch_id,
      backendBatchId: data.batch_id
    });

    // Transform order items
    const items = (order?.items || order?.order_items || []).map((item: BackendOrderItem) => ({
      id: String(item.id || Math.random()),
      name: item.name || item.product_details?.name || item.product?.name || 'Unknown Item',
      quantity: item.quantity || 1,
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0,
      specialInstructions: item.notes || ''
    }));

    // Calculate estimated delivery time based on various time fields
    // (This is now directly assigned in the order object below)

    const baseOrder: Order = {
      // Use the primary ID (delivery ID if available, otherwise order ID)
      id: primaryId,
      deliveryId: primaryId, // Same as id for compatibility
      orderId: order?.id || primaryId, // Original order ID if different
      order_number: order?.order_number || order?.orderNumber || `#${order?.id || 'N/A'}`,
      customer,
      customer_details: customer, // For backward compatibility
      items,
      delivery_address: delivery?.delivery_address || 
                       order?.delivery_address || 
                       `${customer.name}'s Address`,
      pickup_address: delivery?.pickup_address || order?.pickup_address,
      // Parse coordinates as floats
      pickup_latitude: order?.pickup_latitude ? parseFloat(String(order.pickup_latitude)) : undefined,
      pickup_longitude: order?.pickup_longitude ? parseFloat(String(order.pickup_longitude)) : undefined,
      delivery_latitude: order?.delivery_latitude ? parseFloat(String(order.delivery_latitude)) : undefined,
      delivery_longitude: order?.delivery_longitude ? parseFloat(String(order.delivery_longitude)) : undefined,
      
      status: this.determineOrderStatus(delivery, order),
      payment_method: (order?.payment_method as PaymentMethod) || 'cash',
      
      // Parse amounts as numbers
      subtotal: order.subtotal ? parseFloat(String(order.subtotal)) : 0,
      delivery_fee: order.delivery_fee ? parseFloat(String(order.delivery_fee)) : 0,
      tax: order.tax ? parseFloat(String(order.tax)) : 0,
      total: order.total ? parseFloat(String(order.total)) : 0,
      estimated_delivery_time: delivery?.estimated_delivery_time || order.scheduled_delivery_time || '',
      delivery_notes: order.delivery_notes || '',
      created_at: order.created_at ? new Date(order.created_at) : new Date(),
      // Add delivery-specific fields if this is a delivery object
      driverId: delivery?.driver || undefined,
      driverName: delivery?.driver_name || undefined,
      
      // Batch order support - use current_batch structure
      current_batch: order?.current_batch || null,
      consolidation_warehouse_id: order?.consolidation_warehouse_id,
      final_delivery_address: order.final_delivery_address,
      final_delivery_latitude: order.final_delivery_latitude ? parseFloat(String(order.final_delivery_latitude)) : undefined,
      final_delivery_longitude: order.final_delivery_longitude ? parseFloat(String(order.final_delivery_longitude)) : undefined,
      // Add batch orders if this is a batch
      // Note: 'orders' property is defined in BatchOrder interface but not in base Order
    };

    // If this is a batch order, try to determine batch size from available data
    if (isBatchDelivery && order?.consolidation_batch_id) {
      // For now, we'll estimate batch size from other indicators
      // In a real implementation, this would come from the backend
      const estimatedBatchSize = order?.batchSize || 
                                order?.orders?.length || 
                                2; // Default estimate
      
      return {
        ...baseOrder,
        batchSize: estimatedBatchSize,
      } as Order;
    }

    return baseOrder as Order;
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