import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RouteHeaderProps } from '../../types/route.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

export const RouteHeader: React.FC<RouteHeaderProps> = ({
  route,
  driver,
  onRefresh,
  isRefreshing,
}) => {
  const completedStops = route?.points?.filter(p => p.order.status === 'delivered').length || 0;
  const totalStops = route?.points?.length || 0;

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Route Navigation</Text>
          {driver && (
            <Text style={styles.driverName}>
              {driver.firstName} {driver.lastName}
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonLoading]}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          <Ionicons 
            name={isRefreshing ? 'sync' : 'refresh'} 
            size={20} 
            color={flatColors.accent.blue} 
          />
        </TouchableOpacity>
      </View>

      {/* Route Stats */}
      {route && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalStops}</Text>
            <Text style={styles.statLabel}>Total Stops</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedStops}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {route.totalDistance ? (route.totalDistance / 1000).toFixed(1) : '0'}
            </Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {route.totalTime ? Math.round(route.totalTime / 60) : '0'}
            </Text>
            <Text style={styles.statLabel}>min</Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      {route && totalStops > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(completedStops / totalStops) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round((completedStops / totalStops) * 100)}% Complete
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...premiumShadows.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: premiumTypography.headline.large.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.large.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  driverName: {
    fontSize: premiumTypography.caption.large.fontSize,
    fontWeight: '500',
    lineHeight: premiumTypography.caption.large.lineHeight,
    color: flatColors.neutral[600],
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.soft,
  },
  refreshButtonLoading: {
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.neutral[100],
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.neutral[800],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: premiumTypography.caption.small.fontSize,
    fontWeight: '500',
    lineHeight: premiumTypography.caption.small.lineHeight,
    color: flatColors.neutral[500],
  },
  progressSection: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: flatColors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: flatColors.accent.green,
    borderRadius: 3,
  },
  progressText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.medium.lineHeight,
    color: flatColors.neutral[600],
  },
});