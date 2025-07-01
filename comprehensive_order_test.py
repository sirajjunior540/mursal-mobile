#!/usr/bin/env python3
"""
COMPREHENSIVE ORDER TESTING SUITE
Creates realistic delivery orders for testing ALL functionality using quick_create API:
- Smart Assignment Engine
- Multi-step Route Optimization  
- Different Delivery Types (food, fast, regular)
- Time Windows & Scheduling
- Payment Methods & COD
- Package Sizes & Special Handling
- Priority Systems
- Geographic Distribution

Updated to use quick_create API endpoint with admin:adminadmin123 authentication.
"""

import requests
import random
import json
from datetime import datetime, timedelta, time
from decimal import Decimal

# API Configuration
BASE_URL = "http://sirajjunior.localhost:8000"
API_USERNAME = "admin"
API_PASSWORD = "adminadmin123"

# Global session for API calls
session = requests.Session()

def authenticate():
    """Authenticate with the API using JWT token authentication"""
    # Use the correct JWT token endpoint
    token_url = f"{BASE_URL}/api/v1/auth/token/"

    data = {
        'username': API_USERNAME,
        'password': API_PASSWORD
    }

    try:
        print(f"🔍 Trying authentication endpoint: {token_url}")
        response = session.post(token_url, json=data)

        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access')

            if access_token:
                # Set JWT token in session headers with Bearer authentication
                session.headers.update({
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                })
                print("✅ API Authentication successful (JWT Bearer Token)")
                print(f"🔑 Access Token: {access_token[:30]}...")
                print(f"👤 User: {token_data.get('username')} ({token_data.get('role')})")
                return True
            else:
                print(f"❌ No access token found in response: {token_data}")
                return False
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return False

def create_order_via_api(order_data):
    """Create order using the quick_create API endpoint"""
    url = f"{BASE_URL}/api/v1/delivery/orders/quick_create/"

    try:
        response = session.post(url, json=order_data)
        if response.status_code == 201:
            return response.json()
        else:
            print(f"❌ Order creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Order creation error: {str(e)}")
        return None

# ==================== COMPREHENSIVE TEST DATA ====================

# Extended Ajman locations for geographic distribution testing
AJMAN_LOCATIONS = [
    # Ajman City Center
    {"name": "Ajman City Centre", "lat": 25.4052, "lng": 55.5136, "address": "Sheikh Khalifa Bin Zayed St, Ajman", "zone": "city_center"},
    {"name": "Ajman Corniche", "lat": 25.4103, "lng": 55.4452, "address": "Ajman Corniche, Ajman", "zone": "corniche"},
    {"name": "Ajman Beach", "lat": 25.4142, "lng": 55.4356, "address": "Ajman Beach, Ajman", "zone": "beach"},

    # Residential Areas
    {"name": "Al Nuaimiya", "lat": 25.3989, "lng": 55.4789, "address": "Al Nuaimiya, Ajman", "zone": "nuaimiya"},
    {"name": "Al Rashidiya", "lat": 25.3923, "lng": 55.4567, "address": "Al Rashidiya, Ajman", "zone": "rashidiya"},
    {"name": "Al Jurf", "lat": 25.3856, "lng": 55.4789, "address": "Al Jurf, Ajman", "zone": "jurf"},

    # Commercial Areas
    {"name": "Ajman Free Zone", "lat": 25.4023, "lng": 55.5289, "address": "Ajman Free Zone, Ajman", "zone": "free_zone"},
    {"name": "Ajman University", "lat": 25.3867, "lng": 55.4789, "address": "Ajman University, Ajman", "zone": "university"},

    # Other Areas
    {"name": "Mushairef", "lat": 25.3789, "lng": 55.4678, "address": "Mushairef, Ajman", "zone": "mushairef"},
    {"name": "Al Hamidiyah", "lat": 25.4256, "lng": 55.5367, "address": "Al Hamidiyah, Ajman", "zone": "hamidiyah"},
]

# Diverse pickup locations for different delivery types in Ajman
PICKUP_LOCATIONS = [
    # Fast Food (food delivery type)
    {"name": "McDonald's Ajman", "lat": 25.4056, "lng": 55.5142, "address": "Sheikh Khalifa Bin Zayed St, Ajman", "phone": "+97141234567", "type": "food"},
    {"name": "KFC Ajman", "lat": 25.4062, "lng": 55.5130, "address": "Ajman City Centre", "phone": "+97142345678", "type": "food"},
    {"name": "Burger King Ajman", "lat": 25.4048, "lng": 55.5125, "address": "Al Nuaimiya, Ajman", "phone": "+97143456789", "type": "food"},

    # Pharmacies (fast delivery type)
    {"name": "Aster Pharmacy Ajman", "lat": 25.4070, "lng": 55.5145, "address": "Sheikh Khalifa Bin Zayed St, Ajman", "phone": "+97141111111", "type": "fast"},
    {"name": "Life Pharmacy Ajman", "lat": 25.4058, "lng": 55.5138, "address": "Ajman City Centre", "phone": "+97142222222", "type": "fast"},

    # Regular stores (regular delivery type)
    {"name": "Carrefour Ajman", "lat": 25.4055, "lng": 55.5135, "address": "Ajman City Centre", "phone": "+97143333333", "type": "regular"},
    {"name": "Lulu Hypermarket Ajman", "lat": 25.3980, "lng": 55.4795, "address": "Al Nuaimiya, Ajman", "phone": "+97144444444", "type": "regular"},
]

# Comprehensive menu items with realistic pricing
MENU_ITEMS = {
    "food": [
        {"name": "Big Mac Meal", "price": 35.00, "category": "Burgers", "weight": 0.8},
        {"name": "Chicken Zinger", "price": 28.00, "category": "Chicken", "weight": 0.6},
        {"name": "Large Fries", "price": 12.00, "category": "Sides", "weight": 0.3},
        {"name": "Coca Cola 500ml", "price": 8.00, "category": "Beverages", "weight": 0.5},
        {"name": "Pizza Margherita", "price": 65.00, "category": "Pizza", "weight": 1.2},
        {"name": "Shawarma Plate", "price": 25.00, "category": "Arabic", "weight": 0.7},
    ],
    "fast": [
        {"name": "Panadol Extra", "price": 18.50, "category": "Medicine", "weight": 0.1},
        {"name": "Vitamin D3", "price": 45.00, "category": "Supplements", "weight": 0.2},
        {"name": "Hand Sanitizer", "price": 15.00, "category": "Health", "weight": 0.3},
        {"name": "Face Masks Box", "price": 25.00, "category": "Protection", "weight": 0.4},
    ],
    "regular": [
        {"name": "Office Chair", "price": 450.00, "category": "Furniture", "weight": 15.0},
        {"name": "Samsung TV 43\"", "price": 1200.00, "category": "Electronics", "weight": 12.5},
        {"name": "Grocery Bundle", "price": 180.00, "category": "Groceries", "weight": 8.0},
        {"name": "Books Set", "price": 85.00, "category": "Education", "weight": 2.5},
        {"name": "Clothing Package", "price": 120.00, "category": "Fashion", "weight": 1.5},
    ]
}

# Diverse customer profiles
CUSTOMERS = [
    {"name": "Ahmed Al Mansouri", "phone": "+971501234567", "email": "ahmed.mansouri@email.com", "preference": "cash"},
    {"name": "Sarah Johnson", "phone": "+971522345678", "email": "sarah.johnson@email.com", "preference": "card"},
    {"name": "Mohammed bin Rashid", "phone": "+971503456789", "email": "mohammed.rashid@email.com", "preference": "online"},
    {"name": "Emily Chen", "phone": "+971554567890", "email": "emily.chen@email.com", "preference": "cash"},
    {"name": "Hassan Abdullah", "phone": "+971505678901", "email": "hassan.abdullah@email.com", "preference": "card"},
    {"name": "Lisa Anderson", "phone": "+971556789012", "email": "lisa.anderson@email.com", "preference": "online"},
]

# Test scenarios configuration
ORDER_SCENARIOS = [
    {
        "name": "🍕 Peak Hour Food Rush",
        "delivery_type": "food",
        "priority": "high",
        "count": 8,
        "time_spread": 5,  # minutes between orders
        "description": "Simulates lunch rush with multiple food orders"
    },
    {
        "name": "💊 Emergency Pharmacy Run",
        "delivery_type": "fast", 
        "priority": "urgent",
        "count": 3,
        "time_spread": 2,
        "description": "Urgent medical supplies delivery"
    },
    {
        "name": "📦 Regular Delivery Mix", 
        "delivery_type": "regular",
        "priority": "normal",
        "count": 5,
        "time_spread": 15,
        "description": "Standard packages and items"
    },
    {
        "name": "🌍 Geographic Distribution Test",
        "delivery_type": "mixed",
        "priority": "mixed", 
        "count": 10,
        "time_spread": 8,
        "description": "Orders spread across all Ajman zones"
    }
]

def create_advanced_order(scenario_config=None, delivery_type_override=None, priority_override=None):
    """
    Create comprehensive test orders using quick_create API
    """
    # Determine delivery type and pickup location
    if delivery_type_override:
        delivery_type = delivery_type_override
    elif scenario_config and scenario_config.get('delivery_type') != 'mixed':
        delivery_type = scenario_config['delivery_type']
    else:
        delivery_type = random.choice(['food', 'fast', 'regular'])

    # Filter pickup locations by delivery type
    compatible_pickups = [p for p in PICKUP_LOCATIONS if p.get('type') == delivery_type]
    pickup = random.choice(compatible_pickups if compatible_pickups else PICKUP_LOCATIONS)

    # Select delivery location
    delivery_location = random.choice(AJMAN_LOCATIONS)
    customer_data = random.choice(CUSTOMERS)

    # Select appropriate menu items
    menu_items = MENU_ITEMS.get(delivery_type, MENU_ITEMS['regular'])
    menu = random.sample(menu_items, random.randint(1, min(3, len(menu_items))))

    # Calculate package details
    total_weight = sum(item.get('weight', 0.5) for item in menu)

    # Determine package size based on weight and delivery type
    if delivery_type == 'food':
        package_type = 'small_box' if total_weight < 2 else 'medium_box'
    elif delivery_type == 'fast':
        package_type = 'small_box'
    else:  # regular
        if total_weight < 2:
            package_type = 'small_box'
        elif total_weight < 5:
            package_type = 'medium_box' 
        elif total_weight < 10:
            package_type = 'large_box'
        else:
            package_type = 'extra_large_box'

    # Priority logic
    if priority_override:
        priority = priority_override
    elif scenario_config and scenario_config.get('priority') != 'mixed':
        priority = scenario_config['priority']
    else:
        # Smart priority based on delivery type
        if delivery_type == 'fast':
            priority = random.choice(['high', 'urgent'])
        elif delivery_type == 'food':
            priority = random.choice(['standard', 'high'])
        else:
            priority = random.choice(['low', 'standard'])

    # Map priority to API values
    priority_mapping = {
        'low': 'low',
        'normal': 'standard', 
        'standard': 'standard',
        'high': 'high',
        'urgent': 'urgent'
    }
    api_priority = priority_mapping.get(priority, 'standard')

    # Payment method mapping
    payment_mapping = {
        'cash': 'sender',
        'card': 'sender',
        'credit_card': 'sender',
        'debit_card': 'sender',
        'online': 'sender'
    }

    preferred_method = customer_data.get('preference', 'cash')
    payment_method = payment_mapping.get(preferred_method, 'sender')

    # Instructions based on delivery type
    delivery_instructions = {
        'food': ["Ring doorbell", "Leave at door", "Call when arrived", "Contactless delivery"],
        'fast': ["Signature required", "ID verification needed", "Hand to recipient only"],
        'regular': ["Call before delivery", "Leave with security", "Apartment delivery", "Ring doorbell twice"]
    }

    delivery_notes = random.choice(delivery_instructions.get(delivery_type, ["Standard delivery"]))

    pickup_instructions = random.choice([
        "Ask for manager", "Use delivery entrance", "Ring back door", "Call when arrived", ""
    ])

    # Generate unique reference number
    timestamp = int(datetime.now().timestamp())
    type_prefix = delivery_type.upper()[:1]  # F, R, or F (Fast)
    reference_number = f"{type_prefix}OB-{timestamp}-{random.randint(100, 999)}"

    # Build the order data for quick_create API
    order_data = {
        # Sender data (pickup location)
        'sender_name': pickup['name'],
        'sender_email': f"sender_{timestamp}@{pickup['name'].lower().replace(' ', '')}.com",
        'sender_phone': pickup['phone'],
        'pickup_address': pickup['address'],
        'pickup_latitude': pickup['lat'],
        'pickup_longitude': pickup['lng'],

        # Recipient data (delivery location)  
        'recipient_name': customer_data['name'],
        'recipient_email': customer_data.get('email', f"customer_{timestamp}@email.com"),
        'recipient_phone': customer_data['phone'],
        'recipient_address_line_1': f"{delivery_location['address']}, {delivery_location['zone'].title()} Zone",
        'recipient_city': 'Ajman',
        'recipient_state': 'Ajman',
        'recipient_postal_code': '00000',
        'delivery_latitude': delivery_location['lat'],
        'delivery_longitude': delivery_location['lng'],

        # Package data
        'package_type': package_type,
        'package_description': f"{delivery_type.title()} delivery: {', '.join([item['name'] for item in menu])}",
        'package_quantity': len(menu),
        'package_weight': round(total_weight, 2),
        'declared_value': round(sum(item['price'] for item in menu), 2),
        'is_fragile': delivery_type == 'fast' or random.choice([True, False, False]),
        'requires_signature': delivery_type == 'fast' or api_priority == 'urgent' or random.choice([True, False, False]),

        # Order details
        'reference_number': reference_number,
        'priority': api_priority,
        'payment_method': payment_method,
        'pickup_contact_name': pickup['name'],
        'pickup_contact_phone': pickup['phone'],
        'pickup_instructions': pickup_instructions,
        'delivery_instructions': delivery_notes,
        'assignment_radius_km': 5.0,
        'assignment_mode': 'nearest',
        'customer_notes': f"Test order for {delivery_type} delivery scenario"
    }

    # Create order via API
    result = create_order_via_api(order_data)
    if result:
        print(f"      ✅ Order created: {result.get('id', 'Unknown ID')} | {reference_number}")
        return result
    else:
        print(f"      ❌ Failed to create order: {reference_number}")
        return None


def run_scenario_test(scenario):
    """
    Run a specific test scenario using API
    """
    print(f"\n🎪 {scenario['name']}")
    print(f"   📝 {scenario['description']}")
    print(f"   🎯 Type: {scenario['delivery_type']} | Priority: {scenario['priority']} | Count: {scenario['count']}")

    created_orders = []

    for i in range(scenario['count']):
        print(f"\n   🚀 Creating order {i+1}/{scenario['count']}...")

        # Create order with scenario parameters
        order = create_advanced_order(
            scenario_config=scenario,
            delivery_type_override=None if scenario['delivery_type'] == 'mixed' else scenario['delivery_type'],
            priority_override=None if scenario['priority'] == 'mixed' else scenario['priority']
        )

        if order:
            created_orders.append(order)
            print(f"      📦 {order.get('reference_number', 'Unknown')} | {scenario['delivery_type'].upper()}")

        # Delay between orders if specified
        if i < scenario['count'] - 1 and scenario.get('time_spread'):
            import time
            print(f"      ⏱️ Waiting {scenario['time_spread']} seconds...")
            time.sleep(scenario['time_spread'])

    return created_orders

def test_comprehensive_scenarios():
    """
    Test all predefined scenarios using API
    """
    print("\n🎯 COMPREHENSIVE SCENARIO TESTING")
    print("=" * 60)

    all_orders = []

    # Run each scenario
    for scenario in ORDER_SCENARIOS:
        scenario_orders = run_scenario_test(scenario)
        all_orders.extend(scenario_orders)

        print(f"\n   📊 Scenario Complete: {len(scenario_orders)} orders created")
        print("-" * 40)

    return all_orders

def test_smart_assignment_limits():
    """
    Test smart assignment capacity and limits using API
    """
    print("\n⚖️ SMART ASSIGNMENT LIMITS TESTING")
    print("=" * 60)

    # Test capacity limits
    print("🧪 Testing driver capacity limits...")

    # Create many food orders to test the 2-food-order limit
    food_orders = []
    for i in range(5):
        order = create_advanced_order(delivery_type_override='food', priority_override='high')
        if order:
            food_orders.append(order)
            print(f"   🍕 Food order {i+1}: {order.get('reference_number', 'Unknown')}")

    # Create heavy regular orders to test weight capacity
    heavy_orders = []
    for i in range(3):
        order = create_advanced_order(delivery_type_override='regular', priority_override='standard')
        if order:
            heavy_orders.append(order)
            print(f"   📦 Heavy order {i+1}: {order.get('reference_number', 'Unknown')}")

    return food_orders + heavy_orders

def display_summary(all_orders):
    """
    Display comprehensive test summary
    """
    print("\n📊 COMPREHENSIVE TEST SUMMARY")
    print("=" * 60)

    print(f"📦 Total Orders Created: {len(all_orders)}")
    print(f"📱 All orders are now visible in the DriverApp!")
    print(f"🏢 Tenant: sirajjunior")
    print(f"🕐 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """
    Main comprehensive testing function
    """
    print("🏁 COMPREHENSIVE ORDER TESTING SUITE")
    print("=" * 60)
    print("🚀 Creating realistic orders using quick_create API")
    print("📋 Testing: Smart Assignment, Geographic Distribution, Priority Systems")
    print("🌍 Geographic Coverage: All Ajman zones")
    print("🔐 Authentication: Token-based via /auth/token/ (admin:adminadmin123)")
    print()

    # Authenticate first
    if not authenticate():
        print("❌ Authentication failed. Cannot proceed.")
        return

    try:
        all_created_orders = []

        # Run comprehensive scenario tests
        scenario_orders = test_comprehensive_scenarios()
        all_created_orders.extend(scenario_orders)

        # Test smart assignment limits
        limit_orders = test_smart_assignment_limits()
        all_created_orders.extend(limit_orders)

        # Display comprehensive summary
        display_summary(all_created_orders)

        print("\n✅ COMPREHENSIVE TESTING COMPLETE!")
        print("🔥 Ready to test all functionality in the DriverApp")

    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n💡 Ensure Django backend is running and API is accessible")

if __name__ == "__main__":
    main()
