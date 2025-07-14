#!/usr/bin/env python3
"""
Django IP Configuration Helper
Reads IP from .env and provides Django configuration
"""

import os
import re

def get_ip_from_env():
    """Read SERVER_IP from .env file"""
    env_path = '.env'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return None
    
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('SERVER_IP='):
                ip = line.strip().split('=')[1]
                return ip
    return None

def main():
    ip = get_ip_from_env()
    if not ip:
        print("❌ Could not find SERVER_IP in .env file")
        return
    
    print(f"🌐 Current IP: {ip}")
    print("=" * 50)
    
    print("\n📝 Django settings.py configuration:")
    print(f"""
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '{ip}',
    'sirajjunior.{ip}',
    '10.0.2.2',  # Android emulator
    # Add any additional hosts here
]

# If using django-cors-headers:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://{ip}:8081",
    "http://10.0.2.2:8081",  # Android emulator
]
""")
    
    print("\n🚀 Run Django server with:")
    print(f"python manage.py runserver {ip}:8000")
    print("\nor for all interfaces:")
    print("python manage.py runserver 0.0.0.0:8000")
    
    print("\n🧪 Test commands:")
    print(f"curl http://{ip}:8000/")
    print(f"curl -H 'Host: sirajjunior.{ip}' http://{ip}:8000/")
    
    print("\n📱 Mobile app configuration:")
    print(f"The mobile app will use: http://{ip}:8000")
    print("(This is automatically set from the .env file)")
    
    print("\n✅ If using nginx:")
    print(f"""
server {{
    listen 80;
    server_name {ip} sirajjunior.{ip};
    
    location / {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }}
}}
""")

if __name__ == "__main__":
    main()