/**
 * Universal Map View
 * Adapts to different map providers based on tenant configuration
 * Industry best practice: Provider abstraction for multi-tenant platforms
 */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Polyline, Region } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { mapProviderService } from '../../services/mapProviderService';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
// Temporarily disabled due to React Native 0.80 compatibility issues
// import MapboxMapView from './MapboxMapView';

interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  type?: 'pickup' | 'delivery' | 'current';
}

interface MapRoute {
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance?: number;
  duration?: number;
}

interface UniversalMapViewProps {
  points?: MapPoint[];
  route?: MapRoute;
  center?: { latitude: number; longitude: number };
  zoom?: number;
  height?: number;
  showCurrentLocation?: boolean;
  showRouteOptimization?: boolean;
  onPointPress?: (point: MapPoint) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  style?: any;
}

export const UniversalMapView: React.FC<UniversalMapViewProps> = ({
  points = [],
  route,
  center = { latitude: 24.7136, longitude: 46.6753 }, // Default to Riyadh
  zoom = 13,
  height = 300,
  showCurrentLocation = false,
  showRouteOptimization = false,
  onPointPress,
  onMapPress,
  style,
}) => {
  const [mapConfig, setMapConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Load map configuration
  useEffect(() => {
    const loadMapConfig = async () => {
      try {
        setLoading(true);
        const config = await mapProviderService.getMobileMapConfig();
        console.log('[UniversalMapView] Loaded config:', config);
        setMapConfig(config);
        
        // Don't show error for supported providers
        if (!config.supportsMobile && config.provider !== 'google') {
          const provider = config.provider || 'selected provider';
          setError(`${provider} is not fully supported on mobile devices`);
        }
      } catch (err) {
        console.error('[UniversalMapView] Failed to load map config:', err);
        // Default to Google Maps on error since we have the API key configured
        setMapConfig({
          showMap: true,
          provider: 'google',
          enableNavigation: true,
          supportsMobile: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadMapConfig();
  }, []);

  // Memoized map region calculation
  const mapRegion = useMemo(() => {
    if (points.length === 0) {
      console.log('[UniversalMapView] No points, using center:', center);
      return {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = points.map(p => p.latitude).filter(lat => !isNaN(lat) && lat !== 0);
    const lngs = points.map(p => p.longitude).filter(lng => !isNaN(lng) && lng !== 0);
    
    console.log('[UniversalMapView] Valid coordinates:', { lats, lngs });
    
    if (lats.length === 0 || lngs.length === 0) {
      console.log('[UniversalMapView] No valid coordinates, using center');
      return {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding around the points
    const latPadding = Math.max((maxLat - minLat) * 0.5, 0.02);
    const lngPadding = Math.max((maxLng - minLng) * 0.5, 0.02);
    
    const deltaLat = (maxLat - minLat) + latPadding;
    const deltaLng = (maxLng - minLng) + lngPadding;
    
    const calculatedRegion = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(deltaLat, 0.02),
      longitudeDelta: Math.max(deltaLng, 0.02),
    };
    
    console.log('[UniversalMapView] Calculated region:', calculatedRegion);
    return calculatedRegion;
  }, [points, center]);

  // Create route polyline from points if route prop not provided
  const routeCoordinates = useMemo(() => {
    if (route && route.coordinates.length > 0) {
      return route.coordinates;
    }
    // If no route provided but we have points, connect them in order
    if (points.length > 1) {
      return points.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      }));
    }
    return [];
  }, [route, points]);

  // Debug logging
  useEffect(() => {
    console.log('[UniversalMapView] Props:', {
      pointsCount: points.length,
      points: points.map(p => ({ id: p.id, lat: p.latitude, lng: p.longitude, type: p.type })),
      hasRoute: !!route,
      routeCoordinatesCount: route?.coordinates?.length || 0,
      center,
      mapRegion,
      mapConfig,
      routeCoordinates: routeCoordinates.length
    });
    
    // Log if coordinates look invalid
    if (points.length > 0) {
      const invalidPoints = points.filter(p => isNaN(p.latitude) || isNaN(p.longitude) || p.latitude === 0 || p.longitude === 0);
      if (invalidPoints.length > 0) {
        console.warn('[UniversalMapView] Invalid points detected:', invalidPoints);
      }
      
      // Check if ALL points are invalid
      const validPoints = points.filter(p => !isNaN(p.latitude) && !isNaN(p.longitude) && p.latitude !== 0 && p.longitude !== 0);
      if (validPoints.length === 0) {
        console.error('[UniversalMapView] ERROR: All points have invalid coordinates!');
      }
    }
  }, [points, route, center, mapRegion, mapConfig, routeCoordinates]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { height }, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={flatColors.accent.blue} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  // Error state - only show if there's an actual error or maps are explicitly disabled
  if (error || mapConfig?.provider === 'none' || mapError) {
    console.log('[UniversalMapView] Showing error state:', { error, provider: mapConfig?.provider, mapError });
    return (
      <View style={[styles.container, { height }, style]}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons 
              name="map-outline" 
              size={32} 
              color={flatColors.neutral[400]} 
            />
          </View>
          <Text style={styles.errorTitle}>
            {error ? 'Map Error' : 'Map Not Available'}
          </Text>
          <Text style={styles.errorMessage}>
            {error || 'Map service not configured for your account'}
          </Text>
          {!mapConfig?.supportsMobile && mapConfig?.provider && (
            <Text style={styles.errorHelper}>
              {mapConfig.provider} has limited mobile support
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Render provider-specific map
  const renderMap = () => {
    console.log('[UniversalMapView] renderMap called with provider:', mapConfig?.provider);
    
    // If no config loaded yet, default to Google Maps
    if (!mapConfig) {
      console.log('[UniversalMapView] No config, defaulting to Google Maps');
      return renderGoogleMap();
    }
    
    switch (mapConfig.provider) {
      case 'google':
        return renderGoogleMap();
      case 'mapbox':
        return renderMapboxMap();
      case 'openrouteservice':
        return renderOpenRouteServiceMap();
      case 'openstreetmap':
        return renderOpenStreetMap();
      default:
        console.log('[UniversalMapView] Unknown provider, using fallback');
        return renderFallbackView();
    }
  };

  const renderGoogleMap = () => {
    console.log('[UniversalMapView] Rendering Google Maps');
    // On iOS, PROVIDER_GOOGLE requires additional setup, so we use default for now
    const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
    return renderNativeMap(mapProvider);
  };

  const renderMapboxMap = () => {
    console.log('[UniversalMapView] Mapbox temporarily disabled due to React Native 0.80 compatibility');
    console.log('[UniversalMapView] @rnmapbox/maps needs to be updated for RN 0.80 support');
    console.log('[UniversalMapView] Falling back to Google Maps on Android, Apple Maps on iOS');
    
    // Fallback to Google Maps on Android until @rnmapbox/maps is updated for React Native 0.80
    const fallbackProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
    return renderNativeMap(fallbackProvider);
    
    // Original Mapbox implementation - will restore when compatibility is fixed
    /*
    console.log('[UniversalMapView] Rendering native Mapbox map with token:', {
      hasApiKey: !!mapConfig.api_key,
      hasSecretToken: !!mapConfig.secret_token,
    });
    
    // Convert points to simple format for MapboxMapView
    const mapboxPoints = points.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      type: (point.type || 'delivery') as 'pickup' | 'delivery',
    }));
    
    // Use public access token (pk.*) for the SDK, not the secret token
    // The secret token is only used during build time for SDK download
    return (
      <MapboxMapView
        points={mapboxPoints}
        height={height}
        accessToken={mapConfig.api_key || ''}
        initialRegion={mapRegion}
      />
    );
    */
  };

  const renderOpenRouteServiceMap = () => {
    // OpenRouteService using default map tiles
    return renderNativeMap(PROVIDER_DEFAULT);
  };

  const renderOpenStreetMap = () => {
    // OpenStreetMap using default provider
    return renderNativeMap(PROVIDER_DEFAULT);
  };

  const renderFallbackView = () => {
    return renderNativeMap(PROVIDER_DEFAULT);
  };

  // Render actual native map
  const renderNativeMap = (provider: any) => {
    console.log('[UniversalMapView] Rendering native map with:', {
      provider,
      pointsCount: points.length,
      regionCenter: mapRegion,
    });
    const markerColors = {
      pickup: '#FF9F43',
      delivery: '#10B981',
      current: '#FF6B00',
    };

    // Force a valid initial region
    const initialMapRegion = {
      latitude: mapRegion.latitude || 25.409328,
      longitude: mapRegion.longitude || 55.44359,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    console.log('[UniversalMapView] Using initial region:', initialMapRegion);

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={provider}
        initialRegion={initialMapRegion}
        showsUserLocation={showCurrentLocation}
        showsMyLocationButton={showCurrentLocation}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        onPress={(e) => {
          if (onMapPress) {
            onMapPress(e.nativeEvent.coordinate);
          }
        }}
        onMapReady={() => {
          console.log('[UniversalMapView] Map is ready');
          console.log('[UniversalMapView] Points:', points);
          console.log('[UniversalMapView] MapRegion:', mapRegion);
          setMapError(false);
          
          // Force animate to the correct region after map loads
          if (mapRef.current) {
            const targetRegion = {
              latitude: mapRegion.latitude || 25.409328,
              longitude: mapRegion.longitude || 55.44359,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
            
            console.log('[UniversalMapView] Animating to target region:', targetRegion);
            
            // First animation to get us to the right area
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(targetRegion, 1000);
                console.log('[UniversalMapView] First animation triggered');
              }
            }, 100);
            
            // Second attempt with fitToCoordinates if we have multiple points
            if (points.length > 0) {
              setTimeout(() => {
                if (mapRef.current) {
                  const validCoordinates = points
                    .filter(p => !isNaN(p.latitude) && !isNaN(p.longitude) && p.latitude !== 0 && p.longitude !== 0)
                    .map(p => ({
                      latitude: p.latitude,
                      longitude: p.longitude,
                    }));
                  
                  console.log('[UniversalMapView] Valid coordinates for fitting:', validCoordinates);
                  
                  if (validCoordinates.length > 0) {
                    // Try fitToSuppliedMarkers as alternative
                    if (mapRef.current.fitToSuppliedMarkers) {
                      mapRef.current.fitToSuppliedMarkers({
                        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                        animated: true,
                      });
                      console.log('[UniversalMapView] Called fitToSuppliedMarkers');
                    } else {
                      // Fallback to fitToCoordinates
                      mapRef.current.fitToCoordinates(validCoordinates, {
                        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                        animated: true,
                      });
                      console.log('[UniversalMapView] Called fitToCoordinates');
                    }
                  }
                }
              }, 1500);
            }
          }
        }}
        onMapLoadError={(error: any) => {
          console.error('[UniversalMapView] Map load error:', error);
          setMapError(true);
        }}
      >
        {/* Debug marker - always visible */}
        <Marker
          coordinate={{
            latitude: 25.409328,
            longitude: 55.44359,
          }}
          title="DEBUG MARKER"
          description="This is a test marker at the exact coordinates"
          pinColor="red"
        />

        {/* Render actual route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={flatColors.accent.blue}
            strokeWidth={3}
            geodesic={true}
          />
        )}

        {/* Render actual markers */}
        {points.map((point, index) => {
          // Determine marker color based on type
          let markerColor = markerColors[point.type || 'current'];
          
          // Override color for pickup/delivery types
          if (point.type === 'pickup') {
            markerColor = '#FF9F43'; // Orange for pickup
          } else if (point.type === 'delivery') {
            markerColor = '#10B981'; // Green for delivery
          }

          // Check if this point overlaps with a previous point
          const overlappingIndex = points.findIndex((p, i) => 
            i < index && 
            Math.abs(p.latitude - point.latitude) < 0.0001 && 
            Math.abs(p.longitude - point.longitude) < 0.0001
          );

          // Add small offset if overlapping
          let offsetLat = 0;
          let offsetLng = 0;
          if (overlappingIndex !== -1) {
            // Add small offset to make both markers visible
            offsetLat = 0.0002 * (index - overlappingIndex);
            offsetLng = 0.0002 * (index - overlappingIndex);
            console.log(`[UniversalMapView] Point ${index} overlaps with ${overlappingIndex}, adding offset`);
          }

          console.log(`[UniversalMapView] Rendering marker ${index}:`, {
            id: point.id,
            lat: point.latitude + offsetLat,
            lng: point.longitude + offsetLng,
            type: point.type,
            color: markerColor,
            hasOffset: overlappingIndex !== -1
          });

          return (
            <Marker
              key={`marker-${index}`}
              coordinate={{
                latitude: point.latitude + offsetLat,
                longitude: point.longitude + offsetLng,
              }}
              title={point.title || `${point.type === 'pickup' ? 'Pickup' : 'Delivery'} ${index + 1}`}
              description={point.description || point.address}
              pinColor={markerColor}
              tracksViewChanges={false}
              onPress={() => {
                console.log('[UniversalMapView] Marker pressed:', point);
                onPointPress?.(point);
              }}
            />
          );
        })}
      </MapView>
    );
  };

  return (
    <View style={[styles.container, { height }, style]}>
      {renderMap()}
      
      {/* Map overlay with points info */}
      {points.length > 0 && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {points.length} stops
            {route && ` • ${Math.round((route.distance || 0) / 1000)}km`}
          </Text>
        </View>
      )}
      
      {/* Provider badge overlay */}
      <View style={styles.providerOverlay}>
        <View style={styles.providerBadge}>
          <Ionicons 
            name={getProviderIcon(mapConfig.provider)} 
            size={14} 
            color={flatColors.neutral[600]} 
          />
          <Text style={styles.providerBadgeText}>
            {getProviderName(mapConfig.provider)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Helper functions
const getProviderIcon = (provider: string | null): string => {
  switch (provider) {
    case 'google': return 'map';
    case 'mapbox': return 'map';
    case 'openrouteservice': return 'compass';
    case 'openstreetmap': return 'earth';
    default: return 'location-outline';
  }
};

const getProviderName = (provider: string | null): string => {
  switch (provider) {
    case 'google': return 'Google Maps';
    case 'mapbox': return 'Mapbox';
    case 'openrouteservice': return 'OpenRoute';
    case 'openstreetmap': return 'OSM';
    default: return 'Maps';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
  },
  loadingText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    color: flatColors.neutral[600],
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
    padding: 20,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.backgrounds.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[700],
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: premiumTypography.footnote.fontWeight,
    color: flatColors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  errorHelper: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    color: flatColors.neutral[400],
    textAlign: 'center',
    marginTop: 8,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.backgrounds.tertiary,
    padding: 20,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.backgrounds.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 6,
  },
  providerText: {
    fontSize: premiumTypography.footnote.fontSize,
    fontWeight: '600',
    color: flatColors.neutral[700],
  },
  placeholderText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: premiumTypography.caption.medium.fontWeight,
    color: flatColors.neutral[500],
    textAlign: 'center',
    marginBottom: 4,
  },
  disabledText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: premiumTypography.caption.small.fontWeight,
    color: flatColors.neutral[400],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  overlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlayText: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  providerOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: flatColors.neutral[600],
  },
});

export default UniversalMapView;