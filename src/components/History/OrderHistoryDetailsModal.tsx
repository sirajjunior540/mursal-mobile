import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { Order, OrderItem, VariantGroup, AddonGroup } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

interface OrderHistoryDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  order: Order;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OrderHistoryDetailsModal: React.FC<OrderHistoryDetailsModalProps> = ({
  isVisible,
  onClose,
  order,
}) => {
  // Generate QR code data
  const qrCodeData = useMemo(() => {
    return JSON.stringify({
      order_number: order.order_number,
      id: order.id,
      status: order.status,
      created_at: order.created_at,
    });
  }, [order]);

  // Check if order is part of a batch
  const isBatchOrder = order.current_batch !== undefined && order.current_batch !== null;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text" size={24} color={flatColors.accent.blue} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>#{order.order_number || 'N/A'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={flatColors.neutral[600]} />
      </TouchableOpacity>
    </View>
  );

  const renderQRCode = () => (
    <View style={styles.qrSection}>
      <Text style={styles.sectionTitle}>QR Code</Text>
      <View style={styles.qrContainer}>
        <QRCode
          value={qrCodeData}
          size={200}
          color={flatColors.neutral[800]}
          backgroundColor={flatColors.backgrounds.primary}
        />
        <Text style={styles.qrText}>Scan for order verification</Text>
      </View>
    </View>
  );

  const renderPicklist = () => {
    const items = order.items || [];
    
    return (
      <View style={styles.picklistSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={20} color={flatColors.accent.blue} />
          <Text style={styles.sectionTitle}>Picklist</Text>
        </View>
        
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No items in this order</Text>
        ) : (
          items.map((item: OrderItem, index: number) => (
            <View key={item.id || index} style={styles.picklistItem}>
              <View style={styles.picklistItemLeft}>
                <View style={styles.itemIcon}>
                  <Ionicons name="cube" size={16} color={flatColors.neutral[600]} />
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>
                    {item.name || 'Unknown Item'}
                  </Text>
                  
                  {/* Display Variants */}
                  {item.variant_groups && item.variant_groups.length > 0 && (
                    <View style={styles.variantsContainer}>
                      {item.variant_groups.map((group: VariantGroup) => (
                        <View key={group.id} style={styles.variantGroup}>
                          <Text style={styles.variantGroupName}>{group.name}:</Text>
                          {group.options.map((option, optionIndex) => (
                            <Text key={optionIndex} style={styles.variantOption}>
                              {option.name}
                              {option.price_adjustment !== 0 && (
                                <Text style={styles.priceAdjustment}>
                                  {option.price_adjustment > 0 ? ' +' : ' '}{option.price_adjustment.toFixed(2)}
                                </Text>
                              )}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Display Addons */}
                  {item.addon_groups && item.addon_groups.length > 0 && (
                    <View style={styles.addonsContainer}>
                      {item.addon_groups.map((group: AddonGroup) => (
                        <View key={group.id} style={styles.addonGroup}>
                          <Text style={styles.addonGroupName}>{group.name}:</Text>
                          {group.addons.map((addon, addonIndex) => (
                            <Text key={addonIndex} style={styles.addonItem}>
                              {addon.name}
                              <Text style={styles.addonPrice}> +{addon.price.toFixed(2)}</Text>
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.itemQuantity}>
                <Text style={styles.quantityText}>×{item.quantity || 1}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderBatchDetails = () => {
    if (!isBatchOrder) return null;

    const batch = order.current_batch;

    return (
      <View style={styles.batchSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="albums" size={20} color={flatColors.accent.purple} />
          <Text style={styles.sectionTitle}>Batch Details</Text>
        </View>
        
        <View style={styles.batchCard}>
          <View style={styles.batchRow}>
            <Text style={styles.batchLabel}>Batch ID:</Text>
            <Text style={styles.batchValue}>#{batch?.id || 'N/A'}</Text>
          </View>
          
          <View style={styles.batchRow}>
            <Text style={styles.batchLabel}>Batch Name:</Text>
            <Text style={styles.batchValue}>{batch?.name || 'Unnamed Batch'}</Text>
          </View>
          
          <View style={styles.batchRow}>
            <Text style={styles.batchLabel}>Total Orders:</Text>
            <Text style={styles.batchValue}>{batch?.total_orders || 1}</Text>
          </View>
          
          <View style={styles.batchRow}>
            <Text style={styles.batchLabel}>Status:</Text>
            <View style={[styles.batchStatusBadge, { backgroundColor: flatColors.cards.blue.background }]}>
              <Text style={styles.batchStatusText}>
                {batch?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
          
          {batch?.pickup_location && (
            <View style={styles.batchAddressSection}>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={16} color={flatColors.accent.green} />
                <Text style={styles.addressLabel}>Pickup:</Text>
              </View>
              <Text style={styles.addressText}>{batch.pickup_location.address}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderOrderInfo = () => (
    <View style={styles.orderInfoSection}>
      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <Ionicons name="person" size={16} color={flatColors.neutral[600]} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Customer</Text>
          <Text style={styles.infoValue}>
            {order.customer_details?.name || order.customer?.name || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <Ionicons name="location" size={16} color={flatColors.accent.blue} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Delivery Address</Text>
          <Text style={styles.infoValue}>
            {order.delivery_address || 'Address not available'}
          </Text>
        </View>
      </View>

      {order.pickup_address && (
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="location-sharp" size={16} color={flatColors.accent.green} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Pickup Address</Text>
            <Text style={styles.infoValue}>{order.pickup_address}</Text>
          </View>
        </View>
      )}

      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <Ionicons name="cash" size={16} color={flatColors.accent.green} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Total Amount</Text>
          <Text style={styles.infoValue}>${(order.total || 0).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: flatColors.backgrounds.primary }}>
        {renderHeader()}
        
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            minHeight: '100%',
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {renderQRCode()}
          {renderOrderInfo()}
          {renderPicklist()}
          {renderBatchDetails()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: flatColors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
    ...premiumShadows.soft,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
  },
  headerSubtitle: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[600],
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  qrSection: {
    backgroundColor: flatColors.backgrounds.primary,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...premiumShadows.soft,
  },
  sectionTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[600],
    marginTop: 12,
  },
  picklistSection: {
    backgroundColor: flatColors.backgrounds.primary,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    ...premiumShadows.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  picklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  picklistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: flatColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[800],
  },
  itemDescription: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[600],
    marginTop: 2,
  },
  itemQuantity: {
    backgroundColor: flatColors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[800],
  },
  emptyText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[500],
    textAlign: 'center',
    paddingVertical: 20,
  },
  batchSection: {
    backgroundColor: flatColors.backgrounds.primary,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    ...premiumShadows.soft,
  },
  batchCard: {
    backgroundColor: flatColors.cards.purple.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: flatColors.accent.purple + '20',
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  batchLabel: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[600],
  },
  batchValue: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[800],
  },
  batchStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  batchStatusText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.blue,
  },
  batchAddressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressLabel: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[700],
  },
  addressText: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: premiumTypography.caption.large.fontWeight,
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
    marginLeft: 22,
  },
  orderInfoSection: {
    backgroundColor: flatColors.backgrounds.primary,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    ...premiumShadows.soft,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: flatColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: premiumTypography.caption.large.fontWeight,
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[800],
  },
  variantsContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  variantGroup: {
    marginBottom: 4,
  },
  variantGroupName: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.blue,
    marginBottom: 2,
  },
  variantOption: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: premiumTypography.caption.small.fontWeight,
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.neutral[600],
    marginLeft: 12,
  },
  priceAdjustment: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    color: flatColors.accent.green,
  },
  addonsContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  addonGroup: {
    marginBottom: 4,
  },
  addonGroupName: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.accent.orange,
    marginBottom: 2,
  },
  addonItem: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: premiumTypography.caption.small.fontWeight,
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.neutral[600],
    marginLeft: 12,
  },
  addonPrice: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    color: flatColors.accent.green,
  },
});