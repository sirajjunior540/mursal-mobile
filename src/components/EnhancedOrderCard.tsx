import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { CameraScreen } from 'react-native-camera-kit';
import { Design } from '../constants/designSystem';
import { Order, BatchOrder, isBatchOrder, getBatchOrders } from '../types';
import { orderActionService } from '../services/orderActionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EnhancedOrderCardProps {
  order: Order | BatchOrder;
  onPress: () => void;
  onStatusUpdate?: (newStatus: string) => void;
  showStatusActions?: boolean;
}

const EnhancedOrderCard: React.FC<EnhancedOrderCardProps> = ({
  order,
  onPress,
  onStatusUpdate,
  showStatusActions = false,
}) => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  
  const isBatch = isBatchOrder(order);
  const batchOrder = isBatch ? order : null;

  const getNextStatus = () => {
    const statusFlow = {
      'assigned': 'accepted',
      'accepted': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'delivered',
    };
    return statusFlow[order.status as keyof typeof statusFlow] || null;
  };

  const getStatusButtonText = () => {
    const statusTexts = {
      'assigned': 'Accept Order',
      'accepted': 'Mark as Picked Up',
      'picked_up': 'Start Delivery',
      'in_transit': 'Complete Delivery',
    };
    return statusTexts[order.status as keyof typeof statusTexts] || 'Update Status';
  };

  const getStatusColor = () => {
    const colors = {
      'pending': '#6B7280',
      'assigned': '#F59E0B',
      'accepted': '#3B82F6',
      'picked_up': '#8B5CF6',
      'in_transit': '#10B981',
      'delivered': '#059669',
      'cancelled': '#EF4444',
    };
    return colors[order.status as keyof typeof colors] || '#6B7280';
  };

  const getOrderVariant = () => {
    if (isBatch) return 'batch';
    if (order.delivery_type === 'fast' || order.delivery_type === 'food') return 'fast_food';
    return 'regular';
  };

  const getVariantColors = () => {
    const variant = getOrderVariant();
    switch (variant) {
      case 'fast_food':
        return {
          cardBackground: '#FEF3C7', // Warm yellow background
          borderColor: '#F59E0B', // Orange border
          iconColor: '#F59E0B', // Orange icon
          badgeBackground: '#FBBF24', // Bright yellow badge
          badgeText: '#92400E', // Dark orange text
        };
      case 'batch':
        return {
          cardBackground: 'linear-gradient', // Will use LinearGradient
          borderColor: '#6366F1', // Indigo border
          iconColor: '#FFF', // White icons
          badgeBackground: 'rgba(255,255,255,0.2)', // Semi-transparent white
          badgeText: '#FFF', // White text
        };
      default:
        return {
          cardBackground: Design.colors.background, // Standard white/light
          borderColor: Design.colors.gray200, // Light gray border
          iconColor: '#6B7280', // Standard gray
          badgeBackground: Design.colors.gray100, // Light gray badge
          badgeText: Design.colors.text, // Standard text
        };
    }
  };

  const getVariantIcon = () => {
    const variant = getOrderVariant();
    switch (variant) {
      case 'fast_food':
        return 'flash'; // 🚀 Fast delivery icon
      case 'batch':
        return 'cube'; // Multi-stop icon
      default:
        return 'bag-outline'; // Regular order icon
    }
  };

  const handleQRScan = async (e: { data: string }) => {
    setShowQRScanner(false);
    
    // Verify the QR code matches the order
    const scannedData = e.data;
    const orderNumber = order.order_number || order.id;
    
    if (scannedData.includes(orderNumber) || scannedData === order.id) {
      // Valid QR code - update status
      if (pendingStatus && onStatusUpdate) {
        onStatusUpdate(pendingStatus);
      }
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not match the current order. Please scan the correct QR code.',
        [{ text: 'OK' }]
      );
    }
    setPendingStatus(null);
  };

  const handleStatusAction = (newStatus: string) => {
    Alert.alert(
      'Update Status',
      'How would you like to update the status?',
      [
        {
          text: 'Scan QR Code',
          onPress: () => {
            setPendingStatus(newStatus);
            setShowQRScanner(true);
          },
        },
        {
          text: 'Manual Update',
          onPress: () => {
            if (onStatusUpdate) {
              onStatusUpdate(newStatus);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderRegularOrder = () => {
    const variant = getOrderVariant();
    const variantColors = getVariantColors();
    const variantIcon = getVariantIcon();
    
    return (
      <View style={[
        styles.regularCard,
        variant === 'fast_food' && { backgroundColor: variantColors.cardBackground, borderWidth: 2, borderColor: variantColors.borderColor }
      ]}>
        <View style={styles.regularHeader}>
          <View style={styles.orderInfo}>
            <View style={styles.orderNumberRow}>
              <Ionicons 
                name={variantIcon} 
                size={18} 
                color={variantColors.iconColor} 
                style={{ marginRight: 8 }}
              />
              <Text style={styles.orderNumber}>Order #{order.order_number || order.id}</Text>
              {variant === 'fast_food' && (
                <View style={[styles.fastFoodBadge, { backgroundColor: variantColors.badgeBackground }]}>
                  <Text style={[styles.fastFoodBadgeText, { color: variantColors.badgeText }]}>
                    {order.delivery_type === 'fast' ? '🚀 FAST' : '🍔 FOOD'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.customerName}>
              {order.customer_details?.name || 'Customer'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>
              {order.status?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[
          styles.addressSection,
          variant === 'fast_food' && { backgroundColor: 'rgba(251, 191, 36, 0.1)' }
        ]}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#10B981" />
            <Text style={styles.addressText} numberOfLines={2}>
              {order.pickup_address || 'Pickup Location'}
            </Text>
          </View>
          <View style={styles.addressDivider} />
          <View style={styles.addressRow}>
            <Ionicons name="flag" size={16} color="#EF4444" />
            <Text style={styles.addressText} numberOfLines={2}>
              {order.delivery_address || 'Delivery Location'}
            </Text>
          </View>
        </View>

        {order.delivery_type && variant !== 'fast_food' && (
          <View style={styles.deliveryTypeBadge}>
            <Ionicons 
              name={order.delivery_type === 'fast' ? 'flash' : 'time-outline'} 
              size={14} 
              color="#8B5CF6" 
            />
            <Text style={styles.deliveryTypeText}>
              {order.delivery_type.toUpperCase()}
            </Text>
          </View>
        )}

        {order.priority === 'urgent' && (
          <View style={styles.urgentBadge}>
            <Ionicons name="warning" size={14} color="#DC2626" />
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBatchOrder = () => (
    <LinearGradient
      colors={['#4F46E5', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.batchCard}
    >
      <View style={styles.batchHeaderRow}>
        <View style={styles.batchBadge}>
          <Ionicons name="cube" size={20} color="#FFF" />
          <Text style={styles.batchLabel}>BATCH</Text>
        </View>
        <View style={[styles.statusBadge, styles.batchStatusBadge]}>
          <Text style={styles.statusText}>
            {order.status?.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.batchId}>Batch #{order.id}</Text>
      
      <View style={styles.batchStats}>
        <View style={styles.batchStat}>
          <Text style={styles.batchStatValue}>{batchOrder ? getBatchOrders(batchOrder).length : 0}</Text>
          <Text style={styles.batchStatLabel}>Orders</Text>
        </View>
        <View style={styles.batchStatDivider} />
        <View style={styles.batchStat}>
          <Text style={styles.batchStatValue}>
            {batchOrder?.batchMetadata?.totalItems || 0}
          </Text>
          <Text style={styles.batchStatLabel}>Items</Text>
        </View>
        <View style={styles.batchStatDivider} />
        <View style={styles.batchStat}>
          <Text style={styles.batchStatValue}>
            {batchOrder?.batchMetadata?.estimatedDuration || 0}m
          </Text>
          <Text style={styles.batchStatLabel}>Time</Text>
        </View>
      </View>

      {batchOrder?.warehouseInfo && (
        <View style={styles.warehouseInfoCompact}>
          <Ionicons name="business" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.warehouseNameCompact}>
            {batchOrder.warehouseInfo.name}
          </Text>
        </View>
      )}
    </LinearGradient>
  );

  const nextStatus = getNextStatus();

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={styles.container}>
          {isBatch ? renderBatchOrder() : renderRegularOrder()}
          
          {showStatusActions && nextStatus && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.statusActionButton}
                onPress={() => handleStatusAction(nextStatus)}
              >
                <View style={styles.statusActionContent}>
                  <View style={styles.statusActionLeft}>
                    <Ionicons name="qr-code" size={20} color="#4F46E5" />
                    <Text style={styles.statusActionText}>{getStatusButtonText()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#4F46E5" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowQRScanner(false)}>
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Order QR Code</Text>
            <View style={{ width: 30 }} />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.scannerInstruction}>
              Scan the QR code on the package to confirm {getStatusButtonText().toLowerCase()}
            </Text>
            <CameraScreen
              scanBarcode={true}
              onReadCode={(event: any) => handleQRScan({ data: event.nativeEvent.codeStringValue })}
              showFrame={true}
              frameColor="#FFF"
              laserColor="red"
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => {
                setShowQRScanner(false);
                if (pendingStatus && onStatusUpdate) {
                  onStatusUpdate(pendingStatus);
                }
              }}
            >
              <Text style={styles.manualButtonText}>Update Without Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Design.spacing[4],
    marginVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.xl,
    backgroundColor: Design.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  regularCard: {
    padding: Design.spacing[4],
  },
  regularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[3],
  },
  orderInfo: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Design.colors.text,
  },
  fastFoodBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  fastFoodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  addressSection: {
    backgroundColor: Design.colors.gray50,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[3],
    marginBottom: Design.spacing[3],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: Design.colors.text,
  },
  addressDivider: {
    height: 20,
    width: 1,
    backgroundColor: Design.colors.gray200,
    marginLeft: 20,
    marginVertical: Design.spacing[2],
  },
  deliveryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[1],
    backgroundColor: '#EDE9FE',
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.full,
    alignSelf: 'flex-start',
  },
  deliveryTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  batchCard: {
    padding: Design.spacing[5],
  },
  batchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[3],
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  },
  batchLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  batchId: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Design.spacing[3],
  },
  batchStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Design.spacing[3],
  },
  batchStat: {
    alignItems: 'center',
  },
  batchStatValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  batchStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  batchStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  warehouseInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  },
  warehouseNameCompact: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: Design.spacing[3],
    paddingVertical: Design.spacing[1],
    borderRadius: Design.borderRadius.full,
  },
  batchStatusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionSection: {
    borderTopWidth: 1,
    borderTopColor: Design.colors.gray100,
    padding: Design.spacing[3],
  },
  statusActionButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[3],
  },
  statusActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[3],
  },
  statusActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Design.spacing[4],
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  scannerInstruction: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    paddingHorizontal: Design.spacing[6],
    marginBottom: Design.spacing[3],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: Design.spacing[2],
  },
  manualButton: {
    backgroundColor: Design.colors.primary,
    paddingHorizontal: Design.spacing[6],
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.lg,
    marginTop: Design.spacing[6],
  },
  manualButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EnhancedOrderCard;