/**
 * OrderCard component styles
 */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../shared/styles/theme';

export const createOrderCardStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  
  card: {
    padding: theme.spacing.md,
  },
  
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  
  orderInfo: {
    flex: 1,
  },
  
  orderNumber: {
    ...theme.typography.titleSmall,
    color: theme.colors.text,
    marginBottom: 2,
  },
  
  orderTime: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  
  customerInitial: {
    ...theme.typography.titleSmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  
  customerInfo: {
    flex: 1,
  },
  
  customerName: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  customerAddress: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  
  metricText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '500',
  },
  
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  
  declineButton: {
    flex: 1,
  },
  
  acceptButton: {
    flex: 2,
  },
  
  // Special handling styles
  specialHandlingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  
  specialHandlingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 3,
    backgroundColor: theme.colors.warning,
  },
  
  specialHandlingText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: '#fff',
    fontSize: 10,
  },
  
  fragileBadge: {
    backgroundColor: '#FF6B6B',
  },
  
  temperatureBadge: {
    backgroundColor: '#4ECDC4',
  },
  
  codBadge: {
    backgroundColor: '#00D2D3',
  },
  
  signatureBadge: {
    backgroundColor: '#8B78E6',
  },
  
  idBadge: {
    backgroundColor: '#5F3DC4',
  },
});