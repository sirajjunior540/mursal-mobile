import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
      <View style={styles.glow} />
      <LinearGradient
        colors={[flatColors.brand.light, '#FFE2B8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoBackground}
      >
        <View style={styles.logoInset}>
          <AppLogo
            size={size}
            color={flatColors.brand.primary}
            showText={false}
            variant="minimal"
          />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245, 166, 35, 0.18)',
    transform: [{ scale: 1.05 }],
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: flatColors.brand.border,
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoInset: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: flatColors.backgrounds.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
});
