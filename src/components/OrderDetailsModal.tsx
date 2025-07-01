import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../types';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
  onNavigate?: (latitude: number, longitude: number) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible,
  order,
  onClose,
  onStatusUpdate,
  onNavigate,
}) => {
  if (!order) return null;

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'picked_up': 
      case 'in_transit': return '#8B5CF6';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'assigned':
      case 'accepted':
        return 'picked_up';
      case 'picked_up':
      case 'in_transit':
        return 'delivered';
      default:
        return null;
    }
  };

  const getStatusButtonText = (currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus === 'picked_up') return 'Mark Picked Up';
    if (nextStatus === 'delivered') return 'Mark Delivered';
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Order Details</Text>
            <Text style={styles.orderNumber}>
              #{order.order_number || order.id?.toString().slice(-4)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status?.toUpperCase()}</Text>
            </View>
          </View>

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.customerRow}>
              <View style={styles.customerInfo}>
                <Ionicons name="person" size={20} color="#6B7280" />
                <Text style={styles.customerName}>
                  {order.customer_details?.name || order.customer?.name || 'Unknown Customer'}
                </Text>
              </View>
              {(order.customer_details?.phone || order.customer?.phone) && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(order.customer_details?.phone || order.customer?.phone || '')}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Pickup Address */}
          {order.pickup_address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pickup Location</Text>
              <View style={styles.addressRow}>
                <Ionicons name="storefront" size={20} color="#6B7280" />
                <Text style={styles.address}>{order.pickup_address}</Text>
              </View>
              {order.pickup_latitude && order.pickup_longitude && (
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => onNavigate?.(order.pickup_latitude!, order.pickup_longitude!)}
                >
                  <Ionicons name="navigate" size={16} color="#3B82F6" />
                  <Text style={styles.navigateText}>Navigate to Pickup</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Delivery Address */}
          {order.delivery_address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Location</Text>
              <View style={styles.addressRow}>
                <Ionicons name="home" size={20} color="#6B7280" />
                <Text style={styles.address}>{order.delivery_address}</Text>
              </View>
              {order.delivery_latitude && order.delivery_longitude && (
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => onNavigate?.(order.delivery_latitude!, order.delivery_longitude!)}
                >
                  <Ionicons name="navigate" size={16} color="#3B82F6" />
                  <Text style={styles.navigateText}>Navigate to Delivery</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items</Text>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price?.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Total Amount */}
          {order.total_amount && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Total</Text>
              <Text style={styles.totalAmount}>${order.total_amount.toFixed(2)}</Text>
            </View>
          )}

          {/* Special Instructions */}
          {order.special_instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <Text style={styles.instructions}>{order.special_instructions}</Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {onStatusUpdate && (
          <View style={styles.actionSection}>
            {getStatusButtonText(order.status) && (
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: getStatusColor(getNextStatus(order.status)!) }]}
                onPress={() => onStatusUpdate(order.id.toString(), getNextStatus(order.status)!)}
              >
                <Ionicons 
                  name={getNextStatus(order.status) === 'picked_up' ? 'checkmark-circle' : 'flag'} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.statusButtonText}>{getStatusButtonText(order.status)}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  orderNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 32,
  },
  navigateText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 6,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 40,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  instructions: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  actionSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default OrderDetailsModal;