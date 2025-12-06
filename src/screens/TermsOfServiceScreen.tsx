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

const TermsOfServiceScreen: React.FC = () => {
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
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
                Welcome to Murrsal Driver App. These Terms of Service govern your use of our
                delivery driver application and your relationship with Murrsal as a delivery
                partner. By accessing or using our services, you agree to be bound by these terms.
              </Text>
            </View>

            {/* Driver Eligibility */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Driver Eligibility</Text>
              <Text style={styles.paragraph}>
                To qualify as a delivery driver partner, you must:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Be at least 18 years of age</Text>
                <Text style={styles.listItem}>• Hold a valid driver's license</Text>
                <Text style={styles.listItem}>• Have a reliable vehicle with current registration and insurance</Text>
                <Text style={styles.listItem}>• Pass background checks as required by local regulations</Text>
                <Text style={styles.listItem}>• Provide accurate and complete registration information</Text>
                <Text style={styles.listItem}>• Maintain a professional appearance and conduct</Text>
              </View>
            </View>

            {/* Driver Responsibilities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Driver Responsibilities</Text>
              <Text style={styles.paragraph}>
                As a delivery partner, you are responsible for:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>
                  • Accepting delivery requests in a timely manner
                </Text>
                <Text style={styles.listItem}>
                  • Maintaining your vehicle in safe, working condition
                </Text>
                <Text style={styles.listItem}>
                  • Following all traffic laws and regulations
                </Text>
                <Text style={styles.listItem}>
                  • Handling deliveries with care and professionalism
                </Text>
                <Text style={styles.listItem}>
                  • Providing excellent customer service
                </Text>
                <Text style={styles.listItem}>
                  • Keeping your location services enabled during active deliveries
                </Text>
                <Text style={styles.listItem}>
                  • Updating delivery status accurately and promptly
                </Text>
                <Text style={styles.listItem}>
                  • Protecting customer privacy and order information
                </Text>
              </View>
            </View>

            {/* Payment Terms */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Payment Terms</Text>
              <Text style={styles.paragraph}>
                Delivery partner compensation is calculated based on:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Base delivery fee per order</Text>
                <Text style={styles.listItem}>• Distance traveled</Text>
                <Text style={styles.listItem}>• Time spent on delivery</Text>
                <Text style={styles.listItem}>• Customer tips (100% go to driver)</Text>
                <Text style={styles.listItem}>• Surge pricing during high-demand periods</Text>
                <Text style={styles.listItem}>• Performance bonuses and incentives</Text>
              </View>
              <Text style={styles.paragraph}>
                Payments are processed weekly to your designated bank account. You are responsible
                for all applicable taxes on earnings received through the platform.
              </Text>
            </View>

            {/* Account Management */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Account Suspension</Text>
              <Text style={styles.paragraph}>
                Your driver account may be suspended or terminated if you:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Violate these terms of service</Text>
                <Text style={styles.listItem}>• Receive consistent poor ratings or complaints</Text>
                <Text style={styles.listItem}>• Engage in fraudulent activity</Text>
                <Text style={styles.listItem}>• Fail to maintain required documentation</Text>
                <Text style={styles.listItem}>• Behave unprofessionally toward customers or staff</Text>
                <Text style={styles.listItem}>• Violate local laws or regulations</Text>
              </View>
              <Text style={styles.paragraph}>
                We reserve the right to suspend or terminate accounts at our discretion to
                maintain service quality and safety standards.
              </Text>
            </View>

            {/* Limitation of Liability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
              <Text style={styles.paragraph}>
                Murrsal provides the delivery platform and connects you with delivery opportunities.
                As an independent contractor, you assume all risks associated with delivery services,
                including but not limited to vehicle damage, accidents, or personal injury.
              </Text>
              <Text style={styles.paragraph}>
                To the maximum extent permitted by law, Murrsal shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages resulting from
                your use of the platform.
              </Text>
            </View>

            {/* Insurance Requirements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Insurance Requirements</Text>
              <Text style={styles.paragraph}>
                You must maintain appropriate insurance coverage including:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Valid vehicle insurance meeting local requirements</Text>
                <Text style={styles.listItem}>• Commercial auto insurance if required by your jurisdiction</Text>
                <Text style={styles.listItem}>• Liability coverage for delivery activities</Text>
              </View>
              <Text style={styles.paragraph}>
                You must provide proof of insurance upon request and immediately notify us of any
                changes or cancellations to your coverage.
              </Text>
            </View>

            {/* Changes to Terms */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
              <Text style={styles.paragraph}>
                We reserve the right to modify these terms at any time. Changes will be effective
                immediately upon posting to the app. Continued use of the platform after changes
                constitutes acceptance of the updated terms.
              </Text>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Contact Information</Text>
              <Text style={styles.paragraph}>
                For questions about these Terms of Service, please contact us at:
              </Text>
              <View style={styles.contactBox}>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>support@murrsal.com</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>+1 (555) 123-4567</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="globe-outline" size={18} color={flatColors.brand.secondary} />
                  <Text style={styles.contactText}>www.murrsal.com</Text>
                </View>
              </View>
            </View>

            {/* Acceptance */}
            <View style={styles.acceptanceBox}>
              <Ionicons name="checkmark-circle" size={24} color={flatColors.brand.secondary} />
              <Text style={styles.acceptanceText}>
                By using the Murrsal Driver App, you acknowledge that you have read, understood,
                and agree to be bound by these Terms of Service.
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

export default TermsOfServiceScreen;
