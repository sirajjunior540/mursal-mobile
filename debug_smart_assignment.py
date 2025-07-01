#!/usr/bin/env python
"""
Comprehensive debug script to test route functionality and smart assignment logic
"""
import os
import sys
import json
import requests
from datetime import datetime

# Django setup
sys.path.insert(0, '/Users/abdallah/Documents/mursal')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mursal.settings.dev')

import django
django.setup()

from django.contrib.auth import get_user_model
from delivery.models import Order, Delivery
from delivery.smart_assignment import smart_assignment_service
from delivery.distance_service import distance_service
from django_tenants.utils import tenant_context
from tenants.models import Domain

User = get_user_model()

# Configuration
API_BASE_URL = 'http://sirajjunior.localhost:8000'
DRIVER_CREDENTIALS = {
    'username': 'driver',
    'password': 'admin'
}

def login_driver():
    """Login and get auth token"""
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/v1/auth/token/',
            headers={
                'Content-Type': 'application/json',
                'Host': 'sirajjunior.localhost'
            },
            json=DRIVER_CREDENTIALS,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('access'):
                print("✅ Driver login successful")
                return data['access']
        
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_mobile_api_flow(token):
    """Test the mobile app API flow for route screen"""
    print("\n🔍 TESTING MOBILE API FLOW")
    print("=" * 50)
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Host': 'sirajjunior.localhost',
        'Content-Type': 'application/json'
    }
    
    try:
        # Test 1: Fetch driver orders (main route screen API)
        print("\n1. 📋 Testing /api/v1/delivery/deliveries/by_driver/")
        response = requests.get(
            f'{API_BASE_URL}/api/v1/delivery/deliveries/by_driver/',
            headers=headers,
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            driver_orders = response.json()
            print(f"   ✅ Success: {len(driver_orders)} orders returned")
            
            # Analyze each order for route display
            route_eligible_orders = []
            for i, delivery in enumerate(driver_orders):
                order = delivery.get('order', {})
                has_pickup_location = bool(order.get('pickup_latitude') and order.get('pickup_longitude'))
                has_delivery_location = bool(order.get('delivery_latitude') and order.get('delivery_longitude'))
                has_location = has_pickup_location or has_delivery_location
                
                delivery_status = delivery.get('status', '')
                active_statuses = ['assigned', 'accepted', 'picked_up', 'in_transit']
                is_active = delivery_status in active_statuses
                
                should_show_on_route = is_active and has_location
                
                print(f"   📦 Order {i+1}: #{order.get('order_number', 'N/A')}")
                print(f"      Status: {delivery_status}")
                print(f"      Has Location: {has_location} (pickup: {has_pickup_location}, delivery: {has_delivery_location})")
                print(f"      Will Show on Route: {'✅ YES' if should_show_on_route else '❌ NO'}")
                
                if should_show_on_route:
                    route_eligible_orders.append(delivery)
            
            print(f"\n   📍 Final Result: {len(route_eligible_orders)} orders will show on route screen")
            
            # Test 2: Route optimization endpoint
            if route_eligible_orders:
                print("\n2. 🗺️ Testing /api/v1/delivery/route_optimization/")
                response = requests.get(
                    f'{API_BASE_URL}/api/v1/delivery/route_optimization/',
                    headers=headers,
                    timeout=10
                )
                
                print(f"   Status: {response.status_code}")
                if response.status_code == 200:
                    route_data = response.json()
                    print(f"   ✅ Route optimization success")
                    print(f"   Route steps: {len(route_data.get('route_steps', []))}")
                    print(f"   Total distance: {route_data.get('total_distance', 0)} km")
                    print(f"   Total time: {route_data.get('total_time', 0)} min")
                else:
                    print(f"   ❌ Route optimization failed: {response.text}")
            else:
                print("\n2. ⏭️ Skipping route optimization test (no eligible orders)")
        else:
            print(f"   ❌ Failed: {response.text}")
    
    except Exception as e:
        print(f"❌ Mobile API test error: {e}")

def test_smart_assignment():
    """Test smart assignment logic for debugging"""
    print("\n🔍 DEBUGGING SMART ASSIGNMENT LOGIC")
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
        # Get driver
        driver = User.objects.filter(role='driver').first()
        if not driver:
            print("❌ No driver found!")
            return
        
        print(f"📱 Driver: {driver.username}")
        print(f"   Available: {getattr(driver, 'is_available', 'N/A')}")
        print(f"   On Duty: {getattr(driver, 'is_on_duty', 'N/A')}")
        
        # Get driver's current deliveries to test food/fast restriction
        current_deliveries = Delivery.objects.filter(
            driver=driver,
            status__in=['assigned', 'accepted', 'picked_up', 'in_transit']
        ).select_related('order')
        
        print(f"\n📦 Current active deliveries: {current_deliveries.count()}")
        
        # Analyze current deliveries for food/fast types
        food_deliveries = []
        for delivery in current_deliveries:
            order_type = getattr(delivery.order, 'order_type', 'unknown')
            print(f"   - Delivery {delivery.id}: Order type = {order_type}")
            if order_type in ['food', 'fast']:
                food_deliveries.append(delivery)
        
        print(f"   🍕 Food/Fast deliveries: {len(food_deliveries)}")
        
        # Get available deliveries from database
        available_deliveries = Delivery.objects.filter(
            driver__isnull=True,
            status='assigned'
        ).select_related('order')
        
        print(f"\n📋 Found {available_deliveries.count()} unassigned deliveries")
        
        # Test smart assignment for each delivery
        for i, delivery in enumerate(available_deliveries[:5]):  # Limit to first 5 for readability
            print(f"\n🔍 Testing Delivery {i+1}: ID={delivery.id}")
            print(f"   Order: #{getattr(delivery.order, 'order_number', 'N/A')}")
            print(f"   Order type: {getattr(delivery.order, 'order_type', 'unknown')}")
            
            # Test smart assignment eligibility
            try:
                eligibility = smart_assignment_service.can_accept_new_delivery(driver, delivery.order)
                print(f"   Eligibility: {'✅ CAN ACCEPT' if eligibility['can_accept'] else '❌ CANNOT ACCEPT'}")
                if not eligibility['can_accept']:
                    print(f"   Reason: {eligibility['reason']}")
            except Exception as e:
                print(f"   ❌ Smart assignment test failed: {e}")
        
        # Test the full available orders method
        print(f"\n🎯 Testing get_available_orders_for_driver()")
        try:
            eligible_orders = smart_assignment_service.get_available_orders_for_driver(driver)
            print(f"   Smart assignment returned: {len(eligible_orders)} eligible orders")
            
            for order in eligible_orders[:3]:  # Show first 3
                order_obj = order.order if hasattr(order, 'order') else order
                print(f"   - Order #{getattr(order_obj, 'order_number', 'N/A')}: Delivery ID {order.id}")
        except Exception as e:
            print(f"   ❌ get_available_orders_for_driver failed: {e}")

def test_distance_calculation():
    """Test distance calculation service"""
    print("\n🔍 TESTING DISTANCE CALCULATION")
    print("=" * 50)
    
    try:
        domain_obj = Domain.objects.filter(domain='sirajjunior.localhost').first()
        if not domain_obj:
            domain_obj = Domain.objects.first()
        tenant = domain_obj.tenant
        
        with tenant_context(tenant):
            # Get driver location (mock coordinates)
            driver_lat = 25.2048
            driver_lng = 55.2708
            
            # Get some orders with coordinates
            orders_with_coords = Delivery.objects.filter(
                order__pickup_latitude__isnull=False,
                order__pickup_longitude__isnull=False
            ).select_related('order')[:3]
            
            print(f"Testing distance calculation for {orders_with_coords.count()} orders")
            
            for delivery in orders_with_coords:
                order = delivery.order
                pickup_lat = float(order.pickup_latitude)
                pickup_lng = float(order.pickup_longitude)
                
                try:
                    distance = distance_service.calculate_distance(
                        driver_lat, driver_lng, pickup_lat, pickup_lng
                    )
                    print(f"   Order #{order.order_number}: {distance:.2f} km from driver")
                except Exception as e:
                    print(f"   ❌ Distance calculation failed for order #{order.order_number}: {e}")
                    
    except Exception as e:
        print(f"❌ Distance calculation test error: {e}")

def main():
    """Main test function"""
    print("🚀 COMPREHENSIVE ROUTE & SMART ASSIGNMENT TEST")
    print("=" * 60)
    print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API Base URL: {API_BASE_URL}")
    
    # Step 1: Login and get token
    print("\n1. 🔐 AUTHENTICATION TEST")
    token = login_driver()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    # Step 2: Test mobile API flow
    test_mobile_api_flow(token)
    
    # Step 3: Test smart assignment logic
    test_smart_assignment()
    
    # Step 4: Test distance calculation
    test_distance_calculation()
    
    print(f"\n✅ All tests completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()