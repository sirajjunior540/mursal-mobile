import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { flatColors } from '../design/dashboard/flatColors';

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={flatColors.brand.light} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={flatColors.brand.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Last Updated */}
            <View style={styles.updateInfo}>
              <Ionicons name="calendar-outline" size={16} color={flatColors.neutral[600]} />
              <Text style={styles.updateText}>Last Updated: December 7, 2025</Text>
            </View>

            {/* Introduction */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Introduction</Text>
              <Text style={styles.paragraph}>
                At Murrsal, we are committed to protecting your privacy and ensuring the security
                of your personal information. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our delivery driver application.
              </Text>
              <Text style={styles.paragraph}>
                Please read this privacy policy carefully. By using the Murrsal Driver App, you
                agree to the collection and use of information in accordance with this policy.
              </Text>
            </View>

            {/* Information We Collect */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Information We Collect</Text>

              <Text style={styles.subsectionTitle}>2.1 Personal Information</Text>
              <Text style={styles.paragraph}>
                We collect personal information that you provide when registering as a driver:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Full name and contact details</Text>
                <Text style={styles.listItem}>• Email address and phone number</Text>
                <Text style={styles.listItem}>• Driver's license number and expiration date</Text>
                <Text style={styles.listItem}>• Vehicle registration and insurance information</Text>
                <Text style={styles.listItem}>• Banking information for payments</Text>
                <Text style={styles.listItem}>• Profile photo (optional)</Text>
                <Text style={styles.listItem}>• Background check results</Text>
              </View>

              <Text style={styles.subsectionTitle}>2.2 Location Data</Text>
              <Text style={styles.paragraph}>
                We collect precise location data when you use the app to:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Match you with nearby delivery requests</Text>
                <Text style={styles.listItem}>• Track delivery progress in real-time</Text>
                <Text style={styles.listItem}>• Calculate distances and delivery routes</Text>
                <Text style={styles.listItem}>• Optimize delivery efficiency</Text>
                <Text style={styles.listItem}>• Verify completed deliveries</Text>
              </View>

              <Text style={styles.subsectionTitle}>2.3 Usage Information</Text>
              <Text style={styles.paragraph}>
                We automatically collect information about your app usage:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Delivery history and statistics</Text>
                <Text style={styles.listItem}>• App interaction and navigation patterns</Text>
                <Text style={styles.listItem}>• Device information and operating system</Text>
                <Text style={styles.listItem}>• Performance metrics and crash reports</Text>
                <Text style={styles.listItem}>• Customer ratings and feedback</Text>
              </View>
            </View>

            {/* How We Use Your Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
              <Text style={styles.paragraph}>
                We use the collected information for the following purposes:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>
                  • To facilitate delivery services and connect you with customers
                </Text>
                <Text style={styles.listItem}>
                  • To process payments and maintain financial records
                </Text>
                <Text style={styles.listItem}>
                  • To verify your identity and conduct background checks
                </Text>
                <Text style={styles.listItem}>
                  • To provide customer support and respond to inquiries
                </Text>
                <Text style={styles.listItem}>
                  • To improve app functionality and user experience
                </Text>
                <Text style={styles.listItem}>
                  • To send notifications about delivery requests and updates
                </Text>
                <Text style={styles.listItem}>
                  • To analyze performance and optimize delivery routes
                </Text>
                <Text style={styles.listItem}>
                  • To ensure compliance with legal obligations
                </Text>
                <Text style={styles.listItem}>
                  • To detect and prevent fraudulent activity
                </Text>
              </View>
            </View>

            {/* Location Data Usage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Location Data Usage</Text>
              <View style={styles.infoBox}>
                <Ionicons name="location" size={20} color={flatColors.brand.secondary} />
                <Text style={styles.infoBoxText}>
                  Location tracking is essential for delivery services
                </Text>
              </View>
              <Text style={styles.paragraph}>
                We collect your location data when you are actively using the app or have accepted
                a delivery request. Location data is used to:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>
                  • Display your real-time location to customers during active deliveries
                </Text>
                <Text style={styles.listItem}>
                  • Calculate accurate delivery distances and estimated arrival times
                </Text>
                <Text style={styles.listItem}>
                  • Verify that deliveries are completed at the correct locations
                </Text>
                <Text style={styles.listItem}>
                  • Optimize delivery routes for efficiency
                </Text>
                <Text style={styles.listItem}>
                  • Generate heat maps and analytics for service improvement
                </Text>
              </View>
              <Text style={styles.paragraph}>
                You can control location permissions through your device settings. However,
                disabling location services will prevent you from accepting delivery requests.
              </Text>
            </View>

            {/* Data Sharing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Data Sharing and Disclosure</Text>
              <Text style={styles.paragraph}>
                We may share your information with the following parties:
              </Text>

              <Text style={styles.subsectionTitle}>5.1 With Customers</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Your first name and profile photo</Text>
                <Text style={styles.listItem}>• Your vehicle type and license plate</Text>
                <Text style={styles.listItem}>• Your real-time location during active deliveries</Text>
                <Text style={styles.listItem}>• Your contact information for delivery coordination</Text>
              </View>

              <Text style={styles.subsectionTitle}>5.2 With Service Providers</Text>
              <Text style={styles.paragraph}>
                We work with third-party service providers for:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Payment processing</Text>
                <Text style={styles.listItem}>• Background check services</Text>
                <Text style={styles.listItem}>• Cloud storage and hosting</Text>
                <Text style={styles.listItem}>• Analytics and performance monitoring</Text>
                <Text style={styles.listItem}>• Customer support tools</Text>
              </View>

              <Text style={styles.subsectionTitle}>5.3 For Legal Compliance</Text>
              <Text style={styles.paragraph}>
                We may disclose information when required to:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Comply with legal obligations or court orders</Text>
                <Text style={styles.listItem}>• Protect our rights and property</Text>
                <Text style={styles.listItem}>• Investigate fraud or security issues</Text>
                <Text style={styles.listItem}>• Respond to government requests</Text>
              </View>
            </View>

            {/* Data Security */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Data Security</Text>
              <View style={styles.securityBox}>
                <Ionicons name="shield-checkmark" size={24} color={flatColors.brand.secondary} />
                <View style={styles.securityTextContainer}>
                  <Text style={styles.securityTitle}>Your Security Matters</Text>
                  <Text style={styles.securityText}>
                    We implement industry-standard security measures to protect your data
                  </Text>
                </View>
              </View>
              <Text style={styles.paragraph}>
                We use appropriate technical and organizational security measures to protect your
                personal information, including:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Encryption of data in transit and at rest</Text>
                <Text style={styles.listItem}>• Secure authentication and access controls</Text>
                <Text style={styles.listItem}>• Regular security audits and testing</Text>
                <Text style={styles.listItem}>• Limited access to personal data on a need-to-know basis</Text>
                <Text style={styles.listItem}>• Secure data centers with physical security measures</Text>
              </View>
              <Text style={styles.paragraph}>
                However, no method of transmission over the internet is 100% secure. While we
                strive to protect your data, we cannot guarantee absolute security.
              </Text>
            </View>

            {/* Your Rights */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Your Privacy Rights</Text>
              <Text style={styles.paragraph}>
                You have the following rights regarding your personal information:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>
                  • Access: Request a copy of the personal data we hold about you
                </Text>
                <Text style={styles.listItem}>
                  • Correction: Request correction of inaccurate or incomplete data
                </Text>
                <Text style={styles.listItem}>
                  • Deletion: Request deletion of your personal data (subject to legal requirements)
                </Text>
                <Text style={styles.listItem}>
                  • Portability: Request transfer of your data to another service
                </Text>
                <Text style={styles.listItem}>
                  • Objection: Object to certain types of data processing
                </Text>
                <Text style={styles.listItem}>
                  • Restriction: Request limitation of how we use your data
                </Text>
              </View>
              <Text style={styles.paragraph}>
                To exercise these rights, please contact us using the information provided below.
              </Text>
            </View>

            {/* Data Retention */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Data Retention</Text>
              <Text style={styles.paragraph}>
                We retain your personal information for as long as necessary to:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Provide our delivery services</Text>
                <Text style={styles.listItem}>• Comply with legal and regulatory requirements</Text>
                <Text style={styles.listItem}>• Resolve disputes and enforce agreements</Text>
                <Text style={styles.listItem}>• Maintain business records and analytics</Text>
              </View>
              <Text style={styles.paragraph}>
                When data is no longer needed, we will securely delete or anonymize it.
              </Text>
            </View>

            {/* Children's Privacy */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
              <Text style={styles.paragraph}>
                Our services are not intended for individuals under 18 years of age. We do not
                knowingly collect personal information from children. If you believe we have
                collected information from a child, please contact us immediately.
              </Text>
            </View>

            {/* Changes to Policy */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
              <Text style={styles.paragraph}>
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new policy in the app and updating the "Last Updated" date.
                Continued use of the app after changes constitutes acceptance of the updated policy.
              </Text>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. Contact Us</Text>
              <Text style={styles.paragraph}>
                If you have questions about this Privacy Policy or how we handle your data,
                please contact our privacy team:
              </Text>
              <View style={styles.contactBox}>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>privacy@murrsal.com</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>+1 (555) 123-4567</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="globe-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>www.murrsal.com/privacy</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="location-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>Murrsal Inc., Privacy Department</Text>
                </View>
              </View>
            </View>

            {/* Acknowledgment */}
            <View style={styles.acceptanceBox}>
              <Ionicons name="shield-checkmark" size={24} color={flatColors.brand.secondary} />
              <Text style={styles.acceptanceText}>
                By using the Murrsal Driver App, you acknowledge that you have read and understood
                this Privacy Policy and consent to the collection, use, and sharing of your
                information as described.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: flatColors.brand.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.brand.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: flatColors.brand.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    margin: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    padding: 24,
    shadowColor: flatColors.brand.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.brand.border,
  },
  updateText: {
    marginLeft: 8,
    fontSize: 14,
    color: flatColors.neutral[700],
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.brand.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: flatColors.brand.text,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: flatColors.neutral[800],
    marginBottom: 12,
  },
  list: {
    marginTop: 8,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: flatColors.neutral[800],
    marginBottom: 8,
    paddingLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.brand.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  infoBoxText: {
    marginLeft: 12,
    fontSize: 14,
    color: flatColors.brand.text,
    fontWeight: '600',
    flex: 1,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: flatColors.cards.orange.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  securityTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: flatColors.brand.text,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 14,
    color: flatColors.neutral[700],
    lineHeight: 20,
  },
  contactBox: {
    backgroundColor: flatColors.brand.light,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 15,
    color: flatColors.brand.text,
    fontWeight: '500',
  },
  acceptanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: flatColors.cards.orange.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: flatColors.brand.border,
  },
  acceptanceText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 22,
    color: flatColors.brand.text,
    fontWeight: '500',
  },
});

export default PrivacyPolicyScreen;
