import React from 'react';
import { View, StyleSheet } from 'react-native';
import { flatColors } from '../../design/dashboard/flatColors';

interface FlatSplashIndicatorProps {
  progress?: number; // 0-1
}

export const FlatSplashIndicator: React.FC<FlatSplashIndicatorProps> = ({
  progress = 0.5
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.indicatorTrack}>
        <View style={[styles.indicatorFill, { width: `${progress * 100}%` }]} />
      </View>
      
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  indicatorTrack: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicatorFill: {
    height: '100%',
    backgroundColor: '#86c5ff',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  activeDot: {
    backgroundColor: '#86c5ff',
    width: 20,
    borderRadius: 10,
  },
});
