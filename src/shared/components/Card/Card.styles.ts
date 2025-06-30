/**
 * Card component styles
 */
import { StyleSheet, Platform } from 'react-native';
import { Theme } from '../../styles/theme';

export const createCardStyles = (theme: Theme) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  
  // Variants
  elevated: {
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: theme.shadows.medium,
      android: { elevation: 4 },
    }),
  },
  filled: {
    backgroundColor: theme.colors.surfaceSecondary,
    ...Platform.select({
      ios: theme.shadows.small,
      android: { elevation: 1 },
    }),
  },
  outlined: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  
  // Padding variants
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: theme.spacing.sm,
  },
  paddingMedium: {
    padding: theme.spacing.md,
  },
  paddingLarge: {
    padding: theme.spacing.lg,
  },
  
  // States
  disabled: {
    opacity: 0.6,
  },
  
  // Content
  touchable: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});