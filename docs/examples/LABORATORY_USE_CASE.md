# Use Case: Manage Laboratory

Use Case Name: Manage Laboratory
Use Case ID : UC-06
Author : Pseudoers
Purpose: To process laboratory test requests, manage specimen intake, encode diagnostic results with real-time validation, and release finalized reports to clinicians.
Requirement Traceability: BR-04: Patient Monitoring and Clinical Documentation, BR-07: Laboratory Test Management
Priority: HIGH
Preconditions: 
- User is authenticated as Laboratory Technician.
- Laboratory module is accessible from the sidebar.
- Active test requests (requested/verified) exist from Monitoring or Admission.
Postconditions: 
- Laboratory results are finalized and status updated to 'final'.
- Results are released and visible in the Monitoring module for Doctors/Nurses.
- All actions (receipt, encoding, release) are recorded with timestamps.
Actors: Laboratory Technician

Flow of Actions: 
Basic Flow: Process Laboratory Request
1. Technician logs into the system through the secure portal.
2. Technician navigates to Dashboard → Laboratory.
3. System displays the "Active Queue" containing Pending and In-Progress requests.
4. Technician receives the specimen for a pending request (Sub-flow S1).
5. Technician encodes the diagnostic findings into the system (Sub-flow S2).
6. Technician reviews the completed tests in the "Completed" tab.
7. Technician releases finalized results to the Monitoring Module (Sub-flow S3).
8. Technician views or exports results for archiving/printing (Sub-flow S4).

Sub-flow S1: Receive Specimen
1. Technician identifies a pending request with status 'requested' or 'verified'.
2. Technician clicks the Receive button.
3. Technician confirms the receipt in the confirmation dialog.
4. System updates the status to 'registered' and timestamps the receipt.

Sub-flow S2: Encode Test Results
1. Technician selects an 'In-Progress' request and clicks Encode.
2. System displays a standardized panel (e.g., CBC, Glucose Panel) based on the test type.
3. Technician enters numeric results or qualitative observations into the form fields.
4. System automatically saves a progress draft to local storage while typing.
5. Technician enters mandatory technician metadata (MedTech Name, PRC Number).
6. Technician clicks Finalize Results.
7. System clears the local draft and moves the request to the 'Completed' tab.

Sub-flow S3: Review and Release Results
1. Technician navigates to the Completed tab.
2. Technician reviews the encoded results and remarks.
3. Technician clicks the Release button.
4. System makes the results available to the Monitoring module and updates status to 'final'.

Sub-flow S4: View and Export Results
1. Technician identifies a 'Completed' or 'Released' test.
2. Technician clicks the View button.
3. System displays the "Lab Request Details" modal with the full diagnostic report.
4. Technician clicks "Print View" to use systemic browser printing (Sub-flow S4a).
5. Technician clicks "Download PDF" to retrieve the official PDF report (Sub-flow S4b).

Sub-flow S4a: Print View
1. System triggers `window.print()`.
2. System applies print-specific CSS to format the report for A4 paper.

Sub-flow S4b: Download PDF
1. System requests the PDF binary from the `/pdf/` API endpoint.
2. System triggers a browser download for the `.pdf` file.

Alternative Flows: 
A1: Abnormal Result Detection
1. System compares entered numeric values against predefined reference ranges.
2. System automatically flags values as LOW or HIGH with visible color-coding (Red/Orange).
3. System includes interpretation flags in the final report.

A2: Validation Failure
1. System blocks finalization if mandatory fields (MedTech Name, PRC Number) are empty.
2. System highlights missing fields for correction.

Relationships: Extended from: UC-04 (Monitor Patient)
