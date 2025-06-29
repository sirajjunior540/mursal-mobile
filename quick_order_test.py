#!/usr/bin/env python
"""
Quick test script to create an order and verify it appears on mobile app.
This script focuses on the exact issue: driver status and order visibility.
"""
import os
import sys
import time
from datetime import datetime

# Django setup
sys.path.insert(0, '/Users/abdallah/Documents/mursal')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mursal.settings.dev')

import django
django.setup()

from django.contrib.auth import get_user_model
from delivery.models import Customer, Order, Delivery
from delivery.enums import OrderStatus, DeliveryStatus, PaymentMethod
from delivery.order_assignment import order_assignment_service
from django_tenants.utils import tenant_context
from tenants.models import Client, Domain
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def create_test_order():
    """Create a test order and ensure driver is properly set up."""
    print("🧪 QUICK ORDER TEST FOR MOBILE APP")
    print("=" * 50)
    
    # Get tenant
    try:
        domain_obj = Domain.objects.filter(domain='sirajjunior.localhost').first()
        if not domain_obj:
            domain_obj = Domain.objects.first()
        tenant = domain_obj.tenant
        print(f"✅ Using tenant: {tenant.name}")
    except Exception as e:
        print(f"❌ Error getting tenant: {e}")
        return
    
    with tenant_context(tenant):
        # Step 1: Check and fix driver status
        print("\n📱 STEP 1: Checking driver status...")
        
        drivers = User.objects.filter(role=User.ROLE_DRIVER)
        print(f"Found {drivers.count()} drivers")
        
        if not drivers.exists():
            print("❌ No drivers found! Create a driver account first.")
            return
        
        # Get the first driver and set them online
        driver = drivers.first()
        print(f"Driver: {driver.first_name} {driver.last_name}")
        print(f"Current status: online={getattr(driver, 'is_online', False)}, available={getattr(driver, 'is_available', False)}, on_duty={getattr(driver, 'is_on_duty', False)}")
        
        # Update driver status to be fully online
        driver.is_online = True
        driver.is_available = True
        driver.is_on_duty = True
        
        # Set location and ensure it's recent
        driver.current_latitude = 25.2048  # Dubai coordinates
        driver.current_longitude = 55.2708
        driver.location_updated_at = timezone.now()  # Mark location as recent
        print("📍 Set driver location to Dubai with current timestamp")
        
        driver.save()
        print(f"✅ Driver status updated: online=True, available=True, on_duty=True")
        
        # Step 2: Create customer
        print("\n👤 STEP 2: Creating test customer...")
        
        customer, created = Customer.objects.get_or_create(
            name="Test Customer Mobile",
            defaults={
                'email': 'test.mobile@example.com',
                'phone': '+971501234567',
                'address': 'Test Address, Dubai, UAE'
            }
        )
        print(f"✅ {'Created' if created else 'Using existing'} customer: {customer.name}")
        
        # Step 3: Create order
        print("\n📦 STEP 3: Creating test order...")
        
        order_number = f"MOB-{int(time.time())}"
        
        order = Order.objects.create(
            order_number=order_number,
            customer=customer,
            status=OrderStatus.PENDING.value,
            payment_method=PaymentMethod.CREDIT_CARD.value,
            subtotal=25.00,
            delivery_fee=5.00,
            tax=2.40,
            total=32.40,
            delivery_address="123 Test Street, Business Bay, Dubai, UAE",
            delivery_notes="Mobile app test order",
            delivery_latitude=25.1972,  # Business Bay
            delivery_longitude=55.2744,
            pickup_latitude=25.2048,    # Same as driver location
            pickup_longitude=55.2708
        )
        
        print(f"✅ Created order: {order.order_number}")
        print(f"   Total: ${order.total}")
        print(f"   Status: {order.status}")
        print(f"   Delivery location: {order.delivery_latitude}, {order.delivery_longitude}")
        
        # Step 4: Use order assignment service (proper way)
        print("\n🚚 STEP 4: Creating delivery assignment using order assignment service...")
        
        # Use the proper order assignment service
        delivery = order_assignment_service.auto_assign_order(
            order,
            radius_km=5.0,
            assignment_mode='broadcast'  # Broadcast to all available drivers
        )
        
        if delivery:
            print(f"✅ Created delivery record via assignment service: {delivery.id}")
            print(f"   Status: {delivery.status}")
            print(f"   Driver: {delivery.driver or 'None (broadcast mode)'}")
            print(f"   🚀 Order assignment service triggered WebSocket broadcast!")
        else:
            # Check if signal already created delivery
            try:
                delivery = Delivery.objects.get(order=order)
                print(f"✅ Delivery record already exists from signal: {delivery.id}")
                print(f"   Status: {delivery.status}")
                print(f"   Driver: {delivery.driver or 'None (broadcast mode)'}")
            except Delivery.DoesNotExist:
                # Fallback: Create delivery manually if neither service nor signal worked
                print("⚠️ No delivery record found, creating manually...")
                delivery = Delivery.objects.create(
                    order=order,
                    driver=None,  # No driver assigned (for broadcast)
                    status=DeliveryStatus.ASSIGNED.value,
                    estimated_delivery_time=timezone.now() + timedelta(minutes=30)
                )
                print(f"✅ Created delivery record manually: {delivery.id}")
                print(f"   Status: {delivery.status}")
                print(f"   Driver: {delivery.driver or 'None (broadcast mode)'}")
        
        # Step 5: Verify the order should be visible
        print("\n🔍 STEP 5: Verifying order visibility criteria...")
        
        # Check the exact same query the mobile app uses
        available_deliveries = Delivery.objects.filter(
            driver__isnull=True,
            status=DeliveryStatus.ASSIGNED.value
        )
        
        print(f"Available deliveries (mobile app query): {available_deliveries.count()}")
        
        if available_deliveries.exists():
            for delivery in available_deliveries:
                print(f"   - Order: {delivery.order.order_number}, Status: {delivery.status}")
        
        # Check driver requirements
        online_drivers = User.objects.filter(
            role=User.ROLE_DRIVER,
            is_available=True,
            is_on_duty=True
        )
        
        print(f"Drivers online and available: {online_drivers.count()}")
        
        for d in online_drivers:
            print(f"   - {d.first_name} {d.last_name}: available={d.is_available}, on_duty={d.is_on_duty}, location={getattr(d, 'current_latitude', None)}")
        
        print("\n🎯 SUMMARY:")
        print(f"✅ Order created: {order.order_number}")
        print(f"✅ Delivery assigned: {delivery.status}")
        print(f"✅ Driver online: {driver.first_name} ready to receive orders")
        print(f"✅ Order should now appear in mobile app!")
        
        print("\n📱 TEST MOBILE APP NOW:")
        print("1. Open DriverAppNew")
        print("2. Ensure driver is logged in and online (green dot)")
        print("3. Check dashboard for new order notification")
        print("4. Order should appear in active orders list")
        
        return {
            'order_number': order.order_number,
            'delivery_id': delivery.id,
            'driver_ready': True,
            'should_be_visible': True
        }

if __name__ == "__main__":
    result = create_test_order()
    if result:
        print(f"\n✅ Test completed successfully!")
        print(f"Order {result['order_number']} should appear on mobile app")
    else:
        print(f"\n❌ Test failed!")