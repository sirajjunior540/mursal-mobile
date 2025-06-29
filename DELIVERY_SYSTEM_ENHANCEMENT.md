# Delivery System Enhancement Plan

## Overview
This document outlines the implementation plan for enhancing the delivery system to support multiple order types and intelligent order assignment based on delivery type and driver capacity.

## Current Issues Fixed ✅

### 1. Customer Details Missing
- **Issue**: Orders showing "Unknown Customer" due to missing customer_details field
- **Fix**: Updated `transformOrder` function to use correct customer data from API response
- **File**: `src/services/api.ts:631` - Updated to use `delivery?.id || order.id`
- **File**: `src/screens/DashboardScreen.tsx:244-253` - Fixed customer data extraction

### 2. Order ID vs Delivery ID Mismatch
- **Issue**: API calls failing with "no delivery match" error
- **Fix**: Modified `transformOrder` to use Delivery ID instead of Order ID for API calls
- **Impact**: Order details now load correctly

### 3. Order Status Display
- **Issue**: Orders showing "assigned" status but no Accept button
- **Fix**: Updated Accept button logic to show for both "pending" and "assigned" orders without drivers
- **File**: `src/screens/DashboardScreen.tsx:324`

### 4. Post-Accept Navigation
- **Issue**: No guidance after accepting an order
- **Fix**: Added navigation prompt after order acceptance
- **Feature**: User can choose "View Details" or "Navigate to Pickup"
- **File**: `src/screens/DashboardScreen.tsx:183-213`

## New Features Implementation Plan

### Phase 1: Delivery Type System 🚀

#### 1.1 Order Types Definition
```typescript
enum DeliveryType {
  FAST = 'fast',           // Food, urgent items (single order only)
  STANDARD = 'standard',   // Regular packages (multiple orders allowed)
  BULK = 'bulk'           // Large items (special handling)
}

enum OrderPriority {
  EXPRESS = 'express',     // <30min delivery
  STANDARD = 'standard',   // 1-2 hours
  SAME_DAY = 'same_day'    // Within 24 hours
}
```

#### 1.2 Backend Models Update
```python
# delivery/models.py
class Order(models.Model):
    delivery_type = models.CharField(
        max_length=20,
        choices=DeliveryType.choices,
        default=DeliveryType.STANDARD
    )
    priority = models.CharField(
        max_length=20,
        choices=OrderPriority.choices,
        default=OrderPriority.STANDARD
    )
    estimated_preparation_time = models.DurationField(default=timedelta(minutes=15))
    max_delivery_time = models.DurationField(default=timedelta(hours=2))
```

#### 1.3 Driver Capacity Management
```python
# auth/models.py - Driver model extension
class Driver(models.Model):
    # Existing fields...
    bag_capacity = models.IntegerField(default=5)  # Max concurrent orders
    current_active_orders = models.IntegerField(default=0)
    supports_fast_delivery = models.BooleanField(default=True)
    supports_bulk_delivery = models.BooleanField(default=False)
    vehicle_type = models.CharField(
        max_length=20,
        choices=[('bike', 'Bike'), ('car', 'Car'), ('van', 'Van')],
        default='bike'
    )
```

### Phase 2: Smart Order Assignment 🧠

#### 2.1 Assignment Rules Engine
```python
# delivery/assignment_rules.py
class OrderAssignmentRules:
    @staticmethod
    def can_accept_order(driver: Driver, order: Order) -> bool:
        """Check if driver can accept this order type"""
        
        # Fast delivery rules (food, urgent)
        if order.delivery_type == DeliveryType.FAST:
            # Only one active order allowed for fast delivery
            return driver.current_active_orders == 0 and driver.supports_fast_delivery
        
        # Standard delivery rules (packages)
        elif order.delivery_type == DeliveryType.STANDARD:
            # Multiple orders allowed based on bag capacity
            return driver.current_active_orders < driver.bag_capacity
        
        # Bulk delivery rules (large items)
        elif order.delivery_type == DeliveryType.BULK:
            # Only one bulk order at a time, special vehicle required
            return (driver.current_active_orders == 0 and 
                   driver.supports_bulk_delivery and 
                   driver.vehicle_type in ['car', 'van'])
        
        return False
    
    @staticmethod
    def get_available_drivers(order: Order) -> QuerySet:
        """Get drivers who can accept this order type"""
        base_query = Driver.objects.filter(
            is_available=True,
            is_online=True
        )
        
        if order.delivery_type == DeliveryType.FAST:
            return base_query.filter(
                current_active_orders=0,
                supports_fast_delivery=True
            )
        elif order.delivery_type == DeliveryType.STANDARD:
            return base_query.filter(
                current_active_orders__lt=F('bag_capacity')
            )
        elif order.delivery_type == DeliveryType.BULK:
            return base_query.filter(
                current_active_orders=0,
                supports_bulk_delivery=True,
                vehicle_type__in=['car', 'van']
            )
```

#### 2.2 Route Optimization for Multi-Order Delivery
```python
# delivery/route_optimizer.py
from geopy.distance import geodesic
from typing import List, Tuple

class RouteOptimizer:
    @staticmethod
    def optimize_multi_delivery_route(
        driver_location: Tuple[float, float],
        orders: List[Order]
    ) -> List[dict]:
        """
        Optimize route for multiple orders considering:
        1. Pickup locations
        2. Drop-off locations  
        3. Order priorities
        4. Delivery time windows
        """
        
        # Create waypoints for all pickups and deliveries
        waypoints = []
        
        # Add pickup points
        for order in orders:
            if not order.picked_up:
                waypoints.append({
                    'type': 'pickup',
                    'order_id': order.id,
                    'location': (order.pickup_latitude, order.pickup_longitude),
                    'address': order.pickup_address,
                    'priority': order.priority,
                    'deadline': order.pickup_deadline
                })
        
        # Add delivery points for already picked up orders
        for order in orders:
            if order.picked_up and not order.delivered:
                waypoints.append({
                    'type': 'delivery',
                    'order_id': order.id,
                    'location': (order.delivery_latitude, order.delivery_longitude),
                    'address': order.delivery_address,
                    'priority': order.priority,
                    'deadline': order.delivery_deadline
                })
        
        # Sort by priority and distance
        optimized_route = RouteOptimizer._calculate_optimal_sequence(
            driver_location, waypoints
        )
        
        return optimized_route
    
    @staticmethod
    def _calculate_optimal_sequence(
        start_location: Tuple[float, float],
        waypoints: List[dict]
    ) -> List[dict]:
        """Calculate optimal sequence using nearest neighbor with priority weights"""
        route = []
        current_location = start_location
        remaining_waypoints = waypoints.copy()
        
        while remaining_waypoints:
            # Find next best waypoint considering distance and priority
            next_waypoint = min(remaining_waypoints, key=lambda wp: (
                RouteOptimizer._calculate_priority_weighted_distance(
                    current_location, wp
                )
            ))
            
            route.append(next_waypoint)
            current_location = next_waypoint['location']
            remaining_waypoints.remove(next_waypoint)
        
        return route
    
    @staticmethod
    def _calculate_priority_weighted_distance(
        current_location: Tuple[float, float],
        waypoint: dict
    ) -> float:
        """Calculate distance with priority weighting"""
        distance = geodesic(current_location, waypoint['location']).kilometers
        
        # Apply priority weights
        priority_weights = {
            'express': 0.5,    # Higher priority = lower weight
            'standard': 1.0,
            'same_day': 1.5
        }
        
        weight = priority_weights.get(waypoint['priority'], 1.0)
        return distance * weight
```

### Phase 3: Mobile App Enhancements 📱

#### 3.1 Multi-Order Dashboard
```typescript
// src/components/MultiOrderDashboard.tsx
interface ActiveOrderSummary {
  id: string;
  customer: string;
  status: 'pickup_pending' | 'picked_up' | 'delivered';
  estimatedTime: string;
  priority: OrderPriority;
}

const MultiOrderDashboard: React.FC = () => {
  const [activeOrders, setActiveOrders] = useState<ActiveOrderSummary[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteWaypoint[]>([]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Deliveries ({activeOrders.length})</Text>
      
      <ScrollView>
        {activeOrders.map(order => (
          <OrderSummaryCard key={order.id} order={order} />
        ))}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.routeButton}
        onPress={() => openOptimizedRoute()}
      >
        <Text>View Optimized Route</Text>
      </TouchableOpacity>
    </View>
  );
};
```

#### 3.2 Order Acceptance Logic Update
```typescript
// src/contexts/OrderContext.tsx - Enhanced acceptance logic
const acceptOrder = async (orderId: string): Promise<boolean> => {
  try {
    // Check driver capacity and order type compatibility
    const order = await getOrderDetails(orderId);
    const canAccept = await checkOrderCompatibility(order);
    
    if (!canAccept.allowed) {
      Alert.alert('Cannot Accept Order', canAccept.reason);
      return false;
    }
    
    const result = await apiService.acceptOrder(orderId);
    
    if (result.success) {
      // Update active orders count
      updateActiveOrdersCount(1);
      
      // If multiple orders, optimize route
      if (activeOrders.length > 0) {
        optimizeDeliveryRoute();
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error accepting order:', error);
    return false;
  }
};

const checkOrderCompatibility = async (order: Order): Promise<{allowed: boolean, reason?: string}> => {
  const driver = await getDriverProfile();
  
  // Fast delivery - only one order allowed
  if (order.delivery_type === 'fast') {
    if (activeOrders.length > 0) {
      return {
        allowed: false,
        reason: 'Fast deliveries require exclusive focus. Complete current orders first.'
      };
    }
  }
  
  // Standard delivery - check bag capacity
  if (order.delivery_type === 'standard') {
    if (activeOrders.length >= driver.bag_capacity) {
      return {
        allowed: false,
        reason: `Your bag is full (${driver.bag_capacity} orders max). Complete some deliveries first.`
      };
    }
  }
  
  // Bulk delivery - special requirements
  if (order.delivery_type === 'bulk') {
    if (!driver.supports_bulk_delivery) {
      return {
        allowed: false,
        reason: 'You are not authorized for bulk deliveries. Contact support.'
      };
    }
    if (activeOrders.length > 0) {
      return {
        allowed: false,
        reason: 'Bulk deliveries require exclusive vehicle space. Complete current orders first.'
      };
    }
  }
  
  return { allowed: true };
};
```

### Phase 4: Route Navigation Integration 🗺️

#### 4.1 Multi-Stop Navigation
```typescript
// src/services/navigationService.ts
import MapboxDirectionsAPI from '@mapbox/mapbox-sdk/services/directions';

class NavigationService {
  private directions = MapboxDirectionsAPI({ accessToken: MAPBOX_TOKEN });
  
  async getOptimizedRoute(waypoints: RouteWaypoint[]): Promise<RouteResponse> {
    try {
      const coordinates = waypoints.map(wp => [wp.longitude, wp.latitude]);
      
      const response = await this.directions.getDirections({
        profile: 'driving',
        coordinates,
        steps: true,
        geometries: 'geojson',
        annotations: ['duration', 'distance'],
        overview: 'full'
      }).send();
      
      return this.transformRouteResponse(response.body, waypoints);
    } catch (error) {
      console.error('Route optimization failed:', error);
      throw error;
    }
  }
  
  private transformRouteResponse(response: any, waypoints: RouteWaypoint[]): RouteResponse {
    const route = response.routes[0];
    
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps: route.legs.map((leg: any, index: number) => ({
        waypoint: waypoints[index],
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps
      }))
    };
  }
}
```

#### 4.2 Smart Waypoint Management
```typescript
// src/components/RouteMapScreen.tsx
const RouteMapScreen: React.FC = () => {
  const [currentWaypoint, setCurrentWaypoint] = useState<RouteWaypoint | null>(null);
  const [completedWaypoints, setCompletedWaypoints] = useState<string[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);
  
  const markWaypointComplete = async (waypointId: string) => {
    const waypoint = route.find(wp => wp.id === waypointId);
    
    if (waypoint?.type === 'pickup') {
      // Update order status to picked_up
      await updateOrderStatus(waypoint.order_id, 'picked_up');
    } else if (waypoint?.type === 'delivery') {
      // Update order status to delivered
      await updateOrderStatus(waypoint.order_id, 'delivered');
    }
    
    setCompletedWaypoints(prev => [...prev, waypointId]);
    
    // Move to next waypoint
    const nextWaypoint = getNextWaypoint();
    setCurrentWaypoint(nextWaypoint);
    
    // Recalculate route if needed
    if (nextWaypoint) {
      recalculateRoute();
    }
  };
  
  return (
    <View style={styles.container}>
      <MapView style={styles.map}>
        {/* Route polyline */}
        {routeGeometry && (
          <Polyline
            coordinates={routeGeometry.coordinates.map(([lng, lat]) => ({
              latitude: lat,
              longitude: lng
            }))}
            strokeColor="#4CAF50"
            strokeWidth={4}
          />
        )}
        
        {/* Waypoint markers */}
        {route.map(waypoint => (
          <Marker
            key={waypoint.id}
            coordinate={{
              latitude: waypoint.latitude,
              longitude: waypoint.longitude
            }}
            pinColor={getWaypointColor(waypoint)}
          >
            <Callout>
              <WaypointCallout 
                waypoint={waypoint}
                onComplete={() => markWaypointComplete(waypoint.id)}
              />
            </Callout>
          </Marker>
        ))}
      </MapView>
      
      <WaypointProgress 
        current={currentWaypoint}
        completed={completedWaypoints.length}
        total={route.length}
      />
    </View>
  );
};
```

## Implementation Timeline

### Week 1: Foundation ⏰
- [ ] Update backend models for delivery types
- [ ] Implement driver capacity management
- [ ] Create assignment rules engine
- [ ] Update mobile app types and interfaces

### Week 2: Core Logic 🔧
- [ ] Implement smart order assignment
- [ ] Add multi-order acceptance validation
- [ ] Create route optimization service
- [ ] Update order acceptance flow in mobile app

### Week 3: UI/UX Enhancements 🎨
- [ ] Build multi-order dashboard
- [ ] Implement route map screen
- [ ] Add driver capacity settings
- [ ] Create order type indicators

### Week 4: Testing & Polish ✨
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes and refinements
- [ ] Documentation updates

## Backend API Endpoints

### New Endpoints Required
```python
# Driver capacity management
GET /api/v1/auth/drivers/capacity/
POST /api/v1/auth/drivers/capacity/update/

# Multi-order operations  
GET /api/v1/delivery/drivers/active-orders/
POST /api/v1/delivery/orders/batch-accept/
GET /api/v1/delivery/route/optimize/

# Order type filtering
GET /api/v1/delivery/orders/by-type/?type=fast|standard|bulk
```

### Updated Endpoints
```python
# Enhanced order acceptance validation
POST /api/v1/delivery/deliveries/{id}/accept/
# Now includes capacity and compatibility checks

# Enhanced available orders filtering
GET /api/v1/delivery/deliveries/available_orders/
# Now filters by driver capacity and supported order types
```

## Database Migrations

```sql
-- Add delivery type fields to orders
ALTER TABLE orders ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) DEFAULT 'standard';
ALTER TABLE orders ADD COLUMN estimated_preparation_time INTERVAL DEFAULT '15 minutes';
ALTER TABLE orders ADD COLUMN max_delivery_time INTERVAL DEFAULT '2 hours';

-- Add capacity fields to drivers
ALTER TABLE drivers ADD COLUMN bag_capacity INTEGER DEFAULT 5;
ALTER TABLE drivers ADD COLUMN current_active_orders INTEGER DEFAULT 0;
ALTER TABLE drivers ADD COLUMN supports_fast_delivery BOOLEAN DEFAULT true;
ALTER TABLE drivers ADD COLUMN supports_bulk_delivery BOOLEAN DEFAULT false;
ALTER TABLE drivers ADD COLUMN vehicle_type VARCHAR(20) DEFAULT 'bike';

-- Create route optimization table
CREATE TABLE delivery_routes (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    created_at TIMESTAMP DEFAULT NOW(),
    waypoints JSONB NOT NULL,
    total_distance FLOAT,
    estimated_duration INTEGER,
    status VARCHAR(20) DEFAULT 'active'
);
```

## Testing Strategy

### Unit Tests
- Order assignment rules validation
- Route optimization algorithms
- Driver capacity calculations
- Multi-order acceptance logic

### Integration Tests
- End-to-end order flow
- Real-time route updates
- Multi-driver scenarios
- Performance under load

### User Acceptance Tests
- Driver workflow validation
- Customer experience verification
- Edge case handling
- Performance benchmarks

## Monitoring & Analytics

### Key Metrics
- Average orders per driver
- Route optimization efficiency
- Order type completion rates
- Driver capacity utilization
- Customer satisfaction scores

### Dashboards
- Real-time driver activity
- Order type distribution
- Route performance analytics
- Capacity utilization reports

---

## Notes
- This enhancement maintains backward compatibility
- Existing single-order workflows continue to work
- New features are opt-in based on order type
- Route optimization improves delivery efficiency
- Driver capacity management prevents overload