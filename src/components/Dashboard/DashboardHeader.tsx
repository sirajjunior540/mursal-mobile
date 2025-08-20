import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DashboardHeaderProps } from '../../types/dashboard.types';
import AppLogo from '../AppLogo';
import { Design } from '../../constants/designSystem';
import { dashboardColors } from '../../design/dashboard/colors';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  driver,
  isOnline,
  onToggleOnline,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <AppLogo size="small" showText={false} style={styles.headerLogo} />
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.driverName}>{driver?.firstName || 'Driver'}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={onToggleOnline}
          style={[
            styles.onlineToggle,
            isOnline ? styles.onlineToggleActive : styles.onlineToggleInactive
          ]}
        >
          <View style={[
            styles.onlineIndicator,
            { backgroundColor: isOnline ? dashboardColors.online.indicator : dashboardColors.offline.indicator }
          ]} />
          <Text style={[
            styles.onlineToggleText,
            { color: isOnline ? dashboardColors.online.text : dashboardColors.offline.text }
          ]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Design.colors.background,
    paddingHorizontal: Design.spacing[5],
    paddingVertical: Design.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    marginRight: Design.spacing[3],
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    ...Design.typography.label,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[1],
  },
  driverName: {
    ...Design.typography.h3,
    color: Design.colors.text,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[2],
    borderRadius: Design.borderRadius.full,
  },
  onlineToggleActive: {
    backgroundColor: dashboardColors.online.background,
  },
  onlineToggleInactive: {
    backgroundColor: dashboardColors.offline.background,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Design.spacing[2],
  },
  onlineToggleText: {
    ...Design.typography.label,
    fontWeight: '600',
  },
});