import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { designSystem } from '../constants/designSystem';
import TrackingDashboard from '../screens/tracking/TrackingDashboard';
import ShipmentDetails from '../screens/tracking/ShipmentDetails';

export type TrackingStackParamList = {
  TrackingDashboard: undefined;
  ShipmentDetails: { shipmentId: string };
};

const Stack = createStackNavigator<TrackingStackParamList>();

const TrackingStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: designSystem.colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        headerTitleStyle: {
          fontSize: designSystem.typography.sizes.large,
          fontWeight: '600',
          color: designSystem.colors.textPrimary,
        },
        headerTintColor: designSystem.colors.primary,
        headerBackTitleVisible: false,
        cardStyle: {
          backgroundColor: designSystem.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="TrackingDashboard"
        component={TrackingDashboard}
        options={{
          headerShown: false, // Custom header in component
        }}
      />
      <Stack.Screen
        name="ShipmentDetails"
        component={ShipmentDetails}
        options={{
          headerShown: false, // Custom header in component
        }}
      />
    </Stack.Navigator>
  );
};

export default TrackingStack;