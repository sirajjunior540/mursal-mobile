import { StyleSheet } from 'react-native';
import { flatColors } from '../dashboard/flatColors';
import { premiumTypography } from '../dashboard/premiumTypography';
import { premiumShadows } from '../dashboard/premiumShadows';

export const flatModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.primary,
  },
  modalContent: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.primary,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: flatColors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.accent.blue,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
});