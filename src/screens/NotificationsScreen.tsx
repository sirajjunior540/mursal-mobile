/**
 * NotificationsScreen - Modern notification center for drivers
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { notificationApiService, NotificationData, NotificationSummary } from '../services/api/notificationService';
import { theme } from '../shared/styles/theme';
import { useOrders } from '../features/orders/context/OrderProvider';

// Notification Card Component
interface NotificationCardProps {
  notification: NotificationData;
  onPress: (notification: NotificationData) => void;
  onMarkAsRead: (notificationId: number) => void;
  onDismiss: (notificationId: number) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDismiss,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_created':
      case 'order_confirmed':
        return 'document-text';
      case 'order_assigned':
        return 'person';
      case 'order_ready':
        return 'checkmark-circle';
      case 'order_picked_up':
        return 'bag';
      case 'order_delivered':
        return 'home';
      case 'batch_created':
      case 'batch_assigned':
        return 'layers';
      case 'payment_processed':
        return 'card';
      case 'promotion_available':
        return 'gift';
      case 'system_alert':
        return 'warning';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#FF3B30';
      case 'high':
        return '#FF9500';
      case 'normal':
        return '#FF6B00';
      case 'low':
        return '#8E8E93';
      default:
        return '#FF6B00';
    }
  };

  const handleLongPress = () => {
    Alert.alert(
      'Notification Actions',
      'What would you like to do with this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: notification.is_read ? 'Mark as Unread' : 'Mark as Read',
          onPress: () => onMarkAsRead(notification.id),
        },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => onDismiss(notification.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !notification.is_read && styles.unreadCard,
      ]}
      onPress={() => onPress(notification)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(notification.priority) + '20' }
        ]}>
          <Ionicons
            name={getNotificationIcon(notification.notification_type)}
            size={20}
            color={getNotificationColor(notification.priority)}
          />
        </View>
        
        <View style={styles.headerText}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.localized_content.title}
          </Text>
          <Text style={styles.timeAgo}>{notification.time_ago}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {!notification.is_read && <View style={styles.unreadIndicator} />}
          {notification.priority === 'urgent' && (
            <Ionicons name="warning" size={16} color="#FF3B30" />
          )}
        </View>
      </View>

      <Text style={styles.notificationMessage} numberOfLines={3}>
        {notification.localized_content.message}
      </Text>

      {(notification.order_id || notification.batch_id) && (
        <View style={styles.cardFooter}>
          <Text style={styles.orderInfo}>
            {notification.order_id ? `Order: ${notification.order_id}` : ''}
            {notification.batch_id ? `Batch: ${notification.batch_id}` : ''}
          </Text>
        </View>
      )}

      {notification.action_type !== 'none' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onPress(notification)}
          >
            <Text style={styles.actionButtonText}>
              {getActionText(notification.action_type)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const getActionText = (actionType: string) => {
  switch (actionType) {
    case 'order_detail':
      return 'View Order';
    case 'track_order':
      return 'Track Order';
    case 'pickup_order':
      return 'Pickup Order';
    case 'view_batch':
      return 'View Batch';
    case 'view_offers':
      return 'View Offers';
    default:
      return 'View Details';
  }
};

// Main NotificationsScreen Component
const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { driverOrders } = useOrders();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load notifications
  const loadNotifications = async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(!isRefresh);
      } else {
        setLoadingMore(true);
      }

      const filters = {
        page: pageNum,
        page_size: 20,
        ...(filter === 'unread' && { is_read: false }),
      };

      const response = await notificationApiService.getNotifications(filters);

      if (response.success) {
        const newNotifications = response.data.results;
        
        if (pageNum === 1) {
          setNotifications(newNotifications);
          setSummary(response.data.summary);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setHasMore(!!response.data.next);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Load summary
  const loadSummary = async () => {
    try {
      const response = await notificationApiService.getNotificationSummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('Error loading notification summary:', error);
    }
  };

  // Initialize data
  useEffect(() => {
    loadNotifications();
    loadSummary();
  }, [filter]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      loadNotifications(1, true);
      loadSummary();
    }, [filter])
  );

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadNotifications(1, true);
    loadSummary();
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadNotifications(nextPage);
    }
  };

  // Handle notification press
  const handleNotificationPress = async (notification: NotificationData) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Find the order from driverOrders if order_id is present
    const relatedOrder = notification.order_id
      ? driverOrders.find(o => o.id === notification.order_id || o.order_number === notification.order_id)
      : null;

    // Handle notification actions based on type
    switch (notification.action_type) {
      case 'order_detail':
      case 'track_order':
        // Navigate to order details/pickup screen
        if (relatedOrder) {
          navigation.navigate('PickupScreen', { orderId: relatedOrder.id });
        } else if (notification.order_id) {
          navigation.navigate('PickupScreen', { orderId: notification.order_id });
        } else {
          Alert.alert(
            notification.localized_content.title,
            notification.localized_content.message
          );
        }
        break;
      case 'pickup_order':
        // Navigate to pickup screen
        if (relatedOrder) {
          navigation.navigate('PickupScreen', { orderId: relatedOrder.id });
        } else if (notification.order_id) {
          navigation.navigate('PickupScreen', { orderId: notification.order_id });
        } else {
          // Go to active orders tab
          navigation.navigate('MainTabs', { screen: 'Navigation' });
        }
        break;
      case 'view_batch':
        // Navigate to batch details
        if (notification.batch_id) {
          navigation.navigate('BatchOrderScreen', { batchId: notification.batch_id });
        } else {
          Alert.alert(
            notification.localized_content.title,
            notification.localized_content.message
          );
        }
        break;
      case 'view_offers':
        // Navigate to special offers screen
        navigation.navigate('SpecialOffersScreen');
        break;
      default:
        // Show notification details
        Alert.alert(
          notification.localized_content.title,
          notification.localized_content.message
        );
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await notificationApiService.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true, read_at: response.data.read_at }
              : notif
          )
        );
        loadSummary();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle dismiss notification
  const handleDismissNotification = async (notificationId: number) => {
    try {
      const response = await notificationApiService.dismissNotification(notificationId);
      if (response.success) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        loadSummary();
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationApiService.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        loadSummary();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  // Handle clear all notifications
  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await notificationApiService.clearAllNotifications();
              if (response.success) {
                setNotifications([]);
                loadSummary();
              }
            } catch (error) {
              console.error('Error clearing all notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Mark All Read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#FF3B30' }]}>
              {summary.unread}
            </Text>
            <Text style={styles.summaryLabel}>Unread</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#FF9500' }]}>
              {summary.high_priority_unread}
            </Text>
            <Text style={styles.summaryLabel}>High Priority</Text>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.activeFilter]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            Unread
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off" size={60} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        {filter === 'unread'
          ? 'You have no unread notifications'
          : 'You have no notifications yet'}
      </Text>
    </View>
  );

  // Render footer
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={handleNotificationPress}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismissNotification}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilter: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#1C1C1E',
  },
  notificationCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#8E8E93',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  orderInfo: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  actionButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
});

export default NotificationsScreen;