import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AvailableOrdersCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { FlatCollapsibleCard } from './FlatCollapsibleCard';
import { FlatOrderItem } from './FlatOrderItem';
import { Order, isBatchOrder, getBatchProperties } from '../../types';

interface GroupedOrder {
  type: 'single' | 'batch';
  batchId?: string;
  batchNumber?: string;
  orders: Order[];
  totalValue: number;
  isConsolidated?: boolean;
  warehouseAddress?: string;
}

export const FlatAvailableOrdersCard: React.FC<AvailableOrdersCardProps> = ({
  orders,
  isExpanded,
  onToggle,
  onRefresh,
  onOrderPress,
  onViewAll,
  canAcceptOrder,
  isOnline,
  onAcceptBatch,
}) => {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  
  // Ensure orders is always an array and memoize to prevent flickering
  const safeOrders = useMemo(() => {
    if (!orders) return [];
    return Array.isArray(orders) ? orders : [];
  }, [orders]);
  
  // Group orders by batch with stable computation
  const groupedOrders = useMemo(() => {
    const groups: GroupedOrder[] = [];
    const processedBatches = new Set<string>();
    
    // Early return if no orders
    if (!safeOrders || safeOrders.length === 0) {
      return groups;
    }
    
    safeOrders.forEach(order => {
      const batchCheck = isBatchOrder(order);
      const batchProps = getBatchProperties(order);
      
      if (batchCheck && batchProps && order.current_batch?.id) {
        const batchId = order.current_batch.id;
        
        if (!processedBatches.has(batchId)) {
          // Find all orders in this batch
          const batchOrders = safeOrders.filter(o => 
            o.current_batch?.id === batchId
          );
          
          groups.push({
            type: 'batch',
            batchId,
            batchNumber: order.current_batch.batch_number,
            orders: batchOrders,
            totalValue: batchOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
            isConsolidated: order.is_consolidated || order.current_batch.is_consolidated,
            warehouseAddress: order.warehouse_info?.warehouse_address || 
                             order.current_batch?.warehouse_info?.warehouse_address
          });
          
          processedBatches.add(batchId);
        }
      } else {
        // Single order
        groups.push({
          type: 'single',
          orders: [order],
          totalValue: Number(order.total) || 0
        });
      }
    });
    
    return groups;
  }, [safeOrders]);
  
  const displayGroups = groupedOrders.slice(0, 4);
  const hasMore = groupedOrders.length > 4;
  const totalOrders = safeOrders.length;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: flatColors.primary[500] }]}>
        <Ionicons 
          name="compass-outline" 
          size={40} 
          color="#FFFFFF" 
        />
      </View>
      
      {!isOnline ? (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>You're currently offline</Text>
          <Text style={styles.emptySubtitle}>
            Go online to see available orders
          </Text>
          <View style={styles.emptyAction}>
            <Ionicons name="power" size={16} color={flatColors.primary[500]} />
            <Text style={styles.emptyActionText}>Tap the toggle above to go online</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>No available orders</Text>
          <Text style={styles.emptySubtitle}>
            New orders will appear here when available
          </Text>
          <TouchableOpacity style={styles.refreshHint} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color={flatColors.primary[500]} />
            <Text style={styles.refreshHintText}>Pull down to refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const toggleBatchExpanded = (batchId: string) => {
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

  const renderBatchSummary = (group: GroupedOrder) => {
    const isExpanded = expandedBatches.has(group.batchId!);
    const firstOrder = group.orders[0];
    const isDisabled = !canAcceptOrder(firstOrder);
    
    return (
      <View key={`batch-${group.batchId}`} style={[styles.batchContainer, isDisabled && styles.disabledOrder]}>
        <TouchableOpacity
          style={styles.batchHeader}
          onPress={() => toggleBatchExpanded(group.batchId!)}
          activeOpacity={0.8}
        >
          <View style={styles.batchLeft}>
            <View style={[styles.batchIndicator, { backgroundColor: flatColors.cards.purple.background }]}>
              <Ionicons name="layers" size={24} color={flatColors.accent.purple} />
            </View>
            <View style={styles.batchInfo}>
              <View style={styles.batchTitleRow}>
                <Text style={styles.batchNumber}>Batch #{group.batchNumber}</Text>
                {group.isConsolidated && (
                  <View style={styles.consolidatedBadge}>
                    <Ionicons name="business" size={12} color={flatColors.accent.orange} />
                    <Text style={styles.consolidatedText}>Warehouse</Text>
                  </View>
                )}
              </View>
              <Text style={styles.batchSummary}>
                {group.orders.length} orders • ${group.totalValue.toFixed(2)}
              </Text>
              {group.warehouseAddress && (
                <Text style={styles.warehouseAddress} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={flatColors.neutral[400]} /> {group.warehouseAddress}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.batchRight}>
            <TouchableOpacity
              style={styles.batchActionButton}
              onPress={(e) => {
                e.stopPropagation();
                onOrderPress(firstOrder);
              }}
            >
              <Ionicons name="eye-outline" size={18} color={flatColors.primary[500]} />
            </TouchableOpacity>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={flatColors.neutral[400]} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.batchOrders}>
            {group.orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.batchOrderItem}
                onPress={() => onOrderPress(order)}
                activeOpacity={0.8}
              >
                <View style={styles.batchOrderInfo}>
                  <Text style={styles.batchOrderNumber}>#{order.order_number}</Text>
                  <Text style={styles.batchOrderCustomer}>{order.customer_name || order.customer?.name || 'Customer'}</Text>
                  <Text style={styles.batchOrderAddress} numberOfLines={1}>
                    <Ionicons name="location" size={12} color={flatColors.neutral[400]} /> {order.delivery_address || 'Delivery Location'}
                  </Text>
                </View>
                <View style={styles.batchOrderRight}>
                  <Text style={styles.batchOrderAmount}>${Number(order.total || 0).toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Batch Accept Button */}
            {onAcceptBatch && !isDisabled && (
              <TouchableOpacity
                style={styles.batchAcceptButton}
                onPress={() => onAcceptBatch(group.batchId!, group.orders)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.batchAcceptButtonText}>Accept All Orders</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {isDisabled && (
          <View style={styles.disabledOverlay}>
            <View style={styles.disabledContent}>
              <Ionicons name="lock-closed" size={16} color={flatColors.neutral[400]} />
              <Text style={styles.disabledText}>
                Complete current delivery first
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (safeOrders.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.content}>
        {displayGroups.map((group) => {
          if (group.type === 'batch') {
            return renderBatchSummary(group);
          } else {
            const order = group.orders[0];
            const isDisabled = !canAcceptOrder(order);
            return (
              <View key={`single-${order.id}`} style={[styles.orderContainer, isDisabled && styles.disabledOrder]}>
                <FlatOrderItem
                  order={order}
                  onPress={() => onOrderPress(order)}
                  chevronColor={isDisabled ? flatColors.neutral[300] : flatColors.primary[500]}
                />
                {isDisabled && (
                  <View style={styles.disabledOverlay}>
                    <View style={styles.disabledContent}>
                      <Ionicons name="lock-closed" size={16} color={flatColors.neutral[400]} />
                      <Text style={styles.disabledText}>
                        Complete current delivery first
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }
        })}

        {hasMore && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={onViewAll}
            activeOpacity={0.8}
          >
            <View style={[styles.viewAllContent, { backgroundColor: flatColors.primary[50] }]}>
              <Text style={[styles.viewAllText, { color: flatColors.primary[600] }]}>
                View all {totalOrders} orders
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={18} 
                color={flatColors.primary[600]} 
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <FlatCollapsibleCard
      title="Available Orders"
      icon="compass"
      iconColor={flatColors.primary[500]}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summaryText={
        safeOrders.length > 0 
          ? `${safeOrders.length} ${safeOrders.length === 1 ? 'order' : 'orders'} available`
          : 'No orders available'
      }
      showRefresh
      onRefresh={onRefresh}
    >
      {renderContent()}
    </FlatCollapsibleCard>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
  orderContainer: {
    position: 'relative',
  },
  disabledOrder: {
    opacity: 0.6,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
  },
  disabledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabledText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[500],
    fontWeight: '600',
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
    backgroundColor: flatColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyActionText: {
    ...premiumTypography.caption.medium,
    color: flatColors.primary[600],
    fontWeight: '600',
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: flatColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshHintText: {
    ...premiumTypography.caption.medium,
    color: flatColors.primary[600],
    fontWeight: '600',
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    ...premiumShadows.subtle,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  viewAllText: {
    ...premiumTypography.button.medium,
    fontWeight: '600',
  },
  // Batch styles
  batchContainer: {
    marginHorizontal: 20,
    marginVertical: 6,
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    overflow: 'hidden',
    ...premiumShadows.small,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  batchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchIndicator: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchInfo: {
    flex: 1,
  },
  batchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  batchNumber: {
    ...premiumTypography.body.medium,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  consolidatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: flatColors.cards.yellow.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  consolidatedText: {
    ...premiumTypography.caption.small,
    fontWeight: '600',
    color: flatColors.accent.orange,
  },
  batchSummary: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[600],
    marginBottom: 2,
  },
  warehouseAddress: {
    ...premiumTypography.caption.small,
    color: flatColors.neutral[500],
  },
  batchRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: flatColors.primary[50],
  },
  batchOrders: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  batchOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: flatColors.backgrounds.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  batchOrderInfo: {
    flex: 1,
  },
  batchOrderNumber: {
    ...premiumTypography.caption.medium,
    fontWeight: '600',
    color: flatColors.neutral[700],
    marginBottom: 2,
  },
  batchOrderCustomer: {
    ...premiumTypography.caption.small,
    color: flatColors.neutral[500],
    marginBottom: 2,
  },
  batchOrderAddress: {
    ...premiumTypography.caption.small,
    color: flatColors.neutral[400],
  },
  batchOrderRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  batchOrderAmount: {
    ...premiumTypography.caption.medium,
    fontWeight: '700',
    color: flatColors.accent.green,
  },
  batchAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    marginHorizontal: 4,
    ...premiumShadows.small,
  },
  batchAcceptButtonText: {
    ...premiumTypography.button.medium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});