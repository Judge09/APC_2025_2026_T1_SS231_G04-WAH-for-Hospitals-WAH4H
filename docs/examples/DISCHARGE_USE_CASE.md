# Use Case: Manage Discharge

Use Case Name: Manage Discharge
Use Case ID : UC-09
Author : Pseudoers
Purpose: To manage the patient discharge workflow, ensuring all clinical, administrative, and billing requirements are met before finalizing a patient's stay.
Requirement Traceability: BR-03: Patient Admission and Discharge, BR-06: Patient Discharge and Follow-up
Priority: HIGH
Preconditions: 
- Patient has an active Inpatient Encounter (IM).
- User is authenticated as a Doctor, Nurse, or Administrator.
Postconditions: 
- Discharge record status updated to 'discharged'.
- Associated Encounter status updated to 'finished'.
- Discharge Summary (Diagnosis, Instructions, Follow-up) is persisted.
- Patient is removed from the Active Discharge Queue.
Actors: Doctor, Nurse

Flow of Actions: 
Basic Flow: Finalize Patient Discharge
1. User navigates to the Discharge Management dashboard.
2. System displays the "Active Discharge Queue" with pending or ready records.
3. User selects a patient for discharge processing (Sub-flow S1).
4. User updates the Discharge Requirements checklist (Sub-flow S2).
5. Doctor encodes final clinical documentation (Sub-flow S3).
6. User clicks "Complete Discharge" to finalize the process (Sub-flow S4).
7. User prints or exports the Discharge Report (Sub-flow S5).

Sub-flow S1: Active Queue Management
1. System auto-populates the queue when an Inpatient Encounter is created.
2. User clicks "Sync with Admissions" to manually pull any missing records from the Admission module.
3. User filters or searches the queue to identify patients ready for discharge.

Sub-flow S2: Requirements Checklist Update
1. User reviews the "Pending Discharge Items" checklist.
2. User checks off completed items:
   - Final Diagnosis Entered
   - Physician Signature Obtained
   - Medication Reconciliation Completed
   - Discharge Summary Encoded
   - Billing Clearance Received
3. System saves the checklist state and updates record status to 'ready' if all items are checked.

Sub-flow S3: Encode Clinical Documentation
1. Doctor opens the Discharge Modal.
2. Doctor enters **Final Diagnosis**.
3. Doctor enters **Summary of Hospital Stay**.
4. Doctor enters **Discharge Medications** and **Instructions**.
5. Doctor enters **Follow-up Plan** (appointments, tests).
6. System captures the inputs as part of the formal discharge summary.

Sub-flow S4: Finalize Discharge
1. User clicks "Complete Discharge".
2. System validates that all mandatory checklist items (Sub-flow S2) are fulfilled.
3. System updates the Discharge workflow status to 'discharged'.
4. System updates the associated Encounter status to 'finished' and sets the end date.

Sub-flow S5: Export Discharge Report
1. User navigates to the "Discharged Patients" tab.
2. User clicks the Print button for a selected patient.
3. System generates a formatted report including the diagnosis, stay summary, and follow-up instructions.

Alternative Flows: 
A1: Missing Mandatory Requirements
1. User attempts to "Complete Discharge" with unchecked items.
2. System blocks the action and displays an alert: "All required discharge items must be completed before final discharge".

Relationships: Extended from: UC-03 (Admit Patient), UC-08 (Manage Billing)
