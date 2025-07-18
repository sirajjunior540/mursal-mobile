import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Order } from '../../types';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface FlatSpecialHandlingBadgesProps {
  order: Order;
}

export const FlatSpecialHandlingBadges: React.FC<FlatSpecialHandlingBadgesProps> = ({ order }) => {
  const badges = [];

  // Cash on Delivery
  if (order.cash_on_delivery && order.cod_amount) {
    badges.push({
      key: 'cod',
      icon: 'cash',
      text: `COD ${order.currency || 'SAR'} ${order.cod_amount.toFixed(2)}`,
      backgroundColor: flatColors.cards.green.background,
      textColor: flatColors.accent.green,
    });
  }

  // Special Handling Types
  if (order.special_handling) {
    if (Array.isArray(order.special_handling)) {
      order.special_handling.forEach(type => {
        switch (type) {
          case 'fragile':
            badges.push({
              key: 'fragile',
              icon: 'warning',
              text: 'Fragile',
              backgroundColor: flatColors.cards.red.background,
              textColor: flatColors.accent.red,
            });
            break;
          case 'temperature_controlled':
            badges.push({
              key: 'temperature',
              icon: 'thermometer',
              text: 'Temperature Controlled',
              backgroundColor: flatColors.cards.blue.background,
              textColor: flatColors.accent.blue,
            });
            break;
          case 'hazardous':
            badges.push({
              key: 'hazardous',
              icon: 'nuclear',
              text: 'Hazardous',
              backgroundColor: flatColors.cards.red.background,
              textColor: flatColors.accent.red,
            });
            break;
          case 'liquid':
            badges.push({
              key: 'liquid',
              icon: 'water',
              text: 'Liquid',
              backgroundColor: flatColors.cards.blue.background,
              textColor: flatColors.accent.blue,
            });
            break;
          case 'perishable':
            badges.push({
              key: 'perishable',
              icon: 'leaf',
              text: 'Perishable',
              backgroundColor: flatColors.cards.green.background,
              textColor: flatColors.accent.green,
            });
            break;
        }
      });
    } else {
      // Handle string case
      badges.push({
        key: 'special',
        icon: 'star',
        text: 'Special Handling',
        backgroundColor: flatColors.cards.yellow.background,
        textColor: flatColors.accent.orange,
      });
    }
  }

  // Signature Required
  if (order.requires_signature) {
    badges.push({
      key: 'signature',
      icon: 'create',
      text: 'Signature Required',
      backgroundColor: flatColors.cards.purple.background,
      textColor: flatColors.accent.purple,
    });
  }

  // ID Verification Required
  if (order.requires_id_verification) {
    badges.push({
      key: 'id_verification',
      icon: 'card',
      text: 'ID Verification',
      backgroundColor: flatColors.cards.purple.background,
      textColor: flatColors.accent.purple,
    });
  }

  // Age Verification Required
  if (order.requires_age_verification) {
    badges.push({
      key: 'age_verification',
      icon: 'person',
      text: 'Age Verification (18+)',
      backgroundColor: flatColors.cards.orange.background,
      textColor: flatColors.accent.orange,
    });
  }

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Special Requirements</Text>
      <View style={styles.badgeContainer}>
        {badges.map((badge) => (
          <View 
            key={badge.key} 
            style={[styles.badge, { backgroundColor: badge.backgroundColor }]}
          >
            <Ionicons 
              name={badge.icon as any} 
              size={16} 
              color={badge.textColor} 
            />
            <Text style={[styles.badgeText, { color: badge.textColor }]}>
              {badge.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[200],
  },
  sectionTitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  badgeText: {
    fontSize: premiumTypography.caption.medium.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.caption.medium.lineHeight,
  },
});