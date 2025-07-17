import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DashboardHeaderProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const FlatDashboardHeader: React.FC<DashboardHeaderProps> = ({
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
                  color={isOnline ? flatColors.status.online.primary : flatColors.neutral[400]} 
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
    backgroundColor: flatColors.backgrounds.primary,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
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
    backgroundColor: flatColors.accent.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: flatColors.neutral[100],
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
    backgroundColor: flatColors.status.online.primary,
  },
  offline: {
    backgroundColor: flatColors.status.offline.primary,
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
    color: flatColors.neutral[600],
    marginRight: 4,
  },
  greetingEmoji: {
    fontSize: 14,
  },
  driverName: {
    ...premiumTypography.headline.large,
    color: flatColors.neutral[800],
    marginBottom: 2,
    fontWeight: '700',
  },
  subtitle: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[500],
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
    borderColor: flatColors.neutral[200],
    ...premiumShadows.soft,
  },
  toggleActive: {
    backgroundColor: flatColors.status.online.primary,
  },
  toggleInactive: {
    backgroundColor: flatColors.neutral[100],
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...premiumShadows.subtle,
  },
  thumbActive: {
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  thumbInactive: {
    alignSelf: 'flex-start',
    marginLeft: 2,
  },
  toggleText: {
    ...premiumTypography.label.small,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: flatColors.status.online.primary,
  },
  toggleTextInactive: {
    color: flatColors.neutral[500],
  },
  bottomDivider: {
    height: 1,
    backgroundColor: flatColors.neutral[100],
    marginHorizontal: 24,
  },
});