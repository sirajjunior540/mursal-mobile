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
        <AppLogo size="large" color={flatColors.accent.blue} />
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
    backgroundColor: flatColors.cards.blue.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: premiumTypography.headline.large.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.large.lineHeight,
    color: flatColors.neutral[800],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[600],
    textAlign: 'center',
  },
});