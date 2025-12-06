import { API_CONFIG } from '../config/environment';
import { 
  DistributionBatch, 
  DistributionBatchWithOrders,
  DistributionAcceptancePayload,
  DistributionStatusUpdatePayload
} from '../types/distribution.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

class DistributionService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}/api/v1/delivery`;
  }

  /**
   * Get available distribution batches for the driver
   * Filters based on driver type (local/network)
   */
  async getAvailableDistributions(): Promise<DistributionBatch[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/available/`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch distributions');
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Error fetching available distributions:', error);
      throw error;
    }
  }

  /**
   * Get distribution batch details with orders
   */
  async getDistributionDetails(distributionId: string): Promise<DistributionBatchWithOrders> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${distributionId}/details/`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch distribution details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching distribution details:', error);
      throw error;
    }
  }

  /**
   * Accept a distribution batch
   */
  async acceptDistribution(payload: DistributionAcceptancePayload): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${payload.distribution_id}/accept/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to accept distribution');
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting distribution:', error);
      throw error;
    }
  }

  /**
   * Decline a distribution batch
   */
  async declineDistribution(distributionId: string, reason?: string): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${distributionId}/decline/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to decline distribution');
      }

      return await response.json();
    } catch (error) {
      console.error('Error declining distribution:', error);
      throw error;
    }
  }

  /**
   * Update distribution status
   */
  async updateDistributionStatus(payload: DistributionStatusUpdatePayload): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${payload.distribution_id}/update_status/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update distribution status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating distribution status:', error);
      throw error;
    }
  }

  /**
   * Get active distributions for the driver
   */
  async getActiveDistributions(): Promise<DistributionBatch[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/active/`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch active distributions');
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Error fetching active distributions:', error);
      throw error;
    }
  }

  /**
   * Mark distribution as arrived at destination
   */
  async markArrivedAtDestination(distributionId: string, location?: { latitude: number; longitude: number }): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${distributionId}/arrived/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ location })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to mark arrival');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking arrival:', error);
      throw error;
    }
  }

  /**
   * Complete a distribution batch
   */
  async completeDistribution(distributionId: string, completionData: {
    proof_of_delivery?: string;
    signature?: string;
    notes?: string;
    location?: { latitude: number; longitude: number };
  }): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${distributionId}/complete/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(completionData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to complete distribution');
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing distribution:', error);
      throw error;
    }
  }

  /**
   * Get distribution route optimization
   */
  async getOptimizedRoute(distributionId: string): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${distributionId}/route/`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch optimized route');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching optimized route:', error);
      throw error;
    }
  }

  /**
   * Report an issue with distribution
   */
  async reportDistributionIssue(distributionId: string, issueData: {
    issue_type: 'damaged' | 'missing' | 'wrong_address' | 'customer_unavailable' | 'other';
    description: string;
    photos?: string[];
    location?: { latitude: number; longitude: number };
  }): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/distributions/${distributionId}/report_issue/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(issueData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to report issue');
      }

      return await response.json();
    } catch (error) {
      console.error('Error reporting distribution issue:', error);
      throw error;
    }
  }

  /**
   * Check if distribution is for network transfer (warehouse to warehouse)
   */
  isNetworkTransfer(distribution: DistributionBatch): boolean {
    return distribution.distribution_type === 'network' && !!distribution.target_warehouse_id;
  }

  /**
   * Check if distribution is local delivery
   */
  isLocalDelivery(distribution: DistributionBatch): boolean {
    return distribution.distribution_type === 'local' || distribution.distribution_type === 'zone';
  }

  /**
   * Format distribution type for display
   */
  formatDistributionType(distribution: DistributionBatch): string {
    if (this.isNetworkTransfer(distribution)) {
      return `Network Transfer to ${distribution.target_warehouse_name || 'Warehouse'}`;
    }
    
    switch (distribution.distribution_type) {
      case 'local':
        return 'Local Delivery';
      case 'zone':
        return 'Zone Delivery';
      case 'express':
        return 'Express Delivery';
      case 'scheduled':
        return 'Scheduled Delivery';
      default:
        return 'Distribution';
    }
  }

  /**
   * Get status color for distribution
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'preparing':
        return '#FFA500'; // Orange
      case 'ready_for_dispatch':
      case 'driver_assigned':
        return '#4CAF50'; // Green
      case 'dispatched':
      case 'in_transit':
        return '#FF6B00'; // Brand orange
      case 'arrived':
      case 'delivering':
        return '#9C27B0'; // Purple
      case 'completed':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#757575'; // Grey
    }
  }
}

export const distributionService = new DistributionService();
