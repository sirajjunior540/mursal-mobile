# Tenant Database Access and Order Data Flow Investigation

## 1. Django Management Commands for Tenant Database Access

### Using `tenant_context` to Access Tenant Data

```python
from django_tenants.utils import tenant_context
from tenants.models import Client, Domain

# Get tenant
domain_obj = Domain.objects.filter(domain='sirajjunior.192.168.100.51').first()
tenant = domain_obj.tenant

# Access tenant data
with tenant_context(tenant):
    # All database operations here will be in the tenant's schema
    orders = Order.objects.all()
    deliveries = Delivery.objects.all()
```

### Key Management Commands

1. **Check Current Schema**: `python manage.py check_schema`
   - Shows current schema and lists all tenants

2. **Test Schema Context**: `python manage.py test_schema_context`
   - Tests switching between tenant schemas

3. **Create Tenant**: `python manage.py create_tenant`
   - Creates a new tenant with domain

## 2. Order Model Structure and Fields

### Order Model (`delivery/models.py`)

```python
class Order(models.Model):
    # Core fields
    order_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    delivery_zone = models.ForeignKey(DeliveryZone, on_delete=models.SET_NULL, null=True)
    status = models.CharField(choices=OrderStatus.choices(), default=OrderStatus.PENDING.value)
    delivery_type = models.CharField(choices=DELIVERY_TYPE_CHOICES, default='regular')
    
    # Payment fields
    payment_method = models.CharField(choices=PaymentMethod.choices())
    payment_status = models.BooleanField(default=False)
    
    # Pricing fields
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=6, decimal_places=2)
    tax = models.DecimalField(max_digits=6, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Delivery information
    delivery_address = models.TextField()
    delivery_notes = models.TextField(blank=True)
    scheduled_delivery_date = models.DateField(null=True, blank=True)
    scheduled_delivery_time = models.TimeField(null=True, blank=True)
    
    # Location coordinates (important for mobile app)
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
```

### Key Pickup Location Fields
- `pickup_latitude`: Decimal field for pickup location latitude
- `pickup_longitude`: Decimal field for pickup location longitude
- These are optional fields (`null=True, blank=True`)

## 3. Frontend Order Creation Form

### Form Data Structure (`CustomerOrderForm.tsx`)

```typescript
interface OrderFormData {
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  pickup_address?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_type: 'regular' | 'food' | 'fast';
  special_instructions?: string;
  payment_method: 'cash' | 'card';
  estimated_value: number;
}
```

### Order Creation API Call

```typescript
// dashboardApi.ts
createOrder: async (orderData: any) => {
  return fetchWithAuth(`${API_BASE_URL}/api/v1/delivery/orders/`, {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}
```

## 4. Backend API Serializers for Order Creation

### OrderCreateSerializer (`delivery/serializers.py`)

```python
class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    
    class Meta:
        model = Order
        fields = [
            'order_number', 'customer', 'delivery_zone', 'status', 
            'payment_method', 'payment_status', 'subtotal', 'delivery_fee', 
            'tax', 'total', 'delivery_address', 'delivery_notes',
            'scheduled_delivery_date', 'scheduled_delivery_time', 'items'
        ]
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
            
        return order
```

**Note**: The serializer doesn't explicitly include pickup location fields, which might need to be added.

## 5. Mobile App Order Display Components

### Order Type Definition (`src/types/index.ts`)

```typescript
export interface Order {
  id: string;
  order_number: string;
  customer_details: Customer;
  items: OrderItem[];
  delivery_address: string;
  
  // Location coordinates
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  estimated_delivery_time?: string;
  delivery_notes?: string;
  created_at: Date;
}
```

### Order Details Screen (`OrderDetailsScreen.tsx`)
- Displays order information including pickup and delivery locations
- Provides navigation to pickup/delivery locations
- Updates order status through delivery workflow

## Key Findings and Recommendations

### 1. Missing Pickup Location Fields in Serializer
The `OrderCreateSerializer` doesn't include pickup location fields. These should be added:

```python
class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            # ... existing fields ...
            'pickup_latitude', 'pickup_longitude',  # Add these
            'delivery_latitude', 'delivery_longitude'  # Add these
        ]
```

### 2. Frontend Form Sends Location Data
The frontend form correctly sends pickup and delivery location data, but the backend serializer needs to accept these fields.

### 3. Mobile App Expects Location Data
The mobile app Order type includes location fields and the OrderDetailsScreen uses them for navigation.

### 4. Database Schema Per Tenant
Each tenant has its own database schema, accessed using `tenant_context`. All order data is isolated per tenant.

### 5. Order Flow
1. Frontend form collects order data including locations
2. API call to `/api/v1/delivery/orders/` with POST
3. Backend creates Order and triggers Delivery creation
4. Mobile app receives order via WebSocket/API
5. Driver can navigate using pickup/delivery coordinates

## Action Items

1. **Update OrderCreateSerializer** to include location fields
2. **Verify frontend is sending location data** in the POST request
3. **Check if order assignment service** uses pickup location for driver assignment
4. **Ensure mobile app receives** complete order data with locations
5. **Test order creation flow** with location data using the test script