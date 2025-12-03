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
    color: '#e8f0ff',
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: 'System',
  },
  taglineContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tagline: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#86c5ff',
    letterSpacing: 1.5,
    textAlign: 'center',
    fontFamily: 'System',
  },
});
