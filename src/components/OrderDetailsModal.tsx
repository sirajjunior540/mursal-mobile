import React from 'react';
import { Modal, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { OrderDetailsModalProps, BatchProperties } from '../types/orderDetails.types';
import { OrderHeader } from './OrderDetails/OrderHeader';
import { OrderInfoSection } from './OrderDetails/OrderInfoSection';
import { SpecialHandlingBadges } from './OrderDetails/SpecialHandlingBadges';
import { BatchOrdersList } from './OrderDetails/BatchOrdersList';
import { OrderActions } from './OrderDetails/OrderActions';
import { MapSection } from './OrderDetails/MapSection';
import { Design } from '../constants/designSystem';
import { modalStyles } from '../design/orderDetails/modalStyles';
import { Order } from '../types';

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible,
  order,
  onClose,
  onStatusUpdate,
  onAccept,
  onDecline,
  onNavigate,
  onCall,
  onAcceptRoute,
  showStatusButton = true,
  readonly = false,
  title = 'Order Details',
}) => {
  const [selectedBatchOrder, setSelectedBatchOrder] = React.useState<Order | null>(null);
  
  // Reset selected batch order when modal is closed
  React.useEffect(() => {
    if (!visible) {
      setSelectedBatchOrder(null);
    }
  }, [visible]);

  // Check if this is a batch order
  const isBatchOrder = order?.current_batch !== undefined && order?.current_batch !== null;
  
  // Get batch properties if available
  const batchProperties: BatchProperties | null = React.useMemo(() => {
    if (!order || !isBatchOrder || !order.current_batch) return null;
    
    const batchOrders = order.current_batch.orders || [];
    const totalValue = batchOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    
    return {
      orders: batchOrders,
      totalValue,
      isBatch: true,
    };
  }, [order, isBatchOrder, order?.current_batch]);

  // Determine batch type
  const batchType = React.useMemo(() => {
    if (!batchProperties || batchProperties.orders.length <= 1) return null;
    
    const uniqueDeliveryAddresses = new Set(
      batchProperties.orders.map(o => o.delivery_address).filter(Boolean)
    );
    
    return uniqueDeliveryAddresses.size > 1 ? 'distribution' : 'consolidated';
  }, [batchProperties]);

  const isDistributionBatch = batchType === 'distribution';
  const isConsolidatedBatch = batchType === 'consolidated';

  // Handle back button for batch orders
  const handleBack = () => {
    setSelectedBatchOrder(null);
  };

  // Early return if no order (after all hooks)
  if (!order) return null;

  // If we have selected a batch order, show its details
  if (selectedBatchOrder) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            {/* Back Button */}
            <TouchableOpacity
              style={modalStyles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={Design.colors.primary} />
              <Text style={modalStyles.backButtonText}>Back to Batch</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <OrderHeader
                order={selectedBatchOrder}
                onClose={onClose}
                title="Order Details"
              />

              <SpecialHandlingBadges order={selectedBatchOrder} />
              
              <OrderInfoSection
                order={selectedBatchOrder}
                readonly={readonly}
                onCall={onCall}
                onNavigate={onNavigate}
              />

              <MapSection order={selectedBatchOrder} />

              <OrderActions
                order={selectedBatchOrder}
                showStatusButton={showStatusButton}
                readonly={readonly}
                isBatchOrder={false}
                isConsolidatedBatch={false}
                onStatusUpdate={onStatusUpdate}
                onAccept={onAccept}
                onDecline={onDecline}
                onAcceptRoute={onAcceptRoute}
                onClose={onClose}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // Show batch orders list if it's a multi-order batch
  if (batchProperties && batchProperties.orders.length > 1) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <OrderHeader
              order={order}
              onClose={onClose}
              title="Batch Order Details"
              isBatchView={true}
              batchType={batchType}
              orderCount={batchProperties.orders.length}
            />

            <BatchOrdersList
              orders={batchProperties.orders}
              totalValue={batchProperties.totalValue}
              onSelectOrder={setSelectedBatchOrder}
              batchType={batchType!}
            />

            <OrderActions
              order={order}
              showStatusButton={showStatusButton}
              readonly={readonly}
              isBatchOrder={true}
              isConsolidatedBatch={isConsolidatedBatch}
              batchProperties={batchProperties}
              onStatusUpdate={onStatusUpdate}
              onAccept={onAccept}
              onDecline={onDecline}
              onAcceptRoute={onAcceptRoute}
              onClose={onClose}
            />
          </View>
        </View>
      </Modal>
    );
  }

  // Show regular order details
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <OrderHeader
              order={order}
              onClose={onClose}
              title={title}
            />

            <SpecialHandlingBadges order={order} />
            
            <OrderInfoSection
              order={order}
              readonly={readonly}
              onCall={onCall}
              onNavigate={onNavigate}
            />

            <MapSection order={order} />

            <OrderActions
              order={order}
              showStatusButton={showStatusButton}
              readonly={readonly}
              isBatchOrder={false}
              isConsolidatedBatch={false}
              onStatusUpdate={onStatusUpdate}
              onAccept={onAccept}
              onDecline={onDecline}
              onAcceptRoute={onAcceptRoute}
              onClose={onClose}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default OrderDetailsModal;