import { NextRequest, NextResponse } from "next/server";
import { fetch5YearClimateTrend } from "@/lib/climate";

// GET /api/weather/climate?lat=<lat>&lon=<lon>
// Returns historical annual aggregated data for last 5 years
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (!latStr || latStr === "null" || latStr === "undefined" || !lonStr || lonStr === "null" || lonStr === "undefined") {
      return NextResponse.json({ error: "Missing or invalid coordinate parameters" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    const climateData = await fetch5YearClimateTrend(lat, lon);
    if (!climateData) {
      return NextResponse.json({ error: "Failed to fetch climate trend data" }, { status: 500 });
    }

    return NextResponse.json({ climate: climateData });
  } catch (error) {
    console.error("Climate route execution error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
