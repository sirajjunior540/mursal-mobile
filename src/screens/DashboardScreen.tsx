import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOrders } from '../contexts/OrderContext';
import { useDriver } from '../contexts/DriverContext';
import { Order, OrderStatus } from '../types';
import { COLORS, FONTS } from '../constants';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_METHOD_ICONS } from '../constants';

type RootStackParamList = {
  OrderDetails: { orderId: string };
  Dashboard: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { orders: activeOrders, refreshOrders, acceptOrder, isLoading } = useOrders();
  const { driver, updateOnlineStatus } = useDriver();

  useEffect(() => {
    refreshOrders();
  }, []);

  const handleToggleOnline = async () => {
    if (driver) {
      await updateOnlineStatus(!driver.isOnline);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    Alert.alert(
      'Accept Order',
      'Are you sure you want to accept this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            const result = await acceptOrder(orderId);
            if (result) {
              Alert.alert('Success', 'Order accepted successfully');
              navigation.navigate('OrderDetails', { orderId });
            } else {
              Alert.alert('Error', 'Failed to accept order');
            }
          }
        }
      ]
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusColor = ORDER_STATUS_COLORS[item.status] || COLORS.text.secondary;
    const paymentIcon = PAYMENT_METHOD_ICONS[item.paymentMethod] || 'cash';

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {ORDER_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText}>{item.customer.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.deliveryAddress.street}, {item.deliveryAddress.city}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText}>{item.estimatedDeliveryTime}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name={paymentIcon as any} size={16} color={COLORS.text.secondary} />
            <Text style={styles.infoText}>${item.total.toFixed(2)}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={COLORS.text.disabled} />
      <Text style={styles.emptyStateTitle}>No Active Orders</Text>
      <Text style={styles.emptyStateText}>
        {driver?.isOnline 
          ? 'New orders will appear here when available'
          : 'Go online to start receiving orders'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Active Orders</Text>
          <Text style={styles.headerSubtitle}>
            {activeOrders.length} {activeOrders.length === 1 ? 'order' : 'orders'} available
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.onlineButton, 
            driver?.isOnline ? styles.onlineButtonActive : styles.onlineButtonInactive
          ]}
          onPress={handleToggleOnline}
        >
          <Ionicons 
            name={driver?.isOnline ? 'checkmark-circle' : 'close-circle'} 
            size={20} 
            color={COLORS.surface.white} 
          />
          <Text style={styles.onlineButtonText}>
            {driver?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && activeOrders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshOrders}
              colors={[COLORS.primary.default]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  onlineButtonActive: {
    backgroundColor: COLORS.success.default,
  },
  onlineButtonInactive: {
    backgroundColor: COLORS.text.secondary,
  },
  onlineButtonText: {
    color: COLORS.surface.white,
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: COLORS.surface.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.surface.white,
    textTransform: 'uppercase',
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: COLORS.primary.default,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  acceptButtonText: {
    color: COLORS.surface.white,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default DashboardScreen;