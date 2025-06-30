/**
 * OrderList component styles
 */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../shared/styles/theme';

export const createOrderListStyles = (theme: Theme) => StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  
  sectionTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.text,
    fontWeight: '700',
  },
  
  orderCount: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.gray100,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  
  emptyTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  
  emptySubtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  
  goOnlineButton: {
    paddingHorizontal: theme.spacing.xl,
    minWidth: 140,
  },
});