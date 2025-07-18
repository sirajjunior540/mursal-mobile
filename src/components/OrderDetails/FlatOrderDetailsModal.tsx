import React, { useState } from 'react';
import { Modal, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../../types';
import { flatModalStyles } from '../../design/orderDetails/flatModalStyles';
import { FlatOrderHeader } from './FlatOrderHeader';
import { FlatSpecialHandlingBadges } from './FlatSpecialHandlingBadges';
import { FlatOrderInfoSection } from './FlatOrderInfoSection';
import { FlatOrderActions } from './FlatOrderActions';

interface FlatOrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  readonly?: boolean;
  showStatusButton?: boolean;
  isBatchView?: boolean;
  batchOrders?: Order[];
  batchType?: 'distribution' | 'consolidated' | null;
  onClose: () => void;
  onAccept?: (order: Order) => void;
  onDecline?: (order: Order) => void;
  onAcceptRoute?: (order: Order) => void;
  onStatusUpdate?: (orderId: string, status: string) => void;
  onCall?: (phone: string) => void;
  onNavigate?: (order: Order) => void;
}

export const FlatOrderDetailsModal: React.FC<FlatOrderDetailsModalProps> = ({
  visible,
  order,
  readonly = false,
  showStatusButton = true,
  isBatchView = false,
  batchOrders = [],
  batchType = null,
  onClose,
  onAccept,
  onDecline,
  onAcceptRoute,
  onStatusUpdate,
  onCall,
  onNavigate,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showBatchList, setShowBatchList] = useState(true);

  if (!order) return null;

  // Handle batch order selection
  const handleOrderSelect = (batchOrder: Order) => {
    setSelectedOrder(batchOrder);
    setShowBatchList(false);
  };

  const handleBackToBatch = () => {
    setSelectedOrder(null);
    setShowBatchList(true);
  };

  // Determine current order to display
  const currentOrder = selectedOrder || order;
  const isShowingBatchList = isBatchView && showBatchList && batchOrders.length > 1;
  const isShowingIndividualOrder = !isShowingBatchList;

  // Calculate batch properties for actions
  const batchProperties = isBatchView ? {
    orders: batchOrders,
    totalValue: batchOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  } : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={flatModalStyles.modalOverlay}>
        {/* Back button for individual order view in batch */}
        {selectedOrder && (
          <TouchableOpacity 
            style={flatModalStyles.backButton} 
            onPress={handleBackToBatch}
          >
            <Ionicons name="chevron-back" size={20} color="#007AFF" />
            <Text style={flatModalStyles.backButtonText}>Back to Batch</Text>
          </TouchableOpacity>
        )}

        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={flatModalStyles.scrollViewContent}
        >
            {/* Header */}
            <FlatOrderHeader
              order={currentOrder}
              onClose={onClose}
              title={
                isShowingBatchList ? 'Batch Orders' :
                selectedOrder ? 'Order Details' :
                isBatchView ? 'Batch Details' :
                'Order Details'
              }
              isBatchView={isShowingBatchList}
              batchType={batchType}
              orderCount={batchOrders.length}
              onMarkAsFailed={
                currentOrder && onStatusUpdate && !readonly && 
                (currentOrder.status === 'picked_up' || currentOrder.status === 'in_transit')
                  ? () => onStatusUpdate(currentOrder.id, 'failed')
                  : undefined
              }
            />

            {/* Batch Orders List */}
            {isShowingBatchList && (
              <BatchOrdersList
                orders={batchOrders}
                onOrderSelect={handleOrderSelect}
                batchType={batchType}
              />
            )}

            {/* Individual Order Details */}
            {isShowingIndividualOrder && (
              <>
                {/* Special Handling Badges */}
                <FlatSpecialHandlingBadges order={currentOrder} />

                {/* Order Information */}
                <FlatOrderInfoSection
                  order={currentOrder}
                  readonly={readonly}
                  onCall={onCall}
                  onNavigate={onNavigate}
                />

                {/* Order Actions */}
                <FlatOrderActions
                  order={currentOrder}
                  showStatusButton={showStatusButton}
                  readonly={readonly}
                  isBatchOrder={isBatchView && !selectedOrder}
                  isConsolidatedBatch={batchType === 'consolidated'}
                  batchProperties={batchProperties}
                  onStatusUpdate={onStatusUpdate}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  onAcceptRoute={onAcceptRoute}
                  onClose={onClose}
                />
              </>
            )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Batch Orders List Component
interface BatchOrdersListProps {
  orders: Order[];
  onOrderSelect: (order: Order) => void;
  batchType?: 'distribution' | 'consolidated' | null;
}

const BatchOrdersList: React.FC<BatchOrdersListProps> = ({
  orders,
  onOrderSelect,
  batchType,
}) => {
  return (
    <View style={batchListStyles.container}>
      <Text style={batchListStyles.title}>
        {batchType === 'consolidated' ? 'Consolidated Orders' : 'Distribution Orders'}
      </Text>
      <Text style={batchListStyles.subtitle}>
        {orders.length} orders • Total: {orders[0]?.currency || 'SAR'} {orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
      </Text>
      
      <View style={batchListStyles.ordersList}>
        {orders.map((batchOrder, index) => (
          <TouchableOpacity
            key={batchOrder.id || index}
            style={batchListStyles.orderCard}
            onPress={() => onOrderSelect(batchOrder)}
            activeOpacity={0.7}
          >
            <View style={batchListStyles.orderHeader}>
              <View style={batchListStyles.orderNumber}>
                <Text style={batchListStyles.orderNumberText}>
                  #{batchOrder.order_number || `Order ${index + 1}`}
                </Text>
              </View>
              <View style={batchListStyles.orderValue}>
                <Text style={batchListStyles.orderValueText}>
                  {batchOrder.currency || 'SAR'} {batchOrder.total_amount?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={batchListStyles.customerInfo}>
              <Ionicons name="person" size={16} color="#666" />
              <Text style={batchListStyles.customerName}>
                {batchOrder.customer?.name || batchOrder.customer_details?.name || 'Unknown Customer'}
              </Text>
            </View>
            
            <View style={batchListStyles.addressInfo}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={batchListStyles.addressText} numberOfLines={2}>
                {batchOrder.delivery_address || 'Address not provided'}
              </Text>
            </View>
            
            <View style={batchListStyles.viewButton}>
              <Text style={batchListStyles.viewButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

import { StyleSheet } from 'react-native';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

const batchListStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[600],
    marginBottom: 16,
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    gap: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    backgroundColor: flatColors.cards.blue.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderNumberText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.accent.blue,
  },
  orderValue: {
    backgroundColor: flatColors.cards.green.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderValueText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.accent.green,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    flex: 1,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[600],
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  viewButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.blue,
  },
});