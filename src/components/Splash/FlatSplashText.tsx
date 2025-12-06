import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';

interface FlatSplashTextProps {
  appName?: string;
  tagline?: string;
}

export const FlatSplashText: React.FC<FlatSplashTextProps> = ({
  appName = "MURSAL",
  tagline = "Driver Excellence"
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>{appName}</Text>
      <View style={styles.taglineContainer}>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: flatColors.brand.text,
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: 'System',
  },
  taglineContainer: {
    backgroundColor: flatColors.brand.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: flatColors.brand.primary,
  },
  tagline: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.brand.secondary,
    letterSpacing: 1.5,
    textAlign: 'center',
    fontFamily: 'System',
  },
});
