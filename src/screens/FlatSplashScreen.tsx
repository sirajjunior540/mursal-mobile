import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { flatColors } from '../design/dashboard/flatColors';
import { FlatSplashLogo } from '../components/Splash/FlatSplashLogo';
import { FlatSplashText } from '../components/Splash/FlatSplashText';
import { FlatSplashIndicator } from '../components/Splash/FlatSplashIndicator';

interface FlatSplashScreenProps {
  onAnimationComplete: () => void;
}

export const FlatSplashScreen: React.FC<FlatSplashScreenProps> = ({
  onAnimationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const animateEntrance = (): void => {
      // Animate progress bar (faster)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 1) {
            clearInterval(progressInterval);
            return 1;
          }
          return prev + 0.05; // Faster progress
        });
      }, 30);

      // Simplified and faster animation sequence
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reduced wait time
        setTimeout(() => {
          onAnimationComplete();
        }, 400);
      });

      return () => clearInterval(progressInterval);
    };

    const timeoutId = setTimeout(animateEntrance, 50);
    return () => clearTimeout(timeoutId);
  }, [fadeAnim, logoScale, logoOpacity, textOpacity, indicatorOpacity, onAnimationComplete]);

  return (
    <>
      <StatusBar
        backgroundColor={flatColors.brand.light}
        barStyle="dark-content"
        translucent={false}
      />
      <View style={styles.container}>
        <LinearGradient
          colors={[flatColors.brand.lighter, '#FFE7C7', '#FFF7ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <View style={[styles.accentBlob, styles.accentTopLeft]} />
          <View style={[styles.accentBlob, styles.accentBottomRight]} />
          <View style={styles.accentRing} />
        </Animated.View>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }) }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <FlatSplashLogo />
            </Animated.View>

            <Animated.View
              style={[
                styles.textContainer,
                {
                  opacity: textOpacity,
                },
              ]}
            >
              <FlatSplashText tagline="On-time, every mile" />
            </Animated.View>
          </Animated.View>

          {/* Loading Indicator */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: indicatorOpacity,
              },
            ]}
          >
            <FlatSplashIndicator progress={progress} />
          </Animated.View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.brand.lighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  accentBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245, 166, 35, 0.10)',
  },
  accentTopLeft: {
    top: -40,
    left: -60,
  },
  accentBottomRight: {
    bottom: -60,
    right: -40,
  },
  accentRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 18,
    borderColor: 'rgba(245, 166, 35, 0.05)',
    top: '26%',
    left: '14%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  card: {
    width: '92%',
    maxWidth: 380,
    paddingVertical: 36,
    paddingHorizontal: 28,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: flatColors.brand.border,
    alignItems: 'center',
    shadowColor: flatColors.brand.secondary,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    width: '100%',
  },
});
