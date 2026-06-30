# Example Use Case: Admit Patient

Use Case Name: Admit Patient
Use Case ID : UC-03
Author : Pseudoers
Purpose: To record a patient's admission to the hospital, assign a location (bed/room), and initialize the clinical encounter.
Requirement Traceability: BR-03: Patient Admission and Discharge
Priority: HIGH
Preconditions: 
- Patient is registered in the system.
- User is authenticated as Nurse or Admissions Officer.
- Hospital locations/beds are configured.
Postconditions: 
- Patient status is updated to 'inpatient'.
- Clinical encounter is created and active.
- Bed assignment is recorded.
Actors: Nurse, Admissions Officer

Flow of Actions: 
Basic Flow: Admit Patient
1. User searches for a registered patient in the Admission module.
2. User selects the patient and clicks "Admit Patient".
3. System displays the Admission Modal.
4. User fills out Encounter details (Class, Type, Priority).
5. User assigns a Physician and Location (Sub-flow S1).
6. User confirms the admission.
7. System generates an Admission record and updates patient availability.

Sub-flow S1: Assign Location
1. User clicks on the Location selector.
2. System displays a list of available beds/rooms.
3. User selects an appropriate location based on the patient's condition.

Alternative Flows: 
A1: No Available Beds
1. System displays a warning that no beds are available in the selected ward.
2. User must select a different ward or place the patient on a waitlist.

Relationships: {To be defined}
