/**
 * BatchOrderCard - Reusable component for displaying batch order information
 * Follows industry best practices with proper TypeScript typing and accessibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../design/theme';
import Card from './Card';
import StatusBadge from './StatusBadge';
import Button from './Button';
import { BatchOrderInfo, BatchStatus } from '../../shared/types/order.types';

interface BatchOrderCardProps {
  batch: BatchOrderInfo;
  
  // Actions
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onNavigate?: () => void;
  onViewDetails?: () => void;
  
  // Loading states
  isAccepting?: boolean;
  isDeclining?: boolean;
  
  // Layout
  variant?: 'available' | 'ongoing' | 'history';
  showActions?: boolean;
  
  // Additional props
  distance?: number;
  estimatedTime?: string;
}

const BatchOrderCard: React.FC<BatchOrderCardProps> = ({
  batch,
  onPress,
  onAccept,
  onDecline,
  onNavigate,
  onViewDetails,
  isAccepting = false,
  isDeclining = false,
  variant = 'available',
  showActions = true,
  distance,
  estimatedTime,
}) => {
  const statusConfig = getBatchStatusConfig(batch.status);
  const stepConfig = getStepConfig(batch.current_step);
  
  // Calculate total estimated value for display
  const totalValue = batch.orders.reduce((sum, order) => sum + order.total, 0);
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessible={true}>
      <Card style={[styles.card, statusConfig.cardStyle]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.batchInfo}>
            <Text style={styles.batchNumber}>{batch.batch_number}</Text>
            <Text style={styles.batchName} numberOfLines={1}>
              {batch.name}
            </Text>
            <View style={styles.badges}>
              <StatusBadge status={batch.status as any} size="sm" />
              <View style={[styles.stepBadge, { backgroundColor: stepConfig.color }]}>
                <Text style={styles.stepText}>{stepConfig.label}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.valueSection}>
            <Text style={styles.totalValue}>${totalValue.toFixed(2)}</Text>
            <Text style={styles.orderCount}>{batch.total_orders} order{batch.total_orders !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Batch Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="cube" size={16} color={theme.colors.primary[500]} />
              <Text style={styles.summaryText}>{batch.total_items} items</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="people" size={16} color={theme.colors.info[500]} />
              <Text style={styles.summaryText}>{batch.total_orders} recipients</Text>
            </View>
          </View>
        </View>

        {/* Pickup Information */}
        <View style={styles.pickupSection}>
          <View style={styles.pickupHeader}>
            <MaterialIcons name="local-shipping" size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.pickupLabel}>Pickup Location</Text>
          </View>
          <Text style={styles.pickupAddress} numberOfLines={2}>
            {batch.pickup_address}
          </Text>
          
          {batch.pickup_contact_name && (
            <View style={styles.contactInfo}>
              <Ionicons name="person" size={14} color={theme.colors.neutral[400]} />
              <Text style={styles.contactText}>{batch.pickup_contact_name}</Text>
              {batch.pickup_contact_phone && (
                <>
                  <Text style={styles.contactSeparator}>•</Text>
                  <Text style={styles.contactText}>{batch.pickup_contact_phone}</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Scheduling Information */}
        {(batch.scheduled_pickup_date || batch.scheduled_pickup_time) && (
          <View style={styles.schedulingSection}>
            <View style={styles.schedulingHeader}>
              <Ionicons name="time" size={16} color={theme.colors.warning[500]} />
              <Text style={styles.schedulingLabel}>Scheduled</Text>
            </View>
            <Text style={styles.schedulingText}>
              {batch.scheduled_pickup_date && new Date(batch.scheduled_pickup_date).toLocaleDateString()}
              {batch.scheduled_pickup_date && batch.scheduled_pickup_time && ' at '}
              {batch.scheduled_pickup_time}
            </Text>
          </View>
        )}

        {/* Notes Section */}
        {batch.batch_notes && (
          <View style={styles.notesSection}>
            <Ionicons name="information-circle" size={14} color={theme.colors.info[500]} />
            <Text style={styles.notes} numberOfLines={2}>
              {batch.batch_notes}
            </Text>
          </View>
        )}

        {/* Pickup Instructions */}
        {batch.pickup_instructions && (
          <View style={styles.instructionsSection}>
            <Ionicons name="list" size={14} color={theme.colors.warning[500]} />
            <Text style={styles.instructions} numberOfLines={3}>
              {batch.pickup_instructions}
            </Text>
          </View>
        )}

        {/* Meta Information */}
        <View style={styles.metaSection}>
          {distance && (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={12} color={theme.colors.neutral[400]} />
              <Text style={styles.metaText}>{distance.toFixed(1)}km away</Text>
            </View>
          )}
          {estimatedTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time" size={12} color={theme.colors.neutral[400]} />
              <Text style={styles.metaText}>ETA: {estimatedTime}</Text>
            </View>
          )}
          {batch.enable_smart_routing && (
            <View style={styles.metaItem}>
              <Ionicons name="navigate" size={12} color={theme.colors.success[500]} />
              <Text style={styles.metaText}>Smart Routing</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={12} color={theme.colors.neutral[400]} />
            <Text style={styles.metaText}>
              {new Date(batch.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        {showActions && (
          <View style={styles.actionsSection}>
            {variant === 'available' && (
              <View style={styles.availableActions}>
                <Button
                  title="Details"
                  onPress={onViewDetails}
                  variant="outline"
                  size="sm"
                  style={styles.actionButton}
                  icon={<Ionicons name="information-circle" size={16} color={theme.colors.primary[500]} />}
                />
                <Button
                  title="Decline"
                  onPress={onDecline}
                  variant="ghost"
                  size="sm"
                  loading={isDeclining}
                  style={styles.actionButton}
                  icon={<Ionicons name="close" size={16} color={theme.colors.error[500]} />}
                  textStyle={{ color: theme.colors.error[500] }}
                />
                <Button
                  title="Accept Batch"
                  onPress={onAccept}
                  variant="primary"
                  size="sm"
                  loading={isAccepting}
                  style={styles.acceptButton}
                  icon={<Ionicons name="checkmark" size={16} color={theme.colors.neutral[0]} />}
                />
              </View>
            )}
            
            {variant === 'ongoing' && (
              <View style={styles.ongoingActions}>
                <Button
                  title="View Details"
                  onPress={onViewDetails}
                  variant="outline"
                  size="sm"
                  style={styles.actionButton}
                  icon={<Ionicons name="list" size={16} color={theme.colors.primary[500]} />}
                />
                <Button
                  title="Navigate"
                  onPress={onNavigate}
                  variant="primary"
                  size="sm"
                  style={styles.actionButton}
                  icon={<MaterialIcons name="navigation" size={16} color={theme.colors.neutral[0]} />}
                />
              </View>
            )}
            
            {variant === 'history' && (
              <View style={styles.historyActions}>
                <Button
                  title="View Details"
                  onPress={onViewDetails}
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<Ionicons name="list" size={16} color={theme.colors.primary[500]} />}
                />
              </View>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

// Helper functions for status and step configurations
const getBatchStatusConfig = (status: BatchStatus) => {
  const configs = {
    [BatchStatus.DRAFT]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.neutral[300] },
    },
    [BatchStatus.SUBMITTED]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.info[500] },
    },
    [BatchStatus.READY_FOR_PICKUP]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.success[500] },
    },
    [BatchStatus.DRIVER_ASSIGNED]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary[500] },
    },
    [BatchStatus.COLLECTED]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.warning[500] },
    },
    [BatchStatus.FINAL_DELIVERY]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.warning[600] },
    },
    [BatchStatus.COMPLETED]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.success[600] },
    },
    [BatchStatus.CANCELLED]: {
      cardStyle: { borderLeftWidth: 4, borderLeftColor: theme.colors.error[500] },
    },
  };
  
  return configs[status] || configs[BatchStatus.DRAFT];
};

const getStepConfig = (step: number) => {
  const configs = {
    1: { label: 'Step 1', color: theme.colors.info[100] },
    2: { label: 'Step 2', color: theme.colors.warning[100] },
    3: { label: 'Step 3', color: theme.colors.success[100] },
    4: { label: 'Ready', color: theme.colors.primary[100] },
  };
  
  return configs[step as keyof typeof configs] || configs[1];
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
  },
  
  batchInfo: {
    flex: 1,
    marginRight: theme.spacing[4],
  },
  
  batchNumber: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[1],
  },
  
  batchName: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing[2],
  },
  
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  
  stepBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  
  stepText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[700],
  },
  
  valueSection: {
    alignItems: 'flex-end',
  },
  
  totalValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success[600],
    marginBottom: theme.spacing[1],
  },
  
  orderCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  summarySection: {
    marginBottom: theme.spacing[4],
  },
  
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.base,
  },
  
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  
  summaryText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  pickupSection: {
    marginBottom: theme.spacing[4],
  },
  
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  
  pickupLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[600],
    marginLeft: theme.spacing[2],
  },
  
  pickupAddress: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[800],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.base,
    marginBottom: theme.spacing[2],
  },
  
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  
  contactText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
  },
  
  contactSeparator: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[400],
  },
  
  schedulingSection: {
    marginBottom: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.warning[50],
    borderRadius: theme.borderRadius.base,
  },
  
  schedulingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  
  schedulingLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.warning[700],
    marginLeft: theme.spacing[2],
  },
  
  schedulingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.warning[800],
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.info[50],
    borderRadius: theme.borderRadius.base,
  },
  
  notes: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info[700],
    marginLeft: theme.spacing[2],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.sm,
  },
  
  instructionsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.warning[50],
    borderRadius: theme.borderRadius.base,
  },
  
  instructions: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning[700],
    marginLeft: theme.spacing[2],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.sm,
  },
  
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  
  metaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    paddingTop: theme.spacing[3],
  },
  
  availableActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  
  ongoingActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  
  historyActions: {
    flexDirection: 'row',
  },
  
  actionButton: {
    flex: 1,
  },
  
  acceptButton: {
    flex: 1.5,
  },
});

export default BatchOrderCard;