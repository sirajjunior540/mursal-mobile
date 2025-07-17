import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { MapSectionProps } from '../../types/orderDetails.types';
import { mapProviderService } from '../../services/mapProviderService';
import { SafeMapView } from './SafeMapView';
import { commonCardStyles } from '../../design/common/cards';
import { Design } from '../../constants/designSystem';
import { mapSectionStyles } from '../../design/orderDetails/mapSectionStyles';

export const MapSection: React.FC<MapSectionProps> = ({ order }) => {
  const shouldShowMap = useMemo(() => mapProviderService.shouldShowMap(), []);
  
  if (!shouldShowMap || !order?.pickup_latitude || !order?.delivery_latitude) {
    return null;
  }

  const waypoints = useMemo(() => [
    {
      latitude: parseFloat(order.pickup_latitude),
      longitude: parseFloat(order.pickup_longitude!),
      title: 'Pickup Location',
      description: order.pickup_address,
    },
    {
      latitude: parseFloat(order.delivery_latitude),
      longitude: parseFloat(order.delivery_longitude!),
      title: 'Delivery Location',
      description: order.delivery_address,
    },
  ], [order.pickup_latitude, order.pickup_longitude, order.delivery_latitude, order.delivery_longitude, order.pickup_address, order.delivery_address]);

  return (
    <View style={[commonCardStyles.card, mapSectionStyles.container]}>
      <LinearGradient
        colors={['#EFF6FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={mapSectionStyles.headerGradient}
      />
      
      <View style={mapSectionStyles.header}>
        <View style={mapSectionStyles.headerIconContainer}>
          <Ionicons name="location-outline" size={20} color="#3B82F6" />
        </View>
        <Text style={mapSectionStyles.headerTitle}>Delivery Route</Text>
      </View>

      <View style={mapSectionStyles.mapContainer}>
        <SafeMapView
          markers={waypoints.map((point, index) => ({
            id: `waypoint-${index}`,
            coordinate: {
              latitude: point.latitude,
              longitude: point.longitude,
            },
            title: point.title,
            description: point.description,
            pinColor: index === 0 ? '#10B981' : '#EF4444',
          }))}
          route={{
            coordinates: waypoints,
            strokeColor: '#3B82F6',
            strokeWidth: 3,
          }}
          style={mapSectionStyles.map}
          zoomEnabled={true}
          scrollEnabled={true}
          initialRegion={{
            latitude: (waypoints[0].latitude + waypoints[1].latitude) / 2,
            longitude: (waypoints[0].longitude + waypoints[1].longitude) / 2,
            latitudeDelta: Math.abs(waypoints[0].latitude - waypoints[1].latitude) * 1.5,
            longitudeDelta: Math.abs(waypoints[0].longitude - waypoints[1].longitude) * 1.5,
          }}
        />
        
        <View style={mapSectionStyles.routeInfo}>
          <View style={mapSectionStyles.routePoint}>
            <View style={[mapSectionStyles.routeIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={mapSectionStyles.routeTextContainer}>
              <Text style={mapSectionStyles.routeLabel}>Pickup</Text>
              <Text style={mapSectionStyles.routeAddress} numberOfLines={1}>
                {order.pickup_address}
              </Text>
            </View>
          </View>
          
          <View style={mapSectionStyles.routeLine}>
            <View style={mapSectionStyles.routeDots}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={mapSectionStyles.routeDot} />
              ))}
            </View>
          </View>
          
          <View style={mapSectionStyles.routePoint}>
            <View style={[mapSectionStyles.routeIcon, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="location" size={16} color="#FFFFFF" />
            </View>
            <View style={mapSectionStyles.routeTextContainer}>
              <Text style={mapSectionStyles.routeLabel}>Delivery</Text>
              <Text style={mapSectionStyles.routeAddress} numberOfLines={1}>
                {order.delivery_address}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};