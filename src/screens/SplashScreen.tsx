import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Design } from '../constants/designSystem';
import AppLogo from '../components/AppLogo';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateEntrance = (): void => {
      // Start shimmer animation
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();

      // Main entrance sequence
      Animated.sequence([
        // 1. Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // 2. Scale up logo with bounce
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        // 3. Show title
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // 4. Show subtitle and start progress
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      ]).start(() => {
        // Hold for a moment then exit
        setTimeout(() => {
          shimmerAnimation.stop();
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(titleOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(subtitleOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onAnimationComplete();
          });
        }, 1000);
      });
    };

    // Start animation after brief delay
    setTimeout(animateEntrance, 100);
  }, [fadeAnim, logoScale, titleOpacity, subtitleOpacity, progressAnim, shimmerAnim, onAnimationComplete]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
        {/* Background Decoration */}
        <View style={styles.backgroundDecoration}>
          <Animated.View
            style={[
              styles.decorativeCircle1,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.decorativeCircle2,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          />
        </View>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Premium Logo Background */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoBackground}>
              {/* Shimmer Effect */}
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    transform: [{ translateX: shimmerTranslateX }],
                  },
                ]}
              />
              <AppLogo size="xlarge" color={Design.colors.primary} showText={false} />
            </View>
            
            {/* App Name with Elegant Typography */}
            <Animated.Text
              style={[
                styles.appName,
                {
                  opacity: titleOpacity,
                },
              ]}
            >
              MURSAL
            </Animated.Text>
            
            <Animated.Text
              style={[
                styles.tagline,
                {
                  opacity: subtitleOpacity,
                },
              ]}
            >
              Driver Excellence
            </Animated.Text>
          </View>
        </Animated.View>

        {/* Premium Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: subtitleOpacity,
            },
          ]}
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth,
                  },
                ]}
              />
            </View>
            <View style={styles.progressDots}>
              <LoadingDot delay={0} />
              <LoadingDot delay={200} />
              <LoadingDot delay={400} />
            </View>
          </View>
          <Text style={styles.loadingText}>Initializing your dashboard...</Text>
        </Animated.View>

        {/* Subtle Brand Elements */}
        <Animated.View
          style={[
            styles.brandElements,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.brandDot} />
          <View style={styles.brandDot} />
          <View style={styles.brandDot} />
        </Animated.View>
      </LinearGradient>
    </>
  );
};

interface LoadingDotProps {
  delay: number;
}

const LoadingDot: React.FC<LoadingDotProps> = ({ delay }) => {
  const dotOpacity = useRef(new Animated.Value(0.3)).current;
  const dotScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animate = (): void => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dotScale, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    setTimeout(animate, delay);
  }, [dotOpacity, dotScale, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: dotOpacity,
          transform: [{ scale: dotScale }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  // Background Decoration
  backgroundDecoration: {
    position: 'absolute',
    width: width * 2,
    height: height * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -width * 0.3,
    left: -width * 0.3,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -width * 0.3,
    right: -width * 0.3,
  },

  // Logo Section
  logoContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoBackground: {
    width: 180,
    height: 180,
    borderRadius: Design.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Design.spacing[8],
    ...Design.shadows.xlarge,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderRadius: Design.borderRadius.full,
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: Design.colors.textInverse,
    letterSpacing: 12,
    marginBottom: Design.spacing[3],
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    fontFamily: 'System',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: Design.spacing[4],
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontWeight: '300',
    fontFamily: 'System',
  },

  // Loading Section
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
    zIndex: 2,
    width: width * 0.8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Design.spacing[6],
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Design.borderRadius.base,
    marginBottom: Design.spacing[4],
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Design.colors.textInverse,
    borderRadius: Design.borderRadius.base,
    ...Design.shadows.small,
  },
  progressDots: {
    flexDirection: 'row',
    gap: Design.spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    textAlign: 'center',
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'System',
  },

  // Brand Elements
  brandElements: {
    position: 'absolute',
    bottom: Design.spacing[8],
    flexDirection: 'row',
    gap: Design.spacing[2],
    zIndex: 1,
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});