import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

interface TestMapViewProps {
  height?: number;
}

export const TestMapView: React.FC<TestMapViewProps> = ({ height = 300 }) => {
  // Hardcoded Dubai coordinates
  const dubaiRegion = {
    latitude: 25.2048,
    longitude: 55.2708,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const testPoints = [
    { latitude: 25.2048, longitude: 55.2708, title: 'Point 1' },
    { latitude: 25.2148, longitude: 55.2808, title: 'Point 2' },
  ];

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={dubaiRegion}
        region={dubaiRegion} // Force region
      >
        {testPoints.map((point, index) => (
          <Marker
            key={index}
            coordinate={point}
            title={point.title}
            pinColor={index === 0 ? 'red' : 'green'}
          />
        ))}
        
        <Polyline
          coordinates={testPoints}
          strokeColor="#000"
          strokeWidth={3}
        />
      </MapView>
      
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Test Map - Dubai</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 5,
  },
  overlayText: {
    color: 'white',
    fontSize: 12,
  },
});

export default TestMapView;