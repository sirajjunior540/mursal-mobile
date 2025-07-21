import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';

interface MapboxMapViewProps {
  points: Array<{
    latitude: number;
    longitude: number;
    type: 'pickup' | 'delivery';
  }>;
  height?: number;
  accessToken: string;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export const MapboxMapView: React.FC<MapboxMapViewProps> = ({ 
  points, 
  height = 300, 
  accessToken,
  initialRegion 
}) => {
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Set access token before rendering
  useEffect(() => {
    if (accessToken) {
      try {
        Mapbox.setAccessToken(accessToken);
        console.log('[MapboxMapView] Access token set');
      } catch (error) {
        console.error('[MapboxMapView] Error setting access token:', error);
      }
    }
  }, [accessToken]);

  // Calculate bounds from points
  const bounds = useMemo(() => {
    if (points.length === 0) {
      return null;
    }

    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // If all points are the same, add some padding
    if (minLat === maxLat && minLng === maxLng) {
      return {
        ne: [maxLng + 0.005, maxLat + 0.005],
        sw: [minLng - 0.005, minLat - 0.005],
        paddingTop: 100,
        paddingBottom: 100,
        paddingLeft: 100,
        paddingRight: 100,
      };
    }
    
    return {
      ne: [maxLng, maxLat], // Northeast [lng, lat]
      sw: [minLng, minLat], // Southwest [lng, lat]
      paddingTop: 100,
      paddingBottom: 100,
      paddingLeft: 100,
      paddingRight: 100,
    };
  }, [points]);

  // Calculate center point
  const centerCoordinate = useMemo(() => {
    if (points.length === 0) {
      // Default to Dubai if no points
      return [55.2708, 25.2048];
    }
    
    const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
    
    return [avgLng, avgLat]; // Mapbox uses [lng, lat] format
  }, [points]);

  // Convert points to GeoJSON features
  const pointFeatures = useMemo(() => {
    return points.map((point, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [point.longitude, point.latitude], // [lng, lat]
      },
      properties: {
        id: `point-${index}`,
        type: point.type,
        title: point.type === 'pickup' ? 'Pickup' : 'Delivery',
      },
    }));
  }, [points]);

  // Create line feature if multiple points
  const lineFeature = useMemo(() => {
    if (points.length < 2) return null;
    
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: points.map(p => [p.longitude, p.latitude]),
      },
      properties: {},
    };
  }, [points]);

  // Handle map loaded
  const handleMapLoaded = () => {
    console.log('[MapboxMapView] Map loaded');
    
    // Fit to bounds after map loads
    if (bounds && cameraRef.current) {
      setTimeout(() => {
        cameraRef.current?.fitBounds(
          bounds.ne,
          bounds.sw,
          [bounds.paddingTop, bounds.paddingRight, bounds.paddingBottom, bounds.paddingLeft],
          1000 // Animation duration
        );
      }, 500);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('[MapboxMapView] Props:', {
      pointsCount: points.length,
      points: points.map(p => ({ lat: p.latitude, lng: p.longitude, type: p.type })),
      centerCoordinate,
      bounds,
    });
  }, [points, centerCoordinate, bounds]);

  return (
    <View style={[styles.container, { height }]}>
      <Mapbox.MapView 
        ref={mapRef}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Street}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
        compassEnabled={true}
        scaleBarEnabled={true}
        onDidFinishLoadingMap={handleMapLoaded}
      >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={centerCoordinate}
          zoomLevel={13}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* Render route line */}
        {lineFeature && (
          <Mapbox.ShapeSource id="routeLine" shape={lineFeature}>
            <Mapbox.LineLayer
              id="routeLineFill"
              style={{
                lineColor: '#007AFF',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Render markers */}
        {pointFeatures.map((feature, index) => {
          const isPickup = feature.properties.type === 'pickup';
          
          // Check for overlapping markers
          const hasOverlap = index > 0 && points.some((p, i) => 
            i < index && 
            Math.abs(p.latitude - points[index].latitude) < 0.0001 && 
            Math.abs(p.longitude - points[index].longitude) < 0.0001
          );
          
          // Add offset if overlapping
          let offsetCoordinates = feature.geometry.coordinates;
          if (hasOverlap && !isPickup) {
            // Offset delivery marker slightly
            offsetCoordinates = [
              feature.geometry.coordinates[0] + 0.0005,
              feature.geometry.coordinates[1] + 0.0005,
            ];
          }

          return (
            <Mapbox.PointAnnotation
              key={feature.properties.id}
              id={feature.properties.id}
              coordinate={offsetCoordinates}
              title={feature.properties.title}
            >
              <View style={[
                styles.markerContainer,
                isPickup ? styles.pickupMarker : styles.deliveryMarker,
              ]}>
                <View style={styles.markerDot} />
              </View>
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupMarker: {
    backgroundColor: '#FF6B6B',
  },
  deliveryMarker: {
    backgroundColor: '#4ECDC4',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
});

export default MapboxMapView;