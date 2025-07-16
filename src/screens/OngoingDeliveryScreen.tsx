import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Haptics from 'react-native-haptic-feedback';

import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { deliveryApi } from '../services/api';
import { soundService } from '../services/soundService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RouteStop {
  id: string;
  order_id: string;
  type: 'pickup' | 'dropoff';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  customer_name: string;
  phone: string;
  status: 'pending' | 'completed';
  estimated_time?: string;
  special_instructions?: string;
}

interface RouteOptimizationResponse {
  route: RouteStop[];
  current_stop?: RouteStop;
  total_distance_km: number;
  estimated_completion_time: string;
}

const OngoingDeliveryScreen: React.FC = () => {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState<RouteOptimizationResponse | null>(null);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchRouteOptimization = useCallback(async () => {
    try {
      // TODO: Replace with actual API call when route optimization endpoint is available
      const response = await deliveryApi.getRouteOptimization();
      
      if (response && response.route) {
        const firstPendingStop = response.route.find(stop => stop.status === 'pending');
        response.current_stop = firstPendingStop;
        
        setRouteData(response);
        setCurrentStop(firstPendingStop || null);
      } else {
        setRouteData(null);
        setCurrentStop(null);
      }
    } catch (error) {
      // Error handled silently
      setRouteData(null);
      setCurrentStop(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRouteOptimization();
    }, [fetchRouteOptimization])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.trigger('impactLight');
    fetchRouteOptimization();
  }, [fetchRouteOptimization]);

  const handleStatusUpdate = async (stopId: string, action: 'arrived' | 'picked' | 'delivered') => {
    if (!currentStop || currentStop.id !== stopId) return;

    setUpdatingStatus(true);
    Haptics.trigger('impactMedium');

    try {
      // Mock status update - replace with actual API call
      setTimeout(() => {
        soundService.playOrderNotification();
        
        // Update current stop status
        if (routeData) {
          const updatedRoute = routeData.route.map(stop => 
            stop.id === stopId ? { ...stop, status: 'completed' as const } : stop
          );
          
          // Find next pending stop
          const nextStop = updatedRoute.find(stop => stop.status === 'pending');
          
          setRouteData({
            ...routeData,
            route: updatedRoute,
            current_stop: nextStop
          });
          setCurrentStop(nextStop || null);
        }
        
        const actionLabels = {
          arrived: 'marked as arrived',
          picked: 'marked as picked up',
          delivered: 'marked as delivered'
        };
        
        Alert.alert('Success', `Stop ${actionLabels[action]} successfully`);
        setUpdatingStatus(false);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to update stop status');
      setUpdatingStatus(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Haptics.trigger('selectionClick');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleNavigate = (location: RouteStop['location']) => {
    Haptics.trigger('selectionClick');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    Linking.openURL(url);
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.headerGradient}
    >
      <BlurView
        style={styles.headerBlur}
        blurType="light"
        blurAmount={20}
        reducedTransparencyFallbackColor="rgba(255,255,255,0.1)"
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Route Navigation</Text>
            <Text style={styles.headerSubtitle}>
              {currentStop ? 'Follow optimized route' : 'No active deliveries'}
            </Text>
          </View>
          
          {routeData && (
            <View style={styles.headerStats}>
              <Text style={styles.headerStatsText}>
                {routeData.route.filter(s => s.status === 'completed').length}/{routeData.route.length}
              </Text>
            </View>
          )}
        </View>
      </BlurView>
    </LinearGradient>
  );

  const renderCurrentStopCard = () => {
    if (!currentStop) return null;

    const isPickup = currentStop.type === 'pickup';

    return (
      <Animated.View
        style={[
          styles.currentStopContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <Card style={styles.currentStopCard}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.currentStopGradient}
          >
            <View style={styles.currentStopHeader}>
              <View style={styles.stopTypeIndicator}>
                <LinearGradient
                  colors={isPickup ? ['#f97316', '#ea580c'] : ['#10b981', '#059669']}
                  style={styles.stopTypeIcon}
                >
                  <Ionicons 
                    name={isPickup ? 'bag' : 'home'} 
                    size={24} 
                    color="#ffffff" 
                  />
                </LinearGradient>
                <View>
                  <Text style={styles.stopTypeLabel}>
                    {isPickup ? 'Pickup Location' : 'Delivery Location'}
                  </Text>
                  <Text style={styles.stopOrderId}>Order #{currentStop.order_id}</Text>
                </View>
              </View>
              
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.stopDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color="#6b7280" />
                <Text style={styles.stopAddress}>{currentStop.location.address}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color="#6b7280" />
                <Text style={styles.customerName}>{currentStop.customer_name}</Text>
                <TouchableOpacity
                  onPress={() => handleCall(currentStop.phone)}
                  style={styles.phoneButton}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.phoneButtonGradient}
                  >
                    <Ionicons name="call" size={16} color="#ffffff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {currentStop.estimated_time && (
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.estimatedTime}>
                    ETA: {new Date(currentStop.estimated_time).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {currentStop.special_instructions && (
                <View style={styles.instructionsContainer}>
                  <Ionicons name="information-circle" size={16} color="#3b82f6" />
                  <Text style={styles.instructions}>{currentStop.special_instructions}</Text>
                </View>
              )}
            </View>

            <View style={styles.stopActions}>
              <TouchableOpacity
                onPress={() => handleNavigate(currentStop.location)}
                style={styles.navigateButton}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="navigate" size={18} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {currentStop.status === 'pending' && (
                <TouchableOpacity
                  onPress={() => handleStatusUpdate(currentStop.id, isPickup ? 'picked' : 'delivered')}
                  style={styles.completeButton}
                  disabled={updatingStatus}
                >
                  <LinearGradient
                    colors={updatingStatus ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']}
                    style={styles.actionButtonGradient}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#ffffff" />
                        <Text style={styles.actionButtonText}>
                          {isPickup ? 'Mark Picked Up' : 'Mark Delivered'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </Card>
      </Animated.View>
    );
  };

  const renderRouteProgress = () => {
    if (!routeData?.route || routeData.route.length === 0) return null;

    const completedStops = routeData.route.filter(stop => stop.status === 'completed').length;
    const totalStops = routeData.route.length;
    const progressPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

    return (
      <Card style={styles.progressCard}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.progressGradient}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Route Progress</Text>
              <Text style={styles.progressSubtitle}>
                {completedStops} of {totalStops} stops completed
              </Text>
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
          </View>

          <View style={styles.routeMetrics}>
            <View style={styles.metric}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <Text style={styles.metricText}>{routeData.total_distance_km.toFixed(1)} km</Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="time" size={16} color="#6b7280" />
              <Text style={styles.metricText}>
                {new Date(routeData.estimated_completion_time).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Card>
    );
  };

  const renderUpcomingStops = () => {
    if (!routeData?.route) return null;

    const upcomingStops = routeData.route.filter(stop => 
      stop.status === 'pending' && stop.id !== currentStop?.id
    ).slice(0, 3);

    if (upcomingStops.length === 0) return null;

    return (
      <Card style={styles.upcomingCard}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.upcomingGradient}
        >
          <Text style={styles.upcomingTitle}>Upcoming Stops</Text>
          {upcomingStops.map((stop, index) => (
            <View key={stop.id} style={styles.upcomingStop}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.upcomingStopNumber}
              >
                <Text style={styles.upcomingStopNumberText}>{index + 2}</Text>
              </LinearGradient>
              <View style={styles.upcomingStopDetails}>
                <Text style={styles.upcomingStopType}>
                  {stop.type === 'pickup' ? 'Pickup' : 'Delivery'} • Order #{stop.order_id}
                </Text>
                <Text style={styles.upcomingStopAddress} numberOfLines={1}>
                  {stop.location.address}
                </Text>
                <Text style={styles.upcomingStopCustomer}>{stop.customer_name}</Text>
              </View>
            </View>
          ))}
        </LinearGradient>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading route optimization...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#667eea"
            />
          }
        >
          {currentStop ? (
            <>
              {renderCurrentStopCard()}
              {renderRouteProgress()}
              {renderUpcomingStops()}
            </>
          ) : (
            <Card style={styles.emptyStateCard}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.emptyStateGradient}
              >
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.emptyStateIcon}
                  >
                    <Ionicons name="car-outline" size={48} color="#ffffff" />
                  </LinearGradient>
                  <Text style={styles.emptyTitle}>No Active Route</Text>
                  <Text style={styles.emptySubtitle}>
                    Accept orders to start receiving optimized delivery routes
                  </Text>
                </View>
              </LinearGradient>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  safeArea: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  currentStopContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  currentStopCard: {
    padding: 0,
    overflow: 'hidden',
  },
  currentStopGradient: {
    padding: 20,
  },
  currentStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stopTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stopTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stopTypeLabel: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  stopOrderId: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  stopDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopAddress: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  phoneButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  phoneButtonGradient: {
    padding: 8,
  },
  estimatedTime: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 12,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 8,
    flex: 1,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 12,
  },
  navigateButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  progressCard: {
    margin: 20,
    padding: 0,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressStats: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  upcomingCard: {
    margin: 20,
    padding: 0,
    overflow: 'hidden',
  },
  upcomingGradient: {
    padding: 20,
  },
  upcomingTitle: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 16,
  },
  upcomingStop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  upcomingStopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  upcomingStopNumberText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  upcomingStopDetails: {
    flex: 1,
  },
  upcomingStopType: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  upcomingStopAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  upcomingStopCustomer: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyStateCard: {
    margin: 20,
    padding: 0,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    padding: 40,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default OngoingDeliveryScreen;