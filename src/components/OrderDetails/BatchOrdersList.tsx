import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { BatchOrdersListProps } from '../../types/orderDetails.types';
import { Design } from '../../constants/designSystem';
import { batchOrdersStyles } from '../../design/orderDetails/batchOrdersStyles';
import { orderDetailsColors } from '../../design/orderDetails/colors';
import { getIoniconsName } from '../../utils/iconMapping';

export const BatchOrdersList: React.FC<BatchOrdersListProps> = ({
  orders,
  totalValue,
  onSelectOrder,
  batchType,
}) => {
  const isDistribution = batchType === 'distribution';
  const gradientColors = isDistribution 
    ? orderDetailsColors.gradients.distribution 
    : orderDetailsColors.gradients.consolidated;

  return (
    <ScrollView style={batchOrdersStyles.container} showsVerticalScrollIndicator={false}>
      {/* Batch Summary Card */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={batchOrdersStyles.summaryCard}
      >
        <View style={batchOrdersStyles.summaryPattern}>
          <View style={[batchOrdersStyles.patternCircle, { left: -20, top: -20 }]} />
          <View style={[batchOrdersStyles.patternCircle, { right: -30, bottom: -30, width: 60, height: 60 }]} />
        </View>
        
        <View style={batchOrdersStyles.summaryContent}>
          <View style={batchOrdersStyles.summaryHeader}>
            <Ionicons 
              name={isDistribution ? 'car-sport-outline' : 'cube'} 
              size={32} 
              color="#FFFFFF" 
            />
            <Text style={batchOrdersStyles.summaryTitle}>
              {isDistribution ? 'Distribution Batch' : 'Consolidated Batch'}
            </Text>
          </View>
          
          <View style={batchOrdersStyles.summaryStats}>
            <View style={batchOrdersStyles.statItem}>
              <Text style={batchOrdersStyles.statValue}>{orders.length}</Text>
              <Text style={batchOrdersStyles.statLabel}>Orders</Text>
            </View>
            <View style={batchOrdersStyles.statDivider} />
            <View style={batchOrdersStyles.statItem}>
              <Text style={batchOrdersStyles.statValue}>
                {orders[0]?.currency || 'SAR'} {totalValue.toFixed(2)}
              </Text>
              <Text style={batchOrdersStyles.statLabel}>Total Value</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Pickup Location Card */}
      <View style={batchOrdersStyles.pickupCard}>
        <View style={batchOrdersStyles.pickupHeader}>
          <View style={batchOrdersStyles.pickupIconContainer}>
            <Ionicons name="business-outline" size={20} color={Design.colors.primary} />
          </View>
          <Text style={batchOrdersStyles.pickupTitle}>Pickup Location</Text>
        </View>
        <Text style={batchOrdersStyles.pickupAddress}>
          {orders[0]?.pickup_address || 'No pickup address'}
        </Text>
      </View>

      {/* Orders List */}
      <View style={batchOrdersStyles.ordersSection}>
        <Text style={batchOrdersStyles.sectionTitle}>Orders in this Batch</Text>
        
        {orders.map((order, index) => (
          <TouchableOpacity
            key={order.id}
            style={batchOrdersStyles.orderCard}
            onPress={() => onSelectOrder(order)}
            activeOpacity={0.7}
          >
            <View style={batchOrdersStyles.orderNumber}>
              <Text style={batchOrdersStyles.orderNumberText}>{index + 1}</Text>
            </View>
            
            <View style={batchOrdersStyles.orderContent}>
              <View style={batchOrdersStyles.orderHeader}>
                <Text style={batchOrdersStyles.orderCustomer}>
                  {order.customer_name || 'Customer'}
                </Text>
                <Text style={batchOrdersStyles.orderAmount}>
                  {order.currency || 'SAR'} {order.total_amount?.toFixed(2) || '0.00'}
                </Text>
              </View>
              
              <View style={batchOrdersStyles.orderAddress}>
                <Ionicons 
                  name="location-outline" 
                  size={14} 
                  color={Design.colors.textSecondary} 
                />
                <Text style={batchOrdersStyles.orderAddressText} numberOfLines={2}>
                  {order.delivery_address || 'No delivery address'}
                </Text>
              </View>
              
              {order.order_number && (
                <Text style={batchOrdersStyles.orderIdText}>
                  Order #{order.order_number}
                </Text>
              )}
            </View>
            
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={Design.colors.textSecondary} 
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Batch Instructions */}
      <View style={batchOrdersStyles.instructionsCard}>
        <Ionicons 
          name="information-circle-outline" 
          size={20} 
          color={Design.colors.primary} 
        />
        <Text style={batchOrdersStyles.instructionsText}>
          {isDistribution 
            ? 'This batch contains multiple orders with different delivery locations. After accepting, you\'ll deliver each order separately.'
            : 'This batch contains multiple orders going to the same delivery location. All orders will be delivered together.'}
        </Text>
      </View>
    </ScrollView>
  );
};