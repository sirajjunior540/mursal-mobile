# Delivery Screen Implementation Guide

## Overview
The Delivery Screen has been successfully implemented for the Murrsal Driver App. This screen is displayed after a driver picks up an order and needs to deliver it to the customer.

## Files Created

### 1. DeliveryScreen Component
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/src/screens/DeliveryScreen.tsx`

**Features:**
- Customer information display (name, address, phone)
- Real-time distance and ETA calculation
- Navigation integration (Google Maps)
- Quick action buttons (Call, Message, Navigate, Report Issue)
- Cash on Delivery (COD) amount display
- Delivery instructions display
- Proximity detection (must be within 100m to confirm delivery)
- Photo proof of delivery
- QR code verification support
- Issue reporting system

**Key Functionality:**
- Automatically calculates distance from driver's current location to delivery address
- Updates every 10 seconds
- Enables "Arrived at Delivery" button when within 100m
- Requires photo proof before completing delivery
- Supports QR code scanning for delivery verification

### 2. DeliveryPhotoCapture Component
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/src/components/DeliveryPhotoCapture.tsx`

**Features:**
- Photo capture with preview
- Retake functionality
- Automatic image compression to under 500KB
- Different delivery types support (contactless, in-person, left-at-door)
- Tips and guidelines for taking good photos

### 3. Navigation Integration
**Location:** `/home/abdallah/Documents/repo/murrsal-microservices/mobile/driver-app/App.tsx`

**Changes Made:**
- Added `DeliveryScreen` import
- Added route to `RootStackParamList` type definition
- Added `Stack.Screen` for DeliveryScreen with slide animation

## Navigation Flow

### Current Flow
1. Driver accepts an order → PickupScreen
2. Driver picks up order (status: `picked_up`)
3. **NEW:** Navigate to DeliveryScreen
4. Driver delivers order (status: `delivered`)

### How to Navigate to DeliveryScreen

After a driver completes pickup (marks order as `picked_up`), navigate to DeliveryScreen:

```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// After successful pickup
navigation.navigate('DeliveryScreen', {
  order: orderObject
});
```

### Example Integration in CurrentStopCard

When the driver marks a pickup as complete, you can add navigation:

```typescript
const handleStatusUpdate = async (orderId: string, newStatus: string) => {
  const success = await updateOrderStatus(orderId, newStatus);

  if (success && newStatus === 'picked_up') {
    // Navigate to delivery screen after successful pickup
    navigation.navigate('DeliveryScreen', {
      order: order
    });
  }
};
```

## API Endpoints Used

### 1. Delivery Completion
**Endpoint:** `POST /api/v1/orders/{orderId}/deliver/`

**Request Body:**
```json
{
  "verification_type": "photo",
  "photo_data": "base64_string",
  "current_location": {
    "lat": 24.7136,
    "lng": 46.6753
  }
}
```

**Note:** The current implementation uses the existing `updateOrderStatus` function which calls the standard status update endpoint. The delivery endpoint mentioned above can be added as an enhancement.

### 2. Issue Reporting
**Endpoint:** `POST /api/v1/orders/{orderId}/report-issue/`

**Request Body:**
```json
{
  "issue_type": "customer_not_available",
  "notes": "Customer did not answer door or phone",
  "latitude": 24.7136,
  "longitude": 46.6753
}
```

### 3. Photo Upload
The photo upload is handled by the existing `photoService.uploadDeliveryPhoto()` function which calls:

**Endpoint:** `POST /api/v1/orders/{orderId}/upload-photo/`

**Form Data:**
- `photo`: File
- `reason`: String
- `notes`: String
- `latitude`: Number
- `longitude`: Number
- `alternate_recipient_name`: String (optional)
- `alternate_recipient_relation`: String (optional)

## Issue Types Supported

1. **Customer Not Available** - Customer doesn't answer door/phone
2. **Wrong Address** - Address is incorrect or cannot be found
3. **Customer Refused** - Customer refuses to accept the order
4. **Order Damaged** - Package is damaged
5. **Other Issue** - Custom issue with notes

## Delivery Verification Methods

### 1. Photo Proof (Default)
- Required for most deliveries
- Automatically compressed to <500KB
- Uploaded with delivery location

### 2. QR Code Verification
- If order has `qr_code_id`, shows floating QR button
- Scans customer's QR code to verify delivery
- Matches against order's QR code ID

### 3. In-Person Delivery
- Optional signature capture (future enhancement)
- Photo still recommended

## Permissions Required

The DeliveryScreen requires the following permissions:
- **Location Services**: For distance calculation and proximity detection
- **Camera**: For delivery photo proof
- **Phone**: For calling customer
- **SMS**: For messaging customer

## Testing Checklist

- [ ] Navigation from PickupScreen to DeliveryScreen works
- [ ] Customer information displays correctly
- [ ] Distance and ETA calculate properly
- [ ] "Arrived at Delivery" button enables within 100m
- [ ] Photo capture works and compresses images
- [ ] QR code scanning works (if order has QR code)
- [ ] Call customer button works
- [ ] Message customer button works
- [ ] Navigate button opens Google Maps
- [ ] Issue reporting modal works
- [ ] COD amount displays when applicable
- [ ] Delivery instructions display when provided
- [ ] Delivery completion updates order status
- [ ] Navigation back to route works after delivery

## Integration Steps

### Step 1: Add Navigation After Pickup
In `CurrentStopCard.tsx` or wherever pickup completion is handled:

```typescript
import { useNavigation } from '@react-navigation/native';

// Inside component
const navigation = useNavigation();

// After pickup status update succeeds
if (newStatus === 'picked_up') {
  navigation.navigate('DeliveryScreen', { order });
}
```

### Step 2: Update RouteNavigationScreen
After delivery completion, the RouteNavigationScreen should automatically refresh and show the next order in the route.

### Step 3: Add to App Navigation (Already Done)
The DeliveryScreen has been added to the main navigation stack in `App.tsx`.

## Future Enhancements

1. **Map View Integration**
   - Add embedded map showing route to delivery location
   - Real-time driver location tracking on map
   - Traffic information

2. **Signature Capture**
   - Add signature pad for in-person deliveries
   - Save signature with delivery proof

3. **Multiple Delivery Types**
   - Warehouse deliveries
   - Batch deliveries
   - Return deliveries

4. **Enhanced QR Features**
   - Generate QR code for customer to scan driver's phone
   - Two-way verification

5. **Delivery Analytics**
   - Track average delivery time
   - Success rate metrics
   - Customer satisfaction ratings

6. **Offline Support**
   - Cache delivery information
   - Queue status updates when offline
   - Sync when connection restored

## Troubleshooting

### Issue: Distance not calculating
**Solution:** Ensure location permissions are granted and GPS is enabled

### Issue: Photo upload fails
**Solution:** Check network connection and API endpoint availability

### Issue: Cannot confirm delivery
**Solution:** Ensure driver is within 100m of delivery location

### Issue: Navigation doesn't open
**Solution:** Ensure Google Maps or a navigation app is installed

## Code Examples

### Basic Usage
```typescript
// Navigate to delivery screen
navigation.navigate('DeliveryScreen', {
  order: {
    id: 'order-123',
    order_number: 'ORD-12345',
    customer: {
      name: 'John Doe',
      phone: '+966501234567'
    },
    delivery_address: '123 Main St, Riyadh',
    delivery_latitude: 24.7136,
    delivery_longitude: 46.6753,
    delivery_instructions: 'Ring doorbell, apartment 3B',
    cash_on_delivery: true,
    cod_amount: 150.00,
    currency: 'SAR',
    qr_code_id: 'qr-abc123'
  }
});
```

### Handle Delivery Completion
```typescript
const handleDeliveryComplete = async (orderId: string, photoId?: string) => {
  try {
    await updateOrderStatus(orderId, 'delivered', photoId);
    Alert.alert('Success', 'Delivery completed!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  } catch (error) {
    Alert.alert('Error', 'Failed to complete delivery');
  }
};
```

## Architecture Decisions

### Why Separate DeliveryScreen?
- **Single Responsibility**: Focuses only on delivery, not pickup
- **Better UX**: Clear separation between pickup and delivery phases
- **Easier Maintenance**: Independent testing and updates
- **Scalability**: Can add delivery-specific features without affecting pickup

### Why Photo Proof Required?
- **Accountability**: Proof of delivery protects both driver and customer
- **Dispute Resolution**: Evidence in case of delivery disputes
- **Quality Control**: Ensures delivery standards are met

### Why 100m Range Check?
- **Location Accuracy**: GPS can have 10-50m accuracy
- **Building Size**: Large buildings may require walking distance
- **Flexibility**: Balances security with practicality

## Support

For questions or issues with the DeliveryScreen implementation:
1. Check this documentation
2. Review code comments in source files
3. Test in development environment first
4. Contact development team for additional support

## Version History

- **v1.0.0** (2025-12-05): Initial implementation
  - Basic delivery screen with all core features
  - Photo proof integration
  - QR code support
  - Issue reporting
  - Navigation integration
