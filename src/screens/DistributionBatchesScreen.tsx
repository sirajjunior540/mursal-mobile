import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Design, Colors } from '../constants';
import { DistributionBatchCard } from '../components/DistributionBatchCard';
import { EmptyState } from '../components/EmptyState';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { distributionService } from '../services/distributionService';
import { DistributionBatch } from '../types/distribution.types';
import { navigationService } from '../services/navigationService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { locationService } from '../services/locationService';

export const DistributionBatchesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [distributions, setDistributions] = useState<DistributionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');

  const loadDistributions = useCallback(async () => {
    try {
      const data = activeTab === 'available' 
        ? await distributionService.getAvailableDistributions()
        : await distributionService.getActiveDistributions();
      
      setDistributions(data);
    } catch (error) {
      console.error('Error loading distributions:', error);
      Alert.alert(
        t('error'),
        t('failedToLoadDistributions')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, t]);

  useEffect(() => {
    loadDistributions();
  }, [loadDistributions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDistributions();
  };

  const handleAcceptDistribution = async (distribution: DistributionBatch) => {
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      
      await distributionService.acceptDistribution({
        distribution_id: distribution.id,
        driver_location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : undefined,
      });

      Alert.alert(
        t('success'),
        t('distributionAccepted'),
        [
          {
            text: t('ok'),
            onPress: () => {
              // Switch to active tab
              setActiveTab('active');
              loadDistributions();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting distribution:', error);
      Alert.alert(
        t('error'),
        error.message || t('failedToAcceptDistribution')
      );
    }
  };

  const handleDeclineDistribution = async (distribution: DistributionBatch) => {
    Alert.alert(
      t('confirmDecline'),
      t('areYouSureDeclineDistribution'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('decline'),
          style: 'destructive',
          onPress: async () => {
            try {
              await distributionService.declineDistribution(distribution.id);
              loadDistributions();
            } catch (error) {
              console.error('Error declining distribution:', error);
              Alert.alert(
                t('error'),
                t('failedToDeclineDistribution')
              );
            }
          },
        },
      ]
    );
  };

  const handleDistributionPress = (distribution: DistributionBatch) => {
    navigationService.navigate('DistributionDetails', { 
      distributionId: distribution.id 
    });
  };

  const renderTab = (tab: 'available' | 'active', label: string) => {
    const isActive = activeTab === tab;
    
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => {
          setActiveTab(tab);
          setLoading(true);
        }}
      >
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
        {isActive && <View style={styles.tabIndicator} />}
      </TouchableOpacity>
    );
  };

  const renderDistribution = ({ item }: { item: DistributionBatch }) => {
    return (
      <DistributionBatchCard
        distribution={item}
        onPress={() => handleDistributionPress(item)}
        onAccept={() => handleAcceptDistribution(item)}
        onDecline={() => handleDeclineDistribution(item)}
        showActions={activeTab === 'available'}
      />
    );
  };

  const getEmptyStateProps = () => {
    if (activeTab === 'available') {
      return {
        icon: 'package-variant',
        title: t('noAvailableDistributions'),
        message: t('checkBackLaterForDistributions'),
      };
    } else {
      return {
        icon: 'truck-check',
        title: t('noActiveDistributions'),
        message: t('acceptDistributionToSeeHere'),
      };
    }
  };

  const getDriverTypeDisplay = () => {
    const driverProfile = user?.driver_profile;
    if (!driverProfile) return null;

    const driverType = driverProfile.driver_type;
    let icon = 'truck';
    let text = t('localDriver');
    let color = Colors.primary;

    if (driverType === 'network') {
      icon = 'truck-delivery';
      text = t('networkDriver');
      color = Colors.secondary;
    } else if (driverType === 'both') {
      icon = 'truck-fast';
      text = t('localAndNetworkDriver');
      color = Colors.info;
    }

    return (
      <View style={[styles.driverTypeBadge, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={16} color={color} />
        <Text style={[styles.driverTypeText, { color }]}>{text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('distributionBatches')}</Text>
        {getDriverTypeDisplay()}
      </View>

      <View style={styles.tabs}>
        {renderTab('available', t('available'))}
        {renderTab('active', t('active'))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('loading')}...</Text>
        </View>
      ) : (
        <FlatList
          data={distributions}
          renderItem={renderDistribution}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState {...getEmptyStateProps()} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Design.spacing.medium,
    paddingVertical: Design.spacing.small,
  },
  title: {
    fontSize: Design.fontSize.xlarge,
    fontWeight: Design.fontWeight.bold,
    color: Colors.text,
  },
  driverTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing.small,
    paddingVertical: 4,
    borderRadius: Design.borderRadius.small,
    gap: 4,
  },
  driverTypeText: {
    fontSize: Design.fontSize.xsmall,
    fontWeight: Design.fontWeight.medium,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Design.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Design.spacing.medium,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Active tab styles handled by indicator
  },
  tabText: {
    fontSize: Design.fontSize.medium,
    color: Colors.textSecondary,
    fontWeight: Design.fontWeight.medium,
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Design.spacing.small,
    fontSize: Design.fontSize.small,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingVertical: Design.spacing.small,
  },
});