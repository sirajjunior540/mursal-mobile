import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import { I18nManager } from 'react-native';
import { ENV } from '../config/environment';

interface LanguageContextType {
  currentLanguage: string;
  isRTL: boolean;
  changeLanguage: (language: string) => Promise<void>;
  availableLanguages: string[];
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

const RTL_LANGUAGES = ['ar']; // Add more RTL languages as needed
const AVAILABLE_LANGUAGES = ['en', 'ar', 'es', 'fr'];

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [isLoading, setIsLoading] = useState(true);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    initializeLanguage();
  }, []);

  useEffect(() => {
    const rtl = RTL_LANGUAGES.includes(currentLanguage);
    setIsRTL(rtl);
    
    // Update RN layout direction if RTL status changed
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      // Note: In production, you might want to restart the app here
      // RNRestart.Restart(); // Requires react-native-restart
    }
  }, [currentLanguage]);

  const initializeLanguage = async () => {
    try {
      setIsLoading(true);
      
      // Check for saved language preference
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      
      if (savedLanguage && AVAILABLE_LANGUAGES.includes(savedLanguage)) {
        await changeLanguage(savedLanguage);
      } else {
        // Detect device language
        const deviceLanguages = RNLocalize.getLocales();
        const bestLanguage = RNLocalize.findBestLanguageTag(AVAILABLE_LANGUAGES);
        
        if (bestLanguage && AVAILABLE_LANGUAGES.includes(bestLanguage.languageTag)) {
          await changeLanguage(bestLanguage.languageTag);
        } else {
          // Fall back to English
          await changeLanguage('en');
        }
      }
    } catch (error) {
      console.error('Error initializing language:', error);
      // Fall back to English
      await changeLanguage('en');
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      if (!AVAILABLE_LANGUAGES.includes(language)) {
        throw new Error(`Language ${language} is not supported`);
      }

      // Change language in i18next
      await i18n.changeLanguage(language);
      
      // Update state
      setCurrentLanguage(language);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('userLanguage', language);
      
      // Send to backend if user is authenticated
      await syncLanguageWithBackend(language);
      
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    }
  };

  const syncLanguageWithBackend = async (language: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return; // User not authenticated, skip backend sync
      }

      const apiUrl = ENV.API_BASE_URL;
      
      const response = await fetch(`${apiUrl}/api/users/language/set/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      if (!response.ok) {
        // Failed to sync language with backend
      }
    } catch (error) {
      console.warn('Error syncing language with backend:', error);
      // Don't throw here as this is not critical
    }
  };

  const contextValue: LanguageContextType = {
    currentLanguage,
    isRTL,
    changeLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};