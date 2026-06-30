# Use Case: Manage Billing

Use Case Name: Manage Billing
Use Case ID : UC-08
Author : Pseudoers
Purpose: To track billable services, generate itemized invoices, record payments, and manage patient billing accounts.
Requirement Traceability: BR-05: Pharmacy and Medication Management, BR-07: Laboratory Test Management, BR-08: Billing and Payment Processing
Priority: HIGH
Preconditions: 
- User is authenticated as Billing Clerk or Administrator.
- Patient has an active or recent clinical encounter (Admission).
- Billable items (Lab tests, Medications) have been ordered or processed.
Postconditions: 
- Invoice is generated and status updated (draft -> issued -> balanced).
- Payment records are created and linked to the invoice.
- Billing summaries are available for review.
Actors: Billing Clerk

Flow of Actions: 
Basic Flow: Process Patient Billing
1. Billing Clerk logs into the system.
2. Clerk navigates to the Billing module.
3. Clerk selects a patient from the admitted patients list (Sub-flow S1).
4. System displays the "Patient Billing Summary" (Sub-flow S2).
5. Clerk generates an invoice from pending items (Sub-flow S3).
6. Clerk adds manual charges if necessary (Sub-flow S4).
7. Clerk records a payment (Sub-flow S5).
8. Clerk prints or exports the invoice (Sub-flow S6).

Sub-flow S1: Select Patient
1. System displays a list of admitted patients.
2. Clerk uses the search bar to find a specific patient.
3. Clerk clicks on the patient to open their billing dashboard.

Sub-flow S2: View Billing Summary
1. System aggregates and displays:
   - Billed total from existing invoices.
   - Unbilled totals from pending Lab and Pharmacy orders.
   - Grand total (sum of billed and unbilled).

Sub-flow S3: Generate Invoice
1. Clerk clicks "Generate Invoice from Pending".
2. System fetches all unbilled Diagnostic Reports and Medication Requests.
3. System creates a new 'draft' invoice with itemized line items.
4. System links the source orders to the new invoice to prevent double billing.

Sub-flow S4: Add Manual Charge
1. Clerk clicks "Add Manual Item" on a draft invoice.
2. Clerk enters Description (e.g., Professional Fee), Amount, and Category.
3. System adds a manual line item and recalculates the invoice total.

Sub-flow S5: Record Payment
1. Clerk clicks "Record Payment" on an issued/unbalanced invoice.
2. Clerk enters Amount, Payment Method (Cash, Card, GCash, Insurance), and Reference Number.
3. System creates a PaymentReconciliation record.
4. If total payments equal or exceed the invoice amount, system updates status to 'balanced'.

Sub-flow S6: Print Invoice
1. Clerk clicks "Print View".
2. System displays a formatted invoice for printing.
3. Clerk confirms printing to physical printer or PDF.

Alternative Flows: 
A1: No Pending Items
1. Clerk clicks "Generate Invoice".
2. System notifies the clerk that there are no pending items for the selected patient.

A2: Partial Payment
1. Initial payment is recorded.
2. System keeps the invoice status as 'issued' and displays the remaining balance.

Relationships: Extended from: UC-03 (Admit Patient), UC-06 (Manage Laboratory), UC-05 (Manage Pharmacy)
