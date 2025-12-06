import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';

interface SimpleMapViewProps {
  points: Array<{
    latitude: number;
    longitude: number;
    type: 'pickup' | 'delivery';
  }>;
  height?: number;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export const SimpleMapView: React.FC<SimpleMapViewProps> = ({ points, height = 300, initialRegion }) => {
  const mapRef = useRef<MapView>(null);

  // Calculate region from points
  const getRegion = () => {
    if (points.length === 0) {
      // Default to Dubai
      return {
        latitude: 25.2048,
        longitude: 55.2708,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // If all points are the same, zoom in closer
    if (minLat === maxLat && minLng === maxLng) {
      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: 0.01,  // Zoom in more for same location
        longitudeDelta: 0.01,
      };
    }
    
    // Calculate deltas with minimum values to prevent over-zooming
    const latDelta = Math.max((maxLat - minLat) * 2.5, 0.05);
    const lngDelta = Math.max((maxLng - minLng) * 2.5, 0.05);
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const region = initialRegion || getRegion();
  
  // Debug logging
  console.log('[SimpleMapView] Props:', {
    pointsCount: points.length,
    points: points.map(p => ({ lat: p.latitude, lng: p.longitude, type: p.type })),
    initialRegion,
    calculatedRegion: region,
  });

  useEffect(() => {
    // Force zoom to region after map loads
    if (points.length > 1) {
      const timer = setTimeout(() => {
        if (mapRef.current) {
          const coordinates = points.map(p => ({
            latitude: p.latitude,
            longitude: p.longitude,
          }));
          
          try {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
              animated: true,
            });
          } catch (e) {
            console.log('fitToCoordinates failed, using animateToRegion');
            mapRef.current.animateToRegion(region, 1000);
          }
        }
      }, 2000); // Increased delay to ensure markers are rendered first

      return () => clearTimeout(timer);
    }
  }, [points, region]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={() => {
          console.log('[SimpleMapView] Map is ready!');
          console.log('[SimpleMapView] Region:', region);
          console.log('[SimpleMapView] Points count:', points.length);
          
          // Force animate to region on map ready
          if (mapRef.current) {
            console.log('[SimpleMapView] Animating to region...');
            mapRef.current.animateToRegion(region, 1000);
          }
        }}
      >
        {/* Debug Marker - Always visible */}
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
          title="Center Point"
          description="Map Center"
          pinColor="blue"
        />
        
        {/* Markers */}
        {points.map((point, index) => {
          const lat = Number(point.latitude);
          const lng = Number(point.longitude);
          
          // Check for overlapping markers
          const hasOverlap = points.some((p, i) => 
            i < index && 
            Math.abs(p.latitude - point.latitude) < 0.0001 && 
            Math.abs(p.longitude - point.longitude) < 0.0001
          );
          
          // Add offset if markers overlap
          let offsetLat = lat;
          let offsetLng = lng;
          if (hasOverlap) {
            // Offset based on marker type
            if (point.type === 'delivery') {
              offsetLat = lat + 0.0005; // Move delivery marker slightly north
              offsetLng = lng + 0.0005; // Move delivery marker slightly east
            }
          }
          
          console.log(`[SimpleMapView] Rendering marker ${index}:`, {
            lat,
            lng,
            type: point.type,
            hasOverlap,
            offsetLat: offsetLat !== lat ? offsetLat : 'no offset',
            offsetLng: offsetLng !== lng ? offsetLng : 'no offset',
          });
          
          // Skip invalid coordinates
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.warn(`[SimpleMapView] Skipping marker ${index} - invalid coordinates`);
            return null;
          }
          
          return (
            <Marker
              key={`marker-${index}`}
              identifier={`marker-${index}`}
              coordinate={{
                latitude: offsetLat,
                longitude: offsetLng,
              }}
              title={point.type === 'pickup' ? 'Pickup' : 'Delivery'}
              description={`${point.type === 'pickup' ? 'Pickup' : 'Delivery'} location`}
              pinColor={point.type === 'pickup' ? 'red' : 'green'}
              tracksViewChanges={false}
            />
          );
        })}

        {/* Route line */}
        {points.length > 1 && (
          <Polyline
            coordinates={points.map(p => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor="#FF6B00"
            strokeWidth={3}
          />
        )}
      </MapView>
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
});

export default SimpleMapView;