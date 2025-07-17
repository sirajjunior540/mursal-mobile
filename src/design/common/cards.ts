import { StyleSheet } from 'react-native';
import { Design } from '../../constants/designSystem';

export const commonCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Design.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Design.colors.border,
    marginVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Design.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Design.colors.textPrimary,
  },
});