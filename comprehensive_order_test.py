#!/usr/bin/env python3
"""
Comprehensive Order Creation Script for Testing Smart Assignment and Route Optimization.
Creates realistic delivery orders for multi-tenant mobile delivery apps.

Updated to work with unified User model where customers are users with role='customer'.
No longer requires separate Customer model.
"""

import os
import sys
import django
import random
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import connection

# Project path and setup
sys.path.append('/Users/abdallah/Documents/mursal')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mursal.settings.dev')
django.setup()

# Imports
from django.contrib.auth import get_user_model
from delivery.models import Order
from tenants.models import Client
from django_tenants.utils import schema_context

User = get_user_model()

# Sample data
DUBAI_LOCATIONS = [
    {"name": "Dubai Mall", "lat": 25.1972, "lng": 55.2744, "address": "Downtown Dubai, Dubai Mall"},
    {"name": "Palm Jumeirah", "lat": 25.1124, "lng": 55.1390, "address": "Palm Jumeirah, Atlantis"},
    {"name": "Business Bay", "lat": 25.1877, "lng": 55.2632, "address": "Business Bay Tower"},
]

PICKUP_LOCATIONS = [
    {"name": "McDonald's Downtown", "lat": 25.1950, "lng": 55.2750, "address": "Sheikh Zayed Road", "phone": "+97141234567"},
    {"name": "KFC Marina", "lat": 25.0780, "lng": 55.1420, "address": "Dubai Marina Walk", "phone": "+97142345678"},
]

MENU_ITEMS = [
    {"name": "Big Mac Meal", "price": 35.00, "category": "Burgers"},
    {"name": "French Fries", "price": 12.00, "category": "Sides"},
    {"name": "Coca Cola", "price": 8.00, "category": "Beverages"},
]

CUSTOMERS = [
    {"name": "Ahmed Al Mansouri", "phone": "+971501234567", "email": "ahmed.mansouri@email.com"},
    {"name": "Sarah Johnson", "phone": "+971522345678", "email": "sarah.johnson@email.com"},
]

def create_comprehensive_order(tenant):
    with schema_context(tenant.schema_name):
        # Randomize test data
        pickup = random.choice(PICKUP_LOCATIONS)
        delivery = random.choice(DUBAI_LOCATIONS)
        customer_data = random.choice(CUSTOMERS)
        menu = random.sample(MENU_ITEMS, random.randint(2, 3))

        # Ensure User exists with customer role
        customer, _ = User.objects.get_or_create(
            email=customer_data['email'],
            defaults={
                'username': customer_data['email'],
                'first_name': customer_data.get('name', '').split()[0] if customer_data.get('name') else '',
                'last_name': ' '.join(customer_data.get('name', '').split()[1:]) if customer_data.get('name') else '',
                'phone_number': customer_data.get('phone', ''),
                'role': 'customer',  # User is a customer type
                'is_active': True,
            }
        )


        # Financials
        subtotal = sum(item['price'] for item in menu)
        delivery_fee = round(random.uniform(8.0, 15.0), 2)
        tax = round(subtotal * 0.05, 2)
        total = subtotal + delivery_fee + tax

        # Generate order data
        order_number = f"MOB-{int(datetime.now().timestamp())}"
        status = 'pending'
        payment_method = random.choice(['cash', 'card', 'online'])
        payment_status = False
        delivery_type = random.choice(['regular', 'fast'])
        priority = random.choice(['low', 'normal', 'high'])
        package_size = 'medium'
        special_handling = 'none'
        estimated_preparation_time = 15  # Default value from the model
        scheduled_delivery_time = timezone.now() + timedelta(minutes=random.randint(30, 120))
        estimated_delivery_time = f"{random.randint(25, 45)} minutes"
        delivery_notes = random.choice(["Call when you arrive", "Leave at reception", ""])
        special_instructions = random.choice(["No onions", "Extra sauce", ""])
        pickup_instructions = ""  # Empty string for NOT NULL constraint
        created_at = timezone.now()
        updated_at = timezone.now()

        # Create order using raw SQL to avoid ORM issues
        with connection.cursor() as cursor:
            # Check which columns exist in the database
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'delivery_order'")
            db_columns = [row[0] for row in cursor.fetchall()]

            # Build SQL query with only columns that exist
            columns = []
            values = []
            params = []

            # Map field names to values
            field_values = {
                'customer_id': customer.id,
                'order_number': order_number,
                'status': status,
                'payment_status': payment_status,
                'pickup_address': pickup['address'],
                'pickup_latitude': pickup['lat'],
                'pickup_longitude': pickup['lng'],
                'pickup_contact_name': pickup['name'],
                'pickup_contact_phone': pickup['phone'],
                'pickup_instructions': pickup_instructions,
                'delivery_address': delivery['address'],
                'delivery_latitude': delivery['lat'],
                'delivery_longitude': delivery['lng'],
                'delivery_contact_name': customer.first_name,
                'delivery_contact_phone': customer.phone_number,
                'subtotal': subtotal,
                'delivery_fee': delivery_fee,
                'tax': tax,
                'total': total,
                'payment_method': payment_method,
                'delivery_type': delivery_type,
                'priority': priority,
                'package_size': package_size,
                'special_handling': special_handling,
                'estimated_preparation_time': estimated_preparation_time,
                'scheduled_delivery_time': scheduled_delivery_time,
                'estimated_delivery_time': estimated_delivery_time,
                'delivery_notes': delivery_notes,
                'special_instructions': special_instructions,
                'created_at': created_at,
                'updated_at': updated_at
            }

            # Only include fields that exist in the database
            for field, value in field_values.items():
                if field in db_columns:
                    columns.append(field)
                    values.append('%s')
                    params.append(value)

            # Create the SQL query
            sql = f"INSERT INTO delivery_order ({', '.join(columns)}) VALUES ({', '.join(values)}) RETURNING id"

            # Execute the query
            cursor.execute(sql, params)
            order_id = cursor.fetchone()[0]

            # Get the created order
            order = Order.objects.get(id=order_id)

        # Save items as JSON (requires JSONField on model)
        order.items = [
            {
                'name': item['name'],
                'quantity': random.randint(1, 2),
                'price': item['price'],
                'category': item['category'],
                'total': item['price'] * random.randint(1, 2),
            }
            for item in menu
        ]
        order.save()

        return order

def test_smart_assignment():
    print("\n🎯 Testing Smart Assignment System...")
    tenant = Client.objects.get(schema_name='sirajjunior')

    with schema_context(tenant.schema_name):
        # Check for drivers with role='driver'
        drivers = User.objects.filter(role='driver')
        print(f"📊 Total drivers: {drivers.count()}")
        
        # Check if drivers have is_available field
        available_drivers = []
        for driver in drivers:
            # Check if driver has is_available attribute or default to True
            is_available = getattr(driver, 'is_available', True)
            if is_available:
                available_drivers.append(driver)
        
        print(f"📊 Available drivers: {len(available_drivers)}")

        for driver in available_drivers:
            lat = getattr(driver, 'current_latitude', 'N/A')
            lng = getattr(driver, 'current_longitude', 'N/A')
            print(f"👤 {driver.get_full_name() or driver.username} | 📍 {lat}, {lng}")

    # Create and assign orders
    created_orders = []
    for i in range(3):
        print(f"\n🚀 Creating order {i+1}/3...")
        order = create_comprehensive_order(tenant)
        created_orders.append(order)

        try:
            from delivery.smart_assignment import SmartAssignmentEngine
            engine = SmartAssignmentEngine()
            result = engine.assign_order(order)

            if result['success']:
                print(f"✅ Order {order.order_number} assigned to {result['driver_name']}")
            else:
                print(f"❌ Order {order.order_number} assignment failed: {result.get('reason')}")
        except ImportError:
            print("⚠️ SmartAssignmentEngine not available.")
        except Exception as e:
            print(f"❌ Assignment error: {str(e)}")

    return created_orders

def main():
    print("🏁 Starting Comprehensive Order Test...")
    print("=" * 60)
    print("\n📋 This script creates test orders with customers as regular users (role='customer')")
    print("   No separate Customer model is required.\n")

    try:
        orders = test_smart_assignment()
        print("\n📱 Orders created successfully:")
        for order in orders:
            print(f"   - {order.order_number}")
        print("\n✅ Test complete. Open the DriverApp to see and accept these orders.")
        print("   Orders are created for tenant: sirajjunior")
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n💡 Tip: Make sure the Django backend is running and the database is properly configured.")

if __name__ == "__main__":
    main()
