import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCodeScanner from 'react-native-qrcode-scanner';
import LinearGradient from 'react-native-linear-gradient';
import { Design } from '../constants/designSystem';
import { BatchOrder, Order, getBatchOrders } from '../types';
import { batchService } from '../services/batchService';
import { soundService } from '../services/soundService';

interface BatchOperationModalProps {
  visible: boolean;
  batch: BatchOrder | null;
  onClose: () => void;
  onStatusUpdate: (batchId: string, newStatus: string) => Promise<void>;
}

const BatchOperationModal: React.FC<BatchOperationModalProps> = ({
  visible,
  batch,
  onClose,
  onStatusUpdate,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedOrders, setScannedOrders] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string>('');

  useEffect(() => {
    if (!visible) {
      setScannedOrders(new Set());
      setShowScanner(false);
    }
  }, [visible]);

  if (!batch) return null;

  const requiresScanning = batchService.requiresIndividualScanning(batch);
  const nextStatus = batchService.getNextBatchStatus(batch);
  const statusButtonText = batchService.getBatchStatusButtonText(batch);
  const totalOrders = getBatchOrders(batch).length;

  const handleQRScan = async (e: any) => {
    const scanResult = batchService.parseBatchQRCode(e.data);
    
    if (!scanResult.success) {
      soundService.playErrorSound();
      Alert.alert('Invalid QR Code', 'This QR code is not recognized.');
      return;
    }

    // Validate batch ID
    if (scanResult.batchId !== batch.id) {
      soundService.playErrorSound();
      Alert.alert('Wrong Batch', 'This QR code belongs to a different batch.');
      return;
    }

    // If scanning individual orders
    if (requiresScanning && scanResult.orderNumber) {
      const orderExists = getBatchOrders(batch).some(o => 
        o.order_number === scanResult.orderNumber || o.id === scanResult.orderNumber
      );

      if (!orderExists) {
        soundService.playErrorSound();
        Alert.alert('Invalid Order', 'This order is not part of this batch.');
        return;
      }

      if (scannedOrders.has(scanResult.orderNumber)) {
        soundService.playWarningSound();
        Alert.alert('Already Scanned', 'This order has already been scanned.');
        return;
      }

      // Add to scanned orders
      soundService.playSuccessSound();
      const newScanned = new Set(scannedOrders);
      newScanned.add(scanResult.orderNumber);
      setScannedOrders(newScanned);
      batchService.addScannedOrder(batch.id, scanResult.orderNumber);

      // Check if all orders are scanned
      if (newScanned.size === totalOrders) {
        setShowScanner(false);
        Alert.alert(
          'All Orders Scanned',
          'All orders have been scanned. Ready to proceed.',
          [{ text: 'OK' }]
        );
      }
    } else {
      // Batch-level scan
      soundService.playSuccessSound();
      setShowScanner(false);
      handleStatusUpdate();
    }
  };

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;

    // Check if scanning is required
    if (requiresScanning && scannedOrders.size < totalOrders) {
      Alert.alert(
        'Scan Required',
        `Please scan all ${totalOrders} orders before proceeding. ${scannedOrders.size} scanned so far.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(batch.id, nextStatus);
      batchService.clearScannedOrders(batch.id);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update batch status');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderOrdersList = () => (
    <ScrollView style={styles.ordersList}>
      {getBatchOrders(batch).map((order) => {
        const isScanned = scannedOrders.has(order.order_number || order.id);
        return (
          <View key={order.id} style={[styles.orderItem, isScanned && styles.orderItemScanned]}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>#{order.order_number || order.id}</Text>
              <Text style={styles.customerName}>{order.customer_details?.name || 'Customer'}</Text>
            </View>
            {isScanned && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <QRCodeScanner
        onRead={handleQRScan}
        topContent={
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>
              {requiresScanning ? 'Scan Each Order' : 'Scan Batch QR'}
            </Text>
            <Text style={styles.scannerSubtitle}>
              {requiresScanning 
                ? `${scannedOrders.size} of ${totalOrders} orders scanned`
                : 'Scan the batch QR code to proceed'
              }
            </Text>
          </View>
        }
        bottomContent={
          <TouchableOpacity
            style={styles.cancelScanButton}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.cancelScanText}>Cancel Scanning</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {showScanner ? renderScanner() : (
            <>
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.header}
              >
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                
                <View style={styles.batchInfo}>
                  <Text style={styles.batchTitle}>Batch #{batch.id}</Text>
                  <Text style={styles.batchSubtitle}>
                    {totalOrders} orders • {batch.batchMetadata?.totalItems || 0} items
                  </Text>
                </View>

                <View style={styles.statusInfo}>
                  <Text style={styles.currentStatus}>
                    Current: {batch.status?.replace('_', ' ').toUpperCase()}
                  </Text>
                  {nextStatus && (
                    <Text style={styles.nextStatus}>
                      Next: {nextStatus.replace('_', ' ').toUpperCase()}
                    </Text>
                  )}
                </View>
              </LinearGradient>

              <View style={styles.content}>
                {batch.warehouseInfo && (
                  <View style={styles.warehouseCard}>
                    <Ionicons name="business" size={24} color="#6B7280" />
                    <View style={styles.warehouseInfo}>
                      <Text style={styles.warehouseName}>{batch.warehouseInfo.name}</Text>
                      <Text style={styles.warehouseAddress}>{batch.warehouseInfo.address}</Text>
                    </View>
                  </View>
                )}

                {requiresScanning && (
                  <View style={styles.scanProgress}>
                    <Text style={styles.scanProgressTitle}>Scan Progress</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${(scannedOrders.size / totalOrders) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.scanProgressText}>
                      {scannedOrders.size} of {totalOrders} orders scanned
                    </Text>
                  </View>
                )}

                {renderOrdersList()}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => setShowScanner(true)}
                  >
                    <Ionicons name="qr-code" size={24} color="#4F46E5" />
                    <Text style={styles.scanButtonText}>
                      {requiresScanning ? 'Scan Orders' : 'Scan QR Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      isUpdating && styles.statusButtonDisabled,
                      requiresScanning && scannedOrders.size < totalOrders && styles.statusButtonDisabled
                    ]}
                    onPress={handleStatusUpdate}
                    disabled={isUpdating || (requiresScanning && scannedOrders.size < totalOrders)}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                        <Text style={styles.statusButtonText}>{statusButtonText}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Design.colors.background,
    borderTopLeftRadius: Design.borderRadius.xl,
    borderTopRightRadius: Design.borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    padding: Design.spacing[5],
    borderTopLeftRadius: Design.borderRadius.xl,
    borderTopRightRadius: Design.borderRadius.xl,
  },
  closeButton: {
    position: 'absolute',
    top: Design.spacing[5],
    right: Design.spacing[5],
    zIndex: 1,
  },
  batchInfo: {
    marginBottom: Design.spacing[3],
  },
  batchTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  batchSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  nextStatus: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  content: {
    padding: Design.spacing[5],
  },
  warehouseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Design.colors.gray50,
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    marginBottom: Design.spacing[4],
  },
  warehouseInfo: {
    marginLeft: Design.spacing[3],
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
  },
  warehouseAddress: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  scanProgress: {
    marginBottom: Design.spacing[4],
  },
  scanProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
    marginBottom: Design.spacing[2],
  },
  progressBar: {
    height: 8,
    backgroundColor: Design.colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  scanProgressText: {
    fontSize: 14,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[2],
  },
  ordersList: {
    maxHeight: 200,
    marginBottom: Design.spacing[4],
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Design.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Design.colors.gray100,
  },
  orderItemScanned: {
    backgroundColor: '#F0FDF4',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Design.colors.text,
  },
  customerName: {
    fontSize: 12,
    color: Design.colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: Design.spacing[3],
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    gap: Design.spacing[3],
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.primary,
    padding: Design.spacing[4],
    borderRadius: Design.borderRadius.lg,
    gap: Design.spacing[3],
  },
  statusButtonDisabled: {
    backgroundColor: Design.colors.gray300,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    alignItems: 'center',
    marginBottom: Design.spacing[6],
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Design.colors.text,
  },
  scannerSubtitle: {
    fontSize: 16,
    color: Design.colors.textSecondary,
    marginTop: Design.spacing[2],
  },
  cancelScanButton: {
    backgroundColor: Design.colors.gray200,
    paddingHorizontal: Design.spacing[6],
    paddingVertical: Design.spacing[3],
    borderRadius: Design.borderRadius.lg,
    marginTop: Design.spacing[6],
  },
  cancelScanText: {
    fontSize: 16,
    fontWeight: '600',
    color: Design.colors.text,
  },
});

export default BatchOperationModal;