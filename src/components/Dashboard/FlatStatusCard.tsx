import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatusCardProps } from '../../types/dashboard.types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const FlatStatusCard: React.FC<StatusCardProps> = ({
  isOnline,
  onToggleOnline,
}) => {
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  if (isOnline) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.onlineCard]}>
          <View style={styles.onlineHeader}>
            <View style={styles.onlineIconContainer}>
              <Ionicons 
                name="radio" 
                size={24} 
                color="#FFFFFF" 
              />
              <View style={styles.pulseRing} />
            </View>
            
            <View style={styles.onlineContent}>
              <Text style={styles.onlineTitle}>You are Online</Text>
              <Text style={styles.onlineSubtitle}>Ready to receive new orders</Text>
              <View style={styles.onlineInfoRow}>
                <View style={styles.onlineInfoItem}>
                  <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.onlineInfoText}>Since {currentTime}</Text>
                </View>
                <View style={styles.onlineInfoDivider} />
                <View style={styles.onlineInfoItem}>
                  <Ionicons name="location-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.onlineInfoText}>Location active</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={onToggleOnline}
              style={styles.onlineToggleButton}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Offline Design
  return (
    <View style={styles.container}>
      <View style={[styles.card, styles.offlineCard]}>
        <View style={styles.offlineHeader}>
          <View style={styles.offlineIconContainer}>
            <Ionicons 
              name="moon" 
              size={24} 
              color={flatColors.accent.indigo} 
            />
          </View>
          
          <View style={styles.offlineContent}>
            <Text style={styles.offlineTitle}>You're taking a break</Text>
            <Text style={styles.offlineSubtitle}>
              You won't receive new orders while offline
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.goOnlineButton}
            onPress={onToggleOnline}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    ...premiumShadows.medium,
  },
  card: {
    borderRadius: 24,
  },
  
  // Online Styles
  onlineCard: {
    backgroundColor: flatColors.status.online.primary,
    padding: 16,
  },
  onlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineIconContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    ...premiumShadows.soft,
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.8,
  },
  onlineContent: {
    flex: 1,
  },
  onlineTitle: {
    ...premiumTypography.headline.medium,
    color: '#FFFFFF',
    marginBottom: 2,
    fontWeight: '700',
  },
  onlineSubtitle: {
    ...premiumTypography.caption.large,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    lineHeight: 18,
  },
  onlineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineInfoDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  onlineInfoText: {
    ...premiumTypography.caption.small,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  onlineToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...premiumShadows.soft,
  },
  
  // Offline Styles
  offlineCard: {
    backgroundColor: flatColors.backgrounds.primary,
    padding: 16,
    borderWidth: 2,
    borderColor: flatColors.neutral[100],
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...premiumShadows.soft,
  },
  offlineContent: {
    flex: 1,
  },
  offlineTitle: {
    ...premiumTypography.headline.medium,
    color: flatColors.neutral[800],
    marginBottom: 2,
    fontWeight: '700',
  },
  offlineSubtitle: {
    ...premiumTypography.caption.large,
    color: flatColors.neutral[600],
    lineHeight: 18,
  },
  goOnlineButton: {
    backgroundColor: flatColors.accent.indigo,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...premiumShadows.soft,
  },
});