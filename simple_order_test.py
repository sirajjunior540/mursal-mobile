#!/usr/bin/env python3
"""
Simple Order Creation Script for Testing Mobile App
Creates basic orders that match the actual Order model fields.
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timedelta
import random

# Add the project root to Python path
sys.path.append('/Users/abdallah/Documents/mursal')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mursal.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from delivery.models import Customer, Order
from tenants.models import Client
from django_tenants.utils import schema_context

User = get_user_model()

# Dubai locations
DUBAI_LOCATIONS = [
    {"name": "Dubai Mall", "lat": 25.1972, "lng": 55.2744, "address": "Downtown Dubai, Dubai Mall"},
    {"name": "Dubai Marina", "lat": 25.0762, "lng": 55.1398, "address": "Dubai Marina Mall, Marina Walk"},
    {"name": "Business Bay", "lat": 25.1877, "lng": 55.2632, "address": "Business Bay Tower"},
    {"name": "JBR", "lat": 25.0690, "lng": 55.1310, "address": "Jumeirah Beach Residence"},
]

# Pickup locations
PICKUP_LOCATIONS = [
    {"name": "McDonald's Downtown", "lat": 25.1950, "lng": 55.2750, "address": "Sheikh Zayed Road, Downtown Dubai"},
    {"name": "KFC Marina", "lat": 25.0780, "lng": 55.1420, "address": "Dubai Marina Walk, Marina"},
    {"name": "Pizza Hut JBR", "lat": 25.0690, "lng": 55.1310, "address": "Jumeirah Beach Residence"},
]

def create_simple_order():
    """Create a simple order using only existing model fields."""
    
    tenant = Client.objects.get(schema_name='sirajjunior')
    
    with schema_context(tenant.schema_name):
        # Select random locations
        pickup_location = random.choice(PICKUP_LOCATIONS)
        delivery_location = random.choice(DUBAI_LOCATIONS)
        
        print(f"📍 Pickup: {pickup_location['name']}")
        print(f"🎯 Delivery: {delivery_location['name']}")
        
        # Create or get customer
        customer, created = Customer.objects.get_or_create(
            name="Ahmed Al Mansouri",
            defaults={
                'email': 'ahmed.mansouri@email.com',
                'phone': '+971 50 123 4567',
                'address': delivery_location['address'],
            }
        )
        
        if created:
            print(f"✅ Created new customer: {customer.name}")
        else:
            print(f"♻️ Using existing customer: {customer.name}")
        
        # Create order with only valid fields
        order = Order.objects.create(
            # Required fields
            order_number=f"MOB-{int(datetime.now().timestamp())}-{random.randint(100,999)}",
            customer=customer,
            
            # Financial details
            subtotal=Decimal('45.00'),
            delivery_fee=Decimal('12.00'),
            tax=Decimal('2.85'),
            total=Decimal('59.85'),
            
            # Delivery information
            delivery_address=delivery_location['address'],
            delivery_notes="Ring the doorbell twice",
            
            # Coordinates
            pickup_latitude=Decimal(str(pickup_location['lat'])),
            pickup_longitude=Decimal(str(pickup_location['lng'])),
            delivery_latitude=Decimal(str(delivery_location['lat'])),
            delivery_longitude=Decimal(str(delivery_location['lng'])),
            
            # Pickup information
            pickup_address=pickup_location['address'],
            pickup_contact_name=pickup_location['name'],
            pickup_contact_phone='+971 4 123 4567',
            
            # Delivery contact
            delivery_contact_name=customer.name,
            delivery_contact_phone=customer.phone,
            
            # Smart assignment fields
            delivery_type='food',
            priority='normal',
            package_size='medium',
            
            # Payment
            payment_method='cash',
            
            # Status
            status='pending',
        )
        
        print(f"\n📦 Order Created:")
        print(f"   Order Number: {order.order_number}")
        print(f"   Customer: {order.customer.name}")
        print(f"   Total: AED {order.total}")
        print(f"   Delivery Type: {order.delivery_type}")
        print(f"   Priority: {order.priority}")
        print(f"   Status: {order.status}")
        
        return order

def main():
    """Create multiple test orders."""
    print("🚀 Creating Simple Test Orders...")
    print("=" * 40)
    
    orders = []
    for i in range(3):
        print(f"\n📱 Creating order {i+1}/3...")
        order = create_simple_order()
        orders.append(order)
    
    print("\n" + "=" * 40)
    print("✅ Test completed!")
    print(f"📱 Created {len(orders)} orders:")
    
    for order in orders:
        print(f"   - {order.order_number}")
    
    print("\n📱 TEST MOBILE APP NOW:")
    print("1. Open DriverAppNew")
    print("2. Ensure driver is logged in and online")
    print("3. Check dashboard for new orders")
    print("4. Test smart assignment functionality")

if __name__ == "__main__":
    main()