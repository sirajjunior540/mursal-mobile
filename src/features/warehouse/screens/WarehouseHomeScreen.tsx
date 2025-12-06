/**
 * Warehouse Officer Home Screen
 * Main dashboard for warehouse staff operations
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../shared/styles/theme';
import Card from '../../../shared/components/Card/Card';
import Button from '../../../shared/components/Button/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { warehouseAPI } from '../../../services/api/warehouseAPI';
import { formatOrderAmount } from '../../../utils/currency';
import { useTenant } from '../../../contexts/TenantContext';
import styles from './WarehouseHomeScreen.styles';

interface WarehouseStats {
  pendingHandoffs: number;
  todayProcessed: number;
  activeConsolidations: number;
  totalPackages: number;
}

interface PendingHandoff {
  id: string;
  handoff_code: string;
  batch_name: string;
  driver_name: string;
  package_count: number;
  created_at: string;
  status: string;
}

const WarehouseHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tenantSettings } = useTenant();
  const currency = tenantSettings?.currency || 'SDG';
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<WarehouseStats>({
    pendingHandoffs: 0,
    todayProcessed: 0,
    activeConsolidations: 0,
    totalPackages: 0,
  });
  const [pendingHandoffs, setPendingHandoffs] = useState<PendingHandoff[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWarehouseData = async () => {
    try {
      setLoading(true);
      
      // Fetch warehouse stats
      const statsResponse = await warehouseAPI.getWarehouseStats();
      setStats(statsResponse.data);
      
      // Fetch pending handoffs
      const handoffsResponse = await warehouseAPI.getPendingHandoffs();
      setPendingHandoffs(handoffsResponse.data.results || []);
      
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWarehouseData();
  };

  const navigateToScanner = () => {
    navigation.navigate('QRScanner' as never);
  };

  const navigateToHandoff = (handoffId: string) => {
    navigation.navigate('HandoffDetails' as never, { handoffId } as never);
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.first_name || 'Warehouse Officer'}</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            variant="outline"
            size="small"
            icon={<Ionicons name="notifications-outline" size={20} />}
            onPress={() => {}}
            style={styles.notificationButton}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Button
            title="Scan Package"
            variant="primary"
            size="large"
            icon={<Ionicons name="qr-code-outline" size={24} color={theme.colors.white} />}
            onPress={navigateToScanner}
            style={styles.scanButton}
          />
          <Button
            title="Consolidations"
            variant="outline"
            size="medium"
            icon={<Ionicons name="cube-outline" size={20} />}
            onPress={() => navigation.navigate('Consolidations' as never)}
            style={styles.actionButton}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="time-outline"
            label="Pending"
            value={stats.pendingHandoffs}
            color={theme.colors.warning}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Today"
            value={stats.todayProcessed}
            color={theme.colors.success}
          />
          <StatCard
            icon="cube-outline"
            label="Active"
            value={stats.activeConsolidations}
            color={theme.colors.primary}
          />
          <StatCard
            icon="archive-outline"
            label="Packages"
            value={stats.totalPackages}
            color={theme.colors.info}
          />
        </View>

        {/* Pending Handoffs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Handoffs</Text>
            <Button
              title="View All"
              variant="text"
              size="small"
              onPress={() => navigation.navigate('AllHandoffs' as never)}
            />
          </View>

          {loading ? (
            <Card style={styles.loadingCard}>
              <Text style={styles.loadingText}>Loading handoffs...</Text>
            </Card>
          ) : pendingHandoffs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No pending handoffs</Text>
            </Card>
          ) : (
            pendingHandoffs.slice(0, 3).map((handoff) => (
              <Card
                key={handoff.id}
                style={styles.handoffCard}
                onPress={() => navigateToHandoff(handoff.id)}
              >
                <View style={styles.handoffHeader}>
                  <View style={styles.handoffCodeContainer}>
                    <Ionicons name="qr-code" size={16} color={theme.colors.primary} />
                    <Text style={styles.handoffCode}>{handoff.handoff_code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                    <Text style={[styles.statusText, { color: theme.colors.warning }]}>
                      Pending
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.batchName}>{handoff.batch_name}</Text>
                
                <View style={styles.handoffDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{handoff.driver_name}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{handoff.package_count} packages</Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <Card style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Average Processing Time</Text>
              <Text style={styles.performanceValue}>4.5 min</Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Accuracy Rate</Text>
              <Text style={styles.performanceValue}>99.2%</Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Packages Processed</Text>
              <Text style={styles.performanceValue}>156</Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

export default WarehouseHomeScreen;