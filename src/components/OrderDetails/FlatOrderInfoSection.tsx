import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface FlatOrderInfoSectionProps {
  order: Order;
  readonly?: boolean;
  onCall?: (phone: string) => void;
  onNavigate?: (order: Order) => void;
}

export const FlatOrderInfoSection: React.FC<FlatOrderInfoSectionProps> = ({
  order,
  readonly = false,
  onCall,
  onNavigate,
}) => {
  const customerPhone = order.customer?.phone || 
                      order.customer_details?.phone || 
                      order.customer_details?.phone_number;

  const handleCall = () => {
    if (customerPhone && onCall) {
      onCall(customerPhone);
    } else if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    }
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(order);
    }
  };

  return (
    <View style={styles.container}>
      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={20} color={flatColors.accent.blue} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer Name</Text>
              <Text style={styles.infoValue}>
                {order.customer?.name || order.customer_details?.name || 'Not provided'}
              </Text>
            </View>
          </View>

          {customerPhone && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="call" size={20} color={flatColors.accent.green} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <TouchableOpacity onPress={handleCall} disabled={readonly}>
                  <Text style={[styles.infoValue, !readonly && styles.clickableText]}>
                    {customerPhone}
                  </Text>
                </TouchableOpacity>
              </View>
              {!readonly && (
                <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                  <Ionicons name="call" size={16} color={flatColors.accent.green} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Delivery Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color={flatColors.accent.orange} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoValue}>
                {order.delivery_address || 'Address not provided'}
              </Text>
            </View>
            {!readonly && order.delivery_address && (
              <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
                <Ionicons name="navigate" size={16} color={flatColors.accent.blue} />
              </TouchableOpacity>
            )}
          </View>

          {order.pickup_address && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="storefront" size={20} color={flatColors.accent.purple} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Pickup Address</Text>
                <Text style={styles.infoValue}>{order.pickup_address}</Text>
              </View>
            </View>
          )}

          {order.delivery_notes && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={20} color={flatColors.neutral[500]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Notes</Text>
                <Text style={styles.infoValue}>{order.delivery_notes}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="receipt" size={20} color={flatColors.accent.blue} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Order Total</Text>
              <Text style={styles.infoValue}>
                {order.currency || 'SAR'} {order.total_amount?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>

          {order.delivery_fee !== undefined && order.delivery_fee !== null && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="car" size={20} color={flatColors.neutral[500]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Fee</Text>
                <Text style={styles.infoValue}>
                  {order.currency || 'SAR'} {order.delivery_fee.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {order.items && order.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.itemsTitle}>Package Items</Text>
              <View style={styles.itemsList}>
                {order.items.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                  </View>
                ))}
                {order.items.length > 3 && (
                  <Text style={styles.moreItemsText}>
                    +{order.items.length - 3} more items
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.secondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: '500',
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
  },
  clickableText: {
    color: flatColors.accent.blue,
    textDecorationLine: 'underline',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemsTitle: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    marginBottom: 8,
  },
  itemsList: {
    backgroundColor: flatColors.backgrounds.secondary,
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[700],
    flex: 1,
  },
  itemQuantity: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.footnote.lineHeight,
    color: flatColors.neutral[500],
  },
  moreItemsText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});