# Batch Order Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API                               │
│  /api/v1/batches/{id}/                                          │
│  /api/v1/batches/{id}/accept/                                   │
│  /api/v1/deliveries/{id}/update-status/                         │
└─────────────────────────────────────────────────────────────────┘
                            ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                   Mobile Driver App                              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         IncomingOrderModal                               │   │
│  │  • Shows batch details                                   │   │
│  │  • Number of orders badge                                │   │
│  │  • Total earnings display                                │   │
│  │  • "Accept Route" button                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↓ onAcceptRoute                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │      routeOptimizationService                            │   │
│  │  • Fetches batch data                                    │   │
│  │  • Gets driver location                                  │   │
│  │  • Optimizes route (TSP algorithm)                       │   │
│  │  • Calculates distances & ETAs                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↓ OptimizedRoute                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         BatchOrderScreen                                 │   │
│  │  • Map with numbered markers                             │   │
│  │  • Progress bar                                          │   │
│  │  • Current stop card                                     │   │
│  │  • Upcoming stops list                                   │   │
│  │  • "Navigate to Stop" button                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓ Navigate              ↓ Navigate                      │
│  ┌──────────────┐        ┌──────────────┐                      │
│  │ PickupScreen │        │DeliveryScreen│                      │
│  │ • QR scan    │        │ • Photo proof│                      │
│  │ • Confirm    │        │ • Signature  │                      │
│  └──────────────┘        └──────────────┘                      │
│         ↓ Complete              ↓ Complete                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Back to BatchOrderScreen                         │   │
│  │  • Updates progress                                      │   │
│  │  • Moves to next stop                                    │   │
│  │  • Shows completion if all done                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow

```
┌─────────────────────┐
│  Driver Dashboard   │
│  • Online status    │
└──────────┬──────────┘
           │
           ↓ New batch available
┌─────────────────────┐
│ Incoming Batch Modal│
│  ┌───────────────┐  │
│  │ BATCH ORDER   │  │
│  │ 5 Orders      │  │
│  │ $45.00        │  │
│  └───────────────┘  │
│  [Accept Route]     │
└──────────┬──────────┘
           │
           ↓ Driver accepts
┌─────────────────────┐
│ Batch Order Screen  │
│  ┌───────────────┐  │
│  │     MAP       │  │
│  │   1  2  3     │  │
│  │     4  5      │  │
│  └───────────────┘  │
│  Progress: 0/5      │
│  ┌───────────────┐  │
│  │ Stop 1: Pickup│  │
│  │ Main Street   │  │
│  │ [Navigate]    │  │
│  └───────────────┘  │
│  Upcoming Stops...  │
└──────────┬──────────┘
           │
           ↓ Navigate to Stop 1
┌─────────────────────┐
│   Pickup Screen     │
│  • Merchant: Joe's  │
│  • Items: 3         │
│  • [Scan QR]        │
│  • [Confirm Pickup] │
└──────────┬──────────┘
           │
           ↓ Pickup confirmed
┌─────────────────────┐
│ Batch Order Screen  │
│  Progress: 1/5 ✓    │
│  ┌───────────────┐  │
│  │ Stop 2: Del.  │  │
│  │ Oak Avenue    │  │
│  │ [Navigate]    │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │
           ↓ Navigate to Stop 2
┌─────────────────────┐
│  Delivery Screen    │
│  • Customer: Alice  │
│  • Address: 123 Oak │
│  • [Take Photo]     │
│  • [Complete]       │
└──────────┬──────────┘
           │
           ↓ Delivery confirmed
┌─────────────────────┐
│ Batch Order Screen  │
│  Progress: 2/5 ✓✓   │
│  Next: Stop 3...    │
└──────────┬──────────┘
           │
           ↓ Continue for stops 3-5
┌─────────────────────┐
│ Batch Order Screen  │
│  Progress: 5/5 ✓✓✓✓✓│
│  ┌───────────────┐  │
│  │ 🎉 Complete!  │  │
│  │ Earned: $45   │  │
│  │ [View Summary]│  │
│  └───────────────┘  │
└──────────┬──────────┘
           │
           ↓ Return to dashboard
┌─────────────────────┐
│  Driver Dashboard   │
│  • +$45 earnings    │
│  • +5 deliveries    │
└─────────────────────┘
```

## Component Hierarchy

```
App
└── NavigationStack
    ├── DashboardScreen
    │   └── IncomingOrderModal
    │       └── [Accept Route] → BatchOrderScreen
    │
    ├── BatchOrderScreen
    │   ├── UniversalMapView (shows route)
    │   ├── Progress Bar
    │   ├── Summary Card (distance, time, earnings)
    │   ├── StopProgressCard (current stop)
    │   │   ├── Stop info
    │   │   ├── Contact details
    │   │   └── Action buttons
    │   ├── Upcoming Stops List
    │   ├── Completed Stops List
    │   └── [Navigate Button]
    │
    ├── PickupScreen (for pickup stops)
    │   ├── Map
    │   ├── Merchant info
    │   ├── Order details
    │   └── [Confirm Pickup] → Back to BatchOrderScreen
    │
    └── DeliveryScreen (for delivery stops)
        ├── Map
        ├── Customer info
        ├── Photo capture
        └── [Complete Delivery] → Back to BatchOrderScreen
```

## Data Flow

```
1. Batch Notification
   ┌──────────────┐
   │ Backend Push │
   └──────┬───────┘
          ↓
   ┌──────────────────┐
   │ IncomingOrderModal│
   │ order: {          │
   │   type: 'batch'   │
   │   current_batch   │
   │   orders: [...]   │
   │ }                 │
   └──────┬───────────┘

2. Route Optimization
   ┌──────────────────┐
   │ Accept Batch     │
   └──────┬───────────┘
          ↓
   ┌──────────────────────┐
   │ routeOptimization    │
   │ Service              │
   │ • Get batch data     │
   │ • Get driver location│
   │ • Optimize route     │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ OptimizedRoute       │
   │ {                    │
   │   batchId,           │
   │   driverLocation,    │
   │   stops: [{          │
   │     sequence: 1,     │
   │     orderId,         │
   │     stopType,        │
   │     address,         │
   │     lat, lng,        │
   │     eta, distance    │
   │   }],                │
   │   totalDistanceKm,   │
   │   totalDurationMin   │
   │ }                    │
   └──────┬───────────────┘

3. Stop Tracking
   ┌──────────────────────┐
   │ BatchOrderScreen     │
   │ State:               │
   │ • currentStopIndex   │
   │ • completedStops     │
   │ • optimizedRoute     │
   └──────┬───────────────┘
          ↓
   ┌──────────────────────┐
   │ Complete Stop        │
   │ → Update API         │
   │ → Add to completed   │
   │ → Increment index    │
   │ → Refresh UI         │
   └──────────────────────┘
```

## State Management

```
BatchOrderScreen State:
┌─────────────────────────────┐
│ optimizedRoute              │
│ ├─ batchId                  │
│ ├─ driverLocation           │
│ ├─ stops[]                  │
│ └─ totals                   │
├─────────────────────────────┤
│ currentStopIndex: number    │
├─────────────────────────────┤
│ completedStops: Set<string> │
├─────────────────────────────┤
│ loading: boolean            │
└─────────────────────────────┘

Progress Calculation:
completed / total = percentage
Example: 2 / 5 = 40%

Current Stop:
stops[currentStopIndex]

Next Stop:
stops[currentStopIndex + 1]

Remaining Distance:
sum(stops[currentStopIndex..end].distance)

Remaining Time:
sum(stops[currentStopIndex..end].eta)
```

## API Integration Points

```
1. Load Batch
   GET /api/v1/batches/{batchId}/
   ↓
   Returns: {
     id, orders, pickup_*, ...
   }

2. Accept Batch
   POST /api/v1/batches/{batchId}/accept/
   ↓
   Returns: {
     success, message
   }

3. Update Stop Status
   POST /api/v1/deliveries/{orderId}/update-status/
   Body: { status, latitude, longitude, timestamp }
   ↓
   Returns: {
     success, order
   }

4. Complete Batch (automatic)
   When last stop completed
   ↓
   Navigate to Dashboard
```

## Route Optimization Algorithm

```
Input:
• Driver location (lat, lng)
• List of stops with (lat, lng, type, priority)

Process:
1. Separate pickups and deliveries
2. Group by priority (urgent > high > normal)
3. Sort each group by distance (nearest first)
4. Combine: all pickups → all deliveries
5. Calculate cumulative distance & time

Output:
• Ordered list of stops
• Total distance
• Total duration
• Individual ETAs

Example:
Stops: P1, P2, D1, D2, D3
Optimized: P1 (closest pickup)
         → P2 (next closest pickup)
         → D1 (closest delivery from P2)
         → D2 (next closest)
         → D3 (final)
```

## Error Handling Flow

```
┌─────────────────┐
│ Network Error   │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Show Alert      │
│ [Retry] [Cancel]│
└────────┬────────┘
         ↓
   User selects...
         ↓
┌─────────────────┐
│ Retry Operation │
│ or              │
│ Return to prev. │
└─────────────────┘

┌─────────────────┐
│ Location Error  │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Show Permission │
│ Request Dialog  │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Open Settings   │
│ or Use manual   │
│ optimization    │
└─────────────────┘
```

## Performance Considerations

```
Optimization Points:
├─ Map Rendering
│  └─ Memo markers, lazy load
├─ List Rendering
│  └─ FlatList with virtualization
├─ Location Updates
│  └─ Debounce (10s intervals)
├─ Route Calculation
│  └─ Cache results, background thread
└─ API Calls
   └─ Batch updates, retry logic
```

## Future Enhancements

```
Phase 2:
├─ Real-time traffic integration
├─ Dynamic route adjustment
├─ Multi-driver batch coordination
├─ Predictive ETA updates
├─ Customer notification per stop
└─ Advanced analytics

Phase 3:
├─ Machine learning optimization
├─ Weather-aware routing
├─ Capacity planning
├─ Driver preference learning
└─ Automated dispatch
```
