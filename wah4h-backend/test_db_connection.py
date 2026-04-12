#!/usr/bin/env python
"""
Test database connection with IPv4 and IPv6 diagnostics
"""
import os
import socket
import sys
from dotenv import load_dotenv

# Load environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Get Supabase connection details
db_host = os.getenv('DATABASE_HOST', 'localhost')
db_name = os.getenv('DATABASE_NAME', 'postgres')
db_user = os.getenv('DATABASE_USER', 'postgres')
db_password = os.getenv('DATABASE_PASSWORD', '')
db_port = int(os.getenv('DATABASE_PORT', '5432'))

print(f"Testing connection to: {db_host}:{db_port}")
print(f"Database: {db_name}")
print(f"User: {db_user}")
print()

# Test DNS resolution
print("=== DNS Resolution ===")
try:
    ipv4_addrs = socket.getaddrinfo(db_host, db_port, family=socket.AF_INET, type=socket.SOCK_STREAM)
    print(f"IPv4 addresses found: {ipv4_addrs}")
    if ipv4_addrs:
        ipv4_addr = ipv4_addrs[0][4][0]
        print(f"Using IPv4: {ipv4_addr}")
except socket.gaierror as e:
    print(f"IPv4 resolution failed: {e}")
    ipv4_addr = None

try:
    ipv6_addrs = socket.getaddrinfo(db_host, db_port, family=socket.AF_INET6, type=socket.SOCK_STREAM)
    print(f"IPv6 addresses found: {ipv6_addrs}")
except socket.gaierror as e:
    print(f"IPv6 resolution failed: {e}")

print()

# Test TCP connection with IPv4 if available
if ipv4_addr:
    print(f"=== Testing IPv4 Connection ===")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ipv4_addr, db_port))
        if result == 0:
            print(f"✓ TCP connection successful to {ipv4_addr}:{db_port}")
        else:
            print(f"✗ TCP connection failed to {ipv4_addr}:{db_port} (errno: {result})")
        sock.close()
    except Exception as e:
        print(f"✗ Error testing IPv4 connection: {e}")

# Test with psycopg2 if available
print()
print("=== Testing psycopg2 Connection ===")
try:
    import psycopg2

    # Try with hostname
    print("Attempting connection with hostname...")
    try:
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password,
            port=db_port,
            connect_timeout=5,
            sslmode='require'
        )
        print("✓ Connected successfully with hostname")
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"✗ Connection failed with hostname: {e}")

    # Try with IPv4 if available
    if ipv4_addr:
        print(f"Attempting connection with IPv4 ({ipv4_addr})...")
        try:
            conn = psycopg2.connect(
                host=ipv4_addr,
                database=db_name,
                user=db_user,
                password=db_password,
                port=db_port,
                connect_timeout=5,
                sslmode='require'
            )
            print(f"✓ Connected successfully with IPv4: {ipv4_addr}")
            print(f"SOLUTION: Use IPv4 address in DATABASE_HOST: {ipv4_addr}")
            conn.close()
        except psycopg2.OperationalError as e:
            print(f"✗ Connection failed with IPv4: {e}")

except ImportError:
    print("psycopg2 not installed, skipping psycopg2 tests")
    print("Install with: pip install psycopg2-binary")
