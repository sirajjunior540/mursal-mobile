import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import BatchLegCard from '../components/BatchLegCard';
import { apiService } from '../services/api';
import { BatchLeg, BatchLegListResponse } from '../types/batchLeg';
import { Design } from '../constants/designSystem';
import EmptyState from '../components/EmptyState';

type NavigationProp = StackNavigationProp<any>;

const BatchLegsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [legs, setLegs] = useState<BatchLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ vehicle_type: string | null; max_weight: number | null } | null>(null);

  const fetchBatchLegs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      console.log('[BatchLegsScreen] Fetching available batch legs...');
      const response = await apiService.getAvailableBatchLegs();
      console.log('[BatchLegsScreen] Batch legs response:', response);
      
      if (response.success && response.data) {
        console.log('[BatchLegsScreen] Response data structure:', JSON.stringify(response.data, null, 2));
        
        // Handle different response formats
        let legsData = [];
        if (Array.isArray(response.data)) {
          legsData = response.data;
        } else if (response.data.legs) {
          legsData = response.data.legs;
        } else if (response.data.results) {
          legsData = response.data.results;
        }
        
        console.log('[BatchLegsScreen] Received', legsData.length, 'batch legs');
        setLegs(legsData);
        setDriverInfo(response.data.driver_info || null);
      } else {
        console.error('[BatchLegsScreen] Failed to fetch batch legs:', response.error);
        // Don't show alert for empty results
        if (response.error && response.error !== 'No data available') {
          Alert.alert('Error', 'Failed to load available deliveries');
        }
      }
    } catch (error) {
      console.error('Error fetching batch legs:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBatchLegs();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchBatchLegs(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchBatchLegs]);

  const handleAcceptLeg = async (legId: string) => {
    try {
      const response = await apiService.acceptBatchLeg(legId);
      
      if (response.success) {
        Alert.alert(
          'Success!',
          response.data?.message || 'Batch leg accepted successfully',
          [
            {
              text: 'View Orders',
              onPress: () => {
                // Navigate to active orders screen
                navigation.navigate('ActiveOrders', { batchLegId: legId });
              }
            }
          ]
        );
        
        // Remove accepted leg from list
        setLegs(prev => prev.filter(leg => leg.id !== legId));
      } else {
        Alert.alert('Error', response.error || 'Failed to accept batch leg');
      }
    } catch (error) {
      console.error('Error accepting batch leg:', error);
      Alert.alert('Error', 'Failed to accept delivery');
    }
  };

  const handleDeclineLeg = async (legId: string) => {
    try {
      const response = await apiService.declineBatchLeg(legId);
      
      if (response.success) {
        // Remove declined leg from list
        setLegs(prev => prev.filter(leg => leg.id !== legId));
      } else {
        Alert.alert('Error', response.error || 'Failed to decline batch leg');
      }
    } catch (error) {
      console.error('Error declining batch leg:', error);
      Alert.alert('Error', 'Failed to decline delivery');
    }
  };

  const handleViewDetails = (leg: BatchLeg) => {
    navigation.navigate('BatchLegDetails', { leg });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatchLegs();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Design.colors.primary} />
          <Text style={styles.loadingText}>Loading available deliveries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Deliveries</Text>
        {driverInfo && (
          <Text style={styles.subtitle}>
            Vehicle: {driverInfo.vehicle_type || 'Not set'} | 
            Max: {driverInfo.max_weight ? `${driverInfo.max_weight}kg` : 'N/A'}
          </Text>
        )}
      </View>

      <FlatList
        data={legs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BatchLegCard
            leg={item}
            onAccept={handleAcceptLeg}
            onViewDetails={handleViewDetails}
            onDecline={handleDeclineLeg}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Design.colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No Available Deliveries"
            message="New batch deliveries will appear here when they match your vehicle type and capabilities."
            onRetry={onRefresh}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Design.colors.background,
    paddingHorizontal: Design.spacing.md,
    paddingVertical: Design.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  title: {
    ...Design.typography.h2,
    color: Design.colors.textPrimary,
  },
  subtitle: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing.xs,
  },
  listContent: {
    padding: Design.spacing.md,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing.md,
  },
});

export default BatchLegsScreen;