import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { UnifiedOrder } from '../services/unifiedOrderService';
import { Design } from '../constants/designSystem';

interface UnifiedOrderCardProps {
  order: UnifiedOrder;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

export const UnifiedOrderCard: React.FC<UnifiedOrderCardProps> = ({
  order,
  onPress,
  onAccept,
  onDecline,
  showActions = false,
}) => {
  const isBatchLeg = order.type === 'batch_leg';
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isBatchLeg && styles.batchContainer
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isBatchLeg ? 'cube' : 'restaurant'}
            size={24}
            color={isBatchLeg ? '#9333ea' : Design.colors.primary}
          />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{order.displayName}</Text>
          <Text style={styles.type}>
            {isBatchLeg ? 'Batch Delivery' : 'Regular Order'}
          </Text>
        </View>
        
        {order.estimatedEarnings && (
          <View style={styles.earningsContainer}>
            <Text style={styles.earnings}>
              ${order.estimatedEarnings.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.divider} />
      
      {order.pickupAddress && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.locationText} numberOfLines={1}>
            Pickup: {order.pickupAddress}
          </Text>
        </View>
      )}
      
      {order.deliveryAddress && (
        <View style={styles.locationRow}>
          <Ionicons name="flag" size={16} color="#6b7280" />
          <Text style={styles.locationText} numberOfLines={1}>
            Delivery: {order.deliveryAddress}
          </Text>
        </View>
      )}
      
      <View style={styles.footer}>
        <View style={styles.metrics}>
          {order.distance && (
            <View style={styles.metric}>
              <Ionicons name="navigate" size={14} color="#6b7280" />
              <Text style={styles.metricText}>
                {(order.distance / 1000).toFixed(1)} km
              </Text>
            </View>
          )}
          
          <View style={styles.metric}>
            <Ionicons name="time" size={14} color="#6b7280" />
            <Text style={styles.metricText}>
              {order.status}
            </Text>
          </View>
        </View>
        
        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={onDecline}
            >
              <Ionicons name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
            >
              <Ionicons name="checkmark" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  batchContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#9333ea',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  type: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  earningsContainer: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  earnings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metricText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#fee2e2',
  },
  acceptButton: {
    backgroundColor: '#d1fae5',
  },
});