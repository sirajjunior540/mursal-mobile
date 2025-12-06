import React from 'react';
import { View, Image, Text, StyleSheet, ImageStyle, ViewStyle, TextStyle } from 'react-native';
import { Design } from '../constants/designSystem';
import { flatColors } from '../design/dashboard/flatColors';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  showText?: boolean;
  style?: ViewStyle;
  variant?: 'default' | 'minimal' | 'text-only';
}

interface SizeConfig {
  containerSize: number;
  logoSize: number;
  fontSize: number;
  spacing: number;
}

const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'medium', 
  color, 
  showText = true,
  style,
  variant = 'default'
}) => {
  const sizeConfig: Record<string, SizeConfig> = {
    small: {
      containerSize: 40,
      logoSize: 32,
      fontSize: 14,
      spacing: Design.spacing[1]
    },
    medium: {
      containerSize: 60,
      logoSize: 48,
      fontSize: 16,
      spacing: Design.spacing[2]
    },
    large: {
      containerSize: 80,
      logoSize: 64,
      fontSize: 18,
      spacing: Design.spacing[3]
    },
    xlarge: {
      containerSize: 120,
      logoSize: 96,
      fontSize: 24,
      spacing: Design.spacing[4]
    }
  };

  const config = sizeConfig[size];
  const textColor = color || Design.colors.text;

  if (variant === 'text-only') {
    return (
      <View style={[styles.container, style]}>
        <Text style={[
          styles.logoText,
          {
            fontSize: config.fontSize,
            color: textColor,
          }
        ]}>
          MURSAL
        </Text>
      </View>
    );
  }

  const sharedRadius = variant === 'minimal' ? 12 : config.containerSize * 0.28;

  const logoContainerStyle: ViewStyle = {
    width: config.containerSize,
    height: config.containerSize,
    borderRadius: sharedRadius,
    backgroundColor: variant === 'minimal' ? flatColors.brand.light : flatColors.brand.lighter,
    borderWidth: variant === 'minimal' ? 1 : 1,
    borderColor: flatColors.brand.border,
  };

  const logoImageStyle: ImageStyle = {
    width: config.logoSize,
    height: config.logoSize,
    borderRadius: sharedRadius * 0.75,
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.logoContainer, logoContainerStyle]}>
        <Image
          source={require('../assets/images/app_logo.png')}
          style={logoImageStyle}
          resizeMode="contain"
        />
      </View>
      
      {showText && (
        <Text style={[
          styles.logoText,
          {
            fontSize: config.fontSize,
            color: textColor,
            marginTop: config.spacing
          }
        ]}>
          MURSAL
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Design.shadows.small,
  } as ViewStyle,
  logoText: {
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: 'System',
  } as TextStyle,
});

export default AppLogo;
