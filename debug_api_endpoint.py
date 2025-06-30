#!/usr/bin/env python
"""
Debug script to test API endpoint directly
"""
import os
import sys
from datetime import datetime

# Django setup
sys.path.insert(0, '/Users/abdallah/Documents/mursal')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mursal.settings.dev')

import django
django.setup()

from django.contrib.auth import get_user_model
from delivery.models import Order, Delivery
from delivery.smart_assignment import smart_assignment_service
from delivery.serializers import DeliveryWithOrderSerializer
from django_tenants.utils import tenant_context
from tenants.models import Domain

User = get_user_model()

def test_api_endpoint():
    """Test the API endpoint logic directly"""
    print("🔍 DEBUGGING API ENDPOINT LOGIC")
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
        driver = User.objects.filter(role=User.ROLE_DRIVER).first()
        if not driver:
            print("❌ No driver found!")
            return
        
        print(f"📱 Driver: {driver.first_name} {driver.last_name}")
        print(f"   Role: {driver.role}")
        print(f"   Available: {driver.is_available}")
        print(f"   On Duty: {driver.is_on_duty}")
        
        # Check role validation
        if driver.role != User.ROLE_DRIVER:
            print("❌ Role check failed!")
            return
        
        # Check availability
        if not driver.is_available or not driver.is_on_duty:
            print("❌ Driver not available or not on duty!")
            return
        
        # Get eligible deliveries using smart assignment
        print(f"\n🎯 Getting eligible deliveries...")
        try:
            eligible_deliveries = smart_assignment_service.get_available_orders_for_driver(driver)
            print(f"✅ Smart assignment returned: {len(eligible_deliveries)} deliveries")
        except Exception as e:
            print(f"❌ Smart assignment failed: {e}")
            return
        
        # Test serialization
        print(f"\n📝 Testing serialization...")
        try:
            serializer = DeliveryWithOrderSerializer(eligible_deliveries, many=True)
            data = serializer.data
            print(f"✅ Serialization successful: {len(data)} items")
            
            # Print first item for inspection
            if data:
                print(f"📋 First item keys: {list(data[0].keys())}")
                print(f"📋 First item order number: {data[0].get('order', {}).get('order_number', 'N/A')}")
        except Exception as e:
            print(f"❌ Serialization failed: {e}")
            import traceback
            traceback.print_exc()
            return
        
        print(f"\n✅ API endpoint logic test completed successfully!")
        print(f"   Should return {len(data)} orders to mobile app")

if __name__ == "__main__":
    test_api_endpoint()