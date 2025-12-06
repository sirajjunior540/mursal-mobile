# Batch Order Handling Implementation

This document describes the batch order handling UI implementation for the Murrsal Driver App.

## Overview

The implementation provides comprehensive batch order handling with optimized routing, allowing drivers to efficiently manage multiple orders in a single trip.

## Files Created

### 1. BatchOrderScreen.tsx
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/src/screens/BatchOrderScreen.tsx`

**Features:**
- Displays all orders in the batch with status indicators
- Shows optimized route on map with numbered markers
- Lists stops in sequence (pickups then deliveries)
- Highlights current stop
- "Navigate to Next Stop" button for easy navigation
- Progress indicator showing completed stops (e.g., "2 of 5 stops completed")
- Progress bar with percentage completion
- Total earnings calculation for the batch
- Estimated completion time display
- Route reoptimization button
- Completed stops section
- Upcoming stops preview
- Integration with UniversalMapView for route visualization

**Navigation:**
- From: IncomingOrderModal (after accepting batch)
- To: PickupScreen or DeliveryScreen (per stop)
- Returns: Dashboard (after all stops completed)

### 2. routeOptimizationService.ts
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/src/services/routeOptimizationService.ts`

**Key Functions:**

```typescript
// Get optimized route for a batch
async getOptimizedRoute(batchId: string): Promise<OptimizedRoute>

// Reoptimize route from current location
async reoptimizeFromCurrentLocation(batchId: string): Promise<OptimizedRoute>
```

**Interfaces:**

```typescript
interface OptimizedStop {
  sequence: number;
  orderId: string;
  stopType: 'pickup' | 'delivery';
  address: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
  distanceFromPreviousKm: number;
  etaMinutes: number;
  instructions?: string;
}

interface OptimizedRoute {
  batchId: string;
  driverLocation: { lat: number; lng: number };
  stops: OptimizedStop[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  optimizedAt: string;
}
```

**Algorithm:**
- Nearest neighbor algorithm with priority handling
- All pickups completed before deliveries
- Priority ordering: urgent > high > normal
- Distance-based optimization within each priority group
- Real-time distance calculation using Haversine formula
- ETA calculation based on 30 km/h average speed + 5 min per stop

### 3. StopProgressCard.tsx
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/src/components/StopProgressCard.tsx`

**Features:**
- Shows current stop number and total stops
- Stop type indicator (Pickup/Delivery) with color-coded icon
- Full address display
- Contact information (name and phone)
- Special instructions display
- Distance from previous stop
- Estimated time to arrival
- Action buttons that adapt to stop state:
  - **Active stop:** Navigate, Arrived, Complete buttons
  - **Completed stop:** Completed badge with checkmark
  - **Upcoming stop:** No action buttons

**Props:**
```typescript
interface StopProgressCardProps {
  stop: OptimizedStop;
  stopNumber: number;
  totalStops: number;
  isActive?: boolean;
  isCompleted?: boolean;
  onNavigate?: () => void;
  onArrived?: () => void;
  onComplete?: () => void;
}
```

### 4. IncomingOrderModal Updates
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/src/components/IncomingOrderModal.tsx` (Already exists)

**Batch Order Display Features (Already implemented):**
- "BATCH ORDER" badge with distinctive styling
- Number of orders display (e.g., "3 Orders")
- Total earnings calculation across all orders
- Route preview with list of stops
- Individual order details in expandable list
- "Accept Route" button (instead of "Accept Order")
- Support for warehouse consolidation detection
- Distribution batch detection
- Route stops visualization
- Special handling indicators per order

## Integration Flow

### 1. Order Acceptance Flow

```
IncomingOrderModal (Batch notification)
  ↓ [Driver taps "Accept Route"]
BatchOrderScreen (Route overview)
  ↓ [Driver taps "Navigate to Stop 1"]
PickupScreen (if pickup) or DeliveryScreen (if delivery)
  ↓ [Driver completes stop]
BatchOrderScreen (Updated with next stop)
  ↓ [Repeat for all stops]
Dashboard (with completion celebration)
```

### 2. Data Flow

```
1. Backend sends batch order notification
2. IncomingOrderModal displays batch details
3. Driver accepts batch
4. BatchOrderScreen fetches batch data via API
5. routeOptimizationService optimizes route
6. Driver navigates through each stop
7. BatchOrderScreen tracks progress
8. After all stops: return to Dashboard
```

### 3. Navigation Integration

Add to your navigation stack (e.g., in `App.tsx` or navigation config):

```typescript
<Stack.Screen
  name="BatchOrderScreen"
  component={BatchOrderScreen}
  options={{
    title: 'Batch Route',
    headerShown: false // Screen has custom header
  }}
/>
```

Update IncomingOrderModal's `onAccept` handler to navigate to BatchOrderScreen:

```typescript
if (isBatchOrder && onAcceptRoute && order.current_batch?.id) {
  const batchId = order.current_batch.id;
  onAcceptRoute(batchId, order);
  // In the handler, navigate to:
  navigation.navigate('BatchOrderScreen', { batchId });
}
```

## API Integration

The implementation expects the following API endpoints:

### 1. Get Batch Details
```
GET /api/v1/batches/{batchId}/
```

Response should include:
```json
{
  "id": "batch_123",
  "pickup_address": "123 Main St",
  "pickup_latitude": 40.7128,
  "pickup_longitude": -74.0060,
  "pickup_contact_name": "Store Manager",
  "pickup_contact_phone": "+1234567890",
  "pickup_instructions": "Ring doorbell",
  "orders": [
    {
      "id": "order_1",
      "delivery_address": "456 Oak Ave",
      "delivery_latitude": 40.7589,
      "delivery_longitude": -73.9851,
      "customer": {
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "delivery_instructions": "Leave at door",
      "status": "pending",
      "priority": "normal"
    }
  ]
}
```

### 2. Update Stop Status
```
POST /api/v1/deliveries/{orderId}/update-status/
```

Body:
```json
{
  "status": "completed",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2025-12-05T10:30:00Z"
}
```

## Features Implemented

### ✅ Core Features
- [x] Batch order screen with route overview
- [x] Route optimization service with TSP algorithm
- [x] Stop progress card component
- [x] Map visualization with numbered markers
- [x] Progress tracking (completed/total stops)
- [x] Current stop highlighting
- [x] Navigation to individual stops
- [x] Distance and ETA calculations
- [x] Total earnings display
- [x] Estimated completion time

### ✅ Advanced Features
- [x] Route reoptimization from current location
- [x] Priority handling (urgent > high > normal)
- [x] Pickup-before-delivery constraint
- [x] Contact information display
- [x] Special instructions per stop
- [x] Completed stops tracking
- [x] Upcoming stops preview
- [x] Real-time location updates

### ✅ UI/UX Features
- [x] Clean, modern interface
- [x] Color-coded stop types (blue=pickup, green=delivery)
- [x] Progress bar with percentage
- [x] Status badges
- [x] Action buttons (Navigate, Arrived, Complete)
- [x] Loading states
- [x] Error handling
- [x] Pull-to-refresh

## Usage Example

### For Drivers

1. **Receive Batch Order:**
   - Notification appears with "BATCH ORDER" badge
   - Shows number of orders and total earnings
   - Displays route preview

2. **Accept Batch:**
   - Tap "Accept Route" button
   - Automatically navigates to BatchOrderScreen

3. **View Route:**
   - See all stops on map with sequence numbers
   - View total distance and estimated time
   - See current stop highlighted

4. **Navigate to Stop:**
   - Tap "Navigate to Stop" button
   - Opens navigation app (Google Maps)
   - Alternatively, tap individual stop in PickupScreen/DeliveryScreen

5. **Complete Stop:**
   - Mark as "Arrived" when within range
   - Complete pickup/delivery actions
   - Automatically moves to next stop

6. **Track Progress:**
   - See progress bar update
   - View completed stops
   - Check remaining time

7. **Finish Batch:**
   - Complete all stops
   - See completion celebration
   - Return to Dashboard

## Testing Checklist

- [ ] Batch order appears in IncomingOrderModal
- [ ] Accept batch navigates to BatchOrderScreen
- [ ] Map shows all stops with correct markers
- [ ] Current stop is highlighted
- [ ] Navigate button opens navigation app
- [ ] Completing a stop updates progress
- [ ] Progress bar reflects completion percentage
- [ ] Reoptimize button works from any location
- [ ] All stops completed shows celebration
- [ ] Distance calculations are accurate
- [ ] ETA calculations are reasonable
- [ ] Contact information displays correctly
- [ ] Special instructions show when present
- [ ] Priority orders are handled first

## Future Enhancements

### Potential Additions
- [ ] Turn-by-turn navigation integration
- [ ] Real-time traffic updates
- [ ] Customer notifications per stop
- [ ] Photo capture per delivery
- [ ] Signature collection
- [ ] Cash on delivery handling per stop
- [ ] Batch earnings breakdown
- [ ] Driver performance metrics
- [ ] Route history and replay
- [ ] Offline mode support
- [ ] Multiple batch management
- [ ] Batch cancellation handling
- [ ] Mid-route order additions
- [ ] Dynamic reordering based on traffic

## Dependencies

The implementation uses existing services and components:
- `locationService` - For GPS and distance calculations
- `apiService` - For backend API communication
- `UniversalMapView` - For map display
- `flatColors` - For consistent theming
- `premiumTypography` - For text styling
- `premiumShadows` - For elevation effects
- `Design` system - For spacing and layout

## Notes

1. **Route Optimization:** Currently uses a greedy nearest-neighbor algorithm. For production, consider:
   - Google Routes API integration
   - More sophisticated TSP solvers
   - Real-time traffic data
   - Machine learning-based optimization

2. **Performance:** The implementation is optimized for batches up to 20 stops. For larger batches:
   - Implement virtualized lists
   - Add pagination
   - Consider map clustering

3. **Offline Support:** Current implementation requires network connectivity. Consider:
   - Caching batch data
   - Offline map tiles
   - Queue status updates for sync

4. **Error Handling:** Comprehensive error handling is implemented, but consider:
   - Retry mechanisms
   - Fallback routes
   - Network failure recovery

## Support

For questions or issues:
1. Check existing code comments
2. Review type definitions in `routeOptimizationService.ts`
3. Test with sample data in development
4. Monitor console logs for debugging info
