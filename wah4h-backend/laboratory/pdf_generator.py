from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from django.utils import timezone
import io

# Import Models
from patients.models import Patient
from accounts.models import Practitioner
from django.contrib.auth.models import User

class LabResultPDFView:
    @staticmethod
    def generate_pdf(report):
        buffer = io.BytesIO()
        
        # Margins: Top is higher to accommodate header
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
        # Fonts
        # Note: ReportLab standard fonts (Helvetica) are used by default
        
        header_title_style = ParagraphStyle(
            'HeaderTitle', 
            parent=styles['Heading1'], 
            alignment=TA_LEFT, 
            fontSize=16, 
            textColor=colors.HexColor('#1e3a8a'), # Dark Blue
            spaceAfter=2
        )
        header_subtitle_style = ParagraphStyle(
            'HeaderSubtitle', 
            parent=styles['Normal'], 
            alignment=TA_LEFT, 
            fontSize=10, 
            textColor=colors.grey
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitle', 
            parent=styles['Heading2'], 
            fontSize=12, 
            textColor=colors.HexColor('#1e3a8a'),
            spaceBefore=12, 
            spaceAfter=6,
            borderPadding=4,
            borderWidth=0,
            borderColor=colors.HexColor('#1e3a8a'),
            backColor=None # Could add light blue bg
        )

        normal_style = styles['Normal']
        small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=9)
        
        # --- Fetch Data ---
        # Patient
        patient_name = "Unknown Patient"
        patient_age_gender = "- / -"
        patient_id = str(report.subject_id)
        try:
            patient = Patient.objects.get(id=report.subject_id)
            patient_name = f"{patient.last_name}, {patient.first_name}"
            # Calculate Age
            age = patient.age if patient.age else "-"
            gender = patient.gender if patient.gender else "-"
            patient_age_gender = f"{age} / {gender}"
            if patient.patient_id:
                patient_id = patient.patient_id
        except Exception:
            pass

        # Requesting Physician
        requesting_physician = "Unknown"
        if report.requester_id:
            try:
                # Try Practitioner First
                practitioner = Practitioner.objects.get(practitioner_id=report.requester_id)
                requesting_physician = f"Dr. {practitioner.first_name} {practitioner.last_name}"
            except Practitioner.DoesNotExist:
                try:
                    # Fallback to User
                    user = User.objects.get(id=report.requester_id)
                    requesting_physician = f"{user.first_name} {user.last_name}"
                except User.DoesNotExist:
                    pass

        # Performed By (Technologist)
        technologist_name = "Unknown Technologist"
        if report.performer_id:
             try:
                practitioner = Practitioner.objects.get(practitioner_id=report.performer_id)
                technologist_name = f"{practitioner.first_name} {practitioner.last_name}, RMT"
             except Practitioner.DoesNotExist:
                pass


        # --- Header Drawing Function ---
        def draw_header_footer(canvas, doc):
            canvas.saveState()
            
            # -- HEADER --
            # Blue Top Bar
            # canvas.setFillColor(colors.HexColor('#1e3a8a'))
            # canvas.rect(0, A4[1] - 0.5*inch, A4[0], 0.5*inch, fill=1, stroke=0)
            
            # Hospital Info (Top Right)
            canvas.setFont('Helvetica-Bold', 10)
            canvas.setFillColor(colors.black)
            canvas.drawRightString(A4[0] - 0.75*inch, A4[1] - 0.75*inch, "WAH Medical Center")
            
            canvas.setFont('Helvetica', 9)
            canvas.setFillColor(colors.grey)
            canvas.drawRightString(A4[0] - 0.75*inch, A4[1] - 0.90*inch, "123 Hospital Drive, Medical City")
            canvas.drawRightString(A4[0] - 0.75*inch, A4[1] - 1.05*inch, "Tel: (02) 8123-4567 • lab@wah.com")
            
            # Logo / Title (Top Left)
            # Placeholder for Logo - Blue Square for now
            logo_x = 0.75*inch
            logo_y = A4[1] - 1.15*inch
            canvas.setFillColor(colors.HexColor('#1e3a8a'))
            canvas.rect(logo_x, logo_y, 0.4*inch, 0.4*inch, fill=1, stroke=0)
            canvas.setFillColor(colors.white)
            canvas.setFont('Helvetica-Bold', 14)
            canvas.drawString(logo_x + 0.08*inch, logo_y + 0.12*inch, "W")
            
            # Text next to Logo
            canvas.setFillColor(colors.HexColor('#1e3a8a'))
            canvas.setFont('Helvetica-Bold', 16)
            canvas.drawString(logo_x + 0.5*inch, logo_y + 0.25*inch, "LABORATORY REPORT")
            
            canvas.setFillColor(colors.black)
            canvas.setFont('Helvetica', 10)
            canvas.drawString(logo_x + 0.5*inch, logo_y + 0.10*inch, "Department of Pathology & Laboratory Medicine")

            # Line Separator
            canvas.setStrokeColor(colors.HexColor('#e5e7eb'))
            canvas.setLineWidth(1)
            canvas.line(0.75*inch, A4[1] - 1.3*inch, A4[0] - 0.75*inch, A4[1] - 1.3*inch)

            # -- FOOTER --
            # Line Separator
            canvas.line(0.75*inch, 0.75*inch, A4[0] - 0.75*inch, 0.75*inch)
            
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.grey)
            
            # Timestamp
            generated_at = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
            canvas.drawString(0.75*inch, 0.60*inch, f"Generated: {generated_at}")
            
            # System Info
            canvas.drawCentredString(A4[0]/2, 0.60*inch, "WAH4Health System • Confidential Medical Record")
            
            # Page Number
            page_num = canvas.getPageNumber()
            canvas.drawRightString(A4[0] - 0.75*inch, 0.60*inch, f"Page {page_num}")
            
            canvas.restoreState()

        # --- Content Body ---
        
        # 1. Patient Demographics Block
        elements.append(Paragraph("Patient Information", section_title_style))
        
        # Grid Data
        p_data = [
            [Paragraph("<b>Patient Name:</b>", small_style), Paragraph(patient_name, small_style), 
             Paragraph("<b>Case/Req ID:</b>", small_style), Paragraph(report.identifier or str(report.diagnostic_report_id), small_style)],
            
            [Paragraph("<b>Patient ID:</b>", small_style), Paragraph(patient_id, small_style), 
             Paragraph("<b>Date Requested:</b>", small_style), Paragraph(report.effective_datetime.strftime("%Y-%m-%d") if report.effective_datetime else "-", small_style)],
             
            [Paragraph("<b>Age / Sex:</b>", small_style), Paragraph(patient_age_gender, small_style), 
             Paragraph("<b>Physician:</b>", small_style), Paragraph(requesting_physician, small_style)],
             
            [Paragraph("<b>Ward/Room:</b>", small_style), Paragraph("-", small_style), # Placeholder for now
             Paragraph("<b>Lab Section:</b>", small_style), Paragraph(report.category_display or "Clinical Laboratory", small_style)]
        ]
        
        t_patient = Table(p_data, colWidths=[1.1*inch, 2.7*inch, 1.1*inch, 2.4*inch])
        t_patient.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(t_patient)
        
        elements.append(Spacer(1, 0.3*inch))
        
        # 2. Results Table
        elements.append(Paragraph(f"Test Results: {report.code_display or 'General'}", section_title_style))
        
        # Table Header
        r_data = [[
            Paragraph("<b>TEST / PARAMETER</b>", ParagraphStyle('Th', parent=styles['Normal'], textColor=colors.white, fontSize=9)),
            Paragraph("<b>RESULT</b>", ParagraphStyle('Th', parent=styles['Normal'], textColor=colors.white, fontSize=9)),
            Paragraph("<b>UNIT</b>", ParagraphStyle('Th', parent=styles['Normal'], textColor=colors.white, fontSize=9)),
            Paragraph("<b>REF. RANGE</b>", ParagraphStyle('Th', parent=styles['Normal'], textColor=colors.white, fontSize=9)),
            Paragraph("<b>FLAG</b>", ParagraphStyle('Th', parent=styles['Normal'], textColor=colors.white, fontSize=9)),
        ]]
        
        # Parse Results
        results = report.result_data if report.result_data else []
        meta = {}
        
        if isinstance(results, dict):
             meta = results.get('meta', {})
             results = results.get('results') or results.get('parameters') or []
        elif isinstance(results, list):
             # Legacy format: simple list of parameters
             pass
        
        # Override technologist name from meta if available
        if meta.get('medical_technologist'):
            technologist_name = meta.get('medical_technologist')

        if isinstance(results, list):
            for i, res in enumerate(results):
                param = res.get('parameter_name') or res.get('parameter') or 'Unknown'
                value = str(res.get('result_value') or res.get('value') or '-')
                unit = res.get('unit') or ''
                ref = res.get('reference_range') or res.get('referenceRange') or ''
                flag = res.get('interpretation') or res.get('flag') or ''
                
                # Flag styling
                flag_style = ParagraphStyle('Flag', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)
                flag_text = flag
                
                if flag and flag.lower() in ['high', 'low', 'h', 'l', 'critical', 'abnormal', 'positive', '+']:
                    flag_text = f"<font color='red'><b>{flag}</b></font>"
                    # Also highlight result value if anomalous? Maybe just the flag is enough.
                    value = f"<b>{value}</b>"
                
                row = [
                    Paragraph(param, small_style),
                    Paragraph(value, small_style),
                    Paragraph(unit, small_style),
                    Paragraph(ref, small_style),
                    Paragraph(flag_text, flag_style)
                ]
                r_data.append(row)
        
        # Table Config
        col_widths = [2.5*inch, 1.2*inch, 1*inch, 1.5*inch, 0.8*inch]
        t_results = Table(r_data, colWidths=col_widths, repeatRows=1)
        
        t_style_cmds = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')), # Header Blue
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            # ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')), # Light grid
            ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#1e3a8a')), # Header bottom line
            ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#e5e7eb')), # Row lines
        ]
        
        t_results.setStyle(TableStyle(t_style_cmds))
        elements.append(t_results)
        
        elements.append(Spacer(1, 0.6*inch))
        
        # 3. Signatories
        elements.append(Spacer(1, 0.5*inch))
        
        # Container for signatures
        # We use a table for layout
        
        # Performed By (Technologist)
        # Verified By (Pathologist/Physician - mapped from released_by/requester or hardcoded for now if not available)
        # Note: In the frontend we use 'released_by'. Here we can try to use report.released_by if available, 
        # but the model might not have it directly on 'report' if it's not in the PDF view's context.
        # Let's check report properties. 'verifier_id' or 'released_by'?
        # Based on models.py, DiagnosticReport has 'performer' (Technologist) and 'requesting_physician' (Doctor). 
        # The 'released_by' might be tracked in status history or a separate field.
        # For now, we will use a placeholder or the requester as the verifying physician if they are a doctor.
        
        verifier_name = "Dr. Maria Clara, MD, FPSP" # Default/Placeholder Pathologist
        # If the requester is a doctor, maybe they are the verifier? Or the pathologist is fixed per lab?
        # Usually, a Pathologist verifies all labs. 
        
        sig_data = [[
            Paragraph("<b>Performed By:</b>", small_style),
            Paragraph("<b>Verified By:</b>", small_style)
        ], [
            Paragraph(technologist_name, ParagraphStyle('SigName', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10)),
            Paragraph(verifier_name, ParagraphStyle('SigName', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10))
        ], [
            Paragraph("Medical Technologist", small_style),
            Paragraph("Pathologist", small_style)
        ], [
            Paragraph(f"Lic. No. {meta.get('prc_number', '-')}", small_style),
            Paragraph("Lic. No. 0098765", small_style)
        ]]

        t_sigs = Table(sig_data, colWidths=[3.5*inch, 3.5*inch])
        t_sigs.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(t_sigs)


        # Build PDF
        doc.build(elements, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
        buffer.seek(0)
        return buffer
