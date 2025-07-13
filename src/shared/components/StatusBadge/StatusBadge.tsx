/**
 * StatusBadge component for displaying order and delivery statuses
 */
import React, { memo } from 'react';
import { View, Text, ViewStyle, TextStyle, AccessibilityRole } from 'react-native';
import { theme } from '../../styles/theme';
import { BaseComponentProps } from '../../types';
import { createStatusBadgeStyles } from './StatusBadge.styles';

// Define valid status types
type StatusType = 
  | 'pending' 
  | 'assigned'
  | 'confirmed'
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'cancelled'
  | 'returned'
  | 'failed';

export interface StatusBadgeProps extends BaseComponentProps {
  status: StatusType | string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'subtle';
  style?: ViewStyle;
  textStyle?: TextStyle;
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = memo(({
  status,
  size = 'medium',
  variant = 'filled',
  style,
  textStyle,
  showIcon = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const styles = createStatusBadgeStyles(theme);

  const getStatusConfig = (statusValue: string) => {
    const statusMap: Record<string, { color: string; label: string; icon: string }> = {
      'pending': {
        color: theme.colors.statusPending,
        label: 'Pending',
        icon: '⏳',
      },
      'assigned': {
        color: theme.colors.statusAccepted,
        label: 'Assigned',
        icon: '📋',
      },
      'confirmed': {
        color: theme.colors.statusAccepted,
        label: 'Confirmed',
        icon: '✅',
      },
      'picked_up': {
        color: theme.colors.statusPickedUp,
        label: 'Picked Up',
        icon: '📦',
      },
      'in_transit': {
        color: theme.colors.statusPickedUp,
        label: 'In Transit',
        icon: '🚗',
      },
      'delivered': {
        color: theme.colors.statusDelivered,
        label: 'Delivered',
        icon: '✅',
      },
      'cancelled': {
        color: theme.colors.statusCancelled,
        label: 'Cancelled',
        icon: '❌',
      },
      'returned': {
        color: theme.colors.statusCancelled,
        label: 'Returned',
        icon: '🔄',
      },
      'failed': {
        color: theme.colors.statusCancelled,
        label: 'Failed',
        icon: '❌',
      },
    };

    return statusMap[statusValue] || {
      color: theme.colors.gray500,
      label: statusValue.charAt(0).toUpperCase() + statusValue.slice(1),
      icon: '📄',
    };
  };

  const statusConfig = getStatusConfig(status);

  const getContainerStyle = () => {
    const baseStyle = [
      styles.container,
      styles[size],
      styles[variant],
    ];

    if (variant === 'filled') {
      baseStyle.push({ backgroundColor: statusConfig.color });
    } else if (variant === 'outlined') {
      baseStyle.push({ 
        borderColor: statusConfig.color,
        backgroundColor: 'transparent',
      });
    } else if (variant === 'subtle') {
      baseStyle.push({ 
        backgroundColor: `${statusConfig.color}20`,
      });
    }

    return [...baseStyle, style];
  };

  const getTextStyle = () => {
    const baseStyle: TextStyle[] = [
      styles.text,
      styles[`${size}Text`] as TextStyle,
    ];

    const colorStyle: TextStyle = variant === 'filled' 
      ? { color: theme.colors.white }
      : { color: statusConfig.color };

    return [...baseStyle, colorStyle, textStyle].filter(Boolean);
  };

  const formatLabel = (label: string) => {
    return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View 
      style={getContainerStyle()}
      testID={testID}
      accessibilityLabel={accessibilityLabel || statusConfig.label}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole as AccessibilityRole}
    >
      {showIcon && (
        <Text style={[styles.icon, styles[`${size}Icon`]]}>
          {statusConfig.icon}
        </Text>
      )}
      <Text style={getTextStyle()}>
        {formatLabel(statusConfig.label)}
      </Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;