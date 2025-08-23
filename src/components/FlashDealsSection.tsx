import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashDeal } from '../services/apiEndpoints';

const { width } = Dimensions.get('window');

interface FlashDealsSectionProps {
  deals: FlashDeal[];
  onDealPress: (deal: FlashDeal) => void;
  onRefresh?: () => void;
  onViewAll?: () => void;
  loading?: boolean;
}

const FlashDealsSection: React.FC<FlashDealsSectionProps> = ({
  deals,
  onDealPress,
  onRefresh,
  onViewAll,
  loading = false,
}) => {
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sparkle animation for high discounts
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for discount badges
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [sparkleAnim, pulseAnim]);

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

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

  const renderSparkles = (discount: number) => {
    if (discount < 40) return null;

    return (
      <Animated.View
        style={[
          styles.sparkleContainer,
          {
            opacity: sparkleAnim,
            transform: [{ scale: sparkleAnim }],
          },
        ]}
      >
        <Ionicons name="sparkles" size={16} color="#FFD700" style={styles.sparkle1} />
        <Ionicons name="sparkles" size={12} color="#FFA500" style={styles.sparkle2} />
        <Ionicons name="sparkles" size={14} color="#FFD700" style={styles.sparkle3} />
      </Animated.View>
    );
  };

  const renderDeal = ({ item }: { item: FlashDeal }) => {
    const colors = getDiscountColors(item.discountPercentage);
    const isUrgent = item.timeRemaining < 3600; // Less than 1 hour
    const isHighDiscount = item.discountPercentage >= 40;

    return (
      <TouchableOpacity 
        style={[
          styles.dealCard,
          { shadowColor: colors.shadow }
        ]}
        onPress={() => onDealPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardGradient}>
          {/* Discount Badge */}
          <Animated.View
            style={[
              styles.discountBadgeContainer,
              isHighDiscount && {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.discountBadge,
                { backgroundColor: colors.gradient[0] }
              ]}
            >
              <Text style={[styles.discountText, { color: colors.textColor }]}>
                {item.discountPercentage}%
              </Text>
              <Text style={[styles.offText, { color: colors.textColor }]}>
                OFF
              </Text>
            </View>
          </Animated.View>

          {/* Sparkles for high discounts */}
          {renderSparkles(item.discountPercentage)}

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

            {/* Price Section */}
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>
                ${item.originalPrice.toFixed(2)}
              </Text>
              <Text style={styles.discountedPrice}>
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
            <View style={[
              styles.timerContainer,
              isUrgent && styles.urgentTimer
            ]}>
              <Ionicons 
                name="time" 
                size={14} 
                color={isUrgent ? '#FF6B6B' : '#666'} 
              />
              <Animated.Text 
                style={[
                  styles.timerText,
                  isUrgent && {
                    color: '#FF6B6B',
                    textShadowColor: '#FF6B6B50',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }
                ]}
              >
                {formatTimeRemaining(item.timeRemaining)}
              </Animated.Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (deals.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="flash" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Flash Deals</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>HOT</Text>
              </View>
            </View>
            <View style={styles.headerButtons}>
              {onViewAll && (
                <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Deals List */}
      <FlatList
        data={deals}
        renderItem={renderDeal}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dealsContainer}
        ItemSeparatorComponent={() => <View style={styles.dealSeparator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerGradient: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B6B',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  headerBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 4,
  },
  dealsContainer: {
    paddingHorizontal: 16,
  },
  dealSeparator: {
    width: 12,
  },
  dealCard: {
    width: width * 0.7,
    borderRadius: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginVertical: 4,
  },
  cardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  discountBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 60,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  discountText: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  offText: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },
  sparkle1: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sparkle2: {
    position: 'absolute',
    top: 15,
    left: 20,
  },
  sparkle3: {
    position: 'absolute',
    top: 25,
    left: 5,
  },
  imageContainer: {
    height: 140,
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
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dealInfo: {
    padding: 16,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  storeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  urgentTimer: {
    backgroundColor: '#FFE5E5',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
});

export default FlashDealsSection;