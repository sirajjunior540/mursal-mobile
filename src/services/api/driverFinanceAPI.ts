/**
 * Driver Finance API Service
 * Handles all financial operations for drivers including cash management
 */
import { apiCall } from '../../utils/api';

export interface DriverBalance {
  current_balance: {
    cash_in_hand: number;
    company_liability: number;
    earnings_balance: number;
    net_position: number;
  };
  today_summary: {
    collections: number;
    remittances: number;
    net_change: number;
  };
  limits: {
    daily_limit: number;
    remaining_capacity: number;
    can_accept_cod: boolean;
  };
  pending: {
    cod_orders: number;
  };
  status: {
    is_blocked: boolean;
    block_reason: string;
  };
}

export interface CashTransaction {
  id: string;
  transaction_type: 'cod_collection' | 'delivery_fee' | 'remittance' | 'settlement' | 'tip';
  amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  description: string;
  order?: {
    order_number: string;
    customer_name: string;
  };
  status: 'pending' | 'completed' | 'reversed' | 'disputed';
  transaction_date: string;
  reference_number?: string;
}

export interface RemittanceRequest {
  amount: number;
  payment_method: 'cash' | 'bank_deposit' | 'wallet';
  reference_number?: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SettlementSummary {
  period: {
    start: string;
    end: string;
  };
  earnings: {
    delivery_earnings: number;
    bonus_earnings: number;
    tip_earnings: number;
    total: number;
  };
  deductions: {
    fuel: number;
    vehicle: number;
    other: number;
    total: number;
  };
  cash_flow: {
    collections: number;
    remittances: number;
    outstanding: number;
  };
  settlement_amount: number;
  status: 'pending' | 'processed' | 'paid';
}

export const driverFinanceAPI = {
  /**
   * Get current driver balance and cash status
   */
  getDriverBalance: () =>
    apiCall<DriverBalance>({
      method: 'GET',
      endpoint: '/api/v1/accounting/driver/balance/',
    }),

  /**
   * Get driver's transaction history
   */
  getTransactionHistory: (params?: {
    transaction_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
  }) =>
    apiCall<{ results: CashTransaction[]; count: number }>({
      method: 'GET',
      endpoint: '/api/v1/accounting/driver/transactions/',
      params: { ...params, page_size: 20 },
    }),

  /**
   * Submit cash remittance
   */
  submitRemittance: (data: RemittanceRequest) =>
    apiCall<{
      transaction_id: string;
      reference_number: string;
      new_balance: number;
    }>({
      method: 'POST',
      endpoint: '/api/v1/accounting/driver/remit/',
      data,
    }),

  /**
   * Get pending COD orders
   */
  getPendingCODOrders: () =>
    apiCall<{
      results: Array<{
        order_number: string;
        customer_name: string;
        cod_amount: number;
        delivery_fee: number;
        total_to_collect: number;
        status: string;
      }>;
      total_amount: number;
    }>({
      method: 'GET',
      endpoint: '/api/v1/accounting/driver/pending-cod/',
    }),

  /**
   * Get driver settlements
   */
  getSettlements: (params?: { status?: string; page?: number }) =>
    apiCall<{ results: SettlementSummary[]; count: number }>({
      method: 'GET',
      endpoint: '/api/v1/accounting/driver/settlements/',
      params: { ...params, page_size: 10 },
    }),

  /**
   * Get settlement details
   */
  getSettlementDetails: (settlementId: string) =>
    apiCall<SettlementSummary & {
      line_items: Array<{
        description: string;
        amount: number;
        type: 'earning' | 'deduction';
      }>;
    }>({
      method: 'GET',
      endpoint: `/api/v1/accounting/driver/settlements/${settlementId}/`,
    }),

  /**
   * Get daily cash report
   */
  getDailyCashReport: (date?: string) =>
    apiCall<{
      report_date: string;
      opening_cash: number;
      cod_collections: number;
      delivery_fee_collections: number;
      tip_collections: number;
      total_collections: number;
      cash_remitted: number;
      closing_cash: number;
      cod_order_count: number;
      total_order_count: number;
      is_reconciled: boolean;
    }>({
      method: 'GET',
      endpoint: '/api/v1/accounting/driver/daily-report/',
      params: date ? { date } : undefined,
    }),

  /**
   * Check if driver can accept COD order
   */
  checkCODEligibility: (orderAmount: number) =>
    apiCall<{
      can_accept: boolean;
      reason?: string;
      current_balance: number;
      daily_limit: number;
      remaining_capacity: number;
    }>({
      method: 'POST',
      endpoint: '/api/v1/accounting/driver/check-cod-eligibility/',
      data: { order_amount: orderAmount },
    }),

  /**
   * Report cash discrepancy
   */
  reportDiscrepancy: (data: {
    expected_amount: number;
    actual_amount: number;
    reason: string;
    details?: string;
  }) =>
    apiCall<{ report_id: string; status: string }>({
      method: 'POST',
      endpoint: '/api/v1/accounting/driver/report-discrepancy/',
      data,
    }),

  /**
   * Get remittance locations (company cash collection points)
   */
  getRemittanceLocations: () =>
    apiCall<{
      locations: Array<{
        id: string;
        name: string;
        address: string;
        latitude: number;
        longitude: number;
        operating_hours: string;
        contact_phone: string;
      }>;
    }>({
      method: 'GET',
      endpoint: '/api/v1/accounting/remittance-locations/',
    }),
};