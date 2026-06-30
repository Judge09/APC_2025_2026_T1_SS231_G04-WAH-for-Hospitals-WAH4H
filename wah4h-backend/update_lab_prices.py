import os
import django
import sys

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wah4h.settings')
django.setup()

from laboratory.models import LabTestDefinition

def update_prices():
    print("--- Updating Lab Test Prices (Monitoring Module Alignment) ---")
    
    # Validation: Remove conflicting test data from reproduction scripts
    conflicting = LabTestDefinition.objects.filter(code="TEST-CBC").first()
    if conflicting:
        print(f"Removing conflicting test data: {conflicting.code} ({conflicting.identifier})")
        conflicting.delete()

    # Refined list to match Monitoring Module's selection
    updates = [
        {"code": "cbc", "name": "Complete Blood Count", "price": 180.00, "category": "Hematology"},
        {"code": "blood_typing", "name": "Blood Typing", "price": 100.00, "category": "Hematology"},
        {"code": "urinalysis", "name": "Urinalysis", "price": 60.00, "category": "Clinical Microscopy"},
        {"code": "fecalysis", "name": "Fecalysis", "price": 60.00, "category": "Clinical Microscopy"},
        {"code": "fbs", "name": "Fasting Blood Sugar", "price": 100.00, "category": "Clinical Chemistry"},
        {"code": "rbs", "name": "Random Blood Sugar", "price": 100.00, "category": "Clinical Chemistry"},
    ]
    
    # Track existing codes to handle cleanup of orphaned definitions if needed
    updated_codes = [t["code"] for t in updates]
    
    for test in updates:
        obj, created = LabTestDefinition.objects.update_or_create(
            code=test["code"],
            defaults={
                "identifier": f"DEF-{test['code'].upper()}",
                "name": test["name"],
                "base_price": test["price"],
                "category": test["category"]
            }
        )
        action = "CREATED" if created else "UPDATED"
        print(f"[{action}] {obj.name} ({obj.code}) -> P{obj.base_price}")

    # Clean up tests that were in previous scripts but aren't in the core 6
    # This keeps the "Laboratory" lookup clean as per "simpler approach"
    orphans = LabTestDefinition.objects.exclude(code__in=updated_codes)
    if orphans.exists():
        print(f"--- Cleaning up {orphans.count()} non-standard laboratory definitions ---")
        orphans.delete()

if __name__ == '__main__':
    try:
        update_prices()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
