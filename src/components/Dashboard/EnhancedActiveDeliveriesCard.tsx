import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ActiveDeliveriesCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { FlatCollapsibleCard } from './FlatCollapsibleCard';
import { FlatOrderItem } from './FlatOrderItem';
import { Order } from '../../types';

interface BatchGroup {
  batchId: string;
  batchName?: string;
  orders: Order[];
  pickupAddress: string;
  totalValue: number;
  allPickedUp: boolean;
  allDelivered: boolean;
  somePickedUp: boolean;
  statusCounts: {
    accepted: number;
    pickedUp: number;
    delivered: number;
    inTransit: number;
  };
}

export const EnhancedActiveDeliveriesCard: React.FC<ActiveDeliveriesCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onOrderPress,
  onViewAll,
}) => {
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  
  // Group orders by batch
  const { batchGroups, standaloneOrders } = useMemo(() => {
    const batches = new Map<string, BatchGroup>();
    const standalone: Order[] = [];
    
    orders.forEach(order => {
      if (order.current_batch?.id) {
        const batchId = order.current_batch.id;
        if (!batches.has(batchId)) {
          batches.set(batchId, {
            batchId,
            batchName: order.current_batch.name || `Batch ${order.current_batch.batch_number}`,
            orders: [],
            pickupAddress: order.pickup_address || 'Pickup Location',
            totalValue: 0,
            allPickedUp: true,
            allDelivered: true,
            somePickedUp: false,
            statusCounts: {
              accepted: 0,
              pickedUp: 0,
              delivered: 0,
              inTransit: 0,
            }
          });
        }
        
        const batch = batches.get(batchId)!;
        batch.orders.push(order);
        batch.totalValue += (order.total_amount || order.total || 0);
        
        // Update status counts
        if (order.status === 'accepted' || order.status === 'assigned') {
          batch.statusCounts.accepted++;
          batch.allPickedUp = false;
          batch.allDelivered = false;
        } else if (order.status === 'picked_up') {
          batch.statusCounts.pickedUp++;
          batch.somePickedUp = true;
          batch.allDelivered = false;
        } else if (order.status === 'in_transit') {
          batch.statusCounts.inTransit++;
          batch.somePickedUp = true;
          batch.allDelivered = false;
        } else if (order.status === 'delivered') {
          batch.statusCounts.delivered++;
          batch.somePickedUp = true;
        }
      } else {
        standalone.push(order);
      }
    });
    
    return {
      batchGroups: Array.from(batches.values()),
      standaloneOrders: standalone
    };
  }, [orders]);
  
  const toggleBatchExpansion = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };
  
  const getBatchStatusColor = (batch: BatchGroup) => {
    if (batch.allDelivered) return flatColors.status.success.primary;
    if (batch.allPickedUp) return flatColors.accent.blue;
    if (batch.somePickedUp) return flatColors.accent.orange;
    return flatColors.primary[500];
  };
  
  const getBatchStatusText = (batch: BatchGroup) => {
    const parts = [];
    if (batch.statusCounts.accepted > 0) parts.push(`${batch.statusCounts.accepted} to pickup`);
    if (batch.statusCounts.pickedUp > 0) parts.push(`${batch.statusCounts.pickedUp} picked up`);
    if (batch.statusCounts.inTransit > 0) parts.push(`${batch.statusCounts.inTransit} in transit`);
    if (batch.statusCounts.delivered > 0) parts.push(`${batch.statusCounts.delivered} delivered`);
    return parts.join(' • ');
  };
  
  const handleBatchPickupVerification = (batch: BatchGroup) => {
    if (batch.statusCounts.accepted === 0) {
      Alert.alert('All Orders Picked Up', 'All orders in this batch have been picked up.');
      return;
    }
    
    const unpickedOrders = batch.orders.filter(o => 
      o.status === 'accepted' || o.status === 'assigned'
    );
    
    const ordersList = unpickedOrders.map(o => 
      `• Order #${o.order_number || o.id.slice(-8)} - ${o.customer_name || 'Customer'}`
    ).join('\n');
    
    Alert.alert(
      'Pickup Verification',
      `Please ensure you have picked up all ${unpickedOrders.length} orders:\n\n${ordersList}\n\nHave you collected all packages?`,
      [
        { text: 'No, checking...', style: 'cancel' },
        { 
          text: 'Yes, all collected', 
          onPress: () => {
            Alert.alert('Ready to Go!', 'Great! You can now mark each order as picked up.');
          }
        }
      ]
    );
  };
  
  const renderBatchGroup = (batch: BatchGroup) => {
    const isExpanded = expandedBatches.has(batch.batchId);
    const statusColor = getBatchStatusColor(batch);
    
    return (
      <View key={batch.batchId} style={styles.batchContainer}>
        <TouchableOpacity 
          style={[styles.batchHeader, { borderLeftColor: statusColor }]}
          onPress={() => toggleBatchExpansion(batch.batchId)}
          activeOpacity={0.8}
        >
          <View style={styles.batchHeaderLeft}>
            <View style={[styles.batchIcon, { backgroundColor: flatColors.cards.blue.background }]}>
              <Ionicons name="layers" size={24} color={flatColors.accent.blue} />
            </View>
            <View style={styles.batchInfo}>
              <Text style={styles.batchTitle}>{batch.batchName}</Text>
              <Text style={styles.batchSubtitle}>
                {batch.orders.length} orders • ${batch.totalValue.toFixed(2)}
              </Text>
              <Text style={styles.batchStatus}>{getBatchStatusText(batch)}</Text>
            </View>
          </View>
          
          <View style={styles.batchHeaderRight}>
            {batch.statusCounts.accepted > 0 && (
              <TouchableOpacity 
                style={styles.verifyButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleBatchPickupVerification(batch);
                }}
              >
                <Ionicons name="clipboard-outline" size={16} color={flatColors.accent.orange} />
                <Text style={styles.verifyButtonText}>Verify Pickup</Text>
              </TouchableOpacity>
            )}
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={flatColors.neutral[400]} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.batchOrders}>
            {batch.orders.map((order, index) => (
              <View key={order.id} style={styles.batchOrderWrapper}>
                <FlatOrderItem
                  order={order}
                  onPress={() => onOrderPress(order)}
                  chevronColor={flatColors.accent.green}
                />
                {index === 0 && batch.statusCounts.accepted > 0 && (
                  <View style={styles.pickupReminder}>
                    <Ionicons name="information-circle" size={16} color={flatColors.accent.orange} />
                    <Text style={styles.pickupReminderText}>
                      Remember to collect all {batch.orders.length} packages at pickup
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: flatColors.accent.green }]}>
        <Ionicons 
          name="checkmark-done-circle-outline" 
          size={40} 
          color="#FFFFFF" 
        />
      </View>
      
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No active deliveries</Text>
        <Text style={styles.emptySubtitle}>
          Accept an order to start delivering
        </Text>
        <View style={styles.emptyAction}>
          <Ionicons name="compass" size={16} color={flatColors.accent.green} />
          <Text style={styles.emptyActionText}>Check available orders above</Text>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (orders.length === 0) {
      return renderEmptyState();
    }

    const allItems = [...batchGroups, ...standaloneOrders];
    const displayItems = showAllOrders ? allItems : allItems.slice(0, 4);
    const hasMore = allItems.length > 4;

    return (
      <View style={styles.content}>
        {displayItems.map((item) => {
          if ('batchId' in item) {
            return renderBatchGroup(item);
          } else {
            return (
              <FlatOrderItem
                key={item.id}
                order={item}
                onPress={() => onOrderPress(item)}
                chevronColor={flatColors.accent.green}
              />
            );
          }
        })}

        {hasMore && !showAllOrders && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setShowAllOrders(true)}
            activeOpacity={0.8}
          >
            <View style={styles.viewAllContent}>
              <Text style={styles.viewAllText}>
                View all ({batchGroups.length} batches, {standaloneOrders.length} orders)
              </Text>
              <Ionicons 
                name="chevron-down" 
                size={16} 
                color={flatColors.neutral[500]} 
              />
            </View>
          </TouchableOpacity>
        )}
        
        {showAllOrders && hasMore && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setShowAllOrders(false)}
            activeOpacity={0.8}
          >
            <View style={styles.viewAllContent}>
              <Text style={styles.viewAllText}>
                Show less
              </Text>
              <Ionicons 
                name="chevron-up" 
                size={16} 
                color={flatColors.neutral[500]} 
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getActiveOrdersSummary = () => {
    const totalOrders = orders.length;
    const batchCount = batchGroups.length;
    
    const statusCounts = orders.reduce((acc, order) => {
      if (order.status === 'in_transit') acc.inTransit++;
      else if (order.status === 'picked_up') acc.pickedUp++;
      else if (order.status === 'accepted' || order.status === 'assigned') acc.accepted++;
      return acc;
    }, { inTransit: 0, pickedUp: 0, accepted: 0 });
    
    const parts = [];
    if (batchCount > 0) parts.push(`${batchCount} batches`);
    if (statusCounts.accepted > 0) parts.push(`${statusCounts.accepted} to pickup`);
    if (statusCounts.pickedUp > 0) parts.push(`${statusCounts.pickedUp} picked up`);
    if (statusCounts.inTransit > 0) parts.push(`${statusCounts.inTransit} in transit`);
    
    return parts.length > 0 ? parts.join(' • ') : `${totalOrders} active orders`;
  };

  return (
    <FlatCollapsibleCard
      title="Active Deliveries"
      icon="car-sport"
      iconColor={flatColors.accent.green}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={
        orders.length > 0 
          ? getActiveOrdersSummary()
          : 'No active deliveries'
      }
    >
      {renderContent()}
    </FlatCollapsibleCard>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
  batchContainer: {
    marginHorizontal: 20,
    marginVertical: 6,
  },
  batchHeader: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...premiumShadows.soft,
    borderWidth: 1,
    borderColor: flatColors.neutral[100],
    borderLeftWidth: 4,
  },
  batchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  batchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  batchInfo: {
    flex: 1,
  },
  batchTitle: {
    ...premiumTypography.body.large,
    color: flatColors.neutral[800],
    fontWeight: '700',
    marginBottom: 2,
  },
  batchSubtitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[600],
    marginBottom: 4,
  },
  batchStatus: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[500],
    fontWeight: '500',
  },
  batchHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.yellow.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  verifyButtonText: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.orange,
    fontWeight: '600',
  },
  batchOrders: {
    marginTop: 8,
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: flatColors.neutral[200],
    marginLeft: 24,
  },
  batchOrderWrapper: {
    marginVertical: 4,
  },
  pickupReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.yellow.background,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  pickupReminderText: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.orange,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.soft,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    ...premiumTypography.headline.small,
    color: flatColors.neutral[700],
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[500],
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: flatColors.cards.green.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyActionText: {
    ...premiumTypography.caption.medium,
    color: flatColors.accent.green,
    fontWeight: '600',
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    backgroundColor: flatColors.backgrounds.primary,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  viewAllText: {
    ...premiumTypography.caption.large,
    color: flatColors.neutral[600],
    fontWeight: '600',
  },
});