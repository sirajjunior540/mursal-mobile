/**
 * Button component styles
 */
import { StyleSheet, Platform } from 'react-native';
import { Theme } from '../../styles/theme';

export const createButtonStyles = (theme: Theme) => StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: theme.shadows.small,
      android: { elevation: 2 },
    }),
  },
  
  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  destructive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  
  // Sizes
  small: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.touchTargets.minSize,
  },
  medium: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touchTargets.comfortable,
  },
  large: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    minHeight: theme.touchTargets.large,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
  
  // Text Styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondaryText: {
    color: theme.colors.white,
  },
  outlineText: {
    color: theme.colors.text,
  },
  ghostText: {
    color: theme.colors.primary,
  },
  destructiveText: {
    color: theme.colors.white,
  },
  
  // Text Sizes
  smallText: {
    ...theme.typography.labelMedium,
  },
  mediumText: {
    ...theme.typography.labelLarge,
  },
  largeText: {
    ...theme.typography.titleSmall,
  },
  
  disabledText: {
    opacity: 0.7,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
  },
});