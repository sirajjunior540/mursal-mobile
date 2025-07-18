import React from 'react';
import { View, StyleSheet } from 'react-native';
import { flatColors } from '../../design/dashboard/flatColors';
import AppLogo from '../AppLogo';

interface FlatSplashLogoProps {
  size?: 'large' | 'xlarge';
}

export const FlatSplashLogo: React.FC<FlatSplashLogoProps> = ({
  size = 'xlarge'
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoBackground}>
        <AppLogo 
          size={size}
          color={flatColors.accent.blue}
          showText={false}
          variant="minimal"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: flatColors.cards.blue.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: flatColors.neutral[200],
    shadowColor: flatColors.neutral[800],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
});