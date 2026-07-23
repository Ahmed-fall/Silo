from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.core.database import get_db
from app.api.silos import resolve_condition
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import io
import uuid

router = APIRouter(prefix="/reports", tags=["reports"])

RISK_COLORS = {
    "none": colors.HexColor("#40E0D0"),
    "low": colors.HexColor("#40E0D0"),
    "medium": colors.HexColor("#CD7F32"),
    "high": colors.HexColor("#E11D48"),
    "critical": colors.HexColor("#E11D48"),
}


@router.get("/{silo_id}/pdf")
async def get_silo_pdf_report(silo_id: uuid.UUID):
    """Server-side PDF export for the mobile app. The web frontend uses the
    browser's window.print(), which isn't available to a native mobile app,
    so this renders the same information as a real downloadable PDF."""
    db = await get_db()

    row = await db.fetchrow(
        """
        SELECT
            s.id, s.name, s.location, s.capacity_kg, s.crop_type, s.created_at,
            sr.temperature, sr.humidity, sr.soil_moisture, sr.ndvi,
            a.risk_level, a.risk_score,
            (a.triggered_at > NOW() - INTERVAL '6 hours') AS alert_recent
        FROM silos s
        LEFT JOIN LATERAL (
            SELECT temperature, humidity, soil_moisture, ndvi
            FROM sensor_readings WHERE silo_id = s.id ORDER BY recorded_at DESC LIMIT 1
        ) sr ON true
        LEFT JOIN LATERAL (
            SELECT risk_level, risk_score, triggered_at
            FROM alerts WHERE silo_id = s.id AND kind = 'measured' ORDER BY triggered_at DESC LIMIT 1
        ) a ON true
        WHERE s.id = $1
        """,
        silo_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Silo not found")
    # Same live-condition rule as GET /silos and GET /users/me/silos — a
    # report generated today must not show a risk level frozen from a
    # measured alert that's since resolved.
    silo = await resolve_condition(dict(row))

    alerts = await db.fetch(
        "SELECT risk_level, risk_score, message, triggered_at FROM alerts "
        "WHERE silo_id = $1 ORDER BY triggered_at DESC LIMIT 10",
        silo_id,
    )
    images = await db.fetch(
        "SELECT detected_label, confidence, uploaded_at FROM images "
        "WHERE silo_id = $1 ORDER BY uploaded_at DESC LIMIT 10",
        silo_id,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("SiloTitle", parent=styles["Title"], textColor=colors.HexColor("#0F172A"))
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], textColor=colors.HexColor("#0F172A"), spaceBefore=14)

    risk_level = (silo["risk_level"] or "none").lower()
    risk_color = RISK_COLORS.get(risk_level, colors.grey)

    elements = [
        Paragraph(f"Silo Report — {silo['name']}", title_style),
        Paragraph(f"Generated {silo['created_at'].strftime('%Y-%m-%d')} · Silo Command Center", styles["Normal"]),
        Spacer(1, 10 * mm),
    ]

    overview_data = [
        ["Location", silo["location"] or "—"],
        ["Crop type", (silo["crop_type"] or "Wheat").title()],
        ["Capacity (kg)", str(silo["capacity_kg"] or "—")],
        ["Risk level", risk_level.upper()],
        ["Risk score", f"{silo['risk_score']}%" if silo["risk_score"] is not None else "—"],
        ["Temperature", f"{silo['temperature']} °C" if silo["temperature"] is not None else "—"],
        ["Humidity", f"{silo['humidity']}%" if silo["humidity"] is not None else "—"],
        ["Soil moisture", f"{silo['soil_moisture']}%" if silo["soil_moisture"] is not None else "—"],
    ]
    overview_table = Table(overview_data, colWidths=[50 * mm, 100 * mm])
    overview_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 3), (1, 3), risk_color),
        ("FONTNAME", (1, 3), (1, 3), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
    ]))
    elements.append(overview_table)

    elements.append(Paragraph("Recent Alerts", section_style))
    if alerts:
        alert_data = [["Triggered", "Risk", "Message"]]
        for a in alerts:
            alert_data.append([
                a["triggered_at"].strftime("%Y-%m-%d %H:%M"),
                (a["risk_level"] or "—").upper(),
                Paragraph(a["message"] or "—", styles["Normal"]),
            ])
        alert_table = Table(alert_data, colWidths=[35 * mm, 20 * mm, 95 * mm])
        alert_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(alert_table)
    else:
        elements.append(Paragraph("No alerts recorded.", styles["Normal"]))

    elements.append(Paragraph("Recent AI Scans", section_style))
    if images:
        scan_data = [["Scanned", "Detected label", "Confidence"]]
        for img in images:
            confidence_pct = f"{round(img['confidence'] * 100, 1)}%" if img["confidence"] is not None else "—"
            scan_data.append([
                img["uploaded_at"].strftime("%Y-%m-%d %H:%M"),
                img["detected_label"] or "—",
                confidence_pct,
            ])
        scan_table = Table(scan_data, colWidths=[35 * mm, 85 * mm, 30 * mm])
        scan_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        elements.append(scan_table)
    else:
        elements.append(Paragraph("No AI scans recorded.", styles["Normal"]))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"silo-{silo['name'].replace(' ', '-').lower()}-report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
