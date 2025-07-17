import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { OrderActionsProps } from '../../types/orderDetails.types';
import { Design } from '../../constants/designSystem';
import { orderActionsStyles } from '../../design/orderDetails/orderActionsStyles';
import { getIoniconsName } from '../../utils/iconMapping';

export const OrderActions: React.FC<OrderActionsProps> = ({
  order,
  showStatusButton,
  readonly,
  isBatchOrder,
  isConsolidatedBatch,
  batchProperties,
  onStatusUpdate,
  onAccept,
  onDecline,
  onAcceptRoute,
  onClose,
}) => {
  const [loading, setLoading] = React.useState(false);

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: { [key: string]: string } = {
      'pending': 'accepted',
      'assigned': 'accepted',
      'accepted': 'picked_up',
      'confirmed': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'delivered',
    };
    return statusFlow[currentStatus?.toLowerCase()] || null;
  };

  const getStatusButtonConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'assigned':
        return {
          label: isBatchOrder ? 'Accept All Orders' : 'Accept Order',
          icon: 'check-circle',
          colors: ['#10B981', '#059669'],
        };
      case 'accepted':
      case 'confirmed':
        return {
          label: 'Mark as Picked Up',
          icon: 'package-variant',
          colors: ['#3B82F6', '#2563EB'],
        };
      case 'picked_up':
        return {
          label: 'Start Delivery',
          icon: 'truck-delivery',
          colors: ['#8B5CF6', '#7C3AED'],
        };
      case 'in_transit':
        return {
          label: 'Complete Delivery',
          icon: 'check-all',
          colors: ['#10B981', '#059669'],
        };
      default:
        return null;
    }
  };

  const handleStatusUpdate = async () => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    setLoading(true);
    try {
      if (isConsolidatedBatch && batchProperties) {
        // Update all orders in consolidated batch
        await Promise.all(
          batchProperties.orders.map(batchOrder => 
            onStatusUpdate(batchOrder.id, nextStatus)
          )
        );
      } else {
        await onStatusUpdate(order.id, nextStatus);
      }
      
      if (nextStatus === 'delivered') {
        setTimeout(onClose, 1000);
      }
    } catch (error) {
      console.error('Status update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      if (isBatchOrder && batchProperties && onAcceptRoute) {
        const orderIds = batchProperties.orders.map(o => o.id);
        await onAcceptRoute(orderIds);
      } else if (onAccept) {
        await onAccept(order.id);
      }
    } catch (error) {
      console.error('Accept failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (onDecline) {
      setLoading(true);
      try {
        await onDecline(order.id);
        setTimeout(onClose, 500);
      } catch (error) {
        console.error('Decline failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const statusConfig = getStatusButtonConfig(order.status);
  const isDelivered = order.status?.toLowerCase() === 'delivered';
  const isPendingOrAssigned = ['pending', 'assigned'].includes(order.status?.toLowerCase());
  const showAcceptDecline = isPendingOrAssigned && !readonly;

  if (isDelivered) {
    return (
      <View style={orderActionsStyles.container}>
        <View style={orderActionsStyles.completedContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          <Text style={orderActionsStyles.completedText}>Order Delivered Successfully</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={orderActionsStyles.container}>
      {showStatusButton && statusConfig && !isPendingOrAssigned && (
        <TouchableOpacity
          onPress={handleStatusUpdate}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={statusConfig.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={orderActionsStyles.primaryButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons 
                  name={getIoniconsName(statusConfig.icon)} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={orderActionsStyles.primaryButtonText}>
                  {statusConfig.label}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}

      {showAcceptDecline && (
        <View style={orderActionsStyles.acceptDeclineContainer}>
          <TouchableOpacity
            style={[orderActionsStyles.secondaryButton, orderActionsStyles.declineButton]}
            onPress={handleDecline}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={[orderActionsStyles.secondaryButtonText, { color: '#EF4444' }]}>
              Decline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.8}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={orderActionsStyles.acceptButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={orderActionsStyles.primaryButtonText}>
                    {isBatchOrder ? 'Accept All Orders' : 'Accept Order'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {isBatchOrder && isConsolidatedBatch && (
        <View style={orderActionsStyles.batchInfo}>
          <Ionicons name="information-circle-outline" size={16} color={Design.colors.textSecondary} />
          <Text style={orderActionsStyles.batchInfoText}>
            All {batchProperties?.orders.length} orders will be updated together
          </Text>
        </View>
      )}
    </View>
  );
};