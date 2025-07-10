import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Design } from '../constants/designSystem';
import AppLogo from '../components/AppLogo';

const { height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateEntrance = (): void => {
      // Elegant entrance sequence - no complex animations
      Animated.sequence([
        // 1. Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // 2. Show logo with subtle scale
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        // 3. Show text
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hold for a moment then complete
        setTimeout(() => {
          onAnimationComplete();
        }, 1200);
      });
    };

    // Start animation after brief delay
    const timeoutId = setTimeout(animateEntrance, 200);
    
    return () => clearTimeout(timeoutId);
  }, [fadeAnim, logoScale, logoOpacity, textOpacity, onAnimationComplete]);

  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent={true}
      />
      <LinearGradient
        colors={[Design.colors.primary, Design.colors.primaryDark]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.backgroundOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        />

        {/* Main Content */}
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <AppLogo 
              size="xlarge" 
              color={Design.colors.textInverse}
              showText={false}
              variant="minimal"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
              },
            ]}
          >
            <Text style={styles.appName}>MURSAL</Text>
            <Text style={styles.tagline}>Driver Excellence</Text>
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: textOpacity,
            },
          ]}
        >
          <View style={styles.brandIndicator}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
          </View>
        </Animated.View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  } as ViewStyle,

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Design.spacing[8],
  } as ViewStyle,

  logoContainer: {
    marginBottom: Design.spacing[8],
  } as ViewStyle,

  textContainer: {
    alignItems: 'center',
  } as ViewStyle,

  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: Design.colors.textInverse,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: Design.spacing[3],
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'System',
  } as TextStyle,

  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '300',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'System',
  } as TextStyle,

  footer: {
    position: 'absolute',
    bottom: height * 0.1,
    alignItems: 'center',
  } as ViewStyle,

  brandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Design.spacing[2],
  } as ViewStyle,

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  } as ViewStyle,

  activeDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 20,
    borderRadius: 10,
  } as ViewStyle,
});