#!/usr/bin/env python
"""
Debug script to test smart assignment logic
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
from django_tenants.utils import tenant_context
from tenants.models import Domain

User = get_user_model()

def test_smart_assignment():
    """Test smart assignment logic for debugging"""
    print("🔍 DEBUGGING SMART ASSIGNMENT LOGIC")
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
        print(f"   Available: {driver.is_available}")
        print(f"   On Duty: {driver.is_on_duty}")
        
        # Get available deliveries from database
        available_deliveries = Delivery.objects.filter(
            driver__isnull=True,
            status='assigned'
        ).select_related('order')
        
        print(f"\n📦 Found {available_deliveries.count()} deliveries in database")
        
        # Test each delivery with smart assignment
        for i, delivery in enumerate(available_deliveries):
            print(f"\n🔍 Testing Delivery {i+1}: ID={delivery.id}, Order={delivery.order.order_number}")
            
            # Test the order validation
            validation_result = smart_assignment_service._validate_order_for_assignment(delivery.order)
            print(f"   Validation: {'✅ VALID' if validation_result['valid'] else '❌ INVALID'}")
            if not validation_result['valid']:
                print(f"   Reason: {validation_result['reason']}")
                continue
            
            # Test if driver can accept
            eligibility = smart_assignment_service.can_accept_new_delivery(driver, delivery.order)
            print(f"   Eligibility: {'✅ CAN ACCEPT' if eligibility['can_accept'] else '❌ CANNOT ACCEPT'}")
            if not eligibility['can_accept']:
                print(f"   Reason: {eligibility['reason']}")
        
        # Test the full available orders method
        print(f"\n🎯 Testing smart_assignment_service.get_available_orders_for_driver()")
        eligible_orders = smart_assignment_service.get_available_orders_for_driver(driver)
        print(f"   Smart assignment returned: {len(eligible_orders)} orders")
        
        for order in eligible_orders:
            print(f"   - Order {order.order.order_number}: Delivery ID {order.id}")

if __name__ == "__main__":
    test_smart_assignment()