import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import PolyLine from '@mapbox/polyline';
import Config from 'react-native-config';

const TestRouteMap = () => {
  const [coords, setCoords] = useState([]);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      // Test with Disneyland to Universal Studios (known working example)
      const origin = 'Disneyland';
      const destination = 'Universal Studios Hollywood';
      const apiKey = Config.GOOGLE_MAPS_ANDROID_SDK_KEY || 'AIzaSyCVUnaoUNVdNBvwjo6hOBEaziyZ-fpqOtM';
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(
        destination
      )}&key=${apiKey}`;

      console.log('Test Route URL:', url.replace(apiKey, 'HIDDEN_KEY'));

      try {
        const response = await fetch(url);
        const data = await response.json();

        console.log('Test Route Response:', {
          status: data.status,
          routes_count: data.routes ? data.routes.length : 0,
          has_polyline: data.routes?.[0]?.overview_polyline?.points ? 'YES' : 'NO'
        });

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const points = data.routes[0].overview_polyline.points;
          console.log('Polyline string preview:', points.substring(0, 50) + '...');
          
          const steps = PolyLine.decode(points);
          console.log('Decoded points count:', steps.length);

          const routeCoords = steps.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          }));

          setCoords(routeCoords);

          // Set initial region from start location
          const startLoc = data.routes[0].legs[0].start_location;
          setRegion({
            latitude: startLoc.lat,
            longitude: startLoc.lng,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          });

          console.log('Route set successfully!');
        } else {
          setError(`API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Failed to fetch directions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading test route...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No region data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>
        Test Route: {coords.length} coordinates loaded
      </Text>
      
      <MapView
        provider="google"
        style={styles.map}
        initialRegion={region}
        onMapReady={() => console.log('Test map ready')}
      >
        {coords.length > 0 && (
          <>
            <Marker 
              coordinate={coords[0]} 
              title="Start (Disneyland)"
              pinColor="orange"
            />
            <Marker 
              coordinate={coords[coords.length - 1]} 
              title="End (Universal Studios)"
              pinColor="green"
            />
            <Polyline
              coordinates={coords}
              strokeWidth={5}
              strokeColor="#1E90FF"
            />
          </>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  infoText: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    zIndex: 1000,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default TestRouteMap;