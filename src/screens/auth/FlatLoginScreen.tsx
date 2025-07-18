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
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={flatColors.backgrounds.secondary} 
        translucent={false}
      />
      <View style={styles.container}>
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
    backgroundColor: flatColors.backgrounds.secondary,
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
    backgroundColor: flatColors.neutral[300],
  },
  activeDot: {
    backgroundColor: flatColors.accent.blue,
    width: 20,
    borderRadius: 10,
  },
});

export default FlatLoginScreen;