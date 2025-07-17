import React, { useEffect, useState } from 'react';
import { View, Platform, Text } from 'react-native';
import UniversalMapView from '../UniversalMapView';
import { Design } from '../../constants/designSystem';

// Singleton to track if a map is already mounted
let mapInstanceCount = 0;

interface SafeMapViewProps {
  markers: any[];
  route: any;
  style: any;
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
  initialRegion?: any;
}

export const SafeMapView: React.FC<SafeMapViewProps> = (props) => {
  const [canRenderMap, setCanRenderMap] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // On iOS, we need to ensure only one map instance at a time
    if (Platform.OS === 'ios') {
      // Small delay to prevent race conditions
      const timer = setTimeout(() => {
        if (mapInstanceCount === 0) {
          mapInstanceCount++;
          setCanRenderMap(true);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (canRenderMap) {
          mapInstanceCount--;
        }
      };
    } else {
      // Android doesn't have this issue
      setCanRenderMap(true);
    }
  }, []);

  const handleError = () => {
    setHasError(true);
  };

  if (!canRenderMap || hasError) {
    return (
      <View style={[props.style, { 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: Design.colors.backgroundSecondary,
        borderRadius: 12,
      }]}>
        <Text style={{ 
          color: Design.colors.textSecondary, 
          fontSize: 14,
          textAlign: 'center',
        }}>
          {hasError ? 'Map temporarily unavailable' : 'Loading map...'}
        </Text>
      </View>
    );
  }

  // Wrap in error boundary
  try {
    return <UniversalMapView {...props} onError={handleError} />;
  } catch (error) {
    console.log('Map error:', error);
    return (
      <View style={[props.style, { 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: Design.colors.backgroundSecondary,
        borderRadius: 12,
      }]}>
        <Text style={{ 
          color: Design.colors.textSecondary, 
          fontSize: 14,
          textAlign: 'center',
        }}>
          Map temporarily unavailable
        </Text>
      </View>
    );
  }
};