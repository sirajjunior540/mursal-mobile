import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SpecialHandlingBadgesProps } from '../../types/orderDetails.types';
import { orderDetailsColors } from '../../design/orderDetails/colors';
import { commonBadgeStyles } from '../../design/common/badges';
import { getIoniconsName } from '../../utils/iconMapping';

export const SpecialHandlingBadges: React.FC<SpecialHandlingBadgesProps> = ({ order, compact = false }) => {
  if (!order) return null;

  const badges = [];

  // Special handling badges
  if (order.special_handling) {
    if (order.special_handling.fragile) {
      badges.push({
        key: 'fragile',
        ...orderDetailsColors.specialHandling.fragile,
        label: 'Fragile',
      });
    }
    if (order.special_handling.keep_upright) {
      badges.push({
        key: 'upright',
        ...orderDetailsColors.specialHandling.fragile,
        icon: 'arrow-up-bold-box',
        label: 'Keep Upright',
      });
    }
    if (order.special_handling.temperature_controlled) {
      badges.push({
        key: 'temperature',
        ...orderDetailsColors.specialHandling.temperature,
        label: 'Temperature Controlled',
      });
    }
    if (order.special_handling.hazardous) {
      badges.push({
        key: 'hazardous',
        ...orderDetailsColors.specialHandling.hazardous,
        label: 'Hazardous',
      });
    }
    if (order.special_handling.liquid) {
      badges.push({
        key: 'liquid',
        ...orderDetailsColors.specialHandling.liquid,
        label: 'Liquid',
      });
    }
    if (order.special_handling.perishable) {
      badges.push({
        key: 'perishable',
        ...orderDetailsColors.specialHandling.perishable,
        label: 'Perishable',
      });
    }
  }

  // Requirements badges
  if (order.cash_on_delivery && order.cod_amount) {
    badges.push({
      key: 'cod',
      ...orderDetailsColors.requirements.cod,
      label: `COD: ${order.currency || 'SAR'} ${order.cod_amount.toFixed(2)}`,
    });
  }
  if (order.requires_signature) {
    badges.push({
      key: 'signature',
      ...orderDetailsColors.requirements.signature,
      label: 'Signature Required',
    });
  }
  if (order.requires_id_verification) {
    badges.push({
      key: 'id',
      ...orderDetailsColors.requirements.idCheck,
      label: 'ID Check',
    });
  }

  if (badges.length === 0) return null;

  return (
    <View style={commonBadgeStyles.badgeContainer}>
      {badges.map((badge) => (
        <View
          key={badge.key}
          style={[
            commonBadgeStyles.badge,
            compact && commonBadgeStyles.compactBadge,
            { backgroundColor: badge.bg, borderColor: badge.text + '30' },
          ]}
        >
          <Ionicons
            name={getIoniconsName(badge.icon)}
            size={compact ? 14 : 16}
            color={badge.text}
          />
          <Text
            style={[
              commonBadgeStyles.badgeText,
              compact && commonBadgeStyles.compactBadgeText,
              { color: badge.text },
            ]}
            numberOfLines={1}
          >
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
};