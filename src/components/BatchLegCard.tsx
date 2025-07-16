import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BatchLeg, getBatchLegRequirements } from '../types/batchLeg';
import { Design } from '../constants/designSystem';

interface BatchLegCardProps {
  leg: BatchLeg;
  onAccept: (legId: string) => void;
  onViewDetails: (leg: BatchLeg) => void;
  onDecline: (legId: string) => void;
}

const BatchLegCard: React.FC<BatchLegCardProps> = ({
  leg,
  onAccept,
  onViewDetails,
  onDecline
}) => {
  const requirements = getBatchLegRequirements(leg);
  
  const handleAccept = () => {
    Alert.alert(
      'Accept Batch Leg',
      `This will assign all ${leg.stops_count} stops to you. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept All', 
          onPress: () => onAccept(leg.id),
          style: 'default'
        }
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Batch Leg',
      'You won\'t see this leg again. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Decline', 
          onPress: () => onDecline(leg.id),
          style: 'destructive'
        }
      ]
    );
  };

  const getVehicleIcon = () => {
    switch (leg.required_vehicle_type) {
      case 'bicycle': return 'bicycle-outline';
      case 'motorcycle': return 'bicycle-outline'; // No motorcycle icon
      case 'car': return 'car-outline';
      case 'van': return 'bus-outline';
      case 'truck': return 'bus-outline';
      default: return 'car-outline';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onViewDetails(leg)}
      activeOpacity={0.95}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.batchNumber}>{leg.batch.batch_number}</Text>
          <Text style={styles.legType}>
            {leg.leg_type === 'multi_stop' ? 'Multi-Stop Delivery' : 'Direct Delivery'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {leg.estimated_earnings && (
            <Text style={styles.earnings}>${leg.estimated_earnings.toFixed(2)}</Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={Design.colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={2}>
            {leg.origin_location.address}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="flag-outline" size={18} color={Design.colors.primary} />
            <Text style={styles.statText}>{leg.stops_count} stops</Text>
          </View>
          
          {leg.distance_km > 0 && (
            <View style={styles.stat}>
              <Ionicons name="navigate-outline" size={18} color={Design.colors.primary} />
              <Text style={styles.statText}>{leg.distance_km.toFixed(1)}km</Text>
            </View>
          )}
          
          {leg.estimated_duration > 0 && (
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={18} color={Design.colors.primary} />
              <Text style={styles.statText}>{leg.estimated_duration}min</Text>
            </View>
          )}

          {leg.required_vehicle_type && (
            <View style={styles.stat}>
              <Ionicons name={getVehicleIcon()} size={18} color={Design.colors.primary} />
              <Text style={styles.statText}>{leg.required_vehicle_type}</Text>
            </View>
          )}
        </View>

        {requirements.length > 0 && (
          <View style={styles.requirementsRow}>
            {requirements.map((req, index) => (
              <View key={index} style={styles.requirement}>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={Design.colors.white} />
            <Text style={styles.acceptButtonText}>Accept All ({leg.stops_count})</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
          >
            <Ionicons name="close-circle-outline" size={22} color={Design.colors.error} />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.spacing[3],
    marginBottom: Design.spacing[3],
    ...Design.shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Design.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: Design.spacing[2],
  },
  batchNumber: {
    ...Design.typography.body,
    fontWeight: '600',
    color: Design.colors.textPrimary,
  },
  legType: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  earnings: {
    ...Design.typography.h3,
    fontWeight: '700',
    color: Design.colors.success,
  },
  content: {
    padding: Design.spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Design.spacing[2],
  },
  infoText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginLeft: Design.spacing.xs,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Design.spacing.xs,
    marginBottom: Design.spacing[2],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Design.spacing[3],
    marginBottom: Design.spacing.xs,
  },
  statText: {
    ...Design.typography.caption,
    color: Design.colors.textPrimary,
    marginLeft: Design.spacing.xs,
  },
  requirementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Design.spacing[3],
  },
  requirement: {
    backgroundColor: `${Design.colors.warning}20`,
    paddingHorizontal: Design.spacing[2],
    paddingVertical: Design.spacing.xs / 2,
    borderRadius: Design.spacing.xs,
    marginRight: Design.spacing.xs,
    marginBottom: Design.spacing.xs,
  },
  requirementText: {
    ...Design.typography.caption,
    color: Design.colors.warning,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: Design.spacing[2],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[2],
    borderRadius: Design.spacing[2],
    gap: Design.spacing.xs,
  },
  acceptButton: {
    backgroundColor: Design.colors.primary,
  },
  acceptButtonText: {
    ...Design.typography.button,
    color: Design.colors.white,
  },
  declineButton: {
    backgroundColor: Design.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Design.colors.error,
  },
  declineButtonText: {
    ...Design.typography.button,
    color: Design.colors.error,
  },
});

export default BatchLegCard;