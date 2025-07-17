import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import { BlurView } from '@react-native-community/blur';
import { DashboardHeaderProps } from '../../types/dashboard.types';
import AppLogo from '../AppLogo';
import { Design } from '../../constants/designSystem';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const PremiumDashboardHeader: React.FC<DashboardHeaderProps> = ({
  driver,
  isOnline,
  onToggleOnline,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={premiumColors.gradients.premium}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {driver?.firstName?.charAt(0) || 'D'}
              </Text>
            </View>
            <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]} />
          </View>
          
          <View style={styles.greetingSection}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.greetingEmoji}>{getGreetingEmoji()}</Text>
            </View>
            <Text style={styles.driverName}>{driver?.firstName || 'Driver'}</Text>
            <Text style={styles.subtitle}>
              {isOnline ? 'Ready for deliveries' : 'Currently offline'}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <TouchableOpacity
            onPress={onToggleOnline}
            style={styles.statusToggle}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleTrack, isOnline ? styles.toggleActive : styles.toggleInactive]}>
              <View style={[styles.toggleThumb, isOnline ? styles.thumbActive : styles.thumbInactive]}>
                <Ionicons 
                  name={isOnline ? 'radio' : 'radio-outline'} 
                  size={16} 
                  color={isOnline ? '#FFFFFF' : premiumColors.neutral[400]} 
                />
              </View>
            </View>
            <Text style={[styles.toggleText, isOnline ? styles.toggleTextActive : styles.toggleTextInactive]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Subtle bottom divider */}
      <View style={styles.bottomDivider} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...premiumShadows.soft,
  },
  avatarText: {
    ...premiumTypography.display.small,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...premiumShadows.subtle,
  },
  online: {
    backgroundColor: premiumColors.status.online.primary,
  },
  offline: {
    backgroundColor: premiumColors.status.offline.primary,
  },
  greetingSection: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greeting: {
    ...premiumTypography.caption.large,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  greetingEmoji: {
    fontSize: 14,
  },
  driverName: {
    ...premiumTypography.headline.large,
    color: '#FFFFFF',
    marginBottom: 2,
    fontWeight: '700',
  },
  subtitle: {
    ...premiumTypography.caption.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statusToggle: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleTrack: {
    width: 60,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...premiumShadows.soft,
  },
  toggleActive: {
    backgroundColor: premiumColors.status.online.primary,
  },
  toggleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.subtle,
  },
  thumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  thumbInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignSelf: 'flex-start',
    marginLeft: 2,
  },
  toggleText: {
    ...premiumTypography.label.small,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  toggleTextInactive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bottomDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 24,
  },
});