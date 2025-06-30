#!/usr/bin/env python3
"""
Location Service Test Script
Tests if drivers are sending location updates to the backend.
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Add the project root to Python path
sys.path.append('/Users/abdallah/Documents/mursal')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mursal.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
from tenants.models import Client
from django_tenants.utils import schema_context

def check_driver_locations():
    """Check all drivers and their location data."""
    print("🔍 Checking Driver Location Status...")
    print("=" * 60)
    
    tenant = Client.objects.get(schema_name='sirajjunior')
    
    with schema_context(tenant.schema_name):
        drivers = User.objects.filter(role='driver')
        
        if not drivers.exists():
            print("❌ No drivers found in the system!")
            return
        
        print(f"👥 Found {drivers.count()} driver(s) in system:")
        print()
        
        for driver in drivers:
            print(f"👨‍💼 Driver: {driver.get_full_name()}")
            print(f"   ID: {driver.id}")
            print(f"   Email: {driver.email}")
            print(f"   Phone: {getattr(driver, 'phone', 'Not set')}")
            print(f"   Available: {driver.is_available}")
            print(f"   Online: {getattr(driver, 'is_online', 'Unknown')}")
            print(f"   On Duty: {getattr(driver, 'is_on_duty', 'Unknown')}")
            
            # Location information
            lat = getattr(driver, 'current_latitude', None)
            lng = getattr(driver, 'current_longitude', None)
            last_update = getattr(driver, 'last_location_update', None)
            
            if lat and lng:
                print(f"   📍 Location: {lat}, {lng}")
                
                if last_update:
                    time_diff = timezone.now() - last_update
                    minutes_ago = int(time_diff.total_seconds() / 60)
                    
                    print(f"   🕐 Last Update: {last_update.strftime('%Y-%m-%d %H:%M:%S')}")
                    print(f"   ⏰ Time Ago: {minutes_ago} minutes ago")
                    
                    # Check if location is recent (within 15 minutes)
                    if minutes_ago <= 15:
                        print(f"   ✅ Location is RECENT (within 15 min)")
                    elif minutes_ago <= 60:
                        print(f"   ⚠️ Location is OLD (within 1 hour)")
                    else:
                        print(f"   ❌ Location is VERY OLD (over 1 hour)")
                else:
                    print(f"   ❌ No last update timestamp")
            else:
                print(f"   ❌ No location data available")
            
            print()
        
        # Summary
        drivers_with_location = drivers.exclude(current_latitude__isnull=True, current_longitude__isnull=True)
        recent_locations = drivers.filter(
            current_latitude__isnull=False,
            current_longitude__isnull=False,
            last_location_update__gte=timezone.now() - timedelta(minutes=15)
        )
        
        print("📊 SUMMARY:")
        print(f"   Total Drivers: {drivers.count()}")
        print(f"   Drivers with Location: {drivers_with_location.count()}")
        print(f"   Drivers with Recent Location (15 min): {recent_locations.count()}")
        print(f"   Available Drivers: {drivers.filter(is_available=True).count()}")
        
        if recent_locations.count() == 0:
            print("\n❌ NO RECENT LOCATION UPDATES!")
            print("🔧 Troubleshooting steps:")
            print("   1. Ensure mobile app is running")
            print("   2. Check driver is logged in")
            print("   3. Verify driver has gone 'online'")
            print("   4. Check location permissions")
            print("   5. Verify API endpoint is working")
            print("   6. Check network connectivity")
        else:
            print(f"\n✅ {recent_locations.count()} driver(s) sending recent location updates!")

def simulate_driver_location():
    """Simulate a driver location update for testing."""
    print("\n🧪 Simulating Driver Location Update...")
    
    tenant = Client.objects.get(schema_name='sirajjunior')
    
    with schema_context(tenant.schema_name):
        driver = User.objects.filter(role='driver', is_available=True).first()
        
        if not driver:
            print("❌ No available driver found to test with!")
            return
        
        # Dubai coordinates (near Dubai Mall)
        test_lat = 25.1972
        test_lng = 55.2744
        
        # Update driver location
        driver.current_latitude = test_lat
        driver.current_longitude = test_lng
        driver.last_location_update = timezone.now()
        driver.save()
        
        print(f"✅ Updated driver {driver.get_full_name()}'s location")
        print(f"   Location: {test_lat}, {test_lng}")
        print(f"   Time: {timezone.now()}")
        print("\n🔄 Run the order test again to see if assignment works now!")

def main():
    """Main execution function."""
    print("🔍 Location Service Test")
    print("=" * 30)
    
    try:
        check_driver_locations()
        
        print("\n" + "=" * 60)
        
        # Ask if user wants to simulate location
        response = input("\n🤔 Simulate driver location for testing? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            simulate_driver_location()
            print("\n🔄 Checking locations again after simulation...")
            check_driver_locations()
            
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()