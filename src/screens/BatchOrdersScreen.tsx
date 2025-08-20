/**
 * Batch Orders Screen for Driver Mobile App
 * Displays available and assigned batch orders
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BatchOrder, BatchStatus } from '../shared/types/batch.types';
import { batchOrderService } from '../services/batchOrderService';
import { soundService } from '../services/soundService';
import { colors, theme } from '../constants/theme';
import StatusBadge from '../components/ui/StatusBadge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface BatchOrdersScreenProps {
  navigation: any;
  route: any;
}

const BatchOrdersScreen: React.FC<BatchOrdersScreenProps> = ({ navigation, route }) => {
  const [availableBatches, setAvailableBatches] = useState<BatchOrder[]>([]);
  const [assignedBatches, setAssignedBatches] = useState<BatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'assigned'>('available');

  // Load batch orders on screen focus
  useFocusEffect(
    useCallback(() => {
      loadBatchOrders();
    }, [])
  );

  const loadBatchOrders = async () => {
    try {
      setLoading(true);
      
      const [available, assigned] = await Promise.all([
        batchOrderService.getAvailableBatches(),
        batchOrderService.getAssignedBatches(),
      ]);
      
      setAvailableBatches(available);
      setAssignedBatches(assigned);
    } catch (error) {
      console.error('Error loading batch orders:', error);
      Alert.alert('Error', 'Failed to load batch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBatchOrders();
    setRefreshing(false);
  };

  const handleAcceptBatch = async (batch: BatchOrder) => {
    Alert.alert(
      'Accept Batch Order?',
      `Accept batch "${batch.name}" with ${batch.total_orders} orders?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            const result = await batchOrderService.acceptBatch(batch.id, {}, {
              showConfirmation: false,
              onSuccess: () => {
                loadBatchOrders(); // Refresh the lists
                setActiveTab('assigned'); // Switch to assigned tab
                navigation.navigate('BatchDetails', { batchId: batch.id });
              },
            });

            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to accept batch');
            }
          },
        },
      ]
    );
  };

  const handleBatchPress = (batch: BatchOrder) => {
    navigation.navigate('BatchDetails', { batchId: batch.id });
  };

  const getStatusColor = (status: BatchStatus): string => {
    const statusColors = {
      [BatchStatus.READY_FOR_PICKUP]: colors.warning,
      [BatchStatus.DRIVER_ASSIGNED]: colors.info,
      [BatchStatus.COLLECTED]: colors.primary,
      [BatchStatus.AT_WAREHOUSE]: colors.secondary,
      [BatchStatus.FINAL_DELIVERY]: colors.warning,
      [BatchStatus.COMPLETED]: colors.success,
      [BatchStatus.CANCELLED]: colors.error,
    };
    
    return statusColors[status] || colors.text.secondary;
  };

  const getStatusLabel = (status: BatchStatus): string => {
    const statusLabels = {
      [BatchStatus.READY_FOR_PICKUP]: 'Ready for Pickup',
      [BatchStatus.DRIVER_ASSIGNED]: 'Assigned to You',
      [BatchStatus.COLLECTED]: 'Collected',
      [BatchStatus.AT_WAREHOUSE]: 'At Warehouse',
      [BatchStatus.FINAL_DELIVERY]: 'Out for Delivery',
      [BatchStatus.COMPLETED]: 'Completed',
      [BatchStatus.CANCELLED]: 'Cancelled',
    };
    
    return statusLabels[status] || status;
  };

  const renderBatchItem = ({ item: batch }: { item: BatchOrder }) => (
    <Card style={styles.batchCard}>
      <TouchableOpacity
        onPress={() => handleBatchPress(batch)}
        style={styles.batchContent}
      >
        <View style={styles.batchHeader}>
          <Text style={styles.batchName}>{batch.name}</Text>
          <StatusBadge
            status={getStatusLabel(batch.status)}
            color={getStatusColor(batch.status)}
          />
        </View>
        
        <View style={styles.batchInfo}>
          <Text style={styles.batchDetail}>
            📦 {batch.total_orders} orders
          </Text>
          <Text style={styles.batchDetail}>
            💰 ${batch.total_value.toFixed(2)}
          </Text>
          <Text style={styles.batchDetail}>
            📍 {batch.pickup_location.address}
          </Text>
        </View>

        {batch.batch_type !== 'standard' && (
          <View style={styles.batchTypeContainer}>
            <Text style={styles.batchType}>{batch.batch_type.toUpperCase()}</Text>
          </View>
        )}

        {activeTab === 'available' && (
          <Button
            title="Accept Batch"
            onPress={() => handleAcceptBatch(batch)}
            style={styles.acceptButton}
            variant="primary"
          />
        )}

        {activeTab === 'assigned' && (
          <View style={styles.assignedActions}>
            <Button
              title="View Details"
              onPress={() => handleBatchPress(batch)}
              style={styles.detailsButton}
              variant="outline"
            />
            {batch.status === BatchStatus.DRIVER_ASSIGNED && (
              <Button
                title="Start Pickup"
                onPress={async () => {
                  await batchOrderService.updateBatchStatus(
                    batch.id,
                    BatchStatus.COLLECTED,
                    { notes: 'Starting batch pickup' },
                    { showConfirmation: true }
                  );
                  loadBatchOrders();
                }}
                style={styles.actionButton}
                variant="primary"
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'available' ? 'No Available Batches' : 'No Assigned Batches'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {activeTab === 'available' 
          ? 'New batch orders will appear here when available'
          : 'Accepted batch orders will appear here'
        }
      </Text>
    </View>
  );

  const currentBatches = activeTab === 'available' ? availableBatches : assignedBatches;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading batch orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Batch Orders</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
              Available ({availableBatches.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'assigned' && styles.activeTab]}
            onPress={() => setActiveTab('assigned')}
          >
            <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>
              Assigned ({assignedBatches.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={currentBatches}
        renderItem={renderBatchItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight as any,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: theme.typography.body.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: colors.text.secondary,
  },
  listContainer: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  batchCard: {
    marginBottom: theme.spacing.md,
  },
  batchContent: {
    padding: theme.spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  batchName: {
    fontSize: theme.typography.subheading.fontSize,
    fontWeight: theme.typography.subheading.fontWeight as any,
    color: colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  batchInfo: {
    marginBottom: theme.spacing.md,
  },
  batchDetail: {
    fontSize: theme.typography.caption.fontSize,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  batchTypeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  batchType: {
    fontSize: theme.typography.caption.fontSize,
    color: colors.text.inverse,
    fontWeight: 'bold',
  },
  acceptButton: {
    marginTop: theme.spacing.sm,
  },
  assignedActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  detailsButton: {
    flex: 1,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight as any,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BatchOrdersScreen;