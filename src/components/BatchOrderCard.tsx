import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Design } from '../constants/designSystem';
import { Order, BatchOrder, getBatchOrders } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BatchOrderCardProps {
  batch: BatchOrder;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  isAccepted?: boolean;
}

const BatchOrderCard: React.FC<BatchOrderCardProps> = ({
  batch,
  onPress,
  onAccept,
  onDecline,
  isAccepted = false,
}) => {
  const totalOrders = getBatchOrders(batch).length;
  const totalItems = batch.batchMetadata?.totalItems || 0;
  const estimatedDuration = batch.batchMetadata?.estimatedDuration || 0;

  const getStatusColor = () => {
    switch (batch.status) {
      case 'assigned': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'picked_up': return '#8B5CF6';
      case 'in_transit': return '#10B981';
      case 'delivered': return '#059669';
      default: return '#6B7280';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.batchBadge}>
            <Ionicons name="cube-outline" size={16} color="#FFF" />
            <Text style={styles.batchBadgeText}>BATCH</Text>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.batchId}>Batch #{batch.id}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{totalOrders}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{totalItems}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{estimatedDuration}m</Text>
                <Text style={styles.statLabel}>Est. Time</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {batch.warehouseInfo && (
            <View style={styles.warehouseInfo}>
              <Ionicons name="business-outline" size={20} color="#6B7280" />
              <View style={styles.warehouseDetails}>
                <Text style={styles.warehouseName}>{batch.warehouseInfo.name}</Text>
                <Text style={styles.warehouseAddress}>{batch.warehouseInfo.address}</Text>
              </View>
            </View>
          )}

          <View style={styles.routeInfo}>
            <View style={styles.routeType}>
              <Ionicons 
                name={batch.routingStrategy === 'warehouse_to_customers' ? 'git-branch-outline' : 'git-merge-outline'} 
                size={16} 
                color="#8B5CF6" 
              />
              <Text style={styles.routeTypeText}>
                {batch.routingStrategy === 'warehouse_to_customers' ? 'Warehouse → Customers' : 'Customers → Warehouse'}
              </Text>
            </View>
          </View>

          <View style={styles.ordersList}>
            <Text style={styles.ordersListTitle}>Orders in this batch:</Text>
            {getBatchOrders(batch).slice(0, 3).map((order, index) => (
              <View key={order.id} style={styles.orderItem}>
                <Text style={styles.orderNumber}>#{order.order_number}</Text>
                <Text style={styles.orderCustomer}>{order.customer_details?.name || 'Customer'}</Text>
              </View>
            ))}
            {totalOrders > 3 && (
              <Text style={styles.moreOrders}>+{totalOrders - 3} more orders</Text>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{batch.status?.replace('_', ' ').toUpperCase()}</Text>
          </View>

          {!isAccepted && onAccept && onDecline && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.declineButton]} 
                onPress={onDecline}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]} 
                onPress={onAccept}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.acceptText}>Accept Batch</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {batch.batchMetadata?.consolidationRequired && (
          <View style={styles.consolidationBadge}>
            <Ionicons name="warning-outline" size={16} color="#F59E0B" />
            <Text style={styles.consolidationText}>Consolidation Required</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Design.spacing[4],
    marginVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.xl,
    backgroundColor: Design.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  gradientHeader: {
    padding: Design.spacing[5],
    paddingBottom: Design.spacing[6],
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Design.spacing[3],
  },
  batchBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: Design.spacing[1],
    letterSpacing: 1,
  },
  headerContent: {
    gap: Design.spacing[3],
  },
  batchId: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[4],
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  body: {
    padding: Design.spacing[5],
  },
  warehouseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[4],
    padding: Design.spacing[3],
    backgroundColor: Design.colors.gray50,
    borderRadius: Design.borderRadius.lg,
  },
  warehouseDetails: {
    marginLeft: Design.spacing[3],
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
  },
  warehouseAddress: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  routeInfo: {
    marginBottom: Design.spacing[4],
  },
  routeType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  },
  routeTypeText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  ordersList: {
    marginBottom: Design.spacing[4],
  },
  ordersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[2],
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Design.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.gray100,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Design.colors.text,
  },
  orderCustomer: {
    fontSize: 14,
    color: Design.colors.textSecondary,
  },
  moreOrders: {
    fontSize: 14,
    color: Design.colors.primary,
    fontWeight: '500',
    marginTop: Design.spacing[2],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.full,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Design.spacing[3],
    marginTop: Design.spacing[4],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.lg,
    gap: Design.spacing[2],
  },
  declineButton: {
    backgroundColor: '#FEE2E2',
  },
  acceptButton: {
    backgroundColor: Design.colors.success,
  },
  declineText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  acceptText: {
    color: '#FFF',
    fontWeight: '600',
  },
  consolidationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  consolidationText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BatchOrderCard;