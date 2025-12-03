import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { FlatSplashLogo } from '../components/Splash/FlatSplashLogo';
import { flatColors } from '../design/dashboard/flatColors';
import { premiumTypography } from '../design/dashboard/premiumTypography';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const animateEntrance = (): void => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 45,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setTimeout(() => {
          onAnimationComplete();
        }, 300);
      });
    };

    const timeoutId = setTimeout(animateEntrance, 200);
    
    return () => clearTimeout(timeoutId);
  }, [fadeAnim, slideAnim, progressAnim, onAnimationComplete]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['20%', '100%'],
  });

  return (
    <>
      <StatusBar
        backgroundColor={flatColors.backgrounds.secondary}
        barStyle="dark-content"
        translucent={false}
      />
      <View style={styles.container}>
        <LinearGradient
          colors={[
            flatColors.primary[50],
            flatColors.backgrounds.secondary,
            flatColors.backgrounds.primary,
          ]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobBottom]} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <FlatSplashLogo size="xlarge" />

          <Text style={styles.appName}>MURSAL DRIVER</Text>
          <Text style={styles.tagline}>
            Calm flat styling from the home screen, right from launch.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="cellular" size={16} color={flatColors.accent.blue} />
              <Text style={styles.metaText}>Live sync</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="shield-checkmark" size={16} color={flatColors.accent.green} />
              <Text style={styles.metaText}>Secure</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <View style={styles.progressDots}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
            </View>
          </View>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: flatColors.backgrounds.secondary,
  },
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: flatColors.primary[100],
    opacity: 0.6,
  },
  blobTop: {
    top: -60,
    right: -30,
  },
  blobBottom: {
    bottom: -70,
    left: -40,
    backgroundColor: flatColors.accent.blue,
    opacity: 0.12,
  },
  content: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  appName: {
    ...premiumTypography.display.small,
    letterSpacing: 4,
    color: flatColors.neutral[800],
    textAlign: 'center',
    fontWeight: '800',
  },
  tagline: {
    ...premiumTypography.body.medium,
    color: flatColors.neutral[600],
    textAlign: 'center',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: flatColors.cards.blue.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  metaText: {
    ...premiumTypography.caption.medium,
    color: flatColors.neutral[700],
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
    width: 200,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: flatColors.neutral[100],
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: flatColors.accent.blue,
    borderRadius: 999,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: flatColors.neutral[300],
  },
  activeDot: {
    width: 20,
    borderRadius: 10,
    backgroundColor: flatColors.accent.blue,
  },
});
