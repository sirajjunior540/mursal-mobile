/**
 * UniversalMapView Component
 * Renders the appropriate map component based on tenant configuration
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, MapViewProps } from 'react-native-maps';
import { mapProviderService, MapProviderConfig, RoutePoint } from '../services/mapProviderService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UniversalMapViewProps extends Omit<MapViewProps, 'provider'> {
  markers?: Array<{
    id: string;
    coordinate: RoutePoint;
    title?: string;
    description?: string;
    pinColor?: string;
  }>;
  route?: {
    coordinates: RoutePoint[];
    strokeColor?: string;
    strokeWidth?: number;
  };
  onMapReady?: () => void;
  fallbackMessage?: string;
}

const UniversalMapView: React.FC<UniversalMapViewProps> = ({
  markers = [],
  route,
  onMapReady,
  fallbackMessage = 'Map view is not available for your organization',
  style,
  ...mapProps
}) => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<MapProviderConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMapConfig();
  }, []);

  const loadMapConfig = async () => {
    try {
      setLoading(true);
      const mapConfig = await mapProviderService.getConfig();
      setConfig(mapConfig);
    } catch (err) {
      console.error('Failed to load map configuration:', err);
      setError('Failed to load map configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!config || config.map_provider === 'none') {
    // No map provider configured - show fallback
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>{fallbackMessage}</Text>
      </View>
    );
  }

  // For now, we support Google Maps and OpenRouteService with Google Maps visualization
  // Mapbox will require @rnmapbox/maps package to be installed
  const renderGoogleMap = () => (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      onMapReady={onMapReady}
      {...mapProps}
    >
      {/* Render markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.coordinate}
          title={marker.title}
          description={marker.description}
          pinColor={marker.pinColor}
        />
      ))}

      {/* Render route */}
      {route && route.coordinates.length > 0 && (
        <Polyline
          coordinates={route.coordinates}
          strokeColor={route.strokeColor || '#1E90FF'}
          strokeWidth={route.strokeWidth || 4}
        />
      )}
    </MapView>
  );

  const renderMapbox = () => {
    // TODO: Implement Mapbox rendering when @rnmapbox/maps is installed
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>
          Mapbox support coming soon. Using Google Maps fallback.
        </Text>
        {renderGoogleMap()}
      </View>
    );
  };

  // Render appropriate map based on provider
  switch (config.map_provider) {
    case 'google':
    case 'openrouteservice': // Use Google Maps for visualization
      return renderGoogleMap();
    case 'mapbox':
      return renderMapbox();
    default:
      return (
        <View style={[styles.container, styles.fallbackContainer, style]}>
          <Text style={styles.fallbackText}>{fallbackMessage}</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fallbackContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    textAlign: 'center',
  },
});

export default UniversalMapView;