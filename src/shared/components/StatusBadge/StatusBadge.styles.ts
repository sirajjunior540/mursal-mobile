/**
 * StatusBadge component styles
 */
import { StyleSheet } from 'react-native';
import { Theme } from '../../styles/theme';

export const createStatusBadgeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  // Variants
  filled: {
    // Background color set dynamically based on status
  },
  outlined: {
    borderWidth: 1,
    backgroundColor: 'transparent',
    // Border color set dynamically based on status
  },
  subtle: {
    borderWidth: 0,
    // Background color set dynamically with opacity
  },
  
  // Sizes
  small: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 20,
  },
  medium: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 24,
  },
  large: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 32,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  smallText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  mediumText: {
    ...theme.typography.labelSmall,
    fontWeight: '600',
  },
  largeText: {
    ...theme.typography.labelMedium,
    fontWeight: '600',
  },
  
  // Icon styles
  icon: {
    marginRight: theme.spacing.xs,
  },
  smallIcon: {
    fontSize: 10,
  },
  mediumIcon: {
    fontSize: 12,
  },
  largeIcon: {
    fontSize: 14,
  },
});