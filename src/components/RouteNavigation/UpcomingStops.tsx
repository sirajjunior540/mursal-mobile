import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { UpcomingStopsProps, ConsolidatedBatch } from '../../types/route.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

export const UpcomingStops: React.FC<UpcomingStopsProps> = ({
  stops,
  onStopPress,
  onNavigateToStop,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group stops by consolidation logic
  const groupedStops = React.useMemo(() => {
    const pickupGroups = new Map<string, typeof stops>();
    const deliveryGroups = new Map<string, typeof stops>();
    const consolidatedBatches: ConsolidatedBatch[] = [];
    const individualStops: typeof stops = [];

    // Group by pickup location
    stops.forEach(stop => {
      if (stop.type === 'pickup') {
        const key = `${stop.latitude}-${stop.longitude}`;
        if (!pickupGroups.has(key)) {
          pickupGroups.set(key, []);
        }
        pickupGroups.get(key)!.push(stop);
      }
    });

    // Check for consolidated batches (same pickup AND delivery)
    pickupGroups.forEach((pickupStops, pickupKey) => {
      if (pickupStops.length > 1) {
        // Check if they also have same delivery location
        const deliveryLocations = new Set();
        pickupStops.forEach(stop => {
          // Find corresponding delivery stops
          const deliveryStops = stops.filter(s => 
            s.type === 'delivery' && 
            s.order.id === stop.order.id
          );
          deliveryStops.forEach(ds => {
            deliveryLocations.add(`${ds.latitude}-${ds.longitude}`);
          });
        });

        const isConsolidated = deliveryLocations.size === 1;
        const isDistribution = deliveryLocations.size > 1;

        if (isConsolidated || isDistribution) {
          const firstStop = pickupStops[0];
          const deliveryStop = stops.find(s => 
            s.type === 'delivery' && 
            s.order.id === firstStop.order.id
          );

          if (deliveryStop) {
            consolidatedBatches.push({
              id: `batch-${pickupKey}`,
              orders: pickupStops.map(s => s.order),
              pickupLocation: {
                latitude: firstStop.latitude,
                longitude: firstStop.longitude,
                address: firstStop.address,
              },
              deliveryLocation: {
                latitude: deliveryStop.latitude,
                longitude: deliveryStop.longitude,
                address: deliveryStop.address,
              },
              isConsolidated,
              isDistribution,
            });
          }
        } else {
          // Not consolidated, treat as individual stops
          pickupStops.forEach(stop => individualStops.push(stop));
        }
      } else {
        // Single pickup, treat as individual
        pickupStops.forEach(stop => individualStops.push(stop));
      }
    });

    // Add non-pickup stops that aren't part of consolidations
    stops.forEach(stop => {
      if (stop.type !== 'pickup') {
        const isPartOfBatch = consolidatedBatches.some(batch =>
          batch.orders.some(order => order.id === stop.order.id)
        );
        if (!isPartOfBatch) {
          individualStops.push(stop);
        }
      }
    });

    return { consolidatedBatches, individualStops };
  }, [stops]);

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const renderConsolidatedBatch = (batch: ConsolidatedBatch) => {
    const isExpanded = expandedGroups.has(batch.id);
    const completedOrders = batch.orders.filter(o => o.status === 'delivered').length;
    const allCompleted = completedOrders === batch.orders.length;

    return (
      <View key={batch.id} style={styles.batchContainer}>
        {/* Batch Header */}
        <TouchableOpacity
          style={[styles.batchHeader, allCompleted && styles.completedCard]}
          onPress={() => toggleGroupExpansion(batch.id)}
        >
          <View style={styles.batchHeaderLeft}>
            <View style={[styles.batchIcon, { 
              backgroundColor: batch.isConsolidated 
                ? flatColors.cards.purple.background 
                : flatColors.cards.blue.background 
            }]}>
              <Ionicons 
                name={batch.isConsolidated ? "layers" : "git-branch"} 
                size={20} 
                color={batch.isConsolidated 
                  ? flatColors.accent.purple 
                  : flatColors.accent.blue
                } 
              />
            </View>
            
            <View style={styles.batchInfo}>
              <View style={styles.batchBadgeRow}>
                <View style={[styles.batchBadge, {
                  backgroundColor: batch.isConsolidated 
                    ? flatColors.accent.purple 
                    : flatColors.accent.blue
                }]}>
                  <Text style={styles.batchBadgeText}>
                    {batch.isConsolidated ? 'CONSOLIDATED' : 'DISTRIBUTION'}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.batchTitle, allCompleted && styles.completedText]}>
                {batch.orders.length} orders • Same pickup
                {batch.isConsolidated && ' & delivery'}
              </Text>
              
              <Text style={[styles.batchAddress, allCompleted && styles.completedText]}>
                {batch.pickupLocation.address}
              </Text>
            </View>
          </View>
          
          <View style={styles.batchHeaderRight}>
            <Text style={styles.batchProgress}>
              {completedOrders}/{batch.orders.length}
            </Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={flatColors.neutral[400]} 
            />
          </View>
        </TouchableOpacity>

        {/* Batch Actions */}
        {!allCompleted && (
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchActionButton, styles.navigateButton]}
              onPress={() => {
                // Navigate to pickup location
                const firstOrder = batch.orders[0];
                onNavigateToStop({
                  id: `pickup-${batch.id}`,
                  order: firstOrder,
                  latitude: batch.pickupLocation.latitude,
                  longitude: batch.pickupLocation.longitude,
                  address: batch.pickupLocation.address,
                  type: 'pickup',
                  sequenceNumber: 1,
                });
              }}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.batchActionText}>Navigate to Pickup</Text>
            </TouchableOpacity>
            
            {batch.isConsolidated && (
              <TouchableOpacity
                style={[styles.batchActionButton, styles.statusButton]}
                onPress={() => {
                  // Handle consolidated delivery status update
                  // This would update all orders in the batch
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.batchActionText}>Mark All Delivered</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Expanded Order List */}
        {isExpanded && (
          <View style={styles.batchOrdersList}>
            {batch.orders.map((order, index) => (
              <TouchableOpacity
                key={order.id}
                style={styles.batchOrderItem}
                onPress={() => onStopPress({
                  id: `order-${order.id}`,
                  order,
                  latitude: batch.deliveryLocation.latitude,
                  longitude: batch.deliveryLocation.longitude,
                  address: batch.deliveryLocation.address,
                  type: 'delivery',
                  sequenceNumber: index + 1,
                })}
              >
                <View style={styles.orderItemLeft}>
                  <View style={[styles.orderStatusDot, {
                    backgroundColor: order.status === 'delivered' 
                      ? flatColors.accent.green 
                      : flatColors.neutral[300]
                  }]} />
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemNumber}>#{order.order_number}</Text>
                    <Text style={styles.orderItemCustomer}>
                      {order.customer?.name || order.customer_details?.name || 'Customer'}
                    </Text>
                  </View>
                </View>
                
                {order.status !== 'delivered' && (
                  <TouchableOpacity
                    style={styles.orderNavigateButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      onNavigateToStop({
                        id: `delivery-${order.id}`,
                        order,
                        latitude: batch.deliveryLocation.latitude,
                        longitude: batch.deliveryLocation.longitude,
                        address: batch.deliveryLocation.address,
                        type: 'delivery',
                        sequenceNumber: index + 1,
                      });
                    }}
                  >
                    <Ionicons name="navigate" size={14} color={flatColors.accent.blue} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderIndividualStop = (stop: typeof stops[0], index: number) => {
    const isCompleted = stop.order.status === 'delivered';
    
    return (
      <TouchableOpacity
        key={stop.id}
        style={[styles.stopCard, isCompleted && styles.completedCard]}
        onPress={() => onStopPress(stop)}
      >
        <View style={styles.stopLeft}>
          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>
              {isCompleted ? '✓' : stop.sequenceNumber}
            </Text>
          </View>
          
          <View style={styles.stopInfo}>
            <View style={styles.stopBadgeRow}>
              <View style={[
                styles.stopTypeBadge,
                stop.type === 'pickup' ? styles.pickupBadge : styles.deliveryBadge
              ]}>
                <Text style={styles.stopTypeBadgeText}>
                  {stop.type === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.stopTitle, isCompleted && styles.completedText]}>
              #{stop.order.order_number || 'N/A'}
            </Text>
            
            <Text style={[styles.stopAddress, isCompleted && styles.completedText]} numberOfLines={1}>
              {stop.address}
            </Text>
          </View>
        </View>
        
        {!isCompleted && (
          <TouchableOpacity
            style={styles.stopNavigateButton}
            onPress={(e) => {
              e.stopPropagation();
              onNavigateToStop(stop);
            }}
          >
            <Ionicons name="navigate" size={16} color={flatColors.accent.blue} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (groupedStops.consolidatedBatches.length === 0 && groupedStops.individualStops.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-done-circle" size={48} color={flatColors.accent.green} />
        <Text style={styles.emptyTitle}>All stops completed!</Text>
        <Text style={styles.emptySubtitle}>Great job on finishing your route</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Upcoming Stops</Text>
      
      {/* Consolidated Batches */}
      {groupedStops.consolidatedBatches.map(renderConsolidatedBatch)}
      
      {/* Individual Stops */}
      {groupedStops.individualStops.map(renderIndividualStop)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 16,
  },
  
  // Consolidated Batch Styles
  batchContainer: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    ...premiumShadows.soft,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  batchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  batchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  batchInfo: {
    flex: 1,
  },
  batchBadgeRow: {
    marginBottom: 6,
  },
  batchBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  batchBadgeText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  batchTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  batchAddress: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: premiumTypography.caption.large.fontWeight,
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
  },
  batchHeaderRight: {
    alignItems: 'flex-end',
  },
  batchProgress: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
    marginBottom: 4,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  batchActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  navigateButton: {
    backgroundColor: flatColors.accent.blue,
  },
  statusButton: {
    backgroundColor: flatColors.accent.green,
  },
  batchActionText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: '#FFFFFF',
  },
  batchOrdersList: {
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[100],
    backgroundColor: flatColors.backgrounds.secondary,
  },
  batchOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemNumber: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  orderItemCustomer: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[600],
  },
  orderNavigateButton: {
    padding: 8,
  },
  
  // Individual Stop Styles
  stopCard: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    ...premiumShadows.subtle,
  },
  stopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[700],
  },
  stopInfo: {
    flex: 1,
  },
  stopBadgeRow: {
    marginBottom: 4,
  },
  stopTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickupBadge: {
    backgroundColor: flatColors.accent.orange,
  },
  deliveryBadge: {
    backgroundColor: flatColors.accent.green,
  },
  stopTypeBadgeText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stopTitle: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[600],
  },
  stopNavigateButton: {
    padding: 8,
  },
  
  // Completed States
  completedCard: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderColor: flatColors.neutral[300],
  },
  completedText: {
    color: flatColors.neutral[500],
    textDecorationLine: 'line-through',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: premiumTypography.body.medium.fontSize,
    fontWeight: premiumTypography.body.medium.fontWeight,
    lineHeight: premiumTypography.body.medium.lineHeight,
    color: flatColors.neutral[500],
    textAlign: 'center',
  },
});