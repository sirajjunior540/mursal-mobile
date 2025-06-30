import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import RNMapView, { 
  Marker, 
  Polyline, 
  PROVIDER_GOOGLE, 
  PROVIDER_DEFAULT,
  Region,
  LatLng,
  MapPressEvent
} from 'react-native-maps';
import { theme } from '../../design/theme';
import Button from './Button';
import { navigationService } from '../../services/navigationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapLocation {
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
  type?: 'pickup' | 'delivery' | 'driver' | 'waypoint';
}

interface MapRoute {
  coordinates: LatLng[];
  distance?: number;
  duration?: number;
}

interface MapViewProps {
  // Map configuration
  height?: number;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  
  // Data
  locations?: MapLocation[];
  route?: MapRoute;
  userLocation?: MapLocation;
  
  // Interaction
  onLocationPress?: (location: MapLocation) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  showUserLocation?: boolean;
  showCompass?: boolean;
  showScale?: boolean;
  
  // Navigation
  showNavigationButton?: boolean;
  navigationDestination?: MapLocation;
  onNavigate?: () => void;
  
  // Style
  mapStyle?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  height = 300,
  initialRegion,
  locations = [],
  route,
  userLocation,
  onLocationPress,
  onMapPress,
  showUserLocation = true,
  showCompass = true,
  showScale = true,
  showNavigationButton = false,
  navigationDestination,
  onNavigate,
  mapStyle = 'standard',
  zoomEnabled = true,
  scrollEnabled = true,
  rotateEnabled = true,
  pitchEnabled = true,
}) => {
  const mapRef = useRef<RNMapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [region, setRegion] = useState<Region | undefined>(undefined);

  // Calculate initial region
  useEffect(() => {
    if (initialRegion) {
      setRegion({
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
        latitudeDelta: initialRegion.latitudeDelta || 0.01,
        longitudeDelta: initialRegion.longitudeDelta || 0.01,
      });
    } else if (locations.length > 0 || userLocation) {
      const allLocations = [...locations];
      if (userLocation) allLocations.push(userLocation);
      
      if (allLocations.length === 1) {
        const location = allLocations[0];
        setRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else if (allLocations.length > 1) {
        const latitudes = allLocations.map(loc => loc.latitude);
        const longitudes = allLocations.map(loc => loc.longitude);
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        const midLat = (minLat + maxLat) / 2;
        const midLng = (minLng + maxLng) / 2;
        const deltaLat = (maxLat - minLat) * 1.3; // Add padding
        const deltaLng = (maxLng - minLng) * 1.3; // Add padding
        
        setRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: Math.max(deltaLat, 0.01),
          longitudeDelta: Math.max(deltaLng, 0.01),
        });
      }
    }
  }, [initialRegion, locations, userLocation]);

  // Fit map to show all locations when map is ready
  useEffect(() => {
    if (isMapReady && mapRef.current && (locations.length > 1 || (locations.length > 0 && userLocation))) {
      const allLocations = [...locations];
      if (userLocation) allLocations.push(userLocation);
      
      if (allLocations.length > 1) {
        const coordinates = allLocations.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
        }));
        
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }
    }
  }, [isMapReady, locations, userLocation]);

  const handleLocationPress = (location: MapLocation) => {
    onLocationPress?.(location);
  };

  const handleMapPress = (event: MapPressEvent) => {
    if (onMapPress) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      onMapPress({ latitude, longitude });
    }
  };

  const handleNavigatePress = async () => {
    if (navigationDestination) {
      if (onNavigate) {
        onNavigate();
      } else {
        await navigationService.navigateToDestination({
          latitude: navigationDestination.latitude,
          longitude: navigationDestination.longitude,
          name: navigationDestination.title,
        });
      }
    }
  };

  const getMarkerColor = (type: string): string => {
    switch (type) {
      case 'pickup':
        return theme.colors.warning[500];
      case 'delivery':
        return theme.colors.success[500];
      case 'driver':
        return theme.colors.primary[500];
      case 'waypoint':
        return theme.colors.info[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getMarkerTitle = (location: MapLocation, index: number): string => {
    if (location.type === 'pickup') return 'P';
    if (location.type === 'delivery') return 'D';
    if (location.type === 'driver') return '🚗';
    return (index + 1).toString();
  };

  const getMapType = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'satellite';
      case 'hybrid':
        return 'hybrid';
      case 'terrain':
        return Platform.OS === 'android' ? 'terrain' : 'standard';
      default:
        return 'standard';
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        mapType={getMapType()}
        initialRegion={region}
        onMapReady={() => setIsMapReady(true)}
        onPress={handleMapPress}
        zoomEnabled={zoomEnabled}
        scrollEnabled={scrollEnabled}
        rotateEnabled={rotateEnabled}
        pitchEnabled={pitchEnabled}
        showsCompass={showCompass}
        showsScale={showScale}
        showsUserLocation={showUserLocation}
        followsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor={theme.colors.primary[500]}
        loadingBackgroundColor={theme.colors.neutral[100]}
      >
        {/* Route Polyline */}
        {route && route.coordinates.length > 1 && (
          <Polyline
            coordinates={route.coordinates}
            strokeColor={theme.colors.primary[500]}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Location Markers */}
        {locations.map((location, index) => (
          <Marker
            key={`location-${index}`}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.title}
            description={location.subtitle}
            onPress={() => handleLocationPress(location)}
            pinColor={getMarkerColor(location.type || 'waypoint')}
          >
            <View style={[
              styles.marker,
              { backgroundColor: getMarkerColor(location.type || 'waypoint') }
            ]}>
              <Text style={styles.markerText}>
                {getMarkerTitle(location, index)}
              </Text>
            </View>
          </Marker>
        ))}

        {/* User Location Marker */}
        {userLocation && !showUserLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            pinColor={theme.colors.primary[500]}
          >
            <View style={[
              styles.marker,
              { backgroundColor: theme.colors.primary[500] }
            ]}>
              <Text style={styles.markerText}>📍</Text>
            </View>
          </Marker>
        )}
      </RNMapView>

      {/* Route Information Overlay */}
      {route && (route.distance || route.duration) && (
        <View style={styles.routeInfo}>
          {route.distance && (
            <Text style={styles.routeInfoText}>
              📏 {route.distance.toFixed(1)} km
            </Text>
          )}
          {route.duration && (
            <Text style={styles.routeInfoText}>
              ⏱️ {Math.round(route.duration)} min
            </Text>
          )}
        </View>
      )}

      {/* Navigation Button */}
      {showNavigationButton && navigationDestination && (
        <View style={styles.navigationButton}>
          <Button
            title="Navigate"
            onPress={handleNavigatePress}
            variant="primary"
            size="sm"
            icon={<Text>🧭</Text>}
          />
        </View>
      )}

      {/* Loading Overlay */}
      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral[100],
  },
  
  map: {
    flex: 1,
  },
  
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.neutral[0],
    ...theme.shadows.base,
  },
  
  markerText: {
    color: theme.colors.neutral[0],
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  
  routeInfo: {
    position: 'absolute',
    top: theme.spacing[4],
    left: theme.spacing[4],
    backgroundColor: theme.colors.neutral[0],
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    flexDirection: 'row',
    gap: theme.spacing[3],
    ...theme.shadows.base,
  },
  
  routeInfoText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[700],
  },
  
  navigationButton: {
    position: 'absolute',
    bottom: theme.spacing[4],
    right: theme.spacing[4],
  },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[600],
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default MapView;