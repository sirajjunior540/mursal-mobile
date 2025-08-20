import { StyleSheet } from 'react-native';
import { Design } from '../../constants/designSystem';

export const dashboardStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: Design.colors.backgroundSecondary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: Design.spacing[4],
  },
  
  // Collapsible card styles
  collapsibleCard: {
    backgroundColor: Design.colors.background,
    borderRadius: Design.borderRadius.lg,
    marginHorizontal: Design.spacing[4],
    marginBottom: Design.spacing[4],
    ...Design.shadows.medium,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collapsibleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsibleHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  collapsibleContent: {
    paddingHorizontal: Design.spacing[4],
    paddingBottom: Design.spacing[4],
  },
  collapseArrow: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    padding: 4,
  },
  
  // Section header styles
  sectionTitle: {
    ...Design.typography.headline,
    color: Design.colors.textPrimary,
    marginBottom: 2,
  },
  summaryText: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
  },
  headerTextContainer: {
    flex: 1,
  },
  
  // Button styles
  refreshButton: {
    padding: Design.spacing[2],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Design.spacing[3],
    marginTop: Design.spacing[3],
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
  },
  viewAllButtonText: {
    ...Design.typography.button,
    color: Design.colors.primary,
    marginRight: Design.spacing[2],
  },
  
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: Design.spacing[8],
  },
  emptyStateText: {
    ...Design.typography.body,
    color: Design.colors.textPrimary,
    marginTop: Design.spacing[3],
  },
  emptyStateSubtext: {
    ...Design.typography.caption,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[1],
    textAlign: 'center',
  },
});