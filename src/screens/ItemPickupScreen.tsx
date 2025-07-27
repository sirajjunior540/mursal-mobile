import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../navigation/types';
import { dashboardAPI } from '../services/api';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';
import QRScannerModal from '../components/QRScanner/QRScannerModal';
import { haptics } from '../utils/haptics';

type ItemPickupScreenRouteProp = RouteProp<RootStackParamList, 'ItemPickup'>;
type ItemPickupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ItemPickup'>;

interface OrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  is_picked_up: boolean;
  pickup_confirmed_at: string | null;
  pickup_confirmed_by: string | null;
  has_qr_code: boolean;
}

interface OrderProgress {
  order_id: string;
  order_number: string;
  customer_name: string;
  items: OrderItem[];
  order_progress: {
    total_items: number;
    picked_items: number;
    is_complete: boolean;
  };
}

interface PickupProgress {
  batch_id: string;
  batch_number: string;
  orders: OrderProgress[];
  overall_progress: {
    total_items: number;
    picked_items: number;
    percentage: number;
    is_complete: boolean;
  };
}

const ItemPickupScreen: React.FC = () => {
  const route = useRoute<ItemPickupScreenRouteProp>();
  const navigation = useNavigation<ItemPickupScreenNavigationProp>();
  const { batchId, batchNumber } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<PickupProgress | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ orderId: string; itemId: string } | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [confirmingItem, setConfirmingItem] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await dashboardAPI.getPickupProgress(batchId);
      if (response.success && response.data) {
        setProgress(response.data);
      } else {
        throw new Error(response.error || 'Failed to load progress');
      }
    } catch (error) {
      console.error('Error fetching pickup progress:', error);
      Alert.alert('Error', 'Failed to load pickup progress');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleItemConfirm = async (orderId: string, itemId: string, qrCode?: string) => {
    setConfirmingItem(itemId);
    try {
      const response = await dashboardAPI.confirmItemPickup(batchId, {
        order_id: orderId,
        item_id: itemId,
        qr_code: qrCode,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to confirm item');
      }
      
      haptics.notificationSuccess();
      
      // Refresh progress
      await fetchProgress();
      
      // Check if batch is complete
      if (progress?.overall_progress.is_complete) {
        Alert.alert(
          'All Items Collected',
          'You have successfully collected all items in this batch.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      haptics.notificationError();
      Alert.alert('Error', error.response?.data?.error || 'Failed to confirm item pickup');
    } finally {
      setConfirmingItem(null);
    }
  };

  const handleQRScan = (qrCode: string) => {
    setScannerVisible(false);
    if (selectedItem) {
      handleItemConfirm(selectedItem.orderId, selectedItem.itemId, qrCode);
      setSelectedItem(null);
    }
  };

  const renderItem = (order: OrderProgress, item: OrderItem) => {
    const isConfirming = confirmingItem === item.item_id;
    
    return (
      <View key={item.item_id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.item_name}</Text>
            <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
          </View>
          {item.is_picked_up ? (
            <View style={styles.confirmedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={flatColors.success} />
              <Text style={styles.confirmedText}>Confirmed</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.confirmButton, isConfirming && styles.confirmingButton]}
              onPress={() => {
                if (item.has_qr_code) {
                  setSelectedItem({ orderId: order.order_id, itemId: item.item_id });
                  setScannerVisible(true);
                } else {
                  handleItemConfirm(order.order_id, item.item_id);
                }
              }}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name={item.has_qr_code ? "qr-code" : "checkmark"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.confirmButtonText}>
                    {item.has_qr_code ? 'Scan QR' : 'Confirm'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        {item.pickup_confirmed_at && (
          <Text style={styles.confirmedAt}>
            Confirmed at {new Date(item.pickup_confirmed_at).toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  };

  const renderOrder = (order: OrderProgress) => {
    const progressPercentage = (order.order_progress.picked_items / order.order_progress.total_items) * 100;
    
    return (
      <View key={order.order_id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
            <Text style={styles.customerName}>{order.customer_name}</Text>
          </View>
          <View style={styles.orderProgress}>
            <Text style={styles.progressText}>
              {order.order_progress.picked_items}/{order.order_progress.total_items}
            </Text>
            {order.order_progress.is_complete && (
              <Ionicons name="checkmark-circle" size={24} color={flatColors.success} />
            )}
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
        
        <View style={styles.itemsList}>
          {order.items.map(item => renderItem(order, item))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={flatColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={flatColors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Item Pickup</Text>
          <Text style={styles.headerSubtitle}>Batch #{batchNumber}</Text>
        </View>
        <View style={styles.headerProgress}>
          <Text style={styles.headerProgressText}>
            {progress?.overall_progress.percentage.toFixed(0)}%
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchProgress} />
        }
      >
        <View style={styles.overallProgress}>
          <Text style={styles.overallProgressTitle}>Overall Progress</Text>
          <View style={styles.overallProgressBar}>
            <View 
              style={[
                styles.overallProgressFill, 
                { width: `${progress?.overall_progress.percentage || 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.overallProgressText}>
            {progress?.overall_progress.picked_items} of {progress?.overall_progress.total_items} items collected
          </Text>
        </View>

        <View style={styles.ordersList}>
          {progress?.orders.map(order => renderOrder(order))}
        </View>
      </ScrollView>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => {
          setScannerVisible(false);
          setSelectedItem(null);
        }}
        onScan={handleQRScan}
        title="Scan Item QR Code"
        subtitle="Scan the QR code on the item to confirm pickup"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    ...premiumShadows.small,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    ...premiumTypography.h3,
    color: flatColors.text.primary,
  },
  headerSubtitle: {
    ...premiumTypography.caption,
    color: flatColors.text.secondary,
  },
  headerProgress: {
    backgroundColor: flatColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerProgressText: {
    ...premiumTypography.bodyBold,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  overallProgress: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    ...premiumShadows.small,
  },
  overallProgressTitle: {
    ...premiumTypography.h4,
    color: flatColors.text.primary,
    marginBottom: 12,
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: flatColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: flatColors.primary,
  },
  overallProgressText: {
    ...premiumTypography.caption,
    color: flatColors.text.secondary,
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    ...premiumShadows.small,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    ...premiumTypography.bodyBold,
    color: flatColors.text.primary,
  },
  customerName: {
    ...premiumTypography.caption,
    color: flatColors.text.secondary,
  },
  orderProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    ...premiumTypography.body,
    color: flatColors.text.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: flatColors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: flatColors.success,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: flatColors.background.secondary,
    borderRadius: 8,
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...premiumTypography.body,
    color: flatColors.text.primary,
  },
  itemQuantity: {
    ...premiumTypography.caption,
    color: flatColors.text.secondary,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: flatColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmingButton: {
    opacity: 0.8,
  },
  confirmButtonText: {
    ...premiumTypography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedText: {
    ...premiumTypography.caption,
    color: flatColors.success,
    fontWeight: '600',
  },
  confirmedAt: {
    ...premiumTypography.caption,
    color: flatColors.text.tertiary,
    marginTop: 4,
  },
});

export default ItemPickupScreen;