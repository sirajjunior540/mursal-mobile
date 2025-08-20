import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HapticFeedback from 'react-native-haptic-feedback';

import { designSystem } from '../../constants/designSystem';
import { useTracking } from '../../contexts/TrackingContext';
import PackageCard from '../../components/tracking/PackageCard';
import QRScanner from '../../components/tracking/QRScanner';
import { CarrierShipment, ShipmentStatus } from '../../types/tracking';

interface TrackingDashboardProps {
  navigation: any;
}

const TrackingDashboard: React.FC<TrackingDashboardProps> = ({ navigation }) => {
  const {
    shipments,
    stats,
    loading,
    refreshing,
    isOnline,
    pendingUpdates,
    refreshShipments,
    updateShipmentStatus,
    processQRScan,
    searchShipments,
    syncOfflineUpdates,
  } = useTracking();

  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CarrierShipment[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      if (!loading && shipments.length === 0) {
        refreshShipments();
      }
    }, [])
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchShipments(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQRScanResult = async (result: any) => {
    setShowScanner(false);
    
    if (result.success) {
      HapticFeedback.trigger('notificationSuccess');
      
      if (result.shipment) {
        navigation.navigate('ShipmentDetails', {
          shipmentId: result.shipment.id,
        });
      } else {
        Alert.alert('QR Code Scanned', result.message);
      }
    } else {
      HapticFeedback.trigger('notificationError');
      Alert.alert('Scan Failed', result.message);
    }
  };

  const handleStatusUpdate = async (shipmentId: string, status: ShipmentStatus) => {
    try {
      await updateShipmentStatus(shipmentId, status);
      HapticFeedback.trigger('notificationSuccess');
    } catch (error) {
      HapticFeedback.trigger('notificationError');
    }
  };

  const handleSyncOffline = () => {
    if (pendingUpdates > 0) {
      Alert.alert(
        'Sync Offline Updates',
        `You have ${pendingUpdates} pending updates. Sync now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sync',
            onPress: () => {
              HapticFeedback.trigger('impactMedium');
              syncOfflineUpdates();
            },
          },
        ]
      );
    }
  };

  const getFilteredShipments = () => {
    const shipmentsToFilter = searchQuery.trim() ? searchResults : shipments;
    
    if (filterStatus === 'all') {
      return shipmentsToFilter;
    }
    
    return shipmentsToFilter.filter(shipment => shipment.current_status === filterStatus);
  };

  const filteredShipments = getFilteredShipments();

  const getStatusFilterOptions = (): Array<{ label: string; value: ShipmentStatus | 'all' }> => [
    { label: 'All', value: 'all' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Exception', value: 'exception' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Tracking</Text>
          
          <View style={styles.headerActions}>
            {!isOnline && (
              <View style={styles.offlineIndicator}>
                <Icon name="cloud-off" size={16} color={designSystem.colors.error} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
            
            {pendingUpdates > 0 && (
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleSyncOffline}
              >
                <Icon name="sync" size={20} color={designSystem.colors.warning} />
                <Text style={styles.syncText}>{pendingUpdates}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowScanner(true)}
            >
              <Icon name="qr-code-scanner" size={24} color={designSystem.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={designSystem.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracking numbers..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={designSystem.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="clear" size={20} color={designSystem.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {getStatusFilterOptions().map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterChip,
                filterStatus === option.value && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus(option.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === option.value && styles.filterChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_shipments}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.in_transit}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed_deliveries}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.completion_rate)}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      )}

      {/* Shipments List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshShipments}
            colors={[designSystem.colors.primary]}
            tintColor={designSystem.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && shipments.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading shipments...</Text>
          </View>
        ) : filteredShipments.length === 0 ? (
          <View style={styles.centerContent}>
            <Icon name="inbox" size={64} color={designSystem.colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() ? 'No matching shipments' : 'No shipments'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? 'Try adjusting your search or filters'
                : 'Shipments will appear here when assigned'}
            </Text>
          </View>
        ) : (
          <>
            {isSearching && (
              <View style={styles.searchingIndicator}>
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            
            {filteredShipments.map((shipment) => (
              <PackageCard
                key={shipment.id}
                shipment={shipment}
                onPress={() =>
                  navigation.navigate('ShipmentDetails', {
                    shipmentId: shipment.id,
                  })
                }
                onQRScan={() => setShowScanner(true)}
                onStatusUpdate={(status) => handleStatusUpdate(shipment.id, status)}
                showActions={true}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <QRScanner
        isVisible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanResult={handleQRScanResult}
        allowManualEntry={true}
        placeholder="Enter tracking number or QR data"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  header: {
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: designSystem.spacing.medium,
    paddingBottom: designSystem.spacing.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: designSystem.spacing.small,
    paddingBottom: designSystem.spacing.medium,
  },
  headerTitle: {
    fontSize: designSystem.typography.sizes.xlarge,
    fontWeight: '700',
    color: designSystem.colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.small,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.errorLight,
    paddingHorizontal: designSystem.spacing.small,
    paddingVertical: designSystem.spacing.xsmall,
    borderRadius: designSystem.borderRadius.small,
  },
  offlineText: {
    fontSize: designSystem.typography.sizes.xsmall,
    color: designSystem.colors.error,
    marginLeft: designSystem.spacing.xsmall,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.warningLight,
    paddingHorizontal: designSystem.spacing.small,
    paddingVertical: designSystem.spacing.xsmall,
    borderRadius: designSystem.borderRadius.small,
  },
  syncText: {
    fontSize: designSystem.typography.sizes.xsmall,
    color: designSystem.colors.warning,
    marginLeft: designSystem.spacing.xsmall,
    fontWeight: '600',
  },
  scanButton: {
    padding: designSystem.spacing.xsmall,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.background,
    borderRadius: designSystem.borderRadius.medium,
    paddingHorizontal: designSystem.spacing.medium,
    paddingVertical: designSystem.spacing.small,
    marginBottom: designSystem.spacing.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: designSystem.spacing.small,
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textPrimary,
  },
  filterContainer: {
    paddingVertical: designSystem.spacing.xsmall,
    gap: designSystem.spacing.small,
  },
  filterChip: {
    paddingHorizontal: designSystem.spacing.medium,
    paddingVertical: designSystem.spacing.xsmall,
    borderRadius: designSystem.borderRadius.large,
    backgroundColor: designSystem.colors.background,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
  },
  filterChipActive: {
    backgroundColor: designSystem.colors.primary,
    borderColor: designSystem.colors.primary,
  },
  filterChipText: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: designSystem.colors.surface,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: designSystem.colors.surface,
    paddingVertical: designSystem.spacing.medium,
    paddingHorizontal: designSystem.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: designSystem.typography.sizes.large,
    fontWeight: '700',
    color: designSystem.colors.primary,
  },
  statLabel: {
    fontSize: designSystem.typography.sizes.xsmall,
    color: designSystem.colors.textSecondary,
    marginTop: designSystem.spacing.xsmall,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designSystem.spacing.xlarge * 2,
    paddingHorizontal: designSystem.spacing.large,
  },
  loadingText: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
  },
  emptyTitle: {
    fontSize: designSystem.typography.sizes.large,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
    marginTop: designSystem.spacing.medium,
    marginBottom: designSystem.spacing.small,
  },
  emptySubtitle: {
    fontSize: designSystem.typography.sizes.medium,
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
    lineHeight: designSystem.typography.lineHeights.medium,
  },
  searchingIndicator: {
    paddingVertical: designSystem.spacing.small,
    alignItems: 'center',
  },
  searchingText: {
    fontSize: designSystem.typography.sizes.small,
    color: designSystem.colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default TrackingDashboard;