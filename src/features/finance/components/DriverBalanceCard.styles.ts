import { StyleSheet } from 'react-native';
import { theme } from '../../../shared/styles/theme';

export default StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  compactContainer: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.sm,
    borderRadius: 8,
    marginBottom: theme.spacing.md,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  warningAmount: {
    color: theme.colors.warning,
  },
  positiveAmount: {
    color: theme.colors.success,
  },
  negativeAmount: {
    color: theme.colors.error,
  },
  limitSection: {
    marginBottom: theme.spacing.lg,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  limitLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: 4,
  },
  warningProgress: {
    backgroundColor: theme.colors.warning,
  },
  errorProgress: {
    backgroundColor: theme.colors.error,
  },
  todaySummary: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  todayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  todayItem: {
    alignItems: 'center',
  },
  todayLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginVertical: 4,
  },
  todayAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  
  // Compact styles
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  compactInfo: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  compactAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.error + '10',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  blockedText: {
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: '500',
  },

  // Quick stats row for compact view
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});