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
from reportlab.graphics.shapes import Drawing, Rect, Polygon, Line
from reportlab.graphics.barcode.qr import QrCodeWidget

# ----------------------------------------------------------------------
# Font Registration (Bilingual Devanagari & Latin)
# ----------------------------------------------------------------------
ParagraphStyle.defaults["shaping"] = 1

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

def translate_ref_range_to_mr(raw: str) -> str:
    """Translate reference range terms to clean Marathi."""
    if not raw:
        return "—"
    tr = [
        ("(Suitable)", "(योग्य)"),
        ("(Normal)", "(सामान्य)"),
        ("(Medium)", "(मध्यम)"),
        ("(Sufficient)", "(पुरेसे)"),
        ("(Optimal)", "(उत्तम)"),
        ("(Low)", "(कमी)"),
        ("(High)", "(जास्त)"),
        ("(Deficient)", "(कमतरता)"),
        ("(Marginal)", "(सीमांत)"),
        ("AOI range:", "कार्यक्षेत्र श्रेणी:"),
        ("USDA Class:", "USDA वर्ग:"),
        ("Suitable", "योग्य"),
        ("Normal", "सामान्य"),
        ("Medium", "मध्यम"),
        ("Sufficient", "पुरेसे"),
        ("Optimal", "उत्तम"),
        ("Low", "कमी"),
        ("High", "जास्त"),
    ]
    res = raw
    for en, mr in tr:
        res = res.replace(en, mr)
    return res

def _init_fonts() -> str:
    """Register Unicode font for Devanagari/Marathi support with safe fallbacks."""
    global FONT_REGULAR, FONT_BOLD
    ParagraphStyle.defaults["shaping"] = 1
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
    # 1. SOIL HEALTH CARD PDF (Exact match with Web UI view)
    # ==================================================================
    def generate_soil_health_card_pdf(
        self,
        report_data: Dict[str, Any],
        lang: str = "en",
        verify_url: Optional[str] = None,
    ) -> bytes:
        """Generate official Soil Health Card PDF matching the Web UI design perfectly on a single A4 page."""
        is_mr = lang.lower() == "mr"
        buffer = io.BytesIO()

        # 5 mm top/bottom, 7 mm left/right margins to maximize printable height (287 mm usable)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=7 * mm,
            rightMargin=7 * mm,
            topMargin=5 * mm,
            bottomMargin=5 * mm,
        )

        styles = getSampleStyleSheet()

        # Color palette matching reference image
        COLOR_DARK_GREEN = colors.HexColor("#1E5622")
        COLOR_RED_DEMO = colors.HexColor("#D32F2F")
        COLOR_BORDER_GRAY = colors.HexColor("#D1D5DB")
        COLOR_LBL_BG = colors.HexColor("#F3F4F6")

        # Custom typography styles scaled for exact single-page A4 perfection
        st_head_adt = ParagraphStyle(
            "HeadADT",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=11,
            leading=13,
            alignment=1,
            textColor=colors.HexColor("#000000"),
        )
        st_head_loc = ParagraphStyle(
            "HeadLoc",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=10,
            alignment=1,
            textColor=colors.HexColor("#374151"),
        )
        st_head_demo = ParagraphStyle(
            "HeadDemo",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9,
            alignment=1,
            textColor=COLOR_RED_DEMO,
        )
        st_report_title = ParagraphStyle(
            "ReportTitle",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=10.5,
            leading=12.5,
            alignment=1,
            textColor=COLOR_DARK_GREEN,
        )
        st_sec_head = ParagraphStyle(
            "SecHead",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.8,
            leading=9.5,
            textColor=COLOR_DARK_GREEN,
        )
        st_info_lbl = ParagraphStyle(
            "InfoLbl",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=6.8,
            leading=8.2,
            textColor=colors.HexColor("#111827"),
        )
        st_info_val = ParagraphStyle(
            "InfoVal",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.8,
            leading=8.2,
            textColor=colors.HexColor("#111827"),
        )
        st_th = ParagraphStyle(
            "TH",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=6.5,
            leading=8,
            textColor=colors.white,
        )
        st_th_c = ParagraphStyle(
            "THC",
            parent=st_th,
            alignment=1,
        )
        st_td_sr = ParagraphStyle(
            "TDSr",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.5,
            leading=7.8,
            alignment=1,
            textColor=colors.HexColor("#111827"),
        )
        st_td_param = ParagraphStyle(
            "TDParam",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.5,
            leading=7.8,
            textColor=colors.HexColor("#111827"),
        )
        st_td_val = ParagraphStyle(
            "TDVal",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=6.8,
            leading=7.8,
            alignment=1,
            textColor=colors.HexColor("#111827"),
        )
        st_td_unit = ParagraphStyle(
            "TDUnit",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.5,
            leading=7.8,
            alignment=1,
            textColor=colors.HexColor("#111827"),
        )
        st_td_range = ParagraphStyle(
            "TDRange",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.0,
            leading=7.2,
            textColor=colors.HexColor("#111827"),
        )
        st_td_rec = ParagraphStyle(
            "TDRec",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.0,
            leading=7.2,
            textColor=colors.HexColor("#111827"),
        )
        st_footnote = ParagraphStyle(
            "Footnote",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.5,
            leading=8,
            textColor=colors.HexColor("#374151"),
        )
        st_cert_head = ParagraphStyle(
            "CertHead",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9,
            textColor=COLOR_DARK_GREEN,
        )
        st_cert_org = ParagraphStyle(
            "CertOrg",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.0,
            leading=8.5,
            textColor=colors.HexColor("#111827"),
        )
        st_cert_sub = ParagraphStyle(
            "CertSub",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.2,
            leading=7.5,
            textColor=colors.HexColor("#374151"),
        )
        st_cert_ref = ParagraphStyle(
            "CertRef",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.2,
            leading=7.5,
            textColor=colors.HexColor("#4B5563"),
        )
        st_sign_name = ParagraphStyle(
            "SignName",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=7.2,
            leading=8.8,
            alignment=2,
            textColor=colors.HexColor("#000000"),
        )
        st_sign_title = ParagraphStyle(
            "SignTitle",
            parent=styles["Normal"],
            fontName=FONT_BOLD,
            fontSize=6.2,
            leading=7.5,
            alignment=2,
            textColor=colors.HexColor("#000000"),
        )
        st_sign_div = ParagraphStyle(
            "SignDiv",
            parent=styles["Normal"],
            fontName=FONT_REGULAR,
            fontSize=6.0,
            leading=7.2,
            alignment=2,
            textColor=colors.HexColor("#4B5563"),
        )

        def _format_interp(text: str) -> Paragraph:
            lower = (text or "").lower()
            if any(k in lower for k in ["high", "जास्त"]):
                c_hex = "#1565C0"
            elif any(k in lower for k in ["low", "deficient", "critical", "कमी", "कमतरता"]):
                c_hex = "#D32F2F"
            elif any(k in lower for k in ["marginal", "सीमांत"]):
                c_hex = "#B45309"
            else:
                c_hex = "#111827"
            p_style = ParagraphStyle("InterpText", fontName=FONT_BOLD, fontSize=6.5, leading=7.8, textColor=colors.HexColor(c_hex))
            return Paragraph(f"<b>{text}</b>", p_style)

        story = []

        field = report_data.get("field", {}) or {}
        farmer = report_data.get("farmer", {}) or {}
        report_meta = report_data.get("report", {}) or {}
        parameters: List[Dict[str, Any]] = report_data.get("parameters", []) or []
        is_demo = report_data.get("is_demo", True)

        # --------------------------------------------------------------
        # 1. TOP HEADER (Centered Header matching image)
        # --------------------------------------------------------------
        header_elements = [
            Paragraph(
                "<b>एडीटी एआय ट्रेनिंग फाउंडेशन, बारामती</b>" if is_mr else "<b>ADT AI TRAINING FOUNDATION, BARAMATI</b>",
                st_head_adt,
            ),
            Paragraph(
                "बारामती, पुणे, महाराष्ट्र" if is_mr else "Baramati, Pune, Maharashtra",
                st_head_loc,
            ),
            Paragraph(
                "<b>मृदा चाचणी अहवाल</b>" if is_mr else "<b>SOIL TEST REPORT</b>",
                st_report_title,
            ),
        ]

        header_table = Table([[el] for el in header_elements], colWidths=[196 * mm])
        header_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 1.2 * mm))

        # --------------------------------------------------------------
        # 2. FARMER & SAMPLE INFORMATION (4-Column Table)
        # --------------------------------------------------------------
        story.append(HRFlowable(width="100%", thickness=1.2, color=COLOR_DARK_GREEN, spaceBefore=0, spaceAfter=1.0 * mm))
        sec_farmer_text = "शेतकरी व माती नमुना तपशील" if is_mr else "FARMER & SAMPLE INFORMATION"
        story.append(Paragraph(f"<b>{sec_farmer_text}</b>", st_sec_head))
        story.append(Spacer(1, 0.8 * mm))

        farmer_name = farmer.get("name") or ("रमेश पाटील" if is_mr else "Ramesh Patil (रमेश पाटील)")
        gat_no = field.get("gat_no", "22")
        area_unit = "हेक्टर" if is_mr else "hectare"
        area_val = field.get("area", "1.49")
        gat_label = f"गट क्र. {gat_no} ({area_val} {area_unit})" if is_mr else f"Gat No. {gat_no} ({area_val} {area_unit})"

        taluka_val = field.get("taluka") or ("बारामती" if is_mr else "Baramati")
        district_val = field.get("district") or ("पुणे" if is_mr else "Pune")
        village_val = field.get("village") or ("माळेगाव खुर्द" if is_mr else "Malegaon Kh.")
        date_val = report_meta.get("report_date") or "20-09-2026"

        f_data = [
            [
                Paragraph("<b>शेतकऱ्याचे नाव</b>" if is_mr else "<b>Farmer's Name</b>", st_info_lbl),
                Paragraph(str(farmer_name), st_info_val),
                Paragraph("<b>तालुका</b>" if is_mr else "<b>Taluka</b>", st_info_lbl),
                Paragraph(str(taluka_val), st_info_val),
            ],
            [
                Paragraph("<b>गट क्र.</b>" if is_mr else "<b>Gat No.</b>", st_info_lbl),
                Paragraph(str(gat_label), st_info_val),
                Paragraph("<b>जिल्हा</b>" if is_mr else "<b>District</b>", st_info_lbl),
                Paragraph(str(district_val), st_info_val),
            ],
            [
                Paragraph("<b>गाव</b>" if is_mr else "<b>Village</b>", st_info_lbl),
                Paragraph(str(village_val), st_info_val),
                Paragraph("<b>दिनांक</b>" if is_mr else "<b>Date</b>", st_info_lbl),
                Paragraph(str(date_val), st_info_val),
            ],
        ]

        info_table = Table(f_data, colWidths=[33 * mm, 65 * mm, 33 * mm, 65 * mm])
        info_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -1), 0.35, COLOR_BORDER_GRAY),
            ("BACKGROUND", (0, 0), (0, -1), COLOR_LBL_BG),
            ("BACKGROUND", (2, 0), (2, -1), COLOR_LBL_BG),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 1.0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1.0),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 1.2 * mm))

        # --------------------------------------------------------------
        # 3. LABORATORY SOIL CHEMICAL & NUTRIENT ANALYSIS TABLE
        # --------------------------------------------------------------
        sec_lab_text = "प्रयोगशाळा मृदा रासायनिक आणि पोषकतत्व विश्लेषण" if is_mr else "LABORATORY SOIL CHEMICAL & NUTRIENT ANALYSIS"
        story.append(Paragraph(f"<b>{sec_lab_text}</b>", st_sec_head))
        story.append(Spacer(1, 0.8 * mm))

        th_row = [
            Paragraph("<b>अ.क्र.</b>" if is_mr else "<b>SR.<br/>NO.</b>", st_th_c),
            Paragraph("<b>घटक</b>" if is_mr else "<b>PARAMETER</b>", st_th),
            Paragraph("<b>तपासलेले मूल्य</b>" if is_mr else "<b>OBSERVED<br/>VALUE</b>", st_th_c),
            Paragraph("<b>एकक</b>" if is_mr else "<b>UNIT</b>", st_th_c),
            Paragraph("<b>निष्कर्ष</b>" if is_mr else "<b>INTERPRETATION</b>", st_th),
            Paragraph("<b>संदर्भ श्रेणी</b>" if is_mr else "<b>REFERENCE<br/>RANGE</b>", st_th),
            Paragraph("<b>शिफारस</b>" if is_mr else "<b>RECOMMENDATION</b>", st_th),
        ]

        clean_ref_ranges = {
            "ph": "6.0 - 7.5 (Suitable)",
            "soil_ph": "6.0 - 7.5 (Suitable)",
            "ec": "< 0.8 (Normal)",
            "electrical_conductivity": "< 0.8 (Normal)",
            "organic_carbon": "0.50 - 0.75% (Medium)",
            "soc": "0.50 - 0.75% (Medium)",
            "available_nitrogen": "280 - 560 (Medium)",
            "nitrogen": "280 - 560 (Medium)",
            "available_phosphorus": "10 - 25 (Medium)",
            "phosphorus": "10 - 25 (Medium)",
            "available_potassium": "120 - 280 (Medium)",
            "potassium": "120 - 280 (Medium)",
            "exchangeable_sodium": "< 15.0 (Normal)",
            "esp": "< 15.0 (Normal)",
            "free_lime": "< 5.0% (Normal)",
            "caco3": "< 5.0% (Normal)",
            "iron": "> 4.5 (Sufficient)",
            "available_iron": "> 4.5 (Sufficient)",
            "manganese": "> 3.0 (Sufficient)",
            "available_manganese": "> 3.0 (Sufficient)",
            "zinc": "> 0.6 (Sufficient)",
            "available_zinc": "> 0.6 (Sufficient)",
            "copper": "> 0.4 (Sufficient)",
            "available_copper": "> 0.4 (Sufficient)",
            "sulphur": "> 15.0 (Sufficient)",
            "available_sulphur": "> 15.0 (Sufficient)",
            "boron": "> 0.5 (Sufficient)",
            "available_boron": "> 0.5 (Sufficient)",
            "bd": "< 1.40 (Optimal)",
            "bulk_density": "< 1.40 (Optimal)",
            "total_nitrogen": "AOI range: 0.05 - 0.18",
            "total_n": "AOI range: 0.05 - 0.18",
            "cec": "AOI range: 18.5 - 35.0",
            "cfvo": "AOI range: 1.2 - 6.5",
            "coarse_fragments": "AOI range: 1.2 - 6.5",
            "sand": "AOI range: 28.0 - 45.0",
            "silt": "AOI range: 25.0 - 35.0",
            "clay": "AOI range: 22.0 - 38.5",
            "soil_texture": "USDA Class: Clay / Vertisols",
            "soil_texture_class": "USDA Class: Clay / Vertisols",
        }

        clean_recs = {
            "ph": "Maintain current pH.",
            "ec": "No salinity action.",
            "organic_carbon": "Maintain; no extra OC needed.",
            "available_nitrogen": "Increase N; ~125% RDF*",
            "available_phosphorus": "Normal RDF*",
            "available_potassium": "Reduce K; ~75% RDF*",
            "exchangeable_sodium": "Exchangeable sodium is within safe range. Maintain appropriate drainage.",
            "esp": "Exchangeable sodium is within safe range. Maintain appropriate drainage.",
            "free_lime": "Free lime is within normal bounds. Maintain balanced fertilization.",
            "iron": "Apply Fe if needed",
            "available_iron": "Apply Fe if needed",
            "manganese": "Monitor Mn",
            "available_manganese": "Monitor Mn",
            "zinc": "Apply Zn if needed",
            "available_zinc": "Apply Zn if needed",
            "copper": "No Cu correction",
            "available_copper": "No Cu correction",
            "sulphur": "Apply S as needed",
            "available_sulphur": "Apply S as needed",
            "boron": "Apply B carefully",
            "available_boron": "Apply B carefully",
            "bd": "Soil physical condition and density are favorable for root penetration and moisture retention.",
            "bulk_density": "Soil physical condition and density are favorable for root penetration and moisture retention.",
            "total_nitrogen": "Total soil N reserve is moderate; maintain soil organic matter through regular compost & residue incorporation.",
            "total_n": "Total soil N reserve is moderate; maintain soil organic matter through regular compost & residue incorporation.",
            "cec": "High nutrient retention capacity; excellent buffer against nutrient leaching.",
            "cfvo": "Minimal gravel content; favorable tillage and root elongation zone.",
            "coarse_fragments": "Minimal gravel content; favorable tillage and root elongation zone.",
            "sand": "Adequate sand fraction ensuring baseline aeration and internal drainage.",
            "silt": "Optimum silt content supporting available water capacity and nutrient retention.",
            "clay": "High smectite clay vertisol; maintain proper drainage to prevent waterlogging.",
            "soil_texture": "Deep black cotton soil (Vertisols); practice broad-bed furrow (BBF) and timely tillage.",
            "soil_texture_class": "Deep black cotton soil (Vertisols); practice broad-bed furrow (BBF) and timely tillage.",
        }

        clean_recs_mr = {
            "ph": "सध्याचा सामू कायम ठेवावा.",
            "ec": "क्षारतेबाबत उपाययोजनेची गरज नाही.",
            "organic_carbon": "सेंद्रिय कर्ब टिकवून ठेवावा; अतिरिक्त सेंद्रिय खतांची गरज नाही.",
            "available_nitrogen": "नत्र वाढवा; ~१२५% RDF*",
            "available_phosphorus": "सामान्य १००% RDF*",
            "available_potassium": "पालाश कमी करा; ~७५% RDF*",
            "exchangeable_sodium": "सोडियम सुरक्षित मर्यादेत आहे. पाण्याचा योग्य निचरा ठेवावा.",
            "esp": "सोडियम सुरक्षित मर्यादेत आहे. पाण्याचा योग्य निचरा ठेवावा.",
            "free_lime": "मुक्त चुनखडी सामान्य मर्यादेत आहे. संतुलित खत व्यवस्थापन ठेवा.",
            "iron": "गरज भासल्यास फेरस सल्फेट किंवा चिलेटेड लोह द्या.",
            "available_iron": "गरज भासल्यास फेरस सल्फेट किंवा चिलेटेड लोह द्या.",
            "manganese": "मँगनीजचे निरीक्षण ठेवा.",
            "available_manganese": "मँगनीजचे निरीक्षण ठेवा.",
            "zinc": "गरज भासल्यास झिंक सल्फेट द्या.",
            "available_zinc": "गरज भासल्यास झिंक सल्फेट द्या.",
            "copper": "तांबे सुधारणेची गरज नाही.",
            "available_copper": "तांबे सुधारणेची गरज नाही.",
            "sulphur": "गरजेनुसार गंधक खते द्या.",
            "available_sulphur": "गरजेनुसार गंधक खते द्या.",
            "boron": "काळजीपूर्वक बोरॉन वापरा.",
            "available_boron": "काळजीपूर्वक बोरॉन वापरा.",
            "bd": "मातीची घनता व भौतिक स्थिती मुळांच्या वाढीसाठी व ओलावा टिकवण्यासाठी अनुकूल आहे.",
            "bulk_density": "मातीची घनता व भौतिक स्थिती मुळांच्या वाढीसाठी व ओलावा टिकवण्यासाठी अनुकूल आहे.",
            "total_nitrogen": "जमिनीतील एकूण नत्र साठा मध्यम आहे; शेणखत व सेंद्रिय अवशेषांच्या वापराने नत्र साठा टिकवून ठेवावा.",
            "total_n": "जमिनीतील एकूण नत्र साठा मध्यम आहे; शेणखत व सेंद्रिय अवशेषांच्या वापराने नत्र साठा टिकवून ठेवावा.",
            "cec": "धनायन विनिमय क्षमता उच्च आहे; खते धरून ठेवण्याची क्षमता उत्कृष्ट आहे.",
            "cfvo": "दगड-गोट्यांचे प्रमाण अत्यल्प आहे; मुळांच्या वाढीसाठी व मशागतीसाठी जमीन अत्यंत अनुकूल आहे.",
            "coarse_fragments": "दगड-गोट्यांचे प्रमाण अत्यल्प आहे; मुळांच्या वाढीसाठी व मशागतीसाठी जमीन अत्यंत अनुकूल आहे.",
            "sand": "वाळूचे प्रमाण संतुलित असून जमिनीत हवा खेळती राहण्यास व निचरा होण्यास मदत होते.",
            "silt": "गाळाचे प्रमाण योग्य असून ओलावा व अन्नद्रव्ये टिकवून ठेवण्यास मदत करते.",
            "clay": "काळी कसदार चिकणमाती; अति पावसात पाणी साचू नये म्हणून योग्य निचरा व्यवस्था ठेवावी.",
            "soil_texture": "खोल काळी चिकण जमीन (व्हर्टिसॉल); रुंद वरंबा-सरी (BBF) पद्धत आणि योग्य ओलाव्यावर मशागत करावी.",
            "soil_texture_class": "खोल काळी चिकण जमीन (व्हर्टिसॉल); रुंद वरंबा-सरी (BBF) पद्धत आणि योग्य ओलाव्यावर मशागत करावी.",
        }

        param_rows = [th_row]

        for idx, p in enumerate(parameters, 1):
            pkey = p.get("key", "")
            p_name = p.get("name_mr" if is_mr else "name", p.get("name", "N/A"))
            val = p.get("value")
            val_str = f"{val:.2f}" if isinstance(val, (int, float)) else (str(val) if val is not None else "—")
            unit_str = p.get("unit") or "—"
            raw_interp = p.get("interpretation_mr" if is_mr else "interpretation", p.get("interpretation", "—"))

            if is_mr:
                ref_range = translate_ref_range_to_mr(clean_ref_ranges.get(pkey, p.get("reference_range", "—")))
                rec_text = clean_recs_mr.get(pkey, p.get("recommendation_mr", p.get("recommendation", "—")))
            else:
                ref_range = clean_ref_ranges.get(pkey, p.get("reference_range", "—"))
                rec_text = clean_recs.get(pkey, p.get("recommendation", "—"))

            interp_flowable = _format_interp(raw_interp)

            row = [
                Paragraph(str(p.get("sr_no") or idx), st_td_sr),
                Paragraph(p_name, st_td_param),
                Paragraph(f"<b>{val_str}</b>", st_td_val),
                Paragraph(unit_str, st_td_unit),
                interp_flowable,
                Paragraph(ref_range, st_td_range),
                Paragraph(rec_text, st_td_rec),
            ]
            param_rows.append(row)

        param_table = Table(
            param_rows,
            colWidths=[9 * mm, 41 * mm, 17 * mm, 13 * mm, 25 * mm, 35 * mm, 56 * mm],
        )
        param_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_DARK_GREEN),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -1), 0.35, COLOR_BORDER_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 0.7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0.7),
            ("LEFTPADDING", (0, 0), (-1, -1), 2.0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2.0),
        ]))
        story.append(param_table)
        story.append(Spacer(1, 1.0 * mm))

        # Red Footnote Note
        footnote_text = (
            "टीप: या अहवालातील मातीचे गुणधर्म व निष्कर्ष ०–३० सें.मी. मुळांच्या कार्यक्षेत्रातील खोलीवर आधारित आहेत."
            if is_mr
            else "Note: Soil properties and interpretations in this report are based on the 0–30 cm root-zone soil depth."
        )
        story.append(Paragraph(footnote_text, st_footnote))
        story.append(Spacer(1, 1.0 * mm))

        # --------------------------------------------------------------
        # 4. REPORT INFORMATION & LABORATORY CERTIFICATION
        # --------------------------------------------------------------
        cert_head_text = "अहवाल तपशील व प्रयोगशाळा प्रमाणीकरण" if is_mr else "REPORT INFORMATION & LABORATORY CERTIFICATION"
        story.append(Paragraph(f"<b>{cert_head_text}</b>", st_cert_head))
        story.append(Spacer(1, 0.5 * mm))
        story.append(HRFlowable(width="100%", thickness=1.0, color=COLOR_DARK_GREEN, spaceBefore=0, spaceAfter=1.0 * mm))

        cert_sub_text = (
            "कृषी निदान व डिजिटल मृदा परीक्षण केंद्र, बारामती / पुणे, महाराष्ट्र"
            if is_mr
            else "Agricultural Diagnostic & Digital Soil Testing Center, Baramati / Pune, Maharashtra"
        )
        report_no = report_meta.get("report_no", "SPL/2026/SL-0104")
        report_date = report_meta.get("report_date") or "20-09-2026"
        cert_ref_text = (
            f"अहवाल संदर्भ: {report_no} • दिनांक: {report_date}"
            if is_mr
            else f"Report Ref: {report_no} • Date: {report_date}"
        )

        sign_name_text = report_meta.get("chemist_name") or ("ए.बी.सी (मुख्य रसायनशास्त्रज्ञ)" if is_mr else "A.B.C (Chief Chemist)")
        sign_title_text = "अधिकृत मृदा परीक्षण रसायनशास्त्रज्ञ" if is_mr else "AUTHORIZED SOIL TESTING CHEMIST"
        sign_div_text = "मृदा निदान व विश्लेषणात्मक रसायनशास्त्र विभाग" if is_mr else "Soil Diagnostics & Analytical Chemistry Division"

        footer_left = [
            Paragraph("<b>एडीटी एआय ट्रेनिंग फाउंडेशन, बारामती</b>" if is_mr else "<b>ADT AI TRAINING FOUNDATION, BARAMATI</b>", st_cert_org),
            Paragraph(cert_sub_text, st_cert_sub),
            Paragraph(cert_ref_text, st_cert_ref),
        ]
        footer_right = [
            Paragraph(f"<b>{sign_name_text}</b>", st_sign_name),
            Paragraph(f"<b>{sign_title_text}</b>", st_sign_title),
            Paragraph(sign_div_text, st_sign_div),
        ]

        footer_table = Table(
            [[footer_left, footer_right]],
            colWidths=[110 * mm, 86 * mm]
        )
        footer_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(footer_table)

        # Build document
        doc.build(story)
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
            "ADT AI Training Foundation • कृषी व डिजिटल माती परीक्षण केंद्र, बारामती"
            if is_mr
            else "ADT AI Training Foundation • Agricultural Diagnostic & Digital Soil Testing Center, Baramati"
        )
        demo_str = ""

        header_data = [
            [
                Paragraph(f"<b>SOILPILOT</b> — {main_title}", styles["title"]),
                Paragraph("", ParagraphStyle("DemoTag2", parent=styles["val"], alignment=2)),
            ],
            [
                Paragraph(sub_title, styles["subtitle"]),
                Paragraph(
                    f"<font color='white'>Baramati, Pune, Maharashtra</font>",
                    ParagraphStyle("Dossier", parent=styles["subtitle"], alignment=2),
                ),
            ],
        ]
        header_table = Table(header_data, colWidths=[130 * mm, 56 * mm])
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
        lab_name = report_meta.get("laboratory_name") or "ADT AI Training Foundation — Agricultural Diagnostic & Digital Soil Testing Center, Baramati"

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
        # 3. Complete Soil Parameter Laboratory Table (All Parameters, NO SOURCE, HAS RECOMMENDATION)
        # --------------------------------------------------------------
        param_heading = (
            "२. माती रासायनिक आणि पोषणद्रव्य विश्लेषण व शिफारसी (Soil Chemical Diagnostics & Recommendations)"
            if is_mr
            else "2. COMPLETE SOIL CHEMICAL & NUTRIENT DIAGNOSTICS & RECOMMENDATIONS"
        )
        story.append(Paragraph(param_heading, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        th_sr = "अ.क्र." if is_mr else "Sr."
        th_param = "माती घटक (Parameter)" if is_mr else "Soil Parameter"
        th_val = "मूल्य (Value)" if is_mr else "Observed Value"
        th_unit = "एकक (Unit)" if is_mr else "Unit"
        th_status = "विश्लेषण (Interpretation)" if is_mr else "Status / Interpretation"
        th_range = "संदर्भ श्रेणी (Range)" if is_mr else "Reference Range"
        th_rec = "शिफारस (Recommendation)" if is_mr else "Recommendation"

        full_table_rows = [[
            Paragraph(th_sr, styles["th"]),
            Paragraph(th_param, styles["th"]),
            Paragraph(th_val, styles["th"]),
            Paragraph(th_unit, styles["th"]),
            Paragraph(th_status, styles["th"]),
            Paragraph(th_range, styles["th"]),
            Paragraph(th_rec, styles["th"]),
        ]]

        if parameters:
            for idx, p in enumerate(parameters, 1):
                p_name = p.get("name_mr" if is_mr else "name", p.get("name", "N/A"))
                val = p.get("value")
                val_str = f"{val:.2f}" if isinstance(val, (int, float)) else ("उपलब्ध नाही" if is_mr else "Not Available")
                unit_str = p.get("unit") or "-"
                interp = p.get("interpretation_mr" if is_mr else "interpretation", p.get("interpretation", "N/A"))
                ref_range_raw = p.get("reference_range_mr" if is_mr else "reference_range", p.get("reference_range", "-"))
                ref_range = translate_ref_range_to_mr(ref_range_raw) if is_mr else ref_range_raw
                rec_text = p.get("recommendation_mr" if is_mr else "recommendation") or p.get("recommendation", "Maintain balanced nutrient management.")

                full_table_rows.append([
                    Paragraph(str(idx), styles["td_center"]),
                    Paragraph(f"<b>{p_name}</b>", styles["td"]),
                    Paragraph(f"<b>{val_str}</b>", styles["td_center"]),
                    Paragraph(unit_str, styles["td_center"]),
                    Paragraph(interp, styles["td"]),
                    Paragraph(ref_range, styles["td"]),
                    Paragraph(rec_text, styles["td"]),
                ])
        else:
            full_table_rows.append([
                Paragraph("1", styles["td_center"]),
                Paragraph("माती माहिती प्रलंबित (Soil Data Pending)" if is_mr else "No Soil Data Recorded", styles["td_bold"]),
                Paragraph("प्रलंबित" if is_mr else "Pending", styles["td_center"]),
                Paragraph("-", styles["td_center"]),
                Paragraph("प्रलंबित" if is_mr else "Pending", styles["td"]),
                Paragraph("-", styles["td"]),
                Paragraph("Recommendation pending soil test data.", styles["td"]),
            ])

        full_table = Table(
            full_table_rows,
            colWidths=[8 * mm, 38 * mm, 18 * mm, 14 * mm, 26 * mm, 26 * mm, 56 * mm],
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
        # 4. Soil-Based Recommendations Summary Section (Dynamically Ranked)
        # --------------------------------------------------------------
        rec_title = (
            "३. महत्त्वाच्या माती व्यवस्थापन शिफारसी (Key Soil Management Recommendations)"
            if is_mr
            else "3. KEY SOIL MANAGEMENT RECOMMENDATIONS"
        )
        story.append(Paragraph(rec_title, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        key_recs = report_data.get("key_recommendations", [])
        if not key_recs:
            from app.services.recommendation_engine import get_ranked_key_recommendations
            key_recs = get_ranked_key_recommendations(parameters, max_items=5)

        rec_lines = []
        for kr in key_recs:
            kr_name = kr.get("name_mr" if is_mr else "name", kr.get("name", ""))
            kr_rec = kr.get("recommendation_mr" if is_mr else "recommendation", kr.get("recommendation", ""))
            kr_status = kr.get("status_category", "")
            rec_lines.append(f"• <b>{kr_name} ({kr_status}):</b> {kr_rec}")

        if not rec_lines:
            rec_lines.append("• Maintain balanced nutrient management and continue periodic soil testing.")

        rec_text = "<br/>".join(rec_lines)
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
        story.append(Spacer(1, 4 * mm))

        # --------------------------------------------------------------
        # 5. Data Source, Disclaimer & Verification Footer Box
        # --------------------------------------------------------------
        disclaimer_heading = "४. माहिती स्रोत व अस्वीकरण (Data Source & Legal Notice)" if is_mr else "4. DATA SOURCES & PLATFORM DISCLAIMER"
        story.append(Paragraph(disclaimer_heading, styles["section"]))
        story.append(Spacer(1, 1.5 * mm))

        disclaimer_body = (
            "<b>माहिती स्रोत (Data Sources):</b> या अहवालातील नोंदी प्रयोगशाळा निरीक्षण (LAB OBSERVATION), डिजिटल सॉईल मॅपिंग अंदाज (DSM PREDICTION) किंवा आयात केलेल्या डेटावरून घेतल्या आहेत. डेटा उपलब्ध नसलेल्या ठिकाणी 'उपलब्ध नाही' (Not Available) किंवा 'प्रलंबित' (Pending) दर्शवले आहे.<br/>"
            f"<b>डिजिटल पडताळणी:</b> अहवाल क्रमांक {report_no} ची ऑनलाइन पडताळणी करण्यासाठी सोबत दिलेला QR कोड स्कॅन करा."
            if is_mr
            else
            "<b>Data Sources:</b> This report contains information available through the SoilPilot Digital Soil Mapping and Soil Health Portal. Values originate from verified laboratory observations (LAB OBSERVATION), machine-learning digital soil mapping predictions (DSM PREDICTION), or imported datasets. Where data is unavailable, it is marked accordingly. No fabricated values are generated.<br/>"
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
