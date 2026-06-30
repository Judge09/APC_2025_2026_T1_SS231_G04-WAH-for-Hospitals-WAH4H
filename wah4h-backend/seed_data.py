import os
import django
import random
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wah4h.settings')
django.setup()

from laboratory.models import LabTestDefinition, DiagnosticReport
from pharmacy.models import Inventory, MedicationRequest
from billing.models import Invoice

def seed_data():
    print("Seeding Data for Alignment...")
    with open('seed_output.txt', 'w') as f:
        f.write("Seeding Data for Alignment...\n")

        # --- 1. Seed Lab Definitions ---
        lab_tests = [
            {"code": "cbc", "name": "Complete Blood Count", "price": 180.00, "category": "Hematology"},
            {"code": "urinalysis", "name": "Urinalysis", "price": 60.00, "category": "Clinical Microscopy"},
            {"code": "fecalysis", "name": "Fecalysis", "price": 60.00, "category": "Clinical Microscopy"},
            {"code": "blood-typing", "name": "Blood Typing", "price": 100.00, "category": "Immunohematology"},
            {"code": "fbs", "name": "Fasting Blood Sugar", "price": 100.00, "category": "Clinical Chemistry"},
            {"code": "chest-xray", "name": "Chest X-Ray PA View", "price": 300.00, "category": "Radiology"},
        ]

        # Debug LabTestDefinition fields
        f.write(f"DEBUG: LabTestDefinition fields: {[field.name for field in LabTestDefinition._meta.get_fields()]}\n")

        for test in lab_tests:
            try:
                obj, created = LabTestDefinition.objects.get_or_create(
                    code=test["code"],
                    defaults={
                        "identifier": f"DEF-{test['code']}",
                        "name": test["name"],
                        "base_price": test["price"],
                        "category": test["category"]
                    }
                )
                if created:
                    f.write(f"Created LabTestDefinition: {test['code']}\n")
                else:
                    f.write(f"Updated LabTestDefinition: {test['code']}\n")
                    obj.base_price = test["price"]
                    obj.save()
            except Exception as e:
                f.write(f"Error creating {test['code']}: {e}\n")

        # --- 2. Seed Pharmacy Inventory ---
        meds = [
            {"code": "MED-001", "name": "Paracetamol 500mg", "price": 5.00, "stock": 1000},
            {"code": "MED-002", "name": "Amoxicillin 500mg", "price": 15.00, "stock": 500},
            {"code": "MED-003", "name": "Mefenamic Acid 500mg", "price": 10.00, "stock": 200},
        ]

        created_meds = []
        for med in meds:
            # Inventory does NOT have identifier, generic_name
            try:
                obj, created = Inventory.objects.get_or_create(
                    item_code=med["code"],
                    defaults={
                        "item_name": med["name"],
                        "unit_cost": med["price"],
                        "current_stock": med["stock"],
                        "status": "active",
                        "batch_number": f"BATCH-{random.randint(1000,9999)}",
                        "expiry_date": (timezone.now() + timezone.timedelta(days=365)).date()
                    }
                )
                created_meds.append(obj)
                if created:
                    f.write(f"Created Inventory: {med['code']}\n")
                else:
                    f.write(f"Matches Inventory: {med['code']}\n")
            except Exception as e:
                f.write(f"Error creating Inventory {med['code']}: {e}\n")

        # --- 3. Seed Valid Lab Requests (if needed) ---
        # We already have pending requests from check_data.py output (11 reports)
        # They should now pick up the definitions we just created.

        # --- 4. Seed Valid Medication Request ---
        # Create a request for Paracetamol
        subject_id = 1 # Assuming patient 1 exists
        med_code = "MED-001"
        
        # Check if we already have a pending request for this to avoid duplicates in this run
        existing_req = MedicationRequest.objects.filter(
            subject_id=subject_id, 
            medication_code=med_code, 
            billing_reference__isnull=True
        ).exists()

        if not existing_req:
            try:
                MedicationRequest.objects.create(
                    identifier=f"REQ-{med_code}-{subject_id}",
                    subject_id=subject_id,
                    encounter_id=1,
                    medication_code=med_code,
                    medication_display="Paracetamol 500mg",
                    status="active",
                    intent="order",
                    dispense_quantity=10, # 10 tablets
                    authored_on=timezone.now()
                )
                f.write(f"Created MedicationRequest for {med_code} (Qty: 10)\n")
            except Exception as e:
                f.write(f"Error creating MedicationRequest: {e}\n")
        else:
            f.write(f"Pending MedicationRequest for {med_code} already exists.\n")

        f.write("\nData Seeding Complete.\n")

if __name__ == "__main__":
    seed_data()
