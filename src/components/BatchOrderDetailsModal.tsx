/**
 * BatchOrderDetailsModal - Modal component for displaying detailed batch order information
 * Follows industry best practices with proper TypeScript typing and accessibility
 */

import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../design/theme';
import Card from './ui/Card';
import Button from './ui/Button';
import StatusBadge from './ui/StatusBadge';
import { BatchOrderInfo, BatchOrder } from '../shared/types/order.types';

interface BatchOrderDetailsModalProps {
  batch: BatchOrderInfo | null;
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onNavigate?: () => void;
  
  // Loading states
  isAccepting?: boolean;
  isDeclining?: boolean;
  
  // Action visibility
  showAcceptDecline?: boolean;
  showNavigate?: boolean;
}

const BatchOrderDetailsModal: React.FC<BatchOrderDetailsModalProps> = ({
  batch,
  visible,
  onClose,
  onAccept,
  onDecline,
  onNavigate,
  isAccepting = false,
  isDeclining = false,
  showAcceptDecline = false,
  showNavigate = false,
}) => {
  if (!batch) return null;

  const totalValue = batch.orders.reduce((sum, order) => sum + order.total, 0);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Batch Details</Text>
            <Text style={styles.subtitle}>{batch.batch_number}</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close modal"
          >
            <Ionicons name="close" size={24} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Batch Summary */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.batchName}>{batch.name}</Text>
              <StatusBadge status={batch.status as any} size="md" />
            </View>
            
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{batch.total_orders}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{batch.total_items}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${totalValue.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Value</Text>
              </View>
            </View>
          </Card>

          {/* Pickup Information */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="local-shipping" size={20} color={theme.colors.primary[500]} />
              <Text style={styles.sectionTitle}>Pickup Information</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={theme.colors.neutral[400]} />
              <Text style={styles.infoText}>{batch.pickup_address}</Text>
            </View>
            
            {batch.pickup_contact_name && (
              <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color={theme.colors.neutral[400]} />
                <Text style={styles.infoText}>{batch.pickup_contact_name}</Text>
              </View>
            )}
            
            {batch.pickup_contact_phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={16} color={theme.colors.neutral[400]} />
                <Text style={styles.infoText}>{batch.pickup_contact_phone}</Text>
              </View>
            )}
            
            {batch.pickup_instructions && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsLabel}>Pickup Instructions:</Text>
                <Text style={styles.instructionsText}>{batch.pickup_instructions}</Text>
              </View>
            )}
          </Card>

          {/* Scheduling Information */}
          {(batch.scheduled_pickup_date || batch.scheduled_pickup_time) && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={20} color={theme.colors.warning[500]} />
                <Text style={styles.sectionTitle}>Scheduling</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color={theme.colors.neutral[400]} />
                <Text style={styles.infoText}>
                  {batch.scheduled_pickup_date && new Date(batch.scheduled_pickup_date).toLocaleDateString()}
                  {batch.scheduled_pickup_date && batch.scheduled_pickup_time && ' at '}
                  {batch.scheduled_pickup_time}
                </Text>
              </View>
            </Card>
          )}

          {/* Batch Notes */}
          {batch.batch_notes && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color={theme.colors.info[500]} />
                <Text style={styles.sectionTitle}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{batch.batch_notes}</Text>
            </Card>
          )}

          {/* Orders List */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color={theme.colors.primary[500]} />
              <Text style={styles.sectionTitle}>Orders ({batch.orders.length})</Text>
            </View>
            
            {batch.orders.map((order, index) => (
              <OrderItem 
                key={order.id} 
                order={order} 
                index={index}
                isLast={index === batch.orders.length - 1}
              />
            ))}
          </Card>

          {/* Smart Routing */}
          {batch.enable_smart_routing && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="navigate" size={20} color={theme.colors.success[500]} />
                <Text style={styles.sectionTitle}>Smart Routing Enabled</Text>
              </View>
              <Text style={styles.infoText}>
                Orders will be automatically sorted for optimal navigation route
              </Text>
            </Card>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {(showAcceptDecline || showNavigate) && (
          <View style={styles.actionContainer}>
            {showAcceptDecline && (
              <View style={styles.actionButtons}>
                <Button
                  title="Decline"
                  onPress={onDecline}
                  variant="outline"
                  loading={isDeclining}
                  style={styles.actionButton}
                  icon={<Ionicons name="close" size={16} color={theme.colors.error[500]} />}
                  textStyle={{ color: theme.colors.error[500] }}
                />
                <Button
                  title="Accept Batch"
                  onPress={onAccept}
                  variant="primary"
                  loading={isAccepting}
                  style={styles.acceptButton}
                  icon={<Ionicons name="checkmark" size={16} color={theme.colors.neutral[0]} />}
                />
              </View>
            )}
            
            {showNavigate && (
              <Button
                title="Navigate to Pickup"
                onPress={onNavigate}
                variant="primary"
                fullWidth
                icon={<MaterialIcons name="navigation" size={20} color={theme.colors.neutral[0]} />}
              />
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// Order Item Component
interface OrderItemProps {
  order: BatchOrder;
  index: number;
  isLast: boolean;
}

const OrderItem: React.FC<OrderItemProps> = ({ order, index, isLast }) => {
  return (
    <View style={[styles.orderItem, !isLast && styles.orderItemBorder]}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{order.order_number}</Text>
        <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <Ionicons name="person" size={14} color={theme.colors.neutral[400]} />
          <Text style={styles.orderDetailText}>{order.recipient_name}</Text>
        </View>
        
        <View style={styles.orderDetailRow}>
          <Ionicons name="call" size={14} color={theme.colors.neutral[400]} />
          <Text style={styles.orderDetailText}>{order.recipient_phone}</Text>
        </View>
        
        <View style={styles.orderDetailRow}>
          <MaterialIcons name="location-on" size={14} color={theme.colors.neutral[400]} />
          <Text style={styles.orderDetailText} numberOfLines={2}>
            {order.delivery_address}
          </Text>
        </View>
        
        <View style={styles.orderDetailRow}>
          <Ionicons name="cube" size={14} color={theme.colors.neutral[400]} />
          <Text style={styles.orderDetailText}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {order.delivery_instructions && (
        <View style={styles.orderInstructions}>
          <Text style={styles.orderInstructionsText}>
            📝 {order.delivery_instructions}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    backgroundColor: theme.colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  
  headerTitle: {
    flex: 1,
  },
  
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing[1],
  },
  
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  
  summaryCard: {
    marginBottom: theme.spacing[4],
  },
  
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  
  batchName: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[900],
    marginRight: theme.spacing[2],
  },
  
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing[4],
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.base,
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
    marginBottom: theme.spacing[1],
  },
  
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
  },
  
  sectionCard: {
    marginBottom: theme.spacing[4],
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[900],
    marginLeft: theme.spacing[2],
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[700],
    marginLeft: theme.spacing[2],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.base,
  },
  
  instructionsContainer: {
    marginTop: theme.spacing[2],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.info[50],
    borderRadius: theme.borderRadius.base,
  },
  
  instructionsLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.info[700],
    marginBottom: theme.spacing[1],
  },
  
  instructionsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info[600],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.sm,
  },
  
  notesText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[700],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.base,
  },
  
  orderItem: {
    paddingVertical: theme.spacing[3],
  },
  
  orderItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  
  orderNumber: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[900],
  },
  
  orderTotal: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success[600],
  },
  
  orderDetails: {
    gap: theme.spacing[1],
  },
  
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  orderDetailText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginLeft: theme.spacing[2],
  },
  
  orderInstructions: {
    marginTop: theme.spacing[2],
    padding: theme.spacing[2],
    backgroundColor: theme.colors.warning[50],
    borderRadius: theme.borderRadius.sm,
  },
  
  orderInstructionsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning[700],
    fontStyle: 'italic',
  },
  
  actionContainer: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  
  actionButton: {
    flex: 1,
  },
  
  acceptButton: {
    flex: 2,
  },
});

export default BatchOrderDetailsModal;