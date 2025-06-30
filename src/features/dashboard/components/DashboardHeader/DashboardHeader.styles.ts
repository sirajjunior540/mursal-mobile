/**
 * DashboardHeader component styles
 */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../shared/styles/theme';

export const createDashboardHeaderStyles = (theme: Theme) => StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  greetingContainer: {
    flex: 1,
  },
  
  greeting: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  
  driverName: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    fontWeight: '700',
  },
  
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    gap: theme.spacing.sm,
    minHeight: theme.touchTargets.minSize,
    minWidth: 100,
    justifyContent: 'center',
  },
  
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  onlineToggleText: {
    ...theme.typography.labelMedium,
    fontWeight: '600',
  },
});