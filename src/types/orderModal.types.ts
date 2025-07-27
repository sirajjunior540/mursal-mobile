// Types specific to IncomingOrderModal and order-related components

import { BatchOrder, SpecialHandling, Customer } from './index';

// Extended Order interface to handle backend responses
// This is now just an alias for BatchOrder as it has all the required properties
export type ExtendedOrder = BatchOrder;

// Individual order within a batch
export interface BatchOrderItem {
  id: string;
  order_number?: string;
  customer?: Customer;
  customer_details?: Customer;
  delivery_address?: string;
  total?: number;
  cash_on_delivery?: boolean;
  cod_amount?: number;
  requires_signature?: boolean;
  special_handling?: SpecialHandling | {
    fragile?: boolean;
    temperature_controlled?: boolean;
    hazardous?: boolean;
    liquid?: boolean;
    perishable?: boolean;
  };
  warehouse_info?: {
    warehouse_address?: string;
  };
  consolidation_warehouse_address?: string;
}

// Route stop type for batch order navigation
export interface RouteStop {
  id: string;
  type: 'pickup' | 'delivery';
  address: string;
  orderNumber?: string;
  customerName?: string;
}

// Extended batch properties with proper typing
export interface ExtendedBatchProperties {
  batchId: string;
  batchNumber: string;
  batchName: string;
  batchStatus: string;
  batchType: string;
  orders?: BatchOrderItem[];
  warehouseInfo?: any;
  routingStrategy?: any;
  batchMetadata?: any;
  consolidationWarehouseId?: string;
  consolidationBatchId?: string;
  finalDeliveryAddress?: string;
}