import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';
import { premiumShadows } from '../design/dashboard/premiumShadows';
import { Design } from '../constants/designSystem';
import type { OptimizedStop } from '../services/routeOptimizationService';

interface StopProgressCardProps {
  stop: OptimizedStop;
  stopNumber: number;
  totalStops: number;
  isActive?: boolean;
  isCompleted?: boolean;
  onNavigate?: () => void;
  onArrived?: () => void;
  onComplete?: () => void;
}

export const StopProgressCard: React.FC<StopProgressCardProps> = ({
  stop,
  stopNumber,
  totalStops,
  isActive = false,
  isCompleted = false,
  onNavigate,
  onArrived,
  onComplete,
}) => {
  const getActionButton = () => {
    if (isCompleted) {
      return (
        <View style={[styles.actionButton, styles.completedButton]}>
          <Ionicons name="checkmark-circle" size={20} color={flatColors.accent.green} />
          <Text style={styles.completedButtonText}>Completed</Text>
        </View>
      );
    }

    if (isActive) {
      return (
        <View style={styles.activeActions}>
          {onNavigate && (
            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton]}
              onPress={onNavigate}
            >
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          )}
          {onArrived && (
            <TouchableOpacity
              style={[styles.actionButton, styles.arrivedButton]}
              onPress={onArrived}
            >
              <Ionicons name="location" size={20} color="#FFFFFF" />
              <Text style={styles.arrivedButtonText}>Arrived</Text>
            </TouchableOpacity>
          )}
          {onComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={onComplete}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View
      style={[
        styles.container,
        isActive && styles.activeContainer,
        isCompleted && styles.completedContainer,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stopNumberContainer}>
          <View
            style={[
              styles.stopNumberBadge,
              isActive && styles.activeStopNumber,
              isCompleted && styles.completedStopNumber,
            ]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.stopNumberText}>{stopNumber}</Text>
            )}
          </View>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressText}>
              Stop {stopNumber} of {totalStops}
            </Text>
            {isActive && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.stopTypeIcon,
            stop.stopType === 'pickup' ? styles.pickupIcon : styles.deliveryIcon,
          ]}
        >
          <Ionicons
            name={stop.stopType === 'pickup' ? 'bag' : 'home'}
            size={24}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* Stop Type Label */}
      <Text style={styles.stopTypeLabel}>
        {stop.stopType === 'pickup' ? 'PICKUP' : 'DELIVERY'}
      </Text>

      {/* Address */}
      <View style={styles.addressContainer}>
        <Ionicons name="location" size={20} color={flatColors.accent.blue} />
        <Text style={styles.addressText} numberOfLines={2}>
          {stop.address}
        </Text>
      </View>

      {/* Contact Info */}
      <View style={styles.contactContainer}>
        <View style={styles.contactRow}>
          <Ionicons name="person" size={16} color={flatColors.neutral[600]} />
          <Text style={styles.contactText}>{stop.contactName}</Text>
        </View>
        {stop.contactPhone && (
          <View style={styles.contactRow}>
            <Ionicons name="call" size={16} color={flatColors.neutral[600]} />
            <Text style={styles.contactText}>{stop.contactPhone}</Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      {stop.instructions && (
        <View style={styles.instructionsContainer}>
          <Ionicons name="information-circle" size={16} color={flatColors.accent.purple} />
          <Text style={styles.instructionsText}>{stop.instructions}</Text>
        </View>
      )}

      {/* Distance and ETA */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Ionicons name="navigate" size={16} color={flatColors.neutral[600]} />
          <Text style={styles.metricText}>
            {stop.distanceFromPreviousKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Ionicons name="time" size={16} color={flatColors.neutral[600]} />
          <Text style={styles.metricText}>{stop.etaMinutes} min</Text>
        </View>
      </View>

      {/* Action Button */}
      {getActionButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: flatColors.backgrounds.primary,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    ...premiumShadows.small,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeContainer: {
    borderColor: flatColors.accent.blue,
    ...premiumShadows.medium,
  },
  completedContainer: {
    backgroundColor: flatColors.cards.green.background,
    borderColor: flatColors.cards.green.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Design.spacing[3],
  },
  stopNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stopNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  activeStopNumber: {
    backgroundColor: flatColors.accent.blue,
  },
  completedStopNumber: {
    backgroundColor: flatColors.accent.green,
  },
  stopNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.neutral[800],
  },
  progressTextContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.neutral[700],
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: flatColors.accent.blue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  stopTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupIcon: {
    backgroundColor: flatColors.accent.blue,
  },
  deliveryIcon: {
    backgroundColor: flatColors.accent.green,
  },
  stopTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: flatColors.neutral[600],
    textTransform: 'uppercase',
    marginBottom: Design.spacing[2],
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[3],
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing[2],
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: Design.borderRadius.md,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: flatColors.neutral[800],
    marginLeft: 8,
    lineHeight: 20,
  },
  contactContainer: {
    marginBottom: Design.spacing[3],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: flatColors.neutral[700],
    marginLeft: 8,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: flatColors.cards.purple.background,
    padding: Design.spacing[2],
    borderRadius: Design.borderRadius.sm,
    marginBottom: Design.spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: flatColors.accent.purple,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: flatColors.neutral[700],
    marginLeft: 8,
    lineHeight: 18,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[3],
    paddingVertical: Design.spacing[2],
    borderTopWidth: 1,
    borderTopColor: flatColors.neutral[200],
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: flatColors.neutral[200],
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
    color: flatColors.neutral[700],
    marginLeft: 6,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Design.borderRadius.md,
    gap: 6,
  },
  navigateButton: {
    backgroundColor: flatColors.accent.blue,
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  arrivedButton: {
    backgroundColor: flatColors.accent.orange,
  },
  arrivedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: flatColors.accent.green,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedButton: {
    backgroundColor: flatColors.cards.green.background,
    borderWidth: 1,
    borderColor: flatColors.cards.green.border,
  },
  completedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: flatColors.accent.green,
    marginLeft: 6,
  },
});
