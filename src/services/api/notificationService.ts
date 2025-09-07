/**
 * Notification API Service
 * Handles all notification-related API calls with the backend
 */
import { ApiResponse } from '../apiTypes';
import { HttpClient } from '../api';

// Types for notifications
export interface NotificationData {
  id: number;
  notification_type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  localized_content: {
    title: string;
    message: string;
  };
  action_type: string;
  action_value?: string;
  icon?: string;
  order_id?: string;
  batch_id?: string;
  store_id?: string;
  driver_id?: string;
  data: any;
  metadata: any;
  is_read: boolean;
  is_archived: boolean;
  is_dismissed: boolean;
  push_sent: boolean;
  push_delivered: boolean;
  push_opened: boolean;
  created_at: string;
  read_at?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  scheduled_for?: string;
  expires_at?: string;
  time_ago: string;
  is_expired: boolean;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationData[];
  summary: {
    total: number;
    unread: number;
  };
}

export interface NotificationSummary {
  total: number;
  unread: number;
  high_priority_unread: number;
  types_this_week: Record<string, number>;
}

export interface NotificationPreferences {
  id: number;
  enable_push_notifications: boolean;
  enable_sms_notifications: boolean;
  enable_email_notifications: boolean;
  enable_in_app_notifications: boolean;
  notify_order_created: boolean;
  notify_order_confirmed: boolean;
  notify_order_assigned: boolean;
  notify_order_preparing: boolean;
  notify_order_ready: boolean;
  notify_order_picked_up: boolean;
  notify_order_out_for_delivery: boolean;
  notify_order_delivered: boolean;
  notify_order_cancelled: boolean;
  notify_order_refunded: boolean;
  notify_batch_created: boolean;
  notify_batch_assigned: boolean;
  notify_batch_collected: boolean;
  notify_batch_at_warehouse: boolean;
  notify_batch_out_for_delivery: boolean;
  notify_batch_completed: boolean;
  notify_driver_assigned: boolean;
  notify_driver_location_updates: boolean;
  notify_payment_processed: boolean;
  notify_payment_failed: boolean;
  notify_payment_refunded: boolean;
  notify_promotion_available: boolean;
  notify_discount_applied: boolean;
  notify_voucher_expired: boolean;
  notify_system_alerts: boolean;
  notify_system_maintenance: boolean;
  notify_new_restaurant: boolean;
  notify_menu_updates: boolean;
  notify_franchise_orders: boolean;
  notify_network_consolidation: boolean;
  notify_warehouse_arrival: boolean;
  notify_delivery_updates: boolean;
  notify_delivery_delayed: boolean;
  notify_delivery_rescheduled: boolean;
  enable_notification_sound: boolean;
  enable_notification_vibration: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  respect_quiet_hours: boolean;
  minimum_priority: 'low' | 'normal' | 'high' | 'urgent';
  notification_language: 'en' | 'ar';
  max_notifications_per_hour: number;
  max_notifications_per_day: number;
  active_fcm_tokens_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  is_read?: boolean;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

class NotificationApiService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }

  /**
   * Get list of notifications with pagination and filtering
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<ApiResponse<NotificationListResponse>> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      if (filters.is_read !== undefined) {
        queryParams.append('is_read', filters.is_read.toString());
      }
      if (filters.type) {
        queryParams.append('type', filters.type);
      }
      if (filters.priority) {
        queryParams.append('priority', filters.priority);
      }
      if (filters.from_date) {
        queryParams.append('from_date', filters.from_date);
      }
      if (filters.to_date) {
        queryParams.append('to_date', filters.to_date);
      }
      if (filters.page) {
        queryParams.append('page', filters.page.toString());
      }
      if (filters.page_size) {
        queryParams.append('page_size', filters.page_size.toString());
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      if (filters.ordering) {
        queryParams.append('ordering', filters.ordering);
      }

      const endpoint = `notifications/?${queryParams.toString()}`;
      return this.httpClient.get<NotificationListResponse>(endpoint);
    } catch (error) {
      console.error('[NotificationService] Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get a specific notification by ID
   */
  async getNotification(notificationId: number): Promise<ApiResponse<NotificationData>> {
    try {
      return this.httpClient.get<NotificationData>(`notifications/${notificationId}/`);
    } catch (error) {
      console.error('[NotificationService] Error getting notification:', error);
      throw error;
    }
  }

  /**
   * Mark a specific notification as read
   */
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<{ message: string; notification_id: number; read_at: string }>> {
    try {
      return this.httpClient.post<{ message: string; notification_id: number; read_at: string }>(`notifications/${notificationId}/read/`);
    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<{ message: string; count: number }>> {
    try {
      return this.httpClient.post<{ message: string; count: number }>('notifications/mark-all-read/');
    } catch (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Dismiss/archive a specific notification
   */
  async dismissNotification(notificationId: number): Promise<ApiResponse<{ message: string; notification_id: number }>> {
    try {
      return this.httpClient.delete<{ message: string; notification_id: number }>(`notifications/${notificationId}/dismiss/`);
    } catch (error) {
      console.error('[NotificationService] Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications (archive them)
   */
  async clearAllNotifications(): Promise<ApiResponse<{ message: string; count: number }>> {
    try {
      return this.httpClient.post<{ message: string; count: number }>('notifications/clear-all/');
    } catch (error) {
      console.error('[NotificationService] Error clearing all notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification summary/statistics
   */
  async getNotificationSummary(): Promise<ApiResponse<NotificationSummary>> {
    try {
      return this.httpClient.get<NotificationSummary>('notifications/summary/');
    } catch (error) {
      console.error('[NotificationService] Error getting notification summary:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    try {
      return this.httpClient.get<NotificationPreferences>('notifications/preferences/');
    } catch (error) {
      console.error('[NotificationService] Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<{ message: string; preferences: NotificationPreferences }>> {
    try {
      return this.httpClient.put<{ message: string; preferences: NotificationPreferences }>('notifications/preferences/', preferences);
    } catch (error) {
      console.error('[NotificationService] Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update FCM token for push notifications
   */
  async updateFCMToken(fcmToken: string): Promise<ApiResponse<{ message: string; token_preview?: string }>> {
    try {
      return this.httpClient.post<{ message: string; token_preview?: string }>('notifications/fcm-token/', { fcm_token: fcmToken });
    } catch (error) {
      console.error('[NotificationService] Error updating FCM token:', error);
      throw error;
    }
  }

  /**
   * Get available notification types
   */
  async getNotificationTypes(): Promise<ApiResponse<{ notification_types: { value: string; label: string }[] }>> {
    try {
      return this.httpClient.get<{ notification_types: { value: string; label: string }[] }>('notifications/types/');
    } catch (error) {
      console.error('[NotificationService] Error getting notification types:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count (convenience method)
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.getNotificationSummary();
      if (response.success) {
        return response.data.unread;
      }
      return 0;
    } catch (error) {
      console.error('[NotificationService] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get recent notifications (convenience method)
   */
  async getRecentNotifications(limit: number = 10): Promise<NotificationData[]> {
    try {
      const response = await this.getNotifications({
        page_size: limit,
        ordering: '-created_at'
      });
      if (response.success) {
        return response.data.results;
      }
      return [];
    } catch (error) {
      console.error('[NotificationService] Error getting recent notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notifications (convenience method)
   */
  async getUnreadNotifications(limit?: number): Promise<NotificationData[]> {
    try {
      const filters: NotificationFilters = {
        is_read: false,
        ordering: '-created_at'
      };
      if (limit) {
        filters.page_size = limit;
      }

      const response = await this.getNotifications(filters);
      if (response.success) {
        return response.data.results;
      }
      return [];
    } catch (error) {
      console.error('[NotificationService] Error getting unread notifications:', error);
      return [];
    }
  }
}

// Export singleton instance
export const notificationApiService = new NotificationApiService();
export default notificationApiService;