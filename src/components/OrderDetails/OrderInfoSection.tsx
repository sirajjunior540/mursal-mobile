import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { OrderInfoSectionProps, InfoRowProps } from '../../types/orderDetails.types';
import { commonCardStyles } from '../../design/common/cards';
import { Design } from '../../constants/designSystem';
import { orderDetailsStyles } from '../../design/orderDetails/infoSectionStyles';
import { getIoniconsName } from '../../utils/iconMapping';

const InfoRow: React.FC<InfoRowProps> = ({ 
  icon, 
  iconColor = Design.colors.textSecondary, 
  label, 
  value, 
  onPress, 
  highlight = false 
}) => {
  const content = (
    <View style={[orderDetailsStyles.infoRow, highlight && orderDetailsStyles.highlightRow]}>
      <View style={[orderDetailsStyles.infoIconContainer, highlight && orderDetailsStyles.highlightIconContainer]}>
        <Ionicons name={getIoniconsName(icon)} size={20} color={iconColor} />
      </View>
      <View style={orderDetailsStyles.infoContent}>
        <Text style={orderDetailsStyles.infoLabel}>{label}</Text>
        <Text style={[orderDetailsStyles.infoValue, highlight && orderDetailsStyles.highlightValue]}>
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons 
          name={highlight ? "call-outline" : "chevron-forward"} 
          size={20} 
          color={highlight ? Design.colors.success : Design.colors.textSecondary} 
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const OrderInfoSection: React.FC<OrderInfoSectionProps> = ({ 
  order, 
  readonly = false, 
  onCall, 
  onNavigate 
}) => {
  if (!order) return null;

  const handleCall = (phoneNumber: string) => {
    if (onCall) {
      onCall(phoneNumber);
    } else {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View>
      {/* Customer Information Card */}
      <View style={[commonCardStyles.card, orderDetailsStyles.sectionCard]}>
        <LinearGradient
          colors={['#F3F4F6', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orderDetailsStyles.cardGradient}
        />
        
        <View style={orderDetailsStyles.sectionHeader}>
          <View style={orderDetailsStyles.sectionIconContainer}>
            <Ionicons name="person" size={20} color={Design.colors.primary} />
          </View>
          <Text style={orderDetailsStyles.sectionTitle}>Customer Information</Text>
        </View>

        <InfoRow
          icon="account-outline"
          label="Customer"
          value={order.customer_name || 'N/A'}
        />
        
        {!readonly && order.customer_phone && (
          <InfoRow
            icon="phone"
            iconColor={Design.colors.success}
            label="Phone"
            value={order.customer_phone}
            onPress={() => handleCall(order.customer_phone!)}
            highlight
          />
        )}
      </View>

      {/* Delivery Information Card */}
      <View style={[commonCardStyles.card, orderDetailsStyles.sectionCard]}>
        <LinearGradient
          colors={['#EFF6FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orderDetailsStyles.cardGradient}
        />
        
        <View style={orderDetailsStyles.sectionHeader}>
          <View style={[orderDetailsStyles.sectionIconContainer, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="car-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={orderDetailsStyles.sectionTitle}>Delivery Details</Text>
        </View>

        {order.pickup_address && (
          <InfoRow
            icon="package-variant"
            iconColor="#3B82F6"
            label="Pickup"
            value={order.pickup_address}
            onPress={onNavigate ? () => onNavigate(order) : undefined}
          />
        )}
        
        <InfoRow
          icon="map-marker"
          iconColor="#10B981"
          label="Delivery"
          value={order.delivery_address || 'N/A'}
          onPress={onNavigate ? () => onNavigate(order) : undefined}
        />
        
        <InfoRow
          icon="clock-outline"
          label="Scheduled"
          value={formatDateTime(order.scheduled_delivery_time)}
        />
      </View>

      {/* Package Information Card */}
      <View style={[commonCardStyles.card, orderDetailsStyles.sectionCard]}>
        <LinearGradient
          colors={['#F0FDF4', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orderDetailsStyles.cardGradient}
        />
        
        <View style={orderDetailsStyles.sectionHeader}>
          <View style={[orderDetailsStyles.sectionIconContainer, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="cube-outline" size={20} color="#10B981" />
          </View>
          <Text style={orderDetailsStyles.sectionTitle}>Package Details</Text>
        </View>

        <InfoRow
          icon="package-variant-closed"
          label="Type"
          value={order.delivery_type || 'Standard Package'}
        />
        
        {order.items && order.items.length > 0 && (
          <InfoRow
            icon="format-list-bulleted"
            label="Items"
            value={`${order.items.length} item${order.items.length > 1 ? 's' : ''}`}
          />
        )}
        
        {order.notes && (
          <View style={orderDetailsStyles.notesContainer}>
            <Ionicons name="document-text-outline" size={16} color={Design.colors.textSecondary} />
            <Text style={orderDetailsStyles.notesText}>{order.notes}</Text>
          </View>
        )}
      </View>

      {/* Payment Information Card */}
      <View style={[commonCardStyles.card, orderDetailsStyles.sectionCard]}>
        <LinearGradient
          colors={['#FEF3C7', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orderDetailsStyles.cardGradient}
        />
        
        <View style={orderDetailsStyles.sectionHeader}>
          <View style={[orderDetailsStyles.sectionIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cash-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={orderDetailsStyles.sectionTitle}>Payment</Text>
        </View>

        <InfoRow
          icon="cash-multiple"
          iconColor="#F59E0B"
          label="Total Amount"
          value={`${order.currency || 'SAR'} ${order.total_amount?.toFixed(2) || '0.00'}`}
        />
        
        {order.payment_method && (
          <InfoRow
            icon="credit-card"
            label="Payment Method"
            value={order.payment_method}
          />
        )}
      </View>
    </View>
  );
};