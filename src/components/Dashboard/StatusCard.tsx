import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatusCardProps } from '../../types/dashboard.types';
import { Design } from '../../constants/designSystem';
import { dashboardColors } from '../../design/dashboard/colors';

export const StatusCard: React.FC<StatusCardProps> = ({
  isOnline,
  onToggleOnline,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.statusHeader}>
        <View style={styles.statusInfo}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isOnline ? dashboardColors.online.indicator : dashboardColors.offline.indicator }
          ]} />
          <View>
            <Text style={styles.statusTitle}>
              {isOnline ? 'You are Online' : 'You are Offline'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isOnline 
                ? 'Ready to receive new orders' 
                : 'Go online to start receiving orders'
              }
            </Text>
          </View>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggleOnline}
          trackColor={{ 
            false: Design.colors.gray300, 
            true: dashboardColors.online.indicator 
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={Design.colors.gray300}
        />
      </View>

      <View style={styles.statusDetails}>
        <View style={styles.detailRow}>
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={Design.colors.textSecondary} 
          />
          <Text style={styles.detailText}>
            {isOnline ? 'Online since ' : 'Offline since '}
            {new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </Text>
        </View>
        {isOnline && (
          <View style={styles.detailRow}>
            <Ionicons 
              name="location-outline" 
              size={16} 
              color={Design.colors.textSecondary} 
            />
            <Text style={styles.detailText}>
              Location services active
            </Text>
          </View>
        )}
      </View>

      {!isOnline && (
        <TouchableOpacity 
          style={styles.goOnlineButton}
          onPress={onToggleOnline}
        >
          <Text style={styles.goOnlineButtonText}>Go Online</Text>
          <Ionicons name="power" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[5],
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    ...Design.shadows.medium,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[4],
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Design.spacing[3],
  },
  statusTitle: {
    ...Design.typography.h3,
    color: Design.colors.textPrimary,
    marginBottom: 2,
  },
  statusSubtitle: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  statusDetails: {
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
    paddingTop: Design.spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[2],
  },
  detailText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginLeft: Design.spacing[2],
  },
  goOnlineButton: {
    backgroundColor: dashboardColors.online.indicator,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.md,
    marginTop: Design.spacing[4],
    gap: Design.spacing[2],
  },
  goOnlineButtonText: {
    ...Design.typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});