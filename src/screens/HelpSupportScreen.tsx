import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import { Design } from '../constants/designSystem';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface ContactOption {
  id: string;
  icon: string;
  label: string;
  value: string;
  type: 'phone' | 'email' | 'whatsapp';
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I accept an order?',
    answer: 'When a new order notification appears, tap the "Accept" button within the time limit. The order will be added to your active deliveries, and you can view pickup details on the main dashboard.',
  },
  {
    id: '2',
    question: 'How do I update my vehicle information?',
    answer: 'Go to Profile > Edit Profile Settings. Under the Vehicle Information section, you can update your vehicle type, license plate, color, and other details. Make sure to save your changes.',
  },
  {
    id: '3',
    question: 'How do I withdraw my earnings?',
    answer: 'Tap on your balance card in the Profile screen to view earnings details. From there, you can request a withdrawal. Funds are typically processed within 1-2 business days depending on your payment method.',
  },
  {
    id: '4',
    question: 'What if I can\'t complete a delivery?',
    answer: 'If you encounter issues during delivery, contact support immediately through the in-app support options. You can also use the "Report Issue" button on the active delivery screen to notify dispatch.',
  },
  {
    id: '5',
    question: 'How do I contact the customer?',
    answer: 'On the delivery details screen, you\'ll find the customer\'s contact information. Tap the phone icon to call or the message icon to send an SMS. Always maintain professional communication.',
  },
  {
    id: '6',
    question: 'What are batch deliveries?',
    answer: 'Batch deliveries allow you to pick up multiple orders from the same restaurant and deliver them efficiently. The app will optimize your route for the best delivery sequence.',
  },
  {
    id: '7',
    question: 'How does location tracking work?',
    answer: 'Enable location tracking in Settings to share your real-time location with customers and dispatch. This helps provide accurate delivery ETAs and improves the overall delivery experience.',
  },
  {
    id: '8',
    question: 'How do I report a problem with an order?',
    answer: 'Use the "Report Issue" option in the order details screen. Select the issue type (wrong items, damaged items, customer unavailable, etc.) and submit. Support will assist you promptly.',
  },
];

const CONTACT_OPTIONS: ContactOption[] = [
  {
    id: '1',
    icon: 'call',
    label: 'Call Support',
    value: '+1-800-MURRSAL',
    type: 'phone',
  },
  {
    id: '2',
    icon: 'mail',
    label: 'Email Support',
    value: 'driver-support@murrsal.com',
    type: 'email',
  },
  {
    id: '3',
    icon: 'logo-whatsapp',
    label: 'WhatsApp Support',
    value: '+1-800-MURRSAL',
    type: 'whatsapp',
  },
];

const FAQAccordionItem: React.FC<FAQItem & { isExpanded: boolean; onPress: () => void }> = ({
  question,
  answer,
  isExpanded,
  onPress,
}) => {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Design.colors.primary}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const ContactOptionItem: React.FC<ContactOption & { onPress: () => void }> = ({
  icon,
  label,
  value,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.contactOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contactIconContainer}>
        <Ionicons name={icon as any} size={24} color={Design.colors.primary} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Design.colors.gray400} />
    </TouchableOpacity>
  );
};

const HelpSupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const handleFAQPress = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactPress = async (option: ContactOption) => {
    try {
      switch (option.type) {
        case 'phone':
          const phoneNumber = option.value.replace(/[^0-9]/g, '');
          const phoneUrl = `tel:${phoneNumber}`;
          const canOpenPhone = await Linking.canOpenURL(phoneUrl);
          if (canOpenPhone) {
            await Linking.openURL(phoneUrl);
          } else {
            Alert.alert('Error', 'Unable to open phone dialer');
          }
          break;

        case 'email':
          const emailUrl = `mailto:${option.value}?subject=Driver Support Request`;
          const canOpenEmail = await Linking.canOpenURL(emailUrl);
          if (canOpenEmail) {
            await Linking.openURL(emailUrl);
          } else {
            Alert.alert('Error', 'Unable to open email client');
          }
          break;

        case 'whatsapp':
          const whatsappNumber = option.value.replace(/[^0-9]/g, '');
          const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=Hello, I need help with the driver app.`;
          const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
          if (canOpenWhatsApp) {
            await Linking.openURL(whatsappUrl);
          } else {
            Alert.alert(
              'WhatsApp Not Available',
              'Please install WhatsApp to use this feature or use another contact method.',
              [{ text: 'OK' }]
            );
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error opening contact option:', error);
      Alert.alert('Error', 'Unable to open contact option. Please try again.');
    }
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Report an Issue',
      'Choose how you would like to report your issue:',
      [
        {
          text: 'Email Support',
          onPress: () => {
            const emailOption = CONTACT_OPTIONS.find(opt => opt.type === 'email');
            if (emailOption) {
              handleContactPress(emailOption);
            }
          },
        },
        {
          text: 'Call Support',
          onPress: () => {
            const phoneOption = CONTACT_OPTIONS.find(opt => opt.type === 'phone');
            if (phoneOption) {
              handleContactPress(phoneOption);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Design.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="headset" size={24} color={Design.colors.primary} />
            <Text style={styles.sectionTitle}>Contact Support</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Get in touch with our support team. We're here to help!
          </Text>
          <View style={styles.contactOptionsContainer}>
            {CONTACT_OPTIONS.map((option) => (
              <ContactOptionItem
                key={option.id}
                {...option}
                onPress={() => handleContactPress(option)}
              />
            ))}
          </View>
        </View>

        {/* Report Issue Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.reportIssueButton}
            onPress={handleReportIssue}
            activeOpacity={0.7}
          >
            <View style={styles.reportIssueIcon}>
              <Ionicons name="alert-circle" size={24} color="#ffffff" />
            </View>
            <View style={styles.reportIssueContent}>
              <Text style={styles.reportIssueTitle}>Report an Issue</Text>
              <Text style={styles.reportIssueDescription}>
                Having a problem? Let us know and we'll help resolve it quickly.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={24} color={Design.colors.primary} />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Find quick answers to common questions
          </Text>
          <View style={styles.faqContainer}>
            {FAQ_DATA.map((faq) => (
              <FAQAccordionItem
                key={faq.id}
                {...faq}
                isExpanded={expandedFAQ === faq.id}
                onPress={() => handleFAQPress(faq.id)}
              />
            ))}
          </View>
        </View>

        {/* App Info Section */}
        <View style={[styles.section, styles.appInfoSection]}>
          <View style={styles.appInfoContainer}>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>App Version</Text>
              <Text style={styles.appInfoValue}>{DeviceInfo.getVersion()}</Text>
            </View>
            <View style={styles.appInfoDivider} />
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Build Number</Text>
              <Text style={styles.appInfoValue}>{DeviceInfo.getBuildNumber()}</Text>
            </View>
            <View style={styles.appInfoDivider} />
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Platform</Text>
              <Text style={styles.appInfoValue}>
                {Platform.OS === 'ios' ? 'iOS' : 'Android'} {DeviceInfo.getSystemVersion()}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Design.spacing[4],
    paddingVertical: Design.spacing[3],
    backgroundColor: Design.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  backButton: {
    padding: Design.spacing[2],
    marginLeft: -Design.spacing[2],
  },
  headerTitle: {
    ...Design.typography.headline,
    color: Design.colors.text,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Design.spacing[4],
    paddingTop: Design.spacing[4],
  },
  section: {
    marginBottom: Design.spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Design.spacing[2],
  },
  sectionTitle: {
    ...Design.typography.title3,
    color: Design.colors.text,
    fontWeight: '600',
    marginLeft: Design.spacing[2],
  },
  sectionDescription: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
    marginBottom: Design.spacing[4],
  },
  contactOptionsContainer: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.borderRadius.lg,
    overflow: 'hidden',
    ...Design.shadows.small,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Design.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Design.borderRadius.md,
    backgroundColor: `${Design.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...Design.typography.body,
    color: Design.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactValue: {
    ...Design.typography.bodySmall,
    color: Design.colors.textSecondary,
  },
  reportIssueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.primary,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    ...Design.shadows.medium,
  },
  reportIssueIcon: {
    width: 48,
    height: 48,
    borderRadius: Design.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Design.spacing[3],
  },
  reportIssueContent: {
    flex: 1,
  },
  reportIssueTitle: {
    ...Design.typography.body,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 2,
  },
  reportIssueDescription: {
    ...Design.typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  faqContainer: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.borderRadius.lg,
    overflow: 'hidden',
    ...Design.shadows.small,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.border,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Design.spacing[4],
  },
  faqQuestionText: {
    ...Design.typography.body,
    color: Design.colors.text,
    fontWeight: '600',
    flex: 1,
    marginRight: Design.spacing[2],
  },
  faqAnswer: {
    paddingHorizontal: Design.spacing[4],
    paddingBottom: Design.spacing[4],
  },
  faqAnswerText: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
    lineHeight: 22,
  },
  appInfoSection: {
    marginTop: Design.spacing[4],
  },
  appInfoContainer: {
    backgroundColor: Design.colors.surface,
    borderRadius: Design.borderRadius.lg,
    padding: Design.spacing[4],
    ...Design.shadows.small,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Design.spacing[3],
  },
  appInfoLabel: {
    ...Design.typography.body,
    color: Design.colors.textSecondary,
  },
  appInfoValue: {
    ...Design.typography.body,
    color: Design.colors.text,
    fontWeight: '600',
  },
  appInfoDivider: {
    height: 1,
    backgroundColor: Design.colors.border,
  },
  bottomPadding: {
    height: Design.spacing[8],
  },
});

export default HelpSupportScreen;
