import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { flatColors } from '../../design/dashboard/flatColors';
import { FlatLoginHeader } from '../../components/Auth/FlatLoginHeader';
import { FlatLoginForm } from '../../components/Auth/FlatLoginForm';

const FlatLoginScreen: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Faster, subtler animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={flatColors.brand.light} 
        translucent={false}
      />
      <View style={styles.container}>
        <LinearGradient
          colors={[flatColors.brand.lighter, '#FFE7C7', '#FFF7ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.decorativeBlob, styles.blobTopLeft]} />
        <View style={[styles.decorativeBlob, styles.blobBottomRight]} />
        <View style={styles.ring} />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View
                style={[
                  styles.contentContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                {/* Header */}
                <FlatLoginHeader />
                
                {/* Form */}
                <FlatLoginForm
                  onLogin={login}
                  isLoading={isLoading}
                  error={error}
                />
                
                {/* Bottom Decoration */}
                <View style={styles.bottomDecoration}>
                  <View style={styles.decorativeDot} />
                  <View style={[styles.decorativeDot, styles.activeDot]} />
                  <View style={styles.decorativeDot} />
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: flatColors.brand.lighter,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  decorativeBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 166, 35, 0.10)',
  },
  blobTopLeft: {
    top: -40,
    left: -30,
  },
  blobBottomRight: {
    bottom: -50,
    right: -20,
  },
  ring: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 16,
    borderColor: 'rgba(245, 166, 35, 0.05)',
    top: '16%',
    right: '-16%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  bottomDecoration: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  decorativeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: flatColors.brand.border,
  },
  activeDot: {
    backgroundColor: flatColors.brand.secondary,
    width: 20,
    borderRadius: 10,
  },
});

export default FlatLoginScreen;
