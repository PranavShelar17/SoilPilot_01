import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fieldId = searchParams.get("fieldId") || "104";
    const lang = searchParams.get("lang") || "en";
    const token = searchParams.get("token") || "";

    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
    const targetUrl = new URL(`/api/v1/reports/${encodeURIComponent(fieldId)}/soil-health-card/pdf`, backendUrl);
    targetUrl.searchParams.set("lang", lang);
    if (token) {
      targetUrl.searchParams.set("token", token);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const backendRes = await fetch(targetUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!backendRes.ok) {
      return new NextResponse(`Failed to generate PDF (HTTP ${backendRes.status})`, {
        status: backendRes.status,
      });
    }

    const pdfBuffer = await backendRes.arrayBuffer();
    const dispositionHeader = backendRes.headers.get("content-disposition");

    const { formatReportDateIndia } = await import("@/lib/dateUtils");
    const liveDate = formatReportDateIndia();
    let cleanFilename = `SoilPilot_Soil_Health_Card_Gat_${String(fieldId).replace(/^demo-field-gat-/, "")}_${liveDate}.pdf`;
    if (dispositionHeader) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(dispositionHeader);
      if (match && match[1]) {
        const extracted = match[1].replace(/['"]/g, "").trim();
        if (extracted) {
          cleanFilename = extracted.toLowerCase().endsWith(".pdf") ? extracted : `${extracted}.pdf`;
        }
      }
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFilename}"`,
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: any) {
    console.error("PDF proxy error:", err);
    return new NextResponse("Internal Server Error generating PDF", { status: 500 });
  }
}
