/**
 * Warehouse API Service
 * Handles all warehouse-related API calls
 */
import { apiCall } from '../../utils/api';

export interface WarehouseStats {
  pendingHandoffs: number;
  todayProcessed: number;
  activeConsolidations: number;
  totalPackages: number;
}

export interface HandoffSummary {
  id: string;
  handoff_code: string;
  batch_name: string;
  driver_name: string;
  package_count: number;
  created_at: string;
  status: string;
}

export interface HandoffDetails {
  id: string;
  handoff_code: string;
  batch: {
    id: string;
    name: string;
    total_packages: number;
    total_value: number;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicle_type: string;
  };
  package_count: number;
  verified_count: number;
  status: string;
  created_at: string;
  notes?: string;
  packages: Array<{
    order_number: string;
    customer_name: string;
    delivery_address: string;
    special_handling?: string;
    cod_amount?: number;
    is_verified: boolean;
  }>;
}

export const warehouseAPI = {
  /**
   * Get warehouse dashboard stats
   */
  getWarehouseStats: () =>
    apiCall<WarehouseStats>({
      method: 'GET',
      endpoint: '/api/v1/delivery/warehouse-handoffs/stats/',
    }),

  /**
   * Get pending handoffs
   */
  getPendingHandoffs: (page = 1) =>
    apiCall<{ results: HandoffSummary[]; count: number }>({
      method: 'GET',
      endpoint: '/api/v1/delivery/warehouse-handoffs/',
      params: { status: 'pending', page, page_size: 10 },
    }),

  /**
   * Get all handoffs with filtering
   */
  getAllHandoffs: (filters?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    driver?: string;
    page?: number;
  }) =>
    apiCall<{ results: HandoffSummary[]; count: number }>({
      method: 'GET',
      endpoint: '/api/v1/delivery/warehouse-handoffs/',
      params: { ...filters, page_size: 20 },
    }),

  /**
   * Get handoff details
   */
  getHandoffDetails: (handoffId: string) =>
    apiCall<HandoffDetails>({
      method: 'GET',
      endpoint: `/api/v1/delivery/warehouse-handoffs/${handoffId}/`,
    }),

  /**
   * Verify handoff by code
   */
  verifyHandoff: (handoffCode: string) =>
    apiCall<HandoffDetails>({
      method: 'POST',
      endpoint: '/api/v1/delivery/warehouse-handoffs/verify/',
      data: { handoff_code: handoffCode },
    }),

  /**
   * Complete handoff verification
   */
  completeHandoff: (handoffId: string, data: {
    verified_packages: string[];
    notes?: string;
  }) =>
    apiCall<{ success: boolean; message: string }>({
      method: 'POST',
      endpoint: `/api/v1/delivery/warehouse-handoffs/${handoffId}/complete/`,
      data,
    }),

  /**
   * Report handoff issue
   */
  reportHandoffIssue: (handoffId: string, data: {
    issue_type: 'missing_package' | 'damaged_package' | 'wrong_package' | 'other';
    description: string;
    affected_packages?: string[];
  }) =>
    apiCall<{ success: boolean; issue_id: string }>({
      method: 'POST',
      endpoint: `/api/v1/delivery/warehouse-handoffs/${handoffId}/report_issue/`,
      data,
    }),

  /**
   * Get active consolidations
   */
  getActiveConsolidations: () =>
    apiCall<{
      results: Array<{
        id: string;
        name: string;
        package_count: number;
        ready_for_dispatch: boolean;
        created_at: string;
      }>;
    }>({
      method: 'GET',
      endpoint: '/api/v1/delivery/consolidation-batches/',
      params: { status: 'processing' },
    }),

  /**
   * Create consolidation batch
   */
  createConsolidation: (data: {
    name: string;
    warehouse_id: string;
    target_zone?: string;
  }) =>
    apiCall<{ id: string; name: string }>({
      method: 'POST',
      endpoint: '/api/v1/delivery/consolidation-batches/',
      data,
    }),

  /**
   * Add packages to consolidation
   */
  addToConsolidation: (consolidationId: string, packageIds: string[]) =>
    apiCall<{ success: boolean; added_count: number }>({
      method: 'POST',
      endpoint: `/api/v1/delivery/consolidation-batches/${consolidationId}/add_packages/`,
      data: { package_ids: packageIds },
    }),

  /**
   * Dispatch consolidation batch
   */
  dispatchConsolidation: (consolidationId: string, driverId: string) =>
    apiCall<{ success: boolean; handoff_code: string }>({
      method: 'POST',
      endpoint: `/api/v1/delivery/consolidation-batches/${consolidationId}/dispatch/`,
      data: { driver_id: driverId },
    }),

  /**
   * Get warehouse inventory
   */
  getWarehouseInventory: (warehouseId?: string) =>
    apiCall<{
      total_packages: number;
      by_status: Record<string, number>;
      by_zone: Record<string, number>;
      storage_utilization: number;
    }>({
      method: 'GET',
      endpoint: '/api/v1/delivery/warehouse-inventory/',
      params: warehouseId ? { warehouse_id: warehouseId } : {},
    }),

  /**
   * Search packages by barcode or order number
   */
  searchPackages: (query: string) =>
    apiCall<{
      results: Array<{
        order_number: string;
        barcode: string;
        status: string;
        location: string;
        customer_name: string;
        delivery_address: string;
      }>;
    }>({
      method: 'GET',
      endpoint: '/api/v1/delivery/warehouse-inventory/search/',
      params: { q: query },
    }),
};