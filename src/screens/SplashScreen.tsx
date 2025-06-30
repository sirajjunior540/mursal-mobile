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

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animateEntrance = () => {
      // Start pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Logo entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Title sequence
        Animated.sequence([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Hold for display then exit
          setTimeout(() => {
            pulseAnimation.stop();
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(titleOpacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(subtitleOpacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onAnimationComplete();
            });
          }, 1800);
        });
      });
    };

    // Start animation after brief delay
    setTimeout(animateEntrance, 200);
  }, [fadeAnim, logoScale, titleOpacity, subtitleOpacity, pulseAnim, onAnimationComplete]);

  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent={true}
      />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: logoScale },
                { scale: pulseAnim }
              ],
            },
          ]}
        >
          {/* App Logo */}
          <View style={styles.logoBackground}>
            <View style={styles.logo}>
              <Ionicons name="car" size={60} color="#667eea" />
            </View>
          </View>
          
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
            Driver App
          </Animated.Text>
        </Animated.View>

        {/* Loading indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: subtitleOpacity,
            },
          ]}
        >
          <View style={styles.loadingDots}>
            <LoadingDot delay={0} />
            <LoadingDot delay={200} />
            <LoadingDot delay={400} />
          </View>
          <Text style={styles.loadingText}>Initializing...</Text>
        </Animated.View>

        {/* Decorative elements */}
        <Animated.View
          style={[
            styles.decorativeCircle1,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle2,
            {
              opacity: fadeAnim,
            },
          ]}
        />
      </LinearGradient>
    </>
  );
};

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const dotOpacity = useRef(new Animated.Value(0.4)).current;
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dotScale, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 1,
            duration: 600,
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
  logoContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 6,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
    zIndex: 2,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: height * 0.1,
    right: width * 0.1,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: height * 0.3,
    left: width * 0.05,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 1,
  },
});