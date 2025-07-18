import { StyleSheet } from 'react-native';
import { Design } from '../../constants/designSystem';

export const batchOrdersStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  summaryPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryContent: {
    position: 'relative',
    zIndex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  pickupCard: {
    backgroundColor: Design.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Design.colors.primary + '20',
  },
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickupIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Design.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pickupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Design.colors.textPrimary,
  },
  pickupAddress: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    lineHeight: 20,
  },
  ordersSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.textPrimary,
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: Design.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  orderNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Design.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: Design.colors.primary,
  },
  orderContent: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: Design.colors.textPrimary,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Design.colors.success,
  },
  orderAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  orderAddressText: {
    flex: 1,
    fontSize: 13,
    color: Design.colors.textSecondary,
    lineHeight: 18,
  },
  orderIdText: {
    fontSize: 12,
    color: Design.colors.textTertiary,
  },
  instructionsCard: {
    backgroundColor: Design.colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: Design.colors.primary,
    lineHeight: 18,
  },
});