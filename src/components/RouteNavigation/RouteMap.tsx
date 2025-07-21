import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RouteMapProps } from '../../types/route.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import UniversalMapView from '../UniversalMap/UniversalMapView';

const { width: screenWidth } = Dimensions.get('window');

export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  currentStopIndex,
  showMap,
  mapProvider,
  onMarkerPress,
}) => {
  // Debug logging
  console.log('[RouteMap] Props:', {
    hasRoute: !!route,
    pointsCount: route?.points?.length || 0,
    points: route?.points?.map(p => ({ 
      id: p.id, 
      lat: p.latitude, 
      lng: p.longitude,
      type: p.type,
      address: p.address 
    })),
    showMap,
    mapProvider
  });
  // If map is not configured or enabled, show alternative view
  if (!showMap || !mapProvider) {
    return (
      <View style={styles.noMapContainer}>
        <View style={styles.noMapCard}>
          <View style={styles.noMapIcon}>
            <Ionicons name="map-outline" size={32} color={flatColors.neutral[400]} />
          </View>
          <Text style={styles.noMapTitle}>Map Not Available</Text>
          <Text style={styles.noMapSubtitle}>
            Map service not configured for your account
          </Text>
        </View>
      </View>
    );
  }

  // Calculate map region based on route points
  const getMapRegion = () => {
    if (!route?.points || route.points.length === 0) {
      return {
        latitude: 24.7136,
        longitude: 46.6753,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = route.points.map(p => p.latitude);
    const lngs = route.points.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.05,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.05,
    };
  };

  const mapRegion = getMapRegion();

  // Generate markers for map
  const markers = route?.points?.map((point, index) => ({
    id: point.id,
    coordinate: { latitude: point.latitude, longitude: point.longitude },
    title: `${index + 1}. ${point.type === 'pickup' ? 'Pickup' : 'Delivery'}`,
    description: point.address,
    type: point.type,
    isCurrent: index === currentStopIndex,
    isCompleted: point.order.status === 'delivered',
  })) || [];

  // Convert route points to map points format
  const mapPoints = route?.points?.map((point, index) => ({
    id: point.id,
    latitude: point.latitude,
    longitude: point.longitude,
    title: `${index + 1}. ${point.type === 'pickup' ? 'Pickup' : 'Delivery'}`,
    description: point.address,
    type: point.type,
  })) || [];

  // Handle point press
  const handlePointPress = (point: any) => {
    if (onMarkerPress) {
      onMarkerPress(point.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderLeft}>
          <View style={styles.mapProviderIcon}>
            <Ionicons 
              name="map" 
              size={20} 
              color={flatColors.accent.blue} 
            />
          </View>
          <View>
            <Text style={styles.mapHeaderTitle}>Route Overview</Text>
            <Text style={styles.mapHeaderSubtitle}>
              {mapProvider || 'Static view'} • {markers.length} stops
            </Text>
          </View>
        </View>
        
        <View style={styles.mapStats}>
          <Text style={styles.mapStatsText}>
            {markers.filter(m => m.isCompleted).length}/{markers.length}
          </Text>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <UniversalMapView
          points={mapPoints}
          height={240}
          center={mapRegion}
          showCurrentLocation={true}
          showRouteOptimization={true}
          onPointPress={handlePointPress}
        />
      </View>

      {/* Map Legend */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: flatColors.accent.orange }]} />
          <Text style={styles.legendText}>Pickup</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: flatColors.accent.green }]} />
          <Text style={styles.legendText}>Delivery</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: flatColors.accent.blue }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: flatColors.neutral[300] }]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    overflow: 'hidden',
    ...premiumShadows.medium,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: flatColors.cards.blue.background,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapProviderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: flatColors.backgrounds.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mapHeaderTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  mapHeaderSubtitle: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[600],
  },
  mapStats: {
    alignItems: 'flex-end',
  },
  mapStatsText: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[700],
  },
  mapContainer: {
    height: 240,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
  },
  mapProviderText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
    marginTop: 8,
  },
  mapStopsText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[500],
    marginTop: 4,
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlayText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: '#FFFFFF',
  },
  mapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '500',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.neutral[600],
  },
  
  // No Map States
  noMapContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  noMapCard: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    ...premiumShadows.subtle,
  },
  noMapIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: flatColors.backgrounds.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noMapTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[700],
    marginBottom: 8,
    textAlign: 'center',
  },
  noMapSubtitle: {
    fontSize: premiumTypography.body.medium.fontSize,
    fontWeight: premiumTypography.body.medium.fontWeight,
    lineHeight: 20,
    color: flatColors.neutral[500],
    textAlign: 'center',
  },
});