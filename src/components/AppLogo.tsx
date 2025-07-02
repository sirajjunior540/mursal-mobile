import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Design } from '../constants/designSystem';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  showText?: boolean;
  style?: any;
}

const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'medium', 
  color, 
  showText = true,
  style 
}) => {
  const sizeConfig = {
    small: {
      containerSize: 40,
      iconSize: 24,
      fontSize: Design.typography.bodySmall.fontSize,
      padding: Design.spacing[2]
    },
    medium: {
      containerSize: 60,
      iconSize: 36,
      fontSize: Design.typography.body.fontSize,
      padding: Design.spacing[3]
    },
    large: {
      containerSize: 80,
      iconSize: 48,
      fontSize: Design.typography.h5.fontSize,
      padding: Design.spacing[4]
    },
    xlarge: {
      containerSize: 120,
      iconSize: 72,
      fontSize: Design.typography.h3.fontSize,
      padding: Design.spacing[6]
    }
  };

  const config = sizeConfig[size];
  const logoColor = color || Design.colors.primary;

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.logoContainer,
        {
          width: config.containerSize,
          height: config.containerSize,
          borderRadius: config.containerSize / 2,
          padding: config.padding,
          backgroundColor: `${logoColor}15`,
          borderColor: `${logoColor}30`,
        }
      ]}>
        <Ionicons 
          name="car-sport" 
          size={config.iconSize} 
          color={logoColor} 
        />
      </View>
      
      {showText && (
        <Text style={[
          styles.logoText,
          {
            fontSize: config.fontSize,
            color: logoColor,
            marginTop: size === 'small' ? Design.spacing[1] : Design.spacing[2]
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
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Design.shadows.small,
  },
  logoText: {
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
});

export default AppLogo;