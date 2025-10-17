#!/usr/bin/env python3
"""Test REM P 2025 API endpoints"""

import requests
import json

BASE_URL = "http://localhost:9292"

# Login
session = requests.Session()
login_data = {"username": "admin", "password": "Nubecita21.."}

print("🔐 Autenticando...")
response = session.post(f"{BASE_URL}/login", data=login_data, allow_redirects=False)

if response.status_code in [200, 302]:
    print("✅ Autenticación exitosa\n")

    # Test Sección A
    print("📊 Probando Sección A...")
    resp_a = session.get(f"{BASE_URL}/api/rem-p-2025/seccion-a")

    if resp_a.status_code == 200:
        data_a = resp_a.json()
        print("✅ Sección A respondió correctamente")
        print(f"   Total PSCV: {data_a['datos']['total_pscv']['totales']['total']}")
        print(f"   Total HTA: {data_a['datos']['hipertension']['totales']['total']}")
        print(f"   Total DM2: {data_a['datos']['diabetes_tipo2']['totales']['total']}")
        print("\n   Estructura completa:")
        print(json.dumps(data_a, indent=2, ensure_ascii=False)[:500] + "...\n")
    else:
        print(f"❌ Error {resp_a.status_code}: {resp_a.text[:200]}")

    # Test Sección B
    print("📊 Probando Sección B...")
    resp_b = session.get(f"{BASE_URL}/api/rem-p-2025/seccion-b")

    if resp_b.status_code == 200:
        data_b = resp_b.json()
        print("✅ Sección B respondió correctamente")
        print(f"   HTA Total: {data_b['datos']['hta']['total']}")
        print(f"   HTA Controlados: {data_b['datos']['hta']['controlados']}")
        print("\n   Estructura completa:")
        print(json.dumps(data_b, indent=2, ensure_ascii=False))
    else:
        print(f"❌ Error {resp_b.status_code}: {resp_b.text[:200]}")

else:
    print(f"❌ Error de autenticación: {response.status_code}")
    print(response.text[:200])
