/**
 * Handoff Details Screen
 * Shows handoff details and allows warehouse staff to verify and complete handoffs
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../../../shared/styles/theme';
import Card from '../../../shared/components/Card/Card';
import Button from '../../../shared/components/Button/Button';
import { warehouseAPI } from '../../../services/api/warehouseAPI';
import { formatOrderAmount } from '../../../utils/currency';
import { useTenant } from '../../../contexts/TenantContext';
import styles from './HandoffDetailsScreen.styles';

interface HandoffDetails {
  id: string;
  handoff_code: string;
  batch: {
    id: string;
    name: string;
    total_packages: number;
    total_value: number;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicle_type: string;
  };
  package_count: number;
  verified_count: number;
  status: string;
  created_at: string;
  notes?: string;
  packages: Array<{
    order_number: string;
    customer_name: string;
    delivery_address: string;
    special_handling?: string;
    cod_amount?: number;
    is_verified: boolean;
  }>;
}

const HandoffDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { handoffId, fromScanner } = route.params as { handoffId: string; fromScanner?: boolean };
  const { tenantSettings } = useTenant();
  const currency = tenantSettings?.currency || 'SAR';
  
  const [handoff, setHandoff] = useState<HandoffDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHandoffDetails();
  }, [handoffId]);

  const fetchHandoffDetails = async () => {
    try {
      setLoading(true);
      const response = await warehouseAPI.getHandoffDetails(handoffId);
      setHandoff(response.data);
      
      // Pre-select verified packages
      const verified = new Set(
        response.data.packages
          .filter((pkg: any) => pkg.is_verified)
          .map((pkg: any) => pkg.order_number)
      );
      setSelectedPackages(verified);
    } catch (error) {
      console.error('Error fetching handoff details:', error);
      Alert.alert('Error', 'Failed to load handoff details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const togglePackageSelection = (orderNumber: string) => {
    const newSelection = new Set(selectedPackages);
    if (newSelection.has(orderNumber)) {
      newSelection.delete(orderNumber);
    } else {
      newSelection.add(orderNumber);
    }
    setSelectedPackages(newSelection);
  };

  const handleVerifyHandoff = async () => {
    if (!handoff) return;
    
    if (selectedPackages.size !== handoff.package_count) {
      Alert.alert(
        'Incomplete Verification',
        `Please verify all ${handoff.package_count} packages before completing the handoff.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Complete Handoff',
      'Are you sure all packages have been verified and received?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setVerifying(true);
              await warehouseAPI.completeHandoff(handoffId, {
                verified_packages: Array.from(selectedPackages),
                notes: '',
              });
              
              Alert.alert(
                'Success',
                'Handoff completed successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('WarehouseHome' as never),
                  },
                ]
              );
            } catch (error) {
              console.error('Error completing handoff:', error);
              Alert.alert('Error', 'Failed to complete handoff');
            } finally {
              setVerifying(false);
            }
          },
        },
      ]
    );
  };

  const handleReportIssue = () => {
    navigation.navigate('ReportHandoffIssue' as never, { handoffId } as never);
  };

  if (loading || !handoff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading handoff details...</Text>
        </View>
      </View>
    );
  }

  const verificationProgress = (selectedPackages.size / handoff.package_count) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          variant="text"
          size="small"
          icon={<Ionicons name="arrow-back" size={24} />}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Handoff Details</Text>
        <Button
          variant="text"
          size="small"
          icon={<Ionicons name="alert-circle-outline" size={24} />}
          onPress={handleReportIssue}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Handoff Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.codeContainer}>
            <Ionicons name="qr-code" size={24} color={theme.colors.primary} />
            <Text style={styles.handoffCode}>{handoff.handoff_code}</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Batch</Text>
              <Text style={styles.infoValue}>{handoff.batch.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{handoff.driver.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>{handoff.driver.vehicle_type}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Value</Text>
              <Text style={styles.infoValue}>
                {formatOrderAmount(handoff.batch.total_value, currency)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Verification Progress */}
        <Card style={styles.progressCard}>
          <Text style={styles.progressTitle}>Verification Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${verificationProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {selectedPackages.size} of {handoff.package_count} packages verified
          </Text>
        </Card>

        {/* Package List */}
        <View style={styles.packageSection}>
          <Text style={styles.sectionTitle}>Packages</Text>
          
          {handoff.packages.map((pkg, index) => (
            <Card
              key={pkg.order_number}
              style={[
                styles.packageCard,
                selectedPackages.has(pkg.order_number) && styles.packageCardSelected,
              ]}
              onPress={() => togglePackageSelection(pkg.order_number)}
            >
              <View style={styles.packageHeader}>
                <View style={styles.packageInfo}>
                  <Text style={styles.orderNumber}>#{pkg.order_number}</Text>
                  <Text style={styles.customerName}>{pkg.customer_name}</Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    selectedPackages.has(pkg.order_number) && styles.checkboxSelected,
                  ]}
                >
                  {selectedPackages.has(pkg.order_number) && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                  )}
                </View>
              </View>
              
              <Text style={styles.deliveryAddress} numberOfLines={2}>
                {pkg.delivery_address}
              </Text>
              
              <View style={styles.packageTags}>
                {pkg.special_handling && (
                  <View style={[styles.tag, styles.specialHandlingTag]}>
                    <Ionicons name="warning" size={12} color="#FF6B6B" />
                    <Text style={styles.tagText}>
                      {pkg.special_handling.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
                {pkg.cod_amount && (
                  <View style={[styles.tag, styles.codTag]}>
                    <Ionicons name="cash" size={12} color="#00D2D3" />
                    <Text style={styles.tagText}>
                      COD {formatOrderAmount(pkg.cod_amount, currency)}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Complete Handoff"
          variant="primary"
          size="large"
          onPress={handleVerifyHandoff}
          disabled={selectedPackages.size !== handoff.package_count || verifying}
          loading={verifying}
          style={styles.completeButton}
        />
      </View>
    </View>
  );
};

export default HandoffDetailsScreen;