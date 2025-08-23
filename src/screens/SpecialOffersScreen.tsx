import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Haptics from 'react-native-haptic-feedback';

import { FlashDeal } from '../services/apiEndpoints';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

interface RootStackParamList {
  SpecialOffers: {
    selectedDealId?: string;
    category?: 'all' | 'surge' | 'bonus' | 'incentive';
  };
}

type SpecialOffersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SpecialOffers'>;
type SpecialOffersScreenRouteProp = RouteProp<RootStackParamList, 'SpecialOffers'>;

const SpecialOffersScreen: React.FC = () => {
  const navigation = useNavigation<SpecialOffersScreenNavigationProp>();
  const route = useRoute<SpecialOffersScreenRouteProp>();
  const { selectedDealId, category = 'all' } = route.params || {};

  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<FlashDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category);

  const categories = [
    { key: 'all', label: 'All Offers', icon: 'flash' },
    { key: 'surge', label: 'Surge Pricing', icon: 'trending-up' },
    { key: 'bonus', label: 'Bonus Earnings', icon: 'cash' },
    { key: 'incentive', label: 'Incentives', icon: 'star' },
  ];

  useEffect(() => {
    loadOffers();
  }, []);

  useEffect(() => {
    filterDeals();
  }, [deals, searchQuery, selectedCategory]);

  useEffect(() => {
    // If a specific deal was selected from mini-banner, scroll to it
    if (selectedDealId && deals.length > 0) {
      const dealIndex = deals.findIndex(deal => deal.id === selectedDealId);
      if (dealIndex !== -1) {
        // Highlight the selected deal briefly
        setTimeout(() => {
          showDealDetails(deals[dealIndex]);
        }, 500);
      }
    }
  }, [selectedDealId, deals]);

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getFlashDeals();
      if (response.success && response.data) {
        setDeals(response.data);
      } else {
        console.warn('[SpecialOffers] Failed to load offers:', response.error);
      }
    } catch (error) {
      console.error('[SpecialOffers] Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOffers();
    setRefreshing(false);
    Haptics.trigger('impactLight');
  }, [loadOffers]);

  const filterDeals = useCallback(() => {
    let filtered = deals;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(deal => {
        const title = deal.title.toLowerCase();
        switch (selectedCategory) {
          case 'surge':
            return title.includes('surge') || title.includes('peak') || title.includes('rush');
          case 'bonus':
            return title.includes('bonus') || title.includes('extra') || title.includes('double');
          case 'incentive':
            return title.includes('incentive') || title.includes('program') || title.includes('challenge');
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(deal =>
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.store.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredDeals(filtered);
  }, [deals, searchQuery, selectedCategory]);

  const showDealDetails = useCallback((deal: FlashDeal) => {
    Haptics.trigger('impactMedium');
    
    const formatTimeRemaining = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      }
      return `${minutes}m remaining`;
    };

    const isUrgent = deal.timeRemaining < 3600; // Less than 1 hour
    
    Alert.alert(
      `${deal.title}`,
      `🏪 ${deal.store.name} (${deal.store.rating}★)\n\n` +
      `💰 Original Rate: $${deal.originalPrice.toFixed(2)}/delivery\n` +
      `🎯 Enhanced Rate: $${deal.discountedPrice.toFixed(2)}/delivery\n` +
      `📈 Bonus: ${deal.discountPercentage}% increase\n\n` +
      `⏰ ${formatTimeRemaining(deal.timeRemaining)}\n\n` +
      `${isUrgent ? '🔥 Limited Time! ' : ''}Start accepting deliveries in this zone to earn enhanced rates!`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'View Zone', 
          onPress: () => {
            // Navigate to map view or zone details
            Alert.alert(
              'Zone Navigation',
              'This would typically open a map view showing the enhanced earnings zone. For now, drivers should check their available orders for deals in this area.',
              [{ text: 'Got it' }]
            );
          }
        },
      ]
    );
  }, []);

  const getDiscountColors = (percentage: number) => {
    if (percentage >= 50) {
      return {
        gradient: ['#FF6B6B', '#FF8E53', '#FF6B35'],
        shadow: '#FF6B6B50',
        textColor: '#FFFFFF',
      };
    }
    if (percentage >= 30) {
      return {
        gradient: ['#FFB347', '#FF8C42', '#FF7518'],
        shadow: '#FFB34750',
        textColor: '#FFFFFF',
      };
    }
    if (percentage >= 20) {
      return {
        gradient: ['#FFD700', '#FFA500', '#FF8C00'],
        shadow: '#FFD70050',
        textColor: '#FFFFFF',
      };
    }
    return {
      gradient: ['#4ECDC4', '#44A08D', '#096A09'],
      shadow: '#4ECDC450',
      textColor: '#FFFFFF',
    };
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === item.key && styles.categoryButtonActive
            ]}
            onPress={() => {
              setSelectedCategory(item.key);
              Haptics.trigger('selection');
            }}
          >
            <Ionicons 
              name={item.icon as any} 
              size={18} 
              color={selectedCategory === item.key ? '#FFFFFF' : '#666666'} 
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === item.key && styles.categoryButtonTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderDealCard = ({ item }: { item: FlashDeal }) => {
    const colors = getDiscountColors(item.discountPercentage);
    const isUrgent = item.timeRemaining < 3600;
    const isSelected = item.id === selectedDealId;

    const formatTimeRemaining = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    return (
      <TouchableOpacity
        style={[
          styles.dealCard,
          { shadowColor: colors.shadow },
          isSelected && styles.selectedDealCard
        ]}
        onPress={() => showDealDetails(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardContent, isSelected && styles.selectedCardContent]}>
          {/* Discount Badge */}
          <View style={[styles.discountBadge, { backgroundColor: colors.gradient[0] }]}>
            <Text style={[styles.discountText, { color: colors.textColor }]}>
              +{item.discountPercentage}%
            </Text>
          </View>

          {/* Deal Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.dealImage} />
            <View style={styles.imageOverlay} />
          </View>

          {/* Deal Info */}
          <View style={styles.dealInfo}>
            <Text style={styles.dealTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Enhanced Rate Section */}
            <View style={styles.rateContainer}>
              <Text style={styles.originalRate}>
                ${item.originalPrice.toFixed(2)}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
              <Text style={styles.enhancedRate}>
                ${item.discountedPrice.toFixed(2)}
              </Text>
            </View>

            {/* Store Info */}
            <View style={styles.storeContainer}>
              <Text style={styles.storeName}>{item.store.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.rating}>{item.store.rating.toFixed(1)}</Text>
              </View>
            </View>

            {/* Timer */}
            <View style={[styles.timerContainer, isUrgent && styles.urgentTimer]}>
              <Ionicons 
                name="time" 
                size={14} 
                color={isUrgent ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.timerText,
                isUrgent && styles.urgentTimerText
              ]}>
                {formatTimeRemaining(item.timeRemaining)} left
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No offers found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search or category filter'
          : 'Check back later for new driver incentives and bonuses'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.trigger('impactLight');
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Offers</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search offers, zones, bonuses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Offers List */}
      <FlatList
        data={filteredDeals}
        renderItem={renderDealCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryList: {
    paddingHorizontal: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
  },
  categoryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  selectedDealCard: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  cardContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedCardContent: {
    backgroundColor: '#F0F9FF',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageContainer: {
    height: 120,
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dealInfo: {
    padding: 16,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalRate: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  enhancedRate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 8,
  },
  storeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  urgentTimer: {
    backgroundColor: '#FEF2F2',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  urgentTimerText: {
    color: '#DC2626',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

export default SpecialOffersScreen;