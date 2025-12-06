import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { UniversalMapView } from '../components/UniversalMapView';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';
import { Design } from '../constants/designSystem';
import { routeOptimizationService } from '../services/routeOptimizationService';
import { StopProgressCard } from '../components/StopProgressCard';
import type { OptimizedRoute, OptimizedStop } from '../services/routeOptimizationService';

interface BatchOrderScreenParams {
  batchId: string;
  orderId?: string;
}

type RootStackParamList = {
  BatchOrderScreen: BatchOrderScreenParams;
  PickupScreen: { orderId: string; stopId: string };
  DeliveryScreen: { orderId: string; stopId: string };
  Dashboard: undefined;
};

type BatchOrderScreenRouteProp = RouteProp<RootStackParamList, 'BatchOrderScreen'>;
type BatchOrderScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BatchOrderScreen'>;

const BatchOrderScreen: React.FC = () => {
  const navigation = useNavigation<BatchOrderScreenNavigationProp>();
  const route = useRoute<BatchOrderScreenRouteProp>();
  const { batchId } = route.params;

  // State
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedStops, setCompletedStops] = useState<Set<string>>(new Set());

  // Load route data
  const loadRouteData = async () => {
    try {
      setLoading(true);
      const route = await routeOptimizationService.getOptimizedRoute(batchId);
      setOptimizedRoute(route);

      // Find first incomplete stop
      const firstIncomplete = route.stops.findIndex(stop => !completedStops.has(stop.orderId));
      if (firstIncomplete !== -1) {
        setCurrentStopIndex(firstIncomplete);
      }
    } catch (error) {
      console.error('Error loading route:', error);
      Alert.alert('Error', 'Failed to load route information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRouteData();
  }, [batchId]);

  // Refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      loadRouteData();
    }, [batchId])
  );

  // Calculate progress
  const progress = useMemo(() => {
    if (!optimizedRoute) return { completed: 0, total: 0, percentage: 0 };
    const total = optimizedRoute.stops.length;
    const completed = completedStops.size;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, percentage };
  }, [optimizedRoute, completedStops]);

  // Calculate total earnings
  const totalEarnings = useMemo(() => {
    if (!optimizedRoute) return 0;
    // This would come from the order data in a real implementation
    return optimizedRoute.stops.length * 5.0; // $5 per stop as example
  }, [optimizedRoute]);

  // Current stop
  const currentStop = optimizedRoute?.stops[currentStopIndex] || null;

  // Map points for visualization
  const mapPoints = useMemo(() => {
    if (!optimizedRoute) return [];

    const points = [];

    // Add driver location
    points.push({
      id: 'driver-location',
      latitude: optimizedRoute.driverLocation.lat,
      longitude: optimizedRoute.driverLocation.lng,
      title: 'Your Location',
      type: 'current' as const,
    });

    // Add all stops with sequence numbers
    optimizedRoute.stops.forEach((stop, index) => {
      const isCompleted = completedStops.has(stop.orderId);
      const isCurrent = index === currentStopIndex;

      points.push({
        id: `stop-${stop.sequence}`,
        latitude: stop.lat,
        longitude: stop.lng,
        title: `Stop ${stop.sequence}: ${stop.stopType === 'pickup' ? 'Pickup' : 'Delivery'}`,
        description: stop.address,
        type: stop.stopType as 'pickup' | 'delivery',
        isCompleted,
        isCurrent,
        sequence: stop.sequence,
      });
    });

    return points;
  }, [optimizedRoute, completedStops, currentStopIndex]);

  // Handlers
  const handleNavigateToStop = () => {
    if (!currentStop) return;

    if (currentStop.stopType === 'pickup') {
      navigation.navigate('PickupScreen', {
        orderId: currentStop.orderId,
        stopId: `stop-${currentStop.sequence}`,
      });
    } else {
      navigation.navigate('DeliveryScreen', {
        orderId: currentStop.orderId,
        stopId: `stop-${currentStop.sequence}`,
      });
    }
  };

  const handleStopCompleted = (stopId: string) => {
    setCompletedStops(prev => {
      const updated = new Set(prev);
      updated.add(stopId);
      return updated;
    });

    // Move to next stop
    if (currentStopIndex < (optimizedRoute?.stops.length || 0) - 1) {
      setCurrentStopIndex(currentStopIndex + 1);
    } else {
      // All stops completed
      Alert.alert(
        'Route Completed!',
        'Congratulations! You have completed all deliveries in this batch.',
        [
          {
            text: 'View Summary',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    }
  };

  const handleReoptimize = async () => {
    try {
      setLoading(true);
      const reoptimized = await routeOptimizationService.reoptimizeFromCurrentLocation(batchId);
      setOptimizedRoute(reoptimized);
      Alert.alert('Success', 'Route has been reoptimized based on your current location');
    } catch (error) {
      console.error('Error reoptimizing route:', error);
      Alert.alert('Error', 'Failed to reoptimize route');
    } finally {
      setLoading(false);
    }
  };

  // Estimated completion time
  const estimatedCompletion = useMemo(() => {
    if (!optimizedRoute) return null;

    // Calculate remaining time from current stop
    const remainingStops = optimizedRoute.stops.slice(currentStopIndex);
    const totalMinutes = remainingStops.reduce((sum, stop) => sum + stop.etaMinutes, 0);

    const now = new Date();
    const completionTime = new Date(now.getTime() + totalMinutes * 60000);

    return {
      minutes: totalMinutes,
      time: completionTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
    };
  }, [optimizedRoute, currentStopIndex]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={flatColors.accent.blue} />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!optimizedRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={flatColors.accent.red} />
          <Text style={styles.errorText}>Failed to load route</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRouteData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.backgrounds.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={flatColors.neutral[900]} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Batch Route</Text>
          <Text style={styles.headerSubtitle}>
            {progress.completed} of {progress.total} stops completed
          </Text>
        </View>
        <TouchableOpacity style={styles.reoptimizeButton} onPress={handleReoptimize}>
          <Ionicons name="sync" size={20} color={flatColors.accent.blue} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress.percentage}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress.percentage)}%</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Map View */}
        <View style={styles.mapContainer}>
          <UniversalMapView
            points={mapPoints}
            height={250}
            showCurrentLocation={true}
            showRoute={true}
            style={styles.map}
          />
        </View>

        {/* Route Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="map" size={24} color={flatColors.accent.blue} />
              <Text style={styles.summaryLabel}>Total Distance</Text>
              <Text style={styles.summaryValue}>
                {optimizedRoute.totalDistanceKm.toFixed(1)} km
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="time" size={24} color={flatColors.accent.purple} />
              <Text style={styles.summaryLabel}>Est. Time</Text>
              <Text style={styles.summaryValue}>
                {optimizedRoute.totalDurationMinutes} min
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cash" size={24} color={flatColors.accent.green} />
              <Text style={styles.summaryLabel}>Earnings</Text>
              <Text style={styles.summaryValue}>
                ${totalEarnings.toFixed(2)}
              </Text>
            </View>
          </View>

          {estimatedCompletion && (
            <View style={styles.estimatedCompletionContainer}>
              <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
              <Text style={styles.estimatedCompletionText}>
                Est. completion: {estimatedCompletion.time} ({estimatedCompletion.minutes} min remaining)
              </Text>
            </View>
          )}
        </View>

        {/* Current Stop Card */}
        {currentStop && (
          <View style={styles.currentStopSection}>
            <Text style={styles.sectionTitle}>Current Stop</Text>
            <StopProgressCard
              stop={currentStop}
              stopNumber={currentStop.sequence}
              totalStops={optimizedRoute.stops.length}
              isActive={true}
              onNavigate={handleNavigateToStop}
              onComplete={() => handleStopCompleted(currentStop.orderId)}
            />
          </View>
        )}

        {/* Upcoming Stops */}
        <View style={styles.upcomingStopsSection}>
          <Text style={styles.sectionTitle}>Upcoming Stops</Text>
          {optimizedRoute.stops.slice(currentStopIndex + 1).map((stop) => (
            <View key={stop.sequence} style={styles.upcomingStopCard}>
              <View style={styles.stopNumberBadge}>
                <Text style={styles.stopNumberText}>{stop.sequence}</Text>
              </View>
              <View
                style={[
                  styles.stopTypeIcon,
                  stop.stopType === 'pickup' ? styles.pickupIcon : styles.deliveryIcon,
                ]}
              >
                <Ionicons
                  name={stop.stopType === 'pickup' ? 'bag' : 'home'}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopTypeText}>
                  {stop.stopType === 'pickup' ? 'Pickup' : 'Delivery'}
                </Text>
                <Text style={styles.stopAddress} numberOfLines={2}>
                  {stop.address}
                </Text>
                <Text style={styles.stopEta}>
                  ETA: {stop.etaMinutes} min • {stop.distanceFromPreviousKm.toFixed(1)} km
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Completed Stops */}
        {completedStops.size > 0 && (
          <View style={styles.completedStopsSection}>
            <Text style={styles.sectionTitle}>Completed Stops ({completedStops.size})</Text>
            {optimizedRoute.stops
              .filter(stop => completedStops.has(stop.orderId))
              .map((stop) => (
                <View key={stop.sequence} style={styles.completedStopCard}>
                  <Ionicons name="checkmark-circle" size={24} color={flatColors.accent.green} />
                  <View style={styles.completedStopInfo}>
                    <Text style={styles.completedStopText}>
                      Stop {stop.sequence}: {stop.stopType === 'pickup' ? 'Pickup' : 'Delivery'}
                    </Text>
                    <Text style={styles.completedStopAddress} numberOfLines={1}>
                      {stop.address}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      {currentStop && (
        <View style={styles.bottomActionContainer}>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigateToStop}
          >
            <Ionicons name="navigate" size={24} color="#FFFFFF" />
            <Text style={styles.navigateButtonText}>
              Navigate to Stop {currentStop.sequence}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: flatColors.neutral[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: flatColors.neutral[800],
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    backgroundColor: flatColors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  backButton: {
    padding: Design.spacing[2],
    marginRight: Design.spacing[3],
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: flatColors.neutral[900],
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: flatColors.neutral[600],
  },
  reoptimizeButton: {
    padding: Design.spacing[2],
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    backgroundColor: flatColors.backgrounds.primary,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: flatColors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: Design.spacing[3],
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: flatColors.accent.green,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.neutral[700],
    minWidth: 45,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 250,
    marginBottom: Design.spacing[3],
  },
  map: {
    borderRadius: 0,
  },
  summaryCard: {
    backgroundColor: flatColors.backgrounds.primary,
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    ...premiumShadows.small,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: flatColors.neutral[200],
  },
  summaryLabel: {
    fontSize: 12,
    color: flatColors.neutral[600],
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.neutral[900],
    marginTop: 4,
  },
  estimatedCompletionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Design.spacing[4],
    paddingTop: Design.spacing[4],
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  estimatedCompletionText: {
    fontSize: 14,
    color: flatColors.neutral[700],
    marginLeft: 8,
  },
  currentStopSection: {
    marginBottom: Design.spacing[4],
    paddingHorizontal: Design.spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.neutral[800],
    marginBottom: Design.spacing[3],
  },
  upcomingStopsSection: {
    marginBottom: Design.spacing[4],
    paddingHorizontal: Design.spacing[4],
  },
  upcomingStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.backgrounds.primary,
    padding: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[2],
    ...premiumShadows.small,
  },
  stopNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  stopNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: flatColors.neutral[800],
  },
  stopTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  pickupIcon: {
    backgroundColor: flatColors.accent.blue,
  },
  deliveryIcon: {
    backgroundColor: flatColors.accent.green,
  },
  stopInfo: {
    flex: 1,
  },
  stopTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: flatColors.neutral[600],
    textTransform: 'uppercase',
  },
  stopAddress: {
    fontSize: 14,
    color: flatColors.neutral[800],
    marginTop: 2,
  },
  stopEta: {
    fontSize: 12,
    color: flatColors.neutral[600],
    marginTop: 4,
  },
  completedStopsSection: {
    marginBottom: Design.spacing[6],
    paddingHorizontal: Design.spacing[4],
  },
  completedStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.green.background,
    padding: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginBottom: Design.spacing[2],
    borderWidth: 1,
    borderColor: flatColors.cards.green.border,
  },
  completedStopInfo: {
    flex: 1,
    marginLeft: Design.spacing[3],
  },
  completedStopText: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.neutral[800],
  },
  completedStopAddress: {
    fontSize: 12,
    color: flatColors.neutral[600],
    marginTop: 2,
  },
  bottomActionContainer: {
    padding: Design.spacing[4],
    backgroundColor: flatColors.backgrounds.primary,
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
    ...premiumShadows.medium,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.blue,
    paddingVertical: 16,
    borderRadius: Design.borderRadius.md,
  },
  navigateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default BatchOrderScreen;
