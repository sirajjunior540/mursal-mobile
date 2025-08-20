import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', isRTL: false },
];

interface LanguageSwitcherProps {
  onLanguageChange?: (language: string) => void;
  style?: any;
  showLabel?: boolean;
  variant?: 'button' | 'text' | 'icon';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  onLanguageChange,
  style,
  showLabel = true,
  variant = 'button',
}) => {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === i18n.language) {
      setModalVisible(false);
      return;
    }

    setIsChanging(true);

    try {
      // Change language in i18next
      await i18n.changeLanguage(languageCode);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('userLanguage', languageCode);
      
      // Send to backend if user is authenticated
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // Call your API to save language preference
          // This would be your actual API endpoint
          const response = await fetch('YOUR_API_ENDPOINT/users/language/set/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ language: languageCode }),
          });
          
          if (!response.ok) {
            console.warn('Failed to save language preference to backend');
          }
        }
      } catch (apiError) {
        console.warn('Error saving language preference to backend:', apiError);
      }

      // Call callback if provided
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }

      setModalVisible(false);
      
      // Show success message
      Alert.alert(
        t('success.updated'),
        t('settings.languageChanged'),
        [{ text: t('common.ok') }]
      );
      
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        t('common.error'),
        t('errors.generic'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsChanging(false);
    }
  };

  const detectDeviceLanguage = async () => {
    try {
      const bestLanguage = RNLocalize.findBestLanguageTag(['en', 'ar', 'es', 'fr']);
      if (bestLanguage && bestLanguage.languageTag !== i18n.language) {
        Alert.alert(
          t('settings.detectLanguage'),
          t('settings.useDeviceLanguage', { language: bestLanguage.languageTag }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('common.yes'), 
              onPress: () => handleLanguageChange(bestLanguage.languageTag) 
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error detecting device language:', error);
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        item.code === i18n.language && styles.selectedLanguageItem,
      ]}
      onPress={() => handleLanguageChange(item.code)}
      disabled={isChanging}
    >
      <View style={styles.languageItemContent}>
        <View style={styles.languageInfo}>
          <Text
            style={[
              styles.languageName,
              item.code === i18n.language && styles.selectedLanguageName,
            ]}
          >
            {item.nativeName}
          </Text>
          <Text
            style={[
              styles.languageSubtitle,
              item.code === i18n.language && styles.selectedLanguageSubtitle,
            ]}
          >
            {item.name}
          </Text>
        </View>
        {item.code === i18n.language && (
          <Icon
            name="check"
            size={24}
            color="#007AFF"
            style={styles.checkIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderButton = () => {
    switch (variant) {
      case 'icon':
        return (
          <TouchableOpacity
            style={[styles.iconButton, style]}
            onPress={() => setModalVisible(true)}
            disabled={isChanging}
          >
            <Icon name="language" size={24} color="#007AFF" />
          </TouchableOpacity>
        );

      case 'text':
        return (
          <TouchableOpacity
            style={[styles.textButton, style]}
            onPress={() => setModalVisible(true)}
            disabled={isChanging}
          >
            <Text style={styles.textButtonLabel}>
              {currentLanguage.nativeName}
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity
            style={[styles.button, style]}
            onPress={() => setModalVisible(true)}
            disabled={isChanging}
          >
            <Icon name="language" size={20} color="#007AFF" />
            {showLabel && (
              <Text style={styles.buttonLabel}>
                {currentLanguage.nativeName}
              </Text>
            )}
            <Icon name="expand-more" size={20} color="#007AFF" />
          </TouchableOpacity>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <TouchableOpacity
              style={styles.detectButton}
              onPress={detectDeviceLanguage}
            >
              <Icon name="auto-fix-high" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {isChanging && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          )}

          <FlatList
            data={languages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.languageList}
            contentContainerStyle={styles.languageListContent}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              {t('settings.languageNote')}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonLabel: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textButtonLabel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    minWidth: 60,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  detectButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  languageList: {
    flex: 1,
  },
  languageListContent: {
    paddingVertical: 8,
  },
  languageItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedLanguageItem: {
    backgroundColor: '#E3F2FD',
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#007AFF',
  },
  languageSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  selectedLanguageSubtitle: {
    color: '#0056CB',
  },
  checkIcon: {
    marginLeft: 8,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LanguageSwitcher;