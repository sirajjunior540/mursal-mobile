/**
 * Dashboard header component with online status toggle
 */
import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Haptics from 'react-native-haptic-feedback';
import { theme } from '../../../../shared/styles/theme';
import { Driver } from '../../../../shared/types';
import { createDashboardHeaderStyles } from './DashboardHeader.styles';

interface DashboardHeaderProps {
  driver: Driver | null;
  onlineStatus: boolean;
  onToggleOnlineStatus: (isOnline: boolean) => void;
  headerOpacity: Animated.Value;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = memo(({
  driver,
  onlineStatus,
  onToggleOnlineStatus,
  headerOpacity,
}) => {
  const styles = createDashboardHeaderStyles(theme);

  const handleToggleOnlineStatus = useCallback(() => {
    Haptics.trigger('impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onToggleOnlineStatus(!onlineStatus);
  }, [onlineStatus, onToggleOnlineStatus]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const getOnlineStatusColor = useCallback(() => {
    return onlineStatus ? theme.colors.success : theme.colors.gray400;
  }, [onlineStatus]);

  return (
    <Animated.View style={{ opacity: headerOpacity }}>
      <BlurView
        style={styles.header}
        blurType="light"
        blurAmount={40}
        reducedTransparencyFallbackColor={theme.colors.surface}
      >
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text 
              style={styles.greeting}
              accessibilityLabel={`${getGreeting()}, ${driver?.firstName || 'Driver'}`}
            >
              {getGreeting()}
            </Text>
            <Text 
              style={styles.driverName}
              accessibilityRole="header"
            >
              {driver?.firstName || 'Driver'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.onlineToggle,
              { backgroundColor: getOnlineStatusColor() }
            ]}
            onPress={handleToggleOnlineStatus}
            accessibilityRole="switch"
            accessibilityState={{ checked: onlineStatus }}
            accessibilityLabel={`Driver status: ${onlineStatus ? 'Online' : 'Offline'}`}
            accessibilityHint="Double tap to toggle your online status"
          >
            <View style={[
              styles.statusIndicator,
              { backgroundColor: onlineStatus ? theme.colors.white : theme.colors.gray600 }
            ]} />
            <Text style={[
              styles.onlineToggleText,
              { color: onlineStatus ? theme.colors.white : theme.colors.text }
            ]}>
              {onlineStatus ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;