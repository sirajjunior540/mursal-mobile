import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import EnhancedOrderCard from '../components/EnhancedOrderCard';
import BatchOrderCard from '../components/BatchOrderCard';

import { useOrders } from '../features/orders/context/OrderProvider';
import { Order, isBatchOrder } from '../types';
import { Design } from '../constants/designSystem';
import { apiService } from '../services/api';

const AvailableOrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    orders: availableOrders, 
    refreshOrders, 
    isLoading,
    acceptOrder,
    updateOrderStatus 
  } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshOrders();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshOrders]);

  const handleViewOrderDetails = (order: Order) => {
    navigation.navigate('OrderDetails' as never, { orderId: order.id } as never);
  };

  // Group available orders by batch ID first, then by pickup location
  const groupedAvailableOrders = useMemo(() => {
    const batchGroups = new Map<string, Order[]>();
    const pickupGroups = new Map<string, Order[]>();
    const standaloneOrders: Order[] = [];
    
    // First, group by batch ID
    availableOrders.forEach((order) => {
      if (order.current_batch?.id) {
        const batchId = order.current_batch.id;
        if (!batchGroups.has(batchId)) {
          batchGroups.set(batchId, []);
        }
        batchGroups.get(batchId)!.push(order);
      } else if (order.pickup_latitude && order.pickup_longitude) {
        // If no batch ID, group by pickup location
        const pickupKey = `${order.pickup_latitude}-${order.pickup_longitude}`;
        if (!pickupGroups.has(pickupKey)) {
          pickupGroups.set(pickupKey, []);
        }
        pickupGroups.get(pickupKey)!.push(order);
      } else {
        // Standalone orders without batch ID or coordinates
        standaloneOrders.push(order);
      }
    });
    
    // Convert to array of grouped orders
    const groupedArray: (Order | { isBatchGroup: true; orders: Order[]; pickupAddress: string; batchId?: string; batchName?: string })[] = [];
    
    // Add batch groups first
    batchGroups.forEach((orders, batchId) => {
      if (orders.length >= 1) {
        // Even single order batches should be grouped if they have a batch ID
        groupedArray.push({
          isBatchGroup: true,
          orders: orders,
          pickupAddress: orders[0].pickup_address || 'Pickup Location',
          batchId: batchId,
          batchName: orders[0].current_batch?.name || `Batch ${orders[0].current_batch?.batch_number}`
        });
      }
    });
    
    // Then add pickup location groups (only if multiple orders)
    pickupGroups.forEach((orders, pickupKey) => {
      if (orders.length > 1) {
        groupedArray.push({
          isBatchGroup: true,
          orders: orders,
          pickupAddress: orders[0].pickup_address || 'Pickup Location'
        });
      } else {
        // Single order at pickup location, add as standalone
        standaloneOrders.push(orders[0]);
      }
    });
    
    // Finally add standalone orders
    standaloneOrders.forEach(order => {
      groupedArray.push(order);
    });
    
    return groupedArray;
  }, [availableOrders]);

  const renderAvailableOrderCard = ({ item }: { item: any }) => {
    // Check if it's a grouped batch
    if (item.isBatchGroup) {
      const totalValue = item.orders.reduce((sum: number, order: Order) => 
        sum + (order.total || 0), 0
      );
      
      return (
        <View style={styles.batchGroupCard}>
          <View style={styles.batchGroupHeader}>
            <View style={styles.batchGroupIconContainer}>
              <Ionicons name="layers" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.batchGroupInfo}>
              <Text style={styles.batchGroupTitle}>
                {item.batchId ? (item.batchName || 'Batch Order') : 'Batch Pickup'}
              </Text>
              <Text style={styles.batchGroupSubtitle}>{item.orders.length} orders • ${totalValue.toFixed(2)}</Text>
            </View>
            <View style={styles.batchGroupBadge}>
              <Text style={styles.batchGroupBadgeText}>
                {item.batchId ? 'BATCH ORDER' : 'SAME PICKUP'}
              </Text>
            </View>
          </View>
          
          <View style={styles.batchGroupContent}>
            <View style={styles.batchGroupAddress}>
              <Ionicons name="location" size={16} color="#10B981" />
              <Text style={styles.batchGroupAddressText} numberOfLines={2}>
                {item.pickupAddress}
              </Text>
            </View>
            
            <View style={styles.batchGroupOrders}>
              {item.orders.map((order: Order, index: number) => (
                <View key={order.id} style={styles.batchGroupOrderItem}>
                  <Text style={styles.batchGroupOrderNumber}>#{order.order_number || order.id}</Text>
                  <Text style={styles.batchGroupOrderCustomer} numberOfLines={1}>
                    {order.customer?.name || order.customer_details?.name || 'Customer'}
                  </Text>
                  <Text style={styles.batchGroupOrderAddress} numberOfLines={1}>
                    → {order.delivery_address}
                  </Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.batchGroupAcceptButton}
              onPress={() => {
                // Handle batch acceptance
                Alert.alert(
                  'Accept Batch Orders',
                  `Accept all ${item.orders.length} orders${item.batchId ? ' in this batch' : ' from this pickup location'}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Accept All', 
                      onPress: async () => {
                        try {
                          if (item.batchId) {
                            // For true batch orders, use batch accept endpoint
                            const response = await apiService.acceptBatchOrder(item.batchId);
                            if (response.success) {
                              console.log(`✅ Batch ${item.batchId} accepted successfully`);
                            } else {
                              Alert.alert('Error', 'Failed to accept batch order');
                            }
                          } else {
                            // For same pickup location orders, accept individually
                            for (const order of item.orders) {
                              await acceptOrder(order.id);
                            }
                          }
                          handleRefresh();
                        } catch (error) {
                          console.error('Error accepting batch:', error);
                          Alert.alert('Error', 'Failed to accept batch orders');
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.batchGroupAcceptText}>Accept All Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    // Regular order or actual batch order
    if (isBatchOrder(item)) {
      return (
        <BatchOrderCard
          batch={item}
          onPress={() => {/* Handle batch order */}}
        />
      );
    }
    
    return (
      <EnhancedOrderCard
        order={item}
        onPress={() => handleViewOrderDetails(item)}
        onStatusUpdate={(newStatus) => updateOrderStatus(item.id, newStatus)}
      />
    );
  };

  const renderEmptyAvailable = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No available orders</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Design.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{availableOrders.length}</Text>
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={groupedAvailableOrders}
        renderItem={renderAvailableOrderCard}
        keyExtractor={(item) => item.isBatchGroup ? `batch-${item.pickupAddress}` : item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={handleRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={renderEmptyAvailable}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingBottom: Design.spacing[3],
  },
  backButton: {
    padding: Design.spacing[2],
    marginLeft: -Design.spacing[2],
  },
  headerTitle: {
    flex: 1,
    fontSize: Design.typography.title2.fontSize,
    fontWeight: Design.typography.title2.fontWeight,
    color: Design.colors.textPrimary,
    marginLeft: Design.spacing[2],
  },
  headerCount: {
    backgroundColor: Design.colors.primary,
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.md,
  },
  headerCountText: {
    fontSize: Design.typography.footnote.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textInverse,
  },
  listContent: {
    paddingVertical: Design.spacing[2],
    paddingHorizontal: Design.spacing[4],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  
  // Batch Group Card Styles
  batchGroupCard: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.md,
    marginVertical: Design.spacing[2],
    overflow: 'hidden',
    ...Design.shadows.small,
  },
  batchGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.primary,
    padding: Design.spacing[3],
  },
  batchGroupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Design.spacing[3],
  },
  batchGroupInfo: {
    flex: 1,
  },
  batchGroupTitle: {
    fontSize: Design.typography.callout.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textInverse,
  },
  batchGroupSubtitle: {
    fontSize: Design.typography.footnote.fontSize,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  batchGroupBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.sm,
  },
  batchGroupBadgeText: {
    fontSize: Design.typography.caption2.fontSize,
    fontWeight: Design.typography.overline.fontWeight,
    color: Design.colors.textInverse,
    letterSpacing: 0.5,
  },
  batchGroupContent: {
    padding: Design.spacing[3],
  },
  batchGroupAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[3],
  },
  batchGroupAddressText: {
    flex: 1,
    fontSize: Design.typography.footnote.fontSize,
    color: Design.colors.textPrimary,
    lineHeight: Design.typography.footnote.lineHeight * 1.3,
    marginLeft: Design.spacing[2],
  },
  batchGroupOrders: {
    marginBottom: Design.spacing[3],
  },
  batchGroupOrderItem: {
    paddingVertical: Design.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  batchGroupOrderNumber: {
    fontSize: Design.typography.footnote.fontSize,
    fontWeight: Design.typography.label.fontWeight,
    color: Design.colors.textPrimary,
    marginBottom: 2,
  },
  batchGroupOrderCustomer: {
    fontSize: Design.typography.caption1.fontSize,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  batchGroupOrderAddress: {
    fontSize: Design.typography.caption1.fontSize,
    color: Design.colors.textSecondary,
  },
  batchGroupAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.success,
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    gap: Design.spacing[2],
  },
  batchGroupAcceptText: {
    fontSize: Design.typography.callout.fontSize,
    fontWeight: Design.typography.headline.fontWeight,
    color: Design.colors.textInverse,
  },
});

export default AvailableOrdersScreen;