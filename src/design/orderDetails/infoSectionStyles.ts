import { StyleSheet } from 'react-native';
import { Design } from '../../constants/designSystem';

export const orderDetailsStyles = StyleSheet.create({
  sectionCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Design.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border + '30',
  },
  highlightRow: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Design.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  highlightIconContainer: {
    backgroundColor: '#10B981' + '20',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Design.colors.textPrimary,
  },
  highlightValue: {
    color: '#10B981',
    fontWeight: '600',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Design.colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: Design.colors.textSecondary,
    lineHeight: 18,
  },
});