import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../design/theme';
import Card from './Card';
import StatusBadge, { OrderStatus } from './StatusBadge';
import Button from './Button';

interface OrderCardProps {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryType?: 'regular' | 'food' | 'fast';
  status?: OrderStatus;
  total?: string;
  distance?: number;
  estimatedTime?: string;
  paymentMethod?: string;
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Actions
  onPress?: () => void;
  onCall?: (phone: string) => void;
  onNavigate?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  
  // Loading states
  isAccepting?: boolean;
  isDeclining?: boolean;
  
  // Layout
  variant?: 'available' | 'ongoing' | 'history';
  showActions?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  id,
  orderNumber = 'N/A',
  customerName = 'Unknown Customer',
  customerPhone,
  deliveryAddress = 'Address not provided',
  deliveryType = 'regular',
  status = 'pending',
  total = '0.00',
  distance,
  estimatedTime,
  paymentMethod,
  notes,
  priority = 'normal',
  
  onPress,
  onCall,
  onNavigate,
  onAccept,
  onDecline,
  
  isAccepting = false,
  isDeclining = false,
  
  variant = 'available',
  showActions = true,
}) => {
  const deliveryTypeConfig = getDeliveryTypeConfig(deliveryType);
  const priorityConfig = getPriorityConfig(priority);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{orderNumber}</Text>
            <View style={styles.badges}>
              <StatusBadge status={status} size="sm" />
              {priority !== 'normal' && (
                <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color }]}>
                  <Text style={styles.priorityText}>{priorityConfig.label}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={styles.amount}>${total}</Text>
            {paymentMethod && (
              <Text style={styles.paymentMethod}>{paymentMethod.toUpperCase()}</Text>
            )}
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitial}>
                {customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{customerName}</Text>
              <View style={styles.deliveryTypeBadge}>
                <Ionicons 
                  name={deliveryTypeConfig.icon} 
                  size={12} 
                  color={deliveryTypeConfig.color} 
                />
                <Text style={[styles.deliveryTypeText, { color: deliveryTypeConfig.color }]}>
                  {deliveryType.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          
          {customerPhone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => onCall?.(customerPhone)}
            >
              <Ionicons name="call" size={16} color={theme.colors.neutral[0]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Address Section */}
        <View style={styles.addressSection}>
          <MaterialIcons name="location-on" size={16} color={theme.colors.neutral[400]} />
          <Text style={styles.address} numberOfLines={2}>
            {deliveryAddress}
          </Text>
        </View>

        {/* Notes Section */}
        {notes && (
          <View style={styles.notesSection}>
            <Ionicons name="information-circle" size={14} color={theme.colors.info[500]} />
            <Text style={styles.notes} numberOfLines={2}>
              {notes}
            </Text>
          </View>
        )}

        {/* Meta Information */}
        <View style={styles.metaSection}>
          {distance && (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={12} color={theme.colors.neutral[400]} />
              <Text style={styles.metaText}>{distance.toFixed(1)}km</Text>
            </View>
          )}
          {estimatedTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time" size={12} color={theme.colors.neutral[400]} />
              <Text style={styles.metaText}>ETA: {estimatedTime}</Text>
            </View>
          )}
        </View>

        {/* Actions Section */}
        {showActions && (
          <View style={styles.actionsSection}>
            {variant === 'available' && (
              <View style={styles.availableActions}>
                <Button
                  title="Navigate"
                  onPress={onNavigate}
                  variant="outline"
                  size="sm"
                  style={styles.actionButton}
                  icon={<MaterialIcons name="navigation" size={16} color={theme.colors.primary[500]} />}
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
                  title="Accept"
                  onPress={onAccept}
                  variant="primary"
                  size="sm"
                  loading={isAccepting}
                  style={styles.acceptButton}
                  icon={<Ionicons name="checkmark" size={16} color={theme.colors.neutral[0]} />}
                />
              </View>
            )}
            
            {(variant === 'ongoing' || variant === 'history') && (
              <View style={styles.simpleActions}>
                <Button
                  title="Navigate"
                  onPress={onNavigate}
                  variant="primary"
                  size="sm"
                  fullWidth
                  icon={<MaterialIcons name="navigation" size={16} color={theme.colors.neutral[0]} />}
                />
              </View>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const getDeliveryTypeConfig = (type: string) => {
  const configs = {
    food: {
      icon: 'restaurant' as const,
      color: theme.colors.warning[600],
    },
    fast: {
      icon: 'flash' as const,
      color: theme.colors.error[600],
    },
    regular: {
      icon: 'cube' as const,
      color: theme.colors.primary[600],
    },
  };
  
  return configs[type as keyof typeof configs] || configs.regular;
};

const getPriorityConfig = (priority: string) => {
  const configs = {
    urgent: {
      label: 'URGENT',
      color: theme.colors.error[100],
    },
    high: {
      label: 'HIGH',
      color: theme.colors.warning[100],
    },
    normal: {
      label: 'NORMAL',
      color: theme.colors.neutral[100],
    },
    low: {
      label: 'LOW',
      color: theme.colors.neutral[100],
    },
  };
  
  return configs[priority as keyof typeof configs] || configs.normal;
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  
  orderInfo: {
    flex: 1,
  },
  
  orderNumber: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[2],
  },
  
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  
  priorityBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  
  priorityText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
  },
  
  amountSection: {
    alignItems: 'flex-end',
  },
  
  amount: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success[600],
    marginBottom: theme.spacing[1],
  },
  
  paymentMethod: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  
  customerInitial: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[700],
  },
  
  customerDetails: {
    flex: 1,
  },
  
  customerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[1],
  },
  
  deliveryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  deliveryTypeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing[1],
  },
  
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  
  address: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginLeft: theme.spacing[2],
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.sm,
  },
  
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
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
  
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    gap: theme.spacing[4],
  },
  
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  metaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginLeft: theme.spacing[1],
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
  
  actionButton: {
    flex: 1,
  },
  
  acceptButton: {
    flex: 1.5,
  },
  
  simpleActions: {
    flexDirection: 'row',
  },
});

export default OrderCard;