import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { flatColors } from '../../design/dashboard/flatColors';
import { premiumTypography } from '../../design/dashboard/premiumTypography';
import { premiumShadows } from '../../design/dashboard/premiumShadows';

export type DeliveryScenario = 
  | 'handed_to_customer'
  | 'left_at_door' 
  | 'delivered_to_security'
  | 'delivered_to_neighbor'
  | 'delivered_to_reception'
  | 'other';

interface DeliveryScenarioModalProps {
  isVisible: boolean;
  onClose: () => void;
  onScenarioSelected: (scenario: DeliveryScenario, recipientName?: string, recipientRelation?: string, notes?: string) => void;
}

const scenarios = [
  {
    id: 'handed_to_customer',
    label: 'Handed to Customer',
    icon: 'person',
    color: flatColors.accent.green,
    requiresPhoto: false,
    requiresRecipientInfo: false,
  },
  {
    id: 'left_at_door',
    label: 'Left at Door',
    icon: 'home',
    color: flatColors.accent.blue,
    requiresPhoto: true,
    requiresRecipientInfo: false,
  },
  {
    id: 'delivered_to_security',
    label: 'Delivered to Security',
    icon: 'shield-checkmark',
    color: flatColors.accent.orange,
    requiresPhoto: true,
    requiresRecipientInfo: true,
  },
  {
    id: 'delivered_to_neighbor',
    label: 'Delivered to Neighbor',
    icon: 'people',
    color: flatColors.accent.purple,
    requiresPhoto: true,
    requiresRecipientInfo: true,
  },
  {
    id: 'delivered_to_reception',
    label: 'Delivered to Reception',
    icon: 'business',
    color: flatColors.accent.teal,
    requiresPhoto: true,
    requiresRecipientInfo: true,
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal',
    color: flatColors.neutral[600],
    requiresPhoto: true,
    requiresRecipientInfo: true,
  },
];

export const DeliveryScenarioModal: React.FC<DeliveryScenarioModalProps> = ({
  isVisible,
  onClose,
  onScenarioSelected,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<DeliveryScenario | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientRelation, setRecipientRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [showRecipientForm, setShowRecipientForm] = useState(false);

  const handleScenarioSelect = (scenario: typeof scenarios[0]) => {
    setSelectedScenario(scenario.id as DeliveryScenario);
    
    if (scenario.requiresRecipientInfo) {
      setShowRecipientForm(true);
    } else {
      onScenarioSelected(scenario.id as DeliveryScenario);
      resetModal();
    }
  };

  const handleConfirmRecipientInfo = () => {
    if (selectedScenario) {
      onScenarioSelected(
        selectedScenario,
        recipientName || undefined,
        recipientRelation || undefined,
        notes || undefined
      );
      resetModal();
    }
  };

  const resetModal = () => {
    setSelectedScenario(null);
    setRecipientName('');
    setRecipientRelation('');
    setNotes('');
    setShowRecipientForm(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={styles.modalContent}>
          <SafeAreaView edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={flatColors.accent.green} />
                </View>
                <Text style={styles.headerTitle}>Delivery Details</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={flatColors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {!showRecipientForm ? (
                <>
                  <Text style={styles.subtitle}>
                    How was the package delivered?
                  </Text>

                  <View style={styles.scenarioGrid}>
                    {scenarios.map((scenario) => (
                      <TouchableOpacity
                        key={scenario.id}
                        style={styles.scenarioCard}
                        onPress={() => handleScenarioSelect(scenario)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.scenarioIcon, { backgroundColor: `${scenario.color}15` }]}>
                          <Ionicons name={scenario.icon} size={28} color={scenario.color} />
                        </View>
                        <Text style={styles.scenarioLabel}>{scenario.label}</Text>
                        {scenario.requiresPhoto && (
                          <View style={styles.photoIndicator}>
                            <Ionicons name="camera" size={14} color={flatColors.neutral[500]} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.backButtonContainer}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => setShowRecipientForm(false)}
                    >
                      <Ionicons name="arrow-back" size={20} color={flatColors.neutral[700]} />
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formTitle}>Recipient Information</Text>
                  <Text style={styles.formSubtitle}>
                    Please provide details about who received the package
                  </Text>

                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Recipient Name *</Text>
                      <TextInput
                        style={styles.input}
                        value={recipientName}
                        onChangeText={setRecipientName}
                        placeholder="Enter recipient name"
                        placeholderTextColor={flatColors.neutral[400]}
                        autoFocus
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Relationship/Role</Text>
                      <TextInput
                        style={styles.input}
                        value={recipientRelation}
                        onChangeText={setRecipientRelation}
                        placeholder="e.g., Security Guard, Neighbor, Receptionist"
                        placeholderTextColor={flatColors.neutral[400]}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Additional Notes</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any additional delivery details..."
                        placeholderTextColor={flatColors.neutral[400]}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.confirmButton,
                        !recipientName.trim() && styles.confirmButtonDisabled
                      ]}
                      onPress={handleConfirmRecipientInfo}
                      disabled={!recipientName.trim()}
                    >
                      <Text style={styles.confirmButtonText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: flatColors.backgrounds.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...premiumShadows.large,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: flatColors.neutral[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: flatColors.cards.green.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: premiumTypography.headline.medium.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.medium.lineHeight,
    color: flatColors.neutral[800],
  },
  closeButton: {
    padding: 8,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: premiumTypography.body.fontSize,
    fontWeight: premiumTypography.body.fontWeight,
    lineHeight: premiumTypography.body.lineHeight,
    color: flatColors.neutral[600],
    marginBottom: 24,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  scenarioCard: {
    width: '47%',
    backgroundColor: flatColors.backgrounds.secondary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    position: 'relative',
  },
  scenarioIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scenarioLabel: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[800],
    textAlign: 'center',
  },
  photoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: flatColors.backgrounds.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
  },
  backButtonContainer: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: premiumTypography.callout.fontWeight,
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
  },
  formTitle: {
    fontSize: premiumTypography.headline.small.fontSize,
    fontWeight: '700',
    lineHeight: premiumTypography.headline.small.lineHeight,
    color: flatColors.neutral[800],
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: premiumTypography.body.fontSize,
    fontWeight: premiumTypography.body.fontWeight,
    lineHeight: premiumTypography.body.lineHeight,
    color: flatColors.neutral[600],
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: flatColors.neutral[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: flatColors.backgrounds.secondary,
    borderWidth: 1,
    borderColor: flatColors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: premiumTypography.body.fontSize,
    color: flatColors.neutral[800],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flatColors.accent.green,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: flatColors.neutral[300],
  },
  confirmButtonText: {
    fontSize: premiumTypography.callout.fontSize,
    fontWeight: '600',
    lineHeight: premiumTypography.callout.lineHeight,
    color: '#FFFFFF',
  },
});

export default DeliveryScenarioModal;