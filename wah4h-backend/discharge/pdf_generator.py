from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from django.utils import timezone
import io

from patients.models import Patient
from accounts.models import Practitioner, Location
from admission.models import Encounter


class DischargePDFView:
    @staticmethod
    def generate_pdf(discharge):
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1.5*inch,
            bottomMargin=1*inch
        )

        elements = []
        styles = getSampleStyleSheet()

        # --- Custom Styles ---
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1e3a8a'),
            spaceBefore=12,
            spaceAfter=6,
        )

        normal_style = styles['Normal']
        small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=9)

        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            spaceAfter=6,
        )

        # --- Fetch Related Data ---
        patient_name = "Unknown Patient"
        patient_age = "-"
        patient_gender = "-"
        patient_id_str = str(discharge.patient_id)
        try:
            patient = Patient.objects.get(id=discharge.patient_id)
            patient_name = f"{patient.last_name}, {patient.first_name}"
            patient_age = str(patient.age) if patient.age else "-"
            patient_gender = patient.gender if patient.gender else "-"
            if patient.patient_id:
                patient_id_str = patient.patient_id
        except Patient.DoesNotExist:
            pass

        room = "Unassigned"
        department = "General"
        condition = "Stable"
        physician_name = "Dr. On-Duty"
        admission_date = "-"
        discharge_date = "-"

        try:
            enc = Encounter.objects.get(encounter_id=discharge.encounter_id)

            # Room
            if enc.location_id:
                try:
                    loc = Location.objects.get(location_id=enc.location_id)
                    room = loc.name
                except Location.DoesNotExist:
                    room = f"Room {enc.location_id}"
            if hasattr(enc, 'location_status') and enc.location_status:
                parts = enc.location_status.split('|')
                if len(parts) >= 2 and parts[1].strip():
                    room = parts[1].strip()

            # Department
            department = enc.service_type or "General"

            # Condition
            condition = enc.reason_code or "Under Observation"

            # Physician
            if enc.participant_individual_id:
                try:
                    practitioner = Practitioner.objects.get(practitioner_id=enc.participant_individual_id)
                    physician_name = f"Dr. {practitioner.first_name} {practitioner.last_name}"
                except Practitioner.DoesNotExist:
                    pass

            # Dates
            if enc.period_start:
                admission_date = enc.period_start.strftime("%B %d, %Y")

        except Encounter.DoesNotExist:
            pass

        if discharge.discharge_datetime:
            discharge_date = discharge.discharge_datetime.strftime("%B %d, %Y at %I:%M %p")

        # --- Header/Footer Drawing ---
        def draw_header_footer(canvas_obj, doc):
            canvas_obj.saveState()

            # Hospital Info (Top Right)
            canvas_obj.setFont('Helvetica-Bold', 10)
            canvas_obj.setFillColor(colors.black)
            canvas_obj.drawRightString(A4[0] - 0.75*inch, A4[1] - 0.75*inch, "WAH Medical Center")

            canvas_obj.setFont('Helvetica', 9)
            canvas_obj.setFillColor(colors.grey)
            canvas_obj.drawRightString(A4[0] - 0.75*inch, A4[1] - 0.90*inch, "123 Hospital Drive, Medical City")
            canvas_obj.drawRightString(A4[0] - 0.75*inch, A4[1] - 1.05*inch, "Tel: (02) 8123-4567")

            # Logo / Title (Top Left)
            logo_x = 0.75*inch
            logo_y = A4[1] - 1.15*inch
            canvas_obj.setFillColor(colors.HexColor('#1e3a8a'))
            canvas_obj.rect(logo_x, logo_y, 0.4*inch, 0.4*inch, fill=1, stroke=0)
            canvas_obj.setFillColor(colors.white)
            canvas_obj.setFont('Helvetica-Bold', 14)
            canvas_obj.drawString(logo_x + 0.08*inch, logo_y + 0.12*inch, "W")

            canvas_obj.setFillColor(colors.HexColor('#1e3a8a'))
            canvas_obj.setFont('Helvetica-Bold', 16)
            canvas_obj.drawString(logo_x + 0.5*inch, logo_y + 0.25*inch, "DISCHARGE PACKET")

            canvas_obj.setFillColor(colors.black)
            canvas_obj.setFont('Helvetica', 10)
            canvas_obj.drawString(logo_x + 0.5*inch, logo_y + 0.10*inch, "Patient Discharge Summary")

            # Header line
            canvas_obj.setStrokeColor(colors.HexColor('#e5e7eb'))
            canvas_obj.setLineWidth(1)
            canvas_obj.line(0.75*inch, A4[1] - 1.3*inch, A4[0] - 0.75*inch, A4[1] - 1.3*inch)

            # -- FOOTER --
            canvas_obj.line(0.75*inch, 0.75*inch, A4[0] - 0.75*inch, 0.75*inch)

            canvas_obj.setFont('Helvetica', 8)
            canvas_obj.setFillColor(colors.grey)

            generated_at = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
            canvas_obj.drawString(0.75*inch, 0.60*inch, f"Generated: {generated_at}")
            canvas_obj.drawCentredString(A4[0]/2, 0.60*inch, "WAH4Health System • Confidential Medical Record")

            page_num = canvas_obj.getPageNumber()
            canvas_obj.drawRightString(A4[0] - 0.75*inch, 0.60*inch, f"Page {page_num}")

            canvas_obj.restoreState()

        # --- Content Body ---

        # 1. Patient Information
        elements.append(Paragraph("Patient Information", section_title_style))

        p_data = [
            [Paragraph("<b>Patient Name:</b>", small_style), Paragraph(patient_name, small_style),
             Paragraph("<b>Patient ID:</b>", small_style), Paragraph(patient_id_str, small_style)],

            [Paragraph("<b>Age / Sex:</b>", small_style), Paragraph(f"{patient_age} / {patient_gender}", small_style),
             Paragraph("<b>Room:</b>", small_style), Paragraph(room, small_style)],

            [Paragraph("<b>Department:</b>", small_style), Paragraph(department, small_style),
             Paragraph("<b>Physician:</b>", small_style), Paragraph(physician_name, small_style)],

            [Paragraph("<b>Condition:</b>", small_style), Paragraph(condition, small_style),
             Paragraph("<b>Status:</b>", small_style), Paragraph("DISCHARGED", small_style)],
        ]

        t_patient = Table(p_data, colWidths=[1.1*inch, 2.7*inch, 1.1*inch, 2.4*inch])
        t_patient.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(t_patient)
        elements.append(Spacer(1, 0.3*inch))

        # 2. Hospital Stay Details
        elements.append(Paragraph("Hospital Stay Details", section_title_style))

        stay_data = [
            [Paragraph("<b>Admission Date:</b>", small_style), Paragraph(admission_date, small_style),
             Paragraph("<b>Discharge Date:</b>", small_style), Paragraph(discharge_date, small_style)],
        ]
        t_stay = Table(stay_data, colWidths=[1.1*inch, 2.7*inch, 1.1*inch, 2.4*inch])
        t_stay.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(t_stay)
        elements.append(Spacer(1, 0.3*inch))

        # 3. Final Diagnosis
        elements.append(Paragraph("Final Diagnosis", section_title_style))
        diagnosis_text = "Pending Diagnosis"
        if discharge.summary_of_stay and "Diagnosis:" in discharge.summary_of_stay:
            try:
                diagnosis_text = discharge.summary_of_stay.split("Diagnosis:")[1].split("\n")[0].strip()
            except Exception:
                pass
        elif discharge.summary_of_stay:
            diagnosis_text = discharge.summary_of_stay[:200]

        elements.append(Paragraph(diagnosis_text, body_style))
        elements.append(Spacer(1, 0.2*inch))

        # 4. Summary of Hospital Stay
        elements.append(Paragraph("Summary of Hospital Stay", section_title_style))
        summary_text = discharge.summary_of_stay or "The patient was admitted and received appropriate medical care during their hospital stay."
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 0.2*inch))

        # 5. Discharge Instructions
        if discharge.discharge_instructions:
            elements.append(Paragraph("Discharge Instructions", section_title_style))
            elements.append(Paragraph(discharge.discharge_instructions, body_style))
            elements.append(Spacer(1, 0.2*inch))

        # 6. Follow-Up Plan
        elements.append(Paragraph("Follow-Up Plan", section_title_style))
        has_followup = bool(discharge.follow_up_plan)

        if has_followup:
            followup_label = "FOLLOW-UP REQUIRED"
            elements.append(Paragraph(f"<b><font color='#d97706'>⚠ {followup_label}</font></b>", body_style))
            elements.append(Paragraph(discharge.follow_up_plan, body_style))
        else:
            elements.append(Paragraph("<b><font color='#059669'>✓ NO IMMEDIATE FOLLOW-UP REQUIRED</font></b>", body_style))
            elements.append(Paragraph("Patient discharged in stable condition. Resume normal activities as tolerated.", body_style))

        elements.append(Spacer(1, 0.5*inch))

        # 7. Signatures
        sig_data = [
            [Paragraph("<b>Attending Physician:</b>", small_style),
             Paragraph("<b>Discharged By:</b>", small_style)],
            [Paragraph("", small_style), Paragraph("", small_style)],
            [Paragraph("_" * 35, small_style), Paragraph("_" * 35, small_style)],
            [Paragraph(physician_name, ParagraphStyle('SigName', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10)),
             Paragraph(discharge.created_by or "Discharge Clerk", ParagraphStyle('SigName', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10))],
            [Paragraph("Attending Physician", small_style),
             Paragraph("Discharge Officer", small_style)],
        ]

        t_sigs = Table(sig_data, colWidths=[3.5*inch, 3.5*inch])
        t_sigs.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(t_sigs)

        # Build PDF
        doc.build(elements, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
        buffer.seek(0)
        return buffer
