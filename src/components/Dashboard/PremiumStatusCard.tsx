import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StatusCardProps } from '../../types/dashboard.types';
import { premiumColors } from '../../design/dashboard/premiumColors';
import { premiumShadows } from '../../design/dashboard/premiumShadows';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

export const PremiumStatusCard: React.FC<StatusCardProps> = ({
  isOnline,
  onToggleOnline,
}) => {
  const statusConfig = isOnline ? premiumColors.status.online : premiumColors.status.offline;
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={statusConfig.gradient}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.statusInfo}>
            <View style={styles.statusIconContainer}>
              <Ionicons 
                name={isOnline ? 'radio' : 'radio-outline'} 
                size={28} 
                color="#FFFFFF" 
              />
              <View style={[styles.pulseRing, isOnline && styles.pulseActive]} />
            </View>
            
            <View style={styles.textContainer}>
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
          
          <TouchableOpacity
            onPress={onToggleOnline}
            style={styles.toggleButton}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleTrack, isOnline ? styles.toggleActive : styles.toggleInactive]}>
              <View style={[styles.toggleThumb, isOnline ? styles.thumbActive : styles.thumbInactive]}>
                <Ionicons 
                  name={isOnline ? 'checkmark' : 'close'} 
                  size={16} 
                  color={isOnline ? statusConfig.primary : premiumColors.neutral[400]} 
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.footer}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.infoText}>
              {isOnline ? `Online since ${currentTime}` : `Offline since ${currentTime}`}
            </Text>
          </View>
          
          {isOnline && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.infoText}>Location services active</Text>
            </View>
          )}
          
          {!isOnline && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onToggleOnline}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="power" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Go Online</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
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
    padding: 20,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    position: 'relative',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0,
  },
  pulseActive: {
    opacity: 1,
  },
  textContainer: {
    flex: 1,
  },
  statusTitle: {
    ...premiumTypography.headline.medium,
    color: '#FFFFFF',
    marginBottom: 4,
    fontWeight: '700',
  },
  statusSubtitle: {
    ...premiumTypography.body.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  toggleButton: {
    alignItems: 'center',
  },
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  toggleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...premiumShadows.subtle,
  },
  thumbActive: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  thumbInactive: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  footer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    ...premiumTypography.caption.large,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  actionButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...premiumShadows.subtle,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtonText: {
    ...premiumTypography.button.medium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});