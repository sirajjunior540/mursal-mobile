#!/usr/bin/env python3
"""
Quick fix for backend decline permission issue

This script fixes the decline endpoint in the backend to allow drivers to decline
available (unassigned) orders, not just orders already assigned to them.

Run this in your Django project root:
python backend_decline_fix.py
"""

import os
import sys
import re

def find_decline_view_file():
    """Find the file containing the decline view"""
    possible_paths = [
        'delivery/views.py',
        'delivery/api/views.py', 
        'delivery/api/delivery_views.py',
        'apps/delivery/views.py',
        'apps/delivery/api/views.py'
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r') as f:
                content = f.read()
                if 'decline' in content.lower() and 'delivery' in content.lower():
                    return path
    return None

def fix_decline_permission(file_path):
    """Fix the decline permission logic"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to find the problematic permission check
    pattern = r'if\s+delivery\.driver\s*!=\s*request\.user\.driver\s*:'
    
    if re.search(pattern, content):
        print(f"✅ Found decline permission issue in {file_path}")
        
        # Replace with correct logic
        fixed_content = re.sub(
            pattern,
            'if delivery.driver is not None and delivery.driver != request.user.driver:',
            content
        )
        
        # Also fix the error message if present
        fixed_content = re.sub(
            r'"You can only decline your own assigned deliveries\."',
            '"This delivery is already assigned to another driver."',
            fixed_content
        )
        
        # Create backup
        backup_path = f"{file_path}.backup"
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"📦 Created backup: {backup_path}")
        
        # Write fixed content
        with open(file_path, 'w') as f:
            f.write(fixed_content)
        
        print(f"🔧 Fixed decline permission logic in {file_path}")
        print("✅ Drivers can now decline available orders!")
        return True
    else:
        print(f"❌ Could not find decline permission issue in {file_path}")
        return False

def main():
    print("🔍 Looking for Django decline view...")
    
    file_path = find_decline_view_file()
    if not file_path:
        print("❌ Could not find decline view file. Please check these locations manually:")
        print("   - delivery/views.py")
        print("   - delivery/api/views.py")
        print("   - apps/delivery/views.py")
        print("")
        print("Look for code like:")
        print("   if delivery.driver != request.user.driver:")
        print("       return Response({'error': 'You can only decline your own assigned deliveries.'})")
        print("")
        print("And change it to:")
        print("   if delivery.driver is not None and delivery.driver != request.user.driver:")
        print("       return Response({'error': 'This delivery is already assigned to another driver.'})")
        return False
    
    print(f"📁 Found decline view in: {file_path}")
    
    success = fix_decline_permission(file_path)
    
    if success:
        print("")
        print("🎉 Backend decline issue fixed!")
        print("📱 Mobile app decline functionality should now work correctly.")
        print("🔄 You may need to restart your Django server.")
    
    return success

if __name__ == "__main__":
    main()