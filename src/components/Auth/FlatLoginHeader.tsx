import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import AppLogo from '../AppLogo';

interface FlatLoginHeaderProps {
  title?: string;
  subtitle?: string;
}

export const FlatLoginHeader: React.FC<FlatLoginHeaderProps> = ({
  title = "Welcome Back",
  subtitle = "Sign in to start delivering"
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <AppLogo size="large" color={flatColors.brand.primary} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  logoContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: flatColors.brand.light,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: premiumTypography.headline.large.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.large.lineHeight,
    color: flatColors.brand.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
    textAlign: 'center',
  },
});
