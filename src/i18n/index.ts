import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (language: string) => void) => {
    try {
      // Check if user has saved a language preference
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      if (savedLanguage) {
        return callback(savedLanguage);
      }

      // Fall back to device locale
      const bestLanguage = RNLocalize.findBestLanguageTag(['en', 'ar', 'es', 'fr']);
      callback(bestLanguage?.languageTag || 'en');
    } catch (error) {
      console.log('Error reading language from AsyncStorage', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('userLanguage', language);
    } catch (error) {
      console.log('Error saving language to AsyncStorage', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    debug: __DEV__,
    
    interpolation: {
      escapeValue: false, // React Native doesn't need XSS protection
    },
    
    compatibilityJSON: 'v3', // Use v3 format to support pluralization
    
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;