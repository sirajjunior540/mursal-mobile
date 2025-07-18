import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
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
      // Animate progress bar
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 1) {
            clearInterval(progressInterval);
            return 1;
          }
          return prev + 0.02;
        });
      }, 50);

      // Main animation sequence
      Animated.sequence([
        // 1. Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // 2. Show logo with scale
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // 3. Show text
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // 4. Show loading indicator
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Wait for progress to complete
        setTimeout(() => {
          onAnimationComplete();
        }, 800);
      });

      return () => clearInterval(progressInterval);
    };

    const timeoutId = setTimeout(animateEntrance, 100);
    return () => clearTimeout(timeoutId);
  }, [fadeAnim, logoScale, logoOpacity, textOpacity, indicatorOpacity, onAnimationComplete]);

  return (
    <>
      <StatusBar
        backgroundColor={flatColors.backgrounds.secondary}
        barStyle="dark-content"
        translucent={false}
      />
      <View style={styles.container}>
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
            <FlatSplashText />
          </Animated.View>
        </View>

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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.backgrounds.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: flatColors.backgrounds.secondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 40,
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
  },
});