/**
 * Cash Collection Modal
 * Shows cash amount to collect before marking order as delivered
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatCurrency } from '../../utils/currency';
import { useTenant } from '../../contexts/TenantContext';
import Button from '../../shared/components/Button/Button';
import { theme } from '../../shared/styles/theme';
import styles from './CashCollectionModal.styles';

interface CashCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (collectedAmount: number, changeGiven: number) => void;
  order: {
    order_number: string;
    customer_name?: string;
    total: number;
    delivery_fee: number;
    cod_amount?: number;
    currency?: string;
  };
}

const CashCollectionModal: React.FC<CashCollectionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  order,
}) => {
  const { tenantSettings } = useTenant();
  const currency = order.currency || tenantSettings?.currency || 'SAR';
  
  // Calculate total to collect
  const totalToCollect = (order.cod_amount || order.total) + order.delivery_fee;
  
  const [collectedAmount, setCollectedAmount] = useState('');
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);
  const [confirming, setConfirming] = useState(false);
  
  const numericCollected = parseFloat(collectedAmount) || 0;
  const changeToGive = numericCollected > totalToCollect ? numericCollected - totalToCollect : 0;
  
  const handleQuickAmount = (amount: number) => {
    setCollectedAmount(amount.toString());
    setShowChangeCalculator(amount > totalToCollect);
  };
  
  const handleConfirm = async () => {
    if (numericCollected < totalToCollect) {
      Alert.alert(
        'Insufficient Amount',
        `The collected amount must be at least ${formatCurrency(totalToCollect, currency)}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setConfirming(true);
    
    // Show confirmation dialog
    Alert.alert(
      'Confirm Cash Collection',
      `Collected: ${formatCurrency(numericCollected, currency)}\n` +
      `Total Due: ${formatCurrency(totalToCollect, currency)}\n` +
      (changeToGive > 0 ? `Change: ${formatCurrency(changeToGive, currency)}` : 'No change'),
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setConfirming(false) },
        {
          text: 'Confirm',
          onPress: () => {
            onConfirm(numericCollected, changeToGive);
            setConfirming(false);
          },
        },
      ]
    );
  };
  
  // Quick amount suggestions based on total
  const quickAmounts = [
    totalToCollect,
    Math.ceil(totalToCollect / 10) * 10,
    Math.ceil(totalToCollect / 50) * 50,
    Math.ceil(totalToCollect / 100) * 100,
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="cash" size={24} color={theme.colors.success} />
                </View>
                <View>
                  <Text style={styles.title}>Collect Cash</Text>
                  <Text style={styles.subtitle}>Order #{order.order_number}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Amount to Collect */}
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Total Amount Due</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(totalToCollect, currency)}
              </Text>
              
              {/* Breakdown */}
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Order Amount</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(order.cod_amount || order.total, currency)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Delivery Fee</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(order.delivery_fee, currency)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountSection}>
              <Text style={styles.sectionTitle}>Quick Amounts</Text>
              <View style={styles.quickAmountGrid}>
                {quickAmounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.quickAmountButton,
                      numericCollected === amount && styles.quickAmountButtonSelected,
                    ]}
                    onPress={() => handleQuickAmount(amount)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      numericCollected === amount && styles.quickAmountTextSelected,
                    ]}>
                      {formatCurrency(amount, currency, { compact: true })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Manual Entry */}
            <View style={styles.manualEntrySection}>
              <Text style={styles.sectionTitle}>Collected Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>{currency}</Text>
                <TextInput
                  style={styles.input}
                  value={collectedAmount}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    setCollectedAmount(cleaned);
                    setShowChangeCalculator(parseFloat(cleaned) > totalToCollect);
                  }}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
            
            {/* Change Calculator */}
            {showChangeCalculator && changeToGive > 0 && (
              <View style={styles.changeSection}>
                <View style={styles.changeCard}>
                  <Ionicons name="calculator" size={20} color={theme.colors.info} />
                  <View style={styles.changeInfo}>
                    <Text style={styles.changeLabel}>Change to Give</Text>
                    <Text style={styles.changeAmount}>
                      {formatCurrency(changeToGive, currency)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Warning for insufficient amount */}
            {numericCollected > 0 && numericCollected < totalToCollect && (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.warningText}>
                  Insufficient amount. Need {formatCurrency(totalToCollect - numericCollected, currency)} more
                </Text>
              </View>
            )}
            
            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="outline"
                size="medium"
                onPress={onClose}
                style={styles.cancelButton}
              />
              <Button
                title="Confirm Collection"
                variant="primary"
                size="medium"
                onPress={handleConfirm}
                disabled={numericCollected < totalToCollect || confirming}
                loading={confirming}
                style={styles.confirmButton}
                icon={<Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CashCollectionModal;