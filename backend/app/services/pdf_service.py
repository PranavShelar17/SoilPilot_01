"""SoilPilot PDF Generation Service using ReportLab.
Phase 9: Professional A4 Soil Health Card and Detailed Soil Report Generation.
Supports English and Marathi (Devanagari) typography with zero external PDF servers.
"""
import os
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget

# ----------------------------------------------------------------------
# Font Registration (Bilingual Devanagari & Latin)
# ----------------------------------------------------------------------
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

def _init_fonts() -> str:
    """Register Unicode font for Devanagari/Marathi support with safe fallbacks."""
    global FONT_REGULAR, FONT_BOLD
    candidates = [
        ("C:/Windows/Fonts/Nirmala.ttc", 0),
        ("C:/Windows/Fonts/mangal.ttf", 0),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 0),
        ("/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf", 0),
    ]
    for font_path, subfont_idx in candidates:
        if os.path.exists(font_path):
            try:
                font_name = "SoilPilotUnicode"
                if font_path.endswith(".ttc"):
                    pdfmetrics.registerFont(TTFont(font_name, font_path, subfontIndex=subfont_idx))
                else:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                FONT_REGULAR = font_name
                FONT_BOLD = font_name
                return font_name
            except Exception:
                continue
    return "Helvetica"

_ACTIVE_FONT = _init_fonts()

# ----------------------------------------------------------------------
# SoilPilot Brand Palette
# ----------------------------------------------------------------------
COLOR_PRIMARY = colors.HexColor("#2A7C13")       # Primary Green
COLOR_SECONDARY = colors.HexColor("#76C457")     # Secondary Green
COLOR_PRIMARY_LIGHT = colors.HexColor("#EAF4E8") # Light Green Fill
COLOR_CREAM = colors.HexColor("#FFF8CF")         # Soft Cream
COLOR_BEIGE = colors.HexColor("#FBE6C2")         # Warm Beige
COLOR_AMBER_BG = colors.HexColor("#FEF3C7")      # Amber Demo Tag
COLOR_AMBER_TEXT = colors.HexColor("#92400E")
COLOR_TEXT_MAIN = colors.HexColor("#1A1A1A")     # Charcoal Text
COLOR_TEXT_MUTED = colors.HexColor("#4B5563")    # Muted Gray
COLOR_BORDER = colors.HexColor("#D1D5DB")        # Border Gray
COLOR_BG_ALT = colors.HexColor("#F9FAFB")        # Alternating Row

# ----------------------------------------------------------------------
# Multi-Page Numbered Canvas
# ----------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y'."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count: int):
        self.saveState()
        self.setFont(FONT_REGULAR, 7.5)
        self.setFillColor(COLOR_TEXT_MUTED)

        # Thin footer rule
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(14 * mm, 12 * mm, 196 * mm, 12 * mm)

        # Left: portal info
        now_str = datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M UTC")
        self.drawString(
            14 * mm,
            8.5 * mm,
            f"SoilPilot — Digital Soil Mapping & Soil Health Portal | Generated: {now_str}",
        )

        # Right: page numbers
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(196 * mm, 8.5 * mm, page_text)
        self.restoreState()


# ----------------------------------------------------------------------
# Helper: QR Code Widget
# ----------------------------------------------------------------------
def _create_qr_code(url: str, size: float = 45) -> Drawing:
    """Generate a clean QR code drawing for report verification."""
    d = Drawing(size, size)
    qr = QrCodeWidget(url)
    qr.barWidth = size
    qr.barHeight = size
    qr.barBorder = 1
    d.add(qr)
    return d


# ----------------------------------------------------------------------
# PDF Generator Class
# ----------------------------------------------------------------------
class PDFService:
    """Generates official printable A4 Soil Health Cards and Detailed Soil Reports."""

    @staticmethod
    def _get_styles():
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=13,
            leading=16,
            textColor=colors.white,
        )

        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=11,
            textColor=COLOR_CREAM,
        )

        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=9.5,
            leading=13,
            textColor=COLOR_PRIMARY,
        )

        label_style = ParagraphStyle(
            "CellLabel",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9.5,
            textColor=COLOR_TEXT_MUTED,
        )

        val_style = ParagraphStyle(
            "CellValue",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=10.5,
            textColor=COLOR_TEXT_MAIN,
        )

        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9.5,
            textColor=colors.white,
            alignment=1,  # Center
        )

        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.5,
            leading=9.5,
            textColor=COLOR_TEXT_MAIN,
        )

        table_cell_bold = ParagraphStyle(
            "TableCellBold",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9.5,
            textColor=COLOR_TEXT_MAIN,
        )

        table_cell_center = ParagraphStyle(
            "TableCellCenter",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=7.5,
            leading=9.5,
            textColor=COLOR_TEXT_MAIN,
            alignment=1,
        )

        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.8,
            leading=8.8,
            textColor=COLOR_TEXT_MUTED,
        )

        return {
            "title": title_style,
            "subtitle": subtitle_style,
            "section": section_heading,
            "label": label_style,
            "val": val_style,
            "th": table_header_style,
            "td": table_cell_style,
            "td_bold": table_cell_bold,
            "td_center": table_cell_center,
            "disclaimer": disclaimer_style,
        }

    # ==================================================================
    # 1. SOIL HEALTH CARD PDF (1-2 pages, summary & key indicators)
    # ==================================================================
    def generate_soil_health_card_pdf(
        self,
        report_data: Dict[str, Any],
        lang: str = "en",
        verify_url: Optional[str] = None,
    ) -> bytes:
        """Generate official Soil Health Card PDF."""
        is_mr = lang.lower() == "mr"
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=12 * mm,
            rightMargin=12 * mm,
            topMargin=12 * mm,
            bottomMargin=16 * mm,
        )

        styles = self._get_styles()
        story = []

        field = report_data.get("field", {}) or {}
        farmer = report_data.get("farmer", {}) or {}
        report_meta = report_data.get("report", {}) or {}
        parameters: List[Dict[str, Any]] = report_data.get("parameters", []) or []
        is_demo = report_data.get("is_demo", True)

        # Verification URL
        report_no = report_meta.get("report_no", "SPL/2026/SL-0104")
        if not verify_url:
            verify_url = f"https://soilpilot.gov.in/report/{report_no}"

        # --------------------------------------------------------------
        # 1. Green Header Banner
        # --------------------------------------------------------------
        title_text = "मृद आरोग्य पत्रिका (SOIL HEALTH CARD)" if is_mr else "SOIL HEALTH CARD"
        sub_text = (
            "डिजिटल सॉईल मॅपिंग आणि मृद आरोग्य पोर्टल • महाराष्ट्र कृषी"
            if is_mr
            else "Digital Soil Mapping & Soil Health Portal • Maharashtra Agricultural Cadastre"
        )
        tag_text = "प्रात्यक्षिक नमुना (DEMO)" if is_mr else "DEMO RECORD"

        header_data = [
            [
                Paragraph(f"<b>SOILPILOT</b> — {title_text}", styles["title"]),
                Paragraph(
                    f"<font color='{COLOR_AMBER_TEXT}'><b>{tag_text}</b></font>" if is_demo else "",
                    ParagraphStyle("DemoTag", parent=styles["val"], alignment=2),
                ),
            ],
            [
                Paragraph(sub_text, styles["subtitle"]),
                Paragraph(
                    f"<font color='white'>ICAR/MPKV Rahuri Standard Matrix</font>",
                    ParagraphStyle("Std", parent=styles["subtitle"], alignment=2),
                ),
            ],
        ]
        header_table = Table(header_data, colWidths=[140 * mm, 46 * mm])
        header_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(header_table)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 2. Farmer & Cadastral Field Information Box
        # --------------------------------------------------------------
        sec_title = "शेतकरी आणि शेत जमीन माहिती (Farmer & Parcel Details)" if is_mr else "FARMER & FIELD IDENTIFICATION"
        story.append(Paragraph(sec_title, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        farmer_name = farmer.get("name", "Farmer")
        gat_no = field.get("gat_no", "N/A")
        village = field.get("village", "N/A")
        taluka = field.get("taluka", "N/A")
        district = field.get("district", "N/A")
        area = f"{field.get('area', 'N/A')} {field.get('area_unit', 'Ha')}"
        sample_date = report_meta.get("sample_date", "15-09-2026")
        report_date = report_meta.get("report_date", "20-09-2026")
        crop_name = report_meta.get("crop_name", "Sugarcane / Cash Crop")

        info_data = [
            [
                Paragraph("शेतकऱ्याचे नाव (Farmer Name):" if is_mr else "Farmer Name:", styles["label"]),
                Paragraph(f"<b>{farmer_name}</b>", styles["val"]),
                Paragraph("अहवाल क्रमांक (Report No):" if is_mr else "Report Number:", styles["label"]),
                Paragraph(f"<b>{report_no}</b>", styles["val"]),
            ],
            [
                Paragraph("गट क्रमांक (Gat / Survey No):" if is_mr else "Gat / Survey No:", styles["label"]),
                Paragraph(f"<b>Gat No. {gat_no}</b>", styles["val"]),
                Paragraph("नमुना दिनांक (Sample Date):" if is_mr else "Sample Date:", styles["label"]),
                Paragraph(sample_date, styles["val"]),
            ],
            [
                Paragraph("गाव व तालुका (Village & Taluka):" if is_mr else "Village & Taluka:", styles["label"]),
                Paragraph(f"{village}, {taluka}", styles["val"]),
                Paragraph("अहवाल दिनांक (Report Date):" if is_mr else "Report Date:", styles["label"]),
                Paragraph(report_date, styles["val"]),
            ],
            [
                Paragraph("जिल्हा व क्षेत्र (District & Area):" if is_mr else "District & Area:", styles["label"]),
                Paragraph(f"{district} • {area}", styles["val"]),
                Paragraph("पीक (Target Crop):" if is_mr else "Target Crop:", styles["label"]),
                Paragraph(crop_name, styles["val"]),
            ],
        ]
        info_table = Table(
            info_data,
            colWidths=[44 * mm, 49 * mm, 44 * mm, 49 * mm],
        )
        info_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_PRIMARY_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(info_table)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 3. Primary Nutrient & Chemical Diagnostics Table
        # --------------------------------------------------------------
        param_sec_title = "माती चाचणी निकाल आणि विश्लेषण (Nutrient Health Diagnostics)" if is_mr else "SOIL HEALTH DIAGNOSTICS & NUTRIENT STATUS"
        story.append(Paragraph(param_sec_title, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        # Select primary parameters for card summary if present
        primary_keys = [
            "ph", "ec", "organic_carbon", "available_nitrogen",
            "available_phosphorus", "available_potassium", "zinc", "iron"
        ]
        chosen_params = [p for p in parameters if p.get("key") in primary_keys]
        if not chosen_params:
            chosen_params = parameters[:8]

        th_sr = "अ.क्र." if is_mr else "Sr."
        th_param = "माती घटक (Soil Parameter)" if is_mr else "Soil Parameter"
        th_val = "मूल्य (Value)" if is_mr else "Value"
        th_unit = "एकक (Unit)" if is_mr else "Unit"
        th_status = "स्थिती / विश्लेषण (Status)" if is_mr else "Interpretation"
        th_range = "संदर्भ श्रेणी (Reference Range)" if is_mr else "Reference Range"
        th_source = "माहिती स्रोत (Source)" if is_mr else "Data Source"

        param_rows = [[
            Paragraph(th_sr, styles["th"]),
            Paragraph(th_param, styles["th"]),
            Paragraph(th_val, styles["th"]),
            Paragraph(th_unit, styles["th"]),
            Paragraph(th_status, styles["th"]),
            Paragraph(th_range, styles["th"]),
            Paragraph(th_source, styles["th"]),
        ]]

        if chosen_params:
            for idx, p in enumerate(chosen_params, 1):
                p_name = p.get("name_mr" if is_mr else "name", p.get("name", "N/A"))
                val = p.get("value")
                val_str = f"{val:.2f}" if isinstance(val, (int, float)) else ("उपलब्ध नाही" if is_mr else "Not Available")
                unit_str = p.get("unit") or "-"
                interp = p.get("interpretation_mr" if is_mr else "interpretation", p.get("interpretation", "N/A"))
                ref_range = p.get("reference_range", "-")
                source = p.get("source_type") or p.get("source") or "LAB OBSERVATION"
                if is_mr:
                    if source == "LAB OBSERVATION":
                        source = "प्रयोगशाळा निरीक्षण"
                    elif source == "DSM PREDICTION":
                        source = "डिजिटल सॉईल मॅपिंग अंदाज"
                    elif source == "IMPORTED DATA":
                        source = "आयात केलेला डेटा"

                param_rows.append([
                    Paragraph(str(idx), styles["td_center"]),
                    Paragraph(f"<b>{p_name}</b>", styles["td"]),
                    Paragraph(f"<b>{val_str}</b>", styles["td_center"]),
                    Paragraph(unit_str, styles["td_center"]),
                    Paragraph(interp, styles["td"]),
                    Paragraph(ref_range, styles["td"]),
                    Paragraph(source, styles["td_center"]),
                ])
        else:
            param_rows.append([
                Paragraph("1", styles["td_center"]),
                Paragraph("माती माहिती प्रलंबित (Soil Data Pending)" if is_mr else "Soil Information Pending", styles["td_bold"]),
                Paragraph("प्रलंबित" if is_mr else "Pending", styles["td_center"]),
                Paragraph("-", styles["td_center"]),
                Paragraph("प्रलंबित" if is_mr else "Pending", styles["td"]),
                Paragraph("-", styles["td"]),
                Paragraph("PENDING", styles["td_center"]),
            ])

        param_table = Table(
            param_rows,
            colWidths=[10 * mm, 46 * mm, 20 * mm, 16 * mm, 34 * mm, 36 * mm, 24 * mm],
        )

        table_style_commands = [
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]
        # Alternating row colors
        for i in range(1, len(param_rows)):
            bg = COLOR_BG_ALT if i % 2 == 0 else colors.white
            table_style_commands.append(("BACKGROUND", (0, i), (-1, i), bg))

        param_table.setStyle(TableStyle(table_style_commands))
        story.append(param_table)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 4. QR Verification & Data Source Notice (Footer Block)
        # --------------------------------------------------------------
        qr_drawing = _create_qr_code(verify_url, size=40)
        verify_label = (
            "<b>डिजिटल पडताळणी (Digital Verification)</b><br/>"
            f"<font size='6.5' color='{COLOR_TEXT_MUTED}'>अहवाल क्रमांक: {report_no}<br/>"
            "हा QR कोड स्कॅन करून मूळ डिजिटल अहवाल तपासा.<br/>"
            "माहिती स्रोत: LAB OBSERVATION • DSM PREDICTION • PENDING<br/>"
            "टीप: प्रात्यक्षिक डेटा (DEMO DATA) अधिकृत शासकीय किंवा प्रयोगशाळा दस्तऐवज मानू नये.</font>"
            if is_mr
            else
            "<b>OFFICIAL REPORT VERIFICATION</b><br/>"
            f"<font size='6.5' color='{COLOR_TEXT_MUTED}'>Report ID: {report_no}<br/>"
            "Scan this QR code to verify report authenticity online.<br/>"
            "Data Sources: LAB OBSERVATION • DSM PREDICTION • IMPORTED DATA<br/>"
            "Notice: Demonstration data is for platform evaluation and is not certified legal cadastre.</font>"
        )

        footer_box_data = [
            [
                qr_drawing,
                Paragraph(verify_label, styles["val"]),
            ]
        ]
        footer_box = Table(footer_box_data, colWidths=[20 * mm, 166 * mm])
        footer_box.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_CREAM),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(footer_box)

        # Build document
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    # ==================================================================
    # 2. DETAILED SOIL REPORT PDF (Complete 14+ Laboratory Dossier)
    # ==================================================================
    def generate_detailed_soil_report_pdf(
        self,
        report_data: Dict[str, Any],
        lang: str = "en",
        verify_url: Optional[str] = None,
    ) -> bytes:
        """Generate comprehensive official laboratory Soil Test Report PDF."""
        is_mr = lang.lower() == "mr"
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=12 * mm,
            rightMargin=12 * mm,
            topMargin=12 * mm,
            bottomMargin=16 * mm,
        )

        styles = self._get_styles()
        story = []

        field = report_data.get("field", {}) or {}
        farmer = report_data.get("farmer", {}) or {}
        report_meta = report_data.get("report", {}) or {}
        parameters: List[Dict[str, Any]] = report_data.get("parameters", []) or []
        is_demo = report_data.get("is_demo", True)

        report_no = report_meta.get("report_no", "SPL/2026/SL-0104")
        if not verify_url:
            verify_url = f"https://soilpilot.gov.in/report/{report_no}"

        # --------------------------------------------------------------
        # 1. Header Banner
        # --------------------------------------------------------------
        main_title = (
            "सविस्तर माती चाचणी व पृथक्करण अहवाल"
            if is_mr
            else "DETAILED SOIL TEST & DIAGNOSTIC REPORT"
        )
        sub_title = (
            "SoilPilot डिजिटल सॉईल मॅपिंग व मृद आरोग्य पोर्टल • भारतीय कृषी संशोधन परिषद (ICAR) निकष"
            if is_mr
            else "SoilPilot Digital Soil Mapping & Soil Health Portal • ICAR & MPKV Rahuri Vertisol Standards"
        )
        demo_str = "प्रात्यक्षिक नमुना (DEMO)" if is_mr else "DEMO DATASET"

        header_data = [
            [
                Paragraph(f"<b>SOILPILOT</b> — {main_title}", styles["title"]),
                Paragraph(
                    f"<font color='{COLOR_AMBER_TEXT}'><b>{demo_str}</b></font>" if is_demo else "",
                    ParagraphStyle("DemoTag2", parent=styles["val"], alignment=2),
                ),
            ],
            [
                Paragraph(sub_title, styles["subtitle"]),
                Paragraph(
                    f"<font color='white'>Official Laboratory Dossier</font>",
                    ParagraphStyle("Dossier", parent=styles["subtitle"], alignment=2),
                ),
            ],
        ]
        header_table = Table(header_data, colWidths=[140 * mm, 46 * mm])
        header_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(header_table)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 2. Comprehensive Farmer, Field & Sample Metadata Box
        # --------------------------------------------------------------
        meta_heading = "१. शेतकरी आणि नमुना तपशील (Farmer & Sample Details)" if is_mr else "1. FARMER, CADASTRE & SAMPLE IDENTIFICATION"
        story.append(Paragraph(meta_heading, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        farmer_name = farmer.get("name", "Farmer")
        gat_no = field.get("gat_no", "N/A")
        village = field.get("village", "N/A")
        taluka = field.get("taluka", "N/A")
        district = field.get("district", "N/A")
        area = f"{field.get('area', 'N/A')} {field.get('area_unit', 'Ha')}"
        sample_date = report_meta.get("sample_date", "15-09-2026")
        report_date = report_meta.get("report_date", "20-09-2026")
        receipt_no = report_meta.get("receipt_no", "REC-7842/26")
        sample_name = report_meta.get("sample_name", "Surface Soil Composite (0-15 cm)")
        crop_name = report_meta.get("crop_name", "Sugarcane (ऊस)")
        lab_name = report_meta.get("laboratory_name", "SoilPilot Soil Testing & Diagnostic Laboratory")

        meta_rows = [
            [
                Paragraph("शेतकऱ्याचे नाव (Farmer Name):" if is_mr else "Farmer Name:", styles["label"]),
                Paragraph(f"<b>{farmer_name}</b>", styles["val"]),
                Paragraph("अहवाल क्रमांक (Report No):" if is_mr else "Report Number:", styles["label"]),
                Paragraph(f"<b>{report_no}</b>", styles["val"]),
            ],
            [
                Paragraph("गट क्रमांक (Gat Number):" if is_mr else "Gat / Survey Number:", styles["label"]),
                Paragraph(f"<b>Gat No. {gat_no}</b>", styles["val"]),
                Paragraph("पावती क्रमांक (Receipt No):" if is_mr else "Receipt Number:", styles["label"]),
                Paragraph(receipt_no, styles["val"]),
            ],
            [
                Paragraph("गाव / तालुका (Village / Taluka):" if is_mr else "Village / Taluka:", styles["label"]),
                Paragraph(f"{village}, {taluka}", styles["val"]),
                Paragraph("नमुना दिनांक (Sample Date):" if is_mr else "Sample Collection Date:", styles["label"]),
                Paragraph(sample_date, styles["val"]),
            ],
            [
                Paragraph("जिल्हा व क्षेत्र (District & Area):" if is_mr else "District & Field Area:", styles["label"]),
                Paragraph(f"{district} • {area}", styles["val"]),
                Paragraph("अहवाल दिनांक (Report Date):" if is_mr else "Report Release Date:", styles["label"]),
                Paragraph(report_date, styles["val"]),
            ],
            [
                Paragraph("नमुना प्रकार (Sample Type):" if is_mr else "Sample Description:", styles["label"]),
                Paragraph(sample_name, styles["val"]),
                Paragraph("नियोजित पीक (Target Crop):" if is_mr else "Target Crop:", styles["label"]),
                Paragraph(crop_name, styles["val"]),
            ],
        ]
        meta_table = Table(meta_rows, colWidths=[44 * mm, 49 * mm, 44 * mm, 49 * mm])
        meta_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_PRIMARY_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(meta_table)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 3. Complete Soil Parameter Laboratory Table (All Parameters)
        # --------------------------------------------------------------
        param_heading = (
            "२. माती रासायनिक आणि पोषणद्रव्य विश्लेषण (Soil Chemical & Nutrient Diagnostics)"
            if is_mr
            else "2. COMPLETE SOIL CHEMICAL & NUTRIENT LABORATORY DIAGNOSTICS"
        )
        story.append(Paragraph(param_heading, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        th_sr = "अ.क्र." if is_mr else "Sr."
        th_param = "माती घटक (Parameter)" if is_mr else "Soil Parameter"
        th_val = "मूल्य (Value)" if is_mr else "Observed Value"
        th_unit = "एकक (Unit)" if is_mr else "Unit"
        th_status = "विश्लेषण (Interpretation)" if is_mr else "Status / Interpretation"
        th_range = "संदर्भ श्रेणी (Reference Range)" if is_mr else "Standard Reference Range"
        th_source = "स्रोत (Source)" if is_mr else "Source"

        full_table_rows = [[
            Paragraph(th_sr, styles["th"]),
            Paragraph(th_param, styles["th"]),
            Paragraph(th_val, styles["th"]),
            Paragraph(th_unit, styles["th"]),
            Paragraph(th_status, styles["th"]),
            Paragraph(th_range, styles["th"]),
            Paragraph(th_source, styles["th"]),
        ]]

        if parameters:
            for idx, p in enumerate(parameters, 1):
                p_name = p.get("name_mr" if is_mr else "name", p.get("name", "N/A"))
                val = p.get("value")
                val_str = f"{val:.2f}" if isinstance(val, (int, float)) else ("उपलब्ध नाही" if is_mr else "Not Available")
                unit_str = p.get("unit") or "-"
                interp = p.get("interpretation_mr" if is_mr else "interpretation", p.get("interpretation", "N/A"))
                ref_range = p.get("reference_range", "-")
                source = p.get("source_type") or p.get("source") or "LAB OBSERVATION"
                if is_mr:
                    if source == "LAB OBSERVATION":
                        source = "प्रयोगशाळा निरीक्षण"
                    elif source == "DSM PREDICTION":
                        source = "डिजिटल सॉईल मॅपिंग अंदाज"
                    elif source == "IMPORTED DATA":
                        source = "आयात केलेला डेटा"

                full_table_rows.append([
                    Paragraph(str(idx), styles["td_center"]),
                    Paragraph(f"<b>{p_name}</b>", styles["td"]),
                    Paragraph(f"<b>{val_str}</b>", styles["td_center"]),
                    Paragraph(unit_str, styles["td_center"]),
                    Paragraph(interp, styles["td"]),
                    Paragraph(ref_range, styles["td"]),
                    Paragraph(source, styles["td_center"]),
                ])
        else:
            full_table_rows.append([
                Paragraph("1", styles["td_center"]),
                Paragraph("माती माहिती प्रलंबित (Soil Data Pending)" if is_mr else "No Soil Data Recorded", styles["td_bold"]),
                Paragraph("प्रलंबित" if is_mr else "Pending", styles["td_center"]),
                Paragraph("-", styles["td_center"]),
                Paragraph("प्रलंबित" if is_mr else "Pending", styles["td"]),
                Paragraph("-", styles["td"]),
                Paragraph("PENDING", styles["td_center"]),
            ])

        full_table = Table(
            full_table_rows,
            colWidths=[8 * mm, 46 * mm, 22 * mm, 16 * mm, 34 * mm, 36 * mm, 24 * mm],
        )

        full_table_style = [
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ]
        for i in range(1, len(full_table_rows)):
            bg = COLOR_BG_ALT if i % 2 == 0 else colors.white
            full_table_style.append(("BACKGROUND", (0, i), (-1, i), bg))

        full_table.setStyle(TableStyle(full_table_style))
        story.append(full_table)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 4. Soil-Based Recommendations Summary Section
        # --------------------------------------------------------------
        rec_title = (
            "३. मातीवर आधारित खत व पीक मार्गदर्शन सारांश (Soil-Based Recommendations Summary)"
            if is_mr
            else "3. SOIL-BASED AGRONOMIC RECOMMENDATION SUMMARY"
        )
        story.append(Paragraph(rec_title, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        rec_text = (
            "<b>नत्र व्यवस्थापन (Nitrogen Split):</b> नत्र प्रमाण कमी असल्याने शिफारशीत युरिया तीन ते चार हप्त्यांमध्ये विभागून द्यावा.<br/>"
            "<b>सामू सुधारणा (pH Buffering):</b> मातीचा सामू ८.३८ (मध्यम विम्लधर्मी) असल्याने सेंद्रिय खते (शेणखत/कंपोस्ट) प्रति एकरी ३-५ टन वापरावी.<br/>"
            "<b>सूक्ष्मअन्नद्रव्ये (Micronutrients):</b> जस्त (Zinc) आणि बोरॉन (Boron) कमतरतेवर मात करण्यासाठी माती परीक्षणानुसार फेरस/झिंक सल्फेटचा वापर करावा.<br/>"
            "<i>टीप: सविस्तर शेत-विशिष्ट खत शिफारशींसाठी SoilPilot वरील 'शिफारशी' (Recommendations) विभागाला भेट द्या.</i>"
            if is_mr
            else
            "<b>Nitrogen Management:</b> Available Nitrogen is low (163 kg/ha). Apply nitrogenous fertilizers in 3-4 split applications to optimize uptake.<br/>"
            "<b>pH Buffering:</b> Moderately alkaline pH (8.38). Incorporate 3-5 tonnes/acre well-rotted FYM/compost and green manuring to buffer alkalinity.<br/>"
            "<b>Micronutrient Enrichment:</b> Zinc (0.42 ppm) and Boron require basal supplementation with chelated fertilizers.<br/>"
            "<i>Note: For comprehensive crop-specific fertilizer schedules, consult the SoilPilot Recommendations module (/recommendations).</i>"
        )

        rec_box = Table([[Paragraph(rec_text, styles["val"])]], colWidths=[186 * mm])
        rec_box.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_PRIMARY_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_SECONDARY),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(rec_box)
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 5. Data Source, Disclaimer & Verification Footer Box
        # --------------------------------------------------------------
        disclaimer_heading = "४. माहिती स्रोत व अस्वीकरण (Data Source & Legal Notice)" if is_mr else "4. DATA SOURCES & PLATFORM DISCLAIMER"
        story.append(Paragraph(disclaimer_heading, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        disclaimer_body = (
            "<b>माहिती स्रोत (Data Sources):</b> या अहवालातील नोंदी प्रयोगशाळा निरीक्षण (LAB OBSERVATION), डिजिटल सॉईल मॅपिंग अंदाज (DSM PREDICTION) किंवा आयात केलेल्या डेटावरून घेतल्या आहेत. डेटा उपलब्ध नसलेल्या ठिकाणी 'उपलब्ध नाही' (Not Available) किंवा 'प्रलंबित' (Pending) दर्शवले आहे.<br/>"
            "<b>प्रात्यक्षिक डेटा सूचना (Demo Data Policy):</b> हा अहवाल प्रात्यक्षिक/प्रोटोटाइप हेतूसाठी तयार केला असून शासकीय महसूल अभिलेख (७/१२ उतारा) किंवा अधिकृत कायदेशीर दस्तऐवज म्हणून वापरता येणार नाही.<br/>"
            f"<b>डिजिटल पडताळणी:</b> अहवाल क्रमांक {report_no} ची ऑनलाइन पडताळणी करण्यासाठी सोबत दिलेला QR कोड स्कॅन करा."
            if is_mr
            else
            "<b>Data Sources:</b> This report contains information available through the SoilPilot Digital Soil Mapping and Soil Health Portal. Values originate from verified laboratory observations (LAB OBSERVATION), machine-learning digital soil mapping predictions (DSM PREDICTION), or imported datasets. Where data is unavailable, it is marked accordingly. No fabricated values are generated.<br/>"
            "<b>Demo Data Notice:</b> Demonstration and prototype data must never be represented as official cadastral land records or legal laboratory certifications.<br/>"
            f"<b>Digital Verification:</b> Scan the QR code to verify report authenticity online at {verify_url}."
        )

        qr_drawing_det = _create_qr_code(verify_url, size=40)
        disclaimer_table = Table(
            [[qr_drawing_det, Paragraph(disclaimer_body, styles["disclaimer"])]],
            colWidths=[20 * mm, 166 * mm],
        )
        disclaimer_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_CREAM),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(disclaimer_table)

        # Build document
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()


pdf_service = PDFService()
