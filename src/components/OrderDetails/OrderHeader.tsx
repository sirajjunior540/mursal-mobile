import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { OrderHeaderProps, StatusBadgeProps, BatchTypeBadgeProps } from '../../types/orderDetails.types';
import { Design } from '../../constants/designSystem';
import { headerStyles, getStatusColors } from '../../design/orderDetails/headerStyles';
import { orderDetailsColors } from '../../design/orderDetails/colors';
import { getIoniconsName } from '../../utils/iconMapping';

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors = getStatusColors(status);

  return (
    <View style={[headerStyles.modernStatusBadge]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={headerStyles.statusBadgeGradient}
      >
        <Ionicons name={getIoniconsName(colors.icon)} size={16} color="#FFFFFF" />
        <Text style={headerStyles.modernStatusText}>
          {status?.toUpperCase()}
        </Text>
      </LinearGradient>
    </View>
  );
};

const BatchTypeBadge: React.FC<BatchTypeBadgeProps> = ({ type }) => {
  const isDistribution = type === 'distribution';
  const colors = isDistribution ? orderDetailsColors.gradients.distribution : orderDetailsColors.gradients.consolidated;
  
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={headerStyles.batchTypeBadge}
    >
      <Ionicons 
        name={isDistribution ? 'car-sport-outline' : 'cube'} 
        size={14} 
        color="#FFFFFF" 
      />
      <Text style={headerStyles.batchTypeText}>
        {isDistribution ? 'DISTRIBUTION' : 'CONSOLIDATED'}
      </Text>
    </LinearGradient>
  );
};

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onClose,
  title = 'Order Details',
  isBatchView = false,
  batchType = null,
  orderCount = 1,
}) => {
  if (!order) return null;
  
  const getGradientColors = () => {
    if (batchType === 'distribution') return orderDetailsColors.gradients.distribution;
    if (batchType === 'consolidated') return orderDetailsColors.gradients.consolidated;
    return [Design.colors.primary, Design.colors.primaryDark];
  };
  
  return (
    <View style={headerStyles.modernHeader}>
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={headerStyles.modernGradient}
      >
        {/* Animated Pattern */}
        <View style={headerStyles.modernPattern}>
          <View style={[headerStyles.modernShape1]} />
          <View style={[headerStyles.modernShape2]} />
          <View style={[headerStyles.modernShape3]} />
        </View>
        
        {/* Close Button */}
        <TouchableOpacity 
          onPress={onClose} 
          style={headerStyles.modernCloseButton}
          activeOpacity={0.7}
        >
          <View style={headerStyles.closeButtonInner}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        
        {/* Header Content */}
        <View style={headerStyles.modernContent}>
          {/* Order Icon with Glow Effect */}
          <View style={headerStyles.modernIconWrapper}>
            <View style={headerStyles.modernIconGlow} />
            <View style={headerStyles.modernIconContainer}>
              <Ionicons 
                name={isBatchView ? 'cube' : 'cube-outline'} 
                size={32} 
                color="#FFFFFF" 
              />
            </View>
          </View>
          
          {/* Title and Order Info */}
          <View style={headerStyles.modernTitleContainer}>
            <Text style={headerStyles.modernTitle}>{title}</Text>
            {isBatchView && (
              <View style={headerStyles.modernSubtitleRow}>
                <View style={headerStyles.modernInfoBadge}>
                  <Ionicons name="layers-outline" size={14} color="#FFFFFF" />
                  <Text style={headerStyles.modernInfoText}>{orderCount} Orders</Text>
                </View>
                <View style={headerStyles.modernInfoBadge}>
                  <Ionicons name="cash-outline" size={14} color="#FFFFFF" />
                  <Text style={headerStyles.modernInfoText}>
                    {order.currency || 'SAR'} {order.total_amount?.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
            {!isBatchView && order.order_number && (
              <View style={headerStyles.modernOrderNumber}>
                <Text style={headerStyles.modernOrderNumberText}>
                  Order #{order.order_number}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Status Section */}
        <View style={headerStyles.modernStatusSection}>
          <StatusBadge status={order.status} />
          {batchType && <BatchTypeBadge type={batchType} />}
        </View>
      </LinearGradient>
      
      {/* Bottom Wave Shape */}
      <View style={headerStyles.waveContainer}>
        <View style={headerStyles.wave} />
      </View>
    </View>
  );
};