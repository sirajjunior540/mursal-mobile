import { StyleSheet } from 'react-native';
import { Design } from '../../constants/designSystem';

export const headerStyles = StyleSheet.create({
  // Legacy styles (kept for backward compatibility)
  header: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Design.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerGradient: {
    height: 80,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerPattern: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
  },
  patternCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    padding: 20,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Design.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: `${Design.colors.primary}20`,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Design.colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    fontWeight: '500',
  },
  orderNumber: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Design.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // Modern Header Styles
  modernHeader: {
    marginBottom: 8,
    overflow: 'visible',
  },
  modernGradient: {
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    minHeight: 180,
    overflow: 'hidden',
  },
  modernPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modernShape1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -30,
  },
  modernShape2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20,
    left: -20,
  },
  modernShape3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: 40,
    left: 60,
  },
  modernCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  modernIconWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  modernIconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: -16,
    left: -16,
  },
  modernIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  modernTitleContainer: {
    alignItems: 'center',
  },
  modernTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernSubtitleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modernInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  modernInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modernOrderNumber: {
    marginTop: 4,
  },
  modernOrderNumberText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modernStatusSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  waveContainer: {
    height: 20,
    overflow: 'hidden',
    marginTop: -1,
  },
  wave: {
    height: 40,
    backgroundColor: Design.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  modernStatusBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  batchTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  batchTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export const getStatusColors = (status?: string): { bg: string; text: string; icon: string } => {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'assigned':
      return { bg: '#FFF3E0', text: '#FF6F00', icon: 'clock-outline' };
    case 'accepted':
    case 'confirmed':
      return { bg: '#E8F5E9', text: '#2E7D32', icon: 'check-circle-outline' };
    case 'picked_up':
      return { bg: '#E3F2FD', text: '#1565C0', icon: 'package-variant' };
    case 'in_transit':
      return { bg: '#F3E5F5', text: '#6A1B9A', icon: 'truck-delivery' };
    case 'delivered':
      return { bg: '#E8F5E9', text: '#1B5E20', icon: 'check-all' };
    default:
      return { bg: '#F5F5F5', text: '#616161', icon: 'help-circle-outline' };
  }
};